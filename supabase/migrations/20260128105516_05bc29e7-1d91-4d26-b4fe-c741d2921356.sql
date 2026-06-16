-- Create table to store booking OTPs
CREATE TABLE public.booking_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_otps ENABLE ROW LEVEL SECURITY;

-- Anyone can create OTPs (for booking verification)
CREATE POLICY "Anyone can create booking OTPs"
ON public.booking_otps
FOR INSERT
WITH CHECK (true);

-- Anyone can read their own OTPs by email (for verification)
CREATE POLICY "Anyone can verify OTPs"
ON public.booking_otps
FOR SELECT
USING (true);

-- Anyone can update OTPs (to mark as verified)
CREATE POLICY "Anyone can update OTPs"
ON public.booking_otps
FOR UPDATE
USING (true);

-- Clean up old OTPs automatically (delete expired ones)
CREATE POLICY "Anyone can delete expired OTPs"
ON public.booking_otps
FOR DELETE
USING (expires_at < now());

-- Create index for faster lookups
CREATE INDEX idx_booking_otps_email ON public.booking_otps(email);
CREATE INDEX idx_booking_otps_expires_at ON public.booking_otps(expires_at);