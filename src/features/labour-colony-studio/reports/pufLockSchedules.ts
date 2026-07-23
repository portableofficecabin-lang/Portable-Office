/**
 * PUF PANEL BOTTOM LOCKING SYSTEM — the dedicated fabrication schedules.
 *
 * Six schedules, all derived from the ONE resolved `PufLockDerived` bundle the model was built from
 * (`ColonyModel.pufLock`), so a schedule can never report a different quantity from the 3D viewer,
 * the detail sheets or the exploded view:
 *
 *   A. plate schedule          — mark, location, host beam, size, holes, weight, rate, amount
 *   B. anchor-bolt schedule    — diameter, length, grade, per plate, totals, nuts, washers
 *   C. C-purlin schedule       — section, cut length, per assembly, total pieces + running length
 *   D. weld schedule           — type, size, length, runs, total length, electrode allowance
 *   E. PUF-panel lock schedule — panel thickness vs pocket, clearance, seating, pass / warning
 *   F. ordering summary        — per assembly, per wall, per floor, whole building
 *
 * RATES resolve through the Material Master (`materialKey` on each spec) with a per-project override
 * taking precedence — the Material Master stays the default authority and there is no second rate
 * source. When no priced material is supplied the amount columns are left null rather than guessed.
 *
 * Pure: no React, no DOM.
 */

import type { MaterialIndex } from "@/lib/boq/types";
import {
  assemblyCallout, consecutiveSpacings, pocketClearGapMm, sideGapMm,
  type PufLockConfig, type PufLockDerived, type PufLockPlatePosition,
} from "@/features/labour-colony-studio/model/pufLock";

/* ------------------------------------------------------------------ rate resolution ------------ */

/** How a rate was arrived at — surfaced so a reader can see whether a price is real. */
export type RateSource = "override" | "material-master" | "none";

export interface ResolvedRate {
  rate: number | null;
  source: RateSource;
  /** The Material Master key the lookup used. */
  materialKey: string;
  unit: string;
}

/**
 * Resolve one rate: a per-project override wins, otherwise the Material Master, otherwise nothing.
 * Never invents a number — an unpriced item returns `null` so the schedule shows "—" instead of ₹0.
 */
export function resolveRate(
  materialKey: string,
  override: number | undefined,
  materials?: MaterialIndex | null,
): ResolvedRate {
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return { rate: override, source: "override", materialKey, unit: "override" };
  }
  const m = materials?.[materialKey];
  if (m && typeof m.purchaseRate === "number" && Number.isFinite(m.purchaseRate)) {
    return { rate: m.purchaseRate, source: "material-master", materialKey, unit: m.rateUnit };
  }
  return { rate: null, source: "none", materialKey, unit: "—" };
}

/** amount = qty × rate, or null when the rate is unknown. */
const amountOf = (qty: number, r: ResolvedRate): number | null =>
  r.rate == null ? null : round2(qty * r.rate);

/**
 * A per-kg rate applies to WEIGHT; a per-nos / per-m rate applies to the COUNT / LENGTH. Picking the
 * wrong basis is how a schedule silently prices a plate at ₹65 instead of ₹65/kg, so the basis is
 * chosen from the Material Master's own `rateUnit`.
 */
function amountByBasis(r: ResolvedRate, opts: { weightKg: number; pieces: number; lengthM: number }): number | null {
  if (r.rate == null) return null;
  switch (r.unit) {
    case "per_kg": return round2(opts.weightKg * r.rate);
    case "per_m": return round2(opts.lengthM * r.rate);
    case "per_nos": return round2(opts.pieces * r.rate);
    case "per_lot": return round2(r.rate);
    // an explicit override carries no unit — price it the way the item is naturally bought
    default: return round2((opts.weightKg > 0 ? opts.weightKg : opts.pieces) * r.rate);
  }
}

/* ------------------------------------------------------------------ A. plate schedule ---------- */

