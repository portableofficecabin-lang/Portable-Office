/**
 * Table module — GEOMETRY (spec §3, §12, §17).
 *
 * This is the single source of truth for a table's shape. The 2D renderer, the elevation renderer,
 * the collision checker, the auto-arranger and the BOQ take-off ALL read their geometry from here —
 * which is the only way spec §22's "the BOQ can never drift from the drawing" can actually hold.
 *
 * LOCAL SPACE: every builder returns geometry centred on (0,0), un-rotated, un-flipped, in mm.
 *   +x = along the table's own length · +y = toward the table's own front (where the user sits)
 *
 * WORLD SPACE: `toWorld()` applies flip → rotate → translate, in that order. The SVG renderer
 * applies the IDENTICAL transform as one `<g transform="translate() rotate() scale()">`, so the
 * pixels and the collision polygons can never disagree.
 *
 * Curved shapes (circle / oval) keep an exact primitive for DRAWING (so an exported round table is
 * a true `<circle>`, spec §34 Test 3) and a sampled polygon for COLLISION. Everything else is
 * polygonal, so its draw primitive and its collision polygon are literally the same points.
 */

import { mmToFt } from "./tableUnits";
import type { CabinTable, TableShape } from "./tableSchema";
import { findTableType, isRoundish } from "./tableTypes";

/* ==========================================================================
 * 1. Primitives
 * ========================================================================== */

export interface Pt { x: number; y: number }

/** A drawable primitive in LOCAL mm. */
export type Prim =
  | { kind: "poly"; pts: Pt[]; role: PartRole }
  | { kind: "circle"; cx: number; cy: number; r: number; role: PartRole }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; role: PartRole };

/** What a primitive represents — the renderer styles by role, the BOQ ignores it. */
export type PartRole =
  | "top"          // the tabletop outline
  | "return"       // the L/U/T arm (drawn with the same fill, a lighter separator line)
  | "leg"
  | "pedestal"
  | "storage"
  | "modesty"
  | "partition"
  | "cable"
  | "counter"      // reception: the raised visitor counter band
  | "keyboard";

/** A chair position. `rotDeg` rotates a chair glyph that is drawn FACING UP (occupant looks −y). */
export interface Seat {
  x: number;
  y: number;
  rotDeg: number;
  /** Which side of the table this seat belongs to — reception/workstation label the sides. */
  side?: "front" | "rear" | "left" | "right" | "curve";
}

export interface Footprint {
  /** Everything drawable, LOCAL mm, in draw order (back to front). */
  prims: Prim[];
  /** Solid collision polygons of the TABLETOP only (legs/pedestals live inside it), LOCAL mm. */
  polys: Pt[][];
  /** Chair centres, LOCAL mm. Empty when the table seats nobody or chairs are off. */
  seats: Seat[];
  /** Local bounding box (mm). */
  bbox: { minX: number; minY: number; maxX: number; maxY: number; w: number; d: number };
}

/* ==========================================================================
 * 2. Polygon maths (concave-safe — an L-shaped table is not convex, so SAT is out)
 * ========================================================================== */

const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
];

export const bboxOf = (pts: Pt[]) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (!pts.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, d: 0 };
  return { minX, minY, maxX, maxY, w: maxX - minX, d: maxY - minY };
};

export const bboxOfPolys = (polys: Pt[][]) => bboxOf(polys.flat());

/** Rotate a point about the origin. `deg` is CLOCKWISE on screen (x right, y down). */
export function rotatePt(p: Pt, deg: number): Pt {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export function pointInPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    const hit = a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y || 1e-9) + a.x;
    if (hit) inside = !inside;
  }
  return inside;
}

