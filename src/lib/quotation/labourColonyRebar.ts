/**
 * STRUCTURAL DETAILING for the Labour Colony construction drawings (pure, framework-free).
 *
 * Everything a builder needs that the civil engine did not previously produce:
 *   • development length (Ld), tension & compression lap lengths, bend/hook anchorage allowances
 *   • footing reinforcement mesh (bar dia, c/c spacing, bar counts, bottom + optional top mesh)
 *   • column / pedestal reinforcement schedule (vertical bars, ties, tie spacing, cover)
 *   • beam reinforcement with anchorage into the support
 *   • a real SOIL BEARING CAPACITY check — the footing is sized against the SBC, not just labelled
 *   • column marks (C1, C2 …) on the structural grid
 *
 * Codes used (stated on the drawing so it can be checked):
 *   IS 456:2000 Cl. 26.2.1 — development length  Ld = φ·σs / (4·τbd),  σs = 0.87·fy
 *   IS 456:2000 Table  —  design bond stress τbd for plain bars, ×1.6 for HYSD/deformed bars
 *   IS 456:2000 Cl. 26.2.5.1 — tension lap ≥ Ld or 30φ, compression lap ≥ Ld(comp) or 24φ
 *   IS 2502 — standard bend/hook allowances
 *
 * THIS IS NOT A STAMPED DESIGN. It produces code-consistent detailing from the entered sizes so a
 * quotation drawing is buildable-looking and internally consistent; a qualified structural engineer
 * must still verify loads, soil data and bar sizes before execution.
 */

import type { RccGrade, FoundationResult } from "./labourColonyCivil";

export type SteelGrade = "Fe415" | "Fe500" | "Fe550";
export const STEEL_GRADES: SteelGrade[] = ["Fe415", "Fe500", "Fe550"];

/** Characteristic yield strength, N/mm². */
const FY: Record<SteelGrade, number> = { Fe415: 415, Fe500: 500, Fe550: 550 };

/** IS 456 design bond stress τbd for PLAIN bars in tension (N/mm²). */
const TAU_BD_PLAIN: Record<RccGrade, number> = { M15: 1.0, M20: 1.2, M25: 1.4, M30: 1.5 };
/** HYSD / TMT deformed bars: τbd increased by 60% (IS 456 Cl. 26.2.1.1). */
const DEFORMED_FACTOR = 1.6;
/** In COMPRESSION τbd may be increased by 25% (IS 456 Cl. 26.2.1.1). */
const COMPRESSION_FACTOR = 1.25;

const round = (n: number, d = 0) => { const f = Math.pow(10, d); return Math.round(n * f) / f; };
/**
 * Clamp that is NaN-proof. Math.min(Math.max(NaN, lo), hi) is NaN, so a single bad number crossing
 * a module boundary would otherwise render an entire drawing as "NaN mm". Non-finite → `fallback`.
 */
const clamp = (v: number, lo: number, hi: number, fallback = lo) =>
  Math.min(Math.max(Number.isFinite(v) ? v : fallback, lo), hi);
/** Round a bar length UP to the next 10 mm — you cannot cut steel finer on site. */
const up10 = (mm: number) => Math.ceil(Math.max(0, Number.isFinite(mm) ? mm : 0) / 10) * 10;

/* ------------------------------------------------------------------ anchorage */

export interface AnchorageSet {
  /** Bar diameter this set was computed for (mm). */
  diaMm: number;
  /** Development length in TENSION (mm) and as a multiple of the bar diameter. */
  ldMm: number; ldMultiple: number;
  /** Development length in COMPRESSION (mm) — τbd is 25% higher, so Ld is 20% shorter. */
  ldCompMm: number; ldCompMultiple: number;
  /** Lap splice in tension: ≥ Ld or 30φ (IS 456 Cl. 26.2.5.1). */
  lapTensionMm: number;
  /** Lap splice in compression: ≥ Ld(comp) or 24φ. */
  lapCompressionMm: number;
  /** Straight anchorage past the face of the support, at a 90° bend (IS 2502 allowance = 8φ). */
  bend90Mm: number;
  /** Hook allowance for a 135° stirrup/tie hook: 10φ, min 75 mm. */
  hook135Mm: number;
}

