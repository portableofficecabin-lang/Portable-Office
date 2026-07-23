/**
 * LABOUR COLONY → TAKE-OFF. Pure: no React, no DOM, no Supabase.
 *
 * THE DRAWING IS THE BOQ. Every quantity here is read from the SAME geometry the drawings render —
 * buildRoomFloorPlan() for the plan, buildElevation() for the frame — so the BOQ cannot drift from
 * the drawing. Nothing is re-derived from a formula the drawing does not obey.
 *
 * WHY THIS FILE EXISTS (spec §6): the legacy engine multiplies a PER-MODULE perimeter by the module
 * count — labourColony.ts:679-698 computes `perim = 2*(L+W)`, `studCount = ceil(perim/spacing)`,
 * `wallLen = wallLenPerModule * modules`, `baseLen = baseLenPerModule * modules` — so every wall
 * between two adjoining rooms is bought TWICE, and with it every stud, base beam and rail on that
 * wall. Twenty rooms in two rows share ~18 party walls and one continuous spine. Here a wall segment
 * is canonicalised with wallKey() (millimetre-quantised, so two rooms derive the IDENTICAL key from
 * their own local geometry), a key owned by two rooms is emitted ONCE with `sharedBy: 2`, and the
 * same interval algebra removes the veranda edge beams that ARE the room block's base rails.
 *
 * FACE CONVENTION — from elevation.ts, not from intuition. The plan is drawn north-up with y
 * increasing DOWNWARD and `viewerWall = front → "bottom"`, so:
 *      front = MAX y   ·   rear = MIN y   ·   left = MIN x   ·   right = MAX x.
 *
 * NO WEIGHT AND NO RATE IS WRITTEN HERE (spec §1). An MsSection resolves to a Material Master KEY,
 * and the Master owns the kg/m. sectionWeightKgM() from labourColony.ts is deliberately NOT imported:
 * it computes kg/m from a density constant, which is precisely the guess this BOQ must never make.
 * An unmapped profile SYNTHESISES its key ("rhs-120x60x4") — not a fallback weight but a fallback
 * QUESTION: validate.ts raises `unknown_material`, prices the line at ₹0 / 0 kg, and names the row
 * the admin has to add.
 *
 * Units: METRES, SQUARE METRES, KILOGRAMS.
 */

import type { LabourColonyResult, MsSection, RoomWall } from "@/lib/quotation/labourColony";
import {
  buildRoomFloorPlan,
  type FPRoom,
  type FPVeranda,
  type RoomFloorPlanGeom,
} from "@/lib/quotation/roomFloorPlan";
import { buildElevation, resolveRoof, type ElevationGeom } from "@/lib/quotation/elevation";
import type {
  BoqNorms,
  BoqSection,
  CountTakeoff,
  FrameGeometry,
  SheetTakeoff,
  SteelTakeoff,
  Takeoff,
  TakeoffItem,
} from "@/lib/boq/types";
import { ceil, intermediateLines, round, totalLines, wallKey } from "@/lib/boq/types";

/* ==========================================================================
 * 0. HELPERS
 * ========================================================================== */

/** The plan rounds to 3 dp, so a millimetre is the finest distinction that survives it. */
const EPS = 1e-3;

/* ------------------------------------------------------------------ MS pipe frame module ------ *
 * ONE derivation of the floor pipe frame's setting-out, exported so the priced take-off, the 3D
 * model and the sheet-layout support lines can never disagree on where a tube run is. */

/** 50 × 50 SHS — the MS pipe frame member size (m). */
export const FLOOR_TUBE_SIZE_M = 0.05;
/** Tube run spacing across the deck — 4 ft, so every 8 ft sheet-end joint lands on a tube (m). */
export const FLOOR_TUBE_SPACING_M = 1.2192;
/**
 * The pipe frame's tube centrelines across the deck depth. Interior runs sit on EXACT sheet-module
 * multiples from the deck origin; only the two EDGE runs pull in half a tube so nothing overhangs
 * the body (those edges bear on the perimeter member anyway).
 */
export function floorTubeLineYs(y0: number, y1: number): number[] {
  const half = FLOOR_TUBE_SIZE_M / 2;
  const out: number[] = [y0 + half];
  for (let yk = y0 + FLOOR_TUBE_SPACING_M; yk < y1 - half - EPS; yk += FLOOR_TUBE_SPACING_M) out.push(yk);
  out.push(y1 - half);
  return out;
}

const mm = (v: number): number => Math.round(v * 1000);
const eq = (a: number, b: number): boolean => Math.abs(a - b) <= EPS;
const hyp = (dx: number, dy: number): number => Math.hypot(dx, dy);
const m2 = (v: number): number => round(v, 2);

/** "3" · "0.5" · "100" — a number as it appears inside a Material Master key. */
const nk = (v: number): string => String(round(v, 2));

/** Distinct, ascending, millimetre-tolerant. */
function uniq(vals: number[]): number[] {
  const out: number[] = [];
  for (const v of [...vals].sort((a, b) => a - b)) {
    if (!out.length || v - out[out.length - 1] > EPS) out.push(v);
  }
  return out;
}

type Rect = { x: number; y: number; w: number; d: number };

/**
 * Area of the UNION of a set of rectangles, coordinate-compressed: an overlapping veranda, or a
 * veranda that laps a room, is counted ONCE. A plain Σ(w × d) would silently inflate the deck.
 */
function unionAreaSqm(rects: Rect[]): number {
  const boxes = rects.filter((r) => r.w > EPS && r.d > EPS);
  if (!boxes.length) return 0;
  const xs = uniq([...boxes.map((r) => r.x), ...boxes.map((r) => r.x + r.w)]);
  const ys = uniq([...boxes.map((r) => r.y), ...boxes.map((r) => r.y + r.d)]);
  let area = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      const cy = (ys[j] + ys[j + 1]) / 2;
      if (boxes.some((r) => cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.d)) {
        area += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]);
      }
    }
  }
  return area;
}

/** [a, b] minus every interval in `covered` — the veranda-beam / wall-rail de-duplication. */
function subtractIntervals(a: number, b: number, covered: [number, number][]): [number, number][] {
  let free: [number, number][] = [[a, b]];
  for (const [c0, c1] of covered) {
    const next: [number, number][] = [];
    for (const [f0, f1] of free) {
      if (c1 <= f0 + EPS || c0 >= f1 - EPS) {
        next.push([f0, f1]);
        continue;
      }
      if (c0 > f0 + EPS) next.push([f0, Math.min(c0, f1)]);
      if (c1 < f1 - EPS) next.push([Math.max(c1, f0), f1]);
    }
    free = next;
  }
  return free.filter(([f0, f1]) => f1 - f0 > EPS);
}

/** Accumulate a quantity against a millimetre-quantised cut length. */
const bump = (map: Map<number, number>, cutM: number, qty: number): void => {
  if (cutM <= EPS || qty <= 0) return;
  const k = mm(cutM);
  map.set(k, (map.get(k) ?? 0) + qty);
};

/* ==========================================================================
 * 1. MS SECTION → MATERIAL MASTER KEY  (spec §1)
 * ========================================================================== */

/**
 * The profile the colony calculator quotes → the Material Master key that carries its kg/m and its ₹.
 *
 * The seeded keys match exactly (ismc-100x50, rhs-100x50x3, shs-50x50x3, shs-50x50x2,
 * c-purlin-75x40, angle-50x50x5). Any other profile synthesises the same-shaped key, so an
 * unpriceable section announces itself as `unknown_material` instead of quietly borrowing a weight.
 */
