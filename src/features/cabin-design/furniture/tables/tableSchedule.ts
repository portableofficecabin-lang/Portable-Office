/**
 * Table module — the QUOTATION DESCRIPTION, the QUOTE ROWS and the FURNITURE SCHEDULE
 * (spec §25, §33).
 *
 * Three customer-facing artefacts, ONE derivation. The quotation line, the furniture schedule on
 * the drawing sheet and the PDF export all describe the same table, and the only way they can never
 * contradict each other is if none of them is hand-typed: every string here is built from the
 * CabinTable and from the SAME geometry the plan draws (footprintSize / sizeLabel).
 *
 * The one rule worth stating out loud: A QUOTE ROW'S `amount` IS THE PRICED COST — the `rate` is
 * DERIVED FROM IT by division, never the other way round. Multiplying a rounded rate by a quantity
 * is how a quotation total drifts away from the BOQ it was costed from; dividing an exact amount
 * cannot. (Same principle as engine.ts's purchase report: the money is the BOQ's money, regrouped.)
 *
 * Pure: no React, no Supabase, no rates — the money arrives already priced, as TableCost[].
 */

import { SEED_MATERIALS } from "@/lib/boq/seedMaterials";
import { autoSeats } from "./tableDefaults";
import { footprintSize } from "./tableGeometry";
import { type TableCost } from "./tablePricing";
import type { CabinTable } from "./tableSchema";
import { TABLE_SHAPES, findAccessory, findChair, findSupport, findTableType } from "./tableTypes";
import { sizeLabel } from "./tableUnits";

/* ==========================================================================
 * 1. Naming helpers
 * ========================================================================== */

/** key → the Material Master row's name + stated thickness. Built once: a description is rebuilt on
 *  every keystroke. */
const MATERIAL_ROWS: Record<string, { name: string; thicknessMm: number | null }> = (() => {
  const out: Record<string, { name: string; thicknessMm: number | null }> = {};
  for (const m of SEED_MATERIALS) {
    out[m.key] = { name: m.name, thicknessMm: m.thicknessMm };
  }
  return out;
})();

/** "board-prelam-18" → "Prelaminated Particle Board 18 mm". An admin-added key with no master row
 *  degrades to a readable de-slugged name rather than leaking a raw key onto the customer's PDF. */
