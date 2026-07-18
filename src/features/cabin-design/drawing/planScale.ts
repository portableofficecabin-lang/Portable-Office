/**
 * 2D ENGINEERING SHEETS — pure scale/palette/geometry helpers (no React).
 *
 * Kept separate from the SVG primitive components so both stay fast-refresh friendly and so the
 * plan sheets share ONE feet-based scale convention (ppf = clamp(760/L, 15, 34), matching
 * ModulePlan) and one literal-hex palette. Export-safe: literal hex only.
 */

import type { PartSolid } from "@/features/cabin-design/model/types";

export const MM_PER_FT = 304.8;

/** Literal-hex palette shared across every sheet. */
export const PLAN = {
  paper: "#ffffff",
  wall: "#334155",
  wallFill: "#e2e8f0",
  room: "#f8fafc",
  ink: "#0f172a",
  dim: "#475569",
  sub: "#94a3b8",
  sel: "#f59e0b",
  selFill: "#fde68a",
  structure: "#cbd5e1",
  electrical: "#fde68a",
  plumbing: "#bae6fd",
  furniture: "#e7d3b3",
  opening: "#a8c8e0",
  partition: "#c7b299",
} as const;

/** Screen-fit plan scale, px per foot — matches ModulePlan. */
export const planPpf = (Lft: number): number => Math.min(34, Math.max(15, 760 / Math.max(1, Lft)));

/** 3048 → 10′-0″. */
export function ftInLabel(mm: number): string {
  if (!isFinite(mm)) return "";
  const totalIn = Math.round((mm / MM_PER_FT) * 12);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn - ft * 12;
  return inch ? `${ft}′-${inch}″` : `${ft}′-0″`;
}

/** The top-down (xy) bounding rectangle of a solid, in cabin mm. */
export function footprintXY(solid: PartSolid): { x0: number; y0: number; x1: number; y1: number } | null {
  if (solid.kind === "box") return { x0: solid.min.x, y0: solid.min.y, x1: solid.max.x, y1: solid.max.y };
  if (solid.kind === "prism") {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of solid.poly) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    return isFinite(x0) ? { x0, y0, x1, y1 } : null;
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of solid.pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return isFinite(x0) ? { x0, y0, x1, y1 } : null;
}
