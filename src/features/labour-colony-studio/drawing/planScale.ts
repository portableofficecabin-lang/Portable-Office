/**
 * LABOUR COLONY 2D FABRICATION SHEETS — pure scale / palette / geometry helpers (no React, no three).
 *
 * The colony model is in METRES (x = length, y = width, z = height; ground z = 0). Unlike the cabin
 * sheets (which work in feet-inches off a mm model), every helper here consumes metres directly and
 * projects them onto SVG pixel space. Kept separate from the SVG primitive components so both stay
 * fast-refresh friendly and share ONE metre-based scale convention and one literal-hex palette.
 *
 * EXPORT-SAFE: literal hex only — never a Tailwind colour class / CSS var / oklch token (html2canvas
 * cannot resolve those; see the project's pdf-html2canvas-oklch rule). The primitives that consume
 * this palette emit explicit <polygon> arrowheads, never <marker>/url(#…) paint-server refs, so a
 * serialised standalone SVG survives the PDF/PNG export path.
 */

import type { ModelBounds, PartSolid } from "@/features/labour-colony-studio/model/types";

/** Literal-hex palette shared across every colony sheet. */
export const PLAN = {
  paper: "#ffffff",
  ink: "#0f172a",
  dim: "#475569",
  sub: "#94a3b8",
  rule: "#cbd5e1",
  hair: "#e2e8f0",
  grid: "#64748b",
  sel: "#f59e0b",
  selFill: "#fde68a",
  // structural families
  column: "#334155",
  columnFill: "#cbd5e1",
  beam: "#475569",
  joist: "#94a3b8",
  brace: "#0ea5e9",
  // substructure
  footing: "#78716c",
  footingFill: "#e7e2dc",
  pedestal: "#8b8377",
  pcc: "#cbd5e1",
  plinth: "#a8a29e",
  // connections
  plate: "#3f3f46",
  plateFill: "#e5e7eb",
  bolt: "#1f2937",
  weld: "#ef4444",
  // envelope
  wallFill: "#eef2f7",
  roof: "#9aa7b4",
  opening: "#a8c8e0",
  door: "#e8d3b0",
} as const;

/**
 * Screen-fit plan scale, px per METRE, for a plan whose largest side is `spanM` metres. Clamped so a
 * tiny single-bay colony never blows up and a large G+1 block still fits the sheet width.
 */
export const planPpm = (spanM: number): number => Math.min(46, Math.max(5, 620 / Math.max(1, spanM)));

/** Metres as a dimension label, e.g. 3.6 → "3.60 m". */
export function mLabel(m: number): string {
  if (!Number.isFinite(m)) return "";
  return `${m.toFixed(2)} m`;
}

/** Metres as a millimetre label, e.g. 0.32 → "320". Used on zoomed connection details. */
export function mmLabel(m: number): string {
  if (!Number.isFinite(m)) return "";
  return `${Math.round(m * 1000)}`;
}

/** The top-down (xy) bounding rectangle of a solid, in colony metres. */
export function footprintXY(solid: PartSolid): { x0: number; y0: number; x1: number; y1: number } | null {
  if (solid.kind === "box") return { x0: solid.min.x, y0: solid.min.y, x1: solid.max.x, y1: solid.max.y };
  if (solid.kind === "prism") {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of solid.poly) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    return Number.isFinite(x0) ? { x0, y0, x1, y1 } : null;
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of solid.pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return Number.isFinite(x0) ? { x0, y0, x1, y1 } : null;
}

/** The vertical (z) extent of a solid, in colony metres. */
export function spanZ(solid: PartSolid): { z0: number; z1: number } | null {
  if (solid.kind === "box") return { z0: solid.min.z, z1: solid.max.z };
  if (solid.kind === "prism") return { z0: solid.z0, z1: solid.z1 };
  let z0 = Infinity, z1 = -Infinity;
  for (const p of solid.pts) { z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  return Number.isFinite(z0) ? { z0, z1 } : null;
}

/** Plan centre (metres) of a solid, or null. */
export function planCentre(solid: PartSolid): { cx: number; cy: number } | null {
  const f = footprintXY(solid);
  return f ? { cx: (f.x0 + f.x1) / 2, cy: (f.y0 + f.y1) / 2 } : null;
}

/** A single grid station: its px position and its metre coordinate + label. */
export interface GridStation {
  m: number;
  label: string;
}

/**
 * Parse a grid reference "A-1" → { letter: "A", num: "1" }. The letter names the vertical grid line
 * (along the length / x), the number the horizontal grid line (along the width / y) — the same
 * convention buildColumnMarks emits.
 */
export function parseGrid(grid: string | undefined): { letter: string; num: string } | null {
  if (!grid) return null;
  const i = grid.indexOf("-");
  if (i < 0) return null;
  return { letter: grid.slice(0, i), num: grid.slice(i + 1) };
}

/** Plan span (metres) of a model's bounds. */
export function planSpan(bounds: ModelBounds): { L: number; D: number } {
  return { L: Math.max(0.001, bounds.max.x - bounds.min.x), D: Math.max(0.001, bounds.max.y - bounds.min.y) };
}
