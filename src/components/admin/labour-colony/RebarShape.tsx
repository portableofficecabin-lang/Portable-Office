"use client";

import type { ReactNode } from "react";

import type { ShapeCode, ShapeLegs } from "@/lib/quotation/labourColonyRebar";

/**
 * REBAR SHAPE CODES — the bent bar itself, drawn.
 *
 * A Bar Bending Schedule gives a fabricator a cutting length, but a cutting length is not a bar:
 * 1100 mm of T12 can be a straight bar, a staple or a link, and the bender needs to know which.
 * IS 2502 / BS 8666 answer that with a SHAPE CODE, and every real BBS prints the shape beside it.
 * This component draws the four codes the engine emits, dimensioned from the actual leg lengths:
 *
 *   20 — straight bar, no bends
 *   21 — 90° bend at BOTH ends (footing mesh bars, beam bars anchored into the supports)
 *   26 — cranked / L-bar: one 90° kicker at the foot + a lap projection (column & pedestal verticals)
 *   51 — closed rectangular link with two 135° hooks (stirrups and column ties)
 *
 * The diagrams are SCHEMATIC — the legs are drawn in clamped proportion so a 96 mm end bend is still
 * visible against a 1100 mm main leg. The mm values printed on the legs are the true ones, and those
 * are what gets bent. Not a stamped structural drawing.
 *
 * Plain hex colours only — html2canvas (PDF export) cannot parse oklch()/Tailwind colour functions.
 */

const COL = {
  bar: "#dc2626",
  lap: "#b45309",
  dim: "#334155",
  note: "#64748b",
};

/** Short human titles — used on the schedule and in the shape-code legend. */
const SHAPE_TITLE: Record<ShapeCode, string> = {
  20: "Straight bar",
  21: "90° bend both ends",
  26: "Cranked / L-bar + lap",
  51: "Closed link + 135° hooks",
};

export function shapeCodeTitle(code: ShapeCode): string {
  const t: string | undefined = SHAPE_TITLE[code];
  return t ?? `Shape ${String(code)}`;
}

/* ------------------------------------------------------------------ numeric guards */

/**
 * Every leg crosses a module boundary and lands straight in an SVG coordinate, where a single NaN
 * silently blanks the whole diagram. Coerce to a finite, positive number BEFORE any arithmetic.
 */
const mm = (v: number | undefined, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : fallback;

const clampPx = (v: number, lo: number, hi: number): number =>
  Math.min(Math.max(Number.isFinite(v) ? v : lo, lo), hi);

/**
 * Pixel length of a secondary leg, in proportion to the main leg but clamped so it stays legible.
 * A footing bar is 1100 mm of straight with a 96 mm bend — drawn true to scale the bend would be
 * two pixels tall, so the ratio is floored. The LABEL always carries the real dimension.
 */
const legPx = (mainMm: number, thisMm: number, mainPx: number, lo: number, hi: number): number => {
  const ratio = mainMm > 0 ? thisMm / mainMm : 0.25;
  return clampPx(ratio * mainPx, lo, Math.max(lo, hi));
};

/** Bar line weight — a T25 should read heavier than a T8, but must stay inside a 46 px box. */
const barWeight = (diaMm: number): number => clampPx(1.5 + mm(diaMm, 12) / 11, 1.8, 4);

/** Only print a leg dimension when the engine actually gave one. */
function LegLabel(
  { x, y, v, anchor = "middle", fill = COL.dim }:
  { x: number; y: number; v: number | undefined; anchor?: "start" | "middle" | "end"; fill?: string },
) {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return null;
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={6} fontWeight={700} fill={fill}>
      {Math.round(v)}
    </text>
  );
}

/* ------------------------------------------------------------------ the shape itself */

