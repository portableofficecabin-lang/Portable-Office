/**
 * PROMPT ASSEMBLY — the single place a scene turns into the text a video model receives.
 *
 * One function, one output, used by the submit route, the regenerate route AND the "what will be
 * sent?" panel in the workspace. That matters: a preview that shows different text from what is
 * actually submitted is worse than no preview, and the only way to guarantee they match is for
 * both to call this.
 *
 * The order below is deliberate. Models weight the opening of a prompt most heavily, so the shot
 * comes first, the geometry lock second, the camera third, and the style last — and the negative
 * prompt is sent as a separate field wherever the provider has one, falling back to an appended
 * "Avoid:" clause where it does not.
 */

import { getCameraPreset } from "./cameras";
import { featuresPromptBlock } from "./features";
import { BASE_NEGATIVE_PROMPT, type BuildingFeatures, type ProjectSettings, type StudioScene } from "./types";

export interface BuiltPrompt {
  prompt: string;
  negativePrompt: string;
}

/** The complete negative prompt: the fixed construction lock plus anything the user added. */
export function buildNegativePrompt(extra: string | undefined | null): string {
  const trimmed = (extra ?? "").trim();
  return trimmed ? `${BASE_NEGATIVE_PROMPT} ${trimmed}` : BASE_NEGATIVE_PROMPT;
}

export function buildScenePrompt(
  scene: StudioScene,
  features: BuildingFeatures,
  settings: ProjectSettings,
): BuiltPrompt {
  const preset = getCameraPreset(scene.cameraPreset);
  const camera =
    scene.cameraPreset === "custom"
      ? (scene.cameraInstructions ?? "").trim()
      : [preset.promptFragment, (scene.cameraInstructions ?? "").trim()].filter(Boolean).join(" ");

  const motion = motionClause(scene.motionIntensity);
  const keyframes =
    scene.keyframes.length > 0
      ? "Timed beats within the shot:\n" +
        scene.keyframes
          .slice()
          .sort((a, b) => a.at - b.at)
          .map((k) => `- at ${Math.round(k.at * scene.durationSeconds * 10) / 10}s: ${k.instruction}`)
          .join("\n")
      : "";

  const body = (scene.improvedPrompt ?? scene.prompt).trim();

  const parts = [
    `SHOT (${scene.durationSeconds}s, ${settings.aspectRatio}): ${body}`,
    featuresPromptBlock(features),
    camera ? `CAMERA: ${camera} ${motion}` : `CAMERA: ${motion}`,
    keyframes,
    "STYLE: photoreal architectural visualisation, cinematic but restrained, natural perspective, " +
      "straight vertical and horizontal lines, no text or watermark anywhere in frame.",
  ].filter(Boolean);

  return { prompt: parts.join("\n\n"), negativePrompt: buildNegativePrompt(settings.extraNegativePrompt) };
}

function motionClause(intensity: number): string {
  const i = Math.max(0, Math.min(100, Math.round(intensity)));
  if (i <= 15) return "Camera movement is minimal — almost a locked-off frame with a slow drift.";
  if (i <= 35) return "Camera movement is slow and deliberate.";
  if (i <= 60) return "Camera movement is moderate and steady, at a comfortable walking pace.";
  if (i <= 80) return "Camera movement is brisk but stable, with no handheld shake.";
  return "Camera movement is fast and dynamic, while remaining perfectly stabilised.";
}

/**
 * AUTOMATIC PROMPT IMPROVEMENT — deterministic, no model call required.
 *
 * A model-backed rewrite is offered when a text provider is configured (see analyze.ts), but the
 * button must work on a server with nothing configured, so this is the floor: it adds the
 * specific, checkable clauses that architectural video prompts routinely miss, and it never
 * removes or contradicts what the user wrote. Idempotent — running it twice adds nothing twice.
 */
export function improvePromptLocally(prompt: string, features: BuildingFeatures): string {
  const base = prompt.trim().replace(/\s+/g, " ");
  const additions: string[] = [];

  const has = (needle: string) => base.toLowerCase().includes(needle);

  if (!has("floor") && !has("storey")) {
    additions.push(
      `The building has exactly ${features.floors.value} floors and that count does not change at any point in the shot.`,
    );
  }
  if (!has("window") && !has("opening")) {
    additions.push("Every window and door opening stays in exactly the position and size shown in the reference.");
  }
  if (!has("colour") && !has("color") && !has("material")) {
    additions.push("Surface colours and materials are constant for the whole shot and do not shift or shimmer.");
  }
  if (!has("straight") && !has("vertical")) {
    additions.push("Vertical lines stay vertical and horizontal lines stay horizontal throughout.");
  }
  if (!has("light")) {
    additions.push("Lighting is consistent from the first frame to the last, with no flicker between frames.");
  }
  if (!has("stead") && !has("smooth") && !has("stabilis")) {
    additions.push("The camera move is smooth and stabilised end to end, with no jump or reset.");
  }

  if (additions.length === 0) return base;
  return `${base} ${additions.join(" ")}`;
}

/**
 * The voice-over script the workspace offers as a starting point.
 *
 * Deliberately free of price, timeline, warranty and project-count claims — the same policy the
 * rest of this site's construction copy follows, because a narrated sentence is as much a promise
 * as a printed one. Placeholders in {braces} are the only variable parts.
 */
export function defaultVoiceoverScript(title: string): string {
  return [
    `${title || "Your home"} — a concept visualisation.`,
    "We start outside, with the elevation as it was designed: the floors, the openings and the materials you chose.",
    "Around the side, the same building from a second angle.",
    "Up the path, to the front door.",
    "And inside — the floor, the ceiling, the light and the finishes.",
    "Everything you see here is a concept visualisation, not a structural drawing.",
    "Talk to us about building it.",
  ].join("\n");
}