/**
 * Development length and the lap/anchorage set that follows from it.
 * Ld = φ · 0.87·fy / (4 · τbd) — e.g. Fe500 + M20 + T16 → 16 × 435 / (4 × 1.92) = 906 mm ≈ 57φ.
 */
export function anchorageFor(diaMm: number, concrete: RccGrade, steel: SteelGrade): AnchorageSet {
  const dia = Math.max(6, diaMm);
  const sigmaS = 0.87 * FY[steel];
  const tauT = TAU_BD_PLAIN[concrete] * DEFORMED_FACTOR;          // tension
  const tauC = tauT * COMPRESSION_FACTOR;                          // compression
  const ld = (dia * sigmaS) / (4 * tauT);
  const ldC = (dia * sigmaS) / (4 * tauC);
  return {
    diaMm: dia,
    ldMm: up10(ld), ldMultiple: round(ld / dia),
    ldCompMm: up10(ldC), ldCompMultiple: round(ldC / dia),
    lapTensionMm: up10(Math.max(ld, 30 * dia)),
    lapCompressionMm: up10(Math.max(ldC, 24 * dia)),
    bend90Mm: up10(8 * dia),
    hook135Mm: up10(Math.max(10 * dia, 75)),
  };
}

/* ------------------------------------------------------------ bearing / SBC */

export interface BearingCheck {
  /** Safe bearing capacity of the soil used for the design (kN/m²). */
  sbcKnm2: number;
  /** Design load intensity assumed per square metre of built-up area (kN/m²). */
  loadPerSqmKn: number;
  /** Total built-up area carried by the foundation (sqm, all floors). */
  builtUpSqm: number;
  /** Total service load on the foundation (kN) and the share carried by ONE column. */
  totalLoadKn: number;
  perColumnKn: number;
  columnCount: number;
  /** The footing actually specified. */
  footingSideM: number;
  footingAreaSqm: number;
  /** Pressure the specified footing delivers to the soil, and how hard it works the SBC. */
  bearingPressureKnm2: number;
  utilisation: number;          // pressure / SBC — > 1 means overstressed
  /** The smallest square footing that would satisfy the SBC. */
  requiredAreaSqm: number;
  requiredSideM: number;
  adequate: boolean;
}

/**
 * Size the footing against the soil, instead of merely printing an SBC number.
 * Service load per column = (built-up area × load intensity) / number of columns;
 * bearing pressure = that load / the specified footing area; it must not exceed the SBC.
 */
export function checkBearing(args: {
  sbcKnm2: number;
  loadPerSqmKn: number;
  builtUpSqm: number;
  columnCount: number;
  footingSideM: number;
}): BearingCheck {
  // Every input crosses a module boundary, and Math.max(1, undefined) is NaN — which would render
  // the whole bearing panel as "NaN kN/m²". Coerce to a finite value BEFORE clamping.
  const fin = (v: number, fallback: number) => (Number.isFinite(v) && v > 0 ? v : fallback);
  const sbc = Math.max(20, fin(args.sbcKnm2, 150));
  const q = Math.max(1, fin(args.loadPerSqmKn, 5));
  const area = Math.max(1, fin(args.builtUpSqm, 1));
  const n = Math.max(1, Math.round(fin(args.columnCount, 1)));
  const side = Math.max(0.3, fin(args.footingSideM, 1));

  const totalLoadKn = area * q;
  const perColumnKn = totalLoadKn / n;
  const footingAreaSqm = side * side;
  const bearingPressureKnm2 = perColumnKn / footingAreaSqm;
  const requiredAreaSqm = perColumnKn / sbc;
  const requiredSideM = Math.sqrt(requiredAreaSqm);

  return {
    sbcKnm2: sbc, loadPerSqmKn: q, builtUpSqm: round(area, 1),
    totalLoadKn: round(totalLoadKn), perColumnKn: round(perColumnKn, 1), columnCount: n,
    footingSideM: round(side, 2), footingAreaSqm: round(footingAreaSqm, 2),
    bearingPressureKnm2: round(bearingPressureKnm2, 1),
    utilisation: round(bearingPressureKnm2 / sbc, 2),
    requiredAreaSqm: round(requiredAreaSqm, 2),
    requiredSideM: round(Math.ceil(requiredSideM * 20) / 20, 2),   // round up to the next 50 mm
    adequate: bearingPressureKnm2 <= sbc + 1e-6,
  };
}

