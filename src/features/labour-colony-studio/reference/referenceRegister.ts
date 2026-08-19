/**
 * LABOUR COLONY — REFERENCE GENERAL-ARRANGEMENT DRAWING: schedules + material register (pure).
 *
 * The data layer behind the reference GA sheet (the single-sheet "General Arrangement Layout" issue
 * modelled on a consultant's tender drawing: plans, four elevations, an opening schedule, a title
 * block — and a COMPLETE material register naming the exact model of every item that goes into the
 * building).
 *
 * NOTHING HERE IS CALCULATED. Every quantity is READ from a source that already owns it:
 *
 *   • `boqResult.purchase`      — the priced Material BOQ's own purchase register: one row per
 *                                 material with its exact section / thickness / grade, the net
 *                                 take-off, wastage, the quantity to buy and the stock units.
 *   • `boqResult.cuttingList`   — every steel member's cut length × pieces (this is where "the rafter
 *                                 is a C section and the pipe is an SHS" is stated as fact).
 *   • `model.rafterSupport`     — the rafter cleat / C-purlin / MS-tube support system take-off:
 *                                 cleat plates, cleat bolts, web bolts, nuts, washers, purlin and
 *                                 tube pieces, ceiling boards, roof panels, screws.
 *   • `model.pufLock`           — the PUF panel bottom locking system take-off: base plates, anchor
 *                                 bolts, nuts, washers, paired C-purlins, welds, consumables.
 *   • `model.parts`             — the synthesized connection hardware (bolts / nuts / washers) that
 *                                 no priced line itemises, aggregated by its own spec.
 *   • `civilResult.boq`         — the priced civil substructure.
 *
 * so the reference sheet can never state a quantity the calculator does not already hold. A source
 * that is switched off or not yet priced produces NO rows and an explained empty state — never an
 * invented one.
 *
 * Pure data — no React, no DOM — so it stays server-safe and unit-testable.
 */

import type { BoqResult } from "@/lib/boq/types";
import type { LabourColonyResult } from "@/lib/quotation/labourColony";
import type { CivilWorkResult } from "@/lib/quotation/labourColonyCivil";
import type { ColonyModel, ColonyPart } from "../model/types";
import { buildRailingSchedule, buildStaircaseSchedule } from "../reports/schedules";

const round = (n: number, dp = 2): number => {
  const f = 10 ** dp;
  return Math.round((Number.isFinite(n) ? n : 0) * f) / f;
};

const nz = (n: number | null | undefined): number => (Number.isFinite(n as number) ? (n as number) : 0);

const n0 = (v: number): string => Math.round(v).toLocaleString("en-IN");

/* ═════════════════════════════════════════════ 1. SCHEDULE OF DOORS, WINDOWS & VENTILATORS ═════ */

export type OpeningKind = "door" | "window" | "ventilator";

/** One row of the "SCHEDULE OF DOORS, WINDOWS & VENTILATOR" block on the reference sheet. */
export interface OpeningScheduleRow {
  /** Schedule mark — D / D1 / W / W1 …, unique within its kind. */
  mark: string;
  kind: OpeningKind;
  /** "DOOR — D", as the schedule's TYPE column prints it. */
  type: string;
  /** "1000 × 2100 mm Ht." */
  sizeMm: string;
  widthMm: number;
  heightMm: number;
  /** The material the priced BOQ actually bills this opening as. */
  material: string;
  qty: number;
  /** Where the row came from — the priced BOQ line, or the model when nothing is priced yet. */
  source: string;
}

/** Parse the "1000x2100" tail of an `openings:*` take-off id. */
function sizeFromOpeningId(id: string, prefix: string): { w: number; h: number } | null {
  if (!id.startsWith(prefix)) return null;
  const tail = id.slice(prefix.length);
  const m = /^(\d+)x(\d+)$/.exec(tail);
  if (!m) return null;
  return { w: Number(m[1]), h: Number(m[2]) };
}

const sizeLabel = (w: number, h: number): string => `${Math.round(w)} × ${Math.round(h)} mm Ht.`;

/**
 * The opening schedule. Read from the PRICED take-off's own door-leaf / window lines (which are
 * already grouped by size), falling back to the model's door / window parts when nothing has been
 * priced yet. Ventilators appear only when a priced line for one exists — the colony take-off does
 * not currently emit any, and an empty schedule column is honest where an invented row is not.
 */
