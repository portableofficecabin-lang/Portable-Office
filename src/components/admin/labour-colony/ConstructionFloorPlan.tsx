"use client";

import { toMM } from "@/lib/quotation/labourColonyPlan";
import type { ConstructionPlan } from "@/lib/quotation/labourColonyPlan";

/**
 * Professional architectural FLOOR PLAN for the Labour Colony (spec §6/§7).
 *
 * Reproduces the client CAD reference for a double-banked labour colony: two
 * back-to-back room rows, a hatched VERANDA band on the top and bottom outer
 * edges, STAIRCASE blocks at opposite ends, room doors opening OUT into the
 * verandas (magenta swing arcs), sliding-window (S/W) marks on the same wall,
 * and full architectural dimension chains (per-bay + overall width, banded
 * depth) with 45° ticks.
 *
 * Pure display — geometry comes straight from buildConstructionPlan() so the
 * drawing, the beam layout and the civil BOQ all read the same numbers.
 * Schematic construction reference, not a stamped sheet.
 */

const COL = {
  wall: "#111827",
  room: "#ffffff",
  roomLabel: "#1f2937",
  verandaHatch: "#9a9a2e",
  verandaFill: "#fbfbe3",
  verandaLabel: "#6b6b1e",
  verandaStroke: "#b6b64a",
  stair: "#fdfdb0",
  stairTread: "#c9a100",
  stairLabel: "#6b5e00",
  door: "#c800c8",
  window: "#e00000",
  dim: "#334155",
};

const eps = 1e-6;

