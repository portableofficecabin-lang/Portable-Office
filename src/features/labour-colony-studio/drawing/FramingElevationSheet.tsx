"use client";

/**
 * LABOUR COLONY 2D FABRICATION SHEETS — FRAMING ELEVATION (one face).
 *
 * An orthographic projection of the frame onto one face of the block. The horizontal axis is the part
 * x for the FRONT / REAR faces and the part y for the LEFT / RIGHT faces; the vertical axis is always
 * the part z. Correct viewing sense is preserved: front and left are seen from the far side, so their
 * horizontal axis is mirrored (screen-right = d × up), exactly as a CAD elevation would be set out.
 *
 * Drawn, all in colony METRES straight off the shared model:
 *   • columns, wall studs, framing rails, floor / base beams and vertical bracing on the face plane;
 *   • the roof profile (rafters, ridge, purlins, sheeting silhouette) — quads project as polygons, so
 *     a gable reads as a gable on the gable-end faces and as a ridge band on the long faces;
 *   • door and window openings on that face;
 *   • LEVEL LINES with CAD level markers — natural ground, plinth / FFL of each floor, eave and ridge;
 *   • grid bubbles + a bay dimension chain along the face, and a level dimension chain up the side.
 *
 * Levels come from model.meta (plinthM, floorHM, floors) and the model bounds — never recomputed here.
 * Literal hex, export-safe.
 */

import type {
  ColonyDrawingMeta, ColonyModel, ColonyPart, ColonyPartKind, PartSolid,
} from "@/features/labour-colony-studio/model/types";
import { DimChainH, DimChainV, GridBubble, ScaleBar } from "./sheetPrimitives";
import { PLAN, footprintXY, mLabel, parseGrid, planPpm, spanZ } from "./planScale";

const PAD = 84;
/** How close to the face plane a member must sit to belong to that elevation (metres). */
const FACE_BAND_M = 0.4;

export type ElevationFaceName = "front" | "rear" | "left" | "right";