export function buildOpeningSchedule(model: ColonyModel, boq: BoqResult | null | undefined): OpeningScheduleRow[] {
  const rows: OpeningScheduleRow[] = [];

  const fromBoq = (prefix: string, kind: OpeningKind): boolean => {
    let found = false;
    for (const line of boq?.lines ?? []) {
      if (!line.enabled) continue;
      const size = sizeFromOpeningId(line.id, prefix);
      if (!size || line.qty <= 0) continue;
      found = true;
      rows.push({
        mark: "",
        kind,
        type: "",
        sizeMm: sizeLabel(size.w, size.h),
        widthMm: size.w,
        heightMm: size.h,
        material: line.material || line.spec || "—",
        qty: line.qty,
        source: `Priced BOQ · ${line.id}`,
      });
    }
    return found;
  };

  const doorsPriced = fromBoq("openings:door-leaf:", "door");
  const windowsPriced = fromBoq("openings:window:", "window");
  fromBoq("openings:ventilator:", "ventilator");

  /* Model fallback — only for a kind the priced BOQ did not cover, so a half-priced set never mixes
   * a priced count with a modelled one inside the same schedule. */
  const fromModel = (kind: OpeningKind, partKind: ColonyPart["kind"], material: string) => {
    const groups = new Map<string, { w: number; h: number; qty: number }>();
    for (const p of model.parts) {
      if (p.kind !== partKind) continue;
      const w = Math.round(nz(p.spec.widthMm));
      const h = Math.round(nz(p.spec.heightMm));
      if (w <= 0 || h <= 0) continue;
      const k = `${w}x${h}`;
      const g = groups.get(k) ?? { w, h, qty: 0 };
      g.qty += 1;
      groups.set(k, g);
    }
    for (const g of groups.values()) {
      rows.push({
        mark: "", kind, type: "",
        sizeMm: sizeLabel(g.w, g.h),
        widthMm: g.w, heightMm: g.h,
        material,
        qty: g.qty,
        source: "Model take-off (Material BOQ not priced yet)",
      });
    }
  };

  if (!doorsPriced) fromModel("door", "door", "Door leaf — see Material BOQ");
  if (!windowsPriced) fromModel("window", "window", "Window — see Material BOQ");

  /* Marks: largest quantity first, so the dominant type is D1 / W1 on the drawing. A single size
   * keeps the bare letter, exactly as the reference sheet prints it. */
  const letter: Record<OpeningKind, string> = { door: "D", window: "W", ventilator: "V" };
  const name: Record<OpeningKind, string> = { door: "DOOR", window: "WINDOW", ventilator: "VENTILATOR" };
  const out: OpeningScheduleRow[] = [];
  for (const kind of ["door", "window", "ventilator"] as const) {
    const of = rows.filter((r) => r.kind === kind).sort((a, b) => b.qty - a.qty || b.widthMm - a.widthMm);
    of.forEach((r, i) => {
      const mark = of.length === 1 ? letter[kind] : `${letter[kind]}${i + 1}`;
      out.push({ ...r, mark, type: `${name[kind]} — ${mark}` });
    });
  }
  return out;
}

/* ═════════════════════════════════════════════════════════════ 2. ENVELOPE / CLADDING CALLOUTS ══ */

/** A drawing callout naming the exact covering a face carries. */
export interface EnvelopeCallout {
  id: "wall" | "roof" | "floor" | "ceiling";
  /** "Wall Cladding" — the leader text on the elevation. */
  label: string;
  /** "50 mm thick PUF sandwich panel" — the exact model, in brackets under the label. */
  detail: string;
}

/**
 * The cladding callouts the elevations carry. The wall panel is the calculator's OWN configured panel
 * (type + thickness); the roof panel is the rafter-support system's configured roof panel when that
 * system is on, else the priced roof-sheet line. Nothing is assumed — a source that cannot answer
 * simply produces no callout.
 */
export function buildEnvelopeCallouts(
  model: ColonyModel,
  result: LabourColonyResult,
  boq: BoqResult | null | undefined,
): EnvelopeCallout[] {
  const out: EnvelopeCallout[] = [];
  const cfg = result.config;

  if (cfg.panelThicknessMm > 0) {
    out.push({
      id: "wall",
      label: "Wall Cladding",
      detail: `${cfg.panelThicknessMm} mm thick ${cfg.panelType} sandwich panel`,
    });
  }

  const roofPanel = model.rafterSupport?.config.enabled ? model.rafterSupport.config.roofPanel : null;
  if (roofPanel && roofPanel.thicknessMm > 0) {
    out.push({
      id: "roof",
      label: "Roof Cladding",
      detail: `${roofPanel.thicknessMm} mm thick ${roofPanel.panelType} panel · ${roofPanel.coverWidthMm} mm cover width`,
    });
  } else {
    const roofLine = (boq?.lines ?? []).find((l) => l.enabled && l.section === "roof" && l.netAreaSqm != null && /sheet|panel/i.test(l.material));
    if (roofLine) {
      out.push({ id: "roof", label: "Roof Cladding", detail: `${roofLine.material} · ${roofLine.spec}` });
    }
  }

  const ceiling = model.rafterSupport?.config.enabled ? model.rafterSupport.config.ceilingSheet : null;
  if (ceiling && ceiling.thicknessMm > 0) {
    out.push({
      id: "ceiling",
      label: "Ceiling",
      detail: `${ceiling.thicknessMm} mm ${ceiling.material} · ${ceiling.sheetLengthMm} × ${ceiling.sheetWidthMm} mm board`,
    });
  }

  return out;
}

