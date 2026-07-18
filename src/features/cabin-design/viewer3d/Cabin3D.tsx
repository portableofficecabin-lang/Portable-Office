"use client";

/**
 * INTERACTIVE 3D + EXPLODED ASSEMBLY (spec §2 + §3).
 *
 * One island with two features, switched by a segmented control:
 *   • "3D Model"  — orbit/pan/zoom, six standard views + isometric, per-layer visibility toggles,
 *                   transparent-wall mode, fullscreen, reset, click-to-inspect.
 *   • "Exploded"  — the same scene with the assembly animation (play/pause/prev/next/replay/speed/
 *                   progress + live component-name & step description) and an explode slider.
 *
 * The scene (Cabin3DView) is the only WebGL surface; everything else is plain DOM UI, so ordinary
 * Tailwind colours are fine here. Mounted only behind the admin lazy loader — never on a public page.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Camera, Eye, EyeOff, Ghost, Grid3x3, Maximize2, Move3d, Pause, Play, Repeat, RotateCcw,
  Ruler, Scissors, SkipBack, SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CabinModel, CabinPart, PartLayer, ViewMode } from "@/features/cabin-design/model/types";
import { ASSEMBLY_SEQUENCE } from "@/features/cabin-design/model/assembly";
import { ComponentInspector, type InspectorBoq } from "@/features/cabin-design/inspector/ComponentInspector";
import { Cabin3DView, type CameraPreset, type View3DSettings } from "./Cabin3DView";

const PRESETS: { id: CameraPreset; label: string }[] = [
  { id: "front", label: "Front" }, { id: "rear", label: "Rear" },
  { id: "left", label: "Left" }, { id: "right", label: "Right" },
  { id: "top", label: "Top" }, { id: "iso", label: "Iso" },
];

const LAYERS: { id: PartLayer; label: string }[] = [
  { id: "structure", label: "Structure" }, { id: "walls", label: "Walls" },
  { id: "roof", label: "Roof" }, { id: "openings", label: "Doors/Windows" },
  { id: "electrical", label: "Electrical" }, { id: "plumbing", label: "Plumbing" },
  { id: "furniture", label: "Furniture" },
];

const ASSEMBLY_DURATION_MS = 9000; // full build sequence at 1× speed
const SPEEDS = [0.5, 1, 1.5, 2];

export interface Cabin3DProps {
  model: CabinModel;
  viewMode?: ViewMode;
  /** Maps a clicked part to its priced BOQ line (material/weight/rate/cost) for the inspector. */
  boqLookup?: (part: CabinPart) => InspectorBoq | null | undefined;
  selectedId?: string | null;
  onSelectPart?: (id: string | null) => void;
}

