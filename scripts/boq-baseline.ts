/**
 * MATERIAL BOQ — GOLDEN REGRESSION BASELINE.
 *
 * Prints a STABLE, DETERMINISTIC, DIFFABLE numeric fingerprint of the canonical BOQ scenarios
 * (3 cabins + 2 labour colonies + 1 extra cabin) priced through the REAL engine with the DEFAULT
 * settings. Capture it once to scripts/boq-baseline.golden.txt, then re-run after every change and
 * `diff` — any line that moves is either an INTENDED delta (explain it) or a REGRESSION (fix it).
 *
 * The whole non-destructive upgrade rests on this: new optional fields must default to today's
 * behaviour, so every one of these numbers must stay byte-identical unless a change is deliberately
 * targeting that exact line. The two colony scenarios in particular guard the shared sheet/steel
 * pricing path (calc.ts / engine.ts) that the Labour-Colony calculator reuses.
 *
 * Run:  npx tsx scripts/boq-baseline.ts
 * Snap: npx tsx scripts/boq-baseline.ts > scripts/boq-baseline.golden.txt
 * Diff: npx tsx scripts/boq-baseline.ts | git diff --no-index scripts/boq-baseline.golden.txt -
 */
import {
  buildDefaultConfig,
  normalizeRoomLengths,
  type CabinConfig,
} from "../src/components/home/cabin-calculator/pricing";
import { calculateLabourColony, type LabourColonyConfig } from "../src/lib/quotation/labourColony";
import { buildCabinTakeoff, type CabinBoqOptions } from "../src/lib/boq/cabinTakeoff";
import { buildColonyTakeoff } from "../src/lib/boq/colonyTakeoff";
import { priceTakeoff } from "../src/lib/boq/engine";
import { SEED_MATERIALS, indexMaterials } from "../src/lib/boq/materialMaster";
import {
  defaultBoqSettings,
  DEFAULT_NORMS,
  type BoqResult,
  type BoqSettings,
  type BoqTemplateKind,
  type Takeoff,
} from "../src/lib/boq/types";

const MATS = indexMaterials(SEED_MATERIALS);

/* ---- deterministic formatters (fixed decimals so floating noise never diffs) ---- */
const w = (x: number) => x.toFixed(3); // weights / lengths / areas (kg, m, sqm)
const money = (x: number) => Math.round(x).toString(); // integer rupees
const rate = (x: number | null) => (x == null ? "-" : x.toFixed(2));
const bool = (b: boolean) => (b ? "Y" : "N");
const sortByStr =
  <T,>(key: (t: T) => string) =>
  (a: T, b: T) =>
    key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;

