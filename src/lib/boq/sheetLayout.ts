/**
 * SHEET LAYOUT — row-by-row lapped sheeting (spec §12–§14). Pure: no React, no DOM, no Supabase.
 *
 *   covering rectangle (run × span) + sheet (standard length, cover width, side/end lap)
 *        ──▶ computeSheetLayout() ──▶ rows, sheets/row, full vs cut, overlap, reusable off-cut, scrap
 *
 * This is the precise alternative to the plain area ÷ sheet-area count. It runs ONLY when a sheet
 * material carries the lap properties AND the take-off item carries the rectangle dimensions — so the
 * default path (and the Labour-Colony BOQ, which never sets these) stays byte-identical.
 *
 * The run is the direction sheets are laid end-to-end (a run longer than one sheet needs multiple rows
 * joined with an end-lap); the span is the direction sheets sit side-by-side (each covers coverWidth
 * minus the side-lap). Waste is reported in three honest buckets: OVERLAP (the lap area, necessary and
 * consumed), REUSABLE OFF-CUT (trimmed strips big enough to use elsewhere) and SCRAP (small trim).
 */
import { ceil, round } from "@/lib/boq/types";

const EPS = 1e-9;
/** A trimmed strip at least this wide/long is treated as a reusable off-cut, not scrap. */
const REUSE_THRESHOLD_M = 0.3;

export interface SheetLayoutInput {
  /** Direction sheets run end-to-end (m). */
  runM: number;
  /** Direction sheets sit side-by-side (m). */
  spanM: number;
  /** Standard purchasable sheet length (m). */
  standardLengthM: number;
  /** Overall sheet width before the side-lap deduction (m). */
  coverWidthM: number;
  sideLapM: number;
  endLapM: number;
  /** Faces of covering (1, or 2 for a both-sides partition). */
  faces: number;
}

export interface SheetLayoutResult {
  rows: number;
  sheetsPerRow: number;
  /** Total sheets incl. faces. */
  sheets: number;
  fullSheets: number;
  cutSheets: number;
  /** Area of one standard sheet (m²). */
  sheetAreaSqm: number;
  /** Gross area of all sheets bought (m²). */
  coverageSqm: number;
  /** The actual covered area, run × span × faces (m²). */
  netCoveredSqm: number;
  /** Area consumed by side + end laps (m²) — necessary overlap, not off-cut. */
  overlapSqm: number;
  /** Trimmed strips large enough to reuse (m²). */
  reusableOffcutSqm: number;
  /** Small unrecoverable trim (m²). */
  scrapSqm: number;
  /** Cover width after the side-lap deduction (m). */
  effectiveCoverM: number;
}

/**
 * Returns null when the inputs cannot describe a real layout (any dimension ≤ 0), which is the signal
 * to fall back to the legacy area count.
 */
