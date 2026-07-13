/**
 * Labour Colony — construction floor-plan + plinth-beam geometry (spec §6/§7).
 *
 * Pure, framework-free. Given the structure config it produces the geometry for
 * a professional, dimensioned civil construction drawing modelled on a standard
 * double-banked labour-colony floor (two back-to-back room rows served by
 * peripheral verandas, with staircases at the ends) — the layout in the client
 * reference drawing. Also emits the plinth-beam grid (centre lines + marks) and
 * a beam schedule so the beam layout, the section detail and the BOQ all agree.
 *
 * Units: metres internally; callers display mm (×1000) as on construction sheets.
 */

import { type LabourColonyConfig } from "./labourColony";
import { type FoundationResult } from "./labourColonyCivil";

export type PlanSide = "top" | "bottom" | "left" | "right";

export interface PlanRoom {
  no: number;
  label: string;
  x: number; y: number; w: number; d: number; // metres, top-left origin
  doorSide: PlanSide;   // wall that faces the veranda (door + window here)
  row: "top" | "bottom";
}
export interface PlanRect { x: number; y: number; w: number; d: number; label?: string; }
export interface DimTick { start: number; len: number; label: string; }
export interface BeamSeg { x1: number; y1: number; x2: number; y2: number; mark: string; }
export interface BeamScheduleRow {
  mark: string; size: string; grade: string;
  topBars: string; bottomBars: string; stirrups: string;
  lengthM: number; count: number;
}

export interface ConstructionPlan {
  banked: "double" | "single";
  title: string;
  /** room-block bounds (excludes staircases that sit outside it) */
  blockW: number; blockD: number;
  /** overall incl. staircases */
  overallW: number; overallD: number;
  bays: number; rows: number;
  bayW: number; roomD: number; verandaW: number; stairW: number;
  wallM: number;
  rooms: PlanRoom[];
  verandas: PlanRect[];
  stairs: PlanRect[];
  widthChain: DimTick[];  // along the top (x)
  depthChain: DimTick[];  // along the left (y)
  colXs: number[];        // beam grid vertical line x-positions (metres)
  rowYs: number[];        // beam grid horizontal line y-positions (metres)
  beams: BeamSeg[];
  schedule: BeamScheduleRow[];
}

const round = (n: number, d = 2) => { const f = Math.pow(10, d); return Math.round((n + Number.EPSILON) * f) / f; };
const ceil = (n: number) => Math.ceil(n - 1e-9);
const mm = (m: number) => Math.round(m * 1000);

export interface PlanOptions {
  roomsPerFloor: number;
  startRoomNo?: number;
  floorLabel?: string;
  stairWidthM?: number;
  wallThicknessM?: number;
  staircasePosition?: "left" | "right" | "top" | "bottom" | "both";
}

/**
 * Build the construction-plan geometry from the structure config. The corridor
 * position picks the banking:
 *   center            -> double-banked, verandas on top & bottom (reference)
 *   top/bottom        -> single-banked, veranda on that long side
 *   left/right        -> single-banked, veranda on that short side (rotated)
 */
