/**
 * FURNITURE MATERIAL MASTER — the seed rows for the Table Customisation Module.
 *
 * WHY THIS FILE IS SEPARATE FROM materialMaster.ts:
 *   materialMaster.ts imports the Supabase client. `pricing.ts` (which runs on the PUBLIC homepage)
 *   must be able to price a table without pulling Supabase — and the BOQ engine must be able to
 *   price one with no DB at all. So the DATA lives here, pure and framework-free, and
 *   materialMaster.ts merely spreads it into SEED_MATERIALS (its DB seeder + offline fallback).
 *
 * NOTHING IN THE CALCULATOR HARDCODES A RATE (spec §23). These are the *seed* rates that ship with
 * the app and get written into `boq_materials` on first admin seed; once the admin edits a rate in
 * the Material Master, the DB row wins everywhere — the table BOQ, the quotation and the estimate
 * all read the same MaterialIndex.
 *
 * ENGINE CONTRACT (src/lib/boq/engine.ts + validate.ts) — obey or you get hard validation errors:
 *   • a line emitted as kind "steel" (any LINEAR item: legs, rails, edge band, cable tray)
 *       ⇒ the material MUST have weightBasis "kg_per_m" and a non-null unitWeight
 *   • a line emitted as kind "sheet" (any AREA item: tops, laminate, partitions, powder coating)
 *       ⇒ MUST have weightBasis "kg_per_sqm" and a non-null unitWeight
 *   • a line emitted as kind "count" (hardware, accessories, chairs, labour-hours)
 *       ⇒ a weight is only required when the category is a WEIGHED one or the rate is per_kg.
 *         Labour rows are category "misc" + rateUnit "per_nos", so they legitimately carry no weight.
 *
 * Board weights are density × thickness (particle 650, MDF 750, HDHMR 800, ply 600, marine 650,
 * WPC 700, PVC 550, hardwood 700, granite 2700, quartz 2400, glass 2500, SS 7930, MS 7850 kg/m³).
 */

import type { Material, MaterialCategory, RateUnit, Uom, WeightBasis } from "./types";

/** Kept in sync with materialMaster.ts's SEED_EFFECTIVE_DATE — one revision date for the whole seed. */
export const FURNITURE_SEED_DATE = "2026-07-13";

const f = (
  key: string,
  name: string,
  category: MaterialCategory,
  sectionSize: string,
  thicknessMm: number | null,
  grade: string,
  uom: Uom,
  unitWeight: number | null,
  weightBasis: WeightBasis,
  stockLengthM: number | null,
  sheetLengthM: number | null,
  sheetWidthM: number | null,
  purchaseRate: number | null,
  rateUnit: RateUnit,
  wastagePercent: number,
): Material => ({
  key, name, category, sectionSize, thicknessMm, grade, uom, unitWeight, weightBasis,
  stockLengthM, sheetLengthM, sheetWidthM, purchaseRate, rateUnit, wastagePercent,
  supplier: "",
  effectiveDate: FURNITURE_SEED_DATE,
  isActive: true,
  notes: "",
});

/** Standard board sheet — 8 ft × 4 ft. */
const SH_L = 2.44;
const SH_W = 1.22;

