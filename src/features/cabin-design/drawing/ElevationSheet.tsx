"use client";

/**
 * 2D ENGINEERING SHEETS — model-driven elevations (spec §1/§3).
 *
 * Projects the shared model onto one face (front/rear/left/right): the wall silhouette, the roof
 * profile (eave on the long faces, gable on the width faces — the ridge runs along the length), the
 * openings that sit on that wall, and the framing verticals (posts/studs) in engineering mode.
 * Stays synchronized with buildCabinModel() and exports cleanly (literal hex).
 */

import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import type { CabinModel, CabinPart } from "@/features/cabin-design/model/types";
import { PLAN, MM_PER_FT, ftInLabel } from "./planScale";

const ROOF_RISE_FT = 8 / 12;
type Face = "front" | "rear" | "left" | "right";

const NEAR = 250; // mm tolerance for "opening is on this wall"

export function ElevationSheet({ model, config, face, viewMode = "engineering", selectedId, onSelect }: {
  model: CabinModel; config: CabinConfig; face: Face;
  viewMode?: "engineering" | "customer";
  selectedId?: string | null; onSelect?: (id: string | null) => void;
}) {
  const L = Math.max(1, config.length || 1);
  const W = Math.max(1, config.width || 1);
  const Hft = Math.max(6, config.height || 8);
  const sloped = model.meta.sloped;
  const rise = sloped ? ROOF_RISE_FT : 0;
  const ridge = Hft + rise;
  const lengthWall = face === "front" || face === "rear";
  const faceW = lengthWall ? L : W;
  const topFt = lengthWall ? Hft + 0.3 : ridge;

  const PAD = 52, TOP = 26;
  const sc = Math.min(40, Math.max(12, 560 / faceW), 280 / topFt);
  const svgW = faceW * sc + PAD * 2 + 40;
  const svgH = topFt * sc + TOP + 54;
  const floorY = TOP + topFt * sc;
  const xOf = (ft: number) => PAD + ft * sc;
  const yOf = (ft: number) => floorY - ft * sc;

  // horizontal position (ft) of a footprint along this elevation's axis, or null if not on this wall
  const project = (p: CabinPart): { a0: number; a1: number; z0: number; z1: number } | null => {
    const s = p.solid;
    if (s.kind !== "prism" && s.kind !== "box") return null;
    let x0: number, y0: number, x1: number, y1: number, z0: number, z1: number;
    if (s.kind === "box") { x0 = s.min.x; y0 = s.min.y; x1 = s.max.x; y1 = s.max.y; z0 = s.min.z; z1 = s.max.z; }
    else {
      x0 = Math.min(...s.poly.map((q) => q.x)); x1 = Math.max(...s.poly.map((q) => q.x));
      y0 = Math.min(...s.poly.map((q) => q.y)); y1 = Math.max(...s.poly.map((q) => q.y));
      z0 = s.z0; z1 = s.z1;
    }
    const Wmm = W * MM_PER_FT, Lmm = L * MM_PER_FT;
    const onFace =
      face === "front" ? y1 >= Wmm - NEAR :
      face === "rear" ? y0 <= NEAR :
      face === "left" ? x0 <= NEAR : x1 >= Lmm - NEAR;
    if (!onFace) return null;
    const a0 = lengthWall ? x0 / MM_PER_FT : y0 / MM_PER_FT;
    const a1 = lengthWall ? x1 / MM_PER_FT : y1 / MM_PER_FT;
    return { a0, a1, z0: z0 / MM_PER_FT, z1: z1 / MM_PER_FT };
  };

  const openings = model.parts.filter((p) => p.kind === "door" || p.kind === "window");
  const verticals = viewMode === "engineering"
    ? model.parts.filter((p) => (p.kind === "column" || p.kind === "stud"))
    : [];

  const roof = sloped
    ? (lengthWall
        // long face: ridge is parallel & behind → show a shallow parapet/eave fascia
        ? `${xOf(0)},${yOf(Hft)} ${xOf(faceW)},${yOf(Hft)} ${xOf(faceW)},${yOf(Hft + 0.3)} ${xOf(0)},${yOf(Hft + 0.3)}`
        // width face: gable triangle
        : `${xOf(0)},${yOf(Hft)} ${xOf(faceW / 2)},${yOf(ridge)} ${xOf(faceW)},${yOf(Hft)}`)
    : `${xOf(0)},${yOf(Hft)} ${xOf(faceW)},${yOf(Hft)} ${xOf(faceW)},${yOf(Hft + 0.25)} ${xOf(0)},${yOf(Hft + 0.25)}`;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-auto w-full" style={{ minWidth: Math.min(svgW, 520) }}>
        <rect x={0} y={0} width={svgW} height={svgH} fill={PLAN.paper} />

        {/* wall body */}
        <rect x={xOf(0)} y={yOf(Hft)} width={faceW * sc} height={Hft * sc} fill={PLAN.wallFill} stroke={PLAN.wall} strokeWidth={2} />

        {/* roof */}
        {sloped && !lengthWall
          ? <polygon points={roof} fill="#9aa7b4" stroke={PLAN.wall} strokeWidth={1.5} />
          : <polygon points={roof} fill="#9aa7b4" stroke={PLAN.wall} strokeWidth={1.2} />}

        {/* framing verticals (engineering) */}
        {verticals.map((p) => {
          const pr = project(p);
          if (!pr) return null;
          const x = xOf((pr.a0 + pr.a1) / 2);
          return <line key={`v-${p.id}`} x1={x} y1={yOf(Hft)} x2={x} y2={yOf(0)} stroke={p.kind === "column" ? PLAN.sub : "#cbd5e1"} strokeWidth={p.kind === "column" ? 1.4 : 0.8} strokeDasharray={p.kind === "stud" ? "3 3" : undefined} />;
        })}

        {/* openings */}
        {openings.map((p) => {
          const pr = project(p);
          if (!pr) return null;
          const x = xOf(pr.a0), w = Math.max(4, (pr.a1 - pr.a0) * sc);
          const yTop = yOf(pr.z1), h = Math.max(4, (pr.z1 - pr.z0) * sc);
          const sel = p.id === selectedId;
          return (
            <g key={p.id} onClick={() => onSelect?.(p.id)} style={{ cursor: onSelect ? "pointer" : undefined }}>
              <rect x={x} y={yTop} width={w} height={h} fill={sel ? PLAN.selFill : p.kind === "window" ? PLAN.opening : "#e8d3b0"} stroke={sel ? PLAN.sel : PLAN.wall} strokeWidth={sel ? 2 : 1} />
              {p.kind === "window" && <line x1={x} y1={yTop + h / 2} x2={x + w} y2={yTop + h / 2} stroke={PLAN.wall} strokeWidth={0.6} />}
            </g>
          );
        })}

        {/* ground line */}
        <line x1={xOf(0) - 16} y1={floorY} x2={xOf(faceW) + 16} y2={floorY} stroke={PLAN.ink} strokeWidth={2} />

        {/* dims */}
        <line x1={xOf(0)} y1={floorY + 22} x2={xOf(faceW)} y2={floorY + 22} stroke={PLAN.dim} strokeWidth={1} />
        <text x={xOf(faceW / 2)} y={floorY + 19} fontSize={9} textAnchor="middle" fill={PLAN.ink}>{ftInLabel(faceW * MM_PER_FT)}</text>
        <text x={xOf(0)} y={svgH - 6} fontSize={9} fill={PLAN.sub}>{face[0].toUpperCase() + face.slice(1)} Elevation</text>
        <text x={xOf(faceW) + 6} y={yOf(Hft) + 3} fontSize={8} fill={PLAN.sub}>EAVE {ftInLabel(Hft * MM_PER_FT)}</text>
      </svg>
    </div>
  );
}