export function buildConstructionPlan(cfg: LabourColonyConfig, opts: PlanOptions): ConstructionPlan {
  const rpf = Math.max(1, opts.roomsPerFloor);
  const start = opts.startRoomNo ?? 1;
  const bayW = Math.max(1.5, cfg.roomLength);
  const roomD = Math.max(1.5, cfg.roomWidth);
  const verandaW = Math.max(0.6, cfg.corridorWidth);
  const stairW = Math.max(0.9, opts.stairWidthM ?? cfg.staircaseWidth ?? Math.max(1.0, verandaW));
  const wallM = opts.wallThicknessM ?? 0.115;
  const pos = cfg.corridorPosition ?? "center";
  const stairPos = opts.staircasePosition ?? cfg.staircasePosition ?? "both";
  const peripheral = pos === "both";   // verandas on BOTH long sides (reference)
  const central = pos === "center";    // one corridor between the two room rows
  const double = peripheral || central;
  const title = opts.floorLabel ?? "TYPICAL FLOOR PLAN";

  const rooms: PlanRoom[] = [];
  const verandas: PlanRect[] = [];

  if (double) {
    const bottomCount = ceil(rpf / 2);
    const topCount = rpf - bottomCount;
    const bays = Math.max(bottomCount, topCount, 1);
    const blockW = bays * bayW;

    let yTopRow: number, yBotRow: number, blockD: number;
    let topDoor: PlanSide, botDoor: PlanSide;
    let depthChain: DimTick[];
    let rowYs: number[];

    if (peripheral) {
      // VERANDA | top row | bottom row | VERANDA — doors face OUT to the verandas
      const yTopVer = 0;
      yTopRow = verandaW;
      yBotRow = verandaW + roomD;
      const yBotVer = verandaW + 2 * roomD;
      blockD = 2 * verandaW + 2 * roomD;
      verandas.push({ x: 0, y: yTopVer, w: blockW, d: verandaW, label: "VERANDA" });
      verandas.push({ x: 0, y: yBotVer, w: blockW, d: verandaW, label: "VERANDA" });
      topDoor = "top"; botDoor = "bottom";
      depthChain = [
        { start: yTopVer, len: verandaW, label: `${mm(verandaW)}` },
        { start: yTopRow, len: roomD, label: `${mm(roomD)}` },
        { start: yBotRow, len: roomD, label: `${mm(roomD)}` },
        { start: yBotVer, len: verandaW, label: `${mm(verandaW)}` },
      ];
      rowYs = [yTopRow, yTopRow + roomD, yTopRow + 2 * roomD].map((y) => round(y, 3));
    } else {
      // top row | CORRIDOR | bottom row — doors face IN to the central corridor
      yTopRow = 0;
      const yCor = roomD;
      yBotRow = roomD + verandaW;
      blockD = 2 * roomD + verandaW;
      verandas.push({ x: 0, y: yCor, w: blockW, d: verandaW, label: "CORRIDOR" });
      topDoor = "bottom"; botDoor = "top";
      depthChain = [
        { start: 0, len: roomD, label: `${mm(roomD)}` },
        { start: yCor, len: verandaW, label: `${mm(verandaW)}` },
        { start: yBotRow, len: roomD, label: `${mm(roomD)}` },
      ];
      rowYs = [0, roomD, roomD + verandaW, 2 * roomD + verandaW].map((y) => round(y, 3));
    }

    // bottom row numbered first (start..), top row next — matches reference numbering
    for (let i = 0; i < bottomCount; i++) {
      const no = start + i;
      rooms.push({ no, label: `ROOM - ${no}`, x: i * bayW, y: yBotRow, w: bayW, d: roomD, doorSide: botDoor, row: "bottom" });
    }
    for (let i = 0; i < topCount; i++) {
      const no = start + bottomCount + i;
      rooms.push({ no, label: `ROOM - ${no}`, x: i * bayW, y: yTopRow, w: bayW, d: roomD, doorSide: topDoor, row: "top" });
    }

    const stairs = placeStairs(stairPos, { blockW, blockD, stairW, roomD, topRowY: yTopRow, bottomRowY: yBotRow });
    const b = extent([...rooms, ...verandas, ...stairs]);

    const widthChain: DimTick[] = [];
    for (let i = 0; i < bays; i++) widthChain.push({ start: i * bayW, len: bayW, label: `${mm(bayW)}` });

    const colXs: number[] = [];
    for (let i = 0; i <= bays; i++) colXs.push(round(i * bayW, 3));

    const { beams, schedule } = buildBeams(colXs, rowYs, bayW, roomD, bays, opts.floorLabel);

    return {
      banked: "double", title, blockW: round(blockW), blockD: round(blockD),
      overallW: round(b.maxX - b.minX), overallD: round(b.maxY - b.minY), bays, rows: 2,
      bayW: round(bayW), roomD: round(roomD), verandaW: round(verandaW), stairW: round(stairW), wallM,
      rooms, verandas, stairs, widthChain, depthChain, colXs, rowYs, beams, schedule,
    };
  }

  // ---- single-banked (top/bottom/left/right) ----
  const bays = rpf;
  const blockW = bays * bayW;
  const verandaTop = pos === "top" || pos === "left";
  const yVer = verandaTop ? 0 : roomD;
  const yRoom = verandaTop ? verandaW : 0;
  const blockD = verandaW + roomD;
  verandas.push({ x: 0, y: yVer, w: blockW, d: verandaW, label: "VERANDA" });
  for (let i = 0; i < bays; i++) {
    const no = start + i;
    rooms.push({ no, label: `ROOM - ${no}`, x: i * bayW, y: yRoom, w: bayW, d: roomD, doorSide: verandaTop ? "top" : "bottom", row: "top" });
  }
  const stairs = placeStairs(stairPos, { blockW, blockD, stairW, roomD, topRowY: yRoom, bottomRowY: yRoom });
  const widthChain: DimTick[] = [];
  for (let i = 0; i < bays; i++) widthChain.push({ start: i * bayW, len: bayW, label: `${mm(bayW)}` });
  const depthChain: DimTick[] = verandaTop
    ? [{ start: 0, len: verandaW, label: `${mm(verandaW)}` }, { start: verandaW, len: roomD, label: `${mm(roomD)}` }]
    : [{ start: 0, len: roomD, label: `${mm(roomD)}` }, { start: roomD, len: verandaW, label: `${mm(verandaW)}` }];
  const colXs: number[] = [];
  for (let i = 0; i <= bays; i++) colXs.push(round(i * bayW, 3));
  const rowYs = [round(yRoom, 3), round(yRoom + roomD, 3)];
  const { beams, schedule } = buildBeams(colXs, rowYs, bayW, roomD, bays, opts.floorLabel);
  const bs = extent([...rooms, ...verandas, ...stairs]);
  return {
    banked: "single", title, blockW: round(blockW), blockD: round(blockD),
    overallW: round(bs.maxX - bs.minX), overallD: round(bs.maxY - bs.minY), bays, rows: 1,
    bayW: round(bayW), roomD: round(roomD), verandaW: round(verandaW), stairW: round(stairW), wallM,
    rooms, verandas, stairs, widthChain, depthChain, colXs, rowYs, beams, schedule,
  };
}

