"use client";

/**
 * LABOUR COLONY ASSEMBLY ANIMATION — exporter (spec: "Video export" + "Export safety").
 *
 * Renders the deterministic timeline to a downloadable file, entirely in the browser, with progress,
 * cancellation and guaranteed resource release:
 *
 *   • WebM  — MediaRecorder over a MANUALLY driven canvas capture stream (`captureStream(0)` +
 *             `requestFrame()`). Frames are rendered at a DETERMINISTIC timeline time
 *             (frameIndex / fps) — never a wall-clock delta — composited (WebGL frame → 2D canvas →
 *             baked overlay) and paced against a FIXED schedule so the result plays back at real
 *             speed rather than in slow motion. Feature-detected before use.
 *   • PNG   — a dependency-free store-only ZIP of the frame sequence, or a single hero / current frame.
 *   • MP4   — NOT produced in-browser here; the UI labels it unavailable rather than mis-naming a WebM.
 *
 * Determinism: identical model + options + fps + resolution ⇒ identical frame CONTENT, because the
 * exporter drives the SAME imperative apply path the live scene uses
 * (AssemblyExportController.renderAt) and the same overlay drawer the live overlay mirrors. On
 * completion / cancel / error it always restores the interactive renderer and stops the capture stream.
 */

import { sampleCaption } from "./assemblyMotion";
import {
  drawAssemblyOverlay, overlayExtrasFor, DEFAULT_LABEL_OPTIONS, type OverlayLabelOptions,
} from "./assemblyOverlayDraw";
import { validateExportSettings } from "./validateAssemblyTimeline";
import type { AssemblyExportController } from "./AssemblyScene";
import type { AssemblyTimeline, ExportProgress, ExportResult, ExportSettings } from "./assemblyTypes";

export interface ExportRunArgs {
  controller: AssemblyExportController;
  timeline: AssemblyTimeline;
  settings: ExportSettings;
  /** Which annotation families to bake into the exported frames. Defaults to all on. */
  labels?: OverlayLabelOptions;
  onProgress: (p: ExportProgress) => void;
  signal: AbortSignal;
}

const WEBM_CANDIDATES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

/** Is in-browser WebM recording available at all? (used by the UI to gate the WebM option). */
export function isWebMSupported(): boolean {
  return typeof MediaRecorder !== "undefined"
    && typeof HTMLCanvasElement !== "undefined"
    && typeof HTMLCanvasElement.prototype.captureStream === "function"
    && WEBM_CANDIDATES.some((t) => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } });
}

/** MP4 is intentionally NOT produced here — surfaced to the UI so it never mis-labels a WebM. */
export const MP4_AVAILABLE = false;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const perfNow = (): number => (typeof performance !== "undefined" ? performance.now() : Date.now());
const abortIf = (signal: AbortSignal) => { if (signal.aborted) throw new DOMException("Export cancelled", "AbortError"); };

const slug = (s: string): string =>
  s.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "labour-colony";

function bitrateFor(w: number, h: number, fps: number, quality: ExportSettings["quality"]): number {
  const bpp = quality === "maximum" ? 0.2 : quality === "high" ? 0.13 : 0.08;
  return Math.min(40_000_000, Math.round(w * h * fps * bpp));
}

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("Failed to encode PNG frame.")); return; }
      blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf))).catch(reject);
    }, "image/png");
  });
}

/**
 * Composite one deterministic frame: WebGL render → 2D canvas → baked overlay. `bgFill`, when set,
 * paints an opaque backdrop first (WebM cannot carry alpha, so a transparent scene would else go
 * black). `keepCamera` renders the current on-screen camera (the "current frame" PNG).
 */
