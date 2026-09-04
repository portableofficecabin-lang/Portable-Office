/**
 * EXACT-30-SECOND ARITHMETIC.
 *
 * The brief's hardest acceptance criterion is that the exported MP4 is exactly 30 seconds. That
 * is enforced in three places, and this file is the first of them:
 *
 *   1. HERE — the storyboard can never be submitted with scene durations that do not sum to 30.
 *      The user is free to drag any scene's slider; every other unlocked scene absorbs the
 *      difference, and what they see in the timeline is what will be rendered.
 *   2. src/lib/animation/assemble.ts — each returned clip is TRIMMED to its scene duration before
 *      concatenation, because a provider that promises 8s often returns 8.03s.
 *   3. src/lib/animation/probe.ts — the finished file is measured server-side and the job FAILS
 *      if it is not 30s within tolerance. A file that is 30.2s is a bug, not a rounding detail.
 *
 * Everything here is pure integer-free arithmetic on tenths of a second, so the numbers a user
 * sees ("6.5s") are exactly the numbers that reach ffmpeg. Floating point never accumulates:
 * durations are held as tenths internally and the LAST scene absorbs the rounding remainder, so
 * the sum is exact by construction rather than by luck.
 */

import {
  MAX_SCENE_SECONDS,
  MIN_SCENE_SECONDS,
  TOTAL_DURATION_SECONDS,
} from "./types";

/** Working unit: tenths of a second. 30s = 300 tenths. */
const TENTHS = 10;

export const TOTAL_TENTHS = TOTAL_DURATION_SECONDS * TENTHS;
const MIN_TENTHS = MIN_SCENE_SECONDS * TENTHS;
const MAX_TENTHS = MAX_SCENE_SECONDS * TENTHS;

/** How far the measured output may sit from 30.000s and still be accepted. One frame at 25fps. */
export const DURATION_TOLERANCE_SECONDS = 0.04;

const toTenths = (seconds: number): number => Math.round(seconds * TENTHS);
const toSeconds = (tenths: number): number => Math.round(tenths) / TENTHS;

export interface RebalanceInput {
  /** Seconds. */
  duration: number;
  /** A locked scene keeps its duration if the arithmetic allows it. */
  locked?: boolean;
}

/**
 * The per-scene bounds that actually apply to a timeline of `count` scenes.
 *
 * MIN_SCENE_SECONDS and MAX_SCENE_SECONDS are editor guidance — sensible limits for a slider on
 * a six-scene storyboard. They are NOT physical limits, and for some scene counts they cannot
 * both be satisfied: two scenes at 12s each is 24s, which cannot make a 30-second film. Clamping
 * to an unsatisfiable bound is how a rebalance ends up silently returning durations that break
 * the very rule the clamp was for.
 *
 * So the bounds are widened, per call, to whatever the arithmetic requires:
 *   • max rises to ceil(total / count) when the nominal max cannot reach the total;
 *   • min falls to floor(total / count) when the nominal min already overshoots it
 *     (16 scenes × 2s = 32s > 30s).
 * For every count between 3 and 15 — which covers the 6-scene default and the 1–12 range the
 * editor allows — the nominal bounds are already satisfiable and nothing changes.
 */
function boundsFor(
  count: number,
  targetTenths: number,
  providerMaxSeconds?: number,
): { min: number; max: number } {
  if (count <= 0) return { min: MIN_TENTHS, max: MAX_TENTHS };

  /* A PROVIDER CAP IS HARD. Veo returns at most an 8-second clip, so a 12-second scene cannot be
   * generated at all — capping here is what stops the timeline offering a scene length that would
   * fail at submission. The editor guidance (MAX_SCENE_SECONDS) applies on top, whichever is
   * lower. When the cap makes the target unreachable the caller is told: see minimumSceneCount(). */
  const hardMaxTenths =
    providerMaxSeconds && providerMaxSeconds > 0
      ? Math.min(MAX_TENTHS, Math.round(providerMaxSeconds * TENTHS))
      : MAX_TENTHS;

  // Widen only when the arithmetic demands it AND no provider cap forbids it.
  const needed = Math.ceil(targetTenths / count);
  const max = providerMaxSeconds ? hardMaxTenths : Math.max(hardMaxTenths, needed);
  const min = Math.min(MIN_TENTHS, Math.floor(targetTenths / count));
  return { min, max };
}