const segsIntersect = (p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean => {
  const d = (a: Pt, b: Pt, c: Pt) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  const onSeg = (a: Pt, b: Pt, c: Pt) =>
    Math.min(a.x, b.x) - 1e-9 <= c.x && c.x <= Math.max(a.x, b.x) + 1e-9 &&
    Math.min(a.y, b.y) - 1e-9 <= c.y && c.y <= Math.max(a.y, b.y) + 1e-9;
  if (Math.abs(d1) < 1e-9 && onSeg(p3, p4, p1)) return true;
  if (Math.abs(d2) < 1e-9 && onSeg(p3, p4, p2)) return true;
  if (Math.abs(d3) < 1e-9 && onSeg(p1, p2, p3)) return true;
  if (Math.abs(d4) < 1e-9 && onSeg(p1, p2, p4)) return true;
  return false;
};

/**
 * Do two polygons overlap? Handles CONCAVE polygons (an L-shaped table), which is exactly why this
 * is edge-crossing + containment rather than a separating-axis test.
 */
export function polysOverlap(a: Pt[], b: Pt[]): boolean {
  if (a.length < 3 || b.length < 3) return false;
  // Cheap AABB reject first — this runs for every table × every obstacle on every drag frame.
  const ba = bboxOf(a), bb = bboxOf(b);
  if (ba.maxX <= bb.minX || bb.maxX <= ba.minX || ba.maxY <= bb.minY || bb.maxY <= ba.minY) return false;

  for (let i = 0; i < a.length; i++) {
    const a1 = a[i], a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j], b2 = b[(j + 1) % b.length];
      if (segsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  // No edge crossing ⇒ one is wholly inside the other, or they are disjoint.
  return pointInPoly(a[0], b) || pointInPoly(b[0], a);
}

/** How deep two polygons overlap (mm) — the smaller AABB penetration. Drives "…by 320 mm". */
export function overlapDepth(a: Pt[], b: Pt[]): number {
  const ba = bboxOf(a), bb = bboxOf(b);
  const ox = Math.min(ba.maxX, bb.maxX) - Math.max(ba.minX, bb.minX);
  const oy = Math.min(ba.maxY, bb.maxY) - Math.max(ba.minY, bb.minY);
  if (ox <= 0 || oy <= 0) return 0;
  return Math.round(Math.min(ox, oy));
}

/** Grow a polygon outward by `mm` (used for clearance zones). AABB-based — exact for the rect
 *  obstacles this is applied to, conservative (never under-reports) for the rest. */
export function inflatePoly(poly: Pt[], mm: number): Pt[] {
  const b = bboxOf(poly);
  return rect(b.minX - mm, b.minY - mm, b.maxX + mm, b.maxY + mm);
}

/** Sample a quadratic Bézier — used by the curved-front top. */
const quad = (p0: Pt, p1: Pt, p2: Pt, n: number): Pt[] => {
  const out: Pt[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    });
  }
  return out;
};

const ARC_SEGMENTS = 48;

const ellipsePts = (cx: number, cy: number, rx: number, ry: number, n = ARC_SEGMENTS): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });

/* ==========================================================================
 * 3. Shape builders — LOCAL mm, centred on the bounding-box centre
 * ========================================================================== */

interface ShapeOut { prims: Prim[]; polys: Pt[][] }

