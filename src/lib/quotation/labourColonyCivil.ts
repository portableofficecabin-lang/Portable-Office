/**
 * Labour Colony — Civil Work calculation engine (spec section 6).
 *
 * Pure, framework-agnostic. A CivilWorkConfig (+ the building footprint context
 * from the main labourColony calculation) goes in; civil quantities, a priced
 * civil BOQ, a cost breakdown by civil sub-head, and the foundation column-grid
 * geometry (shared by the foundation plan drawing so the drawing and the BOQ
 * always agree) come out.
 *
 * Every auto-computed quantity is OVERRIDABLE: a config field left `undefined`
 * uses the derived value; setting it pins a manual quantity.
 *
 * Units: metres / cubic-metres / kilograms / running-metres / square-metres.
 * Costs in INR. Rates are indicative and fully overridable via CivilRates.
 */

// Value import (not type-only): the civil engine now derives its steel from the bar-bending
// schedule. labourColonyRebar imports only TYPES back from here, so there is no runtime cycle.
import {
  resolveRebar, buildBBS, buildColumnMarks, buildFootingTypes, footingTotals,
  type RebarDesign, type BbsResult, type FootingType,
} from "./labourColonyRebar";

/* ============================ TYPES ============================ */

export type FoundationType =
  | "pcc_bed"
  | "rcc_isolated_footing"
  | "rcc_pedestal"
  | "rcc_strip_footing"
  | "rcc_plinth_beam"
  | "concrete_block"
  | "full_rcc_slab"
  | "paver_block_base"
  | "steel_foundation_frame";

export type RccGrade = "M15" | "M20" | "M25" | "M30";

export const FOUNDATION_TYPES: { id: FoundationType; label: string; note: string }[] = [
  { id: "pcc_bed", label: "PCC bed", note: "Plain cement concrete levelling bed under columns/plinth." },
  { id: "rcc_isolated_footing", label: "RCC isolated footing", note: "Independent reinforced footing under each column." },
  { id: "rcc_pedestal", label: "RCC pedestal", note: "Short RCC column above footing to raise the base plate." },
  { id: "rcc_strip_footing", label: "RCC strip footing", note: "Continuous reinforced strip below load-bearing lines." },
  { id: "rcc_plinth_beam", label: "RCC plinth beam", note: "Grade beam tying columns at plinth level." },
  { id: "concrete_block", label: "Concrete block foundation", note: "Solid concrete-block masonry base." },
  { id: "full_rcc_slab", label: "Full RCC slab (raft)", note: "Raft/mat slab spreading load over the whole footprint." },
  { id: "paver_block_base", label: "Paver-block base", note: "Compacted base with interlocking paver blocks (light/temporary)." },
  { id: "steel_foundation_frame", label: "Steel foundation frame", note: "Bolted MS grillage frame for fully demountable units." },
];

export const RCC_GRADES: RccGrade[] = ["M15", "M20", "M25", "M30"];

/** A single priced civil line. */
export interface CivilLine {
  key: string;
  item: string;
  spec: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface CivilBoqRow extends CivilLine {
  sl: number;
  head: string;
}

/** All INR unit rates. Every field optional so callers override just a few. */
export interface CivilRates {
  siteClearing: number;        // /sqm
  earthCutting: number;        // /cum
  earthFilling: number;        // /cum
  groundLevelling: number;     // /sqm
  soilCompaction: number;      // /sqm
  antiTermite: number;         // /sqm
  groundSlope: number;         // /sqm

  excavation: number;          // /cum
  backfilling: number;         // /cum
  pcc: number;                 // /cum
  rccByGrade: Record<RccGrade, number>; // /cum (incl. formwork, excl. steel)
  reinforcement: number;       // /kg
  concreteBlock: number;       // /cum
  paverBase: number;           // /sqm
  steelFrameFoundation: number;// /kg

  raisedPlinth: number;        // /cum
  pccFlooring: number;         // /sqm
  rccFlooring: number;         // /sqm
  cementScreed: number;        // /sqm
  vitrifiedTiles: number;      // /sqm
  antiSkidTiles: number;       // /sqm
  paverBlocks: number;         // /sqm
  concreteWalkway: number;     // /sqm

  stormDrain: number;          // /m
  toiletDrainage: number;      // /m
  sewagePipe: number;          // /m
  inspectionChamber: number;   // each
  manhole: number;             // each
  septicTank: number;          // each
  soakPit: number;             // each
  stpConnection: number;       // lump
  greaseTrap: number;          // each
  kitchenDrain: number;        // /m
  laundryDrain: number;        // /m

  ugWaterLine: number;         // /m
  ohTankPerLitre: number;      // /litre
  tankFoundation: number;      // each
  pumpRoom: number;            // each
  waterPump: number;           // each
  cpvcUpvc: number;            // /m
  washingPoint: number;        // each

  cableTrench: number;         // /m
  panelFoundation: number;     // each
  earthingPit: number;         // each
  lightPoleFoundation: number; // each
  genTxFoundation: number;     // each

  internalRoad: number;        // /sqm
  paverPathway: number;        // /sqm
  extConcreteWalkway: number;  // /sqm
  fireTenderAccess: number;    // /sqm
  compoundFencing: number;     // /m
  entranceGate: number;        // each
  securityCabinFoundation: number; // each
  garbagePlatform: number;     // each
  landscaping: number;         // /sqm
  rainwaterDrainage: number;   // /m
}

/** Site-preparation inputs. Each quantity `undefined` => auto from footprint. */
export interface SitePrepConfig {
  siteClearing?: boolean;
  earthCuttingCum?: number;
  earthFillingCum?: number;
  groundLevelling?: boolean;
  soilCompaction?: boolean;
  antiTermite?: boolean;
  groundSlope?: boolean;
  /** Extra working margin around the building for site works (m each side). */
  siteMarginM?: number;
}

export interface FoundationConfig {
  type: FoundationType;
  grade: RccGrade;
  footingLengthM?: number;
  footingWidthM?: number;
  footingDepthM?: number;
  pedestalSizeM?: number;      // square pedestal side
  pedestalHeightM?: number;
  plinthBeamWidthM?: number;
  plinthBeamDepthM?: number;
  plinthBeamLengthM?: number;  // else auto = perimeter + internal grid lines
  pccThicknessMm?: number;
  raisedPlinthHeightM?: number;
  /**
   * Price steel from the BAR BENDING SCHEDULE (default true). The BBS takes off every bar actually
   * detailed — footing mesh, pedestal verticals + ties, plinth-beam top/bottom/stirrups, plus laps,
   * anchorage and wastage — so the tonnage moves when a bar size or spacing changes.
   * Set false ONLY to fall back to the old `concrete × steelKgPerCum` proxy.
   */
  useBbs?: boolean;
  /** Cutting/bending wastage added on top of the BBS net weight, %. Default 3. */
  steelWastagePct?: number;
  /** LEGACY steel intensity kg per cum of RCC. Used only when `useBbs` is false. */
  steelKgPerCum?: number;
  /** Hard overrides for the headline quantities. */
  reinforcementKg?: number;
  excavationCum?: number;
  backfillCum?: number;
  concreteCum?: number;
  /** Column grid spacing target (m); tunes the auto grid. */
  columnSpacingM?: number;

