/**
 * Table module — the ADMIN-CONFIGURABLE CATALOGUE (spec §24).
 *
 * Spec §24: "The admin must be able to add new table types without changing the application code."
 * That means the catalogue cannot live only in TypeScript. It lives in Supabase
 * (`cabin_table_types` + `cabin_table_clearances`), and `TABLE_TYPES` in tableTypes.ts becomes the
 * BUILT-IN FALLBACK and the seed for that table — precisely the pattern `materialMaster.ts` already
 * uses with SEED_MATERIALS.
 *
 * EVERY READ DEGRADES GRACEFULLY. A missing table, an unapplied migration or an offline client
 * falls back to the built-in catalogue and reports `source: "builtin"`, so the calculator keeps
 * working and the admin screen can warn that the catalogue is not persisted yet. (This repo has a
 * history of migrations being committed but never applied — a read that throws would take the whole
 * public homepage calculator down with it.)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

import { DEFAULT_CLEARANCES, type ClearanceRules } from "./tableSchema";
import { TABLE_TYPES, type TableTypeDef } from "./tableTypes";

const TYPES_TABLE = "cabin_table_types";
const CLEARANCE_TABLE = "cabin_table_clearances";

/**
 * src/integrations/supabase/types.ts has NOT been regenerated since
 * 20260714100000_table_customisation_module.sql, so `cabin_table_types` / `cabin_table_clearances`
 * are absent from the generated Database union and `.from()` would reject them. One narrow,
 * documented cast — exactly the convention materialMaster.ts uses for the same reason — and the rest
 * of the module stays typed through TypeRow / TableTypeRecord.
 */
const db = (): SupabaseClient => supabase as unknown as SupabaseClient;

const MIGRATION_HINT =
  "The table catalogue is not in the database yet. Apply " +
  "supabase/migrations/20260714100000_table_customisation_module.sql (Supabase SQL editor or `supabase db push`).";

/** PostgREST codes for "the table/column isn't there" — i.e. the migration has not been applied. */
function isSchemaMissing(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === "42P01" || e.code === "PGRST204" || e.code === "PGRST205") return true;
  const m = (e.message ?? "").toLowerCase();
  return m.includes("does not exist") || m.includes("schema cache");
}

const messageOf = (error: unknown): string => {
  const e = error as { message?: string } | null;
  return e?.message ?? String(error);
};

/* ==========================================================================
 * Row ↔ domain
 * ========================================================================== */

interface TypeRow {
  id?: string;
  key: string;
  label: string;
  short_label: string | null;
  grp: string | null;
  shapes: unknown;
  default_shape: string | null;
  presets: unknown;
  default_support_id: string | null;
  default_material_key: string | null;
  default_accessories: unknown;
  seating_model: string | null;
  panels: unknown;
  symbol: string | null;
  margin_percent: number | null;
  gst_percent: number | null;
  wastage_percent: number | null;
  sort_order: number | null;
  is_active: boolean | null;
  notes: string | null;
}

const asArray = <T,>(v: unknown, fallback: T[]): T[] =>
  Array.isArray(v) ? (v as T[]) : fallback;

export interface TableTypeRecord extends TableTypeDef {
  /** Present only for rows that came from the DB. */
  dbId?: string;
  marginPercent?: number | null;
  gstPercent?: number | null;
  wastagePercent?: number | null;
  sortOrder: number;
  notes?: string;
}

