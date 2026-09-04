/**
 * GOOGLE VEO adapter — Gemini API long-running video generation.
 *
 * Called over plain `fetch`, deliberately with NO SDK dependency: this repo already calls
 * Razorpay over REST for the same supply-chain reason, and three HTTP calls do not justify a
 * package. The shapes below follow the documented `predictLongRunning` flow:
 *
 *   POST {base}/models/{model}:predictLongRunning   → { name: "operations/…" }
 *   GET  {base}/{operationName}                     → { done, response|error }
 *   GET  {file.uri}                                 → the mp4 bytes
 *
 * The API key travels in the `x-goog-api-key` header — never in the URL, because a URL ends up in
 * proxy logs, browser history and error strings, and a header does not.
 *
 * ── ALIGNED TO THE PUBLISHED API, 2026-08-24 ────────────────────────────────────────────────
 * Checked against ai.google.dev/gemini-api/docs/veo. The details that bite:
 *   • `durationSeconds` is a STRING enum of "4" | "6" | "8". Not a number, and not a range —
 *     asking for 5 is an invalid request, not a shorter clip.
 *   • `aspectRatio` is "16:9" | "9:16". There is no 1:1; a square export is produced by padding
 *     during assembly instead.
 *   • the count parameter is `numberOfVideos`, not `sampleCount`.
 *   • `personGeneration` accepts "allow_all" | "allow_adult" — there is no "dont_allow", so it is
 *     not sent at all; the negative prompt excludes people instead.
 *   • the API key travels in the `x-goog-api-key` HEADER, never the URL.
 *   • the finished video is at `.response.generateVideoResponse.generatedSamples[0].video.uri`
 *     and is downloaded with the same key header, following redirects.
 *
 * ── WHAT IS AND IS NOT VERIFIED ─────────────────────────────────────────────────────────────
 * The shapes above come from the documentation; this adapter has NOT been executed against the
 * live API, because no Veo credential exists in this repository or environment. scripts/
 * animation-live-check.ts exists precisely to close that gap the moment a key is available —
 * it drives submit → poll → download → assemble → ffprobe → upload for real.
 *
 * `parseOperation` is deliberately tolerant: it reads the video out of any of the response shapes
 * the API has used, and every unexpected payload raises a ProviderError naming what it received
 * rather than silently reporting success. Nothing in this feature reports a completed render that
 * did not produce bytes.
 */

import { readVeoEnv } from "../env";
import { arr, extractError, firstStr, get, isObject, num, path, safeJson, str } from "../json";
import {
  ProviderError,
  requestDurationFor,
  scrubProviderError,
  type PollResult,
  type ProviderCapabilities,
  type SceneRequest,
  type SubmitResult,
  type VideoProvider,
} from "./types";

/**
 * Veo produces clips of 4, 6 or 8 seconds — DISCRETE lengths, not a range. `durationSeconds` is
 * documented as accepting "4" | "6" | "8", so asking for 5 is not a shorter clip, it is an
 * invalid request. See requestDurationFor() and the assembly note in the file header.
 */
const ALLOWED_DURATIONS = [4, 6, 8];
const MAX_CLIP_SECONDS = 8;

const CAPABILITIES: ProviderCapabilities = {
  startFrame: true,
  endFrame: true,
  referenceImages: true,
  seed: true,
  negativePrompt: true,
  cancel: false, // the operations API exposes no cancel; we mark the job cancelled locally
  webhook: false, // Gemini long-running operations are polled, not pushed
  maxSceneSeconds: MAX_CLIP_SECONDS,
  allowedDurationsSeconds: ALLOWED_DURATIONS,
  /* 16:9 and 9:16 ONLY — the documented values. 1:1 is deliberately absent: Veo does not render
   * it, so a square export is produced by padding a 16:9 clip during assembly rather than by
   * asking for something the API will reject. resolveProviderAspectRatio() does that mapping. */
  aspectRatios: ["16:9", "9:16"],
  resolutions: ["720p", "1080p", "4k"],
};

/**
 * The aspect ratio to REQUEST for a project that wants `wanted`.
 *
 * A 1:1 project is generated at 16:9 and letterboxed into a square at assembly. That is honest —
 * the alternative is sending "1:1" and having every scene rejected — and it is invisible in the
 * result because assembly scales-and-pads rather than stretching.
 */
function resolveProviderAspectRatio(wanted: string): "16:9" | "9:16" {
  return wanted === "9:16" ? "9:16" : "16:9";
}

const toBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString("base64");

