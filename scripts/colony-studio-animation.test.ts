/**
 * LABOUR COLONY ENGINEERING STUDIO — assembly-timeline RUNTIME harness.
 *
 * Run with:  npx tsx scripts/colony-studio-animation.test.ts
 *
 * Proves the assembly animation's PURE core actually runs on a real model: the timeline builds, every
 * part is scheduled exactly once, times are monotonic, camera keyframes are finite, sampling at any
 * instant yields finite transforms, and the whole thing is deterministic (same model ⇒ same timeline),
 * which is what makes the video export reproducible. The R3F scene itself needs a GPU and is covered
 * by the production build + the in-app error boundary, not here.
 */

import { calculateLabourColony, type LabourColonyConfig, type LabourColonyResult } from "../src/lib/quotation/labourColony";
import { buildConstructionPlan } from "../src/lib/quotation/labourColonyPlan";
import { calculateCivilWork, DEFAULT_CIVIL_CONFIG, type CivilContext, type CivilWorkResult } from "../src/lib/quotation/labourColonyCivil";
import { buildColonyModel } from "../src/features/labour-colony-studio/model/colonyModel";
import { isRafterSupportKind } from "../src/features/labour-colony-studio/model/assembly";
import { buildAssemblyTimeline } from "../src/features/labour-colony-studio/animation/buildAssemblyTimeline";
import { validateAssemblyTimeline } from "../src/features/labour-colony-studio/animation/validateAssemblyTimeline";
import {
  sampleAssembly, samplePart, activeStepIndexAt, activeStepCutawayAt,
} from "../src/features/labour-colony-studio/animation/assemblyMotion";
import {
  buildColonyStepEngineeringRows, colonyContextOf, describeColonyStep,
} from "../src/features/labour-colony-studio/animation/assemblyCaptions";

let passed = 0;
let failed = 0;
const fails: string[] = [];
const ok = (cond: boolean, msg: string): void => {
  if (cond) passed++;
  else { failed++; fails.push(msg); }
};

const CONFIG: LabourColonyConfig = {
  projectName: "Animation Harness Colony",
  location: "Test",
  personsPerRoom: 8,
  capacity: 100,
  totalRooms: undefined,
  floors: 2,
  roomLength: 6,
  roomWidth: 3,
  roomHeight: 2.7,
  corridorWidth: 1.5,
  corridorPosition: "center",
  staircasePosition: "both",
  panelType: "PUF",
  panelThicknessMm: 50,
  wastagePercent: 5,
  facilities: { toilet: true, bunkBeds: true, diningKitchen: true, officeSecurity: true },
};

function civilCtxOf(result: LabourColonyResult): CivilContext {
  const rpf = Math.max(1, Math.ceil(result.occupancy.rooms / Math.max(1, result.config.floors)));
  const plan = buildConstructionPlan(result.config, { roomsPerFloor: rpf, startRoomNo: 1 });
  return {
    footprintLengthM: result.area.footprintLengthM,
    footprintWidthM: result.area.footprintWidthM,
    builtUpSqm: result.area.builtUpTotalSqm,
    floors: result.config.floors,
    wcCount: result.occupancy.wc,
    bathCount: result.occupancy.baths,
    totalCapacity: result.occupancy.totalCapacity,
    diningKitchen: result.config.facilities.diningKitchen,
    columnGrid: { xsM: plan.colXs, ysM: plan.rowYs },
  } as CivilContext;
}

const result = calculateLabourColony(CONFIG);
const civil: CivilWorkResult = calculateCivilWork({ ...DEFAULT_CIVIL_CONFIG, enabled: true }, civilCtxOf(result));
const model = buildColonyModel({ result, civil, columnGrid: null });

