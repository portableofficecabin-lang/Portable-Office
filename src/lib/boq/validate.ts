/**
 * MATERIAL BOQ — validation (spec §10). Pure: no React, no DOM, no Supabase.
 *
 * WHY THIS FILE EXISTS: every other module in the pipeline is deliberately forgiving. calc.ts
 * returns 0 kg for a material with no unit weight; costOf() returns ₹0 for a null rate; the engine
 * prices an unknown material key as a zeroed "UNKNOWN:" line instead of throwing; a take-off
 * producer that forgets a door frame simply emits nothing. That forgiveness is correct — a
 * plausible-looking guess is far more expensive than a zero — but it is only SAFE if something
 * downstream shouts about every zero. This is that something.
 *
 * Two families of rule live here, and they differ in kind:
 *
 *  1. DATA rules (unknown_material, missing_unit_weight, missing_rate, stale_rate) — the Material
 *     Master is incomplete for the materials THIS quotation actually uses. Grouped by material key,
 *     because the fix is one edit in the Material Master, not one edit per line.
 *
 *  2. GEOMETRY rules (unlinked_element, duplicate_calculation, shared_wall_double_counted,
 *     opening_exceeds_wall, negative_quantity, zero_length_member, quantity_drawing_mismatch) — the
 *     BOQ has drifted from the drawing. These are the regression net. quantity_drawing_mismatch in
 *     particular trusts the take-off with NOTHING: it re-derives the envelope area, the corner-post
 *     count and the opening-frame counts from the DRAWING META alone and asserts the priced lines
 *     agree. A colonyTakeoff that double-counts a shared wall, or a cabinTakeoff that loses a
 *     window, cannot satisfy both the take-off and the meta cross-check at once.
 *
 * SCOPE: only ENABLED lines are judged — an admin who switched a section off has said "not in this
 * quotation", and a validator that keeps arguing gets ignored. The two exceptions are
 * `negative_quantity` and `opening_exceeds_wall`, which run over EVERY line: impossible arithmetic
 * is a defect in the code that produced it, and disabling the line does not fix that code.
 *
 * NAMING CONTRACT: the meta cross-checks have to find "the corner posts" and "the door heads" in a
 * flat list of lines. Matching on ids would couple validation to every producer's id scheme;
 * matching on the material key would break the moment a template swaps SHS for RHS. So we match on
 * the MEANING carried by the description — which is also what the human reads on the report. The
 * take-off producers must honour the LEXICON below: corner posts say "corner", a door frame's head
 * says "door" + "head", a window's head/sill say "window" + "head"/"sill", and linings, ceilings
 * and insulation say so, so the external skin can be told apart from the layers behind it.
 */

import type {
  BoqIssue,
  BoqLine,
  BoqSection,
  BoqSettings,
  IssueCode,
  IssueSeverity,
  Material,
  MaterialCategory,
  MaterialIndex,
  Takeoff,
  TakeoffItem,
} from "@/lib/boq/types";
import { round } from "@/lib/boq/types";

/* ==========================================================================
 * 0. LEXICON + THRESHOLDS
 * ========================================================================== */

const RX_CORNER = /\bcorner\b/i;
const RX_DOOR = /\bdoors?\b/i;
const RX_WINDOW = /\bwindows?\b/i;
const RX_HEAD = /\b(head|lintel)\b/i;
const RX_SILL = /\bsill\b/i;
/** A covering that sits BEHIND the external skin — never part of the envelope area. */
const RX_NOT_EXTERNAL =
  /\b(internal|inner|inside|lining|ceiling|insulat\w*|grill|glaz\w*|floor(ing)?|deck(ing)?|soffit)\b/i;

const ELEVATIONS: BoqSection[] = ["front", "rear", "left", "right"];

/** Categories whose lines are weighed — a null unit weight on one of these silently loses tonnage. */
const WEIGHED: Set<MaterialCategory> = new Set<MaterialCategory>([
  "steel_section",
  "sheet",
  "panel",
  "insulation",
  "board",
]);

/** The envelope cross-check tolerates 1% of rounding + spacing slack before it calls it drift. */
const AREA_TOLERANCE = 0.01;
/** A member shorter than a millimetre is not a member. */
const MIN_CUT_M = 0.001;
/** A rate older than this has stopped being a rate and become a memory. */
const STALE_RATE_DAYS = 180;

