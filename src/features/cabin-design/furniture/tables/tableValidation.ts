/**
 * Table module — VALIDATION (spec §32).
 *
 * The gate a design must pass BEFORE it can be saved, quoted or submitted. Every check produces a
 * message that NAMES the table, the offending value and the rule it broke — a customer who is told
 * "Executive Table 1: length 6 200 mm exceeds the maximum 6 000 mm" can fix it; one who is told
 * "Something went wrong" cannot (spec §32).
 *
 * SEPARATION OF CONCERNS: geometry lives in tableGeometry.ts, collisions in tableCollision.ts and
 * money in tablePricing.ts. This module OWNS none of those — it composes them and turns their
 * findings into one blocking/advisory verdict. So a rule can never be enforced here in a way that
 * disagrees with the drawing: the collision issues in the result are literally the ones the plan
 * paints red (spec §14).
 *
 * ERROR vs WARNING:
 *   error   ⇒ blocks submission (canSubmit === false). The design is not buildable as drawn.
 *   warning ⇒ advisory. The design is buildable but a human should look at it.
 * The admin override (spec §14) demotes the COLLISION errors to warnings so a knowingly-tight
 * layout can still be quoted. It deliberately does NOT demote `outside_cabin`: a table sticking
 * through a cabin wall is not "tight", it is impossible, and no override can make it fabricable.
 */

import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import type { MaterialIndex } from "@/lib/boq/types";

import { cabinSizeMm } from "./cabinObstacles";
import { buildContext, checkAllTables } from "./tableCollision";
import { LIMITS } from "./tableDefaults";
import { wallDistances } from "./tableGeometry";
import type { TableCost } from "./tablePricing";
import {
  DEFAULT_CLEARANCES,
  type CabinTable,
  type ClearanceRules,
  type TableIssue,
  type TableIssueCode,
  type TableIssueSeverity,
  type TableOverride,
} from "./tableSchema";
import { findTableType, hasReturn, hasStem, hasUShape, isRoundish, TABLE_SHAPES } from "./tableTypes";

/* ==========================================================================
 * 1. Contract
 * ========================================================================== */

export interface ValidationInput {
  config: CabinConfig;
  tables: CabinTable[];
  materials: MaterialIndex;
  clearances?: ClearanceRules;
  /** Admin override (spec §14) — downgrades collision ERRORS to warnings. */
  override?: TableOverride;
  /** Priced tables from ./tablePricing. Absent ⇒ the pricing / BOQ checks are skipped. */
  costs?: TableCost[];
}

export interface ValidationResult {
  issues: TableIssue[];
  errors: TableIssue[];
  warnings: TableIssue[];
  canSubmit: boolean;
}

/* ==========================================================================
 * 2. Rules the messages quote
 * ========================================================================== */

/** A wall-mounted top heavier than this needs the wall stiffened behind the brackets (spec §20). */
const WALL_REINFORCEMENT_LOAD_KG = 40;

/**
 * A table whose top is within this of a wall can take its power from a wall drop / skirting
 * outlet. Beyond it the cable has nowhere to go but across the floor — hence the floor box.
 */
const CABLE_DROP_REACH_MM = 300;

/** Collision-family codes. These — and only these — the admin override may demote (spec §14). */
const COLLISION_CODES: readonly TableIssueCode[] = [
  "overlap_table",
  "overlap_fixture",
  "overlap_partition",
  "overlap_door_swing",
  "overlap_door",
  "overlap_window",
  "clearance_wall",
  "clearance_passage",
  "clearance_chair",
  "clearance_drawer",
];

/* ==========================================================================
 * 3. Small helpers
 * ========================================================================== */

/** mm for a message. Keeps one decimal so a 0.8 mm edge band does not print as "1 mm". */
const MM = (v: number): string => `${Math.round(v * 10) / 10} mm`;

/** The shape's UI label ("L shape", "Custom polygon"), so a message names what the customer picked. */
const shapeLabel = (s: CabinTable["shape"]): string =>
  TABLE_SHAPES.find((x) => x.id === s)?.label ?? s;

