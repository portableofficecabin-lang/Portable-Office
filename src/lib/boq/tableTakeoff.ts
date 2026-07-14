/**
 * TABLE / FURNITURE TAKE-OFF — CabinTable[] ➜ BOQ take-off items (spec §22).
 * Pure: no React, no DOM, no Supabase.
 *
 * WHY THIS FILE IMPORTS THE DRAWING'S OWN GEOMETRY MODULE:
 * The same reason cabinTakeoff.ts imports pricing.ts. A tabletop is a POLYGON, not an L × D — an
 * L-shaped desk, a curved-front reception counter and a 6-seat linear workstation all have a board
 * area that no width-times-depth can reproduce. So the board quantity is `topAreaSqm(t)` and the
 * edge band is `topPerimeterM(t)`, read straight out of tableGeometry.ts — the module the 2D plan,
 * the elevation and the collision checker draw from. The BOQ area IS the polygon the plan drew, and
 * the two cannot drift because there is only one of them.
 *
 * THE SINK IS THE CABIN'S SINK. `emitTableTakeoff` takes a structural `TakeoffSink` that
 * cabinTakeoff.ts's module-private `Sink` class already satisfies, so buildCabinTakeoff can call
 *   emitTableTakeoff(s, cfg.tables ?? [], norms)
 * and the furniture lines land in the same item list, get the same drawingRef treatment and obey
 * the same zero-quantity suppression as every other line. Nothing is duplicated.
 *
 * ENGINE CONTRACT (src/lib/boq/engine.ts + validate.ts) — the three rules that shape every emit:
 *   1. kind "steel" = ANY LINEAR item (legs, apron rails, edge band, cable tray, conduit, wire).
 *      Its material must be weighed kg_per_m.
 *   2. kind "sheet" = ANY AREA item (tops, laminate, carcass board, partition screens, powder coat).
 *      Its material must be weighed kg_per_sqm.
 *   3. kind "count" = counted pieces (hardware, accessories, chairs) AND labour, whose qty is
 *      MAN-HOURS against a ₹/hour rate.
 *   Consequence, and it is not cosmetic: an accessory whose catalogue materialKey is a BOARD
 *   (side storage, modesty panel) or a TRAY (cable tray, wire box) may NOT be emitted as a count —
 *   validate.ts would raise missing_unit_weight because a kg_per_sqm material on a counted line
 *   weighs 0 kg. Those accessories are taken off as the sheet/steel they physically are, and are
 *   excluded from the hardware count loop (AREA_ACCESSORIES / LINEAR_ACCESSORIES below).
 *
 *   4. validate.ts raises duplicate_calculation when two steel lines share
 *      (materialKey | cutLengthM | section | description). Two identical tables therefore MUST NOT
 *      produce identical text — which is why every slug carries the table id and every description
 *      ends "— <name> [<id>]". That suffix is load-bearing, not decoration.
 *
 * WASTAGE IS NOT APPLIED HERE. The engine adds norms.cuttingWastagePercent to every steel line and
 * norms.sheetWastagePercent to every sheet line, on top of the material's own %. `norms` is accepted
 * so this producer has the same signature as the rest of the pipeline (and so a future
 * furniture-specific norm has somewhere to land), but adding a wastage factor to a quantity in this
 * file would bill it twice.
 *
 * UNITS: the table model is MILLIMETRES; the take-off IR is METRES / SQUARE METRES. Converted at the
 * edge, once, by mm2m() / the m² helpers below.
 */

import {
  topAreaSqm,
  topPerimeterM,
} from "@/features/cabin-design/furniture/tables/tableGeometry";
import type {
  CabinTable,
  TableAccessory,
  TableElectrical,
  TableWorkstation,
} from "@/features/cabin-design/furniture/tables/tableSchema";
import {
  ELECTRICAL_ACCESSORY_IDS,
  findAccessory,
  findChair,
  findSupport,
  findTableType,
  isRoundish,
} from "@/features/cabin-design/furniture/tables/tableTypes";
import { sizeLabel } from "@/features/cabin-design/furniture/tables/tableUnits";
import { PARTITION_KEYS, TABLE_ROLES } from "@/lib/boq/furnitureMaterials";
import type { BoqNorms, BoqSection } from "@/lib/boq/types";
import { ceil, round } from "@/lib/boq/types";

/* ==========================================================================
 * 1. THE SINK — structural, so the cabin's private Sink satisfies it as-is
 * ========================================================================== */

/**
 * The emitter cabinTakeoff.ts's `Sink` class already implements, expressed structurally so this
 * module can write into it without the class being exported.
 *
 * `count`'s `fractional` flag is NOT optional decoration: Sink.count() does `Math.round(qty)` unless
 * it is set, which would round every labour figure (0.08 h of edge banding, 1.9 h of carpentry) to a
 * whole hour or to zero. Every labour line below passes `true`.
 */
export interface TakeoffSink {
  steel(
    section: BoqSection,
    slug: string,
    materialKey: string,
    description: string,
    formula: string,
    qty: number,
    cutLengthM: number,
    geomKey?: string,
  ): void;
  sheet(
    section: BoqSection,
    slug: string,
    materialKey: string,
    description: string,
    formula: string,
    grossAreaSqm: number,
    deductions: { label: string; areaSqm: number }[],
    faces: number,
    geomKey?: string,
  ): void;
  count(
    section: BoqSection,
    slug: string,
    materialKey: string,
    description: string,
    formula: string,
    qty: number,
    fractional?: boolean,
  ): void;
}

