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

import {
  DOOR_SIZE, TABLE_SIZE, ROOM_FURNITURE_IDS, furnitureRoomCounts, TABLE_ADDON_IDS, tablePlacementsOf,
  furnitureAdjustOf, type FurnitureAdjust, plugPlanFor,
  MANAGER_TABLE_SIZE, MANAGER_L_SIZE, findWindowTrack, isToiletCabin,
  isOpenableWindow, type WindowOpening,
  ENCLOSED_TOILET_IDS, PANTRY_DEPTH_FT,
  fixtureSizeOf, fixturePlacementOf, fixtureDoorSideOf, fixtureSizeLabel,
  sideSpanFt, openingWidthOn, clampOpeningOffset, type CabinConfig,
} from "./pricing";

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

// Palette (fixed, paper-style — matches an architectural print).
const C = {
  paper: "#fbfaf6", wall: "#333333", room: "#e9ddc4",
  win: "#a8c8e0", winLine: "#5a86ab",
  door: "#333333", arc: "#7a7a7a",
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
    glyph = (
      <>
        <rect x={x} y={y} width={w} height={h} rx={2} fill={PORCELAIN} stroke={C.socketInk} strokeWidth={0.8} />
        <ellipse cx={cx} cy={cy + h * 0.06} rx={w * 0.32} ry={h * 0.28} fill="#ffffff" stroke={C.socketInk} strokeWidth={0.7} />
        <circle cx={cx} cy={y + h * 0.18} r={0.9} fill={C.socketInk} />
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

/** Enclosed toilet / washroom — a partitioned sub-room in a corner of its room band. Two sides
 *  are the cabin/partition walls of that corner; the other two are NEW partition walls, one of
 *  which carries the door (gap + swing arc). kind "toilet-wc" = WC only; "toilet-washroom" adds a
 *  bath + basin. Drawn opaque so it reads clearly over any auto-laid furniture. */
function drawWashroom(
  bx0: number, bx1: number, roomTop: number, roomBot: number,
  corner: string, wFt: number, dFt: number, doorSide: string, kind: string,
  ppf: number, key: string, sizeLbl: string,
) {
  const bandW = bx1 - bx0, bandH = roomBot - roomTop;
  const w = Math.min(Math.max(wFt * ppf, 26), bandW - 2);
  const d = Math.min(Math.max(dFt * ppf, 26), bandH - 2);
  const left = corner.includes("left");
  const rear = corner.includes("rear");
  const rx0 = left ? bx0 : bx1 - w;
  const ry0 = rear ? roomTop : roomBot - d;
  const rx1 = rx0 + w, ry1 = ry0 + d;
  const cx = (rx0 + rx1) / 2, cy = (ry0 + ry1) / 2;
  const wt = 3.5;                          // partition thickness
  const vX = left ? rx1 : rx0;             // interior vertical face (away from the corner)
  const hY = rear ? ry1 : ry0;             // interior horizontal face (away from the corner)
  const doorOnH = doorSide === "length";   // door on the horizontal interior face
  const faceLen = doorOnH ? w : d;
  const gap = Math.max(10, Math.min(DOOR_SIZE.widthFt * ppf, faceLen * 0.6));
  const intoY = rear ? 1 : -1;             // +y points into the room from a rear washroom
  const intoX = left ? 1 : -1;             // +x points into the room from a left washroom

  const walls: React.ReactNode[] = [];
  // horizontal interior wall (y = hY)
  if (doorOnH) {
    const gs = cx - gap / 2, ge = cx + gap / 2;
    walls.push(<line key="hw1" x1={rx0} y1={hY} x2={gs} y2={hY} stroke={C.wall} strokeWidth={wt} />);
    walls.push(<line key="hw2" x1={ge} y1={hY} x2={rx1} y2={hY} stroke={C.wall} strokeWidth={wt} />);
    walls.push(<line key="hd" x1={gs} y1={hY} x2={gs} y2={hY + intoY * gap} stroke={C.door} strokeWidth={2} />);
    walls.push(<path key="ha" d={`M ${gs} ${hY + intoY * gap} A ${gap} ${gap} 0 0 ${intoY > 0 ? 1 : 0} ${ge} ${hY}`} fill="none" stroke={C.arc} strokeWidth={0.9} />);
  } else {
    walls.push(<line key="hw" x1={rx0} y1={hY} x2={rx1} y2={hY} stroke={C.wall} strokeWidth={wt} />);
  }
  // vertical interior wall (x = vX)
  if (!doorOnH) {
    const gs = cy - gap / 2, ge = cy + gap / 2;
    walls.push(<line key="vw1" x1={vX} y1={ry0} x2={vX} y2={gs} stroke={C.wall} strokeWidth={wt} />);
    walls.push(<line key="vw2" x1={vX} y1={ge} x2={vX} y2={ry1} stroke={C.wall} strokeWidth={wt} />);
    walls.push(<line key="vd" x1={vX} y1={gs} x2={vX + intoX * gap} y2={gs} stroke={C.door} strokeWidth={2} />);
    walls.push(<path key="va" d={`M ${vX + intoX * gap} ${gs} A ${gap} ${gap} 0 0 ${intoX > 0 ? 0 : 1} ${vX} ${ge}`} fill="none" stroke={C.arc} strokeWidth={0.9} />);
  } else {
    walls.push(<line key="vw" x1={vX} y1={ry0} x2={vX} y2={ry1} stroke={C.wall} strokeWidth={wt} />);
  }

  // fixtures inside — WC in the true corner; washroom adds a bath strip + a basin.
  const inner: React.ReactNode[] = [];
  const bw = Math.min(w * 0.42, 16), bh = Math.min(d * 0.5, 20);
  const wcx = left ? rx0 + 3 : rx1 - 3 - bw;
  const wcy = rear ? ry0 + 3 : ry1 - 3 - bh;
  inner.push(
    <g key="wc">
      <rect x={wcx} y={wcy} width={bw} height={bh * 0.28} rx={1.2} fill={PORCELAIN} stroke={C.socketInk} strokeWidth={0.7} />
      <ellipse cx={wcx + bw / 2} cy={wcy + bh * 0.62} rx={bw * 0.4} ry={bh * 0.34} fill={PORCELAIN} stroke={C.socketInk} strokeWidth={0.8} />
    </g>,
  );
  if (kind === "toilet-washroom") {
    const bathW = Math.max(14, w - 8), bathH = Math.min(d * 0.3, 13);
    const bxr = rx0 + (w - bathW) / 2;
    const byr = rear ? ry1 - 4 - bathH : ry0 + 4;
    inner.push(<rect key="bath" x={bxr} y={byr} width={bathW} height={bathH} rx={3} fill="#dbe7ec" stroke={C.socketInk} strokeWidth={0.7} />);
    inner.push(<circle key="bathd" cx={left ? bxr + 4 : bxr + bathW - 4} cy={byr + bathH / 2} r={1} fill={C.socketInk} />);
    const bs = Math.min(w * 0.24, 12);
    const nbx = left ? rx1 - 4 - bs : rx0 + 4;
    const nby = rear ? ry0 + 4 : ry1 - 4 - bs;
    inner.push(
      <g key="basin">
        <rect x={nbx} y={nby} width={bs} height={bs * 0.8} rx={2} fill={PORCELAIN} stroke={C.socketInk} strokeWidth={0.6} />
        <ellipse cx={nbx + bs / 2} cy={nby + bs * 0.44} rx={bs * 0.3} ry={bs * 0.24} fill="#fff" stroke={C.socketInk} strokeWidth={0.5} />
      </g>,
    );
  }

  return (
    <g key={key}>
      <rect x={rx0} y={ry0} width={w} height={d} fill="#e7edf0" stroke="none" />
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
  units: FurnUnit[], x0: number, x1: number, yTop: number, yBot: number, ppf: number, wallGapPx: number, keyPrefix: string,
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

export function ModulePlan({ config }: { config: CabinConfig }) {
  const L = Math.max(1, config.length || 1);
  const W = Math.max(1, config.width || 1);
  const ppf = Math.min(Math.max(760 / L, 15), 34); // pixels per foot
  const planW = L * ppf, planH = W * ppf;
  const wallT = 9;
  // Doors open OUTWARD (to the exterior). Reserve enough margin on any wall that carries a
  // door so its outward swing arc + label are never clipped by the paper edge.
  const doorSides = new Set((config.doorPlacements ?? []).map((d) => d.side || "bottom"));
  // Reserve wall thickness + the full swing arc (≈ door width) + the two-line DOOR label.
  const doorReach = Math.round(DOOR_SIZE.widthFt * ppf) + wallT + 32;
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
  const winW = config.windowWidthFt ?? 3, winH = config.windowHeightFt ?? 3;
  // Label shows the exact chosen size AND track, e.g. 3'-0" X 5'-0" · 2 Track.
  const winLabel = `${ftLabel(winW)} X ${ftLabel(winH)} · ${findWindowTrack(config.windowTrackId ?? "2").label}`;
  const doorLabel = `${ftLabel(DOOR_SIZE.widthFt)} X ${ftLabel(DOOR_SIZE.heightFt)}`;
  // Plate-bar lifting hooks: 2 on a small cabin, 4 once the floor area exceeds 100 sq.ft.
  const nHooks = L * W > 100 ? 4 : 2;

  // Partition walls (multi-room) — cumulative x boundaries, if any.
  const rooms = Array.isArray(config.roomLengths) && config.roomLengths.length > 1 ? config.roomLengths : null;

  // ---- dimension line helpers ----
  const arrow = (x: number, y: number, dir: "l" | "r" | "u" | "d") => {
    const p = dir === "l" ? `${x},${y} ${x + 5},${y - 3} ${x + 5},${y + 3}`
      : dir === "r" ? `${x},${y} ${x - 5},${y - 3} ${x - 5},${y + 3}`
      : dir === "u" ? `${x},${y} ${x - 3},${y + 5} ${x + 3},${y + 5}`
      : `${x},${y} ${x - 3},${y - 5} ${x + 3},${y - 5}`;
    return <polygon points={p} fill={C.dim} />;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border" style={{ background: C.paper }}>
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-auto" role="img"
        aria-label={`2D floor plan — ${ftLabel(L)} by ${ftLabel(W)} cabin`}>
        {/* ---- walls + room ---- */}
        <rect x={ox - wallT} y={oy - wallT} width={planW + wallT * 2} height={planH + wallT * 2} rx={2} fill={C.wall} />
        <rect x={ox} y={oy} width={planW} height={planH} fill={C.room} />

        {/* ---- partitions (multi-room): solid wall, or a wall with a door gap + swing arc
               when the customer turns "Partition Doors" on ---- */}
        {rooms && (() => {
          const total = rooms.reduce((a, b) => a + b, 0) || L;
          // The partition spans the cabin WIDTH; the door sits `partitionDoorOffset` ft from the
          // rear wall (near edge), hinged at the rear/front end, swinging into the left/right room.
          const pdw = openingWidthOn(W, DOOR_SIZE.widthFt) * ppf;
          const startPx = clampOpeningOffset(config.partitionDoorOffset, W, DOOR_SIZE.widthFt) * ppf;
          const gTop = oy + startPx, gBot = gTop + pdw;
          const hinge = config.partitionDoorHinge ?? "top";
          const swing = config.partitionDoorSwing ?? "right";
          const sliding = config.partitionDoorType === "sliding";
          const dir = swing === "right" ? 1 : -1; // +x = into the room on the right
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
            // A sliding partition door parks alongside the opening — no swing arc.
            if (sliding) {
              return (
                <g key={i}>
                  {wallSegs}
                  <line x1={px} y1={gTop} x2={px} y2={gBot} stroke={C.arc} strokeWidth={0.8} strokeDasharray="3 2" />
                  <line x1={px + dir * 2.5} y1={gTop} x2={px + dir * 2.5} y2={gBot} stroke={C.door} strokeWidth={2.4} />
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
            if (units.length) out.push(...roomFurnitureNodes(units, edges[ri], edges[ri + 1], oy, by, ppf, wallGapPx, `r${ri}`));
          });
          return out;
        })()}

        {/* ---- loose plumbing / pantry fixtures (wash basin, urinal, pantry) — placed on each
               fixture's CHOSEN wall of its room, oriented against that wall and clamped INSIDE the
               cabin (fixes the pantry-outside bug). The enclosed toilet/washroom draw separately. ---- */}
        {(() => {
          const roomList = rooms ?? [L];
          const totalLen = roomList.reduce((a, b) => a + b, 0) || L;
          const edges = [ox];
          let acc = 0;
          roomList.forEach((rl) => { acc += rl; edges.push(ox + planW * (acc / totalLen)); });
          const out: React.ReactNode[] = [];
          const gap = 8, pad = 5;
          type FxU = { id: string; spec: (typeof FIXTURE_SPEC)[string]; alongFt: number; depthFt: number; key: string };
          roomList.forEach((rl, ri) => {
            const x0 = edges[ri], x1 = edges[ri + 1];
            const byWall: Record<string, FxU[]> = { top: [], bottom: [], left: [], right: [] };
            FIXTURE_ORDER.forEach((id) => {
              const spec = FIXTURE_SPEC[id];
              const t = config.addons?.[id] || 0;
              if (!spec || !t) return;
              const per = furnitureRoomCounts(config, id, t, roomList.length);
              const cnt = Math.min(per[ri] || 0, PER_TYPE_CAP);
              const wall = fixturePlacementOf(config, id);
              const alongFt = id === "pantry" ? fixtureSizeOf(config, id).wFt : spec.wFt;
              const depthFt = id === "pantry" ? PANTRY_DEPTH_FT : spec.dFt;
              for (let k = 0; k < cnt; k++) (byWall[wall] ?? byWall.bottom).push({ id, spec, alongFt, depthFt, key: `fx-r${ri}-${id}-${k}` });
            });
            (["top", "bottom", "left", "right"] as const).forEach((wall) => {
              const list = byWall[wall];
              if (!list.length) return;
              const horizontal = wall === "top" || wall === "bottom";
              const axisPx = (horizontal ? x1 - x0 : by - oy) - 2 * pad;   // room to spread along the wall
              const crossPx = horizontal ? by - oy : x1 - x0;             // depth available into the room
              const gaps = (list.length - 1) * gap;
              const wantAlong = list.reduce((s, u) => s + u.alongFt * ppf, 0);
              const scale = wantAlong + gaps > axisPx ? Math.max(0.35, (axisPx - gaps) / Math.max(1, wantAlong)) : 1;
              let cursor = (horizontal ? x0 : oy) + pad;
              list.forEach((u) => {
                const along = Math.max(8, u.alongFt * ppf * scale);
                const depth = Math.min(u.depthFt * ppf, crossPx * 0.5);
                const c = cursor + along / 2;                             // centre along the wall
                let scx: number, scy: number, rot: number;
                if (wall === "top")         { scx = c; scy = oy + depth / 2; rot = 0; }
                else if (wall === "bottom") { scx = c; scy = by - depth / 2; rot = 180; }
                else if (wall === "left")   { scx = x0 + depth / 2; scy = c; rot = 270; }
                else                        { scx = x1 - depth / 2; scy = c; rot = 90; }
                out.push(
                  <g key={u.key} transform={`rotate(${rot} ${scx} ${scy})`}>
                    {drawFixture(scx - along / 2, scy - depth / 2, along, depth, { id: u.id, ...u.spec }, `${u.key}-g`, ppf)}
                  </g>,
                );
                // Label unrotated on the room-interior side (only for horizontal walls, to avoid sideways text).
                if (horizontal) {
                  const ly = wall === "top" ? scy + depth / 2 + 7 : scy - depth / 2 - 4;
                  out.push(<text key={`${u.key}-l`} x={scx} y={ly} textAnchor="middle" fontSize={5.6} fontWeight={700} fill={C.ink}>{u.spec.label}</text>);
                }
                cursor += along + gap;
              });
            });
          });
          return out;
        })()}

        {/* ---- enclosed toilet / washroom — a partitioned corner sub-room per room (opaque, so it
               reads over furniture). One enclosure per (id, room); qty>1 in a room draws once. ---- */}
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
              if (!(per[ri] > 0)) return;
              const { wFt, dFt } = fixtureSizeOf(config, id);
              out.push(drawWashroom(
                edges[ri], edges[ri + 1], oy, by,
                fixturePlacementOf(config, id), wFt, dFt, fixtureDoorSideOf(config, id), id,
                ppf, `wr-r${ri}-${id}`, fixtureSizeLabel(id, config),
              ));
            });
          });
          return out;
        })()}

        {/* ---- ceiling (RCP): LED panels (square/round) + tube lights — ON TOP of furniture ---- */}
        {(() => {
          const lights: ("led" | "tube")[] = [
            ...Array.from({ length: nLedPanel }, () => "led" as const),
            ...Array.from({ length: nTube }, () => "tube" as const),
          ];
          if (!lights.length) return null;
          // Distribute lights PER ROOM (within each room's band between partitions) so a
          // light is never drawn on/over a partition wall. 1 room → identical to before.
          const roomList = rooms ?? [L];
          const totalLen = roomList.reduce((a, b) => a + b, 0) || L;
          const edges = [ox];
          let acc = 0;
          roomList.forEach((rl) => { acc += rl; edges.push(ox + planW * (acc / totalLen)); });
          const share = allocateAcrossRooms(lights.length, roomList);
          const s = Math.min(Math.max(ppf * 0.5, 11), 18);
          const out: React.ReactNode[] = [];
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
              out.push(kind === "tube"
                ? <TubeLight key={`t-${ri}-${k}`} cx={cx} cy={cy} len={s * 2.2} />
                : <LedLight key={`p-${ri}-${k}`} cx={cx} cy={cy} s={s} round={ledRound} />);
            }
          });
          return out;
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
          const openFt = openingWidthOn(spanFt, winW);
          const len = openFt * ppf;
          const startPx = clampOpeningOffset(wp.offset, spanFt, winW) * ppf;
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
          const dw = openingWidthOn(spanFt, DOOR_SIZE.widthFt) * ppf;
          const startPx = clampOpeningOffset(d.offset, spanFt, DOOR_SIZE.widthFt) * ppf;
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
        <p className="px-3 pt-1.5 text-center text-[10px] font-medium" style={{ color: C.socketInk }}>
          Plug points: {config.electrical.plug} (= {config.electrical.plug * 2} sockets + {config.electrical.plug * 2} switches) — placed room-wise
        </p>
      ) : null}
      <p className="px-3 pb-1.5 text-center text-[10px] font-medium" style={{ color: C.steel }}>
        Plate-bar lifting hooks (with hole) at {nHooks} corners — for lift &amp; shift
      </p>
    </div>
  );
}
