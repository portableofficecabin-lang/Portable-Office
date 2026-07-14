/**
 * Table module — PRICING (spec §23, §25).
 *
 * A table is priced THROUGH THE REAL BOQ ENGINE, never from a hardcoded number:
 *
 *   CabinTable ──emitTableTakeoff()──▶ TakeoffItem[] ──priceTakeoff()──▶ BoqLine[] ──▶ TableCost
 *
 * That indirection is the whole point. The rate of a board, a leg, an edge band, a castor and a
 * carpenter's hour lives in ONE place — the Material Master (spec §23) — and the customer's price,
 * the internal detailed costing, the cutting list and the purchase order are four GROUPINGS of the
 * same priced lines. A second "quick estimate" formula, however tempting, is a second source of
 * truth that starts drifting the day someone edits a rate.
 *
 * THREE decisions here are deliberate and non-obvious:
 *
 *  1. A TABLE IS PRICED AS ONE COPY, THEN MULTIPLIED. `t.quantity` is "N identical copies", and the
 *     repo's house rule (windowUnitPrice / fixtureUnitPrice in pricing.ts) is: round the UNIT price
 *     to whole rupees, THEN multiply. So the take-off is emitted for a quantity-1 clone and every
 *     bucket is rounded before it is scaled — which also makes this file immune to whether
 *     emitTableTakeoff() already multiplies its quantities by `t.quantity` or not.
 *
 *  2. WASTAGE IS MEASURED, NOT RECOMPUTED. The engine already adds the material's own wastage plus
 *     norms.cuttingWastagePercent / norms.sheetWastagePercent (engine.ts §2d). Re-deriving that
 *     value here would be a second implementation of costOf(). Instead the take-off is priced TWICE
 *     — once normally, once with every wastage forced to zero — and `wastageAmount` is the
 *     difference. It is therefore correct by construction for every rate unit, including the
 *     per_sheet / per_stock_length ones where wastage buys a whole extra sheet or bar.
 *
 *  3. NOTHING THROWS. A material key that is not in the index prices as a zeroed "UNKNOWN:" line
 *     (engine.ts §1) and the table simply costs less; tableValidation reports it as
 *     `missing_material`. A quotation screen that explodes on a typo'd key is useless.
 *
 * Money is WHOLE RUPEES. Weight is kg. Nothing here imports React or Supabase — this runs on the
 * public homepage.
 */

import { priceTakeoff } from "@/lib/boq/engine";
import { SEED_MATERIALS } from "@/lib/boq/seedMaterials";
import { emitTableTakeoff } from "@/lib/boq/tableTakeoff";
import {
  DEFAULT_NORMS,
  round,
  type BoqLine,
  type BoqNorms,
  type BoqOverride,
  type BoqSection,
  type BoqSettings,
  type CountTakeoff,
  type Material,
  type MaterialCategory,
  type MaterialIndex,
  type RateUnit,
  type SheetTakeoff,
  type SteelTakeoff,
  type Takeoff,
  type TakeoffItem,
  type TakeoffMeta,
  type Uom,
  type WeightBasis,
} from "@/lib/boq/types";
import type { CabinTable } from "./tableSchema";

/* ==========================================================================
 * 1. THE MATERIAL INDEX  (spec §23)
 * ========================================================================== */

/**
 * The offline Material Master for tables: the WHOLE seed set (cabin + furniture rows) from the pure
 * seedMaterials.ts. PURE — no Supabase — so the homepage calculator can price a table before (or
 * without) the admin Material Master ever loading, and so a table leg priced at the default
 * shs-50x50x2 profile is never silently costed at ₹0.
 *
 * There is exactly ONE definition of every seed rate (seedMaterials.ts). This function used to
 * mirror five cabin rows by hand, which meant a rate lived in two files and could drift.
 *
 * This is a FALLBACK, not a rate source: as soon as the Material Master is loaded the caller passes
 * its index into priceTable() and the DB row wins. A key in neither set is not an error here — the
 * engine prices it at ₹0 and tableValidation raises `missing_material`. Failing loudly at the index
 * would take the whole calculator down.
 */
export function defaultMaterialIndex(): MaterialIndex {
  const index: MaterialIndex = {};
  for (const m of SEED_MATERIALS) index[m.key] = m;
  return index;
}

/* ==========================================================================
 * 2. THE COST
 * ========================================================================== */

