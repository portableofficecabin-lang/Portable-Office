/**
 * LABOUR COLONY 3D — EXPLODED-VIEW EXPLANATION LAYER (pure; no React, no three.js).
 *
 * An exploded view shows WHAT comes apart. On its own it does not say WHY any of it is shaped that
 * way — which is exactly the question a customer, a fabricator and an erector each need answered
 * before the drawing is useful to them. This module derives the callouts, leader lines and dimension
 * runs that turn the exploded model into an explanation: what each member is, what job it does, how
 * the load leaves it, and what the spacing and bearing actually measure.
 *
 * ANCHORED TO PARTS, NOT TO COORDINATES. Every annotation names a `partId` rather than a fixed point,
 * so the renderer can resolve its position AFTER the explode offset is applied. A callout therefore
 * travels with the member it describes as the model separates, instead of drifting off into space at
 * full explode — which is what makes it readable at every point on the slider.
 *
 * NOTHING IS INVENTED HERE. Every number quoted is read from the part's own `spec` or from
 * `model.deck` / `model.panelSupport`, so an annotation can never disagree with the schedules, the
 * captions or the 2D sheets. When the model has no such member the annotation is simply not emitted.
 */

import type { ColonyModel, ColonyPart } from "@/features/labour-colony-studio/model/types";

/** A leader-line callout anchored on one part. */
export interface ExplodedAnnotation {
  id: string;
  /** The part the leader points at. Position is resolved at render time, WITH the explode offset. */
  partId: string;
  title: string;
  /** Body lines, in reading order. Kept short — this is a drawing label, not a paragraph. */
  lines: string[];
  /** Literal hex accent (export-safe — never oklch / CSS var). */
  accent: string;
  /** Unit direction (three-space: x = length, y = up, z = width) the label floats out along. */
  dir: [number, number, number];
  /** How far out along `dir`, as a FRACTION of the model's bounding radius, so it scales with size. */
  distR: number;
}

/** A dimension run between two parts (or a part and itself, for a member's own size). */
export interface ExplodedDimension {
  id: string;
  fromPartId: string;
  toPartId: string;
  /** The dimension text, e.g. "1000 mm c/c". */
  text: string;
  /** Secondary note under the text, e.g. "recommend 609.6". */
  note?: string;
  accent: string;
  /** Direction the dimension line is lifted clear of the model along. */
  dir: [number, number, number];
  distR: number;
}

export interface ExplodedExplanation {
  annotations: ExplodedAnnotation[];
  dimensions: ExplodedDimension[];
}

/* Accents chosen to match the part families they describe (see model/assembly.ts COLOR_OF_KIND). */
const ACCENT = {
  edge: "#0d9488",     // C / U / angle / pocket — the teal panel-support family
  sheet: "#b45309",    // deck sheets
  bearer: "#0369a1",   // added sheet bearers
  conn: "#7c2d12",     // bolted / welded connections
  warn: "#b91c1c",     // something the engineer must act on
} as const;

const mmOf = (m: number): string => `${Math.round(m * 1000)} mm`;

/**
 * Build the explanation layer for a model.
 *
 * Ordered so the reader meets the structure the way it is built: the edge member that everything is
 * set out from, then the spacing that carries the sheets, then the sheets, then the connections that
 * hold it all down, then the panel seating that lands on top of it.
 */
