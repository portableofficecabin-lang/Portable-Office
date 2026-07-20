/**
 * 3D viewer — geometry helpers (pure, no React).
 *
 * Maps the shared model's colony METRE coordinates into a three.js scene:
 *   colony (x=length, y=width, z=height, metres)  →  three (x, y=up, z, metres)
 *     three.x = (colony.x − centreX)      (length, centred)
 *     three.y =  colony.z                 (height — three is Y-up; ground z=0 → y=0)
 *     three.z = (colony.y − centreY)      (width / depth, centred)
 *
 * Colony coordinates are ALREADY metres (unlike the cabin model's mm), so there is no /1000. Every
 * model prism footprint is a polygon; for the box renderer it collapses to its xy bounding box.
 * Sloped roof / rafter planes are the only non-box; they render as a two-triangle quad.
 */

import type { ColonyModel, ColonyPart, PartSolid, Vec3 } from "@/features/labour-colony-studio/model/types";

/** Smallest visible cross-section (m) — a thin bar must never collapse to a hairline. */
export const MIN_VIS_M = 0.022;

export interface SceneCtx {
  centreX: number; // colony metres
  centreY: number; // colony metres
}

export function sceneCtxOf(model: ColonyModel): SceneCtx {
  const b = model.bounds;
  return { centreX: (b.min.x + b.max.x) / 2, centreY: (b.min.y + b.max.y) / 2 };
}

/** colony metres → three metres. */
export function toScene(v: Vec3, ctx: SceneCtx): [number, number, number] {
  return [v.x - ctx.centreX, v.z, v.y - ctx.centreY];
}

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
      Math.max(0.001, max.x - min.x),
      Math.max(0.001, max.z - min.z),
      Math.max(0.001, max.y - min.y),
    ],
  };
}

/** The four three-space corner vertices of a quad solid (sloped roof / rafter planes). */
export function quadOfSolid(solid: PartSolid, ctx: SceneCtx): [number, number, number][] | null {
  if (solid.kind !== "quad") return null;
  return solid.pts.map((p) => toScene(p, ctx));
}

/**
 * The explode offset (three metres) for a part at animation progress `t` (0 = assembled, 1 = fully
 * exploded), scaled by the separation gap. Each part uses its own explode direction so the sequence
 * reads as an erection order.
 */
export function explodeOffset(part: ColonyPart, t: number, gapM: number): [number, number, number] {
  const e = part.explode;
  // three axes: x=length(e.x), y=height(e.z), z=width(e.y)
  const k = t * gapM;
  return [e.x * k, e.z * k, e.y * k];
}
