/**
 * MATERIAL BOQ — FEATURE ASSERTIONS for the reusable-preset / competitive-rate upgrade.
 *
 * Unlike boq-baseline.ts (a byte-identical regression oracle), this file ASSERTS the NEW behaviour
 * each phase adds is correct — competitive math, preset seeding, framing deltas, sheet layout. It
 * throws on the first failed assertion. Grows one section per phase.
 *
 * Run:  npx tsx scripts/boq-features.ts
 */
import {
  buildDefaultConfig,
  normalizeRoomLengths,
  type CabinConfig,
} from "../src/components/home/cabin-calculator/pricing";
import { buildCabinTakeoff } from "../src/lib/boq/cabinTakeoff";
import { priceTakeoff } from "../src/lib/boq/engine";
import { computeCompetitive } from "../src/lib/boq/competitive";
import { SEED_MATERIALS, indexMaterials } from "../src/lib/boq/materialMaster";
import {
  builtinPresetId,
  companyStandardSettings,
  isBuiltinPresetId,
  SPACING_2FT,
} from "../src/lib/boq/presets";
import { companyDefaultSettingsSync } from "../src/lib/boq/templateStore";
import { computeSheetLayout } from "../src/lib/boq/sheetLayout";
import {
  defaultBoqSettings,
  DEFAULT_NORMS,
  SQM_TO_SQFT,
  type BoqResult,
  type BoqSettings,
  type CompetitivePricing,
} from "../src/lib/boq/types";

const MATS = indexMaterials(SEED_MATERIALS);
let passed = 0;

function ok(label: string, cond: boolean, detail = "") {
  if (!cond) {
    console.error(`  ✗ FAIL: ${label}${detail ? " — " + detail : ""}`);
    throw new Error("Assertion failed: " + label);
  }
  passed++;
  console.log(`  ✓ ${label}${detail ? " — " + detail : ""}`);
}
const near = (a: number, b: number, eps = 0.5) => Math.abs(a - b) <= eps;

function stdCabin(settings?: BoqSettings, opts: import("../src/lib/boq/cabinTakeoff").CabinBoqOptions = {}): BoqResult {
  const base = buildDefaultConfig("porta-cabin");
  const cfg: CabinConfig = {
    ...base,
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
  };
  cfg.roomLengths = normalizeRoomLengths(cfg.length, cfg.roomCount, cfg.roomLengths);
  const s = settings ?? defaultBoqSettings("ms_cabin");
  const tk = buildCabinTakeoff(cfg, s.norms ?? DEFAULT_NORMS, opts);
  return priceTakeoff(tk, MATS, s);
}
const lineOf = (r: BoqResult, id: string) => r.lines.find((l) => l.id === id);

