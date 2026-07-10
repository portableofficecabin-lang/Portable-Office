-- Prefab Labour Colony Calculator — project persistence (spec §1 & §10).
--
-- Stores each saved labour-colony project as a small set of queryable columns
-- (for lists / dashboards / reports) plus a JSONB `data` blob holding the full
-- editable model (LabourColonyProject: meta + structure config + civil config +
-- future sections). This mirrors the codebase convention of keeping rich, nested
-- calculator state as JSON rather than fully normalising it (cf. products.specifications,
-- Quotation Pro's client-side JSON).
--
-- Fully IDEMPOTENT — safe to run whether the table is absent or a partial version
-- exists. The app (src/lib/quotation/labourColonyStore.ts) tolerates this table
-- being unapplied (localStorage fallback), so applying this later is non-breaking.

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
create table if not exists public.labour_colony_projects (
  id              uuid primary key default gen_random_uuid(),
  project_number  text unique,
  party_id        uuid,
  customer_name   text,
  customer_mobile text,
  customer_email  text,
  location        text,
  workers         integer,
  floors          smallint,
  sale_or_rental  text,
  status          text not null default 'draft',
  total_sqft      numeric,
  total_amount    numeric,
  quotation_id    uuid,
  sales_order_id  uuid,
  enquiry_id      uuid,
  data            jsonb not null default '{}'::jsonb,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Reconcile columns if an older/partial table already exists.
alter table public.labour_colony_projects add column if not exists project_number  text;
alter table public.labour_colony_projects add column if not exists party_id        uuid;
alter table public.labour_colony_projects add column if not exists customer_name   text;
alter table public.labour_colony_projects add column if not exists customer_mobile text;
alter table public.labour_colony_projects add column if not exists customer_email  text;
alter table public.labour_colony_projects add column if not exists location        text;
alter table public.labour_colony_projects add column if not exists workers         integer;
alter table public.labour_colony_projects add column if not exists floors          smallint;
alter table public.labour_colony_projects add column if not exists sale_or_rental  text;
alter table public.labour_colony_projects add column if not exists status          text not null default 'draft';
alter table public.labour_colony_projects add column if not exists total_sqft      numeric;
alter table public.labour_colony_projects add column if not exists total_amount    numeric;
alter table public.labour_colony_projects add column if not exists quotation_id    uuid;
alter table public.labour_colony_projects add column if not exists sales_order_id  uuid;
alter table public.labour_colony_projects add column if not exists enquiry_id      uuid;
alter table public.labour_colony_projects add column if not exists data            jsonb not null default '{}'::jsonb;
alter table public.labour_colony_projects add column if not exists created_by      uuid;

create index if not exists idx_lc_projects_updated  on public.labour_colony_projects(updated_at desc);
create index if not exists idx_lc_projects_party    on public.labour_colony_projects(party_id);
create index if not exists idx_lc_projects_status   on public.labour_colony_projects(status);

-- ---- Conditional foreign keys (only if the referenced tables exist) -----------------
do $$
begin
  if to_regclass('public.parties') is not null then
    if not exists (select 1 from pg_constraint where conname = 'lc_projects_party_fk') then
      alter table public.labour_colony_projects
        add constraint lc_projects_party_fk foreign key (party_id)
        references public.parties(id) on delete set null;
    end if;
  end if;
  if to_regclass('public.quotations') is not null then
    if not exists (select 1 from pg_constraint where conname = 'lc_projects_quotation_fk') then
      alter table public.labour_colony_projects
        add constraint lc_projects_quotation_fk foreign key (quotation_id)
        references public.quotations(id) on delete set null;
    end if;
  end if;
  if to_regclass('public.sales_orders') is not null then
    if not exists (select 1 from pg_constraint where conname = 'lc_projects_so_fk') then
      alter table public.labour_colony_projects
        add constraint lc_projects_so_fk foreign key (sales_order_id)
        references public.sales_orders(id) on delete set null;
    end if;
  end if;
  if to_regclass('public.enquiries') is not null then
    if not exists (select 1 from pg_constraint where conname = 'lc_projects_enquiry_fk') then
      alter table public.labour_colony_projects
        add constraint lc_projects_enquiry_fk foreign key (enquiry_id)
        references public.enquiries(id) on delete set null;
    end if;
  end if;
end $$;

-- ---- Auto project number LC-#### ----------------------------------------------------
create or replace function public.set_labour_colony_project_number()
returns trigger language plpgsql as $$
declare next_n integer;
begin
  if new.project_number is null or new.project_number = '' then
    select coalesce(max((substring(project_number from 'LC-([0-9]+)'))::int), 0) + 1
      into next_n from public.labour_colony_projects
      where project_number ~ '^LC-[0-9]+$';
    new.project_number := 'LC-' || lpad(next_n::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists set_lc_project_number on public.labour_colony_projects;
create trigger set_lc_project_number before insert on public.labour_colony_projects
  for each row execute function public.set_labour_colony_project_number();

-- ---- RLS + grants + updated_at ------------------------------------------------------
alter table public.labour_colony_projects enable row level security;
drop policy if exists "Admins manage labour colony projects" on public.labour_colony_projects;
create policy "Admins manage labour colony projects" on public.labour_colony_projects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.labour_colony_projects to authenticated;

drop trigger if exists update_lc_projects_updated_at on public.labour_colony_projects;
create trigger update_lc_projects_updated_at before update on public.labour_colony_projects
  for each row execute function public.update_updated_at_column();

-- Refresh PostgREST schema cache so the REST API sees the new table immediately.
notify pgrst, 'reload schema';
