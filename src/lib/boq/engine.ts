/**
 * MATERIAL BOQ — the pricing engine. Pure: no React, no DOM, no Supabase.
 *
 *   Takeoff + MaterialIndex + BoqSettings ──▶ priceTakeoff() ──▶ BoqResult
 *
 * ONE pass over the take-off produces EVERY report, and that is the point. The BOQ, the
 * elevation-wise breakup, the cutting list, the purchase order and the weight summary are not five
 * calculations — they are five GROUPINGS of the same priced lines. Anything that regroups cannot
 * drift from what was quoted; anything that recalculates eventually will.
 *
 * Four decisions in here are deliberate and non-obvious:
 *
 *  1. AN UNKNOWN MATERIAL NEVER THROWS. It prices as a zeroed line named "UNKNOWN: <key>", and
 *     validate.ts raises `unknown_material`. A quotation screen that explodes on a typo'd key is
 *     useless; one that shows the line at ₹0 with a red error is exactly right. (spec §1, §10)
 *
 *  2. WASTAGE IS APPLIED ONCE, TO PURCHASE QUANTITIES — never to the piece count. You buy 4 posts,
 *     not 4.12. So costOf() receives post-wastage length / area / weight / bars / sheets, and a raw
 *     `pieces`. Steel additionally carries norms.cuttingWastagePercent (saw loss, spec §3) and
 *     sheets norms.sheetWastagePercent (off-cut allowance, spec §4) ON TOP of material wastage:
 *     they are different physical losses and the admin tunes them separately.
 *
 *  3. BARS ARE NESTED ACROSS MEMBERS, NOT PER MEMBER. The BOQ line nests its own cut length so the
 *     row can show a bar count; the PURCHASE report re-nests every distinct cut of a material
 *     together (nestMany), because the yard cuts a 2.6 m post out of the 2.9 m left over from a
 *     3.1 m rail. That is the entire reason a purchase report exists. The MONEY, however, is the
 *     BOQ's money regrouped — summed, never recomputed — so the purchase order and the quotation
 *     can never disagree by a rupee.
 *
 *  4. AN OPENING IS DEDUCTED ONCE, THEN MULTIPLIED BY FACES. A partition sheeted on both sides with
 *     a door in it loses that door area on BOTH faces. Intentional. (spec §4)
 *
 * Canonical units throughout: METRES, SQUARE METRES, KILOGRAMS.
 */

import {
  areaWeightKg,
  costOf,
  countWeightKg,
  effectiveWastage,
  nestMany,
  nestStock,
  sheetSizeLabel,
  sheetsNeeded,
  steelWeightKg,
  stockLabel,
  withWastage,
} from "@/lib/boq/calc";
import {
  BOQ_SECTIONS,
  DEFAULT_NORMS,
  SQM_TO_SQFT,
  round,
  specOf,
  type BoqLine,
  type BoqResult,
  type BoqSection,
  type BoqSettings,
  type BoqTotals,
  type CuttingRow,
  type ManualBoqItem,
  type Material,
  type MaterialIndex,
  type PurchaseRow,
  type SectionSummary,
  type Takeoff,
  type TakeoffItem,
  type Uom,
} from "@/lib/boq/types";
import { validateBoq } from "@/lib/boq/validate";

/* ==========================================================================
 * Rounding — money 2 dp, weight 2 dp, length/area 3 dp. Applied at the EDGE
 * (when a number lands on a report field), never mid-calculation.
 * ========================================================================== */

const money = (n: number): number => round(n, 2);
const kg = (n: number): number => round(n, 2);
const dim = (n: number): number => round(n, 3);

/** A billed quantity is rounded by what it MEASURES: kg to 2 dp, everything else to 3. */
const qtyRound = (n: number, uom: Uom): number => (uom === "kg" ? kg(n) : dim(n));

/** Elevation + roof + partition coverings — the surfaces the painting charge is levied on. */
const PAINTED_SECTIONS: BoqSection[] = ["front", "rear", "left", "right", "roof", "partition"];

const SECTION_ORDER = new Map<BoqSection, number>(BOQ_SECTIONS.map((s, i) => [s.id, i]));
const sectionRank = (s: BoqSection): number => SECTION_ORDER.get(s) ?? BOQ_SECTIONS.length;

/**
 * The stand-in for a material key that is not in the master. Every field that could invent a number
 * is null, so the calc kernel returns 0 kg and ₹0 on its own — the zeroing is structural, not a
 * special case sprinkled through the pricing branches.
 */