/* ------------------------------------------------------------- column marks */

export type ColumnKind = "corner" | "edge" | "internal";

/** One physical column on the structural grid, with its drawing mark and grid reference. */
export interface ColumnMark {
  /** Sequential mark shown on the layout: C1, C2 … numbered left→right, top→bottom. */
  mark: string;
  /** Grid reference, e.g. "A-1" (letter = vertical grid line, number = horizontal). */
  grid: string;
  xM: number; yM: number;
  ci: number; ri: number;      // grid indices
  kind: ColumnKind;
}

const GRID_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";   // I and O omitted — they read as 1 and 0

/**
 * Number every column on the structural grid. The grid comes from the ARCHITECTURAL plan
 * (plan.colXs × plan.rowYs), so the columns land on the real bay/wall lines rather than on an
 * abstract evenly-spaced grid — that is what a builder sets out from.
 */
export function buildColumnMarks(colXs: number[], rowYs: number[]): ColumnMark[] {
  const out: ColumnMark[] = [];
  let n = 1;
  rowYs.forEach((y, ri) => {
    colXs.forEach((x, ci) => {
      const onEndCol = ci === 0 || ci === colXs.length - 1;
      const onEndRow = ri === 0 || ri === rowYs.length - 1;
      const kind: ColumnKind = onEndCol && onEndRow ? "corner" : onEndCol || onEndRow ? "edge" : "internal";
      out.push({
        mark: `C${n++}`,
        grid: `${GRID_LETTERS[ci] ?? `X${ci}`}-${ri + 1}`,
        xM: x, yM: y, ci, ri, kind,
      });
    });
  });
  return out;
}

export function gridLetter(i: number): string { return GRID_LETTERS[i] ?? `X${i}`; }

/* ------------------------------------------------------ the full rebar design */

export interface FootingRebar {
  sideM: number;
  depthM: number;
  coverMm: number;
  barDiaMm: number;
  spacingMm: number;
  /** Bars each way in the bottom mesh (the mesh is square, so both ways are the same). */
  barsEachWay: number;
  /** Length of one bar = footing side − 2 × cover, plus a 90° end bend each end. */
  barLengthMm: number;
  topMesh: boolean;
  /** Same mesh at the top when `topMesh` is on (needed under heavy/eccentric columns). */
  topBarsEachWay: number;
  /** Text as it appears on the drawing, e.g. "T12 @ 150 c/c both ways (bottom)". */
  bottomText: string;
  topText: string;
  anchorage: AnchorageSet;
}

export interface ColumnRebar {
  sizeMm: number;              // square column / pedestal side
  heightM: number;
  coverMm: number;
  bars: number;                // vertical bars
  barDiaMm: number;
  tieDiaMm: number;
  tieSpacingMm: number;
  /** Ties are closer together in the confinement zone at each end of the column. */
  tieSpacingEndMm: number;
  /** "4-T16 vertical" */
  barsText: string;
  /** "T8 @ 150 c/c (100 c/c at ends)" */
  tiesText: string;
  /** Starter/dowel bars cast into the footing project this far above the footing top. */
  starterProjectionMm: number;
  /** Vertical bars lap here, above the floor level. */
  lapMm: number;
  anchorage: AnchorageSet;
}

export interface BeamRebar {
  widthMm: number; depthMm: number;
  coverMm: number;
  mainBarDiaMm: number;
  topBars: number; bottomBars: number;
  stirrupDiaMm: number; stirrupSpacingMm: number;
  /** Stirrups are closer near the supports (the shear zone). */
  stirrupSpacingSupportMm: number;
  topText: string; bottomText: string; stirrupText: string;
  /** Bottom bars must be carried this far INTO the support (IS 456 Cl. 26.2.3.3). */
  anchorageIntoSupportMm: number;
  /** Top bars over a support are curtailed at this distance from the face. */
  curtailFromFaceMm: number;
  anchorage: AnchorageSet;
}