export function materialKeyForSection(s: MsSection): string {
  const b = s.b || s.a;
  switch (s.shape) {
    case "SHS":
      return `shs-${nk(s.a)}x${nk(s.a)}x${nk(s.thicknessMm)}`;
    case "RHS":
      return `rhs-${nk(s.a)}x${nk(b)}x${nk(s.thicknessMm)}`;
    case "ANGLE":
      return `angle-${nk(s.a)}x${nk(b)}x${nk(s.thicknessMm)}`;
    case "PIPE":
      return `pipe-od${nk(s.a)}x${nk(s.thicknessMm)}`;
    case "C":
      return `c-purlin-${nk(s.a)}x${nk(b)}`;
    case "ISMC":
      return `ismc-${nk(s.a)}x${nk(b)}`;
  }
}

/** Product keys that no config field selects. Keys, never weights — the Master still owns the kg. */
const HANDRAIL_KEY = "pipe-od48x2";
const PLATE_KEY = "chequered-plate-4";
const ROOF_SHEET_KEY = "sheet-roof-0.5";
const CEILING_KEY = "sheet-ceiling-0.5";
const VINYL_KEY = "vinyl-2mm";
const INSULATION_KEY = "glasswool-50";
const DOOR_LEAF_KEY = "door-ms-flush";
const DOOR_FRAME_KEY = "door-frame-40x40";
const WINDOW_KEY = "window-slider";
const WINDOW_FRAME_KEY = "window-frame-40x40";
const GRILL_KEY = "window-grill";

/* ==========================================================================
 * 2. WALL SEGMENTS — where the de-duplication happens  (spec §6)
 * ========================================================================== */

type Axis = "x" | "y";
type Face = Extract<BoqSection, "front" | "rear" | "left" | "right">;

const FACES: Face[] = ["front", "rear", "left", "right"];
const FACE_LABEL: Record<Face, string> = { front: "Front", rear: "Rear", left: "Left", right: "Right" };
const FACE_DRAWING: Record<Face, string> = {
  front: "Front Elevation",
  rear: "Rear Elevation",
  left: "Left Elevation",
  right: "Right Elevation",
};
const isFace = (s: BoqSection): s is Face => s === "front" || s === "rear" || s === "left" || s === "right";
const sectionLabel = (s: BoqSection): string => (isFace(s) ? FACE_LABEL[s] : "Internal");
const sectionDrawing = (s: BoqSection): string => (isFace(s) ? FACE_DRAWING[s] : "2D Floor Plan");

const PLAN = "2D Floor Plan";
const PLAN_ELEV = "Floor Plan + Elevation";
const OPENINGS_REF = "Elevations + Floor Plan";
const ROOF_REF = "Roof Drawing";

interface Opening {
  kind: "door" | "window";
  roomNo: number;
  floor: number;
  wM: number;
  hM: number;
  areaSqm: number;
}

interface Seg {
  key: string;
  axis: Axis;
  coord: number;
  a: number;
  b: number;
  lenM: number;
  floor: number;
  rooms: number[];
  external: boolean;
  face: Face | null;
  section: BoqSection;
  label: string;
  openings: Opening[];
}

const ROOM_WALLS: RoomWall[] = ["top", "bottom", "left", "right"];

/** The four edges of a room rectangle, in the plan's own coordinates. */
function edgeOf(r: FPRoom, wall: RoomWall): { axis: Axis; coord: number; a: number; b: number } {
  switch (wall) {
    case "top":
      return { axis: "y", coord: r.y, a: r.x, b: r.x + r.w };
    case "bottom":
      return { axis: "y", coord: r.y + r.d, a: r.x, b: r.x + r.w };
    case "left":
      return { axis: "x", coord: r.x, a: r.y, b: r.y + r.d };
    case "right":
      return { axis: "x", coord: r.x + r.w, a: r.y, b: r.y + r.d };
  }
}

function edgesOfVeranda(v: FPVeranda): { axis: Axis; coord: number; a: number; b: number }[] {
  return [
    { axis: "y", coord: v.y, a: v.x, b: v.x + v.w },
    { axis: "y", coord: v.y + v.d, a: v.x, b: v.x + v.w },
    { axis: "x", coord: v.x, a: v.y, b: v.y + v.d },
    { axis: "x", coord: v.x + v.w, a: v.y, b: v.y + v.d },
  ];
}

/* ==========================================================================
 * 3. TAKE-OFF
 * ========================================================================== */

