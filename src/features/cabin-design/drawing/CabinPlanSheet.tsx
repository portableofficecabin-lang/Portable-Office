"use client";

/**
 * 2D ENGINEERING SHEETS — the generic model-driven top-down plan (spec §1).
 *
 * Renders the cabin shell (outer wall, rooms, partitions, door/window openings) and overlays a
 * chosen set of layers as CLICKABLE, labelled footprints taken straight from the shared model — so
 * one component produces the Roof, Electrical, Plumbing, Partition, Furniture and Base-frame sheets
 * by varying `show`. Every element is drawn in literal hex at the same feet-based scale as
 * ModulePlan, so it exports cleanly through the existing sheet→PDF pipeline.
 */

import { roomRangesMm } from "@/features/cabin-design/furniture/tables/cabinObstacles";
import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import type { CabinModel, CabinPart, PartKind, PartLayer } from "@/features/cabin-design/model/types";
import { DimLineH, DimLineV, NorthArrow, ScaleBar } from "./sheetPrimitives";
import { PLAN, footprintXY, ftInLabel, planPpf, MM_PER_FT } from "./planScale";

const PAD = 46;
const DIM_GAP = 26;

const LAYER_FILL: Record<PartLayer, string> = {
  structure: PLAN.structure, walls: PLAN.wallFill, roof: "#cbd5e1", openings: PLAN.opening,
  electrical: PLAN.electrical, plumbing: PLAN.plumbing, furniture: PLAN.furniture,
};

export interface CabinPlanSheetProps {
  model: CabinModel;
  config: CabinConfig;
  /** Which layers to overlay as content. */
  show: PartLayer[];
  /** Optional finer filter — only these kinds from the shown layers. */
  kinds?: PartKind[];
  title: string;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  labels?: boolean;
  /** Roof-plan mode: draw ridge + slope arrows instead of interior content. */
  roof?: boolean;
}

