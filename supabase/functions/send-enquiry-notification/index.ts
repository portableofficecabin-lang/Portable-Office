import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const ADMIN_EMAIL = "info@portableofficecabin.com";

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const enquiry: EnquiryNotification = await req.json();

    if (!enquiry.name || !enquiry.email || !enquiry.message) {
      throw new Error("Missing required fields");
    }

    console.log("Sending enquiry notification for:", enquiry.email);

    // Admin notification email
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="margin-bottom: 30px;">
              <span style="background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">
                ${typeLabels[enquiry.enquiry_type] || "General Enquiry"}
              </span>
              <h1 style="color: #1f2937; margin: 16px 0 0 0; font-size: 24px;">New Enquiry Received</h1>
            </div>
            
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <h2 style="color: #1f2937; font-size: 16px; margin: 0 0 16px 0;">Contact Information</h2>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Name:</strong> ${enquiry.name}</p>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Email:</strong> <a href="mailto:${enquiry.email}" style="color: #2563eb;">${enquiry.email}</a></p>
              ${enquiry.phone ? `<p style="margin: 8px 0; color: #4b5563;"><strong>Phone:</strong> ${enquiry.phone}</p>` : ''}
              ${enquiry.company ? `<p style="margin: 8px 0; color: #4b5563;"><strong>Company:</strong> ${enquiry.company}</p>` : ''}
              ${enquiry.product_name ? `<p style="margin: 8px 0; color: #4b5563;"><strong>Product:</strong> ${enquiry.product_name}</p>` : ''}
            </div>
            
            ${enquiry.subject ? `<h3 style="color: #1f2937; font-size: 16px; margin: 0 0 8px 0;">Subject: ${enquiry.subject}</h3>` : ''}
            
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 8px 0;">Message</h3>
              <p style="color: #4b5563; font-size: 14px; margin: 0; white-space: pre-wrap; line-height: 1.6;">${enquiry.message}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="mailto:${enquiry.email}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #fbbf24); color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                Reply to ${enquiry.name}
              </a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Customer acknowledgment email
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
              Dear ${enquiry.name},
            </p>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Thank you for reaching out to Portable Office Cabin. We have received your enquiry and our team will get back to you within 24-48 hours.
            </p>
            
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <h2 style="color: #1f2937; font-size: 16px; margin: 0 0 12px 0;">Your Message</h2>
              <p style="color: #4b5563; font-size: 14px; margin: 0; white-space: pre-wrap; line-height: 1.6;">${enquiry.message}</p>
            </div>
            
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
      // Send admin notification
      await client.send({
        from: `${smtpFromName} <${smtpFrom}>`,
        to: ADMIN_EMAIL,
        subject: `New ${typeLabels[enquiry.enquiry_type] || "Enquiry"} from ${enquiry.name}`,
        content: `New enquiry from ${enquiry.name} (${enquiry.email}): ${enquiry.message}`,
        html: adminEmailHtml,
      });

      console.log("Admin email sent successfully");

      // Send customer acknowledgment
      await client.send({
        from: `${smtpFromName} <${smtpFrom}>`,
        to: enquiry.email,
        subject: "We've Received Your Enquiry - Portable Office Cabin",
        content: `Dear ${enquiry.name}, thank you for contacting us. We have received your enquiry and will respond within 24-48 hours.`,
        html: customerEmailHtml,
      });

      console.log("Customer email sent successfully");
    } finally {
      await client.close();
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-enquiry-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
