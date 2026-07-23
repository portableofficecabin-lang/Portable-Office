"use client";

/**
 * LABOUR COLONY 2D FABRICATION SHEETS — PUF PANEL BOTTOM LOCKING SYSTEM.
 *
 * The four detail sheets that document the paired C-purlin receiving pocket bolted to the plinth beam:
 *
 *   A · PufLockLayoutSheet        — plinth-beam + base-plate LAYOUT PLAN on the bubbled structural
 *                                   grid, with bay chains, plate spacing chains, offset-from-gridline
 *                                   dimensions, C-purlin orientation arrows and a setting-out table.
 *   B · PufLockEnlargedPlanSheet  — ENLARGED PLAN of one typical assembly (mm), plus section A–A
 *                                   through the pocket drawn as the TRUE lipped-C profile.
 *   C · PufLockSectionSheet       — "PUF PANEL BOTTOM LOCKING DETAIL AT PLINTH BEAM": the full
 *                                   dimensioned section — RCC beam, anchorage, plate, nut + washer,
 *                                   welds, both C-purlins, the seated panel, levels and callouts.
 *   D · PufLockFabricationSheet   — shop FABRICATION detail: plate hole layout, C-purlin cut length +
 *                                   end profile, weld symbols, assembly mark and a parts table.
 *
 * SINGLE SOURCE OF TRUTH — every number on all four sheets is read from `model.pufLock`
 * (`PufLockDerived`, produced by `derivePufLock` and already attached by `buildColonyModel`):
 * the configuration, the resolved plate positions, the take-off and the validation issues. Geometry is
 * taken from the core's own `platePocketGeometry` / `boltCentres`, so a drawn pocket, plate or bolt
 * can never sit anywhere other than where the 3D model and the schedules put it. NOTHING here computes
 * a pocket width, a piece count, a weight or a clearance of its own.
 *
 * MISSING DIMENSIONS are never drawn as "0 mm": a non-positive size prints "NOT SPECIFIED" in the
 * error colour and the sheet carries the matching `PufLockIssue` as an explicit callout.
 *
 * EXPORT-SAFE: literal hex only (the PLAN tokens) — never a Tailwind class, CSS var or oklch token —
 * and every arrowhead is an explicit <polygon>, never a <marker>/url(#…) paint-server reference.
 */

import type { CSSProperties } from "react";

import type { ColonyDrawingMeta, ColonyModel, ColonyPart } from "@/features/labour-colony-studio/model/types";
import {
  PUF_LOCK_DRAWING_NOTES, PUF_LOCK_EXPLANATION, PUF_PANEL_THICKNESS_OPTIONS,
  assemblyCallout, boltCentres, platePocketGeometry,
  type PufLockConfig, type PufLockDerived, type PufLockIssue, type PufLockPlatePosition,
} from "@/features/labour-colony-studio/model/pufLock";
import {
  buildPufLockLayoutSummary, buildPufLockWeldSchedule,
} from "@/features/labour-colony-studio/reports/pufLockSchedules";
import { DimChainH, DimChainV, DimLineH, DimLineV, GridLines, NorthArrow, ScaleBar } from "./sheetPrimitives";
import { PLAN, footprintXY, mLabel, parseGrid, planPpm, planSpan, spanZ } from "./planScale";

/* ══════════════════════════════════════════════════════════════════════════ shared props ═══════ */

