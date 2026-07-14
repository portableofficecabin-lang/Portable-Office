/**
 * EXPORT SAFETY — acceptance Test 8 (spec §33).
 *
 * "Ensure CSS variables and SVG styles are resolved into actual colours before generating the PDF
 *  or image. Do not allow exported furniture to become black, invisible, or incorrectly styled."
 *
 * html2canvas-pro (the rasteriser behind the drawing/PDF export) cannot parse `oklch()`, and a
 * `var(--token)` that resolves to an oklch colour rasterises to BLACK — which is exactly how
 * furniture "disappears" from an exported drawing. The only thing safe to emit is a literal colour.
 * This renders the real 2D and elevation layers to static SVG and asserts that every paint they
 * produce is literal.
 *
 *   npx tsx scripts/table-export-safety.tsx
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TableElevationLayer } from "../src/features/cabin-design/furniture/tables/TableElevation";
import { TableLayer } from "../src/features/cabin-design/furniture/tables/TableRenderer2D";
import { applyPreset, changeShape, clampTable, createTable } from "../src/features/cabin-design/furniture/tables/tableDefaults";
import type { CabinTable, TableShape } from "../src/features/cabin-design/furniture/tables/tableSchema";
import { TABLE_SHAPES } from "../src/features/cabin-design/furniture/tables/tableTypes";

let pass = 0;
let fail = 0;
const check = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`   PASS  ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; console.log(`   FAIL  ${name}${detail ? " — " + detail : ""}`); }
};

/* A design carrying every shape, a workstation pod, a seated round table and a reception counter. */
const tables: CabinTable[] = [];
TABLE_SHAPES.forEach((s, i) => {
  const t = createTable("custom-shaped", { xMm: 900 + i * 500, yMm: 1300, existing: tables });
  tables.push(changeShape(t, s.id as TableShape));
});

const wsBase = createTable("back-to-back-workstation", { xMm: 3200, yMm: 3400, existing: tables });
tables.push(clampTable({ ...wsBase, workstation: { ...wsBase.workstation!, users: 8 } }, wsBase));

const roundBase = applyPreset(createTable("round", { xMm: 7000, yMm: 3400, existing: tables }), "d1200");
tables.push(clampTable({ ...roundBase, seating: { ...roundBase.seating, capacity: 8, includeChairs: true } }, roundBase));

tables.push(createTable("reception", { xMm: 9200, yMm: 1400, existing: tables }));

const hiddenBase = createTable("staff", { xMm: 10500, yMm: 3400, existing: tables });
const hidden = clampTable({ ...hiddenBase, position: { ...hiddenBase.position, hidden: true } }, hiddenBase);
tables.push(hidden);

const LITERAL = (v: string) =>
  v === "none" || v === "currentColor" || /^#[0-9a-f]{3,8}$/i.test(v) || /^rgba?\(/i.test(v) || /^url\(#/.test(v);

const paints = (svg: string) => [
  ...[...svg.matchAll(/fill="([^"]+)"/g)].map((m) => m[1]),
  ...[...svg.matchAll(/stroke="([^"]+)"/g)].map((m) => m[1]),
];

console.log("\n=============== 2D PLAN LAYER ===============");
const plan = renderToStaticMarkup(
  React.createElement(
    "svg",
    { viewBox: "0 0 1400 700" },
    React.createElement(TableLayer, {
      tables,
      ox: 92, oy: 74, ppf: 22,
      selectedId: tables[0].id,
      conflictIds: new Set([tables[1].id]),
      showLabels: true,
      showDimensions: true,
      editable: true,
    }),
  ),
);

check("the 2D layer renders", plan.length > 1000, `${plan.length} chars`);
check("a round table exports as a REAL <circle>", /<circle/.test(plan));
check("an oval exports as a REAL <ellipse>", /<ellipse/.test(plan));
check("polygon tops export as <path>", /<path/.test(plan));
check("table labels are present", /<text/.test(plan));
check("the reception's VISITOR and STAFF sides are labelled", /VISITOR/i.test(plan) && /STAFF/i.test(plan));
check("a hidden table is NOT exported", !plan.includes(hidden.id));

const planPaints = paints(plan);
check("NO oklch() in the exported SVG", !/oklch\(/i.test(plan));
check("NO var(--…) in the exported SVG", !/var\(--/.test(plan));
check("NO hsl(var(…)) tokens", !/hsl\(var\(/.test(plan));
check("EVERY fill/stroke is a literal colour", planPaints.every(LITERAL),
  [...new Set(planPaints.filter((p) => !LITERAL(p)))].join(" ") || `${planPaints.length} paints, all literal`);
check("furniture is not painted pure black (the classic broken-export symptom)",
  !planPaints.includes("#000") && !planPaints.includes("#000000"));

console.log("\n=============== ELEVATION LAYERS ===============");
let elev = "";
for (const wall of ["front", "rear", "left", "right"] as const) {
  elev += renderToStaticMarkup(
    React.createElement(
      "svg",
      { viewBox: "0 0 900 320" },
      React.createElement(TableElevationLayer, {
        tables,
        wall,
        cabinLengthFt: 36,
        cabinWidthFt: 16,
        cabinHeightFt: 8.5,
        ox: 40,
        ppf: 14,
        floorY: 250,
      }),
    ),
  );
}

const elevPaints = paints(elev);
check("all four elevations render", elev.length > 500, `${elev.length} chars`);
check("elevations emit no oklch()", !/oklch\(/i.test(elev));
check("elevations emit no var(--…)", !/var\(--/.test(elev));
check("EVERY elevation fill/stroke is a literal colour", elevPaints.every(LITERAL),
  [...new Set(elevPaints.filter((p) => !LITERAL(p)))].join(" ") || `${elevPaints.length} paints, all literal`);
check("a hidden table is not in the elevations", !elev.includes(hidden.id));

console.log("\n=============== RESULT ===============");
console.log(`   ${pass} passed · ${fail} failed`);
if (fail) process.exitCode = 1;
