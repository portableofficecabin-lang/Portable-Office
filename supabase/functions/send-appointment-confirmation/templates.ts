/**
 * E-mail content for send-appointment-confirmation.
 *
 * Plain TypeScript with no imports, so the edge function (Deno) and the Node tests
 * (src/lib/appointments/appointmentNotification.test.ts) load this same file.
 *
 *   • adminNotification(appointment) — to the business inboxes. Built from the STORED appointment
 *     row, never from the request; every value is HTML-escaped and header values are single-line.
 *   • customerConfirmation(appointment) — to the customer. It shows only the date and time (typed
 *     Postgres date/time values, so they cannot carry text) and the service when it is exactly one
 *     of the booking form's options. Nothing the visitor typed (name, company, notes, a made-up
 *     service) can appear in it, so it is useless as a spam carrier even when someone books under
 *     another person's address. It shows the published sales address and sets it as Reply-To.
 */

/** The address published on the website; shown in, and the Reply-To of, the confirmation. */
export const SALES_EMAIL = "sales@portableofficecabin.com";

/** The stored appointment fields the e-mails use (as returned by claim_appointment_notification). */
export interface StoredAppointment {
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  company: string | null;
  appointment_date: string;
  appointment_time: string;
  service_type: string;
  notes: string | null;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
  /** Reply-To header; omitted → replies go to the sender. */
  replyTo?: string;
}

/** The booking form's options (src/views/BookAppointment.tsx). Anything else is not echoed back. */
export const SERVICE_TYPES = [
  "Portable Cabin Consultation",
  "Site Office Enquiry",
  "Container Office Installation",
  "Prefab Home Design",
  "Portable Toilet Setup",
  "Security Cabin Installation",
  "General Consultation",
] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

/** "2026-11-12" → "12 Nov 2026"; anything else → null. */
export function formatDate(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m || +m[2] < 1 || +m[2] > 12) return null;
  return `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
}

/** "10:30:00" or "10:30" → "10:30"; anything else → null. */
export function formatTime(value: string): string | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.exec(value);
  return m ? `${m[1]}:${m[2]}` : null;
}

/** The service as booked, only when it is one of the form's options. */
export function knownService(value: string): string | null {
  return (SERVICE_TYPES as readonly string[]).includes(value) ? value : null;
}

const detailRow = (title: string, value: string) => `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${title}:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${esc(value)}</td>
                </tr>`;

export function customerConfirmation(appointment: StoredAppointment): EmailContent {
  const service = knownService(appointment.service_type);
  const date = formatDate(appointment.appointment_date);
  const time = formatTime(appointment.appointment_time);
  const rows = [service && detailRow("Service", service), date && detailRow("Date", date), time && detailRow("Time", time)]
    .filter(Boolean)
    .join("");

  const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b, #fbbf24); border-radius: 12px; margin: 0 auto 16px;"></div>
              <h1 style="color: #1f2937; margin: 0; font-size: 24px;">Appointment Request Received</h1>
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Hello,
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Thank you for booking an appointment with Portable Office Cabin. We have received your request and will confirm it within 24 hours.
            </p>
            ${rows ? `
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 16px 0;">Appointment Details</h2>
              <table style="width: 100%; border-collapse: collapse;">${rows}
              </table>
            </div>` : ""}

            <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
              If you need to reschedule or cancel your appointment, reply to this e-mail or contact us at <a href="mailto:${SALES_EMAIL}" style="color: #2563eb;">${SALES_EMAIL}</a>.
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

  const when = [date, time && `at ${time}`].filter(Boolean).join(" ");
  const text = [
    "Hello,",
    "",
    `Thank you for booking an appointment with Portable Office Cabin${service ? ` (${service})` : ""}${when ? ` for ${when}` : ""}. We have received your request and will confirm it within 24 hours.`,
    "",
    `If you need to reschedule or cancel, reply to this e-mail or contact us at ${SALES_EMAIL}.`,
    "",
    "Portable Office Cabin",
  ].join("\n");

  return { subject: "Appointment Request Received - Portable Office Cabin", text, html, replyTo: SALES_EMAIL };
}

export function adminNotification(appointment: StoredAppointment): EmailContent {
  const name = oneLine(appointment.customer_name, 100);
  const email = oneLine(appointment.customer_email, 255);
  const line = (title: string, value: unknown) =>
    value ? `<p style="margin: 6px 0; color: #4b5563;"><strong>${title}:</strong> ${esc(value)}</p>` : "";
  const date = formatDate(appointment.appointment_date) ?? appointment.appointment_date;
  const time = formatTime(appointment.appointment_time) ?? appointment.appointment_time;
  const mailto = `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}`;

  const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="margin-bottom: 24px;">
                <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">NEW APPOINTMENT</span>
                <h1 style="color: #1f2937; margin: 16px 0 0 0; font-size: 22px;">New Appointment Booking Received</h1>
              </div>
              <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #1f2937; font-size: 16px; margin: 0 0 12px 0;">Customer Details</h2>
                ${line("Name", name)}
                <p style="margin: 6px 0; color: #4b5563;"><strong>Email:</strong> <a href="${esc(mailto)}" style="color:#2563eb;">${esc(email)}</a></p>
                ${line("Phone", appointment.customer_phone)}
                ${line("Company", appointment.company)}
              </div>
              <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #1f2937; font-size: 16px; margin: 0 0 12px 0;">Appointment</h2>
                ${line("Service", appointment.service_type)}
                ${line("Date", date)}
                ${line("Time", time)}
                ${line("Notes", appointment.notes)}
              </div>
              <div style="text-align:center;">
                <a href="${esc(mailto)}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                  Reply to ${esc(name)}
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

  const text = [
    "New appointment booking received",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    appointment.customer_phone ? `Phone: ${oneLine(appointment.customer_phone, 50)}` : "",
    appointment.company ? `Company: ${oneLine(appointment.company, 300)}` : "",
    `Service: ${oneLine(appointment.service_type, 100)}`,
    `Date: ${date}`,
    `Time: ${time}`,
    appointment.notes ? `Notes: ${appointment.notes.slice(0, 1000)}` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");

  return {
    subject: oneLine(`New Appointment: ${name} — ${oneLine(appointment.service_type, 100)}`, 200),
    text,
    html,
  };
}
