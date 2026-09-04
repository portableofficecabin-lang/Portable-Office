"use client";

/**
 * THE STORYBOARD TIMELINE.
 *
 * Six (or however many) scenes, reorderable, retimeable, individually regenerable — and always
 * summing to exactly 30 seconds.
 *
 * ── REORDERING IS KEYBOARD-FIRST ────────────────────────────────────────────────────────────
 * Drag-and-drop is implemented with the native HTML5 drag API, and every drag has an equivalent
 * pair of "Move up" / "Move down" buttons that are real, focusable buttons. A timeline that can
 * only be reordered with a mouse is a timeline half the people who need it cannot use, and
 * dnd-kit would be a new dependency for something the platform already does.
 *
 * ── THE DURATION SLIDER CANNOT BREAK THE 30-SECOND RULE ─────────────────────────────────────
 * Dragging one scene's slider rebalances the others locally for immediate feedback, then the
 * server does the same arithmetic authoritatively and its answer replaces the local one. Locking
 * a scene pins it; if the locks make 30 seconds impossible, the server releases the most recent
 * lock and says so rather than silently producing a 27-second film.
 */

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  GripVertical,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  Unlock,
  Wand2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CAMERA_PRESETS, TRANSITIONS, getCameraPreset } from "@/lib/animation/cameras";
import { sceneDurationBounds } from "@/lib/animation/duration";
import type { StudioScene } from "@/lib/animation/types";

