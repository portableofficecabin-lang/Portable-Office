
CREATE TABLE public.cabin_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  client_name text,
  client_company text,
  client_phone text,
  client_email text,
  site_address text,
  spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  bom jsonb NOT NULL DEFAULT '[]'::jsonb,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cabin_quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cabin quotations" ON public.cabin_quotations
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER trg_cabin_quotations_updated
  BEFORE UPDATE ON public.cabin_quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS public.cabin_quotation_seq START 1000;

CREATE OR REPLACE FUNCTION public.gen_cabin_quotation_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
    NEW.quotation_number := 'CQ-' || nextval('public.cabin_quotation_seq');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_cabin_quotations_number
  BEFORE INSERT ON public.cabin_quotations
  FOR EACH ROW EXECUTE FUNCTION public.gen_cabin_quotation_number();

CREATE TABLE public.cabin_material_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key text NOT NULL UNIQUE,
  name text NOT NULL,
  unit text NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  wastage_percent numeric NOT NULL DEFAULT 10,
  gst_percent numeric NOT NULL DEFAULT 18,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cabin_material_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cabin material rates" ON public.cabin_material_rates
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Anyone can view cabin material rates" ON public.cabin_material_rates
  FOR SELECT USING (true);
