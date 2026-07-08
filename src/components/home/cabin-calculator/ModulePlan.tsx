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
  DOOR_SIZE, TABLE_SIZE, ROOM_FURNITURE_IDS, furnitureRoomCounts, TABLE_ADDON_IDS, tablePlacementsOf, plugPointWallsLabel,
  MANAGER_TABLE_SIZE, MANAGER_L_SIZE,
  sideSpanFt, openingWidthOn, clampOpeningOffset, type CabinConfig,
} from "./pricing";

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
type FurnUnit = { id: string; label: string; wFt: number; dFt: number; kind: "desk" | "deskL" | "cabinet" | "conf" | "chair"; pos?: string };
const CHAIR_GAP = 3; // clearance between the desk edge and the chair, so staff can sit
// Work tables (workstation / manager / conference) all use the company's standard
// TABLE_SIZE (3.5 ft × 22"), so the plan's dimensions match the quote & PDF exactly.
const TW = TABLE_SIZE.lengthFt, TD = TABLE_SIZE.depthIn / 12;
const FURN_SPEC: Record<string, Omit<FurnUnit, "id">> = {
  workstation:      { label: "WORKSTATION", wFt: TW, dFt: TD, kind: "desk" },
  manager:          { label: "MANAGER TABLE", wFt: MANAGER_TABLE_SIZE.widthFt, dFt: MANAGER_TABLE_SIZE.depthFt, kind: "desk" },
  "manager-l":      { label: "MANAGER TABLE (L)", wFt: MANAGER_L_SIZE.widthFt, dFt: MANAGER_L_SIZE.depthFt, kind: "deskL" },
  conference:       { label: "CONFERENCE TABLE", wFt: TW, dFt: TD, kind: "conf" },
  cupboard:         { label: "CUPBOARD / FILE CABINET", wFt: 3, dFt: 1.5, kind: "cabinet" },
  "chair-headrest": { label: "CHAIR (HEAD REST)", wFt: 1.5, dFt: 1.5, kind: "chair" },
  "chair-backrest": { label: "CHAIR (BACK REST)", wFt: 1.5, dFt: 1.5, kind: "chair" },
};
const PER_TYPE_CAP = 8; // don't flood a room's plan with dozens of identical pieces

