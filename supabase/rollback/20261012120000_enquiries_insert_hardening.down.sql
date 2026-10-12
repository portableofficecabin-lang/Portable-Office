-- Rollback for supabase/migrations/20261012120000_enquiries_insert_hardening.sql
-- Restores the previous behaviour exactly: permissive anonymous inserts, no length caps, no
-- rate-limit trigger. No row data is touched. Idempotent.

drop trigger if exists enquiries_rate_limit on public.enquiries;
drop function if exists public.enquiries_rate_limit();

alter table public.enquiries drop constraint if exists enquiries_field_lengths_check;

do $$
declare
  policy_name text;
begin
  foreach policy_name in array array['Anyone can create enquiries', 'Public can create enquiries'] loop
    if exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'enquiries' and policyname = policy_name
    ) then
      execute format('alter policy %I on public.enquiries with check (true)', policy_name);
    end if;
  end loop;
end $$;

drop index if exists public.idx_enquiries_lower_email_created;
-- idx_enquiries_created_at is kept: it may have existed before and costs nothing.

notify pgrst, 'reload schema';
