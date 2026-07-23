"use client";

/**
 * LABOUR COLONY ASSEMBLY ANIMATION — the tab surface (the whole "Assembly Video" experience).
 *
 * Owns all playback, presentation, label and export state, and wires together the deterministic
 * timeline (built from the shared ColonyModel), the R3F scene, the caption overlay, the controls, the
 * erection-step list and the exporter.
 *
 * Nothing here rebuilds geometry and nothing here recomputes a price or a quantity: the timeline is
 * built from the model alone (whose `spec` values were already resolved from the two priced take-offs),
 * so a Material Master rate change cannot alter the animation. The optional live `boqResult` is used
 * ONLY to report how many of the steps' BOQ references currently resolve against the priced Material
 * BOQ — a read-only cross-check, never an input to the timeline.
 *
 * Mounted only behind the lazy island (AssemblyVideoLoader → dynamic ssr:false), so three.js never
 * reaches a server bundle or a public route.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Film, Loader2, ScanSearch, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ColonyModel, ViewMode } from "@/features/labour-colony-studio/model/types";
import { ASSEMBLY_SEQUENCE } from "@/features/labour-colony-studio/model/assembly";
import {
  assemblyCallout, pufLockMethodSteps, PUF_LOCK_EXPLANATION,
  type PufLockDerived,
} from "@/features/labour-colony-studio/model/pufLock";
import {
  rafterSupportAssemblyCallout, rafterSupportMethodSteps, RAFTER_SUPPORT_APPROVAL_DISCLAIMER,
  RAFTER_SUPPORT_EXPLANATION, type RafterSupportDerived,
} from "@/features/labour-colony-studio/model/rafterSupport";
import { rafterSupportOf } from "./assemblyDetailTour";
import type { BoqResult } from "@/lib/boq/types";
import { AssemblyScene, type AssemblyExportController } from "./AssemblyScene";
import { AssemblyOverlay } from "./AssemblyOverlay";
import { AssemblyControls } from "./AssemblyControls";
import { AssemblyStepList } from "./AssemblyStepList";
import { useAssemblyPlayer } from "./useAssemblyPlayer";
import { buildAssemblyTimeline, DEFAULT_ASSEMBLY_OPTIONS } from "./buildAssemblyTimeline";
import { sampleCaption } from "./assemblyMotion";
import { overlayExtrasFor, DEFAULT_LABEL_OPTIONS, type OverlayLabelOptions } from "./assemblyOverlayDraw";
import { validateAssemblyTimeline, estimateExport } from "./validateAssemblyTimeline";
import { runAssemblyExport, downloadExport, isWebMSupported, MP4_AVAILABLE } from "./exportAssemblyVideo";
import type {
  AssemblyOptions, DetailTourSummary, ExportProgress, ExportResult, ExportSettings,
} from "./assemblyTypes";

export interface AssemblyVideoViewProps {
  model: ColonyModel;
  /** Live Material BOQ — read-only cross-check of the steps' BOQ references. Never an animation input. */
  boqResult?: BoqResult | null;
  viewMode?: ViewMode;
  projectName?: string;
  customerName?: string;
  companyName?: string;
  selectedId?: string | null;
  onSelectPart?: (id: string | null) => void;
}

const RESOLUTION_PRESETS: { id: string; label: string; w: number; h: number }[] = [
  { id: "preview", label: "Preview 1280×720", w: 1280, h: 720 },
  { id: "fhd", label: "Full HD 1920×1080", w: 1920, h: 1080 },
  { id: "square", label: "Square 1080×1080", w: 1080, h: 1080 },
  { id: "portrait", label: "Portrait 1080×1920", w: 1080, h: 1920 },
  { id: "custom", label: "Custom…", w: 1280, h: 720 },
];
const FPS_OPTIONS = [24, 30, 60];

