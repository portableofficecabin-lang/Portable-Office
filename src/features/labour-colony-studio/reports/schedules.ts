/**
 * LABOUR COLONY STUDIO — fabrication schedules / reports (pure, framework-free).
 *
 * Pure builders that turn the shared ColonyModel (+ the LIVE priced Material BoqResult + the priced
 * CivilWorkResult) into the flat, typed row arrays a fabrication shop works from: member list,
 * cutting list, bolt / nut / washer schedules, plate + weld + connection schedules, truss / stair /
 * railing / footing / column / beam schedules, a floor- and assembly-wise weight summary, an
 * assembly-wise dispatch (packing) list, the flooring-sheet setting-out + ordering summary and the
 * PUF panel seating schedule.
 *
 * NON-NEGOTIABLE (same rule the model itself holds): a schedule NEVER re-prices or re-quantifies.
 *   • Priced steel members read their piece count, cut length, unit weight, total weight and rate
 *     straight from the joined BoqLine (`part.boqSource === "steel"` → `boqResult.lines` by
 *     `id === part.boqLineId`; sibling parts share one line).
 *   • Priced civil members (footings, plinth beams) read from `civilResult.foundation`.
 *   • The model's PLACEMENT count (how many parts were positioned) is reconciled against the priced
 *     piece count; when they differ the row carries a `remark` — a member is NEVER silently dropped.
 *   • Only connection hardware the priced take-off does not itemise (base/gusset/splice plates,
 *     bolts, nuts, washers, welds) is quantified geometrically here — it has no BOQ line to preserve,
 *     so it is engineering detail, flagged `boqSource: "none"`, never a price.
 *   • The deck sheet setting-out and the panel seating system are SETTING-OUT, not procurement. The
 *     priced `floor:board` area remains the source of truth for the deck's cost; a sheet count says
 *     how that already-bought area is physically cut and laid, and is never a second purchase.
 *
 * Units follow the model: METRES / KILOGRAMS. Millimetre fields are labelled `Mm`. No React, no
 * three.js, no DOM — server-safe and unit-testable, consumed by ManufacturingReport / ReportBar.
 */

import type { BoqLine, BoqResult } from "@/lib/boq/types";
import type { CivilWorkResult } from "@/lib/quotation/labourColonyCivil";
import { ASSEMBLY_SEQUENCE } from "../model/assembly";
import { buildPanelThicknessTable, MIN_INSERTION_MM } from "../model/panelSupport";
import { MIN_EDGE_BEARING_MM } from "../model/sheetLayout";
import type {
  ColonyAssemblyStep, ColonyModel, ColonyPart, ColonyPartKind, PartSolid, Vec3,
} from "../model/types";

/* ============================================================ shared helpers ============= */

/** Nominal density of structural / plate steel (kg/m³) — used ONLY for un-priced synthesized
 *  connection plates, which have no BoqLine to read a weight from. Never applied to a priced member. */
const STEEL_DENSITY = 7850;

const round = (n: number, dp = 2): number => {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
};

const uniq = <T>(xs: T[]): T[] => Array.from(new Set(xs));

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}

/** Floor tag → human label (−1 = foundation, 0 = ground, 1 = first …). */
export function floorLabel(f: number | undefined): string {
  if (f == null) return "—";
  if (f < 0) return "FDN";
  if (f === 0) return "GF";
  return `${f}F`;
}

/** id → BoqLine, for the steel join. Empty when no priced BOQ is available yet. */
export function boqLineIndex(boq: BoqResult | null | undefined): Map<string, BoqLine> {
  const m = new Map<string, BoqLine>();
  if (boq) for (const l of boq.lines) m.set(l.id, l);
  return m;
}

/** How many model parts were POSITIONED against each BoqLine id (siblings share one line). */
export function placementCounts(model: ColonyModel): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of model.parts) {
    if (!p.boqLineId) continue;
    m.set(p.boqLineId, (m.get(p.boqLineId) ?? 0) + 1);
  }
  return m;
}

/**
 * Is this BoqLine a priced STEEL member line?
 *
 * A steel take-off item is the only one that is cut to a length, so `cutLengthM != null` is the
 * repo-wide test for it (the studio's own section/qty resolvers use the same convention). It matters
 * here because sheet and count lines — cladding, lining, insulation, flooring board, vinyl, roof
 * sheet, ceiling, electrical — also carry a real `totalWeightKg` (GI 6.28, PPGI 3.93, roofing 4.30,
 * ply 11.50 kg/sqm …) yet are NOT part of `boq.totals.totalSteelKg`, which the pricing engine sums
 * from steel lines only. Disabled lines are excluded for the same reason: the engine's totals are
 * built from the enabled (`live`) lines, so counting a disabled line here could never reconcile.
 *
 * NOTE: `ColonyPart.boqSource === "steel"` is NOT this test — the model assigns that source to every
 * part outside the foundation layer that carries a BOQ line id, including parts bound to sheet lines.
 */
export function isSteelLine(line: BoqLine | null | undefined): boolean {
  return !!line && line.enabled && line.cutLengthM != null;
}

/**
 * Split an integer priced total across several report rows in proportion to `shares`, by the
 * largest-remainder method, so the row values are whole numbers that add back to EXACTLY `total`.
 *
 * Needed wherever ONE priced line is reported over MORE THAN ONE row — a column line, for instance,
 * carries no storey, so an N-storey colony renders it as N per-floor rows. Writing the whole-line
 * figure on each of them would make the schedule total N× the BOQ; apportioning makes it sum once.
 */
function apportionInt(total: number, shares: number[]): number[] {
  const sumShares = shares.reduce((a, s) => a + s, 0);
  if (!Number.isFinite(total) || total <= 0 || sumShares <= 0) return shares.map(() => 0);
  const exact = shares.map((s) => (total * s) / sumShares);
  const out = exact.map((e) => Math.floor(e));
  let left = Math.round(total) - out.reduce((a, b) => a + b, 0);
  const byRemainder = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const r of byRemainder) {
    if (left <= 0) break;
    out[r.i] += 1;
    left -= 1;
  }
  return out;
}

/** The priced piece count of a line (steel: pieces, else the rounded billed qty). */
function pricedPiecesOf(line: BoqLine | null | undefined): number | null {
  if (!line) return null;
  if (line.pieces != null && Number.isFinite(line.pieces)) return line.pieces;
  if (Number.isFinite(line.qty)) return Math.round(line.qty);
  return null;
}

/** Axis-aligned bounds (colony metres) of any solid. */
function bboxOf(solid: PartSolid): { min: Vec3; max: Vec3 } {
  if (solid.kind === "box") return { min: solid.min, max: solid.max };
  const min: Vec3 = { x: Infinity, y: Infinity, z: Infinity };
  const max: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity };
  const acc = (x: number, y: number, z: number) => {
    min.x = Math.min(min.x, x); min.y = Math.min(min.y, y); min.z = Math.min(min.z, z);
    max.x = Math.max(max.x, x); max.y = Math.max(max.y, y); max.z = Math.max(max.z, z);
  };
  if (solid.kind === "prism") {
    for (const p of solid.poly) { acc(p.x, p.y, solid.z0); acc(p.x, p.y, solid.z1); }
  } else {
    for (const p of solid.pts) acc(p.x, p.y, p.z);
  }
  if (!Number.isFinite(min.x)) return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
  return { min, max };
}

/** The member's fabricated length (m): its native spec length, else the longest solid extent. */
export function partLengthM(part: ColonyPart): number {
  const specLen = part.spec?.lengthM;
  if (specLen != null && Number.isFinite(specLen) && specLen > 0) return round(specLen, 3);
  const b = bboxOf(part.solid);
  return round(Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z), 3);
}

/** L × W × thickness (mm) of a plate-like solid, longest → shortest. */
function plateDimsMm(part: ColonyPart): { lMm: number; wMm: number; tMm: number } {
  const b = bboxOf(part.solid);
  const dims = [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z]
    .map((d) => Math.round(d * 1000))
    .sort((a, z) => z - a);
  return { lMm: dims[0], wMm: dims[1], tMm: Math.max(1, dims[2]) };
}

