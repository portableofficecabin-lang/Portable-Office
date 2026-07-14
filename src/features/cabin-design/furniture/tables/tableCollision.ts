/**
 * Table module — COLLISION + CLEARANCE (spec §14, §15).
 *
 * The rule the whole module hangs on: a table may not overlap another table, another table's
 * chairs, a door, a door's swing, a partition, a fixture or the calculator's own furniture — and
 * every complaint must name BOTH objects and the overlap in millimetres, because "collision
 * detected" is useless to a salesperson on a phone call and "Executive Table 1 overlaps the
 * inward-opening door clearance by 320 mm" is not.
 *
 * PERFORMANCE (spec §29): this runs on every drag frame. Two things make that affordable:
 *   1. Every footprint is computed ONCE per table per check, never inside a loop. `tableFootprint`
 *      rebuilds shape + seats + fittings from scratch, so calling it inside an O(n·m) loop would
 *      make a 10-table cabin quadratically expensive for no reason. `snap()` memoises on the table
 *      OBJECT — and because every edit produces a NEW object (the whole model is immutable), a
 *      stale snapshot is unreachable by construction. A WeakMap means the cache never leaks.
 *   2. Every pair is AABB-rejected before any polygon maths. `polysOverlap` does its own AABB
 *      reject too, but that is per-POLYGON; rejecting per-TABLE first skips the whole poly list.
 *
 * Geometry comes exclusively from ./tableGeometry — the same functions the renderer draws with, so
 * a table cannot be flagged for an overlap that isn't visible, or slide through one that is.
 */

import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import { cabinObstacles, cabinSizeMm, type Obstacle } from "./cabinObstacles";
import {
  bboxOf, bboxOfPolys, chairWorldPolys, clampIntoCabin, inflatePoly, overlapDepth,
  polysOverlap, rotatePt, tableFootprint, tableOccupancy, tableWorldPolys, toWorldPts,
  type Pt,
} from "./tableGeometry";
import {
  DEFAULT_CLEARANCES,
  type CabinTable, type ClearanceRules, type TableIssue, type TableIssueCode,
} from "./tableSchema";
import { findAccessory } from "./tableTypes";

/* ==========================================================================
 * 1. Context
 * ========================================================================== */

export interface CollisionContext {
  config: CabinConfig;
  tables: CabinTable[];
  clearances: ClearanceRules;
  obstacles: Obstacle[];
}

export function buildContext(config: CabinConfig, clearances?: ClearanceRules): CollisionContext {
  return {
    config,
    tables: config.tables ?? [],
    clearances: clearances ?? DEFAULT_CLEARANCES,
    obstacles: cabinObstacles(config),
  };
}

/* ==========================================================================
 * 2. Snapshots — every world-space polygon a table owns, computed once
 * ========================================================================== */

type Box = { minX: number; minY: number; maxX: number; maxY: number };

/** An accessory that needs room to open, and the strip of floor it opens into. */
interface OpeningZone { label: string; zone: Pt[]; box: Box }

interface Snap {
  /** Tabletop (+ its L/U/T arms) in cabin mm. */
  top: Pt[][];
  /** Chairs in cabin mm. */
  chairs: Pt[][];
  /** Top + pedestals/storage + chairs — everything the table stands on. */
  occ: Pt[][];
  /** Top + storage, WITHOUT chairs: the solid body, which is what "table vs table" means. */
  body: Pt[][];
  /** AABB of `occ` — the cheap reject, and the box the cabin has to contain. */
  box: Box;
  /** AABB of `top` — the wall-distance readouts measure the tabletop, not the chairs. */
  topBox: Box;
  /** Chair pull-out strips (one per seat), already in cabin mm. */
  pullouts: { zone: Pt[]; box: Box }[];
  /** Drawer / cabinet opening strips. */
  openings: OpeningZone[];
  heightMm: number;
  /** The rules the strips above were sized with — see SNAPS. */
  rules: ClearanceRules;
}

