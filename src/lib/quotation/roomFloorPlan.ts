/**
 * Room-wise floor-plan GEOMETRY for the Labour Colony calculator (pure, framework-free).
 *
 * Everything is computed in METRES (top-left origin; staircases & side verandas may sit at
 * negative x/y). The React drawing scales metres → pixels and formats every label through the
 * selected length unit (see ./units). Single source of truth for the live drawing, the
 * dimension chains and the TOTAL COLONY length & width.
 *
 * Reference layout: two rows of room modules BACK-TO-BACK, each opening onto a peripheral
 * VERANDA. Both the verandas/corridors and the staircases are MANAGED LISTS — any number of
 * each, on any side, individually sized, positioned (shift x/y) and (for verandas) railed.
 * Staircases are always kept OUTSIDE the room block and beyond same-side verandas, and
 * same-side staircases are auto-separated, so nothing overlaps the rooms. Drawing only — it
 * never changes the engine quantities or the BOQ.
 */

import type {
  LabourColonyResult,
  RoomFloorPlanConfig,
  RoomOpeningOverride,
  StaircaseDrawConfig,
  VerandaDrawConfig,
} from "./labourColony";

const M2FT = 3.280839895;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const round = (n: number, d = 3) => { const f = Math.pow(10, d); return Math.round((n + Number.EPSILON) * f) / f; };
const ft2m = (ft: number) => ft / M2FT;

type Side = "top" | "bottom" | "left" | "right";

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
  doorHM: number;      // door height (schedule/caption only; plan is 2D)
  winWM: number;
  hinge: "left" | "right";
}

export interface FPRect { x: number; y: number; w: number; d: number; label?: string; }

export interface FPVeranda {
  id: string;
  x: number; y: number; w: number; d: number; // footprint (metres)
  side: Side;
  railing: boolean;
  label: string;
}

export interface FPStairStep { a: number; b: number; } // [start,end] along the run from the ENTRY end (metres)

export interface FPStair {
  id: string;
  label: string;
  x: number; y: number; w: number; d: number;       // footprint (metres)
  orientation: "vertical" | "horizontal";
  side: Side;
  entry: "left" | "right";
  direction: "up" | "down";
  runM: number; widthM: number; landingM: number;
  steps: number; treadM: number; goingM: number; riserMm: number; gapM: number;
  stepEdges: FPStairStep[];
  offsetToWallM: number;   // gap from the stair to the building's OUTER edge on that side (0 = flush)
  offsetToCornerM: number; // gap from the stair's near end to the nearest block corner (along the wall)
  overlap: boolean;        // true if it still overlaps another element after auto-separation
}

export type FPBandKind = "room" | "gap" | "stair" | "veranda" | "row";
export interface FPBand { start: number; len: number; kind: FPBandKind; }

export interface RoomFloorPlanGeom {
  floors: number;
  floorIndex: number;
  rpf: number;
  hasBottom: boolean;
  wallM: number;               // drawn wall / panel thickness
  verandaM: number;            // base/default veranda depth (for UI defaults)
  roomGapM: number;
  rooms: FPRoom[];
  verandas: FPVeranda[];
  stairs: FPStair[];
  overlaps: string[];          // human-readable overlap warnings
  blockWM: number; blockDM: number;   // room block (excl. verandas beyond it & staircases)
  totalLengthM: number;               // TOTAL COLONY length (x, incl. side verandas & staircases)
  totalWidthM: number;                // TOTAL COLONY width  (y, incl. verandas + staircases)
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  widthBands: FPBand[];               // x-axis dimension chain
  depthBands: FPBand[];               // y-axis dimension chain
  roomNos: number[]; loNo: number | null; hiNo: number | null;
}

/* ---------------------------------------------------------------- helpers */

