/**
 * COMPETITIVE / SELLING-PRICE ENGINE  (spec §15). Pure: no React, no DOM, no Supabase.
 *
 *   BoqTotals + floorAreaSqm + CompetitivePricing ──▶ computeCompetitive() ──▶ CompetitiveResult
 *
 * A bottom-up markup on the BOQ COST so the sales desk can quote instantly and never dip below a
 * safe margin. It reads ONLY BoqTotals (the cost side) — it does NOT read or feed pricing.ts
 * computeEstimate (the customer/GMC ₹/sqft selling price) or the Merchant feed, and it leaves every
 * cost total (subtotal / gstAmount / grandTotal / ratePerSqft) untouched.
 *
 * Backward compatible: with the default config (all zero / null) overhead and profit are 0, so
 * exGstSelling == costBase and finalSelling == the cost grand total — i.e. an existing quotation is
 * unchanged and merely gains a "selling == cost" analysis block.
 */
import {
  DEFAULT_COMPETITIVE,
  SQM_TO_SQFT,
  round,
  type BoqTotals,
  type CompetitivePricing,
  type CompetitiveResult,
} from "@/lib/boq/types";

const money = (n: number): number => round(n, 2);
const pct = (n: number): number => round(n, 2);

/** finalSelling vs a benchmark selling amount: ₹ diff and % diff (null-safe, guards /0). */
function diff(mine: number, other: number | null): { amt: number | null; pct: number | null } {
  if (other == null) return { amt: null, pct: null };
  const amt = mine - other;
  return { amt, pct: other !== 0 ? (amt / other) * 100 : null };
}

export function computeCompetitive(
  totals: BoqTotals,
  floorAreaSqm: number,
  cfg: CompetitivePricing | undefined,
  fallbackGstPercent: number,
): CompetitiveResult {
  const c = { ...DEFAULT_COMPETITIVE, ...(cfg ?? {}) };
  const floorSqft = floorAreaSqm * SQM_TO_SQFT;

  const costBase = totals.subtotal; // ex-GST cost = material + charges
  // Overhead is a real cost ⇒ clamp ≥ 0. Profit MAY be negative: the sales desk can quote below
  // cost-plus to win a job, and that is exactly when undercutsCost / belowMinSafe must warn (spec §15).
  const overheadAmount = costBase * (Math.max(0, c.overheadPercent) / 100) + Math.max(0, c.overheadAmount);
  const costWithOverhead = costBase + overheadAmount;
  const profitAmount = costWithOverhead * (c.profitPercent / 100);
  const exGstSelling = costWithOverhead + profitAmount;

  const gstPercent = c.gstPercent ?? fallbackGstPercent;
  const gstAmount = exGstSelling * (gstPercent / 100);
  const rawSelling = exGstSelling + gstAmount;
  const finalSelling = c.roundTo > 0 ? Math.round(rawSelling / c.roundTo) * c.roundTo : rawSelling;

  const ratePerSqft = floorSqft > 0 ? finalSelling / floorSqft : 0;
  const ratePerSqm = floorAreaSqm > 0 ? finalSelling / floorAreaSqm : 0;

  const grossProfit = exGstSelling - costBase;
  const grossMarginPercent = exGstSelling > 0 ? (grossProfit / exGstSelling) * 100 : 0;

  // Benchmarks are entered as GST-inclusive ₹/sqft; compare against the GST-inclusive finalSelling.
  const minSafeSelling = c.minRatePerSqft != null ? c.minRatePerSqft * floorSqft : null;
  const targetSelling = c.targetRatePerSqft != null ? c.targetRatePerSqft * floorSqft : null;
  const competitorSelling = c.competitorRatePerSqft != null ? c.competitorRatePerSqft * floorSqft : null;

  const vsTarget = diff(finalSelling, targetSelling);
  const vsCompetitor = diff(finalSelling, competitorSelling);

  const undercutsCost = exGstSelling < costBase - 1e-6;
  const belowMinSafe = minSafeSelling != null && finalSelling < minSafeSelling - 1e-6;

  const warnings: string[] = [];
  if (undercutsCost) warnings.push("Selling price is BELOW cost — this quotation would lose money.");
  if (belowMinSafe)
    warnings.push(
      `Selling rate ${ratePerSqft.toFixed(0)}/sqft is below the minimum safe rate ${(c.minRatePerSqft ?? 0).toFixed(0)}/sqft — increase the margin.`,
    );
  if (vsCompetitor.pct != null && vsCompetitor.pct > 0)
    warnings.push(`We are ${vsCompetitor.pct.toFixed(1)}% dearer than the competitor rate.`);

  return {
    costBase: money(costBase),
    overheadAmount: money(overheadAmount),
    costWithOverhead: money(costWithOverhead),
    profitAmount: money(profitAmount),
    exGstSelling: money(exGstSelling),
    gstPercent,
    gstAmount: money(gstAmount),
    finalSelling: money(finalSelling),
    ratePerSqft: money(ratePerSqft),
    ratePerSqm: money(ratePerSqm),
    grossProfit: money(grossProfit),
    grossMarginPercent: pct(grossMarginPercent),
    minSafeSelling: minSafeSelling == null ? null : money(minSafeSelling),
    targetSelling: targetSelling == null ? null : money(targetSelling),
    competitorSelling: competitorSelling == null ? null : money(competitorSelling),
    vsTargetAmount: vsTarget.amt == null ? null : money(vsTarget.amt),
    vsTargetPercent: vsTarget.pct == null ? null : pct(vsTarget.pct),
    vsCompetitorAmount: vsCompetitor.amt == null ? null : money(vsCompetitor.amt),
    vsCompetitorPercent: vsCompetitor.pct == null ? null : pct(vsCompetitor.pct),
    undercutsCost,
    belowMinSafe,
    warnings,
  };
}