export function CabinPlanSheet({ model, config, show, kinds, title, selectedId, onSelect, labels = true, roof = false }: CabinPlanSheetProps) {
  const L = Math.max(1, config.length || 1);
  const W = Math.max(1, config.width || 1);
  const ppf = planPpf(L);
  const planW = L * ppf, planH = W * ppf;
  const mmX = (mm: number) => PAD + (mm / MM_PER_FT) * ppf;
  const mmY = (mm: number) => PAD + (mm / MM_PER_FT) * ppf;
  const svgW = planW + PAD * 2 + 40;
  const svgH = planH + PAD * 2 + 40;

  const rooms = roomRangesMm(config);
  const roomPurpose = (i: number) => config.roomPurposes?.[i] || `Room ${i + 1}`;

  const showSet = new Set(show);
  const kindSet = kinds ? new Set(kinds) : null;
  const content = roof ? [] : model.parts.filter((p) => showSet.has(p.layer) && (!kindSet || kindSet.has(p.kind)));

  // context openings always drawn faintly for orientation
  const openings = model.parts.filter((p) => p.kind === "door" || p.kind === "window");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 620) }}>
        <rect x={0} y={0} width={svgW} height={svgH} fill={PLAN.paper} />

        {/* room fills */}
        {rooms.map((r) => (
          <rect key={`room-${r.index}`} x={mmX(r.x0)} y={mmY(0)} width={mmX(r.x1) - mmX(r.x0)} height={planH} fill={PLAN.room} />
        ))}

        {/* outer wall */}
        <rect x={mmX(0)} y={mmY(0)} width={planW} height={planH} fill="none" stroke={PLAN.wall} strokeWidth={3} />

        {/* partitions */}
        {rooms.slice(0, -1).map((r, i) => (
          <line key={`part-${i}`} x1={mmX(r.x1)} y1={mmY(0)} x2={mmX(r.x1)} y2={mmY(0) + planH} stroke={PLAN.wall} strokeWidth={2} strokeDasharray={roof ? "4 3" : undefined} />
        ))}

        {/* room labels */}
        {rooms.map((r) => (
          <text key={`rl-${r.index}`} x={(mmX(r.x0) + mmX(r.x1)) / 2} y={mmY(0) + planH / 2} fontSize={10} textAnchor="middle" fill={PLAN.sub} fontWeight={600}>
            {roomPurpose(r.index)}
          </text>
        ))}

        {/* faint openings for orientation */}
        {openings.map((p) => {
          const f = footprintXY(p.solid);
          if (!f) return null;
          return (
            <rect key={`op-${p.id}`} x={mmX(f.x0)} y={mmY(f.y0)} width={Math.max(3, mmX(f.x1) - mmX(f.x0))} height={Math.max(3, mmY(f.y1) - mmY(f.y0))}
              fill={p.kind === "window" ? PLAN.opening : "#cbd5e1"} stroke={PLAN.wall} strokeWidth={0.8} opacity={roof ? 0.25 : 0.6} />
          );
        })}

        {/* roof-plan overlay: ridge along the length + slope arrows */}
        {roof && model.meta.sloped && (
          <g>
            <line x1={mmX(0)} y1={mmY(W * MM_PER_FT / 2)} x2={mmX(L * MM_PER_FT)} y2={mmY(W * MM_PER_FT / 2)} stroke={PLAN.ink} strokeWidth={2} />
            <text x={mmX(L * MM_PER_FT / 2)} y={mmY(W * MM_PER_FT / 2) - 4} fontSize={9} textAnchor="middle" fill={PLAN.ink} fontWeight={700}>RIDGE</text>
            {[0.25, 0.75].map((fy, i) => (
              <g key={i}>
                <line x1={mmX(L * MM_PER_FT * 0.5)} y1={mmY(W * MM_PER_FT / 2)} x2={mmX(L * MM_PER_FT * 0.5)} y2={mmY(W * MM_PER_FT * fy)} stroke={PLAN.sub} strokeWidth={1} markerEnd="" />
                <text x={mmX(L * MM_PER_FT * 0.5) + 6} y={mmY(W * MM_PER_FT * fy)} fontSize={8} fill={PLAN.sub}>fall →</text>
              </g>
            ))}
          </g>
        )}
        {roof && !model.meta.sloped && (
          <text x={mmX(L * MM_PER_FT / 2)} y={mmY(W * MM_PER_FT / 2)} fontSize={10} textAnchor="middle" fill={PLAN.sub}>FLAT ROOF — internal drain</text>
        )}

        {/* content overlay */}
        {content.map((p) => {
          const f = footprintXY(p.solid);
          if (!f) return null;
          const x = mmX(f.x0), y = mmY(f.y0);
          const w = Math.max(6, mmX(f.x1) - mmX(f.x0));
          const h = Math.max(6, mmY(f.y1) - mmY(f.y0));
          const sel = p.id === selectedId;
          return (
            <g key={p.id} onClick={() => onSelect?.(p.id)} style={{ cursor: onSelect ? "pointer" : undefined }}>
              <rect x={x} y={y} width={w} height={h} rx={2}
                fill={sel ? PLAN.selFill : LAYER_FILL[p.layer]} stroke={sel ? PLAN.sel : PLAN.wall} strokeWidth={sel ? 2 : 1} />
              {labels && w > 22 && h > 10 && (
                <text x={x + w / 2} y={y + h / 2 + 3} fontSize={8} textAnchor="middle" fill={PLAN.ink}>{shortLabel(p)}</text>
              )}
            </g>
          );
        })}

        {/* overall dimensions */}
        <DimLineH x0={mmX(0)} x1={mmX(L * MM_PER_FT)} y={mmY(0) - DIM_GAP} label={ftInLabel(L * MM_PER_FT)} />
        <DimLineV y0={mmY(0)} y1={mmY(W * MM_PER_FT)} x={mmX(0) - DIM_GAP} label={ftInLabel(W * MM_PER_FT)} />

        {/* per-room widths */}
        {rooms.length > 1 && rooms.map((r) => (
          <DimLineH key={`rd-${r.index}`} x0={mmX(r.x0)} x1={mmX(r.x1)} y={mmY(W * MM_PER_FT) + DIM_GAP} label={ftInLabel(r.x1 - r.x0)} />
        ))}

        <NorthArrow x={svgW - 26} y={30} />
        <ScaleBar x={mmX(0)} y={svgH - 20} ppf={ppf} />
        <text x={mmX(0)} y={mmY(0) + planH + (rooms.length > 1 ? DIM_GAP + 22 : 16)} fontSize={9} fill={PLAN.sub}>{title}</text>
      </svg>
    </div>
  );
}

function shortLabel(p: CabinPart): string {
  const map: Partial<Record<PartKind, string>> = {
    light: "L", fan: "F", socket: "S", switch: "SW", "electrical-panel": "DB",
    "plumbing-fixture": "WC", toilet: "WC", pantry: "PAN", furniture: p.label.slice(0, 10),
  };
  return map[p.kind] ?? p.label.slice(0, 12);
}