export function AssemblyVideoView(props: AssemblyVideoViewProps) {
  const { model, boqResult, onSelectPart } = props;

  const [options, setOptions] = useState<AssemblyOptions>(() => ({
    ...DEFAULT_ASSEMBLY_OPTIONS,
    mode: props.viewMode ?? "customer",
    projectName: props.projectName || model.meta.projectName || model.meta.title,
    customerName: props.customerName,
    companyName: props.companyName || DEFAULT_ASSEMBLY_OPTIONS.companyName,
  }));
  const [labels, setLabels] = useState<OverlayLabelOptions>(DEFAULT_LABEL_OPTIONS);
  const [quality, setQuality] = useState<"low" | "high">("high");

  // The timeline depends ONLY on the geometry (model) and the presentation options — never on the
  // live BOQ — which is exactly what makes it deterministic.
  const timeline = useMemo(() => buildAssemblyTimeline(model, options), [model, options]);
  const validation = useMemo(() => validateAssemblyTimeline(timeline, model), [timeline, model]);

  const player = useAssemblyPlayer(timeline);

  // reset the playhead when the geometry changes (the studio memoises `model`, so a new reference is
  // exactly a real geometry change)
  const prevModel = useRef(model);
  useEffect(() => {
    if (prevModel.current !== model) { prevModel.current = model; player.seekTo(0); }
  }, [model, player]);

  /* ---- read-only BOQ cross-check (counts only — never a price calculation) ---- */
  const boqLink = useMemo(() => {
    const referenced = new Set<string>();
    for (const p of model.parts) if (p.boqSource === "steel" && p.boqLineId) referenced.add(p.boqLineId);
    if (!referenced.size) return null;
    const available = new Set((boqResult?.lines ?? []).map((l) => l.id));
    let matched = 0;
    referenced.forEach((id) => { if (available.has(id)) matched += 1; });
    return { referenced: referenced.size, matched };
  }, [model, boqResult]);

  const controllerRef = useRef<AssemblyExportController | null>(null);
  const onExportReady = useCallback((c: AssemblyExportController | null) => { controllerRef.current = c; }, []);
  const [sceneReady, setSceneReady] = useState(false);
  const onReady = useCallback(() => setSceneReady(true), []);
  const onSelect = useCallback((id: string | null) => onSelectPart?.(id), [onSelectPart]);

  // Fullscreen wraps the stage AND the controls so the transport stays reachable in fullscreen.
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const on = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const goFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void el.requestFullscreen?.();
  }, []);

  const onOption = useCallback((patch: Partial<AssemblyOptions>) => setOptions((o) => ({ ...o, ...patch })), []);
  const onLabel = useCallback((patch: Partial<OverlayLabelOptions>) => setLabels((l) => ({ ...l, ...patch })), []);

  /* ---- export state ---- */
  const [showExport, setShowExport] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [expFormat, setExpFormat] = useState<ExportSettings["format"]>(isWebMSupported() ? "webm" : "png-sequence");
  const [expPreset, setExpPreset] = useState("preview");
  const [expW, setExpW] = useState(1280);
  const [expH, setExpH] = useState(720);
  const [expFps, setExpFps] = useState(30);
  const [expQuality, setExpQuality] = useState<ExportSettings["quality"]>("high");
  const [expFrameChoice, setExpFrameChoice] = useState<"current" | "final">("final");

  const applyPreset = useCallback((id: string) => {
    setExpPreset(id);
    const p = RESOLUTION_PRESETS.find((x) => x.id === id);
    if (p && id !== "custom") { setExpW(p.w); setExpH(p.h); }
  }, []);

  const exportSettings: ExportSettings = useMemo(() => ({
    format: expFormat, width: expW, height: expH, fps: expFps, quality: expQuality,
    frameMs: expFormat === "png-frame" ? (expFrameChoice === "final" ? timeline.totalMs : player.timeMs) : undefined,
    keepCamera: expFormat === "png-frame" && expFrameChoice === "current",
  }), [expFormat, expW, expH, expFps, expQuality, expFrameChoice, timeline.totalMs, player.timeMs]);

  const estimate = useMemo(() => estimateExport(timeline, exportSettings), [timeline, exportSettings]);

  const runExport = useCallback(async () => {
    const controller = controllerRef.current;
    if (!controller) { setExportError("The 3D renderer is not ready yet — wait a moment and try again."); return; }
    if (estimate.heavy && !window.confirm(
      `This is a large export (~${estimate.totalFrames} frames at ${estimate.megapixels.toFixed(1)} MP). It may take a while and use significant memory. Continue?`,
    )) return;

    player.pause();
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true); setExportError(null); setExportResult(null);
    setProgress({ phase: "preparing", frame: 0, totalFrames: 0, percent: 0 });
    try {
      const res = await runAssemblyExport({
        controller, timeline, settings: exportSettings, labels, onProgress: setProgress, signal: ac.signal,
      });
      setExportResult(res);
      downloadExport(res);
    } catch (e) {
      const err = e as { name?: string; message?: string };
      setExportError(err?.name === "AbortError"
        ? "Export cancelled — the viewer has been restored."
        : (err?.message || "Export failed."));
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [estimate, player, timeline, exportSettings, labels]);

  const cancelExport = useCallback(() => abortRef.current?.abort(), []);

  // cancel a running export if the component unmounts (tab switch / navigation)
  useEffect(() => () => abortRef.current?.abort(), []);

  /* ---- keyboard shortcuts (bound to the STABLE player methods, not the whole player object, which is
   *      re-memoised on every ~20 fps read-out tick) ---- */
  const { toggle, nextStep, prevStep, restart } = player;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable)) return;
      if (running && e.key !== "Escape") return;
      switch (e.key) {
        case " ": e.preventDefault(); toggle(); break;
        case "ArrowRight": e.preventDefault(); nextStep(); break;
        case "ArrowLeft": e.preventDefault(); prevStep(); break;
        case "r": case "R": restart(); break;
        case "f": case "F": goFullscreen(); break;
        case "Escape":
          if (running) cancelExport();
          else if (document.fullscreenElement) void document.exitFullscreen?.();
          else if (showExport) setShowExport(false);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, nextStep, prevStep, restart, goFullscreen, running, cancelExport, showExport]);

  const caption = useMemo(() => sampleCaption(timeline, player.timeMs), [timeline, player.timeMs]);
  const extras = useMemo(() => overlayExtrasFor(timeline, player.timeMs), [timeline, player.timeMs]);
  const webmSupported = isWebMSupported();

  /* ---- PUF panel bottom locking system — the erection method statement that accompanies the video.
   *      The 16 steps come straight from the engineering core (model.pufLock, the same bundle the
   *      geometry and the schedules were built from), so this panel can never narrate a quantity the
   *      animation does not show. Rendered only when the system is actually on this colony. ---- */
  const pufLock = model.pufLock;
  const showPufLock = !!pufLock?.config.enabled && pufLock.positions.length > 0;

  /* ---- RAFTER SUPPORT — the erection method statement + the detail-tour control.
   *      `rafterSupportOf` returns the resolved bundle only when the system is enabled AND cleats are
   *      placed, so a colony that does not build it renders neither the panel nor the control and the
   *      timeline is the one it produced before this feature existed. ---- */
  const rafterSupport = useMemo(() => rafterSupportOf(model), [model]);
  const tour = timeline.detailTour;

  /* ---- how many of the canonical construction steps this design uses, and in how many shots ---- */
  const stageCount = useMemo(
    () => new Set(timeline.steps.map((s) => s.assemblyStep)).size,
    [timeline.steps],
  );

  if (validation.errors.length) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4" /> The assembly animation can’t be generated for this design.
        </div>
        <ul className="list-inside list-disc space-y-0.5 text-xs">
          {validation.errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-accent" />
          <div>
            <div className="text-sm font-bold leading-tight">Assembly animation — {model.meta.title}</div>
            <div className="text-xs text-muted-foreground">
              {stageCount} of {ASSEMBLY_SEQUENCE.length} erection steps
              {timeline.steps.length !== stageCount ? ` in ${timeline.steps.length} shots` : ""} ·{" "}
              {(timeline.totalMs / 60000).toFixed(1)} min · {timeline.dimensionsLine} · generated from the live model · {options.mode} mode
              {boqLink ? ` · ${boqLink.matched}/${boqLink.referenced} BOQ refs resolved` : ""}
            </div>
          </div>
        </div>
      </div>

      {validation.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span className="font-semibold">Note:</span> {validation.warnings.slice(0, 3).join(" ")}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        {/* stage + controls (the fullscreen target, so the transport stays reachable in fullscreen) */}
        <div ref={containerRef} className={cn("space-y-2", isFs && "overflow-auto bg-background p-3")}>
          <div
            className="relative overflow-hidden rounded-xl border border-border bg-slate-100"
            style={{ height: isFs ? "78vh" : "clamp(360px, 58vh, 640px)" }}
          >
            <AssemblyScene
              model={model} timeline={timeline}
              playing={player.playing} speed={player.speed} loop={player.loop}
              autoCamera={options.autoCamera} mode={options.mode} background={options.background}
              quality={quality} selectedId={props.selectedId ?? null} seek={player.seek}
              onTick={player.reportTick} onSelect={onSelect} onExportReady={onExportReady} onReady={onReady}
            />
            {options.showLabels && <AssemblyOverlay caption={caption} extras={extras} labels={labels} />}
            {!sceneReady && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-100/70 text-sm text-slate-600">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing the 3D scene…
              </div>
            )}
            {running && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/55 text-white">
                <div className="text-sm font-semibold">Exporting… {progress?.percent ?? 0}%</div>
                <div className="text-xs opacity-90">
                  {progress ? `Frame ${progress.frame} / ${progress.totalFrames || "?"}` : ""} {progress?.message ?? ""}
                </div>
                <div className="mt-1 h-1.5 w-56 overflow-hidden rounded bg-white/25">
                  <div className="h-full bg-orange-400" style={{ width: `${progress?.percent ?? 0}%` }} />
                </div>
                <Button size="sm" variant="secondary" className="mt-2 gap-1.5" onClick={cancelExport}>
                  <X className="h-3.5 w-3.5" /> Cancel export
                </Button>
              </div>
            )}
          </div>

          <AssemblyControls
            player={player} totalMs={timeline.totalMs} options={options} onOption={onOption}
            labels={labels} onLabel={onLabel}
            quality={quality} onQuality={setQuality} onFullscreen={goFullscreen}
            onExport={() => setShowExport((v) => !v)} exporting={running}
          />

          {showExport && (
            <ExportPanel
              settings={exportSettings} preset={expPreset} onPreset={applyPreset}
              w={expW} h={expH} onW={setExpW} onH={setExpH}
              fps={expFps} onFps={setExpFps} quality={expQuality} onQuality={setExpQuality}
              format={expFormat} onFormat={setExpFormat}
              frameChoice={expFrameChoice} onFrameChoice={setExpFrameChoice}
              background={options.background}
              estimate={estimate} webmSupported={webmSupported}
              running={running} error={exportError} result={exportResult}
              onRun={runExport} onCancel={cancelExport}
              onDownloadAgain={() => exportResult && downloadExport(exportResult)}
              onClose={() => setShowExport(false)}
            />
          )}

          {(tour.assemblies > 0 || rafterSupport) && (
            <DetailTourControls
              tour={tour} options={options} onOption={onOption} totalMs={timeline.totalMs}
            />
          )}

          {showPufLock && pufLock && <PufLockMethodPanel lock={pufLock} />}

          {rafterSupport && <RafterSupportMethodPanel support={rafterSupport} tour={tour} />}
        </div>

        {/* erection step list */}
        <AssemblyStepList
          timeline={timeline} activeIndex={player.stepIndex} onJump={player.jumpToStep}
          engineering={options.mode === "engineering"}
        />
      </div>
    </div>
  );
}

