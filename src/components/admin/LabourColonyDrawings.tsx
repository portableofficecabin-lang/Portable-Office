"use client";

import type { LabourColonyResult } from "@/lib/quotation/labourColony";

/**
 * Schematic 2D drawings for the Labour Colony calculator:
 *  - Top view (floor plan): two rows of rooms along a central corridor, with
 *    door/window symbols + a utility wing (toilet/dining/office) when enabled.
 *  - Four elevations: Front, Rear, Left, Right with windows, floor lines and
 *    roof slope.
 * All geometry is derived from the same config the calculation uses, scaled to
 * pixels (S px per metre). These are schematic references for quotation /
 * client approval, not stamped construction drawings.
 */

const S = 26; // px per metre
const PAD = 48;

const COL = {
  wall: "#334155",
  room: "#f8fafc",
  corridor: "#fef3c7",
  util: "#e0f2fe",
  roof: "#cbd5e1",
  door: "#dc2626",
  window: "#2563eb",
  dim: "#64748b",
  floor: "#94a3b8",
};

const px = (m: number) => m * S;

export function LabourColonyDrawings({ result }: { result: LabourColonyResult }) {
  const { roomLength: L, roomWidth: W, roomHeight: H, floors, corridorWidth: C } = result.config;
  const rooms = result.occupancy.rooms;
  const fac = result.config.facilities;

  const roomsPerFloor = Math.ceil(rooms / Math.max(floors, 1));
  const topRow = Math.max(1, Math.ceil(roomsPerFloor / 2));
  const bottomRow = Math.max(0, roomsPerFloor - topRow);
  const cols = Math.max(topRow, bottomRow, 1);
  const footL = cols * L;
  const footW = 2 * W + C;

  return (
    <div className="space-y-6">
      <DrawingFrame title="Top View — Floor Plan (per floor)" caption={`Footprint ${footL.toFixed(1)} m × ${footW.toFixed(1)} m · ${roomsPerFloor} rooms/floor · ${floors === 1 ? "Ground floor" : floors === 2 ? "G+1" : "G+2"}`}>
        <PlanSvg result={result} L={L} W={W} C={C} topRow={topRow} bottomRow={bottomRow} cols={cols} footL={footL} footW={footW} fac={fac} />
      </DrawingFrame>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DrawingFrame title="Front Elevation" caption={`Length ${footL.toFixed(1)} m · Height ${(floors * H).toFixed(1)} m + roof`}>
          <LongElevation footL={footL} cols={cols} floors={floors} H={H} door />
        </DrawingFrame>
        <DrawingFrame title="Rear Elevation" caption={`Length ${footL.toFixed(1)} m`}>
          <LongElevation footL={footL} cols={cols} floors={floors} H={H} />
        </DrawingFrame>
        <DrawingFrame title="Left Side Elevation" caption={`Width ${footW.toFixed(1)} m · gable roof`}>
          <SideElevation footW={footW} floors={floors} H={H} door />
        </DrawingFrame>
        <DrawingFrame title="Right Side Elevation" caption={`Width ${footW.toFixed(1)} m · gable roof`}>
          <SideElevation footW={footW} floors={floors} H={H} />
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
      <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border" style={{ background: COL.corridor }} /> Corridor / passage</span>
      <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border" style={{ background: COL.util }} /> Toilet / dining / office</span>
      <span className="text-slate-400">Not to scale — schematic reference</span>
    </div>
  );
}

