-- Warranty certificates issued from the admin panel (Save + Edit).
-- Mirrors the cabin_quotations pattern: JSONB payloads + admin-only RLS + updated_at trigger.
-- Idempotent so it is safe to (re)apply via the Supabase SQL editor or `supabase db push`.

CREATE TABLE IF NOT EXISTS public.warranty_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_no text NOT NULL DEFAULT '',
  issue_date date,
  customer_name text,
  customer_company text,
  customer_phone text,
  customer_address text,
  -- Repeatable products (each with its own serial / warranty / validity), the single shipment,
  -- and the warranty-coverage rows — stored as JSON so the admin form round-trips exactly.
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  shipping jsonb NOT NULL DEFAULT '{}'::jsonb,
  coverage jsonb NOT NULL DEFAULT '[]'::jsonb,
  terms text,
  signatory text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.warranty_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage warranty certificates" ON public.warranty_certificates;
CREATE POLICY "Admins manage warranty certificates" ON public.warranty_certificates
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS trg_warranty_certificates_updated ON public.warranty_certificates;
CREATE TRIGGER trg_warranty_certificates_updated
  BEFORE UPDATE ON public.warranty_certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Newest first for the admin's "Saved Certificates" list.
CREATE INDEX IF NOT EXISTS idx_warranty_certificates_updated_at
  ON public.warranty_certificates (updated_at DESC);