export default AssemblyVideoView;

/* ----------------------------------------------------------------- PUF lock method statement --- */

/**
 * The PUF panel bottom locking system's 16-step erection method statement, shown ALONGSIDE the
 * animation (the locking system itself erects inside the canonical 24-step sequence: the plate,
 * anchors and welded C-purlin pair at step 5, the panel dropping into the finished pocket at step 20).
 *
 * Every line is read from `pufLockMethodSteps(model.pufLock)` — the same resolved bundle the geometry,
 * the detail sheets and the fabrication schedules were built from — so nothing here can state a
 * quantity, a pocket width or a weld length that disagrees with the model. Collapsed by default so it
 * never pushes the player or the controls off screen; it sits outside the captured stage, so it can
 * never appear in an export.
 */
function PufLockMethodPanel({ lock }: { lock: PufLockDerived }) {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => pufLockMethodSteps(lock), [lock]);
  const callout = useMemo(() => assemblyCallout(lock.config), [lock.config]);
  const t = lock.takeoff;

  return (
    <div className="rounded-xl border border-border bg-background text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <Wrench className="h-4 w-4 shrink-0 text-accent" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-tight">
            PUF panel bottom locking — erection method statement
          </span>
          <span className="block text-xs text-muted-foreground">
            {steps.length} steps · {t.plates} assembl{t.plates === 1 ? "y" : "ies"} ·{" "}
            {t.pocketClearGapMm} mm pocket for a {t.panelThicknessMm} mm panel · erects at sequence steps 5 and 20
          </span>
        </span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-border/60 px-3 py-2.5">
          <div className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs">
            <div className="font-medium text-foreground/80">{callout}</div>
            <div className="mt-0.5 text-muted-foreground">
              {t.purlinPieces} C-purlin pieces · {t.bolts} anchor bolts · {t.weldTotalLengthM.toFixed(2)} m of weld ·{" "}
              {t.sideGapMm} mm side gap
            </div>
          </div>

          <ol className="space-y-1.5">
            {steps.map((s) => (
              <li key={s.no} className="flex gap-2">
                <span className="mt-0.5 inline-flex h-5 min-w-[1.4rem] shrink-0 items-center justify-center rounded bg-muted px-1 text-xs font-bold tabular-nums text-muted-foreground">
                  {s.no}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold leading-snug">{s.title}</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">{s.detail}</span>
                </span>
              </li>
            ))}
          </ol>

          {lock.errors.length > 0 && (
            <div className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700">
              <span className="font-semibold">Locking system errors:</span>{" "}
              {lock.errors.slice(0, 3).map((e) => e.message).join(" ")}
            </div>
          )}
          {lock.errors.length === 0 && lock.warnings.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
              <span className="font-semibold">Note:</span>{" "}
              {lock.warnings.slice(0, 3).map((w) => w.message).join(" ")}
            </div>
          )}

          <p className="border-t border-border/60 pt-2 text-[11px] leading-relaxed text-muted-foreground">
            {PUF_LOCK_EXPLANATION}
          </p>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- detail tour controls -------- */

