import { supabase } from "@/integrations/supabase/client";

/**
 * SIGN-OFF DETAILS — the names printed into the CAD sign-off strip on the drawing sheet.
 *
 * ── WHERE THEY LIVE ────────────────────────────────────────────────────────────────────────────
 * Supabase `public.drawing_sign_off` is the SOURCE OF TRUTH: one company-wide row, admin-only RLS,
 * so every authorised login on every device prints the same block. localStorage is only a CACHE and
 * an OFFLINE FALLBACK — it makes the strip render instantly on load, and keeps the tool usable if
 * the network or the table is unavailable. It never overrides a value fetched from the server.
 *
 * ── WHAT IS DELIBERATELY *NOT* STORED ──────────────────────────────────────────────────────────
 * • No signature, no stamp. The "Signature & stamp" box stays an empty ruled box for a real engineer
 *   to sign and stamp. Generating one would fabricate a professional sign-off on a sheet whose sizes
 *   come from an ASSUMED bearing capacity — the exact thing the NOT-FOR-CONSTRUCTION banner prevents.
 * • No date. The issue date defaults to TODAY for each drawing. A shared, remembered date would
 *   quietly print a stale date on tomorrow's sheet, so it is per-drawing and never persisted.
 *
 * Printing the engineer's name and licence approves nothing: the sheet still carries the
 * NOT FOR CONSTRUCTION status until that engineer actually signs and stamps it.
 */

/** The four shared, persisted names. */
export interface SignOffNames {
  designedBy: string;
  checkedBy: string;
  engineerName: string;
  engineerLicence: string;
}

/** What the strip actually renders: the shared names plus the per-drawing date. */
export interface SignOffDetails extends SignOffNames {
  /** Issue date, DD / MM / YYYY. Per-drawing, defaults to today, never persisted. */
  date: string;
}

/** Where a set of names came from — drives the panel's status affordance. */
export type SignOffSource = "team" | "local" | "unsaved";

export const SIGN_OFF_STORAGE_KEY = "poc.labourColony.signOff.v1";

/** Today as DD / MM / YYYY — the format the strip's own hint asks for. */
export function todayDDMMYYYY(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())} / ${pad(d.getMonth() + 1)} / ${d.getFullYear()}`;
}

export function emptySignOff(): SignOffDetails {
  return { designedBy: "", checkedBy: "", engineerName: "", engineerLicence: "", date: "" };
}

/** Coerce field-by-field: a hand-edited row or an older cached payload must never put a non-string on a drawing. */
const str = (v: unknown): string => (typeof v === "string" ? v : "");

// ── localStorage: cache + offline fallback ─────────────────────────────────────────────────────

export function loadLocal(): SignOffNames | null {
  try {
    const raw = window.localStorage.getItem(SIGN_OFF_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Record<keyof SignOffNames, unknown>> | null;
    if (!p || typeof p !== "object") return null;
    return {
      designedBy: str(p.designedBy),
      checkedBy: str(p.checkedBy),
      engineerName: str(p.engineerName),
      engineerLicence: str(p.engineerLicence),
    };
  } catch {
    // Private mode / corrupt JSON — fall back to defaults rather than break the drawing.
    return null;
  }
}

export function saveLocal(names: SignOffNames): void {
  try {
    window.localStorage.setItem(SIGN_OFF_STORAGE_KEY, JSON.stringify(names));
  } catch {
    /* storage unavailable — the names still apply to this session, they just aren't cached. */
  }
}

export function clearLocal(): void {
  try {
    window.localStorage.removeItem(SIGN_OFF_STORAGE_KEY);
  } catch {
    /* no-op */
  }
}

// ── Supabase: the shared source of truth ───────────────────────────────────────────────────────

/** The singleton row's primary key. See supabase/migrations/20260713120000_drawing_sign_off.sql. */
const ROW_ID = 1;

/**
 * Fetch the team's shared names.
 *
 * Returns null on ANY failure (offline, RLS denial, table not migrated yet) so the caller can fall
 * back to the local cache instead of wiping a usable strip. A missing row is not an error — a fresh
 * database simply has nothing to say yet.
 */
export async function fetchTeamSignOff(): Promise<SignOffNames | null> {
  try {
    const { data, error } = await supabase
      .from("drawing_sign_off")
      .select("designed_by, checked_by, engineer_name, engineer_licence")
      .eq("id", ROW_ID)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as Record<string, unknown>;
    return {
      designedBy: str(row.designed_by),
      checkedBy: str(row.checked_by),
      engineerName: str(row.engineer_name),
      engineerLicence: str(row.engineer_licence),
    };
  } catch {
    return null;
  }
}

/**
 * Write the team's shared names. Upsert, so a database whose seed row was never inserted heals
 * itself rather than silently failing to save.
 *
 * Returns true only when the row actually landed. The caller MUST NOT claim "saved to team" on false
 * — it falls back to the local cache and says so, rather than letting someone believe their
 * engineer's name is shared when it is not.
 */
export async function saveTeamSignOff(names: SignOffNames): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("drawing_sign_off").upsert(
      {
        id: ROW_ID,
        designed_by: names.designedBy,
        checked_by: names.checkedBy,
        engineer_name: names.engineerName,
        engineer_licence: names.engineerLicence,
        updated_by: userData?.user?.id ?? null,
      },
      { onConflict: "id" },
    );
    return !error;
  } catch {
    return false;
  }
}
