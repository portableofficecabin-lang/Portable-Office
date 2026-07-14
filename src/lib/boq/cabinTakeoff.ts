/**
 * CABIN TAKE-OFF — CabinConfig ➜ Takeoff. Pure: no React, no DOM, no Supabase.
 *
 * WHY THIS FILE EXISTS, AND WHY IT IMPORTS THE DRAWING'S OWN MODULE:
 * The cabin calculator already renders a floor plan, four elevations and a roof. Those drawings ARE
 * the design. A BOQ derived from a second, private idea of the geometry drifts from them within a
 * sprint. So this producer reads the SAME constants and helpers the SVGs read (pricing.ts:
 * DOOR_SIZE, CONTAINER_DOOR_SIZE, openingWidthOn, sideSpanFt, normalizeRoomLengths) and mirrors the
 * elevation renderer's own rules:
 *
 *   · DOOR_WALL — the floor-plan side (top/bottom/left/right) → elevation wall (rear/front/left/right)
 *     map is copied verbatim from CabinCalculator.tsx, so a door drawn on the FRONT elevation is
 *     deducted from the FRONT wall's sheet and from no other wall.
 *   · The sloped roof rises 8 INCHES above the wall top and sheds to the two WIDTH sides (the ridge
 *     runs along the LENGTH) — the same 8"/12 rise the Elevations component draws. Containers and
 *     roofId "flat" are flat.
 *   · Lifting hooks: 4 above 100 sq.ft, else 2 — the same rule as the plan and the elevations.
 *
 * EVERY COUNT COMES FROM intermediateLines() / totalLines() AND THE NORMS. Nothing is a guess and
 * nothing is a constant in this file except real geometry (a stair riser is 0.18 m because a stair
 * riser is 0.18 m). Weights and rates are NEVER here — the engine reads them from the Material
 * Master. This file only says WHAT and HOW MANY.
 *
 * UNITS: the cabin stores decimal FEET; the take-off IR is METRES / SQUARE METRES. Feet are
 * converted at the edge with ft2m(), and the clamps replicate computeEstimate's exactly
 * (L 1..200, W 1..100, H 6..20) so the BOQ prices the same cabin the customer was quoted.
 *
 * MATERIAL SUBSTITUTION POLICY (read before adding a material):
 * The take-off emits the ROLE's default Material Master key (CABIN_MATERIAL_ROLES). Where the wizard
 * offers a choice the Master has a row for (PUF panel wall, vinyl floor, no insulation), the role
 * default is refined from the config. Where the wizard offers a choice the Master has NO row for
 * (a tube light, an exhaust fan, a glass door, Hitlon insulation…), the take-off emits the role's
 * default key AND pushes a note naming the substitution — it never invents a rate, and it never
 * silently swaps in a similar-looking one without saying so. Fix a substitution permanently by
 * adding the row to the Material Master and mapping it in BoqSettings.materialMap (engine.ts applies
 * `materialMap[item.materialKey]`, so the map is keyed by the emitted KEY, not by the role name).
 */

import {
  CONTAINER_DOOR_SIZE,
  DOOR_SIZE,
  doorSizeOf,
  windowSizeOf,
  ELECTRICAL_ITEMS,
  ENCLOSED_TOILET_IDS,
  PRODUCTS,
  VENTILATION_ITEMS,
  fixtureSizeOf,
  isPufPanel,
  isStorageProduct,
  isToiletCabin,
  normalizeRoomLengths,
  openingWidthOn,
  sideSpanFt,
  type CabinConfig,
} from "@/components/home/cabin-calculator/pricing";
import { tableWorldBbox } from "@/features/cabin-design/furniture/tables/tableGeometry";
import type { CabinTable } from "@/features/cabin-design/furniture/tables/tableSchema";
import { emitTableTakeoff } from "@/lib/boq/tableTakeoff";
import type {
  BoqNorms,
  BoqSection,
  CabinBoqOptions,
  CountTakeoff,
  FrameGeometry,
  SheetTakeoff,
  SteelTakeoff,
  Takeoff,
  TakeoffItem,
} from "@/lib/boq/types";
import { BOQ_SECTIONS, ceil, ft2m, intermediateLines, round, totalLines, wallKey } from "@/lib/boq/types";

/* ==========================================================================
 * 1. MATERIAL ROLES — role → default Material Master key
 * ==========================================================================
 *
 * A role is a STRUCTURAL JOB ("the thing that spans the wall horizontally"), not a section size.
 * The take-off talks in roles; the Master owns the sections, the weights and the rates; a template
 * re-points a role with one materialMap entry (ext-sheet's default key → puf-panel-50 turns an MS
 * cabin into a PUF cabin without this file knowing PUF exists).
 *
 * CAVEAT, stated once: materialMap is keyed by MATERIAL KEY (engine.ts), so two roles that share a
 * default key cannot be re-pointed independently — "base"/"stringer" (ismc-100x50) and
 * "truss"/"hook" (angle-50x50x5) are the two such pairs. Give them distinct rows in the Master if
 * you need to split them.
 */

export type CabinRole =
  /* frame */
  | "base"        // bottom + top perimeter frame (chassis channel)
  | "joist"       // floor cross members
  | "column"      // corner + intermediate posts
  | "stud"        // intermediate wall stiffeners
  | "rail"        // wall panel top/bottom rails, truss ties
  | "truss"       // sloped-roof rafters + ridge
  | "purlin"      // roof cross members
  | "stringer"    // staircase strings
  | "tread"       // staircase tread framing
  | "handrail"    // handrail posts + rails
  | "hook"        // lifting-hook lug
  /* coverings */
  | "ext-sheet"
  | "int-sheet"
  | "roof-sheet"
  | "ceiling-sheet"
  | "insulation"
  | "floor-board"
  | "floor-finish"
  | "chequered"
  /* openings */
  | "door"
  | "door-frame"
  | "window"
  | "window-frame"
  | "window-grill"
  /* fixings */
  | "bolt"
  | "screw"
  /* services */
  | "elec-light"
  | "elec-fan"
  | "elec-socket"
  | "elec-switch"
  | "elec-wire"
  | "elec-db"
  | "plumb-wc"
  | "plumb-basin"
  | "plumb-supply"
  | "plumb-soil"
  /* finishing */
  | "primer"
  | "paint";

/** Role → the key it takes off as, unless cfg or the template says otherwise. Seed keys only. */
export const CABIN_MATERIAL_ROLES: Record<CabinRole, string> = {
  base: "ismc-100x50",
  joist: "rhs-100x50x3",
  column: "shs-50x50x3",
  stud: "shs-40x40x2",
  rail: "shs-50x50x2",
  truss: "angle-50x50x5",
  purlin: "c-purlin-75x40",
  stringer: "ismc-100x50",
  tread: "angle-40x40x5",
  handrail: "pipe-od48x2",
  hook: "angle-50x50x5",

  "ext-sheet": "sheet-ext-gi-0.8",
  "int-sheet": "sheet-int-ppgi-0.5",
  "roof-sheet": "sheet-roof-0.5",
  "ceiling-sheet": "sheet-ceiling-0.5",
  insulation: "glasswool-50",
  "floor-board": "cementboard-18",
  "floor-finish": "vinyl-2mm",
  chequered: "chequered-plate-4",

  door: "door-ms-flush",
  "door-frame": "door-frame-40x40",
  window: "window-slider",
  "window-frame": "window-frame-40x40",
  "window-grill": "window-grill",

  bolt: "bolt-m12",
  screw: "selfdrill-screw",

  "elec-light": "elec-led-panel",
  "elec-fan": "elec-fan",
  "elec-socket": "elec-socket",
  "elec-switch": "elec-switch",
  "elec-wire": "elec-wire-1.5",
  "elec-db": "elec-db",

  "plumb-wc": "plumb-wc",
  "plumb-basin": "plumb-washbasin",
  "plumb-supply": "plumb-cpvc-25",
  "plumb-soil": "plumb-pvc-110",

  primer: "primer-red-oxide",
  paint: "enamel-paint",
};

