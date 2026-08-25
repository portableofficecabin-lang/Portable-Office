/**
 * ANIMATION STUDIO ENVIRONMENT — SERVER ONLY.
 *
 * Same discipline as src/lib/razorpay/env.ts, and for the same reason: a half-configured
 * integration must fail once, loudly, naming the variable — never half-work, and never pretend.
 *
 * ── THE RULE: NAMES, NEVER VALUES ───────────────────────────────────────────────────────────
 * Everything exported here returns variable NAMES. No value is ever logged, returned in an HTTP
 * response, or sent to the browser. None of these variables carries a NEXT_PUBLIC_ prefix, so
 * Next.js also refuses to inline them client-side — this is defence in depth on top of that.
 *
 * ── NO PROVIDER CONFIGURED IS A SUPPORTED STATE ─────────────────────────────────────────────
 * When nothing is set, /api/animation-studio/config answers `configured: false` with the exact
 * list below and the workspace renders "Video provider configuration required". Uploads, image
 * validation, storage, analysis, the storyboard editor and project save/resume all still work.
 * The only thing that stops is submitting a render — because there is nowhere to submit it to.
 */

const present = (v: string | undefined): boolean => typeof v === "string" && v.trim().length > 0;
const read = (name: string): string => (process.env[name] ?? "").trim();

/* ------------------------------------------------------------------ *
 * Video generation
 * ------------------------------------------------------------------ */

export type ProviderId = "google-veo" | "generic";

/** Which provider the operator selected. Defaults to Veo when a Veo key alone is present. */
export function selectedProviderId(): ProviderId | null {
  const explicit = read("VIDEO_PROVIDER").toLowerCase();
  if (explicit === "google-veo" || explicit === "veo" || explicit === "google") return "google-veo";
  if (explicit === "generic" || explicit === "custom") return "generic";
  if (explicit) return null; // an unrecognised value is a configuration error, not a default

  // No explicit selection: infer from whichever credential set is complete.
  if (present(process.env.GEMINI_API_KEY) || present(process.env.GOOGLE_VEO_API_KEY)) return "google-veo";
  if (present(process.env.VIDEO_PROVIDER_BASE_URL) && present(process.env.VIDEO_PROVIDER_API_KEY)) {
    return "generic";
  }
  return null;
}

/** Every variable a given provider reads — shown to the operator so it can be set in one pass. */
export function requiredEnvFor(provider: ProviderId | null): string[] {
  if (provider === "google-veo") {
    // GEMINI_API_KEY first: it is the name the Gemini API documentation uses, so it is what an
    // operator following those docs will already have set.
    return ["VIDEO_PROVIDER", "GEMINI_API_KEY", "GEMINI_VIDEO_MODEL"];
  }
  if (provider === "generic") {
    return [
      "VIDEO_PROVIDER",
      "VIDEO_PROVIDER_BASE_URL",
      "VIDEO_PROVIDER_API_KEY",
      "VIDEO_PROVIDER_SUBMIT_PATH",
      "VIDEO_PROVIDER_STATUS_PATH",
      "VIDEO_PROVIDER_WEBHOOK_SECRET",
    ];
  }
  // Nothing selected: show the minimum viable set for the recommended provider.
  return ["VIDEO_PROVIDER", "GEMINI_API_KEY"];
}

/** Names of the variables the SELECTED provider needs but does not have. */
export function missingVideoEnv(): string[] {
  const provider = selectedProviderId();
  if (!provider) return requiredEnvFor(null);

  if (provider === "google-veo") {
    // The model name has a documented default, so it is not "missing" when unset. Either key
    // variable satisfies the requirement; the message names the preferred one.
    return [
      !present(process.env.GEMINI_API_KEY) && !present(process.env.GOOGLE_VEO_API_KEY) && "GEMINI_API_KEY",
    ].filter((x): x is string => typeof x === "string");
  }

  return [
    !present(process.env.VIDEO_PROVIDER_BASE_URL) && "VIDEO_PROVIDER_BASE_URL",
    !present(process.env.VIDEO_PROVIDER_API_KEY) && "VIDEO_PROVIDER_API_KEY",
  ].filter((x): x is string => typeof x === "string");
}

export interface VeoEnv {
  apiKey: string;
  model: string;
  baseUrl: string;
}

/** Documented default. Overridable so a model upgrade is a config change, not a code change. */
const DEFAULT_VEO_MODEL = "veo-3.1-generate-preview";
const DEFAULT_VEO_BASE = "https://generativelanguage.googleapis.com/v1beta";

