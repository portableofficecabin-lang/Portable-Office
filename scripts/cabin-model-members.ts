/**
 * CABIN 3D MODEL — cross-stiffener + MDF-support member checks (single source of truth = the BOQ).
 *
 * Proves the 3D model's structural member COUNT comes straight from the priced BOQ (spacing, manual
 * override, lock), the cross-stiffeners sit between the longitudinal base members at base level over
 * the clear internal width (never duplicating the perimeter), and the MDF support battens render only
 * when the BOQ takes them off. No browser / WebGL — buildCabinModel is pure.
 *
 * Run:  npx tsx scripts/cabin-model-members.ts
 */
import {
  buildDefaultConfig,
  normalizeRoomLengths,
  type CabinConfig,
} from "../src/components/home/cabin-calculator/pricing";
import { buildCabinTakeoff, type CabinBoqOptions } from "../src/lib/boq/cabinTakeoff";
import { priceTakeoff } from "../src/lib/boq/engine";
import { SEED_MATERIALS, indexMaterials } from "../src/lib/boq/materialMaster";
import { defaultBoqSettings, DEFAULT_NORMS, type BoqSettings } from "../src/lib/boq/types";
import { companyStandardSettings } from "../src/lib/boq/presets";
import { buildCabinModel } from "../src/features/cabin-design/model/cabinModel";
import { cabinObstacles, cabinSizeMm } from "../src/features/cabin-design/furniture/tables/cabinObstacles";
import type { CabinPart } from "../src/features/cabin-design/model/types";
import { buildFloorSheetSchedule } from "../src/features/cabin-design/model/floorSheets";

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
const boxOf = (p: CabinPart) => (p.solid.kind === "box" ? p.solid : null);

function build(patch: Partial<CabinConfig>, settings: BoqSettings, opts: CabinBoqOptions = {}) {
  const base = buildDefaultConfig("porta-cabin");
  const cfg: CabinConfig = { ...base, ...patch, boq: settings, boqOptions: opts };
  cfg.roomLengths = normalizeRoomLengths(cfg.length, cfg.roomCount, cfg.roomLengths);
  const tk = buildCabinTakeoff(cfg, settings.norms ?? DEFAULT_NORMS, opts);
  const r = priceTakeoff(tk, MATS, settings);
  const resolveQty = (id: string) => r.lines.find((l) => l.id === id)?.pieces ?? null;
  const model = buildCabinModel(cfg, { resolveQty });
  return { cfg, r, model };
}
const STD = (): CabinConfig => ({
  length: 20, width: 10, height: 8.5, structureId: "ms", roofId: "sloped",
  roomCount: 1, roomLengths: [20],
  doorQty: 1, doorPlacements: [{ side: "bottom", offset: 8, hand: "left", swing: "out" }],
  windowQty: 1, windowPlacements: [{ side: "top", offset: 8 }],
} as CabinConfig);
const joists = (m: { parts: CabinPart[] }) => m.parts.filter((p) => p.kind === "joist");
const mdf = (m: { parts: CabinPart[] }) => m.parts.filter((p) => p.kind === "mdf-support");
const boqPieces = (r: { lines: { id: string; pieces: number | null }[] }, id: string) =>
  r.lines.find((l) => l.id === id)?.pieces ?? 0;

/* ================= 1. cross-stiffener count = priced BOQ = cutting list ================= */
console.log("\n=== Cross-stiffeners — count is the single BOQ source of truth ===");
{
  const { r, model } = build(STD(), defaultBoqSettings("ms_cabin"));
  const boqQty = boqPieces(r, "floor:joists");
  const cutQty = r.cuttingList.filter((c) => c.member.toLowerCase().includes("joist") || c.material)
    .filter((c) => r.lines.some((l) => l.id === "floor:joists" && l.materialKey === c.materialKey))
    .reduce((s, c) => s + c.qty, 0);
  ok("model joist count == BOQ floor:joists pieces", joists(model).length === boqQty, `${joists(model).length} vs ${boqQty}`);
  ok("BOQ pieces == cutting-list qty", cutQty === boqQty, `${cutQty} vs ${boqQty}`);
  ok("stable ids + boqLineId", joists(model).every((p, i) => p.id === `floor:joist:${i}` && p.boqLineId === "floor:joists"));
  ok("assembly step 2 (cross-stiffener stage)", joists(model).every((p) => p.assemblyStep === 2));
  ok("explode vector present", joists(model).every((p) => p.explode && (p.explode.x || p.explode.y || p.explode.z) !== 0));
}

