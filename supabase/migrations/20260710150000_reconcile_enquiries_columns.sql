-- Reconcile schema drift on the live `enquiries` table (spec-unrelated hotfix).
--
-- Root cause: the enquiries table was originally created with `CREATE TABLE IF NOT EXISTS`.
-- On the production database the table already existed from an earlier, minimal version, so
-- EVERY column added by later migrations was silently skipped. `enquiry_type` was the first
-- to surface and was patched in 20260710140000; `subject` is the next:
--   "Could not find the 'subject' column of 'enquiries' in the schema cache"
--
-- Rather than fix one column at a time (subject -> product_name -> expected_value -> lead_source),
-- this migration ADDs every column the app writes/reads (Contact quote form, product Enquiry
-- modal, homepage Cabin Calculator, admin CRM/Enquiries) so submissions stop failing for good.
--
-- Fully IDEMPOTENT: only adds what is missing, backfills sensible defaults, then reloads the
-- PostgREST schema cache so the errors clear immediately without a project restart.

ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS phone          TEXT;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS company        TEXT;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS subject        TEXT;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS message        TEXT;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS enquiry_type   TEXT NOT NULL DEFAULT 'general';
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS product_id     TEXT;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS product_name   TEXT;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS expected_value NUMERIC;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS lead_source    TEXT NOT NULL DEFAULT 'website';
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'new';
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT now();

-- CHECK constraints (added only if missing, so re-runs are safe).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.enquiries'::regclass AND conname = 'enquiries_enquiry_type_check'
  ) THEN
    ALTER TABLE public.enquiries
      ADD CONSTRAINT enquiries_enquiry_type_check
      CHECK (enquiry_type IN ('general', 'quote', 'product', 'support'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.enquiries'::regclass AND conname = 'enquiries_status_check'
  ) THEN
    ALTER TABLE public.enquiries
      ADD CONSTRAINT enquiries_status_check
      CHECK (status IN ('new', 'read', 'responded', 'closed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_enquiries_lead_source ON public.enquiries(lead_source);
CREATE INDEX IF NOT EXISTS idx_enquiries_status      ON public.enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at  ON public.enquiries(created_at DESC);

-- Refresh the PostgREST schema cache so the REST/data layer sees the columns immediately.
NOTIFY pgrst, 'reload schema';
