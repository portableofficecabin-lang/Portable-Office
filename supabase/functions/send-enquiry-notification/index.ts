import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

/**
 * send-enquiry-notification — e-mails the sales inbox about a new enquiry and sends the customer a
 * short acknowledgement.
 *
 * HARDENED 2026-10-12 (PR #86). The previous version:
 *   • interpolated every field into the HTML unescaped (HTML injection into the sales inbox);
 *   • had no field validation;
 *   • would e-mail ANY address with ANY text on request, echoing the caller's message back in the
 *     "acknowledgement" — an open relay for spam sent from the company's own mail account.
 *
 * Now:
 *   • every interpolated value is HTML-escaped;
 *   • fields are validated and length-capped, and enquiry_type is whitelisted;
 *   • an e-mail is sent ONLY when a matching row (same e-mail address) was inserted into
 *     `enquiries` within the last 15 minutes — i.e. only for real submissions, which the database
 *     and the /api/enquiries route rate-limit. The lookup uses SUPABASE_URL +
 *     SUPABASE_SERVICE_ROLE_KEY, which the Supabase Edge runtime provides automatically;
 *   • the acknowledgement no longer repeats the customer's message, so it cannot carry a payload.
 *
 * Callers are unchanged: every existing form inserts its row first and then invokes this function.
 * DEPLOY MANUALLY: `supabase functions deploy send-enquiry-notification` — merging to main does
 * not deploy edge functions.
 */

const ADMIN_EMAIL = "info@portableofficecabin.com";
const RECENT_ROW_WINDOW_MS = 15 * 60 * 1000;

/** Every environment read goes through here (one Deno reference for the Node-side typecheck). */
const env = (name: string): string | undefined => Deno.env.get(name);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnquiryNotification {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
  enquiry_type: string;
  product_name?: string;
}

const typeLabels: Record<string, string> = {
  general: "General Enquiry",
  quote: "Quote Request",
  product: "Product Enquiry",
  support: "Support Request",
};

// Same maxima as the enquiries_field_lengths_check constraint and src/lib/enquiries/enquiryLimits.ts
// (enquiryLimits.test.ts fails if they drift), so every stored enquiry can also be e-mailed.
const LIMITS = { name: 200, email: 254, phone: 40, company: 200, subject: 300, message: 8000, product_name: 300 };
const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

/** Escape for HTML text and double-quoted attribute contexts. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Single-line header-safe text (subjects, display names). */
function oneLine(value: unknown, max: number): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

/** True when an enquiry from this address was stored in the last 15 minutes; null = cannot tell. */
async function hasRecentEnquiry(email: string): Promise<boolean | null> {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  const since = new Date(Date.now() - RECENT_ROW_WINDOW_MS).toISOString();
  const query =
    `${url}/rest/v1/enquiries?select=id&email=ilike.${encodeURIComponent(email)}` +
    `&created_at=gte.${encodeURIComponent(since)}&limit=1`;
  const res = await fetch(query, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const raw = await req.text();
    if (raw.length > 20_000) return json(413, { error: "Request too large" });
    const enquiry = JSON.parse(raw) as EnquiryNotification;

    const name = oneLine(enquiry.name, LIMITS.name);
    const email = oneLine(enquiry.email, LIMITS.email).toLowerCase();
    const message = String(enquiry.message ?? "").trim();
    if (!name || !EMAIL.test(email) || !message) return json(400, { error: "Missing required fields" });
    if (message.length > LIMITS.message) return json(400, { error: "Message too long" });
    for (const k of ["phone", "company", "subject", "product_name"] as const) {
      if (String(enquiry[k] ?? "").length > LIMITS[k]) return json(400, { error: `${k} too long` });
    }
    const enquiryType = Object.prototype.hasOwnProperty.call(typeLabels, enquiry.enquiry_type)
      ? enquiry.enquiry_type
      : "general";

    // Only real, stored submissions trigger e-mail.
    const recent = await hasRecentEnquiry(email);
    if (recent === false) {
      console.warn("send-enquiry-notification: no matching recent enquiry row — not sending");
      return json(403, { error: "No matching enquiry" });
    }
    if (recent === null) console.warn("send-enquiry-notification: could not verify the enquiry row — sending anyway");

    const label = typeLabels[enquiryType];
    const row = (title: string, value: unknown) =>
      value ? `<p style="margin: 8px 0; color: #4b5563;"><strong>${title}:</strong> ${esc(value)}</p>` : "";

    // Admin notification email — every value escaped.
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="margin-bottom: 30px;">
              <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">
                ${esc(label)}
              </span>
              <h1 style="color: #1f2937; margin: 16px 0 0 0; font-size: 24px;">New Enquiry Received</h1>
            </div>

            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <h2 style="color: #1f2937; font-size: 16px; margin: 0 0 16px 0;">Contact Information</h2>
              ${row("Name", name)}
              <p style="margin: 8px 0; color: #4b5563;"><strong>Email:</strong> <a href="mailto:${esc(email)}" style="color: #2563eb;">${esc(email)}</a></p>
              ${row("Phone", enquiry.phone)}
              ${row("Company", enquiry.company)}
              ${row("Product", enquiry.product_name)}
            </div>

            ${enquiry.subject ? `<h3 style="color: #1f2937; font-size: 16px; margin: 0 0 8px 0;">Subject: ${esc(enquiry.subject)}</h3>` : ""}

            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 8px 0;">Message</h3>
              <p style="color: #4b5563; font-size: 14px; margin: 0; white-space: pre-wrap; line-height: 1.6;">${esc(message)}</p>
            </div>

            <div style="text-align: center;">
              <a href="mailto:${esc(email)}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #fbbf24); color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                Reply to ${esc(name)}
              </a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Customer acknowledgment — deliberately does NOT repeat the submitted message.
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b, #fbbf24); border-radius: 12px; margin: 0 auto 16px;"></div>
              <h1 style="color: #1f2937; margin: 0; font-size: 24px;">Thank You for Contacting Us</h1>
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Dear ${esc(name)},
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Thank you for reaching out to Portable Office Cabin. We have received your enquiry and our team will get back to you within 24 hours.
            </p>

            <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Portable Office Cabin | Premium Portable Solutions
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Get SMTP configuration from environment
    const smtpHost = env("SMTP_HOST") || "smtp.zoho.in";
    const smtpPort = parseInt(env("SMTP_PORT") || "465");
    const smtpUsername = env("SMTP_USERNAME") || "";
    const smtpPassword = env("SMTP_PASSWORD") || "";
    const smtpFrom = env("SMTP_FROM") || smtpUsername;
    const smtpFromName = env("SMTP_FROM_NAME") || "Portable Office Cabin";

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
      await client.send({
        from: `${smtpFromName} <${smtpFrom}>`,
        to: ADMIN_EMAIL,
        subject: `New ${label} from ${oneLine(name, 80)}`,
        content: `New enquiry from ${name} (${email}): ${message}`,
        html: adminEmailHtml,
      });

      await client.send({
        from: `${smtpFromName} <${smtpFrom}>`,
        to: email,
        subject: "We've Received Your Enquiry - Portable Office Cabin",
        content: `Dear ${name}, thank you for contacting us. We have received your enquiry and will respond within 24 hours.`,
        html: customerEmailHtml,
      });
    } finally {
      await client.close();
    }

    return json(200, { success: true });
  } catch (error: unknown) {
    console.error("Error in send-enquiry-notification:", error);
    return json(500, { error: "Notification failed" });
  }
};

serve(handler);
