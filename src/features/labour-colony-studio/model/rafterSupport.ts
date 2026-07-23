/**
 * RAFTER SUPPORT SYSTEM — cleat / seat plate → C-purlin → MS tube → covering (Labour Colony studio).
 *
 * A real fabricated steel connection, photographed on site and modelled here exactly as it is built:
 *
 *   1. a CLEAT / SEAT PLATE is BOLTED to the rafter (or ceiling beam) with a nut-bolt assembly —
 *      bolt head, washer, plate, rafter flange, washer, hex nut and the thread projecting beyond the
 *      nut are all separate solids, because the visible nut-bolt IS the point of the detail;
 *   2. an MS C-PURLIN BEARS on that cleat, running perpendicular to the rafters;
 *   3. an MS SQUARE / RECTANGULAR TUBE is BOLTED TO THE C-PURLIN WEB — side by side, the tube's side
 *      face FLUSH against the flat web face, the bolt passing horizontally THROUGH the web and through
 *      both walls of the tube;
 *   4. the COVERING is fixed to the tube, and the TUBE SPACING is set by the covering module:
 *        • a CEILING (ground floor and every intermediate floor) is lined with 8 ft × 4 ft
 *          (2440 × 1220 mm) fibre-cement / bison board. Every sheet edge must land on a tube, so the
 *          valid spacings are 2440 / n and the default is 1220 mm c/c — a 2440 sheet then spans two
 *          bays with both edges AND its mid-point borne.
 *        • the TOP-FLOOR SLOPED ROOF is covered with PUF roof panel of 1000 mm COVER WIDTH laid DOWN
 *          the slope, one panel interlocking into the next. The 1000 mm recurs ACROSS the slope (the
 *          side joints), while the tube spacing measured ALONG the rake is the panel SPAN.
 *
 * MOUNTING DIRECTION is decided by the level, not by the user, because it is a physical consequence:
 *   • a ROOF level builds UPWARD  — cleat ON the rafter top, purlin ON the cleat, tube top flush with
 *     the purlin top, panel laid ON the tube;
 *   • a CEILING level builds DOWNWARD — cleat UNDER the beam soffit, purlin UNDER the cleat, tube
 *     bottom flush with the purlin bottom, board screwed UNDER the tube.
 * One signed factor (`dir`) mirrors the whole assembly, so a ceiling board can never be driven through
 * the cleat it is supposed to hang below.
 *
 * This module owns the ENTIRE engineering definition: the editable configuration, the module
 * arithmetic (sheet layout, panel layout, spacing), the deterministic cleat layout, the connection
 * geometry, the validation rules, the take-off (counts + running lengths + weights) and the erection
 * method statement. Everything downstream — the shared ColonyModel parts, the 2D detail sheets, the
 * 3D / exploded view, the assembly captions, the BOQ schedules and the reports — reads THIS module.
 * Nothing recomputes a spacing, a sheet count or a weight of its own, so the drawing, the model and
 * the BOQ can never disagree.
 *
 * UNITS: the configuration is in MILLIMETRES (how a fabricator specifies steel). Geometry handed to
 * the colony model is converted to colony METRES at the boundary (`rafterCleatGeometry` /
 * `tubeRunGeometry`). No caller should ever mix the two.
 *
 * Pure: no React, no three.js, no DOM — server-safe and unit-testable. Deliberately a ZERO-IMPORT
 * leaf module, exactly like `pufLock.ts`: `LabourColonyConfig` will carry
 * `rafterSupport?: RafterSupportConfig`, so anything this file imported would become a dependency of
 * the quotation engine. The column grid, the rafter lines, the floor levels, the slope and the
 * building body are all taken STRUCTURALLY through `RafterSupportContext`.
 */

/* ------------------------------------------------------------------ constants ------------------ */

/**
 * The structural shape of one column-grid mark this module needs. Matches `ColumnMark` from
 * `@/lib/quotation/labourColonyRebar` and `PufLockGridMark` by structure, without importing either
 * (see the file header).
 */
export interface RafterSupportGridMark {
  /** Grid reference, e.g. "A-1". */
  grid: string;
  xM: number;
  yM: number;
}

/** Steel density factor: kg per metre per mm² of cross-section (7850 kg/m³). Matches LabourColonyNorms. */
const STEEL_KG_PER_M_PER_MM2 = 0.00785;
/** kg per mm³ of steel. */
const STEEL_KG_PER_MM3 = 7.85e-6;

/** Coordinate tolerance in metres (1 mm) — the resolution the whole colony model works to. */
const EPS_M = 1e-6;

/**
 * A residual below this (mm) is a rounding artefact, not a piece of material: no cut board, no cut
 * panel, no closing tube line. It is deliberately NOT `edgeToleranceMm`, which answers a different
 * question (how far an edge may miss a tube centreline before it counts as unsupported) and which
 * silently suppressed up to 10 mm of real, billed-but-never-bought ceiling when it was reused here.
 */
const CUT_THRESHOLD_MM = 1;

/** `CUT_THRESHOLD_MM` in colony metres — the residual at which `tubeLinesFor` adds a closing line. */
const CUT_THRESHOLD_M = CUT_THRESHOLD_MM / 1000;

/**
 * The tightest tube spacing this module will lay out (mm). Below it — and at zero, at a negative value
 * and at a cleared field that persisted as null — no line list is produced at all and
 * `tube-spacing-invalid` reports it. A cleared spacing used to be clamped to 1 mm centres, which
 * generated 132 011 lines on a 30 × 12 m building and threw `RangeError: Maximum call stack size
 * exceeded` out of `deriveRafterSupport` before any of it could be validated.
 */
const MIN_TUBE_SPACING_MM = 10;

/** Most `sheet-joint-off-tube` issues one level may raise before they are summarised. */
const MAX_JOINT_ISSUES_PER_LEVEL = 12;

/**
 * The standing explanation the UI, the drawings and the reports must all show. Deliberately states
 * that drawing the connection does NOT make it structurally approved.
 */
export const RAFTER_SUPPORT_EXPLANATION =
  "The cleat plate is bolted to the rafter, the C-purlin bears on the cleat, and the MS tube is bolted "
  + "flush to the C-purlin web with the bolt passing through the web and both tube walls. The covering "
  + "is fixed to the tube, so the TUBE SPACING is set by the covering module — 2440 / n for an 8 ft × "
  + "4 ft ceiling board, and the permitted span for a 1000 mm cover-width PUF roof panel. Final "
  + "structural adequacy, member sizes, plate thickness, bolt grade and fixing centres must be "
  + "confirmed by the project engineer.";

/**
 * The mandatory approval disclaimer. Every detail sheet, schedule and report that prints this system
 * must print this string verbatim — a modelled connection is not an approved connection.
 */
export const RAFTER_SUPPORT_APPROVAL_DISCLAIMER =
  "ENGINEER APPROVAL REQUIRED — this detail is a fabrication model, not a structural certificate. "
  + "Member sizes, cleat thickness, bolt diameter, grade, edge distances, fixing centres and the "
  + "covering span shown here are drawing defaults and must be checked and approved by the project "
  + "structural engineer before fabrication or erection.";

/** The standing drawing notes for every rafter-support detail sheet. */
export const RAFTER_SUPPORT_DRAWING_NOTES: string[] = [
  "All dimensions are in millimetres unless stated otherwise.",
  "Set the tube centrelines out from the covering module, not from the rafter positions — the covering is fixed to the tubes.",
  "Every ceiling-board edge must land on a tube centreline; valid tube spacings are the sheet length divided by a whole number.",
  "Drill the cleat and the rafter flange together, or use a drilling template, before any member is lifted.",
  "The MS tube face must sit FLUSH against the C-purlin web — no packing, no gap, no partial bearing.",
  "The tube-to-purlin bolt passes through the web and through BOTH walls of the tube. Do not fix into a single wall.",
  "Fit a washer under the bolt head and under the nut on every bolt.",
  "Check that the thread projects beyond the tightened nut on every bolt before sign-off.",
  "Do not weld the tube to the purlin unless the approved detail says so — this is a bolted connection.",
  "Support every free covering edge; provide cross noggins at board joints running parallel to the tubes.",
  "Remove burrs and drilling swarf and apply the approved protective coating to all cut and drilled faces.",
  "Cleat thickness, bolt grade, edge distance and the covering span are subject to structural-engineer approval.",
];

/* ------------------------------------------------------------------ section libraries ---------- */

/**
 * The MS hollow sections the Material Master already carries, with their TABULATED unit weights.
 *
 * WHY THIS TABLE EXISTS AT ALL (and why it is not a second source of truth):
 * the geometric derivation `tubeSectionKgPerM` uses the sharp-corner mid-line rule
 *     kg/m = 2 · (width + depth − 2t) · t · 0.00785
 * which is a SHARP-CORNER UPPER BOUND: a rolled hollow section has radiused corners the rule does not
 * remove, so it never understates and usually overstates. Measured against `src/lib/boq/seedMaterials.ts`
 * (every row below is a byte-for-byte copy of its master row):
 *
 *     shs-50x50x2    3.014 vs 2.95   +2.17 %
 *     shs-50x50x3    4.427 vs 4.29   +3.19 %
 *     shs-40x40x2    2.386 vs 2.32   +2.84 %
 *     rhs-50x25x2    2.229 vs 2.23   −0.04 %   (this master row is itself a sharp-corner figure)
 *     rhs-100x50x3   6.782 vs 6.71   +1.07 %
 *
 * i.e. 0–3.2 %, NOT the "1–2 %" an earlier revision of this comment claimed. Since a 2–3 % silent
 * overstatement of every tube in the take-off is real money, `tubeKgPerM` resolves in this order:
 *     1. the config's own `unitWeightKgPerMOverride` (a project decision always wins);
 *     2. THIS TABLE, matched on `materialKey` AND on the section dimensions, i.e. the tabulated
 *        Material Master weight — so a catalogue section is never billed at the geometric bound
 *        whether or not the picker remembered to seed an override;
 *     3. the sharp-corner geometry, the honest fallback for a section nobody has tabulated.
 * This module is a zero-import leaf and cannot read the Material Master, so the five rows are mirrored
 * here; `tube-unit-weight-drift` warns whenever the value in force disagrees with the tabulated row by
 * more than 2 %, which is what makes the mirror self-checking rather than a silent second truth.
 */
export interface TubeSectionOption {
  materialKey: string;
  designation: string;
  /** Across the tube run (mm) — the dimension the bolt passes through. */
  widthMm: number;
  /** Vertical (mm) — the dimension that governs the covering span. */
  depthMm: number;
  wallThicknessMm: number;
  /** The Material Master's tabulated kg/m (IS 4923), including corner radii. */
  masterKgPerM: number;
}

export const TUBE_SECTION_LIBRARY: readonly TubeSectionOption[] = [
  { materialKey: "shs-50x50x2", designation: "SHS 50 × 50 × 2.0 mm", widthMm: 50, depthMm: 50, wallThicknessMm: 2.0, masterKgPerM: 2.95 },
  { materialKey: "shs-50x50x3", designation: "SHS 50 × 50 × 3.0 mm", widthMm: 50, depthMm: 50, wallThicknessMm: 3.0, masterKgPerM: 4.29 },
  { materialKey: "shs-40x40x2", designation: "SHS 40 × 40 × 2.0 mm", widthMm: 40, depthMm: 40, wallThicknessMm: 2.0, masterKgPerM: 2.32 },
  { materialKey: "rhs-50x25x2", designation: "RHS 50 × 25 × 2.0 mm", widthMm: 25, depthMm: 50, wallThicknessMm: 2.0, masterKgPerM: 2.23 },
  { materialKey: "rhs-100x50x3", designation: "RHS 100 × 50 × 3.0 mm", widthMm: 50, depthMm: 100, wallThicknessMm: 3.0, masterKgPerM: 6.71 },
] as const;

/**
 * The lipped C sections the Material Master already carries.
 *
 * Unlike the hollow sections, the developed-width rule
 *     kg/m = (web + 2 · flange + 2 · lip) · t · 0.00785
 * reproduces EVERY master row exactly (2.9045 / 3.6110 / 4.1605 / 6.2800 against 2.90 / 3.61 / 4.16 /
 * 6.28), because a cold-formed C really is a folded flat strip. No override is needed for a C-purlin —
 * the geometry alone is trustworthy, and `purlinKgPerM` derives it.
 */
export interface PurlinSectionOption {
  materialKey: string;
  designation: string;
  depthMm: number;
  flangeMm: number;
  lipMm: number;
  thicknessMm: number;
  masterKgPerM: number;
}

export const PURLIN_SECTION_LIBRARY: readonly PurlinSectionOption[] = [
  { materialKey: "c-purlin-75x40", designation: "C 75 × 40 × 15 × 2.0 mm", depthMm: 75, flangeMm: 40, lipMm: 15, thicknessMm: 2.0, masterKgPerM: 2.90 },
  { materialKey: "c-purlin-100x50", designation: "C 100 × 50 × 15 × 2.0 mm", depthMm: 100, flangeMm: 50, lipMm: 15, thicknessMm: 2.0, masterKgPerM: 3.61 },
  { materialKey: "c-purlin-125x50", designation: "C 125 × 50 × 20 × 2.0 mm", depthMm: 125, flangeMm: 50, lipMm: 20, thicknessMm: 2.0, masterKgPerM: 4.16 },
  { materialKey: "c-purlin-150x65", designation: "C 150 × 65 × 20 × 2.5 mm", depthMm: 150, flangeMm: 65, lipMm: 20, thicknessMm: 2.5, masterKgPerM: 6.28 },
] as const;

/** Look up a catalogue tube section by Material Master key. */
export function tubeSectionOption(materialKey: string): TubeSectionOption | undefined {
  return TUBE_SECTION_LIBRARY.find((o) => o.materialKey === materialKey);
}

/** Look up a catalogue C-purlin section by Material Master key. */
export function purlinSectionOption(materialKey: string): PurlinSectionOption | undefined {
  return PURLIN_SECTION_LIBRARY.find((o) => o.materialKey === materialKey);
}

/* ------------------------------------------------------------------ configuration -------------- */

/** Which covering a level carries, and therefore which way the assembly is mounted. */
export type RafterSupportLevelKind = "ceiling" | "roof";

/** Which plan axis the C-purlin / MS tube run travels along. Spacing is measured on the other axis. */
export type RafterSupportRunAxis = "x" | "y";

/** Which side of the C-purlin web the MS tube is bolted to. */
export type TubeWebSide = "positive" | "negative";

/**
 * The MS cleat / seat plate bolted to the rafter. The C-purlin bears on it.
 *
 * The plate is centred on the WEB-FACE line (the plane where the tube meets the purlin web), NOT on
 * the purlin, so its bolts can sit outboard of BOTH the purlin flange and the tube — otherwise a bolt
 * head would foul the purlin it is supposed to be carrying.
 */
export interface RafterCleatSpec {
  /** Plate dimension ALONG the purlin / tube run (mm). */
  lengthMm: number;
  /** Plate dimension ACROSS the run (mm) — must span the purlin flange, the tube and both bolt rows. */
  widthMm: number;
  thicknessMm: number;
  grade: string;
  material: string;
  finish: string;
  /** Fabrication mark stem, e.g. "CL" → CL-01 … CL-nn. */
  mark: string;
  boltHoleDiaMm: number;
  /** Holes drilled in the cleat. Should equal `bolt.perCleat`. */
  holeCount: number;
  edgeDistanceMm: number;
  /** Hole spacing ALONG the run (mm). */
  holePitchMm: number;
  /** Hole spacing ACROSS the run (mm). */
  holeGaugeMm: number;
  /** Material Master key the rate + weight resolve against. */
  materialKey: string;
  /** Per-project overrides. Material Master stays the default authority. */
  unitWeightKgOverride?: number;
  rateOverride?: number;
}

/**
 * The nut-bolt assembly. ONE bolt size serves the whole connection (a fabricator carries one spanner),
 * but the two joints have very different grips, so two lengths are specified:
 *   • `lengthMm`    — the CLEAT bolt: washer + cleat + rafter flange + washer + nut + projection;
 *   • `webLengthMm` — the WEB bolt: washer + purlin web + the FULL tube width (both walls) + washer +
 *                     nut + projection. A 50 mm tube alone needs 50 mm of grip, which is why this bolt
 *                     is roughly twice as long as the cleat bolt.
 * Every one of head, washers, shank, nut and the projecting thread is modelled as its own solid — the
 * visible nut-bolt is the whole point of the photographed detail.
 */
export interface RafterSupportBoltSpec {
  diameterMm: number;
  /** Cleat-to-rafter bolt length (mm). */
  lengthMm: number;
  /** Tube-to-purlin-web bolt length (mm) — must clear the web AND both tube walls. */
  webLengthMm: number;
  grade: string;
  /** Bolts fixing ONE cleat to the rafter. */
  perCleat: number;
  nutsPerBolt: number;
  washersPerBolt: number;
  /** Thread projecting beyond the tightened nut (mm). */
  projectionMm: number;
  /** Bolt-head height (mm) — modelled so the head is a visible solid. */
  headHeightMm: number;
  /** Across-flats of the head / nut (mm). */
  acrossFlatsMm: number;
  nutHeightMm: number;
  washerThicknessMm: number;
  washerOuterDiaMm: number;
  tighteningNote: string;
  materialKey: string;
  nutMaterialKey: string;
  washerMaterialKey: string;
  /**
   * Tabulated weight of ONE CLEAT bolt, i.e. of an M`diameterMm` × `lengthMm` assembly. It is applied
   * ONLY to that length — the web bolt is roughly twice as long, and letting one override stand for
   * both would silently halve the heavier of the two.
   */
  unitWeightKgOverride?: number;
  /** Tabulated weight of ONE WEB bolt (M`diameterMm` × `webLengthMm`). Derived geometrically if unset. */
  webUnitWeightKgOverride?: number;
  rateOverride?: number;
  nutRateOverride?: number;
  washerRateOverride?: number;
}

/** The MS C-purlin that bears on the cleat and carries the tube on its web. */
export interface RafterSupportPurlinSpec {
  /** Material Master key, e.g. "c-purlin-100x50". */
  materialKey: string;
  /** Display designation, e.g. "C 100 × 50 × 15 × 2.0 mm". */
  designation: string;
  /** Web depth (mm) — vertical. Must be at least the tube depth or the tube cannot sit flush. */
  depthMm: number;
  /** Flange width (mm) — projects AWAY from the tube so the web face stays flat and clear. */
  flangeMm: number;
  /** Lip return (mm). */
  lipMm: number;
  thicknessMm: number;
  grade: string;
  finish: string;
  /** Standard cut / stock length of one piece (mm). Long runs are made up of ceil(run / this) pieces. */
  lengthMm: number;
  partMark: string;
  unitWeightKgPerMOverride?: number;
  rateOverride?: number;
}

/**
 * The MS square / rectangular tube bolted to the C-purlin web.
 *
 * ORIENTATION IS FIXED BY THE USER'S DECISION and is not a choice: side by side with the purlin, the
 * tube's side face FLUSH against the web, the bolt passing horizontally THROUGH the web and both tube
 * walls. `widthMm` is therefore the dimension the bolt travels through, and `depthMm` is the vertical
 * dimension that governs the covering span.
 */
export interface RafterSupportTubeSpec {
  /** Material Master key, e.g. "shs-50x50x2". */
  materialKey: string;
  /** Display designation, e.g. "SHS 50 × 50 × 2.0 mm". */
  designation: string;
  /** ACROSS the run (mm) — the bolt passes through this dimension, through both walls. */
  widthMm: number;
  /** VERTICAL (mm) — governs the covering span. */
  depthMm: number;
  wallThicknessMm: number;
  grade: string;
  finish: string;
  /** Standard cut / stock length of one piece (mm). */
  lengthMm: number;
  partMark: string;
  /** Which side of the web the tube is bolted to. */
  sideOfWeb: TubeWebSide;
  /**
   * How far the tube's FIXING face stands proud of the purlin's corresponding face (mm).
   * 0 = flush (the shipped default): the covering then bears on the tube and the purlin flange
   * together. A positive value lifts the tube so the covering bears on the tube alone.
   */
  faceOffsetMm: number;
  /** Bolts clamping the tube to the web at ONE cleat / connection. */
  boltsPerConnection: number;
  /** Spacing of those bolts ALONG the run (mm). */
  boltPitchMm: number;
  /** Largest permitted cantilever of the tube beyond the outermost cleat (mm). */
  maxOverhangMm: number;
  unitWeightKgPerMOverride?: number;
  rateOverride?: number;
}

/**
 * The 8 ft × 4 ft ceiling board. THE SHEET LENGTH DRIVES THE TUBE SPACING: the only spacings that put
 * a tube under every sheet edge are `sheetLengthMm / n`, and 1220 (n = 2) is the shipped default.
 */
export interface CeilingSheetSpec {
  /** 8 ft = 2440 mm. Runs ACROSS the tubes, so its edges land on tube centrelines. */
  sheetLengthMm: number;
  /** 4 ft = 1220 mm. Runs ALONG the tubes. */
  sheetWidthMm: number;
  thicknessMm: number;
  material: string;
  materialKey: string;
  /** Requested tube centre-to-centre spacing (mm). Must divide `sheetLengthMm` exactly. */
  tubeSpacingMm: number;
  /** Board-to-board joint gap left for movement (mm). */
  jointGapMm: number;
  /** How far a sheet edge may miss a tube centreline before it counts as unsupported (mm). */
  edgeToleranceMm: number;
  /** Cross noggins between the tubes at every joint running PARALLEL to the tubes. */
  crossNoggins: boolean;
  fixingSpec: string;
  fixingMaterialKey: string;
  /** Screw centres along every supporting member (mm). */
  fixingSpacingMm: number;
  /** Largest permitted unsupported board overhang beyond the last tube (mm). */
  maxOverhangMm: number;
  /** kg per m² of board — the Material Master's `cementboard-18` value, editable per project. */
  unitWeightKgPerSqm: number;
  rateOverride?: number;
}

