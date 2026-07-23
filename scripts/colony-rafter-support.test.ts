/**
 * RAFTER SUPPORT SYSTEM — engineering-invariant harness.
 *
 * Run with:  npx tsx scripts/colony-rafter-support.test.ts
 *
 * Verifies the whole photographed connection WITHOUT a browser: cleat → nut-bolt → C-purlin → MS tube
 * bolted FLUSH to the purlin web → covering. It proves the module arithmetic (a 2440 × 1220 board on
 * 1220 c/c has every edge borne, 1000 c/c does not and is reported; a 1000 mm cover-width PUF panel
 * leaves the exact residual cut width on a non-multiple slope), that every quantity scales with the
 * cleat and level count, that the tube really is flush to the web and its bolts really do pass through
 * it, that no two members interpenetrate and nothing floats, that the unit weights reproduce the
 * Material Master, that every validation rule fires and the shipped default raises none, that the
 * system is deterministic across a JSON save / reload round-trip, and that disabling it produces zero
 * of everything.
 *
 * Pure Node (tsx) — the same convention as scripts/colony-puf-lock.test.ts.
 */

import {
  DEFAULT_RAFTER_SUPPORT_CONFIG,
  PURLIN_SECTION_LIBRARY,
  RAFTER_SUPPORT_APPROVAL_DISCLAIMER,
  RAFTER_SUPPORT_DRAWING_NOTES,
  RAFTER_SUPPORT_EXPLANATION,
  TUBE_SECTION_LIBRARY,
  autoLevels,
  cleatBoltOffsets,
  cleatUnitWeightKg,
  deriveRafterSupport,
  nutUnitWeightKg,
  panelLayoutFor,
  purlinKgPerM,
  purlinSectionKgPerM,
  purlinSectionOption,
  rafterCleatGeometry,
  rafterSupportAssemblyCallout,
  rafterSupportMethodSteps,
  requiredCleatBoltLengthMm,
  requiredCleatWidthMm,
  requiredWebBoltLengthMm,
  resolveRafterSupportConfig,
  roofSlopePlanes,
  sheetLayoutFor,
  tubeKgPerM,
  tubeRunGeometry,
  tubeSectionKgPerM,
  tubeSectionOption,
  tubeSpacingForSheet,
  washerUnitWeightKg,
  webBoltOffsets,
  webLapMm,
  type CeilingSheetSpec,
  type RafterSupportBox,
  type RafterSupportCleatPosition,
  type RafterSupportConfig,
  type RafterSupportContext,
  type RafterSupportDerived,
  type RafterSupportLayoutLevel,
  type RafterSupportRafterLine,
  type RoofPanelSpec,
} from "../src/features/labour-colony-studio/model/rafterSupport";

let passed = 0;
let failed = 0;
const fails: string[] = [];
function ok(cond: boolean, msg: string): void {
  if (cond) passed++;
  else { failed++; fails.push(msg); }
}
const eq = (a: number, b: number, msg: string, eps = 1e-6) =>
  ok(Math.abs(a - b) <= eps, `${msg} (got ${a}, want ${b})`);

/* ------------------------------------------------------------------ fixtures ------------------ */

/**
 * The REFERENCE PROJECT: a 12 200 × 7 400 mm block on a grid A–E × 1–3 — four 3 050 mm bays along the
 * length and two 3 700 mm bays across the width. Rafters run ACROSS the width (axis "y") at each of the
 * five column lines, so the C-purlins and MS tubes run ALONG the length (axis "x").
 */
const XS = [0, 3.05, 6.1, 9.15, 12.2];
const YS = [0, 3.7, 7.4];
const REF_GRID: RafterSupportContext["grid"] = [];
{
  const letters = "ABCDE";
  YS.forEach((y, ri) => XS.forEach((x, ci) => REF_GRID.push({ grid: `${letters[ci]}-${ri + 1}`, xM: x, yM: y })));
}

const REF_RAFTERS: RafterSupportRafterLine[] = XS.map((x, i) => ({
  id: `roof:truss:t${i + 1}`,
  axis: "y" as const,
  atM: x,
  fromM: 0,
  toM: 7.4,
  mark: `T${i + 1}`,
}));

const refCtx = (over: Partial<RafterSupportContext> = {}): RafterSupportContext => ({
  grid: REF_GRID,
  body: { x0: 0, y0: 0, x1: 12.2, y1: 7.4 },
  floors: 2,
  floorCeilingZM: [3.15, 6.0],
  roofBaseZM: 6.0,
  slope: { type: "gable", riseM: 1.2, overhangM: 0.3 },
  rafterLines: REF_RAFTERS,
  rafterFlangeThicknessMm: 6,
  rafterDepthMm: 150,
  rafterWidthMm: 100,
  ...over,
});

const codesOf = (d: RafterSupportDerived): string[] => d.issues.map((i) => i.code);
const issueCodes = (cfg: Partial<RafterSupportConfig>, ctx = refCtx()): string[] =>
  codesOf(deriveRafterSupport(cfg, ctx));

const D = DEFAULT_RAFTER_SUPPORT_CONFIG;

/** Two axis-aligned boxes genuinely share volume (touching faces are NOT an overlap). */
function boxesOverlap(a: RafterSupportBox, b: RafterSupportBox, eps = 1e-7): boolean {
  return (
    a.x0 < b.x1 - eps && a.x1 > b.x0 + eps
    && a.y0 < b.y1 - eps && a.y1 > b.y0 + eps
    && a.z0 < b.z1 - eps && a.z1 > b.z0 + eps
  );
}
const nums = (b: RafterSupportBox): number[] => [b.x0, b.y0, b.z0, b.x1, b.y1, b.z1];
const finite = (xs: number[]): boolean => xs.every((n) => Number.isFinite(n));

/* ================================================================== 1. levels ================== */

{
  // G+1 → a ceiling over the ground floor AND the sloped roof on top
  const g1 = autoLevels(refCtx({ floors: 2 }));
  eq(g1.length, 2, "G+1 resolves exactly two levels");
  ok(g1[0].kind === "ceiling" && g1[0].floorIndex === 0, "G+1: level 1 is the ground-floor ceiling");
  ok(g1[1].kind === "roof", "G+1: level 2 is the sloped roof");
  ok(g1.every((l) => l.enabled), "G+1: both levels are enabled by default");

  // G only → the roof alone; the ground floor's ceiling IS the roof soffit
  const g0 = autoLevels(refCtx({ floors: 1 }));
  eq(g0.length, 1, "a G-only colony resolves exactly one level");
  ok(g0[0].kind === "roof", "a G-only colony gets only the roof level — no invented ceiling");

  // G+2 → two ceilings and one roof
  const g2 = autoLevels(refCtx({ floors: 3 }));
  eq(g2.length, 3, "G+2 resolves three levels");
  eq(g2.filter((l) => l.kind === "ceiling").length, 2, "G+2 has two ceiling levels");
  eq(g2.filter((l) => l.kind === "roof").length, 1, "G+2 has exactly one roof level");
  ok(new Set(g2.map((l) => l.id)).size === 3, "level ids are unique");

  const d = deriveRafterSupport(undefined, refCtx());
  eq(d.levels.length, 2, "the derived bundle carries both levels");
  ok(d.levels.every((l) => l.runAxis === "x"), "rafters running across the width put the purlin run along the length");
  eq(d.levels[0].dir, -1, "a ceiling level hangs DOWN under the beam soffit");
  eq(d.levels[1].dir, 1, "a roof level builds UP off the rafter top");
}

/* ================================================================== 2. spacing arithmetic ====== */

{
  // the whole feature turns on this: valid spacings are sheetLength / n
  const at1220 = tubeSpacingForSheet(D.ceilingSheet, 1220);
  eq(at1220.spacingMm, 1220, "the default 1220 c/c is used as configured");
  eq(at1220.divisions, 2, "a 2440 sheet at 1220 c/c spans exactly two bays");
  ok(at1220.divides, "1220 c/c divides the 2440 sheet cleanly — every edge lands on a tube");
  eq(at1220.residualMm, 0, "1220 c/c leaves no residual");

  const at1000 = tubeSpacingForSheet(D.ceilingSheet, 1000);
  ok(!at1000.divides, "1000 c/c does NOT divide a 2440 sheet");
  eq(at1000.spacingMm, 1000, "a non-dividing spacing is respected, never silently snapped");
  eq(at1000.nearestDividingMm, 1220, "the nearest dividing spacing to 1000 is reported as 1220");
  eq(at1000.residualMm, 440, "a 2440 sheet on 1000 c/c overruns the last whole bay by 440 mm");

  for (const [n, s] of [[1, 2440], [2, 1220], [4, 610], [5, 488], [8, 305]] as const) {
    const r = tubeSpacingForSheet(D.ceilingSheet, s);
    ok(r.divides, `${s} mm c/c (n = ${n}) divides a 2440 sheet cleanly`);
    eq(r.divisions, n, `${s} mm c/c is ${n} bays per sheet`);
  }
  for (const s of [900, 1000, 1100, 1300, 1500]) {
    ok(!tubeSpacingForSheet(D.ceilingSheet, s).divides, `${s} mm c/c does not divide a 2440 sheet`);
  }

  // changing the sheet size changes which spacings are legal
  const metric: CeilingSheetSpec = { ...D.ceilingSheet, sheetLengthMm: 2400, sheetWidthMm: 1200 };
  ok(tubeSpacingForSheet(metric, 1200).divides, "a 2400 mm sheet divides cleanly at 1200 c/c");
  ok(!tubeSpacingForSheet(metric, 1220).divides, "a 2400 mm sheet does NOT divide at 1220 c/c");
  eq(tubeSpacingForSheet(metric, 1220).nearestDividingMm, 1200, "a 2400 sheet suggests 1200 mm c/c");
  ok(tubeSpacingForSheet(metric, 800).divides, "a 2400 mm sheet divides cleanly at 800 c/c");
}

/* ================================================================== 3. sheet layout ============ */

