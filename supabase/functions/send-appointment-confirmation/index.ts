import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = [
  "sales@portableofficecabin.com",
  "portableofficecabin@gmail.com",
];

interface AppointmentNotification {
  customer_name: string;
  customer_email: string;
  appointment_date: string;
  appointment_time: string;
  service_type: string;
  company?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const appointment: AppointmentNotification = await req.json();

    if (!appointment.customer_email || !appointment.customer_name) {
      throw new Error("Missing required fields");
    }

    console.log("Sending appointment confirmation to:", appointment.customer_email);

    const emailHtml = `
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
              Dear ${appointment.customer_name},
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Thank you for booking an appointment with Portable Office Cabin. We have received your request and will confirm it within 24 hours.
            </p>
            
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 16px 0;">Appointment Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Service:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${appointment.service_type}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${appointment.appointment_date}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${appointment.appointment_time}</td>
                </tr>
                ${appointment.company ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Company:</td>
                  <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">${appointment.company}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
              If you need to reschedule or cancel your appointment, please contact us at info@portableofficecabin.com.
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
    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.zoho.in";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUsername = Deno.env.get("SMTP_USERNAME") || "";
    const smtpPassword = Deno.env.get("SMTP_PASSWORD") || "";
    const smtpFrom = Deno.env.get("SMTP_FROM") || smtpUsername;
    const smtpFromName = Deno.env.get("SMTP_FROM_NAME") || "Portable Office Cabin";

    console.log("Connecting to SMTP server:", smtpHost);

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
      await client.send({
        from: `${smtpFromName} <${smtpFrom}>`,
        to: appointment.customer_email,
        subject: "Appointment Request Received - Portable Office Cabin",
        content: `Dear ${appointment.customer_name}, your appointment for ${appointment.service_type} on ${appointment.appointment_date} at ${appointment.appointment_time} has been received.`,
        html: emailHtml,
      });

      console.log("Appointment confirmation email sent to customer");

      // Build admin notification email
      const adminHtml = `
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
                <p style="margin: 6px 0; color: #4b5563;"><strong>Name:</strong> ${appointment.customer_name}</p>
                <p style="margin: 6px 0; color: #4b5563;"><strong>Email:</strong> <a href="mailto:${appointment.customer_email}" style="color:#2563eb;">${appointment.customer_email}</a></p>
                ${appointment.company ? `<p style="margin: 6px 0; color: #4b5563;"><strong>Company:</strong> ${appointment.company}</p>` : ''}
              </div>
              <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #1f2937; font-size: 16px; margin: 0 0 12px 0;">Appointment</h2>
                <p style="margin: 6px 0; color: #4b5563;"><strong>Service:</strong> ${appointment.service_type}</p>
                <p style="margin: 6px 0; color: #4b5563;"><strong>Date:</strong> ${appointment.appointment_date}</p>
                <p style="margin: 6px 0; color: #4b5563;"><strong>Time:</strong> ${appointment.appointment_time}</p>
                ${appointment.notes ? `<p style="margin: 6px 0; color: #4b5563;"><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
              </div>
              <div style="text-align:center;">
                <a href="mailto:${appointment.customer_email}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
                  Reply to ${appointment.customer_name}
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Notify both admin inboxes
      for (const adminEmail of ADMIN_EMAILS) {
        try {
          await client.send({
            from: `${smtpFromName} <${smtpFrom}>`,
            to: adminEmail,
            subject: `New Appointment: ${appointment.customer_name} — ${appointment.service_type}`,
            content: `New appointment: ${appointment.customer_name} (${appointment.customer_email}) booked ${appointment.service_type} on ${appointment.appointment_date} at ${appointment.appointment_time}.`,
            html: adminHtml,
          });
          console.log(`Admin notification sent to ${adminEmail}`);
        } catch (e) {
          console.error(`Failed to notify ${adminEmail}:`, e);
        }
      }
    } finally {
      await client.close();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-appointment-confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