/* ---------------- PLAN (top view) ---------------- */
function PlanSvg({ result, L, W, C, topRow, bottomRow, cols, footL, footW, fac }: {
  result: LabourColonyResult; L: number; W: number; C: number;
  topRow: number; bottomRow: number; cols: number; footL: number; footW: number;
  fac: LabourColonyResult["config"]["facilities"];
}) {
  const utils: { label: string; sub: string }[] = [];
  if (fac.toilet) utils.push({ label: "Toilet & Bath", sub: `${result.area.toiletBlockSqm} sqm` });
  if (fac.diningKitchen) utils.push({ label: "Dining + Kitchen", sub: `${result.area.diningKitchenSqm} sqm` });
  if (fac.officeSecurity) utils.push({ label: "Office / Security", sub: `${result.area.officeSecuritySqm} sqm` });
  const wingW = utils.length ? 3.4 : 0;

  const totalW = px(footL + wingW) + PAD * 2;
  const totalH = px(footW) + PAD * 2;
  const doorLen = Math.min(0.9, L * 0.4);
  const winLen = Math.min(1.4, L * 0.6);

  const room = (i: number, rowTopY: number, isTop: boolean, n: number) => {
    const x = px(i * L);
    const y = px(rowTopY);
    const cx = x + px(L) / 2;
    const winY = isTop ? y : y + px(W);
    const doorY = isTop ? y + px(W) : y;
    return (
      <g key={`${isTop ? "t" : "b"}-${i}`}>
        <rect x={x} y={y} width={px(L)} height={px(W)} fill={COL.room} stroke={COL.wall} strokeWidth={1.5} />
        <text x={cx} y={y + px(W) / 2} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill={COL.wall}>R{n}</text>
        {/* window on outer wall */}
        <line x1={cx - px(winLen) / 2} y1={winY} x2={cx + px(winLen) / 2} y2={winY} stroke={COL.window} strokeWidth={3} />
        {/* door on corridor side */}
        <line x1={cx - px(doorLen) / 2} y1={doorY} x2={cx + px(doorLen) / 2} y2={doorY} stroke={COL.door} strokeWidth={3} />
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full h-auto min-w-[640px]">
      <g transform={`translate(${PAD},${PAD})`}>
        {/* corridor band */}
        <rect x={0} y={px(W)} width={px(footL)} height={px(C)} fill={COL.corridor} stroke={COL.wall} strokeWidth={1} />
        <text x={px(footL) / 2} y={px(W) + px(C) / 2} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill={COL.dim}>
          CORRIDOR / PASSAGE ({C} m)
        </text>

        {/* top + bottom room rows */}
        {Array.from({ length: topRow }, (_, i) => room(i, 0, true, i + 1))}
        {Array.from({ length: bottomRow }, (_, i) => room(i, W + C, false, topRow + i + 1))}

        {/* outer building outline */}
        <rect x={0} y={0} width={px(footL)} height={px(footW)} fill="none" stroke={COL.wall} strokeWidth={2.5} />

        {/* utility wing */}
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

        {/* dimensions */}
        <text x={px(footL) / 2} y={px(footW) + 24} textAnchor="middle" fontSize={11} fill={COL.dim}>← {footL.toFixed(1)} m →</text>
        <text x={-24} y={px(footW) / 2} textAnchor="middle" fontSize={11} fill={COL.dim} transform={`rotate(-90 -24 ${px(footW) / 2})`}>← {footW.toFixed(1)} m →</text>
        <text x={px(L) / 2} y={-8} textAnchor="middle" fontSize={9} fill={COL.dim}>room {L}×{W} m</text>
      </g>
    </svg>
  );
}

/* ---------------- FRONT / REAR elevation (long side) ---------------- */
function LongElevation({ footL, cols, floors, H, door }: { footL: number; cols: number; floors: number; H: number; door?: boolean }) {
  const roof = 0.7;
  const totalW = px(footL) + PAD * 2;
  const bodyH = floors * H;
  const totalH = px(bodyH + roof) + PAD * 2;
  const winW = Math.min(1.2, (footL / cols) * 0.5);
  const winH = 1.0;

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full h-auto min-w-[520px]">
      <g transform={`translate(${PAD},${PAD})`}>
        {/* roof (trapezoid with eaves) */}
        <polygon points={`${px(-0.3)},${px(roof)} ${px(footL * 0.5)},0 ${px(footL + 0.3)},${px(roof)}`} fill={COL.roof} stroke={COL.wall} strokeWidth={1.5} />
        {/* body */}
        <rect x={0} y={px(roof)} width={px(footL)} height={px(bodyH)} fill={COL.room} stroke={COL.wall} strokeWidth={2} />
        {/* floor lines */}
        {Array.from({ length: floors - 1 }, (_, f) => (
          <line key={f} x1={0} y1={px(roof + (f + 1) * H)} x2={px(footL)} y2={px(roof + (f + 1) * H)} stroke={COL.floor} strokeWidth={1} strokeDasharray="4 3" />
        ))}
        {/* windows per bay per floor */}
        {Array.from({ length: floors }, (_, f) =>
          Array.from({ length: cols }, (_, i) => {
            const bayCx = px((i + 0.5) * (footL / cols));
            const wy = px(roof + f * H + (H - winH) / 2);
            const skipForDoor = door && f === floors - 1 && i === Math.floor(cols / 2);
            if (skipForDoor) return null;
            return <rect key={`${f}-${i}`} x={bayCx - px(winW) / 2} y={wy} width={px(winW)} height={px(winH)} fill="#dbeafe" stroke={COL.window} strokeWidth={1.5} />;
          })
        )}
        {/* door (ground floor, centre bay) */}
        {door && (
          <rect
            x={px((Math.floor(cols / 2) + 0.5) * (footL / cols)) - px(0.45)}
            y={px(roof + (floors - 1) * H + (H - 2.1))}
            width={px(0.9)} height={px(2.1)} fill="#fee2e2" stroke={COL.door} strokeWidth={1.5}
          />
        )}
        {/* ground line + dims */}
        <line x1={px(-0.3)} y1={px(roof + bodyH)} x2={px(footL + 0.3)} y2={px(roof + bodyH)} stroke={COL.wall} strokeWidth={2.5} />
        <text x={px(footL) / 2} y={px(roof + bodyH) + 22} textAnchor="middle" fontSize={11} fill={COL.dim}>← {footL.toFixed(1)} m →</text>
        <text x={px(footL) + 8} y={px(roof + bodyH / 2)} fontSize={10} fill={COL.dim}>{bodyH.toFixed(1)} m</text>
      </g>
    </svg>
  );
}