export interface PufLockPlateScheduleRow {
  mark: string;
  plateMark: string;
  assemblyMark: string;
  location: string;
  hostBeam: string;
  gridRef: string;
  offsetMm: number;
  sizeMm: string;
  thicknessMm: number;
  grade: string;
  finish: string;
  holeCount: number;
  holeDiaMm: number;
  unitWeightKg: number;
  quantity: number;
  totalWeightKg: number;
  rate: number | null;
  amount: number | null;
  rateSource: RateSource;
  source: "auto" | "manual";
}

export function buildPufLockPlateSchedule(d: PufLockDerived, materials?: MaterialIndex | null): PufLockPlateScheduleRow[] {
  if (!d.config.enabled) return [];
  const { config: c, takeoff: t } = d;
  const r = resolveRate(c.plate.materialKey, c.plate.rateOverride, materials);
  return d.positions.map((p, i) => ({
    mark: p.mark,
    plateMark: `${c.plate.mark}-${p.mark.slice(1)}`,
    assemblyMark: `PA-${String(i + 1).padStart(2, "0")}`,
    location: `x ${p.xM.toFixed(3)} m, y ${p.yM.toFixed(3)} m`,
    hostBeam: p.beamId,
    gridRef: p.gridRef,
    offsetMm: p.offsetMm,
    sizeMm: `${c.plate.lengthMm} × ${c.plate.widthMm}`,
    thicknessMm: c.plate.thicknessMm,
    grade: c.plate.grade,
    finish: c.plate.finish,
    holeCount: c.plate.holeCount,
    holeDiaMm: c.plate.boltHoleDiaMm,
    unitWeightKg: t.plateUnitKg,
    quantity: 1,
    totalWeightKg: t.plateUnitKg,
    rate: r.rate,
    amount: amountByBasis(r, { weightKg: t.plateUnitKg, pieces: 1, lengthM: 0 }),
    rateSource: r.source,
    source: p.source,
  }));
}

/* ------------------------------------------------------------------ B. anchor schedule --------- */

export interface PufLockAnchorScheduleRow {
  plateMark: string;
  boltSpec: string;
  diameterMm: number;
  lengthMm: number;
  grade: string;
  anchorType: string;
  embedmentMm: number;
  boltsPerPlate: number;
  totalBolts: number;
  nuts: number;
  washers: number;
  totalWeightKg: number;
  rate: number | null;
  amount: number | null;
  rateSource: RateSource;
  tighteningNote: string;
}

export function buildPufLockAnchorSchedule(d: PufLockDerived, materials?: MaterialIndex | null): PufLockAnchorScheduleRow[] {
  if (!d.config.enabled) return [];
  const { config: c, takeoff: t } = d;
  const a = c.anchor;
  const rb = resolveRate(a.materialKey, a.rateOverride, materials);
  const rn = resolveRate(a.nutMaterialKey, a.nutRateOverride, materials);
  const rw = resolveRate(a.washerMaterialKey, a.washerRateOverride, materials);

  const perPlateBolts = Math.max(0, Math.round(a.perPlate));
  const perPlateNuts = perPlateBolts * Math.max(0, Math.round(a.nutsPerBolt));
  const perPlateWashers = perPlateBolts * Math.max(0, Math.round(a.washersPerBolt));
  const perPlateKg = round3(perPlateBolts * t.boltUnitKg + perPlateNuts * t.nutUnitKg + perPlateWashers * t.washerUnitKg);

  return d.positions.map((p) => {
    const bolt = amountByBasis(rb, { weightKg: perPlateBolts * t.boltUnitKg, pieces: perPlateBolts, lengthM: 0 });
    const nut = amountByBasis(rn, { weightKg: perPlateNuts * t.nutUnitKg, pieces: perPlateNuts, lengthM: 0 });
    const wsh = amountByBasis(rw, { weightKg: perPlateWashers * t.washerUnitKg, pieces: perPlateWashers, lengthM: 0 });
    const amount = bolt == null && nut == null && wsh == null ? null : round2((bolt ?? 0) + (nut ?? 0) + (wsh ?? 0));
    return {
      plateMark: p.mark,
      boltSpec: `M${a.diameterMm} × ${a.lengthMm} gr ${a.grade}`,
      diameterMm: a.diameterMm,
      lengthMm: a.lengthMm,
      grade: a.grade,
      anchorType: a.type,
      embedmentMm: a.embedmentMm,
      boltsPerPlate: perPlateBolts,
      totalBolts: perPlateBolts,
      nuts: perPlateNuts,
      washers: perPlateWashers,
      totalWeightKg: perPlateKg,
      rate: rb.rate,
      amount,
      rateSource: rb.source,
      tighteningNote: a.tighteningNote,
    };
  });
}

