/**
 * Persistence for Labour Colony projects (spec §10) + customer reuse (spec §1).
 *
 * Strategy (matches the repo convention, see MEMORY "DB: migration drift"):
 * localStorage is the always-available source of truth; Supabase is a best-effort
 * mirror. If the `labour_colony_projects` table isn't applied yet, the Supabase
 * calls fail with PGRST205/42P01/PGRST204 and we SILENTLY fall back to local —
 * the module never breaks. Customers are read from the existing `parties` table
 * (the Quotation-Pro client master) and merged with its localStorage client list.
 */

import { supabase } from "@/integrations/supabase/client";
import { type LabourColonyProject } from "./labourColonyProject";

const PROJECTS_KEY = "poc_labour_colony_projects_v2";
const CLIENTS_KEY = "poc_clients_v1"; // shared with QuotationPro
const TABLE = "labour_colony_projects";

export interface ColonyCustomer {
  id: string;
  name: string;
  company?: string;
  mobile: string;
  email?: string;
  city?: string;
  address?: string;
  source: "parties" | "local";
}

/* ---------- schema-drift detection ---------- */
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
export function loadProjectsLocal(): LabourColonyProject[] {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveProjectsLocal(list: LabourColonyProject[]) {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
  } catch {
    /* quota — ignore */
  }
}

/* ---------- flat row mapping ---------- */
function toRow(p: LabourColonyProject) {
  return {
    id: p.id,
    project_number: p.projectNumber ?? null,
    party_id: p.meta.partyId ?? null,
    customer_name: p.meta.customerName || null,
    customer_mobile: p.meta.mobile || null,
    customer_email: p.meta.email || null,
    location: p.meta.location || null,
    workers: p.meta.workers || null,
    floors: p.config.floors ?? null,
    sale_or_rental: p.meta.saleOrRental,
    status: p.meta.status,
    total_sqft: null as number | null,
    total_amount: null as number | null,
    quotation_id: p.quotationId ?? null,
    sales_order_id: p.salesOrderId ?? null,
    enquiry_id: p.enquiryId ?? null,
    data: p as unknown,
    updated_at: p.updatedAt,
  };
}
function fromRow(row: Record<string, unknown>): LabourColonyProject | null {
  const data = row.data as LabourColonyProject | undefined;
  if (data && data.id && data.meta && data.config) return data;
  return null;
}

/* ---------- public API ---------- */
export interface ListResult {
  projects: LabourColonyProject[];
  remoteAvailable: boolean;
}

export async function listProjects(): Promise<ListResult> {
  const local = loadProjectsLocal();
  const byId = new Map<string, LabourColonyProject>();
  for (const p of local) byId.set(p.id, p);

  let remoteAvailable = false;
  try {
    const { data, error } = await (supabase as any).from(TABLE).select("*").order("updated_at", { ascending: false });
    if (error) {
      if (!isSchemaMissing(error)) console.warn("labour_colony_projects load:", error.message);
    } else if (Array.isArray(data)) {
      remoteAvailable = true;
      for (const row of data) {
        const p = fromRow(row);
        if (!p) continue;
        const existing = byId.get(p.id);
        // remote wins if newer
        if (!existing || (p.updatedAt || "") >= (existing.updatedAt || "")) byId.set(p.id, p);
      }
    }
  } catch (e) {
    if (!isSchemaMissing(e)) console.warn("labour_colony_projects load failed:", e);
  }

  const projects = Array.from(byId.values()).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  // keep local cache in sync with the merged view
  saveProjectsLocal(projects);
  return { projects, remoteAvailable };
}

export async function saveProject(p: LabourColonyProject): Promise<{ ok: boolean; remote: boolean }> {
  // local first — always succeeds
  const list = loadProjectsLocal();
  const idx = list.findIndex((x) => x.id === p.id);
  if (idx >= 0) list[idx] = p;
  else list.unshift(p);
  saveProjectsLocal(list);

  let remote = false;
  try {
    const { error } = await (supabase as any).from(TABLE).upsert(toRow(p), { onConflict: "id" });
    if (error) {
      if (!isSchemaMissing(error)) console.warn("labour_colony_projects save:", error.message);
    } else {
      remote = true;
    }
  } catch (e) {
    if (!isSchemaMissing(e)) console.warn("labour_colony_projects save failed:", e);
  }
  return { ok: true, remote };
}

