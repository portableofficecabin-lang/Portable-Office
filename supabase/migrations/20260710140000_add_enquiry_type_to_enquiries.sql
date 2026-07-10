-- Fix schema drift on the live database: the `enquiries` table was originally created with
-- `CREATE TABLE IF NOT EXISTS`, so on any database where the table already existed the newer
-- `enquiry_type` column was silently skipped and never added. The app (Contact quote form +
-- admin panel) and the generated Supabase types all require it, so every quote/contact
-- submission fails after OTP with:
--   "Could not find the 'enquiry_type' column of 'enquiries' in the schema cache"
--
-- This migration is idempotent: it adds the column and its CHECK constraint only if missing,
-- backfills existing rows with the 'general' default, then forces PostgREST to reload its schema
-- cache so the error clears immediately without a project restart.

ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS enquiry_type TEXT NOT NULL DEFAULT 'general';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.enquiries'::regclass
      AND conname = 'enquiries_enquiry_type_check'
  ) THEN
    ALTER TABLE public.enquiries
      ADD CONSTRAINT enquiries_enquiry_type_check
      CHECK (enquiry_type IN ('general', 'quote', 'product', 'support'));
  END IF;
END $$;

-- Refresh the PostgREST schema cache (Supabase's REST/data layer) so the new column is picked up.
NOTIFY pgrst, 'reload schema';
