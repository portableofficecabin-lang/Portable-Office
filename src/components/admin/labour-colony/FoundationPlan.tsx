"use client";

import type { FoundationResult } from "@/lib/quotation/labourColonyCivil";
import { FOUNDATION_TYPES } from "@/lib/quotation/labourColonyCivil";

/**
 * Top-view FOUNDATION PLAN (spec §6/§7): the building outline overlaid with the
 * column grid, an isolated footing/pedestal at every column, and plinth beams
 * running along both grid directions. Column positions come straight from
 * FoundationResult.grid, so the drawing and the civil BOQ count the same
 * footings/beam length. Schematic reference for quotation/approval, not stamped.
 */

const COL = {
  outline: "#0f172a",
  footing: "#fde68a",
  footingStroke: "#b45309",
  pedestal: "#fbbf24",
  beam: "#334155",
  grid: "#cbd5e1",
  dim: "#475569",
  bg: "#ffffff",
};

export function FoundationPlan({ foundation }: { foundation: FoundationResult }) {
  const { grid, footingCount, plinthBeamLengthM, section, footingTypes } = foundation;
  const L = grid.footprintLengthM;
  const W = grid.footprintWidthM;
  const maxDim = Math.max(L, W, 1);
  const S = Math.max(9, Math.min(30, 640 / maxDim)); // px per metre
  const PAD = 54;
  const px = (m: number) => m * S;

  // Load-differentiated footing sizes, keyed by grid cell (ci, ri) — the SAME indices buildColumnMarks
  // assigned from this same grid.xsM/ysM, so `grid.xsM.map((x,i) => grid.ysM.map((y,j) => ...))` below
  // can look each intersection up directly. Falls back to one uniform size when a foundation type has
  // no isolated footings (foundation.footingTypes is then empty — see labourColonyCivil.ts).
  const footM = Math.max(0.6, section.footingLengthM);
  const sideByCell = new Map<string, { sideM: number; mark: string }>();
  for (const t of footingTypes ?? []) {
    for (const c of t.columns ?? []) sideByCell.set(`${c.ci},${c.ri}`, { sideM: t.sideM, mark: t.mark });
  }
  const differentiated = sideByCell.size > 0;
  const pedM = Math.max(0.25, section.pedestalSizeM);
  const ph = px(pedM);
  const hasPedestal = section.type === "rcc_pedestal";

  const totalW = px(L) + PAD * 2;
  const totalH = px(W) + PAD * 2;

  const typeLabel = FOUNDATION_TYPES.find((t) => t.id === section.type)?.label ?? section.type;

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <div className="font-display font-bold text-sm text-slate-800">Foundation Plan — Top View</div>
          <div className="text-xs text-slate-500">
            {typeLabel} · {section.grade} · {grid.cols}×{grid.rows} grid · {footingCount} footings · plinth beam {plinthBeamLengthM} m
          </div>
        </div>
        <div className="text-[10px] text-slate-400">Not to scale — schematic</div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full h-auto min-w-[560px]">
          {/* north arrow */}
          <g transform={`translate(${totalW - 30},28)`}>
            <line x1={0} y1={14} x2={0} y2={-10} stroke={COL.dim} strokeWidth={1.5} />
            <polygon points="0,-14 -4,-6 4,-6" fill={COL.dim} />
            <text x={0} y={26} textAnchor="middle" fontSize={9} fill={COL.dim}>N</text>
          </g>

          <g transform={`translate(${PAD},${PAD})`}>
            {/* building outline */}
            <rect x={0} y={0} width={px(L)} height={px(W)} fill="none" stroke={COL.outline} strokeWidth={2.5} strokeDasharray="7 4" />

            {/* plinth beams along horizontal grid lines */}
            {grid.ysM.map((y, j) => (
              <line key={`bh${j}`} x1={px(grid.xsM[0])} y1={px(y)} x2={px(grid.xsM[grid.xsM.length - 1])} y2={px(y)} stroke={COL.beam} strokeWidth={4} strokeLinecap="round" />
            ))}
            {/* plinth beams along vertical grid lines */}
            {grid.xsM.map((x, i) => (
              <line key={`bv${i}`} x1={px(x)} y1={px(grid.ysM[0])} x2={px(x)} y2={px(grid.ysM[grid.ysM.length - 1])} stroke={COL.beam} strokeWidth={4} strokeLinecap="round" />
            ))}

            {/* footings + pedestals + columns at each grid intersection — sized per its OWN
                load-differentiated type (F1/F2/F3) when the foundation builds isolated footings */}
            {grid.ysM.map((y, j) =>
              grid.xsM.map((x, i) => {
                const cx = px(x);
                const cy = px(y);
                const hit = sideByCell.get(`${i},${j}`);
                const cellSideM = Math.max(0.4, hit?.sideM ?? footM);
                const fh = px(cellSideM);
                return (
                  <g key={`c${i}-${j}`}>
                    <rect x={cx - fh / 2} y={cy - fh / 2} width={fh} height={fh} fill={COL.footing} stroke={COL.footingStroke} strokeWidth={1.2} />
                    {hasPedestal && <rect x={cx - ph / 2} y={cy - ph / 2} width={ph} height={ph} fill={COL.pedestal} stroke={COL.footingStroke} strokeWidth={1} />}
                    <rect x={cx - 3} y={cy - 3} width={6} height={6} fill={COL.outline} />
                    {/* clamped so a large F1 on the top grid row can never draw its mark above the
                        canvas edge (the group is translated by PAD, so local y ≥ -(PAD-8) keeps it
                        ≥ 8px from the top of the SVG regardless of footing size) */}
                    {hit && fh >= 22 && (
                      <text x={cx} y={Math.max(cy - fh / 2 - 3, -(PAD - 8))} textAnchor="middle" fontSize={7} fontWeight={700} fill={COL.footingStroke}>{hit.mark}</text>
                    )}
                  </g>
                );
              }),
            )}

            {/* plinth-beam marks (PB1 perimeter, PB2 internal) */}
            {(() => {
              const marks: React.ReactNode[] = [];
              const xMid = (px(grid.xsM[0]) + px(grid.xsM[grid.xsM.length - 1])) / 2;
              marks.push(<text key="pb1" x={xMid} y={px(grid.ysM[0]) - 5} textAnchor="middle" fontSize={9} fontWeight={700} fill={COL.beam}>PB1</text>);
              if (grid.ysM.length > 2 && foundation.beams.length > 1) {
                const midJ = Math.floor(grid.ysM.length / 2);
                marks.push(<text key="pb2" x={xMid} y={px(grid.ysM[midJ]) - 5} textAnchor="middle" fontSize={9} fontWeight={700} fill={COL.beam}>PB2</text>);
              }
              return marks;
            })()}

            {/* grid labels: columns C1.. on top, rows 1.. on left */}
            {grid.xsM.map((x, i) => (
              <text key={`gl${i}`} x={px(x)} y={-16} textAnchor="middle" fontSize={9} fill={COL.dim}>{String.fromCharCode(65 + i)}</text>
            ))}
            {grid.ysM.map((y, j) => (
              <text key={`gr${j}`} x={-16} y={px(y) + 3} textAnchor="middle" fontSize={9} fill={COL.dim}>{j + 1}</text>
            ))}

            {/* spacing dimension between first two columns */}
            {grid.xsM.length > 1 && (
              <g>
                <line x1={px(grid.xsM[0])} y1={px(W) + 18} x2={px(grid.xsM[1])} y2={px(W) + 18} stroke={COL.dim} strokeWidth={1} />
                <text x={(px(grid.xsM[0]) + px(grid.xsM[1])) / 2} y={px(W) + 32} textAnchor="middle" fontSize={9} fill={COL.dim}>
                  {(grid.xsM[1] - grid.xsM[0]).toFixed(2)} m c/c
                </text>
              </g>
            )}

            {/* overall dimensions */}
            <text x={px(L) / 2} y={px(W) + 48} textAnchor="middle" fontSize={11} fill={COL.dim}>← {L.toFixed(1)} m →</text>
            <text x={-34} y={px(W) / 2} textAnchor="middle" fontSize={11} fill={COL.dim} transform={`rotate(-90 -34 ${px(W) / 2})`}>← {W.toFixed(1)} m →</text>
          </g>
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
        {differentiated ? (
          (footingTypes ?? []).map((t) => (
            <span key={t.mark} className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 border" style={{ background: COL.footing, borderColor: COL.footingStroke }} />
              {t.mark} {t.sideM}×{t.sideM}×{t.depthM} m ({t.kind}, ×{t.count})
            </span>
          ))
        ) : (
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border" style={{ background: COL.footing, borderColor: COL.footingStroke }} /> Footing {section.footingLengthM}×{section.footingLengthM} m</span>
        )}
        {hasPedestal && <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border" style={{ background: COL.pedestal, borderColor: COL.footingStroke }} /> Pedestal {section.pedestalSizeM} m</span>}
        <span className="flex items-center gap-1"><span className="inline-block w-4 h-1" style={{ background: COL.beam }} /> Plinth beam {section.plinthBeamWidthM}×{section.plinthBeamDepthM} m</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2" style={{ background: COL.outline }} /> Column</span>
        {foundation.beams[0] && (
          <span className="basis-full text-[11px] text-slate-500">
            Plinth beam {foundation.beams[0].widthMm}×{foundation.beams[0].depthMm} {section.grade}: {foundation.beams[0].topBars} top + {foundation.beams[0].bottomBars} bottom, stirrups {foundation.beams[0].stirrups}
          </span>
        )}
      </div>
    </div>
  );
}
