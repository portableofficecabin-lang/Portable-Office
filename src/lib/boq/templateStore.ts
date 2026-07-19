/**
 * BOQ PRESET STORE — localStorage-first, Supabase best-effort (spec §1).
 *
 * A drop-in replacement for materialMaster's listTemplates/saveTemplate/deleteTemplate that NEVER
 * throws on a save when the migration is unapplied. It reuses the SAME `boq_templates` table (no new
 * table — that would fork the source of truth), mirrors the cabinDesignStore.ts pattern exactly
 * (localStorage is the always-available truth, the DB is a best-effort mirror, PGRST205/42P01/PGRST204
 * fall back silently), and always surfaces the immutable built-in "Company Standard" presets first.
 *
 * companyDefaultSettingsSync() is the SYNC resolver the new-cabin seed seam calls: it returns the
 * admin's chosen company-default preset when one exists (read from localStorage), otherwise the
 * built-in company standard — so every new cabin auto-applies the company construction method.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultBoqSettings,
  type BoqSettings,
  type BoqTemplateKind,
} from "@/lib/boq/types";
import type { BoqTemplateRecord } from "@/lib/boq/materialMaster";
import {
  BUILTIN_PRESETS,
  companyStandardSettings,
  isBuiltinPresetId,
} from "@/lib/boq/presets";

const PRESETS_KEY = "poc_boq_presets_v1";
const TABLE = "boq_templates";

/** Same narrow, documented cast as materialMaster — the generated types omit boq_templates. */
const db = (): SupabaseClient => supabase as unknown as SupabaseClient;

/* ---------- schema-drift detection (same rule as cabinDesignStore / materialMaster) ---------- */
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

/* ---------- localStorage (never stores the built-ins — those are code constants) ---------- */
function loadLocal(): BoqTemplateRecord[] {
  try {
    if (typeof window === "undefined") return [];
    const parsed = JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((t) => t && typeof t === "object" && t.id && !isBuiltinPresetId(t.id))
      : [];
  } catch {
    return [];
  }
}
function saveLocal(list: BoqTemplateRecord[]) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(PRESETS_KEY, JSON.stringify(list.filter((t) => !isBuiltinPresetId(t.id))));
  } catch {
    /* quota — ignore */
  }
}

/* ---------- row mapping (snake_case mirrors the boq_templates migration) ---------- */
interface TemplateRow {
  id: string;
  name?: string;
  kind?: string;
  description?: string;
  is_default?: boolean;
  data?: Partial<BoqSettings> | null;
  updated_at?: string;
}
function toRow(t: BoqTemplateRecord): Record<string, unknown> {
  return {
    id: t.id,
    name: t.name,
    kind: t.kind,
    description: t.description,
    is_default: t.isDefault,
    data: t.data,
    updated_at: t.updatedAt ?? null,
  };
}
/** A preset saved before a BoqSettings field existed must still load — defaults fill the gaps. */
function fromRow(row: TemplateRow): BoqTemplateRecord | null {
  if (!row || !row.id) return null;
  const kind = (row.kind || "ms_cabin") as BoqTemplateKind;
  return {
    id: row.id,
    name: row.name || "Untitled preset",
    kind,
    description: row.description || "",
    isDefault: row.is_default === true,
    data: { ...defaultBoqSettings(kind), ...(row.data ?? {}), templateKind: kind, templateId: row.id },
    updatedAt: row.updated_at,
  };
}

