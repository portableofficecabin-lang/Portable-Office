/**
 * ANIMATED CABIN ASSEMBLY — the timeline builder (spec: "Timeline architecture").
 *
 * buildAssemblyTimeline(model, boqResult, options) → a deterministic AssemblyTimeline generated
 * ENTIRELY from the shared CabinModel: it groups the model's parts by their existing `assemblyStep`,
 * drops steps that have no parts (so a cabin with no plumbing / partition / furniture simply skips
 * those scenes), lays out contiguous timing, plans a cinematic camera per step framed on that step's
 * component group, writes material-accurate captions and precomputes a per-part fly-in schedule.
 *
 * It stores only part IDs + transforms that REFERENCE the model — never a copy of the geometry — so a
 * BOQ rate change (which never touches geometry) does not rebuild the timeline, and a geometry change
 * does. Pure: no React / three / DOM; unit-testable under tsx.
 */

import type {
  AssemblyStep, CabinModel, CabinPart, Vec3,
} from "@/features/cabin-design/model/types";
import type { BoqResult } from "@/lib/boq/types";
import { isStorageProduct, isToiletCabin } from "@/components/home/cabin-calculator/pricing";
import {
  boxOfSolid, explodeOffset, quadOfSolid, sceneCtxOf, type SceneCtx,
} from "@/features/cabin-design/viewer3d/partGeometry";
import {
  groupBoxOf, isCutawayShot, modelBoxOf, planShot, radiusOf, shotForStep, type Box3,
} from "./assemblyCamera";
import {
  buildStepEngineeringRows, describeStep, dimensionsLine, summaryLine, type AssemblyContext,
} from "./assemblyCaptions";
import type {
  AssemblyOptions, AssemblyTimeline, CameraKeyframe, PartScheduleEntry, TimelineStep, Vec3T,
} from "./assemblyTypes";

/** How far a part travels before settling (three metres), scaled by its explode vector. */
const ASSEMBLY_GAP_M = 1.3;
/** Cap a single approach offset component so nothing flies absurdly far off-screen. */
const MAX_OFFSET_M = 3.5;

/** Outer skin / roof / ceiling that must be ghosted during a cutaway (interior) step. */
const ENVELOPE_KINDS = new Set<CabinPart["kind"]>(["ext-panel", "int-finish", "insulation", "roof-sheet", "ceiling"]);

export const DEFAULT_ASSEMBLY_OPTIONS: AssemblyOptions = {
  mode: "customer",
  background: "studio",
  companyName: "PORTABLE OFFICE CABIN",
  projectName: "",
  customerName: undefined,
  introMs: 2500,
  stepInstallMs: 1400,
  stepHoldMs: 950,
  outroMs: 4200,
  autoCamera: true,
  showLabels: true,
  showDimensions: true,
  showEngineeringCaptions: true,
  showCompanyTitle: true,
  ghostFuture: false,
  dimInstalled: true,
};

/* ----------------------------------------------------------------- context --------------------- */

/** Presentation facts, derived from the model (part kinds + labels + meta) — no config needed. */
function contextOf(model: CabinModel): AssemblyContext {
  const parts = model.parts;
  const puf = parts.some((p) => p.kind === "ext-panel" && /puf/i.test(p.label));
  return {
    puf,
    insulated: parts.some((p) => p.kind === "insulation"),
    lined: parts.some((p) => p.kind === "int-finish"),
    sloped: model.meta.sloped,
    container: isStorageProduct(model.meta.productId),
    toilet: isToiletCabin(model.meta.productId),
    roomCount: model.meta.rooms,
    hasPartition: parts.some((p) => p.kind === "partition"),
    hasSlidingPartition: parts.some((p) => p.kind === "door" && /slid/i.test(`${p.label} ${p.id}`)),
    roofType: model.meta.roofType,
    lengthFt: model.meta.lengthFt,
    widthFt: model.meta.widthFt,
    heightFt: model.meta.heightFt,
  };
}

/* ----------------------------------------------------------------- geometry helpers ------------ */

