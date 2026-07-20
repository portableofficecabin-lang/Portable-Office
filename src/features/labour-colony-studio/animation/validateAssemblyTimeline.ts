/**
 * LABOUR COLONY ASSEMBLY ANIMATION — validation (spec: "Validation" + "Export safety").
 *
 * Before playback or export, PROVE the timeline is structurally sound and return a TYPED issue list the
 * UI can render: every animated part id exists in the model, every part is scheduled exactly once,
 * every install window and step boundary is monotonic and non-overlapping, every camera keyframe and
 * transform is finite, the erection order never runs backwards, no caption carries an "undefined", and
 * the scene radius is a sane metre-scale number. Separately it checks requested export settings.
 *
 * Never silently play or export a broken timeline — the UI surfaces these first.
 *
 * Pure: no React / three / DOM.
 */

import type { ColonyModel } from "@/features/labour-colony-studio/model/types";
import { boxOfSolid, quadOfSolid } from "@/features/labour-colony-studio/viewer3d/partGeometry";
import { keyframeFinite } from "./assemblyCamera";
import type { AssemblyTimeline, ExportSettings } from "./assemblyTypes";

/** How serious an issue is. `error` blocks playback / export; `warning` is advisory. */
export type IssueSeverity = "error" | "warning";

/** The machine-readable issue codes, so the UI can group / filter without string matching. */
export type IssueCode =
  | "duration"
  | "missing-part"
  | "duplicate-schedule"
  | "unscheduled-part"
  | "bad-offset"
  | "bad-window"
  | "bad-geometry"
  | "step-order"
  | "step-overlap"
  | "step-duration"
  | "step-missing-part"
  | "camera"
  | "caption"
  | "scene-scale"
  | "model-warning"
  | "structure";

export interface TimelineIssue {
  severity: IssueSeverity;
  code: IssueCode;
  message: string;
  /** The step id / part id the issue attaches to, where one applies. */
  ref?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: TimelineIssue[];
  /** Flat message lists, for the simple banner surfaces. */
  errors: string[];
  warnings: string[];
}

/** Sane export bounds — well within what MediaRecorder / a 2D canvas will accept in a browser. */
export const MIN_DIM = 240;
export const MAX_DIM = 3840;
export const ALLOWED_FPS = [24, 30, 60];
/** frames × megapixels above which we warn the user an export will be very slow. */
const HEAVY_FRAME_MP = 900;

const finite = (n: number): boolean => Number.isFinite(n);

