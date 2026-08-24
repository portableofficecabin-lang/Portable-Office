/**
 * THE PROVIDER CONTRACT.
 *
 * Everything above this interface — routes, storyboard, job table, assembly, the workspace UI —
 * is provider-agnostic. Swapping Veo for another service is implementing this interface and
 * registering it in ./index.ts; nothing else changes.
 *
 * The interface is written around what video services ACTUALLY offer rather than a lowest common
 * denominator, and `capabilities` lets the workspace disable a control the selected provider
 * cannot honour instead of sending a field that will be silently ignored. A greyed-out
 * "end frame — not supported by this provider" is honest; a control that does nothing is not.
 */

import type { AspectRatio, Resolution } from "../types";

export interface ProviderCapabilities {
  startFrame: boolean;
  endFrame: boolean;
  referenceImages: boolean;
  seed: boolean;
  negativePrompt: boolean;
  cancel: boolean;
  webhook: boolean;
  /**
   * Longest single clip the provider will return.
   *
   * This is a HARD limit on scene length, not a hint: a storyboard scene longer than this cannot
   * be produced by one call, so the timeline caps scene duration here and the storyboard needs at
   * least ceil(30 / maxSceneSeconds) scenes to reach thirty seconds.
   */
  maxSceneSeconds: number;
  /**
   * The DISCRETE clip lengths the provider will produce, ascending — Veo accepts only 4, 6 or 8
   * seconds, not "any integer up to 8".
   *
   * This is the field that makes an exact 30-second export possible with such a provider: a 5.0s
   * scene is REQUESTED at the next length up (6s) and TRIMMED back to 5.0s at assembly. Always
   * rounding up means every clip is at least as long as its slot, so assembly only ever cuts —
   * it never has to pad, and the total can be hit exactly.
   *
   * An empty array means "any duration up to maxSceneSeconds".
   */
  allowedDurationsSeconds: number[];
  aspectRatios: AspectRatio[];
  resolutions: Resolution[];
}

/**
 * The clip length to ASK a provider for, given the length the storyboard needs.
 *
 * Rounds UP to the nearest supported length, because assembly can shorten a clip but cannot
 * invent frames. Falls back to the provider's maximum when the scene is longer than anything it
 * offers — the timeline prevents that, and this is the belt-and-braces.
 */
export function requestDurationFor(
  targetSeconds: number,
  capabilities: ProviderCapabilities,
): number {
  const ladder = capabilities.allowedDurationsSeconds;
  if (!ladder || ladder.length === 0) {
    return Math.max(1, Math.min(capabilities.maxSceneSeconds, Math.ceil(targetSeconds)));
  }
  const sorted = [...ladder].sort((a, b) => a - b);
  return sorted.find((d) => d >= targetSeconds - 1e-9) ?? sorted[sorted.length - 1];
}

/** An image handed to the provider. Bytes, not URLs — the storage bucket is private. */
export interface ProviderImage {
  bytes: Uint8Array;
  mimeType: string;
}

export interface SceneRequest {
  prompt: string;
  negativePrompt: string;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  /** Seconds. The adapter clamps to its own maximum and reports what it actually asked for. */
  durationSeconds: number;
  seed: number | null;
  /** 0..100 */
  motionIntensity: number;
  startImage: ProviderImage | null;
  endImage: ProviderImage | null;
  referenceImages: ProviderImage[];
  /** Opaque correlation id we generate — echoed back where the provider supports it. */
  clientRequestId: string;
  /** Where the provider should call back, when it supports webhooks. */
  webhookUrl: string | null;
}

export interface SubmitResult {
  providerJobId: string;
  /** What the provider actually accepted, which may be shorter than we asked for. */
  acceptedDurationSeconds: number;
  status: "queued" | "processing";
  /** Provider's own estimate, in credits or currency minor units. Null when it does not say. */
  estimatedCost: number | null;
  raw: unknown;
}

export interface ProviderClip {
  bytes: Uint8Array;
  mimeType: string;
  durationSeconds: number | null;
}

export interface PollResult {
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  /** 0..100 when the provider reports it. */
  progress: number | null;
  clip: ProviderClip | null;
  /** Safe to show the visitor — adapters must scrub any credential out of provider errors. */
  error: string | null;
  raw: unknown;
}

export interface VideoProvider {
  id: string;
  label: string;
  capabilities: ProviderCapabilities;
  /** Rough price signal for the "estimated cost before you start" step. Null when unknown. */
  estimateCost(scenes: number, totalSeconds: number, resolution: Resolution): number | null;
  /** Unit the estimate is expressed in, e.g. "credits" or "USD". */
  costUnit: string | null;
  submitScene(req: SceneRequest): Promise<SubmitResult>;
  pollScene(providerJobId: string): Promise<PollResult>;
  cancelScene(providerJobId: string): Promise<boolean>;
  /** Constant-time signature check. Returns false for anything it cannot positively verify. */
  verifyWebhook(rawBody: string, headers: Headers): boolean;
}

/** Thrown by adapters for an error the visitor may safely read. */
export class ProviderError extends Error {
  readonly retryable: boolean;
  readonly statusCode: number;
  constructor(message: string, opts: { retryable?: boolean; statusCode?: number } = {}) {
    super(message);
    this.name = "ProviderError";
    this.retryable = opts.retryable ?? false;
    this.statusCode = opts.statusCode ?? 502;
  }
}

/**
 * Strip anything credential-shaped out of a provider error before it reaches a browser.
 *
 * Provider errors routinely echo the request back, and a request can contain the key. This is the
 * last line before that text becomes an HTTP response body.
 */
export function scrubProviderError(input: unknown): string {
  const raw = input instanceof Error ? input.message : String(input ?? "Unknown provider error");
  return raw
    .replace(/(key|token|secret|password|authorization)["'\s:=]+[A-Za-z0-9._-]{8,}/gi, "$1=[redacted]")
    .replace(/\bAIza[0-9A-Za-z_-]{10,}/g, "[redacted]")
    .replace(/\bsb_(secret|publishable)_[A-Za-z0-9_-]{8,}/g, "[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]{8,}/gi, "Bearer [redacted]")
    .slice(0, 600);
}
