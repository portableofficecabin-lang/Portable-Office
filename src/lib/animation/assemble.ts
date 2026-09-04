/**
 * ASSEMBLY — turning N scene clips into ONE exact-30-second H.264 MP4.
 *
 * ── WHY ffmpeg AND NOT SOMETHING ELSE ───────────────────────────────────────────────────────
 * Concatenating encoded video, trimming each clip to a frame-accurate length and re-encoding to
 * a fixed resolution and codec is what ffmpeg is for. There is no correct pure-JS alternative,
 * and this repo deliberately does not add heavy dependencies. So assembly requires an ffmpeg
 * binary on the host.
 *
 * ── WHEN ffmpeg IS ABSENT ───────────────────────────────────────────────────────────────────
 * The production image (node:20-alpine, see Dockerfile) does NOT ship ffmpeg today. On such a
 * host `isAssemblyAvailable()` is false, the workspace says so before the visitor spends a
 * render, and an assembly job FAILS with an actionable message. It does not stitch approximately,
 * does not hand back the first clip pretending it is the film, and does not report success.
 * Deployment notes in the final report say exactly what to add to the image.
 *
 * ── HOW EXACTLY 30s IS GUARANTEED ───────────────────────────────────────────────────────────
 *   • each clip is trimmed to its scene's duration with `-t` (provider clips overrun routinely);
 *   • a clip SHORTER than its scene has its last frame held with tpad, rather than the film
 *     coming up short;
 *   • the concat filter joins them, and `-t 30` on the output is a final hard stop;
 *   • the result is probed (src/lib/animation/probe.ts) and rejected if it is not 30s ± one frame.
 */

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ffmpegPath } from "./env";
import { DURATION_TOLERANCE_SECONDS, TOTAL_TENTHS } from "./duration";
import { isAcceptableMeasuredDuration } from "./duration";
import { looksLikeMp4, probeDuration } from "./probe";
import { TOTAL_DURATION_SECONDS, type AspectRatio, type Resolution } from "./types";

const FPS = 25;

/** Pixel dimensions for each (aspect, resolution) pair. 1080p means 1080 on the SHORT edge. */
export function outputSize(aspect: AspectRatio, resolution: Resolution): { width: number; height: number } {
  const short = resolution === "720p" ? 720 : resolution === "4k" ? 2160 : 1080;
  if (aspect === "9:16") return { width: even((short * 9) / 16), height: even(short) };
  if (aspect === "1:1") return { width: even(short), height: even(short) };
  return { width: even((short * 16) / 9), height: even(short) };
}

// H.264 requires even dimensions in both axes (4:2:0 chroma subsampling).
const even = (n: number): number => 2 * Math.round(n / 2);

let ffmpegAvailable: boolean | null = null;

export async function isAssemblyAvailable(): Promise<boolean> {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  const bin = ffmpegPath() ?? "ffmpeg";
  ffmpegAvailable = await new Promise<boolean>((resolve) => {
    try {
      const child = spawn(bin, ["-version"], { stdio: "ignore" });
      child.on("error", () => resolve(false));
      child.on("close", (code) => resolve(code === 0));
    } catch {
      resolve(false);
    }
  });
  return ffmpegAvailable;
}

export const ASSEMBLY_UNAVAILABLE_MESSAGE =
  "Server-side video assembly is unavailable: no ffmpeg binary was found on this host. The scene " +
  "clips generated successfully and are downloadable individually, but they cannot be joined into " +
  "one 30-second file here. Install ffmpeg in the runtime image (Alpine: `apk add --no-cache " +
  "ffmpeg`) or set FFMPEG_PATH to an existing binary, then retry the export.";

export interface AssemblyClip {
  bytes: Uint8Array;
  /** The scene duration this clip must occupy in the final film. */
  targetSeconds: number;
  /** Transition into this clip. `cut` is a hard join; the rest add a short blend. */
  transition: "cut" | "cross-dissolve" | "dip-to-white" | "match-cut" | "whip-pan";
}

