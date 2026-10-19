/**
 * ══════════════════════════════════════════════════════════════════════════════════════
 *  Deployment identity — GET https://portableofficecabin.com/api/build-info   (read-only)
 * ══════════════════════════════════════════════════════════════════════════════════════
 *
 * Answers "which commit is the site serving right now?" in one small JSON response:
 *
 *   { "commit": "<40-hex sha>", "buildId": "<sha12>_<base36>", "builtAt": "<ISO>", "startedAt": "<ISO>" }
 *
 *   commit / buildId / builtAt — fixed at `next build` (next.config.ts, "DEPLOYMENT IDENTITY") and
 *       inlined into this module. buildId is Next's BUILD_ID, the same value every page carries
 *       in its RSC payload as "b".
 *   startedAt — when THIS server process started, from process.uptime(). A process that started
 *       before `builtAt` was not reloaded after the build: with the legacy in-place deploy it would
 *       still be serving the previous build's code.
 *
 * Used by scripts/deploy/verify-release.mjs (--expect-commit) after every deploy, and by the PR
 * build job, which checks that the response names the checked-out commit.
 *
 * Safe to expose:
 *   • Every field is either public (the commit of a public repository; the build id already in
 *     every page) or a timestamp. No environment variables, paths, hostnames, versions or headers
 *     are read or returned.
 *   • force-dynamic, so it runs in the process that answers. A prerendered body on disk would say
 *     nothing about which process serves it.
 *   • no-store, so no browser, nginx or CDN keeps an old answer.
 *   • X-Robots-Tag noindex. /api/ is also disallowed in robots.txt, and the URL is not in the
 *     sitemap or linked from any page.
 *   • The cost is one tiny JSON object per request: no I/O, no database, no secrets.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COMMIT = process.env.BUILD_INFO_COMMIT || "unknown";
const BUILD_ID = process.env.BUILD_INFO_BUILD_ID || "unknown";
const BUILT_AT = process.env.BUILD_INFO_BUILT_AT || "unknown";

export function GET() {
  const startedAt = new Date(Date.now() - process.uptime() * 1000).toISOString();
  return Response.json(
    { commit: COMMIT, buildId: BUILD_ID, builtAt: BUILT_AT, startedAt },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
