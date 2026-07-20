/**
 * LABOUR COLONY ASSEMBLY ANIMATION — deterministic sampling (spec: "Animation behaviour" +
 * "Determinism").
 *
 * Given a built timeline and a timeline TIME (ms), this returns the exact scene state — camera pose,
 * per-part transform/opacity/highlight and the caption — with NO dependence on wall-clock or frame
 * delta. The interactive player advances the time with rAF for a smooth preview; the exporter feeds
 * time = frameIndex / fps so the SAME config + fps + resolution always produces byte-identical frame
 * content. This is the single function the spec's determinism guarantee rests on.
 *
 * Pure: no React / three / DOM.
 */

import type {
  AssemblyOptions, AssemblyTimeline, CameraKeyframe, CaptionState, PartRenderState,
  PartScheduleEntry, SceneSample, StepEngineeringRow, Vec3T,
} from "./assemblyTypes";
import { lerp3, modelBoxOf, orbitShot, planShot, type Box3 } from "./assemblyCamera";

/* ----------------------------------------------------------------- easing ---------------------- */

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

const lerpKeyframe = (a: CameraKeyframe, b: CameraKeyframe, t: number): CameraKeyframe => ({
  position: lerp3(a.position, b.position, t),
  target: lerp3(a.target, b.target, t),
});

/* ----------------------------------------------------------------- phase resolution ------------ */

/** -1 during the intro, `steps.length` during the outro, else the active step index. */
export function activeStepIndexAt(timeline: AssemblyTimeline, timeMs: number): number {
  const { steps, introMs } = timeline;
  if (!steps.length) return timeMs < introMs ? -1 : 0;
  if (timeMs < introMs) return -1;
  const lastEnd = steps[steps.length - 1].endMs;
  if (timeMs >= lastEnd) return steps.length;
  for (let i = 0; i < steps.length; i++) if (timeMs < steps[i].endMs) return i;
  return steps.length - 1;
}

/** Whether the active step ghosts the envelope (interior/MEP shot). */
export function activeStepCutawayAt(timeline: AssemblyTimeline, timeMs: number): boolean {
  const idx = activeStepIndexAt(timeline, timeMs);
  return idx >= 0 && idx < timeline.steps.length ? timeline.steps[idx].cutaway : false;
}

/* ----------------------------------------------------------------- camera ---------------------- */

export function sampleCamera(timeline: AssemblyTimeline, timeMs: number): CameraKeyframe {
  const { steps, introMs, outroMs, totalMs } = timeline;
  const modelBox = modelBoxOf(timeline.bounds, timeline.sceneCtx);

  const first = steps[0]?.camera.from ?? planShot("hero", modelBox, null);
  const last = steps[steps.length - 1]?.camera.to ?? planShot("hero", modelBox, null);

  // intro: a slow push-in from a wider establishing pose to the first step's opening pose.
  if (timeMs < introMs) {
    const wide = widen(first, 1.35, modelBox);
    const t = introMs > 0 ? easeInOutCubic(clamp01(timeMs / introMs)) : 1;
    return lerpKeyframe(wide, first, t);
  }

  const lastEnd = steps.length ? steps[steps.length - 1].endMs : introMs;

  // outro: ease out of the last step pose INTO the orbit (no jump at the boundary), orbit the
  // completed colony, then settle into the hero three-quarter.
  if (timeMs >= lastEnd) {
    const localOut = outroMs > 0 ? clamp01((timeMs - lastEnd) / outroMs) : 1;
    const hero = planShot("hero", modelBox, null);
    const baseAngle = Math.atan2(last.position[2] - modelBox.center[2], last.position[0] - modelBox.center[0]);
    const angle = baseAngle + easeInOutCubic(localOut) * (Math.PI * 1.5);
    const orbit = orbitShot(modelBox, angle);
    // first 15%: blend the last step pose (distance/elevation/target too, not just azimuth) into the orbit
    const entered = localOut < 0.15 ? lerpKeyframe(last, orbit, easeInOutCubic(localOut / 0.15)) : orbit;
    if (localOut <= 0.7) return entered;
    const bt = easeInOutCubic((localOut - 0.7) / 0.3);
    return lerpKeyframe(orbit, hero, bt);
  }

  // an active step: move from → to over the install portion, then hold on `to` during the dwell.
  const idx = activeStepIndexAt(timeline, timeMs);
  const step = steps[Math.min(Math.max(idx, 0), steps.length - 1)];
  if (!step) return lerpKeyframe(first, last, totalMs > 0 ? clamp01(timeMs / totalMs) : 0);
  const span = Math.max(1, step.endMs - step.startMs);
  const local = clamp01((timeMs - step.startMs) / span);
  const installFrac = span > 0 ? step.installMs / span : 1;
  const tt = installFrac > 0 && local <= installFrac ? easeInOutCubic(local / installFrac) : 1;
  return lerpKeyframe(step.camera.from, step.camera.to, tt);
}

/** Pull a pose back from its target by `factor` and lift it slightly — the intro's wide start. */
function widen(k: CameraKeyframe, factor: number, box: Box3): CameraKeyframe {
  const dir: Vec3T = [
    k.position[0] - k.target[0],
    k.position[1] - k.target[1],
    k.position[2] - k.target[2],
  ];
  return {
    position: [
      k.target[0] + dir[0] * factor,
      k.target[1] + dir[1] * factor + Math.max(0.4, box.size[1]) * 0.15,
      k.target[2] + dir[2] * factor,
    ],
    target: k.target,
  };
}

/* ----------------------------------------------------------------- per-part -------------------- */

