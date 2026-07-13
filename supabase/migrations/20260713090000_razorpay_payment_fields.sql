-- ═══════════════════════════════════════════════════════════════════════════════════════
--  Razorpay payment fields on public.orders
-- ═══════════════════════════════════════════════════════════════════════════════════════
--
-- Purely ADDITIVE and fully IDEMPOTENT. This database has a history of migration drift
-- (a migration committed but never applied to the live project), so this file is safe to
-- run repeatedly and safe to run against a database that already has some of it applied.
--
-- Nothing is dropped or renamed: the admin Orders page reads the existing columns
-- (order_number, status, total_amount, payment_method, payment_status, shipping_*, notes)
-- and must keep working untouched.
--
-- Column meanings:
--   razorpay_order_id    the `order_xxx` id returned when we create the Razorpay order
--                        (set at checkout, BEFORE payment — its presence does not mean paid)
--   razorpay_payment_id  the `pay_xxx` id of the successful payment — set ONLY by
--                        app/api/razorpay/verify after a timing-safe HMAC signature check
--   razorpay_signature   the signature we verified, retained for audit/reconciliation
--
-- The source of truth for "has this been paid" remains orders.payment_status = 'paid',
-- which only the server (service role) can write — RLS grants users no UPDATE on orders.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id   text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS razorpay_signature  text;

-- Looked up when reconciling a Razorpay webhook/dashboard entry back to a local order.
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id
  ON public.orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id
  ON public.orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- One Razorpay order maps to exactly one local order. A duplicate here would mean two
-- local orders believe they own the same payment, so make that impossible.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_razorpay_order_id
  ON public.orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

COMMENT ON COLUMN public.orders.razorpay_order_id   IS 'Razorpay order id (order_xxx). Created at checkout; does NOT imply payment.';
COMMENT ON COLUMN public.orders.razorpay_payment_id IS 'Razorpay payment id (pay_xxx). Set only after server-side HMAC signature verification.';
COMMENT ON COLUMN public.orders.razorpay_signature  IS 'Verified Razorpay signature, retained for audit.';