/** Table objects are immutable, so identity IS the cache key. The clearances are carried on the
 *  snapshot and re-checked, because `pullouts` and `openings` are sized FROM them: an admin who
 *  edits the clearance rules must not be served a snapshot built with the old ones. */
const SNAPS = new WeakMap<CabinTable, Snap>();
/** Obstacle AABBs, memoised on the obstacle array `cabinObstacles()` produced. */
const OBS_BOXES = new WeakMap<Obstacle[], Box[]>();

const boxOfPolys = (polys: Pt[][]): Box => bboxOfPolys(polys);
const boxesHit = (a: Box, b: Box): boolean =>
  a.maxX > b.minX && b.maxX > a.minX && a.maxY > b.minY && b.maxY > a.minY;

const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
];

/** The accessory footprints tableGeometry's buildFittings() actually draws as a "storage" prim.
 *  Restated here (rather than read back off the prims) because a prim carries no accessory id —
 *  and the fallback sizes are buildFittings' own, so the zone always hangs off the drawn box. */
const STORAGE_ACCESSORIES = new Set([
  "mobile-pedestal", "fixed-pedestal", "drawer-unit", "drawer-unit-3", "drawer-unit-4",
  "side-storage", "return-storage", "under-counter-storage", "cpu-holder",
]);

function snap(t: CabinTable, clearances: ClearanceRules): Snap {
  const hit = SNAPS.get(t);
  if (hit && hit.rules === clearances) return hit;

  const fp = tableFootprint(t);
  const top = tableWorldPolys(t);
  const chairs = chairWorldPolys(t);
  const occ = tableOccupancy(t);
  // tableOccupancy() is [top…, storage…, chairs…] — the body is everything that is not a chair.
  const body = occ.slice(0, occ.length - chairs.length);

  /* --- chair pull-out strips. A chair glyph is drawn FACING UP (the occupant looks −y), so the
     space the occupant needs to get up is BEHIND them: +y in the seat's own frame. --- */
  const cw = t.seating.chairWidthMm || 550;
  const cd = t.seating.chairDepthMm || 550;
  const pull = Math.max(0, clearances.chairMovementMm - cd);
  const pullouts = pull > 0
    ? fp.seats.map((s) => {
        const local = rect(-cw / 2, cd / 2, cw / 2, cd / 2 + pull).map((p) => {
          const r = rotatePt(p, s.rotDeg);
          return { x: r.x + s.x, y: r.y + s.y };
        });
        const zone = toWorldPts(local, t);
        return { zone, box: bboxOf(zone) };
      })
    : [];

  /* --- drawer / cabinet opening strips, hung off the SAME boxes buildFittings draws. --- */
  const b = bboxOfPolys(fp.polys);
  const need = Math.max(0, clearances.drawerOpeningMm);
  const openings: OpeningZone[] = [];
  if (need > 0) {
    for (const a of t.accessories) {
      if (!a.showInDrawing) continue;
      const def = findAccessory(a.accessoryId);
      if (!def?.needsOpeningClearance) continue;

      let x0: number, y0: number, x1: number, y1: number;
      let dir: "left" | "right" | "front" | "rear";

      if (a.accessoryId === "keyboard-tray") {
        const w = a.lengthMm ?? 600, d = a.depthMm ?? 300;
        const cx = (b.minX + b.maxX) / 2;
        x0 = cx - w / 2; x1 = cx + w / 2; y0 = b.maxY - d; y1 = b.maxY;
        dir = "front";
      } else if (STORAGE_ACCESSORIES.has(a.accessoryId)) {
        const w = a.lengthMm ?? 400, d = a.depthMm ?? 450;
        switch (a.position) {
          case "left": x0 = b.minX - w; y0 = b.minY + 20; dir = "left"; break;
          case "right": x0 = b.maxX; y0 = b.minY + 20; dir = "right"; break;
          case "front": x0 = b.minX + 40; y0 = b.maxY; dir = "front"; break;
          case "rear": x0 = b.minX + 40; y0 = b.minY - d; dir = "rear"; break;
          default: x0 = b.maxX - w - 60; y0 = b.maxY - d - 20; dir = "front"; break; // "under"
        }
        x1 = x0 + w; y1 = y0 + d;
      } else {
        continue; // needs clearance but has no drawn footprint — nothing to measure against
      }

      // The strip the drawer front sweeps into, immediately outside the box.
      const local =
        dir === "front" ? rect(x0, y1, x1, y1 + need) :
        dir === "rear" ? rect(x0, y0 - need, x1, y0) :
        dir === "left" ? rect(x0 - need, y0, x0, y1) :
                         rect(x1, y0, x1 + need, y1);
      const zone = toWorldPts(local, t);
      openings.push({ label: def.label, zone, box: bboxOf(zone) });
    }
  }

  const out: Snap = {
    top, chairs, occ, body,
    box: boxOfPolys(occ),
    topBox: boxOfPolys(top),
    pullouts,
    openings,
    heightMm: t.dimensions.heightMm,
    rules: clearances,
  };
  SNAPS.set(t, out);
  return out;
}

