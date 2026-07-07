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

import { Fragment, useMemo, useRef, useState } from "react";
import {
  DoorOpen, AppWindow, Lightbulb, Fan, Wind, Snowflake, Plug, Armchair,
  Move, RotateCcw, RotateCw, ChevronDown, Square, Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ELECTRICAL_ITEMS, ADDONS, ROOM_FURNITURE_IDS, windowPositionLabel, materialSpec,
  type CabinConfig,
} from "./pricing";

// `r` = rotation in degrees (0/90/180/270); undefined means 0 (upright).
type Pos = { x: number; y: number; r?: number };
type Layout = Record<string, Pos>;
type Kind = "door" | "window" | "led" | "tube" | "fan" | "exhaust" | "ac" | "plug" | "furniture";
type Item = { id: string; kind: Kind; label: string; short: string; size?: string; shape?: "round" | "square" | "rect" };

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
    const spec = materialSpec(kind, eid, config.ledShape);
    for (let i = 0; i < n; i++)
      items.push({ id: `${eid}-${i}`, kind, label: n > 1 ? `${name} ${i + 1}` : name, short: name, size: spec?.label, shape: spec?.shape });
  });

  ROOM_FURNITURE_IDS.forEach((fid) => {
    const n = Math.min(config.addons?.[fid] ?? 0, 6);
    if (n <= 0) return;
    const name = ADDONS.find((a) => a.id === fid)?.label ?? fid;
    const spec = materialSpec("furniture", fid, config.ledShape);
    for (let i = 0; i < n; i++)
      items.push({ id: `${fid}-${i}`, kind: "furniture", label: n > 1 ? `${name} ${i + 1}` : name, short: name, size: spec?.label, shape: spec?.shape });
  });

  return items;
}

// Spread the i-th of n items evenly across [a,b]; a single item lands in the middle.
const spreadFrac = (i: number, n: number, a: number, b: number) =>
  n <= 1 ? (a + b) / 2 : a + ((b - a) * i) / (n - 1);

// Canvas convention: x runs along the LENGTH (0=left, 1=right), y along the WIDTH
// (0=rear wall, 1=front/door wall) — matching the floor plan & elevations.
function doorDefault(side: string | undefined, offset: number | undefined, L: number, W: number): Pos {
  const along = (span: number) => clamp((offset ?? span / 2) / span, 0.1, 0.9);
  switch (side) {
    case "top": return { x: along(L), y: 0.05 };
    case "left": return { x: 0.05, y: along(W) };
    case "right": return { x: 0.95, y: along(W) };
    default: return { x: along(L), y: 0.95 }; // bottom / front wall
  }
}
const WINDOW_DEFAULT: Record<string, Pos> = {
  "top-left": { x: 0.2, y: 0.05 }, "top-center": { x: 0.5, y: 0.05 }, "top-right": { x: 0.8, y: 0.05 },
  "bottom-left": { x: 0.2, y: 0.95 }, "bottom-center": { x: 0.5, y: 0.95 }, "bottom-right": { x: 0.8, y: 0.95 },
  "bottom": { x: 0.7, y: 0.95 }, "left": { x: 0.05, y: 0.5 }, "right": { x: 0.95, y: 0.5 },
};
// Furniture: the conference table sits in the centre; desks/tables go against a wall by
// default, or toward the centre when the customer picks "Centre" in Furniture Position.
function furnitureDefault(fid: string, i: number, n: number, centre: boolean): Pos {
  switch (fid) {
    case "conference": return { x: 0.5, y: 0.52 };
    case "manager":    return centre ? { x: 0.42, y: 0.42 } : { x: spreadFrac(i, n, 0.2, 0.42), y: 0.12 };
    case "workstation": return centre ? { x: spreadFrac(i, n, 0.34, 0.66), y: 0.56 } : { x: spreadFrac(i, n, 0.16, 0.84), y: 0.9 };
    case "cupboard":   return { x: 0.93, y: spreadFrac(i, n, 0.14, 0.42) };
    case "chairs":     return { x: spreadFrac(i, n, 0.36, 0.64), y: 0.68 };
    default:           return centre ? { x: 0.5, y: 0.5 } : { x: spreadFrac(i, n, 0.16, 0.84), y: 0.9 };
  }
}

/** Realistic default positions so the plan looks like a real cabin before the customer
 *  drags anything: doors/windows on their walls, fan(s) centred, lights arranged in a ring
 *  ("rotating") around the centre, and furniture against the walls with the conference
 *  table centred. Honours config.furniturePosition (wall vs centre) for the desks/tables. */
