/**
 * LIVE PROVIDER VERIFICATION — the one test that cannot be faked.
 *
 *   npm run animation:live
 *
 * Everything else in this feature is unit-tested against documented shapes. This script is the
 * end-to-end proof that the shapes are RIGHT: it drives a real render through every stage the
 * product depends on and fails loudly at whichever one breaks.
 *
 *   1. READINESS   provider credentials, ffmpeg, ffprobe, Supabase, the animation_* schema
 *   2. SUBMIT      a real scene to the configured provider
 *   3. POLL        the real job until it completes, with a timeout and honest progress
 *   4. DOWNLOAD    the returned clip and confirm it is a readable MP4
 *   5. ASSEMBLE    N clips into ONE file, trimmed to the storyboard's exact durations
 *   6. FFPROBE     the finished file and assert 30.000s ± one frame
 *   7. UPLOAD      it to the PRIVATE storage bucket and read it back through a signed URL
 *   8. CLEAN UP    delete everything it created, unless --keep is passed
 *
 * ── IT NEVER EXPOSES OR COMMITS A KEY ───────────────────────────────────────────────────────
 * The key is read from the environment (GEMINI_API_KEY, or whatever the configured provider
 * uses) via the same src/lib/animation/env.ts helpers the server uses. This script:
 *   • never accepts a key as a command-line argument, where it would land in shell history;
 *   • never prints a key, a partial key, or a URL containing one — `redact()` scrubs every line
 *     it writes, and the provider adapters already scrub their own errors;
 *   • never writes a key to disk, and creates no file that could be committed;
 *   • is itself committed, but contains no credential of any kind.
 * Put the key in `.env.local`, which is gitignored, exactly like the Razorpay secrets.
 *
 * ── COST WARNING ────────────────────────────────────────────────────────────────────────────
 * This SPENDS REAL PROVIDER CREDIT — it generates video. It defaults to the cheapest useful shape
 * (two short clips at 720p) and refuses to run without --confirm, so it cannot be triggered by a
 * stray `npm run` or by CI.
 *
 * Flags:
 *   --confirm          required; acknowledges that this spends provider credit
 *   --scenes=N         how many clips to generate (default 2, max 6)
 *   --resolution=720p  720p | 1080p
 *   --keep             leave the uploaded artefacts in storage for inspection
 *   --skip-upload      run stages 1-6 only; do not touch Supabase storage
 */

