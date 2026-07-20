"use client";

/**
 * LABOUR COLONY 2D FABRICATION SHEETS — shared SVG primitives.
 *
 * Dimension lines, dimension CHAINS (bay-by-bay), structural grid bubbles + grid lines, the north
 * arrow and a metric scale bar. Mirrors the cabin sheetPrimitives but works in METRES.
 *
 * EXPORT-SAFE:
 *   • LITERAL HEX only — never a Tailwind colour class / CSS var / oklch token;
 *   • arrowheads are explicit <polygon>, never <marker>/url(#…) — a serialised standalone SVG drops
 *     paint-server references.
 * All coordinates passed in are already SVG PIXELS (the sheet applies the metre→px scale); labels
 * carry the human metre text.
 */

import { PLAN, type GridStation } from "./planScale";

const arrow = (x: number, y: number, dir: "l" | "r" | "u" | "d"): string => {
  const s = 5;
  if (dir === "l") return `${x},${y} ${x + s},${y - s / 1.6} ${x + s},${y + s / 1.6}`;
  if (dir === "r") return `${x},${y} ${x - s},${y - s / 1.6} ${x - s},${y + s / 1.6}`;
  if (dir === "u") return `${x},${y} ${x - s / 1.6},${y + s} ${x + s / 1.6},${y + s}`;
  return `${x},${y} ${x - s / 1.6},${y - s} ${x + s / 1.6},${y - s}`;
};

/** Horizontal dimension line with polygon arrowheads + centred label (px coords). */
export function DimLineH({ x0, x1, y, label }: { x0: number; x1: number; y: number; label: string }) {
  return (
    <g>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={PLAN.dim} strokeWidth={1} />
      <line x1={x0} y1={y - 4} x2={x0} y2={y + 4} stroke={PLAN.dim} strokeWidth={1} />
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke={PLAN.dim} strokeWidth={1} />
      <polygon points={arrow(x0, y, "l")} fill={PLAN.dim} />
      <polygon points={arrow(x1, y, "r")} fill={PLAN.dim} />
      <rect x={(x0 + x1) / 2 - 26} y={y - 8} width={52} height={12} fill={PLAN.paper} />
      <text x={(x0 + x1) / 2} y={y + 1} fontSize={9} textAnchor="middle" fill={PLAN.ink}>{label}</text>
    </g>
  );
}

/** Vertical dimension line with polygon arrowheads + rotated label (px coords). */
export function DimLineV({ y0, y1, x, label }: { y0: number; y1: number; x: number; label: string }) {
  const my = (y0 + y1) / 2;
  return (
    <g>
      <line x1={x} y1={y0} x2={x} y2={y1} stroke={PLAN.dim} strokeWidth={1} />
      <line x1={x - 4} y1={y0} x2={x + 4} y2={y0} stroke={PLAN.dim} strokeWidth={1} />
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke={PLAN.dim} strokeWidth={1} />
      <polygon points={arrow(x, y0, "u")} fill={PLAN.dim} />
      <polygon points={arrow(x, y1, "d")} fill={PLAN.dim} />
      <rect x={x - 8} y={my - 26} width={12} height={52} fill={PLAN.paper} />
      <text x={x} y={my} fontSize={9} textAnchor="middle" fill={PLAN.ink} transform={`rotate(-90 ${x} ${my})`}>{label}</text>
    </g>
  );
}

/**
 * Horizontal dimension CHAIN — a tick at every station and a bay dimension between each adjacent
 * pair (metres). `stations` carry both the px position (x) and the metre coordinate (m). Adjacent
 * gaps are labelled with |Δm|.
 */
export function DimChainH({ stations, y }: { stations: { x: number; m: number }[]; y: number }) {
  const st = [...stations].sort((a, b) => a.x - b.x);
  if (st.length < 2) return null;
  const x0 = st[0].x, x1 = st[st.length - 1].x;
  return (
    <g>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={PLAN.dim} strokeWidth={1} />
      <polygon points={arrow(x0, y, "l")} fill={PLAN.dim} />
      <polygon points={arrow(x1, y, "r")} fill={PLAN.dim} />
      {st.map((s, i) => (
        <line key={`t${i}`} x1={s.x} y1={y - 4} x2={s.x} y2={y + 4} stroke={PLAN.dim} strokeWidth={1} />
      ))}
      {st.slice(0, -1).map((s, i) => {
        const n = st[i + 1];
        const mid = (s.x + n.x) / 2;
        const d = Math.abs(n.m - s.m);
        if (n.x - s.x < 14) return null;
        return (
          <g key={`d${i}`}>
            <rect x={mid - 17} y={y - 8} width={34} height={11} fill={PLAN.paper} />
            <text x={mid} y={y - 1} fontSize={8} textAnchor="middle" fill={PLAN.ink}>{d.toFixed(2)}</text>
          </g>
        );
      })}
    </g>
  );
}

