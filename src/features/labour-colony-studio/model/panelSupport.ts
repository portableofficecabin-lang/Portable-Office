/**
 * LABOUR COLONY ENGINEERING STUDIO — PUF / EPS PANEL SEATING + FIXING engine.
 *
 * A sandwich panel carries its own face loads but has almost no edge strength: the foam core will
 * crush and the thin skins will buckle if the panel is asked to bear on a bare edge. So the panel is
 * never "placed on" the MS frame — it is CAPTURED by it. This module states exactly how, for whatever
 * panel thickness the calculator is configured with.
 *
 * THE FOUR WAYS MS STEEL HOLDS A PANEL — each does a different job, and a real wall uses all four:
 *
 *   U-CHANNEL (base track)   Both legs embrace the panel. Used at the FLOOR line. The panel is
 *                            dropped in vertically, so the track restrains it on two faces at once
 *                            and sets the wall line. This is what makes the first panel self-standing.
 *
 *   C-CHANNEL (jamb / closer) A deeper channel the panel slides into SIDEWAYS. Used at corners, wall
 *                            ends and the closing panel. It restrains the vertical edge, hides the
 *                            cut edge, and lets the last panel be entered without lifting the run.
 *
 *   ANGLE SUPPORT (head)     A single leg. Used at the HEAD, where a channel cannot be threaded over
 *                            a panel already standing. It restrains the panel inward-outward but not
 *                            vertically — which is correct: the head must be free to take building
 *                            movement without loading the panel.
 *
 *   FRAMED POCKET            A short C-section box welded at a column, capturing the panel on THREE
 *                            sides. Used where a panel run meets a column or an opening jamb and the
 *                            edge would otherwise be a free cantilever.
 *
 * THE LOCK SEQUENCE is what stops a wall going up loose. Each panel gains restraint in a fixed order
 * — bottom into the track, side into the channel or into the previous panel's groove, then head — so
 * every panel is held on at least two edges before the next one arrives. `buildPanelLockSequence()`
 * spells that out step by step for the installation crew.
 *
 * ARBITRARY THICKNESS: the calculator's `panelThicknessMm` is a free numeric input, so nothing here
 * is a lookup against a fixed list. The seating geometry is DERIVED from the thickness, and every
 * common trade thickness (30 / 40 / 50 / 60 / 65 / 70 / 75 mm) simply falls out of the same formulae.
 *
 * Pure data — no React, no three.js, no DOM. Deterministic for a given thickness.
 */

/* ------------------------------------------------------------------ constants ------------------ */

/**
 * The trade thicknesses this system is routinely built in (mm) — used for the comparison table.
 *
 * The list spans BOTH conventions in use in this codebase: the calculator's own field documents
 * 30 / 40 / 50 / 60 / 75 (`labourColony.ts`, `panelThicknessMm`) while the panel supplier range runs
 * 30 / 40 / 50 / 65 / 70. Every one of them is supported, because nothing here is a lookup — the
 * seating geometry is DERIVED from the thickness, so an unlisted value still produces a valid detail.
 */
export const COMMON_PANEL_THICKNESSES_MM = [30, 40, 50, 60, 65, 70, 75] as const;

/** Absolute minimum engagement of a panel edge into any MS section, whatever the thickness. */
export const MIN_INSERTION_MM = 20;

/** Free play left between the panel face and the channel leg so the panel enters without forcing. */
const CLEARANCE_THIN_MM = 2;   // panels up to 40 mm
const CLEARANCE_THICK_MM = 3;  // 50 mm and above

/* ------------------------------------------------------------------ types ---------------------- */

export type PanelSeatKind = "u-channel" | "c-channel" | "angle-support" | "pocket-support";

/** Where on the panel perimeter a seating member sits. */
export type PanelSeatPosition = "base" | "jamb" | "head" | "corner";