export function buildExplodedExplanation(model: ColonyModel): ExplodedExplanation {
  const annotations: ExplodedAnnotation[] = [];
  const dimensions: ExplodedDimension[] = [];
  const parts = model.parts;
  const byId = (pred: (p: ColonyPart) => boolean): ColonyPart | undefined => parts.find(pred);

  const gf = (p: ColonyPart) => (p.floor ?? 0) === 0;

  /* The matching part on the LOWEST storey that carries one. The sheet field starts on floor 1 —
   * the ground floor bears on the plinth and lays no sheets — so a callout anchored with a
   * hard-coded gf() filter would silently vanish. This follows the field wherever it starts. */
  const onLowestFloor = (pred: (p: ColonyPart) => boolean): ColonyPart | undefined =>
    parts.filter(pred).sort((a, b) => (a.floor ?? 0) - (b.floor ?? 0))[0];

  /* ---- 1. THE FIRST C-BEND — the datum the whole deck is measured from -------------------- */
  const cbendLeft = byId((p) => p.kind === "c-channel" && p.id.includes(":c-bend:left:web") && gf(p));
  if (cbendLeft) {
    annotations.push({
      id: "ann:c-bend:left",
      partId: cbendLeft.id,
      title: `${cbendLeft.partMark ?? "CB1"} — FIRST C-BEND (left edge)`,
      lines: [
        "Erected and levelled FIRST — every joist end",
        "and the whole sheet set-out is measured from it.",
        "① EDGE SUPPORT — top flange is the bearing",
        "   ledge for the outer sheet edge (no joist",
        "   continues past the last grid line).",
        "② PERIMETER MEMBER — ties all joist ends into",
        "   one rim, spreading a point load over several.",
        "③ PANEL SEAT — its upstand carries the PUF base",
        "   track, so the wall lands on steel, not sheet.",
        "④ STIFFENER — the return lip raises torsional",
        "   stiffness so the free edge cannot roll.",
        cbendLeft.spec.sectionSize ? `Section: ${cbendLeft.spec.sectionSize}` : "",
        "Load path: sheet → flange → web (rim beam) →",
        "cleat → base beam → column → base plate →",
        "anchor bolts → pedestal → footing.",
      ].filter(Boolean),
      accent: ACCENT.edge,
      dir: [-1, 0.35, 0],
      distR: 0.55,
    });
  }

  /* ---- 2. JOIST SPACING — the single number the sheet layout lives or dies on ------------- */
  const deck = model.deck;
  const joists = parts.filter((p) => p.kind === "joist" && gf(p));
  if (deck && joists.length >= 2) {
    /* Two joists on the SAME bay, adjacent in x — so the dimension measures a real centre-to-centre
     * spacing rather than the diagonal between two members in different bays. */
    const sorted = [...joists].sort((a, b) => centreX(a) - centreX(b));
    const first = sorted[0];
    const next = sorted.find((p) => centreX(p) > centreX(first) + 1e-3 && sameBay(p, first));
    if (next) {
      dimensions.push({
        id: "dim:joist-spacing",
        fromPartId: first.id,
        toPartId: next.id,
        text: `${deck.spacing.actualMm.toFixed(0)} mm c/c`,
        note: deck.spacing.modular
          ? `sheet-modular — ${Math.round(deck.shortMm / deck.spacing.actualMm)} bays per sheet`
          : `NOT sheet-modular — recommend ${deck.spacing.recommendedMm.toFixed(1)} mm`,
        accent: deck.spacing.modular ? ACCENT.bearer : ACCENT.warn,
        dir: [0, -1, 0],
        distR: 0.18,
      });
    }
  }

  /* ---- 3. THE SHEET MODULE + its bearing --------------------------------------------------- */
  const sheet1 = onLowestFloor((p) => p.kind === "floor-sheet" && p.spec.sheetMark === "S01");
  if (sheet1 && deck) {
    annotations.push({
      id: "ann:sheet:module",
      partId: sheet1.id,
      title: `${sheet1.spec.sheetMark} — flooring sheet ${deck.moduleLabel}`,
      lines: [
        `Laid ${deck.orientation === "width-across-joists"
          ? "4 ft width ACROSS the joists"
          : "8 ft length ACROSS the joists"} — the lay that`,
        "puts a member under every long edge.",
        `Sequence: S01 → S${String(deck.sheets.length).padStart(2, "0")}, row by row from this corner.`,
        `Bearing at a joint: ${deck.edgeBearingMm.toFixed(0)} mm to EACH sheet`,
        `(minimum 25 mm) on a ${sheet1.spec.supportSpacingMm?.toFixed(0) ?? "—"} mm grid.`,
        "3 mm expansion gap at every joint.",
        "Fixings 150 mm c/c on edges, 300 mm c/c at",
        "intermediate supports.",
        `${deck.fullCount} full + ${deck.cutCount} cut = ${deck.sheets.length} laid.`,
        "UPPER DECKS ONLY — the ground floor bears on",
        "the plinth and carries no sheet field.",
      ],
      accent: ACCENT.sheet,
      dir: [0, 1, -0.5],
      distR: 0.42,
    });
  }

  /* ---- 4. THE ADDED BEARERS — visible proof of the spacing defect, and its cost ----------- */
  const bearer = onLowestFloor((p) => p.kind === "noggin");
  if (bearer && deck && deck.bearers.length > 0) {
    annotations.push({
      id: "ann:bearer",
      partId: bearer.id,
      title: `${bearer.partMark ?? "NG"} — sheet bearer (added)`,
      lines: [
        "This sheet joint falls BETWEEN two members of",
        "the priced frame, so without this bearer both",
        "sheet edges at the joint are unsupported.",
        `${deck.bearers.length} bearer line(s) added to close every joint.`,
        deck.spacing.modular
          ? ""
          : `${deck.bearersAvoidableBySpacing} of them would be unnecessary at`,
        deck.spacing.modular
          ? ""
          : `${deck.spacing.recommendedMm.toFixed(1)} mm joist centres.`,
        `Section: ${bearer.spec.widthMm ?? "—"} × ${bearer.spec.heightMm ?? "—"} mm,`,
        `cut ${bearer.spec.lengthM?.toFixed(3) ?? "—"} m between members.`,
      ].filter(Boolean),
      accent: deck.spacing.modular ? ACCENT.bearer : ACCENT.warn,
      dir: [0.6, -0.8, 0.4],
      distR: 0.34,
    });
  }

  /* ---- 5. THE JOIST-END CONNECTION — why one joint is welded and the other bolted --------- */
  const cleat = byId((p) => p.kind === "cleat" && (p.connectionId ?? "").startsWith("joist:"));
  if (cleat) {
    annotations.push({
      id: "ann:joist-cleat",
      partId: cleat.id,
      title: `${cleat.partMark ?? "CL"} — joist-end connection`,
      lines: [
        "TWO different joints, deliberately:",
        `• cleat → beam: ${cleat.spec.weldSpec ?? "shop fillet weld"}`,
        "  made in the SHOP, where a weld can be done",
        "  properly and inspected.",
        `• joist → cleat: ${cleat.spec.boltCount ?? 2} × ${cleat.spec.boltSpec ?? "M12 gr 8.8"}`,
        "  made on SITE — needs no power, no ticket, and",
        "  can be checked by eye.",
        `Plate ${cleat.spec.thicknessMm ?? "—"} mm · holes ⌀${cleat.spec.holeDiaMm ?? "—"} mm.`,
        "Two bolts, not one — a single bolt lets the",
        "joist rotate about it.",
        "Each bolt: head · shank · washer · nut.",
      ],
      accent: ACCENT.conn,
      dir: [-0.7, -0.6, -0.6],
      distR: 0.38,
    });
  }

  /* ---- 6. PUF SEATING — the four sections and the order they lock the panel --------------- */
  const ps = model.panelSupport;
  const track = byId((p) => p.kind === "u-channel" && gf(p));
  if (track && ps) {
    annotations.push({
      id: "ann:puf:track",
      partId: track.id,
      title: `${track.partMark ?? "UT"} — PUF base track (U-channel)`,
      lines: [
        `For a ${ps.thicknessMm} mm panel: ${ps.slotWidthMm} mm slot`,
        `(${ps.clearanceMm} mm free play), insert ≥ ${ps.minInsertionMm} mm.`,
        track.spec.sectionSize ? `Section: ${track.spec.sectionSize}` : "",
        "Both legs grip the panel, so the FIRST panel",
        "stands plumb on its own before anything is",
        "screwed to it.",
        `Bolt down at ${ps.fixingPitchMm} mm c/c (${ps.fixingPitchCornerMm} mm`,
        "within 300 mm of a corner).",
        "STEP 1 of the lock sequence.",
      ].filter(Boolean),
      accent: ACCENT.edge,
      dir: [0, -0.5, -1],
      distR: 0.40,
    });
  }

  const jamb = byId((p) => p.kind === "c-channel" && p.id.includes(":jamb-channel:") && gf(p));
  if (jamb && ps) {
    annotations.push({
      id: "ann:puf:jamb",
      partId: jamb.id,
      title: `${jamb.partMark ?? "JC"} — jamb / closing channel`,
      lines: [
        "The panel enters this SIDEWAYS, which is what",
        "lets the closing panel go in without lifting",
        "the finished run.",
        `Insert ≥ ${ps.seats[1].minInsertionMm} mm. ${jamb.spec.sectionSize ?? ""}`,
        "LOCK ORDER:",
        "① first panel → this channel, then the track",
        "   (two edges — self-standing).",
        "② second panel → previous panel's joint, then",
        "   the track (two edges again).",
        "③ subsequent panels repeat ②.",
        "④ head angle LAST — never wedge the panel",
        "   vertically; leave the movement gap.",
        "Never pack a panel edge with timber or foam:",
        "it must bear on steel or the foam will crush.",
      ],
      accent: ACCENT.edge,
      dir: [-0.8, 0.6, -0.8],
      distR: 0.46,
    });
  }

  const pocket = byId((p) => p.kind === "pocket-support" && gf(p));
  if (pocket && ps) {
    annotations.push({
      id: "ann:puf:pocket",
      partId: pocket.id,
      title: `${pocket.partMark ?? "PP"} — framed pocket at column`,
      lines: [
        "Captures the panel on THREE sides where the run",
        "dies into a column — the one place an edge would",
        "otherwise be a free cantilever.",
        `Insert ≥ ${ps.seats[3].minInsertionMm} mm. ${pocket.spec.sectionSize ?? ""}`,
        "Welded straight to the column flange: the",
        "shortest load path into the primary frame.",
      ],
      accent: ACCENT.edge,
      dir: [0.4, 0.8, 0.9],
      distR: 0.40,
    });
  }

  return { annotations, dimensions };
}

/* ------------------------------------------------------------------ helpers -------------------- */

function centreX(p: ColonyPart): number {
  const s = p.solid;
  if (s.kind === "box") return (s.min.x + s.max.x) / 2;
  if (s.kind === "prism") {
    const xs = s.poly.map((q) => q.x);
    return (Math.min(...xs) + Math.max(...xs)) / 2;
  }
  return s.pts.reduce((a, q) => a + q.x, 0) / s.pts.length;
}

/** Two joists share a bay when their y-extent matches — so a spacing dimension stays in-plane. */
function sameBay(a: ColonyPart, b: ColonyPart): boolean {
  if (a.solid.kind !== "box" || b.solid.kind !== "box") return true;
  return Math.abs(a.solid.min.y - b.solid.min.y) < 1e-3 && Math.abs(a.solid.max.y - b.solid.max.y) < 1e-3;
}

/** Unused-part guard for callers that want to know whether anything will render at all. */
export function hasExplanation(x: ExplodedExplanation): boolean {
  return x.annotations.length > 0 || x.dimensions.length > 0;
}

export { mmOf as formatMillimetres };