function buildShape(t: CabinTable): ShapeOut {
  const { shape } = t;
  const d = t.dimensions;
  const L = Math.max(1, d.lengthMm);
  const D = Math.max(1, d.depthMm);
  const hw = L / 2, hd = D / 2;

  const top = (pts: Pt[]): Prim => ({ kind: "poly", pts, role: "top" });

  switch (shape) {
    case "rectangle":
    case "square": {
      const p = rect(-hw, -hd, hw, hd);
      return { prims: [top(p)], polys: [p] };
    }

    case "circle": {
      const r = d.radiusMm ?? L / 2;
      return {
        prims: [{ kind: "circle", cx: 0, cy: 0, r, role: "top" }],
        polys: [ellipsePts(0, 0, r, r)],
      };
    }

    case "oval": {
      const rx = L / 2, ry = D / 2;
      return {
        prims: [{ kind: "ellipse", cx: 0, cy: 0, rx, ry, role: "top" }],
        polys: [ellipsePts(0, 0, rx, ry)],
      };
    }

    case "l-shape": {
      /* Main run across the top; the return arm drops from the left or right end.
       * Overall depth = main depth + return length, so the bbox is honest. */
      const rs = t.returnSection ?? { side: "right" as const, lengthMm: 900, depthMm: 600 };
      const RL = rs.lengthMm, RD = rs.depthMm;
      const Dtot = D + RL;
      const top0 = -Dtot / 2;
      const main = rect(-hw, top0, hw, top0 + D);
      const arm = rs.side === "right"
        ? rect(hw - RD, top0 + D, hw, top0 + D + RL)
        : rect(-hw, top0 + D, -hw + RD, top0 + D + RL);
      return {
        prims: [top(main), { kind: "poly", pts: arm, role: "return" }],
        polys: [main, arm],
      };
    }

    case "u-shape": {
      const u = t.uShape ?? { leftLengthMm: 900, leftDepthMm: 600, rightLengthMm: 900, rightDepthMm: 600 };
      const armMax = Math.max(u.leftLengthMm, u.rightLengthMm);
      const Dtot = D + armMax;
      const top0 = -Dtot / 2;
      const front = rect(-hw, top0, hw, top0 + D);
      const left = rect(-hw, top0 + D, -hw + u.leftDepthMm, top0 + D + u.leftLengthMm);
      const right = rect(hw - u.rightDepthMm, top0 + D, hw, top0 + D + u.rightLengthMm);
      return {
        prims: [top(front), { kind: "poly", pts: left, role: "return" }, { kind: "poly", pts: right, role: "return" }],
        polys: [front, left, right],
      };
    }

    case "t-shape": {
      const rs = t.returnSection ?? { side: "right" as const, lengthMm: 900, depthMm: 600 };
      const stemLen = rs.lengthMm, stemW = rs.depthMm;
      const Dtot = D + stemLen;
      const top0 = -Dtot / 2;
      const head = rect(-hw, top0, hw, top0 + D);
      const stem = rect(-stemW / 2, top0 + D, stemW / 2, top0 + D + stemLen);
      return {
        prims: [top(head), { kind: "poly", pts: stem, role: "return" }],
        polys: [head, stem],
      };
    }

    case "curved": {
      /* Straight back, front edge bowed toward the user. */
      const bulge = Math.min(Math.max(d.radiusMm ?? D * 0.15, 20), D * 0.5);
      const p0 = { x: hw, y: hd - bulge };
      const p2 = { x: -hw, y: hd - bulge };
      const pts: Pt[] = [
        { x: -hw, y: -hd },
        { x: hw, y: -hd },
        p0,
        ...quad(p0, { x: 0, y: hd + bulge }, p2, ARC_SEGMENTS / 2),
      ];
      return { prims: [top(pts)], polys: [pts] };
    }

    case "d-shape":
    case "semi-circle": {
      /* Flat back edge, half-elliptical front. A semi-circle is the special case rx = ry. */
      const rx = hw;
      const ry = shape === "semi-circle" ? hw : D;
      const pts: Pt[] = [];
      const n = ARC_SEGMENTS;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI - (i / n) * Math.PI; // π → 0
        pts.push({ x: rx * Math.cos(a), y: -hd + ry * Math.sin(a) });
      }
      return { prims: [top(pts)], polys: [pts] };
    }

    case "trapezoid": {
      /* Long parallel side to the FRONT (the user side) — the classroom/training convention. */
      const shortSide = Math.min(d.secondaryMm ?? L * 0.6, L - 1);
      const hs = shortSide / 2;
      const pts = [
        { x: -hs, y: -hd }, { x: hs, y: -hd }, { x: hw, y: hd }, { x: -hw, y: hd },
      ];
      return { prims: [top(pts)], polys: [pts] };
    }

    case "corner": {
      /* A 90° wedge worktop: two outer edges meet at a corner, the inner side is stepped.
       * `returnSection.depthMm` is the worktop width of each arm; `side` picks the hand. */
      const rs = t.returnSection ?? { side: "right" as const, lengthMm: 900, depthMm: 600 };
      const w = Math.min(rs.depthMm, Math.min(L, D) - 1);
      const pts: Pt[] = rs.side === "right"
        ? [
            { x: -hw, y: -hd }, { x: hw, y: -hd }, { x: hw, y: hd },
            { x: hw - w, y: hd }, { x: hw - w, y: -hd + w }, { x: -hw, y: -hd + w },
          ]
        : [
            { x: -hw, y: -hd }, { x: hw, y: -hd }, { x: hw, y: -hd + w },
            { x: -hw + w, y: -hd + w }, { x: -hw + w, y: hd }, { x: -hw, y: hd },
          ];
      return { prims: [top(pts)], polys: [pts] };
    }

    case "custom": {
      const pts = (d.customPoints ?? []).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      if (pts.length < 3) {
        const p = rect(-hw, -hd, hw, hd);
        return { prims: [top(p)], polys: [p] };
      }
      return { prims: [top(pts)], polys: [pts] };
    }

    default: {
      const p = rect(-hw, -hd, hw, hd);
      return { prims: [top(p)], polys: [p] };
    }
  }
}

/* ==========================================================================
 * 4. Workstation clusters — every seat drawn separately (spec §17)
 * ========================================================================== */

