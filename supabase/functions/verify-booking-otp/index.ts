import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Same hash function as send-booking-otp
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface VerifyOTPRequest {
  email: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp }: VerifyOTPRequest = await req.json();

    // Validate required fields
    if (!email || !otp) {
      throw new Error("Email and OTP are required");
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid OTP format" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Hash the provided OTP
    const otpHash = await hashOTP(otp);

    // Fetch all valid OTPs for this email (to allow constant-time comparison)
    const { data: otpRecords, error: lookupError } = await supabase
      .from("booking_otps")
      .select("*")
      .eq("email", email.toLowerCase())
      .gt("expires_at", new Date().toISOString())
      .eq("verified", false);

    if (lookupError) {
      console.error("Error looking up OTP:", lookupError);
      throw new Error("Failed to verify OTP");
    }

    // Constant-time comparison function to prevent timing attacks
    function constantTimeCompare(a: string, b: string): boolean {
      if (a.length !== b.length) {
        // Still do comparison to maintain constant time
        let diff = a.length ^ b.length;
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
          diff |= (a.charCodeAt(i % a.length) || 0) ^ (b.charCodeAt(i % b.length) || 0);
        }
        return false;
      }
      let diff = 0;
      for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      return diff === 0;
    }

    // Find matching OTP using constant-time comparison
    const otpRecord = otpRecords?.find(record => constantTimeCompare(record.otp_hash, otpHash));

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid or expired OTP" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Mark OTP as verified
    await supabase
      .from("booking_otps")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    // Clean up expired OTPs
    await supabase
      .from("booking_otps")
      .delete()
      .lt("expires_at", new Date().toISOString());

    console.log("OTP verified successfully for:", email);

    return new Response(
      JSON.stringify({ valid: true, message: "OTP verified successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-booking-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
