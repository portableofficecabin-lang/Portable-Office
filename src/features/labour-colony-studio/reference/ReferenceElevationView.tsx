"use client";

/**
 * LABOUR COLONY — REFERENCE GA DRAWING: "… Side Elevation (with Door & Window and Bracing Locations)".
 *
 * The orthographic elevation the reference sheet carries on all four faces. It is deliberately a
 * GENERAL-ARRANGEMENT elevation, not the fabrication elevation: it shows the frame line, the bracing
 * bays, the roof profile with its ridge, the openings tagged with the schedule's own marks, and the
 * cladding callouts naming the exact panel each surface is clad in.
 *
 * Projection follows the fabrication set exactly (`FramingElevationSheet`): the horizontal axis is x
 * for the front / rear faces and y for the left / right faces, the vertical axis is always z, and the
 * front and left faces are viewed from the far side so their horizontal axis mirrors. Nothing is
 * re-derived — members, openings and levels all come from the shared model.
 *
 * Every dimension is printed in whole MILLIMETRES. Literal hex, export-safe.
 */

import type { ColonyModel, ColonyPart, ColonyPartKind, PartSolid } from "../model/types";
import { footprintXY, spanZ } from "../drawing/planScale";
import { Callout, DimChainMmH, DimChainMmV, DimMmH, DimMmV, RefBubble, ViewTitle } from "./ReferencePrimitives";
import { REF, gridStations, refPpm, stationsFrom, type RefGridStation } from "./referenceScale";
import type { BracingNote, EnvelopeCallout, OpeningScheduleRow } from "./referenceRegister";

const PAD_L = 76;
const PAD_T = 52;
/** Wide right margin: the cladding callouts are parked here so they never overlay the elevation. */
const PAD_R = 178;
const PAD_B = 76;

/** How close to the face plane a member's CENTRE must sit to belong to this elevation (metres). */
const FACE_BAND_M = 0.4;
/**
 * How close a deep OBJECT's nearest edge must come to the face plane to be seen in this elevation.
 *
 * A staircase or a veranda railing is not a thin member sitting in the wall plane — it is a solid
 * that stands against, or projects past, the face. Judging those by their centre (as the frame
 * members are judged) puts the centre metres away from the plane and drops them from the drawing
 * entirely, which is why the elevations previously showed no stair and no railing.
 */
const OBJECT_BAND_M = 1.2;

export type ReferenceFace = "front" | "rear" | "left" | "right";

/** Families drawn as the frame line. */
const FRAME_KINDS: ReadonlySet<ColonyPartKind> = new Set<ColonyPartKind>([
  "column", "base-beam", "floor-beam", "rail", "veranda-post", "veranda-beam",
]);
/** Families drawn as the roof profile, projected across the whole face. */
const ROOF_KINDS: ReadonlySet<ColonyPartKind> = new Set<ColonyPartKind>(["rafter", "ridge", "roof-sheet"]);
/** The staircase, seen in elevation: flight soffit, treads and the half-landing. */
const STAIR_KINDS: ReadonlySet<ColonyPartKind> = new Set<ColonyPartKind>([
  "stair-stringer", "stair-tread", "landing",
]);
/** The hand railing — veranda and stair alike. */
const RAILING_KINDS: ReadonlySet<ColonyPartKind> = new Set<ColonyPartKind>([
  "handrail", "handrail-post", "toe-plate",
]);

interface HV { h: number; v: number }

function projectSolid(solid: PartSolid, horiz: "x" | "y"): HV[] | null {
  if (solid.kind === "quad") return solid.pts.map((p) => ({ h: horiz === "x" ? p.x : p.y, v: p.z }));
  const f = footprintXY(solid);
  const z = spanZ(solid);
  if (!f || !z) return null;
  const h0 = horiz === "x" ? f.x0 : f.y0;
  const h1 = horiz === "x" ? f.x1 : f.y1;
  return [{ h: h0, v: z.z0 }, { h: h1, v: z.z0 }, { h: h1, v: z.z1 }, { h: h0, v: z.z1 }];
}