/* ==========================================================================
 * 1. PURE HELPERS
 * ========================================================================== */

const norm = (s: string): string => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const text = (l: BoqLine): string => `${l.materialKey} ${l.description}`;
const itemText = (i: TakeoffItem): string => `${i.materialKey} ${i.description}`;

/**
 * The engine's line shape IS the discriminator, and the nulls are load-bearing:
 *   steel → cutLengthM / runningLengthM / pieces set, area fields null
 *   sheet → grossAreaSqm / netAreaSqm set, pieces null
 *   count → pieces set, cutLengthM null, area fields null
 * So a steel line is one with a cut length. Testing `pieces !== null` as well would sweep every
 * counted door and light fitting into the steel rules.
 */
const isSteelLine = (l: BoqLine): boolean => l.cutLengthM !== null;
const isSheetLine = (l: BoqLine): boolean => l.grossAreaSqm !== null || l.netAreaSqm !== null;

/** Pieces if the line has them, else the billed quantity — the "how many" of any line. */
const countOf = (l: BoqLine): number => l.pieces ?? l.qty ?? 0;

const num = (n: number): string => String(round(n, 2));
const offBy = (actual: number, expected: number): string =>
  expected === 0 ? "—" : `${round((Math.abs(actual - expected) / Math.abs(expected)) * 100, 1)}%`;

function issue(
  code: IssueCode,
  severity: IssueSeverity,
  message: string,
  refs: string[],
  hint: string,
  section?: BoqSection,
): BoqIssue {
  return section
    ? { code, severity, message, refs, hint, section }
    : { code, severity, message, refs, hint };
}

/** Identity of a set of refs, order-independent — lets one rule skip what another already raised. */
const signature = (refs: string[]): string => [...refs].sort().join("|");

/** Group anything by a string key, preserving insertion order. */
function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = groups.get(k);
    if (bucket) bucket.push(row);
    else groups.set(k, [row]);
  }
  return groups;
}

/**
 * Enabled for judging: the engine's own flag AND the section switch AND the per-line override. Any
 * one of the three being off means the line is not in this quotation.
 */
function enabledLines(lines: BoqLine[], settings: BoqSettings): BoqLine[] {
  const off = new Set<BoqSection>(settings.disabledSections ?? []);
  return lines.filter(
    (l) => l.enabled && !off.has(l.section) && settings.overrides?.[l.id]?.enabled !== false,
  );
}

const sectionLive = (s: BoqSection, settings: BoqSettings): boolean =>
  !(settings.disabledSections ?? []).includes(s);

/**
 * Age of a rate in whole days.
 *
 * Written INLINE and deliberately NOT imported from materialMaster.ts: that module is the DB layer
 * and pulls in the Supabase client, and this module must stay PURE (no Supabase, no DOM, no React)
 * so the engine, the tests and a server render can all run it. A 12-line date subtraction is a
 * cheaper price than a Supabase import in the pricing path.
 */
function ageInDays(effectiveDate: string, nowMs: number): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(effectiveDate ?? "");
  if (!m) return null;
  const then = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (!Number.isFinite(then)) return null;
  return Math.floor((nowMs - then) / 86_400_000);
}

/* ==========================================================================
 * 2. THE VALIDATOR
 * ========================================================================== */

/**
 * Every rule in spec §10, run over the priced BOQ plus the take-off and settings that produced it.
 * Errors block a quotation; warnings are advisory. Errors sort first.
 */
export function validateBoq(
  takeoff: Takeoff,
  materials: MaterialIndex,
  lines: BoqLine[],
  settings: BoqSettings,
): BoqIssue[] {
  const issues: BoqIssue[] = [];
  const live = enabledLines(lines, settings);
  const nowMs = Date.now();

  unknownMaterials(takeoff, materials, lines, settings, issues);
  materialData(live, materials, settings, issues, nowMs);
  unlinkedElements(takeoff, materials, issues);
  impossibleGeometry(lines, issues);
  zeroLengthMembers(live, issues);
  const raised = sharedWallDoubleCounts(live, issues);
  duplicateCalculations(live, raised, issues);
  drawingCrossChecks(takeoff, materials, live, settings, issues);

  return sortIssues(issues);
}

