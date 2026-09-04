/**
 * BUILDING ANALYSIS — reading the uploaded references into the Locked Building Features panel.
 *
 * ── TWO PATHS, AND THE PANEL SAYS WHICH ONE RAN ─────────────────────────────────────────────
 *   • A vision model is configured (BUILDING_ANALYSIS_API_KEY / GEMINI_API_KEY) → the images are
 *     actually described and every field it returns is stamped `detected`.
 *   • Nothing is configured, or the call fails → the panel is filled with reference-copying
 *     defaults stamped `unverified`, and the UI tells the visitor plainly that nothing was
 *     detected and these are placeholders to correct.
 *
 * The second path is a legitimate product state. What would NOT be legitimate is printing
 * "detected: 3 floors, flat roof, white render" from a heuristic that looked at nothing — so the
 * fallback never claims a detection, and `confidence` is the field that makes that structural
 * rather than a matter of copy discipline.
 *
 * CONTINUITY is treated with the same caution. A model is asked whether the entrance in the
 * exterior shot plausibly leads into the space in the interior shot, and the answer defaults to
 * FALSE on anything short of a clear yes — because a false positive there is exactly how the
 * generator ends up inventing a hallway.
 */

import { readAnalysisEnv } from "./env";
import { arr, get, path, str } from "./json";
import { applyAnalysis, defaultBuildingFeatures, feature } from "./features";
import { scrubProviderError } from "./providers/types";
import type { BuildingFeatures } from "./types";

export interface AnalysisInput {
  exterior: { bytes: Uint8Array; mimeType: string } | null;
  interior: { bytes: Uint8Array; mimeType: string } | null;
  references: { bytes: Uint8Array; mimeType: string }[];
  floorPlan: { bytes: Uint8Array; mimeType: string } | null;
}

export interface AnalysisResult {
  features: BuildingFeatures;
  /** True only when a vision model actually described the images. */
  analysed: boolean;
  /** Shown under the panel heading. Always accurate about what happened. */
  notice: string;
}

const SCHEMA_KEYS = [
  "floors",
  "roofShape",
  "facade",
  "exteriorColours",
  "windows",
  "doors",
  "balconies",
  "proportions",
  "interiorLayout",
  "flooring",
  "ceiling",
  "wallFinish",
  "furnitureStyle",
  "lightingStyle",
  "materials",
] as const;

const INSTRUCTION = `You are an architectural technologist reading reference images of ONE building for a
concept animation. Describe ONLY what is visible. Never guess a feature you cannot see, and never
add a feature that would make the description "nicer".

Return STRICT JSON, no markdown fence, with exactly these keys:
{
  "floors": <integer, ground counts as 1>,
  "roofShape": <string>,
  "facade": <string>,
  "exteriorColours": <string>,
  "windows": <string: count, size and position>,
  "doors": <string>,
  "balconies": <string>,
  "proportions": <string>,
  "interiorLayout": <string>,
  "flooring": <string>,
  "ceiling": <string>,
  "wallFinish": <string>,
  "furnitureStyle": <string>,
  "lightingStyle": <string>,
  "materials": <string>,
  "continuityEstablished": <boolean>,
  "continuityReason": <string, one sentence>
}

"continuityEstablished" must be TRUE only if the entrance visible in the exterior image plainly
opens into the space shown in the interior image — same floor level, same door, no unseen
corridor between them. If there is any doubt at all, return FALSE. A false TRUE causes the
generator to invent rooms that do not exist, which is the worst possible outcome here.

Each string must be short (under 30 words) and concrete. Where a detail is genuinely not visible,
write "not visible in the reference" rather than inventing one.`;

/**
 * Analyse the uploads.
 *
 * NEVER throws: analysis is a convenience step, and a failed vision call must not stop a visitor
 * reaching the storyboard. A failure returns the unverified panel with a notice saying so.
 */
