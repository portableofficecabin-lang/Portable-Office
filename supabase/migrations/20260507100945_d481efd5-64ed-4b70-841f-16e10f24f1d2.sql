
-- Settings (single row)
CREATE TABLE public.factory_tracker_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theft_detection_enabled boolean NOT NULL DEFAULT true,
  warning_threshold_percent numeric NOT NULL DEFAULT 10,
  alert_threshold_percent numeric NOT NULL DEFAULT 25,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.factory_tracker_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage factory tracker settings" ON public.factory_tracker_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
INSERT INTO public.factory_tracker_settings (theft_detection_enabled) VALUES (true);

-- Invoices
CREATE TABLE public.factory_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  supplier_name text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.factory_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage factory invoices" ON public.factory_invoices FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_factory_invoices_updated BEFORE UPDATE ON public.factory_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Materials (per invoice)
CREATE TABLE public.factory_invoice_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.factory_invoices(id) ON DELETE CASCADE,
  category text NOT NULL,
  name text NOT NULL,
  unit text NOT NULL,
  ordered numeric NOT NULL DEFAULT 0,
  received numeric NOT NULL DEFAULT 0,
  used numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.factory_invoice_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage factory invoice materials" ON public.factory_invoice_materials FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_factory_invoice_materials_updated BEFORE UPDATE ON public.factory_invoice_materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_factory_invoice_materials_invoice ON public.factory_invoice_materials(invoice_id);
CREATE INDEX idx_factory_invoice_materials_category ON public.factory_invoice_materials(category);
