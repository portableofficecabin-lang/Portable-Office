/**
 * LABOUR COLONY — STRUCTURAL DESIGN BASIS & STABILITY (pure: no React, no DOM, no Supabase).
 *
 *   colony dimensions + REAL dead weight (from the engine/BOQ) + site wind parameters
 *        ──▶ buildStructuralBasis() ──▶ loading sheet · wind analysis · stability FoS ·
 *                                       anchorage requirement · connection schedule · combos
 *
 * WHAT THIS IS: the calculation dossier a consulting structural engineer needs to review and certify
 * a prefab labour colony — technical loading per IS 875 (Parts 1 & 2), wind per IS 875 (Part 3),
 * rigid-body stability (overturning / sliding / uplift), and the anchor-bolt demand those checks
 * drive. Every factor is shown with its basis so the reviewer can verify each line.
 *
 * WHAT THIS IS NOT — and must never pretend to be: a stability certificate. A certificate is a legal
 * instrument signed by a licensed structural engineer under their registration. This module prepares
 * the package FOR that engagement; the UI watermarks everything "FOR STRUCTURAL ENGINEER REVIEW".
 *
 * Method notes (deliberately simple, conservative and reviewable):
 *  · Design pressure uses pz = 0.6·Vz² directly (Kd·Ka·Kc refinements omitted ⇒ conservative).
 *  · Wall coefficients from IS 875-3 Table 5 for low, long buildings (h/w ≤ ½): windward +0.7,
 *    leeward −0.25 (1 ≤ l/w ≤ 1.5) or −0.3 (l/w > 1.5). Internal pressure cancels on opposite
 *    walls for the GLOBAL force, so the net frame coefficient is Cpe,w − Cpe,l.
 *  · Roof uplift uses the worst low-pitch suction (Cpe ≈ −0.9) plus internal pressure over the FULL
 *    plan area — conservative by construction.
 *  · Stability by rigid-body statics on characteristic loads, restoring dead load factored 0.9
 *    (IS 456/800 stability practice), target FoS 1.5 for overturning and sliding.
 *  · Light prefab buildings are governed by WIND (uplift/overturning), not gravity — which is why
 *    this module exists alongside the gravity/SBC checks the civil engine already performs.
 */

export const G_KN_PER_KG = 9.81 / 1000; // kg → kN

/* ==========================================================================
 * 1. SITE CONFIG (persisted on LabourColonyConfig.structuralSite — jsonb, additive)
 * ========================================================================== */

/** IS 875-3 basic wind speed zones (m/s) with familiar reference cities. */
export const WIND_ZONES: { vb: number; label: string; hint: string }[] = [
  { vb: 33, label: "Zone 33 m/s", hint: "Bengaluru, Mysuru, Thiruvananthapuram" },
  { vb: 39, label: "Zone 39 m/s", hint: "Hyderabad, Pune, Coimbatore, Madurai" },
  { vb: 44, label: "Zone 44 m/s", hint: "Mumbai, Ahmedabad, Nagpur, Varanasi" },
  { vb: 47, label: "Zone 47 m/s", hint: "Delhi NCR, Jaipur, Lucknow, Patna" },
  { vb: 50, label: "Zone 50 m/s", hint: "Chennai, Kolkata, Guwahati, Cuttack" },
  { vb: 55, label: "Zone 55 m/s", hint: "Bhuj, Puri, Port Blair (cyclonic belts)" },
];

export type TerrainCategory = 1 | 2 | 3 | 4;

/** IS 875-3 Table 2 — k2 at h ≤ 10 m (all these buildings are below 10 m). */
export const K2_AT_10M: Record<TerrainCategory, number> = { 1: 1.05, 2: 1.0, 3: 0.91, 4: 0.8 };

export const TERRAIN_LABEL: Record<TerrainCategory, string> = {
  1: "Cat 1 — open sea coast / flat treeless plain",
  2: "Cat 2 — open terrain, scattered obstructions (typical site)",
  3: "Cat 3 — suburban / industrial area",
  4: "Cat 4 — dense city centre",
};

export type DesignLife = "50yr" | "5yr";
/** IS 875-3 Table 1 (k1, risk coefficient): general buildings 1.0; temporary structures ≈ 0.82. */
export const K1_OF_LIFE: Record<DesignLife, number> = { "50yr": 1.0, "5yr": 0.82 };

