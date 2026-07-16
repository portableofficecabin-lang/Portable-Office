/**
 * THE service-role Supabase client. SERVER ONLY — never import this from a client component.
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────────────────
 * The service-role key bypasses Row Level Security entirely: it is a database root password.
 * It is required because RLS deliberately grants users NO UPDATE on `orders` and no INSERT on
 * `order_status_history` — that is precisely what stops a browser marking its own order paid.
 * Only the server, holding this key, may write those rows.
 *
 * Every payment route used to construct its own service client inline, which meant the same
 * security-critical setup existed in three places and could drift. This is that one place.
 *
 * ── THE GUARD ───────────────────────────────────────────────────────────────────────────
 * `import "server-only"` would be the canonical Next.js guard, but this repo deliberately
 * avoids adding dependencies for supply-chain reasons (it calls Razorpay over REST rather than
 * take the `razorpay` package). So the guard is a runtime throw instead: if this module is ever
 * pulled into a browser bundle, the very first call fails loudly rather than shipping the key.
 * `process.env.SUPABASE_SERVICE_ROLE_KEY` has no NEXT_PUBLIC_ prefix, so Next.js already refuses
 * to inline it client-side — this is defence in depth, not the only line of defence.
 *
 * NOTE: intentionally UNTYPED (no <Database> generic). The razorpay_* columns come from
 * supabase/migrations/20260713090000_razorpay_payment_fields.sql and are not yet in the
 * generated src/integrations/supabase/types.ts. Regenerate the types and this can be typed.
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Build a service-role client from ALREADY-VALIDATED config.
 *
 * The url/key are passed in rather than read from process.env here, so the caller does the
 * missing-variable check ONCE (see requirePaymentEnv) and this cannot be called with undefined.
 */
export function createSupabaseAdminClient(supabaseUrl: string, serviceRoleKey: string) {
  if (typeof window !== "undefined") {
    // Belt and braces: a bundler that somehow pulled this into the browser must break here,
    // not silently hand a root-password client to a customer's tab.
    throw new Error("createSupabaseAdminClient() is server-only and must never run in a browser.");
  }
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("createSupabaseAdminClient() called without a URL and service-role key.");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    // No session persistence / refresh: this client is per-request and belongs to no user.
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
