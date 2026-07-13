"use client";

import type { RebarDesign } from "@/lib/quotation/labourColonyRebar";
import type { BeamScheduleRow } from "@/lib/quotation/labourColonyPlan";

/**
 * PLINTH-BEAM CROSS-SECTIONS + STIRRUP-SPACING ELEVATION.
 *
 * A beam layout that only says "PB1 / PB2" is not buildable. This detail draws, for EVERY mark in
 * the beam schedule, the actual cut section a bar-bender works from:
 *
 *   • the beam outline (width × depth) with the clear cover dimensioned on both faces
 *   • the CLOSED rectangular stirrup sitting just inside the cover
 *   • the TOP and BOTTOM bars as they are really placed — evenly spaced across the stirrup, in the
 *     counts the SCHEDULE gives. PB1 (peripheral, more heavily loaded) legitimately carries one bar
 *     more than PB2, and the section shows that difference instead of averaging it away.
 *
 * Then ONE longitudinal elevation of a typical span showing where the stirrups tighten up:
 *   • support (shear) zones at the closer spacing, midspan at the nominal spacing
 *   • top-bar curtailment at Ld from the support face
 *   • bottom-bar anchorage carried INTO the support with a 90° bend up
 *
 * Bar counts are parsed from the schedule row ("4-T16"); if a row is malformed the section falls
 * back to the rebar design so a section is always drawn rather than a broken one.
 *
 * Schematic reference — NOT a stamped structural drawing.
 */

const COL = {
  concrete: "#e2e8f0",
  concreteStroke: "#334155",
  column: "#cbd5e1",
  stirrup: "#059669",
  rebarTop: "#dc2626",
  rebarBot: "#1d4ed8",
  curtail: "#b45309",
  zoneSupport: "#f59e0b",
  zoneMid: "#0ea5e9",
  dim: "#334155",
  ink: "#0f172a",
  note: "#64748b",
  hair: "#94a3b8",
};

/** The schedule's bar text: "4-T16" → { count: 4, dia: 16 }. Anything else falls back to the design. */
const BAR_RE = /^(\d+)-T(\d+)$/;

interface BarSpec {
  count: number;
  dia: number;
  /** True when the text did not parse and the rebar design was used instead. */
  fallback: boolean;
}

/** Finite, integral, clamped — nothing that reaches an SVG coordinate may be NaN. */
function intIn(v: number, lo: number, hi: number, fb: number): number {
  const n = Math.round(Number.isFinite(v) ? v : fb);
  return Math.min(Math.max(Number.isFinite(n) ? n : fb, lo), hi);
}

function num(v: number, lo: number, hi: number, fb: number): number {
  const n = Number.isFinite(v) ? v : fb;
  return Math.min(Math.max(n, lo), hi);
}

function parseBars(text: string | undefined, fbCount: number, fbDia: number): BarSpec {
  const m = typeof text === "string" ? BAR_RE.exec(text.trim()) : null;
  if (!m) return { count: intIn(fbCount, 2, 12, 2), dia: intIn(fbDia, 6, 40, 16), fallback: true };
  return {
    count: intIn(Number.parseInt(m[1], 10), 1, 12, intIn(fbCount, 2, 12, 2)),
    dia: intIn(Number.parseInt(m[2], 10), 6, 40, intIn(fbDia, 6, 40, 16)),
    fallback: false,
  };
}

