/**
 * PUF PANEL BOTTOM LOCKING SYSTEM — the engineering core (Labour Colony studio).
 *
 * A real fabricated steel connection, not a decorative object:
 *
 *   • a BASE / ANCHOR PLATE is bolted down onto the RCC plinth beam with a nut-bolt assembly;
 *   • TWO MS C-PURLINS are welded upright onto that plate, webs facing each other, flanges turned
 *     AWAY from the panel;
 *   • the two webs bound a controlled RECEIVING POCKET whose clear width is
 *         pocket = selected PUF panel thickness + installation clearance;
 *   • the PUF wall panel's bottom edge drops into that pocket and is captured — the pocket limits
 *     sideways movement, closes the installation gap and stops the panel shaking.
 *
 * This module owns the ENTIRE engineering definition: the editable configuration, the deterministic
 * plate layout, the pocket arithmetic, the validation rules, the take-off (quantities + weights +
 * amounts) and the erection method statement. Everything downstream — the shared ColonyModel parts,
 * the 2D detail sheets, the 3D / exploded view, the assembly captions, the BOQ schedules and the
 * reports — reads THIS module. Nothing recomputes a pocket width, a piece count or a weight of its
 * own, so the drawing, the model and the BOQ can never disagree.
 *
 * UNITS: the configuration is in MILLIMETRES (how a fabricator specifies steel). Geometry handed to
 * the colony model is converted to colony METRES at the boundary (`platePocketGeometry`). No caller
 * should ever mix the two.
 *
 * Pure: no React, no three.js, no DOM — server-safe and unit-testable. Deliberately a ZERO-IMPORT
 * leaf module: `LabourColonyConfig` carries `pufLock?: PufLockConfig`, so anything this file imported
 * would become a dependency of the quotation engine. The grid is taken structurally instead.
 */

/* ------------------------------------------------------------------ constants ------------------ */

/**
 * The structural shape of one column-grid mark this module needs. Matches `ColumnMark` from
 * `@/lib/quotation/labourColonyRebar` by structure, without importing it (see the file header).
 */
export interface PufLockGridMark {
  /** Grid reference, e.g. "A-1". */
  grid: string;
  xM: number;
  yM: number;
}

/** Steel density factor: kg per metre per mm² of cross-section (7850 kg/m³). Matches LabourColonyNorms. */
const STEEL_KG_PER_M_PER_MM2 = 0.00785;
/** kg per mm³ of steel. */
const STEEL_KG_PER_MM3 = 7.85e-6;

/** The PUF panel thicknesses the locking system is dimensioned for (mm). */
export const PUF_PANEL_THICKNESS_OPTIONS = [30, 40, 50, 65, 70] as const;
export type PufPanelThicknessMm = (typeof PUF_PANEL_THICKNESS_OPTIONS)[number];

/**
 * The standing explanation the UI, the drawings and the reports must all show. Deliberately states
 * that drawing the connection does NOT make it structurally approved.
 */
export const PUF_LOCK_EXPLANATION =
  "The paired C-purlins form a bottom receiving pocket for the PUF wall panel. The pocket controls "
  + "lateral movement, limits installation gaps and prevents panel shaking. Final structural adequacy, "
  + "weld size, plate thickness and anchorage must be confirmed by the project engineer.";

/** The standing drawing notes for every PUF-lock detail sheet. */
export const PUF_LOCK_DRAWING_NOTES: string[] = [
  "All dimensions are in millimetres unless stated otherwise.",
  "Verify plate positions against the approved wall-panel layout before drilling.",
  "Maintain a uniform receiving gap based on the actual supplied panel thickness.",
  "Use a temporary spacer / template while positioning the paired C-purlins.",
  "Confirm plumb and alignment before final welding.",
  "Remove welding spatter and apply the approved protective coating.",
  "Provide sealant / isolation material where specified.",
  "Bolt grade, embedment, plate thickness and weld size are subject to structural-engineer approval.",
  "Do not force a panel into an undersized pocket.",
  "Do not leave excessive clearance that permits panel shaking.",
];

/* ------------------------------------------------------------------ configuration -------------- */

/** How the plate positions are decided. */
export type PufPlateLocationMode =
  | "auto-beam"          // evenly distributed along the selected (perimeter) plinth-beam runs
  | "grid-intersection"  // one plate at every structural grid intersection
  | "panel-joint"        // one plate at every wall-panel joint line
  | "custom-spacing"     // a fixed centre-to-centre spacing along each run
  | "manual";            // exactly the stored positions, nothing derived

/** Which way the two C-purlins face. The pocket is always bounded by the two WEBS. */
export type CPurlinOrientation =
  | "webs-inward"   // webs face the panel, flanges + lips turn away  (default — flat pocket faces)
  | "flanges-inward"; // flanges face the panel (a narrower bearing, kept for detailing choice)

export type PufAnchorType = "cast-in" | "chemical" | "mechanical";
export type PufWeldType = "fillet" | "groove";

/** The MS base / anchor plate bolted to the plinth beam. */
export interface PufLockPlateSpec {
  /** Plate dimension ALONG the wall line (mm). */
  lengthMm: number;
  /** Plate dimension ACROSS the wall line (mm). */
  widthMm: number;
  thicknessMm: number;
  grade: string;
  material: string;
  finish: string;
  /** Fabrication mark stem, e.g. "PL" → PL-01 … PL-12. */
  mark: string;
  boltHoleDiaMm: number;
  /** Holes drilled in the plate. Should equal the anchor `perPlate` count. */
  holeCount: number;
  edgeDistanceMm: number;
  /** Hole spacing ALONG the wall (mm). */
  holePitchMm: number;
  /** Hole spacing ACROSS the wall (mm). */
  holeGaugeMm: number;
  /** Material Master key the rate + weight resolve against. */
  materialKey: string;
  /** Per-project overrides. Material Master stays the default authority. */
  unitWeightKgOverride?: number;
  rateOverride?: number;
}

/** The holding-down assembly fixing one plate to the plinth beam. */
export interface PufLockAnchorSpec {
  diameterMm: number;
  lengthMm: number;
  grade: string;
  type: PufAnchorType;
  /** Bolts per plate. */
  perPlate: number;
  nutsPerBolt: number;
  washersPerBolt: number;
  embedmentMm: number;
  /** Thread projecting above the tightened nut (mm). */
  projectionMm: number;
  tighteningNote: string;
  materialKey: string;
  nutMaterialKey: string;
  washerMaterialKey: string;
  unitWeightKgOverride?: number;
  rateOverride?: number;
  nutRateOverride?: number;
  washerRateOverride?: number;
}

