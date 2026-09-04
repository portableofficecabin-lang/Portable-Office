-- CONSTRUCTION ANIMATION STUDIO — projects, assets, scenes, render jobs, outputs, versions,
-- comments, shares and a rate-limit counter.
--
-- Backs the AI Construction Animation Builder on
--   /products/home-construction/building-construction-contractor
--
-- ── SAFETY ──────────────────────────────────────────────────────────────────────────────────
-- ADDITIVE ONLY. This migration creates new tables and one new storage bucket. It does not
-- touch, rename, drop or alter a single existing table, column, policy, function or row, and it
-- has no relationship to products, orders, quotations, the Merchant feed or the checkout.
--
-- Fully IDEMPOTENT — safe to run repeatedly, whether the tables are absent or a partial version
-- already exists. Every create is `if not exists`, every policy is dropped before it is created,
-- and every column add is `add column if not exists`, following the convention established by
-- 20260718120000_cabin_designs.sql.
--
-- ── SECURITY MODEL ──────────────────────────────────────────────────────────────────────────
-- These tables are written ONLY by the server, through the service-role client, from the routes
-- under app/api/animation-studio/. RLS is therefore enabled with NO policy for anon or
-- authenticated: a browser holding the publishable key can read and write NOTHING here, even
-- with a project id in hand. Admins get a read policy so the enquiry can be followed up from the
-- admin panel.
--
-- Anonymous visitors own their projects through `owner_session`, an HMAC of a signed httpOnly
-- cookie. The raw cookie value never reaches the database — only its digest — so a database
-- read cannot be replayed as a session.

create extension if not exists pgcrypto;

-- Shared updated_at trigger fn (also defined by other migrations; safe to redefine).
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

/* ─────────────────────────────────────────────────────────── projects ───────────────────── */

create table if not exists public.animation_projects (
  id                uuid primary key default gen_random_uuid(),
  -- Short, unguessable id used in URLs and in the workspace. Never the uuid.
  public_id         text unique,
  title             text not null default 'Untitled concept animation',
  -- Signed-in owner, when there is one. Null for an anonymous visitor.
  owner_id          uuid,
  -- sha-256 HMAC of the visitor's studio session cookie. Ownership for anonymous projects.
  owner_session     text,
  status            text not null default 'draft',
  approval_status   text not null default 'not_submitted',
  features          jsonb not null default '{}'::jsonb,
  settings          jsonb not null default '{}'::jsonb,
  share_slug        text unique,
  share_enabled     boolean not null default false,
  version           integer not null default 1,
  -- Set by the visitor's "delete my project and uploaded files" action. Rows are hard-deleted;
  -- this column exists so a scheduled purge can also soft-retire without breaking foreign keys.
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.animation_projects add column if not exists public_id       text;
alter table public.animation_projects add column if not exists title           text not null default 'Untitled concept animation';
alter table public.animation_projects add column if not exists owner_id        uuid;
alter table public.animation_projects add column if not exists owner_session   text;
alter table public.animation_projects add column if not exists status          text not null default 'draft';
alter table public.animation_projects add column if not exists approval_status text not null default 'not_submitted';
alter table public.animation_projects add column if not exists features        jsonb not null default '{}'::jsonb;
alter table public.animation_projects add column if not exists settings        jsonb not null default '{}'::jsonb;
alter table public.animation_projects add column if not exists share_slug      text;
alter table public.animation_projects add column if not exists share_enabled   boolean not null default false;
alter table public.animation_projects add column if not exists version         integer not null default 1;
alter table public.animation_projects add column if not exists deleted_at      timestamptz;

create index if not exists idx_animation_projects_session on public.animation_projects(owner_session);
create index if not exists idx_animation_projects_owner   on public.animation_projects(owner_id);
create index if not exists idx_animation_projects_updated on public.animation_projects(updated_at desc);
create unique index if not exists idx_animation_projects_public_id on public.animation_projects(public_id);
create unique index if not exists idx_animation_projects_share on public.animation_projects(share_slug)
  where share_slug is not null;

/* ─────────────────────────────────────────────────────────── assets ─────────────────────── */

create table if not exists public.animation_assets (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.animation_projects(id) on delete cascade,
  role          text not null,
  storage_path  text not null,
  mime_type     text not null,
  byte_size     bigint not null default 0,
  width         integer,
  height        integer,
  checksum      text,
  original_name text,
  created_at    timestamptz not null default now()
);

alter table public.animation_assets add column if not exists checksum      text;
alter table public.animation_assets add column if not exists original_name text;
alter table public.animation_assets add column if not exists width         integer;
alter table public.animation_assets add column if not exists height        integer;

create index if not exists idx_animation_assets_project on public.animation_assets(project_id);
-- The same file twice in one project is a mis-click, not an intent. Cheap to prevent here.
create unique index if not exists idx_animation_assets_dedupe
  on public.animation_assets(project_id, checksum) where checksum is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'animation_assets_role_check') then
    alter table public.animation_assets add constraint animation_assets_role_check
      check (role in ('exterior', 'interior', 'reference', 'floor_plan', 'logo', 'comparison'));
  end if;
