"use client";

/**
 * LayoutDesigner — an optional, collapsible drag-and-drop floor-plan editor.
 *
 * The customer drags chips for the items they've already chosen (doors, windows,
 * lights, fans, AC/plug points, furniture) onto a scaled cabin outline. Positions
 * are stored as fractional {x,y} (0..1) in `config.layout` — SPEC-ONLY, no price
 * impact — and summarised into the WhatsApp quote + PDF (see summariseLayout) so
 * the factory builds to the intended arrangement. Matches the existing
 * "spec-only placement" pattern (FURNITURE_POSITIONS / PLUG_POINT_POSITIONS).
 *
 * Self-contained so it can be dropped into the Add-ons step without entangling the
 * (large) CabinCalculator component.
 */

import { useMemo, useRef, useState } from "react";
import {
  DoorOpen, AppWindow, Lightbulb, Fan, Wind, Snowflake, Plug, Armchair,
  Move, RotateCcw, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ELECTRICAL_ITEMS, ADDONS, ROOM_FURNITURE_IDS, windowPositionLabel,
  type CabinConfig,
} from "./pricing";

type Pos = { x: number; y: number };
type Layout = Record<string, Pos>;
type Kind = "door" | "window" | "led" | "tube" | "fan" | "exhaust" | "ac" | "plug" | "furniture";
type Item = { id: string; kind: Kind; label: string; short: string };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Per-kind icon, chip colour, and a sensible default "row" (y) so items don't all
// stack on top of each other before the customer arranges them.
const KIND_META: Record<Kind, { icon: React.ElementType; cls: string; row: number; group: string }> = {
  window:    { icon: AppWindow, cls: "border-sky-500/50 bg-sky-500/15 text-sky-300",         row: 0.08, group: "Windows" },
  led:       { icon: Lightbulb, cls: "border-amber-400/50 bg-amber-400/15 text-amber-300",   row: 0.26, group: "Lights" },
  tube:      { icon: Lightbulb, cls: "border-amber-400/50 bg-amber-400/15 text-amber-300",   row: 0.26, group: "Lights" },
  fan:       { icon: Fan,       cls: "border-cyan-400/50 bg-cyan-400/15 text-cyan-300",       row: 0.42, group: "Fans" },
  exhaust:   { icon: Wind,      cls: "border-cyan-400/50 bg-cyan-400/15 text-cyan-300",       row: 0.42, group: "Fans" },
  ac:        { icon: Snowflake, cls: "border-blue-400/50 bg-blue-400/15 text-blue-300",       row: 0.50, group: "AC" },
  plug:      { icon: Plug,      cls: "border-violet-400/50 bg-violet-400/15 text-violet-300", row: 0.62, group: "Plugs" },
  furniture: { icon: Armchair,  cls: "border-emerald-400/50 bg-emerald-400/15 text-emerald-300", row: 0.76, group: "Furniture" },
  door:      { icon: DoorOpen,  cls: "border-orange-400/50 bg-orange-400/15 text-orange-300", row: 0.92, group: "Doors" },
};

const ELECTRICAL_KINDS = ["led", "tube", "fan", "exhaust", "ac", "plug"];
// Cap per-type chips so a config with e.g. 30 plug points doesn't flood the canvas.
const PER_TYPE_CAP = 12;

/** Build the flat list of draggable items from the customer's current selections. */
function deriveItems(config: CabinConfig): Item[] {
  const items: Item[] = [];

  const doors = config.doorPlacements ?? [];
  doors.forEach((_, i) =>
    items.push({ id: `door-${i}`, kind: "door", label: doors.length > 1 ? `Door ${i + 1}` : "Door", short: "Door" }));

  (config.windowPositions ?? []).forEach((pos) =>
    items.push({ id: `window-${pos}`, kind: "window", label: `Window · ${windowPositionLabel(pos)}`, short: "Window" }));

  Object.entries(config.electrical ?? {}).forEach(([eid, qty]) => {
    const n = Math.min(qty || 0, PER_TYPE_CAP);
    if (n <= 0) return;
    const meta = ELECTRICAL_ITEMS.find((e) => e.id === eid);
    const kind = (ELECTRICAL_KINDS.includes(eid) ? eid : "plug") as Kind;
    const name = meta?.label ?? eid;
    for (let i = 0; i < n; i++)
      items.push({ id: `${eid}-${i}`, kind, label: n > 1 ? `${name} ${i + 1}` : name, short: name });
  });

  ROOM_FURNITURE_IDS.forEach((fid) => {
    const n = Math.min(config.addons?.[fid] ?? 0, 6);
    if (n <= 0) return;
    const name = ADDONS.find((a) => a.id === fid)?.label ?? fid;
    for (let i = 0; i < n; i++)
      items.push({ id: `${fid}-${i}`, kind: "furniture", label: n > 1 ? `${name} ${i + 1}` : name, short: name });
  });

  return items;
}

/** Deterministic default positions: spread each kind along its row so nothing overlaps. */
function defaultPositions(items: Item[]): Layout {
  const byKind = new Map<Kind, Item[]>();
  items.forEach((it) => byKind.set(it.kind, [...(byKind.get(it.kind) ?? []), it]));
  const out: Layout = {};
  byKind.forEach((group, kind) => {
    const y = KIND_META[kind].row;
    group.forEach((it, i) => {
      const n = group.length;
      out[it.id] = { x: n === 1 ? 0.5 : 0.14 + (0.72 * i) / (n - 1), y };
    });
  });
  return out;
}

