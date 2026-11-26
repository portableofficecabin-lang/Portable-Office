-- ════════════════════════════════════════════════════════════════════════════════════════════
--  PRODUCT URL RENAMES (D4) — record six retired product slugs and move admin rows to the new ones
-- ════════════════════════════════════════════════════════════════════════════════════════════
--
--  Idempotent and safe to run more than once. Nothing is deleted or dropped.
--
--  WHY: six fixed-price shipping-container SKUs carried a PLACE in their URL although each sells
--  one container grade (src/data/productSlugRenames.ts). The site now serves them at grade slugs
--  and 301s the old URLs (next.config.ts). This file gives the DATABASE the same map, so data
--  written under an old slug stays readable and an admin product row follows the rename.
--
--  WHAT THIS DOES
--    1. creates public.product_slug_aliases (old_slug → new_slug, with the SKU) — readable by
--       anyone (it holds public URLs only), writable by admins only;
--    2. upserts the six pairs below (same list as src/data/productSlugRenames.ts — a unit test
--       checks the two agree);
--    3. renames public.products.slug from an old slug to its new slug, ONLY for a row that still
--       has the old slug AND only when no row already owns the new slug (slug is UNIQUE).
--
--  WHAT THIS DOES NOT DO
--    • product_reviews are NOT rewritten: rows keep the slug they were written under, and the site
--      reads reviews for a product's current AND earlier slugs (src/lib/reviews/data.ts).
--    • orders, order items, carts and quotations are not touched: they key on product_id /
--      product_sku, which the rename does not change. Historical order references stay exactly as
--      they were.
--    • no id or SKU changes.
--
--  APPLY MANUALLY after the code is live: Supabase dashboard → SQL editor → run this file (or
--  `supabase db push`). NEVER run full_schema.sql against production.
--  ROLLBACK: supabase/rollback/20261126120000_product_slug_renames.down.sql
-- ════════════════════════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.product_slug_aliases (
  old_slug     text primary key,
  new_slug     text not null,
  product_sku  text not null,
  renamed_at   timestamptz not null default now(),
  constraint product_slug_aliases_distinct check (old_slug <> new_slug)
);

comment on table public.product_slug_aliases is
  'Retired product URL slugs and the slug that replaced each (D4, 2026-11). Source of truth in code: src/data/productSlugRenames.ts.';

alter table public.product_slug_aliases enable row level security;

drop policy if exists "Anyone can read product slug aliases" on public.product_slug_aliases;
create policy "Anyone can read product slug aliases"
  on public.product_slug_aliases for select
  using (true);

drop policy if exists "Admins manage product slug aliases" on public.product_slug_aliases;
create policy "Admins manage product slug aliases"
  on public.product_slug_aliases for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.product_slug_aliases (old_slug, new_slug, product_sku) values
  ('shipping-container-in-kormangala',           'used-20ft-shipping-container-as-is-grade',        'POC-SC-KRMG'),
  ('shipping-container-in-krishnagiri',          'refurbished-20ft-shipping-container-premium',     'POC-SC-KRSH'),
  ('shipping-container-in-sipcot',               'refurbished-20ft-shipping-container-industrial',  'POC-SC-SIPCOT'),
  ('shipping-container-in-chennai',              'used-20ft-shipping-container-wind-water-tight',   'POC-SC-CHN'),
  ('shipping-container-in-narsapura-industrial', 'refurbished-20ft-shipping-container',             'POC-SC-NRSP'),
  ('shipping-container-in-peenya-industrial',    'used-20ft-shipping-container-cargo-worthy',       'POC-SC-PNYA')
on conflict (old_slug) do update
  set new_slug = excluded.new_slug,
      product_sku = excluded.product_sku;

update public.products p
   set slug = a.new_slug
  from public.product_slug_aliases a
 where p.slug = a.old_slug
   and not exists (select 1 from public.products q where q.slug = a.new_slug);

commit;