export function BeamSectionDetail({ rebar, schedule }: { rebar: RebarDesign; schedule: BeamScheduleRow[] }) {
  const beam = rebar.beam;
  const rows: BeamScheduleRow[] = Array.isArray(schedule) ? schedule : [];

  /* ---- graceful placeholder: some foundation types carry no plinth beam at all ---- */
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-4 text-slate-800">
        <Header beam={beam} meta="no plinth beam in this foundation" />
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-xs font-semibold text-slate-600">
            No plinth beam for this foundation type — no beam sections to detail.
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Choose a foundation with a plinth beam (e.g. RCC isolated footing / pedestal) in the Civil tab and the
            PB1 / PB2 cross-sections, stirrup-spacing elevation and beam schedule will be drawn here.
          </p>
        </div>
      </div>
    );
  }

  const widthMm = intIn(beam.widthMm, 100, 1000, 230);
  const depthMm = intIn(beam.depthMm, 100, 1500, 300);
  const coverMm = intIn(beam.coverMm, 15, 75, 40);
  const stirrupDiaMm = intIn(beam.stirrupDiaMm, 6, 16, 8);

  const totalRunM = rows.reduce(
    (s, r) => s + Math.max(0, Number.isFinite(r.lengthM) ? r.lengthM : 0) * Math.max(0, Math.round(r.count || 0)),
    0,
  );

  return (
    <div className="rounded-2xl border bg-white p-4 text-slate-800">
      <Header
        beam={beam}
        meta={`${widthMm} × ${depthMm} mm · ${rebar.concreteGrade} · ${rebar.steelGrade} · ${rows.length} beam mark${rows.length > 1 ? "s" : ""}`}
      />

      {/* ================= CROSS-SECTIONS — one per beam mark ================= */}
      <div className="mb-1 text-[11px] font-bold tracking-wide text-slate-900">BEAM CROSS-SECTIONS</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <CrossSection
            key={row.mark}
            row={row}
            widthMm={widthMm}
            depthMm={depthMm}
            coverMm={coverMm}
            stirrupDiaMm={stirrupDiaMm}
            fbTop={beam.topBars}
            fbBottom={beam.bottomBars}
            fbDia={beam.mainBarDiaMm}
            stirrupSpacingMm={beam.stirrupSpacingMm}
            stirrupSpacingSupportMm={beam.stirrupSpacingSupportMm}
          />
        ))}
      </div>

      {/* ================= LONGITUDINAL STIRRUP SPACING ================= */}
      <div className="mb-1 mt-5 text-[11px] font-bold tracking-wide text-slate-900">
        STIRRUP SPACING — TYPICAL SPAN (ELEVATION)
      </div>
      <StirrupElevation
        rebar={rebar}
        widthMm={widthMm}
        depthMm={depthMm}
        coverMm={coverMm}
        stirrupDiaMm={stirrupDiaMm}
      />

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
        <Chip color={COL.rebarTop} label="Top steel (tension over supports)" />
        <Chip color={COL.rebarBot} label="Bottom steel (tension at midspan)" />
        <Chip color={COL.stirrup} label="Closed stirrup + 135° hooks" />
        <Chip color={COL.curtail} label="Curtailment / anchorage zone" />
      </div>

      {/* ================= SCHEDULE ================= */}
      <div className="mb-1 mt-5 text-[11px] font-bold tracking-wide text-slate-900">PLINTH BEAM SCHEDULE</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[10.5px]">
          <thead>
            <tr className="bg-slate-100 text-left text-slate-700">
              {["Mark", "Size (mm)", "Grade", "Top bars", "Bottom bars", "Stirrups", "Length (m)", "Nos"].map((h) => (
                <th key={h} className="border border-slate-300 px-1.5 py-1 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.mark}>
                <td className="border border-slate-300 px-1.5 py-1 font-bold text-red-700">{r.mark}</td>
                <td className="border border-slate-300 px-1.5 py-1">{r.size}</td>
                <td className="border border-slate-300 px-1.5 py-1">{r.grade}</td>
                <td className="border border-slate-300 px-1.5 py-1">{r.topBars}</td>
                <td className="border border-slate-300 px-1.5 py-1">{r.bottomBars}</td>
                <td className="border border-slate-300 px-1.5 py-1">{r.stirrups}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right">{r.lengthM}</td>
                <td className="border border-slate-300 px-1.5 py-1 text-right font-semibold">{r.count}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td colSpan={6} className="border border-slate-300 px-1.5 py-1 text-right font-semibold">
                Total plinth-beam run (Σ length × nos)
              </td>
              <td colSpan={2} className="border border-slate-300 px-1.5 py-1 text-right font-bold">
                {Math.round(totalRunM * 10) / 10} m
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-2 text-[10px] leading-snug text-slate-500">
        Stirrups are closed rectangular links with 135° hooks ({rebar.beam.anchorage.hook135Mm} mm hook allowance,
        IS 2502). Cover {coverMm} mm to the stirrup on every face. Top and bottom bars are shown in ONE layer —
        if the schedule bars will not fit in the beam width the detailing warns and the beam must be widened or a
        second layer detailed. Bar counts above are read from the beam schedule, so PB1 (peripheral) carries the
        extra bar the schedule gives it.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------- header */

function Header({ beam, meta }: { beam: RebarDesign["beam"]; meta: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-300 pb-2">
      <h3 className="text-sm font-bold tracking-wide text-slate-900">
        PLINTH BEAM SECTIONS &amp; STIRRUP SPACING
      </h3>
      <div className="text-xs text-slate-500">{meta}</div>
      <div className="text-[10px] text-slate-400">
        Schematic reference — NOT a stamped structural drawing · {beam.stirrupText}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- one beam cross-section */

function CrossSection(props: {
  row: BeamScheduleRow;
  widthMm: number;
  depthMm: number;
  coverMm: number;
  stirrupDiaMm: number;
  fbTop: number;
  fbBottom: number;
  fbDia: number;
  stirrupSpacingMm: number;
  stirrupSpacingSupportMm: number;
}) {
  const { row, widthMm, depthMm, coverMm, stirrupDiaMm } = props;
  const top = parseBars(row.topBars, props.fbTop, props.fbDia);
  const bot = parseBars(row.bottomBars, props.fbBottom, props.fbDia);

  /* ---- drawing box ---- */
  const W = 230, H = 250;
  const PADX = 62, PADT = 44, PADB = 46;
  const boxW = W - PADX * 2;                       // usable px for the beam width
  const boxH = H - PADT - PADB;                    // usable px for the beam depth
  // one scale both ways so the section is proportionate; both mm values are clamped > 0 above
  const S = Math.min(boxW / widthMm, boxH / depthMm);
  const p = (mm: number) => mm * S;

  const bw = p(widthMm), bd = p(depthMm);
  const x0 = PADX + (boxW - bw) / 2;               // beam left edge
  const y0 = PADT + (boxH - bd) / 2;               // beam top edge
  const x1 = x0 + bw, y1 = y0 + bd;

  const cvr = p(coverMm);
  // the closed stirrup: its OUTER face sits on the cover line
  const sx0 = x0 + cvr, sy0 = y0 + cvr;
  const sx1 = x1 - cvr, sy1 = y1 - cvr;
  const stirW = Math.max(2, sx1 - sx0);
  const stirD = Math.max(2, sy1 - sy0);
  const stirPx = Math.max(0.9, p(stirrupDiaMm));

  // bar centres sit inside the stirrup: cover + stirrup dia + half a main bar
  const inset = (dia: number) => p(coverMm + stirrupDiaMm + dia / 2);
  const barR = (dia: number) => Math.max(1.8, p(dia) / 2);

  /** Evenly spaced bar centres across the stirrup, never NaN even on a degenerate width. */
  const xsFor = (n: number, dia: number): number[] => {
    const count = Math.max(1, Math.min(12, Math.round(n)));
    const a = x0 + inset(dia);
    const b = x1 - inset(dia);
    if (count === 1 || !(b > a)) return Array.from({ length: count }, () => (x0 + x1) / 2);
    return Array.from({ length: count }, (_, i) => a + (i * (b - a)) / (count - 1));
  };

  const yTopBar = y0 + inset(top.dia);
  const yBotBar = y1 - inset(bot.dia);

  const sizeText = `${widthMm} × ${depthMm}`;
  const parsedFallback = top.fallback || bot.fallback;

  return (
    <div className="rounded-lg border border-slate-200 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" style={{ minWidth: 190 }}>
        <text x={W / 2} y={15} textAnchor="middle" fontSize={10} fontWeight={700} fill={COL.ink} letterSpacing={0.6}>
          {row.mark} — SECTION
        </text>
        <text x={W / 2} y={27} textAnchor="middle" fontSize={8} fill={COL.note}>
          {sizeText} mm · {row.grade}
        </text>

        {/* ---- concrete outline ---- */}
        <rect x={x0} y={y0} width={bw} height={bd} fill={COL.concrete} stroke={COL.concreteStroke} strokeWidth={1.6} />

        {/* ---- closed rectangular stirrup, just inside the cover ---- */}
        <rect x={sx0} y={sy0} width={stirW} height={stirD} rx={Math.min(4, stirPx * 2)}
          fill="none" stroke={COL.stirrup} strokeWidth={Math.max(1.2, stirPx)} />
        {/* the 135° hooks, turned into the core at the top-left corner */}
        <path
          d={`M ${sx0 + stirW * 0.16} ${sy0} L ${sx0 + 3} ${sy0} M ${sx0} ${sy0 + stirD * 0.14} L ${sx0} ${sy0 + 3}`}
          fill="none" stroke={COL.stirrup} strokeWidth={Math.max(1, stirPx * 0.9)} strokeLinecap="round"
        />
        <path
          d={`M ${sx0 + 2} ${sy0 + 2} l ${Math.max(5, stirD * 0.10)} ${Math.max(5, stirD * 0.10)}`}
          fill="none" stroke={COL.stirrup} strokeWidth={Math.max(1, stirPx * 0.9)} strokeLinecap="round"
        />

        {/* ---- TOP bars ---- */}
        {xsFor(top.count, top.dia).map((cx, i) => (
          <circle key={`t${i}`} cx={cx} cy={yTopBar} r={barR(top.dia)} fill={COL.rebarTop} stroke="#ffffff" strokeWidth={0.5} />
        ))}
        {/* ---- BOTTOM bars ---- */}
        {xsFor(bot.count, bot.dia).map((cx, i) => (
          <circle key={`b${i}`} cx={cx} cy={yBotBar} r={barR(bot.dia)} fill={COL.rebarBot} stroke="#ffffff" strokeWidth={0.5} />
        ))}

        {/* ---- leaders ---- */}
        <line x1={x1} y1={yTopBar} x2={x1 + 10} y2={y0 - 8} stroke={COL.rebarTop} strokeWidth={0.7} />
        <text x={x1 + 11} y={y0 - 10} fontSize={7.8} fontWeight={700} fill={COL.rebarTop} textAnchor="end">
          {top.count}-T{top.dia} top
        </text>
        <line x1={x1} y1={yBotBar} x2={x1 + 10} y2={y1 + 12} stroke={COL.rebarBot} strokeWidth={0.7} />
        <text x={x1 + 11} y={y1 + 15} fontSize={7.8} fontWeight={700} fill={COL.rebarBot} textAnchor="end">
          {bot.count}-T{bot.dia} bottom
        </text>
        <line x1={sx0} y1={sy0 + stirD / 2} x2={x0 - 12} y2={sy0 + stirD / 2} stroke={COL.stirrup} strokeWidth={0.7} />
        <text x={x0 - 13} y={sy0 + stirD / 2 - 3} fontSize={7.8} fontWeight={700} fill={COL.stirrup} textAnchor="end">
          T{stirrupDiaMm} stirrup
        </text>
        <text x={x0 - 13} y={sy0 + stirD / 2 + 7} fontSize={7} fill={COL.note} textAnchor="end">
          @ {props.stirrupSpacingMm} c/c
        </text>

        {/* ---- cover dimension (top face) ---- */}
        <DimV x={x0 + bw * 0.28} y1={y0} y2={sy0} label={`${props.coverMm}`} />
        <text x={x0 + bw * 0.28 + 4} y={y0 - 3} fontSize={6.8} fill={COL.dim}>clear cover</text>

        {/* ---- width dimension ---- */}
        <DimH x1={x0} x2={x1} y={y1 + 26} label={`${widthMm}`} />
        {/* ---- depth dimension ---- */}
        <DimV x={x1 + 30} y1={y0} y2={y1} label={`${depthMm}`} />

        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={7.2} fill={COL.note}>
          stirrups {props.stirrupSpacingSupportMm} c/c near supports
        </text>
      </svg>
      <p className="mt-1 text-[10px] leading-snug text-slate-500">
        {row.mark} · {row.count} nos × {row.lengthM} m · {row.stirrups}
        {parsedFallback ? " · bar counts taken from the rebar design (schedule text unreadable)" : ""}
      </p>
    </div>
  );
}

/* --------------------------------------- longitudinal stirrup-spacing elevation */

function StirrupElevation(props: {
  rebar: RebarDesign;
  widthMm: number;
  depthMm: number;
  coverMm: number;
  stirrupDiaMm: number;
}) {
  const { rebar, widthMm, depthMm, coverMm } = props;
  const beam = rebar.beam;

  const spNominal = intIn(beam.stirrupSpacingMm, 50, 400, 150);
  const spSupport = intIn(beam.stirrupSpacingSupportMm, 50, 400, 75);
  const colMm = intIn(rebar.column.sizeMm, 150, 2000, 300);
  const anchMm = intIn(beam.anchorageIntoSupportMm, 0, 3000, 300);
  const curtailMm = intIn(beam.curtailFromFaceMm, 0, 4000, 600);

  // The shear (closer-spaced) zone is taken as 2 × the beam depth from each support face.
  const shearZoneMm = 2 * depthMm;

  // A typical span drawn at a span/depth ratio of 12 — the real bay spans are on the beam layout.
  const spanCcMm = num(12 * depthMm, 2400, 6000, 3600);
  const clearMm = Math.max(600, spanCcMm - colMm);
  const totalMm = colMm + clearMm + colMm;

  /* ---- drawing box ---- */
  const W = 860, H = 250;
  const PADX = 46, beamTopY = 96;
  const S = (W - 2 * PADX) / totalMm;              // px per mm — totalMm ≥ 900, always finite
  const p = (mm: number) => mm * S;

  const xLeftColL = PADX;
  const xFaceL = PADX + p(colMm);                  // left support face
  const xFaceR = xFaceL + p(clearMm);              // right support face
  const xRightColR = xFaceR + p(colMm);

  const bd = Math.max(30, p(depthMm));             // keep the beam legible on a long span
  const beamBotY = beamTopY + bd;
  const cvrPx = Math.min(bd / 3, (coverMm / depthMm) * bd);
  const yTop = beamTopY + cvrPx;
  const yBot = beamBotY - cvrPx;

  const colTopY = beamTopY - 26;
  const colBotY = beamBotY + 34;

  // shear zones, clamped so they can never overrun each other on a short span
  const zoneMm = Math.min(shearZoneMm, clearMm / 2);
  const zonePx = p(zoneMm);

  /* ---- stirrup positions, measured from the LEFT support face ---- */
  const stirrupMm: number[] = [];
  {
    let d = Math.min(50, clearMm / 4);
    let guard = 0;
    while (d < clearMm && guard < 400) {
      stirrupMm.push(d);
      const nearSupport = Math.min(d, clearMm - d) <= shearZoneMm;
      d += nearSupport ? spSupport : spNominal;
      guard += 1;
    }
  }

  const curtailPx = p(Math.min(curtailMm, clearMm / 2));
  const anchHMm = Math.min(anchMm, Math.max(0, colMm - coverMm));   // horizontal leg fits in the support
  const anchVMm = Math.max(0, anchMm - anchHMm);                    // balance turned up as a 90° bend
  const anchHPx = p(anchHMm);
  const anchVPx = Math.min(p(anchVMm), bd + 20);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" style={{ minWidth: 560 }}>
        <text x={W / 2} y={15} textAnchor="middle" fontSize={10} fontWeight={700} fill={COL.ink} letterSpacing={0.6}>
          TYPICAL SPAN — STIRRUP SPACING, CURTAILMENT &amp; ANCHORAGE
        </text>
        <text x={W / 2} y={27} textAnchor="middle" fontSize={8} fill={COL.note}>
          plinth beam {widthMm} × {depthMm} mm · {rebar.concreteGrade} · {rebar.steelGrade} · applies to every beam mark
        </text>

        {/* ---- zone bands ---- */}
        <rect x={xFaceL} y={beamTopY - 30} width={zonePx} height={bd + 60} fill={COL.zoneSupport} fillOpacity={0.1} />
        <rect x={xFaceR - zonePx} y={beamTopY - 30} width={zonePx} height={bd + 60} fill={COL.zoneSupport} fillOpacity={0.1} />
        <rect x={xFaceL + zonePx} y={beamTopY - 30} width={Math.max(0, xFaceR - zonePx - (xFaceL + zonePx))}
          height={bd + 60} fill={COL.zoneMid} fillOpacity={0.07} />

        {/* ---- supports (columns) ---- */}
        <rect x={xLeftColL} y={colTopY} width={p(colMm)} height={colBotY - colTopY}
          fill={COL.column} stroke={COL.concreteStroke} strokeWidth={1.3} />
        <rect x={xFaceR} y={colTopY} width={p(colMm)} height={colBotY - colTopY}
          fill={COL.column} stroke={COL.concreteStroke} strokeWidth={1.3} />

        {/* ---- beam ---- */}
        <rect x={xLeftColL} y={beamTopY} width={xRightColR - xLeftColL} height={bd}
          fill={COL.concrete} stroke={COL.concreteStroke} strokeWidth={1.4} />
        {/* re-draw the supports over the beam so the joint reads as monolithic */}
        <rect x={xLeftColL} y={colTopY} width={p(colMm)} height={colBotY - colTopY}
          fill={COL.column} fillOpacity={0.6} stroke={COL.concreteStroke} strokeWidth={1.3} />
        <rect x={xFaceR} y={colTopY} width={p(colMm)} height={colBotY - colTopY}
          fill={COL.column} fillOpacity={0.6} stroke={COL.concreteStroke} strokeWidth={1.3} />

        {/* ---- stirrups ---- */}
        {stirrupMm.map((mm, i) => {
          const x = xFaceL + p(mm);
          return <line key={`s${i}`} x1={x} y1={yTop} x2={x} y2={yBot} stroke={COL.stirrup} strokeWidth={1} />;
        })}

        {/* ---- TOP steel: continuous through, plus the support bars curtailed at Ld from the face ---- */}
        <line x1={xLeftColL + 4} y1={yTop} x2={xRightColR - 4} y2={yTop}
          stroke={COL.rebarTop} strokeWidth={2.2} strokeLinecap="round" />
        <line x1={xLeftColL + 4} y1={yTop + 4} x2={xFaceL + curtailPx} y2={yTop + 4}
          stroke={COL.curtail} strokeWidth={2} strokeLinecap="round" />
        <line x1={xFaceR - curtailPx} y1={yTop + 4} x2={xRightColR - 4} y2={yTop + 4}
          stroke={COL.curtail} strokeWidth={2} strokeLinecap="round" />
        <DimH x1={xFaceL} x2={xFaceL + curtailPx} y={beamTopY - 12} label={`curtail ${curtailMm}`} />
        <DimH x1={xFaceR - curtailPx} x2={xFaceR} y={beamTopY - 12} label={`curtail ${curtailMm}`} />

        {/* ---- BOTTOM steel: continuous, anchored into each support with a 90° bend up ---- */}
        <path
          d={`M ${xFaceL - anchHPx} ${yBot - anchVPx} L ${xFaceL - anchHPx} ${yBot} L ${xFaceR + anchHPx} ${yBot} L ${xFaceR + anchHPx} ${yBot - anchVPx}`}
          fill="none" stroke={COL.rebarBot} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
        />
        <DimH x1={xFaceL - anchHPx} x2={xFaceL} y={beamBotY + 18} label={`anch. ${anchMm}`} />
        <DimH x1={xFaceR} x2={xFaceR + anchHPx} y={beamBotY + 18} label={`anch. ${anchMm}`} />

        {/* ---- spacing dimensions under the beam ---- */}
        <DimH x1={xFaceL} x2={xFaceL + zonePx} y={beamBotY + 40} label={`${Math.round(zoneMm)} — T${props.stirrupDiaMm} @ ${spSupport} c/c`} />
        <DimH x1={xFaceL + zonePx} x2={xFaceR - zonePx} y={beamBotY + 40} label={`midspan — T${props.stirrupDiaMm} @ ${spNominal} c/c`} />
        <DimH x1={xFaceR - zonePx} x2={xFaceR} y={beamBotY + 40} label={`${Math.round(zoneMm)}`} />
        <DimH x1={xFaceL} x2={xFaceR} y={H - 14} label={`clear span between support faces`} />

        {/* ---- support labels ---- */}
        <text x={xLeftColL + p(colMm) / 2} y={colBotY + 12} textAnchor="middle" fontSize={7.4} fill={COL.note}>
          column {colMm} sq
        </text>
        <text x={xFaceR + p(colMm) / 2} y={colBotY + 12} textAnchor="middle" fontSize={7.4} fill={COL.note}>
          column {colMm} sq
        </text>
        <text x={xFaceL + 4} y={beamTopY - 34} fontSize={7.4} fontWeight={700} fill={COL.zoneSupport}>
          shear zone
        </text>
        <text x={(xFaceL + xFaceR) / 2} y={beamTopY - 34} textAnchor="middle" fontSize={7.4} fontWeight={700} fill={COL.zoneMid}>
          midspan zone
        </text>
        <text x={xFaceR - 4} y={beamTopY - 34} textAnchor="end" fontSize={7.4} fontWeight={700} fill={COL.zoneSupport}>
          shear zone
        </text>

        {/* ---- centre line ---- */}
        <line x1={(xFaceL + xFaceR) / 2} y1={beamTopY - 24} x2={(xFaceL + xFaceR) / 2} y2={beamBotY + 8}
          stroke={COL.hair} strokeWidth={0.7} strokeDasharray="6 3 2 3" />
      </svg>

      <p className="mt-1 text-[10px] leading-snug text-slate-500">
        <b>Assumption:</b> the closer-spaced shear zone is taken as <b>2 × the beam depth = {shearZoneMm} mm</b> from
        each support face — stirrups T{props.stirrupDiaMm} @ <b>{spSupport} mm c/c</b> within it and @{" "}
        <b>{spNominal} mm c/c</b> over the balance of the span. Top bars are curtailed at{" "}
        <b>{curtailMm} mm</b> (= Ld, {beam.anchorage.ldMultiple}φ) from the support face; bottom bars are carried{" "}
        <b>{anchMm} mm</b> into the support including the 90° bend up (IS 456 Cl. 26.2.3.3). The span is drawn at a
        span/depth ratio of 12 for proportion only — build to the bay spans on the plinth-beam layout. Shear-zone
        length, stirrup spacing and curtailment must be confirmed against the design shear force by a structural
        engineer.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------- helpers */

function DimH({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  const a = Math.min(x1, x2), b = Math.max(x1, x2);
  return (
    <g>
      <line x1={a} y1={y} x2={b} y2={y} stroke={COL.dim} strokeWidth={0.8} />
      <line x1={a} y1={y - 3} x2={a} y2={y + 3} stroke={COL.dim} strokeWidth={0.8} />
      <line x1={b} y1={y - 3} x2={b} y2={y + 3} stroke={COL.dim} strokeWidth={0.8} />
      <text x={(a + b) / 2} y={y - 4} textAnchor="middle" fontSize={7.2} fill={COL.dim}>{label}</text>
    </g>
  );
}

function DimV({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) {
  const a = Math.min(y1, y2), b = Math.max(y1, y2);
  return (
    <g>
      <line x1={x} y1={a} x2={x} y2={b} stroke={COL.dim} strokeWidth={0.8} />
      <line x1={x - 3} y1={a} x2={x + 3} y2={a} stroke={COL.dim} strokeWidth={0.8} />
      <line x1={x - 3} y1={b} x2={x + 3} y2={b} stroke={COL.dim} strokeWidth={0.8} />
      <text x={x + 5} y={(a + b) / 2 + 2.5} textAnchor="start" fontSize={7.2} fill={COL.dim}>{label}</text>
    </g>
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
