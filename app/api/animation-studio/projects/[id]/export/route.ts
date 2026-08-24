/**
 * POST /api/animation-studio/projects/[id]/export
 *
 * Assemble every rendered clip into ONE MP4 of exactly 30 seconds, probe it, store it, and make a
 * poster frame. Steps 12–13 of the brief's workflow.
 *
 * ── THE THREE THINGS THIS ROUTE REFUSES TO DO ───────────────────────────────────────────────
 *  1. Publish a file it could not measure. If neither ffprobe nor the MP4 container reader can
 *     read a duration, the export fails — an unverified file is not a 30-second guarantee.
 *  2. Publish a file that measured anything other than 30s ± one frame.
 *  3. Pretend an export happened on a host with no ffmpeg. It answers 503 with the exact command
 *     to add it to the image.
 *
 * ── ASPECT RATIOS ───────────────────────────────────────────────────────────────────────────
 * 16:9, 9:16 and 1:1 are produced from the SAME clips by scaling and padding, so a vertical cut
 * needs no re-render. `resolution` selects 720p (preview) or 1080p (final); 4K is only offered
 * when the configured provider advertises it, because upscaling 1080p and calling it 4K would be
 * a lie told in a filename.
 */

import { NextResponse } from "next/server";

import {
  ASSEMBLY_UNAVAILABLE_MESSAGE,
  assembleClips,
  isAssemblyAvailable,
  outputSize,
  type AssemblyClip,
} from "@/lib/animation/assemble";
import { isExactTotal } from "@/lib/animation/duration";
import { resolveVideoProvider } from "@/lib/animation/providers";
import {
  enforceRateLimit,
  jsonError,
  readJson,
  requireOwnedProject,
  withSession,
  type Admin as StudioAdmin,
} from "@/lib/animation/server/context";
import { syncProjectStatus } from "@/lib/animation/server/render";
import { getObject, putObject, withSignedUrls } from "@/lib/animation/server/repo";
import {
  TOTAL_DURATION_SECONDS,
  type AspectRatio,
  type Resolution,
} from "@/lib/animation/types";

export const runtime = "nodejs";
// Encoding 30 seconds of 1080p H.264 is the longest operation in this feature.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

interface ExportBody {
  aspectRatio?: AspectRatio;
  resolution?: Resolution;
  /** "preview" produces the 720p proof; "final" the 1080p deliverable. */
  kind?: "preview" | "final";
}

