import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getFamilyBySlug, publishedVariants, variantPath } from "@/data/productFamilies";

// Optional HTTP Basic Auth gate for the admin area. It is activated ONLY when
// the ADMIN_BASIC_AUTH env var ("username:password") is set, so an unset value
// can never lock anyone out. It sits in front of the existing Supabase login
// gate, so bots/scanners hitting /admin get a 401 challenge and never reach the
// login form, reducing the public attack surface.
function adminBasicAuthChallenge(request: NextRequest): NextResponse | null {
  const credentials = process.env.ADMIN_BASIC_AUTH;
  if (!credentials) return null;
  if (!request.nextUrl.pathname.startsWith("/admin")) return null;

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const provided = header.slice("Basic ".length).trim();
    let expected = "";
    try {
      expected = btoa(credentials);
    } catch {
      expected = "";
    }
    if (expected && timingSafeEqual(provided, expected)) return null;
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin area", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

// Length-checked constant-time comparison so the credential is not leaked via
// response timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// 301 the legacy query-category URL (/products?category=<slug>) to the canonical
// path-based category URL (/products/category/<slug>), stripping the query so the
// destination is clean. This is done in middleware — not in next.config redirects —
// because config redirects always forward the original query string, which would
// produce `/products/category/x?category=x` (a new non-canonical URL).
function categoryQueryRedirect(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/products") return null;
  const category = searchParams.get("category");
  if (!category) return null;

  const url = request.nextUrl.clone();
  url.search = ""; // drop ?category= (and any other query) → clean canonical URL
  // Only well-formed slugs become a category path; anything else (empty/garbage)
  // collapses to /products so we never 301 a real 200 into a 404.
  url.pathname = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)
    ? `/products/category/${category}`
    : "/products";
  return NextResponse.redirect(url, 301);
}

/**
 * 301 the legacy query-size URL (/products/<slug>?size=20x10) to the canonical size PATH
 * (/products/<slug>/20x10-ft), dropping the `size` parameter so the destination is the one
 * clean URL form. Any OTHER query parameter is preserved — ad and analytics trackers
 * (gclid, srsltid, utm_*) must survive the hop, and they do not affect canonicalisation
 * because the destination page emits a parameter-free rel=canonical.
 *
 * Done in middleware, not in next.config redirects, for the same reason the ?category=
 * rule is: a config redirect always forwards the original query string, so it would land
 * on /products/<slug>/20x10-ft?size=20x10 — a brand-new non-canonical URL.
 *
 * Only fires for a size that actually exists. An unknown ?size= value falls through to the
 * parent product page (a 200 with a size selector) rather than 301ing into a 404.
 */
