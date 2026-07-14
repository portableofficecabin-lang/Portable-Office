/**
 * Table module — the CATALOGUE (spec §2, §3, §5, §7, §8, §9).
 *
 * This is the BUILT-IN catalogue. It is not the last word: the admin panel
 * (`/admin/table-config`) stores overrides + brand-new table types in the Supabase table
 * `cabin_table_types`, and `tableCatalog.ts` merges them over these at runtime — which is how
 * spec §24's "the admin must be able to add new table types without changing the application
 * code" is satisfied. This file is the offline fallback and the seed for that DB table, exactly
 * as SEED_MATERIALS is for `boq_materials`.
 *
 * Pure data. No React, no Supabase, no rates (rates live in the Material Master, spec §23).
 */

import type { TableShape } from "./tableSchema";

/* ==========================================================================
 * 1. SHAPES  (spec §3)
 * ========================================================================== */

export const TABLE_SHAPES: { id: TableShape; label: string; note: string }[] = [
  { id: "rectangle",   label: "Rectangle",     note: "Standard desk / conference top" },
  { id: "square",      label: "Square",        note: "Equal sides — discussion / cluster" },
  { id: "circle",      label: "Circle",        note: "Round top — diameter driven" },
  { id: "oval",        label: "Oval",          note: "Elliptical boardroom top" },
  { id: "l-shape",     label: "L shape",       note: "Main run + side return" },
  { id: "u-shape",     label: "U shape",       note: "Front run + left & right returns" },
  { id: "t-shape",     label: "T shape",       note: "Head run + centre stem" },
  { id: "curved",      label: "Curved front",  note: "Straight back, bowed front" },
  { id: "d-shape",     label: "D shape",       note: "Flat back, semicircular front" },
  { id: "semi-circle", label: "Semi-circle",   note: "Half round — reception / wall" },
  { id: "trapezoid",   label: "Trapezoid",     note: "Modular training / classroom" },
  { id: "corner",      label: "Corner shape",  note: "90° angled wedge worktop" },
  { id: "custom",      label: "Custom polygon",note: "User-defined outline" },
];

export const isRoundish = (s: TableShape): boolean =>
  s === "circle" || s === "oval" || s === "d-shape" || s === "semi-circle" || s === "curved";

/** Shapes whose geometry is driven by extra arms the customer controls separately (spec §3). */
export const hasReturn = (s: TableShape): boolean => s === "l-shape" || s === "corner";
export const hasUShape = (s: TableShape): boolean => s === "u-shape";
export const hasStem = (s: TableShape): boolean => s === "t-shape";

/* ==========================================================================
 * 2. STANDARD SIZE PRESETS  (spec §5)
 * ========================================================================== */

export interface TablePreset {
  id: string;
  label: string;
  lengthMm: number;
  depthMm: number;
  heightMm: number;
  /** Round tables quote a diameter, not an L × D. */
  diameterMm?: number;
  /** Seats this preset is normally supplied with. */
  seats?: number;
}

/** "custom" is the sentinel the item switches to the moment any dimension is edited (spec §5). */
export const CUSTOM_PRESET_ID = "custom";

/* ==========================================================================
 * 3. TABLE TYPES  (spec §2 — all 24 + Custom)
 * ========================================================================== */

/** How the seating capacity is worked out for this type (spec §9). */
export type SeatingModel =
  | "single"        // 1 user (staff / executive / computer desk)
  | "perimeter"     // seats fit around the perimeter (conference / meeting / dining / discussion)
  | "workstation"   // seats = number of users
  | "counter"       // reception: staff side + visitor side
  | "none";         // wall-mounted / folding — no fixed seating

export interface TableTypeDef {
  id: string;
  label: string;
  /** Shapes this type is allowed to take. The FIRST is the default. */
  shapes: TableShape[];
  defaultShape: TableShape;
  presets: TablePreset[];
  /** Default support type id (see SUPPORT_TYPES). */
  defaultSupportId: string;
  /** Default tabletop Material Master key. */
  defaultMaterialKey: string;
  seatingModel: SeatingModel;
  /** Accessory ids switched on by default for this type. */
  defaultAccessories: string[];
  /** Blocks the editor should reveal for this type. */
  panels?: ("workstation" | "conference" | "reception" | "wallMount")[];
  /** Short label used on the drawing (spec §12 — the table label). */
  short: string;
  /** Drawing symbol hint — the 2D renderer picks a representation from this (spec §12, §24). */
  symbol?: "desk" | "conference" | "round" | "workstation" | "reception" | "wall" | "counter";
  group: "Desks" | "Meeting" | "Workstations" | "Reception & Pantry" | "Special";
  isActive: boolean;
}

