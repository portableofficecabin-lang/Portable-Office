"use client";

/**
 * LABOUR COLONY 2D FABRICATION SHEETS — per-floor structural FRAMING PLAN.
 *
 * Projects every structural member of ONE floor onto the x-y plane: columns (as grid nodes), base /
 * floor beams, floor joists and vertical bracing. Structural grid lines carry A-1… references, member
 * marks + section sizes are labelled, and dimension chains give the bay spacings both ways. Every
 * quantity / section is READ from the shared model (which itself reads the priced BOQ) — the drawing
 * never invents a size. Literal hex, export-safe.
 */

import type { ColonyDrawingMeta, ColonyModel, ColonyPart } from "@/features/labour-colony-studio/model/types";
import { DimChainH, DimChainV, GridLines, NorthArrow, ScaleBar } from "./sheetPrimitives";
import { PLAN, footprintXY, mLabel, parseGrid, planPpm, planSpan } from "./planScale";

const PAD = 74;

export interface FramingPlanSheetProps {
  model: ColonyModel;
  /** Floor index: 0 = ground, 1 = first, … */
  floor: number;
  meta: ColonyDrawingMeta;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

/** Distinct sorted values with a tolerance, carrying the first label seen at each. */
function bucket(entries: { v: number; label: string }[], eps = 0.05): { v: number; label: string }[] {
  const out: { v: number; label: string }[] = [];
  for (const e of [...entries].sort((a, b) => a.v - b.v)) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.v - e.v) > eps) out.push({ v: e.v, label: e.label });
  }
  return out;
}

