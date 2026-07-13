"use client";

import type { ColumnKind, ColumnMark, FootingType, RebarDesign } from "@/lib/quotation/labourColonyRebar";

/**
 * FOOTING SCHEDULE — every footing TYPE detailed, not just one.
 *
 * A corner column, an edge column and an internal column do not carry the same tributary load, so
 * the engine sizes them as separate types (F1, F2, F3 …) against their own load and the SBC. A
 * single "typical footing" detail therefore under-describes the job: the builder needs the mesh,
 * the depth and the bearing check for EACH type. This sheet draws, for every type:
 *
 *   • PLAN    — the pad, the pedestal footprint, and the bottom mesh drawn as real bars
 *               (bars each way @ c/c, inside the cover), dimensioned for side and cover
 *   • SECTION — PCC bed, the pad depth, bottom mesh on cover blocks, the optional top mesh, and the
 *               pedestal above with its starter (dowel) bars hooked onto the bottom mesh
 *   • SPEC    — mark, column kind, nos, size, mesh, bar length, and the BEARING CHECK for that type
 *               (load, delivered pressure, SBC, utilisation, ADEQUATE / OVERSTRESSED)
 *
 * followed by ONE combined FOOTING SCHEDULE table with the totals the BOQ prices.
 *
 * Every number comes from the engine (buildFootingTypes → FootingType[]), so the schedule, the
 * details and the priced quantities cannot drift apart.
 *
 * Schematic reference for quotation / approval — NOT a stamped structural drawing.
 */

const COL = {
  rcc: "#cbd5e1",
  rccStroke: "#334155",
  pcc: "#94a3b8",
  soil: "#78716c",
  rebar: "#dc2626",
  starter: "#b91c1c",
  dim: "#334155",
  ink: "#0f172a",
  note: "#64748b",
  ok: "#15803d",
  bad: "#dc2626",
};

const KIND_LABEL: Record<ColumnKind, string> = {
  internal: "Internal",
  edge: "Edge",
  corner: "Corner",
};

const KIND_NOTE: Record<ColumnKind, string> = {
  internal: "carries a full bay (4 quadrants) — the heaviest footing",
  edge: "carries half a bay (2 quadrants)",
  corner: "carries a quarter bay (1 quadrant) — the lightest footing",
};

/* --------------------------------------------------------------- number safety */
/** Finite-or-fallback. Every value below crosses a module boundary; NaN in a viewBox kills the SVG. */
const fin = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback);
/** Finite AND positive, else fallback. */
const pos = (v: number, fallback: number) => (Number.isFinite(v) && v > 0 ? v : fallback);
const clamp = (v: number, lo: number, hi: number, fallback: number) =>
  Math.min(Math.max(Number.isFinite(v) ? v : fallback, lo), hi);
const mm = (m: number) => Math.round(m * 1000);
const pct = (u: number) => Math.round(fin(u, 0) * 100);

/** Everything the two SVGs are drawn from, already clamped into a drawable range. */
interface SafeGeom {
  sideM: number;
  depthM: number;
  coverM: number;
  barDiaM: number;
  barsEachWay: number;   // true count (used in text)
  drawn: number;         // bars actually drawn, ≤ 12, so a fine mesh stays legible
  pedM: number;
  pedHM: number;
  colCoverM: number;
  bendM: number;         // 90° end-bend allowance
  pccM: number;
}

