-- ═══════════════════════════════════════════════════════════════════════════════════════
--  Razorpay webhook idempotency ledger
-- ═══════════════════════════════════════════════════════════════════════════════════════
--
-- Purely ADDITIVE and fully IDEMPOTENT (safe to re-run; this project has a history of
-- migrations being committed but never applied). Nothing existing is touched — this is a
-- NEW table, not a change to `orders` or the existing razorpay_* columns.
--
-- WHY THIS TABLE EXISTS
-- Razorpay delivers each webhook AT LEAST ONCE: the same event can arrive several times
-- (retries after a slow response, network hiccups, manual re-sends from the dashboard).
-- `app/api/razorpay/webhook` claims each event here by its Razorpay event id BEFORE acting
-- on it. The UNIQUE constraint turns "have I already processed this?" into a single atomic
-- INSERT: the first delivery wins the insert and does the work; every later duplicate hits
-- the unique violation and is acknowledged with 200 without touching the order again.
--
-- It is also the audit trail for reconciliation — every event we accepted, what it was,
-- and which local order it moved.
--
-- SECURITY: RLS is enabled with NO policies, so no browser/user role can read or write it
-- at all. Only the server's service-role key (which bypasses RLS) touches this table. It
-- may hold ids and a redacted event type, never a secret.

CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Razorpay's own event id (the `x-razorpay-event-id` header). The idempotency key.
  event_id            text NOT NULL,

  -- "payment.captured" | "order.paid" | "payment.failed" | … (whatever Razorpay sent).
  event_type          text NOT NULL,

  -- Entity ids pulled out of the payload, for reconciliation. Nullable: not every event
  -- carries every id, and an event for an order we do not recognise is still recorded.
  razorpay_payment_id text,
  razorpay_order_id   text,
  order_id            uuid REFERENCES public.orders(id) ON DELETE SET NULL,

  -- What we did with it: 'processed' | 'ignored' | 'order_not_found'. Free text, for humans.
  outcome             text NOT NULL DEFAULT 'processed',

  received_at         timestamptz NOT NULL DEFAULT now()
);

-- The idempotency guarantee. A repeat delivery of the same event id cannot be inserted twice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_razorpay_webhook_events_event_id
  ON public.razorpay_webhook_events (event_id);

-- Reconcile a Razorpay dashboard entry back to the events we processed.
CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_events_payment_id
  ON public.razorpay_webhook_events (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_events_order_id
  ON public.razorpay_webhook_events (order_id)
  WHERE order_id IS NOT NULL;

-- Locked down: only the service role (which bypasses RLS) may touch this table.
ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.razorpay_webhook_events            IS 'Idempotency ledger + audit trail for Razorpay webhooks. Service-role only (RLS on, no policies).';
COMMENT ON COLUMN public.razorpay_webhook_events.event_id   IS 'Razorpay x-razorpay-event-id header — the idempotency key (unique).';
COMMENT ON COLUMN public.razorpay_webhook_events.outcome    IS 'processed | ignored | order_not_found.';
