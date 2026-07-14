/**
 * Table module — the data model (spec §30).
 *
 * This is the ONE structured configuration that is saved with the cabin design (spec §26),
 * priced (§25), taken off into the BOQ (§22), drawn in the 2D plan (§12) and the elevation (§13),
 * collision-checked (§14) and exported to PDF (§33). Nothing here is a React concern and nothing
 * here imports React, Supabase or the BOQ engine — it is a plain JSON-serialisable contract, so a
 * saved design is just `JSON.stringify(config)` and reloads byte-for-byte (spec §26: "Do not save
 * only the visual drawing").
 *
 * UNITS: every length is MILLIMETRES (spec §4). Angles are DEGREES. Money is RUPEES.
 *
 * COORDINATES: `position.xMm` / `position.yMm` are the table's CENTRE, measured from the cabin's
 * inner top-left corner — the same origin the 2D plan uses for its `(ox, oy)` (see ModulePlan:976).
 *   +x runs along the cabin LENGTH (left → right)
 *   +y runs along the cabin WIDTH  (rear/top wall → front/door wall)
 * Storing the CENTRE (rather than a wall offset) is what makes rotation, flipping and free
 * drag-and-drop a single affine transform instead of four wall-specific special cases. The
 * "distance from left/right/front/rear wall" fields the spec asks for (§10) are DERIVED from the
 * centre + the rotated bounding box, never stored — so they can never disagree with the drawing.
 */

/* ==========================================================================
 * 1. SHAPES + TYPES  (spec §2, §3)
 * ========================================================================== */

/** Every shape the drawing can actually render (spec §3). */
export type TableShape =
  | "rectangle"
  | "square"
  | "circle"
  | "oval"
  | "l-shape"
  | "u-shape"
  | "t-shape"
  | "curved"        // curved-front (D-ish desk front)
  | "d-shape"
  | "semi-circle"
  | "trapezoid"
  | "corner"        // 90° corner / angled wedge worktop
  | "custom";       // custom polygon — points supplied in `customPoints`

/** Rotation presets (spec §10). Any angle 0–359 is also accepted. */
export const ROTATION_PRESETS = [0, 45, 90, 135, 180, 225, 270, 315] as const;

/* ==========================================================================
 * 2. SUB-STRUCTURES
 * ========================================================================== */

/** Core dimensions (spec §4). Only `lengthMm`/`depthMm`/`heightMm` are universal; the rest are
 *  optional because a round pedestal table has no leg width and a folding table has no pedestal. */
export interface TableDimensions {
  lengthMm: number;
  depthMm: number;
  heightMm: number;
  topThicknessMm: number;
  edgeBandThicknessMm: number;
  legHeightMm?: number;
  legWidthMm?: number;
  /** Round / oval / semi-circle / D-shape / curved. For "circle", diameter = 2 × radius. */
  radiusMm?: number;
  /** Oval / D / trapezoid secondary radius or the short parallel side. */
  secondaryMm?: number;
  modestyPanelHeightMm?: number;
  cableTrayLengthMm?: number;
  cableTrayWidthMm?: number;
  sideStorageLengthMm?: number;
  sideStorageWidthMm?: number;
  sideStorageHeightMm?: number;
  /** Custom polygon points (mm, local, centre-relative) — shape === "custom". */
  customPoints?: { x: number; y: number }[];
}

/** L / corner return, and the T-shape stem (spec §3). */
export interface TableReturn {
  side: "left" | "right";
  lengthMm: number;
  depthMm: number;
}

/** U-shape: a front run with a left and a right return (spec §3). */
export interface TableUShape {
  leftLengthMm: number;
  leftDepthMm: number;
  rightLengthMm: number;
  rightDepthMm: number;
}

/** Where the table sits and how it is oriented (spec §10). */
export interface TablePosition {
  /** Centre of the table's LOCAL bounding box, in mm from the cabin inner top-left. */
  xMm: number;
  yMm: number;
  /** Degrees clockwise about the centre. */
  rotationDeg: number;
  /** Mirror about the local Y axis (left↔right) — flips an L-return without re-typing it. */
  flipH: boolean;
  /** Mirror about the local X axis (front↔back). */
  flipV: boolean;
  /** Position locked: drag and auto-arrange must not move it (spec §11). */
  locked: boolean;
  /** Temporarily hidden from the drawing. Still priced unless `excluded`. (spec §11) */
  hidden: boolean;
  /** Which room (0-based) the table belongs to in a multi-room cabin. */
  roomIndex: number;
}

