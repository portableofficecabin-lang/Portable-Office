import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { pathname } = request.nextUrl;

  const isAdminRoute =
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !pathname.startsWith("/admin/setup");

  // Resolve the user defensively: if Supabase is unreachable (bad URL, paused
  // project, CSP), getUser() throws — don't let that 500 every admin request.
  // Treat it as unauthenticated (→ redirected to the login page) and log it.
  let user: User | null = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (err) {
    console.error("[mw] getUser() failed:", err instanceof Error ? err.message : err);
  }

  if (pathname.startsWith("/admin")) {
    console.info(
      `[mw] ${pathname} → user=${user ? user.id : "none"}, protected=${isAdminRoute}`,
    );
  }

  if (isAdminRoute && !user) {
    console.info("[mw] unauthenticated on protected admin route → redirect /admin/login");
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && user) {
    const { data: adminRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error(
        "[mw] user_roles lookup failed:",
        roleError.message,
        roleError.code ? `(code ${roleError.code})` : "",
        "— if the table is missing, apply supabase/migrations to the project.",
      );
    }
    console.info(`[mw] admin role for ${user.id} → ${adminRole ? "granted" : "denied"}`);

    if (!adminRole) {
      console.info("[mw] no admin role → redirect /admin/login?error=access_denied");
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "access_denied");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
