
CREATE TABLE public.ledger_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL DEFAULT 'payment',
  project_ref TEXT,
  reference_number TEXT,
  description TEXT,
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  payment_mode TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ledger entries"
ON public.ledger_entries FOR ALL TO authenticated
USING (is_admin()) WITH CHECK (is_admin());

CREATE INDEX idx_ledger_entries_party ON public.ledger_entries(party_id);
CREATE INDEX idx_ledger_entries_date ON public.ledger_entries(entry_date DESC);

CREATE TRIGGER update_ledger_entries_updated_at
BEFORE UPDATE ON public.ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