/**
 * The fewest scenes that can add up to `totalSeconds` given a provider's maximum clip length.
 *
 * Veo caps a clip at 8 seconds, so a thirty-second film needs at least four scenes. The workspace
 * uses this to refuse to delete a scene below the floor, rather than letting someone build a
 * three-scene storyboard that can never be generated.
 */
export function minimumSceneCount(
  providerMaxSeconds: number | undefined,
  totalSeconds: number = TOTAL_DURATION_SECONDS,
): number {
  if (!providerMaxSeconds || providerMaxSeconds <= 0) return 1;
  return Math.ceil(totalSeconds / Math.min(providerMaxSeconds, MAX_SCENE_SECONDS));
}

/**
 * Force a list of scene durations to sum to EXACTLY `totalSeconds`.
 *
 * Strategy, in order:
 *   • Unlocked scenes are scaled proportionally to soak up the difference — a 2s overrun spread
 *     across five scenes is invisible; taking it all off the last scene is not.
 *   • Every scene is then clamped to [MIN_SCENE_SECONDS, MAX_SCENE_SECONDS].
 *   • Clamping changes the sum, so the remainder is distributed one tenth at a time across the
 *     scenes that still have room, largest-first. This terminates: each pass either places a
 *     tenth or finds no room, and "no room" can only happen when every scene is at a bound.
 *   • If EVERY scene is at a bound and the sum is still wrong, the locks are the problem — they
 *     are released in reverse order (last locked first) and the pass repeats. A caller therefore
 *     always gets an exact total, and `releasedLocks` tells the UI which locks it had to break so
 *     it can say so instead of silently discarding the user's intent.
 */
export function rebalanceToTotal(
  scenes: RebalanceInput[],
  totalSeconds: number = TOTAL_DURATION_SECONDS,
  /** The configured provider's maximum clip length, when one is known. A HARD cap. */
  providerMaxSeconds?: number,
): { durations: number[]; releasedLocks: number[] } {
  if (scenes.length === 0) return { durations: [], releasedLocks: [] };

  const target = toTenths(totalSeconds);
  const releasedLocks: number[] = [];
  const bounds = boundsFor(scenes.length, target, providerMaxSeconds);

  // A single scene cannot be balanced against anything — it simply becomes the whole film.
  if (scenes.length === 1) {
    return { durations: [toSeconds(target)], releasedLocks: [] };
  }

  const locked = scenes.map((s) => s.locked === true);
  const working = scenes.map((s) => clampTenths(toTenths(s.duration), bounds));

  for (let attempt = 0; attempt <= scenes.length; attempt += 1) {
    const balanced = tryBalance(working, locked, target, bounds);
    if (balanced) return { durations: balanced.map(toSeconds), releasedLocks };

    // Could not hit the target with the current locks — release the last one and retry.
    const lastLocked = locked.lastIndexOf(true);
    if (lastLocked === -1) break;
    locked[lastLocked] = false;
    releasedLocks.push(lastLocked);
  }

  /* Unreachable: with bounds widened to fit the scene count (see boundsFor), an all-unlocked
   * timeline can always absorb the target. Kept as a guard rather than a throw, because
   * returning a wrong TOTAL is the one outcome this module must never produce — an even split
   * with the remainder on the first scene is exact by construction. */
  const even = Math.floor(target / scenes.length);
  const fallback = scenes.map(() => even);
  fallback[0] += target - even * scenes.length;
  return { durations: fallback.map(toSeconds), releasedLocks };
}

