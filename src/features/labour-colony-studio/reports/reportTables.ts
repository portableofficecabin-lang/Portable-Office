/**
 * LABOUR COLONY STUDIO — report table registry (pure, framework-free).
 *
 * `schedules.ts` (and, for the PUF panel bottom locking system, `pufLockSchedules.ts`) produces the
 * typed row arrays a fabrication shop works from. This module is the ONE
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

import type { BoqResult, MaterialIndex } from "@/lib/boq/types";
import type { CivilWorkResult } from "@/lib/quotation/labourColonyCivil";
import type { ColonyModel } from "../model/types";
import { PUF_LOCK_EXPLANATION } from "../model/pufLock";
import {
  buildPufLockAnchorSchedule,
  buildPufLockOrderingSummary,
  buildPufLockPanelSchedule,
  buildPufLockPlateSchedule,
  buildPufLockPurlinSchedule,
  buildPufLockWeldSchedule,
  type RateSource,
} from "./pufLockSchedules";
import {
  buildBeamSchedule,
  buildBoltSchedule,
  buildColumnSchedule,
  buildConnectionSchedule,
  buildCuttingList,
  buildDispatchList,
  buildFootingSchedule,
  buildMemberList,
  buildNutSchedule,
  buildPlateSchedule,
  buildRailingSchedule,
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
  /** Toolbar / picker grouping ("Fabrication", "Connections", "Assemblies", "Substructure", "Summary", "PUF Lock"). */
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
  | "puf-lock-plate-schedule"
  | "puf-lock-anchor-schedule"
  | "puf-lock-purlin-schedule"
  | "puf-lock-weld-schedule"
  | "puf-lock-panel-schedule"
  | "puf-lock-ordering-summary";

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

/** Rate / amount columns are blank whenever no priced material backs a PUF-lock line. */
const NO_RATES =
  "No Material Master rate resolves for these items, so the Rate and Amount columns are left blank "
  + "rather than assumed. Link the material keys in the Material Master (or set a per-project rate "
  + "override) to price this schedule.";

/** True when the schedule has rows but not one of them resolved a rate. */
function allUnpriced(rows: { rateSource: RateSource }[]): boolean {
  return rows.length > 0 && rows.every((r) => r.rateSource === "none");
}

/** Pass / warning / error tally for the PUF-lock panel pocket schedule, stated up front. */
function pufPanelStatusRemark(rows: { status: "Pass" | "Warning" | "Error" }[]): string {
  const pass = rows.filter((r) => r.status === "Pass").length;
  const warn = rows.filter((r) => r.status === "Warning").length;
  const err = rows.filter((r) => r.status === "Error").length;
  return `Panel pocket check: ${pass} of ${rows.length} pass, ${warn} warning${warn === 1 ? "" : "s"}, `
    + `${err} error${err === 1 ? "" : "s"}.`
    + (err > 0 ? " An error means the connection as configured cannot be built — resolve it before fabrication." : "");
}

/**
 * Build every fabrication schedule as a ready-to-render / ready-to-export table.
 * Order is the order the picker and the drawing set present them in.
 *
 * `materials` is optional: the PUF-lock schedules resolve their rates through the Material Master
 * when one is supplied, and leave the money columns blank when it is not. Every existing caller keeps
 * working unchanged.
 */
