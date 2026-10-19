-- Rollback for supabase/migrations/20261018110000_backfill_empty_enquiry_messages.sql
-- Restores the previous data exactly: the four rows get their empty message back, but only where the
-- message is still the exact text the backfill wrote (a message edited since is left alone).
-- updated_at is preserved the same way the backfill preserved it. Idempotent.
--
-- ORDER: an empty message breaks enquiries_field_lengths_check, which Postgres checks on UPDATE, so
-- this file refuses to run while that constraint exists. Full rollback order:
--   20261018120000_enquiry_notification_claim.down.sql
--   → 20261012120000_enquiries_insert_hardening.down.sql
--   → this file.

do $$
declare
  target_ids constant uuid[] := array[
    '5878ac58-57e0-4564-941e-f3dfd373adb6',
    '8cb4e17c-70e5-4d8b-8b5d-4ad18249747a',
    'dfbfe207-a654-4f71-a7f8-925ed81b4d74',
    'e865deb4-4c6c-4360-900d-79e10f4dcdce'
  ]::uuid[];
  has_updated_at_trigger boolean;
  changed integer;
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.enquiries'::regclass and conname = 'enquiries_field_lengths_check'
  ) then
    raise exception 'Roll back 20261012120000_enquiries_insert_hardening first: enquiries_field_lengths_check would reject an empty message. Nothing was changed.';
  end if;

  select exists (
    select 1 from pg_trigger
    where tgrelid = 'public.enquiries'::regclass and tgname = 'update_enquiries_updated_at' and not tgisinternal
  ) into has_updated_at_trigger;

  if has_updated_at_trigger then
    alter table public.enquiries disable trigger update_enquiries_updated_at;
  end if;

  update public.enquiries
     set message = ''
   where id = any (target_ids)
     and message = case
                     when nullif(product_name, '') is not null then 'Quote request for ' || product_name || ' (no message entered).'
                     else 'Quote request (no message entered).'
                   end;
  get diagnostics changed = row_count;

  if has_updated_at_trigger then
    alter table public.enquiries enable trigger update_enquiries_updated_at;
  end if;

  raise notice 'backfill rollback: % row(s) restored to an empty message', changed;
end $$;
