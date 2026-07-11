"use client";

import type { LabourColonyResult } from "@/lib/quotation/labourColony";

/**
 * Schematic 2D drawings for the Labour Colony calculator:
 *  - Top view (floor plan): rooms + a corridor that can sit center (double-loaded)
 *    or on any side (top / bottom / left / right, single-loaded), with door/window
 *    symbols and a utility wing (toilet/dining/office) when enabled.
 *  - Four elevations: Front, Rear, Left, Right with windows, floor lines, roof.
 * Geometry is derived from the same config the calculation uses (scaled S px/m).
 * Schematic reference for quotation / client approval, not stamped CAD.
 */

type CorridorPosition = "center" | "top" | "bottom" | "left" | "right" | "both";

const S = 26; // px per metre
const PAD = 48;
const COL = {
  wall: "#334155", room: "#f8fafc", corridor: "#fef3c7", util: "#e0f2fe",
  roof: "#cbd5e1", door: "#dc2626", window: "#2563eb", dim: "#64748b", floor: "#94a3b8",
};
const px = (m: number) => m * S;

interface RoomRect { x: number; y: number; w: number; h: number; n: number; doorSide: Side; winSide: Side; }
type Side = "top" | "bottom" | "left" | "right";

interface CorridorRect { x: number; y: number; w: number; h: number }

function buildPlan(pos: CorridorPosition, L: number, W: number, C: number, rpf: number) {
  const rooms: RoomRect[] = [];
  let corridor: CorridorRect;
  let corridor2: CorridorRect | undefined; // second veranda (peripheral / "both")
  let footL: number, footW: number;
  const add = (x: number, y: number, w: number, h: number, n: number, doorSide: Side, winSide: Side) =>
    rooms.push({ x, y, w, h, n, doorSide, winSide });

  if (pos === "center") {
    const nCols = Math.ceil(rpf / 2);
    const topRow = nCols, bottomRow = rpf - nCols;
    footL = nCols * L; footW = 2 * W + C;
    for (let i = 0; i < topRow; i++) add(i * L, 0, L, W, i + 1, "bottom", "top");
    corridor = { x: 0, y: W, w: footL, h: C };
    for (let i = 0; i < bottomRow; i++) add(i * L, W + C, L, W, topRow + i + 1, "top", "bottom");
  } else if (pos === "both") {
    // peripheral verandas on BOTH the upper and lower sides (reference layout)
    const nCols = Math.ceil(rpf / 2);
    const topRow = nCols, bottomRow = rpf - nCols;
    footL = nCols * L; footW = 2 * C + 2 * W;
    corridor = { x: 0, y: 0, w: footL, h: C };            // top veranda
    for (let i = 0; i < topRow; i++) add(i * L, C, L, W, i + 1, "top", "bottom");
    for (let i = 0; i < bottomRow; i++) add(i * L, C + W, L, W, topRow + i + 1, "bottom", "top");
    corridor2 = { x: 0, y: C + 2 * W, w: footL, h: C };   // bottom veranda
  } else if (pos === "top") {
    footL = rpf * L; footW = W + C;
    corridor = { x: 0, y: 0, w: footL, h: C };
    for (let i = 0; i < rpf; i++) add(i * L, C, L, W, i + 1, "top", "bottom");
  } else if (pos === "bottom") {
    footL = rpf * L; footW = W + C;
    for (let i = 0; i < rpf; i++) add(i * L, 0, L, W, i + 1, "bottom", "top");
    corridor = { x: 0, y: W, w: footL, h: C };
  } else if (pos === "left") {
    footL = W + C; footW = rpf * L;
    corridor = { x: 0, y: 0, w: C, h: footW };
    for (let i = 0; i < rpf; i++) add(C, i * L, W, L, i + 1, "left", "right");
  } else {
    footL = W + C; footW = rpf * L;
    for (let i = 0; i < rpf; i++) add(0, i * L, W, L, i + 1, "right", "left");
    corridor = { x: W, y: 0, w: C, h: footW };
  }
  return { rooms, corridor, corridor2, footL, footW };
}

