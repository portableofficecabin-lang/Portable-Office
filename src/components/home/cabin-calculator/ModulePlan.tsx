"use client";

/**
 * ModulePlan — a clean, architectural-style 2D floor plan of the configured cabin,
 * drawn on a "paper" (light) background so it reads like a real module drawing even
 * inside the dark UI. It composes everything the customer chose into one plan:
 *   • dimensioned walls (length × width, feet-inches)
 *   • windows on their walls, labelled with size (e.g. WINDOW 4'-0" X 3'-0")
 *   • doors with swing arcs, labelled (DOOR 3'-0" X 7'-0")
 *   • electrical sockets on the corners
 *   • ceiling LED lights (square panels) in a grid
 *   • ceiling fans as 3-blade ROUND 12" cabin fans on the centre line
 *
 * Spec-only (no price impact). Self-contained so it drops into the preview without
 * entangling the large CabinCalculator component.
 */

import { useCallback, useRef } from "react";

import { TableLayer } from "@/features/cabin-design/furniture/tables/TableRenderer2D";
import { ftToMm } from "@/features/cabin-design/furniture/tables/tableUnits";

import {
  tablesOf,
  DOOR_SIZE, doorSizeOf, windowSizeOf, type OpeningSize,
  TABLE_SIZE, ROOM_FURNITURE_IDS, furnitureRoomCounts, TABLE_ADDON_IDS, tablePlacementsOf,
  furnitureAdjustOf, type FurnitureAdjust, plugPlanFor,
  MANAGER_TABLE_SIZE, MANAGER_L_SIZE, findWindowTrack, isToiletCabin,
  isOpenableWindow, type WindowOpening,
  ENCLOSED_TOILET_IDS, PANTRY_DEPTH_FT,
  fixtureSizeOf, fixtureSizeLabel,
  fixtureUnitWallsOf, fixtureUnitOffsetsOf, fixtureUnitSwingsOf,
  fixtureUnitEwcWallsOf, fixtureUnitEwcDistsOf, externalLightOffsetOf,
  sideSpanFt, openingWidthOn, clampOpeningOffset, slidingDoorModel, type CabinConfig,
} from "./pricing";
import { doorKeepoutRects, partitionSlideKeepoutRects, avoidKeepouts, type KeepRect } from "./doorClearance";

/**
 * Divider positions (fractions of the window depth) for a sliding window, so the
 * number of visible channels drawn EQUALS the selected track count — never one more.
 *   • "2"   → one divider at 0.5      → 2 equal channels  → reads "2 Track"
 *   • "2.5" → dividers at 0.4 and 0.8 → 2 full + 1 half   → reads "2.5 Track"
 *   • "3"   → dividers at 1/3, 2/3    → 3 equal channels
 * No extra track is ever added (the previous code drew `count` dividers, which split
 * the frame into count+1 channels → 2-track looked like 3, 2.5 like 4).
 */
function trackDividerFractions(trackId: string): number[] {
  const t = parseFloat(trackId) || 2;              // 2 or 2.5
  const full = Math.floor(t + 1e-6);               // whole tracks
  const hasHalf = t - full >= 0.5 - 1e-6;          // a .5 (mesh / half) track present
  const nDiv = hasHalf ? full : Math.max(0, full - 1);
  return Array.from({ length: nDiv }, (_, k) => (k + 1) / t);
}

/** Split `total` electrical items across the rooms in proportion to each room's length,
 *  so ceiling lights & fans are distributed room-by-room and never straddle a partition
 *  wall. Floors the proportional share, then hands the remainder to the rooms with the
 *  largest fractional part. Sums exactly to `total`. 1 room → [total] (layout unchanged). */
function allocateAcrossRooms(total: number, roomLengths: number[]): number[] {
  const n = roomLengths.length;
  if (n <= 1) return [total];
  const sum = roomLengths.reduce((a, b) => a + b, 0) || n;
  const raw = roomLengths.map((rl) => (total * rl) / sum);
  const base = raw.map((v) => Math.floor(v));
  let rem = total - base.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  for (let j = 0; j < order.length && rem > 0; j++, rem--) base[order[j].i]++;
  return base;
}

/** Feet → architectural label, e.g. 30 → 30'-0", 8.5 → 8'-6", 3 → 3'-0". */
function ftLabel(f: number): string {
  const whole = Math.floor(f + 1e-6);
  const inches = Math.round((f - whole) * 12);
  if (inches === 12) return `${whole + 1}'-0"`;
  return `${whole}'-${inches}"`;
}

/** A solid arrowhead with its tip at (x,y). Deliberately a literal <polygon> rather than an SVG
 *  <marker>: the PDF export serialises this <svg> standalone and re-loads it as an <img>, a path
 *  on which url(#marker) references are not reliably resolved. Shared by the dimension lines and
 *  the sliding-door travel arrow. */
function arrowAt(x: number, y: number, dir: "l" | "r" | "u" | "d", fill: string) {
  const p = dir === "l" ? `${x},${y} ${x + 5},${y - 3} ${x + 5},${y + 3}`
    : dir === "r" ? `${x},${y} ${x - 5},${y - 3} ${x - 5},${y + 3}`
    : dir === "u" ? `${x},${y} ${x - 3},${y + 5} ${x + 3},${y + 5}`
    : `${x},${y} ${x - 3},${y - 5} ${x + 3},${y - 5}`;
  return <polygon points={p} fill={fill} />;
}

// Palette (fixed, paper-style — matches an architectural print).
const C = {
  paper: "#fbfaf6", wall: "#333333", room: "#e9ddc4",
  win: "#a8c8e0", winLine: "#5a86ab",
  door: "#333333", arc: "#7a7a7a",
  slide: "#0f6f63",                       // sliding-door track / travel arrow / direction note
  socket: "#f7f7f7", socketInk: "#333333",
  light: "#f2ecc6", lightEdge: "#bcae5a",
  fan: "#8aa9bb", fanEdge: "#4f7387", fanHub: "#3d5f72",
  steel: "#5a5a5a",
  wood: "#d9bb8f", woodEdge: "#a97c48",   // desks / tables (top view)
  cab: "#cbb492", cabEdge: "#8f6c3f",     // cupboard / file cabinet
  seat: "#aebfca", seatEdge: "#6c8494",   // chairs
  ink: "#333333", dim: "#444444",
};

/* ------------------------------------------------------------------ *
 * Furniture (top-view) — drawn to scale with architectural dimensions.
 * Sizes are the company's real product footprints. Each piece is a
 * proper shape (desk + chair, cupboard, conference table) labelled with
 * its size, not an icon chip.
 * ------------------------------------------------------------------ */
type FurnUnit = { id: string; label: string; wFt: number; dFt: number; kind: "desk" | "deskL" | "cabinet" | "conf" | "chair" | "toilet" | "basin" | "urinal" | "pantry"; pos?: string; adj?: FurnitureAdjust };
/** The customer's per-unit manual override as an SVG transform: rotate around the piece's
 *  centre (cx,cy) + a fine shift in FEET (dx right, dy down). Returns undefined when the unit
 *  is left at its auto placement, so the DOM stays clean. */
const adjTransform = (u: FurnUnit, cx: number, cy: number, ppf: number): string | undefined => {
  const a = u.adj;
  if (!a || (!a.rot && !a.dx && !a.dy)) return undefined;
  return `translate(${a.dx * ppf} ${a.dy * ppf}) rotate(${a.rot} ${cx} ${cy})`;
};
// Clearance between the desk edge and the chair — this is the seated person's leg/feet
// space (room to tuck legs in, move their feet and pull the chair back to get up). It
// drives BOTH the drawn chair position and every reserved-space calc below, so raising it
// widens legroom everywhere while keeping the layout collision-free.
const CHAIR_GAP = 7;
// Work tables (workstation / manager / conference) all use the company's standard
// TABLE_SIZE (3.5 ft × 22"), so the plan's dimensions match the quote & PDF exactly.
const TW = TABLE_SIZE.lengthFt, TD = TABLE_SIZE.depthIn / 12;
const FURN_SPEC: Record<string, Omit<FurnUnit, "id">> = {
  workstation:      { label: "WORKSTATION", wFt: TW, dFt: TD, kind: "desk" },
  manager:          { label: "MANAGER TABLE", wFt: MANAGER_TABLE_SIZE.widthFt, dFt: MANAGER_TABLE_SIZE.depthFt, kind: "desk" },
  "manager-l":      { label: "MANAGER TABLE (L)", wFt: MANAGER_L_SIZE.widthFt, dFt: MANAGER_L_SIZE.depthFt, kind: "deskL" },
  conference:       { label: "CONFERENCE TABLE", wFt: TW, dFt: TD, kind: "conf" },
  table:            { label: "TABLE", wFt: TW, dFt: TD, kind: "desk" },
  "table-drawer":   { label: "TABLE (DRAWER)", wFt: TW, dFt: TD, kind: "desk" },
  cupboard:         { label: "CUPBOARD / FILE CABINET", wFt: 3, dFt: 1.5, kind: "cabinet" },
  overhead:         { label: "OVERHEAD CABINET", wFt: 3, dFt: 1, kind: "cabinet" },
  "chair-headrest": { label: "CHAIR (HEAD REST)", wFt: 1.5, dFt: 1.5, kind: "chair" },
  "chair-backrest": { label: "CHAIR (BACK REST)", wFt: 1.5, dFt: 1.5, kind: "chair" },
};
const PER_TYPE_CAP = 8; // don't flood a room's plan with dozens of identical pieces

/** Office chair, top view. Two clearly-different types:
 *   • BACKREST (staff / workstation) — a simple seat + a plain back bar. Standard.
 *   • HEADREST (MD / manager cabin)  — a taller back + a distinct headrest cap on top + two
 *     armrests, so it reads as a bigger, premium executive chair.
 *  Drawn facing "up" (toward a desk above), then rotated by `side` so the chair always FACES
 *  the desk it belongs to and its back sits away from it. */
function FurnChair({ cx, cy, s, type = "backrest", side = "below" }: {
  cx: number; cy: number; s: number;
  type?: "headrest" | "backrest";
  side?: "below" | "above" | "right" | "left";
}) {
  // side = which side of the desk the chair sits on → rotate so the seat faces the desk.
  const angle = side === "below" ? 0 : side === "above" ? 180 : side === "right" ? 270 : 90;
  const head = type === "headrest";
  const seatEdgeW = head ? 1.1 : 0.9;
  return (
    <g transform={`rotate(${angle} ${cx} ${cy})`}>
      {head && (
        <>
          {/* armrests — premium executive chair */}
          <rect x={cx - s * 0.50} y={cy - s * 0.26} width={s * 0.11} height={s * 0.5} rx={s * 0.05} fill={C.seatEdge} fillOpacity={0.85} />
          <rect x={cx + s * 0.39} y={cy - s * 0.26} width={s * 0.11} height={s * 0.5} rx={s * 0.05} fill={C.seatEdge} fillOpacity={0.85} />
        </>
      )}
      {/* seat cushion (the part you sit on) */}
      <rect x={cx - s * 0.40} y={cy - s * 0.42} width={s * 0.80} height={s * 0.72} rx={s * 0.16} fill={C.seat} stroke={C.seatEdge} strokeWidth={seatEdgeW} />
      {/* back-rest bar */}
      <rect x={cx - s * 0.44} y={cy + s * 0.22} width={s * 0.88} height={head ? s * 0.22 : s * 0.30} rx={s * 0.1} fill={C.seatEdge} stroke={C.seatEdge} strokeWidth={0.6} />
      {/* headrest cap — the extra top element that makes it read as taller & premium */}
      {head && <rect x={cx - s * 0.23} y={cy + s * 0.44} width={s * 0.46} height={s * 0.17} rx={s * 0.08} fill={C.seatEdge} stroke={C.socketInk} strokeWidth={0.6} />}
    </g>
  );
}

/** Two-line caption (NAME + size) centred under a piece of furniture. */
function FurnCaption({ cx, y, u }: { cx: number; y: number; u: FurnUnit }) {
  return (
    <>
      <text x={cx} y={y} textAnchor="middle" fontSize={6.6} fontWeight={700} fill={C.ink}>{u.label}</text>
      <text x={cx} y={y + 7.3} textAnchor="middle" fontSize={6.3} fill={C.ink}>{ftLabel(u.wFt)} X {ftLabel(u.dFt)}</text>
    </>
  );
}

/** Chair size that fits a desk of w×h, clamped so it always reads as a seat. */
/** Chair footprint (px) — a standard ~1.45 ft office chair, clearly visible and proportionate
 *  to the desk: never wider than the desk, never a tiny dot. Scales with the plan (ppf). */
const chairFor = (w: number, h: number, ppf: number) =>
  Math.max(16, Math.min(1.45 * ppf, Math.min(w, h) * 1.05));

/** Small socket (2-pin) glyph for the standard per-table electrical cluster. */
function MiniSocket({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <rect x={cx - 3.2} y={cy - 3.2} width={6.4} height={6.4} rx={1.2} fill={C.socket} stroke={C.socketInk} strokeWidth={0.7} />
      <circle cx={cx - 1.2} cy={cy} r={0.6} fill={C.socketInk} />
      <circle cx={cx + 1.2} cy={cy} r={0.6} fill={C.socketInk} />
    </g>
  );
}
/** Small switch (rocker) glyph — a switch plate with a toggle line. */
function MiniSwitch({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <rect x={cx - 3.2} y={cy - 3.2} width={6.4} height={6.4} rx={1.2} fill="#ffffff" stroke={C.socketInk} strokeWidth={0.7} />
      <line x1={cx} y1={cy - 1.9} x2={cx} y2={cy + 1.9} stroke={C.socketInk} strokeWidth={1.1} strokeLinecap="round" />
    </g>
  );
}
/** Standard per-table electrical, drawn by default on every work table: 2 sockets + 2 switches
 *  on the table's WALL side (the edge opposite the chair). `side` is the CHAIR side, so the
 *  outlets sit on the far edge — i.e. on the wall behind a wall-attached table. */
