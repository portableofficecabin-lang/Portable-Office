/**
 * ANIMATED CABIN ASSEMBLY — timeline / sampling / validation harness.
 *
 *   npx tsx scripts/assembly-timeline.test.ts
 *
 * Runs the REAL model builder + timeline builder + deterministic sampler against several real cabin
 * configurations (no mocks). Covers the spec's unit-test checklist that is exercisable in node — the
 * browser-only pieces (WebM/MediaRecorder, cancelled-export resource release, live 3D interaction)
 * are verified by the production build + manual UI test, and are called out at the end.
 */

import { buildDefaultConfig, type CabinConfig } from "../src/components/home/cabin-calculator/pricing";
import { buildCabinModel } from "../src/features/cabin-design/model/cabinModel";
import type { CabinModel } from "../src/features/cabin-design/model/types";
import { buildAssemblyTimeline, DEFAULT_ASSEMBLY_OPTIONS } from "../src/features/cabin-design/animation/buildAssemblyTimeline";
import {
  activeStepIndexAt, sampleAssembly, sampleCamera, samplePart,
} from "../src/features/cabin-design/animation/assemblyMotion";
import {
  validateAssemblyTimeline, validateExportSettings, estimateExport,
} from "../src/features/cabin-design/animation/validateAssemblyTimeline";
import { describeStep } from "../src/features/cabin-design/animation/assemblyCaptions";
import type { ExportSettings } from "../src/features/cabin-design/animation/assemblyTypes";

let pass = 0, fail = 0;
const check = (name: string, cond: boolean) => {
  if (cond) { pass++; console.log(`   PASS  ${name}`); }
  else { fail++; console.log(`   FAIL  ${name}`); }
};
const section = (s: string) => console.log(`\n=============== ${s} ===============`);

const cfg = (over: Partial<CabinConfig> = {}, product?: string): CabinConfig =>
  ({ ...buildDefaultConfig(product), ...over });
const model = (c: CabinConfig): CabinModel => buildCabinModel(c);

/* ---- build a spread of real cabins -------------------------------------------------------- */
const msCabin = model(cfg({ length: 20, width: 10, height: 8, structureId: "gi", roofId: "sloped" }));
const pufCabin = model(cfg({ length: 20, width: 10, height: 8, structureId: "puf", roofId: "sloped" }));
const longCabin = model(cfg({ length: 40, width: 10, height: 8 }));
const smallCabin = model(cfg({ length: 8, width: 6, height: 7 }));
const multiRoom = model(cfg({ length: 24, width: 10, height: 8, roomCount: 3, partitionDoor: true }));
const toiletCabin = model(cfg({}, "toilet-cabin"));
const storageCabin = model(cfg({}, "storage-container"));

const tMs = buildAssemblyTimeline(msCabin, null);
const tPuf = buildAssemblyTimeline(pufCabin, null);
const tLong = buildAssemblyTimeline(longCabin, null);
const tSmall = buildAssemblyTimeline(smallCabin, null);

/* ---- 1. assemblyStep order ----------------------------------------------------------------- */
section("1. timeline is generated in assemblyStep order");
{
  const steps = tMs.steps.map((s) => s.assemblyStep);
  const sorted = [...steps].every((v, i) => i === 0 || steps[i - 1] < v);
  check("steps are strictly increasing in assemblyStep", sorted);
  check("step.index is 0..n-1 contiguous", tMs.steps.every((s, i) => s.index === i));
  check("step start times are contiguous (start == prev end)",
    tMs.steps.every((s, i) => i === 0 ? s.startMs === tMs.introMs : s.startMs === tMs.steps[i - 1].endMs));
}

/* ---- 2. missing optional steps skipped ----------------------------------------------------- */
section("2. steps with no parts are skipped");
{
  const msSteps = new Set(tMs.steps.map((s) => s.assemblyStep));
  const hasFurniturePart = msCabin.parts.some((p) => p.assemblyStep === 16);
  check("no furniture step when the cabin has no furniture", hasFurniturePart || !msSteps.has(16));
  const hasPlumbingPart = msCabin.parts.some((p) => p.assemblyStep === 15);
  check("no plumbing step when the cabin has no plumbing", hasPlumbingPart || !msSteps.has(15));
  // every present step maps to at least one real part
  check("every timeline step has ≥1 part", tMs.steps.every((s) => s.partIds.length > 0));
}

