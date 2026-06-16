CREATE TABLE public.spec_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT,
  project_details TEXT,
  doc_date DATE,
  ref_number TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.spec_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage spec documents"
ON public.spec_documents
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TRIGGER update_spec_documents_updated_at
BEFORE UPDATE ON public.spec_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_spec_documents_created_at ON public.spec_documents (created_at DESC);