/** Tabletop material (spec §6). Ids are Material Master keys — rates NEVER live here. */
export interface TableMaterial {
  /** Material Master key for the top, e.g. "board-prelam-18". */
  materialKey: string;
  thicknessMm: number;
  /** Material Master key for the edge band, e.g. "edgeband-pvc-2". */
  edgeBandKey?: string;
  laminateKey?: string;
  finish?: string;
  topColour?: string;
  edgeBandColour?: string;
  brand?: string;
  /** Per-instance wastage override (%). Absent ⇒ the Material Master's own wastage applies. */
  wastagePercent?: number;
}

/** Base / support (spec §7). */
export interface TableSupport {
  /** Support type id from the catalogue, e.g. "ms-legs-4". */
  supportTypeId: string;
  /** Material Master key of the pipe/profile, e.g. "shs-50x50x2". */
  profileKey?: string;
  numberOfLegs: number;
  frameFinish?: string;
  powderCoatColour?: string;
  levellers: boolean;
  castors: boolean;
  floorFixed: boolean;
  /** Panel-type / wooden side bases are boards, not steel — the take-off branches on this. */
  panelMaterialKey?: string;
}

/** One accessory on one table (spec §8). */
export interface TableAccessory {
  /** Instance id (stable across edits). */
  id: string;
  /** Accessory catalogue id, e.g. "mobile-pedestal-3drawer". */
  accessoryId: string;
  quantity: number;
  /** Overrides the catalogue default when the customer resizes it. */
  lengthMm?: number;
  depthMm?: number;
  heightMm?: number;
  /** Material Master key. Absent ⇒ the catalogue default. */
  materialKey?: string;
  /** Where it sits relative to the table (drives the 2D/elevation drawing). */
  position?: "left" | "right" | "front" | "rear" | "under" | "on-top";
  /** Draw it in the plan/elevation (spec §8). */
  showInDrawing: boolean;
}

/** Seating (spec §9). */
export interface TableSeating {
  capacity: number;
  includeChairs: boolean;
  chairTypeId?: string;
  /** Chair footprint, used for spacing + collision. */
  chairWidthMm: number;
  chairDepthMm: number;
  /** Which sides chairs are placed on. Empty ⇒ auto (derived from the shape). */
  sides?: ("front" | "rear" | "left" | "right")[];
  /** Reception/workstation: the side the staff sit on. */
  staffSide?: "front" | "rear" | "left" | "right";
}

/** Electrical points carried by the table (spec §21). */
export interface TableElectrical {
  socket5A: number;
  socket6A: number;
  socket16A: number;
  usbPoints: number;
  dataPoints: number;
  lanPoints: number;
  hdmiPoints: number;
  powerManagerQty: number;
  popupBoxQty: number;
  floorBoxQty: number;
  /** Cable tray runs with the table; the drop to the wall is computed, not stored. */
  cableTray: boolean;
}

/** Workstation cluster controls (spec §17). */
export interface TableWorkstation {
  users: number;
  arrangement: "linear" | "back-to-back" | "cluster" | "l-shaped";
  deskLengthMm: number;
  deskDepthMm: number;
  partitionHeightMm: number;
  partitionThicknessMm: number;
  partitionMaterial: "fabric" | "glass" | "acrylic" | "none";
  sharedCableTray: boolean;
  sharedPowerManager: boolean;
  pedestalQty: number;
  cpuHolderQty: number;
  chairQty: number;
  aisleWidthMm: number;
  facing: "north" | "south" | "east" | "west";
}

/** Conference controls (spec §18). */
export interface TableConference {
  seats: number;
  chairSpacingMm: number;
  headChairs: 0 | 1 | 2;
  displaySide?: "front" | "rear" | "left" | "right";
  powerBoxes: number;
  cableOpenings: number;
  centreGapMm?: number;
  sections: number;
  microphonePoints: number;
}

/** Reception controls (spec §19). */
export interface TableReception {
  counterStyle: "straight" | "l-shape" | "u-shape" | "curved";
  visitorCounterHeightMm: number;
  staffCounterHeightMm: number;
  /** Which side the visitor stands on — the drawing labels both sides. */
  visitorSide: "front" | "rear" | "left" | "right";
  accessibleCounter: boolean;
  underCounterStorage: boolean;
  cpuSpace: boolean;
  drawerUnits: number;
  brandingPanel: boolean;
  ledStrip: boolean;
}

/** Wall-mounted / folding controls (spec §20). */
export interface TableWallMount {
  wall: "front" | "rear" | "left" | "right";
  /** mm from that wall's START corner to the table's NEAR edge. */
  offsetMm: number;
  foldDirection: "up" | "down" | "none";
  bracketTypeId: string;
  bracketQty: number;
  maxLoadKg: number;
  wallReinforcement: boolean;
}

/** Cost breakdown for one table (spec §23). All ₹. Derived — recomputed, never trusted from disk. */
export interface TablePricing {
  materialAmount: number;
  labourAmount: number;
  accessoryAmount: number;
  hardwareAmount: number;
  wastageAmount: number;
  marginAmount: number;
  taxAmount: number;
  totalAmount: number;
  /** Total fabricated weight (kg) — the steel + board weight from the Material Master. */
  weightKg: number;
}