export interface TableCost {
  tableId: string;
  /** Boards, steel, laminate, edge band, adhesive, powder coat, conduit, wire. */
  materialAmount: number;
  /** Screws, connectors, levellers, castors, channels, hinges, locks, handles, grommets, brackets. */
  hardwareAmount: number;
  /** Pedestals, trays, CPU holders, power managers, pop-up + floor boxes, chairs, partition screens. */
  accessoryAmount: number;
  /** The man-hour lines ("lab-*"): cutting, edge banding, carpentry, welding, grinding, install. */
  labourAmount: number;
  /** The value of the wastage the ENGINE added (material % + cutting/sheet norms) — measured, not
   *  recomputed: priced-with-wastage minus priced-without. */
  wastageAmount: number;
  /** NET fabricated weight (kg) — what the finished table actually weighs, off-cuts excluded. */
  weightKg: number;
  /** material + hardware + accessory + labour, for the whole quantity. */
  subtotal: number;
  marginAmount: number;
  taxAmount: number;
  /** For the whole quantity (`t.quantity` copies). */
  totalAmount: number;
  /** For ONE table — this is the number the quotation prints as the rate. */
  unitAmount: number;
  /**
   * This table's own BOQ lines, for the internal detailed-costing view (spec §23).
   * They describe ONE table: their amounts sum to the un-rounded unit cost, NOT to `totalAmount`.
   * `t.quantity` copies of an identical table are N × one table, so there is nothing to show N times.
   */
  lines: BoqLine[];
}

export interface TablePricingOptions {
  /** Default 0 — margin is baked into the Material Master's rate points (repo house rule). */
  marginPercent?: number;
  /** Default 18. */
  gstPercent?: number;
  norms?: BoqNorms;
  /** tableId → metres of cable from the table to the nearest wall/floor box. Routed geometry the
   *  take-off cannot know on its own; absent ⇒ the take-off uses its own default drop. */
  cableRunM?: Record<string, number>;
}

/* ==========================================================================
 * 3. THE SINK — the take-off collector emitTableTakeoff() writes into
 * ========================================================================== */

/** Below this, a "member" is a rounding artefact, not a cut. Matches cabinTakeoff's MIN_CUT_M. */
const MIN_CUT_M = 0.001;

/** Every furniture line points at the same drawing — the one the customer signs off (spec §22). */
const FURNITURE_DRAWING = "Furniture Layout";

/**
 * Structurally identical to cabinTakeoff.ts's private `Sink`, so the SAME emitTableTakeoff() can be
 * driven either by the cabin's take-off (which owns its Sink) or by this file, which prices ONE
 * table in isolation. Zero-quantity and zero-length items never land, so an accessory the customer
 * switched off cannot leave a ₹0 ghost row on the quotation.
 */
class FurnitureSink {
  readonly items: TakeoffItem[] = [];

  steel(
    section: BoqSection, slug: string, materialKey: string, description: string, formula: string,
    qty: number, cutLengthM: number, geomKey?: string,
  ): void {
    const n = Math.round(qty);
    if (n <= 0 || !(cutLengthM > MIN_CUT_M)) return;
    const item: SteelTakeoff = {
      kind: "steel",
      id: `${section}:${slug}`,
      section,
      materialKey,
      description,
      formula,
      drawingRef: FURNITURE_DRAWING,
      qty: n,
      cutLengthM: round(cutLengthM, 4),
    };
    if (geomKey) item.geomKey = geomKey;
    this.items.push(item);
  }

  sheet(
    section: BoqSection, slug: string, materialKey: string, description: string, formula: string,
    grossAreaSqm: number, deductions: { label: string; areaSqm: number }[], faces: number,
    geomKey?: string,
  ): void {
    if (!(grossAreaSqm > 0)) return;
    /* A deduction can never exceed the covering it is cut out of (validate.ts: opening_exceeds_wall). */
    let budget = grossAreaSqm;
    const kept: { label: string; areaSqm: number }[] = [];
    for (const cut of deductions ?? []) {
      const area = Math.min(Math.max(0, round(cut.areaSqm, 4)), budget);
      if (area <= 0) continue;
      kept.push({ label: cut.label, areaSqm: area });
      budget -= area;
    }
    const item: SheetTakeoff = {
      kind: "sheet",
      id: `${section}:${slug}`,
      section,
      materialKey,
      description,
      formula,
      drawingRef: FURNITURE_DRAWING,
      grossAreaSqm: round(grossAreaSqm, 4),
      deductions: kept,
      faces,
    };
    if (geomKey) item.geomKey = geomKey;
    this.items.push(item);
  }

  /** `qty` may be fractional for a per-litre consumable (adhesive) and for LABOUR MAN-HOURS. */
  count(
    section: BoqSection, slug: string, materialKey: string, description: string, formula: string,
    qty: number, fractional = false,
  ): void {
    const n = fractional ? round(qty, 2) : Math.round(qty);
    if (!(n > 0)) return;
    const item: CountTakeoff = {
      kind: "count",
      id: `${section}:${slug}`,
      section,
      materialKey,
      description,
      formula,
      drawingRef: FURNITURE_DRAWING,
      qty: n,
    };
    this.items.push(item);
  }
}

