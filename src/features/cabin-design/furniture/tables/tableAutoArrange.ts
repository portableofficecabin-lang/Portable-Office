/**
 * Table module — AUTO-ARRANGE (spec §16).
 *
 * "Fit N tables of type X into this cabin in pattern P." The answer is either a set of placed
 * tables, or a REFUSAL THAT TEACHES: the minimum cabin the request actually needs, what the cabin
 * has, the largest preset of that type that would fit, and the largest count that would fit
 * (spec §16 — "suggest the maximum number of tables that fit / a smaller table size").
 *
 * ONE GAP FORMULA, NO PER-PATTERN FUDGE. Every pattern is a stack of rows, and the gap between two
 * consecutive rows is always:
 *
 *      gap = (chair pull-out on the near row's facing edge)
 *          + (chair pull-out on the far row's facing edge)
 *          + (an aisle, unless the two tops are back-to-back on a shared spine)
 *
 * That single rule reproduces every pattern in ARRANGEMENT_PATTERNS from nothing but each row's
 * ROTATION — face-to-face rows put two chair zones in the gap, back-to-back rows put none and the
 * tops touch, same-facing rows put one. It also means the layout can never quietly under-report the
 * space it needs, which is the whole point: an arrangement that "fits" here must still fit when
 * tableCollision.ts checks it for real.
 *
 * WALL MARGINS come from ClearanceRules and are NOT added to the chair pull-out: `seatedTableFromWallMm`
 * (900 mm) already IS the pull-out zone against a wall, while `tableFromWallMm` (50 mm) is the
 * clearance behind a table nobody sits at. Adding both would double-count 900 mm on every edge.
 *
 * UNITS: millimetres. Cabin x = along the LENGTH, y = rear wall → front wall (tableSchema.ts).
 * Rotation is CLOCKWISE and a table at 0° seats its occupant on its +y (front) edge, so:
 *   0° → chairs toward the FRONT wall · 180° → toward the REAR wall
 * 270° → chairs toward +x (a table backed onto the LEFT wall)
 *  90° → chairs toward −x (a table backed onto the RIGHT wall)
 */

import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";

import { cabinSizeMm } from "./cabinObstacles";
import { buildContext, resolveOverlap, type CollisionContext } from "./tableCollision";
import { clampTable, createTable } from "./tableDefaults";
import {
  footprintSize,
  tableFootprint,
  tableOccupancyBbox,
  tableWorldBbox,
} from "./tableGeometry";
import { DEFAULT_CLEARANCES, type CabinTable, type ClearanceRules } from "./tableSchema";
import { ARRANGEMENT_PATTERNS, findTableType, type ArrangementPattern } from "./tableTypes";
import { formatMm } from "./tableUnits";

/* ==========================================================================
 * 1. Contract
 * ========================================================================== */

export interface AutoArrangeRequest {
  count: number;
  tableTypeId: string;
  presetId?: string;
  seatingCapacity?: number;
  /** Circulation aisle the customer asked for. Never allowed below the walking-passage rule. */
  minPassageMm: number;
  pattern: ArrangementPattern;
  config: CabinConfig;
  clearances?: ClearanceRules;
  /** Tables already in the cabin — never moved, always avoided. */
  existing: CabinTable[];
}

export interface AutoArrangeResult {
  fits: boolean;
  /** The newly created tables, positioned. EMPTY when `fits` is false — nothing is half-placed,
   *  so the caller can re-run with `suggestedCount` / `suggestedPresetId` and get a clean answer. */
  tables: CabinTable[];
  requiredLengthMm?: number;
  requiredWidthMm?: number;
  availableLengthMm?: number;
  availableWidthMm?: number;
  /** The biggest preset of this type that WOULD fit at the requested count. */
  suggestedPresetId?: string;
  /** The biggest count that WOULD fit at the requested size. 0 ⇒ not even one. */
  suggestedCount?: number;
  message: string;
}

/* ==========================================================================
 * 2. Rules
 * ========================================================================== */

/** Handling gap between two tables standing shoulder to shoulder in a row. */
const SIDE_GAP_MM = 150;

