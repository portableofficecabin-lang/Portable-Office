/**
 * /api/animation-studio/projects/[id]/assets
 *
 *   POST   — upload one reference image (multipart)
 *   DELETE — remove one uploaded image and its file
 *
 * ── WHY THE BYTES COME THROUGH THE SERVER ───────────────────────────────────────────────────
 * The obvious alternative is a signed upload URL straight to storage. It is rejected here: a
 * pre-signed PUT lets the browser write ANY bytes under a path we have already committed to, so
 * the file-signature check would run after the object exists (or not at all). Routing the upload
 * through this route means the magic-byte check happens BEFORE anything is stored, which is the
 * only ordering that actually keeps a disguised file out of the bucket.
 *
 * Downloads still use signed URLs — reading is where signing is the right tool.
 */

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import {
  enforceRateLimit,
  jsonError,
  requireOwnedProject,
  withSession,
} from "@/lib/animation/server/context";
import { mapAsset, putObject, removeObjects, signObject } from "@/lib/animation/server/repo";
import {
  MAX_ASSETS_PER_PROJECT,
  MAX_IMAGE_BYTES,
  validateImageUpload,
} from "@/lib/animation/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Roles a visitor may upload. `logo` and `comparison` are set through the same endpoint. */
const ROLES = ["exterior", "interior", "reference", "floor_plan", "logo", "comparison"] as const;
type UploadRole = (typeof ROLES)[number];

/** Roles that may only ever have ONE image — a second upload replaces the first. */
const SINGLETON_ROLES: UploadRole[] = ["exterior", "interior", "floor_plan", "logo", "comparison"];

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  // 60 uploads an hour per visitor: generous for a real session (a project holds at most 12),
  // low enough that the endpoint is not a free image host.
  const limited = await enforceRateLimit(
    ctx,
    "asset-upload",
    60,
    3600,
    "Too many uploads in the last hour. Please wait a few minutes and try again.",
  );
  if (limited) return limited;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return withSession(jsonError("The upload could not be read. Please try again.", 400), ctx);
  }

  const file = form.get("file");
  const roleRaw = String(form.get("role") ?? "reference");
  if (!(file instanceof File)) {
    return withSession(jsonError("No file was received.", 400), ctx);
  }
  if (!ROLES.includes(roleRaw as UploadRole)) {
    return withSession(jsonError("Unknown image role.", 400), ctx);
  }
  const role = roleRaw as UploadRole;

  // Cheap rejection before the body is buffered.
  if (file.size > MAX_IMAGE_BYTES) {
    return withSession(
      jsonError(
        `That file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The limit is ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`,
        413,
      ),
      ctx,
    );
  }

  const nonSingleton = loaded.project.assets.filter((a) => !SINGLETON_ROLES.includes(a.role as UploadRole));
  if (!SINGLETON_ROLES.includes(role) && nonSingleton.length >= MAX_ASSETS_PER_PROJECT) {
    return withSession(
      jsonError(`A project can hold ${MAX_ASSETS_PER_PROJECT} additional references. Remove one first.`, 400),
      ctx,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // THE GATE: file signature, not the declared type.
  const check = validateImageUpload(bytes, file.type, file.size);
  if (!check.ok) return withSession(jsonError(check.reason ?? "Unsupported file.", 415), ctx);

  const checksum = createHash("sha256").update(bytes).digest("hex");
  const duplicate = loaded.project.assets.find((a) => a.checksum === checksum);
  if (duplicate) {
    // Not an error — the visitor picked the same file twice. Tell them which slot it is in.
    return withSession(
      NextResponse.json(
        {
          asset: { ...duplicate, signedUrl: await signObject(ctx.admin, duplicate.storagePath) },
          duplicate: true,
          message: `That image is already uploaded as the ${duplicate.role.replace("_", " ")} reference.`,
        },
        { status: 200 },
      ),
      ctx,
    );
  }

  const ext = EXTENSION[check.mime!] ?? "bin";
  const path = `projects/${loaded.project.publicId}/assets/${role}-${checksum.slice(0, 12)}.${ext}`;

  const stored = await putObject(ctx.admin, path, bytes, check.mime!);
  if (!stored) {
    return withSession(
      jsonError(
        "The image could not be stored. If this is a new deployment, the animation-studio storage " +
          "bucket may not have been created yet.",
        500,
      ),
      ctx,
    );
  }

  // A singleton role replaces whatever was there — including its file.
  if (SINGLETON_ROLES.includes(role)) {
    const previous = loaded.project.assets.filter((a) => a.role === role);
    if (previous.length > 0) {
      await ctx.admin.from("animation_assets").delete().in("id", previous.map((a) => a.id));
      await removeObjects(ctx.admin, previous.map((a) => a.storagePath));
    }
  }

  const { data, error } = await ctx.admin
    .from("animation_assets")
    .insert({
      project_id: loaded.raw.id,
      role,
      storage_path: path,
      mime_type: check.mime,
      byte_size: bytes.byteLength,
      width: check.width ?? null,
      height: check.height ?? null,
      checksum,
      original_name: file.name.slice(0, 200),
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[animation-studio] asset insert failed:", error?.message);
    await removeObjects(ctx.admin, [path]); // do not strand a file with no row pointing at it
    return withSession(jsonError("The image could not be saved. Please try again.", 500), ctx);
  }

  const asset = mapAsset(data);
  return withSession(
    NextResponse.json(
      { asset: { ...asset, signedUrl: await signObject(ctx.admin, asset.storagePath) } },
      { status: 201 },
    ),
    ctx,
  );
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  const assetId = new URL(request.url).searchParams.get("assetId");
  const asset = loaded.project.assets.find((a) => a.id === assetId);
  if (!asset) return withSession(jsonError("That image is not part of this project.", 404), ctx);

  await ctx.admin.from("animation_assets").delete().eq("id", asset.id);
  await removeObjects(ctx.admin, [asset.storagePath]);

  return withSession(NextResponse.json({ deleted: true }), ctx);
}