export async function deleteProject(id: string): Promise<void> {
  const list = loadProjectsLocal().filter((x) => x.id !== id);
  saveProjectsLocal(list);
  try {
    const { error } = await (supabase as any).from(TABLE).delete().eq("id", id);
    if (error && !isSchemaMissing(error)) console.warn("labour_colony_projects delete:", error.message);
  } catch (e) {
    if (!isSchemaMissing(e)) console.warn("labour_colony_projects delete failed:", e);
  }
}

/* ---------- customers (reuse existing records) ---------- */
export async function loadCustomers(): Promise<ColonyCustomer[]> {
  const out: ColonyCustomer[] = [];
  const seen = new Set<string>();
  const key = (name: string, phone: string) => `${(name || "").trim().toLowerCase()}|${(phone || "").replace(/\D/g, "").slice(-10)}`;

  // 1) parties table (canonical client master)
  try {
    const { data, error } = await (supabase as any)
      .from("parties")
      .select("id,name,company,email,phone,city,billing_address,party_type,is_active")
      .order("name");
    if (!error && Array.isArray(data)) {
      for (const r of data as Record<string, any>[]) {
        if (r.is_active === false) continue;
        if (r.party_type && !["customer", "both"].includes(r.party_type)) continue;
        const c: ColonyCustomer = {
          id: r.id, name: r.name || "", company: r.company || undefined,
          mobile: r.phone || "", email: r.email || undefined,
          city: r.city || undefined, address: r.billing_address || undefined, source: "parties",
        };
        const k = key(c.name, c.mobile);
        if (!seen.has(k)) { seen.add(k); out.push(c); }
      }
    } else if (error && !isSchemaMissing(error)) {
      console.warn("parties load:", error.message);
    }
  } catch (e) {
    if (!isSchemaMissing(e)) console.warn("parties load failed:", e);
  }

  // 2) QuotationPro localStorage clients
  try {
    const raw = JSON.parse(localStorage.getItem(CLIENTS_KEY) || "[]");
    for (const r of raw as Record<string, any>[]) {
      const name = r.name || r.client_name || r.company || "";
      const mobile = r.phone || r.mobile || r.client_phone || "";
      if (!name && !mobile) continue;
      const k = key(name, mobile);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({
        id: r.id || `local_${k}`, name, company: r.company || undefined, mobile,
        email: r.email || r.client_email || undefined, city: r.city || undefined,
        address: r.address || r.billing_address || undefined, source: "local",
      });
    }
  } catch {
    /* ignore */
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Format an address row into a single readable line. */
function formatAddress(r: Record<string, any>): string {
  return [r.address_line1, r.address_line2, r.city, r.state, r.pincode ? `- ${r.pincode}` : ""]
    .filter(Boolean)
    .join(", ")
    .replace(/, - /, " - ");
}

/**
 * Fetch a customer's default ship-to address from `party_addresses`
 * (falls back to the first address). Returns null if none / table missing.
 */
export async function loadPartyShipTo(partyId: string): Promise<string | null> {
  if (!partyId) return null;
  try {
    const { data, error } = await (supabase as any)
      .from("party_addresses")
      .select("label,contact_person,contact_phone,address_line1,address_line2,city,state,pincode,is_default")
      .eq("party_id", partyId);
    if (error) {
      if (!isSchemaMissing(error)) console.warn("party_addresses load:", error.message);
      return null;
    }
    if (!Array.isArray(data) || data.length === 0) return null;
    const rows = data as Record<string, any>[];
    const chosen = rows.find((r) => r.is_default) ?? rows[0];
    const line = formatAddress(chosen);
    return line || null;
  } catch (e) {
    if (!isSchemaMissing(e)) console.warn("party_addresses load failed:", e);
    return null;
  }
}
