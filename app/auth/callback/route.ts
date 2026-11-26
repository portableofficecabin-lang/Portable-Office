import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicOrigin, safeNextPath } from "@/lib/auth/callbackRedirect";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Not `new URL(request.url).origin`: behind the VPS proxy that is the server's own listen address
  // (production sent https://localhost:3000/...). See src/lib/auth/callbackRedirect.ts.
  const origin = publicOrigin(request.headers);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
