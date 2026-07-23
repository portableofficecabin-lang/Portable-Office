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
import { ASSEMBLY_SEQUENCE } from "@/features/labour-colony-studio/model/assembly";
import {
  boxOfSolid, explodeOffset, quadOfSolid, sceneCtxOf, type SceneCtx,
} from "@/features/labour-colony-studio/viewer3d/partGeometry";
import {
  groupBoxOf, isCutawayShot, modelBoxOf, planDetailShot, planShot, radiusOf, shotForStep,
  type Box3, type DetailFraming,
} from "./assemblyCamera";
import {
  boltSpecOf, boqRefsOf, buildColonyStepEngineeringRows, colonyContextOf, colonyDimensionsLine,
  colonySummaryLine, connectionMarksOf, describeColonyStep, describeDeckCoverStep,
  describeDeckStructureStep, describeFloorTubeInsert, describeRafterPlace,
  describeRafterSupportAssembly,
  memberMarksOf, type ColonyAssemblyContext, type ColonyStepCopy,
} from "./assemblyCaptions";
import {
  groupDetailAssemblies, planDetailTiming, type DetailAssemblyGroup,
} from "./assemblyDetailTour";
import type {
  AssemblyOptions, AssemblyTimeline, CameraKeyframe, CameraShotKind, DetailTourSummary,
  PartScheduleEntry, TimelineStep, Vec3T,
} from "./assemblyTypes";

/** How far a part travels before settling (three metres), scaled by its explode vector. Colony-scale. */
const ASSEMBLY_GAP_M = 2.2;
/** Cap a single approach offset component so nothing flies absurdly far off-screen. */
const MAX_OFFSET_M = 6.0;
/** The last step that can carry parts (24 is the collapsed completed state, never assigned). */
const LAST_PART_STEP = 23;
/** The canonical construction steps (24) — counted, never spelled, so no caption can go stale. */
export const CANONICAL_ASSEMBLY_STEPS = ASSEMBLY_SEQUENCE.length;

/**
 * Outer skin / roof / ceiling / deck / walkway that must be GHOSTED during a cutaway (interior) step so
 * the camera can read the work being installed inside the envelope. The current step's own envelope
 * subject is never ghosted — assemblyMotion.samplePart excludes it.
 *
 * The rafter-support COVERINGS are here for the same reason: during the per-assembly detail tour the
 * boards and panels already fixed in earlier shots would otherwise sit between the macro camera and
 * the next connection underneath them.
 */
const ENVELOPE_KINDS = new Set<ColonyPartKind>([
  "ext-panel", "insulation", "int-finish", "roof-sheet", "ceiling", "partition",
  "floor-board", "floor-finish", "walkway-plate",
  "rsup-cement-sheet", "rsup-puf-roof-panel",
]);

