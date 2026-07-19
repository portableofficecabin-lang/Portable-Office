/**
 * MATERIAL BOQ — shared contract (pure, framework-free, no React, no Supabase).
 *
 * ONE take-off IR, TWO producers, ONE pricing engine:
 *
 *   CabinConfig      ──cabinTakeoff.ts──┐
 *                                       ├──▶ Takeoff ──▶ priceTakeoff() ──▶ BoqResult
 *   LabourColonyResult ─colonyTakeoff.ts┘        ▲                              │
 *          (+ buildRoomFloorPlan / buildElevation)│                              ├─▶ cutting list
 *                                          MaterialMaster                        ├─▶ elevation-wise breakup
 *                                          (DB — never hard-coded)               ├─▶ purchase report
 *                                                                                └─▶ validation
 *
 * NON-NEGOTIABLES (spec §1, §2, §10):
 *  1. Weights and rates come ONLY from the Material Master. The engine never invents a
 *     kg/m or a ₹. A member whose material has no unit weight produces a VALIDATION
 *     ERROR and a zero-weight line — it never silently guesses.
 *  2. Every take-off item carries the `drawingRef` it came from, so the BOQ can never
 *     drift from the drawing. The take-off producers read the SAME geometry the SVG
 *     drawings render (buildRoomFloorPlan / buildElevation / the cabin frame grid).
 *  3. Canonical units inside the take-off are METRES / SQUARE METRES / KILOGRAMS.
 *     The cabin calculator stores FEET — cabinTakeoff.ts converts at its edge.
 */

/* ==========================================================================
 * 1. MATERIAL MASTER  (spec §1)
 * ========================================================================== */

export type MaterialCategory =
  | "steel_section"      // tubes, channels, angles — priced by running length / weight
  | "sheet"              // MS/GI/PPGI wall + roof sheet — priced by area
  | "panel"              // PUF / EPS sandwich panel
  | "insulation"         // glass wool, XPS
  | "board"              // cement / bison / ply flooring board
  | "floor_finish"       // vinyl, tile
  | "door"
  | "window"
  | "hardware"           // bolts, screws, hinges, handrail fittings
  | "electrical"
  | "plumbing"
  | "finishing"          // primer, paint, sealant
  | "misc";

/** How the Material Master's `unitWeight` should be read. */
export type WeightBasis =
  | "kg_per_m"    // steel sections
  | "kg_per_sqm"  // sheets, panels, insulation, boards
  | "kg_per_nos"  // doors, windows, fittings
  | "none";       // weightless items (labour-ish consumables)

/** How the Material Master's `purchaseRate` should be applied. */
export type RateUnit =
  | "per_kg"
  | "per_m"
  | "per_sqm"
  | "per_nos"
  | "per_sheet"          // rate for ONE standard sheet
  | "per_stock_length"   // rate for ONE standard stock length bar
  | "per_ltr"
  | "per_lot";

/** Unit of measurement shown on the BOQ line. */
export type Uom = "m" | "sqm" | "kg" | "nos" | "ltr" | "sheet" | "lot";