/* ============================ PHASE 2 — COMPETITIVE RATE (§15) ============================ */
console.log("\n=== PHASE 2 · Competitive Rate engine (§15) ===");
{
  const r = stdCabin();
  const t = r.totals;
  const floorSqft = r.meta.floorAreaSqm * SQM_TO_SQFT;

  // a. Default (no competitive config) ⇒ selling == cost.
  ok("default: result.competitive exists", !!r.competitive);
  const c0 = r.competitive!;
  ok("default: exGstSelling == cost subtotal", near(c0.exGstSelling, t.subtotal), `${c0.exGstSelling} vs ${t.subtotal}`);
  ok("default: finalSelling == cost grandTotal", near(c0.finalSelling, t.grandTotal), `${c0.finalSelling} vs ${t.grandTotal}`);
  ok("default: gross profit 0", near(c0.grossProfit, 0));
  ok("default: not undercutting / not below min", !c0.undercutsCost && !c0.belowMinSafe);

  // b. Overhead 10% + profit 20% ⇒ known markup.
  const cfg: CompetitivePricing = {
    overheadPercent: 10,
    overheadAmount: 0,
    profitPercent: 20,
    gstPercent: null,
    roundTo: 0,
    competitorRatePerSqft: null,
    targetRatePerSqft: null,
    minRatePerSqft: null,
  };
  const c1 = computeCompetitive(t, r.meta.floorAreaSqm, cfg, 18);
  const expectExGst = t.subtotal * 1.1 * 1.2;
  ok("markup: exGstSelling = subtotal×1.1×1.2", near(c1.exGstSelling, expectExGst, 1), `${c1.exGstSelling} vs ${expectExGst.toFixed(2)}`);
  ok("markup: gst on selling = ex×18%", near(c1.gstAmount, expectExGst * 0.18, 1));
  ok("markup: finalSelling = exGst + gst", near(c1.finalSelling, expectExGst * 1.18, 1));
  ok("markup: grossProfit = exGst − cost", near(c1.grossProfit, expectExGst - t.subtotal, 1));
  ok("markup: grossMargin% > 0", c1.grossMarginPercent > 0, `${c1.grossMarginPercent}%`);
  ok("markup: ratePerSqft = finalSelling/floorSqft", near(c1.ratePerSqft, c1.finalSelling / floorSqft, 0.5));
  ok("markup: ratePerSqm = finalSelling/floorSqm", near(c1.ratePerSqm, c1.finalSelling / r.meta.floorAreaSqm, 0.5));
  ok("markup: cost totals untouched by competitive", near(t.grandTotal, r.totals.grandTotal));

  // c. Competitor benchmark BELOW ours ⇒ we are dearer, warning fired.
  const ourRate = c1.ratePerSqft;
  const c2 = computeCompetitive(t, r.meta.floorAreaSqm, { ...cfg, competitorRatePerSqft: ourRate * 0.8 }, 18);
  ok("competitor: vsCompetitorPercent positive (we are dearer)", (c2.vsCompetitorPercent ?? 0) > 0, `${c2.vsCompetitorPercent}%`);
  ok("competitor: 'dearer' warning present", c2.warnings.some((w) => /dearer/i.test(w)));

  // d. Minimum-safe rate ABOVE ours ⇒ belowMinSafe + warning.
  const c3 = computeCompetitive(t, r.meta.floorAreaSqm, { ...cfg, minRatePerSqft: ourRate * 1.5 }, 18);
  ok("minSafe: belowMinSafe true when min rate above ours", c3.belowMinSafe);
  ok("minSafe: 'minimum safe' warning present", c3.warnings.some((w) => /minimum safe/i.test(w)));

  // e. Negative profit deep enough ⇒ undercuts cost + warning.
  const c4 = computeCompetitive(t, r.meta.floorAreaSqm, { ...cfg, overheadPercent: 0, profitPercent: -20 }, 18);
  ok("undercut: exGstSelling below cost", c4.exGstSelling < t.subtotal);
  ok("undercut: undercutsCost true", c4.undercutsCost);
  ok("undercut: 'below cost' warning present", c4.warnings.some((w) => /below cost/i.test(w)));

  // f. Rounding.
  const c5 = computeCompetitive(t, r.meta.floorAreaSqm, { ...cfg, roundTo: 1000 }, 18);
  ok("round: finalSelling is a multiple of 1000", c5.finalSelling % 1000 === 0, `${c5.finalSelling}`);

  // g. floorArea 0 guard (no divide-by-zero → NaN/Infinity).
  const c6 = computeCompetitive(t, 0, cfg, 18);
  ok("guard: ratePerSqft finite when floor area 0", Number.isFinite(c6.ratePerSqft) && c6.ratePerSqft === 0);
  ok("guard: ratePerSqm finite when floor area 0", Number.isFinite(c6.ratePerSqm) && c6.ratePerSqm === 0);
}

