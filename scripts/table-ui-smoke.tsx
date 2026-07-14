/**
 * Render smoke test for the customer-facing table UI (spec §28, §17–§20).
 * Renders the real components against a real CabinConfig — catches bad imports, first-paint
 * crashes and prop mismatches that tsc cannot see.
 *   npx tsx scripts/_table-ui-smoke.tsx
 */

import React from "react";
import { renderToString } from "react-dom/server";

import { buildDefaultConfig, type CabinConfig } from "../src/components/home/cabin-calculator/pricing";
import { TablesSection } from "../src/features/cabin-design/furniture/tables/TablesSection";
import { TableEditor } from "../src/features/cabin-design/furniture/tables/TableEditor";
import { buildContext, checkAllTables, findFreeSpot } from "../src/features/cabin-design/furniture/tables/tableCollision";
import { clampTable, createTable } from "../src/features/cabin-design/furniture/tables/tableDefaults";
import { defaultMaterialIndex, priceTables } from "../src/features/cabin-design/furniture/tables/tablePricing";
import { DEFAULT_CLEARANCES, type CabinTable } from "../src/features/cabin-design/furniture/tables/tableSchema";
import { cabinSizeMm } from "../src/features/cabin-design/furniture/tables/cabinObstacles";

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

const config: CabinConfig = buildDefaultConfig();
config.length = 24;
config.width = 10;
config.height = 9;

/* Add one of every type that has a type-specific panel, plus a plain desk. */
const add = (tables: CabinTable[], typeId: string): CabinTable[] => {
  const { lengthMm: L, widthMm: W } = cabinSizeMm(config);
  const seeded = createTable(typeId, { existing: tables, xMm: L / 2, yMm: W / 2 });
  const ctx = buildContext({ ...config, tables }, DEFAULT_CLEARANCES);
  const spot = findFreeSpot(seeded, ctx);
  return [...tables, clampTable({ ...seeded, position: { ...seeded.position, xMm: spot.xMm, yMm: spot.yMm } })];
};

let tables: CabinTable[] = [];
for (const id of ["executive", "workstation", "conference", "reception", "wall-mounted", "round", "l-shaped"]) {
  tables = add(tables, id);
}
ok("seven tables created", tables.length === 7, `got ${tables.length}`);

const materials = defaultMaterialIndex();
const { costs } = priceTables(tables, materials);
const issues = checkAllTables(buildContext({ ...config, tables }, DEFAULT_CLEARANCES));

console.log(`\n  (${issues.length} live issues, total ₹${costs.reduce((s, c) => s + c.totalAmount, 0)})\n`);

const history = {
  canUndo: true, canRedo: false,
  undo: () => {}, redo: () => {},
  undoLabel: "Add Executive Table", redoLabel: null,
};

const noop = () => {};

/* ---- 1. the whole section, with a table selected (desktop side panel) ---- */
let html = "";
try {
  html = renderToString(
    React.createElement(TablesSection, {
      config, tables,
      onChange: noop, onSeal: noop,
      history,
      selectedId: tables[0].id,
      onSelect: noop,
      clearances: DEFAULT_CLEARANCES,
      issues, costs,
      unit: "mm" as const,
      onUnitChange: noop,
      materials,
    }),
  );
  ok("TablesSection renders", html.length > 1000, `${html.length} chars`);
} catch (e) {
  ok("TablesSection renders", false, String(e));
}

ok("toolbar has Add table", html.includes("Add table"));
ok("toolbar has Auto arrange", html.includes("Auto arrange"));
ok("summary shows seats", html.includes("Seats"));
ok("summary shows furniture total", html.includes("Furniture total"));
ok("list shows T-01 ref", html.includes("T-01"));
ok("list shows T-07 ref (no cap on count)", html.includes("T-07"));
ok("editor rendered for selection", html.includes("Storage &amp; accessories") || html.includes("Storage & accessories"));
ok("editor shows Dimensions", html.includes("Dimensions"));
ok("editor shows Position", html.includes("Position"));

/* ---- 2. each type-specific panel actually appears for its type ---- */
const editorHtml = (t: CabinTable): string =>
  renderToString(
    React.createElement(TableEditor, {
      table: t, tables, config, materials,
      unit: "ftin" as const,           // exercise the two-box ft-in path too
      issues: [], cost: costs.find((c) => c.tableId === t.id),
      onChange: noop, onSeal: noop,
    }),
  );

const byType = (id: string) => tables.find((t) => t.tableTypeId === id)!;

try {
  const ws = editorHtml(byType("workstation"));
  ok("workstation panel shown", ws.includes("Workstation") && ws.includes("Partition screen"));
  ok("workstation has aisle width", ws.includes("Aisle width"));

  const cf = editorHtml(byType("conference"));
  ok("conference panel shown", cf.includes("Conference") && cf.includes("Head chairs"));

  const rc = editorHtml(byType("reception"));
  ok("reception panel shown", rc.includes("Reception") && rc.includes("Visitor side"));

  const wm = editorHtml(byType("wall-mounted"));
  ok("wallMount panel shown", wm.includes("Wall mounting") && wm.includes("Fold direction"));

  const ex = editorHtml(byType("executive"));
  ok("executive has NO workstation panel", !ex.includes("Partition screen"));
  ok("executive has NO conference panel", !ex.includes("Head chairs"));

  const rd = editorHtml(byType("round"));
  ok("round table shows Diameter, not Depth", rd.includes("Diameter"));

  const ls = editorHtml(byType("l-shaped"));
  ok("L-shape shows the Return block", ls.includes("Return length"));
  ok("rectangle types show no Return block", !ex.includes("Return length"));

  ok("ft-in renders two boxes (ft + in suffixes)", ws.includes(">ft<") && ws.includes(">in<"));
} catch (e) {
  ok("type-specific panels render", false, String(e));
}

/* ---- 3. electrical accessories are bound to `electrical`, not `accessories` ---- */
const conf = byType("conference");
ok(
  "power-manager NOT stored in t.accessories",
  !conf.accessories.some((a) => a.accessoryId === "power-manager"),
);
ok("power-manager qty lives in t.electrical", conf.electrical.powerManagerQty >= 1);

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
