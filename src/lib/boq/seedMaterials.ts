/**
 * SEED MATERIALS — the offline Material Master (pure: no React, no Supabase).
 *
 * WHY THIS IS A SEPARATE FILE FROM materialMaster.ts:
 *   materialMaster.ts imports the Supabase client. Two callers need the seed rates but must NOT pull
 *   Supabase in with them:
 *     • the Table module's pricing (src/features/.../tablePricing.ts), which prices a table on the
 *       PUBLIC homepage, where material_master is not even readable (it is admin-RLS'd);
 *     • any pure take-off/pricing test that runs with no database at all.
 *   Before this split those callers had to MIRROR a handful of rows by hand, which meant one rate
 *   lived in two files and could silently drift. There is now exactly ONE definition of every seed
 *   row, and materialMaster.ts re-exports it so every existing import keeps working.
 *
 * These are STARTING values for the admin to edit in the Material Master screen, not constants.
 * The DB row always wins once the admin has seeded/edited it.
 */

import { FURNITURE_MATERIALS } from "@/lib/boq/furnitureMaterials";
import type { Material, MaterialCategory, RateUnit, Uom, WeightBasis } from "@/lib/boq/types";
/* ==========================================================================
 * SEED — must stay byte-for-byte in sync with the migration's VALUES list
 * ========================================================================== */

/**
 * The migration seeds with `effective_date` defaulted to CURRENT_DATE. Pinning the seed to the
 * migration's own date keeps the offline fallback deterministic (a rate that "changes" every day is
 * not a rate) and makes the seeded rows lose cleanly to any later admin revision.
 */
export const SEED_EFFECTIVE_DATE = "2026-07-13";

/**
 * Mirrors the migration's column list 1:1 so the two lists can be diffed by eye:
 *   (key, name, category, section_size, thickness_mm, grade, uom, unit_weight, weight_basis,
 *    stock_length_m, sheet_length_m, sheet_width_m, purchase_rate, rate_unit, wastage_percent)
 * The migration seeds supplier '' and lets effective_date / is_active / notes take their defaults.
 */
const seed = (
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
  effectiveDate: SEED_EFFECTIVE_DATE,
  isActive: true,
  notes: "",
});

/**
 * The seed set — IDENTICAL keys and values to the INSERT in the migration.
 * It is BOTH the offline fallback (so the BOQ prices correctly before the migration is applied) AND
 * what the admin's "Seed default materials" button writes. Unit weights are the standard tabulated
 * values (hollow section: kg/m = (2t(a+b) − 4t²) × 0.00785 · sheet: kg/m² = t_mm × 7.85).
 */