export interface StructuralSiteConfig {
  /** Basic wind speed Vb (m/s) — IS 875-3 wind zone map. */
  basicWindSpeedMs: number;
  terrainCategory: TerrainCategory;
  /** k1 risk coefficient class. A labour colony is OFTEN kept as "50yr" even when temporary —
   *  choosing "5yr" must be a conscious engineering decision (flagged in the dossier). */
  designLife: DesignLife;
  /** k3 topography factor (1.0 flat; up to 1.36 on hill crests — engineer to confirm). */
  k3Topography: number;
  /** k4 importance factor for the cyclonic region (coastal ≤ 60 km): 1.15; inland 1.0. */
  cycloneRegion: boolean;
  /** Wall openings as % of wall area — sets internal pressure Cpi (±0.2 / ±0.5 / ±0.7). */
  openingsPercent: number;
  /** Base friction coefficient (concrete on soil ≈ 0.45). */
  frictionMu: number;
  anchorBoltsPerColumn: number;
  /** IS 875-2 live loads (kN/m²): residential floors 2.0; non-accessible roof 0.75. */
  liveLoadFloorKn: number;
  liveLoadRoofKn: number;
}

export const DEFAULT_STRUCTURAL_SITE: StructuralSiteConfig = {
  basicWindSpeedMs: 39,
  terrainCategory: 2,
  designLife: "50yr",
  k3Topography: 1.0,
  cycloneRegion: false,
  openingsPercent: 10,
  frictionMu: 0.45,
  anchorBoltsPerColumn: 4,
  liveLoadFloorKn: 2.0,
  liveLoadRoofKn: 0.75,
};

/* ==========================================================================
 * 2. INPUT / OUTPUT SHAPES
 * ========================================================================== */

export interface StructuralBasisInput {
  /** Building envelope, metres. eaveHeightM = top of wall above ground; roofRiseM = ridge above eave. */
  lengthM: number;
  widthM: number;
  eaveHeightM: number;
  roofRiseM: number;
  floors: number;
  /** Plan area of ONE floor (m²). */
  floorAreaSqm: number;
  /** REAL dead weight of the whole building (kg) — from the engine/BOQ, never guessed here. */
  deadWeightKg: number;
  /** Columns along the length / width (the civil foundation grid). */
  gridCols: number;
  gridRows: number;
  site: StructuralSiteConfig;
}

export interface LoadingSheet {
  deadKn: number;
  deadPerSqmKn: number;
  liveFloorsKn: number;
  liveRoofKn: number;
  totalGravityKn: number;
  combos: { label: string; basis: string; valueKn: number | null }[];
}

export interface WindSheet {
  vb: number; k1: number; k2: number; k3: number; k4: number;
  vzMs: number;
  /** Design wind pressure (kN/m²). */
  pzKnSqm: number;
  cpeWindward: number;
  cpeLeeward: number;
  cpi: number;
  netWallCoeff: number;
  roofUpliftCoeff: number;
  /** Silhouette areas the wind pushes on (m²). */
  areaTransverseSqm: number;
  areaLongitudinalSqm: number;
  baseShearTransverseKn: number;
  baseShearLongitudinalKn: number;
  /** Net upward wind force on the roof plan (kN) — conservative worst slope over full plan. */
  roofUpliftKn: number;
}

export interface StabilityCheck {
  label: string;
  demand: number;
  resistance: number;
  fos: number;
  target: number;
  ok: boolean;
  unit: string;
}

export interface AnchorageSheet {
  required: boolean;
  columns: number;
  boltsPerColumn: number;
  totalBolts: number;
  tensionPerBoltKn: number;
  shearPerBoltKn: number;
  recommendedBolt: string;
  boltSafeTensionKn: number;
  boltSafeShearKn: number;
  /** Combined interaction (T/Tc + V/Vc), must be ≤ 1. */
  utilisation: number;
}

export interface StructuralBasisResult {
  input: StructuralBasisInput;
  loading: LoadingSheet;
  wind: WindSheet;
  stability: StabilityCheck[];
  anchorage: AnchorageSheet;
  connections: { item: string; detail: string; spec: string }[];
  warnings: string[];
  disclaimers: string[];
}

/* ==========================================================================
 * 3. THE CALCULATION
 * ========================================================================== */

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Internal pressure coefficient from the openings ratio (IS 875-3 §7.3.2). */
export function cpiOfOpenings(openingsPercent: number): number {
  if (openingsPercent <= 5) return 0.2;
  if (openingsPercent <= 20) return 0.5;
  return 0.7;
}

/** Indicative SAFE working loads for grade 8.8 anchors (kN) — engineer to verify per product. */
export const ANCHOR_BOLTS: { name: string; tensionKn: number; shearKn: number }[] = [
  { name: "M12 grade 8.8", tensionKn: 15, shearKn: 11 },
  { name: "M16 grade 8.8", tensionKn: 29, shearKn: 21 },
  { name: "M20 grade 8.8", tensionKn: 45, shearKn: 33 },
  { name: "M24 grade 8.8", tensionKn: 65, shearKn: 48 },
];

