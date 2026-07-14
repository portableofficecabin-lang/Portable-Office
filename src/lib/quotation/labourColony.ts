/**
 * Labour Colony / Labour Camp quotation calculation engine.
 *
 * Pure, framework-agnostic functions: a config object goes in, a full set of
 * calculations + a BOQ comes out. No React / Supabase / DOM dependencies.
 *
 * Spec-driven weights:
 *  - MS members (base frame, columns, roof frame, wall studs, purlins, cross
 *    bracing) carry a section profile + wall thickness; weight/m is COMPUTED
 *    from the cross-section (kg/m = steel area in mm^2 x 0.00785).
 *  - PUF/EPS panels: kg/m^2 = 2 skins + foam, scaled by chosen panel thickness
 *    (30/40/50/60/75 mm typical).
 *  - Flooring cement board: kg/m^2 from chosen board thickness (16/18/20/25 mm).
 *  - Internal partitions: PPGI sheet, weight by chosen sheet thickness.
 *  - Nut-bolts for cross-support / module connections: counted and weighed by
 *    bolt size (M10/M12/M16).
 *
 * MODEL: identical MS-framed modules (room sized, LxW) in two rows along a
 * central corridor; toilet/dining/office are extra modules included only when
 * their toggle is ON. Quotation/production-grade estimate, NOT a stamped design.
 *
 * Units: metres / square metres / kilograms (1 sqm = 10.7639 sqft).
 */

// Type-only: LabourColonyConfig carries the Material BOQ's saved settings so they persist inside the
// project's `data` jsonb. Type-only, so this engine keeps zero runtime dependency on the BOQ engine.
import type { BoqSettings } from "@/lib/boq/types";

export type PanelType = "PUF" | "EPS" | "GI";
export type FloorCount = 1 | 2 | 3; // 1 = Ground, 2 = G+1, 3 = G+2
export type BoltSize = "M10" | "M12" | "M16";
export type SectionShape = "SHS" | "RHS" | "ANGLE" | "PIPE" | "C" | "ISMC";

export interface MsSection {
  shape: SectionShape;
  /** mm. SHS: side; RHS: depth; ANGLE: leg1; PIPE: outer dia; C/ISMC: depth. */
  a: number;
  /** mm. RHS: width; ANGLE: leg2; C/ISMC: flange. Ignored for SHS/PIPE. */
  b: number;
  /** Wall / leg thickness, mm. */
  thicknessMm: number;
  /** Override computed weight (used for tabulated ISMC/C channels). */
  fixedKgM?: number;
}

export interface MemberSections {
  baseFrame: MsSection;
  columns: MsSection;
  roofFrame: MsSection;
  wallStud: MsSection;
  purlin: MsSection;
  bracing: MsSection; // cross support
}

export interface FacilityToggles {
  toilet: boolean;
  bunkBeds: boolean;
  diningKitchen: boolean;
  officeSecurity: boolean;
}

/** Which wall of a room rectangle an opening sits on, in plan orientation:
 *  "top"/"bottom" = the horizontal walls (upper / lower); "left"/"right" = the vertical side walls. */
export type RoomWall = "top" | "bottom" | "left" | "right";

/** A single fully-customizable DOOR on a room (drawing only — no BOQ effect). A room may carry any
 *  number of these. Every field is optional with a sensible fallback so partial configs stay valid.
 *  The engine auto-resolves each door's position to keep the configurable minimum clearance from the
 *  window, other doors, wall corners/partitions and staircases (see roomFloorPlan.ts). */
export interface RoomDoor {
  /** Stable id for the managed list. */
  id: string;
  /** Wall the door sits on (plan orientation: top/bottom/left/right). Default = the veranda wall. */
  wall?: RoomWall;
  /** Distance from the wall's START corner (top→left, left→top) to the door's near edge, METRES.
   *  Undefined = auto-place toward the far end. Auto-clamped to honour clearances. */
  offsetM?: number;
  /** Door leaf width, METRES (0/undefined = colony default door width). */
  widthM?: number;
  /** Door height, METRES (0/undefined = colony default door height). Schedule/caption only (plan is 2D). */
  heightM?: number;
  /** Hinge jamb along the wall: "start" (near the wall's start corner) or "end". Default "start". */
  hinge?: "start" | "end";
  /** Leaf swings "in" (into the room, default) or "out" (away from the room). */
  swing?: "in" | "out";
}

/** Per-room construction floor-plan overrides (drawing only — no effect on quantities/BOQ).
 *  A room's window sits on its veranda-facing wall; doors can sit on ANY of the four walls, any
 *  number of them. Legacy single-door fields are kept for back-compat (migrated to one RoomDoor
 *  when `doors` is absent). Offsets in the legacy fields are FEET; new RoomDoor offsets are METRES.
 *  Keyed by the global 1-based room number so they survive room-count changes. */
export interface RoomOpeningOverride {
  /** Multiple fully-customizable doors. When present it REPLACES the legacy single-door fields
   *  below for this room; when absent, the legacy fields synthesize one door. */
  doors?: RoomDoor[];
  /** ft from the room's left corner to the DOOR's near edge (legacy single door). */
  doorFromLeftFt?: number;
  /** ft from the room's left corner to the WINDOW's near edge. */
  windowFromLeftFt?: number;
  /** Per-room WINDOW width override, metres (0/undefined = global window width). */
  windowWidthM?: number;
  /** Per-room WINDOW height override, metres (0/undefined = global window height). */
  windowHeightM?: number;
  /** Which jamb the legacy door hinges on. Default "left". */
  doorHinge?: "left" | "right";
  /** Which wall the legacy DOOR sits on: "external" = veranda-facing wall (default), "internal" = spine wall. */
  doorSide?: "external" | "internal";
  /** Per-room legacy DOOR width override, metres (0/undefined = global door width). */
  doorWidthM?: number;
  /** Per-room legacy DOOR height override, metres (0/undefined = global door height). */
  doorHeightM?: number;
  /** Per-room length override ALONG the building, metres (0/undefined = use global roomLength). */
  lengthM?: number;
  /** Per-room depth override toward the veranda, metres (0/undefined = use global roomWidth). */
  depthM?: number;
}

/**
 * Full staircase customization for the room-wise floor plan drawing (drawing only — no
 * effect on quantities/BOQ). Lengths are METRES; riser is mm; steps is a count. Every
 * value is optional and falls back to a sensible default so partial configs stay valid.
 */
