-- ════════════════════════════════════════════════════════════════════════════════════════════
--  ENQUIRY NOTIFICATIONS — one e-mail per enquiry, and a rate limit that holds under bursts
--  (2026-10-18)
-- ════════════════════════════════════════════════════════════════════════════════════════════
--
--  Idempotent and safe to run more than once. Nothing is dropped or deleted, and existing enquiry
--  rows are not touched. Requires 20261012120000_enquiries_insert_hardening.sql (checked first;
--  if it is missing this file stops before changing anything).
--
--  WHY:
--    • send-enquiry-notification is public (verify_jwt = false). It e-mails whenever an enquiry
--      from the same address was stored in the last 15 minutes, but nothing recorded that it had
--      already done so: one stored enquiry could be replayed into unlimited e-mails.
--    • enquiries_rate_limit() counted committed rows without a lock, so simultaneous inserts for
--      one address did not see each other. On Postgres 17 a burst of 20 parallel inserts for one
--      address stored 13 rows instead of 3.
--
--  WHAT THIS DOES:
--    1. public.enquiry_notifications: one bookkeeping row per notified enquiry. RLS on with no
--       policies, and no grants to anon or authenticated, so only the service role (the edge
--       function) and the database owner can read or change it. Deleting an enquiry deletes its
--       row. public.enquiries itself gets no new columns.
--    2. public.claim_enquiry_notification(p_email): atomically claims the newest enquiry from that
--       address stored in the last 15 minutes that has not been e-mailed. The claim is a single
--       INSERT … ON CONFLICT DO UPDATE … WHERE, so it is exactly-once under concurrency: a parallel
--       or replayed call gets no row. A claim released after a failed send can be retried (at most
--       3 attempts in all); a claim left behind by a crashed run expires after 10 minutes.
--    3. public.finish_enquiry_notification(...): records the outcome under the claim's token —
--       sent (never claimable again) or released after a failed send.
--       Both functions are SECURITY DEFINER with a fixed search_path, executable by service_role
--       only.
--    4. public.enquiries_rate_limit(): the same rules as before (3 per e-mail and 3 per phone in
--       10 minutes; service role and admins exempt), now taking a per-address transaction lock
--       before counting, so simultaneous inserts for one address are counted correctly.
--
--  RELEASE ORDER: 20261012120000_enquiries_insert_hardening.sql →
--  20261018110000_backfill_empty_enquiry_messages.sql → this file → deploy the edge function.
--  APPLY MANUALLY, BEFORE deploying the edge function version that calls these functions:
--  Supabase dashboard → SQL editor → run this file (or `supabase db push`).
--  NEVER run full_schema.sql against production.
--  ROLLBACK: supabase/rollback/20261018120000_enquiry_notification_claim.down.sql
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- 0) Requires the 2026-10-12 hardening (step 4 updates the trigger function it installed) --------
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.enquiries'::regclass and tgname = 'enquiries_rate_limit' and not tgisinternal
  ) then
    raise exception 'Apply supabase/migrations/20261012120000_enquiries_insert_hardening.sql first: the enquiries_rate_limit trigger is missing. Nothing was changed.';
  end if;
end $$;

