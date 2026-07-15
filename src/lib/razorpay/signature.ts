/**
 * Razorpay signature verification — the security-critical primitives, in ONE pure, testable place.
 *
 * Both API routes (verify + webhook) share these rather than hand-rolling HMAC each, so there is a
 * single audited implementation of "is this signature genuine?". No Supabase, no Next, no secrets
 * baked in — the secret is always passed in by the caller from process.env, never stored here.
 *
 * Two DIFFERENT signatures, two DIFFERENT secrets:
 *   • the Checkout handshake     → HMAC(`${order_id}|${payment_id}`, RAZORPAY_KEY_SECRET)
 *   • the webhook delivery       → HMAC(rawRequestBody,               RAZORPAY_WEBHOOK_SECRET)
 * Razorpay emits both as lowercase hex.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** HMAC-SHA256 of `message` under `secret`, lowercase hex — the encoding Razorpay uses. */
export function hmacHex(message: string, secret: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

/**
 * Constant-time comparison of two hex signatures. Returns false (never throws) on any length
 * mismatch or empty input — `timingSafeEqual` itself throws when the buffers differ in length, and
 * a thrown error in a payment path is a worse failure than a clean "does not match".
 *
 * The comparison is timing-safe so an attacker cannot recover the expected signature one byte at a
 * time by measuring how long a wrong guess takes to be rejected.
 */
export function signaturesMatch(expectedHex: string, receivedHex: string): boolean {
  if (typeof expectedHex !== "string" || typeof receivedHex !== "string") return false;
  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");
  if (expected.length === 0 || expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

/**
 * The Razorpay Checkout handshake signature. `originalOrderId` MUST be the order id WE stored at
 * checkout (from our database), not one the browser supplied — that binding is what stops a valid
 * signature for the attacker's own order being replayed onto someone else's order.
 */
export function verifyCheckoutSignature(args: {
  originalOrderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const expected = hmacHex(`${args.originalOrderId}|${args.paymentId}`, args.keySecret);
  return signaturesMatch(expected, args.signature);
}

/**
 * The Razorpay webhook signature. `rawBody` MUST be the exact bytes received — verify BEFORE any
 * JSON.parse, because parsing and re-serialising changes the bytes and the HMAC would never match.
 */
export function verifyWebhookSignature(args: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}): boolean {
  const expected = hmacHex(args.rawBody, args.webhookSecret);
  return signaturesMatch(expected, args.signature);
}