/** The MS section that receives the panel at one position. */
export interface PanelSeat {
  kind: PanelSeatKind;
  position: PanelSeatPosition;
  /** Human name used on the drawing and in the 3D label. */
  label: string;
  /** Clear internal width between the legs (mm) — the panel slot. */
  internalWidthMm: number;
  /** Leg / flange length (mm) — how far the section reaches along the panel face. */
  legMm: number;
  /** How deep the panel must sit into the section (mm) — the bearing that must be achieved. */
  minInsertionMm: number;
  /** Section thickness / gauge (mm). */
  gaugeMm: number;
  /** Printable section call-out, e.g. "MS U-channel 53 × 35 × 2.0 mm". */
  sectionCall: string;
  /** What this member is structurally doing. */
  role: string;
  /** How the load it receives gets into the frame. */
  loadPath: string;
}

/** The complete seating system for one panel thickness. */
export interface PanelSupportSpec {
  thicknessMm: number;
  /** Slot width the panel needs (thickness + clearance). */
  slotWidthMm: number;
  clearanceMm: number;
  /** Governing minimum insertion for this thickness (mm). */
  minInsertionMm: number;
  /** Screw pitch through the channel leg into the panel skin (mm). */
  fixingPitchMm: number;
  /** Tighter pitch at corners / openings (mm). */
  fixingPitchCornerMm: number;
  /** Self-drilling screw call-out. */
  fixingSpec: string;
  seats: PanelSeat[];
  /** Panel self-weight guidance (kg/m²) is priced elsewhere — this is the seating note only. */
  note: string;
}

/** One numbered installation step for the panel run. */
export interface PanelLockStep {
  step: number;
  title: string;
  /** What physically happens. */
  action: string;
  /** Which edges are restrained once this step completes. */
  restrainedEdges: string;
  /** The check that closes the step. */
  check: string;
}

/* ------------------------------------------------------------------ derivation ----------------- */

const ceil5 = (v: number): number => Math.ceil(v / 5) * 5;

/** Free play for a given thickness. */
export function panelClearanceMm(thicknessMm: number): number {
  return thicknessMm <= 40 ? CLEARANCE_THIN_MM : CLEARANCE_THICK_MM;
}

/**
 * Minimum insertion depth. Scaled from the thickness because a thicker panel is heavier and has a
 * longer unrestrained edge, so it needs proportionally more of itself inside the steel — floored at
 * MIN_INSERTION_MM so even a thin lining panel is properly captured.
 */
export function panelInsertionMm(thicknessMm: number): number {
  return Math.max(MIN_INSERTION_MM, ceil5(thicknessMm * 0.45));
}

/** Section gauge that suits the panel weight. */
export function panelSeatGaugeMm(thicknessMm: number): number {
  if (thicknessMm <= 40) return 1.6;
  if (thicknessMm <= 50) return 2.0;
  return 2.5;
}

/**
 * The full seating system for a panel of `thicknessMm`.
 *
 * Every dimension is derived, never looked up, so an unusual thickness typed into the calculator
 * still produces a buildable, self-consistent detail.
 */
