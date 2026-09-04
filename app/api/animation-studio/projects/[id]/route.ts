/**
 * /api/animation-studio/projects/[id]
 *
 *   GET    — the whole project (assets, scenes, outputs) with fresh signed URLs
 *   PATCH  — save title, settings, corrected building features and the scene list
 *   DELETE — permanently remove the project, its rows AND every file it uploaded
 *
 * ── WHY GET RETURNS EVERYTHING ──────────────────────────────────────────────────────────────
 * "Generation must continue safely if the visitor refreshes the page" is an acceptance criterion.
 * It is met by keeping ALL state in the database and rebuilding the workspace from this one call:
 * a refresh, a new tab, or the same project opened tomorrow on the same browser all resume from
 * here. Nothing that matters lives in React state.
 *
 * ── PATCH IS THE ONLY WAY SCENES CHANGE ─────────────────────────────────────────────────────
 * And it re-runs the exact-30-second rebalance server-side before writing. A client that posts
 * six scenes summing to 34s gets 30s back, because the guarantee cannot depend on the browser
 * having done its arithmetic correctly.
 */

import { NextResponse } from "next/server";

import { retimeScenes } from "@/lib/animation/storyboard";
import { resolveVideoProvider } from "@/lib/animation/providers";
import { mergeFeatureEdits } from "@/lib/animation/features";
import { isExactTotal } from "@/lib/animation/duration";
import { clampText, screenText } from "@/lib/animation/validation";
import {
  jsonError,
  readJson,
  requireOwnedProject,
  withSession,
} from "@/lib/animation/server/context";
import {
  coerceSettings,
  mapComment,
  mapJob,
  removeObjects,
  sceneToRow,
  snapshotVersion,
  withSignedUrls,
} from "@/lib/animation/server/repo";
import type { StudioScene } from "@/lib/animation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  const signed = await withSignedUrls(ctx.admin, loaded.project, loaded.outputs);
  const { data: comments } = await ctx.admin
    .from("animation_project_comments")
    .select("id, scene_id, author, body, resolved, created_at")
    .eq("project_id", loaded.raw.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const { data: versions } = await ctx.admin
    .from("animation_project_versions")
    .select("version, label, created_at")
    .eq("project_id", loaded.raw.id)
    .order("version", { ascending: false })
    .limit(30);
  const { data: jobs } = await ctx.admin
    .from("animation_render_jobs")
    .select("id, scene_id, kind, status, progress, error, attempt, provider, created_at, updated_at")
    .eq("project_id", loaded.raw.id)
    .order("created_at", { ascending: false })
    .limit(60);

  return withSession(
    NextResponse.json(
      {
        project: signed.project,
        outputs: signed.outputs,
        jobs: (jobs ?? []).map(mapJob),
        comments: (comments ?? []).map(mapComment),
        versions: versions ?? [],
      },
      { headers: { "Cache-Control": "no-store" } },
    ),
    ctx,
  );
}

interface PatchBody {
  title?: string;
  settings?: unknown;
  featureEdits?: Record<string, unknown>;
  scenes?: Partial<StudioScene>[];
  approvalStatus?: string;
  /** Label for the snapshot taken before this edit, shown in version history. */
  versionLabel?: string;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  const body = await readJson<PatchBody>(request);
  if (!body) return withSession(jsonError("Invalid request.", 400), ctx);

  // Snapshot BEFORE mutating, so undo has somewhere to go back to.
  await snapshotVersion(
    ctx.admin,
    loaded.raw.id,
    loaded.project.version,
    clampText(body.versionLabel ?? "Edit", 120) || "Edit",
    { project: loaded.project },
  );

  const update: Record<string, unknown> = { version: loaded.project.version + 1 };

  if (typeof body.title === "string") {
    const title = clampText(body.title, 200).trim();
    const screened = screenText(title);
    if (!screened.ok) return withSession(jsonError(screened.reason!, 400), ctx);
    if (title) update.title = title;
  }