/** One of the two C-purlins welded upright on each plate (both share this spec). */
export interface PufLockPurlinSpec {
  /** Material Master key, e.g. "c-purlin-75x40". */
  materialKey: string;
  /** Display designation, e.g. "C 75 × 40 × 15 × 2.0 mm". */
  designation: string;
  /** Web depth (mm) — this is the UPSTAND height above the plate. */
  depthMm: number;
  /** Flange width (mm) — projects AWAY from the panel. */
  flangeMm: number;
  /** Lip return (mm). */
  lipMm: number;
  thicknessMm: number;
  /** Cut length of one piece, ALONG the wall (mm). */
  lengthMm: number;
  grade: string;
  finish: string;
  orientation: CPurlinOrientation;
  /** Pieces per plate. The system is defined as a PAIR — 2. */
  perPlate: number;
  partMark: string;
  weldType: PufWeldType;
  weldSizeMm: number;
  /** Weld run length per purlin (mm). Defaults to the purlin cut length. */
  weldLengthMm: number;
  /** Weld runs per purlin (both sides of the seating flange ⇒ 2). */
  weldRunsPerPurlin: number;
  unitWeightKgPerMOverride?: number;
  rateOverride?: number;
}

/** How the panel meets the pocket. */
export interface PufLockInterfaceSpec {
  /** The panel thickness the pocket is cut for (mm). */
  panelThicknessMm: number;
  /** When true, `panelThicknessMm` tracks the calculator's own panel thickness. */
  followConfigPanelThickness: boolean;
  /** Total installation clearance ADDED to the panel thickness to get the clear pocket (mm). */
  installationClearanceMm: number;
  /** Largest acceptable gap on ONE side before the panel can rattle (mm). */
  maxSideGapMm: number;
  /** How far the panel is pushed down into the pocket (mm). */
  insertionDepthMm: number;
  /** Clear space left under the panel bottom edge for the seating / sealant bed (mm). */
  seatingDepthMm: number;
  isolationStrip: boolean;
  isolationStripMaterial: string;
  isolationStripMaterialKey: string;
  sealantType: string;
  sealantMaterialKey: string;
  /** Optional screw fixing through the purlin web into the panel edge. */
  fastenerOption: boolean;
  fastenerSpec: string;
  fastenerMaterialKey: string;
  panelColour: string;
  panelFinish: string;
}

/** One plate, positioned on a plinth beam. */
export interface PufLockPlatePosition {
  /** Stable id — survives save / reload and never changes for a given plate. */
  id: string;
  /** Display / fabrication mark, e.g. "P01". */
  mark: string;
  /** Plan position, colony METRES. */
  xM: number;
  yM: number;
  /** Which way the wall (and therefore the purlin length) runs at this plate. */
  axis: "x" | "y";
  /** The plinth-beam run this plate sits on, e.g. "PB-row-0" / "PB-col-4". */
  beamId: string;
  /** Nearest gridline reference, e.g. "A-1". */
  gridRef: string;
  /** Offset from the nearest gridline along the run (mm) — what the setting-out table prints. */
  offsetMm: number;
  /** "auto" = derived by the layout engine; "manual" = placed / moved by the user. */
  source: "auto" | "manual";
}

/** The whole editable configuration. Persisted inside LabourColonyConfig.pufLock (jsonb, no migration). */
export interface PufLockConfig {
  enabled: boolean;
  /** Target number of plates. NOT derived from the grid — the reference layout is 12, not 15. */
  plateCount: number;
  /** When true the auto layout must honour `plateCount` exactly and never re-derive it. */
  plateCountLocked: boolean;
  mode: PufPlateLocationMode;
  /** Centre-to-centre target for "custom-spacing" (m). */
  spacingM: number;
  plate: PufLockPlateSpec;
  anchor: PufLockAnchorSpec;
  purlin: PufLockPurlinSpec;
  iface: PufLockInterfaceSpec;
  /** Stored plate positions. Manual entries are authoritative and survive a rebuild. */
  positions: PufLockPlatePosition[];
  /** True once the user has edited the layout — stops the auto layout from overwriting it. */
  layoutEdited: boolean;
  notes?: string;
}

/* ------------------------------------------------------------------ defaults ------------------- */

/**
 * The shipped default. Sized around a 50 mm PUF panel on a C 75 × 40 × 15 × 2.0 purlin — the section
 * that already exists in the Material Master as `c-purlin-75x40`, so the rate resolves out of the box.
 *
 * Plate 300 × 250 × 10: the paired purlins occupy 53 + 2 × 40 = 133 mm across the plate, leaving a
 * 58.5 mm strip each side for the holding-down bolts at a 170 mm gauge — clear of the purlin flanges.
 */
export const DEFAULT_PUF_LOCK_CONFIG: PufLockConfig = {
  enabled: true,
  plateCount: 12,
  plateCountLocked: true,
  mode: "auto-beam",
  spacingM: 3.0,
  plate: {
    lengthMm: 300,
    widthMm: 250,
    thicknessMm: 10,
    grade: "IS 2062 E250",
    material: "MS plate",
    finish: "Red-oxide primer + enamel",
    mark: "PL",
    boltHoleDiaMm: 18,
    holeCount: 4,
    edgeDistanceMm: 40,
    holePitchMm: 200,
    holeGaugeMm: 170,
    materialKey: "ms-plate-10",
  },
  anchor: {
    diameterMm: 16,
    lengthMm: 200,
    grade: "8.8",
    type: "chemical",
    perPlate: 4,
    nutsPerBolt: 1,
    washersPerBolt: 1,
    embedmentMm: 150,
    projectionMm: 25,
    tighteningNote: "Tighten to snug-tight + 1/3 turn. Do not over-torque the chemical anchor.",
    materialKey: "anchor-bolt-m16",
    nutMaterialKey: "nut-m16",
    washerMaterialKey: "washer-m16",
  },
  purlin: {
    materialKey: "c-purlin-75x40",
    designation: "C 75 × 40 × 15 × 2.0 mm",
    depthMm: 75,
    flangeMm: 40,
    lipMm: 15,
    thicknessMm: 2.0,
    lengthMm: 300,
    grade: "IS 811",
    finish: "Red-oxide primer",
    orientation: "webs-inward",
    perPlate: 2,
    partMark: "CP",
    weldType: "fillet",
    weldSizeMm: 5,
    weldLengthMm: 300,
    weldRunsPerPurlin: 2,
  },
  iface: {
    panelThicknessMm: 50,
    followConfigPanelThickness: true,
    installationClearanceMm: 3,
    maxSideGapMm: 4,
    insertionDepthMm: 60,
    seatingDepthMm: 10,
    isolationStrip: true,
    isolationStripMaterial: "EPDM isolation strip 3 mm",
    isolationStripMaterialKey: "epdm-strip-3",
    sealantType: "Neutral-cure silicone sealant",
    sealantMaterialKey: "sealant-silicone",
    fastenerOption: true,
    fastenerSpec: "Self-drilling screw 5.5 × 25 @ 400 c/c",
    fastenerMaterialKey: "selfdrill-screw",
    panelColour: "Off-white / RAL 9002",
    panelFinish: "PPGI both faces",
  },
  positions: [],
  layoutEdited: false,
};

/**
 * True for a wall built from insulated PANELS, which is what the bottom pocket receives. A plain GI
 * sheet wall is screwed to the framing and has no panel edge to capture, so the locking system stays
 * off by default there (the admin can still switch it on).
 */
export function isPanelWall(panelType: string | undefined): boolean {
  const t = (panelType ?? "PUF").trim().toUpperCase();
  return t !== "GI";
}

