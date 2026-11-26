-- ═══════════════════════════════════════════════════════════════════════════════════════════
--  ROLLBACK for 20261126120000_product_slug_renames.sql
--
--  This file is deliberately OUTSIDE supabase/migrations/ so that `supabase db push` and every
--  other migration runner ignores it. Run it by hand only together with reverting the D4 code
--  (src/data/productSlugRenames.ts, the slug overrides in src/data/products.ts and the 301s in
--  next.config.ts) — otherwise the site and the database disagree about the product URLs.
--
--  WHAT THIS DOES
--    1. renames any public.products row from a new slug back to its old slug (only when no row
--       already owns the old slug — slug is UNIQUE);
--    2. drops public.product_slug_aliases (it holds nothing but the six URL pairs, which are also
--       in this file's companion migration and in src/data/productSlugRenames.ts).
--
--  WHAT THIS DOES NOT TOUCH: product_reviews (never rewritten by the migration), orders, order
--  items, carts, quotations, ids or SKUs.
--
--  Idempotent: safe to run twice; a second run finds no alias table and does nothing.
-- ═══════════════════════════════════════════════════════════════════════════════════════════

begin;

do $$
begin
  if to_regclass('public.product_slug_aliases') is not null then
    update public.products p
       set slug = a.old_slug
      from public.product_slug_aliases a
     where p.slug = a.new_slug
       and not exists (select 1 from public.products q where q.slug = a.old_slug);
  end if;
end
$$;

drop table if exists public.product_slug_aliases;

commit;
