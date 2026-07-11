"use client";

import type { ConstructionPlan, BeamScheduleRow } from "@/lib/quotation/labourColonyPlan";
import { toMM } from "@/lib/quotation/labourColonyPlan";

/**
 * PLINTH BEAM LAYOUT (spec §6/§7) — top view of the foundation / plinth-beam grid.
 *
 * Draws the centre-line beam grid straight from the construction plan: the room
 * block outline (dashed reference), every plinth beam as a heavy line, a column
 * marker at each grid intersection, PB1/PB2 beam marks and an architectural
 * centre-line dimension chain (per-bay + overall) on the top and left edges.
 * Below it a normal HTML BEAM SCHEDULE table lists each mark's size, grade,
 * reinforcement, length and count. Geometry and schedule come from the same
 * engine as the section detail and the BOQ, so all three agree. Schematic
 * reference for quotation / approval, not a stamped structural drawing.
 */

const COL = {
  block: "#cbd5e1", // dashed reference outline
  beam: "#0f172a",
  column: "#0f172a",
  mark: "#b91c1c",
  dim: "#334155",
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function PlinthBeamLayout({ plan, schedule }: { plan: ConstructionPlan; schedule: BeamScheduleRow[] }) {
  const S = clamp(720 / Math.max(0.5, plan.blockW), 12, 40); // px per metre
  const PAD = 72;
  const px = (m: number) => m * S;

  // Bounds over every rect (rooms + verandas + stairs) so a negative-x staircase
  // is never clipped; the outline + beam grid themselves live within [0..block].
  const rects = [...plan.rooms, ...plan.verandas, ...plan.stairs];
  const minX = Math.min(0, ...rects.map((r) => r.x));
  const minY = Math.min(0, ...rects.map((r) => r.y));
  const maxX = Math.max(plan.blockW, ...rects.map((r) => r.x + r.w));
  const maxY = Math.max(plan.blockD, ...rects.map((r) => r.y + r.d));

  const X = (m: number) => px(m - minX);
  const Y = (m: number) => px(m - minY);
  const svgW = px(maxX - minX) + PAD * 2;
  const svgH = px(maxY - minY) + PAD * 2;
  const minWidth = Math.max(640, Math.round(svgW));

  const { colXs, rowYs, beams } = plan;
  const xFirst = colXs[0];
  const xLast = colXs[colXs.length - 1];
  const yFirst = rowYs[0];
  const yLast = rowYs[rowYs.length - 1];

  // Beam marks: label only the FIRST occurrence of each distinct mark, near the
  // midpoint of that representative beam, to keep the grid readable.
  const seen = new Set<string>();
  const markLabels = beams.flatMap((b) => {
    if (seen.has(b.mark)) return [];
    seen.add(b.mark);
    const mx = (b.x1 + b.x2) / 2;
    const my = (b.y1 + b.y2) / 2;
    const horizontal = Math.abs(b.y1 - b.y2) <= Math.abs(b.x1 - b.x2);
    return [{ mark: b.mark, x: horizontal ? X(mx) : X(mx) + 11, y: horizontal ? Y(my) - 7 : Y(my) + 3 }];
  });

  // Centre-line dimension chains (grid spacings -> mm).
  const colDivs = colXs.map(X);
  const rowDivs = rowYs.map(Y);
  const colLabels = colXs.slice(0, -1).map((x, i) => `${toMM(colXs[i + 1] - x)}`);
  const rowLabels = rowYs.slice(0, -1).map((y, i) => `${toMM(rowYs[i + 1] - y)}`);
  const colTotal = `${toMM(xLast - xFirst)}`;
  const rowTotal = `${toMM(yLast - yFirst)}`;
  const x0 = X(0);

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <div className="font-display font-bold text-sm text-slate-800">Plinth Beam Layout — Top View</div>
          <div className="text-xs text-slate-500">
            Centre-line beam grid · {colXs.length}×{rowYs.length} lines · overall {colTotal} × {rowTotal} mm (C/L)
          </div>
        </div>
        <div className="text-[10px] text-slate-400">Not to scale — schematic</div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" style={{ minWidth }}>
          {/* drawing title */}
          <text x={svgW / 2} y={20} textAnchor="middle" fontSize={13} fontWeight={700} fill={COL.beam} letterSpacing={1}>
            PLINTH BEAM LAYOUT
          </text>

          <g transform={`translate(${PAD},${PAD})`}>
            {/* building block outline — dashed reference */}
            <rect x={X(0)} y={Y(0)} width={px(plan.blockW)} height={px(plan.blockD)} fill="none" stroke={COL.block} strokeWidth={1.2} strokeDasharray="6 4" />

            {/* plinth beams along the grid */}
            {beams.map((b, i) => (
              <line key={`b${i}`} x1={X(b.x1)} y1={Y(b.y1)} x2={X(b.x2)} y2={Y(b.y2)} stroke={COL.beam} strokeWidth={4} strokeLinecap="round" />
            ))}

            {/* column marker at each grid intersection */}
            {rowYs.map((cy, j) =>
              colXs.map((cx, i) => (
                <rect key={`col${i}-${j}`} x={X(cx) - 3} y={Y(cy) - 3} width={6} height={6} fill={COL.column} />
              )),
            )}

            {/* beam marks (first occurrence of each) */}
            {markLabels.map((m) => (
              <text key={m.mark} x={m.x} y={m.y} textAnchor="middle" fontSize={10} fontWeight={700} fill={COL.mark}>{m.mark}</text>
            ))}

            {/* grid-line labels: letters over columns, numbers left of rows */}
            {colXs.map((cx, i) => (
              <text key={`gl${i}`} x={X(cx)} y={Y(0) - 7} textAnchor="middle" fontSize={9} fontWeight={600} fill={COL.dim}>
                {String.fromCharCode(65 + i)}
              </text>
            ))}
            {rowYs.map((cy, j) => (
              <text key={`gr${j}`} x={x0 - 8} y={Y(cy) + 3} textAnchor="middle" fontSize={9} fontWeight={600} fill={COL.dim}>{j + 1}</text>
            ))}

            {/* top centre-line dimension chain + overall */}
            <DimChainH xs={colDivs} y={-20} labels={colLabels} />
            <OverallH x0={colDivs[0]} x1={colDivs[colDivs.length - 1]} y={-34} label={colTotal} />
            <text x={colDivs[colDivs.length - 1] + 14} y={-31} fontSize={8} fontWeight={600} fill={COL.dim}>C/L</text>

            {/* left centre-line dimension chain + overall */}
            <DimChainV ys={rowDivs} x={x0 - 24} labels={rowLabels} />
            <OverallV y0={rowDivs[0]} y1={rowDivs[rowDivs.length - 1]} x={x0 - 42} label={rowTotal} />
          </g>
        </svg>
      </div>

      {/* BEAM SCHEDULE */}
      <div className="mt-4">
        <div className="mb-2 font-display font-bold text-sm text-slate-800">Beam Schedule</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-600">
                <th className="px-3 py-2 font-semibold">Mark</th>
                <th className="px-3 py-2 font-semibold">Size (mm)</th>
                <th className="px-3 py-2 font-semibold">Grade</th>
                <th className="px-3 py-2 font-semibold">Top Bars</th>
                <th className="px-3 py-2 font-semibold">Bottom Bars</th>
                <th className="px-3 py-2 font-semibold">Stirrups</th>
                <th className="px-3 py-2 font-semibold">Length (m)</th>
                <th className="px-3 py-2 font-semibold">Nos.</th>
              </tr>
            </thead>
            <tbody>
              {schedule.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-3 text-center text-slate-400">No plinth beams for this foundation type.</td>
                </tr>
              ) : (
                schedule.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-semibold text-slate-700">{r.mark}</td>
                    <td className="px-3 py-2 text-slate-600">{r.size}</td>
                    <td className="px-3 py-2 text-slate-600">{r.grade}</td>
                    <td className="px-3 py-2 text-slate-600">{r.topBars}</td>
                    <td className="px-3 py-2 text-slate-600">{r.bottomBars}</td>
                    <td className="px-3 py-2 text-slate-600">{r.stirrups}</td>
                    <td className="px-3 py-2 text-slate-600">{r.lengthM}</td>
                    <td className="px-3 py-2 text-slate-600">{r.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- horizontal centre-line dimension chain (45° ticks) ---------- */
function DimChainH({ xs, y, labels }: { xs: number[]; y: number; labels: string[] }) {
  return (
    <g>
      <line x1={xs[0]} y1={y} x2={xs[xs.length - 1]} y2={y} stroke={COL.dim} strokeWidth={1} />
      {xs.map((x, i) => (
        <g key={i}>
          <line x1={x} y1={y - 4} x2={x} y2={y + 4} stroke={COL.dim} strokeWidth={0.8} />
          <line x1={x - 3} y1={y + 3} x2={x + 3} y2={y - 3} stroke={COL.dim} strokeWidth={1.2} />
        </g>
      ))}
      {labels.map((lb, i) => (
        <text key={i} x={(xs[i] + xs[i + 1]) / 2} y={y - 4} textAnchor="middle" fontSize={8.5} fill={COL.dim}>{lb}</text>
      ))}
    </g>
  );
}

/* ---------- overall horizontal dimension line ---------- */
function OverallH({ x0, x1, y, label }: { x0: number; x1: number; y: number; label: string }) {
  return (
    <g>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={COL.dim} strokeWidth={1} />
      <line x1={x0 - 3} y1={y + 3} x2={x0 + 3} y2={y - 3} stroke={COL.dim} strokeWidth={1.2} />
      <line x1={x1 - 3} y1={y + 3} x2={x1 + 3} y2={y - 3} stroke={COL.dim} strokeWidth={1.2} />
      <text x={(x0 + x1) / 2} y={y - 4} textAnchor="middle" fontSize={9} fontWeight={700} fill={COL.dim}>{label}</text>
    </g>
  );
}

/* ---------- vertical centre-line dimension chain (rotated labels) ---------- */
function DimChainV({ ys, x, labels }: { ys: number[]; x: number; labels: string[] }) {
  return (
    <g>
      <line x1={x} y1={ys[0]} x2={x} y2={ys[ys.length - 1]} stroke={COL.dim} strokeWidth={1} />
      {ys.map((yy, i) => (
        <g key={i}>
          <line x1={x - 4} y1={yy} x2={x + 4} y2={yy} stroke={COL.dim} strokeWidth={0.8} />
          <line x1={x - 3} y1={yy + 3} x2={x + 3} y2={yy - 3} stroke={COL.dim} strokeWidth={1.2} />
        </g>
      ))}
      {labels.map((lb, i) => {
        const cy = (ys[i] + ys[i + 1]) / 2;
        return (
          <text key={i} x={x - 5} y={cy} textAnchor="middle" fontSize={8.5} fill={COL.dim} transform={`rotate(-90 ${x - 5} ${cy})`}>{lb}</text>
        );
      })}
    </g>
  );
}

/* ---------- overall vertical dimension line ---------- */
function OverallV({ y0, y1, x, label }: { y0: number; y1: number; x: number; label: string }) {
  const cy = (y0 + y1) / 2;
  return (
    <g>
      <line x1={x} y1={y0} x2={x} y2={y1} stroke={COL.dim} strokeWidth={1} />
      <line x1={x - 3} y1={y0 + 3} x2={x + 3} y2={y0 - 3} stroke={COL.dim} strokeWidth={1.2} />
      <line x1={x - 3} y1={y1 + 3} x2={x + 3} y2={y1 - 3} stroke={COL.dim} strokeWidth={1.2} />
      <text x={x - 5} y={cy} textAnchor="middle" fontSize={9} fontWeight={700} fill={COL.dim} transform={`rotate(-90 ${x - 5} ${cy})`}>{label}</text>
    </g>
  );
}
