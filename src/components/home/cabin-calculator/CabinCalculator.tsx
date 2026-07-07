"use client";

import { useEffect, useId, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Building, Briefcase, Shield, Bath, BedDouble, Container, LayoutGrid, Warehouse,
  ArrowLeft, ArrowRight, Check, Loader2, Send, Download, MessageCircle,
  RotateCcw, Ruler, Zap, Sofa, Truck, DoorOpen, PanelsTopLeft, CheckCircle2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import logo from "@/assets/logo.webp";
import {
  PRODUCTS, STRUCTURES, WALL_MATERIALS, CEILING_MATERIALS, FLOORING_MATERIALS, INSULATION_OPTIONS,
  DOOR_TYPES, WINDOW_TYPES, WINDOW_TRACKS, windowUnitPrice, DOOR_SIZE, WINDOW_SIZE, CONTAINER_DOOR_SIZE, sizeLabel, formatFeet, ELECTRICAL_ITEMS, ADDONS,
  STORAGE_SIZES, VENTILATION_ITEMS, CONTAINER_GRADES, containerRate,
  WINDOW_POSITIONS, windowPositionLabel, LIGHT_COLORS, LED_SHAPES, isToiletCabin, isStorageProduct,
  isPufPanel, WALL_NONE, pufWallOptions, findWallMaterial, materialLabel,
  ROOFS, findRoof, ROOF_FLAT_PCT, ROOM_FURNITURE_IDS, furnitureRoomCounts, normalizeRoomLengths, TABLE_ADDON_IDS,
  FURNITURE_POSITIONS, PLUG_POINT_WALLS, PLUG_POINT_WALL_IDS, MOBILITY_TYPES,
  furniturePositionLabel, plugPointWallsLabel, mobilityTypeLabel,
  buildDefaultConfig, computeEstimate, summariseConfig, formatINR, cabinRatePerSqft,
  type CabinConfig, type Material, type Estimate, type InsulationOption,
} from "./pricing";
import { LayoutDesigner, CompleteLayoutPreview, summariseLayout } from "./LayoutDesigner";
import { ModulePlan } from "./ModulePlan";
import { SocketSwitchDiagram } from "./ElectricalDiagram";

// Steps a storage container customer sees — everything else (structure, interior,
// doors/windows, electrical, add-ons) is irrelevant and skipped.
const CONTAINER_STEP_KEYS = ["product", "size", "delivery", "quote"];

const WHATSAPP_NUMBER = "919731897976";
const STORAGE_KEY = "poc_cabin_config_v1";

const ICONS: Record<string, React.ElementType> = {
  building: Building, briefcase: Briefcase, shield: Shield, bath: Bath,
  bedDouble: BedDouble, container: Container, layout: LayoutGrid, warehouse: Warehouse,
  panels: PanelsTopLeft,
};

const STEPS = [
  { key: "product", title: "Product", icon: Building },
  { key: "size", title: "Size", icon: Ruler },
  { key: "structure", title: "Structure", icon: PanelsTopLeft },
  { key: "interior", title: "Interior", icon: LayoutGrid },
  { key: "openings", title: "Doors & Windows", icon: DoorOpen },
  { key: "electrical", title: "Electrical", icon: Zap },
  { key: "addons", title: "Add-ons", icon: Sofa },
  { key: "delivery", title: "Delivery", icon: Truck },
  { key: "quote", title: "Get Quotation", icon: Send },
] as const;

const badgeStyles: Record<string, string> = {
  "Most Chosen": "bg-accent text-white",
  "Best Value": "bg-emerald-500 text-white",
  "Budget Value": "bg-green-600 text-white",
  "Premium": "bg-navy-light text-white",
};

/* ---------------------------------------------------------------- */
/* Small building blocks                                            */
/* ---------------------------------------------------------------- */

/** Controlled `type="number"` inputs leave a leading zero the browser doesn't strip
 *  ("0654" stays), which then feeds a wrong value into pricing. This strips leading zeros
 *  (keeping a single one for decimals like "0.5"), writes the cleaned string back into the
 *  field so nothing sticks, and returns it for parsing. Applied to every numeric field. */
function cleanNumericInput(el: HTMLInputElement): string {
  const cleaned = el.value.replace(/^0+(?=\d)/, "");
  if (cleaned !== el.value) el.value = cleaned;
  return cleaned;
}
/** Select the field's contents on focus so typing over a default (e.g. "0" / "3") replaces
 *  it rather than prepending — i.e. the "0 auto-deletes when you type a number" behaviour. */
const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select();

function Stepper({
  value, onChange, min = 0, max = 999, className, label,
}: { value: number; onChange: (n: number) => void; min?: number; max?: number; className?: string; label: string }) {
  const set = (n: number) => onChange(Math.min(Math.max(n, min), max));
  return (
    <div className={cn("inline-flex items-center rounded-lg border border-border bg-background", className)}>
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => set(value - 1)}
        className="h-9 w-9 grid place-items-center text-lg font-semibold text-muted-foreground hover:text-accent disabled:opacity-40"
        disabled={value <= min}>−</button>
      <input type="number" inputMode="numeric" aria-label={label} value={Number.isFinite(value) ? value : ""}
        onFocus={selectOnFocus}
        onChange={(e) => set(parseInt(cleanNumericInput(e.currentTarget), 10) || min)}
        className="h-9 w-12 border-x border-border bg-transparent text-center text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
      <button type="button" aria-label={`Increase ${label}`} onClick={() => set(value + 1)}
        className="h-9 w-9 grid place-items-center text-lg font-semibold text-muted-foreground hover:text-accent disabled:opacity-40"
        disabled={value >= max}>+</button>
    </div>
  );
}

function DimField({
  label, value, onChange, suffix = "ft", optional, max,
}: { label: string; value: number; onChange: (n: number) => void; suffix?: string; optional?: boolean; max?: number }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label} {optional && <span className="opacity-60">(optional)</span>}
      </Label>
      <div className="relative">
        <Input id={id} type="number" inputMode="decimal" min={0} max={max} value={Number.isFinite(value) ? value : ""}
          onFocus={selectOnFocus}
          onChange={(e) => { const n = parseFloat(cleanNumericInput(e.currentTarget)) || 0; onChange(max != null ? Math.min(n, max) : n); }}
          className="pr-9" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

/** A price-aware selectable pill for materials / door / window types. */
function MaterialChip({
  item, selected, onSelect,
}: { item: Material & { price?: number }; selected: boolean; onSelect: () => void }) {
  const delta = item.delta;
  const badge = item.standard
    ? "Standard"
    : delta === 0 ? "" : delta > 0 ? `+₹${delta}/sqft` : `−₹${Math.abs(delta)}/sqft`;
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition-all",
        selected ? "border-accent bg-accent/10 ring-1 ring-accent shadow-sm" : "border-border bg-background hover:border-accent/50",
      )}>
      <span className="text-sm font-semibold text-foreground">{item.label}</span>
      {badge && (
        <span className={cn("text-[11px] font-medium",
          item.standard ? "text-muted-foreground" : delta > 0 ? "text-accent" : "text-emerald-500")}>
          {badge}
        </span>
      )}
      {item.thickness && (
        <span className="text-[10px] font-medium text-muted-foreground/80">{item.thickness} board</span>
      )}
    </button>
  );
}

function PricedChip({
  label, price, selected, onSelect, priceLabel,
}: { label: string; price: number; selected: boolean; onSelect: () => void; priceLabel?: string }) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition-all",
        selected ? "border-accent bg-accent/10 ring-1 ring-accent shadow-sm" : "border-border bg-background hover:border-accent/50",
      )}>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="text-[11px] font-medium text-accent">{priceLabel ?? `${formatINR(price)} each`}</span>
    </button>
  );
}

/* ---------------------------------------------------------------- */
/* Main electrical board (DB / MCB) — always mounted beside the door */
/* ---------------------------------------------------------------- */
// Given the main (first) door, return the svg box for the main electrical board,
// mounted on the interior wall right beside the entry door. null if no usable door.
function mainBoardBox(
  door: { side: string; offset: number } | undefined,
  L: number, W: number, w: number, h: number, pad: number,
): { x: number; y: number; bw: number; bh: number } | null {
  if (!door) return null;
  const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const horiz = door.side === "top" || door.side === "bottom";
  // Match the floor-plan door: the offset is the near edge, the door spans `len` into the
  // wall from there (start-from-corner). The MB sits beside the door's centre.
  const scale = horiz ? w / Math.max(1, L) : h / Math.max(1, W);
  const spanPx = horiz ? w : h;
  const len = Math.max(12, Math.min(DOOR_SIZE.widthFt * scale, spanPx * 0.9));
  const pipe = 3;
  const startPx = Math.min(Math.max(cl(door.offset, 0, horiz ? L : W) * scale, pipe), Math.max(pipe, spanPx - pipe - len));
  const centre = pad + startPx + len / 2;
  const cx = door.side === "left" ? pad : door.side === "right" ? pad + w : centre;
  const cy = door.side === "top" ? pad : door.side === "bottom" ? pad + h : centre;
  const bw = 12, bh = 7, gap = 16, inset = 8;
  if (door.side === "top")   return { x: cl(cx + gap, pad + 2, pad + w - bw - 2), y: pad + inset, bw, bh };
  if (door.side === "left")  return { x: pad + inset, y: cl(cy + gap, pad + 2, pad + h - bh - 2), bw, bh };
  if (door.side === "right") return { x: pad + w - inset - bw, y: cl(cy + gap, pad + 2, pad + h - bh - 2), bw, bh };
  return { x: cl(cx + gap, pad + 2, pad + w - bw - 2), y: pad + h - inset - bh, bw, bh }; // bottom / front
}
// Small "MB" plate + tooltip, drawn beside the door in the floor-plan drawings.
function MainBoardMark({ box }: { box: { x: number; y: number; bw: number; bh: number } | null }) {
  if (!box) return null;
  const { x, y, bw, bh } = box;
  return (
    <g>
      <title>Main Board — main electrical distribution / MCB board, mounted beside the entry door</title>
      <rect x={x} y={y} width={bw} height={bh} rx={1} fill="hsl(var(--accent) / 0.9)" stroke="hsl(var(--background))" strokeWidth={0.7} />
      <text x={x + bw / 2} y={y + bh / 2 + 2.4} textAnchor="middle" fontSize={4.8} fontWeight={800}
        fill="hsl(var(--background))" style={{ pointerEvents: "none" }}>MB</text>
    </g>
  );
}