/**
 * The sloped-roof PUF panel. The 1000 mm is the COVER WIDTH ACROSS the slope (side joints recur every
 * 1000 mm), the panel LENGTH runs DOWN the slope, and the tube spacing measured along the rake is the
 * panel SPAN.
 *
 * NOTE: the Material Master's `puf-panel-50` row is 3.0 × 1.15 m — that is the WALL panel. The roof
 * panel's 1000 mm cover width is a configuration value here and is deliberately NOT taken from that
 * row; only the kg/m² is shared, because a panel's weight per square metre does not depend on how wide
 * the sheet is rolled.
 */
export interface RoofPanelSpec {
  /** COVER width across the slope (mm) — the effective width after the side lap, not the sheet width. */
  coverWidthMm: number;
  thicknessMm: number;
  panelType: string;
  materialKey: string;
  sideLapDetail: string;
  /** Requested tube centre-to-centre spacing along the rake (mm) — this is the panel span. */
  tubeSpacingMm: number;
  /** Largest span the panel may bridge between tubes (mm). */
  maxSpanMm: number;
  /** Longest panel that can be rolled / transported (mm). A longer slope is made up with an end lap. */
  maxPanelLengthMm: number;
  /** End lap where two panels meet down the slope (mm). */
  endLapMm: number;
  /** Largest permitted unsupported panel overhang beyond the last tube (mm). */
  maxOverhangMm: number;
  fixingSpec: string;
  fixingMaterialKey: string;
  /** Fixings per panel at every support line. */
  fixingsPerPanelPerSupport: number;
  colour: string;
  finish: string;
  /** kg per m² — the Material Master's `puf-panel-50` value, editable per project. */
  unitWeightKgPerSqm: number;
  rateOverride?: number;
}

/**
 * One level the system is built at.
 *
 * A G+1 colony resolves to a CEILING level over the ground floor plus a sloped ROOF level on top; a
 * G-only colony resolves to the roof level alone; a G+2 colony gets two ceiling levels and the roof.
 * The list is derived from the building unless the admin has edited it (`levelsEdited`).
 */
export interface RafterSupportLevel {
  /** Stable id — survives save / reload, e.g. "lvl-ceiling-0" / "lvl-roof". */
  id: string;
  kind: RafterSupportLevelKind;
  /** Which floor this level belongs to. 0 = ground. */
  floorIndex: number;
  label: string;
  enabled: boolean;
  /** Optional per-level override of the run axis. Defaults to perpendicular to the rafter lines. */
  runAxis?: RafterSupportRunAxis;
  /** Optional per-level override of the tube spacing (mm). Defaults to the covering's own spacing. */
  tubeSpacingMmOverride?: number;
}

/** One cleat, positioned where a tube line crosses a rafter line. */
export interface RafterSupportCleatPosition {
  /** Stable id — never regenerated for a given cleat. */
  id: string;
  /** Display / fabrication mark, e.g. "RS-01". */
  mark: string;
  levelId: string;
  levelKind: RafterSupportLevelKind;
  floorIndex: number;
  /** Which tube line (0-based, in the spacing direction). */
  lineIndex: number;
  lineId: string;
  rafterId: string;
  /** Nearest gridline reference, e.g. "A-1". */
  gridRef: string;
  /** Offset from the nearest gridline along the run (mm) — what the setting-out table prints. */
  offsetMm: number;
  /** TUBE CENTRELINE plan position, colony METRES. The covering module is set out from this. */
  xM: number;
  yM: number;
  /** The rafter face the cleat bolts to, colony METRES (top for a roof, soffit for a ceiling). */
  seatZM: number;
  /** +1 = the assembly builds UP off the rafter (roof); −1 = it hangs DOWN under it (ceiling). */
  dir: 1 | -1;
  runAxis: RafterSupportRunAxis;
  /** Ordinate of the tube line in the spacing direction (m) — the module line. */
  acrossM: number;
  /** Distance of this line from the eave measured along the rake (m). Roof levels only; 0 otherwise. */
  rakeM: number;
  source: "auto" | "manual";
}

/** The whole editable configuration. Persisted inside LabourColonyConfig.rafterSupport (jsonb). */
export interface RafterSupportConfig {
  enabled: boolean;
  /** The levels the system is built at. Empty = derive from the building. */
  levels: RafterSupportLevel[];
  /** True once the admin has edited the level list — stops the auto derivation overwriting it. */
  levelsEdited: boolean;
  cleat: RafterCleatSpec;
  bolt: RafterSupportBoltSpec;
  purlin: RafterSupportPurlinSpec;
  tube: RafterSupportTubeSpec;
  ceilingSheet: CeilingSheetSpec;
  roofPanel: RoofPanelSpec;
  /** Length of the enlarged TYPICAL DETAIL segment drawn either side of one cleat (mm). */
  detailSegmentLengthMm: number;
  /** Stored cleat positions. Manual entries are authoritative and survive a rebuild. */
  positions: RafterSupportCleatPosition[];
  /** True once the user has moved / placed a cleat — the auto layout then never overwrites it. */
  layoutEdited: boolean;
  notes?: string;
}

/* ------------------------------------------------------------------ defaults ------------------- */

/**
 * The shipped default — every value chosen so the detail as drawn actually builds, and so the whole
 * default configuration raises NO errors:
 *
 *   cleat 200 × 150 × 8   the 200 mm width is the MINIMUM that works: the C-purlin flange (50) plus
 *                         the tube (50) occupy 100 mm, and the two bolt rows sit outboard of both at a
 *                         140 mm gauge with 30 mm edge distance ⇒ 140 + 2 × 30 = 200.
 *   M12 × 50 / × 100      the cleat grip is 3 + 8 + 6 + 3 + 10 + 10 = 40 mm (50 mm bolt); the web grip
 *                         is 3 + 2 + 50 + 3 + 10 + 10 = 78 mm, which is why the web bolt is 100 mm.
 *                         The Material Master's `bolt-m12` row is nominally an M12 × 50 assembly, so
 *                         the WEB bolt's rate should be reviewed — the length here is the engineering
 *                         truth and the take-off never silently shortens a bolt to suit a rate.
 *   C 100 × 50 × 15 × 2   depth 100 ≥ the 50 mm tube depth, so the tube CAN sit flush on the web; the
 *                         developed-width rule reproduces the master's 3.61 kg/m exactly.
 *   SHS 50 × 50 × 2       carries the master's tabulated 2.95 kg/m as an explicit override (see
 *                         TUBE_SECTION_LIBRARY for why the geometric rule alone reads 3.01).
 *   ceiling 2440 × 1220   @ 1220 c/c ⇒ n = 2, so every sheet edge AND every sheet mid-point is borne.
 *   roof panel 1000 cover @ 1200 c/c along the rake ⇒ a 1200 mm span, well inside the 1800 mm limit.
 */
export const DEFAULT_RAFTER_SUPPORT_CONFIG: RafterSupportConfig = {
  enabled: true,
  levels: [],
  levelsEdited: false,
  cleat: {
    lengthMm: 150,
    widthMm: 200,
    thicknessMm: 8,
    grade: "IS 2062 E250",
    material: "MS plate",
    finish: "Red-oxide primer + enamel",
    mark: "CL",
    boltHoleDiaMm: 14,
    holeCount: 4,
    edgeDistanceMm: 30,
    holePitchMm: 90,
    holeGaugeMm: 140,
    materialKey: "ms-plate-8",
  },
  bolt: {
    diameterMm: 12,
    lengthMm: 50,
    webLengthMm: 100,
    grade: "8.8",
    perCleat: 4,
    nutsPerBolt: 1,
    washersPerBolt: 2,
    projectionMm: 10,
    headHeightMm: 8,
    acrossFlatsMm: 19,
    nutHeightMm: 10,
    washerThicknessMm: 3,
    washerOuterDiaMm: 24,
    tighteningNote: "Tighten to snug-tight + 1/3 turn. A washer under the head AND under the nut on every bolt.",
    materialKey: "bolt-m12",
    nutMaterialKey: "nut-m12",
    washerMaterialKey: "washer-m12",
  },
  purlin: {
    materialKey: "c-purlin-100x50",
    designation: "C 100 × 50 × 15 × 2.0 mm",
    depthMm: 100,
    flangeMm: 50,
    lipMm: 15,
    thicknessMm: 2.0,
    grade: "IS 811",
    finish: "Red-oxide primer",
    lengthMm: 6000,
    partMark: "CP",
  },
  tube: {
    materialKey: "shs-50x50x2",
    designation: "SHS 50 × 50 × 2.0 mm",
    widthMm: 50,
    depthMm: 50,
    wallThicknessMm: 2.0,
    grade: "IS 4923 YSt 210",
    finish: "Red-oxide primer",
    lengthMm: 6000,
    partMark: "MT",
    sideOfWeb: "positive",
    faceOffsetMm: 0,
    boltsPerConnection: 2,
    boltPitchMm: 100,
    maxOverhangMm: 300,
    // the Material Master's tabulated IS 4923 weight — see TUBE_SECTION_LIBRARY
    unitWeightKgPerMOverride: 2.95,
  },
  ceilingSheet: {
    sheetLengthMm: 2440,
    sheetWidthMm: 1220,
    thicknessMm: 18,
    material: "Fibre cement / bison board",
    materialKey: "cementboard-18",
    tubeSpacingMm: 1220,
    jointGapMm: 3,
    edgeToleranceMm: 10,
    crossNoggins: true,
    fixingSpec: "Self-drilling screw 5.5 × 32 with washer @ 300 c/c",
    fixingMaterialKey: "selfdrill-screw",
    fixingSpacingMm: 300,
    maxOverhangMm: 150,
    unitWeightKgPerSqm: 23.4,
  },
  roofPanel: {
    coverWidthMm: 1000,
    thicknessMm: 50,
    panelType: "PUF roof panel — trapezoidal top skin, plain soffit",
    materialKey: "puf-panel-50",
    sideLapDetail: "Interlocking side lap over the male rib, concealed side-lap fixing",
    tubeSpacingMm: 1200,
    maxSpanMm: 1800,
    maxPanelLengthMm: 12000,
    endLapMm: 200,
    maxOverhangMm: 300,
    fixingSpec: "Self-drilling screw 5.5 × 90 with EPDM washer at every support",
    fixingMaterialKey: "selfdrill-screw",
    fixingsPerPanelPerSupport: 3,
    colour: "Off-white / RAL 9002",
    finish: "PPGI both faces",
    unitWeightKgPerSqm: 9.85,
  },
  detailSegmentLengthMm: 600,
  positions: [],
  layoutEdited: false,
};

/* ---- defensive coercion of stored jsonb ------------------------------------------------------- */

/**
 * A persisted jsonb value is NOT typed at runtime. A form can store `"10"`, a cleared field can store
 * `null`, an older build can omit a field entirely, and an array element can be `null` or a shape from
 * two releases ago. Every value the resolver reads therefore goes through one of these helpers, so no
 * arithmetic, sort or template string anywhere downstream can ever meet `NaN`, `undefined` or `"10"`.
 * (`"10" + 10` was silently producing a 201010 mm required bolt length before this existed.)
 */