{
  const lvl: RafterSupportLayoutLevel = { id: "L", kind: "ceiling", spacingMm: 1220 };

  // 12.2 m along the tubes × 7.32 m across = a whole number of boards both ways
  const clean = sheetLayoutFor(lvl, 12.2, 7.32, D.ceilingSheet);
  eq(clean.wholeRowsAcross, 3, "7320 mm across / 2440 = 3 whole board runs");
  eq(clean.wholeRowsAlong, 10, "12200 mm along / 1220 = 10 whole board runs");
  eq(clean.wholeSheets, 30, "a 12.2 × 7.32 m ceiling takes exactly 30 whole boards");
  eq(clean.cutSheets, 0, "an exact-fit ceiling needs no cut board");
  eq(clean.totalSheets, 30, "30 boards in total");
  eq(clean.cutSheetLengthMm, 0, "no residual board length");
  eq(clean.cutSheetWidthMm, 0, "no residual board width");
  eq(clean.unsupportedJointsMm.length, 0, "at 1220 c/c EVERY sheet edge lands on a tube");
  eq(clean.coveredAreaSqm, 89.304, "covered area is laid out, not guessed", 1e-3);
  eq(clean.purchasedAreaSqm, 30 * 2.44 * 1.22, "purchased area is 30 whole boards", 1e-3);

  // 1000 c/c: the SAME area, but now the sheet edges miss the tubes
  const bad = sheetLayoutFor({ ...lvl, spacingMm: 1000 }, 12.2, 7.32, D.ceilingSheet);
  eq(bad.wholeSheets, 30, "the board count does not change with the spacing — only the support does");
  ok(bad.unsupportedJointsMm.length > 0, "at 1000 c/c sheet edges fall between tubes");
  eq(bad.unsupportedJointsMm.length, 3, "three of the four joint stations miss a tube at 1000 c/c");
  ok(bad.unsupportedJointsMm.includes(2440), "the 2440 mm joint is unsupported (440 mm off a 1000 c/c tube)");
  ok(bad.unsupportedJointsMm.includes(4880), "the 4880 mm joint is unsupported (120 mm off a 1000 c/c tube)");
  ok(bad.unsupportedJointsMm.includes(7320), "the 7320 mm joint is unsupported (320 mm off a 1000 c/c tube)");
  ok(!bad.unsupportedJointsMm.includes(0), "the 0 mm start edge always lands on the first tube");
  eq(sheetLayoutFor(lvl, 12.2, 7.32, D.ceilingSheet).unsupportedJointsMm.length, 0,
    "the SAME ceiling at 1220 c/c has zero unsupported edges — the spacing is the only difference");

  // the actual tube stations win over bare multiples of the spacing when they are known: a closing
  // line at the far edge really does bear the cut board's edge
  const withClosing = sheetLayoutFor(
    { ...lvl, tubeStationsMm: [0, 1220, 2440, 3660, 4880, 6100, 7320, 7400] },
    12.2, 7.4, D.ceilingSheet,
  );
  eq(withClosing.unsupportedJointsMm.length, 0,
    "a closing tube line at the far edge bears the cut board — not reported as unsupported");
  const withoutClosing = sheetLayoutFor(lvl, 12.2, 7.4, D.ceilingSheet);
  eq(withoutClosing.unsupportedJointsMm.length, 1,
    "without that closing line the 7400 mm cut edge IS unsupported");
  eq(withoutClosing.unsupportedJointsMm[0], 7400, "…and it is exactly the closing edge that is reported");

  // a span that does NOT fit whole boards leaves the exact cut sizes
  const cut = sheetLayoutFor(lvl, 12.5, 7.4, D.ceilingSheet);
  eq(cut.wholeRowsAcross, 3, "7400 mm across gives 3 whole board runs");
  eq(cut.cutSheetLengthMm, 80, "the closing board across is exactly 7400 − 3 × 2440 = 80 mm");
  eq(cut.wholeRowsAlong, 10, "12500 mm along gives 10 whole board runs");
  eq(cut.cutSheetWidthMm, 300, "the closing board along is exactly 12500 − 10 × 1220 = 300 mm");
  eq(cut.wholeSheets, 30, "30 boards stay whole");
  eq(cut.cutSheets, 10 + 3 + 1, "10 length-cut + 3 width-cut + 1 corner board cut both ways");
  eq(cut.totalSheets, 44, "44 boards are consumed in total");
  ok(cut.purchasedAreaSqm > cut.coveredAreaSqm, "cut boards mean more board is bought than is covered");
  // THE POINT: this is a real grid layout, NOT ceil(area / sheetArea), which would have said 32
  eq(Math.ceil(cut.coveredAreaSqm / (2.44 * 1.22)), 32, "the naive area count would have said 32 boards");
  ok(cut.totalSheets > Math.ceil(cut.coveredAreaSqm / (2.44 * 1.22)),
    "the grid layout reports 44 boards, not the 32 a naive area division would hide the cuts behind");

  // a smaller board module flows straight through the layout
  const small = sheetLayoutFor({ ...lvl, spacingMm: 1200 }, 12.0, 7.2, { ...D.ceilingSheet, sheetLengthMm: 2400, sheetWidthMm: 1200 });
  eq(small.wholeRowsAcross, 3, "7200 / 2400 = 3 board runs");
  eq(small.wholeRowsAlong, 10, "12000 / 1200 = 10 board runs");
  eq(small.totalSheets, 30, "the metric board module lays out cleanly too");
  eq(small.unsupportedJointsMm.length, 0, "a 2400 board at 1200 c/c has every edge borne");

  // cross joints run PARALLEL to the tubes and need noggins, not tubes
  ok(clean.crossJointStationsMm.length > 0, "board joints parallel to the tubes are identified");
  ok(clean.nogginPieces > 0, "cross noggins are taken off for those joints");
  ok(clean.screws > 0, "screws are counted from the real support runs");
  const noNog = sheetLayoutFor(lvl, 12.2, 7.32, { ...D.ceilingSheet, crossNoggins: false });
  eq(noNog.nogginPieces, 0, "switching cross noggins off removes every noggin from the take-off");

  ok(finite([...nums({ x0: 0, y0: 0, z0: 0, x1: 1, y1: 1, z1: 1 })]), "box helper sanity");
  ok(finite([clean.coveredAreaSqm, clean.purchasedAreaSqm, cut.cutSheetLengthMm, bad.spacingMm]),
    "no sheet-layout number is NaN or Infinity");
}

/* ================================================================== 4. panel layout ============ */

{
  const lvl: RafterSupportLayoutLevel = { id: "R", kind: "roof", spacingMm: 1200 };

  // a whole multiple of the 1000 mm cover width leaves NO cut panel
  const whole = panelLayoutFor(lvl, 12.0, 4.0, D.roofPanel);
  eq(whole.wholePanels, 12, "a 12.0 m slope width takes exactly 12 × 1000 mm cover-width panels");
  eq(whole.cutPanelWidthMm, 0, "a whole multiple leaves no cut panel");
  ok(!whole.hasCutPanel, "hasCutPanel is false on an exact multiple");
  eq(whole.totalPanelRuns, 12, "12 panel runs across the slope");
  eq(whole.sideJointStationsMm.length, 11, "12 panels give 11 side joints");
  eq(whole.spanMm, 1200, "the panel span is the tube spacing along the rake");
  ok(whole.spanOk, "a 1200 mm span is inside the 1800 mm limit");
  eq(whole.piecesPerRun, 1, "a 4 m rake is one panel piece");
  eq(whole.panelLengthMm, 4000, "the panel length is the full rake");

  // a NON-multiple reports the EXACT residual cut width
  const cut = panelLayoutFor(lvl, 12.2, 4.0, D.roofPanel);
  eq(cut.wholePanels, 12, "a 12.2 m slope width takes 12 whole panels");
  ok(cut.hasCutPanel, "a non-multiple slope width needs a cut panel");
  eq(cut.cutPanelWidthMm, 200, "the residual cut panel is exactly 12200 − 12 × 1000 = 200 mm");
  eq(cut.totalPanelRuns, 13, "12 whole panels plus 1 cut panel = 13 runs");

  for (const [widthM, wholeN, residual] of [
    [7.4, 7, 400], [9.15, 9, 150], [3.05, 3, 50], [6.1, 6, 100], [10.5, 10, 500],
  ] as const) {
    const r = panelLayoutFor(lvl, widthM, 4.0, D.roofPanel);
    eq(r.wholePanels, wholeN, `${widthM} m slope width = ${wholeN} whole 1000 mm panels`);
    eq(r.cutPanelWidthMm, residual, `${widthM} m slope width leaves a ${residual} mm cut panel`);
  }

  // the cover width is a CONFIG value — it is never taken from the 1.15 m wall-panel master row
  eq(D.roofPanel.coverWidthMm, 1000, "the shipped roof-panel cover width is 1000 mm, not the 1150 mm wall panel");
  const wide = panelLayoutFor(lvl, 12.0, 4.0, { ...D.roofPanel, coverWidthMm: 1150 } as RoofPanelSpec);
  eq(wide.wholePanels, 10, "a 1150 mm cover width gives 10 whole panels on a 12 m slope");
  eq(wide.cutPanelWidthMm, 500, "and a 500 mm cut panel");

  // the span check
  const wideSpan = panelLayoutFor({ ...lvl, spacingMm: 2000 }, 12.0, 4.0, D.roofPanel);
  ok(!wideSpan.spanOk, "a 2000 mm span exceeds the 1800 mm panel limit");
  const okSpan = panelLayoutFor({ ...lvl, spacingMm: 1800 }, 12.0, 4.0, D.roofPanel);
  ok(okSpan.spanOk, "a span exactly at the limit is acceptable");

  // a rake longer than the maximum panel length is made up with an end lap
  const long = panelLayoutFor(lvl, 12.0, 20.0, D.roofPanel);
  eq(long.piecesPerRun, 2, "a 20 m rake needs 2 panel pieces per run");
  eq(long.panelLengthMm, 10200, "each piece is 10 000 mm plus the 200 mm end lap");
  eq(long.totalPanels, 24, "12 runs × 2 pieces = 24 panels");

  ok(finite([whole.coveredAreaSqm, whole.purchasedAreaSqm, cut.cutPanelWidthMm, long.panelLengthMm]),
    "no panel-layout number is NaN or Infinity");
}

/* ================================================================== 5. unit weights ============ */

