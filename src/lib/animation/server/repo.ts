/**
 * ANIMATION STUDIO DATA ACCESS — SERVER ONLY.
 *
 * One module owns every read and write to the animation_* tables and the private storage bucket,
 * for the same reason src/lib/supabase/admin.ts exists: the service-role key bypasses RLS, so the
 * fewer places that hold it, the smaller the surface that can leak it.
 *
 * The row ⇄ domain-object mapping also lives here rather than in the routes. Scene durations are
 * stored as INTEGER TENTHS and exposed as seconds; doing that conversion in one place is what
 * keeps the exact-30-second guarantee from being undone by a float sneaking through a route.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { STUDIO_BUCKET, readStudioEnv } from "../env";
import { arr, get, isObject, num, str } from "../json";
import { defaultBuildingFeatures } from "../features";
import type {
  AspectRatio,
  BuildingFeatures,
  ProjectSettings,
  ProjectStatus,
  Resolution,
  SceneStatus,
  StudioAsset,
  StudioOutput,
  StudioProject,
  StudioScene,
  TimeOfDay,
} from "../types";
import { BASE_NEGATIVE_PROMPT } from "../types";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/** The service-role client, or null when the server is not configured for Supabase. */
export function studioClient(): Admin | null {
  const env = readStudioEnv();
  if (!env) return null;
  return createSupabaseAdminClient(env.supabaseUrl, env.serviceKey);
}

/* ------------------------------------------------------------------ *
 * Defaults
 * ------------------------------------------------------------------ */

export function defaultSettings(): ProjectSettings {
  return {
    aspectRatio: "16:9",
    resolution: "1080p",
    timeOfDay: "daylight",
    extraNegativePrompt: "",
    seed: null,
    variations: 1,
    constructionStageMode: false,
    roomSequence: [],
    comparisonAssetId: null,
    audio: { music: false, ambience: false, voiceoverScript: "", muted: true, volume: 60 },
    branding: { enabled: false, logoAssetId: null, outroText: "" },
    annotations: [],
  };
}

/**
 * Coerce whatever is in the settings JSONB into a complete, valid ProjectSettings.
 *
 * Defensive on purpose: the column is jsonb, so an older row, a partial write or a hand-edit can
 * present any shape. Every field is validated against its allowed values rather than trusted,
 * which means a bad row degrades to defaults instead of reaching ffmpeg as `-s undefined`.
 */