export interface Material {
  /** Stable business key referenced by every take-off item. e.g. "rhs-100x50x3". */
  key: string;
  name: string;
  category: MaterialCategory;
  /** Section / profile size, e.g. "100 x 50 mm RHS", "0.5 mm PPGI coil". */
  sectionSize: string;
  thicknessMm: number | null;
  grade: string;                 // "IS 4923 YSt 210", "PPGI 0.5", "PUF 40 kg/m³"
  uom: Uom;
  /** Weight of ONE unit of `weightBasis`. NULL ⇒ validation error when used. */
  unitWeight: number | null;
  weightBasis: WeightBasis;
  /** Standard purchasable bar length (m) — steel only. NULL ⇒ no nesting, buy exact length. */
  stockLengthM: number | null;
  /** Standard sheet/panel size (m) — sheets/panels only. */
  sheetLengthM: number | null;
  sheetWidthM: number | null;
  /* ---- optional lap / layout properties (spec §12–§14) ----
   * Set these on a sheet material to switch it from the plain area count to a row-by-row lapped
   * layout. All NULL/absent ⇒ the legacy count (byte-identical). */
  /** Effective usable width before the side-lap deduction (m). NULL ⇒ falls back to sheetWidthM. */
  coverWidthM?: number | null;
  /** Side-lap between adjacent sheets across the span (m). */
  sideLapM?: number | null;
  /** End-lap between sheets in successive rows along the run (m). */
  endLapM?: number | null;
  /** Standard purchasable sheet length (m). NULL ⇒ falls back to sheetLengthM. */
  standardLengthM?: number | null;
  /** NULL ⇒ validation error when used. */
  purchaseRate: number | null;
  rateUnit: RateUnit;
  wastagePercent: number;
  supplier: string;
  /** ISO date the rate takes effect. Latest effective row ≤ today wins. */
  effectiveDate: string;
  isActive: boolean;
  notes?: string;
  id?: string;        // DB uuid
  updatedAt?: string;
}

/** key → Material. Built from the DB, passed into every pricing call. */
export type MaterialIndex = Record<string, Material>;

/* ==========================================================================
 * 2. TAKE-OFF IR  (spec §2, §5)
 * ========================================================================== */

/**
 * The BOQ head an item is attributed to. This IS the elevation-wise breakup (spec §5) —
 * grouping the priced lines by `section` produces it with no second calculation.
 */
export type BoqSection =
  | "floor"        // bottom base frame, floor cross members, flooring, vinyl
  | "roof"         // top frame, trusses, purlins, roof sheet, ceiling
  | "front"        // front elevation framing + sheets
  | "rear"
  | "left"
  | "right"
  | "partition"    // internal partitions
  | "openings"     // door + window frames, leaves, grills
  | "staircase"
  | "veranda"      // veranda / corridor / walkway / handrail / chequered plate
  | "furniture"    // parametric tables + their chairs, storage, screens and fittings
  | "electrical"
  | "plumbing"
  | "finishing"
  | "misc";

export const BOQ_SECTIONS: { id: BoqSection; label: string; drawing: string }[] = [
  { id: "floor",      label: "Floor structure",      drawing: "2D Floor Plan" },
  { id: "roof",       label: "Roof structure",       drawing: "Roof Drawing" },
  { id: "front",      label: "Front elevation",      drawing: "Front Elevation" },
  { id: "rear",       label: "Rear elevation",       drawing: "Rear Elevation" },
  { id: "left",       label: "Left elevation",       drawing: "Left Elevation" },
  { id: "right",      label: "Right elevation",      drawing: "Right Elevation" },
  { id: "partition",  label: "Internal partitions",  drawing: "2D Floor Plan" },
  { id: "openings",   label: "Doors & windows",      drawing: "Elevations + Floor Plan" },
  { id: "staircase",  label: "Staircase",            drawing: "Floor Plan + Elevation" },
  { id: "veranda",    label: "Veranda / walkway",    drawing: "Floor Plan + Elevation" },
  { id: "furniture",  label: "Furniture — tables",   drawing: "Furniture Layout" },
  { id: "electrical", label: "Electrical work",      drawing: "Electrical Layout" },
  { id: "plumbing",   label: "Plumbing work",        drawing: "Floor Plan" },
  { id: "finishing",  label: "Finishing",            drawing: "—" },
  { id: "misc",       label: "Miscellaneous",        drawing: "—" },
];

