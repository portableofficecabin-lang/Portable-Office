"use client";

/**
 * MATERIAL BOQ PANEL — the pieces every sub-tab shares: label maps, on-screen number formatting,
 * and the two primitives (NumField, Stat) that would otherwise be copy-pasted into five files.
 *
 * TWO RULES LIVE HERE, and they are the reason this file exists rather than being inlined:
 *
 *  1. ON SCREEN, MONEY IS formatINR() — the ₹ glyph is perfectly safe in the DOM. It is banned only
 *     from the jsPDF reports (Latin-1 fonts corrupt the cell), which is why reports.ts has its own
 *     rsPdf(). Do not "unify" the two: they are different media with different constraints.
 *
 *  2. A LINE'S EDITABLE QUANTITY IS NOT ALWAYS ITS BILLED QUANTITY. `BoqOverride.qty` is fed straight
 *     back into the engine, which reads it as PIECES for a steel member, NET AREA (m²) for a covering
 *     and NOS for a counted item — while `line.qty` is the BILLED quantity in the material's uom
 *     (running metres for a per-metre tube, kg for a per-kg one). Typing "30" into a running-metre
 *     column and getting 30 POSTS would be a silent, expensive lie. qtyEditOf() returns the value the
 *     admin is actually editing, its unit, and a hint showing what it bills out as.
 */

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/exportUtils";
import {
  BOQ_SECTIONS,
  type BoqLine,
  type BoqSection,
  type BoqTemplateKind,
  type ChargeLine,
  type QtySource,
  type RateUnit,
  type WeightBasis,
} from "@/lib/boq/types";

/* ==========================================================================
 * Labels
 * ========================================================================== */

export const SECTION_META = Object.fromEntries(BOQ_SECTIONS.map((s) => [s.id, s])) as Record<
  BoqSection,
  (typeof BOQ_SECTIONS)[number]
>;

export const BASIS_LABEL: Record<WeightBasis, string> = {
  kg_per_m: "kg/m",
  kg_per_sqm: "kg/m²",
  kg_per_nos: "kg/nos",
  none: "—",
};

export const RATE_LABEL: Record<RateUnit, string> = {
  per_kg: "/kg",
  per_m: "/m",
  per_sqm: "/m²",
  per_nos: "/nos",
  per_sheet: "/sheet",
  per_stock_length: "/bar",
  per_ltr: "/ltr",
  per_lot: "/lot",
};

export const CHARGE_BASIS_LABEL: Record<ChargeLine["basis"], string> = {
  amount: "Flat ₹",
  per_kg: "₹ / kg of steel",
  per_sqm: "₹ / m² painted",
  percent: "% of material",
};

export const TEMPLATE_KIND_LABEL: Record<BoqTemplateKind, string> = {
  ms_cabin: "MS cabin",
  puf_cabin: "PUF cabin",
  container: "Storage container",
  labour_colony: "Labour colony",
};

export const TEMPLATE_KINDS: BoqTemplateKind[] = ["ms_cabin", "puf_cabin", "container", "labour_colony"];

/** AUTO / MANUAL / LOCKED / ADDED — the chip printed on every detailed-BOQ row. */
export const QTY_SOURCE_BADGE: Record<QtySource, { label: string; className: string; title: string }> = {
  auto: {
    label: "AUTO",
    className: "border-slate-300 bg-slate-100 text-slate-600",
    title: "Quantity derived from the drawing — it re-calculates on every design change.",
  },
  manual: {
    label: "MANUAL",
    className: "border-amber-400 bg-amber-100 text-amber-800",
    title: "Quantity manually overridden. Reset the row to return it to AUTO.",
  },
  locked: {
    label: "LOCKED",
    className: "border-sky-400 bg-sky-100 text-sky-800",
    title: "Quantity frozen — a design change will NOT overwrite it.",
  },
  added: {
    label: "ADDED",
    className: "border-amber-400 bg-amber-100 text-amber-800",
    title: "Admin-added row — no drawing produced it.",
  },
};

/* ==========================================================================
 * On-screen formatting
 * ========================================================================== */

export const money = (n: number | null | undefined): string => (n == null ? "—" : formatINR(n));

export const num = (n: number | null | undefined, d = 2): string =>
  n == null ? "—" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: d }).format(Number(n) || 0);

export const pct = (n: number | null | undefined, d = 1): string => (n == null ? "—" : `${num(n, d)}%`);

export const unitWeightText = (l: BoqLine): string =>
  l.unitWeight == null ? "—" : `${num(l.unitWeight, 3)} ${BASIS_LABEL[l.weightBasis]}`;

export const rateText = (l: BoqLine): string =>
  l.rate == null ? "—" : `${formatINR(l.rate)} ${RATE_LABEL[l.rateUnit]}`;

/** Collision-free id for a manual row / charge line. crypto.randomUUID needs a secure context. */
export const uid = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/* ==========================================================================
 * Line kind + the editable quantity (see rule 2 in the file header)
 * ========================================================================== */

