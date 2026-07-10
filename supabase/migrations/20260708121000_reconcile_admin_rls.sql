-- Reconcile the admin RLS foundation on the LIVE database.
--
-- Symptom: admin pages that read RLS-protected tables directly (Enquiries, Customers/profiles,
-- Appointments, …) fail with "Failed to load …". The most common live-DB cause is that
-- public.is_admin() / has_role() exist WITHOUT `security definer`. Then an admin SELECT on a
-- table whose policy calls is_admin() → is_admin() reads public.user_roles → user_roles' OWN
-- RLS policy calls is_admin() again → Postgres aborts with:
--     "infinite recursion detected in policy for relation user_roles"
-- That single error breaks EVERY admin table at once.
--
-- `security definer` makes the function run as its owner and BYPASS RLS on user_roles inside
-- it, which breaks the loop. This migration is fully IDEMPOTENT — safe to run repeatedly.

-- 1) Rebuild the role helpers as SECURITY DEFINER. This alone fixes the recursion for EVERY
--    admin table, not just enquiries. (app_role enum + user_roles already exist.)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    WHERE user_id = _user_id
  AND role::text = _role::text
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin')
$$;

-- 2) Make sure the enquiries policies are present and correct: anyone (a website visitor) may
--    submit an enquiry; only admins may read / update / delete them.
alter table public.enquiries enable row level security;

drop policy if exists "Anyone can create enquiries" on public.enquiries;
create policy "Anyone can create enquiries" on public.enquiries
  for insert to anon, authenticated with check (true);

drop policy if exists "Admins can view all enquiries" on public.enquiries;
create policy "Admins can view all enquiries" on public.enquiries
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins can update enquiries" on public.enquiries;
create policy "Admins can update enquiries" on public.enquiries
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete enquiries" on public.enquiries;
create policy "Admins can delete enquiries" on public.enquiries
  for delete to authenticated using (public.is_admin());

-- 2b) Table-level privileges (RLS still gates WHICH rows). Covers the other possible cause,
--     "permission denied for table enquiries", if the default grants were never applied.
grant select, insert, update, delete on public.enquiries to authenticated;
grant insert on public.enquiries to anon;

-- 3) Refresh PostgREST's schema cache so the REST API applies the changes immediately.
notify pgrst, 'reload schema';
