"use client";

/**
 * WORKSPACE PANELS — assets, locked features, project settings, status and job list.
 *
 * Presentational by design: every one takes the controller from useStudio and renders it. No
 * panel talks to the network, and none holds a copy of project state that could drift from the
 * server's answer.
 *
 * ── ACCESSIBILITY NOTES THAT ARE EASY TO UNDO ───────────────────────────────────────────────
 *  • Each upload slot is a real <input type="file"> inside a <label>, not a div with a click
 *    handler — so it is keyboard-reachable and announced as a file input by screen readers.
 *  • Drop zones add drag handlers ON TOP of that input; they never replace it.
 *  • The status region is aria-live="polite", so a render finishing is announced without
 *    stealing focus from whatever the visitor is editing.
 *  • Every icon that carries meaning has a text label beside it; decorative ones are
 *    aria-hidden.
 */

import { useCallback, useId, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Download,
  FileImage,
  Home,
  Image as ImageIcon,
  Info,
  Loader2,
  Lock,
  Map as MapIcon,
  Sofa,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FEATURE_FIELDS } from "@/lib/animation/features";
import { ACCEPT_ATTRIBUTE, MAX_IMAGE_BYTES } from "@/lib/animation/validation";
import {
  BASE_NEGATIVE_PROMPT,
  DISCLAIMER,
  type AssetRole,
  type StudioAsset,
} from "@/lib/animation/types";

import type { StudioController } from "./useStudio";

/* ------------------------------------------------------------------ *
 * Upload slots
 * ------------------------------------------------------------------ */

interface SlotDef {
  role: AssetRole;
  label: string;
  help: string;
  required: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

const SLOTS: SlotDef[] = [
  {
    role: "exterior",
    label: "Exterior image",
    help: "The elevation you want the film to open on. Required.",
    required: true,
    icon: Home,
  },
  {
    role: "interior",
    label: "Interior image",
    help: "The room the walkthrough moves into. Required.",
    required: true,
    icon: Sofa,
  },
  {
    role: "floor_plan",
    label: "Floor plan or elevation",
    help: "Optional. Helps fix the floor count and room layout.",
    required: false,
    icon: MapIcon,
  },
  {
    role: "reference",
    label: "Additional references",
    help: "Optional. Up to three more views or material samples.",
    required: false,
    icon: FileImage,
  },
];

function UploadSlot({
  slot,
  assets,
  onUpload,
  onRemove,
  disabled,
  busy,
}: {
  slot: SlotDef;
  assets: StudioAsset[];
  onUpload: (file: File, role: AssetRole) => void;
  onRemove: (assetId: string) => void;
  disabled: boolean;
  busy: boolean;
}) {
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mine = assets.filter((a) => a.role === slot.role);
  const Icon = slot.icon;
  const multiple = slot.role === "reference";
  const full = multiple ? mine.length >= 3 : mine.length >= 1;

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || disabled) return;
      const list = Array.from(files).slice(0, multiple ? 3 - mine.length : 1);
      for (const file of list) onUpload(file, slot.role);
    },
    [disabled, multiple, mine.length, onUpload, slot.role],
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber/10 text-amber">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold text-foreground">{slot.label}</span>
              {slot.required && (
                <span className="rounded bg-amber/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber">
                  Required
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{slot.help}</p>
          </div>
        </div>
        {mine.length > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {mine.length}
          </span>
        )}
      </div>

      {mine.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {mine.map((asset) => (
            <li key={asset.id} className="group relative overflow-hidden rounded-lg border border-border">
              {asset.signedUrl ? (
                // Signed, short-lived, private-bucket URL. A plain <img> is correct here: the
                // optimiser is not configured for the Supabase storage host, and a signed URL
                // expires — caching an optimised variant of it would outlive the signature.
                <img
                  src={asset.signedUrl}
                  alt={`${slot.label} reference: ${asset.originalName || "uploaded image"}`}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-muted text-xs text-muted-foreground">
                  Preview unavailable
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemove(asset.id)}
                disabled={disabled}
                className="absolute right-1 top-1 rounded-md bg-background/90 p-1 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 hover:text-destructive disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">Remove {asset.originalName || "this image"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!full && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "mt-3 rounded-lg border border-dashed p-4 text-center transition-colors",
            dragOver ? "border-amber bg-amber/5" : "border-border",
            disabled && "opacity-60",
          )}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            multiple={multiple}
            disabled={disabled}
            className="sr-only"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Label
            htmlFor={inputId}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted focus-within:ring-2 focus-within:ring-amber",
              disabled && "cursor-not-allowed",
            )}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            Choose {multiple ? "images" : "an image"}
          </Label>
          <p className="mt-2 text-[11px] text-muted-foreground">
            or drag and drop · JPG, PNG, WebP or AVIF · up to {MAX_IMAGE_BYTES / (1024 * 1024)} MB
          </p>
        </div>
      )}
    </div>
  );
}

