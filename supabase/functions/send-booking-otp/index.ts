import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @deno-types="npm:@types/nodemailer@6.4.17"
import nodemailer from "npm:nodemailer@6.9.16";
import { generateOTP, hashOTP, normaliseEmail } from "../_shared/otp.ts";
import { otpEmail } from "./templates.ts";

/**
 * send-booking-otp — e-mails a 6-digit verification code. Used by the Contact form, product reviews,
 * appointment booking and account registration; the code is checked by verify-booking-otp or
 * signup-with-otp.
 *
 * HARDENED 2026-11-05. The previous version:
 *   • e-mailed a code to ANY address, as often as asked, from the company's Zoho account (the same
 *     account that sends enquiry notifications, so a spam suspension would stop those too);
 *   • put the caller-supplied name into the e-mail as raw HTML;
 *   • sent through denomailer 1.6.0, which the Edge runtime kills with "CPU Time exceeded" (the
 *     same failure as send-enquiry-notification before #175), so codes most likely never arrived.
 * Now:
 *   • issue_booking_otp() stores the code only if the address was not sent one in the last
 *     60 seconds, 5 in the last hour or 10 in the last 24 hours, counted race-free in the database
 *     (supabase/migrations/20261105120000_booking_otp_limits.sql); otherwise 429 and no e-mail;
 *   • the e-mail is fixed text plus the code (templates.ts); customer_name is accepted from the
 *     existing callers but never used;
 *   • nodemailer over implicit TLS with explicit timeouts, as in send-enquiry-notification;
 *   • no stored code, no e-mail: if the database cannot be reached it sends nothing (fail closed).
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the Supabase Edge runtime.
 *
 * Callers are unchanged (src/views/Contact.tsx, BookAppointment.tsx, Register.tsx,
 * src/components/products/ReviewSubmitModal.tsx). Responses: 200 { success, message } as before;
 * 400 / 429 / 502 / 503 { error } with a message the forms can show.
 * DEPLOY MANUALLY, AFTER applying the 2026-11-05 migration:
 *   supabase functions deploy send-booking-otp --no-verify-jwt
 * (the site's publishable key is not a JWT, so JWT verification must stay off; merging to main does
 * not deploy edge functions).
 */

/** Every environment read goes through here. */
const env = (name: string): string | undefined => Deno.env.get(name);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LIMIT_MESSAGES: Record<string, string> = {
  too_soon:
    "A code was sent to this address less than a minute ago. Please use that code, or wait a minute and try again.",
  too_many: "Too many codes have been sent to this address. Please try again later, or contact us.",
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

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  let email: string | null;
  try {
    const raw = await req.text();
    if (raw.length > 20_000) return json(413, { error: "Request too large" });
    email = normaliseEmail((JSON.parse(raw) as { email?: unknown }).email);
  } catch {
    return json(400, { error: "Invalid request" });
  }
  if (!email) return json(400, { error: "A valid email address is required" });

  const otp = generateOTP();
  const otpHash = await hashOTP(otp, env("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  // 1) Store the code (or refuse under the send limits). Fail closed: no stored code, no e-mail.
  let outcome: string;
  try {
    outcome = await rpc<string>("issue_booking_otp", { p_email: email, p_otp_hash: otpHash });
  } catch (e) {
    console.error(`send-booking-otp: could not store the code, nothing sent: ${reason(e)}`);
    return json(503, { error: "Verification is unavailable right now. Please try again shortly." });
  }
  if (Object.prototype.hasOwnProperty.call(LIMIT_MESSAGES, outcome)) {
    return json(429, { error: LIMIT_MESSAGES[outcome] });
  }
  if (outcome !== "ok") return json(400, { error: "A valid email address is required" });

  // 2) E-mail it. SMTP configuration from the function's secrets (shared with
  //    send-enquiry-notification). Port 465 (TLS): Supabase Edge Functions cannot connect out on
  //    25 or 587.
  const smtpUsername = env("SMTP_USERNAME") || "";
  const smtpFrom = env("SMTP_FROM") || smtpUsername;
  const port = parseInt(env("SMTP_PORT") || "465");
  const transport = nodemailer.createTransport({
    host: env("SMTP_HOST") || "smtp.zoho.in",
    port,
    secure: port === 465, // implicit TLS, as before
    auth: { user: smtpUsername, pass: env("SMTP_PASSWORD") || "" },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  try {
    const mail = otpEmail(otp);
    await transport.sendMail({
      from: `${env("SMTP_FROM_NAME") || "Portable Office Cabin"} <${smtpFrom}>`,
      to: email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  } catch (e) {
    // The stored code stays valid; the send limits still apply to a retry.
    console.error(`send-booking-otp: e-mail failed: ${reason(e)}`);
    return json(502, { error: "Could not send the verification code. Please try again in a minute." });
  } finally {
    try {
      transport.close();
    } catch {
      // The connection is already gone; nothing to clean up.
    }
  }

  return json(200, { success: true, message: "OTP sent successfully" });
};

serve(handler);