/* ==========================================================================
 * 3. THE TABLE
 * ========================================================================== */

export interface CabinTable {
  /** Stable unique id, generated once. Never regenerated on edit (it keys React nodes, SVG
   *  groups, BOQ take-off item ids and BOQ overrides). */
  id: string;
  /** Display name, e.g. "Executive Table 1". Editable. */
  name: string;
  /** Catalogue key — one of TABLE_TYPES, or an admin-added type from `cabin_table_types`. */
  tableTypeId: string;
  shape: TableShape;
  /** Identical copies of this exact table. Each copy is priced; only ONE is drawn per position,
   *  so qty > 1 is for "4 identical staff tables in a row" that the user does not want to place
   *  individually. Placed copies should instead be Duplicated (spec §11). */
  quantity: number;
  /** Standard preset id this table came from, or "custom" once any dimension is edited (spec §5). */
  presetId: string;

  dimensions: TableDimensions;
  returnSection?: TableReturn;
  uShape?: TableUShape;
  position: TablePosition;
  material: TableMaterial;
  support: TableSupport;
  seating: TableSeating;
  accessories: TableAccessory[];
  electrical: TableElectrical;

  /* type-specific blocks — present only for the types that use them */
  workstation?: TableWorkstation;
  conference?: TableConference;
  reception?: TableReception;
  wallMount?: TableWallMount;

  /** Last computed cost. Recomputed live; persisted so a reopened quote shows the quoted price
   *  even before the Material Master finishes loading. */
  pricing?: TablePricing;
  /** Customer-visible note appended to the quotation description. */
  notes?: string;
}

/* ==========================================================================
 * 4. CLEARANCE RULES  (spec §15) — admin-editable
 * ========================================================================== */

export interface ClearanceRules {
  /** Chair pull-out behind a seated edge. */
  chairMovementMm: number;
  /** Normal walking passage. */
  walkingPassageMm: number;
  /** Main circulation passage. */
  mainPassageMm: number;
  /** Table to wall when NO chair sits on that edge. */
  tableFromWallMm: number;
  /** Table to wall when a chair DOES sit on that edge. */
  seatedTableFromWallMm: number;
  /** Space to pull a drawer / open a cabinet. */
  drawerOpeningMm: number;
  /** Extra margin added around a door's swing arc. */
  doorSwingMarginMm: number;
  /** Aisle between workstation rows. */
  workstationAisleMm: number;
}

export const DEFAULT_CLEARANCES: ClearanceRules = {
  chairMovementMm: 900,
  walkingPassageMm: 750,
  mainPassageMm: 1000,
  tableFromWallMm: 50,
  seatedTableFromWallMm: 900,
  drawerOpeningMm: 600,
  doorSwingMarginMm: 100,
  workstationAisleMm: 900,
};

/* ==========================================================================
 * 5. VALIDATION + COLLISION RESULT TYPES  (spec §14, §32)
 * ========================================================================== */

export type TableIssueSeverity = "error" | "warning";

export type TableIssueCode =
  | "outside_cabin"
  | "overlap_table"
  | "overlap_fixture"
  | "overlap_partition"
  | "overlap_door_swing"
  | "overlap_door"
  | "overlap_window"
  | "clearance_wall"
  | "clearance_passage"
  | "clearance_chair"
  | "clearance_drawer"
  | "invalid_dimension"
  | "missing_material"
  | "invalid_quantity"
  | "pricing_failed"
  | "no_wall"
  /** A wall-mounted table heavy enough to need the wall reinforced behind it (spec §20). Distinct
   *  from `no_wall` (which means it has no valid wall at all) because the fix is different: this one
   *  is buildable, it just needs a backing plate. */
  | "wall_reinforcement"
  | "no_cable_route"
  | "does_not_fit";

/** One collision / clearance / validation problem. `refs` are the ids of everything involved, so
 *  the drawing can highlight EVERY conflicting object in red (spec §14), not just the table. */
export interface TableIssue {
  code: TableIssueCode;
  severity: TableIssueSeverity;
  /** Human message, e.g. "Executive Table 1 overlaps the inward-opening door clearance by 320 mm."
   *  (spec §14 — the message must name the objects and the overlap.) */
  message: string;
  tableId: string;
  /** Ids of the other objects involved (other table ids, "door:0", "fixture:wash-basin:1", …). */
  refs: string[];
  /** Overlap depth (mm) where meaningful — drives the "by 320 mm" in the message. */
  overlapMm?: number;
  hint?: string;
}

/** Admin override that lets a design with collisions be submitted anyway (spec §14). */
export interface TableOverride {
  allowCollisions: boolean;
  reason?: string;
}