export const DEFAULT_ASSEMBLY_OPTIONS: AssemblyOptions = {
  mode: "customer",
  // The film opens on the realistic site backdrop by default — the same sky / grass / haze world
  // the 3D viewer shows — so the exported video reads as a building on a site, not a CAD dump.
  background: "realistic",
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
  // OFF by default: dimming every installed member to 70% turns the whole structure translucent
  // (transparent materials also lose depth-write), which reads as a blurry X-ray once a few dozen
  // members overlap. The film defaults to a CLEAR solid build-up — the current step still pops via
  // its highlight — and the "Dim installed" toggle remains for anyone who wants the old emphasis.
  dimInstalled: false,
  // AUTO: the per-assembly zoomed tour switches itself on exactly when the model carries rafter
  // support assemblies, so nothing changes for a colony that does not build the system.
  detailTour: undefined,
  // 2.2 s on each finished connection is long enough to read a bolt head, a nut and the thread past
  // it — the shot the user's site photograph is asking for.
  detailDwellMs: 2200,
  // 5 minutes of tour. With the ~1 minute the ordinary 24-step sequence takes, a typical G+1 colony
  // lands at roughly 6 minutes — inside the "5min or 7minutes also find" band the user accepted —
  // and stays there whether the colony has 40 connections or 200, because the shot length divides
  // this budget rather than multiplying out of control.
  detailTourBudgetMs: 300_000,
  // 0 = visit EVERY assembly. A partial tour would misrepresent the building, so a cap is only ever
  // applied when the admin explicitly asks for one (or the absolute hard cap trips), and it is
  // reported in the caption and the warnings either way.
  detailTourMaxAssemblies: 0,
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

/**
 * ERECTION PHASE within a construction step — the build-up order the site actually follows, and the
 * order the user asked the film to show on the floor decks: the rafter goes in FIRST, then its
 * bolted plates, then the MS pipe frame over it, and only then the deck layers. Kinds not listed
 * share phase 0 and keep the plain spatial sweep. Applies to every step (structure before its own
 * covering is the right order everywhere), and is fully deterministic.
 */
const INSTALL_PHASE: Partial<Record<ColonyPartKind, number>> = {
  joist: 0, "joist-web": 0,
  cleat: 1, weld: 1,
  bolt: 2, nut: 2, washer: 2,
  "floor-tube": 3,
  noggin: 4,
  "floor-board": 5,
  "floor-sheet": 6,
  "floor-finish": 7,
};

/** Readable install order: erection phase first (structure before covering), then sweep
 *  left→right (x), back→front (z), bottom→top (y). Deterministic — ties break on the stable part
 *  id, so the same model always yields the same order. */
function sortForInstall(parts: ColonyPart[], ctx: SceneCtx, modelCenter: Vec3T): ColonyPart[] {
  return parts
    .map((p) => ({ p, c: partCenterThree(p, ctx, modelCenter), ph: INSTALL_PHASE[p.kind] ?? 0 }))
    .sort((a, b) =>
      a.ph - b.ph || a.c[0] - b.c[0] || a.c[2] - b.c[2] || a.c[1] - b.c[1] || a.p.id.localeCompare(b.p.id))
    .map((x) => x.p);
}

/* ----------------------------------------------------------------- detail framing -------------- */

/**
 * How the macro camera should approach ONE connection, DERIVED from the parts the model emitted:
 *
 *   • `webNormal` — the horizontal vector from the C-purlin to the MS tube. That is the side the tube
 *     is bolted to, so approaching from it shows the flush face, the bolt head, the nut and the
 *     thread projecting past it. Approaching from the other side would show the purlin's back, where
 *     the flanges turn away and hide the joint entirely.
 *   • `buildSign` — +1 when the assembly builds UP off the rafter (a roof level), −1 when it hangs
 *     DOWN under the beam (a ceiling level), so the covering it carries never ends up between the
 *     lens and the joint.
 *
 * Both are OBSERVED from part positions (and from the resolved level kind as a fallback) — no
 * geometry, spacing or normal is recomputed here; `rafterSupport.ts` remains the only place that
 * derives them.
 */
function detailFramingOf(
  group: DetailAssemblyGroup,
  focusBox: Box3,
  neighbours: RunNeighbours,
  sceneCtx: SceneCtx,
  modelCenter: Vec3T,
  capt: ColonyAssemblyContext,
): DetailFraming {
  const centreOf = (kind: ColonyPartKind): Vec3T | null => {
    const p = group.parts.find((x) => x.kind === kind);
    return p ? partCenterThree(p, sceneCtx, modelCenter) : null;
  };

  // The tube and the purlin are emitted as CONTINUOUS run members, so they usually belong to the
  // step's overview shot rather than to this connection's own parts. Take whichever pair is nearest
  // to the joint (measured to the member's box, not its mid-length centre, so a 12 m member on the
  // right line always beats a nearer-centred member on the wrong one) and fall back to the
  // connection's own parts when the runs are not in this step at all.
  const tube = nearestRunCentre(neighbours.tubes, focusBox.center) ?? centreOf("rsup-ms-tube");
  const purlin = nearestRunCentre(neighbours.purlins, focusBox.center) ?? centreOf("rsup-c-purlin");
  const cleat = centreOf("rsup-cleat-plate");

  let webNormal: Vec3T | undefined;
  if (tube && purlin) {
    const v: Vec3T = [tube[0] - purlin[0], 0, tube[2] - purlin[2]];
    if (Math.hypot(v[0], v[2]) > 1e-4 && finite3(v)) webNormal = v;
  }

  // the level knows which way the assembly builds; geometry is the fallback when it does not resolve
  const levelKind = capt.rafterSupport?.byMark[group.mark]?.levelKind;
  let buildSign = levelKind === "ceiling" ? -1 : levelKind === "roof" ? 1 : 0;
  if (buildSign === 0 && tube && cleat) buildSign = tube[1] >= cleat[1] ? 1 : -1;
  if (buildSign === 0) buildSign = 1;

  return { webNormal, buildSign };
}

/** The continuous C-purlin / MS tube runs of one construction step, boxed once and reused per shot. */
interface RunNeighbours {
  purlins: Box3[];
  tubes: Box3[];
}

/** Box every continuous run member of a step ONCE, so the per-shot framing lookup stays cheap. */
function runNeighboursOf(parts: ColonyPart[], sceneCtx: SceneCtx): RunNeighbours {
  const boxesOf = (kind: ColonyPartKind): Box3[] => {
    const out: Box3[] = [];
    for (const p of parts) {
      if (p.kind !== kind) continue;
      const b = groupBoxOf([p], sceneCtx);
      if (b) out.push(b);
    }
    return out;
  };
  return { purlins: boxesOf("rsup-c-purlin"), tubes: boxesOf("rsup-ms-tube") };
}

/** Squared distance from a point to an axis-aligned box (0 inside). */
function distToBox(box: Box3, p: Vec3T): number {
  let d = 0;
  for (let i = 0; i < 3; i++) {
    const over = Math.max(box.min[i] - p[i], 0, p[i] - box.max[i]);
    d += over * over;
  }
  return d;
}

/** The centre of the run member closest to `p`, or null when there is none. */
function nearestRunCentre(boxes: Box3[], p: Vec3T): Vec3T | null {
  let best: Box3 | null = null;
  let bestD = Infinity;
  for (const b of boxes) {
    const d = distToBox(b, p);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best ? best.center : null;
}

/** One construction step's plan: the ordinary work, plus the assemblies that get their own shot. */
interface StepPlan {
  assemblyStep: ColonyAssemblyStep;
  /** Parts installed in the step's overview shot (everything not toured). */
  main: ColonyPart[];
  /** Assemblies that get a zoomed detail shot each, in natural cleat-mark order. */
  groups: DetailAssemblyGroup[];
  /** Assemblies folded back into `main` because a tour cap applied — reported, never silent. */
  absorbed: number;
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

  const skipped = CANONICAL_ASSEMBLY_STEPS - 1 - presentSteps.length;
  if (skipped > 0) {
    warnings.push(`${skipped} construction step${skipped === 1 ? "" : "s"} had no components in this design and were skipped.`);
  }

  /* ---------------------------------------------------------------- the detail tour -------------
   * The user's requirement is that EVERY rafter connection is shown, zoomed, being built up. Those
   * connections all live inside construction step 18 (steel) and 19 (covering), and
   * `ColonyAssemblyStep` is a closed 1..24 union that must never be renumbered — so each of those
   * steps is split into an overview shot plus one SUB-STEP per assembly.
   *
   * PARTITION: `groupDetailAssemblies` splits a step's parts into disjoint per-connection groups and
   * the leftover `rest`; the union is the input. Capped groups are folded straight back into `main`,
   * so no matter which branch runs, every part of the step is scheduled exactly once — the invariant
   * `validateAssemblyTimeline` proves globally. */
  const wantTour = options.detailTour !== false;
  const plans: StepPlan[] = presentSteps.map((assemblyStep) => {
    const raw = byStep.get(assemblyStep) ?? [];
    if (!wantTour) return { assemblyStep, main: raw, groups: [], absorbed: 0 };
    const { groups, rest } = groupDetailAssemblies(raw);
    return { assemblyStep, main: rest, groups, absorbed: 0 };
  });

  const foundAssemblies = plans.reduce((a, p) => a + p.groups.length, 0);
  const timing = planDetailTiming(foundAssemblies, options);
  const tourOn = wantTour && foundAssemblies > 0 && timing.toured > 0;

  // apply the tour quota in GLOBAL order (construction step, then natural cleat mark), folding every
  // untoured assembly back into its own step's overview shot rather than dropping it
  let quota = tourOn ? timing.toured : 0;
  for (const plan of plans) {
    if (quota >= plan.groups.length) {
      quota -= plan.groups.length;
      continue;
    }
    const keep = Math.max(0, quota);
    const dropped = plan.groups.slice(keep);
    plan.groups = plan.groups.slice(0, keep);
    plan.absorbed = dropped.length;
    for (const g of dropped) plan.main.push(...g.parts);
    quota = 0;
  }

  if (timing.capped && foundAssemblies > 0) {
    warnings.push(
      `The zoomed detail tour covers the first ${timing.toured} of ${foundAssemblies} rafter-support assemblies; `
      + `the remaining ${foundAssemblies - timing.toured} are erected together in their construction step. `
      + `Raise the tour limit to visit them all.`,
    );
  }

  const steps: TimelineStep[] = [];
  const schedule: PartScheduleEntry[] = [];
  let cursor = options.introMs;
  let prevTo: CameraKeyframe | null = null;

  /** Append one shot: schedules its parts, chains the camera and advances the playhead. */
  const pushStep = (spec: {
    assemblyStep: ColonyAssemblyStep;
    /** already in install order. */
    parts: ColonyPart[];
    installMs: number;
    holdMs: number;
    shot: CameraShotKind;
    /** the pose the shot settles on. */
    to: CameraKeyframe;
    copy: ColonyStepCopy;
    subIndex?: number;
    subTitle?: string;
    focusPartIds?: string[];
  }): void => {
    const i = steps.length;
    const { assemblyStep, parts, installMs, holdMs } = spec;
    const N = parts.length;
    const startMs = cursor;
    const endMs = startMs + installMs + holdMs;

    // per-part staggered fly-in windows, grouped into lanes so hundreds of members stay legible —
    // and so a detail shot's cleat, bolts, nuts, purlin and tube land one visibly after another
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

    // camera chained from the previous shot so the move is always continuous — never a cut
    const from = prevTo ?? widenKeyframe(spec.to, 1.18, modelBox);
    prevTo = spec.to;

    const boqRef = boqRefsOf(parts);
    const stepWarnings = model.warnings
      .filter((w) => w.memberId != null && parts.some((p) => p.id === w.memberId))
      .map((w) => w.message);

    steps.push({
      id: spec.subIndex === undefined ? `step-${assemblyStep}` : `step-${assemblyStep}-${spec.subIndex}`,
      index: i,
      assemblyStep,
      ...(spec.subIndex === undefined
        ? {}
        : { subIndex: spec.subIndex, subTitle: spec.subTitle, focusPartIds: spec.focusPartIds }),
      title: spec.copy.title,
      description: spec.copy.description,
      captionCustomer: spec.copy.captionCustomer,
      captionEngineering: spec.copy.captionEngineering,
      memberMarks: memberMarksOf(parts),
      connectionMarks: connectionMarksOf(parts),
      boltSpec: boltSpecOf(parts),
      tools: spec.copy.tools,
      safety: spec.copy.safety,
      inspection: spec.copy.inspection,
      partIds: parts.map((p) => p.id),
      startMs,
      installMs,
      holdMs,
      endMs,
      shot: spec.shot,
      cutaway: isCutawayShot(spec.shot),
      camera: { from, to: spec.to },
      engineering: withBoqRef(buildColonyStepEngineeringRows(parts), boqRef),
      warnings: stepWarnings,
    });
    cursor = endMs;
  };

  let touredSoFar = 0;
  for (const plan of plans) {
    const { assemblyStep } = plan;

    /* ---- the step's overview shot: everything not individually toured ---- */
    // Emitted whenever it carries parts. It is skipped ONLY when every part of the step went into a
    // detail shot, because a step with no parts is a caption with nothing behind it.
    const deckTubes = assemblyStep === 8 ? plan.main.filter((p) => p.kind === "floor-tube") : [];
    if (plan.main.length > 0 && deckTubes.length > 0) {
      /* THE DECK IS FILMED AS A SEQUENCE (user spec): rafters set & LOCKED first, then each MS tube
       * INSERTED ONE BY ONE — its own sub-step, sliding in lengthwise with its seat bolts — and only
       * then the covering. Never all tubes at once. The three phases partition the step's parts, so
       * "every part scheduled exactly once" still holds. */
      const keyOfTube = (p: ColonyPart): string | null => {
        const mt = /^(gf|f\d+):tube:(\d+)$/.exec(p.id);
        return mt ? `${mt[1]}:${mt[2]}` : null;
      };
      const keyOfHw = (p: ColonyPart): string | null => {
        const mh = /^ftube:(gf|f\d+):\d+:(\d+)$/.exec(p.connectionId ?? "");
        return mh ? `${mh[1]}:${mh[2]}` : null;
      };
      const hwByKey = new Map<string, ColonyPart[]>();
      const rest: ColonyPart[] = [];
      for (const p of plan.main) {
        if (p.kind === "floor-tube") continue;
        const hk = keyOfHw(p);
        if (hk) {
          const arr = hwByKey.get(hk);
          if (arr) arr.push(p); else hwByKey.set(hk, [p]);
        } else rest.push(p);
      }
      const COVER_KINDS = new Set<ColonyPartKind>(["noggin", "floor-board", "floor-sheet", "floor-finish"]);
      const pre = rest.filter((p) => !COVER_KINDS.has(p.kind));
      const post = rest.filter((p) => COVER_KINDS.has(p.kind));

      /* ZOOMED framing: never frame a whole 20 m member — crop the framing box's longest axis to a
       * few metres around its centre so every rafter placement and tube insertion is watched CLOSE
       * enough to read the plates, bolts, washers and nuts going in (user spec). */
      const cropForZoom = (b: Box3, maxLen: number): Box3 => {
        const li = b.size.indexOf(Math.max(...b.size));
        if (b.size[li] <= maxLen) return b;
        const min = [...b.min] as Vec3T;
        const max = [...b.max] as Vec3T;
        const size = [...b.size] as Vec3T;
        min[li] = b.center[li] - maxLen / 2;
        max[li] = b.center[li] + maxLen / 2;
        size[li] = maxLen;
        return { min, max, size, center: [...b.center] as Vec3T };
      };

      /* ---- EVERY RAFTER IS ITS OWN ZOOMED SHOT (user spec): the member lands, then its plates,
       * bolts, washers and nuts fit ON CAMERA, one rafter at a time — before any tube moves. */
      const rafterKeyOf = (p: ColonyPart): string | null => {
        let mm = /^gf:side-rafter:(rear|front)/.exec(p.id);
        if (mm) return `gf:side:${mm[1]}`;
        mm = /^(gf|f\d+):(?:joist|rafter):(\d+):(\d+)/.exec(p.id);
        if (mm) return `${mm[1]}:${parseInt(mm[2], 10)}:${parseInt(mm[3], 10)}`;
        const c = p.connectionId ?? "";
        mm = /^(?:joist|rend):(gf|f\d+):(\d+):(\d+):/.exec(c);
        if (mm) return `${mm[1]}:${parseInt(mm[2], 10) - 1}:${parseInt(mm[3], 10) - 1}`;
        mm = /^rend:gf:(rear|front):/.exec(c);
        if (mm) return `gf:side:${mm[1]}`;
        mm = /^srafter:(rear|front):/.exec(c);
        if (mm) return `gf:side:${mm[1]}`;
        return null;
      };
      const rafterGroups = new Map<string, ColonyPart[]>();
      const preCommon: ColonyPart[] = [];
      for (const p of pre) {
        const rk = rafterKeyOf(p);
        if (rk) {
          const arr = rafterGroups.get(rk);
          if (arr) arr.push(p); else rafterGroups.set(rk, [p]);
        } else preCommon.push(p);
      }
      const rafterFloorOf = (k: string): number => {
        if (k.startsWith("gf:")) return 0;
        const mf = /^f(\d+):/.exec(k);
        return mf ? parseInt(mf[1], 10) : 0;
      };
      const rafterKeys = [...rafterGroups.keys()].sort((a, b) =>
        rafterFloorOf(a) - rafterFloorOf(b) || a.localeCompare(b, undefined, { numeric: true }));

      let sub = 0;
      if (preCommon.length) {
        const parts = sortForInstall(preCommon, sceneCtx, modelCenter);
        const installMs = Math.round(options.stepInstallMs * (1 + 0.45 * clamp01((parts.length - 1) / 16)));
        pushStep({
          assemblyStep, parts, installMs, holdMs: options.stepHoldMs,
          shot: "floor-deck", to: planShot("floor-deck", modelBox, groupBoxOf(parts, sceneCtx) ?? modelBox),
          copy: describeDeckStructureStep(preCommon),
        });
      }
      rafterKeys.forEach((rk, ri) => {
        const group = rafterGroups.get(rk) ?? [];
        const chord = group.find((p) => p.kind === "joist") ?? group[0];
        const parts = sortForInstall(group, sceneCtx, modelCenter);
        const focusBox = groupBoxOf(parts, sceneCtx) ?? modelBox;
        const copy = describeRafterPlace(chord, ri + 1, rafterKeys.length);
        sub += 1;
        pushStep({
          assemblyStep, parts,
          installMs: Math.round(options.stepInstallMs * 0.8), holdMs: 300,
          shot: "floor-deck",
          /* planDetailShot frames the CROPPED member box alone — the genuinely zoomed pose planShot's
           * whole-model distance floor can never reach — so the plates and nut-bolts are readable. */
          to: planDetailShot(cropForZoom(focusBox, 3.0), modelBox),
          copy, subIndex: sub, subTitle: copy.subTitle, focusPartIds: [chord.id],
        });
      });

      const tubesOrdered = [...deckTubes].sort(
        (a, b) => (a.floor ?? 0) - (b.floor ?? 0) || a.id.localeCompare(b.id),
      );
      const consumed = new Set<string>();
      tubesOrdered.forEach((tube, ti) => {
        const key = keyOfTube(tube);
        const hw = key ? hwByKey.get(key) ?? [] : [];
        if (key) consumed.add(key);
        const parts = [tube, ...sortForInstall(hw, sceneCtx, modelCenter)];
        const copy = describeFloorTubeInsert(tube, ti + 1, tubesOrdered.length);
        sub += 1;
        pushStep({
          assemblyStep, parts,
          installMs: Math.round(options.stepInstallMs * 0.9), holdMs: 400,
          shot: "floor-deck",
          /* Zoomed on a few metres of the tube's run — the tube slides INTO the frame lengthwise. */
          to: planDetailShot(cropForZoom(groupBoxOf(parts, sceneCtx) ?? modelBox, 3.0), modelBox),
          copy, subIndex: sub, subTitle: copy.subTitle, focusPartIds: [tube.id],
        });
      });
      // hardware whose tube never emitted (defensive) — never dropped, it closes with the covering
      for (const [hk, arr] of hwByKey) if (!consumed.has(hk)) post.push(...arr);

      if (post.length) {
        const parts = sortForInstall(post, sceneCtx, modelCenter);
        const installMs = Math.round(options.stepInstallMs * (1 + 0.45 * clamp01((parts.length - 1) / 16)));
        sub += 1;
        pushStep({
          assemblyStep, parts, installMs, holdMs: options.stepHoldMs,
          shot: "floor-deck", to: planShot("floor-deck", modelBox, groupBoxOf(parts, sceneCtx) ?? modelBox),
          copy: describeDeckCoverStep(ctx, post),
          subIndex: sub, subTitle: "Deck boards & floor sheets",
        });
      }
    } else if (plan.main.length > 0) {
      const parts = sortForInstall(plan.main, sceneCtx, modelCenter);
      const N = parts.length;
      const installMs = Math.round(options.stepInstallMs * (1 + 0.45 * clamp01((N - 1) / 16)));
      const shot = shotForStep(assemblyStep);
      const groupBox = groupBoxOf(parts, sceneCtx) ?? modelBox;
      const copy = describeColonyStep(assemblyStep, ctx, parts);
      pushStep({
        assemblyStep,
        parts,
        installMs,
        holdMs: options.stepHoldMs,
        shot,
        to: planShot(shot, modelBox, groupBox),
        copy: plan.absorbed > 0 ? withAbsorbedNotice(copy, plan.absorbed, timing.toured) : copy,
      });
    }

    /* ---- one zoomed shot per assembly ---- */
    // The C-purlin and the MS tube are emitted as continuous RUN members, so they normally sit in
    // the overview shot rather than in a connection's own parts. Box them once here: every detail
    // shot uses the pair nearest its joint to decide which side of the web to approach from.
    const neighbours = plan.groups.length ? runNeighboursOf(plan.main, sceneCtx) : { purlins: [], tubes: [] };
    plan.groups.forEach((group, k) => {
      touredSoFar += 1;
      const parts = group.parts;                      // already in erection order
      const focus = group.focusParts.length ? group.focusParts : parts;
      const focusBox = groupBoxOf(focus, sceneCtx) ?? groupBoxOf(parts, sceneCtx) ?? modelBox;
      const copy = describeRafterSupportAssembly(ctx, group, touredSoFar, timing.toured);
      pushStep({
        assemblyStep,
        parts,
        installMs: timing.installMs,
        holdMs: timing.holdMs,
        shot: "detail-closeup",
        to: planDetailShot(
          focusBox, modelBox, detailFramingOf(group, focusBox, neighbours, sceneCtx, modelCenter, ctx),
        ),
        copy,
        subIndex: k + 1,
        subTitle: copy.subTitle,
        focusPartIds: focus.map((p) => p.id),
      });
    });
  }

  if (!steps.length) {
    warnings.push("No installable components found in the model — the animation will show only the intro and outro.");
  }

  const detailTour: DetailTourSummary = {
    enabled: tourOn,
    assemblies: foundAssemblies,
    toured: tourOn ? timing.toured : 0,
    capped: tourOn && timing.capped,
    installMs: tourOn ? timing.installMs : 0,
    holdMs: tourOn ? timing.holdMs : 0,
    tourMs: tourOn ? timing.toured * timing.shotMs : 0,
  };

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
    detailTour,
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

/**
 * Say, in the step's own caption, that some assemblies were erected together rather than toured.
 *
 * A tour that quietly stopped after N connections would misrepresent the building — the user asked
 * for "complete detail" — so when a cap applies the overview shot states exactly how many assemblies
 * it is erecting in one go and how many got their own shot.
 */
function withAbsorbedNotice(copy: ColonyStepCopy, absorbed: number, toured: number): ColonyStepCopy {
  const notice =
    ` The zoomed detail tour covers ${toured} assembl${toured === 1 ? "y" : "ies"} individually; `
    + `the remaining ${absorbed} at this step ${absorbed === 1 ? "is" : "are"} erected together in this shot.`;
  return {
    ...copy,
    description: copy.description + notice,
    captionEngineering: copy.captionEngineering + notice,
  };
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