/**
 * The spine between two back-to-back tops. It is NOT zero for two reasons: the spine screen
 * (workstation.partitionThicknessMm, 40 mm by default) physically sits in it, and two tops laid
 * exactly edge-to-edge are a collision hazard — `rotatePt(p, 180)` carries sin(π) = 1.2e-16, so a
 * "touching" edge lands a fraction of a nanometre INSIDE its neighbour and `polysOverlap` (rightly)
 * calls that an overlap. 50 mm covers the screen and keeps the arithmetic honest.
 */
const SPINE_GAP_MM = 50;

/** A millimetre of float slack, so a table that needs exactly the cabin's width still fits. */
const EPS_MM = 1;

/* ==========================================================================
 * 3. Working types
 * ========================================================================== */

interface Slot {
  xMm: number;
  yMm: number;
  rotationDeg: number;
}

interface Layout {
  slots: Slot[];
  requiredLengthMm: number;
  requiredWidthMm: number;
}

/** The cabin + the clearance numbers, resolved once. */
interface Geo {
  cabinL: number;
  cabinW: number;
  /** Circulation aisle actually used = max(requested, the walking-passage rule). */
  aisle: number;
  /** Table-to-wall on an edge NOBODY sits at. */
  plainWall: number;
  /** Table-to-wall on an edge somebody DOES sit at — already includes the chair pull-out. */
  seatedWall: number;
}

/** The four edges of a table's own LOCAL frame. */
interface Edges {
  left: number;
  right: number;
  rear: number;
  front: number;
}

/**
 * One measured specimen of the requested table — MEASURED, not guessed.
 *
 * `zone` and `margin` are read from the footprint tableGeometry actually builds, so the arranger
 * reserves space for exactly what the plan draws: the chairs where `buildSeats` really puts them,
 * and the pedestal / side-storage / keyboard tray that hang off the top's bounding box. Deriving
 * them from a rule of thumb instead (e.g. "ends are seated when the top is ≥ 900 deep") is how an
 * auto-arranged layout ends up with an executive table's side storage buried in the next desk.
 */
interface Probe {
  /** Tabletop size (what the drawing labels). Accessories and chairs are NOT in here. */
  lengthMm: number;
  depthMm: number;
  /** Clearance to keep beyond each edge INSIDE the room: the chair pull-out on a seated edge, or
   *  whatever the drawing hangs off that edge — whichever is larger. */
  zone: Edges;
  /** Clearance to keep beyond each edge against a WALL: the ClearanceRules value for that edge, or
   *  what the drawing occupies plus the plain wall gap — whichever is larger. */
  margin: Edges;
  /** Gap between two of these standing shoulder to shoulder in a row. */
  xGapMm: number;
  /** Wall clearance at the two ENDS of a row of these (rotation-symmetric, so 180° cannot change it). */
  endMarginMm: number;
}

/** How many rows the pattern wants. `{ cols }` pins the row width explicitly (the grid patterns). */
type RowsMode = "one" | "two" | "auto" | { cols: number };
type Facing = "same" | "faceToFace" | "backToBack";
type Anchor = "rear" | "centre";

/* ==========================================================================
 * 4. Measuring the specimen
 * ========================================================================== */

/** Force a requested seating capacity onto a table. Types that seat nobody stay seating nobody. */
function withSeats(t: CabinTable, capacity?: number): CabinTable {
  if (!capacity || !Number.isFinite(capacity) || capacity <= 0) return t;
  if (findTableType(t.tableTypeId).seatingModel === "none") return t;

  const n = Math.round(capacity);
  const next: CabinTable = {
    ...t,
    seating: { ...t.seating, capacity: n, includeChairs: true },
  };
  // clampTable re-derives seating.capacity FROM these blocks, so they must move together.
  if (next.conference) next.conference = { ...next.conference, seats: n };
  if (next.workstation) next.workstation = { ...next.workstation, users: n };
  return clampTable(next);
}

/** A specimen table, exactly as it will be created — so what we measure is what gets placed. */
function specimen(req: AutoArrangeRequest, presetId?: string): CabinTable {
  return withSeats(
    createTable(req.tableTypeId, { presetId: presetId ?? req.presetId }),
    req.seatingCapacity,
  );
}

