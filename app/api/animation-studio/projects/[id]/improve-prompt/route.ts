/**
 * POST /api/animation-studio/projects/[id]/improve-prompt
 *
 * "Improve prompt" for one scene. Returns the improved text WITHOUT saving it — the visitor sees
 * the suggestion beside their own words and chooses. Silently rewriting what someone typed is how
 * a tool loses their trust.
 *
 * Two implementations, and the response says which ran:
 *   • a text model, when one is configured (BUILDING_ANALYSIS_API_KEY / GEMINI_API_KEY);
 *   • otherwise the deterministic local pass in src/lib/animation/prompts.ts, which adds the
 *     specific geometry-lock clauses architectural prompts routinely miss.
 *
 * The local pass is a genuine improvement, not a placeholder: it is the same set of constraints a
 * model is being asked to add, applied by rule instead of by inference.
 */

import { NextResponse } from "next/server";

import { readAnalysisEnv } from "@/lib/animation/env";
import { featuresPromptBlock } from "@/lib/animation/features";
import { improvePromptLocally } from "@/lib/animation/prompts";
import { arr, get, path, str } from "@/lib/animation/json";
import { scrubProviderError } from "@/lib/animation/providers/types";
import {
  enforceRateLimit,
  jsonError,
  readJson,
  requireOwnedProject,
  withSession,
} from "@/lib/animation/server/context";
import { clampText, screenText } from "@/lib/animation/validation";

export const runtime = "nodejs";
export const maxDuration = 45;
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  const limited = await enforceRateLimit(
    ctx,
    "improve-prompt",
    60,
    3600,
    "That is a lot of prompt rewrites in one hour. Please wait a few minutes.",
  );
  if (limited) return limited;

  const body = await readJson<{ sceneId?: string; prompt?: string }>(request);
  const scene = loaded.project.scenes.find((s) => s.id === body?.sceneId);
  const source = clampText(body?.prompt ?? scene?.prompt ?? "", 6000).trim();
  if (!source) return withSession(jsonError("Write a prompt first, then improve it.", 400), ctx);

  const screened = screenText(source);
  if (!screened.ok) return withSession(jsonError(screened.reason!, 400), ctx);

  const local = improvePromptLocally(source, loaded.project.features);
  const env = readAnalysisEnv();
  if (!env) {
    return withSession(
      NextResponse.json({
        improved: local,
        source: "rules",
        notice:
          "Improved using this tool's built-in architectural prompt rules. No text model is " +
          "configured on this server, so nothing was sent anywhere.",
      }),
      ctx,
    );
  }

  const instruction =
    "Rewrite this shot description for a video-generation model producing an architectural " +
    "walkthrough. Keep the author's intent and every specific they named. Make the camera move, " +
    "the light and the materials explicit. Add the constraints that stop the model altering the " +
    "building. Do NOT add any feature the author did not mention. Return ONLY the rewritten " +
    "prompt as plain text, under 180 words.\n\n" +
    `${featuresPromptBlock(loaded.project.features)}\n\nAUTHOR'S PROMPT:\n${source}`;

  try {
    const res = await fetch(`${env.baseUrl}/models/${encodeURIComponent(env.model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": env.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: instruction }] }],
        generationConfig: { temperature: 0.4 },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: unknown = await res.json();
    const candidate = arr(get(json, "candidates"))[0];
    const text = arr(path(candidate, "content", "parts"))
      .map((part) => str(get(part, "text")) ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("empty response");

    return withSession(
      NextResponse.json({
        improved: clampText(text, 6000),
        source: "model",
        notice: "Rewritten by the configured text model, with your locked building features included.",
      }),
      ctx,
    );
  } catch (err) {
    // A failed rewrite must not block the visitor — fall back to the rules pass and say so.
    console.error("[animation-studio] prompt improvement failed:", scrubProviderError(err));
    return withSession(
      NextResponse.json({
        improved: local,
        source: "rules",
        notice:
          "The text model could not be reached, so this was improved using the built-in " +
          "architectural prompt rules instead.",
      }),
      ctx,
    );
  }
}