/* ================= 2. geometry: between longitudinals, base level, clear width ================= */
console.log("\n=== Cross-stiffeners — geometry (between side members, base level, no perimeter dup) ===");
{
  const { cfg, model } = build(STD(), defaultBoqSettings("ms_cabin"));
  const { lengthMm: L, widthMm: W } = cabinSizeMm(cfg);
  const js = joists(model);
  ok("interior positions only — none at x=0 or x=L", js.every((p) => { const b = boxOf(p)!; const cx = (b.min.x + b.max.x) / 2; return cx > 1 && cx < L - 1; }));
  ok("spans the CLEAR internal width (inset from both longitudinals)", js.every((p) => { const b = boxOf(p)!; return b.min.y > 1 && b.max.y < W - 1; }));
  ok("sits at the base-frame level (below the floor, z < 0)", js.every((p) => boxOf(p)!.max.z <= 0));
  ok("thin along the length (a stiffener, not a slab)", js.every((p) => { const b = boxOf(p)!; return (b.max.x - b.min.x) < (b.max.y - b.min.y); }));
}

/* ================= 3. spacing change moves BOTH BOQ + 3D together ================= */
console.log("\n=== Spacing change updates BOQ qty AND 3D member count together ===");
{
  const wide = build(STD(), { ...defaultBoqSettings("ms_cabin"), norms: { ...DEFAULT_NORMS, joistSpacingM: 1.5 } });
  const tight = build(STD(), companyStandardSettings("ms_cabin")); // 2'-0" spacing
  ok("wider spacing → fewer stiffeners in BOTH", joists(wide.model).length < joists(tight.model).length, `${joists(wide.model).length} < ${joists(tight.model).length}`);
  ok("3D count == BOQ count (wide)", joists(wide.model).length === boqPieces(wide.r, "floor:joists"));
  ok("3D count == BOQ count (2'-0\")", joists(tight.model).length === boqPieces(tight.r, "floor:joists"));
}

/* ================= 4. manual override + lock reflect in 3D ================= */
console.log("\n=== Manual override + lock are reflected in the 3D model ===");
{
  const auto = build(STD(), defaultBoqSettings("ms_cabin"));
  const nAuto = joists(auto.model).length;
  const ov = build(STD(), { ...defaultBoqSettings("ms_cabin"), overrides: { "floor:joists": { qty: 15, locked: true } } });
  ok("override qty=15 → 15 stiffeners in 3D", joists(ov.model).length === 15, `${joists(ov.model).length}`);
  ok("override differs from auto", 15 !== nAuto, `auto was ${nAuto}`);
  // lock survives a dimension change: grow to 30 ft, the locked 15 must stay
  const ov30 = build({ ...STD(), length: 30, roomLengths: [30] }, { ...defaultBoqSettings("ms_cabin"), overrides: { "floor:joists": { qty: 15, locked: true } } });
  const auto30 = build({ ...STD(), length: 30, roomLengths: [30] }, defaultBoqSettings("ms_cabin"));
  ok("locked qty stays 15 after growing to 30 ft", joists(ov30.model).length === 15, `${joists(ov30.model).length}`);
  ok("auto would have changed at 30 ft (proves the lock held)", joists(auto30.model).length !== 15, `auto30=${joists(auto30.model).length}`);
}

/* ================= 5. section swap updates the visible 3D section ================= */
console.log("\n=== Section swap updates the visible 3D cross-section ===");
{
  const baseS = build(STD(), defaultBoqSettings("ms_cabin"));
  // swap the joist line to a much smaller section via materialMap on its emitted key
  const swap = build(STD(), { ...defaultBoqSettings("ms_cabin"), materialMap: { "rhs-100x50x3": "shs-40x40x2" } });
  const wBase = (() => { const b = boxOf(joists(baseS.model)[0])!; return b.max.x - b.min.x; })();
  const wSwap = (() => { const b = boxOf(joists(swap.model)[0])!; return b.max.x - b.min.x; })();
  ok("smaller section → thinner drawn stiffener", wSwap < wBase, `${wSwap.toFixed(1)}mm < ${wBase.toFixed(1)}mm`);
}