/* --------------------------------------------------------------------------
 * 2.1 unknown_material — a key nothing can price
 *
 * Checked against EVERY source of a material key, not just the take-off: a per-line override, a
 * manual row and a template's materialMap can each point at a key that was never added to (or was
 * renamed in) the Material Master, and each produces a silently zero-priced line.
 * ------------------------------------------------------------------------ */

function unknownMaterials(
  takeoff: Takeoff,
  materials: MaterialIndex,
  lines: BoqLine[],
  settings: BoqSettings,
  out: BoqIssue[],
): void {
  const missing = new Map<string, Set<string>>();
  const add = (key: string, ref: string) => {
    if (!key || materials[key]) return;
    const refs = missing.get(key);
    if (refs) refs.add(ref);
    else missing.set(key, new Set([ref]));
  };

  for (const i of takeoff.items) add(i.materialKey, i.id);
  for (const l of lines) add(l.materialKey, l.id);
  for (const mi of settings.manualItems ?? []) add(mi.materialKey, mi.id);
  for (const [id, ov] of Object.entries(settings.overrides ?? {})) {
    if (ov.materialKey) add(ov.materialKey, id);
  }
  for (const [role, key] of Object.entries(settings.materialMap ?? {})) {
    add(key, `settings:materialMap:${role}`);
  }

  for (const [key, refs] of missing) {
    out.push(
      issue(
        "unknown_material",
        "error",
        `Material "${key}" is not in the Material Master — ${refs.size} line(s) weigh 0 kg and are priced at ₹0.`,
        [...refs],
        `Add ${key} to the Material Master.`,
      ),
    );
  }
}

/* --------------------------------------------------------------------------
 * 2.2 missing_unit_weight / missing_rate / stale_rate — the Material Master
 *
 * Only materials the quotation USES are judged: an incomplete row nobody references is a half-done
 * data-entry job, not a defect in this BOQ.
 * ------------------------------------------------------------------------ */

/** The weight basis a line's SHAPE demands. calc.ts gates on exactly this and returns 0 kg if it differs. */
function expectedBasis(l: BoqLine): "kg_per_m" | "kg_per_sqm" | "kg_per_nos" {
  if (isSteelLine(l)) return "kg_per_m";
  if (isSheetLine(l)) return "kg_per_sqm";
  return "kg_per_nos";
}

/**
 * A weight is MANDATORY when the line is a steel run or an area of covering, when the material is a
 * weighed category (steel / sheet / panel / insulation / board), or when the rate is charged per kg —
 * because then a null weight is also a null price. A per-lot consumable (primer, enamel) legitimately
 * has weightBasis "none" and is not nagged about it.
 */
const weightRequired = (l: BoqLine, m: Material): boolean =>
  isSteelLine(l) || isSheetLine(l) || WEIGHED.has(m.category) || m.rateUnit === "per_kg";

