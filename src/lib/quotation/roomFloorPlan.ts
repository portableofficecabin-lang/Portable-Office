/**
 * Room-wise floor-plan GEOMETRY for the Labour Colony calculator (pure, framework-free).
 *
 * Everything is computed in METRES (top-left origin; staircases may sit at negative x/y).
 * The React drawing scales metres → pixels and formats every label through the selected
 * length unit (see ./units). This is the single source of truth for the live drawing, the
 * dimension chains and — importantly — the TOTAL COLONY length & width.
 *
 * Reference layout: two rows of room modules placed BACK-TO-BACK, each opening onto its
 * own peripheral VERANDA (top row → top veranda, bottom row → bottom veranda), with a
 * fully-customizable STAIRCASE that can sit on any side (or both ends). Drawing only — it
 * never changes the engine quantities or the BOQ.
 */

import type {
  LabourColonyResult,
  RoomFloorPlanConfig,
  RoomOpeningOverride,
  StaircaseDrawConfig,
} from "./labourColony";

const M2FT = 3.280839895;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const round = (n: number, d = 3) => { const f = Math.pow(10, d); return Math.round((n + Number.EPSILON) * f) / f; };
const ft2m = (ft: number) => ft / M2FT;

/* ------------------------------------------------------------------ types */

export interface FPRoom {
  no: number;
  row: "top" | "bottom";
  x: number; y: number; w: number; d: number; // metres
  wallY: number;      // veranda-facing wall (door/window sit here), metres
  into: 1 | -1;       // interior direction from that wall
  doorFromLeftM: number;
  winFromLeftM: number;
  doorWM: number;
  winWM: number;
  hinge: "left" | "right";
}

export interface FPRect { x: number; y: number; w: number; d: number; label?: string; }

export interface FPStairStep { a: number; b: number; } // [start,end] along the run from the ENTRY end (metres)

export interface FPStair {
  x: number; y: number; w: number; d: number;       // footprint (metres)
  orientation: "vertical" | "horizontal";
  entry: "left" | "right";
  direction: "up" | "down";
  runM: number; widthM: number; landingM: number;
  steps: number; treadM: number; goingM: number; riserMm: number; gapM: number;
  stepEdges: FPStairStep[];
  serves?: "top" | "bottom" | "all";
}

export type FPBandKind = "room" | "gap" | "stair" | "veranda" | "row";
export interface FPBand { start: number; len: number; kind: FPBandKind; }

export interface RoomFloorPlanGeom {
  floors: number;
  floorIndex: number;
  rpf: number;
  hasBottom: boolean;
  wallM: number;               // drawn wall / panel thickness
  verandaM: number;
  roomGapM: number;
  rooms: FPRoom[];
  verandas: FPRect[];
  stairs: FPStair[];
  blockWM: number; blockDM: number;   // room block (excl. staircases)
  totalLengthM: number;               // TOTAL COLONY length (x, incl. staircases)
  totalWidthM: number;                // TOTAL COLONY width  (y, incl. verandas + staircases)
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  widthBands: FPBand[];               // x-axis dimension chain
  depthBands: FPBand[];               // y-axis dimension chain
  roomNos: number[]; loNo: number | null; hiNo: number | null;
}

/* ---------------------------------------------------------------- helpers */

/** Effective, clamped staircase parameters from a (possibly partial) config.
 *  `fallbackPos` / `fallbackWidthM` let the structure-tab staircase settings seed the
 *  drawing when the floor-plan's own staircase config hasn't overridden them. */