const P = (id: string, label: string, l: number, d: number, h: number, seats?: number): TablePreset =>
  ({ id, label, lengthMm: l, depthMm: d, heightMm: h, seats });

const R = (id: string, label: string, dia: number, h: number, seats?: number): TablePreset =>
  ({ id, label, lengthMm: dia, depthMm: dia, heightMm: h, diameterMm: dia, seats });

export const TABLE_TYPES: TableTypeDef[] = [
  /* ---------------- Desks ---------------- */
  {
    id: "rectangular-office", label: "Rectangular Office Table", short: "OFFICE TABLE", symbol: "desk",
    shapes: ["rectangle", "square", "curved", "custom"], defaultShape: "rectangle",
    presets: [P("1200x600", "1200 × 600 × 750", 1200, 600, 750, 1), P("1500x750", "1500 × 750 × 750", 1500, 750, 750, 1)],
    defaultSupportId: "ms-legs-4", defaultMaterialKey: "board-prelam-18",
    seatingModel: "single", defaultAccessories: [], group: "Desks", isActive: true,
  },
  {
    id: "executive", label: "Executive Table", short: "EXECUTIVE", symbol: "desk",
    shapes: ["rectangle", "l-shape", "curved", "custom"], defaultShape: "rectangle",
    presets: [
      P("1500x750", "1500 × 750 × 750", 1500, 750, 750, 1),
      P("1800x900", "1800 × 900 × 750", 1800, 900, 750, 1),
      P("2100x900", "2100 × 900 × 750", 2100, 900, 750, 1),
    ],
    defaultSupportId: "panel-base", defaultMaterialKey: "board-prelam-25",
    seatingModel: "single", defaultAccessories: ["side-storage", "modesty-panel", "cable-grommet"],
    group: "Desks", isActive: true,
  },
  {
    id: "manager", label: "Manager Table", short: "MANAGER", symbol: "desk",
    shapes: ["rectangle", "l-shape", "custom"], defaultShape: "rectangle",
    presets: [P("1500x750", "1500 × 750 × 750", 1500, 750, 750, 1), P("1800x900", "1800 × 900 × 750", 1800, 900, 750, 1)],
    defaultSupportId: "ms-legs-4", defaultMaterialKey: "board-prelam-18",
    seatingModel: "single", defaultAccessories: ["mobile-pedestal", "modesty-panel"],
    group: "Desks", isActive: true,
  },
  {
    id: "staff", label: "Staff Table", short: "STAFF", symbol: "desk",
    shapes: ["rectangle", "square", "l-shape", "custom"], defaultShape: "rectangle",
    presets: [P("1200x600", "1200 × 600 × 750", 1200, 600, 750, 1), P("1500x750", "1500 × 750 × 750", 1500, 750, 750, 1)],
    defaultSupportId: "ms-legs-4", defaultMaterialKey: "board-prelam-18",
    seatingModel: "single", defaultAccessories: [], group: "Desks", isActive: true,
  },
  {
    id: "computer", label: "Computer Table", short: "COMPUTER", symbol: "desk",
    shapes: ["rectangle", "l-shape", "corner", "custom"], defaultShape: "rectangle",
    presets: [P("1200x600", "1200 × 600 × 750", 1200, 600, 750, 1), P("1500x600", "1500 × 600 × 750", 1500, 600, 750, 1)],
    defaultSupportId: "ms-legs-4", defaultMaterialKey: "board-prelam-18",
    seatingModel: "single",
    defaultAccessories: ["keyboard-tray", "cpu-holder", "cable-tray", "cable-grommet"],
    group: "Desks", isActive: true,
  },
  {
    id: "corner-table", label: "Corner Table", short: "CORNER", symbol: "desk",
    shapes: ["corner", "l-shape", "square", "custom"], defaultShape: "corner",
    presets: [P("1200x1200", "1200 × 1200 × 750", 1200, 1200, 750, 1)],
    defaultSupportId: "ms-legs-4", defaultMaterialKey: "board-prelam-18",
    seatingModel: "single", defaultAccessories: [], group: "Desks", isActive: true,
  },

  /* ---------------- Meeting ---------------- */
  {
    id: "conference", label: "Conference Table", short: "CONFERENCE", symbol: "conference",
    shapes: ["rectangle", "oval", "curved", "circle", "u-shape", "custom"], defaultShape: "rectangle",
    presets: [
      P("1800x900", "1800 × 900 × 750", 1800, 900, 750, 6),
      P("2400x1200", "2400 × 1200 × 750", 2400, 1200, 750, 8),
      P("3000x1200", "3000 × 1200 × 750", 3000, 1200, 750, 10),
      P("3600x1500", "3600 × 1500 × 750", 3600, 1500, 750, 12),
    ],
    defaultSupportId: "twin-pedestal", defaultMaterialKey: "board-prelam-25",
    seatingModel: "perimeter",
    defaultAccessories: ["power-manager", "cable-grommet", "modesty-panel"],
    panels: ["conference"], group: "Meeting", isActive: true,
  },
  {
    id: "meeting", label: "Meeting Table", short: "MEETING", symbol: "conference",
    shapes: ["rectangle", "oval", "circle", "square", "custom"], defaultShape: "rectangle",
    presets: [P("1800x900", "1800 × 900 × 750", 1800, 900, 750, 6), P("2400x1200", "2400 × 1200 × 750", 2400, 1200, 750, 8)],
    defaultSupportId: "twin-pedestal", defaultMaterialKey: "board-prelam-18",
    seatingModel: "perimeter", defaultAccessories: ["cable-grommet"],
    panels: ["conference"], group: "Meeting", isActive: true,
  },
  {
    id: "discussion", label: "Discussion Table", short: "DISCUSSION", symbol: "round",
    shapes: ["circle", "square", "rectangle", "oval", "custom"], defaultShape: "circle",
    presets: [R("d900", "900 mm dia", 900, 750, 4), R("d1200", "1200 mm dia", 1200, 750, 6)],
    defaultSupportId: "central-pedestal", defaultMaterialKey: "board-prelam-18",
    seatingModel: "perimeter", defaultAccessories: [], group: "Meeting", isActive: true,
  },
  {
    id: "round", label: "Round Table", short: "ROUND", symbol: "round",
    shapes: ["circle", "oval", "custom"], defaultShape: "circle",
    presets: [
      R("d750", "750 mm dia", 750, 750, 3),
      R("d900", "900 mm dia", 900, 750, 4),
      R("d1200", "1200 mm dia", 1200, 750, 6),
      R("d1500", "1500 mm dia", 1500, 750, 8),
    ],
    defaultSupportId: "central-pedestal", defaultMaterialKey: "board-prelam-18",
    seatingModel: "perimeter", defaultAccessories: [], group: "Meeting", isActive: true,
  },
  {
    id: "oval", label: "Oval Table", short: "OVAL", symbol: "conference",
    shapes: ["oval", "circle", "custom"], defaultShape: "oval",
    presets: [P("2400x1200", "2400 × 1200 × 750", 2400, 1200, 750, 8), P("3000x1200", "3000 × 1200 × 750", 3000, 1200, 750, 10)],
    defaultSupportId: "twin-pedestal", defaultMaterialKey: "board-prelam-25",
    seatingModel: "perimeter", defaultAccessories: ["power-manager"],
    panels: ["conference"], group: "Meeting", isActive: true,
  },
  {
    id: "square-table", label: "Square Table", short: "SQUARE", symbol: "desk",
    shapes: ["square", "circle", "custom"], defaultShape: "square",
    presets: [P("900x900", "900 × 900 × 750", 900, 900, 750, 4), P("1200x1200", "1200 × 1200 × 750", 1200, 1200, 750, 4)],
    defaultSupportId: "central-pedestal", defaultMaterialKey: "board-prelam-18",
    seatingModel: "perimeter", defaultAccessories: [], group: "Meeting", isActive: true,
  },

  /* ---------------- Shaped ---------------- */
  {
    id: "l-shaped", label: "L-Shaped Table", short: "L-TABLE", symbol: "desk",
    shapes: ["l-shape", "corner", "custom"], defaultShape: "l-shape",
    presets: [P("1500x750", "1500 × 750 (+900 return)", 1500, 750, 750, 1), P("1800x900", "1800 × 900 (+1050 return)", 1800, 900, 750, 1)],
    defaultSupportId: "ms-legs-4", defaultMaterialKey: "board-prelam-18",
    seatingModel: "single", defaultAccessories: ["mobile-pedestal", "modesty-panel"],
    group: "Desks", isActive: true,
  },
  {
    id: "u-shaped", label: "U-Shaped Table", short: "U-TABLE", symbol: "desk",
    shapes: ["u-shape", "custom"], defaultShape: "u-shape",
    presets: [P("1800x750", "1800 × 750 (+2 returns)", 1800, 750, 750, 1)],
    defaultSupportId: "panel-base", defaultMaterialKey: "board-prelam-18",
    seatingModel: "single", defaultAccessories: ["modesty-panel", "cable-grommet"],
    group: "Desks", isActive: true,
  },
  {
    id: "t-shaped", label: "T-Shaped Table", short: "T-TABLE", symbol: "conference",
    shapes: ["t-shape", "custom"], defaultShape: "t-shape",
    presets: [P("2400x900", "2400 × 900 (+stem)", 2400, 900, 750, 8)],
    defaultSupportId: "twin-pedestal", defaultMaterialKey: "board-prelam-18",
    seatingModel: "perimeter", defaultAccessories: [], group: "Meeting", isActive: true,
  },

  /* ---------------- Workstations ---------------- */
  {
    id: "workstation", label: "Workstation Table", short: "WORKSTATION", symbol: "workstation",
    shapes: ["rectangle", "l-shape", "custom"], defaultShape: "rectangle",
    presets: [P("1200x600", "1200 × 600 × 750 per person", 1200, 600, 750, 1), P("1500x600", "1500 × 600 × 750 per person", 1500, 600, 750, 1)],
    defaultSupportId: "ms-frame", defaultMaterialKey: "board-prelam-18",
    seatingModel: "workstation",
    defaultAccessories: ["mobile-pedestal", "cpu-holder", "cable-tray", "power-manager", "cable-grommet"],
    panels: ["workstation"], group: "Workstations", isActive: true,
  },
  {
    id: "linear-workstation", label: "Linear Multi-Seater Workstation", short: "LINEAR WS", symbol: "workstation",
    shapes: ["rectangle", "custom"], defaultShape: "rectangle",
    presets: [P("1200x600", "1200 × 600 per seat", 1200, 600, 750, 1), P("1500x600", "1500 × 600 per seat", 1500, 600, 750, 1)],
    defaultSupportId: "ms-frame", defaultMaterialKey: "board-prelam-18",
    seatingModel: "workstation",
    defaultAccessories: ["cable-tray", "power-manager", "cable-grommet"],
    panels: ["workstation"], group: "Workstations", isActive: true,
  },
  {
    id: "back-to-back-workstation", label: "Back-to-Back Workstation", short: "B2B WS", symbol: "workstation",
    shapes: ["rectangle", "custom"], defaultShape: "rectangle",
    presets: [P("1200x600", "1200 × 600 per seat", 1200, 600, 750, 1), P("1500x600", "1500 × 600 per seat", 1500, 600, 750, 1)],
    defaultSupportId: "ms-frame", defaultMaterialKey: "board-prelam-18",
    seatingModel: "workstation",
    defaultAccessories: ["cable-tray", "power-manager", "cable-grommet", "mobile-pedestal"],
    panels: ["workstation"], group: "Workstations", isActive: true,
  },
  {
    id: "cluster-workstation", label: "Cluster Workstation", short: "CLUSTER WS", symbol: "workstation",
    shapes: ["l-shape", "rectangle", "custom"], defaultShape: "l-shape",
    presets: [P("1200x600", "1200 × 600 per seat", 1200, 600, 750, 1)],
    defaultSupportId: "ms-frame", defaultMaterialKey: "board-prelam-18",
    seatingModel: "workstation",
    defaultAccessories: ["cable-tray", "power-manager", "cable-grommet"],
    panels: ["workstation"], group: "Workstations", isActive: true,
  },

  /* ---------------- Reception & pantry ---------------- */
  {
    id: "reception", label: "Reception Table", short: "RECEPTION", symbol: "reception",
    shapes: ["rectangle", "l-shape", "u-shape", "curved", "custom"], defaultShape: "l-shape",
    presets: [P("1800x750", "1800 × 750 × 1100", 1800, 750, 1100, 1), P("2400x750", "2400 × 750 × 1100", 2400, 750, 1100, 2)],
    defaultSupportId: "panel-base", defaultMaterialKey: "board-prelam-25",
    seatingModel: "counter",
    defaultAccessories: ["under-counter-storage", "cpu-holder", "drawer-unit", "cable-tray"],
    panels: ["reception"], group: "Reception & Pantry", isActive: true,
  },
  {
    id: "pantry-dining", label: "Pantry / Dining Table", short: "DINING", symbol: "conference",
    shapes: ["rectangle", "circle", "square", "oval", "custom"], defaultShape: "rectangle",
    presets: [P("1200x750", "1200 × 750 × 750", 1200, 750, 750, 4), P("1800x900", "1800 × 900 × 750", 1800, 900, 750, 6)],
    defaultSupportId: "ms-legs-4", defaultMaterialKey: "board-wpc-18",
    seatingModel: "perimeter", defaultAccessories: [], group: "Reception & Pantry", isActive: true,
  },

  /* ---------------- Special ---------------- */
  {
    id: "wall-mounted", label: "Wall-Mounted Table", short: "WALL TABLE", symbol: "wall",
    shapes: ["rectangle", "curved", "semi-circle", "custom"], defaultShape: "rectangle",
    presets: [P("1200x450", "1200 × 450 × 750", 1200, 450, 750)],
    defaultSupportId: "wall-bracket", defaultMaterialKey: "board-hdhmr-18",
    seatingModel: "none", defaultAccessories: [],
    panels: ["wallMount"], group: "Special", isActive: true,
  },
  {
    id: "folding", label: "Folding Table", short: "FOLDING", symbol: "wall",
    shapes: ["rectangle", "square", "semi-circle", "custom"], defaultShape: "rectangle",
    presets: [P("1200x600", "1200 × 600 × 750", 1200, 600, 750)],
    defaultSupportId: "folding-bracket", defaultMaterialKey: "board-hdhmr-18",
    seatingModel: "none", defaultAccessories: [],
    panels: ["wallMount"], group: "Special", isActive: true,
  },
  {
    id: "custom-shaped", label: "Custom-Shaped Table", short: "CUSTOM", symbol: "desk",
    shapes: ["custom", "rectangle", "square", "circle", "oval", "l-shape", "u-shape", "t-shape",
             "curved", "d-shape", "semi-circle", "trapezoid", "corner"],
    defaultShape: "custom",
    presets: [P("1500x750", "1500 × 750 × 750", 1500, 750, 750, 1)],
    defaultSupportId: "custom-support", defaultMaterialKey: "board-prelam-18",
    seatingModel: "single", defaultAccessories: [], group: "Special", isActive: true,
  },
];