/** Fields every take-off item shares. */
interface TakeoffBase {
  /**
   * Stable, deterministic id. It is the override key, so it MUST NOT change when an
   * unrelated part of the design changes. Convention:
   *   "<section>:<slug>"            e.g. "floor:base-frame-long"
   *   "<section>:<slug>:<discrim>"  e.g. "partition:studs:p2"
   */
  id: string;
  section: BoqSection;
  /** Material Master key. Unknown key ⇒ validation error. */
  materialKey: string;
  description: string;
  /** Human-readable derivation, printed verbatim in the report's "Calculation formula" column. */
  formula: string;
  /** Which drawing this came from — "Front Elevation", "Roof Drawing", "2D Floor Plan", … */
  drawingRef: string;
}

/** A steel member run: `qty` pieces, each cut to `cutLengthM`. (spec §3) */
export interface SteelTakeoff extends TakeoffBase {
  kind: "steel";
  qty: number;
  cutLengthM: number;
  /** Centre-to-centre spacing (m) that drove this member's count, when a spacing did. (spec §16) */
  spacingM?: number;
  /**
   * Canonical geometry key of the wall/line this member sits on. Two modules that share a
   * wall produce the SAME key, and colonyTakeoff emits the member exactly once. Validation
   * rule "shared walls counted twice" asserts each key appears once. (spec §6, §10)
   */
  geomKey?: string;
  /** Set when this member is shared between modules — printed as a BOQ remark. */
  sharedBy?: number;
}

/** An area of covering material with opening deductions. (spec §4) */
export interface SheetTakeoff extends TakeoffBase {
  kind: "sheet";
  grossAreaSqm: number;
  /** Door/window openings removed from THIS covering. Framing is added separately. (spec §4) */
  deductions: { label: string; areaSqm: number }[];
  /** Faces of covering on this area (partition sheeted both sides ⇒ 2). */
  faces: number;
  geomKey?: string;
  sharedBy?: number;
  /* ---- optional sheet-LAYOUT geometry (spec §12–§14) ----
   * The covering rectangle's two dimensions. When BOTH are present AND the material carries a
   * standard length + cover width, the engine lays sheets out row-by-row with side/end laps instead
   * of the plain area ÷ sheet-area count. Absent ⇒ the legacy count, so colony + existing cabins are
   * byte-identical. */
  /** The direction sheets run end-to-end (m) — a run longer than the sheet needs multiple rows. */
  runM?: number;
  /** The direction sheets sit side-by-side (m) — covered by the effective cover width. */
  spanM?: number;
  /**
   * Number of identical run×span rectangles the layout repeats over — 2 for a two-slope roof, `floors`
   * for a stacked wall. Defaults to `faces` when absent. Kept separate from `faces` so runM/spanM can
   * describe ONE rectangle without disturbing the net-area (grossArea × faces) calculation.
   */
  layoutFaces?: number;
  /** How the sheets are laid, for the 2D/3D overlay. */
  orientation?: SheetOrientation;
}

export type SheetOrientation = "vertical" | "horizontal";

/** A counted item — doors, windows, fittings, bolts. */
export interface CountTakeoff extends TakeoffBase {
  kind: "count";
  qty: number;
}

export type TakeoffItem = SteelTakeoff | SheetTakeoff | CountTakeoff;

/** Dimensions the take-off was derived from — echoed into every report header. */
export interface TakeoffMeta {
  source: "cabin" | "colony";
  title: string;
  lengthM: number;
  widthM: number;
  heightM: number;
  floors: number;
  rooms: number;
  partitions: number;
  doors: number;
  windows: number;
  staircases: number;
  verandas: number;
  modules: number;
  floorAreaSqm: number;
  roofType: string;
}

export interface Takeoff {
  meta: TakeoffMeta;
  items: TakeoffItem[];
  /** Assumptions + dedup notes ("12 shared walls counted once"). Printed under the BOQ. */
  notes: string[];
  /** Frame geometry the take-off used, re-exported so a drawing overlay can render the
   *  EXACT members that were priced. Empty for producers that have no overlay yet. */
  frame?: FrameGeometry;
}

