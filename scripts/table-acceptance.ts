/**
 * TABLE CUSTOMISATION MODULE — the spec's acceptance tests (§34), run against the REAL engine.
 *
 * No mocks. Real CabinConfig, real geometry, real cabinTakeoff → priceTakeoff, real collision,
 * real validation, real quotation rows. Run:  npx tsx scripts/table-acceptance.ts
 */

import {
  buildDefaultConfig,
  normalizeRoomLengths,
  computeEstimate,
  type CabinConfig,
} from "../src/components/home/cabin-calculator/pricing";
import { buildCabinTakeoff } from "../src/lib/boq/cabinTakeoff";
import { priceTakeoff } from "../src/lib/boq/engine";
import { indexMaterials } from "../src/lib/boq/materialMaster";
import { SEED_MATERIALS } from "../src/lib/boq/seedMaterials";
import { defaultBoqSettings, DEFAULT_NORMS } from "../src/lib/boq/types";

import {
  applyPreset,
  changeMaterial,
  changeShape,
  createTable,
  duplicateTable,
  clampTable,
} from "../src/features/cabin-design/furniture/tables/tableDefaults";
import {
  tableFootprint,
  tableWorldBbox,
  topAreaSqm,
  topPerimeterM,
  footprintSize,
} from "../src/features/cabin-design/furniture/tables/tableGeometry";
import { buildContext, checkAllTables } from "../src/features/cabin-design/furniture/tables/tableCollision";
import { validateTables } from "../src/features/cabin-design/furniture/tables/tableValidation";
import { autoArrange } from "../src/features/cabin-design/furniture/tables/tableAutoArrange";
import { priceTables, defaultMaterialIndex } from "../src/features/cabin-design/furniture/tables/tablePricing";
import { tableQuoteRows, furnitureSchedule } from "../src/features/cabin-design/furniture/tables/tableSchedule";
import { TABLE_SHAPES } from "../src/features/cabin-design/furniture/tables/tableTypes";
import type { CabinTable, TableShape } from "../src/features/cabin-design/furniture/tables/tableSchema";

const MATS = indexMaterials(SEED_MATERIALS);
const inr = (n: number) => "Rs." + Math.round(n).toLocaleString("en-IN");
const n2 = (n: number) => n.toFixed(2);

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass++;
    console.log(`   PASS  ${name}${detail ? " — " + detail : ""}`);
  } else {
    fail++;
    failures.push(name + (detail ? " — " + detail : ""));
    console.log(`   FAIL  ${name}${detail ? " — " + detail : ""}`);
  }
}

function head(t: string) {
  console.log("\n" + "=".repeat(88));
  console.log(t);
  console.log("=".repeat(88));
}

/** A cabin of L x W feet with a front door. */
function cabin(lengthFt: number, widthFt: number, tables: CabinTable[] = []): CabinConfig {
  const c = buildDefaultConfig();
  c.length = lengthFt;
  c.width = widthFt;
  c.roomCount = 1;
  c.roomLengths = normalizeRoomLengths(lengthFt, 1);
  c.partitionDoor = false;
  c.doorQty = 1;
  c.windowQty = 0;
  c.windowPlacements = [];
  c.doorPlacements = [{ side: "bottom", offset: 1 } as CabinConfig["doorPlacements"][number]];
  c.tables = tables;
  return c;
}

/** Price the whole cabin BOQ (structure + furniture) exactly as the admin panel does. */
function boqOf(cfg: CabinConfig) {
  const settings = defaultBoqSettings("ms_cabin");
  const tk = buildCabinTakeoff(cfg, DEFAULT_NORMS, {});
  const res = priceTakeoff(tk, MATS, settings);
  return { tk, res };
}

const furnitureLines = (r: ReturnType<typeof boqOf>["res"]) =>
  r.lines.filter((l) => l.section === "furniture");

/* ══════════════════════════════════════════════════════════════════════════
 * TEST 1 — Multiple different tables: exec + conference + 2 staff, save/reload
 * ══════════════════════════════════════════════════════════════════════════ */
