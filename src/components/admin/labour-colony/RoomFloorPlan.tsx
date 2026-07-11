"use client";

import { useState } from "react";
import type {
  LabourColonyResult,
  RoomFloorPlanConfig,
  RoomOpeningOverride,
} from "@/lib/quotation/labourColony";

/**
 * Room-wise construction FLOOR PLAN for the Labour Colony calculator.
 *
 * Reproduces the client reference layout: two rows of identical rooms placed
 * BACK-TO-BACK, each row opening onto its own external VERANDA (walkway) — a
 * top veranda for the upper row and a bottom veranda for the lower row — with a
 * STAIRCASE at opposite ends (one serving each row). Every room carries a door
 * + a window on its veranda-facing wall; each opening's distance from the room's
 * left corner is dimensioned in feet and can be SHIFTED per room, and every door
 * shows its opening direction + swing.
 *
 * Drawing/positioning only — it never changes the quantities or BOQ. Feet-inches
 * throughout; schematic construction reference, not a stamped CAD sheet.
 */

const M2FT = 3.280839895;
const COL = {
  wall: "#0f172a",
  room: "#ffffff",
  veranda: "#fef9c3",
  verandaHatch: "#facc15",
  stair: "#fde68a",
  stairStroke: "#b45309",
  door: "#c026d3",
  doorArc: "#e879f9",
  window: "#dc2626",
  windowFill: "#fee2e2",
  dim: "#475569",
  dimLine: "#94a3b8",
  ink: "#0f172a",
};

/* ---------- feet helpers ---------- */
const M2 = (m: number) => m * M2FT;
/** Whole-inch feet-inches string, e.g. 2.95 → 2'-11", 10 → 10'-0". */
function ftIn(ft: number): string {
  const sign = ft < 0 ? "-" : "";
  const totalIn = Math.round(Math.abs(ft) * 12);
  const f = Math.floor(totalIn / 12);
  const i = totalIn % 12;
  return `${sign}${f}'-${i}"`;
}
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const r1 = (n: number) => Math.round(n * 10) / 10;

interface Props {
  result: LabourColonyResult;
  floorPlan?: RoomFloorPlanConfig;
  onChange: (next: RoomFloorPlanConfig) => void;
}

interface Placed {
  no: number;
  x0: number;         // room left (ft, pre-OX handled via px caller)
  y0: number;         // room top (ft)
  wallY: number;      // veranda-facing wall y (ft)
  into: 1 | -1;       // interior direction from the veranda wall
  doorFromLeft: number;
  winFromLeft: number;
  hinge: "left" | "right";
}