/** The steel section label for a member — the priced BOQ spec first, else the model's own spec. */
function sectionOf(part: ColonyPart, line: BoqLine | null | undefined): string {
  return part.spec?.sectionSize || line?.spec || "";
}

/** The share of ANY priced line's total weight carried by ONE of its placements (0 when unpriced). */
function lineShareKg(
  part: ColonyPart, idx: Map<string, BoqLine>, places: Map<string, number>, want: (l: BoqLine) => boolean,
): number {
  // Civil members are priced by the civil engine, never by the material BOQ — they carry no share.
  if (!part.boqLineId || part.boqSource === "civil") return 0;
  const line = idx.get(part.boqLineId);
  if (!line || !want(line)) return 0;
  const n = places.get(part.boqLineId) ?? 1;
  return n > 0 ? line.totalWeightKg / n : 0;
}

/**
 * The share of a priced STEEL line's total weight carried by ONE of its placements. Distributing the
 * priced line weight across the members that were positioned lets a floor- / assembly-wise summary
 * add back up to the priced tonnage, so the summary reconciles to the BOQ instead of re-deriving it.
 *
 * Gated on the LINE being steel (see `isSteelLine`), not on `part.boqSource` — a part bound to a
 * cladding / lining / board / roof-sheet line also reports `boqSource: "steel"`, and folding that
 * sheeting weight into the steel figure would make it impossible to reconcile with `totalSteelKg`.
 */
function distributedWeightKg(part: ColonyPart, idx: Map<string, BoqLine>, places: Map<string, number>): number {
  return lineShareKg(part, idx, places, isSteelLine);
}

/**
 * The same distribution for the priced NON-steel lines — sheeting, lining, insulation, flooring
 * board, vinyl, roof sheet, ceiling, electrical. Reported as its own clearly-labelled figure; it is
 * never merged into the steel tonnage.
 */
function distributedSheetingKg(part: ColonyPart, idx: Map<string, BoqLine>, places: Map<string, number>): number {
  return lineShareKg(part, idx, places, (l) => l.enabled && l.cutLengthM == null);
}

/** Nominal bolt diameter (mm) parsed from a "M16 …" spec, else derived from the hole diameter. */
function boltDiaMm(boltSpec: string | undefined, holeDiaMm: number | undefined): number | null {
  if (boltSpec) {
    const m = /M\s*(\d+(?:\.\d+)?)/i.exec(boltSpec);
    if (m) return Number(m[1]);
  }
  if (holeDiaMm != null && Number.isFinite(holeDiaMm) && holeDiaMm > 2) return holeDiaMm - 2;
  return null;
}

/** Kinds that count as a schedulable structural member (drives the member + cutting lists). */
const STRUCTURAL_KINDS = new Set<ColonyPartKind>([
  "column", "stud", "rail", "base-beam", "floor-beam", "joist", "brace",
  "roof-truss", "rafter", "truss-web", "purlin", "ridge",
  "stair-stringer", "stair-tread", "landing", "handrail", "handrail-post", "toe-plate",
  "veranda-beam", "veranda-joist", "veranda-post", "walkway-plate",
  /* Deck + panel-support sections. These are cut, fabricated and erected exactly like any other
   * member, so they belong in the member / cutting / dispatch lists even though the priced take-off
   * does not itemise them — the lists show them with no BOQ line, which is the honest state. */
  "c-channel", "u-channel", "angle-support", "pocket-support", "noggin",
  /* The MS pipe frame — the floor's SECONDARY member, priced on its own floor:tube line. */
  "floor-tube", "joist-web",
]);

const PLATE_KINDS = new Set<ColonyPartKind>([
  "base-plate", "levelling-plate", "gusset", "cleat", "end-plate", "splice-plate", "stiffener",
]);

const BOLT_KINDS = new Set<ColonyPartKind>(["bolt", "anchor-bolt"]);

/* ============================================================ 1. MEMBER LIST ============= */

export interface MemberListRow {
  boqLineId: string | null;
  mark: string;
  /** "unplaced" is the reconciliation bucket for a priced steel line the model never positioned. */
  kind: ColonyPartKind | "unplaced";
  description: string;
  section: string;
  grade: string;
  floors: string;
  gridCount: number;
  lengthM: number;
  placedQty: number;
  pricedPieces: number | null;
  unitWeightKg: number | null;
  totalWeightKg: number | null;
  boqSource: ColonyPart["boqSource"];
  remark: string;
}

/**
 * Every structural member, aggregated by the priced BoqLine it belongs to (siblings roll up into one
 * row). Synthesized members with no line are grouped by kind + part mark. `placedQty` is the model's
 * placement count; when it disagrees with the priced pieces a reconciliation remark is emitted.
 *
 * A closing reconciliation pass adds any priced steel line that produced NO row at all — the take-off
 * emits one line per distinct cut length, so grouping by the ids present on model parts would
 * otherwise drop a priced line the model never placed. A member is never silently dropped.
 */
export function buildMemberList(model: ColonyModel, boq?: BoqResult | null): MemberListRow[] {
  const idx = boqLineIndex(boq);
  const places = placementCounts(model);
  const members = model.parts.filter((p) => STRUCTURAL_KINDS.has(p.kind));
  const groups = groupBy(members, (p) => p.boqLineId ?? `synth:${p.kind}:${p.partMark ?? ""}`);
  const rows: MemberListRow[] = [];
  for (const parts of groups.values()) {
    const first = parts[0];
    const line = first.boqLineId ? idx.get(first.boqLineId) ?? null : null;
    const placedQty = parts.length;
    const pricedPieces = pricedPiecesOf(line);
    const grids = uniq(parts.map((p) => p.grid).filter((g): g is string => !!g));
    const floors = uniq(parts.map((p) => floorLabel(p.floor))).join(", ");
    const lengths = parts.map(partLengthM);
    const remarks: string[] = [];
    if (pricedPieces != null && placedQty !== pricedPieces) {
      remarks.push(`Placed ${placedQty}, priced ${pricedPieces}`);
    }
    if (!line && first.boqSource === "none") remarks.push("Synthesized detail — not priced");
    rows.push({
      boqLineId: first.boqLineId ?? null,
      mark: first.partMark ?? "—",
      kind: first.kind,
      description: line?.description || first.label,
      section: sectionOf(first, line),
      grade: line?.grade ?? "",
      floors,
      gridCount: grids.length,
      lengthM: round(Math.max(...lengths), 3),
      placedQty,
      pricedPieces,
      unitWeightKg: line ? round(line.unitWeight ?? 0, 3) : null,
      totalWeightKg: line ? round(line.totalWeightKg, 1) : null,
      boqSource: first.boqSource,
      remark: remarks.join("; "),
    });
  }

  // Reconciliation pass — a priced steel line with no row of its own is surfaced, never dropped.
  const listed = new Set(rows.map((r) => r.boqLineId).filter((id): id is string => !!id));
  for (const line of boq?.lines ?? []) {
    if (!isSteelLine(line) || listed.has(line.id)) continue;
    const placed = places.get(line.id) ?? 0;
    rows.push({
      boqLineId: line.id,
      mark: "—",
      kind: "unplaced",
      description: line.description,
      section: line.spec,
      grade: line.grade,
      floors: "—",
      gridCount: 0,
      lengthM: round(line.cutLengthM ?? 0, 3),
      placedQty: placed,
      pricedPieces: pricedPiecesOf(line),
      unitWeightKg: round(line.unitWeight ?? 0, 3),
      totalWeightKg: round(line.totalWeightKg, 1),
      boqSource: "steel",
      remark: placed > 0
        ? `Priced; placed as ${placed} non-structural part(s) — see the cutting list`
        : "Priced, not placed — no member positioned in the model",
    });
  }
  return rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.section.localeCompare(b.section));
}

/* ============================================================ 2. CUTTING LIST =========== */