/* ---------------- LEFT / RIGHT elevation (gable side) ---------------- */
function SideElevation({ footW, floors, H, door }: { footW: number; floors: number; H: number; door?: boolean }) {
  const ridge = 0.9;
  const totalW = px(footW) + PAD * 2;
  const bodyH = floors * H;
  const totalH = px(bodyH + ridge) + PAD * 2;

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full h-auto min-w-[360px]">
      <g transform={`translate(${PAD},${PAD})`}>
        {/* gable roof (two slopes) */}
        <polygon points={`${px(-0.3)},${px(ridge)} ${px(footW * 0.5)},0 ${px(footW + 0.3)},${px(ridge)}`} fill={COL.roof} stroke={COL.wall} strokeWidth={1.5} />
        {/* body */}
        <rect x={0} y={px(ridge)} width={px(footW)} height={px(bodyH)} fill={COL.room} stroke={COL.wall} strokeWidth={2} />
        {/* floor lines */}
        {Array.from({ length: floors - 1 }, (_, f) => (
          <line key={f} x1={0} y1={px(ridge + (f + 1) * H)} x2={px(footW)} y2={px(ridge + (f + 1) * H)} stroke={COL.floor} strokeWidth={1} strokeDasharray="4 3" />
        ))}
        {/* one window per floor */}
        {Array.from({ length: floors }, (_, f) => (
          <rect key={f} x={px(footW * 0.62)} y={px(ridge + f * H + (H - 1) / 2)} width={px(1.0)} height={px(1.0)} fill="#dbeafe" stroke={COL.window} strokeWidth={1.5} />
        ))}
        {/* door */}
        {door && (
          <rect x={px(footW * 0.2)} y={px(ridge + (floors - 1) * H + (H - 2.1))} width={px(0.9)} height={px(2.1)} fill="#fee2e2" stroke={COL.door} strokeWidth={1.5} />
        )}
        {/* ground + dims */}
        <line x1={px(-0.3)} y1={px(ridge + bodyH)} x2={px(footW + 0.3)} y2={px(ridge + bodyH)} stroke={COL.wall} strokeWidth={2.5} />
        <text x={px(footW) / 2} y={px(ridge + bodyH) + 22} textAnchor="middle" fontSize={11} fill={COL.dim}>← {footW.toFixed(1)} m →</text>
      </g>
    </svg>
  );
}