end $$;

/* ─────────────────────────────────────────────────────────── scenes ─────────────────────── */

create table if not exists public.animation_scenes (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references public.animation_projects(id) on delete cascade,
  scene_index           integer not null,
  title                 text not null default 'Scene',
  kind                  text not null default 'custom',
  prompt                text not null default '',
  improved_prompt       text,
  camera_preset         text not null default 'dolly-in',
  camera_instructions   text,
  motion_intensity      integer not null default 30,
  transition_in         text not null default 'cut',
  -- Tenths of a second. INTEGER on purpose: the exact-30s guarantee is integer arithmetic, and
  -- a numeric column would let a float drift in through a hand-written UPDATE.
  duration_tenths       integer not null default 50,
  start_asset_id        uuid references public.animation_assets(id) on delete set null,
  end_asset_id          uuid references public.animation_assets(id) on delete set null,
  keyframes             jsonb not null default '[]'::jsonb,
  seed                  bigint,
  locked                boolean not null default false,
  status                text not null default 'draft',
  clip_path             text,
  clip_duration_seconds numeric,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.animation_scenes add column if not exists improved_prompt       text;
alter table public.animation_scenes add column if not exists camera_instructions   text;
alter table public.animation_scenes add column if not exists keyframes             jsonb not null default '[]'::jsonb;
alter table public.animation_scenes add column if not exists seed                  bigint;
alter table public.animation_scenes add column if not exists locked                boolean not null default false;
alter table public.animation_scenes add column if not exists clip_path             text;
alter table public.animation_scenes add column if not exists clip_duration_seconds numeric;

create index if not exists idx_animation_scenes_project on public.animation_scenes(project_id, scene_index);

/* ─────────────────────────────────────────────────────── render jobs ────────────────────── */

create table if not exists public.animation_render_jobs (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.animation_projects(id) on delete cascade,
  scene_id         uuid references public.animation_scenes(id) on delete cascade,
  kind             text not null default 'scene',
  provider         text not null,
  provider_job_id  text,
  status           text not null default 'queued',
  attempt          integer not null default 1,
  progress         integer,
  -- DUPLICATE-JOB PREVENTION. Derived from (project, scene, prompt hash, settings hash, attempt),
  -- so a double-clicked Generate button or a retried POST reuses the existing job instead of
  -- spending a second render. Unique index below is what actually enforces it.
  idempotency_key  text,
  request          jsonb not null default '{}'::jsonb,
  response         jsonb not null default '{}'::jsonb,
  error            text,
  estimated_cost   numeric,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  completed_at     timestamptz
);

alter table public.animation_render_jobs add column if not exists idempotency_key text;
alter table public.animation_render_jobs add column if not exists estimated_cost  numeric;
alter table public.animation_render_jobs add column if not exists progress        integer;
alter table public.animation_render_jobs add column if not exists completed_at    timestamptz;

create unique index if not exists idx_animation_jobs_idempotency
  on public.animation_render_jobs(idempotency_key) where idempotency_key is not null;
create index if not exists idx_animation_jobs_project on public.animation_render_jobs(project_id);
create index if not exists idx_animation_jobs_scene   on public.animation_render_jobs(scene_id);
create index if not exists idx_animation_jobs_status  on public.animation_render_jobs(status);
create index if not exists idx_animation_jobs_provider_job
  on public.animation_render_jobs(provider, provider_job_id) where provider_job_id is not null;

/* ─────────────────────────────────────────────────────────── outputs ────────────────────── */

create table if not exists public.animation_outputs (
  id                         uuid primary key default gen_random_uuid(),
  project_id                 uuid not null references public.animation_projects(id) on delete cascade,
  kind                       text not null default 'final',
  aspect_ratio               text not null default '16:9',
  resolution                 text not null default '1080p',
  storage_path               text not null,
  duration_seconds           numeric,
  -- What the server-side probe MEASURED. The 30-second guarantee is asserted against this
  -- column, never against the arithmetic that produced the storyboard.
  verified_duration_seconds  numeric,
  probe_source               text,
  byte_size                  bigint,
  created_at                 timestamptz not null default now()
);

alter table public.animation_outputs add column if not exists verified_duration_seconds numeric;
alter table public.animation_outputs add column if not exists probe_source              text;
alter table public.animation_outputs add column if not exists byte_size                 bigint;

create index if not exists idx_animation_outputs_project on public.animation_outputs(project_id, created_at desc);

/* ─────────────────────────────────────────────── versions + comments ────────────────────── */

-- Undo / version history. One row per saved snapshot of the whole editable project state.
create table if not exists public.animation_project_versions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.animation_projects(id) on delete cascade,
  version     integer not null,
  label       text,
  snapshot    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create unique index if not exists idx_animation_versions_unique
  on public.animation_project_versions(project_id, version);
create index if not exists idx_animation_versions_project
  on public.animation_project_versions(project_id, created_at desc);

-- Revision comments left by the customer or by our team on a shared preview.
create table if not exists public.animation_project_comments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.animation_projects(id) on delete cascade,
  scene_id    uuid references public.animation_scenes(id) on delete set null,
  author      text not null default 'Customer',
  body        text not null,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_animation_comments_project
  on public.animation_project_comments(project_id, created_at desc);

/* ──────────────────────────────────────────────────────── rate limits ───────────────────── */

-- Fixed-window counter, keyed by (bucket, identity). Lives in the database rather than in
-- process memory because the app runs more than one instance: an in-memory limiter on three
-- containers is a limit three times higher than the one written down.
create table if not exists public.animation_rate_limits (
  key           text primary key,
  window_start  timestamptz not null default now(),
  count         integer not null default 0,
  updated_at    timestamptz not null default now()
);

-- Atomic increment-and-test. Returns TRUE when the caller is inside the limit.
-- SECURITY DEFINER so it can be called by the service role without extra grants; the search_path
-- is pinned, which is the standard mitigation for definer functions.
create or replace function public.animation_rate_limit_hit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_count integer;
begin
  insert into public.animation_rate_limits(key, window_start, count, updated_at)
    values (p_key, now(), 1, now())
  on conflict (key) do update
    set count = case
          when public.animation_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then 1
          else public.animation_rate_limits.count + 1
        end,
        window_start = case
          when public.animation_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then now()
          else public.animation_rate_limits.window_start
        end,
        updated_at = now()
  returning window_start, count into v_start, v_count;

  return v_count <= p_limit;
end;
$$;

-- LOCK THE DEFINER FUNCTION DOWN. Postgres grants EXECUTE on a new function to PUBLIC by
-- default, and this one is SECURITY DEFINER — so without this, anyone holding the publishable
-- key could call it over PostgREST RPC and burn through another visitor's rate-limit window.
-- Only the server (service_role) has any business calling it.
revoke all on function public.animation_rate_limit_hit(text, integer, integer) from public;
revoke all on function public.animation_rate_limit_hit(text, integer, integer) from anon;
revoke all on function public.animation_rate_limit_hit(text, integer, integer) from authenticated;
grant execute on function public.animation_rate_limit_hit(text, integer, integer) to service_role;

/* ─────────────────────────────────────────────────── public id defaults ─────────────────── */

-- Short public id: 16 hex characters. Unguessable enough that a share link is not enumerable,
-- short enough to sit in a URL. Generated in the database so a client can never choose one.
-- search_path is PINNED to public + extensions. gen_random_bytes() comes from pgcrypto, which
-- Supabase installs into the `extensions` schema — a trigger that inherited a caller's narrower
-- search_path would fail at INSERT time with "function gen_random_bytes does not exist", which is
-- a confusing failure for something that worked in testing. Pinning it also closes the
-- search-path-hijack vector that unpinned functions carry.
create or replace function public.set_animation_project_public_id()
returns trigger language plpgsql
set search_path = public, extensions
as $$
begin
  if new.public_id is null or new.public_id = '' then
    new.public_id := encode(gen_random_bytes(8), 'hex');
  end if;
  return new;
end;
$$;

drop trigger if exists set_animation_project_public_id on public.animation_projects;
create trigger set_animation_project_public_id before insert on public.animation_projects
  for each row execute function public.set_animation_project_public_id();

/* ──────────────────────────────────────────────────── RLS + grants ──────────────────────── */

-- Enabled with NO anon/authenticated policy: the browser can read and write nothing here. All
-- access is through the service-role client in app/api/animation-studio/**, which bypasses RLS.
-- Admins additionally get read access so a lead can be followed up from the admin panel.
do $$
declare
  t text;
begin
  foreach t in array array[
    'animation_projects', 'animation_assets', 'animation_scenes', 'animation_render_jobs',
    'animation_outputs', 'animation_project_versions', 'animation_project_comments',
    'animation_rate_limits'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Admins read %s" on public.%I', t, t);
  end loop;
end $$;

-- public.is_admin() is created by 20260708121000_reconcile_admin_rls.sql. Guard on its existence
-- so this migration also applies cleanly to a database where that has not run yet.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'is_admin' and pronamespace = 'public'::regnamespace) then
    create policy "Admins read animation_projects" on public.animation_projects
      for select to authenticated using (public.is_admin());
    create policy "Admins read animation_assets" on public.animation_assets
      for select to authenticated using (public.is_admin());
    create policy "Admins read animation_scenes" on public.animation_scenes
      for select to authenticated using (public.is_admin());
    create policy "Admins read animation_render_jobs" on public.animation_render_jobs
      for select to authenticated using (public.is_admin());
    create policy "Admins read animation_outputs" on public.animation_outputs
      for select to authenticated using (public.is_admin());
    create policy "Admins read animation_project_versions" on public.animation_project_versions
      for select to authenticated using (public.is_admin());
    create policy "Admins read animation_project_comments" on public.animation_project_comments
      for select to authenticated using (public.is_admin());
  end if;
end $$;

-- A policy without a GRANT is inert: RLS narrows what a role may see, it does not give the role
-- table access in the first place. `authenticated` therefore needs an explicit SELECT grant for
-- the admin policies above to do anything (this is what 20260718120000_cabin_designs.sql does for
-- its own table). SELECT only, and no grant at all for `anon` — the browser reads nothing here
-- directly, and every write goes through the service-role client in the API routes.
grant select on public.animation_projects          to authenticated;
grant select on public.animation_assets            to authenticated;
grant select on public.animation_scenes            to authenticated;
grant select on public.animation_render_jobs       to authenticated;
grant select on public.animation_outputs           to authenticated;
grant select on public.animation_project_versions  to authenticated;
grant select on public.animation_project_comments  to authenticated;

-- The rate-limit counter is server bookkeeping. No role but the server may read it: the keys are
-- derived from visitor session digests, so exposing the table would leak who is using the tool.
revoke all on public.animation_rate_limits from anon;
revoke all on public.animation_rate_limits from authenticated;

/* ───────────────────────────────────────────────────── updated_at ───────────────────────── */

drop trigger if exists update_animation_projects_updated_at on public.animation_projects;
create trigger update_animation_projects_updated_at before update on public.animation_projects
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_animation_scenes_updated_at on public.animation_scenes;
create trigger update_animation_scenes_updated_at before update on public.animation_scenes
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_animation_render_jobs_updated_at on public.animation_render_jobs;
create trigger update_animation_render_jobs_updated_at before update on public.animation_render_jobs
  for each row execute function public.update_updated_at_column();

/* ───────────────────────────────────────────────────── storage bucket ───────────────────── */

-- PRIVATE bucket. Uploads, scene clips and finished exports all live here and are served only
-- through short-lived signed URLs minted by the server. `public = false` is the load-bearing
-- part: a public bucket would make every customer's house render enumerable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'animation-studio',
  'animation-studio',
  false,
  52428800, -- 50 MB: comfortably above a 12 MB upload and a 30-second 1080p H.264 export
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── STORAGE ACCESS ──────────────────────────────────────────────────────────────────────
-- NO policy is created on storage.objects for this bucket, and that is the intended access
-- control: storage.objects has RLS enabled, and in RLS the ABSENCE of a permissive policy is a
-- deny. anon and authenticated therefore cannot list, read, upload or delete anything here.
-- The service-role client in app/api/animation-studio/** bypasses RLS, and the browser only ever
-- sees short-lived signed URLs minted by the server.
--
-- THE ONE WAY THAT ASSUMPTION COULD BE WRONG is a pre-existing project-wide policy on
-- storage.objects that matches every bucket (a permissive `using (true)`, or one written for a
-- different bucket without a bucket_id predicate). That would silently expose this bucket. This
-- block does not change anything — it REPORTS, so whoever runs the migration sees it immediately.
do $$
declare
  r record;
  found boolean := false;
begin
  for r in
    select policyname, cmd, coalesce(qual, '') as using_expr, coalesce(with_check, '') as check_expr
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    -- A policy that never names a bucket applies to ALL of them, including this one.
    if position('bucket_id' in (r.using_expr || ' ' || r.check_expr)) = 0 then
      raise warning
        'animation-studio: storage.objects policy "%" (%) has no bucket_id predicate, so it may also grant access to the private animation-studio bucket. Review it.',
        r.policyname, r.cmd;
      found := true;
    elsif position('animation-studio' in (r.using_expr || ' ' || r.check_expr)) > 0 then
      raise warning
        'animation-studio: storage.objects policy "%" (%) explicitly references the animation-studio bucket. This migration does not create such a policy — review where it came from.',
        r.policyname, r.cmd;
      found := true;
    end if;
  end loop;

  if not found then
    raise notice 'animation-studio: no storage.objects policy grants access to this bucket — service-role only, as intended.';
  end if;
end $$;

-- Refresh PostgREST's schema cache so the new tables are visible to the REST API immediately.
notify pgrst, 'reload schema';
