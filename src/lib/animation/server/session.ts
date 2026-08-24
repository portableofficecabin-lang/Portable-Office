/**
 * VISITOR OWNERSHIP — SERVER ONLY.
 *
 * The studio is open to anonymous visitors (the same decision the checkout made: requiring a
 * login to try a marketing tool kills the tool). So "who owns this project" cannot come from an
 * auth session. It comes from a signed, httpOnly cookie:
 *
 *   cookie value        = <random 32-byte token>.<HMAC-SHA256(token, server secret)>
 *   stored in the row   = HMAC-SHA256(token, server secret)   ← the digest ONLY
 *
 * Two properties follow, and both matter:
 *   • The cookie cannot be forged. A visitor who edits it to another value fails the HMAC check
 *     and is treated as having no session at all.
 *   • A database leak does not hand anyone a working session, because the raw token is never
 *     stored — only its digest, which is what the row is matched on.
 *
 * The cookie is httpOnly (no JS access → not stealable by an injected script), SameSite=Lax
 * (sent on top-level navigation so a resumed project survives a link click, not sent
 * cross-site), and Secure in production.
 *
 * A signed-in user ALSO gets `owner_id` on the row, so their projects follow the account rather
 * than the browser. Ownership passes if EITHER matches.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { studioSessionSecret } from "../env";

export const STUDIO_COOKIE = "poc_studio_sid";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days — long enough to resume a project later

function digest(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token, "utf8").digest("hex");
}

export interface StudioSession {
  /** The digest stored on the project row. */
  ownerSession: string;
  /** Set when the cookie had to be created, so the route can attach it to the response. */
  setCookieValue: string | null;
}

/**
 * Read the visitor's session, minting one if absent.
 *
 * Returns null only when the server has no secret to sign with — in which case ownership cannot
 * be established and the caller must refuse to create a project rather than create an orphan
 * nobody can ever open again.
 */
export async function getOrCreateStudioSession(): Promise<StudioSession | null> {
  const secret = studioSessionSecret();
  if (!secret) return null;

  const jar = await cookies();
  const existing = jar.get(STUDIO_COOKIE)?.value ?? "";
  const verified = verifyCookie(existing, secret);
  if (verified) return { ownerSession: verified, setCookieValue: null };

  const token = randomBytes(32).toString("hex");
  const sig = digest(token, secret);
  return { ownerSession: sig, setCookieValue: `${token}.${sig}` };
}

/** Read-only: the current session digest, or null. Never mints a cookie. */
export async function readStudioSession(): Promise<string | null> {
  const secret = studioSessionSecret();
  if (!secret) return null;
  const jar = await cookies();
  return verifyCookie(jar.get(STUDIO_COOKIE)?.value ?? "", secret);
}

function verifyCookie(value: string, secret: string): string | null {
  if (!value || !value.includes(".")) return null;
  const [token, sig] = value.split(".", 2);
  if (!token || !sig) return null;
  const expected = digest(token, secret);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? expected : null;
}

/** The Set-Cookie attributes used everywhere the studio cookie is written. */
export function studioCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}