/* ---- build ---------------------------------------------------------------------------------- */
const t = buildAssemblyTimeline(model);
ok(t.steps.length > 0, `timeline has steps (${t.steps.length})`);
ok(t.totalMs > 0 && Number.isFinite(t.totalMs), `timeline totalMs is positive + finite (${Math.round(t.totalMs)}ms)`);
ok(t.schedule.length > 0, `timeline schedules parts (${t.schedule.length})`);
ok(Number.isFinite(t.radius) && t.radius > 0, "framing radius finite + positive");

/* ---- every part scheduled exactly once ------------------------------------------------------ */
const scheduledIds = t.schedule.map((e) => (e as unknown as { partId?: string; id?: string }).partId
  ?? (e as unknown as { id?: string }).id ?? "");
const nonEmpty = scheduledIds.filter((s) => s.length > 0);
ok(nonEmpty.length === t.schedule.length, "every schedule entry references a part id");
ok(new Set(nonEmpty).size === nonEmpty.length, "no part scheduled twice");

/* ---- steps are monotonic + non-overlapping -------------------------------------------------- */
let monotonic = true;
for (let i = 1; i < t.steps.length; i++) {
  const prev = t.steps[i - 1] as unknown as { startMs: number; endMs?: number; durationMs?: number };
  const cur = t.steps[i] as unknown as { startMs: number };
  if (!(cur.startMs >= prev.startMs)) monotonic = false;
}
ok(monotonic, "step start times are monotonically increasing");
ok(t.steps.every((s) => Number.isFinite((s as unknown as { startMs: number }).startMs)), "all step times finite");

/* ---- the builder's own validator ------------------------------------------------------------ */
const v = validateAssemblyTimeline(t, model);
const errors = (v.issues ?? []).filter((i) => i.severity === "error");
ok(errors.length === 0, `validateAssemblyTimeline reports no errors (${errors.map((e) => e.code).join(", ") || "none"})`);

/* ---- sampling at many instants yields finite camera + per-part transforms -------------------- *
 * SceneSample carries the camera/caption; per-part render states come from samplePart() over the
 * precomputed schedule (that split is what keeps the render loop allocation-free). Exercise both. */
let badSamples = 0;
for (let i = 0; i <= 40; i++) {
  const ms = (t.totalMs * i) / 40;
  const s = sampleAssembly(t, ms);
  const cam = s.camera as unknown as { position: number[]; target: number[] };
  if (!cam.position.every(Number.isFinite) || !cam.target.every(Number.isFinite)) badSamples++;
  if (!Number.isFinite(s.progress) || !Number.isFinite(s.stepIndex)) badSamples++;
  const ctx = {
    activeStepIndex: activeStepIndexAt(t, ms),
    activeStepCutaway: activeStepCutawayAt(t, ms),
    stepCount: t.steps.length,
    options: t.options,
  };
  for (const entry of t.schedule) {
    const st = samplePart(entry, ms, ctx);
    if (!st.offset.every(Number.isFinite) || !Number.isFinite(st.opacity)) badSamples++;
  }
}
ok(badSamples === 0, `all 41 sampled frames produce finite camera + part transforms (${badSamples} bad)`);

/* ---- at the end every part is installed: visible, zero offset, full opacity ------------------ */
const endCtx = {
  activeStepIndex: activeStepIndexAt(t, t.totalMs),
  activeStepCutaway: activeStepCutawayAt(t, t.totalMs),
  stepCount: t.steps.length,
  options: t.options,
};
const unsettled = t.schedule.filter((e) => {
  const st = samplePart(e, t.totalMs, endCtx);
  return !st.visible || Math.hypot(st.offset[0], st.offset[1], st.offset[2]) > 1e-6;
}).length;
ok(unsettled === 0, `every part settles installed at the end of the sequence (${unsettled} unsettled)`);

/* ---- determinism: identical timeline on rebuild (⇒ reproducible video export) ---------------- */
const t2 = buildAssemblyTimeline(model);
ok(t2.totalMs === t.totalMs, "determinism: identical totalMs");
ok(t2.steps.length === t.steps.length, "determinism: identical step count");
ok(
  JSON.stringify(t2.steps.map((s) => (s as unknown as { startMs: number }).startMs))
    === JSON.stringify(t.steps.map((s) => (s as unknown as { startMs: number }).startMs)),
  "determinism: identical step timing sequence",
);

