/**
 * CONSTRUCTION ANIMATION STUDIO — the shared vocabulary.
 *
 * These types are imported by BOTH the browser workspace and the server routes, so this file
 * must stay free of `process.env`, node builtins and Supabase imports. Anything secret lives in
 * src/lib/animation/env.ts (server-only); anything provider-specific lives under providers/.
 *
 * The studio produces CONCEPT VISUALISATIONS. Nothing here models a structural drawing, a
 * quantity, a rate or a delivery promise, and no field in this file should ever be used to
 * imply one — see DISCLAIMER below, which is rendered on the page and stamped on every export
 * summary.
 */

/** The exported film is exactly this long. Not configurable — it is the product. */
export const TOTAL_DURATION_SECONDS = 30;

/** A single scene may not be shorter/longer than this once the storyboard is rebalanced. */
export const MIN_SCENE_SECONDS = 2;
export const MAX_SCENE_SECONDS = 12;

/**
 * The construction-specific negative prompt, applied to every scene by default.
 *
 * WORDING IS FIXED by the brief and is what stops the model redesigning the customer's house.
 * A user may ADD to it in the workspace; the base sentence is always prepended so a cleared
 * textarea cannot silently remove the geometry lock.
 */
export const BASE_NEGATIVE_PROMPT =
  "Do not distort the building geometry. Do not add extra floors, windows, doors, balconies, " +
  "columns, furniture or rooms. Avoid warped walls, curved straight lines, floating objects, " +
  "flickering materials, inconsistent openings, changing colours, text, logos, people, vehicles " +
  "and unrealistic structural movement.";

/** Shown beside every generated frame, on the share page and in the project summary. */
export const DISCLAIMER =
  "AI-generated concept visualisation. Not a structural drawing, not an approved design, and not " +
  "a guaranteed representation of the completed building. Materials, dimensions, openings and " +
  "finishes are confirmed only in the signed drawings and written specification.";

/* ------------------------------------------------------------------ *
 * Assets
 * ------------------------------------------------------------------ */

/**
 * What an uploaded image is FOR. `exterior` and `interior` are both REQUIRED before a render can
 * be submitted — the whole point of the tool is the exterior→interior journey, and a storyboard
 * built from one of them would invent the other.
 */
export type AssetRole = "exterior" | "interior" | "reference" | "floor_plan";

export const REQUIRED_ASSET_ROLES: AssetRole[] = ["exterior", "interior"];

export interface StudioAsset {
  id: string;
  role: AssetRole;
  /** Storage object path. NEVER a public URL — the bucket is private; the UI gets signed URLs. */
  storagePath: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  /** sha-256 of the bytes. Used to reject a duplicate upload of the same file into one project. */
  checksum: string;
  originalName: string;
  createdAt: string;
  /** Short-lived signed URL, attached by the API when it returns a project. Never persisted. */
  signedUrl?: string;
}

/* ------------------------------------------------------------------ *
 * Locked building features
 * ------------------------------------------------------------------ */

/**
 * The editable "Locked Building Features" panel.
 *
 * `confidence` matters: when no vision model is configured the analyser fills these from image
 * geometry + safe defaults and marks them `unverified`, and the UI says so in as many words. We
 * never print "3 floors detected" unless something actually detected it.
 */
export type FeatureConfidence = "detected" | "inferred" | "unverified" | "user";

export interface LockedFeature<T = string> {
  value: T;
  confidence: FeatureConfidence;
  /** Free text the analyser used to justify the value; shown as a tooltip. */
  note?: string;
}

export interface BuildingFeatures {
  floors: LockedFeature<number>;
  roofShape: LockedFeature<string>;
  facade: LockedFeature<string>;
  exteriorColours: LockedFeature<string>;
  windows: LockedFeature<string>;
  doors: LockedFeature<string>;
  balconies: LockedFeature<string>;
  proportions: LockedFeature<string>;
  interiorLayout: LockedFeature<string>;
  flooring: LockedFeature<string>;
  ceiling: LockedFeature<string>;
  wallFinish: LockedFeature<string>;
  furnitureStyle: LockedFeature<string>;
  lightingStyle: LockedFeature<string>;
  materials: LockedFeature<string>;
  /**
   * FALSE when the uploads do not establish a physically reliable route from the front door to
   * the interior shot. The storyboard then uses a professional cinematic transition instead of
   * inventing a hallway — see buildStoryboard().
   */
  continuityEstablished: LockedFeature<boolean>;
}

/* ------------------------------------------------------------------ *
 * Scenes
 * ------------------------------------------------------------------ */

export type CameraPresetId =
  | "slow-orbit"
  | "drone-reveal"
  | "crane-up"
  | "dolly-in"
  | "dolly-out"
  | "tracking-left-right"
  | "entrance-approach"
  | "interior-walkthrough"
  | "wide-angle-room-reveal"
  | "detail-close-up"
  | "day-to-evening"
  | "custom";

export type TransitionId = "cut" | "cross-dissolve" | "dip-to-white" | "match-cut" | "whip-pan";

export type SceneKind =
  | "exterior-establish"
  | "exterior-orbit"
  | "entrance-approach"
  | "threshold-transition"
  | "interior-walkthrough"
  | "exterior-hero"
  | "custom";

export type SceneStatus =
  | "draft"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface Keyframe {
  /** 0..1 through the scene. */
  at: number;
  /** What the camera/subject should be doing at that instant, in plain language. */
  instruction: string;
}