function buildProbe(t: CabinTable, clearances: ClearanceRules): Probe {
  /* A freshly-created table sits at (0,0), un-rotated and un-flipped, so `toWorld` is the identity
   * and these WORLD boxes ARE the table's local boxes. That is the whole trick: it lets us ask the
   * real geometry where the chairs and the storage ended up, instead of predicting it. */
  const top = tableWorldBbox(t);        // the tabletop only
  const occ = tableOccupancyBbox(t);    // + chairs + pedestals + side storage — what the plan draws

  /** How far the drawing hangs past each edge of the top. */
  const overhang: Edges = {
    left: Math.max(0, top.minX - occ.minX),
    right: Math.max(0, occ.maxX - top.maxX),
    rear: Math.max(0, top.minY - occ.minY),
    front: Math.max(0, occ.maxY - top.maxY),
  };

  /* Which edges a person actually sits at — straight from the seats tableGeometry generated.
   * A round table's seats are tagged "curve": they ring the whole top, so every edge is seated. */
  const seats = tableFootprint(t).seats;
  const sides = new Set(seats.map((s) => s.side));
  const allRound = sides.has("curve");
  const seated: Record<keyof Edges, boolean> = {
    left: allRound || sides.has("left"),
    right: allRound || sides.has("right"),
    rear: allRound || sides.has("rear"),
    front: allRound || sides.has("front"),
  };

  const pull = clearances.chairMovementMm;
  const edge = (k: keyof Edges) => ({
    // Inside the room: a seated edge needs its chair PULL-OUT; any edge needs its own overhang.
    zone: seated[k] ? Math.max(pull, overhang[k]) : overhang[k],
    // Against a wall: the ClearanceRules figure (which already contains the pull-out), or the
    // drawing's own overhang plus the plain wall gap — whichever is bigger.
    margin: Math.max(
      seated[k] ? clearances.seatedTableFromWallMm : clearances.tableFromWallMm,
      overhang[k] + clearances.tableFromWallMm,
    ),
  });

  const L = edge("left"), R = edge("right"), RE = edge("rear"), F = edge("front");
  const size = footprintSize(t); // the real outline the plan draws — L-arms and all

  return {
    lengthMm: size.lengthMm,
    depthMm: size.depthMm,
    zone: { left: L.zone, right: R.zone, rear: RE.zone, front: F.zone },
    margin: { left: L.margin, right: R.margin, rear: RE.margin, front: F.margin },
    // Two identical tables side by side: the right-hand zone of one meets the left-hand zone of
    // the next. 180° rotation swaps both, so this is the same number either way.
    xGapMm: Math.max(SIDE_GAP_MM, R.zone + L.zone),
    endMarginMm: Math.max(L.margin, R.margin),
  };
}

/* ==========================================================================
 * 5. Row maths
 * ========================================================================== */

const rowLen = (n: number, T: number, gap: number): number => (n <= 0 ? 0 : n * T + (n - 1) * gap);

/** How many of these fit end-to-end across the cabin length, inside the end margins. */
function perRowFit(p: Probe, geo: Geo): number {
  const avail = geo.cabinL - 2 * p.endMarginMm;
  if (avail < p.lengthMm) return 1; // none fit — report 1 so `required` honestly overshoots the cabin
  return Math.max(1, Math.floor((avail + p.xGapMm) / (p.lengthMm + p.xGapMm)));
}

/** Tables in each row. */
function rowCounts(count: number, mode: RowsMode, maxPerRow: number): number[] {
  let rows: number;
  let perRow: number;

  if (typeof mode === "object") {
    perRow = Math.max(1, mode.cols);
    rows = Math.ceil(count / perRow);
  } else if (mode === "one") {
    rows = 1;
    perRow = count;
  } else if (mode === "two") {
    rows = Math.min(2, count);
    perRow = Math.ceil(count / rows);
  } else {
    // "auto" — the widest row the cabin allows, which is also the shallowest stack of rows.
    perRow = Math.max(1, Math.min(maxPerRow, count));
    rows = Math.ceil(count / perRow);
  }

  const out: number[] = [];
  let left = count;
  for (let r = 0; r < rows && left > 0; r++) {
    const n = Math.min(perRow, left);
    out.push(n);
    left -= n;
  }
  return out;
}