/** Chair seen from above — seat with a back-rest strip. */
function FurnChair({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  return (
    <g>
      <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} rx={s * 0.22} fill={C.seat} stroke={C.seatEdge} strokeWidth={0.8} />
      <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s * 0.3} rx={s * 0.14} fill={C.seatEdge} fillOpacity={0.5} />
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
const chairFor = (w: number, h: number) => Math.min(Math.max(Math.min(w, h) * 0.7, 8), 13);

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
  side: "below" | "above" | "right" | "left", drawChair: boolean,
) {
  const cx = x + w / 2, cyc = y + h / 2;
  const cs = chairFor(w, h);
  const chair =
    side === "below" ? { cx, cy: y + h + CHAIR_GAP + cs / 2 } :
    side === "above" ? { cx, cy: y - CHAIR_GAP - cs / 2 } :
    side === "right" ? { cx: x + w + CHAIR_GAP + cs / 2, cy: cyc } :
                       { cx: x - CHAIR_GAP - cs / 2, cy: cyc };
  const vertical = side === "right" || side === "left";
  const along = vertical ? h : w;          // the desk's long edge on screen
  return (
    <g key={key}>
      {/* Chair only when the customer has a chair to assign here (staff seat + clearance). */}
      {drawChair && <FurnChair cx={chair.cx} cy={chair.cy} s={cs} />}
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
  side: "below" | "above" | "right" | "left", ppf: number, drawChair: boolean,
) {
  const Lw = u.wFt * ppf, Lh = u.dFt * ppf;              // local (unrotated) footprint
  const mainD = MANAGER_TABLE_SIZE.depthFt * ppf;        // depth of the main run
  const retW = MANAGER_L_SIZE.returnWidthFt * ppf;       // width of the return leg
  // below → 0°, right → -90°, above → 180°, left → 90° (maps "chair below" onto each wall).
  const angle = side === "below" ? 0 : side === "right" ? -90 : side === "above" ? 180 : 90;
  const cs = chairFor(Lw - retW, Lh - mainD);
  const chX = retW + (Lw - retW) / 2, chY = mainD + CHAIR_GAP + cs / 2;
  const pts = `0,0 ${Lw},0 ${Lw},${mainD} ${retW},${mainD} ${retW},${Lh} 0,${Lh}`;
  // 2 sockets + 2 switches along the main run's wall side (local top edge, y≈0).
  const og = 6.6, oSx = Lw / 2 - ((TABLE_OUTLETS.length - 1) * og) / 2;
  return (
    <g key={key} transform={`translate(${x + boxW / 2} ${y + boxH / 2}) rotate(${angle}) translate(${-Lw / 2} ${-Lh / 2})`}>
      {drawChair && <FurnChair cx={chX} cy={chY} s={cs} />}
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
function drawCabinet(x: number, y: number, w: number, h: number, u: FurnUnit, key: string) {
  const cx = x + w / 2;
  return (
    <g key={key}>
      <rect x={x} y={y} width={w} height={h} rx={1.5} fill={C.cab} stroke={C.cabEdge} strokeWidth={1} />
      <line x1={cx} y1={y} x2={cx} y2={y + h} stroke={C.cabEdge} strokeWidth={0.6} strokeOpacity={0.7} />
      <circle cx={cx - 3} cy={y + h / 2} r={0.9} fill={C.cabEdge} />
      <circle cx={cx + 3} cy={y + h / 2} r={0.9} fill={C.cabEdge} />
      <FurnCaption cx={cx} y={y + h + 8} u={u} />
    </g>
  );
}

/** Ring capacity of a conference table (how many chairs fit around it). */
const confCapacity = (w: number, h: number) => {
  const chairS = Math.min(h * 0.5, 11);
  return 2 * Math.max(1, Math.min(3, Math.round(w / (chairS * 2.4))));
};
/** Conference table (top view) — rounded table ringed by up to `chairCount` chairs (only the
 *  chairs the customer actually selected) + centred caption. */
function drawConf(x: number, y: number, w: number, h: number, u: FurnUnit, key: string, chairCount: number) {
  const cx = x + w / 2, cyc = y + h / 2;
  const chairS = Math.min(h * 0.5, 11);
  const perSide = Math.max(1, Math.min(3, Math.round(w / (chairS * 2.4))));
  // Ring slots (top row then bottom row); fill only as many as the customer has chairs for.
  const slots: { cx: number; cy: number }[] = [];
  for (let i = 0; i < perSide; i++) slots.push({ cx: x + w * ((i + 0.5) / perSide), cy: y - chairS * 0.62 });
  for (let i = 0; i < perSide; i++) slots.push({ cx: x + w * ((i + 0.5) / perSide), cy: y + h + chairS * 0.62 });
  const seats = slots.slice(0, Math.max(0, chairCount)).map((s, i) => <FurnChair key={`c${i}`} cx={s.cx} cy={s.cy} s={chairS} />);
  return (
    <g key={key}>
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
  units: FurnUnit[], x0: number, x1: number, yTop: number, yBot: number, ppf: number, keyPrefix: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pad = 7, gap = 6;
  const dW = (u: FurnUnit) => u.wFt * ppf;  // table length (along the wall)
  const dD = (u: FurnUnit) => u.dFt * ppf;  // table depth (into the room)

  const cabinets = units.filter((u) => u.kind === "cabinet");
  // Chairs are drawn ONLY for the chairs the customer selected. They're assigned to desks
  // first (so staff can sit), then a conference ring, then any extras become loose chairs.
  let chairPool = units.filter((u) => u.kind === "chair").length;
  const takeChairs = (max: number) => { const t = Math.min(Math.max(max, 0), chairPool); chairPool -= t; return t; };
  const takeChair = () => takeChairs(1) === 1;
  const groups: Record<string, FurnUnit[]> = { top: [], bottom: [], left: [], right: [], centre: [] };
  // Wall-placed conference tables are drawn as ordinary desks; centred ones get a chair ring.
  const confsCentre: FurnUnit[] = [];
  units.forEach((u) => {
    if (u.kind !== "desk" && u.kind !== "deskL" && u.kind !== "conf") return;
    const p = u.pos ?? (u.kind === "conf" ? "centre" : "top");
    if (u.kind === "conf" && p === "centre") { confsCentre.push(u); return; }
    (groups[p] ?? groups.top).push(u);
  });

  /** Draw a table into a bounding box — L-shaped manager desks get their own polygon.
   *  `chair` = whether a selected chair is assigned to this desk (staff seat). */
  const drawTable = (
    x: number, y: number, w: number, h: number, u: FurnUnit, key: string,
    side: "below" | "above" | "right" | "left", chair: boolean,
  ) => (u.kind === "deskL" ? drawDeskLAt(x, y, w, h, u, key, side, ppf, chair) : drawDeskAt(x, y, w, h, u, key, side, chair));

  // Vertical space a horizontal wall run consumes (deepest desk + its chair + clearance).
  const band = (list: FurnUnit[]) =>
    list.length ? Math.max(...list.map((u) => dD(u) + chairFor(dW(u), dD(u)))) + CHAIR_GAP + gap : 0;
  const topBand = band(groups.top), bottomBand = band(groups.bottom);

  // --- horizontal wall runs (upper / down) ---
  const layH = (list: FurnUnit[], wall: "top" | "bottom") => {
    let cx = x0 + pad, row = 0;
    list.forEach((u, i) => {
      const w = dW(u), h = dD(u), cs = chairFor(w, h);
      if (cx + w > x1 - pad && cx > x0 + pad) { cx = x0 + pad; row++; }
      const off = row * (h + cs + CHAIR_GAP + gap);
      const y = wall === "top" ? yTop + pad + off : yBot - pad - h - off;
      nodes.push(drawTable(cx, y, w, h, u, `${keyPrefix}-${wall}${i}`, wall === "top" ? "below" : "above", takeChair()));
      cx += w + gap;
    });
  };
  layH(groups.top, "top");
  layH(groups.bottom, "bottom");

  // --- vertical wall runs (left / right), inset past the horizontal bands ---
  const vTop = yTop + pad + topBand, vBot = yBot - pad - bottomBand;
  const layV = (list: FurnUnit[], wall: "left" | "right") => {
    let cy = vTop, col = 0;
    list.forEach((u, i) => {
      const w = dD(u), h = dW(u), cs = chairFor(w, h);  // rotated against the side wall
      if (cy + h > vBot && cy > vTop) { cy = vTop; col++; }
      const off = col * (w + cs + CHAIR_GAP + gap);
      const x = wall === "left" ? x0 + pad + off : x1 - pad - w - off;
      nodes.push(drawTable(x, cy, w, h, u, `${keyPrefix}-${wall}${i}`, wall === "left" ? "right" : "left", takeChair()));
      cy += h + gap;
    });
  };
  layV(groups.left, "left");
  layV(groups.right, "right");

  // --- what's left in the middle, after the four wall runs ---
  const sideBand = (list: FurnUnit[]) =>
    list.length ? Math.max(...list.map((u) => dD(u) + chairFor(dD(u), dW(u)))) + CHAIR_GAP + gap : 0;
  const cx0 = x0 + pad + sideBand(groups.left), cx1 = x1 - pad - sideBand(groups.right);
  let cursor = vTop;

  // Conference table(s): centred with a chair ring.
  confsCentre.forEach((u, i) => {
    const w = Math.min(dW(u), cx1 - cx0 - 8), h = dD(u);
    const cs = Math.min(h * 0.5, 11);
    cursor += cs + 2;
    nodes.push(drawConf((cx0 + cx1) / 2 - w / 2, cursor, w, h, u, `${keyPrefix}-conf${i}`, takeChairs(confCapacity(w, h))));
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
    const cs = chairFor(dW(list[0]), dD(list[0]));
    const px = Math.max(cx0 + 2, (cx0 + cx1) / 2 - rowW / 2);
    const spine = Math.max(cursor + cs + depthA + 4, (Math.max(cursor, vTop) + vBot) / 2);
    // upper row sits above the spine (chairs above); lower row below (chairs below)
    const bounds: number[] = [];
    let ax = px;
    rowA.forEach((u, i) => {
      const w = dW(u), h = dD(u);
      nodes.push(drawTable(ax, spine - h, w, h, u, `${keyPrefix}-cA${i}`, "above", takeChair()));
      ax += w; if (i < rowA.length - 1) bounds.push(ax + gap / 2);
      ax += gap;
    });
    let bx = px;
    rowB.forEach((u, i) => {
      const w = dW(u), h = dD(u);
      nodes.push(drawTable(bx, spine, w, h, u, `${keyPrefix}-cB${i}`, "below", takeChair()));
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
      const y = onTop ? yTop + pad : yBot - pad - h;
      nodes.push(drawCabinet(cxr, y, w, h, u, `${keyPrefix}-cab${i}`));
      cxr -= gap;
    });
  }

  // Loose chairs — only the SELECTED chairs left over after seating every desk & conference.
  if (chairPool > 0) {
    const s = Math.min(1.5 * ppf, 14);
    let cx = cx0 + 4;
    const y = Math.min(Math.max(cursor, vTop) + s / 2, vBot - s / 2);
    for (let i = 0; i < chairPool; i++) {
      if (cx + s > cx1) { cx = cx0 + 4; }
      nodes.push(<FurnChair key={`${keyPrefix}-ch${i}`} cx={cx + s / 2} cy={y} s={s} />);
      cx += s + gap;
    }
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
  const winLabel = `${ftLabel(winW)} X ${ftLabel(winH)}`;
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
          const roomList = rooms ?? [L];
          const total = roomList.reduce((a, b) => a + b, 0) || L;
          const edges = [ox];
          let acc = 0;
          roomList.forEach((rl) => { acc += rl; edges.push(ox + planW * (acc / total)); });
          const out: React.ReactNode[] = [];
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
              const offset = per.slice(0, ri).reduce((a, b) => a + b, 0);
              const cnt = Math.min(per[ri] || 0, PER_TYPE_CAP);
              for (let k = 0; k < cnt; k++) units.push({ id, ...spec, pos: places?.[offset + k] });
            });
            if (units.length) out.push(...roomFurnitureNodes(units, edges[ri], edges[ri + 1], oy, by, ppf, `r${ri}`));
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
          const rowsN = W >= 8 && lights.length > 1 ? 2 : 1;
          const cols = Math.ceil(lights.length / rowsN);
          const s = Math.min(Math.max(ppf * 0.5, 11), 18);
          return lights.map((kind, k) => {
            const cy = rowsN === 1 ? oy + planH * 0.5 : oy + planH * (Math.floor(k / cols) === 0 ? 0.24 : 0.76);
            const cx = ox + planW * (((k % cols) + 0.5) / cols);
            return kind === "tube"
              ? <TubeLight key={`t${k}`} cx={cx} cy={cy} len={s * 2.2} />
              : <LedLight key={`p${k}`} cx={cx} cy={cy} s={s} round={ledRound} />;
          });
        })()}

        {/* ---- ceiling fans (12" round, 3-blade) on the centre line — ON TOP ---- */}
        {Array.from({ length: nFan }).map((_, i) => {
          const cx = ox + planW * ((i + 0.5) / nFan);
          const cy = oy + planH * 0.5;
          const r = Math.min(Math.max(ppf * 0.55, 15), 26);
          return <CeilingFan key={`f${i}`} cx={cx} cy={cy} r={r} />;
        })}

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
          // Sliding-track rails drawn inside the frame: 2-track → 2, 2.5-track → 3.
          const winRails = (config.windowTrackId ?? "2") === "2.5" ? 3 : 2;
          if (horiz) {
            const x0 = ox + startPx;
            const cx = x0 + len / 2;
            const y0 = side === "top" ? oy - wallT - 2 : by - 2;
            const lblY = side === "top" ? oy - wallT - 20 : by + wallT + 14;
            return (
              <g key={i}>
                <rect x={x0} y={y0} width={len} height={wallT + 4} fill={C.win} stroke={C.winLine} strokeWidth={0.8} />
                {Array.from({ length: winRails }, (_, k) => {
                  const yy = y0 + (wallT + 4) * ((k + 1) / (winRails + 1));
                  return <line key={k} x1={x0} y1={yy} x2={x0 + len} y2={yy} stroke={C.winLine} strokeWidth={0.7} />;
                })}
                <text x={cx} y={lblY} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={C.ink}>WINDOW</text>
                <text x={cx} y={lblY + 8.5} textAnchor="middle" fontSize={7.5} fill={C.ink}>{winLabel}</text>
              </g>
            );
          }
          const yTop = oy + startPx;
          const cy = yTop + len / 2;
          const x0 = side === "left" ? ox - wallT - 2 : rx - 2;
          const lblX = side === "left" ? ox - wallT - 8 : rx + wallT + 8;
          return (
            <g key={i}>
              <rect x={x0} y={yTop} width={wallT + 4} height={len} fill={C.win} stroke={C.winLine} strokeWidth={0.8} />
              {Array.from({ length: winRails }, (_, k) => {
                const xx = x0 + (wallT + 4) * ((k + 1) / (winRails + 1));
                return <line key={k} x1={xx} y1={yTop} x2={xx} y2={yTop + len} stroke={C.winLine} strokeWidth={0.7} />;
              })}
              <text x={lblX} y={cy} textAnchor="middle" fontSize={7} fontWeight={700} fill={C.ink}
                transform={`rotate(-90 ${lblX} ${cy})`}>WINDOW {winLabel}</text>
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

        {/* ---- electrical sockets: spread along each chosen wall + one beside each work table ---- */}
        {(() => {
          const plugWalls: string[] = config.plugPointWalls ?? [];
          if (plugWalls.length === 0) return null;
          const pts: { x: number; y: number }[] = [];
          const ins = 12, frac = [0.34, 0.66]; // two spread points per wall (interior face)
          if (plugWalls.includes("upper")) frac.forEach((f) => pts.push({ x: ox + planW * f, y: oy + ins }));
          if (plugWalls.includes("down"))  frac.forEach((f) => pts.push({ x: ox + planW * f, y: by - ins }));
          if (plugWalls.includes("left"))  frac.forEach((f) => pts.push({ x: ox + ins, y: oy + planH * f }));
          if (plugWalls.includes("right")) frac.forEach((f) => pts.push({ x: rx - ins, y: oy + planH * f }));
          if (plugWalls.includes("table")) {
            // One socket per work table, placed ON THE WALL that table sits against (a
            // centre-positioned table falls back to the down / front wall) — sockets are
            // always on a wall face, never floating in the middle of the room.
            const tblPts: { x: number; y: number }[] = [];
            TABLE_ADDON_IDS.forEach((tid) => {
              const qty = Math.round(config.addons?.[tid] ?? 0);
              if (qty <= 0) return;
              tablePlacementsOf(config, tid, qty).forEach((pos, i) => {
                const f = 0.28 + 0.44 * ((i + 0.5) / qty); // spread along the wall
                if (pos === "top")        tblPts.push({ x: ox + planW * f, y: oy + ins });
                else if (pos === "left")  tblPts.push({ x: ox + ins,       y: oy + planH * f });
                else if (pos === "right") tblPts.push({ x: rx - ins,       y: oy + planH * f });
                else                      tblPts.push({ x: ox + planW * f, y: by - ins }); // bottom / centre → down wall
              });
            });
            tblPts.slice(0, 6).forEach((p) => pts.push(p));
          }
          return pts.map((p, i) => <Socket key={i} cx={p.x} cy={p.y} />);
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
      {(config.plugPointWalls?.length ?? 0) > 0 && (
        <p className="px-3 pt-1.5 text-center text-[10px] font-medium" style={{ color: C.socketInk }}>
          Electrical sockets — {plugPointWallsLabel(config.plugPointWalls)}
        </p>
      )}
      <p className="px-3 pb-1.5 text-center text-[10px] font-medium" style={{ color: C.steel }}>
        Plate-bar lifting hooks (with hole) at {nHooks} corners — for lift &amp; shift
      </p>
    </div>
  );
}
