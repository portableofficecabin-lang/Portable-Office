"use client";

import type { FoundationResult } from "@/lib/quotation/labourColonyCivil";
import { FOUNDATION_TYPES } from "@/lib/quotation/labourColonyCivil";

/**
 * PLINTH-BEAM SECTION detail (spec §6, "Both plan + section"): a vertical cut
 * through one column line showing PCC bed → footing → pedestal → RCC plinth
 * beam (top & bottom rebar + stirrups) → raised plinth fill → floor finish,
 * with real dimensions from FoundationResult.section. Schematic engineering
 * reference, not a stamped structural drawing.
 */

const COL = {
  rcc: "#cbd5e1",
  rccStroke: "#334155",
  pcc: "#94a3b8",
  fill: "#fef3c7",
  fillStroke: "#d97706",
  floor: "#e2e8f0",
  rebar: "#dc2626",
  dim: "#475569",
  ground: "#78716c",
  column: "#1e293b",
};

export function PlinthBeamSection({ foundation }: { foundation: FoundationResult }) {
  const s = foundation.section;
  const footW = Math.max(0.6, s.footingLengthM);
  const footD = Math.max(0.2, s.footingDepthM);
  const pedW = Math.max(0.2, s.pedestalSizeM);
  const pedH = Math.max(0.2, s.pedestalHeightM);
  const beamD = Math.max(0.2, s.plinthBeamDepthM);
  const beamW = Math.max(0.15, s.plinthBeamWidthM);
  const pccT = Math.max(0.05, s.pccThicknessMm / 1000);
  const raised = Math.max(0.15, s.raisedPlinthHeightM);
  const floorT = 0.1;
  const hasPedestal = s.type === "rcc_pedestal" || s.type === "rcc_isolated_footing";

  // vertical stack (m), top → bottom
  const totalH = floorT + beamD + pedH + footD + pccT + 0.15;
  const totalWm = Math.max(footW * 2.6, 3.2);
  const S = Math.max(90, Math.min(230, 300 / totalH)); // px per metre
  const PADX = 90;
  const PADY = 40;
  const px = (m: number) => m * S;

  const cx = px(totalWm / 2);           // centreline x
  let y = 0;
  const yFloorTop = y; y += floorT;
  const yBeamTop = y; y += beamD;
  const yBeamBot = y;
  const yPedTop = y; y += pedH;
  const yPedBot = y;
  const yFootTop = y; y += footD;
  const yFootBot = y;
  const yPccTop = y; y += pccT;
  const yPccBot = y;
  // natural ground line sits `raised` below finished floor top
  const yGround = Math.min(px(raised), px(yPedBot) - 4);

  const svgW = px(totalWm) + PADX * 2;
  const svgH = px(totalH) + PADY * 2;
  const beamPx = px(beamW);
  const footPx = px(footW);
  const pedPx = px(pedW);
  const typeLabel = FOUNDATION_TYPES.find((t) => t.id === s.type)?.label ?? s.type;

  const dimV = (xAt: number, y1: number, y2: number, label: string) => (
    <g>
      <line x1={xAt} y1={py(y1)} x2={xAt} y2={py(y2)} stroke={COL.dim} strokeWidth={1} />
      <line x1={xAt - 4} y1={py(y1)} x2={xAt + 4} y2={py(y1)} stroke={COL.dim} strokeWidth={1} />
      <line x1={xAt - 4} y1={py(y2)} x2={xAt + 4} y2={py(y2)} stroke={COL.dim} strokeWidth={1} />
      <text x={xAt - 6} y={(py(y1) + py(y2)) / 2 + 3} textAnchor="end" fontSize={9} fill={COL.dim}>{label}</text>
    </g>
  );
  function py(m: number) { return PADY + px(m); }

  // rebar positions in the plinth beam
  const rebarCover = 0.04;
  const nBars = 3;
  const barY_top = yBeamTop + rebarCover;
  const barY_bot = yBeamBot - rebarCover;

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <div className="font-display font-bold text-sm text-slate-800">Plinth-Beam Section Detail</div>
          <div className="text-xs text-slate-500">{typeLabel} · {s.grade} · through column centreline</div>
        </div>
        <div className="text-[10px] text-slate-400">Confirm with structural engineer</div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto min-w-[420px]">
          <defs>
            <pattern id="fillHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="7" stroke={COL.fillStroke} strokeWidth="0.7" opacity="0.5" />
            </pattern>
            <pattern id="pccHatch" width="6" height="6" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="0.8" fill={COL.pcc} />
            </pattern>
          </defs>

          <g transform={`translate(${PADX},0)`}>
            {/* raised plinth fill (both sides of pedestal, above ground) */}
            <rect x={0} y={py(yFloorTop)} width={cx - beamPx / 2} height={px(raised)} fill="url(#fillHatch)" stroke={COL.fillStroke} strokeWidth={0.8} />
            <rect x={cx + beamPx / 2} y={py(yFloorTop)} width={px(totalWm) - (cx + beamPx / 2)} height={px(raised)} fill="url(#fillHatch)" stroke={COL.fillStroke} strokeWidth={0.8} />

            {/* floor finish band */}
            <rect x={0} y={py(yFloorTop)} width={px(totalWm)} height={px(floorT)} fill={COL.floor} stroke={COL.rccStroke} strokeWidth={0.8} />

            {/* prefab column stub above plinth */}
            <rect x={cx - pedPx / 2} y={py(yFloorTop) - 26} width={pedPx} height={26} fill="none" stroke={COL.column} strokeWidth={2} />
            <text x={cx} y={py(yFloorTop) - 30} textAnchor="middle" fontSize={8} fill={COL.column}>MS column</text>

            {/* plinth beam (RCC) spanning full width */}
            <rect x={0} y={py(yBeamTop)} width={px(totalWm)} height={px(beamD)} fill={COL.rcc} stroke={COL.rccStroke} strokeWidth={1.4} />
            {/* stirrups */}
            {Array.from({ length: 6 }, (_, i) => {
              const sx = (px(totalWm) / 6) * (i + 0.5);
              return <rect key={`st${i}`} x={sx - beamPx / 2 + 3} y={py(barY_top) - 2} width={beamPx - 6} height={px(beamD) - px(rebarCover) * 2 + 4} fill="none" stroke={COL.rebar} strokeWidth={0.7} opacity={0.55} />;
            })}
            {/* top & bottom bars (drawn as a row of dots along the beam) */}
            {Array.from({ length: 9 }, (_, i) => {
              const bx = (px(totalWm) / 9) * (i + 0.5);
              return (
                <g key={`bar${i}`}>
                  <circle cx={bx} cy={py(barY_top)} r={2} fill={COL.rebar} />
                  <circle cx={bx} cy={py(barY_bot)} r={2} fill={COL.rebar} />
                </g>
              );
            })}
            <text x={px(totalWm) - 2} y={py(yBeamTop) - 4} textAnchor="end" fontSize={8} fill={COL.rebar}>plinth beam {Math.round(beamW * 1000)}×{Math.round(beamD * 1000)}, {nBars}-T bars T&B</text>

            {/* pedestal */}
            {hasPedestal && pedH > 0 && (
              <rect x={cx - pedPx / 2} y={py(yPedTop)} width={pedPx} height={px(pedH)} fill={COL.rcc} stroke={COL.rccStroke} strokeWidth={1.2} />
            )}

            {/* footing */}
            <rect x={cx - footPx / 2} y={py(yFootTop)} width={footPx} height={px(footD)} fill={COL.rcc} stroke={COL.rccStroke} strokeWidth={1.4} />
            {/* footing mesh bars */}
            {Array.from({ length: 5 }, (_, i) => {
              const bx = cx - footPx / 2 + (footPx / 5) * (i + 0.5);
              return <circle key={`fb${i}`} cx={bx} cy={py(yFootBot) - px(rebarCover)} r={1.6} fill={COL.rebar} />;
            })}

            {/* PCC bed */}
            <rect x={cx - footPx / 2 - px(0.1)} y={py(yPccTop)} width={footPx + px(0.2)} height={px(pccT)} fill="url(#pccHatch)" stroke={COL.rccStroke} strokeWidth={1} />
            <rect x={cx - footPx / 2 - px(0.1)} y={py(yPccTop)} width={footPx + px(0.2)} height={px(pccT)} fill={COL.pcc} opacity={0.25} />

            {/* natural ground line */}
            <line x1={0} y1={py(yFloorTop) + yGround} x2={px(totalWm)} y2={py(yFloorTop) + yGround} stroke={COL.ground} strokeWidth={1.4} strokeDasharray="6 3" />
            <text x={4} y={py(yFloorTop) + yGround - 4} fontSize={8} fill={COL.ground}>natural ground level</text>

            {/* finished floor level marker */}
            <text x={px(totalWm) - 2} y={py(yFloorTop) - 3} textAnchor="end" fontSize={8} fill={COL.dim}>FFL (raised plinth)</text>
          </g>

          {/* vertical dimensions (left) */}
          <g>
            {dimV(PADX - 22, yBeamTop, yBeamBot, `${Math.round(beamD * 1000)}`)}
            {hasPedestal && pedH > 0 && dimV(PADX - 22, yPedTop, yPedBot, `${Math.round(pedH * 1000)}`)}
            {dimV(PADX - 22, yFootTop, yFootBot, `${Math.round(footD * 1000)}`)}
            {dimV(PADX - 40, yFloorTop, yFloorTop + raised, `plinth ${Math.round(raised * 1000)}`)}
          </g>

          {/* footing width dimension (bottom) */}
          <g>
            <line x1={PADX + cx - footPx / 2} y1={py(yPccBot) + 16} x2={PADX + cx + footPx / 2} y2={py(yPccBot) + 16} stroke={COL.dim} strokeWidth={1} />
            <text x={PADX + cx} y={py(yPccBot) + 30} textAnchor="middle" fontSize={9} fill={COL.dim}>footing {Math.round(footW * 1000)} mm sq · PCC {s.pccThicknessMm} mm</text>
          </g>
        </svg>
      </div>

      <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3" style={{ background: COL.rcc, border: `1px solid ${COL.rccStroke}` }} /> RCC {s.grade}</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3" style={{ background: COL.pcc }} /> PCC bed</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3" style={{ background: COL.fill, border: `1px solid ${COL.fillStroke}` }} /> Raised plinth fill</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-1" style={{ background: COL.rebar }} /> Reinforcement</span>
      </div>
    </div>
  );
}