function materialName(key?: string): string {
  if (!key) return "";
  const known = MATERIAL_ROWS[key];
  if (known) return known.name;
  return key
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

const shapeLabel = (t: CabinTable): string =>
  TABLE_SHAPES.find((s) => s.id === t.shape)?.label ?? t.shape;

/** The seat count the customer is quoted: what they set, or what the size implies (spec §9). */
const seatCount = (t: CabinTable): number => {
  const set = Math.round(t.seating?.capacity ?? 0);
  return set > 0 ? set : autoSeats(t);
};

const copiesOf = (t: CabinTable): number => Math.max(1, Math.round(t.quantity) || 1);

const mm = (v: number): number => Math.round(Number.isFinite(v) ? v : 0);

/** "Cable Grommet (2)" — a fitted accessory, with its quantity when it is not 1. */
const accessoryLabel = (accessoryId: string, qty: number): string => {
  const def = findAccessory(accessoryId);
  const label = def?.label ?? accessoryId;
  const n = Math.max(1, Math.round(qty) || 1);
  return n > 1 ? `${label} (${n})` : label;
};

/* ==========================================================================
 * 2. SIZE  (spec §25)
 * ========================================================================== */

/**
 * The size the QUOTATION prints. Three forms, because three products are measured three ways:
 *
 *   • a workstation is bought BY THE SEAT   → "1200 × 600 mm per seat"  (uom "Sets")
 *   • a round table is bought BY DIAMETER   → "1200 mm Dia."
 *   • everything else                       → "1800 × 900 × 750 mm"
 *
 * The L × D comes from footprintSize() — the bounding box of the polygons the PLAN actually drew —
 * so an L-shaped desk quotes its OVERALL size including the return, and the number on the quotation
 * is the number on the drawing. Anything else would let the two drift the moment a return is resized.
 */
export function quotationSize(t: CabinTable): string {
  const def = findTableType(t.tableTypeId);

  if (def.seatingModel === "workstation") {
    const l = mm(t.workstation?.deskLengthMm || t.dimensions.lengthMm);
    const d = mm(t.workstation?.deskDepthMm || t.dimensions.depthMm);
    return `${l} × ${d} mm per seat`;
  }

  const { lengthMm, depthMm } = footprintSize(t);

  /* A circle's bounding box IS its diameter — read it off the drawn geometry, not off radiusMm,
   * which a shape change can leave stale. */
  if (t.shape === "circle") return `${mm(lengthMm)} mm Dia.`;

  return sizeLabel(lengthMm, depthMm, t.dimensions.heightMm);
}

/* ==========================================================================
 * 3. DESCRIPTION  (spec §25)
 * ========================================================================== */

/**
 * Clause builder: skips empties and terminates each clause exactly once. A clause that already ends
 * in its own punctuation keeps it — "1200 mm Dia." must not become "1200 mm Dia..".
 */
const sentence = (clauses: (string | null | undefined)[]): string => {
  const kept = clauses.map((c) => (c ?? "").trim()).filter(Boolean);
  return kept.map((c) => (/[.!?]$/.test(c) ? c : `${c}.`)).join(" ");
};

/** The tabletop clause: material, thickness, edge band, laminate, finish. */
function topClause(t: CabinTable): string {
  const key = t.material.materialKey;
  const name = materialName(key);

  /* The MASTER decides whether the thickness has already been said. A board's name states it
   * ("Prelaminated Particle Board 25 mm"), so prefixing t.material.thicknessMm would print a
   * self-contradicting "18 mm … Board 25 mm top" whenever those two fall out of step — which they
   * do, because changing the material key does not rewrite the thickness field. The named board is
   * the thing being SOLD, so its own thickness wins; the table's field is only used for a material
   * whose name states no thickness at all (a solid-wood or stone top cut to order). */
  const stated = MATERIAL_ROWS[key]?.thicknessMm ?? null;
  const th = stated != null ? 0 : mm(t.material.thicknessMm || t.dimensions.topThicknessMm);
  const top = th > 0 && !name.includes(`${th} mm`) ? `${th} mm ${name}` : name;

  const bits = [`${top} top`];
  if (t.material.edgeBandKey) {
    const band = materialName(t.material.edgeBandKey);
    bits.push(`${band} edge banding${t.material.edgeBandColour ? ` (${t.material.edgeBandColour})` : ""}`);
  }
  if (t.material.laminateKey) bits.push(`${materialName(t.material.laminateKey)} surfacing`);
  if (t.material.topColour) bits.push(`${t.material.topColour} shade`);
  if (t.material.finish) bits.push(`${t.material.finish} finish`);
  if (t.material.brand) bits.push(`${t.material.brand} make`);

  return bits.join(", ");
}

/** The base clause: support type, profile / panel material, coating, levellers, castors. */
function supportClause(t: CabinTable): string {
  const def = findSupport(t.support.supportTypeId);
  const bits: string[] = [def.label];

  if (def.kind === "steel" || def.kind === "pedestal") {
    const profile = materialName(t.support.profileKey || def.defaultMaterialKey);
    const legs = Math.max(0, Math.round(t.support.numberOfLegs) || 0);
    if (profile) bits.push(`in ${profile}`);
    if (legs > 0) bits.push(`${legs} ${legs === 1 ? "leg" : "legs"}`);
  } else if (def.kind === "panel") {
    const panel = materialName(t.support.panelMaterialKey || def.defaultMaterialKey);
    if (panel) bits.push(`in ${panel}`);
  }

  if (t.support.powderCoatColour) bits.push(`powder coated ${t.support.powderCoatColour}`);
  else if (t.support.frameFinish) bits.push(t.support.frameFinish);

  const fittings: string[] = [];
  if (t.support.levellers) fittings.push("levellers");
  if (t.support.castors) fittings.push("castors");
  if (t.support.floorFixed) fittings.push("floor fixed");
  if (fittings.length) bits.push(`with ${fittings.join(" + ")}`);

  return `Base: ${bits.join(", ")}`;
}

/** Electrical points the table CARRIES. Power managers / pop-up + floor boxes are named here only
 *  when they are not already fitted as accessories — the two lists must never quote the same box twice. */
function electricalClause(t: CabinTable, fitted: Set<string>): string {
  const e = t.electrical;
  if (!e) return "";
  const bits: string[] = [];
  const add = (qty: number, label: string) => {
    const n = Math.max(0, Math.round(qty) || 0);
    if (n > 0) bits.push(`${n} × ${label}`);
  };

  add(e.socket5A, "5 A socket");
  add(e.socket6A, "6 A socket");
  add(e.socket16A, "16 A socket");
  add(e.usbPoints, "USB point");
  add(e.dataPoints, "data point");
  add(e.lanPoints, "LAN point");
  add(e.hdmiPoints, "HDMI point");
  if (!fitted.has("power-manager")) add(e.powerManagerQty, "power manager");
  if (!fitted.has("popup-socket")) add(e.popupBoxQty, "pop-up power box");
  add(e.floorBoxQty, "floor box");
  if (e.cableTray && !fitted.has("cable-tray")) bits.push("under-desk cable tray");

  return bits.length ? `Electrical: ${bits.join(", ")}` : "";
}

/** Seating: the capacity, and the chairs when the customer asked for them to be supplied (spec §9). */
function seatingClause(t: CabinTable): string {
  const def = findTableType(t.tableTypeId);
  if (def.seatingModel === "none") return "";

  const seats = seatCount(t);
  if (seats <= 0) return "";

  if (t.seating.includeChairs) {
    const chair = findChair(t.seating.chairTypeId);
    return `Seating for ${seats}, including ${seats} × ${chair.label}`;
  }
  return `Seating for ${seats} (chairs not in scope)`;
}

/**
 * The quotation line's description, auto-built from the configuration (spec §25) — type, shape,
 * overall size, top material + thickness + finish, support type, storage, accessories, electrical,
 * seating capacity and quantity.
 *
 * `simplified` is the CUSTOMER-facing short form (what goes on a one-page quotation); the full form
 * is what goes on the detailed BOQ / work order, where the joiner needs every fitting named.
 */
export function quotationDescription(t: CabinTable, opts: { simplified?: boolean } = {}): string {
  const def = findTableType(t.tableTypeId);
  const copies = copiesOf(t);
  const size = quotationSize(t);
  const qtyClause = `Quantity: ${copies} ${copies === 1 ? "no" : "nos"}`;

  if (opts.simplified) {
    return sentence([
      `${def.label} — ${shapeLabel(t)}, ${size}`,
      `${materialName(t.material.materialKey)} top on ${findSupport(t.support.supportTypeId).label}`,
      seatingClause(t),
      qtyClause,
    ]);
  }

  const fitted = new Set((t.accessories ?? []).map((a) => a.accessoryId));

  const storage = (t.accessories ?? [])
    .filter((a) => findAccessory(a.accessoryId)?.group === "Storage")
    .map((a) => accessoryLabel(a.accessoryId, a.quantity));

  const others = (t.accessories ?? [])
    .filter((a) => {
      const g = findAccessory(a.accessoryId)?.group;
      return g !== "Storage";
    })
    .map((a) => accessoryLabel(a.accessoryId, a.quantity));

  /* A workstation's partition screen is configured on the workstation block, not as an accessory —
   * it would be invisible on the quotation otherwise, and it is a priced BOQ line. */
  const ws = t.workstation;
  if (ws && ws.partitionMaterial && ws.partitionMaterial !== "none") {
    others.push(`${ws.partitionMaterial} partition screen ${mm(ws.partitionHeightMm)} mm high`);
  }

  return sentence([
    `${def.label} — ${shapeLabel(t)}`,
    `Overall size ${size}`,
    topClause(t),
    supportClause(t),
    storage.length ? `Storage: ${storage.join(", ")}` : "",
    others.length ? `Accessories: ${others.join(", ")}` : "",
    electricalClause(t, fitted),
    seatingClause(t),
    t.notes?.trim(),
    qtyClause,
  ]);
}

/* ==========================================================================
 * 4. QUOTE ROWS  (spec §25)
 * ========================================================================== */

export interface TableQuoteRow {
  sl: number;
  tableId: string;
  description: string;
  size: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
}

/**
 * The furniture pages of the quotation.
 *
 * A WORKSTATION IS SOLD BY THE SEAT: its size reads "1200 × 600 mm per seat", its uom is "Sets" and
 * its quantity is seats × copies, because that is how the customer compares two vendors. Every other
 * table is sold by the piece.
 *
 * `amount` is the priced cost verbatim; `rate` is amount ÷ qty. For a normal table that division is
 * exact (totalAmount = unitAmount × copies, by construction in priceTable), and for a multi-seat
 * workstation it yields the per-seat rate the customer expects. Deriving the rate from the amount —
 * rather than the amount from a rounded rate — is what guarantees the quotation total equals the BOQ
 * total to the rupee.
 *
 * A table with no cost row is emitted at ₹0 rather than dropped: a zero on the quotation gets
 * noticed, a missing line does not.
 */
export function tableQuoteRows(tables: CabinTable[], costs: TableCost[]): TableQuoteRow[] {
  const byId = new Map((costs ?? []).map((c) => [c.tableId, c]));

  return (tables ?? []).map((t, i): TableQuoteRow => {
    const def = findTableType(t.tableTypeId);
    const perSeat = def.seatingModel === "workstation";
    const copies = copiesOf(t);
    const seats = perSeat ? Math.max(1, seatCount(t)) : 1;
    const qty = copies * seats;
    const amount = byId.get(t.id)?.totalAmount ?? 0;

    return {
      sl: i + 1,
      tableId: t.id,
      description: quotationDescription(t),
      size: quotationSize(t),
      qty,
      uom: perSeat ? "Sets" : "Nos",
      rate: qty > 0 ? Math.round(amount / qty) : 0,
      amount,
    };
  });
}

/* ==========================================================================
 * 5. FURNITURE SCHEDULE  (spec §33 — the table on the drawing sheet)
 * ========================================================================== */

export interface ScheduleRow {
  /** The tag printed against the table in the plan — "T-01". */
  ref: string;
  tableId: string;
  type: string;
  size: string;
  qty: number;
  seating: number;
}

/** The drawing tag for the table at `index` (0-based, as the layout array stores them): "T-01". */
export function tableRef(index: number): string {
  const n = Math.max(0, Math.round(index) || 0) + 1;
  return `T-${String(n).padStart(2, "0")}`;
}

/**
 * The furniture schedule block on the drawing sheet (spec §33). Its row order IS the layout array's
 * order, so `tableRef(i)` here and the label the 2D plan stamps on the same table are the same tag —
 * they must be generated from the same index or the schedule points at the wrong desk.
 */
export function furnitureSchedule(tables: CabinTable[]): ScheduleRow[] {
  return (tables ?? []).map((t, i): ScheduleRow => ({
    ref: tableRef(i),
    tableId: t.id,
    type: findTableType(t.tableTypeId).label,
    size: quotationSize(t),
    qty: copiesOf(t),
    seating: seatCount(t),
  }));
}
