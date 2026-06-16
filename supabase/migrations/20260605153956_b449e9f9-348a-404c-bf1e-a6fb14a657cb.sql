CREATE POLICY "Public can read review otp setting"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (key = 'reviews_require_otp');

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.site_settings TO authenticated;