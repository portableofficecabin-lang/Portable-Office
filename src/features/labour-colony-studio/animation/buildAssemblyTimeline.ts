/**
 * LABOUR COLONY ASSEMBLY ANIMATION — the timeline builder (spec: "Timeline architecture").
 *
 * buildAssemblyTimeline(model, options) → a deterministic AssemblyTimeline generated ENTIRELY from the
 * shared ColonyModel: it groups the model's parts by their existing `assemblyStep` (the canonical
 * 24-step civil-led erection order in model/assembly.ts), DROPS steps that have no parts (a
 * single-storey colony simply skips the first-floor scenes; a colony with no veranda skips the walkway
 * scene), lays out contiguous timing, plans a cinematic camera per step framed on that step's own
 * component group, writes model-accurate captions with the step's member marks / connection marks /
 * bolt spec / tools / safety / ITP checkpoint, and precomputes a per-part fly-in schedule.
 *
 * DETERMINISM: the same model + the same options always produce an identical timeline. It reads only
 * the model (geometry, part ids, spec values already populated from the two priced take-offs) — never
 * the live BoqResult — so a rate change cannot alter the animation, and it never recomputes a price or
 * a quantity.
 *
 * COORDINATES: colony metres throughout (x=length, y=width, z=height); the three-space mapping is the
 * viewer's own (viewer3d/partGeometry). There is NO /1000 anywhere.
 *
 * Pure: no React / three / DOM.
 */

import type {
  ColonyAssemblyStep, ColonyModel, ColonyPart, ColonyPartKind,
} from "@/features/labour-colony-studio/model/types";
import {
  boxOfSolid, explodeOffset, quadOfSolid, sceneCtxOf, type SceneCtx,
} from "@/features/labour-colony-studio/viewer3d/partGeometry";
import {
  groupBoxOf, isCutawayShot, modelBoxOf, planShot, radiusOf, shotForStep, type Box3,
} from "./assemblyCamera";
import {
  boltSpecOf, boqRefsOf, buildColonyStepEngineeringRows, colonyContextOf, colonyDimensionsLine,
  colonySummaryLine, connectionMarksOf, describeColonyStep, memberMarksOf,
} from "./assemblyCaptions";
import type {
  AssemblyOptions, AssemblyTimeline, CameraKeyframe, PartScheduleEntry, TimelineStep, Vec3T,
} from "./assemblyTypes";

/** How far a part travels before settling (three metres), scaled by its explode vector. Colony-scale. */
const ASSEMBLY_GAP_M = 2.2;
/** Cap a single approach offset component so nothing flies absurdly far off-screen. */
const MAX_OFFSET_M = 6.0;
/** The last step that can carry parts (24 is the collapsed completed state, never assigned). */
const LAST_PART_STEP = 23;

/**
 * Outer skin / roof / ceiling / deck / walkway that must be GHOSTED during a cutaway (interior) step so
 * the camera can read the work being installed inside the envelope. The current step's own envelope
 * subject is never ghosted — assemblyMotion.samplePart excludes it.
 */
const ENVELOPE_KINDS = new Set<ColonyPartKind>([
  "ext-panel", "insulation", "int-finish", "roof-sheet", "ceiling", "partition",
  "floor-board", "floor-finish", "walkway-plate",
]);

export const DEFAULT_ASSEMBLY_OPTIONS: AssemblyOptions = {
  mode: "customer",
  background: "studio",
  companyName: "PORTABLE OFFICE CABIN",
  projectName: "",
  customerName: undefined,
  introMs: 2800,
  stepInstallMs: 1500,
  stepHoldMs: 1000,
  outroMs: 4600,
  autoCamera: true,
  showLabels: true,
  showDimensions: true,
  showEngineeringCaptions: true,
  showCompanyTitle: true,
  ghostFuture: false,
  dimInstalled: true,
};

/* ----------------------------------------------------------------- geometry helpers ------------ */

function partCenterThree(part: ColonyPart, ctx: SceneCtx, fallback: Vec3T): Vec3T {
  const b = boxOfSolid(part.solid, ctx);
  if (b) return b.center;
  const q = quadOfSolid(part.solid, ctx);
  if (q && q.length) {
    const c: Vec3T = [0, 0, 0];
    for (const p of q) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
    return [c[0] / q.length, c[1] / q.length, c[2] / q.length];
  }
  return fallback;
}

