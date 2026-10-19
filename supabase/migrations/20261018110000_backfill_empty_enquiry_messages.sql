-- ════════════════════════════════════════════════════════════════════════════════════════════
--  ENQUIRIES — backfill the four legacy rows whose message is empty (2026-10-18)
-- ════════════════════════════════════════════════════════════════════════════════════════════
--
--  Idempotent and safe to run more than once. Changes ONE column (message) on at most FOUR rows,
--  identified by id. Nothing else is modified, deleted or dropped.
--
--  WHY: a read-only check of production (2026-10-18) found exactly four enquiries with an empty
--  message, from the quote form before it started storing a default (14 Jul – 3 Sep 2026, all
--  still lead_status 'new'). 20261012120000_enquiries_insert_hardening.sql adds
--  enquiries_field_lengths_check (message length 1–8000) as NOT VALID. Postgres still checks a
--  NOT VALID constraint on every UPDATE, so after the hardening an admin could not change these
--  rows' status or pipeline stage in the CRM.
--
--  WHAT THIS DOES: gives exactly those four rows the message the quote form now stores when a
--  visitor leaves the box blank (src/components/products/EnquiryModal.tsx):
--      Quote request for <product name> (no message entered).
--  A row is changed only if it has one of the four ids AND its message is still empty. updated_at is
--  preserved: the updated_at trigger is switched off for this one UPDATE and back on in the same
--  transaction (other writers wait on the table lock meanwhile, so none runs without it).
--
--  RELEASE ORDER: 20261012120000_enquiries_insert_hardening.sql → this file →
--  20261018120000_enquiry_notification_claim.sql.
--  APPLY MANUALLY: Supabase dashboard → SQL editor → run this file (or `supabase db push`).
--  NEVER run full_schema.sql against production.
--  ROLLBACK: supabase/rollback/20261018110000_backfill_empty_enquiry_messages.down.sql
-- ════════════════════════════════════════════════════════════════════════════════════════════

do $$
declare
  target_ids constant uuid[] := array[
    '5878ac58-57e0-4564-941e-f3dfd373adb6',  -- 2026-07-14, Portable Cabin 40ft Bunkhouse
    '8cb4e17c-70e5-4d8b-8b5d-4ad18249747a',  -- 2026-07-18, Executive Portable Cabin 20ft
    'dfbfe207-a654-4f71-a7f8-925ed81b4d74',  -- 2026-07-19, Family Prefab Home 2BHK
    'e865deb4-4c6c-4360-900d-79e10f4dcdce'   -- 2026-09-03, Work Accommodation Bunker Container (12 Beds G+1 for 24 Staff)
  ]::uuid[];
  has_updated_at_trigger boolean;
  changed integer;
begin
  select exists (
    select 1 from pg_trigger
    where tgrelid = 'public.enquiries'::regclass and tgname = 'update_enquiries_updated_at' and not tgisinternal
  ) into has_updated_at_trigger;

  if has_updated_at_trigger then
    alter table public.enquiries disable trigger update_enquiries_updated_at;
  end if;

  update public.enquiries
     set message = case
                     when nullif(product_name, '') is not null then 'Quote request for ' || product_name || ' (no message entered).'
                     else 'Quote request (no message entered).'
                   end
   where id = any (target_ids)
     and coalesce(char_length(message), 0) = 0;
  get diagnostics changed = row_count;

  if has_updated_at_trigger then
    alter table public.enquiries enable trigger update_enquiries_updated_at;
  end if;

  raise notice 'backfill_empty_enquiry_messages: % row(s) updated (0 on a re-run)', changed;
end $$;