/** Post/stud/joist/purlin lines the take-off counted — drawable, so the drawing can prove the BOQ. */
export interface FrameGeometry {
  /** Vertical member lines on each elevation, metres from that elevation's left edge. */
  posts: { face: BoqSection; xM: number; kind: "corner" | "post" | "stud" }[];
  /** Floor joist lines (plan), metres from origin along the length. */
  joists: number[];
  /** Roof purlin lines (plan), metres from origin along the length. */
  purlins: number[];
}

/* ==========================================================================
 * 3. ADMIN OVERRIDES + TEMPLATES  (spec §8)
 * ========================================================================== */

/** One admin edit against one take-off item id. Anything left undefined stays AUTO. */
export interface BoqOverride {
  /** Manually entered quantity (pieces / sqm / nos, matching the line's uom). */
  qty?: number;
  /** Locked ⇒ recalculation must NOT overwrite `qty`. (spec §8) */
  locked?: boolean;
  /** Per-quotation rate override (₹, in the material's rateUnit). */
  rate?: number;
  wastagePercent?: number;
  /** false ⇒ line excluded from all totals but still shown, struck through. */
  enabled?: boolean;
  materialKey?: string;
  note?: string;
}

/** An admin-added row that no drawing produced. */
export interface ManualBoqItem {
  id: string;              // "manual:<uuid>"
  section: BoqSection;
  materialKey: string;
  description: string;
  qty: number;
  /** Steel manual rows may carry a cut length so they join the cutting list. */
  cutLengthM?: number;
  areaSqm?: number;
  note?: string;
}

/** Labour / fabrication / painting / transport / installation. (spec §8) */
export interface ChargeLine {
  id: string;
  label: string;
  /** "amount" = flat ₹ · "per_kg" = ₹ × total steel kg · "percent" = % of material subtotal */
  basis: "amount" | "per_kg" | "per_sqm" | "percent";
  value: number;
  enabled: boolean;
}

export const DEFAULT_CHARGES: ChargeLine[] = [
  { id: "labour",       label: "Labour",             basis: "per_kg",  value: 12,    enabled: true },
  { id: "fabrication",  label: "Fabrication / welding", basis: "per_kg", value: 18,  enabled: true },
  { id: "painting",     label: "Painting (primer + enamel)", basis: "per_sqm", value: 85, enabled: true },
  { id: "transport",    label: "Transport",          basis: "amount",  value: 18000, enabled: true },
  { id: "installation", label: "Installation",       basis: "amount",  value: 15000, enabled: true },
];

export type BoqTemplateKind = "ms_cabin" | "puf_cabin" | "container" | "labour_colony";

/**
 * BOQ-only cabin extensions. The customer wizard has no multi-floor / staircase / veranda concept,
 * so these are admin-entered on the BOQ panel and default to a single-storey cabin with neither.
 *
 * Declared HERE rather than in cabinTakeoff.ts on purpose: pricing.ts carries this on CabinConfig,
 * and cabinTakeoff.ts imports CabinConfig FROM pricing.ts — so defining it there would make the two
 * files import each other.
 */
export interface CabinBoqOptions {
  floors?: number;
  /** Implied true when floors > 1. */
  staircase?: boolean;
  /** 0 = no veranda. */
  verandaWidthFt?: number;
  verandaSides?: ("front" | "rear" | "left" | "right")[];
  handrail?: boolean;
  /**
   * Take off the internal MDF-lining support batten grid (spec §7). Off by default so an existing
   * quotation is unchanged; when on, a 50×25 vertical + horizontal batten grid is added behind the
   * internal lining at norms.mdfSupport*SpacingM.
   */
  internalMdfSupport?: boolean;
  /**
   * Add the roof-rise allowance to the four corner columns (spec §5). Off by default. When on, the
   * corner posts of a sloped cabin are cut to the eave height PLUS the roof rise.
   */
  cornerColumnRoofRise?: boolean;
  /**
   * Roof rise (feet) over the half-width for a sloped roof (spec §2). Absent ⇒ the standard 8″
   * (DEFAULT_ROOF_RISE_FT), so an existing quotation and the 3D model are unchanged. Drives the
   * rafter length, the sloped roof-sheet area and the 3D roof peak.
   */
  roofRiseFt?: number;
}