export interface StaircaseDrawConfig {
  /** Stable id for the managed list. */
  id?: string;
  /** Display label (e.g. "Staircase A"). */
  label?: string;
  /** Draw the staircase(s). Default: true when floors > 1. */
  enabled?: boolean;
  /** Side(s) the staircase sits on. "both" = one at each opposite end (reference layout). Default "both". */
  position?: "left" | "right" | "top" | "bottom" | "both";
  /** Slide the staircase block along its wall from the default position, metres (+/-). */
  offsetM?: number;
  /** Free horizontal shift (left − / right +) from the anchored position, metres. */
  dxM?: number;
  /** Free vertical shift (up − / down +) from the anchored position, metres. */
  dyM?: number;
  /** Flight width across the treads, metres. */
  widthM?: number;
  /** Explicit total run length of the flight (excludes landing), metres. Omitted = steps × (tread + gap). */
  totalLengthM?: number;
  /** Derive the riser COUNT from the floor height so the flight lands exactly on the next floor
   *  level (risers = round(floorHeight / riserMm), then the riser is solved back exactly).
   *  Default true. Set false to pin an explicit `steps` count instead. */
  autoRise?: boolean;
  /** Number of risers. Ignored unless `autoRise` is false — otherwise it is derived. */
  steps?: number;
  /** Tread depth ("going") — horizontal run of one step, metres. Default 0.25. */
  treadM?: number;
  /** PREFERRED riser height, mm (the target `autoRise` rounds to). Default 180. */
  riserMm?: number;
  /** Extra gap between consecutive steps beyond the tread, metres (usually 0). */
  gapM?: number;
  /** Landing depth at the top of the flight, metres (0 = none drawn). */
  landingM?: number;
  /** End the flight is entered from (first step / arrow start). Default "left". */
  entry?: "left" | "right";
  /** Ascent direction of the UP arrow: "up" = away from entry (default), "down" = toward entry. */
  direction?: "up" | "down";
  /** Draw a hand railing along both sides of the flight. Default true. */
  handrail?: boolean;
}

/**
 * A single veranda / corridor / walkway band on one side of the room block (drawing only).
 * Multiple may sit on the same side. Lengths are METRES. Every field optional with sane defaults.
 */
export interface VerandaDrawConfig {
  /** Stable id for the managed list. */
  id?: string;
  /** Display label (e.g. "Front veranda"). */
  label?: string;
  /** Draw this veranda. Default true. */
  enabled?: boolean;
  /** Which side of the room block it sits on. Default "top". */
  side?: "top" | "bottom" | "left" | "right";
  /** Depth of the veranda from the block edge, metres. Default = colony veranda width. */
  widthM?: number;
  /** Length along the side, metres. 0/undefined = full block span on that side. */
  lengthM?: number;
  /** Shift along the side from the start corner, metres. Default 0. */
  offsetM?: number;
  /** Draw a safety railing along the open (outer) edge. Default true. */
  railing?: boolean;
}

/** Roof profile for the ELEVATION drawings (drawing only — no BOQ effect). */
export interface ElevationRoofConfig {
  /** "gable" (ridge along length), "hip", "flat" or "mono" (single slope). Default "gable". */
  type?: "gable" | "hip" | "flat" | "mono";
  /** Ridge rise above the eave line, metres. Default 0.7. */
  riseM?: number;
  /** Eave overhang beyond the walls, metres. Default 0.3. */
  overhangM?: number;
}

export interface RoomFloorPlanConfig {
  /** Veranda / walkway depth in feet (both verandas). Default ≈ corridorWidth converted to ft. */
  verandaWidthFt?: number;
  /** Door leaf width, ft (drawing + schedule). Default 3. */
  doorWidthFt?: number;
  /** Default door height, metres (drawing caption + schedule; per-room override wins). Default 2.0. */
  doorHeightM?: number;
  /** Default door wall placement: "external" = veranda-facing (default), "internal" = spine-facing. Per-room override wins. */
  doorSide?: "external" | "internal";
  /** Default door swing: "in" = leaf swings into the room (default), "out" = away. Per-door override wins. */
  doorSwing?: "in" | "out";
  /** Window width, ft (drawing + schedule). Default 4. */
  windowWidthFt?: number;
  /** Default window height, metres (drawing caption + schedule; per-room override wins). Default 1.2. */
  windowHeightM?: number;
  /** Per-room overrides keyed by global 1-based room number. */
  rooms?: Record<number, RoomOpeningOverride>;
  /** Drawn wall / panel thickness, mm (double-line walls + panel-dimension callouts). Default 100. */
  wallThicknessMm?: number;
  /** Spacing between adjacent room modules along the building, metres. Default 0. */
  roomGapM?: number;
  /** Full staircase customization (legacy single staircase; superseded by `staircases`). */
  staircase?: StaircaseDrawConfig;
  /** Managed list of staircases, each fully customizable. Falls back to `staircase` / defaults when absent. */
  staircases?: StaircaseDrawConfig[];
  /** Managed list of verandas / corridors. Falls back to peripheral top + bottom defaults when absent. */
  verandas?: VerandaDrawConfig[];
  /** Show the panel / wall-thickness dimension callouts in the drawing. Default true. */
  showPanelDims?: boolean;
  /** Minimum clearance (m) from a corner/partition AND between the door & window. Default 0.1524 (6"). */
  minClearanceM?: number;
  /** Elevation roof (drawing only): profile type + rise + eave overhang, metres. */
  roof?: ElevationRoofConfig;
  /** Elevation structural frame (drawing only): column grid, cross bracing, panel courses. */
  structure?: ElevationStructureConfig;
  /** Draw the safety railing along the open (outer) veranda edges. Default true. */
  showRailing?: boolean;
}

/**
 * Structural detailing for the ELEVATION drawings (drawing only — never changes quantities/BOQ).
 *
 * The column grid is DERIVED from the plan (one column line at every room partition, at each
 * external wall face and at each veranda's outer edge), then any bay wider than `maxBaySpacingM`
 * is auto-subdivided so the frame reads like the real steel structure. Column and brace member
 * sizes default to the project's own MemberSections (columns / bracing), so the drawing matches
 * the steel that is actually being quoted.
 */
