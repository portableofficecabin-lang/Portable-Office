"use client";

import type { RebarDesign } from "@/lib/quotation/labourColonyRebar";

/**
 * BEAM–COLUMN JUNCTION DETAILS — a reinforcement section at every junction type the grid produces:
 *
 *   CORNER (L)    — two beams meet at an end column. Both bottom bars are anchored INTO the column
 *                   with a 90° bend; top bars are hooked down. This is the critical detail.
 *   EDGE   (T)    — a beam runs through and one frames in. Through bars are continuous; the framing
 *                   beam's bottom steel is anchored into the joint.
 *   INTERNAL (+)  — beams continuous both ways. Bottom bars lap NEAR THE SUPPORT (low moment);
 *                   top bars are continuous over the support and curtailed at Ld from the face.
 *
 * Every dimension on these details — Ld, lap, bend, anchorage into the support, stirrup spacing in
 * the shear zone — is derived from the entered bar size, concrete grade and steel grade
 * (IS 456 Cl. 26.2), so changing the grade moves every number here.
 *
 * Schematic reference for quotation / approval — NOT a stamped structural drawing.
 */

const COL = {
  concrete: "#e2e8f0",
  concreteStroke: "#334155",
  column: "#cbd5e1",
  rebarTop: "#dc2626",
  rebarBot: "#1d4ed8",
  stirrup: "#059669",
  dim: "#334155",
  ink: "#0f172a",
  note: "#64748b",
  lap: "#b45309",
};

type Junction = "corner" | "edge" | "internal";

const TITLES: Record<Junction, string> = {
  corner: "CORNER JUNCTION (L)",
  edge: "EDGE JUNCTION (T)",
  internal: "INTERNAL JUNCTION (+)",
};

const BLURB: Record<Junction, string> = {
  corner: "End column. Beam bottom bars anchored into the column with a 90° bend; top bars hooked down.",
  edge: "Beam continuous through; the framing beam's bottom steel is anchored into the joint.",
  internal: "Beams continuous both ways. Bottom bars lapped near the support; top bars continuous over it.",
};

