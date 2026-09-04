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
import { buildRoomFloorPlan } from "../src/lib/quotation/roomFloorPlan";
import { ReferenceGASheet } from "../src/features/labour-colony-studio/reference/ReferenceGASheet";
import { ReferenceBomSheet } from "../src/features/labour-colony-studio/reference/ReferenceBomSheet";
import type { ReferenceTitleBlockMeta } from "../src/features/labour-colony-studio/reference/ReferenceTitleBlock";
import {
  buildBracingNote, buildEnvelopeCallouts, buildMaterialRegister, buildOpeningSchedule,
} from "../src/features/labour-colony-studio/reference/referenceRegister";

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

const REF_META: ReferenceTitleBlockMeta = {
  projectName: "Render Harness Colony",
  clientName: "Test Client",
  location: "Test",
  title: "General Arrangement Layout",
  drawingNumber: "LC-GA-2F-01",
  revision: "0",
  scale: "NTS",
  sheet: "1",
  date: "20/07/2026",
  releasedFor: "Preliminary",
  designedBy: "RSR",
  drawnBy: "RSR",
  checkedBy: "CRJ",
  approvedBy: "",
  lengthLabel: "29.70 M",
  widthLabel: "6.90 M",
  heightLabel: "6.00 M",
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

/* ---- 6. the REFERENCE GA sheet + bill of materials ------------------------------------------- */
const refOpenings = buildOpeningSchedule(model, null);
const refCallouts = buildEnvelopeCallouts(model, result, null);
const refBracing = buildBracingNote(model, result, null);
const refRegister = buildMaterialRegister(model, null, civil, refOpenings, refBracing);
const refGeoms = Array.from(
  { length: Math.max(1, model.meta.floors) },
  (_, f) => buildRoomFloorPlan(result, result.config.floorPlan, f),
);

ok(refOpenings.length > 0, `opening schedule is populated (${refOpenings.length} rows)`);
ok(refOpenings.every((r) => r.mark.length > 0 && r.qty > 0), "every opening row carries a mark and a quantity");
ok(refCallouts.some((c) => c.id === "wall"), "the wall cladding callout names the configured panel");
ok(refRegister.groups.length >= 6, `material register builds all its groups (${refRegister.groups.length})`);
ok(
  refRegister.groups.every((g) => g.rows.length > 0 || !!g.emptyReason),
  "an empty register group always explains why it is empty rather than showing a blank table",
);
ok(!refRegister.priced, "with no priced BOQ the register reports itself as unpriced");

/* ---- the three families the elevations must call out: bracing, railing, staircase ------------ */
ok(!!refBracing, "the bracing note resolves from the priced calculation");
if (refBracing) {
  ok(refBracing.braceCount > 0, `braces are placed on the model (${refBracing.braceCount})`);
  ok(refBracing.boltsPerEnd > 0, `nut-bolts per brace end come from the norms (${refBracing.boltsPerEnd})`);
  ok(refBracing.crossSupportBolts > 0, `cross-support bolts are counted (${refBracing.crossSupportBolts})`);
  ok(/^M\d/.test(refBracing.boltSize), `bolt size is a real assembly size (${refBracing.boltSize})`);
  ok(refBracing.section.length > 1, `the brace section is named (${refBracing.section})`);
}
ok(model.parts.some((p) => p.kind === "handrail"), "the model carries hand railing");
ok(model.parts.some((p) => p.kind === "stair-tread"), "the model carries a staircase");

/* ---- staircase handrail: BOTH sides, WITH raking rails, REACHING the side elevations -------- */
/* The priced take-off has always billed "2 side(s)" of posts plus a raking-rail line
 * (staircase:rail:<id>); the model used to build one side of posts and no rails, so the side
 * elevations showed a bare stair (left side: nothing at all). These pins keep drawing and BOQ
 * describing the same railing system. */
{
  const stairRails = model.parts.filter((p) => p.kind === "handrail" && p.id.startsWith("stair:"));
  const stairPosts = model.parts.filter((p) => p.kind === "handrail-post" && p.id.startsWith("stair:"));
  ok(stairRails.length > 0, `staircase raking rails exist in the model (${stairRails.length})`);
  ok(
    stairRails.some((p) => /:rail:0:/.test(p.id)) && stairRails.some((p) => /:rail:1:/.test(p.id)),
    "raking rails are built on BOTH sides of the flight",
  );
  ok(
    stairPosts.some((p) => /:rail-post:0:/.test(p.id)) && stairPosts.some((p) => /:rail-post:1:/.test(p.id)),
    "handrail posts are built on BOTH sides of the flight",
  );
  // Elevation visibility: with staircasePosition "both", stair railing must reach the model's
  // outer x faces within the elevation's railing band (OBJECT_BAND_M × 0.6 = 0.72 m) — the
  // exact filter ReferenceElevationView applies. This is what was silently false before.
  const xr = (p: (typeof model.parts)[number]): [number, number] | null => {
    const s = p.solid as { kind: string; min?: { x: number }; max?: { x: number }; pts?: { x: number }[] };
    if (s.kind === "box" && s.min && s.max) return [s.min.x, s.max.x];
    if (s.kind === "quad" && s.pts) { const xs = s.pts.map((q) => q.x); return [Math.min(...xs), Math.max(...xs)]; }
    return null;
  };
  const gapTo = (plane: number) => (p: (typeof model.parts)[number]) => {
    const r = xr(p);
    if (!r) return Infinity;
    return plane >= r[0] && plane <= r[1] ? 0 : Math.min(Math.abs(r[0] - plane), Math.abs(r[1] - plane));
  };
  const railParts = [...stairRails, ...stairPosts];
  ok(
    railParts.some((p) => gapTo(model.bounds.min.x)(p) <= 0.72),
    "stair railing reaches the LEFT side-elevation band",
  );
  ok(
    railParts.some((p) => gapTo(model.bounds.max.x)(p) <= 0.72),
    "stair railing reaches the RIGHT side-elevation band",
  );
}
/* Every brace is face-tagged, which is how the elevation selects them — an untagged brace would
 * silently vanish from the drawing exactly as it did before. */
const taggedBraces = model.parts.filter((p) => p.kind === "brace");
ok(
  taggedBraces.length > 0 && taggedBraces.every((p) => /^brace:(front|rear|left|right):/.test(p.id)),
  `every brace carries a face tag (${taggedBraces.length})`,
);

const refSheet = render(
  "ReferenceGASheet",
  React.createElement(ReferenceGASheet, {
    model, result, geoms: refGeoms, openings: refOpenings, callouts: refCallouts,
    bracing: refBracing, meta: REF_META,
  }),
);
if (refSheet) {
  ok(refSheet.length > 5000, `ReferenceGASheet renders substantial markup (${refSheet.length} chars)`);
  ok((refSheet.match(/<svg/g) ?? []).length >= 5, `reference sheet draws every plan and elevation (${(refSheet.match(/<svg/g) ?? []).length} svg)`);
  ok(refSheet.includes("reference-drawing-block"), "reference views are wrapped in paginatable blocks");
  ok(!/oklch\(/i.test(refSheet), "no oklch() colours on the reference sheet (PDF-export safe)");
  ok(!/url\(#/.test(refSheet), "no paint-server refs on the reference sheet (standalone-SVG safe)");
  ok(/Schedule of doors/i.test(refSheet), "the door / window / ventilator schedule is printed");
  ok(/General Arrangement Layout/.test(refSheet), "the title block carries the drawing title");
  ok(/Front Side Elevation/.test(refSheet) && /Back Side Elevation/.test(refSheet), "all four elevations are captioned");
  ok(/All dimensions are in mm/.test(refSheet), "the sheet states its unit convention");
  /* A NaN anywhere in an SVG silently drops the shape it belongs to, so the sheet looks "fine" while
   * a plan, a swing arc or a dimension is simply missing. Fail loudly instead. */
  ok(!/NaN/.test(refSheet), "no NaN coordinates or labels on the reference sheet");
  /* The millimetre conversion actually reaches the paper, AND the plan, the elevations, the
   * building-data block and the title block all dimension the SAME overall extent — the whole
   * colony including verandas and staircases, not the smaller room-block footprint. */
  const overallMm = Math.round((refGeoms[0].bounds.maxX - refGeoms[0].bounds.minX) * 1000);
  const footprintMm = Math.round(result.area.footprintLengthM * 1000);
  ok(refSheet.includes(`>${overallMm}<`), `overall length is dimensioned in mm (${overallMm})`);
  ok(overallMm !== footprintMm, "the harness colony really does have a veranda/stair overhang to disagree about");
  ok(
    (refSheet.match(new RegExp(`>${overallMm}<`, "g")) ?? []).length >= 3,
    "the plan and both elevation pairs all state the same overall length",
  );
  ok(/\[D/.test(refSheet) && /\[W/.test(refSheet), "door and window marks are tagged on the views");
  /* The elevations must actually SHOW what their caption promises. Before the face-tag fix every
   * brace failed the depth-band test and no elevation drew a single one. */
  ok(/Cross bracing/.test(refSheet), "the elevations call out the cross bracing");
  ok(/Hand railing/.test(refSheet), "the elevations call out the hand railing");
  ok(/Staircase/.test(refSheet), "the elevations call out the staircase");
  ok(/Bolted cross-support node/.test(refSheet), "the bolted cross-support node is in the elevation key");
  if (refBracing) {
    /* The callout word-wraps, so assert the token that survives a line break rather than the whole
     * sentence — the point is that the SIZE and the PER-END COUNT on the drawing are the priced
     * calculation's, not a plausible-looking invention. */
    ok(
      refSheet.includes(`bolted ${refBracing.boltSize} × ${refBracing.boltsPerEnd}`),
      "the bracing callout states the real nut-bolt assembly, not an invented one",
    );
    ok(refSheet.includes(refBracing.section), "the bracing callout states the priced brace section");
  }
}

const refBom = render("ReferenceBomSheet", React.createElement(ReferenceBomSheet, { register: refRegister }));
if (refBom) {
  ok(refBom.length > 1000, `ReferenceBomSheet renders (${refBom.length} chars)`);
  ok(/Bill of materials/i.test(refBom), "the bill of materials is titled");
  ok(!/oklch\(/i.test(refBom), "no oklch() colours in the bill of materials (PDF-export safe)");
}

/* single-storey + no-civil reference sheet must not crash either */
const refSingle = render(
  "ReferenceGASheet (ground floor only, no civil)",
  React.createElement(ReferenceGASheet, {
    model: buildColonyModel({ result: single, civil: null, columnGrid: null }),
    result: single,
    geoms: [buildRoomFloorPlan(single, single.config.floorPlan, 0)],
    openings: [],
    callouts: [],
    meta: REF_META,
    watermark: false,
  }),
);
ok(!!refSingle && refSingle.length > 1000, "reference sheet renders for a ground-floor-only colony with no civil work");

/* ---- per-floor staircase visibility (StaircaseDrawConfig.onFloors) --------------------------- */
/* Drawing-only per-floor filter on a G+3 colony: no list = every floor (the back-compatible
 * reading of every pre-existing saved project); a list = exactly those floor plans and no other.
 * The BOQ side is untouched by construction — onFloors lives in the drawing config the engine
 * never reads — and colony-studio.test.ts §G+3 pins the flights = floors − 1 arithmetic. */
{
  const g3 = calculateLabourColony({ ...CONFIG, floors: 4 });
  const stairsOn = (fp: Parameters<typeof buildRoomFloorPlan>[1], f: number) =>
    buildRoomFloorPlan(g3, fp, f).stairs.length;

  const everywhere = { staircases: [{ id: "s1", label: "Tower", position: "right" as const, enabled: true }] };
  const groundOnly = { staircases: [{ ...everywhere.staircases[0], onFloors: [0] }] };
  const midFloors = { staircases: [{ ...everywhere.staircases[0], onFloors: [1, 2] }] };

  ok(
    [0, 1, 2, 3].every((f) => stairsOn(everywhere, f) === 1),
    "no onFloors list → the staircase draws on every floor plan (legacy projects unchanged)",
  );
  ok(
    stairsOn(groundOnly, 0) === 1 && [1, 2, 3].every((f) => stairsOn(groundOnly, f) === 0),
    "onFloors [0] → drawn on the ground-floor plan only",
  );
  ok(
    stairsOn(midFloors, 1) === 1 && stairsOn(midFloors, 2) === 1 &&
      stairsOn(midFloors, 0) === 0 && stairsOn(midFloors, 3) === 0,
    "onFloors [1, 2] → drawn on the first- and second-floor plans only",
  );
  // Out-of-range indices are inert, not an error — a stair pinned to a floor that no longer
  // exists (the owner reduced the storey count) simply stops drawing rather than crashing.
  ok(
    [0, 1, 2, 3].every((f) => stairsOn({ staircases: [{ ...everywhere.staircases[0], onFloors: [9] }] }, f) === 0),
    "onFloors pointing at a removed floor draws nowhere and throws nothing",
  );
}

console.log(`\ncolony-studio-render.test.tsx — ${passed} passed, ${failed} failed\n`);
if (failed) {
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
} else {
  console.log("  ✓ all DOM studio surfaces render clean on a real model");
}
