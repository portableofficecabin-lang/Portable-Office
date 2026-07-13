"use client";

import type { RebarDesign } from "@/lib/quotation/labourColonyRebar";

/**
 * FOOTING REINFORCEMENT DETAIL — the isolated footing drawn twice:
 *   • PLAN: the bottom mesh (bar dia @ c/c both ways), the pedestal footprint and the bar counts
 *   • SECTION: PCC bed, bottom mesh on cover blocks, optional top mesh, the pedestal/column above
 *     with its starter (dowel) bars lapped into the footing, and every cover dimension
 *
 * Plus the SOIL BEARING CHECK the footing was sized against — load per column, the pressure it
 * delivers, the SBC it is checked against, and the minimum footing that would satisfy it.
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

export function FootingReinforcementDetail({ rebar }: { rebar: RebarDesign }) {
  const { footing, column, bearing } = rebar;

  /* ================= PLAN ================= */
  const PS = 210;                                   // plan drawing box (px)
  const PPAD = 56;
  const pScale = PS / Math.max(0.3, footing.sideM); // px per metre
  const planW = PS + PPAD * 2;
  const planH = PS + PPAD * 2;
  const coverPx = (footing.coverMm / 1000) * pScale;
  const pedPx = (column.sizeMm / 1000) * pScale;
  // Draw at most 12 bars each way so a fine mesh stays legible; the COUNT is always the true one.
  const drawn = Math.min(footing.barsEachWay, 12);

  /* ================ SECTION ================ */
  const totalH = footing.depthM + column.heightM + footing.coverMm / 1000 + 0.1 + 0.15;
  const SS = Math.max(90, Math.min(200, 300 / Math.max(0.5, totalH)));   // px per metre
  const SPADX = 96, SPADY = 44;
  const sw = (m: number) => m * SS;
  const secW = sw(footing.sideM) + SPADX * 2;
  const pccT = 0.1;                                  // PCC bed under the footing (m)
  const secH = sw(totalH) + SPADY * 2;

  // Section levels, measured DOWN from the top of the pedestal.
  const yPedTop = 0;
  const yFootTop = column.heightM;
  const yFootBot = yFootTop + footing.depthM;
  const yPccBot = yFootBot + pccT;
  const sy = (m: number) => SPADY + sw(m);
  const sx = (m: number) => SPADX + sw(m);
  const barR = Math.max(1.6, sw(footing.barDiaMm / 1000) / 2);
  const cvr = footing.coverMm / 1000;

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="font-display font-bold text-sm text-slate-800">Footing Reinforcement Detail</div>
        <div className="text-xs text-slate-500">
          {Math.round(footing.sideM * 1000)} × {Math.round(footing.sideM * 1000)} × {Math.round(footing.depthM * 1000)} mm deep ·{" "}
          {footing.bottomText}
        </div>
        <div className="text-[10px] text-slate-400">Not to scale — schematic · confirm with structural engineer</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---------------- PLAN ---------------- */}
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${planW} ${planH}`} className="w-full h-auto" style={{ minWidth: 300 }}>
            <text x={planW / 2} y={18} textAnchor="middle" fontSize={11} fontWeight={700} fill={COL.ink} letterSpacing={0.8}>
              FOOTING PLAN — BOTTOM MESH
            </text>

            <g transform={`translate(${PPAD},${PPAD})`}>
              {/* footing outline */}
              <rect x={0} y={0} width={PS} height={PS} fill={COL.rcc} stroke={COL.rccStroke} strokeWidth={1.6} />

              {/* the mesh — bars both ways, inside the cover */}
              {Array.from({ length: drawn }, (_, i) => {
                const t = drawn === 1 ? 0.5 : i / (drawn - 1);
                const p = coverPx + t * (PS - 2 * coverPx);
                return (
                  <g key={`m${i}`}>
                    <line x1={p} y1={coverPx} x2={p} y2={PS - coverPx} stroke={COL.rebar} strokeWidth={1.1} />
                    <line x1={coverPx} y1={p} x2={PS - coverPx} y2={p} stroke={COL.rebar} strokeWidth={1.1} opacity={0.75} />
                  </g>
                );
              })}

              {/* pedestal / column footprint at the centre */}
              <rect x={PS / 2 - pedPx / 2} y={PS / 2 - pedPx / 2} width={pedPx} height={pedPx}
                fill="#fff" fillOpacity={0.85} stroke={COL.ink} strokeWidth={1.4} />
              <line x1={PS / 2 - pedPx / 2} y1={PS / 2 - pedPx / 2} x2={PS / 2 + pedPx / 2} y2={PS / 2 + pedPx / 2} stroke={COL.ink} strokeWidth={0.7} />
              <line x1={PS / 2 + pedPx / 2} y1={PS / 2 - pedPx / 2} x2={PS / 2 - pedPx / 2} y2={PS / 2 + pedPx / 2} stroke={COL.ink} strokeWidth={0.7} />

              {/* dims */}
              <line x1={0} y1={-16} x2={PS} y2={-16} stroke={COL.dim} strokeWidth={1} />
              <line x1={0} y1={-20} x2={0} y2={-12} stroke={COL.dim} strokeWidth={1} />
              <line x1={PS} y1={-20} x2={PS} y2={-12} stroke={COL.dim} strokeWidth={1} />
              <text x={PS / 2} y={-20} textAnchor="middle" fontSize={9} fontWeight={700} fill={COL.dim}>
                {Math.round(footing.sideM * 1000)} mm
              </text>
              <text x={PS / 2} y={PS + 18} textAnchor="middle" fontSize={8.5} fill={COL.rebar} fontWeight={700}>
                {footing.bottomText}
              </text>
              <text x={PS / 2} y={PS + 30} textAnchor="middle" fontSize={8} fill={COL.note}>
                {footing.barsEachWay} bars each way · bar length {footing.barLengthMm} mm (incl. 2 × {footing.anchorage.bend90Mm} mm end bends)
              </text>
              <text x={PS + 8} y={PS / 2} fontSize={8} fill={COL.note} transform={`rotate(-90 ${PS + 8} ${PS / 2})`} textAnchor="middle">
                pedestal {column.sizeMm} sq
              </text>
            </g>
          </svg>
        </div>

        {/* ---------------- SECTION ---------------- */}
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${secW} ${secH}`} className="w-full h-auto" style={{ minWidth: 320 }}>
            <defs>
              {/* unique ids — every drawing renders into the SAME sheet document */}
              <pattern id="ftPccHatch" width="6" height="6" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="0.8" fill={COL.pcc} />
              </pattern>
              <pattern id="ftSoilHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke={COL.soil} strokeWidth="0.6" opacity="0.45" />
              </pattern>
            </defs>

            <text x={secW / 2} y={18} textAnchor="middle" fontSize={11} fontWeight={700} fill={COL.ink} letterSpacing={0.8}>
              FOOTING SECTION — REINFORCEMENT
            </text>

            {/* soil either side */}
            <rect x={0} y={sy(yFootTop)} width={SPADX} height={sw(footing.depthM + pccT)} fill="url(#ftSoilHatch)" />
            <rect x={sx(footing.sideM)} y={sy(yFootTop)} width={SPADX} height={sw(footing.depthM + pccT)} fill="url(#ftSoilHatch)" />

            {/* PCC bed (projects 50 mm beyond the footing each side) */}
            <rect x={sx(-0.05)} y={sy(yFootBot)} width={sw(footing.sideM + 0.1)} height={sw(pccT)}
              fill="url(#ftPccHatch)" stroke={COL.rccStroke} strokeWidth={1} />
            <text x={sx(footing.sideM) + 8} y={sy(yFootBot + pccT / 2) + 3} fontSize={8} fill={COL.note}>
              PCC 1:4:8, {Math.round(pccT * 1000)} mm
            </text>

            {/* footing pad */}
            <rect x={sx(0)} y={sy(yFootTop)} width={sw(footing.sideM)} height={sw(footing.depthM)}
              fill={COL.rcc} stroke={COL.rccStroke} strokeWidth={1.6} />

            {/* pedestal / column above */}
            <rect x={sx(footing.sideM / 2 - column.sizeMm / 2000)} y={sy(yPedTop)}
              width={sw(column.sizeMm / 1000)} height={sw(column.heightM)}
              fill={COL.rcc} stroke={COL.rccStroke} strokeWidth={1.6} />

            {/* --- bottom mesh: bars sitting on cover blocks, with 90° end bends --- */}
            {(() => {
              const yBar = yFootBot - cvr;
              const x0 = sx(cvr), x1 = sx(footing.sideM - cvr);
              const bendUp = sw(footing.anchorage.bend90Mm / 1000);
              return (
                <g>
                  {/* the transverse bars, seen end-on as dots */}
                  {Array.from({ length: drawn }, (_, i) => {
                    const t = drawn === 1 ? 0.5 : i / (drawn - 1);
                    const bx = x0 + t * (x1 - x0);
                    return <circle key={`bs${i}`} cx={bx} cy={sy(yBar) - barR * 2.4} r={barR} fill={COL.rebar} />;
                  })}
                  {/* the longitudinal bar in the plane of the section, with its end bends */}
                  <path d={`M ${x0} ${sy(yBar) - bendUp} L ${x0} ${sy(yBar)} L ${x1} ${sy(yBar)} L ${x1} ${sy(yBar) - bendUp}`}
                    fill="none" stroke={COL.rebar} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <text x={sx(footing.sideM) + 8} y={sy(yBar) + 3} fontSize={8} fill={COL.rebar} fontWeight={700}>
                    {footing.bottomText}
                  </text>
                </g>
              );
            })()}

            {/* --- optional top mesh --- */}
            {footing.topMesh && (() => {
              const yBar = yFootTop + cvr;
              const x0 = sx(cvr), x1 = sx(footing.sideM - cvr);
              return (
                <g>
                  <line x1={x0} y1={sy(yBar)} x2={x1} y2={sy(yBar)} stroke={COL.rebar} strokeWidth={2} strokeLinecap="round" />
                  {Array.from({ length: drawn }, (_, i) => {
                    const t = drawn === 1 ? 0.5 : i / (drawn - 1);
                    return <circle key={`ts${i}`} cx={x0 + t * (x1 - x0)} cy={sy(yBar) + barR * 2.4} r={barR} fill={COL.rebar} />;
                  })}
                  <text x={sx(footing.sideM) + 8} y={sy(yBar) + 3} fontSize={8} fill={COL.rebar} fontWeight={700}>
                    {footing.topText}
                  </text>
                </g>
              );
            })()}

            {/* --- column starter / dowel bars: hooked into the footing, lapped above --- */}
            {(() => {
              const half = column.sizeMm / 2000;
              const inset = column.coverMm / 1000;
              const xL = sx(footing.sideM / 2 - half + inset);
              const xR = sx(footing.sideM / 2 + half - inset);
              const yBotHook = sy(yFootBot - cvr);          // hooked onto the bottom mesh
              const yTop = sy(yPedTop - 0.001);
              const hook = sw(footing.anchorage.bend90Mm / 1000);
              return (
                <g stroke={COL.starter} strokeWidth={2} fill="none" strokeLinecap="round">
                  <path d={`M ${xL + hook} ${yBotHook} L ${xL} ${yBotHook} L ${xL} ${yTop}`} />
                  <path d={`M ${xR - hook} ${yBotHook} L ${xR} ${yBotHook} L ${xR} ${yTop}`} />
                  {/* the lap zone marker above the footing */}
                  <line x1={xL - 4} y1={sy(yFootTop - column.lapMm / 1000)} x2={xR + 4} y2={sy(yFootTop - column.lapMm / 1000)}
                    strokeWidth={0.8} strokeDasharray="3 2" />
                </g>
              );
            })()}
            <text x={sx(footing.sideM / 2)} y={sy(yPedTop) - 8} textAnchor="middle" fontSize={8} fontWeight={700} fill={COL.starter}>
              {column.barsText} starters · lap {column.lapMm} mm
            </text>

            {/* --- ties on the pedestal --- */}
            {(() => {
              const half = column.sizeMm / 2000;
              const inset = column.coverMm / 1000;
              const xL = sx(footing.sideM / 2 - half + inset);
              const xR = sx(footing.sideM / 2 + half - inset);
              const n = Math.max(2, Math.floor((column.heightM * 1000) / column.tieSpacingMm));
              return (
                <g stroke={COL.rebar} strokeWidth={1.1}>
                  {Array.from({ length: n }, (_, i) => {
                    const yy = sy(yPedTop + ((i + 0.5) * column.heightM) / n);
                    return <line key={`ti${i}`} x1={xL} y1={yy} x2={xR} y2={yy} />;
                  })}
                </g>
              );
            })()}

            {/* --- cover dims --- */}
            <g fontSize={7.5} fill={COL.dim}>
              <text x={sx(0) - 6} y={sy(yFootBot - cvr / 2) + 3} textAnchor="end">{footing.coverMm}</text>
              <line x1={sx(0)} y1={sy(yFootBot)} x2={sx(0) - 4} y2={sy(yFootBot)} stroke={COL.dim} strokeWidth={0.8} />
              <line x1={sx(0)} y1={sy(yFootBot - cvr)} x2={sx(0) - 4} y2={sy(yFootBot - cvr)} stroke={COL.dim} strokeWidth={0.8} />
            </g>

            {/* --- overall depth dim --- */}
            <g>
              <line x1={sx(footing.sideM) + 62} y1={sy(yFootTop)} x2={sx(footing.sideM) + 62} y2={sy(yFootBot)} stroke={COL.dim} strokeWidth={1} />
              <line x1={sx(footing.sideM) + 58} y1={sy(yFootTop)} x2={sx(footing.sideM) + 66} y2={sy(yFootTop)} stroke={COL.dim} strokeWidth={1} />
              <line x1={sx(footing.sideM) + 58} y1={sy(yFootBot)} x2={sx(footing.sideM) + 66} y2={sy(yFootBot)} stroke={COL.dim} strokeWidth={1} />
              <text x={sx(footing.sideM) + 68} y={(sy(yFootTop) + sy(yFootBot)) / 2 + 3} fontSize={8} fill={COL.dim}>
                {Math.round(footing.depthM * 1000)}
              </text>
            </g>

            {/* ground line */}
            <line x1={0} y1={sy(yFootTop)} x2={secW} y2={sy(yFootTop)} stroke={COL.soil} strokeWidth={1.2} strokeDasharray="6 3" />
            <text x={4} y={sy(yFootTop) - 4} fontSize={8} fill={COL.note}>excavation level</text>
          </svg>
        </div>
      </div>

      {/* ---- SOIL BEARING CHECK ---- */}
      <div className={`mt-4 rounded-lg border p-3 ${bearing.adequate ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="font-display text-xs font-bold uppercase tracking-wide text-slate-700">
            Soil Bearing Check (SBC)
          </div>
          <span className={`text-xs font-bold ${bearing.adequate ? "text-emerald-700" : "text-red-700"}`}>
            {bearing.adequate
              ? `SAFE — ${Math.round(bearing.utilisation * 100)}% of SBC used`
              : `OVERSTRESSED — ${Math.round(bearing.utilisation * 100)}% of SBC`}
          </span>
        </div>
        <div className="grid gap-x-6 gap-y-1 text-[11px] text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
          <Row k="Safe bearing capacity (SBC)" v={`${bearing.sbcKnm2} kN/m²`} strong />
          <Row k="Design load intensity" v={`${bearing.loadPerSqmKn} kN/m² of built-up`} />
          <Row k="Built-up area carried" v={`${bearing.builtUpSqm} m²`} />
          <Row k="Total load on foundation" v={`${bearing.totalLoadKn} kN`} />
          <Row k="Columns" v={`${bearing.columnCount}`} />
          <Row k="Load per column" v={`${bearing.perColumnKn} kN`} strong />
          <Row k="Footing provided" v={`${bearing.footingSideM} m sq = ${bearing.footingAreaSqm} m²`} />
          <Row k="Bearing pressure delivered" v={`${bearing.bearingPressureKnm2} kN/m²`} strong />
          <Row k="Minimum footing for this SBC" v={`${bearing.requiredSideM} m sq`} />
        </div>
        {!bearing.adequate && (
          <p className="mt-2 text-[11px] font-semibold text-red-700">
            Increase the footing to at least {bearing.requiredSideM} m square in the Civil tab, or confirm a
            higher SBC from a site soil-investigation report.
          </p>
        )}
        <p className="mt-2 text-[10px] text-slate-500">
          SBC is an INPUT, not a measurement — it must come from a site soil-investigation report. The check above
          is a service-load bearing check only; it is not a settlement, punching-shear or bending design.
        </p>
      </div>
    </div>
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