/* ═══════════════════════════════════════════ 2b. CROSS BRACING + ITS NUT-BOLT SUPPORT ══════════ */

/**
 * The cross-bracing note the elevations carry: what section the diagonal is, and the nut-bolt
 * assembly that fixes each of its ends.
 *
 * BOTH halves are read, never assumed. The section comes off the priced brace line (or, unpriced,
 * off the modelled brace's own spec); the fastener comes from `result.bolts` — the calculator's own
 * "cross support + connection" bolt count, which is where `crossSupportBolts` is derived as
 * `modules × crossSupportsPerModule × boltsPerEnd × 2`. That norm is the only place the bolts-per-end
 * figure exists, so it is the only place the drawing may take it from.
 */
export interface BracingNote {
  /** "ISA 50 × 50 × 5 mm" — the diagonal's section. */
  section: string;
  /** "M12" — the nut-bolt assembly size. */
  boltSize: string;
  boltsPerEnd: number;
  /** Bolts attributed to cross supports across the whole building. */
  crossSupportBolts: number;
  connectionBolts: number;
  totalBolts: number;
  unitWeightKg: number;
  totalWeightKg: number;
  /** Braces the model placed, all faces. */
  braceCount: number;
}

export function buildBracingNote(
  model: ColonyModel,
  result: LabourColonyResult,
  boq: BoqResult | null | undefined,
): BracingNote | null {
  const braces = model.parts.filter((p) => p.kind === "brace");
  if (braces.length === 0) return null;

  const pricedBrace = (boq?.lines ?? []).find((l) => l.enabled && /:brace:/.test(l.id));
  const section = pricedBrace
    ? `${pricedBrace.material}${pricedBrace.spec ? ` · ${pricedBrace.spec}` : ""}`
    : braces[0].spec.sectionSize ?? "—";

  const b = result.bolts;
  return {
    section,
    boltSize: b.size,
    boltsPerEnd: result.norms.boltsPerEnd,
    crossSupportBolts: b.crossSupportBolts,
    connectionBolts: b.connectionBolts,
    totalBolts: b.totalBolts,
    unitWeightKg: b.unitWeightKg,
    totalWeightKg: b.totalWeightKg,
    braceCount: braces.length,
  };
}

/* ══════════════════════════════════════════════════════ 3. THE COMPLETE MATERIAL REGISTER ═══════ */

/** One line of the material register — an item, its EXACT model, and how much of it is used. */
export interface RegisterRow {
  /** What it is: "PUF wall panel", "Roof C purlin", "Cleat bolt". */
  item: string;
  /** The EXACT model: section designation + thickness + grade / finish. */
  model: string;
  uom: string;
  qty: number;
  /** Decimal places the quantity is meaningful to (nos → 0, m/m²/kg → 2). */
  qtyDp: number;
  unitWeightKg: number | null;
  totalWeightKg: number | null;
  /** What to actually order — stock bars, sheets, wastage — when the source knows. */
  purchase: string;
  /** Which owning source produced this row, so every number can be traced back. */
  source: string;
}

export interface RegisterGroup {
  id: string;
  title: string;
  /** One line explaining what the group covers and where it is read from. */
  note: string;
  rows: RegisterRow[];
  totalWeightKg: number;
  /** Present when the group is deliberately empty — rendered instead of the table. */
  emptyReason?: string;
}

const groupOf = (id: string, title: string, note: string, rows: RegisterRow[], emptyReason?: string): RegisterGroup => ({
  id,
  title,
  note,
  rows,
  totalWeightKg: round(rows.reduce((s, r) => s + nz(r.totalWeightKg), 0), 2),
  emptyReason: rows.length === 0 ? emptyReason : undefined,
});

/* ---------------------------------------------------------------- 3.1 priced purchase register */