const TABLE_OUTLETS = ["s", "s", "k", "k"] as const;
function deskOutlets(x: number, y: number, w: number, h: number, side: "below" | "above" | "right" | "left", key: string) {
  const g = 6.6, n = TABLE_OUTLETS.length;
  const glyph = (t: "s" | "k", gx: number, gy: number, i: number) =>
    t === "s" ? <MiniSocket key={`${key}-${i}`} cx={gx} cy={gy} /> : <MiniSwitch key={`${key}-${i}`} cx={gx} cy={gy} />;
  if (side === "below" || side === "above") {
    const ey = side === "below" ? y + 4.6 : y + h - 4.6;    // wall side = opposite the chair
    const sx = x + w / 2 - ((n - 1) * g) / 2;
    return TABLE_OUTLETS.map((t, i) => glyph(t, sx + i * g, ey, i));
  }
  const ex = side === "right" ? x + 4.6 : x + w - 4.6;
  const sy = y + h / 2 - ((n - 1) * g) / 2;
  return TABLE_OUTLETS.map((t, i) => glyph(t, ex, sy + i * g, i));
}

/** Desk / table (top view) at (x,y,w,h) with the chair on `side` — always the ROOM-interior
 *  side, offset by CHAIR_GAP so there is real clearance for a person to sit. The caption is
 *  drawn INSIDE the desk (rotated for the vertical walls) so it never collides with a chair. */
function drawDeskAt(
  x: number, y: number, w: number, h: number, u: FurnUnit, key: string,
  side: "below" | "above" | "right" | "left", chairType: "headrest" | "backrest" | null, ppf: number,
) {
  const cx = x + w / 2, cyc = y + h / 2;
  const cs = chairFor(w, h, ppf);
  const chair =
    side === "below" ? { cx, cy: y + h + CHAIR_GAP + cs / 2 } :
    side === "above" ? { cx, cy: y - CHAIR_GAP - cs / 2 } :
    side === "right" ? { cx: x + w + CHAIR_GAP + cs / 2, cy: cyc } :
                       { cx: x - CHAIR_GAP - cs / 2, cy: cyc };
  const vertical = side === "right" || side === "left";
  const along = vertical ? h : w;          // the desk's long edge on screen
  return (
    <g key={key} transform={adjTransform(u, cx, cyc, ppf)}>
      {/* Chair only when the customer selected one for here — headrest at MD/manager desks,
          backrest at staff/workstation desks — facing the desk with real legroom. */}
      {chairType && <FurnChair cx={chair.cx} cy={chair.cy} s={cs} type={chairType} side={side} />}
      <rect x={x} y={y} width={w} height={h} rx={2} fill={C.wood} stroke={C.woodEdge} strokeWidth={1} />
      {/* Standard workstation electrical: 2 sockets + 2 switches on the wall side. */}
      {deskOutlets(x, y, w, h, side, `${key}-o`)}
      {along > 44 && (
        <g transform={vertical ? `rotate(-90 ${cx} ${cyc})` : undefined}>
          <text x={cx} y={cyc - 0.5} textAnchor="middle" fontSize={6} fontWeight={700} fill={C.ink}>{u.label}</text>
          <text x={cx} y={cyc + 6.2} textAnchor="middle" fontSize={5.6} fill={C.ink}>{ftLabel(u.wFt)} X {ftLabel(u.dFt)}</text>
        </g>
      )}
    </g>
  );
}

/** L-shaped manager desk (top view): a 5′×2′ main run plus a 2′-wide return leg. The whole L
 *  is rotated to face the wall it sits on, and the chair tucks into the L's inner corner —
 *  which is exactly how a manager sits at one. `boxW`/`boxH` are the ROTATED bounding box. */
function drawDeskLAt(
  x: number, y: number, boxW: number, boxH: number, u: FurnUnit, key: string,
  side: "below" | "above" | "right" | "left", ppf: number, chairType: "headrest" | "backrest" | null,
) {
  const Lw = u.wFt * ppf, Lh = u.dFt * ppf;              // local (unrotated) footprint
  const mainD = MANAGER_TABLE_SIZE.depthFt * ppf;        // depth of the main run
  const retW = MANAGER_L_SIZE.returnWidthFt * ppf;       // width of the return leg
  // below → 0°, right → -90°, above → 180°, left → 90° (maps "chair below" onto each wall).
  const angle = side === "below" ? 0 : side === "right" ? -90 : side === "above" ? 180 : 90;
  const cs = chairFor(Lw - retW, Lh - mainD, ppf);
  const chX = retW + (Lw - retW) / 2, chY = mainD + CHAIR_GAP + cs / 2;
  const pts = `0,0 ${Lw},0 ${Lw},${mainD} ${retW},${mainD} ${retW},${Lh} 0,${Lh}`;
  // 2 sockets + 2 switches along the main run's wall side (local top edge, y≈0).
  const og = 6.6, oSx = Lw / 2 - ((TABLE_OUTLETS.length - 1) * og) / 2;
  return (
    <g key={key} transform={`${adjTransform(u, x + boxW / 2, y + boxH / 2, ppf) ?? ""} translate(${x + boxW / 2} ${y + boxH / 2}) rotate(${angle}) translate(${-Lw / 2} ${-Lh / 2})`}>
      {/* Manager desk → the manager sits in the L's inner corner (chair faces the run above). */}
      {chairType && <FurnChair cx={chX} cy={chY} s={cs} type={chairType} side="below" />}
      <polygon points={pts} fill={C.wood} stroke={C.woodEdge} strokeWidth={1} />
      {TABLE_OUTLETS.map((t, i) => (t === "s"
        ? <MiniSocket key={`o${i}`} cx={oSx + i * og} cy={4.6} />
        : <MiniSwitch key={`o${i}`} cx={oSx + i * og} cy={4.6} />))}
      {Lw > 44 && (
        // counter-rotate so the caption stays upright whichever wall the desk faces
        <g transform={`rotate(${-angle} ${Lw / 2} ${mainD / 2})`}>
          <text x={Lw / 2} y={mainD / 2 - 0.5} textAnchor="middle" fontSize={5.8} fontWeight={700} fill={C.ink}>{u.label}</text>
          <text x={Lw / 2} y={mainD / 2 + 5.8} textAnchor="middle" fontSize={5.4} fill={C.ink}>{ftLabel(u.wFt)} X {ftLabel(u.dFt)}</text>
        </g>
      )}
    </g>
  );
}

/** Cupboard / file cabinet (top view) — two-door box against a wall + caption. */
function drawCabinet(x: number, y: number, w: number, h: number, u: FurnUnit, key: string, ppf: number) {
  const cx = x + w / 2;
  return (
    <g key={key} transform={adjTransform(u, cx, y + h / 2, ppf)}>
      <rect x={x} y={y} width={w} height={h} rx={1.5} fill={C.cab} stroke={C.cabEdge} strokeWidth={1} />
      <line x1={cx} y1={y} x2={cx} y2={y + h} stroke={C.cabEdge} strokeWidth={0.6} strokeOpacity={0.7} />
      <circle cx={cx - 3} cy={y + h / 2} r={0.9} fill={C.cabEdge} />
      <circle cx={cx + 3} cy={y + h / 2} r={0.9} fill={C.cabEdge} />
      <FurnCaption cx={cx} y={y + h + 8} u={u} />
    </g>
  );
}

/* ------------------------------------------------------------------ *
 * Plumbing & pantry fixtures (top view) — toilet (WC), wash basin,
 * urinal and a pantry counter. Real porcelain-white glyphs so an
 * attached washroom / pantry reads clearly on the plan. Drawn to scale
 * and movable via the same per-unit rotate + feet-shift (adjTransform).
 * ------------------------------------------------------------------ */
// Loose glyph fixtures (drawn against their chosen wall). The enclosed toilet/washroom
// (`toilet-wc` / `toilet-washroom`) are NOT here — they render as partitioned sub-rooms in the
// washroom block, so they never double-draw as a glyph.
const FIXTURE_ORDER = ["wash-basin", "urinal", "pantry"];
const FIXTURE_SPEC: Record<string, Omit<FurnUnit, "id">> = {
  "wash-basin": { label: "WASH BASIN",  wFt: 2,   dFt: 1.5, kind: "basin" },
  urinal:       { label: "URINAL",      wFt: 1.5, dFt: 1.2, kind: "urinal" },
  pantry:       { label: "PANTRY",      wFt: 4,   dFt: 2,   kind: "pantry" },
};
const PORCELAIN = "#eef2f4";
/** One plumbing / pantry fixture, drawn to scale against the wall it sits on (default: the
 *  down wall). `y` is the fixture's top; the piece faces INTO the room, label above it. */
function drawFixture(x: number, y: number, w: number, h: number, u: FurnUnit, key: string, ppf: number) {
  const cx = x + w / 2, cy = y + h / 2;
  let glyph: React.ReactNode;
  if (u.kind === "toilet") {
    glyph = (
      <>
        {/* cistern flush to the wall (top) + bowl facing into the room */}
        <rect x={x} y={y} width={w} height={h * 0.26} rx={1.5} fill={PORCELAIN} stroke={C.socketInk} strokeWidth={0.8} />
        <ellipse cx={cx} cy={y + h * 0.63} rx={w * 0.38} ry={h * 0.33} fill={PORCELAIN} stroke={C.socketInk} strokeWidth={0.9} />
        <ellipse cx={cx} cy={y + h * 0.63} rx={w * 0.22} ry={h * 0.2} fill="none" stroke={C.socketInk} strokeWidth={0.6} />
      </>
    );
  } else if (u.kind === "basin") {
    // Water tap / mixer (top view): a body at the back edge with a spout reaching over the bowl
    // to the water outlet, and a handle on each side.
    const tapY = y + h * 0.15;
    const bodyW = Math.min(w * 0.24, 5.5), bodyH = Math.max(2, h * 0.09);
    const spoutEnd = cy - h * 0.04;
    const hr = Math.max(0.8, w * 0.035), hOff = bodyW / 2 + hr + 0.8;
    glyph = (
      <>
        <rect x={x} y={y} width={w} height={h} rx={2} fill={PORCELAIN} stroke={C.socketInk} strokeWidth={0.8} />
        <ellipse cx={cx} cy={cy + h * 0.06} rx={w * 0.32} ry={h * 0.28} fill="#ffffff" stroke={C.socketInk} strokeWidth={0.7} />
        {/* spout reaching over the bowl to the water outlet */}
        <line x1={cx} y1={tapY} x2={cx} y2={spoutEnd} stroke={C.steel} strokeWidth={1.3} strokeLinecap="round" />
        <circle cx={cx} cy={spoutEnd} r={Math.max(0.9, w * 0.03)} fill="#8fbfe0" stroke={C.socketInk} strokeWidth={0.5} />
        {/* mixer body + hot/cold handles */}
        <rect x={cx - bodyW / 2} y={tapY - bodyH / 2} width={bodyW} height={bodyH} rx={0.8} fill={C.steel} stroke={C.socketInk} strokeWidth={0.5} />
        <circle cx={cx - hOff} cy={tapY} r={hr} fill="none" stroke={C.socketInk} strokeWidth={0.6} />
        <circle cx={cx + hOff} cy={tapY} r={hr} fill="none" stroke={C.socketInk} strokeWidth={0.6} />
      </>
    );
  } else if (u.kind === "urinal") {
    glyph = (
      <>
        <path d={`M ${x} ${y} H ${x + w} V ${y + h * 0.6} Q ${cx} ${y + h * 1.05} ${x} ${y + h * 0.6} Z`}
          fill={PORCELAIN} stroke={C.socketInk} strokeWidth={0.9} />
        {/* separation partition screen beside the urinal (extends into the room) */}
        <line x1={x + w + 1.5} y1={y - 1} x2={x + w + 1.5} y2={y + h * 1.6} stroke={C.wall} strokeWidth={2.2} strokeLinecap="round" />
      </>
    );
  } else {
    // pantry counter — laminate top with a sink + two hobs
    glyph = (
      <>
        <rect x={x} y={y} width={w} height={h} rx={2} fill={C.wood} stroke={C.woodEdge} strokeWidth={1} />
        <rect x={x + w * 0.08} y={y + h * 0.26} width={w * 0.22} height={h * 0.48} rx={1.5} fill={PORCELAIN} stroke={C.socketInk} strokeWidth={0.7} />
        <circle cx={x + w * 0.6} cy={cy} r={Math.min(w, h) * 0.11} fill="none" stroke={C.socketInk} strokeWidth={0.8} />
        <circle cx={x + w * 0.82} cy={cy} r={Math.min(w, h) * 0.11} fill="none" stroke={C.socketInk} strokeWidth={0.8} />
      </>
    );
  }
  // Label is drawn by the caller (unrotated, room-interior side) so wall orientation never
  // flips the text.
  return (
    <g key={key} transform={adjTransform(u, cx, cy, ppf)}>
      {glyph}
    </g>
  );
}

/** Geometry (px) of an enclosed toilet/washroom box for a wall + slide-offset, clamped to the
 *  room band. Shared by the enclosure drawing AND the ceiling lights, so the toilet gets exactly
 *  ONE internal light and the main light grid skips the enclosure. */