const CABIN_SEED_MATERIALS: Material[] = [
  /* ---- steel sections (kg/m) ---- */
  seed("rhs-100x50x3",   "MS Rectangular Tube 100 × 50 × 3 mm", "steel_section", "100 × 50 mm RHS",      3,    "IS 4923 YSt 210", "m",   6.71,  "kg_per_m",    6.0,  null,  null,  68,   "per_kg",  3),
  seed("shs-50x50x2",    "MS Square Tube 50 × 50 × 2 mm",       "steel_section", "50 × 50 mm SHS",       2,    "IS 4923 YSt 210", "m",   2.95,  "kg_per_m",    6.0,  null,  null,  68,   "per_kg",  3),
  seed("shs-50x50x3",    "MS Square Tube 50 × 50 × 3 mm",       "steel_section", "50 × 50 mm SHS",       3,    "IS 4923 YSt 210", "m",   4.29,  "kg_per_m",    6.0,  null,  null,  68,   "per_kg",  3),
  seed("shs-40x40x2",    "MS Square Tube 40 × 40 × 2 mm",       "steel_section", "40 × 40 mm SHS",       2,    "IS 4923 YSt 210", "m",   2.32,  "kg_per_m",    6.0,  null,  null,  68,   "per_kg",  3),
  seed("ismc-100x50",    "MS C-Channel ISMC 100 × 50",          "steel_section", "ISMC 100 × 50",        6,    "IS 2062 E250",    "m",   9.56,  "kg_per_m",    6.0,  null,  null,  65,   "per_kg",  3),
  seed("c-purlin-75x40", "C-Purlin 75 × 40 × 2 mm",             "steel_section", "C 75 × 40 mm",         2,    "IS 811",          "m",   2.90,  "kg_per_m",    6.0,  null,  null,  70,   "per_kg",  3),
  seed("angle-50x50x5",  "MS Angle 50 × 50 × 5 mm",             "steel_section", "MS Angle 50 × 50 mm",  5,    "IS 2062 E250",    "m",   3.80,  "kg_per_m",    6.0,  null,  null,  65,   "per_kg",  3),
  seed("angle-40x40x5",  "MS Angle 40 × 40 × 5 mm",             "steel_section", "MS Angle 40 × 40 mm",  5,    "IS 2062 E250",    "m",   2.90,  "kg_per_m",    6.0,  null,  null,  65,   "per_kg",  3),
  seed("pipe-od48x2",    "MS Pipe OD 48 × 2 mm (handrail)",     "steel_section", "Pipe OD 48 mm",        2,    "IS 1239",         "m",   2.27,  "kg_per_m",    6.0,  null,  null,  72,   "per_kg",  5),

  /* ---- sheets / panels (kg/m²) ---- */
  seed("sheet-ext-gi-0.8",   "External GI Sheet 0.8 mm",           "sheet", "GI profiled sheet",    0.8, "GI 120 GSM",   "sqm", 6.28,  "kg_per_sqm", null, 3.0,  1.0,  92,   "per_sqm", 6),
  seed("sheet-int-ppgi-0.5", "Internal PPGI Wall Sheet 0.5 mm",    "sheet", "PPGI plain sheet",     0.5, "PPGI RAL9002", "sqm", 3.93,  "kg_per_sqm", null, 3.0,  1.0,  78,   "per_sqm", 6),
  seed("sheet-roof-0.5",     "Roofing Sheet 0.5 mm (trapezoidal)", "sheet", "Trapezoidal profile",  0.5, "PPGL AZ150",   "sqm", 4.30,  "kg_per_sqm", null, 3.0,  1.05, 88,   "per_sqm", 8),
  seed("sheet-ceiling-0.5",  "Ceiling Sheet 0.5 mm",               "sheet", "PPGI plain sheet",     0.5, "PPGI RAL9010", "sqm", 3.93,  "kg_per_sqm", null, 3.0,  1.0,  76,   "per_sqm", 6),
  seed("chequered-plate-4",  "MS Chequered Plate 4 mm",            "sheet", "Chequered plate",      4,   "IS 3502",      "sqm", 33.40, "kg_per_sqm", null, 2.5,  1.25, 78,   "per_kg",  5),
  seed("puf-panel-50",       "PUF Sandwich Panel 50 mm",           "panel", "50 mm PUF panel",      50,  "PUF 40 kg/m³", "sqm", 9.85,  "kg_per_sqm", null, 3.0,  1.15, 1150, "per_sqm", 5),

  /* ---- insulation / boards / finishes ---- */
  seed("glasswool-50",   "Glass Wool Insulation 50 mm",      "insulation",   "50 mm blanket", 50, "24 kg/m³",   "sqm", 1.20,  "kg_per_sqm", null, 15.0, 1.2,  95,  "per_sqm", 8),
  seed("cementboard-18", "Cement / Bison Board 18 mm",       "board",        "18 mm board",   18, "IS 14276",   "sqm", 23.40, "kg_per_sqm", null, 2.44, 1.22, 320, "per_sqm", 8),
  seed("ply-board-18",   "Flooring Board — Marine Ply 18 mm", "board",       "18 mm ply",     18, "BWP IS 710", "sqm", 11.50, "kg_per_sqm", null, 2.44, 1.22, 285, "per_sqm", 8),
  seed("vinyl-2mm",      "Vinyl Flooring 2 mm",              "floor_finish", "2 mm vinyl roll", 2, "IS 3462",   "sqm", 1.80,  "kg_per_sqm", null, 20.0, 2.0,  155, "per_sqm", 6),

  /* ---- openings ---- */
  seed("door-ms-flush",     "MS Flush Door 900 × 2100 mm",  "door",          "0.9 × 2.1 m",       null, "MS 18G skin", "nos", 28,    "kg_per_nos", null, null, null, 7500, "per_nos", 0),
  seed("door-frame-40x40",  "Door Frame — 40 × 40 SHS",     "steel_section", "40 × 40 mm SHS",    2,    "IS 4923",     "m",   2.32,  "kg_per_m",   6.0,  null, null, 68,   "per_kg",  5),
  seed("window-slider",     "Aluminium Sliding Window",     "window",        "1.2 × 1.2 m",       null, "2-track",     "nos", 18,    "kg_per_nos", null, null, null, 3500, "per_nos", 0),
  seed("window-frame-40x40","Window Frame — 40 × 40 SHS",   "steel_section", "40 × 40 mm SHS",    2,    "IS 4923",     "m",   2.32,  "kg_per_m",   6.0,  null, null, 68,   "per_kg",  5),
  seed("window-grill",      "MS Window Grill 12 mm sq bar", "hardware",      "12 mm square bar",  12,   "IS 2062",     "sqm", 11.30, "kg_per_sqm", null, null, null, 78,   "per_kg",  5),

  /* ---- hardware / fixings ---- */
  seed("bolt-m12",         "Nut Bolt M12 assembly",          "hardware", "M12 × 50 mm", null, "8.8 grade", "nos", 0.09, "kg_per_nos", null, null, null, 22,  "per_nos", 2),
  seed("selfdrill-screw",  "Self-drilling Screw w/ washer",  "hardware", "12 × 50 mm",  null, "Zn plated", "nos", 0.01, "kg_per_nos", null, null, null, 3.5, "per_nos", 5),

  /* ---- electrical ---- */
  seed("elec-led-panel", "LED Panel Light 18 W",     "electrical", "18 W",          null, "BIS",     "nos", 0.6,  "kg_per_nos", null, null, null, 800,  "per_nos", 0),
  seed("elec-fan",       "Ceiling Fan 1200 mm",      "electrical", "1200 mm sweep", null, "BIS",     "nos", 4.5,  "kg_per_nos", null, null, null, 2500, "per_nos", 0),
  seed("elec-socket",    "Socket / Plug Point 6A",   "electrical", "6A modular",    null, "BIS",     "nos", 0.2,  "kg_per_nos", null, null, null, 450,  "per_nos", 0),
  seed("elec-switch",    "Switch Board (modular)",   "electrical", "4-module",      null, "BIS",     "nos", 0.3,  "kg_per_nos", null, null, null, 650,  "per_nos", 0),
  seed("elec-wire-1.5",  "Copper Wire 1.5 sq mm",    "electrical", "1.5 sq mm FR",  null, "IS 694",  "m",   0.02, "kg_per_m",   null, null, null, 18,   "per_m",   5),
  seed("elec-db",        "Distribution Board 8-way", "electrical", "8-way DB",      null, "IS 8623", "nos", 3.2,  "kg_per_nos", null, null, null, 4200, "per_nos", 0),

  /* ---- plumbing ---- */
  seed("plumb-wc",        "EWC / Indian WC pan",  "plumbing", "Ceramic", null, "IS 2556",  "nos", 18,   "kg_per_nos", null, null, null, 3800, "per_nos", 0),
  seed("plumb-washbasin", "Wash Basin",           "plumbing", "Ceramic", null, "IS 2556",  "nos", 12,   "kg_per_nos", null, null, null, 2200, "per_nos", 0),
  seed("plumb-cpvc-25",   "CPVC Pipe 25 mm",      "plumbing", "25 mm",   null, "IS 15778", "m",   0.35, "kg_per_m",   3.0,  null, null, 145,  "per_m",   8),
  seed("plumb-pvc-110",   "PVC Soil Pipe 110 mm", "plumbing", "110 mm",  null, "IS 13592", "m",   1.60, "kg_per_m",   3.0,  null, null, 320,  "per_m",   8),

  /* ---- finishing ---- */
  seed("primer-red-oxide", "Red Oxide Primer",       "finishing", "1 coat",  null, "IS 2074", "ltr", 1.0, "none", null, null, null, 240, "per_ltr", 5),
  seed("enamel-paint",     "Synthetic Enamel Paint", "finishing", "2 coats", null, "IS 2932", "ltr", 1.0, "none", null, null, null, 380, "per_ltr", 5),
];

/**
 * The whole seed set: the CABIN materials above, plus the FURNITURE materials (boards, edge bands,
 * table profiles, partition screens, hardware, accessories, chairs, table electricals and furniture
 * labour) that the Table Customisation Module takes off. ONE list — so  writes
 * every row the BOQ can reference, and the offline index can price both a cabin and a table.
 */
export const SEED_MATERIALS: Material[] = [...CABIN_SEED_MATERIALS, ...FURNITURE_MATERIALS];