export type LineKind = "steel" | "sheet" | "count";

/**
 * The engine erases the take-off item's `kind` — but it leaves its fingerprints: only a steel line
 * carries a cutLengthM, only a covering carries a netAreaSqm. Recovering the kind from the line means
 * the UI never needs the take-off item, only the priced result.
 */
export const kindOf = (l: BoqLine): LineKind =>
  l.cutLengthM != null ? "steel" : l.netAreaSqm != null ? "sheet" : "count";

export interface QtyEdit {
  /** The number `BoqOverride.qty` must be set to in order to mean "this". */
  value: number;
  /** What that number counts — NOT necessarily line.uom. */
  unit: string;
  /** What it bills out as, when that differs. */
  hint: string | null;
}

export function qtyEditOf(l: BoqLine): QtyEdit {
  switch (kindOf(l)) {
    case "steel":
      return {
        value: l.pieces ?? 0,
        unit: "pcs",
        hint: `${num(l.pieces ?? 0, 0)} × ${num(l.cutLengthM, 3)} m = ${num(l.runningLengthM, 2)} m`,
      };
    case "sheet":
      return {
        value: l.netAreaSqm ?? 0,
        unit: "m²",
        hint:
          (l.deductionSqm ?? 0) > 0
            ? `${num(l.grossAreaSqm, 2)} m² gross − ${num(l.deductionSqm, 2)} m² openings`
            : l.sheets != null && l.sheets > 0
              ? `${l.sheets} sheet${l.sheets === 1 ? "" : "s"} @ ${l.sheetSize ?? "—"}`
              : null,
      };
    default:
      return { value: l.pieces ?? l.qty, unit: "nos", hint: null };
  }
}

/* ==========================================================================
 * Primitives
 * ========================================================================== */

export interface NumFieldProps {
  value: number | null;
  onCommit: (v: number | null) => void;
  /** Empty input commits null instead of reverting. */
  allowEmpty?: boolean;
  placeholder?: string;
  step?: number;
  min?: number;
  disabled?: boolean;
  className?: string;
  title?: string;
  ariaLabel?: string;
}

/**
 * A number input that commits on BLUR / ENTER, never on keystroke.
 *
 * Committing per keystroke would re-price the whole take-off on every digit — and worse, typing "12"
 * would pass through the quantity 1. The local draft also lets the field be emptied mid-edit without
 * the value snapping back under the cursor. Escape reverts.
 */
export function NumField({
  value,
  onCommit,
  allowEmpty = false,
  placeholder,
  step,
  min,
  disabled,
  className,
  title,
  ariaLabel,
}: NumFieldProps) {
  const text = value == null ? "" : String(value);
  const [draft, setDraft] = useState(text);
  const [editing, setEditing] = useState(false);

  // While the field is focused the draft is the source of truth; outside it, the prop is.
  useEffect(() => {
    if (!editing) setDraft(text);
  }, [text, editing]);

  const commit = (raw: string) => {
    const t = raw.trim();
    if (t === "") {
      if (allowEmpty) onCommit(null);
      else setDraft(text);
      return;
    }
    const n = Number(t);
    if (!Number.isFinite(n)) {
      setDraft(text);
      return;
    }
    onCommit(n);
  };

  return (
    <input
      type="number"
      inputMode="decimal"
      value={draft}
      step={step}
      min={min}
      disabled={disabled}
      placeholder={placeholder}
      title={title}
      aria-label={ariaLabel}
      onFocus={() => setEditing(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        setEditing(false);
        commit(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit(e.currentTarget.value);
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          setDraft(text);
          setEditing(false);
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "w-full min-w-[52px] rounded border border-slate-300 bg-white px-1 py-0.5 text-right tabular-nums",
        "outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400",
        "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400",
        className,
      )}
    />
  );
}

/** A summary stat tile. `tone` is the emphasis, not a semantic — grand total is amber, nothing else. */
export function Stat({
  label,
  value,
  sub,
  tone = "plain",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "plain" | "amber" | "slate";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        tone === "amber"
          ? "border-amber-300 bg-amber-50"
          : tone === "slate"
            ? "border-slate-300 bg-slate-50"
            : "border-slate-200 bg-white",
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={cn(
          "mt-1 truncate text-lg font-extrabold tabular-nums leading-tight",
          tone === "amber" ? "text-amber-900" : "text-slate-900",
        )}
        title={value}
      >
        {value}
      </div>
      {sub ? <div className="mt-0.5 truncate text-[10px] text-slate-500">{sub}</div> : null}
    </div>
  );
}

/* ==========================================================================
 * Table cell classes — the BarBendingSchedule house style, in one place
 * ========================================================================== */

export const TH = "border border-slate-300 px-1.5 py-1 align-bottom font-semibold";
export const TD = "border border-slate-300 px-1.5 py-1 align-middle";
export const TD_R = "border border-slate-300 px-1.5 py-1 text-right align-middle tabular-nums";