/** Per-table cable route to the nearest wall (m). The caller owns the cabin geometry; this module
 *  does not, and a take-off that invented a distance would be inventing a quantity. */
export interface TableTakeoffContext {
  cableRunM?: Record<string, number>;
}

/* ==========================================================================
 * 2. CONSTANTS — real workshop quantities, never rates
 * ========================================================================== */

const SECTION: BoqSection = "furniture";

/** Cable route to the nearest wall when the caller has not measured one (m). */
const DEFAULT_CABLE_RUN_M = 3;
/** One 6-point circuit per 6 electrical points — the point at which a second circuit is pulled. */
const POINTS_PER_CIRCUIT = 6;
/** A circuit is phase + neutral + earth. */
const CORES_PER_CIRCUIT = 3;

/** Knock-down fixings a table swallows regardless of its shape. */
const SCREWS_PER_TABLE = 12;
const CONNECTORS_PER_TABLE = 8;
/** Levellers / castors are fitted in fours — one per corner of the base. */
const FEET_PER_TABLE = 4;

/** Watts drawn by one point of each kind. Data / LAN / HDMI are signal, not load. */
const WATTS_SOCKET_5A = 100;
const WATTS_SOCKET_6A = 200;
const WATTS_SOCKET_16A = 1500;
const WATTS_USB = 15;
const WATTS_POWER_MANAGER = 300;
const WATTS_POPUP_BOX = 300;
const WATTS_FLOOR_BOX = 300;

/** Indian single-phase supply, and the diversity factor a designer sizes an MCB with. */
const SUPPLY_VOLTS = 230;
const MCB_SAFETY_FACTOR = 1.25;
const MCB_SIZES_A = [6, 10, 16, 20, 25, 32];

/** LABOUR NORMS — man-hours, derived from the work the geometry says must be done (spec §22). */
const HR_CUTTING_PER_SQM = 0.35;
const HR_CUTTING_MIN = 0.5;
const HR_EDGE_PER_M = 0.08;
const HR_CARPENTRY_BASE = 1.5;
const HR_CARPENTRY_PER_ACCESSORY = 0.4;
const HR_CARPENTRY_PER_DRAWER = 0.5;
const HR_WELD_PER_M = 0.25;
const HR_GRIND_PER_WELD_HR = 0.5;
const HR_ELEC_PER_POINT = 0.4;
const HR_ELEC_MIN = 0.5;
const HR_INSTALL_PER_TABLE = 0.75;

/** Drawers inside each storage accessory — drives channels, handles and carpentry hours. */
const DRAWERS_PER_UNIT: Record<string, number> = {
  "mobile-pedestal": 3,
  "fixed-pedestal": 3,
  "drawer-unit": 3,
  "drawer-unit-3": 3,
  "drawer-unit-4": 4,
};

/**
 * Accessories whose catalogue material is weighed per m² (a board or a screen panel). They are taken
 * off as SHEET lines below; emitting them as counts would weigh them 0 kg (see the engine contract).
 */
const AREA_ACCESSORIES = new Set([
  "modesty-panel",
  "side-storage",
  "return-storage",
  "under-counter-storage",
  "glass-partition",
  "fabric-partition",
  "acrylic-partition",
]);

/** Accessories whose catalogue material is weighed per m (a tray). Taken off as STEEL runs. */
const LINEAR_ACCESSORIES = new Set(["cable-tray", "wire-box"]);

/** The three carcass accessories: 2 sides + top + bottom + back of board. */
const CARCASS_ACCESSORIES = new Set(["side-storage", "return-storage", "under-counter-storage"]);

/** The support kinds that are made of steel and therefore have legs, welds and powder coating. */
const isSteelBase = (kind: string): boolean => kind === "steel" || kind === "pedestal";

/* ==========================================================================
 * 3. SMALL PURE HELPERS
 * ========================================================================== */

const mm2m = (mm: number): number => mm / 1000;
const sqmm2sqm = (sqmm: number): number => sqmm / 1_000_000;

/** "1.35" — a number inside a formula string. */
const d = (n: number): string => String(round(n, 2));

/** "Executive Table 1 [tbl-abc123]" — the suffix that makes every line unique to ONE table. */
const tag = (t: CabinTable): string => `${t.name} [${t.id}]`;

/** "top-tbl-abc123" — the id discriminator. Same reason. */
const slug = (base: string, t: CabinTable): string => `${base}-${t.id}`;

/** " × 3 identical table(s)" — appended to a formula when quantity > 1, silent when it is 1. */
const perQty = (n: number): string => (n > 1 ? ` × ${n} identical table(s)` : "");

/**
 * The " × 2 unit(s) × 3 identical table(s) = 2.88 m²" tail of an AREA formula — printed only when
 * something actually multiplies, so a one-off table's formula reads "= 1.67 m²" rather than the
 * nonsense "= 1.67 m² = 1.67 m²".
 */
function areaTotal(oneSqm: number, units: number, n: number, what = "unit(s)"): string {
  const mult = units * n;
  if (mult <= 1) return "";
  const parts: string[] = [];
  if (units > 1) parts.push(`${units} ${what}`);
  if (n > 1) parts.push(`${n} identical table(s)`);
  return ` × ${parts.join(" × ")} = ${d(oneSqm * mult)} m²`;
}