const clampC = (x: number): number => Math.max(-MAX_OFFSET_M, Math.min(MAX_OFFSET_M, x));
const finite3 = (v: Vec3T): boolean => v.every((n) => Number.isFinite(n));
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * The three-space displacement a part starts at before flying into place. Prefers the part's own
 * explode vector; when that is ~zero (wall panels, doors, windows, sockets — the model leaves their
 * explode at origin because it is resolved per-FACE) it derives a safe approach from the NEAREST
 * bounding-box face, so the part enters from OUTSIDE the wall / roof / floor it is mounted on rather
 * than flying THROUGH already-installed geometry.
 */
function approachOffset(part: ColonyPart, ctx: SceneCtx, modelBox: Box3): Vec3T {
  const exp = explodeOffset(part, 1, ASSEMBLY_GAP_M) as Vec3T;
  if (Math.hypot(exp[0], exp[1], exp[2]) >= ASSEMBLY_GAP_M * 0.15) {
    const capped: Vec3T = [clampC(exp[0]), clampC(exp[1]), clampC(exp[2])];
    return finite3(capped) ? capped : [0, ASSEMBLY_GAP_M, 0];
  }
  const c = partCenterThree(part, ctx, modelBox.center);
  // Distance from the part centre to each of the six bounding-box faces; the smallest is the face the
  // part is flush against (its mounting wall / roof / floor), so it enters from just outside that face.
  const faces: { d: number; dir: Vec3T }[] = [
    { d: modelBox.max[0] - c[0], dir: [1, 0, 0] }, { d: c[0] - modelBox.min[0], dir: [-1, 0, 0] },
    { d: modelBox.max[2] - c[2], dir: [0, 0, 1] }, { d: c[2] - modelBox.min[2], dir: [0, 0, -1] },
    { d: modelBox.max[1] - c[1], dir: [0, 1, 0] }, { d: c[1] - modelBox.min[1], dir: [0, -1, 0] },
  ];
  let best = faces[0];
  for (const f of faces) if (f.d < best.d) best = f;
  const dir = best.dir;
  const lift = dir[1] === 0 ? ASSEMBLY_GAP_M * 0.12 : 0; // horizontal approaches arc in slightly
  const off: Vec3T = [
    clampC(dir[0] * ASSEMBLY_GAP_M),
    clampC(dir[1] * ASSEMBLY_GAP_M + lift),
    clampC(dir[2] * ASSEMBLY_GAP_M),
  ];
  return finite3(off) ? off : [0, ASSEMBLY_GAP_M, 0];
}

/** Readable install order: sweep left→right (x), back→front (z), bottom→top (y). Deterministic —
 *  ties break on the stable part id, so the same model always yields the same order. */
function sortForInstall(parts: ColonyPart[], ctx: SceneCtx, modelCenter: Vec3T): ColonyPart[] {
  return parts
    .map((p) => ({ p, c: partCenterThree(p, ctx, modelCenter) }))
    .sort((a, b) =>
      a.c[0] - b.c[0] || a.c[2] - b.c[2] || a.c[1] - b.c[1] || a.p.id.localeCompare(b.p.id))
    .map((x) => x.p);
}

/* ----------------------------------------------------------------- the builder ----------------- */

