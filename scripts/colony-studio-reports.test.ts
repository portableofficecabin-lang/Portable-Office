/**
 * LABOUR COLONY ENGINEERING STUDIO — schedule/report RUNTIME harness.
 *
 * Run with:  npx tsx scripts/colony-studio-reports.test.ts
 *
 * Typechecking proves the schedules COMPILE; this proves they RUN against a real computed model and
 * emit sane, finite, BOQ-consistent rows. Covers the spec's report checks: bolt/nut/washer parity,
 * plate + weld + connection schedules, truss/staircase/footing schedules, weight summary and dispatch.
 */

import { calculateLabourColony, type LabourColonyConfig, type LabourColonyResult } from "../src/lib/quotation/labourColony";
import { buildConstructionPlan } from "../src/lib/quotation/labourColonyPlan";
import { calculateCivilWork, DEFAULT_CIVIL_CONFIG, type CivilContext, type CivilWorkResult } from "../src/lib/quotation/labourColonyCivil";
import { buildColonyModel } from "../src/features/labour-colony-studio/model/colonyModel";
import * as S from "../src/features/labour-colony-studio/reports/schedules";
import * as P from "../src/features/labour-colony-studio/reports/pufLockSchedules";
import type { PufLockDerived } from "../src/features/labour-colony-studio/model/pufLock";

let passed = 0;
let failed = 0;
const fails: string[] = [];
const ok = (cond: boolean, msg: string): void => {
  if (cond) passed++;
  else { failed++; fails.push(msg); }
};

const CONFIG: LabourColonyConfig = {
  projectName: "Report Harness Colony",
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

/** Every numeric field on every row must be finite (no NaN/Infinity leaking into a report). */
function allNumbersFinite(rows: unknown[]): boolean {
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    for (const v of Object.values(r as Record<string, unknown>)) {
      if (typeof v === "number" && !Number.isFinite(v)) return false;
    }
  }
  return true;
}

const result = calculateLabourColony(CONFIG);
const civil: CivilWorkResult = calculateCivilWork({ ...DEFAULT_CIVIL_CONFIG, enabled: true }, civilCtxOf(result));
const model = buildColonyModel({ result, civil, columnGrid: null });

/**
 * The PUF panel bottom locking system rides on the model itself (`ColonyModel.pufLock`) — the
 * schedules take that ONE resolved bundle, never the model, so they can never re-derive a pocket
 * width or a piece count of their own.
 */
ok(!!model.pufLock, "model carries the resolved PUF-lock bundle");
const puf: PufLockDerived | null = model.pufLock ?? null;

/* ---- every builder runs, returns an array, and emits only finite numbers ------------------- */
const BUILDERS: { name: string; run: () => unknown[]; expectRows: boolean }[] = [
  { name: "memberList", run: () => S.buildMemberList(model, null), expectRows: true },
  { name: "cuttingList", run: () => S.buildCuttingList(model, null), expectRows: true },
  { name: "boltSchedule", run: () => S.buildBoltSchedule(model), expectRows: true },
  { name: "nutSchedule", run: () => S.buildNutSchedule(model), expectRows: true },
  { name: "washerSchedule", run: () => S.buildWasherSchedule(model), expectRows: true },
  { name: "plateSchedule", run: () => S.buildPlateSchedule(model), expectRows: true },
  { name: "weldSchedule", run: () => S.buildWeldSchedule(model), expectRows: false },
  { name: "connectionSchedule", run: () => S.buildConnectionSchedule(model), expectRows: true },
  { name: "trussSchedule", run: () => S.buildTrussSchedule(model), expectRows: true },
  { name: "staircaseSchedule", run: () => S.buildStaircaseSchedule(model), expectRows: false },
  { name: "railingSchedule", run: () => S.buildRailingSchedule(model), expectRows: false },
  { name: "footingSchedule", run: () => S.buildFootingSchedule(civil), expectRows: true },
  { name: "columnSchedule", run: () => S.buildColumnSchedule(model), expectRows: true },
  { name: "beamSchedule", run: () => S.buildBeamSchedule(model), expectRows: true },
  { name: "dispatchList", run: () => S.buildDispatchList(model), expectRows: true },
  // PUF panel bottom lock — these take model.pufLock (the derived bundle), not the model.
  { name: "pufLockPlateSchedule", run: () => (puf ? P.buildPufLockPlateSchedule(puf) : []), expectRows: true },
  { name: "pufLockAnchorSchedule", run: () => (puf ? P.buildPufLockAnchorSchedule(puf) : []), expectRows: true },
  { name: "pufLockPurlinSchedule", run: () => (puf ? P.buildPufLockPurlinSchedule(puf) : []), expectRows: true },
  { name: "pufLockWeldSchedule", run: () => (puf ? P.buildPufLockWeldSchedule(puf) : []), expectRows: true },
  { name: "pufLockPanelSchedule", run: () => (puf ? P.buildPufLockPanelSchedule(puf) : []), expectRows: true },
  { name: "pufLockOrderingSummary", run: () => (puf ? P.buildPufLockOrderingSummary(puf) : []), expectRows: true },
];