function rowToType(r: TypeRow): TableTypeRecord {
  const builtin = TABLE_TYPES.find((t) => t.id === r.key);
  return {
    id: r.key,
    label: r.label,
    short: r.short_label || builtin?.short || r.label.toUpperCase(),
    group: (r.grp as TableTypeDef["group"]) ?? builtin?.group ?? "Special",
    shapes: asArray(r.shapes, builtin?.shapes ?? ["rectangle"]) as TableTypeDef["shapes"],
    defaultShape: (r.default_shape as TableTypeDef["defaultShape"]) ?? builtin?.defaultShape ?? "rectangle",
    presets: asArray(r.presets, builtin?.presets ?? []) as TableTypeDef["presets"],
    defaultSupportId: r.default_support_id ?? builtin?.defaultSupportId ?? "ms-legs-4",
    defaultMaterialKey: r.default_material_key ?? builtin?.defaultMaterialKey ?? "board-prelam-18",
    defaultAccessories: asArray(r.default_accessories, builtin?.defaultAccessories ?? []),
    seatingModel: (r.seating_model as TableTypeDef["seatingModel"]) ?? builtin?.seatingModel ?? "single",
    panels: asArray(r.panels, builtin?.panels ?? []) as TableTypeDef["panels"],
    symbol: (r.symbol as TableTypeDef["symbol"]) ?? builtin?.symbol ?? "desk",
    isActive: r.is_active ?? true,
    dbId: r.id,
    marginPercent: r.margin_percent,
    gstPercent: r.gst_percent,
    wastagePercent: r.wastage_percent,
    sortOrder: r.sort_order ?? 100,
    notes: r.notes ?? "",
  };
}

export function typeToRow(t: TableTypeRecord): Record<string, unknown> {
  return {
    key: t.id,
    label: t.label,
    short_label: t.short,
    grp: t.group,
    shapes: t.shapes,
    default_shape: t.defaultShape,
    presets: t.presets,
    default_support_id: t.defaultSupportId,
    default_material_key: t.defaultMaterialKey,
    default_accessories: t.defaultAccessories,
    seating_model: t.seatingModel,
    panels: t.panels ?? [],
    symbol: t.symbol ?? "desk",
    margin_percent: t.marginPercent ?? null,
    gst_percent: t.gstPercent ?? null,
    wastage_percent: t.wastagePercent ?? null,
    sort_order: t.sortOrder ?? 100,
    is_active: t.isActive,
    notes: t.notes ?? "",
  };
}

/** The built-in catalogue as records — the fallback, and what "Seed defaults" writes. */
export const BUILTIN_TYPES: TableTypeRecord[] = TABLE_TYPES.map((t, i) => ({
  ...t,
  sortOrder: (i + 1) * 10,
  notes: "",
}));

/* ==========================================================================
 * Reads — never throw
 * ========================================================================== */

export interface CatalogResult {
  types: TableTypeRecord[];
  source: "db" | "builtin";
  error?: string;
}

const builtinResult = (error?: string): CatalogResult => ({
  types: BUILTIN_TYPES.map((t) => ({ ...t })),
  source: "builtin",
  error,
});

/**
 * The catalogue the UI renders. DB rows WIN over built-ins of the same key (that is how an admin
 * retunes "Executive Table"); DB-only rows are brand-new admin types; built-ins the admin has never
 * touched are merged in so a partially-seeded table still offers the full catalogue.
 */
export async function fetchTableTypes(includeInactive = false): Promise<CatalogResult> {
  try {
    const { data, error } = await db()
      .from(TYPES_TABLE)
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      if (isSchemaMissing(error)) return builtinResult(MIGRATION_HINT);
      return builtinResult(messageOf(error));
    }
    if (!data || data.length === 0) return builtinResult();

    const rows = (data as unknown as TypeRow[]).map(rowToType);
    const byKey = new Map<string, TableTypeRecord>();
    for (const b of BUILTIN_TYPES) byKey.set(b.id, { ...b });
    for (const r of rows) byKey.set(r.id, r); // DB wins

    const all = [...byKey.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    return { types: includeInactive ? all : all.filter((t) => t.isActive), source: "db" };
  } catch (e) {
    return builtinResult(messageOf(e));
  }
}

export interface ClearanceResult {
  clearances: ClearanceRules;
  source: "db" | "builtin";
  error?: string;
}