const rotOfRow = (r: number, facing: Facing): number =>
  facing === "faceToFace" ? (r % 2 === 0 ? 0 : 180)
  : facing === "backToBack" ? (r % 2 === 0 ? 180 : 0)
  : 0;

/* A row turned 180° presents its LOCAL FRONT to the cabin's rear, and vice versa. These four
 * lookups are the only place rotation enters the row maths. */
const zoneRear = (rot: number, p: Probe): number => (rot === 180 ? p.zone.front : p.zone.rear);
const zoneFront = (rot: number, p: Probe): number => (rot === 180 ? p.zone.rear : p.zone.front);
const marginRear = (rot: number, p: Probe): number => (rot === 180 ? p.margin.front : p.margin.rear);
const marginFront = (rot: number, p: Probe): number => (rot === 180 ? p.margin.rear : p.margin.front);

/* ==========================================================================
 * 6. The row-stack layout — every pattern except along-wall and u-shaped
 * ========================================================================== */

function rowLayout(
  count: number,
  mode: RowsMode,
  facing: Facing,
  anchor: Anchor,
  p: Probe,
  geo: Geo,
): Layout {
  const { lengthMm: T, depthMm: D, xGapMm: xGap } = p;

  const counts = rowCounts(count, mode, perRowFit(p, geo));
  const rots = counts.map((_, r) => rotOfRow(r, facing));

  /* ---- the y stack ---------------------------------------------------------------------- */
  const centresY: number[] = [];
  let y = marginRear(rots[0], p);
  for (let r = 0; r < counts.length; r++) {
    centresY.push(y + D / 2);
    y += D;
    if (r === counts.length - 1) break;

    // THE gap rule: what row r hangs into the gap, what row r+1 hangs into it, and a walkway —
    // unless the two rows are the back-to-back pair that shares a spine partition.
    const spine = facing === "backToBack" && r % 2 === 0;
    y += zoneFront(rots[r], p) + zoneRear(rots[r + 1], p) + (spine ? SPINE_GAP_MM : geo.aisle);
  }
  const requiredWidthMm = y + marginFront(rots[rots.length - 1], p);
  const requiredLengthMm =
    Math.max(...counts.map((n) => rowLen(n, T, xGap))) + 2 * p.endMarginMm;

  /* ---- place ---------------------------------------------------------------------------- */
  const offsetY = anchor === "centre" ? Math.max(0, (geo.cabinW - requiredWidthMm) / 2) : 0;

  const slots: Slot[] = [];
  counts.forEach((n, r) => {
    const len = rowLen(n, T, xGap);
    const startX = Math.max(p.endMarginMm, (geo.cabinL - len) / 2);
    for (let i = 0; i < n; i++) {
      slots.push({
        xMm: startX + T / 2 + i * (T + xGap),
        yMm: centresY[r] + offsetY,
        rotationDeg: rots[r],
      });
    }
  });

  return { slots, requiredLengthMm, requiredWidthMm };
}

/**
 * A grid — widened until it fits. The request carries no rows × columns, so we start from the
 * SQUAREST grid and add columns until the stack of rows fits the cabin. This matters: 7 desks in a
 * 3 × 3 grid can be 6 m deep and get refused, while the 4 × 2 grid that the same cabin swallows
 * whole is one column wider. Refusing a request that a trivially different grid satisfies would be
 * a bug in the arranger, not an honest "it does not fit" (spec §16).
 */
function gridLayout(count: number, p: Probe, geo: Geo): Layout {
  const maxCols = perRowFit(p, geo);
  const squarest = Math.max(1, Math.min(maxCols, Math.ceil(Math.sqrt(count))));

  let first: Layout | null = null;
  for (let cols = squarest; cols <= Math.max(squarest, maxCols); cols++) {
    const l = rowLayout(count, { cols }, "same", "centre", p, geo);
    if (!first) first = l; // the squarest grid — the honest "required" figure if nothing fits
    if (fitsIn(l, geo, count)) return l;
  }
  return first as Layout;
}

/* ==========================================================================
 * 7. Perimeter layouts — along-wall and u-shaped
 * ========================================================================== */

