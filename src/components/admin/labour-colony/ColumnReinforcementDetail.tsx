"use client";

import type { RebarDesign } from "@/lib/quotation/labourColonyRebar";

/**
 * COLUMN / PEDESTAL REINFORCEMENT DETAIL — the detail a builder actually ties the cage from:
 *
 *   CROSS-SECTION (plan cut)  — the square column, the clear cover, the closed rectangular tie just
 *                               inside the cover, and the vertical bars distributed around the tie
 *                               perimeter (4 corner bars + the balance spread evenly over the four
 *                               faces — i.e. the "8-T16 arrangement", correct for 4, 6, 8, 10, 12+).
 *   ELEVATION                 — the tie SPACING ZONES: ties closed up to the confinement spacing over
 *                               one column-depth at each end, at the general spacing over the middle,
 *                               plus the starter/dowel bars out of the footing and the compression lap.
 *
 * Every dimension is DERIVED from `rebar` (IS 456:2000 Cl. 26.2 development length / lap set), so
 * changing the concrete grade, steel grade or bar size moves every number on this sheet.
 *
 * Schematic reference for quotation / approval — NOT a stamped structural drawing.
 */

const COL = {
  concrete: "#e2e8f0",
  concreteStroke: "#334155",
  footing: "#cbd5e1",
  bar: "#dc2626",
  tie: "#059669",
  starter: "#b45309",
  lap: "#b45309",
  zone: "#0ea5e9",
  dim: "#334155",
  ink: "#0f172a",
  note: "#64748b",
  bad: "#dc2626",
  ok: "#15803d",
};

/* --------------------------------------------------------------------- helpers */

/** Finite-and-positive, else the fallback — no NaN may ever reach an SVG coordinate. */
const pos = (v: number, fallback: number): number => (Number.isFinite(v) && v > 0 ? v : fallback);
/** Finite-and-non-negative (a lap or projection may legitimately be 0). */
const nonNeg = (v: number, fallback: number): number => (Number.isFinite(v) && v >= 0 ? v : fallback);
const lim = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);
const r0 = (v: number): number => Math.round(v);

type Face = "top" | "bottom" | "left" | "right";

/**
 * Spread the vertical bars around the tie perimeter: FOUR CORNER BARS ALWAYS, then the balance
 * shared evenly over the four faces (opposite faces first, so 6 bars reads as a symmetric
 * 4 + 2 and 10 bars as 4 + 2/2/1/1). Never hardcodes 8.
 */
function barsPerFace(bars: number): Record<Face, number> {
  const extra = Math.max(0, bars - 4);
  const base = Math.floor(extra / 4);
  const rem = extra - base * 4;
  const out: Record<Face, number> = { top: base, bottom: base, left: base, right: base };
  const order: Face[] = ["top", "bottom", "left", "right"];   // opposite faces first → symmetric
  for (let i = 0; i < rem; i++) out[order[i]] += 1;
  return out;
}

/* ==================================================================== component */

