import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, password, full_name, otp }: SignupRequest = await req.json();

    if (!email || !password || !otp) {
      return new Response(JSON.stringify({ error: "Email, password, and OTP are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!/^\d{6}$/.test(otp)) {
      return new Response(JSON.stringify({ error: "Invalid OTP format" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify OTP
    const otpHash = await hashOTP(otp);
    const { data: otpRecords, error: lookupError } = await supabase
      .from("booking_otps")
      .select("*")
      .eq("email", email.toLowerCase())
      .gt("expires_at", new Date().toISOString())
      .eq("verified", false);

    if (lookupError) throw new Error("Failed to verify OTP");

    const otpRecord = otpRecords?.find((r) => constantTimeCompare(r.otp_hash, otpHash));
    if (!otpRecord) {
      return new Response(JSON.stringify({ error: "Invalid or expired verification code" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Mark OTP verified
    await supabase.from("booking_otps").update({ verified: true }).eq("id", otpRecord.id);

    // Create the user (email already verified via OTP)
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || "" },
    });

    if (createError) {
      const msg = createError.message?.toLowerCase() || "";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        return new Response(
          JSON.stringify({ error: "An account with this email already exists. Please sign in." }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
      console.error("Create user error:", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Cleanup expired
    await supabase.from("booking_otps").delete().lt("expires_at", new Date().toISOString());

    return new Response(JSON.stringify({ success: true, user_id: createData.user?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in signup-with-otp:", error);
    return new Response(JSON.stringify({ error: error.message || "Signup failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
