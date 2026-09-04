/**
 * LOCKED BUILDING FEATURES — the editable record of what the uploads show.
 *
 * ── THE HONESTY RULE ────────────────────────────────────────────────────────────────────────
 * Every field carries a `confidence`. When no vision model is configured (or the call fails)
 * the analyser fills these from image geometry and safe architectural defaults and marks them
 * `unverified`, and the panel tells the user in as many words that nothing was detected and the
 * values are placeholders they must correct. We do not print "G+2 detected" unless a model
 * actually said so.
 *
 * That matters commercially as well as ethically: these values are pasted verbatim into the
 * generation prompt, so an invented "three floors" would produce a video of a building the
 * customer is not buying.
 */

import type { BuildingFeatures, FeatureConfidence, LockedFeature } from "./types";

export function feature<T>(
  value: T,
  confidence: FeatureConfidence = "unverified",
  note?: string,
): LockedFeature<T> {
  return note ? { value, confidence, note } : { value, confidence };
}

/**
 * The starting panel before anything is analysed.
 *
 * Values are deliberately GENERIC and phrased as "as shown in the uploaded reference" wherever a
 * specific claim would be a guess. That phrasing is also the strongest prompt instruction we
 * have: it tells the model to copy the reference rather than to invent from the words.
 */
export function defaultBuildingFeatures(): BuildingFeatures {
  return {
    floors: feature(2, "unverified", "Ground plus one, as a starting assumption — please correct."),
    roofShape: feature("As shown in the uploaded exterior reference", "unverified"),
    facade: feature("As shown in the uploaded exterior reference", "unverified"),
    exteriorColours: feature("Exactly the colours in the uploaded exterior reference", "unverified"),
    windows: feature("Same number, size and position as the uploaded exterior reference", "unverified"),
    doors: feature("Same number, size and position as the uploaded exterior reference", "unverified"),
    balconies: feature("Same number and position as the uploaded exterior reference", "unverified"),
    proportions: feature("Same overall proportions and floor heights as the reference", "unverified"),
    interiorLayout: feature("As shown in the uploaded interior reference", "unverified"),
    flooring: feature("Exactly the flooring in the uploaded interior reference", "unverified"),
    ceiling: feature("Exactly the ceiling treatment in the uploaded interior reference", "unverified"),
    wallFinish: feature("Exactly the wall finishes in the uploaded interior reference", "unverified"),
    furnitureStyle: feature("Exactly the furniture in the uploaded interior reference", "unverified"),
    lightingStyle: feature("Same lighting character as the uploaded references", "unverified"),
    materials: feature("Only the materials visible in the uploaded references", "unverified"),
    continuityEstablished: feature(
      false,
      "unverified",
      "No reliable route from the entrance to the interior shot has been established, so a " +
        "cinematic transition is used instead of an invented hallway.",
    ),
  };
}

/** Field metadata for the editable panel — label, help text and input kind, in display order. */
export const FEATURE_FIELDS: {
  key: keyof BuildingFeatures;
  label: string;
  help: string;
  kind: "number" | "text" | "boolean";
}[] = [
  { key: "floors", label: "Number of floors", help: "Ground counts as one. G+1 = 2.", kind: "number" },
  { key: "proportions", label: "Building proportions", help: "Overall massing and floor heights.", kind: "text" },
  { key: "roofShape", label: "Roof shape", help: "Flat slab, pitched, terrace with pergola…", kind: "text" },
  { key: "facade", label: "Façade design", help: "Render, stone cladding, timber louvres…", kind: "text" },
  { key: "exteriorColours", label: "Exterior colours", help: "Kept fixed for every exterior scene.", kind: "text" },
  { key: "windows", label: "Windows", help: "Count, size and position must not change.", kind: "text" },
  { key: "doors", label: "Doors", help: "Main entrance and any visible secondary doors.", kind: "text" },
  { key: "balconies", label: "Balconies", help: "Position and railing type.", kind: "text" },
  { key: "materials", label: "Construction materials", help: "Only what is visible in the references.", kind: "text" },
  { key: "interiorLayout", label: "Interior layout cues", help: "Room shape, openings, staircase position.", kind: "text" },
  { key: "flooring", label: "Flooring", help: "Terrazzo, vitrified tile, timber…", kind: "text" },
  { key: "ceiling", label: "Ceiling", help: "False ceiling, slat timber, cove lighting…", kind: "text" },
  { key: "wallFinish", label: "Wall finishes", help: "Paint, panelling, exposed concrete…", kind: "text" },
  { key: "furnitureStyle", label: "Furniture style", help: "Kept identical across interior scenes.", kind: "text" },
  { key: "lightingStyle", label: "Lighting style", help: "Warm cove, daylight, downlights…", kind: "text" },
  {
    key: "continuityEstablished",
    label: "Exterior-to-interior continuity is reliable",
    help:
      "Tick this ONLY if the entrance in the exterior image genuinely leads into the space in the " +
      "interior image. Left unticked, scene 4 uses a cinematic transition instead of inventing a " +
      "hallway, doors or rooms that the references do not show.",
    kind: "boolean",
  },
];

