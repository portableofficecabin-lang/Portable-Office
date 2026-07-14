/**
 * MATERIAL BOQ — the math kernel. Pure: no React, no DOM, no Supabase.
 *
 * Every other BOQ module (cabinTakeoff, colonyTakeoff, engine, reports) funnels its arithmetic
 * through these functions, for one reason: the numbers on the quotation, the cutting list and the
 * purchase order must be produced by the SAME code, or they drift.
 *
 * THE RULE THIS FILE ENFORCES (spec §1): a weight or a rate is READ from a Material, never invented.
 * `unitWeight === null` contributes 0 kg; `purchaseRate === null` contributes ₹0. The engine turns
 * those nulls into validation issues — this kernel just refuses to guess. A wrong-but-plausible
 * number is far more expensive than a zero that screams.
 *
 * Three things here are not obvious and are worth the words:
 *  1. `weightBasis` GATES the weight. A kg/m unit weight applied to an area is nonsense, so
 *     steelWeightKg() returns 0 for a kg_per_sqm material rather than multiplying anyway.
 *  2. Bar buying is a PACKING problem, not a division. 12 posts at 2.6 m + 8 rails at 3.1 m out of
 *     6 m bars is not ceil-per-length — nestMany() nests every cut of a material together
 *     (first-fit-decreasing), which is what the yard actually does with a saw.
 *  3. Wastage is applied ONCE, at the purchase quantity, by the engine. Everything here takes
 *     post-wastage inputs (costOf) or is told the % explicitly (sheetsNeeded).
 *
 * Units are canonical: METRES, SQUARE METRES, KILOGRAMS.
 */

import type { Material } from "@/lib/boq/types";
import { ceil, round } from "@/lib/boq/types";

/** Floor with the same epsilon guard `ceil` has: 6 / 0.6 = 9.999…8 must floor to 10, not 9. */
const floorEps = (n: number): number => Math.floor(n + 1e-9);

const EPS = 1e-9;

/* ==========================================================================
 * 1. WEIGHT — basis-gated, Material Master only
 * ========================================================================== */

/** kg of a steel run: running length × kg/m. Zero unless the material IS priced per metre. */
export function steelWeightKg(runningLengthM: number, m: Material): number {
  return runningLengthM * (m.weightBasis === "kg_per_m" ? (m.unitWeight ?? 0) : 0);
}

/** kg of a covering: area × kg/m². Zero unless the material IS weighed per m². */
export function areaWeightKg(areaSqm: number, m: Material): number {
  return areaSqm * (m.weightBasis === "kg_per_sqm" ? (m.unitWeight ?? 0) : 0);
}

/** kg of counted items: nos × kg/nos. Zero unless the material IS weighed per piece. */
export function countWeightKg(qty: number, m: Material): number {
  return qty * (m.weightBasis === "kg_per_nos" ? (m.unitWeight ?? 0) : 0);
}

/* ==========================================================================
 * 2. STOCK-LENGTH NESTING  (spec §3)
 * ========================================================================== */

export interface NestResult {
  bars: number;
  piecesPerBar: number;
  offcutM: number;
  oversize: boolean;
}

const NO_NEST: NestResult = { bars: 0, piecesPerBar: 0, offcutM: 0, oversize: false };

/**
 * Nesting for ONE cut length — the bar-buying calculation.
 *   piecesPerBar = floor(stockLengthM / cutLengthM)
 *   bars         = ceil(pieces / piecesPerBar)
 *   offcutM      = bars × stockLengthM − pieces × cutLengthM
 *
 * piecesPerBar === 0 ⇒ the cut is LONGER than a stock bar: every piece is a special-order length,
 * so bars = pieces and there is no reusable off-cut. `oversize` tells the engine to raise a remark.
 * stockLengthM null/0 ⇒ the material is bought by the metre, there is nothing to nest.
 */
export function nestStock(pieces: number, cutLengthM: number, stockLengthM: number | null): NestResult {
  if (!stockLengthM || stockLengthM <= 0) return { ...NO_NEST };
  if (pieces <= 0 || cutLengthM <= 0) return { ...NO_NEST };

  const piecesPerBar = floorEps(stockLengthM / cutLengthM);
  if (piecesPerBar === 0) return { bars: pieces, piecesPerBar: 0, offcutM: 0, oversize: true };

  const bars = ceil(pieces / piecesPerBar);
  return {
    bars,
    piecesPerBar,
    offcutM: round(bars * stockLengthM - pieces * cutLengthM),
    oversize: false,
  };
}

/**
 * Nest MANY different cut lengths of the SAME material into stock bars — FIRST-FIT-DECREASING.
 * This is the purchase report's bar count: ceil-per-length would over-buy badly, because a 6 m bar
 * that gave up a 3.1 m rail still has 2.9 m left for a 2.6 m post.
 *
 * Every individual piece is expanded, sorted descending, and dropped into the first bar with room;
 * if none has room a new bar is opened. A cut longer than the bar takes its own (special-order) bar
 * and contributes no off-cut — same convention as nestStock.
 *
 * `piecesPerBar` here is the AVERAGE across the nest (a mixed nest has no single value); `offcutM`
 * is the TOTAL remainder across every bar.
 */