{
  // the lipped-C rule reproduces EVERY Material Master C row exactly
  for (const s of PURLIN_SECTION_LIBRARY) {
    const kgm = purlinSectionKgPerM({
      ...D.purlin,
      materialKey: s.materialKey,
      designation: s.designation,
      depthMm: s.depthMm,
      flangeMm: s.flangeMm,
      lipMm: s.lipMm,
      thicknessMm: s.thicknessMm,
    });
    eq(Math.round(kgm * 100) / 100, s.masterKgPerM, `${s.materialKey} derives the Material Master's ${s.masterKgPerM} kg/m`, 0.005);
  }
  eq(purlinSectionOption("c-purlin-75x40")?.masterKgPerM ?? 0, 2.9, "c-purlin-75x40 is 2.90 kg/m in the Material Master");
  eq(purlinKgPerM(D.purlin), 3.611, "the shipped C 100 × 50 × 15 × 2.0 resolves to 3.611 kg/m", 0.005);

  // the shipped tube carries the master's tabulated 2.95 kg/m as an explicit override
  eq(tubeKgPerM(D.tube), 2.95, "shs-50x50x2 takes off at the Material Master's 2.95 kg/m");
  eq(tubeSectionOption("shs-50x50x2")?.masterKgPerM ?? 0, 2.95, "the section library agrees with the master row");

  // the sharp-corner geometric rule reproduces rhs-50x25x2 EXACTLY …
  const rhs = { ...D.tube, materialKey: "rhs-50x25x2", widthMm: 25, depthMm: 50, wallThicknessMm: 2, unitWeightKgPerMOverride: undefined };
  eq(Math.round(tubeSectionKgPerM(rhs) * 100) / 100, 2.23, "rhs-50x25x2 derives the Material Master's 2.23 kg/m", 0.005);
  // … and is a documented UPPER BOUND on the tabulated square sections (corner radii)
  const shsGeo = tubeSectionKgPerM({ ...D.tube, unitWeightKgPerMOverride: undefined });
  ok(shsGeo > 2.95, "the sharp-corner rule reads heavier than the tabulated 2.95 kg/m for shs-50x50x2");
  ok((shsGeo - 2.95) / 2.95 < 0.03, "and by less than 3 % — the corner-radius allowance, not an error");
  eq(Math.round(shsGeo * 1000) / 1000, 3.014, "the geometric upper bound for shs-50x50x2 is 3.014 kg/m", 0.002);
  for (const s of TUBE_SECTION_LIBRARY) {
    const geo = tubeSectionKgPerM({ ...D.tube, widthMm: s.widthMm, depthMm: s.depthMm, wallThicknessMm: s.wallThicknessMm, unitWeightKgPerMOverride: undefined });
    ok(geo >= s.masterKgPerM - 0.005, `${s.materialKey}: the geometric rule never understates the master's ${s.masterKgPerM} kg/m`);
    ok((geo - s.masterKgPerM) / s.masterKgPerM < 0.04, `${s.materialKey}: the geometric rule is within 4 % of the master`);
    // the library value is what the picker seeds as an override, and it wins
    eq(tubeKgPerM({ ...D.tube, unitWeightKgPerMOverride: s.masterKgPerM }), s.masterKgPerM,
      `${s.materialKey}: the tabulated override wins over the geometry`);
  }

  // MS plate is 7.85 kg/m² per mm — a 200 × 150 × 8 cleat less four Ø14 holes
  const gross = (200 * 150 * 8) * 7.85e-6;
  ok(cleatUnitWeightKg(D.cleat) < gross, "the drilled holes are deducted from the cleat weight");
  ok(cleatUnitWeightKg(D.cleat) > gross * 0.95, "the hole deduction is a few per cent, not a rewrite");
  eq(Math.round(cleatUnitWeightKg(D.cleat) * 100) / 100, 1.85, "the shipped cleat weighs 1.85 kg", 0.02);
  eq(cleatUnitWeightKg({ ...D.cleat, unitWeightKgOverride: 2.5 }), 2.5, "a cleat weight override is honoured");
  ok(cleatUnitWeightKg({ ...D.cleat, thicknessMm: 12 }) > cleatUnitWeightKg(D.cleat), "a thicker cleat weighs more");

  ok(nutUnitWeightKg(D.bolt) > 0 && nutUnitWeightKg(D.bolt) < 0.1, "an M12 nut weighs a sensible fraction of a kilo");
  ok(washerUnitWeightKg(D.bolt) > 0 && washerUnitWeightKg(D.bolt) < nutUnitWeightKg(D.bolt),
    "a washer weighs less than a nut");
}

/* ================================================================== 6. grips and clearances ==== */

{
  eq(requiredCleatBoltLengthMm(D, 6), 40, "cleat grip = 3 + 8 + 6 + 3 + 10 + 10 = 40 mm");
  ok(D.bolt.lengthMm >= requiredCleatBoltLengthMm(D, 6), "the shipped 50 mm cleat bolt clears its grip");
  eq(requiredWebBoltLengthMm(D), 78, "web grip = 3 + 2 + 50 (both tube walls) + 3 + 10 + 10 = 78 mm");
  ok(D.bolt.webLengthMm >= requiredWebBoltLengthMm(D), "the shipped 100 mm web bolt clears its grip");
  ok(requiredWebBoltLengthMm(D) > requiredCleatBoltLengthMm(D, 6),
    "the web bolt needs a longer grip than the cleat bolt — it crosses the whole tube");

  eq(requiredCleatWidthMm(D), 200, "the cleat must be 200 mm across: 140 gauge + 2 × 30 edge distance");
  eq(D.cleat.widthMm, 200, "the shipped cleat is exactly the minimum that works");
  ok(D.cleat.holeGaugeMm / 2 > Math.max(D.purlin.flangeMm, D.tube.widthMm) + D.cleat.boltHoleDiaMm / 2,
    "the bolt gauge clears both the C-purlin flange and the tube, so the nuts can be reached");
  ok(D.cleat.edgeDistanceMm >= 1.5 * D.bolt.diameterMm, "the shipped edge distance meets 1.5 × d");
  ok(D.cleat.boltHoleDiaMm > D.bolt.diameterMm, "the shipped hole gives clearance over the bolt");

  eq(webLapMm(D), 50, "the tube laps the web over its full 50 mm depth");
  ok(webLapMm(D) / 2 >= 1.5 * D.bolt.diameterMm, "the web bolt has 1.5 × d to each edge of the lap");
  eq(webLapMm({ ...D, tube: { ...D.tube, faceOffsetMm: 20 } }), 30, "a 20 mm face offset reduces the lap to 30 mm");
  ok(D.purlin.depthMm >= D.tube.depthMm, "the C-purlin is at least as deep as the tube it carries");

  eq(cleatBoltOffsets(D).length, 4, "four cleat bolts at the corners of the pitch × gauge rectangle");
  eq(cleatBoltOffsets({ ...D, bolt: { ...D.bolt, perCleat: 2 } }).length, 2, "two cleat bolts sit on the gauge line");
  eq(cleatBoltOffsets({ ...D, bolt: { ...D.bolt, perCleat: 1 } }).length, 1, "one cleat bolt sits on the centre");
  eq(webBoltOffsets(D).length, 2, "two web bolts per connection");
  eq(webBoltOffsets(D)[0], -50, "the first web bolt is half a pitch behind the cleat centre");
  eq(webBoltOffsets(D)[1], 50, "the second is half a pitch ahead");
  eq(webBoltOffsets({ ...D, tube: { ...D.tube, boltsPerConnection: 1 } })[0], 0, "a single web bolt sits on the centre");
  eq(webBoltOffsets({ ...D, tube: { ...D.tube, boltsPerConnection: 3 } }).length, 3, "three web bolts are laid out on the pitch");
}

/* ================================================================== 7. the reference build ===== */

const REF = deriveRafterSupport(undefined, refCtx());

