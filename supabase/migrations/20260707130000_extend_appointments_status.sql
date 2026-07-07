-- Widen appointments.status CHECK to include the statuses the admin UI writes
-- ('postponed', 'declined') that the original constraint never allowed.
--
-- Root cause of "new row for relation 'appointments' violates check constraint
-- 'appointments_status_check'": src/views/admin/Appointments.tsx (Postpone / Reschedule
-- -> status='postponed'; Decline -> status='declined'; and the status <Select> dropdown)
-- and src/types/database.ts were extended with the two new statuses, but the DB CHECK
-- constraint (created in migration 20260128034023) was never updated. So every Postpone
-- and Decline admin action fails at runtime until this migration is applied.
--
-- Idempotent: DROP CONSTRAINT IF EXISTS, then re-add the full six-value set. The original
-- constraint was declared inline on the column, so its auto-generated name is
-- "appointments_status_check".

alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'postponed', 'declined'));

-- Tell PostgREST to refresh its schema cache so the REST API reflects the change now.
notify pgrst, 'reload schema';
