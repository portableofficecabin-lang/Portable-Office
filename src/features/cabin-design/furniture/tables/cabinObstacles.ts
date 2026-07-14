/**
 * Table module — CABIN OBSTACLES (spec §14).
 *
 * Everything already inside the cabin that a table is not allowed to sit on: partitions, door
 * leaves and their swings, windows, the plumbing fittings, the enclosed toilets, the pantry
 * counter, the main electrical board and the calculator's own add-on furniture.
 *
 * WHY THIS FILE EXISTS AT ALL: the 2D plan (ModulePlan.tsx) already positions every one of those
 * things — but it does so in PIXELS, mixed into JSX, and it never returns the geometry. The
 * collision checker cannot import a `<g>`. So this module re-derives the SAME geometry from the
 * SAME pricing.ts helpers (`sideSpanFt` / `openingWidthOn` / `clampOpeningOffset` / `fixtureSizeOf`
 * / `fixtureUnit*Of` / `furnitureRoomCounts` / `tablePlacementsOf` / `furnitureAdjustOf`), in
 * MILLIMETRES. Reading from the same helpers is what makes "the plan and the collision check can
 * never disagree" true by construction rather than by hope: if a helper's clamp changes, both
 * follow it. The pixel constants ModulePlan hard-codes (pad, gap, chair gap, wall thickness) are
 * the ONLY things restated here, as the `*_MM` constants below — they are drawing margins, and at
 * the plan's ~24 px/ft they work out to these figures.
 *
 * COORDINATES: cabin millimetres. Origin = the cabin's INNER top-left corner — the same origin as
 * TablePosition.xMm/yMm and as ModulePlan's `(ox, oy)`.
 *   +x runs along the cabin LENGTH  (ModulePlan's left → right)
 *   +y runs along the cabin WIDTH   (rear / "top" / Upper wall → front / "bottom" / Down wall)
 *   mm = feet × 304.8
 *
 * NOTE ON `doorClearance.ts`: `doorKeepoutRects()` computes the very same entry zones, but in
 * pixels, and is consumed by ModulePlan to shove fixtures and furniture out of the doorway. It is
 * deliberately NOT imported here (mixing px and mm is how two "sources of truth" are born) —
 * `doorEntryBoxes()` below is its millimetre twin, built from the same three pricing helpers, and
 * `avoidBoxes()` is the millimetre twin of `avoidKeepouts()`. They must be kept in step.
 */

import {
  DOOR_SIZE,
  ENCLOSED_TOILET_IDS,
  MANAGER_L_SIZE,
  MANAGER_TABLE_SIZE,
  PANTRY_DEPTH_FT,
  ROOM_FURNITURE_IDS,
  TABLE_ADDON_IDS,
  TABLE_SIZE,
  clampOpeningOffset,
  fixtureSizeOf,
  fixtureUnitOffsetsOf,
  fixtureUnitSwingsOf,
  fixtureUnitWallsOf,
  furnitureAdjustOf,
  furnitureRoomCounts,
  isOpenableWindow,
  isToiletCabin,
  openingWidthOn,
  sideSpanFt,
  tablePlacementsOf,
  type CabinConfig,
  type FurnitureAdjust,
} from "@/components/home/cabin-calculator/pricing";
import { MM_PER_FT } from "./tableUnits";
import type { Pt } from "./tableGeometry";

/* ==========================================================================
 * 1. The contract
 * ========================================================================== */

export type ObstacleKind =
  | "wall"
  | "partition"
  | "door"
  | "door-swing"
  | "window"
  | "fixture"
  | "toilet"
  | "pantry"
  | "electrical-panel"
  | "furniture"
  | "staircase"
  | "veranda";

export interface Obstacle {
  /** Stable id, e.g. "door:0", "door-swing:0", "partition:1", "fixture:wash-basin:0". Referenced
   *  from TableIssue.refs so the drawing can highlight the offending object in red (spec §14). */
  id: string;
  kind: ObstacleKind;
  /** Human name, used VERBATIM in collision messages ("Main door swing", "Wash basin"). */
  label: string;
  /** Footprint in CABIN mm. */
  poly: Pt[];
  /** Vertical band this obstacle actually occupies. A window only conflicts with a table TALLER
   *  than its sill, so a desk under a window is fine and a 2 m storage wall is not. Absent ⇒ the
   *  obstacle is floor-standing and conflicts at any height. */
  fromHeightMm?: number;
  toHeightMm?: number;
  /** true ⇒ overlapping is an ERROR (never allowed). false ⇒ a warning-grade conflict. */
  hard: boolean;
}

/* ==========================================================================
 * 2. Drawing constants restated in mm
 *
 * ModulePlan draws at `ppf = clamp(760 / lengthFt, 15, 34)` px per foot — so its literal pixel
 * margins are ~24 px/ft on a typical 20 ft cabin. These are those margins converted once, here,
 * rather than scattered through the code as magic numbers.
 * ========================================================================== */

/** Cabin / partition wall thickness. ModulePlan: `wallT = 9` px, partition stroke 4 px. */
const WALL_MM = 100;
const PARTITION_MM = 60;
/** A window's sill height. pricing.ts has no sill field, so this is the standard 900 mm. */
export const WINDOW_SILL_MM = 900;
/** ModulePlan's `pad = 3` / `gap = 6` / `CHAIR_GAP = 7` / `M = 1` px, in mm. */
const PAD_MM = 40;
const GAP_MM = 75;
const CHAIR_GAP_MM = 90;
const EDGE_MM = 12;
/** doorClearance.ts's `m = 4` px side margin on an entry keep-out. */
const KEEP_MARGIN_MM = 50;
/** Points used to sample a door's swept quarter-disc. 16 is smooth enough that the sampled area is
 *  within ~1% of the true quarter-circle, which is well under the mm the messages quote. */
const ARC_PTS = 16;

const ft = (v: number): number => v * MM_PER_FT;
const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), Math.max(lo, hi));

const rectPoly = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
];

const boxPoly = (cx: number, cy: number, hw: number, hh: number): Pt[] =>
  rectPoly(cx - hw, cy - hh, cx + hw, cy + hh);

