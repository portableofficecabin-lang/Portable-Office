"use client";

/**
 * Table module — 2D PLAN RENDERER (spec §12, §14, §19, §29, §33, §34).
 *
 * Draws every table into the ModulePlan's SVG, in the plan's own coordinate frame (`ox`, `oy`,
 * `ppf`). It renders NOTHING of its own geometry: every polygon, circle, leg and seat comes from
 * `tableFootprint()` / `tableTransform()`, which is what makes spec §22's "the BOQ can never drift
 * from the drawing" hold — the pixels here and the polygons the collision checker and the take-off
 * read are literally the same numbers.
 *
 * TWO THINGS THIS FILE EXISTS TO GET RIGHT
 *
 *  1. STROKE WIDTH. `tableTransform()` folds the mm→px scale k = ppf/304.8 into a `scale()`, so a
 *     child emitted in raw mm is drawn at the right size — but its STROKE is scaled by k too. At a
 *     typical ppf ≈ 24, k ≈ 0.079: a strokeWidth of 1 would render as a 0.08 px hairline (invisible),
 *     and at a large ppf it would render as a blob. Every stroke below is therefore emitted as
 *     `px / k` so it lands on screen at exactly `px` pixels, whatever the plan's zoom.
 *
 *  2. TEXT. Text inside that same scaled group would be scaled too, and fighting it with mm-sized
 *     fonts breaks the moment the plan rescales. So each table emits TWO groups: the shape group
 *     (scaled, children in raw local mm) and a SEPARATE un-scaled label group placed at the table's
 *     centre in pixels. Labels therefore stay upright and legible for a table rotated 37°.
 *
 * COLOUR: literal hex ONLY — no oklch(), no CSS variable, no `currentColor`. The PDF export
 * serialises this <svg> standalone and re-loads it as an <img> (src/lib/pdf/sanitizeColors.ts): a
 * paint that resolves through the page's custom properties is invalid in that detached document,
 * `fill` falls back to black and `stroke` to none, and the furniture exports as black blobs — an
 * export that SUCCEEDS while producing the wrong drawing (spec §33). The palette below mirrors
 * ModulePlan's `C` for exactly that reason.
 */

import React from "react";

import type { CabinTable } from "./tableSchema";
import { findTableType } from "./tableTypes";
import { mmToFt } from "./tableUnits";
import {
  bboxOf,
  footprintSize,
  polyPath,
  tableFootprint,
  tableTransform,
  toWorld,
  type Prim,
  type Pt,
  type Seat,
} from "./tableGeometry";

/* ==========================================================================
 * Palette — mirrors ModulePlan's `C` so a table reads as part of the same
 * architectural print. Plain hex, always (see the header).
 * ========================================================================== */

const C = {
  paper: "#fbfaf6",
  top: "#d9bb8f", topEdge: "#a97c48",      // tabletop — ModulePlan's wood / woodEdge
  ret: "#e3caa6",                          // return / U / T arm — same family, one shade up
  leg: "#7a6340", legEdge: "#4c3d26",
  pedestal: "#8a7350",
  storage: "#cbb492", storageEdge: "#8f6c3f",   // ModulePlan's cab / cabEdge
  modesty: "#bfa87f", modestyEdge: "#8f6c3f",
  partition: "#aebfca", partitionEdge: "#5f7d90",
  cable: "#0f6f63",                        // ModulePlan's `slide` teal — the services colour
  counter: "#c8a973", counterEdge: "#8f6c3f",
  keyboard: "#8f6c3f",
  seat: "#aebfca", seatEdge: "#6c8494",    // ModulePlan's seat / seatEdge
  ink: "#333333",
  accent: "#f98c10",                       // the app's --accent (32 95% 52%), flattened to hex
  conflict: "#d92d20", conflictFill: "#f0443a",
};

/* ==========================================================================
 * Small helpers
 * ========================================================================== */

/** Table centre, in PLAN PIXELS relative to the cabin's inner top-left. */
const centrePx = (t: CabinTable, ppf: number): Pt => ({
  x: mmToFt(t.position.xMm) * ppf,
  y: mmToFt(t.position.yMm) * ppf,
});

/** A world point (cabin mm) → plan pixels relative to the cabin's inner top-left. */
const worldPx = (p: Pt, t: CabinTable, ppf: number): Pt => {
  const w = toWorld(p, t);
  return { x: mmToFt(w.x) * ppf, y: mmToFt(w.y) * ppf };
};

