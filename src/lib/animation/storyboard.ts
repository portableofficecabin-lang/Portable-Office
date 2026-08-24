/**
 * THE DEFAULT 30-SECOND STORYBOARD.
 *
 * Six scenes, generated from the uploads rather than typed by the visitor, and summing to
 * exactly 30 seconds before the editor ever opens. The visitor may retitle, reorder, retime,
 * relock and reprompt every one of them; rebalanceToTotal() keeps the sum at 30 whatever they do.
 *
 * ── SCENE 4 IS THE ONE THAT MATTERS ─────────────────────────────────────────────────────────
 * The exterior→interior cut is where an image model will happily invent a hallway, a second
 * front door or a staircase that does not exist. So scene 4 has TWO forms:
 *
 *   • continuityEstablished = true  → a genuine threshold move: through the door the exterior
 *     image actually shows, into the space the interior image actually shows.
 *   • continuityEstablished = false → a professional cinematic transition (a dip through the
 *     doorway's shadow, or a match cut on a vertical line) that CROSSES the join without ever
 *     depicting the connecting space. This is the default, because two photographs of a house
 *     almost never establish a reliable route between them.
 *
 * The flag is set by the analyser, shown in the Locked Building Features panel, and editable —
 * so an owner who knows the two shots do connect can say so, and nobody else has geometry
 * invented on their behalf.
 */

import { rebalanceToTotal } from "./duration";
import { getCameraPreset } from "./cameras";
import type {
  BuildingFeatures,
  CameraPresetId,
  SceneKind,
  StudioScene,
  TimeOfDay,
  TransitionId,
} from "./types";

interface SceneBlueprint {
  kind: SceneKind;
  title: string;
  seconds: number;
  camera: CameraPresetId;
  transitionIn: TransitionId;
  /** Which uploaded role this scene is anchored to. */
  anchor: "exterior" | "interior" | "either";
  prompt: (ctx: PromptContext) => string;
}

interface PromptContext {
  features: BuildingFeatures;
  timeOfDay: TimeOfDay;
  continuity: boolean;
}

const light = (t: TimeOfDay): string =>
  t === "night"
    ? "night, with the façade and interior lighting carrying the frame"
    : t === "evening"
      ? "late evening, warm low sun and lights beginning to show"
      : "clear daylight, soft natural shadows";