{
  eq(REF.errors.length, 0, `the shipped default configuration raises NO errors (got ${REF.errors.map((e) => e.code).join(", ")})`);
  ok(REF.config.enabled, "the system is on by default");
  eq(REF.levels.length, 2, "the reference G+1 colony resolves a ceiling and a roof");

  const ceiling = REF.levels[0];
  const roof = REF.levels[1];
  ok(ceiling.kind === "ceiling", "level 1 is the ceiling");
  eq(ceiling.spacingMm, 1220, "the ceiling runs at the 1220 mm board module");
  ok(ceiling.spacing?.divides === true, "the ceiling spacing divides the board cleanly");
  // 7.4 m across at 1220 c/c: lines at 0…6.1 (7 lines) plus a closing line at 7.4
  eq(ceiling.lines.length, 8, "7.4 m across at 1220 c/c gives 7 module lines plus 1 closing line");
  eq(ceiling.lines.filter((l) => l.onModule).length, 7, "seven of those lines are on the board module");
  eq(ceiling.lines.filter((l) => !l.onModule).length, 1, "one closing line bears the cut board's edge");
  ok(ceiling.lines.every((l) => l.dir === -1), "every ceiling line hangs downward");
  ok(ceiling.lines.every((l) => Math.abs(l.lengthM - 12.2) < 1e-6), "every ceiling run is the full 12.2 m length");
  for (let i = 1; i < 7; i++) {
    eq(ceiling.lines[i].acrossM - ceiling.lines[i - 1].acrossM, 1.22, `ceiling line ${i} is exactly 1220 mm from its neighbour`, 1e-6);
  }

  ok(roof.kind === "roof", "level 2 is the roof");
  eq(roof.spacingMm, 1200, "the roof runs at the configured 1200 mm panel span");
  eq(roof.slopes.length, 2, "a gable roof resolves two slope planes");
  ok(roof.lines.every((l) => l.dir === 1), "every roof line builds upward");
  ok(roof.lines.length > 0, "the roof has tube lines");
  ok(roof.panelLayouts.length === 2, "one panel layout per slope");

  // cleats: one wherever a line crosses a rafter; 5 rafters at each level
  eq(REF.takeoff.levels[0].cleats, ceiling.lines.length * 5, "the ceiling gets one cleat per line per rafter");
  eq(REF.takeoff.levels[1].cleats, roof.lines.length * 5, "the roof gets one cleat per line per rafter");
  eq(REF.positions.length, REF.takeoff.cleats, "the take-off cleat count equals the placed cleats");
  ok(REF.positions.length > 0, `the reference colony places cleats (${REF.positions.length})`);

  // ids and marks
  ok(new Set(REF.positions.map((p) => p.id)).size === REF.positions.length, "every cleat id is unique");
  ok(new Set(REF.positions.map((p) => p.mark)).size === REF.positions.length, "every cleat mark is unique");
  ok(REF.positions[0].mark === "RS-01", "cleat marks start at RS-01");
  ok(REF.positions.every((p) => p.gridRef !== "?"), "every cleat resolves a gridline reference");
  ok(REF.positions.every((p) => Number.isFinite(p.offsetMm)), "every cleat has a finite setting-out offset");
  ok(REF.positions.every((p) => p.source === "auto"), "derived cleats are marked auto");

  // every cleat sits on a rafter line and on a tube line
  ok(REF.positions.every((p) => XS.some((x) => Math.abs(p.xM - x) < 1e-6)),
    "every cleat lands on a rafter line");
  ok(REF.positions.every((p) => p.yM >= -1e-6 && p.yM <= 7.4 + 1e-6),
    "every cleat lies inside the building body");

  // hardware scales with the cleat count — never hardcoded
  eq(REF.takeoff.cleatBolts, REF.takeoff.cleats * 4, "4 cleat bolts per cleat");
  eq(REF.takeoff.webBolts, REF.takeoff.cleats * 2, "2 web bolts per connection");
  eq(REF.takeoff.bolts, REF.takeoff.cleats * 6, "6 bolts per connection in total");
  eq(REF.takeoff.nuts, REF.takeoff.bolts, "one nut per bolt");
  eq(REF.takeoff.washers, REF.takeoff.bolts * 2, "two washers per bolt — one under the head, one under the nut");

  // running lengths and weights are derived, never assumed
  eq(REF.takeoff.purlinRunningLengthM, REF.takeoff.tubeRunningLengthM,
    "the tube runs exactly alongside the purlin, so their running lengths match");
  eq(REF.takeoff.purlinKg, Math.round(REF.takeoff.purlinRunningLengthM * 3.611 * 1000) / 1000,
    "purlin weight = running length × the derived kg/m", 0.01);
  eq(REF.takeoff.tubeKg, Math.round(REF.takeoff.tubeRunningLengthM * 2.95 * 1000) / 1000,
    "tube weight = running length × the master's 2.95 kg/m", 0.01);
  ok(REF.takeoff.totalSteelKg > 0, "the system takes off a positive total steel weight");
  eq(
    Math.round(REF.takeoff.totalSteelKg * 100) / 100,
    Math.round((REF.takeoff.cleatKg + REF.takeoff.boltKg + REF.takeoff.nutKg + REF.takeoff.washerKg
      + REF.takeoff.purlinKg + REF.takeoff.tubeKg + REF.takeoff.nogginKg) * 100) / 100,
    "the total steel weight is exactly the sum of its parts", 0.02,
  );

  // covering quantities
  ok(REF.takeoff.ceilingSheets > 0, "the ceiling level takes off boards");
  eq(REF.takeoff.ceilingSheets, REF.takeoff.ceilingSheetsWhole + REF.takeoff.ceilingSheetsCut,
    "whole + cut boards equals the total board count");
  eq(REF.takeoff.ceilingSheetKg,
    Math.round(REF.takeoff.ceilingPurchasedAreaSqm * 23.4 * 1000) / 1000,
    "board weight = purchased area × the master's 23.40 kg/m²", 0.01);
  ok(REF.takeoff.roofPanels > 0, "the roof level takes off panels");
  eq(REF.takeoff.roofPanelKg,
    Math.round(REF.takeoff.roofPanelPurchasedAreaSqm * 9.85 * 1000) / 1000,
    "panel weight = purchased area × the master's 9.85 kg/m²", 0.01);
  ok(REF.takeoff.screws > 0, "fixings are counted from the real support runs");

  // no NaN / Infinity anywhere in the take-off
  const takeoffNums = Object.values(REF.takeoff).filter((v): v is number => typeof v === "number");
  ok(takeoffNums.every((n) => Number.isFinite(n)), "no take-off number is NaN or Infinity");
  ok(REF.takeoff.levels.every((l) =>
    Object.values(l).filter((v): v is number => typeof v === "number").every((n) => Number.isFinite(n))),
    "no per-level take-off number is NaN or Infinity");
  ok(REF.positions.every((p) => finite([p.xM, p.yM, p.seatZM, p.acrossM, p.rakeM, p.offsetMm])),
    "no cleat coordinate is NaN or Infinity");
}

/* ================================================================== 8. scaling ================= */

{
  // tighter ceiling spacing ⇒ more lines ⇒ more of everything
  const tight = deriveRafterSupport(
    { ceilingSheet: { ...D.ceilingSheet, tubeSpacingMm: 610 } } as Partial<RafterSupportConfig>,
    refCtx(),
  );
  ok(tight.levels[0].lines.length > REF.levels[0].lines.length, "halving the spacing adds tube lines");
  ok(tight.takeoff.cleats > REF.takeoff.cleats, "more lines means more cleats");
  ok(tight.takeoff.bolts > REF.takeoff.bolts, "more cleats means more bolts");
  ok(tight.takeoff.nuts > REF.takeoff.nuts, "more bolts means more nuts");
  ok(tight.takeoff.washers > REF.takeoff.washers, "more bolts means more washers");
  ok(tight.takeoff.purlinRunningLengthM > REF.takeoff.purlinRunningLengthM, "more lines means more purlin");
  ok(tight.takeoff.tubeRunningLengthM > REF.takeoff.tubeRunningLengthM, "more lines means more tube");
  ok(tight.takeoff.tubePieces > REF.takeoff.tubePieces, "more lines means more tube pieces");
  ok(tight.takeoff.purlinPieces > REF.takeoff.purlinPieces, "more lines means more purlin pieces");
  ok(tight.takeoff.totalSteelKg > REF.takeoff.totalSteelKg, "more steel means more weight");
  eq(tight.errors.length, 0, "610 mm c/c divides a 2440 board, so it raises no error");

  // more rafters ⇒ more cleats, same members
  const moreRafters = deriveRafterSupport(undefined, refCtx({
    rafterLines: [...REF_RAFTERS, { id: "roof:truss:t6", axis: "y", atM: 1.525, fromM: 0, toM: 7.4, mark: "T6" }],
  }));
  ok(moreRafters.takeoff.cleats > REF.takeoff.cleats, "an extra rafter adds a cleat on every line");
  eq(moreRafters.takeoff.purlinRunningLengthM, REF.takeoff.purlinRunningLengthM,
    "an extra rafter does NOT change the purlin running length");
  eq(moreRafters.takeoff.cleatBolts, moreRafters.takeoff.cleats * 4, "cleat bolts still track the cleat count");

  // more floors ⇒ more ceiling levels ⇒ more of everything
  const g0 = deriveRafterSupport(undefined, refCtx({ floors: 1, floorCeilingZM: [6.0] }));
  const g2 = deriveRafterSupport(undefined, refCtx({ floors: 3, floorCeilingZM: [3.15, 6.0, 8.85], roofBaseZM: 8.85 }));
  eq(g0.levels.length, 1, "G-only resolves one level");
  eq(g2.levels.length, 3, "G+2 resolves three levels");
  ok(g2.takeoff.cleats > REF.takeoff.cleats, "an extra ceiling level adds cleats");
  ok(g2.takeoff.cleats > g0.takeoff.cleats, "and G+2 has more than G-only");
  ok(g2.takeoff.ceilingSheets > REF.takeoff.ceilingSheets, "an extra ceiling level adds boards");
  eq(g0.takeoff.ceilingSheets, 0, "a G-only colony has no separate ceiling level, so no boards");
  ok(g0.takeoff.roofPanels > 0, "a G-only colony still has its roof panels");
  eq(g0.errors.length, 0, "a G-only colony raises no errors");
  eq(g2.errors.length, 0, "a G+2 colony raises no errors");

  // disabling one level removes only that level's quantities
  const noCeiling = deriveRafterSupport(
    { levelsEdited: true, levels: autoLevels(refCtx()).map((l) => (l.kind === "ceiling" ? { ...l, enabled: false } : l)) } as Partial<RafterSupportConfig>,
    refCtx(),
  );
  eq(noCeiling.takeoff.ceilingSheets, 0, "disabling the ceiling level removes every board");
  ok(noCeiling.takeoff.roofPanels > 0, "…but leaves the roof panels alone");
  ok(noCeiling.takeoff.cleats < REF.takeoff.cleats, "…and removes that level's cleats");
}

/* ================================================================== 9. geometry ================ */

