/**
 * SERVER-SIDE MEDIA PROBE — "is this file actually 30 seconds?"
 *
 * The acceptance criterion is that the exported MP4 is exactly 30 seconds. A number we computed
 * ourselves cannot prove that; only measuring the finished file can. So every export is probed
 * here before it is offered for download, and a file that does not measure 30s within one frame
 * marks the job FAILED with the measured value in the error. It is never rounded into compliance.
 *
 * TWO IMPLEMENTATIONS, in preference order:
 *
 *   1. ffprobe, when the host has it (FFPROBE_PATH, or `ffprobe` on PATH). Authoritative.
 *   2. A native ISO-BMFF reader — parses the `mvhd` box out of the MP4 container and divides
 *      duration by timescale. This is the same field ffprobe reads for container duration, so it
 *      is an equivalent server-side measurement, not an approximation. It exists because the
 *      production image (node:20-alpine, see Dockerfile) ships no ffmpeg, and a feature that
 *      silently skipped its own acceptance check on production would be worse than useless.
 *
 * Both return `source` so the operator can see which one measured a given file.
 */

import { spawn } from "node:child_process";

import { ffprobePath } from "./env";

export interface ProbeResult {
  durationSeconds: number | null;
  source: "ffprobe" | "mp4-container" | "none";
  /** Present when nothing could measure the file. */
  error?: string;
  width?: number | null;
  height?: number | null;
}

/**
 * Measure a video file's duration from its bytes.
 *
 * `filePath` is optional and only used by the ffprobe path — ffprobe can read a pipe, but reading
 * a seekable file is far more reliable for MP4 (the moov atom may be at the end).
 */
export async function probeDuration(bytes: Uint8Array, filePath?: string): Promise<ProbeResult> {
  if (filePath) {
    const viaFfprobe = await tryFfprobe(filePath);
    if (viaFfprobe) return viaFfprobe;
  }

  const container = readMp4Duration(bytes);
  if (container !== null) {
    const dims = readMp4Dimensions(bytes);
    return { durationSeconds: container, source: "mp4-container", width: dims?.width ?? null, height: dims?.height ?? null };
  }

  return {
    durationSeconds: null,
    source: "none",
    error:
      "The exported file could not be measured: no ffprobe on this host and no readable MP4 " +
      "movie header in the file. Set FFPROBE_PATH, or check the provider returned a valid MP4.",
  };
}

/** True when ffprobe is usable on this host. Cached — the answer cannot change mid-process. */
let ffprobeAvailable: boolean | null = null;

export async function hasFfprobe(): Promise<boolean> {
  if (ffprobeAvailable !== null) return ffprobeAvailable;
  const bin = ffprobePath() ?? "ffprobe";
  ffprobeAvailable = await new Promise<boolean>((resolve) => {
    try {
      const child = spawn(bin, ["-version"], { stdio: "ignore" });
      child.on("error", () => resolve(false));
      child.on("close", (code) => resolve(code === 0));
    } catch {
      resolve(false);
    }
  });
  return ffprobeAvailable;
}

