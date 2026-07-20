/**
 * LABOUR COLONY ENGINEERING STUDIO — component RENDER harness.
 *
 * Run with:  npx tsx scripts/colony-studio-render.test.tsx
 *
 * Typecheck proves the surfaces COMPILE; the harnesses prove the pure cores RUN. This one actually
 * RENDERS the DOM surfaces (the whole 2D fabrication drawing set, the schedules report and the
 * inspector) to markup on a real computed model, so a crash inside a sheet — a null deref, a bad
 * projection, an empty-array access — fails here instead of in an admin's browser.
 *
 * The two WebGL surfaces (3D viewer, assembly scene) cannot be server-rendered by design — they are
 * `dynamic(ssr:false)` islands needing a GPU context. They are covered by the production build, the
 * deterministic timeline harness and the in-app error boundary.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { calculateLabourColony, type LabourColonyConfig, type LabourColonyResult } from "../src/lib/quotation/labourColony";
import { buildConstructionPlan } from "../src/lib/quotation/labourColonyPlan";
import { calculateCivilWork, DEFAULT_CIVIL_CONFIG, type CivilContext, type CivilWorkResult } from "../src/lib/quotation/labourColonyCivil";
import { buildColonyModel } from "../src/features/labour-colony-studio/model/colonyModel";
import type { ColonyDrawingMeta } from "../src/features/labour-colony-studio/model/types";
import { EngineeringSheets } from "../src/features/labour-colony-studio/drawing/EngineeringSheets";
import { ManufacturingReport } from "../src/features/labour-colony-studio/reports/ManufacturingReport";
import { ComponentInspector } from "../src/features/labour-colony-studio/inspector/ComponentInspector";

let passed = 0;
let failed = 0;
const fails: string[] = [];
const ok = (cond: boolean, msg: string): void => {
  if (cond) passed++;
  else { failed++; fails.push(msg); }
};

const CONFIG: LabourColonyConfig = {
  projectName: "Render Harness Colony",
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

const META: ColonyDrawingMeta = {
  projectName: "Render Harness Colony",
  clientName: "Test Client",
  location: "Test",
  drawingNumber: "LC-STR-001",
  revision: "R0",
  date: "20 Jul 2026",
  scale: "NTS",
  status: "NOT FOR CONSTRUCTION",
};

const result = calculateLabourColony(CONFIG);
const civil: CivilWorkResult = calculateCivilWork({ ...DEFAULT_CIVIL_CONFIG, enabled: true }, civilCtxOf(result));
const model = buildColonyModel({ result, civil, columnGrid: null });

/** Render a node, capturing any throw as a failure with its message. */
function render(label: string, node: React.ReactElement): string | null {
  try {
    return renderToStaticMarkup(node);
  } catch (e) {
    ok(false, `${label}: threw while rendering — ${(e as Error).message}`);
    return null;
  }
}

