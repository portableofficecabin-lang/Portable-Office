/**
 * LABOUR COLONY ASSEMBLY ANIMATION — camera-shot planner (spec: "Camera system").
 *
 * A cinematic camera rig computed ENTIRELY from the model bounding box and the current step's
 * component group — no coordinates are hard-coded to a fixed colony size. Each construction step gets
 * a shot (establishing / low foundation / base-connection / frame erection / floor deck / upper floor
 * / wall side / stair+veranda / elevated roof / interior cutaway / opening close-up / hero / orbit);
 * the position + look-at target are framed from the active group so the camera always shows the work
 * being installed, and the final orbit / hero keep the completed colony centred for any size.
 *
 * Pure math in THREE space (metres, Y-up) — the same mapping the interactive viewer uses
 * (viewer3d/partGeometry.ts). Colony coordinates are ALREADY metres, so there is no /1000. No three.js,
 * no React, no DOM.
 */

import type { ColonyAssemblyStep, ColonyModel, ColonyPart, ModelBounds } from "@/features/labour-colony-studio/model/types";
import {
  boxOfSolid, quadOfSolid, sceneCtxOf, toScene, type SceneCtx,
} from "@/features/labour-colony-studio/viewer3d/partGeometry";
import type { CameraKeyframe, CameraShotKind, Vec3T } from "./assemblyTypes";

/** An axis-aligned box in three space (metres). */
export interface Box3 {
  min: Vec3T;
  max: Vec3T;
  center: Vec3T;
  size: Vec3T;
}

/* ----------------------------------------------------------------- vector helpers -------------- */

const add = (a: Vec3T, b: Vec3T): Vec3T => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3T, k: number): Vec3T => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: Vec3T): number => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3T): Vec3T => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerp3 = (a: Vec3T, b: Vec3T, t: number): Vec3T => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** The three-space bounding radius (half-diagonal) of a box. */
export const radiusOf = (box: Box3): number => len(box.size) / 2;

function makeBox(min: Vec3T, max: Vec3T): Box3 {
  const center: Vec3T = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const size: Vec3T = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  return { min, max, center, size };
}

/* ----------------------------------------------------------------- model / group boxes --------- */

/** The whole model's three-space box, from its colony-metre bounds. */
export function modelBoxOf(bounds: ModelBounds, ctx: SceneCtx): Box3 {
  const a = toScene({ x: bounds.min.x, y: bounds.min.y, z: bounds.min.z }, ctx);
  const b = toScene({ x: bounds.max.x, y: bounds.max.y, z: bounds.max.z }, ctx);
  return makeBox(
    [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])],
    [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])],
  );
}

/** One part's three-space AABB (box/prism via boxOfSolid; sloped-roof quad via its corners). */
function partAABB(part: ColonyPart, ctx: SceneCtx): { min: Vec3T; max: Vec3T } | null {
  const b = boxOfSolid(part.solid, ctx);
  if (b) {
    return {
      min: [b.center[0] - b.size[0] / 2, b.center[1] - b.size[1] / 2, b.center[2] - b.size[2] / 2],
      max: [b.center[0] + b.size[0] / 2, b.center[1] + b.size[1] / 2, b.center[2] + b.size[2] / 2],
    };
  }
  const q = quadOfSolid(part.solid, ctx);
  if (q) {
    const min: Vec3T = [Infinity, Infinity, Infinity];
    const max: Vec3T = [-Infinity, -Infinity, -Infinity];
    for (const p of q) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]); }
    return { min, max };
  }
  return null;
}

/** The three-space box enclosing a set of parts, or null when none are boxable. */
export function groupBoxOf(parts: ColonyPart[], ctx: SceneCtx): Box3 | null {
  const min: Vec3T = [Infinity, Infinity, Infinity];
  const max: Vec3T = [-Infinity, -Infinity, -Infinity];
  let any = false;
  for (const p of parts) {
    const aabb = partAABB(p, ctx);
    if (!aabb) continue;
    any = true;
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], aabb.min[i]); max[i] = Math.max(max[i], aabb.max[i]); }
  }
  return any ? makeBox(min, max) : null;
}

export function sceneCtxForModel(model: ColonyModel): SceneCtx {
  return sceneCtxOf(model);
}

/* ----------------------------------------------------------------- shot vocabulary ------------- */

/** Per-shot framing recipe: view direction (unit-ish), distance factor (× model radius), and how
 *  much of the group vs. whole model to frame (1 = tight on the group). */
interface ShotRecipe {
  dir: Vec3T;
  distFactor: number;
  /** 0 = frame the whole model, 1 = frame the active group tightly. */
  tightness: number;
  /** vertical target lift, fraction of model height above the group centre. */
  targetLift: number;
}