export const FURNITURE_MATERIALS: Material[] = [
  /* ---------------- tabletop boards (kind: sheet ⇒ kg_per_sqm) ---------------- */
  f("board-prelam-18",   "Prelaminated Particle Board 18 mm", "board", "18 mm prelam PB",  18, "IS 3087",     "sqm", 11.70, "kg_per_sqm", null, SH_L, SH_W, 1850, "per_sheet", 8),
  f("board-prelam-25",   "Prelaminated Particle Board 25 mm", "board", "25 mm prelam PB",  25, "IS 3087",     "sqm", 16.25, "kg_per_sqm", null, SH_L, SH_W, 2450, "per_sheet", 8),
  f("board-mdf-18",      "MDF Board 18 mm",                   "board", "18 mm MDF",        18, "IS 14587",    "sqm", 13.50, "kg_per_sqm", null, SH_L, SH_W, 1650, "per_sheet", 8),
  f("board-hdhmr-18",    "HDHMR Board 18 mm",                 "board", "18 mm HDHMR",      18, "IS 3087 HD",  "sqm", 14.40, "kg_per_sqm", null, SH_L, SH_W, 2900, "per_sheet", 8),
  f("board-ply-18",      "Commercial Plywood 18 mm",          "board", "18 mm ply",        18, "MR IS 303",   "sqm", 10.80, "kg_per_sqm", null, SH_L, SH_W, 2400, "per_sheet", 8),
  f("board-marineply-18","Marine Plywood 18 mm",              "board", "18 mm marine ply", 18, "BWP IS 710",  "sqm", 11.70, "kg_per_sqm", null, SH_L, SH_W, 3200, "per_sheet", 8),
  f("board-wpc-18",      "WPC Board 18 mm",                   "board", "18 mm WPC",        18, "IS 17425",    "sqm", 12.60, "kg_per_sqm", null, SH_L, SH_W, 2800, "per_sheet", 6),
  f("board-pvc-18",      "PVC Board 18 mm",                   "board", "18 mm PVC foam",   18, "IS 17425",    "sqm",  9.90, "kg_per_sqm", null, SH_L, SH_W, 2600, "per_sheet", 6),
  f("board-solidwood-25","Solid Wood Top 25 mm",              "board", "25 mm hardwood",   25, "Seasoned",    "sqm", 17.50, "kg_per_sqm", null, null, null, 2200, "per_sqm",   12),

  /* ---------------- non-board tops (kind: sheet ⇒ kg_per_sqm) ---------------- */
  f("top-ss304-1.2",  "Stainless Steel Top 1.2 mm (SS 304)", "sheet", "1.2 mm SS 304",  1.2, "SS 304",     "sqm",  9.52, "kg_per_sqm", null, SH_L, SH_W, 1450, "per_sqm", 6),
  f("top-ms-2",       "Mild Steel Top 2 mm",                 "sheet", "2 mm MS plate",  2,   "IS 2062",    "sqm", 15.70, "kg_per_sqm", null, SH_L, SH_W,  850, "per_sqm", 6),
  f("top-granite-18", "Granite Top 18 mm",                   "board", "18 mm granite",  18,  "Polished",   "sqm", 48.60, "kg_per_sqm", null, null, null, 1800, "per_sqm", 12),
  f("top-quartz-20",  "Engineered Quartz Top 20 mm",         "board", "20 mm quartz",   20,  "Engineered", "sqm", 48.00, "kg_per_sqm", null, null, null, 3500, "per_sqm", 12),
  f("top-glass-12",   "Toughened Glass Top 12 mm",           "board", "12 mm toughened",12,  "IS 2553",    "sqm", 30.00, "kg_per_sqm", null, null, null, 2400, "per_sqm", 10),

  /* ---------------- surface finish (kind: sheet ⇒ kg_per_sqm) ---------------- */
  f("laminate-1mm",     "Decorative Laminate 1 mm",       "finishing", "1 mm laminate", 1,    "IS 2046",   "sqm", 1.40, "kg_per_sqm", null, SH_L, SH_W, 1250, "per_sheet", 8),
  f("powdercoat-60mic", "Powder Coating 60 micron",       "finishing", "60 micron",     null, "IS 13871",  "sqm", 0.12, "kg_per_sqm", null, null, null,  180, "per_sqm",   5),

  /* ---------------- edge band + adhesive ---------------- */
  /* Edge band is a LINEAR item ⇒ emitted as kind "steel" ⇒ needs kg_per_m (engine.ts steelWeightKg). */
  f("edgeband-pvc-2",   "PVC Edge Band 2 mm",   "hardware",  "2 mm × 22 mm",  2,   "PVC",      "m",   0.020, "kg_per_m",  null, null, null, 12, "per_m",   5),
  f("edgeband-pvc-0.8", "PVC Edge Band 0.8 mm", "hardware",  "0.8 mm × 22 mm",0.8, "PVC",      "m",   0.010, "kg_per_m",  null, null, null,  6, "per_m",   5),
  f("adhesive-sr",      "Synthetic Resin Adhesive", "finishing", "SR adhesive", null, "IS 848", "ltr", 1.0,   "none",      null, null, null, 280, "per_ltr", 5),

  /* ---------------- table steel frame / legs (kind: steel ⇒ kg_per_m) ----------------
   * shs-50x50x2 / shs-40x40x2 already exist in materialMaster.ts — reused, not redefined. */
  f("shs-25x25x2",    "MS Square Tube 25 × 25 × 2 mm",     "steel_section", "25 × 25 mm SHS",    2,   "IS 4923 YSt 210", "m", 1.44, "kg_per_m", 6.0, null, null,  68, "per_kg", 3),
  f("rhs-60x40x2",    "MS Rectangular Tube 60 × 40 × 2 mm","steel_section", "60 × 40 mm RHS",    2,   "IS 4923 YSt 210", "m", 3.01, "kg_per_m", 6.0, null, null,  68, "per_kg", 3),
  f("ms-flat-50x6",   "MS Flat 50 × 6 mm",                 "steel_section", "50 × 6 mm flat",    6,   "IS 2062 E250",    "m", 2.36, "kg_per_m", 6.0, null, null,  65, "per_kg", 3),
  f("ss-pipe-50x25",  "SS Rectangular Pipe 50 × 25 × 1.2", "steel_section", "50 × 25 mm SS",     1.2, "SS 304",          "m", 1.35, "kg_per_m", 6.0, null, null, 320, "per_kg", 4),
  f("alu-profile-40", "Aluminium Profile 40 × 40 mm",      "steel_section", "40 × 40 mm alu",    2,   "AL 6063",         "m", 0.86, "kg_per_m", 6.0, null, null, 290, "per_kg", 4),
  f("cable-tray-100", "Cable Tray 100 mm (under-desk)",    "steel_section", "100 mm CRCA tray",  1.2, "CRCA powder ctd", "m", 1.20, "kg_per_m", 3.0, null, null, 280, "per_m",  5),

  /* ---------------- workstation partitions (kind: sheet ⇒ kg_per_sqm) ---------------- */
  f("partition-fabric-40",  "Fabric Partition Screen 40 mm", "panel", "40 mm fabric panel", 40, "Fabric + PB", "sqm",  6.50, "kg_per_sqm", null, null, null, 1450, "per_sqm", 6),
  f("partition-glass-8",    "Glass Partition Screen 8 mm",   "panel", "8 mm toughened",     8,  "IS 2553",     "sqm", 20.00, "kg_per_sqm", null, null, null, 1900, "per_sqm", 8),
  f("partition-acrylic-5",  "Acrylic Partition Screen 5 mm", "panel", "5 mm acrylic",       5,  "Cast acrylic","sqm",  5.95, "kg_per_sqm", null, null, null, 1600, "per_sqm", 8),

  /* ---------------- hardware + accessories (kind: count ⇒ kg_per_nos) ---------------- */
  f("hw-drawer-channel",  "Drawer Channel (telescopic, pair)", "hardware", "450 mm pair",  null, "Zn plated",  "nos", 0.90, "kg_per_nos", null, null, null,  380, "per_nos", 2),
  f("hw-hinge-softclose", "Soft-close Hinge",                  "hardware", "35 mm cup",    null, "Nickel",     "nos", 0.12, "kg_per_nos", null, null, null,  120, "per_nos", 2),
  f("hw-lock-cam",        "Cam Lock",                          "hardware", "20 mm cam",    null, "Zn alloy",   "nos", 0.08, "kg_per_nos", null, null, null,  180, "per_nos", 2),
  f("hw-handle-ss",       "SS Cabinet Handle 128 mm",          "hardware", "128 mm CC",    null, "SS 304",     "nos", 0.10, "kg_per_nos", null, null, null,  150, "per_nos", 2),
  f("hw-leveller",        "Adjustable Leveller",               "hardware", "M8 × 30 mm",   null, "Nylon + MS", "nos", 0.04, "kg_per_nos", null, null, null,   35, "per_nos", 2),
  f("hw-castor-50",       "Castor Wheel 50 mm",                "hardware", "50 mm twin",   null, "Nylon",      "nos", 0.09, "kg_per_nos", null, null, null,   65, "per_nos", 2),
  f("hw-grommet",         "Cable Grommet 60 mm",               "hardware", "60 mm dia",    null, "ABS",        "nos", 0.05, "kg_per_nos", null, null, null,   90, "per_nos", 2),
  f("hw-connector",       "Knock-down Connector (minifix)",    "hardware", "15 mm",        null, "Zn alloy",   "nos", 0.02, "kg_per_nos", null, null, null,    8, "per_nos", 5),
  f("hw-bracket-wall",    "Wall-mount Bracket (heavy duty)",   "hardware", "300 mm arm",   null, "MS powder",  "nos", 1.20, "kg_per_nos", null, null, null,  450, "per_nos", 2),
  f("hw-bracket-fold",    "Folding Bracket (lock-type)",       "hardware", "300 mm fold",  null, "MS powder",  "nos", 1.45, "kg_per_nos", null, null, null,  650, "per_nos", 2),
  f("hw-nameplate",       "Acrylic Name Plate",                "hardware", "200 × 50 mm",  null, "Acrylic",    "nos", 0.15, "kg_per_nos", null, null, null,  450, "per_nos", 0),

  f("acc-pedestal-3d",    "Mobile Pedestal — 3 drawer",        "hardware", "400×450×600",  null, "Prelam PB",  "nos", 22.0, "kg_per_nos", null, null, null, 6500, "per_nos", 3),
  f("acc-pedestal-4d",    "Mobile Pedestal — 4 drawer",        "hardware", "400×450×700",  null, "Prelam PB",  "nos", 26.0, "kg_per_nos", null, null, null, 7800, "per_nos", 3),
  f("acc-pedestal-fixed", "Fixed Pedestal — 3 drawer",         "hardware", "400×450×650",  null, "Prelam PB",  "nos", 24.0, "kg_per_nos", null, null, null, 6200, "per_nos", 3),
  f("acc-keyboard-tray",  "Keyboard Tray (sliding)",           "hardware", "600 × 300 mm", null, "MS + PB",    "nos",  3.2, "kg_per_nos", null, null, null,  850, "per_nos", 2),
  f("acc-cpu-holder",     "CPU Holder (adjustable)",           "hardware", "Adjustable",   null, "MS powder",  "nos",  2.8, "kg_per_nos", null, null, null, 1200, "per_nos", 2),
  f("acc-footrest",       "Footrest (adjustable)",             "hardware", "450 × 350 mm", null, "MS + ABS",   "nos",  2.4, "kg_per_nos", null, null, null,  700, "per_nos", 2),
  f("acc-power-manager",  "Power Manager (4 socket + 2 USB)",  "electrical","4S + 2USB",   null, "BIS",        "nos",  1.1, "kg_per_nos", null, null, null, 2400, "per_nos", 0),
  f("acc-popup-box",      "Pop-up Power Box (6 module)",       "electrical","6 module",    null, "BIS",        "nos",  1.8, "kg_per_nos", null, null, null, 3200, "per_nos", 0),
  f("acc-floor-box",      "Floor Box (4 module)",              "electrical","4 module",    null, "BIS",        "nos",  2.2, "kg_per_nos", null, null, null, 2800, "per_nos", 0),

  /* ---------------- chairs (kind: count) ---------------- */
  f("chair-task",       "Task Chair (mesh, revolving)",   "hardware", "Mesh back",   null, "BIFMA", "nos", 11.0, "kg_per_nos", null, null, null, 4500, "per_nos", 0),
  f("chair-visitor",    "Visitor Chair (fixed)",          "hardware", "Fixed frame", null, "BIFMA", "nos",  7.5, "kg_per_nos", null, null, null, 2200, "per_nos", 0),
  f("chair-executive",  "Executive Chair (high back)",    "hardware", "High back",   null, "BIFMA", "nos", 16.0, "kg_per_nos", null, null, null, 8500, "per_nos", 0),
  f("chair-conference", "Conference Chair (medium back)", "hardware", "Medium back", null, "BIFMA", "nos", 12.0, "kg_per_nos", null, null, null, 5500, "per_nos", 0),

  /* ---------------- table electrical (kind: count / steel) ---------------- */
  f("elec-socket-5a",  "Socket 5A (modular)",     "electrical", "5A modular",  null, "BIS",     "nos", 0.15, "kg_per_nos", null, null, null, 380, "per_nos", 0),
  f("elec-socket-16a", "Socket 16A (modular)",    "electrical", "16A modular", null, "BIS",     "nos", 0.22, "kg_per_nos", null, null, null, 520, "per_nos", 0),
  f("elec-usb-point",  "USB Charging Point",      "electrical", "2-port USB",  null, "BIS",     "nos", 0.12, "kg_per_nos", null, null, null, 650, "per_nos", 0),
  f("elec-data-point", "Data Point (RJ11)",       "electrical", "RJ11",        null, "BIS",     "nos", 0.10, "kg_per_nos", null, null, null, 450, "per_nos", 0),
  f("elec-lan-point",  "LAN Point (RJ45 Cat 6)",  "electrical", "RJ45 Cat 6",  null, "BIS",     "nos", 0.10, "kg_per_nos", null, null, null, 480, "per_nos", 0),
  f("elec-hdmi-point", "HDMI Point",              "electrical", "HDMI faceplate", null, "BIS",  "nos", 0.14, "kg_per_nos", null, null, null, 900, "per_nos", 0),
  f("elec-conduit-25", "PVC Conduit 25 mm",       "electrical", "25 mm",       null, "IS 9537", "m",   0.18, "kg_per_m",   3.0,  null, null,  45, "per_m",   6),

  /* ---------------- furniture labour (kind: count · qty = MAN-HOURS · rate = ₹/hour) ----------------
   * category "misc" + rateUnit "per_nos" ⇒ engine's weightRequired() is false, so these legitimately
   * carry no weight and never raise `missing_unit_weight`. */
  f("lab-board-cutting",  "Labour — board cutting & sizing",   "misc", "man-hour", null, "Skilled",     "nos", null, "none", null, null, null, 320, "per_nos", 0),
  f("lab-edge-banding",   "Labour — edge banding",             "misc", "man-hour", null, "Skilled",     "nos", null, "none", null, null, null, 300, "per_nos", 0),
  f("lab-carpentry",      "Labour — carpentry & assembly",     "misc", "man-hour", null, "Carpenter",   "nos", null, "none", null, null, null, 450, "per_nos", 0),
  f("lab-welding",        "Labour — welding",                  "misc", "man-hour", null, "Welder",      "nos", null, "none", null, null, null, 480, "per_nos", 0),
  f("lab-grinding",       "Labour — grinding & finishing",     "misc", "man-hour", null, "Semi-skilled","nos", null, "none", null, null, null, 320, "per_nos", 0),
  f("lab-electrical",     "Labour — electrical installation",  "misc", "man-hour", null, "Electrician", "nos", null, "none", null, null, null, 400, "per_nos", 0),
  f("lab-site-install",   "Labour — site installation",        "misc", "man-hour", null, "Skilled",     "nos", null, "none", null, null, null, 350, "per_nos", 0),
];