const STORYBOARD: SceneBlueprint[] = [
  {
    kind: "exterior-establish",
    title: "Exterior establishing view",
    seconds: 5,
    camera: "dolly-in",
    transitionIn: "cut",
    anchor: "exterior",
    prompt: ({ features, timeOfDay }) =>
      `Establishing shot of the building shown in the exterior reference image, in ${light(timeOfDay)}. ` +
      `The full elevation is in frame from the first instant and stays square to the camera. ` +
      `Reproduce the reference exactly: ${features.floors.value} floors, the same window and door ` +
      `openings in the same positions, the same balcony arrangement, the same façade materials and ` +
      `the same colours.`,
  },
  {
    kind: "exterior-orbit",
    title: "Slow orbit around the building",
    seconds: 6,
    camera: "slow-orbit",
    transitionIn: "cross-dissolve",
    anchor: "exterior",
    prompt: ({ features, timeOfDay }) =>
      `The same building, same ${light(timeOfDay)}. The camera arcs around it so the side elevation ` +
      `comes into view. As the angle changes, every opening stays where it is and the building keeps ` +
      `its ${features.floors.value}-floor height and its proportions. Nothing is added on the sides ` +
      `that the reference does not show — where a face is not visible in the reference, keep it plain ` +
      `and consistent with the materials that are visible.`,
  },
  {
    kind: "entrance-approach",
    title: "Approach toward the entrance",
    seconds: 5,
    camera: "entrance-approach",
    transitionIn: "cut",
    anchor: "exterior",
    prompt: ({ features }) =>
      `Move along the entrance path toward the main door at eye height. The porch, steps, columns and ` +
      `the door itself hold their exact position, width and material as the camera closes on them. ` +
      `Doors: ${features.doors.value}. Do not introduce a second entrance, a gate or a porch that is ` +
      `not in the reference.`,
  },
  {
    kind: "threshold-transition",
    title: "Exterior to interior",
    seconds: 4,
    camera: "dolly-in",
    transitionIn: "cross-dissolve",
    anchor: "either",
    prompt: ({ continuity, features }) =>
      continuity
        ? `Continue forward through the main entrance door and into the space shown in the interior ` +
          `reference image. The threshold, door frame and floor level are continuous. Interior layout: ` +
          `${features.interiorLayout.value}. Do not invent a lobby, corridor or staircase between the ` +
          `two — go directly from the doorway into the referenced space.`
        : `A cinematic transition from exterior to interior. The camera pushes into the shadow of the ` +
          `open doorway until the frame goes dark, and the interior reference image resolves out of ` +
          `that darkness. DO NOT DEPICT THE CONNECTING SPACE — no hallway, no lobby, no staircase, no ` +
          `additional doors or rooms. The two references do not establish a route between them, so the ` +
          `join is made with light rather than with invented architecture.`,
  },
  {
    kind: "interior-walkthrough",
    title: "Interior walkthrough and feature details",
    seconds: 7,
    camera: "interior-walkthrough",
    transitionIn: "cut",
    anchor: "interior",
    prompt: ({ features, timeOfDay }) =>
      `Walk through the interior exactly as shown in the interior reference image, in ` +
      `${light(timeOfDay)}. Flooring: ${features.flooring.value}. Ceiling: ${features.ceiling.value}. ` +
      `Walls: ${features.wallFinish.value}. Furniture: ${features.furnitureStyle.value}. Lighting: ` +
      `${features.lightingStyle.value}. Every piece of furniture keeps its position and scale, every ` +
      `opening stays where it is, and the floor stays flat and level for the whole move.`,
  },
  {
    kind: "exterior-hero",
    title: "Final exterior hero view",
    seconds: 3,
    camera: "dolly-out",
    transitionIn: "cross-dissolve",
    anchor: "exterior",
    prompt: ({ features, timeOfDay }) =>
      `Return to the exterior for a closing hero frame in ${light(timeOfDay)}: a slow pull back to the ` +
      `full elevation, settling on a composed, symmetrical view. The building is identical to scene 1 — ` +
      `${features.floors.value} floors, the same openings, the same materials, the same colours.`,
  },
];

export interface BuildStoryboardOptions {
  features: BuildingFeatures;
  timeOfDay: TimeOfDay;
  exteriorAssetId: string | null;
  interiorAssetId: string | null;
  /** One seed across all scenes is the single biggest consistency lever available to us. */
  seed: number | null;
  /** Overrides the finished-house tour with a foundation → frame → finish sequence. */
  constructionStageMode?: boolean;
}

/**
 * Build the six-scene storyboard, already rebalanced to exactly 30 seconds.
 *
 * Ids are `scene-1`…`scene-6`. They are stable per project (the DB row keeps its own uuid); the
 * client uses these for drag-and-drop keys before the project is first saved.
 */
export function buildStoryboard(opts: BuildStoryboardOptions): StudioScene[] {
  const blueprints = opts.constructionStageMode ? constructionStageBlueprints() : STORYBOARD;
  const continuity = opts.features.continuityEstablished.value === true;
  const ctx: PromptContext = { features: opts.features, timeOfDay: opts.timeOfDay, continuity };

  const { durations } = rebalanceToTotal(blueprints.map((b) => ({ duration: b.seconds })));

  return blueprints.map((b, i) => {
    const preset = getCameraPreset(b.camera);
    const anchorAsset =
      b.anchor === "interior"
        ? opts.interiorAssetId
        : b.anchor === "exterior"
          ? opts.exteriorAssetId
          : null;

    return {
      id: `scene-${i + 1}`,
      index: i,
      title: b.title,
      kind: b.kind,
      prompt: b.prompt(ctx),
      improvedPrompt: null,
      cameraPreset: b.camera,
      cameraInstructions: null,
      motionIntensity: preset.suggestedMotion,
      transitionIn: b.transitionIn,
      durationSeconds: durations[i],
      // The threshold scene starts on the exterior and ends on the interior — that pair of
      // frames is what keeps the join honest when the provider supports end-frame conditioning.
      startAssetId: b.kind === "threshold-transition" ? opts.exteriorAssetId : anchorAsset,
      endAssetId: b.kind === "threshold-transition" ? opts.interiorAssetId : null,
      keyframes: [],
      seed: opts.seed,
      locked: false,
      status: "draft",
      clipPath: null,
      clipDurationSeconds: null,
    };
  });
}