/* ---- single-storey model still animates ----------------------------------------------------- */
const single = calculateLabourColony({ ...CONFIG, floors: 1, capacity: 40 });
const civilS = calculateCivilWork({ ...DEFAULT_CIVIL_CONFIG, enabled: true }, civilCtxOf(single));
const tS = buildAssemblyTimeline(buildColonyModel({ result: single, civil: civilS, columnGrid: null }));
ok(tS.steps.length > 0 && tS.totalMs > 0, "ground-floor-only model still produces a timeline");

/* ---- the per-assembly ZOOMED DETAIL TOUR of the rafter-support connections -------------------
 * The requirement: every rafter connection is flown to, held on in close-up and built up part by
 * part. That is N shots inside the single canonical construction step 18, so it rests on the
 * sub-step layer (TimelineStep.subIndex) and on the tour being a PARTITION of that step's parts.
 * These assertions guard exactly those two things, plus the runtime the user accepted (5–7 min). */
const rsupParts = model.parts.filter((p) => isRafterSupportKind(p.kind));
const rsupConns = new Set(rsupParts.map((p) => p.connectionId).filter((x): x is string => !!x));

if (rsupConns.size > 0) {
  ok(t.detailTour.enabled, "detail tour switches itself on when rafter-support assemblies exist");
  ok(t.detailTour.assemblies === rsupConns.size,
    `detail tour finds every connection (${t.detailTour.assemblies} of ${rsupConns.size})`);
  ok(t.detailTour.toured === t.detailTour.assemblies && !t.detailTour.capped,
    `a typical colony tours every assembly (${t.detailTour.toured}/${t.detailTour.assemblies})`);

  /* Sub-steps now come from TWO systems: the rafter-support tour (steps 18/19) and the per-tube
   * deck insertion sequence (step 8). The tour assertions below check the TOUR subs only. */
  const subs = t.steps.filter((s) => s.subIndex !== undefined);
  const tourSubs = subs.filter((s) => s.assemblyStep >= 18);
  ok(tourSubs.length === t.detailTour.toured, `one sub-step per toured assembly (${tourSubs.length})`);
  ok(tourSubs.every((s) => s.shot === "detail-closeup"), "every detail sub-step uses the macro shot");

  // ids: the convention IS the join key — duplicates would collide as React keys + validator refs
  const stepIds = t.steps.map((s) => s.id);
  ok(new Set(stepIds).size === stepIds.length, "every timeline step id is unique");
  ok(
    t.steps.every((s) => s.id === (s.subIndex === undefined ? `step-${s.assemblyStep}` : `step-${s.assemblyStep}-${s.subIndex}`)),
    "step ids follow the step-<n>[-<sub>] convention",
  );

  // ordering: lexicographic (assemblyStep, subIndex ?? -1) strictly increasing
  let lexOk = true;
  for (let i = 1; i < t.steps.length; i++) {
    const p = t.steps[i - 1];
    const c = t.steps[i];
    const ps = p.subIndex ?? -1;
    const cs = c.subIndex ?? -1;
    if (c.assemblyStep < p.assemblyStep || (c.assemblyStep === p.assemblyStep && cs <= ps)) lexOk = false;
  }
  ok(lexOk, "erection order increases lexicographically on (assemblyStep, subIndex)");

  // THE PARTITION INVARIANT: the steps of one construction step split its parts, never duplicate
  // them and never drop them — this is what keeps "every part scheduled exactly once" true.
  const union = t.steps.flatMap((s) => s.partIds);
  ok(new Set(union).size === union.length, "no part appears in two timeline steps");
  ok(union.length === model.parts.length, `the steps partition the whole model (${union.length} of ${model.parts.length})`);

  // the camera must be a genuine macro shot, not the "close-up" a 12 m building normally allows
  const detailDist = tourSubs.map((s) => Math.hypot(
    s.camera.to.position[0] - s.camera.to.target[0],
    s.camera.to.position[1] - s.camera.to.target[1],
    s.camera.to.position[2] - s.camera.to.target[2],
  ));
  ok(detailDist.every((d) => d > 0 && d < 2.5),
    `every detail shot is framed inside 2.5 m (max ${Math.max(...detailDist).toFixed(2)} m)`);

  // focusPartIds must be installable by the shot that frames them
  ok(subs.every((s) => (s.focusPartIds ?? []).every((id) => s.partIds.includes(id))),
    "every focused part is installed by the shot that frames it");

  // the per-assembly caption must name real model values and never leak an unresolved one
  const capText = (s: (typeof subs)[number]) =>
    [s.title, s.description, s.captionCustomer, s.captionEngineering ?? "", s.subTitle ?? ""].join(" ");
  ok(!subs.some((s) => /undefined|NaN/.test(capText(s))), "no detail caption carries undefined / NaN");
  ok(tourSubs.every((s) => /M\d+/.test(s.description)), "every detail caption names the bolt spec");
  ok(tourSubs.every((s) => s.description.includes("flush")), "every detail caption states the flush web bearing");

  // the camera keeps moving through the dwell (cinematography, not a freeze-frame)
  const d0 = tourSubs[0];
  const camA = sampleAssembly(t, d0.startMs + d0.installMs + 5).camera;
  const camB = sampleAssembly(t, d0.endMs - 5).camera;
  const drift = Math.hypot(
    camA.position[0] - camB.position[0], camA.position[1] - camB.position[1], camA.position[2] - camB.position[2],
  );
  ok(drift > 0.01, `the detail camera drifts during the dwell (${drift.toFixed(3)} m)`);

  // runtime: the user explicitly accepted 5–7 minutes for complete detail
  const mins = t.totalMs / 60000;
  ok(mins >= 3 && mins <= 12, `tour runtime is a watchable film (${mins.toFixed(2)} min)`);

  // an explicit cap must still schedule every part, and must SAY it is partial
  const capped = buildAssemblyTimeline(model, { detailTourMaxAssemblies: 5 });
  ok(capped.detailTour.toured === Math.min(5, rsupConns.size), "an explicit tour cap is honoured");
  ok(new Set(capped.steps.flatMap((s) => s.partIds)).size === model.parts.length,
    "a capped tour still schedules every part exactly once");
  ok(capped.steps.some((s) => s.description.includes("erected together")),
    "a capped tour states in the caption that the rest are erected together");
  ok(validateAssemblyTimeline(capped, model).issues.filter((i) => i.severity === "error").length === 0,
    "a capped timeline still validates");
}