export function buildPanelSupportSpec(thicknessMm: number): PanelSupportSpec {
  const t = Math.max(10, Math.round(thicknessMm));
  const clearance = panelClearanceMm(t);
  const slot = t + clearance;
  const insertion = panelInsertionMm(t);
  const gauge = panelSeatGaugeMm(t);

  /* The leg must cover the insertion plus an edge margin so the fixing screw has metal around it. */
  const baseLeg = ceil5(insertion + 15);
  const jambLeg = ceil5(insertion + 20);
  const headLeg = ceil5(insertion + 10);

  const call = (name: string, leg: number): string =>
    `MS ${name} ${slot} × ${leg} × ${gauge.toFixed(1)} mm`;

  const seats: PanelSeat[] = [
    {
      kind: "u-channel",
      position: "base",
      label: "Base track (U-channel)",
      internalWidthMm: slot,
      legMm: baseLeg,
      minInsertionMm: insertion,
      gaugeMm: gauge,
      sectionCall: call("U-channel", baseLeg),
      role:
        "Sets the wall line and grips the panel on BOTH faces at floor level, so the very first "
        + "panel stands plumb on its own before anything is screwed to it.",
      loadPath:
        "Panel self-weight bears on the channel web → the web is bolted down to the perimeter "
        + "C-channel / floor beam → into the columns and down to the footings.",
    },
    {
      kind: "c-channel",
      position: "jamb",
      label: "Jamb / closing channel (C-channel)",
      internalWidthMm: slot,
      legMm: jambLeg,
      minInsertionMm: insertion,
      gaugeMm: gauge,
      sectionCall: call("C-channel", jambLeg),
      role:
        "Receives the vertical panel edge sideways. Restrains the edge against wind suction, hides "
        + "the cut edge, and lets the CLOSING panel be entered without lifting the finished run.",
      loadPath:
        "Wind pressure/suction on the panel face → channel legs → channel web → welded/bolted to the "
        + "column or corner post → into the frame.",
    },
    {
      kind: "angle-support",
      position: "head",
      label: "Head restraint (angle)",
      internalWidthMm: slot,
      legMm: headLeg,
      minInsertionMm: Math.max(MIN_INSERTION_MM, insertion - 5),
      gaugeMm: gauge,
      sectionCall: `MS angle ${headLeg} × ${headLeg} × ${gauge.toFixed(1)} mm`,
      role:
        "A single leg fixed at the head. It holds the panel in and out but NOT down — deliberately, "
        + "so roof deflection and thermal movement are not fed into the panel as a crushing load.",
      loadPath:
        "Horizontal reaction only → angle leg → fixed to the eaves/head rail → into the truss or "
        + "top of the columns. Vertical movement is left free at this edge.",
    },
    {
      kind: "pocket-support",
      position: "corner",
      label: "Framed pocket at column",
      internalWidthMm: slot,
      legMm: jambLeg,
      minInsertionMm: insertion + 5,
      gaugeMm: gauge + 0.5,
      sectionCall: `MS framed pocket ${slot} × ${jambLeg} × ${(gauge + 0.5).toFixed(1)} mm (3-sided)`,
      role:
        "A short box welded to the column that captures the panel on THREE sides. Used where a run "
        + "dies into a column or an opening jamb and the edge would otherwise be a free cantilever.",
      loadPath:
        "Takes both faces AND the end of the panel → welded directly to the column flange → the "
        + "shortest possible load path into the primary frame.",
    },
  ];

  return {
    thicknessMm: t,
    slotWidthMm: slot,
    clearanceMm: clearance,
    minInsertionMm: insertion,
    fixingPitchMm: t <= 40 ? 300 : 250,
    fixingPitchCornerMm: t <= 40 ? 200 : 150,
    fixingSpec: `Self-drilling screw ${t <= 40 ? "5.5 × 25" : "5.5 × 32"} mm with bonded EPDM washer`,
    seats,
    note:
      `${t} mm panel seats in a ${slot} mm slot (${clearance} mm free play) with ${insertion} mm minimum `
      + `insertion on every captured edge. Never pack a panel edge with timber or foam — the panel must `
      + `bear on steel or it will crush at the skin line.`,
  };
}

/**
 * The installation lock order for a run of panels.
 *
 * The rule the sequence enforces: NO panel is left held on fewer than two edges at any point, and the
 * head is always fixed last so the panel is never wedged vertically.
 */