export interface StudioScene {
  id: string;
  index: number;
  title: string;
  kind: SceneKind;
  prompt: string;
  /** Filled by "Improve prompt". Kept separate so the user can always see their own words. */
  improvedPrompt: string | null;
  cameraPreset: CameraPresetId;
  cameraInstructions: string | null;
  /** 0..100. Mapped to provider-specific motion controls where the provider has one. */
  motionIntensity: number;
  transitionIn: TransitionId;
  durationSeconds: number;
  startAssetId: string | null;
  endAssetId: string | null;
  keyframes: Keyframe[];
  /** Per-scene seed. Shared across scenes by default so the building stays one building. */
  seed: number | null;
  /** A locked scene is skipped by "regenerate all" and by storyboard rebalancing where possible. */
  locked: boolean;
  status: SceneStatus;
  clipPath: string | null;
  clipDurationSeconds: number | null;
  clipSignedUrl?: string;
}

/* ------------------------------------------------------------------ *
 * Project
 * ------------------------------------------------------------------ */

export type AspectRatio = "16:9" | "9:16" | "1:1";
export type Resolution = "720p" | "1080p" | "4k";
export type TimeOfDay = "daylight" | "evening" | "night";
export type ProjectStatus =
  | "draft"
  | "analyzing"
  | "storyboard_ready"
  | "awaiting_approval"
  | "queued"
  | "generating"
  | "assembling"
  | "completed"
  | "failed"
  | "cancelled";

export type ApprovalStatus = "not_submitted" | "pending" | "approved" | "changes_requested";

export interface ProjectSettings {
  aspectRatio: AspectRatio;
  resolution: Resolution;
  timeOfDay: TimeOfDay;
  /** Extra text appended to BASE_NEGATIVE_PROMPT. The base is never removable. */
  extraNegativePrompt: string;
  /** One seed for the whole film unless a scene overrides it — this is the consistency lever. */
  seed: number | null;
  /** How many variations to request per scene. 1..4. */
  variations: number;
  /** Construction-stage mode animates foundation → frame → finish instead of a finished tour. */
  constructionStageMode: boolean;
  /** Room-by-room sequence, when the user wants the interior broken out by room. */
  roomSequence: string[];
  /** "Existing vs proposed" comparison — the exterior asset of the existing building. */
  comparisonAssetId: string | null;
  audio: {
    music: boolean;
    ambience: boolean;
    voiceoverScript: string;
    muted: boolean;
    /** 0..100 */
    volume: number;
  };
  branding: {
    /** When false the export is clean — no logo, no outro, no overlay of any kind. */
    enabled: boolean;
    logoAssetId: string | null;
    outroText: string;
  };
  annotations: { at: number; sceneId: string | null; text: string }[];
}

export interface StudioProject {
  id: string;
  publicId: string;
  title: string;
  status: ProjectStatus;
  approvalStatus: ApprovalStatus;
  features: BuildingFeatures;
  settings: ProjectSettings;
  assets: StudioAsset[];
  scenes: StudioScene[];
  shareSlug: string | null;
  shareEnabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Render jobs
 * ------------------------------------------------------------------ */

export type JobKind = "scene" | "assembly";
export type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface RenderJob {
  id: string;
  projectId: string;
  sceneId: string | null;
  kind: JobKind;
  provider: string;
  providerJobId: string | null;
  status: JobStatus;
  attempt: number;
  progress: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface StudioOutput {
  id: string;
  projectId: string;
  kind: "preview" | "final" | "poster";
  aspectRatio: AspectRatio;
  resolution: Resolution;
  storagePath: string;
  durationSeconds: number | null;
  /** What the server-side probe actually measured. The acceptance gate compares THIS to 30.000. */
  verifiedDurationSeconds: number | null;
  byteSize: number | null;
  createdAt: string;
  signedUrl?: string;
}

/* ------------------------------------------------------------------ *
 * API envelopes
 * ------------------------------------------------------------------ */

/**
 * The provider-configuration answer. `configured: false` is a first-class, fully-designed state —
 * the workspace renders "Video provider configuration required" with the exact variable names,
 * and every generate button is disabled. It never simulates a successful render.
 */
export interface ProviderConfigStatus {
  configured: boolean;
  providerId: string | null;
  providerLabel: string | null;
  /** Names ONLY. A value is never returned here. */
  missingEnv: string[];
  /** Every variable this provider reads, so an operator can set them all in one pass. */
  requiredEnv: string[];
  capabilities: {
    startFrame: boolean;
    endFrame: boolean;
    referenceImages: boolean;
    seed: boolean;
    negativePrompt: boolean;
    cancel: boolean;
    webhook: boolean;
    maxSceneSeconds: number;
    allowedDurationsSeconds: number[];
    aspectRatios: AspectRatio[];
    resolutions: Resolution[];
  } | null;
  /** Whether the server can concatenate clips into one exact-30s MP4 (ffmpeg present). */
  assemblyAvailable: boolean;
  /** Whether ffprobe is on the host. Assembly can still verify without it (MP4 container read). */
  ffprobeAvailable: boolean;
  /** Whether a vision model is available to genuinely analyse the uploads. */
  analysisAvailable: boolean;
  /**
   * Whether the animation_* tables actually exist and are reachable.
   *
   * Separate from "Supabase is configured": the credentials can be perfect while the migration has
   * not been applied, which is precisely the state a fresh deployment is in. Checked by a real
   * query, not by the presence of an env var.
   */
  databaseReady: boolean;

  /**
   * THE GATE. True only when a render could genuinely run end to end right now.
   *
   * The public Generate button is disabled unless this is true, because every one of these is a
   * hard prerequisite for producing a 30-second file: without the provider there is nothing to
   * render, without the database there is nowhere to record it, and without ffmpeg the clips can
   * never become one film. Showing an enabled button that fails at step three would be the
   * "fake progress" this feature exists not to have.
   */
  ready: boolean;
  /** Human-readable, ordered list of what is still missing. Empty when `ready` is true. */
  blockers: { id: "provider" | "database" | "ffmpeg"; message: string }[];
}
