"use client";

import { useState } from "react";
import type { LabourColonyResult, RoomFloorPlanConfig, RoomOpeningOverride, RoomDoor, RoomWall, StaircaseDrawConfig, VerandaDrawConfig } from "@/lib/quotation/labourColony";
import {
  buildRoomFloorPlan, resolveStair, effectiveStaircases, effectiveVerandas,
  type FPRoom, type FPDoor, type FPStair, type FPVeranda, type FPBand,
} from "@/lib/quotation/roomFloorPlan";
import {
  LENGTH_UNITS, type LengthUnit,
  formatLen, unitSuffix, unitStep, toUnit, fromUnit, toFeetInches, fromFeetInches,
} from "@/lib/quotation/units";

/**
 * Room-wise construction FLOOR PLAN — live, fully-customizable & unit-aware.
 *
 * Two rows of room modules back-to-back, each opening onto its own peripheral VERANDA,
 * with a 100%-customizable STAIRCASE (width, run, steps, tread, riser, gap, landing,
 * side, slide-offset, entry side, up direction). Every dimension can be shown & entered
 * in feet / feet-inches / metres / centimetres / millimetres, and the drawing — including
 * the TOTAL COLONY length & width, panel/wall thickness, corridor width and staircase
 * dimensions — updates live. Drawing only: never changes quantities or the BOQ.
 */