export function newTemplateId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `bp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/* ---------- sort: built-in/company default first, then alphabetical ---------- */
function sortPresets(list: BoqTemplateRecord[]): BoqTemplateRecord[] {
  return [...list].sort((a, b) =>
    a.isDefault === b.isDefault ? a.name.localeCompare(b.name) : a.isDefault ? -1 : 1,
  );
}

/**
 * If the admin has set their OWN preset as company default for a kind, the built-in should not also
 * read as default. Demote the built-in copy (returning a fresh object — the constant is immutable).
 */
function reconcileDefaults(list: BoqTemplateRecord[]): BoqTemplateRecord[] {
  const userDefaultKinds = new Set(
    list.filter((t) => t.isDefault && !isBuiltinPresetId(t.id)).map((t) => t.kind),
  );
  return list.map((t) =>
    isBuiltinPresetId(t.id) && t.isDefault && userDefaultKinds.has(t.kind) ? { ...t, isDefault: false } : t,
  );
}

/* ---------- public API (signature-compatible with materialMaster's) ---------- */
export async function listTemplates(kind?: BoqTemplateKind): Promise<BoqTemplateRecord[]> {
  const byId = new Map<string, BoqTemplateRecord>();
  for (const b of BUILTIN_PRESETS) if (!kind || b.kind === kind) byId.set(b.id, b);
  for (const t of loadLocal()) if (!kind || t.kind === kind) byId.set(t.id, t);

  try {
    let q = db().from(TABLE).select("*");
    if (kind) q = q.eq("kind", kind);
    const { data, error } = await q.order("updated_at", { ascending: false });
    if (error) {
      if (!isSchemaMissing(error)) console.warn("boq_templates load:", error.message);
    } else if (Array.isArray(data)) {
      for (const row of data as TemplateRow[]) {
        const t = fromRow(row);
        if (!t || (kind && t.kind !== kind)) continue;
        const ex = byId.get(t.id);
        if (!ex || (t.updatedAt || "") >= (ex.updatedAt || "")) byId.set(t.id, t);
      }
    }
  } catch (e) {
    if (!isSchemaMissing(e)) console.warn("boq_templates load failed:", e);
  }

  const all = Array.from(byId.values());
  saveLocal(all); // cache the DB rows locally (built-ins filtered out inside saveLocal)
  return sortPresets(reconcileDefaults(all));
}

/**
 * Save (insert or update) a preset. Local-first ⇒ ALWAYS succeeds, so an unapplied migration never
 * loses the admin's work. The DB mirror is best-effort. Promoting to default demotes the incumbent of
 * the same kind, both locally and (best-effort) in the DB partial-unique-index table.
 */
export async function saveTemplate(
  t: Omit<BoqTemplateRecord, "id"> & { id?: string },
): Promise<BoqTemplateRecord> {
  const rec: BoqTemplateRecord = {
    id: t.id && !isBuiltinPresetId(t.id) ? t.id : newTemplateId(),
    name: t.name,
    kind: t.kind,
    description: t.description,
    isDefault: !!t.isDefault,
    data: t.data,
    updatedAt: nowIso(),
  };

  let list = loadLocal();
  if (rec.isDefault) list = list.map((x) => (x.kind === rec.kind && x.id !== rec.id ? { ...x, isDefault: false } : x));
  const idx = list.findIndex((x) => x.id === rec.id);
  if (idx >= 0) list[idx] = rec;
  else list.unshift(rec);
  saveLocal(list);

  try {
    if (rec.isDefault) {
      await db().from(TABLE).update({ is_default: false }).eq("kind", rec.kind).neq("id", rec.id);
    }
    const { error } = await db().from(TABLE).upsert(toRow(rec), { onConflict: "id" });
    if (error && !isSchemaMissing(error)) console.warn("boq_templates save:", error.message);
  } catch (e) {
    if (!isSchemaMissing(e)) console.warn("boq_templates save failed:", e);
  }
  return rec;
}

export async function deleteTemplate(id: string): Promise<void> {
  if (isBuiltinPresetId(id)) return; // built-ins are immutable
  saveLocal(loadLocal().filter((x) => x.id !== id));
  try {
    const { error } = await db().from(TABLE).delete().eq("id", id);
    if (error && !isSchemaMissing(error)) console.warn("boq_templates delete:", error.message);
  } catch (e) {
    if (!isSchemaMissing(e)) console.warn("boq_templates delete failed:", e);
  }
}

/**
 * SYNC company-default resolver for the new-cabin seed seam. Returns the admin's chosen default
 * preset's settings when one is stored, else the built-in company standard for the kind. Reads
 * localStorage synchronously (the seed runs in a client-only admin island), so a new cabin picks up
 * the company construction method the moment it is created — no async, no flash of the code default.
 */
export function companyDefaultSettingsSync(kind: BoqTemplateKind): BoqSettings {
  try {
    const local = loadLocal();
    const userDefault = local.find((t) => t.kind === kind && t.isDefault);
    if (userDefault) return { ...userDefault.data, templateKind: kind, templateId: userDefault.id };
  } catch {
    /* fall through to the built-in */
  }
  return companyStandardSettings(kind);
}

/** Non-throwing "now" for updatedAt; avoids Date in unusual environments. */
function nowIso(): string {
  try {
    return new Date().toISOString();
  } catch {
    return "";
  }
}