export function buildAssemblyTimeline(
  model: ColonyModel,
  optionsOverride?: Partial<AssemblyOptions>,
): AssemblyTimeline {
  const options: AssemblyOptions = {
    ...DEFAULT_ASSEMBLY_OPTIONS,
    ...optionsOverride,
    projectName: optionsOverride?.projectName || model.meta.projectName || model.meta.title,
  };
  const ctx = colonyContextOf(model);
  const sceneCtx = sceneCtxOf(model);
  const modelBox = modelBoxOf(model.bounds, sceneCtx);
  const modelCenter = modelBox.center;
  const warnings: string[] = [];

  // group parts by their existing assemblyStep (1..23; 24 is the collapsed state, never a part)
  const byStep = new Map<ColonyAssemblyStep, ColonyPart[]>();
  for (const p of model.parts) {
    const list = byStep.get(p.assemblyStep);
    if (list) list.push(p);
    else byStep.set(p.assemblyStep, [p]);
  }
  const presentSteps = [...byStep.keys()]
    .filter((s) => s >= 1 && s <= LAST_PART_STEP)
    .sort((a, b) => a - b);

  const skipped = 24 - 1 - presentSteps.length;
  if (skipped > 0) {
    warnings.push(`${skipped} construction step${skipped === 1 ? "" : "s"} had no components in this design and were skipped.`);
  }

  const steps: TimelineStep[] = [];
  const schedule: PartScheduleEntry[] = [];
  let cursor = options.introMs;
  let prevTo: CameraKeyframe | null = null;

  presentSteps.forEach((assemblyStep, i) => {
    const rawParts = byStep.get(assemblyStep) ?? [];
    const parts = sortForInstall(rawParts, sceneCtx, modelCenter);
    const N = parts.length;

    // a step with many members gets a slightly longer fly-in so the sweep stays readable
    const installMs = Math.round(options.stepInstallMs * (1 + 0.45 * clamp01((N - 1) / 16)));
    const holdMs = options.stepHoldMs;
    const startMs = cursor;
    const endMs = startMs + installMs + holdMs;

    // per-part staggered fly-in windows, grouped into lanes so hundreds of members stay legible
    const lanes = Math.max(1, Math.min(N, 12));
    const staggerSpan = installMs * 0.55;
    const laneWindow = installMs * 0.45;
    parts.forEach((p, k) => {
      const lane = lanes > 1 ? Math.floor((k * lanes) / N) : 0;
      const laneFrac = lanes > 1 ? lane / (lanes - 1) : 0;
      const enterStartMs = startMs + laneFrac * staggerSpan;
      schedule.push({
        partId: p.id,
        stepIndex: i,
        assemblyStep,
        enterStartMs,
        enterEndMs: enterStartMs + laneWindow,
        enterOffset: approachOffset(p, sceneCtx, modelBox),
        envelope: ENVELOPE_KINDS.has(p.kind),
      });
    });

    // camera: framed on this step's group, chained from the previous step so motion is continuous
    const shot = shotForStep(assemblyStep);
    const groupBox = groupBoxOf(parts, sceneCtx) ?? modelBox;
    const to = planShot(shot, modelBox, groupBox);
    const from = prevTo ?? widenKeyframe(to, 1.18, modelBox);
    prevTo = to;

    const copy = describeColonyStep(assemblyStep, ctx, parts);
    const boqRef = boqRefsOf(parts);
    const stepWarnings = model.warnings
      .filter((w) => w.memberId != null && parts.some((p) => p.id === w.memberId))
      .map((w) => w.message);

    steps.push({
      id: `step-${assemblyStep}`,
      index: i,
      assemblyStep,
      title: copy.title,
      description: copy.description,
      captionCustomer: copy.captionCustomer,
      captionEngineering: copy.captionEngineering,
      memberMarks: memberMarksOf(parts),
      connectionMarks: connectionMarksOf(parts),
      boltSpec: boltSpecOf(parts),
      tools: copy.tools,
      safety: copy.safety,
      inspection: copy.inspection,
      partIds: parts.map((p) => p.id),
      startMs,
      installMs,
      holdMs,
      endMs,
      shot,
      cutaway: isCutawayShot(shot),
      camera: { from, to },
      engineering: withBoqRef(buildColonyStepEngineeringRows(parts), boqRef),
      warnings: stepWarnings,
    });
    cursor = endMs;
  });

  if (!steps.length) {
    warnings.push("No installable components found in the model — the animation will show only the intro and outro.");
  }

  const lastEnd = steps.length ? steps[steps.length - 1].endMs : options.introMs;
  const totalMs = lastEnd + options.outroMs;
  const dims = colonyDimensionsLine(ctx);

  return {
    steps,
    schedule,
    totalMs,
    introMs: options.introMs,
    outroMs: options.outroMs,
    bounds: model.bounds,
    sceneCtx,
    radius: radiusOf(modelBox),
    options,
    meta: model.meta,
    dimensionsLine: dims,
    intro: {
      title: options.showCompanyTitle ? options.companyName : options.projectName,
      subtitle: `${options.projectName} · ${colonySummaryLine(ctx)}`,
    },
    outro: {
      title: "ERECTION COMPLETE",
      subtitle: `${options.companyName} — ${options.projectName} built to the approved drawing set`,
    },
    warnings,
  };
}

/* ----------------------------------------------------------------- helpers --------------------- */

/** Append the step's BOQ line reference as a trailing row when the grouped rows carry none of their
 *  own (so the engineering caption always states where the step's quantities are priced). */
function withBoqRef(rows: ReturnType<typeof buildColonyStepEngineeringRows>, boqRef: string) {
  if (!boqRef || rows.some((r) => r.boqRef)) return rows;
  return [...rows, { label: "BOQ", note: boqRef }].slice(0, 6);
}

/** Pull a keyframe back from its target (used for the first step's opening move). */
function widenKeyframe(k: CameraKeyframe, factor: number, box: Box3): CameraKeyframe {
  const d: Vec3T = [k.position[0] - k.target[0], k.position[1] - k.target[1], k.position[2] - k.target[2]];
  return {
    position: [
      k.target[0] + d[0] * factor,
      k.target[1] + d[1] * factor + Math.max(0.4, box.size[1]) * 0.1,
      k.target[2] + d[2] * factor,
    ],
    target: k.target,
  };
}
