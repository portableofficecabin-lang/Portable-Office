"use client";

/**
 * 2D ENGINEERING SHEETS — cross & longitudinal sections (spec §1/§3).
 *
 * axis="width" (default): a transverse section across the width, showing the roof profile (gable when
 * sloped). axis="length": a longitudinal section along the length through the ridge — flat at ridge
 * height, with internal partitions marked. Both show floor build-up, walls, ceiling and level marks,
 * all from the same dimensions the model + BOQ use. Literal hex.
 */

import { roomRangesMm } from "@/features/cabin-design/furniture/tables/cabinObstacles";
import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import type { CabinModel } from "@/features/cabin-design/model/types";
import { PLAN, MM_PER_FT } from "./planScale";

const ROOF_RISE_FT = 8 / 12;
const feetLabel = (v: number) => (Number.isInteger(v) ? `${v}′-0″` : `${Math.floor(v)}′-${Math.round((v % 1) * 12)}″`);

export function CabinSection({ model, config, axis = "width", title }: {
  model: CabinModel; config: CabinConfig; axis?: "width" | "length"; title?: string;
}) {
  const L = Math.max(1, config.length || 1);
  const W = Math.max(1, config.width || 1);
  const H = Math.max(6, config.height || 8);
  const sloped = model.meta.sloped;
  const rise = sloped ? ROOF_RISE_FT : 0;
  const ridge = H + rise;
  const longitudinal = axis === "length";
  const span = longitudinal ? L : W;
  const top = sloped ? ridge : H;

  const PAD = 54, TOP = 30;
  const sc = Math.min(44, Math.max(12, 560 / span), 290 / (top + 1));
  const svgW = span * sc + PAD * 2 + 60;
  const svgH = top * sc + TOP + 60;
  const floorY = TOP + top * sc;
  const xOf = (ft: number) => PAD + ft * sc;
  const yOf = (ft: number) => floorY - ft * sc;
  const wallT = Math.max(4, 0.35 * sc);

  const rooms = longitudinal ? roomRangesMm(config) : [];
  const heading = title ?? (longitudinal ? "Section B–B (along length, through ridge)" : "Section A–A (across width)");

  const level = (ft: number, label: string) => (
    <g>
      <line x1={xOf(0) - 20} y1={yOf(ft)} x2={xOf(span) + 20} y2={yOf(ft)} stroke={PLAN.sub} strokeWidth={0.6} strokeDasharray="3 3" />
      <text x={xOf(span) + 24} y={yOf(ft) + 3} fontSize={8} fill={PLAN.sub}>{label}</text>
    </g>
  );

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 560) }}>
        <rect x={0} y={0} width={svgW} height={svgH} fill={PLAN.paper} />

        {level(0, "FFL")}
        {level(H, "EAVE / CEILING")}
        {sloped && level(ridge, "RIDGE")}

        {/* ground */}
        <line x1={xOf(0) - 24} y1={floorY} x2={xOf(span) + 24} y2={floorY} stroke={PLAN.ink} strokeWidth={2} />

        {/* floor slab */}
        <rect x={xOf(0)} y={floorY - 6} width={span * sc} height={6} fill="#d9bb8f" stroke={PLAN.wall} strokeWidth={0.8} />

        {/* end walls */}
        <rect x={xOf(0)} y={yOf(H)} width={wallT} height={H * sc} fill={PLAN.wallFill} stroke={PLAN.wall} strokeWidth={1} />
        <rect x={xOf(span) - wallT} y={yOf(H)} width={wallT} height={H * sc} fill={PLAN.wallFill} stroke={PLAN.wall} strokeWidth={1} />

        {/* partitions (longitudinal only) */}
        {rooms.slice(0, -1).map((r, i) => (
          <line key={`p-${i}`} x1={xOf(r.x1 / MM_PER_FT)} y1={yOf(H)} x2={xOf(r.x1 / MM_PER_FT)} y2={yOf(0)} stroke={PLAN.wall} strokeWidth={1.4} strokeDasharray="5 3" />
        ))}

        {/* ceiling */}
        <line x1={xOf(0)} y1={yOf(H) + 3} x2={xOf(span)} y2={yOf(H) + 3} stroke={PLAN.sub} strokeWidth={1} strokeDasharray="5 3" />

        {/* roof */}
        {longitudinal || !sloped ? (
          <rect x={xOf(0)} y={yOf(top) - 8} width={span * sc} height={8} fill="#9aa7b4" stroke={PLAN.wall} strokeWidth={1.2} />
        ) : (
          <polygon points={`${xOf(0)},${yOf(H) - 6} ${xOf(span / 2)},${yOf(ridge) - 6} ${xOf(span)},${yOf(H) - 6} ${xOf(span)},${yOf(H)} ${xOf(span / 2)},${yOf(ridge)} ${xOf(0)},${yOf(H)}`} fill="#9aa7b4" stroke={PLAN.wall} strokeWidth={1.2} />
        )}

        {/* span dim */}
        <line x1={xOf(0)} y1={floorY + 26} x2={xOf(span)} y2={floorY + 26} stroke={PLAN.dim} strokeWidth={1} />
        <text x={xOf(span / 2)} y={floorY + 23} fontSize={9} textAnchor="middle" fill={PLAN.ink}>{feetLabel(span)}</text>

        {/* height dim */}
        <line x1={xOf(0) - 30} y1={floorY} x2={xOf(0) - 30} y2={yOf(top)} stroke={PLAN.dim} strokeWidth={1} />
        <text x={xOf(0) - 33} y={(floorY + yOf(top)) / 2} fontSize={9} textAnchor="middle" fill={PLAN.ink} transform={`rotate(-90 ${xOf(0) - 33} ${(floorY + yOf(top)) / 2})`}>
          {feetLabel(top)}
        </text>

        <text x={xOf(0)} y={svgH - 8} fontSize={9} fill={PLAN.sub}>{heading} — schematic, not to scale</text>
      </svg>
    </div>
  );
}
