
-- Add CRM columns to enquiries
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS lead_source text NOT NULL DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS lead_status text NOT NULL DEFAULT 'new';

-- Follow-ups table
CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL,
  follow_up_type text NOT NULL DEFAULT 'call',
  notes text,
  scheduled_at timestamp with time zone,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage follow ups"
  ON public.follow_ups FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE INDEX idx_follow_ups_enquiry ON public.follow_ups(enquiry_id);
CREATE INDEX idx_follow_ups_scheduled ON public.follow_ups(scheduled_at);
CREATE INDEX idx_enquiries_lead_status ON public.enquiries(lead_status);
CREATE INDEX idx_enquiries_lead_source ON public.enquiries(lead_source);
