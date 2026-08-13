/**
 * LABOUR COLONY — structural design basis numeric checks (hand-verified against IS 875).
 *
 * Reference case, worked by hand:
 *   Vb 39 m/s · terrain 2 (k2 = 1.0) · k1 = k3 = k4 = 1.0  ⇒  Vz = 39,  pz = 0.6·39² = 912.6 N/m²
 *   Building 12 × 6 m, eave 2.7 m, rise 0.7 m, 1 floor, 72 m², dead 8 000 kg (light prefab)
 *   l/w = 2 ⇒ leeward −0.3 ⇒ net wall coeff 1.0 ; openings 10 % ⇒ Cpi 0.5 ⇒ uplift coeff 1.4
 *   Base shear T = 0.9126 × 1.0 × (12 × 3.4) = 37.2 kN ; roof uplift = 0.9126 × 1.4 × 72 = 92.0 kN
 *   0.9·DL = 70.6 kN ⇒ ALL THREE stability checks fail — exactly why hold-down anchors exist.
 *
 * Run:  npx tsx scripts/labour-colony-structural.ts
 */
import {
  buildStructuralBasis,
  cpiOfOpenings,
  DEFAULT_STRUCTURAL_SITE,
  K2_AT_10M,
  type StructuralBasisInput,
} from "../src/lib/quotation/labourColonyStructural";

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

const BASE: StructuralBasisInput = {
  lengthM: 12, widthM: 6, eaveHeightM: 2.7, roofRiseM: 0.7, floors: 1,
  floorAreaSqm: 72, deadWeightKg: 8000, gridCols: 5, gridRows: 3,
  site: { ...DEFAULT_STRUCTURAL_SITE }, // Vb 39, terrain 2, 50yr, k3 1, inland, 10 % openings
};

console.log("\n=== Wind pressure chain (IS 875-3) ===");
{
  const r = buildStructuralBasis(BASE);
  ok("k2 mapping (terrain 2 → 1.0)", K2_AT_10M[2] === 1.0 && r.wind.k2 === 1.0);
  ok("Vz = Vb·k1·k2·k3·k4 = 39 m/s", r.wind.vzMs === 39, `${r.wind.vzMs}`);
  ok("pz = 0.6·39² = 0.9126 kN/m²", near(r.wind.pzKnSqm, 0.9126, 0.0005), `${r.wind.pzKnSqm}`);
  ok("l/w = 2 ⇒ leeward −0.3 ⇒ net wall coeff 1.0", r.wind.netWallCoeff === 1.0);
  ok("openings 10 % ⇒ Cpi 0.5", r.wind.cpi === 0.5);
  ok("Cpi tiers (≤5 → 0.2, ≤20 → 0.5, >20 → 0.7)", cpiOfOpenings(5) === 0.2 && cpiOfOpenings(20) === 0.5 && cpiOfOpenings(25) === 0.7);
  ok("roof uplift coeff = 0.9 + Cpi = 1.4", r.wind.roofUpliftCoeff === 1.4);
  ok("transverse silhouette = 12 × 3.4 = 40.8 m²", near(r.wind.areaTransverseSqm, 40.8, 0.05), `${r.wind.areaTransverseSqm}`);
  ok("gable silhouette = 16.2 + 2.1 = 18.3 m²", near(r.wind.areaLongitudinalSqm, 18.3, 0.05), `${r.wind.areaLongitudinalSqm}`);
  ok("base shear (transverse) ≈ 37.2 kN", near(r.wind.baseShearTransverseKn, 37.2, 0.2), `${r.wind.baseShearTransverseKn}`);
  ok("roof uplift ≈ 92.0 kN", near(r.wind.roofUpliftKn, 92.0, 0.3), `${r.wind.roofUpliftKn}`);
}

console.log("\n=== Loading sheet (IS 875-1/2) ===");
{
  const r = buildStructuralBasis(BASE);
  ok("dead = 8 000 kg → 78.5 kN", near(r.loading.deadKn, 78.5, 0.2), `${r.loading.deadKn}`);
  ok("live floors = 2.0 × 72 = 144 kN", near(r.loading.liveFloorsKn, 144, 0.5));
  ok("live roof = 0.75 × 72 = 54 kN", near(r.loading.liveRoofKn, 54, 0.5));
  ok("stability combo 0.9·DL + WL listed", r.loading.combos.some((c) => c.label.startsWith("0.9")));
}

