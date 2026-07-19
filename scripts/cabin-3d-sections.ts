/**
 * Verifies that the 3D cabin model's frame members visually scale to the real Material Master section
 * dimensions, and that a section swap moves BOTH the 3D geometry AND the BOQ — without buildCabinModel
 * altering any BOQ quantity/weight.
 */
import { buildDefaultConfig, normalizeRoomLengths, type CabinConfig } from "../src/components/home/cabin-calculator/pricing";
import { buildCabinModel } from "../src/features/cabin-design/model/cabinModel";
import { parseSectionDims } from "../src/features/cabin-design/model/sectionDims";
import { buildCabinTakeoff } from "../src/lib/boq/cabinTakeoff";
import { priceTakeoff } from "../src/lib/boq/engine";
import { SEED_MATERIALS, indexMaterials } from "../src/lib/boq/materialMaster";
import { defaultBoqSettings, DEFAULT_NORMS, type BoqSettings } from "../src/lib/boq/types";
import type { CabinModel } from "../src/features/cabin-design/model/types";

const MATS = indexMaterials(SEED_MATERIALS);
const n = (x: number, d = 0) => x.toFixed(d);

/** Cross-section (mm) of a box part = the two smaller extents (the third is the member's length). */
function xsecOf(model: CabinModel, id: string): { a: number; b: number; len: number } | null {
  const p = model.parts.find((pp) => pp.id === id);
  if (!p || p.solid.kind !== "box") return null;
  const dx = p.solid.max.x - p.solid.min.x;
  const dy = p.solid.max.y - p.solid.min.y;
  const dz = p.solid.max.z - p.solid.min.z;
  const dims = [dx, dy, dz].sort((u, v) => u - v);
  return { a: Math.round(dims[0]), b: Math.round(dims[1]), len: Math.round(dims[2]) };
}

const base = buildDefaultConfig("porta-cabin");
const cfg: CabinConfig = {
  ...base, length: 20, width: 10, height: 8.5, structureId: "ms", roofId: "sloped",
  roomCount: 1, roomLengths: [20], doorQty: 1, windowQty: 1,
};
cfg.roomLengths = normalizeRoomLengths(cfg.length, cfg.roomCount, cfg.roomLengths);

const SAMPLES: { label: string; id: string; expectKey: string }[] = [
  { label: "Base frame (long)", id: "floor:base-frame-long-a", expectKey: "ismc-100x50" },
  { label: "Base frame (cross)", id: "floor:base-frame-cross-a", expectKey: "ismc-100x50" },
  { label: "Floor joist", id: "floor:joist:0", expectKey: "rhs-100x50x3" },
  { label: "Corner column", id: "column:corner:0", expectKey: "shs-50x50x3" },
  { label: "Top frame (long)", id: "roof:top-frame-a", expectKey: "ismc-100x50" },
  { label: "Ridge", id: "roof:ridge", expectKey: "angle-50x50x5" },
];

console.log("=".repeat(80));
console.log("TEST 1 — default sections: each member's 3D cross-section matches its Material Master section");
console.log("=".repeat(80));
const m0 = buildCabinModel(cfg);
// a stud + a post id (indices depend on the frame; find the first of each)
const studId = m0.parts.find((p) => p.kind === "stud")?.id ?? "";
// intermediate posts are PartKind "column" but their id carries the frame kind ":post:"
const postId = m0.parts.find((p) => p.kind === "column" && p.id.includes(":post:"))?.id ?? "";
const rows = [...SAMPLES, { label: "Wall stud (stiffener)", id: studId, expectKey: "shs-40x40x2" },
  { label: "Intermediate post", id: postId, expectKey: "shs-50x50x3" }];
let ok1 = true;
for (const r of rows) {
  const xs = xsecOf(m0, r.id);
  const d = parseSectionDims(MATS[r.expectKey].sectionSize, MATS[r.expectKey].thicknessMm)!;
  const expA = Math.min(d.widthMm, d.depthMm), expB = Math.max(d.widthMm, d.depthMm);
  const match = xs != null && Math.abs(xs.a - expA) <= 1 && Math.abs(xs.b - expB) <= 1;
  ok1 &&= match;
  console.log(`  ${r.label.padEnd(26)} 3D ${xs ? `${n(xs.a)}×${n(xs.b)}` : "—"} mm  vs  ${MATS[r.expectKey].sectionSize} (${n(expA)}×${n(expB)})  ${match ? "OK" : "MISMATCH"}`);
}

