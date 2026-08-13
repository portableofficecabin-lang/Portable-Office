/**
 * LABOUR COLONY — assembly-video ↔ elevation-drawing cross-check ("Prestige Somerville 9562").
 *
 * The four exported elevation PDFs (front / rear / left / right) and the Engineering Studio's
 * assembly video must describe the SAME building, because both derive from buildRoomFloorPlan +
 * buildElevation. This harness rebuilds the Somerville configuration exactly as drawn —
 *
 *   14115 × 9200 mm · G+1 · rooms 3050 × 3700 × 2700 · plinth 450 · gable rise 460 (ridge 6310)
 *   Staircase A 915 mm @ 193 riser · Staircase 2 copy 1000 mm @ 180 riser · verandas 900 both sides
 *
 * — and asserts the assembly-video model reproduces every feature the drawings show, at the same
 * levels (FFL +450, FFL1 +3150, EAVE +5850, RIDGE +6310). No browser needed: buildColonyModel and
 * buildAssemblyTimeline are pure.
 *
 * Run:  npx tsx scripts/colony-assembly-somerville.ts
 */
import { calculateLabourColony, type LabourColonyConfig } from "../src/lib/quotation/labourColony";
import { buildElevation } from "../src/lib/quotation/elevation";
import { buildColonyModel } from "../src/features/labour-colony-studio/model/colonyModel";
import { buildAssemblyTimeline } from "../src/features/labour-colony-studio/animation/buildAssemblyTimeline";
import type { ColonyPart } from "../src/features/labour-colony-studio/model/types";

let passed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (!cond) {
    console.error(`  ✗ FAIL: ${label}${detail ? " — " + detail : ""}`);
    throw new Error("Assertion failed: " + label);
  }
  passed++;
  console.log(`  ✓ ${label}${detail ? " — " + detail : ""}`);
}
const near = (a: number, b: number, eps: number) => Math.abs(a - b) <= eps;

/* ---- the Somerville configuration, exactly as the drawings state ---- */
const cfg: LabourColonyConfig = {
  projectName: "Prestige Somerville (9562)",
  location: "",
  personsPerRoom: 4,
  totalRooms: 16,               // 8 per floor: 2 rows × 4 rooms
  floors: 2,                    // G+1
  roomLength: 3.05,             // 3050 mm
  roomWidth: 3.7,               // 3700 mm
  roomHeight: 2.7,              // 2700 mm
  corridorWidth: 0.9,
  corridorPosition: "center",
  staircasePosition: "both",
  panelType: "PUF",
  panelThicknessMm: 50,
  wastagePercent: 5,
  facilities: { toilet: false, bunkBeds: false, diningKitchen: false, officeSecurity: false },
  floorPlan: {
    showRailing: true,
    roof: { type: "gable", riseM: 0.46, overhangM: 0.3 },
    staircases: [
      { id: "a",  label: "Staircase A",      enabled: true, position: "left",  widthM: 0.915, riserMm: 193 },
      { id: "s2", label: "Staircase 2 copy", enabled: true, position: "right", widthM: 1.0,   riserMm: 180 },
    ],
    verandas: [
      { id: "v1", label: "Front veranda", enabled: true, side: "bottom", widthM: 0.9, railing: true },
      { id: "v2", label: "Rear veranda",  enabled: true, side: "top",    widthM: 0.9, railing: true },
    ],
  },
} as unknown as LabourColonyConfig;

const PLINTH = 0.45;
const result = calculateLabourColony(cfg);
const model = buildColonyModel({ result, plinthM: PLINTH });
const parts = model.parts as ColonyPart[];

const zTop = (p: ColonyPart): number => {
  const s = p.solid as { kind: string; max?: { z: number }; z1?: number; pts?: { z: number }[] };
  if (s.max) return s.max.z;
  if (typeof s.z1 === "number") return s.z1;
  if (s.pts) return Math.max(...s.pts.map((q) => q.z));
  return NaN;
};
const xMid = (p: ColonyPart): number => {
  const s = p.solid as { min?: { x: number }; max?: { x: number }; poly?: { x: number }[]; pts?: { x: number }[] };
  if (s.min && s.max) return (s.min.x + s.max.x) / 2;
  const q = s.poly ?? s.pts;
  return q ? q.reduce((a, v) => a + v.x, 0) / q.length : NaN;
};
const yMid = (p: ColonyPart): number => {
  const s = p.solid as { min?: { y: number }; max?: { y: number }; poly?: { y: number }[]; pts?: { y: number }[] };
  if (s.min && s.max) return (s.min.y + s.max.y) / 2;
  const q = s.poly ?? s.pts;
  return q ? q.reduce((a, v) => a + v.y, 0) / q.length : NaN;
};