/** One scenario's fingerprint — every field a regression could touch, in a stable order. */
function fingerprint(label: string, tk: Takeoff, r: BoqResult): string {
  const out: string[] = [];
  out.push("################################################################");
  out.push("SCENARIO :: " + label);
  out.push("################################################################");

  const m = tk.meta;
  out.push(
    `META  L=${w(m.lengthM)} W=${w(m.widthM)} H=${w(m.heightM)} floors=${m.floors} rooms=${m.rooms} ` +
      `partitions=${m.partitions} doors=${m.doors} windows=${m.windows} stairs=${m.staircases} ` +
      `verandas=${m.verandas} modules=${m.modules} floorArea=${w(m.floorAreaSqm)} roof=${m.roofType}`,
  );

  const t = r.totals;
  out.push(
    `TOTALS netSteel=${w(t.netSteelKg)} totSteel=${w(t.totalSteelKg)} totWeight=${w(t.totalWeightKg)} ` +
      `material=${money(t.materialAmount)} charges=${money(t.chargesAmount)} subtotal=${money(t.subtotal)} ` +
      `gst=${money(t.gstAmount)} grand=${money(t.grandTotal)} rsPerSqft=${t.ratePerSqft.toFixed(2)}`,
  );
  for (const c of [...t.chargeLines].sort(sortByStr((x) => x.label))) {
    out.push(`  CHARGE ${c.label} [${c.basis}] = ${money(c.amount)}`);
  }

  out.push("SECTIONS:");
  for (const s of [...r.sections].sort(sortByStr((x) => x.section))) {
    out.push(
      `  SEC ${s.section.padEnd(11)} steelKg=${w(s.steelKg)} totKg=${w(s.totalKg)} ` +
        `material=${money(s.materialAmount)} lines=${s.lines}`,
    );
  }

  out.push(`LINES (${r.lines.length}):`);
  for (const l of [...r.lines].sort(sortByStr((x) => x.id))) {
    out.push(
      `  LINE ${l.id.padEnd(34)} src=${l.qtySource.padEnd(6)} en=${bool(l.enabled)} ` +
        `qty=${w(l.qty)} ${l.uom.padEnd(5)} pcs=${l.pieces ?? "-"} cut=${l.cutLengthM == null ? "-" : w(l.cutLengthM)} ` +
        `run=${l.runningLengthM == null ? "-" : w(l.runningLengthM)} net=${l.netAreaSqm == null ? "-" : w(l.netAreaSqm)} ` +
        `sheets=${l.sheets ?? "-"} totKg=${w(l.totalWeightKg)} rate=${rate(l.rate)} amt=${money(l.amount)} mat=${l.materialKey}`,
    );
  }

  out.push(`CUTTING (${r.cuttingList.length}):`);
  const cut = [...r.cuttingList].sort(sortByStr((x) => `${x.materialKey}|${x.member}|${x.cutLengthM.toFixed(3)}`));
  for (const c of cut) {
    out.push(
      `  CUT ${c.materialKey.padEnd(20)} ${c.member.padEnd(42)} cut=${w(c.cutLengthM)} qty=${c.qty} ` +
        `totLen=${w(c.totalLengthM)} kg=${w(c.weightKg)}`,
    );
  }

  out.push(`PURCHASE (${r.purchase.length}):`);
  for (const p of [...r.purchase].sort(sortByStr((x) => x.materialKey))) {
    out.push(
      `  BUY ${p.materialKey.padEnd(20)} net=${w(p.netQty)} ${p.uom.padEnd(5)} wst=${p.wastagePercent.toFixed(2)} ` +
        `buy=${w(p.purchaseQty)} stock=${p.stockUnits ?? "-"} offcut=${p.offcut == null ? "-" : w(p.offcut)} ` +
        `kg=${w(p.totalWeightKg)} amt=${money(p.amount)}`,
    );
  }

  out.push(`WEIGHT SUMMARY (${r.weightSummary.length}):`);
  for (const ws of [...r.weightSummary].sort(sortByStr((x) => x.materialKey))) {
    out.push(`  WT ${ws.materialKey.padEnd(20)} net=${w(ws.netKg)} tot=${w(ws.totalKg)}`);
  }

  const errs = r.issues.filter((i) => i.severity === "error");
  const warns = r.issues.filter((i) => i.severity === "warning");
  out.push(`ISSUES errors=${errs.length} warnings=${warns.length}`);
  for (const i of [...r.issues].sort(sortByStr((x) => x.code + x.refs.join(",")))) {
    out.push(`  ISSUE [${i.severity}] ${i.code} refs=${i.refs.join(",")}`);
  }
  out.push("");
  return out.join("\n");
}

function cabinScenario(
  label: string,
  patch: Partial<CabinConfig>,
  opts: CabinBoqOptions = {},
  kind: BoqTemplateKind = "ms_cabin",
  settings?: BoqSettings,
): string {
  const base = buildDefaultConfig("porta-cabin");
  const cfg: CabinConfig = { ...base, ...patch };
  cfg.roomLengths = normalizeRoomLengths(cfg.length, cfg.roomCount, cfg.roomLengths);
  const tk = buildCabinTakeoff(cfg, (settings ?? defaultBoqSettings(kind)).norms, opts);
  const r = priceTakeoff(tk, MATS, settings ?? defaultBoqSettings(kind));
  return fingerprint(label, tk, r);
}

function colonyScenario(label: string, patch: Partial<LabourColonyConfig>): string {
  const cfg: LabourColonyConfig = {
    projectName: label,
    location: "",
    personsPerRoom: 8,
    floors: 2,
    roomLength: 3,
    roomWidth: 3,
    roomHeight: 2.7,
    corridorWidth: 1.5,
    corridorPosition: "center",
    staircasePosition: "both",
    panelType: "PUF",
    panelThicknessMm: 50,
    wastagePercent: 5,
    facilities: { toilet: true, bunkBeds: true, diningKitchen: false, officeSecurity: false },
    ...patch,
  } as LabourColonyConfig;
  const result = calculateLabourColony(cfg);
  const tk = buildColonyTakeoff(result, DEFAULT_NORMS);
  const r = priceTakeoff(tk, MATS, defaultBoqSettings("labour_colony"));
  return fingerprint(label, tk, r);
}