export function FramingPlanSheet({ model, floor, meta, selectedId, onSelect }: FramingPlanSheetProps) {
  const b = model.bounds;
  const { L, D } = planSpan(b);
  const ppm = planPpm(Math.max(L, D));
  const mx = (m: number) => PAD + (m - b.min.x) * ppm;
  const my = (m: number) => PAD + (m - b.min.y) * ppm;
  const planW = L * ppm, planH = D * ppm;
  const svgW = planW + PAD * 2 + 40;
  const svgH = planH + PAD * 2 + 28;

  const onFloor = (p: ColonyPart) => p.floor === floor;
  const cols = model.parts.filter((p) => p.kind === "column" && onFloor(p));
  const beams = model.parts.filter((p) => (p.kind === "base-beam" || p.kind === "floor-beam") && onFloor(p));
  const joists = model.parts.filter((p) => p.kind === "joist" && onFloor(p));
  const braces = model.parts.filter((p) => p.kind === "brace" && onFloor(p));

  // structural grid stations from the columns' grid refs (letters → x, numbers → y)
  const letterEntries: { v: number; label: string }[] = [];
  const numberEntries: { v: number; label: string }[] = [];
  for (const c of cols) {
    const f = footprintXY(c.solid);
    const g = parseGrid(c.grid);
    if (!f || !g) continue;
    letterEntries.push({ v: (f.x0 + f.x1) / 2, label: g.letter });
    numberEntries.push({ v: (f.y0 + f.y1) / 2, label: g.num });
  }
  const gxs = bucket(letterEntries);
  const gys = bucket(numberEntries);
  const outerX0 = gxs.length ? gxs[0].v : b.min.x;
  const outerX1 = gxs.length ? gxs[gxs.length - 1].v : b.max.x;
  const outerY0 = gys.length ? gys[0].v : b.min.y;
  const outerY1 = gys.length ? gys[gys.length - 1].v : b.max.y;

  const gridXs = gxs.map((g) => ({ px: mx(g.v), label: g.label }));
  const gridYs = gys.map((g) => ({ px: my(g.v), label: g.label }));

  // representative sections for the member-mark legend
  const secOf = (p: ColonyPart | undefined) => p?.spec.sectionSize ?? "—";
  const legend: { mark: string; role: string; section: string; color: string }[] = [];
  if (cols[0]) legend.push({ mark: cols[0].partMark ?? "C", role: "Column", section: secOf(cols[0]), color: PLAN.column });
  if (beams[0]) legend.push({ mark: beams[0].partMark ?? "B", role: floor === 0 ? "Base beam" : "Floor beam", section: secOf(beams[0]), color: PLAN.beam });
  if (joists[0]) legend.push({ mark: joists[0].partMark ?? "J", role: "Floor joist", section: secOf(joists[0]), color: PLAN.joist });
  if (braces[0]) legend.push({ mark: braces[0].partMark ?? "BR", role: "Vertical brace", section: secOf(braces[0]), color: PLAN.brace });

  const floorName = floor === 0 ? "Ground floor" : `Floor ${floor}`;

  const rectOf = (p: ColonyPart) => {
    const f = footprintXY(p.solid);
    if (!f) return null;
    return { x: mx(f.x0), y: my(f.y0), w: Math.max(1.5, mx(f.x1) - mx(f.x0)), h: Math.max(1.5, my(f.y1) - my(f.y0)) };
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 640) }}>
        <rect x={0} y={0} width={svgW} height={svgH} fill={PLAN.paper} />

        {/* structural frame outline (through the outer grid lines) */}
        <rect x={mx(outerX0)} y={my(outerY0)} width={mx(outerX1) - mx(outerX0)} height={my(outerY1) - my(outerY0)}
          fill="none" stroke={PLAN.rule} strokeWidth={1} />

        {/* grid lines + bubbles */}
        <GridLines xs={gridXs} ys={gridYs} x0={mx(outerX0)} x1={mx(outerX1)} y0={my(outerY0)} y1={my(outerY1)} />

        {/* joists (thin) */}
        {joists.map((p) => {
          const r = rectOf(p);
          if (!r) return null;
          return <rect key={p.id} x={r.x} y={r.y} width={r.w} height={r.h} fill={PLAN.joist} opacity={0.75} />;
        })}

        {/* beams */}
        {beams.map((p) => {
          const r = rectOf(p);
          if (!r) return null;
          const sel = p.id === selectedId;
          return (
            <rect key={p.id} x={r.x} y={r.y} width={r.w} height={r.h} rx={1}
              onClick={() => onSelect?.(p.id)} style={{ cursor: onSelect ? "pointer" : undefined }}
              fill={sel ? PLAN.selFill : PLAN.beam} stroke={sel ? PLAN.sel : PLAN.beam} strokeWidth={sel ? 1.5 : 0.5} />
          );
        })}

        {/* bracing (diagonal, from the quad's plan projection) */}
        {braces.map((p) => {
          if (p.solid.kind !== "quad") return null;
          const pts = p.solid.pts;
          return (
            <line key={p.id} x1={mx(pts[0].x)} y1={my(pts[0].y)} x2={mx(pts[1].x)} y2={my(pts[1].y)}
              stroke={PLAN.brace} strokeWidth={1.1} strokeDasharray="5 3" />
          );
        })}

        {/* columns (grid nodes) + grid label */}
        {cols.map((p) => {
          const r = rectOf(p);
          if (!r) return null;
          const sel = p.id === selectedId;
          const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
          const s = Math.max(6, r.w, r.h);
          return (
            <g key={p.id} onClick={() => onSelect?.(p.id)} style={{ cursor: onSelect ? "pointer" : undefined }}>
              <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} rx={1}
                fill={sel ? PLAN.selFill : PLAN.columnFill} stroke={sel ? PLAN.sel : PLAN.column} strokeWidth={sel ? 2 : 1.4} />
              <text x={cx} y={cy - s / 2 - 3} fontSize={7.5} textAnchor="middle" fill={PLAN.column} fontWeight={700}>{p.grid}</text>
            </g>
          );
        })}

        {/* dimension chains (bay spacings) */}
        <DimChainH stations={gxs.map((g) => ({ x: mx(g.v), m: g.v }))} y={my(outerY0) - 46} />
        <DimChainV stations={gys.map((g) => ({ y: my(g.v), m: g.v }))} x={mx(outerX0) - 46} />

        {/* overall dims */}
        <text x={mx((outerX0 + outerX1) / 2)} y={svgH - 34} fontSize={9} textAnchor="middle" fill={PLAN.dim}>
          Overall grid {mLabel(outerX1 - outerX0)} × {mLabel(outerY1 - outerY0)}
        </text>

        <NorthArrow x={svgW - 28} y={34} />
        <ScaleBar x={mx(outerX0)} y={svgH - 18} ppm={ppm} />
        <text x={mx(outerX0)} y={my(outerY1) + 26} fontSize={10} fill={PLAN.ink} fontWeight={700}>
          {floorName} framing plan
        </text>
      </svg>

      {/* member-mark + section legend */}
      {legend.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#ffffff", marginTop: 6 }}>
          <thead>
            <tr>
              {["Mark", "Member", "Section (live BOQ)"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "4px 8px", fontSize: 9, color: "#0f172a", borderBottom: "1.5px solid #0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {legend.map((l) => (
              <tr key={l.mark + l.role}>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#0f172a" }}>
                  <span style={{ display: "inline-block", width: 12, height: 12, background: l.color, borderRadius: 2, marginRight: 6, verticalAlign: "-1px" }} />
                  {l.mark}
                </td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{l.role}</td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{l.section}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
