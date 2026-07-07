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

import { DOOR_SIZE, TABLE_SIZE, ROOM_FURNITURE_IDS, furnitureRoomCounts, TABLE_ADDON_IDS, plugPointWallsLabel, type CabinConfig } from "./pricing";

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
type FurnUnit = { id: string; label: string; wFt: number; dFt: number; kind: "desk" | "cabinet" | "conf" | "chair" };
// Work tables (workstation / manager / conference) all use the company's standard
// TABLE_SIZE (3.5 ft × 22"), so the plan's dimensions match the quote & PDF exactly.
const TW = TABLE_SIZE.lengthFt, TD = TABLE_SIZE.depthIn / 12;
const FURN_SPEC: Record<string, Omit<FurnUnit, "id">> = {
  workstation: { label: "WORKSTATION", wFt: TW, dFt: TD, kind: "desk" },
  manager:     { label: "MANAGER TABLE", wFt: TW, dFt: TD, kind: "desk" },
  conference:  { label: "CONFERENCE TABLE", wFt: TW, dFt: TD, kind: "conf" },
  cupboard:    { label: "CUPBOARD / FILE CABINET", wFt: 3, dFt: 1.5, kind: "cabinet" },
  chairs:      { label: "CHAIR", wFt: 1.5, dFt: 1.5, kind: "chair" },
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

/** Desk / table (top view) with a chair tucked on the interior side + caption. */
function drawDesk(x: number, y: number, w: number, h: number, u: FurnUnit, key: string) {
  const cx = x + w / 2;
  const chairS = Math.min(Math.max(h * 0.8, 8), 14);
  return (
    <g key={key}>
      <FurnChair cx={cx} cy={y + h + chairS * 0.6} s={chairS} />
      <rect x={x} y={y} width={w} height={h} rx={2} fill={C.wood} stroke={C.woodEdge} strokeWidth={1} />
      <line x1={x + 2} y1={y + h * 0.34} x2={x + w - 2} y2={y + h * 0.34} stroke={C.woodEdge} strokeWidth={0.5} strokeOpacity={0.6} />
      <FurnCaption cx={cx} y={y + h + chairS + 8} u={u} />
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

/** Conference table (top view) — rounded table ringed by chairs + centred caption. */
function drawConf(x: number, y: number, w: number, h: number, u: FurnUnit, key: string) {
  const cx = x + w / 2, cyc = y + h / 2;
  const chairS = Math.min(h * 0.5, 11);
  const perSide = Math.max(1, Math.min(3, Math.round(w / (chairS * 2.4))));
  const seats: React.ReactNode[] = [];
  for (let i = 0; i < perSide; i++) {
    const chX = x + w * ((i + 0.5) / perSide);
    seats.push(<FurnChair key={`t${i}`} cx={chX} cy={y - chairS * 0.62} s={chairS} />);
    seats.push(<FurnChair key={`b${i}`} cx={chX} cy={y + h + chairS * 0.62} s={chairS} />);
  }
  return (
    <g key={key}>
      {seats}
      <rect x={x} y={y} width={w} height={h} rx={Math.min(h / 2, 9)} fill={C.wood} stroke={C.woodEdge} strokeWidth={1.1} />
      <text x={cx} y={cyc - 1} textAnchor="middle" fontSize={6.8} fontWeight={700} fill={C.ink}>{u.label}</text>
      <text x={cx} y={cyc + 6.5} textAnchor="middle" fontSize={6.3} fill={C.ink}>{ftLabel(u.wFt)} X {ftLabel(u.dFt)}</text>
    </g>
  );
}

/** Lay out and draw one room's furniture: cupboards along the rear wall, a conference
 *  table centred, then desks (each with a chair) flowing left→right, then loose chairs.
 *  Everything is drawn to scale; positions are auto-arranged so it reads like a plan. */
function roomFurnitureNodes(
  units: FurnUnit[], x0: number, x1: number, yTop: number, ppf: number, keyPrefix: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pad = Math.min(14, (x1 - x0) * 0.06);
  const gapX = 8, gapY = 14, cap = 17;
  const cabinets = units.filter((u) => u.kind === "cabinet");
  const confs = units.filter((u) => u.kind === "conf");
  const desks = units.filter((u) => u.kind === "desk");
  const chairs = units.filter((u) => u.kind === "chair");
  let cy = yTop + pad;

  // Cupboards / file cabinets along the rear (top) wall.
  if (cabinets.length) {
    let cx = x0 + pad, rowH = 0;
    cabinets.forEach((u, i) => {
      const w = u.wFt * ppf, h = u.dFt * ppf;
      if (cx + w > x1 - pad && cx > x0 + pad) { cx = x0 + pad; cy += rowH + cap + gapY; rowH = 0; }
      nodes.push(drawCabinet(cx, cy, w, h, u, `${keyPrefix}-cab${i}`));
      cx += w + gapX; rowH = Math.max(rowH, h);
    });
    cy += rowH + cap + gapY;
  }

  // Conference table(s) centred, with a chair ring.
  confs.forEach((u, i) => {
    const w = Math.min(u.wFt * ppf, (x1 - x0) - pad * 2), h = u.dFt * ppf;
    const chairS = Math.min(h * 0.5, 11);
    cy += chairS + 2;
    nodes.push(drawConf((x0 + x1) / 2 - w / 2, cy, w, h, u, `${keyPrefix}-conf${i}`));
    cy += h + chairS + cap + gapY;
  });

  // Desks (each with a chair) flowing left→right, wrapping within the room.
  if (desks.length) {
    let cx = x0 + pad, rowH = 0;
    desks.forEach((u, i) => {
      const w = u.wFt * ppf, h = u.dFt * ppf;
      const chairS = Math.min(Math.max(h * 0.8, 8), 14);
      const cellH = h + chairS + cap + 4;
      if (cx + w > x1 - pad && cx > x0 + pad) { cx = x0 + pad; cy += rowH + gapY; rowH = 0; }
      nodes.push(drawDesk(cx, cy, w, h, u, `${keyPrefix}-desk${i}`));
      cx += w + gapX; rowH = Math.max(rowH, cellH);
    });
    cy += rowH + gapY;
  }

  // Loose chairs.
  if (chairs.length) {
    const s = Math.min(1.5 * ppf, 15);
    let cx = x0 + pad;
    chairs.forEach((u, i) => {
      if (cx + s > x1 - pad && cx > x0 + pad) { cx = x0 + pad; cy += s + gapY; }
      nodes.push(<FurnChair key={`${keyPrefix}-ch${i}`} cx={cx + s / 2} cy={cy + s / 2} s={s} />);
      cx += s + gapX;
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

// Window position → wall + fraction along that wall.
const WIN_ON: Record<string, { wall: "top" | "bottom" | "left" | "right"; t: number }> = {
  "top-left": { wall: "top", t: 0.2 }, "top-center": { wall: "top", t: 0.5 }, "top-right": { wall: "top", t: 0.8 },
  "bottom-left": { wall: "bottom", t: 0.2 }, "bottom-center": { wall: "bottom", t: 0.5 }, "bottom-right": { wall: "bottom", t: 0.8 },
  "bottom": { wall: "bottom", t: 0.5 }, "left": { wall: "left", t: 0.5 }, "right": { wall: "right", t: 0.5 },
};

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

        {/* ---- partitions (multi-room) ---- */}
        {rooms && (() => {
          const total = rooms.reduce((a, b) => a + b, 0) || L;
          let acc = 0;
          return rooms.slice(0, -1).map((rl, i) => {
            acc += rl;
            const px = ox + planW * (acc / total);
            return <line key={i} x1={px} y1={oy} x2={px} y2={by} stroke={C.wall} strokeWidth={4} />;
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
              const cnt = Math.min(per[ri] || 0, PER_TYPE_CAP);
              for (let k = 0; k < cnt; k++) units.push({ id, ...spec });
            });
            if (units.length) out.push(...roomFurnitureNodes(units, edges[ri], edges[ri + 1], oy, ppf, `r${ri}`));
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

        {/* ---- windows ---- */}
        {(config.windowPositions ?? []).map((id) => {
          const m = WIN_ON[id];
          if (!m) return null;
          const horiz = m.wall === "top" || m.wall === "bottom";
          const len = Math.min((horiz ? winW : winH) * ppf, (horiz ? planW : planH) * 0.42);
          const cx = m.wall === "top" || m.wall === "bottom" ? ox + planW * m.t : (m.wall === "left" ? ox : rx);
          const cy = m.wall === "left" || m.wall === "right" ? oy + planH * m.t : (m.wall === "top" ? oy : by);
          if (horiz) {
            const y0 = m.wall === "top" ? oy - wallT - 2 : by - 2;
            const lblY = m.wall === "top" ? oy - wallT - 20 : by + wallT + 14;
            return (
              <g key={id}>
                <rect x={cx - len / 2} y={y0} width={len} height={wallT + 4} fill={C.win} stroke={C.winLine} strokeWidth={0.8} />
                <line x1={cx - len / 2} y1={y0 + (wallT + 4) / 2} x2={cx + len / 2} y2={y0 + (wallT + 4) / 2} stroke={C.winLine} strokeWidth={0.7} />
                <text x={cx} y={lblY} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={C.ink}>WINDOW</text>
                <text x={cx} y={lblY + 8.5} textAnchor="middle" fontSize={7.5} fill={C.ink}>{winLabel}</text>
              </g>
            );
          }
          const x0 = m.wall === "left" ? ox - wallT - 2 : rx - 2;
          const lblX = m.wall === "left" ? ox - wallT - 8 : rx + wallT + 8;
          return (
            <g key={id}>
              <rect x={x0} y={cy - len / 2} width={wallT + 4} height={len} fill={C.win} stroke={C.winLine} strokeWidth={0.8} />
              <line x1={x0 + (wallT + 4) / 2} y1={cy - len / 2} x2={x0 + (wallT + 4) / 2} y2={cy + len / 2} stroke={C.winLine} strokeWidth={0.7} />
              <text x={lblX} y={cy} textAnchor="middle" fontSize={7} fontWeight={700} fill={C.ink}
                transform={`rotate(-90 ${lblX} ${cy})`}>WINDOW {winLabel}</text>
            </g>
          );
        })}

        {/* ---- doors (leaf + quarter-circle swing arc, opening OUTWARD to the exterior) ---- */}
        {(config.doorPlacements ?? []).map((d, i) => {
          const side = d.side || "bottom";
          const horiz = side === "top" || side === "bottom";
          const dw = Math.min(DOOR_SIZE.widthFt * ppf, (horiz ? planW : planH) * 0.6);
          const spanPx = horiz ? planW : planH;
          const pipe = 4; // corner pipe / frame inset — the opening starts here at "0 ft"
          // offset (ft from the near corner: left for top/bottom, top for left/right) is the
          // door's NEAR edge; the opening then spans dw INTO the wall. Clamp so it always sits
          // between the two corner pipes (0 ft = flush to the corner pipe, never outside it).
          const startPx = Math.min(Math.max((d.offset || 0) * ppf, pipe), Math.max(pipe, spanPx - pipe - dw));
          // Hinge H at the near edge; OUTWARD (exterior) vector; along-wall vector (into the span).
          let H: [number, number]; let into: [number, number]; let along: [number, number];
          if (horiz) {
            const wallY = side === "top" ? oy : by;
            H = [ox + startPx, wallY]; into = [0, side === "top" ? -1 : 1]; along = [1, 0];
          } else {
            const wallX = side === "left" ? ox : rx;
            H = [wallX, oy + startPx]; into = [side === "left" ? -1 : 1, 0]; along = [0, 1];
          }
          const T: [number, number] = [H[0] + into[0] * dw, H[1] + into[1] * dw];   // open leaf tip (exterior)
          const Cc: [number, number] = [H[0] + along[0] * dw, H[1] + along[1] * dw]; // closed position
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
            const nT = Math.min(TABLE_ADDON_IDS.reduce((a, t) => a + (config.addons?.[t] ?? 0), 0), 4) || 1;
            for (let i = 0; i < nT; i++) {
              const f = nT === 1 ? 0.5 : 0.3 + (0.4 * i) / (nT - 1);
              pts.push({ x: ox + planW * f, y: oy + planH * 0.52 }); // beside where a work table sits
            }
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