function materialData(
  live: BoqLine[],
  materials: MaterialIndex,
  settings: BoqSettings,
  out: BoqIssue[],
  nowMs: number,
): void {
  /* Grouped by material key, because ONE Material Master edit fixes every line that uses it. */
  const weightFaults = new Map<string, { reason: string; refs: Set<string> }>();
  const rateFaults = new Map<string, Set<string>>();
  const staleFaults = new Map<string, { days: number; refs: Set<string> }>();

  for (const l of live) {
    const m = materials[l.materialKey];
    if (!m) continue; // already an unknown_material error — do not pile on.

    /* ---- missing_unit_weight ---- */
    if (weightRequired(l, m)) {
      const want = expectedBasis(l);
      let reason: string | null = null;

      if (m.unitWeight === null || m.unitWeight === undefined) {
        reason = "has no unit weight";
      } else if (m.weightBasis === "none") {
        reason = 'has weight basis "none" but is used on a line that must be weighed';
      } else if (m.weightBasis !== want) {
        reason = `is weighed per "${m.weightBasis}" but is used on a line measured in "${want}", so it contributes 0 kg`;
      }

      if (reason) {
        const fault = weightFaults.get(m.key);
        if (fault) fault.refs.add(l.id);
        else weightFaults.set(m.key, { reason, refs: new Set([l.id]) });
      }
    }

    /* ---- missing_rate: the Master's rate OR a per-line override. Either will do. ---- */
    const ovRate = settings.overrides?.[l.id]?.rate;
    const hasOverride = typeof ovRate === "number" && Number.isFinite(ovRate);
    if ((m.purchaseRate === null || m.purchaseRate === undefined) && !hasOverride) {
      const refs = rateFaults.get(m.key);
      if (refs) refs.add(l.id);
      else rateFaults.set(m.key, new Set([l.id]));
    }

    /* ---- stale_rate: a priced material whose rate has not been revised in 180 days ---- */
    const age = ageInDays(m.effectiveDate, nowMs);
    if (age !== null && age > STALE_RATE_DAYS && m.purchaseRate !== null && m.purchaseRate !== undefined) {
      const fault = staleFaults.get(m.key);
      if (fault) {
        fault.refs.add(l.id);
        fault.days = Math.max(fault.days, age);
      } else {
        staleFaults.set(m.key, { days: age, refs: new Set([l.id]) });
      }
    }
  }

  for (const [key, fault] of weightFaults) {
    const m = materials[key];
    out.push(
      issue(
        "missing_unit_weight",
        "error",
        `${m.name} (${key}) ${fault.reason} — ${fault.refs.size} line(s) weigh 0 kg.`,
        [...fault.refs],
        `Set the unit weight and weight basis for ${key} in the Material Master (${expectedBasisHint(m)}).`,
      ),
    );
  }

  for (const [key, refs] of rateFaults) {
    const m = materials[key];
    out.push(
      issue(
        "missing_rate",
        "error",
        `${m.name} (${key}) has no purchase rate — ${refs.size} line(s) are priced at ₹0.`,
        [...refs],
        `Set the ${m.rateUnit} rate for ${key} in the Material Master, or enter a rate override on the line.`,
      ),
    );
  }

  for (const [key, fault] of staleFaults) {
    const m = materials[key];
    out.push(
      issue(
        "stale_rate",
        "warning",
        `${m.name} (${key}) is priced at a rate that took effect on ${m.effectiveDate} — ${fault.days} days ago (limit ${STALE_RATE_DAYS}).`,
        [...fault.refs],
        `Revise the rate for ${key}. A revision adds a NEW effective-dated row, so old quotations stay reproducible at the rate they were quoted on.`,
      ),
    );
  }
}

/** "kg/m for a steel section" — tells the admin which number the Master is asking for. */
function expectedBasisHint(m: Material): string {
  if (m.category === "steel_section") return "kg/m for a steel section";
  if (WEIGHED.has(m.category)) return "kg/m² for a sheet, panel, board or insulation";
  return "kg/nos for a counted item";
}

/* --------------------------------------------------------------------------
 * 2.3 unlinked_element — the drawing has it, the take-off does not
 *
 * The one rule that reads the take-off rather than the priced lines: an element that produced NO
 * take-off item produces no line either, so there is nothing in the BOQ to point at. Judged against
 * the drawing meta, which is the drawing's own count.
 * ------------------------------------------------------------------------ */

function unlinkedElements(takeoff: Takeoff, materials: MaterialIndex, out: BoqIssue[]): void {
  const { meta, items } = takeoff;
  const categoryOf = (i: TakeoffItem): MaterialCategory | null => materials[i.materialKey]?.category ?? null;

  const hasDoor = items.some(
    (i) => i.section === "openings" && (categoryOf(i) === "door" || RX_DOOR.test(itemText(i))),
  );
  const hasWindow = items.some(
    (i) => i.section === "openings" && (categoryOf(i) === "window" || RX_WINDOW.test(itemText(i))),
  );
  const inSection = (s: BoqSection): boolean => items.some((i) => i.section === s);

  const check = (count: number, present: boolean, one: string, many: string, section: BoqSection, hint: string) => {
    if (count <= 0 || present) return;
    const noun = count === 1 ? one : many;
    out.push(
      issue(
        "unlinked_element",
        "error",
        `The drawing has ${count} ${noun}, but the take-off produced no ${noun} — they are missing from the BOQ entirely.`,
        [],
        hint,
        section,
      ),
    );
  };

  check(meta.doors, hasDoor, "door", "doors", "openings",
    "The take-off must emit a door leaf + frame line for every door on the drawing. Check the door material key and the `openings` section.");
  check(meta.windows, hasWindow, "window", "windows", "openings",
    "The take-off must emit a window + frame line for every window on the drawing. Check the window material key and the `openings` section.");
  check(meta.partitions, inSection("partition"), "partition", "partitions", "partition",
    "The take-off must emit framing + sheeting lines for every internal partition on the floor plan.");
  check(meta.staircases, inSection("staircase"), "staircase", "staircases", "staircase",
    "The take-off must emit stringer / tread / handrail lines for every staircase on the drawing.");
  check(meta.verandas, inSection("veranda"), "veranda", "verandas", "veranda",
    "The take-off must emit framing / decking / handrail lines for every veranda on the drawing.");
}

