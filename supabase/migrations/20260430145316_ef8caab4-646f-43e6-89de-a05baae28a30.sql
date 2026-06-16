
-- Quotations table
CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text NOT NULL DEFAULT '',
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  client_company text,
  client_address text,
  subject text,
  notes text,
  terms text DEFAULT 'Prices are exclusive of GST, transportation, and installation charges.',
  validity_days integer DEFAULT 15,
  subtotal numeric DEFAULT 0,
  gst_percent numeric DEFAULT 18,
  gst_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage quotations" ON public.quotations FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate quotation number
CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE seq_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 'QTN-(\d+)') AS integer)), 1000) + 1 INTO seq_num FROM public.quotations;
  NEW.quotation_number := 'QTN-' || seq_num;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_quotation_number BEFORE INSERT ON public.quotations FOR EACH ROW EXECUTE FUNCTION generate_quotation_number();

-- Quotation items
CREATE TABLE public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  description text NOT NULL,
  unit text DEFAULT 'Nos',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage quotation items" ON public.quotation_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Sales Orders table
CREATE TABLE public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  so_number text NOT NULL DEFAULT '',
  quotation_id uuid REFERENCES public.quotations(id),
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  client_company text,
  client_address text,
  delivery_date date,
  subtotal numeric DEFAULT 0,
  gst_percent numeric DEFAULT 18,
  gst_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sales orders" ON public.sales_orders FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate SO number
CREATE OR REPLACE FUNCTION public.generate_so_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE seq_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(so_number FROM 'SO-(\d+)') AS integer)), 5000) + 1 INTO seq_num FROM public.sales_orders;
  NEW.so_number := 'SO-' || seq_num;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_so_number BEFORE INSERT ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION generate_so_number();

-- Sales Order items
CREATE TABLE public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  description text NOT NULL,
  unit text DEFAULT 'Nos',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sales order items" ON public.sales_order_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