/**
 * Fallback drawing reference, used only when the caller supplies no `refLabel`.
 *
 * It CANNOT be derived from the table's name: `defaultName()` numbers names PER TYPE, so a design
 * with a Round Table 1, an Executive Table 1 and a Reception Table 1 would put "T-01" on three
 * different tables — a colliding ref is worse than no ref, because the schedule, the BOQ line and
 * the drawing would all point at each other and mean different things. The id suffix is ugly but it
 * is unique, which is the property that actually matters. `TableLayer` passes a proper sequential
 * "T-01, T-02, …" instead.
 */
const fallbackRef = (t: CabinTable): string => `T-${t.id.slice(-3).toUpperCase()}`;

/** Sequential drawing reference from the table's position in the design: 0 → "T-01".
 *  Not exported: a .tsx module exports components, not stray values (the repo's react-refresh rule).
 *  TableElevation derives the same ref from the same `tables` order, so the two drawings agree. */
const refFor = (index: number): string => `T-${String(index + 1).padStart(2, "0")}`;

/** "1800 × 900 mm", or "Ø1200 mm" for a round top — the size a joiner expects to read. */
const planSizeLabel = (t: CabinTable): string => {
  const { lengthMm, depthMm } = footprintSize(t);
  if (t.shape === "circle") {
    const dia = t.dimensions.radiusMm ? Math.round(t.dimensions.radiusMm * 2) : lengthMm;
    return `Ø${dia} mm`;
  }
  return `${lengthMm} × ${depthMm} mm`;
};

/** Is this polygon an axis-aligned rectangle? Only those get hatched (see hatch()). */
const isAxisRect = (pts: Pt[]): boolean => {
  if (pts.length !== 4) return false;
  const b = bboxOf(pts);
  return pts.every(
    (p) =>
      (Math.abs(p.x - b.minX) < 0.5 || Math.abs(p.x - b.maxX) < 0.5) &&
      (Math.abs(p.y - b.minY) < 0.5 || Math.abs(p.y - b.maxY) < 0.5),
  );
};

/**
 * 45° hatch across a rectangle, as explicit <line>s in LOCAL mm.
 *
 * Deliberately NOT an SVG <pattern>: the PDF export serialises this <svg> standalone and re-loads it
 * as an <img>, a path on which `url(#…)` paint-server references are not reliably resolved — the same
 * reason ModulePlan draws its arrowheads as literal <polygon>s instead of <marker>s. Explicit lines
 * always survive. Every partition/modesty prim the geometry emits IS a rectangle, so this covers them
 * all; anything else just falls back to a flat fill.
 */
function hatch(pts: Pt[], stroke: string, sw: number, keyBase: string): React.ReactNode[] {
  if (!isAxisRect(pts)) return [];
  const b = bboxOf(pts);
  const step = 60; // mm between hatch lines — reads as a screen at any sane ppf
  const out: React.ReactNode[] = [];
  for (let d = b.minX - b.d; d < b.maxX; d += step) {
    // A 45° line x = d + y, clipped analytically to the rectangle (no clipPath ⇒ no url() reference).
    const y0 = Math.max(b.minY, b.minY + (b.minX - d));
    const y1 = Math.min(b.maxY, b.minY + (b.maxX - d));
    if (y1 <= y0) continue;
    out.push(
      <line
        key={`${keyBase}-h${Math.round(d)}`}
        x1={d + (y0 - b.minY)} y1={y0}
        x2={d + (y1 - b.minY)} y2={y1}
        stroke={stroke} strokeWidth={sw} strokeOpacity={0.55}
      />,
    );
  }
  return out;
}

/* ==========================================================================
 * Primitives → SVG, in RAW LOCAL MILLIMETRES
 * ========================================================================== */

interface PrimStyle {
  /** Stroke of the tabletop outline — accent when selected, red when in conflict. */
  topStroke: string;
  /** 1 screen-pixel, expressed in local mm (see the header, trap 1). */
  u: number;
}