export function buildReportTables(
  model: ColonyModel,
  boqResult: BoqResult | null,
  civil: CivilWorkResult | null,
  materials?: MaterialIndex | null,
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

  /* The PUF panel bottom locking system, read from the ONE bundle the model geometry was built from.
     Nothing here re-derives a pocket width, a piece count or a weight — see model/pufLock.ts. */
  const puf = model.pufLock ?? null;
  const pufPlateRows = puf ? buildPufLockPlateSchedule(puf, materials) : [];
  const pufAnchorRows = puf ? buildPufLockAnchorSchedule(puf, materials) : [];
  const pufPurlinRows = puf ? buildPufLockPurlinSchedule(puf, materials) : [];
  const pufWeldRows = puf ? buildPufLockWeldSchedule(puf) : [];
  const pufPanelRows = puf ? buildPufLockPanelSchedule(puf) : [];
  const pufOrderingRows = puf ? buildPufLockOrderingSummary(puf, materials) : [];

  /** Why a PUF-lock schedule came back empty — the three states are genuinely different. */
  const pufEmpty = !puf
    ? "The PUF panel bottom locking system has not been resolved for this model — rebuild the colony model to schedule it."
    : !puf.config.enabled
      ? "The PUF panel bottom locking system is switched off for this project."
      : "The PUF panel bottom locking system is on but no locking plates are placed — set the plate layout in the PUF lock editor.";

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

  /* ==================================================================== PUF panel bottom lock ===
   * Six fabrication schedules for the PUF panel bottom locking system. Every figure below is read
   * from `model.pufLock` — the same resolved bundle the 3D geometry, the detail sheets and the
   * exploded view were built from — so a schedule can never disagree with the drawing.
   */

  /* -------------------------------------------------- 17. PUF lock — base plate schedule */
  tables.push(makeTable({
    id: "puf-lock-plate-schedule",
    title: "PUF lock — base plate schedule",
    group: "PUF Lock",
    note: "One MS base / anchor plate per locking assembly, set out from the nearest gridline on its plinth-beam run. Sizes, weights and rates come from the resolved PUF-lock configuration.",
    fileStem: "colony-puf-lock-plate-schedule",
    rows: pufPlateRows,
    extraRemarks: allUnpriced(pufPlateRows) ? [NO_RATES] : [],
    emptyReason: pufEmpty,
    columns: [
      { header: "Mark", value: (r) => r.mark, totalLabel: "Total" },
      { header: "Plate mark", value: (r) => r.plateMark },
      { header: "Assembly", value: (r) => r.assemblyMark },
      { header: "Grid ref", value: (r) => r.gridRef },
      { header: "Offset (mm)", value: (r) => r.offsetMm, dp: 0 },
      { header: "Host beam", value: (r) => r.hostBeam },
      { header: "Size L×W (mm)", value: (r) => r.sizeMm },
      { header: "Thickness (mm)", value: (r) => r.thicknessMm, dp: 0 },
      { header: "Grade", value: (r) => r.grade },
      { header: "Holes", value: (r) => r.holeCount, dp: 0, sum: true },
      { header: "Hole dia (mm)", value: (r) => r.holeDiaMm, dp: 0 },
      { header: "Unit wt (kg)", value: (r) => r.unitWeightKg, dp: 3 },
      { header: "Qty", value: (r) => r.quantity, dp: 0, sum: true },
      { header: "Total wt (kg)", value: (r) => r.totalWeightKg, dp: 3, sum: true },
      { header: "Rate (₹)", value: (r) => r.rate, dp: 2 },
      { header: "Amount (₹)", value: (r) => r.amount, dp: 2, sum: true },
      { header: "Rate source", value: (r) => r.rateSource },
      { header: "Layout source", value: (r) => r.source },
    ],
  }));

  /* -------------------------------------------------- 18. PUF lock — anchor bolt schedule */
  tables.push(makeTable({
    id: "puf-lock-anchor-schedule",
    title: "PUF lock — anchor bolt schedule",
    group: "PUF Lock",
    note: "The holding-down assembly fixing each base plate to the RCC plinth beam: bolts, nuts and washers per plate, with embedment and tightening requirement.",
    fileStem: "colony-puf-lock-anchor-schedule",
    rows: pufAnchorRows,
    extraRemarks: [
      ...(pufAnchorRows[0]?.tighteningNote ? [pufAnchorRows[0].tighteningNote] : []),
      ...(allUnpriced(pufAnchorRows) ? [NO_RATES] : []),
    ],
    emptyReason: pufEmpty,
    columns: [
      { header: "Plate mark", value: (r) => r.plateMark, totalLabel: "Total" },
      { header: "Bolt spec", value: (r) => r.boltSpec },
      { header: "Dia (mm)", value: (r) => r.diameterMm, dp: 0 },
      { header: "Length (mm)", value: (r) => r.lengthMm, dp: 0 },
      { header: "Grade", value: (r) => r.grade },
      { header: "Anchor type", value: (r) => r.anchorType },
      { header: "Embedment (mm)", value: (r) => r.embedmentMm, dp: 0 },
      { header: "Bolts / plate", value: (r) => r.boltsPerPlate, dp: 0 },
      { header: "Total bolts", value: (r) => r.totalBolts, dp: 0, sum: true },
      { header: "Nuts", value: (r) => r.nuts, dp: 0, sum: true },
      { header: "Washers", value: (r) => r.washers, dp: 0, sum: true },
      { header: "Total wt (kg)", value: (r) => r.totalWeightKg, dp: 3, sum: true },
      { header: "Rate (₹)", value: (r) => r.rate, dp: 2 },
      { header: "Amount (₹)", value: (r) => r.amount, dp: 2, sum: true },
      { header: "Rate source", value: (r) => r.rateSource },
    ],
  }));

  /* -------------------------------------------------- 19. PUF lock — C-purlin schedule */
  tables.push(makeTable({
    id: "puf-lock-purlin-schedule",
    title: "PUF lock — C-purlin schedule",
    group: "PUF Lock",
    note: "The paired MS C-purlins welded upright on each base plate. Their two webs bound the receiving pocket the PUF panel drops into.",
    fileStem: "colony-puf-lock-purlin-schedule",
    rows: pufPurlinRows,
    extraRemarks: [
      ...(puf && pufPurlinRows.length
        ? [
            `The C-purlin piece count is DERIVED, never hardcoded: ${puf.takeoff.plates} plate`
            + `${puf.takeoff.plates === 1 ? "" : "s"} × ${puf.config.purlin.perPlate} purlins per plate `
            + `= ${puf.takeoff.purlinPieces} pieces (${puf.takeoff.purlinTotalLengthM.toFixed(2)} m running length). `
            + "Change the plate layout and every quantity in this schedule follows.",
          ]
        : []),
      ...(allUnpriced(pufPurlinRows) ? [NO_RATES] : []),
    ],
    emptyReason: pufEmpty,
    columns: [
      { header: "Mark", value: (r) => r.mark, totalLabel: "Total" },
      { header: "Plate mark", value: (r) => r.plateMark },
      { header: "Side", value: (r) => r.side },
      { header: "Section", value: (r) => r.section },
      { header: "Depth (mm)", value: (r) => r.depthMm, dp: 0 },
      { header: "Flange (mm)", value: (r) => r.flangeMm, dp: 0 },
      { header: "Lip (mm)", value: (r) => r.lipMm, dp: 0 },
      { header: "Thickness (mm)", value: (r) => r.thicknessMm, dp: 2 },
      { header: "Length (mm)", value: (r) => r.lengthMm, dp: 0 },
      { header: "Orientation", value: (r) => r.orientation },
      { header: "Qty / assembly", value: (r) => r.perAssembly, dp: 0 },
      { header: "Qty", value: (r) => r.quantity, dp: 0, sum: true },
      { header: "Running length (m)", value: (r) => r.runningLengthM, dp: 3, sum: true },
      { header: "Unit wt (kg/m)", value: (r) => r.unitWeightKgPerM, dp: 3 },
      { header: "Total wt (kg)", value: (r) => r.totalWeightKg, dp: 3, sum: true },
      { header: "Rate (₹)", value: (r) => r.rate, dp: 2 },
      { header: "Amount (₹)", value: (r) => r.amount, dp: 2, sum: true },
      { header: "Rate source", value: (r) => r.rateSource },
    ],
  }));

  /* -------------------------------------------------- 20. PUF lock — weld schedule */
  tables.push(makeTable({
    id: "puf-lock-weld-schedule",
    title: "PUF lock — weld schedule",
    group: "PUF Lock",
    note: "Plate-to-C-purlin welds per locking assembly, with deposited weld metal and the electrode allowance that covers stub, spatter and slag loss.",
    fileStem: "colony-puf-lock-weld-schedule",
    rows: pufWeldRows,
    extraRemarks: [
      ...(pufWeldRows[0]?.note ? [pufWeldRows[0].note] : []),
      ...(pufWeldRows.length
        ? ["Weld size, throat and length are indicative detailing — they must be confirmed by the project engineer before fabrication."]
        : []),
    ],
    emptyReason: pufEmpty,
    columns: [
      { header: "Assembly", value: (r) => r.assemblyMark, totalLabel: "Total" },
      { header: "Plate", value: (r) => r.plateMark },
      { header: "Weld type", value: (r) => r.weldType },
      { header: "Size (mm)", value: (r) => r.weldSizeMm, dp: 0 },
      { header: "Run length (mm)", value: (r) => r.weldLengthMm, dp: 0 },
      { header: "Welds / assembly", value: (r) => r.weldsPerAssembly, dp: 0, sum: true },
      { header: "Total weld length (mm)", value: (r) => r.totalWeldLengthMm, dp: 0, sum: true },
      { header: "Deposited wt (kg)", value: (r) => r.depositedWeightKg, dp: 3, sum: true },
      { header: "Electrode allowance (kg)", value: (r) => r.electrodeAllowanceKg, dp: 3, sum: true },
    ],
  }));

  /* -------------------------------------------------- 21. PUF lock — panel pocket schedule */
  tables.push(makeTable({
    id: "puf-lock-panel-schedule",
    title: "PUF lock — panel pocket schedule",
    group: "PUF Lock",
    note: "The panel-to-pocket interface at every plate. Clear pocket width = selected PUF panel thickness + installation clearance; the status column carries the validation verdict for that plate.",
    fileStem: "colony-puf-lock-panel-schedule",
    rows: pufPanelRows,
    // Plate-SPECIFIC validation messages already name their own plate ("Plate P03 …"), while a global
    // issue repeats on every row — so the mark is deliberately NOT prefixed here: makeTable then
    // dedupes one global warning to a single bullet instead of printing it once per panel.
    remarkOf: (r) => (r.status === "Pass" ? "" : r.remark),
    extraRemarks: [
      ...(pufPanelRows.length ? [pufPanelStatusRemark(pufPanelRows)] : []),
      PUF_LOCK_EXPLANATION,
    ],
    emptyReason: pufEmpty,
    columns: [
      { header: "Panel mark", value: (r) => r.panelMark },
      { header: "Panel thickness (mm)", value: (r) => r.panelThicknessMm, dp: 0 },
      { header: "Pocket clear width (mm)", value: (r) => r.pocketClearWidthMm, dp: 2 },
      { header: "Installation clearance (mm)", value: (r) => r.installationClearanceMm, dp: 2 },
      { header: "Side gap (mm)", value: (r) => r.sideGapMm, dp: 2 },
      { header: "Max side gap (mm)", value: (r) => r.maxSideGapMm, dp: 2 },
      { header: "Insertion depth (mm)", value: (r) => r.insertionDepthMm, dp: 0 },
      { header: "Seating depth (mm)", value: (r) => r.seatingDepthMm, dp: 0 },
      { header: "Supported plate", value: (r) => r.supportedByPlate },
      { header: "Host beam", value: (r) => r.hostBeam },
      { header: "Isolation strip", value: (r) => r.isolationStrip },
      { header: "Sealant", value: (r) => r.sealant },
      { header: "Status", value: (r) => r.status },
      { header: "Remark", value: (r) => r.remark },
    ],
  }));

  /* -------------------------------------------------- 22. PUF lock — ordering summary */
  tables.push(makeTable({
    id: "puf-lock-ordering-summary",
    title: "PUF lock — ordering summary",
    group: "PUF Lock",
    note: "What to fabricate and what to buy: the typical-assembly bill, the per-wall (plinth-beam run) quantity and the whole-building purchase list, sectioned by scope.",
    fileStem: "colony-puf-lock-ordering-summary",
    rows: pufOrderingRows,
    sectionOf: (r) => r.scope,
    // "Per assembly", each wall and "Whole building" deliberately describe the SAME steel at three
    // levels of detail — a grand total across the sections would count it three times.
    noGrand: true,
    extraRemarks: [
      ...(pufOrderingRows.length
        ? ["The scope sections restate the same locking system at three levels — per typical assembly, per plinth-beam run and for the whole building — so no grand total is shown. The 'Whole building' subtotal is the purchase quantity."]
        : []),
      ...(allUnpriced(pufOrderingRows) ? [NO_RATES] : []),
    ],
    emptyReason: pufEmpty,
    columns: [
      { header: "Scope", value: (r) => r.scope, totalLabel: "Total" },
      { header: "Item", value: (r) => r.item },
      { header: "Spec", value: (r) => r.spec },
      { header: "Unit", value: (r) => r.unit },
      { header: "Qty", value: (r) => r.quantity, dp: 3 },
      { header: "Unit wt (kg)", value: (r) => r.unitWeightKg, dp: 3 },
      { header: "Total wt (kg)", value: (r) => r.totalWeightKg, dp: 3, sum: true },
      { header: "Rate (₹)", value: (r) => r.rate, dp: 2 },
      { header: "Amount (₹)", value: (r) => r.amount, dp: 2, sum: true },
      { header: "Rate source", value: (r) => r.rateSource },
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
