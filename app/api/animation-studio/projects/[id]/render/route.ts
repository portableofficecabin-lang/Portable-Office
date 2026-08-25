/**
 * /api/animation-studio/projects/[id]/render
 *
 *   POST   — submit scenes for generation (all of them, or a named subset for "regenerate one")
 *   GET    — advance every in-flight job and return genuine live status
 *   DELETE — cancel a job
 *
 * ── REGENERATING ONE SCENE REGENERATES ONE SCENE ────────────────────────────────────────────
 * `sceneIds` is honoured exactly. Passing one id submits one render; the other five scenes keep
 * their existing clips untouched. That is an explicit acceptance criterion, and it is enforced
 * here by the fact that nothing in this route ever iterates the whole scene list unless the
 * caller asked for it.
 *
 * ── GET IS THE PROGRESS ENGINE ──────────────────────────────────────────────────────────────
 * There is no background worker. The workspace polls this endpoint, and each call advances the
 * jobs by asking the provider where they are. That means progress is REAL — it is the provider's
 * own state, not a timer animating a bar — and it survives a refresh, because the state lives in
 * the database rather than in the tab that started it.
 */

import { NextResponse } from "next/server";

import { isAssemblyAvailable } from "@/lib/animation/assemble";
import { missingVideoEnv, providerMisconfiguredMessage } from "@/lib/animation/env";
import { resolveVideoProvider } from "@/lib/animation/providers";
import {
  enforceRateLimit,
  jsonError,
  readJson,
  requireOwnedProject,
  withSession,
} from "@/lib/animation/server/context";
import { advanceJobs, cancelJob, MAX_ATTEMPTS, submitScene, syncProjectStatus } from "@/lib/animation/server/render";
import { mapJob, withSignedUrls } from "@/lib/animation/server/repo";
import { REQUIRED_ASSET_ROLES, TOTAL_DURATION_SECONDS } from "@/lib/animation/types";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

interface RenderBody {
  /** Omit to submit every scene that is not already completed. */
  sceneIds?: string[];
  /** Set by the Retry button — increments the attempt so a new idempotency key is generated. */
  retry?: boolean;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  const provider = resolveVideoProvider();
  if (!provider) {
    const missing = missingVideoEnv();
    // 503, not 500: the server is working correctly, it simply has no provider to talk to. The
    // workspace renders this as the "Video provider configuration required" state.
    return withSession(
      jsonError(providerMisconfiguredMessage(missing), 503, { providerConfigured: false, missingEnv: missing }),
      ctx,
    );
  }

  const roles = loaded.project.assets.map((a) => a.role);
  const missingRoles = REQUIRED_ASSET_ROLES.filter((r) => !roles.includes(r));
  if (missingRoles.length > 0) {
    return withSession(
      jsonError("Upload both an exterior and an interior image before generating.", 400, { missingRoles }),
      ctx,
    );
  }
  if (loaded.project.scenes.length === 0) {
    return withSession(jsonError("Analyse your images to build a storyboard first.", 400), ctx);
  }

  // Renders cost real money at the provider. Six scenes per submission, ten submissions an hour.
  const limited = await enforceRateLimit(
    ctx,
    "render-submit",
    10,
    3600,
    "You have started several renders in the last hour. Please wait a few minutes before starting another.",
  );
  if (limited) return limited;

  const body = await readJson<RenderBody>(request);
  const requested = Array.isArray(body?.sceneIds) ? new Set(body!.sceneIds) : null;

  const targets = loaded.project.scenes.filter((scene) => {
    if (requested) return requested.has(scene.id);
    // No explicit list: everything that does not already have a usable clip.
    return scene.status !== "completed" || !scene.clipPath;
  });

  if (targets.length === 0) {
    return withSession(
      NextResponse.json({ submitted: 0, reused: 0, failed: [], message: "Every scene is already rendered." }),
      ctx,
    );
  }