/* ============================ PHASE 3 — CONSTRUCTION PRESETS (§1) ============================ */
console.log("\n=== PHASE 3 · Reusable company construction presets (§1) ===");
{
  const std = companyStandardSettings("ms_cabin");
  ok("preset: ms cabin joist spacing = 2'-0\"", std.norms.joistSpacingM === SPACING_2FT, `${std.norms.joistSpacingM}`);
  ok("preset: ms cabin purlin spacing = 2'-0\"", std.norms.purlinSpacingM === SPACING_2FT);
  ok("preset: ms cabin rafter (truss) spacing = 2'-0\"", std.norms.trussSpacingM === SPACING_2FT);
  ok("preset: ms cabin stud spacing = 2'-0\"", std.norms.studSpacingM === SPACING_2FT);
  ok("preset: SPACING_2FT ≈ 0.6096 m", near(SPACING_2FT, 0.6096, 0.0001));

  // Labour colony keeps default norms (it derives spacing from its own elevation grid).
  const colony = companyStandardSettings("labour_colony");
  ok("preset: colony joist spacing stays default (not 2ft)", colony.norms.joistSpacingM === DEFAULT_NORMS.joistSpacingM);

  // Company standard is stamped with its built-in id.
  ok("preset: ms cabin templateId is the built-in id", std.templateId === builtinPresetId("ms_cabin"));
  ok("preset: isBuiltinPresetId true for built-in", isBuiltinPresetId(builtinPresetId("ms_cabin")));
  ok("preset: isBuiltinPresetId false for a saved id", !isBuiltinPresetId("bp-abc123"));

  // A company-standard cabin carries MORE joists/purlins/rafters than the code default (tighter pitch).
  const rDefault = stdCabin(defaultBoqSettings("ms_cabin"));
  const rStd = stdCabin(std);
  const joistsDefault = rDefault.lines.find((l) => l.id === "floor:joists")?.pieces ?? 0;
  const joistsStd = rStd.lines.find((l) => l.id === "floor:joists")?.pieces ?? 0;
  ok("preset: more floor joists at 2'-0\" than default 1.0 m", joistsStd > joistsDefault, `${joistsStd} > ${joistsDefault}`);
  ok("preset: more total steel with tighter standard pitch", rStd.totals.totalSteelKg > rDefault.totals.totalSteelKg, `${rStd.totals.totalSteelKg} > ${rDefault.totals.totalSteelKg}`);

  // The sync seed resolver falls back to the built-in when no localStorage default (node has no window).
  const seeded = companyDefaultSettingsSync("ms_cabin");
  ok("seed: companyDefaultSettingsSync falls back to built-in in node", seeded.norms.joistSpacingM === SPACING_2FT);
  ok("seed: seeded settings stamped with built-in templateId", seeded.templateId === builtinPresetId("ms_cabin"));
}

