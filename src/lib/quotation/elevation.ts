/**
 * ELEVATION geometry for the Labour Colony calculator (pure, framework-free).
 *
 * Every face (front / rear / left / right) is DERIVED from the same buildRoomFloorPlan()
 * output the 2D floor plan renders — one source of truth, so the plan and the elevations
 * can never disagree on dimensions or positions. All values are METRES; the React drawing
 * scales to pixels and formats labels through the selected length unit.
 *
 * Face conventions (plan is drawn north-up):
 *   front = viewed from the BOTTOM (south) side — plan x axis, unmirrored
 *   rear  = viewed from the TOP (north) side    — plan x axis, MIRRORED
 *   left  = viewed from the LEFT (west) side    — plan y axis, unmirrored
 *   right = viewed from the RIGHT (east) side   — plan y axis, MIRRORED
 *
 * WALLED BODY vs BLOCK — the distinction the old code got wrong:
 *   The plan's block spans [0, blockDM] on y, but that span INCLUDES the peripheral
 *   verandas (roomFloorPlan.ts: blockDM = topVer + topDepth + bottomDepth + botVer).
 *   Only [topBandY0, bottomBandY1] is SOLID WALL. On a side (gable-end) elevation the two
 *   veranda bands are OPEN walkway — deck slab + railing + posts, not wall. We derive the
 *   walled extent as the bounding box of the ROOMS on the elevation axis, so it is correct
 *   on every face without needing new exports from the plan engine.
 *
 * STRUCTURAL FRAME (the "blue steel frame" of the reference drawing):
 *   Column lines are derived from the plan — one at every room partition, one at each
 *   external wall face, one at each veranda outer edge — then any bay wider than
 *   `maxBaySpacingM` is auto-subdivided. Cross ("X") bracing fills the walled bays.
 *   Column/brace member sizes default to the project's own MemberSections, so the drawing
 *   matches the steel actually being quoted.
 *
 * What each face shows, all straight from the plan geometry per floor:
 *   • the walled room-block body + the open veranda decks either side of it (side faces)
 *   • the steel column grid + cross bracing + horizontal sandwich-panel courses
 *   • every WINDOW / DOOR whose wall faces the viewer, at its true position/width/height
 *   • veranda bands on that side, with SAFETY RAILING (posts) on every floor when railed
 *   • staircases on that side — side faces get the true stepped flight profile
 *   • plinth band, per-floor lines, roof profile (type / rise / overhang) and a dim chain
 */

import type { LabourColonyResult, RoomFloorPlanConfig, ElevationStructureConfig, MemberSections } from "./labourColony";
import { buildRoomFloorPlan, type RoomFloorPlanGeom, type FPBand } from "./roomFloorPlan";

export type ElevationFace = "front" | "rear" | "left" | "right";

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const round = (n: number, d = 3) => { const f = Math.pow(10, d); return Math.round((n + Number.EPSILON) * f) / f; };
/** The plan returns `bounds` raw but blockWM/blockDM rounded to 3 dp — never compare with 1e-6. */
const EPS = 1e-3;

export interface ElevOpening {
  kind: "door" | "window";
  x0: number;        // elevation-axis position of the opening's left edge (m)
  wM: number;        // opening width (m)
  sillM: number;     // bottom of the opening above the floor level (m); doors = 0
  hM: number;        // opening height (m)
  floor: number;     // 0-based floor index
  roomNo: number;
}

export interface ElevRail {
  x0: number; x1: number; // extent along the elevation axis (m)
  floor: number;          // railing drawn at this floor's level
}

export interface ElevStairShape {
  x0: number; wM: number;     // extent along the elevation axis (m)
  riseM: number;              // total rise of the flight (steps × riser)
  lowAtStart: boolean;        // flight's LOW end is at x0 (profile faces only)
  profile: boolean;           // true = true stepped profile (side faces); false = end silhouette
  steps: number; goingM: number; riserM: number; landingM: number;
  handrail: boolean;
  label: string;
}