function EdgeMark({ r, side, lenM, color, sw }: { r: RoomRect; side: Side; lenM: number; color: string; sw: number }) {
  const x = px(r.x), y = px(r.y), w = px(r.w), h = px(r.h), len = px(lenM);
  const cx = x + w / 2, cy = y + h / 2;
  let x1 = cx, y1 = cy, x2 = cx, y2 = cy;
  if (side === "top") { y1 = y2 = y; x1 = cx - len / 2; x2 = cx + len / 2; }
  else if (side === "bottom") { y1 = y2 = y + h; x1 = cx - len / 2; x2 = cx + len / 2; }
  else if (side === "left") { x1 = x2 = x; y1 = cy - len / 2; y2 = cy + len / 2; }
  else { x1 = x2 = x + w; y1 = cy - len / 2; y2 = cy + len / 2; }
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={sw} />;
}

export function LabourColonyDrawings({ result }: { result: LabourColonyResult }) {
  const { roomLength: L, roomWidth: W, roomHeight: H, floors, corridorWidth: C } = result.config;
  const pos: CorridorPosition = result.config.corridorPosition ?? "center";
  const rooms = result.occupancy.rooms;
  const rpf = Math.max(1, Math.ceil(rooms / Math.max(floors, 1)));
  const footL = result.area.footprintLengthM;
  const footW = result.area.footprintWidthM;
  const posLabel = { center: "Central (double-loaded)", both: "Both sides (upper + lower)", top: "Top side", bottom: "Bottom side", left: "Left side", right: "Right side" }[pos];

  return (
    <div className="space-y-6">
      <DrawingFrame title="Top View — Floor Plan (per floor)" caption={`Footprint ${footL.toFixed(1)} m × ${footW.toFixed(1)} m · ${rpf} rooms/floor · corridor: ${posLabel}`}>
        <PlanSvg result={result} L={L} W={W} C={C} rpf={rpf} pos={pos} />
      </DrawingFrame>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DrawingFrame title="Front Elevation" caption={`${footL.toFixed(1)} m wide · ${(floors * H).toFixed(1)} m high + roof`}>
          <Elevation widthM={footL} floors={floors} H={H} roofType="long" door />
        </DrawingFrame>
        <DrawingFrame title="Rear Elevation" caption={`${footL.toFixed(1)} m wide`}>
          <Elevation widthM={footL} floors={floors} H={H} roofType="long" />
        </DrawingFrame>
        <DrawingFrame title="Left Side Elevation" caption={`${footW.toFixed(1)} m wide · gable roof`}>
          <Elevation widthM={footW} floors={floors} H={H} roofType="gable" door />
        </DrawingFrame>
        <DrawingFrame title="Right Side Elevation" caption={`${footW.toFixed(1)} m wide · gable roof`}>
          <Elevation widthM={footW} floors={floors} H={H} roofType="gable" />
        </DrawingFrame>
      </div>

      <Legend />
    </div>
  );
}

