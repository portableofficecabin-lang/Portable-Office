/**
 * ANIMATION STUDIO REGRESSION TEST — the exact-30-second guarantee and the safety gates.
 *
 * Run with:  npx tsx scripts/animation-studio.test.ts   (npm run animation:test)
 *
 * These are the properties that must never regress, because each one is either an acceptance
 * criterion or a claim made to a customer on the page:
 *
 *   1. EXACT 30 SECONDS. Whatever a visitor does to the timeline — drag one scene to its maximum,
 *      collapse another to its minimum, lock scenes, reorder them, delete them — the durations
 *      that reach the renderer sum to exactly 30.0s. Tested by brute force over hundreds of
 *      generated timelines, not by one happy path.
 *   2. LOCKS ARE HONOURED, AND WHEN THEY CANNOT BE, THE RELEASE IS REPORTED. Silently ignoring a
 *      lock would make the timeline lie about what it will render.
 *   3. THE DEFAULT STORYBOARD is six scenes and already totals 30s before the editor opens.
 *   4. CONTINUITY DEFAULTS TO FALSE. Scene 4 must use a cinematic transition and must NOT
 *      describe a connecting space unless the uploads establish one. This is the guard against
 *      inventing hallways, and it is the easiest thing in the feature to break with a copy edit.
 *   5. THE NEGATIVE PROMPT is present on every scene and cannot be removed by clearing the
 *      user's own additions.
 *   6. FILE VALIDATION reads magic bytes, not the declared MIME type.
 *   7. THE MP4 PROBE reads a real container header, so the duration check on the exported file is
 *      a measurement rather than an assumption.
 */

import {
  isAcceptableMeasuredDuration,
  isExactTotal,
  minimumSceneCount,
  rebalanceToTotal,
  sceneDurationBounds,
  sumDurations,
} from "../src/lib/animation/duration";
import { requestDurationFor } from "../src/lib/animation/providers/types";
import { veoProvider } from "../src/lib/animation/providers/veo";
import { buildStoryboard, retimeScenes } from "../src/lib/animation/storyboard";
import { defaultBuildingFeatures, feature, featuresPromptBlock } from "../src/lib/animation/features";
import { buildNegativePrompt, buildScenePrompt, improvePromptLocally } from "../src/lib/animation/prompts";
import { sniffImage, validateImageUpload, screenText } from "../src/lib/animation/validation";
import { looksLikeMp4, readMp4Duration } from "../src/lib/animation/probe";
import {
  BASE_NEGATIVE_PROMPT,
  MAX_SCENE_SECONDS,
  MIN_SCENE_SECONDS,
  TOTAL_DURATION_SECONDS,
} from "../src/lib/animation/types";
import { defaultSettings } from "../src/lib/animation/server/repo";

let passed = 0;
let failed = 0;