/**
 * Merge user corrections over the analysed panel.
 *
 * A field the user touched is stamped `user` and is never overwritten by a later re-analysis —
 * that is the whole promise of the "correct the detected details before generation" step. Only
 * untouched fields are refreshed.
 */
export function mergeFeatureEdits(
  current: BuildingFeatures,
  edits: Partial<Record<keyof BuildingFeatures, unknown>>,
): BuildingFeatures {
  const out = { ...current } as BuildingFeatures;
  for (const [key, raw] of Object.entries(edits)) {
    const field = key as keyof BuildingFeatures;
    if (!(field in out)) continue;
    if (raw === undefined || raw === null) continue;

    if (field === "floors") {
      const n = Math.round(Number(raw));
      if (!Number.isFinite(n) || n < 1 || n > 12) continue;
      out.floors = feature(n, "user");
    } else if (field === "continuityEstablished") {
      out.continuityEstablished = feature(raw === true || raw === "true", "user");
    } else {
      const text = String(raw).trim().slice(0, 400);
      if (!text) continue;
      (out[field] as LockedFeature<string>) = feature(text, "user");
    }
  }
  return out;
}

/** Reapply a re-analysis WITHOUT clobbering anything the user has corrected. */
export function applyAnalysis(
  current: BuildingFeatures,
  analysed: Partial<BuildingFeatures>,
): BuildingFeatures {
  const out = { ...current } as BuildingFeatures;
  for (const key of Object.keys(analysed) as (keyof BuildingFeatures)[]) {
    const incoming = analysed[key];
    if (!incoming) continue;
    if (current[key]?.confidence === "user") continue; // user's correction wins, always
    (out[key] as LockedFeature<unknown>) = incoming as LockedFeature<unknown>;
  }
  return out;
}

/** True when at least one field came from a real detector — drives the panel's banner copy. */
export function hasDetectedFeatures(features: BuildingFeatures): boolean {
  return Object.values(features).some((f) => f?.confidence === "detected");
}

/**
 * The features block pasted into every scene prompt.
 *
 * Written as a numbered LOCK LIST rather than prose: models follow enumerated constraints far
 * more reliably than a paragraph, and a numbered list is also what a human reviewer can check
 * the output against, item by item.
 */
export function featuresPromptBlock(features: BuildingFeatures): string {
  const lines = [
    `Floors: exactly ${features.floors.value} (ground floor counts as one). Do not add or remove a floor.`,
    `Proportions: ${features.proportions.value}.`,
    `Roof: ${features.roofShape.value}.`,
    `Facade: ${features.facade.value}.`,
    `Exterior colours: ${features.exteriorColours.value}.`,
    `Windows: ${features.windows.value}.`,
    `Doors: ${features.doors.value}.`,
    `Balconies: ${features.balconies.value}.`,
    `Materials: ${features.materials.value}.`,
    `Interior layout: ${features.interiorLayout.value}.`,
    `Flooring: ${features.flooring.value}.`,
    `Ceiling: ${features.ceiling.value}.`,
    `Wall finishes: ${features.wallFinish.value}.`,
    `Furniture: ${features.furnitureStyle.value}.`,
    `Lighting: ${features.lightingStyle.value}.`,
  ];
  return `LOCKED BUILDING FEATURES — these must be identical in every frame:\n${lines
    .map((l, i) => `${i + 1}. ${l}`)
    .join("\n")}`;
}
