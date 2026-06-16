import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple hash function for OTP
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Generate 6-digit OTP using cryptographically secure random number generation
function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Modulo 900000 gives range 0-899999, adding 100000 gives 100000-999999
  const randomNumber = (array[0] % 900000) + 100000;
  return randomNumber.toString();
}

interface SendOTPRequest {
  email: string;
  customer_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, customer_name }: SendOTPRequest = await req.json();

    // Validate required fields
    if (!email) {
      throw new Error("Email is required");
    }

    console.log("Processing OTP request for:", email);

    // Generate OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Delete any existing OTPs for this email
    await supabase.from("booking_otps").delete().eq("email", email.toLowerCase());

    // Store hashed OTP in database
    const { error: insertError } = await supabase.from("booking_otps").insert({
      email: email.toLowerCase(),
      otp_hash: otpHash,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      throw new Error("Failed to generate OTP");
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Portable Office Cabin</h1>
          </div>
          <div style="background-color: #ffffff; padding: 40px 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">Hello ${customer_name || "there"},</p>
            <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">Please use the verification code below to complete your appointment booking:</p>
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
              <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; color: #1a365d; letter-spacing: 8px;">${otp}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">This code will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
              © ${new Date().getFullYear()} Portable Office Cabin. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Get SMTP configuration from environment
    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.zoho.in";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUsername = Deno.env.get("SMTP_USERNAME") || "";
    const smtpPassword = Deno.env.get("SMTP_PASSWORD") || "";
    const smtpFrom = Deno.env.get("SMTP_FROM") || smtpUsername;
    const smtpFromName = Deno.env.get("SMTP_FROM_NAME") || "Portable Office Cabin";

    console.log("Connecting to SMTP server:", smtpHost, "port:", smtpPort);

    // Create SMTP client with Zoho settings
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUsername,
          password: smtpPassword,
        },
      },
    });

    try {
      // Send email via SMTP
      await client.send({
        from: `${smtpFromName} <${smtpFrom}>`,
        to: email,
        subject: "Your Appointment Booking Verification Code",
        content: `Your OTP is: ${otp}. This code will expire in 10 minutes.`,
        html: emailHtml,
      });

      console.log("OTP email sent successfully to:", email);
    } finally {
      // Always close the connection
      await client.close();
    }

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-booking-otp function:", error);
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