/** The standard sloped-roof rise (feet) over the half-width — 8″, matching the 3D model + drawings. */
export const DEFAULT_ROOF_RISE_FT = 8 / 12;

/** Resolve the roof rise (feet) from the BOQ options, falling back to the standard 8″. */
export function roofRiseFtOf(opts: CabinBoqOptions | undefined): number {
  const v = opts?.roofRiseFt;
  return typeof v === "number" && isFinite(v) && v >= 0 ? v : DEFAULT_ROOF_RISE_FT;
}

/** Everything the admin can tune, persisted per quotation AND saveable as a template. */
export interface BoqSettings {
  /** Template this state was seeded from. */
  templateKind: BoqTemplateKind;
  templateId?: string;
  /**
   * Global wastage OVERRIDE, not a floor: when set it replaces every material's own wastagePercent
   * (a per-line BoqOverride still beats it). null ⇒ each material uses its own %. A floor would make
   * it impossible to quote a job at a tighter wastage than the master's defaults, which is exactly
   * what an admin tuning a competitive quotation needs to do.
   *   effective % = override.wastagePercent ?? settings.wastagePercent ?? material.wastagePercent
   */
  wastagePercent: number | null;
  /** Structural norms — spacing rules the frame take-off obeys. */
  norms: BoqNorms;
  /** materialKey substitution: role → key. Lets a PUF template swap the wall material. */
  materialMap: Record<string, string>;
  overrides: Record<string, BoqOverride>;
  manualItems: ManualBoqItem[];
  charges: ChargeLine[];
  gstPercent: number;
  /** Sections the admin switched off entirely. */
  disabledSections: BoqSection[];
  /**
   * Competitive / selling-price markup on the BOQ COST (spec §15). Optional and additive: absent or
   * all-zero ⇒ selling == cost, so an existing quotation is untouched. This is an INTERNAL sales tool
   * only — it never feeds the customer/GMC selling price (pricing.ts computeEstimate) or the Merchant
   * feed. See CompetitivePricing / computeCompetitive.
   */
  competitive?: CompetitivePricing;
}

/** Structural spacing norms — every count in the take-off is derived from these. */
export interface BoqNorms {
  /** Max spacing of vertical posts on a wall (m). */
  postSpacingM: number;
  /** Max spacing of intermediate wall stiffeners / studs (m). */
  studSpacingM: number;
  /** Max spacing of floor cross members (m). */
  joistSpacingM: number;
  /** Max spacing of roof cross members / purlins (m). */
  purlinSpacingM: number;
  /** Max spacing of roof trusses / slope frames (m). */
  trussSpacingM: number;
  /** Max spacing of internal MDF-lining support battens — vertical (m). (spec §7) */
  mdfSupportVSpacingM: number;
  /** Max spacing of internal MDF-lining support battens — horizontal (m). (spec §7) */
  mdfSupportHSpacingM: number;
  /** Cutting loss added to every steel bar, on top of the material's wastage (%). */
  cuttingWastagePercent: number;
  /** Sheet off-cut allowance (%). */
  sheetWastagePercent: number;
  /** Handrail height (m) — drives handrail post + rail lengths. */
  handrailHeightM: number;
  /** Handrail post spacing (m). */
  handrailPostSpacingM: number;
  /** Number of horizontal rails in a handrail. */
  handrailRails: number;
}