{
  const ceiling = REF.levels[0];
  const roof = REF.levels[1];
  const cfg = REF.config;

  for (const [label, lv] of [["ceiling", ceiling], ["roof", roof]] as const) {
    const pos = REF.positions.find((p) => p.levelId === lv.id);
    ok(!!pos, `${label}: a cleat exists to build the detail from`);
    if (!pos) continue;
    const g = rafterCleatGeometry(cfg, pos, lv, { flangeThicknessMm: 6, depthMm: 150, widthMm: 100 });
    const dir = pos.dir;

    /* ---- nothing floats: every face touches the one below it ---- */
    const cleatNear = dir > 0 ? g.cleat.z0 : g.cleat.z1;
    const cleatFar = dir > 0 ? g.cleat.z1 : g.cleat.z0;
    eq(cleatNear, pos.seatZM, `${label}: the cleat sits exactly on the rafter face`, 1e-9);
    eq(g.cleat.z1 - g.cleat.z0, cfg.cleat.thicknessMm / 1000, `${label}: the cleat is its configured thickness`, 1e-9);
    const purlinNear = dir > 0 ? g.purlin.z0 : g.purlin.z1;
    eq(purlinNear, cleatFar, `${label}: the C-purlin bears exactly on the cleat — no float, no gap`, 1e-9);
    eq(g.purlin.z1 - g.purlin.z0, cfg.purlin.depthMm / 1000, `${label}: the C-purlin is its configured depth`, 1e-9);
    eq(g.tube.z1 - g.tube.z0, cfg.tube.depthMm / 1000, `${label}: the tube is its configured depth`, 1e-9);

    /* ---- the tube is FLUSH to the web ---- */
    const s = cfg.tube.sideOfWeb === "positive" ? 1 : -1;
    const webFace = g.webFaceAtM;
    const tubeNearN = s > 0 ? g.tube.y0 : g.tube.y1;
    const webOuterN = s > 0 ? g.purlinWeb.y1 : g.purlinWeb.y0;
    eq(tubeNearN, webFace, `${label}: the tube's near face is exactly on the flush interface plane`, 1e-9);
    eq(webOuterN, webFace, `${label}: the web's outer face is exactly on the same plane`, 1e-9);
    eq(Math.abs(tubeNearN - webOuterN), 0, `${label}: ZERO gap between the tube face and the web face — genuinely flush`, 1e-9);
    eq(g.purlinWeb.y1 - g.purlinWeb.y0, cfg.purlin.thicknessMm / 1000, `${label}: the web is the section thickness`, 1e-9);
    eq(g.tube.y1 - g.tube.y0, cfg.tube.widthMm / 1000, `${label}: the tube is its configured width across the run`, 1e-9);
    // the tube centreline IS the module line the covering is set out from
    eq((g.tube.y0 + g.tube.y1) / 2, pos.yM, `${label}: the tube centreline is the module line`, 1e-9);
    // the C's flanges turn AWAY from the tube, so the web face it beds against stays flat
    ok(s > 0 ? g.purlin.y0 < webFace : g.purlin.y1 > webFace, `${label}: the C-purlin flanges turn away from the tube`);
    ok(!boxesOverlap(g.tube, g.purlin), `${label}: the tube does not bite into the C-purlin envelope`);

    /* ---- the web bolts really do pass THROUGH the web and the tube ---- */
    eq(g.webBolts.length, cfg.tube.boltsPerConnection, `${label}: one solid set per web bolt`);
    for (const b of g.webBolts) {
      ok(b.axis === "y", `${label}: the web bolt runs horizontally across the run`);
      const lo = Math.min(g.purlinWeb.y0, g.purlinWeb.y1);
      const hi = Math.max(g.purlinWeb.y0, g.purlinWeb.y1);
      ok(b.shank.y0 < lo + 1e-9 && b.shank.y1 > hi - 1e-9, `${label}: the shank passes clean through the C-purlin web`);
      ok(b.shank.y0 < g.tube.y0 + 1e-9 && b.shank.y1 > g.tube.y1 - 1e-9,
        `${label}: the shank passes clean through BOTH walls of the tube`);
      // the bolt sits inside the lap, at the tube's mid depth
      ok(b.centre.z > Math.min(g.tube.z0, g.tube.z1) && b.centre.z < Math.max(g.tube.z0, g.tube.z1),
        `${label}: the web bolt sits inside the tube depth`);
      ok(b.centre.z > g.purlinWeb.z0 && b.centre.z < g.purlinWeb.z1, `${label}: …and inside the web depth`);
      // head and nut are OUTSIDE the members they clamp — the visible nut-bolt
      ok(!boxesOverlap(b.nut, g.tube), `${label}: the web-bolt nut is outside the tube — it can be tightened`);
      ok(!boxesOverlap(b.nut, g.purlinWeb), `${label}: the web-bolt nut is clear of the web`);
      ok(!boxesOverlap(b.head, g.purlinWeb), `${label}: the web-bolt head is clear of the web`);
      ok(!boxesOverlap(b.head, g.tube), `${label}: the web-bolt head is clear of the tube`);
      ok(b.washers.length === 2, `${label}: a washer under the head and under the nut`);
      ok(b.projection.y1 - b.projection.y0 > 0, `${label}: the thread projects beyond the nut and is visible`);
      eq(Math.abs(b.projection.y1 - b.projection.y0), cfg.bolt.projectionMm / 1000,
        `${label}: the projection is exactly as specified`, 1e-9);
      ok(finite(nums(b.head).concat(nums(b.shank), nums(b.nut), nums(b.projection))),
        `${label}: no web-bolt solid contains NaN`);
    }

    /* ---- the cleat bolts really do pass through the cleat and the rafter flange ---- */
    eq(g.cleatBolts.length, cfg.bolt.perCleat, `${label}: one solid set per cleat bolt`);
    for (const b of g.cleatBolts) {
      ok(b.axis === "z", `${label}: the cleat bolt runs vertically`);
      ok(b.shank.z0 < g.cleat.z0 + 1e-9 && b.shank.z1 > g.cleat.z1 - 1e-9,
        `${label}: the cleat-bolt shank passes clean through the cleat`);
      ok(b.shank.z0 < Math.min(g.rafter.z0, g.rafter.z1) + Math.abs(g.rafter.z1 - g.rafter.z0)
        || b.shank.z1 > Math.min(g.rafter.z0, g.rafter.z1), `${label}: the cleat bolt reaches into the rafter`);
      // the head, washers and nut must clear the members the cleat carries, or no spanner fits
      ok(!boxesOverlap(b.head, g.purlinWeb), `${label}: the cleat-bolt head clears the C-purlin web`);
      ok(!boxesOverlap(b.head, g.purlinFlangeNear), `${label}: the cleat-bolt head clears the C-purlin flange`);
      ok(!boxesOverlap(b.head, g.tube), `${label}: the cleat-bolt head clears the MS tube`);
      for (const w of b.washers) {
        ok(!boxesOverlap(w, g.purlinFlangeNear), `${label}: the cleat washer clears the C-purlin flange`);
        ok(!boxesOverlap(w, g.tube), `${label}: the cleat washer clears the MS tube`);
      }
      ok(!boxesOverlap(b.nut, g.cleat), `${label}: the cleat-bolt nut is outside the cleat`);
      ok(finite(nums(b.head).concat(nums(b.shank), nums(b.nut))), `${label}: no cleat-bolt solid contains NaN`);
    }

    /* ---- no two MEMBERS interpenetrate ---- */
    const members: [string, RafterSupportBox][] = [
      ["rafter", g.rafter], ["cleat", g.cleat], ["purlin", g.purlin], ["tube", g.tube], ["covering", g.covering],
    ];
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        ok(!boxesOverlap(members[i][1], members[j][1]),
          `${label}: ${members[i][0]} and ${members[j][0]} do not interpenetrate`);
      }
    }
    ok(members.every(([, b]) => finite(nums(b))), `${label}: no member solid contains NaN or Infinity`);
    ok(members.every(([, b]) => b.x1 >= b.x0 && b.y1 >= b.y0 && b.z1 >= b.z0),
      `${label}: every member box is well-formed (min ≤ max)`);

    /* ---- the covering bears on the right face ---- */
    const tubeFar = dir > 0 ? g.tube.z1 : g.tube.z0;
    const coverNear = dir > 0 ? g.covering.z0 : g.covering.z1;
    eq(coverNear, tubeFar, `${label}: the covering bears exactly on the tube's fixing face`, 1e-9);
    if (label === "roof") {
      ok(g.covering.z0 >= g.tube.z1 - 1e-9, "roof: the PUF panel is laid ON TOP of the tube");
      eq(g.covering.z1 - g.covering.z0, cfg.roofPanel.thicknessMm / 1000, "roof: the panel is its configured thickness", 1e-9);
    } else {
      ok(g.covering.z1 <= g.tube.z0 + 1e-9, "ceiling: the board hangs UNDER the tube");
      eq(g.covering.z1 - g.covering.z0, cfg.ceilingSheet.thicknessMm / 1000, "ceiling: the board is its configured thickness", 1e-9);
      ok(g.covering.z1 < g.cleat.z0 + 1e-9, "ceiling: the board is clear below the cleat — it is never driven through it");
    }

    /* ---- explode vectors ---- */
    eq(Math.hypot(g.seatNormal.x, g.seatNormal.y, g.seatNormal.z), 1, `${label}: the seat normal is a unit vector`, 1e-9);
    eq(g.stackNormal.z, dir, `${label}: the stack normal points the way the assembly builds`);
    ok(g.seatNormal.z === 0, `${label}: the seat normal lies in plan — the tube fans sideways off the web`);
  }

  // the continuous run geometry agrees with the typical detail
  const line = ceiling.lines[0];
  const run = tubeRunGeometry(cfg, line, ceiling);
  const posOnLine = REF.positions.find((p) => p.lineId === line.id);
  ok(!!posOnLine, "a cleat exists on the first ceiling line");
  if (posOnLine) {
    const g = rafterCleatGeometry(cfg, posOnLine, ceiling);
    eq(run.webFaceAtM, g.webFaceAtM, "the continuous run and the typical detail share one flush interface plane", 1e-9);
    eq(run.tube.y0, g.tube.y0, "the continuous tube is on the same line as the detail tube", 1e-9);
    eq(run.tube.z0, g.tube.z0, "…and at the same level", 1e-9);
    eq(run.tube.x1 - run.tube.x0, line.lengthM, "the continuous tube spans the whole run", 1e-6);
    ok(!boxesOverlap(run.tube, run.purlin), "the continuous tube and purlin do not interpenetrate");
    ok(finite(nums(run.tube).concat(nums(run.purlin), nums(run.covering))), "no run solid contains NaN");
  }

  // a run along y rotates the whole assembly
  const yCtx = refCtx({ rafterLines: YS.map((y, i) => ({ id: `r${i}`, axis: "x" as const, atM: y, fromM: 0, toM: 12.2 })) });
  const yD = deriveRafterSupport(undefined, yCtx);
  ok(yD.levels.every((l) => l.runAxis === "y"), "rafters running along x put the purlin run along y");
  const yPos = yD.positions[0];
  if (yPos) {
    const g = rafterCleatGeometry(yD.config, yPos, yD.levels.find((l) => l.id === yPos.levelId)!);
    eq(Math.abs(g.seatNormal.x), 1, "a y-running assembly fans its tube across x");
    eq(g.seatNormal.y, 0, "…with no y component");
    eq((g.tube.x0 + g.tube.x1) / 2, yPos.xM, "the y-running tube centreline is still the module line", 1e-9);
  }
}

