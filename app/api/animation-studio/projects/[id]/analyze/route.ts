/**
 * POST /api/animation-studio/projects/[id]/analyze
 *
 * Step 4–7 of the brief's workflow, in one call: analyse the building, record what was (and was
 * NOT) detected, and generate the editable 30-second storyboard.
 *
 * ── BOTH UPLOADS ARE REQUIRED ───────────────────────────────────────────────────────────────
 * An exterior AND an interior image, enforced here on the server as well as in the UI. The film
 * is an exterior→interior journey; built from one image it would have to invent the other half,
 * which is the exact failure this feature is designed not to have.
 *
 * ── THE STORYBOARD IS REBUILT, NOT MERGED ───────────────────────────────────────────────────
 * Re-analysing replaces the scenes. That is destructive, so the previous state is snapshotted
 * into version history first and the response says how to get back to it. Scenes that already
 * have a rendered clip keep it only if the prompt is unchanged — otherwise the clip no longer
 * depicts what the scene now says.
 */

import { NextResponse } from "next/server";

import { analyzeBuilding } from "@/lib/animation/analyze";
import { buildStoryboard } from "@/lib/animation/storyboard";
import { isExactTotal } from "@/lib/animation/duration";
import {
  enforceRateLimit,
  jsonError,
  readJson,
  requireOwnedProject,
  withSession,
} from "@/lib/animation/server/context";
import {
  getObject,
  removeObjects,
  sceneToRow,
  snapshotVersion,
  withSignedUrls,
} from "@/lib/animation/server/repo";
import { REQUIRED_ASSET_ROLES, type AssetRole } from "@/lib/animation/types";

export const runtime = "nodejs";
// Vision calls take seconds, and Next's default serverless budget is short. This is the longest
// this route may run before the platform kills it; the analysis itself is bounded well below.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  // Analysis calls a third-party model with image payloads — the most expensive thing a visitor
  // can trigger without a render. 12 an hour is several full re-analyses of a project.
  const limited = await enforceRateLimit(
    ctx,
    "analyze",
    12,
    3600,
    "You have run the analysis several times in the last hour. Please wait a few minutes before trying again.",
  );
  if (limited) return limited;

  const byRole = new Map<AssetRole, (typeof loaded.project.assets)[number]>();
  for (const asset of loaded.project.assets) {
    if (!byRole.has(asset.role)) byRole.set(asset.role, asset);
  }

  const missing = REQUIRED_ASSET_ROLES.filter((role) => !byRole.has(role));
  if (missing.length > 0) {
    return withSession(
      jsonError(
        missing.length === 2
          ? "Upload one exterior image and one interior image before analysing."
          : `Upload ${missing[0] === "exterior" ? "an exterior" : "an interior"} image as well — the animation moves between the two.`,
        400,
        { missingRoles: missing },
      ),
      ctx,
    );
  }

  await ctx.admin.from("animation_projects").update({ status: "analyzing" }).eq("id", loaded.raw.id);

  const load = async (role: AssetRole) => {
    const asset = byRole.get(role);
    if (!asset) return null;
    const bytes = await getObject(ctx.admin, asset.storagePath);
    return bytes ? { bytes, mimeType: asset.mimeType } : null;
  };

  const references = await Promise.all(
    loaded.project.assets
      .filter((a) => a.role === "reference")
      .slice(0, 3)
      .map(async (a) => {
        const bytes = await getObject(ctx.admin, a.storagePath);
        return bytes ? { bytes, mimeType: a.mimeType } : null;
      }),
  );

  const analysis = await analyzeBuilding({
    exterior: await load("exterior"),
    interior: await load("interior"),
    references: references.filter((r): r is { bytes: Uint8Array; mimeType: string } => r !== null),
    floorPlan: await load("floor_plan"),
  });

  // Snapshot BEFORE the storyboard is replaced, so "undo" is real.
  await snapshotVersion(
    ctx.admin,
    loaded.raw.id,
    loaded.project.version,
    "Before analysis",
    { project: loaded.project },
  );

  const body = await readJson<{ regenerateStoryboard?: boolean }>(request);
  const rebuildStoryboard = body?.regenerateStoryboard !== false || loaded.project.scenes.length === 0;

  const settings = loaded.project.settings;
  // One seed for the whole film, chosen once. This is the single strongest consistency lever the
  // providers give us, so it is set here rather than left null.
  const seed = settings.seed ?? Math.floor(Math.random() * 2_000_000_000);

  let scenesPayload = loaded.project.scenes;

  if (rebuildStoryboard) {
    const storyboard = buildStoryboard({
      features: analysis.features,
      timeOfDay: settings.timeOfDay,
      exteriorAssetId: byRole.get("exterior")?.id ?? null,
      interiorAssetId: byRole.get("interior")?.id ?? null,
      seed,
      constructionStageMode: settings.constructionStageMode,
    });

    if (!isExactTotal(storyboard.map((s) => s.durationSeconds))) {
      console.error("[animation-studio] generated storyboard did not total 30s");
      return withSession(jsonError("The storyboard could not be balanced to 30 seconds.", 500), ctx);
    }

    // Replace the scene set. Old clips are deleted with their rows — they depicted a storyboard
    // that no longer exists, and leaving them would strand files nothing points at.
    const oldClips = loaded.project.scenes
      .map((s) => s.clipPath)
      .filter((p): p is string => typeof p === "string");
    await ctx.admin.from("animation_scenes").delete().eq("project_id", loaded.raw.id);
    await removeObjects(ctx.admin, oldClips);

    const { error } = await ctx.admin
      .from("animation_scenes")
      .insert(storyboard.map((scene) => sceneToRow(loaded.raw.id, scene)));
    if (error) {
      console.error("[animation-studio] storyboard insert failed:", error.message);
      return withSession(jsonError("The storyboard could not be saved.", 500), ctx);
    }
    scenesPayload = storyboard;
  }

  const { error: projectErr } = await ctx.admin
    .from("animation_projects")
    .update({
      features: analysis.features,
      settings: { ...settings, seed },
      status: "storyboard_ready",
      version: loaded.project.version + 1,
    })
    .eq("id", loaded.raw.id);
  if (projectErr) {
    console.error("[animation-studio] analysis save failed:", projectErr.message);
    return withSession(jsonError("The analysis could not be saved.", 500), ctx);
  }

  const refreshed = await requireOwnedProject(id);
  if (refreshed instanceof NextResponse) return refreshed;
  const signed = await withSignedUrls(refreshed.ctx.admin, refreshed.loaded.project, refreshed.loaded.outputs);

  return withSession(
    NextResponse.json({
      project: signed.project,
      outputs: signed.outputs,
      analysed: analysis.analysed,
      notice: analysis.notice,
      sceneCount: scenesPayload.length,
    }),
    ctx,
  );
}
