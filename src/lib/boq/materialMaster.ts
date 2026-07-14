/**
 * MATERIAL MASTER — the data layer. The ONLY file under src/lib/boq/ that touches Supabase.
 *
 * WHY this file exists, and why it is the only impure one:
 *  · The engine (takeoff → priceTakeoff → reports) must never invent a kg/m or a ₹. Every weight
 *    and rate is read from here and passed IN as a MaterialIndex, which keeps the engine pure and
 *    unit-testable, and keeps exactly one place that knows what a Postgres row looks like.
 *  · RATE HISTORY, not rate mutation. `material_master` is unique on (key, effective_date). A rate
 *    revision INSERTS a new effective-dated row (reviseRate), so an old quotation can always be
 *    re-priced at the rate that was live on its own date. fetchMaterials therefore resolves, per
 *    key, the greatest effective_date <= asOf.
 *  · MIGRATION DRIFT is a documented fact of this repo: migrations get committed and never applied.
 *    So every READ degrades gracefully — a missing or empty table falls back to SEED_MATERIALS with
 *    source "seed" and never throws, and the UI can warn the admin the master is not live yet.
 *    WRITES are the one exception: they throw a message naming the migration, because silently
 *    swallowing a save would lose the admin's data.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultBoqSettings,
  type BoqSettings,
  type BoqTemplateKind,
  type Material,
  type MaterialCategory,
  type MaterialIndex,
  type RateUnit,
  type Uom,
  type WeightBasis,
} from "@/lib/boq/types";

const MATERIALS = "material_master";
const TEMPLATES = "boq_templates";

/**
 * src/integrations/supabase/types.ts has NOT been regenerated since
 * 20260713140000_material_master_boq.sql, so `material_master` / `boq_templates` are absent from the
 * generated Database union and `.from()` would reject them. One narrow, documented cast — the rest of
 * the module stays typed through MaterialRow / TemplateRow.
 */
const db = (): SupabaseClient => supabase as unknown as SupabaseClient;

const MIGRATION_HINT =
  "Material Master tables are not in the database yet. Apply supabase/migrations/20260713140000_material_master_boq.sql (Supabase SQL editor or `supabase db push`).";

/* ==========================================================================
 * Schema-drift detection (same contract as labourColonyStore.isSchemaMissing)
 * ========================================================================== */

function isSchemaMissing(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  const code = e.code || "";
  const msg = (e.message || "").toLowerCase();
  return (
    code === "PGRST205" || code === "PGRST204" || code === "42P01" ||
    msg.includes("does not exist") || msg.includes("schema cache") || msg.includes("could not find")
  );
}

function messageOf(error: unknown): string {
  const e = error as { message?: string } | null;
  return e?.message || String(error);
}

/* ==========================================================================
 * Row mapping — snake_case mirrors the migration exactly
 * ========================================================================== */

