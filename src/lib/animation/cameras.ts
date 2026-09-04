/**
 * CAMERA PRESETS — the movement vocabulary offered in the workspace.
 *
 * Each preset is (a) a label the customer understands and (b) the sentence actually appended to
 * the model prompt. The sentences are written for ARCHITECTURAL footage: they describe a camera
 * moving through a static building, never a building that moves. That distinction is the single
 * most effective guard against the "warped, breathing façade" failure mode, and it is why the
 * prompt text lives here beside the label rather than being invented at each call site.
 *
 * `interior` / `exterior` mark where a preset makes sense, so the storyboard editor can grey out
 * "interior walkthrough" on an exterior scene instead of letting a user request a shot the
 * uploads cannot support.
 */

import type { CameraPresetId } from "./types";

export interface CameraPreset {
  id: CameraPresetId;
  label: string;
  /** One line of help under the label. */
  hint: string;
  /** Appended verbatim to the scene prompt. */
  promptFragment: string;
  exterior: boolean;
  interior: boolean;
  /** Suggested motion intensity 0..100 when the user picks this preset. */
  suggestedMotion: number;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: "slow-orbit",
    label: "Slow orbit",
    hint: "Camera arcs around the building at a steady radius",
    promptFragment:
      "The camera orbits slowly and smoothly around the stationary building at a constant radius " +
      "and constant height, as if on a motorised turntable track. The building itself does not " +
      "move, rotate or deform; only the camera moves.",
    exterior: true,
    interior: false,
    suggestedMotion: 35,
  },
  {
    id: "drone-reveal",
    label: "Drone reveal",
    hint: "Rises from street level to reveal the full elevation and roof",
    promptFragment:
      "A steady aerial drone shot that rises from street level and tilts gently down, revealing the " +
      "full elevation and the roof line. Flight path is smooth and level, with no roll and no " +
      "sudden acceleration.",
    exterior: true,
    interior: false,
    suggestedMotion: 45,
  },
  {
    id: "crane-up",
    label: "Crane up",
    hint: "Vertical lift up the face of the building",
    promptFragment:
      "The camera cranes vertically upward along the face of the building at a fixed distance, " +
      "holding the elevation square in frame. No lateral drift, no rotation of the structure.",
    exterior: true,
    interior: true,
    suggestedMotion: 30,
  },
  {
    id: "dolly-in",
    label: "Dolly in",
    hint: "Straight push toward the subject",
    promptFragment:
      "The camera dollies straight in toward the subject on a level track at walking pace, keeping " +
      "vertical lines vertical and horizontal lines horizontal throughout.",
    exterior: true,
    interior: true,
    suggestedMotion: 30,
  },
  {
    id: "dolly-out",
    label: "Dolly out",
    hint: "Straight pull back to reveal context",
    promptFragment:
      "The camera dollies straight backward on a level track, opening the frame to reveal the " +
      "surrounding context. Perspective stays rectilinear; the subject does not warp as it recedes.",
    exterior: true,
    interior: true,
    suggestedMotion: 30,
  },
  {
    id: "tracking-left-right",
    label: "Left-to-right tracking",
    hint: "Lateral glide across the elevation",
    promptFragment:
      "The camera tracks laterally from left to right on a level dolly, parallel to the elevation, " +
      "at a constant distance and constant speed. Parallax is consistent and the façade stays flat " +
      "and straight.",
    exterior: true,
    interior: true,
    suggestedMotion: 35,
  },
  {
    id: "entrance-approach",
    label: "Entrance approach",
    hint: "Walks up to the main door at eye height",
    promptFragment:
      "A steady eye-height approach along the entrance path toward the main door, as a visitor " +
      "would walk it. The door, porch columns and steps hold their exact position, proportion and " +
      "material as the camera closes on them.",
    exterior: true,
    interior: false,
    suggestedMotion: 40,
  },
  {
    id: "interior-walkthrough",
    label: "Interior walkthrough",
    hint: "Gimbal-smooth walk through the room",
    promptFragment:
      "A gimbal-stabilised walkthrough at eye height moving forward through the room at a calm " +
      "walking pace. Walls stay straight and parallel, the floor stays flat, and furniture keeps " +
      "its position and scale.",
    exterior: false,
    interior: true,
    suggestedMotion: 40,
  },
  {
    id: "wide-angle-room-reveal",
    label: "Wide-angle room reveal",
    hint: "Slow pan opening the whole room",
    promptFragment:
      "A slow horizontal pan from a fixed position with a wide architectural lens, opening the full " +
      "room. No barrel distortion beyond a natural wide lens, and no change to the room's layout or " +
      "openings during the pan.",
    exterior: false,
    interior: true,
    suggestedMotion: 25,
  },
  {
    id: "detail-close-up",
    label: "Detail close-up",
    hint: "Slow move across a material or feature",
    promptFragment:
      "A slow, shallow-depth close-up drifting across a material detail — joinery, stone, tile " +
      "grain or a light fitting. The material's colour and texture stay constant for the whole shot " +
      "and do not shimmer or change pattern.",
    exterior: true,
    interior: true,
    suggestedMotion: 20,
  },
  {
    id: "day-to-evening",
    label: "Day-to-evening transition",
    hint: "Light changes; the building does not",
    promptFragment:
      "The camera holds a slow, near-static composition while the light transitions from late " +
      "afternoon to evening: sky warms, interior and façade lights come up. ONLY the lighting " +
      "changes — geometry, materials, colours of the building surfaces and every opening stay " +
      "exactly as they are.",
    exterior: true,
    interior: true,
    suggestedMotion: 15,
  },
  {
    id: "custom",
    label: "Custom camera instructions",
    hint: "Describe the move yourself",
    promptFragment: "",
    exterior: true,
    interior: true,
    suggestedMotion: 30,
  },
];

const BY_ID = new Map<CameraPresetId, CameraPreset>(CAMERA_PRESETS.map((p) => [p.id, p]));

export function getCameraPreset(id: CameraPresetId): CameraPreset {
  return BY_ID.get(id) ?? BY_ID.get("custom")!;
}

/** Transition labels + the prompt fragment used when a transition is described to the model. */
export const TRANSITIONS: { id: import("./types").TransitionId; label: string; hint: string }[] = [
  { id: "cut", label: "Cut", hint: "Hard cut — no blend" },
  { id: "cross-dissolve", label: "Cross dissolve", hint: "Soft blend between shots" },
  { id: "dip-to-white", label: "Dip to white", hint: "Brief white flash between shots" },
  { id: "match-cut", label: "Match cut", hint: "Cut on a matching shape or line" },
  { id: "whip-pan", label: "Whip pan", hint: "Fast pan used as the join" },
];