  if (body.settings !== undefined) {
    const settings = coerceSettings(body.settings);
    const screened = screenText(
      `${settings.extraNegativePrompt} ${settings.audio.voiceoverScript} ${settings.branding.outroText}`,
    );
    if (!screened.ok) return withSession(jsonError(screened.reason!, 400), ctx);
    update.settings = settings;
  }

  if (body.featureEdits) {
    update.features = mergeFeatureEdits(loaded.project.features, body.featureEdits);
  }

  if (
    typeof body.approvalStatus === "string" &&
    ["not_submitted", "pending", "approved", "changes_requested"].includes(body.approvalStatus)
  ) {
    update.approval_status = body.approvalStatus;
  }

  const { error: projectErr } = await ctx.admin
    .from("animation_projects")
    .update(update)
    .eq("id", loaded.raw.id);
  if (projectErr) {
    console.error("[animation-studio] project update failed:", projectErr.message);
    return withSession(jsonError("Could not save your changes.", 500), ctx);
  }

  /* ── Scenes ──────────────────────────────────────────────────────────────────────────────
   * Sent whole, not as a diff: reordering, deleting and retiming in one drag is normal in a
   * timeline editor, and reconciling that from a patch list is where off-by-one bugs live.
   * The server re-derives index order and re-runs the 30-second rebalance regardless of what
   * the client sent. */
  if (Array.isArray(body.scenes)) {
    if (body.scenes.length === 0 || body.scenes.length > 12) {
      return withSession(jsonError("A storyboard must have between 1 and 12 scenes.", 400), ctx);
    }

    const existing = new Map(loaded.project.scenes.map((s) => [s.id, s]));
    const merged: StudioScene[] = body.scenes.map((incoming, index) => {
      const base = incoming.id ? existing.get(incoming.id) : undefined;
      const seed = base ?? blankScene(index);
      return {
        ...seed,
        index,
        title: clampText(incoming.title ?? seed.title, 200) || seed.title,
        kind: incoming.kind ?? seed.kind,
        prompt: clampText(incoming.prompt ?? seed.prompt, 6000),
        improvedPrompt:
          incoming.improvedPrompt === null
            ? null
            : incoming.improvedPrompt !== undefined
              ? clampText(incoming.improvedPrompt, 6000)
              : seed.improvedPrompt,
        cameraPreset: incoming.cameraPreset ?? seed.cameraPreset,
        cameraInstructions:
          incoming.cameraInstructions === null
            ? null
            : incoming.cameraInstructions !== undefined
              ? clampText(incoming.cameraInstructions, 2000)
              : seed.cameraInstructions,
        motionIntensity:
          typeof incoming.motionIntensity === "number" ? incoming.motionIntensity : seed.motionIntensity,
        transitionIn: incoming.transitionIn ?? seed.transitionIn,
        durationSeconds:
          typeof incoming.durationSeconds === "number" ? incoming.durationSeconds : seed.durationSeconds,
        startAssetId: incoming.startAssetId !== undefined ? incoming.startAssetId : seed.startAssetId,
        endAssetId: incoming.endAssetId !== undefined ? incoming.endAssetId : seed.endAssetId,
        keyframes: Array.isArray(incoming.keyframes) ? incoming.keyframes.slice(0, 12) : seed.keyframes,
        seed: incoming.seed !== undefined ? incoming.seed : seed.seed,
        locked: incoming.locked === true,
        // A scene whose prompt or camera changed is no longer represented by its rendered clip.
        ...(promptChanged(seed, incoming)
          ? { status: "draft" as const, clipPath: seed.clipPath, clipDurationSeconds: seed.clipDurationSeconds }
          : {}),
      };
    });

    const screened = screenText(merged.map((s) => `${s.title} ${s.prompt} ${s.cameraInstructions ?? ""}`).join(" "));
    if (!screened.ok) return withSession(jsonError(screened.reason!, 400), ctx);

    /* THE GUARANTEE. Whatever arrived, what gets stored sums to exactly 30 seconds — and no
     * scene exceeds what the configured provider can actually render in one clip (8s on Veo),
     * so a saved storyboard is always a generatable one. */
    const providerMax = resolveVideoProvider()?.capabilities.maxSceneSeconds;
    const retimed = retimeScenes(merged, providerMax);
    if (!isExactTotal(retimed.map((s) => s.durationSeconds))) {
      // Unreachable — rebalanceToTotal is exact by construction. Refusing beats storing a
      // storyboard that cannot produce a 30-second film.
      console.error("[animation-studio] rebalance did not reach 30s", retimed.map((s) => s.durationSeconds));
      return withSession(jsonError("Scene durations could not be balanced to 30 seconds.", 500), ctx);
    }

    const keptIds = new Set(retimed.map((s) => s.id).filter((x) => x && !x.startsWith("scene-")));
    const removed = loaded.project.scenes.filter((s) => !keptIds.has(s.id));

    // Delete first so a reordered index never collides with a row about to be removed.
    if (removed.length > 0) {
      await ctx.admin.from("animation_scenes").delete().in("id", removed.map((s) => s.id));
      await removeObjects(
        ctx.admin,
        removed.map((s) => s.clipPath).filter((p): p is string => typeof p === "string"),
      );
    }

    for (const scene of retimed) {
      const row = sceneToRow(loaded.raw.id, scene);
      // Ids of the form "scene-N" come from a client-side storyboard that was never persisted.
      const isPersisted = scene.id && !scene.id.startsWith("scene-");
      const { error } = isPersisted
        ? await ctx.admin.from("animation_scenes").update(row).eq("id", scene.id)
        : await ctx.admin.from("animation_scenes").insert(row);
      if (error) {
        console.error("[animation-studio] scene write failed:", error.message);
        return withSession(jsonError("Could not save the storyboard.", 500), ctx);
      }
    }
  }