for (const b of BUILDERS) {
  let rows: unknown[] | null = null;
  try {
    rows = b.run();
  } catch (e) {
    ok(false, `${b.name}: threw at runtime — ${(e as Error).message}`);
    continue;
  }
  ok(Array.isArray(rows), `${b.name}: returns an array`);
  ok(allNumbersFinite(rows), `${b.name}: all numeric fields finite`);
  if (b.expectRows) ok(rows.length > 0, `${b.name}: emits rows (${rows.length})`);
}

/* ---- weight summary (floor-wise + assembly-wise) -------------------------------------------- */
try {
  const ws = S.buildWeightSummary(model, null);
  ok(!!ws, "weightSummary: returns a result");
  const anyArr = Object.values(ws as unknown as Record<string, unknown>).filter(Array.isArray) as unknown[][];
  ok(anyArr.length > 0, "weightSummary: contains row arrays");
  ok(anyArr.every((a) => allNumbersFinite(a)), "weightSummary: all numeric fields finite");
} catch (e) {
  ok(false, `weightSummary: threw — ${(e as Error).message}`);
}

/* ---- spec §Required-testing 11 + 12: nut/washer parity with bolts --------------------------- */
const boltParts = model.parts.filter((p) => p.kind === "bolt" || p.kind === "anchor-bolt").length;
const nutParts = model.parts.filter((p) => p.kind === "nut").length;
const washerParts = model.parts.filter((p) => p.kind === "washer").length;
ok(boltParts > 0, `model carries real bolt geometry (${boltParts} bolts)`);
ok(nutParts === boltParts, `nut count equals bolt count (${nutParts} vs ${boltParts})`);
ok(washerParts === boltParts, `washer count matches the connection spec (${washerParts} vs ${boltParts})`);

/* ---- plate + connection detailing actually present ------------------------------------------ */
const plateKinds = new Set(["base-plate", "gusset", "splice-plate", "end-plate", "stiffener", "levelling-plate"]);
const plates = model.parts.filter((p) => plateKinds.has(p.kind)).length;
ok(plates > 0, `model carries real plate geometry (${plates} plates)`);
ok(model.parts.some((p) => p.kind === "rafter" || p.kind === "truss-web"), "model carries truss members");
ok(model.parts.some((p) => p.kind === "footing"), "model carries foundation members");

/* ---- every schedule row that cites a BOQ line cites one that EXISTS -------------------------- */
const members = S.buildMemberList(model, null);
const modelLineIds = new Set(model.parts.map((p) => p.boqLineId).filter(Boolean) as string[]);
const cited = members
  .map((m) => (m as unknown as { boqLineId?: string }).boqLineId)
  .filter((v): v is string => typeof v === "string" && v.length > 0);
ok(cited.every((id) => modelLineIds.has(id)), "member list cites only BOQ line ids present in the model");

console.log(`\ncolony-studio-reports.test.ts — ${passed} passed, ${failed} failed\n`);
if (failed) {
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
} else {
  console.log("  ✓ all colony schedule/report builders run clean on a real model");
}