export function nestMany(cuts: { cutLengthM: number; qty: number }[], stockLengthM: number | null): NestResult {
  if (!stockLengthM || stockLengthM <= 0) return { ...NO_NEST };

  const pieces: number[] = [];
  for (const c of cuts) {
    if (c.cutLengthM <= 0) continue;
    const n = Math.max(0, Math.round(c.qty));
    for (let i = 0; i < n; i++) pieces.push(c.cutLengthM);
  }
  if (pieces.length === 0) return { ...NO_NEST };

  pieces.sort((a, b) => b - a);

  /** Free length still available in each open bar, in the order the bars were opened. */
  const free: number[] = [];
  let oversize = false;

  for (const len of pieces) {
    if (len > stockLengthM + EPS) {
      free.push(0); // special-order bar cut to size: nothing left to reuse
      oversize = true;
      continue;
    }
    let placed = false;
    for (let i = 0; i < free.length; i++) {
      if (free[i] >= len - EPS) {
        free[i] = free[i] - len;
        placed = true;
        break;
      }
    }
    if (!placed) free.push(stockLengthM - len);
  }

  const bars = free.length;
  return {
    bars,
    piecesPerBar: round(pieces.length / bars, 2),
    offcutM: round(free.reduce((s, f) => s + f, 0)),
    oversize,
  };
}

/* ==========================================================================
 * 3. SHEET / PANEL COUNT  (spec §4)
 * ========================================================================== */

export interface SheetResult {
  sheets: number;
  sheetAreaSqm: number;
  coverageSqm: number;
  offcutSqm: number;
}

/**
 * Whole sheets/panels needed to cover a net area.
 *   sheets      = ceil(netArea × (1 + wastage%) / sheetArea)
 *   offcutSqm   = sheets × sheetArea − netArea
 *
 * A material with no standard sheet size is sold by the m² (vinyl off a roll, coil-cut sheet):
 * there is no sheet to count, so everything is zero. The wastage % still inflates the PURCHASE
 * quantity — that is the engine's job, not this function's.
 */
export function sheetsNeeded(netAreaSqm: number, m: Material, wastagePercent: number): SheetResult {
  const sheetAreaSqm = round((m.sheetLengthM ?? 0) * (m.sheetWidthM ?? 0), 4);
  if (sheetAreaSqm <= 0) return { sheets: 0, sheetAreaSqm: 0, coverageSqm: 0, offcutSqm: 0 };
  if (netAreaSqm <= 0) return { sheets: 0, sheetAreaSqm, coverageSqm: 0, offcutSqm: 0 };

  const sheets = ceil(withWastage(netAreaSqm, wastagePercent) / sheetAreaSqm);
  const coverageSqm = round(sheets * sheetAreaSqm);
  return { sheets, sheetAreaSqm, coverageSqm, offcutSqm: round(coverageSqm - netAreaSqm) };
}

/* ==========================================================================
 * 4. COST  (spec §1 — rateUnit)
 * ========================================================================== */

export interface CostInput {
  weightKg: number;
  lengthM: number;
  areaSqm: number;
  pieces: number;
  sheets: number;
  bars: number;
  qty: number;
}

/**
 * The rate matrix. ALL inputs are POST-wastage purchase quantities — this function never applies
 * wastage itself, or it would be applied twice. A null rate contributes ₹0 (and a validation error
 * upstream); `per_lot` is flat and ignores every quantity.
 */
export function costOf(inp: CostInput, m: Material): number {
  const rate = m.purchaseRate ?? 0;
  switch (m.rateUnit) {
    case "per_kg":           return inp.weightKg * rate;
    case "per_m":            return inp.lengthM * rate;
    case "per_sqm":          return inp.areaSqm * rate;
    case "per_nos":          return inp.pieces * rate;
    case "per_sheet":        return inp.sheets * rate;
    case "per_stock_length": return inp.bars * rate;
    case "per_ltr":          return inp.qty * rate;
    case "per_lot":          return rate;
    default:                 return 0;
  }
}

/* ==========================================================================
 * 5. WASTAGE + LABELS
 * ========================================================================== */

export const withWastage = (q: number, pct: number) => q * (1 + pct / 100);

/**
 * Which wastage % actually applies to a line: a per-line admin override beats the quotation-wide
 * setting, which beats the Material Master's own %. A missing/negative value means 0 — never a
 * negative purchase quantity.
 */
export function effectiveWastage(materialPct: number, settingsPct: number | null, overridePct?: number): number {
  const pct = overridePct ?? settingsPct ?? materialPct;
  return Number.isFinite(pct) && pct > 0 ? pct : 0;
}

/** "3.0", "1.05", "6.0" — at least one decimal, but never rounds 1.05 m away to 1.1 m. */
const dim = (v: number): string => {
  const r = round(v, 2);
  return Number.isInteger(r) ? r.toFixed(1) : String(r);
};

/** "3.0 m × 1.0 m", or an em-dash when the material has no standard sheet size (sold by the m²). */
export function sheetSizeLabel(m: Material): string {
  const l = m.sheetLengthM ?? 0;
  const w = m.sheetWidthM ?? 0;
  return l > 0 && w > 0 ? `${dim(l)} m × ${dim(w)} m` : "—";
}

/** "6.0 m bar", or an em-dash when the material has no stock length (bought by the metre). */
export function stockLabel(m: Material): string {
  const s = m.stockLengthM ?? 0;
  return s > 0 ? `${dim(s)} m bar` : "—";
}
