/**
 * Verifies the Base Frame & Cross Stiffener Configuration panel's DATA FLOW at the engine level.
 * The panel only writes BoqSettings (materialKey overrides, norms, qty/lock) and reads the priced
 * result — so proving those writes move the numbers proves the panel works, without a browser.
 */
import { buildDefaultConfig, normalizeRoomLengths, type CabinConfig } from "../src/components/home/cabin-calculator/pricing";
import { buildCabinTakeoff } from "../src/lib/boq/cabinTakeoff";
import { priceTakeoff } from "../src/lib/boq/engine";
import { SEED_MATERIALS, indexMaterials } from "../src/lib/boq/materialMaster";
import { defaultBoqSettings, DEFAULT_NORMS, type BoqLine, type BoqResult, type BoqSettings } from "../src/lib/boq/types";

const MATS = indexMaterials(SEED_MATERIALS);
const n = (x: number | null | undefined, d = 2) => (x == null ? "—" : x.toFixed(d));

// The exact matchers the panel uses (kept in sync with FrameConfigPanel.tsx GROUPS).
const GROUPS = [
  { key: "base", test: (l: BoqLine) => /base frame|top frame/i.test(l.description) },
  { key: "stud", test: (l: BoqLine) => /stiffener|\bstud/i.test(l.description) },
  { key: "post", test: (l: BoqLine) => /\bpost/i.test(l.description) && !/handrail/i.test(l.description) },
  { key: "joist", test: (l: BoqLine) => /floor cross member|\bjoist/i.test(l.description) },
  { key: "purlin", test: (l: BoqLine) => /roof cross member|\bpurlin|\btruss|\brafter|ridge/i.test(l.description) },
];
const owner = (l: BoqLine) => GROUPS.find((g) => g.test(l))?.key;

function build(cfg: CabinConfig) {
  const c = { ...cfg };
  c.roomLengths = normalizeRoomLengths(c.length, c.roomCount, c.roomLengths);
  return buildCabinTakeoff(c, c.boq?.norms ?? DEFAULT_NORMS, c.boqOptions ?? {});
}

function groupSummary(r: BoqResult) {
  const steel = r.lines.filter((l) => l.cutLengthM != null);
  const byGroup: Record<string, { lines: BoqLine[]; pcs: number; len: number; kg: number; amt: number }> = {};
  let unclaimed = 0;
  for (const l of steel) {
    const k = owner(l);
    if (!k) { unclaimed++; continue; }
    const g = (byGroup[k] ??= { lines: [], pcs: 0, len: 0, kg: 0, amt: 0 });
    g.lines.push(l);
    if (l.enabled) { g.pcs += l.pieces ?? 0; g.len += l.runningLengthM ?? 0; g.kg += l.totalWeightKg; g.amt += l.amount; }
  }
  return { byGroup, unclaimed, steelCount: steel.length };
}

const base = buildDefaultConfig("porta-cabin");
const cfg: CabinConfig = {
  ...base, length: 20, width: 10, height: 8.5, structureId: "ms", roofId: "sloped",
  roomCount: 1, roomLengths: [20],
  doorQty: 1, doorPlacements: [{ side: "bottom", offset: 8, hand: "left", swing: "out" }],
  windowQty: 1, windowPlacements: [{ side: "top", offset: 8 }], windowWidthFt: 3, windowHeightFt: 3,
};

console.log("=".repeat(84));
console.log("TEST A — grouping: every steel line lands in exactly one frame group (or is intentionally unclaimed)");
console.log("=".repeat(84));
const tk = build(cfg);
const r0 = priceTakeoff(tk, MATS, defaultBoqSettings("ms_cabin"));
const s0 = groupSummary(r0);
for (const [k, g] of Object.entries(s0.byGroup)) {
  console.log(`\n[${k}]  ${g.lines.length} lines · ${n(g.pcs, 0)} pcs · ${n(g.len)} m · ${n(g.kg)} kg · Rs.${Math.round(g.amt).toLocaleString("en-IN")}`);
  for (const l of g.lines) console.log(`   - ${l.description.padEnd(46)} ${n(l.pieces, 0).padStart(3)} × ${n(l.cutLengthM, 3)} m  spec=${l.spec.slice(0, 22)}`);
}
const claimed = Object.values(s0.byGroup).reduce((s, g) => s + g.lines.length, 0);
console.log(`\nSteel lines: ${s0.steelCount} · claimed by a group: ${claimed} · unclaimed (hooks etc.): ${s0.unclaimed}`);
console.log(`BASE group present: ${!!s0.byGroup.base}  ·  STUD group present: ${!!s0.byGroup.stud}`);

