-- ============================================================================
-- Add the 50 × 25 × 2 mm MS rectangular tube to the Material Master.
--
-- Used by the Cabin Design Calculator's internal MDF-lining support framing (spec §7) and the
-- company-standard 50 × 25 central roof ridge (spec §10). Purely ADDITIVE and fully idempotent:
-- it inserts the row only when the material_master table exists AND the key is not already present,
-- so it is safe to run more than once and never touches any existing row, policy, or rate history.
--
-- Mirrors seedMaterials.ts (rhs-50x25x2, 2.23 kg/m) byte-for-byte. Weight = (2t(a+b) − 4t²) × 0.00785.
-- ============================================================================

do $$
begin
  if to_regclass('public.material_master') is not null then
    insert into public.material_master
      (key, name, category, section_size, thickness_mm, grade, uom, unit_weight, weight_basis,
       stock_length_m, sheet_length_m, sheet_width_m, purchase_rate, rate_unit, wastage_percent, supplier)
    select
      'rhs-50x25x2', 'MS Rectangular Tube 50 × 25 × 2 mm', 'steel_section', '50 × 25 mm RHS', 2,
      'IS 4923 YSt 210', 'm', 2.23, 'kg_per_m', 6.0, NULL, NULL, 68, 'per_kg', 3, ''
    where not exists (select 1 from public.material_master where key = 'rhs-50x25x2');
  end if;
end $$;

notify pgrst, 'reload schema';