/* ================================================================== 10. slope geometry ========= */

{
  const gable = roofSlopePlanes(refCtx(), 0, 7.4);
  eq(gable.length, 2, "a gable roof has two slope planes");
  eq(gable[0].rakeLengthM, Math.hypot(3.7, 1.2), "the rake is the true sloping length, not the plan width", 1e-4);
  ok(gable[0].pitchDeg > 0, "a gable slope has a positive pitch");

  const mono = roofSlopePlanes(refCtx({ slope: { type: "mono", riseM: 1.2, overhangM: 0.3 } }), 0, 7.4);
  eq(mono.length, 1, "a mono roof has one slope plane");
  eq(mono[0].rakeLengthM, Math.hypot(7.4, 1.2), "the mono rake spans the full width", 1e-4);

  const flat = roofSlopePlanes(refCtx({ slope: { type: "flat", riseM: 0.3, overhangM: 0.3 } }), 0, 7.4);
  eq(flat.length, 1, "a flat roof has one plane");
  eq(flat[0].pitchDeg, 0, "a flat roof has zero pitch");
  eq(flat[0].rakeLengthM, 7.4, "a flat roof's rake is its plan width");
  eq(flat[0].fromZM, flat[0].toZM, "a flat roof is level end to end");

  for (const type of ["flat", "mono", "gable"] as const) {
    const d = deriveRafterSupport(undefined, refCtx({ slope: { type, riseM: 1.2, overhangM: 0.3 } }));
    ok(d.levels[1].lines.length > 0, `a ${type} roof still lays out tube lines`);
    ok(d.takeoff.roofPanels > 0, `a ${type} roof still takes off panels`);
    ok(d.levels[1].panelLayouts.every((p) => p.spanOk), `a ${type} roof's panel span is inside the limit`);
    ok(d.levels[1].lines.every((l) => Number.isFinite(l.seatZM)), `a ${type} roof's line levels are all finite`);
  }

  // roof lines are spaced along the RAKE, so the actual span never exceeds the configured spacing
  const roof = REF.levels[1];
  for (const pl of roof.panelLayouts) {
    ok(pl.spanMm <= roof.spacingMm + 1e-6, "the actual panel span never exceeds the configured tube spacing");
    ok(pl.spanMm > 0, "the actual panel span is positive");
  }
}

/* ================================================================== 11. validation rules ======= */

{
  // --- tube spacing does not divide the sheet
  const badSpacing = issueCodes({ ceilingSheet: { ...D.ceilingSheet, tubeSpacingMm: 1000 } });
  ok(badSpacing.includes("sheet-edge-unsupported"), "a spacing that does not divide the 2440 sheet is an ERROR");
  ok(badSpacing.includes("sheet-joint-off-tube"), "…and each sheet edge that misses a tube is reported individually");
  const badD = deriveRafterSupport({ ceilingSheet: { ...D.ceilingSheet, tubeSpacingMm: 1000 } } as Partial<RafterSupportConfig>, refCtx());
  ok(badD.errors.some((i) => i.code === "sheet-edge-unsupported"), "sheet-edge-unsupported is an error, not a warning");
  ok(badD.errors.some((i) => i.message.includes("1220")), "…and the message names the 1220 mm fix");
  ok(!issueCodes({}).includes("sheet-edge-unsupported"), "the shipped 1220 c/c raises no such error");

  // --- slope width not a whole multiple of the cover width
  const cutPanel = deriveRafterSupport(undefined, refCtx());
  ok(codesOf(cutPanel).includes("panel-cut-required"), "a 12.2 m slope width on a 1000 mm cover reports a cut panel");
  const cutMsg = cutPanel.issues.find((i) => i.code === "panel-cut-required")?.message ?? "";
  ok(cutMsg.includes("200 mm"), `the cut-panel message names the EXACT 200 mm residual (got: ${cutMsg})`);
  ok(cutPanel.warnings.some((i) => i.code === "panel-cut-required"), "a cut panel is a warning, not an error");
  const exact = deriveRafterSupport(undefined, refCtx({ body: { x0: 0, y0: 0, x1: 12.0, y1: 7.4 } }));
  ok(!codesOf(exact).includes("panel-cut-required"), "a whole-multiple slope width reports no cut panel");

  // --- panel span exceeded
  const wideSpan = issueCodes({ roofPanel: { ...D.roofPanel, tubeSpacingMm: 3000, maxSpanMm: 1800 } });
  ok(wideSpan.includes("panel-span-exceeded"), "a panel span beyond the limit is an error");

  // --- cleat plate thickness zero  ("a 100 × 50 × 0 mm member is never acceptable")
  const noT = deriveRafterSupport({ cleat: { ...D.cleat, thicknessMm: 0 } } as Partial<RafterSupportConfig>, refCtx());
  ok(noT.errors.some((i) => i.code === "cleat-no-thickness"), "a zero cleat thickness is an error");
  ok(issueCodes({ cleat: { ...D.cleat, lengthMm: 0 } }).includes("cleat-no-size"), "a zero cleat size is an error");

  // --- tube wall thickness / section missing
  ok(issueCodes({ tube: { ...D.tube, wallThicknessMm: 0 } }).includes("tube-no-thickness"),
    "a zero tube wall thickness is an error");
  ok(issueCodes({ tube: { ...D.tube, widthMm: 0 } }).includes("tube-section-missing"),
    "a missing tube section is an error");
  ok(issueCodes({ tube: { ...D.tube, widthMm: 4, wallThicknessMm: 2 } }).includes("tube-section-invalid"),
    "a tube whose walls meet in the middle is an error");
  ok(issueCodes({ tube: { ...D.tube, boltsPerConnection: 0 } }).includes("tube-not-bolted"),
    "a tube with no web bolts is an error");
  ok(issueCodes({ purlin: { ...D.purlin, thicknessMm: 0 } }).includes("purlin-no-thickness"),
    "a zero C-purlin thickness is an error");
  ok(issueCodes({ purlin: { ...D.purlin, depthMm: 0, flangeMm: 0 } }).includes("purlin-section-missing"),
    "an incomplete C-purlin section warns");

  // --- bolt too short
  ok(issueCodes({ bolt: { ...D.bolt, lengthMm: 20 } }).includes("bolt-too-short"),
    "a cleat bolt too short for cleat + rafter flange + nut + projection is an error");
  ok(issueCodes({ bolt: { ...D.bolt, webLengthMm: 40 } }).includes("web-bolt-too-short"),
    "a web bolt too short for the web + both tube walls + nut + projection is an error");
  ok(issueCodes({ bolt: { ...D.bolt, projectionMm: 0 } }).includes("no-bolt-projection"),
    "no thread projection warns — an inspector cannot confirm engagement");
  ok(issueCodes({ bolt: { ...D.bolt, washersPerBolt: 1 } }).includes("washer-count"),
    "one washer per bolt warns — the detail fits two");

  // --- bolt hole gives no clearance
  ok(issueCodes({ cleat: { ...D.cleat, boltHoleDiaMm: 12 } }).includes("hole-clearance"),
    "a hole the same size as the bolt gives no clearance");
  ok(issueCodes({ cleat: { ...D.cleat, boltHoleDiaMm: 10 } }).includes("hole-clearance"),
    "a hole smaller than the bolt is flagged too");

  // --- edge distance below 1.5 d
  ok(issueCodes({ cleat: { ...D.cleat, edgeDistanceMm: 10 } }).includes("bolt-edge-distance"),
    "an edge distance below 1.5 × d warns");
  ok(!issueCodes({ cleat: { ...D.cleat, edgeDistanceMm: 18 } }).includes("bolt-edge-distance"),
    "exactly 1.5 × d is acceptable");

  // --- C-purlin shallower than the tube
  const shallow = deriveRafterSupport({ purlin: { ...D.purlin, depthMm: 40 } } as Partial<RafterSupportConfig>, refCtx());
  ok(shallow.errors.some((i) => i.code === "purlin-shallower-than-tube"),
    "a C-purlin shallower than the tube is an error — the tube cannot sit flush");
  ok(!codesOf(REF).includes("purlin-shallower-than-tube"), "the shipped 100 mm web carries the 50 mm tube");

  // --- tube lifted clear of the web
  ok(issueCodes({ tube: { ...D.tube, faceOffsetMm: 60 } }).includes("tube-off-web"),
    "a face offset that lifts the tube clear of the web is an error");
  ok(issueCodes({ tube: { ...D.tube, faceOffsetMm: 40 } }).includes("web-bolt-edge-distance"),
    "an offset that leaves too little lap for the bolt warns");

  // --- cleat too narrow / bolts clashing
  ok(issueCodes({ cleat: { ...D.cleat, widthMm: 100 } }).includes("cleat-too-narrow"),
    "a cleat narrower than the members plus both bolt rows is an error");
  ok(issueCodes({ cleat: { ...D.cleat, holeGaugeMm: 40 } }).includes("bolt-clashes-member"),
    "a bolt gauge that puts a bolt under the purlin or the tube warns");
  ok(issueCodes({ cleat: { ...D.cleat, lengthMm: 60, holePitchMm: 90 } }).includes("cleat-too-short"),
    "a cleat too short for its bolt pitch warns");
  ok(issueCodes({ cleat: { ...D.cleat, holeCount: 2 } }).includes("hole-count-mismatch"),
    "a hole count that disagrees with the bolt count warns");

  // --- tube overhang beyond the outermost cleat
  const overhang = deriveRafterSupport(undefined, refCtx({
    body: { x0: -1.5, y0: 0, x1: 13.7, y1: 7.4 },
  }));
  ok(codesOf(overhang).includes("tube-overhang"), "a tube cantilevering past the outermost cleat warns");
  ok(!codesOf(REF).includes("tube-overhang"), "the reference build has no excessive cantilever");

  // --- covering overhang
  const bigEave = deriveRafterSupport(undefined, refCtx({ slope: { type: "gable", riseM: 1.2, overhangM: 1.0 } }));
  ok(codesOf(bigEave).includes("covering-overhang"), "a panel overhanging the eave past the limit warns");

  // --- no levels enabled while the system is on
  const noLevels = deriveRafterSupport(
    { levelsEdited: true, levels: autoLevels(refCtx()).map((l) => ({ ...l, enabled: false })) } as Partial<RafterSupportConfig>,
    refCtx(),
  );
  ok(noLevels.errors.some((i) => i.code === "no-levels"), "an enabled system with no enabled level is an error");
  eq(noLevels.takeoff.cleats, 0, "…and takes off nothing");

  // --- no rafter crosses the lines
  const noRafters = deriveRafterSupport(undefined, refCtx({ rafterLines: [] }));
  ok(noRafters.errors.some((i) => i.code === "level-no-cleats" || i.code === "no-cleats"),
    "tube lines with no rafter to bolt to is an error");

  // --- duplicate ids and duplicate positions
  const base: RafterSupportCleatPosition = {
    id: "dup", mark: "RS-01", levelId: "lvl-roof", levelKind: "roof", floorIndex: 1,
    lineIndex: 0, lineId: "L0", rafterId: "t1", gridRef: "A-1", offsetMm: 0,
    xM: 0, yM: 0, seatZM: 6, dir: 1, runAxis: "x", acrossM: 0, rakeM: 0, source: "manual",
  };
  const dupId = deriveRafterSupport(
    { layoutEdited: true, positions: [base, { ...base, xM: 3.05 }] } as Partial<RafterSupportConfig>,
    refCtx(),
  );
  ok(dupId.errors.some((i) => i.code === "duplicate-id"), "two cleats sharing an id is an error");
  const dupPos = deriveRafterSupport(
    { layoutEdited: true, positions: [base, { ...base, id: "other" }] } as Partial<RafterSupportConfig>,
    refCtx(),
  );
  ok(dupPos.errors.some((i) => i.code === "duplicate-position"), "two cleats at the same coordinate is an error");
  const dupLevel = deriveRafterSupport(
    {
      levelsEdited: true,
      levels: [
        { id: "same", kind: "roof", floorIndex: 1, label: "A", enabled: true },
        { id: "same", kind: "roof", floorIndex: 1, label: "B", enabled: true },
      ],
    } as Partial<RafterSupportConfig>,
    refCtx(),
  );
  ok(dupLevel.errors.some((i) => i.code === "duplicate-level-id"), "two levels sharing an id is an error");

  // --- an empty layout
  const empty = deriveRafterSupport({ layoutEdited: true, positions: [] } as Partial<RafterSupportConfig>, refCtx());
  ok(empty.errors.some((i) => i.code === "no-cleats"), "an enabled system with no cleats is an error");

  // --- the unit-weight override sanity check
  ok(issueCodes({ tube: { ...D.tube, unitWeightKgPerMOverride: 9 } }).includes("tube-unit-weight-drift"),
    "an override wildly out of step with the section warns");
  ok(!codesOf(REF).includes("tube-unit-weight-drift"), "the tabulated 2.95 kg/m override does NOT warn");

  // --- cross noggins switched off
  ok(issueCodes({ ceilingSheet: { ...D.ceilingSheet, crossNoggins: false } }).includes("sheet-cross-joint-unsupported"),
    "switching cross noggins off warns that board joints are unsupported");

  // every issue is well-formed
  const all = [...badD.issues, ...cutPanel.issues, ...shallow.issues, ...dupPos.issues];
  ok(all.every((i) => typeof i.code === "string" && i.code.length > 0), "every issue carries a code");
  ok(all.every((i) => i.level === "error" || i.level === "warning"), "every issue is an error or a warning");
  ok(all.every((i) => typeof i.message === "string" && i.message.length > 10), "every issue carries a real message");
  ok(all.every((i) => !/undefined|NaN|Infinity/.test(i.message)), "no issue message contains undefined / NaN / Infinity");
}

