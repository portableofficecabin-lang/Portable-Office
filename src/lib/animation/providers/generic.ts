/**
 * GENERIC REST adapter — the provider-agnostic escape hatch.
 *
 * Most hosted video services expose the same three operations behind different URLs: POST a job,
 * GET its status, GET the file. This adapter drives that shape entirely from environment
 * variables, so a provider can be swapped in WITHOUT writing an adapter or redeploying code:
 *
 *   VIDEO_PROVIDER=generic
 *   VIDEO_PROVIDER_BASE_URL=https://api.example.com
 *   VIDEO_PROVIDER_API_KEY=...
 *   VIDEO_PROVIDER_SUBMIT_PATH=/v1/videos            (POST)
 *   VIDEO_PROVIDER_STATUS_PATH=/v1/videos/{id}       (GET, {id} substituted)
 *   VIDEO_PROVIDER_CANCEL_PATH=/v1/videos/{id}/cancel (POST, optional)
 *   VIDEO_PROVIDER_WEBHOOK_SECRET=...                (optional; enables the webhook route)
 *
 * Request and response are read leniently — an id is looked for under the half-dozen names these
 * APIs actually use, and a status string is mapped through one table. Where the payload cannot be
 * understood the job FAILS with what was received; it is never reported as complete.
 *
 * Images are sent as base64 data URLs in the JSON body. That is the one shape every provider in
 * this class accepts; a provider needing multipart needs its own adapter, which is a 150-line
 * file next to this one.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import { readGenericEnv } from "../env";
import { arr, extractError, firstStr, get, num, path, safeJson, str } from "../json";
import {
  ProviderError,
  scrubProviderError,
  type PollResult,
  type ProviderCapabilities,
  type ProviderImage,
  type SceneRequest,
  type SubmitResult,
  type VideoProvider,
} from "./types";

const CAPABILITIES: ProviderCapabilities = {
  startFrame: true,
  endFrame: true,
  referenceImages: true,
  seed: true,
  negativePrompt: true,
  cancel: true,
  webhook: true,
  maxSceneSeconds: 10,
  /* Empty = "any length up to maxSceneSeconds". An arbitrary provider has no knowable duration
   * ladder, so we ask for exactly what the scene needs and let assembly trim any overrun. If a
   * particular provider turns out to quantise like Veo does, list its lengths here. */
  allowedDurationsSeconds: [],
  aspectRatios: ["16:9", "9:16", "1:1"],
  resolutions: ["720p", "1080p", "4k"],
};

const dataUrl = (img: ProviderImage): string =>
  `data:${img.mimeType};base64,${Buffer.from(img.bytes).toString("base64")}`;

function authHeaders(): Record<string, string> {
  const env = readGenericEnv();
  if (!env) throw new ProviderError("No video provider is configured on this server.", { statusCode: 500 });
  const value = env.authScheme ? `${env.authScheme} ${env.apiKey}` : env.apiKey;
  return { [env.authHeader]: value, "Content-Type": "application/json", Accept: "application/json" };
}

