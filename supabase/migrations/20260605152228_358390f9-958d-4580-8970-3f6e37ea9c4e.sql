ALTER TABLE public.product_reviews DROP CONSTRAINT IF EXISTS product_reviews_product_id_fkey;
ALTER TABLE public.product_reviews ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS product_slug text;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS reviewer_phone text;
CREATE INDEX IF NOT EXISTS idx_reviews_product_slug ON public.product_reviews(product_slug);
GRANT SELECT, INSERT ON public.product_reviews TO anon;
GRANT SELECT, INSERT ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;