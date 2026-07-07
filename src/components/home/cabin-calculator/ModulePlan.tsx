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

import { DOOR_SIZE, type CabinConfig } from "./pricing";

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
  ink: "#333333", dim: "#444444",
};

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

/** LED panel light (small square with an inner square). */
function LedLight({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  return (
    <g>
      <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} rx={1.5} fill={C.light} stroke={C.lightEdge} strokeWidth={1} />
      <rect x={cx - s / 2 + 2.5} y={cy - s / 2 + 2.5} width={s - 5} height={s - 5} rx={1} fill="none" stroke={C.lightEdge} strokeWidth={0.7} strokeOpacity={0.7} />
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
  const mL = 92, mT = 74, mR = 52, mB = 70;
  const ox = mL, oy = mT;               // inner room top-left
  const rx = ox + planW, by = oy + planH; // right / bottom inner edges
  const vbW = planW + mL + mR, vbH = planH + mT + mB;

  const e = config.electrical ?? {};
  const nFan = Math.min(Math.max(e.fan ?? 0, 0), 6);
  const nLed = Math.min((e.led ?? 0) + (e.tube ?? 0), 12);
  const nPlug = Math.min(Math.max(e.plug ?? 0, 0), 4);
  const winW = config.windowWidthFt ?? 3, winH = config.windowHeightFt ?? 3;
  const winLabel = `${ftLabel(winW)} X ${ftLabel(winH)}`;
  const doorLabel = `${ftLabel(DOOR_SIZE.widthFt)} X ${ftLabel(DOOR_SIZE.heightFt)}`;

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

        {/* ---- ceiling LED lights (grid) ---- */}
        {(() => {
          if (nLed <= 0) return null;
          const rowsN = W >= 8 && nLed > 1 ? 2 : 1;
          const cols = Math.ceil(nLed / rowsN);
          const s = Math.min(Math.max(ppf * 0.5, 10), 18);
          const cells: React.ReactNode[] = [];
          let k = 0;
          for (let r = 0; r < rowsN && k < nLed; r++) {
            const cy = rowsN === 1 ? oy + planH * 0.5 : oy + planH * (r === 0 ? 0.26 : 0.74);
            for (let c = 0; c < cols && k < nLed; c++, k++) {
              const cx = ox + planW * ((c + 0.5) / cols);
              cells.push(<LedLight key={`l${k}`} cx={cx} cy={cy} s={s} />);
            }
          }
          return cells;
        })()}

        {/* ---- ceiling fans (centre line, 12" round) ---- */}
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

        {/* ---- doors (leaf + quarter-circle swing arc, into the room) ---- */}
        {(config.doorPlacements ?? []).map((d, i) => {
          const side = d.side || "bottom";
          const horiz = side === "top" || side === "bottom";
          const span = horiz ? L : W;
          const dw = Math.min(DOOR_SIZE.widthFt * ppf, (horiz ? planW : planH) * 0.6);
          const t = Math.min(Math.max((d.offset || 0) / span, 0.1), 0.9);
          // Hinge H, into-room unit vector, along-wall unit vector (swing toward the centre).
          let H: [number, number]; let into: [number, number]; let along: [number, number];
          if (horiz) {
            const cx = ox + planW * t;
            const wallY = side === "top" ? oy : by;
            const ax = cx < ox + planW / 2 ? 1 : -1;
            H = [cx - (ax * dw) / 2, wallY]; into = [0, side === "top" ? 1 : -1]; along = [ax, 0];
          } else {
            const cy = oy + planH * t;
            const wallX = side === "left" ? ox : rx;
            const ay = cy < oy + planH / 2 ? 1 : -1;
            H = [wallX, cy - (ay * dw) / 2]; into = [side === "left" ? 1 : -1, 0]; along = [0, ay];
          }
          const T: [number, number] = [H[0] + into[0] * dw, H[1] + into[1] * dw];   // open leaf tip
          const Cc: [number, number] = [H[0] + along[0] * dw, H[1] + along[1] * dw]; // closed position
          const cross = (T[0] - H[0]) * (Cc[1] - H[1]) - (T[1] - H[1]) * (Cc[0] - H[0]);
          const sweep = cross > 0 ? 1 : 0;
          const gap = horiz
            ? <rect x={Math.min(H[0], Cc[0])} y={(side === "top" ? oy - wallT : by) - 0.5} width={dw} height={wallT + 1} fill={C.room} />
            : <rect x={(side === "left" ? ox - wallT : rx) - 0.5} y={Math.min(H[1], Cc[1])} width={wallT + 1} height={dw} fill={C.room} />;
          const lblY1 = side === "top" ? oy - wallT - 16 : by + wallT + 13;
          const lx = side === "left" ? ox - wallT - 8 : rx + wallT + 8;
          const cxm = ox + planW * (horiz ? t : 0), cym = oy + planH * (horiz ? 0 : t);
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

        {/* ---- corner electrical sockets ---- */}
        {(() => {
          const corners: { x: number; y: number; lx: number; ly: number; anchor: "start" | "end" }[] = [
            { x: ox + 12, y: oy + 12, lx: ox + 22, ly: oy + 34, anchor: "start" },
            { x: rx - 12, y: oy + 12, lx: rx - 22, ly: oy + 34, anchor: "end" },
            { x: ox + 12, y: by - 12, lx: ox + 22, ly: by - 24, anchor: "start" },
            { x: rx - 12, y: by - 12, lx: rx - 22, ly: by - 24, anchor: "end" },
          ];
          return corners.slice(0, nPlug).map((c, i) => (
            <g key={i}>
              <Socket cx={c.x} cy={c.y} />
              <line x1={c.x} y1={c.y} x2={c.lx} y2={c.ly - 8} stroke={C.socketInk} strokeWidth={0.5} strokeDasharray="2 2" />
              <text x={c.lx} y={c.ly} textAnchor={c.anchor} fontSize={7} fontWeight={700} fill={C.ink}>ELECTRICAL SOCKET</text>
              <text x={c.lx} y={c.ly + 8} textAnchor={c.anchor} fontSize={7} fill={C.ink}>(ON CORNER)</text>
            </g>
          ));
        })()}
      </svg>
    </div>
  );
}
