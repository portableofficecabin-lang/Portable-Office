/**
 * Material BOQ — the five required test scenarios, run against the real engine.
 * No mocks: real CabinConfig, real calculateLabourColony(), real SEED_MATERIALS, real priceTakeoff().
 */
import { buildDefaultConfig, normalizeRoomLengths, computeEstimate, type CabinConfig } from "../src/components/home/cabin-calculator/pricing";
import { calculateLabourColony, type LabourColonyConfig } from "../src/lib/quotation/labourColony";
import { buildCabinTakeoff, type CabinBoqOptions } from "../src/lib/boq/cabinTakeoff";
import { buildColonyTakeoff } from "../src/lib/boq/colonyTakeoff";
import { priceTakeoff } from "../src/lib/boq/engine";
import { SEED_MATERIALS, indexMaterials } from "../src/lib/boq/materialMaster";
import { defaultBoqSettings, DEFAULT_NORMS, SQM_TO_SQFT, type Takeoff, type BoqResult, type BoqTemplateKind } from "../src/lib/boq/types";

const MATS = indexMaterials(SEED_MATERIALS);
const n2 = (x: number) => x.toFixed(2);
const inr = (x: number) => "Rs." + Math.round(x).toLocaleString("en-IN");

function report(label: string, tk: Takeoff, r: BoqResult) {
  console.log("\n" + "=".repeat(90));
  console.log("SCENARIO: " + label);
  console.log("=".repeat(90));
  const m = tk.meta;
  console.log(`META  ${n2(m.lengthM)}m x ${n2(m.widthM)}m x ${n2(m.heightM)}m | floors ${m.floors} | rooms ${m.rooms} | partitions ${m.partitions}`);
  console.log(`      doors ${m.doors} | windows ${m.windows} | stairs ${m.staircases} | verandas ${m.verandas} | modules ${m.modules}`);
  console.log(`      floor area ${n2(m.floorAreaSqm)} sqm (${n2(m.floorAreaSqm * SQM_TO_SQFT)} sqft) | roof ${m.roofType}`);

  console.log("\nSECTION-WISE BREAKUP (spec 5):");
  console.log("  " + "section".padEnd(20) + "steel kg".padStart(11) + "total kg".padStart(11) + "material Rs".padStart(14) + "lines".padStart(7));
  for (const s of r.sections) {
    console.log("  " + s.label.padEnd(20) + n2(s.steelKg).padStart(11) + n2(s.totalKg).padStart(11) + inr(s.materialAmount).padStart(14) + String(s.lines).padStart(7));
  }

  const t = r.totals;
  console.log("\nTOTALS:");
  console.log(`  net steel ${n2(t.netSteelKg)} kg -> with wastage ${n2(t.totalSteelKg)} kg`);
  console.log(`  TOTAL WEIGHT      ${n2(t.totalWeightKg)} kg  (${n2(t.totalTonnes)} t)`);
  console.log(`  material          ${inr(t.materialAmount)}`);
  for (const c of t.chargeLines) console.log(`    + ${c.label.padEnd(24)} ${c.basis.padEnd(9)} ${inr(c.amount)}`);
  console.log(`  charges           ${inr(t.chargesAmount)}`);
  console.log(`  subtotal          ${inr(t.subtotal)}`);
  console.log(`  GST               ${inr(t.gstAmount)}`);
  console.log(`  GRAND TOTAL       ${inr(t.grandTotal)}`);
  console.log(`  Rs/sqft           ${n2(t.ratePerSqft)}`);

  console.log("\nBOQ LINES (first 22 of " + r.lines.length + "):");
  console.log("  " + "description".padEnd(38) + "qty".padStart(9) + " uom".padEnd(6) + "unitwt".padStart(8) + "totkg".padStart(9) + "rate".padStart(8) + "amount".padStart(12));
  for (const l of r.lines.slice(0, 22)) {
    console.log("  " + l.description.slice(0, 37).padEnd(38) + n2(l.qty).padStart(9) + (" " + l.uom).padEnd(6) +
      (l.unitWeight == null ? "-" : n2(l.unitWeight)).padStart(8) + n2(l.totalWeightKg).padStart(9) +
      (l.rate == null ? "-" : String(l.rate)).padStart(8) + inr(l.amount).padStart(12));
  }

  console.log("\nSTEEL CUTTING LIST (first 16 of " + r.cuttingList.length + "):");
  console.log("  " + "member".padEnd(40) + "spec".padEnd(24) + "cut m".padStart(8) + "qty".padStart(6) + "tot m".padStart(9) + "kg".padStart(9));
  for (const c of r.cuttingList.slice(0, 16)) {
    console.log("  " + c.member.slice(0, 39).padEnd(40) + c.spec.slice(0, 23).padEnd(24) + n2(c.cutLengthM).padStart(8) +
      String(c.qty).padStart(6) + n2(c.totalLengthM).padStart(9) + n2(c.weightKg).padStart(9));
  }

  console.log("\nPURCHASE (first 8 of " + r.purchase.length + "):");
  for (const p of r.purchase.slice(0, 8)) {
    console.log(`  ${p.material.slice(0, 34).padEnd(35)} net ${n2(p.netQty).padStart(9)} ${p.uom.padEnd(4)} +${n2(p.wastagePercent)}% -> buy ${n2(p.purchaseQty).padStart(9)} | ${p.stockUnits ?? "-"} ${p.stockUnitLabel ?? ""}`);
  }

  const errs = r.issues.filter((i) => i.severity === "error");
  const warns = r.issues.filter((i) => i.severity === "warning");
  console.log(`\nVALIDATION (spec 10): ${errs.length} ERROR, ${warns.length} warning`);
  for (const i of r.issues) console.log(`  [${i.severity.toUpperCase().padEnd(7)}] ${i.code.padEnd(26)} ${i.message}`);

  if (tk.notes.length) {
    console.log("\nNOTES / DE-DUPLICATION:");
    for (const nt of tk.notes) console.log("  - " + nt);
  }
  return r;
}