/** Deep-merge a persisted (possibly older / partial) config over the defaults. */
export function resolvePufLockConfig(stored: Partial<PufLockConfig> | undefined | null): PufLockConfig {
  const d = DEFAULT_PUF_LOCK_CONFIG;
  if (!stored) return { ...d, positions: [] };
  return {
    ...d,
    ...stored,
    plate: { ...d.plate, ...(stored.plate ?? {}) },
    anchor: { ...d.anchor, ...(stored.anchor ?? {}) },
    purlin: { ...d.purlin, ...(stored.purlin ?? {}) },
    iface: { ...d.iface, ...(stored.iface ?? {}) },
    positions: Array.isArray(stored.positions) ? stored.positions : [],
  };
}

/* ------------------------------------------------------------------ pocket arithmetic ---------- */

/**
 * The clear width of the receiving pocket (mm) — the ONE deterministic rule the whole feature turns on:
 *
 *     pocket clear gap = selected PUF panel thickness + installation clearance
 *
 * e.g. a 50 mm panel with a 2–4 mm clearance gives a 52–54 mm pocket. Nothing else may compute this.
 */
export function pocketClearGapMm(iface: PufLockInterfaceSpec): number {
  return round2(Math.max(0, iface.panelThicknessMm) + Math.max(0, iface.installationClearanceMm));
}

/** The gap on ONE side of the panel once it is centred in the pocket (mm). */
export function sideGapMm(iface: PufLockInterfaceSpec): number {
  return round2((pocketClearGapMm(iface) - iface.panelThicknessMm) / 2);
}

/** The overall width the assembly occupies ACROSS the wall (mm) — pocket + both purlin flanges. */
export function assemblyWidthMm(cfg: PufLockConfig): number {
  return round2(pocketClearGapMm(cfg.iface) + 2 * cfg.purlin.flangeMm);
}

/** Developed (flat) width of one lipped C section (mm) — web + 2 flanges + 2 lips. */
export function purlinDevelopedWidthMm(p: PufLockPurlinSpec): number {
  return p.depthMm + 2 * p.flangeMm + 2 * p.lipMm;
}

/** Unit weight of the C-purlin (kg/m), derived from the developed section unless overridden. */
export function purlinKgPerM(p: PufLockPurlinSpec): number {
  if (p.unitWeightKgPerMOverride && p.unitWeightKgPerMOverride > 0) return p.unitWeightKgPerMOverride;
  return round3(purlinDevelopedWidthMm(p) * p.thicknessMm * STEEL_KG_PER_M_PER_MM2);
}

/** Unit weight of one base plate (kg). */
export function plateUnitWeightKg(p: PufLockPlateSpec): number {
  if (p.unitWeightKgOverride && p.unitWeightKgOverride > 0) return p.unitWeightKgOverride;
  const gross = p.lengthMm * p.widthMm * p.thicknessMm;
  const holes = Math.max(0, p.holeCount) * (Math.PI / 4) * p.boltHoleDiaMm ** 2 * p.thicknessMm;
  return round3(Math.max(0, gross - holes) * STEEL_KG_PER_MM3);
}

/** Unit weight of one anchor bolt (kg) — shank volume + a 20 % head allowance. */
export function boltUnitWeightKg(a: PufLockAnchorSpec): number {
  if (a.unitWeightKgOverride && a.unitWeightKgOverride > 0) return a.unitWeightKgOverride;
  const shank = (Math.PI / 4) * a.diameterMm ** 2 * a.lengthMm;
  return round3(shank * STEEL_KG_PER_MM3 * 1.2);
}

/** Unit weight of one hex nut (kg) — hexagon prism less the threaded bore. */
export function nutUnitWeightKg(a: PufLockAnchorSpec): number {
  const af = a.diameterMm * 1.5;          // across flats
  const h = a.diameterMm * 0.8;           // nut height
  const hex = 0.866 * af * af * h;
  const bore = (Math.PI / 4) * a.diameterMm ** 2 * h;
  return round3(Math.max(0, hex - bore) * STEEL_KG_PER_MM3);
}

/** Unit weight of one plain washer (kg). */
export function washerUnitWeightKg(a: PufLockAnchorSpec): number {
  const od = a.diameterMm * 2;
  const id = a.diameterMm + 1;
  const t = Math.max(2, a.diameterMm * 0.2);
  return round3((Math.PI / 4) * (od * od - id * id) * t * STEEL_KG_PER_MM3);
}

/** Deposited weld metal per metre of fillet run (kg/m), incl. a 20 % reinforcement allowance. */
export function weldKgPerM(w: { weldSizeMm: number }): number {
  return round3(0.5 * w.weldSizeMm ** 2 * STEEL_KG_PER_M_PER_MM2 * 1.2);
}

/* ------------------------------------------------------------------ plate layout --------------- */

/** What the layout engine needs to know about the building it is laying plates out on. */
export interface PufLockContext {
  /** The structural column grid (A–E × 1–3) the plinth beams follow. */
  grid: PufLockGridMark[];
  /** Top of the plinth beam / finished plinth level (colony metres). */
  plinthTopZM: number;
  /** Plinth beam width (m) — a plate may not overhang it. */
  plinthBeamWidthM: number;
  /** The calculator's own selected panel thickness (mm) — the default the interface follows. */
  configPanelThicknessMm: number;
  /** The solid walled body (room band) the external PUF walls stand on, colony metres. */
  body: { x0: number; y0: number; x1: number; y1: number };
  /**
   * The calculator's wall panel type ("PUF" / "EPS" / "GI"). Decides the DEFAULT enabled state for a
   * project that has never configured the locking system — see `derivePufLock`.
   */
  panelType?: string;
  /** Wall-panel joint positions along each perimeter run, colony metres (optional). */
  panelJoints?: { axis: "x" | "y"; at: number; along: number[] }[];
}

/** One perimeter plinth-beam run an external PUF wall stands on. */
interface BeamRun {
  id: string;
  /** "x" = the run travels along x (a row); "y" = along y (a column). */
  axis: "x" | "y";
  /** The fixed ordinate of the run (y for an x-run, x for a y-run), metres. */
  at: number;
  /** Start / end of the run along its axis, metres. */
  from: number;
  to: number;
  /** Gridline stations along the run (metres) — plate offsets are measured from the nearest. */
  stations: { at: number; ref: string }[];
}

/** The four perimeter runs of the column grid — where the external PUF wall panels stand. */
function perimeterRuns(grid: PufLockGridMark[]): BeamRun[] {
  const xs = uniq(grid.map((c) => c.xM));
  const ys = uniq(grid.map((c) => c.yM));
  if (xs.length < 2 || ys.length < 2) return [];
  const letterAt = (x: number) => grid.find((c) => near(c.xM, x))?.grid?.split("-")[0] ?? "?";
  const numberAt = (y: number) => grid.find((c) => near(c.yM, y))?.grid?.split("-")[1] ?? "?";
  const xStations = (y: number) => xs.map((x) => ({ at: x, ref: `${letterAt(x)}-${numberAt(y)}` }));
  const yStations = (x: number) => ys.map((y) => ({ at: y, ref: `${letterAt(x)}-${numberAt(y)}` }));
  const y0 = ys[0], y1 = ys[ys.length - 1], x0 = xs[0], x1 = xs[xs.length - 1];
  return [
    { id: "PB-row-0", axis: "x", at: y0, from: x0, to: x1, stations: xStations(y0) },
    { id: `PB-row-${ys.length - 1}`, axis: "x", at: y1, from: x0, to: x1, stations: xStations(y1) },
    { id: "PB-col-0", axis: "y", at: x0, from: y0, to: y1, stations: yStations(x0) },
    { id: `PB-col-${xs.length - 1}`, axis: "y", at: x1, from: y0, to: y1, stations: yStations(x1) },
  ];
}

