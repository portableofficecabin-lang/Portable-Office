"use client";

/**
 * Table module — WALL ELEVATIONS (spec §13, §29, §33).
 *
 * Projects every table onto one of the four cabin walls, into the SAME frame the cabin's own
 * elevations already use (CabinCalculator.tsx → Elevations()):
 *
 *   • `ox`     — the SVG x of the wall's START corner (its `wx`). An opening's along-wall distance
 *                is measured from that corner, exactly as `offset` is in pricing.ts — so a table
 *                2.5 ft from the left end of the front wall lands where the plan says it does.
 *   • `ppf`    — pixels per foot (its `scale`). Shared by both axes, so the drawing is to scale.
 *   • `floorY` — the SVG y of the floor line (its `ground`). y grows DOWN, so a point `h` above the
 *                floor is at `floorY − mmToFt(h) * ppf`. Everything vertical below is that one line.
 *
 * Which cabin axis runs ALONG each wall follows the plan's own side mapping
 * (bottom → front, top → rear, left → left, right → right):
 *
 *   front  along +x (cabin length), viewed from +y   ⇒ depth = cabinWidth  − y
 *   rear   along +x (cabin length), viewed from −y   ⇒ depth = y
 *   left   along +y (cabin width),  viewed from −x   ⇒ depth = x
 *   right  along +y (cabin width),  viewed from +x   ⇒ depth = cabinLength − x
 *
 * DEPTH ORDERING: tables further from the viewing wall are drawn FIRST (so nearer ones overlap them)
 * and with a lighter stroke — the standard elevation cue that tells a fabricator which desk is in the
 * foreground when two of them project onto the same run of wall.
 *
 * COLOUR: literal hex only — never oklch(), never a CSS variable. See TableRenderer2D's header and
 * src/lib/pdf/sanitizeColors.ts: a paint that resolves through the page's custom properties is
 * invalid once the <svg> is serialised standalone for the PDF, and the furniture exports as black
 * blobs. The hexes below are the flattened values of the tokens Elevations() paints with
 * (--accent 32 95% 52% → #f98c10, --muted-foreground → #94a3b8), so the two layers match on screen.
 */

import React from "react";

import type { CabinTable } from "./tableSchema";
import { findSupport } from "./tableTypes";
import { mmToFt } from "./tableUnits";
import {
  bboxOf,
  chairWorldPolys,
  tableFootprint,
  tableWorldBbox,
  toWorldPts,
  type Prim,
  type Pt,
} from "./tableGeometry";

/* ==========================================================================
 * Palette
 * ========================================================================== */

const C = {
  acc: "#f98c10",        // --accent, flattened — matches Elevations() exactly
  muted: "#94a3b8",      // --muted-foreground, flattened
  top: "#d9bb8f", topEdge: "#a97c48",
  leg: "#7a6340", legEdge: "#4c3d26",
  pedestal: "#8a7350",
  storage: "#cbb492", storageEdge: "#8f6c3f",
  modesty: "#bfa87f",
  partition: "#aebfca", partitionEdge: "#5f7d90",
  counter: "#c8a973", counterEdge: "#8f6c3f",
  cable: "#0f6f63",
  seat: "#aebfca", seatEdge: "#6c8494",
};

/* Chair silhouette (mm) — a seated-height pad with a back. Elevation only: the plan's chairs come
 * from `Seat`, which has no height, so these two numbers live here and nowhere else. */
const CHAIR_SEAT_MM = 450;
const CHAIR_BACK_MM = 950;

/**
 * Drawing reference — "T-01", from the table's INDEX in the design.
 *
 * It cannot come from the name: `defaultName()` numbers names per TYPE, so a Round Table 1 and an
 * Executive Table 1 would both claim "T-01". The plan (TableRenderer2D) derives its ref the same way
 * from the same `tables` array, so a table carries the SAME ref on the plan and on all four
 * elevations — which is the whole point of putting a ref on it. Deliberately duplicated rather than
 * imported: a .tsx module exports components, not stray values (the repo's react-refresh rule).
 */
const refFor = (index: number): string => `T-${String(index + 1).padStart(2, "0")}`;

/* ==========================================================================
 * Projection
 * ========================================================================== */

export type ElevationWall = "front" | "rear" | "left" | "right";

/** World points (cabin mm) of one primitive. Curved prims are sampled — an elevation only needs the
 *  primitive's EXTENT along the wall, and a rotated ellipse has no closed-form axis extent. */
