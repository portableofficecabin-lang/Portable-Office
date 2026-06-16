
-- Parties (client master)
CREATE TABLE public.parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  email text,
  phone text,
  gstin text,
  pan text,
  billing_address text,
  city text,
  state text,
  pincode text,
  party_type text NOT NULL DEFAULT 'customer', -- customer | supplier | both
  credit_limit numeric NOT NULL DEFAULT 0,
  opening_balance numeric NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_parties_name ON public.parties(name);
CREATE INDEX idx_parties_phone ON public.parties(phone);

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage parties" ON public.parties
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER update_parties_updated_at BEFORE UPDATE ON public.parties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Multiple ship-to / project addresses per party
CREATE TABLE public.party_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  label text NOT NULL, -- e.g. "Site 1 - Hosur", "HO Office"
  contact_person text,
  contact_phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pincode text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_party_addresses_party ON public.party_addresses(party_id);

ALTER TABLE public.party_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage party addresses" ON public.party_addresses
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Link existing transactions to party (nullable, non-breaking)
ALTER TABLE public.quotations          ADD COLUMN party_id uuid REFERENCES public.parties(id);
ALTER TABLE public.sales_orders        ADD COLUMN party_id uuid REFERENCES public.parties(id);
ALTER TABLE public.project_allocations ADD COLUMN party_id uuid REFERENCES public.parties(id);
ALTER TABLE public.rental_assignments  ADD COLUMN party_id uuid REFERENCES public.parties(id);
ALTER TABLE public.stock_outwards      ADD COLUMN party_id uuid REFERENCES public.parties(id);

CREATE INDEX idx_quotations_party  ON public.quotations(party_id);
CREATE INDEX idx_so_party          ON public.sales_orders(party_id);
CREATE INDEX idx_proj_alloc_party  ON public.project_allocations(party_id);
CREATE INDEX idx_rentals_party     ON public.rental_assignments(party_id);