/** Extent (bounding box) over a set of rects, tolerant of an empty set. */
function extent(rects: Array<{ x: number; y: number; w: number; d: number }>) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.d);
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  return { minX, minY, maxX, maxY };
}

type StairPos = "left" | "right" | "top" | "bottom" | "both";
/** Place staircase block(s) OUTSIDE the room block on the chosen side(s). */
function placeStairs(
  pos: StairPos,
  g: { blockW: number; blockD: number; stairW: number; roomD: number; topRowY: number; bottomRowY: number },
): PlanRect[] {
  const S = g.stairW;
  const run = Math.max(3.0, g.roomD);
  const mk = (x: number, y: number, w: number, d: number): PlanRect => ({ x, y, w, d, label: "STAIRCASE" });
  const cxRun = Math.max(0, (g.blockW - run) / 2);
  const cyRun = Math.max(0, (g.blockD - run) / 2);
  switch (pos) {
    case "left": return [mk(-S, cyRun, S, Math.min(run, g.blockD))];
    case "right": return [mk(g.blockW, cyRun, S, Math.min(run, g.blockD))];
    case "top": return [mk(cxRun, -S, Math.min(run, g.blockW), S)];
    case "bottom": return [mk(cxRun, g.blockD, Math.min(run, g.blockW), S)];
    case "both":
    default:
      // reference: left staircase at the lower row, right staircase at the upper row
      return [mk(-S, g.bottomRowY, S, g.roomD), mk(g.blockW, g.topRowY, S, g.roomD)];
  }
}

function buildBeams(colXs: number[], rowYs: number[], bayW: number, roomD: number, bays: number, floorLabel?: string) {
  const beams: BeamSeg[] = [];
  const x0 = colXs[0], x1 = colXs[colXs.length - 1];
  const y0 = rowYs[0], y1 = rowYs[rowYs.length - 1];
  // horizontal beams along each wall line: outermost = PB1, internal = PB2
  rowYs.forEach((y, j) => {
    const mark = j === 0 || j === rowYs.length - 1 ? "PB1" : "PB2";
    beams.push({ x1: x0, y1: y, x2: x1, y2: y, mark });
  });
  // vertical beams at each column line: outermost = PB1, internal = PB2
  colXs.forEach((x, i) => {
    const mark = i === 0 || i === colXs.length - 1 ? "PB1" : "PB2";
    beams.push({ x1: x, y1: y0, x2: x, y2: y1, mark });
  });
  return { beams, schedule: [] as BeamScheduleRow[] };
}

/**
 * Beam schedule derived from the foundation section (single source with the section drawing).
 *
 * PB1 = the outermost (peripheral) grid line in each direction, PB2 = the internal lines — same
 * bar spec for both (a heavier PB1 was previously modelled as "+1 bar" but that extra bar was never
 * taken off in the BAR BENDING SCHEDULE, so the drawn section and the priced steel disagreed; PB1 and
 * PB2 now share one spec, matching what is actually billed).
 *
 * Rows are DIRECTION-SPECIFIC (X runs vs Y runs) so `Σ(lengthM × count)` is the TRUE total plinth-beam
 * length — `rowYs.length × spanX + colXs.length × spanY` — identical to `grid.plinthBeamLengthM` in
 * labourColonyCivil.ts (one grid, one length, no way for the drawing and the BOQ to disagree).
 */