/* --------------------------------------------------------------------------
 * 2.4 opening_exceeds_wall + negative_quantity — impossible arithmetic
 *
 * Judged over ALL lines, enabled or not. A wall with more door than wall, or a negative quantity, is
 * a defect in the code that produced it, and switching the line off does not fix that code.
 * ------------------------------------------------------------------------ */

function impossibleGeometry(lines: BoqLine[], out: BoqIssue[]): void {
  const EPS = 1e-6;

  for (const l of lines) {
    if (isSheetLine(l)) {
      const gross = l.grossAreaSqm ?? 0;
      const deduction = l.deductionSqm ?? 0;
      const net = l.netAreaSqm ?? 0;

      if (deduction > gross + EPS) {
        out.push(
          issue(
            "opening_exceeds_wall",
            "error",
            `${l.description}: openings deduct ${num(deduction)} m² from a ${num(gross)} m² covering — the openings are larger than the wall they are cut out of.`,
            [l.id],
            "An opening has been placed on the wrong wall, or deducted twice. Check the door/window sizes and the wall this covering was measured from.",
            l.section,
          ),
        );
      } else if (net < -EPS) {
        out.push(
          issue(
            "opening_exceeds_wall",
            "error",
            `${l.description}: net covering area is ${num(net)} m² — negative.`,
            [l.id],
            "Check the opening deductions on this wall; the net area must never fall below zero.",
            l.section,
          ),
        );
      }
    }

    const bad: string[] = [];
    if (l.qty < 0) bad.push(`qty ${num(l.qty)} ${l.uom}`);
    if (l.pieces !== null && l.pieces < 0) bad.push(`${num(l.pieces)} pieces`);
    if (l.netAreaSqm !== null && l.netAreaSqm < 0) bad.push(`net area ${num(l.netAreaSqm)} m²`);
    if (l.amount < 0) bad.push(`amount ₹${num(l.amount)}`);

    if (bad.length > 0) {
      out.push(
        issue(
          "negative_quantity",
          "error",
          `${l.description} carries a negative quantity: ${bad.join(", ")}.`,
          [l.id],
          "A take-off can never be negative. Fix the manual override, or the deduction that drove this line below zero.",
          l.section,
        ),
      );
    }
  }
}

/* --------------------------------------------------------------------------
 * 2.5 zero_length_member — pieces that carry no metal
 * ------------------------------------------------------------------------ */

function zeroLengthMembers(live: BoqLine[], out: BoqIssue[]): void {
  for (const l of live) {
    if (!isSteelLine(l)) continue;

    const pieces = countOf(l);
    const cut = l.cutLengthM ?? 0;

    /* A line with no pieces AND no cut length is an empty take-off, not a broken member. */
    if (cut <= MIN_CUT_M && pieces > 0) {
      out.push(
        issue(
          "zero_length_member",
          "warning",
          `${l.description}: ${num(pieces)} piece(s) at a cut length of ${num(cut)} m — the member has no length, so it weighs nothing and costs nothing.`,
          [l.id],
          "The span or height this member was measured from has collapsed to zero. Check the geometry it was derived from in the drawing.",
          l.section,
        ),
      );
      continue;
    }

    if (l.qty > 0 && (l.runningLengthM ?? 0) <= MIN_CUT_M) {
      out.push(
        issue(
          "zero_length_member",
          "warning",
          `${l.description}: billed quantity is ${num(l.qty)} ${l.uom} but the running length is ${num(l.runningLengthM ?? 0)} m.`,
          [l.id],
          "Either the piece count or the cut length has collapsed to zero — check both against the drawing.",
          l.section,
        ),
      );
    }
  }
}