function defaultPositions(config: CabinConfig, items: Item[]): Layout {
  const L = Math.max(1, config.length || 1), W = Math.max(1, config.width || 1);
  const centre = config.furniturePosition === "centre";
  const byKind = new Map<Kind, Item[]>();
  items.forEach((it) => byKind.set(it.kind, [...(byKind.get(it.kind) ?? []), it]));
  const rank = (it: Item): [number, number] => {
    const g = byKind.get(it.kind) ?? [];
    return [g.findIndex((x) => x.id === it.id), g.length];
  };
  const out: Layout = {};
  items.forEach((it) => {
    const [i, n] = rank(it);
    let p: Pos;
    switch (it.kind) {
      case "door": {
        const di = parseInt(it.id.split("-").pop() ?? "0", 10);
        const d = config.doorPlacements?.[di];
        p = doorDefault(d?.side, d?.offset, L, W);
        break;
      }
      case "window":
        p = WINDOW_DEFAULT[it.id.replace(/^window-/, "")] ?? { x: 0.5, y: 0.05 };
        break;
      case "fan": case "exhaust":
        p = { x: spreadFrac(i, n, 0.35, 0.65), y: 0.5 }; // fan(s) in the centre
        break;
      case "led": case "tube": {
        const a = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
        p = n === 1 ? { x: 0.5, y: 0.3 } : { x: 0.5 + 0.3 * Math.cos(a), y: 0.5 + 0.32 * Math.sin(a) };
        break;
      }
      case "ac":
        p = { x: 0.05, y: spreadFrac(i, n, 0.16, 0.5) }; // side wall, upper
        break;
      case "plug":
        p = { x: spreadFrac(i, n, 0.12, 0.88), y: 0.96 }; // along the front wall
        break;
      case "furniture":
        p = furnitureDefault(it.id.replace(/-\d+$/, ""), i, n, centre);
        break;
      default:
        p = { x: 0.5, y: 0.5 };
    }
    out[it.id] = { x: clamp(p.x, 0.04, 0.96), y: clamp(p.y, 0.04, 0.96) };
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
    .map((it) => {
      const p = layout[it.id];
      const rot = p.r ? ` (rotated ${p.r}°)` : "";
      return `${it.label}: ${zoneOf(p)}${rot}`;
    })
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
  // `moved` distinguishes a real drag from a tap (tap = select, to reveal the
  // rotate handle). sx/sy are the pointer-down client coords for that check.
  const [drag, setDrag] = useState<{ id: string; pos: Pos; sx: number; sy: number; moved: boolean } | null>(null);
  // The currently-selected item shows a rotate handle. null = nothing selected.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => deriveItems(config), [config]);
  const defaults = useMemo(() => defaultPositions(config, items), [config, items]);
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
    const cur = posOf(id);
    const p = fromEvent(e);
    // Carry the existing rotation through the drag so moving never loses orientation.
    setDrag({ id, pos: p ? { ...p, r: cur.r } : cur, sx: e.clientX, sy: e.clientY, moved: false });
  };
  const moveDrag = (e: React.PointerEvent, id: string) => {
    if (drag?.id !== id) return;
    const p = fromEvent(e);
    if (!p) return;
    const moved = drag.moved || Math.abs(e.clientX - drag.sx) > 5 || Math.abs(e.clientY - drag.sy) > 5;
    setDrag({ ...drag, pos: { ...p, r: drag.pos.r }, moved });
  };
  const endDrag = (e: React.PointerEvent, id: string) => {
    if (drag?.id !== id) return;
    if (drag.moved) {
      onLayoutChange({ ...saved, [id]: drag.pos }); // commit the move (keeps rotation)
      setSelectedId(id);                            // keep it selected so it can be rotated
    } else {
      setSelectedId((s) => (s === id ? null : id)); // tap toggles selection
    }
    setDrag(null);
  };

  // Rotate the item by +90° (0→90→180→270→0). Pins its current position into the
  // saved layout so a not-yet-moved item stays put while gaining an orientation.
  const rotateItem = (id: string) => {
    const cur = posOf(id);
    onLayoutChange({ ...saved, [id]: { x: cur.x, y: cur.y, r: ((cur.r ?? 0) + 90) % 360 } });
    setSelectedId(id);
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
                  Drag each item to move it; tap an item, then press{" "}
                  <RotateCw className="inline h-2.5 w-2.5 align-[-1px] text-accent" /> to rotate it 90°.
                  Your arrangement is saved with the quote so the factory builds it your way.
                </p>
                <button
                  type="button"
                  onClick={() => { setDrag(null); setSelectedId(null); onLayoutChange({}); }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-accent hover:text-accent"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>

              {/* Draggable canvas — aspect ratio matches the cabin (length × width). */}
              <div
                ref={canvasRef}
                onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
                className="relative w-full select-none overflow-hidden rounded-lg border-2 border-dashed border-accent/40 bg-muted/20"
                style={{
                  aspectRatio: `${Math.max(config.length || 1, 1)} / ${Math.max(config.width || 1, 1)}`,
                  touchAction: "none",
                  backgroundImage:
                    "linear-gradient(to right, hsl(var(--border)/0.4) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)/0.4) 1px, transparent 1px)",
                  backgroundSize: "12.5% 25%",
                }}
              >
                {config.roomCount > 1 && config.length > 0 && (() => {
                  const total = config.roomLengths.reduce((a, b) => a + b, 0) || config.length;
                  let acc = 0;
                  return config.roomLengths.slice(0, -1).map((rl, i) => {
                    acc += rl;
                    return (
                      <div
                        key={i}
                        className="pointer-events-none absolute inset-y-0 w-px bg-accent/60"
                        style={{ left: `${clamp(acc / total, 0, 1) * 100}%` }}
                      />
                    );
                  });
                })()}

                {items.map((it) => {
                  const p = posOf(it.id);
                  const meta = KIND_META[it.kind];
                  // Reflect the real shape: a square LED panel vs a round LED / round fan.
                  const Icon = it.kind === "led" ? (it.shape === "round" ? Circle : Square) : meta.icon;
                  const rot = p.r ?? 0;
                  const isDragging = drag?.id === it.id;
                  const isSelected = selectedId === it.id;
                  return (
                    <Fragment key={it.id}>
                      <button
                        type="button"
                        title={it.size ? `${it.label} · ${it.kind === "furniture" ? "3.5 ft × 22″ × 30″" : it.size}` : it.label}
                        aria-label={`Move ${it.label}`}
                        onPointerDown={(e) => startDrag(e, it.id)}
                        onPointerMove={(e) => moveDrag(e, it.id)}
                        onPointerUp={(e) => endDrag(e, it.id)}
                        onPointerCancel={(e) => endDrag(e, it.id)}
                        className={cn(
                          "absolute flex touch-none items-center gap-1 border px-1.5 py-1 text-[10px] font-semibold shadow-sm transition-shadow",
                          it.shape === "round" ? "rounded-full" : "rounded-md",
                          "cursor-grab active:cursor-grabbing",
                          meta.cls,
                          isDragging && "z-20 shadow-md",
                          (isDragging || isSelected) && "ring-2 ring-accent",
                          isSelected && !isDragging && "z-10",
                        )}
                        style={{
                          left: `${p.x * 100}%`,
                          top: `${p.y * 100}%`,
                          // Centre on (x,y), then apply rotation (and a subtle grab pop).
                          transform: `translate(-50%, -50%) rotate(${rot}deg)${isDragging ? " scale(1.05)" : ""}`,
                        }}
                      >
                        <Icon className="h-3 w-3 shrink-0" />
                        <span className="flex flex-col items-start leading-none">
                          <span className="max-w-[92px] truncate">{it.short}</span>
                          {it.size && <span className="text-[8px] font-medium opacity-70">{it.size}</span>}
                        </span>
                      </button>

                      {/* Rotate handle — appears next to the selected item (when not being
                          dragged). Each press turns it 90°. Sits above the item, but flips
                          below for items near the top so it isn't clipped by the canvas. */}
                      {isSelected && !isDragging && (
                        <button
                          type="button"
                          title={`Rotate ${it.label}`}
                          aria-label={`Rotate ${it.label} 90 degrees`}
                          onClick={() => rotateItem(it.id)}
                          className="absolute z-30 grid h-6 w-6 place-items-center rounded-full border border-accent bg-background text-accent shadow-md transition-colors hover:bg-accent hover:text-accent-foreground"
                          style={{
                            left: `${p.x * 100}%`,
                            top: `${p.y * 100}%`,
                            transform: `translate(-50%, calc(-50% ${p.y < 0.16 ? "+" : "-"} 30px))`,
                          }}
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </Fragment>
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