export function AssetPanel({ studio }: { studio: StudioController }) {
  const assets = studio.project?.assets ?? [];
  const disabled = studio.busy !== null;

  return (
    <section aria-labelledby="studio-assets-heading" className="space-y-3">
      <div>
        <h3 id="studio-assets-heading" className="font-display text-base font-bold text-foreground">
          1 · Your reference images
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The film is built from these. An exterior and an interior are both required — the
          animation travels between them, and it will not invent whichever one is missing.
        </p>
      </div>

      {SLOTS.map((slot) => (
        <UploadSlot
          key={slot.role}
          slot={slot}
          assets={assets}
          onUpload={studio.uploadAsset}
          onRemove={studio.removeAsset}
          disabled={disabled}
          busy={studio.busy === "uploading"}
        />
      ))}

      {studio.missingRoles.length === 0 && (
        <Button
          type="button"
          onClick={studio.analyze}
          disabled={disabled}
          className="w-full bg-amber text-white hover:bg-amber/90"
        >
          {studio.busy === "analyzing" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Analysing your building…
            </>
          ) : studio.scenes.length > 0 ? (
            "Re-analyse and rebuild the storyboard"
          ) : (
            "Analyse and build the 30-second storyboard"
          )}
        </Button>
      )}

      <p className="rounded-lg border border-border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Your images are stored privately and are never published. You can delete this project and
        every file in it at any time from the Project panel.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Locked building features
 * ------------------------------------------------------------------ */

const CONFIDENCE_STYLE: Record<string, string> = {
  detected: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  inferred: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  unverified: "bg-amber/15 text-amber",
  user: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  detected: "detected",
  inferred: "inferred",
  unverified: "not detected",
  user: "you set this",
};

export function FeaturesPanel({ studio }: { studio: StudioController }) {
  const features = studio.project?.features;
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const dirty = Object.keys(draft).length > 0;

  if (!features) return null;

  return (
    <section aria-labelledby="studio-features-heading" className="space-y-3">
      <div>
        <h3 id="studio-features-heading" className="font-display text-base font-bold text-foreground">
          2 · Locked building features
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Every one of these is pasted into every scene prompt, so the generator copies your
          building instead of designing a new one. Correct anything that is wrong before you
          generate.
        </p>
      </div>

      {studio.analysisNotice && (
        <p className="flex gap-2 rounded-lg border border-amber/30 bg-amber/5 p-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
          <span>{studio.analysisNotice}</span>
        </p>
      )}

      <div className="space-y-3">
        {FEATURE_FIELDS.map((field) => {
          const node = features[field.key];
          const current = draft[field.key] ?? node.value;
          const fieldId = `feature-${field.key}`;
          return (
            <div key={field.key} className="rounded-lg border border-border bg-card p-3">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor={fieldId} className="text-xs font-semibold text-foreground">
                  {field.label}
                </Label>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    CONFIDENCE_STYLE[node.confidence] ?? CONFIDENCE_STYLE.unverified,
                  )}
                >
                  {CONFIDENCE_LABEL[node.confidence] ?? node.confidence}
                </span>
              </div>

              {field.kind === "boolean" ? (
                <div className="flex items-start gap-3">
                  <Switch
                    id={fieldId}
                    checked={Boolean(current)}
                    onCheckedChange={(v) => setDraft((d) => ({ ...d, [field.key]: v }))}
                  />
                  <span className="text-xs leading-relaxed text-muted-foreground">{field.help}</span>
                </div>
              ) : field.kind === "number" ? (
                <>
                  <Input
                    id={fieldId}
                    type="number"
                    min={1}
                    max={12}
                    value={Number(current)}
                    onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                    className="h-9"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{field.help}</p>
                </>
              ) : (
                <>
                  <Textarea
                    id={fieldId}
                    value={String(current)}
                    rows={2}
                    onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                    className="resize-y text-sm"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">{field.help}</p>
                </>
              )}

              {node.note && (
                <p className="mt-1.5 text-[11px] italic text-muted-foreground">{node.note}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          disabled={!dirty || studio.busy !== null}
          onClick={async () => {
            await studio.saveProject({ featureEdits: draft, versionLabel: "Corrected building features" });
            setDraft({});
          }}
          className="flex-1 bg-amber text-white hover:bg-amber/90"
        >
          <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
          {dirty ? "Save corrections" : "Saved"}
        </Button>
        {dirty && (
          <Button type="button" variant="outline" onClick={() => setDraft({})}>
            Reset
          </Button>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Project settings
 * ------------------------------------------------------------------ */

export function SettingsPanel({ studio }: { studio: StudioController }) {
  const project = studio.project;
  const config = studio.config;
  if (!project) return null;
  const s = project.settings;

  const patch = (partial: Record<string, unknown>) =>
    studio.saveProject({ settings: { ...s, ...partial }, versionLabel: "Settings" });

  const supports4k = config?.capabilities?.resolutions.includes("4k") ?? false;

  return (
    <section aria-labelledby="studio-settings-heading" className="space-y-4">
      <div>
        <h3 id="studio-settings-heading" className="font-display text-base font-bold text-foreground">
          Output & generation settings
        </h3>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-foreground">Aspect ratio</legend>
        <div className="grid grid-cols-3 gap-2">
          {(["16:9", "9:16", "1:1"] as const).map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => patch({ aspectRatio: ratio })}
              aria-pressed={s.aspectRatio === ratio}
              className={cn(
                "rounded-lg border px-2 py-2 text-xs font-semibold transition-colors",
                s.aspectRatio === ratio
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {ratio}
              <span className="mt-0.5 block text-[10px] font-normal">
                {ratio === "16:9" ? "Landscape" : ratio === "9:16" ? "Vertical" : "Square"}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-foreground">Final resolution</legend>
        <div className="grid grid-cols-3 gap-2">
          {(["720p", "1080p", "4k"] as const).map((r) => {
            const unavailable = r === "4k" && !supports4k;
            return (
              <button
                key={r}
                type="button"
                disabled={unavailable}
                onClick={() => patch({ resolution: r })}
                aria-pressed={s.resolution === r}
                title={
                  unavailable
                    ? "The configured provider does not produce native 4K, and this tool will not upscale and call it 4K."
                    : undefined
                }
                className={cn(
                  "rounded-lg border px-2 py-2 text-xs font-semibold transition-colors",
                  s.resolution === r
                    ? "border-amber bg-amber/10 text-amber"
                    : "border-border text-muted-foreground hover:bg-muted",
                  unavailable && "cursor-not-allowed opacity-40",
                )}
              >
                {r.toUpperCase()}
              </button>
            );
          })}
        </div>
        {!supports4k && (
          <p className="text-[11px] text-muted-foreground">
            4K is offered only when the configured provider genuinely renders it — an upscaled
            1080p file would not be 4K.
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-foreground">Light</legend>
        <div className="grid grid-cols-3 gap-2">
          {(["daylight", "evening", "night"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => patch({ timeOfDay: t })}
              aria-pressed={s.timeOfDay === t}
              className={cn(
                "rounded-lg border px-2 py-2 text-xs font-semibold capitalize transition-colors",
                s.timeOfDay === t
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <ToggleRow
          id="construction-stage"
          label="Construction-stage animation"
          help="Shows the build — cleared plot, foundation, frame, masonry, finishes — instead of a finished-house tour. Re-analyse after changing this."
          checked={s.constructionStageMode}
          onChange={(v) => patch({ constructionStageMode: v })}
        />
        <ToggleRow
          id="branding"
          label="Add our logo and contact outro"
          help="Off by default. Left off, the export is completely clean with no overlay of any kind."
          checked={s.branding.enabled}
          onChange={(v) => patch({ branding: { ...s.branding, enabled: v } })}
        />
        <ToggleRow
          id="audio-music"
          label="Copyright-safe background music"
          help="Applied at export when an audio track is available on this server."
          checked={s.audio.music}
          onChange={(v) => patch({ audio: { ...s.audio, music: v } })}
        />
        <ToggleRow
          id="audio-ambience"
          label="Construction site ambience"
          help="Low room tone rather than machinery — it sits under a walkthrough without fighting it."
          checked={s.audio.ambience}
          onChange={(v) => patch({ audio: { ...s.audio, ambience: v } })}
        />
        <ToggleRow
          id="audio-mute"
          label="Mute the export"
          help="Silent export. The scene clips themselves carry no audio."
          checked={s.audio.muted}
          onChange={(v) => patch({ audio: { ...s.audio, muted: v } })}
        />
        <div>
          <Label htmlFor="audio-volume" className="text-xs font-semibold">
            Audio volume — {s.audio.volume}%
          </Label>
          <Slider
            id="audio-volume"
            value={[s.audio.volume]}
            min={0}
            max={100}
            step={5}
            disabled={s.audio.muted}
            onValueCommit={(v) => patch({ audio: { ...s.audio, volume: v[0] } })}
            className="mt-2"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="voiceover" className="text-xs font-semibold">
          Voice-over script (optional)
        </Label>
        <Textarea
          id="voiceover"
          rows={4}
          defaultValue={s.audio.voiceoverScript}
          placeholder="Narration to record over the film. No prices, timelines or warranties — this document becomes a promise if it carries them."
          onBlur={(e) => {
            if (e.target.value !== s.audio.voiceoverScript) {
              patch({ audio: { ...s.audio, voiceoverScript: e.target.value } });
            }
          }}
          className="mt-1.5 text-sm"
        />
      </div>

      <div>
        <Label htmlFor="seed" className="text-xs font-semibold">
          Visual-consistency seed
        </Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            id="seed"
            type="number"
            defaultValue={s.seed ?? ""}
            placeholder="auto"
            className="h-9"
            onBlur={(e) => {
              const value = e.target.value.trim();
              const next = value === "" ? null : Math.floor(Number(value));
              if (next !== s.seed) patch({ seed: Number.isFinite(next as number) ? next : null });
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => patch({ seed: Math.floor(Math.random() * 2_000_000_000) })}
          >
            New seed
          </Button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          One seed across every scene is the strongest single lever for keeping the building
          identical from shot to shot.
          {config?.capabilities && !config.capabilities.seed && " The configured provider ignores it."}
        </p>
      </div>

      <div>
        <Label htmlFor="negative" className="text-xs font-semibold">
          Negative prompt
        </Label>
        <p className="mt-1 rounded-lg border border-border bg-muted/40 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <Lock className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
          Always applied: {BASE_NEGATIVE_PROMPT}
        </p>
        <Textarea
          id="negative"
          rows={3}
          defaultValue={s.extraNegativePrompt}
          placeholder="Anything else to exclude…"
          onBlur={(e) => {
            if (e.target.value !== s.extraNegativePrompt) patch({ extraNegativePrompt: e.target.value });
          }}
          className="mt-2 text-sm"
        />
      </div>
    </section>
  );
}

function ToggleRow({
  id,
  label,
  help,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  help: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-xs font-semibold">
          {label}
        </Label>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{help}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5 shrink-0" />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Status + jobs
 * ------------------------------------------------------------------ */

const PHASE_COPY: Record<string, { label: string; help: string; tone: "neutral" | "busy" | "good" | "bad" }> = {
  loading: { label: "Loading", help: "Restoring your workspace…", tone: "busy" },
  "provider-missing": {
    label: "Generation unavailable on this server",
    help: "Provider, database and ffmpeg must all be ready before a render can start. See the panel above for exactly what is missing.",
    tone: "bad",
  },
  empty: { label: "Ready for your images", help: "Upload an exterior and an interior photograph or render to begin.", tone: "neutral" },
  uploading: { label: "Uploading", help: "Checking the file and storing it privately…", tone: "busy" },
  analyzing: { label: "Analysing", help: "Reading your building and preparing the storyboard…", tone: "busy" },
  "storyboard-ready": { label: "Storyboard ready", help: "Six scenes, exactly 30 seconds. Edit anything, then generate.", tone: "good" },
  "awaiting-approval": { label: "Scenes rendered", help: "Every scene has generated. Review them, then export the 30-second film.", tone: "good" },
  queued: { label: "Queued", help: "Waiting for the provider to start your scenes.", tone: "busy" },
  generating: { label: "Generating", help: "The provider is rendering your scenes. You can close this page — it will carry on.", tone: "busy" },
  assembling: { label: "Assembling", help: "Joining the clips into one 30-second file and measuring it.", tone: "busy" },
  completed: { label: "Completed", help: "Your 30-second concept animation is ready to download or share.", tone: "good" },
  failed: { label: "Failed", help: "Something did not complete. The details are below — most failures can be retried.", tone: "bad" },
  cancelled: { label: "Cancelled", help: "This render was cancelled. You can start it again whenever you like.", tone: "neutral" },
};

export function StatusPanel({ studio }: { studio: StudioController }) {
  const copy = PHASE_COPY[studio.phase] ?? PHASE_COPY.empty;
  const activeJobs = studio.jobs.filter((j) => j.status === "queued" || j.status === "processing");
  const failedJobs = studio.jobs.filter((j) => j.status === "failed");

  return (
    <section aria-labelledby="studio-status-heading" className="space-y-3">
      <h3 id="studio-status-heading" className="sr-only">
        Generation status
      </h3>

      <div
        role="status"
        aria-live="polite"
        className={cn(
          "rounded-xl border p-4",
          copy.tone === "bad"
            ? "border-destructive/40 bg-destructive/5"
            : copy.tone === "good"
              ? "border-emerald-500/40 bg-emerald-500/5"
              : copy.tone === "busy"
                ? "border-amber/40 bg-amber/5"
                : "border-border bg-card",
        )}
      >
        <div className="flex items-center gap-2">
          {copy.tone === "busy" ? (
            <Loader2 className="h-4 w-4 animate-spin text-amber motion-reduce:animate-none" aria-hidden="true" />
          ) : copy.tone === "bad" ? (
            <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
          ) : copy.tone === "good" ? (
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="font-display text-sm font-bold text-foreground">{copy.label}</span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{copy.help}</p>

        {studio.scenes.length > 0 && (
          <p className="mt-2 text-xs font-medium text-foreground">
            {studio.renderedScenes} of {studio.scenes.length} scenes rendered ·{" "}
            {studio.totalDuration.toFixed(1)}s of {studio.targetDuration}s storyboard
          </p>
        )}
      </div>

      {activeJobs.length > 0 && (
        <ul className="space-y-2">
          {activeJobs.map((job) => {
            const scene = studio.scenes.find((s) => s.id === job.sceneId);
            return (
              <li key={job.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-foreground">
                    {job.kind === "assembly" ? "Assembling the film" : (scene?.title ?? "Scene")}
                  </span>
                  <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {job.status}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-amber transition-[width] duration-500 motion-reduce:transition-none"
                    style={{ width: `${job.progress ?? 8}%` }}
                    role="progressbar"
                    aria-valuenow={job.progress ?? undefined}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${scene?.title ?? "Render"} progress`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => studio.cancelJob(job.id)}
                  className="mt-2 text-[11px] font-semibold text-muted-foreground underline underline-offset-2 hover:text-destructive"
                >
                  Cancel this render
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {failedJobs.length > 0 && (
        <ul className="space-y-2">
          {failedJobs.slice(0, 4).map((job) => {
            const scene = studio.scenes.find((s) => s.id === job.sceneId);
            return (
              <li key={job.id} className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                <p className="text-xs font-semibold text-foreground">
                  {job.kind === "assembly" ? "Export failed" : `${scene?.title ?? "Scene"} failed`}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{job.error}</p>
                {job.sceneId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 text-[11px]"
                    onClick={() => studio.generate([job.sceneId!], true)}
                    disabled={studio.busy !== null}
                  >
                    Retry this scene
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Provider-not-configured notice
 * ------------------------------------------------------------------ */

const BLOCKER_TITLE: Record<string, string> = {
  provider: "Video provider configuration required",
  database: "Database migration not applied",
  ffmpeg: "Video assembly unavailable (no ffmpeg)",
};

/**
 * The readiness panel.
 *
 * Renders whenever ANY of the three prerequisites is missing, and names each one separately —
 * an operator fixing this needs to know which of the three is the problem, not a single
 * "unavailable". Nothing here is a spinner or a maybe: each blocker states the exact action.
 */
export function ProviderNotice({ config }: { config: import("@/lib/animation/types").ProviderConfigStatus }) {
  if (config.ready) return null;
  const providerBlocked = config.blockers.some((b) => b.id === "provider");

  return (
    <div role="alert" className="rounded-xl border border-amber/50 bg-amber/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-bold text-foreground">
            {config.blockers.length === 1
              ? BLOCKER_TITLE[config.blockers[0].id]
              : `Generation unavailable — ${config.blockers.length} things to fix`}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Generation is switched off until every item below is resolved. Everything else in this
            workspace still works: you can upload references, review the detected building
            features, build and edit the 30-second storyboard, and save the project — it will be
            waiting when the server is ready.
          </p>

          <ul className="mt-3 space-y-2">
            {config.blockers.map((blocker) => (
              <li key={blocker.id} className="flex min-w-0 gap-2 rounded-lg border border-border bg-background/60 p-2.5">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-foreground">
                    {BLOCKER_TITLE[blocker.id] ?? blocker.id}
                  </span>
                  <span className="mt-0.5 block break-words text-[11px] leading-relaxed text-muted-foreground">
                    {blocker.message}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {providerBlocked && (
            <>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Server environment variables
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {config.requiredEnv.map((name) => (
                  <li
                    key={name}
                    className={cn(
                      "break-all rounded border px-1.5 py-0.5 font-mono text-[11px]",
                      config.missingEnv.includes(name)
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {name}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Set them as server-side secrets (never with a{" "}
                <code className="font-mono">NEXT_PUBLIC_</code> prefix) and reload this page. No key
                is ever sent to the browser.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Shared bits
 * ------------------------------------------------------------------ */

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("flex gap-2 text-[11px] leading-relaxed text-muted-foreground", className)}>
      <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{DISCLAIMER}</span>
    </p>
  );
}

export function Banner({
  tone,
  children,
  onDismiss,
}: {
  tone: "error" | "notice";
  children: React.ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed",
        tone === "error"
          ? "border-destructive/40 bg-destructive/5 text-foreground"
          : "border-sky-500/40 bg-sky-500/5 text-foreground",
      )}
    >
      {tone === "error" ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1">{children}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">Dismiss</span>
      </button>
    </div>
  );
}

export { Download };
