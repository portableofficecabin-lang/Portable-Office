-- Blog posts table for admin-managed articles (CRM → Blog Posts)
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content text,
  featured_image_url text,
  meta_title text,
  meta_description text,
  meta_keywords text,
  author text NOT NULL DEFAULT 'Portable Office Cabin',
  category text NOT NULL DEFAULT 'Industry Insights',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  featured boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  sort_order integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published blog posts" ON public.blog_posts;
CREATE POLICY "Anyone can view published blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Admins manage blog posts" ON public.blog_posts;
CREATE POLICY "Admins manage blog posts"
  ON public.blog_posts
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS trg_blog_posts_updated ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_updated
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC NULLS LAST);

-- Optional: migrate any existing CMS rows tagged as blog content in pages (none by default)
-- INSERT INTO public.blog_posts (slug, title, excerpt, content, featured_image_url, meta_title, meta_description, meta_keywords, status, published_at, sort_order, created_by, created_at, updated_at)
-- SELECT slug, title, excerpt, content, featured_image_url, meta_title, meta_description, meta_keywords, status, published_at, sort_order, created_by, created_at, updated_at
-- FROM public.pages
-- ON CONFLICT (slug) DO NOTHING;