export function buildStructuralBasis(input: StructuralBasisInput): StructuralBasisResult {
  const { lengthM: L, widthM: W, eaveHeightM: He, roofRiseM: rise, floors, floorAreaSqm, site } = input;
  const warnings: string[] = [];

  /* ---- loading (IS 875 Parts 1 & 2) ---- */
  const deadKn = input.deadWeightKg * G_KN_PER_KG;
  const liveFloorsKn = site.liveLoadFloorKn * floorAreaSqm * Math.max(1, floors);
  const liveRoofKn = site.liveLoadRoofKn * floorAreaSqm;
  const loading: LoadingSheet = {
    deadKn: r1(deadKn),
    deadPerSqmKn: floorAreaSqm > 0 ? r2(deadKn / (floorAreaSqm * Math.max(1, floors))) : 0,
    liveFloorsKn: r1(liveFloorsKn),
    liveRoofKn: r1(liveRoofKn),
    totalGravityKn: r1(deadKn + liveFloorsKn + liveRoofKn),
    combos: [
      { label: "DL + LL", basis: "gravity service", valueKn: r1(deadKn + liveFloorsKn + liveRoofKn) },
      { label: "DL + WL", basis: "wind service (lateral + uplift, roof LL not simultaneous)", valueKn: null },
      { label: "DL + LL + WL", basis: "combined service", valueKn: null },
      { label: "0.9·DL + WL", basis: "STABILITY — governs overturning/sliding/uplift", valueKn: null },
    ],
  };

  /* ---- wind (IS 875 Part 3) ---- */
  const vb = site.basicWindSpeedMs;
  const k1 = K1_OF_LIFE[site.designLife];
  const k2 = K2_AT_10M[site.terrainCategory];
  const k3 = site.k3Topography;
  const k4 = site.cycloneRegion ? 1.15 : 1.0;
  const vz = vb * k1 * k2 * k3 * k4;
  const pz = (0.6 * vz * vz) / 1000; // kN/m²

  const totalH = He + rise;
  const lw = W > 0 ? L / W : 1;
  const hw = W > 0 ? totalH / W : 0;
  if (hw > 0.5) warnings.push(`h/w = ${r2(hw)} > 0.5 — wall Cpe read from the low-building table; engineer to confirm coefficients.`);

  const cpeWindward = 0.7;
  const cpeLeeward = lw <= 1.5 ? -0.25 : -0.3;
  const cpi = cpiOfOpenings(site.openingsPercent);
  const netWallCoeff = cpeWindward - cpeLeeward; // internal pressure cancels for the global force
  const roofUpliftCoeff = 0.9 + cpi;             // worst low-pitch suction + internal pressure

  const areaT = L * totalH;                       // ridge runs along the length ⇒ full rectangle
  const areaL = W * He + (W * rise) / 2;          // gable end: wall + triangle
  const baseShearT = pz * netWallCoeff * areaT;
  const baseShearL = pz * netWallCoeff * areaL;
  const planArea = L * W;
  const upliftKn = pz * roofUpliftCoeff * planArea;

  const wind: WindSheet = {
    vb, k1, k2, k3, k4,
    vzMs: r2(vz),
    pzKnSqm: r3(pz),
    cpeWindward, cpeLeeward, cpi,
    netWallCoeff: r2(netWallCoeff),
    roofUpliftCoeff: r2(roofUpliftCoeff),
    areaTransverseSqm: r1(areaT),
    areaLongitudinalSqm: r1(areaL),
    baseShearTransverseKn: r1(baseShearT),
    baseShearLongitudinalKn: r1(baseShearL),
    roofUpliftKn: r1(upliftKn),
  };

  /* ---- stability (rigid body, transverse wind = worst; restoring dead factored 0.9) ---- */
  const TARGET = 1.5;
  const restoringDead = 0.9 * deadKn;

  const mo = baseShearT * (totalH / 2) + upliftKn * (W / 2); // overturning about the leeward edge
  const mr = restoringDead * (W / 2);
  const fosOt = mo > 0 ? mr / mo : Infinity;

  const slideResistance = site.frictionMu * Math.max(0, restoringDead - upliftKn);
  const fosSl = baseShearT > 0 ? slideResistance / baseShearT : Infinity;

  const fosUp = upliftKn > 0 ? restoringDead / upliftKn : Infinity;

  const stability: StabilityCheck[] = [
    { label: "Overturning (transverse wind)", demand: r1(mo), resistance: r1(mr), fos: r2(fosOt), target: TARGET, ok: fosOt >= TARGET, unit: "kN·m" },
    { label: "Sliding at base (friction only)", demand: r1(baseShearT), resistance: r1(slideResistance), fos: r2(fosSl), target: TARGET, ok: fosSl >= TARGET, unit: "kN" },
    { label: "Gross uplift (0.9·DL vs wind uplift)", demand: r1(upliftKn), resistance: r1(restoringDead), fos: r2(fosUp), target: TARGET, ok: fosUp >= TARGET, unit: "kN" },
  ];

  /* ---- anchorage: what the failed/passing checks demand of the hold-down bolts ---- */
  const columns = Math.max(1, input.gridCols * input.gridRows);
  const boltsPerColumn = Math.max(1, site.anchorBoltsPerColumn);
  const totalBolts = columns * boltsPerColumn;

  // Hold-down demand: bring overturning up to the target FoS via a tension line at the windward edge,
  // plus every column's share of the direct uplift. Shear: the full base shear through all bolts
  // (friction is not relied on once anchors are provided — conservative and simple to review).
  const deficitM = Math.max(0, TARGET * mo - mr);
  const windwardCols = Math.max(1, input.gridCols);
  const tensionLine = W > 0 ? deficitM / W : 0;
  const tensionPerCol = tensionLine / windwardCols + upliftKn / columns;
  const tensionPerBolt = tensionPerCol / boltsPerColumn;
  const shearPerBolt = baseShearT / totalBolts;

  let chosen = ANCHOR_BOLTS[ANCHOR_BOLTS.length - 1];
  for (const b of ANCHOR_BOLTS) {
    if (tensionPerBolt / b.tensionKn + shearPerBolt / b.shearKn <= 1) { chosen = b; break; }
  }
  const utilisation = tensionPerBolt / chosen.tensionKn + shearPerBolt / chosen.shearKn;
  const anchorageRequired = stability.some((s) => !s.ok) || tensionPerBolt > 0.5;
  if (utilisation > 1) warnings.push("Anchor demand exceeds the largest tabulated bolt — the foundation anchorage needs specific design by the structural engineer.");

  const anchorage: AnchorageSheet = {
    required: anchorageRequired,
    columns,
    boltsPerColumn,
    totalBolts,
    tensionPerBoltKn: r2(tensionPerBolt),
    shearPerBoltKn: r2(shearPerBolt),
    recommendedBolt: chosen.name,
    boltSafeTensionKn: chosen.tensionKn,
    boltSafeShearKn: chosen.shearKn,
    utilisation: r2(utilisation),
  };

  /* ---- connection schedule (ties the "connecting" ask to the numbers above) ---- */
  const connections = [
    {
      item: "Column base / hold-down",
      detail: `${boltsPerColumn} anchor bolts per column × ${columns} columns, cast into the footing/pedestal`,
      spec: `${chosen.name} — demand ${r2(tensionPerBolt)} kN tension + ${r2(shearPerBolt)} kN shear per bolt (util. ${r2(utilisation)})`,
    },
    {
      item: "Column ↔ base frame",
      detail: "Bolted cleat both sides of the column web at every grid point",
      spec: "2 × M12 grade 8.8 per cleat, nut + spring washer + flat washer, tightened to 80 Nm",
    },
    {
      item: "Roof frame ↔ columns",
      detail: "Bolted end plates at each column head; purlins cleated to the roof members",
      spec: "2 × M12 grade 8.8 per joint; purlin cleats 1 × M12",
    },
    {
      item: "Wall panels ↔ frame",
      detail: "Self-drilling fasteners into every stud/rail crossing",
      spec: "SDS 5.5 × 55 @ ≤ 300 mm c/c on panel edges, ≤ 500 mm c/c in the field",
    },
    {
      item: "Roof sheets ↔ purlins",
      detail: "Crest-fixed with sealing washers — the UPLIFT-critical connection in wind",
      spec: `SDS 5.5 × 65 + EPDM washer @ every crest on end purlins (uplift ${r1(upliftKn)} kN over the roof), alternate crests mid-span`,
    },
    {
      item: "Cross bracing",
      detail: "X-bracing in the braced bays of each elevation (from the structure drawings)",
      spec: "Gusseted + bolted, 2 × M12 grade 8.8 per brace end",
    },
  ];

  /* ---- disclaimers (fixed — the professional boundary) ---- */
  const disclaimers = [
    "This is a STRUCTURAL DESIGN BASIS document generated from the configured colony — it is NOT a stability certificate.",
    "A stability certificate must be issued and signed by a licensed structural engineer after independent verification of these calculations, the site soil report and the final drawings.",
    "Wind analysis per IS 875 (Part 3) using pz = 0.6·Vz² without Kd/Ka/Kc refinement (conservative). Coefficients read for low, long, clad buildings.",
    "Stability by rigid-body statics on characteristic loads with 0.9·DL restoring and a target factor of safety of 1.5.",
    "Anchor capacities are indicative safe working loads for grade 8.8 — verify against the selected anchor product and concrete grade.",
  ];
  if (site.designLife === "5yr") {
    warnings.push("k1 taken as 0.82 (temporary, 5-year life). The certificate — when issued — will be limited to that service life.");
  }

  return { input, loading, wind, stability, anchorage, connections, warnings, disclaimers };
}