function composeFrame(
  controller: AssemblyExportController, ctx: CanvasRenderingContext2D, timeline: AssemblyTimeline,
  w: number, h: number, timeMs: number, drawOverlay: boolean, labels: OverlayLabelOptions,
  bgFill?: string, keepCamera?: boolean,
): void {
  const gl = controller.renderAt(timeMs, keepCamera);
  ctx.clearRect(0, 0, w, h);
  if (bgFill) { ctx.fillStyle = bgFill; ctx.fillRect(0, 0, w, h); }
  ctx.drawImage(gl, 0, 0, w, h);
  if (drawOverlay) {
    drawAssemblyOverlay(ctx, w, h, sampleCaption(timeline, timeMs), overlayExtrasFor(timeline, timeMs), labels);
  }
}

export async function runAssemblyExport(args: ExportRunArgs): Promise<ExportResult> {
  const { controller, timeline, settings, onProgress, signal } = args;
  const labels = args.labels ?? DEFAULT_LABEL_OPTIONS;
  const v = validateExportSettings(settings);
  if (!v.ok) throw new Error(v.errors.join(" "));

  const { width: w, height: h, fps, format } = settings;
  const drawOverlay = timeline.options.showLabels;

  onProgress({ phase: "preparing", frame: 0, totalFrames: 0, percent: 0, message: "Preparing renderer…" });

  // WebM cannot carry alpha; a transparent scene would encode as black, so composite over an opaque
  // studio backdrop for WebM (PNG keeps true alpha).
  const transparent = timeline.options.background === "transparent";
  const webmBgFill = format === "webm" && transparent ? "#eef2f6" : undefined;
  const compositor = document.createElement("canvas");
  compositor.width = w; compositor.height = h;
  const ctx = compositor.getContext("2d", { alpha: transparent && format !== "webm" });
  if (!ctx) throw new Error("2D canvas is unavailable in this browser.");

  controller.setSize(w, h);
  const base = `${slug(timeline.options.projectName)}-assembly`;

  try {
    if (format === "png-frame") {
      abortIf(signal);
      const timeMs = settings.frameMs ?? timeline.totalMs;
      onProgress({ phase: "rendering", frame: 1, totalFrames: 1, percent: 50 });
      composeFrame(controller, ctx, timeline, w, h, timeMs, drawOverlay, labels, undefined, settings.keepCamera);
      const bytes = await canvasToPngBytes(compositor);
      onProgress({ phase: "done", frame: 1, totalFrames: 1, percent: 100 });
      return result(new Blob([bytes], { type: "image/png" }), `${base}-${w}x${h}.png`, "png-frame", settings, 1, 0);
    }

    if (format === "png-sequence") {
      const totalFrames = Math.max(1, Math.ceil((timeline.totalMs / 1000) * fps));
      const files: { name: string; data: Uint8Array }[] = [];
      for (let f = 0; f < totalFrames; f++) {
        abortIf(signal);
        const timeMs = Math.min(timeline.totalMs, (f / fps) * 1000);
        composeFrame(controller, ctx, timeline, w, h, timeMs, drawOverlay, labels);
        files.push({ name: `frame_${`${f + 1}`.padStart(5, "0")}.png`, data: await canvasToPngBytes(compositor) });
        onProgress({ phase: "rendering", frame: f + 1, totalFrames, percent: Math.round(((f + 1) / totalFrames) * 96) });
        await delay(0); // yield so the progress UI + cancel stay responsive
      }
      onProgress({ phase: "finalizing", frame: totalFrames, totalFrames, percent: 98, message: "Packaging frames…" });
      const zip = buildStoreZip(files);
      onProgress({ phase: "done", frame: totalFrames, totalFrames, percent: 100 });
      return result(zip, `${base}-${w}x${h}-${fps}fps-frames.zip`, "png-sequence", settings, totalFrames, timeline.totalMs);
    }

    /* ---- WebM ---- */
    if (!isWebMSupported()) {
      throw new Error("In-browser WebM recording is not supported in this browser. Use the PNG frame sequence instead.");
    }
    const mimeType = WEBM_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
    const totalFrames = Math.max(1, Math.ceil((timeline.totalMs / 1000) * fps));
    const stream = compositor.captureStream(0); // 0 = manual frames
    const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrateFor(w, h, fps, settings.quality) });
    const chunks: BlobPart[] = [];
    let recError: Error | null = null;
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onerror = (e: Event) => { recError = (e as unknown as { error?: Error }).error ?? new Error("MediaRecorder failed."); };
    const stopped = new Promise<void>((res) => { recorder.onstop = () => res(); });

    const cleanupStream = () => {
      try { track.stop(); } catch { /* ignore */ }
      stream.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
    };

    try {
      recorder.start();
      const frameMs = 1000 / fps;
      // Pace to a FIXED wall-clock schedule (start + (f+1)/fps) rather than sleeping frameMs AFTER each
      // render — the latter adds render time to every interval and plays the video back in slow motion.
      const startWall = perfNow();
      for (let f = 0; f < totalFrames; f++) {
        abortIf(signal);
        if (recError) throw recError;
        const timeMs = Math.min(timeline.totalMs, (f / fps) * 1000);
        composeFrame(controller, ctx, timeline, w, h, timeMs, drawOverlay, labels, webmBgFill);
        track.requestFrame();
        onProgress({ phase: "rendering", frame: f + 1, totalFrames, percent: Math.round(((f + 1) / totalFrames) * 94) });
        const wait = startWall + (f + 1) * frameMs - perfNow();
        await delay(wait > 0 ? wait : 0);
      }
      onProgress({ phase: "encoding", frame: totalFrames, totalFrames, percent: 96, message: "Finalising video…" });
      if (recorder.state !== "inactive") recorder.stop();
      // never hang forever waiting for onstop — cap the wait, then use whatever chunks arrived
      await Promise.race([stopped, delay(10000)]);
      if (recError) throw recError;
    } catch (err) {
      try { if (recorder.state !== "inactive") recorder.stop(); } catch { /* ignore */ }
      cleanupStream();
      throw err;
    }
    cleanupStream();
    onProgress({ phase: "done", frame: totalFrames, totalFrames, percent: 100 });
    return result(new Blob(chunks, { type: mimeType }), `${base}-${w}x${h}-${fps}fps.webm`, "webm", settings, totalFrames, timeline.totalMs, mimeType);
  } finally {
    controller.restore();
  }
}

