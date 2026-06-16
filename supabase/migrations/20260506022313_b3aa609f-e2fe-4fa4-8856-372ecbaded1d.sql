
-- ============================================================
-- INVENTORY & MATERIAL TRACKING MODULE - FULL SCHEMA
-- ============================================================

-- 1. FACTORIES
CREATE TABLE public.factories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  location text NOT NULL,
  state text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage factories" ON public.factories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_factories_updated_at BEFORE UPDATE ON public.factories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.factories (name, code, location, state, address) VALUES
  ('Bangalore Factory', 'BLR', 'Bangalore', 'Karnataka', 'Bangalore, Karnataka'),
  ('Hosur Factory', 'HSR', 'Hosur', 'Tamil Nadu', 'Hosur, Tamil Nadu');

-- 2. MATERIALS (Master)
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  size text,
  thickness text,
  brand text,
  unit text NOT NULL DEFAULT 'Nos',
  opening_stock numeric NOT NULL DEFAULT 0,
  min_stock_alert numeric NOT NULL DEFAULT 0,
  purchase_rate numeric NOT NULL DEFAULT 0,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  hsn_code text,
  gst_percent numeric NOT NULL DEFAULT 18,
  sku text,
  barcode text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage materials" ON public.materials FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_materials_category ON public.materials(category);

-- 3. MATERIAL STOCK PER FACTORY
CREATE TABLE public.material_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.factories(id) ON DELETE CASCADE,
  current_stock numeric NOT NULL DEFAULT 0,
  reserved_stock numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(material_id, factory_id)
);
ALTER TABLE public.material_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage material stock" ON public.material_stock FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_mstock_updated_at BEFORE UPDATE ON public.material_stock FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. STOCK INWARD (Purchase Entries)
CREATE TABLE public.stock_inwards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_number text NOT NULL DEFAULT '',
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  invoice_number text,
  invoice_date date,
  invoice_url text,
  vehicle_number text,
  total_amount numeric DEFAULT 0,
  qc_status text NOT NULL DEFAULT 'pending',
  qc_notes text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_inwards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage stock inwards" ON public.stock_inwards FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_inwards_updated_at BEFORE UPDATE ON public.stock_inwards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_inward_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE seq_num integer;
BEGIN
  IF NEW.inward_number IS NULL OR NEW.inward_number = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(inward_number FROM 'IN-(\d+)') AS integer)), 1000) + 1 INTO seq_num FROM public.stock_inwards;
    NEW.inward_number := 'IN-' || seq_num;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_inward_num BEFORE INSERT ON public.stock_inwards FOR EACH ROW EXECUTE FUNCTION public.generate_inward_number();

CREATE TABLE public.stock_inward_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inward_id uuid NOT NULL REFERENCES public.stock_inwards(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id),
  quantity numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  qc_passed boolean DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_inward_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage stock inward items" ON public.stock_inward_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 5. STOCK OUTWARD / CONSUMPTION
CREATE TABLE public.stock_outwards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outward_number text NOT NULL DEFAULT '',
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  project_name text,
  project_id uuid,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  purpose text NOT NULL DEFAULT 'production',
  issued_to text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_outwards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage stock outwards" ON public.stock_outwards FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_outwards_updated_at BEFORE UPDATE ON public.stock_outwards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_outward_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE seq_num integer;
BEGIN
  IF NEW.outward_number IS NULL OR NEW.outward_number = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(outward_number FROM 'OUT-(\d+)') AS integer)), 1000) + 1 INTO seq_num FROM public.stock_outwards;
    NEW.outward_number := 'OUT-' || seq_num;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_outward_num BEFORE INSERT ON public.stock_outwards FOR EACH ROW EXECUTE FUNCTION public.generate_outward_number();

CREATE TABLE public.stock_outward_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outward_id uuid NOT NULL REFERENCES public.stock_outwards(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id),
  quantity numeric NOT NULL DEFAULT 0,
  wastage numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_outward_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage stock outward items" ON public.stock_outward_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 6. STOCK TRANSFERS BETWEEN FACTORIES
CREATE TABLE public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number text NOT NULL DEFAULT '',
  from_factory_id uuid NOT NULL REFERENCES public.factories(id),
  to_factory_id uuid NOT NULL REFERENCES public.factories(id),
  status text NOT NULL DEFAULT 'pending',
  vehicle_number text,
  driver_name text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage stock transfers" ON public.stock_transfers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_transfers_updated_at BEFORE UPDATE ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_transfer_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE seq_num integer;
BEGIN
  IF NEW.transfer_number IS NULL OR NEW.transfer_number = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(transfer_number FROM 'TRF-(\d+)') AS integer)), 1000) + 1 INTO seq_num FROM public.stock_transfers;
    NEW.transfer_number := 'TRF-' || seq_num;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_transfer_num BEFORE INSERT ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION public.generate_transfer_number();

CREATE TABLE public.stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id),
  quantity numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage stock transfer items" ON public.stock_transfer_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 7. PROJECT MATERIAL ALLOCATIONS (BOQ)