async function tryFfprobe(filePath: string): Promise<ProbeResult | null> {
  if (!(await hasFfprobe())) return null;
  const bin = ffprobePath() ?? "ffprobe";
  return new Promise<ProbeResult | null>((resolve) => {
    const args = [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "format=duration:stream=width,height",
      "-of", "json",
      filePath,
    ];
    let out = "";
    try {
      const child = spawn(bin, args);
      child.stdout.on("data", (d) => {
        out += String(d);
      });
      child.on("error", () => resolve(null));
      child.on("close", (code) => {
        if (code !== 0) return resolve(null);
        try {
          const parsed = JSON.parse(out);
          const duration = Number(parsed?.format?.duration);
          const stream = Array.isArray(parsed?.streams) ? parsed.streams[0] : null;
          if (!Number.isFinite(duration)) return resolve(null);
          resolve({
            durationSeconds: duration,
            source: "ffprobe",
            width: Number.isFinite(stream?.width) ? stream.width : null,
            height: Number.isFinite(stream?.height) ? stream.height : null,
          });
        } catch {
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
  });
}

/* ------------------------------------------------------------------ *
 * ISO base media file format reader
 * ------------------------------------------------------------------ */

const readU32 = (b: Uint8Array, o: number): number =>
  ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

function readU64(b: Uint8Array, o: number): number {
  // Durations here are seconds-scale; the high word is 0 in every real file. Reading it as a
  // Number would lose precision above 2^53, which cannot occur for a 30-second video.
  const hi = readU32(b, o);
  const lo = readU32(b, o + 4);
  return hi * 2 ** 32 + lo;
}

interface Box {
  type: string;
  start: number;
  /** First byte of the payload. */
  bodyStart: number;
  /** One past the last byte of the box. */
  end: number;
}

/** Walk the boxes at one level of the tree. */
function* boxes(b: Uint8Array, from: number, to: number): Generator<Box> {
  let offset = from;
  while (offset + 8 <= to) {
    let size = readU32(b, offset);
    const type = String.fromCharCode(b[offset + 4], b[offset + 5], b[offset + 6], b[offset + 7]);
    let bodyStart = offset + 8;
    if (size === 1) {
      if (offset + 16 > to) return;
      size = readU64(b, offset + 8);
      bodyStart = offset + 16;
    } else if (size === 0) {
      size = to - offset; // "to end of file"
    }
    if (size < 8 || offset + size > to) return;
    yield { type, start: offset, bodyStart, end: offset + size };
    offset += size;
  }
}

function findBox(b: Uint8Array, from: number, to: number, type: string): Box | null {
  for (const box of boxes(b, from, to)) if (box.type === type) return box;
  return null;
}

/**
 * Container duration from `moov > mvhd`.
 *
 * mvhd layout: version(1) flags(3) then, for version 0, creation(4) modification(4) timescale(4)
 * duration(4); for version 1 the four fields are 8/8/4/8. timescale is ticks per second.
 */
export function readMp4Duration(bytes: Uint8Array): number | null {
  const moov = findBox(bytes, 0, bytes.length, "moov");
  if (!moov) return null;
  const mvhd = findBox(bytes, moov.bodyStart, moov.end, "mvhd");
  if (!mvhd) return null;

  const o = mvhd.bodyStart;
  const version = bytes[o];
  let timescale: number;
  let duration: number;
  if (version === 1) {
    if (o + 4 + 8 + 8 + 4 + 8 > mvhd.end) return null;
    timescale = readU32(bytes, o + 4 + 16);
    duration = readU64(bytes, o + 4 + 20);
  } else {
    if (o + 4 + 4 + 4 + 4 + 4 > mvhd.end) return null;
    timescale = readU32(bytes, o + 4 + 8);
    duration = readU32(bytes, o + 4 + 12);
  }
  if (!timescale) return null;
  return duration / timescale;
}

/** Visual track dimensions from `moov > trak > tkhd` (the width/height 16.16 fixed-point pair). */
export function readMp4Dimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const moov = findBox(bytes, 0, bytes.length, "moov");
  if (!moov) return null;
  for (const trak of boxes(bytes, moov.bodyStart, moov.end)) {
    if (trak.type !== "trak") continue;
    const tkhd = findBox(bytes, trak.bodyStart, trak.end, "tkhd");
    if (!tkhd) continue;
    const version = bytes[tkhd.bodyStart];
    // width/height are the LAST 8 bytes of the tkhd payload in both versions.
    const wOff = tkhd.end - 8;
    if (wOff < tkhd.bodyStart) continue;
    const width = readU32(bytes, wOff) / 65536;
    const height = readU32(bytes, wOff + 4) / 65536;
    if (width > 0 && height > 0) return { width: Math.round(width), height: Math.round(height) };
    void version;
  }
  return null;
}

/** True when the bytes look like an ISO-BMFF/MP4 file — used to reject a provider's error page. */
export function looksLikeMp4(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const type = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  return type === "ftyp" || type === "moov" || type === "mdat";
}
