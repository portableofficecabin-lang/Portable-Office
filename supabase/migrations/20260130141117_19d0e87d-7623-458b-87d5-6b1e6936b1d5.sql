-- Drop the restrictive INSERT policies and recreate as permissive

-- Fix enquiries table
DROP POLICY IF EXISTS "Public can create enquiries" ON public.enquiries;
CREATE POLICY "Public can create enquiries" 
ON public.enquiries 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Fix appointments table
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
CREATE POLICY "Public can create appointments" 
ON public.appointments 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Fix page_views table
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Anyone can insert page views" 
ON public.page_views 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Fix click_events table
DROP POLICY IF EXISTS "Anyone can insert click events" ON public.click_events;
CREATE POLICY "Anyone can insert click events" 
ON public.click_events 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);