const ASPECTS: AspectRatio[] = ["16:9", "9:16", "1:1"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  const limited = await enforceRateLimit(
    ctx,
    "export",
    20,
    3600,
    "You have exported this project several times in the last hour. Please wait a few minutes.",
  );
  if (limited) return limited;

  const body = await readJson<ExportBody>(request);
  const kind = body?.kind === "preview" ? "preview" : "final";
  const aspectRatio: AspectRatio = ASPECTS.includes(body?.aspectRatio as AspectRatio)
    ? (body!.aspectRatio as AspectRatio)
    : loaded.project.settings.aspectRatio;

  let resolution: Resolution = kind === "preview" ? "720p" : (body?.resolution ?? loaded.project.settings.resolution);
  if (resolution === "4k") {
    // Only offer 4K when the provider genuinely produces it. Otherwise this would be an upscale
    // sold as a native resolution.
    const provider = resolveVideoProvider();
    if (!provider?.capabilities.resolutions.includes("4k")) {
      resolution = "1080p";
    }
  }

  const scenes = [...loaded.project.scenes].sort((a, b) => a.index - b.index);
  if (scenes.length === 0) {
    return withSession(jsonError("There is no storyboard to export.", 400), ctx);
  }

  const unrendered = scenes.filter((s) => !s.clipPath || s.status !== "completed");
  if (unrendered.length > 0) {
    return withSession(
      jsonError(
        `${unrendered.length} of ${scenes.length} scenes have not been generated yet. Generate them, or remove them from the storyboard, before exporting.`,
        400,
        { unrenderedSceneIds: unrendered.map((s) => s.id) },
      ),
      ctx,
    );
  }

  // Belt and braces: the durations stored on the scenes must already total 30s (the PATCH route
  // rebalances on every write), but the export is the last moment to catch a row edited by hand.
  if (!isExactTotal(scenes.map((s) => s.durationSeconds))) {
    return withSession(
      jsonError(
        "The storyboard does not total 30 seconds. Reopen the timeline — saving it will rebalance the scenes.",
        400,
      ),
      ctx,
    );
  }

  if (!(await isAssemblyAvailable())) {
    return withSession(jsonError(ASSEMBLY_UNAVAILABLE_MESSAGE, 503, { assemblyAvailable: false }), ctx);
  }

  const { data: job, error: jobErr } = await ctx.admin
    .from("animation_render_jobs")
    .insert({
      project_id: loaded.raw.id,
      kind: "assembly",
      provider: "local-ffmpeg",
      status: "processing",
      request: { aspectRatio, resolution, kind, scenes: scenes.length },
    })
    .select("id")
    .single();
  if (jobErr || !job) {
    console.error("[animation-studio] assembly job insert failed:", jobErr?.message);
    return withSession(jsonError("Could not start the export.", 500), ctx);
  }

  await ctx.admin.from("animation_projects").update({ status: "assembling" }).eq("id", loaded.raw.id);

  const clips: AssemblyClip[] = [];
  for (const scene of scenes) {
    const bytes = await getObject(ctx.admin, scene.clipPath!);
    if (!bytes) {
      await failJob(
        ctx.admin,
        job.id,
        loaded.raw.id,
        `Scene ${scene.index + 1}'s clip could not be read from storage. Regenerate that scene and export again.`,
      );
      return withSession(
        jsonError(`Scene ${scene.index + 1}'s clip is missing. Regenerate it and export again.`, 409),
        ctx,
      );
    }
    clips.push({
      bytes,
      targetSeconds: scene.durationSeconds,
      // Scene 1 always cuts in — a fade on the opening frame would eat the establishing shot.
      transition: scene.index === 0 ? "cut" : scene.transitionIn,
    });
  }

  const assembly = await assembleClips(clips, {
    aspectRatio,
    resolution,
    totalSeconds: TOTAL_DURATION_SECONDS,
    silent: true,
  });

  if (!assembly.ok || !assembly.bytes) {
    await failJob(ctx.admin, job.id, loaded.raw.id, assembly.error ?? "The export failed.");
    return withSession(
      jsonError(assembly.error ?? "The export failed.", 500, {
        measuredDurationSeconds: assembly.measuredDurationSeconds ?? null,
      }),
      ctx,
    );
  }

  const stamp = Date.now();
  const videoPath = `projects/${loaded.project.publicId}/exports/${kind}-${aspectRatio.replace(":", "x")}-${resolution}-${stamp}.mp4`;
  const stored = await putObject(ctx.admin, videoPath, assembly.bytes, "video/mp4");
  if (!stored) {
    await failJob(ctx.admin, job.id, loaded.raw.id, "The finished film could not be stored.");
    return withSession(jsonError("The finished film could not be stored. Please try again.", 500), ctx);
  }

  let posterPath: string | null = null;
  if (assembly.posterBytes) {
    posterPath = await putObject(
      ctx.admin,
      `projects/${loaded.project.publicId}/exports/poster-${aspectRatio.replace(":", "x")}-${stamp}.jpg`,
      assembly.posterBytes,
      "image/jpeg",
    );
  }

  const size = outputSize(aspectRatio, resolution);

  await ctx.admin.from("animation_outputs").insert({
    project_id: loaded.raw.id,
    kind,
    aspect_ratio: aspectRatio,
    resolution,
    storage_path: videoPath,
    duration_seconds: TOTAL_DURATION_SECONDS,
    verified_duration_seconds: assembly.measuredDurationSeconds ?? null,
    probe_source: assembly.probeSource ?? null,
    byte_size: assembly.bytes.byteLength,
  });

  if (posterPath) {
    await ctx.admin.from("animation_outputs").insert({
      project_id: loaded.raw.id,
      kind: "poster",
      aspect_ratio: aspectRatio,
      resolution,
      storage_path: posterPath,
      duration_seconds: null,
      verified_duration_seconds: null,
      byte_size: assembly.posterBytes?.byteLength ?? null,
    });
  }

  await ctx.admin
    .from("animation_render_jobs")
    .update({
      status: "completed",
      progress: 100,
      completed_at: new Date().toISOString(),
      response: {
        storagePath: videoPath,
        measuredSeconds: assembly.measuredDurationSeconds,
        probeSource: assembly.probeSource,
        width: size.width,
        height: size.height,
      },
    })
    .eq("id", job.id);

  await syncProjectStatus(ctx.admin, loaded.raw.id);

  const refreshed = await requireOwnedProject(id);
  if (refreshed instanceof NextResponse) return refreshed;
  const signed = await withSignedUrls(refreshed.ctx.admin, refreshed.loaded.project, refreshed.loaded.outputs);

  return withSession(
    NextResponse.json({
      project: signed.project,
      outputs: signed.outputs,
      export: {
        kind,
        aspectRatio,
        resolution,
        width: size.width,
        height: size.height,
        // The measured value, not the requested one. This is the acceptance evidence.
        verifiedDurationSeconds: assembly.measuredDurationSeconds,
        probeSource: assembly.probeSource,
        codec: "H.264 (libx264, High profile, yuv420p)",
      },
    }),
    ctx,
  );
}

async function failJob(
  admin: StudioAdmin,
  jobId: string,
  projectRowId: string,
  error: string,
): Promise<void> {
  await admin
    .from("animation_render_jobs")
    .update({ status: "failed", error, completed_at: new Date().toISOString() })
    .eq("id", jobId);
  await syncProjectStatus(admin, projectRowId);
}
