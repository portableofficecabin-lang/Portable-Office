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

export async function middleware(request: NextRequest) {
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
  ],
};