export interface CuttingListRow {
  boqLineId: string;
  section: string;
  grade: string;
  member: string;
  cutLengthM: number;
  qty: number;
  totalLengthM: number;
  weightKg: number;
  drawingRef: string;
  remark: string;
}

/**
 * The steel / tube cutting list, section-wise: every priced steel member's cut length × pieces, its
 * total running length and weight — read from the joined BoqLine (the priced source of truth) and
 * reconciled against the model placement count.
 *
 * Only parts bound to an actual steel LINE are cut to length: a part may report `boqSource: "steel"`
 * while pointing at a cladding / lining / board / roof-sheet line, which is priced by area and has no
 * cut length to schedule. A part whose line is not loaded yet is kept, so the list still renders from
 * the model alone before a BOQ exists. A closing pass adds priced steel lines with no placement.
 */
export function buildCuttingList(model: ColonyModel, boq?: BoqResult | null): CuttingListRow[] {
  const idx = boqLineIndex(boq);
  const places = placementCounts(model);
  const steel = model.parts.filter((p) => {
    if (p.boqSource !== "steel" || !p.boqLineId) return false;
    const line = idx.get(p.boqLineId);
    return line ? isSteelLine(line) : true;
  });
  const groups = groupBy(steel, (p) => p.boqLineId as string);
  const rows: CuttingListRow[] = [];
  for (const [lineId, parts] of groups) {
    const first = parts[0];
    const line = idx.get(lineId) ?? null;
    const placed = places.get(lineId) ?? parts.length;
    const qty = pricedPiecesOf(line) ?? placed;
    const cutLengthM = line?.cutLengthM ?? partLengthM(first);
    const totalLengthM = line?.runningLengthM ?? round(cutLengthM * qty, 2);
    const remark = line && qty !== placed ? `Placed ${placed}, priced ${qty}` : "";
    rows.push({
      boqLineId: lineId,
      section: sectionOf(first, line),
      grade: line?.grade ?? "",
      member: line?.description || first.label,
      cutLengthM: round(cutLengthM, 3),
      qty,
      totalLengthM: round(totalLengthM, 2),
      weightKg: round(line?.totalWeightKg ?? 0, 1),
      drawingRef: line?.drawingRef ?? "",
      remark,
    });
  }

  // Reconciliation pass — the take-off emits one line per distinct cut length, so a priced steel
  // line the model never placed must still be cut. It is listed, flagged, never dropped.
  for (const line of boq?.lines ?? []) {
    if (!isSteelLine(line) || groups.has(line.id)) continue;
    const qty = pricedPiecesOf(line) ?? 0;
    const cutLengthM = line.cutLengthM ?? 0;
    rows.push({
      boqLineId: line.id,
      section: line.spec,
      grade: line.grade,
      member: line.description,
      cutLengthM: round(cutLengthM, 3),
      qty,
      totalLengthM: round(line.runningLengthM ?? cutLengthM * qty, 2),
      weightKg: round(line.totalWeightKg, 1),
      drawingRef: line.drawingRef,
      remark: "Priced, not placed — no member positioned in the model",
    });
  }
  return rows.sort((a, b) => a.section.localeCompare(b.section) || b.totalLengthM - a.totalLengthM);
}

/* ============================================================ 3. CONNECTION HARDWARE ==== */

interface ConnHardware {
  connectionId: string;
  boltSpec: string;
  diaMm: number | null;
  bolts: number;
  nuts: number;
  washers: number;
  memberKinds: ColonyPartKind[];
  grids: string[];
  fabrication: string;
}

/** Roll up every bolt / nut / washer part under the connection group it belongs to. */
function connectionHardware(model: ColonyModel): ConnHardware[] {
  const withConn = model.parts.filter((p) => !!p.connectionId && (BOLT_KINDS.has(p.kind) || p.kind === "nut" || p.kind === "washer"));
  const groups = groupBy(withConn, (p) => p.connectionId as string);
  const out: ConnHardware[] = [];
  for (const [cid, parts] of groups) {
    let bolts = 0, nuts = 0, washers = 0;
    let boltSpec = "";
    let holeDiaMm: number | undefined;
    for (const p of parts) {
      if (BOLT_KINDS.has(p.kind)) { bolts++; boltSpec = boltSpec || (p.spec?.boltSpec ?? ""); holeDiaMm = holeDiaMm ?? p.spec?.holeDiaMm; }
      else if (p.kind === "nut") nuts++;
      else if (p.kind === "washer") washers++;
    }
    out.push({
      connectionId: cid,
      boltSpec: boltSpec || "—",
      diaMm: boltDiaMm(boltSpec, holeDiaMm),
      bolts, nuts, washers,
      memberKinds: uniq(parts.map((p) => p.kind)),
      grids: uniq(parts.map((p) => p.grid).filter((g): g is string => !!g)),
      fabrication: parts.find((p) => BOLT_KINDS.has(p.kind))?.fabrication ?? "site",
    });
  }
  return out.sort((a, b) => a.connectionId.localeCompare(b.connectionId));
}

export interface BoltScheduleRow {
  connectionId: string;
  grid: string;
  boltSpec: string;
  diaMm: number | null;
  boltCount: number;
  fabrication: string;
  remark: string;
}

/** Bolt schedule — bolts per connection group. Asserts nut count == bolt count (remark on mismatch). */
export function buildBoltSchedule(model: ColonyModel): BoltScheduleRow[] {
  return connectionHardware(model)
    .filter((h) => h.bolts > 0)
    .map((h) => ({
      connectionId: h.connectionId,
      grid: h.grids.join(", ") || "—",
      boltSpec: h.boltSpec,
      diaMm: h.diaMm,
      boltCount: h.bolts,
      fabrication: h.fabrication,
      remark: h.nuts !== h.bolts ? `Nuts (${h.nuts}) ≠ bolts (${h.bolts}) — verify` : "",
    }));
}

export interface NutScheduleRow {
  connectionId: string;
  grid: string;
  nutSpec: string;
  diaMm: number | null;
  nutCount: number;
  remark: string;
}

/** Nut schedule — one nut per bolt is the default; a mismatch is flagged, never reconciled silently. */
export function buildNutSchedule(model: ColonyModel): NutScheduleRow[] {
  return connectionHardware(model)
    .filter((h) => h.nuts > 0 || h.bolts > 0)
    .map((h) => ({
      connectionId: h.connectionId,
      grid: h.grids.join(", ") || "—",
      nutSpec: h.boltSpec.replace(/anchor/i, "").trim() || "—",
      diaMm: h.diaMm,
      nutCount: h.nuts,
      remark: h.nuts !== h.bolts ? `Bolt count ${h.bolts}` : "",
    }));
}

export interface WasherScheduleRow {
  connectionId: string;
  grid: string;
  diaMm: number | null;
  washerCount: number;
  remark: string;
}

/** Washer schedule — washers per connection group. */
export function buildWasherSchedule(model: ColonyModel): WasherScheduleRow[] {
  return connectionHardware(model)
    .filter((h) => h.washers > 0 || h.bolts > 0)
    .map((h) => ({
      connectionId: h.connectionId,
      grid: h.grids.join(", ") || "—",
      diaMm: h.diaMm,
      washerCount: h.washers,
      remark: h.washers !== h.bolts ? `Bolt count ${h.bolts}` : "",
    }));
}

/* ============================================================ 4. PLATE SCHEDULE ========= */

export interface PlateScheduleRow {
  mark: string;
  kind: ColonyPartKind;
  description: string;
  sizeMm: string;
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  holeCount: number;
  holeDiaMm: number | null;
  weld: string;
  fabrication: string;
  qty: number;
  unitWeightKg: number;
  totalWeightKg: number;
  remark: string;
}

/**
 * Base / gusset / splice / end / levelling plates + stiffeners. These are synthesized engineering
 * detail (no BOQ line), so their weight is computed geometrically from the drawn plate volume — a
 * fabrication estimate, flagged as such, never a priced quantity. Identical plates are aggregated.
 */