function cabin(label: string, patch: Partial<CabinConfig>, opts: CabinBoqOptions = {}, kind: BoqTemplateKind = "ms_cabin") {
  const base = buildDefaultConfig("porta-cabin");
  const cfg: CabinConfig = { ...base, ...patch };
  cfg.roomLengths = normalizeRoomLengths(cfg.length, cfg.roomCount, cfg.roomLengths);
  const tk = buildCabinTakeoff(cfg, DEFAULT_NORMS, opts);
  const r = priceTakeoff(tk, MATS, defaultBoqSettings(kind));
  report(label, tk, r);
  const est = computeEstimate(cfg);
  console.log(`\nCROSS-CHECK vs the repo's own top-down model (pricing.ts computeEstimate):`);
  console.log(`  computeEstimate total ${inr(est.total)} (${n2(est.total / est.area)} Rs/sqft over ${est.area} sqft)`);
  console.log(`  BOQ grand total       ${inr(r.totals.grandTotal)} (${n2(r.totals.ratePerSqft)} Rs/sqft)`);
  console.log(`  delta                 ${n2((r.totals.grandTotal / est.total - 1) * 100)}%`);
  return r;
}

function colony(label: string, patch: Partial<LabourColonyConfig>) {
  const cfg: LabourColonyConfig = {
    projectName: label, location: "",
    personsPerRoom: 8, floors: 2,
    roomLength: 3, roomWidth: 3, roomHeight: 2.7,
    corridorWidth: 1.5, corridorPosition: "center", staircasePosition: "both",
    panelType: "PUF", panelThicknessMm: 50, wastagePercent: 5,
    facilities: { toilet: true, bunkBeds: true, diningKitchen: false, officeSecurity: false },
    ...patch,
  } as LabourColonyConfig;
  const result = calculateLabourColony(cfg);
  const tk = buildColonyTakeoff(result, DEFAULT_NORMS);
  const r = priceTakeoff(tk, MATS, defaultBoqSettings("labour_colony"));
  report(label, tk, r);
  console.log(`\nENGINE CROSS-CHECK (labourColony.ts's own weight model):`);
  console.log(`  legacy structural steel ${n2(result.structural.totalSteelKg)} kg | legacy total ${n2(result.weight.totalKg)} kg`);
  console.log(`  BOQ steel ${n2(r.totals.totalSteelKg)} kg | BOQ total ${n2(r.totals.totalWeightKg)} kg`);
  console.log(`  legacy counts every module as a standalone box (no shared-wall deduction) so BOQ steel SHOULD be lower.`);
  return r;
}

