/**
 * 3D viewer — geometry helpers (pure, no React).
 *
 * Maps the shared model's CABIN millimetre coordinates into a three.js scene:
 *   cabin (x=length, y=width, z=height, mm)  →  three (x, y=up, z, metres)
 *     three.x =  (cabin.x − centreX) / 1000       (length, centred)
 *     three.y =   cabin.z            / 1000       (height — three is Y-up; floor z=0 → y=0)
 *     three.z =  (cabin.y − centreY) / 1000       (width / depth, centred)
 *
 * Every model prism in a cabin is a RECTANGLE (partitions, doors, windows, fixtures, furniture
 * bounding boxes, tables) — the only exception is a door-swing quarter-disc, which is fine to show
 * as its bounding box — so a prism renders as an axis-aligned box built from its footprint bbox.
 * Sloped roof planes are the only non-box; they render as a two-triangle quad.
 */

import type { CabinModel, CabinPart, PartSolid, Vec3 } from "@/features/cabin-design/model/types";

export interface SceneCtx {
  centreX: number; // cabin mm
  centreY: number; // cabin mm
}

export function sceneCtxOf(model: CabinModel): SceneCtx {
  const b = model.bounds;
  return { centreX: (b.min.x + b.max.x) / 2, centreY: (b.min.y + b.max.y) / 2 };
}

/** cabin mm → three metres. */
export function toScene(v: Vec3, ctx: SceneCtx): [number, number, number] {
  return [(v.x - ctx.centreX) / 1000, v.z / 1000, (v.y - ctx.centreY) / 1000];
}

/** cabin mm length → three metres (no centring — for sizes). */
export const mmToM = (mm: number): number => mm / 1000;

export interface BoxDims {
  /** three-space centre. */
  center: [number, number, number];
  /** three-space size [x=length, y=height, z=width]. */
  size: [number, number, number];
}

/** The axis-aligned box for a box- or prism-solid, in three space. Returns null for a quad. */
export function boxOfSolid(solid: PartSolid, ctx: SceneCtx): BoxDims | null {
  let min: Vec3, max: Vec3;
  if (solid.kind === "box") {
    min = solid.min; max = solid.max;
  } else if (solid.kind === "prism") {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of solid.poly) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    if (!isFinite(x0)) return null;
    min = { x: x0, y: y0, z: solid.z0 }; max = { x: x1, y: y1, z: solid.z1 };
  } else {
    return null;
  }
  const cx = (min.x + max.x) / 2, cy = (min.y + max.y) / 2, cz = (min.z + max.z) / 2;
  return {
    center: toScene({ x: cx, y: cy, z: cz }, ctx),
    size: [
      Math.max(0.001, mmToM(max.x - min.x)),
      Math.max(0.001, mmToM(max.z - min.z)),
      Math.max(0.001, mmToM(max.y - min.y)),
    ],
  };
}

/** The four three-space corner vertices of a quad solid (for the sloped roof planes). */
export function quadOfSolid(solid: PartSolid, ctx: SceneCtx): [number, number, number][] | null {
  if (solid.kind !== "quad") return null;
  return solid.pts.map((p) => toScene(p, ctx));
}

/**
 * The explode offset (three metres) for a part at animation progress `t` (0 = assembled, 1 = fully
 * exploded), given the largest assembly step in play. Later-assembled parts travel farther so the
 * sequence reads as a build order, and each part uses its own explode direction.
 */
export function explodeOffset(part: CabinPart, t: number, gapM: number): [number, number, number] {
  const e = part.explode;
  // three axes: x=length(e.x), y=height(e.z), z=width(e.y)
  const k = t * gapM;
  return [e.x * k, e.z * k, e.y * k];
}
