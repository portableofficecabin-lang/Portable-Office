/**
 * /api/animation-studio/projects/[id]/share
 *
 *   POST   — enable a read-only preview link (mints an unguessable slug)
 *   DELETE — revoke it
 *
 * The slug is 24 hex characters from crypto.randomBytes — not the project id, not sequential,
 * not derived from anything the visitor supplied. Revoking clears the slug entirely rather than
 * flipping a flag, so a link that has been shared and then revoked cannot be re-enabled onto the
 * same URL by accident.
 *
 * The share page itself (app/(site)/concept-animation/[slug]) renders the finished film, the
 * concept-visualisation disclaimer and the approval controls. It never exposes the editor, the
 * uploads or the prompts.
 */

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { jsonError, requireOwnedProject, withSession } from "@/lib/animation/server/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  const slug = loaded.project.shareSlug ?? randomBytes(12).toString("hex");
  const { error } = await ctx.admin
    .from("animation_projects")
    .update({ share_slug: slug, share_enabled: true })
    .eq("id", loaded.raw.id);

  if (error) {
    console.error("[animation-studio] share enable failed:", error.message);
    return withSession(jsonError("Could not create the preview link.", 500), ctx);
  }

  const origin = new URL(request.url).origin;
  return withSession(
    NextResponse.json({ shareSlug: slug, shareUrl: `${origin}/concept-animation/${slug}`, shareEnabled: true }),
    ctx,
  );
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owned = await requireOwnedProject(id);
  if (owned instanceof NextResponse) return owned;
  const { ctx, loaded } = owned;

  const { error } = await ctx.admin
    .from("animation_projects")
    .update({ share_slug: null, share_enabled: false })
    .eq("id", loaded.raw.id);

  if (error) {
    console.error("[animation-studio] share revoke failed:", error.message);
    return withSession(jsonError("Could not revoke the preview link.", 500), ctx);
  }

  return withSession(NextResponse.json({ shareEnabled: false, shareSlug: null }), ctx);
}
