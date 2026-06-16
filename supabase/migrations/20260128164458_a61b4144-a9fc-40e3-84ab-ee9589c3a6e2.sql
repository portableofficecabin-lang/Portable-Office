-- Fix booking_otps RLS policies: Remove public SELECT/UPDATE access
-- Only edge functions with service role should be able to read/update OTPs

-- Drop existing vulnerable policies
DROP POLICY IF EXISTS "Anyone can verify OTPs" ON public.booking_otps;
DROP POLICY IF EXISTS "Anyone can update OTPs" ON public.booking_otps;
DROP POLICY IF EXISTS "Anyone can delete expired OTPs" ON public.booking_otps;
DROP POLICY IF EXISTS "Anyone can create booking OTPs" ON public.booking_otps;

-- Create new secure policies:
-- Only allow INSERT from edge functions (public can still insert via edge function that uses service role)
-- SELECT, UPDATE, DELETE should only be possible via service role (edge functions)
-- We keep RLS enabled but remove all public access policies for SELECT/UPDATE/DELETE

-- Allow public INSERT only (the send-booking-otp edge function inserts with service role anyway)
CREATE POLICY "Service role can manage OTPs" 
ON public.booking_otps 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');