function primWorldPts(p: Prim, t: CabinTable): Pt[] {
  if (p.kind === "poly") return toWorldPts(p.pts, t);
  const n = 16;
  const local: Pt[] = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rx = p.kind === "circle" ? p.r : p.rx;
    const ry = p.kind === "circle" ? p.r : p.ry;
    return { x: p.cx + rx * Math.cos(a), y: p.cy + ry * Math.sin(a) };
  });
  return toWorldPts(local, t);
}

/** A world AABB (cabin mm) → [start, end] along the viewing wall, in FEET from its start corner. */
function alongFt(
  box: { minX: number; minY: number; maxX: number; maxY: number },
  wall: ElevationWall,
): [number, number] {
  const horizontal = wall === "front" || wall === "rear";
  const lo = horizontal ? box.minX : box.minY;
  const hi = horizontal ? box.maxX : box.maxY;
  return [mmToFt(lo), mmToFt(hi)];
}

/** How far the table's CENTRE sits from the viewing wall (ft). Drives the draw order + the fade. */
function depthFt(t: CabinTable, wall: ElevationWall, cabinLengthFt: number, cabinWidthFt: number): number {
  const b = tableWorldBbox(t);
  const cx = mmToFt((b.minX + b.maxX) / 2);
  const cy = mmToFt((b.minY + b.maxY) / 2);
  switch (wall) {
    case "front": return cabinWidthFt - cy;
    case "rear": return cy;
    case "left": return cx;
    case "right": return cabinLengthFt - cx;
  }
}

/* ==========================================================================
 * Vertical bands — one per primitive role
 * ========================================================================== */

/** Roles, back to front. A partition screen stands behind the top it is screwed to; the tabletop
 *  slab reads last so nothing draws over it. */
const Z: Record<string, number> = {
  partition: 0, storage: 1, pedestal: 2, leg: 3, modesty: 4, cable: 5, keyboard: 6,
  top: 7, return: 7, counter: 8,
};

export interface TableElevationProps {
  tables: CabinTable[];
  wall: ElevationWall;
  cabinLengthFt: number;
  cabinWidthFt: number;
  cabinHeightFt: number;
  /** SVG x of the wall's START corner, and pixels per foot — Elevations()'s `wx` / `scale`. */
  ox: number;
  ppf: number;
  /** SVG y of the floor line — Elevations()'s `ground`. y grows DOWN. */
  floorY: number;
}

/**
 * One table's silhouette on the wall: the tabletop at its real height and thickness, the support
 * below it, the modesty panel, the storage box, any screen standing above the top, and the chairs.
 *
 * `fade` (0 = at the wall, 1 = at the far side of the cabin) lightens everything with distance.
 */
