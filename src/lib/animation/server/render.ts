/**
 * RENDER ORCHESTRATION — submit, advance, cancel.
 *
 * The job lifecycle lives here rather than in the routes, because three routes drive it (submit,
 * poll, regenerate-one-scene) and they must agree exactly about what "processing" means.
 *
 * ── HOW A REFRESH SURVIVES ──────────────────────────────────────────────────────────────────
 * Nothing about a render is held in the browser. A job row carries the provider's own job id, so
 * `advanceJobs()` can pick up any in-flight render from any request, in any tab, on any container.
 * The visitor can close the laptop; the next GET resumes exactly where the provider is.
 *
 * ── DUPLICATE PREVENTION ────────────────────────────────────────────────────────────────────
 * Every submission computes an idempotency key from (project, scene, prompt, settings, attempt).
 * The unique index on that column means a double-clicked Generate, a retried POST or two tabs
 * submitting at once produce ONE provider job. The second insert conflicts and the existing job
 * is returned instead — never a second render the visitor pays for twice.
 *
 * ── RETRY IS EXPLICIT, NEVER AUTOMATIC-ON-A-4xx ─────────────────────────────────────────────
 * A provider error that will fail identically next time (bad request, blocked prompt) is marked
 * failed and stops. Only errors the adapter marks retryable increment `attempt`, and even then
 * the visitor presses Retry — an automatic loop against a paid API is how a bug becomes a bill.
 */

import { createHash } from "node:crypto";

import { resolveVideoProvider, ProviderError, scrubProviderError } from "../providers";
import { buildScenePrompt } from "../prompts";
import { get, str } from "../json";
import { looksLikeMp4, probeDuration } from "../probe";
import type {
  BuildingFeatures,
  ProjectSettings,
  StudioAsset,
  StudioScene,
} from "../types";
import { getObject, putObject, type LoadedProject } from "./repo";
import type { Admin } from "./context";

const MAX_ATTEMPTS = 3;

export interface SubmitOutcome {
  submitted: number;
  reused: number;
  failed: { sceneId: string; error: string }[];
}

/** Stable hash of everything that decides what a render will look like. */
function idempotencyKey(
  projectId: string,
  sceneId: string,
  prompt: string,
  negative: string,
  settings: ProjectSettings,
  attempt: number,
): string {
  const material = JSON.stringify({
    projectId,
    sceneId,
    prompt,
    negative,
    aspect: settings.aspectRatio,
    resolution: settings.resolution,
    seed: settings.seed,
    attempt,
  });
  return createHash("sha256").update(material).digest("hex");
}

async function loadImage(
  admin: Admin,
  assets: StudioAsset[],
  assetId: string | null,
): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  if (!assetId) return null;
  const asset = assets.find((a) => a.id === assetId);
  if (!asset) return null;
  const bytes = await getObject(admin, asset.storagePath);
  return bytes ? { bytes, mimeType: asset.mimeType } : null;
}

/**
 * Submit one scene to the provider and record the job.
 *
 * Returns the job row id on success. Any failure is written onto a job row too — a render that
 * never reached the provider still needs a visible Failed state with a reason, not silence.
 */