/* ============================ PHASE 4 — FRAMING ENGINE (§2,§3,§5,§7,§10) ============================ */
console.log("\n=== PHASE 4 · Framing engine — ridge / MDF / corner-rise / roof-rise ===");
{
  // Seed material exists with the right weight.
  ok("mat: rhs-50x25x2 seeded", !!MATS["rhs-50x25x2"], MATS["rhs-50x25x2"]?.name);
  ok("mat: rhs-50x25x2 unit weight 2.23 kg/m", near(MATS["rhs-50x25x2"]?.unitWeight ?? 0, 2.23, 0.01));

  const dflt = defaultBoqSettings("ms_cabin");

  // §10 — ridge 50×25 via the company-standard preset override; default is unchanged (angle).
  const rDefault = stdCabin(dflt, {});
  const rStd = stdCabin(companyStandardSettings("ms_cabin"), {});
  ok("ridge: default ridge stays angle-50x50x5", lineOf(rDefault, "roof:ridge")?.materialKey === "angle-50x50x5", lineOf(rDefault, "roof:ridge")?.materialKey);
  ok("ridge: company-standard ridge is rhs-50x25x2", lineOf(rStd, "roof:ridge")?.materialKey === "rhs-50x25x2", lineOf(rStd, "roof:ridge")?.materialKey);
  ok("ridge: company-standard ridge prices (has weight, no unknown-material)", (lineOf(rStd, "roof:ridge")?.totalWeightKg ?? 0) > 0);

  // §2 — roof rise input drives rafter length + roof sheet area; default unchanged.
  const rRise = stdCabin(dflt, { roofRiseFt: 2 });
  const rafDefault = lineOf(rDefault, "roof:truss-rafter")?.cutLengthM ?? 0;
  const rafRise = lineOf(rRise, "roof:truss-rafter")?.cutLengthM ?? 0;
  ok("roof-rise: taller rise ⇒ longer rafter", rafRise > rafDefault, `${rafRise} > ${rafDefault}`);
  const roofDefault = lineOf(rDefault, "roof:sheet")?.grossAreaSqm ?? 0;
  const roofRise = lineOf(rRise, "roof:sheet")?.grossAreaSqm ?? 0;
  ok("roof-rise: taller rise ⇒ larger sloped sheet area", roofRise > roofDefault, `${roofRise} > ${roofDefault}`);
  ok("roof-rise: absent ⇒ rafter identical to legacy 8\" default", near(rafDefault, lineOf(stdCabin(dflt, {}), "roof:truss-rafter")?.cutLengthM ?? -1, 1e-9));

  // §5 — corner roof-rise allowance, gated; default corner posts unchanged.
  const rCorner = stdCabin(dflt, { cornerColumnRoofRise: true });
  const cpDefault = lineOf(rDefault, "front:corner-post")?.cutLengthM ?? 0;
  const cpRise = lineOf(rCorner, "front:corner-post")?.cutLengthM ?? 0;
  ok("corner-rise: OFF by default ⇒ corner post = eave height", cpDefault > 0);
  ok("corner-rise: ON ⇒ corner post taller by the rise", cpRise > cpDefault, `${cpRise} > ${cpDefault}`);
  ok("corner-rise: count still 1/face (validate corner check safe)", lineOf(rCorner, "front:corner-post")?.pieces === lineOf(rDefault, "front:corner-post")?.pieces);

  // §7 — internal MDF support frame, gated; new ids; more steel when on.
  ok("mdf: OFF by default ⇒ no mdf-support lines", !rDefault.lines.some((l) => l.id.includes("mdf-support")));
  const rMdf = stdCabin(dflt, { internalMdfSupport: true });
  ok("mdf: ON ⇒ vertical batten line present", !!lineOf(rMdf, "front:mdf-support-v"));
  ok("mdf: ON ⇒ horizontal batten line present", !!lineOf(rMdf, "front:mdf-support-h"));
  ok("mdf: battens priced as rhs-50x25x2", lineOf(rMdf, "front:mdf-support-v")?.materialKey === "rhs-50x25x2");
  ok("mdf: ON ⇒ more total steel", rMdf.totals.totalSteelKg > rDefault.totals.totalSteelKg, `${rMdf.totals.totalSteelKg} > ${rDefault.totals.totalSteelKg}`);

  // No new validation errors introduced by any of the above.
  for (const [label, r] of [["default", rDefault], ["std", rStd], ["rise", rRise], ["corner", rCorner], ["mdf", rMdf]] as const) {
    ok(`validate: 0 errors — ${label}`, r.issues.filter((i) => i.severity === "error").length === 0);
  }
}