function DrawingFrame({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-2">
        <div className="font-display font-bold text-sm text-slate-800">{title}</div>
        {caption && <div className="text-xs text-slate-500">{caption}</div>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-600">
      <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5" style={{ background: COL.door }} /> Door</span>
      <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5" style={{ background: COL.window }} /> Window</span>
      <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border" style={{ background: COL.corridor }} /> Corridor / passage / walkway</span>
      <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border" style={{ background: COL.util }} /> Toilet / dining / office</span>
      <span className="text-slate-400">Not to scale — schematic reference</span>
    </div>
  );
}

/** Architectural door: an opening in the corridor-facing wall + a leaf and a
 * quarter-circle swing arc that always opens INTO the corridor. */
function Door({ r, side }: { r: RoomRect; side: Side }) {
  const rx = px(r.x), ry = px(r.y), rw = px(r.w), rh = px(r.h);
  const along = side === "top" || side === "bottom" ? rw : rh;
  const d = Math.max(6, Math.min(px(0.9), along * 0.5)); // leaf length (px)
  const cxp = rx + rw / 2, cyp = ry + rh / 2;
  // hinge (h), closed end on the wall (c), open leaf end into corridor (o), arc sweep flag
  let hx = 0, hy = 0, cx = 0, cy = 0, ox = 0, oy = 0, sweep = 1;
  if (side === "bottom") { hx = cxp - d / 2; hy = ry + rh; cx = cxp + d / 2; cy = ry + rh; ox = cxp - d / 2; oy = ry + rh + d; sweep = 1; }
  else if (side === "top") { hx = cxp - d / 2; hy = ry; cx = cxp + d / 2; cy = ry; ox = cxp - d / 2; oy = ry - d; sweep = 0; }
  else if (side === "right") { hx = rx + rw; hy = cyp - d / 2; cx = rx + rw; cy = cyp + d / 2; ox = rx + rw + d; oy = cyp - d / 2; sweep = 0; }
  else { hx = rx; hy = cyp - d / 2; cx = rx; cy = cyp + d / 2; ox = rx - d; oy = cyp - d / 2; sweep = 1; }
  return (
    <g>
      {/* opening — white gap that "cuts" the wall between hinge and jamb */}
      <line x1={hx} y1={hy} x2={cx} y2={cy} stroke="#ffffff" strokeWidth={3.5} />
      {/* swing arc into the corridor */}
      <path d={`M ${cx} ${cy} A ${d} ${d} 0 0 ${sweep} ${ox} ${oy}`} fill="none" stroke={COL.door} strokeWidth={1} opacity={0.75} />
      {/* door leaf (open position) */}
      <line x1={hx} y1={hy} x2={ox} y2={oy} stroke={COL.door} strokeWidth={2} />
    </g>
  );
}

/** Window on the outer wall: a double parallel line straddling the wall. */
function Win({ r, side }: { r: RoomRect; side: Side }) {
  const rx = px(r.x), ry = px(r.y), rw = px(r.w), rh = px(r.h);
  const along = side === "top" || side === "bottom" ? rw : rh;
  const len = Math.max(8, Math.min(px(1.4), along * 0.55));
  const cxp = rx + rw / 2, cyp = ry + rh / 2, off = 1.6;
  if (side === "top" || side === "bottom") {
    const yy = side === "top" ? ry : ry + rh;
    return (
      <g>
        <line x1={cxp - len / 2} y1={yy - off} x2={cxp + len / 2} y2={yy - off} stroke={COL.window} strokeWidth={1.4} />
        <line x1={cxp - len / 2} y1={yy + off} x2={cxp + len / 2} y2={yy + off} stroke={COL.window} strokeWidth={1.4} />
      </g>
    );
  }
  const xx = side === "left" ? rx : rx + rw;
  return (
    <g>
      <line x1={xx - off} y1={cyp - len / 2} x2={xx - off} y2={cyp + len / 2} stroke={COL.window} strokeWidth={1.4} />
      <line x1={xx + off} y1={cyp - len / 2} x2={xx + off} y2={cyp + len / 2} stroke={COL.window} strokeWidth={1.4} />
    </g>
  );
}

function PlanSvg({ result, L, W, C, rpf, pos }: {
  result: LabourColonyResult; L: number; W: number; C: number; rpf: number; pos: CorridorPosition;
}) {
  const { rooms, corridor, corridor2, footL, footW } = buildPlan(pos, L, W, C, rpf);
  const fac = result.config.facilities;
  const corridorHorizontal = corridor.w >= corridor.h;

  const utils: { label: string; sub: string }[] = [];
  if (fac.toilet) utils.push({ label: "Toilet & Bath", sub: `${result.area.toiletBlockSqm} sqm` });
  if (fac.diningKitchen) utils.push({ label: "Dining + Kitchen", sub: `${result.area.diningKitchenSqm} sqm` });
  if (fac.officeSecurity) utils.push({ label: "Office / Security", sub: `${result.area.officeSecuritySqm} sqm` });
  const wingW = utils.length ? 3.4 : 0;

  const totalW = px(footL + wingW) + PAD * 2;
  const totalH = px(footW) + PAD * 2;

  const corMidX = px(corridor.x + corridor.w / 2);
  const corMidY = px(corridor.y + corridor.h / 2);

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full h-auto min-w-[620px]">
      <g transform={`translate(${PAD},${PAD})`}>
        {/* corridor band */}
        <rect x={px(corridor.x)} y={px(corridor.y)} width={px(corridor.w)} height={px(corridor.h)} fill={COL.corridor} stroke={COL.wall} strokeWidth={1} />
        {/* dashed centre-line to read as a continuous walkway */}
        {corridorHorizontal ? (
          <line x1={px(corridor.x)} y1={corMidY} x2={px(corridor.x + corridor.w)} y2={corMidY} stroke={COL.dim} strokeWidth={1} strokeDasharray="7 5" opacity={0.55} />
        ) : (
          <line x1={corMidX} y1={px(corridor.y)} x2={corMidX} y2={px(corridor.y + corridor.h)} stroke={COL.dim} strokeWidth={1} strokeDasharray="7 5" opacity={0.55} />
        )}
        <text x={corMidX} y={corMidY} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill={COL.dim}
          transform={corridorHorizontal ? undefined : `rotate(-90 ${corMidX} ${corMidY})`}>
          {corridor2 ? "VERANDA" : "CORRIDOR / WALKWAY"} ({C} m)
        </text>

        {/* second veranda band (peripheral / "both" layout) */}
        {corridor2 && (
          <g>
            <rect x={px(corridor2.x)} y={px(corridor2.y)} width={px(corridor2.w)} height={px(corridor2.h)} fill={COL.corridor} stroke={COL.wall} strokeWidth={1} />
            <line x1={px(corridor2.x)} y1={px(corridor2.y + corridor2.h / 2)} x2={px(corridor2.x + corridor2.w)} y2={px(corridor2.y + corridor2.h / 2)} stroke={COL.dim} strokeWidth={1} strokeDasharray="7 5" opacity={0.55} />
            <text x={px(corridor2.x + corridor2.w / 2)} y={px(corridor2.y + corridor2.h / 2)} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill={COL.dim}>
              VERANDA ({C} m)
            </text>
          </g>
        )}

        {/* rooms with corridor-facing doors + outer-wall windows */}
        {rooms.map((r) => (
          <g key={r.n}>
            <rect x={px(r.x)} y={px(r.y)} width={px(r.w)} height={px(r.h)} fill={COL.room} stroke={COL.wall} strokeWidth={1.5} />
            <text x={px(r.x + r.w / 2)} y={px(r.y + r.h / 2)} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill={COL.wall}>R{r.n}</text>
            <Win r={r} side={r.winSide} />
            <Door r={r} side={r.doorSide} />
          </g>
        ))}

        {/* building outline */}
        <rect x={0} y={0} width={px(footL)} height={px(footW)} fill="none" stroke={COL.wall} strokeWidth={2.5} />

        {/* utility wing (appended on the right) */}
        {utils.length > 0 && (
          <g transform={`translate(${px(footL)},0)`}>
            {utils.map((u, i) => {
              const h = px(footW) / utils.length;
              const y = i * h;
              return (
                <g key={u.label}>
                  <rect x={6} y={y} width={px(wingW) - 6} height={h} fill={COL.util} stroke={COL.wall} strokeWidth={1.5} />
                  <text x={6 + (px(wingW) - 6) / 2} y={y + h / 2 - 7} textAnchor="middle" fontSize={10} fill={COL.wall}>{u.label}</text>
                  <text x={6 + (px(wingW) - 6) / 2} y={y + h / 2 + 8} textAnchor="middle" fontSize={9} fill={COL.dim}>{u.sub}</text>
                </g>
              );
            })}
          </g>
        )}

        {/* corridor width dimension */}
        {corridorHorizontal ? (
          <g>
            <line x1={px(footL) + 8} y1={px(corridor.y)} x2={px(footL) + 8} y2={px(corridor.y + corridor.h)} stroke={COL.dim} strokeWidth={1} />
            <text x={px(footL) + 12} y={corMidY + 3} fontSize={9} fill={COL.dim}>{C} m</text>
          </g>
        ) : (
          <g>
            <line x1={px(corridor.x)} y1={px(footW) + 8} x2={px(corridor.x + corridor.w)} y2={px(footW) + 8} stroke={COL.dim} strokeWidth={1} />
            <text x={corMidX} y={px(footW) + 20} textAnchor="middle" fontSize={9} fill={COL.dim}>{C} m</text>
          </g>
        )}

        {/* overall dimensions */}
        <text x={px(footL) / 2} y={px(footW) + 30} textAnchor="middle" fontSize={11} fill={COL.dim}>← {footL.toFixed(1)} m →</text>
        <text x={-26} y={px(footW) / 2} textAnchor="middle" fontSize={11} fill={COL.dim} transform={`rotate(-90 -26 ${px(footW) / 2})`}>← {footW.toFixed(1)} m →</text>
        <text x={px(L) / 2} y={-8} textAnchor="middle" fontSize={9} fill={COL.dim}>room {L}×{W} m</text>
      </g>
    </svg>
  );
}

