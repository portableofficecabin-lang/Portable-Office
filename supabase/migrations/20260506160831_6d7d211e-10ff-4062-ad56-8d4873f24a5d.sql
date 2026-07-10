-- Extend products table with Google Merchant fields (only add if missing)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand text DEFAULT 'Portable Office Cabin',
  ADD COLUMN IF NOT EXISTS gtin text,
  ADD COLUMN IF NOT EXISTS mpn text,
  ADD COLUMN IF NOT EXISTS condition text DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS google_product_category text,
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS additional_image_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sale_price numeric,
  ADD COLUMN IF NOT EXISTS sale_price_effective_from timestamptz,
  ADD COLUMN IF NOT EXISTS sale_price_effective_to timestamptz,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS pattern text,
  ADD COLUMN IF NOT EXISTS age_group text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS item_group_id text,
  ADD COLUMN IF NOT EXISTS shipping_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS shipping_length_cm numeric,
  ADD COLUMN IF NOT EXISTS shipping_width_cm numeric,
  ADD COLUMN IF NOT EXISTS shipping_height_cm numeric,
  ADD COLUMN IF NOT EXISTS identifier_exists boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_label_0 text,
  ADD COLUMN IF NOT EXISTS custom_label_1 text,
  ADD COLUMN IF NOT EXISTS custom_label_2 text,
  ADD COLUMN IF NOT EXISTS custom_label_3 text,
  ADD COLUMN IF NOT EXISTS custom_label_4 text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS meta_keywords text;

-- Extend categories table
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS google_product_category text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS meta_keywords text;

-- Product variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text,
  gtin text,
  mpn text,
  title text,
  price numeric,
  sale_price numeric,
  currency text DEFAULT 'INR',
  stock_quantity integer NOT NULL DEFAULT 0,
  in_stock boolean NOT NULL DEFAULT true,
  color text,
  size text,
  material text,
  pattern text,
  image_url text,
  item_group_id text,
  sort_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view variants" ON public.product_variants;
CREATE POLICY "Anyone can view variants" ON public.product_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage variants" ON public.product_variants;
CREATE POLICY "Admins manage variants" ON public.product_variants FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER trg_variants_updated BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Product reviews table
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  reviewer_name text NOT NULL,
  reviewer_email text,
  verified_purchase boolean NOT NULL DEFAULT false,
  helpful_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.product_reviews;
CREATE POLICY "Anyone can view approved reviews" ON public.product_reviews FOR SELECT USING (status = 'approved');
DROP POLICY IF EXISTS "Anyone can submit reviews" ON public.product_reviews;
CREATE POLICY "Anyone can submit reviews" ON public.product_reviews FOR INSERT WITH CHECK (status = 'pending');
DROP POLICY IF EXISTS "Admins manage reviews" ON public.product_reviews;
CREATE POLICY "Admins manage reviews" ON public.product_reviews FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS trg_reviews_updated
ON public.product_reviews;

CREATE TRIGGER trg_reviews_updated
BEFORE UPDATE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Pages (CMS) table
CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text,
  excerpt text,
  featured_image_url text,
  meta_title text,
  meta_description text,
  meta_keywords text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  sort_order integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published pages" ON public.pages;
CREATE POLICY "Anyone can view published pages" ON public.pages FOR SELECT USING (status = 'published');
DROP POLICY IF EXISTS "Admins manage pages" ON public.pages;
CREATE POLICY "Admins manage pages" ON public.pages FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TRIGGER trg_pages_updated BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);