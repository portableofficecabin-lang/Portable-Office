-- ============================================================================
-- ONE-OFF DATA LOAD (not a migration — do not put this in supabase/migrations/)
--
-- Records the completed-but-not-dispatched items for MFAR CONSTRUCTIONS PVT LTD
-- as MEMORANDUM entries. They do NOT touch ledger_entries, so the customer's
-- receivable stays at its correct value (Rs. 30,71,592) and these goods are not
-- shown as an outstanding/debit balance until an invoice is raised.
--
-- PREREQUISITE: apply supabase/migrations/20260714120000_customer_hold_items.sql first.
--
-- Safe to re-run: the NOT EXISTS guard stops it inserting the same line twice.
-- The party is matched by GSTIN, so there is no hard-coded UUID to go stale.
--
--   Staircase with Handrailing                  94,000 x 2 =   1,88,000
--   Platform w/ Chequered Plate & MS Frame      48,000 x 2 =      96,000
--   MS Portable Bunker Bed Cabin 20' x 10'   3,20,960 x 4 =  12,83,840
--                                            TOTAL         =  15,67,840
--
-- GST BASIS — READ THIS BEFORE INVOICING:
--   The cabin rate is provably GST-INCLUSIVE: 2,72,000 + 18% = 3,20,960 exactly,
--   and it matches the eight cabins already invoiced (Sr 235-238, 245-248).
--   The staircase (94,000) and platform (48,000) rates do NOT divide cleanly by
--   1.18, so their basis is UNKNOWN and is recorded as such rather than guessed.
--   If they turn out to be GST-EXCLUSIVE, the invoice value becomes 16,18,960
--   (a difference of 51,120). The admin UI and the ledger PDF both flag this as
--   "NOT SET" until someone confirms it. To confirm, run e.g.:
--       UPDATE public.customer_hold_items SET gst_treatment = 'exclusive'
--        WHERE item_description LIKE 'Staircase%';
-- ============================================================================

INSERT INTO public.customer_hold_items
  (party_id, item_description, rate, qty, gst_treatment, gst_rate_pct,
   held_on, hold_reason, status)
SELECT
  p.id, v.item, v.rate, v.qty, v.gst, 18,
  DATE '2026-07-14',
  'Completed and ready for dispatch. Dispatch postponed for reasons at the customer''s end. Invoice and payment pending.',
  'invoice_pending'
FROM public.parties p
CROSS JOIN (VALUES
  ('Staircase with Handrailing',                    94000::numeric, 2::numeric, 'unknown'),
  ('Platform with Chequered Plate and MS Frame',    48000::numeric, 2::numeric, 'unknown'),
  ('MS Portable Bunker Bed Cabin, 20'' x 10''',    320960::numeric, 4::numeric, 'inclusive')
) AS v(item, rate, qty, gst)
WHERE p.gstin = '29AABCM3803F1ZQ'          -- Mfar Constructions Pvt. Ltd.
  AND NOT EXISTS (
    SELECT 1 FROM public.customer_hold_items h
     WHERE h.party_id = p.id AND h.item_description = v.item
  );

-- Verify: expect 3 rows and a total of 15,67,840.
SELECT h.item_description, h.rate, h.qty, h.amount, h.gst_treatment, h.status
  FROM public.customer_hold_items h
  JOIN public.parties p ON p.id = h.party_id
 WHERE p.gstin = '29AABCM3803F1ZQ'
 ORDER BY h.created_at;

SELECT SUM(amount) AS total_on_customer_hold
  FROM public.customer_hold_items h
  JOIN public.parties p ON p.id = h.party_id
 WHERE p.gstin = '29AABCM3803F1ZQ'
   AND h.status = 'invoice_pending';