function unknownMaterial(key: string): Material {
  return {
    key,
    name: `UNKNOWN: ${key}`,
    category: "misc",
    sectionSize: "",
    thicknessMm: null,
    grade: "",
    uom: "nos",
    unitWeight: null,
    weightBasis: "none",
    stockLengthM: null,
    sheetLengthM: null,
    sheetWidthM: null,
    purchaseRate: null,
    rateUnit: "per_nos",
    wastagePercent: 0,
    supplier: "",
    effectiveDate: "",
    isActive: false,
  };
}

/* ==========================================================================
 * 1. ITEMS — take-off items + admin-added manual rows, in one list
 * ========================================================================== */

/**
 * A manual row's KIND is inferred from what the admin filled in: a cut length makes it a steel
 * member (so it joins the cutting list and gets nested), an area makes it a covering, anything else
 * is counted. `qty` stays a COUNT in every case — a manual covering of `qty` pieces at `areaSqm`
 * each is `qty × areaSqm` of gross area.
 */
function manualToTakeoff(mi: ManualBoqItem): TakeoffItem {
  const base = {
    id: mi.id,
    section: mi.section,
    materialKey: mi.materialKey,
    description: mi.description,
    drawingRef: "Manual entry",
  };

  if (mi.cutLengthM != null && mi.cutLengthM > 0) {
    return {
      ...base,
      kind: "steel",
      qty: mi.qty,
      cutLengthM: mi.cutLengthM,
      formula: `Manually added — ${mi.qty} nos × ${dim(mi.cutLengthM)} m`,
    };
  }

  if (mi.areaSqm != null && mi.areaSqm > 0) {
    const n = mi.qty > 0 ? mi.qty : 1;
    return {
      ...base,
      kind: "sheet",
      grossAreaSqm: n * mi.areaSqm,
      deductions: [],
      faces: 1,
      formula: `Manually added — ${n} × ${dim(mi.areaSqm)} m²`,
    };
  }

  return { ...base, kind: "count", qty: mi.qty, formula: `Manually added — ${mi.qty} nos` };
}

/* ==========================================================================
 * 2. PRICING — one take-off item ⇒ one BoqLine (+ the extras the reports regroup)
 * ========================================================================== */

/** A priced line plus the derivation the cutting list and purchase report need to regroup it. */
interface Priced {
  line: BoqLine;
  kind: TakeoffItem["kind"];
  material: Material;
  wastagePercent: number;
  /** Pre-wastage billed quantity, in the material's own uom. The purchase report sums these. */
  netQty: number;
  netAreaSqm: number;
  pieces: number;
  cutLengthM: number;
}