export function buildColonyTakeoff(
  result: LabourColonyResult,
  norms: BoqNorms,
  opts?: { plinthM?: number },
): Takeoff {
  const cfg = result.config;
  const fp = cfg.floorPlan;
  const floors = Math.max(1, cfg.floors);
  const plinthM = Math.max(0, opts?.plinthM ?? 0.45);

  const elevations = {} as Record<Face, ElevationGeom>;
  for (const f of FACES) elevations[f] = buildElevation(result, fp, f, { plinthM });
  const floorHM = elevations.front.floorHM;
  const roof = resolveRoof(fp);

  const geoms: RoomFloorPlanGeom[] = [];
  for (let f = 0; f < floors; f++) geoms.push(buildRoomFloorPlan(result, fp, f));

  const items: TakeoffItem[] = [];
  const notes: string[] = [];

  const steel = (i: SteelTakeoff): void => {
    if (i.qty > 0 && i.cutLengthM > EPS) items.push(i);
  };
  const sheet = (i: SheetTakeoff): void => {
    if (i.grossAreaSqm > EPS) items.push(i);
  };
  const count = (i: CountTakeoff): void => {
    if (i.qty > 0) items.push(i);
  };

  /* Structural profiles → Master keys, resolved once. */
  const K = {
    base: materialKeyForSection(result.sections.baseFrame),
    column: materialKeyForSection(result.sections.columns),
    roofFrame: materialKeyForSection(result.sections.roofFrame),
    stud: materialKeyForSection(result.sections.wallStud),
    purlin: materialKeyForSection(result.sections.purlin),
    brace: materialKeyForSection(result.sections.bracing),
  };

  /* Covering keys — driven by the CONFIG, so a thickness change moves the KEY, not a weight. */
  const panelType = cfg.panelType;
  const panelThk = cfg.panelThicknessMm;
  const skinThk = cfg.panelSkinThicknessMm ?? 0.5;
  const ppgiThk = cfg.ppgiPartitionThicknessMm ?? 0.5;
  const ppgiFaces = Math.max(1, cfg.ppgiPartitionFaces ?? 2);
  const boardThk = cfg.cementBoardThicknessMm ?? 18;
  const partitionInPanel = (cfg.partitionMaterial ?? "ppgi") === "panel";

  /** A sandwich panel IS the wall: skin + core + skin. Only a bare GI skin needs a separate lining
   *  and a separate insulation layer behind it — adding them to a PUF wall bills the insulation twice. */
  const cladIsPanel = panelType !== "GI";
  const CLAD_KEY = cladIsPanel
    ? `${panelType.toLowerCase()}-panel-${nk(panelThk)}`
    : `sheet-ext-gi-${nk(skinThk)}`;
  const LINING_KEY = `sheet-int-ppgi-${nk(ppgiThk)}`;
  const PARTITION_SHEET_KEY = partitionInPanel ? CLAD_KEY : LINING_KEY;
  const BOARD_KEY = `cementboard-${nk(boardThk)}`;
  const BOLT_KEY = `bolt-${(cfg.boltSize ?? "M12").toLowerCase()}`;

  /* ---------------------------------------------------------------- 3.1 wall segments */

  const segs = new Map<string, Seg>();
  let roomEdges = 0;

  for (let f = 0; f < floors; f++) {
    const g = geoms[f];
    if (!g.rooms.length) continue;

    /* The WALLED body is the rooms' bounding box. The block spans [0, blockDM] but that INCLUDES the
     * peripheral verandas (roomFloorPlan.ts), so the block edge is NOT a wall line. elevation.ts
     * derives the walled extent exactly this way; deriving it any other way would clad a line the
     * elevation never draws. */
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const r of g.rooms) {
      minX = Math.min(minX, r.x); maxX = Math.max(maxX, r.x + r.w);
      minY = Math.min(minY, r.y); maxY = Math.max(maxY, r.y + r.d);
    }

    for (const r of g.rooms) {
      /* Every opening, tagged with the room wall it sits on. The window is always on the
       * veranda-facing wall (elevation.ts: into === 1 → "top"); a door can be on any wall, and the
       * ones on an internal wall are exactly the doors no elevation will ever show. */
      const opes: { wall: RoomWall; o: Opening }[] = [];
      const winWall: RoomWall = r.into === 1 ? "top" : "bottom";
      const winH = Math.min(r.winHM, floorHM - 0.3);
      if (r.winWM > EPS && winH > EPS) {
        opes.push({
          wall: winWall,
          o: { kind: "window", roomNo: r.no, floor: f, wM: r.winWM, hM: winH, areaSqm: r.winWM * winH },
        });
      }
      for (const d of r.doors) {
        const dh = Math.min(d.heightM, floorHM - 0.15);
        if (d.widthM <= EPS || dh <= EPS) continue;
        opes.push({
          wall: d.wall,
          o: { kind: "door", roomNo: r.no, floor: f, wM: d.widthM, hM: dh, areaSqm: d.widthM * dh },
        });
      }

      for (const wall of ROOM_WALLS) {
        const e = edgeOf(r, wall);
        const key = wallKey(e.axis, e.coord, e.a, e.b, f);
        roomEdges++;
        let seg = segs.get(key);
        if (!seg) {
          seg = {
            key,
            axis: e.axis,
            coord: e.coord,
            a: Math.min(e.a, e.b),
            b: Math.max(e.a, e.b),
            lenM: Math.abs(e.b - e.a),
            floor: f,
            rooms: [],
            external: false,
            face: null,
            section: "partition",
            label: "",
            openings: [],
          };
          segs.set(key, seg);
        }
        if (!seg.rooms.includes(r.no)) seg.rooms.push(r.no);
        for (const op of opes) if (op.wall === wall) seg.openings.push(op.o);
      }
    }

    /* ONE owner + on the walled boundary ⇒ external, and the face it is drawn on. One owner INSIDE
     * the boundary (a corridor wall, a notch left by a shorter room) is still a partition. */
    for (const seg of segs.values()) {
      if (seg.floor !== f || seg.rooms.length !== 1) continue;
      if (seg.axis === "y" && eq(seg.coord, maxY)) seg.face = "front";
      else if (seg.axis === "y" && eq(seg.coord, minY)) seg.face = "rear";
      else if (seg.axis === "x" && eq(seg.coord, minX)) seg.face = "left";
      else if (seg.axis === "x" && eq(seg.coord, maxX)) seg.face = "right";
      if (seg.face) {
        seg.external = true;
        seg.section = seg.face;
      }
    }
  }

  const allSegs = [...segs.values()].sort((p, q) => (p.key < q.key ? -1 : 1));
  const sharedSegs = allSegs.filter((s) => s.rooms.length > 1);
  const extSegs = allSegs.filter((s) => s.external);
  const partSegs = allSegs.filter((s) => !s.external);

  /* Readable, stable, DISTINCT labels: duplicate_calculation flags two same-length members with the
   * same description in the same section, and a colony is full of identical walls. */
  const seq: Record<string, number> = {};
  for (const s of allSegs) {
    const prefix = s.external && s.face ? `${FACE_LABEL[s.face]} W` : "Partition P";
    seq[prefix] = (seq[prefix] ?? 0) + 1;
    s.label = `${prefix}${seq[prefix]} · L${s.floor}`;
  }

  /* ---------------------------------------------------------------- 3.2 wall framing (per segment) */

  for (const s of allSegs) {
    const ref = sectionDrawing(s.section);
    const sharedBy = s.rooms.length > 1 ? s.rooms.length : undefined;
    const who = sharedBy ? ` (shared: rooms ${s.rooms.join("/")})` : "";

    steel({
      kind: "steel",
      id: `${s.section}:rail:${s.key}`,
      section: s.section,
      materialKey: K.stud,
      description: `${s.label} — top & bottom rail${who}`,
      formula: `2 rails × ${m2(s.lenM)} m wall`,
      drawingRef: ref,
      qty: 2,
      cutLengthM: round(s.lenM, 3),
      geomKey: s.key,
      sharedBy,
    });

    const studs = intermediateLines(s.lenM, norms.studSpacingM);
    steel({
      kind: "steel",
      id: `${s.section}:stud:${s.key}`,
      section: s.section,
      materialKey: K.stud,
      description: `${s.label} — wall studs${who}`,
      formula: `ceil(${m2(s.lenM)} m ÷ ${norms.studSpacingM} m) − 1 = ${studs} stud(s) × ${m2(floorHM)} m`,
      drawingRef: ref,
      qty: studs,
      cutLengthM: round(floorHM, 3),
      geomKey: s.key,
      sharedBy,
    });
  }

  /* ---------------------------------------------------------------- 3.3 external cladding (per face) */

  /* One skin per FACE, not per segment: cladding is bought and fixed as a continuous face, and the
   * face is exactly what validate.ts re-derives (perimeter × height × floors). */
  const faceGross: Record<Face, number> = { front: 0, rear: 0, left: 0, right: 0 };
  const faceDeduct: Record<Face, { label: string; areaSqm: number }[]> = {
    front: [], rear: [], left: [], right: [],
  };
  let extRunLen = 0;
  let extRunWid = 0;

  for (const s of extSegs) {
    if (!s.face) continue;
    faceGross[s.face] += s.lenM * floorHM;
    if (s.face === "front" || s.face === "rear") extRunLen += s.lenM;
    else extRunWid += s.lenM;
    for (const o of s.openings) {
      faceDeduct[s.face].push({
        label: `Room ${o.roomNo} ${o.kind} ${m2(o.wM)} × ${m2(o.hM)} m (L${o.floor})`,
        areaSqm: round(o.areaSqm, 3),
      });
    }
  }

  for (const face of FACES) {
    const gross = round(faceGross[face], 3);
    if (gross <= EPS) continue;
    const ded = faceDeduct[face];

    sheet({
      kind: "sheet",
      id: `${face}:cladding`,
      section: face,
      materialKey: CLAD_KEY,
      description: cladIsPanel
        ? `${panelType} sandwich panel ${panelThk} mm — ${FACE_LABEL[face]} elevation`
        : `External GI cladding ${skinThk} mm — ${FACE_LABEL[face]} elevation`,
      formula: `Σ wall runs × ${m2(floorHM)} m storey height = ${m2(gross)} m², less ${ded.length} opening(s)`,
      drawingRef: FACE_DRAWING[face],
      grossAreaSqm: gross,
      deductions: ded,
      faces: 1,
    });

    if (!cladIsPanel) {
      sheet({
        kind: "sheet",
        id: `${face}:lining`,
        section: face,
        materialKey: LINING_KEY,
        description: `Internal wall lining ${ppgiThk} mm PPGI — ${FACE_LABEL[face]} elevation`,
        formula: `Same net wall area as the external skin`,
        drawingRef: FACE_DRAWING[face],
        grossAreaSqm: gross,
        deductions: ded,
        faces: 1,
      });
      sheet({
        kind: "sheet",
        id: `${face}:insulation`,
        section: face,
        materialKey: INSULATION_KEY,
        description: `Wall insulation, glass wool — ${FACE_LABEL[face]} elevation`,
        formula: `Cavity between the external skin and the internal lining`,
        drawingRef: FACE_DRAWING[face],
        grossAreaSqm: gross,
        deductions: ded,
        faces: 1,
      });
    }
  }

  /* ---------------------------------------------------------------- 3.4 partition sheeting (per segment) */

  for (const s of partSegs) {
    const sharedBy = s.rooms.length > 1 ? s.rooms.length : undefined;
    const faces = partitionInPanel ? 1 : ppgiFaces;
    const ded = s.openings.map((o) => ({
      label: `Room ${o.roomNo} ${o.kind} ${m2(o.wM)} × ${m2(o.hM)} m`,
      areaSqm: round(o.areaSqm, 3),
    }));

    sheet({
      kind: "sheet",
      id: `partition:sheet:${s.key}`,
      section: "partition",
      materialKey: PARTITION_SHEET_KEY,
      description: `${s.label} — ${
        partitionInPanel ? `${panelType} panel ${panelThk} mm` : `${ppgiThk} mm PPGI, ${faces} face(s)`
      }${sharedBy ? ` (shared: rooms ${s.rooms.join("/")})` : ""}`,
      formula: `${m2(s.lenM)} m × ${m2(floorHM)} m${
        ded.length ? ` less ${ded.length} opening(s)` : ""
      }, × ${faces} face(s)`,
      drawingRef: PLAN,
      grossAreaSqm: round(s.lenM * floorHM, 3),
      deductions: ded,
      faces,
      geomKey: s.key,
      sharedBy,
    });
  }

  /* ---------------------------------------------------------------- 3.5 columns (the elevation's grid) */

  /* The BOQ counts the columns the elevation DRAWS. A column stands where an x column-line meets a
   * y column-line ON the boundary of a room or a veranda — anywhere else that intersection is a point
   * in mid-air. The grid (including its auto-subdivided bays) comes from the ground floor, exactly as
   * elevation.ts builds it: "Ground floor defines the envelope". */
  const xLines = uniq(elevations.front.columns.map((c) => c.xM));
  const yLines = uniq(elevations.left.columns.map((c) => c.xM));

  const colGroups = new Map<string, { section: BoqSection; corner: boolean; qty: number }>();
  let colPoints = 0;
  let cornerPoints = 0;

  for (let f = 0; f < floors; f++) {
    const g = geoms[f];
    const rects: Rect[] = [...g.rooms, ...g.verandas];
    if (!rects.length) continue;

    let dMinX = Infinity, dMaxX = -Infinity, dMinY = Infinity, dMaxY = -Infinity;
    for (const r of rects) {
      dMinX = Math.min(dMinX, r.x); dMaxX = Math.max(dMaxX, r.x + r.w);
      dMinY = Math.min(dMinY, r.y); dMaxY = Math.max(dMaxY, r.y + r.d);
    }

    const onPerimeter = (x: number, y: number, r: Rect): boolean => {
      const inX = x >= r.x - EPS && x <= r.x + r.w + EPS;
      const inY = y >= r.y - EPS && y <= r.y + r.d + EPS;
      if (!inX || !inY) return false;
      return eq(x, r.x) || eq(x, r.x + r.w) || eq(y, r.y) || eq(y, r.y + r.d);
    };

    const seen = new Set<string>();
    for (const x of xLines) {
      for (const y of yLines) {
        const pk = `${mm(x)}:${mm(y)}`;
        if (seen.has(pk)) continue;
        if (!rects.some((r) => onPerimeter(x, y, r))) continue;
        seen.add(pk);
        colPoints++;

        const corner = g.rooms.some(
          (r) => (eq(x, r.x) || eq(x, r.x + r.w)) && (eq(y, r.y) || eq(y, r.y + r.d)),
        );
        if (corner) cornerPoints++;

        const section: BoqSection = eq(y, dMaxY)
          ? "front"
          : eq(y, dMinY)
            ? "rear"
            : eq(x, dMinX)
              ? "left"
              : eq(x, dMaxX)
                ? "right"
                : "partition";

        const gk = `${section}|${corner}`;
        const grp = colGroups.get(gk) ?? { section, corner, qty: 0 };
        grp.qty++;
        colGroups.set(gk, grp);
      }
    }
  }

  /* One lift per storey. The running length is identical to a single full-height column, but the cut
   * length is one a 6 m bar can actually yield — and a 3-storey column is spliced at every floor
   * anyway. */
  for (const grp of colGroups.values()) {
    steel({
      kind: "steel",
      id: `${grp.section}:column-${grp.corner ? "corner" : "post"}`,
      section: grp.section,
      materialKey: K.column,
      description: `${grp.corner ? "Corner post" : "Wall post"} — ${sectionLabel(grp.section)} column line`,
      formula: `${grp.qty} column lift(s) × ${m2(floorHM)} m storey height (one lift per storey; grid from the elevation)`,
      drawingRef: sectionDrawing(grp.section),
      qty: grp.qty,
      cutLengthM: round(floorHM, 3),
    });
  }

  /* ---------------------------------------------------------------- 3.6 bracing (per elevation) */

  const braceGroups = new Map<string, { face: Face; cut: number; qty: number; pattern: string }>();
  for (const face of FACES) {
    for (const br of elevations[face].braces) {
      const diag = hyp(br.x1 - br.x0, br.y1 - br.y0);
      if (diag <= EPS) continue;
      /* An "X" is TWO diagonals. One member of 2 × hypot would carry the right running length and a
       * cut length no saw can make — and the nest would then buy a whole bar per brace. */
      const per = br.pattern === "x" ? 2 : 1;
      const gk = `${face}:${mm(diag)}`;
      const grp = braceGroups.get(gk) ?? { face, cut: diag, qty: 0, pattern: br.pattern };
      grp.qty += per;
      braceGroups.set(gk, grp);
    }
  }
  for (const grp of braceGroups.values()) {
    steel({
      kind: "steel",
      id: `${grp.face}:brace:${mm(grp.cut)}`,
      section: grp.face,
      materialKey: K.brace,
      description: `Cross bracing (${grp.pattern === "x" ? "X" : "single"}) — ${FACE_LABEL[grp.face]} elevation`,
      formula: `${grp.qty} diagonal(s) × ${round(grp.cut, 3)} m bay diagonal`,
      drawingRef: FACE_DRAWING[grp.face],
      qty: grp.qty,
      cutLengthM: round(grp.cut, 3),
    });
  }

  /* ---------------------------------------------------------------- 3.7 openings */

  const doorGroups = new Map<string, { wM: number; hM: number; qty: number }>();
  const winGroups = new Map<string, { wM: number; hM: number; qty: number }>();
  let doorCount = 0;
  let windowCount = 0;
  let internalDoors = 0;

  for (const s of allSegs) {
    for (const o of s.openings) {
      const gk = `${mm(o.wM)}x${mm(o.hM)}`;
      const bag = o.kind === "door" ? doorGroups : winGroups;
      const grp = bag.get(gk) ?? { wM: o.wM, hM: o.hM, qty: 0 };
      grp.qty++;
      bag.set(gk, grp);
      if (o.kind === "door") {
        doorCount++;
        if (!s.external) internalDoors++;
      } else {
        windowCount++;
      }
    }
  }

  for (const [gk, d] of doorGroups) {
    const size = `${m2(d.wM)} × ${m2(d.hM)} m`;
    count({
      kind: "count",
      id: `openings:door-leaf:${gk}`,
      section: "openings",
      materialKey: DOOR_LEAF_KEY,
      description: `Door leaf ${size}`,
      formula: `${d.qty} door(s) of ${size} on the plan`,
      drawingRef: OPENINGS_REF,
      qty: d.qty,
    });
    steel({
      kind: "steel",
      id: `openings:door-jamb:${gk}`,
      section: "openings",
      materialKey: DOOR_FRAME_KEY,
      description: `Door frame jamb ${size}`,
      formula: `2 jambs × ${d.qty} door(s) × ${m2(d.hM)} m`,
      drawingRef: OPENINGS_REF,
      qty: 2 * d.qty,
      cutLengthM: round(d.hM, 3),
    });
    steel({
      kind: "steel",
      id: `openings:door-head:${gk}`,
      section: "openings",
      materialKey: DOOR_FRAME_KEY,
      description: `Door frame head ${size}`,
      formula: `1 head × ${d.qty} door(s) × ${m2(d.wM)} m (3-sided frame: 2 jambs + head)`,
      drawingRef: OPENINGS_REF,
      qty: d.qty,
      cutLengthM: round(d.wM, 3),
    });
  }

  for (const [gk, w] of winGroups) {
    const size = `${m2(w.wM)} × ${m2(w.hM)} m`;
    count({
      kind: "count",
      id: `openings:window:${gk}`,
      section: "openings",
      materialKey: WINDOW_KEY,
      description: `Window ${size}`,
      formula: `${w.qty} window(s) of ${size} on the plan`,
      drawingRef: OPENINGS_REF,
      qty: w.qty,
    });
    steel({
      kind: "steel",
      id: `openings:window-jamb:${gk}`,
      section: "openings",
      materialKey: WINDOW_FRAME_KEY,
      description: `Window frame jamb ${size}`,
      formula: `2 jambs × ${w.qty} window(s) × ${m2(w.hM)} m`,
      drawingRef: OPENINGS_REF,
      qty: 2 * w.qty,
      cutLengthM: round(w.hM, 3),
    });
    steel({
      kind: "steel",
      id: `openings:window-head:${gk}`,
      section: "openings",
      materialKey: WINDOW_FRAME_KEY,
      description: `Window frame head ${size}`,
      formula: `1 head × ${w.qty} window(s) × ${m2(w.wM)} m (4-sided frame: 2 jambs + head + sill)`,
      drawingRef: OPENINGS_REF,
      qty: w.qty,
      cutLengthM: round(w.wM, 3),
    });
    steel({
      kind: "steel",
      id: `openings:window-sill:${gk}`,
      section: "openings",
      materialKey: WINDOW_FRAME_KEY,
      description: `Window frame sill ${size}`,
      formula: `1 sill × ${w.qty} window(s) × ${m2(w.wM)} m`,
      drawingRef: OPENINGS_REF,
      qty: w.qty,
      cutLengthM: round(w.wM, 3),
    });
    sheet({
      kind: "sheet",
      id: `openings:window-grill:${gk}`,
      section: "openings",
      materialKey: GRILL_KEY,
      description: `Window grill ${size}`,
      formula: `${w.qty} × ${m2(w.wM)} m × ${m2(w.hM)} m`,
      drawingRef: OPENINGS_REF,
      grossAreaSqm: round(w.qty * w.wM * w.hM, 3),
      deductions: [],
      faces: 1,
    });
  }

  /* ---------------------------------------------------------------- 3.8 floor */

  /* MS PIPE FRAME — the SECONDARY floor members: SHS 50×50 tubes resting on seat cleats ABOVE the
   * primary rafters, spread LENGTHWISE at a sheet-modular 1220 mm so every 8 ft sheet-end joint
   * lands on a tube centreline. Ground floor lays only its interior runs (the side rafters own the
   * edge lines); upper floors keep the edge runs over the transverse field. Priced as its own line
   * (user rule, 2026-07-23): the tube is a DIFFERENT member from the rafter and bills as one. */
  {
    let tubeRuns = 0;
    let tubeLenM = 0;
    for (let f = 0; f < floors; f++) {
      const g = geoms[f];
      if (!g.rooms.length) continue;
      const y0 = Math.min(...g.rooms.map((r) => r.y));
      const y1 = Math.max(...g.rooms.map((r) => r.y + r.d));
      const x0 = Math.min(...g.rooms.map((r) => r.x));
      const x1 = Math.max(...g.rooms.map((r) => r.x + r.w));
      const lines = floorTubeLineYs(y0, y1);
      tubeRuns += f === 0 ? Math.max(0, lines.length - 2) : lines.length;
      tubeLenM = Math.max(tubeLenM, x1 - x0);
    }
    if (tubeRuns > 0 && tubeLenM > 0) {
      steel({
        kind: "steel",
        id: "floor:tube",
        section: "floor",
        materialKey: "shs-50x50x2",
        description: "MS pipe frame — SHS 50 × 50 × 2 floor tube (secondary, above the rafters)",
        formula: `${tubeRuns} longitudinal run(s) @ ${FLOOR_TUBE_SPACING_M} m across ${floors} storey(s), GF interior runs only`,
        drawingRef: PLAN,
        qty: tubeRuns,
        cutLengthM: round(tubeLenM, 3),
      });
    }
  }

  /* A base beam under EVERY wall line — including a shared one, ONCE. The grillage is not a wall, so
   * it carries no geomKey: the de-duplication already happened when the segments were built. */
  const baseBeams = new Map<number, number>();
  for (const s of allSegs) bump(baseBeams, s.lenM, 1);
  for (const [c, qty] of baseBeams) {
    steel({
      kind: "steel",
      id: `floor:base-beam:${c}`,
      section: "floor",
      materialKey: K.base,
      description: `Base frame beam under wall line — ${m2(c / 1000)} m`,
      formula: `${qty} wall line(s) of ${m2(c / 1000)} m (shared walls counted once)`,
      drawingRef: PLAN,
      qty,
      cutLengthM: round(c / 1000, 3),
    });
  }

  const joists = new Map<number, number>();
  const joistLines: number[] = [];
  let roomSqm = 0;
  let deckSqm = 0;
  let topRoomSqm = 0;

  for (let f = 0; f < floors; f++) {
    const g = geoms[f];
    for (const r of g.rooms) {
      roomSqm += r.w * r.d;
      if (f === floors - 1) topRoomSqm += r.w * r.d;
      const n = intermediateLines(r.w, norms.joistSpacingM);
      bump(joists, r.d, n);
      if (f === 0 && n > 0) {
        const jb = ceil(r.w / norms.joistSpacingM);
        for (let i = 1; i < jb; i++) joistLines.push(round(r.x + (r.w * i) / jb, 3));
      }
    }
    deckSqm += unionAreaSqm([...g.rooms, ...g.verandas]);
  }

  for (const [c, qty] of joists) {
    steel({
      kind: "steel",
      id: `floor:joist:${c}`,
      section: "floor",
      materialKey: K.base,
      description: `Floor joist — ${m2(c / 1000)} m span`,
      formula: `${qty} joist(s) @ ${norms.joistSpacingM} m across the rooms`,
      drawingRef: PLAN,
      qty,
      cutLengthM: round(c / 1000, 3),
    });
  }

  sheet({
    kind: "sheet",
    id: "floor:board",
    section: "floor",
    materialKey: BOARD_KEY,
    description: `Cement / bison board decking ${boardThk} mm`,
    formula: `Σ room footprints over ${floors} storey(s) = ${m2(roomSqm)} m²`,
    drawingRef: PLAN,
    grossAreaSqm: round(roomSqm, 3),
    deductions: [],
    faces: 1,
  });
  sheet({
    kind: "sheet",
    id: "floor:vinyl",
    section: "floor",
    materialKey: VINYL_KEY,
    description: "Vinyl floor finish",
    formula: `Same area as the board decking = ${m2(roomSqm)} m²`,
    drawingRef: PLAN,
    grossAreaSqm: round(roomSqm, 3),
    deductions: [],
    faces: 1,
  });

  /* ---------------------------------------------------------------- 3.9 roof */

  const top = geoms[floors - 1];
  const topRects: Rect[] = [...top.rooms, ...top.verandas];
  const rMinX = topRects.length ? Math.min(...topRects.map((r) => r.x)) : 0;
  const rMaxX = topRects.length ? Math.max(...topRects.map((r) => r.x + r.w)) : top.blockWM;
  const rMinY = topRects.length ? Math.min(...topRects.map((r) => r.y)) : 0;
  const rMaxY = topRects.length ? Math.max(...topRects.map((r) => r.y + r.d)) : top.blockDM;

  const roofLenM = rMaxX - rMinX + 2 * roof.overhangM;
  const roofWidM = rMaxY - rMinY + 2 * roof.overhangM;
  const roofPlanSqm = roofLenM * roofWidM;
  const halfSpan = roofWidM / 2;

  /* The TRUE sloped area, from the rise over the half-span — not a magic factor. A flat roof has no
   * span to slope over, so it (and only it) borrows the calculator's own drainage-fall factor. */
  const slopeFactor =
    (roof.type === "gable" || roof.type === "hip") && halfSpan > EPS
      ? hyp(halfSpan, roof.riseM) / halfSpan
      : roof.type === "mono" && roofWidM > EPS
        ? hyp(roofWidM, roof.riseM) / roofWidM
        : result.norms.roofSlopeFactor;
  const roofSlopedSqm = roofPlanSqm * slopeFactor;

  const trussLines = totalLines(roofLenM, norms.trussSpacingM);
  const raftersPerTruss = roof.type === "gable" || roof.type === "hip" ? 2 : 1;
  const rafterCutM =
    roof.type === "gable" || roof.type === "hip"
      ? hyp(halfSpan, roof.riseM)
      : roof.type === "mono"
        ? hyp(roofWidM, roof.riseM)
        : roofWidM;

  steel({
    kind: "steel",
    id: "roof:rafter",
    section: "roof",
    materialKey: K.roofFrame,
    description: `Roof frame / rafter (${roof.type})`,
    formula: `${trussLines} truss line(s) @ ${norms.trussSpacingM} m × ${raftersPerTruss} rafter(s) × ${m2(rafterCutM)} m`,
    drawingRef: ROOF_REF,
    qty: trussLines * raftersPerTruss,
    cutLengthM: round(rafterCutM, 3),
  });

  /* Purlins run ALONG the building and are spliced at the trusses, so a purlin's cut length is a bay,
   * not the whole 30 m building. */
  const roofBays = Math.max(1, trussLines - 1);
  const bayLenM = roofLenM / roofBays;
  const purlinLines = totalLines(roofWidM * slopeFactor, norms.purlinSpacingM);

  steel({
    kind: "steel",
    id: "roof:purlin",
    section: "roof",
    materialKey: K.purlin,
    description: "Roof purlin",
    formula: `${purlinLines} purlin line(s) @ ${norms.purlinSpacingM} m over the roof plane × ${roofBays} bay(s) of ${m2(bayLenM)} m`,
    drawingRef: ROOF_REF,
    qty: purlinLines * roofBays,
    cutLengthM: round(bayLenM, 3),
  });

  sheet({
    kind: "sheet",
    id: "roof:sheet",
    section: "roof",
    materialKey: ROOF_SHEET_KEY,
    description: "Roofing sheet",
    formula: `${m2(roofPlanSqm)} m² plan × ${round(slopeFactor, 3)} slope factor (${roof.type}, rise ${roof.riseM} m, overhang ${roof.overhangM} m)`,
    drawingRef: ROOF_REF,
    grossAreaSqm: round(roofSlopedSqm, 3),
    deductions: [],
    faces: 1,
  });
  sheet({
    kind: "sheet",
    id: "roof:ceiling",
    section: "roof",
    materialKey: CEILING_KEY,
    description: "Ceiling sheet under the roof",
    formula: `Top-storey room footprint = ${m2(topRoomSqm)} m²`,
    drawingRef: ROOF_REF,
    grossAreaSqm: round(topRoomSqm, 3),
    deductions: [],
    faces: 1,
  });

  /* ---------------------------------------------------------------- 3.10 verandas / walkways */

  /* Wall lines indexed by (floor, axis, coord): a veranda edge beam that runs along one of them IS
   * that wall's base rail. The subtraction is the shared-wall de-duplication done in interval space,
   * because one veranda edge spans many room segments at once. (spec §6 — common veranda members) */
  const wallIntervals = new Map<string, [number, number][]>();
  for (const s of allSegs) {
    const gk = `${s.floor}:${s.axis}:${mm(s.coord)}`;
    const arr = wallIntervals.get(gk) ?? [];
    arr.push([s.a, s.b]);
    wallIntervals.set(gk, arr);
  }

  const verBeams = new Map<number, number>();
  const verJoists = new Map<number, number>();
  const railPosts = new Map<number, number>();
  const railRuns = new Map<number, number>();
  let plateSqm = 0;
  let verandaSharedM = 0;
  const verandaCount = geoms[0].verandas.length;

  for (let f = 0; f < floors; f++) {
    for (const v of geoms[f].verandas) {
      const horiz = v.side === "top" || v.side === "bottom";
      const alongLen = horiz ? v.w : v.d;
      const depth = horiz ? v.d : v.w;
      if (alongLen <= EPS || depth <= EPS) continue;

      for (const e of edgesOfVeranda(v)) {
        const covered = wallIntervals.get(`${f}:${e.axis}:${mm(e.coord)}`) ?? [];
        const free = subtractIntervals(Math.min(e.a, e.b), Math.max(e.a, e.b), covered);
        const freeLen = free.reduce((sum, [p, q]) => sum + (q - p), 0);
        verandaSharedM += Math.abs(e.b - e.a) - freeLen;
        for (const [p, q] of free) bump(verBeams, q - p, 1);
      }

      bump(verJoists, depth, intermediateLines(alongLen, norms.joistSpacingM));
      if (f >= 1) plateSqm += alongLen * depth;

      if (v.railing) {
        const posts = totalLines(alongLen, norms.handrailPostSpacingM);
        bump(railPosts, norms.handrailHeightM, posts);
        const bays = Math.max(1, posts - 1);
        bump(railRuns, alongLen / bays, bays * norms.handrailRails);
      }
    }
  }

  for (const [c, qty] of verBeams) {
    steel({
      kind: "steel",
      id: `veranda:beam:${c}`,
      section: "veranda",
      materialKey: K.base,
      description: `Veranda edge beam — ${m2(c / 1000)} m`,
      formula: `${qty} run(s) of ${m2(c / 1000)} m — edges that coincide with a room-block wall line are that wall's base rail and are counted once`,
      drawingRef: PLAN_ELEV,
      qty,
      cutLengthM: round(c / 1000, 3),
    });
  }
  for (const [c, qty] of verJoists) {
    steel({
      kind: "steel",
      id: `veranda:joist:${c}`,
      section: "veranda",
      materialKey: K.base,
      description: `Veranda deck joist — ${m2(c / 1000)} m span`,
      formula: `${qty} joist(s) @ ${norms.joistSpacingM} m across the walkway`,
      drawingRef: PLAN_ELEV,
      qty,
      cutLengthM: round(c / 1000, 3),
    });
  }
  for (const [c, qty] of railPosts) {
    steel({
      kind: "steel",
      id: `veranda:rail-post:${c}`,
      section: "veranda",
      materialKey: HANDRAIL_KEY,
      description: "Veranda handrail post",
      formula: `${qty} post(s) @ ${norms.handrailPostSpacingM} m × ${norms.handrailHeightM} m high`,
      drawingRef: PLAN_ELEV,
      qty,
      cutLengthM: round(c / 1000, 3),
    });
  }
  for (const [c, qty] of railRuns) {
    steel({
      kind: "steel",
      id: `veranda:rail:${c}`,
      section: "veranda",
      materialKey: HANDRAIL_KEY,
      description: `Veranda handrail — ${m2(c / 1000)} m bay`,
      formula: `${norms.handrailRails} rail(s) per post bay, ${qty} member(s) of ${m2(c / 1000)} m`,
      drawingRef: PLAN_ELEV,
      qty,
      cutLengthM: round(c / 1000, 3),
    });
  }
  sheet({
    kind: "sheet",
    id: "veranda:plate",
    section: "veranda",
    materialKey: PLATE_KEY,
    description: "Veranda chequered plate decking (upper storeys)",
    formula: `Σ veranda footprints on storeys 1..${floors - 1} = ${m2(plateSqm)} m²`,
    drawingRef: PLAN_ELEV,
    grossAreaSqm: round(plateSqm, 3),
    deductions: [],
    faces: 1,
  });

  /* ---------------------------------------------------------------- 3.11 staircases */

  /* resolveStair() derives the riser count from ONE floor height (floorRiseM = roomHeight) and
   * elevation.ts lands each flight on the next FFL — so an FPStair is ONE FLIGHT, not the whole
   * stair. The flights per staircase are therefore (floors − 1). */
  const stairs = geoms[0].stairs;
  const flights = Math.max(0, floors - 1);

  for (const s of stairs) {
    if (flights === 0) break;
    const slopeM = hyp(s.runM, s.totalRiseM);
    const treadSqm = s.treads * s.widthM * s.goingM;
    const landingSqm = s.landingM > EPS ? s.widthM * s.landingM : 0;

    steel({
      kind: "steel",
      id: `staircase:stringer:${s.id}`,
      section: "staircase",
      materialKey: K.base,
      description: `${s.label} — stringer`,
      formula: `2 stringers × ${flights} flight(s); √(${m2(s.runM)}² + ${m2(s.totalRiseM)}²) = ${m2(slopeM)} m`,
      drawingRef: PLAN_ELEV,
      qty: 2 * flights,
      cutLengthM: round(slopeM, 3),
    });
    steel({
      kind: "steel",
      id: `staircase:tread-frame:${s.id}`,
      section: "staircase",
      materialKey: K.brace,
      description: `${s.label} — tread framing angle`,
      formula: `${s.treads} tread(s) × ${flights} flight(s) × ${m2(s.widthM)} m wide`,
      drawingRef: PLAN_ELEV,
      qty: s.treads * flights,
      cutLengthM: round(s.widthM, 3),
    });
    steel({
      kind: "steel",
      id: `staircase:landing-cross:${s.id}`,
      section: "staircase",
      materialKey: K.base,
      description: `${s.label} — landing frame (cross member)`,
      formula: `2 member(s) × ${flights} flight(s) × ${m2(s.widthM)} m`,
      drawingRef: PLAN_ELEV,
      qty: s.landingM > EPS ? 2 * flights : 0,
      cutLengthM: round(s.widthM, 3),
    });
    steel({
      kind: "steel",
      id: `staircase:landing-side:${s.id}`,
      section: "staircase",
      materialKey: K.base,
      description: `${s.label} — landing frame (side member)`,
      formula: `2 member(s) × ${flights} flight(s) × ${m2(s.landingM)} m`,
      drawingRef: PLAN_ELEV,
      qty: 2 * flights,
      cutLengthM: round(s.landingM, 3),
    });
    sheet({
      kind: "sheet",
      id: `staircase:plate:${s.id}`,
      section: "staircase",
      materialKey: PLATE_KEY,
      description: `${s.label} — chequered plate treads + landing`,
      formula: `${flights} flight(s) × (${s.treads} treads × ${m2(s.widthM)} × ${m2(s.goingM)} m${
        landingSqm > 0 ? ` + ${m2(s.widthM)} × ${m2(s.landingM)} m landing` : ""
      })`,
      drawingRef: PLAN_ELEV,
      grossAreaSqm: round(flights * (treadSqm + landingSqm), 3),
      deductions: [],
      faces: 1,
    });

    if (s.handrail) {
      const posts = totalLines(s.runM, norms.handrailPostSpacingM);
      steel({
        kind: "steel",
        id: `staircase:rail-post:${s.id}`,
        section: "staircase",
        materialKey: HANDRAIL_KEY,
        description: `${s.label} — handrail post`,
        formula: `2 side(s) × ${posts} post(s) @ ${norms.handrailPostSpacingM} m × ${flights} flight(s)`,
        drawingRef: PLAN_ELEV,
        qty: 2 * posts * flights,
        cutLengthM: round(norms.handrailHeightM, 3),
      });
      steel({
        kind: "steel",
        id: `staircase:rail:${s.id}`,
        section: "staircase",
        materialKey: HANDRAIL_KEY,
        description: `${s.label} — handrail (raking)`,
        formula: `2 side(s) × ${norms.handrailRails} rail(s) × ${flights} flight(s) × ${m2(slopeM)} m`,
        drawingRef: PLAN_ELEV,
        qty: 2 * norms.handrailRails * flights,
        cutLengthM: round(slopeM, 3),
      });
    }
  }

  /* ---------------------------------------------------------------- 3.12 services + fixings
   * The norms already ran, once, inside calculateLabourColony(). Recomputing the WC count here would
   * give the BOQ a second opinion about how many WCs the colony has. Reuse, never recompute. */

  const e = result.electrical;
  count({ kind: "count", id: "electrical:lights", section: "electrical", materialKey: "elec-led-panel", description: "LED panel light", formula: `${e.lights} light point(s) — colony electrical result`, drawingRef: "Electrical Layout", qty: e.lights });
  count({ kind: "count", id: "electrical:fans", section: "electrical", materialKey: "elec-fan", description: "Ceiling fan", formula: `${e.fans} fan point(s) — colony electrical result`, drawingRef: "Electrical Layout", qty: e.fans });
  count({ kind: "count", id: "electrical:sockets", section: "electrical", materialKey: "elec-socket", description: "Socket / plug point", formula: `${e.sockets} socket point(s) — colony electrical result`, drawingRef: "Electrical Layout", qty: e.sockets });
  count({ kind: "count", id: "electrical:db", section: "electrical", materialKey: "elec-db", description: "Distribution board with MCBs", formula: `${e.distributionBoards} DB(s) for a ${e.demandLoadKW} kW demand load`, drawingRef: "Electrical Layout", qty: e.distributionBoards });

  const p = result.plumbing;
  count({ kind: "count", id: "plumbing:wc", section: "plumbing", materialKey: "plumb-wc", description: "EWC / Indian WC pan", formula: `${p.wc} WC(s) — 1 per ${result.norms.personsPerWC} persons`, drawingRef: PLAN, qty: p.wc });
  count({ kind: "count", id: "plumbing:washbasin", section: "plumbing", materialKey: "plumb-washbasin", description: "Wash basin", formula: `${p.washBasins} basin(s) — 1 per ${result.norms.personsPerWashBasin} persons`, drawingRef: PLAN, qty: p.washBasins });

  /* A pipe is a RUNNING LENGTH, not a cut member: one line for the whole run keeps the weight (kg/m)
   * and the money (₹/m) exact. The nest will call it a special order — it is bought by the length,
   * not sawn out of a bar. */
  steel({
    kind: "steel",
    id: "plumbing:cpvc",
    section: "plumbing",
    materialKey: "plumb-cpvc-25",
    description: "CPVC water supply pipe 25 mm (running length)",
    formula: `${m2(p.cpvcPipeM)} m — colony plumbing result`,
    drawingRef: PLAN,
    qty: p.cpvcPipeM > EPS ? 1 : 0,
    cutLengthM: round(p.cpvcPipeM, 3),
  });
  steel({
    kind: "steel",
    id: "plumbing:pvc",
    section: "plumbing",
    materialKey: "plumb-pvc-110",
    description: "PVC soil / waste pipe 110 mm (running length)",
    formula: `${m2(p.pvcWastePipeM)} m — colony plumbing result`,
    drawingRef: PLAN,
    qty: p.pvcWastePipeM > EPS ? 1 : 0,
    cutLengthM: round(p.pvcWastePipeM, 3),
  });

  count({
    kind: "count",
    id: "misc:bolts",
    section: "misc",
    materialKey: BOLT_KEY,
    description: `Nut-bolt assembly ${result.bolts.size}`,
    formula: `${result.bolts.crossSupportBolts} cross-support + ${result.bolts.connectionBolts} connection bolts`,
    drawingRef: "—",
    qty: result.bolts.totalBolts,
  });

  /* ---------------------------------------------------------------- 3.13 meta + frame overlay */

  /* lengthM / widthM are the EFFECTIVE walled extents — half the total external wall run on each
   * axis — so 2 × (L + W) IS the external perimeter the cladding was measured over. On the reference
   * layout that is exactly the block's length and depth; on a gapped or ragged plan it degrades to
   * the wall that actually exists, which keeps validate.ts's perimeter × height × floors cross-check
   * honest instead of comparing the BOQ against a rectangle nobody built. */
  const lengthM = extRunLen / (2 * floors);
  const widthM = extRunWid / (2 * floors);

  const frame: FrameGeometry = {
    posts: FACES.flatMap((face) =>
      elevations[face].columns.map((c) => ({
        face: face as BoqSection,
        xM: round(c.xM - elevations[face].x0, 3),
        kind: (c.kind === "wall" ? "corner" : c.kind === "intermediate" ? "stud" : "post") as
          | "corner"
          | "post"
          | "stud",
      })),
    ),
    joists: uniq(joistLines),
    /* Purlins run ALONG the building, so their LINES are spaced across it — these are plan-y
     * coordinates from the roof's leading edge, not x. */
    purlins: Array.from({ length: Math.max(0, purlinLines) }, (_, i) =>
      round(rMinY - roof.overhangM + (i * roofWidM) / Math.max(1, purlinLines - 1), 3),
    ),
  };

  /* ---------------------------------------------------------------- 3.14 notes */

  const faceCount = (f: Face) => extSegs.filter((s) => s.face === f).length;

  notes.push(
    `Shared walls: ${sharedSegs.length} wall segment(s) are owned by 2 rooms — ${roomEdges} room edges collapse to ${allSegs.length} wall segments, and each shared wall's rails, studs, base beam and sheeting are emitted ONCE (sharedBy 2). The legacy engine (labourColony.ts:679-698) multiplies a full per-module perimeter by the module count, so it buys every party wall — and its studs, rails and base frame — twice.`,
  );
  notes.push(
    `Wall segments: ${extSegs.length} external (front ${faceCount("front")}, rear ${faceCount("rear")}, left ${faceCount("left")}, right ${faceCount("right")}) + ${partSegs.length} internal partition(s) over ${floors} storey(s). Face convention from elevation.ts: front = max y, rear = min y, left = min x, right = max x.`,
  );
  notes.push(
    `Columns: ${colPoints} column point(s) over ${floors} storey(s), ${cornerPoints} of them on a room corner. A column is counted where an x column-line meets a y column-line ON the boundary of a room or a veranda, so the BOQ counts the columns the elevation draws. Each is emitted once per storey as a ${m2(floorHM)} m lift — never once per adjoining room.`,
  );
  notes.push(
    `Veranda: ${m2(verandaSharedM)} m of veranda edge beam runs along a room-block wall line and IS that wall's base rail — removed by the same interval algebra as the shared walls, and counted once.`,
  );
  notes.push(
    `Internal doors: ${internalDoors} of ${doorCount} door(s) sit on an internal wall and appear on NO elevation. They are deducted from the PARTITION sheeting (which loses them on both faces) and carry their own frames — missing them silently inflates the sheet area.`,
  );
  notes.push(
    `Staircases: ${stairs.length} staircase(s) × ${flights} flight(s). An FPStair is ONE flight — resolveStair() derives its riser count from a single floor height (floorRiseM = roomHeight) and elevation.ts lands it on the next FFL — so it is multiplied by (floors − 1) here.`,
  );
  notes.push(
    `Roof: ${roof.type}, rise ${roof.riseM} m, eave overhang ${roof.overhangM} m. Sloped area = plan × ${round(slopeFactor, 3)}: the true slope over the half-span (gable/hip) or the full span (mono); a flat roof borrows the calculator's own drainage-fall factor (${result.norms.roofSlopeFactor}).`,
  );
  notes.push(
    cladIsPanel
      ? `Walls: a ${panelThk} mm ${panelType} sandwich panel IS the wall (skin + core + skin), so no separate internal lining or insulation layer is taken off — that would bill the insulation twice.`
      : `Walls: a bare GI skin is not a wall on its own, so every external face carries an external sheet + an internal PPGI lining + a glass-wool insulation layer.`,
  );
  notes.push(
    `Cross bracing comes from each elevation's own braced bays; an X-brace is emitted as 2 diagonals of the bay hypotenuse. A brace in the same bay of two different faces is a DIFFERENT member and is not de-duplicated.`,
  );
  notes.push(
    `Column spacing follows the ELEVATION's grid (structure.maxBaySpacingM, default 3 m). norms.postSpacingM is deliberately not applied — it would count posts the drawing does not show.`,
  );
  notes.push(
    `Not taken off: wiring runs, earthing pits, ventilators and bunk beds (no Material Master entry — add them as manual BOQ rows), and primer/enamel (levied per m² as a ChargeLine).`,
  );

  return {
    meta: {
      source: "colony",
      title: `${cfg.projectName || "Labour Colony"} — ${result.occupancy.rooms} room(s), ${floors} storey(s)`,
      lengthM: round(lengthM, 3),
      widthM: round(widthM, 3),
      heightM: round(floorHM, 3),
      floors,
      rooms: result.occupancy.rooms,
      partitions: partSegs.length,
      doors: doorCount,
      windows: windowCount,
      staircases: stairs.length,
      verandas: verandaCount,
      modules: result.structural.modules,
      floorAreaSqm: round(deckSqm, 2),
      roofType: roof.type,
    },
    items,
    notes,
    frame,
  };
}