export interface RebarDesign {
  concreteGrade: RccGrade;
  steelGrade: SteelGrade;
  footing: FootingRebar;
  column: ColumnRebar;
  beam: BeamRebar;
  bearing: BearingCheck;
  /** Anything the detailing itself flags — an overstressed footing, a bar that will not fit, etc. */
  warnings: string[];
}

/**
 * Resolve the complete structural detailing from the foundation section the civil engine produced.
 * Everything is DERIVED — change the concrete grade and every Ld, lap and anchorage on every
 * drawing moves with it; change the SBC and the bearing check re-runs.
 */
export function resolveRebar(
  section: FoundationResult["section"],
  ctx: { builtUpSqm: number; columnCount: number },
): RebarDesign {
  const concreteGrade = section.grade;
  const steelGrade = section.steelGrade;
  const warnings: string[] = [];

  /* ---- footing mesh ---- */
  const fCover = clamp(section.coverFootingMm, 25, 100, 50);
  const fDia = clamp(section.footingBarDiaMm, 8, 32, 12);
  const fSp = clamp(section.footingBarSpacingMm, 75, 300, 150);
  const fSide = clamp(section.footingLengthM, 0.3, 6, 1.2);
  const fDepth = clamp(section.footingDepthM, 0.15, 3, 0.4);
  const clearSpanMm = fSide * 1000 - 2 * fCover;
  const barsEachWay = Math.max(2, Math.floor(clearSpanMm / fSp) + 1);
  const fAnch = anchorageFor(fDia, concreteGrade, steelGrade);
  const footing: FootingRebar = {
    sideM: fSide, depthM: fDepth, coverMm: fCover,
    barDiaMm: fDia, spacingMm: fSp, barsEachWay,
    barLengthMm: up10(clearSpanMm + 2 * fAnch.bend90Mm),
    topMesh: section.footingTopMesh,
    topBarsEachWay: barsEachWay,
    bottomText: `T${fDia} @ ${fSp} c/c both ways (bottom)`,
    topText: `T${fDia} @ ${fSp} c/c both ways (top)`,
    anchorage: fAnch,
  };

  /* ---- column / pedestal ---- */
  const cCover = clamp(section.coverColumnMm, 25, 75, 40);
  const cBars = clamp(Math.round(section.columnBars), 4, 20, 4);
  const cDia = clamp(section.columnBarDiaMm, 10, 32, 16);
  const tDia = clamp(section.columnTieDiaMm, 6, 16, 8);
  const tSp = clamp(section.columnTieSpacingMm, 50, 300, 150);
  const cSizeMm = Math.round(clamp(section.pedestalSizeM, 0.15, 2, 0.3) * 1000);
  const cHeightM = clamp(section.pedestalHeightM, 0.1, 5, 0.6);
  const cAnch = anchorageFor(cDia, concreteGrade, steelGrade);
  const column: ColumnRebar = {
    sizeMm: cSizeMm, heightM: cHeightM, coverMm: cCover,
    bars: cBars, barDiaMm: cDia, tieDiaMm: tDia, tieSpacingMm: tSp,
    tieSpacingEndMm: Math.max(75, Math.round(tSp / 2 / 25) * 25),
    barsText: `${cBars}-T${cDia} vertical`,
    tiesText: `T${tDia} @ ${tSp} c/c (${Math.max(75, Math.round(tSp / 2 / 25) * 25)} c/c at ends)`,
    starterProjectionMm: cAnch.lapCompressionMm,
    lapMm: cAnch.lapCompressionMm,
    anchorage: cAnch,
  };

  // Will the vertical bars physically fit on the column face?
  const clearFaceMm = cSizeMm - 2 * cCover - 2 * tDia;
  const barsPerFace = Math.max(2, Math.ceil(cBars / 4) + 1);
  const clearGapMm = (clearFaceMm - barsPerFace * cDia) / Math.max(1, barsPerFace - 1);
  if (clearGapMm < Math.max(25, cDia)) {
    warnings.push(
      `Column ${cSizeMm} mm square cannot fit ${cBars}-T${cDia} at ${cCover} mm cover ` +
      `(clear bar gap ${Math.round(clearGapMm)} mm < ${Math.max(25, cDia)} mm). Increase the pedestal size or reduce the bars.`,
    );
  }

  /* ---- plinth beam ---- */
  const bCover = clamp(section.coverBeamMm, 25, 75, 40);
  const bDia = clamp(section.mainBarDiaMm, 8, 32, 16);
  const sDia = clamp(section.stirrupDiaMm, 6, 16, 8);
  const sSp = clamp(section.stirrupSpacingMm, 50, 400, 150);
  const bTop = clamp(Math.round(section.topBars), 2, 12, 3);
  const bBot = clamp(Math.round(section.bottomBars), 2, 12, 3);
  const bAnch = anchorageFor(bDia, concreteGrade, steelGrade);
  const beam: BeamRebar = {
    widthMm: Math.round(clamp(section.plinthBeamWidthM, 0.1, 1, 0.23) * 1000),
    depthMm: Math.round(clamp(section.plinthBeamDepthM, 0.1, 1.5, 0.3) * 1000),
    coverMm: bCover,
    mainBarDiaMm: bDia, topBars: bTop, bottomBars: bBot,
    stirrupDiaMm: sDia, stirrupSpacingMm: sSp,
    stirrupSpacingSupportMm: Math.max(75, Math.round(sSp / 2 / 25) * 25),
    topText: `${bTop}-T${bDia} top`,
    bottomText: `${bBot}-T${bDia} bottom`,
    stirrupText: `T${sDia} @ ${sSp} c/c (${Math.max(75, Math.round(sSp / 2 / 25) * 25)} c/c near supports)`,
    // IS 456 Cl. 26.2.3.3 — at a simple support, bottom steel is anchored for Ld/3 past the face;
    // we detail the full bend-in of Ld/3 + a 90° bend, which is what gets built.
    anchorageIntoSupportMm: up10(bAnch.ldMm / 3 + bAnch.bend90Mm),
    curtailFromFaceMm: up10(bAnch.ldMm),
    anchorage: bAnch,
  };

  const beamClearMm = beam.widthMm - 2 * bCover - 2 * sDia;
  const maxBars = Math.max(bTop, bBot);
  const beamGapMm = (beamClearMm - maxBars * bDia) / Math.max(1, maxBars - 1);
  if (beamGapMm < Math.max(25, bDia)) {
    warnings.push(
      `Plinth beam ${beam.widthMm} mm wide cannot fit ${maxBars}-T${bDia} in one layer ` +
      `(clear gap ${Math.round(beamGapMm)} mm). Widen the beam, reduce the bars, or detail a second layer.`,
    );
  }

  /* ---- soil bearing ---- */
  const bearing = checkBearing({
    sbcKnm2: section.sbcKnm2,
    loadPerSqmKn: section.loadPerSqmKn,
    builtUpSqm: ctx.builtUpSqm,
    columnCount: ctx.columnCount,
    footingSideM: fSide,
  });
  if (!bearing.adequate) {
    warnings.push(
      `Footing ${bearing.footingSideM} m square is OVERSTRESSED: it delivers ${bearing.bearingPressureKnm2} kN/m² ` +
      `against an SBC of ${bearing.sbcKnm2} kN/m² (${Math.round(bearing.utilisation * 100)}% of capacity). ` +
      `Increase the footing to at least ${bearing.requiredSideM} m square, or confirm a higher SBC by soil test.`,
    );
  }

  return { concreteGrade, steelGrade, footing, column, beam, bearing, warnings };
}