export function coerceSettings(raw: unknown): ProjectSettings {
  const d = defaultSettings();
  const aspect: AspectRatio[] = ["16:9", "9:16", "1:1"];
  const res: Resolution[] = ["720p", "1080p", "4k"];
  const tod: TimeOfDay[] = ["daylight", "evening", "night"];

  const oneOf = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
    typeof value === "string" && (allowed as string[]).includes(value) ? (value as T) : fallback;

  const audio = get(raw, "audio");
  const branding = get(raw, "branding");
  const seedRaw = get(raw, "seed");

  return {
    aspectRatio: oneOf(get(raw, "aspectRatio"), aspect, d.aspectRatio),
    resolution: oneOf(get(raw, "resolution"), res, d.resolution),
    timeOfDay: oneOf(get(raw, "timeOfDay"), tod, d.timeOfDay),
    extraNegativePrompt: (str(get(raw, "extraNegativePrompt")) ?? "").slice(0, 2000),
    seed: num(seedRaw) !== null ? Math.floor(num(seedRaw)!) : null,
    variations: clampInt(get(raw, "variations"), 1, 4, 1),
    constructionStageMode: get(raw, "constructionStageMode") === true,
    roomSequence: arr(get(raw, "roomSequence"))
      .filter((x): x is string => typeof x === "string")
      .slice(0, 12),
    comparisonAssetId: str(get(raw, "comparisonAssetId")),
    audio: {
      music: get(audio, "music") === true,
      ambience: get(audio, "ambience") === true,
      voiceoverScript: (str(get(audio, "voiceoverScript")) ?? "").slice(0, 4000),
      // Default MUTED: absent means muted, and only an explicit `false` unmutes.
      muted: get(audio, "muted") !== false,
      volume: clampInt(get(audio, "volume"), 0, 100, 60),
    },
    branding: {
      enabled: get(branding, "enabled") === true,
      logoAssetId: str(get(branding, "logoAssetId")),
      outroText: (str(get(branding, "outroText")) ?? "").slice(0, 300),
    },
    annotations: arr(get(raw, "annotations"))
      .map((a) => {
        const text = str(get(a, "text"));
        if (!text) return null;
        return {
          at: num(get(a, "at")) ?? 0,
          sceneId: str(get(a, "sceneId")),
          text: text.slice(0, 300),
        };
      })
      .filter((a): a is { at: number; sceneId: string | null; text: string } => a !== null)
      .slice(0, 40),
  };
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function coerceFeatures(raw: unknown): BuildingFeatures {
  const d = defaultBuildingFeatures();
  if (!isObject(raw)) return d;
  const out: Record<string, unknown> = { ...d };
  for (const key of Object.keys(d)) {
    const node = get(raw, key);
    if (!isObject(node) || !("value" in node)) continue;
    const confidence = str(get(node, "confidence")) ?? "";
    const note = str(get(node, "note"));
    out[key] = {
      value: node.value,
      // An unrecognised confidence degrades to "unverified" — the honest end of the scale.
      // Never to "detected", which would let a corrupt row claim a detection that never ran.
      confidence: ["detected", "inferred", "unverified", "user"].includes(confidence)
        ? confidence
        : "unverified",
      ...(note ? { note: note.slice(0, 400) } : {}),
    };
  }
  return out as unknown as BuildingFeatures;
}

/* ------------------------------------------------------------------ *
 * Row mapping
 * ------------------------------------------------------------------ */

const TENTHS = 10;
export const secondsToTenths = (s: number): number => Math.round(s * TENTHS);
export const tenthsToSeconds = (t: number): number => Math.round(t) / TENTHS;

/* Rows arrive from the deliberately UNTYPED service-role client (see src/lib/supabase/admin.ts),
 * so every field is narrowed here rather than asserted. A column that is missing — because a
 * migration has not been applied yet — becomes a sane default instead of `undefined` travelling
 * into the storyboard arithmetic. */
export function mapAsset(row: unknown): StudioAsset {
  return {
    id: str(get(row, "id")) ?? "",
    role: (str(get(row, "role")) ?? "reference") as StudioAsset["role"],
    storagePath: str(get(row, "storage_path")) ?? "",
    mimeType: str(get(row, "mime_type")) ?? "application/octet-stream",
    byteSize: num(get(row, "byte_size")) ?? 0,
    width: num(get(row, "width")),
    height: num(get(row, "height")),
    checksum: str(get(row, "checksum")) ?? "",
    originalName: str(get(row, "original_name")) ?? "",
    createdAt: str(get(row, "created_at")) ?? "",
  };
}

export function mapScene(row: unknown): StudioScene {
  return {
    id: str(get(row, "id")) ?? "",
    index: num(get(row, "scene_index")) ?? 0,
    title: str(get(row, "title")) ?? "Scene",
    kind: (str(get(row, "kind")) ?? "custom") as StudioScene["kind"],
    prompt: str(get(row, "prompt")) ?? "",
    improvedPrompt: str(get(row, "improved_prompt")),
    cameraPreset: (str(get(row, "camera_preset")) ?? "dolly-in") as StudioScene["cameraPreset"],
    cameraInstructions: str(get(row, "camera_instructions")),
    motionIntensity: num(get(row, "motion_intensity")) ?? 30,
    transitionIn: (str(get(row, "transition_in")) ?? "cut") as StudioScene["transitionIn"],
    // duration_tenths is INTEGER in the schema; this is the ONLY place it becomes seconds.
    durationSeconds: tenthsToSeconds(num(get(row, "duration_tenths")) ?? 50),
    startAssetId: str(get(row, "start_asset_id")),
    endAssetId: str(get(row, "end_asset_id")),
    keyframes: arr(get(row, "keyframes"))
      .map((k) => ({ at: num(get(k, "at")) ?? 0, instruction: str(get(k, "instruction")) ?? "" }))
      .filter((k) => k.instruction !== ""),
    seed: num(get(row, "seed")),
    locked: get(row, "locked") === true,
    status: (str(get(row, "status")) ?? "draft") as SceneStatus,
    clipPath: str(get(row, "clip_path")),
    clipDurationSeconds: num(get(row, "clip_duration_seconds")),
  };
}

export function sceneToRow(projectId: string, scene: StudioScene): Record<string, unknown> {
  return {
    project_id: projectId,
    scene_index: scene.index,
    title: scene.title.slice(0, 200),
    kind: scene.kind,
    prompt: scene.prompt.slice(0, 6000),
    improved_prompt: scene.improvedPrompt ? scene.improvedPrompt.slice(0, 6000) : null,
    camera_preset: scene.cameraPreset,
    camera_instructions: scene.cameraInstructions ? scene.cameraInstructions.slice(0, 2000) : null,
    motion_intensity: clampInt(scene.motionIntensity, 0, 100, 30),
    transition_in: scene.transitionIn,
    duration_tenths: secondsToTenths(scene.durationSeconds),
    start_asset_id: scene.startAssetId,
    end_asset_id: scene.endAssetId,
    keyframes: scene.keyframes ?? [],
    seed: scene.seed,
    locked: scene.locked === true,
    status: scene.status,
    clip_path: scene.clipPath,
    clip_duration_seconds: scene.clipDurationSeconds,
  };
}

export function mapOutput(row: unknown): StudioOutput {
  return {
    id: str(get(row, "id")) ?? "",
    projectId: str(get(row, "project_id")) ?? "",
    kind: (str(get(row, "kind")) ?? "final") as StudioOutput["kind"],
    aspectRatio: (str(get(row, "aspect_ratio")) ?? "16:9") as StudioOutput["aspectRatio"],
    resolution: (str(get(row, "resolution")) ?? "1080p") as StudioOutput["resolution"],
    storagePath: str(get(row, "storage_path")) ?? "",
    durationSeconds: num(get(row, "duration_seconds")),
    verifiedDurationSeconds: num(get(row, "verified_duration_seconds")),
    byteSize: num(get(row, "byte_size")),
    createdAt: str(get(row, "created_at")) ?? "",
  };
}

/* ------------------------------------------------------------------ *
 * Row → API shapes
 *
 * Four routes return job lists, comment threads and the project index, and each one used to
 * spell out the same snake_case → camelCase mapping inline. One definition each, here, so the
 * three routes cannot drift into returning slightly different field names for the same row.
 * ------------------------------------------------------------------ */

export interface JobSummary {
  id: string;
  sceneId: string | null;
  kind: string;
  status: string;
  progress: number | null;
  error: string | null;
  attempt: number;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export function mapJob(row: unknown): JobSummary {
  return {
    id: str(get(row, "id")) ?? "",
    sceneId: str(get(row, "scene_id")),
    kind: str(get(row, "kind")) ?? "scene",
    status: str(get(row, "status")) ?? "queued",
    progress: num(get(row, "progress")),
    error: str(get(row, "error")),
    attempt: num(get(row, "attempt")) ?? 1,
    provider: str(get(row, "provider")) ?? "",
    createdAt: str(get(row, "created_at")) ?? "",
    updatedAt: str(get(row, "updated_at")) ?? "",
  };
}

export interface CommentSummary {
  id: string;
  sceneId: string | null;
  author: string;
  body: string;
  resolved: boolean;
  createdAt: string;
}

export function mapComment(row: unknown): CommentSummary {
  return {
    id: str(get(row, "id")) ?? "",
    sceneId: str(get(row, "scene_id")),
    author: str(get(row, "author")) ?? "Reviewer",
    body: str(get(row, "body")) ?? "",
    resolved: get(row, "resolved") === true,
    createdAt: str(get(row, "created_at")) ?? "",
  };
}

export interface ProjectSummary {
  publicId: string;
  title: string;
  status: string;
  approvalStatus: string;
  shareEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export function mapProjectSummary(row: unknown): ProjectSummary {
  return {
    publicId: str(get(row, "public_id")) ?? "",
    title: str(get(row, "title")) ?? "Untitled concept animation",
    status: str(get(row, "status")) ?? "draft",
    approvalStatus: str(get(row, "approval_status")) ?? "not_submitted",
    shareEnabled: get(row, "share_enabled") === true,
    createdAt: str(get(row, "created_at")) ?? "",
    updatedAt: str(get(row, "updated_at")) ?? "",
  };
}

/* ------------------------------------------------------------------ *
 * Project loading
 * ------------------------------------------------------------------ */

export interface LoadedProject {
  project: StudioProject;
  outputs: StudioOutput[];
  raw: { id: string; ownerSession: string | null; ownerId: string | null };
}

/**
 * Load a project by its PUBLIC id, with assets, scenes and outputs.
 *
 * Ownership is NOT checked here — the caller decides, because the share route intentionally
 * loads a project the requester does not own. Every non-share caller must pass the result
 * through assertOwnership().
 */
export async function loadProject(admin: Admin, publicId: string): Promise<LoadedProject | null> {
  const { data: project, error } = await admin
    .from("animation_projects")
    .select("*")
    .eq("public_id", publicId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !project) return null;

  const [{ data: assets }, { data: scenes }, { data: outputs }] = await Promise.all([
    admin.from("animation_assets").select("*").eq("project_id", project.id).order("created_at"),
    admin.from("animation_scenes").select("*").eq("project_id", project.id).order("scene_index"),
    admin
      .from("animation_outputs")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    project: {
      id: project.public_id,
      publicId: project.public_id,
      title: project.title,
      status: project.status as ProjectStatus,
      approvalStatus: project.approval_status,
      features: coerceFeatures(project.features),
      settings: coerceSettings(project.settings),
      assets: (assets ?? []).map(mapAsset),
      scenes: (scenes ?? []).map(mapScene),
      shareSlug: project.share_slug ?? null,
      shareEnabled: project.share_enabled === true,
      version: project.version ?? 1,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    },
    outputs: (outputs ?? []).map(mapOutput),
    raw: {
      id: project.id,
      ownerSession: project.owner_session ?? null,
      ownerId: project.owner_id ?? null,
    },
  };
}

/** True when this requester may edit the project. Either identity is sufficient. */
export function ownsProject(
  loaded: LoadedProject,
  ownerSession: string | null,
  userId: string | null,
): boolean {
  if (userId && loaded.raw.ownerId && loaded.raw.ownerId === userId) return true;
  if (ownerSession && loaded.raw.ownerSession && loaded.raw.ownerSession === ownerSession) return true;
  return false;
}

/* ------------------------------------------------------------------ *
 * Storage
 * ------------------------------------------------------------------ */

/** Upload bytes to the private bucket. Returns the object path, or null on failure. */
export async function putObject(
  admin: Admin,
  path: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string | null> {
  const { error } = await admin.storage.from(STUDIO_BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
    cacheControl: "3600",
  });
  if (error) {
    console.error("[animation-studio] storage upload failed:", error.message);
    return null;
  }
  return path;
}

export async function getObject(admin: Admin, path: string): Promise<Uint8Array | null> {
  const { data, error } = await admin.storage.from(STUDIO_BUCKET).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

/**
 * Short-lived signed URL.
 *
 * One hour by default. Long enough to edit a storyboard without the previews expiring underneath
 * the visitor, short enough that a URL copied out of devtools and pasted elsewhere stops working
 * the same afternoon.
 */
export async function signObject(
  admin: Admin,
  path: string,
  seconds = 3600,
): Promise<string | null> {
  const { data, error } = await admin.storage.from(STUDIO_BUCKET).createSignedUrl(path, seconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function removeObjects(admin: Admin, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await admin.storage.from(STUDIO_BUCKET).remove(paths);
  if (error) console.error("[animation-studio] storage delete failed:", error.message);
}

/** Attach signed URLs to every asset, scene clip and output in one pass. */
export async function withSignedUrls(
  admin: Admin,
  project: StudioProject,
  outputs: StudioOutput[],
): Promise<{ project: StudioProject; outputs: StudioOutput[] }> {
  const assets = await Promise.all(
    project.assets.map(async (a) => ({ ...a, signedUrl: (await signObject(admin, a.storagePath)) ?? undefined })),
  );
  const scenes = await Promise.all(
    project.scenes.map(async (s) => ({
      ...s,
      clipSignedUrl: s.clipPath ? ((await signObject(admin, s.clipPath)) ?? undefined) : undefined,
    })),
  );
  const signedOutputs = await Promise.all(
    outputs.map(async (o) => ({ ...o, signedUrl: (await signObject(admin, o.storagePath)) ?? undefined })),
  );
  return { project: { ...project, assets, scenes }, outputs: signedOutputs };
}

/* ------------------------------------------------------------------ *
 * Versions
 * ------------------------------------------------------------------ */

/**
 * Snapshot the editable state so the visitor can undo.
 *
 * Called before every destructive edit (regenerate, retime, reorder, storyboard rebuild). Keeps
 * the most recent 30 versions per project; older ones are pruned so a long editing session
 * cannot grow a table without bound.
 */
export async function snapshotVersion(
  admin: Admin,
  projectRowId: string,
  version: number,
  label: string,
  snapshot: unknown,
): Promise<void> {
  await admin
    .from("animation_project_versions")
    .upsert({ project_id: projectRowId, version, label: label.slice(0, 120), snapshot }, { onConflict: "project_id,version" });

  const { data: old } = await admin
    .from("animation_project_versions")
    .select("id")
    .eq("project_id", projectRowId)
    .order("version", { ascending: false })
    .range(30, 200);
  if (old && old.length > 0) {
    const ids = old.map((r: unknown) => str(get(r, "id"))).filter((id): id is string => id !== null);
    if (ids.length > 0) await admin.from("animation_project_versions").delete().in("id", ids);
  }
}

/* ------------------------------------------------------------------ *
 * Rate limiting
 * ------------------------------------------------------------------ */

/**
 * Fixed-window rate limit, counted in the DATABASE.
 *
 * In-process counters are useless here: the app runs behind more than one container, so an
 * in-memory limit of 10 is really 10×N. The counter and its window live in a table and the
 * increment-and-test is a single atomic statement (see the migration).
 *
 * FAILS OPEN on a database error, deliberately. A visitor must not be locked out of a marketing
 * tool because a counter table hiccuped; the expensive operations are separately gated by
 * provider configuration and by ownership.
 */
export async function rateLimit(
  admin: Admin,
  bucket: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc("animation_rate_limit_hit", {
      p_key: `${bucket}:${identity}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[animation-studio] rate limit check failed:", error.message);
      return true;
    }
    return data !== false;
  } catch (err) {
    console.error("[animation-studio] rate limit threw:", err);
    return true;
  }
}

/* ------------------------------------------------------------------ *
 * Misc
 * ------------------------------------------------------------------ */

/** The negative prompt actually stored on a project — base plus the visitor's additions. */
export function fullNegativePrompt(settings: ProjectSettings): string {
  const extra = settings.extraNegativePrompt.trim();
  return extra ? `${BASE_NEGATIVE_PROMPT} ${extra}` : BASE_NEGATIVE_PROMPT;
}
