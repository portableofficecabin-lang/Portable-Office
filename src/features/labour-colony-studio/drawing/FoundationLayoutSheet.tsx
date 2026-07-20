"use client";

/**
 * LABOUR COLONY 2D FABRICATION SHEETS — FOUNDATION / footing layout plan.
 *
 * Footing, pedestal and PCC-bed layout on the structural grid, with F-marks and plinth-beam runs,
 * plus a setting-out coordinate table (grid ref, x/y in metres, footing size, depth). The footprints
 * come from the shared model's foundation parts (boqSource === "civil"); footing sizes / depths /
 * concrete are cross-checked against the priced civil result when present, so the layout can never
 * quote a size the civil BOQ did not take off. Literal hex, export-safe.
 */

import type { ColonyDrawingMeta, ColonyModel, ColonyPart } from "@/features/labour-colony-studio/model/types";
import type { CivilWorkResult } from "@/lib/quotation/labourColonyCivil";
import { DimChainH, DimChainV, GridLines, NorthArrow, ScaleBar } from "./sheetPrimitives";
import { PLAN, footprintXY, mLabel, parseGrid, planPpm, planSpan } from "./planScale";

const PAD = 74;

export interface FoundationLayoutSheetProps {
  model: ColonyModel;
  civil?: CivilWorkResult | null;
  meta: ColonyDrawingMeta;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

function bucket(entries: { v: number; label: string }[], eps = 0.05): { v: number; label: string }[] {
  const out: { v: number; label: string }[] = [];
  for (const e of [...entries].sort((a, b) => a.v - b.v)) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.v - e.v) > eps) out.push({ v: e.v, label: e.label });
  }
  return out;
}