export const genericProvider: VideoProvider = {
  id: "generic",
  label: process.env.VIDEO_PROVIDER_LABEL?.trim() || "Configured video provider",
  capabilities: CAPABILITIES,
  costUnit: "credits",

  estimateCost(scenes, totalSeconds) {
    // No rate card is knowable for an arbitrary provider, so report the work requested rather
    // than a currency figure a customer could mistake for a quotation.
    return Math.ceil(totalSeconds) + scenes;
  },

  async submitScene(req: SceneRequest): Promise<SubmitResult> {
    const env = readGenericEnv();
    if (!env) throw new ProviderError("No video provider is configured on this server.", { statusCode: 500 });

    const seconds = Math.max(1, Math.min(CAPABILITIES.maxSceneSeconds, Math.round(req.durationSeconds)));
    const payload: Record<string, unknown> = {
      prompt: req.prompt,
      negative_prompt: req.negativePrompt,
      aspect_ratio: req.aspectRatio,
      resolution: req.resolution,
      duration_seconds: seconds,
      motion_intensity: req.motionIntensity,
      client_request_id: req.clientRequestId,
    };
    if (req.seed !== null) payload.seed = req.seed;
    if (req.startImage) payload.start_image = dataUrl(req.startImage);
    if (req.endImage) payload.end_image = dataUrl(req.endImage);
    if (req.referenceImages.length > 0) payload.reference_images = req.referenceImages.map(dataUrl);
    if (req.webhookUrl && env.webhookSecret) payload.webhook_url = req.webhookUrl;

    let res: Response;
    try {
      res = await fetch(`${env.baseUrl}${env.submitPath}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new ProviderError(`Could not reach the video provider: ${scrubProviderError(err)}`, {
        retryable: true,
      });
    }

    const body = await safeJson(res);
    if (!res.ok) {
      throw new ProviderError(scrubProviderError(extractError(body) ?? `Provider returned HTTP ${res.status}.`), {
        retryable: res.status === 429 || res.status >= 500,
        statusCode: res.status,
      });
    }

    const providerJobId = pickId(body);
    if (!providerJobId) {
      throw new ProviderError(
        "The provider accepted the request but returned no job id, so the render cannot be tracked. " +
          "Check VIDEO_PROVIDER_SUBMIT_PATH points at a job-creating endpoint.",
        { retryable: false },
      );
    }

    return {
      providerJobId,
      acceptedDurationSeconds: numberOr(num(get(body, "duration_seconds")) ?? num(get(body, "duration")), seconds),
      status: mapStatus(get(body, "status")) === "processing" ? "processing" : "queued",
      estimatedCost: num(get(body, "cost")) ?? num(get(body, "credits")) ?? num(get(body, "estimated_cost")),
      raw: body,
    };
  },

  async pollScene(providerJobId: string): Promise<PollResult> {
    const env = readGenericEnv();
    if (!env) throw new ProviderError("No video provider is configured on this server.", { statusCode: 500 });

    const url = `${env.baseUrl}${env.statusPath.replace("{id}", encodeURIComponent(providerJobId))}`;
    let res: Response;
    try {
      res = await fetch(url, { headers: authHeaders() });
    } catch (err) {
      return { status: "processing", progress: null, clip: null, error: null, raw: { transient: scrubProviderError(err) } };
    }

    const body = await safeJson(res);
    if (!res.ok) {
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

    const status = mapStatus(get(body, "status") ?? get(body, "state"));
    const progress = num(get(body, "progress")) ?? num(get(body, "percent")) ?? num(get(body, "progress_percent"));

    if (status !== "completed") {
      return {
        status,
        progress,
        clip: null,
        error: status === "failed" ? scrubProviderError(extractError(body) ?? "The provider reported a failed render.") : null,
        raw: body,
      };
    }

    const videoUrl = pickVideoUrl(body);
    const inline = pickInlineVideo(body);
    if (inline) {
      return {
        status: "completed",
        progress: 100,
        clip: { bytes: inline, mimeType: "video/mp4", durationSeconds: num(get(body, "duration_seconds")) },
        error: null,
        raw: body,
      };
    }
    if (!videoUrl) {
      return {
        status: "failed",
        progress: null,
        clip: null,
        error:
          "The provider reported the render complete but returned no video URL. Check the provider's " +
          "response shape against VIDEO_PROVIDER_STATUS_PATH.",
        raw: body,
      };
    }

    try {
      // The asset URL is usually pre-signed and public; send the key anyway for providers that
      // require it. A download failure keeps the job in `processing` so the next poll retries.
      const fileRes = await fetch(videoUrl, { headers: authHeaders() });
      if (!fileRes.ok) return { status: "processing", progress: 95, clip: null, error: null, raw: { download: fileRes.status } };
      const bytes = new Uint8Array(await fileRes.arrayBuffer());
      if (bytes.byteLength === 0) return { status: "processing", progress: 95, clip: null, error: null, raw: { download: "empty" } };
      return {
        status: "completed",
        progress: 100,
        clip: {
          bytes,
          mimeType: fileRes.headers.get("content-type") ?? "video/mp4",
          durationSeconds: num(get(body, "duration_seconds")),
        },
        error: null,
        raw: body,
      };
    } catch (err) {
      return { status: "processing", progress: 95, clip: null, error: null, raw: { download: scrubProviderError(err) } };
    }
  },

  async cancelScene(providerJobId: string): Promise<boolean> {
    const env = readGenericEnv();
    if (!env?.cancelPath) return false;
    try {
      const res = await fetch(
        `${env.baseUrl}${env.cancelPath.replace("{id}", encodeURIComponent(providerJobId))}`,
        { method: "POST", headers: authHeaders() },
      );
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * HMAC-SHA256 over the RAW body, compared in constant time.
   *
   * Returns false for anything it cannot positively verify — no secret, no header, wrong length.
   * An unverified webhook must never move a job to `completed`: that is the one path where a
   * stranger could otherwise write to our database.
   */
  verifyWebhook(rawBody: string, headers: Headers): boolean {
    const env = readGenericEnv();
    if (!env?.webhookSecret) return false;
    const provided =
      headers.get("x-signature") ??
      headers.get("x-webhook-signature") ??
      headers.get("x-hub-signature-256") ??
      "";
    if (!provided) return false;
    const clean = provided.replace(/^sha256=/i, "").trim();
    const expected = createHmac("sha256", env.webhookSecret).update(rawBody, "utf8").digest("hex");
    const a = Buffer.from(clean, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  },
};

/* ------------------------------------------------------------------ helpers ---------------- */

const numberOr = (v: unknown, fallback: number): number => num(v) ?? fallback;

const ID_KEYS = ["id", "job_id", "jobId", "task_id", "taskId", "request_id", "requestId", "name", "uuid"];

function pickId(body: unknown): string | null {
  return firstStr(body, ID_KEYS) ?? firstStr(get(body, "data"), ID_KEYS);
}

/**
 * The finished video's URL.
 *
 * Only an absolute http(s) URL is accepted. A relative path or a `file://` would otherwise be
 * handed straight to fetch() from a server that can reach internal hosts — this check is the
 * thing standing between a hostile provider response and an SSRF.
 */
function pickVideoUrl(body: unknown): string | null {
  const output = get(body, "output");
  const candidates: (string | null)[] = [
    firstStr(body, ["video_url", "videoUrl", "url"]),
    firstStr(output, ["url", "video_url"]),
    str(arr(output)[0]),
    str(path(body, "result", "url")),
    str(path(body, "assets", "video")),
    str(path(body, "data", "video_url")),
  ];
  for (const candidate of candidates) {
    if (candidate && /^https:\/\//i.test(candidate)) return candidate;
  }
  return null;
}

function pickInlineVideo(body: unknown): Uint8Array | null {
  const b64 =
    firstStr(body, ["video_base64", "videoBase64"]) ?? str(path(body, "output", "video_base64"));
  if (b64 && b64.length > 64) return new Uint8Array(Buffer.from(b64, "base64"));
  return null;
}

/** Every status word these APIs use, folded onto our five. Unknown → processing, never completed. */
function mapStatus(raw: unknown): PollResult["status"] {
  const s = String(raw ?? "").toLowerCase();
  if (["completed", "succeeded", "success", "done", "finished", "complete"].includes(s)) return "completed";
  if (["failed", "error", "errored", "failure"].includes(s)) return "failed";
  if (["cancelled", "canceled", "aborted"].includes(s)) return "cancelled";
  if (["queued", "pending", "waiting", "submitted", "created", "starting"].includes(s)) return "queued";
  return "processing";
}