/** One steel column line on the elevation. `xM` is its CENTRE. */
export interface ElevColumn {
  xM: number;
  widthM: number;
  /** wall = an external wall face · partition = between two rooms · veranda = a walkway post
   *  · intermediate = auto-inserted to honour the max column spacing */
  kind: "wall" | "partition" | "veranda" | "intermediate";
}

/** The panel bay between two adjacent column lines. */
export interface ElevBay {
  i: number;          // index into geom.bays
  x0: number; x1: number;
  walled: boolean;    // false for the open veranda bays on a side face
  wallIndex: number;  // 0-based index among the WALLED bays only (-1 when open)
}

/** A cross-brace drawn inside one bay on one floor. */
export interface ElevBrace {
  bay: number; floor: number;
  x0: number; x1: number;   // bay extent (m on the elevation axis)
  y0: number; y1: number;   // floor extent (m above ground)
  thickM: number;
  pattern: "x" | "single";
}

/** An open veranda / walkway deck seen end-on (side faces only). */
export interface ElevDeck {
  x0: number; x1: number;
  floor: number;
  railing: boolean;
}

export interface ElevationGeom {
  face: ElevationFace;
  x0: number; x1: number;           // DRAWING extent — building + eave overhang (viewBox)
  buildX0: number; buildX1: number; // BUILDING extent — block + stairs, NO roof overhang (overall dim)
  bodyX0: number; bodyX1: number;   // SOLID walled extent (excludes the open verandas)
  deckX0: number; deckX1: number; // full block extent (walled body + peripheral verandas)
  roofX0: number; roofX1: number; // roof extent (block + eave overhang)
  plinthM: number;
  floorHM: number;
  floors: number;
  bodyHM: number;                 // floors × floorH (above plinth)
  roof: { type: "gable" | "hip" | "flat" | "mono"; riseM: number; overhangM: number };
  totalHM: number;                // plinth + body + roof rise
  totalWidthM: number;            // x1 - x0 (must equal the plan's total on this axis)
  openings: ElevOpening[];
  rails: ElevRail[];
  stairs: ElevStairShape[];
  columns: ElevColumn[];
  bays: ElevBay[];
  braces: ElevBrace[];
  decks: ElevDeck[];
  courses: number[];              // panel-course line heights, m above ground
  dimChain: { x0: number; wM: number; kind: FPBand["kind"] }[];
  structure: Required<Omit<ElevationStructureConfig, "columnWidthM" | "braceThickM">> & {
    columnWidthM: number; braceThickM: number;
  };
}

/** Resolve the roof config with defaults. */
export function resolveRoof(fp: RoomFloorPlanConfig | undefined) {
  const r = fp?.roof ?? {};
  const type = r.type === "hip" || r.type === "flat" || r.type === "mono" ? r.type : "gable";
  const riseM = type === "flat" ? 0.15 : Math.max(0.2, r.riseM ?? 0.7);
  const overhangM = Math.max(0, r.overhangM ?? 0.3);
  return { type, riseM, overhangM } as ElevationGeom["roof"];
}

/**
 * Resolve the elevation's structural detailing. Column and brace member sizes fall back to the
 * project's OWN MemberSections (columns: RHS 100×50 → 0.10 m; bracing: ANGLE 50×50 → 0.05 m), so
 * the drawn frame matches the steel in the BOQ unless the user overrides it.
 */
export function resolveStructure(
  fp: RoomFloorPlanConfig | undefined,
  sections?: MemberSections,
): ElevationGeom["structure"] {
  const s = fp?.structure ?? {};
  const colFromSection = sections?.columns?.a ? sections.columns.a / 1000 : 0.1;
  const braceFromSection = sections?.bracing?.a ? sections.bracing.a / 1000 : 0.05;
  return {
    columns: s.columns ?? true,
    maxBaySpacingM: Math.max(0.6, s.maxBaySpacingM ?? 3),
    columnWidthM: clamp(s.columnWidthM && s.columnWidthM > 0 ? s.columnWidthM : colFromSection, 0.05, 0.6),
    bracePattern: s.bracePattern ?? "x",
    braceBays: s.braceBays ?? "all",
    braceFloors: s.braceFloors ?? "all",
    braceThickM: clamp(s.braceThickM && s.braceThickM > 0 ? s.braceThickM : braceFromSection, 0.02, 0.3),
    braceClearOpenings: s.braceClearOpenings ?? true,
    panelCourseM: Math.max(0, s.panelCourseM ?? 1),
    showDecks: s.showDecks ?? true,
    showDims: s.showDims ?? true,
  };
}

