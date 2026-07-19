-- ============================================================================
-- Sheet LAP / layout properties for the Material Master (spec §12–§14).
--
-- Adds the optional effective-cover-width, side-lap, end-lap and standard-length columns a sheet
-- material needs to switch from the plain area count to a row-by-row lapped layout. Purely ADDITIVE
-- and idempotent (add-column-if-not-exists), guarded so it is a no-op until material_master exists.
-- Every column is nullable with no default, so existing rows and BOQs are completely unaffected —
-- the lapped layout only activates once an admin sets a side-lap or end-lap on a material.
-- ============================================================================

do $$
begin
  if to_regclass('public.material_master') is not null then
    alter table public.material_master add column if not exists cover_width_m     numeric;
    alter table public.material_master add column if not exists side_lap_m        numeric;
    alter table public.material_master add column if not exists end_lap_m         numeric;
    alter table public.material_master add column if not exists standard_length_m numeric;
  end if;
end $$;

notify pgrst, 'reload schema';