export interface PufLockLayoutSheetProps {
  model: ColonyModel;
  meta: ColonyDrawingMeta;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

export interface PufLockDetailSheetProps {
  model: ColonyModel;
  meta: ColonyDrawingMeta;
}

/* ══════════════════════════════════════════════════════════════════════════ small helpers ══════ */

/** An axis-aligned box in colony metres — the shape both the core geometry and the parts expose. */
interface Box {
  x0: number; y0: number; z0: number;
  x1: number; y1: number; z1: number;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

/** True when a dimension is unusable — the sheet must print an error, never a "0 mm" size. */
const badDim = (v: number | undefined): boolean => !(typeof v === "number" && Number.isFinite(v) && v > 0);

/** A millimetre value as dimension text. A missing / zero size is called out, never drawn as 0. */
const mmText = (v: number | undefined): string => (badDim(v) ? "NOT SPECIFIED" : String(round2(v as number)));

/** Greedy word wrap for SVG text (SVG has no flow layout). */
function wrapText(text: string, maxChars: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (!line) { line = word; continue; }
    if (`${line} ${word}`.length > maxChars) { out.push(line); line = word; } else line = `${line} ${word}`;
  }
  if (line) out.push(line);
  return out;
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

/** The colony-metre box of a model part, or null when the solid has no extent. */
function partBox(p: ColonyPart): Box | null {
  const f = footprintXY(p.solid);
  const z = spanZ(p.solid);
  return f && z ? { x0: f.x0, y0: f.y0, x1: f.x1, y1: f.y1, z0: z.z0, z1: z.z1 } : null;
}

/**
 * The local fabrication frame of one assembly, in MILLIMETRES about the plate centre:
 *   `along`  runs along the wall (the C-purlin length),
 *   `across` runs across it (the pocket width),
 *   `up`     is measured from the top of the plinth beam (the plate underside).
 * Every detail sheet projects the core's own colony-metre geometry through this, so nothing is
 * re-derived by hand.
 */
function localFrame(pos: PufLockPlatePosition, plinthTopM: number) {
  const alongX = pos.axis === "x";
  return {
    along: (b: Box) => (alongX
      ? { a0: (b.x0 - pos.xM) * 1000, a1: (b.x1 - pos.xM) * 1000 }
      : { a0: (b.y0 - pos.yM) * 1000, a1: (b.y1 - pos.yM) * 1000 }),
    across: (b: Box) => (alongX
      ? { n0: (b.y0 - pos.yM) * 1000, n1: (b.y1 - pos.yM) * 1000 }
      : { n0: (b.x0 - pos.xM) * 1000, n1: (b.x1 - pos.xM) * 1000 }),
    up: (b: Box) => ({ z0: (b.z0 - plinthTopM) * 1000, z1: (b.z1 - plinthTopM) * 1000 }),
    bolt: (b: { x: number; y: number }) => (alongX
      ? { a: (b.x - pos.xM) * 1000, n: (b.y - pos.yM) * 1000 }
      : { a: (b.y - pos.yM) * 1000, n: (b.x - pos.xM) * 1000 }),
  };
}

/** The plinth-beam section the model actually carries (mm), or null when civil work is switched off. */
function plinthBeamSectionMm(model: ColonyModel): { widthMm: number; depthMm: number } | null {
  for (const p of model.parts) {
    if (p.kind !== "plinth-beam") continue;
    const b = partBox(p);
    if (!b) continue;
    const w = Math.min(b.x1 - b.x0, b.y1 - b.y0);
    const dpt = b.z1 - b.z0;
    if (w > 0 && dpt > 0) return { widthMm: Math.round(w * 1000), depthMm: Math.round(dpt * 1000) };
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────────────── the availability gate ── */

type LockGate =
  | { ok: true; d: PufLockDerived }
  | { ok: false; reason: string };

/**
 * The one gate all four sheets pass through. A missing bundle, a disabled system or an empty layout
 * yields a clean, explained empty state — never a crash and never a half-drawn detail.
 */
function gateOf(model: ColonyModel): LockGate {
  const d = model.pufLock;
  if (!d) {
    return {
      ok: false,
      reason: "This model was built without the PUF panel bottom locking system, so there is no plate "
        + "layout, pocket or fabrication data to detail. Rebuild the model with the locking system "
        + "enabled to issue this sheet.",
    };
  }
  if (!d.config.enabled) {
    return {
      ok: false,
      reason: "The PUF panel bottom locking system is switched OFF for this project. No base plates, "
        + "anchor bolts, C-purlin pairs, welds or receiving pockets are taken off, so this detail is "
        + "deliberately not issued. Switch the locking system on in the Labour Colony calculator to "
        + "generate the layout, the pocket detail and the fabrication schedules.",
    };
  }
  if (!d.positions.length) {
    return {
      ok: false,
      reason: "The PUF panel bottom locking system is enabled but no base plates are placed, so there "
        + "is nothing to detail. Set a plate quantity or place plates on the plinth-beam runs in the "
        + "locking-system editor.",
    };
  }
  return { ok: true, d };
}

/** The empty state every sheet falls back to. */
function LockingOffSheet({ title, reason, meta }: { title: string; reason: string; meta: ColonyDrawingMeta }) {
  const lines = wrapText(reason, 92);
  const W = 940;
  const H = 150 + lines.length * 15;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" style={{ minWidth: Math.min(W, 620) }}>
        <rect x={0} y={0} width={W} height={H} fill={PLAN.paper} />
        <rect x={18} y={18} width={W - 36} height={H - 36} fill="none" stroke={PLAN.rule} strokeWidth={1} strokeDasharray="7 4" />
        <text x={44} y={54} fontSize={12} fontWeight={800} fill={PLAN.ink}>{title}</text>
        <text x={44} y={74} fontSize={9.5} fontWeight={700} fill={PLAN.dim}>
          SHEET NOT ISSUED — PUF PANEL BOTTOM LOCKING SYSTEM IS NOT ACTIVE
        </text>
        <line x1={44} y1={84} x2={W - 44} y2={84} stroke={PLAN.rule} strokeWidth={1} />
        {lines.map((l, i) => (
          <text key={l} x={44} y={106 + i * 15} fontSize={9.5} fill={PLAN.ink}>{l}</text>
        ))}
        <text x={44} y={H - 26} fontSize={8} fill={PLAN.sub}>
          {meta.projectName} · {meta.drawingNumber ?? "—"} · Rev {meta.revision ?? "R0"}
        </text>
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── module-private SVG primitives ── */

/** Horizontal dimension line, labelled in MILLIMETRES. A bad size prints the error text, not "0". */
function DimH({ x0, x1, y, mm, text }: { x0: number; x1: number; y: number; mm?: number; text?: string }) {
  const mid = (x0 + x1) / 2;
  const label = text ?? mmText(mm);
  const bad = text == null && badDim(mm);
  const w = Math.max(28, label.length * 4.9 + 8);
  const col = bad ? PLAN.weld : PLAN.dim;
  return (
    <g>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={col} strokeWidth={0.9} />
      <line x1={x0} y1={y - 4} x2={x0} y2={y + 4} stroke={col} strokeWidth={0.9} />
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke={col} strokeWidth={0.9} />
      <polygon points={`${x0},${y} ${x0 + 5},${y - 3} ${x0 + 5},${y + 3}`} fill={col} />
      <polygon points={`${x1},${y} ${x1 - 5},${y - 3} ${x1 - 5},${y + 3}`} fill={col} />
      <rect x={mid - w / 2} y={y - 9.5} width={w} height={11} fill={PLAN.paper} />
      <text x={mid} y={y - 1.5} fontSize={7.5} textAnchor="middle" fill={bad ? PLAN.weld : PLAN.ink} fontWeight={bad ? 700 : 400}>
        {label}
      </text>
    </g>
  );
}

/** Vertical dimension line, labelled in MILLIMETRES (rotated). */
function DimV({ y0, y1, x, mm, text }: { y0: number; y1: number; x: number; mm?: number; text?: string }) {
  const mid = (y0 + y1) / 2;
  const label = text ?? mmText(mm);
  const bad = text == null && badDim(mm);
  const h = Math.max(28, label.length * 4.9 + 8);
  const col = bad ? PLAN.weld : PLAN.dim;
  return (
    <g>
      <line x1={x} y1={y0} x2={x} y2={y1} stroke={col} strokeWidth={0.9} />
      <line x1={x - 4} y1={y0} x2={x + 4} y2={y0} stroke={col} strokeWidth={0.9} />
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke={col} strokeWidth={0.9} />
      <polygon points={`${x},${y0} ${x - 3},${y0 + 5} ${x + 3},${y0 + 5}`} fill={col} />
      <polygon points={`${x},${y1} ${x - 3},${y1 - 5} ${x + 3},${y1 - 5}`} fill={col} />
      <rect x={x - 9.5} y={mid - h / 2} width={11} height={h} fill={PLAN.paper} />
      <text x={x} y={mid} fontSize={7.5} textAnchor="middle" fill={bad ? PLAN.weld : PLAN.ink}
        fontWeight={bad ? 700 : 400} transform={`rotate(-90 ${x} ${mid})`}>
        {label}
      </text>
    </g>
  );
}

/** A leader line with a text note at its tail. */
function Leader({ x, y, tx, ty, text, anchor = "start", color }: {
  x: number; y: number; tx: number; ty: number; text: string; anchor?: "start" | "end"; color?: string;
}) {
  const col = color ?? PLAN.dim;
  return (
    <g>
      <line x1={x} y1={y} x2={tx} y2={ty} stroke={col} strokeWidth={0.7} />
      <circle cx={x} cy={y} r={1.6} fill={col} />
      <text x={anchor === "end" ? tx - 3 : tx + 3} y={ty - 2} fontSize={7.5} textAnchor={anchor} fill={PLAN.ink}>{text}</text>
    </g>
  );
}

/** An ISO weld symbol: arrow to the joint, reference line and a fillet triangle carrying leg + length. */
function WeldSymbol({ x, y, tx, ty, text, allRound }: {
  x: number; y: number; tx: number; ty: number; text: string; allRound?: boolean;
}) {
  const refX1 = tx + 82;
  return (
    <g>
      <line x1={x} y1={y} x2={tx} y2={ty} stroke={PLAN.weld} strokeWidth={0.9} />
      <polygon points={`${x},${y} ${x + (tx > x ? -6 : 6)},${y - 3} ${x + (tx > x ? -6 : 6)},${y + 3}`} fill={PLAN.weld} />
      <line x1={tx} y1={ty} x2={refX1} y2={ty} stroke={PLAN.weld} strokeWidth={0.9} />
      {allRound && <circle cx={tx} cy={ty} r={3.4} fill="none" stroke={PLAN.weld} strokeWidth={0.9} />}
      <polygon points={`${tx + 10},${ty} ${tx + 20},${ty} ${tx + 10},${ty - 9}`} fill={PLAN.weld} />
      <text x={tx + 23} y={ty - 2} fontSize={7.5} fill={PLAN.weld} fontWeight={700}>{text}</text>
    </g>
  );
}

/** Section-cut hatching inside a rectangle (concrete / steel body). */
function Hatch({ x, y, w, h, step = 7, color }: { x: number; y: number; w: number; h: number; step?: number; color: string }) {
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = -h; i < w; i += step) lines.push({ x1: x + i, y1: y + h, x2: x + i + h, y2: y });
  return (
    <g>
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={color} strokeWidth={0.45} opacity={0.55} />
      ))}
    </g>
  );
}

/** A horizontal break line closing off a truncated member. */
function BreakLine({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  const m = (x0 + x1) / 2;
  return (
    <polyline points={`${x0},${y} ${m - 6},${y} ${m - 2},${y - 6} ${m + 2},${y + 6} ${m + 6},${y} ${x1},${y}`}
      fill="none" stroke={PLAN.ink} strokeWidth={0.9} />
  );
}

/** A vertical break line closing off a truncated member. */
function BreakLineV({ y0, y1, x }: { y0: number; y1: number; x: number }) {
  const m = (y0 + y1) / 2;
  return (
    <polyline points={`${x},${y0} ${x},${m - 6} ${x - 6},${m - 2} ${x + 6},${m + 2} ${x},${m + 6} ${x},${y1}`}
      fill="none" stroke={PLAN.ink} strokeWidth={0.9} />
  );
}

/** A dash-dot centreline. */
function CentreLineH({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  return <line x1={x0} y1={y} x2={x1} y2={y} stroke={PLAN.grid} strokeWidth={0.7} strokeDasharray="10 3 2 3" />;
}

function CentreLineV({ y0, y1, x }: { y0: number; y1: number; x: number }) {
  return <line x1={x} y1={y0} x2={x} y2={y1} stroke={PLAN.grid} strokeWidth={0.7} strokeDasharray="10 3 2 3" />;
}

/** A level marker: a filled triangle on the level line plus its value. */
function LevelTag({ x, y, x1, label, value }: { x: number; y: number; x1: number; label: string; value: string }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x1} y2={y} stroke={PLAN.dim} strokeWidth={0.7} strokeDasharray="4 3" />
      <polygon points={`${x1},${y} ${x1 - 6},${y - 7} ${x1 + 6},${y - 7}`} fill="none" stroke={PLAN.dim} strokeWidth={0.9} />
      <text x={x1 + 10} y={y - 6} fontSize={7.5} fill={PLAN.ink} fontWeight={700}>{value}</text>
      <text x={x1 + 10} y={y + 4} fontSize={7} fill={PLAN.sub}>{label}</text>
    </g>
  );
}

/**
 * The TRUE lipped-C outline of one purlin, in the (across, up) plane, as sheet coordinates.
 *
 * `innerPx` is the web face on the pocket line, `outSign` the direction the flanges turn (+1 / −1 in
 * sheet-x). Returns null when the section is incomplete — the caller must then print the engineering
 * issue instead of drawing an impossible profile.
 */
function cProfilePoints(opts: {
  innerPx: number; outSign: 1 | -1; basePx: number; s: number;
  depthMm: number; flangeMm: number; lipMm: number; thicknessMm: number;
}): string | null {
  const { innerPx, outSign, basePx, s, depthMm, flangeMm, lipMm, thicknessMm } = opts;
  if (badDim(depthMm) || badDim(flangeMm) || badDim(thicknessMm) || badDim(lipMm)) return null;
  if (flangeMm <= thicknessMm || depthMm <= 2 * thicknessMm || lipMm <= thicknessMm) return null;

  const X = (mm: number) => innerPx + outSign * mm * s;   // outward from the web inner face
  const Y = (mm: number) => basePx - mm * s;              // up from the plate top

  const o = flangeMm;                 // outer edge of the flange
  const wOut = thicknessMm;           // web outer face
  const lipIn = flangeMm - thicknessMm; // inner face of the lip return

  const pts: [number, number][] = [
    [0, 0], [o, 0], [o, lipMm], [lipIn, lipMm], [lipIn, thicknessMm], [wOut, thicknessMm],
    [wOut, depthMm - thicknessMm], [lipIn, depthMm - thicknessMm], [lipIn, depthMm - lipMm],
    [o, depthMm - lipMm], [o, depthMm], [0, depthMm],
  ];
  return pts.map(([n, z]) => `${X(n)},${Y(z)}`).join(" ");
}

/* ───────────────────────────────────────────────────────────────────────── HTML sub-blocks ────── */

const TH: CSSProperties = {
  textAlign: "left", padding: "4px 8px", fontSize: 9, color: "#0f172a",
  borderBottom: "1.5px solid #0f172a", textTransform: "uppercase", letterSpacing: "0.05em",
};
const TD: CSSProperties = { padding: "3px 8px", fontSize: 11, borderBottom: "1px solid #e2e8f0", color: "#334155" };
const TD_STRONG: CSSProperties = { ...TD, color: "#0f172a", fontWeight: 700 };

/** The standing drawing notes, numbered, exactly as the engineering core publishes them. */
function GeneralNotes() {
  return (
    <div style={{ marginTop: 8, border: "1px solid #cbd5e1", borderRadius: 4, padding: "8px 12px", background: "#ffffff" }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", color: "#0f172a", textTransform: "uppercase" }}>
        General notes
      </div>
      <ol style={{ margin: "6px 0 0", paddingLeft: 20, color: "#334155" }}>
        {PUF_LOCK_DRAWING_NOTES.map((note) => (
          <li key={note} style={{ fontSize: 10, lineHeight: 1.55 }}>{note}</li>
        ))}
      </ol>
    </div>
  );
}

/** Every validation issue the core raised, so a sheet never quietly draws an unbuildable detail. */
function IssueCallouts({ issues }: { issues: PufLockIssue[] }) {
  if (!issues.length) return null;
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  return (
    <div style={{ marginTop: 8, border: `1px solid ${errors.length ? "#ef4444" : "#f59e0b"}`, borderRadius: 4, padding: "8px 12px", background: "#ffffff" }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: errors.length ? "#ef4444" : "#b45309" }}>
        {errors.length ? "Engineering errors — this detail cannot be built as configured" : "Engineering warnings"}
      </div>
      <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
        {errors.map((i) => (
          <li key={`e-${i.code}-${i.plateId ?? ""}`} style={{ fontSize: 10, lineHeight: 1.55, color: "#ef4444", fontWeight: 600 }}>
            [{i.code}] {i.message}
          </li>
        ))}
        {warnings.map((i) => (
          <li key={`w-${i.code}-${i.plateId ?? ""}`} style={{ fontSize: 10, lineHeight: 1.55, color: "#b45309" }}>
            [{i.code}] {i.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The mandatory standing explanation / disclaimer, printed verbatim. */
function ExplanationBlock() {
  return (
    <div style={{ marginTop: 8, border: "1px solid #0f172a", borderRadius: 4, padding: "8px 12px", background: "#ffffff" }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", color: "#0f172a", textTransform: "uppercase" }}>
        Purpose of the locking system
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 10, lineHeight: 1.6, color: "#0f172a" }}>{PUF_LOCK_EXPLANATION}</p>
    </div>
  );
}

/** A compact key/value spec strip used under the enlarged details. */
function SpecStrip({ rows }: { rows: { k: string; v: string }[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", background: "#ffffff", marginTop: 8 }}>
      <tbody>
        {Array.from({ length: Math.ceil(rows.length / 2) }).map((_, i) => {
          const left = rows[i * 2];
          const right = rows[i * 2 + 1];
          return (
            <tr key={left.k}>
              <td style={{ ...TD, width: "22%" }}>{left.k}</td>
              <td style={{ ...TD, color: "#0f172a", fontWeight: 600, width: "28%" }}>{left.v}</td>
              <td style={{ ...TD, width: "22%" }}>{right ? right.k : ""}</td>
              <td style={{ ...TD, color: "#0f172a", fontWeight: 600, width: "28%" }}>{right ? right.v : ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ══════════════════════════════════════════════════════════════ A · PLATE LAYOUT PLAN ══════════ */

const PAD_A = 112;

/**
 * SHEET A — the plinth-beam + base-plate LAYOUT PLAN.
 *
 * Plates are drawn where `PufLockDerived.positions` puts them; the offset dimension is drawn from the
 * gridline the core itself measured against (`station = plate − offset`), so the drawn dimension and
 * the printed setting-out value can never disagree.
 */
export function PufLockLayoutSheet({ model, meta, selectedId, onSelect }: PufLockLayoutSheetProps) {
  const gate = gateOf(model);
  if (!gate.ok) {
    return <LockingOffSheet title="PUF PANEL BOTTOM LOCKING — BASE-PLATE LAYOUT PLAN" reason={gate.reason} meta={meta} />;
  }
  const d = gate.d;
  const c: PufLockConfig = d.config;
  const t = d.takeoff;
  const summary = buildPufLockLayoutSummary(d);
  const editableLayout = summary.plates > 0 && summary.manualPlates === 0;

  /* ---- plan projection ------------------------------------------------------------------- */
  const b = model.bounds;
  const { L, D } = planSpan(b);
  const ppm = planPpm(Math.max(L, D));
  const mx = (m: number) => PAD_A + (m - b.min.x) * ppm;
  const my = (m: number) => PAD_A + (m - b.min.y) * ppm;
  const planW = L * ppm;
  const planH = D * ppm;
  const svgW = Math.max(940, planW + PAD_A * 2 + 60);
  const svgH = planH + PAD_A + 178;

  /* ---- the structural grid (ground-floor columns; plate stations as the fallback) --------- */
  const letterEntries: { v: number; label: string }[] = [];
  const numberEntries: { v: number; label: string }[] = [];
  for (const col of model.parts) {
    if (col.kind !== "column" || (col.floor ?? 0) !== 0) continue;
    const f = footprintXY(col.solid);
    const g = parseGrid(col.grid);
    if (!f || !g) continue;
    letterEntries.push({ v: (f.x0 + f.x1) / 2, label: g.letter });
    numberEntries.push({ v: (f.y0 + f.y1) / 2, label: g.num });
  }
  if (!letterEntries.length || !numberEntries.length) {
    // fall back to the gridline each plate was set out from: station = plate centre − core offset
    for (const p of d.positions) {
      const g = parseGrid(p.gridRef);
      if (!g) continue;
      const off = p.offsetMm / 1000;
      letterEntries.push({ v: p.axis === "x" ? p.xM - off : p.xM, label: g.letter });
      numberEntries.push({ v: p.axis === "y" ? p.yM - off : p.yM, label: g.num });
    }
  }
  const gxs = bucket(letterEntries);
  const gys = bucket(numberEntries);
  const oX0 = gxs.length ? gxs[0].v : b.min.x;
  const oX1 = gxs.length ? gxs[gxs.length - 1].v : b.max.x;
  const oY0 = gys.length ? gys[0].v : b.min.y;
  const oY1 = gys.length ? gys[gys.length - 1].v : b.max.y;

  /* ---- selection: any member of an assembly highlights its plate --------------------------- */
  const plateParts = new Map<string, ColonyPart>();
  for (const p of model.parts) {
    if (p.kind === "puf-lock-base-plate" && p.connectionId) plateParts.set(p.connectionId, p);
  }
  const selectedConn = selectedId
    ? model.parts.find((p) => p.id === selectedId)?.connectionId
    : undefined;

  /* ---- runs, for the plate-spacing chains -------------------------------------------------- */
  const runs = new Map<string, PufLockPlatePosition[]>();
  for (const p of d.positions) {
    const list = runs.get(p.beamId) ?? [];
    list.push(p);
    runs.set(p.beamId, list);
  }
  const midX = (b.min.x + b.max.x) / 2;
  const midY = (b.min.y + b.max.y) / 2;
  /** +1 when the run lies on the low side of the plan (dimensions step INWARD). */
  const inwardOf = (p: PufLockPlatePosition): 1 | -1 =>
    (p.axis === "x" ? p.yM <= midY : p.xM <= midX) ? 1 : -1;

  const plinthBeams = model.parts.filter((p) => p.kind === "plinth-beam");
  const plateSq = Math.max(11, Math.min(20, (c.plate.lengthMm / 1000) * ppm));

  /* ---- setting-out table rows -------------------------------------------------------------- */
  const rows = d.positions.map((p) => ({
    pos: p,
    partId: plateParts.get(`pufl:${p.mark}`)?.id ?? null,
    plateMark: `${c.plate.mark}-${p.mark.slice(1)}`,
  }));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 660) }}>
        <rect x={0} y={0} width={svgW} height={svgH} fill={PLAN.paper} />

        {/* building envelope + plinth-beam runs */}
        <rect x={mx(b.min.x)} y={my(b.min.y)} width={planW} height={planH}
          fill="none" stroke={PLAN.rule} strokeWidth={1} />
        {plinthBeams.map((p) => {
          const f = footprintXY(p.solid);
          if (!f) return null;
          return (
            <rect key={p.id} x={mx(f.x0)} y={my(f.y0)}
              width={Math.max(2, mx(f.x1) - mx(f.x0))} height={Math.max(2, my(f.y1) - my(f.y0))}
              fill={PLAN.plinth} opacity={0.8} />
          );
        })}

        {/* bubbled structural grid */}
        <GridLines
          xs={gxs.map((g) => ({ px: mx(g.v), label: g.label }))}
          ys={gys.map((g) => ({ px: my(g.v), label: g.label }))}
          x0={mx(oX0)} x1={mx(oX1)} y0={my(oY0)} y1={my(oY1)} />

        {/* bay dimension chains */}
        <DimChainH stations={gxs.map((g) => ({ x: mx(g.v), m: g.v }))} y={my(oY0) - 62} />
        <DimChainV stations={gys.map((g) => ({ y: my(g.v), m: g.v }))} x={mx(oX0) - 62} />

        {/* overall setting-out dimensions */}
        <DimLineH x0={mx(b.min.x)} x1={mx(b.max.x)} y={my(b.min.y) - 88} label={mLabel(L)} />
        <DimLineV y0={my(b.min.y)} y1={my(b.max.y)} x={mx(b.min.x) - 88} label={mLabel(D)} />

        {/* plate spacing chains, one per plinth-beam run (drawn INSIDE the run) */}
        {[...runs.entries()].map(([beamId, list]) => {
          if (list.length < 2) return null;
          const first = list[0];
          const inward = inwardOf(first);
          if (first.axis === "x") {
            const yAt = my(first.yM) + inward * 34;
            return (
              <DimChainH key={`sp-${beamId}`} y={yAt}
                stations={list.map((p) => ({ x: mx(p.xM), m: p.xM }))} />
            );
          }
          const xAt = mx(first.xM) + inward * 34;
          return (
            <DimChainV key={`sp-${beamId}`} x={xAt}
              stations={list.map((p) => ({ y: my(p.yM), m: p.yM }))} />
          );
        })}

        {/* offset-from-gridline dimensions (station = plate centre − the core's own offset) */}
        {d.positions.map((p) => {
          if (p.offsetMm === 0) return null;
          const inward = inwardOf(p);
          const off = p.offsetMm / 1000;
          if (p.axis === "x") {
            const x0 = mx(p.xM - off), x1 = mx(p.xM);
            if (Math.abs(x1 - x0) < 16) return null;
            return <DimH key={`of-${p.id}`} x0={Math.min(x0, x1)} x1={Math.max(x0, x1)}
              y={my(p.yM) + inward * 14} mm={Math.abs(p.offsetMm)} />;
          }
          const y0 = my(p.yM - off), y1 = my(p.yM);
          if (Math.abs(y1 - y0) < 16) return null;
          return <DimV key={`of-${p.id}`} y0={Math.min(y0, y1)} y1={Math.max(y0, y1)}
            x={mx(p.xM) + inward * 14} mm={Math.abs(p.offsetMm)} />;
        })}

        {/* every plate — a numbered, clickable square symbol with its C-purlin orientation arrows */}
        {d.positions.map((p) => {
          const part = plateParts.get(`pufl:${p.mark}`);
          const sel = (part != null && part.id === selectedId) || selectedConn === `pufl:${p.mark}`;
          const cx = mx(p.xM);
          const cy = my(p.yM);
          const half = plateSq / 2;
          // the pocket runs ACROSS the wall: purlin flanges turn away from the panel on both sides
          const alongX = p.axis === "x";
          const arm = plateSq * 0.95;
          const a1 = alongX ? { x: cx, y: cy - arm } : { x: cx - arm, y: cy };
          const a2 = alongX ? { x: cx, y: cy + arm } : { x: cx + arm, y: cy };
          const head = (px: number, py: number, dir: "u" | "d" | "l" | "r") =>
            dir === "u" ? `${px},${py} ${px - 3},${py + 5} ${px + 3},${py + 5}`
              : dir === "d" ? `${px},${py} ${px - 3},${py - 5} ${px + 3},${py - 5}`
                : dir === "l" ? `${px},${py} ${px + 5},${py - 3} ${px + 5},${py + 3}`
                  : `${px},${py} ${px - 5},${py - 3} ${px - 5},${py + 3}`;
          return (
            <g key={p.id} onClick={() => onSelect?.(part?.id ?? null)} style={{ cursor: onSelect ? "pointer" : undefined }}>
              {/* the panel / pocket centreline through the plate */}
              {alongX
                ? <CentreLineH x0={cx - plateSq * 1.5} x1={cx + plateSq * 1.5} y={cy} />
                : <CentreLineV y0={cy - plateSq * 1.5} y1={cy + plateSq * 1.5} x={cx} />}
              {/* C-purlin orientation arrows — flanges turn AWAY from the panel */}
              <line x1={cx} y1={cy} x2={a1.x} y2={a1.y} stroke={PLAN.beam} strokeWidth={0.9} />
              <line x1={cx} y1={cy} x2={a2.x} y2={a2.y} stroke={PLAN.beam} strokeWidth={0.9} />
              <polygon points={head(a1.x, a1.y, alongX ? "u" : "l")} fill={PLAN.beam} />
              <polygon points={head(a2.x, a2.y, alongX ? "d" : "r")} fill={PLAN.beam} />
              {/* the plate symbol */}
              <rect x={cx - half} y={cy - half} width={plateSq} height={plateSq} rx={1}
                fill={sel ? PLAN.selFill : PLAN.plateFill} stroke={sel ? PLAN.sel : PLAN.plate} strokeWidth={sel ? 2.2 : 1.4} />
              <rect x={cx - half} y={cy - half} width={plateSq / 2} height={plateSq / 2}
                fill={sel ? PLAN.sel : PLAN.plate} opacity={0.7} />
              <text x={cx} y={cy - half - 4} fontSize={7.5} textAnchor="middle" fill={PLAN.plate} fontWeight={800}>
                {p.mark}
              </text>
            </g>
          );
        })}

        {/* "editable project layout" stamp */}
        {editableLayout && (
          <g>
            <rect x={svgW - 268} y={26} width={190} height={22} rx={3} fill={PLAN.paper} stroke={PLAN.sel} strokeWidth={1.4} />
            <text x={svgW - 173} y={41} fontSize={9} textAnchor="middle" fill={PLAN.ink} fontWeight={800}>
              EDITABLE PROJECT LAYOUT
            </text>
          </g>
        )}

        <NorthArrow x={svgW - 34} y={38} />
        <ScaleBar x={mx(oX0)} y={svgH - 26} ppm={ppm} />

        <text x={mx(b.min.x)} y={my(b.max.y) + 44} fontSize={10.5} fill={PLAN.ink} fontWeight={800}>
          PUF PANEL BOTTOM LOCKING SYSTEM — BASE-PLATE LAYOUT PLAN
        </text>
        <text x={mx(b.min.x)} y={my(b.max.y) + 58} fontSize={8} fill={PLAN.sub}>
          {summary.plates} plate{summary.plates === 1 ? "" : "s"} on {summary.runs} plinth-beam run
          {summary.runs === 1 ? "" : "s"} · spacing min {summary.minSpacingM.toFixed(2)} m / avg{" "}
          {summary.avgSpacingM.toFixed(2)} m / max {summary.maxSpacingM.toFixed(2)} m ·{" "}
          {summary.autoPlates} auto, {summary.manualPlates} manual · clear pocket {mmText(t.pocketClearGapMm)} mm for a{" "}
          {mmText(t.panelThicknessMm)} mm panel
        </text>

        {/* legend */}
        <g>
          <text x={mx(b.min.x)} y={my(b.max.y) + 80} fontSize={8.5} fill={PLAN.dim} fontWeight={700}>LEGEND</text>
          <rect x={mx(b.min.x)} y={my(b.max.y) + 88} width={13} height={13} fill={PLAN.plateFill} stroke={PLAN.plate} strokeWidth={1.4} />
          <rect x={mx(b.min.x)} y={my(b.max.y) + 88} width={6.5} height={6.5} fill={PLAN.plate} opacity={0.7} />
          <text x={mx(b.min.x) + 20} y={my(b.max.y) + 98} fontSize={7.5} fill={PLAN.ink}>
            MS base / anchor plate {c.plate.lengthMm} × {c.plate.widthMm} × {mmText(c.plate.thicknessMm)} mm ({c.plate.mark}-nn)
          </text>
          <rect x={mx(b.min.x) + 300} y={my(b.max.y) + 90} width={26} height={9} fill={PLAN.plinth} opacity={0.8} />
          <text x={mx(b.min.x) + 332} y={my(b.max.y) + 98} fontSize={7.5} fill={PLAN.ink}>RCC plinth beam run</text>
          <line x1={mx(b.min.x)} y1={my(b.max.y) + 114} x2={mx(b.min.x) + 26} y2={my(b.max.y) + 114}
            stroke={PLAN.beam} strokeWidth={0.9} />
          <polygon points={`${mx(b.min.x) + 26},${my(b.max.y) + 114} ${mx(b.min.x) + 21},${my(b.max.y) + 111} ${mx(b.min.x) + 21},${my(b.max.y) + 117}`} fill={PLAN.beam} />
          <text x={mx(b.min.x) + 32} y={my(b.max.y) + 117} fontSize={7.5} fill={PLAN.ink}>
            C-purlin pair — webs face the panel, flanges turn away ({c.purlin.designation})
          </text>
          <line x1={mx(b.min.x) + 300} y1={my(b.max.y) + 114} x2={mx(b.min.x) + 326} y2={my(b.max.y) + 114}
            stroke={PLAN.grid} strokeWidth={0.7} strokeDasharray="10 3 2 3" />
          <text x={mx(b.min.x) + 332} y={my(b.max.y) + 117} fontSize={7.5} fill={PLAN.ink}>Wall-panel centreline / pocket line</text>
        </g>
      </svg>

      {/* ── setting-out table ───────────────────────────────────────────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#ffffff", marginTop: 8 }}>
        <thead>
          <tr>
            {["Mark", "Plate mark", "Grid ref", "X (m)", "Y (m)", "Offset (mm)", "Host beam", "Source"].map((h) => (
              <th key={h} style={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const sel = (r.partId != null && r.partId === selectedId) || selectedConn === `pufl:${r.pos.mark}`;
            return (
              <tr key={r.pos.id}
                onClick={() => onSelect?.(r.partId)}
                style={{ cursor: onSelect ? "pointer" : undefined, background: sel ? "#fde68a" : undefined }}>
                <td style={TD_STRONG}>{r.pos.mark}</td>
                <td style={TD}>{r.plateMark}</td>
                <td style={TD}>{r.pos.gridRef}</td>
                <td style={TD}>{r.pos.xM.toFixed(3)}</td>
                <td style={TD}>{r.pos.yM.toFixed(3)}</td>
                <td style={TD}>{r.pos.offsetMm}</td>
                <td style={TD}>{r.pos.beamId}</td>
                <td style={{ ...TD, fontWeight: r.pos.source === "manual" ? 700 : 400, color: r.pos.source === "manual" ? "#0f172a" : "#334155" }}>
                  {r.pos.source === "manual" ? "Manual" : "Auto"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 4, fontSize: 8, color: "#94a3b8" }}>
        {editableLayout
          ? "EDITABLE PROJECT LAYOUT — every plate on this sheet is an automatically derived project default. "
            + "Moving, adding or deleting a plate in the locking-system editor makes the layout authoritative and it "
            + "will no longer be regenerated."
          : `${summary.manualPlates} plate(s) have been placed or moved by hand — this layout is authoritative and is `
            + "never regenerated from the automatic distribution."}{" "}
        Offsets are measured along the plinth-beam run from the nearest gridline. Coordinates are the model
        setting-out coordinates for {meta.projectName}.
      </div>

      <IssueCallouts issues={d.issues} />
      <GeneralNotes />
    </div>
  );
}

/* ═══════════════════════════════════════════════════ B · ENLARGED PLAN OF A TYPICAL ASSEMBLY ═══ */

/**
 * SHEET B — the enlarged PLAN of one typical assembly (millimetres), with section A–A through the
 * pocket alongside it, where the paired C-purlins are drawn as the TRUE lipped-C profile (web, two
 * flanges and two lips at their real dimensions) rather than a bounding box.
 */
export function PufLockEnlargedPlanSheet({ model, meta }: PufLockDetailSheetProps) {
  const gate = gateOf(model);
  if (!gate.ok) {
    return <LockingOffSheet title="PUF PANEL BOTTOM LOCKING — ENLARGED PLAN OF TYPICAL ASSEMBLY" reason={gate.reason} meta={meta} />;
  }
  const d = gate.d;
  const c = d.config;
  const t = d.takeoff;
  const pos = d.positions[0];
  const plinthTopM = model.meta.plinthM;
  const g = platePocketGeometry(c, pos, plinthTopM);
  const F = localFrame(pos, plinthTopM);
  const beam = plinthBeamSectionMm(model);

  const plateAlong = F.along(g.plate);
  const plateAcross = F.across(g.plate);
  const leftAcross = F.across(g.purlinLeft);
  const rightAcross = F.across(g.purlinRight);
  const purlinAlong = F.along(g.purlinLeft);
  const panelAcross = F.across(g.panelSeat);

  const plateLenMm = plateAlong.a1 - plateAlong.a0;
  const plateWidMm = plateAcross.n1 - plateAcross.n0;
  const purlinLenMm = purlinAlong.a1 - purlinAlong.a0;

  /* ---- B1 · plan pane -------------------------------------------------------------------- */
  const svgW = 1140;
  const s1 = Math.min(1.9, Math.max(0.35, 430 / Math.max(plateLenMm, purlinLenMm, 120)));
  const b1cx = 400;
  const b1cy = 290;
  const ax = (mm: number) => b1cx + mm * s1;   // along the wall
  const ny = (mm: number) => b1cy + mm * s1;   // across the wall
  const paneL = ax(Math.min(plateAlong.a0, purlinAlong.a0)) - 60;
  const paneR = ax(Math.max(plateAlong.a1, purlinAlong.a1)) + 60;

  /* ---- B2 · section A–A pane (true C profile) --------------------------------------------- */
  const b2cx = 900;
  const secAcross = Math.max(rightAcross.n1 - leftAcross.n0, 60) + 70;
  const s2 = Math.min(3.4, Math.max(0.6, 250 / secAcross));
  const b2base = 360;                                    // top of the base plate
  const sx = (mm: number) => b2cx + mm * s2;
  const sy = (mm: number) => b2base - mm * s2;
  const profileL = cProfilePoints({
    innerPx: sx(leftAcross.n1), outSign: leftAcross.n1 <= 0 ? -1 : 1, basePx: b2base, s: s2,
    depthMm: c.purlin.depthMm, flangeMm: c.purlin.flangeMm, lipMm: c.purlin.lipMm, thicknessMm: c.purlin.thicknessMm,
  });
  const profileR = cProfilePoints({
    innerPx: sx(rightAcross.n0), outSign: rightAcross.n0 >= 0 ? 1 : -1, basePx: b2base, s: s2,
    depthMm: c.purlin.depthMm, flangeMm: c.purlin.flangeMm, lipMm: c.purlin.lipMm, thicknessMm: c.purlin.thicknessMm,
  });

  const svgH = 650;
  const boltsLocal = boltCentres(c, pos).map(F.bolt);
  const boltXs = [...new Set(boltsLocal.map((v) => round2(v.a)))].sort((p, q) => p - q);
  const boltNs = [...new Set(boltsLocal.map((v) => round2(v.n)))].sort((p, q) => p - q);

  const specRows: { k: string; v: string }[] = [
    { k: "Typical assembly", v: assemblyCallout(c, 0) },
    { k: "Base plate", v: `${c.plate.lengthMm} × ${c.plate.widthMm} × ${mmText(c.plate.thicknessMm)} mm · ${c.plate.grade}` },
    { k: "C-purlin", v: `${c.purlin.designation} · ${mmText(c.purlin.lengthMm)} mm cut length · ${c.purlin.grade}` },
    { k: "Orientation", v: c.purlin.orientation === "webs-inward" ? "Webs inward (flanges out)" : "Flanges inward" },
    { k: "Clear pocket", v: `${mmText(t.pocketClearGapMm)} mm (panel ${mmText(t.panelThicknessMm)} mm + ${c.iface.installationClearanceMm} mm installation clearance)` },
    { k: "Side gap", v: `${t.sideGapMm} mm each side (max permitted ${c.iface.maxSideGapMm} mm)` },
    { k: "Anchorage", v: `${c.anchor.perPlate} nos M${c.anchor.diameterMm} × ${c.anchor.lengthMm} gr ${c.anchor.grade} (${c.anchor.type})` },
    { k: "Hole layout", v: `Ø${c.plate.boltHoleDiaMm} mm · pitch ${c.plate.holePitchMm} mm · gauge ${c.plate.holeGaugeMm} mm` },
    { k: "Weld", v: `${mmText(c.purlin.weldSizeMm)} mm ${c.purlin.weldType} · ${mmText(c.purlin.weldLengthMm)} mm × ${c.purlin.weldRunsPerPurlin} runs per purlin` },
    { k: "Isolation / sealant", v: `${c.iface.isolationStrip ? c.iface.isolationStripMaterial : "No isolation strip"} · ${c.iface.sealantType}` },
    { k: "Plinth beam", v: beam ? `${beam.widthMm} × ${beam.depthMm} mm (civil model)` : "Size per civil layout — civil work not priced" },
    { k: "Panel", v: `${c.iface.panelFinish} · ${c.iface.panelColour}` },
  ];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 720) }}>
        <rect x={0} y={0} width={svgW} height={svgH} fill={PLAN.paper} />

        {/* ═══════════════════ B1 · ENLARGED PLAN ═══════════════════ */}
        <text x={40} y={38} fontSize={11} fill={PLAN.ink} fontWeight={800}>
          B1 — ENLARGED PLAN ON TYPICAL LOCKING ASSEMBLY {pos.mark} (all dimensions mm)
        </text>
        <text x={40} y={53} fontSize={8} fill={PLAN.sub}>
          {assemblyCallout(c, 0)} · plinth beam {pos.beamId} · grid {pos.gridRef}
        </text>
        <line x1={40} y1={60} x2={svgW - 40} y2={60} stroke={PLAN.rule} strokeWidth={1} />

        {/* RCC plinth beam band running along the wall */}
        {beam ? (
          <g>
            <rect x={paneL} y={ny(-beam.widthMm / 2)} width={paneR - paneL} height={beam.widthMm * s1}
              fill={PLAN.footingFill} stroke={PLAN.plinth} strokeWidth={1.1} />
            <BreakLineV y0={ny(-beam.widthMm / 2)} y1={ny(beam.widthMm / 2)} x={paneL + 16} />
            <BreakLineV y0={ny(-beam.widthMm / 2)} y1={ny(beam.widthMm / 2)} x={paneR - 16} />
            <DimV y0={ny(-beam.widthMm / 2)} y1={ny(beam.widthMm / 2)} x={paneR + 22} mm={beam.widthMm} />
            <Leader x={paneL + 40} y={ny(-beam.widthMm / 2) + 6} tx={paneL - 6} ty={ny(-beam.widthMm / 2) - 22}
              text={`RCC plinth beam ${beam.widthMm} × ${beam.depthMm} mm`} />
          </g>
        ) : (
          <g>
            <rect x={paneL} y={ny(plateAcross.n0 - 50)} width={paneR - paneL} height={(plateWidMm + 100) * s1}
              fill={PLAN.footingFill} stroke={PLAN.plinth} strokeWidth={1.1} strokeDasharray="6 4" />
            <Leader x={paneL + 40} y={ny(plateAcross.n0 - 50) + 6} tx={paneL - 6} ty={ny(plateAcross.n0 - 50) - 22}
              text="RCC plinth beam — width per approved civil layout" />
          </g>
        )}

        {/* the base plate */}
        <rect x={ax(plateAlong.a0)} y={ny(plateAcross.n0)} width={plateLenMm * s1} height={plateWidMm * s1}
          fill={PLAN.plateFill} stroke={PLAN.plate} strokeWidth={1.6} />

        {/* the two C-purlins seen from above: flange band, lip edge and the web on the pocket line */}
        {([[leftAcross, -1], [rightAcross, 1]] as const).map(([acr, side]) => {
          const inner = side < 0 ? acr.n1 : acr.n0;
          const outer = side < 0 ? acr.n0 : acr.n1;
          const y0 = ny(Math.min(inner, outer));
          const h = Math.abs(ny(outer) - ny(inner));
          const webY = ny(inner);
          const webH = Math.max(1.4, c.purlin.thicknessMm * s1);
          return (
            <g key={side}>
              <rect x={ax(purlinAlong.a0)} y={y0} width={purlinLenMm * s1} height={h}
                fill={PLAN.columnFill} stroke={PLAN.column} strokeWidth={1.1} />
              {/* the web — the face that bounds the pocket */}
              <rect x={ax(purlinAlong.a0)} y={side < 0 ? webY - webH : webY} width={purlinLenMm * s1} height={webH}
                fill={PLAN.column} />
              {/* the lip return at the outer edge (below the flange, shown dashed) */}
              <line x1={ax(purlinAlong.a0)} y1={ny(outer) - side * Math.max(1.5, c.purlin.lipMm * s1 * 0.25)}
                x2={ax(purlinAlong.a1)} y2={ny(outer) - side * Math.max(1.5, c.purlin.lipMm * s1 * 0.25)}
                stroke={PLAN.column} strokeWidth={0.7} strokeDasharray="5 3" />
            </g>
          );
        })}

        {/* the captured PUF panel + its centreline */}
        <rect x={paneL + 26} y={ny(panelAcross.n0)} width={paneR - paneL - 52} height={(panelAcross.n1 - panelAcross.n0) * s1}
          fill={PLAN.wallFill} stroke={PLAN.dim} strokeWidth={1.2} />
        <BreakLineV y0={ny(panelAcross.n0)} y1={ny(panelAcross.n1)} x={paneL + 42} />
        <BreakLineV y0={ny(panelAcross.n0)} y1={ny(panelAcross.n1)} x={paneR - 42} />
        <CentreLineH x0={paneL - 10} x1={paneR + 10} y={ny(0)} />
        <text x={paneR + 14} y={ny(0) + 3} fontSize={7} fill={PLAN.grid} fontWeight={700}>CL</text>

        {/* sealant beads on both faces of the panel at the pocket mouth */}
        <rect x={ax(purlinAlong.a0)} y={ny(panelAcross.n0) - 3} width={purlinLenMm * s1} height={3} fill={PLAN.opening} />
        <rect x={ax(purlinAlong.a0)} y={ny(panelAcross.n1)} width={purlinLenMm * s1} height={3} fill={PLAN.opening} />
        <Leader x={ax(purlinAlong.a1) - 20} y={ny(panelAcross.n1) + 2} tx={ax(purlinAlong.a1) + 34} ty={ny(panelAcross.n1) + 40}
          text={`${c.iface.sealantType} — both faces`} />
        {c.iface.isolationStrip && (
          <Leader x={ax(purlinAlong.a0) + 24} y={ny(panelAcross.n0) + 6} tx={ax(purlinAlong.a0) - 60} ty={ny(panelAcross.n1) + 62}
            text={`${c.iface.isolationStripMaterial} (below panel, in the pocket)`} />
        )}

        {/* bolt holes at true pitch / gauge */}
        {boltsLocal.map((bp, i) => {
          const r = Math.max(2, (c.plate.boltHoleDiaMm / 2) * s1);
          return (
            <g key={`bolt-${i}`}>
              <circle cx={ax(bp.a)} cy={ny(bp.n)} r={r} fill={PLAN.paper} stroke={PLAN.plate} strokeWidth={1} />
              <circle cx={ax(bp.a)} cy={ny(bp.n)} r={Math.max(1.2, (c.anchor.diameterMm / 2) * s1)} fill={PLAN.bolt} />
              <line x1={ax(bp.a) - r - 5} y1={ny(bp.n)} x2={ax(bp.a) + r + 5} y2={ny(bp.n)} stroke={PLAN.dim} strokeWidth={0.5} strokeDasharray="6 2 1 2" />
              <line x1={ax(bp.a)} y1={ny(bp.n) - r - 5} x2={ax(bp.a)} y2={ny(bp.n) + r + 5} stroke={PLAN.dim} strokeWidth={0.5} strokeDasharray="6 2 1 2" />
            </g>
          );
        })}

        {/* plan dimensions */}
        <DimH x0={ax(plateAlong.a0)} x1={ax(plateAlong.a1)} y={ny(plateAcross.n0) - 24} mm={plateLenMm} />
        {boltXs.length >= 2 && (
          <DimH x0={ax(boltXs[0])} x1={ax(boltXs[boltXs.length - 1])} y={ny(plateAcross.n1) + 24} mm={c.plate.holePitchMm} />
        )}
        {boltXs.length >= 1 && (
          <DimH x0={ax(plateAlong.a0)} x1={ax(boltXs[0])} y={ny(plateAcross.n1) + 44} mm={Math.abs(boltXs[0] - plateAlong.a0)} />
        )}
        <DimV y0={ny(plateAcross.n0)} y1={ny(plateAcross.n1)} x={ax(plateAlong.a1) + 26} mm={plateWidMm} />
        {boltNs.length >= 2 && (
          <DimV y0={ny(boltNs[0])} y1={ny(boltNs[boltNs.length - 1])} x={ax(plateAlong.a0) - 24} mm={c.plate.holeGaugeMm} />
        )}
        <DimV y0={ny(leftAcross.n1)} y1={ny(rightAcross.n0)} x={ax(plateAlong.a0) - 48} mm={t.pocketClearGapMm} />
        <DimV y0={ny(panelAcross.n0)} y1={ny(panelAcross.n1)} x={ax(plateAlong.a0) - 72} mm={t.panelThicknessMm} />
        <DimV y0={ny(leftAcross.n1)} y1={ny(panelAcross.n0)} x={ax(plateAlong.a1) + 50} mm={t.sideGapMm} />
        <DimV y0={ny(panelAcross.n1)} y1={ny(rightAcross.n0)} x={ax(plateAlong.a1) + 74} mm={t.sideGapMm} />
        <DimH x0={ax(purlinAlong.a0)} x1={ax(purlinAlong.a1)} y={ny(rightAcross.n1) + 66} mm={purlinLenMm} />

        {/* weld locations along the foot of each web */}
        <WeldSymbol x={ax(purlinAlong.a1) - 30} y={ny(leftAcross.n1)} tx={ax(purlinAlong.a1) + 8} ty={ny(plateAcross.n0) - 46}
          text={`${mmText(c.purlin.weldSizeMm)} ${c.purlin.weldType} × ${mmText(c.purlin.weldLengthMm)}`} />
        <WeldSymbol x={ax(purlinAlong.a0) + 30} y={ny(rightAcross.n0)} tx={ax(purlinAlong.a0) - 96} ty={ny(plateAcross.n1) + 96}
          text={`${mmText(c.purlin.weldSizeMm)} ${c.purlin.weldType} × ${mmText(c.purlin.weldLengthMm)}`} />

        <Leader x={ax(plateAlong.a0) + 12} y={ny(plateAcross.n0) + 12} tx={paneL - 6} ty={ny(plateAcross.n0) - 46}
          text={`Base plate ${c.plate.mark}-${pos.mark.slice(1)} ${c.plate.lengthMm} × ${c.plate.widthMm} × ${mmText(c.plate.thicknessMm)} thk`} />
        <Leader x={ax(0)} y={ny(leftAcross.n0) + 4} tx={ax(0) - 130} ty={ny(rightAcross.n1) + 92}
          text={`2 nos ${c.purlin.designation} — ${c.purlin.orientation === "webs-inward" ? "webs inward, flanges out" : "flanges inward"}`} />
        {boltsLocal[0] && (
          <Leader x={ax(boltsLocal[0].a)} y={ny(boltsLocal[0].n)} tx={paneL - 6} ty={ny(plateAcross.n1) + 74}
            text={`${c.anchor.perPlate} nos M${c.anchor.diameterMm} ${c.anchor.type} anchors in Ø${c.plate.boltHoleDiaMm} holes`} />
        )}

        {/* the A–A cut line referencing B2 */}
        <g>
          <line x1={ax(purlinAlong.a1) + 16} y1={ny(leftAcross.n0) - 30} x2={ax(purlinAlong.a1) + 16} y2={ny(rightAcross.n1) + 30}
            stroke={PLAN.ink} strokeWidth={1.1} strokeDasharray="12 4 3 4" />
          <polygon points={`${ax(purlinAlong.a1) + 16},${ny(leftAcross.n0) - 30} ${ax(purlinAlong.a1) + 10},${ny(leftAcross.n0) - 20} ${ax(purlinAlong.a1) + 22},${ny(leftAcross.n0) - 20}`} fill={PLAN.ink} />
          <text x={ax(purlinAlong.a1) + 16} y={ny(leftAcross.n0) - 36} fontSize={8} textAnchor="middle" fill={PLAN.ink} fontWeight={800}>A</text>
          <text x={ax(purlinAlong.a1) + 16} y={ny(rightAcross.n1) + 42} fontSize={8} textAnchor="middle" fill={PLAN.ink} fontWeight={800}>A</text>
        </g>

        {/* ═══════════════════ B2 · SECTION A–A (true C profile) ═══════════════════ */}
        <text x={700} y={92} fontSize={11} fill={PLAN.ink} fontWeight={800}>B2 — SECTION A–A THROUGH THE POCKET</text>
        <text x={700} y={106} fontSize={8} fill={PLAN.sub}>
          Paired C-purlins in TRUE section — web + 2 flanges + 2 lips at their real dimensions
        </text>

        {profileL && profileR ? (
          <g>
            {/* base plate under the purlins */}
            <rect x={sx(plateAcross.n0)} y={b2base} width={plateWidMm * s2} height={Math.max(3, c.plate.thicknessMm * s2)}
              fill={PLAN.plate} />
            {/* the two true lipped-C profiles */}
            <polygon points={profileL} fill={PLAN.columnFill} stroke={PLAN.column} strokeWidth={1.3} />
            <polygon points={profileR} fill={PLAN.columnFill} stroke={PLAN.column} strokeWidth={1.3} />
            {/* the captured panel */}
            <rect x={sx(panelAcross.n0)} y={sy(c.iface.seatingDepthMm + c.iface.insertionDepthMm)}
              width={(panelAcross.n1 - panelAcross.n0) * s2} height={Math.max(3, c.iface.insertionDepthMm * s2)}
              fill={PLAN.wallFill} stroke={PLAN.dim} strokeWidth={1.1} />
            <CentreLineV y0={sy(c.purlin.depthMm + 26)} y1={sy(-26)} x={sx(0)} />
            {/* pocket + section dimensions */}
            <DimH x0={sx(leftAcross.n1)} x1={sx(rightAcross.n0)} y={sy(c.purlin.depthMm) - 18} mm={t.pocketClearGapMm} />
            <DimH x0={sx(panelAcross.n0)} x1={sx(panelAcross.n1)} y={sy(c.purlin.depthMm) - 38} mm={t.panelThicknessMm} />
            <DimH x0={sx(leftAcross.n0)} x1={sx(leftAcross.n1)} y={sy(0) + 30} mm={c.purlin.flangeMm} />
            <DimV y0={sy(c.purlin.depthMm)} y1={sy(0)} x={sx(rightAcross.n1) + 26} mm={c.purlin.depthMm} />
            <DimV y0={sy(c.purlin.lipMm)} y1={sy(0)} x={sx(leftAcross.n0) - 22} mm={c.purlin.lipMm} />
            <Leader x={sx(leftAcross.n1)} y={sy(c.purlin.depthMm * 0.6)} tx={sx(leftAcross.n0) - 30} ty={sy(c.purlin.depthMm) - 54}
              text={`Web ${mmText(c.purlin.thicknessMm)} mm thk — bounds the pocket`} />
            <Leader x={sx(rightAcross.n1)} y={sy(c.purlin.depthMm - c.purlin.lipMm / 2)} tx={sx(rightAcross.n1) + 34} ty={sy(c.purlin.depthMm) - 42}
              text={`Lip ${mmText(c.purlin.lipMm)} mm`} />
          </g>
        ) : (
          <g>
            <rect x={720} y={120} width={380} height={96} fill={PLAN.paper} stroke={PLAN.weld} strokeWidth={1.2} />
            <text x={734} y={140} fontSize={9} fill={PLAN.weld} fontWeight={800}>SECTION NOT DRAWN — INCOMPLETE C SECTION</text>
            {wrapText(
              `The C-purlin section is not fully specified (depth ${mmText(c.purlin.depthMm)}, flange `
              + `${mmText(c.purlin.flangeMm)}, lip ${mmText(c.purlin.lipMm)}, thickness ${mmText(c.purlin.thicknessMm)} mm). `
              + "A true profile cannot be drawn from an incomplete section — no impossible dimension is issued.", 52,
            ).map((l, i) => (
              <text key={l} x={734} y={158 + i * 12} fontSize={8} fill={PLAN.ink}>{l}</text>
            ))}
          </g>
        )}

        <text x={40} y={svgH - 42} fontSize={7.5} fill={PLAN.sub}>
          Pocket clear width = selected PUF panel thickness + installation clearance. Standard panel thicknesses:{" "}
          {PUF_PANEL_THICKNESS_OPTIONS.join(" / ")} mm. This detail is dimensioned for the {mmText(t.panelThicknessMm)} mm panel
          selected for {meta.projectName}.
        </text>
        <text x={40} y={svgH - 26} fontSize={7.5} fill={PLAN.sub}>
          Enlarged detail — build to written dimensions, do not scale. Plate, hole, section and pocket sizes are read from the
          resolved locking-system configuration.
        </text>
      </svg>

      <SpecStrip rows={specRows} />
      <IssueCallouts issues={d.issues} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ C · SECTION AT THE PLINTH BEAM ═════ */

/**
 * SHEET C — "PUF PANEL BOTTOM LOCKING DETAIL AT PLINTH BEAM".
 *
 * The full dimensioned section across the wall: the hatched RCC plinth beam, the anchor bolt and its
 * embedment, the base plate, the nut and washer stack (taken from the model's own hardware parts), the
 * weld to EACH C-purlin, both purlins in true section, the seated PUF panel with its insertion depth
 * and bottom seating clearance, the sealant, and the level markers.
 */
export function PufLockSectionSheet({ model, meta }: PufLockDetailSheetProps) {
  const gate = gateOf(model);
  if (!gate.ok) {
    return <LockingOffSheet title="PUF PANEL BOTTOM LOCKING DETAIL AT PLINTH BEAM" reason={gate.reason} meta={meta} />;
  }
  const d = gate.d;
  const c = d.config;
  const t = d.takeoff;
  const pos = d.positions[0];
  const plinthTopM = model.meta.plinthM;
  const g = platePocketGeometry(c, pos, plinthTopM);
  const F = localFrame(pos, plinthTopM);
  const beam = plinthBeamSectionMm(model);

  const plateAcross = F.across(g.plate);
  const plateUp = F.up(g.plate);
  const leftAcross = F.across(g.purlinLeft);
  const rightAcross = F.across(g.purlinRight);
  const purlinUp = F.up(g.purlinLeft);
  const panelAcross = F.across(g.panelSeat);
  const panelUp = F.up(g.panelSeat);
  const bedUp = F.up(g.bed);

  /* ---- the real hardware the model carries for this assembly ------------------------------- */
  const conn = `pufl:${pos.mark}`;
  const group = model.parts.filter((p) => p.connectionId === conn);
  const nutPart = group.find((p) => p.kind === "puf-lock-nut");
  const washerPart = group.find((p) => p.kind === "puf-lock-washer");
  const sealantPart = group.find((p) => p.kind === "puf-lock-sealant");
  const nutBox = nutPart ? partBox(nutPart) : null;
  const washerBox = washerPart ? partBox(washerPart) : null;
  const sealantBox = sealantPart ? partBox(sealantPart) : null;
  const nutUp = nutBox ? F.up(nutBox) : null;
  const washerUp = washerBox ? F.up(washerBox) : null;
  const sealantUp = sealantBox ? F.up(sealantBox) : null;

  /* ---- bolt positions, in the section plane ------------------------------------------------ */
  const boltsLocal = boltCentres(c, pos).map(F.bolt);
  const boltNs = [...new Set(boltsLocal.map((v) => round2(v.n)))].sort((p, q) => p - q);
  const boltUp = g.bolts[0]
    ? F.up({ x0: 0, y0: 0, x1: 0, y1: 0, z0: g.bolts[0].z0, z1: g.bolts[0].z1 })
    : { z0: -c.anchor.embedmentMm, z1: c.anchor.projectionMm };

  /* ---- scale ------------------------------------------------------------------------------- */
  const acrossExtent = Math.max(beam?.widthMm ?? 0, plateAcross.n1 - plateAcross.n0, rightAcross.n1 - leftAcross.n0) + 170;
  /** The panel is truncated a little above the pocket, leaving the head of the sheet free for dims. */
  const panelTopMm = Math.max(purlinUp.z1, panelUp.z1, nutUp?.z1 ?? 0) + 12;
  const zTop = panelTopMm + 30;
  const zBot = -Math.max(beam?.depthMm ?? 0, Math.abs(boltUp.z0) + 60);
  const s = Math.min(2.0, Math.max(0.22, 560 / acrossExtent));

  const TOP_PAD = 130;
  const BOT_PAD = 96;
  const svgW = Math.max(1120, acrossExtent * s + 460);
  const svgH = TOP_PAD + (zTop - zBot) * s + BOT_PAD;
  const cx = Math.max(360, acrossExtent * s / 2 + 130);
  const baseY = TOP_PAD + zTop * s;                 // y of the plinth-beam top (z = 0)
  const sx = (mm: number) => cx + mm * s;
  const sy = (mm: number) => baseY - mm * s;
  const panelTopY = sy(panelTopMm);
  const levelX = svgW - 250;

  const beamW = beam?.widthMm ?? (plateAcross.n1 - plateAcross.n0) + 60;
  const beamD = beam?.depthMm ?? Math.max(Math.abs(boltUp.z0) + 60, 200);

  const profileL = cProfilePoints({
    innerPx: sx(leftAcross.n1), outSign: leftAcross.n1 <= 0 ? -1 : 1, basePx: sy(purlinUp.z0), s,
    depthMm: c.purlin.depthMm, flangeMm: c.purlin.flangeMm, lipMm: c.purlin.lipMm, thicknessMm: c.purlin.thicknessMm,
  });
  const profileR = cProfilePoints({
    innerPx: sx(rightAcross.n0), outSign: rightAcross.n0 >= 0 ? 1 : -1, basePx: sy(purlinUp.z0), s,
    depthMm: c.purlin.depthMm, flangeMm: c.purlin.flangeMm, lipMm: c.purlin.lipMm, thicknessMm: c.purlin.thicknessMm,
  });

  const fflM = plinthTopM;
  const lvl = (mm: number): string => `+${(fflM + mm / 1000).toFixed(3)} m`;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 700) }}>
        <rect x={0} y={0} width={svgW} height={svgH} fill={PLAN.paper} />

        <text x={40} y={40} fontSize={12} fill={PLAN.ink} fontWeight={800}>
          PUF PANEL BOTTOM LOCKING DETAIL AT PLINTH BEAM
        </text>
        <text x={40} y={56} fontSize={8.5} fill={PLAN.sub}>
          Section across the wall at typical assembly {pos.mark} ({assemblyCallout(c, 0)}) · plinth beam {pos.beamId} ·
          grid {pos.gridRef} · all dimensions in millimetres
        </text>
        <line x1={40} y1={64} x2={svgW - 40} y2={64} stroke={PLAN.rule} strokeWidth={1} />

        {/* ── RCC plinth beam, hatched ───────────────────────────────────────────────────── */}
        <rect x={sx(-beamW / 2)} y={sy(0)} width={beamW * s} height={beamD * s}
          fill={PLAN.footingFill} stroke={PLAN.plinth} strokeWidth={1.4} />
        <Hatch x={sx(-beamW / 2)} y={sy(0)} w={beamW * s} h={beamD * s} color={PLAN.pedestal} />
        <BreakLine x0={sx(-beamW / 2)} x1={sx(beamW / 2)} y={sy(0) + beamD * s} />
        {beam && <DimH x0={sx(-beamW / 2)} x1={sx(beamW / 2)} y={sy(0) + beamD * s + 34} mm={beam.widthMm} />}
        {beam && <DimV y0={sy(0)} y1={sy(0) + beamD * s} x={sx(-beamW / 2) - 26} mm={beam.depthMm} />}
        <Leader x={sx(-beamW / 2) + 14} y={sy(0) + beamD * s * 0.55} tx={sx(-beamW / 2) - 120} ty={sy(0) + beamD * s * 0.8}
          text={beam ? `RCC plinth beam ${beam.widthMm} × ${beam.depthMm} mm` : "RCC plinth beam — size per civil layout"} />

        {/* ── anchor bolts: embedment below, projection above ────────────────────────────── */}
        {boltNs.map((n, i) => {
          const bx = sx(n);
          const dPx = Math.max(2.6, c.anchor.diameterMm * s);
          return (
            <g key={`ab-${i}`}>
              <line x1={bx} y1={sy(boltUp.z0)} x2={bx} y2={sy(0)} stroke={PLAN.bolt} strokeWidth={dPx} strokeDasharray="6 3" opacity={0.75} />
              <line x1={bx} y1={sy(0)} x2={bx} y2={sy(boltUp.z1)} stroke={PLAN.bolt} strokeWidth={dPx} />
              {washerUp && (
                <rect x={bx - dPx * 1.9} y={sy(washerUp.z1)} width={dPx * 3.8}
                  height={Math.max(2, (washerUp.z1 - washerUp.z0) * s)} fill={PLAN.plate} />
              )}
              {nutUp && (
                <rect x={bx - dPx * 1.5} y={sy(nutUp.z1)} width={dPx * 3}
                  height={Math.max(3, (nutUp.z1 - nutUp.z0) * s)} fill={PLAN.bolt} stroke={PLAN.ink} strokeWidth={0.6} />
              )}
            </g>
          );
        })}
        {boltNs.length > 0 && (
          <>
            <DimV y0={sy(0)} y1={sy(boltUp.z0)} x={sx(boltNs[boltNs.length - 1]) + 24} mm={c.anchor.embedmentMm} />
            <Leader x={sx(boltNs[0])} y={sy(boltUp.z0) + 10} tx={sx(-beamW / 2) - 120} ty={sy(boltUp.z0) + 34}
              text={`${c.anchor.perPlate} nos M${c.anchor.diameterMm} × ${c.anchor.lengthMm} gr ${c.anchor.grade} ${c.anchor.type} anchor — ${c.anchor.embedmentMm} mm embedment`} />
            {nutUp && (
              <Leader x={sx(boltNs[boltNs.length - 1]) + 8} y={sy(nutUp.z1) + 2}
                tx={sx(beamW / 2) + 110} ty={sy(nutUp.z1) - 30}
                text={`Nut + washer · ${c.anchor.projectionMm} mm thread projection. ${c.anchor.tighteningNote}`} />
            )}
          </>
        )}

        {/* ── base plate ─────────────────────────────────────────────────────────────────── */}
        <rect x={sx(plateAcross.n0)} y={sy(plateUp.z1)} width={(plateAcross.n1 - plateAcross.n0) * s}
          height={Math.max(3, (plateUp.z1 - plateUp.z0) * s)} fill={PLAN.plate} stroke={PLAN.plate} strokeWidth={1} />
        <DimH x0={sx(plateAcross.n0)} x1={sx(plateAcross.n1)} y={sy(plateUp.z1) - 96} mm={plateAcross.n1 - plateAcross.n0} />
        <DimV y0={sy(plateUp.z1)} y1={sy(plateUp.z0)} x={sx(plateAcross.n1) + 30} mm={c.plate.thicknessMm} />
        <Leader x={sx(plateAcross.n0) + 10} y={sy(plateUp.z1) + 2} tx={sx(-beamW / 2) - 120} ty={sy(plateUp.z1) - 26}
          text={`MS base plate ${c.plate.mark}-${pos.mark.slice(1)} ${c.plate.lengthMm} × ${c.plate.widthMm} × ${mmText(c.plate.thicknessMm)} thk · ${c.plate.grade} · ${c.plate.finish}`} />

        {/* ── the paired C-purlins in true section ───────────────────────────────────────── */}
        {profileL && profileR ? (
          <g>
            <polygon points={profileL} fill={PLAN.columnFill} stroke={PLAN.column} strokeWidth={1.3} />
            <polygon points={profileR} fill={PLAN.columnFill} stroke={PLAN.column} strokeWidth={1.3} />
          </g>
        ) : (
          <g>
            <rect x={sx(leftAcross.n0)} y={sy(purlinUp.z1)} width={(leftAcross.n1 - leftAcross.n0) * s}
              height={Math.max(3, (purlinUp.z1 - purlinUp.z0) * s)} fill="none" stroke={PLAN.weld} strokeWidth={1.2} strokeDasharray="5 3" />
            <rect x={sx(rightAcross.n0)} y={sy(purlinUp.z1)} width={(rightAcross.n1 - rightAcross.n0) * s}
              height={Math.max(3, (purlinUp.z1 - purlinUp.z0) * s)} fill="none" stroke={PLAN.weld} strokeWidth={1.2} strokeDasharray="5 3" />
            <text x={sx(0)} y={sy(purlinUp.z1) - 14} fontSize={8} textAnchor="middle" fill={PLAN.weld} fontWeight={800}>
              C SECTION NOT SPECIFIED — PROFILE NOT DRAWN
            </text>
          </g>
        )}

        {/* ── the isolation-strip bed and sealant inside the pocket ──────────────────────── */}
        {c.iface.isolationStrip && bedUp.z1 > bedUp.z0 && (
          <rect x={sx(leftAcross.n1)} y={sy(bedUp.z1)} width={(rightAcross.n0 - leftAcross.n1) * s}
            height={Math.max(2, (bedUp.z1 - bedUp.z0) * s)} fill={PLAN.door} stroke={PLAN.dim} strokeWidth={0.6} />
        )}
        {sealantUp && (
          <rect x={sx(leftAcross.n1)} y={sy(sealantUp.z1)} width={(rightAcross.n0 - leftAcross.n1) * s}
            height={Math.max(2, (sealantUp.z1 - sealantUp.z0) * s)} fill={PLAN.opening} />
        )}

        {/* ── the captured PUF panel (truncated above the pocket with a break line) ──────── */}
        <rect x={sx(panelAcross.n0)} y={panelTopY} width={(panelAcross.n1 - panelAcross.n0) * s}
          height={Math.max(4, (panelTopMm - panelUp.z0) * s)} fill={PLAN.wallFill} stroke={PLAN.dim} strokeWidth={1.2} />
        <BreakLine x0={sx(panelAcross.n0)} x1={sx(panelAcross.n1)} y={panelTopY} />
        <CentreLineV y0={panelTopY - 12} y1={sy(-30)} x={sx(0)} />

        {/* ── welds: plate to EACH C-purlin ──────────────────────────────────────────────── */}
        <WeldSymbol x={sx(leftAcross.n0) + 2} y={sy(purlinUp.z0) - 3} tx={sx(-beamW / 2) - 116} ty={sy(purlinUp.z1) + 8}
          text={`${mmText(c.purlin.weldSizeMm)} ${c.purlin.weldType} × ${mmText(c.purlin.weldLengthMm)} — ${c.purlin.weldRunsPerPurlin} runs`} />
        <WeldSymbol x={sx(rightAcross.n1) - 2} y={sy(purlinUp.z0) - 3} tx={sx(beamW / 2) + 84} ty={sy(purlinUp.z1) + 8}
          text={`${mmText(c.purlin.weldSizeMm)} ${c.purlin.weldType} × ${mmText(c.purlin.weldLengthMm)} — ${c.purlin.weldRunsPerPurlin} runs`} />

        {/* ── pocket / panel dimensions (above the break, clear of the drawing) ──────────── */}
        <DimH x0={sx(leftAcross.n1)} x1={sx(rightAcross.n0)} y={panelTopY - 26} mm={t.pocketClearGapMm} />
        <DimH x0={sx(panelAcross.n0)} x1={sx(panelAcross.n1)} y={panelTopY - 46} mm={t.panelThicknessMm} />
        <DimH x0={sx(leftAcross.n1)} x1={sx(panelAcross.n0)} y={panelTopY - 66} mm={t.sideGapMm} />
        <DimH x0={sx(panelAcross.n1)} x1={sx(rightAcross.n0)} y={panelTopY - 66} mm={t.sideGapMm} />
        <DimV y0={sy(purlinUp.z1)} y1={sy(purlinUp.z0)} x={sx(rightAcross.n1) + 30} mm={c.purlin.depthMm} />
        <DimV y0={sy(panelUp.z1)} y1={sy(panelUp.z0)} x={sx(rightAcross.n1) + 56} mm={c.iface.insertionDepthMm} />
        {c.iface.seatingDepthMm > 0
          ? <DimV y0={sy(bedUp.z1)} y1={sy(bedUp.z0)} x={sx(leftAcross.n0) - 26} mm={c.iface.seatingDepthMm} />
          : (
            <Leader x={sx(leftAcross.n1)} y={sy(bedUp.z0)} tx={sx(-beamW / 2) - 116} ty={sy(purlinUp.z0) + 80}
              text="No bottom seating clearance specified — panel bears directly on the plate" color={PLAN.weld} />
          )}

        <Leader x={sx(panelAcross.n1) - 4} y={panelTopY + 16} tx={sx(beamW / 2) + 84} ty={panelTopY + 34}
          text={`PUF wall panel ${mmText(t.panelThicknessMm)} mm · ${c.iface.panelFinish} · ${c.iface.panelColour}`} />
        <Leader x={sx(leftAcross.n0) + 3} y={sy(purlinUp.z1 - c.purlin.depthMm * 0.4)} tx={sx(-beamW / 2) - 116} ty={sy(purlinUp.z1) + 34}
          text={`2 nos ${c.purlin.designation} · ${c.purlin.grade} · ${c.purlin.finish}`} />
        {c.iface.isolationStrip && (
          <Leader x={sx(0)} y={sy((bedUp.z0 + bedUp.z1) / 2)} tx={sx(beamW / 2) + 84} ty={sy(purlinUp.z0) + 44}
            text={`${c.iface.isolationStripMaterial} — seating bed in the pocket`} />
        )}
        {sealantUp && (
          <Leader x={sx(leftAcross.n1 * 0.5)} y={sy(sealantUp.z1)} tx={sx(-beamW / 2) - 116} ty={sy(purlinUp.z0) + 62}
            text={`${c.iface.sealantType} — sealant bead both faces`} />
        )}
        {c.iface.fastenerOption && (
          <Leader x={sx(rightAcross.n0)} y={sy(panelUp.z0 + c.iface.insertionDepthMm * 0.6)}
            tx={sx(beamW / 2) + 84} ty={sy(panelUp.z0 + c.iface.insertionDepthMm * 0.6) + 26}
            text={`Panel fastener: ${c.iface.fastenerSpec}`} />
        )}

        {/* ── level markers ──────────────────────────────────────────────────────────────── */}
        <LevelTag x={sx(beamW / 2)} y={sy(0)} x1={levelX} label="TOP OF PLINTH BEAM / FINISHED PLINTH LEVEL" value={lvl(0)} />
        <LevelTag x={sx(rightAcross.n1)} y={sy(panelUp.z0)} x1={levelX} label="PANEL BOTTOM SEATING LEVEL" value={lvl(panelUp.z0)} />
        <LevelTag x={sx(rightAcross.n1)} y={sy(purlinUp.z1)} x1={levelX} label="TOP OF C-PURLIN POCKET" value={lvl(purlinUp.z1)} />

        <text x={40} y={svgH - 40} fontSize={7.5} fill={PLAN.sub}>
          Levels are measured above natural ground level; the top of the plinth beam is the finished plinth level at{" "}
          {mLabel(fflM)}. Natural ground level lies {mLabel(fflM)} below the top of the plinth beam and is not shown on this detail.
        </text>
        <text x={40} y={svgH - 24} fontSize={7.5} fill={PLAN.sub}>
          Clear pocket {mmText(t.pocketClearGapMm)} mm = {mmText(t.panelThicknessMm)} mm panel + {c.iface.installationClearanceMm} mm
          installation clearance, giving {t.sideGapMm} mm each side (maximum permitted {c.iface.maxSideGapMm} mm). Build to written
          dimensions — do not scale. {meta.projectName}.
        </text>
      </svg>

      <ExplanationBlock />
      <IssueCallouts issues={d.issues} />
      <GeneralNotes />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════ D · FABRICATION DETAIL ══════════ */

/**
 * SHEET D — the shop FABRICATION detail: the base plate on its own with the drilled hole layout
 * (pitch, gauge and edge distances), the C-purlin cut length and end profile with its orientation,
 * the weld symbols carrying size and length, and the assembly mark, quantity, grade and finish. The
 * parts table underneath is the take-off, not a re-count.
 */
export function PufLockFabricationSheet({ model, meta }: PufLockDetailSheetProps) {
  const gate = gateOf(model);
  if (!gate.ok) {
    return <LockingOffSheet title="PUF PANEL BOTTOM LOCKING — FABRICATION DETAIL" reason={gate.reason} meta={meta} />;
  }
  const d = gate.d;
  const c = d.config;
  const t = d.takeoff;
  const pos = d.positions[0];
  const plinthTopM = model.meta.plinthM;
  const g = platePocketGeometry(c, pos, plinthTopM);
  const F = localFrame(pos, plinthTopM);

  const plateAlong = F.along(g.plate);
  const plateAcross = F.across(g.plate);
  const plateLenMm = plateAlong.a1 - plateAlong.a0;
  const plateWidMm = plateAcross.n1 - plateAcross.n0;
  const boltsLocal = boltCentres(c, pos).map(F.bolt);
  const boltXs = [...new Set(boltsLocal.map((v) => round2(v.a)))].sort((p, q) => p - q);
  const boltNs = [...new Set(boltsLocal.map((v) => round2(v.n)))].sort((p, q) => p - q);

  const svgW = 1140;
  const svgH = 560;

  /* ---- D1 · plate plan --------------------------------------------------------------------- */
  const s1 = Math.min(1.5, Math.max(0.35, 330 / Math.max(plateLenMm, 120)));
  const p1cx = 300;
  const p1cy = 250;
  const px1 = (mm: number) => p1cx + mm * s1;
  const py1 = (mm: number) => p1cy + mm * s1;

  /* ---- D2 · C-purlin elevation + end profile ----------------------------------------------- */
  const s2 = Math.min(1.5, Math.max(0.25, 300 / Math.max(c.purlin.lengthMm, 120)));
  const e0 = 690;                                     // left end of the purlin elevation
  const eBase = 250;                                  // the seating line (plate top)
  const ex = (mm: number) => e0 + mm * s2;
  const ey = (mm: number) => eBase - mm * s2;
  const s3 = Math.min(3.2, Math.max(0.7, 110 / Math.max(c.purlin.flangeMm + c.purlin.depthMm / 2, 40)));
  const profileEnd = cProfilePoints({
    innerPx: 1020, outSign: 1, basePx: 400, s: s3,
    depthMm: c.purlin.depthMm, flangeMm: c.purlin.flangeMm, lipMm: c.purlin.lipMm, thicknessMm: c.purlin.thicknessMm,
  });

  /** Edge distance measured off the drawn hole layout — the specified minimum is printed alongside. */
  const edgeAlong = boltXs.length ? Math.abs(boltXs[0] - plateAlong.a0) : 0;
  const edgeAcross = boltNs.length ? Math.abs(boltNs[0] - plateAcross.n0) : 0;

  /** Weld runs / lengths per assembly come from the weld SCHEDULE — never re-counted on the sheet. */
  const weldRow = buildPufLockWeldSchedule(d)[0];

  const parts: {
    item: string; mark: string; spec: string; material: string; finish: string;
    perAssembly: string; total: string; unit: string; weight: string;
  }[] = [
    {
      item: "MS base / anchor plate", mark: `${c.plate.mark}-nn`,
      spec: `${c.plate.lengthMm} × ${c.plate.widthMm} × ${mmText(c.plate.thicknessMm)} mm · ${c.plate.holeCount} nos Ø${c.plate.boltHoleDiaMm} holes`,
      material: `${c.plate.material} · ${c.plate.grade}`, finish: c.plate.finish,
      perAssembly: "1 nos", total: `${t.plates} nos`,
      unit: `${t.plateUnitKg} kg/nos`, weight: `${t.plateKg} kg`,
    },
    {
      item: "MS C-purlin", mark: `${c.purlin.partMark}-L / ${c.purlin.partMark}-R`,
      spec: `${c.purlin.designation} · ${mmText(c.purlin.lengthMm)} mm cut length · ${c.purlin.orientation === "webs-inward" ? "webs inward" : "flanges inward"}`,
      material: `MS · ${c.purlin.grade}`, finish: c.purlin.finish,
      perAssembly: `${c.purlin.perPlate} nos`, total: `${t.purlinPieces} nos (${t.purlinTotalLengthM.toFixed(2)} m)`,
      unit: `${t.purlinKgPerM} kg/m`, weight: `${t.purlinKg} kg`,
    },
    {
      item: "Anchor bolt", mark: "AB",
      spec: `M${c.anchor.diameterMm} × ${c.anchor.lengthMm} gr ${c.anchor.grade} · ${c.anchor.type} · ${c.anchor.embedmentMm} mm embedment`,
      material: `Grade ${c.anchor.grade}`, finish: "As supplied",
      perAssembly: `${c.anchor.perPlate} nos`, total: `${t.bolts} nos`,
      unit: `${t.boltUnitKg} kg/nos`, weight: `${t.boltKg} kg`,
    },
    {
      item: "Hex nut", mark: "NUT", spec: `M${c.anchor.diameterMm}`,
      material: `Grade ${c.anchor.grade}`, finish: "As supplied",
      perAssembly: `${c.anchor.nutsPerBolt} per bolt`, total: `${t.nuts} nos`,
      unit: `${t.nutUnitKg} kg/nos`, weight: `${t.nutKg} kg`,
    },
    {
      item: "Plain washer", mark: "WSR", spec: `M${c.anchor.diameterMm}`,
      material: "MS", finish: "As supplied",
      perAssembly: `${c.anchor.washersPerBolt} per bolt`, total: `${t.washers} nos`,
      unit: `${t.washerUnitKg} kg/nos`, weight: `${t.washerKg} kg`,
    },
    {
      item: "Weld — plate to C-purlin", mark: "W",
      spec: `${mmText(c.purlin.weldSizeMm)} mm ${c.purlin.weldType} · ${mmText(c.purlin.weldLengthMm)} mm run`,
      material: "Approved electrode", finish: "De-slag + coat",
      perAssembly: weldRow ? `${weldRow.weldsPerAssembly} runs (${weldRow.totalWeldLengthMm} mm)` : "—",
      total: `${t.weldRuns} runs (${t.weldTotalLengthM.toFixed(2)} m)`,
      unit: `${t.weldKgPerM} kg/m`, weight: `${t.weldKg} kg deposited · ${t.electrodeKg} kg electrode`,
    },
    ...(t.isolationStripM > 0 ? [{
      item: "Isolation strip", mark: "ISO", spec: c.iface.isolationStripMaterial,
      material: "Non-metallic", finish: "—", perAssembly: "Per pocket",
      total: `${t.isolationStripM.toFixed(2)} m`, unit: "—", weight: "—",
    }] : []),
    {
      item: "Sealant", mark: "SL", spec: c.iface.sealantType,
      material: "Non-metallic", finish: "—", perAssembly: "Both faces",
      total: `${t.sealantM.toFixed(2)} m`, unit: "—", weight: "—",
    },
    ...(t.fasteners > 0 ? [{
      item: "Panel fastener", mark: "PF", spec: c.iface.fastenerSpec,
      material: "Self-drilling screw", finish: "As supplied", perAssembly: "Per spacing",
      total: `${t.fasteners} nos`, unit: "—", weight: "—",
    }] : []),
    {
      item: "Total fabricated steel", mark: "—", spec: "Plates + C-purlins + anchors + nuts + washers",
      material: "—", finish: "—", perAssembly: "—", total: `${t.plates} assemblies`,
      unit: "—", weight: `${t.totalSteelKg} kg`,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 720) }}>
        <rect x={0} y={0} width={svgW} height={svgH} fill={PLAN.paper} />

        <text x={40} y={38} fontSize={11.5} fill={PLAN.ink} fontWeight={800}>
          PUF PANEL BOTTOM LOCKING SYSTEM — FABRICATION DETAIL (SHOP)
        </text>
        <text x={40} y={53} fontSize={8} fill={PLAN.sub}>
          {assemblyCallout(c, 0)} · {t.plates} identical assemblies · all dimensions in millimetres
        </text>
        <line x1={40} y1={60} x2={svgW - 40} y2={60} stroke={PLAN.rule} strokeWidth={1} />

        {/* ═══════════ D1 · BASE PLATE — PLAN + HOLE LAYOUT ═══════════ */}
        <text x={90} y={88} fontSize={9.5} fill={PLAN.dim} fontWeight={700}>
          D1 · BASE PLATE {c.plate.mark}-nn — PLAN AND HOLE LAYOUT
        </text>
        <rect x={px1(plateAlong.a0)} y={py1(plateAcross.n0)} width={plateLenMm * s1} height={plateWidMm * s1}
          fill={PLAN.plateFill} stroke={PLAN.plate} strokeWidth={1.8} />
        <CentreLineH x0={px1(plateAlong.a0) - 18} x1={px1(plateAlong.a1) + 18} y={py1(0)} />
        <CentreLineV y0={py1(plateAcross.n0) - 18} y1={py1(plateAcross.n1) + 18} x={px1(0)} />
        {boltsLocal.map((bp, i) => {
          const r = Math.max(2.4, (c.plate.boltHoleDiaMm / 2) * s1);
          return (
            <g key={`fh-${i}`}>
              <circle cx={px1(bp.a)} cy={py1(bp.n)} r={r} fill={PLAN.paper} stroke={PLAN.plate} strokeWidth={1.1} />
              <line x1={px1(bp.a) - r - 6} y1={py1(bp.n)} x2={px1(bp.a) + r + 6} y2={py1(bp.n)} stroke={PLAN.dim} strokeWidth={0.5} strokeDasharray="6 2 1 2" />
              <line x1={px1(bp.a)} y1={py1(bp.n) - r - 6} x2={px1(bp.a)} y2={py1(bp.n) + r + 6} stroke={PLAN.dim} strokeWidth={0.5} strokeDasharray="6 2 1 2" />
            </g>
          );
        })}
        <DimH x0={px1(plateAlong.a0)} x1={px1(plateAlong.a1)} y={py1(plateAcross.n0) - 26} mm={plateLenMm} />
        {boltXs.length >= 2 && <DimH x0={px1(boltXs[0])} x1={px1(boltXs[boltXs.length - 1])} y={py1(plateAcross.n1) + 24} mm={c.plate.holePitchMm} />}
        {boltXs.length >= 1 && <DimH x0={px1(plateAlong.a0)} x1={px1(boltXs[0])} y={py1(plateAcross.n1) + 46} mm={edgeAlong} />}
        <DimV y0={py1(plateAcross.n0)} y1={py1(plateAcross.n1)} x={px1(plateAlong.a1) + 28} mm={plateWidMm} />
        {boltNs.length >= 2 && <DimV y0={py1(boltNs[0])} y1={py1(boltNs[boltNs.length - 1])} x={px1(plateAlong.a0) - 26} mm={c.plate.holeGaugeMm} />}
        {boltNs.length >= 1 && <DimV y0={py1(plateAcross.n0)} y1={py1(boltNs[0])} x={px1(plateAlong.a0) - 50} mm={edgeAcross} />}
        {boltsLocal[0] && (
          <Leader x={px1(boltsLocal[0].a)} y={py1(boltsLocal[0].n)} tx={px1(plateAlong.a0) - 60} ty={py1(plateAcross.n0) - 48}
            text={`${c.plate.holeCount} nos Ø${c.plate.boltHoleDiaMm} mm drilled holes for M${c.anchor.diameterMm} anchors`} />
        )}
        <text x={px1(plateAlong.a0) - 60} y={py1(plateAcross.n1) + 76} fontSize={7.5} fill={PLAN.dim}>
          Plate {c.plate.lengthMm} × {c.plate.widthMm} × {mmText(c.plate.thicknessMm)} thk · {c.plate.grade} · {c.plate.finish}
        </text>
        <text x={px1(plateAlong.a0) - 60} y={py1(plateAcross.n1) + 90} fontSize={7.5} fill={PLAN.dim}>
          Pitch {c.plate.holePitchMm} × gauge {c.plate.holeGaugeMm} · specified minimum edge distance {c.plate.edgeDistanceMm} mm
        </text>

        {/* ═══════════ D2 · C-PURLIN — ELEVATION + END PROFILE ═══════════ */}
        <line x1={640} y1={70} x2={640} y2={svgH - 120} stroke={PLAN.rule} strokeWidth={1} />
        <text x={e0} y={88} fontSize={9.5} fill={PLAN.dim} fontWeight={700}>
          D2 · C-PURLIN {c.purlin.partMark}-L / {c.purlin.partMark}-R — CUT LENGTH AND END PROFILE
        </text>

        {/* the purlin seen on elevation (length × web depth) */}
        <rect x={ex(0)} y={ey(c.purlin.depthMm)} width={c.purlin.lengthMm * s2}
          height={Math.max(6, c.purlin.depthMm * s2)} fill={PLAN.columnFill} stroke={PLAN.column} strokeWidth={1.4} />
        <line x1={ex(0)} y1={ey(c.purlin.lipMm)} x2={ex(c.purlin.lengthMm)} y2={ey(c.purlin.lipMm)}
          stroke={PLAN.column} strokeWidth={0.7} strokeDasharray="6 3" />
        <line x1={ex(0)} y1={ey(c.purlin.depthMm - c.purlin.lipMm)} x2={ex(c.purlin.lengthMm)} y2={ey(c.purlin.depthMm - c.purlin.lipMm)}
          stroke={PLAN.column} strokeWidth={0.7} strokeDasharray="6 3" />
        {/* the seating line = top of the base plate */}
        <line x1={ex(-30)} y1={ey(0)} x2={ex(c.purlin.lengthMm + 30)} y2={ey(0)} stroke={PLAN.plate} strokeWidth={2.4} />
        <DimH x0={ex(0)} x1={ex(c.purlin.lengthMm)} y={ey(c.purlin.depthMm) - 24} mm={c.purlin.lengthMm} />
        <DimV y0={ey(c.purlin.depthMm)} y1={ey(0)} x={ex(c.purlin.lengthMm) + 28} mm={c.purlin.depthMm} />
        <WeldSymbol x={ex(c.purlin.lengthMm * 0.35)} y={ey(0) - 2} tx={ex(c.purlin.lengthMm * 0.35) - 40} ty={ey(c.purlin.depthMm) - 52}
          text={`${mmText(c.purlin.weldSizeMm)} ${c.purlin.weldType} × ${mmText(c.purlin.weldLengthMm)} · ${c.purlin.weldRunsPerPurlin} runs each side`} />
        <Leader x={ex(c.purlin.lengthMm * 0.75)} y={ey(c.purlin.depthMm * 0.5)} tx={ex(c.purlin.lengthMm * 0.2)} ty={ey(c.purlin.depthMm) + 88}
          text={`${c.purlin.designation} · ${c.purlin.grade} · ${c.purlin.finish}`} />

        {/* the true end profile */}
        <text x={960} y={318} fontSize={8.5} fill={PLAN.dim} fontWeight={700}>END PROFILE (true section)</text>
        {profileEnd ? (
          <g>
            <polygon points={profileEnd} fill={PLAN.columnFill} stroke={PLAN.column} strokeWidth={1.4} />
            <DimV y0={400 - c.purlin.depthMm * s3} y1={400} x={1006} mm={c.purlin.depthMm} />
            <DimH x0={1020} x1={1020 + c.purlin.flangeMm * s3} y={418} mm={c.purlin.flangeMm} />
            <text x={960} y={438} fontSize={7.5} fill={PLAN.dim}>
              Lip {mmText(c.purlin.lipMm)} · thickness {mmText(c.purlin.thicknessMm)} mm
            </text>
            <text x={960} y={450} fontSize={7.5} fill={PLAN.dim}>
              {c.purlin.orientation === "webs-inward" ? "Web faces the panel, flanges turn away" : "Flanges face the panel"}
            </text>
          </g>
        ) : (
          <g>
            <rect x={940} y={330} width={170} height={80} fill={PLAN.paper} stroke={PLAN.weld} strokeWidth={1.2} />
            <text x={952} y={350} fontSize={8} fill={PLAN.weld} fontWeight={800}>SECTION NOT SPECIFIED</text>
            {wrapText(
              `Depth ${mmText(c.purlin.depthMm)}, flange ${mmText(c.purlin.flangeMm)}, lip ${mmText(c.purlin.lipMm)}, `
              + `thickness ${mmText(c.purlin.thicknessMm)} mm — the profile cannot be drawn.`, 30,
            ).map((l, i) => (
              <text key={l} x={952} y={366 + i * 11} fontSize={7.5} fill={PLAN.ink}>{l}</text>
            ))}
          </g>
        )}

        {/* ═══════════ fabrication data strip ═══════════ */}
        <line x1={40} y1={svgH - 106} x2={svgW - 40} y2={svgH - 106} stroke={PLAN.rule} strokeWidth={1} />
        {[
          ["Assembly mark", `PA-01 … PA-${String(t.plates).padStart(2, "0")}`],
          ["Assemblies", `${t.plates} nos`],
          ["Plate grade", c.plate.grade],
          ["Purlin grade", c.purlin.grade],
          ["Plate finish", c.plate.finish],
          ["Purlin finish", c.purlin.finish],
          ["Fabrication", "Shop-welded assembly, site-anchored to the plinth beam"],
          ["Total steel", `${t.totalSteelKg} kg`],
        ].map(([k, v], i) => {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const x = 46 + col * 278;
          const y = svgH - 84 + row * 26;
          return (
            <g key={k}>
              <text x={x} y={y} fontSize={7.5} fill={PLAN.sub}>{k}</text>
              <text x={x} y={y + 12} fontSize={8.5} fill={PLAN.ink} fontWeight={700}>{v}</text>
            </g>
          );
        })}
      </svg>

      {/* ── parts table ─────────────────────────────────────────────────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#ffffff", marginTop: 8 }}>
        <thead>
          <tr>
            {["Item", "Mark", "Size / section", "Material & grade", "Finish", "Per assembly", "Total", "Unit weight", "Total weight"].map((h) => (
              <th key={h} style={TH}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parts.map((p) => (
            <tr key={`${p.item}-${p.mark}`}>
              <td style={TD_STRONG}>{p.item}</td>
              <td style={TD}>{p.mark}</td>
              <td style={TD}>{p.spec}</td>
              <td style={TD}>{p.material}</td>
              <td style={TD}>{p.finish}</td>
              <td style={TD}>{p.perAssembly}</td>
              <td style={TD}>{p.total}</td>
              <td style={TD}>{p.unit}</td>
              <td style={TD}>{p.weight}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 4, fontSize: 8, color: "#94a3b8" }}>
        Quantities, unit weights and total weights are the resolved locking-system take-off for {meta.projectName} — this
        sheet reports them, it does not re-count them. Bolt grade, embedment, plate thickness and weld size are subject to
        structural-engineer approval.
      </div>

      <IssueCallouts issues={d.issues} />
    </div>
  );
}