/* ==================================================================== BBS ==== */

/**
 * BAR BENDING SCHEDULE — the real steel take-off.
 *
 * Unit weight of a round bar: w = d² / 162 kg/m (the standard shortcut for 7850 kg/m³).
 * Cutting lengths include the bends and hooks that are actually fabricated:
 *   • straight bars  — clear length + a 90° end bend each end (8φ per IS 2502)
 *   • stirrups/ties  — 2·(A+B) + two 135° hooks, less the standard bend deductions
 *                      (3 × 90° bends @ 2φ, 2 × 135° bends @ 3φ)
 *   • laps           — a splice every stock length (12 m bars), each costing one lap length
 *
 * This REPLACES the old `concrete volume × 85 kg/cum` proxy: the priced tonnage now moves when a
 * bar diameter, spacing or bar count changes.
 */
export interface BbsRow {
  mark: string;
  member: string;
  shape: string;
  diaMm: number;
  members: number;        // how many footings / columns / beam runs
  barsPerMember: number;
  totalBars: number;
  cuttingLengthMm: number;
  totalLengthM: number;
  unitWtKgPerM: number;
  weightKg: number;
}

export interface BbsResult {
  rows: BbsRow[];
  /** Net steel from the schedule, before wastage (kg). */
  netKg: number;
  wastagePct: number;
  wastageKg: number;
  /** What the BOQ should price (kg) — net + wastage. */
  totalKg: number;
  totalTonnes: number;
  /** Steel intensity this schedule implies (kg per cum of RCC) — for sanity-checking only. */
  kgPerCum: number;
  /** Weight by bar diameter, for ordering. */
  byDia: { diaMm: number; kg: number }[];
}