function geomFor(t: FootingType, rebar: RebarDesign): SafeGeom {
  const sideM = clamp(pos(t.sideM, 1.2), 0.3, 6, 1.2);
  const depthM = clamp(pos(t.depthM, 0.4), 0.15, 3, 0.4);
  // Cover can never eat more than a fifth of the pad, or the mesh would invert.
  const coverM = Math.min(clamp(pos(t.coverMm, 50), 10, 150, 50) / 1000, sideM * 0.2);
  const barDiaM = clamp(pos(t.barDiaMm, 12), 6, 40, 12) / 1000;
  const barsEachWay = Math.max(2, Math.round(clamp(pos(t.barsEachWay, 2), 2, 200, 2)));
  // The pedestal must sit INSIDE the pad on the drawing even if the entered sizes are silly.
  const pedM = Math.min(clamp(pos(rebar.column.sizeMm, 300), 100, 2000, 300) / 1000, sideM * 0.7);
  const pedHM = clamp(pos(rebar.column.heightM, 0.6), 0.1, 5, 0.6);
  const colCoverM = Math.min(clamp(pos(rebar.column.coverMm, 40), 10, 100, 40) / 1000, pedM * 0.25);
  const bendM = clamp(pos(rebar.footing.anchorage.bend90Mm, 96), 20, 400, 96) / 1000;
  return {
    sideM, depthM, coverM, barDiaM, barsEachWay,
    drawn: Math.min(barsEachWay, 12),
    pedM, pedHM, colCoverM,
    // The bend cannot be drawn taller than the pad it sits in.
    bendM: Math.min(bendM, depthM * 0.5),
    pccM: 0.1,
  };
}

/* ============================================================== the sheet */