export async function submitScene(
  admin: Admin,
  loaded: LoadedProject,
  scene: StudioScene,
  features: BuildingFeatures,
  settings: ProjectSettings,
  webhookUrl: string | null,
  attempt = 1,
): Promise<{ ok: true; jobId: string; reused: boolean } | { ok: false; error: string }> {
  const provider = resolveVideoProvider();
  if (!provider) {
    return { ok: false, error: "No video-generation provider is configured on this server." };
  }

  const { prompt, negativePrompt } = buildScenePrompt(scene, features, settings);
  const key = idempotencyKey(loaded.raw.id, scene.id, prompt, negativePrompt, settings, attempt);

  // Has this exact render already been started? If so, reuse it.
  const { data: existing } = await admin
    .from("animation_render_jobs")
    .select("id, status")
    .eq("idempotency_key", key)
    .maybeSingle();
  if (existing && existing.status !== "failed" && existing.status !== "cancelled") {
    return { ok: true, jobId: existing.id, reused: true };
  }

  // Claim the key BEFORE calling the provider. If two requests race, one insert wins and the
  // other reuses it — so the provider is called once even when the routes are hit simultaneously.
  const { data: job, error: jobErr } = await admin
    .from("animation_render_jobs")
    .insert({
      project_id: loaded.raw.id,
      scene_id: scene.id,
      kind: "scene",
      provider: provider.id,
      status: "queued",
      attempt,
      idempotency_key: key,
      request: { prompt, negativePrompt, settings, sceneIndex: scene.index },
    })
    .select("id")
    .single();

  if (jobErr || !job) {
    // Unique-violation: another request claimed the key a moment ago. Use their job.
    const { data: raced } = await admin
      .from("animation_render_jobs")
      .select("id")
      .eq("idempotency_key", key)
      .maybeSingle();
    if (raced) return { ok: true, jobId: raced.id, reused: true };
    console.error("[animation-studio] job insert failed:", jobErr?.message);
    return { ok: false, error: "Could not start the render." };
  }

  await admin.from("animation_scenes").update({ status: "queued" }).eq("id", scene.id);

  try {
    const [startImage, endImage] = await Promise.all([
      loadImage(admin, loaded.project.assets, scene.startAssetId),
      loadImage(admin, loaded.project.assets, scene.endAssetId),
    ]);

    // Reference images give the model more of the building to copy. Capped at three: past that,
    // providers start averaging them into something that is none of the uploads.
    const references: { bytes: Uint8Array; mimeType: string }[] = [];
    if (provider.capabilities.referenceImages) {
      for (const asset of loaded.project.assets.filter((a) => a.role === "reference").slice(0, 3)) {
        const img = await loadImage(admin, loaded.project.assets, asset.id);
        if (img) references.push(img);
      }
    }

    const result = await provider.submitScene({
      prompt,
      negativePrompt,
      aspectRatio: settings.aspectRatio,
      resolution: settings.resolution,
      durationSeconds: scene.durationSeconds,
      seed: provider.capabilities.seed ? (scene.seed ?? settings.seed) : null,
      motionIntensity: scene.motionIntensity,
      startImage: provider.capabilities.startFrame ? startImage : null,
      endImage: provider.capabilities.endFrame ? endImage : null,
      referenceImages: references,
      clientRequestId: job.id,
      webhookUrl: provider.capabilities.webhook ? webhookUrl : null,
    });

    await admin
      .from("animation_render_jobs")
      .update({
        provider_job_id: result.providerJobId,
        status: result.status,
        estimated_cost: result.estimatedCost,
        response: { accepted: result.acceptedDurationSeconds },
      })
      .eq("id", job.id);

    await admin.from("animation_scenes").update({ status: "processing" }).eq("id", scene.id);
    return { ok: true, jobId: job.id, reused: false };
  } catch (err) {
    const message =
      err instanceof ProviderError ? err.message : scrubProviderError(err);
    const retryable = err instanceof ProviderError ? err.retryable : true;
    await admin
      .from("animation_render_jobs")
      .update({
        status: "failed",
        error: retryable ? `${message} You can retry this scene.` : message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    await admin.from("animation_scenes").update({ status: "failed" }).eq("id", scene.id);
    return { ok: false, error: message };
  }
}

export interface AdvanceResult {
  advanced: number;
  completed: number;
  failed: number;
  stillRunning: number;
}

/**
 * Poll every in-flight job for a project and record what the provider says.
 *
 * This is the "genuine queued / processing / completed / failed" engine. It is called by the
 * status route (which the workspace polls) rather than by a background worker, so no scheduler is
 * required: whoever is watching drives the progress, and if nobody is watching the state simply
 * waits in the database until someone opens the project again.
 */
export async function advanceJobs(admin: Admin, loaded: LoadedProject): Promise<AdvanceResult> {
  const provider = resolveVideoProvider();
  const result: AdvanceResult = { advanced: 0, completed: 0, failed: 0, stillRunning: 0 };
  if (!provider) return result;

  const { data: jobs } = await admin
    .from("animation_render_jobs")
    .select("*")
    .eq("project_id", loaded.raw.id)
    .in("status", ["queued", "processing"])
    .eq("kind", "scene");

  for (const job of jobs ?? []) {
    if (!job.provider_job_id) {
      result.stillRunning += 1;
      continue;
    }

    let poll;
    try {
      poll = await provider.pollScene(job.provider_job_id);
    } catch (err) {
      // A throwing poll is a transport problem, not a failed render. Leave the job alone.
      console.error("[animation-studio] poll threw:", scrubProviderError(err));
      result.stillRunning += 1;
      continue;
    }

    result.advanced += 1;

    if (poll.status === "queued" || poll.status === "processing") {
      await admin
        .from("animation_render_jobs")
        .update({ status: poll.status, progress: poll.progress })
        .eq("id", job.id);
      if (job.scene_id) {
        await admin.from("animation_scenes").update({ status: "processing" }).eq("id", job.scene_id);
      }
      result.stillRunning += 1;
      continue;
    }

    if (poll.status === "failed" || poll.status === "cancelled") {
      const retryable = job.attempt < MAX_ATTEMPTS;
      await admin
        .from("animation_render_jobs")
        .update({
          status: poll.status,
          error:
            (poll.error ?? "The provider reported a failed render.") +
            (retryable ? " You can retry this scene." : " This scene has used all its retries."),
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      if (job.scene_id) {
        await admin
          .from("animation_scenes")
          .update({ status: poll.status === "cancelled" ? "cancelled" : "failed" })
          .eq("id", job.scene_id);
      }
      result.failed += 1;
      continue;
    }

    // Completed — store the clip and measure it.
    if (!poll.clip || !looksLikeMp4(poll.clip.bytes)) {
      await admin
        .from("animation_render_jobs")
        .update({
          status: "failed",
          error:
            "The provider reported success but returned a file that is not a readable MP4. " +
            "Retry this scene.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      if (job.scene_id) await admin.from("animation_scenes").update({ status: "failed" }).eq("id", job.scene_id);
      result.failed += 1;
      continue;
    }

    const scene = loaded.project.scenes.find((s) => s.id === job.scene_id);
    const path = `projects/${loaded.project.publicId}/clips/${job.scene_id}-${job.attempt}.mp4`;
    const stored = await putObject(admin, path, poll.clip.bytes, "video/mp4");
    if (!stored) {
      // Storage failed — the clip is real, so keep the job open and try again on the next poll.
      result.stillRunning += 1;
      continue;
    }

    const probe = await probeDuration(poll.clip.bytes);

    await admin
      .from("animation_render_jobs")
      .update({
        status: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
        response: { storagePath: path, measuredSeconds: probe.durationSeconds, probeSource: probe.source },
      })
      .eq("id", job.id);

    if (job.scene_id) {
      await admin
        .from("animation_scenes")
        .update({
          status: "completed",
          clip_path: path,
          clip_duration_seconds: probe.durationSeconds ?? poll.clip.durationSeconds ?? scene?.durationSeconds ?? null,
        })
        .eq("id", job.scene_id);
    }
    result.completed += 1;
  }

  await syncProjectStatus(admin, loaded.raw.id);
  return result;
}

/**
 * Derive the project's headline status from its scenes and jobs.
 *
 * Single source of truth for the badge the workspace shows. Computed rather than written by each
 * route, so a route that forgets to update it cannot leave the page saying "Generating" over a
 * finished film.
 */
export async function syncProjectStatus(admin: Admin, projectRowId: string): Promise<void> {
  const { data: scenes } = await admin
    .from("animation_scenes")
    .select("status")
    .eq("project_id", projectRowId);
  const { data: assemblyJobs } = await admin
    .from("animation_render_jobs")
    .select("status")
    .eq("project_id", projectRowId)
    .eq("kind", "assembly")
    .order("created_at", { ascending: false })
    .limit(1);
  const { data: outputs } = await admin
    .from("animation_outputs")
    .select("id")
    .eq("project_id", projectRowId)
    .eq("kind", "final")
    .limit(1);

  const statuses = (scenes ?? [])
    .map((s: unknown) => str(get(s, "status")))
    .filter((s): s is string => s !== null);
  const assembly = str(get(assemblyJobs?.[0], "status"));

  let status: string;
  if (outputs && outputs.length > 0 && assembly === "completed") status = "completed";
  else if (assembly === "processing" || assembly === "queued") status = "assembling";
  else if (assembly === "failed") status = "failed";
  else if (statuses.some((s) => s === "processing")) status = "generating";
  else if (statuses.some((s) => s === "queued")) status = "queued";
  else if (statuses.length > 0 && statuses.every((s) => s === "completed")) status = "generating";
  else if (statuses.some((s) => s === "failed")) status = "failed";
  else if (statuses.some((s) => s === "cancelled")) status = "cancelled";
  else if (statuses.length > 0) status = "storyboard_ready";
  else status = "draft";

  // "generating" with every scene complete really means "ready to assemble" — keep it distinct so
  // the UI can offer the Export button rather than a spinner.
  if (status === "generating" && statuses.length > 0 && statuses.every((s) => s === "completed")) {
    status = "awaiting_approval";
  }

  await admin.from("animation_projects").update({ status }).eq("id", projectRowId);
}

/** Cancel an in-flight job. Provider cancel is best-effort; the local state always updates. */
export async function cancelJob(admin: Admin, jobId: string): Promise<{ providerCancelled: boolean }> {
  const { data: job } = await admin
    .from("animation_render_jobs")
    .select("id, provider_job_id, scene_id, project_id, status")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return { providerCancelled: false };

  const provider = resolveVideoProvider();
  let providerCancelled = false;
  if (provider && job.provider_job_id) {
    try {
      providerCancelled = await provider.cancelScene(job.provider_job_id);
    } catch {
      providerCancelled = false;
    }
  }

  await admin
    .from("animation_render_jobs")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
      error: providerCancelled
        ? null
        : "Cancelled here. The provider does not support cancelling a running render, so it may still finish on their side — it will not be used.",
    })
    .eq("id", job.id);

  if (job.scene_id) {
    await admin.from("animation_scenes").update({ status: "cancelled" }).eq("id", job.scene_id);
  }
  await syncProjectStatus(admin, job.project_id);
  return { providerCancelled };
}

export { MAX_ATTEMPTS };