function obstacleBoxes(ctx: CollisionContext): Box[] {
  const hit = OBS_BOXES.get(ctx.obstacles);
  if (hit) return hit;
  const boxes = ctx.obstacles.map((o) => bboxOf(o.poly));
  OBS_BOXES.set(ctx.obstacles, boxes);
  return boxes;
}

/* ==========================================================================
 * 3. Messages
 * ========================================================================== */

const mm = (v: number): number => Math.max(1, Math.round(v));

const issue = (
  code: TableIssueCode, severity: "error" | "warning", t: CabinTable,
  message: string, refs: string[], overlapMm?: number, hint?: string,
): TableIssue => ({ code, severity, message, tableId: t.id, refs, overlapMm, hint });

/** Which issue an obstacle raises when a table lands on it. */
function codeFor(kind: Obstacle["kind"]): TableIssueCode {
  switch (kind) {
    case "door": return "overlap_door";
    case "door-swing": return "overlap_door_swing";
    case "partition": return "overlap_partition";
    case "window": return "overlap_window";
    default: return "overlap_fixture";
  }
}

const HINTS: Partial<Record<TableIssueCode, string>> = {
  overlap_door_swing: "Move the table or change the door opening direction.",
  overlap_door: "Keep the doorway clear so the door can be used.",
  overlap_partition: "Move the table clear of the partition wall.",
  overlap_window: "Lower the table or move it away from the window.",
  overlap_fixture: "Move the table, or relocate the fitting in the Add-ons step.",
  overlap_table: "Move or rotate one of the two tables.",
  outside_cabin: "Move the table back inside the cabin, or reduce its size.",
  clearance_wall: "Pull the table away from the wall, or turn the seated edge inward.",
  clearance_chair: "Leave room behind the chair, or move the blocking item.",
  clearance_passage: "Widen the gap between the two tables.",
  clearance_drawer: "Leave space in front of the unit, or move it to another side of the table.",
};

/* ==========================================================================
 * 4. The checks
 * ========================================================================== */

/**
 * Every problem with ONE table. `ctx.tables` supplies the neighbours; a table is never compared
 * with itself (by id, so a freshly-edited copy of a table that is still in ctx.tables does not
 * "collide with itself").
 */