/* --------------------------------------------------------------------------
 * 2.6 shared_wall_double_counted — the colony regression net
 *
 * A geomKey is the canonical identity of a wall segment (wallKey() in types.ts): two adjacent modules
 * derive the SAME key from their own local geometry, and colonyTakeoff must emit a shared member
 * ONCE, marking the survivor `sharedBy`. If it emits it twice, the customer pays for that wall twice.
 *
 * The dedup key is (geomKey + materialKey + description), NOT geomKey alone — a rail, a stud and a
 * sheet all legitimately sit on the same wall. Only the SAME member, of the SAME material, on the
 * SAME wall is a double count. Returns the ref-signatures it raised, so duplicate_calculation does
 * not warn again about what is already an error.
 * ------------------------------------------------------------------------ */

function sharedWallDoubleCounts(live: BoqLine[], out: BoqIssue[]): Set<string> {
  const raised = new Set<string>();
  const withGeom = live.filter((l) => !!l.geomKey);
  const groups = groupBy(withGeom, (l) => `${l.geomKey}|${l.materialKey}|${norm(l.description)}`);

  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    const refs = rows.map((r) => r.id);
    raised.add(signature(refs));
    const first = rows[0];
    out.push(
      issue(
        "shared_wall_double_counted",
        "error",
        `Wall ${first.geomKey} carries "${first.description}" (${first.material}) ${rows.length}× — a shared wall has been counted once per module instead of once in total.`,
        refs,
        "colonyTakeoff must de-duplicate members by geomKey and mark the surviving line `sharedBy`. Exactly one of these lines may be enabled.",
        first.section,
      ),
    );
  }

  return raised;
}

/* --------------------------------------------------------------------------
 * 2.7 duplicate_calculation — the same thing taken off twice
 *
 * Two clauses, both WARNINGS (a producer can have a legitimate reason to split a run into two lines):
 *   a. identical steel lines — same materialKey, cut length, section and description;
 *   b. the same ROLE on the same wall — same geomKey, section and description — under a DIFFERENT
 *      material, which is exactly what a template material-swap applied on top of the original
 *      line looks like.
 * Groups already raised as shared_wall_double_counted errors are skipped, never repeated.
 * ------------------------------------------------------------------------ */

function duplicateCalculations(live: BoqLine[], raised: Set<string>, out: BoqIssue[]): void {
  const seen = new Set<string>(raised);

  const byMember = groupBy(
    live.filter(isSteelLine),
    (l) => `${l.materialKey}|${round(l.cutLengthM ?? 0, 3)}|${l.section}|${norm(l.description)}`,
  );

  for (const rows of byMember.values()) {
    if (rows.length < 2) continue;
    const refs = rows.map((r) => r.id);
    const sig = signature(refs);
    if (seen.has(sig)) continue;
    seen.add(sig);
    const first = rows[0];
    const pieces = rows.reduce((s, r) => s + countOf(r), 0);
    out.push(
      issue(
        "duplicate_calculation",
        "warning",
        `${rows.length} identical steel lines — "${first.description}", ${first.material}, ${num(first.cutLengthM ?? 0)} m cut, in ${first.section}. They total ${num(pieces)} pieces.`,
        refs,
        "If this member was taken off once, disable the duplicates. If the split is deliberate, give each line a distinct description so the cutting list can tell them apart.",
        first.section,
      ),
    );
  }

  const byRole = groupBy(
    live.filter((l) => !!l.geomKey),
    (l) => `${l.geomKey}|${l.section}|${norm(l.description)}`,
  );

  for (const rows of byRole.values()) {
    if (rows.length < 2) continue;
    const refs = rows.map((r) => r.id);
    const sig = signature(refs);
    if (seen.has(sig)) continue;
    seen.add(sig);
    const first = rows[0];
    const keys = [...new Set(rows.map((r) => r.materialKey))].join(", ");
    out.push(
      issue(
        "duplicate_calculation",
        "warning",
        `"${first.description}" is taken off ${rows.length}× on wall ${first.geomKey}, under ${keys} — the same role on the same wall.`,
        refs,
        "A material substitution has probably been applied on top of the original line. Disable the line that is no longer used.",
        first.section,
      ),
    );
  }
}