/**
 * The pie slice a door leaf sweeps: hinge H, the open leaf tip A, the closed leaf tip B. |HA| and
 * |HB| are both the door width, so this is a quarter-disc; sampling the SHORTEST arc from A to B
 * gets the sweep direction right for all four walls and both hands without a sign table.
 */
function quarterDisc(H: Pt, A: Pt, B: Pt): Pt[] {
  const r = Math.hypot(A.x - H.x, A.y - H.y);
  if (!(r > 0)) return [];
  const a0 = Math.atan2(A.y - H.y, A.x - H.x);
  const a1 = Math.atan2(B.y - H.y, B.x - H.x);
  let d = a1 - a0;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const out: Pt[] = [{ x: H.x, y: H.y }];
  for (let i = 0; i <= ARC_PTS; i++) {
    const a = a0 + d * (i / ARC_PTS);
    out.push({ x: H.x + r * Math.cos(a), y: H.y + r * Math.sin(a) });
  }
  return out;
}

/* ==========================================================================
 * 3. Cabin envelope + rooms
 * ========================================================================== */

export function cabinSizeMm(config: CabinConfig): { lengthMm: number; widthMm: number } {
  return {
    lengthMm: ft(Math.max(1, config.length || 1)),
    widthMm: ft(Math.max(1, config.width || 1)),
  };
}

export function cabinBoundsPoly(config: CabinConfig): Pt[] {
  const { lengthMm, widthMm } = cabinSizeMm(config);
  return rectPoly(0, 0, lengthMm, widthMm);
}

/**
 * The x-band each room occupies. Multi-room partitions split the cabin along its LENGTH, and
 * ModulePlan lays the bands out by each room's SHARE of `roomLengths` (not by its raw feet), so a
 * roomLengths array that doesn't sum to the cabin length still tiles the plan exactly. Mirrored.
 */
export function roomRangesMm(config: CabinConfig): { index: number; x0: number; x1: number }[] {
  const { lengthMm } = cabinSizeMm(config);
  const rl = Array.isArray(config.roomLengths) && config.roomLengths.length > 1 ? config.roomLengths : null;
  const rooms = rl ?? [Math.max(1, config.length || 1)];
  const total = rooms.reduce((a, b) => a + b, 0) || rooms.length;
  const out: { index: number; x0: number; x1: number }[] = [];
  let acc = 0;
  let prev = 0;
  rooms.forEach((r, i) => {
    acc += r;
    const x1 = i === rooms.length - 1 ? lengthMm : lengthMm * (acc / total);
    out.push({ index: i, x0: prev, x1 });
    prev = x1;
  });
  return out;
}

/* ==========================================================================
 * 4. Main-door entry clearance — the mm twin of doorClearance.doorKeepoutRects()
 * ========================================================================== */

interface Box { x0: number; y0: number; x1: number; y1: number }

const boxToPoly = (b: Box): Pt[] => rectPoly(b.x0, b.y0, b.x1, b.y1);

/**
 * The clear zone INSIDE the cabin in front of every MAIN entrance door — a person has to be able
 * to step in. ~3 ft deep (capped at 60% of the room depth) across the opening plus a margin. Even
 * an outward-opening door needs this, which is why it is emitted independently of the swing.
 */
function doorEntryBoxes(config: CabinConfig): Box[] {
  const { lengthMm: L, widthMm: W } = cabinSizeMm(config);
  return (config.doorPlacements ?? []).map((d) => {
    const side = d.side || "bottom";
    const horiz = side === "top" || side === "bottom";
    const spanFt = sideSpanFt(side, config.length, config.width);
    const dw = ft(openingWidthOn(spanFt, DOOR_SIZE.widthFt));
    const start = ft(clampOpeningOffset(d.offset, spanFt, DOOR_SIZE.widthFt));
    const roomDepth = horiz ? W : L;
    const clr = Math.min(ft(Math.max(DOOR_SIZE.widthFt, 3)), roomDepth * 0.6);
    const m = KEEP_MARGIN_MM;
    if (side === "bottom") return { x0: start - m, x1: start + dw + m, y0: W - clr, y1: W };
    if (side === "top") return { x0: start - m, x1: start + dw + m, y0: 0, y1: clr };
    if (side === "left") return { x0: 0, x1: clr, y0: start - m, y1: start + dw + m };
    return { x0: L - clr, x1: L, y0: start - m, y1: start + dw + m };
  });
}

/**
 * Minimally shove a box centre out of every keep-out, along the axis of least penetration — or
 * only along `along` when a wall-anchored piece must stay on its wall. The mm twin of
 * doorClearance.avoidKeepouts(); ModulePlan applies it to the fixtures, the washrooms and the
 * furniture, so the obstacles this module reports must apply it too or they would sit where the
 * plan does NOT draw them.
 */
function avoidBoxes(
  cx: number, cy: number, hw: number, hh: number, boxes: Box[],
  loX: number, hiX: number, loY: number, hiY: number, along?: "x" | "y",
): { cx: number; cy: number } {
  if (!boxes.length) return { cx, cy };
  for (let it = 0; it < 4; it++) {
    let moved = false;
    for (const k of boxes) {
      const ovx = Math.min(cx + hw, k.x1) - Math.max(cx - hw, k.x0);
      const ovy = Math.min(cy + hh, k.y1) - Math.max(cy - hh, k.y0);
      if (ovx > 0 && ovy > 0) {
        const moveX = along === "x" ? true : along === "y" ? false : ovx <= ovy;
        if (moveX) cx = cx < (k.x0 + k.x1) / 2 ? k.x0 - hw : k.x1 + hw;
        else cy = cy < (k.y0 + k.y1) / 2 ? k.y0 - hh : k.y1 + hh;
        moved = true;
      }
    }
    cx = clamp(cx, loX, hiX);
    cy = clamp(cy, loY, hiY);
    if (!moved) break;
  }
  return { cx, cy };
}

/* ==========================================================================
 * 5. Doors (main entrance)
 * ========================================================================== */