export function checkTable(t: CabinTable, ctx: CollisionContext): TableIssue[] {
  const out: TableIssue[] = [];
  const c = ctx.clearances;
  const { lengthMm: L, widthMm: W } = cabinSizeMm(ctx.config);
  const a = snap(t, c);

  /* ---- outside the cabin ---- */
  const over = Math.max(-a.box.minX, -a.box.minY, a.box.maxX - L, a.box.maxY - W);
  if (over > 0.5) {
    out.push(issue("outside_cabin", "error", t,
      `${t.name} extends ${mm(over)} mm outside the cabin.`,
      ["cabin"], mm(over), HINTS.outside_cabin));
  }

  /* ---- obstacles ---- */
  const boxes = obstacleBoxes(ctx);
  // A table that already blocks a doorway does not also need to be told it blocks that doorway's
  // entry clearance — the clearance is the strictly larger zone, and one red flag per door reads
  // like a person wrote it.
  const doorsHit = new Set<string>();
  const pending: { o: Obstacle; depth: number }[] = [];

  for (let i = 0; i < ctx.obstacles.length; i++) {
    const o = ctx.obstacles[i];
    if (!boxesHit(a.box, boxes[i])) continue;
    // A window (or any obstacle with a vertical band) only conflicts with a table tall enough to
    // reach it — a desk under a window sill is exactly what a desk is for.
    if (o.fromHeightMm != null && a.heightMm <= o.fromHeightMm) continue;

    let depth = 0;
    for (const p of a.occ) {
      if (polysOverlap(p, o.poly)) depth = Math.max(depth, overlapDepth(p, o.poly));
    }
    if (depth <= 0) continue;
    if (o.kind === "door") doorsHit.add(o.id.replace(/^door:/, ""));
    pending.push({ o, depth });
  }

  for (const { o, depth } of pending) {
    // "door-swing:entry-0" is the clearance belonging to "door:0".
    if (o.kind === "door-swing" && o.id.startsWith("door-swing:entry-")) {
      if (doorsHit.has(o.id.slice("door-swing:entry-".length))) continue;
    }
    const code = codeFor(o.kind);
    const verb = o.kind === "door" ? "blocks" : "overlaps";
    const suffix = o.kind === "window"
      ? ` — the table is ${mm(a.heightMm)} mm tall and the sill is ${mm(o.fromHeightMm ?? 0)} mm.`
      : ".";
    out.push(issue(code, o.hard ? "error" : "warning", t,
      `${t.name} ${verb} the ${o.label} by ${mm(depth)} mm${suffix}`,
      [o.id], mm(depth), HINTS[code]));
  }

  /* ---- other tables ---- */
  for (const other of ctx.tables) {
    if (other.id === t.id) continue;
    const b = snap(other, c);
    if (!boxesHit(a.box, b.box)) continue;

    // Body-to-body reads "the two tables overlap"; body-to-chairs reads "…overlaps the chairs at
    // …", which is a different fix (rotate the neighbour, don't move this one).
    let solid = 0;
    for (const p of a.body) for (const q of b.body) {
      if (polysOverlap(p, q)) solid = Math.max(solid, overlapDepth(p, q));
    }
    if (solid > 0) {
      out.push(issue("overlap_table", "error", t,
        `${t.name} overlaps ${other.name} by ${mm(solid)} mm.`,
        [other.id], mm(solid), HINTS.overlap_table));
      continue;
    }

    let seated = 0;
    for (const p of a.occ) for (const q of b.occ) {
      if (polysOverlap(p, q)) seated = Math.max(seated, overlapDepth(p, q));
    }
    if (seated > 0) {
      out.push(issue("overlap_table", "error", t,
        `${t.name} overlaps the chairs at ${other.name} by ${mm(seated)} mm.`,
        [other.id], mm(seated), HINTS.overlap_table));
      continue;
    }

    /* ---- walking passage between the two occupancies ---- */
    const need = c.walkingPassageMm;
    if (need > 0) {
      const grown = inflatePoly(
        rect(a.box.minX, a.box.minY, a.box.maxX, a.box.maxY), need,
      );
      const otherBox = rect(b.box.minX, b.box.minY, b.box.maxX, b.box.maxY);
      if (polysOverlap(grown, otherBox)) {
        // Measure the true gap on the axis the two actually face each other across. A purely
        // DIAGONAL offset is not a passage at all — nobody walks through a corner — so it is
        // only a passage when the two boxes overlap on one axis.
        const dx = Math.max(0, Math.max(a.box.minX, b.box.minX) - Math.min(a.box.maxX, b.box.maxX));
        const dy = Math.max(0, Math.max(a.box.minY, b.box.minY) - Math.min(a.box.maxY, b.box.maxY));
        if (!(dx > 0 && dy > 0)) {
          const gap = dx + dy;
          if (gap < need) {
            out.push(issue("clearance_passage", "warning", t,
              `${t.name} and ${other.name} leave only ${Math.round(gap)} mm of walking passage — ` +
              `${need} mm is required (short by ${mm(need - gap)} mm).`,
              [other.id], mm(need - gap), HINTS.clearance_passage));
          }
        }
      }
    }
  }

  out.push(...wallClearance(t, a, ctx));
  out.push(...chairClearance(t, a, ctx));
  out.push(...drawerClearance(t, a, ctx));
  return out;
}