import type { StudioController } from "./useStudio";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  queued: "bg-amber/15 text-amber",
  processing: "bg-amber/15 text-amber",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  failed: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export function StoryboardTimeline({ studio }: { studio: StudioController }) {
  const [openScene, setOpenScene] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const scenes = studio.scenes;
  const busy = studio.busy !== null;

  if (scenes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <Clock className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
        <p className="mt-3 font-display text-sm font-bold text-foreground">No storyboard yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
          Upload an exterior and an interior image, then run the analysis. A six-scene, 30-second
          storyboard is built for you — and every part of it is editable.
        </p>
      </div>
    );
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= scenes.length || from === to) return;
    const next = [...scenes];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    studio.updateScenes(next, "Reordered scenes");
  };

  const patchScene = (id: string, partial: Partial<StudioScene>, label: string) => {
    studio.updateScenes(
      scenes.map((s) => (s.id === id ? { ...s, ...partial } : s)),
      label,
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-bold text-foreground">Storyboard timeline</h3>
          <p className="text-xs text-muted-foreground">
            Drag to reorder, or use the arrow buttons. Durations always rebalance to exactly 30
            seconds.
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
            Math.abs(studio.totalDuration - studio.targetDuration) < 0.05
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : "bg-destructive/15 text-destructive",
          )}
        >
          {studio.totalDuration.toFixed(1)}s / {studio.targetDuration}s
        </span>
      </div>

      {/* Proportional strip — the whole film at a glance. */}
      <div className="flex h-3 overflow-hidden rounded-full border border-border" aria-hidden="true">
        {scenes.map((scene, i) => (
          <div
            key={scene.id}
            className={cn(
              "h-full border-r border-background/60 last:border-r-0",
              scene.status === "completed"
                ? "bg-emerald-500/70"
                : scene.status === "failed"
                  ? "bg-destructive/70"
                  : i % 2 === 0
                    ? "bg-amber/60"
                    : "bg-amber/40",
            )}
            style={{ width: `${(scene.durationSeconds / studio.targetDuration) * 100}%` }}
          />
        ))}
      </div>

      <ol className="space-y-2">
        {scenes.map((scene, index) => {
          const open = openScene === scene.id;
          const preset = getCameraPreset(scene.cameraPreset);
          return (
            <li
              key={scene.id}
              draggable={!busy}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) move(dragIndex, index);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                "rounded-xl border bg-card transition-colors",
                dragIndex === index ? "border-amber opacity-70" : "border-border",
              )}
            >
              <div className="flex items-start gap-2 p-3">
                <span
                  className="mt-1 cursor-grab text-muted-foreground/60 active:cursor-grabbing"
                  aria-hidden="true"
                >
                  <GripVertical className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenScene(open ? null : scene.id)}
                      aria-expanded={open}
                      className="truncate text-left font-display text-sm font-bold text-foreground hover:text-amber"
                    >
                      {scene.title}
                    </button>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        STATUS_STYLE[scene.status] ?? STATUS_STYLE.draft,
                      )}
                    >
                      {scene.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {preset.label} · {scene.durationSeconds.toFixed(1)}s · {scene.transitionIn}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <IconButton
                    label={`Move ${scene.title} up`}
                    disabled={busy || index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`Move ${scene.title} down`}
                    disabled={busy || index === scenes.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={scene.locked ? `Unlock ${scene.title}'s duration` : `Lock ${scene.title}'s duration`}
                    disabled={busy}
                    onClick={() => patchScene(scene.id, { locked: !scene.locked }, "Locked a scene duration")}
                  >
                    {scene.locked ? (
                      <Lock className="h-3.5 w-3.5 text-amber" aria-hidden="true" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </IconButton>
                </div>
              </div>

              {open && (
                <SceneEditor
                  studio={studio}
                  scene={scene}
                  onPatch={(partial, label) => patchScene(scene.id, partial, label)}
                  onClose={() => setOpenScene(null)}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Scene editor
 * ------------------------------------------------------------------ */

function SceneEditor({
  studio,
  scene,
  onPatch,
  onClose,
}: {
  studio: StudioController;
  scene: StudioScene;
  onPatch: (partial: Partial<StudioScene>, label: string) => void;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState(scene.improvedPrompt ?? scene.prompt);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [duration, setDuration] = useState(scene.durationSeconds);
  const busy = studio.busy !== null;
  const assets = studio.project?.assets ?? [];
  const caps = studio.config?.capabilities;
  const bounds = sceneDurationBounds(
    studio.scenes.length,
    studio.targetDuration,
    studio.providerMaxSceneSeconds,
  );

  return (
    <div className="space-y-4 border-t border-border p-3 pt-4">
      {/* ── Prompt ─────────────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`prompt-${scene.id}`} className="text-xs font-semibold">
            Shot description
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-[11px]"
            disabled={busy || !prompt.trim()}
            onClick={async () => {
              const improved = await studio.improvePrompt(scene.id, prompt);
              if (improved) setSuggestion(improved);
            }}
          >
            {studio.busy === "improving" ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Wand2 className="mr-1 h-3 w-3" aria-hidden="true" />
            )}
            Improve
          </Button>
        </div>
        <Textarea
          id={`prompt-${scene.id}`}
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={() => {
            if (prompt !== (scene.improvedPrompt ?? scene.prompt)) {
              onPatch({ prompt, improvedPrompt: null }, `Edited ${scene.title}`);
            }
          }}
          className="mt-1.5 text-sm"
        />

        {suggestion && (
          <div className="mt-2 rounded-lg border border-sky-500/40 bg-sky-500/5 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
              Suggested rewrite
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground">{suggestion}</p>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                className="h-7 bg-amber text-[11px] text-white hover:bg-amber/90"
                onClick={() => {
                  setPrompt(suggestion);
                  onPatch({ improvedPrompt: suggestion }, `Improved ${scene.title}`);
                  setSuggestion(null);
                }}
              >
                <Check className="mr-1 h-3 w-3" aria-hidden="true" />
                Use this
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-[11px]"
                onClick={() => setSuggestion(null)}
              >
                Keep mine
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Camera ─────────────────────────────────────────────────────────────────── */}
      <div>
        <Label htmlFor={`camera-${scene.id}`} className="text-xs font-semibold">
          Camera path
        </Label>
        <select
          id={`camera-${scene.id}`}
          value={scene.cameraPreset}
          disabled={busy}
          onChange={(e) =>
            onPatch(
              {
                cameraPreset: e.target.value as StudioScene["cameraPreset"],
                motionIntensity: getCameraPreset(e.target.value as StudioScene["cameraPreset"]).suggestedMotion,
              },
              `Camera on ${scene.title}`,
            )
          }
          className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {CAMERA_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-muted-foreground">{getCameraPreset(scene.cameraPreset).hint}</p>

        {scene.cameraPreset === "custom" && (
          <Textarea
            rows={2}
            defaultValue={scene.cameraInstructions ?? ""}
            placeholder="Describe the camera move in your own words…"
            onBlur={(e) => {
              if (e.target.value !== (scene.cameraInstructions ?? "")) {
                onPatch({ cameraInstructions: e.target.value }, `Camera notes on ${scene.title}`);
              }
            }}
            className="mt-2 text-sm"
          />
        )}
      </div>

      {/* ── Motion + duration ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`motion-${scene.id}`} className="text-xs font-semibold">
            Motion intensity — {scene.motionIntensity}
          </Label>
          <Slider
            id={`motion-${scene.id}`}
            value={[scene.motionIntensity]}
            min={0}
            max={100}
            step={5}
            disabled={busy}
            onValueCommit={(v) => onPatch({ motionIntensity: v[0] }, `Motion on ${scene.title}`)}
            className="mt-3"
          />
        </div>
        <div>
          <Label htmlFor={`duration-${scene.id}`} className="text-xs font-semibold">
            Duration — {duration.toFixed(1)}s
          </Label>
          <Slider
            id={`duration-${scene.id}`}
            value={[duration]}
            /* Bounds come from the same function the server rebalance uses, so the slider can
               never offer a value that cannot be part of a 30-second film. */
            min={bounds.min}
            max={bounds.max}
            step={0.5}
            disabled={busy}
            onValueChange={(v) => setDuration(v[0])}
            onValueCommit={(v) => onPatch({ durationSeconds: v[0] }, `Retimed ${scene.title}`)}
            className="mt-3"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            The other unlocked scenes absorb the difference so the film stays 30 seconds.
          </p>
        </div>
      </div>

      {/* ── Transition ─────────────────────────────────────────────────────────────── */}
      <div>
        <Label htmlFor={`transition-${scene.id}`} className="text-xs font-semibold">
          Transition into this scene
        </Label>
        <select
          id={`transition-${scene.id}`}
          value={scene.transitionIn}
          disabled={busy}
          onChange={(e) =>
            onPatch({ transitionIn: e.target.value as StudioScene["transitionIn"] }, `Transition on ${scene.title}`)
          }
          className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {TRANSITIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} — {t.hint}
            </option>
          ))}
        </select>
      </div>

      {/* ── Start / end frames ─────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <FrameSelect
          id={`start-${scene.id}`}
          label="Start frame"
          value={scene.startAssetId}
          assets={assets}
          supported={caps?.startFrame !== false}
          onChange={(v) => onPatch({ startAssetId: v }, `Start frame on ${scene.title}`)}
        />
        <FrameSelect
          id={`end-${scene.id}`}
          label="End frame"
          value={scene.endAssetId}
          assets={assets}
          supported={caps?.endFrame !== false}
          onChange={(v) => onPatch({ endAssetId: v }, `End frame on ${scene.title}`)}
        />
      </div>

      {/* ── Keyframes ──────────────────────────────────────────────────────────────── */}
      <KeyframeEditor scene={scene} onPatch={onPatch} disabled={busy} />

      {/* ── Rendered clip ──────────────────────────────────────────────────────────── */}
      {scene.clipSignedUrl && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-foreground">Rendered clip</p>
          <video
            src={scene.clipSignedUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full rounded-lg border border-border bg-black"
          >
            <track kind="captions" />
          </video>
          {scene.clipDurationSeconds !== null && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Measured server-side at {scene.clipDurationSeconds.toFixed(2)}s; trimmed to{" "}
              {scene.durationSeconds.toFixed(1)}s on export.
            </p>
          )}
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <Button
          type="button"
          size="sm"
          className="h-8 bg-amber text-xs text-white hover:bg-amber/90"
          disabled={busy || !studio.config?.ready}
          onClick={() => studio.generate([scene.id], scene.status === "failed")}
          title={
            studio.config?.ready
              ? undefined
              : (studio.config?.blockers ?? []).map((b) => b.message).join(" ") ||
                "Generation is unavailable on this server."
          }
        >
          <RefreshCw className="mr-1.5 h-3 w-3" aria-hidden="true" />
          {scene.status === "completed" ? "Regenerate this scene only" : "Generate this scene"}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={onClose}>
          <X className="mr-1 h-3 w-3" aria-hidden="true" />
          Close
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Regenerating one scene regenerates only that scene — every other clip is left exactly as it
        is.
      </p>
    </div>
  );
}

function FrameSelect({
  id,
  label,
  value,
  assets,
  supported,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null;
  assets: { id: string; role: string; originalName: string }[];
  supported: boolean;
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs font-semibold">
        {label}
      </Label>
      <select
        id={id}
        value={value ?? ""}
        disabled={!supported}
        onChange={(e) => onChange(e.target.value || null)}
        className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">None</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>
            {a.role.replace("_", " ")} — {a.originalName || "uploaded image"}
          </option>
        ))}
      </select>
      {!supported && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          The configured provider does not support this.
        </p>
      )}
    </div>
  );
}

function KeyframeEditor({
  scene,
  onPatch,
  disabled,
}: {
  scene: StudioScene;
  onPatch: (partial: Partial<StudioScene>, label: string) => void;
  disabled: boolean;
}) {
  const [at, setAt] = useState(50);
  const [text, setText] = useState("");

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs font-semibold text-foreground">Keyframes</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Timed beats inside this shot, e.g. &ldquo;at 60%: the camera settles on the entrance&rdquo;.
      </p>

      {scene.keyframes.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {scene.keyframes.map((k, i) => (
            <li key={`${k.at}-${i}`} className="flex items-center gap-2 text-xs">
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] tabular-nums">
                {(k.at * scene.durationSeconds).toFixed(1)}s
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{k.instruction}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onPatch(
                    { keyframes: scene.keyframes.filter((_, idx) => idx !== i) },
                    `Removed a keyframe from ${scene.title}`,
                  )
                }
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">Remove keyframe</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div className="w-20">
          <Label htmlFor={`kf-at-${scene.id}`} className="text-[11px]">
            At %
          </Label>
          <Input
            id={`kf-at-${scene.id}`}
            type="number"
            min={0}
            max={100}
            value={at}
            onChange={(e) => setAt(Number(e.target.value))}
            className="h-8 text-xs"
          />
        </div>
        <div className="min-w-[10rem] flex-1">
          <Label htmlFor={`kf-text-${scene.id}`} className="text-[11px]">
            What happens
          </Label>
          <Input
            id={`kf-text-${scene.id}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="the camera settles on the entrance"
            className="h-8 text-xs"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          disabled={disabled || !text.trim() || scene.keyframes.length >= 8}
          onClick={() => {
            onPatch(
              {
                keyframes: [
                  ...scene.keyframes,
                  { at: Math.max(0, Math.min(1, at / 100)), instruction: text.trim().slice(0, 200) },
                ].slice(0, 8),
              },
              `Added a keyframe to ${scene.title}`,
            );
            setText("");
          }}
        >
          <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
          Add
        </Button>
      </div>
    </div>
  );
}