interface MaterialRow {
  id?: string;
  key: string;
  name: string;
  category: string;
  section_size: string;
  thickness_mm: number | string | null;
  grade: string;
  uom: string;
  unit_weight: number | string | null;
  weight_basis: string;
  stock_length_m: number | string | null;
  sheet_length_m: number | string | null;
  sheet_width_m: number | string | null;
  purchase_rate: number | string | null;
  rate_unit: string;
  wastage_percent: number | string | null;
  supplier: string;
  effective_date: string;
  is_active: boolean;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

/** PostgREST can hand `numeric` back as a string depending on the driver — coerce once, here. */
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const isoDate = (v: unknown): string =>
  typeof v === "string" && v.length >= 10 ? v.slice(0, 10) : today();

export const today = (): string => new Date().toISOString().slice(0, 10);

export function rowToMaterial(r: MaterialRow): Material {
  return {
    id: r.id,
    key: r.key,
    name: r.name || r.key,
    category: (r.category || "misc") as MaterialCategory,
    sectionSize: r.section_size || "",
    thicknessMm: num(r.thickness_mm),
    grade: r.grade || "",
    uom: (r.uom || "nos") as Uom,
    unitWeight: num(r.unit_weight),
    weightBasis: (r.weight_basis || "none") as WeightBasis,
    stockLengthM: num(r.stock_length_m),
    sheetLengthM: num(r.sheet_length_m),
    sheetWidthM: num(r.sheet_width_m),
    purchaseRate: num(r.purchase_rate),
    rateUnit: (r.rate_unit || "per_nos") as RateUnit,
    wastagePercent: num(r.wastage_percent) ?? 0,
    supplier: r.supplier || "",
    effectiveDate: isoDate(r.effective_date),
    isActive: r.is_active !== false,
    notes: r.notes || "",
    updatedAt: r.updated_at,
  };
}

/** `id` is omitted when absent so Postgres applies its own gen_random_uuid() default. */
export function materialToRow(m: Material): Record<string, unknown> {
  const row: Record<string, unknown> = {
    key: m.key,
    name: m.name,
    category: m.category,
    section_size: m.sectionSize,
    thickness_mm: m.thicknessMm,
    grade: m.grade,
    uom: m.uom,
    unit_weight: m.unitWeight,
    weight_basis: m.weightBasis,
    stock_length_m: m.stockLengthM,
    sheet_length_m: m.sheetLengthM,
    sheet_width_m: m.sheetWidthM,
    purchase_rate: m.purchaseRate,
    rate_unit: m.rateUnit,
    wastage_percent: m.wastagePercent,
    supplier: m.supplier,
    effective_date: m.effectiveDate,
    is_active: m.isActive,
    notes: m.notes ?? "",
  };
  if (m.id) row.id = m.id;
  return row;
}

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
export const SEED_MATERIALS: Material[] = [
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

/* ==========================================================================
 * Reads — never throw
 * ========================================================================== */

const byCategoryThenName = (a: Material, b: Material) =>
  a.category.localeCompare(b.category) || a.name.localeCompare(b.name);

const seedResult = (error?: string) => ({
  materials: SEED_MATERIALS.map((m) => ({ ...m })).sort(byCategoryThenName),
  source: "seed" as const,
  error,
});

/**
 * Fetch the live master, resolving rate history: per key, the row with the greatest
 * effective_date <= asOf, ignoring is_active = false rows. A missing table (migration not applied)
 * or an empty table falls back to SEED_MATERIALS with source "seed", so the UI can warn the admin.
 */
export async function fetchMaterials(
  asOf?: string,
): Promise<{ materials: Material[]; source: "db" | "seed"; error?: string }> {
  const on = asOf ? asOf.slice(0, 10) : today();
  try {
    const { data, error } = await db()
      .from(MATERIALS)
      .select("*")
      .eq("is_active", true)
      .lte("effective_date", on)
      .order("effective_date", { ascending: true });

    if (error) {
      return seedResult(isSchemaMissing(error) ? MIGRATION_HINT : messageOf(error));
    }
    const rows = (data ?? []) as MaterialRow[];
    if (rows.length === 0) {
      return seedResult("Material Master is empty — seed the default materials to start.");
    }

    // Ascending effective_date ⇒ the last row seen for a key is the one in force on `asOf`.
    const byKey = new Map<string, Material>();
    for (const row of rows) byKey.set(row.key, rowToMaterial(row));

    return { materials: Array.from(byKey.values()).sort(byCategoryThenName), source: "db" };
  } catch (e) {
    return seedResult(isSchemaMissing(e) ? MIGRATION_HINT : messageOf(e));
  }
}

/** key → Material. On duplicate keys the later effective date wins, mirroring fetchMaterials. */
export function indexMaterials(list: Material[]): MaterialIndex {
  const idx: MaterialIndex = {};
  for (const m of list) {
    const prev = idx[m.key];
    if (!prev || m.effectiveDate >= prev.effectiveDate) idx[m.key] = m;
  }
  return idx;
}

/* ==========================================================================
 * Writes — throw, naming the migration, rather than silently losing an edit
 * ========================================================================== */

function writeError(error: unknown): Error {
  return new Error(isSchemaMissing(error) ? MIGRATION_HINT : messageOf(error));
}

/**
 * Insert a new material, or update an existing row in place when it carries an id.
 * Editing an existing row's rate REWRITES history — use reviseRate() to preserve it.
 */
export async function upsertMaterial(m: Material): Promise<Material> {
  const row = materialToRow(m);
  try {
    const q = m.id
      ? db().from(MATERIALS).update(row).eq("id", m.id)
      : db().from(MATERIALS).upsert(row, { onConflict: "key,effective_date" });

    const { data, error } = await q.select("*").single();
    if (error) throw writeError(error);
    return rowToMaterial(data as MaterialRow);
  } catch (e) {
    throw e instanceof Error && e.message === MIGRATION_HINT ? e : writeError(e);
  }
}

export async function deleteMaterial(id: string): Promise<void> {
  try {
    const { error } = await db().from(MATERIALS).delete().eq("id", id);
    if (error && !isSchemaMissing(error)) throw writeError(error);
  } catch (e) {
    if (!isSchemaMissing(e)) throw writeError(e);
  }
}

/**
 * Write SEED_MATERIALS into an un-seeded master. Keys that already exist (at ANY effective date) are
 * left alone — seeding must never clobber an admin's edited rate. Returns the number inserted.
 */
export async function seedMaterials(): Promise<number> {
  try {
    const { data, error } = await db().from(MATERIALS).select("key");
    if (error) throw writeError(error);

    const existing = new Set(((data ?? []) as { key: string }[]).map((r) => r.key));
    const missing = SEED_MATERIALS.filter((m) => !existing.has(m.key));
    if (missing.length === 0) return 0;

    const { data: inserted, error: insertError } = await db()
      .from(MATERIALS)
      .upsert(missing.map(materialToRow), { onConflict: "key,effective_date", ignoreDuplicates: true })
      .select("id");
    if (insertError) throw writeError(insertError);

    return ((inserted ?? []) as unknown[]).length;
  } catch (e) {
    throw e instanceof Error && e.message === MIGRATION_HINT ? e : writeError(e);
  }
}

/**
 * A rate revision INSERTS a new effective-dated row rather than mutating the old one — history is
 * preserved and quotations priced before `effectiveDate` stay reproducible. Re-revising the same key
 * on the same date overwrites that day's row (the unique index is (key, effective_date)).
 */
export async function reviseRate(
  key: string,
  newRate: number,
  effectiveDate: string,
  base: Material,
): Promise<Material> {
  const revision: Material = {
    ...base,
    key,
    purchaseRate: newRate,
    effectiveDate: effectiveDate.slice(0, 10),
    isActive: true,
    id: undefined,
    updatedAt: undefined,
  };
  return upsertMaterial(revision);
}

/* ==========================================================================
 * BOQ TEMPLATES
 * ========================================================================== */

export interface BoqTemplateRecord {
  id: string;
  name: string;
  kind: BoqTemplateKind;
  description: string;
  isDefault: boolean;
  data: BoqSettings;
  updatedAt?: string;
}

interface TemplateRow {
  id: string;
  name: string;
  kind: string;
  description: string;
  is_default: boolean;
  data: Partial<BoqSettings> | null;
  updated_at?: string;
}

/** A template saved before a BoqSettings field existed must still load — defaults fill the gaps. */
function rowToTemplate(r: TemplateRow): BoqTemplateRecord {
  const kind = (r.kind || "ms_cabin") as BoqTemplateKind;
  return {
    id: r.id,
    name: r.name || "Untitled template",
    kind,
    description: r.description || "",
    isDefault: r.is_default === true,
    data: { ...defaultBoqSettings(kind), ...(r.data ?? {}), templateKind: kind, templateId: r.id },
    updatedAt: r.updated_at,
  };
}

function templateToRow(t: Omit<BoqTemplateRecord, "id"> & { id?: string }): Record<string, unknown> {
  const row: Record<string, unknown> = {
    name: t.name,
    kind: t.kind,
    description: t.description,
    is_default: t.isDefault,
    data: t.data,
  };
  if (t.id) row.id = t.id;
  return row;
}

export async function listTemplates(kind?: BoqTemplateKind): Promise<BoqTemplateRecord[]> {
  try {
    let q = db().from(TEMPLATES).select("*");
    if (kind) q = q.eq("kind", kind);
    const { data, error } = await q.order("is_default", { ascending: false }).order("name");
    if (error) {
      if (!isSchemaMissing(error)) console.warn("boq_templates load:", error.message);
      return [];
    }
    return ((data ?? []) as TemplateRow[]).map(rowToTemplate);
  } catch (e) {
    if (!isSchemaMissing(e)) console.warn("boq_templates load failed:", e);
    return [];
  }
}

/**
 * `boq_templates` has a partial unique index (kind) WHERE is_default, so promoting a template to
 * default must first demote the incumbent or the insert violates it.
 */
export async function saveTemplate(
  t: Omit<BoqTemplateRecord, "id"> & { id?: string },
): Promise<BoqTemplateRecord> {
  try {
    if (t.isDefault) {
      const demote = db().from(TEMPLATES).update({ is_default: false }).eq("kind", t.kind);
      const { error } = await (t.id ? demote.neq("id", t.id) : demote);
      if (error) throw writeError(error);
    }

    const row = templateToRow(t);
    const q = t.id
      ? db().from(TEMPLATES).update(row).eq("id", t.id)
      : db().from(TEMPLATES).insert(row);

    const { data, error } = await q.select("*").single();
    if (error) throw writeError(error);
    return rowToTemplate(data as TemplateRow);
  } catch (e) {
    throw e instanceof Error && e.message === MIGRATION_HINT ? e : writeError(e);
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  try {
    const { error } = await db().from(TEMPLATES).delete().eq("id", id);
    if (error && !isSchemaMissing(error)) throw writeError(error);
  } catch (e) {
    if (!isSchemaMissing(e)) throw writeError(e);
  }
}

/* ==========================================================================
 * Health checks — what the engine's validation layer asks before it prices
 * ========================================================================== */

/**
 * True when the master carries everything priceTakeoff() needs for this material. A per_kg rate is
 * meaningless without a unit weight; a per_sheet rate without a sheet size; a per_stock_length rate
 * without a stock length. Anything false here becomes a missing_rate / missing_unit_weight issue.
 */
export function isPriceable(m: Material): boolean {
  if (m.purchaseRate === null || !Number.isFinite(m.purchaseRate)) return false;
  switch (m.rateUnit) {
    case "per_kg":
      return m.weightBasis !== "none" && m.unitWeight !== null && m.unitWeight > 0;
    case "per_sheet":
      return (m.sheetLengthM ?? 0) > 0 && (m.sheetWidthM ?? 0) > 0;
    case "per_stock_length":
      return (m.stockLengthM ?? 0) > 0;
    default:
      return true;
  }
}

/** A rate nobody has revisited in `days` is a quotation risk — surfaced as a stale_rate warning. */
export function isStaleRate(m: Material, days = 180): boolean {
  const t = Date.parse(m.effectiveDate);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t > days * 86_400_000;
}
