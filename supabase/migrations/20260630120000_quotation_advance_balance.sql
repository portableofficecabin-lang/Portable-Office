-- Quotation Pro: record advance payment received and the remaining customer balance.
-- advance_paid  = resolved rupee amount already paid by the customer
-- balance_due   = total_amount - advance_paid (snapshot stored at save time)
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS advance_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due numeric;