export async function fetchClearances(scope = "default"): Promise<ClearanceResult> {
  try {
    const { data, error } = await db()
      .from(CLEARANCE_TABLE)
      .select("*")
      .eq("scope", scope)
      .maybeSingle();

    if (error) {
      if (isSchemaMissing(error)) return { clearances: { ...DEFAULT_CLEARANCES }, source: "builtin" };
      return { clearances: { ...DEFAULT_CLEARANCES }, source: "builtin", error: messageOf(error) };
    }
    if (!data) return { clearances: { ...DEFAULT_CLEARANCES }, source: "builtin" };

    const r = data as unknown as Record<string, number>;
    const n = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
    return {
      clearances: {
        chairMovementMm: n(r.chair_movement_mm, DEFAULT_CLEARANCES.chairMovementMm),
        walkingPassageMm: n(r.walking_passage_mm, DEFAULT_CLEARANCES.walkingPassageMm),
        mainPassageMm: n(r.main_passage_mm, DEFAULT_CLEARANCES.mainPassageMm),
        tableFromWallMm: n(r.table_from_wall_mm, DEFAULT_CLEARANCES.tableFromWallMm),
        seatedTableFromWallMm: n(r.seated_table_from_wall_mm, DEFAULT_CLEARANCES.seatedTableFromWallMm),
        drawerOpeningMm: n(r.drawer_opening_mm, DEFAULT_CLEARANCES.drawerOpeningMm),
        doorSwingMarginMm: n(r.door_swing_margin_mm, DEFAULT_CLEARANCES.doorSwingMarginMm),
        workstationAisleMm: n(r.workstation_aisle_mm, DEFAULT_CLEARANCES.workstationAisleMm),
      },
      source: "db",
    };
  } catch (e) {
    return { clearances: { ...DEFAULT_CLEARANCES }, source: "builtin", error: messageOf(e) };
  }
}

/* ==========================================================================
 * Writes — admin only (RLS enforces it; these throw a readable error)
 * ========================================================================== */

function writeError(error: unknown): Error {
  return new Error(isSchemaMissing(error) ? MIGRATION_HINT : messageOf(error));
}

export async function upsertTableType(t: TableTypeRecord): Promise<void> {
  const { error } = await db().from(TYPES_TABLE).upsert(typeToRow(t), { onConflict: "key" });
  if (error) throw writeError(error);
}

export async function deleteTableType(key: string): Promise<void> {
  const { error } = await db().from(TYPES_TABLE).delete().eq("key", key);
  if (error) throw writeError(error);
}

export async function saveClearances(c: ClearanceRules, scope = "default"): Promise<void> {
  const { error } = await db().from(CLEARANCE_TABLE).upsert(
    {
      scope,
      chair_movement_mm: Math.round(c.chairMovementMm),
      walking_passage_mm: Math.round(c.walkingPassageMm),
      main_passage_mm: Math.round(c.mainPassageMm),
      table_from_wall_mm: Math.round(c.tableFromWallMm),
      seated_table_from_wall_mm: Math.round(c.seatedTableFromWallMm),
      drawer_opening_mm: Math.round(c.drawerOpeningMm),
      door_swing_margin_mm: Math.round(c.doorSwingMarginMm),
      workstation_aisle_mm: Math.round(c.workstationAisleMm),
    },
    { onConflict: "scope" },
  );
  if (error) throw writeError(error);
}

/** Write the built-in catalogue into an un-seeded table. Existing keys are left alone. */
export async function seedTableTypes(): Promise<number> {
  const { data, error } = await db().from(TYPES_TABLE).select("key");
  if (error) throw writeError(error);

  const existing = new Set(((data ?? []) as unknown as { key: string }[]).map((r) => r.key));
  const missing = BUILTIN_TYPES.filter((t) => !existing.has(t.id));
  if (!missing.length) return 0;

  const { error: insErr } = await db().from(TYPES_TABLE).insert(missing.map(typeToRow));
  if (insErr) throw writeError(insErr);
  return missing.length;
}