export const findTableType = (id: string): TableTypeDef =>
  TABLE_TYPES.find((t) => t.id === id) ?? TABLE_TYPES[0];

export const TABLE_TYPE_GROUPS = ["Desks", "Meeting", "Workstations", "Reception & Pantry", "Special"] as const;

/* ==========================================================================
 * 4. SUPPORT / BASE TYPES  (spec §7)
 * ========================================================================== */

export interface SupportTypeDef {
  id: string;
  label: string;
  /** "steel" bases are taken off as pipe runs (length × kg/m); "panel" bases as board area;
   *  "bracket" bases as counted brackets. This single field is what routes the BOQ. */
  kind: "steel" | "panel" | "bracket" | "pedestal";
  /** Default Material Master key for the frame/panel/bracket. */
  defaultMaterialKey: string;
  defaultLegs: number;
  /** Board-panel bases need no legs. */
  note: string;
  isActive: boolean;
}

export const SUPPORT_TYPES: SupportTypeDef[] = [
  { id: "ms-legs-4",       label: "Four MS Legs",              kind: "steel",   defaultMaterialKey: "shs-50x50x2",  defaultLegs: 4, note: "4 square-tube legs + apron rails", isActive: true },
  { id: "ms-frame",        label: "Powder-coated MS Frame",    kind: "steel",   defaultMaterialKey: "shs-50x50x2",  defaultLegs: 4, note: "Welded MS frame, powder coated",  isActive: true },
  { id: "ss-frame",        label: "Stainless-Steel Frame",     kind: "steel",   defaultMaterialKey: "ss-pipe-50x25",defaultLegs: 4, note: "SS 304 frame",                     isActive: true },
  { id: "alu-frame",       label: "Aluminium Frame",           kind: "steel",   defaultMaterialKey: "alu-profile-40",defaultLegs: 4,note: "Extruded aluminium frame",         isActive: true },
  { id: "wooden-panels",   label: "Wooden Side Panels",        kind: "panel",   defaultMaterialKey: "board-prelam-18", defaultLegs: 0, note: "Board side gables",             isActive: true },
  { id: "panel-base",      label: "Panel-Type Base",           kind: "panel",   defaultMaterialKey: "board-prelam-25", defaultLegs: 0, note: "Full board panel base",         isActive: true },
  { id: "central-pedestal",label: "Central Pedestal",          kind: "pedestal",defaultMaterialKey: "shs-50x50x2",  defaultLegs: 1, note: "Single centre column + base plate", isActive: true },
  { id: "twin-pedestal",   label: "Twin Pedestal",             kind: "pedestal",defaultMaterialKey: "shs-50x50x2",  defaultLegs: 2, note: "Two column bases",                 isActive: true },
  { id: "wall-bracket",    label: "Wall-Mounted Bracket",      kind: "bracket", defaultMaterialKey: "hw-bracket-wall", defaultLegs: 0, note: "Cantilever wall brackets",      isActive: true },
  { id: "folding-bracket", label: "Folding Bracket",           kind: "bracket", defaultMaterialKey: "hw-bracket-fold", defaultLegs: 0, note: "Lock-type folding brackets",    isActive: true },
  { id: "storage-base",    label: "Storage-Supported Base",    kind: "panel",   defaultMaterialKey: "board-prelam-18", defaultLegs: 0, note: "Table sits on its storage unit", isActive: true },
  { id: "custom-support",  label: "Custom Support",            kind: "steel",   defaultMaterialKey: "shs-50x50x2",  defaultLegs: 4, note: "User-defined support",             isActive: true },
];

