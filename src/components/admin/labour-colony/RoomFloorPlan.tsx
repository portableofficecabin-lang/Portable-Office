"use client";

import { useState } from "react";
import type { LabourColonyResult, RoomFloorPlanConfig, RoomOpeningOverride, StaircaseDrawConfig } from "@/lib/quotation/labourColony";
import {
  buildRoomFloorPlan, resolveStair,
  type RoomFloorPlanGeom, type FPRoom, type FPStair, type FPBand,
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
  const sr = resolveStair(fp.staircase, floors, geom.verandaM, result.config.staircasePosition, result.config.staircaseWidth);

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
  const setStair = (patch: Partial<StaircaseDrawConfig>) =>
    onChange({ ...fp, staircase: { ...(fp.staircase ?? {}), ...patch } });

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
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={fp.showRailing ?? true} onChange={(e) => setTop({ showRailing: e.target.checked })} />
            Show safety railing
          </label>
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          Door &amp; window <b>width</b>, door <b>height</b> and corridor here are colony defaults; set <b>per-room</b> door width/height/position (in {LENGTH_UNITS.find((u) => u.id === unit)?.short}) in the schedule below. Openings are kept off partitions and apart by the min clearance. Room size &amp; corridor side are on the left panel.
        </div>
      </div>

      {/* ============ STAIRCASE CONTROLS ============ */}
      <div className="rounded-xl border bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-700">Staircase — 100% customizable</div>
          <label className="flex items-center gap-2 text-[11px] text-slate-600">
            <input type="checkbox" checked={sr.enabled} onChange={(e) => setStair({ enabled: e.target.checked })} />
            Show staircase
          </label>
        </div>
        {sr.enabled && (
          <>
            <div className="flex flex-wrap gap-3">
              <SelField label="Position (any side)" value={sr.position} onChange={(v) => setStair({ position: v as StaircaseDrawConfig["position"] })}
                options={[["both", "Both ends"], ["left", "Left side"], ["right", "Right side"], ["top", "Top side"], ["bottom", "Bottom side"]]} />
              <SelField label="Entry side" value={sr.entry} onChange={(v) => setStair({ entry: v as "left" | "right" })}
                options={[["left", "Left / near"], ["right", "Right / far"]]} />
              <SelField label="Up direction" value={sr.direction} onChange={(v) => setStair({ direction: v as "up" | "down" })}
                options={[["up", "Away from entry"], ["down", "Toward entry"]]} />
              <NumField label="Number of steps" value={sr.steps} step={1} min={2}
                onChange={(v) => setStair({ steps: Math.round(v) })} />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <LenField label="Staircase width" m={sr.widthM} unit={unit} min={0.6}
                onChange={(m) => setStair({ widthM: r1m(m) })} />
              <LenField label="Total run length" m={sr.runM} unit={unit} min={0.6}
                onChange={(m) => setStair({ totalLengthM: r1m(m) })} />
              <LenField label="Step tread / going" m={sr.treadM} unit={unit} min={0.15}
                onChange={(m) => setStair({ treadM: r1m(m), totalLengthM: undefined })} />
              <NumField label="Step riser (mm)" value={sr.riserMm} step={5} min={80}
                onChange={(v) => setStair({ riserMm: Math.round(v) })} />
              <LenField label="Gap between steps" m={sr.gapM} unit={unit} min={0}
                onChange={(m) => setStair({ gapM: Math.max(0, r1m(m)), totalLengthM: undefined })} />
              <LenField label="Landing size" m={sr.landingM} unit={unit} min={0}
                onChange={(m) => setStair({ landingM: Math.max(0, r1m(m)) })} />
              <LenField label="Slide offset" m={sr.offsetM} unit={unit} min={-50} allowNegative
                onChange={(m) => setStair({ offsetM: r1m(m) })} />
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Effective going {fmt(sr.goingM)} · riser {sr.riserMm} mm · {sr.steps} steps · run {fmt(sr.runM)}
              {sr.landingM > 0 ? ` · landing ${fmt(sr.landingM)}` : ""}. Set <b>Total run length</b> to size the flight directly, or leave it and drive it from tread + gap × steps.
            </div>
          </>
        )}
      </div>

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
              {/* verandas */}
              {geom.verandas.map((v, i) => (
                <g key={`ver-${i}`}>
                  <rect x={X(v.x)} y={Y(v.y)} width={L(v.w)} height={L(v.d)} fill="url(#rfp-veranda)" stroke={COL.wall} strokeWidth={1.1} />
                  <text x={X(v.x + v.w / 2)} y={Y(v.y + v.d / 2) + 3} textAnchor="middle" fontSize={Math.max(8, S * 0.32)} fontWeight={700} fill={COL.stairStroke} letterSpacing={2}>
                    VERANDA · {fmt(v.d)}
                  </text>
                </g>
              ))}

              {/* staircases */}
              {geom.stairs.map((s, i) => <StairGlyph key={`stair-${i}`} s={s} X={X} Y={Y} L={L} S={S} fmt={fmt} />)}

              {/* room bodies (with wall/panel band) */}
              {geom.rooms.map((p) => <RoomBody key={`body-${p.no}`} p={p} wallM={geom.wallM} X={X} Y={Y} L={L} S={S} fmt={fmt} />)}

              {/* bold building outline (room block, excludes staircases) */}
              <rect x={X(0)} y={Y(0)} width={L(geom.blockWM)} height={L(geom.blockDM)} fill="none" stroke={COL.wall} strokeWidth={2.4} />

              {/* safety railing along the open (outer) veranda edges */}
              {(fp.showRailing ?? true) && geom.verandas.map((v, i) => {
                const isTop = v.y < geom.blockDM / 2;
                const yEdge = Y(isTop ? v.y : v.y + v.d);
                const x0 = X(v.x), x1 = X(v.x + v.w);
                const nPost = Math.max(2, Math.round((x1 - x0) / 16));
                const out = isTop ? -3.5 : 3.5; // posts point away from the building
                return (
                  <g key={`rail-${i}`}>
                    <line x1={x0} y1={yEdge} x2={x1} y2={yEdge} stroke={COL.rail} strokeWidth={2.8} strokeLinecap="round" />
                    {Array.from({ length: nPost + 1 }, (_, k) => {
                      const px = x0 + ((x1 - x0) * k) / nPost;
                      return <line key={k} x1={px} y1={yEdge} x2={px} y2={yEdge + out} stroke={COL.rail} strokeWidth={0.9} />;
                    })}
                    <text x={x0 + 2} y={yEdge + (isTop ? 8 : -4)} fontSize={6.5} fontWeight={700} fill={COL.rail}>SAFETY RAILING</text>
                  </g>
                );
              })}

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
        <div className="mb-2 font-display font-bold text-sm text-slate-800">Room-wise schedule &amp; door measurements — {floorLabel(floorIdx)}</div>
        <div className="mb-3 text-[11px] text-slate-500">
          Per-room size &amp; door/window measurements. <b>Door W / H</b> set each door&apos;s width &amp; height; <b>Door @</b> / <b>Window @</b> are offsets measured from the room&apos;s <b>left corner</b> — all in {LENGTH_UNITS.find((u) => u.id === unit)?.label.toLowerCase()}. Use ↺ to reset a value to the colony default.
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-1.5 pr-2">Room</th>
                <th className="py-1.5 pr-2">Length</th>
                <th className="py-1.5 pr-2">Depth</th>
                <th className="py-1.5 pr-2 text-fuchsia-700">Door W</th>
                <th className="py-1.5 pr-2 text-fuchsia-700">Door H</th>
                <th className="py-1.5 pr-2 text-fuchsia-700">Door @</th>
                <th className="py-1.5 pr-2">Window @</th>
                <th className="py-1.5 pr-2">Door swing</th>
              </tr>
            </thead>
            <tbody>
              {geom.rooms.slice().sort((a, b) => a.no - b.no).map((p) => (
                <RoomRow key={p.no} p={p} fp={fp} unit={unit}
                  onLen={(m) => setRoom(p.no, { lengthM: m })}
                  onDepth={(m) => setRoom(p.no, { depthM: m })}
                  onDoorW={(m) => setRoom(p.no, { doorWidthM: m })}
                  onDoorH={(m) => setRoom(p.no, { doorHeightM: m })}
                  onWin={(m) => setRoom(p.no, { windowFromLeftFt: r1(m * M2FT) })}
                  onDoor={(m) => setRoom(p.no, { doorFromLeftFt: r1(m * M2FT) })}
                  onHinge={(h) => setRoom(p.no, { doorHinge: h })} />
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
      <text x={rx + rw / 2} y={ry + rh / 2 - 3} textAnchor="middle" fontSize={Math.max(8, S * 0.34)} fontWeight={700} fill={COL.ink}>ROOM {p.no}</text>
      <text x={rx + rw / 2} y={ry + rh / 2 + 11} textAnchor="middle" fontSize={8.5} fill={COL.dim}>{fmt(p.w)} × {fmt(p.d)}</text>
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
  const wallY = Y(p.wallY);
  const into = p.into;
  const dOx = p.x + p.doorFromLeftM;
  const wOx = p.x + p.winFromLeftM;
  const doorW = L(p.doorWM);
  const winW = L(p.winWM);
  const hingeAtLeft = p.hinge === "left";
  const hx = hingeAtLeft ? X(dOx) : X(dOx) + doorW;
  const jx = hingeAtLeft ? X(dOx) + doorW : X(dOx);
  const tipx = hx;
  const tipy = wallY + into * doorW;
  const insA = wallY + into * 12; // window offset dim
  const insB = wallY + into * 24; // door offset dim
  const insDoorW = wallY + into * 36; // door WIDTH dim (across the opening)
  return (
    <g>
      {/* WINDOW */}
      <rect x={X(wOx)} y={wallY - 2.4} width={winW} height={4.8} fill={COL.windowFill} stroke={COL.window} strokeWidth={1.4} />
      <line x1={X(wOx)} y1={wallY} x2={X(wOx) + winW} y2={wallY} stroke={COL.window} strokeWidth={1} />
      <text x={X(wOx) + winW / 2} y={wallY + into * 9} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={COL.window}>W</text>

      {/* DOOR opening + leaf + swing */}
      <line x1={X(dOx)} y1={wallY} x2={X(dOx) + doorW} y2={wallY} stroke="#ffffff" strokeWidth={3.6} />
      <line x1={hx} y1={wallY} x2={tipx} y2={tipy} stroke={COL.door} strokeWidth={2.2} />
      <path d={swingPath(hx, wallY, doorW, tipx, tipy, jx, wallY)} fill="none" stroke={COL.doorArc} strokeWidth={1} strokeDasharray="3 2" />
      <text x={X(dOx) + doorW / 2} y={wallY + into * 9} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={COL.door}>D</text>

      {/* offset dims from the left corner + door WIDTH×HEIGHT measurement */}
      <OffsetDim x0={X(p.x)} x1={X(wOx)} y={insA} label={fmt(p.winFromLeftM)} />
      <OffsetDim x0={X(p.x)} x1={X(dOx)} y={insB} label={fmt(p.doorFromLeftM)} />
      <OffsetDim x0={X(dOx)} x1={X(dOx) + doorW} y={insDoorW} label={`${fmt(p.doorWM)} × ${fmt(p.doorHM)} h`} color={COL.door} />
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
      <text x={(a + b) / 2} y={y - 2} textAnchor="middle" fontSize={7} fill={color ?? COL.dim}>{label}</text>
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
  const cap = `W ${fmt(s.widthM)} · run ${fmt(s.runM)} · ${s.steps}T@${fmt(s.goingM)} · R${s.riserMm}mm${s.landingM > 0 ? ` · land ${fmt(s.landingM)}` : ""}`;

  return (
    <g>
      <rect x={sx} y={sy} width={sw} height={sh} fill={COL.stair} stroke={COL.stairStroke} strokeWidth={1.4} />
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
        letterSpacing={1} fill={COL.stairStroke} transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}>
        STAIRCASE
      </text>
      {/* dimension caption just outside the block */}
      <text x={cx} y={vertical ? sy - 4 : sy + sh + 11} textAnchor="middle" fontSize={7.5} fill={COL.stairStroke}>{cap}</text>
    </g>
  );
}

/** Panel / wall-thickness callout on a room's left wall. */
function PanelDim({ p, wallM, X, Y, L, fmt }: {
  p: FPRoom; wallM: number; X: (m: number) => number; Y: (m: number) => number; L: (m: number) => number; fmt: (m: number) => string;
}) {
  const x0 = X(p.x), x1 = X(p.x) + L(wallM);
  const y = Y(p.y) + L(p.d) * 0.5;
  return (
    <g>
      <line x1={x0} y1={y - 8} x2={x0} y2={y + 8} stroke={COL.overall} strokeWidth={0.8} />
      <line x1={x1} y1={y - 8} x2={x1} y2={y + 8} stroke={COL.overall} strokeWidth={0.8} />
      <text x={x1 + 3} y={y + 3} fontSize={7.5} fill={COL.overall}>panel {fmt(wallM)}</text>
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
      {bands.map((b, i) => (
        <text key={i} x={X(b.start + b.len / 2)} y={y - 5} textAnchor="middle" fontSize={7.5}
          fill={b.kind === "stair" ? COL.stairStroke : b.kind === "gap" ? COL.dim : COL.dim}>
          {b.kind === "gap" ? "gap " : ""}{fmt(b.len)}
        </text>
      ))}
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
        return (
          <text key={i} x={x - 6} y={cy} textAnchor="middle" fontSize={7.5}
            fill={b.kind === "stair" ? COL.stairStroke : COL.dim} transform={`rotate(-90 ${x - 6} ${cy})`}>
            {fmt(b.len)}
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
  // signed fields (e.g. slide offset) can't be represented in a two-box ft+in editor
  // (a 0'-6" negative loses its sign), so fall back to a single decimal-feet box for them.
  if (effUnit === "ftin" && !allowNegative) {
    const { ft, inch } = toFeetInches(m);
    return (
      <div className="text-xs font-medium text-slate-600">
        <span className="mb-1 block">{label}</span>
        <div className="flex items-center gap-1">
          <input type="number" inputMode="decimal" step={1} value={ft}
            onChange={(e) => onChange(fromFeetInches(parseInt(e.target.value, 10) || 0, inch))}
            onFocus={(e) => e.currentTarget.select()}
            className="h-8 w-14 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-amber-400" />
          <span className="text-[10px] text-slate-400">ft</span>
          <input type="number" inputMode="decimal" step={1} min={0} max={11} value={inch}
            onChange={(e) => onChange(fromFeetInches(ft, parseInt(e.target.value, 10) || 0))}
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
function RoomRow({ p, fp, unit, onLen, onDepth, onDoorW, onDoorH, onWin, onDoor, onHinge }: {
  p: FPRoom; fp: RoomFloorPlanConfig; unit: LengthUnit;
  onLen: (m: number | undefined) => void; onDepth: (m: number | undefined) => void;
  onDoorW: (m: number | undefined) => void; onDoorH: (m: number | undefined) => void;
  onWin: (m: number) => void; onDoor: (m: number) => void; onHinge: (h: "left" | "right") => void;
}) {
  const ov = fp.rooms?.[p.no] ?? {};
  const doorWMax = Math.max(0.4, Math.min(p.w - 0.15, p.d * 0.9));
  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5 pr-2 font-semibold text-slate-700">ROOM {p.no}</td>
      <td className="py-1.5 pr-2"><SchedLen m={ov.lengthM ?? p.w} unit={unit} onChange={(m) => onLen(m)} onClear={() => onLen(undefined)} custom={ov.lengthM != null} /></td>
      <td className="py-1.5 pr-2"><SchedLen m={ov.depthM ?? p.d} unit={unit} onChange={(m) => onDepth(m)} onClear={() => onDepth(undefined)} custom={ov.depthM != null} /></td>
      <td className="py-1.5 pr-2"><SchedLen m={p.doorWM} unit={unit} onChange={(m) => onDoorW(m)} onClear={() => onDoorW(undefined)} custom={ov.doorWidthM != null} max={doorWMax} /></td>
      <td className="py-1.5 pr-2"><SchedLen m={p.doorHM} unit={unit} onChange={(m) => onDoorH(m)} onClear={() => onDoorH(undefined)} custom={ov.doorHeightM != null} /></td>
      <td className="py-1.5 pr-2"><SchedLen m={p.doorFromLeftM} unit={unit} onChange={onDoor} max={p.w - p.doorWM} /></td>
      <td className="py-1.5 pr-2"><SchedLen m={p.winFromLeftM} unit={unit} onChange={onWin} max={p.w - p.winWM} /></td>
      <td className="py-1.5 pr-2">
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
          {(["left", "right"] as const).map((h) => (
            <button key={h} type="button" onClick={() => onHinge(h)}
              className={`px-2 py-1 text-[11px] ${p.hinge === h ? "bg-amber-100 font-semibold text-amber-800" : "bg-white text-slate-500 hover:text-slate-700"}`}>
              {h === "left" ? "Hinge L" : "Hinge R"}
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
}

function SchedLen({ m, unit, onChange, onClear, custom, max }: {
  m: number; unit: LengthUnit; onChange: (m: number) => void; onClear?: () => void; custom?: boolean; max?: number;
}) {
  if (unit === "ftin") {
    const { ft, inch } = toFeetInches(m);
    return (
      <span className="inline-flex items-center gap-1">
        <input type="number" step={1} value={ft} onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onChange(clampMax(fromFeetInches(parseInt(e.target.value, 10) || 0, inch), max))}
          className="h-7 w-12 rounded-md border border-slate-300 bg-white px-1 text-center text-xs" />
        <span className="text-[9px] text-slate-400">′</span>
        <input type="number" step={1} min={0} max={11} value={inch} onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onChange(clampMax(fromFeetInches(ft, parseInt(e.target.value, 10) || 0), max))}
          className="h-7 w-12 rounded-md border border-slate-300 bg-white px-1 text-center text-xs" />
        {onClear && custom && <button type="button" onClick={onClear} className="text-[10px] text-slate-400 hover:text-slate-700" title="Reset to global">↺</button>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input type="number" step={unitStep(unit)} value={toUnit(m, unit)} onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => { const v = parseFloat(e.target.value); onChange(clampMax(fromUnit(Number.isFinite(v) ? v : 0, unit), max)); }}
        className="h-7 w-20 rounded-md border border-slate-300 bg-white px-2 text-center text-xs" />
      {onClear && custom && <button type="button" onClick={onClear} className="text-[10px] text-slate-400 hover:text-slate-700" title="Reset to global">↺</button>}
    </span>
  );
}

function clampMax(v: number, max?: number) {
  if (max == null) return Math.max(0, v);
  return clamp(v, 0, Math.max(0, max));
}