/** Effective, clamped staircase parameters from a (possibly partial) config. */
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
  const dxM = Number.isFinite(s.dxM) ? (s.dxM as number) : 0;
  const dyM = Number.isFinite(s.dyM) ? (s.dyM as number) : 0;
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
  return { enabled, position, offsetM, dxM, dyM, widthM, steps, treadM, gapM, riserMm, runM, goingM, landingM, entry, direction, overridden };
}

/** The effective, editable list of staircases (migrates the legacy single `staircase`). */
export function effectiveStaircases(
  conf: RoomFloorPlanConfig,
  floors: number,
): StaircaseDrawConfig[] {
  // An explicit array (even empty, after deleting them all) is honored; only migrate when truly absent.
  if (Array.isArray(conf.staircases)) return conf.staircases;
  const s = conf.staircase;
  if (s) {
    if ((s.position ?? "both") === "both") {
      return [
        { ...s, id: "stair-r", label: "Staircase A", position: "right" },
        { ...s, id: "stair-l", label: "Staircase B", position: "left" },
      ];
    }
    return [{ ...s, id: "stair-1", label: s.label ?? "Staircase A" }];
  }
  if (floors > 1) {
    return [
      { id: "stair-r", label: "Staircase A", position: "right" },
      { id: "stair-l", label: "Staircase B", position: "left" },
    ];
  }
  return [{ id: "stair-1", label: "Staircase A", position: "right", enabled: false }];
}