function sizeQueryRedirect(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;
  const match = /^\/products\/([a-z0-9-]+)\/?$/.exec(pathname);
  if (!match) return null;

  const raw = searchParams.get("size");
  if (!raw) return null;

  const family = getFamilyBySlug(match[1]);
  if (!family) return null;

  /* Accept the shapes a legacy URL might use — "20x10", "20X10", "20x10-ft", "20 x 10" —
   * and resolve them against the family's REAL published sizes. Nothing is constructed
   * from the parameter itself, so a crafted ?size= can never mint a URL. */
  const wanted = raw.trim().toLowerCase().replace(/\s+/g, "").replace(/[×*]/g, "x");
  const variant = publishedVariants(family).find(
    (v) => v.sizeSlug === wanted || v.sizeSlug === `${wanted}-ft` || `${v.lengthFt}x${v.widthFt}` === wanted,
  );
  if (!variant) return null;

  const url = request.nextUrl.clone();
  url.pathname = variantPath(family, variant);
  url.searchParams.delete("size"); // tracking params stay; the size param is consumed
  return NextResponse.redirect(url, 301);
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * CONCEPT-ANIMATION SHARE LINKS — a genuine 404 for an invalid or revoked slug.
 *
 * ── WHY THIS IS IN MIDDLEWARE AND NOT JUST notFound() IN THE PAGE ───────────────────────────
 * The page DOES call notFound(). It cannot set the status by itself, and neither can any other
 * page in this app: app/providers.tsx wraps every route's children in <Suspense fallback={null}>,
 * so the HTML shell is flushed — with its 200 — before the page body has finished awaiting.
 * A notFound() thrown after that point renders the 404 BODY inside a 200 RESPONSE. Verified on a
 * clean production build: a minimal route whose only statement is notFound() also answers 200.
 *
 * That is a pre-existing, app-wide behaviour affecting /products/<unknown>,
 * /cities-we-serve/<unknown> and every other dynamic route. Fixing it centrally means changing
 * how every page in the app streams, so it is deliberately NOT done here.
 *
 * Middleware runs BEFORE any rendering, so its status is authoritative. This gate therefore does
 * for one route what the page cannot do for itself — and the page keeps its notFound() as the
 * second line of defence.
 *
 * ── WHY IT MATTERS MORE HERE THAN ELSEWHERE ─────────────────────────────────────────────────
 * A revoked share link must genuinely stop existing. A crawler, a link checker, a messaging app's
 * preview fetcher and a browser cache all read the STATUS, not the words on the page. "200 OK"
 * on a revoked private preview is the wrong answer to give any of them.
 *
 * ── COST ────────────────────────────────────────────────────────────────────────────────────
 * One PostgREST HEAD-style lookup, only for /concept-animation/<slug> requests. Cheap, and this
 * route is force-dynamic and no-store anyway, so no edge cache is being given up. Malformed slugs
 * are rejected on shape alone and never reach the database.
 * ──────────────────────────────────────────────────────────────────────────────────────────── */

/** Share slugs are 24 lowercase hex characters (crypto.randomBytes(12).toString("hex")). */
const SHARE_SLUG_PATTERN = /^[0-9a-f]{24}$/;

function shareNotFound(): NextResponse {
  return new NextResponse(
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<meta name=\"robots\" content=\"noindex,nofollow\"><title>Preview link not found</title></head>" +
      "<body style=\"font-family:system-ui,sans-serif;max-width:34rem;margin:12vh auto;padding:0 1.5rem;line-height:1.6\">" +
      "<h1 style=\"font-size:1.5rem;margin:0 0 .75rem\">This preview link is no longer available</h1>" +
      "<p style=\"color:#555;margin:0 0 1.5rem\">The link may have expired, been revoked by its owner, or been mistyped. " +
      "Ask whoever shared it for a current link.</p>" +
      "<a href=\"/products/home-construction/building-construction-contractor\" style=\"color:#b45309;font-weight:600\">" +
      "Create your own concept animation</a></body></html>",
    {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}

/**
 * Returns a 404 response when the share slug is malformed, unknown, revoked or deleted.
 * Returns null to let the request through to the page.
 *
 * FAILS OPEN on an infrastructure problem: if Supabase cannot be reached, the request continues
 * to the page, which does its own lookup and renders the not-found body. A database hiccup must
 * not 404 a link that is genuinely live.
 */
async function conceptAnimationGate(request: NextRequest): Promise<NextResponse | null> {
  const slug = request.nextUrl.pathname.split("/")[2] ?? "";

  // Shape check first — a malformed slug never touches the database.
  if (!SHARE_SLUG_PATTERN.test(slug)) return shareNotFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Not configured: the page will render its own "not configured" path. Do not guess.
  if (!supabaseUrl || !serviceKey) return null;

  try {
    /* Ask ONLY whether a live share exists. `select=share_slug` returns no project content, so
     * this lookup cannot leak a title or an id even if the response were somehow observed. */
    const url =
      `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/animation_projects` +
      `?select=share_slug&share_slug=eq.${encodeURIComponent(slug)}` +
      `&share_enabled=is.true&deleted_at=is.null&limit=1`;

    const res = await fetch(url, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      cache: "no-store",
    });

    // A missing table (migration unapplied) or any server error: fail open.
    if (!res.ok) return null;

    const rows = (await res.json()) as unknown;
    if (Array.isArray(rows) && rows.length === 0) return shareNotFound();
    return null;
  } catch {
    return null; // network problem — fail open, never 404 a live link
  }
}

export async function middleware(request: NextRequest) {
  // Share previews: decide 200 vs a genuine 404 before anything renders.
  if (request.nextUrl.pathname.startsWith("/concept-animation/")) {
    return (await conceptAnimationGate(request)) ?? NextResponse.next();
  }

  // SEO: consolidate legacy ?category= URLs onto the canonical category path.
  const categoryRedirect = categoryQueryRedirect(request);
  if (categoryRedirect) return categoryRedirect;

  // SEO: consolidate legacy ?size= URLs onto the canonical size path.
  const sizeRedirect = sizeQueryRedirect(request);
  if (sizeRedirect) return sizeRedirect;

  /* A /products/<slug> request only reaches middleware when it carries ?size= (see the
   * matcher below). If the size did not resolve, fall through WITHOUT instantiating the
   * Supabase auth client — a product page must stay off the origin auth path so the CDN
   * can serve cached HTML, exactly as plain /products does. */
  if (request.nextUrl.pathname.startsWith("/products/")) return NextResponse.next();

  // Plain /products (no category query) must NOT instantiate the Supabase auth
  // client — keep public/SEO pages off the origin auth path so the CDN can serve
  // cached HTML (TTFB). Only the admin area needs the session refresh below.
  if (request.nextUrl.pathname === "/products") return NextResponse.next();

  const challenge = adminBasicAuthChallenge(request);
  if (challenge) return challenge;

  return updateSession(request);
}

// Middleware runs only for the admin area (Supabase getUser + role check + optional
// basic-auth gate), the exact `/products` path (for the ?category= 301 above), and a
// product page that CARRIES ?size= (for the ?size= 301 above).
//
// The third entry is a matcher OBJECT with a `has` constraint on purpose: a bare
// "/products/:slug" would put EVERY product-detail request through a Node middleware hop
// and cost every one of them the edge cache, which is exactly what this matcher list was
// trimmed down to avoid. With the constraint, a normal product page still bypasses
// middleware entirely and only the legacy query form pays for the redirect.
export const config = {
  matcher: [
    "/admin/:path*",
    "/products",
    { source: "/products/:slug", has: [{ type: "query", key: "size" }] },
    /* Concept-animation share previews. Adding a middleware hop here costs nothing that was
     * being saved: the route is force-dynamic and no-store, so it was never edge-cacheable.
     * It buys a genuine 404 for a revoked or invalid link — see conceptAnimationGate above. */
    "/concept-animation/:slug",
  ],
};