/** Largest-remainder apportionment of `total` across `weights` — hits `total` exactly. */
function apportion(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (w / sum) * total);
  const base = exact.map((v) => Math.floor(v));
  let left = total - base.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const o of order) {
    if (left <= 0) break;
    base[o.i] += 1;
    left -= 1;
  }
  return base;
}

const plateMark = (n: number): string => `P${String(n).padStart(2, "0")}`;

/** Nearest gridline station to a point along a run, and the offset from it (mm). */
function nearestStation(run: BeamRun, along: number): { ref: string; offsetMm: number } {
  let best = run.stations[0];
  for (const s of run.stations) {
    if (!best || Math.abs(s.at - along) < Math.abs(best.at - along)) best = s;
  }
  return { ref: best?.ref ?? "?", offsetMm: Math.round((along - (best?.at ?? 0)) * 1000) };
}

/** Materialise a position on a run at distance `along` from the run origin. */
function positionOn(run: BeamRun, along: number, index: number): PufLockPlatePosition {
  const st = nearestStation(run, along);
  return {
    id: `pl-${run.id}-${Math.round(along * 1000)}`,
    mark: plateMark(index + 1),
    xM: run.axis === "x" ? along : run.at,
    yM: run.axis === "x" ? run.at : along,
    axis: run.axis,
    beamId: run.id,
    gridRef: st.ref,
    offsetMm: st.offsetMm,
    source: "auto",
  };
}

/**
 * Derive the automatic plate layout.
 *
 * Plates carry the WALL PANELS, so they are distributed along the four PERIMETER plinth-beam runs
 * (where the external PUF walls stand) — deliberately NOT one per grid intersection. The reference
 * project wants 12 plates on a grid that has 15 intersections, and 12 is what it gets: the target
 * count is apportioned across the runs in proportion to their length and then spaced evenly INSIDE
 * each run, clear of the corner columns (which already carry their own column base plates).
 */
export function autoPlatePositions(cfg: PufLockConfig, ctx: PufLockContext): PufLockPlatePosition[] {
  const runs = perimeterRuns(ctx.grid);
  if (!runs.length) return [];

  if (cfg.mode === "grid-intersection") {
    return ctx.grid.map((c, i) => ({
      id: `pl-grid-${c.grid}`,
      mark: plateMark(i + 1),
      xM: c.xM,
      yM: c.yM,
      axis: "x" as const,
      beamId: `PB-${c.grid}`,
      gridRef: c.grid,
      offsetMm: 0,
      source: "auto" as const,
    }));
  }

  if (cfg.mode === "panel-joint" && ctx.panelJoints?.length) {
    const out: PufLockPlatePosition[] = [];
    let n = 0;
    for (const j of ctx.panelJoints) {
      const run = runs.find((r) => r.axis === j.axis && near(r.at, j.at));
      if (!run) continue;
      for (const along of j.along) out.push(positionOn(run, along, n++));
    }
    return dedupe(out);
  }

  if (cfg.mode === "custom-spacing") {
    const out: PufLockPlatePosition[] = [];
    let n = 0;
    const step = Math.max(0.3, cfg.spacingM);
    for (const run of runs) {
      const len = run.to - run.from;
      const count = Math.max(0, Math.floor(len / step) - 1);
      for (let i = 1; i <= count; i++) out.push(positionOn(run, run.from + i * step, n++));
    }
    return dedupe(out);
  }

  // "auto-beam" (and the fallback for "manual" with nothing stored yet)
  const target = Math.max(0, Math.round(cfg.plateCount));
  const lengths = runs.map((r) => Math.max(0, r.to - r.from));
  const per = apportion(lengths, target);
  const out: PufLockPlatePosition[] = [];
  let n = 0;
  runs.forEach((run, ri) => {
    const count = per[ri];
    const len = run.to - run.from;
    for (let i = 0; i < count; i++) {
      // interior stations only — the run ends are corner columns with their own base plates
      const along = run.from + (len * (i + 1)) / (count + 1);
      out.push(positionOn(run, along, n++));
    }
  });
  return dedupe(out);
}

