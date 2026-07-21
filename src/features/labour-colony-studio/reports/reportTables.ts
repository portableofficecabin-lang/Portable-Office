/**
 * LABOUR COLONY STUDIO — report table registry (pure, framework-free).
 *
 * `schedules.ts` produces the typed row arrays a fabrication shop works from. This module is the ONE
 * place that decides, for each of those schedules, how it is presented: column headers, alignment,
 * decimal places, section grouping, which columns subtotal, and which reconciliation remarks must be
 * surfaced. It erases each strongly-typed row array into a common `ReportTable` shape so the UI
 * (ManufacturingReport) and the toolbar (ReportBar) render and export from the SAME definition —
 * a column added here appears in both the on-screen table and the Excel export, never one of the two.
 *
 * NON-NEGOTIABLE, inherited from schedules.ts: nothing here re-prices or re-quantifies. Totals are
 * plain sums of values the builders already read from the priced BoqResult / CivilWorkResult, and a
 * placement-vs-priced difference is ALWAYS carried through to `remarks` — never hidden, never
 * silently reconciled.
 *
 * No React, no three.js, no DOM.
 */

import type { BoqResult } from "@/lib/boq/types";
import type { CivilWorkResult } from "@/lib/quotation/labourColonyCivil";
import type { ColonyModel } from "../model/types";
import { buildSpacingRecommendation } from "../model/sheetLayout";
import {
  buildBeamSchedule,
  buildBoltSchedule,
  buildColumnSchedule,
  buildConnectionSchedule,
  buildCuttingList,
  buildDispatchList,
  buildFloorSheetSchedule,
  buildFootingSchedule,
  buildMemberList,
  buildNutSchedule,
  buildPanelSeatingSchedule,
  buildPlateSchedule,
  buildRailingSchedule,
  buildSheetSummary,
  buildStaircaseSchedule,
  buildTrussSchedule,
  buildWasherSchedule,
  buildWeightSummary,
  buildWeldSchedule,
} from "./schedules";

/* ============================================================ erased table shape ========= */

export type ReportCell = string | number | null;

export type ReportAlign = "left" | "right";

export interface ReportTableSection {
  /** Section heading ("" when the schedule is not grouped). */
  key: string;
  rows: ReportCell[][];
  /** Per-section subtotal row, aligned to the columns; null when the schedule has nothing to total. */
  totals: ReportCell[] | null;
}

export interface ReportTable {
  id: ReportTableId;
  title: string;
  /** Toolbar / picker grouping ("Fabrication", "Connections", "Assemblies", "Substructure", "Deck & panels", "Summary"). */
  group: string;
  /** One-line explanation of what the schedule is and where its numbers come from. */
  note: string;
  headers: string[];
  aligns: ReportAlign[];
  /** Decimal places per column; null for text columns. */
  decimals: (number | null)[];
  sections: ReportTableSection[];
  /** Grand total row, or null when summing across every row would be meaningless. */
  grand: ReportCell[] | null;
  /** Reconciliation / engineering remarks that MUST stay visible. */
  remarks: string[];
  /** Flat, header-keyed rows for `exportToExcel`. */
  excelRows: Record<string, string | number>[];
  /** Suggested Excel file stem. */
  fileStem: string;
  rowCount: number;
  empty: boolean;
  /** Why the schedule is empty (no BOQ loaded, no such member in this colony …). */
  emptyReason: string;
}

export type ReportTableId =
  | "member-list"
  | "cutting-list"
  | "bolt-schedule"
  | "nut-schedule"
  | "washer-schedule"
  | "plate-schedule"
  | "weld-schedule"
  | "connection-schedule"
  | "truss-schedule"
  | "staircase-schedule"
  | "railing-schedule"
  | "footing-schedule"
  | "column-schedule"
  | "beam-schedule"
  | "weight-summary"
  | "dispatch-list"
  | "floor-sheet-schedule"
  | "sheet-summary"
  | "panel-seating-schedule";

/* ============================================================ column definition ========== */

interface ColDef<T> {
  header: string;
  value: (row: T) => ReportCell;
  align?: ReportAlign;
  /** Decimal places for a numeric column. */
  dp?: number;
  /** Subtotal / grand-total this column. */
  sum?: boolean;
  /** Label placed in this column on a totals row (use on the first column only). */
  totalLabel?: string;
}

interface TableSpec<T> {
  id: ReportTableId;
  title: string;
  group: string;
  note: string;
  fileStem: string;
  rows: T[];
  columns: ColDef<T>[];
  /** Section heading for a row; omit for an ungrouped schedule. */
  sectionOf?: (row: T) => string;
  /** Per-row reconciliation remark to surface above the table. */
  remarkOf?: (row: T) => string;
  /** Extra remarks that are not row-derived. */
  extraRemarks?: string[];
  /** Suppress the grand-total row (e.g. when sections deliberately re-count the same weight). */
  noGrand?: boolean;
  /** Explicit grand-total row, overriding the computed sum. */
  grandOverride?: ReportCell[] | null;
  emptyReason?: string;
}