/** A run of `n` TOPS laid out along the cabin LENGTH, centred, at a fixed y. */
function runX(slots: Slot[], n: number, cy: number, rot: number, p: Probe, geo: Geo): void {
  const len = rowLen(n, p.lengthMm, p.xGapMm);
  // Never inside the end margin — that margin is what keeps the end table's storage off the wall.
  const startX = Math.max(p.endMarginMm, (geo.cabinL - len) / 2);
  for (let i = 0; i < n; i++) {
    slots.push({ xMm: startX + p.lengthMm / 2 + i * (p.lengthMm + p.xGapMm), yMm: cy, rotationDeg: rot });
  }
}

/** A run of `n` TOPS laid out along the cabin WIDTH, centred in [lo, hi], at a fixed x.
 *  The tables are turned a quarter, so each one occupies `lengthMm` along y. `lo`/`hi` bound the
 *  TOPS — the caller has already inset them for whatever hangs off the run's ends. */
function runY(slots: Slot[], n: number, cx: number, lo: number, hi: number, rot: number, p: Probe): void {
  const len = rowLen(n, p.lengthMm, p.xGapMm);
  const startY = lo + Math.max(0, (hi - lo - len) / 2);
  for (let i = 0; i < n; i++) {
    slots.push({ xMm: cx, yMm: startY + p.lengthMm / 2 + i * (p.lengthMm + p.xGapMm), rotationDeg: rot });
  }
}

/** What hangs off the ENDS of a run (side storage, an end chair) — the run's tops must be inset by
 *  this much from anything the run is squeezed between. */
const endZone = (p: Probe): number => Math.max(p.zone.left, p.zone.right);

/** The corner bite a perimeter run takes: enough to clear the neighbouring run's chair zone. */
const cornerBite = (p: Probe): number => Math.max(p.xGapMm, p.zone.front + SIDE_GAP_MM);

/**
 * Tables hugging the perimeter, backs to the walls, occupants facing into the room.
 *
 * Every run is the table's REAR edge against its wall, so the wall clearance is always
 * `margin.rear` and the room-side clearance is always `zone.front` — a table turned to face the
 * room out of the left wall (270°) is the same table as one facing out of the rear wall (0°).
 */
function alongWallLayout(count: number, p: Probe, geo: Geo): Layout {
  const { lengthMm: T, depthMm: D, xGapMm: xGap } = p;
  const back = p.margin.rear;   // the table's back is against the wall
  const face = p.zone.front;    // what it needs in front of it — chair pull-out, or nothing
  const end = p.endMarginMm;
  const fit = (span: number) => (span < T ? 0 : Math.floor((span + xGap) / (T + xGap)));

  /* The side runs sit BETWEEN the rear and front runs: their tops start clear of those runs' chair
   * zones (the corner bite) and are inset again by whatever hangs off their own ends. */
  const corner = cornerBite(p);
  const endZ = endZone(p);
  const sideLo = back + D + corner + endZ;
  const sideHi = geo.cabinW - back - D - corner - endZ;

  const capTB = fit(geo.cabinL - 2 * end);
  const capLR = fit(sideHi - sideLo);

  const nRear = Math.min(count, capTB);
  const nFront = Math.min(count - nRear, capTB);
  const nLeft = Math.min(count - nRear - nFront, capLR);
  const nRight = Math.min(count - nRear - nFront - nLeft, capLR);
  const placed = nRear + nFront + nLeft + nRight;

  const slots: Slot[] = [];
  if (nRear) runX(slots, nRear, back + D / 2, 0, p, geo);                    // back to the rear wall
  if (nFront) runX(slots, nFront, geo.cabinW - back - D / 2, 180, p, geo);   // back to the front wall
  if (nLeft) runY(slots, nLeft, back + D / 2, sideLo, sideHi, 270, p);       // back to the left wall
  if (nRight) runY(slots, nRight, geo.cabinL - back - D / 2, sideLo, sideHi, 90, p);

  /* The width carries the rear + front runs (each: wall, top, chair zone) and one shared walkway
   * between them; and, when the side runs are used, their run length plus the corners it costs. */
  let requiredWidthMm = Math.max(
    (nRear ? back + D + face : 0) + (nFront ? back + D + face : 0) + (nRear || nFront ? geo.aisle : 0),
    nLeft || nRight
      ? 2 * (back + D + corner + endZ) + rowLen(Math.max(nLeft, nRight), T, xGap)
      : 0,
    back + D + face + geo.plainWall,
  );
  /* The length carries the longest length-wall run — and, when the side runs are used, their two
   * chair zones facing each other across the walkway. */
  let requiredLengthMm = Math.max(
    2 * end + rowLen(Math.max(nRear, nFront), T, xGap),
    nLeft || nRight ? 2 * (back + D + face) + geo.aisle : 0,
    2 * end + T,
  );

  if (placed < count) {
    // The overflow has to go on the two LENGTH walls — that is the axis the cabin must grow on.
    const over = count - placed;
    requiredLengthMm = Math.max(requiredLengthMm, geo.cabinL + Math.ceil(over / 2) * (T + xGap));
    requiredWidthMm = Math.max(requiredWidthMm, 2 * (back + D + face) + geo.aisle);
  }

  return { slots, requiredLengthMm, requiredWidthMm };
}