/** Default window sill: lintel ~0.3 m below the ceiling, sill ≥ 0.15 m. */
function sillFor(floorH: number, winH: number): number {
  return Math.max(0.15, floorH - 0.3 - winH);
}

/** Sorted, de-duplicated (to EPS) list of coordinates. */
function uniqSorted(vals: number[]): number[] {
  const out: number[] = [];
  for (const v of [...vals].sort((a, b) => a - b)) {
    if (!out.length || v - out[out.length - 1] > EPS) out.push(v);
  }
  return out;
}

export function buildElevation(
  result: LabourColonyResult,
  fp: RoomFloorPlanConfig | undefined,
  face: ElevationFace,
  opts?: { plinthM?: number },
): ElevationGeom {
  const cfg = result.config;
  const floors = Math.max(1, cfg.floors);
  const floorH = Math.max(2.0, cfg.roomHeight || 2.7);
  const plinthM = Math.max(0, opts?.plinthM ?? 0.45);
  const roof = resolveRoof(fp);
  const structure = resolveStructure(fp, result.sections);

  // Ground floor defines the envelope; per-floor geometry supplies each floor's openings.
  const g0 = buildRoomFloorPlan(result, fp, 0);
  const alongX = face === "front" || face === "rear";          // elevation axis = plan x?
  const span0 = alongX ? g0.bounds.minX : g0.bounds.minY;
  const span1 = alongX ? g0.bounds.maxX : g0.bounds.maxY;
  const mirrored = face === "rear" || face === "right";
  // plan coordinate → elevation axis (mirror a segment [a, a+len] around the span for rear/right)
  const T = (a: number, len = 0) => (mirrored ? span1 - (a + len) + span0 : a);

  /* ---------- walled body vs full block ----------
   * The BLOCK spans [0, blockSpan] and INCLUDES the peripheral verandas. Only the rooms are
   * solid wall, so derive the walled extent from the rooms' bounding box on this axis. */
  const blockSpan = alongX ? g0.blockWM : g0.blockDM;
  const roomLo = (r: RoomFloorPlanGeom["rooms"][number]) => (alongX ? r.x : r.y);
  const roomHi = (r: RoomFloorPlanGeom["rooms"][number]) => (alongX ? r.x + r.w : r.y + r.d);
  let wLo = Infinity, wHi = -Infinity;
  for (const r of g0.rooms) { wLo = Math.min(wLo, roomLo(r)); wHi = Math.max(wHi, roomHi(r)); }
  if (!Number.isFinite(wLo) || wHi - wLo < EPS) { wLo = 0; wHi = blockSpan; }   // no rooms → whole block

  const bodyX0 = T(wLo, wHi - wLo), bodyX1 = bodyX0 + (wHi - wLo);

  // The DECK (the slab the building stands on: block + every veranda it carries). Top/bottom
  // verandas already sit INSIDE blockDM, but a LEFT/RIGHT veranda sits OUTSIDE the block, so the
  // deck must be the union of the block and every veranda — otherwise the plinth and the roof stop
  // short of a side corridor and it renders as a blank hole.
  const verLo = (v: RoomFloorPlanGeom["verandas"][number]) => (alongX ? v.x : v.y);
  const verLen = (v: RoomFloorPlanGeom["verandas"][number]) => (alongX ? v.w : v.d);
  let dLo = 0, dHi = blockSpan;
  for (const v of g0.verandas) { dLo = Math.min(dLo, verLo(v)); dHi = Math.max(dHi, verLo(v) + verLen(v)); }
  const deckSpan = dHi - dLo;
  const deckX0 = T(dLo, deckSpan), deckX1 = deckX0 + deckSpan;
  const oh = roof.overhangM;
  const roofX0 = T(dLo - oh, deckSpan + 2 * oh), roofX1 = roofX0 + deckSpan + 2 * oh;

  /* ---------- openings: walk every floor's plan geometry ---------- */
  const viewerWall = face === "front" ? "bottom" : face === "rear" ? "top" : face; // left/right map 1:1
  const openings: ElevOpening[] = [];
  const geoms: RoomFloorPlanGeom[] = [];
  for (let f = 0; f < floors; f++) geoms.push(f === 0 ? g0 : buildRoomFloorPlan(result, fp, f));

  for (let f = 0; f < floors; f++) {
    const g = geoms[f];
    for (const room of g.rooms) {
      // WINDOW — always on the veranda-facing (external) wall: "top" for the top row, "bottom" for the bottom row.
      const winWall = room.into === 1 ? "top" : "bottom";
      if (winWall === viewerWall) {
        openings.push({
          kind: "window", floor: f, roomNo: room.no,
          x0: T(room.x + room.winFromLeftM, room.winWM), wM: room.winWM,
          sillM: sillFor(floorH, room.winHM), hM: Math.min(room.winHM, floorH - 0.3),
        });
      }
      // DOORS — any wall; visible when on the viewer's wall AND on the building boundary for side faces.
      for (const d of room.doors) {
        if (d.wall !== viewerWall) continue;
        if ((face === "left" && room.x > EPS) || (face === "right" && room.x + room.w < g.blockWM - EPS)) continue;
        if ((face === "front" && room.into !== -1 && g.hasBottom) || (face === "rear" && room.into !== 1 && g.hasBottom)) continue;
        const alongStart = d.wall === "top" || d.wall === "bottom" ? room.x : room.y;
        openings.push({
          kind: "door", floor: f, roomNo: room.no,
          x0: T(alongStart + d.posM, d.widthM), wM: d.widthM,
          sillM: 0, hM: Math.min(d.heightM, floorH - 0.15),
        });
      }
    }
  }

  /* ---------- verandas on this side → railing bands on every floor ---------- */
  const rails: ElevRail[] = [];
  const sideOfFace = face === "front" ? "bottom" : face === "rear" ? "top" : face;
  for (const v of g0.verandas) {
    if (v.side !== sideOfFace || !v.railing) continue;
    const a0 = alongX ? v.x : v.y;
    const len = alongX ? v.w : v.d;
    for (let f = 0; f < floors; f++) rails.push({ x0: T(a0, len), x1: T(a0, len) + len, floor: f });
  }

  /* ---------- open veranda DECKS seen end-on ----------
   * A veranda PERPENDICULAR to the face is seen end-on: it is not wall, it is a slab edge +
   * railing + posts. (A veranda that FACES the viewer is handled by `rails` above instead.)
   *   front/rear (axis x) → the left/right verandas are seen end-on
   *   left/right (axis y) → the top/bottom verandas are seen end-on
   * Each deck carries ITS OWN veranda's railing flag — never a some() over all of them. */
  const decks: ElevDeck[] = [];
  if (structure.showDecks) {
    const perpSides = alongX ? ["left", "right"] : ["top", "bottom"];
    for (const v of g0.verandas) {
      if (!perpSides.includes(v.side)) continue;
      const a0 = verLo(v), len = verLen(v);
      if (len <= EPS) continue;
      const e0 = T(a0, len);
      for (let f = 0; f < floors; f++) decks.push({ x0: e0, x1: e0 + len, floor: f, railing: v.railing });
    }
  }

  /* ---------- staircases ---------- */
  const stairs: ElevStairShape[] = [];
  for (const s of g0.stairs) {
    const riseM = (s.steps * s.riserMm) / 1000;
    if ((face === "left" || face === "right") && s.side === face) {
      // true stepped profile: the flight runs along plan y (vertical stair) → along this face's axis
      const a0 = s.y, len = s.d;
      const lowPlanEnd = s.entry === "left" ? a0 : a0 + len;              // entry end = low end
      const e0 = T(a0, len);
      const lowAtStart = mirrored ? !(lowPlanEnd === a0) : lowPlanEnd === a0;
      stairs.push({
        x0: e0, wM: len, riseM: Math.min(riseM, plinthM + floorH), lowAtStart,
        profile: true, steps: s.steps, goingM: s.goingM, riserM: s.riserMm / 1000,
        landingM: s.landingM, handrail: s.handrail, label: s.label,
      });
    } else if (alongX && (s.side === "left" || s.side === "right")) {
      // end silhouette on the long faces — true position + width from the plan
      const a0 = s.x, len = s.w;
      stairs.push({
        x0: T(a0, len), wM: len, riseM: Math.min(riseM, plinthM + floorH), lowAtStart: true,
        profile: false, steps: s.steps, goingM: s.goingM, riserM: s.riserMm / 1000,
        landingM: s.landingM, handrail: s.handrail, label: s.label,
      });
    } else if (!alongX && (s.side === "top" || s.side === "bottom")) {
      const a0 = s.y, len = s.d;
      stairs.push({
        x0: T(a0, len), wM: len, riseM: Math.min(riseM, plinthM + floorH), lowAtStart: true,
        profile: false, steps: s.steps, goingM: s.goingM, riserM: s.riserMm / 1000,
        landingM: s.landingM, handrail: s.handrail, label: s.label,
      });
    } else if (alongX && (s.side === "top" || s.side === "bottom") && s.side === sideOfFace) {
      // A top/bottom staircase is HORIZONTAL — its flight runs along plan x, which is this face's
      // own axis, so it lies IN the view plane and must show its true stepped profile.
      const a0 = s.x, len = s.w;
      const lowPlanEnd = s.entry === "left" ? a0 : a0 + len;      // entry end = low end
      const lowAtStart = mirrored ? lowPlanEnd !== a0 : lowPlanEnd === a0;
      stairs.push({
        x0: T(a0, len), wM: len, riseM: Math.min(riseM, plinthM + floorH), lowAtStart,
        profile: true, steps: s.steps, goingM: s.goingM, riserM: s.riserMm / 1000,
        landingM: s.landingM, handrail: s.handrail, label: s.label,
      });
    }
  }

  /* ---------- structural COLUMN GRID (derived from the plan) ----------
   * A column line at: every veranda outer edge (block edges), every external wall face, and
   * every room partition. Then subdivide any bay wider than maxBaySpacingM. */
  const kindOf = new Map<number, ElevColumn["kind"]>();
  const mark = (v: number, k: ElevColumn["kind"]) => {
    for (const [key] of kindOf) if (Math.abs(key - v) <= EPS) return;   // already marked
    kindOf.set(v, k);
  };
  mark(0, "veranda"); mark(blockSpan, "veranda");     // block/veranda outer edges
  mark(wLo, "wall"); mark(wHi, "wall");               // external wall faces
  for (const r of g0.rooms) { mark(roomLo(r), "partition"); mark(roomHi(r), "partition"); }

  const base = uniqSorted([...kindOf.keys()]);
  const kindAt = (v: number): ElevColumn["kind"] => {
    for (const [key, k] of kindOf) if (Math.abs(key - v) <= EPS) return k;
    return "intermediate";
  };
  // subdivide wide bays
  const lines: { v: number; kind: ElevColumn["kind"] }[] = [];
  for (let i = 0; i < base.length; i++) {
    lines.push({ v: base[i], kind: kindAt(base[i]) });
    if (i === base.length - 1) break;
    const a = base[i], b = base[i + 1], w = b - a;
    const n = Math.ceil(w / structure.maxBaySpacingM - EPS);   // sub-bays
    for (let k = 1; k < n; k++) lines.push({ v: a + (w * k) / n, kind: "intermediate" });
  }

  const columns: ElevColumn[] = structure.columns
    ? lines.map((l) => ({ xM: T(l.v), widthM: structure.columnWidthM, kind: l.kind }))
    : [];

  /* ---------- BAYS between adjacent column lines ---------- */
  const bays: ElevBay[] = [];
  let wallIdx = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    const a = lines[i].v, b = lines[i + 1].v;
    const mid = (a + b) / 2;
    const walled = mid > wLo - EPS && mid < wHi + EPS;
    // T() maps a segment; store already-transformed, left-to-right ordered
    const e0 = T(a, b - a);
    bays.push({ i: bays.length, x0: e0, x1: e0 + (b - a), walled, wallIndex: walled ? wallIdx++ : -1 });
  }
  const nWalled = wallIdx;

  /* ---------- CROSS BRACING in the walled bays ---------- */
  const braces: ElevBrace[] = [];
  if (structure.bracePattern !== "none" && nWalled > 0) {
    const bayWanted = (wi: number) =>
      structure.braceBays === "all" ? true
        : structure.braceBays === "ends" ? (wi === 0 || wi === nWalled - 1)
        : wi % 2 === 0;                                    // "alternate"
    const floorWanted = (f: number) =>
      structure.braceFloors === "all" ? true
        : structure.braceFloors === "ground" ? f === 0
        : f >= 1;                                          // "upper"

    for (const bay of bays) {
      if (!bay.walled || !bayWanted(bay.wallIndex)) continue;
      for (let f = 0; f < floors; f++) {
        if (!floorWanted(f)) continue;
        const y0 = plinthM + f * floorH, y1 = y0 + floorH;
        if (structure.braceClearOpenings) {
          const hit = openings.some((o) => {
            if (o.floor !== f) return false;
            const ox0 = Math.min(o.x0, o.x0 + o.wM), ox1 = Math.max(o.x0, o.x0 + o.wM);
            return Math.min(ox1, bay.x1) - Math.max(ox0, bay.x0) > EPS;   // ranges overlap
          });
          if (hit) continue;
        }
        braces.push({
          bay: bay.i, floor: f, x0: bay.x0, x1: bay.x1, y0, y1,
          thickM: structure.braceThickM,
          pattern: structure.bracePattern === "single" ? "single" : "x",
        });
      }
    }
  }

  /* ---------- horizontal sandwich-panel courses ---------- */
  const courses: number[] = [];
  if (structure.panelCourseM > 0.05) {
    const top = plinthM + floors * floorH;
    for (let y = plinthM + structure.panelCourseM; y < top - EPS; y += structure.panelCourseM) {
      courses.push(round(y));
    }
  }

  /* ---------- dimension chain (from the plan's own gap-free band chain) ---------- */
  const srcBands: FPBand[] = alongX ? g0.widthBands : g0.depthBands;
  const dimChain = srcBands.map((b) => ({ x0: T(b.start, b.len), wM: b.len, kind: b.kind }));
  dimChain.sort((a, b) => a.x0 - b.x0);

  /* ---------- extents ----------
   * buildX* = the BUILDING (what the overall dimension measures — block + stairs, NO roof
   * overhang). x* = the DRAWING extent, which must also contain the eaves so they never clip. */
  const stairLo = stairs.map((s) => Math.min(s.x0, s.x0 + s.wM));
  const stairHi = stairs.map((s) => Math.max(s.x0, s.x0 + s.wM));
  const buildX0 = round(Math.min(span0, bodyX0, deckX0, ...stairLo));
  const buildX1 = round(Math.max(span1, bodyX1, deckX1, ...stairHi));
  const x0 = round(Math.min(buildX0, roofX0));
  const x1 = round(Math.max(buildX1, roofX1));
  const bodyHM = floors * floorH;
  const totalHM = round(plinthM + bodyHM + roof.riseM);

  return {
    face, x0, x1, buildX0, buildX1,
    bodyX0: round(bodyX0), bodyX1: round(bodyX1),
    deckX0: round(deckX0), deckX1: round(deckX1),
    roofX0: round(roofX0), roofX1: round(roofX1),
    plinthM, floorHM: floorH, floors, bodyHM: round(bodyHM), roof,
    totalHM, totalWidthM: round(buildX1 - buildX0),
    openings, rails, stairs, columns, bays, braces, decks, courses, dimChain, structure,
  };
}
