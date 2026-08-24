/**
 * /api/animation-studio/projects/[id]/versions
 *
 *   GET  — the version list (undo history)
 *   POST — restore one version
 *
 * Undo in this workspace is server-side, not a client-side stack. A stack in React state is lost
 * on refresh, which is precisely when someone wants it most ("I closed the tab after deleting a
 * scene"). Every destructive route snapshots before it writes, so the history is durable.
 *
 * Restoring is itself snapshotted, so undo has a redo.
 */

import { NextResponse } from "next/server";

import { retimeScenes } from "@/lib/animation/storyboard";
import { jsonError, readJson, requireOwnedProject, withSession } from "@/lib/animation/server/context";
import {
  coerceFeatures,
  coerceSettings,
  sceneToRow,
  snapshotVersion,
  withSignedUrls,
} from "@/lib/animation/server/repo";
import type { StudioProject } from "@/lib/animation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  const { data } = await ctx.admin
    .from("animation_project_versions")
    .select("version, label, created_at")
    .eq("project_id", loaded.raw.id)
    .order("version", { ascending: false })
    .limit(30);

  return withSession(NextResponse.json({ versions: data ?? [], current: loaded.project.version }), ctx);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  const body = await readJson<{ version?: number }>(request);
  const version = Number(body?.version);
  if (!Number.isFinite(version)) return withSession(jsonError("Which version?", 400), ctx);

  const { data: row } = await ctx.admin
    .from("animation_project_versions")
    .select("snapshot, label")
    .eq("project_id", loaded.raw.id)
    .eq("version", version)
    .maybeSingle();

  const snapshot = (row?.snapshot as { project?: StudioProject } | null)?.project;
  if (!snapshot) return withSession(jsonError("That version is no longer available.", 404), ctx);

  // Snapshot the CURRENT state first, so restoring can itself be undone.
  await snapshotVersion(
    ctx.admin,
    loaded.raw.id,
    loaded.project.version,
    `Before restoring v${version}`,
    { project: loaded.project },
  );

  const restoredScenes = retimeScenes(
    (snapshot.scenes ?? []).map((s, i) => ({ ...s, index: i })),
  );

  await ctx.admin.from("animation_scenes").delete().eq("project_id", loaded.raw.id);
  if (restoredScenes.length > 0) {
    // Clip paths come back too when the objects still exist; a scene whose clip was deleted with
    // a later storyboard simply returns to `draft` and can be regenerated.
    const liveAssetIds = new Set(loaded.project.assets.map((a) => a.id));
    const rows = restoredScenes.map((scene) =>
      sceneToRow(loaded.raw.id, {
        ...scene,
        id: `scene-${scene.index + 1}`, // force insert, not update — the old rows are gone
        startAssetId: scene.startAssetId && liveAssetIds.has(scene.startAssetId) ? scene.startAssetId : null,
        endAssetId: scene.endAssetId && liveAssetIds.has(scene.endAssetId) ? scene.endAssetId : null,
      }),
    );
    const { error } = await ctx.admin.from("animation_scenes").insert(rows);
    if (error) {
      console.error("[animation-studio] version restore failed:", error.message);
      return withSession(jsonError("Could not restore that version.", 500), ctx);
    }
  }

  await ctx.admin
    .from("animation_projects")
    .update({
      title: snapshot.title ?? loaded.project.title,
      features: coerceFeatures(snapshot.features),
      settings: coerceSettings(snapshot.settings),
      version: loaded.project.version + 1,
    })
    .eq("id", loaded.raw.id);

  const refreshed = await requireOwnedProject(id);
  if (refreshed instanceof NextResponse) return refreshed;
  const signed = await withSignedUrls(refreshed.ctx.admin, refreshed.loaded.project, refreshed.loaded.outputs);

  return withSession(
    NextResponse.json({ project: signed.project, outputs: signed.outputs, restoredFrom: version }),
    ctx,
  );
}