function purchaseGroup(boq: BoqResult | null | undefined): RegisterGroup {
  const rows: RegisterRow[] = [];
  for (const p of boq?.purchase ?? []) {
    if (p.purchaseQty <= 0) continue;
    const stock = p.stockUnits != null && p.stockUnitLabel
      ? `${p.stockUnits} ${p.stockUnitLabel}`
      : `${round(p.purchaseQty, 2)} ${p.uom}`;
    const waste = p.wastagePercent > 0 ? ` (incl. ${p.wastagePercent}% wastage on ${round(p.netQty, 2)} ${p.uom})` : "";
    rows.push({
      item: p.material,
      model: p.spec || "—",
      uom: p.uom,
      qty: round(p.purchaseQty, 2),
      qtyDp: p.uom === "nos" || p.uom === "sheet" ? 0 : 2,
      unitWeightKg: null,
      totalWeightKg: round(p.totalWeightKg, 2),
      purchase: `${stock}${waste}`,
      source: "Priced Material BOQ · purchase register",
    });
  }
  return groupOf(
    "purchase",
    "Material register — every material, exact model, quantity to buy",
    "The priced Material BOQ's own purchase register: net take-off + wastage = quantity to order, with the stock bars / sheets that quantity becomes.",
    rows,
    "Open the Material BOQ tab once to price the take-off — this register is that tab's purchase list, not a second calculation.",
  );
}

/* ---------------------------------------------------------------- 3.2 member cutting list */

function cuttingGroup(boq: BoqResult | null | undefined): RegisterGroup {
  const rows: RegisterRow[] = [];
  for (const c of boq?.cuttingList ?? []) {
    if (c.qty <= 0) continue;
    rows.push({
      item: c.member,
      model: `${c.material}${c.spec ? ` · ${c.spec}` : ""}`,
      uom: "nos",
      qty: c.qty,
      qtyDp: 0,
      unitWeightKg: c.qty > 0 ? round(c.weightKg / c.qty, 3) : null,
      totalWeightKg: round(c.weightKg, 2),
      purchase: `${round(c.cutLengthM, 3)} m cut length · ${round(c.totalLengthM, 2)} m total`,
      source: `Priced Material BOQ · cutting list · ${c.drawingRef || c.section}`,
    });
  }
  return groupOf(
    "cutting",
    "Structural member cutting list — section, cut length and pieces",
    "Every priced steel member: which section it is rolled from, the length each piece is cut to, and how many pieces.",
    rows,
    "Price the Material BOQ to produce the cutting list.",
  );
}

/* ---------------------------------------------------------------- 3.3 rafter support system */

