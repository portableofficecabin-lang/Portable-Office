-- Rollback for supabase/migrations/20261018120000_enquiry_notification_claim.sql
-- Restores the previous behaviour exactly: removes the two claim functions and the bookkeeping
-- table, and puts back enquiries_rate_limit() without the per-address lock. Enquiry rows are not
-- touched; the bookkeeping of which enquiries were e-mailed IS deleted with the table. Idempotent.
--
-- ORDER: first deploy an edge-function version that does not call claim_enquiry_notification
-- (the new version refuses to send without it), then run this file.

drop function if exists public.claim_enquiry_notification(text);
drop function if exists public.finish_enquiry_notification(uuid, uuid, boolean, text);
drop table if exists public.enquiry_notifications;

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

notify pgrst, 'reload schema';
