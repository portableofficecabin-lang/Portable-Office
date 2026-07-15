/**
 * Razorpay signature-verification tests — run the REAL primitives the two API routes use.
 *
 *   npx tsx scripts/razorpay-signature.test.ts
 *
 * No network, no database, no real secrets: these assert the cryptographic contract only. A
 * throwaway secret is generated in-process purely to sign a known message and check it verifies —
 * it is never a real key and never leaves this file.
 */
import { createHmac, randomBytes } from "node:crypto";

import {
  hmacHex,
  signaturesMatch,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../src/lib/razorpay/signature";

let pass = 0;
let fail = 0;
const check = (name: string, cond: boolean) => {
  if (cond) { pass++; console.log(`   PASS  ${name}`); }
  else { fail++; console.log(`   FAIL  ${name}`); }
};

// A random per-run secret. NOT a real key — only used to prove the algorithm round-trips.
const SECRET = randomBytes(24).toString("hex");
const WEBHOOK_SECRET = randomBytes(24).toString("hex");

console.log("\n=============== signaturesMatch (timing-safe, total) ===============");
{
  const a = hmacHex("hello", SECRET);
  check("identical hex matches", signaturesMatch(a, a));
  check("different hex of equal length does NOT match", !signaturesMatch(a, hmacHex("world", SECRET)));
  check("different length does NOT match (and does not throw)", !signaturesMatch(a, a.slice(0, -2)));
  check("empty received does NOT match", !signaturesMatch(a, ""));
  check("empty expected does NOT match", !signaturesMatch("", a));
  check("non-hex garbage does NOT match (no throw)", !signaturesMatch(a, "zz zz not hex"));
  // @ts-expect-error — defensive: undefined must be handled, not crash a payment path
  check("undefined input does NOT match (no throw)", !signaturesMatch(a, undefined));
}

console.log("\n=============== Checkout handshake signature ===============");
{
  const originalOrderId = "order_ABC123";
  const paymentId = "pay_XYZ789";
  // Razorpay signs `${order_id}|${payment_id}` with the KEY secret.
  const good = createHmac("sha256", SECRET).update(`${originalOrderId}|${paymentId}`).digest("hex");

  check("a genuine Checkout signature verifies", verifyCheckoutSignature({
    originalOrderId, paymentId, signature: good, keySecret: SECRET,
  }));

  check("a signature made with the WRONG secret is rejected", !verifyCheckoutSignature({
    originalOrderId, paymentId, signature: good, keySecret: SECRET + "00",
  }));

  check("REPLAY onto a different order id is rejected (the id is bound into the HMAC)",
    !verifyCheckoutSignature({ originalOrderId: "order_SOMEONE_ELSE", paymentId, signature: good, keySecret: SECRET }));

  check("a tampered payment id is rejected", !verifyCheckoutSignature({
    originalOrderId, paymentId: "pay_TAMPERED", signature: good, keySecret: SECRET,
  }));

  check("a swapped order/payment order (wrong concatenation) is rejected", !verifyCheckoutSignature({
    originalOrderId: paymentId, paymentId: originalOrderId, signature: good, keySecret: SECRET,
  }));
}

console.log("\n=============== Webhook signature (over the RAW body) ===============");
{
  const body = JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_1", order_id: "order_1", amount: 500000, currency: "INR", status: "captured" } } },
  });
  const good = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");

  check("a genuine webhook signature verifies", verifyWebhookSignature({
    rawBody: body, signature: good, webhookSecret: WEBHOOK_SECRET,
  }));

  check("the WEBHOOK secret is separate from the KEY secret", !verifyWebhookSignature({
    rawBody: body, signature: good, webhookSecret: SECRET,
  }));

  check("a single byte flipped in the body invalidates the signature (raw-body binding)",
    !verifyWebhookSignature({ rawBody: body.replace("500000", "100"), signature: good, webhookSecret: WEBHOOK_SECRET }));

  check("re-serialising the JSON (same data, different bytes) would FAIL — proves parse-after-verify",
    (() => {
      const reserialised = JSON.stringify(JSON.parse(body)); // semantically equal, byte-different in general
      // For THIS body the round-trip happens to be identical, so assert the general property directly:
      const spaced = JSON.stringify(JSON.parse(body), null, 2); // definitely different bytes
      void reserialised;
      return !verifyWebhookSignature({ rawBody: spaced, signature: good, webhookSecret: WEBHOOK_SECRET });
    })());

  check("an empty signature header is rejected", !verifyWebhookSignature({
    rawBody: body, signature: "", webhookSecret: WEBHOOK_SECRET,
  }));
}

console.log("\n=============== RESULT ===============");
console.log(`   ${pass} passed · ${fail} failed`);
if (fail) process.exitCode = 1;