/* ================= 6. MDF support battens: follow the BOQ + never pass through openings ============ */
console.log("\n=== Internal MDF support battens follow the BOQ + are clipped around doors/windows ===");
{
  const off = build(STD(), defaultBoqSettings("ms_cabin"), {});
  ok("MDF off ⇒ no mdf-support parts", mdf(off.model).length === 0);

  const on = build(STD(), defaultBoqSettings("ms_cabin"), { internalMdfSupport: true });
  const { lengthMm: L, widthMm: W } = cabinSizeMm(on.cfg);
  const Htop = Math.max(6, on.cfg.height || 8) * 304.8;
  ok("MDF on ⇒ mdf-support parts present", mdf(on.model).length > 0, `${mdf(on.model).length} batten segments`);
  ok("battens are step-5 structure with a boqLineId", mdf(on.model).every((p) => p.assemblyStep === 5 && p.layer === "structure" && !!p.boqLineId));
  ok("battens sit inside the shell (not outside the perimeter)", mdf(on.model).every((p) => { const b = boxOf(p)!; return b.min.x >= -1 && b.min.y >= -1 && b.max.x <= L + 1 && b.max.y <= W + 1; }));

  // recompute the door/window openings the SAME way the model does, then prove NO batten box overlaps one.
  type Op = { face: string; aLo: number; aHi: number; zLo: number; zHi: number };
  const openings: Op[] = [];
  for (const ob of cabinObstacles(on.cfg)) {
    if (ob.kind !== "door" && ob.kind !== "window") continue;
    const xs = ob.poly.map((p) => p.x), ys = ob.poly.map((p) => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const dRear = y0, dFront = W - y1, dLeft = x0, dRight = L - x1, m = Math.min(dRear, dFront, dLeft, dRight);
    if (m > 250) continue;
    const zLo = ob.fromHeightMm ?? 0, zHi = ob.toHeightMm ?? Htop;
    if (m === dRear) openings.push({ face: "rear", aLo: x0, aHi: x1, zLo, zHi });
    else if (m === dFront) openings.push({ face: "front", aLo: x0, aHi: x1, zLo, zHi });
    else if (m === dLeft) openings.push({ face: "left", aLo: y0, aHi: y1, zLo, zHi });
    else openings.push({ face: "right", aLo: y0, aHi: y1, zLo, zHi });
  }
  ok("test found the door + window openings", openings.length === 2, `${openings.length}`);
  const ov1 = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 - 1 && b0 < a1 - 1; // strict, 1mm tol
  const faceOf = (p: CabinPart) => (p.boqLineId ?? "").split(":")[0];
  const crossing = mdf(on.model).filter((p) => {
    const b = boxOf(p)!, f = faceOf(p);
    const horiz = f === "front" || f === "rear";
    const [aLo, aHi] = horiz ? [b.min.x, b.max.x] : [b.min.y, b.max.y];
    return openings.some((o) => o.face === f && ov1(aLo, aHi, o.aLo, o.aHi) && ov1(b.min.z, b.max.z, o.zLo, o.zHi));
  });
  ok("NO batten passes through a door or window", crossing.length === 0, `${crossing.length} crossing`);

  // count-from-BOQ proof on an UNOBSTRUCTED wall (the test cabin has no opening on the left wall):
  const lineIds = (f: string) => new Set(mdf(on.model).filter((p) => faceOf(p) === f).map((p) => p.id.replace(/-\d+$/, "")));
  const leftBoq = boqPieces(on.r, "left:mdf-support-v") + boqPieces(on.r, "left:mdf-support-h");
  ok("left wall (no openings): distinct batten lines == BOQ pieces", lineIds("left").size === leftBoq, `${lineIds("left").size} vs ${leftBoq}`);
  const totalBoq = ["front", "rear", "left", "right"].reduce((s, f) => s + boqPieces(on.r, `${f}:mdf-support-v`) + boqPieces(on.r, `${f}:mdf-support-h`), 0);
  const totalLines = new Set(mdf(on.model).map((p) => p.id.replace(/-\d+$/, ""))).size;
  ok("total batten lines never exceed the BOQ count (clipping only removes, never invents)", totalLines <= totalBoq, `${totalLines} <= ${totalBoq}`);
}

/* ================= 7. ROOF TRUSS drawn as a fabricated unit, straight from the priced BOQ ========= */
console.log("\n=== Roof truss (rafters + bottom ties + purlins) follows the priced BOQ ===");
{
  const { r, model, cfg } = build(STD(), defaultBoqSettings("ms_cabin"));
  const { lengthMm: L, widthMm: W } = cabinSizeMm(cfg);
  const byLine = (id: string) => model.parts.filter((p) => p.boqLineId === id);
  const rafters = byLine("roof:truss-rafter"), ties = byLine("roof:truss-tie"), purlins = byLine("roof:purlins");

  ok("rafter count == BOQ pieces", rafters.length === boqPieces(r, "roof:truss-rafter"), `${rafters.length} vs ${boqPieces(r, "roof:truss-rafter")}`);
  ok("bottom-tie count == BOQ pieces", ties.length === boqPieces(r, "roof:truss-tie"), `${ties.length} vs ${boqPieces(r, "roof:truss-tie")}`);
  ok("purlin count == BOQ pieces", purlins.length === boqPieces(r, "roof:purlins"), `${purlins.length} vs ${boqPieces(r, "roof:purlins")}`);
  ok("2 rafters per truss (a complete triangulated unit)", rafters.length === ties.length * 2, `${rafters.length} = 2 × ${ties.length}`);

  // trusses run end-to-end: first flush at x=0, last flush at x=L, none outside the cabin
  const tieX = ties.map((p) => { const b = boxOf(p)!; return (b.min.x + b.max.x) / 2; }).sort((a, b) => a - b);
  ok("first truss flush with the rear end wall (x≈0)", Math.abs(tieX[0]) < 60, `x=${tieX[0].toFixed(0)}`);
  ok("last truss flush with the front end wall (x≈L)", Math.abs(tieX[tieX.length - 1] - L) < 60, `x=${tieX[tieX.length - 1].toFixed(0)} vs L=${L.toFixed(0)}`);
  ok("no truss outside the cabin length", tieX.every((x) => x >= -1 && x <= L + 1));
  ok("ties span the full clear width", ties.every((p) => { const b = boxOf(p)!; return b.min.y <= 1 && b.max.y >= W - 1; }));

  // rafter chord length must equal the length the BOQ priced (cut length), by construction
  const pricedRafterM = r.lines.find((l) => l.id === "roof:truss-rafter")?.cutLengthM ?? 0;
  const q = rafters[0].solid.kind === "quad" ? rafters[0].solid : null;
  ok("rafters are drawn as sloped members (quad)", !!q);
  const chordMm = q ? Math.hypot(q.pts[1].y - q.pts[0].y, q.pts[1].z - q.pts[0].z) : 0;
  ok("rafter chord length == priced cut length", Math.abs(chordMm / 1000 - pricedRafterM) < 0.02, `${(chordMm / 1000).toFixed(3)} m vs ${pricedRafterM} m`);
  ok("rafters rise from eave to ridge", !!q && q.pts[1].z > q.pts[0].z, q ? `${q.pts[0].z.toFixed(0)} → ${q.pts[1].z.toFixed(0)} mm` : "");
  ok("truss members are roof-layer, assembly step 11", [...rafters, ...ties, ...purlins].every((p) => p.assemblyStep === 11));
  ok("every truss member carries its BOQ line (click-through works)", [...rafters, ...ties, ...purlins].every((p) => !!p.boqLineId));

  // spacing drives BOTH the BOQ and the 3D count together
  const tight = build(STD(), { ...defaultBoqSettings("ms_cabin"), norms: { ...DEFAULT_NORMS, trussSpacingM: 0.6096 } });
  ok("tighter truss spacing ⇒ more trusses in BOTH BOQ and 3D",
    tight.model.parts.filter((p) => p.boqLineId === "roof:truss-tie").length === boqPieces(tight.r, "roof:truss-tie") &&
    tight.model.parts.filter((p) => p.boqLineId === "roof:truss-tie").length > ties.length,
    `${tight.model.parts.filter((p) => p.boqLineId === "roof:truss-tie").length} > ${ties.length}`);

  // a flat roof has no truss at all
  const flat = build({ ...STD(), roofId: "flat" }, defaultBoqSettings("ms_cabin"));
  ok("flat roof ⇒ no rafters/ties drawn", flat.model.parts.filter((p) => p.boqLineId === "roof:truss-rafter" || p.boqLineId === "roof:truss-tie").length === 0);
}

/* ================= 8. TRUSS CONNECTION DETAILING — shown, specified, and never priced ============ */
console.log("\n=== Truss connection detailing (plates both sides, bolts, welds) ===");
{
  const { r, model } = build(STD(), defaultBoqSettings("ms_cabin"));
  const nTruss = boqPieces(r, "roof:truss-tie");
  const plates = model.parts.filter((p) => p.kind === "gusset-plate");
  const fasteners = model.parts.filter((p) => p.kind === "fastener");
  const bolts = fasteners.filter((p) => p.id.includes(":truss-bolt:"));
  const welds = fasteners.filter((p) => p.id.includes(":truss-weld:"));

  ok("2 connection plates per bearing × 2 bearings per truss", plates.length === nTruss * 4, `${plates.length} vs ${nTruss * 4}`);
  ok("2 bolts per bearing × 2 bearings per truss", bolts.length === nTruss * 4, `${bolts.length} vs ${nTruss * 4}`);
  ok("3 fully-welded internal joints per truss (2 heels + apex)", welds.length === nTruss * 3, `${welds.length} vs ${nTruss * 3}`);

  // plates must sit on BOTH faces of the rafter web
  const near = plates.filter((p) => p.id.endsWith(":near")), far = plates.filter((p) => p.id.endsWith(":far"));
  ok("plates provided on BOTH sides of every bearing", near.length === far.length && near.length === nTruss * 2, `${near.length} near / ${far.length} far`);
  const pairNear = near.find((p) => p.id.includes(":0:rear:"))!, pairFar = far.find((p) => p.id.includes(":0:rear:"))!;
  ok("the two plates of a joint straddle the member", boxOf(pairNear)!.max.x <= boxOf(pairFar)!.min.x + 1, `near.maxX=${boxOf(pairNear)!.max.x.toFixed(0)} far.minX=${boxOf(pairFar)!.min.x.toFixed(0)}`);

  // full engineering specification is carried on every connection part
  ok("plates carry thickness + size", plates.every((p) => p.spec?.plateThkMm === 8 && !!p.spec?.plateSizeMm));
  ok("bolts carry spec, count, hole dia and torque", bolts.every((p) => /M12/.test(p.spec?.boltSpec ?? "") && p.spec?.holeDiaMm === 14 && p.spec?.boltCount === 2 && p.spec?.torqueNm === 80));
  ok("bolt label states the nut + washer + tightening arrangement", bolts.every((p) => /washer/i.test(p.spec?.note ?? "") && /tighten/i.test(p.spec?.note ?? "")));
  ok("welds carry weld type + leg size", welds.every((p) => /fillet/i.test(p.spec?.weldType ?? "") && p.spec?.weldSizeMm === 6));
  ok("every connection carries a connection id + part mark", [...plates, ...bolts, ...welds].every((p) => !!p.spec?.connectionId && !!p.spec?.partMark));

  // THE INVARIANT: detailing is presentation only — it must never join the priced BOQ
  ok("NO connection part carries a boqLineId (never priced)", [...plates, ...bolts, ...welds].every((p) => !p.boqLineId));
  ok("connection detailing is engineering-only (hidden in the customer view)", [...plates, ...bolts, ...welds].every((p) => !p.viewMask.includes("customer")));
  ok("connection detailing installs with the roof frame (step 11)", [...plates, ...bolts, ...welds].every((p) => p.assemblyStep === 11));

  const flat = build({ ...STD(), roofId: "flat" }, defaultBoqSettings("ms_cabin"));
  ok("flat roof ⇒ no truss connection detailing", flat.model.parts.filter((p) => p.kind === "gusset-plate").length === 0);
}

/* ================= 9. FLOORING 8 ft × 4 ft sheet schedule + per-sheet 3D tiles =================== */
console.log("\n=== Flooring sheet calculation (8 ft × 4 ft = 32 sq ft) ===");
{
  const { r, model, cfg } = build(STD(), defaultBoqSettings("ms_cabin"));
  const { lengthMm: L, widthMm: W } = cabinSizeMm(cfg);
  const boqSheets = r.lines.find((l) => l.id === "floor:board")?.sheets ?? null;
  const sch = buildFloorSheetSchedule(cfg, boqSheets, 1);

  ok("standard sheet is 8 ft × 4 ft = 32 sq ft", sch.sheetLengthFt === 8 && sch.sheetWidthFt === 4 && sch.sheetAreaSqft === 32);
  ok("total flooring area from the ACTUAL model dims (20 × 10 = 200 sq ft)", Math.abs(sch.totals.floorAreaSqft - 200) < 0.5, `${sch.totals.floorAreaSqft}`);
  ok("exact sheets = area ÷ 32 = 6.25", Math.abs(sch.totals.exactSheets - 6.25) < 0.02, `${sch.totals.exactSheets}`);
  ok("rounded UP to the next whole sheet = 7", sch.totals.roundedSheets === 7, `${sch.totals.roundedSheets}`);
  ok("rounding always goes UP (10.25 ⇒ 11 rule)", Math.ceil(10.25) === 11 && sch.totals.roundedSheets >= sch.totals.exactSheets);

  // cutting + placement layout
  ok("layout tiles the floor 3 × 3 = 9 sheets", sch.totals.layoutSheets === 9, `${sch.totals.layoutSheets}`);
  ok("4 full sheets + 5 cut sheets", sch.totals.fullSheets === 4 && sch.totals.cutSheets === 5, `${sch.totals.fullSheets} full / ${sch.totals.cutSheets} cut`);
  ok("used area == floor area", Math.abs(sch.totals.usedAreaSqft - 200) < 0.5);
  ok("balance / cutting waste reported", sch.totals.cuttingWasteSqft > 0 && Math.abs(sch.totals.cuttingWasteSqft - 88) < 1, `${sch.totals.cuttingWasteSqft} sq ft`);
  ok("wastage % reported", Math.abs(sch.totals.wastagePercent - 44) < 1, `${sch.totals.wastagePercent}%`);
  ok("grand total = the PRICED BOQ quantity (procurement truth)", sch.totals.grandTotalSheets === boqSheets, `${sch.totals.grandTotalSheets} vs BOQ ${boqSheets}`);

  // sheets tile the floor exactly: no overlap, full coverage, nothing outside
  ok("every sheet lies inside the floor", sch.rows.every((s0) => s0.x0 >= -1 && s0.y0 >= -1 && s0.x1 <= L + 1 && s0.y1 <= W + 1));
  const covered = sch.rows.reduce((a, s0) => a + (s0.x1 - s0.x0) * (s0.y1 - s0.y0), 0);
  ok("sheets cover the whole floor with no overlap", Math.abs(covered - L * W) < 1000, `${(covered / (L * W) * 100).toFixed(2)}%`);
  ok("each sheet has a mark, cut size and install order", sch.rows.every((s0) => !!s0.mark && s0.cutLengthMm > 0 && s0.cutWidthMm > 0 && s0.no > 0));
  ok("sheets are laid length-wise", sch.rows.every((s0) => s0.orientation === "length-wise"));

  // per-floor split: ground + first floor separately
  const g1 = buildFloorSheetSchedule(cfg, boqSheets, 2);
  ok("two storeys ⇒ ground + first floor listed separately", g1.perFloor.length === 2 && g1.perFloor[0].label === "Ground floor" && g1.perFloor[1].label === "First floor");
  ok("two storeys ⇒ double the area and double the sheets", Math.abs(g1.totals.floorAreaSqft - 400) < 1 && g1.totals.layoutSheets === 18, `${g1.totals.floorAreaSqft} sq ft / ${g1.totals.layoutSheets} sheets`);

  // room-wise split
  const multi = build({ ...STD(), roomCount: 2, roomLengths: [] }, defaultBoqSettings("ms_cabin"));
  const schR = buildFloorSheetSchedule(multi.cfg, null, 1);
  ok("room-wise split available", schR.perRoom.length >= 2, `${schR.perRoom.length} rooms`);

  // the 3D model draws one tile per sheet
  const tiles = model.parts.filter((p) => p.id.startsWith("floor:board:sheet:"));
  ok("3D draws one tile per layout sheet", tiles.length === sch.totals.layoutSheets, `${tiles.length} vs ${sch.totals.layoutSheets}`);
  ok("tiles join the priced floor board line (click-through)", tiles.every((p) => p.boqLineId === "floor:board"));
  ok("tiles carry the sheet mark + cut size", tiles.every((p) => !!p.spec?.partMark && (p.spec?.lengthMm ?? 0) > 0));
  ok("tiles install at step 3 (floor decking)", tiles.every((p) => p.assemblyStep === 3));
  ok("tiles get a per-sheet explode stagger", new Set(tiles.map((p) => p.explode.z)).size === tiles.length);
  ok("the whole-slab floor:board part is preserved", model.parts.some((p) => p.id === "floor:board"));
}

console.log(`\n================  ALL 3D-MEMBER CHECKS PASSED (${passed})  ================`);