export const findSupport = (id: string): SupportTypeDef =>
  SUPPORT_TYPES.find((s) => s.id === id) ?? SUPPORT_TYPES[0];

/** Pipe profile options offered when the support is a steel one (spec §7). */
export const PIPE_PROFILES = [
  { id: "shs-25x25x2",  label: "25 × 25 × 2 mm SHS" },
  { id: "shs-40x40x2",  label: "40 × 40 × 2 mm SHS" },
  { id: "shs-50x50x2",  label: "50 × 50 × 2 mm SHS" },
  { id: "rhs-60x40x2",  label: "60 × 40 × 2 mm RHS" },
  { id: "ms-flat-50x6", label: "50 × 6 mm MS Flat" },
  { id: "ss-pipe-50x25",label: "50 × 25 mm SS Pipe" },
  { id: "alu-profile-40", label: "40 × 40 mm Aluminium" },
];

/* ==========================================================================
 * 5. ACCESSORIES  (spec §8)
 * ========================================================================== */

export interface AccessoryDef {
  id: string;
  label: string;
  /** Material Master key — the rate and weight come from there, never from here. */
  materialKey: string;
  /** Default footprint (mm). Storage accessories are drawn to this size in the plan. */
  lengthMm: number;
  depthMm: number;
  heightMm: number;
  /** Drawn in the 2D plan / elevation by default. */
  drawByDefault: boolean;
  /** Where it sits by default. */
  position: "left" | "right" | "front" | "rear" | "under" | "on-top";
  /** Extra clearance the accessory needs in front of it to be usable (drawer pull-out, spec §15). */
  needsOpeningClearance: boolean;
  group: "Storage" | "Cable & Power" | "Ergonomics" | "Screens" | "Fittings";
  isActive: boolean;
}