function buildWorkstation(t: CabinTable): { out: ShapeOut; seats: Seat[] } {
  const ws = t.workstation!;
  const users = Math.max(1, ws.users);
  const dl = Math.max(300, ws.deskLengthMm);
  const dd = Math.max(300, ws.deskDepthMm);
  const pt = Math.max(5, ws.partitionThicknessMm);
  const hasScreen = ws.partitionMaterial !== "none" && ws.partitionHeightMm > 0;

  const prims: Prim[] = [];
  const polys: Pt[][] = [];
  const seats: Seat[] = [];

  const desk = (x0: number, y0: number, x1: number, y1: number) => {
    const p = rect(x0, y0, x1, y1);
    prims.push({ kind: "poly", pts: p, role: "top" });
    polys.push(p);
  };
  const screen = (x0: number, y0: number, x1: number, y1: number) => {
    if (!hasScreen) return;
    prims.push({ kind: "poly", pts: rect(x0, y0, x1, y1), role: "partition" });
  };

  if (ws.arrangement === "back-to-back") {
    const per = Math.ceil(users / 2);
    const W = per * dl;
    const H = dd * 2;
    const hwl = W / 2, hdl = H / 2;

    for (let i = 0; i < per; i++) {
      const x0 = -hwl + i * dl;
      desk(x0, -hdl, x0 + dl, 0);                     // rear row
      if (i > 0) screen(x0 - pt / 2, -hdl, x0 + pt / 2, 0);
    }
    for (let i = 0; i < users - per; i++) {
      const x0 = -hwl + i * dl;
      desk(x0, 0, x0 + dl, hdl);                      // front row
      if (i > 0) screen(x0 - pt / 2, 0, x0 + pt / 2, hdl);
    }
    screen(-hwl, -pt / 2, hwl, pt / 2);               // the shared spine

    // Occupants sit on the OUTER faces of a back-to-back run.
    for (let i = 0; i < per; i++) {
      seats.push({ x: -hwl + i * dl + dl / 2, y: -hdl - t.seating.chairDepthMm / 2 - 50, rotDeg: 180, side: "rear" });
    }
    for (let i = 0; i < users - per; i++) {
      seats.push({ x: -hwl + i * dl + dl / 2, y: hdl + t.seating.chairDepthMm / 2 + 50, rotDeg: 0, side: "front" });
    }
    return { out: { prims, polys }, seats };
  }

  if (ws.arrangement === "cluster") {
    /* 2 columns × N rows of L-desks, backs to the centre cross. */
    const cols = 2;
    const rows = Math.ceil(users / cols);
    const W = cols * dl, H = rows * dd;
    const hwl = W / 2, hdl = H / 2;
    let placed = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols && placed < users; c++, placed++) {
        const x0 = -hwl + c * dl;
        const y0 = -hdl + r * dd;
        desk(x0, y0, x0 + dl, y0 + dd);
        screen(x0, y0 - pt / 2, x0 + dl, y0 + pt / 2);
        // Occupant sits on the outward side of their row.
        const outward = r < rows / 2 ? -1 : 1;
        seats.push({
          x: x0 + dl / 2,
          y: outward < 0 ? y0 - t.seating.chairDepthMm / 2 - 50 : y0 + dd + t.seating.chairDepthMm / 2 + 50,
          rotDeg: outward < 0 ? 180 : 0,
          side: outward < 0 ? "rear" : "front",
        });
      }
    }
    return { out: { prims, polys }, seats };
  }

  if (ws.arrangement === "l-shaped") {
    /* One L per user, laid out in a row. */
    const armD = Math.max(400, dd * 0.75);
    const cellW = dl;
    const cellD = dd + armD;
    const W = users * cellW, H = cellD;
    const hwl = W / 2, hdl = H / 2;
    for (let i = 0; i < users; i++) {
      const x0 = -hwl + i * cellW;
      desk(x0, -hdl, x0 + cellW, -hdl + dd);                     // main run
      desk(x0, -hdl + dd, x0 + Math.min(armD, cellW), hdl);      // return arm
      if (i > 0) screen(x0 - pt / 2, -hdl, x0 + pt / 2, -hdl + dd);
      seats.push({ x: x0 + cellW * 0.62, y: -hdl + dd + 200, rotDeg: 180, side: "rear" });
    }
    return { out: { prims, polys }, seats };
  }

  /* linear (default) — one row, occupants on the front side. */
  const W = users * dl;
  const hwl = W / 2, hdl = dd / 2;
  for (let i = 0; i < users; i++) {
    const x0 = -hwl + i * dl;
    desk(x0, -hdl, x0 + dl, hdl);
    if (i > 0) screen(x0 - pt / 2, -hdl, x0 + pt / 2, hdl);
    seats.push({ x: x0 + dl / 2, y: hdl + t.seating.chairDepthMm / 2 + 50, rotDeg: 0, side: "front" });
  }
  screen(-hwl, -hdl - pt / 2, hwl, -hdl + pt / 2); // spine along the back
  return { out: { prims, polys }, seats };
}

/* ==========================================================================
 * 5. Seats — general perimeter distribution (works for every polygon)
 * ========================================================================== */

const CHAIR_GAP_MM = 60;

/** Seats spaced evenly around a curve (circle / oval / D / semi-circle). */
function curveSeats(polys: Pt[][], n: number, chairDepth: number): Seat[] {
  if (n <= 0) return [];
  const b = bboxOfPolys(polys);
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  const rx = b.w / 2, ry = b.d / 2;
  const out: Seat[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2; // start at the top, go clockwise
    const nx = Math.cos(a), ny = Math.sin(a);
    const ex = cx + rx * nx, ey = cy + ry * ny;              // point on the rim
    const off = chairDepth / 2 + CHAIR_GAP_MM;
    out.push({
      x: ex + nx * off,
      y: ey + ny * off,
      rotDeg: (Math.atan2(ny, nx) * 180) / Math.PI - 90,
      side: "curve",
    });
  }
  return out;
}