/* ------------------------------------------------------------------ C. C-purlin schedule ------- */

export interface PufLockPurlinScheduleRow {
  mark: string;
  plateMark: string;
  side: "Left" | "Right";
  section: string;
  depthMm: number;
  flangeMm: number;
  lipMm: number;
  thicknessMm: number;
  lengthMm: number;
  grade: string;
  finish: string;
  orientation: string;
  perAssembly: number;
  quantity: number;
  runningLengthM: number;
  unitWeightKgPerM: number;
  totalWeightKg: number;
  rate: number | null;
  amount: number | null;
  rateSource: RateSource;
}

export function buildPufLockPurlinSchedule(d: PufLockDerived, materials?: MaterialIndex | null): PufLockPurlinScheduleRow[] {
  if (!d.config.enabled) return [];
  const { config: c, takeoff: t } = d;
  const p = c.purlin;
  const r = resolveRate(p.materialKey, p.rateOverride, materials);
  const lenM = p.lengthMm / 1000;
  const kg = round3(lenM * t.purlinKgPerM);

  const rows: PufLockPurlinScheduleRow[] = [];
  for (const pos of d.positions) {
    for (const side of ["Left", "Right"] as const) {
      rows.push({
        mark: `${p.partMark}-${side[0]}${pos.mark.slice(1)}`,
        plateMark: pos.mark,
        side,
        section: p.designation,
        depthMm: p.depthMm,
        flangeMm: p.flangeMm,
        lipMm: p.lipMm,
        thicknessMm: p.thicknessMm,
        lengthMm: p.lengthMm,
        grade: p.grade,
        finish: p.finish,
        orientation: p.orientation === "webs-inward" ? "Webs inward (flanges out)" : "Flanges inward",
        perAssembly: p.perPlate,
        quantity: 1,
        runningLengthM: round3(lenM),
        unitWeightKgPerM: t.purlinKgPerM,
        totalWeightKg: kg,
        rate: r.rate,
        amount: amountByBasis(r, { weightKg: kg, pieces: 1, lengthM: lenM }),
        rateSource: r.source,
      });
    }
  }
  return rows;
}

/* ------------------------------------------------------------------ D. weld schedule ----------- */

export interface PufLockWeldScheduleRow {
  assemblyMark: string;
  plateMark: string;
  weldType: string;
  weldSizeMm: number;
  weldLengthMm: number;
  weldsPerAssembly: number;
  totalWeldLengthMm: number;
  depositedWeightKg: number;
  electrodeAllowanceKg: number;
  note: string;
}

export function buildPufLockWeldSchedule(d: PufLockDerived): PufLockWeldScheduleRow[] {
  if (!d.config.enabled) return [];
  const { config: c, takeoff: t } = d;
  const p = c.purlin;
  const runsPerAssembly = Math.max(0, Math.round(p.perPlate)) * Math.max(0, Math.round(p.weldRunsPerPurlin));
  const totalMmPerAssembly = runsPerAssembly * p.weldLengthMm;
  const kgPerAssembly = round3((totalMmPerAssembly / 1000) * t.weldKgPerM);

  return d.positions.map((pos, i) => ({
    assemblyMark: `PA-${String(i + 1).padStart(2, "0")}`,
    plateMark: pos.mark,
    weldType: p.weldType === "fillet" ? "Fillet" : "Groove",
    weldSizeMm: p.weldSizeMm,
    weldLengthMm: p.weldLengthMm,
    weldsPerAssembly: runsPerAssembly,
    totalWeldLengthMm: totalMmPerAssembly,
    depositedWeightKg: kgPerAssembly,
    electrodeAllowanceKg: round3(kgPerAssembly * 1.6),
    note: `${p.weldRunsPerPurlin} run(s) per C-purlin, both sides of the seating flange.`,
  }));
}

