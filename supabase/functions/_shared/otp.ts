/**
 * Verification-code helpers shared by send-booking-otp, verify-booking-otp and signup-with-otp.
 *
 * Plain TypeScript with no imports and no Deno APIs (Web Crypto only), so the edge functions and
 * the Node tests (src/lib/otp/bookingOtp.test.ts) load this same file. The hash is unchanged from
 * the earlier per-function copies: SHA-256 of the code followed by the secret, as 64 hex digits.
 * The database only ever stores and compares this hash (supabase/migrations/
 * 20261105120000_booking_otp_limits.sql: issue_booking_otp / check_booking_otp).
 */

/** A code as the visitor types it. */
export const OTP_FORMAT = /^\d{6}$/;

/** Same shape check as the database functions and send-enquiry-notification. */
export const EMAIL_FORMAT = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;
export const EMAIL_MAX = 254;

/** Lower-cased, trimmed address, or null when it is not a plausible e-mail address. */
export function normaliseEmail(value: unknown): string | null {
  const email = String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().toLowerCase();
  return email.length <= EMAIL_MAX && EMAIL_FORMAT.test(email) ? email : null;
}

/** A 6-digit code from a cryptographically secure random number (100000–999999). */
export function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return ((array[0] % 900000) + 100000).toString();
}

/** SHA-256(code + secret) as 64 lower-case hex digits. */
export async function hashOTP(otp: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(otp + secret);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Shown when check_booking_otp() answers 'locked': no live code is left for the address. */
export const LOCKED_MESSAGE =
  "This code has expired, been used, or had too many wrong attempts. Please request a new code.";