function mainDoorObstacles(config: CabinConfig): Obstacle[] {
  const { lengthMm: L, widthMm: W } = cabinSizeMm(config);
  const out: Obstacle[] = [];
  const entries = doorEntryBoxes(config);

  (config.doorPlacements ?? []).forEach((d, i) => {
    const side = d.side || "bottom";
    const horiz = side === "top" || side === "bottom";
    const spanFt = sideSpanFt(side, config.length, config.width);
    const dw = ft(openingWidthOn(spanFt, DOOR_SIZE.widthFt));
    const start = ft(clampOpeningOffset(d.offset, spanFt, DOOR_SIZE.widthFt));
    const hand = d.hand ?? "left";
    const swing = d.swing ?? "out";

    // Along-wall unit vector (in the +offset direction) and the OUTWARD (exterior) normal —
    // exactly ModulePlan's `alongU` / `outU`.
    const alongU: Pt = horiz ? { x: 1, y: 0 } : { x: 0, y: 1 };
    const outU: Pt = horiz
      ? { x: 0, y: side === "top" ? -1 : 1 }
      : { x: side === "left" ? -1 : 1, y: 0 };
    const into: Pt = swing === "out" ? outU : { x: -outU.x, y: -outU.y };

    const wallY = side === "top" ? 0 : W;
    const wallX = side === "left" ? 0 : L;
    const openStart: Pt = horiz ? { x: start, y: wallY } : { x: wallX, y: start };
    const openEnd: Pt = { x: openStart.x + alongU.x * dw, y: openStart.y + alongU.y * dw };
    const H = hand === "left" ? openStart : openEnd;      // hinge
    const Cc = hand === "left" ? openEnd : openStart;      // closed leaf tip

    // The threshold: the doorway itself, projected one wall-thickness INTO the cabin. A table
    // parked in the opening blocks the door whichever way the leaf goes.
    const inU: Pt = { x: -outU.x, y: -outU.y };
    const t0 = { x: Math.min(H.x, Cc.x), y: Math.min(H.y, Cc.y) };
    const t1 = { x: Math.max(H.x, Cc.x), y: Math.max(H.y, Cc.y) };
    out.push({
      id: `door:${i}`,
      kind: "door",
      label: `Main door ${i + 1}`,
      poly: rectPoly(
        Math.min(t0.x, t0.x + inU.x * WALL_MM), Math.min(t0.y, t0.y + inU.y * WALL_MM),
        Math.max(t1.x, t1.x + inU.x * WALL_MM), Math.max(t1.y, t1.y + inU.y * WALL_MM),
      ),
      hard: true,
    });

    // An inward-opening leaf sweeps a quarter-disc across the floor. An outward one does not —
    // it is the entry clearance below that still has to stay clear for it.
    if (swing === "in") {
      const T: Pt = { x: H.x + into.x * dw, y: H.y + into.y * dw };
      out.push({
        id: `door-swing:${i}`,
        kind: "door-swing",
        label: `Main door ${i + 1} swing`,
        poly: quarterDisc(H, T, Cc),
        hard: true,
      });
    }

    const box = entries[i];
    if (box) {
      out.push({
        id: `door-swing:entry-${i}`,
        kind: "door-swing",
        label: `Main door ${i + 1} entry clearance`,
        poly: boxToPoly(box),
        hard: true,
      });
    }
  });

  return out;
}

/* ==========================================================================
 * 6. Partitions + partition doors
 * ========================================================================== */

function partitionObstacles(config: CabinConfig): Obstacle[] {
  const rooms = roomRangesMm(config);
  if (rooms.length < 2) return [];

  const { widthMm: W } = cabinSizeMm(config);
  const out: Obstacle[] = [];
  const half = PARTITION_MM / 2;

  // The partition spans the cabin WIDTH; its door sits `partitionDoorOffset` ft from the REAR wall
  // (near edge), hinged at the rear ("top") or front ("bottom") end, swinging into the left/right
  // room. Every partition carries the same door (the config applies uniformly to all N−1).
  const hasDoor = !!config.partitionDoor;
  const sliding = config.partitionDoorType === "sliding";
  const pdw = ft(openingWidthOn(config.width, DOOR_SIZE.widthFt));
  const gTop = ft(clampOpeningOffset(config.partitionDoorOffset, config.width, DOOR_SIZE.widthFt));
  const gBot = gTop + pdw;
  const hinge = config.partitionDoorHinge ?? "top";
  const dir = (config.partitionDoorSwing ?? "right") === "right" ? 1 : -1;
  const face = (config.partitionSlideSide ?? "right") === "right" ? 1 : -1;
  const travel = (config.partitionSlideDirection ?? "front") === "front" ? 1 : -1;

  rooms.slice(0, -1).forEach((r, i) => {
    const px = r.x1;
    const n = i + 1;

    if (!hasDoor) {
      out.push({
        id: `partition:${i}`,
        kind: "partition",
        label: `Partition ${n}`,
        poly: rectPoly(px - half, 0, px + half, W),
        hard: true,
      });
      return;
    }

    // Two solid segments with the doorway between them — ModulePlan draws exactly these.
    out.push({
      id: `partition:${i}`,
      kind: "partition",
      label: `Partition ${n}`,
      poly: rectPoly(px - half, 0, px + half, gTop),
      hard: true,
    });
    out.push({
      id: `partition:${i}-b`,
      kind: "partition",
      label: `Partition ${n}`,
      poly: rectPoly(px - half, gBot, px + half, W),
      hard: true,
    });

    // The doorway itself — a table standing in it blocks the room-to-room route.
    out.push({
      id: `door:partition-${i}`,
      kind: "door",
      label: `Partition ${n} doorway`,
      poly: rectPoly(px - half, gTop, px + half, gBot),
      hard: true,
    });

    if (sliding) {
      // A sliding leaf never sweeps the floor — it hangs on ONE face of the partition and parks
      // over the blank run beside the doorway. Only that thin strip must stay clear.
      const parkPx = Math.min(pdw, Math.max(0, travel < 0 ? gTop : W - gBot));
      const openEdge = travel < 0 ? gTop : gBot;
      const parkEnd = openEdge + travel * parkPx;
      const leafOut = face > 0 ? px + half + WALL_MM : px - half - WALL_MM;
      out.push({
        id: `door:partition-${i}-leaf`,
        kind: "door",
        label: `Partition ${n} sliding door leaf`,
        poly: rectPoly(
          Math.min(px, leafOut), Math.min(gTop, parkEnd),
          Math.max(px, leafOut), Math.max(gBot, parkEnd),
        ),
        hard: true,
      });
      return;
    }

    // Hinged: the leaf pivots at its chosen end and sweeps a quarter-disc into the chosen room.
    const hy = hinge === "top" ? gTop : gBot;
    const cy = hinge === "top" ? gBot : gTop;
    const Hp: Pt = { x: px, y: hy };
    out.push({
      id: `door-swing:partition-${i}`,
      kind: "door-swing",
      label: `Partition ${n} door swing`,
      poly: quarterDisc(Hp, { x: px + dir * pdw, y: hy }, { x: px, y: cy }),
      hard: true,
    });
  });

  return out;
}

