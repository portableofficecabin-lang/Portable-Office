-- ============================================================================
-- FIX: "new row violates row-level security policy for table 'quotations'"
--      (quotation saves only to the browser, not visible on other devices)
--
-- WHY THIS HAPPENS
-- ----------------------------------------------------------------------------
-- Every admin table is protected by:  WITH CHECK (is_admin())
-- and  is_admin()  =  has_role(auth.uid(), 'admin')  =  "there is a row in
-- public.user_roles for my user id with role 'admin'".
--
-- If the account you are logged in with has NO such row, Postgres rejects the
-- INSERT/UPSERT (error 42501). The app then falls back to localStorage — which
-- is exactly the "Saved only on this browser" message, and why the quotation
-- does not appear when you log in on another device (it never reached the DB).
--
-- The same grant fixes writes to quotations, quotation_items, sales_orders,
-- cabin_quotations, parties, ledger_entries, materials, inventory — every admin
-- table uses the same is_admin() rule.
--
-- WHERE TO RUN:  Supabase Dashboard  ->  SQL Editor  ->  New query  ->  paste
--                ->  Run.  (Run it against the SAME project your website's
--                NEXT_PUBLIC_SUPABASE_URL points to.)
-- ============================================================================


-- STEP 1 — DIAGNOSE. Run this first. It lists every login and whether it is an
-- admin. Find the email you log in to the admin panel with and read is_admin.
--   is_admin = true   -> the grant is fine; the problem is elsewhere (see notes)
--   is_admin = false  -> this is the cause; run STEP 2 for that email.

select
  u.email,
  u.id                                                        as user_id,
  exists (
    select 1 from public.user_roles r
    where r.user_id = u.id and r.role = 'admin'
  )                                                           as is_admin,
  u.created_at
from auth.users u
order by u.created_at;


-- STEP 2 — GRANT ADMIN to your login. Replace the email with the EXACT email
-- you sign in with (copy it from STEP 1 so there is no typo). Idempotent:
-- running it again does nothing, and it can never create a second row.

insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role
from auth.users u
where lower(u.email) = lower('REPLACE_WITH_YOUR_ADMIN_EMAIL')  -- <-- EDIT THIS
on conflict (user_id, role) do nothing;


-- STEP 3 — VERIFY. Re-run STEP 1; your row should now show is_admin = true.
-- Then in the app: log out and log back in (so the session is fresh), open the
-- quotation, and click Save. It should now say "Quotation saved" (not "Saved
-- only on this browser"). Existing browser-only quotations sync to the DB on the
-- next save/open, so they become visible on every device.
-- ============================================================================