/* ---------------------------------------------------------------- */
/* Live 2D floor-plan preview                                       */
/* ---------------------------------------------------------------- */
function FloorPreview({ length, width, doorPlacements, windowPositions, windowWidthFt, windowHeightFt, containerDoor, roomLengths, partitionDoor, puf }: { length: number; width: number; doorPlacements?: { side: string; offset: number }[]; windowPositions: string[]; windowWidthFt?: number; windowHeightFt?: number; containerDoor?: boolean; roomLengths?: number[]; partitionDoor?: boolean; puf?: boolean }) {
  const L = Math.max(1, length), W = Math.max(1, width);
  // The customer's chosen window size (falls back to the 3×3 default).
  const winW = Math.min(Math.max(windowWidthFt ?? WINDOW_SIZE.widthFt, 1), 12);
  const winH = Math.min(Math.max(windowHeightFt ?? WINDOW_SIZE.heightFt, 1), 12);
  const winLabel = sizeLabel({ widthFt: winW, heightFt: winH });
  const maxW = 300, maxH = 180;
  const scale = Math.min(maxW / L, maxH / W);
  const w = L * scale, h = W * scale;
  const pad = 26;
  const vbW = w + pad * 2, vbH = h + pad * 2;
  const win = "hsl(var(--accent) / 0.6)";
  // Centre point + orientation for each window position along the wall edges.
  const marks: Record<string, { cx: number; cy: number; horizontal: boolean }> = {
    "top-left":      { cx: pad + w * 0.20, cy: pad,           horizontal: true },
    "top-center":    { cx: pad + w * 0.50, cy: pad,           horizontal: true },
    "top-right":     { cx: pad + w * 0.80, cy: pad,           horizontal: true },
    "bottom-left":   { cx: pad + w * 0.20, cy: pad + h,       horizontal: true },
    "bottom-center": { cx: pad + w * 0.50, cy: pad + h,       horizontal: true },
    "bottom-right":  { cx: pad + w * 0.80, cy: pad + h,       horizontal: true },
    "bottom":        { cx: pad + w * 0.50, cy: pad + h,       horizontal: true }, // legacy alias
    "left":          { cx: pad,            cy: pad + h * 0.5, horizontal: false },
    "right":         { cx: pad + w,        cy: pad + h * 0.5, horizontal: false },
  };
  // Corrugated (ribbed-sheet) wall outline — a shallow sawtooth along each wall.
  const corr = (() => {
    const amp = 2.2;
    const seg = (x0: number, y0: number, x1: number, y1: number) => {
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * amp, ny = (dx / len) * amp; // inward normal (walking clockwise)
      const teeth = Math.max(3, Math.round(len / 7));
      let s = "";
      for (let i = 1; i <= teeth; i++) {
        const t = i / teeth, bx = x0 + dx * t, by = y0 + dy * t;
        s += i % 2 ? ` L ${(bx + nx).toFixed(1)} ${(by + ny).toFixed(1)}` : ` L ${bx.toFixed(1)} ${by.toFixed(1)}`;
      }
      return s;
    };
    const x = pad, y = pad, x2 = pad + w, y2 = pad + h;
    return `M ${x} ${y}${seg(x, y, x2, y)}${seg(x2, y, x2, y2)}${seg(x2, y2, x, y2)}${seg(x, y2, x, y)} Z`;
  })();
  // Opening size label, placed just outside the wall it sits on (top/bottom) or just
  // inside (left/right, to clear the outer length/width dimension text).
  const sizeText = (edge: string, cx: number, cy: number, text: string, key: string) => {
    let x = cx, y = cy;
    let anchor: "start" | "middle" | "end" = "middle";
    if (edge === "top") y = pad - 5;
    else if (edge === "bottom") y = pad + h + 9;
    else if (edge === "left") { x = pad + 6; y = cy + 3; anchor = "start"; }
    else if (edge === "right") { x = pad + w - 6; y = cy + 3; anchor = "end"; }
    return (
      <text key={key} x={x} y={y} textAnchor={anchor} fontSize={7.5} fontWeight={600} fill="hsl(var(--muted-foreground))">{text}</text>
    );
  };
  // Draw each opening to scale from its real width (ft), with a minimum for legibility.
  const markLen = (widthFt: number, spanPx: number) => Math.max(12, Math.min(widthFt * scale, spanPx * 0.9));
  return (
    <div>
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-auto" role="img" aria-label={`Floor plan ${length} by ${width} feet`}>
      {/* Outer wall: corrugated ribbed sheet (MS / GI / container) OR a plain PUF sandwich
          panel (no corrugation). The fill makes the footprint read as the cabin interior. */}
      {puf ? (
        <rect x={pad} y={pad} width={w} height={h} rx={1} fill="hsl(var(--accent) / 0.08)" stroke="hsl(var(--accent))" strokeWidth={1.6} />
      ) : (
        <path d={corr} fill="hsl(var(--accent) / 0.08)" stroke="hsl(var(--accent))" strokeWidth={1.6} strokeLinejoin="round" />
      )}
      {/* Internal wall — the finished PLAIN inner surface, inset from the outer sheet so the
          plan shows the real build-up: outer wall (sheet / panel) + inner plain wall. */}
      <rect x={pad + 5} y={pad + 5} width={Math.max(0, w - 10)} height={Math.max(0, h - 10)} rx={1}
        fill="none" stroke="hsl(var(--muted-foreground) / 0.75)" strokeWidth={1.1} />
      {/* Door: storage containers get a full-height DOUBLE door on the 8 ft end
          (right edge); cabins get a single door on the front (bottom) wall. */}
      {containerDoor ? (
        <g>
          <rect x={pad + w - 2} y={pad + 1}         width={7} height={h / 2 - 2} rx={1} fill="hsl(var(--accent))" />
          <rect x={pad + w - 2} y={pad + h / 2 + 1} width={7} height={h / 2 - 2} rx={1} fill="hsl(var(--accent))" />
          {/* open-leaf hint — the two doors swing outward */}
          <line x1={pad + w + 5} y1={pad + 2}     x2={pad + w + 17} y2={pad - 3}     stroke="hsl(var(--accent) / 0.5)" strokeWidth={1.4} />
          <line x1={pad + w + 5} y1={pad + h - 2} x2={pad + w + 17} y2={pad + h + 3} stroke="hsl(var(--accent) / 0.5)" strokeWidth={1.4} />
          {sizeText("right", pad + w, pad + h / 2, sizeLabel(CONTAINER_DOOR_SIZE), "cd")}
        </g>
      ) : (
        (doorPlacements ?? []).map((d, i) => {
          const horiz = d.side === "top" || d.side === "bottom";
          const len = markLen(DOOR_SIZE.widthFt, horiz ? w : h);
          const pipe = 3; // corner pipe / frame inset — the opening starts here at "0 ft"
          // offset (ft from the near corner: left for top/bottom, top for left/right) is the
          // door's NEAR edge; the opening then spans `len` INTO the wall. Clamp so it always
          // sits between the two corner pipes (0 ft = flush to the corner pipe, not outside).
          const startPx = horiz
            ? Math.min(Math.max((Math.max(d.offset, 0) / L) * w, pipe), Math.max(pipe, w - pipe - len))
            : Math.min(Math.max((Math.max(d.offset, 0) / W) * h, pipe), Math.max(pipe, h - pipe - len));
          const wallX = d.side === "left" ? pad : pad + w;
          const wallY = d.side === "top" ? pad : pad + h;
          const cx = horiz ? pad + startPx + len / 2 : wallX; // door centre (for the size label)
          const cy = horiz ? wallY : pad + startPx + len / 2;
          return (
            <g key={i}>
              {horiz
                ? <rect x={pad + startPx} y={wallY - 3} width={len} height={6} rx={1} fill="hsl(var(--accent))" />
                : <rect x={wallX - 3} y={pad + startPx} width={6} height={len} rx={1} fill="hsl(var(--accent))" />}
              {sizeText(d.side, cx, cy, sizeLabel(DOOR_SIZE), `dl${i}`)}
            </g>
          );
        })
      )}
      {/* Main electrical board (DB/MCB) — interior wall, beside the main door */}
      <MainBoardMark box={mainBoardBox(containerDoor ? { side: "right", offset: W / 2 } : doorPlacements?.[0], L, W, w, h, pad)} />
      {/* Windows at their chosen positions — drawn to scale and labelled with size */}
      {windowPositions.map((id) => {
        const m = marks[id];
        if (!m) return null;
        const edge = m.horizontal ? (m.cy <= pad + 1 ? "top" : "bottom") : (m.cx <= pad + 1 ? "left" : "right");
        // Window is drawn along the wall to its real WIDTH (top-down view).
        const len = markLen(winW, m.horizontal ? w : h);
        return (
          <g key={id}>
            {m.horizontal
              ? <rect x={m.cx - len / 2} y={m.cy - 3} width={len} height={6} rx={1} fill={win} />
              : <rect x={m.cx - 3} y={m.cy - len / 2} width={6} height={len} rx={1} fill={win} />}
            {sizeText(edge, m.cx, m.cy, winLabel, `wl${id}`)}
          </g>
        );
      })}
      {/* Multi-room partition walls (door gap + swing when partitions have doors) */}
      {roomLengths && roomLengths.length > 1 && (() => {
        const n = roomLengths.length;
        const dTop = pad + h * 0.55, dH = Math.min(h * 0.34, 34);
        const edges: number[] = [];   // svg x of each internal partition
        const mids: number[] = [];    // svg x mid of each room (for labels)
        let acc = 0, prevX = pad;
        for (let i = 0; i < n; i++) {
          acc += roomLengths[i];
          const x = Math.min(pad + w * (acc / L), pad + w);
          mids.push((prevX + x) / 2);
          if (i < n - 1) edges.push(x);
          prevX = x;
        }
        return (
          <g>
            {edges.map((px, i) => (
              <g key={i}>
                <line x1={px} y1={pad} x2={px} y2={partitionDoor ? dTop : pad + h} stroke="hsl(var(--accent))" strokeWidth={2} />
                {partitionDoor && <line x1={px} y1={dTop + dH} x2={px} y2={pad + h} stroke="hsl(var(--accent))" strokeWidth={2} />}
                {partitionDoor && <line x1={px} y1={dTop} x2={px + dH} y2={dTop} stroke="hsl(var(--accent))" strokeWidth={1.4} />}
                {partitionDoor && <path d={`M ${px + dH} ${dTop} A ${dH} ${dH} 0 0 1 ${px} ${dTop + dH}`} fill="none" stroke="hsl(var(--accent) / 0.4)" strokeWidth={1} />}
              </g>
            ))}
            {roomLengths.map((rl, i) => (
              <text key={`r${i}`} x={mids[i]} y={pad + 13} textAnchor="middle" fontSize={8} fill="hsl(var(--muted-foreground))">R{i + 1} · {Math.round(rl)}ft</text>
            ))}
          </g>
        );
      })()}
      <text x={pad + w / 2} y={pad + h + 16} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">{length} ft</text>
      <text x={pad - 10} y={pad + h / 2} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))"
        transform={`rotate(-90 ${pad - 10} ${pad + h / 2})`}>{width} ft</text>
    </svg>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[9px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-[1px] border border-accent bg-accent/15" /> {puf ? "PUF panel wall" : "Outer wall (sheet)"}</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-0 w-3 border-t border-muted-foreground/70" /> Inner plain wall</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-[1px] bg-accent" /> Main Board (MB) — beside door</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* 4-wall elevations (Front / Rear / Left / Right)                  */
/* Openings are placed from the SAME data the floor plan uses, so    */
/* the elevations always match the plan: the door wall (side) and    */
/* each window position map to a specific wall + offset.             */
/* ---------------------------------------------------------------- */
type WallKey = "front" | "rear" | "left" | "right";

// Floor-plan door side → which elevation it appears on.
const DOOR_WALL: Record<string, WallKey> = { bottom: "front", top: "rear", left: "left", right: "right" };
// Window position → wall + how far along that wall (0..1).
const WINDOW_WALL: Record<string, { wall: WallKey; along: number }> = {
  "top-left":      { wall: "rear",  along: 0.20 },
  "top-center":    { wall: "rear",  along: 0.50 },
  "top-right":     { wall: "rear",  along: 0.80 },
  "bottom-left":   { wall: "front", along: 0.20 },
  "bottom-center": { wall: "front", along: 0.50 },
  "bottom-right":  { wall: "front", along: 0.80 },
  "bottom":        { wall: "front", along: 0.50 }, // legacy alias
  "left":          { wall: "left",  along: 0.50 },
  "right":         { wall: "right", along: 0.50 },
};

// Each wall's [left-end, right-end] top corner as seen in its elevation, for the corner
// lifting hooks. FL/FR/RL/RR = front|rear × left|right; each corner is shared by two walls.
const WALL_TOP_CORNERS: Record<WallKey, [string, string]> = {
  front: ["FL", "FR"], rear: ["RL", "RR"], left: ["FL", "RL"], right: ["FR", "RR"],
};

function Elevations({
  length, width, height, doorPlacements, windowPositions, windowWidthFt, windowHeightFt, containerDoor, roof,
}: {
  length: number; width: number; height: number;
  doorPlacements?: { side: string; offset: number }[]; windowPositions: string[];
  windowWidthFt?: number; windowHeightFt?: number; containerDoor?: boolean; roof?: string;
}) {
  const L = Math.max(1, length), W = Math.max(1, width), H = Math.max(6, height);
  // Lifting hooks: 2 diagonal corners for ≤100 sq.ft, 4 corners above — mirrors the 2D plan.
  const nHooks = L * W > 100 ? 4 : 2;
  const hookCorners = new Set(nHooks === 4 ? ["FL", "FR", "RL", "RR"] : ["RL", "FR"]);
  // The customer's chosen window size (falls back to the 3×3 default).
  const winWFt = Math.min(Math.max(windowWidthFt ?? WINDOW_SIZE.widthFt, 1), 12);
  const winHFt = Math.min(Math.max(windowHeightFt ?? WINDOW_SIZE.heightFt, 1), 12);

  // Gather openings per wall (fractions along each wall's own width).
  const walls: Record<WallKey, { widthFt: number; doors: number[]; windows: number[] }> = {
    front: { widthFt: L, doors: [], windows: [] },
    rear:  { widthFt: L, doors: [], windows: [] },
    left:  { widthFt: W, doors: [], windows: [] },
    right: { widthFt: W, doors: [], windows: [] },
  };
  (doorPlacements ?? []).forEach((d) => {
    const wall = DOOR_WALL[d.side];
    if (!wall) return;
    const span = wall === "front" || wall === "rear" ? L : W;
    walls[wall].doors.push(Math.min(0.9, Math.max(0.1, d.offset / span)));
  });
  (windowPositions ?? []).forEach((id) => {
    const m = WINDOW_WALL[id];
    if (m) walls[m.wall].windows.push(m.along);
  });

  // Shared scale → proportions read correctly across all four walls in one viewBox.
  const scale = Math.min(150 / Math.max(L, W), 96 / H);
  const wallH = H * scale;
  // Sloped 2-side roof is the default; "flat" opts out. Storage/shipping containers are
  // ALWAYS flat-roofed regardless of the roof value (defensive against stale saved configs).
  const sloped = roof !== "flat" && !containerDoor;
  // A real 2-side sloped/shed roof rises only ~6–8 inches above the wall top. Render
  // that true, to-scale rise (8" = 0.667 ft, the max) instead of the old exaggerated
  // 42%-of-wall gable. `scale` is px per foot; the small floor keeps it visible at big
  // cabin sizes without ever exceeding the real 8-inch rise meaningfully.
  const peak = sloped ? Math.max(2, (8 / 12) * scale) : 0; // roof rise above the wall top (~8")
  const roofH = 6, labelH = 18, cellPadX = 14, gap = 14;
  const hookH = 13; // vertical room above the roof for the corner lifting hooks
  const cellW = L * scale + cellPadX * 2; // the length walls are widest → set column width
  const cellH = wallH + roofH + peak + hookH + labelH + 8;
  const vbW = cellW * 2 + gap, vbH = cellH * 2 + gap;

  const acc = "hsl(var(--accent))";
  const accSoft = "hsl(var(--accent) / 0.5)";
  const glass = "hsl(var(--accent) / 0.18)";

  const cells: { key: WallKey; label: string; ox: number; oy: number }[] = [
    { key: "front", label: "Front", ox: 0, oy: 0 },
    { key: "rear", label: "Rear", ox: cellW + gap, oy: 0 },
    { key: "left", label: "Left", ox: 0, oy: cellH + gap },
    { key: "right", label: "Right", ox: cellW + gap, oy: cellH + gap },
  ];

  const renderWall = (cell: (typeof cells)[number]) => {
    const wdat = walls[cell.key];
    const wallW = wdat.widthFt * scale;
    const wx = cell.ox + (cellW - wallW) / 2;
    const wy = cell.oy + roofH + peak + hookH;
    const ground = wy + wallH;
    // Storage containers carry their double doors on the right (end) wall — mirrors the plan.
    const containerEnd = containerDoor && cell.key === "right";

    const ribs: React.ReactNode[] = [];
    for (let x = wx + 9; x < wx + wallW - 2; x += 9) {
      ribs.push(<line key={`rib${x}`} x1={x} y1={wy + 2} x2={x} y2={ground - 2} stroke={acc} strokeOpacity={0.12} strokeWidth={0.8} />);
    }

    // Window drawn to its real size (width × height ft) via the shared px-per-ft
    // `scale`, sat on a ~3 ft sill and kept inside the wall.
    const winWpx = Math.max(7, Math.min(winWFt * scale, wallW - 6));
    const winHpx = Math.max(7, Math.min(winHFt * scale, wallH - 6));
    const sillPx = Math.min(3 * scale, Math.max(2, wallH - winHpx - 4));
    const winY = ground - sillPx - winHpx;
    const windows = wdat.windows.map((frac, i) => {
      const cx = wx + wallW * frac;
      const x = Math.min(Math.max(cx - winWpx / 2, wx + 3), wx + wallW - winWpx - 3);
      const yc = winY + winHpx / 2;
      return (
        <g key={`w${i}`}>
          <rect x={x} y={winY} width={winWpx} height={winHpx} rx={1} fill={glass} stroke={acc} strokeWidth={1} />
          <line x1={x + winWpx / 2} y1={winY} x2={x + winWpx / 2} y2={winY + winHpx} stroke={acc} strokeWidth={0.7} />
          <line x1={x} y1={yc} x2={x + winWpx} y2={yc} stroke={acc} strokeWidth={0.7} />
        </g>
      );
    });

    let doors: React.ReactNode;
    if (containerEnd) {
      const dW = Math.min(wallW * 0.72, wallW - 6), dH = wallH * 0.86;
      const dx = wx + (wallW - dW) / 2, dy = ground - dH;
      doors = (
        <g>
          <rect x={dx} y={dy} width={dW} height={dH} rx={1} fill={accSoft} stroke={acc} strokeWidth={1.2} />
          <line x1={dx + dW / 2} y1={dy} x2={dx + dW / 2} y2={dy + dH} stroke={acc} strokeWidth={1.2} />
          <line x1={dx + dW / 2 - 3} y1={dy + dH / 2} x2={dx + dW / 2 - 3} y2={dy + dH / 2 + 8} stroke={acc} strokeWidth={1.4} />
          <line x1={dx + dW / 2 + 3} y1={dy + dH / 2} x2={dx + dW / 2 + 3} y2={dy + dH / 2 + 8} stroke={acc} strokeWidth={1.4} />
        </g>
      );
    } else {
      // Door to its real standard height (DOOR_SIZE, 6 ft) via the shared scale.
      const dW = Math.max(9, Math.min(wallW * 0.14, 22));
      const dH = Math.min(DOOR_SIZE.heightFt * scale, wallH - 3);
      doors = wdat.doors.map((frac, i) => {
        const cx = wx + wallW * frac, x = cx - dW / 2, y = ground - dH;
        return (
          <g key={`d${i}`}>
            <rect x={x} y={y} width={dW} height={dH} rx={1} fill={acc} />
            <circle cx={x + dW - 2.5} cy={y + dH / 2} r={1.2} fill="#fff" />
          </g>
        );
      });
    }

    const isWidthWall = cell.key === "left" || cell.key === "right";
    // Roof: flat = a thin cap; sloped (default) = a 2-slope gable. Both slopes show as a
    // full peak on the WIDTH-side elevations; the length sides show a low ridge trapezoid
    // (the ridge runs along the length, shedding to the two width sides).
    let roofNode: React.ReactNode;
    if (!sloped) {
      roofNode = <rect x={wx - 4} y={wy - roofH} width={wallW + 8} height={roofH} rx={1} fill={accSoft} />;
    } else if (isWidthWall) {
      roofNode = <polygon points={`${wx - 4},${wy} ${wx + wallW / 2},${wy - peak} ${wx + wallW + 4},${wy}`} fill={accSoft} stroke={acc} strokeWidth={1.2} strokeLinejoin="round" />;
    } else {
      const inset = Math.min(wallW * 0.16, 26);
      roofNode = <polygon points={`${wx - 4},${wy} ${wx + inset},${wy - peak} ${wx + wallW - inset},${wy - peak} ${wx + wallW + 4},${wy}`} fill={accSoft} stroke={acc} strokeWidth={1.2} strokeLinejoin="round" />;
    }
    // Corner lifting hooks (plate-bar with a shackle hole) rising above the roof at the
    // wall's top corners — only where that corner actually carries a hook.
    const [cL, cR] = WALL_TOP_CORNERS[cell.key];
    const hook = (hx: number, k: string) => (
      <g key={k}>
        <rect x={hx - 1.8} y={wy - 13} width={3.6} height={13} rx={1.5} fill="none" stroke={acc} strokeWidth={1.2} />
        <circle cx={hx} cy={wy - 9} r={1.7} fill="none" stroke={acc} strokeWidth={1.1} />
      </g>
    );
    return (
      <g key={cell.key}>
        {roofNode}
        {hookCorners.has(cL) && hook(wx, "hkL")}
        {hookCorners.has(cR) && hook(wx + wallW, "hkR")}
        <rect x={wx} y={wy} width={wallW} height={wallH} rx={1.5} fill="hsl(var(--accent) / 0.06)" stroke={acc} strokeWidth={1.4} />
        {ribs}
        <line x1={wx - 6} y1={ground} x2={wx + wallW + 6} y2={ground} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
        {windows}
        {doors}
        <text x={cell.ox + cellW / 2} y={ground + 13} textAnchor="middle" fontSize={9.5} fill="hsl(var(--muted-foreground))">
          <tspan fontWeight="700" fill="hsl(var(--foreground))">{cell.label}</tspan> · {formatFeet(wdat.widthFt)}×{formatFeet(H)}
        </text>
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-auto" role="img"
      aria-label={`Four wall elevations — front, rear, left and right — of a ${length} by ${width} by ${height} foot cabin`}>
      {cells.map(renderWall)}
    </svg>
  );
}

/** Preview with a Floor Plan / 4 Elevations toggle. */
function CabinPreview({
  length, width, height, doorPlacements, windowPositions, windowWidthFt, windowHeightFt,
  containerDoor, roomLengths, partitionDoor, puf, roof, caption, config,
}: {
  length: number; width: number; height: number;
  doorPlacements?: { side: string; offset: number }[]; windowPositions: string[];
  windowWidthFt?: number; windowHeightFt?: number; containerDoor?: boolean;
  roomLengths?: number[]; partitionDoor?: boolean; puf?: boolean; roof?: string; caption?: string;
  config?: CabinConfig;
}) {
  // "module" = the full architectural 2D plan (needs the whole config); default when available.
  const [view, setView] = useState<"module" | "plan" | "elevation">(config ? "module" : "plan");
  const tabs = ([["module", "2D Plan"], ["plan", "Floor Plan"], ["elevation", "4 Elevations"]] as const)
    .filter(([v]) => v !== "module" || config);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {tabs.map(([v, lbl]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
              className={cn("rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                view === v ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground")}>
              {lbl}
            </button>
          ))}
        </div>
        {caption && <span className="text-[10px] text-muted-foreground">{caption}</span>}
      </div>
      {view === "module" && config ? (
        <ModulePlan config={config} />
      ) : view === "elevation" ? (
        <Elevations length={length} width={width} height={height} doorPlacements={doorPlacements}
          windowPositions={windowPositions} windowWidthFt={windowWidthFt} windowHeightFt={windowHeightFt}
          containerDoor={containerDoor} roof={roof} />
      ) : (
        <FloorPreview length={length} width={width} doorPlacements={doorPlacements} windowPositions={windowPositions}
          windowWidthFt={windowWidthFt} windowHeightFt={windowHeightFt}
          containerDoor={containerDoor} roomLengths={roomLengths} partitionDoor={partitionDoor} puf={puf} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Furniture-by-room layout (Add-ons step)                          */
/* ---------------------------------------------------------------- */
// `id` is unique (React key); `type` is the base add-on id (workstation/manager/…)
// used for placement + short-label lookup — a single item may be split across rooms.
type FurnitureItem = { id: string; type: string; label: string; room: number; qty: number };
const FURNITURE_SHORT: Record<string, string> = {
  workstation: "Workstation", manager: "Manager", conference: "Conference", cupboard: "Cupboard", chairs: "Chairs",
};
// Furniture placement within a room, as a fraction (fx across room width, fy top→bottom).
// Conference table sits in the centre; desks/tables go against a wall by default, or toward
// the centre when the customer picks "Centre" in Furniture Position.
function furniturePlacement(id: string, centre: boolean): { fx: number; fy: number } {
  switch (id) {
    case "conference": return { fx: 0.5, fy: 0.48 };
    case "manager":    return centre ? { fx: 0.42, fy: 0.42 } : { fx: 0.27, fy: 0.17 };
    case "workstation": return centre ? { fx: 0.6, fy: 0.56 } : { fx: 0.5, fy: 0.85 };
    case "cupboard":   return { fx: 0.86, fy: 0.17 };
    case "chairs":     return { fx: 0.63, fy: 0.72 };
    default:           return centre ? { fx: 0.5, fy: 0.5 } : { fx: 0.5, fy: 0.85 };
  }
}
function FurniturePlan({ length, width, roomLengths, items, furniturePosition, doorPlacements }: {
  length: number; width: number; roomLengths?: number[]; items: FurnitureItem[]; furniturePosition?: string;
  doorPlacements?: { side: string; offset: number }[];
}) {
  const L = Math.max(1, length), W = Math.max(1, width);
  const scale = Math.min(300 / L, 150 / W);
  const w = L * scale, h = W * scale, pad = 22;
  const vbW = w + pad * 2, vbH = h + pad * 2;
  const rooms = roomLengths && roomLengths.length > 0 ? roomLengths : [L];
  const n = rooms.length;
  const centre = furniturePosition === "centre";
  // Cumulative svg x boundaries: edges[0]=pad … edges[n]=pad+w
  const edges: number[] = [pad];
  let acc = 0;
  for (let i = 0; i < n; i++) { acc += rooms[i]; edges.push(Math.min(pad + w * (acc / L), pad + w)); }
  // Draw each furniture item as a labelled box at its type's placement, clamped inside the room.
  const renderItems = (list: FurnitureItem[], x0: number, x1: number) => {
    const rw = Math.max(1, x1 - x0);
    const boxW = Math.min(48, rw * 0.7), boxH = 14;
    return list.map((it) => {
      const { fx, fy } = furniturePlacement(it.type, centre);
      const cx = Math.max(x0 + boxW / 2 + 1, Math.min(x1 - boxW / 2 - 1, x0 + rw * fx));
      const cy = Math.max(pad + boxH / 2 + 12, Math.min(pad + h - boxH / 2 - 2, pad + h * fy));
      return (
        <g key={it.id}>
          <rect x={cx - boxW / 2} y={cy - boxH / 2} width={boxW} height={boxH} rx={3}
            fill="hsl(var(--accent) / 0.14)" stroke="hsl(var(--accent))" strokeWidth={1} />
          <text x={cx} y={cy + 3} textAnchor="middle" fontSize={7} fontWeight={600} fill="hsl(var(--foreground))">
            {FURNITURE_SHORT[it.type] ?? it.label}{it.qty > 1 ? ` ×${it.qty}` : ""}
          </text>
        </g>
      );
    });
  };
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="w-full h-auto" role="img" aria-label="Furniture layout by room">
        <rect x={pad} y={pad} width={w} height={h} rx={2} fill="hsl(var(--accent) / 0.06)" stroke="hsl(var(--accent))" strokeWidth={1.4} />
        {edges.slice(1, n).map((x, i) => (
          <line key={i} x1={x} y1={pad} x2={x} y2={pad + h} stroke="hsl(var(--accent))" strokeWidth={2} />
        ))}
        {rooms.map((rl, i) => {
          const roomNo = i + 1;
          const x0 = edges[i], x1 = edges[i + 1];
          const roomItems = items.filter((it) => Math.min(Math.max(it.room, 1), n) === roomNo);
          return (
            <g key={i}>
              {n > 1 && (
                <text x={(x0 + x1) / 2} y={pad + 12} textAnchor="middle" fontSize={8} fontWeight={700} fill="hsl(var(--muted-foreground))">Room {roomNo} · {Math.round(rl)}ft</text>
              )}
              {renderItems(roomItems, x0, x1)}
            </g>
          );
        })}
        {/* Main electrical board (DB/MCB) — beside the main door */}
        <MainBoardMark box={mainBoardBox(doorPlacements?.[0], L, W, w, h, pad)} />
      </svg>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">Furniture placement (indicative) · MB = Main Board</p>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Estimate breakdown panel                                         */
/* ---------------------------------------------------------------- */
function EstimateRows({ est, gstOn, container }: { est: Estimate; gstOn: boolean; container?: boolean }) {
  const Row = ({ label, value, positive, muted }: { label: string; value: string; positive?: boolean; muted?: boolean }) => (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className={cn(muted ? "text-muted-foreground" : "text-foreground/90")}>{label}</span>
      <span className={cn("font-mono font-medium tabular-nums", positive ? "text-accent" : "text-foreground")}>{value}</span>
    </div>
  );
  const contactLabel = container ? "Contact for Rate" : "Contact us Directly";
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between gap-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
        <span>Cabin Size</span>
        <span>{est.area} sq.ft{est.quantity > 1 ? ` × ${est.quantity}` : ""}</span>
      </div>
      <Row label={container ? "Base Container Rate" : "Base Cabin"} value={est.contactRequired ? contactLabel : formatINR(est.base)} />
      {est.heightSurcharge > 0 && <Row label={`Extra Height (${est.dimHeight}′)`} value={`+${formatINR(est.heightSurcharge)}`} positive />}
      {est.roofSurcharge > 0 && <Row label={`Flat Roof (+${ROOF_FLAT_PCT})`} value={`+${formatINR(est.roofSurcharge)}`} positive />}
      {est.interior !== 0 && <Row label="Interior Upgrade" value={`${est.interior > 0 ? "+" : ""}${formatINR(est.interior)}`} positive={est.interior > 0} />}
      {est.insulation > 0 && <Row label="Insulation" value={`+${formatINR(est.insulation)}`} positive />}
      {est.openings > 0 && <Row label="Doors & Windows" value={`+${formatINR(est.openings)}`} positive />}
      {est.ventilation > 0 && <Row label="Ventilation" value={`+${formatINR(est.ventilation)}`} positive />}
      {est.electrical > 0 && <Row label="Electrical" value={`+${formatINR(est.electrical)}`} positive />}
      {est.furniture > 0 && <Row label="Furniture / Add-ons" value={`+${formatINR(est.furniture)}`} positive />}
      {est.quantity > 1 && (
        <div className="mt-1 border-t border-dashed border-border pt-1">
          <Row label={`Per cabin`} value={formatINR(est.perCabin)} muted />
          <Row label={`× ${est.quantity} cabins`} value={formatINR(est.cabinsSubtotal)} />
        </div>
      )}
      {est.transport > 0 && <Row label="Transport" value={`+${formatINR(est.transport)}`} positive />}
      {est.installation > 0 && <Row label="Installation" value={`+${formatINR(est.installation)}`} positive />}
      <div className="mt-1 border-t border-border pt-1.5">
        <Row label="Subtotal" value={est.contactRequired ? contactLabel : formatINR(est.subtotal)} muted />
        {gstOn && <Row label="GST (18%)" value={est.contactRequired ? "As applicable" : `+${formatINR(est.gst)}`} muted />}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Main component                                                   */
/* ---------------------------------------------------------------- */
export default function CabinCalculator() {
  const [config, setConfig] = useState<CabinConfig>(() => buildDefaultConfig());
  const [step, setStep] = useState(0);
  const [restored, setRestored] = useState(false);
  const [showMobileBreakdown, setShowMobileBreakdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lead, setLead] = useState({ name: "", company: "", phone: "", email: "", city: "", state: "", notes: "" });
  // Mobile sticky bar is portaled to <body> (so ancestor containment / content-visibility
  // can't scope its position:fixed to the section) and only shown while the calculator is
  // actually on screen.
  const [barInView, setBarInView] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const notesId = useId();

  const est = useMemo(() => computeEstimate(config), [config]);
  const product = useMemo(() => PRODUCTS.find((p) => p.id === config.productId), [config.productId]);

  // Only render the body portal after mount (document is guaranteed available; the
  // island is ssr:false so there is no hydration pass, but this keeps it defensive).
  useEffect(() => { setPortalReady(true); }, []);

  // Track whether the calculator is in the viewport so the mobile total bar shows
  // only while the user is customizing — not pinned across the whole page.
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setBarInView(entries.some((e) => e.isIntersecting)),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Restore a previously saved configuration (Save & Continue Later).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<CabinConfig>;
        // Legacy id: the storage product was renamed storage-cabin → storage-container.
        // Map it before the validity check so old saved configs still restore.
        if (saved.productId === "storage-cabin") saved.productId = "storage-container";
        if (saved?.productId && PRODUCTS.some((p) => p.id === saved.productId)) {
          const base = buildDefaultConfig(saved.productId);
          const merged = { ...base, ...saved };
          // Re-derive product-gated openings so a config saved by an OLDER build (e.g. a
          // toilet with windows, or a pre-container storage cabin) can't leak windows into
          // the toilet/container flow. Also keep the window count in sync with placements.
          if (!Array.isArray(merged.windowPositions)) merged.windowPositions = base.windowPositions;
          if (isToiletCabin(saved.productId) || isStorageProduct(saved.productId)) {
            merged.windowPositions = base.windowPositions;
          }
          merged.windowQty = merged.windowPositions.length;
          if (!Array.isArray(merged.doorPlacements)) merged.doorPlacements = base.doorPlacements;
          merged.doorQty = merged.doorPlacements.length;
          // New fields — default them for configs saved by an older build.
          if (!merged.roofId) merged.roofId = base.roofId;
          if (!merged.furnitureRoom || typeof merged.furnitureRoom !== "object") merged.furnitureRoom = {};
          // Plug points are now a MULTI-select array of walls. Migrate/repair: keep only valid
          // ids; an older saved config (string plugPointPosition, or nothing) falls back to base.
          if (!Array.isArray(merged.plugPointWalls)) merged.plugPointWalls = base.plugPointWalls;
          else merged.plugPointWalls = merged.plugPointWalls.filter((id: string) => PLUG_POINT_WALL_IDS.includes(id));
          // Rooms: migrate legacy saved configs (partitioned:boolean + room1Length) →
          // roomCount/roomLengths. Newer saves already carry roomCount/roomLengths.
          const sv = saved as unknown as { partitioned?: boolean; room1Length?: number; roomCount?: number };
          if (sv.roomCount === undefined) {
            const wasPartitioned = !!sv.partitioned || !!merged.addons?.["partition-door"] || !!merged.addons?.partition;
            if (wasPartitioned) {
              const r1 = sv.room1Length || Math.round(merged.length / 2);
              merged.roomCount = 2;
              merged.roomLengths = normalizeRoomLengths(merged.length, 2, [r1]);
              merged.partitionDoor = !!merged.addons?.["partition-door"] || merged.partitionDoor !== false;
            } else {
              merged.roomCount = 1;
              merged.roomLengths = [Math.round(merged.length)];
            }
          }
          merged.roomCount = Math.min(Math.max(Math.round(merged.roomCount) || 1, 1), 8);
          merged.roomLengths = normalizeRoomLengths(merged.length, merged.roomCount, merged.roomLengths);
          // Keep the partition add-on qty (N-1) in sync with the room count.
          delete merged.addons["partition"];
          delete merged.addons["partition-door"];
          if (merged.roomCount > 1) merged.addons[merged.partitionDoor ? "partition-door" : "partition"] = merged.roomCount - 1;
          // Migrate furniture split: legacy stored a single number (Room-1 count) → wrap to a
          // per-room array [count]; the last room derives the remainder.
          for (const k of Object.keys(merged.furnitureRoom)) {
            const v = merged.furnitureRoom[k] as unknown;
            if (typeof v === "number") merged.furnitureRoom[k] = [Math.max(0, Math.round(v) || 0)];
            else if (!Array.isArray(v)) delete merged.furnitureRoom[k];
          }
          // Drop obsolete legacy fields so they can't linger in the persisted config.
          const legacyDel = merged as unknown as { partitioned?: boolean; room1Length?: number };
          delete legacyDel.partitioned;
          delete legacyDel.room1Length;
          setConfig(merged);
          setRestored(true);
        }
      }
    } catch { /* ignore corrupt storage */ }
  }, []);

  // Persist configuration on every change.
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch { /* quota / private mode */ }
  }, [config]);

  const patch = useCallback((p: Partial<CabinConfig>) => setConfig((c) => ({ ...c, ...p })), []);

  const goTo = (n: number) => {
    setStep(Math.min(Math.max(n, 0), STEPS.length - 1));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // When the product changes, reset size to that product's sensible default and
  // re-seed the auto electrical quantities.
  const selectProduct = (productId: string) => {
    const fresh = buildDefaultConfig(productId);
    // Storage containers keep ONLY size / grade / quantity / delivery — every cabin
    // choice is irrelevant, so start from the bare container config rather than carrying
    // the previous product's cabin options over.
    if (isStorageProduct(productId)) {
      setConfig((c) => ({ ...fresh, quantity: c.quantity, transport: c.transport, installation: c.installation, gst: c.gst }));
      setStep((s) => (CONTAINER_STEP_KEYS.includes(STEPS[s].key) ? s : 0));
      return;
    }
    // Windows don't apply to toilet cabins (ventilation instead) and storage cabins
    // start windowless — so for those products take the product-appropriate window /
    // ventilation defaults instead of carrying the previous product's window choice.
    const productDefinesOpenings = isToiletCabin(productId) || isStorageProduct(productId);
    // The "Puf Panel Cabin" product IS a PUF panel build — force its structure (and the
    // resulting "no wall lining" default) rather than carrying the previous product's.
    const toPuf = productId === "puf-panel-cabin";
    // Toilet cabins default to a washable ACP wall + ceiling lining — apply that fresh
    // default rather than carrying the previous product's interior.
    const toToilet = isToiletCabin(productId);
    setConfig((c) => ({
      ...fresh,
      // keep the user's structure / interior / add-on / quantity choices if they had any
      // (size resets to the new product's default, but unit count is orthogonal to product)
      quantity: c.quantity,
      // GI (galvanised) is recommended for wet toilet cabins (rustproof), so a switch
      // TO a toilet cabin adopts its GI default rather than carrying the old structure.
      structureId: toPuf || toToilet ? fresh.structureId : c.structureId,
      wallId: toPuf || toToilet ? fresh.wallId : c.wallId,
      ceilingId: toToilet ? fresh.ceilingId : c.ceilingId, flooringId: c.flooringId,
      doorTypeId: c.doorTypeId, doorQty: fresh.doorQty, doorPlacements: fresh.doorPlacements,
      windowTypeId: productDefinesOpenings ? fresh.windowTypeId : c.windowTypeId,
      windowQty: productDefinesOpenings ? fresh.windowQty : c.windowQty,
      windowPositions: productDefinesOpenings ? fresh.windowPositions : c.windowPositions,
      ventilation: fresh.ventilation,
      // Reset rooms on product switch (fresh provides roomCount:1 + roomLengths); strip any
      // carried-over partition add-on and per-room furniture so the layout stays consistent.
      addons: (() => { const a = { ...c.addons }; delete a.partition; delete a["partition-door"]; return a; })(),
      furnitureRoom: {},
      transport: c.transport, installation: c.installation, gst: c.gst,
    }));
  };

  // Structure selection — switching to/from PUF panel adjusts the interior: a PUF panel IS
  // the finished wall, so it defaults to "no wall lining" and drops the separate insulation
  // (the panel is inherently insulated). Leaving PUF restores the standard wall finish so
  // the estimate always has a valid lining for MS / GI / container cabins.
  const selectStructure = (structureId: string) =>
    setConfig((c) => {
      const puf = isPufPanel(structureId);
      return {
        ...c,
        structureId,
        wallId: puf
          ? WALL_NONE.id
          : c.wallId === WALL_NONE.id
            ? WALL_MATERIALS.find((m) => m.standard)?.id ?? WALL_MATERIALS[0].id
            : c.wallId,
        insulationId: puf ? "none" : c.insulationId,
      };
    });

  const toggleElectrical = (id: string) => {
    const item = ELECTRICAL_ITEMS.find((e) => e.id === id)!;
    setConfig((c) => {
      const next = { ...c.electrical };
      if (next[id]) delete next[id];
      else next[id] = item.defaultQty(c.length * c.width);
      return { ...c, electrical: next };
    });
  };
  const setElectricalQty = (id: string, qty: number) =>
    setConfig((c) => ({ ...c, electrical: { ...c.electrical, [id]: Math.max(1, qty) } }));

  const toggleAddon = (id: string) =>
    setConfig((c) => {
      const next = { ...c.addons };
      if (next[id]) delete next[id];
      else next[id] = 1;
      // Auto-tick "By Work Table" for plug points when the FIRST work table is added, and
      // un-tick it when the LAST one is removed. Explicit wall choices are always preserved.
      const hadTable = TABLE_ADDON_IDS.some((t) => c.addons[t]);
      const hasTable = TABLE_ADDON_IDS.some((t) => next[t]);
      let plugPointWalls = c.plugPointWalls;
      if (!hadTable && hasTable && !plugPointWalls.includes("table")) plugPointWalls = [...plugPointWalls, "table"];
      else if (hadTable && !hasTable && plugPointWalls.includes("table")) plugPointWalls = plugPointWalls.filter((w) => w !== "table");
      return { ...c, addons: next, plugPointWalls };
    });
  const setAddonQty = (id: string, qty: number) =>
    setConfig((c) => ({ ...c, addons: { ...c.addons, [id]: Math.max(1, qty) } }));
  // Plug-point placement is a multi-select of walls (+ "By Work Table") — toggle one on/off.
  const togglePlugWall = (id: string) =>
    setConfig((c) => ({
      ...c,
      plugPointWalls: c.plugPointWalls.includes(id)
        ? c.plugPointWalls.filter((w) => w !== id)
        : [...c.plugPointWalls, id],
    }));
  // Assign work-furniture units per room (multi-room layouts). Spec-only. Stores per-room
  // counts (rooms 1..N-1); the last room absorbs the remainder. `roomIndex` is 0-based.
  const setFurnitureRoomCount = (id: string, roomIndex: number, count: number) =>
    setConfig((c) => {
      const total = c.addons[id] || 0;
      const cur = furnitureRoomCounts(c, id, total, c.roomCount);
      const next = [...cur];
      next[roomIndex] = Math.max(0, Math.round(count) || 0);
      return { ...c, furnitureRoom: { ...c.furnitureRoom, [id]: next } };
    });

  const toggleVentilation = (id: string) =>
    setConfig((c) => {
      const next = { ...c.ventilation };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return { ...c, ventilation: next };
    });
  const setVentilationQty = (id: string, qty: number) =>
    setConfig((c) => ({ ...c, ventilation: { ...c.ventilation, [id]: Math.max(1, qty) } }));

  // Window placement — each toggled position is one window there; count mirrors the set.
  const toggleWindowPosition = (id: string) =>
    setConfig((c) => {
      const has = c.windowPositions.includes(id);
      const windowPositions = has ? c.windowPositions.filter((p) => p !== id) : [...c.windowPositions, id];
      return { ...c, windowPositions, windowQty: windowPositions.length };
    });

  // Window quantity — the customer can set a number directly and we auto-assign placements:
  // raising the count fills the next free positions (in the on-screen order), lowering it
  // drops the most-recently-added ones. Quantity is capped at the number of positions
  // available (one window per position). Toggling a position updates the count too — so the
  // stepper and the placement chips always stay in sync.
  const setWindowCount = (n: number) =>
    setConfig((c) => {
      const max = WINDOW_POSITIONS.length;
      const target = Math.min(Math.max(Math.round(n) || 0, 0), max);
      const kept = c.windowPositions.filter((id) => WINDOW_POSITIONS.some((p) => p.id === id));
      let windowPositions = [...kept];
      if (target > windowPositions.length) {
        for (const p of WINDOW_POSITIONS) {
          if (windowPositions.length >= target) break;
          if (!windowPositions.includes(p.id)) windowPositions.push(p.id);
        }
      } else if (target < windowPositions.length) {
        windowPositions = windowPositions.slice(0, target);
      }
      return { ...c, windowPositions, windowQty: windowPositions.length };
    });

  // Rooms / partitions — an N-room layout auto-applies the Partition add-on with qty = N-1,
  // so its cost flows through the existing add-on pricing (no separate cost logic).
  const applyRooms = (c: CabinConfig, roomCount: number, roomLengths: number[], partitionDoor: boolean): CabinConfig => {
    const n = Math.min(Math.max(Math.round(roomCount) || 1, 1), 8);
    const lengths = normalizeRoomLengths(c.length, n, roomLengths);
    const addons = { ...c.addons };
    delete addons["partition"];
    delete addons["partition-door"];
    if (n > 1) addons[partitionDoor ? "partition-door" : "partition"] = n - 1;
    return { ...c, roomCount: n, roomLengths: lengths, partitionDoor, addons };
  };
  const setRoomCount = (n: number) => setConfig((c) => applyRooms(c, n, c.roomLengths, c.partitionDoor));
  const setPartitionDoor = (door: boolean) => setConfig((c) => applyRooms(c, c.roomCount, c.roomLengths, door));
  const distributeEqually = () =>
    setConfig((c) => applyRooms(c, c.roomCount, Array.from({ length: c.roomCount }, () => c.length / c.roomCount), c.partitionDoor));
  // Set the length of editable room index i (0-based; only rooms 0..N-2 are user-editable —
  // the last room is the derived remainder).
  const setRoomLength = (i: number, n: number) =>
    setConfig((c) => {
      const next = [...c.roomLengths];
      next[i] = Math.max(1, Math.round(n) || 1);
      return { ...c, roomLengths: normalizeRoomLengths(c.length, c.roomCount, next) };
    });
  // A cabin-length change must re-normalise the room split to the new total length.
  const setLength = (n: number) =>
    setConfig((c) => ({ ...c, length: n, roomLengths: normalizeRoomLengths(n, c.roomCount, c.roomLengths) }));

  // Doors — each door has a side + offset (ft). Count mirrors the placement list.
  const setDoorCount = (n: number) =>
    setConfig((c) => {
      const target = Math.min(Math.max(Math.round(n), 0), 6);
      const dp = c.doorPlacements.slice(0, target);
      while (dp.length < target) dp.push({ side: "bottom", offset: Math.round((c.length || 10) * 0.3) });
      return { ...c, doorPlacements: dp, doorQty: dp.length };
    });
  const setDoorSide = (i: number, side: string) =>
    setConfig((c) => ({ ...c, doorPlacements: c.doorPlacements.map((d, idx) => (idx === i ? { ...d, side } : d)) }));
  const setDoorOffset = (i: number, offset: number) =>
    setConfig((c) => ({ ...c, doorPlacements: c.doorPlacements.map((d, idx) => (idx === i ? { ...d, offset: Math.max(0, Math.round(offset) || 0) } : d)) }));

  const startOver = () => {
    setConfig(buildDefaultConfig());
    setStep(0);
    setRestored(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  /* ---- Share / export ---- */
  const shareWhatsApp = () => {
    const layoutSpec = summariseLayout(config);
    const text = `Hi, I configured a cabin on your website and would like a quotation.\n\n${summariseConfig(config, est)}${layoutSpec ? `\n\nLayout arrangement: ${layoutSpec}` : ""}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  const downloadPDF = async () => {
    try {
      const [{ default: jsPDF }, autoTableMod, { addLegalFooter }] = await Promise.all([
        import("jspdf"), import("jspdf-autotable"), import("@/lib/pdfFooter"),
      ]);
      const autoTable = autoTableMod.default;
      type CellHookData = Parameters<NonNullable<Parameters<typeof autoTable>[1]["didParseCell"]>>[0];
      const doc = new jsPDF({ unit: "mm", format: "a4" }) as InstanceType<typeof jsPDF> & { lastAutoTable: { finalY: number } };
      const product = PRODUCTS.find((p) => p.id === config.productId)!;
      // jsPDF's built-in fonts are Latin-1 only — the ₹ (U+20B9) glyph corrupts the
      // whole cell. Use "Rs." for every amount printed into the PDF (screen keeps ₹).
      const rsPdf = (n: number) => "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));
      // Load the company logo → PNG (via canvas) so jsPDF can embed it regardless of the
      // webp source. Returns null if it can't load/decode → header falls back to text-only.
      const loadImageData = (src: string) =>
        new Promise<{ data: string; w: number; h: number } | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext("2d");
              if (!ctx) return resolve(null);
              ctx.drawImage(img, 0, 0);
              resolve({ data: canvas.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight });
            } catch { resolve(null); }
          };
          img.onerror = () => resolve(null);
          img.src = src;
        });

      // ── Header band with the company logo ──────────────────────────────────
      doc.setFillColor(15, 27, 45);
      doc.rect(0, 0, 210, 26, "F");
      const logoImg = await loadImageData(resolveImageUrl(logo));
      let headerTextX = 14;
      if (logoImg) {
        const logoH = 16, logoW = Math.min(34, logoH * (logoImg.w / logoImg.h));
        // white rounded chip behind the logo for contrast on the navy band
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(12, 5, logoW + 3, logoH + 3, 1.5, 1.5, "F");
        doc.addImage(logoImg.data, "PNG", 13.5, 6.5, logoW, logoH);
        headerTextX = 12 + logoW + 3 + 4;
      }
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold"); doc.setFontSize(15);
      doc.text("Portable Office Cabin", headerTextX, 12);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.setTextColor(245, 158, 11);
      doc.text("Estimated Cabin Quotation", headerTextX, 18);
      doc.setTextColor(255, 255, 255); doc.setFontSize(8);
      doc.text(new Date().toLocaleDateString("en-IN"), 196, 12, { align: "right" });

      doc.setTextColor(20, 20, 20); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text(`${product.label} — ${est.dimLength} × ${est.dimWidth} ft (${est.area} sq.ft) × ${est.quantity}`, 14, 36);

      const isToilet = isToiletCabin(config.productId);
      const isStorage = isStorageProduct(config.productId);
      let configRows: [string, string][];
      if (isStorage) {
        const grade = CONTAINER_GRADES.find((g) => g.id === config.containerGradeId);
        const size = STORAGE_SIZES.find((s) => s.length === est.dimLength && s.width === est.dimWidth);
        const rate = containerRate(est.dimLength, est.dimWidth, config.containerGradeId);
        configRows = [
          ["Container Size", size?.label ?? `${est.dimLength} × ${est.dimWidth} ft`],
          ["Container Grade", grade?.label ?? "—"],
          ["Base Container Rate", rate > 0 ? rsPdf(rate) : "Contact for Rate"],
        ];
        if (grade?.note) configRows.push(["Note", grade.note]);
      } else {
        configRows = [
          ["Structure", STRUCTURES.find((s) => s.id === config.structureId)?.label ?? ""],
          ["Roof", `${findRoof(config.roofId).label}${config.roofId === "flat" ? ` (+${ROOF_FLAT_PCT})` : ""}`],
          ["Internal Wall", materialLabel(findWallMaterial(config.wallId))],
          ["Ceiling", materialLabel(CEILING_MATERIALS.find((m) => m.id === config.ceilingId))],
          ["Flooring", materialLabel(FLOORING_MATERIALS.find((m) => m.id === config.flooringId))],
          ["Insulation", isPufPanel(config.structureId) ? "Included (PUF panel — inherently insulated)" : (() => { const i = INSULATION_OPTIONS.find((o) => o.id === config.insulationId); return i && i.id !== "none" ? `${i.label} (${i.thickness})` : "None"; })()],
          ["Doors", `${config.doorQty} × ${DOOR_TYPES.find((d) => d.id === config.doorTypeId)?.label ?? ""}`],
        ];
        if (config.roomCount > 1) {
          configRows.push([
            "Rooms",
            `${config.roomCount} (${config.roomLengths.map((l, i) => `R${i + 1} ${Math.round(l)}ft`).join(" · ")}) — ${config.roomCount - 1} × ${config.partitionDoor ? "Partition w/ Door" : "Fixed Partition"}`,
          ]);
        }
        if (isToilet) {
          configRows.push(["Ventilation", est.ventilationLines.map((l) => `${l.label} (${l.detail.split(" ")[0]} no.)`).join(", ") || "Exhaust Fan (1 no.)"]);
          configRows.push(["Window", "Not Applicable"]);
        } else {
          const winPlace = config.windowPositions?.length ? ` (${config.windowPositions.map(windowPositionLabel).join(", ")})` : "";
          configRows.push(["Windows", `${config.windowQty} × ${WINDOW_TYPES.find((d) => d.id === config.windowTypeId)?.label ?? ""}${winPlace}`]);
        }
        configRows.push(["Electrical", est.electricalLines.map((l) => l.label).join(", ") || "—"]);
        configRows.push(["Add-ons", est.furnitureLines.map((l) => l.label).join(", ") || "—"]);
        if (!isToilet) configRows.push(["Furniture Position", furniturePositionLabel(config.furniturePosition)]);
        configRows.push(["Plug Point Placement", plugPointWallsLabel(config.plugPointWalls)]);
        configRows.push(["Shifting / Mobility", mobilityTypeLabel(config.mobilityType)]);
        const layoutSpec = summariseLayout(config);
        if (layoutSpec) configRows.push(["Layout Arrangement", layoutSpec]);
      }

      autoTable(doc, {
        startY: 41,
        head: [["Configuration", "Selection"]],
        body: configRows,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 9 },
      });

      const contactTxt = isStorage ? "Contact for Rate" : "Contact us Directly";
      const rows: [string, string][] = [[isStorage ? "Base Container Rate" : "Base Cabin", est.contactRequired ? contactTxt : rsPdf(est.base)]];
      if (est.heightSurcharge) rows.push([`Extra Height (${est.dimHeight} ft > 8'6")`, rsPdf(est.heightSurcharge)]);
      if (est.roofSurcharge) rows.push([`Flat Roof (+${ROOF_FLAT_PCT})`, rsPdf(est.roofSurcharge)]);
      if (est.interior) rows.push(["Interior Upgrade", rsPdf(est.interior)]);
      if (est.insulation) rows.push(["Insulation", rsPdf(est.insulation)]);
      if (est.openings) rows.push(["Doors & Windows", rsPdf(est.openings)]);
      if (est.ventilation) rows.push(["Ventilation", rsPdf(est.ventilation)]);
      if (est.electrical) rows.push(["Electrical", rsPdf(est.electrical)]);
      if (est.furniture) rows.push(["Furniture / Add-ons", rsPdf(est.furniture)]);
      if (config.quantity > 1) rows.push([`Per-cabin subtotal × ${est.quantity}`, rsPdf(est.cabinsSubtotal)]);
      if (est.transport) rows.push(["Transport", rsPdf(est.transport)]);
      if (est.installation) rows.push(["Installation", rsPdf(est.installation)]);
      rows.push(["Subtotal", est.contactRequired ? contactTxt : rsPdf(est.subtotal)]);
      if (config.gst) rows.push(["GST (18%)", est.contactRequired ? "As applicable" : rsPdf(est.gst)]);
      rows.push(["Estimated Total", est.contactRequired ? contactTxt : rsPdf(est.total)]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 6,
        head: [["Price Breakdown", "Amount"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
        styles: { fontSize: 9 },
        columnStyles: { 1: { halign: "right" } },
        didParseCell: (d: CellHookData) => {
          if (d.section === "body" && d.row.index === rows.length - 1) {
            d.cell.styles.fontStyle = "bold";
            d.cell.styles.fillColor = [248, 233, 209];
          }
        },
      });

      doc.setFontSize(8); doc.setTextColor(110, 110, 110); doc.setFont("helvetica", "italic");
      const disc = doc.splitTextToSize(
        "Disclaimer: This is an indicative estimate generated from the online configurator. The final quotation is verified and approved by our sales team based on exact specifications, delivery location and current material rates.",
        182,
      );
      doc.text(disc, 14, doc.lastAutoTable.finalY + 8);
      addLegalFooter(doc);
      doc.save(`Cabin-Estimate-${product.label.replace(/\s+/g, "-")}.pdf`);
    } catch (e) {
      toast({ title: "Could not generate PDF", description: "Please try again.", variant: "destructive" });
    }
  };

  /* ---- Lead submission ---- */
  const submitQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.name.trim() || !lead.phone.trim() || !lead.email.trim()) {
      toast({ title: "Missing details", description: "Name, mobile and email are required.", variant: "destructive" });
      return;
    }
    // Basic mobile sanity check so the CRM doesn't receive junk like "call me".
    const digits = lead.phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      toast({ title: "Invalid mobile number", description: "Please enter a valid mobile number (7–15 digits).", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const product = PRODUCTS.find((p) => p.id === config.productId)!;
    const message =
      `${summariseConfig(config, est)}\n\n— Contact —\nCity: ${lead.city || "—"}\nState: ${lead.state || "—"}` +
      (lead.notes.trim() ? `\nNotes: ${lead.notes.trim()}` : "");
    const enquiry: TablesInsert<"enquiries"> = {
      name: lead.name.trim(),
      email: lead.email.trim(),
      phone: lead.phone.trim(),
      company: lead.company.trim() || null,
      message,
      enquiry_type: "quote",
      subject: `Cabin Calculator Estimate — ${product.label} (${formatINR(est.total)})`,
      product_name: product.label,
      expected_value: Math.round(est.total),
      lead_source: "Homepage Cabin Calculator",
    };
    try {
      const { error } = await supabase.from("enquiries").insert(enquiry);
      if (error) throw error;
      supabase.functions.invoke("send-enquiry-notification", { body: enquiry }).catch(() => {});
      setSubmitted(true);
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      toast({ title: "Quotation request sent!", description: "Our team will send a verified quotation within 24 hours." });
    } catch (err) {
      toast({ title: "Something went wrong", description: "Please try again or call us directly.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const StepIcon = STEPS[step].icon;
  // Storage containers show a reduced wizard (Product → Size → Delivery → Quote); other
  // products show all steps. Navigation, chips and progress all run over the visible set.
  const isContainer = isStorageProduct(config.productId);
  const visibleStepIdxs = STEPS.map((_, i) => i).filter((i) => !isContainer || CONTAINER_STEP_KEYS.includes(STEPS[i].key));
  const curPos = Math.max(0, visibleStepIdxs.indexOf(step));
  const gotoNext = () => goTo(visibleStepIdxs[Math.min(curPos + 1, visibleStepIdxs.length - 1)]);
  const gotoPrev = () => goTo(visibleStepIdxs[Math.max(curPos - 1, 0)]);
  const isFirstVisible = curPos === 0;
  const isLastVisible = curPos === visibleStepIdxs.length - 1;
  const progress = (curPos / Math.max(1, visibleStepIdxs.length - 1)) * 100;
  // No auto-quotable price: container on a no-rate grade, OR a built cabin larger
  // than 40×10 ft (400 sq.ft). Show a "contact us" message instead of a number.
  const needsContact = est.contactRequired;
  const totalText = needsContact ? (isContainer ? "Contact for Rate" : "Contact us Directly") : formatINR(est.total);

  return (
    <div ref={topRef} className="scroll-mt-24">
      {/* Company logo + wordmark — brands the calculator (same treatment as the site header). */}
      <div className="mb-5 flex items-center justify-center gap-3 lg:justify-start">
        <img
          src={resolveImageUrl(logo)}
          alt="Portable Office Cabin"
          loading="lazy"
          decoding="async"
          className="h-11 w-auto rounded-lg border border-accent/20 bg-card p-1 object-contain shadow-md lg:h-12"
        />
        <div className="leading-tight">
          <p className="font-display text-base font-extrabold tracking-tight text-white sm:text-lg">
            Portable Office <span className="text-accent">Cabin</span>
          </p>
          <p className="text-[11px] text-white/70">Cabin Cost Calculator</p>
        </div>
      </div>

      {/* Highlighted "Customized" banner — surfaces the live estimated price at the
          very top of the calculator so it is the first thing every visitor sees,
          on mobile and desktop. Updates in real time as the configuration changes. */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-r from-navy-medium to-navy-deep shadow-lg ring-1 ring-accent/20">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/20 ring-1 ring-accent/40">
              <Sparkles className="h-5 w-5 text-accent" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Customized Cabin</p>
              <p className="truncate font-display text-base font-bold leading-tight text-white sm:text-lg">
                {product?.label ?? "Your Cabin"}
              </p>
              <p className="text-[11px] text-white/60">
                {est.dimLength} × {est.dimWidth} ft · {est.area} sq.ft{est.quantity > 1 ? ` × ${est.quantity}` : ""}
              </p>
            </div>
          </div>
          <div className="shrink-0 border-t border-white/10 pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:text-right">
            <p className="text-[11px] uppercase tracking-wide text-white/70">Estimated Price</p>
            <p className="font-display text-3xl font-extrabold leading-none text-white sm:text-4xl">
              {totalText}
            </p>
            <p className="mt-1 text-[11px] text-white/60">{config.gst ? "incl. 18% GST" : "+ GST"} · sales-team verified</p>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ---------------- Left: wizard ---------------- */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-lg">
          {/* Progress header */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <StepIcon className="h-4 w-4 text-accent" />
                <span>Step {curPos + 1} of {visibleStepIdxs.length}</span>
                <span className="text-muted-foreground">— {STEPS[step].title}</span>
              </div>
              {restored && step === 0 && (
                <span className="hidden sm:inline text-[11px] text-emerald-500 font-medium">Restored your saved design</span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-amber-light transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            {/* Clickable step chips (desktop) */}
            <div className="mt-3 hidden flex-wrap gap-1.5 lg:flex">
              {visibleStepIdxs.map((i) => {
                const s = STEPS[i];
                return (
                <button key={s.key} type="button" onClick={() => goTo(i)}
                  className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                    i === step ? "bg-accent text-white" : i < step ? "bg-accent/15 text-accent hover:bg-accent/25" : "bg-muted text-muted-foreground hover:text-foreground")}>
                  {s.title}
                </button>
                );
              })}
            </div>
          </div>

          {/* Step body */}
          <div className="min-h-[280px]">
            {step === 0 && (
              <StepShell title="Select your product" subtitle="Pick the cabin type closest to what you need.">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {PRODUCTS.map((p) => {
                    const Icon = ICONS[p.icon] ?? Building;
                    const active = config.productId === p.id;
                    return (
                      <button key={p.id} type="button" onClick={() => selectProduct(p.id)} aria-pressed={active}
                        className={cn("relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                          active ? "border-accent bg-accent/10 ring-1 ring-accent shadow-sm" : "border-border bg-background hover:border-accent/50")}>
                        {p.badge && <span className={cn("absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold", badgeStyles[p.badge])}>{p.badge}</span>}
                        <Icon className={cn("h-6 w-6", active ? "text-accent" : "text-muted-foreground")} />
                        <span className="mt-1 text-sm font-semibold leading-tight text-foreground">{p.label}</span>
                        <span className="text-[11px] leading-tight text-muted-foreground">{p.blurb}</span>
                      </button>
                    );
                  })}
                </div>
              </StepShell>
            )}

            {step === 1 && (
              <StepShell
                title={isStorageProduct(config.productId) ? "Choose the container size" : "Enter the size"}
                subtitle={isStorageProduct(config.productId) ? "Standard storage sizes — pick the one that fits your material." : "Area and base price update live as you type."}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {isStorageProduct(config.productId) ? (
                    <div className="space-y-3">
                      {STORAGE_SIZES.map((s) => {
                        const active = config.length === s.length && config.width === s.width;
                        return (
                          <button key={s.id} type="button" aria-pressed={active}
                            onClick={() => patch({ length: s.length, width: s.width })}
                            className={cn("flex w-full flex-col items-start gap-0.5 rounded-xl border p-4 text-left transition-all",
                              active ? "border-accent bg-accent/10 ring-1 ring-accent shadow-sm" : "border-border bg-background hover:border-accent/50")}>
                            <span className="text-sm font-bold text-foreground">{s.label}</span>
                            <span className="text-[11px] leading-snug text-muted-foreground">{s.usage}</span>
                          </button>
                        );
                      })}
                      {/* Container grade — grade-wise price for the chosen size */}
                      <div className="pt-1">
                        <Label className="mb-1.5 block text-sm font-semibold">Container Grade</Label>
                        <div className="space-y-2">
                          {CONTAINER_GRADES.map((g) => {
                            const rate = containerRate(config.length, config.width, g.id);
                            const active = config.containerGradeId === g.id;
                            return (
                              <button key={g.id} type="button" aria-pressed={active}
                                onClick={() => patch({ containerGradeId: g.id })}
                                className={cn("flex w-full flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                                  active ? "border-accent bg-accent/10 ring-1 ring-accent shadow-sm" : "border-border bg-background hover:border-accent/50")}>
                                <div className="flex w-full items-center justify-between gap-2">
                                  <span className="text-sm font-bold text-foreground">{g.label}</span>
                                  <span className="shrink-0 text-sm font-semibold text-accent">{rate > 0 ? formatINR(rate) : "Contact for Rate"}</span>
                                </div>
                                <span className="text-[11px] leading-snug text-muted-foreground">{g.description}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <Stepper value={config.quantity} min={1} max={500} label="Cabin quantity" onChange={(n) => patch({ quantity: n })} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <DimField label="Length" value={config.length} onChange={setLength} />
                      <DimField label="Width" value={config.width} onChange={(n) => patch({ width: n })} />
                      <DimField label="Height" value={config.height} onChange={(n) => patch({ height: n })} optional />
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <Stepper value={config.quantity} min={1} max={500} label="Cabin quantity" onChange={(n) => patch({ quantity: n })} />
                      </div>
                      <p className="col-span-2 text-[11px] text-muted-foreground">
                        Standard height is <span className="font-semibold text-foreground">8′6″</span> — taller cabins add <span className="font-semibold text-foreground">8% per extra foot</span> on the base price.
                      </p>
                    </div>
                  )}
                  <div className="rounded-xl border border-border bg-background p-4">
                    <CabinPreview length={config.length} width={config.width} height={config.height} doorPlacements={config.doorPlacements} windowPositions={config.windowPositions} windowWidthFt={config.windowWidthFt ?? 3} windowHeightFt={config.windowHeightFt ?? 3} containerDoor={isStorageProduct(config.productId)} roomLengths={config.roomLengths} partitionDoor={config.partitionDoor} puf={isPufPanel(config.structureId)} roof={config.roofId} config={config} />
                    <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-lg bg-muted p-2">
                        <p className="text-[11px] text-muted-foreground">{isStorageProduct(config.productId) ? "Area" : "Carpet Area"}</p>
                        <p className="font-bold text-foreground">{est.dimLength} × {est.dimWidth} = {est.area} sq.ft</p>
                      </div>
                      <div className="rounded-lg bg-accent/10 p-2">
                        <p className="text-[11px] text-muted-foreground">{isStorageProduct(config.productId) ? "Container Rate" : "Base Price"}</p>
                        <p className="font-bold text-accent">{est.contactRequired ? (isStorageProduct(config.productId) ? "Contact for Rate" : "Contact us") : formatINR(est.base)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Rooms / Partitions — split the cabin into multiple rooms (built cabins only).
                    N rooms = N-1 partitions; each partition is priced via the Partition add-on. */}
                {!isStorageProduct(config.productId) && !isToiletCabin(config.productId) && (
                  <div className="mt-4 rounded-xl border border-border p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <Label className="text-sm font-semibold">Rooms / Partitions</Label>
                        <p className="text-[11px] text-muted-foreground">
                          {config.roomCount > 1
                            ? `${config.roomCount} rooms · ${config.roomCount - 1} × ${config.partitionDoor ? "partition with door" : "fixed partition"}`
                            : "Single open room — add partitions to split it"}
                        </p>
                      </div>
                      <Stepper value={config.roomCount} min={1} max={Math.min(8, Math.max(1, Math.round(config.length)))} label="Number of rooms" onChange={setRoomCount} />
                    </div>
                    {/* Quick presets */}
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4].filter((n) => n <= Math.min(8, Math.max(1, Math.round(config.length)))).map((n) => (
                        <button key={n} type="button" onClick={() => setRoomCount(n)}
                          className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium transition-all", config.roomCount === n ? "border-accent bg-accent/10 text-accent ring-1 ring-accent" : "border-border text-foreground hover:border-accent/50")}>
                          {n === 1 ? "Single" : `${n} Rooms`}
                        </button>
                      ))}
                    </div>
                    {config.roomCount > 1 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Room lengths (total {Math.round(config.length)} ft)</Label>
                          <button type="button" onClick={distributeEqually}
                            className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-accent/50">
                            Distribute equally
                          </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {config.roomLengths.map((len, i) =>
                            i < config.roomCount - 1 ? (
                              <DimField key={i} label={`Room ${i + 1} length`} value={Math.round(len)} onChange={(n) => setRoomLength(i, n)} />
                            ) : (
                              <div key={i} className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Room {i + 1} length</Label>
                                <div className="flex h-10 items-center rounded-md border border-border bg-muted/40 px-3 text-sm font-semibold">
                                  {Math.round(len)} ft <span className="ml-1 text-[10px] font-normal text-muted-foreground">(remainder)</span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Partition Doors</p>
                            <p className="text-[11px] text-muted-foreground">
                              {config.partitionDoor
                                ? `With door — ₹22,000 each × ${config.roomCount - 1}`
                                : `Fixed partition — ₹17,500 each × ${config.roomCount - 1}`}
                            </p>
                          </div>
                          <button type="button" role="switch" aria-checked={config.partitionDoor} aria-label="Partition door" onClick={() => setPartitionDoor(!config.partitionDoor)}
                            className={cn("inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent p-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2", config.partitionDoor ? "bg-accent" : "bg-muted-foreground/30")}>
                            <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-white shadow transition-transform", config.partitionDoor ? "translate-x-5" : "translate-x-0")} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Roof type — sloped 2-side (default) vs flat (+8%). Applies to all built
                    cabins; the shape is reflected live in the "4 Elevations" view above. */}
                {!isStorageProduct(config.productId) && (
                  <div className="mt-4 rounded-xl border border-border p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Label className="text-sm font-semibold">Roof Type</Label>
                      <span className="text-[11px] text-muted-foreground">See the “4 Elevations” view</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {ROOFS.map((r) => {
                        const active = config.roofId === r.id;
                        return (
                          <button key={r.id} type="button" aria-pressed={active} onClick={() => patch({ roofId: r.id })}
                            className={cn("flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-all",
                              active ? "border-accent bg-accent/10 ring-1 ring-accent shadow-sm" : "border-border bg-background hover:border-accent/50")}>
                            <span className="flex w-full items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-foreground">{r.label}</span>
                              <span className={cn("shrink-0 text-[11px] font-semibold", r.surchargePct > 0 ? "text-accent" : "text-muted-foreground")}>
                                {r.surchargePct > 0 ? `+${Math.round(r.surchargePct * 100)}%` : "Standard"}
                              </span>
                            </span>
                            <span className="text-[11px] leading-snug text-muted-foreground">{r.note}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </StepShell>
            )}

            {step === 2 && (
              <StepShell title="Select structure" subtitle="The frame material affects durability and price.">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {STRUCTURES.map((s) => {
                    const active = config.structureId === s.id;
                    const rate = est.area * cabinRatePerSqft(est.area) * s.multiplier;
                    return (
                      <button key={s.id} type="button" onClick={() => selectStructure(s.id)} aria-pressed={active}
                        className={cn("flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all",
                          active ? "border-accent bg-accent/10 ring-1 ring-accent shadow-sm" : "border-border bg-background hover:border-accent/50")}>
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-foreground">{s.label}</span>
                          {s.id === "gi" && isToiletCabin(config.productId) && (
                            <span className="rounded-full bg-emerald-500/15 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Recommended</span>
                          )}
                        </span>
                        <span className="text-[11px] leading-snug text-muted-foreground">{s.note}</span>
                        <span className="mt-1 text-xs font-semibold text-accent">{rate > 0 ? formatINR(rate) : "Contact us"}</span>
                      </button>
                    );
                  })}
                </div>
                {isToiletCabin(config.productId) && (
                  <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-[11px] leading-snug text-muted-foreground">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Recommended: GI (Galvanised) Cabin.</span> Toilet cabins are wet, humid spaces — galvanised steel resists rust and lasts far longer here than plain MS.
                  </p>
                )}
              </StepShell>
            )}

            {step === 3 && (
              <StepShell title="Interior finish" subtitle="Standard finishes are included — upgrades and savings shown per material.">
                {isStorageProduct(config.productId) ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    Storage cabins ship with a standard hard-wearing interior — no finish upgrades are needed. Tell our team if you need a custom lining and we&rsquo;ll quote it separately.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {isPufPanel(config.structureId) ? (
                      <PufWallGroup value={config.wallId} onSelect={(id) => patch({ wallId: id })} />
                    ) : (
                      <MaterialGroup label="Internal Wall" items={WALL_MATERIALS} value={config.wallId} onSelect={(id) => patch({ wallId: id })} />
                    )}
                    <MaterialGroup label="Ceiling" items={CEILING_MATERIALS} value={config.ceilingId} onSelect={(id) => patch({ ceilingId: id })} />
                    <MaterialGroup label="Flooring" items={FLOORING_MATERIALS} value={config.flooringId} onSelect={(id) => patch({ flooringId: id })} />
                    {isPufPanel(config.structureId) ? (
                      <PufPanelBuildup />
                    ) : (
                      <InsulationGroup value={config.insulationId} onSelect={(id) => patch({ insulationId: id })} />
                    )}
                  </div>
                )}
              </StepShell>
            )}

            {step === 4 && (
              <StepShell
                title={isToiletCabin(config.productId) ? "Doors & ventilation" : "Doors & windows"}
                subtitle={isToiletCabin(config.productId) ? "Toilet cabins use ventilation instead of windows." : "Choose type and quantity for each."}
              >
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <Label className="text-sm font-semibold">Door Type</Label>
                      <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Qty</span>
                        <Stepper value={config.doorQty} min={0} max={6} label="Door quantity" onChange={setDoorCount} /></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {DOOR_TYPES.map((d) => (
                        <PricedChip key={d.id} label={d.label} price={d.price}
                          priceLabel={d.includedQty ? `${d.includedQty} included · +${formatINR(d.price)} each extra` : undefined}
                          selected={config.doorTypeId === d.id} onSelect={() => patch({ doorTypeId: d.id })} />
                      ))}
                    </div>
                    {config.doorPlacements.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">Door Placement — side &amp; distance from corner</Label>
                        {config.doorPlacements.map((d, i) => (
                          <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-2">
                            <span className="w-12 text-xs font-semibold text-muted-foreground">Door {i + 1}</span>
                            <div className="flex gap-1">
                              {([["top", "Upper"], ["bottom", "Down"], ["left", "Left"], ["right", "Right"]] as const).map(([id, lbl]) => (
                                <button key={id} type="button" onClick={() => setDoorSide(i, id)} aria-pressed={d.side === id}
                                  className={cn("rounded-md border px-2 py-1 text-[11px] font-medium", d.side === id ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-foreground")}>{lbl}</button>
                              ))}
                            </div>
                            {/* Quick corner / centre presets — set the distance-from-corner along the
                                chosen wall (length for Upper/Down, width for Left/Right). */}
                            <div className="flex gap-1">
                              {([["left", "Left Corner"], ["center", "Center"], ["right", "Right Corner"]] as const).map(([pos, lbl]) => {
                                const span = d.side === "left" || d.side === "right" ? config.width : config.length;
                                const target = pos === "left" ? 1 : pos === "right" ? Math.max(1, Math.round(span - 1)) : Math.max(1, Math.round(span / 2));
                                const active = Math.round(d.offset) === target;
                                return (
                                  <button key={pos} type="button" onClick={() => setDoorOffset(i, target)} aria-pressed={active}
                                    className={cn("rounded-md border px-2 py-1 text-[11px] font-medium", active ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:text-foreground")}>{lbl}</button>
                                );
                              })}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-muted-foreground">at</span>
                              <input type="number" inputMode="numeric" min={0} aria-label={`Door ${i + 1} offset`} value={Number.isFinite(d.offset) ? d.offset : ""}
                                onFocus={selectOnFocus}
                                onChange={(e) => setDoorOffset(i, parseFloat(cleanNumericInput(e.currentTarget)) || 0)}
                                className="h-8 w-14 rounded-md border border-border bg-transparent px-2 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              <span className="text-[11px] text-muted-foreground">ft from {d.side === "left" || d.side === "right" ? "top" : "left"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Standard door size: <span className="font-semibold text-foreground">6 ft × 30″</span> — custom sizes available on request.
                    </p>
                  </div>
                  {isToiletCabin(config.productId) ? (
                    <div>
                      <Label className="mb-2 block text-sm font-semibold">Ventilation / Exhaust</Label>
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {VENTILATION_ITEMS.map((v) => {
                          const selected = !!config.ventilation[v.id];
                          return (
                            <ToggleCard key={v.id} selected={selected} onToggle={() => toggleVentilation(v.id)}
                              label={v.label} sub={`${formatINR(v.price)} each`}>
                              {selected && (
                                <Stepper value={config.ventilation[v.id]} min={1} max={50} label={`${v.label} quantity`} onChange={(n) => setVentilationQty(v.id, n)} />
                              )}
                            </ToggleCard>
                          );
                        })}
                      </div>
                      <p className="mt-3 rounded-lg border border-dashed border-accent/40 bg-accent/5 p-3 text-[11px] leading-snug text-muted-foreground">
                        <span className="font-semibold text-foreground">Toilet Cabin ventilation will be provided with exhaust fan / louver.</span> Window option is not applicable for toilet cabins.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <Label className="text-sm font-semibold">Window Type</Label>
                          <span className="text-[11px] text-muted-foreground">uPVC recommended · price is per window at the size &amp; track below</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {WINDOW_TYPES.map((d) => (
                            <PricedChip key={d.id} label={d.label}
                              price={windowUnitPrice(d.price, config.windowWidthFt ?? 3, config.windowHeightFt ?? 3, config.windowTrackId ?? "2")}
                              selected={config.windowTypeId === d.id} onSelect={() => patch({ windowTypeId: d.id })} />
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr] sm:items-end">
                        <DimField label="Window Width" value={config.windowWidthFt ?? 3} onChange={(n) => patch({ windowWidthFt: n })} max={12} />
                        <DimField label="Window Height" value={config.windowHeightFt ?? 3} onChange={(n) => patch({ windowHeightFt: n })} max={12} />
                        <SpecPills label="Window Track" hint="2.5-track slides smoother — +12% over 2-track (price scales with window size)."
                          options={WINDOW_TRACKS} value={config.windowTrackId ?? "2"} onSelect={(id) => patch({ windowTrackId: id })} />
                      </div>
                      <div>
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <Label className="text-sm font-semibold">Window Placement</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Qty</span>
                            <Stepper value={config.windowPositions.length} min={0} max={WINDOW_POSITIONS.length} label="Window quantity" onChange={setWindowCount} />
                          </div>
                        </div>
                        <p className="mb-2 text-[11px] text-muted-foreground">Set a quantity above (positions fill in automatically) or tap exact positions below — the 2D plan updates live.</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="flex flex-wrap gap-2 self-start">
                            {WINDOW_POSITIONS.map((p) => {
                              const active = config.windowPositions.includes(p.id);
                              return (
                                <button key={p.id} type="button" aria-pressed={active} onClick={() => toggleWindowPosition(p.id)}
                                  className={cn("rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                                    active ? "border-accent bg-accent/10 text-accent ring-1 ring-accent" : "border-border bg-background text-foreground hover:border-accent/50")}>
                                  {p.label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="rounded-xl border border-border bg-background p-3">
                            <CabinPreview length={config.length} width={config.width} height={config.height} doorPlacements={config.doorPlacements} windowPositions={config.windowPositions} windowWidthFt={config.windowWidthFt ?? 3} windowHeightFt={config.windowHeightFt ?? 3} containerDoor={isStorageProduct(config.productId)} roomLengths={config.roomLengths} partitionDoor={config.partitionDoor} puf={isPufPanel(config.structureId)} roof={config.roofId} config={config} caption="Door + windows live" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </StepShell>
            )}

            {step === 5 && (
              <StepShell title="Electrical" subtitle="Tick what you need — quantities are auto-suggested from the area.">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {ELECTRICAL_ITEMS.map((item) => {
                    const selected = !!config.electrical[item.id];
                    return (
                      <ToggleCard key={item.id} selected={selected} onToggle={() => toggleElectrical(item.id)}
                        label={item.label} sub={`${formatINR(item.unitPrice)} each`}>
                        {selected && (
                          <Stepper value={config.electrical[item.id]} min={1} max={200} label={`${item.label} quantity`} onChange={(n) => setElectricalQty(item.id, n)} />
                        )}
                      </ToggleCard>
                    );
                  })}
                </div>
                {/* Plug Point / AC Provision breakdown — each unit's sockets + switches,
                    arrow-labelled so the customer & factory see what's included. */}
                {(config.electrical.plug || config.electrical.ac) ? (
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {config.electrical.plug ? (
                      <SocketSwitchDiagram title="Plug Point" sockets={2} switches={2} units={config.electrical.plug} />
                    ) : null}
                    {config.electrical.ac ? (
                      <SocketSwitchDiagram title="AC Provision" sockets={1} switches={1} units={config.electrical.ac} />
                    ) : null}
                  </div>
                ) : null}
                {/* Light finish — colour + LED panel shape (applies to LED / tube lights) */}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Light Colour</Label>
                    <div className="flex gap-2">
                      {LIGHT_COLORS.map((c) => (
                        <button key={c.id} type="button" aria-pressed={config.lightColor === c.id} onClick={() => patch({ lightColor: c.id })}
                          className={cn("flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all", config.lightColor === c.id ? "border-accent bg-accent/10 text-accent ring-1 ring-accent" : "border-border text-foreground hover:border-accent/50")}>{c.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">LED Panel Shape</Label>
                    <div className="flex gap-2">
                      {LED_SHAPES.map((s) => (
                        <button key={s.id} type="button" aria-pressed={config.ledShape === s.id} onClick={() => patch({ ledShape: s.id })}
                          className={cn("flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all", config.ledShape === s.id ? "border-accent bg-accent/10 text-accent ring-1 ring-accent" : "border-border text-foreground hover:border-accent/50")}>{s.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Plug point placement — MULTI-select of walls + by-table (spec only, no price) */}
                <div className="mt-4">
                  <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <Label className="text-sm font-semibold">Plug Point Placement</Label>
                    <span className="text-[11px] text-muted-foreground">Tick every wall you want sockets on — and/or beside the work tables. The 2D plan updates live.</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PLUG_POINT_WALLS.map((p) => {
                      const active = config.plugPointWalls.includes(p.id);
                      return (
                        <button key={p.id} type="button" aria-pressed={active} onClick={() => togglePlugWall(p.id)}
                          className={cn("rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                            active ? "border-accent bg-accent/10 text-accent ring-1 ring-accent" : "border-border bg-background text-foreground hover:border-accent/50")}>
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                  {config.plugPointWalls.length === 0 && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">None selected — plug points will be placed <span className="font-medium text-foreground">as per site</span>.</p>
                  )}
                </div>
              </StepShell>
            )}

            {step === 6 && (
              <StepShell title="Optional add-ons" subtitle="Furniture & fittings — add only what you want.">
                {isStorageProduct(config.productId) || isToiletCabin(config.productId) ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    {isToiletCabin(config.productId)
                      ? "Furniture add-ons aren’t applicable to a toilet cabin — it’s a complete, self-contained washroom unit."
                      : "Furniture add-ons aren’t applicable to storage cabins. Need shelving or racking? Let our team know and we’ll quote it separately."}
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {ADDONS.filter((a) =>
                        a.id !== "partition" && a.id !== "partition-door" &&
                        (!a.onlyFor || a.onlyFor.includes(config.productId))
                      ).map((a) => {
                        const selected = !!config.addons[a.id];
                        return (
                          <ToggleCard key={a.id} selected={selected} onToggle={() => toggleAddon(a.id)}
                            label={a.label} sub={`${formatINR(a.price)}${a.hasQty ? " each" : ""}${a.hint ? ` · ${a.hint}` : ""}`}>
                            {selected && a.hasQty && (
                              <Stepper value={config.addons[a.id]} min={1} max={200} label={`${a.label} quantity`} onChange={(n) => setAddonQty(a.id, n)} />
                            )}
                          </ToggleCard>
                        );
                      })}
                    </div>
                    {/* Furniture layout — which room each work item goes in (multi-room layouts).
                        Spec only (no price impact); flows into the summary + PDF. */}
                    {(() => {
                      const selectedFurniture = ADDONS.filter((a) => ROOM_FURNITURE_IDS.includes(a.id) && config.addons[a.id]);
                      if (selectedFurniture.length === 0) return null;
                      const multiRoom = config.roomCount > 1;
                      return (
                        <div className="border-t border-border pt-4">
                          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <Label className="text-sm font-semibold">Furniture Layout</Label>
                            <span className="text-[11px] text-muted-foreground">
                              {multiRoom
                                ? `Set how many of each item go in Rooms 1–${config.roomCount - 1} — the rest go to Room ${config.roomCount}`
                                : "Where your furniture sits"}
                            </span>
                          </div>
                          <div className="grid gap-3 lg:grid-cols-[1fr_18rem] lg:items-start">
                            <div className="space-y-2">
                              {multiRoom ? (
                                selectedFurniture.map((a) => {
                                  const total = config.addons[a.id];
                                  const counts = furnitureRoomCounts(config, a.id, total, config.roomCount);
                                  const last = counts[counts.length - 1];
                                  return (
                                    <div key={a.id} className="rounded-lg border border-border bg-background p-2.5">
                                      <div className="mb-1.5 text-sm font-medium text-foreground">
                                        {a.label}<span className="font-normal text-muted-foreground"> · {total} total</span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        {counts.slice(0, -1).map((c, i) => (
                                          <div key={i} className="flex items-center gap-1.5">
                                            <span className="text-[11px] font-medium text-muted-foreground">Room {i + 1}</span>
                                            <Stepper value={c} min={0} max={total} label={`${a.label} in Room ${i + 1}`} onChange={(n) => setFurnitureRoomCount(a.id, i, n)} />
                                          </div>
                                        ))}
                                        <span className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground">
                                          Room {config.roomCount}: <span className="text-foreground">{last}</span>
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="rounded-lg border border-dashed border-accent/40 bg-accent/5 p-3 text-[11px] leading-snug text-muted-foreground">
                                  Single-room cabin — all furniture sits in the one room. Want a separate manager cabin and staff room? Add <span className="font-semibold text-foreground">2+ Rooms</span> in the Size step to place each item per room.
                                </p>
                              )}
                            </div>
                            <FurniturePlan
                              length={config.length} width={config.width}
                              roomLengths={config.roomLengths}
                              furniturePosition={config.furniturePosition}
                              doorPlacements={config.doorPlacements}
                              items={selectedFurniture.flatMap((a) => {
                                const total = config.addons[a.id];
                                const counts = furnitureRoomCounts(config, a.id, total, config.roomCount);
                                return counts
                                  .map((c, i) => (c > 0 ? { id: `${a.id}-r${i + 1}`, type: a.id, label: a.label, room: i + 1, qty: c } : null))
                                  .filter((x): x is { id: string; type: string; label: string; room: number; qty: number } => x !== null);
                              })}
                            />
                          </div>
                        </div>
                      );
                    })()}
                    {/* Layout preferences — spec only (no price impact) */}
                    <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                      <SpecPills
                        label="Furniture Position"
                        hint="Table / workstation placement — against the wall or in the centre."
                        options={FURNITURE_POSITIONS}
                        value={config.furniturePosition}
                        onSelect={(id) => patch({ furniturePosition: id })}
                      />
                      <SpecPills
                        label="Shifting / Mobility Type"
                        hint="How the cabin will be used — fully relocatable or fixed on site."
                        options={MOBILITY_TYPES}
                        value={config.mobilityType}
                        onSelect={(id) => patch({ mobilityType: id })}
                      />
                    </div>
                    {/* Complete layout — a read-only floor plan combining EVERYTHING chosen
                        so far (doors, windows, lights, fans, plug points & furniture) in one
                        view, shown right after the add-ons. */}
                    <div className="border-t border-border pt-4">
                      <CompleteLayoutPreview config={config} />
                    </div>
                    {/* Optional drag-and-drop layout — position the chosen doors, windows,
                        lights, fans & furniture on the floor plan. Spec only (no price);
                        saved into the quote/PDF so the factory builds to the arrangement. */}
                    <LayoutDesigner
                      config={config}
                      onLayoutChange={(layout) => setConfig((c) => ({ ...c, layout }))}
                    />
                  </div>
                )}
              </StepShell>
            )}

            {step === 7 && (
              <StepShell title="Delivery & taxes" subtitle="Transport and installation are optional and vary by location.">
                <div className="space-y-2.5">
                  <SwitchRow label="Transport Required?" sub={`Approx. ${formatINR(18000)} per cabin (varies by distance)`}
                    checked={config.transport} onChange={(v) => patch({ transport: v })} />
                  <SwitchRow label="Installation Required?" sub={`Approx. ${formatINR(15000)} per cabin`}
                    checked={config.installation} onChange={(v) => patch({ installation: v })} />
                  <SwitchRow label="Include GST (18%)" sub="Shown on the estimate total"
                    checked={config.gst} onChange={(v) => patch({ gst: v })} />
                </div>
              </StepShell>
            )}

            {step === 8 && (
              <StepShell title="Get your official quotation" subtitle="Review your estimate and request a verified quotation.">
                {submitted ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 py-10 text-center">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                    <h4 className="text-lg font-bold text-foreground">Request received!</h4>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      Thank you, {lead.name.split(" ")[0] || "there"}. Our sales team will review your configuration and send a verified quotation within 24 hours.
                    </p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      <Button variant="outline" onClick={downloadPDF}><Download className="h-4 w-4" /> Download Estimate</Button>
                      <Button variant="accent" onClick={shareWhatsApp}><MessageCircle className="h-4 w-4" /> Chat on WhatsApp</Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submitQuotation} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <LeadField label="Full Name *" value={lead.name} onChange={(v) => setLead({ ...lead, name: v })} required placeholder="Your name" />
                      <LeadField label="Company Name" value={lead.company} onChange={(v) => setLead({ ...lead, company: v })} placeholder="Company (optional)" />
                      <LeadField label="Mobile Number *" value={lead.phone} onChange={(v) => setLead({ ...lead, phone: v })} required type="tel" inputMode="tel" placeholder="10-digit mobile" />
                      <LeadField label="Email Address *" value={lead.email} onChange={(v) => setLead({ ...lead, email: v })} required type="email" placeholder="you@email.com" />
                      <LeadField label="City" value={lead.city} onChange={(v) => setLead({ ...lead, city: v })} placeholder="City" />
                      <LeadField label="State" value={lead.state} onChange={(v) => setLead({ ...lead, state: v })} placeholder="State" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={notesId} className="text-xs text-muted-foreground">Notes</Label>
                      <Textarea id={notesId} rows={2} value={lead.notes} onChange={(e) => setLead({ ...lead, notes: e.target.value })} placeholder="Anything specific about your requirement…" />
                    </div>
                    <div className="rounded-lg border border-dashed border-accent/40 bg-accent/5 p-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Estimated Total: {totalText}{config.gst || needsContact ? "" : " + GST"}</span> — this indicative price will be verified & approved by our sales team.
                    </div>
                    <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                      {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending…</> : <><Send className="h-5 w-5" /> Get My Official Quotation</>}
                    </Button>
                  </form>
                )}
              </StepShell>
            )}
          </div>

          {/* Nav */}
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" onClick={gotoPrev} disabled={isFirstVisible} className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <button type="button" onClick={startOver} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent">
              <RotateCcw className="h-3 w-3" /> Start over
            </button>
            {!isLastVisible ? (
              <Button variant="accent" onClick={gotoNext}>
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <span className="w-[76px]" />
            )}
          </div>
        </div>

        {/* ---------------- Right: sticky estimate (desktop) ---------------- */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-border bg-gradient-to-b from-card to-muted/20 p-5 shadow-lg">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Live Estimate</h3>
            </div>
            <EstimateRows est={est} gstOn={config.gst} container={isContainer} />
            <div className="mt-3 rounded-xl bg-gradient-to-r from-navy-medium to-navy-deep p-4 text-center">
              <p className="text-[11px] uppercase tracking-wide text-white/70">Estimated Total</p>
              <p className="font-display text-2xl font-extrabold text-white">{totalText}</p>
              {!config.gst && <p className="text-[11px] text-white/70">+ GST</p>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={downloadPDF}><Download className="h-4 w-4" /> PDF</Button>
              <Button variant="outline" size="sm" onClick={shareWhatsApp}><MessageCircle className="h-4 w-4" /> Share</Button>
            </div>
            {!isLastVisible && (
              <Button variant="hero" className="mt-2 w-full" onClick={() => goTo(STEPS.length - 1)}>
                Get Official Quotation
              </Button>
            )}
            <p className="mt-3 text-[10px] leading-snug text-muted-foreground">
              Indicative estimate. Final quotation is verified & approved by our sales team based on specifications, delivery location and selected options.
            </p>
          </div>
        </aside>
      </div>

      {/* ---------------- Sticky bottom bar (mobile) ----------------
          Portaled to <body> so an ancestor's content-visibility/contain (which would
          otherwise scope position:fixed to the section) can't stop it sticking to the
          viewport. Shown only while the calculator is on screen (barInView). Right
          padding (pr-20) keeps the CTA clear of the site's floating WhatsApp button. */}
      {portalReady && barInView && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur px-4 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] lg:hidden">
          {showMobileBreakdown && (
            <div id="cabin-mobile-breakdown" className="mb-2 max-h-[45vh] overflow-y-auto rounded-xl border border-border bg-background p-3">
              <EstimateRows est={est} gstOn={config.gst} container={isContainer} />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={downloadPDF}><Download className="h-4 w-4" /> PDF</Button>
                <Button variant="outline" size="sm" onClick={shareWhatsApp}><MessageCircle className="h-4 w-4" /> Share</Button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 pr-20">
            <button type="button" onClick={() => setShowMobileBreakdown((s) => !s)}
              aria-expanded={showMobileBreakdown} aria-controls="cabin-mobile-breakdown" className="flex-1 text-left">
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Estimated Total <span aria-hidden="true">{showMobileBreakdown ? "▾" : "▴"}</span></span>
              <span className="font-display text-lg font-extrabold text-foreground">{totalText}{!config.gst && !needsContact && <span className="text-xs font-medium text-muted-foreground"> +GST</span>}</span>
            </button>
            {!isLastVisible ? (
              <Button variant="hero" size="sm" onClick={gotoNext}>Next <ArrowRight className="h-4 w-4" /></Button>
            ) : !submitted ? (
              <Button variant="hero" size="sm" onClick={() => topRef.current?.scrollIntoView({ behavior: "smooth" })}>Fill form ↑</Button>
            ) : (
              <Button variant="accent" size="sm" onClick={shareWhatsApp}><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
            )}
          </div>
        </div>,
        document.body,
      )}
      {/* Spacer so the fixed mobile bar never covers the wizard's own bottom controls */}
      <div className="h-24 lg:hidden" />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Presentational helpers                                           */
/* ---------------------------------------------------------------- */
function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="animate-fade-in">
      <h3 className="font-display text-xl font-bold text-foreground">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{subtitle}</p>
      {children}
    </div>
  );
}

/** Spec-only pill selector (no price impact) — placement / mobility choices. */
function SpecPills({ label, hint, options, value, onSelect }: {
  label: string; hint?: string; options: readonly { id: string; label: string }[]; value: string; onSelect: (id: string) => void;
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onSelect(o.id)}
            className={cn("rounded-lg border px-3 py-2 text-xs font-medium transition-all",
              value === o.id ? "border-accent bg-accent/10 text-accent ring-1 ring-accent" : "border-border text-foreground hover:border-accent/50")}>
            {o.label}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function MaterialGroup({ label, items, value, onSelect }: { label: string; items: Material[]; value: string; onSelect: (id: string) => void }) {
  return (
    <div>
      <Label className="mb-2 block text-sm font-semibold">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {items.map((m) => (
          <MaterialChip key={m.id} item={m} selected={value === m.id} onSelect={() => onSelect(m.id)} />
        ))}
      </div>
    </div>
  );
}

/** Internal-wall selector for PUF panel cabins: the bare panel is the recommended finished
 *  wall (₹0). Any interior lining is optional and priced as an ADD-ON over the panel (its
 *  absolute rate), since a PUF cabin bundles no lining in the base. */
function PufWallGroup({ value, onSelect }: { value: string; onSelect: (id: string) => void }) {
  const items = pufWallOptions();
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <Label className="text-sm font-semibold">Internal Wall <span className="font-normal text-muted-foreground">(optional)</span></Label>
      </div>
      <div className="mb-2 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 p-2.5 text-[11px] leading-snug text-muted-foreground">
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Recommended: not required.</span> The insulated PUF panel is already a clean, finished interior wall — no extra lining needed. Add a lining below only if you specifically want one (charged as an add-on).
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((m) => (
          <MaterialChip key={m.id} item={m} selected={value === m.id} onSelect={() => onSelect(m.id)} />
        ))}
      </div>
    </div>
  );
}

/** For PUF panel cabins the panel is inherently insulated (no corrugated body, no separate
 *  insulation layer), so the Insulation selector is replaced with this explanatory build-up
 *  + a sandwich-panel cross-section (shown INSTEAD of the corrugated one). */
function PufPanelBuildup() {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <Label className="text-sm font-semibold">Wall Build-up</Label>
        <span className="text-[11px] text-muted-foreground">Insulated PUF sandwich panel</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_18rem] lg:items-start">
        <div className="rounded-lg border border-dashed border-accent/40 bg-accent/5 p-3 text-[12px] leading-snug text-muted-foreground">
          <p className="font-semibold text-foreground">No corrugated sheet · no separate insulation.</p>
          <p className="mt-1">A PUF (polyurethane-foam) sandwich panel is a single factory-made wall — colour-coated steel skin, an insulating PUF core, and a steel skin. It is inherently thermally insulated, so there is <span className="font-medium text-foreground">no corrugated outer body</span> and <span className="font-medium text-foreground">no separate glass-wool / Hitlon layer</span> to add.</p>
        </div>
        <PufPanelCrossSection />
      </div>
    </div>
  );
}

/** PUF sandwich-panel wall cross-section: steel skin → insulating PUF foam core → steel
 *  skin. Shown for PUF panel cabins in place of the corrugated build-up. */
function PufPanelCrossSection() {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="mb-2 text-center text-[11px] font-medium text-muted-foreground">Wall build-up — insulated PUF sandwich panel</p>
      <svg viewBox="0 0 340 132" className="mx-auto h-auto w-full max-w-xs" role="img"
        aria-label="Wall cross-section: steel skin, PUF foam core, steel skin — no corrugated sheet">
        <text x="30" y="12" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">Outside</text>
        <text x="310" y="12" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">Inside</text>
        {/* Outer colour-coated steel skin */}
        <rect x="34" y="22" width="16" height="96" rx="2" fill="#94a3b8" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
        {/* PUF foam core */}
        <rect x="50" y="22" width="240" height="96" rx="2" fill="#f8d477" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
        {Array.from({ length: 40 }).map((_, i) => (
          <circle key={i} cx={62 + (i % 10) * 24} cy={34 + Math.floor(i / 10) * 22} r={2.4} fill="rgba(255,255,255,0.55)" />
        ))}
        {/* Inner colour-coated steel skin */}
        <rect x="290" y="22" width="16" height="96" rx="2" fill="#94a3b8" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      </svg>
      <div className="mt-1 flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-[2px]" style={{ background: "#94a3b8" }} /> Steel skin</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-[2px] border border-black/20" style={{ background: "#f8d477" }} /> PUF foam core</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-[2px]" style={{ background: "#94a3b8" }} /> Steel skin</span>
      </div>
    </div>
  );
}

/** Cross-section illustration of the wall build-up: corrugated outer body →
 *  insulation core (coloured by the selected option) → plain inner lining. */
function InsulationCrossSection({ option }: { option: InsulationOption }) {
  const filled = option.id !== "none";
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="mb-2 text-center text-[11px] font-medium text-muted-foreground">
        {filled ? `Wall build-up — ${option.label} ${option.thickness}` : "Wall build-up — no insulation"}
      </p>
      <svg viewBox="0 0 340 132" className="mx-auto h-auto w-full max-w-xs" role="img"
        aria-label={`Wall cross-section: corrugated outer body, ${filled ? `${option.label} insulation` : "no insulation"}, plain inner wall`}>
        <text x="26" y="12" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">Outside</text>
        <text x="300" y="12" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">Inside</text>
        {/* Corrugated outer steel skin */}
        <path d="M18,22 L34,30 L18,38 L34,46 L18,54 L34,62 L18,70 L34,78 L18,86 L34,94 L18,102 L34,110 L18,118"
          fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
        {/* Insulation core */}
        {filled ? (
          <g>
            <rect x="46" y="22" width="228" height="96" rx="3" fill={option.color} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
            {Array.from({ length: 7 }).map((_, i) => (
              <line key={i} x1="52" y1={30 + i * 13} x2="268" y2={30 + i * 13} stroke="rgba(0,0,0,0.12)" strokeWidth="1" strokeDasharray="5 4" />
            ))}
          </g>
        ) : (
          <rect x="46" y="22" width="228" height="96" rx="3" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="5 5" />
        )}
        {/* Plain inner wall lining */}
        <rect x="282" y="22" width="18" height="96" rx="2" fill="hsl(var(--muted))" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      </svg>
      <div className="mt-1 flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-[2px]" style={{ background: "#94a3b8" }} /> Corrugated outer</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-[2px] border border-black/20" style={{ background: filled ? option.color : "transparent" }} /> {filled ? option.label : "No layer"}</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-[2px] bg-muted" /> Plain inner</span>
      </div>
    </div>
  );
}

/** Insulation selector — chips for each option + the live wall cross-section. */
function InsulationGroup({ value, onSelect }: { value: string; onSelect: (id: string) => void }) {
  const selected = INSULATION_OPTIONS.find((o) => o.id === value) ?? INSULATION_OPTIONS[0];
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <Label className="text-sm font-semibold">Insulation</Label>
        <span className="text-[11px] text-muted-foreground">Between the outer body &amp; inner wall — charged per sq.ft of wall + ceiling.</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_18rem] lg:items-start">
        <div className="flex flex-wrap gap-2">
          {INSULATION_OPTIONS.map((o) => {
            const active = value === o.id;
            return (
              <button key={o.id} type="button" onClick={() => onSelect(o.id)} aria-pressed={active}
                className={cn("flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition-all",
                  active ? "border-accent bg-accent/10 ring-1 ring-accent shadow-sm" : "border-border bg-background hover:border-accent/50")}>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  {o.id !== "none" && <span className="h-3 w-3 rounded-sm border border-black/20" style={{ background: o.color }} />}
                  {o.label}{o.thickness !== "—" ? ` ${o.thickness}` : ""}
                </span>
                <span className={cn("text-[11px] font-medium", o.ratePerSqft > 0 ? "text-accent" : "text-muted-foreground")}>
                  {o.ratePerSqft > 0 ? `+₹${o.ratePerSqft}/sqft` : "None"}
                </span>
              </button>
            );
          })}
        </div>
        <InsulationCrossSection option={selected} />
      </div>
      {selected.id !== "none" && <p className="mt-2 text-[11px] text-muted-foreground">{selected.note}</p>}
    </div>
  );
}

function ToggleCard({ selected, onToggle, label, sub, children }: {
  selected: boolean; onToggle: () => void; label: string; sub: string; children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-xl border p-3 transition-all",
      selected ? "border-accent bg-accent/10 ring-1 ring-accent" : "border-border bg-background")}>
      <button type="button" onClick={onToggle} aria-pressed={selected} className="flex flex-1 items-center gap-2.5 text-left">
        <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors",
          selected ? "border-accent bg-accent text-white" : "border-muted-foreground/40")}>
          {selected && <Check className="h-3.5 w-3.5" />}
        </span>
        <span>
          <span className="block text-sm font-semibold text-foreground">{label}</span>
          <span className="block text-[11px] text-muted-foreground">{sub}</span>
        </span>
      </button>
      {children}
    </div>
  );
}

function SwitchRow({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={cn("inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent p-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2", checked ? "bg-accent" : "bg-muted-foreground/30")}>
        <span className={cn("pointer-events-none block h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
      </button>
    </div>
  );
}

function LeadField({ label, value, onChange, required, type = "text", placeholder, inputMode }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string;
  placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <Input id={id} type={type} inputMode={inputMode} value={value} required={required} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
