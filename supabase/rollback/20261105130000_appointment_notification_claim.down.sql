-- Rollback for supabase/migrations/20261105130000_appointment_notification_claim.sql
-- Removes the claim functions, the bookkeeping table, the rate-limit trigger and function, the
-- length check and the lookup index. Appointment rows are not touched; the record of which
-- appointments were e-mailed IS deleted with the table. Idempotent.
--
-- ORDER: first deploy a send-appointment-confirmation version that does not call
-- claim_appointment_notification (the new version refuses to send without it), then run this file.

drop function if exists public.claim_appointment_notification(text);
drop function if exists public.finish_appointment_notification(uuid, uuid, boolean, text);
drop table if exists public.appointment_notifications;
drop trigger if exists appointments_rate_limit on public.appointments;
drop function if exists public.appointments_rate_limit();
alter table public.appointments drop constraint if exists appointments_field_lengths_check;
drop index if exists public.idx_appointments_email_created_at;

notify pgrst, 'reload schema';