function Elevation({ widthM, floors, H, roofType, door }: { widthM: number; floors: number; H: number; roofType: "long" | "gable"; door?: boolean }) {
  const roof = roofType === "gable" ? 0.9 : 0.7;
  const bays = Math.max(1, Math.round(widthM / 3));
  const bodyH = floors * H;
  const totalW = px(widthM) + PAD * 2;
  const totalH = px(bodyH + roof) + PAD * 2;
  const winW = Math.min(1.2, (widthM / bays) * 0.5);
  const winH = 1.0;
  const doorBay = Math.floor(bays / 2);

  const roofPts = roofType === "gable"
    ? `${px(-0.3)},${px(roof)} ${px(widthM * 0.5)},0 ${px(widthM + 0.3)},${px(roof)}`
    : `${px(-0.3)},${px(roof)} ${px(widthM * 0.15)},0 ${px(widthM * 0.85)},0 ${px(widthM + 0.3)},${px(roof)}`;

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full h-auto min-w-[360px]">
      <g transform={`translate(${PAD},${PAD})`}>
        <polygon points={roofPts} fill={COL.roof} stroke={COL.wall} strokeWidth={1.5} />
        <rect x={0} y={px(roof)} width={px(widthM)} height={px(bodyH)} fill={COL.room} stroke={COL.wall} strokeWidth={2} />
        {Array.from({ length: floors - 1 }, (_, f) => (
          <line key={f} x1={0} y1={px(roof + (f + 1) * H)} x2={px(widthM)} y2={px(roof + (f + 1) * H)} stroke={COL.floor} strokeWidth={1} strokeDasharray="4 3" />
        ))}
        {Array.from({ length: floors }, (_, f) =>
          Array.from({ length: bays }, (_, i) => {
            if (door && f === floors - 1 && i === doorBay) return null;
            const bayCx = px((i + 0.5) * (widthM / bays));
            const wy = px(roof + f * H + (H - winH) / 2);
            return <rect key={`${f}-${i}`} x={bayCx - px(winW) / 2} y={wy} width={px(winW)} height={px(winH)} fill="#dbeafe" stroke={COL.window} strokeWidth={1.5} />;
          })
        )}
        {door && (
          <rect x={px((doorBay + 0.5) * (widthM / bays)) - px(0.45)} y={px(roof + (floors - 1) * H + (H - 2.1))} width={px(0.9)} height={px(2.1)} fill="#fee2e2" stroke={COL.door} strokeWidth={1.5} />
        )}
        <line x1={px(-0.3)} y1={px(roof + bodyH)} x2={px(widthM + 0.3)} y2={px(roof + bodyH)} stroke={COL.wall} strokeWidth={2.5} />
        <text x={px(widthM) / 2} y={px(roof + bodyH) + 22} textAnchor="middle" fontSize={11} fill={COL.dim}>← {widthM.toFixed(1)} m →</text>
        <text x={px(widthM) + 8} y={px(roof + bodyH / 2)} fontSize={10} fill={COL.dim}>{bodyH.toFixed(1)} m</text>
      </g>
    </svg>
  );
}