/** The effective, editable list of verandas/corridors (migrates the peripheral defaults). */
export function effectiveVerandas(conf: RoomFloorPlanConfig, hasBottom: boolean): VerandaDrawConfig[] {
  // An explicit array (even empty, after deleting them all) is honored; only migrate when truly absent.
  if (Array.isArray(conf.verandas)) return conf.verandas;
  const railing = conf.showRailing ?? true;
  const arr: VerandaDrawConfig[] = [{ id: "ver-top", label: "Top veranda", side: "top", railing }];
  if (hasBottom) arr.push({ id: "ver-bot", label: "Bottom veranda", side: "bottom", railing });
  return arr;
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

const rectsOverlap = (a: FPRect, b: FPRect, tol = 1e-4) =>
  a.x + a.w > b.x + tol && b.x + b.w > a.x + tol && a.y + a.d > b.y + tol && b.y + b.d > a.y + tol;

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
  const minClearM = Math.max(0, conf.minClearanceM ?? 0.1524); // 6" default; keeps openings off corners & apart

  const overrideOf = (no: number): RoomOpeningOverride => conf.rooms?.[no] ?? {};
  const lenOf = (no: number) => { const o = overrideOf(no).lengthM; return o && o > 0 ? Math.max(1.0, o) : globalLenM; };
  const depthOf = (no: number) => { const o = overrideOf(no).depthM; return o && o > 0 ? Math.max(1.0, o) : globalDepthM; };

  const maxTopDepth = topNos.length ? Math.max(...topNos.map(depthOf)) : globalDepthM;
  const maxBottomDepth = bottomNos.length ? Math.max(...bottomNos.map(depthOf)) : 0;

  /* ---------------- verandas → drive the room block depth ---------------- */
  const verCfgs = effectiveVerandas(conf, hasBottom).filter((v) => v.enabled ?? true);
  const depthOfVer = (v: VerandaDrawConfig) => Math.max(0.3, v.widthM && v.widthM > 0 ? v.widthM : verandaM);
  const maxSideDepth = (side: Side) =>
    verCfgs.filter((v) => (v.side ?? "top") === side).reduce((m, v) => Math.max(m, depthOfVer(v)), 0);
  const topVerM = maxSideDepth("top");
  const botVerM = maxSideDepth("bottom");
  const leftVerM = maxSideDepth("left");
  const rightVerM = maxSideDepth("right");

  // block depth (y): top veranda + top band + [bottom band] + bottom veranda
  const blockDM = topVerM + maxTopDepth + (hasBottom ? maxBottomDepth : 0) + botVerM;
  const topBandY0 = topVerM;                          // top rooms align to the top veranda
  const bottomBandY1 = blockDM - botVerM;             // bottom rooms align to the bottom veranda

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
  const doorHBaseM = Math.max(1.5, conf.doorHeightM ?? 2.0);

  const rooms: FPRoom[] = [];
  const placeRoom = (no: number, x: number, row: "top" | "bottom") => {
    const L = lenOf(no);
    const dep = depthOf(no);
    const o = overrideOf(no);
    const wantDoorWM = o.doorWidthM && o.doorWidthM > 0 ? o.doorWidthM : doorWBaseM;
    let doorWM = clamp(wantDoorWM, 0.4, Math.max(0.4, Math.min(L - 0.15, dep * 0.9)));
    const doorHM = o.doorHeightM && o.doorHeightM > 0 ? o.doorHeightM : doorHBaseM;
    let winWM = clamp(winWBaseM, 0.5, Math.max(0.5, L - 0.15));
    // If the wall is too short to hold BOTH openings with clearance, shrink both proportionally so
    // they can sit side-by-side without overlapping (degenerate very-narrow rooms only).
    const needed = doorWM + winWM + 3 * minClearM;
    if (needed > L && doorWM + winWM > 0) {
      const avail = Math.max(0.2, L - 3 * minClearM);
      const shrink = Math.min(1, avail / (doorWM + winWM));
      doorWM *= shrink; winWM *= shrink;
    }
    // Keep each opening a minimum clearance `c` off the room's corners/partitions. Shrink c if the
    // wall is too short to honour it on both sides of the widest opening.
    const c = Math.max(0, Math.min(minClearM, (L - Math.max(doorWM, winWM)) / 2 - 1e-6));
    const doorLo = c, doorHi = Math.max(c, L - doorWM - c);
    const winLo = c, winHi = Math.max(c, L - winWM - c);
    const defWin = clamp(Math.max(c, 0.1 * L), winLo, winHi);
    const defDoor = clamp(L - 0.1 * L - doorWM, doorLo, doorHi);
    let doorFromLeftM = clamp(o.doorFromLeftFt != null ? ft2m(o.doorFromLeftFt) : defDoor, doorLo, doorHi);
    let winFromLeftM = clamp(o.windowFromLeftFt != null ? ft2m(o.windowFromLeftFt) : defWin, winLo, winHi);
    // No door/window overlap: window sits left, door right, separated by clearance `c`.
    if (winFromLeftM + winWM + c > doorFromLeftM) {
      if (winFromLeftM + winWM + c <= doorHi) doorFromLeftM = winFromLeftM + winWM + c;
      else if (doorFromLeftM - c - winWM >= winLo) winFromLeftM = doorFromLeftM - c - winWM;
      else { winFromLeftM = winLo; doorFromLeftM = doorHi; }
    }
    const hinge: "left" | "right" = o.doorHinge ?? "left";
    if (row === "top") {
      rooms.push({ no, row, x, y: topBandY0, w: L, d: dep, wallY: topBandY0, into: 1, doorFromLeftM, winFromLeftM, doorWM, doorHM, winWM, hinge });
    } else {
      rooms.push({ no, row, x, y: bottomBandY1 - dep, w: L, d: dep, wallY: bottomBandY1, into: -1, doorFromLeftM, winFromLeftM, doorWM, doorHM, winWM, hinge });
    }
  };
  topNos.forEach((no, i) => placeRoom(no, top.xs[i], "top"));
  bottomNos.forEach((no, i) => placeRoom(no, bottom.xs[i], "bottom"));

  /* ---------------- veranda rects ---------------- */
  const verandas: FPVeranda[] = [];
  verCfgs.forEach((v, i) => {
    const side = v.side ?? "top";
    const dep = depthOfVer(v);
    const railing = v.railing ?? true;
    const along = Math.max(0, v.offsetM ?? 0);
    const label = v.label ?? (side === "top" || side === "bottom" ? "VERANDA" : "CORRIDOR");
    const id = v.id ?? `ver-${i}`;
    if (side === "top") {
      const len = v.lengthM && v.lengthM > 0 ? v.lengthM : blockWM;
      verandas.push({ id, x: along, y: topVerM - dep, w: len, d: dep, side, railing, label });
    } else if (side === "bottom") {
      const len = v.lengthM && v.lengthM > 0 ? v.lengthM : blockWM;
      verandas.push({ id, x: along, y: bottomBandY1, w: len, d: dep, side, railing, label });
    } else if (side === "left") {
      const len = v.lengthM && v.lengthM > 0 ? v.lengthM : blockDM;
      verandas.push({ id, x: -dep, y: along, w: dep, d: len, side, railing, label });
    } else {
      const len = v.lengthM && v.lengthM > 0 ? v.lengthM : blockDM;
      verandas.push({ id, x: blockWM, y: along, w: dep, d: len, side, railing, label });
    }
  });

  /* ---------------- staircases ---------------- */
  const stairCfgs = effectiveStaircases(conf, floors);
  const stairs: FPStair[] = [];
  const stairRects: FPRect[] = []; // for same-side auto-separation
  stairCfgs.forEach((sc, i) => {
    const sr = resolveStair(sc, floors, verandaM, cfg.staircasePosition, cfg.staircaseWidth);
    if (!sr.enabled) return;
    const posSide: Side = sr.position === "both" ? (i % 2 === 0 ? "right" : "left") : sr.position;
    const vertical = posSide === "left" || posSide === "right";
    const longM = sr.runM + sr.landingM;
    const w = vertical ? sr.widthM : longM;
    const d = vertical ? longM : sr.widthM;
    const edges = stepEdges(sr.steps, sr.runM, sr.treadM, sr.gapM, sr.overridden);

    // anchor OUTSIDE the room block, beyond any same-side veranda; centred on the wall.
    let x: number, y: number;
    // Anchor flush against the building's OUTER edge on each side. Top/bottom verandas sit
    // INSIDE the block (block edges y=0 / y=blockDM are the veranda outer edges), so a top/bottom
    // stair anchors at y=-d / y=blockDM. Left/right verandas sit OUTSIDE, so anchor beyond them.
    if (posSide === "left") { x = -leftVerM - w; y = (blockDM - d) / 2; }
    else if (posSide === "right") { x = blockWM + rightVerM; y = (blockDM - d) / 2; }
    else if (posSide === "top") { x = (blockWM - w) / 2; y = -d; }
    else { x = (blockWM - w) / 2; y = blockDM; }

    // apply legacy along-wall slide + free dx/dy movement
    x += sr.dxM + (vertical ? 0 : sr.offsetM);
    y += sr.dyM + (vertical ? sr.offsetM : 0);

    // clamp on the axis that faces the block so a stair can never enter the rooms/verandas
    if (posSide === "left") x = Math.min(x, -leftVerM - w);
    else if (posSide === "right") x = Math.max(x, blockWM + rightVerM);
    else if (posSide === "top") y = Math.min(y, -d);          // stay above the block's top edge
    else y = Math.max(y, blockDM);                            // stay below the block's bottom edge

    // auto-separate from already-placed staircases (push along the wall / free axis)
    let guard = 0;
    while (guard++ < 100) {
      const me: FPRect = { x, y, w, d };
      const hit = stairRects.find((r) => rectsOverlap(me, r));
      if (!hit) break;
      if (vertical) y = hit.y + hit.d + 0.05; else x = hit.x + hit.w + 0.05;
    }
    stairRects.push({ x, y, w, d });

    // gap from the staircase to the building's OUTER edge on that side (0 when flush; grows as it moves away)
    const offsetToWallM =
      posSide === "left" ? Math.max(0, -leftVerM - (x + w))
      : posSide === "right" ? Math.max(0, x - (blockWM + rightVerM))
      : posSide === "top" ? Math.max(0, 0 - (y + d))
      : Math.max(0, y - blockDM);
    const nearStart = vertical ? y : x;
    const farEnd = vertical ? y + d : x + w;
    const blockAlong = vertical ? blockDM : blockWM;
    const offsetToCornerM = Math.max(0, Math.min(Math.abs(nearStart - 0), Math.abs(blockAlong - farEnd)));

    stairs.push({
      id: sc.id ?? `stair-${i}`, label: sc.label ?? `Staircase ${i + 1}`,
      x, y, w, d, orientation: vertical ? "vertical" : "horizontal", side: posSide,
      entry: sr.entry, direction: sr.direction,
      runM: sr.runM, widthM: sr.widthM, landingM: sr.landingM,
      steps: sr.steps, treadM: sr.treadM, goingM: sr.goingM, riserMm: sr.riserMm, gapM: sr.gapM,
      stepEdges: edges, offsetToWallM: round(offsetToWallM), offsetToCornerM: round(offsetToCornerM), overlap: false,
    });
  });

  /* ---------------- overlap detection (rooms never overlap by construction) ---------------- */
  const overlaps: string[] = [];
  // stair ↔ veranda and stair ↔ stair (cross-side corner cases), veranda ↔ veranda
  const named: { r: FPRect; name: string; kind: "stair" | "veranda" }[] = [
    ...stairs.map((s) => ({ r: s as FPRect, name: s.label, kind: "stair" as const })),
    ...verandas.map((v) => ({ r: v as FPRect, name: v.label, kind: "veranda" as const })),
  ];
  for (let a = 0; a < named.length; a++) {
    for (let b = a + 1; b < named.length; b++) {
      if (rectsOverlap(named[a].r, named[b].r)) {
        overlaps.push(`${named[a].name} overlaps ${named[b].name}`);
        if (named[a].kind === "stair") { const s = stairs.find((s) => s.label === named[a].name); if (s) s.overlap = true; }
        if (named[b].kind === "stair") { const s = stairs.find((s) => s.label === named[b].name); if (s) s.overlap = true; }
      }
    }
  }

  /* ---------------- bounds + totals ---------------- */
  const allRects: FPRect[] = [...rooms, ...verandas, ...stairs];
  let minX = 0, minY = 0, maxX = blockWM, maxY = blockDM;
  for (const r of allRects) {
    minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.d);
  }
  const totalLengthM = round(maxX - minX);
  const totalWidthM = round(maxY - minY);

  /* ---------------- dimension chains ---------------- */
  // width (x): [left extension] + reference row (rooms + gaps) + [right extension]
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

  // depth (y): [top extension] + top veranda + top row + [bottom row + bottom veranda] + [bottom extension]
  const coreDepth: FPBand[] = [];
  if (topVerM > 1e-6) coreDepth.push({ start: 0, len: topVerM, kind: "veranda" });
  coreDepth.push({ start: topBandY0, len: maxTopDepth, kind: "row" });
  if (hasBottom) coreDepth.push({ start: topBandY0 + maxTopDepth, len: maxBottomDepth, kind: "row" });
  if (botVerM > 1e-6) coreDepth.push({ start: bottomBandY1, len: botVerM, kind: "veranda" });
  const depthBands: FPBand[] = [];
  if (minY < -1e-6) depthBands.push({ start: minY, len: -minY, kind: "stair" });
  depthBands.push(...coreDepth);
  if (maxY > blockDM + 1e-6) depthBands.push({ start: blockDM, len: maxY - blockDM, kind: "stair" });

  return {
    floors, floorIndex: floor, rpf, hasBottom, wallM, verandaM, roomGapM,
    rooms, verandas, stairs, overlaps,
    blockWM: round(blockWM), blockDM: round(blockDM),
    totalLengthM, totalWidthM,
    bounds: { minX, minY, maxX, maxY },
    widthBands, depthBands,
    roomNos, loNo, hiNo,
  };
}