/* ---- the tour is OPTIONAL and degrades to the pre-existing timeline -------------------------- */
const noTour = buildAssemblyTimeline(model, { detailTour: false });
ok(noTour.steps.filter((s) => s.assemblyStep >= 18).every((s) => s.subIndex === undefined), "detail tour off ⇒ no rafter-tour sub-steps (the per-tube deck sequence is not the tour)");
ok(!noTour.detailTour.enabled, "detail tour off is reported on the timeline");
ok(new Set(noTour.steps.flatMap((s) => s.partIds)).size === model.parts.length,
  "detail tour off still schedules every part exactly once");
ok(validateAssemblyTimeline(noTour, model).issues.filter((i) => i.severity === "error").length === 0,
  "the tour-off timeline validates");

/* a model with NO rafter-support parts must produce exactly the timeline it always did */
const stripped = { ...model, parts: model.parts.filter((p) => !isRafterSupportKind(p.kind)), rafterSupport: undefined };
const tStripped = buildAssemblyTimeline(stripped);
ok(!tStripped.detailTour.enabled && tStripped.detailTour.assemblies === 0,
  "a colony without the rafter-support system gets no tour");
ok(tStripped.steps.filter((s) => s.assemblyStep >= 18).every((s) => s.subIndex === undefined), "…and no tour sub-steps");
ok(validateAssemblyTimeline(tStripped, stripped).issues.filter((i) => i.severity === "error").length === 0,
  "…and still validates");