export function buildPlateSchedule(model: ColonyModel): PlateScheduleRow[] {
  const plates = model.parts.filter((p) => PLATE_KINDS.has(p.kind));
  const groups = groupBy(plates, (p) => {
    const d = plateDimsMm(p);
    return `${p.kind}|${p.partMark ?? ""}|${d.lMm}x${d.wMm}x${d.tMm}`;
  });
  const rows: PlateScheduleRow[] = [];
  for (const parts of groups.values()) {
    const first = parts[0];
    const d = plateDimsMm(first);
    const unitKg = round((d.lMm / 1000) * (d.wMm / 1000) * (d.tMm / 1000) * STEEL_DENSITY, 2);
    rows.push({
      mark: first.partMark ?? "—",
      kind: first.kind,
      description: first.label,
      sizeMm: `${d.lMm} × ${d.wMm} × ${d.tMm}`,
      lengthMm: d.lMm,
      widthMm: d.wMm,
      thicknessMm: d.tMm,
      holeCount: first.spec?.boltCount ?? 0,
      holeDiaMm: first.spec?.holeDiaMm ?? null,
      weld: first.spec?.weldSpec ?? "",
      fabrication: first.fabrication ?? "shop",
      qty: parts.length,
      unitWeightKg: unitKg,
      totalWeightKg: round(unitKg * parts.length, 2),
      remark: "Weight estimated from plate geometry (un-priced detail)",
    });
  }
  return rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.mark.localeCompare(b.mark));
}

/* ============================================================ 5. WELD SCHEDULE ========== */

export interface WeldScheduleRow {
  mark: string;
  connectionId: string;
  type: string;
  sizeMm: number | null;
  lengthMm: number | null;
  fabrication: string;
  qty: number;
}

/** Weld schedule — from explicit weld parts and any member/plate carrying a weld spec. */
export function buildWeldSchedule(model: ColonyModel): WeldScheduleRow[] {
  const welded = model.parts.filter((p) => p.kind === "weld" || !!p.spec?.weldSpec);
  const groups = groupBy(welded, (p) => `${p.connectionId ?? p.id}|${p.spec?.weldSpec ?? p.label}`);
  const rows: WeldScheduleRow[] = [];
  for (const parts of groups.values()) {
    const first = parts[0];
    const spec = first.spec?.weldSpec ?? "";
    const sizeM = /(\d+(?:\.\d+)?)\s*mm/i.exec(spec);
    const type = /fillet/i.test(spec) ? "Fillet" : /butt/i.test(spec) ? "Butt" : spec ? "Weld" : "Fillet";
    rows.push({
      mark: first.partMark ?? "W",
      connectionId: first.connectionId ?? "—",
      type,
      sizeMm: sizeM ? Number(sizeM[1]) : null,
      lengthMm: first.spec?.weldLengthMm ?? null,
      fabrication: first.fabrication ?? "shop",
      qty: parts.length,
    });
  }
  return rows.sort((a, b) => a.connectionId.localeCompare(b.connectionId));
}

/* ============================================================ 6. CONNECTION SCHEDULE ==== */

export interface ConnectionScheduleRow {
  connectionId: string;
  type: string;
  grid: string;
  membersJoined: string;
  plateMarks: string;
  boltGroup: string;
  fabrication: string;
}

function connectionType(cid: string, kinds: ColonyPartKind[]): string {
  if (cid.includes("base")) return "Column base";
  if (cid.includes("splice")) return "Column splice";
  if (cid.includes("ridge")) return "Truss ridge";
  if (cid.includes("truss")) return "Truss node";
  if (kinds.includes("gusset")) return "Gusseted joint";
  if (kinds.includes("end-plate")) return "End-plate joint";
  return "Bolted connection";
}

/** Connection schedule — one row per connection group: members joined, plate marks and bolt group. */
export function buildConnectionSchedule(model: ColonyModel): ConnectionScheduleRow[] {
  const withConn = model.parts.filter((p) => !!p.connectionId);
  const groups = groupBy(withConn, (p) => p.connectionId as string);
  const rows: ConnectionScheduleRow[] = [];
  for (const [cid, parts] of groups) {
    const kinds = uniq(parts.map((p) => p.kind));
    const bolts = parts.filter((p) => BOLT_KINDS.has(p.kind));
    const boltSpec = bolts.find((b) => b.spec?.boltSpec)?.spec?.boltSpec ?? "";
    const plateMarks = uniq(parts.filter((p) => PLATE_KINDS.has(p.kind)).map((p) => p.partMark ?? p.kind));
    rows.push({
      connectionId: cid,
      type: connectionType(cid, kinds),
      grid: uniq(parts.map((p) => p.grid).filter((g): g is string => !!g)).join(", ") || "—",
      membersJoined: kinds.join(", "),
      plateMarks: plateMarks.join(", ") || "—",
      boltGroup: bolts.length ? `${bolts.length} × ${boltSpec || "bolt"}` : "—",
      fabrication: parts[0]?.fabrication ?? "site",
    });
  }
  return rows.sort((a, b) => a.connectionId.localeCompare(b.connectionId));
}

/* ============================================================ 7. TRUSS SCHEDULE ========= */

export interface TrussScheduleRow {
  mark: string;
  assemblyId: string;
  spanM: number;
  chords: number;
  webs: number;
  memberCount: number;
  weightKg: number;
}

/** Roof-truss schedule — grouped by truss assembly. Span from the tie-chord extent across the width. */
export function buildTrussSchedule(model: ColonyModel, boq?: BoqResult | null): TrussScheduleRow[] {
  const idx = boqLineIndex(boq);
  const places = placementCounts(model);
  const trussParts = model.parts.filter((p) => p.assemblyId?.startsWith("truss:"));
  const groups = groupBy(trussParts, (p) => p.assemblyId as string);
  const rows: TrussScheduleRow[] = [];
  for (const [aid, parts] of groups) {
    let spanM = 0;
    for (const p of parts) {
      const b = bboxOf(p.solid);
      spanM = Math.max(spanM, b.max.y - b.min.y);
    }
    const chords = parts.filter((p) => p.kind === "rafter").length;
    const webs = parts.filter((p) => p.kind === "truss-web").length;
    const weightKg = parts.reduce((a, p) => a + distributedWeightKg(p, idx, places), 0);
    rows.push({
      mark: parts.find((p) => p.partMark)?.partMark ?? aid.replace("truss:", "T"),
      assemblyId: aid,
      spanM: round(spanM, 2),
      chords, webs,
      memberCount: parts.length,
      weightKg: round(weightKg, 1),
    });
  }
  return rows.sort((a, b) => a.mark.localeCompare(b.mark));
}

/* ============================================================ 8. STAIRCASE SCHEDULE ===== */

export interface StaircaseScheduleRow {
  mark: string;
  assemblyId: string;
  flights: number;
  treads: number;
  stringers: number;
  landings: number;
  handrailPosts: number;
  weightKg: number;
}

/** Staircase schedule — grouped by stair assembly. */
export function buildStaircaseSchedule(model: ColonyModel, boq?: BoqResult | null): StaircaseScheduleRow[] {
  const idx = boqLineIndex(boq);
  const places = placementCounts(model);
  const stairParts = model.parts.filter((p) => p.assemblyId?.startsWith("stair:"));
  const groups = groupBy(stairParts, (p) => p.assemblyId as string);
  const rows: StaircaseScheduleRow[] = [];
  for (const [aid, parts] of groups) {
    const stringers = parts.filter((p) => p.kind === "stair-stringer");
    const flights = uniq(stringers.map((p) => p.id.replace(/:stringer:.*$/, ""))).length;
    rows.push({
      mark: aid.replace("stair:", "STR-"),
      assemblyId: aid,
      flights: Math.max(1, flights),
      treads: parts.filter((p) => p.kind === "stair-tread").length,
      stringers: stringers.length,
      landings: parts.filter((p) => p.kind === "landing").length,
      handrailPosts: parts.filter((p) => p.kind === "handrail-post").length,
      weightKg: round(parts.reduce((a, p) => a + distributedWeightKg(p, idx, places), 0), 1),
    });
  }
  return rows.sort((a, b) => a.mark.localeCompare(b.mark));
}