/**
 * Seats laid along the polygon's EDGES. Each edge takes `floor(len / pitch)` chairs, centred on
 * that edge; edges are filled longest-first until the capacity is used up. This gives a rectangle
 * the seating a joiner would draw (3 + 3 + 1 + 1) rather than points smeared round its perimeter.
 * Only OUTWARD-facing edges are used — an inner edge of an L faces the user's own knees.
 */
function edgeSeats(poly: Pt[], n: number, pitch: number, chairDepth: number): Seat[] {
  if (n <= 0 || poly.length < 3) return [];
  const b = bboxOf(poly);
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;

  type Edge = { a: Pt; b: Pt; len: number; nx: number; ny: number; cap: number };
  const edges: Edge[] = [];

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], c = poly[(i + 1) % poly.length];
    const dx = c.x - a.x, dy = c.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < pitch * 0.6) continue;
    // Outward normal — pick the one pointing AWAY from the polygon centre.
    let nx = dy / len, ny = -dx / len;
    const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2;
    if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
    edges.push({ a, b: c, len, nx, ny, cap: Math.max(1, Math.floor(len / pitch)) });
  }

  edges.sort((p, q) => q.len - p.len);

  const out: Seat[] = [];
  let left = n;
  // Round-robin over the edges so a 4-seater square gets one chair per side, not four on one.
  const taken = edges.map(() => 0);
  let progressed = true;
  while (left > 0 && progressed) {
    progressed = false;
    for (let i = 0; i < edges.length && left > 0; i++) {
      if (taken[i] >= edges[i].cap) continue;
      taken[i]++;
      left--;
      progressed = true;
    }
  }

  edges.forEach((e, i) => {
    const k = taken[i];
    if (!k) return;
    const off = chairDepth / 2 + CHAIR_GAP_MM;
    for (let j = 0; j < k; j++) {
      const t = (j + 0.5) / k;
      const ex = e.a.x + (e.b.x - e.a.x) * t;
      const ey = e.a.y + (e.b.y - e.a.y) * t;
      const side: Seat["side"] =
        Math.abs(e.ny) > Math.abs(e.nx) ? (e.ny > 0 ? "front" : "rear") : e.nx > 0 ? "right" : "left";
      out.push({
        x: ex + e.nx * off,
        y: ey + e.ny * off,
        rotDeg: (Math.atan2(e.ny, e.nx) * 180) / Math.PI - 90,
        side,
      });
    }
  });

  return out;
}

/** The one seat a single-user desk gets: centred on its front edge. */
function singleSeat(polys: Pt[][], chairDepth: number): Seat[] {
  const b = bboxOfPolys(polys);
  return [{
    x: (b.minX + b.maxX) / 2,
    y: b.maxY + chairDepth / 2 + CHAIR_GAP_MM,
    rotDeg: 0,
    side: "front",
  }];
}

function buildSeats(t: CabinTable, polys: Pt[][]): Seat[] {
  if (!t.seating.includeChairs) return [];
  const n = Math.max(0, t.seating.capacity);
  if (n <= 0) return [];

  const def = findTableType(t.tableTypeId);
  const chairDepth = t.seating.chairDepthMm || 550;

  if (def.seatingModel === "counter") {
    // Reception: staff behind, visitors in front. Staff seats only — visitors stand.
    const b = bboxOfPolys(polys);
    const staffSide = t.reception?.visitorSide === "rear" ? 1 : -1; // staff opposite the visitor
    return Array.from({ length: n }, (_, i) => ({
      x: b.minX + ((i + 1) * (b.w)) / (n + 1),
      y: staffSide < 0 ? b.minY - chairDepth / 2 - CHAIR_GAP_MM : b.maxY + chairDepth / 2 + CHAIR_GAP_MM,
      rotDeg: staffSide < 0 ? 180 : 0,
      side: (staffSide < 0 ? "rear" : "front") as Seat["side"],
    }));
  }

  if (def.seatingModel === "single" || n === 1) return singleSeat(polys, chairDepth);

  if (isRoundish(t.shape)) return curveSeats(polys, n, chairDepth);

  const pitch = t.conference?.chairSpacingMm ?? 700;
  // Seat around the OUTLINE — for a multi-part top (L/U/T) use the largest part's outline plus the
  // arms, which is what edgeSeats does naturally when handed the union bbox polygon of each part.
  if (polys.length === 1) return edgeSeats(polys[0], n, pitch, chairDepth);

  // Multi-part: allocate seats across the parts in proportion to their perimeter.
  const perim = (p: Pt[]) =>
    p.reduce((s, a, i) => s + Math.hypot(p[(i + 1) % p.length].x - a.x, p[(i + 1) % p.length].y - a.y), 0);
  const total = polys.reduce((s, p) => s + perim(p), 0) || 1;
  const out: Seat[] = [];
  let assigned = 0;
  polys.forEach((p, i) => {
    const share = i === polys.length - 1 ? n - assigned : Math.round((perim(p) / total) * n);
    assigned += share;
    out.push(...edgeSeats(p, share, pitch, chairDepth));
  });
  return out.slice(0, n);
}