export const DEFAULT_NORMS: BoqNorms = {
  postSpacingM: 3.0,
  studSpacingM: 0.6,
  joistSpacingM: 1.0,
  purlinSpacingM: 1.0,
  trussSpacingM: 1.2,
  mdfSupportVSpacingM: 0.6096, // 2'-0" c/c — only consumed when internal MDF support is taken off
  mdfSupportHSpacingM: 0.6096,
  cuttingWastagePercent: 3,
  sheetWastagePercent: 5,
  handrailHeightM: 0.9,
  handrailPostSpacingM: 1.5,
  handrailRails: 3,
};

export function defaultBoqSettings(kind: BoqTemplateKind = "ms_cabin"): BoqSettings {
  return {
    templateKind: kind,
    wastagePercent: null,
    norms: { ...DEFAULT_NORMS },
    materialMap: {},
    overrides: {},
    manualItems: [],
    charges: DEFAULT_CHARGES.map((c) => ({ ...c })),
    gstPercent: 18,
    disabledSections: [],
  };
}

/* ==========================================================================
 * 4. PRICED OUTPUT  (spec §3, §4, §9)
 * ========================================================================== */

/** The origin of a line's quantity — printed as an AUTO / MANUAL / LOCKED chip. (spec §8) */
export type QtySource = "auto" | "manual" | "locked" | "added";

/** One row of the detailed Material BOQ. Every field the report must show. (spec §9) */
export interface BoqLine {
  id: string;
  section: BoqSection;
  enabled: boolean;
  qtySource: QtySource;

  /* material */
  materialKey: string;
  material: string;          // name
  category: MaterialCategory;
  spec: string;              // section size + thickness + grade
  grade: string;

  /* derivation */
  description: string;
  formula: string;
  drawingRef: string;

  /* quantity — the primary billed quantity in `uom` */
  qty: number;
  uom: Uom;

  /* steel-only (spec §3) */
  pieces: number | null;
  cutLengthM: number | null;
  runningLengthM: number | null;
  stockLengthM: number | null;
  stockBars: number | null;
  /** c/c spacing (m) that drove the member count, when a spacing did. (spec §16) */
  spacingM?: number | null;

  /* sheet-only (spec §4) */
  grossAreaSqm: number | null;
  deductionSqm: number | null;
  netAreaSqm: number | null;
  sheetSize: string | null;
  sheets: number | null;

  /* sheet-LAYOUT — populated only when the material uses lapped layout (spec §12–§14), else null */
  sheetRows?: number | null;
  fullSheets?: number | null;
  cutSheets?: number | null;
  /** Gross area of all sheets bought for this covering (incl. laps + trim). */
  coverageSqm?: number | null;
  overlapSqm?: number | null;
  scrapSqm?: number | null;
  reusableOffcutSqm?: number | null;
  sheetOrientation?: SheetOrientation | null;

  /* weight */
  unitWeight: number | null;   // in weightBasis
  weightBasis: WeightBasis;
  netWeightKg: number;
  totalWeightKg: number;       // incl. wastage

  /* money */
  wastagePercent: number;
  rate: number | null;
  rateUnit: RateUnit;
  amount: number;

  /** Non-fatal notes ("shared by 2 modules — counted once"). */
  remarks: string[];
  /** Which shared-wall / geometry key produced it. */
  geomKey?: string;
}

/** A steel cutting-list row: member description, section size, cut length, qty. (spec §3) */
export interface CuttingRow {
  materialKey: string;
  material: string;
  spec: string;
  section: BoqSection;
  member: string;
  cutLengthM: number;
  qty: number;
  totalLengthM: number;
  weightKg: number;
  drawingRef: string;
}

/** Stock-length nesting for one material. (spec §3) */
export interface PurchaseRow {
  materialKey: string;
  material: string;
  spec: string;
  category: MaterialCategory;
  uom: Uom;
  /** Net take-off quantity before wastage. */
  netQty: number;
  wastagePercent: number;
  /** Net + wastage — what must be bought. */
  purchaseQty: number;
  /** Steel: standard bars to buy. Sheets: sheets to buy. */
  stockUnits: number | null;
  stockUnitLabel: string | null;
  /** Off-cut left over across all bars/sheets (m or sqm). */
  offcut: number | null;
  /** For lapped sheet materials (spec §17): the off-cut split into reusable vs unrecoverable scrap. */
  reusableOffcutSqm?: number | null;
  scrapSqm?: number | null;
  totalWeightKg: number;
  rate: number | null;
  rateUnit: RateUnit;
  amount: number;
  supplier: string;
}