/** A base run on the rear wall with an arm down each side wall — occupants inside the U. */
function uShapeLayout(count: number, p: Probe, geo: Geo): Layout {
  const { lengthMm: T, depthMm: D, xGapMm: xGap } = p;
  const back = p.margin.rear;
  const face = p.zone.front;
  const end = p.endMarginMm;
  const fit = (span: number) => (span < T ? 0 : Math.floor((span + xGap) / (T + xGap)));

  const armBite = back + D + xGap;         // an arm's bite out of the cabin LENGTH (top + end gap)
  /* The arms' tops start below the base run's chair zone, inset by whatever hangs off their ends.
   * At the FRONT wall an arm presents its END, so the clearance there is the END margin, not the
   * rear one — using `back` is what let an executive table's side storage (which hangs 900 mm off
   * the top's end) run straight through the front wall. */
  const topsLo = back + D + cornerBite(p) + endZone(p);
  const topsHi = geo.cabinW - end;

  const capBase = fit(geo.cabinL - 2 * armBite);
  const capArm = fit(topsHi - topsLo);

  const nBase = Math.min(count, capBase);
  const rem = count - nBase;
  const nLeft = Math.min(Math.ceil(rem / 2), capArm);
  const nRight = Math.min(rem - nLeft, capArm);
  const placed = nBase + nLeft + nRight;

  const slots: Slot[] = [];
  if (nBase) {
    const lo = armBite;
    const hi = geo.cabinL - armBite;
    const len = rowLen(nBase, T, xGap);
    const startX = lo + Math.max(0, (hi - lo - len) / 2);
    for (let i = 0; i < nBase; i++) {
      slots.push({ xMm: startX + T / 2 + i * (T + xGap), yMm: back + D / 2, rotationDeg: 0 });
    }
  }
  if (nLeft) runY(slots, nLeft, back + D / 2, topsLo, topsHi, 270, p);
  if (nRight) runY(slots, nRight, geo.cabinL - back - D / 2, topsLo, topsHi, 90, p);

  const requiredLengthMm = Math.max(
    2 * armBite + rowLen(nBase, T, xGap),
    2 * (back + D + face) + geo.aisle, // the two arms' chairs face each other across the void
    2 * end + T,
  );
  let requiredWidthMm = Math.max(
    nLeft || nRight ? topsLo + rowLen(Math.max(nLeft, nRight), T, xGap) + end : 0,
    back + D + face + geo.aisle + geo.plainWall, // somebody sits at the base, somebody walks behind
  );
  if (placed < count) {
    const over = count - placed;
    requiredWidthMm = Math.max(requiredWidthMm, geo.cabinW + Math.ceil(over / 2) * (T + xGap));
  }

  return { slots, requiredLengthMm, requiredWidthMm };
}

/* ==========================================================================
 * 8. Pattern → layout  (every id in ARRANGEMENT_PATTERNS)
 * ========================================================================== */