/* ---- 3 & 4. all model part IDs assigned, none twice ---------------------------------------- */
section("3 & 4. every installable part is scheduled exactly once");
{
  const modelIds = msCabin.parts.filter((p) => p.assemblyStep >= 1 && p.assemblyStep <= 16).map((p) => p.id);
  const schedIds = tMs.schedule.map((e) => e.partId);
  const schedSet = new Set(schedIds);
  check("no duplicate part in the schedule", schedIds.length === schedSet.size);
  check("every installable model part is scheduled", modelIds.every((id) => schedSet.has(id)));
  check("every scheduled id exists in the model", schedIds.every((id) => modelIds.includes(id)));
  check("schedule stepIndex references a real step", tMs.schedule.every((e) => e.stepIndex >= 0 && e.stepIndex < tMs.steps.length));
}

/* ---- 5. custom dimensions → valid camera framing ------------------------------------------- */
section("5. custom cabin sizes produce valid, finite camera framing");
for (const [name, t] of [["40ft", tLong], ["small", tSmall], ["20ft", tMs]] as const) {
  const okRadius = t.radius > 0.2 && t.radius < 200;
  const finiteCam = t.steps.every((s) =>
    [...s.camera.from.position, ...s.camera.from.target, ...s.camera.to.position, ...s.camera.to.target].every(Number.isFinite));
  check(`${name}: radius is sane`, okRadius);
  check(`${name}: all step cameras are finite`, finiteCam);
  // sample the whole timeline — camera stays finite at every phase
  let allFinite = true;
  for (let ms = 0; ms <= t.totalMs; ms += Math.max(1, Math.floor(t.totalMs / 60))) {
    const k = sampleCamera(t, ms);
    if (![...k.position, ...k.target].every(Number.isFinite)) allFinite = false;
  }
  check(`${name}: sampled camera finite across the whole timeline`, allFinite);
}

/* ---- 6 & 7. PUF captions vs MS captions ---------------------------------------------------- */
section("6 & 7. captions match the real material (PUF vs MS sheet)");
{
  const pufWall = tPuf.steps.find((s) => s.assemblyStep === 6);
  const msWall = tMs.steps.find((s) => s.assemblyStep === 6);
  check("PUF cabin has a wall-panel step", !!pufWall);
  check("MS cabin has a wall-panel step", !!msWall);
  check("PUF wall caption mentions PUF", !!pufWall && /puf/i.test(pufWall.captionCustomer));
  check("MS wall caption does NOT say PUF", !!msWall && !/puf/i.test(`${msWall.captionCustomer} ${msWall.captionEngineering}`));
  check("MS wall caption mentions steel sheet", !!msWall && /steel|sheet/i.test(msWall.captionCustomer));
}

/* ---- 8. partition / no-partition ----------------------------------------------------------- */
section("8. partition vs no-partition variants");
{
  const single = tMs;
  const singleHasPartitionPart = msCabin.parts.some((p) => p.kind === "partition");
  check("single-room cabin: partition step present iff a partition part exists",
    singleHasPartitionPart === single.steps.some((s) => s.assemblyStep === 9));
  const multiT = buildAssemblyTimeline(multiRoom, null);
  const multiHasPartitionPart = multiRoom.parts.some((p) => p.kind === "partition");
  check("multi-room cabin: partition step present iff a partition part exists",
    multiHasPartitionPart === multiT.steps.some((s) => s.assemblyStep === 9));
}

/* ---- 9 & 10. door/window + sliding wording ------------------------------------------------- */
section("9 & 10. door / window / sliding wording is dynamic");
{
  const doorPart = { kind: "door", label: "Main door" } as never;
  const winPart = { kind: "window", label: "Window" } as never;
  const both = describeStep(10, ctxStub(), [doorPart, winPart]);
  const onlyDoor = describeStep(10, ctxStub(), [doorPart]);
  check("both door+window → 'Doors and windows'", /doors and windows/i.test(both.captionCustomer));
  check("only door → does not claim windows", !/window/i.test(onlyDoor.captionCustomer));
  const slidingCtx = { ...ctxStub(), hasSlidingPartition: true, roomCount: 2 };
  const partCopy = describeStep(9, slidingCtx, []);
  check("sliding partition → engineering caption mentions sliding", /slid/i.test(partCopy.captionEngineering));
}

/* ---- 11. electrical / plumbing / furniture optional steps ---------------------------------- */
section("11. MEP / furniture steps only appear when present");
{
  const toiletT = buildAssemblyTimeline(toiletCabin, null);
  const toiletHasPlumbing = toiletCabin.parts.some((p) => p.assemblyStep === 15);
  check("toilet cabin: plumbing step present iff plumbing parts exist",
    toiletHasPlumbing === toiletT.steps.some((s) => s.assemblyStep === 15));
  const elecPresent = msCabin.parts.some((p) => p.assemblyStep === 14);
  check("electrical step present iff electrical parts exist",
    elecPresent === tMs.steps.some((s) => s.assemblyStep === 14));
}