export function RoomFloorPlan({ result, floorPlan, onChange }: Props) {
  const fp = floorPlan ?? {};
  const floors = Math.max(1, result.config.floors);
  const totalRooms = Math.max(1, result.occupancy.rooms);
  const rpf = Math.ceil(totalRooms / floors); // rooms per floor
  const topCount = Math.ceil(rpf / 2);
  const bottomCount = rpf - topCount;
  const hasBottom = bottomCount > 0;
  const rows = hasBottom ? 2 : 1;
  const maxCols = Math.max(topCount, bottomCount, 1);

  const [floor, setFloor] = useState(0); // 0 = ground

  // Room footprint in feet: roomLength runs ALONG the building (drawn horizontal),
  // roomWidth is the depth toward the veranda (drawn vertical).
  const ftW = Math.max(4, M2(result.config.roomLength));
  const ftD = Math.max(4, M2(result.config.roomWidth));
  const verFt = Math.max(2, fp.verandaWidthFt ?? (r1(M2(result.config.corridorWidth || 0.9)) || 3));
  const stairFt = Math.max(3, Math.min(verFt + 1, 4)); // staircase width along the wall
  // Opening widths clamped to the room so a door/window can never overrun the side
  // wall (span ≤ ftW) and a door swing can never cross the back-to-back wall (≤ ftD).
  const doorWFt = clamp(fp.doorWidthFt ?? 3, 2, Math.max(2, Math.min(ftW - 0.5, ftD * 0.9)));
  const winWFt = clamp(fp.windowWidthFt ?? 4, 1.5, Math.max(1.5, ftW - 0.5));

  const blockWFt = maxCols * ftW;
  const contentWFt = blockWFt + 2 * stairFt; // left + right staircase columns
  const rowSpanFt = rows * ftD;
  const contentHFt = (hasBottom ? 2 : 1) * verFt + rowSpanFt;

  const S = clamp(860 / contentWFt, 5, 22); // px per foot
  const PAD = 62;
  const px = (ft: number) => ft * S;
  const OX = stairFt; // x-origin shift so the left staircase sits at x≥0 (feet)

  const svgW = px(contentWFt) + PAD * 2;
  const svgH = px(contentHFt) + PAD * 2 + 20;

  // y bands (feet)
  const yTopVer = 0;
  const yTopRow = verFt;
  const yBotRow = verFt + ftD;              // only meaningful when hasBottom
  const yBotVer = verFt + rowSpanFt;
  const yBlockBot = yTopRow + rowSpanFt;    // outline bottom

  const base = floor * rpf;
  // Reference numbering: bottom row takes the lower numbers, top row the higher ones.
  // Clamp to the real room count so a partial last floor never invents rooms.
  const bottomNums = Array.from({ length: bottomCount }, (_, i) => base + i + 1).filter((n) => n <= totalRooms);
  const topNums = Array.from({ length: topCount }, (_, i) => base + bottomCount + i + 1).filter((n) => n <= totalRooms);
  const allNums = [...bottomNums, ...topNums];
  const loNo = allNums.length ? Math.min(...allNums) : null;
  const hiNo = allNums.length ? Math.max(...allNums) : null;

  /* effective (clamped) opening offsets for a room, with sensible defaults */
  const openingOf = (roomNo: number) => {
    const o: RoomOpeningOverride = fp.rooms?.[roomNo] ?? {};
    const maxDoor = Math.max(0, ftW - doorWFt);
    const maxWin = Math.max(0, ftW - winWFt);
    const defWin = clamp(r1(ftW * 0.12), 0, maxWin);
    const defDoor = clamp(r1(ftW - ftW * 0.12 - doorWFt), 0, maxDoor);
    return {
      doorFromLeft: clamp(o.doorFromLeftFt ?? defDoor, 0, maxDoor),
      winFromLeft: clamp(o.windowFromLeftFt ?? defWin, 0, maxWin),
      hinge: (o.doorHinge ?? "left") as "left" | "right",
    };
  };

  // Build placed rooms once; render bodies then (after the outline) the openings,
  // so every door/window opening paints ON TOP of the bold building outline.
  const placed: Placed[] = [];
  topNums.forEach((no, i) => {
    const { doorFromLeft, winFromLeft, hinge } = openingOf(no);
    placed.push({ no, x0: OX + i * ftW, y0: yTopRow, wallY: yTopRow, into: 1, doorFromLeft, winFromLeft, hinge });
  });
  bottomNums.forEach((no, i) => {
    const { doorFromLeft, winFromLeft, hinge } = openingOf(no);
    placed.push({ no, x0: OX + i * ftW, y0: yBotRow, wallY: yBotRow + ftD, into: -1, doorFromLeft, winFromLeft, hinge });
  });

  const setRoom = (roomNo: number, patch: Partial<RoomOpeningOverride>) =>
    onChange({ ...fp, rooms: { ...(fp.rooms ?? {}), [roomNo]: { ...(fp.rooms?.[roomNo] ?? {}), ...patch } } });
  const setTop = (patch: Partial<RoomFloorPlanConfig>) => onChange({ ...fp, ...patch });

  /* ---- door swing arc as a sampled polyline around the hinge (always correct) ---- */
  function swingPath(hx: number, hy: number, rad: number, tipx: number, tipy: number, jx: number, jy: number) {
    const a0 = Math.atan2(tipy - hy, tipx - hx);
    const a1 = Math.atan2(jy - hy, jx - hx);
    let d = a1 - a0;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const n = 14;
    let path = "";
    for (let i = 0; i <= n; i++) {
      const a = a0 + (d * i) / n;
      path += `${i === 0 ? "M" : "L"} ${(hx + rad * Math.cos(a)).toFixed(1)} ${(hy + rad * Math.sin(a)).toFixed(1)}`;
    }
    return path;
  }

  /* ---- room body: rect + number + size ---- */
  function RoomBody({ p }: { p: Placed }) {
    return (
      <g>
        <rect x={px(p.x0)} y={px(p.y0)} width={px(ftW)} height={px(ftD)} fill={COL.room} stroke={COL.wall} strokeWidth={1.6} />
        <text x={px(p.x0 + ftW / 2)} y={px(p.y0 + ftD / 2) - 3} textAnchor="middle" fontSize={Math.max(9, S * 0.7)} fontWeight={700} fill={COL.ink}>
          ROOM {p.no}
        </text>
        <text x={px(p.x0 + ftW / 2)} y={px(p.y0 + ftD / 2) + 11} textAnchor="middle" fontSize={8.5} fill={COL.dim}>
          {ftIn(ftW)} × {ftIn(ftD)}
        </text>
      </g>
    );
  }

  /* ---- room openings (drawn last, over the outline): window + door + swing + dims ---- */
  function RoomOpenings({ p }: { p: Placed }) {
    const wallY = p.wallY;
    const into = p.into;
    const dOx = p.x0 + p.doorFromLeft;
    const wOx = p.x0 + p.winFromLeft;
    const hingeAtLeft = p.hinge === "left";
    const hx = hingeAtLeft ? dOx : dOx + doorWFt;
    const jx = hingeAtLeft ? dOx + doorWFt : dOx;
    const tipx = hx;
    const tipy = wallY + into * doorWFt;
    const insA = wallY + into * 1.1; // window offset dim
    const insB = wallY + into * 2.3; // door offset dim
    return (
      <g>
        {/* WINDOW on the veranda wall */}
        <rect x={px(wOx)} y={px(wallY) - 2.4} width={px(winWFt)} height={4.8} fill={COL.windowFill} stroke={COL.window} strokeWidth={1.4} />
        <line x1={px(wOx)} y1={px(wallY)} x2={px(wOx + winWFt)} y2={px(wallY)} stroke={COL.window} strokeWidth={1} />
        <text x={px(wOx + winWFt / 2)} y={px(wallY) + into * 9} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={COL.window}>W</text>

        {/* DOOR opening (clear the wall) + leaf + swing arc */}
        <line x1={px(dOx)} y1={px(wallY)} x2={px(dOx + doorWFt)} y2={px(wallY)} stroke="#ffffff" strokeWidth={3.4} />
        <line x1={px(hx)} y1={px(wallY)} x2={px(tipx)} y2={px(tipy)} stroke={COL.door} strokeWidth={2.2} />
        <path d={swingPath(px(hx), px(wallY), px(doorWFt), px(tipx), px(tipy), px(jx), px(wallY))} fill="none" stroke={COL.doorArc} strokeWidth={1} strokeDasharray="3 2" />
        <text x={px(dOx + doorWFt / 2)} y={px(wallY) + into * 9} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={COL.door}>D</text>

        {/* offset dimensions from the LEFT corner (feet), inside the room near the wall */}
        <OffsetDim x0={px(p.x0)} x1={px(wOx)} y={px(insA)} label={ftIn(p.winFromLeft)} />
        <OffsetDim x0={px(p.x0)} x1={px(dOx)} y={px(insB)} label={ftIn(p.doorFromLeft)} />
      </g>
    );
  }

  function OffsetDim({ x0, x1, y, label }: { x0: number; x1: number; y: number; label: string }) {
    if (x1 - x0 < 4) return null;
    return (
      <g>
        <line x1={x0} y1={y} x2={x1} y2={y} stroke={COL.dimLine} strokeWidth={0.8} />
        <line x1={x0} y1={y - 3} x2={x0} y2={y + 3} stroke={COL.dimLine} strokeWidth={0.8} />
        <line x1={x1} y1={y - 3} x2={x1} y2={y + 3} stroke={COL.dimLine} strokeWidth={0.8} />
        <text x={(x0 + x1) / 2} y={y - 2} textAnchor="middle" fontSize={7} fill={COL.dim}>{label}</text>
      </g>
    );
  }

  const floorLabel = (f: number) => (f === 0 ? "Ground Floor" : f === 1 ? "First Floor" : `Floor ${f + 1}`);
  const vdimFts = hasBottom ? [verFt, ftD, ftD, verFt] : [verFt, ftD];

  return (
    <div className="space-y-4">
      {/* controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-slate-50 p-3">
        {floors > 1 && (
          <label className="text-xs font-medium text-slate-600">
            <span className="mb-1 block">Floor</span>
            <select value={floor} onChange={(e) => setFloor(Number(e.target.value))}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm">
              {Array.from({ length: floors }, (_, f) => (
                <option key={f} value={f}>{floorLabel(f)}</option>
              ))}
            </select>
          </label>
        )}
        <NumField label="Veranda / walkway (ft)" value={verFt} step={0.5} min={2} onChange={(v) => setTop({ verandaWidthFt: v })} />
        <NumField label="Door width (ft)" value={doorWFt} step={0.5} min={2} onChange={(v) => setTop({ doorWidthFt: v })} />
        <NumField label="Window width (ft)" value={winWFt} step={0.5} min={1.5} onChange={(v) => setTop({ windowWidthFt: v })} />
        <div className="ml-auto text-[11px] text-slate-500">
          {rpf} rooms/floor · {topCount} top{hasBottom ? ` + ${bottomCount} bottom` : ""} · veranda {hasBottom ? "both sides" : "front"}
        </div>
      </div>

      {/* drawing */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <div className="font-display font-bold text-sm text-slate-800">Room-wise Floor Plan — {floorLabel(floor)}</div>
            <div className="text-xs text-slate-500">
              {loNo != null ? `Rooms ${loNo}–${hiNo}` : "No rooms"} · overall {ftIn(blockWFt)} × {ftIn(contentHFt)} · doors swing into rooms
            </div>
          </div>
          <div className="text-[10px] text-slate-400">Feet-inches · schematic construction reference</div>
        </div>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: svgW }}>
            <g transform={`translate(${PAD},${PAD})`}>
              {/* verandas (walkways) */}
              {[yTopVer, ...(hasBottom ? [yBotVer] : [])].map((vy, i) => (
                <g key={i}>
                  <rect x={px(OX)} y={px(vy)} width={px(blockWFt)} height={px(verFt)} fill={COL.veranda} stroke={COL.wall} strokeWidth={1.2} />
                  <text x={px(OX + blockWFt / 2)} y={px(vy + verFt / 2) + 3} textAnchor="middle" fontSize={Math.max(8, S * 0.6)} fontWeight={700} fill={COL.stairStroke} letterSpacing={2}>
                    VERANDA
                  </text>
                </g>
              ))}

              {/* staircases: right serves the top row; left serves the bottom row (opposite ends) */}
              <Stair x={OX + blockWFt} y={yTopRow} w={stairFt} h={ftD} px={px} />
              {hasBottom && <Stair x={0} y={yBotRow} w={stairFt} h={ftD} px={px} />}

              {/* room bodies */}
              {placed.map((p) => <RoomBody key={`body-${p.no}`} p={p} />)}

              {/* bold building outline (block) — before the openings pass */}
              <rect x={px(OX)} y={px(yTopRow)} width={px(blockWFt)} height={px(rowSpanFt)} fill="none" stroke={COL.wall} strokeWidth={2.4} />

              {/* openings LAST so door/window openings paint over the outline */}
              {placed.map((p) => <RoomOpenings key={`op-${p.no}`} p={p} />)}

              {/* top dimension string: per-room widths + total */}
              <DimRow y={-26} x0={px(OX)} seg={ftW} count={maxCols} px={px} label={ftIn(ftW)} />
              <text x={px(OX + blockWFt / 2)} y={-40} textAnchor="middle" fontSize={9} fontWeight={700} fill={COL.dim}>
                {ftIn(blockWFt)} overall
              </text>

              {/* left vertical dimension string */}
              <VDim x={-30} fts={vdimFts} px={px} />
            </g>
          </svg>
        </div>

        <Legend />
      </div>

      {/* editable room schedule — shift door/window along the wall, per room */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-2 font-display font-bold text-sm text-slate-800">
          Room-wise door &amp; window schedule — {floorLabel(floor)}
        </div>
        <div className="text-[11px] text-slate-500 mb-3">
          Distances are measured in feet from each room&apos;s <b>left corner</b> to the opening&apos;s near edge.
          Change a value to shift that door/window along the veranda wall.
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-1.5 pr-2">Room</th>
                <th className="py-1.5 pr-2">Size</th>
                <th className="py-1.5 pr-2">Window @ (ft)</th>
                <th className="py-1.5 pr-2">Door @ (ft)</th>
                <th className="py-1.5 pr-2">Door swing</th>
              </tr>
            </thead>
            <tbody>
              {allNums.map((no) => {
                const { doorFromLeft, winFromLeft, hinge } = openingOf(no);
                return (
                  <tr key={no} className="border-b last:border-0">
                    <td className="py-1.5 pr-2 font-semibold text-slate-700">ROOM {no}</td>
                    <td className="py-1.5 pr-2 text-slate-500">{ftIn(ftW)} × {ftIn(ftD)}</td>
                    <td className="py-1.5 pr-2">
                      <ScheduleNum value={winFromLeft} max={Math.max(0, ftW - winWFt)} onChange={(v) => setRoom(no, { windowFromLeftFt: v })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <ScheduleNum value={doorFromLeft} max={Math.max(0, ftW - doorWFt)} onChange={(v) => setRoom(no, { doorFromLeftFt: v })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
                        {(["left", "right"] as const).map((h) => (
                          <button key={h} type="button" onClick={() => setRoom(no, { doorHinge: h })}
                            className={`px-2 py-1 text-[11px] ${hinge === h ? "bg-amber-100 font-semibold text-amber-800" : "bg-white text-slate-500 hover:text-slate-700"}`}>
                            {h === "left" ? "Hinge L" : "Hinge R"}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- staircase block ---------- */
function Stair({ x, y, w, h, px }: { x: number; y: number; w: number; h: number; px: (ft: number) => number }) {
  const steps = 7;
  const sx = px(x), sy = px(y), sw = px(w), sh = px(h);
  return (
    <g>
      <rect x={sx} y={sy} width={sw} height={sh} fill={COL.stair} stroke={COL.stairStroke} strokeWidth={1.4} />
      {Array.from({ length: steps }, (_, i) => (
        <line key={i} x1={sx} y1={sy + (sh * (i + 1)) / (steps + 1)} x2={sx + sw} y2={sy + (sh * (i + 1)) / (steps + 1)} stroke={COL.stairStroke} strokeWidth={0.7} />
      ))}
      <text x={sx + sw / 2} y={sy + sh / 2} textAnchor="middle" fontSize={9} fontWeight={700} fill={COL.stairStroke}
        transform={`rotate(-90 ${sx + sw / 2} ${sy + sh / 2})`} letterSpacing={1}>
        STAIRCASE
      </text>
    </g>
  );
}

/* ---------- horizontal dimension string (equal segments) ---------- */
function DimRow({ y, x0, seg, count, px, label }: { y: number; x0: number; seg: number; count: number; px: (ft: number) => number; label: string }) {
  const w = px(seg);
  return (
    <g>
      {Array.from({ length: count + 1 }, (_, i) => (
        <line key={i} x1={x0 + i * w} y1={y - 4} x2={x0 + i * w} y2={y + 4} stroke={COL.dimLine} strokeWidth={0.9} />
      ))}
      <line x1={x0} y1={y} x2={x0 + count * w} y2={y} stroke={COL.dimLine} strokeWidth={0.9} />
      {Array.from({ length: count }, (_, i) => (
        <text key={i} x={x0 + (i + 0.5) * w} y={y - 5} textAnchor="middle" fontSize={7.5} fill={COL.dim}>{label}</text>
      ))}
    </g>
  );
}

/* ---------- vertical dimension string (stacked bands) ---------- */
function VDim({ x, fts, px }: { x: number; fts: number[]; px: (ft: number) => number }) {
  let acc = 0;
  return (
    <g>
      {fts.map((ft, i) => {
        const y0 = px(acc);
        acc += ft;
        const y1 = px(acc);
        const cy = (y0 + y1) / 2;
        return (
          <g key={i}>
            <line x1={x} y1={y0} x2={x} y2={y1} stroke={COL.dimLine} strokeWidth={0.9} />
            <line x1={x - 4} y1={y0} x2={x + 4} y2={y0} stroke={COL.dimLine} strokeWidth={0.9} />
            <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke={COL.dimLine} strokeWidth={0.9} />
            <text x={x - 6} y={cy} textAnchor="middle" fontSize={7.5} fill={COL.dim} transform={`rotate(-90 ${x - 6} ${cy})`}>
              {ftIn(ft)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
      <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm border" style={{ background: COL.veranda, borderColor: COL.verandaHatch }} /> Veranda / walkway</span>
      <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm border" style={{ background: COL.stair, borderColor: COL.stairStroke }} /> Staircase</span>
      <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4" style={{ background: COL.door }} /> Door + swing (D)</span>
      <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 border" style={{ background: COL.windowFill, borderColor: COL.window }} /> Window (W)</span>
      <span className="text-slate-400">Not to scale — schematic</span>
    </div>
  );
}

/* ---------- control-bar number field ---------- */
function NumField({ label, value, step, min, onChange }: { label: string; value: number; step: number; min: number; onChange: (v: number) => void }) {
  return (
    <label className="text-xs font-medium text-slate-600">
      <span className="mb-1 block">{label}</span>
      <input type="number" inputMode="decimal" step={step} min={min} value={r1(value)}
        onChange={(e) => onChange(Math.max(min, parseFloat(e.target.value) || min))}
        onFocus={(e) => e.currentTarget.select()}
        className="h-8 w-28 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
    </label>
  );
}

/* ---------- schedule offset input (clamped to the wall) ---------- */
function ScheduleNum({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <input type="number" inputMode="decimal" step={0.5} min={0} max={r1(max)} value={r1(value)}
      onChange={(e) => onChange(clamp(parseFloat(e.target.value) || 0, 0, max))}
      onFocus={(e) => e.currentTarget.select()}
      className="h-7 w-20 rounded-md border border-slate-300 bg-white px-2 text-center text-xs outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
  );
}
