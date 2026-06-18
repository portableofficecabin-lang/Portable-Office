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

export async function middleware(request: NextRequest) {
  const challenge = adminBasicAuthChallenge(request);
  if (challenge) return challenge;

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};
