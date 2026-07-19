-- ═══════════════════════════════════════════════════════════════════════════════════════
--  Guest (unauthenticated) checkout support on public.orders
-- ═══════════════════════════════════════════════════════════════════════════════════════
--
-- Purely ADDITIVE and fully IDEMPOTENT. This database has a history of migration drift
-- (a migration committed but never applied to the live project), so this file is safe to
-- run repeatedly and safe to run against a database that already has some of it applied.
--
-- WHY: Google Merchant Center suspended the account for "User cannot complete purchase".
-- The root cause was that the entire cart + checkout flow required a logged-in Supabase
-- user, so a brand-new visitor coming from a Shopping ad could never pay. Guest checkout
-- fixes that, but a guest order has NO auth.users row — and today
--     public.orders.user_id  is  uuid NOT NULL REFERENCES auth.users(id)
-- which makes inserting a guest order impossible. This migration relaxes exactly that one
-- constraint and adds the contact columns a guest order needs so the business can still
-- reach and deliver to the customer.
--
-- NOTHING is dropped or renamed:
--   • Logged-in orders keep setting user_id = auth.uid() and stay covered by the existing
--     "Users can view own orders" RLS policy and the user_id-filtered realtime channel, so
--     MyOrders / MyAccount continue to work untouched.
--   • The admin Orders page reads orders via SELECT * (service/admin RLS) and does not join
--     on user_id, so a null user_id does not break it.
--   • The order_number trigger, order_items, order_status_history and every Razorpay column
--     are unchanged.
--
-- The server writes orders with the service-role key (see app/api/razorpay/order/route.ts),
-- which bypasses RLS, so NO new INSERT policy is required and NONE is added — orders must
-- never be anon-readable via RLS (that would leak every customer's order).

-- ── 1. Let a guest order exist ──────────────────────────────────────────────────────────
-- Idempotent: DROP NOT NULL on an already-nullable column is a harmless no-op.
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- ── 2. Capture guest contact (guests have no profiles row) ──────────────────────────────
-- Nullable so existing logged-in orders (which carry contact via the profile) are unaffected.
-- Validation is enforced in the checkout API before an order is created for a guest.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name  text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_phone text;

COMMENT ON COLUMN public.orders.user_id        IS 'auth.users id for a logged-in order; NULL for a guest checkout. Guest contact then lives in customer_name/email/phone.';
COMMENT ON COLUMN public.orders.customer_name  IS 'Guest checkout: full name captured at checkout (NULL for logged-in orders, which use the profile).';
COMMENT ON COLUMN public.orders.customer_email IS 'Guest checkout: email captured at checkout — order reference + Razorpay reconciliation.';
COMMENT ON COLUMN public.orders.customer_phone IS 'Guest checkout: phone captured at checkout — delivery coordination.';