export interface AssemblyOptions {
  aspectRatio: AspectRatio;
  resolution: Resolution;
  /** Total length of the finished film. Always 30 in this product; parameterised for tests. */
  totalSeconds?: number;
  /** Mute the output entirely (the default — provider clips are silent and music is optional). */
  silent?: boolean;
}

export interface AssemblyResult {
  ok: boolean;
  bytes?: Uint8Array;
  posterBytes?: Uint8Array;
  measuredDurationSeconds?: number;
  probeSource?: string;
  width?: number;
  height?: number;
  error?: string;
}

/**
 * Join clips into one file of exactly `totalSeconds`.
 *
 * Returns `{ ok: false, error }` rather than throwing, because every failure here is something
 * the visitor must be shown verbatim in the Failed state with a recovery instruction.
 */
export async function assembleClips(
  clips: AssemblyClip[],
  opts: AssemblyOptions,
): Promise<AssemblyResult> {
  const total = opts.totalSeconds ?? TOTAL_DURATION_SECONDS;

  if (clips.length === 0) return { ok: false, error: "There are no rendered clips to assemble." };
  for (const [i, clip] of clips.entries()) {
    if (!looksLikeMp4(clip.bytes)) {
      return {
        ok: false,
        error: `Scene ${i + 1}'s clip is not a readable MP4, so the film cannot be assembled. Regenerate that scene.`,
      };
    }
  }

  if (!(await isAssemblyAvailable())) return { ok: false, error: ASSEMBLY_UNAVAILABLE_MESSAGE };

  const { width, height } = outputSize(opts.aspectRatio, opts.resolution);
  const dir = await mkdtemp(join(tmpdir(), "poc-anim-"));

  try {
    const inputs: string[] = [];
    for (const [i, clip] of clips.entries()) {
      const p = join(dir, `scene-${String(i).padStart(2, "0")}.mp4`);
      await writeFile(p, clip.bytes);
      inputs.push(p);
    }

    const outPath = join(dir, "final.mp4");
    const posterPath = join(dir, "poster.jpg");

    const args = buildFilterArgs(inputs, clips, { width, height, total, silent: opts.silent !== false });
    const run = await runFfmpeg([...args, outPath]);
    if (!run.ok) {
      return {
        ok: false,
        error: `Video assembly failed. ffmpeg reported: ${run.error?.slice(0, 400) ?? "unknown error"}`,
      };
    }

    const bytes = new Uint8Array(await readFile(outPath));
    const probe = await probeDuration(bytes, outPath);

    if (probe.durationSeconds === null) {
      return {
        ok: false,
        error:
          `The film was assembled but its duration could not be verified (${probe.error ?? "no probe available"}). ` +
          "It has not been published, because this tool guarantees an exact 30-second export.",
      };
    }
    if (!isAcceptableMeasuredDuration(probe.durationSeconds, total)) {
      return {
        ok: false,
        measuredDurationSeconds: probe.durationSeconds,
        probeSource: probe.source,
        error:
          `The assembled film measured ${probe.durationSeconds.toFixed(3)}s, not ${total.toFixed(3)}s ` +
          `(tolerance ±${DURATION_TOLERANCE_SECONDS}s). It has not been published. Retry the export; if it ` +
          "recurs, one of the scene clips is malformed — regenerate it.",
      };
    }

    // Poster from one third in: far enough past the opening fade to be a usable thumbnail.
    let posterBytes: Uint8Array | undefined;
    const poster = await runFfmpeg([
      "-y", "-ss", (total / 3).toFixed(2), "-i", outPath,
      "-frames:v", "1", "-vf", `scale=${width}:${height}`, "-q:v", "3", posterPath,
    ]);
    if (poster.ok) {
      try {
        posterBytes = new Uint8Array(await readFile(posterPath));
      } catch {
        posterBytes = undefined;
      }
    }

    return {
      ok: true,
      bytes,
      posterBytes,
      measuredDurationSeconds: probe.durationSeconds,
      probeSource: probe.source,
      width,
      height,
    };
  } catch (err) {
    return { ok: false, error: `Video assembly failed: ${err instanceof Error ? err.message : String(err)}` };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Build the ffmpeg invocation.
 *
 * Each input is independently: trimmed to its target with `-t`, tail-padded with `tpad` (so a
 * short clip holds its last frame instead of shortening the film), scaled+padded into the output
 * frame without cropping the building, and forced to a constant frame rate. Then `concat` joins
 * them and `-t total` caps the result. Transitions are applied as a short fade on the incoming
 * clip: `xfade` would be cleaner but consumes overlap time, which would break the exact total.
 */
function buildFilterArgs(
  inputs: string[],
  clips: AssemblyClip[],
  o: { width: number; height: number; total: number; silent: boolean },
): string[] {
  const args: string[] = ["-y"];
  for (const [i, path] of inputs.entries()) {
    // -t BEFORE -i trims at the demuxer, which is both faster and frame-accurate enough here.
    args.push("-t", clips[i].targetSeconds.toFixed(3), "-i", path);
  }

  const chains: string[] = [];
  clips.forEach((clip, i) => {
    const t = clip.targetSeconds.toFixed(3);
    const fade = clip.transition === "cut" ? "" : `,fade=t=in:st=0:d=${transitionSeconds(clip).toFixed(2)}${
      clip.transition === "dip-to-white" ? ":color=white" : ""
    }`;
    chains.push(
      `[${i}:v]` +
        `scale=${o.width}:${o.height}:force_original_aspect_ratio=decrease,` +
        `pad=${o.width}:${o.height}:(ow-iw)/2:(oh-ih)/2:color=black,` +
        `setsar=1,fps=${FPS},` +
        // Hold the final frame if the provider returned a short clip, then hard-trim to target.
        `tpad=stop_mode=clone:stop_duration=${t},trim=duration=${t},setpts=PTS-STARTPTS` +
        fade +
        `[v${i}]`,
    );
  });

  const concatInputs = clips.map((_, i) => `[v${i}]`).join("");
  chains.push(`${concatInputs}concat=n=${clips.length}:v=1:a=0[outv]`);

  args.push("-filter_complex", chains.join(";"), "-map", "[outv]");
  if (o.silent) args.push("-an");

  args.push(
    "-c:v", "libx264",
    "-profile:v", "high",
    "-level", "4.1",
    "-preset", "medium",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-r", String(FPS),
    // Exactly the requested length: the frame count is fixed, so the container duration is too.
    "-frames:v", String(Math.round((o.total * TOTAL_TENTHS * FPS) / TOTAL_TENTHS)),
    "-movflags", "+faststart",
  );
  return args;
}

/** Blend length for a transition — capped so it can never eat a whole short scene. */
function transitionSeconds(clip: AssemblyClip): number {
  const max = Math.max(0.2, Math.min(0.8, clip.targetSeconds / 4));
  return clip.transition === "whip-pan" ? Math.min(0.3, max) : max;
}

function runFfmpeg(args: string[]): Promise<{ ok: boolean; error?: string }> {
  const bin = ffmpegPath() ?? "ffmpeg";
  return new Promise((resolve) => {
    let stderr = "";
    try {
      const child = spawn(bin, args);
      child.stderr.on("data", (d) => {
        stderr += String(d);
        // ffmpeg is extremely chatty; keep only the tail, which is where errors land.
        if (stderr.length > 8000) stderr = stderr.slice(-8000);
      });
      child.on("error", (err) => resolve({ ok: false, error: err.message }));
      child.on("close", (code) =>
        code === 0 ? resolve({ ok: true }) : resolve({ ok: false, error: lastMeaningfulLine(stderr) }),
      );
    } catch (err) {
      resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
}

function lastMeaningfulLine(stderr: string): string {
  const lines = stderr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^\s*(frame=|size=|video:|Stream mapping)/.test(l));
  return lines.slice(-3).join(" ") || stderr.slice(-300) || "ffmpeg exited non-zero";
}