head("TEST 1 — Multiple different tables · place · save · reload");
{
  const exec = createTable("executive", { xMm: 1200, yMm: 900 });
  const conf = createTable("conference", { xMm: 3600, yMm: 1500, existing: [exec] });
  const s1 = createTable("staff", { xMm: 900, yMm: 2600, existing: [exec, conf] });
  const s2 = createTable("staff", { xMm: 2400, yMm: 2600, existing: [exec, conf, s1] });
  const tables = [exec, conf, s1, s2];
  const cfg = cabin(24, 12, tables);

  check("4 tables created with unique ids", new Set(tables.map((t) => t.id)).size === 4);
  check("names auto-number per type", s2.name === "Staff Table 2", s2.name);

  // Save → reload, exactly as localStorage does.
  const reloaded: CabinConfig = JSON.parse(JSON.stringify(cfg));
  const rt = reloaded.tables ?? [];
  check("save/reload keeps 4 tables", rt.length === 4);
  check(
    "save/reload preserves every position",
    rt.every((t, i) => t.position.xMm === tables[i].position.xMm && t.position.yMm === tables[i].position.yMm),
  );
  check(
    "save/reload preserves type + shape + material",
    rt.every((t, i) => t.tableTypeId === tables[i].tableTypeId && t.shape === tables[i].shape && t.material.materialKey === tables[i].material.materialKey),
  );

  const { res } = boqOf(cfg);
  const fl = furnitureLines(res);
  check("BOQ produced furniture lines", fl.length > 0, `${fl.length} lines`);
  check("every furniture line carries its table id", fl.every((l) => /\[tbl-/.test(l.description)));
  check("no duplicate_calculation issue", !res.issues.some((i) => i.code === "duplicate_calculation"));
  check("no missing_unit_weight error", !res.issues.some((i) => i.code === "missing_unit_weight" && i.severity === "error"));
  check("no unknown_material error", !res.issues.some((i) => i.code === "unknown_material"));
  check("no negative quantity", !fl.some((l) => l.qty < 0));

  const { costs, total } = priceTables(tables, MATS);
  check("all 4 tables priced > 0", costs.every((c) => c.totalAmount > 0), costs.map((c) => inr(c.totalAmount)).join(" · "));

  const est = computeEstimate(cfg, { tableCosts: Object.fromEntries(costs.map((c) => [c.tableId, c.totalAmount])) });
  check("estimate.tables equals the sum of table costs", est.tables === costs.reduce((s, c) => s + c.totalAmount, 0), inr(est.tables));
  check("estimate.furniture INCLUDES tables (no double count)", est.furniture >= est.tables);
  check("tables ride inside perCabin exactly once",
    Math.abs(est.perCabin - (est.base + est.heightSurcharge + est.roofSurcharge + est.interior + est.insulation + est.openings + est.ventilation + est.electrical + est.furniture)) < 1);
  console.log(`   INFO  furniture BOQ total ${inr(total)} · cabin grand total ${inr(res.totals.grandTotal)}`);
}

/* ══════════════════════════════════════════════════════════════════════════
 * TEST 2 — L-shaped table: flip return, resize, rotate
 * ══════════════════════════════════════════════════════════════════════════ */
head("TEST 2 — L-shaped table · return left/right · resize · rotate");
{
  let t = createTable("l-shaped", { xMm: 1500, yMm: 1200 });
  check("L-shape has a return section", !!t.returnSection);

  const fpR = tableFootprint(t);
  check("L-shape footprint has 2 solid parts", fpR.polys.length === 2, `${fpR.polys.length} parts`);
  const areaRight = topAreaSqm(t);
  const bboxRight = footprintSize(t);

  // Flip the return to the LEFT — geometry must mirror, area must be identical.
  const left = clampTable({ ...t, returnSection: { ...t.returnSection!, side: "left" } }, t);
  const areaLeft = topAreaSqm(left);
  check("return left/right keeps the same board area", Math.abs(areaLeft - areaRight) < 1e-9, `${n2(areaRight)} m²`);

  const rMinX = Math.min(...tableFootprint(t).polys.flat().map((p) => p.x));
  const lMinX = Math.min(...tableFootprint(left).polys.flat().map((p) => p.x));
  const rArm = tableFootprint(t).polys[1];
  const lArm = tableFootprint(left).polys[1];
  const rArmCx = rArm.reduce((s, p) => s + p.x, 0) / rArm.length;
  const lArmCx = lArm.reduce((s, p) => s + p.x, 0) / lArm.length;
  check("the return arm actually moves to the other side", rArmCx > 0 && lArmCx < 0, `right arm cx ${Math.round(rArmCx)} · left arm cx ${Math.round(lArmCx)}`);
  void rMinX; void lMinX;

  // Lengthen the return — the area and the BOQ must both grow.
  const longer = clampTable({ ...t, returnSection: { ...t.returnSection!, lengthMm: t.returnSection!.lengthMm + 600 } }, t);
  check("longer return grows the board area", topAreaSqm(longer) > areaRight, `${n2(areaRight)} → ${n2(topAreaSqm(longer))} m²`);
  check("longer return grows the edge-band length", topPerimeterM(longer) > topPerimeterM(t));
  check("editing a dimension demotes the preset to Custom", longer.presetId === "custom", longer.presetId);

  // BOQ follows the drawing.
  const before = boqOf(cabin(20, 12, [t]));
  const after = boqOf(cabin(20, 12, [longer]));
  const boardBefore = furnitureLines(before.res).filter((l) => l.materialKey.startsWith("board-")).reduce((s, l) => s + l.qty, 0);
  const boardAfter = furnitureLines(after.res).filter((l) => l.materialKey.startsWith("board-")).reduce((s, l) => s + l.qty, 0);
  check("BOQ board area follows the drawn return", boardAfter > boardBefore, `${n2(boardBefore)} → ${n2(boardAfter)} m²`);

  // Rotate 90° — the bbox must transpose.
  const rot = clampTable({ ...t, position: { ...t.position, rotationDeg: 90 } }, t);
  const b0 = tableWorldBbox(t);
  const b90 = tableWorldBbox(rot);
  check("rotating 90° transposes the world bbox", Math.abs(b90.w - b0.d) < 1 && Math.abs(b90.d - b0.w) < 1,
    `${Math.round(b0.w)}×${Math.round(b0.d)} → ${Math.round(b90.w)}×${Math.round(b90.d)}`);
  check("rotation does not change the board area", Math.abs(topAreaSqm(rot) - areaRight) < 1e-9);
  void bboxRight;
  t = longer;
}

/* ══════════════════════════════════════════════════════════════════════════
 * TEST 3 — Round conference table with 8 chairs
 * ══════════════════════════════════════════════════════════════════════════ */
head("TEST 3 — Round table · 8 chairs · spacing · stays circular");
{
  let t = createTable("round", { xMm: 3000, yMm: 1800 });
  t = applyPreset(t, "d1200");
  t = clampTable({ ...t, seating: { ...t.seating, capacity: 8, includeChairs: true } }, t);

  check("shape is circle", t.shape === "circle");
  check("diameter is 1200 mm", t.dimensions.lengthMm === 1200 && t.dimensions.radiusMm === 600,
    `L=${t.dimensions.lengthMm} r=${t.dimensions.radiusMm}`);

  const fp = tableFootprint(t);
  const circlePrim = fp.prims.find((p) => p.kind === "circle" && p.role === "top");
  check("draws a REAL <circle> primitive (survives export as a circle)", !!circlePrim);

  check("8 chairs placed", fp.seats.length === 8, `${fp.seats.length} seats`);

  // Chair spacing: equal angular pitch, and no two chairs closer than a chair width.
  const gaps: number[] = [];
  for (let i = 0; i < fp.seats.length; i++) {
    const a = fp.seats[i];
    const b = fp.seats[(i + 1) % fp.seats.length];
    gaps.push(Math.hypot(b.x - a.x, b.y - a.y));
  }
  const minGap = Math.min(...gaps);
  const maxGap = Math.max(...gaps);
  check("chairs are evenly spaced", maxGap - minGap < 1, `gap ${Math.round(minGap)}–${Math.round(maxGap)} mm`);
  check("chairs do not overlap each other", minGap >= t.seating.chairWidthMm, `min gap ${Math.round(minGap)} mm ≥ chair ${t.seating.chairWidthMm} mm`);

  // Area of a 1200 dia circle = pi r^2 = 1.131 m2 — the BOQ must bill the circle, not 1.2x1.2.
  const area = topAreaSqm(t);
  const exact = Math.PI * 0.6 * 0.6;
  check("BOQ bills the CIRCLE area, not the bounding square", Math.abs(area - exact) / exact < 0.01,
    `${n2(area)} m² vs circle ${n2(exact)} m² (square would be 1.44)`);

  const cfg = cabin(20, 12, [t]);
  const issues = checkAllTables(buildContext(cfg));
  check("no collisions in a 20x12 cabin", issues.filter((i) => i.severity === "error").length === 0,
    issues.filter((i) => i.severity === "error").map((i) => i.code).join(",") || "none");

  const { costs } = priceTables([t], MATS);
  const chairLines = furnitureLines(boqOf(cfg).res).filter((l) => l.materialKey.startsWith("chair-"));
  check("8 chairs are in the BOQ", chairLines.reduce((s, l) => s + l.qty, 0) === 8, `${chairLines.reduce((s, l) => s + l.qty, 0)} chairs`);
  console.log(`   INFO  round table cost ${inr(costs[0].totalAmount)}`);
}

/* ══════════════════════════════════════════════════════════════════════════
 * TEST 4 — 8-user back-to-back workstation
 * ══════════════════════════════════════════════════════════════════════════ */
head("TEST 4 — 8-user back-to-back workstation · partitions · pedestals · power");
{
  let t = createTable("back-to-back-workstation", { xMm: 3000, yMm: 1800 });
  t = clampTable({
    ...t,
    workstation: { ...t.workstation!, users: 8, arrangement: "back-to-back", partitionMaterial: "fabric", partitionHeightMm: 400 },
    electrical: { ...t.electrical, socket5A: 8, socket16A: 8, powerManagerQty: 4, cableTray: true },
  }, t);

  const fp = tableFootprint(t);
  check("8 desks drawn separately", fp.polys.length === 8, `${fp.polys.length} desk tops`);
  check("8 seats drawn separately", fp.seats.length === 8, `${fp.seats.length} seats`);
  check("partition screens drawn", fp.prims.some((p) => p.role === "partition"));
  check("seating capacity follows the user count", t.seating.capacity === 8);

  const cfg = cabin(30, 14, [t]);
  const { res } = boqOf(cfg);
  const fl = furnitureLines(res);

  const partition = fl.filter((l) => l.materialKey.startsWith("partition-"));
  check("partition screens are in the BOQ (m²)", partition.length > 0 && partition[0].qty > 0, `${n2(partition[0]?.qty ?? 0)} m²`);

  const sockets = fl.filter((l) => l.materialKey.startsWith("elec-socket"));
  check("16 sockets in the BOQ", sockets.reduce((s, l) => s + l.qty, 0) === 16, `${sockets.reduce((s, l) => s + l.qty, 0)}`);

  const pm = fl.filter((l) => l.materialKey === "acc-power-manager");
  check("4 power managers in the BOQ", pm.reduce((s, l) => s + l.qty, 0) === 4);

  const conduit = fl.filter((l) => l.materialKey === "elec-conduit-25");
  check("conduit run is billed", conduit.length > 0 && conduit[0].qty > 0, `${n2(conduit[0]?.qty ?? 0)} m`);

  const labour = fl.filter((l) => l.materialKey.startsWith("lab-"));
  check("labour man-hours are billed", labour.length > 0 && labour.every((l) => l.qty > 0), `${labour.length} labour lines`);
  check("fractional labour hours survive (not rounded to 0)", labour.some((l) => !Number.isInteger(l.qty)),
    labour.map((l) => `${l.materialKey}=${l.qty}`).join(" "));

  const chairs = fl.filter((l) => l.materialKey.startsWith("chair-"));
  check("8 chairs in the BOQ", chairs.reduce((s, l) => s + l.qty, 0) === 8);

  const issues = checkAllTables(buildContext(cfg));
  check("no hard collisions in a 30x14 cabin", issues.filter((i) => i.severity === "error").length === 0,
    issues.filter((i) => i.severity === "error").map((i) => `${i.code}`).join(",") || "none");

  const { costs } = priceTables([t], MATS);
  console.log(`   INFO  8-user workstation cost ${inr(costs[0].totalAmount)} · weight ${n2(costs[0].weightKg)} kg`);
}

/* ══════════════════════════════════════════════════════════════════════════
 * TEST 5 — Door collision blocks submission
 * ══════════════════════════════════════════════════════════════════════════ */
head("TEST 5 — Table inside the door clearance · flagged · blocks submission");
{
  // Drop a table into the entrance door's clear zone. The door sits on the bottom (front) wall at
  // offset 1 ft, so it spans x ≈ 305–1219 mm and reserves ~3 ft (914 mm) of floor inside the cabin
  // in front of it. The table must land IN that zone while still fitting inside the cabin — chair
  // included — so the ONLY conflict under test is the door, not a wall.
  const t = createTable("executive", { xMm: 1200, yMm: 1900 });
  const cfg = cabin(16, 10, [t]);

  const ctx = buildContext(cfg);
  const issues = checkAllTables(ctx);
  check("the table itself is inside the cabin (so the door is the ONLY conflict)",
    !issues.some((i) => i.code === "outside_cabin"),
    issues.filter((i) => i.code === "outside_cabin").map((i) => i.message).join(" | ") || "inside");
  const doorIssues = issues.filter((i) => i.code === "overlap_door_swing" || i.code === "overlap_door");
  check("door conflict is detected", doorIssues.length > 0, doorIssues.map((i) => i.code).join(","));
  check("the conflict is an ERROR", doorIssues.some((i) => i.severity === "error"));
  check("the message names the table AND the door AND the overlap",
    doorIssues.some((i) => i.message.includes(t.name) && /door/i.test(i.message) && /\d+\s*mm/.test(i.message)),
    doorIssues[0]?.message ?? "");
  check("the conflicting objects are ref'd for red-highlighting", doorIssues.some((i) => i.refs.length > 0), doorIssues[0]?.refs.join(","));

  const v = validateTables({ config: cfg, tables: [t], materials: MATS });
  check("design CANNOT be submitted", v.canSubmit === false);

  const vOverride = validateTables({ config: cfg, tables: [t], materials: MATS, override: { allowCollisions: true, reason: "admin" } });
  check("admin override unblocks submission", vOverride.canSubmit === true);

  // And a table placed away from the door is clean. (An executive table carries side storage, so
  // its OCCUPANCY is wider than its top — park it well clear of the right wall.)
  const ok = createTable("executive", { xMm: 2200, yMm: 1100 });
  const vOk = validateTables({ config: cabin(16, 10, [ok]), tables: [ok], materials: MATS });
  check("a table clear of the door submits fine", vOk.canSubmit === true,
    vOk.errors.map((e) => e.code).join(",") || "no errors");
}

/* ══════════════════════════════════════════════════════════════════════════
 * TEST 6 — Big conference table in a small cabin
 * ══════════════════════════════════════════════════════════════════════════ */
head("TEST 6 — Large conference table in a SMALL cabin · does not fit · suggestions");
{
  const small = cabin(8, 6);
  const r = autoArrange({
    count: 1,
    tableTypeId: "conference",
    presetId: "3600x1500",
    minPassageMm: 900,
    pattern: "conference",
    config: small,
    existing: [],
  });

  check("auto-arrange reports it does NOT fit", r.fits === false);
  check("it states the required minimum cabin length", (r.requiredLengthMm ?? 0) > 0, `${r.requiredLengthMm} mm`);
  check("it states the required minimum cabin width", (r.requiredWidthMm ?? 0) > 0, `${r.requiredWidthMm} mm`);
  check("it states the available space", (r.availableLengthMm ?? 0) > 0 && (r.availableWidthMm ?? 0) > 0,
    `${r.availableLengthMm} × ${r.availableWidthMm} mm`);
  check("it suggests a smaller table OR a reduced quantity", !!r.suggestedPresetId || r.suggestedCount !== undefined,
    `preset=${r.suggestedPresetId ?? "-"} count=${r.suggestedCount ?? "-"}`);
  console.log(`   INFO  ${r.message}`);

  // And the same table DOES fit in a big cabin.
  const big = cabin(30, 16);
  const r2 = autoArrange({
    count: 1, tableTypeId: "conference", presetId: "3600x1500",
    minPassageMm: 900, pattern: "conference", config: big, existing: [],
  });
  check("the same table fits in a 30x16 cabin", r2.fits === true, r2.message);
  check("the arranged table is inside the cabin", r2.tables.every((t) => {
    const b = tableWorldBbox(t);
    return b.minX >= -1 && b.minY >= -1 && b.maxX <= 30 * 304.8 + 1 && b.maxY <= 16 * 304.8 + 1;
  }));
}

/* ══════════════════════════════════════════════════════════════════════════
 * TEST 7 — Material change: prelam → granite, wooden panels → MS pipe
 * ══════════════════════════════════════════════════════════════════════════ */
head("TEST 7 — Change top prelam→granite and base panel→MS frame · weight/rate/labour update");
{
  const base = createTable("executive", { xMm: 1500, yMm: 1200 });
  const b1 = priceTables([base], MATS).costs[0];
  const w1 = b1.weightKg;

  // Granite top + MS frame.
  let g = changeMaterial(base, "top-granite-18");
  g = clampTable({ ...g, support: { ...g.support, supportTypeId: "ms-frame", profileKey: "shs-50x50x2", numberOfLegs: 4 } }, g);
  const b2 = priceTables([g], MATS).costs[0];

  check("granite top changes the material amount", b2.materialAmount !== b1.materialAmount,
    `${inr(b1.materialAmount)} → ${inr(b2.materialAmount)}`);
  check("granite is HEAVIER than prelam (48.6 vs 11.7 kg/m²)", b2.weightKg > w1, `${n2(w1)} → ${n2(b2.weightKg)} kg`);
  check("top thickness follows the material", g.dimensions.topThicknessMm === 18 && g.material.thicknessMm === 18,
    `${g.dimensions.topThicknessMm} mm`);

  const cfgP = cabin(20, 12, [base]);
  const cfgG = cabin(20, 12, [g]);
  const flP = furnitureLines(boqOf(cfgP).res);
  const flG = furnitureLines(boqOf(cfgG).res);

  check("the BOQ now lists granite, not prelam",
    flG.some((l) => l.materialKey === "top-granite-18") && !flG.some((l) => l.materialKey === "board-prelam-25"));
  check("MS frame adds steel legs to the BOQ",
    flG.filter((l) => l.materialKey === "shs-50x50x2").length > 0);

  const weldP = flP.filter((l) => l.materialKey === "lab-welding").reduce((s, l) => s + l.qty, 0);
  const weldG = flG.filter((l) => l.materialKey === "lab-welding").reduce((s, l) => s + l.qty, 0);
  check("welding labour appears once the base is steel", weldG > weldP, `${n2(weldP)} → ${n2(weldG)} man-hours`);

  const steelKgP = flP.filter((l) => l.category === "steel_section").reduce((s, l) => s + l.totalWeightKg, 0);
  const steelKgG = flG.filter((l) => l.category === "steel_section").reduce((s, l) => s + l.totalWeightKg, 0);
  check("steel weight is computed from the Material Master kg/m", steelKgG > steelKgP, `${n2(steelKgP)} → ${n2(steelKgG)} kg`);

  const units = new Set(flG.map((l) => l.rateUnit));
  check("multiple rate units are honoured (per_sqm / per_kg / per_nos / per_m)", units.size >= 3, [...units].join(","));

  console.log(`   INFO  prelam+panel ${inr(b1.totalAmount)} → granite+MS ${inr(b2.totalAmount)}`);
}

/* ══════════════════════════════════════════════════════════════════════════
 * TEST 8 (partial) — every SHAPE renders, is taken off, and quotes
 * ══════════════════════════════════════════════════════════════════════════ */
head("TEST 8 — All 13 shapes: geometry, BOQ area, quotation row, schedule");
{
  const shapes = TABLE_SHAPES.map((s) => s.id) as TableShape[];
  const tables: CabinTable[] = shapes.map((s, i) => {
    let t = createTable("custom-shaped", { xMm: 1200 + i * 60, yMm: 1200 });
    t = changeShape(t, s);
    return t;
  });

  let allOk = true;
  for (const t of tables) {
    const fp = tableFootprint(t);
    const area = topAreaSqm(t);
    const perim = topPerimeterM(t);
    const ok = fp.polys.length > 0 && fp.polys.every((p) => p.length >= 3) && area > 0 && perim > 0;
    if (!ok) {
      allOk = false;
      console.log(`      !! ${t.shape}: polys=${fp.polys.length} area=${area} perim=${perim}`);
    }
  }
  check("all 13 shapes produce a valid polygon, area and perimeter", allOk);

  check("circle draws a <circle>", tableFootprint(tables[shapes.indexOf("circle")]).prims.some((p) => p.kind === "circle"));
  check("oval draws an <ellipse>", tableFootprint(tables[shapes.indexOf("oval")]).prims.some((p) => p.kind === "ellipse"));
  check("u-shape has 3 parts", tableFootprint(tables[shapes.indexOf("u-shape")]).polys.length === 3);
  check("t-shape has 2 parts", tableFootprint(tables[shapes.indexOf("t-shape")]).polys.length === 2);
  check("corner is a 6-vertex wedge", tableFootprint(tables[shapes.indexOf("corner")]).polys[0].length === 6);
  check("trapezoid is a 4-vertex quad", tableFootprint(tables[shapes.indexOf("trapezoid")]).polys[0].length === 4);

  // Every shape must produce BOQ + quotation rows.
  const cfg = cabin(60, 20, tables);
  const { res } = boqOf(cfg);
  const fl = furnitureLines(res);
  const idsInBoq = new Set(fl.map((l) => (l.description.match(/\[(tbl-[^\]]+)\]/) ?? [])[1]).filter(Boolean));
  check("every shape appears in the BOQ", idsInBoq.size === tables.length, `${idsInBoq.size}/${tables.length}`);

  const { costs } = priceTables(tables, MATS);
  check("every shape prices > 0", costs.every((c) => c.totalAmount > 0));

  const rows = tableQuoteRows(tables, costs);
  check("every shape yields a quotation row", rows.length === tables.length);
  check("quotation rows carry a description, size, qty, rate and amount",
    rows.every((r) => r.description.length > 5 && r.size.length > 2 && r.qty > 0 && r.amount > 0));
  check("quotation total equals the priced total to the rupee",
    rows.reduce((s, r) => s + r.amount, 0) === costs.reduce((s, c) => s + c.totalAmount, 0));

  const sched = furnitureSchedule(tables);
  check("furniture schedule has one row per table with a T-xx ref", sched.length === tables.length && sched[0].ref === "T-01");
  check("schedule refs are unique", new Set(sched.map((s) => s.ref)).size === tables.length);

  const round = rows[shapes.indexOf("circle")];
  check("a round table quotes a DIAMETER", /Dia/i.test(round.size), round.size);
}

