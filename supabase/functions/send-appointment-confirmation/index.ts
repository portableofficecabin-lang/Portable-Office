import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @deno-types="npm:@types/nodemailer@6.4.17"
import nodemailer from "npm:nodemailer@6.9.16";
import { notifyAppointment, type ClaimedAppointment } from "./notify.ts";
import { adminNotification, customerConfirmation, type EmailContent } from "./templates.ts";

/**
 * send-appointment-confirmation — after a booking is stored (src/views/BookAppointment.tsx), e-mails
 * the business inboxes and sends the customer a short confirmation (Reply-To: the published sales
 * address).
 *
 * HARDENED 2026-11-05. The previous version e-mailed ANY address with ANY text the request carried
 * (name, company, notes, service), unescaped, from the company's Zoho account: an open relay for spam
 * on the account that also sends enquiry notifications. It also sent through denomailer 1.6.0, which
 * the Edge runtime kills with "CPU Time exceeded" (as send-enquiry-notification before #175). Now, as
 * in send-enquiry-notification:
 *   • ONE notification per stored booking: claim_appointment_notification() atomically claims the
 *     newest not-yet-e-mailed appointment from the address (last 15 minutes); a replayed or
 *     parallel call gets nothing (supabase/migrations/20261105130000_appointment_notification_claim.sql);
 *   • both e-mails are built from the STORED row, not from the request; the request supplies only
 *     the address;
 *   • the customer confirmation carries no visitor-typed text (templates.ts) and points to sales@;
 *   • no claim, no e-mail: if the database cannot be reached it sends nothing (fail closed);
 *   • if no business inbox could be e-mailed the claim is released for a retry (at most 3 attempts);
 *   • nodemailer over implicit TLS with explicit timeouts, one pooled connection for all messages.
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the Supabase Edge runtime.
 *
 * The caller is unchanged: BookAppointment inserts the row, then invokes this function with the same
 * body as before (only customer_email is read now). DEPLOY MANUALLY, AFTER applying the 2026-11-05
 * migration:
 *   supabase functions deploy send-appointment-confirmation --no-verify-jwt
 * (the site's publishable key is not a JWT, so JWT verification must stay off; merging to main does
 * not deploy edge functions).
 */

/** The business inboxes that get every booking (unchanged from the previous version). */
const ADMIN_EMAILS = [
  "sales@portableofficecabin.com",
  "portableofficecabin@gmail.com",
] as const;

/** Every environment read goes through here. */
const env = (name: string): string | undefined => Deno.env.get(name);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Same maximum as appointments_field_lengths_check. The address is the only field read from the
// request: everything e-mailed comes from the stored appointment row.
const EMAIL_MAX = 255;
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
    const body = JSON.parse(raw) as { customer_email?: unknown; email?: unknown };
    email = String(body.customer_email ?? body.email ?? "").replace(/[\r\n\t]+/g, " ").trim().toLowerCase();
  } catch {
    return json(400, { error: "Invalid request" });
  }
  if (email.length > EMAIL_MAX || !EMAIL.test(email)) return json(400, { error: "Missing required fields" });

  // SMTP configuration from the function's secrets (shared with the other e-mail functions). Port
  // 465 (TLS): Supabase Edge Functions cannot connect out on 25 or 587.
  const smtpUsername = env("SMTP_USERNAME") || "";
  const smtpFrom = env("SMTP_FROM") || smtpUsername;
  const from = `${env("SMTP_FROM_NAME") || "Portable Office Cabin"} <${smtpFrom}>`;
  // Connected only once a claim succeeded, so replays never open an SMTP session.
  const smtp: { transport: nodemailer.Transporter | null } = { transport: null };
  const send = async (to: string, mail: EmailContent) => {
    const port = parseInt(env("SMTP_PORT") || "465");
    const transport = (smtp.transport ??= nodemailer.createTransport({
      host: env("SMTP_HOST") || "smtp.zoho.in",
      port,
      secure: port === 465, // implicit TLS, as before
      auth: { user: smtpUsername, pass: env("SMTP_PASSWORD") || "" },
      pool: true, // one connection (one TLS handshake) for all messages
      maxConnections: 1,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    }));
    await transport.sendMail({
      from,
      to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    });
  };

  try {
    const result = await notifyAppointment(email, {
      claim: async (address) =>
        (await rpc<ClaimedAppointment[]>("claim_appointment_notification", { p_email: address }))[0] ?? null,
      finish: async (appointmentId, claimToken, sent, error) => {
        await rpc<boolean>("finish_appointment_notification", {
          p_appointment_id: appointmentId,
          p_claim_token: claimToken,
          p_sent: sent,
          p_error: error,
        });
      },
      adminRecipients: ADMIN_EMAILS,
      sendAdmin: (to, appointment) => send(to, adminNotification(appointment)),
      sendConfirmation: (appointment) => send(appointment.customer_email, customerConfirmation(appointment)),
      log: (message) => console.warn(`send-appointment-confirmation: ${message}`),
    });
    return json(result.status, result.body);
  } catch (error: unknown) {
    console.error("Error in send-appointment-confirmation:", error);
    return json(500, { error: "Notification failed" });
  } finally {
    try {
      smtp.transport?.close();
    } catch {
      // The connection is already gone; nothing to clean up.
    }
  }
};

serve(handler);
