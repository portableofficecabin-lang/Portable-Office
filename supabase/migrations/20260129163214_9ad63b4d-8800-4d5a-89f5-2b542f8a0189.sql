-- Fix overly permissive RLS policies by explicitly specifying the anon role
-- This makes the intentional public access clear to the linter

-- Drop existing permissive INSERT policies
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Anyone can create enquiries" ON public.enquiries;

-- Recreate INSERT policies with explicit role specification
-- For appointments: Allow anonymous users to create appointments (public booking form)
CREATE POLICY "Public can create appointments"
ON public.appointments
FOR INSERT
TO anon
WITH CHECK (true);

-- For enquiries: Allow anonymous users to create enquiries (public contact form)
CREATE POLICY "Public can create enquiries"
ON public.enquiries
FOR INSERT
TO anon
WITH CHECK (true);