/** Unit weight of a round bar, kg/m (d²/162). */
export const barKgPerM = (diaMm: number) => (diaMm * diaMm) / 162;

const STOCK_LENGTH_M = 12;   // TMT bars are supplied in 12 m lengths

/** Laps needed to make a run of `runM` from 12 m stock: one per joint. */
const lapsFor = (runM: number) => Math.max(0, Math.ceil(runM / STOCK_LENGTH_M) - 1);

/** Closed rectangular tie/stirrup cutting length, incl. 135° hooks less bend deductions. */
function tieCuttingLengthMm(outerAmm: number, outerBmm: number, diaMm: number, hook135Mm: number): number {
  const A = Math.max(50, outerAmm);
  const B = Math.max(50, outerBmm);
  const gross = 2 * (A + B) + 2 * hook135Mm;
  const deduction = 3 * (2 * diaMm) + 2 * (3 * diaMm);   // 3 × 90° bends + 2 × 135° bends
  return up10(Math.max(4 * diaMm, gross - deduction));
}

export function buildBBS(
  d: RebarDesign,
  qty: { footings: number; pedestals: number; plinthBeamLengthM: number; concreteCum: number },
  wastagePct = 3,
): BbsResult {
  const rows: BbsRow[] = [];
  const nF = Math.max(0, Math.round(qty.footings));
  const nP = Math.max(0, Math.round(qty.pedestals));
  const beamRunM = Math.max(0, qty.plinthBeamLengthM);

  const push = (
    mark: string, member: string, shape: string, diaMm: number,
    members: number, barsPerMember: number, cuttingLengthMm: number,
  ) => {
    const totalBars = Math.max(0, Math.round(members * barsPerMember));
    if (totalBars === 0 || cuttingLengthMm <= 0) return;
    const totalLengthM = (totalBars * cuttingLengthMm) / 1000;
    const unit = barKgPerM(diaMm);
    rows.push({
      mark, member, shape, diaMm, members, barsPerMember, totalBars,
      cuttingLengthMm: Math.round(cuttingLengthMm),
      totalLengthM: round(totalLengthM, 1),
      unitWtKgPerM: round(unit, 3),
      weightKg: round(totalLengthM * unit, 1),
    });
  };

  /* ---- 1. FOOTING mesh (bottom, both ways; optional top) ---- */
  const f = d.footing;
  push("F1", "Footing — bottom mesh (X)", "Straight + 90° end bends", f.barDiaMm, nF, f.barsEachWay, f.barLengthMm);
  push("F2", "Footing — bottom mesh (Y)", "Straight + 90° end bends", f.barDiaMm, nF, f.barsEachWay, f.barLengthMm);
  if (f.topMesh) {
    push("F3", "Footing — top mesh (X)", "Straight + 90° end bends", f.barDiaMm, nF, f.topBarsEachWay, f.barLengthMm);
    push("F4", "Footing — top mesh (Y)", "Straight + 90° end bends", f.barDiaMm, nF, f.topBarsEachWay, f.barLengthMm);
  }

  /* ---- 2. PEDESTAL / COLUMN verticals + ties ---- */
  const c = d.column;
  // A vertical bar is cast into the footing (down to the bottom mesh, with a 90° kicker), runs the
  // full pedestal height, and projects a compression lap above for the next lift.
  const embedMm = Math.max(0, f.depthM * 1000 - f.coverMm);
  const vertCut = up10(embedMm + c.heightM * 1000 + c.lapMm + c.anchorage.bend90Mm);
  push("C1", "Pedestal/column — vertical bars", "L-bar + lap projection", c.barDiaMm, nP, c.bars, vertCut);

  // Ties: nominal spacing over the middle, halved in the confinement zone at each end.
  const hMm = c.heightM * 1000;
  const confineMm = Math.min(hMm / 2, c.sizeMm);          // one column-depth at each end
  const midMm = Math.max(0, hMm - 2 * confineMm);
  const tiesPerCol =
    Math.ceil((2 * confineMm) / c.tieSpacingEndMm) + Math.ceil(midMm / c.tieSpacingMm) + 1;
  const tieOuter = c.sizeMm - 2 * c.coverMm;
  const tieCut = tieCuttingLengthMm(tieOuter, tieOuter, c.tieDiaMm, c.anchorage.hook135Mm);
  push("C2", "Pedestal/column — ties", "Closed rect. + 135° hooks", c.tieDiaMm, nP, tiesPerCol, tieCut);

  /* ---- 3. PLINTH BEAM — top, bottom, stirrups ---- */
  const b = d.beam;
  if (beamRunM > 0) {
    // Each longitudinal bar LINE runs the whole beam grid, and every splice costs one tension lap.
    // A schedule must list bars you can actually cut, so the line is broken into stock-length
    // pieces: the total steel is unchanged, but the cutting length is a real, ≤12 m bar.
    const lapsPerLine = lapsFor(beamRunM);
    const perLineMm = beamRunM * 1000 + lapsPerLine * b.anchorage.lapTensionMm + 2 * b.anchorageIntoSupportMm;
    const piecesPerLine = Math.max(1, Math.ceil(perLineMm / (STOCK_LENGTH_M * 1000)));
    const pieceMm = up10(perLineMm / piecesPerLine);
    push("PB-T", "Plinth beam — top bars", "Straight + laps + end anchorage", b.mainBarDiaMm, b.topBars, piecesPerLine, pieceMm);
    push("PB-B", "Plinth beam — bottom bars", "Straight + laps + end anchorage", b.mainBarDiaMm, b.bottomBars, piecesPerLine, pieceMm);

    const stirCount = Math.ceil((beamRunM * 1000) / b.stirrupSpacingMm) + 1;
    const stirCut = tieCuttingLengthMm(b.widthMm - 2 * b.coverMm, b.depthMm - 2 * b.coverMm, b.stirrupDiaMm, b.anchorage.hook135Mm);
    push("PB-S", "Plinth beam — stirrups", "Closed rect. + 135° hooks", b.stirrupDiaMm, 1, stirCount, stirCut);
  }

  const netKg = round(rows.reduce((s, r) => s + r.weightKg, 0), 1);
  const wp = Math.max(0, Math.min(15, Number.isFinite(wastagePct) ? wastagePct : 3));
  const wastageKg = round((netKg * wp) / 100, 1);
  const totalKg = round(netKg + wastageKg, 1);

  const byDiaMap = new Map<number, number>();
  for (const r of rows) byDiaMap.set(r.diaMm, round((byDiaMap.get(r.diaMm) ?? 0) + r.weightKg, 1));
  const byDia = [...byDiaMap.entries()].sort((a, b2) => a[0] - b2[0]).map(([diaMm, kg]) => ({ diaMm, kg }));

  return {
    rows, netKg, wastagePct: wp, wastageKg, totalKg,
    totalTonnes: round(totalKg / 1000, 3),
    kgPerCum: qty.concreteCum > 0 ? round(totalKg / qty.concreteCum, 1) : 0,
    byDia,
  };
}