/**
 * CONSTRUCTION-STAGE MODE — the same 30 seconds, but showing the build rather than the finished
 * house. Requested by the brief as a builder-specific mode; kept in this file so both storyboards
 * share the rebalance and the id scheme.
 *
 * It deliberately does NOT claim a schedule. Each stage is described by what is physically being
 * done, never by "week 6" or "month 3" — this codebase has no verified construction programme and
 * a fabricated one on a customer's video would become a promise.
 */
function constructionStageBlueprints(): SceneBlueprint[] {
  return [
    {
      kind: "custom",
      title: "Cleared plot and setting out",
      seconds: 4,
      camera: "drone-reveal",
      transitionIn: "cut",
      anchor: "exterior",
      prompt: () =>
        "An empty, cleared plot with the building's footprint set out in string lines and marker pegs. " +
        "Aerial rise revealing the plot boundary. No structure yet — only the ground and the setting out.",
    },
    {
      kind: "custom",
      title: "Foundation and columns",
      seconds: 5,
      camera: "crane-up",
      transitionIn: "cross-dissolve",
      anchor: "exterior",
      prompt: ({ features }) =>
        "Reinforced concrete footings cast and columns starting off them, reinforcement visible, " +
        `shuttering in place. The column grid matches the footprint of the finished building shown in ` +
        `the reference and is sized for ${features.floors.value} floors. No people and no vehicles.`,
    },
    {
      kind: "custom",
      title: "RCC frame and slabs",
      seconds: 6,
      camera: "slow-orbit",
      transitionIn: "cross-dissolve",
      anchor: "exterior",
      prompt: ({ features }) =>
        `The frame complete to ${features.floors.value} floors — columns, beams and slabs cast, still ` +
        "bare concrete. The camera orbits the skeleton. Floor heights and the position of every future " +
        "opening match the finished reference exactly.",
    },
    {
      kind: "custom",
      title: "Masonry, plaster and openings",
      seconds: 6,
      camera: "tracking-left-right",
      transitionIn: "cut",
      anchor: "exterior",
      prompt: ({ features }) =>
        "Block masonry raised between the frame and external plaster applied, with window and door " +
        `openings formed. Openings appear exactly where the finished reference shows them: ` +
        `${features.windows.value}`,
    },
    {
      kind: "custom",
      title: "Finishes and façade",
      seconds: 5,
      camera: "dolly-in",
      transitionIn: "cross-dissolve",
      anchor: "exterior",
      prompt: ({ features }) =>
        `Façade finishes going on — ${features.facade.value}. Colours resolve to ` +
        `${features.exteriorColours.value}. Joinery fitted into the openings already formed; nothing ` +
        "moves or is added.",
    },
    {
      kind: "exterior-hero",
      title: "Completed building",
      seconds: 4,
      camera: "dolly-out",
      transitionIn: "cross-dissolve",
      anchor: "exterior",
      prompt: ({ features, timeOfDay }) =>
        `The completed building, identical to the exterior reference image, in ${light(timeOfDay)}. ` +
        `${features.floors.value} floors, the same openings, the same materials and the same colours.`,
    },
  ];
}

/**
 * Re-time an existing scene list to exactly 30s, honouring locks.
 *
 * `providerMaxSeconds` is a HARD cap when supplied: Veo returns at most an 8-second clip, so a
 * rebalance that handed a scene 9 seconds would produce a storyboard that cannot be generated.
 * Passing it here is what keeps the timeline and the provider in agreement.
 */
export function retimeScenes(scenes: StudioScene[], providerMaxSeconds?: number): StudioScene[] {
  const { durations, releasedLocks } = rebalanceToTotal(
    scenes.map((s) => ({ duration: s.durationSeconds, locked: s.locked })),
    undefined,
    providerMaxSeconds,
  );
  const released = new Set(releasedLocks);
  return scenes.map((s, i) => ({
    ...s,
    durationSeconds: durations[i],
    locked: released.has(i) ? false : s.locked,
  }));
}

/** Reindex after a drag-and-drop reorder, keeping durations (which already sum to 30). */
export function reindexScenes(scenes: StudioScene[]): StudioScene[] {
  return scenes.map((s, i) => ({ ...s, index: i }));
}
