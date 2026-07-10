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
  /** Column count override (else auto from footprint grid). */
  footingCount?: number;
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
  /** Steel intensity kg per cum of RCC (else default). */
  steelKgPerCum?: number;
  /** Hard overrides for the headline quantities. */
  reinforcementKg?: number;
  excavationCum?: number;
  backfillCum?: number;
  concreteCum?: number;
  /** Column grid spacing target (m); tunes the auto grid. */
  columnSpacingM?: number;
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
}

/** Context handed in from the main labour-colony calculation. */
export interface CivilContext {
  footprintLengthM: number;
  footprintWidthM: number;
  builtUpSqm: number;
  floors: 1 | 2 | 3;
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

export interface FoundationResult extends CivilHeadResult {
  footingCount: number;
  concreteCum: number;
  pccCum: number;
  steelKg: number;
  excavationCum: number;
  backfillCum: number;
  plinthBeamLengthM: number;
  grid: FoundationGrid;
  /** Section-detail dimensions (m) for the plinth-beam section drawing. */
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
  };
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

/** Build the column grid from the footprint + target spacing. */
export function buildFoundationGrid(
  footprintLengthM: number,
  footprintWidthM: number,
  spacingTargetM = 3,
  countOverride?: number,
  plinthLenOverride?: number,
): FoundationGrid {
  const L = Math.max(1, footprintLengthM);
  const W = Math.max(1, footprintWidthM);
  const spacing = Math.max(2, spacingTargetM);
  const cols = Math.max(2, ceil(L / spacing) + 1);
  const rows = Math.max(2, ceil(W / spacing) + 1);
  const xsM: number[] = [];
  const ysM: number[] = [];
  for (let i = 0; i < cols; i++) xsM.push(round((i * L) / (cols - 1), 3));
  for (let j = 0; j < rows; j++) ysM.push(round((j * W) / (rows - 1), 3));
  const autoCount = cols * rows;
  const columnCount = countOverride && countOverride > 0 ? countOverride : autoCount;
  // Plinth-beam runs along every grid line (both directions).
  const beamAlongLength = rows * L;   // horizontal lines
  const beamAlongWidth = cols * W;    // vertical lines
  const autoBeamLen = beamAlongLength + beamAlongWidth;
  const plinthBeamLengthM = plinthLenOverride && plinthLenOverride > 0 ? plinthLenOverride : round(autoBeamLen);
  return { footprintLengthM: round(L), footprintWidthM: round(W), cols, rows, xsM, ysM, spacingM: spacing, columnCount, plinthBeamLengthM };
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
  const grid = buildFoundationGrid(L, W, f.columnSpacingM ?? 3, f.footingCount, f.plinthBeamLengthM);
  const footingCount = grid.columnCount;

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

  const fLines: CivilLine[] = [];
  const gradeRate = rates.rccByGrade[f.grade];

  // Excavation for footing pits (+150 mm working space each side, +PCC depth).
  const pitVol = (footL + 0.3) * (footW + 0.3) * (footD + pccThk / 1000 + 0.05) * footingCount;
  const excavationCum = f.excavationCum ?? round(pitVol);
  fLines.push(line("excavation", "Excavation in foundation", "ordinary soil, pits", "cum", excavationCum, rates.excavation));

  // PCC bed under footings (or over whole footprint for raft/pcc_bed).
  let pccCum: number;
  if (f.type === "full_rcc_slab") {
    pccCum = round(L * W * (pccThk / 1000));
  } else if (f.type === "pcc_bed") {
    pccCum = round(L * W * Math.max(0.1, pccThk / 1000));
  } else {
    pccCum = round((footL + 0.2) * (footW + 0.2) * (pccThk / 1000) * footingCount);
  }
  if (pccCum > 0) fLines.push(line("pcc_bed", "PCC bed / levelling course", `${pccThk} mm, 1:4:8`, "cum", pccCum, rates.pcc));

  // Main structural concrete depends on the foundation type.
  let concreteCum = 0;
  let concreteSpec = "";
  switch (f.type) {
    case "rcc_isolated_footing":
    case "rcc_pedestal": {
      const footings = footL * footW * footD * footingCount;
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
      concreteCum = round(beamW * beamD * beamLen + footL * footW * footD * footingCount * 0.5);
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

  // Reinforcement steel (skip for non-RCC types).
  const rccTypes: FoundationType[] = ["rcc_isolated_footing", "rcc_pedestal", "rcc_strip_footing", "rcc_plinth_beam", "full_rcc_slab", "steel_foundation_frame"];
  const steelKg = f.reinforcementKg ?? (rccTypes.includes(f.type) ? round(concreteCum * steelPerCum) : 0);
  if (steelKg > 0) fLines.push(line("reinforcement", "Reinforcement steel (Fe500)", `~${steelPerCum} kg/cum, cut/bent/placed`, "kg", steelKg, rates.reinforcement));

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
    section: {
      footingLengthM: footL, footingDepthM: footD, pedestalSizeM: pedSize, pedestalHeightM: pedHt,
      plinthBeamWidthM: beamW, plinthBeamDepthM: beamD, pccThicknessMm: pccThk, raisedPlinthHeightM: raisedPlinthHt,
      grade: f.grade, type: f.type,
    },
  };

  // Structural-engineer warning for multi-storey.
  if (floors >= 2) {
    warnings.push(
      "Foundation size, reinforcement and footing depth must be confirmed by a structural engineer based on soil-bearing capacity and building loads.",
    );
  } else {
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

  return {
    enabled: input.enabled,
    sitePrep, foundation, flooringPlinth, drainage, waterSupply, electricalCivil, externalDev,
    boq, totalCost, totalConcreteCum, totalSteelKg, warnings, rates,
  };
}

/** Convenience: built-up area to sqft, for rate-per-sqft displays. */
export const civilSqmToSqft = (sqm: number) => round(sqm * SQM_TO_SQFT);
