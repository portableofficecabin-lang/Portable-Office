/**
 * ROUTE CONTEXT — the boilerplate every animation-studio route needs, in one place.
 *
 * Each route begins by answering the same four questions: is Supabase configured, who is asking,
 * do they own this project, and are they inside their rate limit. Duplicating that in nine route
 * files is how one of them ends up missing the ownership check. So it happens here.
 *
 * Every failure returns a NextResponse the route can hand straight back, with a message written
 * for the visitor rather than for a log.
 */

import { NextResponse } from "next/server";

import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

import { missingStudioEnv } from "../env";
import {
  loadProject,
  ownsProject,
  rateLimit,
  studioClient,
  type LoadedProject,
} from "./repo";
import { getOrCreateStudioSession, readStudioSession, STUDIO_COOKIE, studioCookieOptions } from "./session";

export type Admin = NonNullable<ReturnType<typeof studioClient>>;

export interface StudioContext {
  admin: Admin;
  ownerSession: string;
  /** Set when a fresh cookie must be attached to the response. */
  setCookie: string | null;
  userId: string | null;
}

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}

/** Attach the studio cookie to a response when one was minted this request. */
export function withSession<T extends NextResponse>(res: T, ctx: { setCookie: string | null }): T {
  if (ctx.setCookie) res.cookies.set(STUDIO_COOKIE, ctx.setCookie, studioCookieOptions());
  return res;
}

/**
 * Establish the request context, minting a visitor session if needed.
 *
 * Returns a NextResponse instead of a context when the server is not configured — a studio route
 * on a server with no Supabase credentials must say so plainly rather than 500 on the first query.
 */
export async function studioContext(): Promise<StudioContext | NextResponse> {
  const missing = missingStudioEnv();
  if (missing.length > 0) {
    console.error(`[animation-studio] missing env: ${missing.join(", ")}`);
    return jsonError(
      `The animation studio is not configured on this server (missing: ${missing.join(", ")}).`,
      503,
    );
  }

  const admin = studioClient();
  if (!admin) return jsonError("The animation studio is not configured on this server.", 503);

  const session = await getOrCreateStudioSession();
  if (!session) {
    return jsonError(
      "The animation studio cannot identify your session on this server (missing: ANIMATION_STUDIO_SESSION_SECRET).",
      503,
    );
  }

  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id ?? null;
  } catch {
    // Anonymous is the normal case here — the studio does not require a login.
    userId = null;
  }

  return { admin, ownerSession: session.ownerSession, setCookie: session.setCookieValue, userId };
}

/** Read-only context for routes that must NOT mint a cookie (e.g. the public share page). */
export async function readOnlyContext(): Promise<{ admin: Admin; ownerSession: string | null } | NextResponse> {
  const admin = studioClient();
  if (!admin) return jsonError("The animation studio is not configured on this server.", 503);
  return { admin, ownerSession: await readStudioSession() };
}

export interface OwnedProject {
  ctx: StudioContext;
  loaded: LoadedProject;
}

/** Load a project and refuse unless the requester owns it. */
export async function requireOwnedProject(publicId: string): Promise<OwnedProject | NextResponse> {
  const ctx = await studioContext();
  if (ctx instanceof NextResponse) return ctx;

  const loaded = await loadProject(ctx.admin, publicId);
  if (!loaded) return withSession(jsonError("That project no longer exists.", 404), ctx);

  if (!ownsProject(loaded, ctx.ownerSession, ctx.userId)) {
    // 404, not 403: confirming a project id exists to someone who does not own it is an
    // enumeration oracle. They cannot tell "wrong id" from "not yours", which is correct.
    return withSession(jsonError("That project no longer exists.", 404), ctx);
  }

  return { ctx, loaded };
}

/** Enforce a limit; returns a 429 response when exceeded, or null when the caller may proceed. */
export async function enforceRateLimit(
  ctx: StudioContext,
  bucket: string,
  limit: number,
  windowSeconds: number,
  message: string,
): Promise<NextResponse | null> {
  const ok = await rateLimit(ctx.admin, bucket, ctx.ownerSession, limit, windowSeconds);
  if (ok) return null;
  return withSession(jsonError(message, 429), ctx);
}

/** Parse a JSON body without letting a malformed one become a 500. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
