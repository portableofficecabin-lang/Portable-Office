/**
 * /api/animation-studio/projects
 *
 *   GET  — the visitor's own projects (resume-later list)
 *   POST — create a new empty project
 *
 * Anonymous visitors are first-class here. Ownership comes from the signed httpOnly cookie
 * described in src/lib/animation/server/session.ts, and the response sets that cookie when it had
 * to be minted — which is why POST returns through withSession().
 */

import { NextResponse } from "next/server";

import {
  enforceRateLimit,
  jsonError,
  readJson,
  studioContext,
  withSession,
} from "@/lib/animation/server/context";
import { coerceSettings, defaultSettings, mapProjectSummary } from "@/lib/animation/server/repo";
import { defaultBuildingFeatures } from "@/lib/animation/features";
import { clampText, screenText } from "@/lib/animation/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await studioContext();
  if (ctx instanceof NextResponse) return ctx;

  const query = ctx.admin
    .from("animation_projects")
    .select("public_id, title, status, approval_status, updated_at, created_at, share_enabled")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(25);

  // A signed-in visitor sees projects owned by EITHER identity, so a project started before
  // signing in is not stranded behind the cookie.
  const { data, error } = ctx.userId
    ? await query.or(`owner_session.eq.${ctx.ownerSession},owner_id.eq.${ctx.userId}`)
    : await query.eq("owner_session", ctx.ownerSession);

  if (error) {
    console.error("[animation-studio] project list failed:", error.message);
    // Same self-diagnosing wording as POST below: on a fresh deployment the overwhelmingly
    // likely cause is the animation-studio migration not having been applied yet, and an
    // operator should not have to read a server log to discover that.
    return withSession(
      jsonError(
        "Could not load your saved projects. If this is a new deployment, the animation-studio " +
          "database migration may not have been applied yet.",
        500,
      ),
      ctx,
    );
  }

  return withSession(
    NextResponse.json({
      projects: (data ?? []).map(mapProjectSummary),
    }),
    ctx,
  );
}

export async function POST(request: Request) {
  const ctx = await studioContext();
  if (ctx instanceof NextResponse) return ctx;

  // A project row is cheap, but not free — and an unbounded create endpoint is a way to fill a
  // table from a script. Twenty an hour is far above any real use of this tool.
  const limited = await enforceRateLimit(
    ctx,
    "project-create",
    20,
    3600,
    "You have created a lot of projects in the last hour. Please continue with an existing one, or try again shortly.",
  );
  if (limited) return limited;

  const body = await readJson<{ title?: string; duplicateOf?: string }>(request);
  const title = clampText(body?.title ?? "", 200).trim() || "Untitled concept animation";

  const screened = screenText(title);
  if (!screened.ok) return withSession(jsonError(screened.reason!, 400), ctx);

  const { data, error } = await ctx.admin
    .from("animation_projects")
    .insert({
      title,
      owner_session: ctx.ownerSession,
      owner_id: ctx.userId,
      status: "draft",
      features: defaultBuildingFeatures(),
      settings: coerceSettings(defaultSettings()),
    })
    .select("public_id")
    .single();

  if (error || !data) {
    console.error("[animation-studio] project create failed:", error?.message);
    // The most common cause on a fresh deployment is the migration not having been applied.
    return withSession(
      jsonError(
        "Could not create the project. If this is a new deployment, the animation-studio database " +
          "migration may not have been applied yet.",
        500,
      ),
      ctx,
    );
  }

  return withSession(NextResponse.json({ publicId: data.public_id }, { status: 201 }), ctx);
}