/* ---- wall clearance ------------------------------------------------------ */

const WALLS = [
  { id: "wall:left", name: "left wall" },
  { id: "wall:right", name: "right wall" },
  { id: "wall:rear", name: "rear wall" },
  { id: "wall:front", name: "front wall" },
] as const;

/**
 * A table edge with a chair on it needs a person's worth of room to the wall behind that chair;
 * an edge with no chair only needs the table not to scrape the wall. Whether an edge is SEATED is
 * decided from the chairs themselves — a chair whose centre lies beyond the tabletop toward a
 * wall IS that wall's seated edge — so the rule survives any rotation or flip without a lookup
 * table of sides.
 */
function wallClearance(t: CabinTable, a: Snap, ctx: CollisionContext): TableIssue[] {
  const c = ctx.clearances;
  const { lengthMm: L, widthMm: W } = cabinSizeMm(ctx.config);
  const centres = a.chairs.map((p) => {
    const b = bboxOf(p);
    return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  });

  const dists = [
    { d: a.topBox.minX, seated: centres.some((p) => p.x < a.topBox.minX) },
    { d: L - a.topBox.maxX, seated: centres.some((p) => p.x > a.topBox.maxX) },
    { d: a.topBox.minY, seated: centres.some((p) => p.y < a.topBox.minY) },
    { d: W - a.topBox.maxY, seated: centres.some((p) => p.y > a.topBox.maxY) },
  ];

  const out: TableIssue[] = [];
  dists.forEach((w, i) => {
    // A table already reported as outside_cabin gets no wall warnings on top — the error says it.
    if (w.d < 0) return;
    const limit = w.seated ? c.seatedTableFromWallMm : c.tableFromWallMm;
    if (w.d >= limit) return;
    const wall = WALLS[i];
    out.push(issue("clearance_wall", "warning", t,
      `${t.name} sits ${Math.round(w.d)} mm from the ${wall.name} — ` +
      `${w.seated ? "a seated edge" : "an unseated edge"} needs ${limit} mm ` +
      `(short by ${mm(limit - w.d)} mm).`,
      [wall.id], mm(limit - w.d), HINTS.clearance_wall));
  });
  return out;
}

/* ---- chair pull-out ------------------------------------------------------ */

/**
 * The occupant has to be able to push their chair back and stand up. The strip behind each chair
 * must therefore be free of obstacles and of other tables.
 *
 * Cabin WALLS are deliberately not tested here: a chair backing onto a wall is precisely what
 * `clearance_wall`'s seated-edge rule already measures, and reporting it twice with two different
 * numbers is how a user learns to ignore warnings.
 */
function chairClearance(t: CabinTable, a: Snap, ctx: CollisionContext): TableIssue[] {
  if (!a.pullouts.length) return [];
  const out: TableIssue[] = [];
  const boxes = obstacleBoxes(ctx);
  const seen = new Set<string>();

  for (const pull of a.pullouts) {
    for (let i = 0; i < ctx.obstacles.length; i++) {
      const o = ctx.obstacles[i];
      if (!o.hard || seen.has(o.id)) continue;
      if (!boxesHit(pull.box, boxes[i])) continue;
      if (o.fromHeightMm != null) continue; // a high-level obstacle never blocks a chair
      if (!polysOverlap(pull.zone, o.poly)) continue;
      const depth = overlapDepth(pull.zone, o.poly);
      seen.add(o.id);
      out.push(issue("clearance_chair", "warning", t,
        `The chair pull-out behind ${t.name} is blocked by the ${o.label} by ${mm(depth)} mm — ` +
        `a chair needs ${ctx.clearances.chairMovementMm} mm to move back.`,
        [o.id], mm(depth), HINTS.clearance_chair));
    }

    for (const other of ctx.tables) {
      if (other.id === t.id || seen.has(other.id)) continue;
      const b = snap(other, ctx.clearances);
      if (!boxesHit(pull.box, b.box)) continue;
      let depth = 0;
      for (const q of b.occ) {
        if (polysOverlap(pull.zone, q)) depth = Math.max(depth, overlapDepth(pull.zone, q));
      }
      if (depth <= 0) continue;
      seen.add(other.id);
      out.push(issue("clearance_chair", "warning", t,
        `The chair pull-out behind ${t.name} is blocked by ${other.name} by ${mm(depth)} mm — ` +
        `a chair needs ${ctx.clearances.chairMovementMm} mm to move back.`,
        [other.id], mm(depth), HINTS.clearance_chair));
    }
  }
  return out;
}

