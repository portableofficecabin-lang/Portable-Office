-- Add a generic buyer Tax ID to the client master (public.parties).
--
-- Quotation Pro (src/views/admin/QuotationPro.tsx) now captures a "Buyer Tax ID"
-- alongside GSTIN and PAN and prints it on the quotation / proforma / invoice /
-- delivery challan. `parties.pan` already exists (see 20260708120000_ensure_parties);
-- only `tax_id` is new. It stores a free-form buyer tax identifier (e.g. a foreign
-- TIN or a TAN) — no format is enforced.
--
-- Fully IDEMPOTENT: safe to run more than once, and a no-op if the column already
-- exists. The application also guards its writes (it retries the "Save Client" insert
-- without pan/tax_id on a PGRST204 schema-cache error), so the feature works on the
-- document even before this migration is applied — only the saved-client memory of
-- the Tax ID waits for it.

ALTER TABLE public.parties
  ADD COLUMN IF NOT EXISTS tax_id text;
