"use client";

/**
 * LABOUR COLONY 2D FABRICATION SHEETS — STRUCTURAL COLUMN GRID + column schedule.
 *
 * The setting-out sheet the fabricator and the site engineer both work from: every column of every
 * floor projected onto the x-y plane, sitting on a fully bubbled A-1 grid (LETTERS along the length,
 * NUMBERS across the width — the `buildColumnMarks` convention), bay dimension chains both ways, and
 * a column SCHEDULE listing each column's mark, grid reference, family, section size, length and
 * floor.
 *
 * Every section size and length is READ from the shared model (which reads the priced BOQ) — this
 * sheet never sizes or counts a member itself. Literal hex, export-safe.
 */

import type { ColonyDrawingMeta, ColonyModel, ColonyPart } from "@/features/labour-colony-studio/model/types";
import { DimChainH, DimChainV, GridBubble, GridLines, NorthArrow, ScaleBar } from "./sheetPrimitives";
import { PLAN, footprintXY, mLabel, parseGrid, planPpm, planSpan, spanZ } from "./planScale";

const PAD = 84;

export interface ColumnGridSheetProps {
  model: ColonyModel;
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

/** Human family name for the schedule's "kind" column. */
const KIND_LABEL: Record<string, string> = {
  column: "Column",
  "veranda-post": "Veranda post",
  "handrail-post": "Handrail post",
  pedestal: "RCC pedestal",
};

/** The vertical extent of a part in metres, preferring the priced length carried on the spec. */
function memberLengthM(p: ColonyPart): number | null {
  if (typeof p.spec.lengthM === "number" && p.spec.lengthM > 0) return p.spec.lengthM;
  const z = spanZ(p.solid);
  return z ? Math.max(0, z.z1 - z.z0) : null;
}

const floorLabel = (f: number | undefined): string => {
  if (f == null) return "—";
  if (f === -1) return "Foundation";
  if (f === 0) return "Ground";
  return `Floor ${f}`;
};

export function ColumnGridSheet({ model, meta, selectedId, onSelect }: ColumnGridSheetProps) {
  const b = model.bounds;
  const { L, D } = planSpan(b);
  const ppm = planPpm(Math.max(L, D));
  const mx = (m: number) => PAD + (m - b.min.x) * ppm;
  const my = (m: number) => PAD + (m - b.min.y) * ppm;
  const svgW = L * ppm + PAD * 2 + 40;
  const svgH = D * ppm + PAD * 2 + 34;

  const columns = model.parts.filter((p) => p.kind === "column");
  const posts = model.parts.filter((p) => p.kind === "veranda-post");

  // The grid is set out from the GROUND-floor columns (the full grid); higher floors repeat it.
  const gridSource = columns.filter((p) => (p.floor ?? 0) === 0);
  const letterEntries: { v: number; label: string }[] = [];
  const numberEntries: { v: number; label: string }[] = [];
  for (const c of (gridSource.length ? gridSource : columns)) {
    const f = footprintXY(c.solid);
    const g = parseGrid(c.grid);
    if (!f || !g) continue;
    letterEntries.push({ v: (f.x0 + f.x1) / 2, label: g.letter });
    numberEntries.push({ v: (f.y0 + f.y1) / 2, label: g.num });
  }
  const gxs = bucket(letterEntries);
  const gys = bucket(numberEntries);
  const oX0 = gxs.length ? gxs[0].v : b.min.x;
  const oX1 = gxs.length ? gxs[gxs.length - 1].v : b.max.x;
  const oY0 = gys.length ? gys[0].v : b.min.y;
  const oY1 = gys.length ? gys[gys.length - 1].v : b.max.y;

  const rectOf = (p: ColonyPart) => {
    const f = footprintXY(p.solid);
    if (!f) return null;
    return { x: mx(f.x0), y: my(f.y0), w: Math.max(2, mx(f.x1) - mx(f.x0)), h: Math.max(2, my(f.y1) - my(f.y0)) };
  };

  // One plan symbol per grid node — the ground-floor column (or, if a floor has none, whatever is there).
  const planColumns = gridSource.length ? gridSource : columns;

  // ── column schedule ───────────────────────────────────────────────────────────────────────
  const scheduleParts = [...columns, ...posts].sort((a, c) => {
    const fa = a.floor ?? 0, fc = c.floor ?? 0;
    if (fa !== fc) return fa - fc;
    const ga = parseGrid(a.grid), gc = parseGrid(c.grid);
    return (ga?.num ?? "").localeCompare(gc?.num ?? "") || (ga?.letter ?? "").localeCompare(gc?.letter ?? "");
  });

  const rows = scheduleParts.map((p) => ({
    id: p.id,
    mark: p.partMark ?? "C",
    grid: p.grid ?? "—",
    kind: KIND_LABEL[p.kind] ?? p.kind,
    section: p.spec.sectionSize ?? "—",
    lengthM: memberLengthM(p),
    floor: floorLabel(p.floor),
    fabrication: p.fabrication ?? "—",
  }));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 640) }}>
        <rect x={0} y={0} width={svgW} height={svgH} fill={PLAN.paper} />

        {/* structural frame outline through the outer grid lines */}
        <rect x={mx(oX0)} y={my(oY0)} width={mx(oX1) - mx(oX0)} height={my(oY1) - my(oY0)}
          fill="none" stroke={PLAN.rule} strokeWidth={1} />

        {/* grid lines + bubbles (top + left) */}
        <GridLines xs={gxs.map((g) => ({ px: mx(g.v), label: g.label }))} ys={gys.map((g) => ({ px: my(g.v), label: g.label }))}
          x0={mx(oX0)} x1={mx(oX1)} y0={my(oY0)} y1={my(oY1)} />

        {/* … and the matching bubbles on the OPPOSITE two edges, so the grid reads from any side */}
        {gxs.map((g, i) => (
          <g key={`bx${i}`}>
            <line x1={mx(g.v)} y1={my(oY1)} x2={mx(g.v)} y2={my(oY1) + 16} stroke={PLAN.grid} strokeWidth={0.7} strokeDasharray="8 3 2 3" opacity={0.7} />
            <GridBubble cx={mx(g.v)} cy={my(oY1) + 28} label={g.label} />
          </g>
        ))}
        {gys.map((g, i) => (
          <g key={`by${i}`}>
            <line x1={mx(oX1)} y1={my(g.v)} x2={mx(oX1) + 16} y2={my(g.v)} stroke={PLAN.grid} strokeWidth={0.7} strokeDasharray="8 3 2 3" opacity={0.7} />
            <GridBubble cx={mx(oX1) + 28} cy={my(g.v)} label={g.label} />
          </g>
        ))}

        {/* veranda / secondary posts (open squares) */}
        {posts.map((p) => {
          const r = rectOf(p);
          if (!r) return null;
          const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
          const s = Math.max(5, Math.max(r.w, r.h));
          return (
            <rect key={p.id} x={cx - s / 2} y={cy - s / 2} width={s} height={s}
              fill="none" stroke={PLAN.beam} strokeWidth={1} strokeDasharray="3 2" />
          );
        })}

        {/* columns — solid grid nodes carrying their mark */}
        {planColumns.map((p) => {
          const r = rectOf(p);
          if (!r) return null;
          const sel = p.id === selectedId;
          const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
          const s = Math.max(8, r.w, r.h);
          return (
            <g key={p.id} onClick={() => onSelect?.(p.id)} style={{ cursor: onSelect ? "pointer" : undefined }}>
              <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} rx={1}
                fill={sel ? PLAN.selFill : PLAN.columnFill} stroke={sel ? PLAN.sel : PLAN.column} strokeWidth={sel ? 2.2 : 1.5} />
              {/* filled quadrant marker — reads as a column, not an opening, in B&W print */}
              <rect x={cx - s / 2} y={cy - s / 2} width={s / 2} height={s / 2} fill={sel ? PLAN.sel : PLAN.column} opacity={0.75} />
              <text x={cx} y={cy - s / 2 - 4} fontSize={7.5} textAnchor="middle" fill={PLAN.column} fontWeight={700}>
                {p.partMark ?? "C"}
              </text>
            </g>
          );
        })}

        {/* bay dimension chains */}
        <DimChainH stations={gxs.map((g) => ({ x: mx(g.v), m: g.v }))} y={my(oY0) - 52} />
        <DimChainV stations={gys.map((g) => ({ y: my(g.v), m: g.v }))} x={mx(oX0) - 52} />

        <text x={mx((oX0 + oX1) / 2)} y={svgH - 36} fontSize={9} textAnchor="middle" fill={PLAN.dim}>
          Overall grid {mLabel(oX1 - oX0)} × {mLabel(oY1 - oY0)} · {gxs.length} letter lines × {gys.length} number lines
        </text>

        <NorthArrow x={svgW - 28} y={34} />
        <ScaleBar x={mx(oX0)} y={svgH - 20} ppm={ppm} />
        <text x={mx(oX0)} y={my(oY1) + 48} fontSize={10} fill={PLAN.ink} fontWeight={700}>
          Structural column grid — setting out ({model.meta.gridRef})
        </text>
      </svg>

      {/* ── column schedule ─────────────────────────────────────────────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#ffffff", marginTop: 8 }}>
        <thead>
          <tr>
            {["Mark", "Grid", "Member", "Section (live BOQ)", "Length (m)", "Floor", "Fabrication"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "4px 8px", fontSize: 9, color: "#0f172a", borderBottom: "1.5px solid #0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={7} style={{ padding: "6px 8px", fontSize: 11, color: "#94a3b8" }}>No columns in the model.</td></tr>
          ) : rows.map((r) => {
            const sel = r.id === selectedId;
            return (
              <tr key={r.id} onClick={() => onSelect?.(r.id)} style={{ cursor: onSelect ? "pointer" : undefined, background: sel ? "#fde68a" : undefined }}>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#0f172a" }}>{r.mark}</td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{r.grid}</td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{r.kind}</td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{r.section}</td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{r.lengthM != null ? r.lengthM.toFixed(2) : "—"}</td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{r.floor}</td>
                <td style={{ padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{r.fabrication}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 4, fontSize: 8, color: "#94a3b8" }}>
        Grid letters run along the building length, numbers across the width. Sections and lengths are read from the
        priced BOQ through the shared model — build to written dimensions, do not scale. Project: {meta.projectName}.
      </div>
    </div>
  );
}
