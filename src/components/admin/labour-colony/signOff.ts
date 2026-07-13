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

/** The shared, persisted names. The first four sync to Supabase; `approvedBy` /
 *  `approvedByDesignation` are cached locally (the shared row predates them — extending it needs a
 *  migration, and a failed upsert would break the sync of the original four, so they stay local). */
export interface SignOffNames {
  designedBy: string;
  checkedBy: string;
  engineerName: string;
  engineerLicence: string;
  approvedBy: string;
  approvedByDesignation: string;
}

/** What the strip actually renders: the shared names plus the per-drawing date. */
export interface SignOffDetails extends SignOffNames {
  /** Issue date, DD / MM / YYYY. Per-drawing, defaults to today, never persisted. */
  date: string;
}

/* ── Drawing approval status + revision control ─────────────────────────────────────────────── */

/** The four selectable approval statuses. The watermark, banner and stamp all follow it. */
export type DrawingStatus = "approved" | "disapproved" | "rejected" | "revision";

export interface DrawingStatusMeta {
  id: DrawingStatus;
  label: string;          // select label
  watermark: string;      // diagonal overlay text
  banner: string;         // big banner headline
  subline: string;        // line under the headline
  color: string;          // primary
  colorDark: string;      // border / dark accents
  colorInk: string;       // body ink
  colorSoft: string;      // banner background
}

export const DRAWING_STATUSES: DrawingStatusMeta[] = [
  {
    id: "approved", label: "Approved",
    watermark: "APPROVED", banner: "Approved", subline: "Approved issue — build only to written dimensions",
    color: "#059669", colorDark: "#065f46", colorInk: "#064e3b", colorSoft: "#ecfdf5",
  },
  {
    id: "disapproved", label: "Disapproved",
    watermark: "DISAPPROVED", banner: "Disapproved", subline: "Do not build — returned to the originator",
    color: "#dc2626", colorDark: "#991b1b", colorInk: "#7f1d1d", colorSoft: "#fef2f2",
  },
  {
    id: "rejected", label: "Rejected",
    watermark: "REJECTED", banner: "Rejected", subline: "Issue rejected — this drawing set must not be used",
    color: "#991b1b", colorDark: "#7f1d1d", colorInk: "#7f1d1d", colorSoft: "#fef2f2",
  },
  {
    id: "revision", label: "Modification / Revision required",
    watermark: "MODIFICATION / REVISION REQUIRED", banner: "Modification / Revision required",
    subline: "Revise and resubmit — not to be built from in this state",
    color: "#d97706", colorDark: "#92400e", colorInk: "#78350f", colorSoft: "#fffbeb",
  },
];

export const statusMeta = (s: DrawingStatus): DrawingStatusMeta =>
  DRAWING_STATUSES.find((m) => m.id === s) ?? DRAWING_STATUSES[3];

/** Per-issue revision control block, printed on the stamp. Cached locally so a refresh never loses
 *  it, but deliberately per-browser: a revision belongs to the drawing issue being edited HERE. */
export interface RevisionInfo {
  status: DrawingStatus;
  revNo: string;          // e.g. "R0", "R1"
  revDate: string;        // DD / MM / YYYY
  revDescription: string;
  remarks: string;
}

export const REVISION_STORAGE_KEY = "poc.labourColony.drawingRevision.v1";

export function defaultRevision(): RevisionInfo {
  return { status: "revision", revNo: "R0", revDate: todayDDMMYYYY(), revDescription: "", remarks: "" };
}

export function loadRevision(): RevisionInfo | null {
  try {
    const raw = window.localStorage.getItem(REVISION_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Record<keyof RevisionInfo, unknown>> | null;
    if (!p || typeof p !== "object") return null;
    const st = p.status;
    const status: DrawingStatus =
      st === "approved" || st === "disapproved" || st === "rejected" || st === "revision" ? st : "revision";
    return {
      status,
      revNo: str(p.revNo) || "R0",
      revDate: str(p.revDate) || todayDDMMYYYY(),
      revDescription: str(p.revDescription),
      remarks: str(p.remarks),
    };
  } catch {
    return null;
  }
}

export function saveRevision(rev: RevisionInfo): void {
  try {
    window.localStorage.setItem(REVISION_STORAGE_KEY, JSON.stringify(rev));
  } catch {
    /* storage unavailable — the values still apply to this session. */
  }
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
  return {
    designedBy: "", checkedBy: "", engineerName: "", engineerLicence: "",
    approvedBy: "", approvedByDesignation: "", date: "",
  };
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
      approvedBy: str(p.approvedBy),
      approvedByDesignation: str(p.approvedByDesignation),
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
    // approvedBy / approvedByDesignation are NOT server columns (see SignOffNames) — they come back
    // empty here, so callers must merge the shared four selectively rather than spread the whole
    // object over locally-cached values.
    return {
      designedBy: str(row.designed_by),
      checkedBy: str(row.checked_by),
      engineerName: str(row.engineer_name),
      engineerLicence: str(row.engineer_licence),
      approvedBy: "",
      approvedByDesignation: "",
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