/* ==========================================================================
 * 7. Windows
 * ========================================================================== */

function windowObstacles(config: CabinConfig): Obstacle[] {
  const { lengthMm: L, widthMm: W } = cabinSizeMm(config);
  const winW = config.windowWidthFt ?? 3;
  const winH = config.windowHeightFt ?? 3;
  const openable = isOpenableWindow(config.windowTypeId ?? "upvc");
  const opensIn = openable && config.windowOpening === "inside";

  return (config.windowPlacements ?? []).map((wp, i) => {
    const side = wp.side || "top";
    const horiz = side === "top" || side === "bottom";
    const spanFt = sideSpanFt(side, config.length, config.width);
    const len = ft(openingWidthOn(spanFt, winW));
    const start = ft(clampOpeningOffset(wp.offset, spanFt, winW));
    // A casement sash that opens INSIDE sweeps its own width into the room; every other window
    // type (sliding / uPVC / fixed) stays in the wall plane.
    const depth = opensIn ? len : WALL_MM;

    const poly = horiz
      ? side === "top"
        ? rectPoly(start, 0, start + len, depth)
        : rectPoly(start, W - depth, start + len, W)
      : side === "left"
        ? rectPoly(0, start, depth, start + len)
        : rectPoly(L - depth, start, L, start + len);

    return {
      id: `window:${i}`,
      kind: "window" as const,
      label: `Window ${i + 1}`,
      poly,
      // Only a table TALLER than the sill can foul a window; a desk under one is normal.
      fromHeightMm: WINDOW_SILL_MM,
      toHeightMm: WINDOW_SILL_MM + ft(winH),
      hard: false,
    };
  });
}

/* ==========================================================================
 * 8. Main electrical board (DB / MCB)
 *
 * CabinCalculator.mainBoardBox() mounts it on the interior face of the DOOR's wall, just beside
 * the door. The board itself is at head height, but the floor in front of it must stay reachable
 * — that access strip is what a table can actually foul, so that is what is emitted.
 * ========================================================================== */

const BOARD_WIDTH_MM = 400;
const BOARD_ACCESS_MM = 600;
const BOARD_GAP_MM = 400; // clear of the door leaf, mirroring mainBoardBox's `gap`

function electricalBoardObstacles(config: CabinConfig): Obstacle[] {
  const door = (config.doorPlacements ?? [])[0];
  if (!door) return [];

  const { lengthMm: L, widthMm: W } = cabinSizeMm(config);
  const side = door.side || "bottom";
  const horiz = side === "top" || side === "bottom";
  const spanFt = sideSpanFt(side, config.length, config.width);
  const dw = ft(openingWidthOn(spanFt, DOOR_SIZE.widthFt));
  const start = ft(clampOpeningOffset(door.offset, spanFt, DOOR_SIZE.widthFt));

  // Beside the door: past its far edge, plus a gap — clamped onto the wall.
  const span = horiz ? L : W;
  const near = clamp(start + dw + BOARD_GAP_MM, 0, Math.max(0, span - BOARD_WIDTH_MM));
  const far = near + BOARD_WIDTH_MM;

  const poly = horiz
    ? side === "top"
      ? rectPoly(near, 0, far, BOARD_ACCESS_MM)
      : rectPoly(near, W - BOARD_ACCESS_MM, far, W)
    : side === "left"
      ? rectPoly(0, near, BOARD_ACCESS_MM, far)
      : rectPoly(L - BOARD_ACCESS_MM, near, L, far);

  return [{
    id: "electrical-panel:0",
    kind: "electrical-panel",
    label: "Main electrical board",
    poly,
    hard: true,
  }];
}

/* ==========================================================================
 * 9. Loose plumbing / pantry fixtures (wash basin, urinal, pantry counter)
 *
 * A faithful mm port of ModulePlan's "loose plumbing / pantry fixtures" block.
 * ========================================================================== */

const LOOSE_FIXTURES: { id: string; label: string; kind: ObstacleKind; wFt: number; dFt: number }[] = [
  { id: "wash-basin", label: "Wash basin", kind: "fixture", wFt: 2, dFt: 1.5 },
  { id: "urinal", label: "Urinal", kind: "fixture", wFt: 1.5, dFt: 1.2 },
  { id: "pantry", label: "Pantry counter", kind: "pantry", wFt: 4, dFt: 2 },
];

/** ModulePlan caps how many identical pieces a room's plan will draw. */
const PER_TYPE_CAP = 8;