function rafterGroup(model: ColonyModel): RegisterGroup {
  const rs = model.rafterSupport;
  if (!rs || !rs.config.enabled) {
    return groupOf(
      "rafter-support",
      "Rafter support system — cleat, C purlin, MS pipe and fasteners",
      "The bolted cleat on each rafter, the C purlin it carries, and the MS tube bolted through the purlin web that carries the covering.",
      [],
      "The rafter support system is switched off for this project, so it contributes no material.",
    );
  }
  const c = rs.config;
  const t = rs.takeoff;
  const rows: RegisterRow[] = [];
  const src = "Engineering model · rafter support take-off";

  if (t.cleats > 0) {
    rows.push({
      item: `Rafter cleat plate (${c.cleat.mark})`,
      model: `${c.cleat.lengthMm} × ${c.cleat.widthMm} × ${c.cleat.thicknessMm} mm plate · ${c.cleat.material} ${c.cleat.grade} · ${c.cleat.finish}`,
      uom: "nos", qty: t.cleats, qtyDp: 0,
      unitWeightKg: round(t.cleatGrossUnitKg, 3),
      totalWeightKg: round(t.cleatGrossKg, 2),
      purchase: `${c.cleat.holeCount} × ⌀${c.cleat.boltHoleDiaMm} mm holes per cleat`,
      source: src,
    });
  }
  if (t.purlinPieces > 0) {
    rows.push({
      item: `Roof / ceiling C purlin (${c.purlin.partMark})`,
      model: `${c.purlin.designation} · ${c.purlin.grade} · ${c.purlin.finish}`,
      uom: "nos", qty: t.purlinPieces, qtyDp: 0,
      unitWeightKg: round(t.purlinKgPerM * (c.purlin.lengthMm / 1000), 3),
      totalWeightKg: round(t.purlinKg, 2),
      purchase: `${c.purlin.lengthMm} mm standard piece · ${round(t.purlinRunningLengthM, 2)} m running length · ${round(t.purlinKgPerM, 3)} kg/m`,
      source: src,
    });
  }
  if (t.tubePieces > 0) {
    rows.push({
      item: `MS pipe / tube on purlin web (${c.tube.partMark})`,
      model: `${c.tube.designation} · ${c.tube.grade} · ${c.tube.finish}`,
      uom: "nos", qty: t.tubePieces, qtyDp: 0,
      unitWeightKg: round(t.tubeKgPerM * (c.tube.lengthMm / 1000), 3),
      totalWeightKg: round(t.tubeKg, 2),
      purchase: `${c.tube.lengthMm} mm standard piece · ${round(t.tubeRunningLengthM, 2)} m running length · ${round(t.tubeKgPerM, 3)} kg/m`,
      source: src,
    });
  }
  if (t.nogginPieces > 0) {
    rows.push({
      item: "Cross noggin between tubes",
      model: `${c.tube.designation} · ${c.tube.grade}`,
      uom: "nos", qty: t.nogginPieces, qtyDp: 0,
      unitWeightKg: null,
      totalWeightKg: round(t.nogginKg, 2),
      purchase: `${round(t.nogginRunningLengthM, 2)} m running · cut from ${t.nogginStockPieces} × 6 m stock`,
      source: src,
    });
  }
  if (t.cleatBolts > 0) {
    rows.push({
      item: "Cleat-to-rafter bolt",
      model: `M${c.bolt.diameterMm} × ${t.requiredCleatBoltLengthMm || c.bolt.lengthMm} mm · grade ${c.bolt.grade}`,
      uom: "nos", qty: t.cleatBolts, qtyDp: 0,
      unitWeightKg: round(t.cleatBoltUnitKg, 4),
      totalWeightKg: round(t.cleatBoltUnitKg * t.cleatBolts, 2),
      purchase: `${c.bolt.perCleat} per cleat · ${c.bolt.tighteningNote}`,
      source: src,
    });
  }
  if (t.webBolts > 0) {
    rows.push({
      item: "Tube-to-purlin-web bolt",
      model: `M${c.bolt.diameterMm} × ${t.requiredWebBoltLengthMm || c.bolt.webLengthMm} mm · grade ${c.bolt.grade}`,
      uom: "nos", qty: t.webBolts, qtyDp: 0,
      unitWeightKg: round(t.webBoltUnitKg, 4),
      totalWeightKg: round(t.webBoltUnitKg * t.webBolts, 2),
      purchase: `${c.tube.boltsPerConnection} per connection @ ${c.tube.boltPitchMm} mm pitch`,
      source: src,
    });
  }
  if (t.nuts > 0) {
    rows.push({
      item: "Hex nut",
      model: `M${c.bolt.diameterMm} · grade ${c.bolt.grade} · ${c.bolt.acrossFlatsMm} mm A/F`,
      uom: "nos", qty: t.nuts, qtyDp: 0,
      unitWeightKg: round(t.nutUnitKg, 4),
      totalWeightKg: round(t.nutKg, 2),
      purchase: `${c.bolt.nutsPerBolt} per bolt`,
      source: src,
    });
  }
  if (t.washers > 0) {
    rows.push({
      item: "Washer",
      model: `⌀${c.bolt.washerOuterDiaMm} × ${c.bolt.washerThicknessMm} mm for M${c.bolt.diameterMm}`,
      uom: "nos", qty: t.washers, qtyDp: 0,
      unitWeightKg: round(t.washerUnitKg, 4),
      totalWeightKg: round(t.washerKg, 2),
      purchase: `${c.bolt.washersPerBolt} per bolt`,
      source: src,
    });
  }
  if (t.ceilingSheets > 0) {
    rows.push({
      item: "Ceiling board",
      model: `${c.ceilingSheet.material} ${c.ceilingSheet.thicknessMm} mm · ${c.ceilingSheet.sheetLengthMm} × ${c.ceilingSheet.sheetWidthMm} mm`,
      uom: "nos", qty: t.ceilingSheets, qtyDp: 0,
      unitWeightKg: round(t.ceilingSheetKgPerSqm * (c.ceilingSheet.sheetLengthMm / 1000) * (c.ceilingSheet.sheetWidthMm / 1000), 3),
      totalWeightKg: round(t.ceilingSheetKg, 2),
      purchase: `${t.ceilingSheetsWhole} whole + ${t.ceilingSheetsCut} cut · ${round(t.ceilingPurchasedAreaSqm, 2)} m² purchased`,
      source: src,
    });
  }
  if (t.roofPanels > 0) {
    rows.push({
      item: "Roof PUF sandwich panel",
      model: `${c.roofPanel.panelType} ${c.roofPanel.thicknessMm} mm · ${c.roofPanel.coverWidthMm} mm cover · ${c.roofPanel.colour} ${c.roofPanel.finish}`,
      uom: "nos", qty: t.roofPanels, qtyDp: 0,
      unitWeightKg: null,
      totalWeightKg: round(t.roofPanelKg, 2),
      purchase: `${t.roofPanelsWhole} whole + ${t.roofPanelsCut} cut · ${round(t.roofPanelPurchasedAreaSqm, 2)} m² purchased · ${round(t.roofPanelKgPerSqm, 2)} kg/m²`,
      source: src,
    });
  }
  if (t.screws > 0) {
    rows.push({
      item: "Fixing screw",
      model: `${c.roofPanel.fixingSpec || c.ceilingSheet.fixingSpec}`,
      uom: "nos", qty: t.screws, qtyDp: 0,
      unitWeightKg: null,
      totalWeightKg: null,
      purchase: `Roof @ ${c.roofPanel.fixingsPerPanelPerSupport} per panel per support · ceiling @ ${c.ceilingSheet.fixingSpacingMm} mm centres`,
      source: src,
    });
  }

  return groupOf(
    "rafter-support",
    "Rafter support system — cleat, C purlin, MS pipe and fasteners",
    "The bolted cleat on each rafter, the C purlin it carries, and the MS tube bolted through the purlin web that carries the covering.",
    rows,
  );
}