/* ==========================================================================
 * 6. Fittings — legs, pedestal, storage, modesty, cable tray (drawn in plan)
 * ========================================================================== */

function buildFittings(t: CabinTable, polys: Pt[][]): Prim[] {
  const out: Prim[] = [];
  const b = bboxOfPolys(polys);
  const lw = t.dimensions.legWidthMm ?? 50;
  const inset = 40;
  const supportId = t.support.supportTypeId;

  if (supportId === "central-pedestal") {
    const r = Math.max(120, Math.min(b.w, b.d) * 0.18);
    out.push({ kind: "circle", cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, r, role: "pedestal" });
  } else if (supportId === "twin-pedestal") {
    const pw = Math.max(80, b.w * 0.08);
    const ph = Math.max(200, b.d * 0.6);
    const cy = (b.minY + b.maxY) / 2;
    [b.minX + b.w * 0.18, b.maxX - b.w * 0.18].forEach((cx) => {
      out.push({ kind: "poly", pts: rect(cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2), role: "pedestal" });
    });
  } else if (supportId === "wooden-panels" || supportId === "panel-base" || supportId === "storage-base") {
    const pw = Math.max(18, t.dimensions.topThicknessMm);
    out.push({ kind: "poly", pts: rect(b.minX, b.minY, b.minX + pw, b.maxY), role: "pedestal" });
    out.push({ kind: "poly", pts: rect(b.maxX - pw, b.minY, b.maxX, b.maxY), role: "pedestal" });
  } else if (supportId === "wall-bracket" || supportId === "folding-bracket") {
    const bw = Math.max(40, lw);
    [b.minX + b.w * 0.2, b.maxX - b.w * 0.2].forEach((cx) => {
      out.push({ kind: "poly", pts: rect(cx - bw / 2, b.minY, cx + bw / 2, b.minY + Math.min(b.d * 0.7, 300)), role: "leg" });
    });
  } else {
    /* Legs at the corners of every solid part — an L-shaped table gets legs under BOTH arms,
     * which is what makes the plan read as a real joinery drawing rather than a box. */
    polys.forEach((p) => {
      const pb = bboxOf(p);
      if (pb.w < lw * 3 || pb.d < lw * 3) return;
      [
        [pb.minX + inset, pb.minY + inset],
        [pb.maxX - inset - lw, pb.minY + inset],
        [pb.minX + inset, pb.maxY - inset - lw],
        [pb.maxX - inset - lw, pb.maxY - inset - lw],
      ].forEach(([x, y]) => {
        out.push({ kind: "poly", pts: rect(x, y, x + lw, y + lw), role: "leg" });
      });
    });
  }

  /* Modesty panel — a thin strip on the rear edge. */
  const modesty = t.accessories.find((a) => a.accessoryId === "modesty-panel" && a.showInDrawing);
  if (modesty) {
    const th = Math.max(12, t.dimensions.topThicknessMm);
    out.push({ kind: "poly", pts: rect(b.minX + 60, b.minY + 20, b.maxX - 60, b.minY + 20 + th), role: "modesty" });
  }

  /* Cable tray — a dashed strip under the rear edge. */
  const tray = t.accessories.find((a) => a.accessoryId === "cable-tray" && a.showInDrawing);
  if (tray || t.electrical.cableTray) {
    const w = t.dimensions.cableTrayWidthMm ?? 100;
    out.push({ kind: "poly", pts: rect(b.minX + 80, b.minY + 40, b.maxX - 80, b.minY + 40 + w * 0.4), role: "cable" });
  }

  /* Storage / pedestals — drawn at their real footprint so they collide honestly. */
  t.accessories
    .filter((a) => a.showInDrawing && ["mobile-pedestal", "fixed-pedestal", "drawer-unit", "drawer-unit-3",
      "drawer-unit-4", "side-storage", "return-storage", "under-counter-storage", "cpu-holder"].includes(a.accessoryId))
    .forEach((a) => {
      const w = a.lengthMm ?? 400;
      const dd = a.depthMm ?? 450;
      let x0: number, y0: number;
      switch (a.position) {
        case "left":  x0 = b.minX - w; y0 = b.minY + 20; break;
        case "right": x0 = b.maxX;     y0 = b.minY + 20; break;
        case "front": x0 = b.minX + 40; y0 = b.maxY; break;
        case "rear":  x0 = b.minX + 40; y0 = b.minY - dd; break;
        default:      x0 = b.maxX - w - 60; y0 = b.maxY - dd - 20; break; // "under"
      }
      out.push({ kind: "poly", pts: rect(x0, y0, x0 + w, y0 + dd), role: "storage" });
    });

  /* Keyboard tray. */
  const kb = t.accessories.find((a) => a.accessoryId === "keyboard-tray" && a.showInDrawing);
  if (kb) {
    const w = kb.lengthMm ?? 600, dd = kb.depthMm ?? 300;
    const cx = (b.minX + b.maxX) / 2;
    out.push({ kind: "poly", pts: rect(cx - w / 2, b.maxY - dd, cx + w / 2, b.maxY), role: "keyboard" });
  }

  /* Reception: the raised visitor counter band along the visitor side. */
  if (t.reception) {
    const band = 250;
    const vs = t.reception.visitorSide;
    const strip =
      vs === "front" ? rect(b.minX, b.maxY - band, b.maxX, b.maxY)
      : vs === "rear" ? rect(b.minX, b.minY, b.maxX, b.minY + band)
      : vs === "left" ? rect(b.minX, b.minY, b.minX + band, b.maxY)
      : rect(b.maxX - band, b.minY, b.maxX, b.maxY);
    out.push({ kind: "poly", pts: strip, role: "counter" });
  }

  return out;
}