export interface SectionSummary {
  section: BoqSection;
  label: string;
  drawing: string;
  steelKg: number;
  totalKg: number;
  materialAmount: number;
  lines: number;
}

/** Validation severity. Errors block a quotation; warnings are advisory. (spec §10) */
export type IssueSeverity = "error" | "warning";
export type IssueCode =
  | "missing_unit_weight"
  | "missing_rate"
  | "unknown_material"
  | "unlinked_element"
  | "duplicate_calculation"
  | "opening_exceeds_wall"
  | "shared_wall_double_counted"
  | "negative_quantity"
  | "zero_length_member"
  | "quantity_drawing_mismatch"
  | "stale_rate";

export interface BoqIssue {
  code: IssueCode;
  severity: IssueSeverity;
  message: string;
  /** Line / take-off item ids the issue points at. */
  refs: string[];
  section?: BoqSection;
  hint?: string;
}

export interface BoqTotals {
  netSteelKg: number;
  totalSteelKg: number;
  totalWeightKg: number;
  totalTonnes: number;
  materialAmount: number;
  chargesAmount: number;
  chargeLines: { label: string; basis: string; amount: number }[];
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  /** ₹ per sqft of floor area — the sanity number the sales team quotes on. */
  ratePerSqft: number;
}

/* ==========================================================================
 * COMPETITIVE / SELLING-PRICE PRICING  (spec §15) — INTERNAL sales tool.
 *
 * A bottom-up markup on the BOQ COST (BoqTotals.subtotal) so the sales desk can see
 * cost → selling → competitor instantly and never quote below a safe margin. This is ENTIRELY
 * SEPARATE from the customer/GMC selling price (pricing.ts computeEstimate, a top-down ₹/sqft model):
 * computeCompetitive reads ONLY BoqTotals and never feeds the estimate or the Merchant feed. Absent
 * or all-zero ⇒ selling == cost, so an existing quotation is completely unaffected.
 * ========================================================================== */

export interface CompetitivePricing {
  /** Overhead as a % of the ex-GST cost base (subtotal). */
  overheadPercent: number;
  /** Flat overhead ₹ added on top of the % overhead. */
  overheadAmount: number;
  /** Profit markup % applied AFTER overhead. */
  profitPercent: number;
  /** GST % on the SELLING price. null ⇒ reuse settings.gstPercent. */
  gstPercent: number | null;
  /** Round the final GST-inclusive selling price to the nearest ₹ (0 ⇒ no rounding). */
  roundTo: number;
  /** Market / competitor benchmark, ₹ per sqft (GST-inclusive). null ⇒ not entered. */
  competitorRatePerSqft: number | null;
  /** Target rate the sales team wants to hit, ₹ per sqft (GST-inclusive). null ⇒ not entered. */
  targetRatePerSqft: number | null;
  /** Minimum SAFE selling rate, ₹ per sqft (GST-inclusive). Selling below it raises a warning. */
  minRatePerSqft: number | null;
}

export const DEFAULT_COMPETITIVE: CompetitivePricing = {
  overheadPercent: 0,
  overheadAmount: 0,
  profitPercent: 0,
  gstPercent: null,
  roundTo: 0,
  competitorRatePerSqft: null,
  targetRatePerSqft: null,
  minRatePerSqft: null,
};

