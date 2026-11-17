import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashOTP, LOCKED_MESSAGE, normaliseEmail, OTP_FORMAT } from "../_shared/otp.ts";

/**
 * signup-with-otp — creates a customer account once the e-mailed code (from send-booking-otp) is
 * confirmed. Used by src/views/Register.tsx.
 *
 * HARDENED 2026-11-05: the code is checked by one atomic database call, check_booking_otp()
 * (supabase/migrations/20261105120000_booking_otp_limits.sql). A match marks the code used; a miss
 * counts against it, and after 5 wrong guesses the code is dead. Before, unlimited guesses were
 * allowed, so an account could be registered under someone else's address by trying codes.
 * Responses keep their earlier shape: 200 { success, user_id } or 200 / 400 / 500 { error }.
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the Supabase Edge runtime.
 * DEPLOY MANUALLY, AFTER applying the 2026-11-05 migration:
 *   supabase functions deploy signup-with-otp --no-verify-jwt
 */

/** Every environment read goes through here. */
const env = (name: string): string | undefined => Deno.env.get(name);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

/** Calls a service-role-only database function through PostgREST. */
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not available");
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${fn}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let email: string | null;
  let password: string;
  let fullName: string;
  let otp: string;
  try {
    const raw = await req.text();
    if (raw.length > 20_000) return json(413, { error: "Request too large" });
    const body = JSON.parse(raw) as { email?: unknown; password?: unknown; full_name?: unknown; otp?: unknown };
    email = normaliseEmail(body.email);
    password = typeof body.password === "string" ? body.password : "";
    fullName = String(body.full_name ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 200);
    otp = String(body.otp ?? "").trim();
  } catch {
    return json(400, { error: "Invalid request" });
  }

  if (!email || !password || !otp) {
    return json(400, { error: "Email, password, and OTP are required" });
  }
  if (password.length < 6) {
    return json(400, { error: "Password must be at least 6 characters" });
  }
  if (!OTP_FORMAT.test(otp)) {
    return json(400, { error: "Invalid OTP format" });
  }

  try {
    // Verify the code (atomic: marks it used, or counts the miss).
    const outcome = await rpc<string>("check_booking_otp", {
      p_email: email,
      p_otp_hash: await hashOTP(otp, env("SUPABASE_SERVICE_ROLE_KEY") ?? ""),
    });
    if (outcome === "locked") return json(200, { error: LOCKED_MESSAGE });
    if (outcome !== "valid") return json(200, { error: "Invalid or expired verification code" });

    // Create the user (email already verified via OTP)
    const supabase = createClient(env("SUPABASE_URL") ?? "", env("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      const msg = createError.message?.toLowerCase() || "";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        return json(200, { error: "An account with this email already exists. Please sign in." });
      }
      console.error("Create user error:", createError);
      return json(500, { error: createError.message });
    }

    return json(200, { success: true, user_id: createData.user?.id });
  } catch (error: unknown) {
    console.error("Error in signup-with-otp:", error);
    return json(500, { error: "Signup failed" });
  }
};

serve(handler);