/* ==========================================================================
 * 7. The footprint
 * ========================================================================== */

/** LOCAL footprint (mm), un-rotated. Memoise on the table object if profiling ever demands it. */
export function tableFootprint(t: CabinTable): Footprint {
  const def = findTableType(t.tableTypeId);

  let base: ShapeOut;
  let seats: Seat[];

  if (t.workstation && def.seatingModel === "workstation") {
    const ws = buildWorkstation(t);
    base = ws.out;
    seats = t.seating.includeChairs ? ws.seats : [];
  } else {
    base = buildShape(t);
    seats = buildSeats(t, base.polys);
  }

  const fittings = buildFittings(t, base.polys);
  const bbox = bboxOfPolys(base.polys);

  return {
    prims: [...base.prims, ...fittings],
    polys: base.polys,
    seats,
    bbox,
  };
}

/* ==========================================================================
 * 8. Local → world
 * ========================================================================== */

/** Apply flip, then rotation, then translation. MUST match the SVG group transform exactly. */
export function toWorld(p: Pt, t: CabinTable): Pt {
  const fx = t.position.flipH ? -1 : 1;
  const fy = t.position.flipV ? -1 : 1;
  const r = rotatePt({ x: p.x * fx, y: p.y * fy }, t.position.rotationDeg);
  return { x: r.x + t.position.xMm, y: r.y + t.position.yMm };
}

export const toWorldPts = (pts: Pt[], t: CabinTable): Pt[] => pts.map((p) => toWorld(p, t));

/** The table's solid tabletop polygons in CABIN coordinates (mm). This is what collides. */
export function tableWorldPolys(t: CabinTable): Pt[][] {
  return tableFootprint(t).polys.map((poly) => toWorldPts(poly, t));
}

/** Chair polygons in cabin coordinates — chairs collide too (spec §14). */
export function chairWorldPolys(t: CabinTable): Pt[][] {
  const fp = tableFootprint(t);
  const w = t.seating.chairWidthMm || 550;
  const d = t.seating.chairDepthMm || 550;
  return fp.seats.map((s) => {
    const local = rect(-w / 2, -d / 2, w / 2, d / 2).map((p) => {
      const r = rotatePt(p, s.rotDeg);
      return { x: r.x + s.x, y: r.y + s.y };
    });
    return toWorldPts(local, t);
  });
}

/** Everything the table occupies on the floor: top + arms + chairs + storage. */
export function tableOccupancy(t: CabinTable): Pt[][] {
  const fp = tableFootprint(t);
  const storage = fp.prims
    .filter((p): p is Extract<Prim, { kind: "poly" }> => p.kind === "poly" && p.role === "storage")
    .map((p) => toWorldPts(p.pts, t));
  return [...tableWorldPolys(t), ...storage, ...chairWorldPolys(t)];
}

/** World-space AABB of the tabletop (mm) — drives the wall-distance readouts. */
export function tableWorldBbox(t: CabinTable) {
  return bboxOfPolys(tableWorldPolys(t));
}

/** Same, but including chairs and storage — this is what must fit inside the cabin. */
export function tableOccupancyBbox(t: CabinTable) {
  return bboxOfPolys(tableOccupancy(t));
}

