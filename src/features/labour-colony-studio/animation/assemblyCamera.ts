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
  // A fallback only — a real detail shot is planned by planDetailShot(), which frames on the focus box
  // ALONE. planShot() can never be tight enough for a 300 mm cleat on a 12 m building, because its
  // distance floor is `modelR * 0.6` (≈ 5 m here): that floor is what keeps wide shots from clipping
  // into the building, and it is exactly what a macro shot has to escape.
  "detail-closeup": { dir: [0.9, 0.42, 0.85], distFactor: 0.9, tightness: 1.0, targetLift: 0.0 },
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

/**
 * Interior / MEP steps want the envelope cut away so the camera can read the work inside.
 *
 * A rafter-support DETAIL shot needs the same treatment for the same reason: a ground-floor ceiling
 * connection hangs under the floor deck above it, and a roof connection ends up under the panel the
 * previous shots just laid — without ghosting the already-installed envelope the macro camera would
 * be looking at the back of a board.
 */
export function isCutawayShot(shot: CameraShotKind): boolean {
  return shot === "interior" || shot === "detail-closeup";
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

/* ----------------------------------------------------------------- detail (macro) shot --------- */

/**
 * How a bolted connection wants to be looked at. Both hints are DERIVED FROM THE EMITTED PARTS by the
 * timeline builder (tube centre − purlin centre, covering centre − cleat centre) — never recomputed
 * from the engineering core, and both optional so a missing part just falls back to a safe pose.
 */
export interface DetailFraming {
  /**
   * Horizontal unit vector pointing from the C-purlin WEB into the MS TUBE. The camera approaches
   * from this side, so the shot shows the tube bolted flush to the web with the bolt head, the nut
   * and the projecting thread all visible — rather than the back of the purlin, where the flanges
   * turn away and the joint is hidden.
   */
  webNormal?: Vec3T;
  /** +1 the assembly builds UP off the rafter (roof); −1 it hangs DOWN under the beam (ceiling). */
  buildSign?: number;
}

/** Tightness of the macro framing: distance = focus radius × this + a small standoff. */
const DETAIL_DIST_FACTOR = 2.65;
const DETAIL_STANDOFF_M = 0.2;
/** Never closer than this (the scene's near plane is 0.05 m) and never further than this. */
const DETAIL_MIN_DIST_M = 0.5;
const DETAIL_MAX_DIST_M = 5.0;
/** How far round the joint the camera drifts during the dwell (radians ≈ 13°). */
export const DETAIL_ORBIT_RAD = 0.23;
/** How much the camera creeps in over the dwell (1 = none). A hair of push-in reads as intent. */
export const DETAIL_DWELL_DOLLY = 0.955;

const horiz = (v: Vec3T | undefined): Vec3T | null => {
  if (!v) return null;
  const l = Math.hypot(v[0], v[2]);
  if (!Number.isFinite(l) || l < 1e-6) return null;
  return [v[0] / l, 0, v[2] / l];
};

/**
 * A genuinely TIGHT close-up framed on the focus box ALONE.
 *
 * Distance keys off the FOCUS radius with no model-radius floor, which is the whole difference from
 * `planShot`: on a 12 m colony the tightest shot planShot can produce sits ~5 m back, where an M12
 * bolt head is a couple of pixels. Here a 200 mm cleat is framed from ~0.55 m, so the head, the
 * washer, the nut and the thread projecting past it are all legible — the detail the user
 * photographed.
 *
 * `modelBox` is used only to sanitize a non-finite result, never to widen the framing.
 */
export function planDetailShot(focusBox: Box3, modelBox: Box3, framing?: DetailFraming): CameraKeyframe {
  const web = horiz(framing?.webNormal) ?? norm([0.86, 0, 0.51]);
  // the run direction — perpendicular to the web normal in plan; approaching slightly along the run
  // keeps the bolt head from being seen exactly end-on, so its hexagon and the nut both read.
  const along: Vec3T = [-web[2], 0, web[0]];
  // a roof assembly is looked at slightly from above, a ceiling assembly slightly from below, so the
  // covering it carries never sits between the lens and the joint.
  const sign = (framing?.buildSign ?? 1) >= 0 ? 1 : -1;
  const dir = norm([
    web[0] + along[0] * 0.62,
    sign * 0.34,
    web[2] + along[2] * 0.62,
  ]);

  const r = radiusOf(focusBox);
  const dist = Math.min(
    DETAIL_MAX_DIST_M,
    Math.max(DETAIL_MIN_DIST_M, (Number.isFinite(r) ? r : 0.2) * DETAIL_DIST_FACTOR + DETAIL_STANDOFF_M),
  );

  const target = focusBox.center;
  const position = add(target, scale(dir, dist));
  return { position: sanitize(position, modelBox), target: sanitize(target, modelBox) };
}

/**
 * Rotate a pose around the vertical axis through its own target, optionally dollying in/out.
 *
 * Used for the detail dwell: holding a macro shot perfectly still for a second reads as a stalled
 * render, while a few degrees of drift reads as a camera being walked around the connection.
 */
export function orbitAroundTarget(k: CameraKeyframe, angleRad: number, dolly = 1): CameraKeyframe {
  const dx = k.position[0] - k.target[0];
  const dy = k.position[1] - k.target[1];
  const dz = k.position[2] - k.target[2];
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return {
    position: [
      k.target[0] + (dx * c - dz * s) * dolly,
      k.target[1] + dy * dolly,
      k.target[2] + (dx * s + dz * c) * dolly,
    ],
    target: k.target,
  };
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