async function veoFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const env = readVeoEnv();
  if (!env) throw new ProviderError("Google Veo is not configured on this server.", { statusCode: 500 });
  const url = path.startsWith("http") ? path : `${env.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "x-goog-api-key": env.apiKey,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export const veoProvider: VideoProvider = {
  id: "google-veo",
  label: "Google Veo",
  capabilities: CAPABILITIES,
  costUnit: "credits",

  /**
   * Veo bills per generated second, and the published rate changes; this repo has no verified
   * rate card, so we report the SECONDS to be generated rather than inventing a rupee figure the
   * customer might treat as a quotation. The workspace labels it accordingly.
   */
  estimateCost(_scenes, totalSeconds) {
    return Math.ceil(totalSeconds);
  },

  async submitScene(req: SceneRequest): Promise<SubmitResult> {
    const env = readVeoEnv();
    if (!env) throw new ProviderError("Google Veo is not configured on this server.", { statusCode: 500 });

    /* Round the scene's length UP to a length Veo actually produces (4, 6 or 8). Assembly then
     * trims the returned clip back down to req.durationSeconds, which is how a 5.0s or 3.0s scene
     * ends up in a film that measures exactly 30.000s. Never round down: a short clip would have
     * to be padded, and padding a walkthrough shows as a frozen frame. */
    const seconds = requestDurationFor(req.durationSeconds, CAPABILITIES);

    const instance: Record<string, unknown> = { prompt: req.prompt };
    if (req.startImage) {
      instance.image = {
        bytesBase64Encoded: toBase64(req.startImage.bytes),
        mimeType: req.startImage.mimeType,
      };
    }
    if (req.endImage) {
      instance.lastFrame = {
        bytesBase64Encoded: toBase64(req.endImage.bytes),
        mimeType: req.endImage.mimeType,
      };
    }
    if (req.referenceImages.length > 0) {
      instance.referenceImages = req.referenceImages.slice(0, 3).map((img) => ({
        image: { bytesBase64Encoded: toBase64(img.bytes), mimeType: img.mimeType },
        referenceType: "asset",
      }));
    }

    /* Parameter names and value types follow the documented predictLongRunning body:
     *   aspectRatio      "16:9" | "9:16"           (NOT 1:1 — see resolveProviderAspectRatio)
     *   resolution       "720p" | "1080p" | "4k"
     *   durationSeconds  "4" | "6" | "8"           — a STRING enum, not a number
     *   numberOfVideos   1                         (this is the documented name, not sampleCount)
     *
     * `personGeneration` is deliberately NOT sent. The documented values for this model are
     * "allow_all" and "allow_adult"; there is no "dont_allow", and sending an unlisted enum is a
     * 400 rather than a stricter setting. People are excluded by the negative prompt instead,
     * which every scene carries. */
    const parameters: Record<string, unknown> = {
      aspectRatio: resolveProviderAspectRatio(req.aspectRatio),
      resolution: req.resolution,
      durationSeconds: String(seconds),
      negativePrompt: req.negativePrompt,
      numberOfVideos: 1,
    };
    if (req.seed !== null) parameters.seed = req.seed;

    let res: Response;
    try {
      res = await veoFetch(`/models/${encodeURIComponent(env.model)}:predictLongRunning`, {
        method: "POST",
        body: JSON.stringify({ instances: [instance], parameters }),
      });
    } catch (err) {
      throw new ProviderError(
        `Could not reach the video provider: ${scrubProviderError(err)}`,
        { retryable: true, statusCode: 502 },
      );
    }

    const body = await safeJson(res);
    if (!res.ok) {
      const message = extractError(body) ?? `Provider returned HTTP ${res.status}.`;
      throw new ProviderError(scrubProviderError(message), {
        // 429/5xx are worth retrying; a 4xx is our request being wrong and will fail identically.
        retryable: res.status === 429 || res.status >= 500,
        statusCode: res.status,
      });
    }

    const name = str(get(body, "name"));
    if (!name) {
      throw new ProviderError(
        "The video provider accepted the request but returned no operation id, so the render cannot be tracked.",
        { retryable: true },
      );
    }

    return {
      providerJobId: name,
      acceptedDurationSeconds: seconds,
      status: "queued",
      estimatedCost: seconds,
      raw: body,
    };
  },

  async pollScene(providerJobId: string): Promise<PollResult> {
    let res: Response;
    try {
      res = await veoFetch(`/${providerJobId.replace(/^\/+/, "")}`);
    } catch (err) {
      // A transient network failure is NOT a failed render — stay in `processing` and try again.
      return { status: "processing", progress: null, clip: null, error: null, raw: { transient: scrubProviderError(err) } };
    }

    const body = await safeJson(res);
    if (!res.ok) {
      if (res.status === 404) {
        return {
          status: "failed",
          progress: null,
          clip: null,
          error: "The provider no longer recognises this render job. Start it again.",
          raw: body,
        };
      }
      if (res.status === 429 || res.status >= 500) {
        return { status: "processing", progress: null, clip: null, error: null, raw: body };
      }
      return {
        status: "failed",
        progress: null,
        clip: null,
        error: scrubProviderError(extractError(body) ?? `Provider returned HTTP ${res.status}.`),
        raw: body,
      };
    }

    // Only an explicit `done: true` means finished. Anything else — including a missing field on
    // an unexpected payload — keeps the job running rather than reporting a result we do not have.
    if (get(body, "done") !== true) {
      return { status: "processing", progress: readProgress(body), clip: null, error: null, raw: body };
    }
    if (get(body, "error")) {
      return {
        status: "failed",
        progress: null,
        clip: null,
        error: scrubProviderError(extractError(body) ?? "The provider reported a failed generation."),
        raw: body,
      };
    }

    const found = parseOperation(body);
    if (!found) {
      return {
        status: "failed",
        progress: null,
        clip: null,
        error:
          "The provider reported the render complete but returned no video. This usually means the " +
          "prompt was blocked by its safety filter — edit the scene text and try again.",
        raw: body,
      };
    }

    if (found.kind === "inline") {
      return {
        status: "completed",
        progress: 100,
        clip: { bytes: found.bytes, mimeType: found.mimeType, durationSeconds: null },
        error: null,
        raw: body,
      };
    }

    // File URI: fetch the bytes with the same key. A download failure is retryable — the file
    // exists, so the job is not failed; the next poll tries again.
    try {
      /* The documented download is `curl -L -H "x-goog-api-key: …" "$uri"`. veoFetch supplies the
       * key header; `redirect: "follow"` is fetch's default and is the `-L` — the file URI serves
       * a redirect to signed storage, so without it we would save the redirect body, not the mp4. */
      const fileRes = await veoFetch(found.uri, { redirect: "follow" });
      if (!fileRes.ok) {
        return { status: "processing", progress: 95, clip: null, error: null, raw: { download: fileRes.status } };
      }
      const bytes = new Uint8Array(await fileRes.arrayBuffer());
      if (bytes.byteLength === 0) {
        return { status: "processing", progress: 95, clip: null, error: null, raw: { download: "empty" } };
      }
      return {
        status: "completed",
        progress: 100,
        clip: { bytes, mimeType: found.mimeType, durationSeconds: null },
        error: null,
        raw: body,
      };
    } catch (err) {
      return { status: "processing", progress: 95, clip: null, error: null, raw: { download: scrubProviderError(err) } };
    }
  },

  async cancelScene(): Promise<boolean> {
    // No cancel endpoint on the long-running operations API. The caller marks the job cancelled
    // locally and stops polling; returning false keeps the UI honest about what happened.
    return false;
  },

  verifyWebhook(): boolean {
    // No webhook support — an unsigned POST must never be trusted.
    return false;
  },
};

/* ------------------------------------------------------------------ helpers ---------------- */

function readProgress(body: unknown): number | null {
  const meta = get(body, "metadata");
  const pct =
    num(get(meta, "progressPercent")) ??
    num(get(meta, "progressPercentage")) ??
    num(get(meta, "progress"));
  return pct === null ? null : Math.max(0, Math.min(100, pct));
}

type Found =
  | { kind: "inline"; bytes: Uint8Array; mimeType: string }
  | { kind: "uri"; uri: string; mimeType: string };

/**
 * Pull the video out of a completed operation.
 *
 * Tolerant BY DESIGN. The generateVideoResponse payload has been published in more than one shape
 * (`generatedSamples[].video`, `generatedVideos[].video`, and a bare `videos[]`), and the value is
 * sometimes a `uri` and sometimes inline base64. Rather than pin one shape and break on the next
 * revision, this walks the response for the first node that carries either. Returning null is a
 * FAILURE path — never treated as success.
 */
function parseOperation(body: unknown): Found | null {
  const response = get(body, "response") ?? get(body, "result");
  if (!isObject(response)) return null;

  const containers: unknown[] = [
    ...arr(path(response, "generateVideoResponse", "generatedSamples")),
    ...arr(get(response, "generatedSamples")),
    ...arr(get(response, "generatedVideos")),
    ...arr(get(response, "videos")),
    ...arr(get(response, "predictions")),
  ];

  for (const node of containers) {
    const video = get(node, "video") ?? node;
    const mimeType = str(get(video, "mimeType")) ?? "video/mp4";

    const uri = firstStr(video, ["uri", "url"]) ?? str(get(node, "uri"));
    if (uri) return { kind: "uri", uri, mimeType };

    const b64 = firstStr(video, ["bytesBase64Encoded", "videoBytes"]) ?? str(get(node, "bytesBase64Encoded"));
    if (b64) return { kind: "inline", bytes: new Uint8Array(Buffer.from(b64, "base64")), mimeType };
  }
  return null;
}
