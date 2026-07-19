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

console.log(`\n================  ALL 3D-MEMBER CHECKS PASSED (${passed})  ================`);