/**
 * cfg → role override, where a wizard choice HAS a Master row:
 *   structureId "puf"        → the sandwich panel IS the external wall (ext-sheet → puf-panel-50),
 *                              it is inherently insulated (no insulation lines) and its interior
 *                              lining is optional (wallId "none" ⇒ no int-sheet lines).
 *   insulationId "none"      → no insulation lines at all.
 *   flooringId  "vinyl"      → floor-finish → vinyl-2mm (the only floor finish in the Master).
 * Everything else keeps the role default and is reported in notes[]. Interior FINISH selections
 * (MDF / PVC / SPC wall + ceiling boards, tiles, laminate) are priced by the cabin estimate as
 * ₹/sqft deltas; this BOQ takes off the STRUCTURAL coverings behind them.
 */
const ELEC_ROLE: Record<string, CabinRole> = {
  led: "elec-light",
  tube: "elec-light",
  fan: "elec-fan",
  exhaust: "elec-fan",
  ac: "elec-socket",
  plug: "elec-socket",
  "popup-socket": "elec-socket",
  "ext-light": "elec-light",
};

/** Electrical ids the Master has no row of its own for — each raises a substitution note. */
const ELEC_SUBSTITUTED = new Set(["tube", "exhaust", "ac", "popup-socket", "ext-light"]);

/* ==========================================================================
 * 2. GEOMETRY CONSTANTS — real dimensions, not prices
 * ========================================================================== */

/** The sloped roof rises 8 inches above the wall top (CabinCalculator.tsx: peak = (8/12) × scale). */
const ROOF_RISE_FT = 8 / 12;
/** Staircase: 180 mm riser, 250 mm going, 1.0 m clear flight — a standard steel service stair. */
const RISER_M = 0.18;
const GOING_M = 0.25;
const STAIR_WIDTH_M = 1.0;
/** A lifting hook is a 300 mm angle lug welded to the chassis at the corner. */
const HOOK_LUG_M = 0.3;
/** A toilet-cabin louver/ventilator is a 2 ft × 1 ft grilled opening. */
const LOUVER_W_FT = 2;
const LOUVER_H_FT = 1;
/** Nut-bolts per bolted joint: 4 at each corner post base and 4 at each lifting hook. */
const BOLTS_PER_JOINT = 4;
/** Member shorter than this is not a member — never emit it (validate.ts: zero_length_member). */
const MIN_CUT_M = 0.01;

type WallKey = "front" | "rear" | "left" | "right";
const WALLS: WallKey[] = ["front", "rear", "left", "right"];

/** Floor-plan opening side → elevation wall. VERBATIM from CabinCalculator.tsx (DOOR_WALL). */
const DOOR_WALL: Record<string, WallKey> = { bottom: "front", top: "rear", left: "left", right: "right" };

const DRAWING = new Map<BoqSection, string>(BOQ_SECTIONS.map((s) => [s.id, s.drawing]));
const drawingOf = (s: BoqSection): string => DRAWING.get(s) ?? "—";

const clamp = (n: number, min: number, max: number) =>
  Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min;

/** "3.05" — a dimension inside a formula string. */
const d = (n: number): string => String(round(n, 2));

/* CabinBoqOptions is declared in ./types (pricing.ts carries it on CabinConfig, and this file imports
 * CabinConfig from pricing.ts — declaring it here would make the two files import each other).
 * Re-exported so callers can keep importing it from the take-off they use it with. */
export type { CabinBoqOptions } from "./types";

/* ==========================================================================
 * 3. THE SINK — every item lands here, and zero-quantity items never do
 * ========================================================================== */

class Sink {
  readonly items: TakeoffItem[] = [];

  steel(section: BoqSection, slug: string, materialKey: string, description: string, formula: string,
        qty: number, cutLengthM: number, geomKey?: string): void {
    const n = Math.round(qty);
    if (n <= 0 || !(cutLengthM > MIN_CUT_M)) return;
    const item: SteelTakeoff = {
      kind: "steel",
      id: `${section}:${slug}`,
      section,
      materialKey,
      description,
      formula,
      drawingRef: drawingOf(section),
      qty: n,
      cutLengthM: round(cutLengthM, 4),
    };
    if (geomKey) item.geomKey = geomKey;
    this.items.push(item);
  }

  sheet(section: BoqSection, slug: string, materialKey: string, description: string, formula: string,
        grossAreaSqm: number, deductions: { label: string; areaSqm: number }[], faces: number,
        geomKey?: string): void {
    if (!(grossAreaSqm > 0)) return;
    /* A deduction can never exceed the covering it is cut out of (validate.ts: opening_exceeds_wall).
     * openingWidthOn() already caps an opening at 60% of its wall, so this only bites on absurd
     * configs — but "only on absurd configs" is exactly when a BOQ must not go negative. */
    let budget = grossAreaSqm;
    const kept: { label: string; areaSqm: number }[] = [];
    for (const cut of deductions) {
      const area = Math.min(Math.max(0, round(cut.areaSqm, 4)), budget);
      if (area <= 0) continue;
      kept.push({ label: cut.label, areaSqm: area });
      budget -= area;
    }
    const item: SheetTakeoff = {
      kind: "sheet",
      id: `${section}:${slug}`,
      section,
      materialKey,
      description,
      formula,
      drawingRef: drawingOf(section),
      grossAreaSqm: round(grossAreaSqm, 4),
      deductions: kept,
      faces,
    };
    if (geomKey) item.geomKey = geomKey;
    this.items.push(item);
  }

  /** `qty` may be fractional ONLY for per-litre consumables (primer / enamel); pieces are integers. */
  count(section: BoqSection, slug: string, materialKey: string, description: string, formula: string,
        qty: number, fractional = false): void {
    const n = fractional ? round(qty, 2) : Math.round(qty);
    if (!(n > 0)) return;
    const item: CountTakeoff = {
      kind: "count",
      id: `${section}:${slug}`,
      section,
      materialKey,
      description,
      formula,
      drawingRef: drawingOf(section),
      qty: n,
    };
    this.items.push(item);
  }
}

/* ==========================================================================
 * 4. THE STUD/POST GRID — one grid, two roles
 * ==========================================================================
 *
 * A wall is framed on ONE grid of vertical lines at the stud spacing. Some of those lines carry the
 * roof load and are POSTS; the rest are stiffeners and are STUDS. So the post lines are SNAPPED onto
 * the stud grid (the nearest free line to each ideal post position), which makes the drawn frame and
 * the counted frame the same frame:
 *
 *     posts = intermediateLines(span, postSpacing)
 *     studs = intermediateLines(span, studSpacing) − posts     ← the de-duplication, made geometric
 *
 * Without the snap the count and the drawing disagree the moment the two spacings are not multiples
 * of each other (a 6.10 m wall: post lines at 2.03/4.06 m, stud lines at 0.55 m centres — they never
 * coincide, and 8 studs would be drawn as 10).
 */