  /** Plinth-beam reinforcement (drawing + beam schedule; all overridable). */
  plinthBeamMainBarDiaMm?: number;      // main bar dia, e.g. 16
  plinthBeamTopBars?: number;           // top main bars, e.g. 3
  plinthBeamBottomBars?: number;        // bottom main bars, e.g. 3
  plinthBeamStirrupDiaMm?: number;      // stirrup dia, e.g. 8
  plinthBeamStirrupSpacingMm?: number;  // stirrup c/c spacing (mm), e.g. 150

  /* ---- Soil & structural detailing (drives the reinforcement drawings + the SBC check) ---- */
  /** SAFE BEARING CAPACITY of the soil, kN/m². The footing is CHECKED against this. Default 150. */
  sbcKnm2?: number;
  /** Design service load per sqm of built-up area, kN/m². Default 5 (light MS prefab + live load). */
  loadPerSqmKn?: number;
  /** Reinforcement steel grade. Default "Fe500". */
  steelGrade?: "Fe415" | "Fe500" | "Fe550";
  /** Clear cover, mm. Defaults: footing 50, column/pedestal 40, plinth beam 40. */
  coverFootingMm?: number;
  coverColumnMm?: number;
  coverBeamMm?: number;
  /** Footing reinforcement mesh. Defaults: T12 @ 150 c/c both ways, bottom only. */
  footingBarDiaMm?: number;
  footingBarSpacingMm?: number;
  footingTopMesh?: boolean;
  /**
   * Size each footing TYPE (F1/F2/F3) against its own tributary load and the SBC, instead of
   * building one uniform footing everywhere. Corner and edge columns carry a quarter and a half of
   * an internal column's load, so they get smaller footings — and the BOQ prices the real per-type
   * concrete, excavation, PCC and steel. Default true. Set false to restore uniform footings.
   */
  differentiatedFootings?: boolean;
  /** Column / pedestal reinforcement. Defaults: 4-T16 vertical, T8 ties @ 150 c/c. */
  columnBars?: number;
  columnBarDiaMm?: number;
  columnTieDiaMm?: number;
  columnTieSpacingMm?: number;
}

export interface FlooringPlinthConfig {
  raisedPlinth?: boolean;
  pccFlooringSqm?: number;
  rccFlooringSqm?: number;
  cementScreedSqm?: number;
  vitrifiedTilesSqm?: number;
  antiSkidTilesSqm?: number;
  paverBlocksSqm?: number;
  concreteWalkwaySqm?: number;
}

export interface DrainageConfig {
  enabled: boolean;
  peripheralStormDrainM?: number;
  toiletDrainageM?: number;
  ugSewagePipeM?: number;
  inspectionChambers?: number;
  manholes?: number;
  septicTanks?: number;
  soakPits?: number;
  stpConnection?: boolean;
  greaseTraps?: number;
  kitchenDrainM?: number;
  laundryDrainM?: number;
}

export interface WaterSupplyConfig {
  enabled: boolean;
  ugWaterLineM?: number;
  overheadTankLitre?: number;
  tankFoundations?: number;
  pumpRooms?: number;
  waterPumps?: number;
  cpvcUpvcM?: number;
  washingPoints?: number;
}

export interface ElectricalCivilConfig {
  enabled: boolean;
  cableTrenchM?: number;
  panelFoundations?: number;
  earthingPits?: number;
  lightPoleFoundations?: number;
  genTxFoundations?: number;
}

export interface ExternalDevConfig {
  enabled: boolean;
  internalRoadSqm?: number;
  paverPathwaySqm?: number;
  concreteWalkwaySqm?: number;
  fireTenderAccessSqm?: number;
  compoundFencingM?: number;
  entranceGates?: number;
  securityCabinFoundations?: number;
  garbagePlatforms?: number;
  landscapingSqm?: number;
  rainwaterDrainageM?: number;
}

/**
 * The civil price the customer has actually been QUOTED. Captured when the user hits
 * "Apply to quotation". While a snapshot exists and the freshly-computed numbers differ from it,
 * the quotation keeps charging the APPROVED figure and the UI shows a before/after comparison —
 * so a change to the footing count or the steel take-off can never silently move the price.
 */
export interface ApprovedCivilQuote {
  footingCount: number;
  steelKg: number;
  concreteCum: number;
  foundationCost: number;
  totalCost: number;
  /** ISO timestamp of the approval, supplied by the caller. */
  approvedAt: string;
}

export interface CivilWorkConfig {
  enabled: boolean;
  sitePrep: SitePrepConfig;
  foundation: FoundationConfig;
  flooringPlinth: FlooringPlinthConfig;
  drainage: DrainageConfig;
  waterSupply: WaterSupplyConfig;
  electricalCivil: ElectricalCivilConfig;
  externalDev: ExternalDevConfig;
  rates?: Partial<CivilRates>;
  /** The last price the user explicitly approved. Absent = nothing approved yet. */
  approvedQuote?: ApprovedCivilQuote;
}

/** What changed between the approved price and the freshly-computed one. */
export interface QuoteDelta {
  key: "footingCount" | "steelKg" | "concreteCum" | "foundationCost" | "totalCost";
  label: string;
  unit: string;
  before: number;
  after: number;
  diff: number;
}

export interface QuoteGate {
  /** True once the user has approved a price at least once. */
  hasApproved: boolean;
  /** True when the computed numbers differ from the approved ones — a confirmation is required. */
  pending: boolean;
  approved?: ApprovedCivilQuote;
  computed: ApprovedCivilQuote;
  deltas: QuoteDelta[];
  /**
   * The price the QUOTATION must use right now. It stays on the approved figure until the user
   * confirms the change — never silently jumps to the recomputed one.
   */
  effectiveTotalCost: number;
}

/** Context handed in from the main labour-colony calculation. */
export interface CivilContext {
  footprintLengthM: number;
  footprintWidthM: number;
  builtUpSqm: number;
  floors: 1 | 2 | 3;
  /**
   * THE ARCHITECTURAL COLUMN GRID, straight from buildConstructionPlan() — the SINGLE source of
   * truth for how many footings, pedestals and columns exist. When supplied it fully replaces the
   * old spacing-derived grid, so the BOQ can never price a different number of columns from the
   * one the construction drawing sets out.
   */
  columnGrid?: { xsM: number[]; ysM: number[] };
  wcCount?: number;
  bathCount?: number;
  totalCapacity?: number;
  diningKitchen?: boolean;
}

/** Column grid geometry — shared by the foundation plan drawing + the BOQ. */
export interface FoundationGrid {
  footprintLengthM: number;
  footprintWidthM: number;
  cols: number;               // columns along length
  rows: number;               // columns along width
  xsM: number[];              // column x positions (m)
  ysM: number[];              // column y positions (m)
  spacingM: number;
  columnCount: number;
  plinthBeamLengthM: number;
}

export interface CivilHeadResult {
  head: string;
  lines: CivilLine[];
  cost: number;
}

/** One row of the plinth-beam schedule (mark + section + reinforcement + run). */
export interface BeamScheduleRow {
  mark: string;         // "PB1"
  role: string;         // "Perimeter tie beam"
  widthMm: number;
  depthMm: number;
  grade: RccGrade;
  topBars: string;      // "3-T16"
  bottomBars: string;   // "3-T16"
  stirrups: string;     // "T8 @ 150 c/c"
  lengthM: number;
}

export interface FoundationResult extends CivilHeadResult {
  footingCount: number;
  concreteCum: number;
  pccCum: number;
  steelKg: number;
  excavationCum: number;
  backfillCum: number;
  plinthBeamLengthM: number;
  grid: FoundationGrid;
  /** Plinth-beam schedule (empty for foundation types without tie beams). */
  beams: BeamScheduleRow[];
  /** Section-detail dimensions (m) + reinforcement for the plinth-beam section drawing. */
  section: {
    footingLengthM: number;
    footingDepthM: number;
    pedestalSizeM: number;
    pedestalHeightM: number;
    plinthBeamWidthM: number;
    plinthBeamDepthM: number;
    pccThicknessMm: number;
    raisedPlinthHeightM: number;
    grade: RccGrade;
    type: FoundationType;
    mainBarDiaMm: number;
    topBars: number;
    bottomBars: number;
    stirrupDiaMm: number;
    stirrupSpacingMm: number;
    /* Soil + structural detailing, resolved. Everything the reinforcement drawings need travels
     * here, so a drawing never has to reach back into the civil CONFIG. */
    sbcKnm2: number;
    loadPerSqmKn: number;
    steelGrade: "Fe415" | "Fe500" | "Fe550";
    coverFootingMm: number;
    coverColumnMm: number;
    coverBeamMm: number;
    footingBarDiaMm: number;
    footingBarSpacingMm: number;
    footingTopMesh: boolean;
    columnBars: number;
    columnBarDiaMm: number;
    columnTieDiaMm: number;
    columnTieSpacingMm: number;
  };
  /** Built-up area the foundation carries (all floors) — the SBC check needs it. */
  builtUpSqm: number;
  /** Counts, all derived from the ONE architectural grid — footings === pedestals === columns. */
  pedestalCount: number;
  columnCount: number;
  /** True when the grid came from the construction plan (it always does in the app). */
  gridFromPlan: boolean;
  /** Full structural detailing (Ld, laps, footing mesh, column schedule, SBC check). */
  rebar: RebarDesign;
  /**
   * Footing TYPES (F1, F2, F3 …) — one per column kind, each sized against its own tributary load
   * and the SBC, with the grid positions of every footing of that type. These drive the footing
   * layout, the per-type reinforcement details AND the priced concrete/excavation/PCC/steel.
   */
  footingTypes: FootingType[];
  /** The bar-bending schedule the steel is priced from. */
  bbs: BbsResult;
  /** True when `steelKg` came from the BBS rather than the legacy kg/cum proxy. */
  steelFromBbs: boolean;
}

export interface CivilWorkResult {
  enabled: boolean;
  sitePrep: CivilHeadResult;
  foundation: FoundationResult;
  flooringPlinth: CivilHeadResult;
  drainage: CivilHeadResult;
  waterSupply: CivilHeadResult;
  electricalCivil: CivilHeadResult;
  externalDev: CivilHeadResult;
  boq: CivilBoqRow[];
  totalCost: number;
  totalConcreteCum: number;
  totalSteelKg: number;
  /** Before/after price comparison + the confirmation gate (see QuoteGate). */
  quoteGate: QuoteGate;
  warnings: string[];
  rates: CivilRates;
}

/* ============================ DEFAULTS ============================ */

export const DEFAULT_CIVIL_RATES: CivilRates = {
  siteClearing: 20,
  earthCutting: 250,
  earthFilling: 190,
  groundLevelling: 30,
  soilCompaction: 40,
  antiTermite: 35,
  groundSlope: 35,

  excavation: 260,
  backfilling: 190,
  pcc: 5800,
  rccByGrade: { M15: 7800, M20: 8600, M25: 9300, M30: 10200 },
  reinforcement: 88,
  concreteBlock: 4200,
  paverBase: 620,
  steelFrameFoundation: 105,

  raisedPlinth: 6200,
  pccFlooring: 520,
  rccFlooring: 980,
  cementScreed: 480,
  vitrifiedTiles: 1020,
  antiSkidTiles: 820,
  paverBlocks: 620,
  concreteWalkway: 720,

  stormDrain: 680,
  toiletDrainage: 480,
  sewagePipe: 460,
  inspectionChamber: 3800,
  manhole: 6800,
  septicTank: 48000,
  soakPit: 18000,
  stpConnection: 250000,
  greaseTrap: 8500,
  kitchenDrain: 480,
  laundryDrain: 460,

  ugWaterLine: 360,
  ohTankPerLitre: 7,
  tankFoundation: 26000,
  pumpRoom: 38000,
  waterPump: 18500,
  cpvcUpvc: 290,
  washingPoint: 2600,

  cableTrench: 290,
  panelFoundation: 12000,
  earthingPit: 6800,
  lightPoleFoundation: 3600,
  genTxFoundation: 38000,

  internalRoad: 480,
  paverPathway: 620,
  extConcreteWalkway: 720,
  fireTenderAccess: 480,
  compoundFencing: 880,
  entranceGate: 46000,
  securityCabinFoundation: 15000,
  garbagePlatform: 18000,
  landscaping: 120,
  rainwaterDrainage: 460,
};

export const DEFAULT_CIVIL_CONFIG: CivilWorkConfig = {
  enabled: true,
  sitePrep: { siteClearing: true, groundLevelling: true, soilCompaction: true, antiTermite: true, groundSlope: false, siteMarginM: 3 },
  foundation: { type: "rcc_pedestal", grade: "M20" },
  flooringPlinth: { raisedPlinth: true },
  drainage: { enabled: true, stpConnection: false },
  waterSupply: { enabled: true },
  electricalCivil: { enabled: true },
  externalDev: { enabled: true },
};

/* ============================ HELPERS ============================ */

const round = (n: number, d = 2) => {
  const f = Math.pow(10, d);
  return Math.round((n + Number.EPSILON) * f) / f;
};
const ceil = (n: number) => Math.ceil(n - 1e-9);
const SQM_TO_SQFT = 10.7639;

/**
 * Build the column grid.
 *
 * `explicit` is the ARCHITECTURAL grid from the construction plan (plan.colXs × plan.rowYs). When
 * given, it IS the grid — column count, footing count, pedestal count and plinth-beam runs are all
 * taken from it, so the BOQ and the drawing can never disagree. The spacing-derived grid below is
 * only a fallback for callers that have no plan (it produced the old 30-vs-15 mismatch).
 *
 * There is deliberately NO manual footing-count override any more: a hand-typed count is exactly
 * what let the quantities drift away from the drawing.
 */
export function buildFoundationGrid(
  footprintLengthM: number,
  footprintWidthM: number,
  spacingTargetM = 3,
  plinthLenOverride?: number,
  explicit?: { xsM: number[]; ysM: number[] },
): FoundationGrid {
  const L = Math.max(1, footprintLengthM);
  const W = Math.max(1, footprintWidthM);

  let xsM: number[];
  let ysM: number[];
  if (explicit && explicit.xsM.length >= 2 && explicit.ysM.length >= 2) {
    xsM = [...explicit.xsM].sort((a, b) => a - b).map((v) => round(v, 3));
    ysM = [...explicit.ysM].sort((a, b) => a - b).map((v) => round(v, 3));
  } else {
    const spacing = Math.max(2, spacingTargetM);
    const c = Math.max(2, ceil(L / spacing) + 1);
    const r = Math.max(2, ceil(W / spacing) + 1);
    xsM = Array.from({ length: c }, (_, i) => round((i * L) / (c - 1), 3));
    ysM = Array.from({ length: r }, (_, j) => round((j * W) / (r - 1), 3));
  }

  const cols = xsM.length;
  const rows = ysM.length;
  const columnCount = cols * rows;                       // ALWAYS derived — never overridden

  // Grid spans (the architectural grid may not start at 0 or reach the footprint edge).
  const spanX = Math.max(0, xsM[cols - 1] - xsM[0]);
  const spanY = Math.max(0, ysM[rows - 1] - ysM[0]);
  // Plinth beam runs along every grid line, both directions.
  const autoBeamLen = rows * spanX + cols * spanY;
  const plinthBeamLengthM = plinthLenOverride && plinthLenOverride > 0 ? plinthLenOverride : round(autoBeamLen);
  // Representative centre-to-centre spacing, for display only.
  const spacingM = round(Math.max(spanX / Math.max(1, cols - 1), spanY / Math.max(1, rows - 1)), 2);

  return {
    footprintLengthM: round(L), footprintWidthM: round(W),
    cols, rows, xsM, ysM, spacingM, columnCount, plinthBeamLengthM,
  };
}

const line = (key: string, item: string, spec: string, unit: string, quantity: number, rate: number): CivilLine => ({
  key, item, spec, unit, quantity: round(quantity), rate: round(rate), amount: round(quantity * rate),
});
const sumCost = (lines: CivilLine[]) => round(lines.reduce((s, l) => s + l.amount, 0));

/* ============================ ENGINE ============================ */

export function calculateCivilWork(input: CivilWorkConfig, ctx: CivilContext): CivilWorkResult {
  const rates: CivilRates = {
    ...DEFAULT_CIVIL_RATES,
    ...(input.rates || {}),
    rccByGrade: { ...DEFAULT_CIVIL_RATES.rccByGrade, ...(input.rates?.rccByGrade || {}) },
  };

  const L = Math.max(1, ctx.footprintLengthM);
  const W = Math.max(1, ctx.footprintWidthM);
  const builtUp = Math.max(ctx.builtUpSqm, L * W);
  const floors = ctx.floors;
  const warnings: string[] = [];

  /* ---------- SITE PREP ---------- */
  const sp = input.sitePrep;
  const margin = sp.siteMarginM ?? 3;
  const siteAreaSqm = (L + 2 * margin) * (W + 2 * margin);
  const spLines: CivilLine[] = [];
  if (sp.siteClearing) spLines.push(line("site_clearing", "Site clearing & grubbing", "clear vegetation/debris", "sqm", siteAreaSqm, rates.siteClearing));
  const earthCut = sp.earthCuttingCum ?? round(siteAreaSqm * 0.15); // 150 mm strip average
  if (earthCut > 0) spLines.push(line("earth_cutting", "Earth cutting / excavation (site)", "avg 150 mm", "cum", earthCut, rates.earthCutting));
  const earthFill = sp.earthFillingCum ?? round(L * W * 0.2); // raise pad ~200 mm
  if (earthFill > 0) spLines.push(line("earth_filling", "Earth filling & compaction (pad)", "in 150 mm layers", "cum", earthFill, rates.earthFilling));
  if (sp.groundLevelling) spLines.push(line("ground_levelling", "Ground levelling & dressing", "to formation level", "sqm", siteAreaSqm, rates.groundLevelling));
  if (sp.soilCompaction) spLines.push(line("soil_compaction", "Soil compaction", "roller/plate compaction", "sqm", L * W, rates.soilCompaction));
  if (sp.antiTermite) spLines.push(line("anti_termite", "Anti-termite treatment", "pre-construction", "sqm", L * W, rates.antiTermite));
  if (sp.groundSlope) spLines.push(line("ground_slope", "Ground slope preparation", "1:100 for drainage", "sqm", siteAreaSqm, rates.groundSlope));
  const sitePrep: CivilHeadResult = { head: "Site Preparation", lines: spLines, cost: sumCost(spLines) };

  /* ---------- FOUNDATION ---------- */
  const f = input.foundation;
  // ONE grid. When the caller supplies the architectural grid (it always does in the app), the
  // footing / pedestal / column counts are taken straight from it — 15 columns on the drawing
  // means 15 footings, 15 pedestals and 15 columns in the BOQ, with no way to desync them.
  const grid = buildFoundationGrid(L, W, f.columnSpacingM ?? 3, f.plinthBeamLengthM, ctx.columnGrid);
  const footingCount = grid.columnCount;
  const gridFromPlan = !!(ctx.columnGrid && ctx.columnGrid.xsM.length >= 2 && ctx.columnGrid.ysM.length >= 2);

  const footL = f.footingLengthM ?? (floors === 1 ? 1.0 : floors === 2 ? 1.2 : 1.5);
  const footW = f.footingWidthM ?? footL;
  const footD = f.footingDepthM ?? (floors === 1 ? 0.3 : floors === 2 ? 0.4 : 0.5);
  const pedSize = f.pedestalSizeM ?? 0.3;
  const pedHt = f.pedestalHeightM ?? 0.6;
  const beamW = f.plinthBeamWidthM ?? 0.23;
  const beamD = f.plinthBeamDepthM ?? 0.3;
  const beamLen = grid.plinthBeamLengthM;
  const pccThk = f.pccThicknessMm ?? 100;
  const raisedPlinthHt = f.raisedPlinthHeightM ?? 0.45;
  const steelPerCum = f.steelKgPerCum ?? 85;

  // Plinth-beam reinforcement (drawing + schedule).
  const mainDia = f.plinthBeamMainBarDiaMm ?? 16;
  const topBars = Math.max(2, f.plinthBeamTopBars ?? 3);
  const botBars = Math.max(2, f.plinthBeamBottomBars ?? 3);
  const stirDia = f.plinthBeamStirrupDiaMm ?? 8;
  const stirSp = f.plinthBeamStirrupSpacingMm ?? 150;

  // Soil + structural detailing (drives the reinforcement drawings and the SBC bearing check).
  const sbcKnm2 = Math.max(20, f.sbcKnm2 ?? 150);
  const loadPerSqmKn = Math.max(1, f.loadPerSqmKn ?? 5);
  const steelGrade = f.steelGrade ?? "Fe500";
  const coverFootingMm = f.coverFootingMm ?? 50;
  const coverColumnMm = f.coverColumnMm ?? 40;
  const coverBeamMm = f.coverBeamMm ?? 40;
  const footingBarDiaMm = f.footingBarDiaMm ?? 12;
  const footingBarSpacingMm = f.footingBarSpacingMm ?? 150;
  const footingTopMesh = f.footingTopMesh ?? false;
  const columnBars = Math.max(4, f.columnBars ?? 4);
  const columnBarDiaMm = f.columnBarDiaMm ?? 16;
  const columnTieDiaMm = f.columnTieDiaMm ?? 8;
  const columnTieSpacingMm = f.columnTieSpacingMm ?? 150;

  // The section detail is built HERE, not at the end, because the BAR BENDING SCHEDULE is derived
  // from it and the BBS is what now prices the steel.
  const sectionDetail = {
    footingLengthM: footL, footingDepthM: footD, pedestalSizeM: pedSize, pedestalHeightM: pedHt,
    plinthBeamWidthM: beamW, plinthBeamDepthM: beamD, pccThicknessMm: pccThk, raisedPlinthHeightM: raisedPlinthHt,
    grade: f.grade, type: f.type,
    mainBarDiaMm: mainDia, topBars, bottomBars: botBars, stirrupDiaMm: stirDia, stirrupSpacingMm: stirSp,
    sbcKnm2, loadPerSqmKn, steelGrade,
    coverFootingMm, coverColumnMm, coverBeamMm,
    footingBarDiaMm, footingBarSpacingMm, footingTopMesh,
    columnBars, columnBarDiaMm, columnTieDiaMm, columnTieSpacingMm,
  };
  /* ---------- FOOTING TYPES (F1, F2, F3 …) ----------
   * Corner / edge / internal columns carry different tributary loads, so they get different
   * footings. The SAME types drive the drawings AND the quantities below — the schedule and the
   * BOQ cannot drift apart. `differentiatedFootings: false` collapses back to one uniform type.
   * Only foundation types that actually BUILD isolated footings get this treatment — a raft or a
   * strip footing has no isolated pad to differentiate, size against the SBC, or show a schedule for. */
  const isolatedFootingTypes: FoundationType[] = ["rcc_isolated_footing", "rcc_pedestal", "rcc_plinth_beam"];
  const hasIsolatedFootings = isolatedFootingTypes.includes(f.type);
  const columnMarks = buildColumnMarks(grid.xsM, grid.ysM);
  const differentiated = f.differentiatedFootings ?? true;
  const footingTypes: FootingType[] = buildFootingTypes(
    sectionDetail,
    columnMarks,
    { builtUpSqm: builtUp },
    // minSideM is a FLOOR: the pedestal clearance AND whatever footing size the user entered (footL)
    // both push footings up, never down — the entered "Footing size" field must not be a silent no-op.
    { differentiated, minSideM: Math.max(0.6, pedSize + 0.3, footL) },
  );
  const fTot = footingTotals(footingTypes);
  const footingTypesForUi = hasIsolatedFootings ? footingTypes : [];

  /* F1 is the GOVERNING footing. Every drawing and note that shows "the" footing must show THAT one,
   * and the detailing (mesh, starter embedment, bearing panel) must be resolved against it — otherwise
   * the section would contradict the schedule sitting next to it on the same sheet. Skipped for
   * foundation types with no isolated footing (raft, strip …) — there is no "the footing" to govern. */
  const governing = hasIsolatedFootings ? footingTypes[0] : undefined;
  if (governing) {
    sectionDetail.footingLengthM = governing.sideM;
    sectionDetail.footingDepthM = governing.depthM;
  }

  const rebarDesign = resolveRebar(sectionDetail, { builtUpSqm: builtUp, columnCount: footingCount });

  if (governing) {
    // resolveRebar spreads the load EVENLY over every column. The governing column does not carry the
    // average — it carries its TRIBUTARY share — so the bearing panel must report the type's own
    // check, and resolveRebar's average-load overstress warning (which the per-type warnings below
    // supersede, accurately) must not be allowed to contradict it.
    rebarDesign.bearing = {
      ...rebarDesign.bearing,
      perColumnKn: governing.loadKn,
      footingSideM: governing.sideM,
      footingAreaSqm: round(governing.sideM * governing.sideM, 2),
      bearingPressureKnm2: governing.bearingPressureKnm2,
      utilisation: governing.utilisation,
      requiredAreaSqm: round(governing.requiredSideM * governing.requiredSideM, 2),
      requiredSideM: governing.requiredSideM,
      adequate: governing.adequate,
    };
    rebarDesign.warnings = rebarDesign.warnings.filter((w) => !/^Footing\b.*OVERSTRESSED/i.test(w));
  }

  const fLines: CivilLine[] = [];
  const gradeRate = rates.rccByGrade[f.grade];

  // Excavation for footing pits (+150 mm working space each side, +PCC depth) — summed per type.
  const excavationCum = f.excavationCum ?? round(fTot.pitCum);
  fLines.push(line("excavation", "Excavation in foundation", "ordinary soil, pits", "cum", excavationCum, rates.excavation));

  // PCC bed under footings (or over whole footprint for raft/pcc_bed).
  let pccCum: number;
  if (f.type === "full_rcc_slab") {
    pccCum = round(L * W * (pccThk / 1000));
  } else if (f.type === "pcc_bed") {
    pccCum = round(L * W * Math.max(0.1, pccThk / 1000));
  } else {
    pccCum = round(fTot.pccCum);
  }
  if (pccCum > 0) fLines.push(line("pcc_bed", "PCC bed / levelling course", `${pccThk} mm, 1:4:8`, "cum", pccCum, rates.pcc));

  // Main structural concrete depends on the foundation type.
  let concreteCum = 0;
  let concreteSpec = "";
  switch (f.type) {
    case "rcc_isolated_footing":
    case "rcc_pedestal": {
      const footings = fTot.concreteCum;   // Σ over F1/F2/F3 — exactly what the schedule details
      const pedestals = f.type === "rcc_pedestal" ? pedSize * pedSize * pedHt * footingCount : 0;
      const beams = beamW * beamD * beamLen;
      concreteCum = round(footings + pedestals + beams);
      concreteSpec = `${f.grade} — footings + ${f.type === "rcc_pedestal" ? "pedestals + " : ""}plinth beam`;
      break;
    }
    case "rcc_strip_footing": {
      const strip = 0.6 * footD * beamLen; // 600 mm wide strip
      const beams = beamW * beamD * beamLen;
      concreteCum = round(strip + beams);
      concreteSpec = `${f.grade} — strip footing + plinth beam`;
      break;
    }
    case "rcc_plinth_beam": {
      concreteCum = round(beamW * beamD * beamLen + fTot.concreteCum * 0.5);  // shallow bases
      concreteSpec = `${f.grade} — plinth beam grid on shallow bases`;
      break;
    }
    case "full_rcc_slab": {
      concreteCum = round(L * W * 0.2); // 200 mm raft
      concreteSpec = `${f.grade} — 200 mm raft slab`;
      break;
    }
    case "concrete_block": {
      concreteCum = round(0.23 * raisedPlinthHt * (2 * (L + W)) + beamW * beamD * beamLen);
      concreteSpec = "Solid concrete block masonry + capping beam";
      break;
    }
    case "paver_block_base":
      concreteCum = 0;
      concreteSpec = "Compacted base — no structural RCC";
      break;
    case "steel_foundation_frame":
      concreteCum = round(footL * footW * footD * footingCount * 0.4);
      concreteSpec = "Small RCC pads under steel grillage";
      break;
    case "pcc_bed":
    default:
      concreteCum = 0;
      concreteSpec = "PCC only";
      break;
  }
  if (concreteCum > 0) {
    if (f.type === "concrete_block") {
      fLines.push(line("rcc_main", "Concrete block foundation + capping", concreteSpec, "cum", concreteCum, rates.concreteBlock));
    } else {
      fLines.push(line("rcc_main", "RCC foundation concrete", concreteSpec, "cum", concreteCum, gradeRate));
    }
  }

  /* ---------- REINFORCEMENT: priced from the BAR BENDING SCHEDULE ----------
   * The old `concrete × 85 kg/cum` proxy meant bar sizes drove the drawings but not the money.
   * The BBS takes off every bar actually detailed — footing mesh, pedestal verticals + ties,
   * plinth-beam top/bottom/stirrups — including laps, anchorage and cutting wastage, so the
   * priced tonnage now moves the moment a bar diameter, spacing or bar count changes.
   * The proxy survives only as an explicit opt-out (`useBbs: false`). */
  const rccTypes: FoundationType[] = ["rcc_isolated_footing", "rcc_pedestal", "rcc_strip_footing", "rcc_plinth_beam", "full_rcc_slab", "steel_foundation_frame"];
  const beamTypes: FoundationType[] = ["rcc_isolated_footing", "rcc_pedestal", "rcc_strip_footing", "rcc_plinth_beam", "concrete_block"];
  const isRcc = rccTypes.includes(f.type);
  const hasPlinthBeam = beamTypes.includes(f.type);
  const useBbs = f.useBbs ?? true;
  const pedestalCount = f.type === "rcc_pedestal" ? footingCount : 0;

  // The BBS/F1-F2-F3 schedule takes off ISOLATED FOOTING mesh — it must only be fed to (and exposed
  // for) foundation types that actually build isolated footings whose priced concrete IS `fTot.*`
  // (hasIsolatedFootings, resolved above). Feeding it to a raft (priced as a slab) or a strip footing
  // (priced as a 600 mm strip) would bill/draw a footing mesh for pads that are never built.
  // Total bay-segments in the plinth-beam grid (each has 2 support faces) — same rows×(cols-1) +
  // cols×(rows-1) shape as `autoBeamLen` above, just counting segments instead of summing their length.
  const beamSpans = hasPlinthBeam ? grid.rows * Math.max(0, grid.cols - 1) + grid.cols * Math.max(0, grid.rows - 1) : 0;

  const bbs = buildBBS(
    rebarDesign,
    {
      footingTypes: footingTypesForUi,
      pedestals: pedestalCount,
      plinthBeamLengthM: hasPlinthBeam ? beamLen : 0,
      concreteCum,
      beamSpans,
    },
    f.steelWastagePct ?? 3,
  );

  let steelKg: number;
  let steelSpec: string;
  if (f.reinforcementKg != null && f.reinforcementKg > 0) {
    steelKg = round(f.reinforcementKg);
    steelSpec = `${steelGrade} — manual override`;
  } else if (useBbs && isRcc && concreteCum > 0 && bbs.kgPerCum >= 30) {
    steelKg = bbs.totalKg;
    steelSpec = `${steelGrade} TMT — from BBS: ${bbs.netKg} kg net + ${bbs.wastagePct}% wastage (${bbs.kgPerCum} kg/cum)`;
  } else if (useBbs && isRcc && concreteCum > 0) {
    // The BBS does not (yet) take off every reinforced member of this foundation type (e.g. a raft's
    // own mesh, or a strip footing's main + distribution bars) — its implied intensity is implausibly
    // low. Fall back to the per-cum proxy rather than silently under-quote steel by an order of
    // magnitude, and say so, so the gap is visible instead of buried in a "from BBS" label.
    steelKg = round(concreteCum * steelPerCum);
    steelSpec = `${steelGrade} — legacy proxy ~${steelPerCum} kg/cum (BBS take-off does not yet cover every member of this foundation type)`;
    warnings.push(
      `Bar-bending schedule take-off does not cover every reinforced member of this foundation type ` +
      `(implied ${bbs.kgPerCum} kg/cum is implausibly low for RCC). Reinforcement steel is priced from the ` +
      `${steelPerCum} kg/cum proxy instead — get this foundation's reinforcement detailed by a structural engineer.`,
    );
  } else {
    steelKg = isRcc ? round(concreteCum * steelPerCum) : 0;
    steelSpec = `${steelGrade} — legacy proxy ~${steelPerCum} kg/cum`;
  }
  if (steelKg > 0) fLines.push(line("reinforcement", "Reinforcement steel (cut, bent & placed)", steelSpec, "kg", steelKg, rates.reinforcement));

  // Paver base / steel frame specials priced by their own units.
  if (f.type === "paver_block_base") fLines.push(line("paver_base", "Paver-block foundation base", "compacted + 80 mm pavers", "sqm", L * W, rates.paverBase));
  if (f.type === "steel_foundation_frame") {
    const frameKg = round((2 * (L + W) + grid.rows * L) * 12); // ~12 kg/m grillage
    fLines.push(line("steel_frame", "MS foundation grillage frame", "bolted ISMC/ISMB", "kg", frameKg, rates.steelFrameFoundation));
  }

  // Backfilling around footings.
  const backfillCum = f.backfillCum ?? round(Math.max(0, excavationCum - concreteCum - pccCum) * 0.9);
  if (backfillCum > 0) fLines.push(line("backfilling", "Backfilling & consolidation", "excavated earth", "cum", backfillCum, rates.backfilling));

  // Raised plinth filling (earth + PCC top) if enabled here.
  if (input.flooringPlinth.raisedPlinth) {
    const plinthFillCum = round(L * W * raisedPlinthHt * 0.85);
    fLines.push(line("plinth_fill", "Raised plinth filling", `${round(raisedPlinthHt * 1000)} mm, murrum/soil`, "cum", plinthFillCum, rates.earthFilling));
  }

  // Plinth-beam schedule (only for foundation types that actually carry tie beams).
  // `beamTypes` / `hasPlinthBeam` are declared above — the BBS needs them earlier.
  const perimeterLen = round(2 * (L + W));
  const internalLen = round(Math.max(0, beamLen - perimeterLen));
  const wMm = Math.round(beamW * 1000), dMm = Math.round(beamD * 1000);
  const stirStr = `T${stirDia} @ ${stirSp} c/c`;
  const beams: BeamScheduleRow[] = [];
  if (hasPlinthBeam) {
    beams.push({
      mark: "PB1", role: "Perimeter tie beam", widthMm: wMm, depthMm: dMm, grade: f.grade,
      topBars: `${topBars}-T${mainDia}`, bottomBars: `${botBars}-T${mainDia}`, stirrups: stirStr, lengthM: perimeterLen,
    });
    if (internalLen > 0)
      beams.push({
        mark: "PB2", role: "Internal tie beam", widthMm: wMm, depthMm: dMm, grade: f.grade,
        topBars: `${topBars}-T${mainDia}`, bottomBars: `${botBars}-T${mainDia}`, stirrups: stirStr, lengthM: internalLen,
      });
  }

  const foundationConcrete = f.concreteCum ?? concreteCum;
  const foundation: FoundationResult = {
    head: "Foundation",
    lines: fLines,
    cost: sumCost(fLines),
    footingCount,
    concreteCum: foundationConcrete,
    pccCum,
    steelKg,
    excavationCum,
    backfillCum,
    plinthBeamLengthM: beamLen,
    grid,
    beams,
    // The SAME object the BBS was derived from — one section detail, no second copy to drift.
    section: sectionDetail,
    builtUpSqm: round(builtUp),
    pedestalCount,
    columnCount: footingCount,
    // Empty for foundation types with no isolated footings (raft, strip, …) — the F1/F2/F3 layout,
    // schedule and "load-differentiated footings" banner only ever show for a type that builds them.
    footingTypes: footingTypesForUi,
    gridFromPlan,
    rebar: rebarDesign,
    bbs,
    steelFromBbs: useBbs && isRcc && !(f.reinforcementKg != null && f.reinforcementKg > 0),
  };

  // SOIL BEARING CHECK — the footing is sized AGAINST the SBC, not merely labelled with it.
  // Service load per column = (built-up area × load intensity) / column count.
  // `builtUp` (not the raw ctx value) — it is already floored at the footprint area, so a missing
  // or zero built-up area can never make the bearing check NaN.
  // Each TYPE is checked against its own tributary load — a corner footing and an internal one are
  // not the same problem, so they are not the same check. Only for foundation types that actually
  // build these footings (footingTypesForUi) — a raft/strip has no isolated footing to overstress.
  for (const t of footingTypesForUi) {
    if (!t.adequate) {
      warnings.push(
        `Footing ${t.mark} (${t.kind}, ${t.count} nos) OVERSTRESSED: ${t.sideM} m square carries ` +
        `${Math.round(t.loadKn)} kN and delivers ${t.bearingPressureKnm2} kN/m² against an SBC of ` +
        `${t.sbcKnm2} kN/m² (${Math.round(t.utilisation * 100)}% of capacity). Increase ${t.mark} to at ` +
        `least ${t.requiredSideM} m square, or confirm a higher SBC by soil test.`,
      );
    }
  }

  // What the SBC check IS and — more importantly — what it is NOT.
  warnings.push(
    "The SBC result is a PRELIMINARY SERVICE-LOAD BEARING CHECK ONLY (load ÷ footing area vs the entered SBC). " +
    "It does NOT include settlement, punching shear, one-way/two-way shear, bending/flexural design, " +
    "eccentricity or uplift, seismic or wind design, or any full structural design.",
  );

  // Structural-engineer approval — required for EVERY colony, not only multi-storey.
  warnings.push(
    "NOT FOR CONSTRUCTION until approved: the foundation, reinforcement, footing depth, beam and column " +
    "sizes and the bar-bending schedule must be verified and STAMPED by a qualified structural engineer " +
    "against a site soil-investigation report (SBC) and the actual building loads.",
  );
  if (floors === 1) {
    warnings.push(
      "For a single-storey temporary labour colony, RCC/PCC pedestals below the main columns with a raised plinth and peripheral drainage are recommended.",
    );
  }

  /* ---------- FLOORING & PLINTH ---------- */
  const fp = input.flooringPlinth;
  const fpLines: CivilLine[] = [];
  if (fp.raisedPlinth) {
    const plinthConcrete = round((2 * (L + W)) * beamW * 0.15); // edge beam capping
    fpLines.push(line("raised_plinth", "Raised plinth edge beam / capping", `${round(raisedPlinthHt * 1000)} mm`, "cum", plinthConcrete, rates.raisedPlinth));
  }
  const pccFloor = fp.pccFlooringSqm ?? round(builtUp);
  if (pccFloor > 0) fpLines.push(line("pcc_flooring", "PCC flooring base", "75 mm, 1:4:8", "sqm", pccFloor, rates.pccFlooring));
  if (fp.rccFlooringSqm) fpLines.push(line("rcc_flooring", "RCC flooring", "100 mm, reinforced", "sqm", fp.rccFlooringSqm, rates.rccFlooring));
  const screed = fp.cementScreedSqm ?? round(builtUp);
  if (screed > 0) fpLines.push(line("cement_screed", "Cement screed / IPS finish", "50 mm", "sqm", screed, rates.cementScreed));
  if (fp.vitrifiedTilesSqm) fpLines.push(line("vitrified", "Vitrified tile flooring", "600x600", "sqm", fp.vitrifiedTilesSqm, rates.vitrifiedTiles));
  const antiSkid = fp.antiSkidTilesSqm ?? (ctx.wcCount ? round((ctx.wcCount + (ctx.bathCount ?? 0)) * 2.2) : 0);
  if (antiSkid > 0) fpLines.push(line("anti_skid", "Anti-skid tiles (wet areas)", "300x300", "sqm", antiSkid, rates.antiSkidTiles));
  if (fp.paverBlocksSqm) fpLines.push(line("pavers", "Paver-block flooring", "60/80 mm", "sqm", fp.paverBlocksSqm, rates.paverBlocks));
  const cwalk = fp.concreteWalkwaySqm ?? round(2 * (L + W) * 1.2); // 1.2 m peripheral apron
  if (cwalk > 0) fpLines.push(line("concrete_walkway", "Concrete walkway / apron", "1.2 m peripheral", "sqm", cwalk, rates.concreteWalkway));
  const flooringPlinth: CivilHeadResult = { head: "Flooring & Plinth", lines: fpLines, cost: sumCost(fpLines) };

  /* ---------- DRAINAGE & SEWAGE ---------- */
  const dr = input.drainage;
  const drLines: CivilLine[] = [];
  if (dr.enabled) {
    const storm = dr.peripheralStormDrainM ?? round(2 * (L + W) + 2 * margin * 2);
    drLines.push(line("storm_drain", "Peripheral stormwater drain", "RCC/brick, 300 mm", "m", storm, rates.stormDrain));
    const toiletDrain = dr.toiletDrainageM ?? round(((ctx.wcCount ?? 0) + (ctx.bathCount ?? 0)) * 3 + 10);
    if (toiletDrain > 0) drLines.push(line("toilet_drainage", "Toilet drainage line", "PVC 110 mm", "m", toiletDrain, rates.toiletDrainage));
    const sewage = dr.ugSewagePipeM ?? round(L + W + 20);
    drLines.push(line("ug_sewage", "Underground sewage pipe", "PVC/SW 160 mm", "m", sewage, rates.sewagePipe));
    const chambers = dr.inspectionChambers ?? Math.max(2, ceil((ctx.wcCount ?? 4) / 4));
    drLines.push(line("inspection_chamber", "Inspection chambers", "600x600 brick", "no", chambers, rates.inspectionChamber));
    const manholes = dr.manholes ?? Math.max(1, ceil(chambers / 3));
    drLines.push(line("manhole", "Manholes", "RCC cover", "no", manholes, rates.manhole));
    if (!dr.stpConnection) {
      const septic = dr.septicTanks ?? Math.max(1, ceil((ctx.totalCapacity ?? 50) / 60));
      drLines.push(line("septic_tank", "Septic tank", "brick/RCC, per IS 2470", "no", septic, rates.septicTank));
      const soak = dr.soakPits ?? septic;
      drLines.push(line("soak_pit", "Soak pit", "1.5 m dia", "no", soak, rates.soakPit));
    } else {
      drLines.push(line("stp", "STP connection / package plant", "as per capacity", "lump", 1, rates.stpConnection));
    }
    if (dr.greaseTraps || ctx.diningKitchen) drLines.push(line("grease_trap", "Grease trap (kitchen)", "brick/precast", "no", dr.greaseTraps ?? 1, rates.greaseTrap));
    if (dr.kitchenDrainM || ctx.diningKitchen) drLines.push(line("kitchen_drain", "Kitchen drain line", "PVC 110 mm", "m", dr.kitchenDrainM ?? 12, rates.kitchenDrain));
    if (dr.laundryDrainM) drLines.push(line("laundry_drain", "Laundry / washing drain", "PVC 110 mm", "m", dr.laundryDrainM, rates.laundryDrain));
  }
  const drainage: CivilHeadResult = { head: "Drainage & Sewage", lines: drLines, cost: sumCost(drLines) };

  /* ---------- WATER SUPPLY ---------- */
  const ws = input.waterSupply;
  const wsLines: CivilLine[] = [];
  if (ws.enabled) {
    const ugLine = ws.ugWaterLineM ?? round(L + W + 15);
    wsLines.push(line("ug_water_line", "Underground water supply line", "GI/HDPE", "m", ugLine, rates.ugWaterLine));
    const tankLtr = ws.overheadTankLitre ?? Math.max(2000, (ctx.totalCapacity ?? 50) * 135); // 135 lpcd
    wsLines.push(line("oh_tank", "Overhead water tank", `${tankLtr} L, PE/RCC`, "litre", tankLtr, rates.ohTankPerLitre));
    wsLines.push(line("tank_foundation", "Water-tank foundation / staging", "MS/RCC staging", "no", ws.tankFoundations ?? 1, rates.tankFoundation));
    wsLines.push(line("pump_room", "Pump room", "civil + door", "no", ws.pumpRooms ?? 1, rates.pumpRoom));
    wsLines.push(line("water_pump", "Water pump", "1–2 HP monoblock", "no", ws.waterPumps ?? 1, rates.waterPump));
    const cpvc = ws.cpvcUpvcM ?? round(((ctx.wcCount ?? 0) + (ctx.bathCount ?? 0)) * 4 + 30);
    wsLines.push(line("cpvc", "CPVC/UPVC distribution plumbing", "incl. fittings", "m", cpvc, rates.cpvcUpvc));
    if (ws.washingPoints) wsLines.push(line("washing_point", "Washing-point connections", "tap + trap", "no", ws.washingPoints, rates.washingPoint));
  }
  const waterSupply: CivilHeadResult = { head: "Water Supply", lines: wsLines, cost: sumCost(wsLines) };

  /* ---------- ELECTRICAL CIVIL ---------- */
  const ec = input.electricalCivil;
  const ecLines: CivilLine[] = [];
  if (ec.enabled) {
    const trench = ec.cableTrenchM ?? round(L + W + 20);
    ecLines.push(line("cable_trench", "Cable trench + sand/brick protection", "600 mm deep", "m", trench, rates.cableTrench));
    ecLines.push(line("panel_foundation", "Electrical-panel foundation", "RCC plinth", "no", ec.panelFoundations ?? 1, rates.panelFoundation));
    ecLines.push(line("earthing_pit", "Earthing pit", "GI/Cu, per IS 3043", "no", ec.earthingPits ?? (floors >= 2 ? 2 : 1), rates.earthingPit));
    const poles = ec.lightPoleFoundations ?? Math.max(2, ceil((2 * (L + W)) / 15));
    ecLines.push(line("pole_foundation", "Outdoor light-pole foundations", "RCC block", "no", poles, rates.lightPoleFoundation));
    if (ec.genTxFoundations) ecLines.push(line("gen_tx_foundation", "Generator/transformer foundation", "RCC raft + curb", "no", ec.genTxFoundations, rates.genTxFoundation));
  }
  const electricalCivil: CivilHeadResult = { head: "Electrical Civil Work", lines: ecLines, cost: sumCost(ecLines) };

  /* ---------- EXTERNAL DEVELOPMENT ---------- */
  const ed = input.externalDev;
  const edLines: CivilLine[] = [];
  if (ed.enabled) {
    if (ed.internalRoadSqm ?? true) edLines.push(line("internal_road", "Internal road", "WBM + BT/paver", "sqm", ed.internalRoadSqm ?? round(L * 3.5), rates.internalRoad));
    if (ed.paverPathwaySqm ?? true) edLines.push(line("paver_pathway", "Paver-block pedestrian pathway", "60 mm", "sqm", ed.paverPathwaySqm ?? round((L + W) * 1.2), rates.paverPathway));
    if (ed.concreteWalkwaySqm) edLines.push(line("ext_concrete_walkway", "Concrete walkway", "M15, 100 mm", "sqm", ed.concreteWalkwaySqm, rates.extConcreteWalkway));
    if (ed.fireTenderAccessSqm ?? true) edLines.push(line("fire_access", "Fire-tender access hardstand", "compacted + BT", "sqm", ed.fireTenderAccessSqm ?? round(L * 4), rates.fireTenderAccess));
    const fencing = ed.compoundFencingM ?? round(2 * (L + W) + 8 * margin);
    edLines.push(line("compound_fencing", "Compound fencing / boundary wall", "chainlink/masonry", "m", fencing, rates.compoundFencing));
    edLines.push(line("entrance_gate", "Entrance gate", "MS sliding/swing", "no", ed.entranceGates ?? 1, rates.entranceGate));
    edLines.push(line("security_cabin_foundation", "Security-cabin foundation", "RCC plinth", "no", ed.securityCabinFoundations ?? 1, rates.securityCabinFoundation));
    edLines.push(line("garbage_platform", "Garbage-collection platform", "RCC + wash", "no", ed.garbagePlatforms ?? 1, rates.garbagePlatform));
    if (ed.landscapingSqm) edLines.push(line("landscaping", "Landscaping / green area", "soil + turf", "sqm", ed.landscapingSqm, rates.landscaping));
    const rainwater = ed.rainwaterDrainageM ?? round(2 * (L + W));
    edLines.push(line("rainwater_drainage", "Rainwater drainage / harvesting channel", "RCC/HDPE", "m", rainwater, rates.rainwaterDrainage));
  }
  const externalDev: CivilHeadResult = { head: "External Development", lines: edLines, cost: sumCost(edLines) };

  /* ---------- AGGREGATE ---------- */
  const heads = [sitePrep, foundation, flooringPlinth, drainage, waterSupply, electricalCivil, externalDev];
  const boq: CivilBoqRow[] = [];
  let sl = 0;
  for (const h of heads) {
    for (const l of h.lines) boq.push({ sl: ++sl, head: h.head, ...l });
  }
  const totalCost = round(heads.reduce((s, h) => s + h.cost, 0));
  const totalConcreteCum = round(pccCum + foundationConcrete + (fp.rccFlooringSqm ? fp.rccFlooringSqm * 0.1 : 0));
  const totalSteelKg = steelKg;

  /* ---------- QUOTE GATE — never move the customer's price silently ----------
   * The freshly-computed numbers are compared against the last price the user APPROVED. While they
   * differ, `effectiveTotalCost` stays on the approved figure and `pending` is true, so the UI can
   * show a before/after comparison and demand a confirmation before the BOQ price changes. */
  const computedQuote: ApprovedCivilQuote = {
    footingCount,
    steelKg: totalSteelKg,
    concreteCum: totalConcreteCum,
    foundationCost: foundation.cost,
    totalCost,
    approvedAt: "",
  };
  const ap = input.approvedQuote;
  const DELTA_DEFS: { key: QuoteDelta["key"]; label: string; unit: string }[] = [
    { key: "footingCount", label: "Footings / pedestals / columns", unit: "nos" },
    { key: "steelKg", label: "Reinforcement steel", unit: "kg" },
    { key: "concreteCum", label: "Concrete", unit: "cum" },
    { key: "foundationCost", label: "Foundation cost", unit: "INR" },
    { key: "totalCost", label: "Civil total", unit: "INR" },
  ];
  const deltas: QuoteDelta[] = ap
    ? DELTA_DEFS
        .map((d) => ({ ...d, before: ap[d.key], after: computedQuote[d.key], diff: round(computedQuote[d.key] - ap[d.key]) }))
        .filter((d) => Math.abs(d.diff) > 0.005)
    : [];
  const quoteGate: QuoteGate = {
    hasApproved: !!ap,
    pending: !!ap && deltas.length > 0,
    approved: ap,
    computed: computedQuote,
    deltas,
    effectiveTotalCost: ap && deltas.length > 0 ? ap.totalCost : totalCost,
  };
  if (quoteGate.pending) {
    warnings.push(
      `Quoted price is on hold: the civil quantities have changed since the last approval ` +
      `(${deltas.map((d) => d.label).join(", ")}). Review the before/after comparison and confirm ` +
      `before the BOQ price is updated.`,
    );
  }

  return {
    enabled: input.enabled,
    sitePrep, foundation, flooringPlinth, drainage, waterSupply, electricalCivil, externalDev,
    boq, totalCost, totalConcreteCum, totalSteelKg, warnings, rates, quoteGate,
  };
}

/** Convenience: built-up area to sqft, for rate-per-sqft displays. */
export const civilSqmToSqft = (sqm: number) => round(sqm * SQM_TO_SQFT);
