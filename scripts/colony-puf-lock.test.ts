/**
 * PUF PANEL BOTTOM LOCKING SYSTEM — engineering-invariant harness.
 *
 * Run with:  npx tsx scripts/colony-puf-lock.test.ts   (or `npm run colony:puflock`)
 *
 * Verifies the spec's own validation checklist WITHOUT a browser: the 12-plate reference layout
 * yields 24 C-purlin pieces, every schedule tracks the plate quantity, the pocket tracks the panel
 * thickness, coordinates and ids are stable across rebuilds, manual placements survive a save/reload
 * round-trip, no C-purlin intersects the PUF panel, every bolt belongs to a plate, BOQ quantities
 * equal 3D quantities, and disabling the system removes every part and every BOQ line.
 *
 * Pure Node (tsx) — the same convention as scripts/colony-studio*.test.ts.
 */

import { calculateLabourColony, type LabourColonyConfig, type LabourColonyResult } from "../src/lib/quotation/labourColony";
import { buildConstructionPlan } from "../src/lib/quotation/labourColonyPlan";
import { calculateCivilWork, DEFAULT_CIVIL_CONFIG, type CivilContext, type CivilWorkResult } from "../src/lib/quotation/labourColonyCivil";
import { buildColonyModel } from "../src/features/labour-colony-studio/model/colonyModel";
import { isPufLockKind } from "../src/features/labour-colony-studio/model/assembly";
import {
  boltCentres, DEFAULT_PUF_LOCK_CONFIG, derivePufLock, platePocketGeometry, pocketClearGapMm,
  pufLockMethodSteps, resolvePufLockConfig, resolvePlatePositions,
  type PufLockConfig, type PufLockContext, type PufLockPlatePosition,
} from "../src/features/labour-colony-studio/model/pufLock";
import {
  buildPufLockPlateSchedule, buildPufLockAnchorSchedule, buildPufLockPurlinSchedule,
  buildPufLockWeldSchedule, buildPufLockPanelSchedule, buildPufLockOrderingSummary,
} from "../src/features/labour-colony-studio/reports/pufLockSchedules";
import type { ColonyModel, ColonyPart } from "../src/features/labour-colony-studio/model/types";

let passed = 0;
let failed = 0;
const fails: string[] = [];
function ok(cond: boolean, msg: string): void {
  if (cond) passed++;
  else { failed++; fails.push(msg); }
}
const eq = (a: number, b: number, msg: string, eps = 1e-6) => ok(Math.abs(a - b) <= eps, `${msg} (got ${a}, want ${b})`);

/* ------------------------------------------------------------------ fixtures ------------------ */

/**
 * The REFERENCE PROJECT from the drawing: 12 200 × 7 400 mm, grid A–E × 1–3, four 3 050 mm bays one
 * way and two 3 700 mm bays the other, 12 base plates.
 */
const REF_GRID: PufLockContext["grid"] = [];
{
  const xs = [0, 3.05, 6.1, 9.15, 12.2];
  const ys = [0, 3.7, 7.4];
  const letters = "ABCDE";
  ys.forEach((y, ri) => xs.forEach((x, ci) => REF_GRID.push({ grid: `${letters[ci]}-${ri + 1}`, xM: x, yM: y })));
}

const refCtx = (over: Partial<PufLockContext> = {}): PufLockContext => ({
  grid: REF_GRID,
  plinthTopZM: 0.45,
  plinthBeamWidthM: 0.23,
  configPanelThicknessMm: 50,
  body: { x0: 0, y0: 0, x1: 12.2, y1: 7.4 },
  ...over,
});

