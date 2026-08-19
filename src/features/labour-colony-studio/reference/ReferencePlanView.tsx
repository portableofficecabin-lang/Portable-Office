"use client";

/**
 * LABOUR COLONY — REFERENCE GA DRAWING: "Plan of … Floor Layout (with Door & Window Locations)".
 *
 * The architectural plan the reference sheet leads with: the room block, its verandas and staircases,
 * every internal partition, and — the point of the view — every DOOR (with its swing) and every
 * WINDOW, tagged with the mark the opening schedule on the same sheet uses.
 *
 * GEOMETRY SOURCES, both already owned elsewhere:
 *   • `RoomFloorPlanGeom` (buildRoomFloorPlan) — rooms, verandas, stairs, door positions and swings,
 *     window positions. This is the SAME object the priced take-off and the engineering model consume,
 *     so the plan can never show a room, door or window the BOQ does not bill.
 *   • the shared `ColonyModel` — the structural grid the bubbles and the bay dimension chain read.
 *
 * Every dimension is printed in whole MILLIMETRES. Literal hex, export-safe.
 */

import type { RoomFloorPlanGeom, FPDoor, FPRoom } from "@/lib/quotation/roomFloorPlan";
import type { ColonyModel } from "../model/types";
import { DimChainMmH, DimChainMmV, DimMmH, DimMmV, RefBubble, ViewTitle } from "./ReferencePrimitives";
import { REF, gridStations, refPpm, type RefGridStation } from "./referenceScale";
import type { OpeningScheduleRow } from "./referenceRegister";

const PAD_L = 74;
const PAD_T = 58;
const PAD_R = 62;
const PAD_B = 74;

/** The SVG arc from `p1` to `p2` centred on the hinge, chosen so the leaf sweeps the short way. */
function arcPath(cx: number, cy: number, p1: [number, number], p2: [number, number], r: number): string {
  const a1 = Math.atan2(p1[1] - cy, p1[0] - cx);
  const a2 = Math.atan2(p2[1] - cy, p2[0] - cx);
  let d = a2 - a1;
  while (d <= -Math.PI) d += 2 * Math.PI;
  while (d > Math.PI) d -= 2 * Math.PI;
  const sweep = d > 0 ? 1 : 0;
  return `M ${p1[0]} ${p1[1]} A ${r} ${r} 0 0 ${sweep} ${p2[0]} ${p2[1]}`;
}

export interface ReferencePlanViewProps {
  geom: RoomFloorPlanGeom;
  model: ColonyModel;
  /** "Plan of Ground Floor Layout" — the caption under the view. */
  title: string;
  /** The opening schedule, so a door/window carries the SAME mark the schedule block prints. */
  openings: OpeningScheduleRow[];
  /** Target drawn width in px; the view scales itself to fit. */
  targetPx?: number;
}