export function resolveStair(
  sc: StaircaseDrawConfig | undefined,
  floors: number,
  verandaM: number,
  fallbackPos?: StaircaseDrawConfig["position"],
  fallbackWidthM?: number,
) {
  const s = sc ?? {};
  const enabled = s.enabled ?? floors > 1;
  const position = s.position ?? fallbackPos ?? "both";
  const offsetM = Number.isFinite(s.offsetM) ? (s.offsetM as number) : 0;
  const widthM = Math.max(0.6, s.widthM ?? (fallbackWidthM && fallbackWidthM > 0 ? fallbackWidthM : Math.max(1.0, verandaM)));
  const steps = clamp(Math.round(s.steps ?? 12), 2, 60);
  const treadM = Math.max(0.15, s.treadM ?? 0.3);
  const gapM = Math.max(0, s.gapM ?? 0);
  const riserMm = clamp(Math.round(s.riserMm ?? 165), 80, 300);
  const computedRun = steps * treadM + (steps - 1) * gapM;
  const overridden = !!(s.totalLengthM && s.totalLengthM > 0);
  const runM = overridden ? (s.totalLengthM as number) : computedRun;
  const goingM = runM / steps;
  const landingM = Math.max(0, s.landingM ?? Math.min(widthM, 1.0));
  const entry = s.entry ?? "left";
  const direction = s.direction ?? "up";
  return { enabled, position, offsetM, widthM, steps, treadM, gapM, riserMm, runM, goingM, landingM, entry, direction, overridden };
}

function stepEdges(steps: number, runM: number, treadM: number, gapM: number, overridden: boolean): FPStairStep[] {
  const edges: FPStairStep[] = [];
  if (overridden) {
    const g = runM / steps;
    for (let i = 0; i < steps; i++) edges.push({ a: i * g, b: (i + 1) * g });
  } else {
    let p = 0;
    for (let i = 0; i < steps; i++) { edges.push({ a: p, b: p + treadM }); p += treadM + gapM; }
  }
  return edges;
}

/* ------------------------------------------------------------------ build */

