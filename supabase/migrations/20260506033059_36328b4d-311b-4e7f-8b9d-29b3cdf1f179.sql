
ALTER TABLE public.rental_assignments
  ADD COLUMN IF NOT EXISTS deposit_refunded_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_refund_date DATE,
  ADD COLUMN IF NOT EXISTS deposit_status TEXT NOT NULL DEFAULT 'held';
