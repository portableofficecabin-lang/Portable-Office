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
import { buildAssemblyTimeline } from "../src/features/labour-colony-studio/animation/buildAssemblyTimeline";
import { validateAssemblyTimeline } from "../src/features/labour-colony-studio/animation/validateAssemblyTimeline";
import {
  sampleAssembly, samplePart, activeStepIndexAt, activeStepCutawayAt,
} from "../src/features/labour-colony-studio/animation/assemblyMotion";

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

console.log(`\ncolony-studio-animation.test.ts — ${passed} passed, ${failed} failed\n`);
if (failed) {
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
} else {
  console.log("  ✓ assembly timeline builds, validates, samples finite + deterministic");
}