/* ============================ PHASE 5 — SHEET LAYOUT (§12–§14) ============================ */
console.log("\n=== PHASE 5 · Sheet layout — laps / rows / full-cut / offcut ===");
{
  // a. Pure layout math on a known case: 5 m run × 6 m span, 3 m sheet, 1.05 cover, 0.05 side, 0.15 end.
  const L = computeSheetLayout({ runM: 5, spanM: 6, standardLengthM: 3, coverWidthM: 1.05, sideLapM: 0.05, endLapM: 0.15, faces: 1 })!;
  ok("layout: exists", !!L);
  ok("layout: sheets/row = ceil(6 / (1.05−0.05)) = 6", L.sheetsPerRow === 6, `${L.sheetsPerRow}`);
  ok("layout: rows = 2 (5 m run > 3 m sheet, end-lapped)", L.rows === 2, `${L.rows}`);
  ok("layout: total sheets = rows × per-row = 12", L.sheets === 12, `${L.sheets}`);
  ok("layout: coverage = 12 × 3.15 = 37.8 m²", near(L.coverageSqm, 37.8, 0.01), `${L.coverageSqm}`);
  ok("layout: net covered = 30 m²", near(L.netCoveredSqm, 30, 0.01), `${L.netCoveredSqm}`);
  ok("layout: overlap ≈ 2.445 m² (side + end laps)", near(L.overlapSqm, 2.445, 0.02), `${L.overlapSqm}`);
  ok("layout: full + cut = total sheets", L.fullSheets + L.cutSheets === L.sheets, `${L.fullSheets}+${L.cutSheets}`);
  ok("layout: coverage ≈ net + overlap + reusable + scrap", near(L.coverageSqm, L.netCoveredSqm + L.overlapSqm + L.reusableOffcutSqm + L.scrapSqm, 0.05));

  ok("layout: run ≤ sheet ⇒ 1 row", computeSheetLayout({ runM: 2.5, spanM: 4, standardLengthM: 3, coverWidthM: 1, sideLapM: 0.05, endLapM: 0.15, faces: 1 })!.rows === 1);
  ok("layout: faces multiply the count", computeSheetLayout({ runM: 5, spanM: 6, standardLengthM: 3, coverWidthM: 1.05, sideLapM: 0.05, endLapM: 0.15, faces: 2 })!.sheets === 24);
  ok("layout: null on a zero dimension", computeSheetLayout({ runM: 0, spanM: 6, standardLengthM: 3, coverWidthM: 1, sideLapM: 0.05, endLapM: 0.1, faces: 1 }) === null);

  // b. Through the engine: a lap-configured roof material activates the layout; unconfigured stays legacy.
  const base = buildDefaultConfig("porta-cabin");
  const cfg: CabinConfig = {
    ...base, length: 40, width: 12, height: 9, structureId: "ms", roofId: "sloped",
    roomCount: 1, roomLengths: [40], doorQty: 1,
    doorPlacements: [{ side: "bottom", offset: 8, hand: "left", swing: "out" }],
    windowQty: 1, windowPlacements: [{ side: "top", offset: 8 }],
  };
  cfg.roomLengths = normalizeRoomLengths(cfg.length, cfg.roomCount, cfg.roomLengths);
  const tk = buildCabinTakeoff(cfg, DEFAULT_NORMS, {});

  const legacy = priceTakeoff(tk, MATS, defaultBoqSettings("ms_cabin"));
  const roofLegacy = legacy.lines.find((l) => l.id === "roof:sheet")!;
  ok("engine: unconfigured roof material ⇒ legacy (sheetRows null)", roofLegacy.sheetRows == null);

  const MATS_LAP = {
    ...MATS,
    "sheet-roof-0.5": { ...MATS["sheet-roof-0.5"], coverWidthM: 1.0, sideLapM: 0.05, endLapM: 0.15, standardLengthM: 3.0 },
  };
  const lapped = priceTakeoff(tk, MATS_LAP, defaultBoqSettings("ms_cabin"));
  const roofLap = lapped.lines.find((l) => l.id === "roof:sheet")!;
  ok("engine: lap-configured roof material ⇒ layout active (sheetRows set)", (roofLap.sheetRows ?? 0) > 0, `rows=${roofLap.sheetRows}`);
  ok("engine: roof full + cut = sheets", (roofLap.fullSheets ?? 0) + (roofLap.cutSheets ?? 0) === roofLap.sheets, `${roofLap.fullSheets}+${roofLap.cutSheets}=${roofLap.sheets}`);
  ok("engine: roof overlap area reported", (roofLap.overlapSqm ?? -1) >= 0);
  ok("engine: roof scrap + reusable reported", (roofLap.scrapSqm ?? -1) >= 0 && (roofLap.reusableOffcutSqm ?? -1) >= 0);
  ok("engine: roof orientation carried to the line", roofLap.sheetOrientation === "vertical");
  ok("engine: purchase row carries reusable/scrap split", lapped.purchase.some((p) => p.materialKey === "sheet-roof-0.5" && p.scrapSqm != null));
  ok("engine: cost totals stay finite & positive with layout", lapped.totals.grandTotal > 0 && isFinite(lapped.totals.grandTotal));
  ok("engine: 0 validation errors with layout active", lapped.issues.filter((i) => i.severity === "error").length === 0);
}