export interface CompetitiveResult {
  /** Ex-GST COST base (= totals.subtotal). */
  costBase: number;
  overheadAmount: number;
  costWithOverhead: number;
  profitAmount: number;
  /** Ex-GST selling price = costWithOverhead + profit. */
  exGstSelling: number;
  gstPercent: number;
  gstAmount: number;
  /** Final GST-inclusive selling price (rounded to roundTo). */
  finalSelling: number;
  ratePerSqft: number;
  ratePerSqm: number;
  /** exGstSelling − costBase. */
  grossProfit: number;
  /** grossProfit / exGstSelling × 100. */
  grossMarginPercent: number;
  minSafeSelling: number | null;
  targetSelling: number | null;
  competitorSelling: number | null;
  /** finalSelling vs target/competitor selling, ₹ and %. Positive ⇒ we are dearer. */
  vsTargetAmount: number | null;
  vsTargetPercent: number | null;
  vsCompetitorAmount: number | null;
  vsCompetitorPercent: number | null;
  /** Ex-GST selling < cost — the quotation loses money. */
  undercutsCost: boolean;
  /** Final selling < the configured minimum safe selling price. */
  belowMinSafe: boolean;
  warnings: string[];
}

export interface BoqResult {
  meta: TakeoffMeta;
  lines: BoqLine[];
  cuttingList: CuttingRow[];
  purchase: PurchaseRow[];
  sections: SectionSummary[];
  /** kg by material — the weight summary report. (spec §9) */
  weightSummary: { materialKey: string; material: string; spec: string; netKg: number; totalKg: number }[];
  totals: BoqTotals;
  /** Optional §15 selling-price analysis (internal). Always present when priced via priceTakeoff. */
  competitive?: CompetitiveResult;
  issues: BoqIssue[];
  notes: string[];
}

/* ==========================================================================
 * 5. SHARED HELPERS
 * ========================================================================== */

export const M2FT = 3.280839895;
export const SQM_TO_SQFT = 10.7639;

export const ft2m = (ft: number) => ft / M2FT;
export const sqft2sqm = (sqft: number) => sqft / SQM_TO_SQFT;

export const round = (n: number, d = 3): number => {
  const f = Math.pow(10, d);
  return Math.round((n + Number.EPSILON) * f) / f;
};

/** Ceil with an epsilon guard, so 3.0000000001 → 3 not 4. */
export const ceil = (n: number): number => Math.ceil(n - 1e-9);

/**
 * How many INTERMEDIATE lines fit between two ends at max `spacing`, exclusive of both ends.
 * A 6 m wall at 0.6 m stud spacing has 10 bays ⇒ 9 intermediate studs (the 2 ends are posts).
 */
export const intermediateLines = (spanM: number, spacingM: number): number => {
  if (spanM <= 0 || spacingM <= 0) return 0;
  return Math.max(0, ceil(spanM / spacingM) - 1);
};

/** Total lines INCLUDING both ends. A 6 m span at 1 m joist spacing ⇒ 7 lines. */
export const totalLines = (spanM: number, spacingM: number): number => {
  if (spanM <= 0 || spacingM <= 0) return 0;
  return ceil(spanM / spacingM) + 1;
};

/**
 * Canonical key for a wall segment, quantised to the millimetre. Two adjacent modules that
 * share a wall generate the IDENTICAL key from their own local geometry — which is what makes
 * shared-wall de-duplication exact rather than heuristic. (spec §6)
 */
export const wallKey = (axis: "x" | "y", coordM: number, aM: number, bM: number, floor: number): string => {
  const mm = (v: number) => Math.round(v * 1000);
  const lo = Math.min(aM, bM);
  const hi = Math.max(aM, bM);
  return `f${floor}:${axis}${mm(coordM)}:${mm(lo)}-${mm(hi)}`;
};

/** Section label for a material, used on every report row. */
export const specOf = (m: Material): string =>
  [m.sectionSize, m.thicknessMm ? `${m.thicknessMm} mm` : "", m.grade].filter(Boolean).join(" · ");
