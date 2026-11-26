/**
 * Where /auth/callback may send the browser after Supabase hands back an auth code.
 *
 * WHY THIS EXISTS (2026-11-26). The route built its redirect from `new URL(request.url).origin`.
 * Behind the VPS's nginx proxy, the standalone Next server sees its OWN listen address there, so
 * production answered every callback with `Location: https://localhost:3000/...` — a dead link for
 * the visitor. And `next` was appended unchecked, so `?next=@evil.example` produced
 * `https://<host>@evil.example`, which a browser opens as evil.example (an open redirect).
 *
 * Rules:
 *  - origin: NEXT_PUBLIC_SITE_URL when it is a valid http(s) URL (the same variable AuthContext uses
 *    for sign-up links); otherwise the forwarded / Host header, but only for a host this site
 *    actually answers on (the canonical domain, its www alias, or a local dev host); otherwise the
 *    canonical site URL. A spoofed Host header can therefore never choose the redirect target.
 *  - next: only a same-site absolute path ("/x"), never "//x", "/\x" or anything with a scheme,
 *    userinfo or control characters; anything else falls back to "/".
 */
import { COMPANY } from "@/lib/company";

const ALLOWED_HOSTS = new Set(["portableofficecabin.com", "www.portableofficecabin.com"]);
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;

function originFromEnv(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : null;
  } catch {
    return null;
  }
}

export function publicOrigin(headers: Headers, env: Readonly<Record<string, string | undefined>> = process.env): string {
  const fromEnv = originFromEnv(env.NEXT_PUBLIC_SITE_URL);
  if (fromEnv) return fromEnv;
  const host = (headers.get("x-forwarded-host") ?? headers.get("host") ?? "").split(",")[0].trim().toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return `https://${host}`;
  if (LOCAL_HOST.test(host)) {
    const proto = (headers.get("x-forwarded-proto") ?? "http").split(",")[0].trim() === "https" ? "https" : "http";
    return `${proto}://${host}`;
  }
  return COMPANY.url;
}

export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return "/";
  return next;
}