export const ACCESSORIES: AccessoryDef[] = [
  /* Storage */
  { id: "mobile-pedestal",       label: "Mobile Pedestal",        materialKey: "acc-pedestal-3d",    lengthMm: 400, depthMm: 450, heightMm: 600, drawByDefault: true,  position: "under", needsOpeningClearance: true,  group: "Storage", isActive: true },
  { id: "fixed-pedestal",        label: "Fixed Pedestal",         materialKey: "acc-pedestal-fixed", lengthMm: 400, depthMm: 450, heightMm: 650, drawByDefault: true,  position: "under", needsOpeningClearance: true,  group: "Storage", isActive: true },
  { id: "drawer-unit-3",         label: "Three-Drawer Unit",      materialKey: "acc-pedestal-3d",    lengthMm: 400, depthMm: 450, heightMm: 600, drawByDefault: true,  position: "under", needsOpeningClearance: true,  group: "Storage", isActive: true },
  { id: "drawer-unit-4",         label: "Four-Drawer Unit",       materialKey: "acc-pedestal-4d",    lengthMm: 400, depthMm: 450, heightMm: 700, drawByDefault: true,  position: "under", needsOpeningClearance: true,  group: "Storage", isActive: true },
  { id: "drawer-unit",           label: "Drawer Unit",            materialKey: "acc-pedestal-3d",    lengthMm: 400, depthMm: 450, heightMm: 600, drawByDefault: true,  position: "under", needsOpeningClearance: true,  group: "Storage", isActive: true },
  { id: "side-storage",          label: "Side Storage",           materialKey: "board-prelam-18",    lengthMm: 900, depthMm: 450, heightMm: 650, drawByDefault: true,  position: "right", needsOpeningClearance: true,  group: "Storage", isActive: true },
  { id: "return-storage",        label: "Return Storage",         materialKey: "board-prelam-18",    lengthMm: 900, depthMm: 450, heightMm: 650, drawByDefault: true,  position: "left",  needsOpeningClearance: true,  group: "Storage", isActive: true },
  { id: "under-counter-storage", label: "Under-Counter Storage",  materialKey: "board-prelam-18",    lengthMm: 900, depthMm: 400, heightMm: 700, drawByDefault: true,  position: "under", needsOpeningClearance: true,  group: "Storage", isActive: true },

  /* Cable & power */
  { id: "cable-tray",     label: "Cable Tray",         materialKey: "cable-tray-100",  lengthMm: 1000, depthMm: 100, heightMm: 80,  drawByDefault: true,  position: "under",  needsOpeningClearance: false, group: "Cable & Power", isActive: true },
  { id: "cable-grommet",  label: "Cable Grommet",      materialKey: "hw-grommet",      lengthMm: 60,   depthMm: 60,  heightMm: 20,  drawByDefault: true,  position: "on-top", needsOpeningClearance: false, group: "Cable & Power", isActive: true },
  { id: "power-manager",  label: "Power Manager",      materialKey: "acc-power-manager",lengthMm: 300, depthMm: 100, heightMm: 60,  drawByDefault: true,  position: "on-top", needsOpeningClearance: false, group: "Cable & Power", isActive: true },
  { id: "popup-socket",   label: "Pop-up Socket Box",  materialKey: "acc-popup-box",   lengthMm: 250,  depthMm: 120, heightMm: 100, drawByDefault: true,  position: "on-top", needsOpeningClearance: false, group: "Cable & Power", isActive: true },
  { id: "wire-box",       label: "Wire-Management Box",materialKey: "cable-tray-100",  lengthMm: 400,  depthMm: 150, heightMm: 100, drawByDefault: false, position: "under",  needsOpeningClearance: false, group: "Cable & Power", isActive: true },

  /* Ergonomics */
  { id: "keyboard-tray", label: "Keyboard Tray", materialKey: "acc-keyboard-tray", lengthMm: 600, depthMm: 300, heightMm: 60,  drawByDefault: true,  position: "under", needsOpeningClearance: true,  group: "Ergonomics", isActive: true },
  { id: "cpu-holder",    label: "CPU Holder",    materialKey: "acc-cpu-holder",    lengthMm: 220, depthMm: 400, heightMm: 450, drawByDefault: true,  position: "under", needsOpeningClearance: false, group: "Ergonomics", isActive: true },
  { id: "footrest",      label: "Footrest",      materialKey: "acc-footrest",      lengthMm: 450, depthMm: 350, heightMm: 100, drawByDefault: false, position: "under", needsOpeningClearance: false, group: "Ergonomics", isActive: true },

  /* Screens */
  { id: "modesty-panel",     label: "Modesty Panel",     materialKey: "board-prelam-18",    lengthMm: 1200, depthMm: 18, heightMm: 400, drawByDefault: true,  position: "rear",   needsOpeningClearance: false, group: "Screens", isActive: true },
  { id: "glass-partition",   label: "Glass Partition",   materialKey: "partition-glass-8",  lengthMm: 1200, depthMm: 8,  heightMm: 400, drawByDefault: true,  position: "rear",   needsOpeningClearance: false, group: "Screens", isActive: true },
  { id: "fabric-partition",  label: "Fabric Partition",  materialKey: "partition-fabric-40",lengthMm: 1200, depthMm: 40, heightMm: 450, drawByDefault: true,  position: "rear",   needsOpeningClearance: false, group: "Screens", isActive: true },
  { id: "acrylic-partition", label: "Acrylic Partition", materialKey: "partition-acrylic-5",lengthMm: 1200, depthMm: 5,  heightMm: 400, drawByDefault: true,  position: "rear",   needsOpeningClearance: false, group: "Screens", isActive: true },

  /* Fittings */
  { id: "name-plate", label: "Name Plate",         materialKey: "hw-nameplate", lengthMm: 200, depthMm: 50, heightMm: 8,  drawByDefault: false, position: "on-top", needsOpeningClearance: false, group: "Fittings", isActive: true },
  { id: "lock",       label: "Lock",               materialKey: "hw-lock-cam",  lengthMm: 20,  depthMm: 20, heightMm: 20, drawByDefault: false, position: "front",  needsOpeningClearance: false, group: "Fittings", isActive: true },
  { id: "wheels",     label: "Wheels / Castors",   materialKey: "hw-castor-50", lengthMm: 50,  depthMm: 50, heightMm: 50, drawByDefault: false, position: "under",  needsOpeningClearance: false, group: "Fittings", isActive: true },
  { id: "levellers",  label: "Adjustable Levellers",materialKey: "hw-leveller", lengthMm: 30,  depthMm: 30, heightMm: 30, drawByDefault: false, position: "under",  needsOpeningClearance: false, group: "Fittings", isActive: true },
];

