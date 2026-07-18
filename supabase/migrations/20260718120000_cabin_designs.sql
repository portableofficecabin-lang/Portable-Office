-- Cabin Design Calculator — saved-design persistence (drawing/3D upgrade, spec §9).
--
-- Stores each saved cabin design as a few queryable columns (for lists / dashboards)
-- plus a JSONB `data` blob holding the full CabinConfig (the calculator's single source
-- of truth) and its drawing metadata. Mirrors labour_colony_projects and the codebase
-- convention of keeping rich, nested calculator state as JSON rather than normalising it.
--
-- Fully IDEMPOTENT — safe to run whether the table is absent or a partial version exists.
-- The app (src/lib/quotation/cabinDesignStore.ts) tolerates this table being unapplied
-- (localStorage fallback), so applying this later is non-breaking. Nothing existing is
-- altered — this only ADDS a new table.

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- Shared updated_at trigger fn (also defined by other migrations; safe to redefine).
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---- Table --------------------------------------------------------------------------
create table if not exists public.cabin_designs (
  id              uuid primary key default gen_random_uuid(),
  design_number   text unique,
  party_id        uuid,
  customer_name   text,
  customer_mobile text,
  customer_email  text,
  product_id      text,
  title           text,
  length_ft       numeric,
  width_ft        numeric,
  height_ft       numeric,
  total_amount    numeric,
  status          text not null default 'draft',
  quotation_id    uuid,
  enquiry_id      uuid,
  data            jsonb not null default '{}'::jsonb,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Reconcile columns if an older/partial table already exists.
alter table public.cabin_designs add column if not exists design_number   text;
alter table public.cabin_designs add column if not exists party_id        uuid;
alter table public.cabin_designs add column if not exists customer_name   text;
alter table public.cabin_designs add column if not exists customer_mobile text;
alter table public.cabin_designs add column if not exists customer_email  text;
alter table public.cabin_designs add column if not exists product_id      text;
alter table public.cabin_designs add column if not exists title           text;
alter table public.cabin_designs add column if not exists length_ft       numeric;
alter table public.cabin_designs add column if not exists width_ft        numeric;
alter table public.cabin_designs add column if not exists height_ft       numeric;
alter table public.cabin_designs add column if not exists total_amount    numeric;
alter table public.cabin_designs add column if not exists status          text not null default 'draft';
alter table public.cabin_designs add column if not exists quotation_id    uuid;
alter table public.cabin_designs add column if not exists enquiry_id      uuid;
alter table public.cabin_designs add column if not exists data            jsonb not null default '{}'::jsonb;
alter table public.cabin_designs add column if not exists created_by      uuid;

create index if not exists idx_cabin_designs_updated on public.cabin_designs(updated_at desc);
create index if not exists idx_cabin_designs_party   on public.cabin_designs(party_id);
create index if not exists idx_cabin_designs_status  on public.cabin_designs(status);

-- ---- Conditional foreign keys (only if the referenced tables exist) -----------------
do $$
begin
  if to_regclass('public.parties') is not null then
    if not exists (select 1 from pg_constraint where conname = 'cabin_designs_party_fk') then
      alter table public.cabin_designs
        add constraint cabin_designs_party_fk foreign key (party_id)
        references public.parties(id) on delete set null;
    end if;
  end if;
  if to_regclass('public.quotations') is not null then
    if not exists (select 1 from pg_constraint where conname = 'cabin_designs_quotation_fk') then
      alter table public.cabin_designs
        add constraint cabin_designs_quotation_fk foreign key (quotation_id)
        references public.quotations(id) on delete set null;
    end if;
  end if;
  if to_regclass('public.enquiries') is not null then
    if not exists (select 1 from pg_constraint where conname = 'cabin_designs_enquiry_fk') then
      alter table public.cabin_designs
        add constraint cabin_designs_enquiry_fk foreign key (enquiry_id)
        references public.enquiries(id) on delete set null;
    end if;
  end if;
end $$;

-- ---- Auto design number CD-#### -----------------------------------------------------
create or replace function public.set_cabin_design_number()
returns trigger language plpgsql as $$
declare next_n integer;
begin
  if new.design_number is null or new.design_number = '' then
    select coalesce(max((substring(design_number from 'CD-([0-9]+)'))::int), 0) + 1
      into next_n from public.cabin_designs
      where design_number ~ '^CD-[0-9]+$';
    new.design_number := 'CD-' || lpad(next_n::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists set_cabin_design_number on public.cabin_designs;
create trigger set_cabin_design_number before insert on public.cabin_designs
  for each row execute function public.set_cabin_design_number();

-- ---- RLS + grants + updated_at ------------------------------------------------------
alter table public.cabin_designs enable row level security;
drop policy if exists "Admins manage cabin designs" on public.cabin_designs;
create policy "Admins manage cabin designs" on public.cabin_designs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.cabin_designs to authenticated;

drop trigger if exists update_cabin_designs_updated_at on public.cabin_designs;
create trigger update_cabin_designs_updated_at before update on public.cabin_designs
  for each row execute function public.update_updated_at_column();

-- Refresh PostgREST schema cache so the REST API sees the new table immediately.
notify pgrst, 'reload schema';