function looseFixtureObstacles(config: CabinConfig, keeps: Box[]): Obstacle[] {
  const { widthMm: W } = cabinSizeMm(config);
  const rooms = roomRangesMm(config);
  const out: Obstacle[] = [];
  const pad = PAD_MM, gap = GAP_MM * 1.5;

  rooms.forEach((room) => {
    const { x0, x1 } = room;
    // A running cursor per wall, so units left on "auto" don't stack on each other.
    const autoCursor: Record<string, number> = { top: x0 + pad, bottom: x0 + pad, left: pad, right: pad };

    LOOSE_FIXTURES.forEach((spec) => {
      const total = config.addons?.[spec.id] || 0;
      if (!total) return;
      const per = furnitureRoomCounts(config, spec.id, total, rooms.length);
      const cnt = Math.min(per[room.index] || 0, PER_TYPE_CAP);
      if (cnt <= 0) return;
      const before = per.slice(0, room.index).reduce((a, b) => a + b, 0);
      const walls = fixtureUnitWallsOf(config, spec.id, total);
      const offsets = fixtureUnitOffsetsOf(config, spec.id, total);
      // Only the pantry is customer-sized (running-foot pricing); the rest are fixed glyphs.
      const alongFt = spec.id === "pantry" ? fixtureSizeOf(config, spec.id).wFt : spec.wFt;
      const depthFt = spec.id === "pantry" ? PANTRY_DEPTH_FT : spec.dFt;

      for (let k = 0; k < cnt; k++) {
        const gi = before + k;
        const wall = walls[gi] ?? "bottom";
        const horiz = wall === "top" || wall === "bottom";
        const spanStart = horiz ? x0 : 0;
        const spanEnd = horiz ? x1 : W;
        const along = Math.max(120, Math.min(ft(alongFt), spanEnd - spanStart - 2 * pad));
        const depth = Math.min(ft(depthFt), (horiz ? W : x1 - x0) * 0.5);
        const maxNear = Math.max(spanStart + pad, spanEnd - pad - along);
        let near: number;
        if (offsets[gi] >= 0) {
          near = clamp(spanStart + pad + ft(offsets[gi]), spanStart + pad, maxNear);
        } else {
          near = Math.min(autoCursor[wall], maxNear);
          autoCursor[wall] = near + along + gap;
        }
        const c = near + along / 2;

        let cx: number, cy: number;
        if (wall === "top") { cx = c; cy = depth / 2; }
        else if (wall === "bottom") { cx = c; cy = W - depth / 2; }
        else if (wall === "left") { cx = x0 + depth / 2; cy = c; }
        else { cx = x1 - depth / 2; cy = c; }

        // Slide the fitting ALONG its wall to clear the entrance zone (it keeps its wall).
        const hw = horiz ? along / 2 : depth / 2;
        const hh = horiz ? depth / 2 : along / 2;
        if (keeps.length) {
          ({ cx, cy } = avoidBoxes(cx, cy, hw, hh, keeps, x0 + hw, x1 - hw, hh, W - hh, horiz ? "x" : "y"));
        }

        out.push({
          id: `fixture:${spec.id}:${gi}`,
          kind: spec.kind,
          label: spec.label,
          poly: boxPoly(cx, cy, hw, hh),
          hard: true,
        });
      }
    });
  });

  return out;
}

/* ==========================================================================
 * 10. Enclosed toilets / washrooms
 *
 * A mm port of ModulePlan's washroomRect() + washroomAvoidedOffset() + the door of drawWashroom().
 * ========================================================================== */

interface WrRect { x0: number; y0: number; x1: number; y1: number; w: number; h: number; cx: number; cy: number }

function washroomRectMm(
  bx0: number, bx1: number, top: number, bot: number,
  wall: string, offsetFt: number, wFt: number, dFt: number,
): WrRect {
  const bandW = bx1 - bx0, bandH = bot - top;
  const horiz = wall === "top" || wall === "bottom";
  const along = Math.min(Math.max(ft(wFt), 300), (horiz ? bandW : bandH) - 2 * EDGE_MM);
  const depth = Math.min(Math.max(ft(dFt), 300), (horiz ? bandH : bandW) - 2 * EDGE_MM);
  const span = horiz ? bandW : bandH;
  const maxOff = Math.max(0, span - along);
  const off = offsetFt < 0 ? maxOff / 2 : clamp(ft(offsetFt), 0, maxOff);

  let x0: number, y0: number, w: number, h: number;
  if (wall === "top") { x0 = bx0 + off; y0 = top; w = along; h = depth; }
  else if (wall === "bottom") { x0 = bx0 + off; y0 = bot - depth; w = along; h = depth; }
  else if (wall === "left") { x0 = bx0; y0 = top + off; w = depth; h = along; }
  else { x0 = bx1 - depth; y0 = top + off; w = depth; h = along; }
  return { x0, y0, x1: x0 + w, y1: y0 + h, w, h, cx: x0 + w / 2, cy: y0 + h / 2 };
}

/** The box's along-wall offset (ft) after sliding clear of the entrance zone(s). */
function washroomAvoidedOffsetMm(
  bx0: number, bx1: number, top: number, bot: number,
  wall: string, offFt: number, wFt: number, dFt: number, keeps: Box[],
): number {
  if (!keeps.length) return offFt;
  const r = washroomRectMm(bx0, bx1, top, bot, wall, offFt, wFt, dFt);
  const horiz = wall === "top" || wall === "bottom";
  const hw = r.w / 2, hh = r.h / 2;
  const adj = avoidBoxes(r.cx, r.cy, hw, hh, keeps, bx0 + hw, bx1 - hw, top + hh, bot - hh, horiz ? "x" : "y");
  const near = horiz ? adj.cx - hw - bx0 : adj.cy - hh - top;
  return Math.max(0, near / MM_PER_FT);
}