function measure(pattern: ArrangementPattern, count: number, p: Probe, geo: Geo): Layout {
  switch (pattern) {
    /* Rows against the rear wall, occupants facing the room. */
    case "single-row":     return rowLayout(count, "one", "same", "rear", p, geo);
    /* Two rows facing the same way, a circulation aisle between them. */
    case "double-row":     return rowLayout(count, "two", "same", "centre", p, geo);
    /* Two rows seated toward each other — two chair zones + the aisle in the gap. */
    case "face-to-face":   return rowLayout(count, "two", "faceToFace", "centre", p, geo);
    /* Two rows sharing a spine partition, occupants facing OUT. */
    case "back-to-back":   return rowLayout(count, "two", "backToBack", "centre", p, geo);
    /* Rows all facing one end — the teaching wall is behind the front row. */
    case "classroom":      return rowLayout(count, "auto", "same", "rear", p, geo);
    /* A centred pod of as many rows as the count needs. */
    case "centre-aligned": return rowLayout(count, "auto", "same", "centre", p, geo);
    /* Chairs all round comes from the TABLE (a perimeter-seated type), not from the pattern —
     * so a conference table centred in the room reserves a chair zone on all four sides. */
    case "conference":     return rowLayout(count, "auto", "same", "centre", p, geo);
    /* A grid of tables, each with its own chair zone all round. */
    case "dining":         return gridLayout(count, p, geo);
    /* Rows × columns the customer chose — with none given, the squarest grid that fits. */
    case "custom-grid":    return gridLayout(count, p, geo);

    case "along-wall":     return alongWallLayout(count, p, geo);
    case "u-shaped":       return uShapeLayout(count, p, geo);

    default:               return rowLayout(count, "auto", "same", "centre", p, geo);
  }
}

const fitsIn = (l: Layout, geo: Geo, count: number): boolean =>
  l.slots.length >= count &&
  l.requiredLengthMm <= geo.cabinL + EPS_MM &&
  l.requiredWidthMm <= geo.cabinW + EPS_MM;

/* ==========================================================================
 * 9. Suggestions  (spec §16 — a refusal must say what WOULD work)
 * ========================================================================== */

/** The biggest preset of this type that fits at the requested count. */
function largestFittingPreset(
  req: AutoArrangeRequest,
  count: number,
  geo: Geo,
  clearances: ClearanceRules,
): string | undefined {
  const def = findTableType(req.tableTypeId);
  const tried = req.presetId ?? def.presets[0]?.id;

  let bestId: string | undefined;
  let bestArea = 0;
  for (const preset of def.presets) {
    if (preset.id === tried) continue;
    const probe = buildProbe(specimen(req, preset.id), clearances);
    if (!fitsIn(measure(req.pattern, count, probe, geo), geo, count)) continue;
    const area = probe.lengthMm * probe.depthMm;
    if (area > bestArea) {
      bestArea = area;
      bestId = preset.id;
    }
  }
  return bestId;
}

/** The biggest count that fits at the requested size. 0 ⇒ not even one table fits. */
function largestFittingCount(req: AutoArrangeRequest, count: number, probe: Probe, geo: Geo): number {
  for (let n = count - 1; n >= 1; n--) {
    if (fitsIn(measure(req.pattern, n, probe, geo), geo, n)) return n;
  }
  return 0;
}

/* ==========================================================================
 * 10. autoArrange
 * ========================================================================== */

const patternLabel = (id: ArrangementPattern): string =>
  ARRANGEMENT_PATTERNS.find((p) => p.id === id)?.label ?? id;

const M = (mm: number): string => formatMm(mm, "m");