function check(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${label}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

/** The REAL Veo capability record — asserted against the adapter itself, never a copy of it. */
const VEO_CAPS = veoProvider.capabilities;

/* ───────────────────────────────────────────── 1. exact 30 seconds ───────────────────── */

section("1. Every timeline rebalances to EXACTLY 30.0 seconds");

// A deterministic PRNG so a failure is reproducible — Math.random() would make a red build
// impossible to investigate.
let seed = 20260824;
const rand = (): number => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

let worstDelta = 0;
let allExact = true;
for (let trial = 0; trial < 500; trial += 1) {
  const count = 1 + Math.floor(rand() * 8); // 1..8 scenes
  const scenes = Array.from({ length: count }, () => ({
    // Deliberately absurd inputs, including out-of-range values a hand-edited row could contain.
    duration: rand() * 40 - 5,
    locked: rand() < 0.35,
  }));
  const { durations } = rebalanceToTotal(scenes);
  const total = sumDurations(durations);
  worstDelta = Math.max(worstDelta, Math.abs(total - TOTAL_DURATION_SECONDS));
  if (!isExactTotal(durations)) allExact = false;
}
check(allExact, `500 randomised timelines (1-8 scenes, ±locks) all total exactly 30.0s`);
check(worstDelta === 0, `worst deviation across 500 timelines is 0s (measured ${worstDelta})`);

/* Bounds hold for multi-scene timelines.
 *
 * The bound checked is sceneDurationBounds(count), NOT the raw MIN/MAX constants. Those constants
 * are editor guidance and are not satisfiable at every scene count — two scenes at the 12s
 * nominal maximum is 24s, which cannot be a 30-second film — so the rebalance widens them per
 * count. Asserting the raw constants here is what caught that: the old code fell through to an
 * even-split fallback and silently returned 15s scenes. */
let boundsHeld = true;
let boundsFailure = "";
for (let trial = 0; trial < 200; trial += 1) {
  const count = 2 + Math.floor(rand() * 7);
  const { durations } = rebalanceToTotal(
    Array.from({ length: count }, () => ({ duration: rand() * 30 })),
  );
  const b = sceneDurationBounds(count);
  for (const d of durations) {
    if (d < b.min - 1e-9 || d > b.max + 1e-9) {
      boundsHeld = false;
      boundsFailure = `${count} scenes produced ${d}s, outside ${b.min}-${b.max}s`;
    }
  }
}
check(boundsHeld, `every scene stays within the bounds for its scene count ${boundsFailure}`);

// For the counts the editor actually offers around the default, the nominal bounds do apply.
{
  const nominal = sceneDurationBounds(6);
  check(
    nominal.min === MIN_SCENE_SECONDS && nominal.max === MAX_SCENE_SECONDS,
    `a six-scene storyboard uses the nominal ${MIN_SCENE_SECONDS}-${MAX_SCENE_SECONDS}s bounds`,
  );
  const twoScene = sceneDurationBounds(2);
  check(
    twoScene.max >= TOTAL_DURATION_SECONDS / 2,
    `a two-scene storyboard widens its maximum to ${twoScene.max}s so 30s is reachable`,
  );
}

// A single scene legitimately becomes the whole film.
check(
  sumDurations(rebalanceToTotal([{ duration: 3 }]).durations) === TOTAL_DURATION_SECONDS,
  "a one-scene storyboard becomes a single 30s scene",
);

// Empty input must not throw or invent scenes.
check(rebalanceToTotal([]).durations.length === 0, "an empty timeline returns an empty result");

/* ───────────────────────────────────────────── 2. locks ─────────────────────────────── */

section("2. Locked durations are honoured, and forced releases are reported");

{
  // Two locked scenes at 6s each leaves 18s for the other three — reachable, so no release.
  const { durations, releasedLocks } = rebalanceToTotal([
    { duration: 6, locked: true },
    { duration: 6, locked: true },
    { duration: 4 },
    { duration: 4 },
    { duration: 4 },
  ]);
  check(durations[0] === 6 && durations[1] === 6, "reachable locks keep their exact duration");
  check(releasedLocks.length === 0, "no lock is released when the target is reachable");
  check(isExactTotal(durations), "the unlocked scenes absorb the difference to exactly 30s");
}

{
  // Six scenes locked at 2s = 12s. 18s cannot be absorbed by zero unlocked scenes, so a lock
  // MUST be released — and the caller must be told which.
  const { durations, releasedLocks } = rebalanceToTotal(
    Array.from({ length: 6 }, () => ({ duration: 2, locked: true })),
  );
  check(isExactTotal(durations), "an impossible lock set still produces exactly 30s");
  check(releasedLocks.length > 0, "the locks that had to be released are reported, not swallowed");
}

/* ───────────────────────────────────────────── 3. default storyboard ────────────────── */

section("3. The default storyboard is six scenes totalling 30s");

const features = defaultBuildingFeatures();
const storyboard = buildStoryboard({
  features,
  timeOfDay: "daylight",
  exteriorAssetId: "asset-ext",
  interiorAssetId: "asset-int",
  seed: 1234,
});

check(storyboard.length === 6, `six scenes by default (got ${storyboard.length})`);
check(
  isExactTotal(storyboard.map((s) => s.durationSeconds)),
  `they total exactly 30s (got ${sumDurations(storyboard.map((s) => s.durationSeconds))}s)`,
);
check(
  storyboard.map((s) => s.kind).join(",") ===
    "exterior-establish,exterior-orbit,entrance-approach,threshold-transition,interior-walkthrough,exterior-hero",
  "the six scenes are the briefed sequence, in order",
);
check(
  storyboard.every((s) => s.seed === 1234),
  "one seed is shared across every scene (the consistency lever)",
);
check(
  storyboard[0].startAssetId === "asset-ext" && storyboard[4].startAssetId === "asset-int",
  "exterior scenes anchor to the exterior upload and interior scenes to the interior upload",
);
check(
  storyboard[3].startAssetId === "asset-ext" && storyboard[3].endAssetId === "asset-int",
  "the threshold scene starts on the exterior frame and ends on the interior frame",
);

// Construction-stage mode is a different six, still exactly 30s.
const stageBoard = buildStoryboard({
  features,
  timeOfDay: "daylight",
  exteriorAssetId: "asset-ext",
  interiorAssetId: "asset-int",
  seed: 7,
  constructionStageMode: true,
});
check(
  stageBoard.length === 6 && isExactTotal(stageBoard.map((s) => s.durationSeconds)),
  "construction-stage mode is also six scenes totalling exactly 30s",
);
check(
  !/\b(week|month|day)s?\s+\d|\bin \d+ (weeks|months)\b/i.test(stageBoard.map((s) => s.prompt).join(" ")),
  "construction-stage prompts state no schedule (no fabricated programme)",
);

// Retiming after a reorder keeps the guarantee.
const reordered = retimeScenes([...storyboard].reverse().map((s, i) => ({ ...s, index: i })));
check(
  isExactTotal(reordered.map((s) => s.durationSeconds)),
  "reordering the storyboard still totals exactly 30s",
);

/* ────────────────────────── 3b. Veo's discrete clip ladder → an exact 30s film ───────── */

section("3b. 4/6/8-second provider clips assemble into exactly 30.000s");

/* THE QUESTION THIS SECTION ANSWERS: Veo returns clips of 4, 6 or 8 seconds and nothing else, but
 * the storyboard has scenes of 5.0s, 6.0s, 5.0s, 4.0s, 7.0s and 3.0s. How does that become a film
 * that measures exactly 30.000?
 *
 *   REQUEST  each scene at the next ladder length UP  (5.0 → 6, 3.0 → 4, 7.0 → 8)
 *   RECEIVE  a clip at least as long as the slot it has to fill — never shorter
 *   TRIM     assemble.ts passes `-t <sceneDuration>` per input, cutting the overrun away
 *   SUM      the trimmed lengths are the storyboard durations, which already total exactly 30
 *   VERIFY   ffprobe measures the output and the export is REJECTED if it is not 30s ± one frame
 *
 * Rounding UP is the load-bearing choice: a clip shorter than its slot would have to be padded,
 * and padding a walkthrough shows as a frozen frame. */

check(
  requestDurationFor(3, VEO_CAPS) === 4 &&
    requestDurationFor(4, VEO_CAPS) === 4 &&
    requestDurationFor(4.5, VEO_CAPS) === 6 &&
    requestDurationFor(5, VEO_CAPS) === 6 &&
    requestDurationFor(6, VEO_CAPS) === 6 &&
    requestDurationFor(7, VEO_CAPS) === 8 &&
    requestDurationFor(8, VEO_CAPS) === 8,
  "every scene length maps UP to the nearest Veo clip length (4/6/8)",
);
check(
  requestDurationFor(2, VEO_CAPS) === 4,
  "the shortest allowed scene (2s) still requests a real 4s clip",
);
check(
  VEO_CAPS.allowedDurationsSeconds.every((d) => requestDurationFor(d, VEO_CAPS) === d),
  "an exact ladder length asks for itself, never the next one up",
);

// Every requested clip is >= its slot: assembly only ever CUTS.
{
  const storyboardDurations = storyboard.map((s) => s.durationSeconds);
  const requested = storyboardDurations.map((d) => requestDurationFor(d, VEO_CAPS));
  check(
    requested.every((r, i) => r >= storyboardDurations[i] - 1e-9),
    `every requested clip covers its slot (${storyboardDurations.join("/")} → ${requested.join("/")})`,
  );
  check(
    requested.every((r) => VEO_CAPS.allowedDurationsSeconds.includes(r)),
    "every requested length is one Veo actually produces",
  );
  // The TRIMMED lengths are the storyboard durations — which already total exactly 30.
  check(
    isExactTotal(storyboardDurations),
    `trimming each clip back to its slot totals exactly 30.0s (requested total was ${requested.reduce((a, b) => a + b, 0)}s)`,
  );
}

// A provider cap is HARD: no scene may be longer than one clip.
{
  const capped = rebalanceToTotal(
    [{ duration: 12 }, { duration: 12 }, { duration: 12 }, { duration: 12 }, { duration: 12 }],
    TOTAL_DURATION_SECONDS,
    VEO_CAPS.maxSceneSeconds,
  );
  check(
    capped.durations.every((d) => d <= VEO_CAPS.maxSceneSeconds + 1e-9),
    `no scene exceeds the provider's ${VEO_CAPS.maxSceneSeconds}s clip cap (got ${capped.durations.join("/")})`,
  );
  check(isExactTotal(capped.durations), "and the capped timeline still totals exactly 30.0s");
}
check(
  minimumSceneCount(VEO_CAPS.maxSceneSeconds) === 4,
  "a 30s film needs at least 4 scenes on an 8s-per-clip provider",
);
check(
  sceneDurationBounds(6, TOTAL_DURATION_SECONDS, VEO_CAPS.maxSceneSeconds).max === VEO_CAPS.maxSceneSeconds,
  "the timeline slider caps at the provider's clip length, not the editor's 12s",
);
check(
  storyboard.length >= minimumSceneCount(VEO_CAPS.maxSceneSeconds),
  "the default six-scene storyboard clears that minimum",
);

// The documented Veo limits themselves — a regression here means an invalid API request.
check(
  JSON.stringify(VEO_CAPS.allowedDurationsSeconds) === "[4,6,8]",
  "Veo's documented clip ladder is 4/6/8 seconds",
);
check(
  VEO_CAPS.aspectRatios.length === 2 && !VEO_CAPS.aspectRatios.includes("1:1" as never),
  "Veo advertises 16:9 and 9:16 only — 1:1 is produced by padding at assembly",
);

/* ───────────────────────────────────────────── 4. continuity guard ──────────────────── */

section("4. Exterior→interior continuity defaults to FALSE and uses a cinematic transition");

check(
  features.continuityEstablished.value === false,
  "continuityEstablished defaults to false",
);

const thresholdDefault = storyboard[3].prompt;
check(
  /DO NOT DEPICT THE CONNECTING SPACE/i.test(thresholdDefault),
  "with continuity unestablished, scene 4 forbids depicting the connecting space",
);
check(
  /no hallway|no lobby|no staircase/i.test(thresholdDefault),
  "it names the specific structures that must not be invented",
);
check(
  !/continue forward through the main entrance door/i.test(thresholdDefault),
  "it does NOT describe walking through the door into the interior",
);

const confirmed = buildStoryboard({
  features: { ...features, continuityEstablished: feature(true, "user") },
  timeOfDay: "daylight",
  exteriorAssetId: "a",
  interiorAssetId: "b",
  seed: null,
});
check(
  /continue forward through the main entrance door/i.test(confirmed[3].prompt),
  "when the owner confirms continuity, scene 4 becomes a real threshold move",
);
check(
  /Do not invent a lobby, corridor or staircase/i.test(confirmed[3].prompt),
  "even then it still forbids inventing a corridor between the two references",
);

/* ───────────────────────────────────────────── 5. negative prompt ───────────────────── */

section("5. The construction negative prompt cannot be removed");

check(buildNegativePrompt("") === BASE_NEGATIVE_PROMPT, "an empty addition leaves the base intact");
check(buildNegativePrompt(null) === BASE_NEGATIVE_PROMPT, "a null addition leaves the base intact");
check(
  buildNegativePrompt("no birds").startsWith(BASE_NEGATIVE_PROMPT),
  "a user addition is appended, never substituted",
);

const built = buildScenePrompt(storyboard[0], features, defaultSettings());
check(built.negativePrompt === BASE_NEGATIVE_PROMPT, "every scene carries the base negative prompt");
check(
  built.prompt.includes("LOCKED BUILDING FEATURES"),
  "every scene prompt embeds the locked-features block",
);
check(
  built.prompt.includes("Do not add or remove a floor"),
  "the floor-count lock reaches the model verbatim",
);
check(
  featuresPromptBlock(features).split("\n").length === 16,
  "the locked-features block enumerates all 15 features plus its heading",
);

// Prompt improvement adds constraints and is idempotent.
const once = improvePromptLocally("A shot of the house.", features);
const twice = improvePromptLocally(once, features);
check(once.length > "A shot of the house.".length, "local prompt improvement adds constraints");
check(once === twice, "running prompt improvement twice adds nothing twice (idempotent)");

/* ───────────────────────────────────────────── 6. upload validation ─────────────────── */

section("6. Upload validation reads file signatures, not the declared type");

// A 640x480 PNG header: signature + IHDR with width/height.
const png = new Uint8Array(64);
png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
png.set([0, 0, 0, 13], 8);
png.set([0x49, 0x48, 0x44, 0x52], 12);
png.set([0, 0, 2, 128], 16); // width 640
png.set([0, 0, 1, 224], 20); // height 480

const sniffed = sniffImage(png);
check(sniffed.ok && sniffed.mime === "image/png", "a real PNG is identified from its signature");
check(sniffed.width === 640 && sniffed.height === 480, "PNG dimensions are read from the IHDR chunk");

// An executable renamed to .png and declared as image/png must still be rejected.
const fakePng = new Uint8Array(64);
fakePng.set([0x4d, 0x5a, 0x90, 0x00], 0); // "MZ" — a Windows executable
check(
  validateImageUpload(fakePng, "image/png", fakePng.length).ok === false,
  "a non-image declared as image/png is REJECTED on its bytes",
);

// Oversize is rejected before anything is stored.
check(
  validateImageUpload(png, "image/png", 40 * 1024 * 1024).ok === false,
  "a file over the size limit is rejected",
);

// Too small to be useful for a building reference.
const tinyPng = new Uint8Array(png);
tinyPng.set([0, 0, 0, 100], 16); // width 100
tinyPng.set([0, 0, 0, 100], 20); // height 100
check(
  validateImageUpload(tinyPng, "image/png", tinyPng.length).ok === false,
  "an image below the minimum dimension is rejected with a reason",
);

check(validateImageUpload(png, "image/png", png.length).ok, "a valid PNG passes the whole gate");
check(validateImageUpload(new Uint8Array(0), "image/png", 0).ok === false, "an empty file is rejected");

check(screenText("A modern villa exterior").ok, "ordinary construction text passes the screen");
check(screenText("nude figures in the hall").ok === false, "prohibited text is refused with a reason");

/* ───────────────────────────────────────────── 7. MP4 probe ─────────────────────────── */

section("7. The MP4 probe measures a real container header");

/** Minimal ftyp + moov>mvhd MP4 whose movie header declares `seconds` at timescale 1000. */
function makeMp4(seconds: number): Uint8Array {
  const timescale = 1000;
  const duration = Math.round(seconds * timescale);

  const mvhd = new Uint8Array(108);
  const mvhdView = new DataView(mvhd.buffer);
  mvhdView.setUint32(0, 108);
  mvhd.set([0x6d, 0x76, 0x68, 0x64], 4); // "mvhd"
  mvhdView.setUint32(8, 0); // version 0 + flags
  mvhdView.setUint32(12, 0); // creation time
  mvhdView.setUint32(16, 0); // modification time
  mvhdView.setUint32(20, timescale);
  mvhdView.setUint32(24, duration);

  const moov = new Uint8Array(8 + mvhd.length);
  new DataView(moov.buffer).setUint32(0, moov.length);
  moov.set([0x6d, 0x6f, 0x6f, 0x76], 4); // "moov"
  moov.set(mvhd, 8);

  const ftyp = new Uint8Array(16);
  new DataView(ftyp.buffer).setUint32(0, 16);
  ftyp.set([0x66, 0x74, 0x79, 0x70], 4); // "ftyp"
  ftyp.set([0x69, 0x73, 0x6f, 0x6d], 8); // "isom"
  ftyp.set([0, 0, 2, 0], 12);

  const out = new Uint8Array(ftyp.length + moov.length);
  out.set(ftyp, 0);
  out.set(moov, ftyp.length);
  return out;
}

const exact = makeMp4(30);
check(looksLikeMp4(exact), "a well-formed MP4 is recognised");
check(readMp4Duration(exact) === 30, "the container reader measures 30.000s exactly");
check(
  isAcceptableMeasuredDuration(readMp4Duration(exact)!),
  "a 30.000s file passes the acceptance gate",
);
check(
  isAcceptableMeasuredDuration(readMp4Duration(makeMp4(30.02))!),
  "30.02s is inside the one-frame tolerance",
);
check(
  isAcceptableMeasuredDuration(readMp4Duration(makeMp4(30.2))!) === false,
  "30.2s is REJECTED — the export is not published",
);
check(
  isAcceptableMeasuredDuration(readMp4Duration(makeMp4(28))!) === false,
  "a 28s file is REJECTED",
);
check(
  looksLikeMp4(new Uint8Array([0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45, 0x20, 0x68, 0x74])) === false,
  "an HTML error page returned by a provider is not mistaken for a video",
);
check(readMp4Duration(new Uint8Array(64)) === null, "an unreadable file measures null, never a number");

/* ───────────────────────────────────────────── report ──────────────────────────────── */

console.log(`\nanimation-studio.test.ts — ${passed} passed, ${failed} failed`);
if (failed) {
  console.log(
    "\nANIMATION STUDIO REGRESSED. The exact-30-second export guarantee, the geometry lock or\n" +
      "the upload safety gate is broken — all three are stated to customers on the page.",
  );
  process.exit(1);
}