interface WallGrid {
  posts: number[];   // intermediate post lines, m from the wall's left edge
  studs: number[];   // intermediate stud lines, m from the wall's left edge
}

function wallGrid(spanM: number, postSpacingM: number, studSpacingM: number): WallGrid {
  const nStud = intermediateLines(spanM, studSpacingM);
  const nPost = intermediateLines(spanM, postSpacingM);
  if (nStud <= 0) return { posts: [], studs: [] };

  const studBays = nStud + 1;
  const grid = Array.from({ length: nStud }, (_, i) => round((spanM * (i + 1)) / studBays, 4));

  const postBays = nPost + 1;
  const taken = new Set<number>();
  for (let j = 1; j <= nPost; j++) {
    const ideal = (spanM * j) / postBays;
    let best = -1;
    let bestGap = Infinity;
    for (let i = 0; i < grid.length; i++) {
      if (taken.has(i)) continue;
      const gap = Math.abs(grid[i] - ideal);
      if (gap < bestGap) {
        bestGap = gap;
        best = i;
      }
    }
    if (best >= 0) taken.add(best);
  }

  return {
    posts: grid.filter((_, i) => taken.has(i)),
    studs: grid.filter((_, i) => !taken.has(i)),
  };
}

/** Evenly spaced intermediate lines across a span — floor joists, flat-roof purlins. */
const evenLines = (spanM: number, count: number): number[] =>
  Array.from({ length: Math.max(0, count) }, (_, i) => round((spanM * (i + 1)) / (count + 1), 4));

/** Lines INCLUDING both ends — truss frames along the length. */
const endToEndLines = (spanM: number, count: number): number[] =>
  count <= 1 ? [0] : Array.from({ length: count }, (_, i) => round((spanM * i) / (count - 1), 4));

/* ==========================================================================
 * 5. THE TAKE-OFF
 * ========================================================================== */

/** A group of doors that share a leaf size — one frame line per size, so the cut list is real. */
interface DoorGroup {
  slug: string;
  label: string;
  widthFt: number;
  heightFt: number;
  count: number;
}

/**
 * Metres of conduit from each table to the NEAREST WALL — the cable route the electrical take-off
 * bills (spec §21).
 *
 * Spec §21 is explicit that a wall-mounted socket "must stay on the wall and must not float inside
 * the drawing": the route therefore runs from the table's own edge to the closest wall FACE, and it
 * is measured from the same world bounding box the plan draws. A table that is dragged toward a wall
 * gets a shorter conduit run, and the BOQ follows the drawing without anyone re-entering a number.
 * The vertical drop from the table top up/down to the socket is added as a flat 1.2 m per run.
 */
const SOCKET_DROP_M = 1.2;

function tableCableRuns(cfg: CabinConfig, tables: CabinTable[]): Record<string, number> {
  const lengthMm = Math.max(1, cfg.length) * 304.8;
  const widthMm = Math.max(1, cfg.width) * 304.8;
  const runs: Record<string, number> = {};

  for (const t of tables) {
    const b = tableWorldBbox(t);
    const toLeft = Math.max(0, b.minX);
    const toRight = Math.max(0, lengthMm - b.maxX);
    const toRear = Math.max(0, b.minY);
    const toFront = Math.max(0, widthMm - b.maxY);
    const nearestMm = Math.min(toLeft, toRight, toRear, toFront);
    runs[t.id] = round(nearestMm / 1000 + SOCKET_DROP_M, 2);
  }
  return runs;
}

