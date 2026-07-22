"use client";

/**
 * LABOUR COLONY STUDIO — the interactive 3D control shell.
 *
 * The DOM UI around Colony3DView (the only WebGL surface): named view presets, a render-mode
 * select, a uniform explode slider, axis section-cut controls, coarse layer toggles, kind-group
 * toggles, an engineering / customer mode switch, an HD toggle, measure + part-mark toggles, and a
 * compact selected-part readout. Everything here is plain Tailwind DOM, so ordinary theme colours
 * are fine (only the WebGL scene needs literal-hex, export-safe colours). Mounted only behind the
 * admin lazy loader (Colony3DLoader) — never on a public page.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Box, Camera, Crosshair, Eye, EyeOff, Grid3x3, Layers, Lock, Maximize2, Move3d, RotateCcw, Ruler,
  Scissors, Sparkles, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  ColonyModel, ColonyPartKind, ColonyPartLayer, ViewMode,
} from "@/features/labour-colony-studio/model/types";
import {
  Colony3DView, type CameraPreset, type ColonyView3DSettings, type RenderMode, type SectionAxis,
} from "./Colony3DView";

export interface Colony3DProps {
  model: ColonyModel;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const PRESETS: { id: CameraPreset; label: string }[] = [
  { id: "front", label: "Front" }, { id: "rear", label: "Rear" },
  { id: "left", label: "Left" }, { id: "right", label: "Right" },
  { id: "top", label: "Top" }, { id: "iso", label: "Iso" },
];

const RENDER_MODES: { id: RenderMode; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "wireframe", label: "Wireframe" },
  { id: "xray", label: "X-ray" },
  { id: "hidden-line", label: "Hidden line" },
];

const LAYERS: { id: ColonyPartLayer; label: string }[] = [
  { id: "foundation", label: "Foundation" }, { id: "structure", label: "Structure" },
  { id: "connection", label: "Connections" }, { id: "walls", label: "Walls" },
  { id: "roof", label: "Roof" }, { id: "openings", label: "Openings" },
  { id: "stair", label: "Stair" }, { id: "electrical", label: "Electrical" },
  { id: "plumbing", label: "Plumbing" }, { id: "furniture", label: "Furniture" },
  // master show / hide for the PUF panel bottom locking assemblies
  { id: "puf-lock", label: "PUF lock" },
];

/** Kind-group toggles → the ColonyPartKinds each hides when switched off. */
const KIND_GROUPS: { id: string; label: string; kinds: ColonyPartKind[] }[] = [
  { id: "columns", label: "Columns", kinds: ["column", "pedestal"] },
  { id: "beams", label: "Beams", kinds: ["base-beam", "floor-beam", "plinth-beam", "veranda-beam"] },
  { id: "joists", label: "Joists", kinds: ["joist", "veranda-joist"] },
  { id: "studs", label: "Studs / rails", kinds: ["stud", "rail"] },
  { id: "bracing", label: "Bracing", kinds: ["brace"] },
  { id: "trusses", label: "Trusses / rafters", kinds: ["roof-truss", "rafter", "truss-web", "ridge"] },
  { id: "purlins", label: "Purlins", kinds: ["purlin"] },
  { id: "plates", label: "Plates", kinds: ["base-plate", "levelling-plate", "gusset", "cleat", "end-plate", "splice-plate", "stiffener", "walkway-plate"] },
  { id: "bolts", label: "Bolts", kinds: ["bolt", "nut", "washer", "anchor-bolt"] },
  { id: "welds", label: "Welds", kinds: ["weld"] },
  { id: "staircase", label: "Staircase", kinds: ["stair-stringer", "stair-tread", "landing"] },
  { id: "railings", label: "Railings", kinds: ["handrail", "handrail-post", "toe-plate"] },
  // PUF panel bottom locking system — spec sub-toggles under the "puf-lock" master layer
  { id: "puflock-plates", label: "PUF lock plates", kinds: ["puf-lock-base-plate"] },
  { id: "puflock-bolts", label: "PUF lock bolts", kinds: ["puf-lock-anchor-bolt", "puf-lock-nut", "puf-lock-washer"] },
  { id: "puflock-purlins", label: "PUF lock C-purlins", kinds: ["puf-lock-c-purlin-left", "puf-lock-c-purlin-right"] },
  { id: "puflock-panels", label: "PUF panel seating", kinds: ["puf-lock-panel-seat", "puf-lock-sealant", "puf-lock-isolation-strip"] },
  { id: "puflock-welds", label: "PUF lock welds", kinds: ["puf-lock-weld"] },
];

