-- Ensure the public.product_reviews table exists on the live database.
--
-- Root cause of "Could not find the table 'public.product_reviews' in the schema
-- cache": the reviews feature's migrations were committed to the repo but never
-- applied to the production Supabase instance, so the table was missing and every
-- review submission (an anon INSERT via PostgREST) failed.
--
-- This migration is fully IDEMPOTENT — safe to run whether the table is absent or
-- an older/partial version already exists. It reconciles the schema to exactly what
-- the app expects (src/integrations/supabase/types.ts + ReviewSubmitModal.tsx).

create extension if not exists pgcrypto;  -- for gen_random_uuid()

-- Ensure the shared updated_at trigger function exists, so this migration also works
-- when run standalone in the SQL editor (not just as part of a full `db push`).
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.product_reviews (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid,                                   -- optional; reviews key off product_slug
  product_slug      text,
  rating            integer not null check (rating between 1 and 5),
  title             text,
  body              text,
  reviewer_name     text not null,
  reviewer_email    text,
  reviewer_phone    text,
  verified_purchase boolean not null default false,
  helpful_count     integer not null default 0,
  status            text not null default 'pending',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Reconcile columns if an older partial table already exists.
alter table public.product_reviews add column if not exists product_slug      text;
alter table public.product_reviews add column if not exists reviewer_phone    text;
alter table public.product_reviews add column if not exists helpful_count     integer not null default 0;
alter table public.product_reviews alter column product_id drop not null;

-- Row-Level Security: anonymous visitors may READ approved reviews and SUBMIT
-- pending ones; only admins can moderate/manage.
alter table public.product_reviews enable row level security;

drop policy if exists "Anyone can view approved reviews" on public.product_reviews;
create policy "Anyone can view approved reviews" on public.product_reviews
  for select using (status = 'approved');

drop policy if exists "Anyone can submit reviews" on public.product_reviews;
create policy "Anyone can submit reviews" on public.product_reviews
  for insert with check (status = 'pending');

drop policy if exists "Admins manage reviews" on public.product_reviews;
create policy "Admins manage reviews" on public.product_reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Table-level privileges: anon/authenticated submit reviews (RLS still gates to
-- status='pending') and read the public columns. Explicit so this works even if the
-- project's default privileges weren't configured. PII columns are re-hidden below.
grant select, insert on public.product_reviews to anon, authenticated;
revoke select (reviewer_email, reviewer_phone) on public.product_reviews from anon, authenticated;

create index if not exists idx_reviews_slug   on public.product_reviews(product_slug);
create index if not exists idx_reviews_status on public.product_reviews(status);
create index if not exists idx_reviews_product on public.product_reviews(product_id);

-- Keep updated_at fresh (function already defined by earlier migrations).
drop trigger if exists trg_reviews_updated on public.product_reviews;
create trigger trg_reviews_updated before update on public.product_reviews
  for each row execute function public.update_updated_at_column();

-- Tell PostgREST to refresh its schema cache so the REST API sees the table now.
notify pgrst, 'reload schema';
