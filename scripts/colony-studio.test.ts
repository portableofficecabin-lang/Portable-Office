/**
 * LABOUR COLONY ENGINEERING STUDIO — model determinism + engineering-invariant harness.
 *
 * Run with:  npx tsx scripts/colony-studio.test.ts
 *
 * Verifies the structural model the studio renders against the spec's own checklist WITHOUT a
 * browser: BOQ-driven counts, no floating members, no bolts outside plates, stable deterministic ids,
 * override / section-swap reflected, rate-change does NOT rebuild geometry. Pure Node (tsx) — the
 * same convention as scripts/boq-*.ts and the cabin assembly harness.
 */

import { calculateLabourColony, type LabourColonyConfig, type LabourColonyResult } from "../src/lib/quotation/labourColony";
import { buildConstructionPlan } from "../src/lib/quotation/labourColonyPlan";
import { calculateCivilWork, DEFAULT_CIVIL_CONFIG, type CivilContext, type CivilWorkResult } from "../src/lib/quotation/labourColonyCivil";
import { buildColonyModel } from "../src/features/labour-colony-studio/model/colonyModel";
import type { ColonyModel, ColonyPart, Vec3 } from "../src/features/labour-colony-studio/model/types";
import type { SectionDims } from "../src/features/labour-colony-studio/model/sectionDims";
import {
  buildPanelLockSequence, buildPanelSupportSpec, COMMON_PANEL_THICKNESSES_MM,
} from "../src/features/labour-colony-studio/model/panelSupport";
import {
  defaultPalette, groupsPresentIn, resolvePartColor, GROUP_OF_KIND,
} from "../src/features/labour-colony-studio/model/palette";
import { buildSpacingRecommendation } from "../src/features/labour-colony-studio/model/sheetLayout";
import { buildExplodedExplanation } from "../src/features/labour-colony-studio/viewer3d/explodedAnnotations";

let passed = 0;
let failed = 0;
const fails: string[] = [];
function ok(cond: boolean, msg: string): void {
  if (cond) passed++;
  else { failed++; fails.push(msg); }
}