export function RebarShape(
  { code, legs, diaMm, width, height }:
  { code: ShapeCode; legs: ShapeLegs; diaMm: number; width?: number; height?: number },
) {
  const W = clampPx(mm(width, 90), 60, 400);
  const H = clampPx(mm(height, 46), 32, 240);
  const sw = barWeight(diaMm);

  // The real leg dimensions. `a` always exists (it is required on ShapeLegs); b and c are optional
  // and stay `undefined` for the labels, while the DRAWING falls back to a visible default.
  const a = mm(legs?.aMm, 1000);
  const b = mm(legs?.bMm, a * 0.12);
  const c = mm(legs?.cMm, a * 0.12);

  const common = {
    fill: "none",
    stroke: COL.bar,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  let body: ReactNode;

  switch (code) {
    /* ---------------- 20 — straight ---------------- */
    case 20: {
      const y = H * 0.54;
      const x0 = W * 0.09;
      const x1 = W * 0.91;
      body = (
        <g>
          <path d={`M ${x0} ${y} L ${x1} ${y}`} {...common} />
          <LegLabel x={(x0 + x1) / 2} y={y - sw - 3} v={legs?.aMm} />
          <text x={(x0 + x1) / 2} y={y + sw + 9} textAnchor="middle" fontSize={5.5} fill={COL.note}>A</text>
        </g>
      );
      break;
    }

    /* ------- 21 — 90° bend both ends (staple / U on its side) ------- */
    case 21: {
      const y = H * 0.32;
      const x0 = W * 0.15;
      const x1 = W * 0.85;
      const mainPx = x1 - x0;
      const bPx = legPx(a, b, mainPx, 8, H * 0.5);
      const cPx = legPx(a, c, mainPx, 8, H * 0.5);
      body = (
        <g>
          <path
            d={`M ${x0} ${y + bPx} L ${x0} ${y} L ${x1} ${y} L ${x1} ${y + cPx}`}
            {...common}
          />
          {/* A — the long straight leg */}
          <LegLabel x={(x0 + x1) / 2} y={y - sw - 3} v={legs?.aMm} />
          {/* B / C — the two 90° end bends, turned down */}
          <LegLabel x={x0 - sw - 2} y={y + bPx / 2 + 2} v={legs?.bMm} anchor="end" />
          <LegLabel x={x1 + sw + 2} y={y + cPx / 2 + 2} v={legs?.cMm} anchor="start" />
          <text x={(x0 + x1) / 2} y={y + 9} textAnchor="middle" fontSize={5.5} fill={COL.note}>A</text>
          <text x={x0 + 3} y={y + bPx + 6} textAnchor="middle" fontSize={5.5} fill={COL.note}>B</text>
          <text x={x1 - 3} y={y + cPx + 6} textAnchor="middle" fontSize={5.5} fill={COL.note}>C</text>
        </g>
      );
      break;
    }

    /* ---- 26 — cranked / L-bar: kicker at the foot, lap dashed at the far end ---- */
    case 26: {
      const xMain = W * 0.62;
      const yBot = H * 0.78;
      const ySolid = H * 0.32;      // top of the solid leg A
      const yLap = H * 0.10;        // top of the dashed lap projection C
      const aPx = yBot - ySolid;
      const bPx = legPx(a, b, aPx, 9, W * 0.36);
      body = (
        <g>
          {/* A + B — the vertical bar and its 90° kicker into the footing */}
          <path d={`M ${xMain - bPx} ${yBot} L ${xMain} ${yBot} L ${xMain} ${ySolid}`} {...common} />
          {/* C — the lap projection for the lift above, shown dashed (it is spliced, not bent) */}
          <path
            d={`M ${xMain} ${ySolid} L ${xMain} ${yLap}`}
            fill="none"
            stroke={COL.lap}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray="3 2"
          />
          <LegLabel x={xMain + sw + 2} y={(ySolid + yBot) / 2 + 2} v={legs?.aMm} anchor="start" />
          <LegLabel x={xMain - bPx / 2} y={yBot + 7} v={legs?.bMm} />
          <LegLabel x={xMain + sw + 2} y={(yLap + ySolid) / 2 + 2} v={legs?.cMm} anchor="start" fill={COL.lap} />
          <text x={xMain - 4} y={(ySolid + yBot) / 2 + 2} textAnchor="end" fontSize={5.5} fill={COL.note}>A</text>
          <text x={xMain - bPx - 3} y={yBot - 3} textAnchor="middle" fontSize={5.5} fill={COL.note}>B</text>
          <text x={xMain - 4} y={(yLap + ySolid) / 2 + 2} textAnchor="end" fontSize={5.5} fill={COL.note}>C</text>
        </g>
      );
      break;
    }

    /* ---- 51 — closed link, two 135° hooks turned into the section at one corner ---- */
    case 51: {
      const maxW = W * 0.5;
      const maxH = H * 0.52;
      // A = outer width, B = outer depth. Keep the true proportion, but never so extreme that the
      // link collapses into a line.
      const aspect = clampPx(a / Math.max(1, b), 0.4, 2.6);
      let rw = maxW;
      let rh = rw / aspect;
      if (rh > maxH) { rh = maxH; rw = rh * aspect; }
      rw = clampPx(rw, 14, maxW);
      rh = clampPx(rh, 12, maxH);

      const cx = W * 0.5;
      const cy = H * 0.5;
      const rx0 = cx - rw / 2;
      const ry0 = cy - rh / 2;
      const rx1 = rx0 + rw;
      const ry1 = ry0 + rh;

      // 135° hook: the bar end turns back INTO the core at 45° to the edge. Two of them, side by
      // side at the closing corner — that is what makes the link a closed, seismic-detailed link.
      const hookLen = legPx(a, c, rw, 6, Math.min(rw, rh) * 0.6);
      const d = hookLen * 0.7071;   // 45° component
      const off = Math.min(3.2, rw * 0.18);

      body = (
        <g>
          <rect
            x={rx0} y={ry0} width={rw} height={rh} rx={1.6}
            fill="none" stroke={COL.bar} strokeWidth={sw} strokeLinejoin="round"
          />
          {/* the two hook tails, turned into the section */}
          <path d={`M ${rx0} ${ry0} L ${rx0 + d} ${ry0 + d}`} {...common} />
          <path d={`M ${rx0 + off} ${ry0} L ${rx0 + off + d} ${ry0 + d}`} {...common} />

          {/* A = outer width (below), B = outer depth (left), C = hook length (above the corner).
              The C letter goes INSIDE the link at the hook tips — outside the box it collides with
              the B dimension on a small link, which is exactly where a tie is smallest. */}
          <LegLabel x={cx} y={ry1 + 7} v={legs?.aMm} />
          <LegLabel x={rx0 - 3} y={cy + 2} v={legs?.bMm} anchor="end" />
          <LegLabel x={rx0 + 1} y={ry0 - 3} v={legs?.cMm} anchor="start" />
          <text x={rx1 + 3} y={ry1} textAnchor="start" fontSize={5.5} fill={COL.note}>A</text>
          <text x={rx1 + 3} y={cy - 3} textAnchor="start" fontSize={5.5} fill={COL.note}>B</text>
          <text x={rx0 + off + d + 2.5} y={ry0 + d + 3} textAnchor="start" fontSize={5.5} fill={COL.note}>C</text>
        </g>
      );
      break;
    }

    /* ---- unknown code (the engine only emits 20/21/26/51) — fail soft, draw a plain bar ---- */
    default: {
      const y = H * 0.54;
      body = (
        <g>
          <path d={`M ${W * 0.09} ${y} L ${W * 0.91} ${y}`} {...common} />
          <text x={W / 2} y={y + 10} textAnchor="middle" fontSize={5.5} fill={COL.note}>shape {String(code)}</text>
        </g>
      );
      break;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={`Shape code ${String(code)} — ${shapeCodeTitle(code)}`}
      className="block h-auto max-w-full"
      style={{ overflow: "visible" }}
    >
      <title>{`Shape ${String(code)} — ${shapeCodeTitle(code)}`}</title>
      {body}
    </svg>
  );
}
