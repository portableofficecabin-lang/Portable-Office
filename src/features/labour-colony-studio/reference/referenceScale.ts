/**
 * LABOUR COLONY — REFERENCE GA DRAWING: scale, palette and grid helpers (pure, no React).
 *
 * The reference sheet is a MILLIMETRE drawing — the note in its corner reads "All dimensions are in
 * mm", exactly like the consultant tender drawings it is modelled on. The colony model is in metres,
 * so every dimension printed on this sheet passes through `mmText()` and nothing else.
 *
 * EXPORT-SAFE: literal hex only (html2canvas cannot resolve Tailwind's oklch tokens — see the
 * project's pdf-html2canvas-oklch rule), and the primitives that consume this palette draw explicit
 * <polygon> arrowheads rather than <marker>/url(#…) paint-server references.
 */

import type { ColonyModel } from "../model/types";
import { footprintXY, parseGrid } from "../drawing/planScale";

/** The reference sheet's palette — a CAD issue: near-black line work on white paper. */
export const REF = {
  paper: "#ffffff",
  ink: "#0f172a",
  line: "#111827",
  thin: "#475569",
  hair: "#cbd5e1",
  note: "#64748b",
  grid: "#64748b",
  wallFill: "#94a3b8",
  roomFill: "#ffffff",
  verandaFill: "#f1f5f9",
  stairFill: "#e2e8f0",
  door: "#b45309",
  window: "#1d4ed8",
  brace: "#0ea5e9",
  /** Hand railing — veranda and stair, distinct from the frame it is bolted to. */
  railing: "#0891b2",
  /** The bolted cross-support node marked at every brace end. */
  boltNode: "#be123c",
  frame: "#334155",
  roof: "#475569",
  sel: "#f59e0b",
} as const;

/** Metres → whole millimetres, the only number this sheet prints. */
export const mmOf = (m: number): number => Math.round((Number.isFinite(m) ? m : 0) * 1000);

/** Metres → the millimetre TEXT a CAD dimension carries ("29700"), unseparated by design. */
export const mmText = (m: number): string => String(mmOf(m));

/**
 * Screen-fit scale in px per metre for a view whose largest side is `spanM`. Wider band than the
 * fabrication sheets because the reference sheet places several views side by side.
 */
export const refPpm = (spanM: number, targetPx = 900): number =>
  Math.min(60, Math.max(3.5, targetPx / Math.max(0.001, spanM)));

/** One grid line: where it is (metres) and the bubble label it carries. */
export interface RefGridStation {
  m: number;
  label: string;
}

/**
 * The structural grid, read from the ground-floor COLUMN parts — the same `buildColumnMarks`
 * convention the fabrication set and the civil drawings use: grid LETTERS run along the building
 * length (x), grid NUMBERS across the width (y). The reference sheet keeps that convention rather
 * than the sample drawing's, so one column carries one name everywhere in this product.
 */
export function gridStations(model: ColonyModel, axis: "x" | "y"): RefGridStation[] {
  const out: RefGridStation[] = [];
  for (const p of model.parts) {
    if (p.kind !== "column" || (p.floor ?? 0) !== 0) continue;
    const f = footprintXY(p.solid);
    const g = parseGrid(p.grid);
    if (!f || !g) continue;
    const at = axis === "x" ? (f.x0 + f.x1) / 2 : (f.y0 + f.y1) / 2;
    const label = axis === "x" ? g.letter : g.num;
    if (!out.some((s) => Math.abs(s.m - at) < 0.05)) out.push({ m: at, label });
  }
  return out.sort((a, b) => a.m - b.m);
}

/** Distinct, ascending stations from raw metre coordinates (millimetre tolerant). */
export function stationsFrom(values: number[], labelOf: (i: number) => string): RefGridStation[] {
  const sorted = [...values].sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of sorted) if (!out.some((o) => Math.abs(o - v) < 0.005)) out.push(v);
  return out.map((m, i) => ({ m, label: labelOf(i) }));
}