console.log("\n=== Stability — a light prefab FAILS on friction alone (that is the point) ===");
{
  const r = buildStructuralBasis(BASE);
  const [ot, sl, up] = r.stability;
  ok("overturning FoS < 1.5 (fails)", !ot.ok && ot.fos < 1.5, `FoS ${ot.fos}`);
  ok("sliding fails (uplift kills the friction)", !sl.ok, `FoS ${sl.fos}`);
  ok("gross uplift fails (0.9·DL < wind uplift)", !up.ok, `FoS ${up.fos}`);
  ok("⇒ anchorage REQUIRED", r.anchorage.required);
  ok("anchor demand computed per bolt", r.anchorage.tensionPerBoltKn > 0 && r.anchorage.shearPerBoltKn > 0,
    `T ${r.anchorage.tensionPerBoltKn} kN · V ${r.anchorage.shearPerBoltKn} kN`);
  ok("M12 grade 8.8 suffices for this case", r.anchorage.recommendedBolt.startsWith("M12"), r.anchorage.recommendedBolt);
  ok("interaction utilisation ≤ 1", r.anchorage.utilisation <= 1, `${r.anchorage.utilisation}`);
  ok("60 bolts = 15 columns × 4", r.anchorage.totalBolts === 60);
}

console.log("\n=== Sensitivities behave physically ===");
{
  const heavy = buildStructuralBasis({ ...BASE, deadWeightKg: 40000 });
  const light = buildStructuralBasis(BASE);
  ok("heavier building ⇒ better overturning FoS", heavy.stability[0].fos > light.stability[0].fos,
    `${heavy.stability[0].fos} > ${light.stability[0].fos}`);

  const temp = buildStructuralBasis({ ...BASE, site: { ...BASE.site, designLife: "5yr" } });
  ok("temporary (k1 0.82) ⇒ lower pressure", near(temp.wind.pzKnSqm, 0.9126 * 0.82 * 0.82, 0.002), `${temp.wind.pzKnSqm}`);
  ok("temporary life is flagged as a warning", temp.warnings.some((w) => /5-year/i.test(w)));

  const cyclone = buildStructuralBasis({ ...BASE, site: { ...BASE.site, cycloneRegion: true } });
  ok("cyclonic k4 = 1.15 ⇒ higher pressure", near(cyclone.wind.pzKnSqm, 0.9126 * 1.15 * 1.15, 0.002), `${cyclone.wind.pzKnSqm}`);
  ok("higher wind zone ⇒ bigger/equal anchor demand",
    buildStructuralBasis({ ...BASE, site: { ...BASE.site, basicWindSpeedMs: 55 } }).anchorage.tensionPerBoltKn >=
      light.anchorage.tensionPerBoltKn);

  const sealed = buildStructuralBasis({ ...BASE, site: { ...BASE.site, openingsPercent: 4 } });
  ok("fewer openings ⇒ lower uplift", sealed.wind.roofUpliftKn < light.wind.roofUpliftKn,
    `${sealed.wind.roofUpliftKn} < ${light.wind.roofUpliftKn}`);
}

console.log("\n=== The professional boundary is stated, always ===");
{
  const r = buildStructuralBasis(BASE);
  ok("dossier declares it is NOT a certificate", r.disclaimers.some((d) => /NOT a stability certificate/i.test(d)));
  ok("dossier requires a licensed structural engineer", r.disclaimers.some((d) => /licensed structural engineer/i.test(d)));
  ok("connection schedule covers base anchors + roof-sheet uplift fixing",
    r.connections.some((c) => /hold-down/i.test(c.item)) && r.connections.some((c) => /Roof sheets/i.test(c.item)));
}

console.log(`\n================  ALL STRUCTURAL CHECKS PASSED (${passed})  ================`);