export function buildRoomFloorPlan(
  result: LabourColonyResult,
  fp: RoomFloorPlanConfig | undefined,
  floorIndex: number,
): RoomFloorPlanGeom {
  const cfg = result.config;
  const conf = fp ?? {};
  const floors = Math.max(1, cfg.floors);
  const totalRooms = Math.max(1, result.occupancy.rooms);
  const rpf = Math.ceil(totalRooms / floors);
  const floor = clamp(Math.round(floorIndex), 0, floors - 1);

  // reference numbering: bottom row gets the lower numbers, top row the higher ones
  const topCount = Math.ceil(rpf / 2);
  const bottomCount = rpf - topCount;
  const hasBottom = bottomCount > 0;

  const base = floor * rpf;
  const bottomNos = Array.from({ length: bottomCount }, (_, i) => base + i + 1).filter((no) => no <= totalRooms);
  const topNos = Array.from({ length: topCount }, (_, i) => base + bottomCount + i + 1).filter((no) => no <= totalRooms);
  const roomNos = [...bottomNos, ...topNos].sort((a, b) => a - b);
  const loNo = roomNos.length ? Math.min(...roomNos) : null;
  const hiNo = roomNos.length ? Math.max(...roomNos) : null;

  const globalLenM = Math.max(1.0, cfg.roomLength);
  const globalDepthM = Math.max(1.0, cfg.roomWidth);
  const verandaM = Math.max(0.6, conf.verandaWidthFt != null ? ft2m(conf.verandaWidthFt) : Math.max(0.9, cfg.corridorWidth || 0.9));
  const roomGapM = Math.max(0, conf.roomGapM ?? 0);
  const wallM = clamp((conf.wallThicknessMm ?? 100) / 1000, 0.02, Math.min(globalLenM, globalDepthM) / 3);

  const overrideOf = (no: number): RoomOpeningOverride => conf.rooms?.[no] ?? {};
  const lenOf = (no: number) => { const o = overrideOf(no).lengthM; return o && o > 0 ? Math.max(1.0, o) : globalLenM; };
  const depthOf = (no: number) => { const o = overrideOf(no).depthM; return o && o > 0 ? Math.max(1.0, o) : globalDepthM; };

  const maxTopDepth = topNos.length ? Math.max(...topNos.map(depthOf)) : globalDepthM;
  const maxBottomDepth = bottomNos.length ? Math.max(...bottomNos.map(depthOf)) : 0;

  // block depth (y): top veranda + top band + [bottom band + bottom veranda]
  const blockDM = hasBottom
    ? verandaM + maxTopDepth + maxBottomDepth + verandaM
    : verandaM + maxTopDepth;
  const topBandY0 = verandaM;                         // top rooms align to the top veranda
  const bottomBandY1 = blockDM - verandaM;            // bottom rooms align to the bottom veranda

  // row X packing (metres, left-aligned)
  const packRow = (nos: number[]) => {
    const xs: number[] = [];
    let p = 0;
    nos.forEach((no, i) => { xs.push(p); p += lenOf(no); if (i < nos.length - 1) p += roomGapM; });
    return { xs, total: p };
  };
  const top = packRow(topNos);
  const bottom = packRow(bottomNos);
  const blockWM = Math.max(0.5, top.total, bottom.total);

  // openings — legacy door/window widths are stored in FEET; convert to metres
  const doorWBaseM = ft2m(conf.doorWidthFt ?? 3);
  const winWBaseM = ft2m(conf.windowWidthFt ?? 4);

  const rooms: FPRoom[] = [];
  const placeRoom = (no: number, x: number, row: "top" | "bottom") => {
    const L = lenOf(no);
    const dep = depthOf(no);
    const doorWM = clamp(doorWBaseM, 0.6, Math.max(0.6, Math.min(L - 0.15, dep * 0.9)));
    const winWM = clamp(winWBaseM, 0.5, Math.max(0.5, L - 0.15));
    const o = overrideOf(no);
    const maxDoor = Math.max(0, L - doorWM);
    const maxWin = Math.max(0, L - winWM);
    const defWin = clamp(0.12 * L, 0, maxWin);
    const defDoor = clamp(L - 0.12 * L - doorWM, 0, maxDoor);
    const doorFromLeftM = clamp(o.doorFromLeftFt != null ? ft2m(o.doorFromLeftFt) : defDoor, 0, maxDoor);
    const winFromLeftM = clamp(o.windowFromLeftFt != null ? ft2m(o.windowFromLeftFt) : defWin, 0, maxWin);
    if (row === "top") {
      rooms.push({ no, row, x, y: topBandY0, w: L, d: dep, wallY: topBandY0, into: 1, doorFromLeftM, winFromLeftM, doorWM, winWM, hinge: o.doorHinge ?? "left" });
    } else {
      rooms.push({ no, row, x, y: bottomBandY1 - dep, w: L, d: dep, wallY: bottomBandY1, into: -1, doorFromLeftM, winFromLeftM, doorWM, winWM, hinge: o.doorHinge ?? "left" });
    }
  };
  topNos.forEach((no, i) => placeRoom(no, top.xs[i], "top"));
  bottomNos.forEach((no, i) => placeRoom(no, bottom.xs[i], "bottom"));

  const verandas: FPRect[] = [{ x: 0, y: 0, w: blockWM, d: verandaM, label: "VERANDA" }];
  if (hasBottom) verandas.push({ x: 0, y: blockDM - verandaM, w: blockWM, d: verandaM, label: "VERANDA" });

  /* ---------------- staircases ---------------- */
  const sr = resolveStair(conf.staircase, floors, verandaM, cfg.staircasePosition, cfg.staircaseWidth);
  const stairs: FPStair[] = [];
  if (sr.enabled) {
    const longM = sr.runM + sr.landingM;
    const edges = stepEdges(sr.steps, sr.runM, sr.treadM, sr.gapM, sr.overridden);
    const mk = (
      x: number, y: number, w: number, d: number,
      orientation: "vertical" | "horizontal", serves: FPStair["serves"],
    ): FPStair => ({
      x, y, w, d, orientation, entry: sr.entry, direction: sr.direction,
      runM: sr.runM, widthM: sr.widthM, landingM: sr.landingM,
      steps: sr.steps, treadM: sr.treadM, goingM: sr.goingM, riserMm: sr.riserMm, gapM: sr.gapM,
      stepEdges: edges, serves,
    });
    const topBandCenterY = topBandY0 + (maxTopDepth - longM) / 2;
    const bottomBandCenterY = hasBottom ? (bottomBandY1 - maxBottomDepth) + (maxBottomDepth - longM) / 2 : topBandCenterY;
    const centerY = (blockDM - longM) / 2 + sr.offsetM;
    const centerX = (blockWM - longM) / 2 + sr.offsetM;

    switch (sr.position) {
      case "left":
        stairs.push(mk(-sr.widthM, centerY, sr.widthM, longM, "vertical", "all"));
        break;
      case "right":
        stairs.push(mk(blockWM, centerY, sr.widthM, longM, "vertical", "all"));
        break;
      case "top":
        stairs.push(mk(centerX, -sr.widthM, longM, sr.widthM, "horizontal", "all"));
        break;
      case "bottom":
        stairs.push(mk(centerX, blockDM, longM, sr.widthM, "horizontal", "all"));
        break;
      case "both":
      default:
        // reference: right staircase serves the top row, left serves the bottom row
        stairs.push(mk(blockWM, topBandCenterY + sr.offsetM, sr.widthM, longM, "vertical", "top"));
        if (hasBottom) stairs.push(mk(-sr.widthM, bottomBandCenterY + sr.offsetM, sr.widthM, longM, "vertical", "bottom"));
        else stairs.push(mk(-sr.widthM, topBandCenterY + sr.offsetM, sr.widthM, longM, "vertical", "all"));
        break;
    }
  }

  /* ---------------- bounds + totals ---------------- */
  const allRects = [...rooms, ...verandas, ...stairs];
  let minX = 0, minY = 0, maxX = blockWM, maxY = blockDM;
  for (const r of allRects) {
    minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.d);
  }
  const totalLengthM = round(maxX - minX);
  const totalWidthM = round(maxY - minY);

  /* ---------------- dimension chains ---------------- */
  // width (x): [left stair] + reference row (rooms + gaps) + [right stair]
  const refRow = top.total >= bottom.total ? topNos : bottomNos;
  const refXs = top.total >= bottom.total ? top.xs : bottom.xs;
  const coreWidth: FPBand[] = [];
  refRow.forEach((no, i) => {
    coreWidth.push({ start: refXs[i], len: lenOf(no), kind: "room" });
    if (roomGapM > 0 && i < refRow.length - 1) coreWidth.push({ start: refXs[i] + lenOf(no), len: roomGapM, kind: "gap" });
  });
  const widthBands: FPBand[] = [];
  if (minX < -1e-6) widthBands.push({ start: minX, len: -minX, kind: "stair" });
  widthBands.push(...coreWidth);
  if (maxX > blockWM + 1e-6) widthBands.push({ start: blockWM, len: maxX - blockWM, kind: "stair" });

  // depth (y): [top stair] + veranda + top band + [bottom band + veranda] + [bottom stair]
  const coreDepth: FPBand[] = [{ start: 0, len: verandaM, kind: "veranda" }, { start: topBandY0, len: maxTopDepth, kind: "row" }];
  if (hasBottom) {
    coreDepth.push({ start: topBandY0 + maxTopDepth, len: maxBottomDepth, kind: "row" });
    coreDepth.push({ start: bottomBandY1, len: verandaM, kind: "veranda" });
  }
  const depthBands: FPBand[] = [];
  if (minY < -1e-6) depthBands.push({ start: minY, len: -minY, kind: "stair" });
  depthBands.push(...coreDepth);
  if (maxY > blockDM + 1e-6) depthBands.push({ start: blockDM, len: maxY - blockDM, kind: "stair" });

  return {
    floors, floorIndex: floor, rpf, hasBottom, wallM, verandaM, roomGapM,
    rooms, verandas, stairs,
    blockWM: round(blockWM), blockDM: round(blockDM),
    totalLengthM, totalWidthM,
    bounds: { minX, minY, maxX, maxY },
    widthBands, depthBands,
    roomNos, loNo, hiNo,
  };
}