function washroomRect(
  bx0: number, bx1: number, roomTop: number, roomBot: number,
  wall: string, offsetFt: number, wFt: number, dFt: number, ppf: number,
) {
  const bandW = bx1 - bx0, bandH = roomBot - roomTop;
  const horizontal = wall === "top" || wall === "bottom";
  const along = Math.min(Math.max(wFt * ppf, 26), (horizontal ? bandW : bandH) - 2);
  const depth = Math.min(Math.max(dFt * ppf, 24), (horizontal ? bandH : bandW) - 2);
  const spanPx = horizontal ? bandW : bandH;
  const maxOff = Math.max(0, spanPx - along);
  const offPx = offsetFt < 0 ? maxOff / 2 : Math.min(Math.max(offsetFt * ppf, 0), maxOff);
  let rx0: number, ry0: number, rw: number, rh: number;
  if (wall === "top")         { rx0 = bx0 + offPx; ry0 = roomTop;         rw = along; rh = depth; }
  else if (wall === "bottom") { rx0 = bx0 + offPx; ry0 = roomBot - depth; rw = along; rh = depth; }
  else if (wall === "left")   { rx0 = bx0;         ry0 = roomTop + offPx; rw = depth; rh = along; }
  else /* right */            { rx0 = bx1 - depth; ry0 = roomTop + offPx; rw = depth; rh = along; }
  return { rx0, ry0, rw, rh, rx1: rx0 + rw, ry1: ry0 + rh, cx: rx0 + rw / 2, cy: ry0 + rh / 2 };
}

/** True when two 1-D closed intervals overlap (touching endpoints don't count as overlap). */
const rangesOverlap = (a0: number, a1: number, b0: number, b1: number) =>
  Math.min(a1, b1) - Math.max(a0, b0) > 0;

/** The washroom's along-wall offset (ft) after sliding the box clear of the entrance-door
 *  zone(s). Both the enclosure drawing AND the internal-light block call this so they stay in
 *  lock-step. Returns `offFt` unchanged when there's no door zone or it doesn't overlap. */
function washroomAvoidedOffset(
  bx0: number, bx1: number, roomTop: number, roomBot: number,
  wall: string, offFt: number, wFt: number, dFt: number, ppf: number, keeps: KeepRect[],
): number {
  if (!keeps.length) return offFt;
  const r = washroomRect(bx0, bx1, roomTop, roomBot, wall, offFt, wFt, dFt, ppf);
  const horizontal = wall === "top" || wall === "bottom";
  const hw = r.rw / 2, hh = r.rh / 2;
  const adj = avoidKeepouts(r.cx, r.cy, hw, hh, keeps, bx0 + hw, bx1 - hw, roomTop + hh, roomBot - hh, horizontal ? "x" : "y");
  const newNear = horizontal ? adj.cx - r.rw / 2 - bx0 : adj.cy - r.rh / 2 - roomTop;
  return Math.max(0, newNear / ppf);
}

/** Enclosed toilet / washroom — a partitioned box against the chosen WALL, slid along it by
 *  `offsetFt` (ft from the wall's start corner to the box's near edge; <0 = auto-centre). The
 *  wall side is the cabin wall; the two ends + the interior face are NEW partition walls, the
 *  interior face carrying the door (gap + swing arc). `swing` = "in" (into the toilet) / "out"
 *  (into the cabin room). kind "toilet-wc" = WC only; "toilet-washroom" adds a bath + basin.
 *  `ewcWall` (top/bottom/left/right or "auto") = which of the box's 4 walls the commode is set
 *  out from; `ewcDist` = perpendicular gap (ft) from that wall. The commode is auto-centred along
 *  the wall, clamped inside the box, and nudged so it never overlaps/blocks the door. */
function drawWashroom(
  bx0: number, bx1: number, roomTop: number, roomBot: number,
  wall: string, offsetFt: number, wFt: number, dFt: number, swing: string, kind: string,
  ppf: number, key: string, sizeLbl: string, ewcWall: string, ewcDist: number,
) {
  const { rx0, ry0, rw, rh, rx1, ry1, cx, cy } = washroomRect(bx0, bx1, roomTop, roomBot, wall, offsetFt, wFt, dFt, ppf);
  const horizontal = wall === "top" || wall === "bottom";
  const wt = 3.5;
  const doorGap = Math.max(10, Math.min(DOOR_SIZE.widthFt * ppf, (horizontal ? rw : rh) * 0.6));
  const walls: React.ReactNode[] = [];
  const solid = (x1: number, y1: number, x2: number, y2: number, k: string) =>
    walls.push(<line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.wall} strokeWidth={wt} />);

  if (horizontal) {
    const faceY = wall === "top" ? ry1 : ry0;   // interior face (toward room centre) — carries the door
    const wallY = wall === "top" ? ry0 : ry1;   // cabin-wall side
    solid(rx0, wallY, rx1, wallY, "cw");
    solid(rx0, ry0, rx0, ry1, "e0");
    solid(rx1, ry0, rx1, ry1, "e1");
    const gs = cx - doorGap / 2, ge = cx + doorGap / 2;
    solid(rx0, faceY, gs, faceY, "f0");
    solid(ge, faceY, rx1, faceY, "f1");
    const intoRoom = wall === "top" ? 1 : -1;               // +y goes into the room from a top-wall box
    const dir = swing === "out" ? intoRoom : -intoRoom;     // out → into room · in → into toilet
    walls.push(<line key="dl" x1={gs} y1={faceY} x2={gs} y2={faceY + dir * doorGap} stroke={C.door} strokeWidth={2} />);
    walls.push(<path key="da" d={`M ${gs} ${faceY + dir * doorGap} A ${doorGap} ${doorGap} 0 0 ${dir > 0 ? 1 : 0} ${ge} ${faceY}`} fill="none" stroke={C.arc} strokeWidth={0.9} />);
  } else {
    const faceX = wall === "left" ? rx1 : rx0;
    const wallX = wall === "left" ? rx0 : rx1;
    solid(wallX, ry0, wallX, ry1, "cw");
    solid(rx0, ry0, rx1, ry0, "e0");
    solid(rx0, ry1, rx1, ry1, "e1");
    const gs = cy - doorGap / 2, ge = cy + doorGap / 2;
    solid(faceX, ry0, faceX, gs, "f0");
    solid(faceX, ge, faceX, ry1, "f1");
    const intoRoom = wall === "left" ? 1 : -1;
    const dir = swing === "out" ? intoRoom : -intoRoom;
    walls.push(<line key="dl" x1={faceX} y1={gs} x2={faceX + dir * doorGap} y2={gs} stroke={C.door} strokeWidth={2} />);
    walls.push(<path key="da" d={`M ${faceX + dir * doorGap} ${gs} A ${doorGap} ${doorGap} 0 0 ${dir > 0 ? 0 : 1} ${faceX} ${ge}`} fill="none" stroke={C.arc} strokeWidth={0.9} />);
  }

  // Fixtures inside — the EWC/commode + (for a washroom) a bath strip & basin.
  const inner: React.ReactNode[] = [];

  if (kind === "toilet-washroom") {
    // Washroom = an integrated bath + basin + WC. The commode stays FIXED at the box's upper-left,
    // so it never collides with the built-in bath (bottom strip) or basin (top-right). The movable
    // EWC below applies to the plain attached toilet (toilet-wc) only.
    const bw = Math.min(1.2 * ppf, rw * 0.44);
    const bh = Math.min(2.25 * ppf, rh * 0.5);
    const wcx = rx0 + 3, wcy = ry0 + 3;
    inner.push(
      <g key="wc">
        <rect x={wcx} y={wcy} width={bw} height={bh * 0.28} rx={1.4} fill={PORCELAIN} stroke={C.socketInk} strokeWidth={0.8} />
        <ellipse cx={wcx + bw / 2} cy={wcy + bh * 0.62} rx={bw * 0.42} ry={bh * 0.34} fill={PORCELAIN} stroke={C.socketInk} strokeWidth={0.9} />
        <ellipse cx={wcx + bw / 2} cy={wcy + bh * 0.62} rx={bw * 0.26} ry={bh * 0.22} fill="none" stroke={C.socketInk} strokeWidth={0.55} />
      </g>,
    );
    const bathW = Math.max(12, rw - 8), bathH = Math.min(rh * 0.28, 12);
    inner.push(<rect key="bath" x={rx0 + (rw - bathW) / 2} y={ry1 - 4 - bathH} width={bathW} height={bathH} rx={3} fill="#dbe7ec" stroke={C.socketInk} strokeWidth={0.7} />);
    const bs = Math.min(rw * 0.24, 12);
    inner.push(
      <g key="basin">
        <rect x={rx1 - 4 - bs} y={ry0 + 4} width={bs} height={bs * 0.8} rx={2} fill={PORCELAIN} stroke={C.socketInk} strokeWidth={0.6} />
        <ellipse cx={rx1 - 4 - bs / 2} cy={ry0 + 4 + bs * 0.44} rx={bs * 0.3} ry={bs * 0.24} fill="#fff" stroke={C.socketInk} strokeWidth={0.5} />
      </g>,
    );
  } else {
    // ---- Movable EWC / commode (plain attached toilet) --------------------------------------
    // The commode reads back-to-wall (tank against the wall, bowl into the room). The customer
    // picks which of the box's 4 walls it backs onto (`ewcWall`) + the perpendicular gap from it
    // (`ewcDist`, ft). It is auto-centred ALONG that wall, clamped to stay INSIDE the partition,
    // and GUARANTEED not to overlap/block the door via a 3-stage resolve:
    //   1) slide along the chosen wall to clear the door;
    //   2) if it can't, push it out (increase the gap) past the door on the same wall;
    //   3) if still blocked, fall back to the cabin/back wall (which never carries the door),
    //      shrinking its depth so it sits clear in front of the door swing.
    // Default (`auto`) = the cabin/back wall (opposite the door), i.e. the classic layout.
    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
    const m = 4;                                          // inset from the partition walls
    const ix0 = rx0 + m, iy0 = ry0 + m, ix1 = rx1 - m, iy1 = ry1 - m;
    const iW = ix1 - ix0, iH = iy1 - iy0;
    const ew0 = ewcWall === "top" || ewcWall === "bottom" || ewcWall === "left" || ewcWall === "right"
      ? ewcWall : wall;                                   // "auto" → cabin/back wall (opposite the door)

    // Door keep-out rect the commode must clear. Door is on the interior face; "in" swing sweeps a
    // quarter-disc of radius doorGap into the box, "out" needs only the doorway threshold clear.
    const keepDepth = swing === "in" ? doorGap : Math.min(0.45 * ppf, iH * 0.5, iW * 0.5);
    let ko: { x0: number; y0: number; x1: number; y1: number };
    if (horizontal) {
      const faceY = wall === "top" ? ry1 : ry0;
      const into = wall === "top" ? -1 : 1;              // face -> box interior
      const gs = cx - doorGap / 2, ge = cx + doorGap / 2;
      ko = { x0: gs - 2, x1: ge + 2, y0: Math.min(faceY, faceY + into * keepDepth), y1: Math.max(faceY, faceY + into * keepDepth) };
    } else {
      const faceX = wall === "left" ? rx1 : rx0;
      const into = wall === "left" ? -1 : 1;
      const gs = cy - doorGap / 2, ge = cy + doorGap / 2;
      ko = { x0: Math.min(faceX, faceX + into * keepDepth), x1: Math.max(faceX, faceX + into * keepDepth), y0: gs - 2, y1: ge + 2 };
    }

    // Placement candidate for a wall + gap (ft) + optional depth cap (px). Auto-centres along the
    // wall, then slides to clear the door; `cleared` = the commode fully avoids the keep-out.
    type Cand = { ew: string; ac: number; gapPx: number; backLen: number; projDepth: number; cleared: boolean };
    const candidate = (ewX: string, gapFtX: number, projCapPx?: number): Cand => {
      const h = ewX === "top" || ewX === "bottom";
      const alongSpan = h ? iW : iH, perpSpan = h ? iH : iW;
      const backLen = Math.max(10, Math.min(1.25 * ppf, alongSpan * 0.6));
      let projDepth = Math.max(12, Math.min(2.3 * ppf, perpSpan * 0.72));
      if (projCapPx != null) projDepth = Math.max(6, Math.min(projDepth, projCapPx));
      const gapPx = clamp(gapFtX * ppf, 0, Math.max(0, perpSpan - projDepth));
      const [q0, q1] = ewX === "top" ? [iy0 + gapPx, iy0 + gapPx + projDepth]
        : ewX === "bottom" ? [iy1 - gapPx - projDepth, iy1 - gapPx]
        : ewX === "left" ? [ix0 + gapPx, ix0 + gapPx + projDepth]
        : [ix1 - gapPx - projDepth, ix1 - gapPx];
      const hw = backLen / 2;
      const aMin = (h ? ix0 : iy0) + hw, aMax = (h ? ix1 : iy1) - hw;
      const aCentre = h ? (ix0 + ix1) / 2 : (iy0 + iy1) / 2;
      const perpHit = h ? rangesOverlap(q0, q1, ko.y0, ko.y1) : rangesOverlap(q0, q1, ko.x0, ko.x1);
      const koLo = h ? ko.x0 : ko.y0, koHi = h ? ko.x1 : ko.y1;
      let ac = clamp(aCentre, aMin, aMax);
      let cleared = true;
      if (perpHit && rangesOverlap(ac - hw, ac + hw, koLo, koHi)) {
        const leftPos = koLo - hw, rightPos = koHi + hw;
        const leftOk = leftPos >= aMin, rightOk = rightPos <= aMax;
        if (leftOk && rightOk) ac = Math.abs(leftPos - aCentre) <= Math.abs(rightPos - aCentre) ? leftPos : rightPos;
        else if (leftOk) ac = leftPos;
        else if (rightOk) ac = rightPos;
        else { ac = (koLo - aMin) >= (aMax - koHi) ? aMin : aMax; cleared = false; }
      }
      return { ew: ewX, ac, gapPx, backLen, projDepth, cleared };
    };

    let cand = candidate(ew0, ewcDist);                  // stage 1: the customer's exact request
    if (!cand.cleared) {                                 // stage 2: perpendicular escape, same wall
      const perpSpan0 = (ew0 === "top" || ew0 === "bottom") ? iH : iW;
      for (let gp = Math.max(ewcDist, 0) + 0.5; gp * ppf <= perpSpan0 + 1e-6; gp += 0.5) {
        const t = candidate(ew0, gp);
        if (t.cleared) { cand = t; break; }
      }
    }
    if (!cand.cleared) {                                 // stage 3: guaranteed clear on the back wall
      // Cap the commode's depth to the clear band in FRONT of the door (the cabin/back wall never
      // carries the door), so it can never reach the doorway/swing — a guaranteed non-overlap.
      const avail = wall === "top" ? ko.y0 - iy0
        : wall === "bottom" ? iy1 - ko.y1
        : wall === "left" ? ko.x0 - ix0
        : ix1 - ko.x1;
      cand = candidate(wall, 0, Math.max(6, avail - 1));
    }

    // Draw the commode in a local frame (back at local top: tank strip then bowl) and rotate it so
    // the back faces `ew`. Lw = along-wall extent, Ld = depth into the room.
    const { ew, ac, gapPx, backLen: Lw, projDepth: Ld } = cand;
    const hw = Lw / 2;
    const ewcTransform = ew === "top" ? `translate(${ac - hw}, ${iy0 + gapPx})`
      : ew === "bottom" ? `translate(${ac + hw}, ${iy1 - gapPx}) rotate(180)`
      : ew === "left" ? `translate(${ix0 + gapPx}, ${ac + hw}) rotate(-90)`
      : `translate(${ix1 - gapPx}, ${ac - hw}) rotate(90)`;
    inner.push(
      <g key="wc" transform={ewcTransform}>
        <rect x={0} y={0} width={Lw} height={Ld * 0.28} rx={1.4} fill={PORCELAIN} stroke={C.socketInk} strokeWidth={0.8} />
        <ellipse cx={Lw / 2} cy={Ld * 0.62} rx={Lw * 0.42} ry={Ld * 0.34} fill={PORCELAIN} stroke={C.socketInk} strokeWidth={0.9} />
        <ellipse cx={Lw / 2} cy={Ld * 0.62} rx={Lw * 0.26} ry={Ld * 0.22} fill="none" stroke={C.socketInk} strokeWidth={0.55} />
      </g>,
    );
  }

  return (
    <g key={key}>
      <rect x={rx0} y={ry0} width={rw} height={rh} fill="#e7edf0" stroke="none" />
      {walls}
      {inner}
      <text x={cx} y={cy - 1} textAnchor="middle" fontSize={5.6} fontWeight={700} fill={C.ink}>
        {kind === "toilet-washroom" ? "WASHROOM" : "TOILET"}
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={5.2} fill={C.ink}>{sizeLbl}</text>
    </g>
  );
}