/* ---- drawer / cabinet opening -------------------------------------------- */

/**
 * A pedestal that cannot be pulled open is a pedestal the customer will complain about on site.
 * Unlike the chair check, the cabin WALLS count here: a drawer that opens into a wall is broken
 * by definition, and no other rule measures it.
 */
function drawerClearance(t: CabinTable, a: Snap, ctx: CollisionContext): TableIssue[] {
  if (!a.openings.length) return [];
  const { lengthMm: L, widthMm: W } = cabinSizeMm(ctx.config);
  const boxes = obstacleBoxes(ctx);
  const out: TableIssue[] = [];

  for (const acc of a.openings) {
    // How much of the strip lies beyond a wall — capped at the clearance itself, since "blocked by
    // 650 mm of a 600 mm clearance" is not a sentence. Fully blocked is fully blocked.
    const outside = Math.min(
      Math.max(-acc.box.minX, -acc.box.minY, acc.box.maxX - L, acc.box.maxY - W),
      ctx.clearances.drawerOpeningMm,
    );
    if (outside > 0.5) {
      out.push(issue("clearance_drawer", "warning", t,
        `The ${acc.label} on ${t.name} cannot open — a cabin wall blocks its ` +
        `${ctx.clearances.drawerOpeningMm} mm opening clearance by ${mm(outside)} mm.`,
        ["cabin"], mm(outside), HINTS.clearance_drawer));
      continue; // one blocker per accessory is enough to act on
    }

    let blocked = false;
    for (let i = 0; i < ctx.obstacles.length && !blocked; i++) {
      const o = ctx.obstacles[i];
      if (!o.hard || o.fromHeightMm != null) continue;
      if (!boxesHit(acc.box, boxes[i])) continue;
      if (!polysOverlap(acc.zone, o.poly)) continue;
      blocked = true;
      out.push(issue("clearance_drawer", "warning", t,
        `The ${acc.label} on ${t.name} cannot open — the ${o.label} blocks its ` +
        `${ctx.clearances.drawerOpeningMm} mm opening clearance by ${mm(overlapDepth(acc.zone, o.poly))} mm.`,
        [o.id], mm(overlapDepth(acc.zone, o.poly)), HINTS.clearance_drawer));
    }
    if (blocked) continue;

    for (const other of ctx.tables) {
      if (other.id === t.id) continue;
      const b = snap(other, ctx.clearances);
      if (!boxesHit(acc.box, b.box)) continue;
      let depth = 0;
      for (const q of b.occ) {
        if (polysOverlap(acc.zone, q)) depth = Math.max(depth, overlapDepth(acc.zone, q));
      }
      if (depth <= 0) continue;
      out.push(issue("clearance_drawer", "warning", t,
        `The ${acc.label} on ${t.name} cannot open — ${other.name} blocks its ` +
        `${ctx.clearances.drawerOpeningMm} mm opening clearance by ${mm(depth)} mm.`,
        [other.id], mm(depth), HINTS.clearance_drawer));
      break;
    }
  }
  return out;
}

/* ==========================================================================
 * 5. Whole-design checks
 * ========================================================================== */