export function buildPanelLockSequence(spec: PanelSupportSpec): PanelLockStep[] {
  const t = spec.thicknessMm;
  return [
    {
      step: 1,
      title: "Set out and fix the base track",
      action:
        `Snap the wall line on the deck. Bolt the ${spec.seats[0].sectionCall} U-channel down through `
        + `the perimeter C-channel / floor beam at ${spec.fixingPitchMm} mm centres, `
        + `${spec.fixingPitchCornerMm} mm within 300 mm of every corner.`,
      restrainedEdges: "None yet — this is the datum every panel is set from.",
      check: "Track is straight, level and on the snapped line before any panel is stood up.",
    },
    {
      step: 2,
      title: "Fix the corner / jamb channel",
      action:
        `Plumb and fix the ${spec.seats[1].sectionCall} C-channel to the corner post or column so its `
        + `slot faces along the wall run.`,
      restrainedEdges: "None yet — this is the pocket the FIRST panel enters.",
      check: "Channel is plumb in both planes; slot is clear of weld spatter and burrs.",
    },
    {
      step: 3,
      title: "First panel — enter the corner, then drop into the track",
      action:
        `Slide the first panel SIDEWAYS into the corner C-channel to at least `
        + `${spec.seats[1].minInsertionMm} mm, then lower its bottom edge into the base U-channel to `
        + `at least ${spec.seats[0].minInsertionMm} mm.`,
      restrainedEdges:
        "TWO edges — the vertical edge in the corner channel and the bottom edge in the base track. "
        + "The panel is now self-standing and plumb without temporary propping.",
      check: `Insertion verified on both edges; panel plumb; ${spec.clearanceMm} mm free play present (not forced).`,
    },
    {
      step: 4,
      title: "Second panel — engage the joint, then the track",
      action:
        `Offer the second panel up so its tongue/groove edge engages the first panel's mating edge `
        + `full height, then lower it into the base track. Close the joint tight — no daylight.`,
      restrainedEdges:
        "TWO edges — the panel-to-panel joint (which now acts as a continuous vertical restraint) and "
        + "the bottom edge in the track.",
      check: "Joint closed full height; faces flush; no step between panels.",
    },
    {
      step: 5,
      title: "Fix through the channel legs",
      action:
        `Fix ${spec.fixingSpec} through the channel legs into the panel skin at `
        + `${spec.fixingPitchMm} mm centres, tightening to seat the washer without dimpling the skin.`,
      restrainedEdges: "Both panels now mechanically fixed, not merely captured.",
      check: "No over-driven screws; washers seated; skin not dished around any fixing.",
    },
    {
      step: 6,
      title: "Subsequent panels — repeat the joint-then-track order",
      action:
        "Every following panel repeats step 4 then step 5. Never fix a panel's head before its joint "
        + "and base are engaged, or the panel will be locked out of line.",
      restrainedEdges: "Each new panel gains two edges before the next one arrives.",
      check: "Run stays plumb — check every third panel and correct in the joint, never by forcing.",
    },
    {
      step: 7,
      title: "Head restraint last",
      action:
        `Fix the ${spec.seats[2].sectionCall} head angle to the eaves/head rail, engaging the panel by `
        + `at least ${spec.seats[2].minInsertionMm} mm. Leave the vertical gap — do NOT pack it solid.`,
      restrainedEdges: "THREE edges plus the joint: base, side, head. The panel is now fully located.",
      check: "Head engagement achieved; movement gap left open; panel not wedged vertically.",
    },
    {
      step: 8,
      title: "Closing panel",
      action:
        `Measure the remaining opening, cut the closing panel ${spec.clearanceMm} mm under, enter it `
        + `into the closing C-channel and dress the cut edge with a cover flat.`,
      restrainedEdges: "All four edges restrained; the run is complete and locked.",
      check: `Cut edge fully inside the channel — never leave a bare ${t} mm foam edge exposed.`,
    },
  ];
}

/** The comparison table across the common trade thicknesses (for the drawing + report). */
export function buildPanelThicknessTable(): PanelSupportSpec[] {
  return COMMON_PANEL_THICKNESSES_MM.map((t) => buildPanelSupportSpec(t));
}