-- 1) Bookkeeping table --------------------------------------------------------------------------
create table if not exists public.enquiry_notifications (
  enquiry_id  uuid primary key references public.enquiries (id) on delete cascade,
  claim_token uuid not null,
  claimed_at  timestamptz,
  sent_at     timestamptz,
  attempts    integer not null default 0 check (attempts >= 0),
  last_error  text check (last_error is null or char_length(last_error) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.enquiry_notifications is
  'One row per enquiry the send-enquiry-notification edge function has claimed. Service role only.';

alter table public.enquiry_notifications enable row level security;
revoke all on table public.enquiry_notifications from public, anon, authenticated;

-- 2) Claim ---------------------------------------------------------------------------------------
create or replace function public.claim_enquiry_notification(p_email text)
returns table (
  enquiry_id   uuid,
  claim_token  uuid,
  name         text,
  email        text,
  phone        text,
  company      text,
  subject      text,
  message      text,
  enquiry_type text,
  product_name text
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
  if p_email is null or char_length(p_email) > 254 then
    return;
  end if;

  for candidate in
    select e.id
    from public.enquiries e
    where lower(e.email) = lower(p_email)
      and e.created_at > now() - interval '15 minutes'
    order by e.created_at desc
    limit 5
  loop
    new_token := gen_random_uuid();
    claimed := null;

    -- First claim inserts the row. A later claim succeeds only if nothing was sent, fewer than 3
    -- attempts were made, and the previous claim was released or has expired. Under concurrency
    -- the conflicting row is locked and the WHERE is re-checked on its latest version, so exactly
    -- one caller gets the row back.
    insert into public.enquiry_notifications as n (enquiry_id, claim_token, claimed_at, attempts)
    values (candidate, new_token, now(), 1)
    on conflict (enquiry_id) do update
      set claim_token = excluded.claim_token,
          claimed_at  = excluded.claimed_at,
          attempts    = n.attempts + 1,
          updated_at  = now()
      where n.sent_at is null
        and n.attempts < 3
        and (n.claimed_at is null or n.claimed_at < now() - interval '10 minutes')
    returning n.enquiry_id into claimed;

    if claimed is not null then
      return query
        select e.id, new_token, e.name, e.email, e.phone, e.company, e.subject, e.message,
               e.enquiry_type, e.product_name
        from public.enquiries e
        where e.id = claimed;
      return;
    end if;
  end loop;
end;
$$;

-- 3) Finish --------------------------------------------------------------------------------------
create or replace function public.finish_enquiry_notification(
  p_enquiry_id  uuid,
  p_claim_token uuid,
  p_sent        boolean,
  p_error       text default null
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if p_sent then
    update public.enquiry_notifications
       set sent_at    = coalesce(sent_at, now()),
           last_error = left(p_error, 500),
           updated_at = now()
     where enquiry_id = p_enquiry_id
       and claim_token = p_claim_token;
  else
    -- Release after a failed send so a later call can retry (bounded by the 3-attempt cap).
    update public.enquiry_notifications
       set claimed_at = null,
           last_error = left(p_error, 500),
           updated_at = now()
     where enquiry_id = p_enquiry_id
       and claim_token = p_claim_token
       and sent_at is null;
  end if;
  return found;
end;
$$;

revoke all on function public.claim_enquiry_notification(text) from public, anon, authenticated;
revoke all on function public.finish_enquiry_notification(uuid, uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_enquiry_notification(text) to service_role;
grant execute on function public.finish_enquiry_notification(uuid, uuid, boolean, text) to service_role;

-- 4) Rate limit: same rules, now race-free ------------------------------------------------------
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

  -- Inserts for the same address wait for each other (the lock is held until commit), so each
  -- count below sees every row committed before it.
  perform pg_advisory_xact_lock(hashtextextended('enquiries_rate_limit:email:' || lower(coalesce(new.email, '')), 0));
  select count(*) into recent from public.enquiries
  where lower(email) = lower(new.email) and created_at > now() - interval '10 minutes';
  if recent >= 3 then
    raise exception 'rate_limited: too many enquiries from this email address' using errcode = 'P0001';
  end if;

  phone_digits := right(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g'), 10);
  if length(phone_digits) = 10 then
    perform pg_advisory_xact_lock(hashtextextended('enquiries_rate_limit:phone:' || phone_digits, 0));
    select count(*) into recent from public.enquiries
    where created_at > now() - interval '10 minutes'
      and right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = phone_digits;
    if recent >= 3 then
      raise exception 'rate_limited: too many enquiries from this phone number' using errcode = 'P0001';
    end if;
  end if;

  -- No site-wide cap: see 20261012120000 (a global limit would let anyone lock real customers out).
  return new;
end;
$$;

revoke all on function public.enquiries_rate_limit() from public;

-- Refresh PostgREST's schema cache so the API sees the new functions immediately.
notify pgrst, 'reload schema';