export const findAccessory = (id: string): AccessoryDef | undefined =>
  ACCESSORIES.find((a) => a.id === id);

/**
 * Accessories that are ALSO electrical points (spec lists them under both §8 Accessories and §21
 * Electrical). `CabinTable.electrical` OWNS their quantity — they are deliberately NOT kept in
 * `CabinTable.accessories`, because storing one physical power manager in two places is how you get
 * a BOQ that bills five of them when the customer asked for four. The editor still shows them in the
 * Accessories panel; it just binds them to the electrical fields.
 */
export const ELECTRICAL_ACCESSORY_IDS = new Set(["power-manager", "popup-socket"]);

/** The `CabinTable.electrical` field an electrical-accessory id maps to. */
export const ELECTRICAL_ACCESSORY_FIELD: Record<string, "powerManagerQty" | "popupBoxQty"> = {
  "power-manager": "powerManagerQty",
  "popup-socket": "popupBoxQty",
};

export const ACCESSORY_GROUPS = ["Storage", "Cable & Power", "Ergonomics", "Screens", "Fittings"] as const;

/* ==========================================================================
 * 6. CHAIRS  (spec §9)
 * ========================================================================== */

export interface ChairTypeDef {
  id: string;
  label: string;
  materialKey: string;
  widthMm: number;
  depthMm: number;
  isActive: boolean;
}