export async function analyzeBuilding(input: AnalysisInput): Promise<AnalysisResult> {
  const base = defaultBuildingFeatures();
  const env = readAnalysisEnv();

  if (!env) {
    return {
      features: base,
      analysed: false,
      notice:
        "No image-analysis model is configured on this server, so nothing has been detected from your " +
        "uploads. The values below are safe starting points that tell the generator to copy your " +
        "reference images exactly — please correct anything that is wrong before you generate.",
    };
  }
  if (!input.exterior && !input.interior) {
    return { features: base, analysed: false, notice: "Upload an exterior and an interior image to analyse." };
  }

  const parts: unknown[] = [{ text: INSTRUCTION }];
  if (input.exterior) {
    parts.push({ text: "EXTERIOR reference:" }, inlineImage(input.exterior));
  }
  if (input.interior) {
    parts.push({ text: "INTERIOR reference:" }, inlineImage(input.interior));
  }
  for (const ref of input.references.slice(0, 3)) {
    parts.push({ text: "Additional reference:" }, inlineImage(ref));
  }
  if (input.floorPlan) {
    parts.push(
      { text: "FLOOR PLAN / elevation reference — use it for layout and floor count:" },
      inlineImage(input.floorPlan),
    );
  }

  try {
    const res = await fetch(
      `${env.baseUrl}/models/${encodeURIComponent(env.model)}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": env.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
        }),
      },
    );

    if (!res.ok) {
      return failed(base, `the analysis model returned HTTP ${res.status}`);
    }

    const body: unknown = await res.json();
    const text = joinTextParts(body);
    const parsed = parseJsonObject(text);
    if (!parsed) return failed(base, "the analysis model returned an unreadable response");

    return {
      features: applyAnalysis(base, toFeatures(parsed)),
      analysed: true,
      notice:
        "These details were read from your uploaded images and are locked into every scene prompt. " +
        "Check them — anything wrong here will be wrong in the video. Edit any field to correct it.",
    };
  } catch (err) {
    return failed(base, scrubProviderError(err));
  }
}

function failed(base: BuildingFeatures, why: string): AnalysisResult {
  return {
    features: base,
    analysed: false,
    notice:
      `Automatic analysis did not run (${why}), so nothing has been detected from your uploads. ` +
      "The values below tell the generator to copy your reference images exactly — please correct " +
      "anything that is wrong before you generate.",
  };
}

const inlineImage = (img: { bytes: Uint8Array; mimeType: string }) => ({
  inlineData: { mimeType: img.mimeType, data: Buffer.from(img.bytes).toString("base64") },
});

/**
 * Concatenate the text parts of a generateContent response.
 *
 * Narrowed at every step rather than optional-chained through `any`: a response whose shape has
 * changed produces an empty string here, which the caller reports as "unreadable response" — the
 * failure path — instead of silently yielding `undefined` that later reads as a valid answer.
 */
function joinTextParts(body: unknown): string {
  const candidate = arr(get(body, "candidates"))[0];
  const parts = arr(path(candidate, "content", "parts"));
  return parts.map((part) => str(get(part, "text")) ?? "").join("");
}

/** Tolerant JSON extraction — models still occasionally wrap JSON in a markdown fence. */
function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function toFeatures(raw: Record<string, unknown>): Partial<BuildingFeatures> {
  const out: Partial<BuildingFeatures> = {};

  const floors = Math.round(Number(raw.floors));
  if (Number.isFinite(floors) && floors >= 1 && floors <= 12) {
    out.floors = feature(floors, "detected");
  }

  for (const key of SCHEMA_KEYS) {
    if (key === "floors") continue;
    const value = raw[key];
    if (typeof value !== "string") continue;
    const text = value.trim().slice(0, 400);
    if (!text) continue;
    // "not visible" is a real answer, but it is not a DETECTION — keep it as inferred so the panel
    // does not claim the model saw something it explicitly said it could not see.
    const confidence = /not visible|cannot see|unclear|unknown/i.test(text) ? "inferred" : "detected";
    (out as Record<string, unknown>)[key] = feature(text, confidence);
  }

  // Continuity: TRUE only on an explicit boolean true. Anything else stays false.
  const continuity = raw.continuityEstablished === true;
  const reason = typeof raw.continuityReason === "string" ? raw.continuityReason.slice(0, 300) : undefined;
  out.continuityEstablished = feature(continuity, "detected", reason);

  return out;
}