/** Ring capacity of a conference table (how many chairs fit around it). */
const confCapacity = (w: number, h: number) => {
  const chairS = Math.min(h * 0.5, 11);
  return 2 * Math.max(1, Math.min(3, Math.round(w / (chairS * 2.4))));
};
/** Conference table (top view) — rounded table ringed by chairs (one per entry in `chairTypes`,
 *  only the chairs the customer actually selected) + centred caption. Top-row chairs face down
 *  toward the table, bottom-row face up. */
function drawConf(x: number, y: number, w: number, h: number, u: FurnUnit, key: string, chairTypes: ("headrest" | "backrest")[], ppf: number) {
  const cx = x + w / 2, cyc = y + h / 2;
  const chairS = Math.max(14, Math.min(1.4 * ppf, h * 0.62));
  const perSide = Math.max(1, Math.min(3, Math.round(w / (chairS * 1.5))));
  // Ring slots (top row faces DOWN, bottom row faces UP); fill only as many as selected.
  const slots: { cx: number; cy: number; side: "above" | "below" }[] = [];
  for (let i = 0; i < perSide; i++) slots.push({ cx: x + w * ((i + 0.5) / perSide), cy: y - chairS * 0.62, side: "above" });
  for (let i = 0; i < perSide; i++) slots.push({ cx: x + w * ((i + 0.5) / perSide), cy: y + h + chairS * 0.62, side: "below" });
  const seats = chairTypes.slice(0, slots.length).map((t, i) => (
    <FurnChair key={`c${i}`} cx={slots[i].cx} cy={slots[i].cy} s={chairS} type={t} side={slots[i].side} />
  ));
  return (
    <g key={key} transform={adjTransform(u, cx, cyc, ppf)}>
      {seats}
      <rect x={x} y={y} width={w} height={h} rx={Math.min(h / 2, 9)} fill={C.wood} stroke={C.woodEdge} strokeWidth={1.1} />
      <text x={cx} y={cyc - 1} textAnchor="middle" fontSize={6.8} fontWeight={700} fill={C.ink}>{u.label}</text>
      <text x={cx} y={cyc + 6.5} textAnchor="middle" fontSize={6.3} fill={C.ink}>{ftLabel(u.wFt)} X {ftLabel(u.dFt)}</text>
    </g>
  );
}

/** Lay out one room's furniture so it reads like a real seating plan:
 *   • Each work table sits on the wall the customer chose (upper / down / left / right) as a
 *     run of adjacent desks, with the chair on the ROOM side + clearance — staff can sit.
 *   • "Centre" tables form a back-to-back pod: two rows facing each other across a partition
 *     screen, with a divider between each person.
 *   • Cupboards hug a free wall from the right; conference tables sit centred with a chair
 *     ring; loose chairs fill the leftover centre.
 *  Runs wrap inward when a wall is full, and the left/right runs are inset past the
 *  top/bottom runs so nothing collides in the corners. */
function roomFurnitureNodes(
  units: FurnUnit[], x0: number, x1: number, yTop: number, yBot: number, ppf: number, wallGapPx: number,
  keepouts: KeepRect[], keyPrefix: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // `pad` = small margin from the perpendicular (corner) wall along a run. `wg` = the gap
  // from the wall the furniture sits AGAINST — 0 by default so tables & cupboards TOUCH the
  // wall; the customer can raise it (in feet) to add walking / servicing clearance behind them.
  const pad = 3, gap = 6;
  const wg = Math.max(0, wallGapPx);
  const dW = (u: FurnUnit) => u.wFt * ppf;  // table length (along the wall)
  const dD = (u: FurnUnit) => u.dFt * ppf;  // table depth (into the room)

  const cabinets = units.filter((u) => u.kind === "cabinet");
  // Chairs are drawn ONLY for the chairs the customer selected. Two pools by type so the plan
  // seats the RIGHT chair: HEADREST at manager/MD & conference desks (premium), BACKREST at
  // staff/workstation desks (standard). A desk takes its preferred type first, then falls back
  // to the other pool so a selected chair always appears; leftovers become loose chairs.
  let headrestPool = units.filter((u) => u.id === "chair-headrest").length;
  let backrestPool = units.filter((u) => u.id === "chair-backrest").length;
  const wantsHeadrest = (deskId: string) => deskId === "manager" || deskId === "manager-l" || deskId === "conference";
  const takeChairFor = (deskId: string): "headrest" | "backrest" | null => {
    const order: ("headrest" | "backrest")[] = wantsHeadrest(deskId) ? ["headrest", "backrest"] : ["backrest", "headrest"];
    for (const t of order) {
      if (t === "headrest" && headrestPool > 0) { headrestPool--; return "headrest"; }
      if (t === "backrest" && backrestPool > 0) { backrestPool--; return "backrest"; }
    }
    return null;
  };
  const groups: Record<string, FurnUnit[]> = { top: [], bottom: [], left: [], right: [], centre: [] };
  // Wall-placed conference tables are drawn as ordinary desks; centred ones get a chair ring.
  const confsCentre: FurnUnit[] = [];
  units.forEach((u) => {
    if (u.kind !== "desk" && u.kind !== "deskL" && u.kind !== "conf") return;
    const p = u.pos ?? (u.kind === "conf" ? "centre" : "top");
    if (u.kind === "conf" && p === "centre") { confsCentre.push(u); return; }
    (groups[p] ?? groups.top).push(u);
  });

  // Keep every piece INSIDE the container. Clamp a unit's manual rotate + feet-shift (adj) so
  // its TRUE, rotation-aware bounding box never spills past a wall. This also catches any base
  // auto-placement overflow (a rotated non-square table, or a run wider than a narrow room):
  // the derived shift pulls the piece back in. A piece bigger than the room is centred (best
  // effort). `w`/`h` are the piece's on-screen box (already oriented for its wall).
  const M = 1; // hairline inset so a border never sits on the wall line
  const clampUnit = (u: FurnUnit, x: number, y: number, w: number, h: number): FurnUnit => {
    const a = u.adj ?? { rot: 0, dx: 0, dy: 0 };
    const th = ((a.rot ?? 0) * Math.PI) / 180;
    const halfW = (Math.abs(w * Math.cos(th)) + Math.abs(h * Math.sin(th))) / 2;
    const halfH = (Math.abs(w * Math.sin(th)) + Math.abs(h * Math.cos(th))) / 2;
    const baseCx = x + w / 2, baseCy = y + h / 2;
    let cx = baseCx + (a.dx ?? 0) * ppf;
    let cy = baseCy + (a.dy ?? 0) * ppf;
    const loX = x0 + M + halfW, hiX = x1 - M - halfW;
    const loY = yTop + M + halfH, hiY = yBot - M - halfH;
    cx = hiX >= loX ? Math.min(Math.max(cx, loX), hiX) : (x0 + x1) / 2;
    cy = hiY >= loY ? Math.min(Math.max(cy, loY), hiY) : (yTop + yBot) / 2;
    // Keep the piece out of the entrance-door clear zone(s): a wall-run piece slides ALONG its
    // wall (from u.pos); a centre piece pushes off along the least-penetration axis.
    if (keepouts.length && hiX >= loX && hiY >= loY) {
      const along = u.pos === "top" || u.pos === "bottom" ? "x" : u.pos === "left" || u.pos === "right" ? "y" : undefined;
      ({ cx, cy } = avoidKeepouts(cx, cy, halfW, halfH, keepouts, loX, hiX, loY, hiY, along));
    }
    return { ...u, adj: { rot: a.rot ?? 0, dx: (cx - baseCx) / ppf, dy: (cy - baseCy) / ppf } };
  };

  /** Draw a table into a bounding box — L-shaped manager desks get their own polygon.
   *  `chairType` = the chair drawn at this desk (null = none). */
  const drawTable = (
    x: number, y: number, w: number, h: number, u: FurnUnit, key: string,
    side: "below" | "above" | "right" | "left", chairType: "headrest" | "backrest" | null,
  ) => {
    const uc = clampUnit(u, x, y, w, h);
    return uc.kind === "deskL" ? drawDeskLAt(x, y, w, h, uc, key, side, ppf, chairType) : drawDeskAt(x, y, w, h, uc, key, side, chairType, ppf);
  };

  // Vertical space a horizontal wall run consumes (deepest desk + its chair + clearance).
  const band = (list: FurnUnit[]) =>
    list.length ? Math.max(...list.map((u) => dD(u) + chairFor(dW(u), dD(u), ppf))) + CHAIR_GAP + gap : 0;
  const topBand = band(groups.top), bottomBand = band(groups.bottom);

  // --- horizontal wall runs (upper / down) ---
  const layH = (list: FurnUnit[], wall: "top" | "bottom") => {
    let cx = x0 + pad, row = 0;
    list.forEach((u, i) => {
      const w = dW(u), h = dD(u), cs = chairFor(w, h, ppf);
      if (cx + w > x1 - pad && cx > x0 + pad) { cx = x0 + pad; row++; }
      const off = row * (h + cs + CHAIR_GAP + gap);
      const y = wall === "top" ? yTop + wg + off : yBot - wg - h - off;
      nodes.push(drawTable(cx, y, w, h, u, `${keyPrefix}-${wall}${i}`, wall === "top" ? "below" : "above", takeChairFor(u.id)));
      cx += w + gap;
    });
  };
  layH(groups.top, "top");
  layH(groups.bottom, "bottom");

  // --- vertical wall runs (left / right), inset past the horizontal bands ---
  const vTop = yTop + wg + topBand, vBot = yBot - wg - bottomBand;
  const layV = (list: FurnUnit[], wall: "left" | "right") => {
    let cy = vTop, col = 0;
    list.forEach((u, i) => {
      const w = dD(u), h = dW(u), cs = chairFor(w, h, ppf);  // rotated against the side wall
      if (cy + h > vBot && cy > vTop) { cy = vTop; col++; }
      const off = col * (w + cs + CHAIR_GAP + gap);
      const x = wall === "left" ? x0 + wg + off : x1 - wg - w - off;
      nodes.push(drawTable(x, cy, w, h, u, `${keyPrefix}-${wall}${i}`, wall === "left" ? "right" : "left", takeChairFor(u.id)));
      cy += h + gap;
    });
  };
  layV(groups.left, "left");
  layV(groups.right, "right");

  // --- what's left in the middle, after the four wall runs ---
  const sideBand = (list: FurnUnit[]) =>
    list.length ? Math.max(...list.map((u) => dD(u) + chairFor(dD(u), dW(u), ppf))) + CHAIR_GAP + gap : 0;
  const cx0 = x0 + pad + sideBand(groups.left), cx1 = x1 - pad - sideBand(groups.right);
  let cursor = vTop;

  // Conference table(s): centred with a chair ring (headrest chairs preferred for meetings).
  confsCentre.forEach((u, i) => {
    const w = Math.min(dW(u), cx1 - cx0 - 8), h = dD(u);
    const cs = Math.min(h * 0.5, 11);
    cursor += cs + 2;
    const cxLeft = (cx0 + cx1) / 2 - w / 2;
    const ringTypes: ("headrest" | "backrest")[] = [];
    for (let j = 0; j < confCapacity(w, h); j++) { const t = takeChairFor("conference"); if (!t) break; ringTypes.push(t); }
    nodes.push(drawConf(cxLeft, cursor, w, h, clampUnit(u, cxLeft, cursor, w, h), `${keyPrefix}-conf${i}`, ringTypes, ppf));
    cursor += h + cs + 14;
  });

  // Centre pod — two rows back-to-back across a partition screen, staff facing each other.
  // Each desk keeps its OWN footprint, so a 5′×4′ L-desk can sit beside a workstation.
  if (groups.centre.length) {
    const list = groups.centre;
    const rowA = list.slice(0, Math.ceil(list.length / 2));
    const rowB = list.slice(Math.ceil(list.length / 2));
    const runW = (r: FurnUnit[]) => (r.length ? r.reduce((s, u) => s + dW(u) + gap, -gap) : 0);
    const rowW = Math.max(runW(rowA), runW(rowB));
    const depthA = rowA.length ? Math.max(...rowA.map(dD)) : 0;
    const depthB = rowB.length ? Math.max(...rowB.map(dD)) : 0;
    const cs = chairFor(dW(list[0]), dD(list[0]), ppf);
    const px = Math.max(cx0 + 2, (cx0 + cx1) / 2 - rowW / 2);
    const spine = Math.max(cursor + cs + depthA + CHAIR_GAP, (Math.max(cursor, vTop) + vBot) / 2);
    // upper row sits above the spine (chairs above); lower row below (chairs below)
    const bounds: number[] = [];
    let ax = px;
    rowA.forEach((u, i) => {
      const w = dW(u), h = dD(u);
      nodes.push(drawTable(ax, spine - h, w, h, u, `${keyPrefix}-cA${i}`, "above", takeChairFor(u.id)));
      ax += w; if (i < rowA.length - 1) bounds.push(ax + gap / 2);
      ax += gap;
    });
    let bx = px;
    rowB.forEach((u, i) => {
      const w = dW(u), h = dD(u);
      nodes.push(drawTable(bx, spine, w, h, u, `${keyPrefix}-cB${i}`, "below", takeChairFor(u.id)));
      bx += w + gap;
    });
    nodes.push(
      <g key={`${keyPrefix}-pod`}>
        {/* shared partition screen between the two facing rows */}
        <line x1={px} y1={spine} x2={px + rowW} y2={spine} stroke={C.steel} strokeWidth={2.4} />
        {/* a divider between each person along the row */}
        {bounds.map((dx, i) => (
          <line key={i} x1={dx} y1={spine - depthA} x2={dx} y2={spine + depthB} stroke={C.steel} strokeWidth={1.3} strokeOpacity={0.85} />
        ))}
        <text x={px + rowW / 2} y={spine - depthA - cs - 5} textAnchor="middle" fontSize={5.9} fontWeight={700} fill={C.steel}>
          PARTITION SCREEN
        </text>
      </g>,
    );
    cursor = spine + depthB + cs + 10;
  }

  // Cupboards / file cabinets: hug a wall that has no desk run, from the right.
  if (cabinets.length) {
    const onTop = groups.top.length === 0;
    let cxr = x1 - pad;
    cabinets.forEach((u, i) => {
      const w = dW(u), h = dD(u);
      cxr -= w;
      const y = onTop ? yTop + wg : yBot - wg - h;
      nodes.push(drawCabinet(cxr, y, w, h, clampUnit(u, cxr, y, w, h), `${keyPrefix}-cab${i}`, ppf));
      cxr -= gap;
    });
  }

  // Loose chairs — SELECTED chairs left over after seating every desk & conference, each drawn
  // as its real type (headrest / backrest) at the standard size.
  const looseTypes: ("headrest" | "backrest")[] = [
    ...Array.from({ length: headrestPool }, () => "headrest" as const),
    ...Array.from({ length: backrestPool }, () => "backrest" as const),
  ];
  if (looseTypes.length > 0) {
    const s = Math.max(16, Math.min(1.45 * ppf, 30));
    let cx = cx0 + 4;
    const y = Math.min(Math.max(cursor, vTop) + s / 2, vBot - s / 2);
    looseTypes.forEach((t, i) => {
      if (cx + s > cx1) { cx = cx0 + 4; }
      nodes.push(<FurnChair key={`${keyPrefix}-ch${i}`} cx={cx + s / 2} cy={y} s={s} type={t} side="below" />);
      cx += s + gap;
    });
  }

  return nodes;
}