export function priceTakeoff(takeoff: Takeoff, materials: MaterialIndex, settings: BoqSettings): BoqResult {
  /* BoqSettings round-trips through boq_templates.data (jsonb), so a template saved before a field
   * existed can arrive without it. Normalise once, here, instead of guarding at every use. */
  const norms = { ...DEFAULT_NORMS, ...(settings.norms ?? {}) };
  const materialMap = settings.materialMap ?? {};
  const overrides = settings.overrides ?? {};
  const manualItems = settings.manualItems ?? [];
  const charges = settings.charges ?? [];
  const disabled = settings.disabledSections ?? [];

  const manualNotes = new Map<string, string>();
  for (const mi of manualItems) if (mi.note) manualNotes.set(mi.id, mi.note);

  const items: TakeoffItem[] = [...takeoff.items, ...manualItems.map(manualToTakeoff)];
  const manualIds = new Set(manualItems.map((mi) => mi.id));

  const priced: Priced[] = items.map((item) => {
    const ov = overrides[item.id] ?? {};
    const isManual = manualIds.has(item.id);

    /* a. materialMap is the template's substitution table: a PUF template swaps the wall covering
     *    key without any take-off producer knowing PUF exists. A per-line override beats it. */
    const materialKey = ov.materialKey ?? materialMap[item.materialKey] ?? item.materialKey;
    const m = materials[materialKey] ?? unknownMaterial(materialKey);

    const enabled = ov.enabled ?? !disabled.includes(item.section);

    /* d. Material wastage (or the quotation-wide floor, or the line override) PLUS the norm loss
     *    that belongs to this kind of work: saw kerf on steel, off-cuts on sheet. */
    const base = effectiveWastage(m.wastagePercent, settings.wastagePercent, ov.wastagePercent);
    const extra =
      item.kind === "steel" ? norms.cuttingWastagePercent
      : item.kind === "sheet" ? norms.sheetWastagePercent
      : 0;
    const wastagePercent = Math.max(0, base) + Math.max(0, extra || 0);

    const qtySource =
      ov.locked ? "locked"
      : ov.qty != null ? "manual"
      : isManual ? "added"
      : "auto";

    const rate = ov.rate ?? m.purchaseRate;
    const priceable: Material = { ...m, purchaseRate: rate };
    const remarks: string[] = [];

    let qty = 0;
    let pieces = 0;
    let cutLengthM = 0;
    let runningLengthM = 0;
    let grossAreaSqm = 0;
    let deductionSqm = 0;
    let netAreaSqm = 0;
    let netWeightKg = 0;
    let bars = 0;
    let sheets = 0;
    let netQty = 0;
    let amount = 0;

    if (item.kind === "steel") {
      pieces = ov.qty ?? item.qty;
      cutLengthM = item.cutLengthM;
      runningLengthM = pieces * cutLengthM;
      netWeightKg = steelWeightKg(runningLengthM, m);

      const nest = nestStock(pieces, cutLengthM, m.stockLengthM);
      bars = nest.bars;
      if (nest.oversize) remarks.push("Cut length exceeds stock length — special order");

      const totalWeight = withWastage(netWeightKg, wastagePercent);
      const purchaseLengthM = withWastage(runningLengthM, wastagePercent);

      qty = m.uom === "kg" ? totalWeight : runningLengthM;
      netQty = m.uom === "kg" ? netWeightKg : runningLengthM;

      amount = enabled
        ? costOf(
            {
              weightKg: totalWeight,
              lengthM: purchaseLengthM,
              areaSqm: 0,
              pieces,
              sheets: 0,
              bars,
              qty: m.uom === "kg" ? totalWeight : purchaseLengthM,
            },
            priceable,
          )
        : 0;
    } else if (item.kind === "sheet") {
      grossAreaSqm = item.grossAreaSqm;
      deductionSqm = item.deductions.reduce((s, d) => s + d.areaSqm, 0);

      /* The opening comes out ONCE, then the remainder is multiplied by the faces of covering:
       * a both-sides partition with a door loses that door on both faces. (spec §4) */
      netAreaSqm = ov.qty ?? Math.max(0, (grossAreaSqm - deductionSqm) * item.faces);

      netWeightKg = areaWeightKg(netAreaSqm, m);
      const totalWeight = withWastage(netWeightKg, wastagePercent);
      const purchaseAreaSqm = withWastage(netAreaSqm, wastagePercent);

      const sh = sheetsNeeded(netAreaSqm, m, wastagePercent);
      sheets = sh.sheets;

      qty = netAreaSqm;
      netQty = netAreaSqm;

      amount = enabled
        ? costOf(
            {
              weightKg: totalWeight,
              lengthM: 0,
              areaSqm: purchaseAreaSqm,
              pieces: 0,
              sheets,
              bars: 0,
              qty: purchaseAreaSqm,
            },
            priceable,
          )
        : 0;
    } else {
      pieces = ov.qty ?? item.qty;
      netWeightKg = countWeightKg(pieces, m);

      const totalWeight = withWastage(netWeightKg, wastagePercent);
      qty = pieces;
      netQty = pieces;

      /* `pieces` is never inflated (you buy 4 doors, not 4.2); `qty` is, because a per_ltr
       * consumable — primer, enamel — genuinely is bought with its wastage. */
      amount = enabled
        ? costOf(
            {
              weightKg: totalWeight,
              lengthM: 0,
              areaSqm: 0,
              pieces,
              sheets: 0,
              bars: 0,
              qty: withWastage(pieces, wastagePercent),
            },
            priceable,
          )
        : 0;
    }

    const totalWeightKg = withWastage(netWeightKg, wastagePercent);

    if ((item.kind === "steel" || item.kind === "sheet") && (item.sharedBy ?? 0) > 1) {
      remarks.push(`Shared by ${item.sharedBy} modules — counted once`);
    }
    if (ov.rate != null) remarks.push("Rate manually overridden");
    if (ov.locked) remarks.push("Quantity locked");
    const manualNote = manualNotes.get(item.id);
    if (manualNote) remarks.push(manualNote);
    if (ov.note) remarks.push(ov.note);

    const line: BoqLine = {
      id: item.id,
      section: item.section,
      enabled,
      qtySource,

      materialKey,
      material: m.name,
      category: m.category,
      spec: specOf(m),
      grade: m.grade,

      description: item.description,
      formula: item.formula,
      drawingRef: item.drawingRef,

      qty: qtyRound(qty, m.uom),
      uom: m.uom,

      pieces: item.kind === "sheet" ? null : pieces,
      cutLengthM: item.kind === "steel" ? dim(cutLengthM) : null,
      runningLengthM: item.kind === "steel" ? dim(runningLengthM) : null,
      stockLengthM: item.kind === "steel" ? m.stockLengthM : null,
      stockBars: item.kind === "steel" && m.stockLengthM ? bars : null,

      grossAreaSqm: item.kind === "sheet" ? dim(grossAreaSqm) : null,
      deductionSqm: item.kind === "sheet" ? dim(deductionSqm) : null,
      netAreaSqm: item.kind === "sheet" ? dim(netAreaSqm) : null,
      sheetSize: item.kind === "sheet" ? sheetSizeLabel(m) : null,
      sheets: item.kind === "sheet" ? sheets : null,

      unitWeight: m.unitWeight,
      weightBasis: m.weightBasis,
      netWeightKg: kg(netWeightKg),
      totalWeightKg: kg(totalWeightKg),

      wastagePercent: round(wastagePercent, 2),
      rate,
      rateUnit: m.rateUnit,
      amount: money(amount),

      remarks,
      geomKey: item.kind === "count" ? undefined : item.geomKey,
    };

    return { line, kind: item.kind, material: m, wastagePercent, netQty, netAreaSqm, pieces, cutLengthM };
  });

  const lines = priced.map((p) => p.line);
  const live = priced.filter((p) => p.line.enabled);

  /* ========================================================================
   * 3. CUTTING LIST — every enabled steel member, longest cut first (spec §3)
   * ====================================================================== */

  const cuttingList: CuttingRow[] = live
    .filter((p) => p.kind === "steel" && p.pieces > 0 && p.cutLengthM > 0)
    .map(
      (p): CuttingRow => ({
        materialKey: p.line.materialKey,
        material: p.line.material,
        spec: p.line.spec,
        section: p.line.section,
        member: p.line.description,
        cutLengthM: dim(p.cutLengthM),
        qty: p.pieces,
        totalLengthM: dim(p.pieces * p.cutLengthM),
        weightKg: kg(steelWeightKg(p.pieces * p.cutLengthM, p.material)),
        drawingRef: p.line.drawingRef,
      }),
    )
    .sort((a, b) => sectionRank(a.section) - sectionRank(b.section) || b.cutLengthM - a.cutLengthM);

  /* ========================================================================
   * 4. PURCHASE REPORT — the BOQ regrouped by material, bars nested ACROSS members
   * ====================================================================== */

  const groups = new Map<string, Priced[]>();
  for (const p of live) {
    const g = groups.get(p.line.materialKey);
    if (g) g.push(p);
    else groups.set(p.line.materialKey, [p]);
  }

  const purchase: PurchaseRow[] = [...groups.values()].map((g): PurchaseRow => {
    const m = g[0].material;
    const isSteel = g.some((p) => p.kind === "steel");
    const isSheet = g.some((p) => p.kind === "sheet");

    const netQty = g.reduce((s, p) => s + p.netQty, 0);
    /* Per-line wastage can differ (an override, a mixed group), so the purchase quantity is the sum
     * of the lines' own inflated quantities and the group % is read BACK off it — exact, additive. */
    const purchaseQty = g.reduce((s, p) => s + withWastage(p.netQty, p.wastagePercent), 0);
    const wastagePercent = netQty > 0 ? (purchaseQty / netQty - 1) * 100 : 0;

    let stockUnits: number | null = null;
    let stockUnitLabel: string | null = null;
    let offcut: number | null = null;

    if (isSteel && m.stockLengthM) {
      /* THE point of this report: nest every distinct cut of this material into the same bars. */
      const cuts = g
        .filter((p) => p.kind === "steel" && p.pieces > 0 && p.cutLengthM > 0)
        .map((p) => ({ cutLengthM: p.cutLengthM, qty: p.pieces }));
      const nest = nestMany(cuts, m.stockLengthM);
      stockUnits = nest.bars;
      stockUnitLabel = stockLabel(m);
      offcut = nest.offcutM;
    } else if (isSheet && m.sheetLengthM && m.sheetWidthM) {
      const area = g.reduce((s, p) => s + p.netAreaSqm, 0);
      const sh = sheetsNeeded(area, m, wastagePercent);
      stockUnits = sh.sheets;
      stockUnitLabel = sheetSizeLabel(m);
      offcut = sh.offcutSqm;
    }

    /* The money is the BOQ's money, summed — NOT re-derived from the nested bar count, or the
     * purchase order and the quotation would disagree. */
    const rates = new Set(g.map((p) => p.line.rate));
    const rate = rates.size === 1 ? g[0].line.rate : m.purchaseRate;

    return {
      materialKey: g[0].line.materialKey,
      material: m.name,
      spec: specOf(m),
      category: m.category,
      uom: m.uom,
      netQty: qtyRound(netQty, m.uom),
      wastagePercent: round(wastagePercent, 2),
      purchaseQty: qtyRound(purchaseQty, m.uom),
      stockUnits,
      stockUnitLabel,
      offcut: offcut == null ? null : dim(offcut),
      totalWeightKg: kg(g.reduce((s, p) => s + p.line.totalWeightKg, 0)),
      rate,
      rateUnit: m.rateUnit,
      amount: money(g.reduce((s, p) => s + p.line.amount, 0)),
      supplier: m.supplier,
    };
  });

  purchase.sort((a, b) => a.category.localeCompare(b.category) || a.material.localeCompare(b.material));

  /* ========================================================================
   * 5. SECTIONS — the elevation-wise breakup IS the lines grouped by section (spec §5)
   * ====================================================================== */

  const sections: SectionSummary[] = BOQ_SECTIONS.flatMap((s): SectionSummary[] => {
    const all = priced.filter((p) => p.line.section === s.id);
    if (all.length === 0) return [];
    const on = all.filter((p) => p.line.enabled);
    return [
      {
        section: s.id,
        label: s.label,
        drawing: s.drawing,
        steelKg: kg(on.filter((p) => p.kind === "steel").reduce((t, p) => t + p.line.totalWeightKg, 0)),
        totalKg: kg(on.reduce((t, p) => t + p.line.totalWeightKg, 0)),
        materialAmount: money(on.reduce((t, p) => t + p.line.amount, 0)),
        lines: all.length,
      },
    ];
  });

  /* ========================================================================
   * 6. WEIGHT SUMMARY — kg by material, heaviest first (spec §9)
   * ====================================================================== */

  const weightSummary = [...groups.values()]
    .map((g) => ({
      materialKey: g[0].line.materialKey,
      material: g[0].material.name,
      spec: specOf(g[0].material),
      netKg: kg(g.reduce((s, p) => s + p.line.netWeightKg, 0)),
      totalKg: kg(g.reduce((s, p) => s + p.line.totalWeightKg, 0)),
    }))
    .filter((w) => w.totalKg > 0)
    .sort((a, b) => b.totalKg - a.totalKg);

  /* ========================================================================
   * 7. TOTALS
   * ====================================================================== */

  const steel = live.filter((p) => p.kind === "steel");
  const netSteelKg = steel.reduce((s, p) => s + p.line.netWeightKg, 0);
  const totalSteelKg = steel.reduce((s, p) => s + p.line.totalWeightKg, 0);
  const totalWeightKg = live.reduce((s, p) => s + p.line.totalWeightKg, 0);
  const materialAmount = live.reduce((s, p) => s + p.line.amount, 0);

  /** Painting is levied on the coverings you can actually see: walls, roof, partitions. */
  const paintedArea = live
    .filter((p) => p.kind === "sheet" && PAINTED_SECTIONS.includes(p.line.section))
    .reduce((s, p) => s + p.netAreaSqm, 0);

  const chargeLines = charges
    .filter((c) => c.enabled)
    .map((c) => ({
      label: c.label,
      basis: c.basis as string,
      amount: money(
        c.basis === "amount" ? c.value
        : c.basis === "per_kg" ? c.value * totalSteelKg
        : c.basis === "per_sqm" ? c.value * paintedArea
        : (c.value / 100) * materialAmount,
      ),
    }));

  const chargesAmount = chargeLines.reduce((s, c) => s + c.amount, 0);
  const subtotal = materialAmount + chargesAmount;
  const gstAmount = (subtotal * settings.gstPercent) / 100;
  const grandTotal = subtotal + gstAmount;
  const floorSqft = takeoff.meta.floorAreaSqm * SQM_TO_SQFT;

  const totals: BoqTotals = {
    netSteelKg: kg(netSteelKg),
    totalSteelKg: kg(totalSteelKg),
    totalWeightKg: kg(totalWeightKg),
    totalTonnes: round(totalWeightKg / 1000, 3),
    materialAmount: money(materialAmount),
    chargesAmount: money(chargesAmount),
    chargeLines,
    subtotal: money(subtotal),
    gstAmount: money(gstAmount),
    grandTotal: money(grandTotal),
    ratePerSqft: floorSqft > 0 ? money(grandTotal / floorSqft) : 0,
  };

  return {
    meta: takeoff.meta,
    lines,
    cuttingList,
    purchase,
    sections,
    weightSummary,
    totals,
    issues: validateBoq(takeoff, materials, lines, settings),
    notes: takeoff.notes,
  };
}
