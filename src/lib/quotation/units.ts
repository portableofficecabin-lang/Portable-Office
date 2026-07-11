/**
 * Length unit system for the Labour Colony calculator.
 *
 * Storage is ALWAYS metres (the engine/BOQ are metric). These helpers convert to/from
 * the user-selected display+entry unit at the UI/drawing edges only.
 *
 * "ftin" (feet & inches) is entered as DECIMAL FEET in input fields (e.g. 10.5) but
 * DISPLAYED as feet-inches (e.g. 10'-6") in labels and the drawing.
 */

export type LengthUnit = "ft" | "ftin" | "m" | "cm" | "mm";

export const LENGTH_UNITS: { id: LengthUnit; label: string; short: string }[] = [
  { id: "ftin", label: "Feet & inches", short: "ft-in" },
  { id: "ft", label: "Feet", short: "ft" },
  { id: "m", label: "Metres", short: "m" },
  { id: "cm", label: "Centimetres", short: "cm" },
  { id: "mm", label: "Millimetres", short: "mm" },
];

const M2FT = 3.280839895;
const round = (n: number, d = 2) => {
  const f = Math.pow(10, d);
  return Math.round((n + Number.EPSILON) * f) / f;
};

/** metres → the numeric value shown/typed in an input for `unit` (ft-in uses decimal feet). */
export function toUnit(m: number, unit: LengthUnit): number {
  switch (unit) {
    case "ft":
    case "ftin": return round(m * M2FT, 2);
    case "cm": return round(m * 100, 1);
    case "mm": return Math.round(m * 1000);
    default: return round(m, 3); // metres
  }
}

/** an input value typed in `unit` → metres (canonical storage). */
export function fromUnit(v: number, unit: LengthUnit): number {
  if (!Number.isFinite(v)) return 0;
  switch (unit) {
    case "ft":
    case "ftin": return v / M2FT;
    case "cm": return v / 100;
    case "mm": return v / 1000;
    default: return v; // metres
  }
}

/** metres → a display string in `unit`: 10'-6" · 10′ · 3.05 m · 305 cm · 3050 mm. */
export function formatLen(m: number, unit: LengthUnit): string {
  switch (unit) {
    case "ftin": {
      const totalIn = Math.round(m * M2FT * 12);
      const sign = totalIn < 0 ? "-" : "";
      const ft = Math.floor(Math.abs(totalIn) / 12);
      const inch = Math.abs(totalIn) % 12;
      return `${sign}${ft}'-${inch}"`;
    }
    case "ft": return `${round(m * M2FT, 1)}′`;
    case "cm": return `${Math.round(m * 100)} cm`;
    case "mm": return `${Math.round(m * 1000)} mm`;
    default: return `${round(m, 2)} m`;
  }
}

/** Short suffix for input labels. ft-in fields take decimal feet, so they read "ft". */
export function unitSuffix(unit: LengthUnit): string {
  return unit === "ftin" || unit === "ft" ? "ft" : unit;
}

/** Numeric-input step appropriate to the unit (so typing feels natural). */
export function unitStep(unit: LengthUnit): number {
  switch (unit) {
    case "mm": return 10;
    case "cm": return 1;
    default: return 0.1; // ft / ftin / m
  }
}

/** metres → whole feet + whole inches, for the two-box "feet & inches" entry. */
export function toFeetInches(m: number): { ft: number; inch: number } {
  const totalIn = Math.round(m * M2FT * 12);
  const sign = totalIn < 0 ? -1 : 1;
  const abs = Math.abs(totalIn);
  return { ft: sign * Math.floor(abs / 12), inch: abs % 12 };
}

/** whole feet + inches (from the two-box entry) → metres. */
export function fromFeetInches(ft: number, inch: number): number {
  const f = Number.isFinite(ft) ? ft : 0;
  const i = Number.isFinite(inch) ? inch : 0;
  return (f * 12 + i) / 12 / M2FT;
}

/** Is this unit entered as feet + inches (two boxes) rather than a single value? */
export function isFeetInches(unit: LengthUnit): boolean {
  return unit === "ftin";
}

/** A concise dimension label with the unit baked in — same as formatLen but exported name-parity. */
export function dim(m: number, unit: LengthUnit): string {
  return formatLen(m, unit);
}
