import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

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

export async function middleware(request: NextRequest) {
  // SEO: consolidate legacy ?category= URLs onto the canonical category path.
  const categoryRedirect = categoryQueryRedirect(request);
  if (categoryRedirect) return categoryRedirect;

  // Plain /products (no category query) must NOT instantiate the Supabase auth
  // client — keep public/SEO pages off the origin auth path so the CDN can serve
  // cached HTML (TTFB). Only the admin area needs the session refresh below.
  if (request.nextUrl.pathname === "/products") return NextResponse.next();

  const challenge = adminBasicAuthChallenge(request);
  if (challenge) return challenge;

  return updateSession(request);
}

// Middleware runs only for the admin area (Supabase getUser + role check + optional
// basic-auth gate) and the exact `/products` path (for the ?category= 301 above).
// Every other public/SEO page bypasses middleware entirely so static/ISR HTML can be
// served from the edge without a Node origin round-trip; client auth still refreshes
// via the browser Supabase client.
export const config = {
  matcher: ["/admin/:path*", "/products"],
};