export function autoArrange(req: AutoArrangeRequest): AutoArrangeResult {
  const clearances = req.clearances ?? DEFAULT_CLEARANCES;
  const cabin = cabinSizeMm(req.config);
  const def = findTableType(req.tableTypeId);
  const count = Math.max(0, Math.round(req.count));

  const available = {
    availableLengthMm: Math.round(cabin.lengthMm),
    availableWidthMm: Math.round(cabin.widthMm),
  };

  if (count < 1) {
    return {
      fits: true,
      tables: [],
      ...available,
      message: "Nothing to arrange — ask for at least one table.",
    };
  }
  if (!(cabin.lengthMm > 0) || !(cabin.widthMm > 0)) {
    return {
      fits: false,
      tables: [],
      ...available,
      message: "The cabin has no usable floor area, so no table can be placed in it.",
    };
  }

  const geo: Geo = {
    cabinL: cabin.lengthMm,
    cabinW: cabin.widthMm,
    // A passage narrower than the walking-passage rule is not a passage — the rule wins (spec §15).
    aisle: Math.max(req.minPassageMm || 0, clearances.walkingPassageMm),
    plainWall: clearances.tableFromWallMm,
    seatedWall: clearances.seatedTableFromWallMm,
  };

  const proto = specimen(req);
  const probe = buildProbe(proto, clearances);
  const size = `${Math.round(probe.lengthMm)} × ${Math.round(probe.depthMm)} mm`;
  const what = `${count} × ${def.label} (${size})`;
  // "the Along wall arrangement" — an article-free phrasing, because "a"/"an" cannot be picked
  // correctly for every label in ARRANGEMENT_PATTERNS.
  const how = `the ${patternLabel(req.pattern)} arrangement`;
  const layout = measure(req.pattern, count, probe, geo);

  const required = {
    requiredLengthMm: Math.round(layout.requiredLengthMm),
    requiredWidthMm: Math.round(layout.requiredWidthMm),
  };

  /* ---- it does not fit: refuse, and say what would ---------------------------------------- */
  if (!fitsIn(layout, geo, count)) {
    const shortL = layout.requiredLengthMm - geo.cabinL;
    const shortW = layout.requiredWidthMm - geo.cabinW;
    const short = [
      shortL > EPS_MM ? `${M(shortL)} on the length` : "",
      shortW > EPS_MM ? `${M(shortW)} on the width` : "",
    ].filter(Boolean).join(" and ");

    const suggestedCount = largestFittingCount(req, count, probe, geo);
    const suggestedPresetId = largestFittingPreset(req, count, geo, clearances);
    const suggestedPreset = def.presets.find((p) => p.id === suggestedPresetId);

    const advice = [
      suggestedCount > 0
        ? `The most that fit is ${suggestedCount} table${suggestedCount === 1 ? "" : "s"}.`
        : "Not even one fits at this size.",
      suggestedPreset ? `The largest size that fits ${count} is ${suggestedPreset.label}.` : "",
    ].filter(Boolean).join(" ");

    return {
      fits: false,
      tables: [],
      ...required,
      ...available,
      suggestedCount,
      suggestedPresetId,
      message:
        `${what} in ${how} needs a cabin of at least ${M(layout.requiredLengthMm)} × ` +
        `${M(layout.requiredWidthMm)} (length × width) including chair pull-out and a ` +
        `${M(geo.aisle)} passage, but this cabin is only ${M(geo.cabinL)} × ${M(geo.cabinW)}` +
        `${short ? ` — short by ${short}` : ""}. ${advice}`,
    };
  }

  /* ---- it fits: place, then shove each one clear of whatever is already there -------------
   * The fit test above sizes an EMPTY cabin. Existing tables, fixtures, partitions and door swings
   * are handled where they belong — by tableCollision's resolveOverlap, which is the same code the
   * drag-and-drop uses, so an auto-arranged table lands exactly where a dragged one would. */
  const baseCtx = buildContext(req.config, clearances);
  const placed: CabinTable[] = [];

  for (let i = 0; i < count; i++) {
    const slot = layout.slots[i];
    const born = createTable(req.tableTypeId, {
      presetId: req.presetId,
      xMm: slot.xMm,
      yMm: slot.yMm,
      existing: [...req.existing, ...placed], // names them "Executive Table 3", "… 4", …
    });

    const seated = withSeats(born, req.seatingCapacity);
    const oriented = clampTable({
      ...seated,
      position: { ...seated.position, rotationDeg: slot.rotationDeg },
    });

    const ctx: CollisionContext = { ...baseCtx, tables: [...req.existing, ...placed] };
    placed.push(resolveOverlap(oriented, ctx));
  }

  const avoided = req.existing.length
    ? " Existing tables, fixtures and door swings were avoided."
    : "";

  return {
    fits: true,
    tables: placed,
    ...required,
    ...available,
    message:
      `Placed ${what} in ${how}. It uses ${M(layout.requiredLengthMm)} × ` +
      `${M(layout.requiredWidthMm)} of the ${M(geo.cabinL)} × ${M(geo.cabinW)} available, ` +
      `with a ${M(geo.aisle)} passage and ${M(clearances.chairMovementMm)} of chair pull-out.` +
      avoided,
  };
}