export function FootingScheduleDetail({ rebar, footingTypes }: {
  rebar: RebarDesign;
  footingTypes: FootingType[];
}) {
  const types = (footingTypes ?? []).filter((t): t is FootingType => !!t);
  const a = rebar.footing.anchorage;

  const totalCount = types.reduce((s, t) => s + Math.max(0, Math.round(fin(t.count, 0))), 0);
  const totalConcrete =
    Math.round(
      types.reduce(
        (s, t) => s + Math.max(0, Math.round(fin(t.count, 0))) * Math.max(0, fin(t.concreteCum, 0)),
        0,
      ) * 1000,
    ) / 1000;
  const anyOverstressed = types.some((t) => !t.adequate);

  return (
    <div className="rounded-2xl border bg-white p-4 text-slate-800">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-300 pb-2">
        <h3 className="text-sm font-bold tracking-wide text-slate-900">FOOTING SCHEDULE &amp; TYPE DETAILS</h3>
        <div className="text-xs text-slate-500">
          {types.length} footing {types.length === 1 ? "type" : "types"} · {totalCount} footings ·{" "}
          {rebar.concreteGrade} / {rebar.steelGrade} · cover {rebar.footing.coverMm} mm
        </div>
        <div className="text-[10px] text-slate-400">
          Schematic reference — NOT a stamped structural drawing
        </div>
      </div>

      {types.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <div className="text-sm font-semibold text-slate-600">No footing types to schedule</div>
          <p className="mx-auto mt-1 max-w-md text-[11px] leading-snug text-slate-500">
            This foundation type has no isolated footings (or no column grid was resolved), so there is
            nothing to detail. Choose an RCC isolated-footing foundation in the Civil tab to generate the
            F1 / F2 / F3 schedule.
          </p>
        </div>
      ) : (
        <>
          {/* ---- what every detail below is dimensioned from ---- */}
          <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[10.5px] leading-snug text-slate-600">
            Footings are sized by TRIBUTARY LOAD: an internal column carries a full bay, an edge column half a
            bay and a corner column a quarter bay — so they are not the same footing.{" "}
            <b>F1 is the most heavily loaded type.</b> Mesh bars are T{rebar.footing.barDiaMm} with a{" "}
            {a.bend90Mm} mm (8φ) 90° bend at each end; development length L<sub>d</sub> ={" "}
            <b>{a.ldMm} mm</b> ({a.ldMultiple}φ) and the starter-bar compression lap is{" "}
            <b>{rebar.column.lapMm} mm</b>, per IS 456:2000 Cl. 26.2 for {rebar.concreteGrade} /{" "}
            {rebar.steelGrade}.
          </p>

          {/* ---- one full detail card per footing type ---- */}
          <div className="space-y-4">
            {types.map((t) => (
              <FootingTypeCard key={t.mark} t={t} rebar={rebar} />
            ))}
          </div>

          {/* ---- the combined schedule ---- */}
          <div className="mt-5">
            <div className="mb-1 text-[11px] font-bold tracking-wide text-slate-900">FOOTING SCHEDULE</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-slate-100 text-left text-slate-700">
                    {["Mark", "Column kind", "Nos", "Size (mm)", "Depth (mm)", "Bottom mesh", "Top mesh",
                      "Bar length (mm)", "Load (kN)", "Pressure (kN/m²)", "SBC", "Utilisation", "Status"].map((h) => (
                      <th key={h} className="border border-slate-300 px-1.5 py-1 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {types.map((t) => {
                    const side = mm(pos(t.sideM, 0));
                    return (
                      <tr key={t.mark}>
                        <td className="border border-slate-300 px-1.5 py-1 font-bold text-red-700">{t.mark}</td>
                        <td className="border border-slate-300 px-1.5 py-1">{KIND_LABEL[t.kind]}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-right">{Math.max(0, Math.round(fin(t.count, 0)))}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-right">{side} × {side}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-right">{mm(pos(t.depthM, 0))}</td>
                        <td className="border border-slate-300 px-1.5 py-1">{t.bottomText}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-slate-500">
                          {t.topMesh ? t.topText : "—"}
                        </td>
                        <td className="border border-slate-300 px-1.5 py-1 text-right">{Math.round(fin(t.barLengthMm, 0))}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-right">{fin(t.loadKn, 0)}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-right font-medium">{fin(t.bearingPressureKnm2, 0)}</td>
                        <td className="border border-slate-300 px-1.5 py-1 text-right text-slate-500">{fin(t.sbcKnm2, 0)}</td>
                        <td className={`border border-slate-300 px-1.5 py-1 text-right font-semibold ${t.adequate ? "text-emerald-700" : "text-red-700"}`}>
                          {pct(t.utilisation)}%
                        </td>
                        <td className={`border border-slate-300 px-1.5 py-1 font-bold ${t.adequate ? "text-emerald-700" : "text-red-700"}`}>
                          {t.adequate ? "ADEQUATE" : "OVERSTRESSED"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-50">
                    <td colSpan={2} className="border border-slate-300 px-1.5 py-1 font-extrabold text-slate-900">
                      TOTAL
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-right font-extrabold text-slate-900">
                      {totalCount}
                    </td>
                    <td colSpan={10} className="border border-slate-300 px-1.5 py-1 font-semibold text-slate-700">
                      {totalCount} footings in {types.length} {types.length === 1 ? "type" : "types"} · footing
                      concrete Σ (nos × volume) = <b className="text-slate-900">{totalConcrete} cum</b> of{" "}
                      {rebar.concreteGrade}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <p className={`mt-3 rounded border p-2 text-[10px] leading-snug ${anyOverstressed ? "border-red-300 bg-red-50 text-red-800" : "border-amber-300 bg-amber-50 text-slate-700"}`}>
            {anyOverstressed ? (
              <>
                <b>One or more footing types are OVERSTRESSED.</b> Increase the footing size in the Civil tab
                to at least the required side shown on that type, or confirm a higher SBC from a site
                soil-investigation report, before this drawing is issued.
              </>
            ) : (
              <>
                <b>SBC is an INPUT, not a measurement</b> — it must come from a site soil-investigation report.
                The check on each type is a service-load bearing check only; it is not a settlement,
                punching-shear or bending design. Sizes, mesh and depths must be verified and stamped by a
                qualified structural engineer before excavation or concreting.
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}

/* ================================================== one footing type: plan + section + spec */

function FootingTypeCard({ t, rebar }: { t: FootingType; rebar: RebarDesign }) {
  const g = geomFor(t, rebar);
  const ok = t.adequate;
  const cols: ColumnMark[] = t.columns ?? [];

  return (
    <div className={`rounded-xl border p-3 ${ok ? "border-slate-200" : "border-red-300 bg-red-50/40"}`}>
      {/* ---- type header ---- */}
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-2">
          <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-bold text-white">{t.mark}</span>
          <span className="text-xs font-semibold text-slate-800">
            {KIND_LABEL[t.kind]} columns — {Math.max(0, Math.round(fin(t.count, 0)))} nos
          </span>
          <span className="text-[10px] text-slate-500">{KIND_NOTE[t.kind]}</span>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-bold ${ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
        >
          {ok ? "ADEQUATE" : "OVERSTRESSED"} — {pct(t.utilisation)}% of SBC
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TypePlan t={t} g={g} />
        <TypeSection t={t} g={g} rebar={rebar} />
      </div>

      {/* ---- per-type spec + bearing check ---- */}
      <div className="mt-3 grid gap-x-6 gap-y-1 text-[11px] sm:grid-cols-2 lg:grid-cols-3">
        <Row k="Footing size" v={`${mm(g.sideM)} × ${mm(g.sideM)} mm`} strong />
        <Row k="Footing depth" v={`${mm(g.depthM)} mm`} />
        <Row k="Clear cover" v={`${Math.round(fin(t.coverMm, 0))} mm`} />
        <Row k="Bottom mesh" v={t.bottomText} strong />
        <Row k="Top mesh" v={t.topMesh ? t.topText : "not required"} />
        <Row k="Bars each way" v={`${g.barsEachWay} nos`} />
        <Row k="Bar length" v={`${Math.round(fin(t.barLengthMm, 0))} mm (incl. 2 × ${rebar.footing.anchorage.bend90Mm} mm bends)`} />
        <Row k="Concrete per footing" v={`${fin(t.concreteCum, 0)} cum`} />
        <Row k="Excavation pit" v={`${fin(t.pitCum, 0)} cum`} />
      </div>

      <div className={`mt-2 rounded-lg border p-2 ${ok ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-700">
          Bearing check — {t.mark}
        </div>
        <div className="grid gap-x-6 gap-y-1 text-[11px] sm:grid-cols-2 lg:grid-cols-3">
          <Row k="Load on one footing" v={`${fin(t.loadKn, 0)} kN`} strong />
          <Row k="Tributary share" v={`${fin(t.tributary, 0)} bay`} />
          <Row k="Bearing pressure" v={`${fin(t.bearingPressureKnm2, 0)} kN/m²`} strong />
          <Row k="Safe bearing capacity" v={`${fin(t.sbcKnm2, 0)} kN/m²`} />
          <Row k="Utilisation" v={`${pct(t.utilisation)}% of SBC`} strong />
          <Row k="Minimum side for this SBC" v={`${fin(t.requiredSideM, 0)} m sq`} />
        </div>
        {!ok && (
          <p className="mt-1 text-[10.5px] font-semibold text-red-700">
            {t.mark} delivers {fin(t.bearingPressureKnm2, 0)} kN/m² against an SBC of {fin(t.sbcKnm2, 0)} kN/m².
            Increase this footing to at least {fin(t.requiredSideM, 0)} m square, or confirm a higher SBC by soil test.
          </p>
        )}
        {cols.length > 0 && (
          <p className="mt-1 text-[10px] text-slate-500">
            Grid refs: {cols.slice(0, 12).map((c) => `${c.mark} (${c.grid})`).join(", ")}
            {cols.length > 12 ? ` … +${cols.length - 12} more` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ PLAN */

function TypePlan({ t, g }: { t: FootingType; g: SafeGeom }) {
  const PS = 200;                       // plan box (px)
  const PAD = 54;
  const W = PS + PAD * 2;
  const H = PS + PAD * 2;

  const scale = PS / g.sideM;           // px per metre — sideM ≥ 0.3, never zero
  const coverPx = g.coverM * scale;     // coverM ≤ 0.2 × sideM ⇒ coverPx ≤ 0.2 × PS
  const pedPx = g.pedM * scale;
  const inner = PS - 2 * coverPx;       // > 0 by construction
  const drawn = g.drawn;

  const barAt = (i: number) => {
    const f = drawn === 1 ? 0.5 : i / (drawn - 1);
    return coverPx + f * inner;
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" style={{ minWidth: 290 }}>
        <text x={W / 2} y={16} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={COL.ink} letterSpacing={0.8}>
          {t.mark} — FOOTING PLAN (BOTTOM MESH)
        </text>

        <g transform={`translate(${PAD},${PAD})`}>
          {/* pad */}
          <rect x={0} y={0} width={PS} height={PS} fill={COL.rcc} stroke={COL.rccStroke} strokeWidth={1.6} />

          {/* the mesh — real bars, both ways, inside the cover */}
          {Array.from({ length: drawn }, (_, i) => {
            const p = barAt(i);
            return (
              <g key={`m${i}`}>
                <line x1={p} y1={coverPx} x2={p} y2={PS - coverPx} stroke={COL.rebar} strokeWidth={1.1} />
                <line x1={coverPx} y1={p} x2={PS - coverPx} y2={p} stroke={COL.rebar} strokeWidth={1.1} opacity={0.75} />
              </g>
            );
          })}

          {/* pedestal footprint */}
          <rect
            x={PS / 2 - pedPx / 2} y={PS / 2 - pedPx / 2} width={pedPx} height={pedPx}
            fill="#ffffff" fillOpacity={0.85} stroke={COL.ink} strokeWidth={1.4}
          />
          <line x1={PS / 2 - pedPx / 2} y1={PS / 2 - pedPx / 2} x2={PS / 2 + pedPx / 2} y2={PS / 2 + pedPx / 2} stroke={COL.ink} strokeWidth={0.7} />
          <line x1={PS / 2 + pedPx / 2} y1={PS / 2 - pedPx / 2} x2={PS / 2 - pedPx / 2} y2={PS / 2 + pedPx / 2} stroke={COL.ink} strokeWidth={0.7} />
          <text x={PS / 2} y={PS / 2 + pedPx / 2 + 10} textAnchor="middle" fontSize={7.5} fill={COL.note}>
            pedestal {mm(g.pedM)} sq
          </text>

          {/* overall side dim */}
          <DimH x1={0} x2={PS} y={-16} label={`${mm(g.sideM)} mm`} bold />
          {/* cover dim — pad edge to the first bar */}
          <DimH x1={0} x2={coverPx} y={PS + 14} label={`${Math.round(fin(t.coverMm, 0))}`} />
          <text x={coverPx + 6} y={PS + 18} fontSize={7} fill={COL.note}>cover</text>
          {/* the c/c spacing between two adjacent bars */}
          {drawn > 1 && (
            <DimV x={-14} y1={barAt(0)} y2={barAt(1)} label={`${Math.round(fin(t.spacingMm, 0))}`} />
          )}

          <text x={PS / 2} y={PS + 32} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={COL.rebar}>
            {t.bottomText}
          </text>
          <text x={PS / 2} y={PS + 43} textAnchor="middle" fontSize={7.5} fill={COL.note}>
            {g.barsEachWay} bars each way · bar length {Math.round(fin(t.barLengthMm, 0))} mm
            {drawn < g.barsEachWay ? " · mesh shown indicatively" : ""}
          </text>
        </g>
      </svg>
    </div>
  );
}

/* --------------------------------------------------------------------- SECTION */

function TypeSection({ t, g, rebar }: { t: FootingType; g: SafeGeom; rebar: RebarDesign }) {
  const { column } = rebar;

  const totalHM = g.pedHM + g.depthM + g.pccM;                 // ≥ 0.35 m
  const SS = Math.max(70, Math.min(190, 260 / totalHM));       // px per metre
  const sw = (m: number) => m * SS;
  const PADX = 92, PADY = 40;
  const W = sw(g.sideM) + PADX * 2;
  const H = sw(totalHM) + PADY * 2 + 22;

  // levels measured DOWN from the top of the pedestal
  const yPedTop = 0;
  const yFootTop = g.pedHM;
  const yFootBot = yFootTop + g.depthM;
  const sx = (m: number) => PADX + sw(m);
  const sy = (m: number) => PADY + sw(m);

  const barR = Math.max(1.5, sw(g.barDiaM) / 2);
  const cv = g.coverM;
  const x0 = sx(cv), x1 = sx(g.sideM - cv);
  const drawn = g.drawn;
  const barX = (i: number) => (drawn === 1 ? (x0 + x1) / 2 : x0 + (i / (drawn - 1)) * (x1 - x0));

  const bendPx = sw(g.bendM);
  const yBot = yFootBot - cv;                                   // bottom mesh level
  const yTopMesh = yFootTop + cv;                               // top mesh level

  // pedestal / starter geometry
  const halfPed = g.pedM / 2;
  const xPedL = sx(g.sideM / 2 - halfPed);
  const xStartL = sx(g.sideM / 2 - halfPed + g.colCoverM);
  const xStartR = sx(g.sideM / 2 + halfPed - g.colCoverM);
  const ties = Math.max(2, Math.min(10, Math.floor((g.pedHM * 1000) / Math.max(50, pos(column.tieSpacingMm, 150)))));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" style={{ minWidth: 300 }}>
        <defs>
          {/* ids are namespaced per MARK — every type renders into the SAME sheet document */}
          <pattern id={`fsPcc-${t.mark}`} width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.8" fill={COL.pcc} />
          </pattern>
          <pattern id={`fsSoil-${t.mark}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke={COL.soil} strokeWidth="0.6" opacity="0.45" />
          </pattern>
        </defs>

        <text x={W / 2} y={16} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={COL.ink} letterSpacing={0.8}>
          {t.mark} — SECTION (REINFORCEMENT)
        </text>

        {/* soil either side of the pit */}
        <rect x={0} y={sy(yFootTop)} width={PADX} height={sw(g.depthM + g.pccM)} fill={`url(#fsSoil-${t.mark})`} />
        <rect x={sx(g.sideM)} y={sy(yFootTop)} width={PADX} height={sw(g.depthM + g.pccM)} fill={`url(#fsSoil-${t.mark})`} />

        {/* PCC bed — projects 50 mm each side */}
        <rect
          x={sx(-0.05)} y={sy(yFootBot)} width={sw(g.sideM + 0.1)} height={sw(g.pccM)}
          fill={`url(#fsPcc-${t.mark})`} stroke={COL.rccStroke} strokeWidth={1}
        />
        <text x={sx(g.sideM) + 6} y={sy(yFootBot + g.pccM / 2) + 3} fontSize={7.5} fill={COL.note}>
          PCC 1:4:8, {mm(g.pccM)} mm
        </text>

        {/* the pad */}
        <rect x={sx(0)} y={sy(yFootTop)} width={sw(g.sideM)} height={sw(g.depthM)} fill={COL.rcc} stroke={COL.rccStroke} strokeWidth={1.6} />

        {/* pedestal above */}
        <rect x={xPedL} y={sy(yPedTop)} width={sw(g.pedM)} height={sw(g.pedHM)} fill={COL.rcc} stroke={COL.rccStroke} strokeWidth={1.6} />

        {/* --- bottom mesh: bars on cover blocks, 90° end bends turned up --- */}
        <g>
          {Array.from({ length: drawn }, (_, i) => (
            <circle key={`bb${i}`} cx={barX(i)} cy={sy(yBot) - barR * 2.4} r={barR} fill={COL.rebar} />
          ))}
          <path
            d={`M ${x0} ${sy(yBot) - bendPx} L ${x0} ${sy(yBot)} L ${x1} ${sy(yBot)} L ${x1} ${sy(yBot) - bendPx}`}
            fill="none" stroke={COL.rebar} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          />
          <text x={sx(g.sideM) + 6} y={sy(yBot) + 3} fontSize={7.5} fontWeight={700} fill={COL.rebar}>
            {t.bottomText}
          </text>
        </g>

        {/* --- optional top mesh --- */}
        {t.topMesh && (
          <g>
            <line x1={x0} y1={sy(yTopMesh)} x2={x1} y2={sy(yTopMesh)} stroke={COL.rebar} strokeWidth={2} strokeLinecap="round" />
            {Array.from({ length: drawn }, (_, i) => (
              <circle key={`tb${i}`} cx={barX(i)} cy={sy(yTopMesh) + barR * 2.4} r={barR} fill={COL.rebar} />
            ))}
            <text x={sx(g.sideM) + 6} y={sy(yTopMesh) + 3} fontSize={7.5} fontWeight={700} fill={COL.rebar}>
              {t.topText}
            </text>
          </g>
        )}

        {/* --- starter / dowel bars: hooked onto the bottom mesh, lapped above --- */}
        <g stroke={COL.starter} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={`M ${xStartL + bendPx} ${sy(yBot)} L ${xStartL} ${sy(yBot)} L ${xStartL} ${sy(yPedTop)}`} />
          <path d={`M ${xStartR - bendPx} ${sy(yBot)} L ${xStartR} ${sy(yBot)} L ${xStartR} ${sy(yPedTop)}`} />
        </g>
        {/* pedestal ties */}
        <g stroke={COL.rebar} strokeWidth={1.1}>
          {Array.from({ length: ties }, (_, i) => {
            const yy = sy(yPedTop + ((i + 0.5) * g.pedHM) / ties);
            return <line key={`ty${i}`} x1={xStartL} y1={yy} x2={xStartR} y2={yy} />;
          })}
        </g>
        <text x={sx(g.sideM / 2)} y={sy(yPedTop) - 7} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={COL.starter}>
          {column.barsText} starters · lap {column.lapMm} mm
        </text>

        {/* --- depth dim --- */}
        <DimV x={sx(g.sideM) + 74} y1={sy(yFootTop)} y2={sy(yFootBot)} label={`${mm(g.depthM)}`} />
        {/* --- cover dim, pad soffit to the bottom mesh --- */}
        <DimV x={sx(0) - 8} y1={sy(yFootBot)} y2={sy(yBot)} label={`${Math.round(fin(t.coverMm, 0))}`} />

        {/* excavation level */}
        <line x1={0} y1={sy(yFootTop)} x2={W} y2={sy(yFootTop)} stroke={COL.soil} strokeWidth={1.2} strokeDasharray="6 3" />
        <text x={3} y={sy(yFootTop) - 4} fontSize={7.5} fill={COL.note}>excavation level</text>

        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={7.5} fill={ t.adequate ? COL.ok : COL.bad } fontWeight={700}>
          {fin(t.loadKn, 0)} kN → {fin(t.bearingPressureKnm2, 0)} kN/m² on SBC {fin(t.sbcKnm2, 0)} kN/m² ({pct(t.utilisation)}%)
        </text>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------- helpers */

function DimH({ x1, x2, y, label, bold }: { x1: number; x2: number; y: number; label: string; bold?: boolean }) {
  const a = Math.min(x1, x2), b = Math.max(x1, x2);
  return (
    <g>
      <line x1={a} y1={y} x2={b} y2={y} stroke={COL.dim} strokeWidth={0.9} />
      <line x1={a} y1={y - 3} x2={a} y2={y + 3} stroke={COL.dim} strokeWidth={0.9} />
      <line x1={b} y1={y - 3} x2={b} y2={y + 3} stroke={COL.dim} strokeWidth={0.9} />
      <text x={(a + b) / 2} y={y - 4} textAnchor="middle" fontSize={bold ? 8.5 : 7.2} fontWeight={bold ? 700 : 400} fill={COL.dim}>
        {label}
      </text>
    </g>
  );
}

function DimV({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) {
  const a = Math.min(y1, y2), b = Math.max(y1, y2);
  return (
    <g>
      <line x1={x} y1={a} x2={x} y2={b} stroke={COL.dim} strokeWidth={0.9} />
      <line x1={x - 3} y1={a} x2={x + 3} y2={a} stroke={COL.dim} strokeWidth={0.9} />
      <line x1={x - 3} y1={b} x2={x + 3} y2={b} stroke={COL.dim} strokeWidth={0.9} />
      <text x={x + 5} y={(a + b) / 2 + 2.5} textAnchor="start" fontSize={7.2} fill={COL.dim}>{label}</text>
    </g>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-2 border-b border-slate-200/70 py-0.5">
      <span className="text-slate-500">{k}</span>
      <span className={strong ? "font-bold text-slate-900" : "font-medium text-slate-700"}>{v}</span>
    </div>
  );
}