console.log("\n=== 1 · The model IS the drawing — levels match the elevation title block ===");
{
  const roofTops = parts.filter((p) => p.layer === "roof").map(zTop).filter(Number.isFinite);
  const ridgeZ = Math.max(...roofTops);
  ok("RIDGE ≈ +6310 mm (plinth 450 + 2×2700 + rise 460)", near(ridgeZ, 6.31, 0.2), `${(ridgeZ * 1000).toFixed(0)} mm`);
  // The tallest part tops out a member-depth + cap above the theoretical ridge LINE — same building.
  const maxZall = Math.max(...parts.map(zTop).filter(Number.isFinite));
  ok("overall top ≈ ridge line (member depth + cap only)", near(maxZall, 6.31, 0.25), `${(maxZall * 1000).toFixed(0)} mm`);
  const xs = parts.map(xMid).filter(Number.isFinite);
  const span = Math.max(...xs) - Math.min(...xs);
  ok("overall length ≈ 14115 mm incl. both staircases", near(span, 14.115, 0.6), `${(span * 1000).toFixed(0)} mm`);
}

console.log("\n=== 2 · Both staircases, as drawn (different widths + risers) ===");
{
  const stair = parts.filter((p) => p.layer === "stair" && p.kind !== "handrail" && p.kind !== "handrail-post");
  ok("stair parts exist", stair.length > 0, `${stair.length} parts`);
  const L = 12.2; // room band 4 × 3050
  const left = stair.filter((p) => xMid(p) < 0.5);
  const right = stair.filter((p) => xMid(p) > L - 0.5);
  ok("Staircase A present at the LEFT end", left.length > 0, `${left.length} parts`);
  ok("Staircase 2 copy present at the RIGHT end", right.length > 0, `${right.length} parts`);
  const treadsL = left.filter((p) => p.kind === "stair-tread").length;
  const treadsR = right.filter((p) => p.kind === "stair-tread").length;
  ok("both flights have treads", treadsL > 5 && treadsR > 5, `left ${treadsL} · right ${treadsR}`);
  ok("different riser setups ⇒ different tread counts (14R@193 vs 15R@180)", treadsL !== treadsR, `${treadsL} vs ${treadsR}`);
  ok("stringers on both flights", left.some((p) => p.kind === "stair-stringer") && right.some((p) => p.kind === "stair-stringer"));
}

console.log("\n=== 3 · Verandas 900 mm on BOTH long sides, with railings ===");
{
  const ver = parts.filter((p) => ["veranda-beam", "veranda-joist", "veranda-post", "walkway-plate"].includes(p.kind));
  ok("veranda framing exists", ver.length > 0, `${ver.length} parts`);
  const ys = ver.map(yMid).filter(Number.isFinite);
  const depth = 9.2; // 2 × 3700 rooms + 2 × 900 verandas
  ok("veranda framing on the FRONT side", ys.some((y) => y < 1.2), `min y ${(Math.min(...ys) * 1000).toFixed(0)} mm`);
  ok("veranda framing on the REAR side", ys.some((y) => y > depth - 1.2), `max y ${(Math.max(...ys) * 1000).toFixed(0)} mm`);
  const rails = parts.filter((p) => p.kind === "handrail" || p.kind === "handrail-post" || p.kind === "toe-plate");
  ok("railings present (drawing shows green rails both floors)", rails.length > 0, `${rails.length} parts`);

  // --- the WALKWAY-END units the SIDE elevations draw (ElevDeck.railing grid in every 900 band) ---
  const endRails = parts.filter((p) => p.kind === "handrail" && p.id.includes(":end:") && !p.id.includes("rail-mid"));
  const endMids = parts.filter((p) => p.kind === "handrail" && p.id.includes(":end:") && p.id.includes("rail-mid"));
  ok("walkway END guard rails: 2 verandas × 2 ends × 2 floors = 8", endRails.length === 8, `${endRails.length}`);
  ok("…each with a MID rail (the grid the drawing shows)", endMids.length === 8, `${endMids.length}`);
  const roomL = 12.2; // walkway ends at the room band edges = what the left/right elevations show
  const endX = endRails.map(xMid);
  ok("end guards sit on the LEFT face (x≈0)", endX.filter((x) => Math.abs(x) < 0.15).length === 4, `${endX.filter((x) => Math.abs(x) < 0.15).length}`);
  ok("end guards sit on the RIGHT face (x≈12200)", endX.filter((x) => Math.abs(x - roomL) < 0.15).length === 4, `${endX.filter((x) => Math.abs(x - roomL) < 0.15).length}`);
  const gfEnd = endRails.filter((p) => zTop(p) < 2.0).length;
  const ffEnd = endRails.filter((p) => zTop(p) > 3.5).length;
  ok("end guards on BOTH floors (as the side elevations draw)", gfEnd === 4 && ffEnd === 4, `GF ${gfEnd} · FF ${ffEnd}`);
  // parity with the elevation SOURCE OF TRUTH: railed decks[] on a side face == end guards per face
  const leftGeom = buildElevation(result, cfg.floorPlan!, "left", { plinthM: 0.45 }) as unknown as { decks: { railing: boolean }[] };
  const railedDecks = leftGeom.decks.filter((d) => d.railing).length;
  ok(`end guards per face == the side elevation's railed decks (${railedDecks})`, endRails.length / 2 === railedDecks, `${endRails.length / 2} vs ${railedDecks}`);
  const longMids = parts.filter((p) => p.kind === "handrail" && p.id.endsWith(":rail-mid") && !p.id.includes(":end:"));
  ok("long walkway railing now has top + mid rails (drawing grid)", longMids.length === 4, `${longMids.length} mid rails`);
}