  // Attempt number drives the idempotency key: a retry must produce a NEW key or it would just
  // return the failed job again.
  const attemptFor = async (sceneId: string): Promise<number> => {
    if (!body?.retry) return 1;
    const { data } = await ctx.admin
      .from("animation_render_jobs")
      .select("attempt")
      .eq("scene_id", sceneId)
      .order("attempt", { ascending: false })
      .limit(1);
    return Math.min(MAX_ATTEMPTS, (data?.[0]?.attempt ?? 0) + 1);
  };

  const origin = new URL(request.url).origin;
  const webhookUrl = `${origin}/api/animation-studio/webhooks/${provider.id}`;

  const failed: { sceneId: string; error: string }[] = [];
  let submitted = 0;
  let reused = 0;

  for (const scene of targets) {
    const attempt = await attemptFor(scene.id);
    if (attempt > MAX_ATTEMPTS) {
      failed.push({ sceneId: scene.id, error: "This scene has used all its retries. Edit the prompt and try again." });
      continue;
    }
    const outcome = await submitScene(
      ctx.admin,
      loaded,
      scene,
      loaded.project.features,
      loaded.project.settings,
      webhookUrl,
      attempt,
    );
    if (outcome.ok) {
      if (outcome.reused) reused += 1;
      else submitted += 1;
    } else {
      failed.push({ sceneId: scene.id, error: outcome.error });
    }
  }

  await syncProjectStatus(ctx.admin, loaded.raw.id);

  const refreshed = await requireOwnedProject(id);
  if (refreshed instanceof NextResponse) return refreshed;
  const signed = await withSignedUrls(refreshed.ctx.admin, refreshed.loaded.project, refreshed.loaded.outputs);

  return withSession(
    NextResponse.json({
      submitted,
      reused,
      failed,
      project: signed.project,
      outputs: signed.outputs,
      // Surfaced now so the visitor learns about a missing ffmpeg BEFORE spending renders, not
      // after all six scenes have finished.
      assemblyAvailable: await isAssemblyAvailable(),
    }),
    ctx,
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  const advance = await advanceJobs(ctx.admin, loaded);

  const refreshed = await requireOwnedProject(id);
  if (refreshed instanceof NextResponse) return refreshed;
  const signed = await withSignedUrls(refreshed.ctx.admin, refreshed.loaded.project, refreshed.loaded.outputs);

  const { data: jobs } = await ctx.admin
    .from("animation_render_jobs")
    .select("id, scene_id, kind, status, progress, error, attempt, provider, created_at, updated_at")
    .eq("project_id", loaded.raw.id)
    .order("created_at", { ascending: false })
    .limit(60);

  const scenes = signed.project.scenes;
  const rendered = scenes.filter((s) => s.status === "completed" && s.clipPath).length;

  return withSession(
    NextResponse.json(
      {
        project: signed.project,
        outputs: signed.outputs,
        jobs: (jobs ?? []).map(mapJob),
        advance,
        readyToAssemble: scenes.length > 0 && rendered === scenes.length,
        renderedScenes: rendered,
        totalScenes: scenes.length,
        totalDurationSeconds: TOTAL_DURATION_SECONDS,
      },
      { headers: { "Cache-Control": "no-store" } },
    ),
    ctx,
  );
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) return withSession(jsonError("Which job should be cancelled?", 400), ctx);

  // Confirm the job belongs to THIS project before cancelling it — a job id from another
  // visitor's project must not be cancellable by anyone who guesses it.
  const { data: job } = await ctx.admin
    .from("animation_render_jobs")
    .select("id")
    .eq("id", jobId)
    .eq("project_id", loaded.raw.id)
    .maybeSingle();
  if (!job) return withSession(jsonError("That render job is not part of this project.", 404), ctx);

  const result = await cancelJob(ctx.admin, jobId);
  return withSession(
    NextResponse.json({
      cancelled: true,
      providerCancelled: result.providerCancelled,
      message: result.providerCancelled
        ? "The render was cancelled at the provider."
        : "Cancelled here. This provider cannot stop a running render, so it may still finish on their side — it will not be used or charged to your project again.",
    }),
    ctx,
  );
}
