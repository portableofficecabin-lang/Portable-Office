/**
 * Persistence for saved Cabin Designs (drawing/3D upgrade, spec §9).
 *
 * Strategy matches the repo convention (see MEMORY "DB: migration drift"): localStorage is the
 * always-available source of truth; Supabase `cabin_designs` is a best-effort mirror. If the table
 * isn't applied yet the calls fail with PGRST205/42P01/PGRST204 and we SILENTLY fall back to local,
 * so the feature never breaks. The saved record carries the full CabinConfig — the calculator's
 * single source of truth — so re-opening a design restores it exactly and re-drives every drawing,
 * the 3D model and the BOQ.
 */

import { supabase } from "@/integrations/supabase/client";
import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import type { CabinDrawingMeta } from "@/features/cabin-design/model/types";

const DESIGNS_KEY = "poc_cabin_designs_v1";
const TABLE = "cabin_designs";

export interface CabinDesignRecord {
  id: string;
  designNumber?: string;
  createdAt: string;
  updatedAt: string;
  meta: {
    title: string;
    productId: string;
    customerName?: string;
    mobile?: string;
    email?: string;
    partyId?: string;
    status: string;
    totalAmount?: number;
  };
  config: CabinConfig;
  drawingMeta?: CabinDrawingMeta;
}

/* ---------- schema-drift detection (same rule as labourColonyStore) ---------- */
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

/* ---------- localStorage ---------- */
export function loadDesignsLocal(): CabinDesignRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(DESIGNS_KEY) || "[]");
    // Guard against valid-JSON-but-non-array data (e.g. a stray "{}") — otherwise listDesigns'
    // for..of and saveDesign's findIndex would throw and crash the studio on load.
    return Array.isArray(parsed) ? parsed.filter((d) => d && typeof d === "object" && d.id) : [];
  } catch {
    return [];
  }
}
function saveDesignsLocal(list: CabinDesignRecord[]) {
  try {
    localStorage.setItem(DESIGNS_KEY, JSON.stringify(list));
  } catch {
    /* quota — ignore */
  }
}

/* ---------- flat row mapping ---------- */
function toRow(d: CabinDesignRecord) {
  return {
    id: d.id,
    design_number: d.designNumber ?? null,
    party_id: d.meta.partyId ?? null,
    customer_name: d.meta.customerName || null,
    customer_mobile: d.meta.mobile || null,
    customer_email: d.meta.email || null,
    product_id: d.meta.productId || null,
    title: d.meta.title || null,
    length_ft: d.config.length ?? null,
    width_ft: d.config.width ?? null,
    height_ft: d.config.height ?? null,
    total_amount: d.meta.totalAmount ?? null,
    status: d.meta.status || "draft",
    data: d as unknown,
    updated_at: d.updatedAt,
  };
}
function fromRow(row: Record<string, unknown>): CabinDesignRecord | null {
  const data = row.data as CabinDesignRecord | undefined;
  if (data && data.id && data.meta && data.config) {
    // keep the server-assigned design number if the local blob missed it
    if (!data.designNumber && typeof row.design_number === "string") data.designNumber = row.design_number;
    return data;
  }
  return null;
}

/* ---------- id + factory ---------- */
export function newDesignId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* fall through */ }
  return `cd-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/* ---------- public API ---------- */
export interface DesignListResult {
  designs: CabinDesignRecord[];
  remoteAvailable: boolean;
}

export async function listDesigns(): Promise<DesignListResult> {
  const local = loadDesignsLocal();
  const byId = new Map<string, CabinDesignRecord>();
  for (const d of local) byId.set(d.id, d);

  let remoteAvailable = false;
  try {
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => { select: (s: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }> } };
    }).from(TABLE).select("*").order("updated_at", { ascending: false });
    if (error) {
      if (!isSchemaMissing(error)) console.warn("cabin_designs load:", error.message);
    } else if (Array.isArray(data)) {
      remoteAvailable = true;
      for (const row of data as Record<string, unknown>[]) {
        const d = fromRow(row);
        if (!d) continue;
        const existing = byId.get(d.id);
        if (!existing || (d.updatedAt || "") >= (existing.updatedAt || "")) byId.set(d.id, d);
      }
    }
  } catch (e) {
    if (!isSchemaMissing(e)) console.warn("cabin_designs load failed:", e);
  }

  const designs = Array.from(byId.values()).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  saveDesignsLocal(designs);
  return { designs, remoteAvailable };
}

export async function saveDesign(d: CabinDesignRecord): Promise<{ ok: boolean; remote: boolean }> {
  // local first — always succeeds
  const list = loadDesignsLocal();
  const idx = list.findIndex((x) => x.id === d.id);
  if (idx >= 0) list[idx] = d;
  else list.unshift(d);
  saveDesignsLocal(list);

  let remote = false;
  try {
    const { error } = await (supabase as unknown as {
      from: (t: string) => { upsert: (r: unknown, o: { onConflict: string }) => Promise<{ error: { code?: string; message?: string } | null }> };
    }).from(TABLE).upsert(toRow(d), { onConflict: "id" });
    if (error) {
      if (!isSchemaMissing(error)) console.warn("cabin_designs save:", error.message);
    } else {
      remote = true;
    }
  } catch (e) {
    if (!isSchemaMissing(e)) console.warn("cabin_designs save failed:", e);
  }
  return { ok: true, remote };
}

export async function deleteDesign(id: string): Promise<void> {
  const list = loadDesignsLocal().filter((x) => x.id !== id);
  saveDesignsLocal(list);
  try {
    const { error } = await (supabase as unknown as {
      from: (t: string) => { delete: () => { eq: (c: string, v: string) => Promise<{ error: { code?: string; message?: string } | null }> } };
    }).from(TABLE).delete().eq("id", id);
    if (error && !isSchemaMissing(error)) console.warn("cabin_designs delete:", error.message);
  } catch (e) {
    if (!isSchemaMissing(e)) console.warn("cabin_designs delete failed:", e);
  }
}
