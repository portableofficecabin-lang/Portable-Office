/**
 * Table module — unit system.
 *
 * CANONICAL STORAGE IS MILLIMETRES (spec §4). Everything in the table model — dimensions,
 * positions, clearances — is an integer-ish number of millimetres. Conversion happens ONLY at
 * the edges:
 *
 *   • the 2D plan / elevations draw in FEET  (the cabin calculator's unit) → mmToFt()
 *   • the BOQ take-off IR is METRES / SQM / KG (src/lib/boq/types.ts)      → mmToM() / sqmmToSqm()
 *   • the customer types in mm / ft-in / m                                 → fromDisplay()/toDisplay()
 *
 * This mirrors `src/lib/quotation/units.ts` (which is metre-canonical for the Labour Colony
 * calculator) rather than replacing it: that module's storage unit is metres and it is used by a
 * different calculator. Re-using it here would force every table dimension through a lossy
 * mm → m → mm round trip, which is exactly what a 12 mm edge band cannot survive.
 */

/** Units the customer may type dimensions in (spec §4). */
export type TableUnit = "mm" | "cm" | "m" | "ft" | "ftin" | "in";

export const TABLE_UNITS: { id: TableUnit; label: string; short: string }[] = [
  { id: "mm", label: "Millimetres", short: "mm" },
  { id: "cm", label: "Centimetres", short: "cm" },
  { id: "m", label: "Metres", short: "m" },
  { id: "ft", label: "Feet (decimal)", short: "ft" },
  { id: "ftin", label: "Feet & inches", short: "ft-in" },
  { id: "in", label: "Inches", short: "in" },
];

export const MM_PER_FT = 304.8;
export const MM_PER_IN = 25.4;
export const MM_PER_M = 1000;

/* ---------------------------------------------------------------- */
/* Edge conversions — mm → the units other subsystems already speak  */
/* ---------------------------------------------------------------- */

/** mm → feet. The 2D plan and elevations are drawn in feet (`ppf` = px per foot). */
export const mmToFt = (mm: number): number => mm / MM_PER_FT;
/** feet → mm. Used when a drag in the plan (feet) writes back to the model. */
export const ftToMm = (ft: number): number => ft * MM_PER_FT;
/** mm → metres. The BOQ take-off IR is metric (spec: "Canonical units … are METRES"). */
export const mmToM = (mm: number): number => mm / MM_PER_M;
/** mm² → m². Board areas cross into the take-off as sqm. */
export const sqmmToSqm = (sqmm: number): number => sqmm / 1_000_000;

const round = (n: number, d = 2): number => {
  const f = Math.pow(10, d);
  return Math.round((n + Number.EPSILON) * f) / f;
};

/* ---------------------------------------------------------------- */
/* Display conversions — the customer's chosen entry unit            */
/* ---------------------------------------------------------------- */

/** mm → the numeric value shown in an input for `unit`. ft-in inputs take DECIMAL feet. */
export function toDisplay(mm: number, unit: TableUnit): number {
  if (!Number.isFinite(mm)) return 0;
  switch (unit) {
    case "mm": return Math.round(mm);
    case "cm": return round(mm / 10, 1);
    case "m": return round(mm / MM_PER_M, 3);
    case "in": return round(mm / MM_PER_IN, 2);
    case "ft":
    case "ftin": return round(mm / MM_PER_FT, 3);
  }
}

/** A value typed in `unit` → mm (canonical). */
export function fromDisplay(v: number, unit: TableUnit): number {
  if (!Number.isFinite(v)) return 0;
  switch (unit) {
    case "mm": return v;
    case "cm": return v * 10;
    case "m": return v * MM_PER_M;
    case "in": return v * MM_PER_IN;
    case "ft":
    case "ftin": return v * MM_PER_FT;
  }
}

/** mm → a human label in `unit`: 1800 mm · 5.906′ · 5'-11" · 1.8 m. */
export function formatMm(mm: number, unit: TableUnit = "mm"): string {
  if (!Number.isFinite(mm)) return "—";
  switch (unit) {
    case "mm": return `${Math.round(mm)} mm`;
    case "cm": return `${round(mm / 10, 1)} cm`;
    case "m": return `${round(mm / MM_PER_M, 3)} m`;
    case "in": return `${round(mm / MM_PER_IN, 1)}"`;
    case "ft": return `${round(mm / MM_PER_FT, 2)}′`;
    case "ftin": {
      const totalIn = Math.round(mm / MM_PER_IN);
      const sign = totalIn < 0 ? "-" : "";
      const ft = Math.floor(Math.abs(totalIn) / 12);
      const inch = Math.abs(totalIn) % 12;
      return `${sign}${ft}'-${inch}"`;
    }
  }
}

/** Step size that feels natural when typing in `unit`. */
export function unitStep(unit: TableUnit): number {
  switch (unit) {
    case "mm": return 10;
    case "cm": return 1;
    case "in": return 0.5;
    default: return 0.1;
  }
}

/** Short suffix for an input label. ft-in fields take decimal feet, so they read "ft". */
export function unitSuffix(unit: TableUnit): string {
  return unit === "ftin" ? "ft" : unit;
}

/** mm → whole feet + whole inches, for a two-box "feet & inches" entry. */
export function toFeetInches(mm: number): { ft: number; inch: number } {
  const totalIn = Math.round(mm / MM_PER_IN);
  const sign = totalIn < 0 ? -1 : 1;
  const abs = Math.abs(totalIn);
  return { ft: sign * Math.floor(abs / 12), inch: abs % 12 };
}

/** whole feet + inches → mm. */
export function fromFeetInches(ft: number, inch: number): number {
  const f = Number.isFinite(ft) ? ft : 0;
  const i = Number.isFinite(inch) ? inch : 0;
  return f * MM_PER_FT + i * MM_PER_IN;
}

/**
 * The canonical "L × D × H mm" size label used in the quotation, the BOQ description, the
 * drawing label and the furniture schedule — ONE formatter so those four can never disagree.
 * Round tables read "Ø1200 mm", which is what a joiner expects to see.
 */
export function sizeLabel(
  lengthMm: number,
  depthMm: number,
  heightMm: number,
  opts: { round?: boolean; diameterMm?: number } = {},
): string {
  const n = (v: number) => Math.round(v);
  if (opts.round && opts.diameterMm) return `Ø${n(opts.diameterMm)} × ${n(heightMm)} mm`;
  return `${n(lengthMm)} × ${n(depthMm)} × ${n(heightMm)} mm`;
}