export function ColumnReinforcementDetail({ rebar }: { rebar: RebarDesign }) {
  const c = rebar?.column;

  // ---- degenerate / missing input: a graceful placeholder, never a crash or a NaN drawing ----
  if (!c || !Number.isFinite(c.sizeMm) || c.sizeMm <= 0) {
    return (
      <div className="rounded-2xl border bg-white p-4 text-slate-800">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-200 pb-2">
          <h3 className="text-sm font-bold tracking-wide text-slate-900">COLUMN REINFORCEMENT DETAIL</h3>
          <div className="text-xs text-slate-500">No column section available</div>
          <div className="text-[10px] text-slate-400">Schematic reference — NOT a stamped structural drawing</div>
        </div>
        <p className="py-6 text-center text-xs text-slate-500">
          Enter the pedestal / column size, bar count, bar diameter and tie details in the Civil tab to
          generate the column cross-section and tie-spacing elevation.
        </p>
      </div>
    );
  }

  /* -------------------------------------------------- sanitised design values (mm) */
  const sizeMm = lim(pos(c.sizeMm, 300), 100, 3000);
  const barDiaMm = lim(pos(c.barDiaMm, 16), 6, 40);
  const tieDiaMm = lim(pos(c.tieDiaMm, 8), 4, 20);
  // Cover must leave a usable core: at least 20 mm of clear span between opposite bar centres.
  const coverCap = Math.max(5, (sizeMm - 2 * tieDiaMm - barDiaMm - 20) / 2);
  const coverMm = Math.min(lim(pos(c.coverMm, 40), 10, 100), coverCap);

  const bars = lim(Math.round(pos(c.bars, 4)), 4, 24);
  const heightMm = lim(pos(c.heightM, 0.6) * 1000, 150, 12000);
  const tieSpMm = lim(pos(c.tieSpacingMm, 150), 25, 600);
  const tieSpEndMm = lim(pos(c.tieSpacingEndMm, Math.max(75, tieSpMm / 2)), 25, 600);
  const lapMm = lim(nonNeg(c.lapMm, 0), 0, 6000);
  const starterMm = lim(nonNeg(c.starterProjectionMm, 0), 0, 6000);

  const anch = c.anchorage;
  const ldCompMm = anch && Number.isFinite(anch.ldCompMm) ? anch.ldCompMm : 0;
  const ldCompMult = anch && Number.isFinite(anch.ldCompMultiple) ? anch.ldCompMultiple : 0;
  // The TIE's 135° hook is sized off the tie's OWN diameter (tieAnchorage), never the vertical bar's —
  // a T8 tie bends to an 80 mm hook regardless of whether the verticals are T16 or T25.
  const tieAnch = c.tieAnchorage;
  const hook135Mm = tieAnch && Number.isFinite(tieAnch.hook135Mm) ? tieAnch.hook135Mm : 0;

  // Confinement zone = one column-depth at each end, but never more than half the column.
  const confineMm = Math.max(0, Math.min(sizeMm, heightMm / 2));
  const midMm = Math.max(0, heightMm - 2 * confineMm);

  const faces = barsPerFace(bars);
  const maxPerFace = 2 + Math.max(faces.top, faces.bottom, faces.left, faces.right);   // + 2 corners
  const clearFaceMm = sizeMm - 2 * coverMm - 2 * tieDiaMm;
  const barGapMm = (clearFaceMm - maxPerFace * barDiaMm) / Math.max(1, maxPerFace - 1);
  const minGapMm = Math.max(25, barDiaMm);
  const gapOk = Number.isFinite(barGapMm) && barGapMm >= minGapMm;

  const barsLabel = `${bars}-T${r0(barDiaMm)} vertical`;
  const tiesLabel = `Ties T${r0(tieDiaMm)} @ ${r0(tieSpMm)} c/c`;
  const coverLabel = `Clear cover ${r0(coverMm)} mm`;

  /* ================================================== (a) CROSS-SECTION geometry */
  const CS = 190;                                    // column drawn 190 px square
  const PADL = 60, PADR = 106, PADT = 52, PADB = 68;
  const W = CS + PADL + PADR;                        // 356
  const H = CS + PADT + PADB;                        // 310
  const s = CS / sizeMm;                             // px per mm
  const px = (mm: number) => mm * s;

  const x0 = PADL, y0 = PADT, x1 = PADL + CS, y1 = PADT + CS;
  const cxS = (x0 + x1) / 2, cyS = (y0 + y1) / 2;

  // TIE — a closed rectangular link drawn on its centreline, one cover in from the face.
  const tieOffMm = coverMm + tieDiaMm / 2;
  const tieXY = px(tieOffMm);
  const tieSpan = Math.max(4, CS - 2 * tieXY);
  const tieW = Math.max(1.2, px(tieDiaMm));
  const tieR = Math.min(px(2 * tieDiaMm), tieSpan / 3);       // bend radius ≈ 2φ, never > 1/3 of the link
  const tieHook = Math.min(14, tieSpan * 0.25);               // the 135° hook tail, drawn into the core

  // VERTICAL BARS — centres one cover + one tie + half a bar in from the face.
  const barOffMm = coverMm + tieDiaMm + barDiaMm / 2;
  const rawL = x0 + px(barOffMm), rawR = x1 - px(barOffMm);
  const degenerate = rawR - rawL < 2;                 // impossible cage → collapse to the centre
  const bL = degenerate ? cxS : rawL;
  const bR = degenerate ? cxS : rawR;
  const bT = degenerate ? cyS : y0 + px(barOffMm);
  const bB = degenerate ? cyS : y1 - px(barOffMm);
  const barR = lim(px(barDiaMm / 2), 2.2, 7);

  const barPts: { x: number; y: number }[] = [
    { x: bL, y: bT }, { x: bR, y: bT }, { x: bR, y: bB }, { x: bL, y: bB },   // the 4 corner bars
  ];
  for (let i = 0; i < faces.top; i++) barPts.push({ x: bL + ((i + 1) / (faces.top + 1)) * (bR - bL), y: bT });
  for (let i = 0; i < faces.bottom; i++) barPts.push({ x: bL + ((i + 1) / (faces.bottom + 1)) * (bR - bL), y: bB });
  for (let i = 0; i < faces.left; i++) barPts.push({ x: bL, y: bT + ((i + 1) / (faces.left + 1)) * (bB - bT) });
  for (let i = 0; i < faces.right; i++) barPts.push({ x: bR, y: bT + ((i + 1) / (faces.right + 1)) * (bB - bT) });

  /* ==================================================== (b) ELEVATION geometry */
  const EB = 330;                                    // vertical drawing box (px)
  const EPADT = 32, EPADB = 26, EPADL = 74, EPADR = 128;
  const fbMm = lim(heightMm * 0.3, 120, 400);        // slice of footing shown below the column base
  const aboveMm = Math.max(heightMm, starterMm + 60) + 120;
  const mmTotal = Math.max(1, fbMm + aboveMm);
  const sV = EB / mmTotal;                           // px per mm, vertical (true scale)
  const colPxW = lim(sizeMm * sV, 46, 96);           // width exaggerated when the column is slender
  const sH = colPxW / sizeMm;                        // px per mm, horizontal
  const EW = EPADL + colPxW + EPADR;
  const EH = EB + EPADT + EPADB;

  const yBotBox = EPADT + EB;
  const baseY = yBotBox - fbMm * sV;                 // top of footing = base of column
  const yOf = (mm: number) => baseY - mm * sV;
  const colLx = EPADL, colRx = EPADL + colPxW, cxE = EPADL + colPxW / 2;
  const colTopY = yOf(heightMm);

  const barInsetPx = Math.min((coverMm + tieDiaMm + barDiaMm / 2) * sH, colPxW / 2 - 2);
  const xBarL = colLx + barInsetPx, xBarR = colRx - barInsetPx;
  const tieInsetPx = Math.min((coverMm + tieDiaMm / 2) * sH, colPxW / 2 - 1);
  const tieLx = colLx + tieInsetPx, tieRx = colRx - tieInsetPx;

  // Tie positions up the column: end spacing in the confinement zones, general spacing over the middle.
  const firstMm = Math.min(50, heightMm * 0.05);
  const tieMm: number[] = [];
  const addZone = (from: number, to: number, sp: number) => {
    if (!(sp >= 10) || !(to > from)) return;
    // A very fine spacing would draw hundreds of lines. Thin the DRAWN ties out (never truncate the
    // zone — the ties must reach the top of the column); the true spacing is always annotated.
    const raw = Math.floor((to - from) / sp);
    const step = raw > 120 ? sp * Math.ceil((raw + 1) / 120) : sp;
    const n = Math.floor((to - from) / step);
    for (let i = 0; i <= n; i++) tieMm.push(from + i * step);
  };
  addZone(firstMm, confineMm, tieSpEndMm);                                    // bottom confinement
  addZone(confineMm, heightMm - confineMm, tieSpMm);                          // general / middle
  addZone(Math.max(confineMm, heightMm - confineMm), heightMm - firstMm, tieSpEndMm);   // top confinement
  const tieAt = Array.from(new Set(tieMm.map((v) => Math.round(v))))
    .filter((v) => v >= 0 && v <= heightMm)
    .sort((a, b) => a - b);

  const showMidText = midMm * sV > 26;
  const footL = Math.max(4, colLx - colPxW * 0.9);
  const footR = Math.min(EW - 4, colRx + colPxW * 0.9);

  return (
    <div className="rounded-2xl border bg-white p-4 text-slate-800">
      {/* ------------------------------------------------------------------ header */}
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-200 pb-2">
        <h3 className="text-sm font-bold tracking-wide text-slate-900">COLUMN REINFORCEMENT DETAIL</h3>
        <div className="text-xs text-slate-500">
          {r0(sizeMm)} × {r0(sizeMm)} mm · {barsLabel} · T{r0(tieDiaMm)} @ {r0(tieSpMm)} c/c ({r0(tieSpEndMm)} c/c at ends) ·
          cover {r0(coverMm)} mm · {rebar.concreteGrade} / {rebar.steelGrade}
        </div>
        <div className="text-[10px] text-slate-400">Schematic reference — NOT a stamped structural drawing</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ============================================= (a) CROSS-SECTION ========= */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 p-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" style={{ minWidth: 300 }}>
            <defs>
              <pattern id="colRcHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="7" stroke={COL.concreteStroke} strokeWidth="0.4" opacity="0.28" />
              </pattern>
            </defs>

            <text x={W / 2} y={14} textAnchor="middle" fontSize={10} fontWeight={700} fill={COL.ink} letterSpacing={0.7}>
              COLUMN CROSS-SECTION (PLAN CUT)
            </text>

            {/* concrete */}
            <rect x={x0} y={y0} width={CS} height={CS} fill={COL.concrete} stroke={COL.concreteStroke} strokeWidth={1.6} />
            <rect x={x0} y={y0} width={CS} height={CS} fill="url(#colRcHatch)" stroke="none" />

            {/* the closed rectangular tie, just inside the cover */}
            <rect
              x={x0 + tieXY} y={y0 + tieXY} width={tieSpan} height={tieSpan} rx={tieR} ry={tieR}
              fill="none" stroke={COL.tie} strokeWidth={tieW} strokeLinejoin="round"
            />
            {/* the 135° hook of the closed link — the tail turned diagonally into the core */}
            <path
              d={`M ${x0 + tieXY} ${y0 + tieXY} L ${x0 + tieXY + tieHook} ${y0 + tieXY + tieHook}`}
              fill="none" stroke={COL.tie} strokeWidth={Math.max(1, tieW * 0.85)} strokeLinecap="round"
            />

            {/* the vertical bars — 4 corners + the balance spread evenly along the four faces */}
            {barPts.map((p, i) => (
              <circle key={`vb${i}`} cx={p.x} cy={p.y} r={barR} fill={COL.bar} stroke="#7f1d1d" strokeWidth={0.5} />
            ))}

            {/* ---- overall dims ---- */}
            <g stroke={COL.dim} strokeWidth={0.9} fill="none">
              <line x1={x0} y1={y0 - 22} x2={x1} y2={y0 - 22} />
              <line x1={x0} y1={y0 - 26} x2={x0} y2={y0 - 18} />
              <line x1={x1} y1={y0 - 26} x2={x1} y2={y0 - 18} />
              <line x1={x0 - 30} y1={y0} x2={x0 - 30} y2={y1} />
              <line x1={x0 - 34} y1={y0} x2={x0 - 26} y2={y0} />
              <line x1={x0 - 34} y1={y1} x2={x0 - 26} y2={y1} />
            </g>
            <text x={cxS} y={y0 - 26} textAnchor="middle" fontSize={9} fontWeight={700} fill={COL.dim}>
              {r0(sizeMm)} mm
            </text>
            <text
              x={x0 - 34} y={cyS} textAnchor="middle" fontSize={9} fontWeight={700} fill={COL.dim}
              transform={`rotate(-90 ${x0 - 34} ${cyS})`}
            >
              {r0(sizeMm)} mm
            </text>

            {/* ---- clear COVER dimensioned on the left face, projected below ---- */}
            <g stroke={COL.dim} strokeWidth={0.7}>
              <line x1={x0} y1={y1} x2={x0} y2={y1 + 20} strokeDasharray="2 2" />
              <line x1={x0 + px(coverMm)} y1={y1} x2={x0 + px(coverMm)} y2={y1 + 20} strokeDasharray="2 2" />
              <line x1={x0} y1={y1 + 16} x2={x0 + px(coverMm)} y2={y1 + 16} strokeWidth={0.9} />
              <line x1={x0} y1={y1 + 13} x2={x0} y2={y1 + 19} strokeWidth={0.9} />
              <line x1={x0 + px(coverMm)} y1={y1 + 13} x2={x0 + px(coverMm)} y2={y1 + 19} strokeWidth={0.9} />
            </g>
            <text x={x0 + px(coverMm) + 6} y={y1 + 19} fontSize={8} fontWeight={700} fill={COL.dim}>
              {coverLabel}
            </text>
            <text x={cxS} y={y1 + 38} textAnchor="middle" fontSize={7.5} fill={COL.note}>
              core {r0(Math.max(0, sizeMm - 2 * coverMm))} × {r0(Math.max(0, sizeMm - 2 * coverMm))} mm (out-to-out of tie)
            </text>

            {/* ---- leader: vertical bars ---- */}
            <g stroke={COL.bar} strokeWidth={0.8} fill="none">
              <path d={`M ${bR} ${bT} L ${x1 + 12} ${y0 + 16} L ${x1 + 24} ${y0 + 16}`} />
            </g>
            <circle cx={bR} cy={bT} r={barR + 2.4} fill="none" stroke={COL.bar} strokeWidth={0.7} />
            <text x={x1 + 27} y={y0 + 19} fontSize={8} fontWeight={700} fill={COL.bar}>
              {barsLabel}
            </text>
            <text x={x1 + 27} y={y0 + 30} fontSize={7} fill={COL.note}>
              4 corner + {Math.max(0, bars - 4)} face bars
            </text>

            {/* ---- leader: ties ---- */}
            <g stroke={COL.tie} strokeWidth={0.8} fill="none">
              <path d={`M ${x0 + tieXY + tieSpan} ${cyS} L ${x1 + 12} ${cyS} L ${x1 + 24} ${cyS}`} />
            </g>
            <text x={x1 + 27} y={cyS - 2} fontSize={8} fontWeight={700} fill={COL.tie}>
              {tiesLabel}
            </text>
            <text x={x1 + 27} y={cyS + 9} fontSize={7} fill={COL.note}>
              {r0(tieSpEndMm)} c/c at ends
            </text>
            <text x={x1 + 27} y={cyS + 19} fontSize={7} fill={COL.note}>
              135° hook {r0(hook135Mm)} mm
            </text>
          </svg>
        </div>

        {/* ============================================= (b) ELEVATION ============= */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 p-2">
          <svg viewBox={`0 0 ${EW} ${EH}`} className="h-auto w-full" style={{ minWidth: 300 }}>
            <text x={EW / 2} y={16} textAnchor="middle" fontSize={10} fontWeight={700} fill={COL.ink} letterSpacing={0.7}>
              COLUMN ELEVATION — TIE SPACING ZONES
            </text>

            {/* footing below the column base */}
            <rect x={footL} y={baseY} width={Math.max(8, footR - footL)} height={Math.max(2, yBotBox - baseY)}
              fill={COL.footing} stroke={COL.concreteStroke} strokeWidth={1.2} />
            <text x={footL + 3} y={yBotBox - 5} fontSize={7} fill={COL.note}>footing / pedestal base</text>
            <line x1={4} y1={baseY} x2={EW - 4} y2={baseY} stroke={COL.concreteStroke} strokeWidth={0.7} strokeDasharray="5 3" />

            {/* the column shaft */}
            <rect x={colLx} y={colTopY} width={colPxW} height={Math.max(2, baseY - colTopY)}
              fill={COL.concrete} stroke={COL.concreteStroke} strokeWidth={1.5} />

            {/* confinement zones shaded */}
            {confineMm > 0 && (
              <>
                <rect x={colLx} y={yOf(confineMm)} width={colPxW} height={Math.max(0, confineMm * sV)}
                  fill={COL.zone} fillOpacity={0.12} stroke={COL.zone} strokeWidth={0.6} strokeDasharray="3 2" />
                <rect x={colLx} y={colTopY} width={colPxW} height={Math.max(0, confineMm * sV)}
                  fill={COL.zone} fillOpacity={0.12} stroke={COL.zone} strokeWidth={0.6} strokeDasharray="3 2" />
              </>
            )}

            {/* the compression LAP zone on the bars, just above the footing */}
            {lapMm > 0 && (
              <rect x={xBarL - 3} y={yOf(lapMm)} width={Math.max(4, xBarR - xBarL + 6)} height={Math.max(0, lapMm * sV)}
                fill={COL.lap} fillOpacity={0.14} stroke={COL.lap} strokeWidth={0.7} strokeDasharray="3 2" />
            )}

            {/* TIES */}
            {tieAt.map((mm, i) => (
              <line key={`t${i}`} x1={tieLx} y1={yOf(mm)} x2={tieRx} y2={yOf(mm)}
                stroke={COL.tie} strokeWidth={1.3} strokeLinecap="round" />
            ))}

            {/* STARTER / DOWEL bars out of the footing, with the 90° kicker at the foot */}
            <g stroke={COL.starter} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={`M ${xBarL - 3 + 9} ${yBotBox - 6} L ${xBarL - 3} ${yBotBox - 6} L ${xBarL - 3} ${yOf(starterMm)}`} />
              <path d={`M ${xBarR + 3 - 9} ${yBotBox - 6} L ${xBarR + 3} ${yBotBox - 6} L ${xBarR + 3} ${yOf(starterMm)}`} />
            </g>

            {/* COLUMN VERTICALS — base to top, continuing dashed into the next lift */}
            <g stroke={COL.bar} strokeWidth={2} strokeLinecap="round">
              <line x1={xBarL} y1={baseY} x2={xBarL} y2={colTopY} />
              <line x1={xBarR} y1={baseY} x2={xBarR} y2={colTopY} />
              <line x1={xBarL} y1={colTopY} x2={xBarL} y2={Math.max(EPADT + 6, yOf(heightMm + 90))} strokeDasharray="4 3" strokeWidth={1.4} />
              <line x1={xBarR} y1={colTopY} x2={xBarR} y2={Math.max(EPADT + 6, yOf(heightMm + 90))} strokeDasharray="4 3" strokeWidth={1.4} />
            </g>
            <text x={cxE} y={Math.max(EPADT + 4, yOf(heightMm + 90)) - 3} textAnchor="middle" fontSize={7} fill={COL.note}>
              continues into next lift
            </text>

            {/* ---- dims: confinement zones + middle zone ---- */}
            {confineMm > 0 && (
              <>
                <DimV x={EPADL - 16} y1={baseY} y2={yOf(confineMm)} label={`${r0(confineMm)}`} />
                <DimV x={EPADL - 16} y1={colTopY} y2={yOf(heightMm - confineMm)} label={`${r0(confineMm)}`} />
              </>
            )}
            {midMm > 0 && (
              <DimV x={EPADL - 16} y1={yOf(confineMm)} y2={yOf(heightMm - confineMm)} label={`${r0(midMm)}`} />
            )}

            {/* ---- dim: overall column height ---- */}
            <DimV x={EPADL - 54} y1={baseY} y2={colTopY} label={`${r0(heightMm)}`} />

            {/* ---- dim: compression lap, on the column centreline ---- */}
            {lapMm > 0 && (
              <g>
                <line x1={cxE} y1={baseY} x2={cxE} y2={yOf(lapMm)} stroke={COL.lap} strokeWidth={0.9} />
                <line x1={cxE - 3} y1={baseY} x2={cxE + 3} y2={baseY} stroke={COL.lap} strokeWidth={0.9} />
                <line x1={cxE - 3} y1={yOf(lapMm)} x2={cxE + 3} y2={yOf(lapMm)} stroke={COL.lap} strokeWidth={0.9} />
                <text
                  x={cxE - 4} y={(baseY + yOf(lapMm)) / 2} textAnchor="middle" fontSize={7} fontWeight={700} fill={COL.lap}
                  transform={`rotate(-90 ${cxE - 4} ${(baseY + yOf(lapMm)) / 2})`}
                >
                  lap {r0(lapMm)}
                </text>
              </g>
            )}

            {/* ---- dim: starter / dowel projection ---- */}
            {starterMm > 0 && (
              <g>
                <line x1={colRx + 14} y1={baseY} x2={colRx + 14} y2={yOf(starterMm)} stroke={COL.starter} strokeWidth={0.9} />
                <line x1={colRx + 11} y1={baseY} x2={colRx + 17} y2={baseY} stroke={COL.starter} strokeWidth={0.9} />
                <line x1={colRx + 11} y1={yOf(starterMm)} x2={colRx + 17} y2={yOf(starterMm)} stroke={COL.starter} strokeWidth={0.9} />
                <text
                  x={colRx + 10} y={(baseY + yOf(starterMm)) / 2} textAnchor="middle" fontSize={7} fontWeight={700} fill={COL.starter}
                  transform={`rotate(-90 ${colRx + 10} ${(baseY + yOf(starterMm)) / 2})`}
                >
                  starter {r0(starterMm)}
                </text>
              </g>
            )}

            {/* ---- tie spacing annotations ---- */}
            {confineMm > 0 && (
              <>
                <text x={colRx + 30} y={yOf(confineMm / 2)} fontSize={7.5} fontWeight={700} fill={COL.tie}>
                  T{r0(tieDiaMm)} @ {r0(tieSpEndMm)} c/c
                </text>
                <text x={colRx + 30} y={yOf(confineMm / 2) + 9} fontSize={6.8} fill={COL.note}>
                  confinement zone {r0(confineMm)} mm
                </text>
                <text x={colRx + 30} y={yOf(heightMm - confineMm / 2)} fontSize={7.5} fontWeight={700} fill={COL.tie}>
                  T{r0(tieDiaMm)} @ {r0(tieSpEndMm)} c/c
                </text>
                <text x={colRx + 30} y={yOf(heightMm - confineMm / 2) + 9} fontSize={6.8} fill={COL.note}>
                  confinement zone {r0(confineMm)} mm
                </text>
              </>
            )}
            {showMidText && (
              <>
                <text x={colRx + 30} y={yOf(heightMm / 2)} fontSize={7.5} fontWeight={700} fill={COL.tie}>
                  T{r0(tieDiaMm)} @ {r0(tieSpMm)} c/c
                </text>
                <text x={colRx + 30} y={yOf(heightMm / 2) + 9} fontSize={6.8} fill={COL.note}>
                  general zone {r0(midMm)} mm
                </text>
              </>
            )}
          </svg>
        </div>
      </div>

      {/* ------------------------------------------------------------------ legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <Chip color={COL.bar} label="Vertical bars" />
        <Chip color={COL.tie} label="Ties / closed links" />
        <Chip color={COL.starter} label="Starter (dowel) bars + lap" />
        <Chip color={COL.zone} label="Confinement zone" />
      </div>

      {/* ------------------------------------------------------------- spec table */}
      <div className="mt-3 grid gap-x-6 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] sm:grid-cols-2 lg:grid-cols-3">
        <Row k="Column size" v={`${r0(sizeMm)} × ${r0(sizeMm)} mm`} strong />
        <Row k="Column height" v={`${r0(heightMm)} mm`} />
        <Row k="Vertical bars" v={`${bars} nos. T${r0(barDiaMm)}`} strong />
        <Row k="Ties" v={`T${r0(tieDiaMm)} @ ${r0(tieSpMm)} c/c`} />
        <Row k="Ties — confinement zone" v={`${r0(tieSpEndMm)} c/c over ${r0(confineMm)} mm each end`} />
        <Row k="Clear cover" v={`${r0(coverMm)} mm`} strong />
        <Row k="Compression lap" v={`${r0(lapMm)} mm = ${barDiaMm > 0 ? Math.round(lapMm / barDiaMm) : 0}φ`} strong />
        <Row k="Ld (compression)" v={`${r0(ldCompMm)} mm = ${ldCompMult}φ`} />
        <Row k="Starter / dowel projection" v={`${r0(starterMm)} mm above footing`} />
        <Row k="Tie hook (135°)" v={`${r0(hook135Mm)} mm`} />
        <Row k="Concrete grade" v={rebar.concreteGrade} />
        <Row k="Steel grade" v={rebar.steelGrade} />
        <div className="flex justify-between gap-2 border-b border-slate-200/70 py-0.5">
          <span className="text-slate-500">Clear gap between bars</span>
          <span className={`font-bold ${gapOk ? "text-emerald-700" : "text-red-700"}`}>
            {Number.isFinite(barGapMm) ? r0(barGapMm) : 0} mm {gapOk ? "≥" : "<"} {r0(minGapMm)} mm min
          </span>
        </div>
      </div>

      {!gapOk && (
        <p className="mt-2 text-[11px] font-semibold text-red-700">
          {bars}-T{r0(barDiaMm)} will not fit on a {r0(sizeMm)} mm column face at {r0(coverMm)} mm cover
          (clear gap {Number.isFinite(barGapMm) ? r0(barGapMm) : 0} mm &lt; {r0(minGapMm)} mm). Increase the
          pedestal size, reduce the bar count, or use a smaller bar diameter in the Civil tab.
        </p>
      )}

      <p className="mt-2 text-[10px] leading-snug text-slate-500">
        Ties are closed rectangular links with 135° hooks turned into the core (IS 456:2000 Cl. 26.5.3.2);
        the spacing is reduced to {r0(tieSpEndMm)} mm c/c over one column depth ({r0(confineMm)} mm) at each end.
        Compression lap ≥ Ld(comp) or 24φ per Cl. 26.2.5.1 — starter bars are cast into the footing, hooked onto
        the bottom mesh, and lapped with the column verticals above the footing. Laps must be staggered: do not
        splice more than 50% of the bars at one section. Confirm bar sizes and loads with a structural engineer.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------- sub-parts */

function DimV({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) {
  const a = Math.min(y1, y2), b = Math.max(y1, y2);
  return (
    <g>
      <line x1={x} y1={a} x2={x} y2={b} stroke={COL.dim} strokeWidth={0.8} />
      <line x1={x - 3} y1={a} x2={x + 3} y2={a} stroke={COL.dim} strokeWidth={0.8} />
      <line x1={x - 3} y1={b} x2={x + 3} y2={b} stroke={COL.dim} strokeWidth={0.8} />
      <text x={x - 5} y={(a + b) / 2 + 2.5} textAnchor="end" fontSize={7.2} fill={COL.dim}>{label}</text>
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

function Chip({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-0.5 w-4" style={{ background: color }} />
      {label}
    </span>
  );
}