export interface ElevationStructureConfig {
  /** Draw the steel column grid. Default true. */
  columns?: boolean;
  /** Max centre-to-centre column spacing (m). Bays wider than this are auto-subdivided. Default 3. */
  maxBaySpacingM?: number;
  /** Drawn column width (m). Default = MemberSections.columns section depth (RHS 100 → 0.1 m). */
  columnWidthM?: number;
  /** Cross-bracing pattern drawn in a braced bay. Default "x". */
  bracePattern?: "x" | "single" | "none";
  /** Which bays carry bracing. Default "all". */
  braceBays?: "all" | "ends" | "alternate";
  /** Which floors carry bracing. Default "all". */
  braceFloors?: "all" | "ground" | "upper";
  /** Drawn brace member thickness (m). Default = MemberSections.bracing leg (ANGLE 50 → 0.05 m). */
  braceThickM?: number;
  /** Never brace a bay that a door/window opening falls into. Default true. */
  braceClearOpenings?: boolean;
  /** Horizontal sandwich-panel course (joint) spacing, m. 0 = no course lines. Default 1. */
  panelCourseM?: number;
  /** Staircase appearance. "steel" (default) = open stringer + treads + baluster handrail, matching
   *  the blue-painted steel frame; "rcc" = a solid cast waist slab. */
  stairStyle?: "steel" | "rcc";
  /** Handrail height above the stair nosing / landing, m. Default 0.9. */
  handrailHeightM?: number;
  /** Draw the veranda/walkway deck edge + railing on the side (gable-end) elevations. Default true. */
  showDecks?: boolean;
  /** Draw the bottom dimension chain (veranda | rooms | veranda) + height dims. Default true. */
  showDims?: boolean;
  /**
   * WHICH FACE IS THE "FRONT". Purely a naming/orientation choice — the geometry is identical
   * either way, only the four titles move.
   *   "length" (default) — Front/Rear = the LONG faces (they show the building length and carry the
   *                        doors, windows and veranda); Left/Right = the short gable ends.
   *   "width"            — Front/Rear = the SHORT gable ends (they show the building width);
   *                        Left/Right = the long faces.
   */
  frontFace?: "length" | "width";
}

export interface LabourColonyConfig {
  projectName?: string;
  location?: string;

  personsPerRoom: number;
  totalRooms?: number;
  capacity?: number;

  floors: FloorCount;

  roomLength: number;
  roomWidth: number;
  roomHeight: number;
  corridorWidth: number;
  /** Where the corridor/passage sits. "both" = verandas on upper AND lower sides (peripheral). Default "center". */
  corridorPosition?: "center" | "top" | "bottom" | "left" | "right" | "both";
  /** Where the staircase(s) sit. "both" = opposite ends (reference). Default "both". */
  staircasePosition?: "left" | "right" | "top" | "bottom" | "both";
  /** Staircase width (m). Default derived from corridor width. */
  staircaseWidth?: number;

  /** Display + entry unit for all lengths (inputs + drawing labels). Storage stays metric. Default "ftin". */
  lengthUnit?: "ft" | "ftin" | "m" | "cm" | "mm";

  panelType: PanelType;
  panelThicknessMm: number; // 30 / 40 / 50 / 60 / 75
  /** PUF/EPS steel skin thickness (mm), per face. Default 0.5. */
  panelSkinThicknessMm?: number;
  wastagePercent: number;

  /** Internal partition material. Default "ppgi". */
  partitionMaterial?: "ppgi" | "panel";
  /** PPGI partition sheet thickness (mm), e.g. 0.5 / 0.6 / 0.8. */
  ppgiPartitionThicknessMm?: number;
  /** Faces of PPGI sheet on the partition frame (1 or 2). Default 2. */
  ppgiPartitionFaces?: number;

  /** Cement / bison board flooring thickness (mm): 16 / 18 / 20 / 25. */
  cementBoardThicknessMm?: number;

  /** Connection / cross-support bolt size. Default M12. */
  boltSize?: BoltSize;

  facilities: FacilityToggles;

  /** Per-member MS section overrides. */
  sections?: Partial<MemberSections>;

  /** Room-wise construction floor-plan (door/window positions & veranda). Drawing only. */
  floorPlan?: RoomFloorPlanConfig;

  /** Material BOQ settings — rates, wastage, structural norms, per-line overrides, charges, template.
   *  calculateLabourColony() does not read this: the legacy quantity engine and the Material BOQ are
   *  separate models, and tuning a BOQ rate must not move the structure/panel/weight results. It lives
   *  here only so it persists inside labour_colony_projects.data (jsonb) with no migration. */
  materialBoq?: BoqSettings;

  norms?: Partial<LabourColonyNorms>;
}

export interface LabourColonyNorms {
  personsPerWC: number;
  personsPerUrinal: number;
  personsPerBath: number;
  personsPerWashBasin: number;
  ventilationFloorFraction: number;

  ledWatt: number;
  fanWatt: number;
  socketAllowanceWatt: number;
  lightsPerRoom: number;
  fansPerRoom: number;
  socketsPerRoom: number;
  diversityFactor: number;

  /** kg/m per mm^2 of steel cross-section (7850 kg/m3 -> 0.00785). */
  steelDensityFactor: number;
  /** Tabulated ISMC channel weights (kg/m), keyed "depthxflange". */
  ismcTable: Record<string, number>;

  // member spacings (m)
  floorJoistSpacing: number;
  wallStudSpacing: number;
  purlinSpacing: number;
  columnSpacingMax: number;

  // panels
  /** Foam core density kg/m3 by panel type. */
  foamDensity: Record<PanelType, number>;
  /** PPGI / steel sheet density used for skins & partitions, kg/m3. */
  sheetDensity: number;

  // flooring
  cementBoardDensity: number; // kg/m3
  vinylKgSqm: number;

  // bolts
  crossSupportsPerModule: number;
  boltsPerEnd: number; // each cross support has 2 ends
  connectionBoltsPerModule: number; // module-to-module + base/roof
  boltAssemblyKg: Record<BoltSize, number>; // bolt + nut + washers

  // misc
  bunkBedKg: number;
  doorKg: number;
  windowKg: number;
  doorWidth: number;
  doorHeight: number;
  windowWidth: number;
  windowHeight: number;
  roofSlopeFactor: number;
}

export const DEFAULT_SECTIONS: MemberSections = {
  baseFrame: { shape: "ISMC", a: 100, b: 50, thicknessMm: 6 }, // tabulated -> 9.56 kg/m
  columns: { shape: "RHS", a: 100, b: 50, thicknessMm: 3 },
  roofFrame: { shape: "SHS", a: 50, b: 50, thicknessMm: 3 },
  wallStud: { shape: "SHS", a: 50, b: 50, thicknessMm: 2 },
  purlin: { shape: "C", a: 75, b: 40, thicknessMm: 2 },
  bracing: { shape: "ANGLE", a: 50, b: 50, thicknessMm: 5 },
};