const isNum = (c: ReportCell): c is number => typeof c === "number" && Number.isFinite(c);

/** Sum the summable columns of `cells`, putting `label` in the first column. */
function totalsRow<T>(columns: ColDef<T>[], cells: ReportCell[][], label: string): ReportCell[] | null {
  if (!columns.some((c) => c.sum)) return null;
  return columns.map((col, i) => {
    if (i === 0) return label;
    if (!col.sum) return null;
    let sum = 0;
    let seen = false;
    for (const row of cells) {
      const v = row[i];
      if (isNum(v)) { sum += v; seen = true; }
    }
    return seen ? sum : null;
  });
}

/** Erase a typed schedule into the shared presentation shape. */
function makeTable<T>(spec: TableSpec<T>): ReportTable {
  const { columns, rows } = spec;
  const headers = columns.map((c) => c.header);
  const aligns: ReportAlign[] = columns.map((c) => c.align ?? (c.dp != null ? "right" : "left"));
  const decimals = columns.map((c) => c.dp ?? null);

  const cellsOf = (row: T): ReportCell[] => columns.map((c) => c.value(row));

  // Group into sections, preserving first-seen order.
  const bucket = new Map<string, T[]>();
  for (const row of rows) {
    const key = spec.sectionOf ? spec.sectionOf(row) : "";
    const arr = bucket.get(key);
    if (arr) arr.push(row);
    else bucket.set(key, [row]);
  }

  const sections: ReportTableSection[] = [];
  for (const [key, group] of bucket) {
    const cells = group.map(cellsOf);
    sections.push({
      key,
      rows: cells,
      totals: spec.sectionOf && bucket.size > 1 ? totalsRow(columns, cells, `${key} subtotal`) : null,
    });
  }

  const allCells = rows.map(cellsOf);
  const grand = spec.grandOverride !== undefined
    ? spec.grandOverride
    : spec.noGrand
      ? null
      : totalsRow(columns, allCells, "Grand total");

  const remarks: string[] = [];
  if (spec.remarkOf) {
    for (const row of rows) {
      const r = spec.remarkOf(row).trim();
      if (r && !remarks.includes(r)) remarks.push(r);
    }
  }
  for (const r of spec.extraRemarks ?? []) {
    const t = r.trim();
    if (t && !remarks.includes(t)) remarks.push(t);
  }

  const excelRows: Record<string, string | number>[] = allCells.map((cells) => {
    const out: Record<string, string | number> = {};
    cells.forEach((v, i) => {
      const col = columns[i];
      out[col.header] = v == null ? "" : isNum(v) && col.dp != null ? Number(v.toFixed(col.dp)) : v;
    });
    return out;
  });

  return {
    id: spec.id,
    title: spec.title,
    group: spec.group,
    note: spec.note,
    headers,
    aligns,
    decimals,
    sections,
    grand,
    remarks,
    excelRows,
    fileStem: spec.fileStem,
    rowCount: rows.length,
    empty: rows.length === 0,
    emptyReason: spec.emptyReason ?? "No rows — this colony contains no members of this type.",
  };
}

/* ============================================================ the registry =============== */

const NO_BOQ = "No priced Material BOQ is loaded yet — run the BOQ so quantities and weights can be read from it.";

/**
 * Build every fabrication schedule as a ready-to-render / ready-to-export table.
 * Order is the order the picker and the drawing set present them in.
 */