console.log("\n" + "=".repeat(84));
console.log("TEST B — cross-stiffener SPACING drives the stiffener count");
console.log("  (panel writes norms.studSpacingM; the wrapper REBUILDS the take-off from it, as CabinBoqPanel does)");
console.log("=".repeat(84));
const studCounts: number[] = [];
for (const spacing of [0.9, 0.6, 0.45]) {
  // Mirror CabinBoqPanel: buildCabinTakeoff(config, settings.norms, opts) — the take-off is rebuilt.
  const norms = { ...DEFAULT_NORMS, studSpacingM: spacing };
  const tkS = buildCabinTakeoff({ ...cfg, roomLengths: [20] }, norms, {});
  const st: BoqSettings = { ...defaultBoqSettings("ms_cabin"), norms };
  const g = groupSummary(priceTakeoff(tkS, MATS, st)).byGroup.stud;
  studCounts.push(g.pcs);
  console.log(`  studSpacingM=${spacing} m  →  ${n(g.pcs, 0)} stiffeners · ${n(g.kg)} kg · Rs.${Math.round(g.amt).toLocaleString("en-IN")}`);
}
const spacingMonotonic = studCounts[0] < studCounts[1] && studCounts[1] < studCounts[2];
console.log(`  Expect: tighter spacing → MORE stiffeners. 0.9m<0.6m<0.45m counts monotonic? ${spacingMonotonic}`);

console.log("\n" + "=".repeat(84));
console.log("TEST C — MEMBER/SECTION swap on the base frame (panel writes per-line materialKey override)");
console.log("=".repeat(84));
const baseLineIds = r0.lines.filter((l) => owner(l) === "base").map((l) => l.id);
const stDefault = groupSummary(r0).byGroup.base;
console.log(`  default base frame (${MATS["ismc-100x50"].name}, ${n(MATS["ismc-100x50"].unitWeight)} kg/m): ${n(stDefault.kg)} kg · Rs.${Math.round(stDefault.amt).toLocaleString("en-IN")}`);
const swap: BoqSettings = { ...defaultBoqSettings("ms_cabin"), overrides: Object.fromEntries(baseLineIds.map((id) => [id, { materialKey: "rhs-100x50x3" }])) };
const gSwap = groupSummary(priceTakeoff(tk, MATS, swap)).byGroup.base;
console.log(`  swapped to ${MATS["rhs-100x50x3"].name} (${n(MATS["rhs-100x50x3"].unitWeight)} kg/m):        ${n(gSwap.kg)} kg · Rs.${Math.round(gSwap.amt).toLocaleString("en-IN")}`);
console.log(`  Expect: lighter RHS section → lower base-frame weight. (${n(MATS["rhs-100x50x3"].unitWeight)} < ${n(MATS["ismc-100x50"].unitWeight)} kg/m)`);

console.log("\n" + "=".repeat(84));
console.log("TEST D — NUMBER override + LOCK survives a dimension change (panel writes qty + locked)");
console.log("=".repeat(84));
const frontStud = r0.lines.find((l) => l.id === "front:studs")!;
console.log(`  auto front:studs at 20 ft: ${n(frontStud.pieces, 0)} pcs`);
const locked: BoqSettings = { ...defaultBoqSettings("ms_cabin"), overrides: { "front:studs": { qty: 99, locked: true } } };
const rLock = priceTakeoff(tk, MATS, locked);
const lockedLine = rLock.lines.find((l) => l.id === "front:studs")!;
console.log(`  locked to 99: ${n(lockedLine.pieces, 0)} pcs · source=${lockedLine.qtySource}`);
// now grow the cabin to 30 ft and re-price with the SAME locked override
const tk30 = build({ ...cfg, length: 30, roomLengths: [30] });
const rLock30 = priceTakeoff(tk30, MATS, locked);
const lockedLine30 = rLock30.lines.find((l) => l.id === "front:studs")!;
const autoLine30 = priceTakeoff(tk30, MATS, defaultBoqSettings("ms_cabin")).lines.find((l) => l.id === "front:studs")!;
console.log(`  after growing to 30 ft — auto would be ${n(autoLine30.pieces, 0)} pcs, but LOCKED stays ${n(lockedLine30.pieces, 0)} pcs · source=${lockedLine30.qtySource}`);
console.log(`  Expect: locked stays 99 through the dimension change; the id "front:studs" is stable.`);

console.log("\n" + "=".repeat(84));
console.log("RESULT");
console.log("=".repeat(84));
const ok =
  !!s0.byGroup.base && !!s0.byGroup.stud &&
  spacingMonotonic &&
  gSwap.kg < stDefault.kg &&
  lockedLine30.pieces === 99 && lockedLine30.qtySource === "locked";
console.log(ok ? "ALL FRAME-CONFIG DATA-FLOW CHECKS PASSED" : "A CHECK FAILED — investigate above");