export function FoundationLayoutSheet({ model, civil, meta, selectedId, onSelect }: FoundationLayoutSheetProps) {
  const foundation = model.parts.filter((p) => p.floor === -1);
  const footings = foundation.filter((p) => p.kind === "footing");
  const pedestals = foundation.filter((p) => p.kind === "pedestal");
  const pccs = foundation.filter((p) => p.kind === "pcc");
  const plinthBeams = foundation.filter((p) => p.kind === "plinth-beam");

  const b = model.bounds;
  const { L, D } = planSpan(b);
  const ppm = planPpm(Math.max(L, D));
  const mx = (m: number) => PAD + (m - b.min.x) * ppm;
  const my = (m: number) => PAD + (m - b.min.y) * ppm;
  const svgW = L * ppm + PAD * 2 + 40;
  const svgH = D * ppm + PAD * 2 + 28;

  // grid from footing grid refs
  const letterEntries: { v: number; label: string }[] = [];
  const numberEntries: { v: number; label: string }[] = [];
  for (const p of footings) {
    const f = footprintXY(p.solid);
    const g = parseGrid(p.grid);
    if (!f || !g) continue;
    letterEntries.push({ v: (f.x0 + f.x1) / 2, label: g.letter });
    numberEntries.push({ v: (f.y0 + f.y1) / 2, label: g.num });
  }
  const gxs = bucket(letterEntries);
  const gys = bucket(numberEntries);
  const oX0 = gxs.length ? gxs[0].v : b.min.x, oX1 = gxs.length ? gxs[gxs.length - 1].v : b.max.x;
  const oY0 = gys.length ? gys[0].v : b.min.y, oY1 = gys.length ? gys[gys.length - 1].v : b.max.y;

  // depth lookup from the priced civil footing types (by grid)
  const depthByGrid = new Map<string, number>();
  const sideByGrid = new Map<string, number>();
  for (const ft of civil?.foundation?.footingTypes ?? []) {
    for (const c of ft.columns) { depthByGrid.set(c.grid, ft.depthM); sideByGrid.set(c.grid, ft.sideM); }
  }

  const rectOf = (p: ColonyPart) => {
    const f = footprintXY(p.solid);
    if (!f) return null;
    return { x: mx(f.x0), y: my(f.y0), w: Math.max(2, mx(f.x1) - mx(f.x0)), h: Math.max(2, my(f.y1) - my(f.y0)), f };
  };

  // coordinate table rows
  const rows = footings
    .map((p) => {
      const f = footprintXY(p.solid);
      const g = parseGrid(p.grid);
      if (!f) return null;
      const cx = (f.x0 + f.x1) / 2, cy = (f.y0 + f.y1) / 2;
      const side = sideByGrid.get(p.grid ?? "") ?? f.x1 - f.x0;
      const depth = depthByGrid.get(p.grid ?? "");
      return {
        mark: p.partMark ?? "F1",
        grid: p.grid ?? "—",
        letter: g?.letter ?? "",
        num: g?.num ?? "",
        x: cx - b.min.x,
        y: cy - b.min.y,
        side,
        depth,
        id: p.id,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b2) => (a.num.localeCompare(b2.num) || a.letter.localeCompare(b2.letter)));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 640) }}>
        <rect x={0} y={0} width={svgW} height={svgH} fill={PLAN.paper} />

        {/* PCC beds (faint, largest) */}
        {pccs.map((p) => {
          const r = rectOf(p);
          if (!r) return null;
          return <rect key={p.id} x={r.x} y={r.y} width={r.w} height={r.h} fill={PLAN.pcc} opacity={0.4} />;
        })}

        {/* plinth beams */}
        {plinthBeams.map((p) => {
          const r = rectOf(p);
          if (!r) return null;
          return <rect key={p.id} x={r.x} y={r.y} width={r.w} height={r.h} fill={PLAN.plinth} opacity={0.85} />;
        })}

        {/* grid */}
        <GridLines xs={gxs.map((g) => ({ px: mx(g.v), label: g.label }))} ys={gys.map((g) => ({ px: my(g.v), label: g.label }))}
          x0={mx(oX0)} x1={mx(oX1)} y0={my(oY0)} y1={my(oY1)} />

        {/* footings + F-marks */}
        {footings.map((p) => {
          const r = rectOf(p);
          if (!r) return null;
          const sel = p.id === selectedId;
          const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
          return (
            <g key={p.id} onClick={() => onSelect?.(p.id)} style={{ cursor: onSelect ? "pointer" : undefined }}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={1}
                fill={sel ? PLAN.selFill : PLAN.footingFill} stroke={sel ? PLAN.sel : PLAN.footing} strokeWidth={sel ? 2 : 1.4} />
              <text x={cx} y={cy + 3.5} fontSize={9} textAnchor="middle" fill={PLAN.footing} fontWeight={800}>{p.partMark}</text>
            </g>
          );
        })}

        {/* pedestals (small centre squares) */}
        {pedestals.map((p) => {
          const r = rectOf(p);
          if (!r) return null;
          const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
          const s = Math.max(4, Math.min(r.w, r.h));
          return <rect key={p.id} x={cx - s / 2} y={cy - s / 2} width={s} height={s} fill="none" stroke={PLAN.pedestal} strokeWidth={0.9} strokeDasharray="2 2" />;
        })}

        <DimChainH stations={gxs.map((g) => ({ x: mx(g.v), m: g.v }))} y={my(oY0) - 46} />
        <DimChainV stations={gys.map((g) => ({ y: my(g.v), m: g.v }))} x={mx(oX0) - 46} />

        <NorthArrow x={svgW - 28} y={34} />
        <ScaleBar x={mx(oX0)} y={svgH - 18} ppm={ppm} />
        <text x={mx(oX0)} y={my(oY1) + 26} fontSize={10} fill={PLAN.ink} fontWeight={700}>Foundation / footing layout</text>
      </svg>

      {/* setting-out coordinate table */}
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#ffffff", marginTop: 8 }}>
        <thead>
          <tr>
            {["Footing", "Grid", "X (m)", "Y (m)", "Size (m)", "Depth (m)"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "4px 8px", fontSize: 9, color: "#0f172a", borderBottom: "1.5px solid #0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={6} style={{ padding: "6px 8px", fontSize: 11, color: "#94a3b8" }}>No foundation parts in the model.</td></tr>
          ) : rows.map((r) => {
            const sel = r.id === selectedId;
            return (
              <tr key={r.id} onClick={() => onSelect?.(r.id)} style={{ cursor: onSelect ? "pointer" : undefined, background: sel ? "#fde68a" : undefined }}>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#0f172a" }}>{r.mark}</td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{r.grid}</td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{r.x.toFixed(2)}</td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{r.y.toFixed(2)}</td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{r.side.toFixed(2)} × {r.side.toFixed(2)}</td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{r.depth != null ? r.depth.toFixed(2) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 4, fontSize: 8, color: "#94a3b8" }}>
        Coordinates are setting-out distances from the plan origin (grid intersection {mLabel(0)}). Footing sizes and depths are read from the priced civil BOQ.
      </div>
    </div>
  );
}
