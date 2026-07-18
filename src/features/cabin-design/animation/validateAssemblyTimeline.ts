/**
 * ANIMATED CABIN ASSEMBLY — validation (spec: "Validation" + "Export safety").
 *
 * Before playback / export, prove the timeline is sound: every animated part id exists, every
 * transform + camera value is finite, the step order is valid, no part is installed twice, the scene
 * stays within sane bounds, the duration is positive and no caption carries an undefined value. And
 * separately, that requested export settings (resolution / frame rate) are within safe limits. Never
 * silently export a broken or blank video — the UI surfaces these before it starts.
 *
 * Pure: no React / three / DOM.
 */

import { boxOfSolid, quadOfSolid } from "@/features/cabin-design/viewer3d/partGeometry";
import type { CabinModel } from "@/features/cabin-design/model/types";
import { keyframeFinite } from "./assemblyCamera";
import type { AssemblyTimeline, ExportSettings } from "./assemblyTypes";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/** Sane export bounds — well within what MediaRecorder / a 2D canvas will accept in a browser. */
export const MIN_DIM = 240;
export const MAX_DIM = 3840;
export const ALLOWED_FPS = [24, 30, 60];
/** frames × megapixels above which we warn the user an export will be very slow. */
const HEAVY_FRAME_MP = 900; // e.g. 300 frames × 3 MP (1080p) ≈ 900

const finite = (n: number): boolean => Number.isFinite(n);

export function validateAssemblyTimeline(timeline: AssemblyTimeline, model: CabinModel): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [...timeline.warnings];

  if (!(timeline.totalMs > 0)) errors.push("Timeline duration must be positive.");

  const ids = new Set(model.parts.map((p) => p.id));

  // schedule: ids exist, transforms finite, no duplicate install
  const seen = new Set<string>();
  for (const e of timeline.schedule) {
    if (!ids.has(e.partId)) errors.push(`Animated part "${e.partId}" is not in the model.`);
    if (seen.has(e.partId)) errors.push(`Part "${e.partId}" is scheduled to install more than once.`);
    seen.add(e.partId);
    if (!e.enterOffset.every(finite)) errors.push(`Part "${e.partId}" has a non-finite approach offset.`);
    if (!(finite(e.enterStartMs) && finite(e.enterEndMs) && e.enterEndMs >= e.enterStartMs)) {
      errors.push(`Part "${e.partId}" has an invalid install window.`);
    }
  }

  // every model part has a finite installed geometry (box or quad)
  for (const p of model.parts) {
    const b = boxOfSolid(p.solid, timeline.sceneCtx);
    if (b) {
      if (![...b.center, ...b.size].every(finite)) errors.push(`Part "${p.id}" has a non-finite installed transform.`);
      continue;
    }
    const q = quadOfSolid(p.solid, timeline.sceneCtx);
    if (q) {
      if (!q.every((v) => v.every(finite))) errors.push(`Part "${p.id}" has a non-finite installed transform.`);
    } else {
      errors.push(`Part "${p.id}" has no renderable geometry.`);
    }
  }

  // step ordering + timing + captions + camera
  let prevEnd = timeline.introMs;
  let prevStep = 0;
  for (const s of timeline.steps) {
    if (s.assemblyStep < prevStep) errors.push(`Step ordering is out of sequence at step ${s.assemblyStep}.`);
    prevStep = s.assemblyStep;
    if (!(s.startMs >= prevEnd - 1)) errors.push(`Step "${s.id}" starts before the previous step ends.`);
    if (!(s.installMs > 0 && s.holdMs >= 0)) errors.push(`Step "${s.id}" has an invalid duration.`);
    prevEnd = s.endMs;
    for (const id of s.partIds) if (!ids.has(id)) errors.push(`Step "${s.id}" references missing part "${id}".`);
    if (!keyframeFinite(s.camera.from) || !keyframeFinite(s.camera.to)) errors.push(`Step "${s.id}" has a non-finite camera pose.`);
    if (!s.title || !s.captionCustomer) errors.push(`Step "${s.id}" is missing caption text.`);
    if (s.title.includes("undefined") || s.captionCustomer.includes("undefined")) errors.push(`Step "${s.id}" caption contains "undefined".`);
    for (const row of s.engineering) {
      if (row.label.includes("undefined")) errors.push(`Step "${s.id}" engineering row contains "undefined".`);
    }
  }

  // scene sanity — radius should be a sensible metre-scale number
  if (!(timeline.radius > 0.2 && timeline.radius < 200)) {
    warnings.push(`Cabin scene radius (${timeline.radius.toFixed(1)} m) is outside the expected range.`);
  }

  // intro/outro captions defined
  for (const t of [timeline.intro, timeline.outro]) {
    if (!t.title || t.title.includes("undefined") || t.subtitle.includes("undefined")) {
      errors.push("Intro/outro caption contains an undefined value.");
    }
  }

  // structural sanity — a real cabin should at least have a base frame + floor
  if (timeline.steps.length && !timeline.steps.some((s) => s.assemblyStep === 1)) {
    warnings.push("No base-frame step was generated — check the model's structural parts.");
  }

  return { ok: errors.length === 0, errors, warnings };
}

/* ----------------------------------------------------------------- export settings ------------- */

export function validateExportSettings(settings: ExportSettings): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { width, height, fps, format } = settings;

  if (!Number.isInteger(width) || width < MIN_DIM || width > MAX_DIM) errors.push(`Width must be an integer between ${MIN_DIM} and ${MAX_DIM}.`);
  if (!Number.isInteger(height) || height < MIN_DIM || height > MAX_DIM) errors.push(`Height must be an integer between ${MIN_DIM} and ${MAX_DIM}.`);
  if (!ALLOWED_FPS.includes(fps)) errors.push(`Frame rate must be one of ${ALLOWED_FPS.join(", ")} fps.`);
  if (!["webm", "png-sequence", "png-frame"].includes(format)) errors.push("Unknown export format.");

  return { ok: errors.length === 0, errors, warnings };
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