/** The clamped number of identical copies (tableDefaults.LIMITS.quantity). */
const copiesOf = (t: CabinTable): number =>
  Math.min(50, Math.max(1, Math.round(t.quantity || 1)));

/**
 * Outer perimeter of a steel section, in metres — the surface a powder coat has to cover.
 * Read off the material KEY ("shs-50x50x2" ⇒ 2 × (0.05 + 0.05) = 0.2 m), because the Material Master
 * carries the section as free text and a take-off may not parse a human's `sectionSize` string.
 * An unrecognisable key falls back to a 50 × 50 section rather than to zero: a missing coat is a
 * missing cost, and a coat that is 20% out is merely a coat that is 20% out.
 */
const DEFAULT_SECTION_PERIM_M = 0.2;

function sectionPerimeterM(materialKey: string): number {
  const m = /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i.exec(materialKey ?? "");
  if (!m) return DEFAULT_SECTION_PERIM_M;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!(a > 0) || !(b > 0)) return DEFAULT_SECTION_PERIM_M;
  return round(2 * (a + b) / 1000, 4);
}

/** The size label the drawing, the schedule and the quotation all print — one formatter, no drift. */
function label(t: CabinTable): string {
  const dim = t.dimensions;
  return sizeLabel(dim.lengthMm, dim.depthMm, dim.heightMm, {
    round: isRoundish(t.shape) && !!dim.radiusMm,
    diameterMm: dim.radiusMm ? dim.radiusMm * 2 : undefined,
  });
}

/** Accessory footprint, honouring the customer's resize over the catalogue default. */
function accSize(a: TableAccessory): { L: number; D: number; H: number; label: string } {
  const def = findAccessory(a.accessoryId);
  return {
    L: a.lengthMm ?? def?.lengthMm ?? 0,
    D: a.depthMm ?? def?.depthMm ?? 0,
    H: a.heightMm ?? def?.heightMm ?? 0,
    label: def?.label ?? a.accessoryId,
  };
}

const accMaterial = (a: TableAccessory): string =>
  a.materialKey ?? findAccessory(a.accessoryId)?.materialKey ?? TABLE_ROLES.top;

/* ==========================================================================
 * 4. ELECTRICAL LOAD  (spec §21)
 * ========================================================================== */

/** The load a table's own points draw, and the MCB that must protect them. */
const ELEC_POINTS: {
  field: Exclude<keyof TableElectrical, "cableTray">;
  key: string;
  label: string;
  watts: number;
}[] = [
  { field: "socket5A", key: "elec-socket-5a", label: "5A socket", watts: WATTS_SOCKET_5A },
  { field: "socket6A", key: "elec-socket", label: "6A socket / plug point", watts: WATTS_SOCKET_6A },
  { field: "socket16A", key: "elec-socket-16a", label: "16A socket", watts: WATTS_SOCKET_16A },
  { field: "usbPoints", key: "elec-usb-point", label: "USB charging point", watts: WATTS_USB },
  { field: "dataPoints", key: "elec-data-point", label: "Data point", watts: 0 },
  { field: "lanPoints", key: "elec-lan-point", label: "LAN point", watts: 0 },
  { field: "hdmiPoints", key: "elec-hdmi-point", label: "HDMI point", watts: 0 },
  { field: "powerManagerQty", key: "acc-power-manager", label: "Power manager", watts: WATTS_POWER_MANAGER },
  { field: "popupBoxQty", key: "acc-popup-box", label: "Pop-up power box", watts: WATTS_POPUP_BOX },
  { field: "floorBoxQty", key: "acc-floor-box", label: "Floor box", watts: WATTS_FLOOR_BOX },
];

const pointQty = (t: CabinTable, field: Exclude<keyof TableElectrical, "cableTray">): number =>
  Math.max(0, Math.round(t.electrical?.[field] ?? 0));

/**
 * Connected load of ONE table (not × quantity) and the MCB it needs (spec §21).
 *
 * Data / LAN / HDMI points draw no power but ARE points: they still need a conduit, a wire pull and
 * an electrician's half hour, so they count toward `points` and toward zero watts. A table with no
 * points at all needs no circuit, so its MCB is 0 — an unconditional "6 A" would put a breaker on
 * the schedule for a table that has nothing to break.
 */
export function tableElectricalLoad(t: CabinTable): { watts: number; suggestedMcbA: number; points: number } {
  let watts = 0;
  let points = 0;

  for (const p of ELEC_POINTS) {
    const qty = pointQty(t, p.field);
    if (qty <= 0) continue;
    points += qty;
    watts += qty * p.watts;
  }

  if (points === 0) return { watts: 0, suggestedMcbA: 0, points: 0 };

  const designAmps = (watts / SUPPLY_VOLTS) * MCB_SAFETY_FACTOR;
  const suggestedMcbA =
    MCB_SIZES_A.find((a) => a >= designAmps) ?? MCB_SIZES_A[MCB_SIZES_A.length - 1];

  return { watts: round(watts, 2), suggestedMcbA, points };
}

/* ==========================================================================
 * 5. WORKSTATION PARTITION RUN  (spec §17)
 * ========================================================================== */