export function Cabin3D({ model, viewMode = "engineering", boqLookup, selectedId, onSelectPart }: Cabin3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<null | (() => string | null)>(null);

  const [feature, setFeature] = useState<"model" | "exploded">("model");
  const [layers, setLayers] = useState<Record<PartLayer, boolean>>({
    structure: true, walls: true, roof: true, openings: true, electrical: true, plumbing: true, furniture: true,
  });
  const [transparentWalls, setTransparentWalls] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [xray, setXray] = useState(false);
  const [sectionEnabled, setSectionEnabled] = useState(false);
  const [sectionPos, setSectionPos] = useState(0.5);
  const [showDimensions, setShowDimensions] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [preset, setPreset] = useState<{ view: CameraPreset; nonce: number }>({ view: "iso", nonce: 0 });

  // exploded state — one "progress" drives the staggered build; explodeAmount drives the static pull-apart
  const [explodeMode, setExplodeMode] = useState<"assembly" | "explode">("assembly");
  const [progress, setProgress] = useState(0);
  const [explodeAmount, setExplodeAmount] = useState(0.6);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const [innerSelected, setInnerSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const selected = selectedId !== undefined ? selectedId : innerSelected;

  const select = useCallback((id: string | null) => {
    if (selectedId === undefined) setInnerSelected(id);
    onSelectPart?.(id);
  }, [selectedId, onSelectPart]);

  /* ---- assembly play loop (single rAF stepping `progress`) ---- */
  useEffect(() => {
    if (!(feature === "exploded" && explodeMode === "assembly" && playing)) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last; last = now;
      setProgress((p) => {
        const np = p + dt / (ASSEMBLY_DURATION_MS / speed);
        if (np >= 1) { setPlaying(false); return 1; }
        return np;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [feature, explodeMode, playing, speed]);

  /* ---- derive revealStep + separation from the single driver ---- */
  const derived = useMemo(() => {
    if (feature !== "exploded") return { revealStep: 17, stepT: 0, active: false };
    if (explodeMode === "explode") return { revealStep: 17, stepT: explodeAmount, active: true };
    const p = Math.min(1, Math.max(0, progress));
    if (p >= 1) return { revealStep: 17, stepT: 0, active: true };
    const revealStep = Math.min(16, Math.floor(p * 16) + 1);
    const local = p * 16 - (revealStep - 1);
    return { revealStep, stepT: 1 - local, active: true };
  }, [feature, explodeMode, progress, explodeAmount]);

  const settings: View3DSettings = useMemo(() => ({
    layers, transparentWalls, viewMode, wireframe, xray,
    section: { enabled: sectionEnabled, position: sectionPos },
    showDimensions,
    assembly: { active: derived.active, mode: explodeMode, revealStep: derived.revealStep, stepT: derived.stepT },
  }), [layers, transparentWalls, viewMode, wireframe, xray, sectionEnabled, sectionPos, showDimensions, derived, explodeMode]);

  const currentStep = ASSEMBLY_SEQUENCE.find((s) => s.step === derived.revealStep) ?? ASSEMBLY_SEQUENCE[ASSEMBLY_SEQUENCE.length - 1];
  const selectedPart = selected ? model.parts.find((p) => p.id === selected) ?? null : null;

  /* ---- controls ---- */
  const toggleLayer = (id: PartLayer) => setLayers((l) => ({ ...l, [id]: !l[id] }));
  const resetView = () => {
    setPreset((p) => ({ view: "iso", nonce: p.nonce + 1 }));
    setTransparentWalls(false);
    setWireframe(false); setXray(false); setSectionEnabled(false); setSectionPos(0.5);
    setShowDimensions(false); setMeasureMode(false);
    setLayers({ structure: true, walls: true, roof: true, openings: true, electrical: true, plumbing: true, furniture: true });
  };
  const goFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };
  const play = () => { if (progress >= 1) setProgress(0); setPlaying(true); };
  const pause = () => setPlaying(false);
  const stepBy = (d: number) => {
    setPlaying(false);
    const cur = Math.round(Math.min(1, progress) * 16);
    setProgress(Math.min(16, Math.max(0, cur + d)) / 16);
  };
  const replay = () => { setProgress(0); setPlaying(true); };
  const saveImage = () => {
    const url = captureRef.current?.();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${model.meta.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-3d.png`;
    a.click();
  };

  return (
    <div className="space-y-3">
      {/* feature switch */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {(["model", "exploded"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFeature(f); if (f === "exploded") setPreset((p) => ({ view: "iso", nonce: p.nonce + 1 })); }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                feature === f ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "model" ? "3D Model" : "Exploded Assembly"}
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

      {/* view presets + visibility toggles */}
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
        <span className="mx-1 h-4 w-px bg-border" />
        {LAYERS.map((l) => (
          <button
            key={l.id}
            onClick={() => toggleLayer(l.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
              layers[l.id] ? "border-accent/40 bg-accent/10 text-foreground" : "border-border text-muted-foreground",
            )}
          >
            {layers[l.id] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />} {l.label}
          </button>
        ))}
        <button
          onClick={() => setTransparentWalls((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
            transparentWalls ? "border-accent/40 bg-accent/10 text-foreground" : "border-border text-muted-foreground",
          )}
        >
          <Box className="h-3 w-3" /> Transparent walls
        </button>
      </div>

      {/* display modes */}
      <div className="flex flex-wrap items-center gap-1.5">
        {([
          { on: wireframe, set: setWireframe, icon: Grid3x3, label: "Wireframe" },
          { on: xray, set: setXray, icon: Ghost, label: "X-ray" },
          { on: showDimensions, set: setShowDimensions, icon: Ruler, label: "Dimensions" },
          { on: measureMode, set: setMeasureMode, icon: Move3d, label: "Measure" },
          { on: sectionEnabled, set: setSectionEnabled, icon: Scissors, label: "Section cut" },
        ] as const).map((m) => (
          <button key={m.label} onClick={() => m.set((v: boolean) => !v)}
            className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
              m.on ? "border-accent/40 bg-accent/10 text-foreground" : "border-border text-muted-foreground")}>
            <m.icon className="h-3 w-3" /> {m.label}
          </button>
        ))}
        {sectionEnabled && (
          <label className="ml-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            Cut
            <input type="range" min={0} max={1} step={0.01} value={sectionPos}
              onChange={(e) => setSectionPos(parseFloat(e.target.value))} className="accent-amber-500" style={{ width: 120 }} />
          </label>
        )}
        {measureMode && <span className="text-xs text-red-600">Click two components to measure</span>}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
        {/* canvas */}
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-xl border border-border bg-slate-100"
          style={{ height: "clamp(360px, 60vh, 640px)" }}
        >
          <Cabin3DView
            model={model} settings={settings}
            selectedId={selected} hoveredId={hovered}
            onSelect={select} onHover={setHovered} preset={preset}
            onCaptureReady={(fn) => { captureRef.current = fn; }}
            measureMode={measureMode}
          />
          <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-white/80 px-2 py-1 text-xs font-medium text-slate-700 shadow-sm">
            {model.meta.title} · {model.meta.roofType} roof · drag to rotate · scroll to zoom
          </div>
        </div>

        {/* inspector */}
        <div className="space-y-3">
          <ComponentInspector part={selectedPart} boq={selectedPart ? boqLookup?.(selectedPart) : null} onClose={() => select(null)} />
        </div>
      </div>

      {/* exploded controls */}
      {feature === "exploded" && (
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
              {(["assembly", "explode"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setExplodeMode(m); setPlaying(false); }}
                  className={cn("rounded px-2 py-1 font-medium", explodeMode === m ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
                >
                  {m === "assembly" ? "Build sequence" : "Pull apart"}
                </button>
              ))}
            </div>

            {explodeMode === "assembly" ? (
              <>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => stepBy(-1)} aria-label="Previous step"><SkipBack className="h-4 w-4" /></Button>
                  {playing
                    ? <Button size="icon" className="h-8 w-8" onClick={pause} aria-label="Pause"><Pause className="h-4 w-4" /></Button>
                    : <Button size="icon" className="h-8 w-8" onClick={play} aria-label="Play"><Play className="h-4 w-4" /></Button>}
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => stepBy(1)} aria-label="Next step"><SkipForward className="h-4 w-4" /></Button>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={replay} aria-label="Replay"><Repeat className="h-4 w-4" /></Button>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Speed</span>
                  {SPEEDS.map((s) => (
                    <button key={s} onClick={() => setSpeed(s)} className={cn("rounded px-1.5 py-0.5", speed === s ? "bg-accent text-accent-foreground" : "hover:bg-muted")}>{s}×</button>
                  ))}
                </div>
              </>
            ) : (
              <label className="flex flex-1 items-center gap-2 text-xs text-muted-foreground">
                Separation
                <input type="range" min={0} max={1} step={0.01} value={explodeAmount}
                  onChange={(e) => setExplodeAmount(parseFloat(e.target.value))} className="flex-1 accent-amber-500" />
              </label>
            )}
          </div>

          {explodeMode === "assembly" && (
            <>
              <input
                type="range" min={0} max={1} step={0.001} value={Math.min(1, progress)}
                onChange={(e) => { setPlaying(false); setProgress(parseFloat(e.target.value)); }}
                className="w-full accent-amber-500"
                aria-label="Assembly progress"
              />
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <div>
                  <span className="text-sm font-semibold">Step {derived.revealStep} / 17 — {currentStep.title}</span>
                  <p className="text-xs text-muted-foreground">{currentStep.description}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{Math.round(Math.min(1, progress) * 100)}%</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