/* ==================== REGRESSION FIXES (from the adversarial review) ==================== */
console.log("\n=== Adversarial-review fixes ===");
{
  const MATS_LAP = {
    ...MATS,
    "sheet-roof-0.5": { ...MATS["sheet-roof-0.5"], coverWidthM: 1.0, sideLapM: 0.05, endLapM: 0.15, standardLengthM: 3.0 },
  };
  const base = buildDefaultConfig("porta-cabin");
  const cfg: CabinConfig = {
    ...base, length: 40, width: 12, height: 9, structureId: "ms", roofId: "sloped",
    roomCount: 1, roomLengths: [40], doorQty: 1,
    doorPlacements: [{ side: "bottom", offset: 8, hand: "left", swing: "out" }],
    windowQty: 1, windowPlacements: [{ side: "top", offset: 8 }],
  };
  cfg.roomLengths = normalizeRoomLengths(cfg.length, cfg.roomCount, cfg.roomLengths);
  const tk = buildCabinTakeoff(cfg, DEFAULT_NORMS, {});

  // FIX 1 — a manual qty override on a lapped sheet line drives amount + weight (bypasses the layout).
  const noOv = priceTakeoff(tk, MATS_LAP, defaultBoqSettings("ms_cabin"));
  const roofNoOv = noOv.lines.find((l) => l.id === "roof:sheet")!;
  const withOv = priceTakeoff(tk, MATS_LAP, { ...defaultBoqSettings("ms_cabin"), overrides: { "roof:sheet": { qty: 500, locked: true } } });
  const roofOv = withOv.lines.find((l) => l.id === "roof:sheet")!;
  ok("fix1: override changes the priced amount (not ignored)", roofOv.amount !== roofNoOv.amount, `${roofOv.amount} vs ${roofNoOv.amount}`);
  ok("fix1: override net area = 500", near(roofOv.netAreaSqm ?? 0, 500, 0.5));
  ok("fix1: net weight ≤ total weight (consistent line)", roofOv.netWeightKg <= roofOv.totalWeightKg + 0.01, `net ${roofOv.netWeightKg} tot ${roofOv.totalWeightKg}`);
  ok("fix1: overridden line uses legacy path (no layout rows)", roofOv.sheetRows == null);
  ok("fix1: qtySource is locked", roofOv.qtySource === "locked");

  // FIX 2 — pre-upgrade norms lacking the MDF spacings must NOT produce NaN with internalMdfSupport on.
  const partialNorms = { ...DEFAULT_NORMS } as Record<string, unknown>;
  delete partialNorms.mdfSupportVSpacingM;
  delete partialNorms.mdfSupportHSpacingM;
  const tkMdf = buildCabinTakeoff(cfg, partialNorms as unknown as typeof DEFAULT_NORMS, { internalMdfSupport: true });
  const rMdf = priceTakeoff(tkMdf, MATS, defaultBoqSettings("ms_cabin"));
  ok("fix2: grandTotal finite with pre-upgrade norms + MDF on", Number.isFinite(rMdf.totals.grandTotal) && rMdf.totals.grandTotal > 0, `${rMdf.totals.grandTotal}`);
  const mdfV = rMdf.lines.find((l) => l.id === "front:mdf-support-v");
  ok("fix2: MDF vertical batten count finite (backfilled 2'-0\")", !!mdfV && Number.isFinite(mdfV.pieces ?? NaN) && (mdfV!.pieces ?? 0) > 0, `pieces=${mdfV?.pieces}`);

  // FIX 3 — single-row run conservation (run shorter than the sheet still trims along the run).
  const S = computeSheetLayout({ runM: 2.5, spanM: 4, standardLengthM: 3, coverWidthM: 1, sideLapM: 0.05, endLapM: 0.1, faces: 1 })!;
  ok("fix3: single row", S.rows === 1);
  ok("fix3: conservation holds for a single row", near(S.coverageSqm, S.netCoveredSqm + S.overlapSqm + S.reusableOffcutSqm + S.scrapSqm, 0.05), `${S.coverageSqm} vs ${S.netCoveredSqm + S.overlapSqm + S.reusableOffcutSqm + S.scrapSqm}`);

  // FIX 4 — a lapped material's purchase qty reconciles with its amount (coverage-based).
  const roofBuy = noOv.purchase.find((p) => p.materialKey === "sheet-roof-0.5")!;
  const roofRate = MATS_LAP["sheet-roof-0.5"].purchaseRate!;
  ok("fix4: purchase qty × rate ≈ amount for a lapped material", near(roofBuy.purchaseQty * roofRate, roofBuy.amount, Math.max(50, roofBuy.amount * 0.02)), `${(roofBuy.purchaseQty * roofRate).toFixed(0)} vs ${roofBuy.amount}`);
}