/* --------------------------------------------------------------------------
 * 2.8 quantity_drawing_mismatch — re-derive from the drawing, then compare
 *
 * The rules that trust the take-off with nothing: each recomputes a quantity from TakeoffMeta (which
 * mirrors the drawing) and asserts the priced lines agree. ONE issue per failed check, each stating
 * EXPECTED vs ACTUAL, because each has its own fix.
 * ------------------------------------------------------------------------ */

/** The external skin, as opposed to the lining, ceiling, insulation and glazing behind it. */
function isExternalCladding(l: BoqLine, materials: MaterialIndex): boolean {
  const m = materials[l.materialKey];
  if (!m) return false;
  if (m.category !== "sheet" && m.category !== "panel") return false;
  if (!isSheetLine(l)) return false;
  return !RX_NOT_EXTERNAL.test(text(l));
}

function drawingCrossChecks(
  takeoff: Takeoff,
  materials: MaterialIndex,
  live: BoqLine[],
  settings: BoqSettings,
  out: BoqIssue[],
): void {
  const { meta } = takeoff;

  /* ---- a. external wall area = perimeter × height × floors (within 1%) ---- */

  const perimeterM = 2 * (meta.lengthM + meta.widthM);
  const expectedWallSqm = perimeterM * meta.heightM * meta.floors;
  const elevationsLive = ELEVATIONS.every((s) => sectionLive(s, settings));

  if (elevationsLive && expectedWallSqm > 0) {
    const clad = live.filter((l) => ELEVATIONS.includes(l.section) && isExternalCladding(l, materials));
    const actualWallSqm = clad.reduce((s, l) => s + (l.grossAreaSqm ?? 0), 0);

    if (Math.abs(actualWallSqm - expectedWallSqm) > expectedWallSqm * AREA_TOLERANCE) {
      out.push(
        issue(
          "quantity_drawing_mismatch",
          "error",
          `External wall area — EXPECTED ${num(expectedWallSqm)} m² (perimeter ${num(perimeterM)} m × height ${num(meta.heightM)} m × ${meta.floors} floor(s)), ACTUAL ${num(actualWallSqm)} m² over front + rear + left + right (off by ${offBy(actualWallSqm, expectedWallSqm)}).`,
          clad.map((l) => l.id),
          actualWallSqm > expectedWallSqm
            ? "The elevations are cladding more wall than the building has: a wall is sheeted twice, or an internal lining is being counted as external cladding."
            : "An elevation is missing its cladding, or a wall was measured short. A cladding line must carry the wall's GROSS area — openings belong in `deductions`, not in a reduced gross.",
        ),
      );
    }
  }

  /* ---- b. corner posts: exactly 4 per module per floor ----
   *
   * A colony's adjoining modules SHARE a corner post, and colonyTakeoff emits that post ONCE with
   * `sharedBy: n`. So the drawing's 4-per-module count is only recoverable by multiplying each
   * counted post back out by the number of modules it serves — which is precisely what makes this a
   * regression net for shared-wall de-duplication: a producer that drops a post AND its sharedBy
   * marker fails here even though its line count looks plausible. */

  if (meta.modules > 0 && meta.floors > 0) {
    const sharedBy = new Map<string, number>();
    for (const i of takeoff.items) {
      if (i.kind === "steel" && (i.sharedBy ?? 0) > 1) sharedBy.set(i.id, i.sharedBy as number);
    }

    const cornerLines = live.filter((l) => isSteelLine(l) && RX_CORNER.test(text(l)));
    const actualCorners = cornerLines.reduce((s, l) => s + countOf(l) * (sharedBy.get(l.id) ?? 1), 0);
    const expectedCorners = 4 * meta.modules * meta.floors;
    const anyShared = cornerLines.some((l) => (sharedBy.get(l.id) ?? 1) > 1);

    if (actualCorners !== expectedCorners) {
      out.push(
        issue(
          "quantity_drawing_mismatch",
          "error",
          `Corner posts — EXPECTED ${expectedCorners} (4 per module × ${meta.modules} module(s) × ${meta.floors} floor(s)), ACTUAL ${actualCorners}${anyShared ? " (posts shared between modules counted once per module they serve)" : ""}.`,
          cornerLines.map((l) => l.id),
          actualCorners === 0
            ? 'No line in the take-off is named as a corner post. The frame take-off must emit them with "corner" in the description.'
            : "The corner-post count does not match the module grid. Check the frame geometry, and check that a post shared between two modules is emitted once with `sharedBy: 2` — not dropped.",
        ),
      );
    }
  }

  if (!sectionLive("openings", settings)) return;

  /* ---- c. door frame heads = doors (one head per door) ---- */

  const doorHeads = live.filter(
    (l) => l.section === "openings" && isSteelLine(l) && RX_DOOR.test(text(l)) && RX_HEAD.test(text(l)),
  );
  const actualDoorHeads = doorHeads.reduce((s, l) => s + countOf(l), 0);

  if (actualDoorHeads !== meta.doors) {
    out.push(
      issue(
        "quantity_drawing_mismatch",
        "error",
        `Door frame heads — EXPECTED ${meta.doors} (one per door on the drawing), ACTUAL ${actualDoorHeads}.`,
        doorHeads.map((l) => l.id),
        "Every door needs exactly one frame head. The openings take-off must emit the head as its own line — 2 jambs + 1 head per door.",
        "openings",
      ),
    );
  }

  /* ---- d. window frame heads + sills = windows × 2 (one head + one sill each) ---- */

  const windowHeadSills = live.filter(
    (l) =>
      l.section === "openings" &&
      isSteelLine(l) &&
      RX_WINDOW.test(text(l)) &&
      (RX_HEAD.test(text(l)) || RX_SILL.test(text(l))),
  );
  const actualHeadSills = windowHeadSills.reduce((s, l) => s + countOf(l), 0);
  const expectedHeadSills = meta.windows * 2;

  if (actualHeadSills !== expectedHeadSills) {
    out.push(
      issue(
        "quantity_drawing_mismatch",
        "error",
        `Window frame heads + sills — EXPECTED ${expectedHeadSills} (${meta.windows} window(s) × 2: one head + one sill each), ACTUAL ${actualHeadSills}.`,
        windowHeadSills.map((l) => l.id),
        "Every window needs one head and one sill. The openings take-off must emit them as their own lines — 2 jambs + 1 head + 1 sill per window.",
        "openings",
      ),
    );
  }
}

