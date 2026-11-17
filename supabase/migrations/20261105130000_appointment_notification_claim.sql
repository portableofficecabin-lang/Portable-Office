-- ════════════════════════════════════════════════════════════════════════════════════════════
--  APPOINTMENT E-MAILS — one confirmation per stored booking, a rate limit and field limits
--  (2026-11-05)
-- ════════════════════════════════════════════════════════════════════════════════════════════
--
--  Idempotent and safe to run more than once. Nothing is dropped or deleted; existing appointment
--  rows and the existing policies are not touched. Production had 0 appointment rows when this was
--  written (read-only check 2026-11-05); the length check is validated, and refuses to apply if a
--  row ever exceeds it (nothing is changed in that case).
--
--  WHY:
--    • send-appointment-confirmation is public (verify_jwt = false) and e-mailed ANY address with ANY
--      text the request carried (name, company, notes, service), from the company's Zoho account: an
--      open relay for spam, on the account that also sends enquiry notifications.
--    • appointments has a public INSERT policy (WITH CHECK (true)) but no rate limit and no length
--      limits.
--
--  WHAT THIS DOES (the same pattern as 20261018120000_enquiry_notification_claim.sql):
--    1. public.appointment_notifications: one bookkeeping row per notified appointment. RLS on with no
--       policies and no grants to anon or authenticated (service role only). Deleting an
--       appointment deletes its row. public.appointments gets no new columns.
--    2. public.claim_appointment_notification(p_email): atomically claims the newest appointment from
--       that address stored in the last 15 minutes that has not been e-mailed (INSERT … ON CONFLICT
--       DO UPDATE … WHERE: exactly once under concurrency; at most 3 attempts; a crashed claim
--       expires after 10 minutes) and returns the STORED row.
--    3. public.finish_appointment_notification(...): records the outcome under the claim's token.
--       Both functions are SECURITY DEFINER with a fixed search_path, executable by service_role only.
--    4. public.appointments_rate_limit() + trigger: at most 3 bookings per e-mail address and 3 per
--       phone number in 10 minutes, counted under a per-address transaction lock (race-free).
--       The service role and signed-in admins are exempt. No site-wide cap.
--    5. appointments_field_lengths_check: name ≤ 100, e-mail ≤ 255 and notes ≤ 1000 (the booking
--       form's own limits), phone ≤ 50, company ≤ 300, service ≤ 100.
--
--  APPLY MANUALLY, BEFORE deploying the send-appointment-confirmation version that calls these
--  functions: Supabase dashboard → SQL editor → run this file.
--  NEVER run full_schema.sql against production.
--  ROLLBACK: supabase/rollback/20261105130000_appointment_notification_claim.down.sql
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- 1) Bookkeeping table --------------------------------------------------------------------------
create table if not exists public.appointment_notifications (
  appointment_id uuid primary key references public.appointments (id) on delete cascade,
  claim_token    uuid not null,
  claimed_at     timestamptz,
  sent_at        timestamptz,
  attempts       integer not null default 0 check (attempts >= 0),
  last_error     text check (last_error is null or char_length(last_error) <= 500),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.appointment_notifications is
  'One row per appointment the send-appointment-confirmation edge function has claimed. Service role only.';

alter table public.appointment_notifications enable row level security;
revoke all on table public.appointment_notifications from public, anon, authenticated;

-- 2) Claim ---------------------------------------------------------------------------------------
create or replace function public.claim_appointment_notification(p_email text)
returns table (
  appointment_id   uuid,
  claim_token      uuid,
  customer_name    text,
  customer_email   text,
  customer_phone   text,
  company          text,
  appointment_date date,
  appointment_time time,
  service_type     text,
  notes            text
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  candidate uuid;
  new_token uuid;
  claimed   uuid;
begin
  if p_email is null or char_length(p_email) > 255 then
    return;
  end if;

  for candidate in
    select a.id
    from public.appointments a
    where lower(a.customer_email) = lower(btrim(p_email))
      and a.created_at > now() - interval '15 minutes'
    order by a.created_at desc
    limit 5
  loop
    new_token := gen_random_uuid();
    claimed := null;

    insert into public.appointment_notifications as n (appointment_id, claim_token, claimed_at, attempts)
    values (candidate, new_token, now(), 1)
    on conflict (appointment_id) do update
      set claim_token = excluded.claim_token,
          claimed_at  = excluded.claimed_at,
          attempts    = n.attempts + 1,
          updated_at  = now()
      where n.sent_at is null
        and n.attempts < 3
        and (n.claimed_at is null or n.claimed_at < now() - interval '10 minutes')
    returning n.appointment_id into claimed;

    if claimed is not null then
      return query
        select a.id, new_token, a.customer_name, a.customer_email, a.customer_phone, a.company,
               a.appointment_date, a.appointment_time, a.service_type, a.notes
        from public.appointments a
        where a.id = claimed;
      return;
    end if;
  end loop;
end;
$$;

-- 3) Finish --------------------------------------------------------------------------------------
create or replace function public.finish_appointment_notification(
  p_appointment_id uuid,
  p_claim_token    uuid,
  p_sent           boolean,
  p_error          text default null
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if p_sent then
    update public.appointment_notifications
       set sent_at    = coalesce(sent_at, now()),
           last_error = left(p_error, 500),
           updated_at = now()
     where appointment_id = p_appointment_id
       and claim_token = p_claim_token;
  else
    -- Release after a failed send so a later call can retry (bounded by the 3-attempt cap).
    update public.appointment_notifications
       set claimed_at = null,
           last_error = left(p_error, 500),
           updated_at = now()
     where appointment_id = p_appointment_id
       and claim_token = p_claim_token
       and sent_at is null;
  end if;
  return found;
end;
$$;

revoke all on function public.claim_appointment_notification(text) from public, anon, authenticated;
revoke all on function public.finish_appointment_notification(uuid, uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_appointment_notification(text) to service_role;
grant execute on function public.finish_appointment_notification(uuid, uuid, boolean, text) to service_role;

-- 4) Rate limit -----------------------------------------------------------------------------------
create or replace function public.appointments_rate_limit()
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

  -- Bookings for the same address wait for each other (the lock is held until commit), so each
  -- count below sees every row committed before it.
  perform pg_advisory_xact_lock(hashtextextended('appointments_rate_limit:email:' || lower(btrim(coalesce(new.customer_email, ''))), 0));
  select count(*) into recent from public.appointments
  where lower(btrim(customer_email)) = lower(btrim(new.customer_email)) and created_at > now() - interval '10 minutes';
  if recent >= 3 then
    raise exception 'rate_limited: too many appointment requests from this email address' using errcode = 'P0001';
  end if;

  phone_digits := right(regexp_replace(coalesce(new.customer_phone, ''), '\D', '', 'g'), 10);
  if length(phone_digits) = 10 then
    perform pg_advisory_xact_lock(hashtextextended('appointments_rate_limit:phone:' || phone_digits, 0));
    select count(*) into recent from public.appointments
    where created_at > now() - interval '10 minutes'
      and right(regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g'), 10) = phone_digits;
    if recent >= 3 then
      raise exception 'rate_limited: too many appointment requests from this phone number' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.appointments_rate_limit() from public;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.appointments'::regclass and tgname = 'appointments_rate_limit' and not tgisinternal
  ) then
    create trigger appointments_rate_limit
      before insert on public.appointments
      for each row execute function public.appointments_rate_limit();
  end if;
end $$;

-- 5) Field lengths --------------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.appointments'::regclass and conname = 'appointments_field_lengths_check'
  ) then
    alter table public.appointments
      add constraint appointments_field_lengths_check check (
        char_length(customer_name) <= 100
        and char_length(customer_email) <= 255
        and (customer_phone is null or char_length(customer_phone) <= 50)
        and (company is null or char_length(company) <= 300)
        and char_length(service_type) <= 100
        and (notes is null or char_length(notes) <= 1000)
      );
  end if;
end $$;

create index if not exists idx_appointments_email_created_at
  on public.appointments (lower(customer_email), created_at desc);

-- Refresh PostgREST's schema cache so the API sees the new functions immediately.
notify pgrst, 'reload schema';