function TableElevationGlyphImpl({
  table, wall, ox, ppf, floorY, ceilingY, fade, refLabel,
}: {
  table: CabinTable;
  wall: ElevationWall;
  /** Drawing ref — the SAME one the 2D plan puts on this table. */
  refLabel: string;
  ox: number;
  ppf: number;
  floorY: number;
  /** SVG y of the cabin's ceiling. A screen taller than the cabin is a design error, not a licence
   *  to draw through the roof line — everything vertical is clamped to this. */
  ceilingY: number;
  fade: number;
}): JSX.Element {
  const t = table;
  const fp = tableFootprint(t);
  const d = t.dimensions;

  /** height above the floor (mm) → SVG y, never above the ceiling line. The ONE place the y-down
   *  convention is dealt with. */
  const yOf = (mm: number): number => Math.max(ceilingY, floorY - mmToFt(mm) * ppf);
  /** [startFt, endFt] along the wall → [x, width] in px. */
  const xw = (box: { minX: number; minY: number; maxX: number; maxY: number }): [number, number] => {
    const [a0, a1] = alongFt(box, wall);
    return [ox + a0 * ppf, Math.max(0.8, (a1 - a0) * ppf)];
  };

  // Opacity + stroke weight both drop with distance — the elevation's depth cue.
  const op = 1 - 0.42 * fade;
  const sw = 1.1 - 0.5 * fade;

  /* A reception counter is STEPPED: the staff work surface sits low, the visitor band sits high.
   * clampTable() pins `dimensions.heightMm` to the visitor height, so the staff slab has to come
   * from `reception.staffCounterHeightMm` or the whole desk would draw at counter height. */
  const topH = t.reception ? t.reception.staffCounterHeightMm : d.heightMm;
  const counterH = t.reception ? t.reception.visitorCounterHeightMm : d.heightMm;
  const th = Math.max(d.topThicknessMm, 12);
  const topPx = Math.max(1.2, mmToFt(th) * ppf);

  const storageH = t.accessories.find((a) => a.showInDrawing && a.heightMm)?.heightMm
    ?? d.sideStorageHeightMm ?? 650;
  const screenH = t.workstation?.partitionHeightMm ?? 400;
  const modestyH = d.modestyPanelHeightMm ?? 400;

  const nodes: { z: number; node: React.ReactNode }[] = [];

  fp.prims.forEach((p, i) => {
    const box = bboxOf(primWorldPts(p, t));
    const [x, w] = xw(box);
    if (w < 0.8) return;
    const key = `e${i}`;
    const z = Z[p.role] ?? 5;

    switch (p.role) {
      case "top":
      case "return": {
        const y = yOf(topH);
        nodes.push({
          z,
          node: <rect key={key} x={x} y={y} width={w} height={topPx} rx={0.8}
            fill={C.top} fillOpacity={op} stroke={C.topEdge} strokeWidth={sw} strokeOpacity={op} />,
        });
        break;
      }

      case "counter": {
        // The raised visitor band, plus the riser panel that carries it up off the staff surface —
        // which is what makes a reception desk read as a reception desk and not as a tall table.
        const y = yOf(counterH);
        const riserTop = y + topPx;
        const riserH = Math.max(0, yOf(topH) - riserTop);
        nodes.push({
          z,
          node: (
            <g key={key}>
              <rect x={x + w * 0.06} y={riserTop} width={w * 0.88} height={riserH}
                fill={C.counter} fillOpacity={op * 0.5} stroke={C.counterEdge} strokeWidth={sw * 0.7} strokeOpacity={op} />
              <rect x={x} y={y} width={w} height={topPx} rx={0.8}
                fill={C.counter} fillOpacity={op} stroke={C.counterEdge} strokeWidth={sw} strokeOpacity={op} />
            </g>
          ),
        });
        break;
      }

      case "leg":
      case "pedestal": {
        const y = yOf(topH - th);
        const kind = findSupport(t.support.supportTypeId).kind;
        // A bracket base cantilevers off the wall — it stops well short of the floor.
        const bottom = kind === "bracket" ? y + (floorY - y) * 0.45 : floorY;
        nodes.push({
          z,
          node: <rect key={key} x={x} y={y} width={w} height={Math.max(0, bottom - y)}
            fill={p.role === "leg" ? C.leg : C.pedestal} fillOpacity={op}
            stroke={C.legEdge} strokeWidth={sw * 0.7} strokeOpacity={op} />,
        });
        break;
      }

      case "storage": {
        const y = yOf(storageH);
        nodes.push({
          z,
          node: (
            <g key={key}>
              <rect x={x} y={y} width={w} height={Math.max(0, floorY - y)} rx={0.8}
                fill={C.storage} fillOpacity={op} stroke={C.storageEdge} strokeWidth={sw} strokeOpacity={op} />
              {/* drawer faces */}
              {[0.33, 0.66].map((f) => (
                <line key={f} x1={x + 1} y1={y + (floorY - y) * f} x2={x + w - 1} y2={y + (floorY - y) * f}
                  stroke={C.storageEdge} strokeWidth={sw * 0.6} strokeOpacity={op * 0.8} />
              ))}
            </g>
          ),
        });
        break;
      }

      case "modesty": {
        const y = yOf(topH - th);
        const h = Math.min(mmToFt(modestyH) * ppf, floorY - y);
        nodes.push({
          z,
          node: <rect key={key} x={x} y={y} width={w} height={Math.max(0, h)}
            fill={C.modesty} fillOpacity={op * 0.85} stroke={C.storageEdge} strokeWidth={sw * 0.7} strokeOpacity={op} />,
        });
        break;
      }

      case "partition": {
        // The workstation screen STANDS ABOVE the top — the one element of a table that is taller
        // than the table.
        const y1 = yOf(topH);
        const y0 = yOf(topH + screenH);
        nodes.push({
          z,
          node: <rect key={key} x={x} y={y0} width={w} height={Math.max(0, y1 - y0)} rx={1}
            fill={C.partition} fillOpacity={op * 0.75} stroke={C.partitionEdge} strokeWidth={sw} strokeOpacity={op} />,
        });
        break;
      }

      case "cable": {
        const y = yOf(topH - th) + Math.max(2, mmToFt(60) * ppf);
        nodes.push({
          z,
          node: <line key={key} x1={x} y1={y} x2={x + w} y2={y}
            stroke={C.cable} strokeWidth={sw * 1.2} strokeOpacity={op} strokeDasharray="4 3" />,
        });
        break;
      }

      case "keyboard": {
        const y = yOf(topH - th) + Math.max(3, mmToFt(120) * ppf);
        nodes.push({
          z,
          node: <line key={key} x1={x} y1={y} x2={x + w} y2={y}
            stroke={C.storageEdge} strokeWidth={sw} strokeOpacity={op} strokeDasharray="3 2" />,
        });
        break;
      }

      default:
        break;
    }
  });

  /* Chairs — a simple silhouette (seat pad + back), one per seat, at its own along-wall position. */
  if (t.seating.includeChairs) {
    chairWorldPolys(t).forEach((poly, i) => {
      const [x, w] = xw(bboxOf(poly));
      if (w < 0.8) return;
      const seatY = yOf(CHAIR_SEAT_MM);
      const backY = yOf(CHAIR_BACK_MM);
      nodes.push({
        z: -1, // chairs sit behind the desk they belong to
        node: (
          <g key={`c${i}`}>
            {/* back */}
            <rect x={x + w * 0.06} y={backY} width={w * 0.88} height={Math.max(0, seatY - backY)} rx={1.2}
              fill={C.seat} fillOpacity={op * 0.7} stroke={C.seatEdge} strokeWidth={sw * 0.7} strokeOpacity={op} />
            {/* seat pad */}
            <rect x={x} y={seatY} width={w} height={Math.max(1.5, (floorY - seatY) * 0.18)} rx={1.2}
              fill={C.seat} fillOpacity={op} stroke={C.seatEdge} strokeWidth={sw * 0.7} strokeOpacity={op} />
            {/* column + base */}
            <line x1={x + w / 2} y1={seatY} x2={x + w / 2} y2={floorY}
              stroke={C.seatEdge} strokeWidth={sw * 1.1} strokeOpacity={op} />
            <line x1={x + w * 0.18} y1={floorY} x2={x + w * 0.82} y2={floorY}
              stroke={C.seatEdge} strokeWidth={sw * 1.1} strokeOpacity={op} />
          </g>
        ),
      });
    });
  }

  /* Label: ref + finished height, sat just above the tabletop (or above the screen when there is
   * one, so the two never collide). */
  const wb = tableWorldBbox(t);
  const [lx, lw] = xw(wb);
  const hasScreen = fp.prims.some((p) => p.role === "partition");
  const labelY = yOf(hasScreen ? topH + screenH : Math.max(topH, counterH)) - 4;

  nodes.sort((a, b) => a.z - b.z);

  return (
    <g opacity={op}>
      {nodes.map((n) => n.node)}
      {lw > 22 && (
        <>
          <text x={lx + lw / 2} y={labelY} textAnchor="middle" fontSize={6.4} fontWeight={700} fill={C.acc}>
            {refLabel}
          </text>
          <text x={lx + lw / 2} y={labelY + 6.8} textAnchor="middle" fontSize={5.8} fill={C.muted}>
            H {Math.round(d.heightMm)} mm
          </text>
        </>
      )}
    </g>
  );
}