export function buildReportTables(
  model: ColonyModel,
  boqResult: BoqResult | null,
  civil: CivilWorkResult | null,
): ReportTable[] {
  const hasBoq = !!boqResult && boqResult.lines.length > 0;

  const memberRows = buildMemberList(model, boqResult);
  const cuttingRows = buildCuttingList(model, boqResult);
  const boltRows = buildBoltSchedule(model);
  const nutRows = buildNutSchedule(model);
  const washerRows = buildWasherSchedule(model);
  const plateRows = buildPlateSchedule(model);
  const weldRows = buildWeldSchedule(model);
  const connectionRows = buildConnectionSchedule(model);
  const trussRows = buildTrussSchedule(model, boqResult);
  const stairRows = buildStaircaseSchedule(model, boqResult);
  const railingRows = buildRailingSchedule(model, boqResult);
  const footingRows = buildFootingSchedule(civil);
  const columnRows = buildColumnSchedule(model, boqResult);
  const beamRows = buildBeamSchedule(model, boqResult, civil);
  const dispatchRows = buildDispatchList(model, boqResult);
  const weight = buildWeightSummary(model, boqResult);
  const sheetRows = buildFloorSheetSchedule(model);
  const sheetSummaryRows = buildSheetSummary(model);
  const panelSeatRows = buildPanelSeatingSchedule(model);

  const tables: ReportTable[] = [];

  /* -------------------------------------------------- 1. member list */
  tables.push(makeTable({
    id: "member-list",
    title: "Member list",
    group: "Fabrication",
    note: "Every structural member, rolled up to the priced BOQ line it belongs to. Quantities and weights are read from the BOQ, never recomputed.",
    fileStem: "colony-member-list",
    rows: memberRows,
    sectionOf: (r) => r.kind,
    remarkOf: (r) => (r.remark ? `${r.mark} · ${r.section || r.kind}: ${r.remark}` : ""),
    emptyReason: hasBoq ? "No structural members are placed in the model." : NO_BOQ,
    columns: [
      { header: "Mark", value: (r) => r.mark, totalLabel: "Total" },
      { header: "Kind", value: (r) => r.kind },
      { header: "Description", value: (r) => r.description },
      { header: "Section", value: (r) => r.section || "—" },
      { header: "Grade", value: (r) => r.grade || "—" },
      { header: "Floor", value: (r) => r.floors },
      { header: "Grids", value: (r) => r.gridCount, dp: 0 },
      { header: "Length (m)", value: (r) => r.lengthM, dp: 3 },
      { header: "Placed qty", value: (r) => r.placedQty, dp: 0, sum: true },
      { header: "Priced pcs", value: (r) => r.pricedPieces, dp: 0, sum: true },
      { header: "Unit wt (kg)", value: (r) => r.unitWeightKg, dp: 3 },
      { header: "Total wt (kg)", value: (r) => r.totalWeightKg, dp: 1, sum: true },
      { header: "Source", value: (r) => r.boqSource },
      { header: "Remark", value: (r) => r.remark || "" },
    ],
  }));

  /* -------------------------------------------------- 2. cutting list */
  tables.push(makeTable({
    id: "cutting-list",
    title: "Cutting list",
    group: "Fabrication",
    note: "Section-wise cut lengths × pieces with running length and weight, taken from the priced BOQ line.",
    fileStem: "colony-cutting-list",
    rows: cuttingRows,
    sectionOf: (r) => r.section || "Unclassified",
    remarkOf: (r) => (r.remark ? `${r.section} · ${r.member}: ${r.remark}` : ""),
    emptyReason: hasBoq ? "No priced steel members are placed in the model." : NO_BOQ,
    columns: [
      { header: "Section", value: (r) => r.section || "—" },
      { header: "Grade", value: (r) => r.grade || "—" },
      { header: "Member", value: (r) => r.member },
      { header: "Cut length (m)", value: (r) => r.cutLengthM, dp: 3 },
      { header: "Qty", value: (r) => r.qty, dp: 0, sum: true },
      { header: "Total length (m)", value: (r) => r.totalLengthM, dp: 2, sum: true },
      { header: "Weight (kg)", value: (r) => r.weightKg, dp: 1, sum: true },
      { header: "Drawing ref", value: (r) => r.drawingRef || "—" },
      { header: "Remark", value: (r) => r.remark || "" },
    ],
  }));

  /* -------------------------------------------------- 3. bolt schedule */
  tables.push(makeTable({
    id: "bolt-schedule",
    title: "Bolt schedule",
    group: "Connections",
    note: "Bolts counted per connection group from the drawn model. Connection hardware is engineering detail — the priced take-off does not itemise it.",
    fileStem: "colony-bolt-schedule",
    rows: boltRows,
    sectionOf: (r) => r.boltSpec || "Unspecified",
    remarkOf: (r) => (r.remark ? `${r.connectionId}: ${r.remark}` : ""),
    emptyReason: "No bolted connections are modelled.",
    columns: [
      { header: "Connection", value: (r) => r.connectionId },
      { header: "Grid", value: (r) => r.grid },
      { header: "Bolt spec", value: (r) => r.boltSpec },
      { header: "Dia (mm)", value: (r) => r.diaMm, dp: 0 },
      { header: "Bolts", value: (r) => r.boltCount, dp: 0, sum: true },
      { header: "Fabrication", value: (r) => r.fabrication },
      { header: "Remark", value: (r) => r.remark || "" },
    ],
  }));

  /* -------------------------------------------------- 4. nut schedule */
  tables.push(makeTable({
    id: "nut-schedule",
    title: "Nut schedule",
    group: "Connections",
    note: "One nut per bolt is the default; any mismatch against the bolt count is flagged, never reconciled silently.",
    fileStem: "colony-nut-schedule",
    rows: nutRows,
    sectionOf: (r) => r.nutSpec || "Unspecified",
    remarkOf: (r) => (r.remark ? `${r.connectionId}: nuts do not match — ${r.remark}` : ""),
    emptyReason: "No bolted connections are modelled.",
    columns: [
      { header: "Connection", value: (r) => r.connectionId },
      { header: "Grid", value: (r) => r.grid },
      { header: "Nut spec", value: (r) => r.nutSpec },
      { header: "Dia (mm)", value: (r) => r.diaMm, dp: 0 },
      { header: "Nuts", value: (r) => r.nutCount, dp: 0, sum: true },
      { header: "Remark", value: (r) => r.remark || "" },
    ],
  }));

  /* -------------------------------------------------- 5. washer schedule */
  tables.push(makeTable({
    id: "washer-schedule",
    title: "Washer schedule",
    group: "Connections",
    note: "Washers counted per connection group, cross-checked against the bolt count of the same group.",
    fileStem: "colony-washer-schedule",
    rows: washerRows,
    remarkOf: (r) => (r.remark ? `${r.connectionId}: washers do not match — ${r.remark}` : ""),
    emptyReason: "No bolted connections are modelled.",
    columns: [
      { header: "Connection", value: (r) => r.connectionId },
      { header: "Grid", value: (r) => r.grid },
      { header: "Dia (mm)", value: (r) => r.diaMm, dp: 0 },
      { header: "Washers", value: (r) => r.washerCount, dp: 0, sum: true },
      { header: "Remark", value: (r) => r.remark || "" },
    ],
  }));

  /* -------------------------------------------------- 6. plate schedule */
  tables.push(makeTable({
    id: "plate-schedule",
    title: "Plate schedule",
    group: "Connections",
    note: "Base, levelling, gusset, cleat, end, splice plates and stiffeners.",
    fileStem: "colony-plate-schedule",
    rows: plateRows,
    sectionOf: (r) => r.kind,
    extraRemarks: plateRows.length
      ? ["Plate weights are estimated from the drawn plate geometry — connection plates are un-priced engineering detail and carry no BOQ line."]
      : [],
    emptyReason: "No connection plates are modelled.",
    columns: [
      { header: "Mark", value: (r) => r.mark },
      { header: "Kind", value: (r) => r.kind },
      { header: "Description", value: (r) => r.description },
      { header: "Size L×W×T (mm)", value: (r) => r.sizeMm },
      { header: "Holes", value: (r) => r.holeCount, dp: 0, sum: true },
      { header: "Hole dia (mm)", value: (r) => r.holeDiaMm, dp: 0 },
      { header: "Weld", value: (r) => r.weld || "—" },
      { header: "Fabrication", value: (r) => r.fabrication },
      { header: "Qty", value: (r) => r.qty, dp: 0, sum: true },
      { header: "Unit wt (kg)", value: (r) => r.unitWeightKg, dp: 2 },
      { header: "Total wt (kg)", value: (r) => r.totalWeightKg, dp: 2, sum: true },
    ],
  }));

  /* -------------------------------------------------- 7. weld schedule */
  tables.push(makeTable({
    id: "weld-schedule",
    title: "Weld schedule",
    group: "Connections",
    note: "Welds taken from explicit weld parts and from any member or plate carrying a weld spec.",
    fileStem: "colony-weld-schedule",
    rows: weldRows,
    sectionOf: (r) => r.type,
    emptyReason: "No welds are specified on this model.",
    columns: [
      { header: "Mark", value: (r) => r.mark },
      { header: "Connection", value: (r) => r.connectionId },
      { header: "Type", value: (r) => r.type },
      { header: "Size (mm)", value: (r) => r.sizeMm, dp: 0 },
      { header: "Length (mm)", value: (r) => r.lengthMm, dp: 0, sum: true },
      { header: "Fabrication", value: (r) => r.fabrication },
      { header: "Qty", value: (r) => r.qty, dp: 0, sum: true },
    ],
  }));

  /* -------------------------------------------------- 8. connection schedule */
  tables.push(makeTable({
    id: "connection-schedule",
    title: "Connection schedule",
    group: "Connections",
    note: "One row per connection group: the members joined, the plate marks and the bolt group.",
    fileStem: "colony-connection-schedule",
    rows: connectionRows,
    sectionOf: (r) => r.type,
    emptyReason: "No connection groups are modelled.",
    columns: [
      { header: "Connection", value: (r) => r.connectionId },
      { header: "Type", value: (r) => r.type },
      { header: "Grid", value: (r) => r.grid },
      { header: "Members joined", value: (r) => r.membersJoined },
      { header: "Plate marks", value: (r) => r.plateMarks },
      { header: "Bolt group", value: (r) => r.boltGroup },
      { header: "Fabrication", value: (r) => r.fabrication },
    ],
  }));

  /* -------------------------------------------------- 9. truss schedule */
  tables.push(makeTable({
    id: "truss-schedule",
    title: "Truss schedule",
    group: "Assemblies",
    note: "Roof trusses grouped by assembly, with the priced line weight distributed across the members placed.",
    fileStem: "colony-truss-schedule",
    rows: trussRows,
    emptyReason: hasBoq ? "This colony has no trussed roof assemblies." : NO_BOQ,
    columns: [
      { header: "Mark", value: (r) => r.mark },
      { header: "Assembly", value: (r) => r.assemblyId },
      { header: "Span (m)", value: (r) => r.spanM, dp: 2 },
      { header: "Chords", value: (r) => r.chords, dp: 0, sum: true },
      { header: "Webs", value: (r) => r.webs, dp: 0, sum: true },
      { header: "Members", value: (r) => r.memberCount, dp: 0, sum: true },
      { header: "Weight (kg)", value: (r) => r.weightKg, dp: 1, sum: true },
    ],
  }));

  /* -------------------------------------------------- 10. staircase schedule */
  tables.push(makeTable({
    id: "staircase-schedule",
    title: "Staircase schedule",
    group: "Assemblies",
    note: "Stair assemblies with flights, treads, stringers, landings and handrail posts.",
    fileStem: "colony-staircase-schedule",
    rows: stairRows,
    emptyReason: "This colony is single-storey or has no modelled staircase.",
    columns: [
      { header: "Mark", value: (r) => r.mark },
      { header: "Assembly", value: (r) => r.assemblyId },
      { header: "Flights", value: (r) => r.flights, dp: 0, sum: true },
      { header: "Treads", value: (r) => r.treads, dp: 0, sum: true },
      { header: "Stringers", value: (r) => r.stringers, dp: 0, sum: true },
      { header: "Landings", value: (r) => r.landings, dp: 0, sum: true },
      { header: "Handrail posts", value: (r) => r.handrailPosts, dp: 0, sum: true },
      { header: "Weight (kg)", value: (r) => r.weightKg, dp: 1, sum: true },
    ],
  }));

  /* -------------------------------------------------- 11. railing schedule */
  tables.push(makeTable({
    id: "railing-schedule",
    title: "Railing schedule",
    group: "Assemblies",
    note: "Handrails, posts and toe plates grouped by location (staircase or veranda floor).",
    fileStem: "colony-railing-schedule",
    rows: railingRows,
    emptyReason: "No handrails, posts or toe plates are modelled.",
    columns: [
      { header: "Location", value: (r) => r.location },
      { header: "Posts", value: (r) => r.posts, dp: 0, sum: true },
      { header: "Rails", value: (r) => r.rails, dp: 0, sum: true },
      { header: "Toe plates", value: (r) => r.toePlates, dp: 0, sum: true },
      { header: "Rail length (m)", value: (r) => r.railLengthM, dp: 2, sum: true },
      { header: "Weight (kg)", value: (r) => r.weightKg, dp: 1, sum: true },
    ],
  }));

  /* -------------------------------------------------- 12. footing schedule */
  tables.push(makeTable({
    id: "footing-schedule",
    title: "Footing / foundation schedule",
    group: "Substructure",
    note: "Footing types read directly from the priced civil work result — the substructure source of truth.",
    fileStem: "colony-footing-schedule",
    rows: footingRows,
    remarkOf: (r) => (r.remark ? `${r.mark}: ${r.remark}` : ""),
    emptyReason: "No priced civil work result is loaded — run the civil work calculation to schedule footings.",
    columns: [
      { header: "Mark", value: (r) => r.mark },
      { header: "Type", value: (r) => r.kind },
      { header: "Nos", value: (r) => r.count, dp: 0, sum: true },
      { header: "Size (m)", value: (r) => r.sideM, dp: 2 },
      { header: "Depth (m)", value: (r) => r.depthM, dp: 2 },
      { header: "Concrete each (cum)", value: (r) => r.concreteCumEach, dp: 3 },
      { header: "Concrete total (cum)", value: (r) => r.concreteCumTotal, dp: 2, sum: true },
      { header: "Reinforcement", value: (r) => r.reinforcement },
      { header: "SBC (kN/m²)", value: (r) => r.sbcKnm2, dp: 0 },
      { header: "Bearing (kN/m²)", value: (r) => r.bearingKnm2, dp: 0 },
      { header: "Utilisation (%)", value: (r) => r.utilisationPct, dp: 0 },
      { header: "Adequate", value: (r) => (r.adequate ? "Yes" : "NO") },
      { header: "Remark", value: (r) => r.remark || "" },
    ],
  }));

  /* -------------------------------------------------- 13. column schedule */
  tables.push(makeTable({
    id: "column-schedule",
    title: "Column schedule",
    group: "Fabrication",
    note: "Steel columns typed by section and floor, reconciled against the priced BOQ line.",
    fileStem: "colony-column-schedule",
    rows: columnRows,
    sectionOf: (r) => `Floor ${r.floor}`,
    remarkOf: (r) => (r.remark ? `${r.mark} · ${r.section || "column"}: ${r.remark}` : ""),
    extraRemarks: columnRows.length
      ? ["A column BOQ line spans every storey, so its priced pieces and weight are apportioned across the per-floor rows by placement share — the summable columns add back to the priced line exactly once. The undivided line figures are in the 'Line priced pcs' and 'Line total wt' columns."]
      : [],
    emptyReason: hasBoq ? "No columns are placed in the model." : NO_BOQ,
    columns: [
      { header: "Mark", value: (r) => r.mark },
      { header: "Section", value: (r) => r.section || "—" },
      { header: "Grade", value: (r) => r.grade || "—" },
      { header: "Floor", value: (r) => r.floor },
      { header: "Length (m)", value: (r) => r.lengthM, dp: 3 },
      { header: "Placed qty", value: (r) => r.placedQty, dp: 0, sum: true },
      { header: "Priced pcs (floor)", value: (r) => r.pricedPieces, dp: 0, sum: true },
      { header: "Unit wt (kg)", value: (r) => r.unitWeightKg, dp: 3 },
      { header: "Floor wt (kg)", value: (r) => r.totalWeightKg, dp: 1, sum: true },
      { header: "Line priced pcs", value: (r) => r.linePricedPieces, dp: 0 },
      { header: "Line total wt (kg)", value: (r) => r.lineTotalWeightKg, dp: 1 },
      { header: "Remark", value: (r) => r.remark || "" },
    ],
  }));

  /* -------------------------------------------------- 14. beam schedule */
  tables.push(makeTable({
    id: "beam-schedule",
    title: "Beam schedule",
    group: "Fabrication",
    note: "Steel base, floor and veranda beams from the model + BOQ, plus RCC plinth / tie beams priced by the civil engine.",
    fileStem: "colony-beam-schedule",
    rows: beamRows,
    sectionOf: (r) => (r.type === "RCC" ? "RCC plinth / tie beams" : "Steel beams"),
    emptyReason: hasBoq ? "No beams are placed in the model." : NO_BOQ,
    columns: [
      { header: "Mark", value: (r) => r.mark },
      { header: "Type", value: (r) => r.type },
      { header: "Section", value: (r) => r.section || "—" },
      { header: "Grade", value: (r) => r.grade || "—" },
      { header: "Floor", value: (r) => r.floor },
      { header: "Reinforcement", value: (r) => r.reinforcement || "—" },
      { header: "Length (m)", value: (r) => r.lengthM, dp: 2, sum: true },
      { header: "Placed qty", value: (r) => r.placedQty, dp: 0, sum: true },
      { header: "Weight (kg)", value: (r) => r.weightKg, dp: 1, sum: true },
      { header: "Remark", value: (r) => r.remark || "" },
    ],
  }));

  /* -------------------------------------------------- 15. weight summary */
  interface WeightRow { basis: string; item: string; steelKg: number; sheetingKg: number }
  const weightRows: WeightRow[] = [
    ...weight.byFloor.map((f) => ({ basis: "Floor-wise", item: f.floor, steelKg: f.steelKg, sheetingKg: f.sheetingKg })),
    ...weight.byAssembly.map((a) => ({
      basis: "Assembly-wise", item: `${a.step}. ${a.title}`, steelKg: a.steelKg, sheetingKg: a.sheetingKg,
    })),
  ];
  const weightRemarks: string[] = [weight.remark];
  if (weight.boqSteelKg != null && !weight.reconciled) {
    weightRemarks.push(
      `Model-distributed steel ${weight.modelSteelKg} kg vs priced BOQ steel ${weight.boqSteelKg} kg — difference ${weight.deltaKg} kg. The priced BOQ remains the billed quantity; the difference is a modelling gap, not a price change.`,
    );
  }
  if (weight.sheetingRemark) weightRemarks.push(weight.sheetingRemark);
  tables.push(makeTable({
    id: "weight-summary",
    title: "Weight summary (floor- and assembly-wise)",
    group: "Summary",
    note: "Priced BOQ line weights distributed across the members placed, so both breakdowns add back to the priced tonnage. Steel and sheeting are kept in separate columns — the BOQ's steel total counts steel lines only.",
    fileStem: "colony-weight-summary",
    rows: weightRows,
    sectionOf: (r) => r.basis,
    extraRemarks: weightRemarks,
    // Each basis totals the SAME weight; a grand total across both would double-count it.
    grandOverride: weight.boqSteelKg == null
      ? ["Model weight (distributed)", "", weight.modelSteelKg, weight.modelSheetingKg]
      : [
          "Priced BOQ total",
          weight.reconciled ? "Reconciled" : `Model ${weight.modelSteelKg} kg (Δ ${weight.deltaKg} kg)`,
          weight.boqSteelKg,
          weight.boqSheetingKg,
        ],
    emptyReason: hasBoq ? "No priced steel members are placed in the model." : NO_BOQ,
    columns: [
      { header: "Basis", value: (r) => r.basis },
      { header: "Item", value: (r) => r.item },
      { header: "Steel weight (kg)", value: (r) => r.steelKg, dp: 1, sum: true },
      { header: "Sheeting & finishes (kg)", value: (r) => r.sheetingKg, dp: 1, sum: true },
    ],
  }));

  /* -------------------------------------------------- 16. dispatch list */
  tables.push(makeTable({
    id: "dispatch-list",
    title: "Dispatch packing list",
    group: "Summary",
    note: "Members packed by their erection assembly (falling back to the construction step), with distributed steel weight.",
    fileStem: "colony-dispatch-packing-list",
    rows: dispatchRows,
    emptyReason: hasBoq ? "No shippable members are placed in the model." : NO_BOQ,
    columns: [
      { header: "Package", value: (r) => r.packageId },
      { header: "Description", value: (r) => r.description },
      { header: "Floor", value: (r) => r.floor },
      { header: "Members", value: (r) => r.memberCount, dp: 0, sum: true },
      { header: "Fabrication", value: (r) => r.fabrication },
      { header: "Weight (kg)", value: (r) => r.weightKg, dp: 1, sum: true },
    ],
  }));

  /* -------------------------------------------------- 17-19. deck sheets + panel seating *
   * Setting-out, not procurement. Both schedules describe how an ALREADY-PRICED quantity is cut,
   * laid and held, so every one of them repeats the reconciliation in its remarks — a reader
   * arriving at a sheet count must not read it as a second purchase. */
  const deck = model.deck;
  /* Sheeted deck levels are read back from the placed sheets, not from meta.floors: the 8'×4' field
   * is laid on the UPPER storeys only (the ground floor bears on the filled plinth), so a G+2 colony
   * has 2 sheeted decks, not 3. */
  const deckLevelSet = new Set<number>();
  for (const p of model.parts) if (p.kind === "floor-sheet") deckLevelSet.add(p.floor ?? 0);
  const deckLevels = deckLevelSet.size;
  const NOT_A_PURCHASE =
    "SETTING-OUT, NOT A PURCHASE: this is how the priced floor:board deck area is physically cut and "
    + "laid. The deck sheets carry no BOQ line of their own and the priced board area remains the "
    + "source of truth for cost — the sheet counts here are ordering guidance, never a second line.";
  const failedSheetChecks = (deck?.checks ?? [])
    .filter((c) => !c.pass)
    .map((c) => `${c.code} FAILED — ${c.title}: ${c.detail}`);
  const spacingRemark = deck ? `Joist / bearer spacing: ${deck.spacing.note}` : "";
  /* The company-standard recommendation travels WITH the schedule, because the spacing defect and its
   * fix are the same fact — and the fix is a configuration action the reader can take, not a code
   * change. Stated as advice with a cost: nothing here alters the priced geometry or the saved
   * default (see model/sheetLayout.ts COMPANY_STANDARD_SPACING_MM). */
  const spacingAdvice = deck
    ? (() => {
      const rec = buildSpacingRecommendation(deck);
      return rec.alreadyModular
        ? `Company standard: ${rec.headline}`
        : `Company standard (RECOMMENDATION — nothing changed automatically): ${rec.detail} `
          + `Set it at ${rec.settingPath}.`;
    })()
    : "";

  /* -------------------------------------------------- 17. floor sheet schedule */
  tables.push(makeTable({
    id: "floor-sheet-schedule",
    title: "Flooring sheet schedule",
    group: "Deck & panels",
    note: "Every 8'×4' deck sheet in laying sequence with its cut size, offcut and edge support. The layout is solved once and laid on each UPPER storey — the ground floor bears on the plinth and carries no sheet field — so areas are for ONE deck level.",
    fileStem: "colony-flooring-sheet-schedule",
    rows: sheetRows,
    sectionOf: (r) => (r.full ? "Full sheets" : "Cut sheets"),
    remarkOf: (r) => (r.remark ? `${r.mark}: ${r.remark}` : ""),
    extraRemarks: sheetRows.length
      ? [
          NOT_A_PURCHASE,
          `Area and offcut totals are for ONE deck level (${deck ? deck.deckAreaM2.toFixed(2) : "0"} m²); the identical field is laid on each of the ${deckLevels} UPPER deck level(s) — the ground floor bears on the plinth and takes no sheets. The 'Decks' column totals the physical sheets to be cut across the whole building.`,
          spacingRemark,
          ...failedSheetChecks,
        ]
      : [],
    emptyReason: "This colony has no modelled deck, so there is no flooring sheet setting-out to schedule.",
    columns: [
      { header: "Mark", value: (r) => r.mark },
      { header: "Seq", value: (r) => r.no, dp: 0 },
      { header: "Row", value: (r) => r.row, dp: 0 },
      { header: "Col", value: (r) => r.col, dp: 0 },
      { header: "Size W×L (mm)", value: (r) => r.sizeMm },
      { header: "Full / cut", value: (r) => r.cut },
      { header: "Area (m²)", value: (r) => r.areaM2, dp: 3, sum: true },
      { header: "Offcut (m²)", value: (r) => r.offcutM2, dp: 3, sum: true },
      { header: "Supported edges", value: (r) => `${r.supportedEdges}/4`, align: "right" },
      { header: "Floors", value: (r) => r.floors },
      { header: "Decks", value: (r) => r.deckCount, dp: 0, sum: true },
      { header: "Remark", value: (r) => r.remark || "" },
    ],
  }));

  /* -------------------------------------------------- 18. sheet ordering + check summary */
  tables.push(makeTable({
    id: "sheet-summary",
    title: "Flooring sheet ordering & check summary",
    group: "Deck & panels",
    note: "Sheet quantity reported three ways (no re-use, area-only floor, recommended purchase) with the support spacing, edge bearing, bearer count and every pass/fail layout check behind them.",
    fileStem: "colony-flooring-sheet-summary",
    rows: sheetSummaryRows,
    sectionOf: (r) => r.group,
    extraRemarks: sheetSummaryRows.length
      ? [NOT_A_PURCHASE, spacingRemark, spacingAdvice, ...failedSheetChecks]
      : [],
    emptyReason: "This colony has no modelled deck, so there is no sheet layout to summarise.",
    columns: [
      { header: "Ref", value: (r) => r.code || "" },
      { header: "Item", value: (r) => r.item },
      { header: "Figure", value: (r) => r.figure, align: "right" },
      { header: "Status", value: (r) => r.status || "" },
      { header: "Basis / note", value: (r) => r.detail || "" },
    ],
  }));

  /* -------------------------------------------------- 19. panel seating schedule */
  const panelSpec = model.panelSupport;
  tables.push(makeTable({
    id: "panel-seating-schedule",
    title: "Panel seating & fixing schedule",
    group: "Deck & panels",
    note: "How the configured PUF panel is captured by the MS framework — base track, jamb / closing channel, head restraint and framed pocket — followed by the slot and insertion required at every trade thickness.",
    fileStem: "colony-panel-seating-schedule",
    rows: panelSeatRows,
    sectionOf: (r) => r.group,
    extraRemarks: panelSpec
      ? [
          panelSpec.note,
          `Fixings: ${panelSpec.fixingSpec} at ${panelSpec.fixingPitchMm} mm centres, tightened to ${panelSpec.fixingPitchCornerMm} mm within 300 mm of every corner and opening.`,
          "The seating sections are un-priced engineering detail and carry no BOQ line — panel AREA is priced by the wall / partition lines, which remain the source of truth for cost.",
          "Nothing here is a lookup: the seating geometry is derived from the thickness, so a thickness outside the trade list still produces a buildable, self-consistent detail.",
        ]
      : [],
    emptyReason: "No panel thickness is configured for this colony, so no seating detail can be derived.",
    columns: [
      { header: "Position", value: (r) => r.position },
      { header: "Seat", value: (r) => r.label },
      { header: "Section call-out", value: (r) => r.sectionCall },
      { header: "Panel (mm)", value: (r) => r.thicknessMm, dp: 0 },
      { header: "Slot width (mm)", value: (r) => r.slotWidthMm, dp: 0 },
      { header: "Clearance (mm)", value: (r) => r.clearanceMm, dp: 0 },
      { header: "Leg (mm)", value: (r) => r.legMm, dp: 0 },
      { header: "Min insertion (mm)", value: (r) => r.minInsertionMm, dp: 0 },
      { header: "Gauge (mm)", value: (r) => r.gaugeMm, dp: 1 },
      { header: "Fixing pitch (mm)", value: (r) => r.fixingPitchMm, dp: 0 },
      { header: "Configured", value: (r) => (r.configured ? "Yes" : "") },
      { header: "Role", value: (r) => r.role },
      { header: "Load path", value: (r) => r.loadPath },
    ],
  }));

  return tables;
}

/** Format one cell for on-screen / PDF display (Excel keeps the raw number). */
export function formatCell(value: ReportCell, dp: number | null): string {
  if (value == null || value === "") return "—";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—";
    return dp == null ? String(value) : value.toFixed(dp);
  }
  return value;
}