export function ConstructionFloorPlan({ plan }: { plan: ConstructionPlan }) {
  // ---- bounds over every rect (rooms + verandas + stairs); stairs may be at x<0 ----
  const rects = [...plan.rooms, ...plan.verandas, ...plan.stairs];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.d);
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 1; maxY = 1; }

  const spanX = Math.max(0.5, maxX - minX);
  const spanY = Math.max(0.5, maxY - minY);
  const S = Math.max(12, Math.min(40, 760 / spanX)); // px per metre
  const PAD = 72;

  // metre -> screen (min corner lands at 0 inside the padded <g>)
  const X = (m: number) => (m - minX) * S;
  const Y = (m: number) => (m - minY) * S;
  const L = (m: number) => m * S;

  const CW = spanX * S;
  const CH = spanY * S;
  const totalW = CW + PAD * 2;
  const totalH = CH + PAD * 2;

  // ---- WIDTH dimension chain: [left stair] + per-bay + [right stair] ----
  type Seg = { start: number; len: number; label: string };
  const leftStair: Seg[] = plan.stairs.filter((s) => s.x < -eps).map((s) => ({ start: s.x, len: s.w, label: `${toMM(s.w)}` }));
  const rightStair: Seg[] = plan.stairs.filter((s) => s.x > plan.blockW - eps).map((s) => ({ start: s.x, len: s.w, label: `${toMM(s.w)}` }));
  const baySegs: Seg[] = plan.widthChain.map((t) => ({ start: t.start, len: t.len, label: t.label }));
  const widthSegs: Seg[] = [...leftStair, ...baySegs, ...rightStair]
    .filter((s, i, arr) => arr.findIndex((o) => Math.round(o.start * 1000) === Math.round(s.start * 1000)) === i)
    .sort((a, b) => a.start - b.start);
  const wBounds = widthSegs.length
    ? [...widthSegs.map((s) => s.start), widthSegs[widthSegs.length - 1].start + widthSegs[widthSegs.length - 1].len]
    : [];
  const overallWmm = toMM(widthSegs.reduce((a, s) => a + s.len, 0));

  // ---- DEPTH dimension chain (left, vertical banded) ----
  const depthSegs = plan.depthChain;
  const dBounds = depthSegs.length
    ? [...depthSegs.map((s) => s.start), depthSegs[depthSegs.length - 1].start + depthSegs[depthSegs.length - 1].len]
    : [];

  // dim-line offsets (group coords; negative = up / left of the drawing)
  const WBAR = -20;   // per-bay width line
  const WOVR = -42;   // overall width line
  const DBAR = -28;   // depth line (left)

  const fsRoom = Math.max(9, Math.min(13, S * 0.42));
  const fsVer = Math.max(8, Math.min(12, S * 0.34));
  const fsStair = Math.max(8, Math.min(11, S * 0.32));

  // 45° architectural tick centred on (x,y)
  const tick = (x: number, y: number, key: string) => (
    <line key={key} x1={x - 3.5} y1={y + 3.5} x2={x + 3.5} y2={y - 3.5} stroke={COL.dim} strokeWidth={1} />
  );

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="font-display font-bold text-sm text-slate-800">Construction Floor Plan</div>
        <div className="text-[10px] text-slate-400">
          {plan.banked === "double" ? "Double-banked" : "Single-banked"} · {plan.bays} bays · overall {plan.overallW.toFixed(1)} × {plan.overallD.toFixed(1)} m · not to scale
        </div>
      </div>

      {/* required: title above the drawing, centred, bold */}
      <div className="mb-1 text-center font-display text-base font-bold tracking-wide text-slate-900">
        {plan.title}
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${totalW} ${totalH}`} className="h-auto w-full min-w-[680px]">
          <defs>
            <pattern id="veranda-hatch" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width={8} height={8} fill={COL.verandaFill} />
              <line x1={0} y1={0} x2={0} y2={8} stroke={COL.verandaHatch} strokeWidth={1} />
            </pattern>
          </defs>

          <g transform={`translate(${PAD},${PAD})`}>
            {/* 2 — VERANDAS (hatched olive bands) */}
            {plan.verandas.map((v, i) => (
              <g key={`ver-${i}`}>
                <rect x={X(v.x)} y={Y(v.y)} width={L(v.w)} height={L(v.d)} fill="url(#veranda-hatch)" stroke={COL.verandaStroke} strokeWidth={1} />
                <text x={X(v.x + v.w / 2)} y={Y(v.y + v.d / 2)} textAnchor="middle" dominantBaseline="middle"
                  fontSize={fsVer} fontWeight={700} letterSpacing={2} fill={COL.verandaLabel}>
                  {v.label ?? "VERANDA"}
                </text>
              </g>
            ))}

            {/* 3 — ROOMS (white, thick walls) */}
            {plan.rooms.map((r) => (
              <g key={`room-${r.no}`}>
                <rect x={X(r.x)} y={Y(r.y)} width={L(r.w)} height={L(r.d)} fill={COL.room} stroke={COL.wall} strokeWidth={2.2} />
                <text x={X(r.x + r.w / 2)} y={Y(r.y + r.d / 2)} textAnchor="middle" dominantBaseline="middle"
                  fontSize={fsRoom} fontWeight={700} fill={COL.roomLabel}>
                  {r.label}
                </text>
              </g>
            ))}

            {/* bold block outline (excludes staircases) */}
            <rect x={X(0)} y={Y(0)} width={L(plan.blockW)} height={L(plan.blockD)} fill="none" stroke={COL.wall} strokeWidth={2.2} />

            {/* 4 — STAIRCASES (light-yellow + tread lines + rotated label) */}
            {plan.stairs.map((s, i) => {
              const sx = X(s.x), sy = Y(s.y), sw = L(s.w), sh = L(s.d);
              const treads = 6;
              const cx = sx + sw / 2, cy = sy + sh / 2;
              return (
                <g key={`stair-${i}`}>
                  <rect x={sx} y={sy} width={sw} height={sh} fill={COL.stair} stroke={COL.stairTread} strokeWidth={1.4} />
                  {Array.from({ length: treads }, (_, t) => (
                    <line key={t} x1={sx} y1={sy + (sh * (t + 1)) / (treads + 1)} x2={sx + sw} y2={sy + (sh * (t + 1)) / (treads + 1)}
                      stroke={COL.stairTread} strokeWidth={0.8} />
                  ))}
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={fsStair} fontWeight={700}
                    letterSpacing={1} fill={COL.stairLabel} transform={`rotate(-90 ${cx} ${cy})`}>
                    {s.label ?? "STAIRCASE"}
                  </text>
                </g>
              );
            })}

            {/* 5 — DOORS + WINDOWS on each room's veranda-facing wall */}
            {plan.rooms.map((r) => {
              const up = r.doorSide === "top";            // engine emits only top/bottom
              const dir = up ? -1 : 1;                    // into the veranda (y-down)
              const wallYm = up ? r.y : r.y + r.d;
              const wy = Y(wallYm);

              // door (right portion of the bay) — opening + swing arc + leaf
              const doorWm = Math.min(0.9, r.w * 0.3);
              const doorX0 = r.x + r.w * 0.55;
              const hx = X(doorX0), hy = wy;
              const rad = L(doorWm);
              const tipx = hx, tipy = hy + dir * rad;      // leaf swung 90° into veranda
              const farx = hx + rad, fary = hy;            // far jamb on the wall
              const sweep = dir < 0 ? 1 : 0;               // bulge INTO the veranda

              // window (left portion) — thick red S/W line on the same wall
              const winWm = Math.min(1.2, r.w * 0.35);
              const winX0 = r.x + r.w * 0.12;
              const wx0 = X(winX0), wx1 = X(winX0 + winWm);

              return (
                <g key={`open-${r.no}`}>
                  {/* window */}
                  <line x1={wx0} y1={wy} x2={wx1} y2={wy} stroke={COL.window} strokeWidth={3} />
                  <text x={(wx0 + wx1) / 2} y={wy + dir * 11} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={COL.window}>
                    S/W
                  </text>
                  {/* door opening (erase wall) + swing arc + leaf */}
                  <line x1={hx} y1={hy} x2={farx} y2={fary} stroke="#ffffff" strokeWidth={4} />
                  <path d={`M ${tipx} ${tipy} A ${rad} ${rad} 0 0 ${sweep} ${farx} ${fary}`} fill="none" stroke={COL.door} strokeWidth={1.2} />
                  <line x1={hx} y1={hy} x2={tipx} y2={tipy} stroke={COL.door} strokeWidth={2} />
                </g>
              );
            })}

            {/* 6a — TOP width chain (per-bay) + OVERALL */}
            {wBounds.length > 1 && (
              <g>
                {/* per-bay line + extension lines + ticks */}
                <line x1={X(wBounds[0])} y1={WBAR} x2={X(wBounds[wBounds.length - 1])} y2={WBAR} stroke={COL.dim} strokeWidth={1} />
                {wBounds.map((b, i) => (
                  <g key={`wb-${i}`}>
                    <line x1={X(b)} y1={0} x2={X(b)} y2={WBAR} stroke={COL.dim} strokeWidth={0.6} />
                    {tick(X(b), WBAR, `wt-${i}`)}
                  </g>
                ))}
                {widthSegs.map((s, i) => (
                  <text key={`wl-${i}`} x={X(s.start + s.len / 2)} y={WBAR - 4} textAnchor="middle" fontSize={8.5} fill={COL.dim}>
                    {s.label}
                  </text>
                ))}
                {/* overall line above the per-bay chain */}
                <line x1={X(wBounds[0])} y1={WOVR} x2={X(wBounds[wBounds.length - 1])} y2={WOVR} stroke={COL.dim} strokeWidth={1} />
                <line x1={X(wBounds[0])} y1={WBAR} x2={X(wBounds[0])} y2={WOVR} stroke={COL.dim} strokeWidth={0.6} />
                <line x1={X(wBounds[wBounds.length - 1])} y1={WBAR} x2={X(wBounds[wBounds.length - 1])} y2={WOVR} stroke={COL.dim} strokeWidth={0.6} />
                {tick(X(wBounds[0]), WOVR, "wo-0")}
                {tick(X(wBounds[wBounds.length - 1]), WOVR, "wo-1")}
                <text x={CW / 2} y={WOVR - 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={COL.dim}>
                  {overallWmm} OVERALL
                </text>
              </g>
            )}

            {/* 6b — LEFT depth chain (vertical, banded) */}
            {dBounds.length > 1 && (
              <g>
                <line x1={DBAR} y1={Y(dBounds[0])} x2={DBAR} y2={Y(dBounds[dBounds.length - 1])} stroke={COL.dim} strokeWidth={1} />
                {dBounds.map((b, i) => (
                  <g key={`db-${i}`}>
                    <line x1={0} y1={Y(b)} x2={DBAR} y2={Y(b)} stroke={COL.dim} strokeWidth={0.6} />
                    {tick(DBAR, Y(b), `dt-${i}`)}
                  </g>
                ))}
                {depthSegs.map((s, i) => {
                  const cy = Y(s.start + s.len / 2);
                  return (
                    <text key={`dl-${i}`} x={DBAR - 7} y={cy} textAnchor="middle" fontSize={8.5} fill={COL.dim}
                      transform={`rotate(-90 ${DBAR - 7} ${cy})`}>
                      {s.label}
                    </text>
                  );
                })}
              </g>
            )}
          </g>
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm border" style={{ background: COL.verandaFill, borderColor: COL.verandaHatch }} /> Veranda</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm border" style={{ background: COL.stair, borderColor: COL.stairTread }} /> Staircase</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4" style={{ background: COL.door }} /> Door + swing</span>
        <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4" style={{ background: COL.window }} /> S/W sliding window</span>
        <span className="text-slate-400">Dimensions in mm · not to scale</span>
      </div>
    </div>
  );
}