export const DEFAULT_NORMS: LabourColonyNorms = {
  personsPerWC: 20,
  personsPerUrinal: 25,
  personsPerBath: 15,
  personsPerWashBasin: 20,
  ventilationFloorFraction: 0.1,

  ledWatt: 18,
  fanWatt: 75,
  socketAllowanceWatt: 150,
  lightsPerRoom: 1,
  fansPerRoom: 2,
  socketsPerRoom: 1,
  diversityFactor: 0.8,

  steelDensityFactor: 0.00785,
  ismcTable: { "75x40": 7.14, "100x50": 9.56, "125x65": 13.1, "150x75": 16.8, "200x75": 22.1 },

  floorJoistSpacing: 1.0,
  wallStudSpacing: 0.6,
  purlinSpacing: 1.0,
  columnSpacingMax: 3.0,

  foamDensity: { PUF: 40, EPS: 18, GI: 0 },
  sheetDensity: 7850,

  cementBoardDensity: 1300,
  vinylKgSqm: 1.8,

  crossSupportsPerModule: 6,
  boltsPerEnd: 2,
  connectionBoltsPerModule: 12,
  boltAssemblyKg: { M10: 0.05, M12: 0.09, M16: 0.19 },

  bunkBedKg: 45,
  doorKg: 28,
  windowKg: 18,
  doorWidth: 0.9,
  doorHeight: 2.1,
  windowWidth: 1.2,
  windowHeight: 1.2,
  roofSlopeFactor: 1.05,
};

const SQM_TO_SQFT = 10.7639;
const round = (n: number, d = 2) => {
  const f = Math.pow(10, d);
  return Math.round((n + Number.EPSILON) * f) / f;
};
const ceil = (n: number) => Math.ceil(n - 1e-9);

/** Steel weight per running metre (kg/m) computed from the section profile. */
export function sectionWeightKgM(s: MsSection, norms: LabourColonyNorms): { kgM: number; label: string } {
  const t = s.thicknessMm;
  const a = s.a;
  const b = s.b || s.a;
  const k = norms.steelDensityFactor;
  if (s.fixedKgM != null) {
    return { kgM: s.fixedKgM, label: sectionLabel(s) };
  }
  let areaMm2 = 0;
  switch (s.shape) {
    case "SHS": // square hollow, side = a
      areaMm2 = 2 * t * (a + a) - 4 * t * t;
      break;
    case "RHS": // rectangular hollow a x b
      areaMm2 = 2 * t * (a + b) - 4 * t * t;
      break;
    case "ANGLE": // legs a, b
      areaMm2 = t * (a + b - t);
      break;
    case "PIPE": // round, outer dia = a
      areaMm2 = Math.PI * t * (a - t);
      break;
    case "C": // C/Z purlin: web a, flange b, ~15 mm lips
      areaMm2 = t * (a + 2 * b + 2 * 15);
      break;
    case "ISMC": {
      const tab = norms.ismcTable[`${a}x${b}`];
      return { kgM: tab ?? (2 * t * (a + b) - 4 * t * t) * k, label: sectionLabel(s) };
    }
  }
  return { kgM: areaMm2 * k, label: sectionLabel(s) };
}

function sectionLabel(s: MsSection): string {
  switch (s.shape) {
    case "SHS": return `SHS ${s.a}x${s.a}x${s.thicknessMm}`;
    case "RHS": return `RHS ${s.a}x${s.b}x${s.thicknessMm}`;
    case "ANGLE": return `Angle ${s.a}x${s.b}x${s.thicknessMm}`;
    case "PIPE": return `Pipe OD${s.a}x${s.thicknessMm}`;
    case "C": return `C-purlin ${s.a}x${s.b}x${s.thicknessMm}`;
    case "ISMC": return `ISMC ${s.a}x${s.b}`;
  }
}

/** PUF/EPS/GI sandwich panel weight, kg/m^2, by thickness + skin. */
export function panelKgSqm(type: PanelType, thicknessMm: number, skinMm: number, norms: LabourColonyNorms): number {
  const skins = 2 * skinMm * (norms.sheetDensity / 1000) / 1; // 2 faces, kg/m2 per mm = density/1000
  const foam = norms.foamDensity[type] * (thicknessMm / 1000);
  return skins + foam;
}

/* ============================ RESULT TYPES ============================ */

export interface AreaResult {
  roomAreaSqm: number; roomsTotal: number; roomsAreaSqm: number;
  toiletBlockSqm: number; diningKitchenSqm: number; officeSecuritySqm: number;
  corridorSqm: number; staircaseWalkwaySqm: number;
  builtUpPerFloorSqm: number; builtUpTotalSqm: number;
  footprintLengthM: number; footprintWidthM: number;
  roofPlanSqm: number; roofActualSqm: number;
  wallPanelSqm: number; partitionPanelSqm: number; builtUpTotalSqft: number;
}
export interface OccupancyResult {
  personsPerRoom: number; rooms: number; totalCapacity: number;
  bunkBedsPerRoom: number; bunkBedsTotal: number; ventilationAreaPerRoomSqm: number;
  wc: number; urinals: number; baths: number; washBasins: number;
}
export interface StructuralItem {
  item: string; section?: string; lengthM?: number; areaSqm?: number; qty?: number;
  unitWeightKgM?: number; weightKg: number;
}
export interface StructuralResult { modules: number; items: StructuralItem[]; totalSteelKg: number; }
export interface BoltResult {
  size: BoltSize; crossSupportBolts: number; connectionBolts: number;
  totalBolts: number; unitWeightKg: number; totalWeightKg: number;
}
export interface PanelResult {
  panelType: PanelType; thicknessMm: number; skinMm: number; kgSqm: number;
  wallSqm: number; roofSqm: number; partitionSqm: number; wastagePercent: number;
  totalWithWastageSqm: number; totalWithWastageSqft: number; weightKg: number;
}
export interface PartitionResult {
  material: "ppgi" | "panel"; areaSqm: number; ppgiThicknessMm: number; faces: number;
  ppgiAreaSqm: number; weightKg: number;
}
export interface FlooringResult {
  cementBoardSqm: number; cementBoardThicknessMm: number; cementBoardKg: number;
  vinylSqm: number; vinylKg: number; skirtingM: number;
}
export interface OpeningsResult {
  doors: number; windows: number; ventilators: number; doorSize: string; windowSize: string; grills: number;
}
export interface ElectricalResult {
  lights: number; fans: number; sockets: number; connectedLoadW: number; demandLoadW: number;
  demandLoadKW: number; recommendedMainMCBamp: number; distributionBoards: number; recommendedWire: string; earthPits: number;
}
export interface PlumbingResult {
  cpvcPipeM: number; pvcWastePipeM: number; floorTraps: number; angleCocks: number; taps: number;
  washBasins: number; wc: number; urinals: number; showers: number; healthFaucets: number; flushTanks: number; septicConnectionPoints: number;
}
export interface WeightResult {
  steelKg: number; boltsKg: number; panelKg: number; partitionKg: number; bunkBedKg: number;
  openingsKg: number; miscKg: number; totalKg: number; totalTonnes: number;
}
export interface BoqRow { sl: number; item: string; specification: string; unit: string; quantity: number; remarks: string; }