/** 3-blade round ceiling fan symbol (a 12" cabin fan). */
function CeilingFan({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.fanEdge} strokeWidth={0.9} strokeOpacity={0.4} />
      {[0, 120, 240].map((a) => (
        <g key={a} transform={`rotate(${a} ${cx} ${cy})`}>
          <ellipse cx={cx} cy={cy - r * 0.52} rx={r * 0.28} ry={r * 0.5} fill={C.fan} stroke={C.fanEdge} strokeWidth={0.8} />
        </g>
      ))}
      <circle cx={cx} cy={cy} r={r * 0.22} fill={C.fanHub} stroke={C.fanEdge} strokeWidth={1} />
    </g>
  );
}

/** LED panel light — square (10.5") or round (4") per the chosen LED Panel Shape. */
function LedLight({ cx, cy, s, round }: { cx: number; cy: number; s: number; round?: boolean }) {
  if (round) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={s / 2} fill={C.light} stroke={C.lightEdge} strokeWidth={1} />
        <circle cx={cx} cy={cy} r={s / 2 - 2.4} fill="none" stroke={C.lightEdge} strokeWidth={0.7} strokeOpacity={0.7} />
      </g>
    );
  }
  return (
    <g>
      <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} rx={1.5} fill={C.light} stroke={C.lightEdge} strokeWidth={1} />
      <rect x={cx - s / 2 + 2.5} y={cy - s / 2 + 2.5} width={s - 5} height={s - 5} rx={1} fill="none" stroke={C.lightEdge} strokeWidth={0.7} strokeOpacity={0.7} />
    </g>
  );
}

/** Tube light — an elongated fluorescent batten (distinct from an LED panel). */
function TubeLight({ cx, cy, len }: { cx: number; cy: number; len: number }) {
  const h = 5;
  return (
    <g>
      <rect x={cx - len / 2} y={cy - h / 2} width={len} height={h} rx={h / 2} fill={C.light} stroke={C.lightEdge} strokeWidth={1} />
      <line x1={cx - len / 2 + 3} y1={cy} x2={cx + len / 2 - 3} y2={cy} stroke={C.lightEdge} strokeWidth={0.6} strokeOpacity={0.7} />
    </g>
  );
}

/** Power socket outlet (small rounded square with two holes). */
function Socket({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <rect x={cx - 6} y={cy - 6} width={12} height={12} rx={2} fill={C.socket} stroke={C.socketInk} strokeWidth={1} />
      <circle cx={cx - 2.4} cy={cy} r={1.1} fill={C.socketInk} />
      <circle cx={cx + 2.4} cy={cy} r={1.1} fill={C.socketInk} />
    </g>
  );
}

/** Steel plate-bar lifting hook with a hole (for the crane hook / shackle), welded at a
 *  cabin corner and protruding OUTWARD along `angle` (deg, 0 = +x / right). */
function LiftHook({ x, y, angle }: { x: number; y: number; angle: number }) {
  const len = 15, bw = 7;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <rect x={-1} y={-bw / 2} width={len} height={bw} rx={2} fill={C.steel} stroke="#222222" strokeWidth={0.9} />
      <circle cx={len - 4.5} cy={0} r={2.4} fill={C.paper} stroke="#222222" strokeWidth={1} />
    </g>
  );
}

/** Openable (casement) window symbol: the sash + its quarter-circle swing arc, opening INSIDE
 *  (into the room) or OUTSIDE. When it opens inside, a SAFETY GRILL (barred band) is drawn on
 *  the interior face; outside-opening needs no grill. `(ax,ay)` = hinge on the inner wall face,
 *  `(ux,uy)` = along-wall unit vector, `(ex,ey)` = OUTWARD (exterior) unit vector. */
function CasementWindow({ ax, ay, ux, uy, ex, ey, len, opening, keyBase }: {
  ax: number; ay: number; ux: number; uy: number; ex: number; ey: number;
  len: number; opening: WindowOpening; keyBase: string;
}) {
  const r = Math.min(len * 0.7, 40); // swing radius, capped so an outward swing stays on the paper
  const inX = opening === "inside" ? -ex : ex; // sash swings into the room (inside) or out
  const inY = opening === "inside" ? -ey : ey;
  const Cx = ax + ux * r, Cy = ay + uy * r;    // closed sash tip (in the wall plane)
  const Tx = ax + inX * r, Ty = ay + inY * r;  // open sash tip
  const cross = (Tx - ax) * (Cy - ay) - (Ty - ay) * (Cx - ax);
  const sweep = cross > 0 ? 1 : 0;
  const nodes: React.ReactNode[] = [
    <line key="leaf" x1={ax} y1={ay} x2={Tx} y2={Ty} stroke={C.winLine} strokeWidth={1.5} />,
    <path key="arc" d={`M ${Tx} ${Ty} A ${r} ${r} 0 0 ${sweep} ${Cx} ${Cy}`} fill="none" stroke={C.arc} strokeWidth={0.8} strokeDasharray="2.5 1.5" />,
  ];
  if (opening === "inside") {
    // Safety grill: vertical bars across the opening on the INTERIOR face.
    const gd = Math.min(len * 0.16, 8), ix = -ex, iy = -ey, bars = 4;
    for (let k = 0; k <= bars; k++) {
      const t = k / bars, bx = ax + ux * len * t, by = ay + uy * len * t;
      nodes.push(<line key={`g${k}`} x1={bx} y1={by} x2={bx + ix * gd} y2={by + iy * gd} stroke={C.socketInk} strokeWidth={0.7} />);
    }
    nodes.push(<line key="ge" x1={ax + ix * gd} y1={ay + iy * gd} x2={ax + ux * len + ix * gd} y2={ay + uy * len + iy * gd} stroke={C.socketInk} strokeWidth={0.8} />);
  }
  return <g key={keyBase}>{nodes}</g>;
}

/**
 * ModulePlan is a PURE RENDER by default — pass only `config` and it behaves exactly as it always
 * has (which is what keeps its three existing call sites working untouched). The optional props
 * below turn it into the Table module's editing surface (spec §10: "allow direct drag-and-drop
 * movement in the 2D plan").
 */
export interface ModulePlanProps {
  config: CabinConfig;
  /** Turns on table hit-testing + drag. */
  editable?: boolean;
  selectedTableId?: string | null;
  onSelectTable?: (id: string | null) => void;
  /** Ids of every object currently in conflict — those tables draw RED (spec §14). */
  conflictIds?: Set<string>;
  showTableDimensions?: boolean;
  /**
   * A drag moved the table's CENTRE to (xMm, yMm) in cabin millimetres. The caller clamps it into
   * the cabin, snaps it and writes it back — this component owns no state.
   * `commit` is false while the pointer is down (so the whole gesture coalesces into ONE undo entry)
   * and true on pointer-up.
   */
  onTableMove?: (id: string, xMm: number, yMm: number, commit: boolean) => void;
  /** Snap the dragged centre to this grid (mm). 0 / undefined = free movement. */
  snapMm?: number;
}