/* ------------------------------------------------------------------ E. PUF panel schedule ------ */

export interface PufLockPanelScheduleRow {
  panelMark: string;
  panelThicknessMm: number;
  pocketClearWidthMm: number;
  installationClearanceMm: number;
  sideGapMm: number;
  maxSideGapMm: number;
  insertionDepthMm: number;
  seatingDepthMm: number;
  supportedByPlate: string;
  hostBeam: string;
  isolationStrip: string;
  sealant: string;
  status: "Pass" | "Warning" | "Error";
  remark: string;
}

export function buildPufLockPanelSchedule(d: PufLockDerived): PufLockPanelScheduleRow[] {
  if (!d.config.enabled) return [];
  const { config: c } = d;
  const gap = pocketClearGapMm(c.iface);
  const side = sideGapMm(c.iface);

  // an issue naming this plate downgrades only that row; a global issue downgrades every row
  const globalErr = d.errors.filter((i) => !i.plateId);
  const globalWarn = d.warnings.filter((i) => !i.plateId);

  return d.positions.map((p) => {
    const mine = d.issues.filter((i) => i.plateId === p.id);
    const errs = [...globalErr, ...mine.filter((i) => i.level === "error")];
    const warns = [...globalWarn, ...mine.filter((i) => i.level === "warning")];
    const status: PufLockPanelScheduleRow["status"] = errs.length ? "Error" : warns.length ? "Warning" : "Pass";
    return {
      panelMark: `PNL-${p.mark.slice(1)}`,
      panelThicknessMm: c.iface.panelThicknessMm,
      pocketClearWidthMm: gap,
      installationClearanceMm: c.iface.installationClearanceMm,
      sideGapMm: side,
      maxSideGapMm: c.iface.maxSideGapMm,
      insertionDepthMm: c.iface.insertionDepthMm,
      seatingDepthMm: c.iface.seatingDepthMm,
      supportedByPlate: p.mark,
      hostBeam: p.beamId,
      isolationStrip: c.iface.isolationStrip ? c.iface.isolationStripMaterial : "—",
      sealant: c.iface.sealantType,
      status,
      remark: errs[0]?.message ?? warns[0]?.message ?? "Pocket matches the selected panel thickness.",
    };
  });
}

/* ------------------------------------------------------------------ F. ordering summary -------- */

export interface PufLockOrderingRow {
  scope: string;
  item: string;
  spec: string;
  unit: string;
  quantity: number;
  unitWeightKg: number | null;
  totalWeightKg: number | null;
  rate: number | null;
  amount: number | null;
  rateSource: RateSource;
}

/**
 * The ordering summary — per assembly, per wall, per floor and for the whole building. The "per
 * assembly" rows are the typical-assembly bill a fabricator works from; the building rows are what
 * gets purchased.
 */