console.log("\n" + "=".repeat(80));
console.log("TEST 2 — SECTION SWAP moves the 3D geometry AND the BOQ together");
console.log("=".repeat(80));
const baseLineIds = ["floor:base-frame-long", "floor:base-frame-cross"];
const studLineIds = ["front:studs", "rear:studs", "left:studs", "right:studs"];
const swap: BoqSettings = {
  ...defaultBoqSettings("ms_cabin"),
  overrides: {
    ...Object.fromEntries(baseLineIds.map((id) => [id, { materialKey: "angle-40x40x5" }])),
    ...Object.fromEntries(studLineIds.map((id) => [id, { materialKey: "shs-50x50x3" }])),
  },
};
const cfgSwap: CabinConfig = { ...cfg, boq: swap };

// BOQ before/after
const tk = buildCabinTakeoff(cfg, DEFAULT_NORMS, {});
const r0 = priceTakeoff(tk, MATS, defaultBoqSettings("ms_cabin"));
const rS = priceTakeoff(tk, MATS, swap);
const baseKg0 = r0.lines.filter((l) => /base frame/i.test(l.description)).reduce((s, l) => s + l.totalWeightKg, 0);
const baseKgS = rS.lines.filter((l) => /base frame/i.test(l.description)).reduce((s, l) => s + l.totalWeightKg, 0);
const studKg0 = r0.lines.filter((l) => /stiffener|stud/i.test(l.description)).reduce((s, l) => s + l.totalWeightKg, 0);
const studKgS = rS.lines.filter((l) => /stiffener|stud/i.test(l.description)).reduce((s, l) => s + l.totalWeightKg, 0);

// 3D before/after
const mS = buildCabinModel(cfgSwap);
const b0 = xsecOf(m0, "floor:base-frame-long-a")!, bS = xsecOf(mS, "floor:base-frame-long-a")!;
const s0 = xsecOf(m0, studId)!, sS = xsecOf(mS, mS.parts.find((p) => p.kind === "stud")!.id)!;

console.log("  BASE FRAME  ISMC 100×50 → MS Angle 40×40");
console.log(`    3D cross-section: ${n(b0.a)}×${n(b0.b)} mm → ${n(bS.a)}×${n(bS.b)} mm   (${bS.b < b0.b ? "SHRANK ✓" : "no change ✗"})`);
console.log(`    BOQ weight:       ${n(baseKg0, 1)} kg → ${n(baseKgS, 1)} kg           (${baseKgS < baseKg0 ? "lighter ✓" : "✗"})`);
console.log("  CROSS STIFFENERS  40×40 SHS → 50×50 SHS");
console.log(`    3D cross-section: ${n(s0.a)}×${n(s0.b)} mm → ${n(sS.a)}×${n(sS.b)} mm   (${sS.b > s0.b ? "GREW ✓" : "no change ✗"})`);
console.log(`    BOQ weight:       ${n(studKg0, 1)} kg → ${n(studKgS, 1)} kg           (${studKgS > studKg0 ? "heavier ✓" : "✗"})`);

console.log("\n" + "=".repeat(80));
console.log("TEST 3 — buildCabinModel does NOT alter the BOQ take-off (no feedback into quantities)");
console.log("=".repeat(80));
// Build the model, then re-derive the take-off; it must be byte-identical to one derived without ever
// building a model (buildCabinModel must be side-effect free w.r.t. the BOQ).
const tkA = JSON.stringify(buildCabinTakeoff(cfg, DEFAULT_NORMS, {}));
buildCabinModel(cfg);
buildCabinModel(cfgSwap);
const tkB = JSON.stringify(buildCabinTakeoff(cfg, DEFAULT_NORMS, {}));
const identical = tkA === tkB;
console.log(`  take-off identical before/after building 3D models: ${identical ? "YES ✓" : "NO ✗"}`);

console.log("\n" + "=".repeat(80));
console.log("TEST 4 — no member dropped, no NaN/degenerate box (existing 3D not broken)");
console.log("=".repeat(80));
const countSame = m0.parts.length === mS.parts.length;
let degenerate = 0;
for (const p of mS.parts) {
  if (p.solid.kind === "box") {
    const { min, max } = p.solid;
    if (![min.x, min.y, min.z, max.x, max.y, max.z].every(Number.isFinite) || max.x <= min.x || max.y <= min.y || max.z <= min.z) degenerate++;
  }
}
console.log(`  part count unchanged by swap: ${countSame ? "YES ✓" : `NO (${m0.parts.length} → ${mS.parts.length}) ✗`}`);
console.log(`  degenerate/NaN boxes after swap: ${degenerate === 0 ? "0 ✓" : `${degenerate} ✗`}`);

const allOk = ok1 && bS.b < b0.b && baseKgS < baseKg0 && sS.b > s0.b && studKgS > studKg0 && identical && countSame && degenerate === 0;
console.log("\n" + "=".repeat(80));
console.log(allOk ? "ALL 3D SECTION-SCALING CHECKS PASSED" : "A CHECK FAILED — investigate above");
console.log("=".repeat(80));
if (!allOk) process.exit(1);
