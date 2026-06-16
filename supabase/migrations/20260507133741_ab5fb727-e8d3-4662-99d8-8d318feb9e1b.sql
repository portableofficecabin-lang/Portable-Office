ALTER TABLE public.party_addresses
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS gstin text,
  ADD COLUMN IF NOT EXISTS consignee_name text;