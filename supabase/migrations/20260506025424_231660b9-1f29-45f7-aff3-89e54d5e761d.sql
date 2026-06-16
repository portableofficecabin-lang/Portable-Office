-- Add team_name to scrap_records
ALTER TABLE public.scrap_records ADD COLUMN IF NOT EXISTS team_name text;

-- Add workflow tracking to production_logs
ALTER TABLE public.production_logs 
  ADD COLUMN IF NOT EXISTS department_progress jsonb NOT NULL DEFAULT '{"welding":0,"painting":0,"electrical":0,"carpentry":0,"furniture":0,"finishing":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_ready_for_dispatch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'in_progress';

-- Work Orders module
CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number text NOT NULL DEFAULT '',
  wo_date date NOT NULL DEFAULT CURRENT_DATE,
  factory_id uuid,
  project_name text NOT NULL,
  client_name text,
  client_phone text,
  product_type text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  size text,
  specifications text,
  start_date date,
  target_date date,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  assigned_supervisor text,
  notes text,
  sales_order_id uuid,
  quotation_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage work orders" ON public.work_orders
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION public.generate_wo_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE seq_num integer;
BEGIN
  IF NEW.wo_number IS NULL OR NEW.wo_number = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(wo_number FROM 'WO-(\d+)') AS integer)), 1000) + 1 INTO seq_num FROM public.work_orders;
    NEW.wo_number := 'WO-' || seq_num;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER work_orders_number_trg BEFORE INSERT ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_wo_number();

CREATE TRIGGER work_orders_updated_at BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();