/**
 * E-mail content for send-enquiry-notification.
 *
 * Plain TypeScript with no imports, so the edge function (Deno) and the Node tests
 * (src/lib/enquiries/enquiryNotification.test.ts) load this same file.
 *
 *   • adminNotification(enquiry) — to the business inbox. Built from the STORED enquiry row, never
 *     from the request; every value is HTML-escaped and header values are single-line.
 *   • customerAcknowledgement() — to the visitor. It takes no arguments, so nothing the visitor
 *     typed (name, message, company, …) can ever appear in it. That is what makes it useless as a
 *     spam carrier even when someone stores an enquiry under another person's address.
 */

/** The stored enquiry fields the admin e-mail shows (as returned by claim_enquiry_notification). */
export interface StoredEnquiry {
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  subject: string | null;
  message: string;
  enquiry_type: string;
  product_name: string | null;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const TYPE_LABELS: Record<string, string> = {
  general: "General Enquiry",
  quote: "Quote Request",
  product: "Product Enquiry",
  support: "Support Request",
};

/** Escape for HTML text and double-quoted attribute contexts. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Single-line header-safe text (subjects, display names). */
export function oneLine(value: unknown, max: number): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export function typeLabel(enquiryType: string): string {
  return Object.prototype.hasOwnProperty.call(TYPE_LABELS, enquiryType) ? TYPE_LABELS[enquiryType] : TYPE_LABELS.general;
}

export function adminNotification(enquiry: StoredEnquiry): EmailContent {
  const label = typeLabel(enquiry.enquiry_type);
  const row = (title: string, value: unknown) =>
    value ? `<p style="margin: 8px 0; color: #4b5563;"><strong>${title}:</strong> ${esc(value)}</p>` : "";

  const html = `
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
              ${row("Name", enquiry.name)}
              <p style="margin: 8px 0; color: #4b5563;"><strong>Email:</strong> <a href="mailto:${esc(enquiry.email)}" style="color: #2563eb;">${esc(enquiry.email)}</a></p>
              ${row("Phone", enquiry.phone)}
              ${row("Company", enquiry.company)}
              ${row("Product", enquiry.product_name)}
            </div>

            ${enquiry.subject ? `<h3 style="color: #1f2937; font-size: 16px; margin: 0 0 8px 0;">Subject: ${esc(enquiry.subject)}</h3>` : ""}

            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 8px 0;">Message</h3>
              <p style="color: #4b5563; font-size: 14px; margin: 0; white-space: pre-wrap; line-height: 1.6;">${esc(enquiry.message)}</p>
            </div>

            <div style="text-align: center;">
              <a href="mailto:${esc(enquiry.email)}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #fbbf24); color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                Reply to ${esc(enquiry.name)}
              </a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

  return {
    subject: `New ${label} from ${oneLine(enquiry.name, 80)}`,
    text: `New enquiry from ${oneLine(enquiry.name, 200)} (${oneLine(enquiry.email, 254)}): ${enquiry.message}`,
    html,
  };
}

/** Fixed text: deliberately takes no arguments (see the header). */
export function customerAcknowledgement(): EmailContent {
  const html = `
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
              Hello,
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

  return {
    subject: "We've Received Your Enquiry - Portable Office Cabin",
    text: "Hello, thank you for contacting Portable Office Cabin. We have received your enquiry and our team will get back to you within 24 hours.",
    html,
  };
}