export interface LabourColonyResult {
  config: LabourColonyConfig;
  norms: LabourColonyNorms;
  sections: MemberSections;
  area: AreaResult;
  occupancy: OccupancyResult;
  structural: StructuralResult;
  bolts: BoltResult;
  panels: PanelResult;
  partition: PartitionResult;
  flooring: FlooringResult;
  openings: OpeningsResult;
  electrical: ElectricalResult;
  plumbing: PlumbingResult;
  weight: WeightResult;
  boq: BoqRow[];
  assumptions: string[];
}

/* ============================ ENGINE ============================ */

export function calculateLabourColony(input: LabourColonyConfig): LabourColonyResult {
  const norms: LabourColonyNorms = {
    ...DEFAULT_NORMS,
    ...(input.norms || {}),
    ismcTable: { ...DEFAULT_NORMS.ismcTable, ...(input.norms?.ismcTable || {}) },
    foamDensity: { ...DEFAULT_NORMS.foamDensity, ...(input.norms?.foamDensity || {}) },
    boltAssemblyKg: { ...DEFAULT_NORMS.boltAssemblyKg, ...(input.norms?.boltAssemblyKg || {}) },
  };
  const sections: MemberSections = { ...DEFAULT_SECTIONS, ...(input.sections || {}) };

  const skinMm = input.panelSkinThicknessMm ?? 0.5;
  const partitionMaterial = input.partitionMaterial ?? "ppgi";
  const ppgiThk = input.ppgiPartitionThicknessMm ?? 0.5;
  const ppgiFaces = input.ppgiPartitionFaces ?? 2;
  const boardThk = input.cementBoardThicknessMm ?? 18;
  const boltSize: BoltSize = input.boltSize ?? "M12";

  const ppr = Math.max(1, input.personsPerRoom);
  const rooms = input.totalRooms && input.totalRooms > 0
    ? input.totalRooms
    : input.capacity && input.capacity > 0 ? ceil(input.capacity / ppr) : 1;
  const totalCapacity = rooms * ppr;
  const { roomLength: L, roomWidth: W, roomHeight: H, floors, corridorWidth } = input;
  const fac = input.facilities;

  /* ---------- AREA ---------- */
  const roomArea = L * W;
  const roomsArea = roomArea * rooms;
  const roomsPerFloor = ceil(rooms / floors);
  const corridorPosition = input.corridorPosition ?? "center";
  // Footprint + corridor run depend on where the corridor sits:
  //   center        = double-loaded (two room rows, corridor between them)
  //   top/bottom    = single-loaded, corridor along the length on that edge
  //   left/right    = single-loaded, rotated, corridor along the depth on that edge
  //   both          = double-banked, verandas on BOTH upper and lower sides (peripheral)
  const doubleVeranda = corridorPosition === "both";
  let footprintLength: number, footprintWidth: number, corridorRun: number;
  if (corridorPosition === "center" || corridorPosition === "both") {
    const roomsPerRow = ceil(roomsPerFloor / 2);
    corridorRun = roomsPerRow * L;
    footprintLength = roomsPerRow * L;
    footprintWidth = 2 * W + (doubleVeranda ? 2 : 1) * corridorWidth;
  } else if (corridorPosition === "top" || corridorPosition === "bottom") {
    corridorRun = roomsPerFloor * L;
    footprintLength = roomsPerFloor * L;
    footprintWidth = W + corridorWidth;
  } else {
    corridorRun = roomsPerFloor * L;
    footprintWidth = roomsPerFloor * L;
    footprintLength = W + corridorWidth;
  }
  // peripheral layout has two verandas -> twice the walkway area
  const corridorTotal = corridorRun * corridorWidth * floors * (doubleVeranda ? 2 : 1);

  const wc = fac.toilet ? Math.max(1, ceil(totalCapacity / norms.personsPerWC)) : 0;
  const urinals = fac.toilet ? Math.max(1, ceil(totalCapacity / norms.personsPerUrinal)) : 0;
  const baths = fac.toilet ? Math.max(1, ceil(totalCapacity / norms.personsPerBath)) : 0;
  const washBasins = fac.toilet ? Math.max(1, ceil(totalCapacity / norms.personsPerWashBasin)) : 0;
  const toiletBlock = fac.toilet ? round((wc * 1.5 + baths * 1.5 + urinals * 0.7 + washBasins * 0.6) * 1.3) : 0;
  const diningKitchen = fac.diningKitchen ? round(totalCapacity * 0.75 + Math.max(15, totalCapacity * 0.15)) : 0;
  const officeSecurity = fac.officeSecurity ? 16 : 0;

  const builtUpTotal = roomsArea + toiletBlock + diningKitchen + officeSecurity + corridorTotal;
  const builtUpPerFloor = builtUpTotal / floors;
  const roofPlan = footprintLength * footprintWidth;
  const roofActual = roofPlan * norms.roofSlopeFactor;

  const walkwayWidth = Math.max(1.0, corridorWidth);
  const walkwayArea = floors > 1 ? footprintLength * walkwayWidth * (floors - 1) : 0;
  const staircaseArea = floors > 1 ? 1.2 * 4.0 * (floors - 1) : 0;
  const staircaseWalkway = round(walkwayArea + staircaseArea);

  const externalWallPerimeter = 2 * (footprintLength + footprintWidth);
  const externalWallArea = externalWallPerimeter * H * floors;
  const partitionLength = rooms * W;
  const partitionArea = partitionLength * H;

  const area: AreaResult = {
    roomAreaSqm: round(roomArea), roomsTotal: rooms, roomsAreaSqm: round(roomsArea),
    toiletBlockSqm: round(toiletBlock), diningKitchenSqm: round(diningKitchen), officeSecuritySqm: round(officeSecurity),
    corridorSqm: round(corridorTotal), staircaseWalkwaySqm: staircaseWalkway,
    builtUpPerFloorSqm: round(builtUpPerFloor), builtUpTotalSqm: round(builtUpTotal),
    footprintLengthM: round(footprintLength), footprintWidthM: round(footprintWidth),
    roofPlanSqm: round(roofPlan), roofActualSqm: round(roofActual),
    wallPanelSqm: round(externalWallArea), partitionPanelSqm: round(partitionArea),
    builtUpTotalSqft: round(builtUpTotal * SQM_TO_SQFT),
  };

  /* ---------- OCCUPANCY ---------- */
  const bunkBedsPerRoom = fac.bunkBeds ? ceil(ppr / 2) : 0;
  const occupancy: OccupancyResult = {
    personsPerRoom: ppr, rooms, totalCapacity,
    bunkBedsPerRoom, bunkBedsTotal: bunkBedsPerRoom * rooms,
    ventilationAreaPerRoomSqm: round(roomArea * norms.ventilationFloorFraction),
    wc, urinals, baths, washBasins,
  };

  /* ---------- STRUCTURAL (section + thickness driven) ---------- */
  const toiletModules = fac.toilet ? ceil(toiletBlock / roomArea) : 0;
  const diningModules = fac.diningKitchen ? ceil(diningKitchen / roomArea) : 0;
  const officeModules = fac.officeSecurity ? ceil(officeSecurity / roomArea) : 0;
  const modules = rooms + toiletModules + diningModules + officeModules;

  const perim = 2 * (L + W);
  const baseLenPerModule = perim + (ceil(L / norms.floorJoistSpacing) + 1) * W;
  const colCount = 4 + 2 * Math.max(0, ceil(L / norms.columnSpacingMax) - 1);
  const colLenPerModule = colCount * H;
  const roofLenPerModule = perim;
  const purlinLenPerModule = (ceil(W / norms.purlinSpacing) + 1) * L;
  const studCount = ceil(perim / norms.wallStudSpacing);
  const wallLenPerModule = studCount * H + 3 * perim;
  const bracingLenPerModule = norms.crossSupportsPerModule * Math.hypot(W, H) * 0.6; // diagonal braces

  const sw = (s: MsSection) => sectionWeightKgM(s, norms);
  const baseW = sw(sections.baseFrame), colW = sw(sections.columns), roofW = sw(sections.roofFrame),
    studW = sw(sections.wallStud), purW = sw(sections.purlin), braceW = sw(sections.bracing);

  const baseLen = baseLenPerModule * modules;
  const colLen = colLenPerModule * modules;
  const roofLen = roofLenPerModule * modules;
  const purlinLen = purlinLenPerModule * modules;
  const wallLen = wallLenPerModule * modules;
  const bracingLen = bracingLenPerModule * modules;

  const flights = floors > 1 ? floors - 1 : 0;
  const stairKg = flights * 350;
  const plateKg = walkwayArea * 42; // 5 mm chequered plate
  const railingLen = floors > 1 ? footprintLength + 4 * (floors - 1) * 3 : 0;
  const railingKg = railingLen * 3.5;

  const structItems: StructuralItem[] = [
    { item: "MS base frame", section: baseW.label, lengthM: round(baseLen), unitWeightKgM: round(baseW.kgM, 3), weightKg: round(baseLen * baseW.kgM) },
    { item: "MS vertical columns", section: colW.label, lengthM: round(colLen), unitWeightKgM: round(colW.kgM, 3), weightKg: round(colLen * colW.kgM) },
    { item: "MS roof frame", section: roofW.label, lengthM: round(roofLen), unitWeightKgM: round(roofW.kgM, 3), weightKg: round(roofLen * roofW.kgM) },
    { item: "Purlins", section: purW.label, lengthM: round(purlinLen), unitWeightKgM: round(purW.kgM, 3), weightKg: round(purlinLen * purW.kgM) },
    { item: "MS wall frame / studs", section: studW.label, lengthM: round(wallLen), unitWeightKgM: round(studW.kgM, 3), weightKg: round(wallLen * studW.kgM) },
    { item: "Cross support / bracing", section: braceW.label, lengthM: round(bracingLen), unitWeightKgM: round(braceW.kgM, 3), weightKg: round(bracingLen * braceW.kgM) },
  ];
  if (flights > 0) {
    structItems.push({ item: "Staircase (MS, fabricated)", qty: flights, weightKg: round(stairKg) });
    structItems.push({ item: "Walkway chequered plate (5mm)", areaSqm: round(walkwayArea), weightKg: round(plateKg) });
    structItems.push({ item: "Handrail / railing", section: "Pipe OD32x2", lengthM: round(railingLen), unitWeightKgM: 3.5, weightKg: round(railingKg) });
  }
  const totalSteelKg = round(structItems.reduce((s, i) => s + i.weightKg, 0));
  const structural: StructuralResult = { modules, items: structItems, totalSteelKg };

  /* ---------- BOLTS (cross support + connections) ---------- */
  const crossSupportBolts = modules * norms.crossSupportsPerModule * norms.boltsPerEnd * 2;
  const connectionBolts = modules * norms.connectionBoltsPerModule;
  const totalBolts = crossSupportBolts + connectionBolts;
  const boltUnit = norms.boltAssemblyKg[boltSize];
  const bolts: BoltResult = {
    size: boltSize, crossSupportBolts, connectionBolts, totalBolts,
    unitWeightKg: boltUnit, totalWeightKg: round(totalBolts * boltUnit),
  };

  /* ---------- PANELS (wall + roof; partition handled separately) ---------- */
  const pKgSqm = panelKgSqm(input.panelType, input.panelThicknessMm, skinMm, norms);
  const partitionInPanel = partitionMaterial === "panel";
  const wallSqm = externalWallArea;
  const roofSqm = roofActual;
  const panelPartitionSqm = partitionInPanel ? partitionArea : 0;
  const panelBase = wallSqm + roofSqm + panelPartitionSqm;
  const panelWithWaste = panelBase * (1 + input.wastagePercent / 100);
  const panels: PanelResult = {
    panelType: input.panelType, thicknessMm: input.panelThicknessMm, skinMm, kgSqm: round(pKgSqm, 2),
    wallSqm: round(wallSqm), roofSqm: round(roofSqm), partitionSqm: round(panelPartitionSqm),
    wastagePercent: input.wastagePercent,
    totalWithWastageSqm: round(panelWithWaste), totalWithWastageSqft: round(panelWithWaste * SQM_TO_SQFT),
    weightKg: round(panelBase * pKgSqm),
  };

  /* ---------- PARTITION (PPGI sheet) ---------- */
  const ppgiKgSqm = ppgiThk * (norms.sheetDensity / 1000);
  const ppgiAreaSqm = partitionInPanel ? 0 : partitionArea * ppgiFaces;
  const partition: PartitionResult = {
    material: partitionMaterial, areaSqm: round(partitionArea),
    ppgiThicknessMm: ppgiThk, faces: ppgiFaces,
    ppgiAreaSqm: round(ppgiAreaSqm), weightKg: round(ppgiAreaSqm * ppgiKgSqm),
  };

  /* ---------- FLOORING ---------- */
  const floorArea = builtUpTotal * 1.05;
  const cementBoardKgSqm = boardThk * (norms.cementBoardDensity / 1000);
  const skirtingPerimeter = modules * perim + corridorTotal / Math.max(corridorWidth, 0.1);
  const flooring: FlooringResult = {
    cementBoardSqm: round(floorArea), cementBoardThicknessMm: boardThk, cementBoardKg: round(floorArea * cementBoardKgSqm),
    vinylSqm: round(floorArea), vinylKg: round(floorArea * norms.vinylKgSqm), skirtingM: round(skirtingPerimeter),
  };

  /* ---------- OPENINGS ---------- */
  const doors = modules;
  const windows = rooms + toiletModules + diningModules + officeModules;
  const ventilators = fac.toilet ? wc + baths : 0;
  const openings: OpeningsResult = {
    doors, windows, ventilators,
    doorSize: `${norms.doorWidth} m x ${norms.doorHeight} m`,
    windowSize: `${norms.windowWidth} m x ${norms.windowHeight} m`,
    grills: windows,
  };

  /* ---------- ELECTRICAL ---------- */
  const utilityRooms = toiletModules + diningModules + officeModules;
  const lights = rooms * norms.lightsPerRoom + utilityRooms + Math.max(1, ceil(footprintLength / 6)) * floors;
  const fans = rooms * norms.fansPerRoom + diningModules * 2 + officeModules;
  const sockets = rooms * norms.socketsPerRoom + diningModules * 4 + officeModules * 2;
  const connectedLoadW = lights * norms.ledWatt + fans * norms.fanWatt + sockets * norms.socketAllowanceWatt;
  const demandLoadW = connectedLoadW * norms.diversityFactor;
  const demandLoadKW = demandLoadW / 1000;
  const recommendedMainMCBamp = demandLoadKW > 7 ? 63 : demandLoadKW > 4 ? 40 : 32;
  const electrical: ElectricalResult = {
    lights, fans, sockets, connectedLoadW: round(connectedLoadW), demandLoadW: round(demandLoadW),
    demandLoadKW: round(demandLoadKW, 2), recommendedMainMCBamp,
    distributionBoards: Math.max(1, ceil(modules / 8)),
    recommendedWire: demandLoadKW > 7 ? "3-phase; 4-6 sq.mm submains, 1.5-2.5 sq.mm finals" : "1.5 sq.mm (lights), 2.5 sq.mm (sockets), 4 sq.mm submains",
    earthPits: demandLoadKW > 7 ? 2 : 1,
  };

  /* ---------- PLUMBING ---------- */
  const showers = baths, healthFaucets = wc, flushTanks = wc;
  const supplyFixtures = wc + urinals + baths + washBasins + (fac.diningKitchen ? 2 : 0);
  const wasteFixtures = wc + urinals + baths + washBasins + (fac.diningKitchen ? 1 : 0);
  const plumbing: PlumbingResult = {
    cpvcPipeM: round(supplyFixtures * 4), pvcWastePipeM: round(wasteFixtures * 3),
    floorTraps: baths + washBasins + (fac.diningKitchen ? 1 : 0),
    angleCocks: wc + washBasins + (fac.diningKitchen ? 1 : 0),
    taps: washBasins + baths + (fac.diningKitchen ? 2 : 0),
    washBasins, wc, urinals, showers, healthFaucets, flushTanks,
    septicConnectionPoints: fac.toilet ? Math.max(1, ceil(modules / 12)) : 0,
  };

  /* ---------- WEIGHT ---------- */
  const bunkKg = occupancy.bunkBedsTotal * norms.bunkBedKg;
  const openingsKg = doors * norms.doorKg + windows * norms.windowKg;
  const miscKg = flooring.cementBoardKg + flooring.vinylKg;
  const totalKg = totalSteelKg + bolts.totalWeightKg + panels.weightKg + partition.weightKg + bunkKg + openingsKg + miscKg;
  const weight: WeightResult = {
    steelKg: totalSteelKg, boltsKg: bolts.totalWeightKg, panelKg: panels.weightKg, partitionKg: partition.weightKg,
    bunkBedKg: round(bunkKg), openingsKg: round(openingsKg), miscKg: round(miscKg),
    totalKg: round(totalKg), totalTonnes: round(totalKg / 1000, 2),
  };

  /* ---------- BOQ ---------- */
  const boq = buildBoq({ area, occupancy, structural, bolts, panels, partition, flooring, openings, electrical, plumbing, weight, input, norms });

  const assumptions = [
    "Quotation/production-grade estimate; not a stamped structural design. Validate with a qualified engineer before fabrication.",
    `Layout: identical ${L} m x ${W} m modules in two rows along a ${corridorWidth} m corridor; ${floors === 1 ? "Ground floor" : floors === 2 ? "G+1" : "G+2"}.`,
    `MS weights computed from section profile + wall thickness (kg/m = steel area mm^2 x ${norms.steelDensityFactor}); ISMC/C from standard tables. Sharp-corner area (slightly conservative).`,
    `Panel: ${input.panelThicknessMm} mm ${input.panelType} @ ${round(pKgSqm, 2)} kg/sqm (2 x ${skinMm} mm skins + foam); ${input.wastagePercent}% wastage.`,
    `Internal partition: ${partitionMaterial === "ppgi" ? `${ppgiThk} mm PPGI sheet, ${ppgiFaces} face(s)` : "panel (same as wall)"}.`,
    `Flooring: ${boardThk} mm cement board (${norms.cementBoardDensity} kg/m3) + vinyl.`,
    `Bolts: ${boltSize}; ${norms.crossSupportsPerModule} cross supports/module x ${norms.boltsPerEnd} bolts/end x 2 + ${norms.connectionBoltsPerModule} connection bolts/module.`,
    `Sanitation norms: 1 WC/${norms.personsPerWC}, 1 urinal/${norms.personsPerUrinal}, 1 bath/${norms.personsPerBath}, 1 basin/${norms.personsPerWashBasin} persons.`,
    "Excludes foundation/plinth, earthwork, external development, water tank, transport & taxes unless quoted separately.",
  ];

  return { config: input, norms, sections, area, occupancy, structural, bolts, panels, partition, flooring, openings, electrical, plumbing, weight, boq, assumptions };
}