function depthCentre(solid: PartSolid, depth: "x" | "y"): number | null {
  const f = footprintXY(solid);
  if (!f) return null;
  return depth === "x" ? (f.x0 + f.x1) / 2 : (f.y0 + f.y1) / 2;
}

/**
 * The two ENDS of a diagonal brace, projected onto the elevation — the points where it is bolted to
 * the frame. A brace is modelled as a thin quad in the wall plane, so its projected outline is a
 * parallelogram; the two ends are the midpoints of its short edges.
 */
function braceEnds(solid: PartSolid, horiz: "x" | "y"): HV[] | null {
  const pts = projectSolid(solid, horiz);
  if (!pts || pts.length < 4) return null;
  const mid = (a: HV, b: HV): HV => ({ h: (a.h + b.h) / 2, v: (a.v + b.v) / 2 });
  // braceQuad emits the corners in order p0-low, p1-high, p1-high(+t), p0-low(+t)
  return [mid(pts[0], pts[3]), mid(pts[1], pts[2])];
}

/** Distance from the solid's depth EXTENT to a plane — zero when the solid straddles it. */
function depthGap(solid: PartSolid, depth: "x" | "y", plane: number): number | null {
  const f = footprintXY(solid);
  if (!f) return null;
  const a = depth === "x" ? f.x0 : f.y0;
  const b = depth === "x" ? f.x1 : f.y1;
  if (plane >= a && plane <= b) return 0;
  return Math.min(Math.abs(a - plane), Math.abs(b - plane));
}

/** One swatch of the elevation key. */
interface LegendItem {
  color: string;
  label: string;
  dashed?: boolean;
  ring?: boolean;
  outline?: string;
}

/** The elevation key — a swatch per family actually drawn on THIS face, never a fixed list. */
function ElevationLegend({ x, y, items }: { x: number; y: number; items: LegendItem[] }) {
  if (items.length === 0) return null;
  let cursor = x;
  return (
    <g>
      {items.map((it, i) => {
        const at = cursor;
        cursor += 16 + it.label.length * 4.6 + 14;
        return (
          <g key={i}>
            {it.ring ? (
              <>
                <circle cx={at + 5} cy={y - 3} r={3.2} fill={REF.paper} stroke={it.color} strokeWidth={1} />
                <circle cx={at + 5} cy={y - 3} r={1.1} fill={it.color} />
              </>
            ) : (
              <rect x={at} y={y - 7} width={11} height={7} fill={it.color} fillOpacity={it.dashed ? 0.35 : 1}
                stroke={it.outline ?? it.color} strokeWidth={0.7} strokeDasharray={it.dashed ? "3 2" : undefined} />
            )}
            <text x={at + 16} y={y} fontSize={7} fill={REF.thin}>{it.label}</text>
          </g>
        );
      })}
    </g>
  );
}

export interface ReferenceElevationViewProps {
  model: ColonyModel;
  face: ReferenceFace;
  /** "Front Side Elevation" — the caption under the view. */
  title: string;
  openings: OpeningScheduleRow[];
  callouts: EnvelopeCallout[];
  /**
   * The overall setting-out dimension this face is to carry, in the model's own coordinates.
   *
   * WITHOUT it the view would dimension its own drawn silhouette, which includes the roof overhang —
   * so the same building would read 27100 on the elevation and 27000 on the plan. The composed sheet
   * passes the PLAN's extent, so one building has one overall length everywhere on the issue.
   */
  overall?: { fromM: number; toM: number };
  /**
   * The cross-bracing note — its section and the nut-bolt assembly at each end. Both come from the
   * priced calculation (`buildBracingNote`), never from this view: the drawing states the connection,
   * it does not decide it. Omitted ⇒ the brace is drawn but carries no bolt annotation.
   */
  bracing?: BracingNote;
  targetPx?: number;
}