/* ══════════════════════════════════════════════════════════════════════════
 * EXTRA — duplicate offsets, lock, hide, undo-safety of clamp
 * ══════════════════════════════════════════════════════════════════════════ */
head("EXTRA — duplicate · lock · hide · quantity");
{
  const a = createTable("staff", { xMm: 1200, yMm: 1200 });
  const b = duplicateTable(a, [a]);
  check("duplicate gets a NEW id", b.id !== a.id);
  check("duplicate is offset, not on top of the original",
    b.position.xMm !== a.position.xMm || b.position.yMm !== a.position.yMm,
    `(${a.position.xMm},${a.position.yMm}) → (${b.position.xMm},${b.position.yMm})`);
  check("duplicate's accessories get new ids",
    b.accessories.every((x, i) => !a.accessories[i] || x.id !== a.accessories[i].id));

  const qty3 = clampTable({ ...a, quantity: 3 }, a);
  const c1 = priceTables([a], MATS).costs[0];
  const c3 = priceTables([qty3], MATS).costs[0];
  check("quantity 3 costs exactly 3× the unit", c3.totalAmount === c1.unitAmount * 3,
    `${inr(c1.unitAmount)} × 3 = ${inr(c3.totalAmount)}`);

  const hidden = clampTable({ ...a, position: { ...a.position, hidden: true } }, a);
  check("a hidden table is still priced (hidden ≠ deleted)", priceTables([hidden], MATS).costs[0].totalAmount > 0);
}

/* ══════════════════════════════════════════════════════════════════════════ */
head("RESULT");
console.log(`   ${pass} passed · ${fail} failed`);
if (fail) {
  console.log("\nFAILURES:");
  failures.forEach((f) => console.log("   - " + f));
  process.exitCode = 1;
}