/* ================================================================== 12. determinism ============ */

{
  const a = deriveRafterSupport(undefined, refCtx());
  const b = deriveRafterSupport(undefined, refCtx());
  ok(JSON.stringify(a.positions) === JSON.stringify(b.positions), "cleat coordinates are deterministic across rebuilds");
  ok(JSON.stringify(a.takeoff) === JSON.stringify(b.takeoff), "the take-off is deterministic across rebuilds");
  ok(JSON.stringify(a.issues) === JSON.stringify(b.issues), "the issue list is deterministic across rebuilds");
  ok(JSON.stringify(a.levels) === JSON.stringify(b.levels), "the resolved levels are deterministic across rebuilds");

  // a JSON save / reload round-trip preserves everything
  const stored: RafterSupportConfig = {
    ...D,
    levelsEdited: true,
    levels: autoLevels(refCtx()),
    layoutEdited: true,
    positions: [
      { id: "m1", mark: "RS-01", levelId: "lvl-roof", levelKind: "roof", floorIndex: 1, lineIndex: 0, lineId: "L0", rafterId: "t1", gridRef: "A-1", offsetMm: 0, xM: 1.0, yM: 0.0, seatZM: 6.0, dir: 1, runAxis: "x", acrossM: 0.0, rakeM: 0, source: "manual" },
      { id: "m2", mark: "RS-02", levelId: "lvl-roof", levelKind: "roof", floorIndex: 1, lineIndex: 1, lineId: "L1", rafterId: "t2", gridRef: "B-1", offsetMm: 0, xM: 2.0, yM: 1.2, seatZM: 6.4, dir: 1, runAxis: "x", acrossM: 1.2, rakeM: 1.2, source: "manual" },
    ],
    notes: "round-trip",
  };
  const roundTripped = resolveRafterSupportConfig(JSON.parse(JSON.stringify(stored)) as RafterSupportConfig);
  const after = deriveRafterSupport(roundTripped, refCtx());
  eq(after.positions.length, 2, "manual cleats survive a save / reload round-trip");
  eq(after.positions[0].xM, 1.0, "manual cleat 1 keeps its exact coordinate");
  eq(after.positions[1].xM, 2.0, "manual cleat 2 keeps its exact coordinate");
  eq(after.positions[1].seatZM, 6.4, "manual cleat 2 keeps its exact seat level");
  ok(after.positions.every((p) => p.source === "manual"), "manual cleats stay marked as manual");
  ok(after.positions.every((p) => p.id === "m1" || p.id === "m2"), "manual cleat ids are stable — never regenerated");
  ok(after.config.notes === "round-trip", "the notes field survives the round-trip");
  eq(after.takeoff.cleats, 2, "the take-off follows the manual layout, not the auto one");
  eq(after.takeoff.cleatBolts, 8, "…and its bolt count follows too");

  // an edited layout is never silently overwritten
  ok(deriveRafterSupport({ ...roundTripped, ceilingSheet: { ...D.ceilingSheet, tubeSpacingMm: 610 } }, refCtx()).positions.length === 2,
    "an edited layout is not regenerated when the spacing changes");

  // a project saved before this feature existed loads cleanly
  const legacy = resolveRafterSupportConfig(undefined);
  ok(legacy.enabled, "a project saved before this feature existed defaults ON");
  eq(legacy.cleat.thicknessMm, 8, "…with the shipped cleat");
  eq(legacy.levels.length, 0, "…and an empty level list that the builder derives");
  eq(legacy.positions.length, 0, "…and an empty cleat list");

  // a PARTIAL saved config keeps its stored fields and fills the rest
  const partial = resolveRafterSupportConfig({ cleat: { ...D.cleat, thicknessMm: 12 } } as Partial<RafterSupportConfig>);
  eq(partial.cleat.thicknessMm, 12, "a partial saved config keeps its stored cleat thickness");
  eq(partial.cleat.widthMm, 200, "…and fills the fields it never stored");
  eq(partial.purlin.depthMm, 100, "…including whole specs it never stored at all");
  eq(partial.roofPanel.coverWidthMm, 1000, "…and the roof panel cover width");
  eq(partial.tube.boltsPerConnection, 2, "…and the tube's web bolt count");
  ok(partial.bolt.tighteningNote.length > 0, "…and the tightening note");

  // a config stored with a field that no longer exists does not blow up
  const junk = resolveRafterSupportConfig(JSON.parse('{"enabled":true,"legacyField":42}') as Partial<RafterSupportConfig>);
  ok(junk.enabled, "an unknown stored field does not break the resolver");
  eq(junk.cleat.widthMm, 200, "…and the defaults still come through");
}

/* ================================================================== 13. disabled =============== */

{
  const off = deriveRafterSupport({ enabled: false } as Partial<RafterSupportConfig>, refCtx());
  ok(!off.config.enabled, "an explicit OFF is honoured");
  eq(off.levels.length, 0, "a disabled system resolves no levels");
  eq(off.positions.length, 0, "a disabled system places no cleats");
  eq(off.issues.length, 0, "a disabled system raises no engineering issues");
  eq(off.errors.length, 0, "…and no errors");
  eq(off.warnings.length, 0, "…and no warnings");
  eq(off.takeoff.cleats, 0, "a disabled system takes off zero cleats");
  eq(off.takeoff.bolts, 0, "zero bolts");
  eq(off.takeoff.nuts, 0, "zero nuts");
  eq(off.takeoff.washers, 0, "zero washers");
  eq(off.takeoff.purlinPieces, 0, "zero C-purlin pieces");
  eq(off.takeoff.purlinRunningLengthM, 0, "zero C-purlin running length");
  eq(off.takeoff.tubePieces, 0, "zero MS tube pieces");
  eq(off.takeoff.tubeRunningLengthM, 0, "zero MS tube running length");
  eq(off.takeoff.ceilingSheets, 0, "zero ceiling boards");
  eq(off.takeoff.roofPanels, 0, "zero roof panels");
  eq(off.takeoff.screws, 0, "zero screws");
  eq(off.takeoff.totalSteelKg, 0, "zero total steel weight");
  eq(off.takeoff.levels.length, 0, "zero per-level take-off rows");
  ok(off.takeoff.enabled === false, "the take-off records that the system is off");
  // every QUANTITY is zero. The unit weights (kg per piece / per m / per m²) are properties of the
  // specification, not quantities, and deliberately stay populated so a disabled system still tells
  // the admin what the sections would weigh if they switched it back on.
  const quantityKeys = [
    "cleats", "cleatBolts", "webBolts", "bolts", "nuts", "washers",
    "purlinPieces", "purlinRunningLengthM", "tubePieces", "tubeRunningLengthM",
    "nogginPieces", "nogginRunningLengthM",
    "ceilingSheetsWhole", "ceilingSheetsCut", "ceilingSheets", "ceilingAreaSqm", "ceilingPurchasedAreaSqm",
    "roofPanelsWhole", "roofPanelsCut", "roofPanels", "roofPanelAreaSqm", "roofPanelPurchasedAreaSqm",
    "screws", "cleatKg", "boltKg", "nutKg", "washerKg", "purlinKg", "tubeKg", "nogginKg",
    "ceilingSheetKg", "roofPanelKg", "totalSteelKg", "webLapMm",
    "requiredCleatBoltLengthMm", "requiredWebBoltLengthMm",
  ] as const;
  for (const k of quantityKeys) {
    eq(off.takeoff[k], 0, `a disabled system takes off zero ${k}`);
  }
  const offNums = Object.values(off.takeoff).filter((v): v is number => typeof v === "number");
  ok(offNums.every((n) => Number.isFinite(n)), "a disabled take-off contains no NaN or Infinity");
}