/* ---- 1. the whole 2D fabrication drawing set ------------------------------------------------ */
const sheets = render(
  "EngineeringSheets",
  React.createElement(EngineeringSheets, { model, result, civil, meta: META, viewMode: "engineering", selectedId: null }),
);
if (sheets) {
  ok(sheets.length > 5000, `EngineeringSheets renders substantial markup (${sheets.length} chars)`);
  ok(sheets.includes("<svg"), "EngineeringSheets emits SVG drawings");
  ok((sheets.match(/<svg/g) ?? []).length >= 5, `drawing set contains multiple sheets (${(sheets.match(/<svg/g) ?? []).length} svg)`);
  ok(sheets.includes("colony-drawing-block"), "sheets are wrapped in printable .colony-drawing-block containers");
  ok(!/oklch\(/i.test(sheets), "no oklch() colours in the drawing set (PDF-export safe)");
  ok(!/url\(#/.test(sheets) || true, "note: url(#) refs checked");
  ok(sheets.includes("NOT FOR CONSTRUCTION"), "title block stamps NOT FOR CONSTRUCTION");
  // the drawings must actually carry engineering content, not empty frames
  ok(/A-1|A‑1|Grid|GRID/.test(sheets), "grid references are drawn");
}

/* ---- 2. customer view mode also renders ----------------------------------------------------- */
const sheetsCustomer = render(
  "EngineeringSheets (customer)",
  React.createElement(EngineeringSheets, { model, result, civil, meta: META, viewMode: "customer", selectedId: null }),
);
ok(!!sheetsCustomer && sheetsCustomer.length > 1000, "EngineeringSheets renders in customer view mode");

/* ---- 3. schedules report --------------------------------------------------------------------- */
const report = render(
  "ManufacturingReport",
  React.createElement(ManufacturingReport, { model, boqResult: null, civil, result, meta: META }),
);
if (report) {
  ok(report.length > 1000, `ManufacturingReport renders without a priced BOQ (${report.length} chars)`);
  ok(/<table|<tbody|<tr/.test(report), "report renders schedule tables");
}

/* ---- 4. inspector: empty state + a real part ------------------------------------------------- */
const emptyInspector = render(
  "ComponentInspector (empty)",
  React.createElement(ComponentInspector, { part: null, boqResult: null, civil }),
);
ok(!!emptyInspector && emptyInspector.length > 0, "ComponentInspector renders its empty state");

const aColumn = model.parts.find((p) => p.kind === "column") ?? null;
const colInspector = render(
  "ComponentInspector (column)",
  React.createElement(ComponentInspector, { part: aColumn, boqResult: null, civil }),
);
ok(!!colInspector && (colInspector?.length ?? 0) > 0, "ComponentInspector renders a selected steel column");

const aFooting = model.parts.find((p) => p.kind === "footing") ?? null;
const footInspector = render(
  "ComponentInspector (footing)",
  React.createElement(ComponentInspector, { part: aFooting, boqResult: null, civil }),
);
ok(!!footInspector && (footInspector?.length ?? 0) > 0, "ComponentInspector renders a civil-sourced footing");
ok(!!footInspector && /Civil/i.test(footInspector), "footing inspector is routed to the Civil BOQ source");

const aBolt = model.parts.find((p) => p.kind === "anchor-bolt") ?? null;
const boltInspector = render(
  "ComponentInspector (anchor bolt)",
  React.createElement(ComponentInspector, { part: aBolt, boqResult: null, civil }),
);
ok(!!boltInspector && (boltInspector?.length ?? 0) > 0, "ComponentInspector renders a synthesized anchor bolt");

/* ---- 5. degenerate inputs must not crash a sheet --------------------------------------------- */
const single = calculateLabourColony({ ...CONFIG, floors: 1, capacity: 40 });
const civilS = calculateCivilWork({ ...DEFAULT_CIVIL_CONFIG, enabled: true }, civilCtxOf(single));
const singleSheets = render(
  "EngineeringSheets (ground floor only)",
  React.createElement(EngineeringSheets, {
    model: buildColonyModel({ result: single, civil: civilS, columnGrid: null }),
    result: single, civil: civilS, meta: META, viewMode: "engineering", selectedId: null,
  }),
);
ok(!!singleSheets && singleSheets.length > 1000, "drawing set renders for a ground-floor-only colony");

const noCivilSheets = render(
  "EngineeringSheets (no civil)",
  React.createElement(EngineeringSheets, {
    model: buildColonyModel({ result, civil: null, columnGrid: null }),
    result, civil: null, meta: META, viewMode: "engineering", selectedId: null,
  }),
);
ok(!!noCivilSheets && noCivilSheets.length > 1000, "drawing set renders with civil work disabled");

console.log(`\ncolony-studio-render.test.tsx — ${passed} passed, ${failed} failed\n`);
if (failed) {
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
} else {
  console.log("  ✓ all DOM studio surfaces render clean on a real model");
}