export function buildCabinTakeoff(cfg: CabinConfig, norms: BoqNorms, opts: CabinBoqOptions = {}): Takeoff {
  const s = new Sink();
  const notes: string[] = [];

  /* ---- 5.1 the cabin, clamped exactly as computeEstimate clamps it ---- */
  const L = clamp(cfg.length, 1, 200);
  const W = clamp(cfg.width, 1, 100);
  const H = clamp(cfg.height, 6, 20);
  const Lm = ft2m(L);
  const Wm = ft2m(W);
  const Hm = ft2m(H);

  const floors = Math.max(1, Math.round(opts.floors ?? 1));
  const product = PRODUCTS.find((p) => p.id === cfg.productId) ?? PRODUCTS[0];
  const container = isStorageProduct(cfg.productId);
  const puf = !container && isPufPanel(cfg.structureId);
  const toiletCabin = isToiletCabin(cfg.productId);
  /* The elevations render `sloped = roof !== "flat" && !containerDoor` — a container is always flat. */
  const sloped = cfg.roofId !== "flat" && !container;

  const roomLengths = normalizeRoomLengths(L, cfg.roomCount, cfg.roomLengths);
  const nPart = Math.max(0, roomLengths.length - 1);

  /* Coverings: the panel IS the wall on a PUF cabin, and it is inherently insulated. */
  const extKey = puf ? "puf-panel-50" : CABIN_MATERIAL_ROLES["ext-sheet"];
  const linedInside = !(puf && cfg.wallId === "none");
  const insulated = !puf && cfg.insulationId !== "none";
  const insulationKey = CABIN_MATERIAL_ROLES.insulation;

  /* ---- 5.2 openings, read from the SAME placements the drawings render ---- */
  const doorQty = clamp(Math.round(cfg.doorQty), 0, 50);
  const windowQty = toiletCabin ? 0 : clamp(Math.round(cfg.windowQty), 0, 100);

  /** Openings deducted from each elevation's covering, keyed by the wall DOOR_WALL maps them to. */
  const wallCuts: Record<WallKey, { label: string; areaSqm: number }[]> = {
    front: [], rear: [], left: [], right: [],
  };
  const doorGroups = new Map<string, DoorGroup>();
  const addDoors = (widthFt: number, heightFt: number, label: string, n: number) => {
    if (n <= 0) return;
    const w = round(widthFt, 2);
    const h = round(Math.min(heightFt, H), 2);
    const slug = `${w}x${h}`.replace(/\./g, "-");
    const g = doorGroups.get(slug) ?? { slug, label, widthFt: w, heightFt: h, count: 0 };
    g.count += n;
    doorGroups.set(slug, g);
  };

  if (container) {
    /* A container carries its ISO double door on the RIGHT (end) wall — the plan and the elevation
     * both draw it there regardless of doorPlacements (which is empty for a container). */
    const span = sideSpanFt("right", L, W);
    const wFt = openingWidthOn(span, CONTAINER_DOOR_SIZE.widthFt);
    const hFt = Math.min(CONTAINER_DOOR_SIZE.heightFt, H);
    wallCuts.right.push({ label: "Container door", areaSqm: ft2m(wFt) * ft2m(hFt) });
    addDoors(CONTAINER_DOOR_SIZE.widthFt, CONTAINER_DOOR_SIZE.heightFt, "container door", 1);
  } else {
    const placed = (cfg.doorPlacements ?? []).slice(0, doorQty);
    for (let i = 0; i < doorQty; i++) {
      /* A door with no placement row is on the FRONT wall, where buildDefaultConfig puts the main
       * door — never nowhere: an undeducted door is a wall sheet that was never cut. */
      const side = placed[i]?.side ?? "bottom";
      const wall = DOOR_WALL[side] ?? "front";
      const span = sideSpanFt(side, L, W);
      /* EACH door is cut at ITS OWN size. Cutting every door at the 3′×6′ standard would under-cut
       * the sheet for a 6′ double-leaf door and register it in the door schedule at the wrong size —
       * i.e. quote and manufacture the wrong door. addDoors() groups by size, so a mixed set now
       * yields one schedule row per distinct size, which is exactly what the shop floor needs. */
      const dz = doorSizeOf(placed[i]);
      const wFt = openingWidthOn(span, dz.widthFt);
      const hFt = Math.min(dz.heightFt, H);
      wallCuts[wall].push({ label: `Door ${i + 1}`, areaSqm: ft2m(wFt) * ft2m(hFt) });
      addDoors(dz.widthFt, dz.heightFt, "door", 1);
    }
  }

  /* Windows are grouped by SIZE exactly as doors are, so a cabin with three different windows yields
   * three schedule rows (frame jambs, head+sill, grill) at the right lengths — not one row at an
   * averaged-away size. */
  const winGroups = new Map<string, DoorGroup>();
  const winPlaced = (cfg.windowPlacements ?? []).slice(0, windowQty);
  for (let i = 0; i < windowQty; i++) {
    /* Unplaced windows sit on the REAR wall — buildDefaultConfig's default ("top"). */
    const side = winPlaced[i]?.side ?? "top";
    const wall = DOOR_WALL[side] ?? "rear";
    const span = sideSpanFt(side, L, W);
    const wz = windowSizeOf(winPlaced[i], cfg);   // EACH window at its own size
    const wFt = openingWidthOn(span, wz.widthFt);
    const hFt = Math.min(wz.heightFt, H);
    wallCuts[wall].push({ label: `Window ${i + 1}`, areaSqm: ft2m(wFt) * ft2m(hFt) });

    const gw = round(wz.widthFt, 2);
    const gh = round(Math.min(wz.heightFt, H), 2);
    const slug = `${gw}x${gh}`.replace(/\./g, "-");
    const g = winGroups.get(slug) ?? { slug, label: "window", widthFt: gw, heightFt: gh, count: 0 };
    g.count += 1;
    winGroups.set(slug, g);
  }

  /* A partition door in every partition (cfg.partitionDoor applies uniformly to all N−1). */
  const partitionDoors = cfg.partitionDoor ? nPart : 0;
  addDoors(DOOR_SIZE.widthFt, DOOR_SIZE.heightFt, "partition door", partitionDoors);

  /* Enclosed toilets are partitioned sub-rooms — each has its own door. */
  const toiletUnits = ENCLOSED_TOILET_IDS.reduce(
    (n, id) => n + clamp(Math.round(cfg.addons?.[id] ?? 0), 0, 200), 0,
  );
  addDoors(DOOR_SIZE.widthFt, DOOR_SIZE.heightFt, "toilet door", toiletUnits);

  const totalDoors = [...doorGroups.values()].reduce((n, g) => n + g.count, 0);

  /* ==========================================================================
   * FLOOR — 2D Floor Plan
   * ========================================================================== */
  const floorFactor = floors > 1 ? ` × ${floors} floors` : "";
  const nJoists = intermediateLines(Lm, norms.joistSpacingM);

  s.steel("floor", "base-frame-long", CABIN_MATERIAL_ROLES.base,
    "Bottom base frame — longitudinal",
    `2 members along the length × ${d(Lm)} m${floorFactor}`,
    2 * floors, Lm);
  s.steel("floor", "base-frame-cross", CABIN_MATERIAL_ROLES.base,
    "Bottom base frame — cross",
    `2 members across the width × ${d(Wm)} m${floorFactor}`,
    2 * floors, Wm);
  s.steel("floor", "joists", CABIN_MATERIAL_ROLES.joist,
    "Floor cross members (joists)",
    `intermediateLines(${d(Lm)} m ÷ ${norms.joistSpacingM} m) = ${nJoists} joists × ${d(Wm)} m span${floorFactor}`,
    nJoists * floors, Wm);
  s.sheet("floor", "board", CABIN_MATERIAL_ROLES["floor-board"],
    "Flooring board (deck)",
    `${d(Lm)} × ${d(Wm)} m plan area${floorFactor}`,
    Lm * Wm * floors, [], 1);
  s.sheet("floor", "finish", CABIN_MATERIAL_ROLES["floor-finish"],
    "Floor finish over the deck",
    `${d(Lm)} × ${d(Wm)} m plan area${floorFactor}`,
    Lm * Wm * floors, [], 1);

  /* ==========================================================================
   * ROOF — Roof Drawing
   * ========================================================================== */
  s.steel("roof", "top-frame-long", CABIN_MATERIAL_ROLES.base,
    "Top frame — longitudinal", `2 members along the length × ${d(Lm)} m`, 2, Lm);
  s.steel("roof", "top-frame-cross", CABIN_MATERIAL_ROLES.base,
    "Top frame — cross", `2 members across the width × ${d(Wm)} m`, 2, Wm);

  const riseM = ft2m(ROOF_RISE_FT);
  const rafterLenM = Math.sqrt((Wm / 2) ** 2 + riseM ** 2);
  let purlinLines: number[] = [];
  let roofSheetSqm: number;

  if (sloped) {
    const nTruss = totalLines(Lm, norms.trussSpacingM);
    const nPurlinPerSlope = totalLines(rafterLenM, norms.purlinSpacingM);
    purlinLines = endToEndLines(Lm, nTruss);
    roofSheetSqm = 2 * rafterLenM * Lm;

    s.steel("roof", "truss-rafter", CABIN_MATERIAL_ROLES.truss,
      "Roof truss rafter",
      `2 rafters per truss × totalLines(${d(Lm)} m ÷ ${norms.trussSpacingM} m) = ${nTruss} trusses; ` +
      `rafter = √((${d(Wm)}/2)² + ${d(riseM)}²) = ${d(rafterLenM)} m (8″ ridge rise over the width)`,
      2 * nTruss, rafterLenM);
    s.steel("roof", "truss-tie", CABIN_MATERIAL_ROLES.rail,
      "Roof truss bottom tie",
      `1 tie per truss × ${nTruss} trusses × ${d(Wm)} m span`,
      nTruss, Wm);
    s.steel("roof", "ridge", CABIN_MATERIAL_ROLES.truss,
      "Ridge member",
      `1 ridge along the length × ${d(Lm)} m (the ridge runs along the LENGTH and sheds to both width sides)`,
      1, Lm);
    s.steel("roof", "purlins", CABIN_MATERIAL_ROLES.purlin,
      "Roof cross members (purlins)",
      `2 slopes × totalLines(rafter ${d(rafterLenM)} m ÷ ${norms.purlinSpacingM} m) = ` +
      `${2 * nPurlinPerSlope} purlins × ${d(Lm)} m`,
      2 * nPurlinPerSlope, Lm);
    s.sheet("roof", "sheet", CABIN_MATERIAL_ROLES["roof-sheet"],
      "Roof sheet (sloped)",
      `2 slopes × rafter ${d(rafterLenM)} m × ${d(Lm)} m = ${d(roofSheetSqm)} m² — the TRUE sloped area, not the plan area`,
      roofSheetSqm, [], 1);
  } else {
    const nPurlin = intermediateLines(Lm, norms.purlinSpacingM);
    purlinLines = evenLines(Lm, nPurlin);
    roofSheetSqm = Lm * Wm;

    s.steel("roof", "purlins", CABIN_MATERIAL_ROLES.purlin,
      "Roof cross members (purlins)",
      `intermediateLines(${d(Lm)} m ÷ ${norms.purlinSpacingM} m) = ${nPurlin} purlins × ${d(Wm)} m span`,
      nPurlin, Wm);
    s.sheet("roof", "sheet", CABIN_MATERIAL_ROLES["roof-sheet"],
      "Roof sheet (flat)",
      `${d(Lm)} × ${d(Wm)} m plan area`,
      roofSheetSqm, [], 1);
  }

  const ceilingSqm = Lm * Wm;
  s.sheet("roof", "ceiling", CABIN_MATERIAL_ROLES["ceiling-sheet"],
    "Ceiling sheet (internal lining)",
    `${d(Lm)} × ${d(Wm)} m plan area — the ceiling is always the PLAN area, whatever the roof does above it`,
    ceilingSqm, [], 1);
  if (insulated) {
    s.sheet("roof", "insulation", insulationKey,
      "Roof / ceiling insulation",
      `Ceiling plan area ${d(ceilingSqm)} m²`,
      ceilingSqm, [], 1);
  }

  const nHooks = L * W > 100 ? 4 : 2;
  s.steel("roof", "lifting-hooks", CABIN_MATERIAL_ROLES.hook,
    "Lifting hook lugs",
    `${nHooks} hooks (L × W = ${d(L * W)} sq.ft ${L * W > 100 ? ">" : "≤"} 100 ⇒ ${nHooks}) × ${HOOK_LUG_M} m lug. ` +
    `Taken off as a steel run, not a count: the Master has no per-piece hook, and a counted line against a kg/m section would weigh and cost nothing`,
    nHooks, HOOK_LUG_M);

  /* ==========================================================================
   * ELEVATIONS — one pass per face
   * ==========================================================================
   * The 4 corner posts are shared by 2 faces each. Attributing ONE to each face counts them exactly
   * 4× per floor (validate.ts cross-checks 4 × modules × floors) and still shows a post on every
   * elevation's own breakup.
   */
  const framePosts: FrameGeometry["posts"] = [];

  for (const face of WALLS) {
    const lengthWall = face === "front" || face === "rear";
    const wallLenM = lengthWall ? Lm : Wm;
    const grossSqm = wallLenM * Hm * floors;
    const cuts = wallCuts[face];
    const grid = wallGrid(wallLenM, norms.postSpacingM, norms.studSpacingM);
    const nPost = grid.posts.length;
    const nStud = grid.studs.length;

    /* The wall this face IS, in plan coordinates (origin at the rear-left corner, x along the
     * length, y along the width) — the same canonical key colonyTakeoff uses for shared walls. */
    const gk = lengthWall
      ? wallKey("y", face === "rear" ? 0 : Wm, 0, Lm, 0)
      : wallKey("x", face === "left" ? 0 : Lm, 0, Wm, 0);

    framePosts.push({ face, xM: 0, kind: "corner" });
    framePosts.push({ face, xM: round(wallLenM, 4), kind: "corner" });
    for (const x of grid.posts) framePosts.push({ face, xM: x, kind: "post" });
    for (const x of grid.studs) framePosts.push({ face, xM: x, kind: "stud" });

    s.steel(face, "corner-post", CABIN_MATERIAL_ROLES.column,
      `Corner post — ${face} elevation`,
      `1 of the cabin's 4 corner posts attributed to this face (each corner is shared by 2 faces, ` +
      `so 1 per face = 4 in total)${floorFactor} × ${d(Hm)} m`,
      floors, Hm, gk);

    s.steel(face, "posts", CABIN_MATERIAL_ROLES.column,
      `Intermediate posts — ${face} elevation`,
      `intermediateLines(${d(wallLenM)} m ÷ ${norms.postSpacingM} m) = ${nPost} posts${floorFactor} × ${d(Hm)} m`,
      nPost * floors, Hm, gk);

    s.steel(face, "studs", CABIN_MATERIAL_ROLES.stud,
      `Wall stiffeners (studs) — ${face} elevation`,
      `intermediateLines(${d(wallLenM)} m ÷ ${norms.studSpacingM} m) − intermediateLines(${d(wallLenM)} m ÷ ` +
      `${norms.postSpacingM} m) = ${nStud + nPost} − ${nPost} = ${nStud} studs${floorFactor} × ${d(Hm)} m. ` +
      `The subtraction is a real de-duplication: a stud line that coincides with a post line IS a post, not a stud`,
      nStud * floors, Hm, gk);

    s.steel(face, "rails", CABIN_MATERIAL_ROLES.rail,
      `Wall framing rails — ${face} elevation`,
      `2 rails (top + bottom of the panel)${floorFactor} × ${d(wallLenM)} m`,
      2 * floors, wallLenM, gk);

    const cutText = cuts.length
      ? ` less ${cuts.length} opening(s) = ${d(cuts.reduce((a, c) => a + c.areaSqm, 0))} m²`
      : " (no openings on this wall)";

    s.sheet(face, "ext-sheet", extKey,
      `External wall sheet — ${face} elevation`,
      `${d(wallLenM)} m × ${d(Hm)} m${floorFactor} = ${d(grossSqm)} m² gross${cutText}. ` +
      `Openings are deducted from the WALL COVERING only — their framing is taken off in the openings section`,
      grossSqm, cuts, 1, gk);

    if (linedInside) {
      s.sheet(face, "int-sheet", CABIN_MATERIAL_ROLES["int-sheet"],
        `Internal wall lining sheet — ${face} elevation`,
        `Same gross wall ${d(grossSqm)} m² and the same opening deductions as the external skin${cutText}`,
        grossSqm, cuts, 1, gk);
    }
    if (insulated) {
      s.sheet(face, "insulation", insulationKey,
        `Wall insulation — ${face} elevation`,
        `Insulation fills the cavity between the two skins: ${d(grossSqm)} m² gross${cutText}`,
        grossSqm, cuts, 1, gk);
    }
  }

  /* ==========================================================================
   * OPENINGS — the framing the coverings did NOT get deducted for
   * ========================================================================== */
  const doorFrameKey = CABIN_MATERIAL_ROLES["door-frame"];
  for (const g of doorGroups.values()) {
    const wM = ft2m(g.widthFt);
    const hM = ft2m(g.heightFt);
    s.steel("openings", `door-frame-jamb:${g.slug}`, doorFrameKey,
      `Door frame jamb — ${g.widthFt}′ × ${g.heightFt}′ ${g.label}`,
      `2 jambs × ${g.count} door(s) = ${2 * g.count} × ${d(hM)} m. A door frame is 3-SIDED — 2 jambs + 1 head, no sill (the floor is the sill)`,
      2 * g.count, hM);
    s.steel("openings", `door-frame-head:${g.slug}`, doorFrameKey,
      `Door frame head — ${g.widthFt}′ × ${g.heightFt}′ ${g.label}`,
      `1 head × ${g.count} door(s) × ${d(wM)} m (no sill — a door is 3-sided)`,
      g.count, wM);
  }
  s.count("openings", "door-leaf", CABIN_MATERIAL_ROLES.door,
    "Door leaf",
    `${doorQty} external + ${partitionDoors} partition + ${toiletUnits} toilet door(s) = ${totalDoors}` +
    (container ? " (the container's ISO double door counts as 1 leaf)" : ""),
    totalDoors);

  for (const g of winGroups.values()) {
    const wM = ft2m(g.widthFt);
    const hM = ft2m(g.heightFt);
    s.steel("openings", `window-frame-jamb:${g.slug}`, CABIN_MATERIAL_ROLES["window-frame"],
      `Window frame jamb — ${g.widthFt}′ × ${g.heightFt}′`,
      `2 jambs × ${g.count} window(s) = ${2 * g.count} × ${d(hM)} m`,
      2 * g.count, hM);
    s.steel("openings", `window-frame-head-sill:${g.slug}`, CABIN_MATERIAL_ROLES["window-frame"],
      `Window frame head + sill — ${g.widthFt}′ × ${g.heightFt}′`,
      `head + sill = 2 × ${g.count} window(s) = ${2 * g.count} × ${d(wM)} m. A window IS 4-sided — a door is not: a window needs a sill, a door opens onto the floor`,
      2 * g.count, wM);
    s.count("openings", `window:${g.slug}`, CABIN_MATERIAL_ROLES.window,
      `Window — ${g.widthFt}′ × ${g.heightFt}′`,
      `${g.count} × ${g.widthFt}′ × ${g.heightFt}′`,
      g.count);
    s.sheet("openings", `window-grill:${g.slug}`, CABIN_MATERIAL_ROLES["window-grill"],
      `Window grill — ${g.widthFt}′ × ${g.heightFt}′`,
      `${g.count} × ${d(wM)} × ${d(hM)} m opening face`,
      g.count * wM * hM, [], 1);
  }

  /* ==========================================================================
   * PARTITIONS — 2D Floor Plan. Each partition spans the WIDTH, full height.
   * ========================================================================== */
  if (nPart > 0) {
    const nPartStud = intermediateLines(Wm, norms.studSpacingM);
    const partGross = nPart * Wm * Hm;
    const partDoorW = ft2m(openingWidthOn(W, DOOR_SIZE.widthFt));
    const partDoorH = ft2m(Math.min(DOOR_SIZE.heightFt, H));
    const partCuts = partitionDoors > 0
      ? [{ label: `${partitionDoors} partition door(s)`, areaSqm: partitionDoors * partDoorW * partDoorH }]
      : [];

    s.steel("partition", "end-posts", CABIN_MATERIAL_ROLES.column,
      "Partition end posts",
      `2 end posts × ${nPart} partition(s) = ${2 * nPart} × ${d(Hm)} m`,
      2 * nPart, Hm);
    s.steel("partition", "studs", CABIN_MATERIAL_ROLES.stud,
      "Partition studs",
      `${nPart} partition(s) × intermediateLines(${d(Wm)} m ÷ ${norms.studSpacingM} m) = ${nPart * nPartStud} × ${d(Hm)} m`,
      nPart * nPartStud, Hm);
    s.steel("partition", "rails", CABIN_MATERIAL_ROLES.rail,
      "Partition rails",
      `2 rails (top + bottom) × ${nPart} partition(s) = ${2 * nPart} × ${d(Wm)} m span`,
      2 * nPart, Wm);
    s.sheet("partition", "sheet", CABIN_MATERIAL_ROLES["int-sheet"],
      "Partition sheet (both faces)",
      `${nPart} × ${d(Wm)} × ${d(Hm)} m = ${d(partGross)} m² gross, sheeted on BOTH faces. ` +
      `The partition door is deducted ONCE, on a single face — the engine applies the ×2 faces after the deduction, ` +
      `so the door is correctly lost from both skins`,
      partGross, partCuts, 2);
    if (insulated) {
      s.sheet("partition", "insulation", insulationKey,
        "Partition insulation",
        `${nPart} × ${d(Wm)} × ${d(Hm)} m = ${d(partGross)} m² (one insulation layer inside the partition, not two)`,
        partGross, partCuts, 1);
    }
  }

  /* ==========================================================================
   * STAIRCASE
   * ========================================================================== */
  const hasStair = (opts.staircase ?? false) || floors > 1;
  if (hasStair) {
    const steps = ceil(Hm / RISER_M);
    const treads = Math.max(1, steps - 1);
    const runM = treads * GOING_M;
    const flightM = Math.sqrt(runM ** 2 + Hm ** 2);
    const nRailPosts = 2 * (ceil(flightM / norms.handrailPostSpacingM) + 1);

    s.steel("staircase", "stringers", CABIN_MATERIAL_ROLES.stringer,
      "Staircase stringers",
      `2 strings × flight √(run ${d(runM)}² + rise ${d(Hm)}²) = ${d(flightM)} m ` +
      `(${steps} risers @ ${RISER_M} m, ${treads} treads @ ${GOING_M} m going)`,
      2, flightM);
    s.steel("staircase", "tread-framing", CABIN_MATERIAL_ROLES.tread,
      "Tread framing",
      `${treads} treads × ${STAIR_WIDTH_M} m flight width`,
      treads, STAIR_WIDTH_M);
    s.sheet("staircase", "treads", CABIN_MATERIAL_ROLES.chequered,
      "Chequered plate treads",
      `${treads} treads × ${STAIR_WIDTH_M} m × ${GOING_M} m going`,
      treads * STAIR_WIDTH_M * GOING_M, [], 1);
    s.steel("staircase", "handrail-posts", CABIN_MATERIAL_ROLES.handrail,
      "Staircase handrail posts",
      `2 sides × (ceil(${d(flightM)} m ÷ ${norms.handrailPostSpacingM} m) + 1) = ${nRailPosts} posts × ${norms.handrailHeightM} m`,
      nRailPosts, norms.handrailHeightM);
    s.steel("staircase", "handrail-rails", CABIN_MATERIAL_ROLES.handrail,
      "Staircase handrail rails",
      `2 sides × ${norms.handrailRails} rails = ${2 * norms.handrailRails} × the ${d(flightM)} m flight`,
      2 * norms.handrailRails, flightM);
  }

  /* ==========================================================================
   * VERANDA / WALKWAY
   * ========================================================================== */
  const verandaFt = Math.max(0, opts.verandaWidthFt ?? 0);
  const verandaSides: WallKey[] =
    verandaFt > 0 ? (opts.verandaSides?.length ? opts.verandaSides : ["front"]) : [];

  if (verandaFt > 0) {
    const depthM = ft2m(verandaFt);
    for (const side of verandaSides) {
      const lenM = side === "front" || side === "rear" ? Lm : Wm;
      const nVJoist = intermediateLines(lenM, norms.joistSpacingM);
      const nVPost = totalLines(lenM, norms.postSpacingM);

      s.steel("veranda", `beams:${side}`, CABIN_MATERIAL_ROLES.base,
        `Veranda beams — ${side}`,
        `2 beams × ${d(lenM)} m`, 2, lenM);
      s.steel("veranda", `joists:${side}`, CABIN_MATERIAL_ROLES.joist,
        `Veranda joists — ${side}`,
        `intermediateLines(${d(lenM)} m ÷ ${norms.joistSpacingM} m) = ${nVJoist} joists × ${d(depthM)} m depth`,
        nVJoist, depthM);
      s.steel("veranda", `posts:${side}`, CABIN_MATERIAL_ROLES.column,
        `Veranda posts — ${side}`,
        `totalLines(${d(lenM)} m ÷ ${norms.postSpacingM} m) = ${nVPost} posts (both ends included) × ${d(Hm)} m`,
        nVPost, Hm);
      s.sheet("veranda", `deck:${side}`, CABIN_MATERIAL_ROLES.chequered,
        `Chequered plate deck — ${side}`,
        `${d(lenM)} m × ${d(depthM)} m walkway`,
        lenM * depthM, [], 1);

      if (opts.handrail) {
        const nHrPosts = totalLines(lenM, norms.handrailPostSpacingM);
        s.steel("veranda", `handrail-posts:${side}`, CABIN_MATERIAL_ROLES.handrail,
          `Veranda handrail posts — ${side}`,
          `totalLines(${d(lenM)} m ÷ ${norms.handrailPostSpacingM} m) = ${nHrPosts} posts × ${norms.handrailHeightM} m`,
          nHrPosts, norms.handrailHeightM);
        s.steel("veranda", `handrail-rails:${side}`, CABIN_MATERIAL_ROLES.handrail,
          `Veranda handrail rails — ${side}`,
          `${norms.handrailRails} rails × ${d(lenM)} m run`,
          norms.handrailRails, lenM);
      }
    }
  }

  /* ==========================================================================
   * ELECTRICAL — Electrical Layout
   * ========================================================================== */
  let totalPoints = 0;
  const substituted: string[] = [];

  for (const e of ELECTRICAL_ITEMS) {
    const qty = clamp(Math.round(cfg.electrical?.[e.id] ?? 0), 0, 200);
    if (qty <= 0) continue;
    totalPoints += qty;

    const role = ELEC_ROLE[e.id] ?? "elec-socket";
    const key = CABIN_MATERIAL_ROLES[role];
    if (ELEC_SUBSTITUTED.has(e.id)) substituted.push(`${e.label} → "${key}"`);

    s.count("electrical", e.id, key, e.label, `${qty} × ${e.label} selected in the Electrical step`, qty);
  }

  const plugPoints = clamp(Math.round(cfg.electrical?.plug ?? 0), 0, 200);
  s.count("electrical", "switch-board", CABIN_MATERIAL_ROLES["elec-switch"],
    "Switch board (modular)",
    `1 board per plug point = ${plugPoints} (each plug point is a socket + switch module)`,
    plugPoints);

  if (totalPoints > 0) {
    /* CabinQuotation.calcBOM's own wire rule, in metres: (L + W + H) × 3 runs × points × 0.3. */
    const wireM = (Lm + Wm + Hm) * 3 * totalPoints * 0.3;
    s.steel("electrical", "wire", CABIN_MATERIAL_ROLES["elec-wire"],
      "Copper wire — lighting + power circuits",
      `(${d(Lm)} + ${d(Wm)} + ${d(Hm)} m) × 3 runs × ${totalPoints} points × 0.3 = ${d(wireM)} m`,
      1, wireM);
    s.count("electrical", "db", CABIN_MATERIAL_ROLES["elec-db"],
      "Distribution board",
      `1 DB per floor × ${floors}`,
      floors);
  }

  /* ==========================================================================
   * PLUMBING — the toilet fittings, their pipe runs and the enclosure that holds them
   * ========================================================================== */
  const qtyOf = (id: string) => clamp(Math.round(cfg.addons?.[id] ?? 0), 0, 200);
  const basins = qtyOf("wash-basin");
  const urinals = qtyOf("urinal");
  const wcs = toiletUnits;                 // one WC in every enclosed WC / washroom
  const soilFixtures = wcs + urinals;
  const wetFixtures = wcs + basins + urinals;

  if (wcs > 0) {
    s.count("plumbing", "wc", CABIN_MATERIAL_ROLES["plumb-wc"], "WC pan",
      `1 WC per enclosed toilet / washroom × ${wcs}`, wcs);
  }
  if (basins > 0) {
    s.count("plumbing", "basin", CABIN_MATERIAL_ROLES["plumb-basin"], "Wash basin",
      `${basins} × wash-basin add-on`, basins);
  }
  if (urinals > 0) {
    substituted.push(`Urinal → "${CABIN_MATERIAL_ROLES["plumb-wc"]}"`);
    s.count("plumbing", "urinal", CABIN_MATERIAL_ROLES["plumb-wc"], "Urinal",
      `${urinals} × urinal add-on`, urinals);
  }
  if (wetFixtures > 0) {
    /* One supply run and one waste run per fixture: a half-plan run to the stack plus a full-height
     * riser. Geometry, not a rate — tune it in the norms if your site standard differs. */
    const supplyM = Lm / 2 + Wm / 2 + Hm;
    s.steel("plumbing", "supply", CABIN_MATERIAL_ROLES["plumb-supply"],
      "CPVC supply pipe",
      `${wetFixtures} wet fixture(s) × (½ length ${d(Lm / 2)} + ½ width ${d(Wm / 2)} + riser ${d(Hm)}) = ${d(supplyM)} m each`,
      wetFixtures, supplyM);
  }
  if (soilFixtures > 0) {
    const soilM = Lm / 2 + Hm;
    s.steel("plumbing", "soil", CABIN_MATERIAL_ROLES["plumb-soil"],
      "PVC soil pipe",
      `${soilFixtures} soil fixture(s) × (½ length ${d(Lm / 2)} + drop ${d(Hm)}) = ${d(soilM)} m each`,
      soilFixtures, soilM);
  }

  /* The enclosed toilet is a partitioned sub-room in a corner: 2 of its 4 walls are cabin walls, so
   * only (width + depth) of wall is new. Its door is already in the openings section. */
  for (const id of ENCLOSED_TOILET_IDS) {
    const units = qtyOf(id);
    if (units <= 0) continue;
    const { wFt, dFt } = fixtureSizeOf(cfg, id);
    const exposedM = ft2m(wFt + dFt);
    const nEncStud = intermediateLines(exposedM, norms.studSpacingM);
    const encGross = units * exposedM * Hm;
    const encDoorSqm = units * ft2m(Math.min(DOOR_SIZE.widthFt, wFt)) * ft2m(Math.min(DOOR_SIZE.heightFt, H));

    s.steel("plumbing", `enclosure-posts:${id}`, CABIN_MATERIAL_ROLES.column,
      `Toilet enclosure posts — ${id}`,
      `3 free vertical members per unit (2 wall junctions + the internal angle) × ${units} unit(s) × ${d(Hm)} m`,
      3 * units, Hm);
    s.steel("plumbing", `enclosure-rails:${id}`, CABIN_MATERIAL_ROLES.rail,
      `Toilet enclosure rails — ${id}`,
      `2 rails (top + bottom) × ${units} unit(s) × exposed run (${wFt}′ + ${dFt}′) = ${d(exposedM)} m`,
      2 * units, exposedM);
    s.steel("plumbing", `enclosure-studs:${id}`, CABIN_MATERIAL_ROLES.stud,
      `Toilet enclosure studs — ${id}`,
      `${units} unit(s) × intermediateLines(${d(exposedM)} m ÷ ${norms.studSpacingM} m) = ${units * nEncStud} × ${d(Hm)} m`,
      units * nEncStud, Hm);
    s.sheet("plumbing", `enclosure-sheet:${id}`, CABIN_MATERIAL_ROLES["int-sheet"],
      `Toilet enclosure sheet — ${id}`,
      `${units} × exposed run ${d(exposedM)} m × ${d(Hm)} m, sheeted both faces, less the toilet door once per face`,
      encGross, [{ label: "Toilet door", areaSqm: encDoorSqm }], 2);
  }

  /* Ventilation (toilet cabins use it INSTEAD of windows). */
  for (const v of VENTILATION_ITEMS) {
    const qty = clamp(Math.round(cfg.ventilation?.[v.id] ?? 0), 0, 50);
    if (qty <= 0) continue;
    if (v.id === "louver") {
      const area = qty * ft2m(LOUVER_W_FT) * ft2m(LOUVER_H_FT);
      s.sheet("plumbing", "louver", CABIN_MATERIAL_ROLES["window-grill"],
        "Louver / ventilator (grilled opening)",
        `${qty} × ${LOUVER_W_FT}′ × ${LOUVER_H_FT}′ ventilator = ${d(area)} m² of grill`,
        area, [], 1);
    } else {
      substituted.push(`${v.label} (ventilation) → "${CABIN_MATERIAL_ROLES["elec-fan"]}"`);
      s.count("plumbing", `vent-${v.id}`, CABIN_MATERIAL_ROLES["elec-fan"], v.label,
        `${qty} × ${v.label} selected in the Ventilation step`, qty);
    }
  }

  /* ==========================================================================
   * FINISHING — the metric conversion of CabinQuotation's coverage rules
   * ========================================================================== */
  const paintedSqm = 2 * (Lm + Wm) * Hm * floors;
  const primerLtr = paintedSqm / 8;
  const enamelLtr = 2 * (paintedSqm / 6);

  s.count("finishing", "primer", CABIN_MATERIAL_ROLES.primer,
    "Red oxide primer — 1 coat",
    `${d(paintedSqm)} m² ÷ 8 m²/ltr = ${d(primerLtr)} ltr. (CabinQuotation quotes 80 sq.ft/ltr; 80 sq.ft = 7.43 m² ⇒ ~8 m²/ltr)`,
    primerLtr, true);
  s.count("finishing", "enamel", CABIN_MATERIAL_ROLES.paint,
    "Synthetic enamel — 2 coats",
    `2 coats × (${d(paintedSqm)} m² ÷ 6 m²/ltr) = ${d(enamelLtr)} ltr. (CabinQuotation quotes 60 sq.ft/ltr; 60 sq.ft = 5.57 m² ⇒ ~6 m²/ltr)`,
    enamelLtr, true);

  /* ==========================================================================
   * MISC — the bolted joints
   * ========================================================================== */
  const bolts = BOLTS_PER_JOINT * (4 * floors + nHooks);
  s.count("misc", "bolts", CABIN_MATERIAL_ROLES.bolt,
    "Nut-bolt assemblies",
    `${BOLTS_PER_JOINT} bolts per joint × (4 corner posts × ${floors} floor(s) + ${nHooks} lifting hooks) = ${bolts}`,
    bolts);

  /* ==========================================================================
   * FURNITURE — the parametric tables (Table Customisation Module, spec §22)
   *
   * The tables ride on the SAME CabinConfig the 2D plan and the elevations render from, and their
   * take-off reads its areas and perimeters from the SAME geometry module the SVG draws with
   * (tableGeometry.topAreaSqm / topPerimeterM). So the furniture BOQ cannot drift from the furniture
   * drawing — which is the whole point of a parametric system, and the one guarantee a flat-priced
   * add-on could never give.
   * ========================================================================== */
  const tables = cfg.tables ?? [];
  if (tables.length) {
    emitTableTakeoff(s, tables, norms, { cableRunM: tableCableRuns(cfg, tables) });
    notes.push(
      `${tables.length} parametric table(s) taken off into the FURNITURE section — board area and edge-band length are measured from the SAME polygons the 2D plan draws, so the furniture BOQ and the furniture drawing are the same geometry.`,
    );
  }

  /* ==========================================================================
   * NOTES — the assumptions, said out loud
   * ========================================================================== */
  notes.push("Stud lines coinciding with post lines are counted as posts, not studs — the wall is framed on ONE grid, and the post lines are snapped onto it, so the drawn frame and the priced frame are the same frame.");
  notes.push("Sloped roof sheet uses the true rafter length (2 × rafter × length), not the plan area. The ridge runs along the LENGTH and rises 8″ over the two width sides — the same rise the elevations draw.");
  notes.push("Openings are deducted from the wall COVERINGS only (external sheet, internal lining, insulation). Their framing — jambs, heads, sills — is taken off separately in the openings section, so nothing is lost twice.");
  notes.push("Doors and windows are deducted from the wall their floor-plan side maps to (bottom→front, top→rear, left→left, right→right) — the same map the elevations render with.");
  notes.push("A door frame is 3-sided (2 jambs + head); a window frame is 4-sided (2 jambs + head + sill).");
  notes.push("The 4 corner posts are attributed one per elevation, so each is counted once and every elevation's breakup still shows a post.");
  notes.push("Welding rod (2% of steel weight in the legacy BOM) is derived from WEIGHT, not from geometry — a take-off cannot produce it. Bill it as the per-kg fabrication charge, or add it as a manual item.");

  if (floors > 1) {
    notes.push(`${floors} floors: the elevation framing + cladding and the floor deck repeat per floor; the roof and the lifting hooks are taken off once.`);
  }
  if (container) {
    notes.push("Storage container: the shell is BOUGHT, not fabricated. The frame and sheet lines describe an equivalent envelope — disable the sections you do not fabricate, or start from the container template.");
  }
  if (puf) {
    notes.push("PUF panel structure: the sandwich panel IS the external wall (ext-sheet → puf-panel-50) and is inherently insulated, so no separate insulation is taken off." +
      (linedInside ? "" : " No interior lining was selected."));
  }
  if (!puf && cfg.insulationId === "hitlon") {
    substituted.push(`Hitlon insulation → "${insulationKey}"`);
  }
  if (cfg.doorTypeId === "glass") {
    substituted.push(`Glass / Aluminium / UPVC door → "${CABIN_MATERIAL_ROLES.door}"`);
  }
  if (windowQty > 0 && cfg.windowTypeId !== "sliding") {
    substituted.push(`Window type "${cfg.windowTypeId}" → "${CABIN_MATERIAL_ROLES.window}"`);
  }
  if (cfg.flooringId !== "vinyl") {
    substituted.push(`Floor finish "${cfg.flooringId}" → "${CABIN_MATERIAL_ROLES["floor-finish"]}"`);
  }
  if (substituted.length > 0) {
    notes.push(
      `The Material Master has no row of its own for: ${substituted.join(", ")}. ` +
      "Each is taken off against the nearest material it DOES have, and its rate is therefore that material's rate. " +
      "Add the real row to the Material Master and point the take-off at it with a BoqSettings.materialMap entry.",
    );
  }
  notes.push("Interior FINISH selections (MDF / PVC / SPC wall + ceiling boards, tiles, laminate) are priced by the cabin estimate as ₹/sqft deltas; this BOQ takes off the structural coverings behind them.");

  /* ==========================================================================
   * FRAME GEOMETRY — the exact members that were priced, ready to draw
   * ========================================================================== */
  const frame: FrameGeometry = {
    posts: framePosts,
    joists: evenLines(Lm, nJoists),
    /* On a FLAT roof these are the purlin lines. On a SLOPED roof the purlins run parallel to the
     * ridge (along the length) and cannot be indexed along it — the members that DO sit at positions
     * along the length are the trusses, so those are what an overlay must draw across the plan. */
    purlins: purlinLines,
  };

  return {
    meta: {
      source: "cabin",
      title: `${product.label} — ${round(L, 2)} × ${round(W, 2)} × ${round(H, 2)} ft`,
      lengthM: round(Lm, 3),
      widthM: round(Wm, 3),
      heightM: round(Hm, 3),
      floors,
      rooms: roomLengths.length,
      partitions: nPart,
      doors: totalDoors,
      windows: windowQty,
      staircases: hasStair ? 1 : 0,
      verandas: verandaSides.length,
      modules: 1,
      floorAreaSqm: round(Lm * Wm * floors, 3),
      roofType: sloped ? "Sloped (2-side)" : "Flat",
    },
    items: s.items,
    notes,
    frame,
  };
}