const BASE_CONFIG: LabourColonyConfig = {
  projectName: "PUF Lock Harness",
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

function buildFixture(cfg: LabourColonyConfig): { model: ColonyModel; result: LabourColonyResult; civil: CivilWorkResult } {
  const result = calculateLabourColony(cfg);
  const civil = calculateCivilWork(DEFAULT_CIVIL_CONFIG, civilCtxOf(result));
  const model = buildColonyModel({ result, civil, columnGrid: null });
  return { model, result, civil };
}

const pufParts = (m: ColonyModel): ColonyPart[] => m.parts.filter((p) => isPufLockKind(p.kind));
const ofKind = (m: ColonyModel, k: string): ColonyPart[] => m.parts.filter((p) => p.kind === k);

/* ================================================================== 1. reference layout ======== */

{
  const d = derivePufLock(undefined, refCtx());
  eq(d.positions.length, 12, "reference layout places exactly 12 plates");
  eq(d.takeoff.plates, 12, "take-off reports 12 plates");
  eq(d.takeoff.purlinPieces, 24, "12 plates × 2 C-purlins = 24 pieces (calculated, not hardcoded)");
  eq(d.takeoff.bolts, 48, "12 plates × 4 bolts = 48 anchor bolts");
  eq(d.takeoff.nuts, 48, "48 nuts");
  eq(d.takeoff.washers, 48, "48 washers");
  eq(d.takeoff.weldRuns, 48, "24 purlins × 2 runs = 48 weld runs");

  // 12 plates, not the 15 grid intersections
  ok(d.positions.length !== REF_GRID.length, "plate count is NOT silently taken from the 15 grid intersections");

  // marks are P01..P12, unique and stable-sorted
  const marks = d.positions.map((p) => p.mark);
  ok(new Set(marks).size === 12, "plate marks are unique");
  ok(marks[0] === "P01" && marks[11] === "P12", "plate marks run P01…P12");
  ok(new Set(d.positions.map((p) => p.id)).size === 12, "plate ids are unique");

  // every plate sits on a plinth-beam centreline and inside the grid
  const xs = [0, 3.05, 6.1, 9.15, 12.2], ys = [0, 3.7, 7.4];
  const onBeam = d.positions.every((p) =>
    ys.some((y) => Math.abs(p.yM - y) <= 0.115 + 1e-6) || xs.some((x) => Math.abs(p.xM - x) <= 0.115 + 1e-6));
  ok(onBeam, "every plate sits on a plinth-beam centreline");
  const inside = d.positions.every((p) => p.xM >= -1e-6 && p.xM <= 12.2 + 1e-6 && p.yM >= -1e-6 && p.yM <= 7.4 + 1e-6);
  ok(inside, "no plate lies outside the plinth-beam grid");

  // no plate lands on a column base plate
  const onColumn = d.positions.some((p) => REF_GRID.some((c) => Math.abs(c.xM - p.xM) < 0.15 && Math.abs(c.yM - p.yM) < 0.15));
  ok(!onColumn, "no plate clashes with a column base plate");
}

/* ================================================================== 2. pocket arithmetic ======= */

for (const thk of [30, 40, 50, 65, 70]) {
  const d = derivePufLock({ iface: { ...DEFAULT_PUF_LOCK_CONFIG.iface, panelThicknessMm: thk, followConfigPanelThickness: false } } as Partial<PufLockConfig>, refCtx());
  eq(d.takeoff.pocketClearGapMm, thk + 3, `pocket tracks the ${thk} mm panel (= thickness + 3 mm clearance)`);
  eq(d.takeoff.panelThicknessMm, thk, `take-off echoes the ${thk} mm panel thickness`);
  ok(d.takeoff.pocketClearGapMm > thk, `pocket is wider than the ${thk} mm panel — the panel can enter`);
}

{
  // the clearance itself is configurable, and the example in the spec resolves as documented
  for (const clr of [2, 3, 4]) {
    const iface = { ...DEFAULT_PUF_LOCK_CONFIG.iface, panelThicknessMm: 50, followConfigPanelThickness: false, installationClearanceMm: clr };
    eq(pocketClearGapMm(iface), 50 + clr, `50 mm panel + ${clr} mm clearance = ${50 + clr} mm pocket`);
  }
  // the config's own panel thickness is followed when the interface tracks it
  const d = derivePufLock(undefined, refCtx({ configPanelThicknessMm: 65 }));
  eq(d.config.iface.panelThicknessMm, 65, "interface follows the calculator's selected panel thickness");
  eq(d.takeoff.pocketClearGapMm, 68, "pocket follows the calculator's panel thickness");
}

/* ================================================================== 3. validation rules ======== */

const issueCodes = (cfg: Partial<PufLockConfig>, ctx = refCtx()): string[] => {
  const d = derivePufLock(cfg as Partial<PufLockConfig>, ctx);
  return d.issues.map((i) => i.code);
};

{
  ok(derivePufLock(undefined, refCtx()).errors.length === 0, "the shipped default configuration raises NO errors");

  // pocket smaller than the panel
  const tight = issueCodes({ iface: { ...DEFAULT_PUF_LOCK_CONFIG.iface, followConfigPanelThickness: false, panelThicknessMm: 50, installationClearanceMm: 0 } });
  ok(tight.includes("pocket-no-clearance"), "zero clearance is an error");
  ok(tight.includes("panel-penetrates-steel"), "a panel not narrower than the pocket is flagged as penetrating steel");

  // gap far too large
  const loose = issueCodes({ iface: { ...DEFAULT_PUF_LOCK_CONFIG.iface, followConfigPanelThickness: false, panelThicknessMm: 50, installationClearanceMm: 30 } });
  ok(loose.includes("pocket-oversized"), "an oversized pocket warns about panel shaking");

  // missing purlin thickness
  const noT = issueCodes({ purlin: { ...DEFAULT_PUF_LOCK_CONFIG.purlin, thicknessMm: 0 } });
  ok(noT.includes("purlin-no-thickness"), "a zero C-purlin thickness is an error, never a drawn 0 mm section");

  // missing plate thickness — the spec's "no 100 × 50 × 0 mm" rule
  const noPlateT = issueCodes({ plate: { ...DEFAULT_PUF_LOCK_CONFIG.plate, thicknessMm: 0 } });
  ok(noPlateT.includes("plate-no-thickness"), "a zero plate thickness is an error");

  // missing weld
  const noWeld = issueCodes({ purlin: { ...DEFAULT_PUF_LOCK_CONFIG.purlin, weldSizeMm: 0 } });
  ok(noWeld.includes("weld-missing"), "a missing weld size warns");

  // plate too narrow to carry the pocket + both flanges
  const narrow = issueCodes({ plate: { ...DEFAULT_PUF_LOCK_CONFIG.plate, widthMm: 100 } });
  ok(narrow.includes("plate-too-narrow"), "a plate narrower than pocket + 2 flanges is an error");

  // bolt too short for the embedment it claims
  const shortBolt = issueCodes({ anchor: { ...DEFAULT_PUF_LOCK_CONFIG.anchor, lengthMm: 60 } });
  ok(shortBolt.includes("bolt-too-short"), "a bolt too short for its embedment is an error");

  // plate off the beam
  const offBeam = derivePufLock(
    { layoutEdited: true, positions: [{ id: "x", mark: "P01", xM: 1.5, yM: 1.5, axis: "x", beamId: "PB-row-0", gridRef: "A-1", offsetMm: 0, source: "manual" }] } as Partial<PufLockConfig>,
    refCtx(),
  );
  ok(offBeam.issues.some((i) => i.code === "plate-off-beam"), "a plate that misses every plinth beam warns");

  // plate outside the grid
  const outside = derivePufLock(
    { layoutEdited: true, positions: [{ id: "x", mark: "P01", xM: 40, yM: 0, axis: "x", beamId: "PB-row-0", gridRef: "A-1", offsetMm: 0, source: "manual" }] } as Partial<PufLockConfig>,
    refCtx(),
  );
  ok(outside.errors.some((i) => i.code === "plate-outside-grid"), "a plate outside the plinth-beam grid is an error");

  // duplicate coordinates
  const dup: PufLockPlatePosition[] = [
    { id: "a", mark: "P01", xM: 3.05, yM: 0, axis: "x", beamId: "PB-row-0", gridRef: "B-1", offsetMm: 0, source: "manual" },
    { id: "b", mark: "P02", xM: 3.05, yM: 0, axis: "x", beamId: "PB-row-0", gridRef: "B-1", offsetMm: 0, source: "manual" },
  ];
  const dd = derivePufLock({ layoutEdited: true, positions: dup } as Partial<PufLockConfig>, refCtx());
  ok(dd.errors.some((i) => i.code === "duplicate-position"), "two plates at the same coordinate is an error");

  // enabled but empty
  const empty = derivePufLock({ layoutEdited: true, positions: [] } as Partial<PufLockConfig>, refCtx());
  ok(empty.errors.some((i) => i.code === "no-plates"), "an enabled system with no plates is an error");
}

/* ================================================================== 4. quantity override ======= */

for (const n of [4, 8, 12, 16, 20]) {
  const d = derivePufLock({ plateCount: n, plateCountLocked: true } as Partial<PufLockConfig>, refCtx());
  eq(d.positions.length, n, `plate quantity override of ${n} is respected exactly`);
  eq(d.takeoff.purlinPieces, n * 2, `${n} plates ⇒ ${n * 2} C-purlin pieces`);
  eq(d.takeoff.bolts, n * 4, `${n} plates ⇒ ${n * 4} bolts`);

  // every schedule tracks the quantity
  eq(buildPufLockPlateSchedule(d).length, n, `plate schedule has ${n} rows`);
  eq(buildPufLockPurlinSchedule(d).length, n * 2, `C-purlin schedule has ${n * 2} rows`);
  eq(buildPufLockAnchorSchedule(d).length, n, `anchor schedule has ${n} rows`);
  eq(buildPufLockWeldSchedule(d).length, n, `weld schedule has ${n} rows`);
  eq(buildPufLockPanelSchedule(d).length, n, `PUF panel schedule has ${n} rows`);
  ok(buildPufLockOrderingSummary(d).length > 0, `ordering summary is produced for ${n} plates`);

  // the method statement narrates the ACTUAL quantity, never a hardcoded 12
  const steps = pufLockMethodSteps(d);
  eq(steps.length, 16, "the method statement always has 16 steps");
  ok(steps[1].title.includes(String(n)), `step 2 narrates ${n} plates, not a hardcoded 12`);
  ok(steps.every((s) => !/undefined|NaN/.test(s.title + s.detail)), "no step text contains undefined / NaN");
}

/* ================================================================== 5. determinism ============= */

{
  const a = derivePufLock(undefined, refCtx());
  const b = derivePufLock(undefined, refCtx());
  ok(JSON.stringify(a.positions) === JSON.stringify(b.positions), "plate coordinates are deterministic across rebuilds");
  ok(JSON.stringify(a.takeoff) === JSON.stringify(b.takeoff), "the take-off is deterministic across rebuilds");

  // a save/reload round-trip through JSON preserves manual placements exactly
  const manual: PufLockConfig = {
    ...DEFAULT_PUF_LOCK_CONFIG,
    layoutEdited: true,
    positions: [
      { id: "m1", mark: "P01", xM: 1.0, yM: 0, axis: "x", beamId: "PB-row-0", gridRef: "A-1", offsetMm: 1000, source: "manual" },
      { id: "m2", mark: "P02", xM: 2.0, yM: 0, axis: "x", beamId: "PB-row-0", gridRef: "A-1", offsetMm: 2000, source: "manual" },
    ],
  };
  const roundTripped = resolvePufLockConfig(JSON.parse(JSON.stringify(manual)) as PufLockConfig);
  const after = resolvePlatePositions(roundTripped, refCtx());
  eq(after.length, 2, "manual placements survive a save/reload round-trip");
  eq(after[0].xM, 1.0, "manual plate 1 keeps its exact coordinate");
  eq(after[1].xM, 2.0, "manual plate 2 keeps its exact coordinate");
  ok(after.every((p) => p.source === "manual"), "manual plates stay marked as manual");
  ok(after.every((p) => p.id === "m1" || p.id === "m2"), "manual plate ids are stable — never regenerated");

  // an edited layout is never silently overwritten by the auto layout
  ok(resolvePlatePositions({ ...roundTripped, plateCount: 12 }, refCtx()).length === 2,
    "an edited layout is not regenerated back to the auto plate count");

  // an older saved project with no pufLock at all still loads
  const legacy = resolvePufLockConfig(undefined);
  ok(legacy.enabled && legacy.plateCount === 12, "a project saved before this feature existed defaults cleanly");
  // a partially-saved config keeps its stored fields and fills the rest
  const partial = resolvePufLockConfig({ plateCount: 7 } as Partial<PufLockConfig>);
  ok(partial.plateCount === 7 && partial.purlin.depthMm === 75, "a partial saved config merges over the defaults");
}

/* ================================================================== 6. model integration ======= */

{
  const { model } = buildFixture(BASE_CONFIG);
  const d = model.pufLock;
  ok(!!d, "the resolved locking system is carried on the model");
  if (d) {
    const parts = pufParts(model);
    ok(parts.length > 0, `the model contains PUF-lock parts (${parts.length})`);

    // BOQ quantities EQUAL 3D quantities — the core "one source of truth" invariant
    eq(ofKind(model, "puf-lock-base-plate").length, d.takeoff.plates, "3D plate count equals the take-off plate count");
    eq(ofKind(model, "puf-lock-c-purlin-left").length + ofKind(model, "puf-lock-c-purlin-right").length,
      d.takeoff.purlinPieces, "3D C-purlin count equals the take-off piece count");
    eq(ofKind(model, "puf-lock-anchor-bolt").length, d.takeoff.bolts, "3D bolt count equals the take-off bolt count");
    eq(ofKind(model, "puf-lock-nut").length, d.takeoff.nuts, "3D nut count equals the take-off nut count");
    eq(ofKind(model, "puf-lock-washer").length, d.takeoff.washers, "3D washer count equals the take-off washer count");
    eq(buildPufLockPlateSchedule(d).length, ofKind(model, "puf-lock-base-plate").length,
      "plate SCHEDULE rows equal plate PARTS — the BOQ and the viewer cannot disagree");
    eq(buildPufLockPurlinSchedule(d).length,
      ofKind(model, "puf-lock-c-purlin-left").length + ofKind(model, "puf-lock-c-purlin-right").length,
      "C-purlin SCHEDULE rows equal C-purlin PARTS");

    // exactly one LEFT and one RIGHT purlin per plate — a genuine PAIR, never one folded member
    eq(ofKind(model, "puf-lock-c-purlin-left").length, d.takeoff.plates, "one LEFT C-purlin per plate");
    eq(ofKind(model, "puf-lock-c-purlin-right").length, d.takeoff.plates, "one RIGHT C-purlin per plate");

    // ids unique, no NaN, every part in an assembly + connection group
    ok(new Set(parts.map((p) => p.id)).size === parts.length, "every PUF-lock part id is unique");
    const nums = parts.flatMap((p) => (p.solid.kind === "box" ? [p.solid.min, p.solid.max] : []))
      .flatMap((v) => [v.x, v.y, v.z]);
    ok(nums.every((n) => Number.isFinite(n)), "no PUF-lock geometry contains NaN / Infinity");
    ok(parts.every((p) => !!p.connectionId && !!p.assemblyId), "every PUF-lock part belongs to a connection + assembly group");
    ok(parts.every((p) => p.layer === "puf-lock"), "every PUF-lock part is on the puf-lock visibility layer");

    // every bolt / nut / washer belongs to a real plate
    const plateConns = new Set(ofKind(model, "puf-lock-base-plate").map((p) => p.connectionId));
    const hardware = model.parts.filter((p) =>
      p.kind === "puf-lock-anchor-bolt" || p.kind === "puf-lock-nut" || p.kind === "puf-lock-washer");
    ok(hardware.every((p) => plateConns.has(p.connectionId)), "every bolt / nut / washer belongs to a valid plate");

    // the two C-purlins never overlap, and the panel never penetrates steel
    let overlaps = 0, penetrations = 0;
    for (const plate of ofKind(model, "puf-lock-base-plate")) {
      const conn = plate.connectionId;
      const L = model.parts.find((p) => p.connectionId === conn && p.kind === "puf-lock-c-purlin-left");
      const R = model.parts.find((p) => p.connectionId === conn && p.kind === "puf-lock-c-purlin-right");
      const P = model.parts.find((p) => p.connectionId === conn && p.kind === "puf-lock-panel-seat");
      if (!L || !R || !P || L.solid.kind !== "box" || R.solid.kind !== "box" || P.solid.kind !== "box") continue;
      if (boxesOverlap(L.solid, R.solid)) overlaps++;
      if (boxesOverlap(L.solid, P.solid) || boxesOverlap(R.solid, P.solid)) penetrations++;
    }
    eq(overlaps, 0, "the two C-purlins never overlap each other");
    eq(penetrations, 0, "the PUF panel never penetrates either C-purlin");

    // plates sit ON the plinth beam top, never floating and never buried in concrete
    const plinthTop = model.meta.plinthM;
    const plates = ofKind(model, "puf-lock-base-plate");
    ok(plates.every((p) => p.solid.kind === "box" && Math.abs(p.solid.min.z - plinthTop) < 1e-6),
      "every base plate sits exactly on the top of the plinth beam");
    const purlins = model.parts.filter((p) => p.kind === "puf-lock-c-purlin-left" || p.kind === "puf-lock-c-purlin-right");
    ok(purlins.every((p) => p.solid.kind === "box" && p.solid.min.z >= plinthTop),
      "no C-purlin is buried inside the plinth beam");
  }
}

/* ================================================================== 7. disable removes all ===== */

{
  const off = buildFixture({ ...BASE_CONFIG, pufLock: { ...DEFAULT_PUF_LOCK_CONFIG, enabled: false } });
  eq(pufParts(off.model).length, 0, "disabling the locking system removes every model component");
  const d = off.model.pufLock;
  ok(!!d, "the derived bundle is still present when disabled");
  if (d) {
    eq(d.takeoff.plates, 0, "a disabled system takes off zero plates");
    eq(d.takeoff.purlinPieces, 0, "a disabled system takes off zero C-purlins");
    eq(buildPufLockPlateSchedule(d).length, 0, "a disabled system emits no plate BOQ lines");
    eq(buildPufLockPurlinSchedule(d).length, 0, "a disabled system emits no C-purlin BOQ lines");
    eq(buildPufLockOrderingSummary(d).length, 0, "a disabled system emits no ordering lines");
    eq(d.issues.length, 0, "a disabled system raises no engineering issues");
  }
}

/* ================================================================== 8. storey behaviour ======== */

for (const floors of [1, 2, 3] as const) {
  const { model } = buildFixture({ ...BASE_CONFIG, floors });
  const d = model.pufLock;
  if (!d) { ok(false, `G+${floors - 1}: model carries the locking system`); continue; }
  ok(d.positions.length > 0, `G+${floors - 1}: the locking system still resolves`);
  // the lock is a GROUND-level detail — it never multiplies by storey
  ok(ofKind(model, "puf-lock-base-plate").every((p) => p.floor === 0),
    `G+${floors - 1}: every locking assembly stays at ground level`);
  eq(ofKind(model, "puf-lock-base-plate").length, d.takeoff.plates,
    `G+${floors - 1}: plate count matches the take-off`);
}

/* ================================================================== 9. section → weight → price */

{
  const base = derivePufLock(undefined, refCtx());
  const heavier = derivePufLock(
    { purlin: { ...DEFAULT_PUF_LOCK_CONFIG.purlin, depthMm: 100, flangeMm: 50, thicknessMm: 2.5 } } as Partial<PufLockConfig>,
    refCtx(),
  );
  ok(heavier.takeoff.purlinKgPerM > base.takeoff.purlinKgPerM, "a heavier C-purlin section raises the unit weight");
  ok(heavier.takeoff.purlinKg > base.takeoff.purlinKg, "a heavier section raises the total C-purlin weight");
  ok(heavier.takeoff.totalSteelKg > base.takeoff.totalSteelKg, "a heavier section raises the total steel weight");

  // the shipped C 75×40×15×2.0 must reproduce the Material Master's 2.90 kg/m
  eq(Math.round(base.takeoff.purlinKgPerM * 100) / 100, 2.9,
    "C 75 × 40 × 15 × 2.0 resolves to the Material Master's 2.90 kg/m", 0.02);

  const thicker = derivePufLock({ plate: { ...DEFAULT_PUF_LOCK_CONFIG.plate, thicknessMm: 16 } } as Partial<PufLockConfig>, refCtx());
  ok(thicker.takeoff.plateUnitKg > base.takeoff.plateUnitKg, "a thicker plate raises the plate unit weight");

  const bigWeld = derivePufLock({ purlin: { ...DEFAULT_PUF_LOCK_CONFIG.purlin, weldSizeMm: 8 } } as Partial<PufLockConfig>, refCtx());
  ok(bigWeld.takeoff.weldKg > base.takeoff.weldKg, "a larger weld raises the deposited weld metal");
  ok(bigWeld.takeoff.electrodeKg > bigWeld.takeoff.weldKg, "the electrode allowance exceeds the deposited metal");
}

/* ================================================================== 9b. panel-type default ===== */

{
  // A PANEL wall receives a bottom pocket; a plain GI sheet wall has no panel edge to capture.
  for (const t of ["PUF", "EPS", "puf", "eps"]) {
    ok(derivePufLock(undefined, refCtx({ panelType: t })).config.enabled,
      `an unconfigured ${t} project defaults the locking system ON`);
  }
  for (const t of ["GI", "gi"]) {
    ok(!derivePufLock(undefined, refCtx({ panelType: t })).config.enabled,
      `an unconfigured ${t} sheet-wall project defaults the locking system OFF`);
    eq(derivePufLock(undefined, refCtx({ panelType: t })).takeoff.plates, 0,
      `a ${t} project takes off no plates by default`);
  }
  ok(derivePufLock(undefined, refCtx({ panelType: undefined })).config.enabled,
    "a project with no panel type recorded defaults ON");

  // an EXPLICIT admin choice always wins and is never overridden by the panel type
  ok(derivePufLock({ enabled: true } as Partial<PufLockConfig>, refCtx({ panelType: "GI" })).config.enabled,
    "an explicit ON survives a GI panel type");
  ok(!derivePufLock({ enabled: false } as Partial<PufLockConfig>, refCtx({ panelType: "PUF" })).config.enabled,
    "an explicit OFF survives a PUF panel type");

  // the model agrees with the derivation — no UI-side second source of truth
  const gi = buildFixture({ ...BASE_CONFIG, panelType: "GI" });
  eq(pufParts(gi.model).length, 0, "a GI colony builds no locking assemblies by default");
  const puf = buildFixture({ ...BASE_CONFIG, panelType: "PUF" });
  ok(pufParts(puf.model).length > 0, "a PUF colony builds its locking assemblies by default");
}

/* ================================================================== 10. pocket geometry ======== */

{
  const pos: PufLockPlatePosition = {
    id: "g1", mark: "P01", xM: 3.05, yM: 0, axis: "x",
    beamId: "PB-row-0", gridRef: "B-1", offsetMm: 0, source: "auto",
  };

  for (const orientation of ["webs-inward", "flanges-inward"] as const) {
    const cfg = resolvePufLockConfig({ purlin: { ...DEFAULT_PUF_LOCK_CONFIG.purlin, orientation } } as Partial<PufLockConfig>);
    const g = platePocketGeometry(cfg, pos, 0.45);
    const gapM = pocketClearGapMm(cfg.iface) / 1000;
    const flangeM = cfg.purlin.flangeMm / 1000;

    // the pocket faces sit exactly at ±gap/2 about the plate centre
    eq(g.purlinLeft.y1, pos.yM - gapM / 2, `${orientation}: left purlin inner face is at −gap/2`, 1e-9);
    eq(g.purlinRight.y0, pos.yM + gapM / 2, `${orientation}: right purlin inner face is at +gap/2`, 1e-9);
    eq(g.purlinRight.y0 - g.purlinLeft.y1, gapM, `${orientation}: clear pocket equals the derived gap`, 1e-9);

    // a C occupies its FULL flange width across the wall whichever way it is turned — the regression
    // that used to collapse a "flanges-inward" purlin to its 2 mm web
    eq(g.purlinLeft.y1 - g.purlinLeft.y0, flangeM, `${orientation}: left purlin is a full flange wide`, 1e-9);
    eq(g.purlinRight.y1 - g.purlinRight.y0, flangeM, `${orientation}: right purlin is a full flange wide`, 1e-9);

    // the panel is centred in the pocket and touches neither purlin
    const panelT = cfg.iface.panelThicknessMm / 1000;
    eq(g.panelSeat.y1 - g.panelSeat.y0, panelT, `${orientation}: panel seat is the true panel thickness`, 1e-9);
    ok(g.panelSeat.y0 > g.purlinLeft.y1, `${orientation}: panel clears the left purlin`);
    ok(g.panelSeat.y1 < g.purlinRight.y0, `${orientation}: panel clears the right purlin`);

    // the weld beads sit OUTBOARD of the pocket, never eating the installation clearance
    ok(g.welds[0].y1 <= g.purlinLeft.y1 + 1e-9, `${orientation}: left weld stays out of the pocket`);
    ok(g.welds[1].y0 >= g.purlinRight.y0 - 1e-9, `${orientation}: right weld stays out of the pocket`);
    ok(g.welds.every((w) => w.y0 >= g.panelSeat.y1 || w.y1 <= g.panelSeat.y0),
      `${orientation}: no weld bead intrudes into the panel zone`);

    // nothing is buried in the plinth beam, and the purlins stand ON the plate
    eq(g.plate.z0, 0.45, `${orientation}: plate sits on the plinth beam top`, 1e-9);
    eq(g.purlinLeft.z0, g.plate.z1, `${orientation}: left purlin stands on the plate`, 1e-9);
    eq(g.purlinRight.z0, g.plate.z1, `${orientation}: right purlin stands on the plate`, 1e-9);
    ok(g.bolts.every((b) => b.z0 < g.plate.z0), `${orientation}: every anchor bolt is embedded below the plate`);
  }

  // a plate on a y-run rotates the whole assembly: the pocket then opens across x
  const cfg = resolvePufLockConfig(undefined);
  const yPos: PufLockPlatePosition = { ...pos, axis: "y", xM: 0, yM: 3.7, beamId: "PB-col-0" };
  const gy = platePocketGeometry(cfg, yPos, 0.45);
  const gapM = pocketClearGapMm(cfg.iface) / 1000;
  eq(gy.purlinRight.x0 - gy.purlinLeft.x1, gapM, "a plate on a y-run opens its pocket across x");
  eq(gy.normal.x, 1, "a y-run plate has an x-facing pocket normal");
  eq(gy.normal.y, 0, "a y-run plate has no y component in its pocket normal");

  // bolt centres honour the configured pitch and gauge and stay on the plate
  const b = boltCentres(cfg, pos);
  eq(b.length, cfg.anchor.perPlate, "one bolt centre per configured bolt");
  const halfL = cfg.plate.lengthMm / 2000, halfW = cfg.plate.widthMm / 2000;
  ok(b.every((p) => Math.abs(p.x - pos.xM) <= halfL + 1e-9 && Math.abs(p.y - pos.yM) <= halfW + 1e-9),
    "every bolt centre lies inside the plate outline");
}

/* ------------------------------------------------------------------ helpers -------------------- */

function boxesOverlap(
  a: { kind: "box"; min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } },
  b: { kind: "box"; min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } },
  eps = 1e-6,
): boolean {
  return (
    a.min.x < b.max.x - eps && a.max.x > b.min.x + eps
    && a.min.y < b.max.y - eps && a.max.y > b.min.y + eps
    && a.min.z < b.max.z - eps && a.max.z > b.min.z + eps
  );
}

/* ------------------------------------------------------------------ report --------------------- */

console.log(`\ncolony-puf-lock.test.ts — ${passed} passed, ${failed} failed\n`);
if (failed) {
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log("  ✓ PUF panel bottom locking system: layout, pocket, validation, quantities and model all agree\n");
