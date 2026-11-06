-- Rollback for supabase/migrations/20261105120000_booking_otp_limits.sql
-- Removes the two code functions, the send log and the wrong-guess counter. booking_otps rows are
-- kept (only their failed_attempts value goes with the column); the send log IS deleted with its
-- table. Idempotent.
--
-- ORDER: first deploy send-booking-otp / verify-booking-otp / signup-with-otp versions that do not
-- call issue_booking_otp / check_booking_otp (the new versions refuse to work without them), then
-- run this file.

drop function if exists public.issue_booking_otp(text, text);
drop function if exists public.check_booking_otp(text, text);
drop table if exists public.booking_otp_sends;
alter table public.booking_otps drop constraint if exists booking_otps_failed_attempts_check;
alter table public.booking_otps drop column if exists failed_attempts;

notify pgrst, 'reload schema';