export function buildPufLockOrderingSummary(d: PufLockDerived, materials?: MaterialIndex | null): PufLockOrderingRow[] {
  if (!d.config.enabled || !d.positions.length) return [];
  const { config: c, takeoff: t } = d;
  const rows: PufLockOrderingRow[] = [];

  const rPlate = resolveRate(c.plate.materialKey, c.plate.rateOverride, materials);
  const rPurlin = resolveRate(c.purlin.materialKey, c.purlin.rateOverride, materials);
  const rBolt = resolveRate(c.anchor.materialKey, c.anchor.rateOverride, materials);
  const rNut = resolveRate(c.anchor.nutMaterialKey, c.anchor.nutRateOverride, materials);
  const rWasher = resolveRate(c.anchor.washerMaterialKey, c.anchor.washerRateOverride, materials);
  const rStrip = resolveRate(c.iface.isolationStripMaterialKey, undefined, materials);
  const rSeal = resolveRate(c.iface.sealantMaterialKey, undefined, materials);
  const rFast = resolveRate(c.iface.fastenerMaterialKey, undefined, materials);

  const push = (
    scope: string, item: string, spec: string, unit: string, quantity: number,
    unitWeightKg: number | null, totalWeightKg: number | null, r: ResolvedRate, lengthM = 0,
  ) => {
    if (quantity <= 0) return;
    rows.push({
      scope, item, spec, unit, quantity: round3(quantity), unitWeightKg, totalWeightKg,
      rate: r.rate,
      amount: amountByBasis(r, { weightKg: totalWeightKg ?? 0, pieces: quantity, lengthM }),
      rateSource: r.source,
    });
  };

  /* ---- per typical assembly ---- */
  const A = "Per assembly";
  push(A, "MS base plate", `${c.plate.lengthMm} × ${c.plate.widthMm} × ${c.plate.thicknessMm} mm · ${c.plate.grade}`,
    "nos", 1, t.plateUnitKg, t.plateUnitKg, rPlate);
  push(A, "MS C-purlin", `${c.purlin.designation} · ${c.purlin.lengthMm} mm long`,
    "nos", c.purlin.perPlate, round3(t.purlinKgPerM * c.purlin.lengthMm / 1000),
    round3(c.purlin.perPlate * t.purlinKgPerM * c.purlin.lengthMm / 1000), rPurlin,
    round3(c.purlin.perPlate * c.purlin.lengthMm / 1000));
  push(A, "Anchor bolt", `M${c.anchor.diameterMm} × ${c.anchor.lengthMm} gr ${c.anchor.grade} (${c.anchor.type})`,
    "nos", c.anchor.perPlate, t.boltUnitKg, round3(c.anchor.perPlate * t.boltUnitKg), rBolt);
  push(A, "Nut", `M${c.anchor.diameterMm}`, "nos",
    c.anchor.perPlate * c.anchor.nutsPerBolt, t.nutUnitKg,
    round3(c.anchor.perPlate * c.anchor.nutsPerBolt * t.nutUnitKg), rNut);
  push(A, "Washer", `M${c.anchor.diameterMm}`, "nos",
    c.anchor.perPlate * c.anchor.washersPerBolt, t.washerUnitKg,
    round3(c.anchor.perPlate * c.anchor.washersPerBolt * t.washerUnitKg), rWasher);

  /* ---- per wall (per plinth-beam run) ---- */
  const byBeam = new Map<string, PufLockPlatePosition[]>();
  for (const p of d.positions) {
    const list = byBeam.get(p.beamId) ?? [];
    list.push(p);
    byBeam.set(p.beamId, list);
  }
  for (const [beamId, list] of [...byBeam.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const n = list.length;
    push(`Wall ${beamId}`, "Locking assembly", assemblyCallout(c), "nos", n,
      null, round3(n * (t.plateUnitKg + c.purlin.perPlate * t.purlinKgPerM * c.purlin.lengthMm / 1000)),
      { rate: null, source: "none", materialKey: "", unit: "—" });
    push(`Wall ${beamId}`, "MS base plate", `${c.plate.lengthMm} × ${c.plate.widthMm} × ${c.plate.thicknessMm} mm`,
      "nos", n, t.plateUnitKg, round3(n * t.plateUnitKg), rPlate);
    push(`Wall ${beamId}`, "MS C-purlin", c.purlin.designation, "nos", n * c.purlin.perPlate,
      round3(t.purlinKgPerM * c.purlin.lengthMm / 1000),
      round3(n * c.purlin.perPlate * t.purlinKgPerM * c.purlin.lengthMm / 1000), rPurlin,
      round3(n * c.purlin.perPlate * c.purlin.lengthMm / 1000));
  }

  /* ---- whole building (the purchase list) ---- */
  const B = "Whole building";
  push(B, "MS base plate", `${c.plate.lengthMm} × ${c.plate.widthMm} × ${c.plate.thicknessMm} mm · ${c.plate.grade}`,
    "nos", t.plates, t.plateUnitKg, t.plateKg, rPlate);
  push(B, "MS C-purlin", `${c.purlin.designation} · ${c.purlin.lengthMm} mm cut length`,
    "nos", t.purlinPieces, round3(t.purlinKgPerM * c.purlin.lengthMm / 1000), t.purlinKg, rPurlin, t.purlinTotalLengthM);
  push(B, "MS C-purlin (running length)", c.purlin.designation, "m", t.purlinTotalLengthM,
    t.purlinKgPerM, t.purlinKg, { rate: null, source: "none", materialKey: c.purlin.materialKey, unit: "—" });
  push(B, "Anchor bolt", `M${c.anchor.diameterMm} × ${c.anchor.lengthMm} gr ${c.anchor.grade}`,
    "nos", t.bolts, t.boltUnitKg, t.boltKg, rBolt);
  push(B, "Nut", `M${c.anchor.diameterMm}`, "nos", t.nuts, t.nutUnitKg, t.nutKg, rNut);
  push(B, "Washer", `M${c.anchor.diameterMm}`, "nos", t.washers, t.washerUnitKg, t.washerKg, rWasher);
  push(B, "Welding consumable", `${c.purlin.weldSizeMm} mm ${c.purlin.weldType} · ${t.weldTotalLengthM.toFixed(2)} m of weld`,
    "kg", t.electrodeKg, null, t.electrodeKg,
    resolveRate("welding-electrode", undefined, materials));
  if (t.isolationStripM > 0) {
    push(B, "Isolation strip", c.iface.isolationStripMaterial, "m", t.isolationStripM, null, null, rStrip, t.isolationStripM);
  }
  push(B, "Sealant", c.iface.sealantType, "m", t.sealantM, null, null, rSeal, t.sealantM);
  if (t.fasteners > 0) {
    push(B, "Panel fastener", c.iface.fastenerSpec, "nos", t.fasteners, null, null, rFast);
  }
  push(B, "Total fabricated steel", "Plates + C-purlins + anchors", "kg", t.totalSteelKg, null, t.totalSteelKg,
    { rate: null, source: "none", materialKey: "", unit: "—" });

  return rows;
}

/* ------------------------------------------------------------------ layout summary ------------- */

export interface PufLockLayoutSummary {
  plates: number;
  runs: number;
  minSpacingM: number;
  maxSpacingM: number;
  avgSpacingM: number;
  manualPlates: number;
  autoPlates: number;
}

/** Spacing statistics for the plate-layout sheet and the editor readout. */
export function buildPufLockLayoutSummary(d: PufLockDerived): PufLockLayoutSummary {
  const sp = consecutiveSpacings(d.positions);
  const runs = new Set(d.positions.map((p) => p.beamId)).size;
  return {
    plates: d.positions.length,
    runs,
    minSpacingM: sp.length ? round3(Math.min(...sp)) : 0,
    maxSpacingM: sp.length ? round3(Math.max(...sp)) : 0,
    avgSpacingM: sp.length ? round3(sp.reduce((a, b) => a + b, 0) / sp.length) : 0,
    manualPlates: d.positions.filter((p) => p.source === "manual").length,
    autoPlates: d.positions.filter((p) => p.source === "auto").length,
  };
}

/** Convenience: the config the schedules were built from, for a caller that only has the model. */
export type { PufLockConfig };

/* ------------------------------------------------------------------ helpers -------------------- */

const round2 = (v: number): number => Math.round(v * 100) / 100;
const round3 = (v: number): number => Math.round(v * 1000) / 1000;