const SHOTS: Record<CameraShotKind, ShotRecipe> = {
  establish: { dir: [1.0, 0.62, 1.1], distFactor: 2.35, tightness: 0.0, targetLift: 0.15 },
  "foundation-low": { dir: [0.95, 0.28, 1.1], distFactor: 2.15, tightness: 0.2, targetLift: -0.15 },
  "base-connection": { dir: [0.8, 0.5, 1.2], distFactor: 1.25, tightness: 0.7, targetLift: -0.05 },
  "frame-erection": { dir: [0.9, 0.55, 1.15], distFactor: 2.2, tightness: 0.2, targetLift: 0.1 },
  "floor-deck": { dir: [0.85, 0.85, 1.0], distFactor: 2.0, tightness: 0.3, targetLift: 0.05 },
  "upper-floor": { dir: [0.9, 0.9, 1.0], distFactor: 2.15, tightness: 0.2, targetLift: 0.28 },
  "wall-side": { dir: [0.35, 0.5, 1.5], distFactor: 2.2, tightness: 0.15, targetLift: 0.1 },
  "stair-veranda": { dir: [1.25, 0.55, 0.9], distFactor: 1.8, tightness: 0.45, targetLift: 0.08 },
  "roof-elevated": { dir: [0.8, 1.5, 0.85], distFactor: 2.25, tightness: 0.12, targetLift: 0.3 },
  interior: { dir: [1.2, 0.72, 0.55], distFactor: 1.65, tightness: 0.45, targetLift: 0.05 },
  "opening-closeup": { dir: [0.55, 0.42, 1.3], distFactor: 1.25, tightness: 0.7, targetLift: 0.0 },
  orbit: { dir: [1.05, 0.6, 1.2], distFactor: 2.4, tightness: 0.0, targetLift: 0.15 },
  hero: { dir: [1.1, 0.55, 1.25], distFactor: 2.35, tightness: 0.0, targetLift: 0.12 },
};

/** Which shot each construction step uses. */
export function shotForStep(step: ColonyAssemblyStep): CameraShotKind {
  switch (step) {
    case 1: case 2: case 3: case 4: return "foundation-low";
    case 5: return "base-connection";
    case 6: case 7: return "frame-erection";
    case 8: case 9: return "floor-deck";
    case 10: return "frame-erection";
    case 11: case 12: case 13: return "upper-floor";
    case 14: return "wall-side";
    case 15: case 16: return "stair-veranda";
    case 17: case 18: case 19: return "roof-elevated";
    case 20: return "interior";
    case 21: return "opening-closeup";
    case 22: return "stair-veranda";
    case 23: return "interior";
    default: return "hero";
  }
}

/** Interior / MEP steps want the envelope cut away so the camera can read the work inside. */
export function isCutawayShot(shot: CameraShotKind): boolean {
  return shot === "interior";
}

/**
 * Frame a shot: the look-at target blends the whole-model centre toward the active group's centre by
 * `tightness`, and the camera sits back along the shot direction at a distance scaled to whichever it
 * is framing. Guarantees a finite, sane pose for any colony size.
 */
export function planShot(shot: CameraShotKind, modelBox: Box3, groupBox: Box3 | null): CameraKeyframe {
  const recipe = SHOTS[shot];
  const g = groupBox ?? modelBox;
  const modelR = Math.max(0.5, radiusOf(modelBox));
  const groupR = Math.max(0.4, radiusOf(g));

  // target: blend model centre → group centre, then lift a little.
  const target = lerp3(modelBox.center, g.center, recipe.tightness);
  target[1] += recipe.targetLift * Math.max(0.5, modelBox.size[1]);

  // distance: tight shots key off the group radius; wide shots off the model radius.
  const frameR = lerp(modelR, groupR, recipe.tightness);
  const dist = Math.max(modelR * 0.6, frameR * recipe.distFactor + 0.5);

  const position = add(target, scale(norm(recipe.dir), dist));
  return { position: sanitize(position, modelBox), target: sanitize(target, modelBox) };
}

/** The final-orbit pose at angle θ around the model centre, at a fixed elevation + radius. */
export function orbitShot(modelBox: Box3, angleRad: number): CameraKeyframe {
  const r = Math.max(0.5, radiusOf(modelBox));
  const dist = r * 2.35;
  const y = modelBox.center[1] + Math.max(0.5, modelBox.size[1]) * 0.35 + r * 0.55;
  const target: Vec3T = [modelBox.center[0], modelBox.center[1] + Math.max(0.4, modelBox.size[1]) * 0.15, modelBox.center[2]];
  const position: Vec3T = [
    modelBox.center[0] + Math.cos(angleRad) * dist,
    y,
    modelBox.center[2] + Math.sin(angleRad) * dist,
  ];
  return { position, target };
}

/** Guard every camera value against NaN/Infinity (spec: "Camera values are valid"). */
function sanitize(v: Vec3T, box: Box3): Vec3T {
  const fallback = box.center;
  return [
    Number.isFinite(v[0]) ? v[0] : fallback[0] + 5,
    Number.isFinite(v[1]) ? v[1] : fallback[1] + 3,
    Number.isFinite(v[2]) ? v[2] : fallback[2] + 5,
  ];
}

export function keyframeFinite(k: CameraKeyframe): boolean {
  return [...k.position, ...k.target].every((n) => Number.isFinite(n));
}