/* ==========================================================================
 * 3. ORDERING — errors first, then the order an admin should fix them in.
 *
 * The Material Master faults come before the geometry faults on purpose: an unknown material key
 * zeroes a line's weight, and a zeroed weight can make a drawing cross-check fail for a reason that
 * has nothing to do with the drawing. Fix the data, then read the geometry.
 * ========================================================================== */

const CODE_ORDER: IssueCode[] = [
  "unknown_material",
  "missing_unit_weight",
  "missing_rate",
  "unlinked_element",
  "quantity_drawing_mismatch",
  "shared_wall_double_counted",
  "opening_exceeds_wall",
  "negative_quantity",
  "duplicate_calculation",
  "zero_length_member",
  "stale_rate",
];

function sortIssues(issues: BoqIssue[]): BoqIssue[] {
  const rank = (i: BoqIssue): number => {
    const at = CODE_ORDER.indexOf(i.code);
    return at < 0 ? CODE_ORDER.length : at;
  };

  return issues
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const severity = (a.row.severity === "error" ? 0 : 1) - (b.row.severity === "error" ? 0 : 1);
      if (severity !== 0) return severity;
      const code = rank(a.row) - rank(b.row);
      if (code !== 0) return code;
      const refA = a.row.refs[0] ?? "";
      const refB = b.row.refs[0] ?? "";
      if (refA !== refB) return refA < refB ? -1 : 1;
      return a.index - b.index; // stable
    })
    .map((r) => r.row);
}