/**
 * Total running length of partition screen (m) in a workstation cluster, and the derivation printed
 * on the BOQ line. The runs are read off the SAME arrangement buildWorkstation() draws, so the screen
 * on the plan and the screen in the BOQ are the same screen:
 *
 *   linear        — one divider between neighbours (deskDepth each) + a spine along the whole back
 *   back-to-back  — a shared spine down the middle of the pod + a divider between neighbours in each row
 *   cluster       — a screen behind every desk (deskLength each), no spine
 *   l-shaped      — a divider between neighbours, no spine (the return arm IS the enclosure)
 */
function partitionRun(ws: TableWorkstation): { runM: number; how: string } {
  const users = Math.max(1, Math.round(ws.users));
  const dl = mm2m(Math.max(0, ws.deskLengthMm));
  const dd = mm2m(Math.max(0, ws.deskDepthMm));

  if (ws.arrangement === "back-to-back") {
    const perRow = ceil(users / 2);
    const dividers = Math.max(0, perRow - 1) + Math.max(0, users - perRow - 1);
    const spine = perRow * dl;
    return {
      runM: spine + dividers * dd,
      how:
        `back-to-back: shared spine ceil(${users} users ÷ 2) = ${perRow} × ${d(dl)} m desk = ${d(spine)} m, ` +
        `plus ${dividers} divider(s) × ${d(dd)} m desk depth`,
    };
  }

  if (ws.arrangement === "cluster") {
    return {
      runM: users * dl,
      how: `cluster: one screen behind each of ${users} desk(s) × ${d(dl)} m`,
    };
  }

  if (ws.arrangement === "l-shaped") {
    const dividers = Math.max(0, users - 1);
    return {
      runM: dividers * dd,
      how: `L-shaped pods: ${dividers} divider(s) between neighbours × ${d(dd)} m desk depth (no back spine — the return arm encloses the pod)`,
    };
  }

  const dividers = Math.max(0, users - 1);
  const spine = users * dl;
  return {
    runM: spine + dividers * dd,
    how:
      `linear: back spine ${users} × ${d(dl)} m desk = ${d(spine)} m, ` +
      `plus ${dividers} divider(s) × ${d(dd)} m desk depth`,
  };
}

/* ==========================================================================
 * 6. THE TAKE-OFF
 * ========================================================================== */

export function emitTableTakeoff(
  s: TakeoffSink,
  tables: CabinTable[],
  norms: BoqNorms,
  ctx: TableTakeoffContext = {},
): void {
  for (const t of tables ?? []) {
    if (!t || !t.id) continue;
    emitOne(s, t, ctx);
  }
}

