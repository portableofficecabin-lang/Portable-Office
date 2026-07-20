/**
 * LABOUR COLONY ENGINEERING STUDIO — flooring SHEET SETTING-OUT engine.
 *
 * The deck is bought as a priced area (`floor:board`) but it is BUILT as a field of discrete
 * 8 ft × 4 ft sheets. This module is the bridge: given the deck extents and the support lines the
 * frame actually provides, it tiles the deck with real sheets, numbers them in laying sequence,
 * decides which are full and which are cut, and reports the offcut / wastage arithmetic a
 * fabrication team can order against.
 *
 * WHY IT MATTERS STRUCTURALLY — a sheet is only as good as the steel under its EDGES. A 4 ft edge
 * landing mid-bay has no bearing, so it deflects, the joint telegraphs through the finish and the
 * fixing screws work loose. The whole point of the arithmetic below is therefore the CHECK, not the
 * count: every sheet edge must land on a member, with enough of that member's top face either side
 * of the joint for both sheets to bear and be screwed.
 *
 * THE MODULE — the sheet is imperial, so the spacing that supports it is too:
 *     4 ft = 1219.2 mm  ÷ 1 → 1219.2 mm      (sheet spans one bay, edges only)
 *                       ÷ 2 →  609.6 mm  ←   2 ft — the preset (`SPACING_2FT`), edges + centre
 *                       ÷ 3 →  406.4 mm      heavy / storage loading
 *                       ÷ 4 →  304.8 mm      very heavy plant loading
 * Any spacing from that set puts a support under both long edges AND under the intermediate joint
 * lines. A spacing that is NOT a divisor (e.g. a round 600 mm or 1000 mm metric grid) leaves edges
 * floating — the layout still resolves, but it is flagged, because that is an engineering defect the
 * drawing must show rather than hide.
 *
 * NOT A PRICE. This is the SETTING-OUT of the already-priced deck line, never a second purchase. The
 * sheet count is what the site will cut from, and `purchaseSheets` is the honest ordering quantity
 * including wastage — but the priced BOQ remains the source of truth for cost. Parts generated from
 * this layout carry `boqSource: "none"` for exactly that reason.
 *
 * Pure data — no React, no three.js, no DOM. Deterministic for a given input.
 */

/* ------------------------------------------------------------------ the sheet module ---------- */

/** Millimetres in one foot — the sheet, and therefore the framing that carries it, is imperial. */
export const MM_PER_FT = 304.8;

/** 8 ft — the sheet's long dimension. */
export const SHEET_LONG_MM = 8 * MM_PER_FT;   // 2438.4
/** 4 ft — the sheet's short dimension. */
export const SHEET_SHORT_MM = 4 * MM_PER_FT;  // 1219.2

/** The nominal trade description (what the sheet is ordered as). */
export const SHEET_LABEL = `8'×4' (${Math.round(SHEET_LONG_MM / 10) * 10} × ${Math.round(SHEET_SHORT_MM / 10) * 10} mm)`;

/**
 * The support spacings that divide a 4 ft sheet width exactly, widest first. A frame spaced at ANY
 * of these lands steel under every sheet edge and under the intermediate joint lines.
 */
export const MODULAR_SPACINGS_MM: number[] = [1, 2, 3, 4].map((n) => SHEET_SHORT_MM / n);

/** Minimum steel under EACH side of a sheet-to-sheet joint for both sheets to bear and be fixed. */
export const MIN_EDGE_BEARING_MM = 25;

/** A sheet edge is treated as landing on a member when it is within this of the member centreline. */
const EDGE_SNAP_MM = 12;

/* ------------------------------------------------------------------ types ---------------------- */

/** How the sheets are turned relative to the joists (members running across the deck). */
export type SheetOrientation =
  /** 4 ft width crosses the joists — the normal lay: every long edge lands on a joist. */
  | "width-across-joists"
  /** 8 ft length crosses the joists — used when the bay geometry suits it better. */
  | "length-across-joists";

