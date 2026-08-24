/**
 * POST /api/animation-studio/projects/[id]/duplicate
 *
 * Copy a project so a variation can be explored without losing the original — the "Duplicate
 * project" control in the brief.
 *
 * WHAT IS COPIED: title, settings, corrected building features, every uploaded image (the FILES
 * are copied, not referenced, so deleting the original cannot empty the copy), and the whole
 * storyboard with its prompts, cameras, keyframes and durations.
 *
 * WHAT IS NOT: rendered clips, exports, render jobs, version history, comments, approval status
 * and the share link. A duplicate is a fresh starting point, and carrying a rendered clip into it
 * would make the copy claim work it has not done. The storyboard still totals exactly 30 seconds,
 * because the durations come across unchanged.
 */

import { NextResponse } from "next/server";

import {
  enforceRateLimit,
  jsonError,
  readJson,
  requireOwnedProject,
  withSession,
} from "@/lib/animation/server/context";
import { getObject, putObject, sceneToRow } from "@/lib/animation/server/repo";
import { clampText } from "@/lib/animation/validation";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  const limited = await enforceRateLimit(
    ctx,
    "project-duplicate",
    10,
    3600,
    "You have duplicated projects several times in the last hour. Please wait a few minutes.",
  );
  if (limited) return limited;

  const body = await readJson<{ title?: string }>(request);
  const title =
    clampText(body?.title ?? "", 200).trim() || `${loaded.project.title} (copy)`.slice(0, 200);

  const { data: created, error } = await ctx.admin
    .from("animation_projects")
    .insert({
      title,
      owner_session: ctx.ownerSession,
      owner_id: ctx.userId,
      status: loaded.project.scenes.length > 0 ? "storyboard_ready" : "draft",
      features: loaded.project.features,
      settings: loaded.project.settings,
    })
    .select("id, public_id")
    .single();

  if (error || !created) {
    console.error("[animation-studio] duplicate insert failed:", error?.message);
    return withSession(jsonError("Could not duplicate the project.", 500), ctx);
  }

  // Copy the FILES. A duplicate that pointed at the original's objects would break the moment the
  // original was deleted — and "delete my uploads" must actually delete them.
  const assetIdMap = new Map<string, string>();
  for (const asset of loaded.project.assets) {
    const bytes = await getObject(ctx.admin, asset.storagePath);
    if (!bytes) continue;
    const ext = asset.storagePath.split(".").pop() ?? "bin";
    const path = `projects/${created.public_id}/assets/${asset.role}-${asset.checksum.slice(0, 12)}.${ext}`;
    const stored = await putObject(ctx.admin, path, bytes, asset.mimeType);
    if (!stored) continue;

    const { data: newAsset } = await ctx.admin
      .from("animation_assets")
      .insert({
        project_id: created.id,
        role: asset.role,
        storage_path: path,
        mime_type: asset.mimeType,
        byte_size: asset.byteSize,
        width: asset.width,
        height: asset.height,
        checksum: asset.checksum,
        original_name: asset.originalName,
      })
      .select("id")
      .single();
    if (newAsset) assetIdMap.set(asset.id, newAsset.id);
  }

  if (loaded.project.scenes.length > 0) {
    const rows = loaded.project.scenes.map((scene) =>
      sceneToRow(created.id, {
        ...scene,
        // Clips do not come across — this copy has rendered nothing yet.
        status: "draft",
        clipPath: null,
        clipDurationSeconds: null,
        startAssetId: scene.startAssetId ? (assetIdMap.get(scene.startAssetId) ?? null) : null,
        endAssetId: scene.endAssetId ? (assetIdMap.get(scene.endAssetId) ?? null) : null,
      }),
    );
    const { error: sceneErr } = await ctx.admin.from("animation_scenes").insert(rows);
    if (sceneErr) console.error("[animation-studio] duplicate scenes failed:", sceneErr.message);
  }

  return withSession(NextResponse.json({ publicId: created.public_id, title }, { status: 201 }), ctx);
}