/* ============================================================ 9. RAILING SCHEDULE ======= */

export interface RailingScheduleRow {
  location: string;
  posts: number;
  rails: number;
  toePlates: number;
  railLengthM: number;
  weightKg: number;
}

/** Railing schedule — handrails / posts / toe plates grouped by their location (stair or floor). */
export function buildRailingSchedule(model: ColonyModel, boq?: BoqResult | null): RailingScheduleRow[] {
  const idx = boqLineIndex(boq);
  const places = placementCounts(model);
  const railParts = model.parts.filter((p) => p.kind === "handrail" || p.kind === "handrail-post" || p.kind === "toe-plate");
  const locOf = (p: ColonyPart): string =>
    p.assemblyId?.startsWith("stair:") ? `Staircase ${p.assemblyId.replace("stair:", "")}` : `Veranda ${floorLabel(p.floor)}`;
  const groups = groupBy(railParts, locOf);
  const rows: RailingScheduleRow[] = [];
  for (const [loc, parts] of groups) {
    const railLengthM = parts.filter((p) => p.kind === "handrail").reduce((a, p) => a + partLengthM(p), 0);
    rows.push({
      location: loc,
      posts: parts.filter((p) => p.kind === "handrail-post").length,
      rails: parts.filter((p) => p.kind === "handrail").length,
      toePlates: parts.filter((p) => p.kind === "toe-plate").length,
      railLengthM: round(railLengthM, 2),
      weightKg: round(parts.reduce((a, p) => a + distributedWeightKg(p, idx, places), 0), 1),
    });
  }
  return rows.sort((a, b) => a.location.localeCompare(b.location));
}

/* ============================================================ 10. FOOTING SCHEDULE ====== */

export interface FootingScheduleRow {
  mark: string;
  kind: string;
  count: number;
  sideM: number;
  depthM: number;
  concreteCumEach: number;
  concreteCumTotal: number;
  reinforcement: string;
  sbcKnm2: number;
  bearingKnm2: number;
  utilisationPct: number;
  adequate: boolean;
  remark: string;
}

/** Footing schedule (F1/F2/F3 …) straight from the priced civil result — the substructure source of truth. */
export function buildFootingSchedule(civil?: CivilWorkResult | null): FootingScheduleRow[] {
  const types = civil?.foundation?.footingTypes ?? [];
  return types.map((t) => ({
    mark: t.mark,
    kind: t.kind,
    count: t.count,
    sideM: round(t.sideM, 2),
    depthM: round(t.depthM, 2),
    concreteCumEach: round(t.concreteCum, 3),
    concreteCumTotal: round(t.concreteCum * t.count, 2),
    reinforcement: t.bottomText + (t.topMesh ? ` + top ${t.topText}` : ""),
    sbcKnm2: round(t.sbcKnm2, 0),
    bearingKnm2: round(t.bearingPressureKnm2, 0),
    utilisationPct: round(t.utilisation * 100, 0),
    adequate: t.adequate,
    remark: t.adequate ? "" : `OVERSTRESSED — increase to ${round(t.requiredSideM, 2)} m square`,
  }));
}

/* ============================================================ 11. COLUMN SCHEDULE ======= */

export interface ColumnScheduleRow {
  mark: string;
  section: string;
  grade: string;
  floor: string;
  lengthM: number;
  placedQty: number;
  /** THIS floor's share of the line's priced pieces — the per-floor rows add up to the line total. */
  pricedPieces: number | null;
  unitWeightKg: number | null;
  /** THIS floor's share of the priced line weight, distributed by placement count. Summable. */
  totalWeightKg: number | null;
  /** The undivided priced line figures, kept visible so the BOQ total is never ambiguous. */
  linePricedPieces: number | null;
  lineTotalWeightKg: number | null;
  remark: string;
}

/**
 * Column schedule — steel columns typed by section + floor, reconciled to the priced line.
 *
 * A column BOQ line carries no storey, so an N-storey colony renders ONE priced line as N per-floor
 * rows. The priced pieces and weight are therefore APPORTIONED across those rows by placement share
 * (integer pieces by largest remainder), so summing the schedule equals the BOQ exactly once instead
 * of N times. The undivided line figures stay on every row in their own columns.
 */
export function buildColumnSchedule(model: ColonyModel, boq?: BoqResult | null): ColumnScheduleRow[] {
  const idx = boqLineIndex(boq);
  const places = placementCounts(model);
  const cols = model.parts.filter((p) => p.kind === "column");
  const rows: ColumnScheduleRow[] = [];
  for (const [lineId, lineParts] of groupBy(cols, (p) => p.boqLineId ?? "?")) {
    const line = lineId === "?" ? null : idx.get(lineId) ?? null;
    const pricedPieces = pricedPiecesOf(line);
    // Model-wide placements of the line — a sibling of another kind would share it, so the columns
    // may legitimately carry only part of the line. Never attribute more than their share.
    const placedForLine = line ? places.get(lineId) ?? lineParts.length : lineParts.length;
    const floorGroups = [...groupBy(lineParts, (p) => floorLabel(p.floor)).values()];
    const columnPieces = pricedPieces == null
      ? null
      : placedForLine > 0
        ? Math.round((pricedPieces * lineParts.length) / placedForLine)
        : pricedPieces;
    const pieceShares = apportionInt(columnPieces ?? 0, floorGroups.map((g) => g.length));
    floorGroups.forEach((parts, gi) => {
      const first = parts[0];
      rows.push({
        mark: `C-${floorLabel(first.floor)}`,
        section: sectionOf(first, line),
        grade: line?.grade ?? "",
        floor: floorLabel(first.floor),
        lengthM: round(Math.max(...parts.map(partLengthM)), 3),
        placedQty: parts.length,
        pricedPieces: columnPieces == null ? null : pieceShares[gi],
        unitWeightKg: line ? round(line.unitWeight ?? 0, 3) : null,
        totalWeightKg: line
          ? round(parts.reduce((a, p) => a + distributedWeightKg(p, idx, places), 0), 1)
          : null,
        linePricedPieces: pricedPieces,
        lineTotalWeightKg: line ? round(line.totalWeightKg, 1) : null,
        remark: pricedPieces != null && placedForLine !== pricedPieces
          ? `Placed ${placedForLine}, priced ${pricedPieces}`
          : "",
      });
    });
  }
  return rows.sort((a, b) => a.floor.localeCompare(b.floor) || a.section.localeCompare(b.section));
}

/* ============================================================ 12. BEAM SCHEDULE ========= */

export interface BeamScheduleRow {
  mark: string;
  type: "Steel" | "RCC";
  section: string;
  grade: string;
  floor: string;
  reinforcement: string;
  lengthM: number;
  placedQty: number | null;
  weightKg: number | null;
  remark: string;
}

/** Beam schedule — steel base/floor/veranda beams (from the model + BOQ) plus RCC plinth beams (from civil). */
export function buildBeamSchedule(model: ColonyModel, boq?: BoqResult | null, civil?: CivilWorkResult | null): BeamScheduleRow[] {
  const idx = boqLineIndex(boq);
  const places = placementCounts(model);
  const rows: BeamScheduleRow[] = [];

  const beamKinds = new Set<ColonyPartKind>(["base-beam", "floor-beam", "veranda-beam"]);
  const beams = model.parts.filter((p) => beamKinds.has(p.kind));
  const groups = groupBy(beams, (p) => `${p.kind}|${p.boqLineId ?? "?"}|${floorLabel(p.floor)}`);
  for (const parts of groups.values()) {
    const first = parts[0];
    const line = first.boqLineId ? idx.get(first.boqLineId) ?? null : null;
    rows.push({
      mark: first.partMark ?? "B",
      type: "Steel",
      section: sectionOf(first, line),
      grade: line?.grade ?? "",
      floor: floorLabel(first.floor),
      reinforcement: "",
      lengthM: round(parts.reduce((a, p) => a + partLengthM(p), 0), 2),
      placedQty: parts.length,
      weightKg: round(parts.reduce((a, p) => a + distributedWeightKg(p, idx, places), 0), 1),
      remark: "",
    });
  }

  // RCC plinth / tie beams — priced by the civil engine (its beam schedule is the source of truth).
  for (const b of civil?.foundation?.beams ?? []) {
    rows.push({
      mark: b.mark,
      type: "RCC",
      section: `${b.widthMm} × ${b.depthMm} mm`,
      grade: b.grade,
      floor: "FDN",
      reinforcement: `Top ${b.topBars} · Bot ${b.bottomBars} · ${b.stirrups}`,
      lengthM: round(b.lengthM, 2),
      placedQty: null,
      weightKg: null,
      remark: b.role,
    });
  }
  return rows;
}