/** One placed sheet in the setting-out, in colony METRES. */
export interface SheetPlacement {
  /** 1-based laying sequence number ("S01"), running row by row from the origin corner. */
  no: number;
  /** Printable mark, e.g. "S07". */
  mark: string;
  /** 0-based row (across the deck) and column (along the deck). */
  row: number;
  col: number;
  x0: number; y0: number; x1: number; y1: number;
  /** Cut size actually laid (mm). Equal to the module for a full sheet. */
  widthMm: number;
  lengthMm: number;
  /** true ⇒ laid as a whole uncut sheet. */
  full: boolean;
  /** Which axis the sheet had to be cut on (null for a full sheet). */
  cutOn: "width" | "length" | "both" | null;
  /** Area of this laid piece (m²). */
  areaM2: number;
  /** Offcut left over from the parent sheet when this piece is a cut one (m²). */
  offcutM2: number;
  /** How many of the four edges land on a support member. */
  supportedEdges: number;
  /** true ⇒ all four edges bear on steel. */
  fullySupported: boolean;
}

/** A support line the frame provides, in colony metres. */
export interface SupportLines {
  /** Positions (m) of members running ACROSS the deck (joists / beams along Y) — support at these X. */
  xs: number[];
  /** Positions (m) of members running ALONG the deck (beams / noggins along X) — support at these Y. */
  ys: number[];
}

/**
 * A member the layout proves must be ADDED because a sheet joint lands with no steel under it.
 *
 * `axis: "x"` ⇒ the line is at a fixed X and the member RUNS ALONG Y (it supports a sheet edge that
 * is parallel to Y). `axis: "y"` ⇒ fixed Y, member runs along X.
 *
 * A bearer is the honest interim fix, not the right answer: a frame on the sheet module needs NONE.
 * `SheetLayoutResult.bearersAvoidableBySpacing` quantifies exactly what re-spacing would save.
 */
export interface RequiredBearer {
  /** Colony metres — the line the member sits on. */
  atM: number;
  axis: "x" | "y";
  /** Sheet joint this supports, for the drawing note. */
  reason: string;
}

/** One pass/fail engineering check the drawing and the report both surface. */
export interface SheetLayoutCheck {
  code: string;
  title: string;
  pass: boolean;
  detail: string;
}

export interface SheetSpacingReport {
  /** The spacing the frame actually has (mm), measured from the support lines. */
  actualMm: number;
  /** Is it a divisor of the sheet dimension crossing it? */
  modular: boolean;
  /** The nearest modular spacing at or below the actual (mm) — what the frame SHOULD use. */
  recommendedMm: number;
  /** 1219.2 / spacing, e.g. 2 for the 2 ft preset. */
  supportsPerSheetWidth: number;
  note: string;
}