export function ReferenceElevationView({
  model, face, title, openings, callouts, overall, bracing, targetPx = 880,
}: ReferenceElevationViewProps) {
  const b = model.bounds;
  const horiz: "x" | "y" = face === "front" || face === "rear" ? "x" : "y";
  const depth: "x" | "y" = horiz === "x" ? "y" : "x";
  const flip = face === "front" || face === "left";

  const hMin = horiz === "x" ? b.min.x : b.min.y;
  const hMax = horiz === "x" ? b.max.x : b.max.y;
  const facePlane = face === "front" ? b.max.y : face === "rear" ? b.min.y : face === "right" ? b.max.x : b.min.x;

  const vMin = 0;
  const vMax = Math.max(b.max.z, model.meta.plinthM + 0.5);
  const hSpan = Math.max(0.001, hMax - hMin);
  const vSpan = Math.max(0.001, vMax - vMin);
  const ppm = refPpm(Math.max(hSpan, vSpan * 1.9), targetPx);

  const H = (m: number) => (flip ? PAD_L + (hMax - m) * ppm : PAD_L + (m - hMin) * ppm);
  const V = (m: number) => PAD_T + (vMax - m) * ppm;
  const svgW = hSpan * ppm + PAD_L + PAD_R;
  const svgH = vSpan * ppm + PAD_T + PAD_B;

  const onFace = (p: ColonyPart): boolean => {
    const d = depthCentre(p.solid, depth);
    return d != null && Math.abs(d - facePlane) <= FACE_BAND_M;
  };

  /** A deep object (stair, railing) belongs here when its nearest EDGE reaches the face plane. */
  const touchesFace = (p: ColonyPart, band = OBJECT_BAND_M): boolean => {
    const g = depthGap(p.solid, depth, facePlane);
    return g != null && g <= band;
  };

  const frame = model.parts.filter((p) => FRAME_KINDS.has(p.kind) && onFace(p));
  /**
   * CROSS BRACING — selected by the face the model TAGGED it with, not by a depth band.
   *
   * A braced bay sits on the structural grid line, which for a veranda'd building is set well inside
   * the outer face plane (the veranda decks project past it). Judging braces by proximity to that
   * plane dropped every one of them, so the elevations captioned "with … Bracing Locations" showed
   * no bracing at all. `buildBraces` emits ids as `brace:<face>:…`, and the priced take-off keys the
   * same face — so the tag is exact and there is nothing to guess.
   */
  const braces = model.parts.filter((p) => p.kind === "brace" && p.id.startsWith(`brace:${face}:`));
  const stairs = model.parts.filter((p) => STAIR_KINDS.has(p.kind) && touchesFace(p));
  const railings = model.parts.filter((p) => RAILING_KINDS.has(p.kind) && touchesFace(p, OBJECT_BAND_M * 0.6));
  const roof = model.parts.filter((p) => ROOF_KINDS.has(p.kind));
  const doors = model.parts.filter((p) => p.kind === "door" && onFace(p));
  const windows = model.parts.filter((p) => p.kind === "window" && onFace(p));

  const poly = (p: ColonyPart): string | null => {
    const pts = projectSolid(p.solid, horiz);
    if (!pts) return null;
    return pts.map((q) => `${H(q.h)},${V(q.v)}`).join(" ");
  };

  const markOf = (kind: "door" | "window", p: ColonyPart): string => {
    const w = Math.round(p.spec.widthMm ?? 0);
    const h = Math.round(p.spec.heightMm ?? 0);
    const exact = openings.find((o) => o.kind === kind && o.widthMm === w && o.heightMm === h);
    if (exact) return exact.mark;
    const any = openings.find((o) => o.kind === kind);
    return any ? any.mark : kind === "door" ? "D" : "W";
  };

  /* ── levels ───────────────────────────────────────────────────────────────────────────────── */
  const plinthM = model.meta.plinthM;
  const floorHM = model.meta.floorHM;
  const floors = Math.max(1, model.meta.floors);
  const eaveZ = plinthM + floors * floorHM;
  const ridgeZ = b.max.z;

  const levelZs = [0, plinthM];
  for (let f = 1; f < floors; f++) levelZs.push(plinthM + f * floorHM);
  levelZs.push(eaveZ);
  if (ridgeZ > eaveZ + 0.02) levelZs.push(ridgeZ);
  const levelStations: RefGridStation[] = stationsFrom(levelZs, (i) => String(i));

  const bayStations: RefGridStation[] = gridStations(model, horiz);
  const groundY = V(0);
  /* SCREEN right, not model right: front and left are viewed from the far side, so their model
   * maximum lands on the screen LEFT. Callout text is parked past this edge, in the right margin, so
   * it never sits on top of the elevation it is naming. */
  const rightEdge = Math.max(H(hMin), H(hMax));

  const roofCallout = callouts.find((c) => c.id === "roof");
  const wallCallout = callouts.find((c) => c.id === "wall");

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 620) }}>
      <rect x={0} y={0} width={svgW} height={svgH} fill={REF.paper} />

      {/* grid lines dropped from the bubbles */}
      {bayStations.map((s, i) => (
        <g key={`gs${i}`}>
          <line x1={H(s.m)} y1={PAD_T - 14} x2={H(s.m)} y2={groundY}
            stroke={REF.grid} strokeWidth={0.55} strokeDasharray="9 3 2 3" opacity={0.6} />
          <RefBubble cx={H(s.m)} cy={PAD_T - 25} label={s.label} />
        </g>
      ))}

      {/* roof profile */}
      {roof.map((p) => {
        const pts = poly(p);
        if (!pts) return null;
        const isSheet = p.kind === "roof-sheet";
        return (
          <polygon key={p.id} points={pts}
            fill={isSheet ? REF.roof : "none"} fillOpacity={isSheet ? 0.25 : 1}
            stroke={REF.roof} strokeWidth={p.kind === "ridge" ? 1.4 : 0.9} />
        );
      })}

      {/* frame line */}
      {frame.map((p) => {
        const pts = poly(p);
        if (!pts) return null;
        return (
          <polygon key={p.id} points={pts} fill={REF.frame} fillOpacity={0.82} stroke={REF.frame} strokeWidth={0.5} />
        );
      })}

      {/* STAIRCASE — flight soffit, treads and half-landing, seen against this face */}
      {stairs.map((p) => {
        const pts = poly(p);
        if (!pts) return null;
        const isTread = p.kind === "stair-tread";
        return (
          <polygon key={p.id} points={pts}
            fill={p.kind === "landing" ? REF.stairFill : isTread ? REF.paper : REF.stairFill}
            fillOpacity={isTread ? 1 : 0.9}
            stroke={REF.frame} strokeWidth={isTread ? 0.45 : 0.9} />
        );
      })}

      {/* HAND RAILING — veranda and stair alike: posts, rails and any toe plate */}
      {railings.map((p) => {
        const pts = poly(p);
        if (!pts) return null;
        return (
          <polygon key={p.id} points={pts}
            fill={REF.railing} fillOpacity={p.kind === "handrail-post" ? 0.9 : 1}
            stroke={REF.railing} strokeWidth={0.5} />
        );
      })}

      {/* BRACING — the point of this view's caption; dashed, in its own colour, never filled solid */}
      {braces.map((p) => {
        const pts = poly(p);
        if (!pts) return null;
        return (
          <polygon key={p.id} points={pts} fill={REF.brace} fillOpacity={0.35}
            stroke={REF.brace} strokeWidth={0.8} strokeDasharray="5 3" />
        );
      })}

      {/* CROSS-SUPPORT NUT-BOLT NODES — a ringed node at each end of every brace, where the
          diagonal is bolted to the frame. The count and size beside them are the priced
          calculation's own (`result.bolts`), so the drawing cannot invent a fastener. */}
      {bracing && braces.map((p) => {
        const ends = braceEnds(p.solid, horiz);
        if (!ends) return null;
        return (
          <g key={`bn-${p.id}`}>
            {ends.map((e, i) => (
              <g key={i}>
                <circle cx={H(e.h)} cy={V(e.v)} r={3.2} fill={REF.paper} stroke={REF.boltNode} strokeWidth={1} />
                <circle cx={H(e.h)} cy={V(e.v)} r={1.1} fill={REF.boltNode} />
              </g>
            ))}
          </g>
        );
      })}

      {/* openings, tagged with the schedule marks */}
      {windows.map((p) => {
        const pts = poly(p);
        const z = spanZ(p.solid);
        const f = footprintXY(p.solid);
        if (!pts || !z || !f) return null;
        const cH = horiz === "x" ? (f.x0 + f.x1) / 2 : (f.y0 + f.y1) / 2;
        return (
          <g key={p.id}>
            <polygon points={pts} fill={REF.paper} stroke={REF.window} strokeWidth={0.9} />
            <line x1={H(cH)} y1={V(z.z0)} x2={H(cH)} y2={V(z.z1)} stroke={REF.window} strokeWidth={0.5} />
            <text x={H(cH)} y={V(z.z1) - 2.5} fontSize={6} textAnchor="middle" fill={REF.window} fontWeight={700}>
              [{markOf("window", p)}]
            </text>
          </g>
        );
      })}
      {doors.map((p) => {
        const pts = poly(p);
        const z = spanZ(p.solid);
        const f = footprintXY(p.solid);
        if (!pts || !z || !f) return null;
        const cH = horiz === "x" ? (f.x0 + f.x1) / 2 : (f.y0 + f.y1) / 2;
        return (
          <g key={p.id}>
            <polygon points={pts} fill={REF.paper} stroke={REF.door} strokeWidth={1} />
            <text x={H(cH)} y={V(z.z1) - 2.5} fontSize={6} textAnchor="middle" fill={REF.door} fontWeight={700}>
              [{markOf("door", p)}]
            </text>
          </g>
        );
      })}

      {/* ground line + hatch */}
      <line x1={PAD_L - 38} y1={groundY} x2={rightEdge + 24} y2={groundY} stroke={REF.ink} strokeWidth={1.6} />
      {Array.from({ length: Math.max(2, Math.round((hSpan * ppm + 56) / 12)) }).map((_, i) => {
        const x = PAD_L - 32 + i * 12;
        return <line key={`hz${i}`} x1={x} y1={groundY} x2={x - 6} y2={groundY + 6} stroke={REF.note} strokeWidth={0.6} />;
      })}

      {/* cladding callouts — the exact panel each surface is clad in */}
      {roofCallout && (
        <Callout
          x={(H(hMin) + H(hMax)) / 2}
          y={ridgeZ > eaveZ + 0.02 ? V(ridgeZ) + 4 : V(eaveZ)}
          tx={rightEdge + 10}
          ty={V(Math.max(ridgeZ, eaveZ)) - 10}
          label={roofCallout.label} detail={roofCallout.detail}
        />
      )}
      {wallCallout && (
        <Callout
          x={rightEdge} y={V((plinthM + eaveZ) / 2)}
          tx={rightEdge + 10} ty={V((plinthM + eaveZ) / 2) + 4}
          label={wallCallout.label} detail={wallCallout.detail}
        />
      )}
      {ridgeZ > eaveZ + 0.02 && (
        <text x={(H(hMin) + H(hMax)) / 2} y={V(ridgeZ) - 5} fontSize={7} textAnchor="middle" fill={REF.ink} fontWeight={700}>
          Ridge
        </text>
      )}

      {/* the cross-bracing callout — section and the nut-bolt assembly at each end */}
      {bracing && braces.length > 0 && (() => {
        const anchor = braceEnds(braces[0].solid, horiz);
        const at = anchor ? anchor[0] : { h: (hMin + hMax) / 2, v: plinthM };
        return (
          <Callout
            x={H(at.h)} y={V(at.v)}
            tx={rightEdge + 10} ty={V(plinthM) - 4}
            label="Cross bracing"
            detail={`${bracing.section} · ${braces.length} nos on this face · bolted ${bracing.boltSize} × ${bracing.boltsPerEnd} per end`}
          />
        );
      })()}

      {/* the hand-railing callout — height read off the drawn rail, never assumed */}
      {railings.length > 0 && (() => {
        const rail = railings.find((p) => p.kind === "handrail") ?? railings[0];
        const z = spanZ(rail.solid);
        const f = footprintXY(rail.solid);
        if (!z || !f) return null;
        const cH = horiz === "x" ? (f.x0 + f.x1) / 2 : (f.y0 + f.y1) / 2;
        const ffl = plinthM;
        return (
          <Callout
            x={H(cH)} y={V(z.z1)}
            tx={rightEdge + 10} ty={V(z.z1) - 4}
            label="Hand railing"
            detail={`${Math.round((z.z1 - ffl) * 1000)} mm above FFL · ${railings.filter((p) => p.kind === "handrail-post").length} posts on this face`}
          />
        );
      })()}

      {/* the staircase callout */}
      {stairs.length > 0 && (() => {
        const treads = stairs.filter((p) => p.kind === "stair-tread").length;
        const first = stairs[0];
        const z = spanZ(first.solid);
        const f = footprintXY(first.solid);
        if (!z || !f) return null;
        const cH = horiz === "x" ? (f.x0 + f.x1) / 2 : (f.y0 + f.y1) / 2;
        return (
          <Callout
            x={H(cH)} y={V((z.z0 + z.z1) / 2)}
            tx={rightEdge + 10} ty={V(plinthM) + 26}
            label="Staircase"
            detail={`${treads} treads${stairs.some((p) => p.kind === "landing") ? " · half landing" : ""}`}
          />
        );
      })()}

      {/* legend — so the reader can tell frame, bracing, railing and stair apart */}
      <ElevationLegend
        x={PAD_L}
        y={svgH - 52}
        items={[
          { color: REF.frame, label: "Frame" },
          ...(braces.length ? [{ color: REF.brace, label: "Cross bracing", dashed: true }] : []),
          ...(bracing && braces.length ? [{ color: REF.boltNode, label: "Bolted cross-support node", ring: true }] : []),
          ...(railings.length ? [{ color: REF.railing, label: "Hand railing" }] : []),
          ...(stairs.length ? [{ color: REF.stairFill, label: "Staircase", outline: REF.frame }] : []),
        ]}
      />

      {/* dimensions — the overall is the PLAN's extent when the sheet supplies it, so the elevation
          and the plan can never state two different building lengths */}
      {bayStations.length >= 2 && <DimChainMmH stations={bayStations} y={groundY + 34} at={H} />}
      <DimMmH
        x0={H(overall ? overall.fromM : hMin)}
        x1={H(overall ? overall.toM : hMax)}
        y={groundY + 52}
        m={overall ? Math.abs(overall.toM - overall.fromM) : hSpan}
        bold
      />
      <DimChainMmV stations={levelStations} x={PAD_L - 40} at={V} />
      <DimMmV y0={V(vMax)} y1={V(0)} x={PAD_L - 58} m={vMax} bold />

      <ViewTitle
        x={(H(hMin) + H(hMax)) / 2}
        y={svgH - 20}
        title={title}
        subtitle="(with Door & Window and Bracing Locations)"
      />
    </svg>
  );
}
