-- Ensure public.parties + public.party_addresses exist on the live database and match
-- exactly what Quotation Pro / Parties (src/views/admin/QuotationPro.tsx, Parties.tsx)
-- read and write.
--
-- Root cause of "Could not find the table 'public.parties' in the schema cache":
-- the parties migrations (client master) were committed to the repo but never applied
-- to the production Supabase instance, so the "Save Client" INSERT via PostgREST failed.
-- Additionally the app now writes `contact_person` and `site_location`, which the ORIGINAL
-- parties table did not have — so even after creating the table those inserts would 400.
--
-- Fully IDEMPOTENT — safe whether the tables are absent, or an older/partial version
-- already exists. Reconciles the schema to what the app expects.

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- Shared updated_at trigger fn, so this migration also works run standalone in the SQL editor.
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---- Parties (client master) ----------------------------------------------------------
create table if not exists public.parties (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  company         text,
  email           text,
  phone           text,
  gstin           text,
  pan             text,
  billing_address text,
  city            text,
  state           text,
  pincode         text,
  contact_person  text,                                   -- written by Quotation Pro
  site_location   text,                                   -- written by Quotation Pro
  party_type      text    not null default 'customer',    -- customer | supplier | both
  credit_limit    numeric not null default 0,
  opening_balance numeric not null default 0,
  notes           text,
  is_active       boolean not null default true,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Reconcile columns if an older/partial parties table already exists.
alter table public.parties add column if not exists company         text;
alter table public.parties add column if not exists email           text;
alter table public.parties add column if not exists phone           text;
alter table public.parties add column if not exists gstin           text;
alter table public.parties add column if not exists billing_address text;
alter table public.parties add column if not exists state           text;
alter table public.parties add column if not exists pincode         text;
alter table public.parties add column if not exists contact_person  text;
alter table public.parties add column if not exists site_location   text;
alter table public.parties add column if not exists party_type      text not null default 'customer';

create index if not exists idx_parties_name  on public.parties(name);
create index if not exists idx_parties_phone on public.parties(phone);

alter table public.parties enable row level security;
drop policy if exists "Admins manage parties" on public.parties;
create policy "Admins manage parties" on public.parties
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.parties to authenticated;

drop trigger if exists update_parties_updated_at on public.parties;
create trigger update_parties_updated_at before update on public.parties
  for each row execute function public.update_updated_at_column();

-- ---- Party ship-to / project addresses ------------------------------------------------
create table if not exists public.party_addresses (
  id             uuid primary key default gen_random_uuid(),
  party_id       uuid not null references public.parties(id) on delete cascade,
  label          text not null,
  contact_person text,
  contact_phone  text,
  address_line1  text,
  address_line2  text,
  city           text,
  state          text,
  pincode        text,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists idx_party_addresses_party on public.party_addresses(party_id);

alter table public.party_addresses enable row level security;
drop policy if exists "Admins manage party addresses" on public.party_addresses;
create policy "Admins manage party addresses" on public.party_addresses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.party_addresses to authenticated;

-- ---- Optional: link transactions to a party (only where the table already exists) ------
do $$
declare t text;
begin
  foreach t in array array['quotations','sales_orders','project_allocations','rental_assignments','stock_outwards']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I add column if not exists party_id uuid references public.parties(id)', t);
      execute format('create index if not exists idx_%s_party on public.%I(party_id)', t, t);
    end if;
  end loop;
end $$;

-- Tell PostgREST to refresh its schema cache so the REST API sees parties now.
notify pgrst, 'reload schema';
