-- Add safety_stock to materials (permanent stock = existing opening_stock; inward stock is computed)
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS safety_stock numeric NOT NULL DEFAULT 0;

-- Machinery Sections master
CREATE TABLE IF NOT EXISTS public.machinery_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.machinery_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage machinery sections" ON public.machinery_sections FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Contractors master
CREATE TABLE IF NOT EXISTS public.contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  phone text,
  email text,
  address text,
  gstin text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contractors" ON public.contractors FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Machinery master
CREATE TABLE IF NOT EXISTS public.machinery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  section_id uuid REFERENCES public.machinery_sections(id) ON DELETE SET NULL,
  brand text,
  model text,
  serial_number text,
  total_quantity numeric NOT NULL DEFAULT 1,
  available_quantity numeric NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'available',
  purchase_date date,
  purchase_value numeric,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.machinery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage machinery" ON public.machinery FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Machinery handovers (transactions)
CREATE TABLE IF NOT EXISTS public.machinery_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machinery_id uuid NOT NULL REFERENCES public.machinery(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.machinery_sections(id) ON DELETE SET NULL,
  quantity numeric NOT NULL DEFAULT 1,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date date,
  return_date date,
  condition_out text,
  condition_in text,
  site_location text,
  status text NOT NULL DEFAULT 'issued',
  issued_by_name text,
  received_by_name text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.machinery_handovers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage machinery handovers" ON public.machinery_handovers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER trg_machinery_sections_updated BEFORE UPDATE ON public.machinery_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contractors_updated BEFORE UPDATE ON public.contractors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_machinery_updated BEFORE UPDATE ON public.machinery FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_machinery_handovers_updated BEFORE UPDATE ON public.machinery_handovers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();