const ALL_LAYERS: ColonyPartLayer[] = LAYERS.map((l) => l.id);

/** The kind-group ids the PUF-lock isolate actions switch between. */
const PUF_LOCK_GROUPS = [
  "puflock-plates", "puflock-bolts", "puflock-purlins", "puflock-panels", "puflock-welds",
] as const;
type PufLockGroupId = (typeof PUF_LOCK_GROUPS)[number];

/** "Show only this part of the locking system" shortcuts. */
const PUF_LOCK_ISOLATES: { id: PufLockGroupId; label: string }[] = [
  { id: "puflock-plates", label: "Plates only" },
  { id: "puflock-bolts", label: "Bolts only" },
  { id: "puflock-purlins", label: "C-purlins only" },
];

/** The connectionId prefix every PUF locking assembly carries ("pufl:<mark>"). */
const PUF_LOCK_CONN_PREFIX = "pufl:";

export function Colony3D({ model, selectedId, onSelect }: Colony3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<null | (() => string | null)>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [preset, setPreset] = useState<{ view: CameraPreset; nonce: number }>({ view: "iso", nonce: 0 });

  const [viewMode, setViewMode] = useState<ViewMode>("engineering");
  const [renderMode, setRenderMode] = useState<RenderMode>("solid");
  const [explode, setExplode] = useState(0);
  const [showConnectionDetail, setShowConnectionDetail] = useState(false);
  const [showPartMarks, setShowPartMarks] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [hd, setHd] = useState(false);

  const [sectionEnabled, setSectionEnabled] = useState(false);
  const [sectionAxis, setSectionAxis] = useState<SectionAxis>("z");
  const [sectionPos, setSectionPos] = useState(0.5);

  // Off-state sets. Layers/kinds/floors start all visible.
  const [hiddenLayers, setHiddenLayers] = useState<Set<ColonyPartLayer>>(() => new Set());
  const [offGroups, setOffGroups] = useState<Set<string>>(() => new Set());
  const [hiddenFloors, setHiddenFloors] = useState<Set<number>>(() => new Set());
  /** When set, only the parts of this connection group are drawn. null = normal visibility. */
  const [isolateConnectionId, setIsolateConnectionId] = useState<string | null>(null);

  const hiddenKinds = useMemo(() => {
    const s = new Set<ColonyPartKind>();
    for (const g of KIND_GROUPS) if (offGroups.has(g.id)) for (const k of g.kinds) s.add(k);
    return s;
  }, [offGroups]);

  /** The storeys actually present in this model, in build order (-1 = foundation, 0 = ground, …). */
  const floors = useMemo(() => {
    const set = new Set<number>();
    for (const p of model.parts) if (p.floor != null) set.add(p.floor);
    return [...set].sort((a, b) => a - b);
  }, [model]);
  const floorLabel = (f: number) =>
    f === -1 ? "Foundation" : f === 0 ? "Ground floor" : f === 1 ? "First floor" : `Floor ${f}`;

  const settings: ColonyView3DSettings = useMemo(() => ({
    hiddenLayers, hiddenKinds, hiddenFloors, viewMode, renderMode, explode, showConnectionDetail,
    section: { enabled: sectionEnabled, axis: sectionAxis, position: sectionPos },
    showPartMarks, hd, isolateConnectionId,
  }), [hiddenLayers, hiddenKinds, hiddenFloors, viewMode, renderMode, explode, showConnectionDetail, sectionEnabled, sectionAxis, sectionPos, showPartMarks, hd, isolateConnectionId]);

  const toggleLayer = (id: ColonyPartLayer) => setHiddenLayers((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const toggleGroup = (id: string) => setOffGroups((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const toggleFloor = (f: number) => setHiddenFloors((prev) => {
    const n = new Set(prev);
    if (n.has(f)) n.delete(f); else n.add(f);
    return n;
  });
  /** Show ONLY this storey — the "ground-floor-only" / "first-floor-only" engineering views. */
  const isolateFloor = (f: number) => setHiddenFloors(new Set(floors.filter((x) => x !== f)));

  /**
   * Show ONLY one part of the locking system — plates, bolts or C-purlins. Switches the other
   * puf-lock kind-groups OFF through the SAME offGroups state the normal toggles use and leaves the
   * rest of the model exactly as the user left it.
   */
  const isolatePufLockGroup = (keep: PufLockGroupId) => setOffGroups((prev) => {
    const n = new Set(prev);
    for (const id of PUF_LOCK_GROUPS) {
      if (id === keep) n.delete(id); else n.add(id);
    }
    return n;
  });

  /** Undo every puf-lock isolation: all kind-groups back on, the layer visible, assembly released. */
  const showAllPufLock = () => {
    setOffGroups((prev) => {
      if (!PUF_LOCK_GROUPS.some((id) => prev.has(id))) return prev;
      const n = new Set(prev);
      for (const id of PUF_LOCK_GROUPS) n.delete(id);
      return n;
    });
    setHiddenLayers((prev) => {
      if (!prev.has("puf-lock")) return prev;
      const n = new Set(prev);
      n.delete("puf-lock");
      return n;
    });
    setIsolateConnectionId(null);
  };

  const resetView = useCallback(() => {
    setPreset((p) => ({ view: "iso", nonce: p.nonce + 1 }));
    setViewMode("engineering"); setRenderMode("solid"); setExplode(0);
    setShowConnectionDetail(false); setShowPartMarks(false); setMeasureMode(false);
    setSectionEnabled(false); setSectionAxis("z"); setSectionPos(0.5);
    setHiddenLayers(new Set()); setOffGroups(new Set()); setHiddenFloors(new Set());
    setIsolateConnectionId(null);
    onSelect(null);
  }, [onSelect]);

  const goFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };

  const saveImage = () => {
    const url = captureRef.current?.();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${model.meta.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-3d.png`;
    a.click();
  };

  const selectedPart = selectedId ? model.parts.find((p) => p.id === selectedId) ?? null : null;

  /* ---- PUF panel bottom locking system ------------------------------------------------------- */

  /**
   * The resolved locking system the model was BUILT from — never recomputed here. Absent / disabled
   * ⇒ the whole PUF-lock control row and its readout stay off the screen.
   */
  const pufTakeoff = model.pufLock?.takeoff ?? null;
  const pufEnabled = !!pufTakeoff?.enabled;
  const pufReadout = pufTakeoff && pufEnabled
    ? `${pufTakeoff.plates} PUF lock assembl${pufTakeoff.plates === 1 ? "y" : "ies"} — pocket ${pufTakeoff.pocketClearGapMm} mm for ${pufTakeoff.panelThicknessMm} mm panel`
    : null;

  /** The locking assembly the selected part belongs to, e.g. "pufl:P07" — null for anything else. */
  const selectedPufAssembly = selectedPart?.connectionId?.startsWith(PUF_LOCK_CONN_PREFIX)
    ? selectedPart.connectionId
    : null;
  const isolateTarget = isolateConnectionId ?? selectedPufAssembly;
  const isolateMark = isolateTarget?.slice(PUF_LOCK_CONN_PREFIX.length) ?? "";

  return (
    <div className="space-y-3">
      {/* top bar: view presets + image / reset / fullscreen */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset((cur) => ({ view: p.id, nonce: cur.nonce + 1 }))}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={saveImage} className="gap-1.5">
            <Camera className="h-3.5 w-3.5" /> Save image
          </Button>
          <Button variant="outline" size="sm" onClick={resetView} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button variant="outline" size="sm" onClick={goFullscreen} className="gap-1.5">
            <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
          </Button>
        </div>
      </div>

      {/* render mode + view mode + display toggles */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
          {RENDER_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setRenderMode(m.id)}
              className={cn("rounded px-2 py-1 font-medium", renderMode === m.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
          {(["engineering", "customer"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={cn("rounded px-2 py-1 font-medium capitalize", viewMode === m ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {m}
            </button>
          ))}
        </div>

        {([
          { on: showConnectionDetail, set: setShowConnectionDetail, icon: Sparkles, label: "Connection detail" },
          { on: showPartMarks, set: setShowPartMarks, icon: Tag, label: "Part marks" },
          { on: measureMode, set: setMeasureMode, icon: Move3d, label: "Measure" },
          { on: sectionEnabled, set: setSectionEnabled, icon: Scissors, label: "Section cut" },
          { on: hd, set: setHd, icon: Sparkles, label: "HD" },
        ] as const).map((t) => (
          <button
            key={t.label}
            onClick={() => t.set((v: boolean) => !v)}
            className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
              t.on ? "border-accent/40 bg-accent/10 text-foreground" : "border-border text-muted-foreground")}
          >
            <t.icon className="h-3 w-3" /> {t.label}
          </button>
        ))}
      </div>

      {/* explode + section-cut sliders */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 text-xs text-muted-foreground">
          <Box className="h-3.5 w-3.5 shrink-0" /> Explode
          <input type="range" min={0} max={1} step={0.01} value={explode}
            onChange={(e) => setExplode(parseFloat(e.target.value))} className="flex-1 accent-amber-500" aria-label="Explode" />
          <span className="w-8 shrink-0 tabular-nums">{Math.round(explode * 100)}%</span>
        </label>

        {sectionEnabled && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Scissors className="h-3.5 w-3.5" />
            <div className="inline-flex rounded-md border border-border p-0.5">
              {(["x", "y", "z"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setSectionAxis(a)}
                  className={cn("rounded px-1.5 py-0.5 font-medium uppercase", sectionAxis === a ? "bg-accent text-accent-foreground" : "hover:bg-muted")}
                >
                  {a === "x" ? "Length" : a === "y" ? "Height" : "Width"}
                </button>
              ))}
            </div>
            <input type="range" min={0} max={1} step={0.01} value={sectionPos}
              onChange={(e) => setSectionPos(parseFloat(e.target.value))} className="accent-amber-500" style={{ width: 120 }} aria-label="Section position" />
          </div>
        )}

        {measureMode && <span className="text-xs text-red-600">Click two components to measure</span>}
      </div>

      {/* layer toggles */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Layers className="h-3.5 w-3.5" /> Layers</span>
        {LAYERS.map((l) => {
          const on = !hiddenLayers.has(l.id);
          return (
            <button
              key={l.id}
              onClick={() => toggleLayer(l.id)}
              className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
                on ? "border-accent/40 bg-accent/10 text-foreground" : "border-border text-muted-foreground")}
            >
              {on ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} {l.label}
            </button>
          );
        })}
      </div>

      {/* storey toggles — click to hide/show, "only" to isolate a single storey (GF-only / FF-only) */}
      {floors.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Layers className="h-3.5 w-3.5" /> Storey</span>
          {floors.map((f) => {
            const on = !hiddenFloors.has(f);
            return (
              <span key={f} className="inline-flex overflow-hidden rounded-md border border-border">
                <button
                  onClick={() => toggleFloor(f)}
                  className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs font-medium",
                    on ? "bg-accent/10 text-foreground" : "text-muted-foreground")}
                >
                  {on ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} {floorLabel(f)}
                </button>
                <button
                  onClick={() => isolateFloor(f)}
                  title={`Show only ${floorLabel(f)}`}
                  className="border-l border-border px-1.5 py-1 text-[10px] font-semibold uppercase text-muted-foreground hover:bg-muted"
                >
                  only
                </button>
              </span>
            );
          })}
          {hiddenFloors.size > 0 && (
            <button onClick={() => setHiddenFloors(new Set())} className="px-1.5 py-1 text-xs font-medium text-accent hover:underline">
              All storeys
            </button>
          )}
        </div>
      )}

      {/* kind-group toggles */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Grid3x3 className="h-3.5 w-3.5" /> Members</span>
        {KIND_GROUPS.map((g) => {
          const on = !offGroups.has(g.id);
          return (
            <button
              key={g.id}
              onClick={() => toggleGroup(g.id)}
              className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
                on ? "border-accent/40 bg-accent/10 text-foreground" : "border-border text-muted-foreground")}
            >
              {on ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} {g.label}
            </button>
          );
        })}
      </div>

      {/* PUF locking system — isolate shortcuts + the take-off readout (only when it is enabled) */}
      {pufEnabled && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> PUF lock
          </span>

          {PUF_LOCK_ISOLATES.map((iso) => (
            <button
              key={iso.id}
              onClick={() => isolatePufLockGroup(iso.id)}
              title={`Show only the ${iso.label.replace(/ only$/, "").toLowerCase()} of the locking system`}
              className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {iso.label}
            </button>
          ))}

          {(selectedPufAssembly || isolateConnectionId) && (
            <button
              onClick={() => setIsolateConnectionId((cur) => (cur ? null : selectedPufAssembly))}
              title={isolateConnectionId
                ? "Show the rest of the model again"
                : `Show only locking assembly ${isolateMark}`}
              className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
                isolateConnectionId ? "border-accent/40 bg-accent/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground")}
            >
              <Crosshair className="h-3 w-3" />
              {isolateConnectionId ? `Isolated: ${isolateMark}` : `Isolate ${isolateMark}`}
            </button>
          )}

          <button
            onClick={showAllPufLock}
            className="px-1.5 py-1 text-xs font-medium text-accent hover:underline"
          >
            Show all PUF lock
          </button>

          {pufReadout && (
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">{pufReadout}</span>
          )}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        {/* canvas */}
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-xl border border-border bg-slate-100"
          style={{ height: "clamp(360px, 60vh, 640px)" }}
        >
          <Colony3DView
            model={model}
            settings={settings}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={onSelect}
            onHover={setHoveredId}
            preset={preset}
            measureMode={measureMode}
            onCaptureReady={(fn) => { captureRef.current = fn; }}
          />
          <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-white/80 px-2 py-1 text-xs font-medium text-slate-700 shadow-sm">
            {model.meta.title} · {model.meta.floors} floor{model.meta.floors === 1 ? "" : "s"} · {model.meta.roofType} roof · drag to rotate · scroll to zoom
          </div>
          {settings.hiddenLayers.size === ALL_LAYERS.length && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              All layers hidden
            </div>
          )}
        </div>

        {/* selected-part readout */}
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
          {selectedPart ? (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold leading-tight">{selectedPart.label}</div>
                  <div className="text-xs text-muted-foreground capitalize">{selectedPart.kind.replace(/-/g, " ")}</div>
                </div>
                <button onClick={() => onSelect(null)} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {selectedPart.partMark && (<><dt className="text-muted-foreground">Mark</dt><dd className="text-right font-medium">{selectedPart.partMark}</dd></>)}
                {selectedPart.grid && (<><dt className="text-muted-foreground">Grid</dt><dd className="text-right font-medium">{selectedPart.grid}</dd></>)}
                {typeof selectedPart.floor === "number" && (<><dt className="text-muted-foreground">Floor</dt><dd className="text-right font-medium">{selectedPart.floor === -1 ? "Foundation" : selectedPart.floor === 0 ? "Ground" : `Level ${selectedPart.floor}`}</dd></>)}
                {selectedPart.spec.sectionSize && (<><dt className="text-muted-foreground">Section</dt><dd className="text-right font-medium">{selectedPart.spec.sectionSize}</dd></>)}
                {selectedPart.spec.material && (<><dt className="text-muted-foreground">Material</dt><dd className="text-right font-medium">{selectedPart.spec.material}</dd></>)}
                {selectedPart.spec.grade && (<><dt className="text-muted-foreground">Grade</dt><dd className="text-right font-medium">{selectedPart.spec.grade}</dd></>)}
                {typeof selectedPart.spec.lengthM === "number" && (<><dt className="text-muted-foreground">Length</dt><dd className="text-right font-medium">{selectedPart.spec.lengthM.toFixed(2)} m</dd></>)}
                {typeof selectedPart.spec.totalWeightKg === "number" && (<><dt className="text-muted-foreground">Weight</dt><dd className="text-right font-medium">{selectedPart.spec.totalWeightKg.toFixed(1)} kg</dd></>)}
                {selectedPart.fabrication && (<><dt className="text-muted-foreground">Fabrication</dt><dd className="text-right font-medium capitalize">{selectedPart.fabrication}</dd></>)}
              </dl>
              {selectedPart.spec.note && <p className="text-xs text-muted-foreground">{selectedPart.spec.note}</p>}
            </div>
          ) : (
            <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-1 text-center text-xs text-muted-foreground">
              <Ruler className="h-5 w-5 opacity-50" />
              <span>Click any component to inspect its fabrication data.</span>
              {model.warnings.length > 0 && (
                <span className="mt-2 rounded bg-amber-100 px-2 py-0.5 text-amber-700">{model.warnings.length} engineering warning{model.warnings.length === 1 ? "" : "s"}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
