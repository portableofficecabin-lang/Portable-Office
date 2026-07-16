-- ============================================================================
-- FIX: "Payment could not be started (order storage failed). Please contact us."
--
-- WHY THIS HAPPENS
-- ----------------------------------------------------------------------------
-- Checkout gets all the way to storing the Razorpay order id and then fails:
--
--     await admin.from("orders").update({ razorpay_order_id: razorpayOrder.id })
--
-- ...because public.orders has no `razorpay_order_id` column on the LIVE database.
-- The migrations exist in the repo but were never applied to this Supabase project
-- (the same migration-drift that caused the earlier "schema cache" / PGRST204 errors).
--
-- Everything before this line already works, which is why you see THIS error and not
-- the old one: env vars OK, sign-in OK, cart read OK, totals OK, local order INSERT OK,
-- and Razorpay ACCEPTED the order (so your Razorpay keys are valid). Only the DB write fails.
-- The route then deletes the local order again, so no half-finished order is left behind.
--
-- WHAT THIS RUNS
-- ----------------------------------------------------------------------------
-- Both payment migrations, in order, verbatim:
--   supabase/migrations/20260713090000_razorpay_payment_fields.sql   (columns on orders)
--   supabase/migrations/20260714130000_razorpay_webhook_events.sql   (webhook idempotency)
--
-- Both are ADDITIVE and IDEMPOTENT — nothing is dropped or renamed, and re-running is safe.
-- The webhook table is needed too: without it payments would be captured by Razorpay but the
-- webhook could never mark the order paid.
--
-- WHERE TO RUN:  Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
--                Use the SAME project your site's NEXT_PUBLIC_SUPABASE_URL points at.
--                (Or: npx supabase db push — which applies both files properly.)
--                NEVER run supabase/full_schema.sql against production.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1/2 — Razorpay payment fields on public.orders
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id   text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS razorpay_signature  text;

CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id
  ON public.orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id
  ON public.orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- One Razorpay order maps to exactly one local order.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_razorpay_order_id
  ON public.orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

COMMENT ON COLUMN public.orders.razorpay_order_id   IS 'Razorpay order id (order_xxx). Created at checkout; does NOT imply payment.';
COMMENT ON COLUMN public.orders.razorpay_payment_id IS 'Razorpay payment id (pay_xxx). Set only after server-side HMAC signature verification.';
COMMENT ON COLUMN public.orders.razorpay_signature  IS 'Verified Razorpay signature, retained for audit.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2/2 — Razorpay webhook idempotency ledger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            text NOT NULL,
  event_type          text NOT NULL,
  razorpay_payment_id text,
  razorpay_order_id   text,
  order_id            uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  outcome             text NOT NULL DEFAULT 'processed',
  received_at         timestamptz NOT NULL DEFAULT now()
);

-- The idempotency guarantee: a repeat delivery of the same event id cannot insert twice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_razorpay_webhook_events_event_id
  ON public.razorpay_webhook_events (event_id);

CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_events_payment_id
  ON public.razorpay_webhook_events (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_events_order_id
  ON public.razorpay_webhook_events (order_id)
  WHERE order_id IS NOT NULL;

-- Locked down: RLS on with NO policies -> only the service role may touch it.
ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.razorpay_webhook_events          IS 'Idempotency ledger + audit trail for Razorpay webhooks. Service-role only (RLS on, no policies).';
COMMENT ON COLUMN public.razorpay_webhook_events.event_id IS 'Razorpay x-razorpay-event-id header — the idempotency key (unique).';
COMMENT ON COLUMN public.razorpay_webhook_events.outcome  IS 'processed | ignored | order_not_found.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3 — VERIFY. Expect: 3 columns, then the table, then rls_enabled = true.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'orders'
   AND column_name LIKE 'razorpay%'
 ORDER BY column_name;   -- expect exactly: razorpay_order_id, razorpay_payment_id, razorpay_signature

SELECT to_regclass('public.razorpay_webhook_events') AS webhook_table;  -- expect non-null

SELECT relname, relrowsecurity AS rls_enabled
  FROM pg_class
 WHERE oid = 'public.razorpay_webhook_events'::regclass;  -- expect rls_enabled = true