/* ==========================================================================
 * 4. LINE → COST BUCKET  (spec §23 — the four-way cost breakdown)
 * ========================================================================== */

type CostBucket = "material" | "hardware" | "accessory" | "labour";

/**
 * The material CATEGORY cannot do this on its own — "edgeband-pvc-2" is category "hardware" but is
 * plainly a material, and "acc-power-manager" is category "electrical" but is plainly an accessory.
 * The Material Master's key PREFIX is the real taxonomy (it is a namespace, and the admin adds new
 * rows inside it), so the key leads and the category is only the last resort for a key that follows
 * no convention at all.
 *
 * Order matters: the material families are matched BEFORE the accessory keywords, because
 * "cable-tray-100" is a linear steel material that happens to contain the word "tray".
 */
const LABOUR_PREFIXES = ["lab-"];
const MATERIAL_PREFIXES = [
  "board-", "top-", "laminate", "powdercoat", "edgeband-", "adhesive",
  "shs-", "rhs-", "ms-flat", "ss-pipe", "alu-profile", "cable-tray", "elec-",
];
const ACCESSORY_PREFIXES = ["acc-", "chair-", "partition-"];
const ACCESSORY_WORDS = ["pedestal", "chair", "cpu", "power-manager", "popup", "pop-up", "floor-box", "screen", "footrest", "keyboard"];
const HARDWARE_PREFIXES = ["hw-"];
const HARDWARE_WORDS = [
  "screw", "connector", "leveller", "leveler", "castor", "caster", "channel",
  "hinge", "lock", "handle", "grommet", "bracket", "minifix", "bolt",
];

const startsWithAny = (key: string, prefixes: string[]): boolean => prefixes.some((p) => key.startsWith(p));
const containsAny = (key: string, words: string[]): boolean => words.some((w) => key.includes(w));

export function costBucketOf(line: Pick<BoqLine, "materialKey" | "category">): CostBucket {
  const key = (line.materialKey || "").toLowerCase();

  if (startsWithAny(key, LABOUR_PREFIXES)) return "labour";
  if (startsWithAny(key, MATERIAL_PREFIXES)) return "material";
  if (startsWithAny(key, ACCESSORY_PREFIXES) || containsAny(key, ACCESSORY_WORDS)) return "accessory";
  if (startsWithAny(key, HARDWARE_PREFIXES) || containsAny(key, HARDWARE_WORDS)) return "hardware";

  /* An admin-added key that follows no convention: fall back on what the master says it IS. */
  if (line.category === "hardware") return "hardware";
  return "material";
}

/* ==========================================================================
 * 5. PRICING
 * ========================================================================== */

/** ₹ — whole rupees, everywhere money leaves this module. */
const rupees = (n: number): number => Math.round(Number.isFinite(n) ? n : 0);

/**
 * A furniture-only take-off has no building. Every field of the meta is therefore ZERO, and that is
 * load-bearing: validate.ts's drawing cross-checks are gated on `modules > 0` / a non-zero envelope,
 * so a zeroed meta tells them "there is no cabin here to check the furniture against" instead of
 * failing the table for having no corner posts.
 */
function furnitureMeta(t: CabinTable): TakeoffMeta {
  return {
    source: "cabin",
    title: t.name,
    lengthM: 0,
    widthM: 0,
    heightM: 0,
    floors: 0,
    rooms: 0,
    partitions: 0,
    doors: 0,
    windows: 0,
    staircases: 0,
    verandas: 0,
    modules: 0,
    floorAreaSqm: 0,
    roofType: "",
  };
}

/**
 * Engine settings for a bare table: NO charges and NO GST.
 *
 * DEFAULT_CHARGES would levy the cabin's transport (₹18 000), installation (₹15 000) and per-kg
 * fabrication on a single desk — those are project charges, not table charges. GST is applied by
 * this module instead, AFTER the unit price is rounded (the house rule), so the engine's own
 * `totals` are deliberately unused; only its `lines` are.
 */
function settingsFor(norms: BoqNorms, overrides: Record<string, BoqOverride>, wastagePercent: number | null): BoqSettings {
  return {
    templateKind: "ms_cabin",
    wastagePercent,
    norms,
    materialMap: {},
    overrides,
    manualItems: [],
    charges: [],
    gstPercent: 0,
    disabledSections: [],
  };
}