/* ---------------------------------------------------------------- 3.4 PUF panel bottom lock */

function pufLockGroup(model: ColonyModel): RegisterGroup {
  const pl = model.pufLock;
  if (!pl || !pl.config.enabled || !pl.takeoff.enabled) {
    return groupOf(
      "puf-lock",
      "PUF panel bottom locking system",
      "The plate / anchor / paired-C-purlin pocket the external PUF wall panels drop into at plinth level.",
      [],
      "The PUF panel bottom locking system is switched off for this project, so it contributes no material.",
    );
  }
  const c = pl.config;
  const t = pl.takeoff;
  const rows: RegisterRow[] = [];
  const src = "Engineering model · PUF lock take-off";

  rows.push({
    item: `Lock base plate (${c.plate.mark})`,
    model: `${c.plate.lengthMm} × ${c.plate.widthMm} × ${c.plate.thicknessMm} mm plate · ${c.plate.material} ${c.plate.grade} · ${c.plate.finish}`,
    uom: "nos", qty: t.plates, qtyDp: 0,
    unitWeightKg: round(t.plateUnitKg, 3),
    totalWeightKg: round(t.plateKg, 2),
    purchase: `${c.plate.holeCount} × ⌀${c.plate.boltHoleDiaMm} mm holes per plate`,
    source: src,
  });
  rows.push({
    item: `Receiving C purlin, paired (${c.purlin.partMark})`,
    model: `${c.purlin.designation} · ${c.purlin.grade} · ${c.purlin.finish}`,
    uom: "nos", qty: t.purlinPieces, qtyDp: 0,
    unitWeightKg: round(t.purlinKgPerM * (c.purlin.lengthMm / 1000), 3),
    totalWeightKg: round(t.purlinKg, 2),
    purchase: `${c.purlin.perPlate} per plate × ${c.purlin.lengthMm} mm · ${round(t.purlinTotalLengthM, 2)} m total · pocket clear gap ${t.pocketClearGapMm} mm for a ${t.panelThicknessMm} mm panel`,
    source: src,
  });
  rows.push({
    item: "Anchor bolt",
    model: `M${c.anchor.diameterMm} × ${c.anchor.lengthMm} mm ${c.anchor.type} · grade ${c.anchor.grade} · ${c.anchor.embedmentMm} mm embedment`,
    uom: "nos", qty: t.bolts, qtyDp: 0,
    unitWeightKg: round(t.boltUnitKg, 4),
    totalWeightKg: round(t.boltKg, 2),
    purchase: `${c.anchor.perPlate} per plate · ${c.anchor.tighteningNote}`,
    source: src,
  });
  rows.push({
    item: "Hex nut",
    model: `M${c.anchor.diameterMm} · grade ${c.anchor.grade}`,
    uom: "nos", qty: t.nuts, qtyDp: 0,
    unitWeightKg: round(t.nutUnitKg, 4),
    totalWeightKg: round(t.nutKg, 2),
    purchase: `${c.anchor.nutsPerBolt} per bolt`,
    source: src,
  });
  rows.push({
    item: "Washer",
    model: `for M${c.anchor.diameterMm} anchor`,
    uom: "nos", qty: t.washers, qtyDp: 0,
    unitWeightKg: round(t.washerUnitKg, 4),
    totalWeightKg: round(t.washerKg, 2),
    purchase: `${c.anchor.washersPerBolt} per bolt`,
    source: src,
  });
  if (t.weldRuns > 0) {
    rows.push({
      item: "Fillet weld — purlin to plate",
      model: `${c.purlin.weldSizeMm} mm ${c.purlin.weldType} weld`,
      uom: "m", qty: round(t.weldTotalLengthM, 2), qtyDp: 2,
      unitWeightKg: round(t.weldKgPerM, 4),
      totalWeightKg: round(t.weldKg, 3),
      purchase: `${t.weldRuns} runs · ${round(t.electrodeKg, 2)} kg electrode`,
      source: src,
    });
  }
  if (t.isolationStripM > 0) {
    rows.push({
      item: "Isolation strip",
      model: "Panel-to-steel isolation strip",
      uom: "m", qty: round(t.isolationStripM, 2), qtyDp: 2,
      unitWeightKg: null, totalWeightKg: null,
      purchase: "Laid in the pocket before the panel is seated",
      source: src,
    });
  }
  if (t.sealantM > 0) {
    rows.push({
      item: "Sealant",
      model: "Pocket sealant bead",
      uom: "m", qty: round(t.sealantM, 2), qtyDp: 2,
      unitWeightKg: null, totalWeightKg: null,
      purchase: `${t.fasteners} pocket fasteners`,
      source: src,
    });
  }

  return groupOf(
    "puf-lock",
    "PUF panel bottom locking system",
    "The plate / anchor / paired-C-purlin pocket the external PUF wall panels drop into at plinth level.",
    rows,
  );
}