/**
 * Every issue in the design. Table-vs-table issues are raised from BOTH sides on purpose: the
 * drawing highlights per-table, and a user who clicks the table that isn't moving still has to be
 * told why it is red.
 */
export function checkAllTables(ctx: CollisionContext): TableIssue[] {
  const out: TableIssue[] = [];
  for (const t of ctx.tables) out.push(...checkTable(t, ctx));
  return out;
}

/** Every object that is part of a conflict — tables AND obstacles — so the plan can paint them
 *  all red, not just the table that happens to be selected (spec §14). */
export function conflictingIds(issues: TableIssue[]): Set<string> {
  const out = new Set<string>();
  for (const i of issues) {
    if (i.severity !== "error") continue;
    out.add(i.tableId);
    for (const r of i.refs) out.add(r);
  }
  return out;
}

/* ==========================================================================
 * 6. Auto-resolve
 * ========================================================================== */

const moveTo = (t: CabinTable, xMm: number, yMm: number): CabinTable =>
  ({ ...t, position: { ...t.position, xMm, yMm } });

const blocking = (t: CabinTable, ctx: CollisionContext): TableIssue[] =>
  checkTable(t, ctx).filter((i) => i.severity === "error");

/** Every hard thing this table must not touch, as AABBs — the input to the push loop. */
function hardBoxes(t: CabinTable, ctx: CollisionContext): Box[] {
  const boxes = obstacleBoxes(ctx);
  const out: Box[] = [];
  ctx.obstacles.forEach((o, i) => {
    if (!o.hard) return;
    if (o.fromHeightMm != null && t.dimensions.heightMm <= o.fromHeightMm) return;
    out.push(boxes[i]);
  });
  for (const other of ctx.tables) {
    if (other.id === t.id) continue;
    out.push(snap(other, ctx.clearances).box);
  }
  return out;
}

/**
 * Shove a table out of whatever it is sitting on, with the smallest move that works.
 *
 * The loop is the same least-penetration push the 2D plan already uses to keep fixtures out of a
 * doorway (doorClearance.avoidKeepouts) — which is why an auto-resolved table lands where the
 * plan would have put it. When the push cannot converge (a table wedged between two obstacles),
 * it falls back to a real search rather than jittering forever.
 *
 * A LOCKED table is never moved: locking it is the user saying "this one is where I want it, fix
 * the others" (spec §11).
 */
export function resolveOverlap(t: CabinTable, ctx: CollisionContext, maxTries = 12): CabinTable {
  if (t.position.locked) return t;
  const { lengthMm: L, widthMm: W } = cabinSizeMm(ctx.config);

  let cur = clampIntoCabin(t, L, W);
  if (!blocking(cur, ctx).length) return cur;

  const boxes = hardBoxes(t, ctx);
  for (let it = 0; it < maxTries; it++) {
    const s = snap(cur, ctx.clearances);
    const hw = (s.box.maxX - s.box.minX) / 2;
    const hh = (s.box.maxY - s.box.minY) / 2;
    let cx = (s.box.minX + s.box.maxX) / 2;
    let cy = (s.box.minY + s.box.maxY) / 2;

    let moved = false;
    for (const k of boxes) {
      const ovx = Math.min(cx + hw, k.maxX) - Math.max(cx - hw, k.minX);
      const ovy = Math.min(cy + hh, k.maxY) - Math.max(cy - hh, k.minY);
      if (ovx <= 0 || ovy <= 0) continue;
      if (ovx <= ovy) cx = cx < (k.minX + k.maxX) / 2 ? k.minX - hw : k.maxX + hw;
      else cy = cy < (k.minY + k.maxY) / 2 ? k.minY - hh : k.maxY + hh;
      moved = true;
    }
    if (!moved) break;

    // The occupancy centre is not the table's own centre (chairs sit on one side), so the push is
    // applied as a DELTA to the position rather than assigned to it.
    const dx = cx - (s.box.minX + s.box.maxX) / 2;
    const dy = cy - (s.box.minY + s.box.maxY) / 2;
    cur = clampIntoCabin(moveTo(cur, cur.position.xMm + dx, cur.position.yMm + dy), L, W);
    if (!blocking(cur, ctx).length) return cur;
  }

  const spot = findFreeSpot(cur, ctx);
  return clampIntoCabin(moveTo(cur, spot.xMm, spot.yMm), L, W);
}

