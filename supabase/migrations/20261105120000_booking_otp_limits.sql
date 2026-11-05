-- ════════════════════════════════════════════════════════════════════════════════════════════
--  VERIFICATION CODES — send limits and a wrong-guess limit (2026-11-05)
-- ════════════════════════════════════════════════════════════════════════════════════════════
--
--  Idempotent and safe to run more than once. Nothing is dropped. Existing booking_otps rows keep
--  every value; they only gain failed_attempts = 0.
--
--  WHY:
--    • send-booking-otp is public (verify_jwt = false) and e-mails a code to ANY address on request,
--      with no limit: one script could flood an inbox from the company's Zoho account (the same
--      account that sends enquiry notifications, so a spam suspension would stop those too).
--    • verify-booking-otp and signup-with-otp accept unlimited guesses at a 6-digit code for its
--      10 minutes. signup-with-otp creates an account for the address once a guess matches.
--
--  WHAT THIS DOES:
--    1. public.booking_otps.failed_attempts (default 0): wrong guesses at that code.
--    2. public.booking_otp_sends: one row per code issued (address + time), used only for the send
--       limits. RLS on with no policies and no grants to anon or authenticated; rows older than
--       2 days are removed by issue_booking_otp().
--    3. public.issue_booking_otp(p_email, p_otp_hash): stores a new code for the address unless it
--       was sent one in the last 60 seconds, 5 in the last hour or 10 in the last 24 hours. Calls for
--       one address are serialised by a transaction lock, so a burst cannot slip past the counts.
--       It replaces the address's earlier codes (as the function did before) and clears expired
--       codes. Returns 'ok', 'too_soon', 'too_many' or 'invalid'.
--    4. public.check_booking_otp(p_email, p_otp_hash): atomically checks a guess. A match marks the
--       code verified (single use). A miss adds one wrong attempt to the address's live codes; after
--       5 the code is dead. Returns 'valid', 'invalid' or 'locked' (no live code: expired, used or
--       5 misses).
--       Both functions are SECURITY DEFINER with a fixed search_path, executable by service_role only.
--
--  No site-wide cap: a global limit would let anyone lock real customers out of every form.
--
--  APPLY MANUALLY, BEFORE deploying the send-booking-otp / verify-booking-otp / signup-with-otp
--  versions that call these functions: Supabase dashboard → SQL editor → run this file.
--  NEVER run full_schema.sql against production.
--  ROLLBACK: supabase/rollback/20261105120000_booking_otp_limits.down.sql
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- 1) Wrong-guess counter -------------------------------------------------------------------------
alter table public.booking_otps add column if not exists failed_attempts integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.booking_otps'::regclass and conname = 'booking_otps_failed_attempts_check'
  ) then
    alter table public.booking_otps
      add constraint booking_otps_failed_attempts_check check (failed_attempts >= 0);
  end if;
end $$;

-- 2) Send log -------------------------------------------------------------------------------------
create table if not exists public.booking_otp_sends (
  id         bigint generated always as identity primary key,
  email      text not null check (char_length(email) <= 254),
  created_at timestamptz not null default now()
);

create index if not exists booking_otp_sends_email_created_at_idx
  on public.booking_otp_sends (email, created_at desc);

comment on table public.booking_otp_sends is
  'One row per verification code issued by send-booking-otp; used only for its send limits. Service role only.';

alter table public.booking_otp_sends enable row level security;
revoke all on table public.booking_otp_sends from public, anon, authenticated;

-- 3) Issue ----------------------------------------------------------------------------------------
create or replace function public.issue_booking_otp(p_email text, p_otp_hash text)
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_email   text := lower(btrim(coalesce(p_email, '')));
  last_sent timestamptz;
  sent_hour integer;
  sent_day  integer;
begin
  if char_length(v_email) > 254
     or v_email !~ '^[^[:space:]@<>"'']+@[^[:space:]@<>"'']+\.[^[:space:]@<>"'']+$'
     or coalesce(p_otp_hash, '') !~ '^[0-9a-f]{64}$' then
    return 'invalid';
  end if;

  -- Calls for the same address wait for each other (the lock is held until commit), so each count
  -- below sees every code issued before it.
  perform pg_advisory_xact_lock(hashtextextended('booking_otp_issue:' || v_email, 0));

  select max(s.created_at),
         count(*) filter (where s.created_at > now() - interval '1 hour'),
         count(*)
    into last_sent, sent_hour, sent_day
    from public.booking_otp_sends s
   where s.email = v_email
     and s.created_at > now() - interval '24 hours';

  if last_sent > now() - interval '60 seconds' then
    return 'too_soon';
  end if;
  if sent_hour >= 5 or sent_day >= 10 then
    return 'too_many';
  end if;

  -- One live code per address, as before: a new code replaces the earlier ones.
  delete from public.booking_otps where email = v_email;
  insert into public.booking_otps (email, otp_hash, expires_at)
  values (v_email, p_otp_hash, now() + interval '10 minutes');
  insert into public.booking_otp_sends (email) values (v_email);

  -- Housekeeping: expired codes (as verify-booking-otp did before) and old send-log rows.
  delete from public.booking_otps where expires_at < now();
  delete from public.booking_otp_sends where created_at < now() - interval '2 days';

  return 'ok';
end;
$$;

-- 4) Check ----------------------------------------------------------------------------------------
create or replace function public.check_booking_otp(p_email text, p_otp_hash text)
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  matched uuid;
begin
  if char_length(v_email) > 254 or coalesce(p_otp_hash, '') !~ '^[0-9a-f]{64}$' then
    return 'invalid';
  end if;

  -- Guesses for the same address are checked one at a time, so parallel guesses cannot all be
  -- counted against the same "4 misses so far".
  perform pg_advisory_xact_lock(hashtextextended('booking_otp_check:' || v_email, 0));

  update public.booking_otps o
     set verified = true
   where o.id = (
           select c.id
             from public.booking_otps c
            where c.email = v_email
              and coalesce(c.verified, false) = false
              and c.expires_at > now()
              and c.failed_attempts < 5
              and c.otp_hash = p_otp_hash
            order by c.created_at desc
            limit 1
         )
  returning o.id into matched;

  if matched is not null then
    return 'valid';
  end if;

  update public.booking_otps
     set failed_attempts = failed_attempts + 1
   where email = v_email
     and coalesce(verified, false) = false
     and expires_at > now()
     and failed_attempts < 5;

  if exists (
    select 1 from public.booking_otps
     where email = v_email
       and coalesce(verified, false) = false
       and expires_at > now()
       and failed_attempts < 5
  ) then
    return 'invalid';
  end if;
  return 'locked';
end;
$$;

revoke all on function public.issue_booking_otp(text, text) from public, anon, authenticated;
revoke all on function public.check_booking_otp(text, text) from public, anon, authenticated;
grant execute on function public.issue_booking_otp(text, text) to service_role;
grant execute on function public.check_booking_otp(text, text) to service_role;

-- Refresh PostgREST's schema cache so the API sees the new functions immediately.
notify pgrst, 'reload schema';