const BASE_CONFIG: LabourColonyConfig = {
  projectName: "Harness Colony",
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

/* ---- every vertex of a part (metres) — for NaN + bounds + containment checks ---- */
function verts(p: ColonyPart): Vec3[] {
  const s = p.solid;
  if (s.kind === "box") return [s.min, s.max];
  if (s.kind === "prism") return s.poly.flatMap((pt) => [{ x: pt.x, y: pt.y, z: s.z0 }, { x: pt.x, y: pt.y, z: s.z1 }]);
  return s.pts;
}
function planBox(p: ColonyPart): { x0: number; y0: number; x1: number; y1: number } {
  const vs = verts(p);
  return {
    x0: Math.min(...vs.map((v) => v.x)), y0: Math.min(...vs.map((v) => v.y)),
    x1: Math.max(...vs.map((v) => v.x)), y1: Math.max(...vs.map((v) => v.y)),
  };
}
/** Y–Z extent of a part — truss bolts run along X, so plate containment is checked in this plane. */
function planBoxYZ(p: ColonyPart): { y0: number; z0: number; y1: number; z1: number } {
  const vs = verts(p);
  return {
    y0: Math.min(...vs.map((v) => v.y)), z0: Math.min(...vs.map((v) => v.z)),
    y1: Math.max(...vs.map((v) => v.y)), z1: Math.max(...vs.map((v) => v.z)),
  };
}
function centre(p: ColonyPart): { x: number; y: number; z: number } {
  const vs = verts(p);
  return {
    x: (Math.min(...vs.map((v) => v.x)) + Math.max(...vs.map((v) => v.x))) / 2,
    y: (Math.min(...vs.map((v) => v.y)) + Math.max(...vs.map((v) => v.y))) / 2,
    z: (Math.min(...vs.map((v) => v.z)) + Math.max(...vs.map((v) => v.z))) / 2,
  };
}

function runChecks(label: string, model: ColonyModel): void {
  const parts = model.parts;
  ok(parts.length > 50, `${label}: model has a substantial part count (${parts.length})`);

  // (A) no NaN / Infinity anywhere
  let bad = 0;
  for (const p of parts) for (const v of verts(p)) if (![v.x, v.y, v.z].every(Number.isFinite)) bad++;
  ok(bad === 0, `${label}: no NaN/Infinite coordinates (found ${bad})`);

  // (B) bounds finite + non-degenerate
  const b = model.bounds;
  ok([b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(Number.isFinite), `${label}: bounds finite`);
  ok(b.max.x - b.min.x > 1 && b.max.y - b.min.y > 1 && b.max.z - b.min.z > 1, `${label}: bounds non-degenerate`);

  // (C) stable, unique, deterministic ids (no random ids)
  const ids = parts.map((p) => p.id);
  ok(new Set(ids).size === ids.length, `${label}: all part ids unique (${ids.length})`);
  ok(ids.every((id) => /^[a-z0-9:_\-.]+$/i.test(id)), `${label}: ids are deterministic slugs (no spaces/random)`);
  ok(ids.every((id) => !/\b(0\.\d{6,}|1e-)/.test(id)), `${label}: ids carry no float noise`);

  // (D) every part well-formed
  ok(parts.every((p) => p.assemblyStep >= 1 && p.assemblyStep <= 24), `${label}: assembly steps in 1..24`);
  ok(parts.every((p) => p.viewMask.length > 0), `${label}: every part has a view mask`);
  ok(parts.every((p) => ["steel", "civil", "none"].includes(p.boqSource)), `${label}: every part has a BOQ source`);
  ok(parts.every((p) => Number.isFinite(p.explode.x + p.explode.y + p.explode.z)), `${label}: explode vectors finite`);

  // (E) no floating columns — every column sits over a footing at the same grid node
  const footings = parts.filter((p) => p.kind === "footing");
  const columns = parts.filter((p) => p.kind === "column");
  ok(columns.length > 0 && footings.length > 0, `${label}: has columns (${columns.length}) + footings (${footings.length})`);
  let floating = 0;
  for (const c of columns) {
    const cc = centre(c);
    const over = footings.some((f) => {
      const fb = planBox(f);
      return cc.x >= fb.x0 - 1e-3 && cc.x <= fb.x1 + 1e-3 && cc.y >= fb.y0 - 1e-3 && cc.y <= fb.y1 + 1e-3;
    });
    if (!over) floating++;
  }
  ok(floating === 0, `${label}: no floating columns (${floating} without a footing)`);

  // (F) column bases meet the plinth top (structural continuity)
  const plinthTop = model.meta.plinthM;
  const gfCols = columns.filter((c) => c.floor === 0);
  ok(gfCols.every((c) => Math.abs(Math.min(...verts(c).map((v) => v.z)) - plinthTop) < 1e-6), `${label}: ground columns start at plinth top`);

  // (G) no anchor bolt outside its base plate
  const plates = parts.filter((p) => p.kind === "base-plate");
  const anchors = parts.filter((p) => p.kind === "anchor-bolt");
  if (anchors.length) {
    let outside = 0;
    for (const a of anchors) {
      const ab = planBox(a);
      const inside = plates.some((pl) => {
        const pb = planBox(pl);
        return ab.x0 >= pb.x0 - 1e-6 && ab.x1 <= pb.x1 + 1e-6 && ab.y0 >= pb.y0 - 1e-6 && ab.y1 <= pb.y1 + 1e-6;
      });
      if (!inside) outside++;
    }
    ok(outside === 0, `${label}: no anchor bolt outside a base plate (${outside})`);
  }

  // (H) roof trusses land on top of the columns (no floating roof)
  const trusses = parts.filter((p) => p.kind === "rafter");
  const colTop = Math.max(...columns.map((c) => Math.max(...verts(c).map((v) => v.z))));
  if (trusses.length) {
    ok(trusses.every((t) => Math.min(...verts(t).map((v) => v.z)) >= colTop - 0.5), `${label}: roof steel sits on the columns`);
  }

  // (I) every connection-hardware part carries a connectionId (traceable detail)
  const conn = parts.filter((p) => ["base-plate", "anchor-bolt", "gusset", "splice-plate", "nut", "washer"].includes(p.kind));
  ok(conn.every((p) => !!p.connectionId || !!p.partMark), `${label}: connection hardware carries a connection/mark id`);
}

/* ================================================================= run ==================== */

const result = calculateLabourColony(BASE_CONFIG);
const civil: CivilWorkResult = calculateCivilWork({ ...DEFAULT_CIVIL_CONFIG, enabled: true }, civilCtxOf(result));
const columnGrid = null;

const model = buildColonyModel({ result, civil, columnGrid });
runChecks("G+1 (with civil)", model);

// determinism: same inputs → byte-identical id sequence + counts
const model2 = buildColonyModel({ result, civil, columnGrid });
ok(JSON.stringify(model.parts.map((p) => p.id)) === JSON.stringify(model2.parts.map((p) => p.id)), "determinism: identical id sequence on rebuild");
ok(model.parts.length === model2.parts.length, "determinism: identical part count on rebuild");

// (test #16) rate change never rebuilds geometry — the model takes no rate input, so a resolver that
// only affects pricing cannot change geometry. Building with a section resolver that returns null
// (i.e. "no override") must equal the plain build.
const modelNoOv = buildColonyModel({ result, civil, columnGrid }, { resolveSection: () => null, resolveQty: () => null });
ok(JSON.stringify(modelNoOv.parts.map((p) => p.id)) === JSON.stringify(model.parts.map((p) => p.id)), "rate/no-op resolvers do not change geometry");

// (test #15) section swap updates the rendered member size
const bigCol: SectionDims = { widthMm: 300, depthMm: 300, thicknessMm: 6 };
const modelBig = buildColonyModel({ result, civil, columnGrid }, {
  resolveSection: (id) => (id.includes("column") ? bigCol : null),
});
const cBase = model.parts.find((p) => p.kind === "column");
const cBig = modelBig.parts.find((p) => p.kind === "column");
if (cBase && cBig) {
  const w = (p: ColonyPart) => { const b = planBox(p); return b.x1 - b.x0; };
  ok(w(cBig) > w(cBase) + 0.05, `section swap enlarges the column (${w(cBase).toFixed(3)}→${w(cBig).toFixed(3)} m)`);
}

// (test #13) manual quantity override on a stud line updates the model count
const studsBase = model.parts.filter((p) => p.kind === "stud").length;
const modelStuds = buildColonyModel({ result, civil, columnGrid }, {
  resolveQty: (id) => (id.includes(":stud") ? 2 : null),
});
const studsOv = modelStuds.parts.filter((p) => p.kind === "stud").length;
ok(studsOv !== studsBase || studsBase === 0, `stud qty override changes the model count (${studsBase}→${studsOv})`);

// single-floor variant (no stairs, no upper floor) must still be valid
const single = calculateLabourColony({ ...BASE_CONFIG, floors: 1, capacity: 40 });
const civilS = calculateCivilWork({ ...DEFAULT_CIVIL_CONFIG, enabled: true }, civilCtxOf(single));
runChecks("Ground-floor only", buildColonyModel({ result: single, civil: civilS, columnGrid }));

// civil-absent variant must still build a full foundation from defaults
runChecks("No civil result", buildColonyModel({ result, civil: null, columnGrid }));

/* ============================================================================================
 * REGRESSION GUARDS for the defects the adversarial review confirmed and we fixed. Each of these
 * failed before the fix, so they stop the defect silently returning.
 * ========================================================================================== */

{
  const parts = model.parts;

  /* (R1) #2 — the take-off emits ONE line per distinct cut length (floor:base-beam:3000 AND :6000),
   * so a member must bind to the line matching ITS OWN run rather than the first prefix match, which
   * would orphan the siblings from the cutting list. Where the take-off prices NO member of that
   * length (a corridor bay narrower than any priced run), binding to the nearest line is correct —
   * but it must be SURFACED as a deterministic engineering warning, never silently absorbed. */
  const lenKeyed = parts.filter((p) => /^(floor:base-beam|floor:joist):\d+$/.test(p.boqLineId ?? ""));
  const runOf = (p: ColonyPart) => {
    const vs = verts(p);
    return Math.max(
      Math.max(...vs.map((v) => v.x)) - Math.min(...vs.map((v) => v.x)),
      Math.max(...vs.map((v) => v.y)) - Math.min(...vs.map((v) => v.y)),
    );
  };
  // every candidate cut length the take-off actually priced, per prefix
  const pricedLens = new Map<string, number[]>();
  for (const p of lenKeyed) {
    const prefix = p.boqLineId!.replace(/:\d+$/, "");
    const mm = Number(/:(\d+)$/.exec(p.boqLineId!)![1]);
    const arr = pricedLens.get(prefix) ?? [];
    if (!arr.includes(mm / 1000)) arr.push(mm / 1000);
    pricedLens.set(prefix, arr);
  }
  let notClosest = 0;
  let unpriced = 0;
  for (const p of lenKeyed) {
    const prefix = p.boqLineId!.replace(/:\d+$/, "");
    const bound = Number(/:(\d+)$/.exec(p.boqLineId!)![1]) / 1000;
    const run = runOf(p);
    const options = pricedLens.get(prefix) ?? [bound];
    const best = options.reduce((a, b) => (Math.abs(b - run) < Math.abs(a - run) ? b : a), options[0]);
    if (Math.abs(bound - best) > 1e-6) notClosest++;
    if (Math.abs(run - bound) > 0.5) unpriced++;
  }
  ok(notClosest === 0, `R1: every length-keyed member binds to the CLOSEST priced cut length (${notClosest}/${lenKeyed.length} mis-bound)`);
  const lenWarnings = model.warnings.filter((w) => w.code === "member-length-unpriced").length;
  ok(unpriced === 0 || lenWarnings > 0,
    `R1b: members with no priced cut length raise an engineering warning (${unpriced} such members, ${lenWarnings} warning(s))`);
  const distinctBeamLines = new Set(parts.filter((p) => p.kind === "base-beam" || p.kind === "floor-beam").map((p) => p.boqLineId));
  ok(distinctBeamLines.size >= 1, `R1c: beams reference ${distinctBeamLines.size} distinct priced line(s)`);

  // (R2) #5 — every window must lie IN a wall plane, not floating inboard of it.
  const skins = parts.filter((p) => p.kind === "ext-panel");
  const windows = parts.filter((p) => p.kind === "window");
  let floatingWin = 0;
  for (const w of windows) {
    const wb = planBox(w);
    const inWall = skins.some((sk) => {
      const sb = planBox(sk);
      const pad = 0.6; // skin + insulation + lining stack
      return wb.x0 >= sb.x0 - pad && wb.x1 <= sb.x1 + pad && wb.y0 >= sb.y0 - pad && wb.y1 <= sb.y1 + pad;
    });
    if (!inWall) floatingWin++;
  }
  ok(windows.length > 0, `R2: model has windows (${windows.length})`);
  ok(floatingWin === 0, `R2: no window floats outside a wall plane (${floatingWin} floating)`);

  // (R3) #8 — no partition may sit ON an external wall plane (duplicate wall / z-fighting).
  // A wall is a THIN slab: compare only the thin-axis position, and only when both are thin in the
  // SAME axis. (Comparing both extents would wrongly flag the spine wall, which legitimately shares
  // the front/rear skins' x-extent while lying on a different y plane.)
  const thinAxisOf = (b: { x0: number; y0: number; x1: number; y1: number }) =>
    (b.x1 - b.x0) <= (b.y1 - b.y0) ? "x" : "y";
  const thinPosOf = (b: { x0: number; y0: number; x1: number; y1: number }) =>
    thinAxisOf(b) === "x" ? (b.x0 + b.x1) / 2 : (b.y0 + b.y1) / 2;
  let dupPartitions = 0;
  for (const p of parts.filter((x) => x.kind === "partition")) {
    const pb = planBox(p);
    const onSkin = skins.some((sk) => {
      const sb = planBox(sk);
      return thinAxisOf(pb) === thinAxisOf(sb) && Math.abs(thinPosOf(pb) - thinPosOf(sb)) < 0.06;
    });
    if (onSkin) dupPartitions++;
  }
  ok(dupPartitions === 0, `R3: no partition sits on an external wall plane (${dupPartitions})`);

  // (R4) #9 — the lowest stair tread must sit a full riser ABOVE its departure floor, never on it.
  const treads = parts.filter((p) => p.kind === "stair-tread");
  if (treads.length) {
    const zs = treads.map((t) => Math.max(...verts(t).map((v) => v.z))).sort((a, b) => a - b);
    const ffl = model.meta.plinthM;
    ok(zs[0] > ffl + 0.05, `R4: lowest tread rises clear of the departure floor (${zs[0].toFixed(3)} > ${ffl.toFixed(3)})`);
    const gaps: number[] = [];
    for (let i = 1; i < zs.length; i++) if (zs[i] - zs[i - 1] > 1e-6) gaps.push(zs[i] - zs[i - 1]);
    if (gaps.length > 2) {
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const spread = Math.max(...gaps) - Math.min(...gaps);
      ok(spread < avg * 0.6, `R4b: tread rises are uniform (avg ${(avg * 1000).toFixed(0)} mm, spread ${(spread * 1000).toFixed(0)} mm)`);
    }
  }

  // (R5) #15 — no ceiling fitting may punch through the deck above.
  let embedded = 0;
  for (const p of parts.filter((x) => x.kind === "light" || x.kind === "fan")) {
    const f = p.floor ?? 0;
    const ceil = model.meta.plinthM + (f + 1) * model.meta.floorHM;
    if (Math.max(...verts(p).map((v) => v.z)) > ceil - 0.01) embedded++;
  }
  ok(embedded === 0, `R5: no light/fan embedded in the floor above (${embedded})`);
}

// (R6) #11 — a MONO (single-slope) roof has no ridge; a flat roof has none either.
for (const roofType of ["mono", "flat"] as const) {
  const cfgRoof: LabourColonyConfig = {
    ...BASE_CONFIG,
    floorPlan: { ...(BASE_CONFIG.floorPlan ?? {}), roof: { type: roofType, riseM: 0.7, overhangM: 0.3 } },
  } as LabourColonyConfig;
  const rr = calculateLabourColony(cfgRoof);
  const rc = calculateCivilWork({ ...DEFAULT_CIVIL_CONFIG, enabled: true }, civilCtxOf(rr));
  const rm = buildColonyModel({ result: rr, civil: rc, columnGrid: null });
  const ridges = rm.parts.filter((p) => p.kind === "ridge").length;
  ok(ridges === 0, `R6: ${roofType} roof emits no ridge member (${ridges})`);
  runChecks(`${roofType} roof`, rm);
}

/* ============================================================================================
 * TRUSS FABRICATION DETAILING — a ready shop-WELDED truss whose SITE joints are bolted through
 * paired side plates. These assert the engineering story the exploded view / assembly video tell.
 * ========================================================================================== */
{
  const parts = model.parts;
  const welds = parts.filter((p) => p.kind === "weld");
  const trussWelds = welds.filter((p) => (p.assemblyId ?? "").startsWith("truss:"));

  // (T1) every main truss joint is welded, with a COMPLETE weld specification
  ok(trussWelds.length > 0, `T1: truss panel points are welded (${trussWelds.length} weld beads)`);
  ok(trussWelds.every((w) => !!w.spec.weldSpec), "T1b: every weld carries a weld specification");
  ok(trussWelds.every((w) => (w.spec.weldLengthMm ?? 0) > 0), "T1c: every weld carries a weld length");
  ok(trussWelds.every((w) => /fillet/i.test(w.spec.weldSpec ?? "")), "T1d: welds declare their type (fillet)");
  // the truss is READY-FABRICATED: its welds are shop welds
  ok(trussWelds.every((w) => w.fabrication === "shop"), "T1e: truss welds are SHOP welds (truss arrives ready)");

  // (T2) connection plates come in PAIRS — one on each face of the truss plane
  const splice = parts.filter((p) => p.kind === "splice-plate" && (p.assemblyId ?? "").startsWith("truss:"));
  ok(splice.length > 0, `T2: truss connections use side plates (${splice.length})`);
  ok(splice.length % 2 === 0, `T2b: side plates are paired (${splice.length} is even)`);
  const byConn = new Map<string, ColonyPart[]>();
  for (const p of splice) {
    const k = p.connectionId ?? "";
    byConn.set(k, [...(byConn.get(k) ?? []), p]);
  }
  let notPaired = 0;
  let notOpposite = 0;
  for (const [, group] of byConn) {
    if (group.length !== 2) { notPaired++; continue; }
    // the two plates must sit on OPPOSITE sides of the truss plane (sandwiching the member)
    const cx = group.map((p) => (planBox(p).x0 + planBox(p).x1) / 2);
    const mid = (cx[0] + cx[1]) / 2;
    if (!((cx[0] - mid) * (cx[1] - mid) < 0)) notOpposite++;
  }
  ok(notPaired === 0, `T2c: every truss connection has exactly 2 side plates (${notPaired} bad)`);
  ok(notOpposite === 0, `T2d: paired plates sandwich the truss from both faces (${notOpposite} bad)`);
  // and they must explode in OPPOSITE directions so the sandwich visibly comes apart
  let sameDir = 0;
  for (const [, group] of byConn) {
    if (group.length === 2 && group[0].explode.x * group[1].explode.x >= 0) sameDir++;
  }
  ok(sameDir === 0, `T2e: paired plates explode in opposite directions (${sameDir} bad)`);

  // (T3) a proper nut-and-bolt system: exactly one nut AND one washer per PHYSICAL bolt.
  // Counted over the whole `bolt` kind (not a filtered subset), because that is how the bolt/nut/
  // washer schedules count — modelling a bolt head as its own `bolt` part would double the count
  // and make the shop's schedule print a false "nuts ≠ bolts — verify".
  const connIds = [...byConn.keys()];
  let badHw = 0;
  for (const cid of connIds) {
    const bolts = parts.filter((p) => p.connectionId === cid && p.kind === "bolt").length;
    const nuts = parts.filter((p) => p.connectionId === cid && p.kind === "nut").length;
    const washers = parts.filter((p) => p.connectionId === cid && p.kind === "washer").length;
    if (bolts === 0 || nuts !== bolts || washers !== bolts) badHw++;
  }
  ok(badHw === 0, `T3: every truss connection has 1 nut + 1 washer per bolt (${badHw} bad of ${connIds.length})`);

  // (T4) bolts must pass THROUGH their plates, never outside them
  let outside = 0;
  for (const cid of connIds) {
    const plate = byConn.get(cid)![0];
    const pb = planBoxYZ(plate);
    for (const b of parts.filter((p) => p.connectionId === cid && p.kind === "bolt" && p.id.endsWith(":shank"))) {
      const bb = planBoxYZ(b);
      if (bb.y0 < pb.y0 - 1e-6 || bb.y1 > pb.y1 + 1e-6 || bb.z0 < pb.z0 - 1e-6 || bb.z1 > pb.z1 + 1e-6) outside++;
    }
  }
  ok(outside === 0, `T4: no bolt sits outside its side plate (${outside})`);

  // (T5) bolted site joints carry the full fastener + hole spec the shop needs
  const boltParts = parts.filter((p) => p.kind === "bolt" && (p.assemblyId ?? "").startsWith("truss:"));
  ok(boltParts.every((b) => !!b.spec.boltSpec), "T5: every truss bolt declares its grade/diameter");
  ok(boltParts.every((b) => (b.spec.holeDiaMm ?? 0) > 0), "T5b: every truss bolt declares its hole diameter");
  ok(splice.every((p) => (p.spec.boltCount ?? 0) > 0 && !!p.spec.note), "T5c: side plates carry bolt count + gauge/pitch/edge");
  ok(splice.every((p) => p.fabrication === "site"), "T5d: bolted plate connections are SITE joints");

  /* (T6) SEQUENCING — connection hardware must never be installed before the member it joins.
   * `bolt`/`nut`/`washer`/`weld` default to the base-frame step and `splice-plate` to the column
   * step, so without an explicit per-part override the truss's welds and splice bolts would fly in
   * during step 6 — long before the truss itself exists at step 17. That reads as broken in both
   * the exploded view and the assembly video. */
  const trussMembers = parts.filter((p) => (p.assemblyId ?? "").startsWith("truss:")
    && (p.kind === "rafter" || p.kind === "truss-web"));
  const trussStep = Math.max(...trussMembers.map((p) => p.assemblyStep));
  const trussHw = parts.filter((p) => (p.assemblyId ?? "").startsWith("truss:")
    && ["weld", "splice-plate", "bolt", "nut", "washer"].includes(p.kind));
  const early = trussHw.filter((p) => p.assemblyStep < trussStep).length;
  ok(trussMembers.length > 0 && trussHw.length > 0, `T6: truss has members (${trussMembers.length}) + hardware (${trussHw.length})`);
  ok(early === 0, `T6b: no truss hardware is installed before the truss itself (${early} early, truss @ step ${trussStep})`);

  // the same class of bug at the column bases: nuts/washers must land with their base plate
  const baseHw = parts.filter((p) => (p.connectionId ?? "").startsWith("conn:base:"));
  const plateStep = baseHw.find((p) => p.kind === "base-plate")?.assemblyStep ?? 5;
  const earlyBase = baseHw.filter((p) => p.kind === "nut" || p.kind === "washer")
    .filter((p) => p.assemblyStep < plateStep).length;
  ok(earlyBase === 0, `T6c: base-plate nuts/washers install with their plate (${earlyBase} early)`);
}

/* ============ D. GROUND-FLOOR DECK: sheet setting-out, C-bend edge member, connections ======
 * The deck detailing exists to prove ONE engineering claim — that an 8'x4' sheet laid on this frame
 * bears on steel along every edge. These checks hold the claim to account: the layout arithmetic must
 * close, every sheet edge must land on a member, the bearing must be real, and the members that make
 * that true (the perimeter C-bend and the added bearers) must actually be in the model. */
console.log("\n=== Ground-floor deck: 8'x4' sheet setting-out + C-bend edge member ===");
{
  const parts = model.parts;
  const deck = model.deck;
  ok(!!deck, "D1: the model carries a flooring-sheet setting-out");

  if (deck) {
    /* ---- the layout arithmetic closes ---- */
    const laid = deck.sheets.reduce((a, s) => a + s.areaM2, 0);
    ok(Math.abs(laid - deck.deckAreaM2) < 0.5,
      `D1a: laid sheet area reconciles with the deck area (${laid.toFixed(2)} vs ${deck.deckAreaM2.toFixed(2)} m²)`);
    ok(deck.fullCount + deck.cutCount === deck.sheets.length,
      `D1b: every sheet is either full or cut (${deck.fullCount}+${deck.cutCount}=${deck.sheets.length})`);
    ok(deck.purchaseSheets >= deck.sheetsByAreaOnly,
      `D1c: the ordering quantity never drops below the pure-area floor (${deck.purchaseSheets} >= ${deck.sheetsByAreaOnly})`);
    ok(deck.purchaseSheets <= deck.sheetsIfNoReuse,
      `D1d: the ordering quantity never exceeds one sheet per laid position (${deck.purchaseSheets} <= ${deck.sheetsIfNoReuse})`);
    ok(deck.wastagePct >= 0 && deck.wastagePct < 100, `D1e: wastage is a sane percentage (${deck.wastagePct}%)`);
    ok(new Set(deck.sheets.map((s) => s.mark)).size === deck.sheets.length,
      "D1f: every sheet carries a unique laying-sequence mark");

    /* ---- THE headline claim: every sheet edge bears on steel ---- */
    ok(deck.unsupportedSheets === 0,
      `D2: every sheet edge lands on a member (${deck.unsupportedSheets} unsupported of ${deck.sheets.length})`);
    ok(deck.sheets.every((s) => s.supportedEdges === 4),
      "D2a: all four edges of every sheet are supported");
    ok(deck.edgeBearingMm > 0, `D2b: a real bearing width is reported (${deck.edgeBearingMm} mm)`);

    /* ---- a non-modular frame must be REPORTED, not silently accepted ---- */
    const spacingWarned = model.warnings.some((w) => w.code === "sheet-spacing-not-modular");
    ok(deck.spacing.modular || spacingWarned,
      "D3: a non-sheet-modular joist spacing raises a deterministic engineering warning");
    ok(deck.spacing.recommendedMm > 0 && deck.spacing.recommendedMm <= 1220,
      `D3a: a buildable modular spacing is recommended (${deck.spacing.recommendedMm} mm)`);
    ok(deck.checks.length >= 4 && deck.checks.every((c) => !!c.code && !!c.detail),
      `D3b: every engineering check carries a code and an explanation (${deck.checks.length} checks)`);

    /* ---- the bearers the layout demanded are really in the model ---- */
    const noggins = parts.filter((p) => p.kind === "noggin");
    ok(deck.bearers.length === 0 || noggins.length > 0,
      `D4: required sheet bearers are modelled (${deck.bearers.length} lines → ${noggins.length} members)`);
    ok(noggins.every((p) => !!p.spec.role && !!p.spec.loadPath),
      "D4a: every bearer explains its role and its load path");
  }

  /* ---- the perimeter C-bend: 4 edges x 3 folds, and the left one called out first ---- */
  const cbend = parts.filter((p) => p.kind === "c-channel" && p.id.includes(":c-bend:"));
  ok(cbend.length > 0, `D5: the deck has a perimeter C-bend edge member (${cbend.length} folds)`);
  ok(cbend.length % 3 === 0, `D5a: the C-bend is modelled as web + two flanges (${cbend.length} divisible by 3)`);
  const edges = new Set(cbend.map((p) => p.id.split(":c-bend:")[1]?.split(":")[0]));
  ok(edges.size === 4, `D5b: all four deck edges carry an edge member (${[...edges].sort().join(", ")})`);
  /* One C-bend per DECK, so a G+1 colony carries two left-edge members of three folds each. */
  const left = cbend.filter((p) => p.id.includes(":c-bend:left:"));
  ok(left.length > 0 && left.length % 3 === 0 && left.every((p) => p.partMark === "CB1"),
    `D5c: every deck's left-hand edge member is marked CB1, the datum the setting-out is measured from (${left.length} folds)`);
  ok(left.every((p) => /FIRST C-BEND/.test(p.spec.note ?? "")),
    "D5d: the first C-bend states why it is erected first");
  ok(cbend.every((p) => /edge support/i.test(p.spec.role ?? "") && /stiffen/i.test(p.spec.role ?? "")),
    "D5e: the C-bend declares all of its structural roles");
  ok(cbend.every((p) => /footing/i.test(p.spec.loadPath ?? "")),
    "D5f: the C-bend traces its load path all the way to the footing");

  /* ---- joist-end connections: shop-welded cleat, site-bolted joist ---- */
  const jointConns = parts.filter((p) => (p.connectionId ?? "").startsWith("joist:"));
  const cleats = jointConns.filter((p) => p.kind === "cleat");
  ok(cleats.length > 0, `D6: ground-floor joist ends are cleated (${cleats.length} cleats)`);
  ok(cleats.every((p) => p.fabrication === "shop"), "D6a: cleats are SHOP-fabricated");
  const jointBolts = jointConns.filter((p) => p.kind === "bolt");
  const jointNuts = jointConns.filter((p) => p.kind === "nut");
  const jointWashers = jointConns.filter((p) => p.kind === "washer");
  ok(jointBolts.length > 0, `D6b: joist ends are site-bolted (${jointBolts.length} bolts)`);
  ok(jointNuts.length === jointBolts.length && jointWashers.length === jointBolts.length,
    `D6c: one nut and one washer per joist-end bolt (${jointNuts.length}/${jointWashers.length} vs ${jointBolts.length})`);
  ok(jointBolts.every((p) => p.fabrication === "site"), "D6d: the joist-to-cleat joint is a SITE bolt");
  const cleatWelds = jointConns.filter((p) => p.kind === "weld");
  ok(cleatWelds.length > 0 && cleatWelds.every((p) => p.fabrication === "shop"),
    `D6e: the cleat-to-beam weld is a shop weld (${cleatWelds.length})`);

  /* ---- the numbered sheets are modelled and never claim a price ---- */
  const sheets = parts.filter((p) => p.kind === "floor-sheet");
  ok(sheets.length > 0, `D7: the deck sheets are modelled individually (${sheets.length})`);
  ok(sheets.every((p) => !!p.spec.sheetMark), "D7a: every modelled sheet carries its sequence mark");
  ok(sheets.every((p) => p.boqSource === "none"),
    "D7b: sheet set-out is engineering detail — it never claims to be a priced item");
  ok(sheets.every((p) => (p.spec.supportSpacingMm ?? 0) > 0),
    "D7c: every sheet records the support spacing carrying it");
}

/* ============ E. PUF PANEL SEATING — how the MS framework captures the panel ================ */
console.log("\n=== PUF panel seating (U-channel / C-channel / angle / framed pocket) ===");
{
  const parts = model.parts;
  const spec = model.panelSupport;
  ok(!!spec, "E1: the model carries a PUF panel seating specification");

  if (spec) {
    const t = model.parts.length ? spec.thicknessMm : 0;
    ok(spec.slotWidthMm > spec.thicknessMm,
      `E1a: the slot is wider than the panel so it enters without forcing (${spec.slotWidthMm} > ${t} mm)`);
    ok(spec.clearanceMm > 0 && spec.clearanceMm <= 5, `E1b: free play is a workable tolerance (${spec.clearanceMm} mm)`);
    ok(spec.minInsertionMm >= 20, `E1c: minimum insertion meets the floor of 20 mm (${spec.minInsertionMm} mm)`);
    ok(spec.seats.length === 4, `E1d: all four seating types are specified (${spec.seats.length})`);
    ok(spec.seats.every((s) => s.minInsertionMm >= 20 && s.legMm > s.minInsertionMm),
      "E1e: every seat's leg is longer than the insertion it must achieve");
    ok(spec.seats.every((s) => !!s.role && !!s.loadPath && !!s.sectionCall),
      "E1f: every seat states its section, its role and its load path");

    /* the thicker the panel, the more of it must sit inside the steel */
    const thin = buildPanelSupportSpec(30), thick = buildPanelSupportSpec(70);
    ok(thick.minInsertionMm >= thin.minInsertionMm,
      `E2: a thicker panel demands at least as much insertion (30 mm → ${thin.minInsertionMm}, 70 mm → ${thick.minInsertionMm})`);
    ok(thick.slotWidthMm > thin.slotWidthMm, "E2a: the slot tracks the panel thickness");
    ok(thick.seats[0].gaugeMm >= thin.seats[0].gaugeMm, "E2b: a heavier panel gets at least as heavy a section");

    /* every trade thickness produces a buildable detail — nothing is a lookup that can miss */
    for (const mm of COMMON_PANEL_THICKNESSES_MM) {
      const s2 = buildPanelSupportSpec(mm);
      ok(s2.slotWidthMm > mm && s2.minInsertionMm >= 20 && s2.seats.length === 4,
        `E3: ${mm} mm panel resolves to a complete seating detail (slot ${s2.slotWidthMm}, insert ${s2.minInsertionMm})`);
    }

    /* the lock sequence must never leave a panel held on fewer than two edges */
    const seq = buildPanelLockSequence(spec);
    ok(seq.length >= 6, `E4: the installation lock sequence is spelled out (${seq.length} steps)`);
    ok(seq.every((s, i) => s.step === i + 1), "E4a: the lock sequence is numbered in order");
    ok(seq.every((s) => !!s.action && !!s.restrainedEdges && !!s.check),
      "E4b: every lock step states the action, what it restrains and how it is checked");
    ok(/TWO edges/i.test(seq[2]?.restrainedEdges ?? ""),
      "E4c: the FIRST panel is restrained on two edges before the next one arrives");
    ok(/last/i.test(seq[6]?.title ?? "") || /head/i.test(seq[6]?.title ?? ""),
      "E4d: the head restraint is fixed last so the panel is never wedged vertically");
  }

  /* the seating sections are really in the model */
  for (const [kind, label] of [
    ["u-channel", "base track"], ["c-channel", "jamb / closing channel"],
    ["angle-support", "head restraint"], ["pocket-support", "framed pocket"],
  ] as const) {
    const found = parts.filter((p) => p.kind === kind);
    ok(found.length > 0, `E5: the ${label} (${kind}) is modelled (${found.length})`);
    ok(found.every((p) => (p.spec.slotWidthMm ?? 0) > 0 || kind === "c-channel"),
      `E5a: every ${kind} records the panel slot it forms`);
  }

  /* the seating framework must be complete BEFORE the first panel is offered up */
  const seatSteps = parts.filter((p) => ["u-channel", "angle-support", "pocket-support"].includes(p.kind))
    .map((p) => p.assemblyStep);
  const panelStep = Math.min(...parts.filter((p) => p.kind === "ext-panel").map((p) => p.assemblyStep));
  ok(seatSteps.length === 0 || Math.max(...seatSteps) <= panelStep,
    `E6: the panel seating framework is installed before the panels (seats @ ${Math.max(...seatSteps)} <= panels @ ${panelStep})`);
}

/* ============ F. COLOUR PALETTE — every part family must be reachable ======================= */
console.log("\n=== Component colour palette ===");
{
  const parts = model.parts;
  ok(parts.every((p) => !!GROUP_OF_KIND[p.kind]),
    "F1: every part kind in the model maps to a colour group (nothing is unreachable from the picker)");
  const def = defaultPalette();
  ok(Object.values(def).every((hex) => /^#[0-9a-f]{6}$/i.test(hex)),
    "F1a: every default colour is a literal 6-digit hex (export-safe, never oklch)");
  /* an override must actually reach the part, and a malformed one must be ignored rather than
   * handed to three.js */
  const sample = parts.find((p) => p.kind === "c-channel")!;
  ok(resolvePartColor(sample, { cChannel: "#123456" }) === "#123456",
    "F2: a palette override reaches the part");
  ok(resolvePartColor(sample, {}) === sample.colorHex,
    "F2a: no override leaves the model's own engineering colour");
  ok(resolvePartColor(sample, { cChannel: "not-a-colour" }) === sample.colorHex,
    "F2b: a malformed override is ignored rather than passed to the renderer");
  const groups = groupsPresentIn(parts);
  ok(groups.has("cChannel") && groups.has("floorSheet") && groups.has("pufPanel"),
    "F3: the new component families are offered by the picker");
}

/* ============ G. EXPLANATION LAYER + the spacing recommendation ============================
 * The exploded view is only useful if it says WHY. These checks hold the explanation to the same
 * standard as the geometry: every callout must anchor to a part that really exists, quote numbers
 * that come from the model rather than from prose, and never contradict the layout it describes. */
console.log("\n=== Exploded-view explanation layer + spacing recommendation ===");
{
  const x = buildExplodedExplanation(model);
  const ids = new Set(model.parts.map((p) => p.id));

  ok(x.annotations.length > 0, `G1: the exploded view carries explanation callouts (${x.annotations.length})`);
  ok(x.annotations.every((a) => ids.has(a.partId)),
    "G1a: every callout anchors to a part that exists in the model");
  ok(x.dimensions.every((d) => ids.has(d.fromPartId) && ids.has(d.toPartId)),
    "G1b: every dimension run anchors to parts that exist in the model");
  ok(new Set(x.annotations.map((a) => a.id)).size === x.annotations.length,
    "G1c: callout ids are unique");
  ok(x.annotations.every((a) => !!a.title && a.lines.length > 0),
    "G1d: every callout has a title and a body");
  ok([...x.annotations, ...x.dimensions].every((a) => /^#[0-9a-f]{6}$/i.test(a.accent)),
    "G1e: every accent is a literal hex — export-safe, never oklch");
  ok(x.annotations.every((a) => Number.isFinite(a.distR) && a.distR > 0
    && Number.isFinite(a.dir[0] + a.dir[1] + a.dir[2])),
    "G1f: every callout has a finite offset direction and distance");

  /* the C-bend callout must actually state all four of its roles */
  const cb = x.annotations.find((a) => a.id === "ann:c-bend:left");
  ok(!!cb, "G2: the first C-bend is explained in the exploded view");
  if (cb) {
    const body = cb.lines.join(" ");
    ok(/EDGE SUPPORT/i.test(body) && /PERIMETER/i.test(body)
      && /PANEL SEAT/i.test(body) && /STIFFENER/i.test(body),
      "G2a: the C-bend callout names all four of its structural roles");
    ok(/footing/i.test(body), "G2b: the C-bend callout traces the load path to the footing");
  }

  /* a non-modular spacing must be visible AS A WARNING on the dimension, not quietly normalised */
  const dim = x.dimensions.find((d) => d.id === "dim:joist-spacing");
  if (dim && model.deck) {
    ok(dim.text.includes(model.deck.spacing.actualMm.toFixed(0)),
      `G3: the spacing dimension quotes the REAL spacing (${dim.text})`);
    ok(model.deck.spacing.modular
      ? /modular/i.test(dim.note ?? "")
      : /NOT sheet-modular/i.test(dim.note ?? ""),
      "G3a: the dimension states whether the spacing is sheet-modular");
  }

  /* ---- the recommendation is advice, never an applied change ---- */
  if (model.deck) {
    const rec = buildSpacingRecommendation(model.deck);
    ok(Math.abs(rec.recommendedMm - 609.6) < 0.05,
      `G4: the company standard recommended for an 8'x4' sheet is 609.6 mm (${rec.recommendedMm})`);
    ok(rec.alreadyModular === model.deck.spacing.modular,
      "G4a: the recommendation agrees with the layout about whether the frame is modular");
    ok(rec.bearerLinesSaved === model.deck.bearersAvoidableBySpacing,
      "G4b: the bearer saving quoted matches the layout's own figure");
    ok(/RECOMMENDATION only/i.test(rec.detail) || rec.alreadyModular,
      "G4c: a non-modular frame is given advice, not a silent change");
    ok(rec.settingPath.includes("joistSpacingM"),
      "G4d: the recommendation says exactly where the admin changes it");
    /* the engine must NEVER have written the recommendation into the model it measured */
    ok(!model.deck.spacing.modular || model.deck.bearers.length === 0,
      "G4e: a modular frame needs no bearers — the two figures cannot disagree");
  }
}

/* ============ H. ORDERING FIGURES ARE PRESENTED AS FOUR DISTINCT NUMBERS ==================== */
console.log("\n=== Flooring ordering: placement / optimised / area-floor / recommended ===");
{
  const d = model.deck;
  if (d) {
    ok(d.sheetsIfNoReuse === d.sheets.length,
      `H1: physical placement count equals the sheets actually laid (${d.sheetsIfNoReuse})`);
    ok(d.sheetsByAreaOnly === Math.ceil(d.deckAreaM2 / d.sheetAreaM2 - 1e-9),
      `H2: the area-only theoretical minimum is deck area / sheet area (${d.sheetsByAreaOnly})`);
    ok(d.purchaseSheets >= d.sheetsByAreaOnly && d.purchaseSheets <= d.sheetsIfNoReuse,
      `H3: the recommended order sits between the theoretical floor and the no-reuse count `
      + `(${d.sheetsByAreaOnly} <= ${d.purchaseSheets} <= ${d.sheetsIfNoReuse})`);
    /* the wastage figure must describe the RECOMMENDED order, not one of the other two */
    const impliedPct = ((d.purchaseSheets * d.sheetAreaM2 - d.deckAreaM2) / d.deckAreaM2) * 100;
    ok(Math.abs(impliedPct - d.wastagePct) < 0.05,
      `H4: the wastage % is derived from the RECOMMENDED order quantity (${d.wastagePct}% vs ${impliedPct.toFixed(2)}%)`);
    ok(d.offcutAreaM2 >= d.reusableOffcutM2 && d.wasteAreaM2 >= 0,
      "H5: re-usable offcut never exceeds total offcut, and scrap is never negative");
  }
}

/* ================================================================= report ================= */
console.log(`\ncolony-studio.test.ts — ${passed} passed, ${failed} failed\n`);
if (failed) {
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
} else {
  console.log("  ✓ all colony-studio model invariants hold");
}