export function validateAssemblyTimeline(timeline: AssemblyTimeline, model: ColonyModel): ValidationResult {
  const issues: TimelineIssue[] = [];
  const err = (code: IssueCode, message: string, ref?: string) => issues.push({ severity: "error", code, message, ref });
  const warn = (code: IssueCode, message: string, ref?: string) => issues.push({ severity: "warning", code, message, ref });

  for (const w of timeline.warnings) warn("model-warning", w);

  if (!(timeline.totalMs > 0)) err("duration", "Timeline duration must be positive.");

  const ids = new Set(model.parts.map((p) => p.id));

  /* ---- schedule: ids exist, no duplicate install, finite offsets + windows ---- */
  const scheduled = new Set<string>();
  for (const e of timeline.schedule) {
    if (!ids.has(e.partId)) err("missing-part", `Animated part "${e.partId}" is not in the model.`, e.partId);
    if (scheduled.has(e.partId)) err("duplicate-schedule", `Part "${e.partId}" is scheduled to install more than once.`, e.partId);
    scheduled.add(e.partId);
    if (!e.enterOffset.every(finite)) err("bad-offset", `Part "${e.partId}" has a non-finite approach offset.`, e.partId);
    if (!(finite(e.enterStartMs) && finite(e.enterEndMs) && e.enterEndMs >= e.enterStartMs)) {
      err("bad-window", `Part "${e.partId}" has an invalid install window.`, e.partId);
    }
  }

  /* ---- every model part is scheduled exactly once ---- */
  const unscheduled = model.parts.filter((p) => !scheduled.has(p.id));
  if (unscheduled.length) {
    const sample = unscheduled.slice(0, 3).map((p) => p.id).join(", ");
    err(
      "unscheduled-part",
      `${unscheduled.length} model part${unscheduled.length === 1 ? " is" : "s are"} never installed by the animation (${sample}${unscheduled.length > 3 ? ", …" : ""}).`,
      unscheduled[0].id,
    );
  }

  /* ---- every model part has finite installed geometry ---- */
  for (const p of model.parts) {
    const b = boxOfSolid(p.solid, timeline.sceneCtx);
    if (b) {
      if (![...b.center, ...b.size].every(finite)) err("bad-geometry", `Part "${p.id}" has a non-finite installed transform.`, p.id);
      continue;
    }
    const q = quadOfSolid(p.solid, timeline.sceneCtx);
    if (q) {
      if (!q.every((v) => v.every(finite))) err("bad-geometry", `Part "${p.id}" has a non-finite installed transform.`, p.id);
    } else {
      err("bad-geometry", `Part "${p.id}" has no renderable geometry.`, p.id);
    }
  }

  /* ---- steps: monotonic times, no overlap, erection order, captions, camera ---- */
  let prevEnd = timeline.introMs;
  let prevAssemblyStep = 0;
  timeline.steps.forEach((s, i) => {
    if (s.index !== i) err("step-order", `Step "${s.id}" reports index ${s.index} at position ${i}.`, s.id);
    if (s.assemblyStep <= prevAssemblyStep) {
      err("step-order", `Erection order runs backwards at construction step ${s.assemblyStep}.`, s.id);
    }
    prevAssemblyStep = s.assemblyStep;

    if (!(s.startMs >= prevEnd - 1)) err("step-overlap", `Step "${s.id}" starts before the previous step ends.`, s.id);
    if (!(finite(s.startMs) && finite(s.endMs) && s.endMs > s.startMs)) err("step-duration", `Step "${s.id}" has a non-monotonic time range.`, s.id);
    if (!(s.installMs > 0 && s.holdMs >= 0)) err("step-duration", `Step "${s.id}" has an invalid duration.`, s.id);
    if (Math.abs(s.startMs + s.installMs + s.holdMs - s.endMs) > 1) err("step-duration", `Step "${s.id}" end time does not match its install + hold duration.`, s.id);
    prevEnd = s.endMs;

    if (!s.partIds.length) warn("step-missing-part", `Step "${s.id}" has no parts.`, s.id);
    for (const id of s.partIds) if (!ids.has(id)) err("step-missing-part", `Step "${s.id}" references missing part "${id}".`, s.id);

    if (!keyframeFinite(s.camera.from) || !keyframeFinite(s.camera.to)) err("camera", `Step "${s.id}" has a non-finite camera pose.`, s.id);

    if (!s.title || !s.captionCustomer) err("caption", `Step "${s.id}" is missing caption text.`, s.id);
    const captionText = [s.title, s.description, s.captionCustomer, s.captionEngineering ?? "", s.tools, s.safety, s.inspection].join(" ");
    if (captionText.includes("undefined") || captionText.includes("NaN")) err("caption", `Step "${s.id}" caption contains an undefined value.`, s.id);
    if (!s.tools) warn("caption", `Step "${s.id}" has no tool list.`, s.id);
    if (!s.safety) warn("caption", `Step "${s.id}" has no safety note.`, s.id);
    if (!s.inspection) warn("caption", `Step "${s.id}" has no inspection checkpoint.`, s.id);
    for (const row of s.engineering) {
      if (row.label.includes("undefined")) err("caption", `Step "${s.id}" engineering row contains "undefined".`, s.id);
    }
    for (const w of s.warnings) warn("model-warning", `Step "${s.id}": ${w}`, s.id);
  });

  /* ---- scene sanity ---- */
  if (!(timeline.radius > 0.2 && timeline.radius < 500)) {
    warn("scene-scale", `Colony scene radius (${timeline.radius.toFixed(1)} m) is outside the expected range.`);
  }

  /* ---- intro / outro captions ---- */
  for (const t of [timeline.intro, timeline.outro]) {
    if (!t.title || t.title.includes("undefined") || t.subtitle.includes("undefined")) {
      err("caption", "Intro/outro caption contains an undefined value.");
    }
  }

  /* ---- structural sanity: a real colony should at least have a frame ---- */
  if (timeline.steps.length && !timeline.steps.some((s) => s.assemblyStep >= 6 && s.assemblyStep <= 7)) {
    warn("structure", "No base-frame or column step was generated — check the model's structural parts.");
  }

  const errors = issues.filter((x) => x.severity === "error").map((x) => x.message);
  const warnings = issues.filter((x) => x.severity === "warning").map((x) => x.message);
  return { ok: errors.length === 0, issues, errors, warnings };
}

/* ----------------------------------------------------------------- export settings ------------- */

export function validateExportSettings(settings: ExportSettings): ValidationResult {
  const issues: TimelineIssue[] = [];
  const { width, height, fps, format } = settings;

  const push = (message: string) => issues.push({ severity: "error", code: "duration", message });
  if (!Number.isInteger(width) || width < MIN_DIM || width > MAX_DIM) push(`Width must be an integer between ${MIN_DIM} and ${MAX_DIM}.`);
  if (!Number.isInteger(height) || height < MIN_DIM || height > MAX_DIM) push(`Height must be an integer between ${MIN_DIM} and ${MAX_DIM}.`);
  if (!ALLOWED_FPS.includes(fps)) push(`Frame rate must be one of ${ALLOWED_FPS.join(", ")} fps.`);
  if (!["webm", "png-sequence", "png-frame"].includes(format)) push("Unknown export format.");

  const errors = issues.map((x) => x.message);
  return { ok: errors.length === 0, issues, errors, warnings: [] };
}

/** Frame + workload estimate, so the UI can warn before an extremely long / high-res export. */
export function estimateExport(timeline: AssemblyTimeline, settings: ExportSettings): {
  totalFrames: number; megapixels: number; heavy: boolean; durationMs: number;
} {
  const durationMs = timeline.totalMs;
  const totalFrames = settings.format === "png-frame"
    ? 1
    : Math.max(1, Math.ceil((durationMs / 1000) * settings.fps));
  const megapixels = (settings.width * settings.height) / 1_000_000;
  return { totalFrames, megapixels, heavy: totalFrames * megapixels > HEAVY_FRAME_MP, durationMs };
}