/* ---- 12 & 13. geometry change regenerates; rate change does NOT ----------------------------- */
section("12 & 13. geometry regenerates the path; a BOQ rate change does not");
{
  const a = buildAssemblyTimeline(msCabin, null);
  const b = buildAssemblyTimeline(longCabin, null);
  check("different geometry → different schedule length or timing",
    a.schedule.length !== b.schedule.length || a.totalMs !== b.totalMs);

  // same model, different BOQ input → schedule + timing + camera identical (only engineering rows may differ)
  const withNull = buildAssemblyTimeline(msCabin, null);
  const withEmpty = buildAssemblyTimeline(msCabin, { lines: [] } as never);
  check("BOQ change leaves the schedule byte-identical",
    JSON.stringify(withNull.schedule) === JSON.stringify(withEmpty.schedule));
  const proj = (t: typeof withNull) => t.steps.map((s) => ({ id: s.id, startMs: s.startMs, endMs: s.endMs, partIds: s.partIds, camera: s.camera }));
  check("BOQ change leaves step timing/partIds/camera identical",
    JSON.stringify(proj(withNull)) === JSON.stringify(proj(withEmpty)));
}

/* ---- 14. determinism ----------------------------------------------------------------------- */
section("14. deterministic timeline + frame sampling");
{
  const a = buildAssemblyTimeline(msCabin, null);
  const b = buildAssemblyTimeline(msCabin, null);
  check("two builds from the same model are byte-identical", JSON.stringify(a) === JSON.stringify(b));

  // frame-time determinism: sampling at frameIndex/fps twice yields identical results
  const fps = 30;
  const f = 42;
  const ms = (f / fps) * 1000;
  const s1 = sampleAssembly(a, ms);
  const s2 = sampleAssembly(a, ms);
  check("sampleAssembly is a pure function of time", JSON.stringify(s1) === JSON.stringify(s2));
  check("sampled progress is monotonic non-decreasing", (() => {
    let prev = -1, ok = true;
    for (let i = 0; i <= 100; i++) { const p = sampleAssembly(a, (i / 100) * a.totalMs).progress; if (p < prev - 1e-9) ok = false; prev = p; }
    return ok;
  })());
}

/* ---- 15 & 16. legacy config + missing BOQ mapping ------------------------------------------ */
section("15 & 16. legacy config + missing BOQ never crash");
{
  let ok15 = true;
  try {
    // a sparse/legacy-ish config missing several optional fields
    const legacy = { ...buildDefaultConfig(), tables: undefined, socketPlan: undefined } as CabinConfig;
    const t = buildAssemblyTimeline(buildCabinModel(legacy), null);
    ok15 = t.totalMs > 0 && t.steps.length > 0;
  } catch { ok15 = false; }
  check("legacy config builds a valid timeline", ok15);

  let ok16 = true;
  try {
    const t = buildAssemblyTimeline(msCabin, undefined);
    // engineering rows in customer mode are empty and nothing is undefined
    ok16 = t.steps.every((s) => s.engineering.every((r) => !r.label.includes("undefined")));
  } catch { ok16 = false; }
  check("missing BOQ mapping does not crash caption generation", ok16);
}

/* ---- 17. invalid transforms rejected ------------------------------------------------------- */
section("17. validation rejects a non-finite transform");
{
  const good = validateAssemblyTimeline(tMs, msCabin);
  check("a healthy timeline validates ok", good.ok && good.errors.length === 0);

  const bad: CabinModel = JSON.parse(JSON.stringify(msCabin));
  const boxPart = bad.parts.find((p) => p.solid.kind === "box");
  if (boxPart && boxPart.solid.kind === "box") boxPart.solid.max.x = NaN;
  const badRes = validateAssemblyTimeline(buildAssemblyTimeline(bad, null), bad);
  check("a NaN installed transform is rejected", !badRes.ok && badRes.errors.some((e) => /non-finite/.test(e)));
}

/* ---- 18. invalid export settings rejected -------------------------------------------------- */
section("18. export-settings validation");
{
  const good: ExportSettings = { format: "webm", width: 1920, height: 1080, fps: 30, quality: "high" };
  const bad: ExportSettings = { format: "webm", width: 99999, height: -5, fps: 12, quality: "high" };
  check("valid 1080p/30 settings pass", validateExportSettings(good).ok);
  check("out-of-range width/height + bad fps rejected", !validateExportSettings(bad).ok);
  const est = estimateExport(tMs, good);
  check("estimateExport returns a positive frame count", est.totalFrames > 0 && est.durationMs > 0);
  check("png-frame estimate is a single frame", estimateExport(tMs, { ...good, format: "png-frame" }).totalFrames === 1);
}