export const CHAIR_TYPES: ChairTypeDef[] = [
  { id: "task",       label: "Task Chair (mesh)",    materialKey: "chair-task",       widthMm: 550, depthMm: 550, isActive: true },
  { id: "visitor",    label: "Visitor Chair",        materialKey: "chair-visitor",    widthMm: 500, depthMm: 500, isActive: true },
  { id: "executive",  label: "Executive Chair",      materialKey: "chair-executive",  widthMm: 650, depthMm: 650, isActive: true },
  { id: "conference", label: "Conference Chair",     materialKey: "chair-conference", widthMm: 560, depthMm: 560, isActive: true },
];

export const findChair = (id?: string): ChairTypeDef =>
  CHAIR_TYPES.find((c) => c.id === id) ?? CHAIR_TYPES[0];

/* ==========================================================================
 * 7. AUTO-ARRANGE PATTERNS  (spec §16)
 * ========================================================================== */

export type ArrangementPattern =
  | "single-row"
  | "double-row"
  | "face-to-face"
  | "back-to-back"
  | "along-wall"
  | "centre-aligned"
  | "u-shaped"
  | "classroom"
  | "conference"
  | "dining"
  | "custom-grid";

export const ARRANGEMENT_PATTERNS: { id: ArrangementPattern; label: string; note: string }[] = [
  { id: "single-row",     label: "Single row",        note: "One row along the cabin length" },
  { id: "double-row",     label: "Double row",        note: "Two rows with a central aisle" },
  { id: "face-to-face",   label: "Face-to-face",      note: "Desks facing each other across the aisle" },
  { id: "back-to-back",   label: "Back-to-back",      note: "Desks sharing a spine partition" },
  { id: "along-wall",     label: "Along wall",        note: "Hugging the perimeter walls" },
  { id: "centre-aligned", label: "Centre aligned",    note: "Centred pod" },
  { id: "u-shaped",       label: "U-shaped",          note: "Three runs forming a U" },
  { id: "classroom",      label: "Classroom",         note: "Rows all facing one end" },
  { id: "conference",     label: "Conference",        note: "One table, chairs all round" },
  { id: "dining",         label: "Dining",            note: "Grid of dining tables" },
  { id: "custom-grid",    label: "Custom grid",       note: "Rows × columns you choose" },
];

