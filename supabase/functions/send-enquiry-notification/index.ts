import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { notifyEnquiry, type ClaimedEnquiry } from "./notify.ts";
import { adminNotification, customerAcknowledgement, type EmailContent } from "./templates.ts";

/**
 * send-enquiry-notification — e-mails the business inbox about a new enquiry and sends the customer a
 * short acknowledgement (Reply-To: the published sales address).
 *
 * HARDENED 2026-10-12 (PR #86). The previous version:
 *   • interpolated every field into the HTML unescaped (HTML injection into the sales inbox);
 *   • had no field validation;
 *   • would e-mail ANY address with ANY text on request, echoing the caller's message back in the
 *     "acknowledgement" — an open relay for spam sent from the company's own mail account.
 *
 * HARDENED AGAIN 2026-10-18. The 2026-10-12 version still let one stored enquiry be replayed into
 * unlimited e-mails for 15 minutes, put the visitor's name into the acknowledgement, and sent
 * anyway when it could not check the database. Now:
 *   • ONE notification per stored enquiry: claim_enquiry_notification() atomically claims the newest
 *     not-yet-e-mailed enquiry from the address (last 15 minutes); a replayed or parallel call gets
 *     nothing (supabase/migrations/20261018120000_enquiry_notification_claim.sql);
 *   • the business e-mail is built from the STORED row, not from the request; the request supplies
 *     only the address;
 *   • the acknowledgement is fixed text with nothing the visitor typed (templates.ts);
 *   • no claim, no e-mail: if the database cannot be reached it sends nothing (fail closed);
 *   • a failed business e-mail releases the claim for a retry (at most 3 attempts in all).
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the Supabase Edge runtime.
 *
 * Callers are unchanged: every form inserts its row first and then invokes this function.
 * DEPLOY MANUALLY, AFTER applying the 2026-10-18 migration:
 *   supabase functions deploy send-enquiry-notification --no-verify-jwt
 * (the site's publishable key is not a JWT, so JWT verification must stay off; merging to main does
 * not deploy edge functions).
 */

/** Where every business enquiry notification is delivered (owner's choice, 2026-10-18). The website
 *  and the customer acknowledgement keep showing sales@portableofficecabin.com (templates.ts). */
const BUSINESS_NOTIFICATION_TO = "portableofficecabin@gmail.com";

/** Every environment read goes through here (one Deno reference for the Node-side typecheck). */
const env = (name: string): string | undefined => Deno.env.get(name);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Same maximum as the enquiries_field_lengths_check constraint and src/lib/enquiries/enquiryLimits.ts
// (enquiryLimits.test.ts fails if they drift). The address is the only field read from the request:
// everything e-mailed comes from the stored enquiry row.
const LIMITS = { email: 254 };
const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

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

  let email: string;
  try {
    const raw = await req.text();
    if (raw.length > 20_000) return json(413, { error: "Request too large" });
    const body = JSON.parse(raw) as { email?: unknown };
    email = String(body.email ?? "").replace(/[\r\n\t]+/g, " ").trim().toLowerCase();
  } catch {
    return json(400, { error: "Invalid request" });
  }
  if (email.length > LIMITS.email || !EMAIL.test(email)) return json(400, { error: "Missing required fields" });

  // SMTP configuration from the function's secrets (shared with send-booking-otp). Port 465 (TLS):
  // Supabase Edge Functions cannot connect out on 25 or 587.
  const smtpUsername = env("SMTP_USERNAME") || "";
  const smtpFrom = env("SMTP_FROM") || smtpUsername;
  const from = `${env("SMTP_FROM_NAME") || "Portable Office Cabin"} <${smtpFrom}>`;
  // Connected only once a claim succeeded, so replays never open an SMTP session.
  const smtp: { client: SMTPClient | null } = { client: null };
  const send = async (to: string, mail: EmailContent) => {
    smtp.client ??= new SMTPClient({
      connection: {
        hostname: env("SMTP_HOST") || "smtp.zoho.in",
        port: parseInt(env("SMTP_PORT") || "465"),
        tls: true,
        auth: { username: smtpUsername, password: env("SMTP_PASSWORD") || "" },
      },
    });
    await smtp.client.send({
      from,
      to,
      subject: mail.subject,
      content: mail.text,
      html: mail.html,
      ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    });
  };

  try {
    const result = await notifyEnquiry(email, {
      claim: async (address) =>
        (await rpc<ClaimedEnquiry[]>("claim_enquiry_notification", { p_email: address }))[0] ?? null,
      finish: async (enquiryId, claimToken, sent, error) => {
        await rpc<boolean>("finish_enquiry_notification", {
          p_enquiry_id: enquiryId,
          p_claim_token: claimToken,
          p_sent: sent,
          p_error: error,
        });
      },
      sendAdmin: (enquiry) => send(BUSINESS_NOTIFICATION_TO, adminNotification(enquiry)),
      sendAcknowledgement: (to) => send(to, customerAcknowledgement()),
      log: (message) => console.warn(`send-enquiry-notification: ${message}`),
    });
    return json(result.status, result.body);
  } catch (error: unknown) {
    console.error("Error in send-enquiry-notification:", error);
    return json(500, { error: "Notification failed" });
  } finally {
    try {
      await smtp.client?.close();
    } catch {
      // The connection is already gone; nothing to clean up.
    }
  }
};

serve(handler);