/* ============================================================ 13. WEIGHT SUMMARY ======== */

export interface WeightSummaryFloorRow { floor: string; steelKg: number; sheetingKg: number; }
export interface WeightSummaryAssemblyRow {
  step: ColonyAssemblyStep;
  title: string;
  steelKg: number;
  sheetingKg: number;
}
export interface WeightSummary {
  byFloor: WeightSummaryFloorRow[];
  byAssembly: WeightSummaryAssemblyRow[];
  modelSteelKg: number;
  boqSteelKg: number | null;
  deltaKg: number | null;
  reconciled: boolean;
  /**
   * Distributed weight of the priced NON-steel lines — cladding, lining, insulation, flooring board,
   * vinyl, roof sheet, ceiling, electrical. Reported on its own, NEVER merged into the steel figure:
   * `boq.totals.totalSteelKg` is summed from steel lines only, so folding sheeting into the steel
   * column would make the reconciliation structurally impossible to satisfy.
   */
  modelSheetingKg: number;
  boqSheetingKg: number | null;
  sheetingRemark: string;
  remark: string;
}

/**
 * Floor-wise and assembly-wise weight, distributed from the priced line weights across their
 * placements so the totals add back up to — and are reconciled against — `boqResult.totals`.
 *
 * Steel and sheeting are tracked in SEPARATE columns against their own BOQ totals, because the
 * engine's `totalSteelKg` counts steel lines only while sheet / count lines carry a real weight of
 * their own (GI 6.28, PPGI 3.93, roofing 4.30, ply 11.50, glasswool 1.20, vinyl 1.80 kg/sqm …).
 */
export function buildWeightSummary(model: ColonyModel, boq?: BoqResult | null): WeightSummary {
  const idx = boqLineIndex(boq);
  const places = placementCounts(model);
  const byFloorKg = new Map<string, { steel: number; sheeting: number }>();
  const byStepKg = new Map<ColonyAssemblyStep, { steel: number; sheeting: number }>();
  let modelSteelKg = 0;
  let modelSheetingKg = 0;
  for (const p of model.parts) {
    const steel = distributedWeightKg(p, idx, places);
    const sheeting = distributedSheetingKg(p, idx, places);
    if (steel <= 0 && sheeting <= 0) continue;
    modelSteelKg += steel;
    modelSheetingKg += sheeting;
    const fl = floorLabel(p.floor);
    const f = byFloorKg.get(fl) ?? { steel: 0, sheeting: 0 };
    byFloorKg.set(fl, { steel: f.steel + steel, sheeting: f.sheeting + sheeting });
    const s = byStepKg.get(p.assemblyStep) ?? { steel: 0, sheeting: 0 };
    byStepKg.set(p.assemblyStep, { steel: s.steel + steel, sheeting: s.sheeting + sheeting });
  }
  const byFloor: WeightSummaryFloorRow[] = [...byFloorKg.entries()]
    .map(([floor, kg]) => ({ floor, steelKg: round(kg.steel, 1), sheetingKg: round(kg.sheeting, 1) }))
    .sort((a, b) => a.floor.localeCompare(b.floor));
  const stepTitle = new Map(ASSEMBLY_SEQUENCE.map((a) => [a.step, a.title] as const));
  const byAssembly: WeightSummaryAssemblyRow[] = [...byStepKg.entries()]
    .map(([step, kg]) => ({
      step,
      title: stepTitle.get(step) ?? `Step ${step}`,
      steelKg: round(kg.steel, 1),
      sheetingKg: round(kg.sheeting, 1),
    }))
    .sort((a, b) => a.step - b.step);

  const boqSteelKg = boq ? round(boq.totals.totalSteelKg, 1) : null;
  // The non-steel remainder of the priced tonnage — read off the BOQ totals, not re-derived.
  const boqSheetingKg = boq ? round(boq.totals.totalWeightKg - boq.totals.totalSteelKg, 1) : null;
  const deltaKg = boqSteelKg != null ? round(modelSteelKg - boqSteelKg, 1) : null;
  const reconciled = boqSteelKg != null && deltaKg != null
    && Math.abs(deltaKg) <= Math.max(1, boqSteelKg * 0.01);
  const sheetingDelta = boqSheetingKg != null ? round(modelSheetingKg - boqSheetingKg, 1) : null;
  return {
    byFloor, byAssembly,
    modelSteelKg: round(modelSteelKg, 1),
    boqSteelKg, deltaKg, reconciled,
    modelSheetingKg: round(modelSheetingKg, 1),
    boqSheetingKg,
    sheetingRemark: boqSheetingKg == null
      ? ""
      : `Sheeting & finishes (cladding, lining, insulation, board, vinyl, roof sheet, ceiling): model ${round(modelSheetingKg, 1)} kg of the priced ${boqSheetingKg} kg${sheetingDelta ? ` (Δ ${sheetingDelta} kg)` : ""}. Counted separately — it is not steel tonnage.`,
    remark: boqSteelKg == null
      ? "No priced BOQ loaded — weights unavailable"
      : reconciled
        ? "Model weight reconciles to the priced BOQ steel total"
        : `Model ${round(modelSteelKg, 1)} kg vs BOQ ${boqSteelKg} kg (Δ ${deltaKg} kg) — some priced steel lines have no placed member`,
  };
}

/* ============================================================ 14. DISPATCH LIST ========= */

export interface DispatchListRow {
  packageId: string;
  description: string;
  floor: string;
  memberCount: number;
  fabrication: string;
  weightKg: number;
}

/**
 * Assembly-wise dispatch (packing) list — every shop-fabricated structural member packed by its
 * erection assembly (falling back to its construction step), with the distributed steel weight.
 */
export function buildDispatchList(model: ColonyModel, boq?: BoqResult | null): DispatchListRow[] {
  const idx = boqLineIndex(boq);
  const places = placementCounts(model);
  const stepTitle = new Map(ASSEMBLY_SEQUENCE.map((a) => [a.step, a.title] as const));
  const shippable = model.parts.filter((p) => STRUCTURAL_KINDS.has(p.kind) || PLATE_KINDS.has(p.kind));
  const groups = groupBy(shippable, (p) => p.assemblyId ?? `step:${p.assemblyStep}`);
  const rows: DispatchListRow[] = [];
  for (const [pid, parts] of groups) {
    const first = parts[0];
    const desc = pid.startsWith("step:") ? stepTitle.get(first.assemblyStep) ?? pid : pid;
    rows.push({
      packageId: pid,
      description: desc ?? pid,
      floor: uniq(parts.map((p) => floorLabel(p.floor))).join(", "),
      memberCount: parts.length,
      fabrication: first.fabrication ?? "shop",
      weightKg: round(parts.reduce((a, p) => a + distributedWeightKg(p, idx, places), 0), 1),
    });
  }
  return rows.sort((a, b) => b.weightKg - a.weightKg || a.packageId.localeCompare(b.packageId));
}

/* ============================================================ 15. FLOOR SHEET SCHEDULE == */

