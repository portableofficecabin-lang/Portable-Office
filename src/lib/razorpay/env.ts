/**
 * Payment environment validation — SERVER ONLY.
 *
 * ── WHAT THIS IS FOR ────────────────────────────────────────────────────────────────────
 * A payment route must never half-work. If a key is missing we want ONE obvious failure that
 * names the missing variable, not a route that reaches Razorpay and dies with a 401, or worse,
 * appears to take a payment it cannot record.
 *
 * ── THE RULE: NAMES, NEVER VALUES ───────────────────────────────────────────────────────
 * These helpers return only the NAMES of variables that are absent. A value is never returned,
 * logged, or put in an HTTP response — logging "RAZORPAY_KEY_SECRET=abc123" to a platform log
 * is how a secret leaks into a log aggregator that is not treated as a secret store.
 *
 * A variable set to an empty/whitespace string counts as MISSING. On DigitalOcean App Platform
 * it is easy to create the key with a blank value; `process.env.X` is then "" — truthy-checking
 * it would pass, and the route would fail later with something far less obvious.
 */

/** Present = a non-empty, non-whitespace string. */
const present = (v: string | undefined): boolean => typeof v === "string" && v.trim().length > 0;

export interface PaymentEnv {
  /** Razorpay key id. Public-safe, but read server-side so the checkout cannot drift from it. */
  keyId: string;
  /** THE Razorpay secret. Signs/verifies payments. Never leaves the server. */
  keySecret: string;
  supabaseUrl: string;
  /** Service-role key. Bypasses RLS. Never leaves the server. */
  serviceKey: string;
}

export interface WebhookEnv {
  supabaseUrl: string;
  serviceKey: string;
  /** A DIFFERENT secret from RAZORPAY_KEY_SECRET — it signs webhook deliveries. */
  webhookSecret: string;
}

/** The names of any variables the checkout/verify routes need but do not have. */
export function missingPaymentEnv(): string[] {
  return [
    !present(process.env.RAZORPAY_KEY_ID) && "RAZORPAY_KEY_ID",
    !present(process.env.RAZORPAY_KEY_SECRET) && "RAZORPAY_KEY_SECRET",
    !present(process.env.NEXT_PUBLIC_SUPABASE_URL) && "NEXT_PUBLIC_SUPABASE_URL",
    !present(process.env.SUPABASE_SERVICE_ROLE_KEY) && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter((x): x is string => typeof x === "string");
}

/** The names of any variables the webhook route needs but does not have. */
export function missingWebhookEnv(): string[] {
  return [
    !present(process.env.NEXT_PUBLIC_SUPABASE_URL) && "NEXT_PUBLIC_SUPABASE_URL",
    !present(process.env.SUPABASE_SERVICE_ROLE_KEY) && "SUPABASE_SERVICE_ROLE_KEY",
    !present(process.env.RAZORPAY_WEBHOOK_SECRET) && "RAZORPAY_WEBHOOK_SECRET",
  ].filter((x): x is string => typeof x === "string");
}

/**
 * The validated payment config, or null when something is missing.
 * Returning null (rather than throwing) keeps the caller's error response explicit and typed.
 */
export function readPaymentEnv(): PaymentEnv | null {
  if (missingPaymentEnv().length > 0) return null;
  return {
    keyId: process.env.RAZORPAY_KEY_ID!.trim(),
    keySecret: process.env.RAZORPAY_KEY_SECRET!.trim(),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  };
}

export function readWebhookEnv(): WebhookEnv | null {
  if (missingWebhookEnv().length > 0) return null;
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET!.trim(),
  };
}

/**
 * The customer-facing message for a misconfigured server. It names the missing VARIABLES so the
 * operator can fix it from the error alone — deliberately NOT their values.
 *
 * Whether naming the variables to the public is acceptable is a judgement call: it reveals that
 * this is a Supabase/Razorpay stack, which an attacker can already tell from the network tab and
 * the checkout script. The operational value of a self-diagnosing 500 outweighs it, and no value
 * is ever exposed. If you would rather say nothing publicly, return a generic sentence here and
 * keep the detail in the server log (which already carries it).
 */
export function misconfiguredMessage(missing: string[]): string {
  return `Payments are not configured on this server (missing: ${missing.join(", ")}). Please contact us to complete your order.`;
}