export function ReferencePlanView({ geom, model, title, openings, targetPx = 880 }: ReferencePlanViewProps) {
  const b = geom.bounds;
  const L = Math.max(0.001, b.maxX - b.minX);
  const D = Math.max(0.001, b.maxY - b.minY);
  const ppm = refPpm(Math.max(L, D * 2.2), targetPx);

  const X = (m: number) => PAD_L + (m - b.minX) * ppm;
  const Y = (m: number) => PAD_T + (m - b.minY) * ppm;
  const svgW = L * ppm + PAD_L + PAD_R;
  const svgH = D * ppm + PAD_T + PAD_B;

  const wallPx = Math.min(5, Math.max(1.4, geom.wallM * ppm));

  /** Mark lookup — the schedule's own mark for an opening of this size, else the bare letter. */
  const markOf = (kind: "door" | "window", wM: number, hM: number): string => {
    const w = Math.round(wM * 1000);
    const h = Math.round(hM * 1000);
    const exact = openings.find((o) => o.kind === kind && o.widthMm === w && o.heightMm === h);
    if (exact) return exact.mark;
    const any = openings.find((o) => o.kind === kind);
    return any ? any.mark : kind === "door" ? "D" : "W";
  };

  const colStations: RefGridStation[] = gridStations(model, "x");
  const rowStations: RefGridStation[] = gridStations(model, "y");

  /* ── openings ─────────────────────────────────────────────────────────────────────────────── */

  const windowGlyph = (room: FPRoom) => {
    if (room.winWM <= 0) return null;
    const x0 = X(room.x + room.winFromLeftM);
    const x1 = X(room.x + room.winFromLeftM + room.winWM);
    const y = Y(room.wallY);
    const mark = markOf("window", room.winWM, room.winHM || 1.2);
    return (
      <g key={`w-${room.no}`}>
        {/* the wall is broken over the opening, then the window symbol is drawn into the gap */}
        <line x1={x0} y1={y} x2={x1} y2={y} stroke={REF.paper} strokeWidth={wallPx + 1.4} />
        <line x1={x0} y1={y - wallPx / 2} x2={x1} y2={y - wallPx / 2} stroke={REF.window} strokeWidth={0.9} />
        <line x1={x0} y1={y + wallPx / 2} x2={x1} y2={y + wallPx / 2} stroke={REF.window} strokeWidth={0.9} />
        <line x1={x0} y1={y} x2={x1} y2={y} stroke={REF.window} strokeWidth={0.7} />
        <line x1={x0} y1={y - wallPx / 2 - 1} x2={x0} y2={y + wallPx / 2 + 1} stroke={REF.window} strokeWidth={0.9} />
        <line x1={x1} y1={y - wallPx / 2 - 1} x2={x1} y2={y + wallPx / 2 + 1} stroke={REF.window} strokeWidth={0.9} />
        <text x={(x0 + x1) / 2} y={y + (room.into > 0 ? -3.5 : 8)} fontSize={6.5} textAnchor="middle" fill={REF.window} fontWeight={700}>
          [{mark}]
        </text>
      </g>
    );
  };

  const doorGlyph = (room: FPRoom, d: FPDoor, i: number) => {
    const along = d.wall === "top" || d.wall === "bottom";
    const mark = markOf("door", d.widthM, d.heightM || 2.0);
    /* The opening's two jambs, in metres, on the wall it sits on. */
    const a = along ? room.x + d.posM : room.y + d.posM;
    const c = a + d.widthM;
    const wallCoord = d.wall === "top" ? room.y
      : d.wall === "bottom" ? room.y + room.d
        : d.wall === "left" ? room.x : room.x + room.w;

    /* Which way the leaf sweeps: `into` is the interior normal on the perpendicular axis, and an
     * outward-swinging leaf simply reverses it. Both come from the plan builder — the drawing does
     * not decide which way a door opens. */
    const dir = (d.swing === "out" ? -1 : 1) * d.into;
    const hingeAt = d.hinge === "start" ? a : c;
    const freeAt = d.hinge === "start" ? c : a;

    const [hx, hy] = along ? [X(hingeAt), Y(wallCoord)] : [X(wallCoord), Y(hingeAt)];
    const [fx, fy] = along ? [X(freeAt), Y(wallCoord)] : [X(wallCoord), Y(freeAt)];
    const leafPx = d.widthM * ppm;
    const tip: [number, number] = along ? [hx, hy + dir * leafPx] : [hx + dir * leafPx, hy];

    /* The wall is BROKEN over the opening — a door drawn on top of an unbroken wall line reads as a
     * door in a solid wall, which is exactly the thing a fabricator must not build. */
    const half = wallPx / 2 + 0.8;
    const gap = along
      ? { x: Math.min(hx, fx), y: hy - half, w: Math.abs(fx - hx), h: half * 2 }
      : { x: hx - half, y: Math.min(hy, fy), w: half * 2, h: Math.abs(fy - hy) };

    return (
      <g key={`d-${room.no}-${i}`}>
        <rect x={gap.x} y={gap.y} width={gap.w} height={gap.h} fill={REF.paper} />
        {/* leaf + swing */}
        <path d={arcPath(hx, hy, [fx, fy], tip, leafPx)} fill="none" stroke={REF.door} strokeWidth={0.7} strokeDasharray="3 2" />
        <line x1={hx} y1={hy} x2={tip[0]} y2={tip[1]} stroke={REF.door} strokeWidth={1.4} />
        <text
          x={along ? (hx + fx) / 2 : hx + (dir > 0 ? 7 : -7)}
          y={along ? hy + (dir > 0 ? -3 : 8) : (hy + fy) / 2}
          fontSize={6.5} textAnchor="middle" fill={REF.door} fontWeight={700}
        >
          [{mark}]
        </text>
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 620) }}>
      <rect x={0} y={0} width={svgW} height={svgH} fill={REF.paper} />

      {/* ── grid lines + bubbles ───────────────────────────────────────────────────────────── */}
      {colStations.map((s, i) => (
        <g key={`gx${i}`}>
          <line x1={X(s.m)} y1={PAD_T - 16} x2={X(s.m)} y2={Y(b.maxY) + 14}
            stroke={REF.grid} strokeWidth={0.55} strokeDasharray="9 3 2 3" opacity={0.65} />
          <RefBubble cx={X(s.m)} cy={PAD_T - 27} label={s.label} />
        </g>
      ))}
      {rowStations.map((s, i) => (
        <g key={`gy${i}`}>
          <line x1={PAD_L - 16} y1={Y(s.m)} x2={X(b.maxX) + 14} y2={Y(s.m)}
            stroke={REF.grid} strokeWidth={0.55} strokeDasharray="9 3 2 3" opacity={0.65} />
          <RefBubble cx={PAD_L - 27} cy={Y(s.m)} label={s.label} />
        </g>
      ))}

      {/* ── verandas / walkways ────────────────────────────────────────────────────────────── */}
      {geom.verandas.map((v) => (
        <g key={v.id}>
          <rect x={X(v.x)} y={Y(v.y)} width={v.w * ppm} height={v.d * ppm}
            fill={REF.verandaFill} stroke={REF.thin} strokeWidth={0.7} strokeDasharray="5 3" />
          {v.w * ppm > 40 && v.d * ppm > 12 && (
            <text x={X(v.x + v.w / 2)} y={Y(v.y + v.d / 2) + 2.5} fontSize={6.5} textAnchor="middle" fill={REF.note}>
              {v.label}
            </text>
          )}
        </g>
      ))}

      {/* ── staircases ─────────────────────────────────────────────────────────────────────── */}
      {geom.stairs.map((s) => {
        const vertical = s.orientation === "vertical";
        return (
          <g key={s.id}>
            <rect x={X(s.x)} y={Y(s.y)} width={s.w * ppm} height={s.d * ppm}
              fill={REF.stairFill} stroke={REF.ink} strokeWidth={0.8} />
            {s.stepEdges.map((e, i) => (
              vertical
                ? <line key={i} x1={X(s.x)} y1={Y(s.y + e.a)} x2={X(s.x + s.w)} y2={Y(s.y + e.a)} stroke={REF.thin} strokeWidth={0.5} />
                : <line key={i} x1={X(s.x + e.a)} y1={Y(s.y)} x2={X(s.x + e.a)} y2={Y(s.y + s.d)} stroke={REF.thin} strokeWidth={0.5} />
            ))}
            <text x={X(s.x + s.w / 2)} y={Y(s.y + s.d / 2) + 2.5} fontSize={6.5} textAnchor="middle" fill={REF.ink} fontWeight={700}>
              {s.direction === "up" ? "UP" : "DN"}
            </text>
          </g>
        );
      })}

      {/* ── rooms (walls drawn at the real panel thickness) ────────────────────────────────── */}
      {geom.rooms.map((r) => (
        <g key={`r-${r.no}`}>
          <rect x={X(r.x)} y={Y(r.y)} width={r.w * ppm} height={r.d * ppm} fill={REF.roomFill} />
          <rect x={X(r.x)} y={Y(r.y)} width={r.w * ppm} height={r.d * ppm}
            fill="none" stroke={REF.ink} strokeWidth={wallPx} />
          {r.w * ppm > 22 && r.d * ppm > 16 && (
            <text x={X(r.x + r.w / 2)} y={Y(r.y + r.d / 2) + 3} fontSize={7.5} textAnchor="middle" fill={REF.ink} fontWeight={700}>
              {r.no}
            </text>
          )}
        </g>
      ))}

      {/* ── openings ───────────────────────────────────────────────────────────────────────── */}
      {geom.rooms.map((r) => windowGlyph(r))}
      {geom.rooms.map((r) => r.doors.map((d, i) => doorGlyph(r, d, i)))}

      {/* ── dimensions: bay chain above, overall below; grid chain left, overall right ─────── */}
      {colStations.length >= 2 && <DimChainMmH stations={colStations} y={PAD_T - 44} at={X} />}
      <DimMmH x0={X(b.minX)} x1={X(b.maxX)} y={Y(b.maxY) + 34} m={L} bold />
      {colStations.length >= 2 && <DimChainMmH stations={colStations} y={Y(b.maxY) + 20} at={X} />}

      {rowStations.length >= 2 && <DimChainMmV stations={rowStations} x={PAD_L - 44} at={Y} />}
      <DimMmV y0={Y(b.minY)} y1={Y(b.maxY)} x={X(b.maxX) + 30} m={D} bold />

      <ViewTitle
        x={(X(b.minX) + X(b.maxX)) / 2}
        y={svgH - 22}
        title={title}
        subtitle="(with Door & Window Locations)"
      />
    </svg>
  );
}