/** One footprint primitive. `u` is one screen pixel in local mm, so strokes stay constant. */
function renderPrim(p: Prim, i: number, s: PrimStyle): React.ReactNode {
  const k = `p${i}`;
  const u = s.u;

  switch (p.role) {
    /* ---------- the tabletop ---------- */
    case "top":
    case "return": {
      const fill = p.role === "return" ? C.ret : C.top;
      if (p.kind === "circle") {
        // A REAL <circle> — an exported round table has to be genuinely round (spec §34, test 3),
        // not a 48-gon that betrays itself when the PDF is zoomed.
        return <circle key={k} cx={p.cx} cy={p.cy} r={p.r} fill={fill} stroke={s.topStroke} strokeWidth={1.2 * u} />;
      }
      if (p.kind === "ellipse") {
        return <ellipse key={k} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill={fill} stroke={s.topStroke} strokeWidth={1.2 * u} />;
      }
      return <path key={k} d={polyPath(p.pts)} fill={fill} stroke={s.topStroke} strokeWidth={1.2 * u} strokeLinejoin="round" />;
    }

    /* ---------- support ---------- */
    case "leg":
    case "pedestal": {
      const fill = p.role === "leg" ? C.leg : C.pedestal;
      if (p.kind === "circle") {
        return <circle key={k} cx={p.cx} cy={p.cy} r={p.r} fill={fill} stroke={C.legEdge} strokeWidth={0.7 * u} />;
      }
      if (p.kind === "ellipse") {
        return <ellipse key={k} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill={fill} stroke={C.legEdge} strokeWidth={0.7 * u} />;
      }
      return <path key={k} d={polyPath(p.pts)} fill={fill} stroke={C.legEdge} strokeWidth={0.7 * u} />;
    }

    /* ---------- storage / pedestal unit: a box with a drawer face ---------- */
    case "storage": {
      if (p.kind !== "poly") return null;
      const b = bboxOf(p.pts);
      const inset = Math.min(b.w, b.d) * 0.18;
      return (
        <g key={k}>
          <path d={polyPath(p.pts)} fill={C.storage} stroke={C.storageEdge} strokeWidth={0.9 * u} />
          {/* drawer face — the line a joiner reads as "this side pulls out" */}
          <line
            x1={b.minX + inset} y1={b.maxY - inset} x2={b.maxX - inset} y2={b.maxY - inset}
            stroke={C.storageEdge} strokeWidth={0.7 * u} strokeOpacity={0.8}
          />
          <circle cx={(b.minX + b.maxX) / 2} cy={b.maxY - inset - Math.min(b.d * 0.12, 40)} r={Math.min(b.w, b.d) * 0.05} fill={C.storageEdge} />
        </g>
      );
    }

    /* ---------- modesty panel + workstation screen: hatched, so they never read as a tabletop ---------- */
    case "modesty":
    case "partition": {
      if (p.kind !== "poly") return null;
      const fill = p.role === "partition" ? C.partition : C.modesty;
      const edge = p.role === "partition" ? C.partitionEdge : C.modestyEdge;
      return (
        <g key={k}>
          <path d={polyPath(p.pts)} fill={fill} stroke={edge} strokeWidth={0.9 * u} />
          {hatch(p.pts, edge, 0.5 * u, k)}
        </g>
      );
    }

    /* ---------- cable tray: a dashed run, the services convention ---------- */
    case "cable": {
      if (p.kind !== "poly") return null;
      const b = bboxOf(p.pts);
      const cy = (b.minY + b.maxY) / 2;
      return (
        <line
          key={k}
          x1={b.minX} y1={cy} x2={b.maxX} y2={cy}
          stroke={C.cable} strokeWidth={1.4 * u} strokeDasharray={`${6 * u} ${4 * u}`} strokeLinecap="round"
        />
      );
    }

    /* ---------- keyboard tray: a thin dashed rect (it lives UNDER the top) ---------- */
    case "keyboard": {
      if (p.kind !== "poly") return null;
      return (
        <path
          key={k} d={polyPath(p.pts)} fill="none"
          stroke={C.keyboard} strokeWidth={0.8 * u} strokeDasharray={`${4 * u} ${3 * u}`}
        />
      );
    }

    /* ---------- reception: the raised visitor counter band ---------- */
    case "counter": {
      if (p.kind !== "poly") return null;
      return <path key={k} d={polyPath(p.pts)} fill={C.counter} stroke={C.counterEdge} strokeWidth={1 * u} fillOpacity={0.9} />;
    }

    default:
      return null;
  }
}

/** Chair glyph in LOCAL mm: a rounded seat pad + a back bar on the side AWAY from the table.
 *  `Seat.rotDeg` rotates a chair drawn FACING UP (the occupant looks −y), so the back is at +y. */