const DWELL_PRESETS: { ms: number; label: string }[] = [
  { ms: 1200, label: "Brisk — 1.2 s" },
  { ms: 2200, label: "Standard — 2.2 s" },
  { ms: 3500, label: "Detailed — 3.5 s" },
  { ms: 5000, label: "Very detailed — 5.0 s" },
];
const BUDGET_PRESETS: { ms: number; label: string }[] = [
  { ms: 180_000, label: "3 min" },
  { ms: 300_000, label: "5 min" },
  { ms: 420_000, label: "7 min" },
  { ms: 600_000, label: "10 min" },
];
const LIMIT_PRESETS: { n: number; label: string }[] = [
  { n: 0, label: "Every assembly" },
  { n: 25, label: "First 25" },
  { n: 50, label: "First 50" },
  { n: 100, label: "First 100" },
];

/**
 * The admin's control over the per-assembly zoomed tour: whether to fly to every rafter connection,
 * how long to hold on each, and the runtime budget the shot length is divided out of.
 *
 * The readout states the resulting runtime BEFORE the user exports, because the trade-off this panel
 * exists for is exactly "more detail per connection ⇄ a longer film" — the user accepted 5–7 minutes,
 * and this is where that is chosen rather than discovered.
 */
function DetailTourControls({
  tour, options, onOption, totalMs,
}: {
  tour: DetailTourSummary;
  options: AssemblyOptions;
  onOption: (patch: Partial<AssemblyOptions>) => void;
  totalMs: number;
}) {
  const on = options.detailTour !== false;
  const mins = (ms: number): string => `${(ms / 60000).toFixed(1)} min`;

  return (
    <div className="rounded-xl border border-border bg-background p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <ScanSearch className="h-4 w-4 shrink-0 text-accent" />
        <span className="font-semibold">Rafter assembly detail tour</span>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox" checked={on}
            onChange={(e) => onOption({ detailTour: e.target.checked })}
            className="h-3.5 w-3.5 accent-orange-500"
          />
          Fly to every connection in close-up
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label className="text-xs text-muted-foreground">Hold on each assembly
          <select
            value={options.detailDwellMs} disabled={!on}
            onChange={(e) => onOption({ detailDwellMs: parseInt(e.target.value, 10) })}
            className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50"
          >
            {DWELL_PRESETS.map((d) => <option key={d.ms} value={d.ms}>{d.label}</option>)}
          </select>
        </label>

        <label className="text-xs text-muted-foreground">Tour runtime budget
          <select
            value={options.detailTourBudgetMs} disabled={!on}
            onChange={(e) => onOption({ detailTourBudgetMs: parseInt(e.target.value, 10) })}
            className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50"
          >
            {BUDGET_PRESETS.map((b) => <option key={b.ms} value={b.ms}>{b.label}</option>)}
          </select>
        </label>

        <label className="text-xs text-muted-foreground">Assemblies toured
          <select
            value={options.detailTourMaxAssemblies} disabled={!on}
            onChange={(e) => onOption({ detailTourMaxAssemblies: parseInt(e.target.value, 10) })}
            className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-50"
          >
            {LIMIT_PRESETS.map((l) => <option key={l.n} value={l.n}>{l.label}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        {tour.enabled ? (
          <>
            {tour.toured} of {tour.assemblies} assembl{tour.assemblies === 1 ? "y" : "ies"} shown individually ·{" "}
            {(tour.installMs / 1000).toFixed(1)} s build + {(tour.holdMs / 1000).toFixed(1)} s hold each ·{" "}
            tour {mins(tour.tourMs)} of {mins(totalMs)} total
          </>
        ) : tour.assemblies > 0 ? (
          <>Detail tour off — the {tour.assemblies} rafter assemblies are erected together in their construction step.</>
        ) : (
          <>This colony has no rafter-support assemblies to tour.</>
        )}
      </div>

      {tour.capped && (
        <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
          <span className="font-semibold">Partial tour:</span> {tour.toured} of {tour.assemblies} assemblies get their
          own shot; the remaining {tour.assemblies - tour.toured} are erected together in their construction step, and the
          caption says so. Raise the limit or the runtime budget to visit them all.
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- rafter support method ------- */

/**
 * The rafter support system's erection method statement, shown ALONGSIDE the animation — mirroring
 * PufLockMethodPanel exactly, including being rendered OUTSIDE the R3F <Canvas> (a DOM node inside
 * the canvas tree throws) and therefore never appearing in an export.
 *
 * Every line comes from `rafterSupportMethodSteps(model.rafterSupport)` — the same resolved bundle
 * the geometry, the detail sheets and the take-off were built from — so this panel can never narrate
 * a spacing, a count or a weight the animation does not show. Collapsed by default so it cannot push
 * the player or the transport off screen.
 */
function RafterSupportMethodPanel({ support, tour }: { support: RafterSupportDerived; tour: DetailTourSummary }) {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => rafterSupportMethodSteps(support), [support]);
  const callout = useMemo(() => rafterSupportAssemblyCallout(support.config), [support.config]);
  const t = support.takeoff;
  const c = support.config;

  return (
    <div className="rounded-xl border border-border bg-background text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <Wrench className="h-4 w-4 shrink-0 text-accent" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-tight">
            Rafter support &amp; MS tube — erection method statement
          </span>
          <span className="block text-xs text-muted-foreground">
            {steps.length} steps · {t.cleats} connection{t.cleats === 1 ? "" : "s"} · {c.purlin.designation} +{" "}
            {c.tube.designation} · erects at sequence steps 18 and 19
            {tour.enabled ? ` · ${tour.toured} shown in zoomed detail` : ""}
          </span>
        </span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-border/60 px-3 py-2.5">
          <div className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs">
            <div className="font-medium text-foreground/80">{callout}</div>
            <div className="mt-0.5 text-muted-foreground">
              {t.bolts} bolt{t.bolts === 1 ? "" : "s"} ({t.cleatBolts} at the cleats, {t.webBolts} through the web) ·{" "}
              {t.nuts} nuts · {t.washers} washers · {t.purlinRunningLengthM.toFixed(2)} m C-purlin ·{" "}
              {t.tubeRunningLengthM.toFixed(2)} m MS tube · {t.webLapMm} mm web lap ·{" "}
              {t.totalSteelKg.toFixed(1)} kg of steel
            </div>
            <div className="mt-0.5 text-muted-foreground">
              Covering: {t.ceilingSheets} ceiling board{t.ceilingSheets === 1 ? "" : "s"} (
              {c.ceilingSheet.sheetLengthMm} × {c.ceilingSheet.sheetWidthMm} mm) ·{" "}
              {t.roofPanels} roof panel{t.roofPanels === 1 ? "" : "s"} ({c.roofPanel.coverWidthMm} mm cover width)
            </div>
          </div>

          <ol className="space-y-1.5">
            {steps.map((s) => (
              <li key={s.no} className="flex gap-2">
                <span className="mt-0.5 inline-flex h-5 min-w-[1.4rem] shrink-0 items-center justify-center rounded bg-muted px-1 text-xs font-bold tabular-nums text-muted-foreground">
                  {s.no}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold leading-snug">{s.title}</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">{s.detail}</span>
                </span>
              </li>
            ))}
          </ol>

          {support.errors.length > 0 && (
            <div className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700">
              <span className="font-semibold">Rafter support errors:</span>{" "}
              {support.errors.slice(0, 3).map((e) => e.message).join(" ")}
            </div>
          )}
          {support.errors.length === 0 && support.warnings.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
              <span className="font-semibold">Note:</span>{" "}
              {support.warnings.slice(0, 3).map((w) => w.message).join(" ")}
            </div>
          )}

          <p className="border-t border-border/60 pt-2 text-[11px] leading-relaxed text-muted-foreground">
            {RAFTER_SUPPORT_EXPLANATION}
          </p>
          <p className="text-[11px] font-medium leading-relaxed text-amber-800">
            {RAFTER_SUPPORT_APPROVAL_DISCLAIMER}
          </p>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- export panel ---------------- */

interface ExportPanelProps {
  settings: ExportSettings;
  preset: string; onPreset: (id: string) => void;
  w: number; h: number; onW: (n: number) => void; onH: (n: number) => void;
  fps: number; onFps: (n: number) => void;
  quality: ExportSettings["quality"]; onQuality: (q: ExportSettings["quality"]) => void;
  format: ExportSettings["format"]; onFormat: (f: ExportSettings["format"]) => void;
  frameChoice: "current" | "final"; onFrameChoice: (c: "current" | "final") => void;
  background: AssemblyOptions["background"];
  estimate: { totalFrames: number; megapixels: number; heavy: boolean; durationMs: number };
  webmSupported: boolean;
  running: boolean; error: string | null; result: ExportResult | null;
  onRun: () => void; onCancel: () => void; onDownloadAgain: () => void; onClose: () => void;
}

function ExportPanel(p: ExportPanelProps) {
  const custom = p.preset === "custom";
  return (
    <div className="rounded-xl border border-border bg-background p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold">Export</div>
        <button onClick={p.onClose} aria-label="Close export" className="rounded p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label className="text-xs text-muted-foreground">Format
          <select value={p.format} onChange={(e) => p.onFormat(e.target.value as ExportSettings["format"])}
            className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm">
            <option value="webm" disabled={!p.webmSupported}>WebM video{p.webmSupported ? "" : " (unsupported)"}</option>
            <option value="png-sequence">PNG frame sequence (ZIP)</option>
            <option value="png-frame">Single PNG frame</option>
          </select>
        </label>

        <label className="text-xs text-muted-foreground">Resolution
          <select value={p.preset} onChange={(e) => p.onPreset(e.target.value)}
            className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm">
            {RESOLUTION_PRESETS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </label>

        {p.format !== "png-frame" && (
          <label className="text-xs text-muted-foreground">Frame rate
            <select value={p.fps} onChange={(e) => p.onFps(parseInt(e.target.value, 10))}
              className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm">
              {FPS_OPTIONS.map((f) => <option key={f} value={f}>{f} fps</option>)}
            </select>
          </label>
        )}

        {custom && (
          <>
            <label className="text-xs text-muted-foreground">Width
              <input type="number" min={240} max={3840} value={p.w} onChange={(e) => p.onW(clampInt(e.target.value, 240, 3840))}
                className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm" />
            </label>
            <label className="text-xs text-muted-foreground">Height
              <input type="number" min={240} max={3840} value={p.h} onChange={(e) => p.onH(clampInt(e.target.value, 240, 3840))}
                className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm" />
            </label>
          </>
        )}

        {p.format === "webm" && (
          <label className="text-xs text-muted-foreground">Quality
            <select value={p.quality} onChange={(e) => p.onQuality(e.target.value as ExportSettings["quality"])}
              className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm">
              <option value="standard">Standard</option>
              <option value="high">High</option>
              <option value="maximum">Maximum</option>
            </select>
          </label>
        )}

        {p.format === "png-frame" && (
          <label className="text-xs text-muted-foreground">Frame
            <select value={p.frameChoice} onChange={(e) => p.onFrameChoice(e.target.value as "current" | "final")}
              className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1 text-sm">
              <option value="final">Final hero frame</option>
              <option value="current">Current frame</option>
            </select>
          </label>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          {p.settings.width}×{p.settings.height}
          {p.format !== "png-frame" ? ` · ${p.fps} fps · ~${p.estimate.totalFrames} frames · ${(p.estimate.durationMs / 1000).toFixed(1)} s` : ""}
        </span>
        {p.estimate.heavy && (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
            <AlertTriangle className="h-3 w-3" /> Large export
          </span>
        )}
        {p.format === "webm" && p.background === "transparent" && (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
            <AlertTriangle className="h-3 w-3" /> WebM can’t be transparent — it will use a solid studio background. Use PNG for transparency.
          </span>
        )}
        {!MP4_AVAILABLE && <span className="text-muted-foreground/80">MP4 is not available in-browser — export WebM or PNG frames.</span>}
      </div>

      {p.error && <div className="mt-2 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700">{p.error}</div>}
      {p.result && !p.error && (
        <div className="mt-2 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
          Exported <span className="font-medium">{p.result.filename}</span> · {p.result.width}×{p.result.height}
          {p.result.format !== "png-frame" ? ` · ${p.result.fps} fps · ${(p.result.durationMs / 1000).toFixed(1)} s` : ""} ·{" "}
          {(p.result.sizeBytes / 1024 / 1024).toFixed(2)} MB · <button className="underline" onClick={p.onDownloadAgain}>download again</button>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        {p.running
          ? <Button size="sm" variant="secondary" className="gap-1.5" onClick={p.onCancel}><X className="h-3.5 w-3.5" /> Cancel</Button>
          : <Button size="sm" className="gap-1.5" onClick={p.onRun}>
              <Film className="h-3.5 w-3.5" /> Generate {p.format === "webm" ? "video" : p.format === "png-frame" ? "frame" : "frames"}
            </Button>}
      </div>
    </div>
  );
}

function clampInt(v: string, lo: number, hi: number): number {
  const n = Math.round(parseFloat(v));
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