export function readVeoEnv(): VeoEnv | null {
  /* GEMINI_API_KEY is the documented name and is checked FIRST. GOOGLE_VEO_API_KEY is retained
   * only for backward compatibility with the variable this feature originally shipped with — a
   * deployment that already set it keeps working, and nothing has to be renamed during a deploy.
   * Same for the model and base-url pairs. */
  const apiKey = read("GEMINI_API_KEY") || read("GOOGLE_VEO_API_KEY");
  if (!apiKey) return null;
  return {
    apiKey,
    model: read("GEMINI_VIDEO_MODEL") || read("GOOGLE_VEO_MODEL") || DEFAULT_VEO_MODEL,
    baseUrl: read("GEMINI_API_BASE_URL") || read("GOOGLE_VEO_BASE_URL") || DEFAULT_VEO_BASE,
  };
}

export interface GenericProviderEnv {
  baseUrl: string;
  apiKey: string;
  submitPath: string;
  statusPath: string;
  cancelPath: string | null;
  webhookSecret: string | null;
  /** Header the key is sent in. Defaults to `Authorization: Bearer <key>`. */
  authHeader: string;
  authScheme: string;
}

export function readGenericEnv(): GenericProviderEnv | null {
  const baseUrl = read("VIDEO_PROVIDER_BASE_URL");
  const apiKey = read("VIDEO_PROVIDER_API_KEY");
  if (!baseUrl || !apiKey) return null;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    submitPath: read("VIDEO_PROVIDER_SUBMIT_PATH") || "/v1/videos",
    statusPath: read("VIDEO_PROVIDER_STATUS_PATH") || "/v1/videos/{id}",
    cancelPath: read("VIDEO_PROVIDER_CANCEL_PATH") || null,
    webhookSecret: read("VIDEO_PROVIDER_WEBHOOK_SECRET") || null,
    authHeader: read("VIDEO_PROVIDER_AUTH_HEADER") || "Authorization",
    authScheme: read("VIDEO_PROVIDER_AUTH_SCHEME") || "Bearer",
  };
}

/* ------------------------------------------------------------------ *
 * Vision analysis (optional, separate credential)
 * ------------------------------------------------------------------ */

export interface AnalysisEnv {
  apiKey: string;
  model: string;
  baseUrl: string;
}

const DEFAULT_ANALYSIS_MODEL = "gemini-2.5-flash";

/**
 * The vision model used to READ the uploaded images.
 *
 * Optional on purpose. Without it the studio still works: the Locked Building Features panel is
 * pre-filled with reference-copying defaults marked `unverified`, and the panel says plainly that
 * nothing was detected and the visitor should correct it. That is a legitimate product state; a
 * fabricated "detected: 3 floors" would not be.
 */
export function readAnalysisEnv(): AnalysisEnv | null {
  const apiKey = read("BUILDING_ANALYSIS_API_KEY") || read("GEMINI_API_KEY") || read("GOOGLE_VEO_API_KEY");
  if (!apiKey) return null;
  return {
    apiKey,
    model: read("BUILDING_ANALYSIS_MODEL") || DEFAULT_ANALYSIS_MODEL,
    baseUrl: read("BUILDING_ANALYSIS_BASE_URL") || DEFAULT_VEO_BASE,
  };
}

export function analysisConfigured(): boolean {
  return readAnalysisEnv() !== null;
}

/* ------------------------------------------------------------------ *
 * Storage + server identity
 * ------------------------------------------------------------------ */

/** Private Supabase Storage bucket holding uploads, clips and finished exports. */
export const STUDIO_BUCKET = read("ANIMATION_STUDIO_BUCKET") || "animation-studio";

export interface StudioServerEnv {
  supabaseUrl: string;
  serviceKey: string;
}

export function missingStudioEnv(): string[] {
  return [
    !present(process.env.NEXT_PUBLIC_SUPABASE_URL) && "NEXT_PUBLIC_SUPABASE_URL",
    !present(process.env.SUPABASE_SERVICE_ROLE_KEY) && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter((x): x is string => typeof x === "string");
}

export function readStudioEnv(): StudioServerEnv | null {
  if (missingStudioEnv().length > 0) return null;
  return {
    supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL"),
    serviceKey: read("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

/**
 * Secret used to sign the anonymous visitor's project-ownership cookie.
 *
 * Falls back to the service-role key so the feature is not dead on a server that has not set it —
 * the cookie is an ownership token for concept videos, not a credential, and reusing an existing
 * server secret as an HMAC key is safer than shipping a hardcoded default. Set the dedicated
 * variable in production so rotating one does not rotate the other.
 */
export function studioSessionSecret(): string | null {
  return read("ANIMATION_STUDIO_SESSION_SECRET") || read("SUPABASE_SERVICE_ROLE_KEY") || null;
}

/** Absolute path to an ffmpeg binary, when the host provides one. */
export function ffmpegPath(): string | null {
  return read("FFMPEG_PATH") || null;
}
export function ffprobePath(): string | null {
  return read("FFPROBE_PATH") || null;
}

/** The message shown when a render is attempted with no provider configured. */
export function providerMisconfiguredMessage(missing: string[]): string {
  return (
    "Video provider configuration required. This server has no video-generation provider " +
    `configured, so no render can be started. Missing server environment variables: ${missing.join(", ")}.`
  );
}