/* ==========================================================================
 * 8. SEATING CAPACITY OPTIONS  (spec §9)
 * ========================================================================== */

export const SEATING_CAPACITIES = [1, 2, 4, 6, 8, 10, 12] as const;

/**
 * Suggested seating for a perimeter-seated table (conference / meeting / dining / discussion),
 * derived from the actual top size (spec §9: "automatically suggest the seating capacity based
 * on table dimensions"). One seat per `pitchMm` of usable edge, ends seated only when the end is
 * wide enough for a chair.
 */
export function suggestSeating(
  shape: TableShape,
  lengthMm: number,
  depthMm: number,
  pitchMm = 700,
): number {
  const L = Math.max(0, lengthMm);
  const D = Math.max(0, depthMm);

  if (shape === "circle") {
    const circumference = Math.PI * L; // L === diameter for a circle
    return Math.max(2, Math.floor(circumference / pitchMm));
  }
  if (shape === "oval") {
    // Ramanujan's approximation for an ellipse perimeter.
    const a = L / 2, b = D / 2;
    const h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
    const p = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
    return Math.max(2, Math.floor(p / pitchMm));
  }
  if (shape === "semi-circle" || shape === "d-shape") {
    const p = (Math.PI * L) / 2 + L;
    return Math.max(2, Math.floor(p / pitchMm));
  }

  // Rectangular family: seats down both long sides + one at each end when the end takes a chair.
  const perSide = Math.floor(L / pitchMm);
  const ends = D >= 900 ? 2 : 0;
  return Math.max(2, perSide * 2 + ends);
}
