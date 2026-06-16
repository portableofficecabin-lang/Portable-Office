
-- 1) Hide reviewer PII (email, phone) from public/authenticated reads
REVOKE SELECT (reviewer_email, reviewer_phone) ON public.product_reviews FROM anon;
REVOKE SELECT (reviewer_email, reviewer_phone) ON public.product_reviews FROM authenticated;
GRANT SELECT (reviewer_email, reviewer_phone) ON public.product_reviews TO service_role;

-- 2) Admin-only RPC to fetch full reviews (incl. PII) — uses SECURITY DEFINER + is_admin() gate
CREATE OR REPLACE FUNCTION public.admin_list_reviews(_status text DEFAULT NULL)
RETURNS SETOF public.product_reviews
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT * FROM public.product_reviews
    WHERE _status IS NULL OR status = _status
    ORDER BY created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_reviews(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_reviews(text) TO authenticated, service_role;

-- 3) Restrict product-images storage writes/updates/deletes to admins only
DROP POLICY IF EXISTS "Authenticated can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete product images" ON storage.objects;

CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());