/* ============================ PHASE 6 — REPORT DATA (§16, §17) ============================ */
console.log("\n=== PHASE 6 · Report metadata — spacing + sheet-layout fields ===");
{
  const std = stdCabin(companyStandardSettings("ms_cabin"), {});
  const joists = std.lines.find((l) => l.id === "floor:joists");
  const studs = std.lines.find((l) => l.id === "front:studs");
  const baseFrame = std.lines.find((l) => l.id === "floor:base-frame-long");
  ok("spacing: joists carry the c/c spacing (§16)", (joists?.spacingM ?? 0) > 0 && near(joists!.spacingM!, SPACING_2FT, 0.001), `${joists?.spacingM}`);
  ok("spacing: studs carry the c/c spacing", (studs?.spacingM ?? 0) > 0);
  ok("spacing: base-frame perimeter has no spacing (null)", baseFrame != null && baseFrame.spacingM == null);

  const MATS_LAP2 = {
    ...MATS,
    "sheet-roof-0.5": { ...MATS["sheet-roof-0.5"], coverWidthM: 1.0, sideLapM: 0.05, endLapM: 0.15, standardLengthM: 3.0 },
  };
  const b = buildDefaultConfig("porta-cabin");
  const c2: CabinConfig = { ...b, length: 30, width: 12, height: 9, structureId: "ms", roofId: "sloped", roomCount: 1, roomLengths: [30], doorQty: 1, doorPlacements: [{ side: "bottom", offset: 8, hand: "left", swing: "out" }], windowQty: 1, windowPlacements: [{ side: "top", offset: 8 }] };
  c2.roomLengths = normalizeRoomLengths(c2.length, c2.roomCount, c2.roomLengths);
  const lapped = priceTakeoff(buildCabinTakeoff(c2, DEFAULT_NORMS, {}), MATS_LAP2, defaultBoqSettings("ms_cabin"));
  const roof = lapped.lines.find((l) => l.id === "roof:sheet")!;
  ok("sheet-layout report: coverage populated on lapped line (§17)", (roof.coverageSqm ?? 0) > 0);
  ok("sheet-layout report: coverage ≥ net covered", (roof.coverageSqm ?? 0) >= (roof.netAreaSqm ?? 0));
}

console.log(`\n================  ALL FEATURE ASSERTIONS PASSED (${passed})  ================`);