export function computeSheetLayout(inp: SheetLayoutInput): SheetLayoutResult | null {
  const runM = inp.runM;
  const spanM = inp.spanM;
  const standardLengthM = inp.standardLengthM;
  const coverWidthM = inp.coverWidthM;
  const sideLapM = Math.max(0, inp.sideLapM);
  const endLapM = Math.max(0, inp.endLapM);
  const faces = Math.max(1, Math.round(inp.faces));
  if (runM <= 0 || spanM <= 0 || standardLengthM <= 0 || coverWidthM <= 0) return null;

  const effectiveCoverM = Math.max(0.01, coverWidthM - sideLapM);
  const effectiveLenM = Math.max(0.01, standardLengthM - endLapM);

  const sheetsPerRow = Math.max(1, ceil(spanM / effectiveCoverM));
  const rows = runM <= standardLengthM + EPS ? 1 : 1 + ceil((runM - standardLengthM) / effectiveLenM);

  const sheetsPerFace = rows * sheetsPerRow;
  const sheets = sheetsPerFace * faces;
  const sheetAreaSqm = round(standardLengthM * coverWidthM, 4);
  const coverageSqm = round(sheets * sheetAreaSqm);
  const netCoveredSqm = round(runM * spanM * faces);

  // Lap (overlap) area — necessary material that is consumed in the joints, not cut off.
  const sideLapArea = Math.max(0, sheetsPerRow - 1) * rows * sideLapM * standardLengthM;
  const endLapArea = Math.max(0, rows - 1) * sheetsPerRow * endLapM * coverWidthM;
  const overlapSqm = round((sideLapArea + endLapArea) * faces);

  // Trim: the strips cut off the last column (across the span) and the last row (along the run).
  const spanCovered = sheetsPerRow * effectiveCoverM;
  const runCovered = standardLengthM + Math.max(0, rows - 1) * effectiveLenM;
  const lastColStripW = spanCovered > spanM + EPS ? spanCovered - spanM : 0;
  // The along-run trim applies to a single row too (a 2.5 m run cut from a 3 m sheet) — not only
  // when there are ≥2 rows, or the coverage conservation (net + overlap + reusable + scrap) breaks.
  const lastRowStripL = runCovered > runM + EPS ? runCovered - runM : 0;

  // Total trim is exact by conservation (coverage = net + overlap + trim); split it into reusable vs
  // scrap by the fraction of the trimmed strips whose narrow dimension clears the reuse threshold.
  // Deriving trim this way (rather than summing col+row strips) avoids double-counting the corner.
  const trimSqm = Math.max(0, round(coverageSqm - netCoveredSqm - overlapSqm));
  const colStripArea = lastColStripW * standardLengthM * rows;
  const rowStripArea = lastRowStripL * coverWidthM * sheetsPerRow;
  const reusableEligible =
    (lastColStripW >= REUSE_THRESHOLD_M ? colStripArea : 0) +
    (lastRowStripL >= REUSE_THRESHOLD_M ? rowStripArea : 0);
  const stripTotal = colStripArea + rowStripArea;
  const reusableRatio = stripTotal > 0 ? Math.min(1, reusableEligible / stripTotal) : 0;
  const reusableOffcutSqm = round(trimSqm * reusableRatio);
  const scrapSqm = round(Math.max(0, trimSqm - reusableOffcutSqm));

  // Full vs cut sheets.
  const lastColCut = lastColStripW > EPS;
  const lastRowCut = lastRowStripL > EPS;
  const cutPerFace =
    (lastColCut ? rows : 0) + (lastRowCut ? sheetsPerRow : 0) - (lastColCut && lastRowCut ? 1 : 0);
  const cutSheets = Math.min(sheets, Math.max(0, cutPerFace) * faces);
  const fullSheets = sheets - cutSheets;

  return {
    rows,
    sheetsPerRow,
    sheets,
    fullSheets,
    cutSheets,
    sheetAreaSqm,
    coverageSqm,
    netCoveredSqm,
    overlapSqm,
    reusableOffcutSqm,
    scrapSqm,
    effectiveCoverM,
  };
}

/**
 * Resolve the effective lap parameters for a material — cover width and standard length fall back to
 * the sheet dimensions when not separately specified. Returns null when the material is not configured
 * for lapped layout (no cover width / standard length available), which keeps it on the legacy count.
 */
export function resolveLapConfig(m: {
  coverWidthM?: number | null;
  sideLapM?: number | null;
  endLapM?: number | null;
  standardLengthM?: number | null;
  sheetLengthM: number | null;
  sheetWidthM: number | null;
}): { standardLengthM: number; coverWidthM: number; sideLapM: number; endLapM: number } | null {
  // Lapped layout is opt-in: it activates only when a side-lap or end-lap is set on the material.
  const hasLap = (m.sideLapM ?? 0) > 0 || (m.endLapM ?? 0) > 0;
  if (!hasLap) return null;
  const standardLengthM = m.standardLengthM ?? m.sheetLengthM ?? 0;
  const coverWidthM = m.coverWidthM ?? m.sheetWidthM ?? 0;
  if (standardLengthM <= 0 || coverWidthM <= 0) return null;
  return {
    standardLengthM,
    coverWidthM,
    sideLapM: Math.max(0, m.sideLapM ?? 0),
    endLapM: Math.max(0, m.endLapM ?? 0),
  };
}