import { writeFile, mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { assembleClips, isAssemblyAvailable, ASSEMBLY_UNAVAILABLE_MESSAGE } from "../src/lib/animation/assemble";
import { isAcceptableMeasuredDuration, rebalanceToTotal, sumDurations, isExactTotal } from "../src/lib/animation/duration";
import { missingStudioEnv, missingVideoEnv, selectedProviderId } from "../src/lib/animation/env";
import { hasFfprobe, looksLikeMp4, probeDuration } from "../src/lib/animation/probe";
import { requestDurationFor, resolveVideoProvider, scrubProviderError } from "../src/lib/animation/providers";
import { buildScenePrompt } from "../src/lib/animation/prompts";
import { defaultBuildingFeatures } from "../src/lib/animation/features";
import { buildStoryboard } from "../src/lib/animation/storyboard";
import { defaultSettings, getObject, putObject, removeObjects, signObject, studioClient } from "../src/lib/animation/server/repo";
import { TOTAL_DURATION_SECONDS } from "../src/lib/animation/types";

/* ------------------------------------------------------------------ *
 * Output helpers — every line passes through redact()
 * ------------------------------------------------------------------ */

/**
 * Scrub anything credential-shaped out of a line before it is printed.
 *
 * Belt and braces on top of the adapters' own scrubbing: this is the last thing between a
 * provider's error text and a terminal that may be screen-shared or pasted into an issue.
 */
function redact(text: string): string {
  let out = String(text);
  for (const name of [
    "GEMINI_API_KEY",
    "GOOGLE_VEO_API_KEY",
    "VIDEO_PROVIDER_API_KEY",
    "BUILDING_ANALYSIS_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANIMATION_STUDIO_SESSION_SECRET",
    "VIDEO_PROVIDER_WEBHOOK_SECRET",
  ]) {
    const value = process.env[name];
    // Only substrings long enough to BE a secret; a 3-char value would blank half the output.
    if (value && value.trim().length >= 8) {
      out = out.split(value.trim()).join(`[${name} redacted]`);
    }
  }
  return out
    .replace(/\bAIza[0-9A-Za-z_-]{10,}/g, "[redacted]")
    .replace(/\bsb_(secret|publishable)_[A-Za-z0-9_-]{8,}/g, "[redacted]")
    .replace(/([?&](?:key|api_key|access_token)=)[^&\s]+/gi, "$1[redacted]");
}

const log = (msg: string) => console.log(redact(msg));
const fail = (msg: string) => console.error(redact(msg));

let stage = 0;
function heading(title: string): void {
  stage += 1;
  log(`\n── ${stage}. ${title} ${"─".repeat(Math.max(0, 62 - title.length))}`);
}

let failures = 0;
function assert(condition: boolean, label: string, detail = ""): boolean {
  if (condition) {
    log(`   ok   ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failures += 1;
    fail(`   FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
  return condition;
}

function die(message: string): never {
  fail(`\n✖ ${message}`);
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Arguments
 * ------------------------------------------------------------------ */

const argv = process.argv.slice(2);
const flag = (name: string): boolean => argv.includes(`--${name}`);
const option = (name: string, fallback: string): string => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

if (!flag("confirm")) {
  die(
    "This script generates real video and SPENDS PROVIDER CREDIT.\n" +
      "  Re-run with --confirm once you are ready:\n" +
      "    npm run animation:live -- --confirm\n" +
      "  Optional: --scenes=2 --resolution=720p --keep --skip-upload",
  );
}

const sceneCount = Math.max(1, Math.min(6, Number(option("scenes", "2")) || 2));
const resolution = option("resolution", "720p") === "1080p" ? "1080p" : "720p";
const keepArtifacts = flag("keep");
const skipUpload = flag("skip-upload");

/* A 1x1 transparent PNG. Used as the start frame so the script never needs a real photograph in
 * the repository — the point here is to exercise the PIPELINE, not to judge image quality. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function main(): Promise<void> {
  log("ANIMATION STUDIO — LIVE PROVIDER VERIFICATION");
  log(`scenes=${sceneCount}  resolution=${resolution}  keep=${keepArtifacts}  skipUpload=${skipUpload}`);

  /* ─────────────────────────────────────────── 1. readiness ───────────────────────────── */

  heading("Readiness");

  const providerId = selectedProviderId();
  const missingProvider = missingVideoEnv();
  assert(providerId !== null, "a video provider is selected", providerId ?? "none");
  if (missingProvider.length > 0) {
    die(`Provider not configured. Missing environment variables: ${missingProvider.join(", ")}`);
  }

  const provider = resolveVideoProvider();
  if (!provider) die("resolveVideoProvider() returned null despite the environment check passing.");
  assert(true, "provider adapter resolved", `${provider.label} (${provider.id})`);
  assert(
    provider.capabilities.maxSceneSeconds > 0,
    "provider advertises a clip length",
    `max ${provider.capabilities.maxSceneSeconds}s, ladder [${provider.capabilities.allowedDurationsSeconds.join(", ") || "any"}]`,
  );

  const ffmpegOk = await isAssemblyAvailable();
  if (!assert(ffmpegOk, "ffmpeg is available")) die(ASSEMBLY_UNAVAILABLE_MESSAGE);
  const ffprobeOk = await hasFfprobe();
  assert(ffprobeOk, "ffprobe is available", ffprobeOk ? "" : "falling back to the MP4 container reader");

  const missingStudio = missingStudioEnv();
  const supabaseOk = missingStudio.length === 0;
  assert(supabaseOk, "Supabase is configured", supabaseOk ? "" : `missing ${missingStudio.join(", ")}`);

  const admin = supabaseOk ? studioClient() : null;
  if (admin && !skipUpload) {
    const { error } = await admin.from("animation_projects").select("id").limit(1);
    if (!assert(!error, "animation_* schema is reachable", error ? redact(error.message) : "")) {
      die("Apply supabase/migrations/20260824120000_construction_animation_studio.sql first.");
    }
  }

  /* ─────────────────────────────────── 2. storyboard arithmetic ───────────────────────── */

  heading("Storyboard arithmetic");

  const features = defaultBuildingFeatures();
  const settings = { ...defaultSettings(), resolution: resolution as "720p" | "1080p", seed: 424242 };
  const full = buildStoryboard({
    features,
    timeOfDay: "daylight",
    exteriorAssetId: null,
    interiorAssetId: null,
    seed: settings.seed,
  });

  /* Only the first `sceneCount` scenes are generated, but they are RE-BALANCED to still total
   * exactly 30s so the assembly assertion below is the real product assertion, not a weaker one. */
  const chosen = full.slice(0, sceneCount);
  const { durations } = rebalanceToTotal(
    chosen.map((s) => ({ duration: s.durationSeconds })),
    TOTAL_DURATION_SECONDS,
    provider.capabilities.maxSceneSeconds,
  );
  const scenes = chosen.map((s, i) => ({ ...s, durationSeconds: durations[i] }));

  assert(
    isExactTotal(scenes.map((s) => s.durationSeconds)),
    "the scene durations total exactly 30.000s",
    scenes.map((s) => `${s.durationSeconds}s`).join(" + "),
  );

  const requested = scenes.map((s) => requestDurationFor(s.durationSeconds, provider.capabilities));
  assert(
    requested.every((r, i) => r >= scenes[i].durationSeconds - 1e-9),
    "every requested clip covers its slot (assembly only ever trims)",
    `requesting ${requested.join("/")}s for slots ${scenes.map((s) => s.durationSeconds).join("/")}s`,
  );

  /* ───────────────────────────────────── 3. submit + poll ─────────────────────────────── */

  heading("Submit and poll");

  const clips: { bytes: Uint8Array; targetSeconds: number; transition: "cut" | "cross-dissolve" }[] = [];

  for (const [index, scene] of scenes.entries()) {
    const { prompt, negativePrompt } = buildScenePrompt(scene, features, settings);
    log(`   scene ${index + 1}/${scenes.length}: "${scene.title}" — slot ${scene.durationSeconds}s, requesting ${requested[index]}s`);

    let submitted;
    try {
      submitted = await provider.submitScene({
        prompt,
        negativePrompt,
        aspectRatio: settings.aspectRatio,
        resolution: settings.resolution,
        durationSeconds: scene.durationSeconds,
        seed: settings.seed,
        motionIntensity: scene.motionIntensity,
        // The 1x1 PNG keeps the request shape identical to production without shipping a photo.
        startImage: { bytes: new Uint8Array(TINY_PNG), mimeType: "image/png" },
        endImage: null,
        referenceImages: [],
        clientRequestId: `live-check-${index}`,
        webhookUrl: null,
      });
    } catch (err) {
      die(`Submit failed on scene ${index + 1}: ${scrubProviderError(err)}`);
    }

    assert(!!submitted.providerJobId, `scene ${index + 1} accepted`, `job id received, status ${submitted.status}`);
    assert(
      submitted.acceptedDurationSeconds >= scene.durationSeconds - 1e-9,
      `scene ${index + 1} accepted length covers its slot`,
      `${submitted.acceptedDurationSeconds}s >= ${scene.durationSeconds}s`,
    );

    // Poll until terminal. 10 minutes is generous; a stuck job must not hang a CI shell forever.
    const deadline = Date.now() + 10 * 60 * 1000;
    let delay = 5000;
    let clipBytes: Uint8Array | null = null;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(15000, Math.round(delay * 1.2));

      const poll = await provider.pollScene(submitted.providerJobId);
      if (poll.status === "queued" || poll.status === "processing") {
        log(`   … scene ${index + 1} ${poll.status}${poll.progress !== null ? ` ${poll.progress}%` : ""}`);
        continue;
      }
      if (poll.status === "failed" || poll.status === "cancelled") {
        die(`Scene ${index + 1} ${poll.status}: ${poll.error ?? "no reason given"}`);
      }
      if (!poll.clip) die(`Scene ${index + 1} reported complete but returned no clip.`);
      clipBytes = poll.clip.bytes;
      break;
    }

    if (!clipBytes) die(`Scene ${index + 1} did not finish within 10 minutes.`);

    /* ─────────────────────────────── 4. download validity ────────────────────────────── */
    assert(clipBytes.byteLength > 1024, `scene ${index + 1} clip downloaded`, `${(clipBytes.byteLength / 1024).toFixed(0)} KB`);
    assert(looksLikeMp4(clipBytes), `scene ${index + 1} clip is a readable MP4`);

    const clipProbe = await probeDuration(clipBytes);
    assert(
      clipProbe.durationSeconds !== null,
      `scene ${index + 1} clip duration measured`,
      clipProbe.durationSeconds !== null
        ? `${clipProbe.durationSeconds.toFixed(3)}s via ${clipProbe.source}`
        : (clipProbe.error ?? ""),
    );
    if (clipProbe.durationSeconds !== null) {
      assert(
        clipProbe.durationSeconds >= scene.durationSeconds - 0.05,
        `scene ${index + 1} clip is long enough to fill its ${scene.durationSeconds}s slot`,
        `${clipProbe.durationSeconds.toFixed(3)}s`,
      );
    }

    clips.push({
      bytes: clipBytes,
      targetSeconds: scene.durationSeconds,
      transition: index === 0 ? "cut" : "cross-dissolve",
    });
  }

  /* ───────────────────────────────── 5 + 6. assemble and probe ────────────────────────── */

  heading("Assemble and verify duration");

  const assembly = await assembleClips(clips, {
    aspectRatio: settings.aspectRatio,
    resolution: settings.resolution,
    totalSeconds: TOTAL_DURATION_SECONDS,
    silent: true,
  });

  if (!assembly.ok || !assembly.bytes) die(`Assembly failed: ${assembly.error ?? "unknown"}`);

  assert(looksLikeMp4(assembly.bytes), "assembled file is a readable MP4");
  assert(
    assembly.measuredDurationSeconds !== undefined,
    "assembled file was measured server-side",
    `${assembly.measuredDurationSeconds?.toFixed(3)}s via ${assembly.probeSource}`,
  );
  assert(
    isAcceptableMeasuredDuration(assembly.measuredDurationSeconds ?? 0),
    `assembled file is exactly ${TOTAL_DURATION_SECONDS}.000s (± one frame)`,
    `measured ${assembly.measuredDurationSeconds?.toFixed(3)}s`,
  );
  assert(
    sumDurations(clips.map((c) => c.targetSeconds)) === TOTAL_DURATION_SECONDS,
    "the trimmed slot lengths sum to 30.000s",
  );
  assert(!!assembly.posterBytes, "a poster frame was produced");

  // Keep a local copy so a human can watch what the pipeline actually produced.
  const dir = await mkdtemp(join(tmpdir(), "poc-live-"));
  const localPath = join(dir, "live-check.mp4");
  await writeFile(localPath, assembly.bytes);
  log(`   local copy: ${localPath}`);

  // Re-probe from DISK, which is the ffprobe path the server prefers.
  const diskProbe = await probeDuration(new Uint8Array(await readFile(localPath)), localPath);
  assert(
    diskProbe.durationSeconds !== null && isAcceptableMeasuredDuration(diskProbe.durationSeconds),
    "ffprobe agrees when reading the file from disk",
    diskProbe.durationSeconds !== null ? `${diskProbe.durationSeconds.toFixed(3)}s via ${diskProbe.source}` : "",
  );

  /* ───────────────────────────────────── 7. private storage ───────────────────────────── */

  if (skipUpload) {
    heading("Private storage upload (skipped by --skip-upload)");
  } else if (!admin) {
    heading("Private storage upload");
    assert(false, "Supabase admin client available");
  } else {
    heading("Private storage upload");
    const stamp = `${Date.now()}`;
    const path = `live-check/${stamp}/final.mp4`;

    const stored = await putObject(admin, path, assembly.bytes, "video/mp4");
    assert(stored !== null, "uploaded to the private bucket", path);

    const signed = stored ? await signObject(admin, path, 120) : null;
    assert(!!signed, "a signed download URL was minted");
    // Never print the signed URL: it is a bearer credential for the object.

    const readBack = stored ? await getObject(admin, path) : null;
    assert(
      readBack !== null && readBack.byteLength === assembly.bytes.byteLength,
      "the object reads back byte-for-byte",
      readBack ? `${readBack.byteLength} bytes` : "read failed",
    );
    assert(readBack !== null && looksLikeMp4(readBack), "the stored object is still a valid MP4");

    if (keepArtifacts) {
      log(`   kept in storage at ${path} (--keep)`);
    } else {
      await removeObjects(admin, [path]);
      const gone = await getObject(admin, path);
      assert(gone === null, "test artefact deleted from storage");
    }
  }

  if (!keepArtifacts) await rm(dir, { recursive: true, force: true }).catch(() => {});

  /* ─────────────────────────────────────────── report ─────────────────────────────────── */

  log(`\n${"═".repeat(72)}`);
  if (failures === 0) {
    log("LIVE VERIFICATION PASSED — submit, poll, download, assemble, probe and storage all work.");
    log(`The provider is genuinely producing a ${TOTAL_DURATION_SECONDS}-second film end to end.`);
  } else {
    fail(`LIVE VERIFICATION FAILED — ${failures} check(s) did not pass.`);
  }
  log("═".repeat(72));
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  die(`Unhandled error: ${scrubProviderError(err)}`);
});