/** Map a fractional position to a human-readable zone (front = door wall / bottom). */
function zoneOf(p: Pos): string {
  const col = p.x < 0.34 ? "left" : p.x > 0.66 ? "right" : "centre";
  const row = p.y < 0.34 ? "rear" : p.y > 0.66 ? "front" : "middle";
  return `${row}-${col}`;
}

/** One-line layout spec for the WhatsApp quote / PDF. Only items the customer
 *  actually moved (have a stored position) are listed; returns "" if none. */
export function summariseLayout(config: CabinConfig): string {
  const layout = config.layout ?? {};
  if (!Object.keys(layout).length) return "";
  return deriveItems(config)
    .filter((it) => layout[it.id])
    .map((it) => `${it.label}: ${zoneOf(layout[it.id])}`)
    .join("; ");
}

export function LayoutDesigner({
  config,
  onLayoutChange,
}: {
  config: CabinConfig;
  onLayoutChange: (layout: Layout) => void;
}) {
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState<{ id: string; pos: Pos } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => deriveItems(config), [config]);
  const defaults = useMemo(() => defaultPositions(items), [items]);
  const saved = config.layout ?? {};

  const posOf = (id: string): Pos =>
    (drag?.id === id ? drag.pos : saved[id]) ?? defaults[id] ?? { x: 0.5, y: 0.5 };

  const fromEvent = (e: React.PointerEvent): Pos | null => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return null;
    return {
      x: clamp((e.clientX - r.left) / r.width, 0.04, 0.96),
      y: clamp((e.clientY - r.top) / r.height, 0.04, 0.96),
    };
  };

  const startDrag = (e: React.PointerEvent, id: string) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = fromEvent(e) ?? posOf(id);
    setDrag({ id, pos });
  };
  const moveDrag = (e: React.PointerEvent, id: string) => {
    if (drag?.id !== id) return;
    const pos = fromEvent(e);
    if (pos) setDrag({ id, pos });
  };
  const endDrag = (e: React.PointerEvent, id: string) => {
    if (drag?.id !== id) return;
    onLayoutChange({ ...saved, [id]: drag.pos });
    setDrag(null);
  };

  const usedGroups = useMemo(() => {
    const set = new Map<string, { icon: React.ElementType; cls: string }>();
    items.forEach((it) => {
      const m = KIND_META[it.kind];
      if (!set.has(m.group)) set.set(m.group, { icon: m.icon, cls: m.cls });
    });
    return [...set.entries()];
  }, [items]);

  const movedCount = items.filter((it) => saved[it.id]).length;

  return (
    <div className="rounded-xl border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 p-3 text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
            <Move className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-foreground">
              Customize Layout <span className="text-[10px] font-medium text-muted-foreground">· optional</span>
            </span>
            <span className="block text-[11px] text-muted-foreground">
              Drag to place doors, windows, lights, fans &amp; furniture
              {movedCount > 0 && <span className="text-accent"> · {movedCount} placed</span>}
            </span>
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border p-3">
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Choose your doors, windows, electricals or furniture in the earlier steps, then come back
              here to arrange them exactly where you want.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Drag each item onto the plan. Your arrangement is saved with the quote so the factory
                  builds it your way.
                </p>
                <button
                  type="button"
                  onClick={() => { setDrag(null); onLayoutChange({}); }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-accent hover:text-accent"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>

              {/* Draggable canvas — aspect ratio matches the cabin (length × width). */}
              <div
                ref={canvasRef}
                className="relative w-full select-none overflow-hidden rounded-lg border-2 border-dashed border-accent/40 bg-muted/20"
                style={{
                  aspectRatio: `${Math.max(config.length || 1, 1)} / ${Math.max(config.width || 1, 1)}`,
                  touchAction: "none",
                  backgroundImage:
                    "linear-gradient(to right, hsl(var(--border)/0.4) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)/0.4) 1px, transparent 1px)",
                  backgroundSize: "12.5% 25%",
                }}
              >
                {config.partitioned && config.length > 0 && (
                  <div
                    className="pointer-events-none absolute inset-y-0 w-px bg-accent/60"
                    style={{ left: `${clamp((config.room1Length || 0) / config.length, 0, 1) * 100}%` }}
                  />
                )}

                {items.map((it) => {
                  const p = posOf(it.id);
                  const meta = KIND_META[it.kind];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      title={it.label}
                      aria-label={`Move ${it.label}`}
                      onPointerDown={(e) => startDrag(e, it.id)}
                      onPointerMove={(e) => moveDrag(e, it.id)}
                      onPointerUp={(e) => endDrag(e, it.id)}
                      onPointerCancel={(e) => endDrag(e, it.id)}
                      className={cn(
                        "absolute flex -translate-x-1/2 -translate-y-1/2 touch-none items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-semibold shadow-sm transition-shadow",
                        "cursor-grab active:cursor-grabbing",
                        meta.cls,
                        drag?.id === it.id && "z-10 scale-105 shadow-md ring-2 ring-accent",
                      )}
                      style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="max-w-[76px] truncate">{it.short}</span>
                    </button>
                  );
                })}

                <span className="pointer-events-none absolute bottom-1 right-2 text-[9px] font-medium text-muted-foreground/70">
                  {Math.round(config.length)} × {Math.round(config.width)} ft
                </span>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {usedGroups.map(([label, m]) => {
                  const Icon = m.icon;
                  return (
                    <span key={label} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className={cn("grid h-4 w-4 place-items-center rounded border", m.cls)}>
                        <Icon className="h-2.5 w-2.5" />
                      </span>
                      {label}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