function clampTenths(t: number, bounds: { min: number; max: number }): number {
  if (!Number.isFinite(t)) return bounds.min;
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(t)));
}

/**
 * One balancing pass with a fixed lock set. Returns null when the target is unreachable —
 * i.e. the unlocked scenes cannot absorb the difference even at their bounds.
 */
function tryBalance(
  start: number[],
  locked: boolean[],
  target: number,
  bounds: { min: number; max: number },
): number[] | null {
  const out = [...start];
  const movable = out.map((_, i) => i).filter((i) => !locked[i]);
  if (movable.length === 0) {
    return out.reduce((a, b) => a + b, 0) === target ? out : null;
  }

  // Is the target even reachable? Locked scenes are fixed cost; the movable ones have bounds.
  const lockedSum = out.reduce((sum, v, i) => (locked[i] ? sum + v : sum), 0);
  const room = target - lockedSum;
  if (room < movable.length * bounds.min || room > movable.length * bounds.max) return null;

  // Proportional scale of the movable scenes onto the room available.
  const movableSum = movable.reduce((sum, i) => sum + out[i], 0);
  if (movableSum > 0) {
    for (const i of movable) out[i] = clampTenths(Math.round((out[i] * room) / movableSum), bounds);
  } else {
    const even = Math.round(room / movable.length);
    for (const i of movable) out[i] = clampTenths(even, bounds);
  }

  // Distribute whatever the clamping left over, one tenth at a time.
  let delta = target - out.reduce((a, b) => a + b, 0);
  while (delta !== 0) {
    const step = delta > 0 ? 1 : -1;
    // Largest-first when adding, smallest-first when removing: keeps the timeline even.
    const candidates = movable
      .filter((i) => (step > 0 ? out[i] < bounds.max : out[i] > bounds.min))
      .sort((a, b) => (step > 0 ? out[b] - out[a] : out[a] - out[b]));
    if (candidates.length === 0) return null;
    for (const i of candidates) {
      if (delta === 0) break;
      out[i] += step;
      delta -= step;
    }
  }

  return out;
}

/**
 * The per-scene slider bounds the editor should offer for a timeline of `count` scenes.
 *
 * Exported so the timeline UI asks the same function the rebalance uses, instead of hardcoding
 * MIN/MAX and offering a range that cannot produce a 30-second film.
 */
export function sceneDurationBounds(
  count: number,
  totalSeconds: number = TOTAL_DURATION_SECONDS,
  providerMaxSeconds?: number,
): { min: number; max: number } {
  const b = boundsFor(count, toTenths(totalSeconds), providerMaxSeconds);
  return { min: toSeconds(b.min), max: toSeconds(b.max) };
}

/** Sum of a scene list, rounded to a tenth so a float sum never reads as 29.999999999999996. */
export function sumDurations(durations: number[]): number {
  return toSeconds(durations.reduce((sum, d) => sum + toTenths(d), 0));
}

/** True when the list sums to exactly 30.0s at tenth precision. */
export function isExactTotal(
  durations: number[],
  totalSeconds: number = TOTAL_DURATION_SECONDS,
): boolean {
  return durations.reduce((sum, d) => sum + toTenths(d), 0) === toTenths(totalSeconds);
}

/**
 * Acceptance gate for a MEASURED file duration.
 *
 * Deliberately separate from isExactTotal: that one checks our own arithmetic (which is exact),
 * this one checks a real MP4 whose container timescale cannot always express 30.000000 exactly.
 * One frame of slack at 25fps, no more.
 */
export function isAcceptableMeasuredDuration(
  measuredSeconds: number,
  totalSeconds: number = TOTAL_DURATION_SECONDS,
): boolean {
  return Math.abs(measuredSeconds - totalSeconds) <= DURATION_TOLERANCE_SECONDS;
}