export interface FloorSheetScheduleRow {
  /** Laying sequence mark, "S01" … */
  mark: string;
  no: number;
  /** Floors the mark is actually laid on, read back from the placed `floor-sheet` parts. */
  floors: string;
  /** How many decks carry this mark — the same field repeats on every storey. */
  deckCount: number;
  /** 1-based for the drawing; `SheetPlacement.row` / `.col` are 0-based. */
  row: number;
  col: number;
  sizeMm: string;
  widthMm: number;
  lengthMm: number;
  /** "Full", or the axis the sheet had to be cut on. */
  cut: string;
  full: boolean;
  areaM2: number;
  offcutM2: number;
  supportedEdges: number;
  fullySupported: boolean;
  remark: string;
}

/**
 * Every 8'×4' deck sheet in laying sequence, with its cut size, offcut and edge support.
 *
 * The layout is solved ONCE for the deck footprint and then laid on every UPPER storey — the ground
 * floor bears on the filled plinth and carries no sheet field — so a row's area is one sheet on ONE
 * deck. `floors` and `deckCount` are read back from the placed `floor-sheet` parts rather than
 * multiplied out, so the schedule states how many times that sheet is really cut — and a
 * mark the layout produced but the model never placed is kept and flagged, never dropped.
 *
 * SETTING-OUT, NOT A PURCHASE: these sheets carry no BOQ line. The priced `floor:board` area remains
 * the source of truth for the deck's cost; this says how that area is cut and laid.
 */
export function buildFloorSheetSchedule(model: ColonyModel): FloorSheetScheduleRow[] {
  const deck = model.deck;
  if (!deck) return [];
  const placedByMark = groupBy(
    model.parts.filter((p) => p.kind === "floor-sheet"),
    (p) => p.spec?.sheetMark ?? p.partMark ?? "",
  );
  return deck.sheets.map((s) => {
    const placed = placedByMark.get(s.mark) ?? [];
    const remarks: string[] = [];
    if (!s.fullySupported) {
      remarks.push(
        `Only ${s.supportedEdges} of 4 edges bear on steel — the free edge needs a bearer under it`,
      );
    }
    if (!placed.length) remarks.push("Set out by the layout but not placed in the model");
    return {
      mark: s.mark,
      no: s.no,
      floors: uniq(placed.map((p) => floorLabel(p.floor))).join(", ") || "—",
      deckCount: placed.length,
      row: s.row + 1,
      col: s.col + 1,
      sizeMm: `${s.widthMm} × ${s.lengthMm}`,
      widthMm: s.widthMm,
      lengthMm: s.lengthMm,
      cut: s.full ? "Full" : `Cut (${s.cutOn ?? "—"})`,
      full: s.full,
      areaM2: round(s.areaM2, 3),
      offcutM2: round(s.offcutM2, 3),
      supportedEdges: s.supportedEdges,
      fullySupported: s.fullySupported,
      remark: remarks.join("; "),
    };
  });
}

/* ============================================================ 16. SHEET ORDERING SUMMARY = */

export interface SheetSummaryRow {
  group: string;
  /** Check code (SL-1 …) on a check row; "" on a figure row. */
  code: string;
  item: string;
  /** Pre-formatted, because this one column carries areas, counts, millimetres and percentages. */
  figure: string;
  /** "PASS" / "FAIL" on a check row; "" on a figure row. */
  status: string;
  detail: string;
}

/**
 * The ordering + checking summary behind the sheet schedule.
 *
 * Quantity is reported THREE ways on purpose — one number would hide whether offcuts get re-used, and
 * the gap between the three is the honest measure of how much the frame's spacing is costing. The
 * spacing, bearing and bearer figures sit alongside them because they are the same decision: a
 * sheet-modular frame buys fewer sheets AND needs fewer added members.
 *
 * Every figure here is engineering detail. The priced `floor:board` line is still what the deck costs.
 */