const mk = (
  code: TableIssueCode,
  severity: TableIssueSeverity,
  message: string,
  tableId: string,
  extra: { refs?: string[]; hint?: string; overlapMm?: number } = {},
): TableIssue => ({
  code,
  severity,
  message,
  tableId,
  refs: extra.refs ?? [],
  ...(extra.overlapMm === undefined ? {} : { overlapMm: extra.overlapMm }),
  ...(extra.hint === undefined ? {} : { hint: extra.hint }),
});

/** Electrical points the table CARRIES (a floor box is the supply, not a load — excluded). */
const electricalPoints = (t: CabinTable): number => {
  const e = t.electrical;
  return (
    e.socket5A + e.socket6A + e.socket16A +
    e.usbPoints + e.dataPoints + e.lanPoints + e.hdmiPoints +
    e.powerManagerQty + e.popupBoxQty
  );
};

/** Wall span (mm) a wall-mounted table has to fit on. Rear/front run along the cabin LENGTH,
 *  left/right along its WIDTH — the same convention as pricing.ts's `sideSpanFt`. */
const wallSpanMm = (
  wall: string,
  cabin: { lengthMm: number; widthMm: number },
): number | null => {
  if (wall === "rear" || wall === "front") return cabin.lengthMm;
  if (wall === "left" || wall === "right") return cabin.widthMm;
  return null; // not one of the four walls — a corrupt saved config
};

/* ==========================================================================
 * 4. Checks
 * ========================================================================== */

/** Dimensions: > 0, inside LIMITS, top thinner than the table, arms that can physically fit. */
function checkDimensions(
  t: CabinTable,
  cabin: { lengthMm: number; widthMm: number },
  out: TableIssue[],
): void {
  const d = t.dimensions;
  const bad = (message: string, hint?: string) =>
    out.push(mk("invalid_dimension", "error", message, t.id, { hint }));

  const inRange = (label: string, v: number | undefined, lim: { min: number; max: number }) => {
    if (v === undefined || !Number.isFinite(v)) {
      bad(`${t.name}: ${label} is not set.`, `Enter a ${label} between ${MM(lim.min)} and ${MM(lim.max)}.`);
      return;
    }
    if (v <= 0) {
      bad(`${t.name}: ${label} is ${MM(v)} — it must be greater than zero.`);
      return;
    }
    if (v < lim.min) bad(`${t.name}: ${label} ${MM(v)} is below the minimum ${MM(lim.min)}.`);
    else if (v > lim.max) bad(`${t.name}: ${label} ${MM(v)} exceeds the maximum ${MM(lim.max)}.`);
  };

  inRange("length", d.lengthMm, LIMITS.lengthMm);
  inRange("depth", d.depthMm, LIMITS.depthMm);
  inRange("height", d.heightMm, LIMITS.heightMm);
  inRange("top thickness", d.topThicknessMm, LIMITS.topThicknessMm);
  inRange("edge-band thickness", d.edgeBandThicknessMm, LIMITS.edgeBandThicknessMm);
  if (d.legWidthMm !== undefined) inRange("leg width", d.legWidthMm, LIMITS.legWidthMm);
  if (isRoundish(t.shape) && d.radiusMm !== undefined) inRange("radius", d.radiusMm, LIMITS.radiusMm);

  /* The top sits ON the legs — a top as thick as the table means the table has no legs. */
  if (
    Number.isFinite(d.topThicknessMm) && Number.isFinite(d.heightMm) &&
    d.topThicknessMm >= d.heightMm
  ) {
    bad(
      `${t.name}: top thickness ${MM(d.topThicknessMm)} is not less than the table height ${MM(d.heightMm)}.`,
      "The top must be thinner than the table — it sits on top of the legs.",
    );
  }

  /* An arm longer than the cabin's longest inside dimension cannot fit at ANY rotation, so it is
   * a dimension error rather than a placement one — moving the table will never rescue it. */
  const longest = Math.max(cabin.lengthMm, cabin.widthMm);
  const armFits = (label: string, lengthMm: number) => {
    if (lengthMm > longest) {
      bad(
        `${t.name}: the ${label} is ${MM(lengthMm)} long — longer than the cabin's longest inside dimension (${MM(longest)}), so it cannot fit at any rotation.`,
        "Shorten the return, or use a bigger cabin.",
      );
    }
  };

  if (t.returnSection) {
    inRange("return length", t.returnSection.lengthMm, LIMITS.returnLengthMm);
    inRange("return depth", t.returnSection.depthMm, LIMITS.returnDepthMm);
    armFits(hasStem(t.shape) ? "T-shape stem" : "return arm", t.returnSection.lengthMm);
  }
  if (t.uShape) {
    inRange("left return length", t.uShape.leftLengthMm, LIMITS.returnLengthMm);
    inRange("left return depth", t.uShape.leftDepthMm, LIMITS.returnDepthMm);
    inRange("right return length", t.uShape.rightLengthMm, LIMITS.returnLengthMm);
    inRange("right return depth", t.uShape.rightDepthMm, LIMITS.returnDepthMm);
    armFits("left return arm", t.uShape.leftLengthMm);
    armFits("right return arm", t.uShape.rightLengthMm);
  }
}