function toiletObstacles(config: CabinConfig, keeps: Box[]): Obstacle[] {
  const { widthMm: W } = cabinSizeMm(config);
  const rooms = roomRangesMm(config);
  const out: Obstacle[] = [];

  rooms.forEach((room) => {
    ENCLOSED_TOILET_IDS.forEach((id) => {
      const total = config.addons?.[id] || 0;
      if (!total) return;
      const per = furnitureRoomCounts(config, id, total, rooms.length);
      const cnt = Math.min(per[room.index] || 0, PER_TYPE_CAP);
      if (cnt <= 0) return;
      const before = per.slice(0, room.index).reduce((a, b) => a + b, 0);
      const { wFt, dFt } = fixtureSizeOf(config, id);
      const walls = fixtureUnitWallsOf(config, id, total);
      const offsets = fixtureUnitOffsetsOf(config, id, total);
      const swings = fixtureUnitSwingsOf(config, id, total);
      const label = id === "toilet-washroom" ? "Washroom" : "Attached toilet";

      for (let k = 0; k < cnt; k++) {
        const gi = before + k;
        const wall = walls[gi] ?? "bottom";
        // "auto" (<0) spreads by the unit index so multiples don't stack, then the box slides
        // along its wall until it is clear of the entrance.
        const off0 = offsets[gi] >= 0 ? offsets[gi] : gi * (wFt + 0.5);
        const off = washroomAvoidedOffsetMm(room.x0, room.x1, 0, W, wall, off0, wFt, dFt, keeps);
        const r = washroomRectMm(room.x0, room.x1, 0, W, wall, off, wFt, dFt);

        out.push({
          id: `fixture:${id}:${gi}`,
          kind: "toilet",
          label,
          poly: rectPoly(r.x0, r.y0, r.x1, r.y1),
          hard: true,
        });

        // The door is on the enclosure's INTERIOR face. It swings into the toilet by default —
        // which is inside the box already blocked above — so only an "out" swing adds floor area
        // that a table could foul.
        if ((swings[gi] ?? "in") !== "out") continue;
        const horiz = wall === "top" || wall === "bottom";
        const doorGap = Math.max(120, Math.min(ft(DOOR_SIZE.widthFt), (horiz ? r.w : r.h) * 0.6));
        if (horiz) {
          const faceY = wall === "top" ? r.y1 : r.y0;
          const dir = wall === "top" ? 1 : -1; // "out" = away from the wall the box sits on
          const gs = r.cx - doorGap / 2, ge = r.cx + doorGap / 2;
          out.push({
            id: `door-swing:${id}-${gi}`,
            kind: "door-swing",
            label: `${label} door swing`,
            poly: quarterDisc({ x: gs, y: faceY }, { x: gs, y: faceY + dir * doorGap }, { x: ge, y: faceY }),
            hard: true,
          });
        } else {
          const faceX = wall === "left" ? r.x1 : r.x0;
          const dir = wall === "left" ? 1 : -1;
          const gs = r.cy - doorGap / 2, ge = r.cy + doorGap / 2;
          out.push({
            id: `door-swing:${id}-${gi}`,
            kind: "door-swing",
            label: `${label} door swing`,
            poly: quarterDisc({ x: faceX, y: gs }, { x: faceX + dir * doorGap, y: gs }, { x: faceX, y: ge }),
            hard: true,
          });
        }
      }
    });
  });

  return out;
}

/* ==========================================================================
 * 11. The calculator's own add-on furniture (workstations, manager desks, cupboards, …)
 *
 * A mm port of ModulePlan's roomFurnitureNodes(). Only the BOUNDING BOXES are reproduced — the
 * glyphs are irrelevant to a collision test — but the LAYOUT (wall runs, the back-to-back centre
 * pod, the conference ring, the cupboard run, the leftover loose chairs, the per-unit rotate +
 * feet-shift, the door-zone avoidance) is followed step for step, because a table must not be
 * allowed to land on a desk the plan is already drawing.
 * ========================================================================== */

type FurnKind = "desk" | "deskL" | "cabinet" | "conf" | "chair";
interface FurnSpec { label: string; wFt: number; dFt: number; kind: FurnKind }

const TW = TABLE_SIZE.lengthFt;
const TD = TABLE_SIZE.depthIn / 12;

/** Same sizes as ModulePlan's FURN_SPEC; the labels are Title Case because they are read out
 *  verbatim in collision messages ("… overlaps the Cupboard by 120 mm"). */
const FURN_SPEC: Record<string, FurnSpec> = {
  workstation: { label: "Workstation", wFt: TW, dFt: TD, kind: "desk" },
  manager: { label: "Manager table", wFt: MANAGER_TABLE_SIZE.widthFt, dFt: MANAGER_TABLE_SIZE.depthFt, kind: "desk" },
  "manager-l": { label: "Manager table (L)", wFt: MANAGER_L_SIZE.widthFt, dFt: MANAGER_L_SIZE.depthFt, kind: "deskL" },
  conference: { label: "Conference table", wFt: TW, dFt: TD, kind: "conf" },
  table: { label: "Table", wFt: TW, dFt: TD, kind: "desk" },
  "table-drawer": { label: "Table (drawer)", wFt: TW, dFt: TD, kind: "desk" },
  cupboard: { label: "Cupboard / file cabinet", wFt: 3, dFt: 1.5, kind: "cabinet" },
  overhead: { label: "Overhead cabinet", wFt: 3, dFt: 1, kind: "cabinet" },
  "chair-headrest": { label: "Chair (head rest)", wFt: 1.5, dFt: 1.5, kind: "chair" },
  "chair-backrest": { label: "Chair (back rest)", wFt: 1.5, dFt: 1.5, kind: "chair" },
};

interface FurnUnit { id: string; spec: FurnSpec; pos?: string; adj: FurnitureAdjust }
type ChairSide = "below" | "above" | "right" | "left";

/** ModulePlan's chairFor(): a ~1.45 ft office chair, never wider than its desk, never a dot. */
const chairFor = (w: number, h: number): number =>
  Math.max(200, Math.min(ft(1.45), Math.min(w, h) * 1.05));

function furnitureObstacles(config: CabinConfig, keeps: Box[]): Obstacle[] {
  // A toilet cabin is a self-contained washroom — ModulePlan never draws office furniture in it,
  // so there is nothing to collide with, even if a stale add-on lingers from another product.
  if (isToiletCabin(config.productId)) return [];

  const { widthMm: W } = cabinSizeMm(config);
  const rooms = roomRangesMm(config);
  const out: Obstacle[] = [];
  const wg = clamp(config.furnitureWallGap ?? 0, 0, 3) * MM_PER_FT;

  rooms.forEach((room) => {
    const units: FurnUnit[] = [];
    ROOM_FURNITURE_IDS.forEach((id) => {
      const spec = FURN_SPEC[id];
      const total = config.addons?.[id] || 0;
      if (!spec || !total) return;
      const per = furnitureRoomCounts(config, id, total, rooms.length);
      const places = TABLE_ADDON_IDS.includes(id) ? tablePlacementsOf(config, id, total) : null;
      const adjusts = furnitureAdjustOf(config, id, total);
      const before = per.slice(0, room.index).reduce((a, b) => a + b, 0);
      const cnt = Math.min(per[room.index] || 0, PER_TYPE_CAP);
      for (let k = 0; k < cnt; k++) {
        units.push({ id, spec, pos: places?.[before + k], adj: adjusts[before + k] });
      }
    });
    if (units.length) out.push(...roomFurniture(units, room.x0, room.x1, 0, W, wg, keeps, room.index));
  });

  return out;
}