/** The grid the free-spot search walks. 150 mm is fine enough that it finds the gap a person can
 *  see, and coarse enough that a 40 ft cabin is still only a few thousand candidates. */
const SEARCH_STEP_MM = 150;

/**
 * The nearest position where this table fits cleanly.
 *
 * Candidates are tested by TRANSLATING the table's already-computed occupancy rather than by
 * rebuilding its footprint — only the centre changes, and translation cannot change a shape. That
 * turns each candidate from a full geometry rebuild into a handful of additions, which is what
 * makes scanning the whole floor affordable (spec §29).
 */
export function findFreeSpot(t: CabinTable, ctx: CollisionContext): { xMm: number; yMm: number } {
  const { lengthMm: L, widthMm: W } = cabinSizeMm(ctx.config);
  const c = ctx.clearances;
  const a = snap(t, c);
  const x0 = t.position.xMm, y0 = t.position.yMm;

  const hw = (a.box.maxX - a.box.minX) / 2;
  const hh = (a.box.maxY - a.box.minY) / 2;
  // Where the occupancy centre sits relative to the table's own centre — constant under translation.
  const offX = (a.box.minX + a.box.maxX) / 2 - x0;
  const offY = (a.box.minY + a.box.maxY) / 2 - y0;

  const obs = obstacleBoxes(ctx);
  const hard: { poly: Pt[]; box: Box }[] = [];
  ctx.obstacles.forEach((o, i) => {
    if (!o.hard) return;
    if (o.fromHeightMm != null && a.heightMm <= o.fromHeightMm) return;
    hard.push({ poly: o.poly, box: obs[i] });
  });
  const others = ctx.tables.filter((o) => o.id !== t.id).map((o) => snap(o, c));

  const fits = (x: number, y: number): boolean => {
    const cx = x + offX, cy = y + offY;
    if (cx - hw < 0 || cy - hh < 0 || cx + hw > L || cy + hh > W) return false;
    const box: Box = { minX: cx - hw, minY: cy - hh, maxX: cx + hw, maxY: cy + hh };
    const dx = x - x0, dy = y - y0;
    const shift = (p: Pt[]): Pt[] => p.map((q) => ({ x: q.x + dx, y: q.y + dy }));

    for (const o of hard) {
      if (!boxesHit(box, o.box)) continue;
      for (const p of a.occ) if (polysOverlap(shift(p), o.poly)) return false;
    }
    for (const b of others) {
      if (!boxesHit(box, b.box)) continue;
      for (const p of a.occ) for (const q of b.occ) if (polysOverlap(shift(p), q)) return false;
    }
    return true;
  };

  if (fits(x0, y0)) return { xMm: x0, yMm: y0 };

  // Walk the whole floor on a grid, nearest candidate first, so the table lands where the user
  // dropped it if at all possible and only drifts as far as it must.
  const cands: { x: number; y: number; d: number }[] = [];
  const loX = hw - offX, hiX = L - hw - offX;
  const loY = hh - offY, hiY = W - hh - offY;
  for (let x = loX; x <= hiX + 1e-6; x += SEARCH_STEP_MM) {
    for (let y = loY; y <= hiY + 1e-6; y += SEARCH_STEP_MM) {
      cands.push({ x, y, d: (x - x0) ** 2 + (y - y0) ** 2 });
    }
  }
  cands.sort((p, q) => p.d - q.d);
  for (const cand of cands) if (fits(cand.x, cand.y)) return { xMm: cand.x, yMm: cand.y };

  // Nothing fits — hand back the clamped original so the caller still gets a legal position and
  // the checker can explain why it is red.
  const clamped = clampIntoCabin(t, L, W);
  return { xMm: clamped.position.xMm, yMm: clamped.position.yMm };
}