/* ---- samplePart lifecycle ------------------------------------------------------------------ */
section("samplePart fly-in lifecycle is correct + deterministic");
{
  const e = tMs.schedule[Math.floor(tMs.schedule.length / 2)];
  const ctx = { activeStepIndex: e.stepIndex, activeStepCutaway: false, stepCount: tMs.steps.length, options: DEFAULT_ASSEMBLY_OPTIONS };
  const before = samplePart(e, e.enterStartMs - 10, ctx);
  const mid = samplePart(e, (e.enterStartMs + e.enterEndMs) / 2, ctx);
  const after = samplePart(e, e.enterEndMs + 10, ctx);
  check("before install: hidden (ghostFuture off)", !before.visible);
  check("mid install: visible, highlighted, offset non-zero", mid.visible && mid.highlight && Math.hypot(...mid.offset) > 0);
  check("after install: visible, settled (offset ~0)", after.visible && Math.hypot(...after.offset) < 1e-6);
  const mid2 = samplePart(e, (e.enterStartMs + e.enterEndMs) / 2, ctx);
  check("samplePart is deterministic", JSON.stringify(mid) === JSON.stringify(mid2));
}

/* ---- phase resolution ---------------------------------------------------------------------- */
section("phase resolution (intro / steps / outro)");
{
  check("t=0 is intro (-1)", activeStepIndexAt(tMs, 0) === -1);
  check("t in first step returns 0", activeStepIndexAt(tMs, tMs.introMs + 1) === 0);
  check("t at very end is outro (steps.length)", activeStepIndexAt(tMs, tMs.totalMs) === tMs.steps.length);
}

/* ---- storage-container sanity -------------------------------------------------------------- */
section("storage container (flat roof) builds + validates");
{
  const t = buildAssemblyTimeline(storageCabin, null);
  const v = validateAssemblyTimeline(t, storageCabin);
  check("storage container timeline validates", v.ok);
  check("flat-roof container roof caption is not sloped-only wording",
    !t.steps.some((s) => s.assemblyStep === 12 && /both slopes/i.test(s.description)) || storageCabin.meta.sloped);
}

/* ---- REVIEW FIX #7 — cutaway must not ghost the CURRENT step's own envelope subject ---------- */
section("review fix: cutaway ghosts earlier envelope only, never the current step's own subject");
{
  const opts = DEFAULT_ASSEMBLY_OPTIONS;
  const mk = (stepIndex: number) => ({
    partId: "x", stepIndex, assemblyStep: 8 as const, enterStartMs: 0, enterEndMs: 100,
    enterOffset: [0, 0, 0] as [number, number, number], envelope: true,
  });
  const ctxCut = { activeStepIndex: 3, activeStepCutaway: true, stepCount: 10, options: opts };
  const current = samplePart(mk(3), 500, ctxCut); // installed, IS the current step
  const earlier = samplePart(mk(1), 500, ctxCut); // installed, an EARLIER step
  check("current-step envelope stays fully visible during its own cutaway step", current.visible && current.opacity > 0.9 && current.highlight);
  check("earlier-step envelope is ghosted through during a cutaway step", earlier.visible && earlier.opacity <= 0.2);
}

/* ---- REVIEW FIX #8 — every approach offset is finite + within the safe clamp ----------------- */
section("review fix: all fly-in offsets are finite and within the ±3.5 m clamp");
{
  let ok = true, moved = 0;
  for (const e of tMs.schedule) {
    if (!e.enterOffset.every((n) => Number.isFinite(n) && Math.abs(n) <= 3.5)) ok = false;
    if (Math.hypot(...e.enterOffset) > 0.01) moved++;
  }
  check("no offset is NaN/Infinity or beyond the clamp", ok);
  check("most parts actually travel (offset non-zero)", moved > tMs.schedule.length * 0.5);
}

/* ---- stub for describeStep-only wording tests ---------------------------------------------- */
function ctxStub() {
  return {
    puf: false, insulated: true, lined: true, sloped: true, container: false, toilet: false,
    roomCount: 1, hasPartition: false, hasSlidingPartition: false, roofType: "sloped",
    lengthFt: 20, widthFt: 10, heightFt: 8,
  };
}

/* ---- result -------------------------------------------------------------------------------- */
section("RESULT");
console.log(`   ${pass} passed · ${fail} failed`);
console.log("\n   NOTE — browser-only checks (WebM/MediaRecorder encode, cancelled-export resource release,");
console.log("   live 3D interaction, fullscreen) are covered by the production build + manual UI test, not this");
console.log("   node harness (no WebGL / MediaRecorder in node).");
if (fail > 0) process.exit(1);