export function BeamJunctionDetail({ rebar }: { rebar: RebarDesign }) {
  const { beam } = rebar;
  const a = beam.anchorage;

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="font-display font-bold text-sm text-slate-800">
          Beam–Column Junction Reinforcement Details
        </div>
        <div className="text-xs text-slate-500">
          {beam.widthMm} × {beam.depthMm} mm · {beam.topText} · {beam.bottomText} · {beam.stirrupText}
        </div>
        <div className="text-[10px] text-slate-400">Not to scale — schematic · confirm with structural engineer</div>
      </div>

      {/* ---- the anchorage set every detail below is dimensioned from ---- */}
      <div className="mb-3 grid gap-x-6 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
        <Row k={`Development length Ld (T${a.diaMm})`} v={`${a.ldMm} mm = ${a.ldMultiple}φ`} strong />
        <Row k="Ld in compression" v={`${a.ldCompMm} mm = ${a.ldCompMultiple}φ`} />
        <Row k="Lap — tension" v={`${a.lapTensionMm} mm`} strong />
        <Row k="Lap — compression" v={`${a.lapCompressionMm} mm`} />
        <Row k="90° bend allowance" v={`${a.bend90Mm} mm = 8φ`} />
        <Row k="Stirrup hook (135°)" v={`${a.hook135Mm} mm`} />
        <Row k="Anchorage into support" v={`${beam.anchorageIntoSupportMm} mm`} strong />
        <Row k="Top steel curtailed at" v={`${beam.curtailFromFaceMm} mm from face`} />
      </div>
      <p className="mb-3 text-[10px] text-slate-500">
        Ld = φ · 0.87 f<sub>y</sub> / (4 τ<sub>bd</sub>) per IS 456:2000 Cl. 26.2.1, with τ<sub>bd</sub> for{" "}
        {rebar.concreteGrade} increased 60% for deformed bars. Laps per Cl. 26.2.5.1 (tension ≥ Ld or 30φ;
        compression ≥ Ld<sub>c</sub> or 24φ). Steel {rebar.steelGrade}. Splices must be staggered — do not lap
        more than 50% of the bars at one section.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        {(["corner", "edge", "internal"] as Junction[]).map((j) => (
          <JunctionSvg key={j} kind={j} rebar={rebar} />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
        <Chip color={COL.rebarTop} label="Top steel (tension over support)" />
        <Chip color={COL.rebarBot} label="Bottom steel (tension at mid-span)" />
        <Chip color={COL.stirrup} label="Stirrups / ties" />
        <Chip color={COL.lap} label="Lap / anchorage zone" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ one junction */

function JunctionSvg({ kind, rebar }: { kind: Junction; rebar: RebarDesign }) {
  const { beam, column } = rebar;
  const a = beam.anchorage;

  const W = 300, H = 230;
  const PAD = 26;

  // mm → px, scaled so the column + a beam run of ~2× Ld fits the box
  const colMm = column.sizeMm;
  const beamDMm = beam.depthMm;
  const runMm = Math.max(a.ldMm * 1.6, colMm * 3);
  const spanMm = colMm + 2 * runMm;
  const S = (W - PAD * 2) / spanMm;                  // px per mm
  const p = (mm: number) => mm * S;

  const cx = W / 2;                                   // column centre-line
  const colL = cx - p(colMm / 2), colR = cx + p(colMm / 2);
  const beamTop = PAD + 44;
  const beamBot = beamTop + p(beamDMm);
  const cover = p(beam.coverMm);
  const yTopBar = beamTop + cover;
  const yBotBar = beamBot - cover;

  const hasLeft = kind !== "corner";                 // the corner has a beam on the right only
  const xL = PAD, xR = W - PAD;

  const lapPx = p(a.lapTensionMm);
  const anchPx = p(beam.anchorageIntoSupportMm);
  const bendPx = p(a.bend90Mm);

  // stirrups: closer within the shear zone (2 × beam depth from the support face)
  const shearZoneMm = 2 * beamDMm;
  const stirrups: number[] = [];
  const pushStirrups = (fromX: number, toX: number, dir: 1 | -1) => {
    const faceMm = 0;
    let mm = faceMm + 50;
    const limitPx = Math.abs(toX - fromX);
    while (p(mm) < limitPx) {
      stirrups.push(fromX + dir * p(mm));
      mm += mm < shearZoneMm ? beam.stirrupSpacingSupportMm : beam.stirrupSpacingMm;
    }
  };
  pushStirrups(colR, xR, 1);
  if (hasLeft) pushStirrups(colL, xL, -1);

  return (
    <div className="rounded-lg border border-slate-200 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minWidth: 260 }}>
        <text x={W / 2} y={14} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={COL.ink} letterSpacing={0.6}>
          {TITLES[kind]}
        </text>

        {/* ---- column (full height) ---- */}
        <rect x={colL} y={PAD + 20} width={colR - colL} height={H - PAD - 40} fill={COL.column} stroke={COL.concreteStroke} strokeWidth={1.3} />

        {/* ---- beam(s) ---- */}
        <rect x={hasLeft ? xL : colL} y={beamTop} width={(hasLeft ? xR - xL : xR - colL)} height={beamBot - beamTop}
          fill={COL.concrete} stroke={COL.concreteStroke} strokeWidth={1.3} />
        {/* redraw the column over the beam so the joint reads as monolithic */}
        <rect x={colL} y={PAD + 20} width={colR - colL} height={H - PAD - 40} fill={COL.column} fillOpacity={0.55} stroke={COL.concreteStroke} strokeWidth={1.3} />

        {/* ---- column vertical bars (continuous through the joint) ---- */}
        {[colL + p(column.coverMm), colR - p(column.coverMm)].map((x, i) => (
          <line key={`cv${i}`} x1={x} y1={PAD + 22} x2={x} y2={H - PAD - 20} stroke={COL.rebarTop} strokeWidth={1.8} />
        ))}

        {/* ---- stirrups in the beam ---- */}
        {stirrups.map((x, i) => (
          <line key={`s${i}`} x1={x} y1={yTopBar} x2={x} y2={yBotBar} stroke={COL.stirrup} strokeWidth={1} />
        ))}

        {/* ---- TOP steel: continuous over the support, hooked down at a discontinuous end ---- */}
        {kind === "corner" ? (
          <path d={`M ${colL + p(column.coverMm)} ${yTopBar + bendPx} L ${colL + p(column.coverMm)} ${yTopBar} L ${xR} ${yTopBar}`}
            fill="none" stroke={COL.rebarTop} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <line x1={xL} y1={yTopBar} x2={xR} y2={yTopBar} stroke={COL.rebarTop} strokeWidth={2.2} strokeLinecap="round" />
        )}

        {/* ---- BOTTOM steel ---- */}
        {kind === "corner" ? (
          // anchored into the column with a 90° bend turned UP
          <path d={`M ${xR} ${yBotBar} L ${colL + p(column.coverMm)} ${yBotBar} L ${colL + p(column.coverMm)} ${yBotBar - anchPx}`}
            fill="none" stroke={COL.rebarBot} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        ) : kind === "edge" ? (
          <path d={`M ${xL} ${yBotBar} L ${xR} ${yBotBar}`} fill="none" stroke={COL.rebarBot} strokeWidth={2.2} strokeLinecap="round" />
        ) : (
          <>
            {/* continuous, with a LAP centred on the support (the low-moment zone) */}
            <line x1={xL} y1={yBotBar} x2={cx + lapPx / 2} y2={yBotBar} stroke={COL.rebarBot} strokeWidth={2.2} strokeLinecap="round" />
            <line x1={cx - lapPx / 2} y1={yBotBar + 3.2} x2={xR} y2={yBotBar + 3.2} stroke={COL.rebarBot} strokeWidth={2.2} strokeLinecap="round" />
          </>
        )}

        {/* ---- annotated zones ---- */}
        {kind === "internal" && (
          <g>
            <rect x={cx - lapPx / 2} y={yBotBar - 4} width={lapPx} height={12} fill={COL.lap} fillOpacity={0.18} stroke={COL.lap} strokeWidth={0.7} strokeDasharray="3 2" />
            <DimH x1={cx - lapPx / 2} x2={cx + lapPx / 2} y={beamBot + 16} label={`lap ${a.lapTensionMm}`} />
            <DimH x1={colR} x2={colR + p(beam.curtailFromFaceMm)} y={PAD + 34} label={`Ld ${beam.curtailFromFaceMm}`} />
          </g>
        )}
        {kind === "corner" && (
          <g>
            <DimV x={colL + p(column.coverMm) - 10} y1={yBotBar} y2={yBotBar - anchPx}
              label={`${beam.anchorageIntoSupportMm}`} />
            <text x={colL - 4} y={yBotBar - anchPx - 6} textAnchor="end" fontSize={7.2} fill={COL.rebarBot} fontWeight={700}>
              anchorage into support
            </text>
            <DimH x1={colR} x2={colR + p(beam.curtailFromFaceMm)} y={PAD + 34} label={`Ld ${beam.curtailFromFaceMm}`} />
          </g>
        )}
        {kind === "edge" && (
          <g>
            <DimH x1={colR} x2={colR + p(beam.curtailFromFaceMm)} y={PAD + 34} label={`Ld ${beam.curtailFromFaceMm}`} />
            <DimH x1={colR} x2={colR + p(2 * beam.depthMm)} y={beamBot + 16}
              label={`stirrups @ ${beam.stirrupSpacingSupportMm}`} />
          </g>
        )}

        {/* ---- labels ---- */}
        <text x={cx} y={H - PAD - 6} textAnchor="middle" fontSize={7.5} fill={COL.note}>
          column {column.sizeMm} sq · {column.barsText}
        </text>
        <text x={xR} y={beamTop - 6} textAnchor="end" fontSize={7.5} fill={COL.rebarTop} fontWeight={700}>
          {beam.topText}
        </text>
        <text x={xR} y={beamBot + 30} textAnchor="end" fontSize={7.5} fill={COL.rebarBot} fontWeight={700}>
          {beam.bottomText}
        </text>
      </svg>
      <p className="mt-1 text-[10px] leading-snug text-slate-500">{BLURB[kind]}</p>
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