function roomFurniture(
  units: FurnUnit[], x0: number, x1: number, yTop: number, yBot: number,
  wg: number, keeps: Box[], roomIndex: number,
): Obstacle[] {
  const out: Obstacle[] = [];
  const pad = PAD_MM, gap = GAP_MM;
  const dW = (u: FurnUnit) => ft(u.spec.wFt);
  const dD = (u: FurnUnit) => ft(u.spec.dFt);
  let seq = 0;

  const push = (label: string, cx: number, cy: number, hw: number, hh: number) => {
    out.push({
      id: `addon:r${roomIndex}:${seq++}`,
      kind: "furniture",
      label,
      poly: boxPoly(cx, cy, hw, hh),
      hard: true,
    });
  };

  /* --- chair pools: exactly ModulePlan's rule, because whether a desk HAS a chair changes the
     footprint that has to stay clear. Headrest chairs go to manager / conference desks first. --- */
  let headrest = units.filter((u) => u.id === "chair-headrest").length;
  let backrest = units.filter((u) => u.id === "chair-backrest").length;
  const wantsHeadrest = (id: string) => id === "manager" || id === "manager-l" || id === "conference";
  const takeChair = (id: string): boolean => {
    const order = wantsHeadrest(id) ? ["headrest", "backrest"] : ["backrest", "headrest"];
    for (const t of order) {
      if (t === "headrest" && headrest > 0) { headrest--; return true; }
      if (t === "backrest" && backrest > 0) { backrest--; return true; }
    }
    return false;
  };

  const groups: Record<string, FurnUnit[]> = { top: [], bottom: [], left: [], right: [], centre: [] };
  const confsCentre: FurnUnit[] = [];
  units.forEach((u) => {
    const k = u.spec.kind;
    if (k !== "desk" && k !== "deskL" && k !== "conf") return;
    const p = u.pos ?? (k === "conf" ? "centre" : "top");
    if (k === "conf" && p === "centre") { confsCentre.push(u); return; }
    (groups[p] ?? groups.top).push(u);
  });

  /**
   * ModulePlan's clampUnit(): apply the customer's per-unit rotate + feet-shift, keep the TRUE
   * rotation-aware bounding box inside the room, then shove it out of the entrance zone. Returns
   * the final centre AND the rotated half-extents — which together ARE the collision box.
   */
  const place = (u: FurnUnit, x: number, y: number, w: number, h: number) => {
    const a = u.adj ?? { rot: 0, dx: 0, dy: 0 };
    const th = ((a.rot ?? 0) * Math.PI) / 180;
    const hw = (Math.abs(w * Math.cos(th)) + Math.abs(h * Math.sin(th))) / 2;
    const hh = (Math.abs(w * Math.sin(th)) + Math.abs(h * Math.cos(th))) / 2;
    const baseCx = x + w / 2, baseCy = y + h / 2;
    let cx = baseCx + (a.dx ?? 0) * MM_PER_FT;
    let cy = baseCy + (a.dy ?? 0) * MM_PER_FT;
    const loX = x0 + EDGE_MM + hw, hiX = x1 - EDGE_MM - hw;
    const loY = yTop + EDGE_MM + hh, hiY = yBot - EDGE_MM - hh;
    cx = hiX >= loX ? clamp(cx, loX, hiX) : (x0 + x1) / 2;
    cy = hiY >= loY ? clamp(cy, loY, hiY) : (yTop + yBot) / 2;
    if (keeps.length && hiX >= loX && hiY >= loY) {
      const along = u.pos === "top" || u.pos === "bottom" ? "x"
        : u.pos === "left" || u.pos === "right" ? "y" : undefined;
      ({ cx, cy } = avoidBoxes(cx, cy, hw, hh, keeps, loX, hiX, loY, hiY, along));
    }
    // The chair rides the same transform as its desk, so it rotates about the desk's BASE centre
    // and then follows the desk's clamped offset.
    return { cx, cy, hw, hh, baseCx, baseCy, rot: a.rot ?? 0 };
  };

  /** A desk + (when the customer bought one) its chair, on `side` of the desk. */
  const desk = (u: FurnUnit, x: number, y: number, w: number, h: number, side: ChairSide) => {
    const p = place(u, x, y, w, h);
    push(u.spec.label, p.cx, p.cy, p.hw, p.hh);
    // An L-desk seats its manager INSIDE the L's inner corner, so the chair is already covered
    // by the desk's own bounding box — only a plain desk pushes a chair outside it.
    if (u.spec.kind === "deskL" || !takeChair(u.id)) return;
    const cs = chairFor(w, h);
    const local: Pt =
      side === "below" ? { x: x + w / 2, y: y + h + CHAIR_GAP_MM + cs / 2 } :
      side === "above" ? { x: x + w / 2, y: y - CHAIR_GAP_MM - cs / 2 } :
      side === "right" ? { x: x + w + CHAIR_GAP_MM + cs / 2, y: y + h / 2 } :
                         { x: x - CHAIR_GAP_MM - cs / 2, y: y + h / 2 };
    const th = (p.rot * Math.PI) / 180;
    const c = Math.cos(th), s = Math.sin(th);
    const rx = local.x - p.baseCx, ry = local.y - p.baseCy;
    const chw = (Math.abs(cs * c) + Math.abs(cs * s)) / 2;
    push(`${u.spec.label} chair`, p.cx + (rx * c - ry * s), p.cy + (rx * s + ry * c), chw, chw);
  };

  /* --- horizontal wall runs (Upper / Down) --- */
  const band = (list: FurnUnit[]) =>
    list.length ? Math.max(...list.map((u) => dD(u) + chairFor(dW(u), dD(u)))) + CHAIR_GAP_MM + gap : 0;
  const topBand = band(groups.top), bottomBand = band(groups.bottom);

  const layH = (list: FurnUnit[], wall: "top" | "bottom") => {
    let cx = x0 + pad, row = 0;
    list.forEach((u) => {
      const w = dW(u), h = dD(u), cs = chairFor(w, h);
      if (cx + w > x1 - pad && cx > x0 + pad) { cx = x0 + pad; row++; }
      const off = row * (h + cs + CHAIR_GAP_MM + gap);
      const y = wall === "top" ? yTop + wg + off : yBot - wg - h - off;
      desk(u, cx, y, w, h, wall === "top" ? "below" : "above");
      cx += w + gap;
    });
  };
  layH(groups.top, "top");
  layH(groups.bottom, "bottom");

  /* --- vertical wall runs (Left / Right), inset past the horizontal bands --- */
  const vTop = yTop + wg + topBand, vBot = yBot - wg - bottomBand;
  const layV = (list: FurnUnit[], wall: "left" | "right") => {
    let cy = vTop, col = 0;
    list.forEach((u) => {
      const w = dD(u), h = dW(u), cs = chairFor(w, h); // rotated against the side wall
      if (cy + h > vBot && cy > vTop) { cy = vTop; col++; }
      const off = col * (w + cs + CHAIR_GAP_MM + gap);
      const x = wall === "left" ? x0 + wg + off : x1 - wg - w - off;
      desk(u, x, cy, w, h, wall === "left" ? "right" : "left");
      cy += h + gap;
    });
  };
  layV(groups.left, "left");
  layV(groups.right, "right");

  /* --- what's left in the middle --- */
  const sideBand = (list: FurnUnit[]) =>
    list.length ? Math.max(...list.map((u) => dD(u) + chairFor(dD(u), dW(u)))) + CHAIR_GAP_MM + gap : 0;
  const cx0 = x0 + pad + sideBand(groups.left);
  const cx1 = x1 - pad - sideBand(groups.right);
  let cursor = vTop;

  confsCentre.forEach((u) => {
    const w = Math.min(dW(u), cx1 - cx0 - 100), h = dD(u);
    const ringS = Math.max(175, Math.min(ft(1.4), h * 0.62));
    cursor += Math.min(h * 0.5, 140) + 25;
    const left = (cx0 + cx1) / 2 - w / 2;
    // The ring seats up to `perSide` chairs above AND below — but only as many as the customer
    // actually bought. Any ring at all inflates the table's keep-clear band by a chair depth.
    const perSide = Math.max(1, Math.min(3, Math.round(w / (ringS * 1.5))));
    let ring = 0;
    for (let j = 0; j < perSide * 2; j++) { if (!takeChair("conference")) break; ring++; }
    const p = place(u, left, cursor, w, h);
    const pad2 = ring > 0 ? ringS * 1.12 : 0;
    push(u.spec.label, p.cx, p.cy, p.hw + pad2, p.hh + pad2);
    cursor += h + Math.min(h * 0.5, 140) + 175;
  });

  /* --- centre pod: two rows back-to-back across a partition screen --- */
  if (groups.centre.length) {
    const list = groups.centre;
    const rowA = list.slice(0, Math.ceil(list.length / 2));
    const rowB = list.slice(Math.ceil(list.length / 2));
    const runW = (r: FurnUnit[]) => (r.length ? r.reduce((s, u) => s + dW(u) + gap, -gap) : 0);
    const rowW = Math.max(runW(rowA), runW(rowB));
    const depthA = rowA.length ? Math.max(...rowA.map(dD)) : 0;
    const cs = chairFor(dW(list[0]), dD(list[0]));
    const px = Math.max(cx0 + 25, (cx0 + cx1) / 2 - rowW / 2);
    const spine = Math.max(cursor + cs + depthA + CHAIR_GAP_MM, (Math.max(cursor, vTop) + vBot) / 2);

    let ax = px;
    rowA.forEach((u) => { const w = dW(u), h = dD(u); desk(u, ax, spine - h, w, h, "above"); ax += w + gap; });
    let bx = px;
    rowB.forEach((u) => { const w = dW(u), h = dD(u); desk(u, bx, spine, w, h, "below"); bx += w + gap; });

    const depthB = rowB.length ? Math.max(...rowB.map(dD)) : 0;
    cursor = spine + depthB + cs + 125;
  }

  /* --- cupboards / file cabinets: hug a wall that has no desk run, from the right --- */
  const cabinets = units.filter((u) => u.spec.kind === "cabinet");
  if (cabinets.length) {
    const onTop = groups.top.length === 0;
    let cxr = x1 - pad;
    cabinets.forEach((u) => {
      const w = dW(u), h = dD(u);
      cxr -= w;
      const y = onTop ? yTop + wg : yBot - wg - h;
      const p = place(u, cxr, y, w, h);
      push(u.spec.label, p.cx, p.cy, p.hw, p.hh);
      cxr -= gap;
    });
  }

  /* --- loose chairs: whatever the customer bought that no desk claimed --- */
  const loose = headrest + backrest;
  if (loose > 0) {
    const s = Math.max(200, Math.min(ft(1.45), 375));
    const y = clamp(Math.max(cursor, vTop) + s / 2, vTop + s / 2, vBot - s / 2);
    let cx = cx0 + 50;
    for (let i = 0; i < loose; i++) {
      if (cx + s > cx1) cx = cx0 + 50;
      push("Chair", cx + s / 2, y, s / 2, s / 2);
      cx += s + gap;
    }
  }

  return out;
}

/* ==========================================================================
 * 12. The one entry point
 * ========================================================================== */

/**
 * Every obstacle in the cabin, in cabin mm.
 *
 * The cabin's own four WALLS are deliberately NOT emitted as obstacles: a table is *supposed* to
 * sit against a wall, and containment is already enforced by the `outside_cabin` check plus the
 * `clearance_wall` rule (which knows the difference between a seated and an unseated edge). An
 * obstacle poly for each wall would make every wall-hugging desk a hard error.
 *
 * Staircases and verandas live OUTSIDE the cabin envelope (they are BOQ-only, admin options — the
 * customer wizard has neither), so they contribute no floor obstacle either. Both kinds stay in
 * `ObstacleKind` so a future in-cabin stair does not need a type change.
 */
export function cabinObstacles(config: CabinConfig): Obstacle[] {
  const keeps = doorEntryBoxes(config);
  return [
    ...partitionObstacles(config),
    ...mainDoorObstacles(config),
    ...windowObstacles(config),
    ...electricalBoardObstacles(config),
    ...toiletObstacles(config, keeps),
    ...looseFixtureObstacles(config, keeps),
    ...furnitureObstacles(config, keeps),
  ];
}
