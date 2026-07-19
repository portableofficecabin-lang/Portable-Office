-- ============================================================================
-- FIX: guest checkout fails with a NOT NULL violation on public.orders.user_id
--
-- WHY THIS HAPPENS
-- ----------------------------------------------------------------------------
-- Google Merchant Center suspended the account for "User cannot complete
-- purchase". The fix enables full guest (logged-out) checkout. A guest order has
-- no auth.users row, but public.orders.user_id is currently
--     uuid NOT NULL REFERENCES auth.users(id)
-- so the server's order INSERT (app/api/razorpay/order/route.ts) fails for guests
-- with a NOT NULL / FK violation and checkout still breaks.
--
-- This site has a documented history of migration drift (migrations committed to
-- the repo but never applied to the live Supabase project — the same cause as the
-- earlier "schema cache" / PGRST204 and razorpay_order_id errors). If guest
-- checkout still fails after deploying the code, this migration was not applied.
--
-- WHAT THIS RUNS
-- ----------------------------------------------------------------------------
-- The guest-orders migration, verbatim:
--   supabase/migrations/20260719120000_guest_orders.sql
--
-- It is ADDITIVE and IDEMPOTENT — nothing is dropped or renamed, and re-running is
-- safe. It only relaxes orders.user_id from NOT NULL to nullable and adds three
-- nullable guest-contact columns.
--
-- WHERE TO RUN:  Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
--                Use the SAME project your site's NEXT_PUBLIC_SUPABASE_URL points at.
--                (Or: npx supabase db push — which applies the migration properly.)
--                NEVER run supabase/full_schema.sql against production.
-- ============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1 — Let a guest order exist (relax NOT NULL; idempotent no-op if already nullable)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2 — Capture guest contact (nullable; existing logged-in orders unaffected)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name  text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_phone text;

COMMENT ON COLUMN public.orders.user_id        IS 'auth.users id for a logged-in order; NULL for a guest checkout.';
COMMENT ON COLUMN public.orders.customer_name  IS 'Guest checkout: full name captured at checkout.';
COMMENT ON COLUMN public.orders.customer_email IS 'Guest checkout: email captured at checkout.';
COMMENT ON COLUMN public.orders.customer_phone IS 'Guest checkout: phone captured at checkout.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3 — VERIFY. Expect: is_nullable = YES, then the three customer_* columns.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'user_id';   -- expect YES

SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'orders'
   AND column_name IN ('customer_name', 'customer_email', 'customer_phone')
 ORDER BY column_name;   -- expect exactly: customer_email, customer_name, customer_phone
