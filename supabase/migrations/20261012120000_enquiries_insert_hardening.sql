-- ════════════════════════════════════════════════════════════════════════════════════════════
--  ENQUIRIES — harden anonymous INSERT (PR #86, 2026-10-12)
-- ════════════════════════════════════════════════════════════════════════════════════════════
--
--  Idempotent and safe to run more than once. Nothing is dropped or deleted except this
--  migration's own trigger, which it recreates. Existing rows are not touched or re-validated.
--
--  WHY: every public form inserts into public.enquiries straight from the browser with the anon
--  key, and the insert policies were WITH CHECK (true). So any script could
--    • insert unlimited rows (no rate limit anywhere), and
--    • pre-set admin workflow fields — status 'responded', a pipeline stage, an assignee,
--      a follow-up date — on rows it creates.
--
--  WHAT THIS DOES:
--    1. Caps field lengths on NEW rows (constraint added NOT VALID: old rows are not checked).
--       Every public form validates the same limits before submitting
--       (src/lib/enquiries/enquiryLimits.ts, kept equal to this constraint by its test).
--    2. Tightens BOTH existing anonymous insert policies ("Anyone can create enquiries",
--       "Public can create enquiries") so a non-admin insert must leave the workflow fields at
--       their defaults. Every current form already does — none of them sets those columns.
--       Admins (public.is_admin()) are unaffected.
--    3. A BEFORE INSERT trigger that rate-limits non-admin, non-service inserts: at most 3 per
--       e-mail and 3 per phone number in 10 minutes. It raises an error whose message starts with
--       "rate_limited", which /api/enquiries maps to HTTP 429.
--       There is deliberately NO site-wide cap (denial-of-service review, 2026-10-13): the anon key
--       is public, so anyone could insert junk rows with made-up e-mails until a global cap is
--       reached and lock every real customer out of every form. Volume floods are a monitoring
--       matter (admin Enquiries screen), not a reason to refuse real enquiries.
--    4. Two indexes that keep the trigger's look-ups cheap.
--
--  APPLY MANUALLY: Supabase dashboard → SQL editor → run this file (or `supabase db push`).
--  NEVER run full_schema.sql against production.
--  ROLLBACK: supabase/rollback/20261012120000_enquiries_insert_hardening.down.sql
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- 1) Field length caps for new rows ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.enquiries'::regclass and conname = 'enquiries_field_lengths_check'
  ) then
    alter table public.enquiries add constraint enquiries_field_lengths_check check (
      char_length(name) between 1 and 200
      and char_length(email) between 3 and 254
      and (phone is null or char_length(phone) <= 40)
      and (company is null or char_length(company) <= 200)
      and (subject is null or char_length(subject) <= 300)
      and char_length(message) between 1 and 8000
      and (product_id is null or char_length(product_id) <= 100)
      and (product_name is null or char_length(product_name) <= 300)
    ) not valid;
  end if;
end $$;

-- 2) Anonymous inserts may not pre-set workflow fields ----------------------------------------
--    The condition is composed only from columns that actually exist, so the migration also runs
--    on a database where a later column migration has not been applied yet.
do $$
declare
  cond text := 'true';
  col record;
  policy_name text;
  admin_bypass text := '';
begin
  for col in
    select * from (values
      ('status', 'status = ''new'''),
      ('pipeline_stage', 'pipeline_stage = ''new'''),
      ('lead_status', 'lead_status = ''new'''),
      ('assigned_to', 'assigned_to is null'),
      ('next_followup_at', 'next_followup_at is null'),
      ('lost_reason', 'lost_reason is null')
    ) as v(column_name, predicate)
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'enquiries' and column_name = col.column_name
    ) then
      cond := cond || ' and ' || col.predicate;
    end if;
  end loop;

  if to_regprocedure('public.is_admin()') is not null then
    admin_bypass := 'public.is_admin() or ';
  end if;

  foreach policy_name in array array['Anyone can create enquiries', 'Public can create enquiries'] loop
    if exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'enquiries' and policyname = policy_name
    ) then
      execute format('alter policy %I on public.enquiries with check (%s(%s))', policy_name, admin_bypass, cond);
    end if;
  end loop;
end $$;

-- 3) Rate limit ---------------------------------------------------------------------------------
create or replace function public.enquiries_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_privileged boolean := false;
  phone_digits text;
  recent integer;
begin
  -- The service role (server-side jobs) and signed-in admins are never limited.
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
     or coalesce((nullif(current_setting('request.jwt.claims', true), '')::json ->> 'role'), '') = 'service_role' then
    return new;
  end if;
  if to_regprocedure('public.is_admin()') is not null then
    execute 'select public.is_admin()' into is_privileged;
    if coalesce(is_privileged, false) then
      return new;
    end if;
  end if;

  select count(*) into recent from public.enquiries
  where lower(email) = lower(new.email) and created_at > now() - interval '10 minutes';
  if recent >= 3 then
    raise exception 'rate_limited: too many enquiries from this email address' using errcode = 'P0001';
  end if;

  phone_digits := right(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), 10);
  if length(phone_digits) = 10 then
    select count(*) into recent from public.enquiries
    where created_at > now() - interval '10 minutes'
      and right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = phone_digits;
    if recent >= 3 then
      raise exception 'rate_limited: too many enquiries from this phone number' using errcode = 'P0001';
    end if;
  end if;

  -- No site-wide cap: see "WHAT THIS DOES" 3 (a global limit would let anyone lock real customers out).
  return new;
end;
$$;

revoke all on function public.enquiries_rate_limit() from public;

drop trigger if exists enquiries_rate_limit on public.enquiries;
create trigger enquiries_rate_limit
  before insert on public.enquiries
  for each row execute function public.enquiries_rate_limit();

-- 4) Indexes for the look-ups above ------------------------------------------------------------
create index if not exists idx_enquiries_created_at on public.enquiries (created_at);
create index if not exists idx_enquiries_lower_email_created on public.enquiries (lower(email), created_at);

-- Refresh PostgREST's schema cache so the API sees the change immediately.
notify pgrst, 'reload schema';