/** Vertical dimension CHAIN — a tick at every station, |Δm| between adjacent pairs (metres). */
export function DimChainV({ stations, x }: { stations: { y: number; m: number }[]; x: number }) {
  const st = [...stations].sort((a, b) => a.y - b.y);
  if (st.length < 2) return null;
  const y0 = st[0].y, y1 = st[st.length - 1].y;
  return (
    <g>
      <line x1={x} y1={y0} x2={x} y2={y1} stroke={PLAN.dim} strokeWidth={1} />
      <polygon points={arrow(x, y0, "u")} fill={PLAN.dim} />
      <polygon points={arrow(x, y1, "d")} fill={PLAN.dim} />
      {st.map((s, i) => (
        <line key={`t${i}`} x1={x - 4} y1={s.y} x2={x + 4} y2={s.y} stroke={PLAN.dim} strokeWidth={1} />
      ))}
      {st.slice(0, -1).map((s, i) => {
        const n = st[i + 1];
        const mid = (s.y + n.y) / 2;
        const d = Math.abs(n.m - s.m);
        if (n.y - s.y < 14) return null;
        return (
          <g key={`d${i}`}>
            <rect x={x - 8} y={mid - 17} width={12} height={34} fill={PLAN.paper} />
            <text x={x} y={mid} fontSize={8} textAnchor="middle" fill={PLAN.ink} transform={`rotate(-90 ${x} ${mid})`}>{d.toFixed(2)}</text>
          </g>
        );
      })}
    </g>
  );
}

/** A structural grid bubble — a ringed circle carrying a grid label (px coords). */
export function GridBubble({ cx, cy, label, r = 11 }: { cx: number; cy: number; label: string; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={PLAN.paper} stroke={PLAN.grid} strokeWidth={1.2} />
      <text x={cx} y={cy + 3.4} fontSize={9} textAnchor="middle" fill={PLAN.ink} fontWeight={700}>{label}</text>
    </g>
  );
}

/**
 * A full set of structural grid lines + end bubbles. Vertical grid lines carry LETTERS (along the
 * length), horizontal grid lines carry NUMBERS (along the width) — the buildColumnMarks convention.
 * `xs` / `ys` give the px position + label of each line; the plan area is [x0,x1]×[y0,y1] in px.
 */
export function GridLines({
  xs, ys, x0, x1, y0, y1,
}: {
  xs: { px: number; label: string }[];
  ys: { px: number; label: string }[];
  x0: number; x1: number; y0: number; y1: number;
}) {
  return (
    <g>
      {xs.map((c, i) => (
        <g key={`gx${i}`}>
          <line x1={c.px} y1={y0 - 16} x2={c.px} y2={y1} stroke={PLAN.grid} strokeWidth={0.7} strokeDasharray="8 3 2 3" opacity={0.7} />
          <GridBubble cx={c.px} cy={y0 - 28} label={c.label} />
        </g>
      ))}
      {ys.map((rrow, i) => (
        <g key={`gy${i}`}>
          <line x1={x0 - 16} y1={rrow.px} x2={x1} y2={rrow.px} stroke={PLAN.grid} strokeWidth={0.7} strokeDasharray="8 3 2 3" opacity={0.7} />
          <GridBubble cx={x0 - 28} cy={rrow.px} label={rrow.label} />
        </g>
      ))}
    </g>
  );
}

/** A small north arrow (px coords). */
export function NorthArrow({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={13} fill="none" stroke={PLAN.sub} strokeWidth={1} />
      <polygon points={`${x},${y - 11} ${x - 4},${y + 3} ${x + 4},${y + 3}`} fill={PLAN.ink} />
      <text x={x} y={y + 12} fontSize={7} textAnchor="middle" fill={PLAN.ink} fontWeight={700}>N</text>
    </g>
  );
}

/** A proportional graphical scale bar (px coords), labelled in METRES. */
export function ScaleBar({ x, y, ppm, unitM = 1, units = 5 }: { x: number; y: number; ppm: number; unitM?: number; units?: number }) {
  const step = unitM * ppm;
  const w = units * step;
  return (
    <g>
      {Array.from({ length: units }).map((_, i) => (
        <rect key={i} x={x + i * step} y={y} width={step} height={5} fill={i % 2 ? PLAN.ink : PLAN.paper} stroke={PLAN.ink} strokeWidth={0.6} />
      ))}
      <text x={x} y={y + 15} fontSize={8} textAnchor="middle" fill={PLAN.ink}>0</text>
      <text x={x + w} y={y + 15} fontSize={8} textAnchor="middle" fill={PLAN.ink}>{units * unitM} m</text>
      <text x={x + w + 20} y={y + 5} fontSize={8} fill={PLAN.sub}>SCALE (approx)</text>
    </g>
  );
}

/** Re-export so consumers importing the primitive set also get the station type. */
export type { GridStation };