function numOr(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : Number.NaN;
  return Number.isFinite(n) ? n : fallback;
}
/** Finite and ≥ 0, else the fallback. A ZERO is kept — the validation rules exist to report it. */
function nonNegOr(v: unknown, fallback: number): number {
  const n = numOr(v, fallback);
  return n >= 0 ? n : fallback;
}
/** Finite, ≥ 0 and whole — a count of pieces. */
function countOr(v: unknown, fallback: number): number {
  return Math.round(nonNegOr(v, fallback));
}
/** An optional override: a finite POSITIVE number, or undefined. Never NaN, never a string. */
function optPosOr(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
function strOr(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}
function boolOr(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function recordOf(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

/** One stored level, validated element by element. Returns null for anything with no usable id. */
function sanitizeLevel(v: unknown): RafterSupportLevel | null {
  const r = recordOf(v);
  const id = typeof r.id === "string" && r.id.trim() !== "" ? r.id : "";
  if (!id) return null;
  const kind: RafterSupportLevelKind = r.kind === "ceiling" ? "ceiling" : "roof";
  const floorIndex = countOr(r.floorIndex, 0);
  // a level with no label used to print "undefined @ 1200 mm c/c" in the method statement
  const label = typeof r.label === "string" && r.label.trim() !== ""
    ? r.label
    : kind === "ceiling"
      ? (floorIndex === 0 ? "Ground-floor ceiling" : `Floor ${floorIndex} ceiling`)
      : "Top-floor sloped roof";
  const out: RafterSupportLevel = { id, kind, floorIndex, label, enabled: boolOr(r.enabled, true) };
  if (r.runAxis === "x" || r.runAxis === "y") out.runAxis = r.runAxis;
  const over = optPosOr(r.tubeSpacingMmOverride);
  if (over !== undefined) out.tubeSpacingMmOverride = over;
  return out;
}

/** One stored cleat position, validated field by field. Returns null for anything with no usable id. */
function sanitizePosition(v: unknown): RafterSupportCleatPosition | null {
  const r = recordOf(v);
  if (typeof r.id !== "string" || r.id.trim() === "") return null;
  const levelKind: RafterSupportLevelKind = r.levelKind === "ceiling" ? "ceiling" : "roof";
  const dir: 1 | -1 = r.dir === -1 ? -1 : r.dir === 1 ? 1 : levelKind === "ceiling" ? -1 : 1;
  return {
    id: r.id,
    mark: strOr(r.mark, "RS-00"),
    // an entry with no levelId is kept (it is user data) and reported by `cleat-orphan-level`;
    // renumberCleats used to throw on it before this existed
    levelId: strOr(r.levelId, ""),
    levelKind,
    floorIndex: countOr(r.floorIndex, 0),
    lineIndex: countOr(r.lineIndex, 0),
    lineId: strOr(r.lineId, ""),
    rafterId: strOr(r.rafterId, ""),
    gridRef: strOr(r.gridRef, "?"),
    offsetMm: numOr(r.offsetMm, 0),
    xM: numOr(r.xM, 0),
    yM: numOr(r.yM, 0),
    seatZM: numOr(r.seatZM, 0),
    dir,
    runAxis: r.runAxis === "y" ? "y" : "x",
    acrossM: numOr(r.acrossM, 0),
    rakeM: numOr(r.rakeM, 0),
    source: r.source === "auto" ? "auto" : "manual",
  };
}

/**
 * Deep-merge a persisted (possibly older / partial / corrupt) config over the defaults, so a project
 * saved before a field existed still loads with that field at its shipped value. Follows `pufLock.ts`,
 * but every nested spec is rebuilt field by field through the coercion helpers above rather than
 * spread blindly: the doc used to claim "arrays are validated rather than trusted" while only checking
 * `Array.isArray`, which let a `null` element or a missing `levelId` throw inside `renumberCleats`.
 */
export function resolveRafterSupportConfig(
  stored: Partial<RafterSupportConfig> | undefined | null,
): RafterSupportConfig {
  const d = DEFAULT_RAFTER_SUPPORT_CONFIG;
  if (!stored) return { ...d, levels: [], positions: [] };

  const s = recordOf(stored);
  const c = recordOf(s.cleat);
  const b = recordOf(s.bolt);
  const p = recordOf(s.purlin);
  const t = recordOf(s.tube);
  const sh = recordOf(s.ceilingSheet);
  const rp = recordOf(s.roofPanel);

  const cleat: RafterCleatSpec = {
    lengthMm: nonNegOr(c.lengthMm, d.cleat.lengthMm),
    widthMm: nonNegOr(c.widthMm, d.cleat.widthMm),
    thicknessMm: nonNegOr(c.thicknessMm, d.cleat.thicknessMm),
    grade: strOr(c.grade, d.cleat.grade),
    material: strOr(c.material, d.cleat.material),
    finish: strOr(c.finish, d.cleat.finish),
    mark: strOr(c.mark, d.cleat.mark),
    boltHoleDiaMm: nonNegOr(c.boltHoleDiaMm, d.cleat.boltHoleDiaMm),
    holeCount: countOr(c.holeCount, d.cleat.holeCount),
    edgeDistanceMm: nonNegOr(c.edgeDistanceMm, d.cleat.edgeDistanceMm),
    holePitchMm: nonNegOr(c.holePitchMm, d.cleat.holePitchMm),
    holeGaugeMm: nonNegOr(c.holeGaugeMm, d.cleat.holeGaugeMm),
    materialKey: strOr(c.materialKey, d.cleat.materialKey),
    unitWeightKgOverride: optPosOr(c.unitWeightKgOverride),
    rateOverride: optPosOr(c.rateOverride),
  };

  const bolt: RafterSupportBoltSpec = {
    diameterMm: nonNegOr(b.diameterMm, d.bolt.diameterMm),
    lengthMm: nonNegOr(b.lengthMm, d.bolt.lengthMm),
    webLengthMm: nonNegOr(b.webLengthMm, d.bolt.webLengthMm),
    grade: strOr(b.grade, d.bolt.grade),
    perCleat: countOr(b.perCleat, d.bolt.perCleat),
    nutsPerBolt: countOr(b.nutsPerBolt, d.bolt.nutsPerBolt),
    washersPerBolt: countOr(b.washersPerBolt, d.bolt.washersPerBolt),
    projectionMm: nonNegOr(b.projectionMm, d.bolt.projectionMm),
    headHeightMm: nonNegOr(b.headHeightMm, d.bolt.headHeightMm),
    acrossFlatsMm: nonNegOr(b.acrossFlatsMm, d.bolt.acrossFlatsMm),
    nutHeightMm: nonNegOr(b.nutHeightMm, d.bolt.nutHeightMm),
    washerThicknessMm: nonNegOr(b.washerThicknessMm, d.bolt.washerThicknessMm),
    washerOuterDiaMm: nonNegOr(b.washerOuterDiaMm, d.bolt.washerOuterDiaMm),
    tighteningNote: strOr(b.tighteningNote, d.bolt.tighteningNote),
    materialKey: strOr(b.materialKey, d.bolt.materialKey),
    nutMaterialKey: strOr(b.nutMaterialKey, d.bolt.nutMaterialKey),
    washerMaterialKey: strOr(b.washerMaterialKey, d.bolt.washerMaterialKey),
    unitWeightKgOverride: optPosOr(b.unitWeightKgOverride),
    webUnitWeightKgOverride: optPosOr(b.webUnitWeightKgOverride),
    rateOverride: optPosOr(b.rateOverride),
    nutRateOverride: optPosOr(b.nutRateOverride),
    washerRateOverride: optPosOr(b.washerRateOverride),
  };

  const purlin: RafterSupportPurlinSpec = {
    materialKey: strOr(p.materialKey, d.purlin.materialKey),
    designation: strOr(p.designation, d.purlin.designation),
    depthMm: nonNegOr(p.depthMm, d.purlin.depthMm),
    flangeMm: nonNegOr(p.flangeMm, d.purlin.flangeMm),
    lipMm: nonNegOr(p.lipMm, d.purlin.lipMm),
    thicknessMm: nonNegOr(p.thicknessMm, d.purlin.thicknessMm),
    grade: strOr(p.grade, d.purlin.grade),
    finish: strOr(p.finish, d.purlin.finish),
    lengthMm: nonNegOr(p.lengthMm, d.purlin.lengthMm),
    partMark: strOr(p.partMark, d.purlin.partMark),
    unitWeightKgPerMOverride: optPosOr(p.unitWeightKgPerMOverride),
    rateOverride: optPosOr(p.rateOverride),
  };

  const tube: RafterSupportTubeSpec = {
    materialKey: strOr(t.materialKey, d.tube.materialKey),
    designation: strOr(t.designation, d.tube.designation),
    widthMm: nonNegOr(t.widthMm, d.tube.widthMm),
    depthMm: nonNegOr(t.depthMm, d.tube.depthMm),
    wallThicknessMm: nonNegOr(t.wallThicknessMm, d.tube.wallThicknessMm),
    grade: strOr(t.grade, d.tube.grade),
    finish: strOr(t.finish, d.tube.finish),
    lengthMm: nonNegOr(t.lengthMm, d.tube.lengthMm),
    partMark: strOr(t.partMark, d.tube.partMark),
    sideOfWeb: t.sideOfWeb === "negative" ? "negative" : "positive",
    faceOffsetMm: nonNegOr(t.faceOffsetMm, d.tube.faceOffsetMm),
    boltsPerConnection: countOr(t.boltsPerConnection, d.tube.boltsPerConnection),
    boltPitchMm: nonNegOr(t.boltPitchMm, d.tube.boltPitchMm),
    maxOverhangMm: nonNegOr(t.maxOverhangMm, d.tube.maxOverhangMm),
    unitWeightKgPerMOverride: optPosOr(t.unitWeightKgPerMOverride),
    rateOverride: optPosOr(t.rateOverride),
  };

  const ceilingSheet: CeilingSheetSpec = {
    sheetLengthMm: nonNegOr(sh.sheetLengthMm, d.ceilingSheet.sheetLengthMm),
    sheetWidthMm: nonNegOr(sh.sheetWidthMm, d.ceilingSheet.sheetWidthMm),
    thicknessMm: nonNegOr(sh.thicknessMm, d.ceilingSheet.thicknessMm),
    material: strOr(sh.material, d.ceilingSheet.material),
    materialKey: strOr(sh.materialKey, d.ceilingSheet.materialKey),
    tubeSpacingMm: nonNegOr(sh.tubeSpacingMm, d.ceilingSheet.tubeSpacingMm),
    jointGapMm: nonNegOr(sh.jointGapMm, d.ceilingSheet.jointGapMm),
    edgeToleranceMm: nonNegOr(sh.edgeToleranceMm, d.ceilingSheet.edgeToleranceMm),
    crossNoggins: boolOr(sh.crossNoggins, d.ceilingSheet.crossNoggins),
    fixingSpec: strOr(sh.fixingSpec, d.ceilingSheet.fixingSpec),
    fixingMaterialKey: strOr(sh.fixingMaterialKey, d.ceilingSheet.fixingMaterialKey),
    fixingSpacingMm: nonNegOr(sh.fixingSpacingMm, d.ceilingSheet.fixingSpacingMm),
    maxOverhangMm: nonNegOr(sh.maxOverhangMm, d.ceilingSheet.maxOverhangMm),
    unitWeightKgPerSqm: nonNegOr(sh.unitWeightKgPerSqm, d.ceilingSheet.unitWeightKgPerSqm),
    rateOverride: optPosOr(sh.rateOverride),
  };

  const roofPanel: RoofPanelSpec = {
    coverWidthMm: nonNegOr(rp.coverWidthMm, d.roofPanel.coverWidthMm),
    thicknessMm: nonNegOr(rp.thicknessMm, d.roofPanel.thicknessMm),
    panelType: strOr(rp.panelType, d.roofPanel.panelType),
    materialKey: strOr(rp.materialKey, d.roofPanel.materialKey),
    sideLapDetail: strOr(rp.sideLapDetail, d.roofPanel.sideLapDetail),
    tubeSpacingMm: nonNegOr(rp.tubeSpacingMm, d.roofPanel.tubeSpacingMm),
    maxSpanMm: nonNegOr(rp.maxSpanMm, d.roofPanel.maxSpanMm),
    maxPanelLengthMm: nonNegOr(rp.maxPanelLengthMm, d.roofPanel.maxPanelLengthMm),
    endLapMm: nonNegOr(rp.endLapMm, d.roofPanel.endLapMm),
    maxOverhangMm: nonNegOr(rp.maxOverhangMm, d.roofPanel.maxOverhangMm),
    fixingSpec: strOr(rp.fixingSpec, d.roofPanel.fixingSpec),
    fixingMaterialKey: strOr(rp.fixingMaterialKey, d.roofPanel.fixingMaterialKey),
    fixingsPerPanelPerSupport: countOr(rp.fixingsPerPanelPerSupport, d.roofPanel.fixingsPerPanelPerSupport),
    colour: strOr(rp.colour, d.roofPanel.colour),
    finish: strOr(rp.finish, d.roofPanel.finish),
    unitWeightKgPerSqm: nonNegOr(rp.unitWeightKgPerSqm, d.roofPanel.unitWeightKgPerSqm),
    rateOverride: optPosOr(rp.rateOverride),
  };

  const levels: RafterSupportLevel[] = (Array.isArray(s.levels) ? s.levels : [])
    .map(sanitizeLevel)
    .filter((l): l is RafterSupportLevel => l !== null);
  const positions: RafterSupportCleatPosition[] = (Array.isArray(s.positions) ? s.positions : [])
    .map(sanitizePosition)
    .filter((p2): p2 is RafterSupportCleatPosition => p2 !== null);

  return {
    enabled: boolOr(s.enabled, d.enabled),
    levels,
    levelsEdited: boolOr(s.levelsEdited, d.levelsEdited),
    cleat,
    bolt,
    purlin,
    tube,
    ceilingSheet,
    roofPanel,
    detailSegmentLengthMm: nonNegOr(s.detailSegmentLengthMm, d.detailSegmentLengthMm),
    positions,
    layoutEdited: boolOr(s.layoutEdited, d.layoutEdited),
    notes: typeof s.notes === "string" ? s.notes : undefined,
  };
}

/* ------------------------------------------------------------------ unit weights --------------- */

/** Developed (flat) width of one lipped C section (mm) — web + 2 flanges + 2 lips. */
export function purlinDevelopedWidthMm(p: RafterSupportPurlinSpec): number {
  return p.depthMm + 2 * p.flangeMm + 2 * p.lipMm;
}

/**
 * Unit weight of the C-purlin from its own geometry (kg/m). A cold-formed C really is a folded flat
 * strip, so this reproduces every Material Master C row EXACTLY — no correction, no override needed.
 */
export function purlinSectionKgPerM(p: RafterSupportPurlinSpec): number {
  return round3(purlinDevelopedWidthMm(p) * p.thicknessMm * STEEL_KG_PER_M_PER_MM2);
}

/** Unit weight of the C-purlin (kg/m) — the project override wins, otherwise the section geometry. */
export function purlinKgPerM(p: RafterSupportPurlinSpec): number {
  if (p.unitWeightKgPerMOverride && p.unitWeightKgPerMOverride > 0) return round3(p.unitWeightKgPerMOverride);
  return purlinSectionKgPerM(p);
}

/**
 * Unit weight of the MS tube from its own geometry (kg/m), sharp-corner mid-line rule:
 *     kg/m = 2 · (width + depth − 2t) · t · 0.00785
 * This is an UPPER BOUND: it reproduces `rhs-50x25x2` exactly (2.2294 ≈ 2.23) but reads 1–2 % heavy
 * against the tabulated square-tube rows because it does not remove the rolled corner radii. A
 * catalogue section should therefore carry its tabulated weight as `unitWeightKgPerMOverride` (see
 * TUBE_SECTION_LIBRARY); this function is the honest fallback for a section nobody has tabulated.
 */
export function tubeSectionKgPerM(t: RafterSupportTubeSpec): number {
  const w = Math.max(0, t.widthMm);
  const d = Math.max(0, t.depthMm);
  const wall = Math.max(0, t.wallThicknessMm);
  const midline = w + d - 2 * wall;
  if (midline <= 0 || wall <= 0) return 0;
  return round3(2 * midline * wall * STEEL_KG_PER_M_PER_MM2);
}

/**
 * The TABULATED Material Master weight of this tube section (kg/m), or undefined when the spec is not
 * a catalogue section. The material key alone is not enough — an admin can retype the dimensions and
 * leave the key behind — so the section geometry must agree with the catalogue row before its weight
 * is applied. `tube-section-mismatch` reports the disagreement.
 */
export function tubeCatalogueKgPerM(t: RafterSupportTubeSpec): number | undefined {
  const row = tubeSectionOption(t.materialKey);
  if (!row) return undefined;
  const same =
    Math.abs(row.widthMm - t.widthMm) < 0.01
    && Math.abs(row.depthMm - t.depthMm) < 0.01
    && Math.abs(row.wallThicknessMm - t.wallThicknessMm) < 0.01;
  return same ? row.masterKgPerM : undefined;
}

/**
 * Unit weight of the MS tube (kg/m). Resolution order — see TUBE_SECTION_LIBRARY:
 *   1. the project's own `unitWeightKgPerMOverride`;
 *   2. the TABULATED Material Master weight of the catalogue section (so a catalogue tube is never
 *      billed at the sharp-corner bound just because the picker did not seed an override — that was
 *      silently adding 1.07–3.19 % to every tube in the take-off);
 *   3. the sharp-corner geometry, the honest fallback for an untabulated section.
 */
export function tubeKgPerM(t: RafterSupportTubeSpec): number {
  if (t.unitWeightKgPerMOverride && t.unitWeightKgPerMOverride > 0) return round3(t.unitWeightKgPerMOverride);
  const tabulated = tubeCatalogueKgPerM(t);
  if (tabulated !== undefined && tabulated > 0) return round3(tabulated);
  return tubeSectionKgPerM(t);
}

/**
 * GROSS weight of one cleat plate (kg) — the plate as BOUGHT, before it is drilled. `ms-plate-8` is a
 * `per_kg` row and the holes are drilled out of a bought plate, so this, not the net weight, is what a
 * purchase order must carry. MS plate is 7.85 kg/m² per mm.
 */
export function cleatGrossUnitWeightKg(c: RafterCleatSpec): number {
  const gross = Math.max(0, c.lengthMm) * Math.max(0, c.widthMm) * Math.max(0, c.thicknessMm);
  return round3(gross * STEEL_KG_PER_MM3);
}

/**
 * Unit weight of one FABRICATED cleat plate (kg) — gross plate less the drilled holes, i.e. the weight
 * that is actually erected. Use `cleatGrossUnitWeightKg` for what is purchased; the take-off carries
 * both, because the 2 % difference is bought steel that nobody erects.
 */
export function cleatUnitWeightKg(c: RafterCleatSpec): number {
  if (c.unitWeightKgOverride && c.unitWeightKgOverride > 0) return round3(c.unitWeightKgOverride);
  const gross = Math.max(0, c.lengthMm) * Math.max(0, c.widthMm) * Math.max(0, c.thicknessMm);
  const holes = Math.max(0, c.holeCount) * (Math.PI / 4) * c.boltHoleDiaMm ** 2 * Math.max(0, c.thicknessMm);
  return round3(Math.max(0, gross - holes) * STEEL_KG_PER_MM3);
}

/**
 * Unit weight of one bolt of the given length (kg) — shank volume + a 20 % head allowance.
 *
 * An override is the tabulated weight of a bolt OF A PARTICULAR LENGTH, so it is applied only to the
 * length it was entered against: `unitWeightKgOverride` to the M12 × `lengthMm` cleat bolt and
 * `webUnitWeightKgOverride` to the M12 × `webLengthMm` web bolt. Letting one override answer for both
 * used to collapse a 100 mm web bolt onto the weight of a 50 mm cleat bolt — exactly halving it — and
 * `bolt-m12` in the Material Master is explicitly the M12 × 50 row an admin would reach for.
 */
export function boltUnitWeightKg(b: RafterSupportBoltSpec, lengthMm: number): number {
  const len = Math.max(0, lengthMm);
  if (b.webUnitWeightKgOverride && b.webUnitWeightKgOverride > 0 && Math.abs(len - b.webLengthMm) < 1e-9) {
    return round3(b.webUnitWeightKgOverride);
  }
  if (b.unitWeightKgOverride && b.unitWeightKgOverride > 0 && Math.abs(len - b.lengthMm) < 1e-9) {
    return round3(b.unitWeightKgOverride);
  }
  const shank = (Math.PI / 4) * b.diameterMm ** 2 * len;
  return round3(shank * STEEL_KG_PER_MM3 * 1.2);
}

/** Unit weight of one hex nut (kg) — hexagon prism less the threaded bore. */
export function nutUnitWeightKg(b: RafterSupportBoltSpec): number {
  const af = b.acrossFlatsMm > 0 ? b.acrossFlatsMm : b.diameterMm * 1.5;
  const h = b.nutHeightMm > 0 ? b.nutHeightMm : b.diameterMm * 0.8;
  const hex = 0.866 * af * af * h;
  const bore = (Math.PI / 4) * b.diameterMm ** 2 * h;
  return round3(Math.max(0, hex - bore) * STEEL_KG_PER_MM3);
}

/** Unit weight of one plain washer (kg). */
export function washerUnitWeightKg(b: RafterSupportBoltSpec): number {
  const od = b.washerOuterDiaMm > 0 ? b.washerOuterDiaMm : b.diameterMm * 2;
  const id = b.diameterMm + 1;
  const t = b.washerThicknessMm > 0 ? b.washerThicknessMm : Math.max(2, b.diameterMm * 0.2);
  return round3((Math.PI / 4) * Math.max(0, od * od - id * id) * t * STEEL_KG_PER_MM3);
}

/* ------------------------------------------------------------------ grip arithmetic ------------ */

/**
 * The grip a CLEAT bolt must deliver (mm): washer + cleat + rafter flange + washer + nut + projection.
 * A bolt shorter than this cannot be tightened, whatever the drawing says.
 */
export function requiredCleatBoltLengthMm(cfg: RafterSupportConfig, rafterFlangeThicknessMm: number): number {
  const { bolt, cleat } = cfg;
  return round2(
    bolt.washerThicknessMm
    + Math.max(0, cleat.thicknessMm)
    + Math.max(0, rafterFlangeThicknessMm)
    + bolt.washerThicknessMm
    + bolt.nutHeightMm
    + bolt.projectionMm,
  );
}

/**
 * The grip a WEB bolt must deliver (mm): washer + purlin web + the FULL tube width (BOTH walls, since
 * a bolt fixed into a single wall of a hollow section has nothing to bear against) + washer + nut +
 * projection.
 */
export function requiredWebBoltLengthMm(cfg: RafterSupportConfig): number {
  const { bolt, purlin, tube } = cfg;
  return round2(
    bolt.washerThicknessMm
    + Math.max(0, purlin.thicknessMm)
    + Math.max(0, tube.widthMm)
    + bolt.washerThicknessMm
    + bolt.nutHeightMm
    + bolt.projectionMm,
  );
}

/**
 * The minimum cleat width (mm): it must span the purlin flange, the tube beside it, and both bolt rows
 * at their gauge with the full edge distance outside them.
 *
 * The plate is CENTRED ON THE WEB-FACE PLANE (see `rafterCleatGeometry`), and the purlin flange runs
 * one way off that plane while the tube runs the other. A plate centred on the interface therefore
 * needs `2 × max(flange, tubeWidth)` to cover both, NOT `flange + tubeWidth`: a 100 mm plate under a
 * 65 mm flange and a 25 mm tube satisfies `65 + 25` yet leaves 15 mm of purlin flange hanging over the
 * edge of the cleat with nothing under it.
 */
export function requiredCleatWidthMm(cfg: RafterSupportConfig): number {
  const occupied = 2 * Math.max(Math.max(0, cfg.purlin.flangeMm), Math.max(0, cfg.tube.widthMm));
  const bolts = Math.max(0, cfg.cleat.holeGaugeMm) + 2 * Math.max(0, cfg.cleat.edgeDistanceMm);
  return round2(Math.max(occupied, bolts));
}

/** The minimum cleat length along the run (mm) — the bolt pitch plus an edge distance each side. */
export function requiredCleatLengthMm(cfg: RafterSupportConfig): number {
  return round2(Math.max(0, cfg.cleat.holePitchMm) + 2 * Math.max(0, cfg.cleat.edgeDistanceMm));
}

/**
 * The vertical overlap (mm) between the tube's side face and the C-purlin web — the lap the web bolt
 * passes through. With the tube's fixing face flush to the purlin's, this is the tube depth capped by
 * the web depth, less any face offset that lifts the tube clear of the web.
 */
export function webLapMm(cfg: RafterSupportConfig): number {
  const offset = Math.max(0, cfg.tube.faceOffsetMm);
  return round2(Math.max(0, Math.min(cfg.tube.depthMm, cfg.purlin.depthMm) - offset));
}

/* ------------------------------------------------------------------ module arithmetic ---------- */

/** The result of resolving a covering module into a tube spacing. */
export interface TubeSpacingResult {
  /** What the configuration asked for (mm). */
  requestedMm: number;
  /** What the system will actually use (mm) — the request is respected, never silently snapped. */
  spacingMm: number;
  /** How many bays the sheet length is divided into at `spacingMm` (2440 / spacing). */
  divisions: number;
  /** True when the sheet length is a whole multiple of the spacing, i.e. every edge lands on a tube. */
  divides: boolean;
  /** The nearest spacing that DOES divide the sheet length (mm) — what the warning should suggest. */
  nearestDividingMm: number;
  /** How far the sheet length overruns the last whole bay at `spacingMm` (mm). 0 when it divides. */
  residualMm: number;
}

/**
 * THE CRUX OF THE WHOLE FEATURE for a ceiling.
 *
 * A 2440 mm board edge can only land on a tube if the sheet length is a whole multiple of the tube
 * spacing, so the valid spacings are exactly `sheetLength / n` for integer n ≥ 1:
 *     n = 1 → 2440,  n = 2 → 1220 (the default),  n = 3 → 813.3,  n = 4 → 610 …
 * The configured request is RESPECTED rather than snapped — silently moving a fabricator's spacing
 * would make the drawing lie — but `divides` is false and `nearestDividingMm` names the fix, which is
 * what `validateRafterSupport` turns into a "sheet edge unsupported" issue.
 */
export function tubeSpacingForSheet(sheet: CeilingSheetSpec, requestedMm?: number): TubeSpacingResult {
  const sheetLen = numOr(sheet.sheetLengthMm, 0) > 0 ? Math.max(0, sheet.sheetLengthMm) : 0;
  const asked = requestedMm ?? sheet.tubeSpacingMm;
  const requested = numOr(asked, 0) > 0 ? Math.max(0, asked) : 0;
  if (sheetLen <= 0 || requested <= 0) {
    return { requestedMm: requested, spacingMm: requested, divisions: 0, divides: false, nearestDividingMm: 0, residualMm: 0 };
  }
  const exact = sheetLen / requested;
  const n = Math.max(1, Math.round(exact));

  // A dividing spacing that is not a terminating decimal (2440/3, 2440/6 …) can only ever be STORED to
  // the millimetre grid this module rounds to, so `2440 / 813.333` is 3.0000012, not 3. Testing that
  // against a 1e-9 absolute tolerance made the module reject its own suggestion: the admin was told to
  // "Use 813.333 mm c/c", entered it, and got the identical error back. The tolerance is therefore the
  // rounding grid itself — n divisions each rounded to 3 dp can be out by at most n × 0.0005 mm, which
  // is 0.003 mm at n = 6 and still 5 orders of magnitude below anything a fabricator can set out.
  const gridTolMm = Math.max(1e-9, n * 5e-4);
  const divides = Math.abs(sheetLen - n * requested) <= gridTolMm;

  // …and the same grid tolerance decides how many WHOLE bays fit, or `divides: true, divisions: 6`
  // could be published alongside `residualMm: 406.665` — a full bay of a gap that does not exist.
  const whole = divides ? n : Math.floor(sheetLen / requested + 1e-9);
  const residual = divides ? 0 : round3(sheetLen - whole * requested);

  // The NEAREST DIVIDING SPACING, not the nearest division COUNT: `Math.round(exact)` picks the closest
  // n, which is not the closest sheetLen/n. For a 1000 mm request it named 1220 (220 mm away) when
  // 813.333 is 187 mm away; for 700 it named 813.333 (113 away) when 610 is 90 away. Both candidates
  // either side of the request are tested and the genuinely nearer one is returned.
  const candidates = [Math.max(1, Math.floor(exact)), Math.max(1, Math.ceil(exact)), n];
  let nearest = round3(sheetLen / n);
  let bestGap = Math.abs(nearest - requested);
  for (const k of candidates) {
    const s = round3(sheetLen / k);
    const gap = Math.abs(s - requested);
    if (gap < bestGap - 1e-9) {
      bestGap = gap;
      nearest = s;
    }
  }
  return {
    requestedMm: round3(requested),
    spacingMm: round3(requested),
    divisions: round3(exact),
    divides,
    nearestDividingMm: nearest,
    residualMm: residual,
  };
}

/** The minimum shape `sheetLayoutFor` / `panelLayoutFor` need from a level. */
export interface RafterSupportLayoutLevel {
  id: string;
  kind: RafterSupportLevelKind;
  /** The tube centre-to-centre spacing actually in force at this level (mm). */
  spacingMm: number;
  /**
   * The ACTUAL tube centrelines, measured from the start of the span (mm), when they are known.
   *
   * A ceiling run is not simply "every `spacingMm`": when the width does not finish on a module line
   * the layout adds a CLOSING line at the far edge to bear the cut board's edge. Testing the board
   * joints against bare multiples of the spacing would then report that closing edge as unsupported
   * when a tube is in fact directly under it. When this list is absent the check falls back to
   * multiples of `spacingMm`, which is the right answer for a bare, context-free layout query.
   */
  tubeStationsMm?: number[];
}

/** A laid-out ceiling of 8 ft × 4 ft boards. */
export interface CeilingSheetLayout {
  levelId: string;
  /** The board module actually used (mm). */
  sheetLengthMm: number;
  sheetWidthMm: number;
  spacingMm: number;
  /** Runs of full-length (2440) boards across the tubes. */
  wholeRowsAcross: number;
  /** Runs of full-width (1220) boards along the tubes. */
  wholeRowsAlong: number;
  /** Boards used at their full 2440 × 1220 size. */
  wholeSheets: number;
  /** Residual board LENGTH at the end of each run across the tubes (mm). 0 = the span fits exactly. */
  cutSheetLengthMm: number;
  /** Residual board WIDTH at the end of each run along the tubes (mm). 0 = the span fits exactly. */
  cutSheetWidthMm: number;
  /** Boards that have to be cut (length-cut + width-cut + the one corner board cut both ways). */
  cutSheets: number;
  /** Every board consumed, whole or cut. */
  totalSheets: number;
  /** The ceiling area actually covered (m²). */
  coveredAreaSqm: number;
  /** The board area that must be bought (m²) — whole boards, offcuts included. */
  purchasedAreaSqm: number;
  /** Sheet joint ordinates in the spacing direction (mm from the start of the span). */
  jointStationsMm: number[];
  /** Those joint ordinates that do NOT land on a tube centreline within the tolerance. */
  unsupportedJointsMm: number[];
  /** Sheet joint ordinates ALONG the tubes (mm) — these need cross noggins, not tubes. */
  crossJointStationsMm: number[];
  /** Cross noggin pieces between adjacent tubes at every cross joint. */
  nogginPieces: number;
  nogginRunningLengthM: number;
  /** Screws, from the real perimeter + intermediate support runs at the configured centres. */
  screws: number;
  /** Bays between adjacent tube centrelines across the span — `supportLines − 1`, never `round(across/spacing)`. */
  bays: number;
  /** Tube centrelines the boards are borne on across the span (= `bays + 1`). */
  supportLines: number;
  /** The movement gap left between boards (mm) — echoed so the cutting list and the drawing agree. */
  jointGapMm: number;
  /**
   * The size each WHOLE board is actually CUT to (mm), i.e. the module less the movement gap. The tube
   * module stays at `sheetLengthMm` so every joint still lands on a centreline; the gap is taken out of
   * the board, not out of the setting-out. `jointGapMm` used to be stored, documented and never read.
   */
  laidSheetLengthMm: number;
  laidSheetWidthMm: number;
}

/**
 * Lay 8 ft × 4 ft boards out ON THE GRID — never `ceil(area / sheetArea)`, which would hide every cut
 * board and every unsupported edge the layout actually produces.
 *
 * `spanAcrossM` is the dimension in the SPACING direction: the 2440 sheet length runs across the tubes
 * so that its edges land on tube centrelines. `spanAlongM` is the dimension parallel to the tubes,
 * which the 1220 sheet width runs along and which needs cross noggins at every joint.
 */
export function sheetLayoutFor(
  level: RafterSupportLayoutLevel,
  spanAlongM: number,
  spanAcrossM: number,
  sheet: CeilingSheetSpec,
): CeilingSheetLayout {
  const across = Math.max(0, numOr(spanAcrossM, 0)) * 1000;
  const along = Math.max(0, numOr(spanAlongM, 0)) * 1000;
  const sl = numOr(sheet.sheetLengthMm, 0);
  const sw = numOr(sheet.sheetWidthMm, 0);
  const spacing = numOr(level.spacingMm, 0);
  const tol = Math.max(0, numOr(sheet.edgeToleranceMm, 0));
  const gap = Math.max(0, Math.min(numOr(sheet.jointGapMm, 0), sl / 2, sw / 2));

  // A blank / zeroed board size used to be clamped to a 1 mm module, which produced 62 000 000 boards
  // and one `sheet-joint-off-tube` issue per joint station. There is no layout for a board with no
  // size: return the empty one and let `sheet-size-invalid` say so.
  if (!(sl > 0) || !(sw > 0) || !(spacing > 0)) {
    return {
      levelId: level.id,
      sheetLengthMm: Math.max(0, sl),
      sheetWidthMm: Math.max(0, sw),
      spacingMm: round3(Math.max(0, spacing)),
      wholeRowsAcross: 0,
      wholeRowsAlong: 0,
      wholeSheets: 0,
      cutSheetLengthMm: 0,
      cutSheetWidthMm: 0,
      cutSheets: 0,
      totalSheets: 0,
      coveredAreaSqm: 0,
      purchasedAreaSqm: 0,
      jointStationsMm: [],
      unsupportedJointsMm: [],
      crossJointStationsMm: [],
      nogginPieces: 0,
      nogginRunningLengthM: 0,
      screws: 0,
      bays: 0,
      supportLines: 0,
      jointGapMm: gap,
      laidSheetLengthMm: 0,
      laidSheetWidthMm: 0,
    };
  }

  const wholeAcross = Math.floor(across / sl + 1e-9);
  const cutLen = round2(across - wholeAcross * sl);
  const wholeAlong = Math.floor(along / sw + 1e-9);
  const cutWid = round2(along - wholeAlong * sw);

  // A CUT board and an UNSUPPORTED edge are two different questions. `edgeToleranceMm` answers the
  // second (how far an edge may miss a tube) and used to answer the first as well, so any residual up
  // to 10 mm was billed as covered ceiling with no board bought at all — 0.146 m² on a 9770 × 4890
  // span. The cut threshold is the same sub-millimetre rounding guard `panelLayoutFor` already used.
  const hasCutLen = cutLen > CUT_THRESHOLD_MM;
  const hasCutWid = cutWid > CUT_THRESHOLD_MM;
  const wholeSheets = wholeAcross * wholeAlong;
  const cutSheets =
    (hasCutLen ? wholeAlong : 0)
    + (hasCutWid ? wholeAcross : 0)
    + (hasCutLen && hasCutWid ? 1 : 0);

  // every board edge in the spacing direction, including the two span edges
  const jointStations: number[] = [];
  for (let k = 0; k <= wholeAcross; k++) jointStations.push(round2(k * sl));
  if (hasCutLen) jointStations.push(round2(across));

  // Measure every board edge against the tubes that are actually laid out where they are known —
  // including the closing line at the far edge — and only fall back to bare multiples of the spacing
  // when the caller has no line list to offer.
  const stations = level.tubeStationsMm?.length ? level.tubeStationsMm : null;
  const distanceToTube = (j: number): number => {
    if (!stations) return Math.abs(j - Math.round(j / spacing) * spacing);
    // a loop, not Math.min(...stations): a spread of a long station list throws RangeError
    let best = Infinity;
    for (const s of stations) {
      const d = Math.abs(j - s);
      if (d < best) best = d;
    }
    return Number.isFinite(best) ? best : Infinity;
  };
  const unsupported = jointStations.filter((j) => distanceToTube(j) > tol);

  const crossStations: number[] = [];
  for (let k = 1; k <= wholeAlong; k++) {
    const at = round2(k * sw);
    if (at < along - CUT_THRESHOLD_MM) crossStations.push(at);
  }

  // THE BAYS ARE THE BAYS THAT WERE LAID OUT. `Math.round(across / spacing)` disagreed with
  // `tubeLinesFor` for roughly half of all spans — a 6200 mm span at 1220 c/c has 7 lines and so 6
  // bays, and the take-off row published `tubeLines: 7` beside `nogginPieces: 40` (5 bays) with no
  // issue raised. When the real centrelines are known they decide; otherwise they are reproduced
  // exactly as `tubeLinesFor` would lay them, closing line included.
  const bayWidths: number[] = [];
  if (stations) {
    const sorted = [...stations].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) bayWidths.push(sorted[i] - sorted[i - 1]);
  } else {
    const n = Math.floor(across / spacing + 1e-9);
    for (let i = 0; i < n; i++) bayWidths.push(spacing);
    const residual = round2(across - n * spacing);
    if (residual > CUT_THRESHOLD_MM) bayWidths.push(residual);
  }
  const bays = bayWidths.length;
  const supportLines = bays + 1;

  // One noggin per cross joint per bay. Its ordering length is that bay's own centre-to-centre
  // distance — a noggin is cut and fitted between the tube faces and the offcut is not recoverable —
  // so the 100 mm closing bay is charged at 100 mm and not at a full 1220 mm module.
  const nogginPieces = crossStations.length * bays;
  const nogginRunningLengthM = round3((crossStations.length * bayWidths.reduce((a, w) => a + w, 0)) / 1000);

  // screws: every board is fixed along each supporting member it crosses, at the configured centres
  const screwLines = Math.max(2, supportLines);
  const screwSpacing = Math.max(50, numOr(sheet.fixingSpacingMm, 300));
  const screws = Math.max(0, Math.ceil((screwLines * along) / screwSpacing))
    + Math.max(0, Math.ceil((crossStations.length * across) / screwSpacing));

  return {
    levelId: level.id,
    sheetLengthMm: sl,
    sheetWidthMm: sw,
    spacingMm: round3(spacing),
    wholeRowsAcross: wholeAcross,
    wholeRowsAlong: wholeAlong,
    wholeSheets,
    cutSheetLengthMm: hasCutLen ? cutLen : 0,
    cutSheetWidthMm: hasCutWid ? cutWid : 0,
    cutSheets,
    totalSheets: wholeSheets + cutSheets,
    coveredAreaSqm: round3((across / 1000) * (along / 1000)),
    purchasedAreaSqm: round3(((wholeSheets + cutSheets) * sl * sw) / 1e6),
    jointStationsMm: jointStations,
    unsupportedJointsMm: unsupported,
    crossJointStationsMm: crossStations,
    nogginPieces: sheet.crossNoggins ? nogginPieces : 0,
    nogginRunningLengthM: sheet.crossNoggins ? nogginRunningLengthM : 0,
    screws,
    bays,
    supportLines,
    jointGapMm: round2(gap),
    laidSheetLengthMm: round2(sl - gap),
    laidSheetWidthMm: round2(sw - gap),
  };
}

/** A laid-out slope of 1000 mm cover-width PUF panels. */
export interface RoofPanelLayout {
  levelId: string;
  coverWidthMm: number;
  /** Panels laid at their full cover width across the slope. */
  wholePanels: number;
  /** The residual CUT panel width when the slope width is not a whole multiple of the cover (mm). */
  cutPanelWidthMm: number;
  hasCutPanel: boolean;
  /** Panel runs across the slope, whole + cut. */
  totalPanelRuns: number;
  /** Pieces down the slope in one run (>1 when the rake exceeds the maximum panel length). */
  piecesPerRun: number;
  /** Every panel piece consumed. */
  totalPanels: number;
  /** The cut length of one panel piece down the slope (mm), end lap included. */
  panelLengthMm: number;
  /** The rake length of the slope (mm). */
  rakeLengthMm: number;
  /** The span the panel bridges between tubes (mm) — the tube spacing along the rake. */
  spanMm: number;
  /** False when `spanMm` exceeds the panel's permitted span. */
  spanOk: boolean;
  /** Side-joint ordinates across the slope (mm) — every 1000 mm of cover width. */
  sideJointStationsMm: number[];
  coveredAreaSqm: number;
  purchasedAreaSqm: number;
  /** Fixings, from the real panel × support-line count. */
  screws: number;
}

/**
 * Lay 1000 mm cover-width PUF panels DOWN one slope.
 *
 * `slopeWidthM` is the dimension ACROSS the slope (perpendicular to the fall line) — that is where the
 * 1000 mm cover width recurs and where a non-multiple leaves a cut panel. `slopeLengthM` is the RAKE
 * length down the fall line, which is the panel length. The tube spacing along the rake is the panel
 * SPAN, which is the number the maximum-span check is made against.
 */
export function panelLayoutFor(
  level: RafterSupportLayoutLevel,
  slopeWidthM: number,
  slopeLengthM: number,
  panel: RoofPanelSpec,
): RoofPanelLayout {
  const width = Math.max(0, numOr(slopeWidthM, 0)) * 1000;
  const rake = Math.max(0, numOr(slopeLengthM, 0)) * 1000;
  const cover = numOr(panel.coverWidthMm, 0);
  const span = Math.max(0, numOr(level.spacingMm, 0));

  // a zero / cleared / negative cover width used to be clamped to a 1 mm module: 20 000 roof panels
  // and 240 366 screws for one 8.4 m slope. `panel-cover-width-invalid` reports it instead.
  if (!(cover > 0)) {
    return {
      levelId: level.id,
      coverWidthMm: Math.max(0, cover),
      wholePanels: 0,
      cutPanelWidthMm: 0,
      hasCutPanel: false,
      totalPanelRuns: 0,
      piecesPerRun: 0,
      totalPanels: 0,
      panelLengthMm: 0,
      rakeLengthMm: round2(rake),
      spanMm: round3(span),
      spanOk: false,
      sideJointStationsMm: [],
      coveredAreaSqm: 0,
      purchasedAreaSqm: 0,
      screws: 0,
    };
  }

  const whole = Math.floor(width / cover + 1e-9);
  const residual = round2(width - whole * cover);
  const hasCut = residual > CUT_THRESHOLD_MM; // a sub-millimetre residual is rounding, not a cut panel
  const runs = whole + (hasCut ? 1 : 0);

  const maxLen = Math.max(1, numOr(panel.maxPanelLengthMm, 1));
  const pieces = Math.max(1, Math.ceil(rake / maxLen - 1e-9));
  const lap = pieces > 1 ? Math.max(0, numOr(panel.endLapMm, 0)) : 0;
  // n pieces down one run make n − 1 end laps, not n. `rake / pieces + lap` bought one whole extra lap
  // on every run — 199.99 mm × 30 runs = 6.0 m of over-purchased panel on a 25 m rake.
  const pieceLen = round2(rake / pieces + (lap * (pieces - 1)) / pieces);

  const sideJoints: number[] = [];
  for (let k = 1; k <= whole; k++) {
    const at = round2(k * cover);
    if (at < width - CUT_THRESHOLD_MM) sideJoints.push(at);
  }

  const supportLines = Math.max(2, Math.ceil(rake / Math.max(1, span)) + 1);
  const screws = Math.max(0, runs * pieces * supportLines * Math.max(1, countOr(panel.fixingsPerPanelPerSupport, 1)));

  return {
    levelId: level.id,
    coverWidthMm: cover,
    wholePanels: whole,
    cutPanelWidthMm: hasCut ? residual : 0,
    hasCutPanel: hasCut,
    totalPanelRuns: runs,
    piecesPerRun: pieces,
    totalPanels: runs * pieces,
    panelLengthMm: pieceLen,
    rakeLengthMm: round2(rake),
    spanMm: round3(span),
    spanOk: span > 0 && span <= numOr(panel.maxSpanMm, 0) + 1e-9,
    sideJointStationsMm: sideJoints,
    coveredAreaSqm: round3((width / 1000) * (rake / 1000)),
    purchasedAreaSqm: round3((runs * cover * pieces * pieceLen) / 1e6),
    screws,
  };
}

/* ------------------------------------------------------------------ context -------------------- */

/** One rafter / ceiling-beam line the cleats bolt onto. */
export interface RafterSupportRafterLine {
  /** Stable id, e.g. "roof:truss:t1". */
  id: string;
  /** The plan axis the RAFTER travels along. The purlin / tube run is perpendicular to it. */
  axis: RafterSupportRunAxis;
  /** The fixed ordinate of the rafter (x for a y-running rafter, y for an x-running one), metres. */
  atM: number;
  /** Start / end of the rafter along its own axis, metres. */
  fromM: number;
  toM: number;
  /** Fabrication mark, e.g. "T1". */
  mark?: string;
}

/** The roof form the top level covers. Mirrors `ElevationGeom["roof"]` structurally. */
export interface RafterSupportSlope {
  type: "flat" | "mono" | "gable";
  /** Rise from the eave to the apex / ridge (m). */
  riseM: number;
  /** Eave overhang beyond the walled body (m). */
  overhangM: number;
}

/** What the layout engine needs to know about the building it is laying the system out on. */
export interface RafterSupportContext {
  /** The structural column grid — cleat setting-out offsets are measured from it. */
  grid: RafterSupportGridMark[];
  /** The walled body the covering spans, colony metres. */
  body: { x0: number; y0: number; x1: number; y1: number };
  /** Storeys. Decides how many ceiling levels sit under the one roof level. */
  floors: number;
  /**
   * The CEILING framing soffit level of each floor (metres), index = floorIndex. The cleat bolts to
   * the beam soffit here and the whole assembly hangs DOWN from it.
   */
  floorCeilingZM: number[];
  /** The roof rafter TOP level at the eave (metres). The roof assembly builds UP from here. */
  roofBaseZM: number;
  slope: RafterSupportSlope;
  /** The rafter / truss lines the cleats bolt onto. */
  rafterLines: RafterSupportRafterLine[];
  /** Thickness of the rafter flange the cleat bolt passes through (mm). */
  rafterFlangeThicknessMm?: number;
  /** Depth of the rafter, for the reference stub drawn in the detail (mm). */
  rafterDepthMm?: number;
  /** Width of the rafter along the purlin run, for the reference stub (mm). */
  rafterWidthMm?: number;
}

/** The rafter flange thickness the bolt grip is checked against — 6 mm unless the context says otherwise. */
export function rafterFlangeThicknessOf(ctx: RafterSupportContext): number {
  const t = ctx.rafterFlangeThicknessMm;
  return t !== undefined && t > 0 ? t : 6;
}

/* ------------------------------------------------------------------ level derivation ----------- */

/**
 * Derive the levels the system is built at.
 *
 * A ceiling level for every floor that has another floor above it, plus ONE sloped roof level on top:
 *   G   (floors = 1) → roof only — the ground floor's ceiling IS the roof soffit;
 *   G+1 (floors = 2) → ceiling over the ground floor + the sloped roof;
 *   G+2 (floors = 3) → two ceiling levels + the sloped roof.
 * Nothing is invented: a colony gets exactly the levels it actually has.
 */
export function autoLevels(ctx: RafterSupportContext): RafterSupportLevel[] {
  const floors = Math.max(1, Math.round(ctx.floors));
  const out: RafterSupportLevel[] = [];
  for (let f = 0; f <= floors - 2; f++) {
    out.push({
      id: `lvl-ceiling-${f}`,
      kind: "ceiling",
      floorIndex: f,
      label: f === 0 ? "Ground-floor ceiling" : `Floor ${f} ceiling`,
      enabled: true,
    });
  }
  out.push({
    id: "lvl-roof",
    kind: "roof",
    floorIndex: floors - 1,
    label: "Top-floor sloped roof",
    enabled: true,
  });
  return out;
}

/**
 * The FINAL level list. An edited list is authoritative and is never silently regenerated — INCLUDING
 * an edited list that is empty: deleting every level used to fall through to `autoLevels` and quietly
 * put them all back, so the admin could never switch the system off level by level.
 */
export function resolveLevels(cfg: RafterSupportConfig, ctx: RafterSupportContext): RafterSupportLevel[] {
  if (!cfg.enabled) return [];
  if (cfg.levelsEdited) return cfg.levels;
  if (cfg.levels.length) return cfg.levels;
  return autoLevels(ctx);
}

/* ------------------------------------------------------------------ slope geometry ------------- */

/** One slope plane of the roof, resolved from the context. */
export interface RafterSupportSlopePlane {
  id: string;
  /** Where the slope starts in the spacing direction (m) — the low (eave) edge. */
  fromM: number;
  /** Where the slope ends (m) — the high (ridge / apex) edge. */
  toM: number;
  /** z at `fromM` (m). */
  fromZM: number;
  /** z at `toM` (m). */
  toZM: number;
  /** True length of the slope surface (m). */
  rakeLengthM: number;
  /** Pitch above horizontal (degrees). */
  pitchDeg: number;
}

/**
 * Resolve the roof into slope planes, reproducing `colonyModel.buildRoof`'s own `zApex` rule
 * structurally (this module may not import it):
 *   flat  — one horizontal plane at roofBase + rise;
 *   mono  — one plane rising from the low edge to the high edge across the width;
 *   gable — two planes meeting at a mid-width ridge.
 */
export function roofSlopePlanes(ctx: RafterSupportContext, acrossFrom: number, acrossTo: number): RafterSupportSlopePlane[] {
  const base = ctx.roofBaseZM;
  const rise = Math.max(0, ctx.slope.riseM);
  const span = Math.max(EPS_M, acrossTo - acrossFrom);
  const mk = (id: string, a: number, b: number, za: number, zb: number): RafterSupportSlopePlane => {
    const run = Math.abs(b - a);
    const drop = Math.abs(zb - za);
    const rake = Math.hypot(run, drop);
    return {
      id,
      fromM: a,
      toM: b,
      fromZM: round4(za),
      toZM: round4(zb),
      rakeLengthM: round4(rake),
      pitchDeg: round2((Math.atan2(drop, Math.max(EPS_M, run)) * 180) / Math.PI),
    };
  };
  if (ctx.slope.type === "flat") {
    return [mk("slope-flat", acrossFrom, acrossTo, base + rise, base + rise)];
  }
  if (ctx.slope.type === "mono") {
    return [mk("slope-mono", acrossFrom, acrossTo, base, base + rise)];
  }
  const ridge = acrossFrom + span / 2;
  return [
    mk("slope-a", acrossFrom, ridge, base, base + rise),
    mk("slope-b", acrossTo, ridge, base, base + rise),
  ];
}

/* ------------------------------------------------------------------ tube lines ----------------- */

/** One continuous C-purlin + MS tube run at a single module ordinate. */
export interface RafterSupportTubeLine {
  id: string;
  levelId: string;
  /** 0-based index in the spacing direction. */
  index: number;
  runAxis: RafterSupportRunAxis;
  /** Ordinate of the TUBE CENTRELINE in the spacing direction (m). */
  acrossM: number;
  /** Start / end of the run along its own axis (m). */
  fromM: number;
  toM: number;
  lengthM: number;
  /** The rafter face the cleats on this line bolt to (m). */
  seatZM: number;
  /** +1 = builds up (roof); −1 = hangs down (ceiling). */
  dir: 1 | -1;
  /** Distance from the eave along the rake (m). 0 for a ceiling. */
  rakeM: number;
  slopeId?: string;
  /** Whether this line falls on the covering module or is a closing line at the far edge. */
  onModule: boolean;
  /**
   * The ACROSS extents of the covering strip THIS line carries (m): half the real bay to each
   * neighbour, clipped to the covered span. Not `spacing / 2` either side — that drew a full 1220 mm
   * strip on a 680 mm closing bay (0.058 m³ of duplicated cement board), ran 610 mm outside the
   * building at both boundaries, and on a flat roof put 57 mm of PUF panel through its neighbour.
   */
  coverFromM: number;
  coverToM: number;
  /**
   * dz / d(across) of the covering plane at this line — the slope of the surface the covering follows,
   * signed in the ACROSS direction. 0 for a ceiling and for a flat roof. Carried here because it is
   * known only where the slope planes are resolved, and because an axis-aligned box cannot express it.
   */
  coverSlope: number;
}

/**
 * Give every line the covering strip it really carries: half the bay to each neighbour, clipped to the
 * covered span so no strip runs outside the building and no two strips share material. Adjacent strips
 * meet exactly on the mid-bay plane, so they touch and never interpenetrate.
 */
function assignCoveringStrips(lines: RafterSupportTubeLine[], spanFromM: number, spanToM: number): void {
  if (!lines.length) return;
  const order = [...lines].sort((a, b) => a.acrossM - b.acrossM);
  const lo = Math.min(spanFromM, spanToM);
  const hi = Math.max(spanFromM, spanToM);
  const clamp = (v: number) => Math.max(lo, Math.min(hi, v));
  for (let i = 0; i < order.length; i++) {
    const prev = i > 0 ? order[i - 1] : null;
    const next = i < order.length - 1 ? order[i + 1] : null;
    const from = prev ? (prev.acrossM + order[i].acrossM) / 2 : lo;
    const to = next ? (order[i].acrossM + next.acrossM) / 2 : hi;
    order[i].coverFromM = round4(clamp(Math.min(from, to)));
    order[i].coverToM = round4(clamp(Math.max(from, to)));
  }
}

/**
 * Lay the tube lines out for one level.
 *
 * CEILING — the module is absolute. Lines march from the start of the span at exactly the configured
 * spacing so that every board edge lands on a tube; if the span does not finish on a module line, a
 * CLOSING line is added at the far edge to bear the cut board's edge. Re-spacing to "fit" would put
 * every board edge between tubes, which is the failure this whole feature exists to prevent.
 *
 * ROOF — the module is the SPAN. The rake is divided into `ceil(rake / spacing)` equal bays, so the
 * actual span is never larger than the configured spacing, and the lines are converted back to plan
 * ordinates through the slope's pitch.
 */
export function tubeLinesFor(
  cfg: RafterSupportConfig,
  ctx: RafterSupportContext,
  level: RafterSupportLevel,
  runAxis: RafterSupportRunAxis,
  spacingMm: number,
): RafterSupportTubeLine[] {
  // no spacing, no lines — see MIN_TUBE_SPACING_MM. Never clamp a cleared field to 1 mm centres.
  const requested = numOr(spacingMm, 0);
  if (!(requested >= MIN_TUBE_SPACING_MM)) return [];
  const spacing = requested / 1000;
  const alongFrom = runAxis === "x" ? ctx.body.x0 : ctx.body.y0;
  const alongTo = runAxis === "x" ? ctx.body.x1 : ctx.body.y1;
  const acrossFrom = runAxis === "x" ? ctx.body.y0 : ctx.body.x0;
  const acrossTo = runAxis === "x" ? ctx.body.y1 : ctx.body.x1;
  const lengthM = round4(Math.max(0, alongTo - alongFrom));
  const out: RafterSupportTubeLine[] = [];

  if (level.kind === "ceiling") {
    const seat = ctx.floorCeilingZM[level.floorIndex] ?? ctx.floorCeilingZM[ctx.floorCeilingZM.length - 1] ?? 0;
    const span = Math.max(0, acrossTo - acrossFrom);
    const n = Math.floor(span / spacing + 1e-9);
    for (let i = 0; i <= n; i++) {
      out.push({
        id: `${level.id}:L${String(i).padStart(2, "0")}`,
        levelId: level.id,
        index: i,
        runAxis,
        acrossM: round4(acrossFrom + i * spacing),
        fromM: round4(alongFrom),
        toM: round4(alongTo),
        lengthM,
        seatZM: round4(seat),
        dir: -1,
        rakeM: 0,
        onModule: true,
        coverFromM: round4(acrossFrom + i * spacing),
        coverToM: round4(acrossFrom + i * spacing),
        coverSlope: 0,
      });
    }
    const residual = round4(span - n * spacing);
    if (residual > CUT_THRESHOLD_M) {
      out.push({
        id: `${level.id}:L${String(n + 1).padStart(2, "0")}-close`,
        levelId: level.id,
        index: n + 1,
        runAxis,
        acrossM: round4(acrossTo),
        fromM: round4(alongFrom),
        toM: round4(alongTo),
        lengthM,
        seatZM: round4(seat),
        dir: -1,
        rakeM: 0,
        onModule: false,
        coverFromM: round4(acrossTo),
        coverToM: round4(acrossTo),
        coverSlope: 0,
      });
    }
    assignCoveringStrips(out, acrossFrom, acrossTo);
    return out;
  }

  // roof level — divide each slope's rake into equal bays no larger than the configured spacing
  const planes = roofSlopePlanes(ctx, acrossFrom, acrossTo);
  let idx = 0;
  for (const plane of planes) {
    const bays = Math.max(1, Math.ceil(plane.rakeLengthM / spacing - 1e-9));
    const step = plane.rakeLengthM / bays;
    const cos = plane.rakeLengthM > EPS_M ? Math.abs(plane.toM - plane.fromM) / plane.rakeLengthM : 1;
    const sin = plane.rakeLengthM > EPS_M ? Math.abs(plane.toZM - plane.fromZM) / plane.rakeLengthM : 0;
    const sign = plane.toM >= plane.fromM ? 1 : -1;
    // dz/d(across) on this plane: z rises with the rake, and the rake advances in the `sign` direction
    const coverSlope = cos > EPS_M ? (sin / cos) * sign : 0;
    for (let i = 0; i <= bays; i++) {
      // a shared ridge line is emitted once, by the first slope only
      if (i === bays && planes.length > 1 && plane.id !== planes[0].id) continue;
      const rake = i * step;
      const acrossM = round4(plane.fromM + sign * rake * cos);
      out.push({
        id: `${level.id}:${plane.id}:L${String(i).padStart(2, "0")}`,
        levelId: level.id,
        index: idx++,
        runAxis,
        acrossM,
        fromM: round4(alongFrom),
        toM: round4(alongTo),
        lengthM,
        seatZM: round4(plane.fromZM + rake * sin),
        dir: 1,
        rakeM: round4(rake),
        slopeId: plane.id,
        onModule: true,
        coverFromM: acrossM,
        coverToM: acrossM,
        coverSlope: round4(coverSlope),
      });
    }
  }
  const sorted = out.sort((a, b) => a.acrossM - b.acrossM || a.id.localeCompare(b.id));
  // …and only NOW number them. `index` used to be assigned in emission order, so on a gable the second
  // slope's lines carried indices that ran backwards against `acrossM`; `renumberCleats` sorts on that
  // index, which put the RS marks in emission order rather than in layout order.
  sorted.forEach((l, i) => { l.index = i; });
  assignCoveringStrips(sorted, acrossFrom, acrossTo);
  return sorted;
}

/* ------------------------------------------------------------------ cleat layout --------------- */

const cleatMark = (n: number): string => `RS-${String(n).padStart(2, "0")}`;

/** Nearest gridline to a point along the run, and the offset from it (mm). */
function nearestGrid(
  grid: RafterSupportGridMark[],
  runAxis: RafterSupportRunAxis,
  along: number,
  across: number,
): { ref: string; offsetMm: number } {
  if (!grid.length) return { ref: "?", offsetMm: 0 };
  let best = grid[0];
  let bestD = Infinity;
  for (const g of grid) {
    const gx = runAxis === "x" ? g.xM : g.yM;
    const gy = runAxis === "x" ? g.yM : g.xM;
    const d = Math.hypot(gx - along, gy - across);
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  const bestAlong = runAxis === "x" ? best.xM : best.yM;
  return { ref: best.grid, offsetMm: Math.round((along - bestAlong) * 1000) };
}

/**
 * Every cleat of one level: one wherever a tube line crosses a rafter line.
 *
 * Only rafters that actually run PERPENDICULAR to the tube run can carry a cleat — a rafter parallel
 * to the purlin never crosses it — and the crossing must fall inside the rafter's own extent, so a
 * short rafter does not silently acquire cleats it cannot reach.
 */
export function cleatPositionsFor(
  ctx: RafterSupportContext,
  level: RafterSupportLevel,
  lines: RafterSupportTubeLine[],
  runAxis: RafterSupportRunAxis,
): RafterSupportCleatPosition[] {
  const rafterAxis: RafterSupportRunAxis = runAxis === "x" ? "y" : "x";
  const rafters = ctx.rafterLines.filter((r) => r.axis === rafterAxis);
  const out: RafterSupportCleatPosition[] = [];
  for (const line of lines) {
    for (const rafter of rafters) {
      const lo = Math.min(rafter.fromM, rafter.toM);
      const hi = Math.max(rafter.fromM, rafter.toM);
      if (line.acrossM < lo - 1e-4 || line.acrossM > hi + 1e-4) continue;
      const along = rafter.atM;
      if (along < line.fromM - 1e-4 || along > line.toM + 1e-4) continue;
      const g = nearestGrid(ctx.grid, runAxis, along, line.acrossM);
      out.push({
        id: `rs:${line.id}:${rafter.id}`,
        mark: cleatMark(out.length + 1),
        levelId: level.id,
        levelKind: level.kind,
        floorIndex: level.floorIndex,
        lineIndex: line.index,
        lineId: line.id,
        rafterId: rafter.id,
        gridRef: g.ref,
        offsetMm: g.offsetMm,
        xM: runAxis === "x" ? round4(along) : round4(line.acrossM),
        yM: runAxis === "x" ? round4(line.acrossM) : round4(along),
        seatZM: line.seatZM,
        dir: line.dir,
        runAxis,
        acrossM: line.acrossM,
        rakeM: line.rakeM,
        source: "auto",
      });
    }
  }
  return out;
}

/**
 * Sort into a stable order (level, line, along) and reissue RS-01…RS-nn.
 *
 * Every sort key is read defensively: `resolveRafterSupportConfig` now validates each stored position,
 * but this is exported and a caller can hand it a list from anywhere, and a single entry saved by an
 * older build with no `levelId` used to throw `Cannot read properties of undefined` out of the whole
 * studio page rather than out of one schedule.
 */
export function renumberCleats(list: RafterSupportCleatPosition[]): RafterSupportCleatPosition[] {
  const key = (p: RafterSupportCleatPosition | null | undefined) => ({
    levelId: typeof p?.levelId === "string" ? p.levelId : "",
    lineIndex: numOr(p?.lineIndex, 0),
    xM: numOr(p?.xM, 0),
    yM: numOr(p?.yM, 0),
    id: typeof p?.id === "string" ? p.id : "",
  });
  return [...list]
    .filter((p): p is RafterSupportCleatPosition => p !== null && p !== undefined)
    .sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      return (
        ka.levelId.localeCompare(kb.levelId)
        || ka.lineIndex - kb.lineIndex
        || ka.xM - kb.xM
        || ka.yM - kb.yM
        || ka.id.localeCompare(kb.id)
      );
    })
    .map((p, i) => ({ ...p, mark: cleatMark(i + 1) }));
}

/* ------------------------------------------------------------------ resolved levels ------------ */

/** A level with everything derived from it: the run, the spacing, the lines and the covering layout. */
export interface RafterSupportResolvedLevel {
  id: string;
  kind: RafterSupportLevelKind;
  floorIndex: number;
  label: string;
  enabled: boolean;
  runAxis: RafterSupportRunAxis;
  /** The tube centre-to-centre spacing REQUESTED (mm) — the configured module or the level override. */
  spacingMm: number;
  /**
   * The spacing the level is actually BUILT at (mm). A ceiling marches at exactly the module, so this
   * equals `spacingMm`; a roof divides each rake into `ceil(rake / spacing)` EQUAL bays, so the real
   * step is always smaller — 1030.8 mm against a configured 1200 on the shipped default 30 × 12 m
   * gable, a 16.4 % overstatement that the method statement used to print as fact.
   */
  actualSpacingMm: number;
  /** How the requested spacing resolved against the sheet module (ceiling levels only). */
  spacing: TubeSpacingResult | null;
  lines: RafterSupportTubeLine[];
  /** The span parallel to the tubes (m). */
  spanAlongM: number;
  /** The span in the spacing direction (m). */
  spanAcrossM: number;
  /** +1 = builds up off the rafter; −1 = hangs down under it. */
  dir: 1 | -1;
  /** The slope planes this level covers (roof levels only). */
  slopes: RafterSupportSlopePlane[];
  sheetLayout: CeilingSheetLayout | null;
  panelLayouts: RoofPanelLayout[];
  /** Total running length of C-purlin / MS tube at this level (m). */
  runningLengthM: number;
  /**
   * Roof levels only: the sloping area of the EAVE OVERHANG (m²) — the roof that projects beyond the
   * walled body. `roofSlopePlanes` and `panelLayoutFor` are driven entirely off `ctx.body`, so panels
   * are laid out for the walled body ONLY while the validator simultaneously warns that the covering
   * overhangs the eave: 52 m² of a 30 × 12 m gable at a 600 mm overhang. Reported here rather than
   * silently omitted, so the schedule shows what the panel take-off does NOT contain.
   */
  eaveUncoveredAreaSqm: number;
}

/** Which axis the purlins run along: perpendicular to the majority of the rafter lines. */
export function runAxisFor(ctx: RafterSupportContext, level: RafterSupportLevel): RafterSupportRunAxis {
  if (level.runAxis) return level.runAxis;
  let x = 0;
  let y = 0;
  for (const r of ctx.rafterLines) {
    if (r.axis === "x") x++;
    else y++;
  }
  // rafters running along y ⇒ purlins run along x, and vice versa
  return y >= x ? "x" : "y";
}

/** The tube spacing in force at a level (mm) — the level override, else the covering's own module. */
export function spacingForLevel(cfg: RafterSupportConfig, level: RafterSupportLevel): number {
  if (level.tubeSpacingMmOverride && level.tubeSpacingMmOverride > 0) return level.tubeSpacingMmOverride;
  return level.kind === "ceiling" ? cfg.ceilingSheet.tubeSpacingMm : cfg.roofPanel.tubeSpacingMm;
}

/** Resolve one level completely: run, spacing, lines, spans and the covering layout. */
export function resolveLevel(
  cfg: RafterSupportConfig,
  ctx: RafterSupportContext,
  level: RafterSupportLevel,
): RafterSupportResolvedLevel {
  const runAxis = runAxisFor(ctx, level);
  const spacingMm = spacingForLevel(cfg, level);
  const lines = level.enabled ? tubeLinesFor(cfg, ctx, level, runAxis, spacingMm) : [];
  const spanAlongM = round4(
    runAxis === "x" ? ctx.body.x1 - ctx.body.x0 : ctx.body.y1 - ctx.body.y0,
  );
  const spanAcrossM = round4(
    runAxis === "x" ? ctx.body.y1 - ctx.body.y0 : ctx.body.x1 - ctx.body.x0,
  );
  const acrossFrom = runAxis === "x" ? ctx.body.y0 : ctx.body.x0;
  const acrossTo = runAxis === "x" ? ctx.body.y1 : ctx.body.x1;

  const layoutLevel: RafterSupportLayoutLevel = {
    id: level.id,
    kind: level.kind,
    spacingMm,
    // the tube centrelines the covering is really measured against, relative to the start of the span
    tubeStationsMm: lines.map((l) => round2((l.acrossM - acrossFrom) * 1000)),
  };

  if (level.kind === "ceiling") {
    return {
      id: level.id,
      kind: level.kind,
      floorIndex: level.floorIndex,
      label: level.label,
      enabled: level.enabled,
      runAxis,
      spacingMm: round3(spacingMm),
      actualSpacingMm: round3(spacingMm),
      spacing: tubeSpacingForSheet(cfg.ceilingSheet, spacingMm),
      lines,
      spanAlongM,
      spanAcrossM,
      dir: -1,
      slopes: [],
      sheetLayout: level.enabled ? sheetLayoutFor(layoutLevel, spanAlongM, spanAcrossM, cfg.ceilingSheet) : null,
      panelLayouts: [],
      runningLengthM: round3(lines.reduce((a, l) => a + l.lengthM, 0)),
      eaveUncoveredAreaSqm: 0,
    };
  }

  const slopes = roofSlopePlanes(ctx, acrossFrom, acrossTo);
  const usableSpacingM = numOr(spacingMm, 0) >= MIN_TUBE_SPACING_MM ? spacingMm / 1000 : 0;
  const panelLayouts = level.enabled && usableSpacingM > 0
    ? slopes.map((s) => {
        const bays = Math.max(1, Math.ceil(s.rakeLengthM / usableSpacingM - 1e-9));
        const actualSpanMm = round3((s.rakeLengthM / bays) * 1000);
        return panelLayoutFor(
          { id: `${level.id}:${s.id}`, kind: "roof", spacingMm: actualSpanMm },
          spanAlongM,
          s.rakeLengthM,
          cfg.roofPanel,
        );
      })
    : [];
  // the widest bay the panels really span, not the value that was asked for
  const actualSpacingMm = panelLayouts.length
    ? round3(panelLayouts.reduce((a, p) => Math.max(a, p.spanMm), 0))
    : round3(spacingMm);

  // the SLOPING eave-overhang area not included in the body-only panel take-off: the covered rake is
  // (plan span + 2 × overhang) / cos(pitch), the covered plan is the body, and the difference on both
  // axes is the four overhang strips + corners
  const overhang = Math.max(0, ctx.slope.overhangM);
  let eaveUncoveredAreaSqm = 0;
  if (level.enabled && overhang > 0 && slopes.length) {
    const alongPlan = spanAlongM;
    const coveredRake = slopes.reduce((a, s) => a + s.rakeLengthM, 0);
    const meanCos = slopes.length && coveredRake > 0
      ? slopes.reduce((a, s) => a + Math.cos((s.pitchDeg * Math.PI) / 180) * s.rakeLengthM, 0) / coveredRake
      : 1;
    const totalRake = coveredRake + (2 * overhang) / Math.max(EPS_M, meanCos);
    const totalAlong = alongPlan + 2 * overhang;
    const totalSloped = totalRake * totalAlong;
    const coveredSloped = coveredRake * alongPlan;
    eaveUncoveredAreaSqm = round3(Math.max(0, totalSloped - coveredSloped));
  }

  return {
    id: level.id,
    kind: level.kind,
    floorIndex: level.floorIndex,
    label: level.label,
    enabled: level.enabled,
    runAxis,
    spacingMm: round3(spacingMm),
    actualSpacingMm,
    spacing: null,
    lines,
    spanAlongM,
    spanAcrossM,
    dir: 1,
    slopes,
    sheetLayout: null,
    panelLayouts,
    runningLengthM: round3(lines.reduce((a, l) => a + l.lengthM, 0)),
    eaveUncoveredAreaSqm,
  };
}

/**
 * The FINAL cleat list. Once the user has touched the layout (`layoutEdited`), the stored positions are
 * authoritative and are never silently regenerated — manual placements must survive save / reload.
 */
export function resolveCleatPositions(
  cfg: RafterSupportConfig,
  ctx: RafterSupportContext,
  levels: RafterSupportResolvedLevel[],
): RafterSupportCleatPosition[] {
  if (!cfg.enabled) return [];
  if (cfg.layoutEdited) return renumberCleats(cfg.positions ?? []);
  const out: RafterSupportCleatPosition[] = [];
  for (const lv of levels) {
    if (!lv.enabled) continue;
    // a loop, not out.push(...): spreading a long array as arguments throws RangeError well before
    // the array itself is a problem (V8 caps spread arity at ~128 000 here)
    const built = cleatPositionsFor(
      ctx,
      { id: lv.id, kind: lv.kind, floorIndex: lv.floorIndex, label: lv.label, enabled: lv.enabled },
      lv.lines,
      lv.runAxis,
    );
    for (const p of built) out.push(p);
  }
  return renumberCleats(out);
}

/* ------------------------------------------------------------------ geometry ------------------- */

/** An axis-aligned box in colony METRES. */
export interface RafterSupportBox {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
}

/** Every solid of ONE nut-bolt assembly, in colony METRES. Head, washers, shank, nut and thread. */
export interface RafterSupportBoltSolids {
  /** The axis the bolt travels along: "z" for a cleat bolt, "x"/"y" for a web bolt. */
  axis: "x" | "y" | "z";
  /** Bolt centreline point (m). */
  centre: { x: number; y: number; z: number };
  head: RafterSupportBox;
  /** The plain washers, in the order they are fitted (under the head first). */
  washers: RafterSupportBox[];
  /** The plain shank, from under the head to the far face of the nut. It DOES pass through its hosts. */
  shank: RafterSupportBox;
  nut: RafterSupportBox;
  /** The thread projecting beyond the tightened nut — the "is it long enough?" check, made visible. */
  projection: RafterSupportBox;
}

/** What the geometry builders need to know about the level they are drawing. */
export interface RafterSupportGeometryLevel {
  kind: RafterSupportLevelKind;
  /** The REQUESTED tube spacing (mm) — the fallback strip width when the real lines are not supplied. */
  spacingMm: number;
  /**
   * The laid-out tube lines. When present the covering strip is clipped to the line's REAL half-bays
   * (`coverFromM` / `coverToM`) instead of being drawn `spacingMm` wide about the centreline.
   */
  lines?: RafterSupportTubeLine[];
}

/** Every solid of ONE connection, in colony METRES. */
export interface RafterCleatGeometry {
  /**
   * Reference ENVELOPE of the rafter the cleat bolts to (not a priced member — orientation only). Like
   * `purlin`, this is the bounding volume of an open section, NOT solid steel: the cleat bolts' lower
   * washers, nuts and projecting threads sit inside it, in the open depth beside the web. Clash-test
   * against `rafterFlange` / `rafterWeb`, which ARE the steel; both are sub-solids of this envelope and
   * deliberately overlap it.
   */
  rafter: RafterSupportBox;
  /** The rafter FLANGE the cleat bolt actually passes through — the plate the connection bears on. */
  rafterFlange: RafterSupportBox;
  /** The rafter WEB below that flange. The bolt rows straddle it, so a spanner reaches every nut. */
  rafterWeb: RafterSupportBox;
  cleat: RafterSupportBox;
  /**
   * The C-purlin ENVELOPE — the full flange width across the run, the full depth vertically. Note this
   * is the bounding volume of the section, not solid steel: the channel's throat is hollow, and the
   * web-bolt head legitimately sits inside it. Clash-test against `purlinWeb` / the flanges, which ARE
   * the steel; `purlinWeb`, `purlinFlangeNear` and `purlinFlangeFar` are sub-solids of this envelope
   * and deliberately overlap it.
   */
  purlin: RafterSupportBox;
  /** The web plate alone: the flat face the tube sits against and the bolt passes through. */
  purlinWeb: RafterSupportBox;
  /** The C's two flanges, projecting AWAY from the tube. */
  purlinFlangeNear: RafterSupportBox;
  purlinFlangeFar: RafterSupportBox;
  /** The MS tube, its side face FLUSH against `purlinWeb`. */
  tube: RafterSupportBox;
  /** The covering bearing on (roof) or hanging under (ceiling) the tube, one bay wide. */
  covering: RafterSupportBox;
  /** The bolts fixing the cleat down to the rafter. */
  cleatBolts: RafterSupportBoltSolids[];
  /** The bolts clamping the tube to the purlin web. */
  webBolts: RafterSupportBoltSolids[];
  /** The ordinate of the flush web/tube interface plane in the ACROSS direction (m). */
  webFaceAtM: number;
  /** Unit vector from the web into the tube — the direction the exploded view pulls the tube away in. */
  seatNormal: { x: number; y: number; z: number };
  /** Unit vector the assembly stacks along: +z for a roof level, −z for a ceiling level. */
  stackNormal: { x: number; y: number; z: number };
}

/** Build a box from along/across/z extents, mapping the local frame onto colony axes. */
function boxOf(
  runAxis: RafterSupportRunAxis,
  a0: number,
  a1: number,
  n0: number,
  n1: number,
  z0: number,
  z1: number,
): RafterSupportBox {
  const lo = (p: number, q: number) => Math.min(p, q);
  const hi = (p: number, q: number) => Math.max(p, q);
  return runAxis === "x"
    ? { x0: lo(a0, a1), x1: hi(a0, a1), y0: lo(n0, n1), y1: hi(n0, n1), z0: lo(z0, z1), z1: hi(z0, z1) }
    : { x0: lo(n0, n1), x1: hi(n0, n1), y0: lo(a0, a1), y1: hi(a0, a1), z0: lo(z0, z1), z1: hi(z0, z1) };
}

/**
 * Build the exact geometry of ONE connection.
 *
 * Local frame: `a` runs ALONG the purlin / tube (the member length), `n` runs ACROSS it (the spacing
 * direction), `z` is up. `dir` is +1 for a roof level (everything builds UP off the rafter top) and −1
 * for a ceiling level (everything hangs DOWN under the beam soffit) — one sign mirrors the whole
 * assembly, so a ceiling board can never be pushed through the cleat above it.
 *
 * Stacking, in `dir` order from the rafter face:
 *     rafter face → cleat (t) → C-purlin (depth) → [the tube's fixing face, flush] → covering
 * ACROSS the run, the tube's side face is FLUSH against the purlin web at `webFaceAtM`; the C's flanges
 * turn AWAY from the tube so the web face it beds against stays flat and unobstructed. The tube
 * CENTRELINE is the module line, because the covering is fixed to the tube — the purlin and cleat are
 * offset from it, which is exactly what the setting-out table has to print.
 *
 * Nothing floats and nothing interpenetrates: the cleat's near face is the rafter face, the purlin's
 * near face is the cleat's far face, the tube touches the web on exactly one plane, and the covering
 * touches the tube's fixing face. The only solids that pass THROUGH anything are the bolt shanks,
 * which is the definition of a bolted connection.
 */
export function rafterCleatGeometry(
  cfg: RafterSupportConfig,
  pos: RafterSupportCleatPosition,
  level: RafterSupportGeometryLevel,
  rafterOpts: { flangeThicknessMm?: number; depthMm?: number; widthMm?: number } = {},
): RafterCleatGeometry {
  const mm = (v: number) => v / 1000;
  const { cleat, bolt, purlin, tube } = cfg;
  const runAxis = pos.runAxis;
  const dir = pos.dir;

  const alongC = runAxis === "x" ? pos.xM : pos.yM;   // the rafter ordinate
  const acrossC = runAxis === "x" ? pos.yM : pos.xM;  // the TUBE CENTRELINE — the module line

  const s = tube.sideOfWeb === "positive" ? 1 : -1;
  const tubeW = mm(tube.widthMm);
  const tubeD = mm(tube.depthMm);
  const wall = mm(tube.wallThicknessMm);
  const webT = mm(purlin.thicknessMm);
  const flange = mm(purlin.flangeMm);
  const lip = mm(purlin.lipMm);
  const depth = mm(purlin.depthMm);
  const cleatT = mm(cleat.thicknessMm);
  const cleatL = mm(cleat.lengthMm);
  const cleatW = mm(cleat.widthMm);
  const offset = mm(Math.max(0, tube.faceOffsetMm));

  /* ---- ACROSS the run ---- */
  // the flush interface plane: the tube's near face and the web's outer face are the SAME plane
  const webFace = acrossC - s * (tubeW / 2);
  const webBack = webFace - s * webT;
  const purlinOuter = webFace - s * flange;
  const tubeFarN = webFace + s * tubeW;
  // the cleat is centred on the interface plane so its bolts clear BOTH the purlin flange and the tube
  const cleatCentreN = webFace;

  /* ---- ALONG the run (z) ---- */
  const zSeat = pos.seatZM;                     // the rafter face the cleat bolts to
  const zCleatFar = zSeat + dir * cleatT;       // the face the purlin bears on
  const zPurlinFar = zCleatFar + dir * depth;   // the purlin's outer face (top for a roof)
  const zTubeFar = zPurlinFar + dir * offset;   // the tube's FIXING face — flush unless offset
  const zTubeNear = zTubeFar - dir * tubeD;
  const coverT = mm(level.kind === "ceiling" ? cfg.ceilingSheet.thicknessMm : cfg.roofPanel.thicknessMm);
  const zCoverFar = zTubeFar + dir * coverT;

  const halfDetail = mm(Math.max(cleat.lengthMm, cfg.detailSegmentLengthMm)) / 2;

  /* ---- the covering strip THIS line carries ---- */
  // Half the REAL bay to each neighbour, clipped to the covered span — never `spacingMm / 2` either
  // side of the centreline, which drew a full-module strip on a short closing bay (duplicated board),
  // ran half a bay outside the building at both boundaries, and on a roof used the RAKE bay as a PLAN
  // width. The line list is the single source of both the strip and the module.
  const line = level.lines?.find((l) => l.id === pos.lineId);
  const coverFrom = line ? Math.min(line.coverFromM, line.coverToM) : acrossC - mm(level.spacingMm) / 2;
  const coverTo = line ? Math.max(line.coverFromM, line.coverToM) : acrossC + mm(level.spacingMm) / 2;

  /* ---- the rafter reference stub ---- */
  const rFlange = mm(rafterOpts.flangeThicknessMm && rafterOpts.flangeThicknessMm > 0 ? rafterOpts.flangeThicknessMm : 6);
  const rDepth = mm(rafterOpts.depthMm && rafterOpts.depthMm > 0 ? rafterOpts.depthMm : 150);
  const rWidth = mm(rafterOpts.widthMm && rafterOpts.widthMm > 0 ? rafterOpts.widthMm : 100);
  const rafterN0 = cleatCentreN - cleatW / 2 - 0.05;
  const rafterN1 = cleatCentreN + cleatW / 2 + 0.05;
  const zRafterFlangeBack = zSeat - dir * rFlange;

  const rafterBox = boxOf(runAxis, alongC - rWidth / 2, alongC + rWidth / 2, rafterN0, rafterN1, zSeat, zSeat - dir * rDepth);
  // The bolt stack was already computed against a `rFlange`-thick flange while the stub was DRAWN as a
  // solid rDepth block, so every nut, lower washer and projecting thread ended up buried inside it —
  // invisible in exactly the view whose whole point is the visible nut-bolt. The stub is now modelled
  // as the open section it is: a flange plate at the seat and a web below it, between the bolt rows.
  const rafterFlangeBox = boxOf(runAxis, alongC - rWidth / 2, alongC + rWidth / 2, rafterN0, rafterN1, zSeat, zRafterFlangeBack);
  const rafterWebBox = boxOf(
    runAxis,
    alongC - rFlange / 2,
    alongC + rFlange / 2,
    rafterN0,
    rafterN1,
    zRafterFlangeBack,
    zSeat - dir * rDepth,
  );

  const cleatBox = boxOf(
    runAxis,
    alongC - cleatL / 2,
    alongC + cleatL / 2,
    cleatCentreN - cleatW / 2,
    cleatCentreN + cleatW / 2,
    zSeat,
    zCleatFar,
  );

  const purlinBox = boxOf(runAxis, alongC - halfDetail, alongC + halfDetail, purlinOuter, webFace, zCleatFar, zPurlinFar);
  const webBox = boxOf(runAxis, alongC - halfDetail, alongC + halfDetail, webBack, webFace, zCleatFar, zPurlinFar);
  // the two flanges turn AWAY from the tube; the lip returns back toward the web
  const flangeNear = boxOf(runAxis, alongC - halfDetail, alongC + halfDetail, purlinOuter, webBack, zCleatFar, zCleatFar + dir * webT);
  const flangeFar = boxOf(runAxis, alongC - halfDetail, alongC + halfDetail, purlinOuter, webBack, zPurlinFar - dir * webT, zPurlinFar);
  void lip;

  const tubeBox = boxOf(runAxis, alongC - halfDetail, alongC + halfDetail, webFace, tubeFarN, zTubeNear, zTubeFar);

  const coverBox = boxOf(
    runAxis,
    alongC - halfDetail,
    alongC + halfDetail,
    coverFrom,
    coverTo,
    zTubeFar,
    zCoverFar,
  );

  /* ---- the cleat bolts: vertical, through the cleat and the rafter flange ---- */
  const hd = mm(bolt.acrossFlatsMm > 0 ? bolt.acrossFlatsMm : bolt.diameterMm * 1.5) / 2;
  const shankR = mm(bolt.diameterMm) / 2;
  const washR = mm(bolt.washerOuterDiaMm > 0 ? bolt.washerOuterDiaMm : bolt.diameterMm * 2) / 2;
  const washT = mm(bolt.washerThicknessMm);
  const headH = mm(bolt.headHeightMm);
  const nutH = mm(bolt.nutHeightMm);

  const cleatBolts: RafterSupportBoltSolids[] = cleatBoltOffsets(cfg).map(([da, dn]) => {
    const a = alongC + mm(da);
    const n = cleatCentreN + mm(dn);
    // fitted order, outward from the cleat's far face: washer, head
    const zWashTop0 = zCleatFar;
    const zWashTop1 = zCleatFar + dir * washT;
    const zHead1 = zWashTop1 + dir * headH;
    // and inward, past the rafter flange: washer, nut, projecting thread
    const zFlangeBack = zSeat - dir * rFlange;
    const zWashBot1 = zFlangeBack - dir * washT;
    const zNut1 = zWashBot1 - dir * nutH;
    // THE SPECIFIED BOLT IS THE BOLT THAT IS DRAWN. The projection is what is left of the shank once
    // the grip is taken up, not an unconditional `projectionMm` block: an M12 × 12 used to be drawn
    // fully engaged with 10 mm of thread showing, so drawing note 8 ("check that the thread projects
    // beyond the tightened nut") could never fail in the picture it asks an inspector to check.
    const proj = Math.max(0, mm(bolt.lengthMm) - Math.abs(zNut1 - zWashTop1));
    const zProj1 = zNut1 - dir * proj;
    return {
      axis: "z" as const,
      centre: {
        x: runAxis === "x" ? a : n,
        y: runAxis === "x" ? n : a,
        z: (zWashTop1 + zNut1) / 2,
      },
      head: boxOf(runAxis, a - hd, a + hd, n - hd, n + hd, zWashTop1, zHead1),
      washers: [
        boxOf(runAxis, a - washR, a + washR, n - washR, n + washR, zWashTop0, zWashTop1),
        boxOf(runAxis, a - washR, a + washR, n - washR, n + washR, zFlangeBack, zWashBot1),
      ],
      shank: boxOf(runAxis, a - shankR, a + shankR, n - shankR, n + shankR, zWashTop1, zNut1),
      nut: boxOf(runAxis, a - hd, a + hd, n - hd, n + hd, zWashBot1, zNut1),
      projection: boxOf(runAxis, a - shankR, a + shankR, n - shankR, n + shankR, zNut1, zProj1),
    };
  });

  /* ---- the web bolts: HORIZONTAL, through the web and both tube walls ---- */
  // THE CENTRE OF THE REAL LAP, not the mid-depth of the tube. The two coincide only at zero face
  // offset; at a 31 mm offset on a 50 mm tube the mid-tube-depth line sits 6 mm ABOVE the top of the
  // web, so the bolt missed the purlin entirely and only `web-bolt-edge-distance` warned about it —
  // a model with no errors in which the tube is bolted to nothing.
  const zWebBolt = zPurlinFar - dir * mm(webLapMm(cfg)) / 2;
  const webBolts: RafterSupportBoltSolids[] = webBoltOffsets(cfg).map((da) => {
    const a = alongC + mm(da);
    // outward from the web's back face: washer, head
    const nWash0 = webBack;
    const nWash1 = webBack - s * washT;
    const nHead1 = nWash1 - s * headH;
    // and out beyond the tube's far face: washer, nut, projecting thread
    const nWashB1 = tubeFarN + s * washT;
    const nNut1 = nWashB1 + s * nutH;
    // the projection is the balance of the SPECIFIED web bolt over its grip — see the cleat bolt above
    const webProj = Math.max(0, mm(bolt.webLengthMm) - Math.abs(nNut1 - nWash1));
    const nProj1 = nNut1 + s * webProj;
    return {
      axis: (runAxis === "x" ? "y" : "x") as "x" | "y",
      centre: {
        x: runAxis === "x" ? a : acrossC,
        y: runAxis === "x" ? acrossC : a,
        z: zWebBolt,
      },
      head: boxOf(runAxis, a - hd, a + hd, nWash1, nHead1, zWebBolt - hd, zWebBolt + hd),
      washers: [
        boxOf(runAxis, a - washR, a + washR, nWash0, nWash1, zWebBolt - washR, zWebBolt + washR),
        boxOf(runAxis, a - washR, a + washR, tubeFarN, nWashB1, zWebBolt - washR, zWebBolt + washR),
      ],
      shank: boxOf(runAxis, a - shankR, a + shankR, nWash1, nWashB1, zWebBolt - shankR, zWebBolt + shankR),
      nut: boxOf(runAxis, a - hd, a + hd, nWashB1, nNut1, zWebBolt - hd, zWebBolt + hd),
      projection: boxOf(runAxis, a - shankR, a + shankR, nNut1, nProj1, zWebBolt - shankR, zWebBolt + shankR),
    };
  });

  void wall;

  return {
    rafter: rafterBox,
    rafterFlange: rafterFlangeBox,
    rafterWeb: rafterWebBox,
    cleat: cleatBox,
    purlin: purlinBox,
    purlinWeb: webBox,
    purlinFlangeNear: flangeNear,
    purlinFlangeFar: flangeFar,
    tube: tubeBox,
    covering: coverBox,
    cleatBolts,
    webBolts,
    webFaceAtM: round4(webFace),
    seatNormal: runAxis === "x" ? { x: 0, y: s, z: 0 } : { x: s, y: 0, z: 0 },
    stackNormal: { x: 0, y: 0, z: dir },
  };
}

/**
 * Cleat bolt offsets from the cleat centre, as [along, across] in MILLIMETRES.
 * Four bolts sit at the corners of the pitch × gauge rectangle; two sit on the gauge line either side
 * of the purlin/tube; one sits on the centre. The gauge deliberately straddles the members so the nuts
 * can be reached with a spanner.
 */
export function cleatBoltOffsets(cfg: RafterSupportConfig): [number, number][] {
  const n = Math.max(1, Math.round(cfg.bolt.perCleat));
  const hp = cfg.cleat.holePitchMm / 2;
  const hg = cfg.cleat.holeGaugeMm / 2;
  if (n >= 4) {
    return [
      [-hp, -hg],
      [hp, -hg],
      [hp, hg],
      [-hp, hg],
    ].slice(0, n) as [number, number][];
  }
  if (n === 3) return [[-hp, -hg], [hp, -hg], [0, hg]];
  if (n === 2) return [[0, -hg], [0, hg]];
  return [[0, 0]];
}

/** Web bolt offsets ALONG the run from the cleat centre, in MILLIMETRES. */
export function webBoltOffsets(cfg: RafterSupportConfig): number[] {
  const n = Math.max(1, Math.round(cfg.tube.boltsPerConnection));
  const pitch = Math.max(0, cfg.tube.boltPitchMm);
  if (n === 1) return [0];
  const span = pitch * (n - 1);
  return Array.from({ length: n }, (_, i) => round2(-span / 2 + i * pitch));
}

/** The CONTINUOUS members of one whole run, for the 3D model (as opposed to the typical-detail segment). */
export interface TubeRunGeometry {
  purlin: RafterSupportBox;
  purlinWeb: RafterSupportBox;
  tube: RafterSupportBox;
  /**
   * The covering strip this run carries, as an axis-aligned box: the line's REAL half-bay to each
   * neighbour, clipped to the covered span, lying on the tube's fixing face.
   */
  covering: RafterSupportBox;
  /**
   * The FOUR CORNERS of the true covering strip, in fitted order (low-across near, low-across far,
   * high-across far, high-across near). On a ceiling this is the box itself; on a SLOPE it is the
   * tilted quad the box can only bound — an axis-aligned box cannot be pitched, and drawing each strip
   * flat at its own tube left 325 mm of open air between adjacent "panels" on a 20.6° gable. A renderer
   * that wants a continuous roof surface must use this, not `covering`.
   */
  coveringQuad: { x: number; y: number; z: number }[];
  /** Pitch of that quad above horizontal (degrees). 0 for a ceiling and for a flat roof. */
  coveringPitchDeg: number;
  webFaceAtM: number;
}

/** Build the full-length C-purlin, MS tube and covering strip of one tube line. */
export function tubeRunGeometry(
  cfg: RafterSupportConfig,
  line: RafterSupportTubeLine,
  level: RafterSupportGeometryLevel,
): TubeRunGeometry {
  const mm = (v: number) => v / 1000;
  const { cleat, purlin, tube } = cfg;
  const runAxis = line.runAxis;
  const dir = line.dir;
  const acrossC = line.acrossM;
  const s = tube.sideOfWeb === "positive" ? 1 : -1;

  const tubeW = mm(tube.widthMm);
  const tubeD = mm(tube.depthMm);
  const webT = mm(purlin.thicknessMm);
  const flange = mm(purlin.flangeMm);
  const depth = mm(purlin.depthMm);
  const cleatT = mm(cleat.thicknessMm);
  const offset = mm(Math.max(0, tube.faceOffsetMm));

  const webFace = acrossC - s * (tubeW / 2);
  const webBack = webFace - s * webT;
  const purlinOuter = webFace - s * flange;
  const tubeFarN = webFace + s * tubeW;

  const zSeat = line.seatZM;
  const zCleatFar = zSeat + dir * cleatT;
  const zPurlinFar = zCleatFar + dir * depth;
  const zTubeFar = zPurlinFar + dir * offset;
  const zTubeNear = zTubeFar - dir * tubeD;
  const coverT = mm(level.kind === "ceiling" ? cfg.ceilingSheet.thicknessMm : cfg.roofPanel.thicknessMm);

  // The strip is the line's REAL half-bay to each neighbour, clipped to the covered span. Drawing it
  // `level.spacingMm` wide about the centreline duplicated 540 mm of board across an 8.00 m ceiling's
  // 680 mm closing bay, over-ran the building by 610 mm at every boundary, and on a flat roof pushed
  // 57.1 mm of every PUF strip through the next one.
  const coverFrom = Number.isFinite(line.coverFromM) ? Math.min(line.coverFromM, line.coverToM) : acrossC - mm(level.spacingMm) / 2;
  const coverTo = Number.isFinite(line.coverToM) ? Math.max(line.coverFromM, line.coverToM) : acrossC + mm(level.spacingMm) / 2;

  // The true (sloping) strip: the fixing-face plane through this line, at the slope this line carries.
  // A ceiling and a flat roof have zero slope, so the quad is simply the box's own top face.
  const slope = level.kind === "ceiling" ? 0 : numOr(line.coverSlope, 0);
  const zAt = (across: number) => zTubeFar + slope * (across - acrossC);
  const zLo = zAt(coverFrom);
  const zHi = zAt(coverTo);
  const pt = (along: number, across: number, z: number) =>
    runAxis === "x" ? { x: round4(along), y: round4(across), z: round4(z) } : { x: round4(across), y: round4(along), z: round4(z) };
  const coveringQuad = [
    pt(line.fromM, coverFrom, zLo),
    pt(line.toM, coverFrom, zLo),
    pt(line.toM, coverTo, zHi),
    pt(line.fromM, coverTo, zHi),
  ];

  return {
    purlin: boxOf(runAxis, line.fromM, line.toM, purlinOuter, webFace, zCleatFar, zPurlinFar),
    purlinWeb: boxOf(runAxis, line.fromM, line.toM, webBack, webFace, zCleatFar, zPurlinFar),
    tube: boxOf(runAxis, line.fromM, line.toM, webFace, tubeFarN, zTubeNear, zTubeFar),
    covering: boxOf(runAxis, line.fromM, line.toM, coverFrom, coverTo, zTubeFar, zTubeFar + dir * coverT),
    coveringQuad,
    coveringPitchDeg: round2((Math.atan(Math.abs(slope)) * 180) / Math.PI),
    webFaceAtM: round4(webFace),
  };
}

/* ------------------------------------------------------------------ validation ----------------- */

export type RafterSupportIssueLevel = "error" | "warning";

export interface RafterSupportIssue {
  code: string;
  level: RafterSupportIssueLevel;
  message: string;
  memberId?: string;
}

/**
 * Every engineering rule the detail turns on. Errors mean the connection as configured cannot be
 * built; warnings mean it can be built but a competent engineer would question it.
 *
 * Deterministic: the same config and context always produce the same issue list in the same order.
 */
export function validateRafterSupport(
  cfg: RafterSupportConfig,
  ctx: RafterSupportContext,
  levels: RafterSupportResolvedLevel[],
  positions: RafterSupportCleatPosition[],
): RafterSupportIssue[] {
  const out: RafterSupportIssue[] = [];
  if (!cfg.enabled) return out;

  const err = (code: string, message: string, memberId?: string) =>
    out.push({ code, level: "error", message, memberId });
  const warn = (code: string, message: string, memberId?: string) =>
    out.push({ code, level: "warning", message, memberId });

  const { cleat, bolt, purlin, tube, ceilingSheet, roofPanel } = cfg;

  /* ---- levels ---- */
  const enabled = levels.filter((l) => l.enabled);
  if (!enabled.length) {
    err("no-levels", "The rafter support system is enabled but no level is switched on — nothing would be built.");
  }
  const levelIds = new Set<string>();
  for (const l of levels) {
    if (levelIds.has(l.id)) err("duplicate-level-id", `Duplicate level id ${l.id}.`, l.id);
    levelIds.add(l.id);
  }

  /* ---- the cleat plate ---- */
  if (!(cleat.thicknessMm > 0)) {
    err("cleat-no-thickness",
      `Cleat plate thickness is zero — a ${cleat.lengthMm} × ${cleat.widthMm} × 0 mm plate is never acceptable.`);
  }
  if (!(cleat.lengthMm > 0) || !(cleat.widthMm > 0)) {
    err("cleat-no-size", "Cleat plate length or width is zero.");
  }
  const needW = requiredCleatWidthMm(cfg);
  if (cleat.widthMm + 1e-9 < needW) {
    err("cleat-too-narrow",
      `Cleat is ${cleat.widthMm} mm across but the C-purlin flange, the tube and both bolt rows need ${needW} mm.`);
  }
  const needL = requiredCleatLengthMm(cfg);
  if (cleat.lengthMm + 1e-9 < needL) {
    warn("cleat-too-short",
      `Cleat is ${cleat.lengthMm} mm along the run but a ${cleat.holePitchMm} mm bolt pitch with ${cleat.edgeDistanceMm} mm edge distance needs ${needL} mm.`);
  }
  if (cleat.holeCount !== bolt.perCleat) {
    warn("hole-count-mismatch",
      `Cleat has ${cleat.holeCount} holes but ${bolt.perCleat} bolts per cleat are specified.`);
  }

  /* ---- the nut-bolt ---- */
  if (cleat.boltHoleDiaMm <= bolt.diameterMm) {
    warn("hole-clearance",
      `Bolt hole ${cleat.boltHoleDiaMm} mm gives no clearance over the M${bolt.diameterMm} bolt — the bolt cannot be entered.`);
  }
  const minEdge = round2(1.5 * bolt.diameterMm);
  if (cleat.edgeDistanceMm + 1e-9 < minEdge) {
    warn("bolt-edge-distance",
      `Bolt edge distance ${cleat.edgeDistanceMm} mm is below the 1.5 × M${bolt.diameterMm} = ${minEdge} mm minimum.`);
  }
  const needCleatBolt = requiredCleatBoltLengthMm(cfg, rafterFlangeThicknessOf(ctx));
  if (bolt.lengthMm + 1e-9 < needCleatBolt) {
    err("bolt-too-short",
      `Cleat bolt M${bolt.diameterMm} × ${bolt.lengthMm} mm is too short — washer + ${cleat.thicknessMm} mm cleat + ${rafterFlangeThicknessOf(ctx)} mm rafter flange + washer + nut + ${bolt.projectionMm} mm projection needs ${needCleatBolt} mm.`);
  }
  const needWebBolt = requiredWebBoltLengthMm(cfg);
  if (bolt.webLengthMm + 1e-9 < needWebBolt) {
    err("web-bolt-too-short",
      `Web bolt M${bolt.diameterMm} × ${bolt.webLengthMm} mm is too short — washer + ${purlin.thicknessMm} mm purlin web + ${tube.widthMm} mm tube (both walls) + washer + nut + ${bolt.projectionMm} mm projection needs ${needWebBolt} mm.`);
  }
  if (!(bolt.projectionMm > 0)) {
    warn("no-bolt-projection",
      "No thread projection is specified — an inspector cannot confirm the bolt is fully engaged.");
  }
  if (bolt.washersPerBolt < 2) {
    warn("washer-count",
      `${bolt.washersPerBolt} washer per bolt — the detail fits one under the head AND one under the nut.`);
  }
  // The bolt gauge must clear the widest member the cleat carries, or the nut cannot be reached. Two
  // thresholds, because a 4 mm shortfall used to produce steel embedded in steel and still pass as
  // buildable: the HOLE under the member is an error (C 150 × 65 at the 140 mm gauge drove the washer
  // 2.5 mm — the whole flange thickness — into the flange), while a head/washer that merely oversails
  // the member is a warning.
  const widest = Math.max(purlin.flangeMm, tube.widthMm);
  const holeNeeded = round2(widest + cleat.boltHoleDiaMm / 2);
  const solidNeeded = round2(widest + Math.max(bolt.washerOuterDiaMm, bolt.acrossFlatsMm) / 2);
  if (cleat.holeGaugeMm / 2 + 1e-9 < holeNeeded) {
    err("bolt-clashes-member",
      `Bolt gauge ${cleat.holeGaugeMm} mm puts a cleat bolt hole under the C-purlin flange or the tube — the bolt cannot be entered and the nut cannot be tightened. Needs at least ${round2(holeNeeded * 2)} mm.`);
  } else if (cleat.holeGaugeMm / 2 + 1e-9 < solidNeeded) {
    warn("bolt-washer-clashes-member",
      `Bolt gauge ${cleat.holeGaugeMm} mm leaves the head / washer sitting on the C-purlin flange or the tube. Needs at least ${round2(solidNeeded * 2)} mm for a flat bearing.`);
  }
  // strictly stronger than the edge-distance case below, so it is tested first
  if (cleat.holeGaugeMm / 2 > cleat.widthMm / 2 + 1e-9) {
    err("bolt-off-cleat",
      `Bolt gauge ${cleat.holeGaugeMm} mm puts the bolt hole ${round2((cleat.holeGaugeMm - cleat.widthMm) / 2)} mm OUTSIDE a ${cleat.widthMm} mm cleat — there is no plate to drill.`);
  } else if (cleat.holeGaugeMm / 2 + cleat.edgeDistanceMm > cleat.widthMm / 2 + 1e-9) {
    warn("bolt-off-cleat",
      `Bolt gauge ${cleat.holeGaugeMm} mm leaves less than the ${cleat.edgeDistanceMm} mm edge distance on a ${cleat.widthMm} mm cleat.`);
  }
  // the same edge-distance question on the OTHER member the bolt passes through: nothing used to test
  // the bolt pitch against the rafter flange it is drilled into
  const rafterWidthMm = ctx.rafterWidthMm !== undefined && ctx.rafterWidthMm > 0 ? ctx.rafterWidthMm : 0;
  if (rafterWidthMm > 0 && cleat.holePitchMm / 2 + minEdge > rafterWidthMm / 2 + 1e-9) {
    warn("bolt-edge-distance-rafter",
      `A ${cleat.holePitchMm} mm bolt pitch on a ${rafterWidthMm} mm wide rafter leaves ${round2(rafterWidthMm / 2 - cleat.holePitchMm / 2)} mm to the rafter edge — below the 1.5 × M${bolt.diameterMm} = ${minEdge} mm minimum.`);
  }

  /* ---- the C-purlin ---- */
  if (!(purlin.thicknessMm > 0)) {
    err("purlin-no-thickness", "C-purlin thickness is zero — a section cannot be fabricated with no thickness.");
  }
  if (!(purlin.depthMm > 0) || !(purlin.flangeMm > 0)) {
    warn("purlin-section-missing",
      "The C-purlin section is incomplete — depth, flange and thickness are all required before fabrication.");
  }
  if (purlin.depthMm + 1e-9 < tube.depthMm) {
    err("purlin-shallower-than-tube",
      `The C-purlin web is ${purlin.depthMm} mm deep but the tube is ${tube.depthMm} mm — a tube cannot be bolted flush to a shallower web.`);
  }

  /* ---- the MS tube ---- */
  if (!(tube.wallThicknessMm > 0)) {
    err("tube-no-thickness", "MS tube wall thickness is zero — a hollow section cannot have no wall.");
  }
  if (!(tube.widthMm > 0) || !(tube.depthMm > 0)) {
    err("tube-section-missing", "The MS tube section is incomplete — width, depth and wall thickness are all required.");
  }
  if (tube.widthMm > 0 && tube.wallThicknessMm > 0 && tube.wallThicknessMm * 2 >= tube.widthMm) {
    err("tube-section-invalid",
      `A ${tube.widthMm} mm tube cannot have ${tube.wallThicknessMm} mm walls — the section has no bore.`);
  }
  if (!(tube.boltsPerConnection > 0)) {
    err("tube-not-bolted",
      "No bolts are specified between the MS tube and the C-purlin web — the tube would be unrestrained.");
  }
  const lap = webLapMm(cfg);
  if (lap > 0 && lap / 2 + 1e-9 < minEdge) {
    warn("web-bolt-edge-distance",
      `The tube overlaps the web by only ${lap} mm, giving ${round2(lap / 2)} mm to the bolt centre — below the 1.5 × M${bolt.diameterMm} = ${minEdge} mm minimum.`);
  }
  // a lap that cannot even contain the hole is not a connection, it is a drawing
  if (lap > 0 && cleat.boltHoleDiaMm > 0 && lap + 1e-9 < cleat.boltHoleDiaMm) {
    err("web-bolt-hole-off-lap",
      `The tube overlaps the C-purlin web by only ${lap} mm — a Ø${cleat.boltHoleDiaMm} mm hole does not fit inside the lap, so the bolt cannot pass through both members.`);
  }
  if (tube.faceOffsetMm > 0 && tube.faceOffsetMm >= tube.depthMm) {
    err("tube-off-web",
      `A ${tube.faceOffsetMm} mm face offset lifts the ${tube.depthMm} mm tube clear of the C-purlin web — there is nothing left to bolt through.`);
  }
  /* ---- what the tube is actually billed at ---- */
  const geo = tubeSectionKgPerM(tube);
  const used = tubeKgPerM(tube);
  const catalogue = tubeCatalogueKgPerM(tube);
  const catalogueRow = tubeSectionOption(tube.materialKey);
  if (catalogueRow && catalogue === undefined && tube.widthMm > 0 && tube.depthMm > 0 && tube.wallThicknessMm > 0) {
    warn("tube-section-mismatch",
      `The tube is keyed to ${tube.materialKey} (${catalogueRow.widthMm} × ${catalogueRow.depthMm} × ${catalogueRow.wallThicknessMm} mm) but is dimensioned ${tube.widthMm} × ${tube.depthMm} × ${tube.wallThicknessMm} mm — the Material Master rate and weight belong to a different section.`);
  }
  if (catalogue !== undefined && catalogue > 0 && used > 0 && Math.abs(used - catalogue) / catalogue > 0.02) {
    // a tabulated section is the authority; anything more than 2 % off it is a data-entry error
    warn("tube-unit-weight-drift",
      `The tube is taken off at ${used} kg/m but the Material Master's ${tube.materialKey} row is ${catalogue} kg/m — check the override against the Material Master.`);
  } else if (catalogue === undefined && geo > 0 && used > 0 && Math.abs(used - geo) / geo > 0.1) {
    warn("tube-unit-weight-drift",
      `The tube unit weight override ${used} kg/m differs from the ${geo} kg/m the ${tube.designation} section derives — check the Material Master row.`);
  }
  if (geo > 0 && used > geo + 1e-9) {
    warn("tube-unit-weight-above-bound",
      `The tube is taken off at ${used} kg/m, heavier than the ${geo} kg/m sharp-corner upper bound for a ${tube.widthMm} × ${tube.depthMm} × ${tube.wallThicknessMm} mm hollow section — a rolled section cannot exceed it.`);
  }
  // one override cannot answer for two very different lengths — see boltUnitWeightKg
  if (bolt.unitWeightKgOverride !== undefined && bolt.webUnitWeightKgOverride === undefined
      && Math.abs(bolt.webLengthMm - bolt.lengthMm) > 1e-9) {
    warn("web-bolt-weight-not-overridden",
      `A unit weight is set for the M${bolt.diameterMm} × ${bolt.lengthMm} cleat bolt but not for the M${bolt.diameterMm} × ${bolt.webLengthMm} web bolt — the web bolt is being derived, not read from the Material Master.`);
  }

  /* ---- the covering specifications themselves ---- */
  // Nothing used to check any of these, so a cleared field produced 62 000 000 ceiling boards, 20 000
  // roof panels, 720 000 purlin pieces or a RangeError, all with an empty (or 6 075-long) issue list.
  if (!(ceilingSheet.sheetLengthMm > 0) || !(ceilingSheet.sheetWidthMm > 0)) {
    if (levels.some((l) => l.kind === "ceiling")) {
      err("sheet-size-invalid",
        `The ceiling board is ${ceilingSheet.sheetLengthMm} × ${ceilingSheet.sheetWidthMm} mm — a board with no size cannot be laid out.`);
    }
  }
  if (!(roofPanel.coverWidthMm > 0) && levels.some((l) => l.kind === "roof")) {
    err("panel-cover-width-invalid",
      `The roof panel cover width is ${roofPanel.coverWidthMm} mm — no panel layout can be produced.`);
  }
  if (!(purlin.lengthMm > 0)) {
    err("stock-length-invalid",
      `The C-purlin stock length is ${purlin.lengthMm} mm — a piece count cannot be taken off a stock length of zero.`);
  }
  if (!(tube.lengthMm > 0)) {
    err("stock-length-invalid",
      `The MS tube stock length is ${tube.lengthMm} mm — a piece count cannot be taken off a stock length of zero.`);
  }

  /* ---- the covering module, per level ---- */
  let levelWithoutCleats = false;
  for (const lv of enabled) {
    // no spacing, no lines — tubeLinesFor refuses to lay a level out below MIN_TUBE_SPACING_MM
    if (!(lv.spacingMm >= MIN_TUBE_SPACING_MM)) {
      err("tube-spacing-invalid",
        `${lv.label}: the tube spacing is ${lv.spacingMm} mm — below the ${MIN_TUBE_SPACING_MM} mm minimum this system will lay out, so no tube line, cleat or covering can be set out.`,
        lv.id);
    }
    if (lv.kind === "ceiling") {
      const sp = lv.spacing;
      if (sp && !sp.divides) {
        err("sheet-edge-unsupported",
          `${lv.label}: a ${ceilingSheet.sheetLengthMm} mm sheet is not a whole multiple of the ${lv.spacingMm} mm tube spacing (${round3(sp.divisions)} bays) — sheet edges would land between tubes. Use ${sp.nearestDividingMm} mm c/c.`,
          lv.id);
      }
      const layout = lv.sheetLayout;
      if (layout) {
        const acrossFrom = lv.runAxis === "x" ? ctx.body.y0 : ctx.body.x0;
        const stations = lv.lines.map((l) => (l.acrossM - acrossFrom) * 1000);
        const nearestStation = (j: number): number => {
          if (!stations.length) return Math.abs(j - Math.round(j / Math.max(1, lv.spacingMm)) * lv.spacingMm);
          let best = Infinity;                     // a loop, not Math.min(...): spread arity throws
          for (const s of stations) {
            const d = Math.abs(j - s);
            if (d < best) best = d;
          }
          return best;
        };
        // capped: one issue per joint used to let a bad board size push 6 075 entries into an array
        // the admin UI has to render
        const reported = layout.unsupportedJointsMm.slice(0, MAX_JOINT_ISSUES_PER_LEVEL);
        for (const j of reported) {
          const off = round2(nearestStation(j));
          err("sheet-joint-off-tube",
            `${lv.label}: the sheet joint at ${j} mm is ${off} mm off the nearest tube centreline (tolerance ${ceilingSheet.edgeToleranceMm} mm).`,
            lv.id);
        }
        if (layout.unsupportedJointsMm.length > reported.length) {
          err("sheet-joint-off-tube-more",
            `${lv.label}: a further ${layout.unsupportedJointsMm.length - reported.length} sheet joint(s) miss a tube centreline — fix the tube spacing before reading the rest.`,
            lv.id);
        }
        if (layout.cutSheetLengthMm > 0 && layout.cutSheetLengthMm < ceilingSheet.sheetLengthMm / 4) {
          warn("sheet-sliver",
            `${lv.label}: the closing board is only ${layout.cutSheetLengthMm} mm long — consider re-centring the board run.`,
            lv.id);
        }
        if (!ceilingSheet.crossNoggins && layout.crossJointStationsMm.length > 0) {
          warn("sheet-cross-joint-unsupported",
            `${lv.label}: ${layout.crossJointStationsMm.length} board joint(s) run parallel to the tubes with no cross noggin — that edge is unsupported.`,
            lv.id);
        }
      }
      /* ---- the board must not cantilever past the last tube ---- */
      // This used to be guarded by `!lv.lines.some(l => !l.onModule)` — "only check when there is NO
      // closing line" — while `tubeLinesFor` adds a closing line whenever the residual exceeds 1 mm.
      // The rule could therefore only ever ask whether a ≤ 1 mm residual exceeded the 150 mm limit,
      // which it never can: 20 000 brute-forced spans from 0.002 m to 40 m never fired it at ANY limit
      // down to 0. It now measures the REAL cantilever off the real line list — the invariant the
      // closing line exists to hold, verified rather than assumed.
      if (lv.lines.length) {
        const acrossFrom = lv.runAxis === "x" ? ctx.body.y0 : ctx.body.x0;
        const acrossTo = lv.runAxis === "x" ? ctx.body.y1 : ctx.body.x1;
        let first = Infinity;
        let last = -Infinity;
        for (const l of lv.lines) {
          if (l.acrossM < first) first = l.acrossM;
          if (l.acrossM > last) last = l.acrossM;
        }
        const over = round2(Math.max(first - Math.min(acrossFrom, acrossTo), Math.max(acrossFrom, acrossTo) - last) * 1000);
        if (over > ceilingSheet.maxOverhangMm) {
          warn("covering-overhang",
            `${lv.label}: the ceiling cantilevers ${over} mm past the last tube (limit ${ceilingSheet.maxOverhangMm} mm).`,
            lv.id);
        }
      }
    } else {
      for (const pl of lv.panelLayouts) {
        if (pl.hasCutPanel) {
          // named per slope: a gable emitted two byte-identical warnings with nothing to tell them apart
          const slopeRef = pl.levelId.includes(":") ? pl.levelId.slice(pl.levelId.indexOf(":") + 1) : pl.levelId;
          warn("panel-cut-required",
            `${lv.label} (${slopeRef}): the ${round2(lv.spanAlongM * 1000)} mm slope width is not a whole multiple of the ${roofPanel.coverWidthMm} mm panel cover width — ${pl.wholePanels} whole panels plus one cut panel ${pl.cutPanelWidthMm} mm wide.`,
            lv.id);
        }
        if (!pl.spanOk) {
          err("panel-span-exceeded",
            `${lv.label}: the panel spans ${pl.spanMm} mm between tubes but the ${roofPanel.thicknessMm} mm panel is limited to ${roofPanel.maxSpanMm} mm.`,
            lv.id);
        }
        if (pl.piecesPerRun > 1) {
          warn("panel-end-lap",
            `${lv.label}: the ${pl.rakeLengthMm} mm rake exceeds the ${roofPanel.maxPanelLengthMm} mm maximum panel length — ${pl.piecesPerRun} pieces per run with a ${roofPanel.endLapMm} mm end lap.`,
            lv.id);
        }
      }
      const eave = round2(ctx.slope.overhangM * 1000);
      if (eave > roofPanel.maxOverhangMm) {
        warn("covering-overhang",
          `${lv.label}: the panel overhangs the eave by ${eave} mm past the last tube (limit ${roofPanel.maxOverhangMm} mm). The eave overhang is NOT included in the panel take-off — see roofEaveUncoveredAreaSqm.`,
          lv.id);
      }
    }

    /* ---- the tube cantilever beyond the outermost cleat ---- */
    const onLevel = positions.filter((p) => p.levelId === lv.id);
    if (onLevel.length) {
      let lo = Infinity;                          // a loop, not Math.min(...alongs): spread arity throws
      let hi = -Infinity;
      for (const p of onLevel) {
        const a = lv.runAxis === "x" ? p.xM : p.yM;
        if (a < lo) lo = a;
        if (a > hi) hi = a;
      }
      const from = lv.runAxis === "x" ? ctx.body.x0 : ctx.body.y0;
      const to = lv.runAxis === "x" ? ctx.body.x1 : ctx.body.y1;
      const over = round2(Math.max(lo - from, to - hi) * 1000);
      if (over > tube.maxOverhangMm) {
        warn("tube-overhang",
          `${lv.label}: the MS tube cantilevers ${over} mm beyond the outermost cleat (limit ${tube.maxOverhangMm} mm).`,
          lv.id);
      }
    } else if (lv.lines.length && !cfg.layoutEdited) {
      // `level-no-cleats` diagnoses the AUTO layout — tube lines that no rafter crosses. Once the user
      // has edited the layout, an empty level is their own decision and the single global `no-cleats`
      // says so: two errors for one problem is one error too many.
      levelWithoutCleats = true;
      err("level-no-cleats",
        `${lv.label}: ${lv.lines.length} tube line(s) are laid out but no rafter crosses them — there is nothing to bolt a cleat to.`,
        lv.id);
    }
  }

  /* ---- the cleat layout ---- */
  // one problem, one error: `level-no-cleats` already names the level and the reason
  if (enabled.length && !positions.length && !levelWithoutCleats) {
    err("no-cleats", "The rafter support system is enabled but no cleat is placed.");
  }
  // A stored cleat on a level that no longer exists is DRAWN (resolveCleatPositions returns every
  // stored position) but never PRICED (the take-off filters on the level id), so saving on G+2 and
  // reopening as G+1 silently orphaned 121 cleats — 223 kg of plate and 726 bolts that appeared in the
  // drawings and in no schedule, with no issue raised at all.
  const knownLevelIds = new Set(levels.map((l) => l.id));
  const orphans = positions.filter((p) => !knownLevelIds.has(p.levelId));
  if (orphans.length) {
    const marks = orphans.slice(0, 6).map((p) => p.mark).join(", ");
    err("cleat-orphan-level",
      `${orphans.length} stored cleat(s) belong to level(s) that no longer exist (${marks}${orphans.length > 6 ? ", …" : ""}) — they are drawn but not priced. Restore the level or delete the cleats.`);
  }
  const ids = new Set<string>();
  const coords = new Set<string>();
  for (const p of positions) {
    if (ids.has(p.id)) err("duplicate-id", `Duplicate cleat id ${p.id}.`, p.id);
    ids.add(p.id);
    const key = `${p.levelId}:${Math.round(p.xM * 1000)}:${Math.round(p.yM * 1000)}`;
    if (coords.has(key)) {
      err("duplicate-position", `Two cleats share the same coordinate at ${p.levelId} (${p.mark}).`, p.id);
    }
    coords.add(key);
  }

  return out;
}

/* ------------------------------------------------------------------ take-off ------------------- */

/** The take-off of one level. Every number is calculated — none is ever hardcoded. */
export interface RafterSupportLevelTakeoff {
  levelId: string;
  kind: RafterSupportLevelKind;
  floorIndex: number;
  label: string;
  /** The REQUESTED tube spacing (mm). */
  spacingMm: number;
  /** The spacing the level is actually BUILT at (mm) — smaller than `spacingMm` on a roof. */
  actualSpacingMm: number;
  tubeLines: number;
  cleats: number;
  cleatBolts: number;
  webBolts: number;
  bolts: number;
  nuts: number;
  washers: number;
  /** Erected (net-of-holes) cleat weight (kg). */
  cleatKg: number;
  /** Purchased (gross, undrilled) cleat weight (kg) — what a plate order must carry. */
  cleatGrossKg: number;
  purlinPieces: number;
  purlinRunningLengthM: number;
  purlinKg: number;
  tubePieces: number;
  tubeRunningLengthM: number;
  tubeKg: number;
  nogginPieces: number;
  nogginRunningLengthM: number;
  /** 6 m stock lengths the noggins are CUT FROM — priced but never previously ordered. */
  nogginStockPieces: number;
  nogginKg: number;
  /** Ceiling levels only. */
  sheetsWhole: number;
  sheetsCut: number;
  sheets: number;
  sheetAreaSqm: number;
  sheetPurchasedAreaSqm: number;
  sheetKg: number;
  /** Roof levels only. */
  panelsWhole: number;
  panelsCut: number;
  panels: number;
  panelCutWidthMm: number;
  panelAreaSqm: number;
  panelPurchasedAreaSqm: number;
  panelKg: number;
  /** Roof levels only: the sloping eave overhang NOT included in the panel take-off (m²). */
  eaveUncoveredAreaSqm: number;
  screws: number;
  steelKg: number;
}

/** The complete, single-source-of-truth quantity + weight take-off for the whole system. */
export interface RafterSupportTakeoff {
  enabled: boolean;
  levels: RafterSupportLevelTakeoff[];
  /* counts */
  cleats: number;
  cleatBolts: number;
  webBolts: number;
  bolts: number;
  nuts: number;
  washers: number;
  purlinPieces: number;
  purlinRunningLengthM: number;
  tubePieces: number;
  tubeRunningLengthM: number;
  nogginPieces: number;
  nogginRunningLengthM: number;
  /** 6 m stock lengths the noggins are cut from — a real purchase line, absent before. */
  nogginStockPieces: number;
  ceilingSheetsWhole: number;
  ceilingSheetsCut: number;
  ceilingSheets: number;
  ceilingAreaSqm: number;
  ceilingPurchasedAreaSqm: number;
  roofPanelsWhole: number;
  roofPanelsCut: number;
  roofPanels: number;
  roofPanelAreaSqm: number;
  roofPanelPurchasedAreaSqm: number;
  /** The sloping eave overhang across all roof levels NOT included in `roofPanelAreaSqm` (m²). */
  roofEaveUncoveredAreaSqm: number;
  screws: number;
  /* unit weights */
  cleatUnitKg: number;
  /** Purchased (gross, undrilled) weight of one cleat plate (kg). */
  cleatGrossUnitKg: number;
  cleatBoltUnitKg: number;
  webBoltUnitKg: number;
  nutUnitKg: number;
  washerUnitKg: number;
  purlinKgPerM: number;
  tubeKgPerM: number;
  ceilingSheetKgPerSqm: number;
  roofPanelKgPerSqm: number;
  /* totals */
  cleatKg: number;
  boltKg: number;
  nutKg: number;
  washerKg: number;
  purlinKg: number;
  tubeKg: number;
  nogginKg: number;
  ceilingSheetKg: number;
  roofPanelKg: number;
  totalSteelKg: number;
  /* echoed geometry so no consumer recomputes it */
  webLapMm: number;
  requiredCleatBoltLengthMm: number;
  requiredWebBoltLengthMm: number;
}

const emptyLevelTakeoff = (lv: RafterSupportResolvedLevel): RafterSupportLevelTakeoff => ({
  levelId: lv.id,
  kind: lv.kind,
  floorIndex: lv.floorIndex,
  label: lv.label,
  spacingMm: lv.spacingMm,
  tubeLines: 0,
  cleats: 0,
  cleatBolts: 0,
  webBolts: 0,
  bolts: 0,
  nuts: 0,
  washers: 0,
  cleatKg: 0,
  purlinPieces: 0,
  purlinRunningLengthM: 0,
  purlinKg: 0,
  tubePieces: 0,
  tubeRunningLengthM: 0,
  tubeKg: 0,
  nogginPieces: 0,
  nogginRunningLengthM: 0,
  nogginKg: 0,
  sheetsWhole: 0,
  sheetsCut: 0,
  sheets: 0,
  sheetAreaSqm: 0,
  sheetPurchasedAreaSqm: 0,
  sheetKg: 0,
  panelsWhole: 0,
  panelsCut: 0,
  panels: 0,
  panelCutWidthMm: 0,
  panelAreaSqm: 0,
  panelPurchasedAreaSqm: 0,
  panelKg: 0,
  screws: 0,
  steelKg: 0,
});

/**
 * Build the take-off. Every count follows from the resolved levels and cleat positions — change the
 * spacing, the level list or the building and every quantity, running length and weight follows.
 */
export function rafterSupportTakeoff(
  cfg: RafterSupportConfig,
  levels: RafterSupportResolvedLevel[],
  positions: RafterSupportCleatPosition[],
  /** The rafter flange the cleat bolt passes through (mm) — only used for the echoed grip length. */
  rafterFlangeThicknessMm = 6,
): RafterSupportTakeoff {
  const on = cfg.enabled;
  const { cleat, bolt, purlin, tube, ceilingSheet, roofPanel } = cfg;

  const cleatUnitKg = cleatUnitWeightKg(cleat);
  const cleatBoltUnitKg = boltUnitWeightKg(bolt, bolt.lengthMm);
  const webBoltUnitKg = boltUnitWeightKg(bolt, bolt.webLengthMm);
  const nutUnitKg = nutUnitWeightKg(bolt);
  const washerUnitKg = washerUnitWeightKg(bolt);
  const pKgM = purlinKgPerM(purlin);
  const tKgM = tubeKgPerM(tube);

  const nutsPer = Math.max(0, Math.round(bolt.nutsPerBolt));
  const washersPer = Math.max(0, Math.round(bolt.washersPerBolt));
  const perCleat = Math.max(0, Math.round(bolt.perCleat));
  const perWeb = Math.max(0, Math.round(tube.boltsPerConnection));
  const purlinCut = Math.max(0.001, purlin.lengthMm / 1000);
  const tubeCut = Math.max(0.001, tube.lengthMm / 1000);

  const levelTakeoffs: RafterSupportLevelTakeoff[] = [];

  for (const lv of levels) {
    const t = emptyLevelTakeoff(lv);
    if (!on || !lv.enabled) {
      levelTakeoffs.push(t);
      continue;
    }
    const onLevel = positions.filter((p) => p.levelId === lv.id);
    t.tubeLines = lv.lines.length;
    t.cleats = onLevel.length;
    t.cleatBolts = t.cleats * perCleat;
    t.webBolts = t.cleats * perWeb;
    t.bolts = t.cleatBolts + t.webBolts;
    t.nuts = t.bolts * nutsPer;
    t.washers = t.bolts * washersPer;
    t.cleatKg = round3(t.cleats * cleatUnitKg);

    t.purlinRunningLengthM = round3(lv.lines.reduce((a, l) => a + l.lengthM, 0));
    t.purlinPieces = lv.lines.reduce((a, l) => a + Math.max(1, Math.ceil(l.lengthM / purlinCut - 1e-9)), 0);
    t.purlinKg = round3(t.purlinRunningLengthM * pKgM);

    t.tubeRunningLengthM = t.purlinRunningLengthM;
    t.tubePieces = lv.lines.reduce((a, l) => a + Math.max(1, Math.ceil(l.lengthM / tubeCut - 1e-9)), 0);
    t.tubeKg = round3(t.tubeRunningLengthM * tKgM);

    if (lv.kind === "ceiling" && lv.sheetLayout) {
      const s = lv.sheetLayout;
      t.sheetsWhole = s.wholeSheets;
      t.sheetsCut = s.cutSheets;
      t.sheets = s.totalSheets;
      t.sheetAreaSqm = s.coveredAreaSqm;
      t.sheetPurchasedAreaSqm = s.purchasedAreaSqm;
      t.sheetKg = round3(s.purchasedAreaSqm * ceilingSheet.unitWeightKgPerSqm);
      t.nogginPieces = s.nogginPieces;
      t.nogginRunningLengthM = s.nogginRunningLengthM;
      t.nogginKg = round3(s.nogginRunningLengthM * tKgM);
      t.screws = s.screws;
    }

    if (lv.kind === "roof" && lv.panelLayouts.length) {
      for (const p of lv.panelLayouts) {
        t.panelsWhole += p.wholePanels * p.piecesPerRun;
        t.panelsCut += p.hasCutPanel ? p.piecesPerRun : 0;
        t.panels += p.totalPanels;
        t.panelCutWidthMm = Math.max(t.panelCutWidthMm, p.cutPanelWidthMm);
        t.panelAreaSqm = round3(t.panelAreaSqm + p.coveredAreaSqm);
        t.panelPurchasedAreaSqm = round3(t.panelPurchasedAreaSqm + p.purchasedAreaSqm);
        t.screws += p.screws;
      }
      t.panelKg = round3(t.panelPurchasedAreaSqm * roofPanel.unitWeightKgPerSqm);
    }

    t.steelKg = round3(
      t.cleatKg
      + t.purlinKg
      + t.tubeKg
      + t.nogginKg
      + t.cleatBolts * cleatBoltUnitKg
      + t.webBolts * webBoltUnitKg
      + t.nuts * nutUnitKg
      + t.washers * washerUnitKg,
    );
    levelTakeoffs.push(t);
  }

  const sum = (pick: (t: RafterSupportLevelTakeoff) => number): number =>
    levelTakeoffs.reduce((a, t) => a + pick(t), 0);

  const cleats = sum((t) => t.cleats);
  const cleatBolts = sum((t) => t.cleatBolts);
  const webBolts = sum((t) => t.webBolts);
  const bolts = cleatBolts + webBolts;
  const nuts = sum((t) => t.nuts);
  const washers = sum((t) => t.washers);
  const purlinRunningLengthM = round3(sum((t) => t.purlinRunningLengthM));
  const tubeRunningLengthM = round3(sum((t) => t.tubeRunningLengthM));
  const nogginRunningLengthM = round3(sum((t) => t.nogginRunningLengthM));

  const cleatKg = round3(cleats * cleatUnitKg);
  const boltKg = round3(cleatBolts * cleatBoltUnitKg + webBolts * webBoltUnitKg);
  const nutKg = round3(nuts * nutUnitKg);
  const washerKg = round3(washers * washerUnitKg);
  const purlinKg = round3(purlinRunningLengthM * pKgM);
  const tubeKg = round3(tubeRunningLengthM * tKgM);
  const nogginKg = round3(nogginRunningLengthM * tKgM);
  const ceilingSheetKg = round3(sum((t) => t.sheetKg));
  const roofPanelKg = round3(sum((t) => t.panelKg));

  return {
    enabled: on,
    levels: levelTakeoffs,
    cleats,
    cleatBolts,
    webBolts,
    bolts,
    nuts,
    washers,
    purlinPieces: sum((t) => t.purlinPieces),
    purlinRunningLengthM,
    tubePieces: sum((t) => t.tubePieces),
    tubeRunningLengthM,
    nogginPieces: sum((t) => t.nogginPieces),
    nogginRunningLengthM,
    ceilingSheetsWhole: sum((t) => t.sheetsWhole),
    ceilingSheetsCut: sum((t) => t.sheetsCut),
    ceilingSheets: sum((t) => t.sheets),
    ceilingAreaSqm: round3(sum((t) => t.sheetAreaSqm)),
    ceilingPurchasedAreaSqm: round3(sum((t) => t.sheetPurchasedAreaSqm)),
    roofPanelsWhole: sum((t) => t.panelsWhole),
    roofPanelsCut: sum((t) => t.panelsCut),
    roofPanels: sum((t) => t.panels),
    roofPanelAreaSqm: round3(sum((t) => t.panelAreaSqm)),
    roofPanelPurchasedAreaSqm: round3(sum((t) => t.panelPurchasedAreaSqm)),
    screws: sum((t) => t.screws),
    cleatUnitKg,
    cleatBoltUnitKg,
    webBoltUnitKg,
    nutUnitKg,
    washerUnitKg,
    purlinKgPerM: pKgM,
    tubeKgPerM: tKgM,
    ceilingSheetKgPerSqm: ceilingSheet.unitWeightKgPerSqm,
    roofPanelKgPerSqm: roofPanel.unitWeightKgPerSqm,
    cleatKg,
    boltKg,
    nutKg,
    washerKg,
    purlinKg,
    tubeKg,
    nogginKg,
    ceilingSheetKg,
    roofPanelKg,
    totalSteelKg: round3(cleatKg + boltKg + nutKg + washerKg + purlinKg + tubeKg + nogginKg),
    webLapMm: on ? webLapMm(cfg) : 0,
    requiredCleatBoltLengthMm: on ? requiredCleatBoltLengthMm(cfg, rafterFlangeThicknessMm) : 0,
    requiredWebBoltLengthMm: on ? requiredWebBoltLengthMm(cfg) : 0,
  };
}

/* ------------------------------------------------------------------ derived bundle ------------- */

/** Everything a consumer needs, resolved once. */
export interface RafterSupportDerived {
  config: RafterSupportConfig;
  levels: RafterSupportResolvedLevel[];
  positions: RafterSupportCleatPosition[];
  takeoff: RafterSupportTakeoff;
  issues: RafterSupportIssue[];
  errors: RafterSupportIssue[];
  warnings: RafterSupportIssue[];
}

/**
 * Resolve the whole rafter support system from a stored config + the building it sits on. THE entry
 * point — the model builder, the drawings, the 3D view, the schedules and the reports all call this
 * and nothing else, so a quantity can never differ between two surfaces.
 */
export function deriveRafterSupport(
  stored: Partial<RafterSupportConfig> | undefined | null,
  ctx: RafterSupportContext,
): RafterSupportDerived {
  const config = resolveRafterSupportConfig(stored);
  const levelSpecs = resolveLevels(config, ctx);
  const levels = config.enabled ? levelSpecs.map((l) => resolveLevel(config, ctx, l)) : [];
  const positions = resolveCleatPositions(config, ctx, levels);
  const takeoff = rafterSupportTakeoff(config, levels, positions, rafterFlangeThicknessOf(ctx));
  const issues = validateRafterSupport(config, ctx, levels, positions);
  return {
    config,
    levels,
    positions,
    takeoff,
    issues,
    errors: issues.filter((i) => i.level === "error"),
    warnings: issues.filter((i) => i.level === "warning"),
  };
}

/* ------------------------------------------------------------------ method statement ----------- */

export interface RafterSupportMethodStep {
  no: number;
  title: string;
  detail: string;
}

/**
 * The erection method statement — 15 model-driven steps. Every quantity is read from the resolved
 * take-off, so the sequence can never narrate a count the model does not show.
 */
export function rafterSupportMethodSteps(d: RafterSupportDerived): RafterSupportMethodStep[] {
  const { config: c, levels, takeoff: t, positions } = d;
  const first = positions[0]?.mark ?? "RS-01";
  const last = positions[positions.length - 1]?.mark ?? first;
  const cleatSize = `${c.cleat.lengthMm} × ${c.cleat.widthMm} × ${c.cleat.thicknessMm} mm`;
  const cleatBolt = `M${c.bolt.diameterMm} × ${c.bolt.lengthMm} gr ${c.bolt.grade}`;
  const webBolt = `M${c.bolt.diameterMm} × ${c.bolt.webLengthMm} gr ${c.bolt.grade}`;
  const ceilings = levels.filter((l) => l.enabled && l.kind === "ceiling");
  const roofs = levels.filter((l) => l.enabled && l.kind === "roof");
  const spacings = levels.filter((l) => l.enabled).map((l) => `${l.label} @ ${l.spacingMm} mm c/c`).join("; ");
  const plural = (n: number) => (n === 1 ? "" : "s");

  return [
    {
      no: 1,
      title: "Check the rafters and set the datum",
      detail:
        `Confirm every rafter / ceiling beam is erected, aligned and level. Establish the covering datum at each `
        + `of the ${levels.filter((l) => l.enabled).length} enabled level${plural(levels.filter((l) => l.enabled).length)} `
        + `before any cleat is drilled.`,
    },
    {
      no: 2,
      title: "Set out the tube centrelines from the covering module",
      detail:
        `Mark ${t.levels.reduce((a, l) => a + l.tubeLines, 0)} tube centreline${plural(t.levels.reduce((a, l) => a + l.tubeLines, 0))} — `
        + `${spacings || "no level enabled"}. The tube centreline IS the module line: every covering edge is measured from it, `
        + `never from the rafter positions.`,
    },
    {
      no: 3,
      title: `Mark the ${t.cleats} cleat location${plural(t.cleats)}`,
      detail:
        `Mark cleat${plural(t.cleats)} ${first}–${last} where each tube centreline crosses a rafter, using the setting-out `
        + `offsets from the nearest gridline given in the cleat schedule.`,
    },
    {
      no: 4,
      title: "Drill the cleats and the rafter flanges",
      detail:
        `Drill ${t.cleatBolts} hole${plural(t.cleatBolts)} at Ø${c.cleat.boltHoleDiaMm} mm (${c.bolt.perCleat} per cleat) on a `
        + `${c.cleat.holePitchMm} mm pitch × ${c.cleat.holeGaugeMm} mm gauge, holding ${c.cleat.edgeDistanceMm} mm edge distance. `
        + `Drill the cleat and the rafter flange together or use a template. Deburr every hole.`,
    },
    {
      no: 5,
      title: `Bolt the ${t.cleats} cleat plate${plural(t.cleats)} to the rafters`,
      detail:
        `Fix ${t.cleats} cleat${plural(t.cleats)} (${cleatSize}, ${c.cleat.grade}) with ${t.cleatBolts} × ${cleatBolt}. `
        + `${c.bolt.tighteningNote}`,
    },
    {
      no: 6,
      title: "Check the nut-bolts",
      detail:
        `Confirm a washer under every head and every nut (${t.washers} washer${plural(t.washers)} in total for `
        + `${t.bolts} bolt${plural(t.bolts)} and ${t.nuts} nut${plural(t.nuts)}), and that the thread projects at least `
        + `${c.bolt.projectionMm} mm beyond each tightened nut.`,
    },
    {
      no: 7,
      title: "Land the C-purlins on the cleats",
      detail:
        `Lift ${t.purlinPieces} ${c.purlin.designation} piece${plural(t.purlinPieces)} (${t.purlinRunningLengthM.toFixed(2)} m, `
        + `${t.purlinKg.toFixed(1)} kg) and seat them on the cleats with the flanges turned AWAY from the tube line, so the web `
        + `face stays flat and clear.`,
    },
    {
      no: 8,
      title: "Align and level the purlin runs",
      detail:
        `String-line every purlin run and check level end to end before any tube is offered up. A twisted purlin puts the tube `
        + `out of plane and no packing will recover the covering module.`,
    },
    {
      no: 9,
      title: "Offer the MS tube flush to the purlin web",
      detail:
        `Place ${t.tubePieces} ${c.tube.designation} piece${plural(t.tubePieces)} (${t.tubeRunningLengthM.toFixed(2)} m, `
        + `${t.tubeKg.toFixed(1)} kg) side by side with the purlin, the tube face FLUSH against the web over a `
        + `${t.webLapMm} mm lap. No packing and no gap.`,
    },
    {
      no: 10,
      title: "Drill and bolt the tube through the web",
      detail:
        `Drill ${t.webBolts} hole${plural(t.webBolts)} (${c.tube.boltsPerConnection} per connection at ${c.tube.boltPitchMm} mm `
        + `pitch) through the ${c.purlin.thicknessMm} mm web and BOTH walls of the tube, and fit ${t.webBolts} × ${webBolt}. `
        + `A bolt fixed into a single tube wall has nothing to bear against.`,
    },
    {
      no: 11,
      title: "Verify the tube plane and the module",
      detail:
        `Check every tube centreline against the setting-out and confirm the tubes are in one plane. `
        + `Required grip: ${t.requiredCleatBoltLengthMm} mm at the cleat and ${t.requiredWebBoltLengthMm} mm at the web.`,
    },
    {
      no: 12,
      title: "Clean and coat",
      detail:
        `Remove swarf and burrs, wire-brush the drilled and cut faces and apply ${c.purlin.finish} / ${c.cleat.finish} to `
        + `every exposed and drilled surface before the covering hides them.`,
    },
    {
      no: 13,
      title: ceilings.length
        ? `Fix the ceiling boards — ${t.ceilingSheets} board${plural(t.ceilingSheets)}`
        : "Ceiling boarding — not applicable",
      detail: ceilings.length
        ? `Fix ${t.ceilingSheetsWhole} whole ${c.ceilingSheet.sheetLengthMm} × ${c.ceilingSheet.sheetWidthMm} mm `
          + `${c.ceilingSheet.material} board${plural(t.ceilingSheetsWhole)} plus ${t.ceilingSheetsCut} cut board${plural(t.ceilingSheetsCut)} `
          + `(${t.ceilingAreaSqm.toFixed(2)} m² covered) under the tubes with ${c.ceilingSheet.fixingSpec}. Every board edge must land `
          + `on a tube; provide noggins at the joints running parallel to the tubes.`
        : "No ceiling level is enabled on this colony.",
    },
    {
      no: 14,
      title: roofs.length
        ? `Lay the roof panels — ${t.roofPanels} panel${plural(t.roofPanels)}`
        : "Roof panelling — not applicable",
      detail: roofs.length
        ? `Lay ${t.roofPanelsWhole} whole ${c.roofPanel.coverWidthMm} mm cover-width ${c.roofPanel.thicknessMm} mm PUF `
          + `panel${plural(t.roofPanelsWhole)}${t.roofPanelsCut > 0 ? ` plus ${t.roofPanelsCut} cut panel${plural(t.roofPanelsCut)}` : ""} `
          + `down the slope (${t.roofPanelAreaSqm.toFixed(2)} m²), one interlocking into the next, and fix with `
          + `${c.roofPanel.fixingSpec}. ${c.roofPanel.sideLapDetail}.`
        : "No roof level is enabled on this colony.",
    },
    {
      no: 15,
      title: "Complete the inspection",
      detail:
        `Record the tube spacing, the flush web bearing, bolt tightness, thread projection and the covering module for all `
        + `${t.cleats} connection${plural(t.cleats)} (${t.totalSteelKg.toFixed(1)} kg of steel). ${RAFTER_SUPPORT_EXPLANATION} `
        + RAFTER_SUPPORT_APPROVAL_DISCLAIMER,
    },
  ];
}

/** The typical-assembly callout, e.g. "Typical assembly RSA-01 — cleat + C-purlin + MS tube". */
export function rafterSupportAssemblyCallout(cfg: RafterSupportConfig, index = 0): string {
  const mark = `RSA-${String(index + 1).padStart(2, "0")}`;
  return (
    `Typical assembly ${mark} — 1 cleat ${cfg.cleat.lengthMm} × ${cfg.cleat.widthMm} × ${cfg.cleat.thicknessMm} `
    + `+ ${cfg.bolt.perCleat} × M${cfg.bolt.diameterMm} to the rafter + ${cfg.purlin.designation} `
    + `+ ${cfg.tube.designation} bolted to the web with ${cfg.tube.boltsPerConnection} × M${cfg.bolt.diameterMm}`
  );
}

/* ------------------------------------------------------------------ small helpers -------------- */

const round2 = (v: number): number => Math.round(v * 100) / 100;
const round3 = (v: number): number => Math.round(v * 1000) / 1000;
const round4 = (v: number): number => Math.round(v * 10000) / 10000;
