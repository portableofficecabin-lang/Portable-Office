-- ═══════════════════════════════════════════════════════════════════════════════════════════
--  ROLLBACK for 20260824120000_construction_animation_studio.sql
--
--  ⚠  DESTRUCTIVE. THIS DELETES DATA. READ THIS HEADER BEFORE RUNNING A SINGLE LINE.
--
--  This file is deliberately OUTSIDE supabase/migrations/ so that `supabase db push` and every
--  other migration runner ignores it completely. It is a manual instrument, run by a human who
--  has decided to remove the Construction Animation Studio.
-- ═══════════════════════════════════════════════════════════════════════════════════════════
--
--  ── WHAT THIS REMOVES ──────────────────────────────────────────────────────────────────────
--    • every customer's uploaded exterior/interior photographs and reference images
--    • every generated scene clip and every exported 30-second film
--    • every project, storyboard, render job, version snapshot and revision comment
--    • the private `animation-studio` storage bucket
--    • the two functions and the triggers this feature created
--
--  Customers are told they can delete their own uploads. This deletes EVERYONE'S, including
--  projects a customer may be mid-way through and expects to resume. Treat it as you would
--  dropping any other production table.
--
--  ── WHAT THIS DOES NOT TOUCH ───────────────────────────────────────────────────────────────
--  Nothing outside the animation_* namespace. It does not reference products, orders,
--  quotations, enquiries, cart_items, the Merchant feed or checkout, and it does not drop the
--  SHARED helper `public.update_updated_at_column()` — other migrations (cabin_designs,
--  labour_colony_projects and more) install and depend on that same function, so dropping it
--  here would break tables that have nothing to do with this feature.
--
--  ── BEFORE YOU RUN IT ──────────────────────────────────────────────────────────────────────
--   1. Take a backup:  Supabase Dashboard → Database → Backups, or `pg_dump`.
--   2. Decide whether you actually want the DISABLE path below instead. Removing the provider
--      environment variables switches generation off with no data loss at all, and the workspace
--      then renders its "configuration required" state. That is reversible; this is not.
--   3. Confirm nothing is mid-render:
--        select status, count(*) from public.animation_render_jobs group by status;
--   4. Export anything worth keeping:
--        select * from public.animation_projects;
--        select * from public.animation_outputs;
--
--  ── THE REVERSIBLE ALTERNATIVE (recommended first) ─────────────────────────────────────────
--  Unset GEMINI_API_KEY / VIDEO_PROVIDER on the host. /api/animation-studio/config then reports
--  ready:false, every generate button disables itself with the reason, and not one row is lost.
--
--  ── HOW TO RUN ─────────────────────────────────────────────────────────────────────────────
--  Everything below is COMMENTED OUT. Uncomment deliberately, in the order given, after the
--  backup. Storage objects come first: dropping the tables loses the paths that tell you which
--  objects to delete, and orphaned objects in a bucket are invisible and billable.
-- ═══════════════════════════════════════════════════════════════════════════════════════════


-- ── STEP 1 — inspect what is about to be destroyed (SAFE, read-only; run this first) ────────

-- select
--   (select count(*) from public.animation_projects)          as projects,
--   (select count(*) from public.animation_assets)            as uploaded_images,
--   (select count(*) from public.animation_scenes)            as scenes,
--   (select count(*) from public.animation_render_jobs)       as render_jobs,
--   (select count(*) from public.animation_outputs)           as exported_files,
--   (select count(*) from public.animation_project_versions)  as versions,
--   (select count(*) from public.animation_project_comments)  as comments,
--   (select count(*) from storage.objects where bucket_id = 'animation-studio') as storage_objects;


-- ── STEP 2 — delete the stored files (do this BEFORE dropping the tables) ───────────────────
-- Removes every uploaded photograph, scene clip and exported film in the bucket.

-- delete from storage.objects where bucket_id = 'animation-studio';
-- delete from storage.buckets where id = 'animation-studio';


-- ── STEP 3 — drop the tables ────────────────────────────────────────────────────────────────
-- `cascade` here removes the foreign keys BETWEEN these tables and their own triggers, indexes
-- and policies. No table outside this list references any of them, so nothing else is reached.
-- Ordered children-first anyway, so the intent is legible even though cascade makes it moot.

-- drop table if exists public.animation_project_comments cascade;
-- drop table if exists public.animation_project_versions cascade;
-- drop table if exists public.animation_outputs          cascade;
-- drop table if exists public.animation_render_jobs      cascade;
-- drop table if exists public.animation_scenes           cascade;
-- drop table if exists public.animation_assets           cascade;
-- drop table if exists public.animation_projects         cascade;
-- drop table if exists public.animation_rate_limits      cascade;


-- ── STEP 4 — drop the functions this feature created ────────────────────────────────────────
-- ONLY these two. `public.update_updated_at_column()` is deliberately NOT dropped: it is shared
-- with cabin_designs, labour_colony_projects and others, and dropping it would break them.

-- drop function if exists public.animation_rate_limit_hit(text, integer, integer);
-- drop function if exists public.set_animation_project_public_id();


-- ── STEP 5 — refresh the API schema cache ───────────────────────────────────────────────────

-- notify pgrst, 'reload schema';


-- ── AFTER ROLLBACK ─────────────────────────────────────────────────────────────────────────
-- The application does NOT crash with these tables gone. Every studio route answers with
-- "the animation-studio database migration may not have been applied yet",
-- /api/animation-studio/config reports databaseReady:false and ready:false, and the workspace
-- renders its readiness panel. The service page itself — copy, FAQ, schema, CTAs — is entirely
-- static and is unaffected.
--
-- To also remove the feature from the site, delete these and rebuild:
--   app/(site)/products/home-construction/building-construction-contractor/
--   app/(site)/concept-animation/
--   app/api/animation-studio/
--   src/lib/animation/  src/components/animation-studio/
-- and revert the entries in app/sitemap.ts, next.config.ts and src/lib/site-navigation.ts.