/** Drop duplicate coordinates (same point within 1 mm) and renumber marks in a stable plan order. */
function dedupe(list: PufLockPlatePosition[]): PufLockPlatePosition[] {
  const seen = new Set<string>();
  const out: PufLockPlatePosition[] = [];
  for (const p of list) {
    const key = `${Math.round(p.xM * 1000)}:${Math.round(p.yM * 1000)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return renumber(out);
}

/** Sort into a stable plan order (y then x) and reissue P01…Pnn. */
export function renumber(list: PufLockPlatePosition[]): PufLockPlatePosition[] {
  return [...list]
    .sort((a, b) => a.yM - b.yM || a.xM - b.xM || a.id.localeCompare(b.id))
    .map((p, i) => ({ ...p, mark: plateMark(i + 1) }));
}

/**
 * The FINAL plate list the whole system uses.
 *
 * Once the user has touched the layout (`layoutEdited`), the stored positions are authoritative and
 * are never silently regenerated — manual placements must survive save / reload. Until then the auto
 * layout is used and is visibly an editable project default.
 */
export function resolvePlatePositions(cfg: PufLockConfig, ctx: PufLockContext): PufLockPlatePosition[] {
  if (!cfg.enabled) return [];
  if (cfg.layoutEdited || cfg.mode === "manual") return renumber(cfg.positions ?? []);
  if (cfg.positions?.length && cfg.plateCountLocked && cfg.positions.length === cfg.plateCount) {
    return renumber(cfg.positions);
  }
  return autoPlatePositions(cfg, ctx);
}

/* ------------------------------------------------------------------ geometry ------------------- */

/** Every solid of one locking assembly, in colony METRES. */
export interface PufLockAssemblyGeometry {
  plate: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number };
  /** The two purlins. `left` / `right` are the two sides of the pocket across the wall normal. */
  purlinLeft: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number };
  purlinRight: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number };
  /** The captured panel bottom edge, at the TRUE selected panel thickness. */
  panelSeat: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number };
  /** Bolt centres (x, y) in colony metres, with the bolt's z extent. */
  bolts: { x: number; y: number; z0: number; z1: number }[];
  /** The two weld runs, one along the foot of each purlin web. */
  welds: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }[];
  /** Sealant / isolation bed under the panel, inside the pocket. */
  bed: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number };
  /** Unit vector across the wall (the pocket axis). */
  normal: { x: number; y: number };
}

/**
 * Build the exact geometry of one assembly.
 *
 * Local frame: `t` runs ALONG the wall (the purlin length), `n` runs ACROSS it (the pocket width).
 * The pocket is centred on the plate centre; the purlin WEBS sit at ±gap/2 and their flanges project
 * OUTWARD, so the two purlins can never overlap each other and can never penetrate the panel.
 */
export function platePocketGeometry(
  cfg: PufLockConfig,
  pos: PufLockPlatePosition,
  plinthTopZM: number,
): PufLockAssemblyGeometry {
  const mm = (v: number) => v / 1000;
  const { plate, purlin, iface, anchor } = cfg;

  const halfLen = mm(plate.lengthMm) / 2;   // along the wall
  const halfWid = mm(plate.widthMm) / 2;    // across the wall
  const tPlate = mm(plate.thicknessMm);
  const gap = mm(pocketClearGapMm(iface));
  const flange = mm(purlin.flangeMm);
  const web = mm(purlin.thicknessMm);
  const depth = mm(purlin.depthMm);
  const pLen = mm(purlin.lengthMm) / 2;
  const panelT = mm(iface.panelThicknessMm);
  const insert = mm(iface.insertionDepthMm);
  const seat = mm(iface.seatingDepthMm);

  const alongX = pos.axis === "x";
  // unit vector across the wall
  const normal = alongX ? { x: 0, y: 1 } : { x: 1, y: 0 };

  const zPlate0 = plinthTopZM;
  const zPlate1 = zPlate0 + tPlate;
  const zPurlin1 = zPlate1 + depth;
  // the panel bottom sits `seatingDepth` above the plate; it is buried `insertionDepth` into the pocket
  const zSeat0 = zPlate1 + seat;
  const zSeat1 = zSeat0 + insert;

  /** Build a box from (along, across) half-extents about the plate centre. */
  const boxAt = (a0: number, a1: number, n0: number, n1: number, z0: number, z1: number) => {
    const cx = pos.xM, cy = pos.yM;
    return alongX
      ? { x0: cx + a0, x1: cx + a1, y0: cy + n0, y1: cy + n1, z0, z1 }
      : { x0: cx + n0, x1: cx + n1, y0: cy + a0, y1: cy + a1, z0, z1 };
  };

  /**
   * The pocket faces sit at ±gap/2 and each C section occupies its FULL flange width B outward from
   * there — a C is B deep across the wall whichever way it is turned. The orientation decides only
   * WHICH surface bounds the pocket (the flat web, or the two flange tips), which the enlarged 2D
   * detail draws; it must never change the space the section occupies, or a "flanges-inward" choice
   * would silently shrink the purlin to its 2 mm web and the pocket would stop being enclosed.
   */
  const lInner = -gap / 2;
  const lOuter = lInner - flange;
  const rInner = gap / 2;
  const rOuter = rInner + flange;
  void web;

  return {
    plate: boxAt(-halfLen, halfLen, -halfWid, halfWid, zPlate0, zPlate1),
    purlinLeft: boxAt(-pLen, pLen, Math.min(lInner, lOuter), Math.max(lInner, lOuter), zPlate1, zPurlin1),
    purlinRight: boxAt(-pLen, pLen, Math.min(rInner, rOuter), Math.max(rInner, rOuter), zPlate1, zPurlin1),
    panelSeat: boxAt(-pLen, pLen, -panelT / 2, panelT / 2, zSeat0, zSeat1),
    bolts: boltCentres(cfg, pos).map((b) => ({
      ...b,
      z0: zPlate0 - mm(anchor.embedmentMm),
      z1: zPlate1 + mm(anchor.projectionMm),
    })),
    // The fillet runs sit on the OUTBOARD face of each web, entirely clear of the pocket — a bead
    // straddling the pocket line would eat the installation clearance the panel needs.
    welds: [
      boxAt(-pLen, pLen, lInner - mm(purlin.weldSizeMm), lInner, zPlate1, zPlate1 + mm(purlin.weldSizeMm)),
      boxAt(-pLen, pLen, rInner, rInner + mm(purlin.weldSizeMm), zPlate1, zPlate1 + mm(purlin.weldSizeMm)),
    ],
    bed: boxAt(-pLen, pLen, -gap / 2, gap / 2, zPlate1, zSeat0),
    normal,
  };
}

/** Bolt-hole centres for one plate, in colony metres. */
export function boltCentres(cfg: PufLockConfig, pos: PufLockPlatePosition): { x: number; y: number }[] {
  const mm = (v: number) => v / 1000;
  const { plate, anchor } = cfg;
  const n = Math.max(1, Math.round(anchor.perPlate));
  const alongX = pos.axis === "x";
  const halfPitch = mm(plate.holePitchMm) / 2;   // along the wall
  const halfGauge = mm(plate.holeGaugeMm) / 2;   // across the wall
  const signs: [number, number][] = n >= 4
    ? [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    : n === 2
      ? [[-1, 0], [1, 0]]
      : [[0, 0]];
  const used = signs.slice(0, Math.min(n, signs.length));
  return used.map(([sa, sn]) => {
    const a = sa * halfPitch, nn = sn * halfGauge;
    return alongX ? { x: pos.xM + a, y: pos.yM + nn } : { x: pos.xM + nn, y: pos.yM + a };
  });
}

/* ------------------------------------------------------------------ validation ----------------- */

export type PufLockIssueLevel = "error" | "warning";

export interface PufLockIssue {
  code: string;
  level: PufLockIssueLevel;
  message: string;
  plateId?: string;
}

/**
 * Every engineering rule the spec calls for. Errors mean the detail as configured cannot be built;
 * warnings mean it can be built but a competent engineer would question it.
 */
export function validatePufLock(
  cfg: PufLockConfig,
  ctx: PufLockContext,
  positions: PufLockPlatePosition[],
): PufLockIssue[] {
  const out: PufLockIssue[] = [];
  if (!cfg.enabled) return out;

  const err = (code: string, message: string, plateId?: string) =>
    out.push({ code, level: "error", message, plateId });
  const warn = (code: string, message: string, plateId?: string) =>
    out.push({ code, level: "warning", message, plateId });

  const { plate, purlin, iface, anchor } = cfg;
  const gap = pocketClearGapMm(iface);
  const side = sideGapMm(iface);

  /* ---- the pocket itself ---- */
  if (gap < iface.panelThicknessMm) {
    err("pocket-undersized",
      `Clear pocket ${gap} mm is smaller than the ${iface.panelThicknessMm} mm panel — the panel cannot enter the pocket.`);
  }
  if (iface.installationClearanceMm <= 0) {
    err("pocket-no-clearance",
      "Installation clearance is zero or negative — the panel would have to be forced into the pocket.");
  }
  if (side > iface.maxSideGapMm) {
    warn("pocket-oversized",
      `Side gap ${side} mm exceeds the ${iface.maxSideGapMm} mm limit — the panel may shake in the pocket.`);
  }
  if (gap <= 0) err("pocket-invalid", "Clear pocket resolves to zero — check the panel thickness and clearance.");

  /* ---- the two purlins must neither overlap nor touch the panel ---- */
  if (gap <= 0) {
    err("purlin-overlap", "The two C-purlins overlap — the pocket has no clear width between the webs.");
  }
  if (iface.panelThicknessMm >= gap) {
    err("panel-penetrates-steel",
      `The ${iface.panelThicknessMm} mm panel is not narrower than the ${gap} mm pocket — the panel would penetrate the C-purlin webs.`);
  }
  if (!(purlin.depthMm > 0) || !(purlin.flangeMm > 0) || !(purlin.thicknessMm > 0)) {
    warn("purlin-section-missing",
      "The C-purlin section is incomplete — depth, flange and thickness are all required before fabrication.");
  }
  if (!(purlin.thicknessMm > 0)) {
    err("purlin-no-thickness", "C-purlin thickness is zero — a section cannot be fabricated with no thickness.");
  }
  if (!(purlin.weldSizeMm > 0) || !(purlin.weldLengthMm > 0)) {
    warn("weld-missing", "Weld size or weld length is missing — the plate-to-purlin connection is not specified.");
  }
  if (purlin.perPlate !== 2) {
    warn("purlin-pair", `The locking system is defined as a PAIR of C-purlins; ${purlin.perPlate} per plate is non-standard.`);
  }

  /* ---- the plate must physically carry the purlins and the bolts ---- */
  if (!(plate.thicknessMm > 0)) {
    err("plate-no-thickness", "Base-plate thickness is zero — a plate cannot be fabricated with no thickness.");
  }
  if (!(plate.lengthMm > 0) || !(plate.widthMm > 0)) {
    err("plate-no-size", "Base-plate length or width is zero.");
  }
  const needed = assemblyWidthMm(cfg);
  if (plate.widthMm < needed) {
    err("plate-too-narrow",
      `Base plate is ${plate.widthMm} mm across but the pocket plus both flanges needs ${needed} mm.`);
  }
  if (purlin.lengthMm > plate.lengthMm) {
    warn("purlin-overhangs-plate",
      `C-purlin length ${purlin.lengthMm} mm overhangs the ${plate.lengthMm} mm plate — the ends are unsupported.`);
  }
  if (plate.holeCount !== anchor.perPlate) {
    warn("hole-count-mismatch",
      `Plate has ${plate.holeCount} holes but ${anchor.perPlate} bolts per plate are specified.`);
  }
  if (plate.boltHoleDiaMm <= anchor.diameterMm) {
    warn("hole-clearance",
      `Bolt hole ${plate.boltHoleDiaMm} mm gives no clearance over the M${anchor.diameterMm} bolt.`);
  }
  // bolts must clear the purlin footprint across the plate
  const boltAcross = plate.holeGaugeMm / 2;
  const purlinAcross = needed / 2;
  if (boltAcross < purlinAcross) {
    warn("bolt-clashes-purlin",
      `Bolt gauge ${plate.holeGaugeMm} mm places the holding-down bolts under the C-purlin flanges (${round2(needed)} mm wide) — the nuts cannot be tightened.`);
  }
  if (plate.holeGaugeMm / 2 + plate.edgeDistanceMm > plate.widthMm / 2) {
    warn("bolt-edge-distance",
      `Bolt gauge ${plate.holeGaugeMm} mm leaves less than the ${plate.edgeDistanceMm} mm edge distance on a ${plate.widthMm} mm plate.`);
  }

  /* ---- anchorage ---- */
  if (anchor.embedmentMm < anchor.diameterMm * 6) {
    warn("embedment-shallow",
      `Embedment ${anchor.embedmentMm} mm is less than 6 × M${anchor.diameterMm} — confirm with the anchor manufacturer.`);
  }
  if (anchor.lengthMm < anchor.embedmentMm + plate.thicknessMm + anchor.projectionMm) {
    err("bolt-too-short",
      `Bolt length ${anchor.lengthMm} mm cannot deliver ${anchor.embedmentMm} mm embedment through a ${plate.thicknessMm} mm plate with ${anchor.projectionMm} mm projection.`);
  }

  /* ---- panel seating ---- */
  if (iface.insertionDepthMm < purlin.depthMm * 0.5) {
    warn("insertion-shallow",
      `Panel insertion ${iface.insertionDepthMm} mm is less than half the ${purlin.depthMm} mm pocket depth — the panel is poorly restrained.`);
  }
  if (iface.insertionDepthMm + iface.seatingDepthMm > purlin.depthMm) {
    warn("insertion-deep",
      `Insertion ${iface.insertionDepthMm} mm plus seating ${iface.seatingDepthMm} mm exceeds the ${purlin.depthMm} mm upstand.`);
  }

  /* ---- the layout ---- */
  if (!positions.length) {
    err("no-plates", "The locking system is enabled but no plates are placed.");
  }
  if (cfg.plateCountLocked && positions.length !== cfg.plateCount) {
    warn("plate-count-override",
      `Plate quantity is locked at ${cfg.plateCount} but ${positions.length} plates are placed.`);
  }

  const ids = new Set<string>();
  const coords = new Set<string>();
  const xs = uniq(ctx.grid.map((c) => c.xM));
  const ys = uniq(ctx.grid.map((c) => c.yM));
  const halfBeam = ctx.plinthBeamWidthM / 2;
  const halfPlateAcross = cfg.plate.widthMm / 2000;

  for (const p of positions) {
    if (ids.has(p.id)) err("duplicate-id", `Duplicate plate id ${p.id}.`, p.id);
    ids.add(p.id);
    const key = `${Math.round(p.xM * 1000)}:${Math.round(p.yM * 1000)}`;
    if (coords.has(key)) err("duplicate-position", `Two plates share the same coordinate (${p.mark}).`, p.id);
    coords.add(key);

    // must sit on a plinth-beam centreline (within the beam width)
    const onX = ys.some((y) => Math.abs(p.yM - y) <= halfBeam + 1e-6);
    const onY = xs.some((x) => Math.abs(p.xM - x) <= halfBeam + 1e-6);
    if (!onX && !onY) {
      warn("plate-off-beam", `Plate ${p.mark} does not sit on a plinth-beam centreline.`, p.id);
    }
    // must not overhang the beam across its width
    if (halfPlateAcross > halfBeam + 1e-6) {
      warn("plate-overhangs-beam",
        `Plate ${p.mark} is ${cfg.plate.widthMm} mm across but the plinth beam is only ${Math.round(ctx.plinthBeamWidthM * 1000)} mm wide.`,
        p.id);
    }
    // must be inside the grid footprint
    const insideX = p.xM >= xs[0] - 1e-6 && p.xM <= xs[xs.length - 1] + 1e-6;
    const insideY = p.yM >= ys[0] - 1e-6 && p.yM <= ys[ys.length - 1] + 1e-6;
    if (!insideX || !insideY) {
      err("plate-outside-grid", `Plate ${p.mark} lies outside the plinth-beam grid.`, p.id);
    }
    // must not land on a column base plate
    const onColumn = ctx.grid.some((c) => near(c.xM, p.xM, 0.15) && near(c.yM, p.yM, 0.15));
    if (onColumn) {
      warn("plate-clashes-column",
        `Plate ${p.mark} coincides with column ${ctx.grid.find((c) => near(c.xM, p.xM, 0.15) && near(c.yM, p.yM, 0.15))?.grid} — it clashes with the column base plate.`,
        p.id);
    }
  }

  /* ---- spacing / unsupported joints ---- */
  const spacings = consecutiveSpacings(positions);
  const maxSpacing = spacings.length ? Math.max(...spacings) : 0;
  if (maxSpacing > 3.5) {
    warn("spacing-wide",
      `Largest plate spacing is ${maxSpacing.toFixed(2)} m — wall-panel joints between plates may be unsupported.`);
  }
  if (ctx.panelJoints?.length) {
    const unsupported = countUnsupportedJoints(ctx.panelJoints, positions);
    if (unsupported > 0) {
      warn("joint-unsupported",
        `${unsupported} wall-panel joint${unsupported === 1 ? "" : "s"} fall between plates — add a plate at each joint or accept the span.`);
    }
  }

  return out;
}

/** Centre-to-centre spacing between consecutive plates on the same run (m). */
export function consecutiveSpacings(positions: PufLockPlatePosition[]): number[] {
  const byRun = new Map<string, PufLockPlatePosition[]>();
  for (const p of positions) {
    const list = byRun.get(p.beamId) ?? [];
    list.push(p);
    byRun.set(p.beamId, list);
  }
  const out: number[] = [];
  for (const list of byRun.values()) {
    const sorted = [...list].sort((a, b) => (a.axis === "x" ? a.xM - b.xM : a.yM - b.yM));
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1], b = sorted[i];
      out.push(Math.hypot(b.xM - a.xM, b.yM - a.yM));
    }
  }
  return out;
}

function countUnsupportedJoints(
  joints: NonNullable<PufLockContext["panelJoints"]>,
  positions: PufLockPlatePosition[],
): number {
  let n = 0;
  for (const j of joints) {
    for (const along of j.along) {
      const supported = positions.some((p) => {
        if (p.axis !== j.axis) return false;
        const at = p.axis === "x" ? p.yM : p.xM;
        const pos = p.axis === "x" ? p.xM : p.yM;
        return near(at, j.at, 0.15) && Math.abs(pos - along) <= 0.3;
      });
      if (!supported) n++;
    }
  }
  return n;
}

/* ------------------------------------------------------------------ take-off ------------------- */

/** The complete, single-source-of-truth quantity + weight + cost take-off for the locking system. */
export interface PufLockTakeoff {
  enabled: boolean;
  plates: number;
  /** Calculated as plates × purlin.perPlate — never hardcoded. */
  purlinPieces: number;
  purlinTotalLengthM: number;
  bolts: number;
  nuts: number;
  washers: number;
  weldRuns: number;
  weldTotalLengthM: number;
  /** Pocket geometry echoed for every consumer that must not recompute it. */
  pocketClearGapMm: number;
  sideGapMm: number;
  panelThicknessMm: number;
  /* unit weights */
  plateUnitKg: number;
  purlinKgPerM: number;
  boltUnitKg: number;
  nutUnitKg: number;
  washerUnitKg: number;
  weldKgPerM: number;
  /* totals */
  plateKg: number;
  purlinKg: number;
  boltKg: number;
  nutKg: number;
  washerKg: number;
  weldKg: number;
  electrodeKg: number;
  totalSteelKg: number;
  /* consumables */
  isolationStripM: number;
  sealantM: number;
  fasteners: number;
}

/** Build the take-off. `positions.length` drives every count — change the plates, everything follows. */
export function pufLockTakeoff(cfg: PufLockConfig, positions: PufLockPlatePosition[]): PufLockTakeoff {
  const n = cfg.enabled ? positions.length : 0;
  const { purlin, anchor, iface } = cfg;

  const purlinPieces = n * Math.max(0, Math.round(purlin.perPlate));
  const purlinTotalLengthM = round3(purlinPieces * (purlin.lengthMm / 1000));
  const bolts = n * Math.max(0, Math.round(anchor.perPlate));
  const weldRuns = purlinPieces * Math.max(0, Math.round(purlin.weldRunsPerPurlin));
  const weldTotalLengthM = round3(weldRuns * (purlin.weldLengthMm / 1000));

  const plateUnitKg = plateUnitWeightKg(cfg.plate);
  const kgm = purlinKgPerM(purlin);
  const boltUnitKg = boltUnitWeightKg(anchor);
  const nutUnitKg = nutUnitWeightKg(anchor);
  const washerUnitKg = washerUnitWeightKg(anchor);
  const wkgm = weldKgPerM(purlin);

  const plateKg = round3(n * plateUnitKg);
  const purlinKg = round3(purlinTotalLengthM * kgm);
  const boltKg = round3(bolts * boltUnitKg);
  const nuts = bolts * Math.max(0, Math.round(anchor.nutsPerBolt));
  const washers = bolts * Math.max(0, Math.round(anchor.washersPerBolt));
  const nutKg = round3(nuts * nutUnitKg);
  const washerKg = round3(washers * washerUnitKg);
  const weldKg = round3(weldTotalLengthM * wkgm);

  // one strip / sealant run along both faces of every purlin pair
  const stripM = iface.isolationStrip ? round3(purlinTotalLengthM) : 0;
  const sealM = round3(purlinTotalLengthM);
  const fasteners = iface.fastenerOption
    ? Math.max(0, Math.ceil((purlinTotalLengthM * 1000) / 400))
    : 0;

  return {
    enabled: cfg.enabled,
    plates: n,
    purlinPieces,
    purlinTotalLengthM,
    bolts,
    nuts,
    washers,
    weldRuns,
    weldTotalLengthM,
    pocketClearGapMm: pocketClearGapMm(iface),
    sideGapMm: sideGapMm(iface),
    panelThicknessMm: iface.panelThicknessMm,
    plateUnitKg,
    purlinKgPerM: kgm,
    boltUnitKg,
    nutUnitKg,
    washerUnitKg,
    weldKgPerM: wkgm,
    plateKg,
    purlinKg,
    boltKg,
    nutKg,
    washerKg,
    weldKg,
    // electrode / consumable allowance: deposited metal + 60 % stub, spatter and slag loss
    electrodeKg: round3(weldKg * 1.6),
    totalSteelKg: round3(plateKg + purlinKg + boltKg + nutKg + washerKg),
    isolationStripM: stripM,
    sealantM: sealM,
    fasteners,
  };
}

/* ------------------------------------------------------------------ derived bundle ------------- */

/** Everything a consumer needs, resolved once. */
export interface PufLockDerived {
  config: PufLockConfig;
  positions: PufLockPlatePosition[];
  takeoff: PufLockTakeoff;
  issues: PufLockIssue[];
  errors: PufLockIssue[];
  warnings: PufLockIssue[];
}

/**
 * Resolve the whole locking system from a stored config + the building it sits on. THE entry point —
 * the model builder, the drawings, the 3D view, the schedules and the reports all call this and
 * nothing else, so a quantity can never differ between two surfaces.
 */
export function derivePufLock(
  stored: Partial<PufLockConfig> | undefined | null,
  ctx: PufLockContext,
): PufLockDerived {
  const base = resolvePufLockConfig(stored);
  // the interface tracks the calculator's own panel thickness unless the user has pinned it
  const tracked: PufLockConfig = base.iface.followConfigPanelThickness
    ? { ...base, iface: { ...base.iface, panelThicknessMm: ctx.configPanelThicknessMm } }
    : base;

  /**
   * DEFAULT ENABLED STATE — on for a PANEL wall, off for a plain sheet wall.
   *
   * Applied here, in the core, rather than in the tab: the model builder, the schedules and the
   * drawings all resolve through this one function, so a UI-side default would have shown the tab
   * OFF while the 3D model and the BOQ still built the assemblies. Only ever applied when the
   * project has NEVER stored an explicit choice (`stored.enabled === undefined`) — once an admin
   * touches the switch their decision is authoritative and a panel-type change never overrides it.
   */
  const config: PufLockConfig = stored?.enabled === undefined
    ? { ...tracked, enabled: isPanelWall(ctx.panelType) }
    : tracked;

  const positions = resolvePlatePositions(config, ctx);
  const takeoff = pufLockTakeoff(config, positions);
  const issues = validatePufLock(config, ctx, positions);
  return {
    config,
    positions,
    takeoff,
    issues,
    errors: issues.filter((i) => i.level === "error"),
    warnings: issues.filter((i) => i.level === "warning"),
  };
}

/* ------------------------------------------------------------------ method statement ----------- */

export interface PufLockMethodStep {
  no: number;
  title: string;
  detail: string;
}

/**
 * The erection method statement — 16 model-driven steps. Every quantity is read from the resolved
 * take-off, so the sequence never narrates "12 plates" when a different quantity is configured.
 */
export function pufLockMethodSteps(d: PufLockDerived): PufLockMethodStep[] {
  const { config: c, positions, takeoff: t } = d;
  const first = positions[0]?.mark ?? "P01";
  const last = positions[positions.length - 1]?.mark ?? first;
  const plateSize = `${c.plate.lengthMm} × ${c.plate.widthMm} × ${c.plate.thicknessMm} mm`;
  const bolt = `M${c.anchor.diameterMm} × ${c.anchor.lengthMm} gr ${c.anchor.grade}`;
  const nPlates = t.plates;

  return [
    { no: 1, title: "Complete the plinth beam",
      detail: `Cast and cure the RCC plinth-beam grid. Confirm the top of beam is level and free of laitance before any plate is set.` },
    { no: 2, title: `Mark the ${nPlates} plate location${nPlates === 1 ? "" : "s"}`,
      detail: `Set out ${nPlates} plate position${nPlates === 1 ? "" : "s"} ${first}–${last} from the gridlines using the plate-layout drawing offsets.` },
    { no: 3, title: "Drill / form the anchor locations",
      detail: `Drill ${t.bolts} anchor hole${t.bolts === 1 ? "" : "s"} (${c.anchor.perPlate} per plate) to suit the ${bolt} ${c.anchor.type} anchor at ${c.anchor.embedmentMm} mm embedment. Blow the holes clean.` },
    { no: 4, title: "Install the anchor bolts",
      detail: `Set ${t.bolts} anchor bolts. Hold the ${c.plate.holeGaugeMm} mm gauge and ${c.plate.holePitchMm} mm pitch with a drilling template and let the anchor cure before loading.` },
    { no: 5, title: "Place and level the base plates",
      detail: `Lower ${nPlates} plate${nPlates === 1 ? "" : "s"} (${plateSize}, ${c.plate.grade}) over the bolts and level each one. Pack / grout as required.` },
    { no: 6, title: "Fit washers and nuts",
      detail: `Fit ${t.washers} washer${t.washers === 1 ? "" : "s"} and ${t.nuts} nut${t.nuts === 1 ? "" : "s"}. ${c.anchor.tighteningNote}` },
    { no: 7, title: "Align the first C-purlin",
      detail: `Set the first ${c.purlin.designation} on each plate with its web on the pocket line and the flange turned away from the panel.` },
    { no: 8, title: "Align the second C-purlin using a spacer",
      detail: `Use a ${t.pocketClearGapMm} mm spacer / template to position the second purlin — the pocket must match the ${t.panelThicknessMm} mm panel plus ${c.iface.installationClearanceMm} mm installation clearance.` },
    { no: 9, title: "Verify the clear pocket width",
      detail: `Check the clear pocket is ${t.pocketClearGapMm} mm at both ends of every plate. Maximum permitted side gap is ${c.iface.maxSideGapMm} mm.` },
    { no: 10, title: "Weld both C-purlins to the plate",
      detail: `Run ${t.weldRuns} × ${c.purlin.weldSizeMm} mm ${c.purlin.weldType} welds, ${c.purlin.weldLengthMm} mm each — ${t.weldTotalLengthM.toFixed(2)} m of weld in total across ${t.purlinPieces} purlin pieces.` },
    { no: 11, title: "Clean and coat the welds",
      detail: `Remove spatter and slag, wire-brush the heat-affected zone and apply ${c.purlin.finish} to all welded areas.` },
    { no: 12, title: "Apply the isolation strip / sealant",
      detail: c.iface.isolationStrip
        ? `Bed ${t.isolationStripM.toFixed(2)} m of ${c.iface.isolationStripMaterial} in the pocket, then apply ${c.iface.sealantType}.`
        : `Apply ${c.iface.sealantType} in the pocket (no isolation strip selected).` },
    { no: 13, title: "Lower the PUF panel into the pocket",
      detail: `Drop each ${t.panelThicknessMm} mm panel ${c.iface.insertionDepthMm} mm into the paired C-purlin pocket, keeping ${c.iface.seatingDepthMm} mm of seating below the panel edge.` },
    { no: 14, title: "Check plumb, alignment and gap",
      detail: `Plumb each panel and confirm the side gap stays within ${c.iface.maxSideGapMm} mm along the full pocket length.` },
    { no: 15, title: "Final panel fastening and sealing",
      detail: c.iface.fastenerOption
        ? `Fix ${t.fasteners} × ${c.iface.fastenerSpec} through the purlin web into the panel edge, then seal both faces.`
        : `Seal both faces of the pocket. No mechanical panel fastener is specified.` },
    { no: 16, title: "Complete the inspection",
      detail: `Record pocket width, plumb, weld size and coating for all ${nPlates} assemblies. ${PUF_LOCK_EXPLANATION}` },
  ];
}

/** The typical-assembly callout, e.g. "Typical assembly PA-01 — 1 plate + anchor set + 2 C-purlins". */
export function assemblyCallout(cfg: PufLockConfig, index = 0): string {
  const mark = `PA-${String(index + 1).padStart(2, "0")}`;
  return `Typical assembly ${mark} — 1 plate + anchor set + ${cfg.purlin.perPlate} C-purlins`;
}

/* ------------------------------------------------------------------ small helpers -------------- */

const near = (a: number, b: number, eps = 1e-3): boolean => Math.abs(a - b) <= eps;
const round2 = (v: number): number => Math.round(v * 100) / 100;
const round3 = (v: number): number => Math.round(v * 1000) / 1000;

function uniq(xs: number[], eps = 1e-3): number[] {
  const out: number[] = [];
  for (const x of [...xs].sort((a, b) => a - b)) {
    if (!out.length || Math.abs(out[out.length - 1] - x) > eps) out.push(x);
  }
  return out;
}
