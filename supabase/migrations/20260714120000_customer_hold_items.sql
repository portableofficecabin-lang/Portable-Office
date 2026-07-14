-- ============================================================================
-- Completed Items — Customer Hold  (MEMORANDUM / OFF-LEDGER)
-- ============================================================================
-- Goods that are FINISHED and READY FOR DISPATCH but are being held back at the
-- CUSTOMER's request, with no tax invoice raised yet.
--
-- WHY THIS IS A SEPARATE TABLE AND NOT A `ledger_entries` ROW
-- ----------------------------------------------------------------------------
-- `ledger_entries` is the FORMAL book of account: Parties.tsx computes the
-- customer's balance as `opening + SUM(debit) - SUM(credit)`. Anything written
-- there lands in that balance.
--
-- These items must NOT land in that balance:
--   * No tax invoice has been raised, so no debtor exists.
--   * Control of the goods has not transferred (they have not been removed), so
--     revenue is not recognised — in the books they are still Finished Goods
--     (inventory), not a receivable.
--   * Under GST the time of supply has not been triggered (no invoice, no
--     removal), so no output tax liability has arisen on them yet.
--
-- Recording them as a debit would overstate receivables and misstate GST. So
-- they live here, in a memorandum table, deliberately OUTSIDE the debit/credit
-- ledger. The Parties → Ledger tab shows them in their own section, and the
-- ledger statement PDF prints them as "Part B — Memorandum", explicitly excluded
-- from the receivable total.
--
-- WHEN THE INVOICE IS RAISED: set status='invoiced' (+ invoice_number/invoiced_on)
-- and post the normal Sales Invoice debit into `ledger_entries`. The item then
-- drops out of the hold total, so the two can never double-count.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_hold_items (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id         UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,

  item_description TEXT NOT NULL,
  rate             NUMERIC NOT NULL DEFAULT 0,
  qty              NUMERIC NOT NULL DEFAULT 1,
  -- Generated, so the line total can never drift from rate x qty.
  amount           NUMERIC GENERATED ALWAYS AS (rate * qty) STORED,

  -- Is `rate` inclusive of GST or not? Recorded per line because the two are NOT
  -- interchangeable and guessing corrupts the eventual invoice value.
  gst_treatment    TEXT NOT NULL DEFAULT 'unknown'
                     CHECK (gst_treatment IN ('inclusive', 'exclusive', 'unknown')),
  gst_rate_pct     NUMERIC NOT NULL DEFAULT 18,

  project_ref      TEXT,
  held_on          DATE NOT NULL DEFAULT CURRENT_DATE,
  hold_reason      TEXT,

  status           TEXT NOT NULL DEFAULT 'invoice_pending'
                     CHECK (status IN ('invoice_pending', 'invoiced', 'dispatched', 'cancelled')),
  invoice_number   TEXT,
  invoiced_on      DATE,

  notes            TEXT,
  created_by       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customer_hold_items IS
  'MEMORANDUM ONLY. Completed goods held at the customer''s request, not yet invoiced. Never sum into the party debit/credit balance.';

ALTER TABLE public.customer_hold_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage customer hold items" ON public.customer_hold_items;
CREATE POLICY "Admins manage customer hold items"
  ON public.customer_hold_items FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS idx_customer_hold_items_party  ON public.customer_hold_items(party_id);
CREATE INDEX IF NOT EXISTS idx_customer_hold_items_status ON public.customer_hold_items(status);

DROP TRIGGER IF EXISTS update_customer_hold_items_updated_at ON public.customer_hold_items;
CREATE TRIGGER update_customer_hold_items_updated_at
  BEFORE UPDATE ON public.customer_hold_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