function emitOne(s: TakeoffSink, t: CabinTable, ctx: TableTakeoffContext): void {
  const n = copiesOf(t);
  const who = tag(t);
  const type = findTableType(t.tableTypeId);
  const support = findSupport(t.support.supportTypeId);
  const dim = t.dimensions;
  const accessories = t.accessories ?? [];

  /* The two numbers the whole board take-off hangs on — read from the polygon the plan drew. */
  const topSqm = topAreaSqm(t);
  const edgeM = topPerimeterM(t);

  const Lm = mm2m(dim.lengthMm);
  const Dm = mm2m(dim.depthMm);

  /* ------------------------------------------------------------------
   * 6.1 BOARD — the tabletop, its laminate, its screens and its carcasses
   * ------------------------------------------------------------------ */

  /* The description carries NO thickness: the Material Master row already states it, and the model's
   * `topThicknessMm` can legitimately disagree with the board that was chosen (a 25 mm prelam top on
   * a table still carrying the default 18 mm thickness). Printing both invites the BOQ to contradict
   * itself; the formula states the model's figure, and the material row states the board's. */
  const topKey = t.material?.materialKey || TABLE_ROLES.top;
  s.sheet(
    SECTION, slug("top", t), topKey,
    `Table top board — ${who}`,
    `${type.label} ${label(t)}, ${dim.topThicknessMm} mm top: tabletop polygon area from the plan = ` +
    `${d(topSqm)} m²${areaTotal(topSqm, 1, n)}. ` +
    `The area is the SHAPE's area (an L / U / curved top is not length × depth), taken from the same geometry the drawing renders`,
    topSqm * n, [], 1,
  );

  if (t.material?.laminateKey) {
    s.sheet(
      SECTION, slug("laminate", t), t.material.laminateKey,
      `Decorative laminate (top face + balancing backer) — ${who}`,
      `${d(topSqm)} m² top${areaTotal(topSqm, 1, n)}, laid on 2 faces — the backer is not optional: ` +
      `a board laminated on one face only cups`,
      topSqm * n, [], 2,
    );
  }

  /* Modesty panel — a screen the height of the panel, the length of the table. */
  const modesty = accessories.find((a) => a.accessoryId === "modesty-panel");
  if (modesty) {
    const size = accSize(modesty);
    const hMm = size.H || dim.modestyPanelHeightMm || 0;
    const lMm = size.L || dim.lengthMm;
    const qty = Math.max(1, Math.round(modesty.quantity));
    const one = sqmm2sqm(hMm * lMm);
    s.sheet(
      SECTION, slug("modesty", t), accMaterial(modesty),
      `Modesty panel — ${who}`,
      `${hMm} mm panel height × ${lMm} mm table length = ${d(one)} m²${areaTotal(one, qty, n, "panel(s)")}`,
      one * qty * n, [], 1,
    );
  }

  /* Carcass storage — 2 sides + top + bottom + back, from the accessory's own L × D × H. */
  for (const a of accessories.filter((x) => CARCASS_ACCESSORIES.has(x.accessoryId))) {
    const { L, D, H, label: name } = accSize(a);
    if (!(L > 0 && D > 0 && H > 0)) continue;
    const qty = Math.max(1, Math.round(a.quantity));
    const one = sqmm2sqm(2 * D * H + 2 * L * D + L * H);
    s.sheet(
      SECTION, slug(`carcass-${a.accessoryId}`, t), accMaterial(a),
      `${name} carcass board — ${who}`,
      `${L} × ${D} × ${H} mm: 2 sides (2 × ${D} × ${H}) + top + bottom (2 × ${L} × ${D}) + back (${L} × ${H}) = ` +
      `${d(one)} m² of board${areaTotal(one, qty, n)}. ` +
      `Shutters and drawer fronts are part of the drawer unit, not of the carcass`,
      one * qty * n, [], 1,
    );
  }

  /* Screen accessories bought as a panel (glass / fabric / acrylic on the table itself). */
  for (const a of accessories.filter(
    (x) => AREA_ACCESSORIES.has(x.accessoryId) && !CARCASS_ACCESSORIES.has(x.accessoryId) && x.accessoryId !== "modesty-panel",
  )) {
    const { L, H, label: name } = accSize(a);
    if (!(L > 0 && H > 0)) continue;
    const qty = Math.max(1, Math.round(a.quantity));
    const one = sqmm2sqm(L * H);
    s.sheet(
      SECTION, slug(`screen-${a.accessoryId}`, t), accMaterial(a),
      `${name} — ${who}`,
      `${L} × ${H} mm screen = ${d(one)} m²${areaTotal(one, qty, n, "screen(s)")}`,
      one * qty * n, [], 1,
    );
  }

  /* Workstation partition screens — the run length comes from the arrangement, not from a guess. */
  const ws = t.workstation;
  if (ws && ws.partitionMaterial !== "none" && ws.partitionHeightMm > 0) {
    const key = PARTITION_KEYS[ws.partitionMaterial];
    const { runM, how } = partitionRun(ws);
    const hM = mm2m(ws.partitionHeightMm);
    const one = runM * hM;
    if (key && runM > 0) {
      s.sheet(
        SECTION, slug("ws-partition", t), key,
        `Workstation partition screen (${ws.partitionMaterial}) — ${who}`,
        `${how} ⇒ ${d(runM)} m of screen × ${ws.partitionHeightMm} mm high = ${d(one)} m²${areaTotal(one, 1, n)}. ` +
        `The run is read off the arrangement the plan draws, so a screen in the BOQ is a screen on the drawing`,
        one * n, [], 1,
      );
    }
  }

  /* Panel bases carry the top on board gables instead of legs — the board IS the support. */
  if (support.kind === "panel") {
    const gableKey = t.support.panelMaterialKey ?? support.defaultMaterialKey;
    const one = sqmm2sqm(dim.depthMm * dim.heightMm) * 2;
    s.sheet(
      SECTION, slug("panel-base", t), gableKey,
      `${support.label} — side gables — ${who}`,
      `2 gables × ${dim.depthMm} mm deep × ${dim.heightMm} mm high = ${d(one)} m²${areaTotal(one, 1, n)}. ` +
      `A panel base has NO legs — the board is the structure`,
      one * n, [], 1,
    );
  }

  /* ------------------------------------------------------------------
   * 6.2 STEEL — every linear item
   * ------------------------------------------------------------------ */

  const legKey = t.support.profileKey ?? support.defaultMaterialKey;
  const legHeightM = mm2m(dim.legHeightMm ?? Math.max(0, dim.heightMm - dim.topThicknessMm));
  const legs = Math.max(0, Math.round(t.support.numberOfLegs ?? support.defaultLegs));
  let legsRunM = 0;

  if (isSteelBase(support.kind) && legs > 0 && legHeightM > 0) {
    legsRunM = legs * legHeightM * n;
    s.steel(
      SECTION, slug("legs", t), legKey,
      `Table frame legs / columns — ${who}`,
      `${legs} leg(s) per table${perQty(n)} = ${legs * n} × ${d(legHeightM)} m (top height ${dim.heightMm} mm − ` +
      `${dim.topThicknessMm} mm top). Running length ${d(legsRunM)} m`,
      legs * n, legHeightM,
    );
  }

  /* Apron rails — the under-frame that stops the top from sagging: 2 along, 2 across. */
  const railKey = TABLE_ROLES.rail;
  const railsRunM = (2 * Lm + 2 * Dm) * n;
  s.steel(
    SECTION, slug("rail-long", t), railKey,
    `Apron rail — long side — ${who}`,
    `2 rails along the ${dim.lengthMm} mm length${perQty(n)} = ${2 * n} × ${d(Lm)} m`,
    2 * n, Lm,
  );
  s.steel(
    SECTION, slug("rail-short", t), railKey,
    `Apron rail — short side — ${who}`,
    `2 rails across the ${dim.depthMm} mm depth${perQty(n)} = ${2 * n} × ${d(Dm)} m`,
    2 * n, Dm,
  );

  /* Edge banding — the perimeter of the polygon, not of its bounding box. */
  const edgeKey = t.material?.edgeBandKey ?? TABLE_ROLES.edge;
  s.steel(
    SECTION, slug("edgeband", t), edgeKey,
    `Edge banding — ${who}`,
    `Tabletop perimeter from the plan = ${d(edgeM)} m per table${perQty(n)} = ${d(edgeM * n)} m of ` +
    `${dim.edgeBandThicknessMm} mm band. A curved or L-shaped top bands its true outline, which is longer than 2 × (L + D)`,
    n, edgeM,
  );

  /* Cable tray — fitted as an accessory, or switched on in the electrical block. */
  const trayAcc = accessories.find((a) => a.accessoryId === "cable-tray");
  if (trayAcc || t.electrical?.cableTray) {
    const trayQty = trayAcc ? Math.max(1, Math.round(trayAcc.quantity)) : 1;
    const trayMm = trayAcc?.lengthMm ?? dim.cableTrayLengthMm ?? Math.round(dim.lengthMm * 0.8);
    const trayM = mm2m(trayMm);
    s.steel(
      SECTION, slug("cable-tray", t), trayAcc ? accMaterial(trayAcc) : TABLE_ROLES.cableTray,
      `Under-desk cable tray — ${who}`,
      `${trayQty} tray × ${trayMm} mm${perQty(n)} = ${trayQty * n} × ${d(trayM)} m` +
      `${trayAcc ? "" : " (cable tray switched on in the table's electrical block)"}`,
      trayQty * n, trayM,
    );
  }

  /* Wire-management box — a tray by another name, and priced per metre like one. */
  for (const a of accessories.filter((x) => x.accessoryId === "wire-box")) {
    const { L, label: name } = accSize(a);
    const qty = Math.max(1, Math.round(a.quantity));
    if (!(L > 0)) continue;
    s.steel(
      SECTION, slug("wire-box", t), accMaterial(a),
      `${name} — ${who}`,
      `${qty} box × ${L} mm${perQty(n)} = ${qty * n} × ${d(mm2m(L))} m`,
      qty * n, mm2m(L),
    );
  }

  /* ------------------------------------------------------------------
   * 6.3 ELECTRICAL — the points, then the conduit and wire that feed them
   * ------------------------------------------------------------------ */

  const load = tableElectricalLoad(t);

  for (const p of ELEC_POINTS) {
    const qty = pointQty(t, p.field);
    if (qty <= 0) continue;
    s.count(
      SECTION, slug(`elec-${p.field}`, t), p.key,
      `${p.label} — ${who}`,
      `${qty} × ${p.label}${perQty(n)} = ${qty * n} nos` +
      (p.watts > 0 ? ` · ${qty * p.watts} W per table` : " · signal point, no connected load"),
      qty * n,
    );
  }

  if (load.points > 0) {
    /* The route runs from the table to the NEAREST WALL. This module has no cabin geometry — the
     * caller measures it and passes it in; 3 m is the fallback, stated in the formula so nobody
     * mistakes an assumption for a measurement. */
    const measured = ctx.cableRunM?.[t.id];
    const runM = Number.isFinite(measured) && (measured as number) > 0
      ? (measured as number)
      : DEFAULT_CABLE_RUN_M;
    const assumed = !(Number.isFinite(measured) && (measured as number) > 0);
    const circuits = Math.max(1, ceil(load.points / POINTS_PER_CIRCUIT));
    const wireM = runM * circuits * CORES_PER_CIRCUIT;

    s.steel(
      SECTION, slug("conduit", t), TABLE_ROLES.conduit,
      `PVC conduit — table to wall drop — ${who}`,
      `Route from the table to the nearest wall = ${d(runM)} m${assumed ? " (assumed — the caller supplied no measured route)" : " (measured from the plan)"}` +
      `${perQty(n)} = ${n} × ${d(runM)} m`,
      n, runM,
    );

    s.steel(
      SECTION, slug("wire", t), TABLE_ROLES.wire,
      `Copper wire — table circuits — ${who}`,
      `${load.points} point(s) ⇒ circuits = max(1, ceil(${load.points} ÷ ${POINTS_PER_CIRCUIT})) = ${circuits}; ` +
      `wire = ${d(runM)} m route × ${circuits} circuit(s) × ${CORES_PER_CIRCUIT} cores (phase + neutral + earth) = ${d(wireM)} m` +
      `${perQty(n)}. Connected load ${d(load.watts)} W ⇒ ${load.suggestedMcbA} A MCB`,
      n, wireM,
    );
  }

  /* ------------------------------------------------------------------
   * 6.4 COUNT — the base, the hardware, the accessories and the chairs
   * ------------------------------------------------------------------ */

  if (support.kind === "bracket") {
    const brackets = Math.max(1, Math.round(t.wallMount?.bracketQty ?? 2));
    s.count(
      SECTION, slug("bracket", t), support.defaultMaterialKey,
      `${support.label} — ${who}`,
      `${brackets} bracket(s) per table${perQty(n)} = ${brackets * n} nos` +
      (t.wallMount?.maxLoadKg ? ` · rated for ${t.wallMount.maxLoadKg} kg` : ""),
      brackets * n,
    );
  }

  /* Levellers / castors come from the SUPPORT flags, with two guards:
   *   · the "levellers" / "wheels" ACCESSORIES exist as well and would bill the same feet twice, so
   *     the flag defers to the accessory whenever both are on;
   *   · a BRACKET base has no feet to put them on. createTable() seeds `levellers: true` on every
   *     table regardless of its base, so that flag is a data default, not a customer's decision —
   *     honouring it on a cantilevered wall table would put 4 adjustable feet on a BOQ for a table
   *     that does not touch the floor. Bracket bases are therefore excluded.
   * A floor-standing base that genuinely wants neither simply leaves both flags false. */
  const hasAcc = (id: string) => accessories.some((a) => a.accessoryId === id);
  const standsOnFloor = support.kind !== "bracket";

  if (standsOnFloor && t.support.levellers && !hasAcc("levellers")) {
    s.count(
      SECTION, slug("leveller", t), TABLE_ROLES.leveller,
      `Adjustable levellers — ${who}`,
      `${FEET_PER_TABLE} levellers per table (one per foot)${perQty(n)} = ${FEET_PER_TABLE * n} nos`,
      FEET_PER_TABLE * n,
    );
  }
  if (standsOnFloor && t.support.castors && !hasAcc("wheels")) {
    s.count(
      SECTION, slug("castor", t), TABLE_ROLES.castor,
      `Castor wheels — ${who}`,
      `${FEET_PER_TABLE} castors per table (one per foot)${perQty(n)} = ${FEET_PER_TABLE * n} nos`,
      FEET_PER_TABLE * n,
    );
  }

  s.count(
    SECTION, slug("screw", t), TABLE_ROLES.screw,
    `Assembly screws — ${who}`,
    `${SCREWS_PER_TABLE} screws per table (top to frame, gables, accessories)${perQty(n)} = ${SCREWS_PER_TABLE * n} nos`,
    SCREWS_PER_TABLE * n,
  );
  s.count(
    SECTION, slug("connector", t), TABLE_ROLES.connector,
    `Knock-down connectors — ${who}`,
    `${CONNECTORS_PER_TABLE} connectors per table (a knock-down top ships flat and is bolted on site)${perQty(n)} = ${CONNECTORS_PER_TABLE * n} nos`,
    CONNECTORS_PER_TABLE * n,
  );

  /* Accessories — everything the catalogue prices per PIECE. The board-and-tray accessories were
   * taken off above as sheet / steel, and are skipped here so they are not billed twice. */
  let accessoryUnits = 0;
  let drawers = 0;

  for (const a of accessories) {
    const qty = Math.max(1, Math.round(a.quantity));
    accessoryUnits += qty;
    drawers += (DRAWERS_PER_UNIT[a.accessoryId] ?? 0) * qty;

    /* A power manager / pop-up socket is ONE physical item that the model stores in
     * `t.electrical`, not in `t.accessories` — the electrical block below bills it. Skipping it
     * here is what stops a table with `powerManagerQty: 4` AND a legacy "power-manager" accessory
     * row from billing five of them. clampTable() strips these on load, so this is the belt to
     * that braces. */
    if (ELECTRICAL_ACCESSORY_IDS.has(a.accessoryId)) continue;

    if (AREA_ACCESSORIES.has(a.accessoryId) || LINEAR_ACCESSORIES.has(a.accessoryId)) continue;

    const { label: name } = accSize(a);
    s.count(
      SECTION, slug(`acc-${a.accessoryId}`, t), accMaterial(a),
      `${name} — ${who}`,
      `${qty} × ${name}${perQty(n)} = ${qty * n} nos`,
      qty * n,
    );
  }

  /* A drawer unit is a carcass plus its running gear: one channel PAIR and one handle per drawer,
   * one lock per unit. The unit's own line prices the carcass; these price what makes it a drawer. */
  if (drawers > 0) {
    const units = accessories
      .filter((a) => DRAWERS_PER_UNIT[a.accessoryId])
      .reduce((sum, a) => sum + Math.max(1, Math.round(a.quantity)), 0);

    s.count(
      SECTION, slug("drawer-channel", t), TABLE_ROLES.drawerChannel,
      `Drawer channels (telescopic pairs) — ${who}`,
      `1 pair per drawer × ${drawers} drawer(s)${perQty(n)} = ${drawers * n} pair(s)`,
      drawers * n,
    );
    s.count(
      SECTION, slug("drawer-handle", t), TABLE_ROLES.handle,
      `Drawer handles — ${who}`,
      `1 handle per drawer × ${drawers} drawer(s)${perQty(n)} = ${drawers * n} nos`,
      drawers * n,
    );
    s.count(
      SECTION, slug("drawer-lock", t), TABLE_ROLES.lock,
      `Drawer unit locks — ${who}`,
      `1 cam lock per drawer unit × ${units} unit(s)${perQty(n)} = ${units * n} nos (one lock secures the stack)`,
      units * n,
    );
  }

  /* Chairs — the seats the geometry placed, not a number somebody typed. */
  const seats = Math.max(0, Math.round(t.seating?.capacity ?? 0));
  if (t.seating?.includeChairs && seats > 0) {
    const chair = findChair(t.seating.chairTypeId);
    s.count(
      SECTION, slug("chair", t), chair.materialKey,
      `${chair.label} — ${who}`,
      `Seating capacity ${seats}${perQty(n)} = ${seats * n} chair(s)`,
      seats * n,
    );
  }

  /* ------------------------------------------------------------------
   * 6.5 FINISH — powder coating the steel frame
   * ------------------------------------------------------------------ */

  const powder = /powder/i.test(t.support.frameFinish ?? "");
  const steelRunM = legsRunM + railsRunM;

  if (isSteelBase(support.kind) && powder && steelRunM > 0) {
    const legPerim = sectionPerimeterM(legKey);
    const railPerim = sectionPerimeterM(railKey);
    const area = legsRunM * legPerim + railsRunM * railPerim;
    s.sheet(
      SECTION, slug("powdercoat", t), TABLE_ROLES.powderCoat,
      `Powder coating — steel frame${t.support.powderCoatColour ? ` (${t.support.powderCoatColour})` : ""} — ${who}`,
      `Legs ${d(legsRunM)} m × ${d(legPerim)} m section perimeter + rails ${d(railsRunM)} m × ${d(railPerim)} m = ${d(area)} m² ` +
      `of coated surface. The area is the RUNNING LENGTH × the section's outer perimeter — a tube is coated all round, not on one face`,
      area, [], 1,
    );
  }

  /* ------------------------------------------------------------------
   * 6.6 LABOUR — man-hours derived from the work, never a flat number
   *
   * qty = MAN-HOURS and the material's rate is ₹/hour (category "misc", rateUnit "per_nos"), so
   * every one of these is `fractional` — an 0.08-hour edge-banding line must not round to zero.
   * ------------------------------------------------------------------ */

  const hCut = Math.max(HR_CUTTING_MIN, topSqm * HR_CUTTING_PER_SQM) * n;
  s.count(
    SECTION, slug("lab-cutting", t), TABLE_ROLES.labCutting,
    `Labour — board cutting & sizing — ${who}`,
    `max(${HR_CUTTING_MIN} h, ${d(topSqm)} m² × ${HR_CUTTING_PER_SQM} h/m²) = ${d(Math.max(HR_CUTTING_MIN, topSqm * HR_CUTTING_PER_SQM))} h` +
    `${perQty(n)} = ${d(hCut)} man-hours. The floor exists because setting a saw up for a 0.3 m² top still takes half an hour`,
    hCut, true,
  );

  const hEdge = edgeM * HR_EDGE_PER_M * n;
  s.count(
    SECTION, slug("lab-edge", t), TABLE_ROLES.labEdge,
    `Labour — edge banding — ${who}`,
    `${d(edgeM)} m of edge × ${HR_EDGE_PER_M} h/m${perQty(n)} = ${d(hEdge)} man-hours`,
    hEdge, true,
  );

  const carpOne = HR_CARPENTRY_BASE + HR_CARPENTRY_PER_ACCESSORY * accessoryUnits + HR_CARPENTRY_PER_DRAWER * drawers;
  const hCarp = carpOne * n;
  s.count(
    SECTION, slug("lab-carpentry", t), TABLE_ROLES.labCarpentry,
    `Labour — carpentry & assembly — ${who}`,
    `(${HR_CARPENTRY_BASE} h base + ${HR_CARPENTRY_PER_ACCESSORY} h × ${accessoryUnits} accessory unit(s) + ` +
    `${HR_CARPENTRY_PER_DRAWER} h × ${drawers} drawer(s)) = ${d(carpOne)} h${perQty(n)} = ${d(hCarp)} man-hours`,
    hCarp, true,
  );

  if (isSteelBase(support.kind) && steelRunM > 0) {
    const hWeld = steelRunM * HR_WELD_PER_M;
    const hGrind = hWeld * HR_GRIND_PER_WELD_HR;
    s.count(
      SECTION, slug("lab-welding", t), TABLE_ROLES.labWelding,
      `Labour — frame welding — ${who}`,
      `legs ${d(legsRunM)} m + rails ${d(railsRunM)} m = ${d(steelRunM)} m of steel × ${HR_WELD_PER_M} h/m = ${d(hWeld)} man-hours ` +
      `(the run already includes the ${n} table(s))`,
      hWeld, true,
    );
    s.count(
      SECTION, slug("lab-grinding", t), TABLE_ROLES.labGrinding,
      `Labour — grinding & finishing — ${who}`,
      `${d(hWeld)} welding hours × ${HR_GRIND_PER_WELD_HR} = ${d(hGrind)} man-hours — every weld that is laid has to be dressed`,
      hGrind, true,
    );
  }

  if (load.points > 0) {
    const hElec = Math.max(HR_ELEC_MIN, load.points * HR_ELEC_PER_POINT) * n;
    s.count(
      SECTION, slug("lab-electrical", t), TABLE_ROLES.labElectrical,
      `Labour — electrical installation — ${who}`,
      `max(${HR_ELEC_MIN} h, ${load.points} point(s) × ${HR_ELEC_PER_POINT} h)${perQty(n)} = ${d(hElec)} man-hours ` +
      `· ${d(load.watts)} W connected, ${load.suggestedMcbA} A MCB`,
      hElec, true,
    );
  }

  const hInstall = HR_INSTALL_PER_TABLE * n;
  s.count(
    SECTION, slug("lab-install", t), TABLE_ROLES.labInstall,
    `Labour — site installation — ${who}`,
    `${HR_INSTALL_PER_TABLE} h per table${perQty(n)} = ${d(hInstall)} man-hours`,
    hInstall, true,
  );
}