export function buildSheetSummary(model: ColonyModel): SheetSummaryRow[] {
  const d = model.deck;
  if (!d) return [];
  /* Read the deck count back from the sheets the model actually PLACED, the same way
   * `buildFloorSheetSchedule` does, rather than trusting `meta.floors`. The sheet field goes on the
   * UPPER decks only (the ground floor bears on the filled plinth), so on a G+2 colony this is 2,
   * not 3 — and on a single-storey colony it is honestly 0, so the multiplied ORDER row below says
   * to buy nothing rather than a deck's worth of sheets nobody will lay. */
  const deckFloors = new Set<number>();
  for (const p of model.parts) if (p.kind === "floor-sheet") deckFloors.add(p.floor ?? 0);
  const decks = deckFloors.size;
  const fig = (v: number, dp = 2): string => v.toFixed(dp);
  const figure = (group: string, item: string, value: string, detail: string): SheetSummaryRow =>
    ({ group, code: "", item, figure: value, status: "", detail });

  const rows: SheetSummaryRow[] = [
    figure("Deck & sheet module", "Total flooring area (one deck)", `${fig(d.deckAreaM2)} m²`,
      "The area the sheets have to cover on a single storey."),
    figure("Deck & sheet module", "Deck levels (sheeted)", `${decks}`,
      deckFloors.has(0)
        ? "The identical sheet field is laid on EVERY storey including the ground floor (the "
          + "per-project ground-floor sheet option is on), so every figure below repeats per level."
        : "The identical sheet field is laid on each UPPER storey only — the ground floor bears on the "
          + "filled plinth and carries no 8'×4' field — so every figure below repeats per sheeted level."),
    figure("Deck & sheet module", "Total sheeted area (all levels)", `${fig(d.deckAreaM2 * decks)} m²`,
      "Upper decks only. The priced floor:board line still covers every storey including the ground "
      + "floor; this figure never adds to it."),
    figure("Deck & sheet module", "Sheet module", d.moduleLabel,
      `Nominal ${Math.round(d.longMm)} × ${Math.round(d.shortMm)} mm.`),
    figure("Deck & sheet module", "Area of one sheet", `${fig(d.sheetAreaM2, 3)} m²`, ""),
    figure("Deck & sheet module", "Sheet field", `${d.rows} rows × ${d.cols} columns`,
      `Sheets are numbered S01… row by row from the origin corner. Orientation: ${d.orientation}.`),

    figure("Sheet count (one deck)", "Full sheets", `${d.fullCount}`, "Laid whole, no cutting."),
    figure("Sheet count (one deck)", "Cut sheets", `${d.cutCount}`, "Cut to close the perimeter."),
    figure("Sheet count (one deck)", "Laid positions", `${d.laidCount}`, "Full + cut."),
    figure("Sheet count (one deck)", "Area actually laid", `${fig(d.laidAreaM2)} m²`,
      "Equals the deck area when the field closes completely."),
    figure("Sheet count (one deck)", "Offcut generated", `${fig(d.offcutAreaM2)} m²`,
      "Everything left on the bench after the cut sheets are made."),
    figure("Sheet count (one deck)", "Re-usable offcut", `${fig(d.reusableOffcutM2)} m²`,
      "Offcut whose widest leftover strip is still a workable width."),
    figure("Sheet count (one deck)", "Unusable scrap", `${fig(d.wasteAreaM2)} m²`,
      "Offcut too narrow to lay anywhere — the real waste."),

    /* FOUR DISTINCT FIGURES, deliberately never collapsed into one. Each answers a different
     * question, and quoting only the last one would hide the assumption it rests on. */
    figure("Ordering quantity (ONE deck)", "1 · Physical placement (no offcut re-use)", `${d.sheetsIfNoReuse}`,
      "One fresh sheet per laid position — what the site actually handles. The safe figure when "
      + "offcuts are not tracked or cannot be carried between bays."),
    figure("Ordering quantity (ONE deck)", "2 · Whole sheets recovered from offcut", `${d.sheetsIfNoReuse - d.purchaseSheets}`,
      /* Quote the credited AREA as the whole-sheet equivalent actually used, not the 2-dp rounded
       * offcut total: re-deriving the count from a rounded area lands one sheet low in about 0.2% of
       * deck geometries, and the whole point of splitting this into four numbered figures is that a
       * reader can check the arithmetic by hand. */
      `The optimisation step: ${fig((d.sheetsIfNoReuse - d.purchaseSheets) * d.sheetAreaM2)} m² of the `
      + `${fig(d.reusableOffcutM2)} m² re-usable offcut is credited back — only in WHOLE-sheet `
      + "equivalents, because a part sheet cannot be ordered."),
    figure("Ordering quantity (ONE deck)", "3 · Area-only theoretical minimum", `${d.sheetsByAreaOnly}`,
      "ceil(deck area ÷ sheet area). A floor the arithmetic can never go below, and one no real cutting "
      + "plan achieves — shown so the recommendation can be judged against it."),
    figure("Ordering quantity (ONE deck)", "4 · RECOMMENDED ORDER (per deck)", `${d.purchaseSheets}`,
      `Figure 1 less figure 2, never below figure 3 (${d.sheetsIfNoReuse} − ${d.sheetsIfNoReuse - d.purchaseSheets} `
      + `→ ${d.purchaseSheets}, floor ${d.sheetsByAreaOnly}). Assumes offcuts ARE sorted and re-used on the same deck; `
      + "if they will not be, order figure 1 instead. ORDERING GUIDANCE ONLY — the priced floor:board "
      + "line remains what the deck costs."),
    /* THE NUMBER A BUYER ACTUALLY ORDERS AGAINST. Every figure above is for one storey, because the
     * layout is solved once and repeated — so on a G+1 or G+2 job the per-deck recommendation is a
     * third to a half of what the building needs. Stating the multiplied total explicitly is the
     * difference between a correct order and a site that runs out of decking. */
    figure("Ordering quantity (WHOLE BUILDING)", "5 · ORDER FOR THE BUILDING", `${d.purchaseSheets * decks}`,
      `${d.purchaseSheets} sheets per deck × ${decks} sheeted deck level(s)${deckFloors.has(0)
        ? " — the ground floor included (its sheet option is on for this project)"
        : " — upper storeys only, the ground floor bears on the plinth and takes none"}. `
      + `This is the procurement figure — every other row in this schedule describes ONE storey. `
      + `Still ordering guidance only: the priced floor:board line remains what the deck costs.`),
    figure("Ordering quantity (WHOLE BUILDING)", "Placement total (no offcut re-use)", `${d.sheetsIfNoReuse * decks}`,
      `${d.sheetsIfNoReuse} × ${decks} sheeted deck level(s) — order this instead if offcuts will not be sorted and re-used.`),

    figure("Ordering quantity (ONE deck)", "Wastage on the recommendation", `${fig(d.wastagePct, 1)} %`,
      `${fig(d.purchaseSheets * d.sheetAreaM2)} m² bought against a ${fig(d.deckAreaM2)} m² deck.`),

    figure("Support & bearing", "Support spacing (actual)", `${fig(d.spacing.actualMm, 1)} mm`,
      "Measured from the member lines the priced frame actually provides."),
    figure("Support & bearing", "Support spacing (recommended)", `${fig(d.spacing.recommendedMm, 1)} mm`,
      d.spacing.note),
    figure("Support & bearing", "Spacing divides the sheet", d.spacing.modular ? "Yes" : "No",
      d.spacing.modular
        ? "Every sheet joint lands on a member."
        : "Sheet joints fall between members — bearers are the interim fix, re-spacing is the cure."),
    figure("Support & bearing", "Supports per sheet width", `${d.spacing.supportsPerSheetWidth}`,
      "Bays across the sheet dimension crossing the joists."),
    figure("Support & bearing", "Edge bearing at a joint", `${fig(d.edgeBearingMm, 1)} mm`,
      `Each sheet at a joint landing on a member (minimum ${MIN_EDGE_BEARING_MM} mm for both sheets to `
      + "bear and be screwed on their own steel)."),
    figure("Support & bearing", "Support lines across the deck", `${d.supportLineCount.acrossDeck}`,
      "Including any bearer the layout had to add."),
    figure("Support & bearing", "Support lines along the deck", `${d.supportLineCount.alongDeck}`,
      "Including any bearer the layout had to add."),
    figure("Support & bearing", "Bearer lines added", `${d.bearers.length}`,
      "Members the layout proves are needed because a sheet joint has no steel under it."),
    figure("Support & bearing", "Bearers avoidable by re-spacing", `${d.bearersAvoidableBySpacing}`,
      "Bearers a sheet-modular joist spacing would make unnecessary altogether."),
    figure("Support & bearing", "Sheets short of full edge support", `${d.unsupportedSheets}`,
      "After the bearers are added this should be zero."),
  ];

  for (const c of d.checks) {
    rows.push({
      group: "Engineering checks",
      code: c.code,
      item: c.title,
      figure: c.pass ? "PASS" : "FAIL",
      status: c.pass ? "PASS" : "FAIL",
      detail: c.detail,
    });
  }
  return rows;
}

/* ============================================================ 17. PANEL SEATING SCHEDULE = */

export interface PanelSeatingScheduleRow {
  /** Section heading — the configured system, or the trade-thickness comparison. */
  group: string;
  thicknessMm: number;
  /** Seat position for a configured row; "All four seats" on a comparison row. */
  position: string;
  label: string;
  sectionCall: string;
  slotWidthMm: number;
  clearanceMm: number;
  /** Leg / flange length (mm); null on a comparison row, which spans four different legs. */
  legMm: number | null;
  minInsertionMm: number;
  gaugeMm: number;
  fixingPitchMm: number;
  role: string;
  loadPath: string;
  /** true ⇒ this row is the thickness the calculator is configured with. */
  configured: boolean;
}

/**
 * How the configured PUF panel is held by the MS framework, seat by seat — then the same two governing
 * dimensions across every trade thickness.
 *
 * The comparison half is the point of the schedule: nothing here is a lookup, the seating geometry is
 * DERIVED from the thickness, so a reader can see immediately what changes when the panel changes and
 * an unlisted thickness still produces a buildable detail. The configured thickness is flagged in the
 * comparison too, so the two halves are visibly the same system.
 *
 * The seating sections are un-priced engineering detail; panel AREA is priced by the wall lines.
 */
export function buildPanelSeatingSchedule(model: ColonyModel): PanelSeatingScheduleRow[] {
  const spec = model.panelSupport;
  if (!spec) return [];

  const rows: PanelSeatingScheduleRow[] = spec.seats.map((seat) => ({
    group: `Configured system — ${spec.thicknessMm} mm panel`,
    thicknessMm: spec.thicknessMm,
    position: seat.position,
    label: seat.label,
    sectionCall: seat.sectionCall,
    slotWidthMm: seat.internalWidthMm,
    clearanceMm: spec.clearanceMm,
    legMm: seat.legMm,
    minInsertionMm: seat.minInsertionMm,
    gaugeMm: seat.gaugeMm,
    fixingPitchMm: spec.fixingPitchMm,
    role: seat.role,
    loadPath: seat.loadPath,
    configured: true,
  }));

  for (const t of buildPanelThicknessTable()) {
    const [base, jamb, head] = t.seats;
    rows.push({
      group: "Support arrangement by panel thickness",
      thicknessMm: t.thicknessMm,
      position: "All four seats",
      label: `${t.thicknessMm} mm panel`,
      sectionCall:
        `U ${base.legMm} / C ${jamb.legMm} / angle ${head.legMm} mm legs @ ${t.slotWidthMm} mm slot`,
      slotWidthMm: t.slotWidthMm,
      clearanceMm: t.clearanceMm,
      legMm: null,
      minInsertionMm: t.minInsertionMm,
      gaugeMm: base.gaugeMm,
      fixingPitchMm: t.fixingPitchMm,
      role: t.note,
      loadPath:
        `Insertion is scaled from the thickness and floored at ${MIN_INSERTION_MM} mm, so a thicker, `
        + "heavier panel always sits proportionally deeper inside the steel.",
      configured: t.thicknessMm === spec.thicknessMm,
    });
  }
  return rows;
}