const M2FT = 3.280839895;
const COL = {
  wall: "#0f172a",
  wallBand: "#e2e8f0",
  room: "#ffffff",
  veranda: "#fef9c3",
  verandaHatch: "#facc15",
  stair: "#fde68a",
  stairStroke: "#b45309",
  stairTread: "#c9a100",
  landing: "#fcd34d",
  door: "#c026d3",
  doorArc: "#e879f9",
  window: "#dc2626",
  windowFill: "#fee2e2",
  dim: "#475569",
  dimLine: "#94a3b8",
  overall: "#0369a1",
  rail: "#059669",
  ink: "#0f172a",
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Font size (px) that makes `text` fit within `maxW` px (≈0.56 em per char). Returns null when
 *  that would be below `min` — so callers can HIDE illegible labels instead of overlapping them
 *  (long millimetre strings are the usual culprit). */
function fitFont(text: string, maxW: number, base: number, min: number): number | null {
  const size = Math.min(base, maxW / (Math.max(1, text.length) * 0.56));
  return size >= min ? size : null;
}

interface Props {
  result: LabourColonyResult;
  floorPlan?: RoomFloorPlanConfig;
  onChange: (next: RoomFloorPlanConfig) => void;
  unit: LengthUnit;
  onUnitChange: (u: LengthUnit) => void;
}

export function RoomFloorPlan({ result, floorPlan, onChange, unit, onUnitChange }: Props) {
  const fp = floorPlan ?? {};
  const floors = Math.max(1, result.config.floors);
  const totalRooms = Math.max(1, result.occupancy.rooms);
  const rpf = Math.ceil(totalRooms / floors);
  // only floors that actually contain rooms are selectable (never draw a phantom empty floor)
  const floorsWithRooms = Math.max(1, Math.min(floors, Math.ceil(totalRooms / rpf)));
  const [floor, setFloor] = useState(0);
  const floorIdx = Math.min(floor, floorsWithRooms - 1);

  const geom = buildRoomFloorPlan(result, fp, floorIdx);
  const stairList = effectiveStaircases(fp, floors);
  const verandaList = effectiveVerandas(fp, geom.hasBottom);
  const stairById = new Map(geom.stairs.map((s) => [s.id, s]));

  const fmt = (m: number) => formatLen(m, unit);

  /* ---------- scale ---------- */
  const { minX, minY, maxX, maxY } = geom.bounds;
  const spanX = Math.max(0.5, maxX - minX);
  const spanY = Math.max(0.5, maxY - minY);
  const S = clamp(820 / spanX, 6, 26); // px per metre
  const PAD = 74;
  const X = (m: number) => (m - minX) * S;
  const Y = (m: number) => (m - minY) * S;
  const L = (m: number) => m * S;
  const svgW = spanX * S + PAD * 2;
  const svgH = spanY * S + PAD * 2 + 24;

  /* ---------- setters (unit-aware; legacy opening/veranda fields stay in FEET) ---------- */
  const setTop = (patch: Partial<RoomFloorPlanConfig>) => onChange({ ...fp, ...patch });
  const setRoom = (no: number, patch: Partial<RoomOpeningOverride>) =>
    onChange({ ...fp, rooms: { ...(fp.rooms ?? {}), [no]: { ...(fp.rooms?.[no] ?? {}), ...patch } } });
  const setStairs = (list: StaircaseDrawConfig[]) => onChange({ ...fp, staircases: list, staircase: undefined });
  const setVerandas = (list: VerandaDrawConfig[]) => onChange({ ...fp, verandas: list });

  const floorLabel = (f: number) => (f === 0 ? "Ground Floor" : f === 1 ? "First Floor" : `Floor ${f + 1}`);

  return (
    <div className="space-y-4">
      {/* ============ TOP CONTROL BAR ============ */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-slate-50 p-3">
        <label className="text-xs font-medium text-slate-600">
          <span className="mb-1 block">Units (all dimensions)</span>
          <select value={unit} onChange={(e) => onUnitChange(e.target.value as LengthUnit)}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm">
            {LENGTH_UNITS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </label>
        {floorsWithRooms > 1 && (
          <label className="text-xs font-medium text-slate-600">
            <span className="mb-1 block">Floor</span>
            <select value={floorIdx} onChange={(e) => setFloor(Number(e.target.value))}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm">
              {Array.from({ length: floorsWithRooms }, (_, f) => <option key={f} value={f}>{floorLabel(f)}</option>)}
            </select>
          </label>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-md bg-sky-50 px-2 py-1 font-semibold text-sky-700">
            Total colony: {fmt(geom.totalLengthM)} L × {fmt(geom.totalWidthM)} W
          </span>
          <span className="text-slate-500">
            {geom.rpf} rooms/floor · block {fmt(geom.blockWM)} × {fmt(geom.blockDM)}
          </span>
        </div>
      </div>

      {/* ============ ROOM / LAYOUT CONTROLS ============ */}
      <div className="rounded-xl border bg-white p-3">
        <div className="mb-2 text-xs font-semibold text-slate-700">Room, panel &amp; corridor</div>
        <div className="flex flex-wrap gap-3">
          <LenField label="Corridor / veranda" m={geom.verandaM} unit={unit} min={0.6}
            onChange={(m) => setTop({ verandaWidthFt: r1(m * M2FT) })} />
          <LenField label="Wall / panel thickness" m={geom.wallM} unit={unit} min={0.02} preferMm
            onChange={(m) => setTop({ wallThicknessMm: Math.round(m * 1000) })} />
          <LenField label="Spacing between rooms" m={geom.roomGapM} unit={unit} min={0}
            onChange={(m) => setTop({ roomGapM: Math.max(0, r1m(m)) })} />
          <LenField label="Door width" m={(fp.doorWidthFt ?? 3) / M2FT} unit={unit} min={0.4}
            onChange={(m) => setTop({ doorWidthFt: r1(m * M2FT) })} />
          <LenField label="Door height" m={fp.doorHeightM ?? 2.0} unit={unit} min={1.5}
            onChange={(m) => setTop({ doorHeightM: r1m(m) })} />
          <LenField label="Window width" m={(fp.windowWidthFt ?? 4) / M2FT} unit={unit} min={0.5}
            onChange={(m) => setTop({ windowWidthFt: r1(m * M2FT) })} />
          <label className="text-xs font-medium text-slate-600">
            <span className="mb-1 block">Door side (default)</span>
            <select value={fp.doorSide ?? "external"} onChange={(e) => setTop({ doorSide: e.target.value as "external" | "internal" })}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-amber-400">
              <option value="external">External (veranda)</option>
              <option value="internal">Internal (spine)</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            <span className="mb-1 block">Door swing (default)</span>
            <select value={fp.doorSwing ?? "in"} onChange={(e) => setTop({ doorSwing: e.target.value as "in" | "out" })}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-amber-400">
              <option value="in">Swings in</option>
              <option value="out">Swings out</option>
            </select>
          </label>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <label className="flex items-center gap-1.5">
            Min clearance (corner &amp; door↔window)
            <select value={fp.minClearanceM ?? 0.1524} onChange={(e) => setTop({ minClearanceM: Number(e.target.value) })}
              className="h-7 rounded-md border border-slate-300 bg-white px-1.5 text-xs">
              <option value={0.1524}>6 inches</option>
              <option value={0.3048}>1 foot</option>
            </select>
          </label>
          <span className="text-[11px] text-slate-400">Safety railing is now per-veranda (toggle it on each veranda below).</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          Door &amp; window <b>width</b>, door <b>height</b> and corridor here are colony defaults; set <b>per-room</b> door width/height/position (in {LENGTH_UNITS.find((u) => u.id === unit)?.short}) in the schedule below. Openings are kept off partitions and apart by the min clearance. Room size &amp; corridor side are on the left panel.
        </div>
      </div>

      {/* ============ STAIRCASE MANAGER ============ */}
      <StairManager list={stairList} unit={unit} floors={floors} verandaM={geom.verandaM}
        cfg={result.config} fmt={fmt} stairById={stairById} onChange={setStairs} />

      {/* ============ VERANDA / CORRIDOR MANAGER ============ */}
      <VerandaManager list={verandaList} unit={unit} verandaM={geom.verandaM} onChange={setVerandas} />

      {/* overlap warnings */}
      {geom.overlaps.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-800">
          <b>⚠ Overlap:</b> {geom.overlaps.join("; ")}. Move (shift x/y), resize, or change the side to resolve — staircases are already kept clear of the rooms automatically.
        </div>
      )}

      {/* ============ DRAWING ============ */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <div className="font-display font-bold text-sm text-slate-800">Room-wise Floor Plan — {floorLabel(floorIdx)}</div>
            <div className="text-xs text-slate-500">
              {geom.loNo != null ? `Rooms ${geom.loNo}–${geom.hiNo}` : "No rooms"} · total colony {fmt(geom.totalLengthM)} × {fmt(geom.totalWidthM)} · doors swing into rooms
            </div>
          </div>
          <div className="text-[10px] text-slate-400">{LENGTH_UNITS.find((u) => u.id === unit)?.label} · schematic construction reference</div>
        </div>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 1100) }}>
            <defs>
              <pattern id="rfp-veranda" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width={9} height={9} fill={COL.veranda} />
                <line x1={0} y1={0} x2={0} y2={9} stroke={COL.verandaHatch} strokeWidth={1} />
              </pattern>
            </defs>
            <g transform={`translate(${PAD},${PAD})`}>
              {/* verandas / corridors — each drawn separately with its own label */}
              {geom.verandas.map((v) => {
                const horiz = v.side === "top" || v.side === "bottom";
                const cx = X(v.x + v.w / 2), cy = Y(v.y + v.d / 2);
                const depth = horiz ? v.d : v.w;
                return (
                  <g key={`ver-${v.id}`}>
                    <rect x={X(v.x)} y={Y(v.y)} width={L(v.w)} height={L(v.d)} fill="url(#rfp-veranda)" stroke={COL.wall} strokeWidth={1.1} />
                    <text x={cx} y={cy + (horiz ? 3 : 0)} textAnchor="middle" dominantBaseline="middle" fontSize={Math.max(7.5, S * 0.3)} fontWeight={700}
                      fill={COL.stairStroke} letterSpacing={2} transform={horiz ? undefined : `rotate(-90 ${cx} ${cy})`}>
                      {v.label.toUpperCase()} · {fmt(depth)}
                    </text>
                  </g>
                );
              })}

              {/* staircases */}
              {geom.stairs.map((s) => <StairGlyph key={`stair-${s.id}`} s={s} X={X} Y={Y} L={L} S={S} fmt={fmt} />)}

              {/* room bodies (with wall/panel band) */}
              {geom.rooms.map((p) => <RoomBody key={`body-${p.no}`} p={p} wallM={geom.wallM} X={X} Y={Y} L={L} S={S} fmt={fmt} />)}

              {/* bold building outline (room block, excludes verandas beyond it & staircases) */}
              <rect x={X(0)} y={Y(0)} width={L(geom.blockWM)} height={L(geom.blockDM)} fill="none" stroke={COL.wall} strokeWidth={2.4} />

              {/* per-veranda safety railing along the open (outer) edge */}
              {geom.verandas.filter((v) => v.railing).map((v) => <VerandaRailing key={`rail-${v.id}`} v={v} X={X} Y={Y} L={L} />)}

              {/* openings drawn last so they paint over the outline */}
              {geom.rooms.map((p) => <RoomOpenings key={`op-${p.no}`} p={p} X={X} Y={Y} L={L} S={S} fmt={fmt} />)}

              {/* panel / wall thickness callout on the first room */}
              {(fp.showPanelDims ?? true) && geom.rooms[0] && (
                <PanelDim p={geom.rooms[0]} wallM={geom.wallM} X={X} Y={Y} L={L} fmt={fmt} />
              )}

              {/* width dimension chain (top) + overall */}
              <WidthChain bands={geom.widthBands} totalM={geom.totalLengthM} X={X} L={L} fmt={fmt} />

              {/* depth dimension chain (left) */}
              <DepthChain bands={geom.depthBands} totalM={geom.totalWidthM} Y={Y} L={L} fmt={fmt} />
            </g>
          </svg>
        </div>

        <Legend />
      </div>

      {/* ============ ROOM SCHEDULE ============ */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-2 font-display font-bold text-sm text-slate-800">Room-wise schedule &amp; door editor — {floorLabel(floorIdx)}</div>
        <div className="mb-3 text-[11px] text-slate-500">
          Per-room size, window &amp; <b>doors</b>. Each room can have <b>any number of doors</b> on any wall — <b>Upper / Lower / Left / Right</b> — with its own <b>width, height, offset, hinge</b> &amp; <b>swing (in/out)</b>. Offsets are from the wall&apos;s start corner; the <b>distance from the nearest corner</b> is shown per door and on the plan. Doors auto-keep the minimum clearance from the window, other doors, wall corners/partitions &amp; staircases. All in {LENGTH_UNITS.find((u) => u.id === unit)?.label.toLowerCase()}; ↺ resets to the colony default.
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-1.5 pr-2">Room</th>
                <th className="py-1.5 pr-2">Length</th>
                <th className="py-1.5 pr-2">Depth</th>
                <th className="py-1.5 pr-2">Window @</th>
                <th className="py-1.5 pr-2 text-fuchsia-700">Doors (wall · W · H · offset · hinge · swing)</th>
              </tr>
            </thead>
            <tbody>
              {geom.rooms.slice().sort((a, b) => a.no - b.no).map((p) => (
                <RoomRow key={p.no} p={p} fp={fp} unit={unit} swingDefault={fp.doorSwing === "out" ? "out" : "in"}
                  onLen={(m) => setRoom(p.no, { lengthM: m })}
                  onDepth={(m) => setRoom(p.no, { depthM: m })}
                  onWin={(m) => setRoom(p.no, { windowFromLeftFt: r1(m * M2FT) })}
                  onDoors={(list) => setRoom(p.no, { doors: list })} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* round metres to a sensible precision */
function r1m(m: number) { return Math.round(m * 1000) / 1000; }

/* ================================================================== glyphs */

function RoomBody({ p, wallM, X, Y, L, S, fmt }: {
  p: FPRoom; wallM: number; X: (m: number) => number; Y: (m: number) => number; L: (m: number) => number; S: number; fmt: (m: number) => string;
}) {
  const rx = X(p.x), ry = Y(p.y), rw = L(p.w), rh = L(p.d);
  const inset = Math.min(L(wallM), rw / 3, rh / 3);
  return (
    <g>
      {/* wall band (outer) + clear room (inner) */}
      <rect x={rx} y={ry} width={rw} height={rh} fill={COL.wallBand} stroke={COL.wall} strokeWidth={1.6} />
      <rect x={rx + inset} y={ry + inset} width={rw - 2 * inset} height={rh - 2 * inset} fill={COL.room} stroke={COL.wall} strokeWidth={0.6} />
      {(() => {
        const name = `ROOM ${p.no}`;
        const size = `${fmt(p.w)} × ${fmt(p.d)}`;
        const nameFs = fitFont(name, rw - 6, Math.max(8, S * 0.34), 5) ?? 5;
        const sizeFs = fitFont(size, rw - 6, 8.5, 4.4);
        // Bias the caption block AWAY from the opening (veranda-facing) wall so it can
        // never collide with the door/window offset dims hanging inside that wall.
        const midY = ry + rh / 2 + p.into * Math.min(rh * 0.15, 16);
        return (
          <>
            <text x={rx + rw / 2} y={midY - 3} textAnchor="middle" fontSize={nameFs} fontWeight={700} fill={COL.ink}>{name}</text>
            {sizeFs != null && (
              <text x={rx + rw / 2} y={midY + 11} textAnchor="middle" fontSize={sizeFs} fill={COL.dim}>{size}</text>
            )}
          </>
        );
      })()}
    </g>
  );
}

/* door swing arc as a sampled polyline (always geometrically correct) */
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

function RoomOpenings({ p, X, Y, L, fmt }: {
  p: FPRoom; X: (m: number) => number; Y: (m: number) => number; L: (m: number) => number; S: number; fmt: (m: number) => string;
}) {
  const wallY = Y(p.wallY);          // window wall (external, veranda-facing)
  const into = p.into;
  const wOx = p.x + p.winFromLeftM;
  const winW = L(p.winWM);
  const windowWall: RoomWall = p.row === "top" ? "top" : "bottom";
  const rx = X(p.x), ry = Y(p.y), rw = L(p.w), rh = L(p.d);
  // stagger each opening's dimension tiers per wall so their labels don't stack on top of each other
  const tierOnWall: Partial<Record<RoomWall, number>> = {};
  return (
    <g>
      {/* WINDOW (always on the external/veranda wall) */}
      <rect x={X(wOx)} y={wallY - 2.4} width={winW} height={4.8} fill={COL.windowFill} stroke={COL.window} strokeWidth={1.4} />
      <line x1={X(wOx)} y1={wallY} x2={X(wOx) + winW} y2={wallY} stroke={COL.window} strokeWidth={1} />
      <text x={X(wOx) + winW / 2} y={wallY + into * 9} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={COL.window}>W</text>
      <OffsetDim x0={X(p.x)} x1={X(wOx)} y={wallY + into * 12} label={fmt(p.winFromLeftM)} />

      {/* DOORS — any number, any wall, hinge start/end, swing in/out */}
      {p.doors.map((d, i) => {
        const tier = (tierOnWall[d.wall] = (tierOnWall[d.wall] ?? -1) + 1);
        return (
          <DoorGlyph key={d.id || i} d={d} n={p.doors.length > 1 ? i + 1 : 0} tier={tier}
            windowWall={windowWall} rx={rx} ry={ry} rw={rw} rh={rh} L={L} fmt={fmt} />
        );
      })}
    </g>
  );
}

/** One fully-resolved door: opening + leaf + swing arc on any of the 4 walls, plus its
 *  width, height, offset-from-nearest-corner and opening direction (IN/OUT) labels. */
function DoorGlyph({ d, n, tier, windowWall, rx, ry, rw, rh, L, fmt }: {
  d: FPDoor; n: number; tier: number; windowWall: RoomWall;
  rx: number; ry: number; rw: number; rh: number; L: (m: number) => number; fmt: (m: number) => string;
}) {
  const horiz = d.wall === "top" || d.wall === "bottom";
  const dwPx = L(d.widthM);
  const wy = d.wall === "top" ? ry : ry + rh;   // wall line for horizontal walls
  const wx = d.wall === "left" ? rx : rx + rw;  // wall line for vertical walls
  const into = d.wall === "top" || d.wall === "left" ? 1 : -1; // interior normal sign
  const posPx = L(d.posM);
  // opening endpoints A (near/start-corner side) & B (far side) in screen space
  const A: [number, number] = horiz ? [rx + posPx, wy] : [wx, ry + posPx];
  const B: [number, number] = horiz ? [rx + posPx + dwPx, wy] : [wx, ry + posPx + dwPx];
  const s = d.swing === "in" ? 1 : -1;
  const hinge = d.hinge === "start" ? A : B;
  const jamb = d.hinge === "start" ? B : A;
  const tip: [number, number] = horiz ? [hinge[0], hinge[1] + into * s * dwPx] : [hinge[0] + into * s * dwPx, hinge[1]];
  const mid: [number, number] = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  const label: [number, number] = horiz ? [mid[0], mid[1] + into * 10] : [mid[0] + into * 10, mid[1]];
  const col = d.overlap ? "#dc2626" : COL.door;
  // dimension tiers (drawn INTO the room, stacked; a window-wall door sits below the window's dim)
  const level = (d.wall === windowWall ? 1 : 0) + tier;
  const offOff = 12 + level * 22, widOff = 22 + level * 22;
  const nearIsStart = d.fromStartM <= d.fromEndM;
  const capY = horiz ? label[1] + (into > 0 ? 8 : -8) : label[1] + 8;
  return (
    <g>
      {/* opening gap + leaf + swing arc */}
      <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke="#ffffff" strokeWidth={3.6} />
      <line x1={hinge[0]} y1={hinge[1]} x2={tip[0]} y2={tip[1]} stroke={col} strokeWidth={2.2} />
      <path d={swingPath(hinge[0], hinge[1], dwPx, tip[0], tip[1], jamb[0], jamb[1])} fill="none" stroke={COL.doorArc} strokeWidth={1} strokeDasharray="3 2" />
      {/* label + W×H + opening direction */}
      <text x={label[0]} y={label[1]} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={col}>D{n || ""}</text>
      <text x={label[0]} y={capY} textAnchor="middle" fontSize={5.3} fill={col}>{fmt(d.widthM)}×{fmt(d.heightM)} · {d.swing === "in" ? "IN" : "OUT"}</text>
      {/* offset-from-NEAREST-corner dim + width dim */}
      {horiz ? (
        <>
          <OffsetDim x0={nearIsStart ? rx : B[0]} x1={nearIsStart ? A[0] : rx + rw} y={wy + into * offOff} label={fmt(d.fromNearCornerM)} />
          <OffsetDim x0={A[0]} x1={B[0]} y={wy + into * widOff} label={fmt(d.widthM)} color={col} />
        </>
      ) : (
        <>
          <VDim y0={nearIsStart ? ry : B[1]} y1={nearIsStart ? A[1] : ry + rh} x={wx + into * offOff} label={fmt(d.fromNearCornerM)} />
          <VDim y0={A[1]} y1={B[1]} x={wx + into * widOff} label={fmt(d.widthM)} color={col} />
        </>
      )}
    </g>
  );
}

function OffsetDim({ x0, x1, y, label, color }: { x0: number; x1: number; y: number; label: string; color?: string }) {
  if (Math.abs(x1 - x0) < 4) return null;
  const a = Math.min(x0, x1), b = Math.max(x0, x1);
  const line = color ?? COL.dimLine;
  return (
    <g>
      <line x1={a} y1={y} x2={b} y2={y} stroke={line} strokeWidth={0.8} />
      <line x1={a} y1={y - 3} x2={a} y2={y + 3} stroke={line} strokeWidth={0.8} />
      <line x1={b} y1={y - 3} x2={b} y2={y + 3} stroke={line} strokeWidth={0.8} />
      <text x={(a + b) / 2} y={y - 2} textAnchor="middle" fontSize={Math.min(7, Math.max(4.6, Math.max(b - a, 34) / (label.length * 0.56)))} fill={color ?? COL.dim}>{label}</text>
    </g>
  );
}

/** Vertical offset/width dimension (for doors on the left/right walls) — rotated label. */
function VDim({ y0, y1, x, label, color }: { y0: number; y1: number; x: number; label: string; color?: string }) {
  if (Math.abs(y1 - y0) < 4) return null;
  const a = Math.min(y0, y1), b = Math.max(y0, y1);
  const line = color ?? COL.dimLine;
  const cy = (a + b) / 2;
  return (
    <g>
      <line x1={x} y1={a} x2={x} y2={b} stroke={line} strokeWidth={0.8} />
      <line x1={x - 3} y1={a} x2={x + 3} y2={a} stroke={line} strokeWidth={0.8} />
      <line x1={x - 3} y1={b} x2={x + 3} y2={b} stroke={line} strokeWidth={0.8} />
      <text x={x - 2} y={cy} textAnchor="middle" fontSize={Math.min(7, Math.max(4.6, Math.max(b - a, 34) / (label.length * 0.56)))}
        fill={color ?? COL.dim} transform={`rotate(-90 ${x - 2} ${cy})`}>{label}</text>
    </g>
  );
}

/** Full staircase glyph: block + treads + landing + UP arrow + dimension caption. */
function StairGlyph({ s, X, Y, L, S, fmt }: {
  s: FPStair; X: (m: number) => number; Y: (m: number) => number; L: (m: number) => number; S: number; fmt: (m: number) => string;
}) {
  const sx = X(s.x), sy = Y(s.y), sw = L(s.w), sh = L(s.d);
  const vertical = s.orientation === "vertical";
  const entryLow = s.entry === "left";

  // map a run offset t (metres, from the ENTRY end) to an absolute screen coord along the run axis
  const runToScreen = (t: number) =>
    vertical
      ? (entryLow ? Y(s.y + t) : Y(s.y + s.d - t))
      : (entryLow ? X(s.x + t) : X(s.x + s.w - t));

  // landing rectangle (at the far/ascent end)
  let landing: { x: number; y: number; w: number; h: number } | null = null;
  if (s.landingM > 0) {
    if (vertical) {
      const ly = entryLow ? Y(s.y + s.runM) : Y(s.y);
      landing = { x: sx, y: ly, w: sw, h: L(s.landingM) };
    } else {
      const lx = entryLow ? X(s.x + s.runM) : X(s.x);
      landing = { x: lx, y: sy, w: L(s.landingM), h: sh };
    }
  }

  const treadLines: number[] = [];
  const seen = new Set<number>();
  for (const e of s.stepEdges) {
    for (const t of [e.a, e.b]) {
      const c = runToScreen(t);
      const key = Math.round(c * 2);
      if (!seen.has(key)) { seen.add(key); treadLines.push(c); }
    }
  }

  // UP arrow: entry (t=0) → far (t=run) for "up"; reversed for "down"
  const aFrom = s.direction === "up" ? runToScreen(0) : runToScreen(s.runM);
  const aTo = s.direction === "up" ? runToScreen(s.runM) : runToScreen(0);
  const crossMid = vertical ? sx + sw / 2 : sy + sh / 2;
  const dirSign = aTo >= aFrom ? 1 : -1;

  const cx = sx + sw / 2, cy = sy + sh / 2;
  const capLines = [
    `W ${fmt(s.widthM)} · run ${fmt(s.runM)}`,
    `${s.steps}T@${fmt(s.goingM)} · R${s.riserMm}mm${s.landingM > 0 ? ` · land ${fmt(s.landingM)}` : ""}`,
  ];
  const stroke = s.overlap ? "#dc2626" : COL.stairStroke;

  return (
    <g>
      <rect x={sx} y={sy} width={sw} height={sh} fill={COL.stair} stroke={stroke} strokeWidth={s.overlap ? 2.4 : 1.4} />
      {/* landing */}
      {landing && <rect x={landing.x} y={landing.y} width={landing.w} height={landing.h} fill={COL.landing} stroke={COL.stairStroke} strokeWidth={1} />}
      {/* treads */}
      {treadLines.map((c, i) => vertical
        ? <line key={i} x1={sx} y1={c} x2={sx + sw} y2={c} stroke={COL.stairTread} strokeWidth={0.8} />
        : <line key={i} x1={c} y1={sy} x2={c} y2={sy + sh} stroke={COL.stairTread} strokeWidth={0.8} />)}
      {/* UP arrow */}
      {vertical ? (
        <g>
          <line x1={crossMid} y1={aFrom} x2={crossMid} y2={aTo} stroke={COL.stairStroke} strokeWidth={1.4} />
          <polygon points={`${crossMid},${aTo} ${crossMid - 3.2},${aTo - dirSign * 6} ${crossMid + 3.2},${aTo - dirSign * 6}`} fill={COL.stairStroke} />
        </g>
      ) : (
        <g>
          <line x1={aFrom} y1={crossMid} x2={aTo} y2={crossMid} stroke={COL.stairStroke} strokeWidth={1.4} />
          <polygon points={`${aTo},${crossMid} ${aTo - dirSign * 6},${crossMid - 3.2} ${aTo - dirSign * 6},${crossMid + 3.2}`} fill={COL.stairStroke} />
        </g>
      )}
      {/* label */}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={Math.max(7.5, S * 0.3)} fontWeight={700}
        letterSpacing={1} fill={stroke} transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}>
        {s.label.toUpperCase()}
      </text>
      {/* compact 2-line caption — rotated alongside vertical stairs (outer side) so it never
          overflows into the rooms; stacked just below horizontal stairs. */}
      {vertical ? (() => {
        const capX = s.side === "right" ? sx + sw + 8 : sx - 8;
        return (
          <text x={capX} y={cy} textAnchor="middle" fontSize={6.5} fill={stroke} transform={`rotate(-90 ${capX} ${cy})`}>
            <tspan x={capX} dy={-4}>{capLines[0]}</tspan>
            <tspan x={capX} dy={9}>{capLines[1]}</tspan>
          </text>
        );
      })() : (
        <text x={cx} y={sy + sh + 10} textAnchor="middle" fontSize={6.5} fill={stroke}>
          <tspan x={cx} dy={0}>{capLines[0]}</tspan>
          <tspan x={cx} dy={9}>{capLines[1]}</tspan>
        </text>
      )}
    </g>
  );
}

/** Panel / wall-thickness callout on a room's left wall. */
function PanelDim({ p, wallM, X, Y, L, fmt }: {
  p: FPRoom; wallM: number; X: (m: number) => number; Y: (m: number) => number; L: (m: number) => number; fmt: (m: number) => string;
}) {
  const x0 = X(p.x), x1 = X(p.x) + L(wallM);
  // Anchor near the NON-opening (spine) wall corner — clear of the opening dims (which hang
  // off the veranda wall) AND of the room caption (biased toward the room centre).
  const y = Y(p.y) + (p.into > 0 ? L(p.d) - 10 : 10);
  return (
    <g>
      <line x1={x0} y1={y - 8} x2={x0} y2={y + 8} stroke={COL.overall} strokeWidth={0.8} />
      <line x1={x1} y1={y - 8} x2={x1} y2={y + 8} stroke={COL.overall} strokeWidth={0.8} />
      <text x={x1 + 3} y={y + 3} fontSize={7} fill={COL.overall}>panel {fmt(wallM)}</text>
    </g>
  );
}

/* ============================================================ dim chains */

function WidthChain({ bands, totalM, X, L, fmt }: {
  bands: FPBand[]; totalM: number; X: (m: number) => number; L: (m: number) => number; fmt: (m: number) => string;
}) {
  if (!bands.length) return null;
  const y = -22, yOvr = -44;
  const start = bands[0].start;
  const end = bands[bands.length - 1].start + bands[bands.length - 1].len;
  const bounds = [start, ...bands.map((b) => b.start + b.len)];
  return (
    <g>
      <line x1={X(start)} y1={y} x2={X(end)} y2={y} stroke={COL.dimLine} strokeWidth={0.9} />
      {bounds.map((b, i) => <line key={i} x1={X(b)} y1={y - 4} x2={X(b)} y2={y + 4} stroke={COL.dimLine} strokeWidth={0.9} />)}
      {bands.map((b, i) => {
        const label = `${b.kind === "gap" ? "gap " : ""}${fmt(b.len)}`;
        const fs = fitFont(label, L(b.len) + 8, 7.5, 4.6); // fit the band; hide when illegible
        if (fs == null) return null;
        return (
          <text key={i} x={X(b.start + b.len / 2)} y={y - 5} textAnchor="middle" fontSize={fs}
            fill={b.kind === "stair" ? COL.stairStroke : COL.dim}>
            {label}
          </text>
        );
      })}
      {/* overall */}
      <line x1={X(start)} y1={yOvr} x2={X(end)} y2={yOvr} stroke={COL.overall} strokeWidth={1} />
      <line x1={X(start)} y1={y} x2={X(start)} y2={yOvr} stroke={COL.overall} strokeWidth={0.6} />
      <line x1={X(end)} y1={y} x2={X(end)} y2={yOvr} stroke={COL.overall} strokeWidth={0.6} />
      <text x={(X(start) + X(end)) / 2} y={yOvr - 4} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={COL.overall}>
        {fmt(totalM)} TOTAL COLONY LENGTH
      </text>
    </g>
  );
}

function DepthChain({ bands, totalM, Y, L, fmt }: {
  bands: FPBand[]; totalM: number; Y: (m: number) => number; L: (m: number) => number; fmt: (m: number) => string;
}) {
  if (!bands.length) return null;
  const x = -26, xOvr = -48;
  const start = bands[0].start;
  const end = bands[bands.length - 1].start + bands[bands.length - 1].len;
  const bounds = [start, ...bands.map((b) => b.start + b.len)];
  return (
    <g>
      <line x1={x} y1={Y(start)} x2={x} y2={Y(end)} stroke={COL.dimLine} strokeWidth={0.9} />
      {bounds.map((b, i) => <line key={i} x1={x - 4} y1={Y(b)} x2={x + 4} y2={Y(b)} stroke={COL.dimLine} strokeWidth={0.9} />)}
      {bands.map((b, i) => {
        const cy = Y(b.start + b.len / 2);
        const label = fmt(b.len);
        const fs = fitFont(label, L(b.len) + 8, 7.5, 4.6); // fit the band; hide when illegible
        if (fs == null) return null;
        return (
          <text key={i} x={x - 6} y={cy} textAnchor="middle" fontSize={fs}
            fill={b.kind === "stair" ? COL.stairStroke : COL.dim} transform={`rotate(-90 ${x - 6} ${cy})`}>
            {label}
          </text>
        );
      })}
      {/* overall */}
      <line x1={xOvr} y1={Y(start)} x2={xOvr} y2={Y(end)} stroke={COL.overall} strokeWidth={1} />
      <line x1={x} y1={Y(start)} x2={xOvr} y2={Y(start)} stroke={COL.overall} strokeWidth={0.6} />
      <line x1={x} y1={Y(end)} x2={xOvr} y2={Y(end)} stroke={COL.overall} strokeWidth={0.6} />
      <text x={xOvr - 6} y={(Y(start) + Y(end)) / 2} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={COL.overall}
        transform={`rotate(-90 ${xOvr - 6} ${(Y(start) + Y(end)) / 2})`}>
        {fmt(totalM)} TOTAL COLONY WIDTH
      </text>
    </g>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
      <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm border" style={{ background: COL.veranda, borderColor: COL.verandaHatch }} /> Veranda / walkway</span>
      <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm border" style={{ background: COL.stair, borderColor: COL.stairStroke }} /> Staircase (↑ UP)</span>
      <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm border" style={{ background: COL.wallBand, borderColor: COL.wall }} /> Wall / panel</span>
      <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4" style={{ background: COL.door }} /> Door + swing (D)</span>
      <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 border" style={{ background: COL.windowFill, borderColor: COL.window }} /> Window (W)</span>
      <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4" style={{ background: COL.rail }} /> Safety railing</span>
      <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4" style={{ background: COL.overall }} /> Overall / total colony</span>
    </div>
  );
}

/* ============================================================== controls */

/**
 * Numeric input that keeps a raw text buffer WHILE FOCUSED so multi-digit entry is never
 * corrupted by min-clamping, yet still updates the drawing LIVE on every keystroke. The
 * value is only reconciled/clamped on blur (via onCommit). Fixes the "type 14 → 24" and
 * leading-zero snapping bugs of a plainly-controlled number input.
 */
function BufferedNumber({ shown, step, className, onLive, onCommit }: {
  shown: number; step?: number; className?: string;
  onLive: (n: number) => void; onCommit: (n: number | null) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  return (
    <input type="number" inputMode="decimal" step={step} className={className}
      value={text ?? String(shown)}
      onFocus={(e) => { setText(String(shown)); e.currentTarget.select(); }}
      onChange={(e) => { setText(e.target.value); const n = parseFloat(e.target.value); if (Number.isFinite(n)) onLive(n); }}
      onBlur={(e) => { const n = parseFloat(e.target.value); onCommit(Number.isFinite(n) ? n : null); setText(null); }} />
  );
}

function LenField({ label, m, unit, onChange, min = 0, allowNegative, preferMm }: {
  label: string; m: number; unit: LengthUnit; onChange: (m: number) => void; min?: number; allowNegative?: boolean; preferMm?: boolean;
}) {
  // small thicknesses read better in mm even under ft/ft-in units
  const effUnit: LengthUnit = preferMm && (unit === "ft" || unit === "ftin") ? "mm" : unit;
  if (effUnit === "ftin") {
    // signed fields (movement) get a −/+ sign toggle so feet+inches stays unambiguous even for
    // small negative offsets (a plain two-box editor loses the sign of a 0'-6" value).
    const neg = m < -1e-9;
    const { ft, inch } = toFeetInches(Math.abs(m));
    const emit = (sign: number, f: number, i: number) => onChange(sign * fromFeetInches(f, i));
    return (
      <div className="text-xs font-medium text-slate-600">
        <span className="mb-1 block">{label}</span>
        <div className="flex items-center gap-1">
          {allowNegative && (
            <button type="button" onClick={() => emit(neg ? 1 : -1, ft, inch)}
              className="h-8 w-7 rounded-md border border-slate-300 bg-white text-sm font-bold text-slate-600 hover:bg-slate-100">{neg ? "−" : "+"}</button>
          )}
          <input type="number" inputMode="decimal" step={1} min={0} value={ft}
            onChange={(e) => emit(neg ? -1 : 1, Math.abs(parseInt(e.target.value, 10) || 0), inch)}
            onFocus={(e) => e.currentTarget.select()}
            className="h-8 w-14 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-amber-400" />
          <span className="text-[10px] text-slate-400">ft</span>
          <input type="number" inputMode="decimal" step={1} min={0} max={11} value={inch}
            onChange={(e) => emit(neg ? -1 : 1, ft, clamp(Math.abs(parseInt(e.target.value, 10) || 0), 0, 11))}
            onFocus={(e) => e.currentTarget.select()}
            className="h-8 w-14 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-amber-400" />
          <span className="text-[10px] text-slate-400">in</span>
        </div>
      </div>
    );
  }
  const val = toUnit(m, effUnit);
  return (
    <label className="text-xs font-medium text-slate-600">
      <span className="mb-1 block">{label} <span className="text-[10px] text-slate-400">({unitSuffix(effUnit)})</span></span>
      <BufferedNumber shown={val} step={unitStep(effUnit)}
        onLive={(n) => onChange(fromUnit(n, effUnit))}
        onCommit={(n) => { const mm2 = fromUnit(n ?? 0, effUnit); onChange(allowNegative ? mm2 : Math.max(min, mm2)); }}
        className="h-8 w-24 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
    </label>
  );
}

function NumField({ label, value, step, min, onChange }: { label: string; value: number; step: number; min: number; onChange: (v: number) => void }) {
  return (
    <label className="text-xs font-medium text-slate-600">
      <span className="mb-1 block">{label}</span>
      <BufferedNumber shown={value} step={step}
        onLive={(n) => onChange(n)}
        onCommit={(n) => onChange(n == null ? min : Math.max(min, n))}
        className="h-8 w-24 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400" />
    </label>
  );
}

function SelField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="text-xs font-medium text-slate-600">
      <span className="mb-1 block">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-amber-400">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

/* per-room schedule row */
function RoomRow({ p, fp, unit, swingDefault, onLen, onDepth, onWin, onDoors }: {
  p: FPRoom; fp: RoomFloorPlanConfig; unit: LengthUnit; swingDefault: "in" | "out";
  onLen: (m: number | undefined) => void; onDepth: (m: number | undefined) => void;
  onWin: (m: number) => void; onDoors: (list: RoomDoor[]) => void;
}) {
  const ov = fp.rooms?.[p.no] ?? {};
  const defaultWall: RoomWall = p.row === "top" ? "top" : "bottom";
  // Editable door list: the explicit override, else seeded from the resolved doors (position kept;
  // width/height left on the colony default so ↺ semantics survive). Ids are stable (from the engine).
  const editable: RoomDoor[] = ov.doors ?? p.doors.map((d) => ({
    id: d.id, wall: d.wall, offsetM: r1m(d.posM), hinge: d.hinge, swing: d.swing,
  }));
  return (
    <tr className="border-b last:border-0 align-top">
      <td className="py-1.5 pr-2 font-semibold text-slate-700">ROOM {p.no}</td>
      <td className="py-1.5 pr-2"><SchedLen m={ov.lengthM ?? p.w} unit={unit} onChange={(m) => onLen(m)} onClear={() => onLen(undefined)} custom={ov.lengthM != null} /></td>
      <td className="py-1.5 pr-2"><SchedLen m={ov.depthM ?? p.d} unit={unit} onChange={(m) => onDepth(m)} onClear={() => onDepth(undefined)} custom={ov.depthM != null} /></td>
      <td className="py-1.5 pr-2"><SchedLen m={p.winFromLeftM} unit={unit} onChange={onWin} max={p.w - p.winWM} /></td>
      <td className="py-1.5 pr-2">
        <RoomDoorsCell list={editable} resolved={p.doors} unit={unit} defaultWall={defaultWall} swingDefault={swingDefault} onChange={onDoors} />
      </td>
    </tr>
  );
}

const WALL_OPTS: [RoomWall, string][] = [["top", "Upper"], ["bottom", "Lower"], ["left", "Left"], ["right", "Right"]];

/** Per-room door editor: any number of doors, each with wall, width, height, offset, hinge & swing,
 *  plus a live "distance from nearest corner" readout and an overlap flag. */
function RoomDoorsCell({ list, resolved, unit, defaultWall, swingDefault, onChange }: {
  list: RoomDoor[]; resolved: FPDoor[]; unit: LengthUnit; defaultWall: RoomWall; swingDefault: "in" | "out";
  onChange: (l: RoomDoor[]) => void;
}) {
  const update = (i: number, patch: Partial<RoomDoor>) => onChange(list.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const remove = (i: number) => onChange(list.filter((_, j) => j !== i));
  const add = () => onChange([...list, { id: uid(), wall: defaultWall, swing: swingDefault }]);
  return (
    <div className="min-w-[440px] space-y-1">
      {list.length === 0 && <div className="text-[10px] italic text-slate-400">No doors on this room.</div>}
      {list.map((d, i) => {
        const rd = resolved[i];
        const wall = d.wall ?? defaultWall;
        const hinge = d.hinge ?? rd?.hinge ?? "start";
        const swing = d.swing ?? rd?.swing ?? swingDefault;
        return (
          <div key={d.id || i} className="flex flex-wrap items-center gap-1 rounded-md border border-fuchsia-100 bg-fuchsia-50/40 px-1.5 py-1">
            <span className="w-6 shrink-0 text-[10px] font-bold text-fuchsia-700">D{list.length > 1 ? i + 1 : ""}</span>
            <select value={wall} onChange={(e) => update(i, { wall: e.target.value as RoomWall })}
              className="h-6 rounded border border-slate-300 bg-white px-1 text-[10px]" title="Wall">
              {WALL_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span className="text-[9px] text-slate-400">W</span>
            <SchedLen compact m={rd?.widthM ?? 0.9} unit={unit} onChange={(m) => update(i, { widthM: m })} onClear={() => update(i, { widthM: undefined })} custom={d.widthM != null} />
            <span className="text-[9px] text-slate-400">H</span>
            <SchedLen compact m={rd?.heightM ?? 2.0} unit={unit} onChange={(m) => update(i, { heightM: m })} onClear={() => update(i, { heightM: undefined })} custom={d.heightM != null} />
            <span className="text-[9px] text-slate-400" title="Offset from the wall's start corner (Upper/Lower → left; Left/Right → top)">@</span>
            <SchedLen compact m={rd?.posM ?? d.offsetM ?? 0} unit={unit} onChange={(m) => update(i, { offsetM: Math.max(0, m) })} />
            <button type="button" onClick={() => update(i, { hinge: hinge === "start" ? "end" : "start" })}
              className="h-6 rounded border border-slate-300 bg-white px-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50" title="Hinge at wall start / end corner">
              Hinge {hinge === "start" ? "S" : "E"}
            </button>
            <button type="button" onClick={() => update(i, { swing: swing === "in" ? "out" : "in" })}
              className={`h-6 rounded border px-1.5 text-[10px] font-semibold ${swing === "in" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-sky-300 bg-sky-50 text-sky-700"}`} title="Swing into / out of the room">
              {swing === "in" ? "IN" : "OUT"}
            </button>
            {rd && (
              <span className={`text-[9px] ${rd.overlap ? "font-semibold text-red-500" : "text-slate-400"}`} title="Distance from the nearest corner">
                ⌐{formatLen(rd.fromNearCornerM, unit)}{rd.overlap ? " ⚠" : ""}
              </span>
            )}
            <button type="button" onClick={() => remove(i)} className="ml-auto text-[12px] leading-none text-slate-400 hover:text-red-500" title="Delete door">✕</button>
          </div>
        );
      })}
      <button type="button" onClick={add}
        className="rounded border border-fuchsia-300 bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-700 hover:bg-fuchsia-100">+ Add door</button>
    </div>
  );
}

function SchedLen({ m, unit, onChange, onClear, custom, max, compact }: {
  m: number; unit: LengthUnit; onChange: (m: number) => void; onClear?: () => void; custom?: boolean; max?: number; compact?: boolean;
}) {
  const wFtIn = compact ? "w-9" : "w-12";
  const wDec = compact ? "w-14" : "w-20";
  if (unit === "ftin") {
    const { ft, inch } = toFeetInches(m);
    return (
      <span className="inline-flex items-center gap-0.5">
        <input type="number" step={1} value={ft} onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onChange(clampMax(fromFeetInches(parseInt(e.target.value, 10) || 0, inch), max))}
          className={`h-7 ${wFtIn} rounded-md border border-slate-300 bg-white px-1 text-center text-xs`} />
        <span className="text-[9px] text-slate-400">′</span>
        <input type="number" step={1} min={0} max={11} value={inch} onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onChange(clampMax(fromFeetInches(ft, parseInt(e.target.value, 10) || 0), max))}
          className={`h-7 ${wFtIn} rounded-md border border-slate-300 bg-white px-1 text-center text-xs`} />
        {onClear && custom && <button type="button" onClick={onClear} className="text-[10px] text-slate-400 hover:text-slate-700" title="Reset to global">↺</button>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input type="number" step={unitStep(unit)} value={toUnit(m, unit)} onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => { const v = parseFloat(e.target.value); onChange(clampMax(fromUnit(Number.isFinite(v) ? v : 0, unit), max)); }}
        className={`h-7 ${wDec} rounded-md border border-slate-300 bg-white px-1.5 text-center text-xs`} />
      {onClear && custom && <button type="button" onClick={onClear} className="text-[10px] text-slate-400 hover:text-slate-700" title="Reset to global">↺</button>}
    </span>
  );
}

function clampMax(v: number, max?: number) {
  if (max == null) return Math.max(0, v);
  return clamp(v, 0, Math.max(0, max));
}

const uid = () => "x" + Math.random().toString(36).slice(2, 8);

/* ===================================================== veranda railing glyph */

function VerandaRailing({ v, X, Y, L }: { v: FPVeranda; X: (m: number) => number; Y: (m: number) => number; L: (m: number) => number }) {
  const horiz = v.side === "top" || v.side === "bottom";
  if (horiz) {
    const yEdge = Y(v.side === "top" ? v.y : v.y + v.d);
    const x0 = X(v.x), x1 = X(v.x + v.w);
    const n = Math.max(2, Math.round((x1 - x0) / 16));
    const out = v.side === "top" ? -3.5 : 3.5;
    return (
      <g>
        <line x1={x0} y1={yEdge} x2={x1} y2={yEdge} stroke={COL.rail} strokeWidth={2.8} strokeLinecap="round" />
        {Array.from({ length: n + 1 }, (_, k) => { const px = x0 + ((x1 - x0) * k) / n; return <line key={k} x1={px} y1={yEdge} x2={px} y2={yEdge + out} stroke={COL.rail} strokeWidth={0.9} />; })}
        <text x={x0 + 2} y={yEdge + (v.side === "top" ? 8 : -4)} fontSize={6.5} fontWeight={700} fill={COL.rail}>SAFETY RAILING</text>
      </g>
    );
  }
  const xEdge = X(v.side === "left" ? v.x : v.x + v.w);
  const y0 = Y(v.y), y1 = Y(v.y + v.d);
  const n = Math.max(2, Math.round((y1 - y0) / 16));
  const out = v.side === "left" ? -3.5 : 3.5;
  return (
    <g>
      <line x1={xEdge} y1={y0} x2={xEdge} y2={y1} stroke={COL.rail} strokeWidth={2.8} strokeLinecap="round" />
      {Array.from({ length: n + 1 }, (_, k) => { const py = y0 + ((y1 - y0) * k) / n; return <line key={k} x1={xEdge} y1={py} x2={xEdge + out} y2={py} stroke={COL.rail} strokeWidth={0.9} />; })}
    </g>
  );
}

/* ===================================================== staircase manager */

function StairManager({ list, unit, floors, verandaM, cfg, fmt, stairById, onChange }: {
  list: StaircaseDrawConfig[]; unit: LengthUnit; floors: number; verandaM: number;
  cfg: LabourColonyResult["config"]; fmt: (m: number) => string;
  stairById: Map<string, FPStair>; onChange: (list: StaircaseDrawConfig[]) => void;
}) {
  const update = (i: number, patch: Partial<StaircaseDrawConfig>) => onChange(list.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => onChange(list.filter((_, j) => j !== i));
  const duplicate = (i: number) => {
    const src = list[i];
    const isVert = (src.position ?? "right") === "left" || (src.position ?? "right") === "right";
    const copy: StaircaseDrawConfig = {
      ...src, id: uid(), label: `${src.label ?? "Staircase"} copy`,
      dxM: (src.dxM ?? 0) + (isVert ? 0 : 1.0), dyM: (src.dyM ?? 0) + (isVert ? 1.0 : 0),
    };
    onChange([...list.slice(0, i + 1), copy, ...list.slice(i + 1)]);
  };
  const add = () => onChange([...list, { id: uid(), label: `Staircase ${list.length + 1}`, position: "right", enabled: true }]);

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-700">Staircases — add / duplicate / edit / delete ({list.length})</div>
        <button type="button" onClick={add} className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100">+ Add staircase</button>
      </div>
      {list.length === 0 && <div className="text-[11px] text-slate-500">No staircases. Click <b>+ Add staircase</b> to create one.</div>}
      {list.map((s, i) => (
        <StairCard key={s.id ?? i} sc={s} unit={unit} floors={floors} verandaM={verandaM} cfg={cfg} fmt={fmt}
          placed={stairById.get(s.id ?? "")} onChange={(p) => update(i, p)} onDuplicate={() => duplicate(i)} onDelete={() => remove(i)} />
      ))}
    </div>
  );
}

function StairCard({ sc, unit, floors, verandaM, cfg, fmt, placed, onChange, onDuplicate, onDelete }: {
  sc: StaircaseDrawConfig; unit: LengthUnit; floors: number; verandaM: number;
  cfg: LabourColonyResult["config"]; fmt: (m: number) => string; placed?: FPStair;
  onChange: (patch: Partial<StaircaseDrawConfig>) => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const sr = resolveStair(sc, floors, verandaM, cfg.staircasePosition, cfg.staircaseWidth);
  const posVal = sr.position === "both" ? "right" : sr.position;
  const nudge = 0.3048; // 1 ft
  return (
    <div className={`mb-2 rounded-lg border p-2.5 ${placed?.overlap ? "border-red-300 bg-red-50" : "border-slate-200"}`}>
      <div className="mb-2 flex items-center gap-2">
        <input value={sc.label ?? "Staircase"} onChange={(e) => onChange({ label: e.target.value })}
          className="h-7 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold" />
        <label className="flex items-center gap-1 text-[11px] text-slate-600">
          <input type="checkbox" checked={sr.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} /> Show
        </label>
        <button type="button" onClick={onDuplicate} title="Duplicate" className="rounded-md border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-50">Duplicate</button>
        <button type="button" onClick={onDelete} title="Delete" className="rounded-md border border-red-300 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50">Delete</button>
      </div>
      {sr.enabled && (
        <>
          <div className="flex flex-wrap gap-3">
            <SelField label="Position (side)" value={posVal} onChange={(v) => onChange({ position: v as StaircaseDrawConfig["position"] })}
              options={[["left", "Left side"], ["right", "Right side"], ["top", "Top side"], ["bottom", "Bottom side"]]} />
            <SelField label="Entry side" value={sr.entry} onChange={(v) => onChange({ entry: v as "left" | "right" })}
              options={[["left", "Left / near"], ["right", "Right / far"]]} />
            <SelField label="Up direction" value={sr.direction} onChange={(v) => onChange({ direction: v as "up" | "down" })}
              options={[["up", "Away from entry"], ["down", "Toward entry"]]} />
            <NumField label="Number of steps" value={sr.steps} step={1} min={2} onChange={(v) => onChange({ steps: Math.round(v) })} />
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <LenField label="Width" m={sr.widthM} unit={unit} min={0.6} onChange={(m) => onChange({ widthM: r1m(m) })} />
            <LenField label="Total run length" m={sr.runM} unit={unit} min={0.6} onChange={(m) => onChange({ totalLengthM: r1m(m) })} />
            <LenField label="Step tread / going" m={sr.treadM} unit={unit} min={0.15} onChange={(m) => onChange({ treadM: r1m(m), totalLengthM: undefined })} />
            <NumField label="Step riser (mm)" value={sr.riserMm} step={5} min={80} onChange={(v) => onChange({ riserMm: Math.round(v) })} />
            <LenField label="Gap between steps" m={sr.gapM} unit={unit} min={0} onChange={(m) => onChange({ gapM: Math.max(0, r1m(m)), totalLengthM: undefined })} />
            <LenField label="Landing size" m={sr.landingM} unit={unit} min={0} onChange={(m) => onChange({ landingM: Math.max(0, r1m(m)) })} />
          </div>
          {/* movement */}
          <div className="mt-3 flex flex-wrap items-end gap-3 rounded-md bg-slate-50 p-2">
            <LenField label="Shift ← / → (horizontal)" m={sc.dxM ?? 0} unit={unit} allowNegative onChange={(m) => onChange({ dxM: r1m(m) })} />
            <LenField label="Shift ↑ / ↓ (vertical)" m={sc.dyM ?? 0} unit={unit} allowNegative onChange={(m) => onChange({ dyM: r1m(m) })} />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Nudge (1 ft)</span>
              <div className="flex gap-1">
                <NudgeBtn label="←" onClick={() => onChange({ dxM: r1m((sc.dxM ?? 0) - nudge) })} />
                <NudgeBtn label="→" onClick={() => onChange({ dxM: r1m((sc.dxM ?? 0) + nudge) })} />
                <NudgeBtn label="↑" onClick={() => onChange({ dyM: r1m((sc.dyM ?? 0) - nudge) })} />
                <NudgeBtn label="↓" onClick={() => onChange({ dyM: r1m((sc.dyM ?? 0) + nudge) })} />
                <NudgeBtn label="⌿" title="Reset movement" onClick={() => onChange({ dxM: 0, dyM: 0, offsetM: 0 })} />
              </div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            going {fmt(sr.goingM)} · riser {sr.riserMm} mm · {sr.steps} steps · run {fmt(sr.runM)}{sr.landingM > 0 ? ` · landing ${fmt(sr.landingM)}` : ""}
            {placed && <> · <span className="font-semibold text-slate-600">offset {fmt(placed.offsetToWallM)} from wall, {fmt(placed.offsetToCornerM)} from corner</span></>}
            {placed?.overlap && <span className="font-semibold text-red-600"> · ⚠ overlaps another element</span>}
          </div>
        </>
      )}
    </div>
  );
}

function NudgeBtn({ label, onClick, title }: { label: string; onClick: () => void; title?: string }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className="h-7 w-7 rounded-md border border-slate-300 bg-white text-sm leading-none text-slate-600 hover:bg-slate-100">{label}</button>
  );
}

/* ===================================================== veranda / corridor manager */

function VerandaManager({ list, unit, verandaM, onChange }: {
  list: VerandaDrawConfig[]; unit: LengthUnit; verandaM: number; onChange: (list: VerandaDrawConfig[]) => void;
}) {
  const update = (i: number, patch: Partial<VerandaDrawConfig>) => onChange(list.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const remove = (i: number) => onChange(list.filter((_, j) => j !== i));
  const duplicate = (i: number) => {
    const src = list[i];
    const copy: VerandaDrawConfig = { ...src, id: uid(), label: `${src.label ?? "Veranda"} copy`, offsetM: (src.offsetM ?? 0) + 1.0 };
    onChange([...list.slice(0, i + 1), copy, ...list.slice(i + 1)]);
  };
  const add = () => onChange([...list, { id: uid(), label: `Veranda ${list.length + 1}`, side: "top", railing: true, enabled: true }]);

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-700">Verandas / corridors — add / duplicate / edit / delete ({list.length})</div>
        <button type="button" onClick={add} className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100">+ Add veranda / corridor</button>
      </div>
      {list.length === 0 && <div className="text-[11px] text-slate-500">No verandas. Click <b>+ Add veranda / corridor</b> to create one.</div>}
      {list.map((v, i) => (
        <VerandaCard key={v.id ?? i} vc={v} unit={unit} verandaM={verandaM}
          onChange={(p) => update(i, p)} onDuplicate={() => duplicate(i)} onDelete={() => remove(i)} />
      ))}
    </div>
  );
}

function VerandaCard({ vc, unit, verandaM, onChange, onDuplicate, onDelete }: {
  vc: VerandaDrawConfig; unit: LengthUnit; verandaM: number;
  onChange: (patch: Partial<VerandaDrawConfig>) => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const enabled = vc.enabled ?? true;
  const depthM = vc.widthM && vc.widthM > 0 ? vc.widthM : verandaM;
  return (
    <div className="mb-2 rounded-lg border border-slate-200 p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <input value={vc.label ?? "Veranda"} onChange={(e) => onChange({ label: e.target.value })}
          className="h-7 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold" />
        <label className="flex items-center gap-1 text-[11px] text-slate-600">
          <input type="checkbox" checked={enabled} onChange={(e) => onChange({ enabled: e.target.checked })} /> Show
        </label>
        <button type="button" onClick={onDuplicate} className="rounded-md border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-50">Duplicate</button>
        <button type="button" onClick={onDelete} className="rounded-md border border-red-300 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50">Delete</button>
      </div>
      {enabled && (
        <div className="flex flex-wrap items-end gap-3">
          <SelField label="Side" value={vc.side ?? "top"} onChange={(v) => onChange({ side: v as VerandaDrawConfig["side"] })}
            options={[["top", "Top"], ["bottom", "Bottom"], ["left", "Left"], ["right", "Right"]]} />
          <LenField label="Width / depth" m={depthM} unit={unit} min={0.3} onChange={(m) => onChange({ widthM: r1m(m) })} />
          <LenField label="Length (0 = full)" m={vc.lengthM ?? 0} unit={unit} min={0} onChange={(m) => onChange({ lengthM: Math.max(0, r1m(m)) })} />
          <LenField label="Position offset" m={vc.offsetM ?? 0} unit={unit} min={0} onChange={(m) => onChange({ offsetM: Math.max(0, r1m(m)) })} />
          <label className="flex items-center gap-1.5 text-xs text-slate-600 pb-1.5">
            <input type="checkbox" checked={vc.railing ?? true} onChange={(e) => onChange({ railing: e.target.checked })} /> Safety railing
          </label>
        </div>
      )}
    </div>
  );
}