/* ================================ THE ORACLE SET ================================ */
const blocks: string[] = [];

blocks.push(
  cabinScenario("1. Standard cabin — 20 x 10 x 8.5 ft, 1 room, 1 door, 1 window, sloped roof", {
    length: 20,
    width: 10,
    height: 8.5,
    structureId: "ms",
    roofId: "sloped",
    roomCount: 1,
    roomLengths: [20],
    doorQty: 1,
    doorPlacements: [{ side: "bottom", offset: 8, hand: "left", swing: "out" }],
    windowQty: 1,
    windowPlacements: [{ side: "top", offset: 8 }],
    windowWidthFt: 3,
    windowHeightFt: 3,
    partitionDoor: false,
  }),
);

blocks.push(
  cabinScenario("2. Cabin with internal partitions — 40 x 10 ft, 3 rooms (2 partitions), partition doors", {
    length: 40,
    width: 10,
    height: 8.5,
    structureId: "ms",
    roofId: "sloped",
    roomCount: 3,
    roomLengths: [],
    doorQty: 1,
    doorPlacements: [{ side: "bottom", offset: 4, hand: "left", swing: "out" }],
    windowQty: 2,
    windowPlacements: [
      { side: "top", offset: 5 },
      { side: "top", offset: 25 },
    ],
    partitionDoor: true,
  }),
);

blocks.push(
  cabinScenario("3. Cabin with multiple doors and windows — 30 x 12 ft, 3 doors, 5 windows on all 4 walls", {
    length: 30,
    width: 12,
    height: 8.5,
    structureId: "ms",
    roofId: "sloped",
    roomCount: 1,
    roomLengths: [30],
    doorQty: 3,
    doorPlacements: [
      { side: "bottom", offset: 4, hand: "left", swing: "out" },
      { side: "top", offset: 20, hand: "right", swing: "out" },
      { side: "left", offset: 4, hand: "left", swing: "out" },
    ],
    windowQty: 5,
    windowPlacements: [
      { side: "bottom", offset: 12 },
      { side: "bottom", offset: 20 },
      { side: "top", offset: 6 },
      { side: "left", offset: 8 },
      { side: "right", offset: 4 },
    ],
    windowWidthFt: 4,
    windowHeightFt: 3,
    partitionDoor: false,
  }),
);

blocks.push(
  colonyScenario("4. G+1 Labour Colony — 12 rooms, 3.0 x 3.0 x 2.7 m, centre corridor, staircase", {
    floors: 2,
    totalRooms: 12,
    capacity: undefined,
    corridorPosition: "center",
    staircasePosition: "left",
  } as Partial<LabourColonyConfig>),
);

blocks.push(
  colonyScenario("5. Labour Colony — 20 rooms, G+1, TWO staircases, TWO verandas, railings", {
    floors: 2,
    totalRooms: 20,
    capacity: undefined,
    corridorPosition: "both",
    staircasePosition: "both",
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
  } as Partial<LabourColonyConfig>),
);

// Extra cabin — flat roof + PUF + veranda/handrail + G+1 to exercise more branches under DEFAULT settings.
blocks.push(
  cabinScenario(
    "6. Extra coverage cabin — 24 x 12 x 9 ft, 2 rooms, flat roof, PUF, G+1, veranda + handrail",
    {
      length: 24,
      width: 12,
      height: 9,
      structureId: "puf",
      roofId: "flat",
      roomCount: 2,
      roomLengths: [],
      doorQty: 2,
      doorPlacements: [
        { side: "bottom", offset: 6, hand: "left", swing: "out" },
        { side: "top", offset: 18, hand: "right", swing: "out" },
      ],
      windowQty: 3,
      windowPlacements: [
        { side: "bottom", offset: 12 },
        { side: "left", offset: 6 },
        { side: "right", offset: 6 },
      ],
      windowWidthFt: 4,
      windowHeightFt: 3,
      partitionDoor: true,
    },
    { floors: 2, staircase: true, verandaWidthFt: 4, verandaSides: ["front"], handrail: true },
    "puf_cabin",
  ),
);

console.log(blocks.join("\n"));
console.log("################################################################");
console.log("BASELINE COMPLETE — 6 scenarios fingerprinted");
console.log("################################################################");
