/**
 * E-mail content for send-booking-otp.
 *
 * Plain TypeScript with no imports, so the edge function (Deno) and the Node tests
 * (src/lib/otp/bookingOtp.test.ts) load this same file.
 *
 * otpEmail(otp) takes only the code. Nothing the visitor typed (the name the forms send, for
 * instance) can appear in it, so the function cannot be used to put someone else's text into an
 * e-mail from the company's account. The wording is neutral because the same code serves the
 * Contact form, product reviews, appointment booking and account registration.
 */

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export function otpEmail(otp: string): EmailContent {
  // The code is generated server-side (6 digits); refuse anything else rather than e-mail it.
  if (!/^\d{6}$/.test(otp)) throw new Error("otpEmail: the code must be 6 digits");
  const year = new Date().getFullYear();

  const html = `
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
            <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">Hello,</p>
            <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">Please use the verification code below to confirm your e-mail address:</p>
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
              <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; color: #1a365d; letter-spacing: 8px;">${otp}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">This code will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
              © ${year} Portable Office Cabin. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

  return {
    subject: "Your Portable Office Cabin verification code",
    text: `Your verification code is ${otp}. It expires in 10 minutes. If you didn't request this code, please ignore this email.`,
    html,
  };
}