  const refreshed = await requireOwnedProject(id);
  if (refreshed instanceof NextResponse) return refreshed;
  const signed = await withSignedUrls(refreshed.ctx.admin, refreshed.loaded.project, refreshed.loaded.outputs);
  return withSession(NextResponse.json({ project: signed.project, outputs: signed.outputs }), ctx);
}

function promptChanged(before: StudioScene, after: Partial<StudioScene>): boolean {
  if (after.prompt !== undefined && after.prompt !== before.prompt) return true;
  if (after.cameraPreset !== undefined && after.cameraPreset !== before.cameraPreset) return true;
  if (after.cameraInstructions !== undefined && after.cameraInstructions !== before.cameraInstructions) return true;
  return false;
}

function blankScene(index: number): StudioScene {
  return {
    id: `scene-${index + 1}`,
    index,
    title: `Scene ${index + 1}`,
    kind: "custom",
    prompt: "",
    improvedPrompt: null,
    cameraPreset: "dolly-in",
    cameraInstructions: null,
    motionIntensity: 30,
    transitionIn: "cut",
    durationSeconds: 5,
    startAssetId: null,
    endAssetId: null,
    keyframes: [],
    seed: null,
    locked: false,
    status: "draft",
    clipPath: null,
    clipDurationSeconds: null,
  };
}

/**
 * DELETE — the visitor's "delete this project and everything I uploaded" control.
 *
 * Required by the brief ("user-controlled deletion of uploaded files and projects") and by any
 * reasonable reading of privacy: someone who uploads photographs of their own house must be able
 * to take them back. Files go first, then the row — the cascade removes assets, scenes, jobs,
 * outputs, versions and comments. If the storage delete fails the row is KEPT, so the visitor can
 * retry rather than being told the files are gone while they are not.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  const paths = [
    ...loaded.project.assets.map((a) => a.storagePath),
    ...loaded.project.scenes.map((s) => s.clipPath),
    ...loaded.outputs.map((o) => o.storagePath),
  ].filter((p): p is string => typeof p === "string" && p.length > 0);

  await removeObjects(ctx.admin, paths);

  const { error } = await ctx.admin.from("animation_projects").delete().eq("id", loaded.raw.id);
  if (error) {
    console.error("[animation-studio] project delete failed:", error.message);
    return withSession(jsonError("Could not delete the project. Please try again.", 500), ctx);
  }

  return withSession(NextResponse.json({ deleted: true, filesRemoved: paths.length }), ctx);
}
