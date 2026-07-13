"use client";

import type { BbsResult, BbsRow, RebarDesign, ShapeCode, ShapeLegs } from "@/lib/quotation/labourColonyRebar";

import { RebarShape, shapeCodeTitle } from "./RebarShape";

/**
 * BAR BENDING SCHEDULE (BBS) — the steel take-off the BOQ is actually priced from.
 *
 * Every bar detailed on the drawings appears here with its SHAPE CODE, the bent shape DRAWN to its
 * real leg dimensions, its cutting length (bends and hooks included), count and weight. The total,
 * plus cutting wastage, IS the reinforcement quantity in the civil BOQ — the old
 * `concrete volume × 85 kg/cum` rule of thumb is gone.
 *
 * The shape column is what makes this schedule fabricable: a cutting length alone does not tell a
 * bender whether 1100 mm of T12 is a straight bar, a staple or a closed link. IS 2502 / BS 8666
 * shape codes (20 / 21 / 26 / 51) do, and the legend under the table lets the yard read the
 * schedule without the drawing sheets.
 *
 * Unit weight w = d²/162 kg/m.  Cutting lengths per IS 2502 bend/hook allowances.
 * NOT a stamped design — the schedule must be checked by a structural engineer before fabrication.
 */

const inr = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

/** How to read the legs on each shape — printed in the legend so the yard needs no drawing. */
const LEG_KEY: Record<ShapeCode, string> = {
  20: "A = full cutting length, no bends.",
  21: "A = straight leg between the bends · B, C = 90° end bends (8φ).",
  26: "A = straight leg incl. embedment · B = 90° kicker at the foot · C = lap projection for the lift above (shown dashed).",
  51: "A = outer width · B = outer depth · C = 135° hook, turned into the section at the closing corner.",
};

/** Distinct shape codes used by THIS schedule, with a representative bar to draw and where it is used. */
interface LegendEntry {
  code: ShapeCode;
  legs: ShapeLegs;
  diaMm: number;
  marks: string[];
}

function buildShapeLegend(rows: BbsRow[]): LegendEntry[] {
  const map = new Map<ShapeCode, LegendEntry>();
  for (const r of rows) {
    const seen = map.get(r.shapeCode);
    if (seen) {
      if (!seen.marks.includes(r.mark)) seen.marks.push(r.mark);
    } else {
      map.set(r.shapeCode, { code: r.shapeCode, legs: r.legs, diaMm: r.diaMm, marks: [r.mark] });
    }
  }
  return [...map.values()].sort((a, b) => a.code - b.code);
}

export function BarBendingSchedule({ bbs, rebar, counts }: {
  bbs: BbsResult;
  rebar: RebarDesign;
  counts: { footings: number; pedestals: number; beamLengthM: number };
}) {
  const a = rebar.beam.anchorage;
  const legend = buildShapeLegend(bbs.rows);

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
        <table className="w-full min-w-[980px] border-collapse text-[10.5px]">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-700">
              {["Mark", "Member", "Shape code", "Shape (bent bar)", "Dia (mm)", "Members", "Bars / member",
                "Total nos", "Cutting length (mm)", "Total length (m)", "Unit wt (kg/m)", "Weight (kg)"].map((h) => (
                <th key={h} className="border border-slate-300 px-1.5 py-1 align-bottom font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bbs.rows.map((r, i) => (
              <tr key={`${r.mark}-${i}`} className={i % 2 === 1 ? "bg-slate-50/70" : undefined}>
                <td className="border border-slate-300 px-1.5 py-1 align-middle font-bold text-red-700">{r.mark}</td>
                <td className="border border-slate-300 px-1.5 py-1 align-middle">{r.member}</td>

                {/* the code the bender actually works to — printed big, on its own */}
                <td className="border border-slate-300 px-1.5 py-1 text-center align-middle" title={shapeCodeTitle(r.shapeCode)}>
                  <span className="text-[15px] font-extrabold leading-none text-slate-900">{r.shapeCode}</span>
                </td>

                {/* the bent bar itself, drawn to its real leg dimensions */}
                <td className="border border-slate-300 px-1.5 py-1 align-middle" title={`Shape ${r.shapeCode} — ${r.shape}`}>
                  <RebarShape code={r.shapeCode} legs={r.legs} diaMm={r.diaMm} />
                  <div className="mt-0.5 text-[8.5px] leading-tight text-slate-500">{r.shape}</div>
                </td>

                <td className="border border-slate-300 px-1.5 py-1 align-middle whitespace-nowrap">T{r.diaMm}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right align-middle">{r.members}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right align-middle">{r.barsPerMember}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right align-middle font-medium">{r.totalBars}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right align-middle">{r.cuttingLengthMm}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right align-middle">{r.totalLengthM}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right align-middle text-slate-500">{r.unitWtKgPerM}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right align-middle font-semibold">{r.weightKg}</td>
              </tr>
            ))}
            {bbs.rows.length === 0 && (
              <tr>
                <td colSpan={12} className="border border-slate-300 px-2 py-2 text-center text-slate-400">
                  No reinforcement for this foundation type.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td colSpan={11} className="border border-slate-300 px-1.5 py-1 text-right font-semibold">Net steel</td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-bold">{bbs.netKg} kg</td>
            </tr>
            <tr className="bg-slate-50">
              <td colSpan={11} className="border border-slate-300 px-1.5 py-1 text-right font-semibold">
                Cutting / bending wastage @ {bbs.wastagePct}%
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-bold">{bbs.wastageKg} kg</td>
            </tr>
            <tr className="bg-amber-50">
              <td colSpan={11} className="border border-slate-300 px-1.5 py-1 text-right font-extrabold text-slate-900">
                TOTAL STEEL FOR PRICING
              </td>
              <td className="border border-slate-300 px-1.5 py-1 text-right font-extrabold text-slate-900">
                {inr(bbs.totalKg)} kg = {bbs.totalTonnes} t
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ---- SHAPE CODE LEGEND — every code this schedule uses, so the yard can bend from the table alone ---- */}
      {legend.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div className="text-[11px] font-bold tracking-wide text-slate-900">
              SHAPE CODE LEGEND (IS 2502 / BS 8666)
            </div>
            <div className="text-[10px] text-slate-400">
              Dimensions on the diagrams are the true leg lengths in mm — the diagrams are not to scale
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {legend.map((e) => (
              <div key={e.code} className="flex items-start gap-3 rounded border border-slate-200 bg-white p-2">
                <div className="w-8 shrink-0 text-center">
                  <div className="text-[18px] font-extrabold leading-none text-slate-900">{e.code}</div>
                  <div className="mt-0.5 text-[8px] uppercase tracking-wide text-slate-400">code</div>
                </div>
                <div className="shrink-0">
                  <RebarShape code={e.code} legs={e.legs} diaMm={e.diaMm} width={104} height={52} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-slate-900">
                    {e.code} — {shapeCodeTitle(e.code)}
                  </div>
                  <div className="mt-0.5 text-[10px] leading-snug text-slate-600">{LEG_KEY[e.code] ?? ""}</div>
                  <div className="mt-0.5 truncate text-[9.5px] text-slate-400" title={e.marks.join(", ")}>
                    Used by: {e.marks.join(", ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
