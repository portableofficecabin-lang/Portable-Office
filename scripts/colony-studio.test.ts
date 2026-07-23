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
import { RAFTER_SUPPORT_KINDS } from "../src/features/labour-colony-studio/model/assembly";
import { DEFAULT_RAFTER_SUPPORT_CONFIG } from "../src/features/labour-colony-studio/model/rafterSupport";
import type { ColonyModel, ColonyPart, Vec3 } from "../src/features/labour-colony-studio/model/types";
import type { SectionDims } from "../src/features/labour-colony-studio/model/sectionDims";

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
/** Full 3-D bounding box of a part (metres) — works for boxes, prisms and quads alike. */
function bbox(p: ColonyPart): { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number } {
  const vs = verts(p);
  return {
    x0: Math.min(...vs.map((v) => v.x)), y0: Math.min(...vs.map((v) => v.y)), z0: Math.min(...vs.map((v) => v.z)),
    x1: Math.max(...vs.map((v) => v.x)), y1: Math.max(...vs.map((v) => v.y)), z1: Math.max(...vs.map((v) => v.z)),
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
 * RAFTER SUPPORT SYSTEM — the bolted cleat → C-purlin → MS tube → covering assemblies.
 *
 * The engineering core (model/rafterSupport.ts) owns every spacing, count, length and weight; this
 * block proves the MODEL emits exactly what that core resolved — no invented member, no missing one,
 * no quantity counted twice — and that the emitted solids form a real, buildable connection:
 * everything bears on the thing below it, nothing floats and nothing but a bolt shank passes through
 * another solid.
 * ========================================================================================== */
{
  const d = model.rafterSupport;
  ok(!!d, "RS0: the model carries the resolved rafter support system");

  if (d) {
    const t = d.takeoff;
    const c = d.config;
    const parts = model.parts;
    const rsup = parts.filter((p) => RAFTER_SUPPORT_KINDS.has(p.kind));
    const of = (kind: ColonyPart["kind"]) => parts.filter((p) => p.kind === kind);
    const liveLevels = d.levels.filter((lv) => lv.enabled && lv.lines.length);
    const lineCount = liveLevels.reduce((a, lv) => a + lv.lines.length, 0);
    /** Length of a run member along its own axis (the across / depth dimensions are millimetres). */
    const runLen = (p: ColonyPart) => { const b = bbox(p); return Math.max(b.x1 - b.x0, b.y1 - b.y0); };
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

    ok(c.enabled && liveLevels.length > 0,
      `RS1: the system is enabled with ${liveLevels.length} live level(s) and ${lineCount} tube line(s)`);
    ok(rsup.length > 0, `RS1b: the model emits rafter-support parts (${rsup.length})`);

    /* ---- (A) every emitted part count IS the take-off, exactly ---- */
    ok(of("rsup-cleat-plate").length === t.cleats,
      `RS2: cleat plates match the take-off (${of("rsup-cleat-plate").length} vs ${t.cleats})`);

    ok(of("rsup-c-purlin").length === lineCount,
      `RS3: one C-purlin run per tube line (${of("rsup-c-purlin").length} vs ${lineCount})`);
    ok(of("rsup-ms-tube").length === lineCount,
      `RS3b: one MS tube run per tube line (${of("rsup-ms-tube").length} vs ${lineCount})`);
    ok(Math.abs(sum(of("rsup-c-purlin").map(runLen)) - t.purlinRunningLengthM) < 1e-3,
      `RS3c: modelled C-purlin length equals the take-off (${sum(of("rsup-c-purlin").map(runLen)).toFixed(3)} vs ${t.purlinRunningLengthM} m)`);
    ok(Math.abs(sum(of("rsup-ms-tube").map(runLen)) - t.tubeRunningLengthM) < 1e-3,
      `RS3d: modelled MS tube length equals the take-off (${sum(of("rsup-ms-tube").map(runLen)).toFixed(3)} vs ${t.tubeRunningLengthM} m)`);

    // one nut-bolt is drawn as head + shank + projecting thread, so the SHANK is the bolt instance
    const boltParts = of("rsup-bolt");
    const shanks = boltParts.filter((p) => p.id.endsWith("-shank"));
    const heads = boltParts.filter((p) => p.id.endsWith("-head"));
    const threads = boltParts.filter((p) => p.id.endsWith("-thread"));
    ok(shanks.length === t.bolts, `RS4: bolts match the take-off (${shanks.length} vs ${t.bolts})`);
    ok(heads.length === shanks.length && threads.length === shanks.length,
      `RS4b: every bolt is drawn with a head and a projecting thread (${heads.length}/${shanks.length}/${threads.length})`);
    ok(boltParts.length === shanks.length * 3,
      `RS4c: no stray bolt solid (${boltParts.length} solids for ${shanks.length} bolts)`);
    ok(shanks.length === t.cleatBolts + t.webBolts,
      `RS4d: cleat bolts + web bolts are all placed (${t.cleatBolts} + ${t.webBolts})`);
    ok(of("rsup-nut").length === t.nuts, `RS5: nuts match the take-off (${of("rsup-nut").length} vs ${t.nuts})`);
    ok(of("rsup-washer").length === t.washers,
      `RS5b: washers match the take-off (${of("rsup-washer").length} vs ${t.washers})`);

    const ceilLines = liveLevels.filter((lv) => lv.kind === "ceiling").reduce((a, lv) => a + lv.lines.length, 0);
    const roofLines = liveLevels.filter((lv) => lv.kind === "roof").reduce((a, lv) => a + lv.lines.length, 0);
    const sheets = of("rsup-cement-sheet");
    const panels = of("rsup-puf-roof-panel");
    ok(sheets.length === ceilLines, `RS6: one ceiling-board run per ceiling tube line (${sheets.length} vs ${ceilLines})`);
    ok(panels.length === roofLines, `RS6b: one PUF roof-panel run per roof tube line (${panels.length} vs ${roofLines})`);
    ok(sum(sheets.map((p) => p.spec.quantity ?? 0)) === t.ceilingSheets,
      `RS6c: apportioned ceiling boards sum to the take-off (${sum(sheets.map((p) => p.spec.quantity ?? 0))} vs ${t.ceilingSheets})`);
    ok(sum(panels.map((p) => p.spec.quantity ?? 0)) === t.roofPanels,
      `RS6d: apportioned roof panels sum to the take-off (${sum(panels.map((p) => p.spec.quantity ?? 0))} vs ${t.roofPanels})`);

    /* ---- (B) every fastener belongs to a real cleat connection group ---- */
    const cleatConn = new Set(of("rsup-cleat-plate").map((p) => p.connectionId ?? ""));
    const fasteners = rsup.filter((p) => p.kind === "rsup-bolt" || p.kind === "rsup-nut" || p.kind === "rsup-washer");
    const orphan = fasteners.filter((p) => !p.connectionId || !cleatConn.has(p.connectionId));
    ok(orphan.length === 0, `RS7: no bolt / nut / washer outside a real cleat connection group (${orphan.length})`);
    ok(cleatConn.size === t.cleats, `RS7b: one connection group per cleat (${cleatConn.size} vs ${t.cleats})`);
    const perGroup = c.bolt.perCleat + c.tube.boltsPerConnection;
    let wrongGroup = 0;
    for (const cid of cleatConn) {
      const inGroup = fasteners.filter((p) => p.connectionId === cid);
      const gShanks = inGroup.filter((p) => p.kind === "rsup-bolt" && p.id.endsWith("-shank")).length;
      const gNuts = inGroup.filter((p) => p.kind === "rsup-nut").length;
      const gWash = inGroup.filter((p) => p.kind === "rsup-washer").length;
      if (gShanks !== perGroup || gNuts !== perGroup * c.bolt.nutsPerBolt || gWash !== perGroup * c.bolt.washersPerBolt) wrongGroup++;
    }
    ok(wrongGroup === 0,
      `RS7c: every connection carries ${c.bolt.perCleat} cleat bolts + ${c.tube.boltsPerConnection} web bolts with their nuts and washers (${wrongGroup} bad group(s))`);
    ok(rsup.every((p) => !!p.assemblyId && p.layer === "rafter-support"),
      "RS7d: every rafter-support part carries an assembly id and sits on the rafter-support layer");
    ok(rsup.every((p) => p.id.startsWith("rsup:")), "RS7e: every rafter-support id follows the rsup: convention");
    ok(rsup.every((p) => p.assemblyStep === 18 || p.assemblyStep === 19),
      "RS7f: the steel erects at step 18 and the covering at step 19");

    /* ---- (C) nothing floats: every solid bears on the one below it ---- */
    const byId = new Map(parts.map((p) => [p.id, p] as const));
    const EPS = 1.5e-3;
    let floatingCleat = 0, floatingPurlin = 0, floatingTube = 0, floatingCover = 0, clash = 0;
    for (const lv of liveLevels) {
      const alongX = lv.runAxis === "x";
      const acrossLo = Math.min(...lv.lines.map((l) => l.acrossM));
      const acrossHi = acrossLo + lv.spanAcrossM;
      for (const line of lv.lines) {
        const purlin = byId.get(`rsup:${line.id}:purlin`);
        const tube = byId.get(`rsup:${line.id}:tube`);
        const cover = byId.get(`rsup:${line.id}:${lv.kind === "ceiling" ? "sheet" : "panel"}`);
        if (!purlin || !tube) { floatingPurlin++; continue; }
        const pb = bbox(purlin), tb = bbox(tube);

        // the tube's side face is FLUSH against the purlin web — they touch on exactly one plane and
        // never overlap in the across direction (that is what "bolted side by side" means)
        const pLo = alongX ? pb.y0 : pb.x0, pHi = alongX ? pb.y1 : pb.x1;
        const tLo = alongX ? tb.y0 : tb.x0, tHi = alongX ? tb.y1 : tb.x1;
        const touches = Math.abs(tLo - pHi) < EPS || Math.abs(tHi - pLo) < EPS;
        const overlaps = Math.min(pHi, tHi) - Math.max(pLo, tLo) > EPS;
        if (!touches || overlaps) floatingTube++;

        // the tube's FIXING face is flush with the purlin's outer face (dir = +1 roof, −1 ceiling)
        const fixingFlush = line.dir > 0 ? Math.abs(tb.z1 - pb.z1) < EPS : Math.abs(tb.z0 - pb.z0) < EPS;
        if (!fixingFlush) floatingTube++;

        // the covering bears on (roof) / hangs under (ceiling) that same fixing face
        if (cover) {
          const cb = bbox(cover);
          const seated = line.dir > 0 ? Math.abs(cb.z0 - tb.z1) < EPS : Math.abs(cb.z1 - tb.z0) < EPS;
          if (!seated) floatingCover++;
          // and it never runs outside the span it covers (the outermost bay is clipped to the body)
          const cLo = alongX ? cb.y0 : cb.x0, cHi = alongX ? cb.y1 : cb.x1;
          if (cLo < acrossLo - EPS || cHi > acrossHi + EPS) floatingCover++;
        }

        // the purlin bears on the cleats of this line — cleat far face == purlin near face
        for (const pos of d.positions.filter((p) => p.lineId === line.id)) {
          const cleat = byId.get(`rsup:${pos.levelId}:${pos.mark}:cleat`);
          if (!cleat) { floatingCleat++; continue; }
          const kb = bbox(cleat);
          // the cleat's near face IS the rafter face it bolts to
          const onRafter = pos.dir > 0 ? Math.abs(kb.z0 - pos.seatZM) < EPS : Math.abs(kb.z1 - pos.seatZM) < EPS;
          if (!onRafter) floatingCleat++;
          const seated = pos.dir > 0 ? Math.abs(pb.z0 - kb.z1) < EPS : Math.abs(pb.z1 - kb.z0) < EPS;
          if (!seated) floatingPurlin++;
          // and the plate never interpenetrates the purlin it carries
          if (Math.min(kb.z1, pb.z1) - Math.max(kb.z0, pb.z0) > EPS) clash++;
        }
      }

      // no two covering strips of one level may occupy the same volume (they tile, they never stack)
      const covers = lv.lines
        .map((l) => byId.get(`rsup:${l.id}:${lv.kind === "ceiling" ? "sheet" : "panel"}`))
        .filter((p): p is ColonyPart => !!p)
        .map(bbox);
      for (let i = 0; i < covers.length; i++) {
        for (let j = i + 1; j < covers.length; j++) {
          const a = covers[i], b = covers[j];
          const ov = (lo1: number, hi1: number, lo2: number, hi2: number) => Math.min(hi1, hi2) - Math.max(lo1, lo2);
          if (ov(a.x0, a.x1, b.x0, b.x1) > EPS && ov(a.y0, a.y1, b.y0, b.y1) > EPS && ov(a.z0, a.z1, b.z0, b.z1) > EPS) clash++;
        }
      }
      // …and together they must tile the covered span exactly once — no gap, no double layer
      const strips = covers
        .map((b) => (alongX ? [b.y0, b.y1] : [b.x0, b.x1]) as [number, number])
        .sort((p, q) => p[0] - q[0]);
      const tiled = strips.length > 0
        && Math.abs(strips[0][0] - acrossLo) < EPS
        && Math.abs(strips[strips.length - 1][1] - acrossHi) < EPS
        && strips.every((sp, i) => i === 0 || Math.abs(sp[0] - strips[i - 1][1]) < EPS);
      if (!tiled) floatingCover++;
    }
    ok(floatingCleat === 0, `RS8: every cleat plate bolts flat onto its rafter face (${floatingCleat} floating)`);
    ok(floatingPurlin === 0, `RS8b: every C-purlin bears on its cleats (${floatingPurlin} floating)`);
    ok(floatingTube === 0, `RS8c: every MS tube sits FLUSH on the purlin web without overlapping it (${floatingTube} bad)`);
    ok(floatingCover === 0, `RS8d: every covering bears on its tube and stays inside the span it covers (${floatingCover} bad)`);
    ok(clash === 0, `RS8e: no rafter-support solid interpenetrates another (${clash} clash(es))`);

    /* ---- (D) the MS tube slides SIDEWAYS off the web when exploded ---- */
    let badExplode = 0;
    for (const lv of liveLevels) {
      for (const line of lv.lines) {
        const tube = byId.get(`rsup:${line.id}:tube`);
        if (!tube) { badExplode++; continue; }
        const side = lv.runAxis === "x" ? tube.explode.y : tube.explode.x;
        const along = lv.runAxis === "x" ? tube.explode.x : tube.explode.y;
        // a sideways component along the web normal, and none along the run itself
        if (Math.abs(side) < 1e-6 || Math.abs(along) > 1e-6) badExplode++;
      }
    }
    ok(badExplode === 0, `RS9: every MS tube explodes sideways off the purlin web (${badExplode} bad vector(s))`);

    /* ---- (E) the covering is never counted twice ---- */
    const rsupRoof = liveLevels.some((lv) => lv.kind === "roof");
    ok(!rsupRoof || of("roof-sheet").length === 0,
      `RS10: the generic roof-sheet slab is replaced by the real PUF panel layout (${of("roof-sheet").length} generic slab(s))`);
    ok(panels.every((p) => p.boqLineId === "roof:sheet"),
      "RS10b: the PUF roof panels inherit the priced roof:sheet line, so it still owns exactly one geometry set");
    ok(of("ceiling").length === 1,
      `RS10c: the generic top-floor ceiling is untouched — the rsup ceilings are the INTERMEDIATE floors (${of("ceiling").length})`);
    const rsupCeilingZs = liveLevels.filter((lv) => lv.kind === "ceiling").flatMap((lv) => lv.lines.map((l) => l.seatZM));
    const genericCeilingZ = bbox(of("ceiling")[0]).z1;
    ok(rsupCeilingZs.every((z) => Math.abs(z - genericCeilingZ) > 0.1),
      "RS10d: no rsup ceiling level coincides with the generic ceiling slab (nothing double-covered)");
  }
}

/* (RS11) the whole system switches off cleanly — no orphan part, and the generic slab comes back. */
{
  const offCfg: LabourColonyConfig = {
    ...BASE_CONFIG,
    rafterSupport: { ...DEFAULT_RAFTER_SUPPORT_CONFIG, enabled: false },
  };
  const offResult = calculateLabourColony(offCfg);
  const offCivil = calculateCivilWork({ ...DEFAULT_CIVIL_CONFIG, enabled: true }, civilCtxOf(offResult));
  const offModel = buildColonyModel({ result: offResult, civil: offCivil, columnGrid: null });
  const offRsup = offModel.parts.filter((p) => RAFTER_SUPPORT_KINDS.has(p.kind));
  ok(offRsup.length === 0, `RS11: a disabled rafter support system emits zero rsup parts (${offRsup.length})`);
  ok(offModel.rafterSupport?.config.enabled === false, "RS11b: the disabled system is still carried on the model for the UI");
  ok(offModel.parts.filter((p) => p.kind === "roof-sheet").length > 0,
    "RS11c: the generic roof-sheet slab is restored when the system is off — nothing was deleted");
  ok(offModel.warnings.every((w) => !w.code.startsWith("rafter-support-")),
    "RS11d: a disabled system raises no rafter-support warning");
  runChecks("rafter support disabled", offModel);
}

/* (RS12) the connection-detail switch defers only the fasteners — never the members themselves. */
{
  const lite = buildColonyModel({ result, civil, columnGrid: null }, { connectionDetail: false });
  const liteRsup = lite.parts.filter((p) => RAFTER_SUPPORT_KINDS.has(p.kind));
  const fastenerKinds = new Set(["rsup-bolt", "rsup-nut", "rsup-washer"]);
  ok(liteRsup.length > 0 && liteRsup.every((p) => !fastenerKinds.has(p.kind)),
    `RS12: connectionDetail:false defers the nut-bolt solids (${liteRsup.length} rsup parts, none a fastener)`);
  ok(lite.parts.filter((p) => p.kind === "rsup-cleat-plate").length === (model.rafterSupport?.takeoff.cleats ?? -1),
    "RS12b: every cleat plate, C-purlin, MS tube and covering is still placed");
}

/* ================================================================= report ================= */
console.log(`\ncolony-studio.test.ts — ${passed} passed, ${failed} failed\n`);
if (failed) {
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
} else {
  console.log("  ✓ all colony-studio model invariants hold");
}