/* ---------------------------------------------------------------- 3.5 connection hardware */

const HARDWARE_KINDS: ReadonlySet<ColonyPart["kind"]> = new Set<ColonyPart["kind"]>([
  "bolt", "anchor-bolt", "nut", "washer",
]);

/**
 * Bolts / nuts / washers the priced take-off does not itemise — the connection hardware the model
 * synthesizes as engineering detail. Aggregated across the whole building by the spec written on the
 * part, and flagged as a fabrication estimate rather than a priced quantity.
 */
function hardwareGroup(model: ColonyModel): RegisterGroup {
  const groups = new Map<string, { item: string; model: string; qty: number }>();
  for (const p of model.parts) {
    if (!HARDWARE_KINDS.has(p.kind)) continue;
    const spec = p.spec.boltSpec ?? (p.spec.holeDiaMm ? `for ⌀${p.spec.holeDiaMm} mm hole` : "");
    const item = p.kind === "anchor-bolt" ? "Anchor bolt"
      : p.kind === "bolt" ? "Connection bolt"
        : p.kind === "nut" ? "Hex nut" : "Washer";
    const key = `${item}|${spec}`;
    const g = groups.get(key) ?? { item, model: spec || "—", qty: 0 };
    g.qty += 1;
    groups.set(key, g);
  }
  const rows: RegisterRow[] = [...groups.values()]
    .sort((a, b) => a.item.localeCompare(b.item) || a.model.localeCompare(b.model))
    .map((g) => ({
      item: g.item,
      model: g.model,
      uom: "nos",
      qty: g.qty,
      qtyDp: 0,
      unitWeightKg: null,
      totalWeightKg: null,
      purchase: "Modelled connection hardware — fabrication detail, not a priced line",
      source: "Engineering model · synthesized connections",
    }));

  return groupOf(
    "hardware",
    "Frame connection hardware — bolts, nuts and washers",
    "Base-plate, gusset and splice hardware the model places at every connection. Engineering detail: counted from the drawn connections, never invented into a price.",
    rows,
    "No synthesized connection hardware in this model.",
  );
}

/* ------------------------------------------- 3.5b staircase, hand railing and cross bracing */

/**
 * The three families the reference elevations call out, gathered in one place because that is how
 * they are ordered and erected: the staircase, the hand railing that runs with it and along every
 * veranda, and the cross bracing with the nut-bolt assembly at each end.
 *
 * Reuses the studio's OWN schedule builders (`buildStaircaseSchedule`, `buildRailingSchedule`) rather
 * than recounting parts, so this group and the Reports tab can never disagree.
 */
