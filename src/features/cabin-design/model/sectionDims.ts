/**
 * SECTION DIMENSIONS — parse a Material Master steel section into scaled 3D cross-section sizes.
 *
 * The 3D cabin model draws each frame member as a schematic solid bar. To make an ISMC 100×50 read
 * as visibly chunkier than a 40×40 SHS, the bar's cross-section is sized from the section's REAL
 * width × depth (mm) — the same numbers the Material Master and the BOQ price against. Wall thickness
 * (2–6 mm) is far too thin to show as a box dimension on a ~6 m cabin, so a solid bar uses the
 * section's bounding width × depth; the thickness is carried for reference only.
 *
 * Pure: no React, no three.js. The consumer maps `widthMm`/`depthMm` onto the member's two
 * cross-section axes and applies a minimum visual size.
 */

export interface SectionDims {
  /** First profile dimension, mm (e.g. RHS 100×50 → 100; ISMC 100×50 → 100 web). */
  widthMm: number;
  /** Second profile dimension, mm (e.g. RHS 100×50 → 50; square/round → equal to widthMm). */
  depthMm: number;
  /** Wall / leg thickness, mm — reference only, not a box dimension. */
  thicknessMm: number;
}

/** Every run of digits (with optional decimal) in a string. */
function numbersIn(s: string): number[] {
  const out: number[] = [];
  for (const m of s.matchAll(/\d+(?:\.\d+)?/g)) {
    const n = Number(m[0]);
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return out;
}

/**
 * Parse a Material Master `sectionSize` string + `thicknessMm` into {widthMm, depthMm, thicknessMm}.
 * Handles the real catalogue strings: "100 × 50 mm RHS", "50 × 50 mm SHS", "ISMC 100 × 50",
 * "C 75 × 40 mm", "MS Angle 50 × 50 mm", "Pipe OD 48 mm". The first two numbers are the profile
 * dimensions; a single number (round pipe) yields a square-equivalent bounding box.
 *
 * Returns null when no dimension can be read (e.g. a sheet or a blank), so the caller falls back to
 * its cosmetic default rather than drawing a zero-size member.
 */
export function parseSectionDims(
  sectionSize: string | null | undefined,
  thicknessMm: number | null | undefined,
): SectionDims | null {
  if (!sectionSize) return null;
  // Ignore a "N mm" that is clearly the thickness embedded in the string (a 3rd number), by taking
  // only the first two profile numbers.
  const nums = numbersIn(sectionSize);
  if (nums.length === 0) return null;
  const widthMm = nums[0];
  const depthMm = nums.length > 1 ? nums[1] : nums[0];
  const t = typeof thicknessMm === "number" && thicknessMm > 0 ? thicknessMm : 0;
  return { widthMm, depthMm, thicknessMm: t };
}

/**
 * Parse the dims out of a priced BoqLine's `spec` string. `spec` is
 * `"<sectionSize> · <thickness> mm · <grade>"` (see specOf in lib/boq/types), so the section size is
 * the first " · " segment and the thickness is the numeric "N mm" segment. This is how the 3D model
 * reads the LIVE, override-aware section straight from the priced BOQ — the single source of truth.
 */
export function parseSectionFromSpec(spec: string | null | undefined): SectionDims | null {
  if (!spec) return null;
  const parts = spec.split("·").map((p) => p.trim());
  const sectionSize = parts[0] ?? "";
  let thickness: number | null = null;
  for (const p of parts.slice(1)) {
    const m = /^(\d+(?:\.\d+)?)\s*mm$/i.exec(p);
    if (m) { thickness = Number(m[1]); break; }
  }
  return parseSectionDims(sectionSize, thickness);
}
