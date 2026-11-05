import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { hashOTP, LOCKED_MESSAGE, normaliseEmail, OTP_FORMAT } from "../_shared/otp.ts";

/**
 * verify-booking-otp — checks a code e-mailed by send-booking-otp (Contact form, product reviews,
 * appointment booking).
 *
 * HARDENED 2026-11-05: the check is now one atomic database call, check_booking_otp()
 * (supabase/migrations/20261105120000_booking_otp_limits.sql). A match marks the code used; a miss
 * counts against it, and after 5 wrong guesses the code is dead, so a 6-digit code can no longer be
 * guessed by brute force within its 10 minutes. Responses keep their earlier shape:
 * 200 { valid: true, message } or 200 { valid: false, error }; 400 / 500 { error }.
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the Supabase Edge runtime.
 * DEPLOY MANUALLY, AFTER applying the 2026-11-05 migration:
 *   supabase functions deploy verify-booking-otp --no-verify-jwt
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let email: string | null;
  let otp: string;
  try {
    const raw = await req.text();
    if (raw.length > 20_000) return json(413, { error: "Request too large" });
    const body = JSON.parse(raw) as { email?: unknown; otp?: unknown };
    email = normaliseEmail(body.email);
    otp = String(body.otp ?? "").trim();
  } catch {
    return json(400, { error: "Invalid request" });
  }
  if (!email || !otp) return json(400, { error: "Email and OTP are required" });
  if (!OTP_FORMAT.test(otp)) return json(200, { valid: false, error: "Invalid OTP format" });

  try {
    const outcome = await rpc<string>("check_booking_otp", {
      p_email: email,
      p_otp_hash: await hashOTP(otp, env("SUPABASE_SERVICE_ROLE_KEY") ?? ""),
    });
    if (outcome === "valid") return json(200, { valid: true, message: "OTP verified successfully" });
    if (outcome === "locked") return json(200, { valid: false, error: LOCKED_MESSAGE });
    return json(200, { valid: false, error: "Invalid or expired OTP" });
  } catch (error: unknown) {
    console.error("Error in verify-booking-otp function:", error);
    return json(500, { error: "Failed to verify OTP" });
  }
};

serve(handler);