export function buildBeamSchedule(plan: ConstructionPlan, section: FoundationResult["section"]): BeamScheduleRow[] {
  const w = mm(section.plinthBeamWidthM);
  const d = mm(section.plinthBeamDepthM);
  const dia = section.mainBarDiaMm ?? 12;
  const top = section.topBars ?? 2;
  const bot = section.bottomBars ?? 2;
  const stirDia = section.stirrupDiaMm ?? 8;
  const stirSp = section.stirrupSpacingMm ?? 150;
  const grade = section.grade;

  const colXs = plan.colXs, rowYs = plan.rowYs;
  if (colXs.length < 2 || rowYs.length < 2) return [];
  const spanX = colXs[colXs.length - 1] - colXs[0];
  const spanY = rowYs[rowYs.length - 1] - rowYs[0];
  const innerH = Math.max(0, rowYs.length - 2);   // internal horizontal runs, each length spanX
  const innerV = Math.max(0, colXs.length - 2);   // internal vertical runs, each length spanY

  const bars = { topBars: `${top}-T${dia}`, bottomBars: `${bot}-T${dia}` };
  const stirrups = `T${stirDia} @ ${stirSp} c/c`;
  const row = (mark: string, lengthM: number, count: number): BeamScheduleRow => ({
    mark, size: `${w} × ${d}`, grade, ...bars, stirrups, lengthM: round(lengthM), count,
  });

  return [
    row("PB1-X", spanX, 2),      // 2 outer horizontal grid lines (perimeter)
    row("PB1-Y", spanY, 2),      // 2 outer vertical grid lines (perimeter)
    row("PB2-X", spanX, innerH), // internal horizontal grid lines
    row("PB2-Y", spanY, innerV), // internal vertical grid lines
  ].filter((r) => r.count > 0 && r.lengthM > 0);
}

/** Total bay-segments in the plinth-beam grid — each segment has 2 support faces (one at each end).
 *  Used to size the closer stirrup spacing at supports vs the nominal spacing at midspan. */
export function beamSpanCount(colXs: number[], rowYs: number[]): number {
  const cols = colXs.length, rows = rowYs.length;
  if (cols < 2 || rows < 2) return 0;
  return rows * (cols - 1) + cols * (rows - 1);
}

/** Standard construction notes + material specifications for the sheet. */
export function constructionNotes(section: FoundationResult["section"], floors: number): string[] {
  const dia = section.mainBarDiaMm ?? 12;
  const stirDia = section.stirrupDiaMm ?? 8;
  const stirSp = section.stirrupSpacingMm ?? 150;
  return [
    `All dimensions are in millimetres (mm) unless noted otherwise.`,
    `Concrete: PCC 1:4:8 for levelling bed; RCC ${section.grade} for footings, pedestals and plinth beams.`,
    `Reinforcement: Fe500 TMT — main bars T${dia}, stirrups T${stirDia} @ ${stirSp} mm c/c.`,
    `Clear cover: 50 mm to footings, 40 mm to plinth beams / pedestals.`,
    `PCC bed thickness ${section.pccThicknessMm} mm below all footings; anti-termite treatment before PCC.`,
    `Raised plinth ${mm(section.raisedPlinthHeightM)} mm filled with approved murrum/soil in 150 mm layers, well compacted.`,
    `Footing size ${mm(section.footingLengthM)} × ${mm(section.footingLengthM)} mm; pedestal ${mm(section.pedestalSizeM)} mm sq.`,
    `Verandas provide access and act as emergency egress; keep clear of obstructions at all times.`,
    floors >= 2
      ? `G+${floors - 1} structure: footing depth, reinforcement and beam sizes MUST be confirmed by a structural engineer per soil-bearing capacity and loads.`
      : `Single-storey temporary colony: RCC/PCC pedestals with raised plinth and peripheral drainage recommended.`,
    `Provide DPC (damp-proof course) at plinth level. Backfill and cure concrete min. 7 days before loading.`,
    `Do not scale the drawing; build to written dimensions. Verify all levels at site before excavation.`,
  ];
}

export { mm as toMM };