export interface SheetLayoutResult {
  moduleLabel: string;
  longMm: number;
  shortMm: number;
  orientation: SheetOrientation;
  /** Every sheet laid, in laying sequence. */
  sheets: SheetPlacement[];
  rows: number;
  cols: number;
  /** Sheets laid whole. */
  fullCount: number;
  /** Sheets that had to be cut to fit the perimeter. */
  cutCount: number;
  /** fullCount + cutCount. */
  laidCount: number;
  /** Deck area being covered (m²). */
  deckAreaM2: number;
  /** Area of one whole sheet (m²). */
  sheetAreaM2: number;
  /** Area actually laid — equals deckAreaM2 for a complete deck (m²). */
  laidAreaM2: number;
  /** Total offcut area generated by the cut sheets (m²). */
  offcutAreaM2: number;
  /** Offcut area big enough to be re-used elsewhere on the deck (m²). */
  reusableOffcutM2: number;
  /** Offcut that cannot be re-used — the real waste (m²). */
  wasteAreaM2: number;
  /**
   * THREE ordering figures, because one number always hides an assumption:
   *   • `sheetsIfNoReuse` — one sheet per laid position. The safe site figure when offcuts are not
   *     tracked and every cut piece comes off a fresh sheet.
   *   • `sheetsByAreaOnly` — the theoretical floor, ceil(deck ÷ sheet). Never achievable in practice.
   *   • `purchaseSheets` — the recommendation: whole sheets recovered from re-usable offcut are
   *     credited back, but only in WHOLE-sheet equivalents, and never below the area floor.
   */
  sheetsIfNoReuse: number;
  sheetsByAreaOnly: number;
  purchaseSheets: number;
  /** (purchaseSheets × sheet area − deck area) ÷ deck area, as a percentage. */
  wastagePct: number;
  /** Spacing analysis of the members crossing the sheet width. */
  spacing: SheetSpacingReport;
  /** Bearing available on each side of a joint landing on a member (mm). */
  edgeBearingMm: number;
  /** Members the layout requires so every joint is supported (both axes). */
  bearers: RequiredBearer[];
  /** How many of those bearers a sheet-modular joist spacing would make unnecessary. */
  bearersAvoidableBySpacing: number;
  /** Sheets still short of full edge support AFTER the bearers are added (should be 0). */
  unsupportedSheets: number;
  /** How many support lines the finished sheet field has in each direction. */
  supportLineCount: { acrossDeck: number; alongDeck: number };
  checks: SheetLayoutCheck[];
}

export interface SheetLayoutInput {
  /** Deck extents in colony metres. */
  x0: number; y0: number; x1: number; y1: number;
  /** The support lines the frame provides. */
  support: SupportLines;
  /** Width of the member top face the sheet edges land on (m) — sets the bearing. */
  memberWidthM: number;
  orientation?: SheetOrientation;
  /** An offcut at least this wide (mm) is treated as re-usable rather than waste. */
  reusableOffcutMinMm?: number;
}

/* ------------------------------------------------------------------ helpers -------------------- */

const r2 = (v: number): number => Math.round(v * 100) / 100;
const r3 = (v: number): number => Math.round(v * 1000) / 1000;
const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

/** Nearest modular spacing at or below `mm` (never above, so the frame is never under-supported). */
export function recommendedSpacingMm(maxSpacingMm: number): number {
  let best = MODULAR_SPACINGS_MM[MODULAR_SPACINGS_MM.length - 1];
  for (const s of MODULAR_SPACINGS_MM) {
    if (s <= maxSpacingMm + 1e-6) { best = s; break; }
  }
  return best;
}

/** True when `sheetDimMm` is a whole number of `spacingMm` bays (so joints land on members). */
export function isModularSpacing(spacingMm: number, sheetDimMm: number, tolMm = 5): boolean {
  if (spacingMm <= 0) return false;
  const bays = sheetDimMm / spacingMm;
  return Math.abs(bays - Math.round(bays)) * spacingMm <= tolMm;
}

/** The median gap between consecutive lines (mm) — robust to one odd end bay. */
function medianGapMm(lines: number[]): number {
  const xs = [...lines].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < xs.length; i++) gaps.push((xs[i] - xs[i - 1]) * 1000);
  if (!gaps.length) return 0;
  gaps.sort((a, b) => a - b);
  const m = Math.floor(gaps.length / 2);
  return gaps.length % 2 ? gaps[m] : (gaps[m - 1] + gaps[m]) / 2;
}

/** Is there a support line within the snap tolerance of `atM`? */
function hasLineAt(lines: number[], atM: number): boolean {
  const tol = EDGE_SNAP_MM / 1000;
  return lines.some((l) => Math.abs(l - atM) <= tol);
}

/* ------------------------------------------------------------------ the layout ----------------- */

/**
 * Tile the deck with 8×4 sheets and report the full setting-out + ordering arithmetic.
 *
 * The sheet's SHORT (4 ft) dimension is laid across the joists by default, because that is the lay
 * that puts a joist under every long edge when the frame is on the 2 ft module — the widest spacing
 * that still gives an intermediate support at the sheet's centre line.
 */