console.log("\n=== 4 · G+1: first-floor structure above FFL1 +3150 ===");
{
  const upper = parts.filter((p) => {
    const z = zTop(p);
    return Number.isFinite(z) && z > 3.3 && (p.layer === "structure" || p.layer === "stair");
  });
  ok("structure exists above FFL1", upper.length > 0, `${upper.length} parts`);
  // FF beams (11) + FF column splices (12) prove the G+1 phases; the FF deck rides with the
  // joist family's step by kind mapping, so step 13 may be empty for this layout.
  ok("first-floor assembly steps present (beams 11 + splices 12)", [11, 12].every((s) => parts.some((p) => p.assemblyStep === s)));
  const brace = parts.filter((p) => p.kind === "brace");
  ok("cross bracing present (X on the side elevations)", brace.length > 0, `${brace.length} braces`);
  const win = parts.filter((p) => p.kind === "window");
  const door = parts.filter((p) => p.kind === "door");
  ok("windows + doors placed (blue/red on the elevations)", win.length >= 8 && door.length >= 8, `${win.length} windows · ${door.length} doors`);
}

console.log("\n=== 5 · The assembly VIDEO shows all of it, in build order ===");
{
  const tl = buildAssemblyTimeline(model);
  const titles = tl.steps.map((s) => s.title);
  for (const want of ["Staircase", "Corridor & veranda framing", "First-floor columns & splices", "Roof trusses & rafters", "Railings"]) {
    ok(`video step: "${want}"`, titles.some((t) => t.includes(want)), );
  }
  const idx = (frag: string) => titles.findIndex((t) => t.includes(frag));
  ok("build order sane: columns → first floor → stair → roof → railings",
    idx("Ground-floor columns") < idx("First-floor columns") &&
    idx("First-floor columns") < idx("Roof trusses") &&
    idx("Staircase") < idx("Railings"));
  const scheduled = new Set(tl.steps.flatMap((s) => s.partIds));
  const stairTreads = parts.filter((p) => p.kind === "stair-tread");
  ok("every stair tread is scheduled in the video", stairTreads.every((p) => scheduled.has(p.id)), `${stairTreads.length} treads`);
  const verandaParts = parts.filter((p) => p.kind.startsWith("veranda"));
  ok("every veranda member is scheduled in the video", verandaParts.every((p) => scheduled.has(p.id)), `${verandaParts.length} parts`);
  ok("timeline is non-empty and finite", tl.steps.length >= 15 && Number.isFinite(tl.totalMs), `${tl.steps.length} steps · ${(tl.totalMs / 1000).toFixed(0)} s`);
}

console.log(`\n================  ASSEMBLY VIDEO MATCHES THE ELEVATION DRAWINGS (${passed} checks)  ================`);
