"use client";

/**
 * LABOUR COLONY ASSEMBLY ANIMATION — playback + presentation controls.
 *
 * Every control the spec calls for: play / pause / restart / previous step / next step, a scrub
 * timeline, speed (0.5–2×), loop, auto-camera vs manual orbit, the label toggles (engineering vs
 * customer captions, dimensions, part marks, connection marks, bolt labels), background, preview
 * quality, fullscreen and Export. Buttons carry visible text plus title / aria labels for
 * accessibility, and everything is disabled while an export is running so nothing conflicts.
 *
 * Purely presentational — the parent (AssemblyVideoView) owns the state.
 */

import {
  Bolt, Camera, CameraOff, Captions, CaptionsOff, Download, Expand, Link2, Maximize2, Pause, Play,
  Repeat, RotateCcw, Ruler, SkipBack, SkipForward, Tag, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AssemblyOptions } from "./assemblyTypes";
import type { OverlayLabelOptions } from "./assemblyOverlayDraw";
import type { AssemblyPlayer } from "./useAssemblyPlayer";
import { PLAYBACK_SPEEDS } from "./useAssemblyPlayer";

export interface AssemblyControlsProps {
  player: AssemblyPlayer;
  totalMs: number;
  options: AssemblyOptions;
  onOption: (patch: Partial<AssemblyOptions>) => void;
  labels: OverlayLabelOptions;
  onLabel: (patch: Partial<OverlayLabelOptions>) => void;
  quality: "low" | "high";
  onQuality: (q: "low" | "high") => void;
  onFullscreen: () => void;
  onExport: () => void;
  exporting: boolean;
}

const fmt = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${`${s % 60}`.padStart(2, "0")}`;
};

function Toggle({ on, onClick, icon: Icon, label, disabled }: {
  on: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} title={label} aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-50",
        on ? "border-accent/40 bg-accent/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

export function AssemblyControls(props: AssemblyControlsProps) {
  const { player, totalMs, options, onOption, labels, onLabel, exporting } = props;
  const d = exporting;
  const engineering = options.mode === "engineering";

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
      {/* transport row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={player.prevStep} disabled={d} aria-label="Previous step" title="Previous step (←)"><SkipBack className="h-4 w-4" /></Button>
          {player.playing
            ? <Button size="icon" className="h-8 w-8" onClick={player.pause} disabled={d} aria-label="Pause" title="Pause (Space)"><Pause className="h-4 w-4" /></Button>
            : <Button size="icon" className="h-8 w-8" onClick={player.play} disabled={d} aria-label="Play" title="Play (Space)"><Play className="h-4 w-4" /></Button>}
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={player.nextStep} disabled={d} aria-label="Next step" title="Next step (→)"><SkipForward className="h-4 w-4" /></Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={player.restart} disabled={d} aria-label="Restart" title="Restart (R)"><RotateCcw className="h-4 w-4" /></Button>
          <Toggle on={player.loop} onClick={player.toggleLoop} icon={Repeat} label="Loop" disabled={d} />
        </div>

        <span className="text-xs tabular-nums text-muted-foreground">{fmt(player.timeMs)} / {fmt(totalMs)}</span>

        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <span>Speed</span>
          {PLAYBACK_SPEEDS.map((s) => (
            <button
              key={s} type="button" onClick={() => player.setSpeed(s)} disabled={d}
              aria-pressed={player.speed === s} title={`${s}× playback speed`}
              className={cn("rounded px-1.5 py-0.5 disabled:opacity-50", player.speed === s ? "bg-accent text-accent-foreground" : "hover:bg-muted")}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* scrub timeline */}
      <input
        type="range" min={0} max={Math.max(1, totalMs)} step={10} value={Math.min(player.timeMs, totalMs)}
        onChange={(e) => player.seekTo(parseFloat(e.target.value))} disabled={d}
        className="w-full accent-orange-500" aria-label="Seek timeline"
      />

      {/* presentation toggles */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Toggle
          on={engineering}
          onClick={() => onOption({ mode: engineering ? "customer" : "engineering" })}
          icon={engineering ? Ruler : Users}
          label={engineering ? "Engineering" : "Customer"}
          disabled={d}
        />
        <Toggle on={options.autoCamera} onClick={() => onOption({ autoCamera: !options.autoCamera })} icon={options.autoCamera ? Camera : CameraOff} label={options.autoCamera ? "Auto camera" : "Manual camera"} disabled={d} />
        <Toggle on={options.showLabels} onClick={() => onOption({ showLabels: !options.showLabels })} icon={options.showLabels ? Captions : CaptionsOff} label="Captions" disabled={d} />
        <Toggle on={labels.showDimensions} onClick={() => onLabel({ showDimensions: !labels.showDimensions })} icon={Ruler} label="Dimensions" disabled={d} />
        <Toggle on={labels.showPartMarks} onClick={() => onLabel({ showPartMarks: !labels.showPartMarks })} icon={Tag} label="Part marks" disabled={d} />
        <Toggle on={labels.showConnectionMarks} onClick={() => onLabel({ showConnectionMarks: !labels.showConnectionMarks })} icon={Link2} label="Connection marks" disabled={d} />
        <Toggle on={labels.showBoltLabels} onClick={() => onLabel({ showBoltLabels: !labels.showBoltLabels })} icon={Bolt} label="Bolt labels" disabled={d} />
        <Toggle on={options.ghostFuture} onClick={() => onOption({ ghostFuture: !options.ghostFuture })} icon={Expand} label="Ghost next" disabled={d} />
        <Toggle on={options.dimInstalled} onClick={() => onOption({ dimInstalled: !options.dimInstalled })} icon={Expand} label="Dim installed" disabled={d} />

        <label className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          Background
          <select
            value={options.background}
            onChange={(e) => onOption({ background: e.target.value as AssemblyOptions["background"] })}
            disabled={d}
            className="rounded-md border border-border bg-background px-1.5 py-1 text-xs text-foreground disabled:opacity-50"
          >
            <option value="studio">Studio</option>
            <option value="white">White</option>
            <option value="site">Site</option>
            <option value="transparent">Transparent</option>
          </select>
        </label>

        <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          Quality
          <select
            value={props.quality}
            onChange={(e) => props.onQuality(e.target.value as "low" | "high")}
            disabled={d}
            className="rounded-md border border-border bg-background px-1.5 py-1 text-xs text-foreground disabled:opacity-50"
          >
            <option value="high">High</option>
            <option value="low">Fast</option>
          </select>
        </label>

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={props.onFullscreen} disabled={d} title="Fullscreen (F)"><Maximize2 className="h-3.5 w-3.5" /> Fullscreen</Button>
          <Button size="sm" className="gap-1.5" onClick={props.onExport} disabled={d} title="Export video / frames"><Download className="h-3.5 w-3.5" /> Export</Button>
        </div>
      </div>
    </div>
  );
}