export function ModulePlan({
  config,
  editable = false,
  selectedTableId = null,
  onSelectTable,
  conflictIds,
  showTableDimensions = false,
  onTableMove,
  snapMm = 0,
}: ModulePlanProps) {
  const L = Math.max(1, config.length || 1);
  const W = Math.max(1, config.width || 1);
  const ppf = Math.min(Math.max(760 / L, 15), 34); // pixels per foot
  const planW = L * ppf, planH = W * ppf;
  const wallT = 9;
  // Doors open OUTWARD (to the exterior). Reserve enough margin on any wall that carries a
  // door so its outward swing arc + label are never clipped by the paper edge.
  const doorSides = new Set((config.doorPlacements ?? []).map((d) => d.side || "bottom"));
  // Reserve wall thickness + the full swing arc (≈ door width) + the two-line DOOR label.
  // The arc scales with the door, so the margin must be sized off the WIDEST door on the plan —
  // a 6 ft double-leaf door swings twice as far as a 3 ft one and would otherwise be clipped.
  const widestDoorFt = (config.doorPlacements ?? []).reduce(
    (m, d) => Math.max(m, doorSizeOf(d).widthFt), DOOR_SIZE.widthFt);
  const doorReach = Math.round(widestDoorFt * ppf) + wallT + 32;
  const mL = Math.max(92, doorSides.has("left") ? doorReach : 0);
  const mT = Math.max(74, doorSides.has("top") ? doorReach : 0);
  const mR = Math.max(52, doorSides.has("right") ? doorReach : 0);
  const mB = Math.max(70, doorSides.has("bottom") ? doorReach : 0);
  const ox = mL, oy = mT;               // inner room top-left
  const rx = ox + planW, by = oy + planH; // right / bottom inner edges
  const vbW = planW + mL + mR, vbH = planH + mT + mB;

  const e = config.electrical ?? {};
  const nFan = Math.min(Math.max(e.fan ?? 0, 0), 6);
  const nLedPanel = Math.min(e.led ?? 0, 10);
  const nTube = Math.min(e.tube ?? 0, 10);
  const ledRound = config.ledShape === "round";
  // Sizes and labels are resolved PER OPENING at the point of drawing (see the door/window loops).
  // They used to be hoisted here as one size + one label for the whole plan, which is why every
  // window was drawn and labelled identically no matter what was ordered.
  const trackLabel = findWindowTrack(config.windowTrackId ?? "2").label;
  const winLabelOf = (s: OpeningSize) => `${ftLabel(s.widthFt)} X ${ftLabel(s.heightFt)} · ${trackLabel}`;
  const doorLabelOf = (s: OpeningSize) => `${ftLabel(s.widthFt)} X ${ftLabel(s.heightFt)}`;
  // Plate-bar lifting hooks: 2 on a small cabin, 4 once the floor area exceeds 100 sq.ft.
  const nHooks = L * W > 100 ? 4 : 2;

  // Partition walls (multi-room) — cumulative x boundaries, if any.
  const rooms = Array.isArray(config.roomLengths) && config.roomLengths.length > 1 ? config.roomLengths : null;

  // Clear zone(s) in front of the main entrance door(s) — furniture, fixtures & the enclosed
  // washroom are all kept out of these so the entry stays accessible. A SLIDING partition door
  // adds its own keep-out (doorway + closed/parked leaf + travel path); hinged partitions add
  // none, so their existing layouts are unchanged.
  const doorKeeps = [
    ...doorKeepoutRects(config, ox, oy, rx, by, L, W, ppf),
    ...partitionSlideKeepoutRects(config, ox, oy, rx, by, L, W, ppf),
  ];

  // ---- dimension line helpers ----
  const arrow = (x: number, y: number, dir: "l" | "r" | "u" | "d") => arrowAt(x, y, dir, C.dim);

  /* ---- table drag (spec §10) ------------------------------------------------------------------
   *
   * The SVG is `viewBox` + `w-full h-auto`, so the browser scales it UNIFORMLY: one viewBox unit is
   * `vbW / rect.width` CSS pixels on both axes. Inverting the plan transform is therefore exact —
   * and it MUST be, because the numeric position fields, the wall-distance readouts and the
   * collision polygons are all derived from the value this produces. Getting it approximately right
   * would mean a table that drifts a few millimetres every time it is touched.
   *
   *   viewBox x = ox + xFt * ppf     ⇒     xFt = (viewBoxX - ox) / ppf     ⇒     xMm = xFt * 304.8
   *
   * The grab OFFSET (cursor → table centre) is captured on pointer-down, so a table dragged by its
   * corner does not jump its centre to the cursor. */
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ id: string; offXMm: number; offYMm: number } | null>(null);

  const pointerToMm = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    if (!r.width) return null;
    const k = vbW / r.width;                       // viewBox units per CSS pixel (uniform)
    const vx = (clientX - r.left) * k;
    const vy = (clientY - r.top) * k;
    return { xMm: ftToMm((vx - ox) / ppf), yMm: ftToMm((vy - oy) / ppf) };
  }, [vbW, ox, oy, ppf]);

  const snap = useCallback((v: number) => (snapMm > 0 ? Math.round(v / snapMm) * snapMm : v), [snapMm]);

  const onTableDragStart = useCallback(
    (id: string, e: React.PointerEvent) => {
      if (!editable || !onTableMove) return;
      const t = tablesOf(config).find((x) => x.id === id);
      if (!t || t.position.locked) return;         // a locked table does not move (spec §11)

      const p = pointerToMm(e.clientX, e.clientY);
      if (!p) return;
      dragRef.current = {
        id,
        offXMm: t.position.xMm - p.xMm,
        offYMm: t.position.yMm - p.yMm,
      };

      const target = e.currentTarget as Element;
      try { target.setPointerCapture(e.pointerId); } catch { /* not all pointers can be captured */ }

      const move = (ev: PointerEvent) => {
        const d = dragRef.current;
        const q = pointerToMm(ev.clientX, ev.clientY);
        if (!d || !q) return;
        onTableMove(d.id, snap(q.xMm + d.offXMm), snap(q.yMm + d.offYMm), false);
      };
      const up = (ev: PointerEvent) => {
        const d = dragRef.current;
        const q = pointerToMm(ev.clientX, ev.clientY);
        if (d && q) onTableMove(d.id, snap(q.xMm + d.offXMm), snap(q.yMm + d.offYMm), true);
        dragRef.current = null;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      // Listen on the WINDOW, not the node: a fast drag outruns the 20 px table and would otherwise
      // drop it the moment the cursor left the glyph.
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      e.preventDefault();
    },
    [editable, onTableMove, config, pointerToMm, snap],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border" style={{ background: C.paper }}>
      <svg ref={svgRef} viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-auto" role="img"
        onPointerDown={editable ? (e) => { if (e.target === e.currentTarget) onSelectTable?.(null); } : undefined}
        aria-label={`2D floor plan — ${ftLabel(L)} by ${ftLabel(W)} cabin`}>
        {/* ---- walls + room ---- */}
        <rect x={ox - wallT} y={oy - wallT} width={planW + wallT * 2} height={planH + wallT * 2} rx={2} fill={C.wall} />
        <rect x={ox} y={oy} width={planW} height={planH} fill={C.room} />

        {/* ---- partitions (multi-room): solid wall, or a wall with a door gap + swing arc
               when the customer turns "Partition Doors" on ---- */}
        {rooms && (() => {
          const total = rooms.reduce((a, b) => a + b, 0) || L;
          // The partition spans the cabin WIDTH; the door sits `partitionDoorOffset` ft from the
          // rear wall (near edge). ALL of the sliding geometry (opening, closed/parked leaf, travel
          // path, clamping to the blank partition) comes from the shared `slidingDoorModel`, so the
          // plan, the small floor plan, the furniture keep-out and the validation warnings agree.
          const model = slidingDoorModel(config);
          const pdw = model.doorWidthFt * ppf;
          const gTop = oy + model.opening.u0 * ppf, gBot = oy + model.opening.u1 * ppf;
          const hinge = config.partitionDoorHinge ?? "top";
          const swing = config.partitionDoorSwing ?? "right";
          const sliding = config.partitionDoorType === "sliding";
          const dir = swing === "right" ? 1 : -1; // +x = into the room on the right (hinged)
          // Sliding: the leaf hangs on ONE FACE of the partition and travels ALONG it. `face` is
          // the room it hangs in (+x = right room); `travel` is the way it slides open
          // (+y = toward the front wall). The two are independent — a leaf on the right face can
          // slide either rearward or frontward.
          const slideSide = model.side;
          const slideDir = model.direction;
          const face = model.faceSign;
          const travel = model.travelSign;
          // The leaf stands clear of the 4px wall stroke (px±2) so the panel reads as a panel
          // rather than merging into the partition line at plan scale.
          const faceOff = face * 6.5;
          // Where the leaf ends up when fully open. The model already clamped the parked span to
          // the blank partition available, so the parked leaf is never drawn through the exterior
          // wall when the door is positioned too close to that end (the UI warns about that case).
          const openEdge = travel < 0 ? gTop : gBot;         // the gap edge the leaf retracts past
          const parkEnd = oy + (travel < 0 ? model.parked.u0 : model.parked.u1) * ppf;
          const parkPx = Math.abs(parkEnd - openEdge);
          let acc = 0;
          return rooms.slice(0, -1).map((rl, i) => {
            acc += rl;
            const px = ox + planW * (acc / total);
            if (!config.partitionDoor) {
              return <line key={i} x1={px} y1={oy} x2={px} y2={by} stroke={C.wall} strokeWidth={4} />;
            }
            const wallSegs = (
              <>
                <line x1={px} y1={oy} x2={px} y2={gTop} stroke={C.wall} strokeWidth={4} />
                <line x1={px} y1={gBot} x2={px} y2={by} stroke={C.wall} strokeWidth={4} />
              </>
            );
            // A sliding partition door parks alongside the opening — no swing arc. Drawn as:
            // the doorway (dashed), the CLOSED leaf on its face (solid), the OPEN/parked leaf
            // (dashed ghost) over the blank partition it retracts onto, and a travel arrow +
            // note naming the direction. Arrowheads are literal <polygon>s (via `arrow`) — SVG
            // <marker> does not survive html2canvas' serialise-to-<img> path used by the PDF.
            if (sliding) {
              const lf = px + faceOff;                       // the leaf's line, on its chosen face
              const lx = px + face * 22;                     // direction note, clear of the leaf
              const lm = (gTop + gBot) / 2;
              return (
                <g key={i}>
                  {wallSegs}
                  {/* doorway */}
                  <line x1={px} y1={gTop} x2={px} y2={gBot} stroke={C.arc} strokeWidth={0.8} strokeDasharray="3 2" />
                  {/* track: spans the doorway + the run the leaf retracts onto */}
                  <line x1={lf} y1={Math.min(gTop, parkEnd)} x2={lf} y2={Math.max(gBot, parkEnd)}
                    stroke={C.slide} strokeWidth={0.7} />
                  {/* parked (open) leaf — ghosted over the blank partition it slides onto */}
                  {parkPx > 2 && (
                    <line x1={lf} y1={openEdge} x2={lf} y2={parkEnd}
                      stroke={C.slide} strokeWidth={2.6} strokeDasharray="4 2.5" opacity={0.6} />
                  )}
                  {/* closed leaf */}
                  <line x1={lf} y1={gTop} x2={lf} y2={gBot} stroke={C.door} strokeWidth={3.2} />
                  {/* travel arrow — which way the leaf slides to open */}
                  {parkPx > 8 && (
                    <>
                      <line x1={lf} y1={openEdge + travel * 3} x2={lf} y2={parkEnd - travel * 5}
                        stroke={C.slide} strokeWidth={1.1} />
                      {arrowAt(lf, parkEnd, travel < 0 ? "u" : "d", C.slide)}
                    </>
                  )}
                  {/* direction note, reading along the partition */}
                  <g transform={`rotate(-90 ${lx} ${lm})`}>
                    <rect x={lx - 52} y={lm - 12} width={104} height={17} fill={C.paper} opacity={0.85} />
                    <text x={lx} y={lm - 3.5} textAnchor="middle" fontSize={7} fontWeight={700} fill={C.ink}>
                      SLIDING DOOR {doorLabelOf(DOOR_SIZE)}
                    </text>
                    <text x={lx} y={lm + 4.5} textAnchor="middle" fontSize={6.6} fontWeight={700} fill={C.slide}>
                      SLIDES TO {slideDir === "rear" ? "REAR" : "FRONT"} · {slideSide === "left" ? "LEFT" : "RIGHT"} SIDE
                    </text>
                  </g>
                </g>
              );
            }
            // Hinged: leaf pivots at the chosen end and swings perpendicular into the chosen room.
            const hy = hinge === "top" ? gTop : gBot;  // hinge point on the partition
            const cy = hinge === "top" ? gBot : gTop;  // closed leaf tip (other end of the gap)
            const tipX = px + dir * pdw;               // open leaf tip
            const sweep = dir * (cy - hy) > 0 ? 1 : 0;
            return (
              <g key={i}>
                {wallSegs}
                <line x1={px} y1={hy} x2={tipX} y2={hy} stroke={C.door} strokeWidth={2} />
                <path d={`M ${tipX} ${hy} A ${pdw} ${pdw} 0 0 ${sweep} ${px} ${cy}`} fill="none" stroke={C.arc} strokeWidth={1} />
              </g>
            );
          });
        })()}

        {/* ---- top dimension line (length) ---- */}
        {(() => {
          const dy = oy - wallT - 42;
          return (
            <g>
              <line x1={ox - wallT} y1={oy - wallT - 6} x2={ox - wallT} y2={dy - 4} stroke={C.dim} strokeWidth={0.6} />
              <line x1={rx + wallT} y1={oy - wallT - 6} x2={rx + wallT} y2={dy - 4} stroke={C.dim} strokeWidth={0.6} />
              <line x1={ox - wallT} y1={dy} x2={rx + wallT} y2={dy} stroke={C.dim} strokeWidth={0.8} />
              {arrow(ox - wallT, dy, "l")}{arrow(rx + wallT, dy, "r")}
              <rect x={(ox + rx) / 2 - 30} y={dy - 9} width={60} height={13} fill={C.paper} />
              <text x={(ox + rx) / 2} y={dy + 1} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.ink}>{ftLabel(L)}</text>
            </g>
          );
        })()}

        {/* ---- left dimension line (width) ---- */}
        {(() => {
          const dx = ox - wallT - 48;
          return (
            <g>
              <line x1={ox - wallT - 6} y1={oy - wallT} x2={dx - 4} y2={oy - wallT} stroke={C.dim} strokeWidth={0.6} />
              <line x1={ox - wallT - 6} y1={by + wallT} x2={dx - 4} y2={by + wallT} stroke={C.dim} strokeWidth={0.6} />
              <line x1={dx} y1={oy - wallT} x2={dx} y2={by + wallT} stroke={C.dim} strokeWidth={0.8} />
              {arrow(dx, oy - wallT, "u")}{arrow(dx, by + wallT, "d")}
              <text x={dx} y={(oy + by) / 2} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.ink}
                transform={`rotate(-90 ${dx} ${(oy + by) / 2})`}>{ftLabel(W)}</text>
            </g>
          );
        })()}

        {/* Ceiling lights & fans are drawn AFTER the furniture (below) so they always stay
            visible on top of desks/tables — see the "ceiling (RCP)" block. */}

        {/* ---- furniture (per room), drawn to scale with dimensions ---- */}
        {(() => {
          // A toilet cabin is a self-contained washroom — never draw office furniture in its
          // plan, even if a stale add-on lingers from a previously-selected product.
          if (isToiletCabin(config.productId)) return null;
          const roomList = rooms ?? [L];
          const total = roomList.reduce((a, b) => a + b, 0) || L;
          const edges = [ox];
          let acc = 0;
          roomList.forEach((rl) => { acc += rl; edges.push(ox + planW * (acc / total)); });
          const out: React.ReactNode[] = [];
          // Customer's "gap from wall" (ft) → px, clamped to a sane max so furniture never
          // drifts off the plan. 0 = flush against the wall (default).
          const wallGapPx = Math.min(Math.max(config.furnitureWallGap ?? 0, 0), 3) * ppf;
          roomList.forEach((rl, ri) => {
            const units: FurnUnit[] = [];
            ROOM_FURNITURE_IDS.forEach((id) => {
              const spec = FURN_SPEC[id];
              const t = config.addons?.[id] || 0;
              if (!spec || !t) return;
              const per = furnitureRoomCounts(config, id, t, roomList.length);
              // Per-unit wall placement (work tables only). The placement array is indexed
              // globally across rooms, so offset by the units already used by earlier rooms.
              const places = TABLE_ADDON_IDS.includes(id) ? tablePlacementsOf(config, id, t) : null;
              // Per-unit manual rotation + feet-shift override (every drawn furniture item).
              const adjusts = furnitureAdjustOf(config, id, t);
              const offset = per.slice(0, ri).reduce((a, b) => a + b, 0);
              const cnt = Math.min(per[ri] || 0, PER_TYPE_CAP);
              for (let k = 0; k < cnt; k++) units.push({ id, ...spec, pos: places?.[offset + k], adj: adjusts[offset + k] });
            });
            if (units.length) out.push(...roomFurnitureNodes(units, edges[ri], edges[ri + 1], oy, by, ppf, wallGapPx, doorKeeps, `r${ri}`));
          });
          return out;
        })()}

        {/* ---- loose plumbing / pantry fixtures (wash basin, urinal, pantry) — each UNIT on its
               own chosen wall of its room, slid along it by its feet-offset (or auto-spread when
               left on "auto"), oriented against that wall & clamped inside the cabin. ---- */}
        {(() => {
          const roomList = rooms ?? [L];
          const totalLen = roomList.reduce((a, b) => a + b, 0) || L;
          const edges = [ox];
          let acc = 0;
          roomList.forEach((rl) => { acc += rl; edges.push(ox + planW * (acc / totalLen)); });
          const out: React.ReactNode[] = [];
          const gap = 8, pad = 5;
          roomList.forEach((rl, ri) => {
            const x0 = edges[ri], x1 = edges[ri + 1];
            // Running cursor per wall for units left on "auto" offset (so they don't stack).
            const autoCursor: Record<string, number> = { top: x0 + pad, bottom: x0 + pad, left: oy + pad, right: oy + pad };
            FIXTURE_ORDER.forEach((id) => {
              const spec = FIXTURE_SPEC[id];
              const t = config.addons?.[id] || 0;
              if (!spec || !t) return;
              const per = furnitureRoomCounts(config, id, t, roomList.length);
              const cnt = Math.min(per[ri] || 0, PER_TYPE_CAP);
              const before = per.slice(0, ri).reduce((a, b) => a + b, 0); // units used by earlier rooms
              const walls = fixtureUnitWallsOf(config, id, t);
              const offsets = fixtureUnitOffsetsOf(config, id, t);
              const alongFt = id === "pantry" ? fixtureSizeOf(config, id).wFt : spec.wFt;
              const depthFt = id === "pantry" ? PANTRY_DEPTH_FT : spec.dFt;
              for (let k = 0; k < cnt; k++) {
                const gi = before + k;                        // global unit index
                const wall = walls[gi] ?? "bottom";
                const horizontal = wall === "top" || wall === "bottom";
                const spanStart = horizontal ? x0 : oy, spanEnd = horizontal ? x1 : by;
                const along = Math.max(8, Math.min(alongFt * ppf, spanEnd - spanStart - 2 * pad));
                const depth = Math.min(depthFt * ppf, (horizontal ? by - oy : x1 - x0) * 0.5);
                const maxNear = Math.max(spanStart + pad, spanEnd - pad - along);
                let near: number;
                if (offsets[gi] >= 0) {
                  near = Math.min(Math.max(spanStart + pad + offsets[gi] * ppf, spanStart + pad), maxNear);
                } else {
                  near = Math.min(autoCursor[wall], maxNear);
                  autoCursor[wall] = near + along + gap;
                }
                const c = near + along / 2;                   // centre along the wall
                let scx: number, scy: number, rot: number;
                if (wall === "top")         { scx = c; scy = oy + depth / 2; rot = 0; }
                else if (wall === "bottom") { scx = c; scy = by - depth / 2; rot = 180; }
                else if (wall === "left")   { scx = x0 + depth / 2; scy = c; rot = 270; }
                else                        { scx = x1 - depth / 2; scy = c; rot = 90; }
                // Slide the fixture ALONG its wall to clear the entrance-door zone (perpendicular
                // stays fixed so it keeps its wall). On-screen half-extents swap for side walls.
                if (doorKeeps.length) {
                  const hw = horizontal ? along / 2 : depth / 2;
                  const hh = horizontal ? depth / 2 : along / 2;
                  ({ cx: scx, cy: scy } = avoidKeepouts(scx, scy, hw, hh, doorKeeps, x0 + hw, x1 - hw, oy + hh, by - hh, horizontal ? "x" : "y"));
                }
                const key = `fx-r${ri}-${id}-${k}`;
                out.push(
                  <g key={key} transform={`rotate(${rot} ${scx} ${scy})`}>
                    {drawFixture(scx - along / 2, scy - depth / 2, along, depth, { id, ...spec }, `${key}-g`, ppf)}
                  </g>,
                );
                if (horizontal) {
                  const ly = wall === "top" ? scy + depth / 2 + 7 : scy - depth / 2 - 4;
                  out.push(<text key={`${key}-l`} x={scx} y={ly} textAnchor="middle" fontSize={5.6} fontWeight={700} fill={C.ink}>{spec.label}</text>);
                }
              }
            });
          });
          return out;
        })()}

        {/* ---- PARAMETRIC TABLES (Table Customisation Module, spec §12) ----
               Drawn ABOVE the legacy add-on furniture and the loose fixtures, but BELOW the opaque
               enclosed-washroom boxes and the ceiling RCP — the same z-order a real plan uses, so a
               table can never be drawn over the washroom it is standing outside of.

               The layer is handed the plan's own (ox, oy, ppf), so a table's pixels and its
               collision polygons are produced from ONE transform (tableTransform), and the drawing
               cannot disagree with the BOQ that was taken off from the same geometry. */}
        <TableLayer
          tables={tablesOf(config)}
          ox={ox}
          oy={oy}
          ppf={ppf}
          selectedId={selectedTableId}
          conflictIds={conflictIds}
          showLabels
          showDimensions={showTableDimensions}
          editable={editable}
          onSelect={onSelectTable}
          onDragStart={onTableDragStart}
        />

        {/* ---- enclosed toilet / washroom — one partitioned box PER UNIT, each against its chosen
               wall at its feet-offset (auto-spread when left on "auto"), door swinging in/out.
               Drawn opaque so it reads over furniture. ---- */}
        {(() => {
          const roomList = rooms ?? [L];
          const totalLen = roomList.reduce((a, b) => a + b, 0) || L;
          const edges = [ox];
          let acc = 0;
          roomList.forEach((rl) => { acc += rl; edges.push(ox + planW * (acc / totalLen)); });
          const out: React.ReactNode[] = [];
          roomList.forEach((rl, ri) => {
            ENCLOSED_TOILET_IDS.forEach((id) => {
              const t = config.addons?.[id] || 0;
              if (!t) return;
              const per = furnitureRoomCounts(config, id, t, roomList.length);
              const cnt = Math.min(per[ri] || 0, PER_TYPE_CAP);
              if (!(cnt > 0)) return;
              const before = per.slice(0, ri).reduce((a, b) => a + b, 0);
              const { wFt, dFt } = fixtureSizeOf(config, id);
              const walls = fixtureUnitWallsOf(config, id, t);
              const offsets = fixtureUnitOffsetsOf(config, id, t);
              const swings = fixtureUnitSwingsOf(config, id, t);
              const ewcWalls = fixtureUnitEwcWallsOf(config, id, t);
              const ewcDists = fixtureUnitEwcDistsOf(config, id, t);
              for (let k = 0; k < cnt; k++) {
                const gi = before + k;
                // "auto" offset (<0): spread by the unit's index so multiples don't stack. Then
                // slide the box along its wall so it never blocks the main entrance door.
                const off0 = offsets[gi] >= 0 ? offsets[gi] : gi * (wFt + 0.5);
                const off = washroomAvoidedOffset(edges[ri], edges[ri + 1], oy, by, walls[gi] ?? "bottom", off0, wFt, dFt, ppf, doorKeeps);
                out.push(drawWashroom(
                  edges[ri], edges[ri + 1], oy, by,
                  walls[gi] ?? "bottom", off, wFt, dFt, swings[gi] ?? "in", id,
                  ppf, `wr-r${ri}-${id}-${k}`, fixtureSizeLabel(id, config),
                  ewcWalls[gi] ?? "auto", ewcDists[gi] ?? 0,
                ));
              }
            });
          });
          return out;
        })()}

        {/* ---- ceiling (RCP): LED panels (square/round) + tube lights — ON TOP of furniture.
               Each enclosed toilet partition gets ONE dedicated INTERNAL light (a small 4×4 /
               6×4 toilet needs only one); the main room grid skips the enclosures so they are
               never double-lit. ---- */}
        {(() => {
          const roomList = rooms ?? [L];
          const totalLen = roomList.reduce((a, b) => a + b, 0) || L;
          const edges = [ox];
          let acc = 0;
          roomList.forEach((rl) => { acc += rl; edges.push(ox + planW * (acc / totalLen)); });
          const s = Math.min(Math.max(ppf * 0.5, 11), 18);
          const out: React.ReactNode[] = [];

          // Enclosed-toilet rects (same geometry as the enclosure drawing) → one internal light
          // each, plus a test that keeps the main grid out of the enclosures.
          const trects: ReturnType<typeof washroomRect>[] = [];
          roomList.forEach((rl, ri) => {
            ENCLOSED_TOILET_IDS.forEach((id) => {
              const t = config.addons?.[id] || 0;
              if (!t) return;
              const per = furnitureRoomCounts(config, id, t, roomList.length);
              const cnt = Math.min(per[ri] || 0, PER_TYPE_CAP);
              if (!(cnt > 0)) return;
              const before = per.slice(0, ri).reduce((a, b) => a + b, 0);
              const { wFt, dFt } = fixtureSizeOf(config, id);
              const walls = fixtureUnitWallsOf(config, id, t);
              const offsets = fixtureUnitOffsetsOf(config, id, t);
              for (let k = 0; k < cnt; k++) {
                const gi = before + k;
                const off0 = offsets[gi] >= 0 ? offsets[gi] : gi * (wFt + 0.5);
                // Match the enclosure block's door-avoidance so the internal light tracks the box.
                const off = washroomAvoidedOffset(edges[ri], edges[ri + 1], oy, by, walls[gi] ?? "bottom", off0, wFt, dFt, ppf, doorKeeps);
                trects.push(washroomRect(edges[ri], edges[ri + 1], oy, by, walls[gi] ?? "bottom", off, wFt, dFt, ppf));
              }
            });
          });
          const inToilet = (px: number, py: number) =>
            trects.some((r) => px >= r.rx0 && px <= r.rx1 && py >= r.ry0 && py <= r.ry1);
          // One internal light centred in each toilet partition (sized to fit a small enclosure).
          trects.forEach((r, i) =>
            out.push(<LedLight key={`tw-led-${i}`} cx={r.cx} cy={r.cy} s={Math.max(9, Math.min(s, r.rw * 0.5, r.rh * 0.5))} round={ledRound} />));

          // Main-room grid — distributed per room, skipping any point inside an enclosure.
          const lights: ("led" | "tube")[] = [
            ...Array.from({ length: nLedPanel }, () => "led" as const),
            ...Array.from({ length: nTube }, () => "tube" as const),
          ];
          if (lights.length) {
            const share = allocateAcrossRooms(lights.length, roomList);
            let li = 0;
            roomList.forEach((_rl, ri) => {
              const cnt = share[ri];
              if (!cnt) return;
              const bx0 = edges[ri], bandW = (edges[ri + 1] ?? rx) - bx0;
              const rowsN = W >= 8 && cnt > 1 ? 2 : 1;
              const cols = Math.ceil(cnt / rowsN);
              for (let k = 0; k < cnt; k++) {
                const kind = lights[li++];
                const cy = rowsN === 1 ? oy + planH * 0.5 : oy + planH * (Math.floor(k / cols) === 0 ? 0.24 : 0.76);
                const cx = bx0 + bandW * (((k % cols) + 0.5) / cols);
                if (inToilet(cx, cy)) continue; // the enclosure has its own internal light
                out.push(kind === "tube"
                  ? <TubeLight key={`t-${ri}-${k}`} cx={cx} cy={cy} len={s * 2.2} />
                  : <LedLight key={`p-${ri}-${k}`} cx={cx} cy={cy} s={s} round={ledRound} />);
              }
            });
          }
          return out.length ? out : null;
        })()}

        {/* ---- ceiling fans (12" round, 3-blade) — PER ROOM on the room's centre line so a
               fan is never drawn on/over a partition wall. 1 room → identical to before. ---- */}
        {(() => {
          if (!nFan) return null;
          const roomList = rooms ?? [L];
          const totalLen = roomList.reduce((a, b) => a + b, 0) || L;
          const edges = [ox];
          let acc = 0;
          roomList.forEach((rl) => { acc += rl; edges.push(ox + planW * (acc / totalLen)); });
          const share = allocateAcrossRooms(nFan, roomList);
          const r = Math.min(Math.max(ppf * 0.55, 15), 26);
          const cy = oy + planH * 0.5;
          const out: React.ReactNode[] = [];
          roomList.forEach((_rl, ri) => {
            const cnt = share[ri];
            const bx0 = edges[ri], bandW = (edges[ri + 1] ?? rx) - bx0;
            for (let i = 0; i < cnt; i++) {
              const cx = bx0 + bandW * ((i + 0.5) / cnt);
              out.push(<CeilingFan key={`f-${ri}-${i}`} cx={cx} cy={cy} r={r} />);
            }
          });
          return out;
        })()}

        {/* ---- windows (side + distance-from-corner to the NEAR edge, same as doors) ---- */}
        {(config.windowPlacements ?? []).map((wp, i) => {
          const side = wp.side || "top";
          const horiz = side === "top" || side === "bottom";
          const spanFt = sideSpanFt(side, L, W);
          // In a top-down plan a window's along-wall extent is its WIDTH on every wall (the
          // height isn't visible). Clamped by the shared rule, so the plan matches the input.
          const wz = windowSizeOf(wp, config);            // THIS window's size
          const winLabel = winLabelOf(wz);
          const openFt = openingWidthOn(spanFt, wz.widthFt);
          const len = openFt * ppf;
          const startPx = clampOpeningOffset(wp.offset, spanFt, wz.widthFt) * ppf;
          // Window type drives what's drawn: sliding/uPVC → sliding-track channels; openable →
          // a casement sash + swing arc (+ safety grill when it opens inside); fixed → an X.
          const winType = config.windowTypeId ?? "upvc";
          const openable = isOpenableWindow(winType);
          const fixed = winType === "fixed";
          const opening: WindowOpening = config.windowOpening === "inside" ? "inside" : "outside";
          const trackFracs = openable || fixed ? [] : trackDividerFractions(config.windowTrackId ?? "2");
          const openNote = openable ? (opening === "inside" ? "OPENS IN · GRILL" : "OPENS OUT") : "";
          if (horiz) {
            const x0 = ox + startPx;
            const cx = x0 + len / 2;
            const wallInnerY = side === "top" ? oy : by;   // inner wall face
            const y0 = side === "top" ? oy - wallT - 2 : by - 2;
            const lblY = side === "top" ? oy - wallT - 20 : by + wallT + 14;
            const exY = side === "top" ? -1 : 1;            // outward (exterior) unit
            return (
              <g key={i}>
                <rect x={x0} y={y0} width={len} height={wallT + 4} fill={C.win} stroke={C.winLine} strokeWidth={0.8} />
                {trackFracs.map((f, k) => {
                  const yy = y0 + (wallT + 4) * f;
                  return <line key={k} x1={x0} y1={yy} x2={x0 + len} y2={yy} stroke={C.winLine} strokeWidth={0.7} />;
                })}
                {fixed && <>
                  <line x1={x0} y1={y0} x2={x0 + len} y2={y0 + wallT + 4} stroke={C.winLine} strokeWidth={0.7} />
                  <line x1={x0 + len} y1={y0} x2={x0} y2={y0 + wallT + 4} stroke={C.winLine} strokeWidth={0.7} />
                </>}
                {openable && <CasementWindow ax={x0} ay={wallInnerY} ux={1} uy={0} ex={0} ey={exY} len={len} opening={opening} keyBase={`cw${i}`} />}
                <text x={cx} y={lblY} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={C.ink}>WINDOW</text>
                <text x={cx} y={lblY + 8.5} textAnchor="middle" fontSize={7.5} fill={C.ink}>{winLabel}</text>
                {openNote && <text x={cx} y={lblY + (side === "top" ? -8.5 : 17)} textAnchor="middle" fontSize={6.6} fontWeight={700} fill={C.winLine}>{openNote}</text>}
              </g>
            );
          }
          const yTop = oy + startPx;
          const cy = yTop + len / 2;
          const wallInnerX = side === "left" ? ox : rx;    // inner wall face
          const x0 = side === "left" ? ox - wallT - 2 : rx - 2;
          const lblX = side === "left" ? ox - wallT - 8 : rx + wallT + 8;
          const exX = side === "left" ? -1 : 1;            // outward (exterior) unit
          return (
            <g key={i}>
              <rect x={x0} y={yTop} width={wallT + 4} height={len} fill={C.win} stroke={C.winLine} strokeWidth={0.8} />
              {trackFracs.map((f, k) => {
                const xx = x0 + (wallT + 4) * f;
                return <line key={k} x1={xx} y1={yTop} x2={xx} y2={yTop + len} stroke={C.winLine} strokeWidth={0.7} />;
              })}
              {fixed && <>
                <line x1={x0} y1={yTop} x2={x0 + wallT + 4} y2={yTop + len} stroke={C.winLine} strokeWidth={0.7} />
                <line x1={x0 + wallT + 4} y1={yTop} x2={x0} y2={yTop + len} stroke={C.winLine} strokeWidth={0.7} />
              </>}
              {openable && <CasementWindow ax={wallInnerX} ay={yTop} ux={0} uy={1} ex={exX} ey={0} len={len} opening={opening} keyBase={`cw${i}`} />}
              <text x={lblX} y={cy} textAnchor="middle" fontSize={7} fontWeight={700} fill={C.ink}
                transform={`rotate(-90 ${lblX} ${cy})`}>WINDOW {winLabel}{openNote ? ` · ${openNote}` : ""}</text>
            </g>
          );
        })}

        {/* ---- doors (leaf + quarter-circle swing arc, opening OUTWARD to the exterior) ---- */}
        {(config.doorPlacements ?? []).map((d, i) => {
          const side = d.side || "bottom";
          const horiz = side === "top" || side === "bottom";
          // offset (ft from the near corner: left for top/bottom, top for left/right) is the
          // door's NEAR edge; the opening then spans dw INTO the wall. The shared helpers
          // clamp it to exactly the range the offset input allows, so plan == input.
          const spanFt = sideSpanFt(side, L, W);
          // THIS door's size. `dw` is the opening width AND the swing-arc radius AND the open-leaf
          // length, so a per-door width flows into all three at once — the arc grows with the door.
          const dz = doorSizeOf(d);
          const doorLabel = doorLabelOf(dz);
          const dw = openingWidthOn(spanFt, dz.widthFt) * ppf;
          const startPx = clampOpeningOffset(d.offset, spanFt, dz.widthFt) * ppf;
          // The customer picks which edge is hinged (hand) and which way the leaf swings (swing).
          const hand = d.hand ?? "left";
          const swing = d.swing ?? "out";
          // Along-wall unit vector (in the +offset direction) and the OUTWARD (exterior) normal.
          const alongU: [number, number] = horiz ? [1, 0] : [0, 1];
          const outU: [number, number] = horiz
            ? [0, side === "top" ? -1 : 1]
            : [side === "left" ? -1 : 1, 0];
          // "out" swings to the exterior; "in" flips the leaf into the room.
          const into: [number, number] = swing === "out" ? outU : [-outU[0], -outU[1]];
          // The opening runs openStart → openEnd along the wall; `hand` picks the hinged edge.
          const wallY = side === "top" ? oy : by;
          const wallX = side === "left" ? ox : rx;
          const openStart: [number, number] = horiz ? [ox + startPx, wallY] : [wallX, oy + startPx];
          const openEnd: [number, number] = [openStart[0] + alongU[0] * dw, openStart[1] + alongU[1] * dw];
          const H: [number, number] = hand === "left" ? openStart : openEnd;   // hinge
          const Cc: [number, number] = hand === "left" ? openEnd : openStart;  // closed leaf tip
          const T: [number, number] = [H[0] + into[0] * dw, H[1] + into[1] * dw]; // open leaf tip
          const cross = (T[0] - H[0]) * (Cc[1] - H[1]) - (T[1] - H[1]) * (Cc[0] - H[0]);
          const sweep = cross > 0 ? 1 : 0;
          const gap = horiz
            ? <rect x={Math.min(H[0], Cc[0])} y={(side === "top" ? oy - wallT : by) - 0.5} width={dw} height={wallT + 1} fill={C.room} />
            : <rect x={(side === "left" ? ox - wallT : rx) - 0.5} y={Math.min(H[1], Cc[1])} width={wallT + 1} height={dw} fill={C.room} />;
          const lblY1 = side === "top" ? oy - wallT - dw - 16 : by + wallT + dw + 12;
          const lx = side === "left" ? ox - wallT - dw - 6 : rx + wallT + dw + 6;
          const cxm = (H[0] + Cc[0]) / 2, cym = (H[1] + Cc[1]) / 2;
          return (
            <g key={i}>
              {gap}
              <path d={`M ${T[0]} ${T[1]} A ${dw} ${dw} 0 0 ${sweep} ${Cc[0]} ${Cc[1]}`} fill="none" stroke={C.arc} strokeWidth={0.9} />
              <line x1={H[0]} y1={H[1]} x2={T[0]} y2={T[1]} stroke={C.door} strokeWidth={2} />
              {horiz ? (
                <>
                  <text x={cxm} y={lblY1} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={C.ink}>DOOR</text>
                  <text x={cxm} y={lblY1 + 8.5} textAnchor="middle" fontSize={7.5} fill={C.ink}>{doorLabel}</text>
                </>
              ) : (
                <text x={lx} y={cym} textAnchor="middle" fontSize={7} fontWeight={700} fill={C.ink}
                  transform={`rotate(-90 ${lx} ${cym})`}>DOOR {doorLabel}</text>
              )}
            </g>
          );
        })}

        {/* ---- electrical sockets: ROOM-WISE. Each room's plug points sit on its own chosen
               walls, INSIDE that room's band, at the customer's left/right position (spec-only).
               One marker = one Plug Point (= 2 sockets + 2 switches). ---- */}
        {(() => {
          const plan = plugPlanFor(config);           // exactly roomCount lists of PlugGroups
          const roomList = rooms ?? [L];
          const totalLen = roomList.reduce((a, b) => a + b, 0) || L;
          const edges = [ox];
          let acc = 0;
          roomList.forEach((rl) => { acc += rl; edges.push(ox + planW * (acc / totalLen)); });
          const ins = 12, marker = 12, minStep = marker + 3; // Socket glyph is 12px wide
          const out: React.ReactNode[] = [];
          plan.forEach((groups, ri) => {
            const x0 = edges[ri] ?? ox;
            const x1 = edges[ri + 1] ?? rx;
            groups.forEach((g, gi) => {
              const horizontal = g.wall === "top" || g.wall === "bottom";
              const axisLen = horizontal ? x1 - x0 : planH;   // wall length within this room
              const n = Math.max(1, Math.min(g.plugCount, 24)); // sane cap per wall group
              // Spread step, shrunk so the whole run stays inside the wall (never spills out).
              const step = n > 1 ? Math.min(minStep, Math.max(0, axisLen - 2 * ins - marker) / (n - 1)) : 0;
              const run = step * (n - 1);
              // Centre the run at pos (0..1) along the wall, clamped so it can't cross a corner.
              const lo = ins + marker / 2 + run / 2;
              const hi = axisLen - ins - marker / 2 - run / 2;
              const centre = hi >= lo ? Math.min(Math.max(axisLen * g.pos, lo), hi) : axisLen / 2;
              for (let k = 0; k < n; k++) {
                const along = centre - run / 2 + k * step;
                let x: number, y: number;
                if (g.wall === "top")         { x = x0 + along; y = oy + ins; }
                else if (g.wall === "bottom") { x = x0 + along; y = by - ins; }
                else if (g.wall === "left")   { x = x0 + ins;   y = oy + along; }
                else                          { x = x1 - ins;   y = oy + along; } // right wall of this room
                out.push(<Socket key={`s-${ri}-${gi}-${k}`} cx={x} cy={y} />);
              }
            });
          });
          return out;
        })()}

        {/* ---- external / entrance light — a bulkhead light OUTSIDE the entrance wall, slid
               along it by the customer's feet-distance ---- */}
        {config.electrical?.["ext-light"] ? (() => {
          const side = config.doorPlacements?.[0]?.side || "bottom";
          const horizontal = side === "top" || side === "bottom";
          const off = externalLightOffsetOf(config) * ppf;
          const m = 15;                                   // distance outside the wall
          const alongH = ox + Math.min(Math.max(off, 8), planW - 8);
          const alongV = oy + Math.min(Math.max(off, 8), planH - 8);
          let lx: number, ly: number, wx: number, wy: number;
          if (side === "top")         { lx = alongH; ly = oy - wallT - m; wx = alongH; wy = oy - wallT; }
          else if (side === "left")   { lx = ox - wallT - m; ly = alongV; wx = ox - wallT; wy = alongV; }
          else if (side === "right")  { lx = rx + wallT + m; ly = alongV; wx = rx + wallT; wy = alongV; }
          else                        { lx = alongH; ly = by + wallT + m; wx = alongH; wy = by + wallT; } // bottom
          const r = 5;
          const lblY = side === "top" ? ly - r - 4 : ly + r + 8;
          return (
            <g>
              {/* bracket from the wall to the light */}
              <line x1={wx} y1={wy} x2={lx} y2={ly} stroke={C.steel} strokeWidth={1} />
              {/* light glow rays */}
              {[0, 45, 90, 135].map((a) => {
                const rad = (a * Math.PI) / 180;
                return <line key={a} x1={lx - Math.cos(rad) * (r + 1.5)} y1={ly - Math.sin(rad) * (r + 1.5)} x2={lx + Math.cos(rad) * (r + 3.5)} y2={ly + Math.sin(rad) * (r + 3.5)} stroke={C.lightEdge} strokeWidth={0.6} />;
              })}
              <circle cx={lx} cy={ly} r={r} fill={C.light} stroke={C.lightEdge} strokeWidth={1} />
              <text x={lx} y={lblY} textAnchor="middle" fontSize={5.4} fontWeight={700} fill={C.ink}>EXT. LIGHT</text>
            </g>
          );
        })() : null}

        {/* ---- plate-bar lifting hooks (with hole) for lift & shift ---- */}
        {(() => {
          const hooks = nHooks === 4
            ? [{ x: ox - wallT, y: oy - wallT, a: 225 }, { x: rx + wallT, y: oy - wallT, a: 315 },
               { x: ox - wallT, y: by + wallT, a: 135 }, { x: rx + wallT, y: by + wallT, a: 45 }]
            : [{ x: ox - wallT, y: oy - wallT, a: 225 }, { x: rx + wallT, y: by + wallT, a: 45 }];
          return hooks.map((h, i) => <LiftHook key={i} x={h.x} y={h.y} angle={h.a} />);
        })()}
      </svg>
      {config.electrical?.plug ? (
        <p className="px-3 py-1.5 text-center text-[10px] font-medium" style={{ color: C.socketInk }}>
          Plug points: {config.electrical.plug} (= {config.electrical.plug * 2} sockets + {config.electrical.plug * 2} switches) — placed room-wise
        </p>
      ) : null}
      {/* The corner lifting hooks are still DRAWN on the plan (see the LiftHook block above);
          the descriptive caption is intentionally omitted from the public 2D plan. */}
    </div>
  );
}