const ZERO_WASTAGE_NORMS = (norms: BoqNorms): BoqNorms => ({
  ...norms,
  cuttingWastagePercent: 0,
  sheetWastagePercent: 0,
});

/** Price ONE table (all `t.quantity` copies of it). */
export function priceTable(t: CabinTable, materials: MaterialIndex, opts: TablePricingOptions = {}): TableCost {
  const norms: BoqNorms = { ...DEFAULT_NORMS, ...(opts.norms ?? {}) };
  const gstPercent = Math.max(0, opts.gstPercent ?? 18);
  const marginPercent = Math.max(0, opts.marginPercent ?? 0);
  const copies = Math.max(1, Math.round(t.quantity) || 1);

  /* THE UNIT. Pricing a quantity-1 clone is what makes "round the unit, then multiply" possible —
   * and it makes this file correct whether or not emitTableTakeoff() scales by `t.quantity` itself. */
  const unit: CabinTable = { ...t, quantity: 1 };

  const sink = new FurnitureSink();
  emitTableTakeoff(sink, [unit], norms, opts.cableRunM ? { cableRunM: opts.cableRunM } : undefined);

  const takeoff: Takeoff = { meta: furnitureMeta(unit), items: sink.items, notes: [] };

  /* The customer's per-instance wastage override (TableMaterial.wastagePercent) applies to the TOP
   * material only — "this granite is expensive, cut it tight". The engine takes wastage per LINE, so
   * the override is expressed as a BoqOverride on every line made of that material. */
  const overrides: Record<string, BoqOverride> = {};
  const ownWastage = t.material.wastagePercent;
  if (ownWastage != null && Number.isFinite(ownWastage) && ownWastage >= 0) {
    for (const item of sink.items) {
      if (item.materialKey === t.material.materialKey) overrides[item.id] = { wastagePercent: ownWastage };
    }
  }

  const full = priceTakeoff(takeoff, materials, settingsFor(norms, overrides, null));
  /* The same take-off with EVERY wastage forced to zero. settings.wastagePercent = 0 beats each
   * material's own %, and the zeroed norms remove the saw kerf and the sheet off-cut. The difference
   * IS the wastage the engine added — measured through costOf(), never re-derived. */
  const bare = priceTakeoff(takeoff, materials, settingsFor(ZERO_WASTAGE_NORMS(norms), {}, 0));

  const live = full.lines.filter((l) => l.enabled);

  const bucket: Record<CostBucket, number> = { material: 0, hardware: 0, accessory: 0, labour: 0 };
  for (const line of live) bucket[costBucketOf(line)] += line.amount;

  const withWaste = live.reduce((s, l) => s + l.amount, 0);
  const noWaste = bare.lines.filter((l) => l.enabled).reduce((s, l) => s + l.amount, 0);

  /* NET weight, not purchase weight: `weightKg` is what the finished table weighs (it sizes the
   * transport and the wall bracket), and you do not ship the off-cuts. */
  const unitWeightKg = live.reduce((s, l) => s + l.netWeightKg, 0);

  /* Round the UNIT, then multiply — windowUnitPrice / fixtureUnitPrice in pricing.ts. */
  const uMaterial = rupees(bucket.material);
  const uHardware = rupees(bucket.hardware);
  const uAccessory = rupees(bucket.accessory);
  const uLabour = rupees(bucket.labour);
  const uSubtotal = uMaterial + uHardware + uAccessory + uLabour;
  const uMargin = rupees((uSubtotal * marginPercent) / 100);
  const uTax = rupees(((uSubtotal + uMargin) * gstPercent) / 100);
  const uTotal = uSubtotal + uMargin + uTax;

  return {
    tableId: t.id,
    materialAmount: uMaterial * copies,
    hardwareAmount: uHardware * copies,
    accessoryAmount: uAccessory * copies,
    labourAmount: uLabour * copies,
    wastageAmount: rupees(Math.max(0, withWaste - noWaste)) * copies,
    weightKg: round(unitWeightKg * copies, 2),
    subtotal: uSubtotal * copies,
    marginAmount: uMargin * copies,
    taxAmount: uTax * copies,
    totalAmount: uTotal * copies,
    unitAmount: uTotal,
    lines: full.lines,
  };
}

/** Price a whole furniture layout. `total` is the sum of the per-table totals — nothing is
 *  recomputed at the layout level, so the quotation and the per-table costing cannot disagree. */
export function priceTables(
  tables: CabinTable[],
  materials: MaterialIndex,
  opts: TablePricingOptions = {},
): { costs: TableCost[]; total: number } {
  const costs = (tables ?? []).map((t) => priceTable(t, materials, opts));
  return { costs, total: costs.reduce((s, c) => s + c.totalAmount, 0) };
}