function result(
  blob: Blob, filename: string, format: ExportSettings["format"], settings: ExportSettings,
  frames: number, durationMs: number, mimeType = blob.type,
): ExportResult {
  return {
    format, blob, filename, width: settings.width, height: settings.height, fps: settings.fps,
    durationMs, frames, sizeBytes: blob.size, mimeType,
  };
}

/** Trigger a browser download for an export result. */
export function downloadExport(res: ExportResult): void {
  const url = URL.createObjectURL(res.blob);
  const a = document.createElement("a");
  a.href = url; a.download = res.filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ----------------------------------------------------------------- store-only ZIP -------------- */
/* A minimal, dependency-free ZIP writer (STORE method — PNGs are already compressed). Emits local file
 * headers + a central directory + the EOCD record; enough for the frame-sequence download. */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildStoreZip(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = enc.encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);   // local file header signature
    lv.setUint16(4, 20, true);           // version needed
    lv.setUint16(6, 0, true);            // flags
    lv.setUint16(8, 0, true);            // method = store
    lv.setUint16(10, 0, true);           // mod time
    lv.setUint16(12, 0x21, true);        // mod date (1980-01-01)
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);        // compressed size
    lv.setUint32(22, size, true);        // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);           // extra length
    local.set(nameBytes, 30);
    locals.push(local, file.data);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);   // central directory signature
    cv.setUint16(4, 20, true);           // version made by
    cv.setUint16(6, 20, true);           // version needed
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);           // method
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);      // local header offset
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length + size;
  }

  const centralSize = centrals.reduce((a, c) => a + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);     // EOCD signature
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);        // central directory offset
  return new Blob([...locals, ...centrals, eocd], { type: "application/zip" });
}