/* ==========================================================================
 * 9. Derived readouts (spec §10 — "Distance from left/right/front/rear wall")
 * ========================================================================== */

export interface WallDistances {
  leftMm: number;
  rightMm: number;
  rearMm: number;
  frontMm: number;
}

/** Distances from the tabletop's bounding box to each cabin wall. Derived — never stored, so the
 *  numeric fields in the editor can never disagree with the drawing. */
export function wallDistances(t: CabinTable, cabinLengthMm: number, cabinWidthMm: number): WallDistances {
  const b = tableWorldBbox(t);
  return {
    leftMm: Math.round(b.minX),
    rightMm: Math.round(cabinLengthMm - b.maxX),
    rearMm: Math.round(b.minY),
    frontMm: Math.round(cabinWidthMm - b.maxY),
  };
}

/** Move the table so its bounding box sits `mm` from the named wall (the inverse of the above). */
export function setWallDistance(
  t: CabinTable,
  wall: "left" | "right" | "rear" | "front",
  mm: number,
  cabinLengthMm: number,
  cabinWidthMm: number,
): CabinTable {
  const b = tableWorldBbox(t);
  const pos = { ...t.position };
  if (wall === "left") pos.xMm += mm - b.minX;
  else if (wall === "right") pos.xMm -= mm - (cabinLengthMm - b.maxX);
  else if (wall === "rear") pos.yMm += mm - b.minY;
  else pos.yMm -= mm - (cabinWidthMm - b.maxY);
  return { ...t, position: pos };
}

/** Keep the table's whole occupancy inside the usable cabin area (spec §10). */
export function clampIntoCabin(t: CabinTable, cabinLengthMm: number, cabinWidthMm: number): CabinTable {
  const b = tableOccupancyBbox(t);
  let dx = 0, dy = 0;
  if (b.minX < 0) dx = -b.minX;
  else if (b.maxX > cabinLengthMm) dx = cabinLengthMm - b.maxX;
  if (b.minY < 0) dy = -b.minY;
  else if (b.maxY > cabinWidthMm) dy = cabinWidthMm - b.maxY;
  if (!dx && !dy) return t;
  return { ...t, position: { ...t.position, xMm: t.position.xMm + dx, yMm: t.position.yMm + dy } };
}

/* ==========================================================================
 * 10. Feet bridge — the 2D plan and the elevations are drawn in FEET
 * ========================================================================== */

/** The SVG transform for this table's group, given the plan's origin + pixels-per-foot.
 *  The renderer emits EXACTLY this, so `toWorld()` and the pixels stay in lock-step. */
export function tableTransform(t: CabinTable, ox: number, oy: number, ppf: number): string {
  const cx = ox + mmToFt(t.position.xMm) * ppf;
  const cy = oy + mmToFt(t.position.yMm) * ppf;
  const fx = t.position.flipH ? -1 : 1;
  const fy = t.position.flipV ? -1 : 1;
  // mm → px scale, folded into the group so children can be emitted in raw mm.
  const k = (ppf / 304.8);
  return `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${t.position.rotationDeg}) scale(${(k * fx).toFixed(5)} ${(k * fy).toFixed(5)})`;
}

/** Path data for a polygon primitive, in LOCAL mm (the group transform does the rest). */
export const polyPath = (pts: Pt[]): string =>
  pts.length ? `M ${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")} Z` : "";

/** A table's overall size label for the drawing / schedule / quotation. */
export function footprintSize(t: CabinTable): { lengthMm: number; depthMm: number } {
  const b = bboxOfPolys(tableFootprint(t).polys);
  return { lengthMm: Math.round(b.w), depthMm: Math.round(b.d) };
}

/** Board area of the tabletop (m²) — shared by the BOQ and the "sheets required" readout, so the
 *  quantity in the BOQ is literally the area of the polygon the plan drew. */
export function topAreaSqm(t: CabinTable): number {
  const polys = tableFootprint(t).polys;
  const areaOf = (p: Pt[]) => {
    let a = 0;
    for (let i = 0; i < p.length; i++) {
      const q = p[(i + 1) % p.length];
      a += p[i].x * q.y - q.x * p[i].y;
    }
    return Math.abs(a) / 2;
  };
  const sqmm = polys.reduce((s, p) => s + areaOf(p), 0);
  return sqmm / 1_000_000;
}

/** Perimeter of the tabletop (m) — the edge-banding length. */
export function topPerimeterM(t: CabinTable): number {
  const polys = tableFootprint(t).polys;
  const perim = (p: Pt[]) =>
    p.reduce((s, a, i) => {
      const b = p[(i + 1) % p.length];
      return s + Math.hypot(b.x - a.x, b.y - a.y);
    }, 0);
  return polys.reduce((s, p) => s + perim(p), 0) / 1000;
}
