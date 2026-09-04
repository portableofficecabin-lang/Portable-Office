/**
 * /api/animation-studio/projects/[id]/comments
 *
 * Revision comments — the thread a customer and our team use to agree what changes before the
 * concept is approved. POST adds one, PATCH resolves one.
 *
 * A comment may be posted by the project owner OR by someone holding the read-only share link:
 * that is the entire point of sharing a preview. So this route accepts either identity, and
 * stamps the author accordingly rather than letting the client claim to be anyone.
 */

import { NextResponse } from "next/server";

import {
  enforceRateLimit,
  jsonError,
  readJson,
  readOnlyContext,
  studioContext,
  withSession,
} from "@/lib/animation/server/context";
import { loadProject, mapComment, ownsProject } from "@/lib/animation/server/repo";
import { clampText, screenText } from "@/lib/animation/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CommentBody {
  body?: string;
  sceneId?: string | null;
  /** The share slug, when the comment comes from someone holding the preview link. */
  shareSlug?: string;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await studioContext();
  if (ctx instanceof NextResponse) return ctx;

  const limited = await enforceRateLimit(
    ctx,
    "comment",
    60,
    3600,
    "That is a lot of comments in one hour. Please wait a few minutes.",
  );
  if (limited) return limited;

  const payload = await readJson<CommentBody>(request);
  const text = clampText(payload?.body ?? "", 2000).trim();
  if (!text) return withSession(jsonError("Write a comment first.", 400), ctx);

  const screened = screenText(text);
  if (!screened.ok) return withSession(jsonError(screened.reason!, 400), ctx);

  const loaded = await loadProject(ctx.admin, id);
  if (!loaded) return withSession(jsonError("That project no longer exists.", 404), ctx);

  const isOwner = ownsProject(loaded, ctx.ownerSession, ctx.userId);
  // A non-owner needs the share link, and the link must currently be enabled — revoking it must
  // actually close the thread, not merely hide the page.
  const viaShare =
    !isOwner &&
    loaded.project.shareEnabled === true &&
    !!loaded.project.shareSlug &&
    payload?.shareSlug === loaded.project.shareSlug;

  if (!isOwner && !viaShare) {
    return withSession(jsonError("That project no longer exists.", 404), ctx);
  }

  // Only accept a scene id that actually belongs to this project.
  const sceneId =
    payload?.sceneId && loaded.project.scenes.some((s) => s.id === payload.sceneId)
      ? payload.sceneId
      : null;

  const { data, error } = await ctx.admin
    .from("animation_project_comments")
    .insert({
      project_id: loaded.raw.id,
      scene_id: sceneId,
      author: isOwner ? "Project owner" : "Reviewer",
      body: text,
    })
    .select("id, scene_id, author, body, resolved, created_at")
    .single();

  if (error || !data) {
    console.error("[animation-studio] comment insert failed:", error?.message);
    return withSession(jsonError("Could not post the comment.", 500), ctx);
  }

  return withSession(
    NextResponse.json(
      { comment: mapComment(data) },
      { status: 201 },
    ),
    ctx,
  );
}

/** Resolve or reopen a comment. Owner only — a reviewer raises points, the owner closes them. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await studioContext();
  if (ctx instanceof NextResponse) return ctx;

  const payload = await readJson<{ commentId?: string; resolved?: boolean }>(request);
  if (!payload?.commentId) return withSession(jsonError("Which comment?", 400), ctx);

  const loaded = await loadProject(ctx.admin, id);
  if (!loaded || !ownsProject(loaded, ctx.ownerSession, ctx.userId)) {
    return withSession(jsonError("That project no longer exists.", 404), ctx);
  }

  const { error } = await ctx.admin
    .from("animation_project_comments")
    .update({ resolved: payload.resolved !== false })
    .eq("id", payload.commentId)
    .eq("project_id", loaded.raw.id);

  if (error) return withSession(jsonError("Could not update the comment.", 500), ctx);
  return withSession(NextResponse.json({ updated: true }), ctx);
}

/** Read the thread. Used by the share page, which has no session of its own. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await readOnlyContext();
  if (ctx instanceof NextResponse) return ctx;

  const loaded = await loadProject(ctx.admin, id);
  if (!loaded) return jsonError("That project no longer exists.", 404);

  const shareSlug = new URL(request.url).searchParams.get("shareSlug");
  const isOwner = ownsProject(loaded, ctx.ownerSession, null);
  const viaShare =
    loaded.project.shareEnabled === true && !!loaded.project.shareSlug && shareSlug === loaded.project.shareSlug;
  if (!isOwner && !viaShare) return jsonError("That project no longer exists.", 404);

  const { data } = await ctx.admin
    .from("animation_project_comments")
    .select("id, scene_id, author, body, resolved, created_at")
    .eq("project_id", loaded.raw.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({
    comments: (data ?? []).map(mapComment),
  });
}