function partCenterThree(part: CabinPart, ctx: SceneCtx, fallback: Vec3T): Vec3T {
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

/**
 * The three-space displacement a part starts at before flying into place. Prefers the part's own
 * explode vector; when that is ~zero (walls, doors, windows, sockets — the model leaves their explode
 * at origin) it derives a safe approach from the NEAREST bounding-box face, so the part enters from
 * OUTSIDE the wall/roof it is mounted on (a door flush against the front wall enters from the front,
 * not through the adjacent end wall it happens to sit near). This never routes a part through the
 * installed geometry it belongs against.
 */
function approachOffset(part: CabinPart, ctx: SceneCtx, modelBox: Box3): Vec3T {
  const exp = explodeOffset(part, 1, ASSEMBLY_GAP_M) as Vec3T;
  if (Math.hypot(exp[0], exp[1], exp[2]) >= ASSEMBLY_GAP_M * 0.15) {
    return [clampC(exp[0]), clampC(exp[1]), clampC(exp[2])];
  }
  const c = partCenterThree(part, ctx, modelBox.center);
  // distance from the part centre to each of the six bounding-box faces; the smallest is the face the
  // part is flush against (its mounting wall/roof/floor), so it enters from just outside that face.
  const faces: { d: number; dir: Vec3T }[] = [
    { d: modelBox.max[0] - c[0], dir: [1, 0, 0] }, { d: c[0] - modelBox.min[0], dir: [-1, 0, 0] },
    { d: modelBox.max[2] - c[2], dir: [0, 0, 1] }, { d: c[2] - modelBox.min[2], dir: [0, 0, -1] },
    { d: modelBox.max[1] - c[1], dir: [0, 1, 0] }, { d: c[1] - modelBox.min[1], dir: [0, -1, 0] },
  ];
  let best = faces[0];
  for (const f of faces) if (f.d < best.d) best = f;
  const dir = best.dir;
  const lift = dir[1] === 0 ? ASSEMBLY_GAP_M * 0.12 : 0; // horizontal approaches arc in slightly
  const off: Vec3T = [clampC(dir[0] * ASSEMBLY_GAP_M), clampC(dir[1] * ASSEMBLY_GAP_M + lift), clampC(dir[2] * ASSEMBLY_GAP_M)];
  return finite3(off) ? off : [0, ASSEMBLY_GAP_M, 0];
}

/** Readable install order: sweep left→right (x), back→front (z), bottom→top (y). Deterministic. */
function sortForInstall(parts: CabinPart[], ctx: SceneCtx, modelCenter: Vec3T): CabinPart[] {
  return parts
    .map((p) => ({ p, c: partCenterThree(p, ctx, modelCenter) }))
    .sort((a, b) =>
      a.c[0] - b.c[0] || a.c[2] - b.c[2] || a.c[1] - b.c[1] || a.p.id.localeCompare(b.p.id))
    .map((x) => x.p);
}

/* ----------------------------------------------------------------- the builder ----------------- */

export function buildAssemblyTimeline(
  model: CabinModel,
  boqResult: BoqResult | null | undefined,
  optionsOverride?: Partial<AssemblyOptions>,
): AssemblyTimeline {
  const options: AssemblyOptions = {
    ...DEFAULT_ASSEMBLY_OPTIONS,
    ...optionsOverride,
    projectName: optionsOverride?.projectName || model.meta.title,
  };
  const ctx = contextOf(model);
  const sceneCtx = sceneCtxOf(model);
  const modelBox = modelBoxOf(model.bounds, sceneCtx);
  const modelCenter = modelBox.center;
  const warnings: string[] = [];

  // group parts by their existing assemblyStep (1..16; 17 is the collapsed state, never a part)
  const byStep = new Map<AssemblyStep, CabinPart[]>();
  for (const p of model.parts) {
    if (!byStep.has(p.assemblyStep)) byStep.set(p.assemblyStep, []);
    byStep.get(p.assemblyStep)!.push(p);
  }
  const presentSteps = [...byStep.keys()].filter((s) => s >= 1 && s <= 16).sort((a, b) => a - b);

  const steps: TimelineStep[] = [];
  const schedule: PartScheduleEntry[] = [];
  let cursor = options.introMs;
  let prevTo: CameraKeyframe | null = null;

  presentSteps.forEach((assemblyStep, i) => {
    const rawParts = byStep.get(assemblyStep)!;
    const parts = sortForInstall(rawParts, sceneCtx, modelCenter);
    const N = parts.length;

    const installMs = Math.round(options.stepInstallMs * (1 + 0.4 * clamp01((N - 1) / 12)));
    const holdMs = options.stepHoldMs;
    const startMs = cursor;
    const endMs = startMs + installMs + holdMs;

    // per-part staggered fly-in windows (grouped into lanes so hundreds of parts stay readable)
    const lanes = Math.max(1, Math.min(N, 10));
    const staggerSpan = installMs * 0.55;
    const laneWindow = installMs * 0.45;
    parts.forEach((p, k) => {
      const lane = lanes > 1 ? Math.floor((k * lanes) / N) : 0;
      const laneFrac = lanes > 1 ? lane / (lanes - 1) : 0;
      const enterStartMs = startMs + laneFrac * staggerSpan;
      const enterOffset = approachOffset(p, sceneCtx, modelBox);
      schedule.push({
        partId: p.id,
        stepIndex: i,
        assemblyStep,
        enterStartMs,
        enterEndMs: enterStartMs + laneWindow,
        enterOffset,
        envelope: ENVELOPE_KINDS.has(p.kind),
      });
    });

    // camera: framed on this step's group, chained from the previous step for continuous motion
    const shot = shotForStep(assemblyStep);
    const groupBox = groupBoxOf(parts, sceneCtx) ?? modelBox;
    const to = planShot(shot, modelBox, groupBox);
    const from = prevTo ?? widenKeyframe(to, 1.15, modelBox);
    prevTo = to;

    const copy = describeStep(assemblyStep, ctx, parts);
    steps.push({
      id: `step-${assemblyStep}`,
      index: i,
      assemblyStep,
      title: copy.title,
      description: copy.description,
      captionCustomer: copy.captionCustomer,
      captionEngineering: copy.captionEngineering,
      partIds: parts.map((p) => p.id),
      startMs,
      installMs,
      holdMs,
      endMs,
      shot,
      cutaway: isCutawayShot(shot),
      camera: { from, to },
      engineering: buildStepEngineeringRows(parts, model, boqResult),
      warnings: [],
    });
    cursor = endMs;
  });

  if (!steps.length) warnings.push("No installable components found in the model — the animation will show only the intro/outro.");

  const lastEnd = steps.length ? steps[steps.length - 1].endMs : options.introMs;
  const totalMs = lastEnd + options.outroMs;

  const dims = dimensionsLine(ctx);
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
      subtitle: `${options.projectName} · ${summaryLine(ctx)}`,
    },
    outro: {
      title: "ASSEMBLY COMPLETE",
      subtitle: `${options.companyName} — Designed & manufactured to configuration`,
    },
    warnings,
  };
}

/* ----------------------------------------------------------------- helpers --------------------- */

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

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