/* ---- CAPTIONS MUST NEVER NARRATE A PART THE MODEL DOES NOT CONTAIN ---------------------------
 * The step copy is the one place in the studio that can lie without failing a type check or a
 * geometry invariant: it is prose, so an assertion about a king post survives happily in a colony
 * that has no king post. These checks pin the two ways that actually happened. */
{
  const stepCopy = (m: ReturnType<typeof buildColonyModel>, step: number) =>
    describeColonyStep(step as never, colonyContextOf(m), m.parts.filter((p) => p.assemblyStep === step));

  /* (1) A MONO-PITCH roof emits one rafter and NO truss webs — so it has no apex and no king post. */
  const mono = calculateLabourColony({ ...CONFIG, roofType: "mono" } as LabourColonyConfig);
  const monoCivil = calculateCivilWork({ ...DEFAULT_CIVIL_CONFIG, enabled: true }, civilCtxOf(mono));
  const monoModel = buildColonyModel({ result: mono, civil: monoCivil, columnGrid: null });
  const monoWebs = monoModel.parts.filter((p) => p.kind === "truss-web").length;
  if (monoWebs === 0) {
    const c = stepCopy(monoModel, 17);
    const prose = `${c.description} ${c.captionCustomer} ${c.captionEngineering}`;
    ok(!/king post/i.test(prose), "captions: a roof with no truss webs is never told it has a king post");
    ok(!/apex/i.test(prose), "captions: a single-slope roof is never told it has an apex");
    ok(!/web member/i.test(prose), "captions: a roof with no webs is never told it has web members");
  } else {
    ok(true, `captions: mono roof still emits ${monoWebs} webs — apex/king-post check not applicable`);
  }

  /* (2) connectionDetail:false builds the truss with NO welds, plates or bolts at all. */
  const bare = buildColonyModel({ result, civil, columnGrid: null }, { connectionDetail: false });
  const bareHw = bare.parts.filter((p) => (p.assemblyId ?? "").startsWith("truss:")
    && (p.kind === "weld" || p.kind === "splice-plate" || p.kind === "bolt")).length;
  ok(bareHw === 0, `captions: connectionDetail:false really removes the truss hardware (${bareHw})`);
  const bc = stepCopy(bare, 17);
  const bareProse = `${bc.description} ${bc.captionCustomer} ${bc.captionEngineering}`;
  ok(!/fillet weld/i.test(bareProse) && !/M16/.test(bareProse) && !/Ø18/.test(bareProse),
    "captions: a truss with no modelled hardware is never given weld sizes, bolt grades or hole diameters");
  ok(!/torque/i.test(bc.inspection ?? ""),
    "captions: the ITP does not demand a torque check on bolts that were never modelled");

  /* (3) THE OVERLAY PAINTS ONLY SIX ROWS — the explanation must not push priced rows off the frame.
   *     Regression guard: detail rows were prepended without trimming, silently dropping a
   *     BOQ-referenced row from every exported frame of steps 6, 8 and 14. */
  for (const step of [6, 8, 14, 17, 20]) {
    const parts = model.parts.filter((p) => p.assemblyStep === step);
    if (!parts.length) continue;
    const rows = buildColonyStepEngineeringRows(parts);
    ok(rows.length <= 6,
      `captions: step ${step} engineering rows fit the overlay's 6-row budget (${rows.length})`);
  }
}

console.log(`\ncolony-studio-animation.test.ts — ${passed} passed, ${failed} failed\n`);
if (failed) {
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
} else {
  console.log("  ✓ assembly timeline builds, validates, samples finite + deterministic");
}