/** The selected TYPE + SHAPE must carry every block their geometry reads (spec §3). */
function checkShapeRequirements(t: CabinTable, out: TableIssue[]): void {
  const def = findTableType(t.tableTypeId);
  const bad = (message: string, hint?: string) =>
    out.push(mk("invalid_dimension", "error", message, t.id, { hint }));

  const shape = shapeLabel(t.shape);

  if (!def.shapes.includes(t.shape)) {
    bad(
      `${t.name}: a ${def.label} cannot be built as a "${shape}" — allowed shapes are ${def.shapes.map(shapeLabel).join(", ")}.`,
      "Pick one of the allowed shapes, or change the table type.",
    );
  }

  if ((hasReturn(t.shape) || hasStem(t.shape)) && !t.returnSection) {
    bad(
      `${t.name}: the ${shape} outline needs its ${hasStem(t.shape) ? "stem" : "return section"} (side, length and depth) — none is set.`,
      "Set the return arm's side, length and depth.",
    );
  }
  if (hasUShape(t.shape) && !t.uShape) {
    bad(
      `${t.name}: the ${shape} outline needs both return arms (left and right length + depth) — neither is set.`,
      "Set the left and right return arms.",
    );
  }
  if (isRoundish(t.shape) && !((t.dimensions.radiusMm ?? 0) > 0)) {
    bad(
      `${t.name}: the ${shape} outline is driven by its radius, and no radius is set.`,
      `Set a radius between ${MM(LIMITS.radiusMm.min)} and ${MM(LIMITS.radiusMm.max)}.`,
    );
  }
  if (t.shape === "custom") {
    const pts = (t.dimensions.customPoints ?? []).filter(
      (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
    );
    if (pts.length < 3) {
      bad(
        `${t.name}: the ${shape} outline needs at least 3 points — it has ${pts.length}.`,
        "Add points to the custom polygon, or switch to a standard shape.",
      );
    }
  }
}

/** Every Material Master key the table references must exist, or the BOQ cannot price it. */
function checkMaterials(t: CabinTable, materials: MaterialIndex, out: TableIssue[]): void {
  const missing = (key: string, role: string) =>
    out.push(
      mk("missing_material", "error", `${t.name}: the ${role} material "${key}" is not in the Material Master.`, t.id, {
        refs: [key],
        hint: "Add the material in Admin → Material Master, or pick another one.",
      }),
    );

  if (!t.material.materialKey) {
    out.push(
      mk("missing_material", "error", `${t.name}: no tabletop material is selected.`, t.id, {
        hint: "Choose a tabletop material.",
      }),
    );
  } else if (!materials[t.material.materialKey]) {
    missing(t.material.materialKey, "tabletop");
  }

  if (t.material.edgeBandKey && !materials[t.material.edgeBandKey]) missing(t.material.edgeBandKey, "edge-band");
  if (t.material.laminateKey && !materials[t.material.laminateKey]) missing(t.material.laminateKey, "laminate");
  if (t.support.profileKey && !materials[t.support.profileKey]) missing(t.support.profileKey, "frame / leg profile");
  if (t.support.panelMaterialKey && !materials[t.support.panelMaterialKey]) {
    missing(t.support.panelMaterialKey, "panel base");
  }
  for (const a of t.accessories) {
    if (a.materialKey && !materials[a.materialKey]) missing(a.materialKey, `"${a.accessoryId}" accessory`);
  }
}

/** Quantity — identical copies of the SAME table (spec §4: never zero, never absurd). */
function checkQuantity(t: CabinTable, out: TableIssue[]): void {
  const q = t.quantity;
  if (!Number.isFinite(q) || !Number.isInteger(q)) {
    out.push(
      mk("invalid_quantity", "error", `${t.name}: quantity "${q}" is not a whole number.`, t.id, {
        hint: `Enter a whole number between ${LIMITS.quantity.min} and ${LIMITS.quantity.max}.`,
      }),
    );
    return;
  }
  if (q < LIMITS.quantity.min || q > LIMITS.quantity.max) {
    out.push(
      mk("invalid_quantity", "error", `${t.name}: quantity ${q} is outside the allowed range ${LIMITS.quantity.min}–${LIMITS.quantity.max}.`, t.id),
    );
  }
}

/** The table priced, and priced to something. A zero-rupee table means the take-off silently
 *  produced nothing — which is exactly the failure the customer would only discover on the invoice. */
function checkPricing(t: CabinTable, cost: TableCost | undefined, out: TableIssue[]): void {
  if (!t.material.materialKey) return; // already reported as missing_material

  if (!cost) {
    out.push(
      mk("pricing_failed", "error", `${t.name}: could not be priced — the take-off produced no cost for it.`, t.id, {
        hint: "Check that the table's materials exist in the Material Master and carry a rate.",
      }),
    );
    return;
  }

  if (!(cost.totalAmount > 0)) {
    out.push(
      mk("pricing_failed", "error", `${t.name}: priced at ₹${Math.round(cost.totalAmount || 0)} — a table with a material must cost more than ₹0.`, t.id, {
        hint: "A rate is missing in the Material Master, or every BOQ line came out empty.",
      }),
    );
  }

  /* BOQ sanity. A NEGATIVE quantity is always a take-off bug and blocks the quote. A ZERO
   * quantity is only suspicious — a rounded-down labour line can legitimately land on 0 — so it
   * warns rather than blocks. */
  for (const line of cost.lines ?? []) {
    if (line.enabled === false) continue;
    if (line.qty < 0) {
      out.push(
        mk("pricing_failed", "error", `${t.name}: BOQ line "${line.description}" has a negative quantity (${line.qty} ${line.uom}).`, t.id, {
          refs: [line.id],
        }),
      );
    } else if (line.qty === 0) {
      out.push(
        mk("pricing_failed", "warning", `${t.name}: BOQ line "${line.description}" has a zero quantity — it will contribute nothing to the quotation.`, t.id, {
          refs: [line.id],
          hint: "Check the dimension that drives this line.",
        }),
      );
    }
  }
}

/** Wall-mounted / folding tables (spec §20): a real wall, a wall long enough, and a wall strong
 *  enough for the load the brackets will hang on it. */
function checkWallMount(
  t: CabinTable,
  cabin: { lengthMm: number; widthMm: number },
  out: TableIssue[],
): void {
  const def = findTableType(t.tableTypeId);
  if (!def.panels?.includes("wallMount")) return;

  const wm = t.wallMount;
  if (!wm) {
    out.push(
      mk("no_wall", "error", `${t.name}: a ${def.label} must be fixed to a wall, and no wall is selected.`, t.id, {
        hint: "Pick the front, rear, left or right wall.",
      }),
    );
    return;
  }

  const span = wallSpanMm(wm.wall, cabin);
  if (span === null) {
    out.push(
      mk("no_wall", "error", `${t.name}: "${wm.wall}" is not a wall of this cabin — pick front, rear, left or right.`, t.id),
    );
    return;
  }

  /* The top is fixed flat along the wall, so it eats `lengthMm` of that wall starting at
   * `offsetMm` from the wall's start corner — exactly the model pricing.ts uses for openings. */
  const need = Math.max(0, wm.offsetMm) + t.dimensions.lengthMm;
  if (need > span) {
    out.push(
      mk("does_not_fit", "error", `${t.name}: it needs ${MM(need)} of the ${wm.wall} wall (${MM(wm.offsetMm)} offset + ${MM(t.dimensions.lengthMm)} top) but that wall is only ${MM(span)} long.`, t.id, {
        overlapMm: Math.round(need - span),
        hint: `Reduce the offset to at most ${MM(Math.max(0, span - t.dimensions.lengthMm))}, shorten the top, or move it to a longer wall.`,
      }),
    );
  }

  if (wm.maxLoadKg > WALL_REINFORCEMENT_LOAD_KG && !wm.wallReinforcement) {
    out.push(
      mk("wall_reinforcement", "warning", `${t.name}: it is rated for ${wm.maxLoadKg} kg, above the ${WALL_REINFORCEMENT_LOAD_KG} kg an un-reinforced cabin wall carries — the ${wm.wall} wall needs reinforcement behind the brackets.`, t.id, {
        hint: "Tick Wall reinforcement, or lower the rated load.",
      }),
    );
  }
}

/** Electrical points need a route to the supply (spec §21). A desk marooned in the middle of the
 *  room with sockets on it and no floor box means a cable trailing across the floor. */
function checkCableRoute(
  t: CabinTable,
  cabin: { lengthMm: number; widthMm: number },
  out: TableIssue[],
): void {
  const points = electricalPoints(t);
  if (points <= 0) return;
  if (t.electrical.floorBoxQty > 0) return;

  const w = wallDistances(t, cabin.lengthMm, cabin.widthMm);
  const nearestWallMm = Math.min(w.leftMm, w.rightMm, w.rearMm, w.frontMm);
  if (nearestWallMm <= CABLE_DROP_REACH_MM) return; // a wall drop / skirting outlet reaches it

  out.push(
    mk("no_cable_route", "warning", `${t.name}: it carries ${points} electrical point${points === 1 ? "" : "s"} but stands free in the room — its nearest wall is ${MM(nearestWallMm)} away, so there is no wall drop to feed it.`, t.id, {
      hint: "Add a floor box under the table, or move the table within " +
        `${MM(CABLE_DROP_REACH_MM)} of a wall so the cable can drop down the wall.`,
    }),
  );
}

/* ==========================================================================
 * 5. The gate
 * ========================================================================== */

export function validateTables(input: ValidationInput): ValidationResult {
  const { config, tables, materials, override } = input;
  const clearances = input.clearances ?? DEFAULT_CLEARANCES;
  const cabin = cabinSizeMm(config);
  const costById = new Map((input.costs ?? []).map((c) => [c.tableId, c]));

  const issues: TableIssue[] = [];

  /* --- placement: boundaries, obstacles, clearances (spec §14) -----------------------------
   * buildContext derives the obstacle set from the cabin config; the tables under test are the
   * ones we were handed, not whatever the config happens to carry, so a caller can validate a
   * draft edit before committing it. */
  if (tables.length) {
    const ctx = { ...buildContext(config, clearances), tables };
    issues.push(...checkAllTables(ctx));
  }

  /* --- the Material Master itself. One error beats a wall of "missing_material" per table. --- */
  const masterLoaded = Object.keys(materials ?? {}).length > 0;
  if (!masterLoaded && tables.length) {
    issues.push(
      mk("missing_material", "error", "The Material Master has not loaded, so no table can be priced or validated against it.", tables[0].id, {
        hint: "Reload the page; if it persists, seed the Material Master in Admin → Materials.",
      }),
    );
  }

  /* --- per table ------------------------------------------------------------------------- */
  for (const t of tables) {
    checkDimensions(t, cabin, issues);
    checkShapeRequirements(t, issues);
    if (masterLoaded) checkMaterials(t, materials, issues);
    checkQuantity(t, issues);
    checkWallMount(t, cabin, issues);
    checkCableRoute(t, cabin, issues);
    if (input.costs) checkPricing(t, costById.get(t.id), issues);
  }

  /* --- admin override (spec §14) ---------------------------------------------------------- */
  const allow = !!override?.allowCollisions;
  const reason = override?.reason?.trim();
  const final = issues.map((i) => {
    if (!allow || i.severity !== "error" || !COLLISION_CODES.includes(i.code)) return i;
    return {
      ...i,
      severity: "warning" as TableIssueSeverity,
      hint: reason ? `Accepted by admin override: ${reason}` : "Accepted by admin override.",
    };
  });

  const errors = final.filter((i) => i.severity === "error");
  const warnings = final.filter((i) => i.severity === "warning");

  return { issues: final, errors, warnings, canSubmit: errors.length === 0 };
}