function renderSeat(s: Seat, i: number, w: number, d: number, u: number): React.ReactNode {
  const hw = w / 2, hd = d / 2;
  return (
    <g key={`s${i}`} transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.rotDeg.toFixed(1)})`}>
      <rect
        x={-hw} y={-hd} width={w} height={d * 0.78} rx={w * 0.16}
        fill={C.seat} stroke={C.seatEdge} strokeWidth={0.8 * u}
      />
      <rect
        x={-hw * 1.06} y={hd - d * 0.2} width={w * 1.06} height={d * 0.2} rx={w * 0.08}
        fill={C.seatEdge} stroke={C.seatEdge} strokeWidth={0.5 * u}
      />
    </g>
  );
}

/* ==========================================================================
 * TableGlyph — ONE table: the scaled shape group + the un-scaled label group
 * ========================================================================== */

export interface TableGlyphProps {
  table: CabinTable;
  ppf: number;
  selected?: boolean;
  conflict?: boolean;
  showLabel?: boolean;
  showDimensions?: boolean;
  /** Drawing ref ("T-01"). Supplied by TableLayer from the table's index; falls back to an
   *  id-derived ref when the glyph is used standalone (a palette thumbnail, a schedule row). */
  refLabel?: string;
}

/**
 * Everything is emitted relative to the PLAN ORIGIN (the cabin's inner top-left), i.e. with
 * `tableTransform(t, 0, 0, ppf)`; `TableLayer` then translates the whole layer by (ox, oy) once.
 * `translate(ox,oy) ∘ translate(cx,cy)` IS `translate(ox+cx, oy+cy)`, so the pixels are bit-identical
 * to `tableTransform(t, ox, oy, ppf)` — and the glyph's props no longer carry the plan origin, which
 * is what lets React.memo (spec §29) skip a table that has not itself changed while the plan pans.
 */
function TableGlyphImpl({
  table, ppf, selected = false, conflict = false, showLabel = true, showDimensions = true, refLabel,
}: TableGlyphProps): JSX.Element {
  const t = table;
  const fp = tableFootprint(t);
  const def = findTableType(t.tableTypeId);

  // mm→px scale folded into the group by tableTransform. `u` = ONE SCREEN PIXEL, in local mm.
  const k = ppf / 304.8;
  const u = k > 0 ? 1 / k : 1;

  const topStroke = conflict ? C.conflict : selected ? C.accent : C.topEdge;
  const style: PrimStyle = { topStroke, u };

  const cw = t.seating.chairWidthMm || 550;
  const cd = t.seating.chairDepthMm || 550;

  const c = centrePx(t, ppf);
  const b = fp.bbox;
  // Only label a table that is actually big enough on screen to hold the text (ModulePlan applies
  // the same "is there room for a caption?" test to its desks).
  const onScreenW = mmToFt(b.w) * ppf;
  const roomForText = onScreenW > 40;

  /* Reception: the drawing has to say WHICH SIDE the visitor stands on (spec §19). The two captions
   * are placed from the counter band's WORLD position but drawn in the un-scaled group, so they stay
   * upright and legible on a rotated counter. */
  const receptionTags: { x: number; y: number; text: string }[] = [];
  if (t.reception && showLabel) {
    const band = fp.prims.find((p) => p.role === "counter");
    if (band && band.kind === "poly") {
      const bb = bboxOf(band.pts);
      const vp = worldPx({ x: (bb.minX + bb.maxX) / 2, y: (bb.minY + bb.maxY) / 2 }, t, ppf);
      // Staff sit opposite the visitor — mirror the band's centre through the table's centre.
      receptionTags.push({ x: vp.x, y: vp.y, text: "VISITOR" });
      receptionTags.push({ x: 2 * c.x - vp.x, y: 2 * c.y - vp.y, text: "STAFF" });
    }
  }

  return (
    <g>
      {/* ---- SHAPE: scaled group, children in RAW LOCAL MILLIMETRES ---- */}
      <g transform={tableTransform(t, 0, 0, ppf)}>
        {/* Chairs first, so a tabletop that overhangs its seats reads on top of them. */}
        {t.seating.includeChairs && fp.seats.map((s, i) => renderSeat(s, i, cw, cd, u))}

        {fp.prims.map((p, i) => renderPrim(p, i, style))}

        {/* Conflict (spec §14): a translucent red wash over the top, so the offending table is
            unmistakable even when it is half-hidden under another one. */}
        {conflict && fp.prims
          .filter((p) => p.role === "top" || p.role === "return")
          .map((p, i) =>
            p.kind === "circle" ? (
              <circle key={`x${i}`} cx={p.cx} cy={p.cy} r={p.r} fill={C.conflictFill} fillOpacity={0.28} stroke={C.conflict} strokeWidth={1.6 * u} />
            ) : p.kind === "ellipse" ? (
              <ellipse key={`x${i}`} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill={C.conflictFill} fillOpacity={0.28} stroke={C.conflict} strokeWidth={1.6 * u} />
            ) : (
              <path key={`x${i}`} d={polyPath(p.pts)} fill={C.conflictFill} fillOpacity={0.28} stroke={C.conflict} strokeWidth={1.6 * u} strokeLinejoin="round" />
            ),
          )}

        {/* Selection handles at the footprint's corners. Inside the scaled group ON PURPOSE: they
            rotate with the table, so they mark ITS corners, not the screen's. */}
        {selected && (() => {
          const h = 5 * u; // 5 screen px
          const corners: Pt[] = [
            { x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY },
            { x: b.minX, y: b.maxY }, { x: b.maxX, y: b.maxY },
          ];
          return corners.map((p, i) => (
            <rect
              key={`hd${i}`} x={p.x - h / 2} y={p.y - h / 2} width={h} height={h}
              fill={C.paper} stroke={C.accent} strokeWidth={1.2 * u}
            />
          ));
        })()}
      </g>

      {/* ---- LABELS: un-scaled group at the table centre, in PIXELS (see the header, trap 2) ---- */}
      {showLabel && roomForText && (
        <g transform={`translate(${c.x.toFixed(2)} ${c.y.toFixed(2)})`} pointerEvents="none">
          <text x={0} y={-6.5} textAnchor="middle" fontSize={6.2} fontWeight={700} fill={conflict ? C.conflict : C.accent}>
            {refLabel ?? fallbackRef(t)}
          </text>
          <text x={0} y={1.2} textAnchor="middle" fontSize={6.4} fontWeight={700} fill={C.ink}>
            {def.short}
          </text>
          {showDimensions && (
            <text x={0} y={8.6} textAnchor="middle" fontSize={5.8} fill={C.ink}>
              {planSizeLabel(t)}
            </text>
          )}
          {t.quantity > 1 && (
            <text x={0} y={showDimensions ? 15.8 : 8.6} textAnchor="middle" fontSize={5.6} fontWeight={700} fill={C.ink}>
              × {t.quantity}
            </text>
          )}
        </g>
      )}

      {receptionTags.map((tag) => (
        <text
          key={tag.text} x={tag.x.toFixed(2)} y={tag.y.toFixed(2)} textAnchor="middle"
          fontSize={5.6} fontWeight={700} fill={C.counterEdge} pointerEvents="none"
        >
          {tag.text}
        </text>
      ))}
    </g>
  );
}

/** Memoised: a plan with 20 tables re-renders on every drag frame; only the dragged one has
 *  actually changed, and `tableFootprint()` is not free (spec §29). */
export const TableGlyph = React.memo(TableGlyphImpl);

/* ==========================================================================
 * TableLayer — every table, in the ModulePlan's frame
 * ========================================================================== */

export interface TableLayerProps {
  tables: CabinTable[];
  /** The ModulePlan transform: origin of the cabin's inner top-left (px) + pixels per foot. */
  ox: number;
  oy: number;
  ppf: number;
  selectedId?: string | null;
  /** Table ids involved in a collision / clearance failure — drawn RED (spec §14). */
  conflictIds?: Set<string>;
  showLabels?: boolean;
  showDimensions?: boolean;
  editable?: boolean;
  onSelect?: (id: string | null) => void;
  onDragStart?: (id: string, e: React.PointerEvent) => void;
}

export function TableLayer({
  tables, ox, oy, ppf, selectedId = null, conflictIds,
  showLabels = true, showDimensions = true, editable = false,
  onSelect, onDragStart,
}: TableLayerProps): JSX.Element {
  return (
    <g transform={`translate(${ox.toFixed(2)} ${oy.toFixed(2)})`}>
      {tables.map((t, i) => {
        // `hidden` hides a table from the DRAWING only — it is still quoted (spec §11), which is why
        // this is a render-time skip and not a filter on the model. It also must NOT renumber the
        // refs: T-02 stays T-02 while it is hidden, so the ref is taken from the unfiltered index.
        if (t.position.hidden) return null;

        const selected = t.id === selectedId;
        const conflict = !!conflictIds?.has(t.id);
        const locked = t.position.locked;
        const interactive = editable && !locked;

        return (
          <g
            key={t.id}
            style={{ cursor: !editable ? "default" : locked ? "not-allowed" : selected ? "grabbing" : "grab" }}
            onPointerDown={(e) => {
              if (!editable) return;
              e.stopPropagation();
              onSelect?.(t.id);
              if (interactive) onDragStart?.(t.id, e);
            }}
          >
            <TableGlyph
              table={t}
              ppf={ppf}
              selected={selected}
              conflict={conflict}
              showLabel={showLabels}
              showDimensions={showDimensions}
              refLabel={refFor(i)}
            />
          </g>
        );
      })}
    </g>
  );
}