/* ==========================================================================
 * UI option lists — every dropdown in the Table editor reads these, so a material
 * added to the Master (or here) shows up in the UI with no code change.
 * ========================================================================== */

export const TABLETOP_MATERIAL_KEYS = [
  "board-prelam-18", "board-prelam-25", "board-mdf-18", "board-hdhmr-18",
  "board-ply-18", "board-marineply-18", "board-wpc-18", "board-pvc-18",
  "board-solidwood-25", "top-ss304-1.2", "top-ms-2", "top-granite-18",
  "top-quartz-20", "top-glass-12",
];

export const EDGE_BAND_KEYS = ["edgeband-pvc-2", "edgeband-pvc-0.8"];

/** Steel / aluminium profiles a table frame can be built from. */
export const TABLE_PROFILE_KEYS = [
  "shs-25x25x2", "shs-40x40x2", "shs-50x50x2", "rhs-60x40x2",
  "ms-flat-50x6", "ss-pipe-50x25", "alu-profile-40",
];

export const PARTITION_KEYS: Record<"fabric" | "glass" | "acrylic", string> = {
  fabric: "partition-fabric-40",
  glass: "partition-glass-8",
  acrylic: "partition-acrylic-5",
};

export const CHAIR_KEYS = ["chair-task", "chair-visitor", "chair-executive", "chair-conference"];

/** Fixed material roles the take-off falls back to when the table does not name one. */
export const TABLE_ROLES = {
  top: "board-prelam-18",
  edge: "edgeband-pvc-2",
  profile: "shs-50x50x2",
  rail: "shs-40x40x2",
  laminate: "laminate-1mm",
  adhesive: "adhesive-sr",
  powderCoat: "powdercoat-60mic",
  screw: "selfdrill-screw",
  connector: "hw-connector",
  leveller: "hw-leveller",
  castor: "hw-castor-50",
  grommet: "hw-grommet",
  drawerChannel: "hw-drawer-channel",
  hinge: "hw-hinge-softclose",
  lock: "hw-lock-cam",
  handle: "hw-handle-ss",
  cableTray: "cable-tray-100",
  conduit: "elec-conduit-25",
  wire: "elec-wire-1.5",
  chair: "chair-task",
  labCutting: "lab-board-cutting",
  labEdge: "lab-edge-banding",
  labCarpentry: "lab-carpentry",
  labWelding: "lab-welding",
  labGrinding: "lab-grinding",
  labElectrical: "lab-electrical",
  labInstall: "lab-site-install",
} as const;