/* ============================ BOQ BUILDER ============================ */

function buildBoq(d: {
  area: AreaResult; occupancy: OccupancyResult; structural: StructuralResult; bolts: BoltResult;
  panels: PanelResult; partition: PartitionResult; flooring: FlooringResult; openings: OpeningsResult;
  electrical: ElectricalResult; plumbing: PlumbingResult; weight: WeightResult;
  input: LabourColonyConfig; norms: LabourColonyNorms;
}): BoqRow[] {
  const { area, occupancy, structural, bolts, panels, partition, flooring, openings, electrical, plumbing, weight, input } = d;
  const fac = input.facilities;
  const rows: Array<Omit<BoqRow, "sl">> = [];

  structural.items.forEach((it) =>
    rows.push({
      item: it.item,
      specification: it.section || (it.areaSqm ? "5 mm plate" : "fabricated"),
      unit: "kg", quantity: it.weightKg,
      remarks: it.lengthM ? `${it.lengthM} m @ ${it.unitWeightKgM} kg/m` : it.qty ? `${it.qty} no` : it.areaSqm ? `${it.areaSqm} sqm` : "",
    })
  );

  rows.push({ item: "Nut-bolts (cross support + connections)", specification: bolts.size, unit: "no", quantity: bolts.totalBolts, remarks: `${bolts.totalWeightKg} kg; ${bolts.crossSupportBolts} cross + ${bolts.connectionBolts} conn` });

  rows.push({
    item: `${panels.panelType} sandwich panel`, specification: `${panels.thicknessMm} mm (${panels.kgSqm} kg/sqm)`,
    unit: "sqm", quantity: panels.totalWithWastageSqm,
    remarks: `wall ${panels.wallSqm} + roof ${panels.roofSqm}${panels.partitionSqm ? ` + part. ${panels.partitionSqm}` : ""} sqm, +${panels.wastagePercent}%`,
  });
  if (partition.material === "ppgi" && partition.ppgiAreaSqm > 0)
    rows.push({ item: "Internal partition PPGI sheet", specification: `${partition.ppgiThicknessMm} mm`, unit: "sqm", quantity: partition.ppgiAreaSqm, remarks: `${partition.areaSqm} sqm x ${partition.faces} face(s); ${partition.weightKg} kg` });

  rows.push({ item: "Cement / bison board flooring", specification: `${flooring.cementBoardThicknessMm} mm`, unit: "sqm", quantity: flooring.cementBoardSqm, remarks: `${flooring.cementBoardKg} kg` });
  rows.push({ item: "Vinyl flooring", specification: "1 mm anti-skid", unit: "sqm", quantity: flooring.vinylSqm, remarks: "finish floor" });
  rows.push({ item: "PVC skirting", specification: "100 mm", unit: "m", quantity: flooring.skirtingM, remarks: "" });

  rows.push({ item: "Doors", specification: openings.doorSize, unit: "no", quantity: openings.doors, remarks: "MS / lockable" });
  rows.push({ item: "Windows", specification: openings.windowSize, unit: "no", quantity: openings.windows, remarks: "UPVC/Al sliding + grill" });
  if (openings.ventilators) rows.push({ item: "Ventilators", specification: "0.6 x 0.45 m", unit: "no", quantity: openings.ventilators, remarks: "toilet/bath" });

  if (fac.bunkBeds) rows.push({ item: "Steel double-deck bunk beds", specification: "MS, 2-tier", unit: "no", quantity: occupancy.bunkBedsTotal, remarks: `${occupancy.bunkBedsPerRoom}/room` });

  rows.push({ item: "LED light points", specification: `${d.norms.ledWatt} W`, unit: "no", quantity: electrical.lights, remarks: "" });
  rows.push({ item: "Fan points", specification: "ceiling/wall", unit: "no", quantity: electrical.fans, remarks: "" });
  rows.push({ item: "Socket points", specification: "6/16 A", unit: "no", quantity: electrical.sockets, remarks: "" });
  rows.push({ item: "Distribution board with MCBs", specification: `main ${electrical.recommendedMainMCBamp} A`, unit: "no", quantity: electrical.distributionBoards, remarks: `~${electrical.demandLoadKW} kW demand` });
  rows.push({ item: "Earthing pit", specification: "GI/Cu", unit: "no", quantity: electrical.earthPits, remarks: "" });

  if (fac.toilet) {
    rows.push({ item: "EWC / Indian WC", specification: "ceramic + flush tank", unit: "no", quantity: plumbing.wc, remarks: "" });
    rows.push({ item: "Urinal", specification: "ceramic", unit: "no", quantity: plumbing.urinals, remarks: "" });
    rows.push({ item: "Wash basin", specification: "ceramic + tap", unit: "no", quantity: plumbing.washBasins, remarks: "" });
    rows.push({ item: "Shower set", specification: "CP", unit: "no", quantity: plumbing.showers, remarks: "" });
    rows.push({ item: "Health faucet", specification: "CP", unit: "no", quantity: plumbing.healthFaucets, remarks: "" });
    rows.push({ item: "Floor trap", specification: "PVC", unit: "no", quantity: plumbing.floorTraps, remarks: "" });
    rows.push({ item: "Angle cock", specification: "CP", unit: "no", quantity: plumbing.angleCocks, remarks: "" });
    rows.push({ item: "CPVC water supply pipe", specification: "incl. fittings", unit: "m", quantity: plumbing.cpvcPipeM, remarks: "" });
    rows.push({ item: "PVC waste/soil pipe", specification: "75/110 mm", unit: "m", quantity: plumbing.pvcWastePipeM, remarks: "" });
    rows.push({ item: "Septic / drainage connection", specification: "to site point", unit: "no", quantity: plumbing.septicConnectionPoints, remarks: "" });
  }

  rows.push({ item: "Approx fabricated weight", specification: "structure + bolts + panels + fittings", unit: "tonne", quantity: weight.totalTonnes, remarks: `${weight.totalKg} kg; built-up ${area.builtUpTotalSqm} sqm (${area.builtUpTotalSqft} sqft)` });

  return rows.filter((r) => (r.quantity ?? 0) > 0).map((r, i) => ({ sl: i + 1, ...r }));
}