function stairRailBraceGroup(model: ColonyModel, bracing: BracingNote | null): RegisterGroup {
  const rows: RegisterRow[] = [];
  const src = "Engineering model · staircase / railing schedules";

  for (const s of buildStaircaseSchedule(model)) {
    rows.push({
      item: `Staircase ${s.mark}`,
      model: `${s.flights} flight(s) · ${s.stringers} stringers · ${s.landings} landing(s)`,
      uom: "nos", qty: 1, qtyDp: 0,
      unitWeightKg: null,
      totalWeightKg: s.weightKg > 0 ? round(s.weightKg, 2) : null,
      purchase: `${s.treads} treads · ${s.handrailPosts} handrail posts`,
      source: src,
    });
  }

  for (const r of buildRailingSchedule(model)) {
    if (r.posts === 0 && r.rails === 0 && r.toePlates === 0) continue;
    rows.push({
      item: `Hand railing — ${r.location}`,
      model: `${r.rails} rail run(s)${r.toePlates > 0 ? ` · ${r.toePlates} toe plate(s)` : ""}`,
      uom: r.railLengthM > 0 ? "m" : "nos",
      qty: r.railLengthM > 0 ? round(r.railLengthM, 2) : r.posts,
      qtyDp: r.railLengthM > 0 ? 2 : 0,
      unitWeightKg: null,
      totalWeightKg: r.weightKg > 0 ? round(r.weightKg, 2) : null,
      purchase: `${r.posts} posts`,
      source: src,
    });
  }

  if (bracing) {
    rows.push({
      item: "Cross brace (diagonal)",
      model: bracing.section,
      uom: "nos", qty: bracing.braceCount, qtyDp: 0,
      unitWeightKg: null, totalWeightKg: null,
      purchase: "Priced by length in the cutting list above",
      source: "Engineering model · placed braces",
    });
    rows.push({
      item: "Cross-support nut-bolt assembly",
      model: `${bracing.boltSize} nut-bolt · ${bracing.boltsPerEnd} per brace end`,
      uom: "nos", qty: bracing.crossSupportBolts, qtyDp: 0,
      unitWeightKg: round(bracing.unitWeightKg, 4),
      totalWeightKg: round(bracing.unitWeightKg * bracing.crossSupportBolts, 2),
      purchase: `Part of ${n0(bracing.totalBolts)} total nut-bolts (${n0(bracing.connectionBolts)} connection)`,
      source: "Priced calculation · result.bolts",
    });
    rows.push({
      item: "Module connection nut-bolt assembly",
      model: `${bracing.boltSize} nut-bolt`,
      uom: "nos", qty: bracing.connectionBolts, qtyDp: 0,
      unitWeightKg: round(bracing.unitWeightKg, 4),
      totalWeightKg: round(bracing.unitWeightKg * bracing.connectionBolts, 2),
      purchase: `Whole-building nut-bolt weight ${round(bracing.totalWeightKg, 2)} kg`,
      source: "Priced calculation · result.bolts",
    });
  }

  return groupOf(
    "stair-rail-brace",
    "Staircase, hand railing and cross bracing",
    "The staircase, the railing that runs with it and along every veranda, and the cross bracing with the nut-bolt assembly at each end — the three families the elevations call out.",
    rows,
    "No staircase, railing or bracing in this model.",
  );
}

/* ---------------------------------------------------------------- 3.6 openings */

function openingsGroup(schedule: OpeningScheduleRow[]): RegisterGroup {
  const rows: RegisterRow[] = schedule.map((r) => ({
    item: `${r.kind === "door" ? "Door" : r.kind === "window" ? "Window" : "Ventilator"} ${r.mark}`,
    model: `${r.sizeMm} · ${r.material}`,
    uom: "nos",
    qty: r.qty,
    qtyDp: 0,
    unitWeightKg: null,
    totalWeightKg: null,
    purchase: "Frame, leaf and grill are billed separately in the Material BOQ",
    source: r.source,
  }));
  return groupOf(
    "openings",
    "Doors, windows and ventilators",
    "The same schedule the drawing sheet prints — grouped by size, exactly as the take-off bills them.",
    rows,
    "No doors or windows on the plan yet.",
  );
}

/* ---------------------------------------------------------------- 3.7 civil substructure */

function civilGroup(civil: CivilWorkResult | null | undefined): RegisterGroup {
  const rows: RegisterRow[] = [];
  for (const r of civil?.boq ?? []) {
    if (r.quantity <= 0) continue;
    rows.push({
      item: `${r.head} — ${r.item}`,
      model: r.spec || "—",
      uom: r.unit,
      qty: round(r.quantity, 3),
      qtyDp: r.unit === "nos" ? 0 : 2,
      unitWeightKg: null,
      totalWeightKg: null,
      purchase: "",
      source: "Priced Civil Work result",
    });
  }
  return groupOf(
    "civil",
    "Civil substructure",
    "Excavation, PCC, footings, pedestals, plinth beams and the rest of the priced civil scope.",
    rows,
    "Civil work is switched off, so the substructure contributes no material here.",
  );
}

/* ---------------------------------------------------------------- 3.8 the whole register */

export interface MaterialRegister {
  groups: RegisterGroup[];
  /** Total steel weight the priced Material BOQ holds (kg) — echoed, never re-summed from rows. */
  boqTotalWeightKg: number | null;
  /** True when a priced Material BOQ backed the register. */
  priced: boolean;
}

export function buildMaterialRegister(
  model: ColonyModel,
  boq: BoqResult | null | undefined,
  civil: CivilWorkResult | null | undefined,
  openings: OpeningScheduleRow[],
  bracing: BracingNote | null = null,
): MaterialRegister {
  return {
    groups: [
      purchaseGroup(boq),
      cuttingGroup(boq),
      rafterGroup(model),
      pufLockGroup(model),
      stairRailBraceGroup(model, bracing),
      hardwareGroup(model),
      openingsGroup(openings),
      civilGroup(civil),
    ],
    boqTotalWeightKg: boq ? round(boq.totals.totalWeightKg, 2) : null,
    priced: !!boq,
  };
}
