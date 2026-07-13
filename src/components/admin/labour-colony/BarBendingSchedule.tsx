"use client";

import type { BbsResult, RebarDesign } from "@/lib/quotation/labourColonyRebar";

/**
 * BAR BENDING SCHEDULE (BBS) — the steel take-off the BOQ is actually priced from.
 *
 * Every bar detailed on the drawings appears here with its shape, cutting length (bends and hooks
 * included), count and weight. The total, plus cutting wastage, IS the reinforcement quantity in
 * the civil BOQ — the old `concrete volume × 85 kg/cum` rule of thumb is gone.
 *
 * Unit weight w = d²/162 kg/m.  Cutting lengths per IS 2502 bend/hook allowances.
 * NOT a stamped design — the schedule must be checked by a structural engineer before fabrication.
 */

const inr = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

export function BarBendingSchedule({ bbs, rebar, counts }: {
  bbs: BbsResult;
  rebar: RebarDesign;
  counts: { footings: number; pedestals: number; beamLengthM: number };
}) {
  const a = rebar.beam.anchorage;

  return (
    <div className="rounded-2xl border bg-white p-4 text-slate-800">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-300 pb-2">
        <h3 className="text-sm font-bold tracking-wide text-slate-900">BAR BENDING SCHEDULE (BBS)</h3>
        <div className="text-xs text-slate-500">
          {rebar.steelGrade} TMT · {rebar.concreteGrade} · {counts.footings} footings ·{" "}
          {counts.pedestals} pedestals · {counts.beamLengthM} m plinth beam
        </div>
        <div className="text-[10px] text-slate-400">Check with structural engineer before fabrication</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-[10.5px]">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-700">
              {["Mark", "Member", "Shape", "Dia (mm)", "Members", "Bars / member", "Total nos",
                "Cutting length (mm)", "Total length (m)", "Unit wt (kg/m)", "Weight (kg)"].map((h) => (
                <th key={h} className="border border-slate-300 px-1.5 py-1 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bbs.rows.map((r) => (
              <tr key={r.mark}>
                <td className="border border-slate-300 px-1.5 py-1 font-bold text-red-700">{r.mark}</td>
                <td className="border border-slate-300 px-1.5 py-1">{r.member}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-slate-500">{r.shape}</td>
                <td className="border border-slate-300 px-1.5 py-1">T{r.diaMm}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right">{r.members}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right">{r.barsPerMember}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right font-medium">{r.totalBars}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right">{r.cuttingLengthMm}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right">{r.totalLengthM}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right text-slate-500">{r.unitWtKgPerM}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right font-semibold">{r.weightKg}</td>
              </tr>
            ))}
            {bbs.rows.length === 0 && (
              <tr>
                <td colSpan={11} className="border border-slate-300 px-2 py-2 text-center text-slate-400">
                  No reinforcement for this foundation type.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td colSpan={10} className="border border-slate-300 px-1.5 py-1 text-right font-semibold">Net steel</td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-bold">{bbs.netKg} kg</td>
            </tr>
            <tr className="bg-slate-50">
              <td colSpan={10} className="border border-slate-300 px-1.5 py-1 text-right font-semibold">
                Cutting / bending wastage @ {bbs.wastagePct}%
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-bold">{bbs.wastageKg} kg</td>
            </tr>
            <tr className="bg-amber-50">
              <td colSpan={10} className="border border-slate-300 px-1.5 py-1 text-right font-extrabold text-slate-900">
                TOTAL STEEL FOR PRICING
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-extrabold text-slate-900">
                {inr(bbs.totalKg)} kg = {bbs.totalTonnes} t
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ---- ordering summary + the allowances the cutting lengths include ---- */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[11px] font-bold tracking-wide text-slate-900">STEEL BY DIAMETER (for ordering)</div>
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              {bbs.byDia.map((d) => (
                <tr key={d.diaMm}>
                  <td className="border border-slate-300 px-2 py-0.5">T{d.diaMm}</td>
                  <td className="border border-slate-300 px-2 py-0.5 text-right font-medium">{d.kg} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-bold tracking-wide text-slate-900">ALLOWANCES INCLUDED</div>
          <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-slate-600">
            <li>Development length Ld = <b>{a.ldMm} mm</b> ({a.ldMultiple}φ) — IS 456 Cl. 26.2.1</li>
            <li>Tension lap <b>{a.lapTensionMm} mm</b>, compression lap <b>{a.lapCompressionMm} mm</b>; one splice per 12 m stock length</li>
            <li>Anchorage into support <b>{rebar.beam.anchorageIntoSupportMm} mm</b>; 90° end bend {a.bend90Mm} mm (8φ)</li>
            <li>Stirrup/tie 135° hooks <b>{a.hook135Mm} mm</b>, less standard bend deductions (3 × 2φ + 2 × 3φ)</li>
            <li>Cutting &amp; bending wastage <b>{bbs.wastagePct}%</b></li>
            <li>Implied intensity <b>{bbs.kgPerCum} kg/cum</b> of RCC — sanity check only, not the basis of pricing</li>
          </ul>
        </div>
      </div>

      <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-[10px] leading-snug text-slate-700">
        <b>This schedule prices the steel in the BOQ.</b> Quantities are derived from the bar sizes, spacings
        and counts entered in the Civil tab and drawn on these sheets. They are a <b>take-off, not a structural
        design</b> — bar diameters, spacings and curtailment must be verified and stamped by a qualified
        structural engineer against the actual loads and soil report before fabrication or concreting.
      </p>
    </div>
  );
}