/* ================================================================== 14. method statement ======= */

{
  for (const floors of [1, 2, 3] as const) {
    const ctx = refCtx({
      floors,
      floorCeilingZM: floors === 1 ? [6.0] : floors === 2 ? [3.15, 6.0] : [3.15, 6.0, 8.85],
      roofBaseZM: floors === 3 ? 8.85 : 6.0,
    });
    const d = deriveRafterSupport(undefined, ctx);
    const steps = rafterSupportMethodSteps(d);
    eq(steps.length, 15, `G+${floors - 1}: the method statement always has 15 steps`);
    ok(steps.every((s, i) => s.no === i + 1), `G+${floors - 1}: the steps are numbered 1…15 in order`);
    ok(steps.every((s) => s.title.length > 0 && s.detail.length > 0), `G+${floors - 1}: every step has a title and a detail`);
    ok(steps.every((s) => !/undefined|NaN|Infinity/.test(s.title + s.detail)),
      `G+${floors - 1}: no step text contains undefined / NaN / Infinity`);
    // the narration reads the take-off, never a hardcoded count
    ok(steps[2].title.includes(String(d.takeoff.cleats)), `G+${floors - 1}: step 3 narrates the ACTUAL cleat count`);
    ok(steps[3].detail.includes(String(d.takeoff.cleatBolts)), `G+${floors - 1}: step 4 narrates the ACTUAL bolt count`);
    ok(steps[9].detail.includes(String(d.takeoff.webBolts)), `G+${floors - 1}: step 10 narrates the ACTUAL web bolt count`);
    ok(steps[14].detail.includes(RAFTER_SUPPORT_APPROVAL_DISCLAIMER),
      `G+${floors - 1}: the final step carries the engineer-approval disclaimer`);
    if (floors === 1) {
      ok(steps[12].title.includes("not applicable"), "a G-only colony narrates no ceiling boarding step");
      ok(steps[13].detail.includes("PUF"), "…but still narrates the roof panels");
    } else {
      ok(steps[12].detail.includes(String(d.takeoff.ceilingSheetsWhole)),
        `G+${floors - 1}: the boarding step narrates the ACTUAL whole-board count`);
    }
  }

  // a changed spacing flows all the way into the narration
  const tight = deriveRafterSupport({ ceilingSheet: { ...D.ceilingSheet, tubeSpacingMm: 610 } } as Partial<RafterSupportConfig>, refCtx());
  ok(rafterSupportMethodSteps(tight)[1].detail.includes("610"), "step 2 narrates the configured spacing");
  ok(rafterSupportMethodSteps(REF)[1].detail.includes("1220"), "…and the default narrates 1220");

  ok(RAFTER_SUPPORT_DRAWING_NOTES.length >= 10, "the standing drawing notes are supplied");
  ok(RAFTER_SUPPORT_DRAWING_NOTES.every((n) => n.length > 10), "every drawing note is a real sentence");
  ok(RAFTER_SUPPORT_DRAWING_NOTES.some((n) => n.toLowerCase().includes("flush")),
    "the drawing notes state the flush web bearing");
  ok(RAFTER_SUPPORT_DRAWING_NOTES.some((n) => n.toLowerCase().includes("both walls")),
    "the drawing notes state the bolt must pass through both tube walls");
  ok(RAFTER_SUPPORT_EXPLANATION.includes("engineer"), "the standing explanation defers to the project engineer");
  ok(RAFTER_SUPPORT_APPROVAL_DISCLAIMER.includes("APPROVAL REQUIRED"), "the approval disclaimer is unambiguous");
  ok(rafterSupportAssemblyCallout(D).startsWith("Typical assembly RSA-01"), "the assembly callout is marked RSA-01");
  ok(rafterSupportAssemblyCallout(D, 4).includes("RSA-05"), "the assembly callout numbers from the index");
  ok(rafterSupportAssemblyCallout(D).includes(D.tube.designation), "the callout names the tube section");
  ok(rafterSupportAssemblyCallout(D).includes(D.purlin.designation), "the callout names the purlin section");
}

/* ================================================================== 15. cross-checks =========== */

{
  // the per-level take-off sums to the whole
  const sum = (pick: (l: (typeof REF.takeoff.levels)[number]) => number) =>
    REF.takeoff.levels.reduce((a, l) => a + pick(l), 0);
  eq(sum((l) => l.cleats), REF.takeoff.cleats, "per-level cleats sum to the total");
  eq(sum((l) => l.bolts), REF.takeoff.bolts, "per-level bolts sum to the total");
  eq(sum((l) => l.nuts), REF.takeoff.nuts, "per-level nuts sum to the total");
  eq(sum((l) => l.washers), REF.takeoff.washers, "per-level washers sum to the total");
  eq(sum((l) => l.purlinPieces), REF.takeoff.purlinPieces, "per-level purlin pieces sum to the total");
  eq(sum((l) => l.tubePieces), REF.takeoff.tubePieces, "per-level tube pieces sum to the total");
  eq(round3(sum((l) => l.purlinRunningLengthM)), REF.takeoff.purlinRunningLengthM,
    "per-level purlin running lengths sum to the total", 0.01);
  eq(sum((l) => l.sheets), REF.takeoff.ceilingSheets, "per-level boards sum to the total");
  eq(sum((l) => l.panels), REF.takeoff.roofPanels, "per-level panels sum to the total");

  // only ceiling levels carry boards, only roof levels carry panels
  ok(REF.takeoff.levels.filter((l) => l.kind === "roof").every((l) => l.sheets === 0),
    "a roof level never takes off ceiling boards");
  ok(REF.takeoff.levels.filter((l) => l.kind === "ceiling").every((l) => l.panels === 0),
    "a ceiling level never takes off roof panels");

  // the purlin cut length drives the piece count
  const shortStock = deriveRafterSupport({ purlin: { ...D.purlin, lengthMm: 3000 } } as Partial<RafterSupportConfig>, refCtx());
  ok(shortStock.takeoff.purlinPieces > REF.takeoff.purlinPieces, "a shorter stock length needs more purlin pieces");
  eq(shortStock.takeoff.purlinRunningLengthM, REF.takeoff.purlinRunningLengthM,
    "…but the running length is unchanged — the run is the run");
  eq(shortStock.takeoff.purlinKg, REF.takeoff.purlinKg, "…and so is the weight", 0.01);

  // a heavier section flows into the weights
  const heavy = deriveRafterSupport(
    { tube: { ...D.tube, materialKey: "rhs-100x50x3", designation: "RHS 100 × 50 × 3.0 mm", widthMm: 50, depthMm: 100, wallThicknessMm: 3, unitWeightKgPerMOverride: 6.71 },
      purlin: { ...D.purlin, materialKey: "c-purlin-150x65", designation: "C 150 × 65 × 20 × 2.5 mm", depthMm: 150, flangeMm: 65, lipMm: 20, thicknessMm: 2.5 },
      cleat: { ...D.cleat, widthMm: 230, holeGaugeMm: 170 },
      bolt: { ...D.bolt, webLengthMm: 120 } } as Partial<RafterSupportConfig>,
    refCtx(),
  );
  eq(heavy.takeoff.tubeKgPerM, 6.71, "the heavier tube takes off at the master's 6.71 kg/m");
  eq(heavy.takeoff.purlinKgPerM, 6.28, "the heavier purlin derives the master's 6.28 kg/m", 0.005);
  ok(heavy.takeoff.tubeKg > REF.takeoff.tubeKg, "a heavier tube raises the total tube weight");
  ok(heavy.takeoff.purlinKg > REF.takeoff.purlinKg, "a heavier purlin raises the total purlin weight");
  ok(heavy.takeoff.totalSteelKg > REF.takeoff.totalSteelKg, "…and the total steel weight");
  eq(heavy.errors.length, 0, `the heavier configuration is still buildable (got ${heavy.errors.map((e) => e.code).join(", ")})`);

  // a thicker board raises only the board weight
  const thickBoard = deriveRafterSupport(
    { ceilingSheet: { ...D.ceilingSheet, thicknessMm: 25, unitWeightKgPerSqm: 32.5 } } as Partial<RafterSupportConfig>,
    refCtx(),
  );
  ok(thickBoard.takeoff.ceilingSheetKg > REF.takeoff.ceilingSheetKg, "a heavier board raises the board weight");
  eq(thickBoard.takeoff.totalSteelKg, REF.takeoff.totalSteelKg, "…and never contaminates the STEEL weight", 0.01);
  eq(thickBoard.takeoff.ceilingSheets, REF.takeoff.ceilingSheets, "…and never changes the board count");
}

/* ------------------------------------------------------------------ helpers -------------------- */

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/* ------------------------------------------------------------------ report --------------------- */

console.log(`\ncolony-rafter-support.test.ts — ${passed} passed, ${failed} failed\n`);
if (failed) {
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log("  ✓ Rafter support system: module arithmetic, flush web bolting, geometry, validation, quantities and narration all agree\n");