/** Memoised — the four elevations re-render together, and `tableFootprint()` is not free (spec §29). */
const TableElevationGlyph = React.memo(TableElevationGlyphImpl);

/**
 * Every table, projected onto one wall. Drop this inside the cell of
 * CabinCalculator's Elevations() that draws that wall, passing its `wx`, `scale` and `ground`.
 */
export function TableElevationLayer({
  tables, wall, cabinLengthFt, cabinWidthFt, cabinHeightFt, ox, ppf, floorY,
}: TableElevationProps): JSX.Element {
  // The cabin's extent AWAY from this wall — what a table's depth is normalised against.
  const span = wall === "front" || wall === "rear" ? cabinWidthFt : cabinLengthFt;
  // The wall box belongs to Elevations(); this layer only has to promise never to draw through it.
  const ceilingY = floorY - Math.max(0, cabinHeightFt) * ppf;

  const ordered = tables
    // Ref FIRST, from the unfiltered index: hiding T-01 must not renumber T-02 into its place.
    .map((t, i) => ({ t, refLabel: refFor(i), depth: depthFt(t, wall, cabinLengthFt, cabinWidthFt) }))
    .filter(({ t }) => !t.position.hidden)
    // Furthest first ⇒ nearer tables paint over them (painter's algorithm).
    .sort((a, b) => b.depth - a.depth);

  return (
    <g aria-label={`Tables on the ${wall} elevation`}>
      {ordered.map(({ t, refLabel, depth }) => (
        <TableElevationGlyph
          key={t.id}
          table={t}
          refLabel={refLabel}
          wall={wall}
          ox={ox}
          ppf={ppf}
          floorY={floorY}
          ceilingY={ceilingY}
          fade={span > 0 ? Math.min(1, Math.max(0, depth / span)) : 0}
        />
      ))}
    </g>
  );
}
