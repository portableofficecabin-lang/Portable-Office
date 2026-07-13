"use client";

import type { ConstructionPlan } from "@/lib/quotation/labourColonyPlan";
import { toMM } from "@/lib/quotation/labourColonyPlan";
import type { ColumnMark, RebarDesign } from "@/lib/quotation/labourColonyRebar";
import { gridLetter } from "@/lib/quotation/labourColonyRebar";

/**
 * COLUMN LAYOUT — every column set out on the structural grid, numbered C1…Cn, with grid
 * references (A-1, B-2 …), centre-to-centre dimension chains and the column reinforcement
 * schedule below.
 *
 * The grid is the ARCHITECTURAL one (plan.colXs × plan.rowYs), so the columns land on the real
 * bay and wall lines a builder sets out from — not on an abstract evenly-spaced grid.
 *
 * Schematic reference for quotation / approval — NOT a stamped structural drawing.
 */

const COL = {
  outline: "#0f172a",
  grid: "#94a3b8",
  bubble: "#334155",
  column: "#0f172a",
  mark: "#b91c1c",
  dim: "#334155",
  corner: "#fca5a5",
  edge: "#fcd34d",
  internal: "#a7f3d0",
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function ColumnLayoutPlan({ plan, columns, rebar }: {
  plan: ConstructionPlan;
  columns: ColumnMark[];
  rebar: RebarDesign;
}) {
  const S = clamp(700 / Math.max(0.5, plan.blockW), 12, 40);   // px per metre
  const px = (m: number) => m * S;
  const PAD = 78;

  const colXs = plan.colXs;
  const rowYs = plan.rowYs;
  const minX = Math.min(0, ...colXs);
  const minY = Math.min(0, ...rowYs);
  const maxX = Math.max(plan.blockW, ...colXs);
  const maxY = Math.max(plan.blockD, ...rowYs);
  const X = (m: number) => px(m - minX);
  const Y = (m: number) => px(m - minY);

  const svgW = px(maxX - minX) + PAD * 2;
  const svgH = px(maxY - minY) + PAD * 2;

  // Drawn column square (the pedestal footprint), min 8 px so it stays visible when zoomed out.
  const cSizePx = Math.max(8, px(rebar.column.sizeMm / 1000));

  const kindFill = (k: ColumnMark["kind"]) =>
    k === "corner" ? COL.corner : k === "edge" ? COL.edge : COL.internal;

  const counts = columns.reduce<Record<string, number>>((m, c) => ({ ...m, [c.kind]: (m[c.kind] ?? 0) + 1 }), {});

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="font-display font-bold text-sm text-slate-800">Column Layout &amp; Numbering</div>
        <div className="text-xs text-slate-500">
          {columns.length} columns · {rebar.column.sizeMm} × {rebar.column.sizeMm} mm · grid {colXs.length} × {rowYs.length}
        </div>
        <div className="text-[10px] text-slate-400">Not to scale — schematic · confirm with structural engineer</div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" style={{ minWidth: Math.max(640, Math.round(svgW)) }}>
          <text x={svgW / 2} y={20} textAnchor="middle" fontSize={13} fontWeight={700} fill={COL.outline} letterSpacing={1}>
            COLUMN LAYOUT PLAN
          </text>

          <g transform={`translate(${PAD},${PAD})`}>
            {/* building outline */}
            <rect x={X(0)} y={Y(0)} width={px(plan.blockW)} height={px(plan.blockD)}
              fill="none" stroke={COL.outline} strokeWidth={1.6} />

            {/* ---- grid centre-lines + bubbles ---- */}
            {colXs.map((x, i) => (
              <g key={`gx${i}`}>
                <line x1={X(x)} y1={Y(minY) - 34} x2={X(x)} y2={Y(maxY) + 14}
                  stroke={COL.grid} strokeWidth={0.8} strokeDasharray="7 3 2 3" />
                <circle cx={X(x)} cy={Y(minY) - 42} r={9} fill="#fff" stroke={COL.bubble} strokeWidth={1} />
                <text x={X(x)} y={Y(minY) - 38.5} textAnchor="middle" fontSize={9} fontWeight={600} fill={COL.bubble}>
                  {gridLetter(i)}
                </text>
              </g>
            ))}
            {rowYs.map((y, i) => (
              <g key={`gy${i}`}>
                <line x1={X(minX) - 34} y1={Y(y)} x2={X(maxX) + 14} y2={Y(y)}
                  stroke={COL.grid} strokeWidth={0.8} strokeDasharray="7 3 2 3" />
                <circle cx={X(minX) - 42} cy={Y(y)} r={9} fill="#fff" stroke={COL.bubble} strokeWidth={1} />
                <text x={X(minX) - 42} y={Y(y) + 3.5} textAnchor="middle" fontSize={9} fontWeight={600} fill={COL.bubble}>
                  {i + 1}
                </text>
              </g>
            ))}

            {/* ---- columns: a square at every grid intersection, with its mark ---- */}
            {columns.map((c) => (
              <g key={c.mark}>
                <rect
                  x={X(c.xM) - cSizePx / 2} y={Y(c.yM) - cSizePx / 2}
                  width={cSizePx} height={cSizePx}
                  fill={kindFill(c.kind)} stroke={COL.column} strokeWidth={1.4}
                />
                {/* the two diagonals — the standard way a column is hatched in a layout plan */}
                <line x1={X(c.xM) - cSizePx / 2} y1={Y(c.yM) - cSizePx / 2}
                  x2={X(c.xM) + cSizePx / 2} y2={Y(c.yM) + cSizePx / 2} stroke={COL.column} strokeWidth={0.7} />
                <line x1={X(c.xM) + cSizePx / 2} y1={Y(c.yM) - cSizePx / 2}
                  x2={X(c.xM) - cSizePx / 2} y2={Y(c.yM) + cSizePx / 2} stroke={COL.column} strokeWidth={0.7} />
                <text x={X(c.xM) + cSizePx / 2 + 3} y={Y(c.yM) - cSizePx / 2 - 2.5}
                  fontSize={8.5} fontWeight={700} fill={COL.mark}>{c.mark}</text>
              </g>
            ))}

            {/* ---- centre-to-centre dimension chain along the top ---- */}
            <DimChainH xs={colXs} X={X} y={Y(minY) - 22} />
            {/* ---- and down the left ---- */}
            <DimChainV ys={rowYs} Y={Y} x={X(minX) - 22} />

            {/* ---- overall ---- */}
            <g>
              <line x1={X(0)} y1={Y(maxY) + 30} x2={X(plan.blockW)} y2={Y(maxY) + 30} stroke={COL.dim} strokeWidth={1} />
              <text x={(X(0) + X(plan.blockW)) / 2} y={Y(maxY) + 26} textAnchor="middle" fontSize={10} fontWeight={700} fill={COL.dim}>
                {toMM(plan.blockW)} mm OVERALL
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* ---- legend ---- */}
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
        <Chip color={COL.corner} label={`Corner (${counts.corner ?? 0})`} />
        <Chip color={COL.edge} label={`Edge (${counts.edge ?? 0})`} />
        <Chip color={COL.internal} label={`Internal (${counts.internal ?? 0})`} />
        <span className="text-slate-400">Grid refs: letters across, numbers down — e.g. C1 = A-1</span>
      </div>

      {/* ---- COLUMN REINFORCEMENT SCHEDULE ---- */}
      <div className="mt-4">
        <div className="mb-1 font-display text-xs font-bold uppercase tracking-wide text-slate-700">
          Column / Pedestal Reinforcement Schedule
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-left">
                {["Mark", "Qty", "Size (mm)", "Vertical bars", "Ties", "Cover", "Lap (comp.)", "Starter into footing", "Grade"].map((h) => (
                  <th key={h} className="border border-slate-300 px-2 py-1 font-semibold text-slate-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 px-2 py-1 font-bold text-red-700">
                  C1–C{columns.length}
                </td>
                <td className="border border-slate-300 px-2 py-1">{columns.length}</td>
                <td className="border border-slate-300 px-2 py-1">{rebar.column.sizeMm} × {rebar.column.sizeMm}</td>
                <td className="border border-slate-300 px-2 py-1">{rebar.column.barsText}</td>
                <td className="border border-slate-300 px-2 py-1">{rebar.column.tiesText}</td>
                <td className="border border-slate-300 px-2 py-1">{rebar.column.coverMm} mm</td>
                <td className="border border-slate-300 px-2 py-1">{rebar.column.lapMm} mm</td>
                <td className="border border-slate-300 px-2 py-1">{rebar.column.starterProjectionMm} mm</td>
                <td className="border border-slate-300 px-2 py-1">{rebar.steelGrade} / {rebar.concreteGrade}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500">
          All columns are identical in this scheme. Vertical bars are spliced above floor level with a{" "}
          {rebar.column.lapMm} mm compression lap ({rebar.column.anchorage.ldCompMultiple}φ); ties are closed with a
          135° hook of {rebar.column.anchorage.hook135Mm} mm and are spaced at{" "}
          {rebar.column.tieSpacingEndMm} mm c/c over a distance equal to the larger column dimension at each
          end (the confinement zone).
        </p>
      </div>
    </div>
  );
}

function Chip({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-3 w-3 rounded-sm border border-slate-500" style={{ background: color }} />
      {label}
    </span>
  );
}

/** Centre-to-centre chain across the top: one tick per grid line, span label between them. */
function DimChainH({ xs, X, y }: { xs: number[]; X: (m: number) => number; y: number }) {
  return (
    <g>
      <line x1={X(xs[0])} y1={y} x2={X(xs[xs.length - 1])} y2={y} stroke={COL.dim} strokeWidth={1} />
      {xs.map((x, i) => (
        <line key={`t${i}`} x1={X(x)} y1={y - 4} x2={X(x)} y2={y + 4} stroke={COL.dim} strokeWidth={1} />
      ))}
      {xs.slice(0, -1).map((x, i) => (
        <text key={`l${i}`} x={(X(x) + X(xs[i + 1])) / 2} y={y - 5} textAnchor="middle" fontSize={8.5} fill={COL.dim}>
          {toMM(xs[i + 1] - x)}
        </text>
      ))}
    </g>
  );
}

/** Centre-to-centre chain down the left, labels rotated to read up the page. */
function DimChainV({ ys, Y, x }: { ys: number[]; Y: (m: number) => number; x: number }) {
  return (
    <g>
      <line x1={x} y1={Y(ys[0])} x2={x} y2={Y(ys[ys.length - 1])} stroke={COL.dim} strokeWidth={1} />
      {ys.map((y, i) => (
        <line key={`t${i}`} x1={x - 4} y1={Y(y)} x2={x + 4} y2={Y(y)} stroke={COL.dim} strokeWidth={1} />
      ))}
      {ys.slice(0, -1).map((y, i) => {
        const my = (Y(y) + Y(ys[i + 1])) / 2;
        return (
          <text key={`l${i}`} x={x - 5} y={my} textAnchor="middle" fontSize={8.5} fill={COL.dim}
            transform={`rotate(-90 ${x - 5} ${my})`}>
            {toMM(ys[i + 1] - y)}
          </text>
        );
      })}
    </g>
  );
}