export function buildSheetLayout(input: SheetLayoutInput): SheetLayoutResult {
  const orientation: SheetOrientation = input.orientation ?? "width-across-joists";
  const reusableMin = input.reusableOffcutMinMm ?? 300;

  const deckW = Math.max(0, input.x1 - input.x0);   // along X
  const deckD = Math.max(0, input.y1 - input.y0);   // along Y

  /* Which sheet dimension runs along X, and which along Y. */
  const stepXmm = orientation === "width-across-joists" ? SHEET_SHORT_MM : SHEET_LONG_MM;
  const stepYmm = orientation === "width-across-joists" ? SHEET_LONG_MM : SHEET_SHORT_MM;
  const stepX = stepXmm / 1000;
  const stepY = stepYmm / 1000;

  const cols = Math.max(0, Math.ceil(deckW / stepX - 1e-9));
  const rows = Math.max(0, Math.ceil(deckD / stepY - 1e-9));

  /* ---- spacing analysis: the members crossing the sheet's X dimension --------------------- */
  const actualMm = medianGapMm(input.support.xs);
  const modular = isModularSpacing(actualMm, stepXmm);
  const recommendedMm = recommendedSpacingMm(actualMm > 0 ? actualMm : SHEET_SHORT_MM / 2);
  const spacing: SheetSpacingReport = {
    actualMm: Math.round(actualMm * 10) / 10,
    modular,
    recommendedMm: Math.round(recommendedMm * 10) / 10,
    supportsPerSheetWidth: actualMm > 0 ? Math.round((stepXmm / actualMm) * 100) / 100 : 0,
    note: modular
      ? `${actualMm.toFixed(0)} mm centres divide the ${stepXmm.toFixed(0)} mm sheet dimension exactly `
        + `(${Math.round(stepXmm / actualMm)} bays) — every sheet joint lands on a member.`
      : `${actualMm.toFixed(0)} mm centres do NOT divide the ${stepXmm.toFixed(0)} mm sheet dimension. `
        + `Re-space to ${recommendedMm.toFixed(1)} mm (${Math.round(stepXmm / recommendedMm)} bays per sheet) `
        + `so every sheet joint lands on steel.`,
  };

  /* ---- BEARERS: close every joint the frame does not already support ----------------------- *
   * A sheet joint is a line, not a point, so it is fixed by a LINE of steel. Both axes are checked:
   * the column boundaries (edges parallel to Y, fixed by a member running along Y) and the row
   * boundaries (edges parallel to X, fixed by a member running along X). Interior boundaries only —
   * the deck perimeter is carried by the C-bend edge member, not by a bearer. */
  const bearers: RequiredBearer[] = [];
  const addedXs: number[] = [];
  const addedYs: number[] = [];

  for (let col = 1; col < cols; col++) {
    const x = input.x0 + col * stepX;
    if (x >= input.x1 - 1e-6) continue;
    if (hasLineAt(input.support.xs, x)) continue;
    addedXs.push(x);
    bearers.push({
      atM: r3(x),
      axis: "x",
      reason: `Sheet column ${col}/${col + 1} joint at ${x.toFixed(3)} m has no member under it`,
    });
  }
  for (let row = 1; row < rows; row++) {
    const y = input.y0 + row * stepY;
    if (y >= input.y1 - 1e-6) continue;
    if (hasLineAt(input.support.ys, y)) continue;
    addedYs.push(y);
    bearers.push({
      atM: r3(y),
      axis: "y",
      reason: `Sheet row ${row}/${row + 1} joint at ${y.toFixed(3)} m has no member under it`,
    });
  }

  /* Support as it stands ONCE the bearers are in — this is what the sheets are checked against, so
   * `supportedEdges` describes the deck that will actually be built, not the frame before the fix. */
  const finalXs = [...input.support.xs, ...addedXs];
  const finalYs = [...input.support.ys, ...addedYs];

  /* What a sheet-modular frame would have saved. Re-spacing removes the X-axis bearers entirely
   * (every column boundary would land on a joist); the row bearers depend on the grid, not the
   * joist pitch, so they are not claimed as avoidable. */
  const bearersAvoidableBySpacing = modular ? 0 : addedXs.length;

  /* ---- lay the sheets --------------------------------------------------------------------- */
  const sheets: SheetPlacement[] = [];
  const sheetAreaM2 = (SHEET_LONG_MM / 1000) * (SHEET_SHORT_MM / 1000);
  let no = 0;
  let offcutAreaM2 = 0;
  let reusableOffcutM2 = 0;

  for (let row = 0; row < rows; row++) {
    const y0 = input.y0 + row * stepY;
    const y1 = Math.min(input.y1, y0 + stepY);
    const laidY = y1 - y0;
    for (let col = 0; col < cols; col++) {
      const x0 = input.x0 + col * stepX;
      const x1 = Math.min(input.x1, x0 + stepX);
      const laidX = x1 - x0;
      if (laidX <= 1e-6 || laidY <= 1e-6) continue;

      const cutW = laidX < stepX - 1e-6;
      const cutL = laidY < stepY - 1e-6;
      const cutOn: SheetPlacement["cutOn"] = cutW && cutL ? "both" : cutW ? "width" : cutL ? "length" : null;
      const areaM2 = laidX * laidY;
      const offcut = cutOn ? sheetAreaM2 - areaM2 : 0;
      offcutAreaM2 += offcut;

      /* An offcut is re-usable when its WIDEST leftover strip is still a workable width — one
       * usable strip is enough to justify keeping the piece, even if the other is a sliver. */
      if (offcut > 0) {
        const stripXmm = (stepX - laidX) * 1000;
        const stripYmm = (stepY - laidY) * 1000;
        const widest = Math.max(stripXmm, stripYmm);
        if (widest >= reusableMin) reusableOffcutM2 += offcut;
      }

      /* Edge support, checked against the frame INCLUDING the bearers just added. */
      let supportedEdges = 0;
      if (hasLineAt(finalXs, x0)) supportedEdges++;
      if (hasLineAt(finalXs, x1)) supportedEdges++;
      if (hasLineAt(finalYs, y0)) supportedEdges++;
      if (hasLineAt(finalYs, y1)) supportedEdges++;

      no++;
      sheets.push({
        no,
        mark: `S${pad2(no)}`,
        row,
        col,
        x0: r3(x0), y0: r3(y0), x1: r3(x1), y1: r3(y1),
        widthMm: Math.round(laidX * 1000),
        lengthMm: Math.round(laidY * 1000),
        full: cutOn === null,
        cutOn,
        areaM2: r3(areaM2),
        offcutM2: r3(offcut),
        supportedEdges,
        fullySupported: supportedEdges === 4,
      });
    }
  }

  /* ---- totals ------------------------------------------------------------------------------ *
   * Sheet quantity is reported three ways because a single number always hides an assumption about
   * whether offcuts get re-used. The recommendation credits back only WHOLE-sheet equivalents of
   * re-usable offcut, and never drops below the pure-area floor. */
  const deckAreaM2 = deckW * deckD;
  const laidAreaM2 = sheets.reduce((a, s) => a + s.areaM2, 0);
  const wasteAreaM2 = Math.max(0, offcutAreaM2 - reusableOffcutM2);

  const sheetsIfNoReuse = sheets.length;
  const sheetsByAreaOnly = sheetAreaM2 > 0 ? Math.ceil(deckAreaM2 / sheetAreaM2 - 1e-9) : 0;
  const recovered = sheetAreaM2 > 0 ? Math.floor(reusableOffcutM2 / sheetAreaM2) : 0;
  const purchaseSheets = Math.max(sheetsByAreaOnly, sheetsIfNoReuse - recovered);
  const wastagePct = deckAreaM2 > 0
    ? ((purchaseSheets * sheetAreaM2 - deckAreaM2) / deckAreaM2) * 100
    : 0;

  const fullCount = sheets.filter((s) => s.full).length;
  const cutCount = sheets.length - fullCount;
  const edgeBearingMm = (input.memberWidthM * 1000) / 2;

  /* ---- engineering checks ------------------------------------------------------------------ */
  const unsupportedSheets = sheets.filter((s) => !s.fullySupported).length;
  const addedX = bearers.filter((b) => b.axis === "x").length;
  const addedY = bearers.filter((b) => b.axis === "y").length;
  const checks: SheetLayoutCheck[] = [
    {
      code: "SL-1",
      title: "Support spacing is sheet-modular",
      pass: modular,
      detail: modular
        ? spacing.note
        : `${spacing.note} As drawn this costs ${bearersAvoidableBySpacing} extra bearer line(s) that `
          + `a ${recommendedMm.toFixed(1)} mm frame would not need at all.`,
    },
    {
      code: "SL-2",
      title: "Edge bearing at every sheet joint",
      pass: edgeBearingMm >= MIN_EDGE_BEARING_MM,
      detail: `A joint landing on a ${Math.round(input.memberWidthM * 1000)} mm member gives `
        + `${edgeBearingMm.toFixed(1)} mm bearing to each sheet (minimum ${MIN_EDGE_BEARING_MM} mm). `
        + (edgeBearingMm >= MIN_EDGE_BEARING_MM
          ? "Both sheets bear and can be screwed on their own steel."
          : `Widen the member to at least ${MIN_EDGE_BEARING_MM * 2} mm, or add a cover cleat under the joint.`),
    },
    {
      code: "SL-3",
      title: "Every sheet edge lands on a member",
      pass: unsupportedSheets === 0,
      detail: unsupportedSheets === 0
        ? `All four edges of all ${sheets.length} sheets bear on steel`
          + (bearers.length
            ? ` — achieved by adding ${addedX} longitudinal and ${addedY} transverse bearer line(s) `
              + `to the priced frame.`
            : " using the priced frame alone, with no added members.")
        : `${unsupportedSheets} of ${sheets.length} sheets still have an unsupported edge after `
          + `${bearers.length} bearer line(s) — the deck geometry cannot be closed by bearers alone.`,
    },
    {
      code: "SL-4",
      title: "Sheet wastage within a workable allowance",
      pass: wastagePct <= 10,
      detail: `Order ${purchaseSheets} sheets: ${sheetsIfNoReuse} laid positions less `
        + `${recovered} whole-sheet equivalent(s) recovered from ${reusableOffcutM2.toFixed(2)} m² of `
        + `re-usable offcut (area-only floor ${sheetsByAreaOnly}). That is `
        + `${(purchaseSheets * sheetAreaM2).toFixed(2)} m² bought against a ${deckAreaM2.toFixed(2)} m² `
        + `deck = ${wastagePct.toFixed(1)}% wastage, of which ${wasteAreaM2.toFixed(2)} m² is unusable scrap.`,
    },
  ];

  return {
    moduleLabel: SHEET_LABEL,
    longMm: SHEET_LONG_MM,
    shortMm: SHEET_SHORT_MM,
    orientation,
    sheets,
    rows,
    cols,
    fullCount,
    cutCount,
    laidCount: sheets.length,
    deckAreaM2: r2(deckAreaM2),
    sheetAreaM2: r3(sheetAreaM2),
    laidAreaM2: r2(laidAreaM2),
    offcutAreaM2: r2(offcutAreaM2),
    reusableOffcutM2: r2(reusableOffcutM2),
    wasteAreaM2: r2(wasteAreaM2),
    sheetsIfNoReuse,
    sheetsByAreaOnly,
    purchaseSheets,
    wastagePct: r2(wastagePct),
    spacing,
    edgeBearingMm: Math.round(edgeBearingMm * 10) / 10,
    bearers,
    bearersAvoidableBySpacing,
    unsupportedSheets,
    supportLineCount: {
      acrossDeck: finalXs.length,
      alongDeck: finalYs.length,
    },
    checks,
  };
}