/* ============================= 1. ONE STANDARD CABIN ============================= */
cabin("1. Standard cabin — 20 x 10 x 8.5 ft, 1 room, 1 door, 1 window, sloped roof", {
  length: 20, width: 10, height: 8.5,
  structureId: "ms", roofId: "sloped",
  roomCount: 1, roomLengths: [20],
  doorQty: 1, doorPlacements: [{ side: "bottom", offset: 8, hand: "left", swing: "out" }],
  windowQty: 1, windowPlacements: [{ side: "top", offset: 8 }],
  windowWidthFt: 3, windowHeightFt: 3,
  partitionDoor: false,
});

/* ============================= 2. CABIN WITH PARTITIONS ============================= */
cabin("2. Cabin with internal partitions — 40 x 10 ft, 3 rooms (2 partitions), partition doors", {
  length: 40, width: 10, height: 8.5,
  structureId: "ms", roofId: "sloped",
  roomCount: 3, roomLengths: [],
  doorQty: 1, doorPlacements: [{ side: "bottom", offset: 4, hand: "left", swing: "out" }],
  windowQty: 2, windowPlacements: [{ side: "top", offset: 5 }, { side: "top", offset: 25 }],
  partitionDoor: true,
});

/* ============================= 3. MULTIPLE DOORS AND WINDOWS ============================= */
cabin("3. Cabin with multiple doors and windows — 30 x 12 ft, 3 doors, 5 windows on all 4 walls", {
  length: 30, width: 12, height: 8.5,
  structureId: "ms", roofId: "sloped",
  roomCount: 1, roomLengths: [30],
  doorQty: 3,
  doorPlacements: [
    { side: "bottom", offset: 4, hand: "left", swing: "out" },   // -> FRONT elevation
    { side: "top", offset: 20, hand: "right", swing: "out" },    // -> REAR elevation
    { side: "left", offset: 4, hand: "left", swing: "out" },     // -> LEFT elevation
  ],
  windowQty: 5,
  windowPlacements: [
    { side: "bottom", offset: 12 },  // FRONT
    { side: "bottom", offset: 20 },  // FRONT
    { side: "top", offset: 6 },      // REAR
    { side: "left", offset: 8 },     // LEFT
    { side: "right", offset: 4 },    // RIGHT
  ],
  windowWidthFt: 4, windowHeightFt: 3,
  partitionDoor: false,
});

/* ============================= 4. G+1 LABOUR COLONY ============================= */
colony("4. G+1 Labour Colony — 12 rooms, 3.0 x 3.0 x 2.7 m, centre corridor, staircase", {
  floors: 2, totalRooms: 12, capacity: undefined,
  corridorPosition: "center", staircasePosition: "left",
});

/* ============================= 5. MULTI-STAIRCASE + VERANDA COLONY ============================= */
colony("5. Labour Colony — 20 rooms, G+1, TWO staircases, TWO verandas, railings", {
  floors: 2, totalRooms: 20, capacity: undefined,
  corridorPosition: "both", staircasePosition: "both",
  floorPlan: {
    showRailing: true,
    verandas: [
      { id: "v1", label: "Front veranda", enabled: true, side: "bottom", widthM: 1.5, railing: true },
      { id: "v2", label: "Rear veranda", enabled: true, side: "top", widthM: 1.5, railing: true },
    ],
    staircases: [
      { id: "s1", label: "Staircase 1", enabled: true, position: "left", widthM: 1.2, handrail: true },
      { id: "s2", label: "Staircase 2", enabled: true, position: "right", widthM: 1.2, handrail: true },
    ],
    roof: { type: "gable", riseM: 0.7, overhangM: 0.3 },
  },
});

console.log("\n" + "=".repeat(90));
console.log("ALL 5 SCENARIOS EXECUTED");
console.log("=".repeat(90));