CREATE TABLE public.project_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  client_name text,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  factory_id uuid REFERENCES public.factories(id),
  status text NOT NULL DEFAULT 'planned',
  start_date date,
  end_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage project allocations" ON public.project_allocations FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_palloc_updated_at BEFORE UPDATE ON public.project_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.project_allocation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id uuid NOT NULL REFERENCES public.project_allocations(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id),
  planned_quantity numeric NOT NULL DEFAULT 0,
  issued_quantity numeric NOT NULL DEFAULT 0,
  rate numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_allocation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage project allocation items" ON public.project_allocation_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 8. PURCHASE ORDERS
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL DEFAULT '',
  supplier_id uuid REFERENCES public.suppliers(id),
  factory_id uuid REFERENCES public.factories(id),
  status text NOT NULL DEFAULT 'pending',
  po_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  subtotal numeric DEFAULT 0,
  gst_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  notes text,
  terms text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage purchase orders" ON public.purchase_orders FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_po_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE seq_num integer;
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 'PO-(\d+)') AS integer)), 1000) + 1 INTO seq_num FROM public.purchase_orders;
    NEW.po_number := 'PO-' || seq_num;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_po_num BEFORE INSERT ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.generate_po_number();

CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id),
  quantity numeric NOT NULL DEFAULT 0,
  received_quantity numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage purchase order items" ON public.purchase_order_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 9. RENTAL ASSETS (Cabins)
CREATE TABLE public.rental_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabin_id text NOT NULL UNIQUE,
  cabin_type text NOT NULL,
  size text,
  manufacture_date date,
  purchase_cost numeric DEFAULT 0,
  monthly_rent numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'available',
  current_factory_id uuid REFERENCES public.factories(id),
  current_location text,
  qr_code text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rental_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rental assets" ON public.rental_assets FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_rental_assets_updated_at BEFORE UPDATE ON public.rental_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.rental_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.rental_assets(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  site_address text,
  dispatch_date date,
  expected_return_date date,
  actual_return_date date,
  monthly_rate numeric DEFAULT 0,
  deposit_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  damage_notes text,
  damage_charges numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rental_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rental assignments" ON public.rental_assignments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_rental_assign_updated_at BEFORE UPDATE ON public.rental_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.rental_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.rental_assets(id) ON DELETE CASCADE,
  maintenance_date date NOT NULL DEFAULT CURRENT_DATE,
  maintenance_type text NOT NULL,
  description text,
  cost numeric DEFAULT 0,
  performed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rental_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage rental maintenance" ON public.rental_maintenance FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 10. GATE PASS / VEHICLE DISPATCH
CREATE TABLE public.gate_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_pass_number text NOT NULL DEFAULT '',
  pass_type text NOT NULL DEFAULT 'outward',
  factory_id uuid REFERENCES public.factories(id),
  pass_date date NOT NULL DEFAULT CURRENT_DATE,
  vehicle_number text,
  driver_name text,
  driver_phone text,
  destination text,
  customer_name text,
  purpose text,
  related_outward_id uuid REFERENCES public.stock_outwards(id) ON DELETE SET NULL,
  related_transfer_id uuid REFERENCES public.stock_transfers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gate_passes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage gate passes" ON public.gate_passes FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_gp_updated_at BEFORE UPDATE ON public.gate_passes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.generate_gate_pass_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE seq_num integer;
BEGIN
  IF NEW.gate_pass_number IS NULL OR NEW.gate_pass_number = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(gate_pass_number FROM 'GP-(\d+)') AS integer)), 1000) + 1 INTO seq_num FROM public.gate_passes;
    NEW.gate_pass_number := 'GP-' || seq_num;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_gp_num BEFORE INSERT ON public.gate_passes FOR EACH ROW EXECUTE FUNCTION public.generate_gate_pass_number();

-- 11. PRODUCTION LOGS (Daily)
CREATE TABLE public.production_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  product_type text NOT NULL,
  quantity_produced numeric NOT NULL DEFAULT 0,
  shift text,
  supervisor_name text,
  project_name text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage production logs" ON public.production_logs FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_prod_updated_at BEFORE UPDATE ON public.production_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. SCRAP RECORDS
CREATE TABLE public.scrap_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scrap_date date NOT NULL DEFAULT CURRENT_DATE,
  factory_id uuid REFERENCES public.factories(id),
  material_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text DEFAULT 'kg',
  rate numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  buyer_name text,
  buyer_phone text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scrap_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage scrap records" ON public.scrap_records FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_scrap_updated_at BEFORE UPDATE ON public.scrap_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. MATERIAL APPROVAL WORKFLOW
CREATE TABLE public.material_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL,
  reference_id uuid,
  reference_number text,
  requested_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.material_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage material approvals" ON public.material_approvals FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_mapprov_updated_at BEFORE UPDATE ON public.material_approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- HELPER FUNCTION: adjust stock atomically
-- ============================================================
CREATE OR REPLACE FUNCTION public.adjust_material_stock(
  _material_id uuid,
  _factory_id uuid,
  _delta numeric
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.material_stock (material_id, factory_id, current_stock)
  VALUES (_material_id, _factory_id, _delta)
  ON CONFLICT (material_id, factory_id)
  DO UPDATE SET current_stock = public.material_stock.current_stock + _delta,
                updated_at = now();
END; $$;