export interface PartSampleCtx {
  activeStepIndex: number;
  activeStepCutaway: boolean;
  stepCount: number;
  options: AssemblyOptions;
}

const HIDDEN: PartRenderState = { visible: false, offset: [0, 0, 0], opacity: 0, highlight: false, ghost: false };

/** One part's render state at `timeMs`. Deterministic; the render loop applies it to the mesh. */
export function samplePart(entry: PartScheduleEntry, timeMs: number, ctx: PartSampleCtx): PartRenderState {
  const { enterStartMs, enterEndMs, enterOffset, stepIndex, envelope } = entry;

  // not yet installed
  if (timeMs < enterStartMs) {
    if (!ctx.options.ghostFuture) return HIDDEN;
    return { visible: true, offset: [0, 0, 0], opacity: 0.07, highlight: false, ghost: true };
  }

  // flying into place
  if (timeMs < enterEndMs) {
    const span = Math.max(1, enterEndMs - enterStartMs);
    const local = clamp01((timeMs - enterStartMs) / span);
    const e = easeOutCubic(local);
    const inv = 1 - e;
    return {
      visible: true,
      offset: [enterOffset[0] * inv, enterOffset[1] * inv, enterOffset[2] * inv],
      opacity: clamp01(0.25 + local * 1.5),
      highlight: true,
      ghost: false,
    };
  }

  // installed — during a cutaway (interior) step, ghost only envelope parts from EARLIER steps so the
  // camera can see the interior work. The current step's own envelope subject (cladding / lining /
  // partition) must NOT fade itself out, so it is excluded here and highlighted below.
  if (ctx.activeStepCutaway && envelope && stepIndex < ctx.activeStepIndex) {
    return { visible: true, offset: [0, 0, 0], opacity: 0.12, highlight: false, ghost: false };
  }

  const realStep = ctx.activeStepIndex >= 0 && ctx.activeStepIndex < ctx.stepCount;
  const highlight = ctx.activeStepIndex === stepIndex;
  let opacity = 1;
  if (ctx.options.dimInstalled && realStep && stepIndex < ctx.activeStepIndex && !highlight) opacity = 0.7;
  return { visible: true, offset: [0, 0, 0], opacity, highlight, ghost: false };
}

/* ----------------------------------------------------------------- caption --------------------- */

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

/** Compose the engineering caption rows for a step: fabrication marks, connections + bolts, the
 *  material / BOQ rows, then the tools / safety / ITP procedural rows — everything the spec says an
 *  engineering-mode step caption must surface. Kept capped so the overlay stays legible. */
function engineeringRowsForStep(
  step: AssemblyTimeline["steps"][number],
): StepEngineeringRow[] {
  const rows: StepEngineeringRow[] = [];
  if (step.memberMarks) rows.push({ label: "Members", note: step.memberMarks });
  if (step.connectionMarks) rows.push({ label: "Connections", note: step.connectionMarks });
  if (step.boltSpec) rows.push({ label: "Bolts", note: step.boltSpec });
  for (const r of step.engineering) rows.push(r);
  if (step.tools) rows.push({ label: "Tools", note: step.tools });
  if (step.safety) rows.push({ label: "Safety", note: step.safety });
  if (step.inspection) rows.push({ label: "ITP", note: step.inspection });
  return rows.slice(0, 9);
}

export function sampleCaption(timeline: AssemblyTimeline, timeMs: number, activeStepIndex?: number): CaptionState {
  const { steps, options } = timeline;
  const idx = activeStepIndex ?? activeStepIndexAt(timeline, timeMs);
  const progress = clamp01(timeline.totalMs > 0 ? timeMs / timeline.totalMs : 0);
  const base = {
    totalSteps: steps.length,
    companyName: options.companyName,
    projectName: options.projectName,
    dimensionsLine: timeline.dimensionsLine,
    progress,
    showDimensions: options.showDimensions,
    showCompanyTitle: options.showCompanyTitle,
  };

  if (idx < 0) {
    return { ...base, kind: "intro", stepNumber: 0, title: timeline.intro.title, subtitle: timeline.intro.subtitle, engineeringRows: [] };
  }
  if (idx >= steps.length) {
    return { ...base, kind: "outro", stepNumber: steps.length, title: timeline.outro.title, subtitle: timeline.outro.subtitle, engineeringRows: [] };
  }
  const step = steps[idx];
  const eng = options.mode === "engineering";
  const subtitle = eng && step.captionEngineering ? step.captionEngineering : step.captionCustomer;
  const rows = eng && options.showEngineeringCaptions ? engineeringRowsForStep(step) : [];
  return {
    ...base,
    kind: "step",
    stepNumber: step.index + 1,
    title: `STEP ${pad2(step.index + 1)} — ${step.title.toUpperCase()}`,
    subtitle,
    engineeringRows: rows,
  };
}

/* ----------------------------------------------------------------- whole-scene ----------------- */

/** Camera + caption + phase + progress at `timeMs`. Per-part states are sampled separately in the
 *  render loop (from the precomputed schedule) to avoid a per-frame Map allocation. */
export function sampleAssembly(timeline: AssemblyTimeline, timeMs: number): SceneSample {
  const t = Math.min(Math.max(timeMs, 0), timeline.totalMs);
  const idx = activeStepIndexAt(timeline, t);
  return {
    timeMs: t,
    progress: clamp01(timeline.totalMs > 0 ? t / timeline.totalMs : 0),
    stepIndex: idx,
    camera: sampleCamera(timeline, t),
    caption: sampleCaption(timeline, t, idx),
  };
}