export interface FramingElevationSheetProps {
  model: ColonyModel;
  face: ElevationFaceName;
  meta: ColonyDrawingMeta;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

/** Families drawn as framing members on the elevation. */
const FRAME_KINDS = new Set<ColonyPartKind>([
  "column", "stud", "rail", "base-beam", "floor-beam", "brace", "veranda-post", "veranda-beam",
]);
/** Families drawn as the roof profile (projected over the whole face, not only the face band). */
const ROOF_KINDS = new Set<ColonyPartKind>(["rafter", "truss-web", "ridge", "purlin", "roof-sheet"]);
/** Families drawn as openings. */
const OPENING_KINDS = new Set<ColonyPartKind>(["door", "window"]);

const COLOR_OF: Partial<Record<ColonyPartKind, string>> = {
  column: PLAN.column,
  "veranda-post": PLAN.column,
  stud: PLAN.joist,
  rail: PLAN.beam,
  "base-beam": PLAN.beam,
  "floor-beam": PLAN.beam,
  "veranda-beam": PLAN.beam,
  brace: PLAN.brace,
  rafter: PLAN.beam,
  "truss-web": PLAN.joist,
  ridge: PLAN.column,
  purlin: PLAN.joist,
  "roof-sheet": PLAN.roof,
  window: PLAN.opening,
  door: PLAN.door,
};

interface HV { h: number; v: number }

/** Project a solid's silhouette onto the (horizontal, z) plane. Quads keep their 4 corners. */
function projectSolid(solid: PartSolid, horiz: "x" | "y"): HV[] | null {
  if (solid.kind === "quad") {
    return solid.pts.map((p) => ({ h: horiz === "x" ? p.x : p.y, v: p.z }));
  }
  const f = footprintXY(solid);
  const z = spanZ(solid);
  if (!f || !z) return null;
  const h0 = horiz === "x" ? f.x0 : f.y0;
  const h1 = horiz === "x" ? f.x1 : f.y1;
  return [
    { h: h0, v: z.z0 }, { h: h1, v: z.z0 }, { h: h1, v: z.z1 }, { h: h0, v: z.z1 },
  ];
}

/** The part's centre coordinate on the axis pointing OUT of the elevation plane. */
function depthCentre(solid: PartSolid, depth: "x" | "y"): number | null {
  const f = footprintXY(solid);
  if (!f) return null;
  return depth === "x" ? (f.x0 + f.x1) / 2 : (f.y0 + f.y1) / 2;
}

/** One CAD level marker: a filled half-triangle on the level line plus its "+0.000" label. */
function LevelMark({ x, y, label, level }: { x: number; y: number; label: string; level: number }) {
  const t = 6;
  const sign = level < 0 ? "−" : "+";
  return (
    <g>
      <polygon points={`${x},${y} ${x - t},${y - t} ${x + t},${y - t}`} fill={PLAN.ink} />
      <line x1={x - 30} y1={y} x2={x + 30} y2={y} stroke={PLAN.ink} strokeWidth={0.9} />
      <text x={x + 34} y={y - 2} fontSize={8.5} fill={PLAN.ink} fontWeight={700}>
        {sign}{Math.abs(level).toFixed(3)}
      </text>
      <text x={x + 34} y={y + 8} fontSize={7.5} fill={PLAN.dim}>{label}</text>
    </g>
  );
}

export function FramingElevationSheet({ model, face, meta, selectedId, onSelect }: FramingElevationSheetProps) {
  const b = model.bounds;
  const horiz: "x" | "y" = face === "front" || face === "rear" ? "x" : "y";
  const depth: "x" | "y" = horiz === "x" ? "y" : "x";
  /** Front and left are viewed from the far side → their horizontal axis mirrors. */
  const flip = face === "front" || face === "left";

  const hMin = horiz === "x" ? b.min.x : b.min.y;
  const hMax = horiz === "x" ? b.max.x : b.max.y;
  /** The plane the face sits on: front / right are at the axis MAX, rear / left at the MIN. */
  const facePlane = face === "front" ? b.max.y : face === "rear" ? b.min.y : face === "right" ? b.max.x : b.min.x;

  const vMin = 0;                                   // natural ground level — the elevation's datum
  const vMax = Math.max(b.max.z, model.meta.plinthM + 0.5);

  const hSpan = Math.max(0.001, hMax - hMin);
  const vSpan = Math.max(0.001, vMax - vMin);
  const ppm = planPpm(Math.max(hSpan, vSpan));

  const hx = (m: number) => (flip ? PAD + (hMax - m) * ppm : PAD + (m - hMin) * ppm);
  const vy = (m: number) => PAD + (vMax - m) * ppm;

  const svgW = hSpan * ppm + PAD * 2 + 90;
  const svgH = vSpan * ppm + PAD * 2 + 34;

  const onFace = (p: ColonyPart): boolean => {
    const d = depthCentre(p.solid, depth);
    return d != null && Math.abs(d - facePlane) <= FACE_BAND_M;
  };

  const frame = model.parts.filter((p) => FRAME_KINDS.has(p.kind) && onFace(p));
  const roof = model.parts.filter((p) => ROOF_KINDS.has(p.kind));
  const openings = model.parts.filter((p) => OPENING_KINDS.has(p.kind) && onFace(p));

  const poly = (p: ColonyPart): string | null => {
    const pts = projectSolid(p.solid, horiz);
    if (!pts) return null;
    return pts.map((q) => `${hx(q.h)},${vy(q.v)}`).join(" ");
  };

  // ── levels ────────────────────────────────────────────────────────────────────────────────
  const plinthM = model.meta.plinthM;
  const floorHM = model.meta.floorHM;
  const floors = Math.max(1, model.meta.floors);
  const eaveZ = plinthM + floors * floorHM;
  const ridgeZ = b.max.z;

  const levels: { z: number; label: string }[] = [{ z: 0, label: "Natural ground level (NGL)" }];
  levels.push({ z: plinthM, label: floors > 0 ? "Plinth / ground FFL" : "Plinth level" });
  for (let f = 1; f < floors; f++) levels.push({ z: plinthM + f * floorHM, label: `Floor ${f} FFL` });
  levels.push({ z: eaveZ, label: "Eave / top of columns" });
  if (ridgeZ > eaveZ + 0.02) levels.push({ z: ridgeZ, label: model.meta.sloped ? "Ridge level" : "Top of roof" });

  // ── grid bubbles along the face ───────────────────────────────────────────────────────────
  const stations: { v: number; label: string }[] = [];
  for (const c of model.parts) {
    if (c.kind !== "column" || (c.floor ?? 0) !== 0) continue;
    const f = footprintXY(c.solid);
    const g = parseGrid(c.grid);
    if (!f || !g) continue;
    const at = horiz === "x" ? (f.x0 + f.x1) / 2 : (f.y0 + f.y1) / 2;
    const label = horiz === "x" ? g.letter : g.num;
    if (!stations.some((s) => Math.abs(s.v - at) < 0.05)) stations.push({ v: at, label });
  }
  stations.sort((a, c) => a.v - c.v);

  const faceTitle = `${face.charAt(0).toUpperCase()}${face.slice(1)} elevation — structural framing`;
  const groundY = vy(0);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 640) }}>
        <rect x={0} y={0} width={svgW} height={svgH} fill={PLAN.paper} />

        {/* level lines behind everything */}
        {levels.map((l) => (
          <line key={`lv${l.label}`} x1={PAD - 34} y1={vy(l.z)} x2={hx(flip ? hMin : hMax) + 20} y2={vy(l.z)}
            stroke={PLAN.hair} strokeWidth={0.8} strokeDasharray="10 4 2 4" />
        ))}

        {/* grid lines dropped from the bubbles */}
        {stations.map((s, i) => (
          <g key={`gs${i}`}>
            <line x1={hx(s.v)} y1={PAD - 16} x2={hx(s.v)} y2={groundY} stroke={PLAN.grid} strokeWidth={0.7} strokeDasharray="8 3 2 3" opacity={0.6} />
            <GridBubble cx={hx(s.v)} cy={PAD - 30} label={s.label} />
          </g>
        ))}

        {/* roof profile (drawn first so framing reads over it at the eave) */}
        {roof.map((p) => {
          const pts = poly(p);
          if (!pts) return null;
          const sel = p.id === selectedId;
          const isSheet = p.kind === "roof-sheet";
          return (
            <polygon key={p.id} points={pts}
              onClick={() => onSelect?.(p.id)} style={{ cursor: onSelect ? "pointer" : undefined }}
              fill={sel ? PLAN.selFill : isSheet ? PLAN.roof : "none"}
              fillOpacity={isSheet ? 0.35 : 1}
              stroke={sel ? PLAN.sel : COLOR_OF[p.kind] ?? PLAN.beam}
              strokeWidth={sel ? 1.8 : p.kind === "purlin" ? 0.6 : 1} />
          );
        })}

        {/* framing members on the face */}
        {frame.map((p) => {
          const pts = poly(p);
          if (!pts) return null;
          const sel = p.id === selectedId;
          const col = COLOR_OF[p.kind] ?? PLAN.beam;
          const dashed = p.kind === "brace";
          return (
            <polygon key={p.id} points={pts}
              onClick={() => onSelect?.(p.id)} style={{ cursor: onSelect ? "pointer" : undefined }}
              fill={sel ? PLAN.selFill : col} fillOpacity={sel ? 1 : p.kind === "stud" ? 0.55 : 0.85}
              stroke={sel ? PLAN.sel : col} strokeWidth={sel ? 1.8 : 0.5}
              strokeDasharray={dashed ? "5 3" : undefined} />
          );
        })}

        {/* openings on the face */}
        {openings.map((p) => {
          const pts = poly(p);
          if (!pts) return null;
          const sel = p.id === selectedId;
          const col = COLOR_OF[p.kind] ?? PLAN.opening;
          const z = spanZ(p.solid);
          const f = footprintXY(p.solid);
          const cH = f ? (horiz === "x" ? (f.x0 + f.x1) / 2 : (f.y0 + f.y1) / 2) : null;
          return (
            <g key={p.id} onClick={() => onSelect?.(p.id)} style={{ cursor: onSelect ? "pointer" : undefined }}>
              <polygon points={pts} fill={sel ? PLAN.selFill : col} fillOpacity={0.75}
                stroke={sel ? PLAN.sel : PLAN.dim} strokeWidth={sel ? 1.8 : 0.8} />
              {cH != null && z && (
                <text x={hx(cH)} y={vy(z.z1) - 4} fontSize={7} textAnchor="middle" fill={PLAN.dim}>
                  {p.partMark ?? (p.kind === "door" ? "D" : "W")}
                </text>
              )}
            </g>
          );
        })}

        {/* ground line + hatching */}
        <line x1={PAD - 40} y1={groundY} x2={hx(flip ? hMin : hMax) + 26} y2={groundY} stroke={PLAN.ink} strokeWidth={1.6} />
        {Array.from({ length: Math.max(2, Math.round((hSpan * ppm + 60) / 12)) }).map((_, i) => {
          const x = PAD - 34 + i * 12;
          return <line key={`hz${i}`} x1={x} y1={groundY} x2={x - 7} y2={groundY + 7} stroke={PLAN.sub} strokeWidth={0.7} />;
        })}

        {/* level markers */}
        {levels.map((l) => (
          <LevelMark key={`lm${l.label}`} x={hx(flip ? hMin : hMax) + 30} y={vy(l.z)} label={l.label} level={l.z} />
        ))}

        {/* dimension chains: bays along the face, levels up the side */}
        {stations.length >= 2 && (
          <DimChainH stations={stations.map((s) => ({ x: hx(s.v), m: s.v }))} y={groundY + 40} />
        )}
        <DimChainV stations={levels.map((l) => ({ y: vy(l.z), m: l.z }))} x={PAD - 44} />

        <ScaleBar x={PAD} y={svgH - 20} ppm={ppm} />
        <text x={PAD} y={svgH - 34} fontSize={10} fill={PLAN.ink} fontWeight={700}>{faceTitle}</text>
        <text x={PAD} y={svgH - 24} fontSize={8} fill={PLAN.sub}>
          Overall {mLabel(hSpan)} wide × {mLabel(vMax)} high above NGL · {model.meta.roofType} roof · viewed from the {face}
        </text>
      </svg>

      <div style={{ marginTop: 4, fontSize: 8, color: "#94a3b8" }}>
        Levels are metres above natural ground level: plinth {mLabel(plinthM)}, floor-to-floor {mLabel(floorHM)},
        eave {mLabel(eaveZ)}. Members shown are those within {FACE_BAND_M.toFixed(2)} m of the {face} face plane;
        sections are read from the priced BOQ. Project: {meta.projectName}. Build to written dimensions — do not scale.
      </div>
    </div>
  );
}
