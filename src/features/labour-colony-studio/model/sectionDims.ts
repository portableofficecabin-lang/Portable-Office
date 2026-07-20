/**
 * SECTION DIMENSIONS — parse a steel section into scaled 3D cross-section sizes (colony studio).
 *
 * Each frame member draws as a schematic solid bar. To make an ISMC 100×50 read as visibly chunkier
 * than a 40×40 SHS, the bar's cross-section is sized from the section's REAL width × depth (mm) — the
 * SAME numbers the Material Master and the priced BOQ use. Wall thickness (2–6 mm) is far too thin to
 * show as a box dimension on a multi-metre building, so a solid bar uses the bounding width × depth;
 * the thickness is carried for reference only.
 *
 * Pure: no React, no three.js. The consumer maps widthMm / depthMm onto the member's cross-section
 * axes (converting mm → m) and applies a minimum visual size.
 */

/** An MS section as the labour-colony engine models it (`labourColony.ts` MsSection). */
export interface MsSectionLike {
  shape: "SHS" | "RHS" | "ANGLE" | "PIPE" | "C" | "ISMC";
  /** mm. SHS: side; RHS: depth; ANGLE: leg1; PIPE: outer dia; C/ISMC: depth. */
  a: number;
  /** mm. RHS: width; ANGLE: leg2; C/ISMC: flange. Ignored for SHS/PIPE. */
  b: number;
  thicknessMm: number;
  fixedKgM?: number;
}

export interface SectionDims {
  /** First profile dimension, mm. */
  widthMm: number;
  /** Second profile dimension, mm (square / round → equal to widthMm). */
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
 * Handles the real catalogue strings ("100 × 50 mm RHS", "50 × 50 mm SHS", "ISMC 100 × 50",
 * "Pipe OD 48 mm"). The first two numbers are the profile dimensions; a single number (round pipe)
 * yields a square-equivalent bounding box. Returns null when no dimension can be read.
 */
export function parseSectionDims(
  sectionSize: string | null | undefined,
  thicknessMm: number | null | undefined,
): SectionDims | null {
  if (!sectionSize) return null;
  const nums = numbersIn(sectionSize);
  if (nums.length === 0) return null;
  const widthMm = nums[0];
  const depthMm = nums.length > 1 ? nums[1] : nums[0];
  const t = typeof thicknessMm === "number" && thicknessMm > 0 ? thicknessMm : 0;
  return { widthMm, depthMm, thicknessMm: t };
}

/**
 * Parse the dims out of a priced BoqLine's `spec` string. `spec` is built by `specOf` as
 * `"<sectionSize> · <thickness> mm · <grade>"`, so the section size is the first " · " segment and
 * the thickness is the numeric "N mm" segment. This is how the 3D model reads the LIVE, override-aware
 * section straight from the priced BOQ — the single source of truth.
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

/**
 * Adapt the engine's own `MsSection` (labourColony.ts `result.sections.*`) into drawn dims — used as
 * the LAST fallback when a member has no priced BOQ line to read a section from (spec: synthesize via
 * `msSectionToDims` from `result.sections`). The `a`/`b`/`thicknessMm` are already millimetres.
 */
export function msSectionToDims(sec: MsSectionLike | null | undefined): SectionDims | null {
  if (!sec || !(sec.a > 0)) return null;
  const square = sec.shape === "SHS" || sec.shape === "PIPE";
  const widthMm = sec.a;
  const depthMm = square ? sec.a : (sec.b > 0 ? sec.b : sec.a);
  return { widthMm, depthMm, thicknessMm: sec.thicknessMm > 0 ? sec.thicknessMm : 0 };
}

/** Format an MsSection as a human section-size label ("RHS 100 × 50 × 3 mm"). */
export function msSectionLabel(sec: MsSectionLike | null | undefined): string {
  if (!sec) return "";
  const square = sec.shape === "SHS" || sec.shape === "PIPE";
  const dims = square ? `${sec.a}` : `${sec.a} × ${sec.b}`;
  return `${sec.shape} ${dims} × ${sec.thicknessMm} mm`.replace(/\s+/g, " ").trim();
}
