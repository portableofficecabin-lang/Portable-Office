"use client";

/**
 * 2D ENGINEERING SHEETS — shared SVG primitives (spec §1).
 *
 * Dimension lines, north arrow, scale bar and the plan coordinate helpers, all EXPORT-SAFE:
 *   • LITERAL HEX only — never a Tailwind colour class / CSS var / oklch (html2canvas-pro and the
 *     standalone-SVG export cannot resolve those; see the project's pdf-html2canvas-oklch rule);
 *   • arrowheads are explicit <polygon>, never <marker>/url(#…) — a serialised standalone SVG drops
 *     paint-server references.
 * Plan sheets use the SAME feet-based scale convention as ModulePlan (ppf = clamp(760/L, 15, 34)),
 * origin at the cabin's inner top-left, +x right, +y down.
 */

import { PLAN } from "./planScale";

const arrow = (x: number, y: number, dir: "l" | "r" | "u" | "d"): string => {
  const s = 5;
  if (dir === "l") return `${x},${y} ${x + s},${y - s / 1.6} ${x + s},${y + s / 1.6}`;
  if (dir === "r") return `${x},${y} ${x - s},${y - s / 1.6} ${x - s},${y + s / 1.6}`;
  if (dir === "u") return `${x},${y} ${x - s / 1.6},${y + s} ${x + s / 1.6},${y + s}`;
  return `${x},${y} ${x - s / 1.6},${y - s} ${x + s / 1.6},${y - s}`;
};

/** Horizontal dimension line with polygon arrowheads + centred feet-inches label (px coords). */
export function DimLineH({ x0, x1, y, label }: { x0: number; x1: number; y: number; label: string }) {
  return (
    <g>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={PLAN.dim} strokeWidth={1} />
      <line x1={x0} y1={y - 4} x2={x0} y2={y + 4} stroke={PLAN.dim} strokeWidth={1} />
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke={PLAN.dim} strokeWidth={1} />
      <polygon points={arrow(x0, y, "l")} fill={PLAN.dim} />
      <polygon points={arrow(x1, y, "r")} fill={PLAN.dim} />
      <rect x={(x0 + x1) / 2 - 24} y={y - 8} width={48} height={12} fill={PLAN.paper} />
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
      <rect x={x - 8} y={my - 24} width={12} height={48} fill={PLAN.paper} />
      <text x={x} y={my} fontSize={9} textAnchor="middle" fill={PLAN.ink} transform={`rotate(-90 ${x} ${my})`}>{label}</text>
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

/** A proportional graphical scale bar (px coords), labelled in feet. */
export function ScaleBar({ x, y, ppf }: { x: number; y: number; ppf: number }) {
  const feet = 5;
  const w = feet * ppf;
  return (
    <g>
      {Array.from({ length: feet }).map((_, i) => (
        <rect key={i} x={x + i * ppf} y={y} width={ppf} height={5} fill={i % 2 ? PLAN.ink : PLAN.paper} stroke={PLAN.ink} strokeWidth={0.6} />
      ))}
      <text x={x} y={y + 15} fontSize={8} textAnchor="middle" fill={PLAN.ink}>0</text>
      <text x={x + w} y={y + 15} fontSize={8} textAnchor="middle" fill={PLAN.ink}>{feet}′</text>
      <text x={x + w + 18} y={y + 5} fontSize={8} fill={PLAN.sub}>SCALE (approx)</text>
    </g>
  );
}
