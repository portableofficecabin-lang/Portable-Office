-- ============================================================================
-- Material Master rows for the PUF PANEL BOTTOM LOCKING SYSTEM (Labour Colony studio).
--
-- The locking system references its rates BY KEY through the existing Material Master — there is no
-- second rate source. These are the keys DEFAULT_PUF_LOCK_CONFIG points at that the 2026-07-13 seed
-- did not carry (ms-plate-10, anchor-bolt-m16, nut-m16, washer-m16, welding-electrode, epdm-strip-3,
-- sealant-silicone), plus the extra sizes the admin's Selects offer as real alternatives.
--
-- c-purlin-75x40, selfdrill-screw and primer-red-oxide already exist and are NOT touched.
--
-- Purely ADDITIVE and fully idempotent: rows are inserted only when the table exists AND the key is
-- not already present at ANY effective date, so re-running changes nothing and no existing row, rate
-- history, policy or admin edit is ever overwritten.
--
-- Mirrors src/lib/boq/seedMaterials.ts row-for-row. Unit weights:
--   lipped C section  kg/m  = (web + 2 × flange + 2 × lip) × t × 0.00785
--   MS plate          kg/m² = thickness_mm × 7.85
-- ============================================================================

do $$
begin
  if to_regclass('public.material_master') is not null then
    insert into public.material_master
      (key, name, category, section_size, thickness_mm, grade, uom, unit_weight, weight_basis,
       stock_length_m, sheet_length_m, sheet_width_m, purchase_rate, rate_unit, wastage_percent, supplier,
       effective_date, is_active)
    select v.key, v.name, v.category, v.section_size, v.thickness_mm, v.grade, v.uom, v.unit_weight,
           v.weight_basis, v.stock_length_m, v.sheet_length_m, v.sheet_width_m, v.purchase_rate,
           v.rate_unit, v.wastage_percent, v.supplier,
           -- Set EXPLICITLY rather than leaning on the column defaults: on a table created before the
           -- 2026-07-13 migration added them, `effective_date` / `is_active` were back-filled as
           -- NULLABLE with no default, and a NULL effective_date row is invisible to
           -- fetchMaterials(asOf) (which filters effective_date <= asOf) — the row would insert
           -- successfully and then never resolve a rate.
           current_date, true
    from (values
      -- ---- lipped C sections (kg/m) — the pocket-forming purlin pair ----
      ('c-purlin-100x50'::text, 'C-Purlin 100 × 50 × 2 mm'::text,   'steel_section'::text, 'C 100 × 50 mm'::text,   2::numeric,   'IS 811'::text,             'm'::text,   3.61::numeric,  'kg_per_m'::text,   6.0::numeric, NULL::numeric, NULL::numeric, 70::numeric,  'per_kg'::text,  3::numeric, ''::text),
      ('c-purlin-125x50',       'C-Purlin 125 × 50 × 2 mm',         'steel_section',       'C 125 × 50 mm',         2,            'IS 811',                   'm',         4.16,           'kg_per_m',         6.0,          NULL,          NULL,          70,           'per_kg',        3,          ''),
      ('c-purlin-150x65',       'C-Purlin 150 × 65 × 2.5 mm',       'steel_section',       'C 150 × 65 mm',         2.5,          'IS 811',                   'm',         6.28,           'kg_per_m',         6.0,          NULL,          NULL,          70,           'per_kg',        3,          ''),

      -- ---- plain MS plate stock (kg/m²) — the base / anchor plate ----
      ('ms-plate-6',            'MS Plate 6 mm',                    'sheet',               '6 mm MS plate',         6,            'IS 2062 E250',             'sqm',       47.10,          'kg_per_sqm',       NULL,         2.5,           1.25,          68,           'per_kg',        5,          ''),
      ('ms-plate-8',            'MS Plate 8 mm',                    'sheet',               '8 mm MS plate',         8,            'IS 2062 E250',             'sqm',       62.80,          'kg_per_sqm',       NULL,         2.5,           1.25,          66,           'per_kg',        5,          ''),
      ('ms-plate-10',           'MS Plate 10 mm',                   'sheet',               '10 mm MS plate',        10,           'IS 2062 E250',             'sqm',       78.50,          'kg_per_sqm',       NULL,         2.5,           1.25,          65,           'per_kg',        5,          ''),
      ('ms-plate-12',           'MS Plate 12 mm',                   'sheet',               '12 mm MS plate',        12,           'IS 2062 E250',             'sqm',       94.20,          'kg_per_sqm',       NULL,         2.5,           1.25,          65,           'per_kg',        5,          ''),
      ('ms-plate-16',           'MS Plate 16 mm',                   'sheet',               '16 mm MS plate',        16,           'IS 2062 E250',             'sqm',       125.60,         'kg_per_sqm',       NULL,         2.5,           1.25,          64,           'per_kg',        5,          ''),

      -- ---- holding-down set (nos) ----
      ('anchor-bolt-m12',       'Anchor Bolt M12 × 150 mm',         'hardware',            'M12 × 150 mm',          NULL,         '8.8 grade',                'nos',       0.13,           'kg_per_nos',       NULL,         NULL,          NULL,          55,           'per_nos',       2,          ''),
      ('anchor-bolt-m16',       'Anchor Bolt M16 × 200 mm',         'hardware',            'M16 × 200 mm',          NULL,         '8.8 grade',                'nos',       0.32,           'kg_per_nos',       NULL,         NULL,          NULL,          110,          'per_nos',       2,          ''),
      ('anchor-bolt-m20',       'Anchor Bolt M20 × 250 mm',         'hardware',            'M20 × 250 mm',          NULL,         '8.8 grade',                'nos',       0.62,           'kg_per_nos',       NULL,         NULL,          NULL,          210,          'per_nos',       2,          ''),
      ('nut-m12',               'Hex Nut M12',                      'hardware',            'M12',                   NULL,         'IS 1364 Gr 8',             'nos',       0.015,          'kg_per_nos',       NULL,         NULL,          NULL,          6,            'per_nos',       2,          ''),
      ('nut-m16',               'Hex Nut M16',                      'hardware',            'M16',                   NULL,         'IS 1364 Gr 8',             'nos',       0.034,          'kg_per_nos',       NULL,         NULL,          NULL,          12,           'per_nos',       2,          ''),
      ('nut-m20',               'Hex Nut M20',                      'hardware',            'M20',                   NULL,         'IS 1364 Gr 8',             'nos',       0.066,          'kg_per_nos',       NULL,         NULL,          NULL,          24,           'per_nos',       2,          ''),
      ('washer-m12',            'Plain Washer M12',                 'hardware',            'M12',                   NULL,         'IS 2016 Zn plated',        'nos',       0.006,          'kg_per_nos',       NULL,         NULL,          NULL,          3,            'per_nos',       2,          ''),
      ('washer-m16',            'Plain Washer M16',                 'hardware',            'M16',                   NULL,         'IS 2016 Zn plated',        'nos',       0.011,          'kg_per_nos',       NULL,         NULL,          NULL,          5,            'per_nos',       2,          ''),
      ('washer-m20',            'Plain Washer M20',                 'hardware',            'M20',                   NULL,         'IS 2016 Zn plated',        'nos',       0.017,          'kg_per_nos',       NULL,         NULL,          NULL,          8,            'per_nos',       2,          ''),

      -- ---- welding, sealing + isolation consumables ----
      ('welding-electrode',     'MS Welding Electrode 3.15 mm',     'misc',                '3.15 mm electrode',     3.15,         'IS 814 E6013',             'kg',        1.0,            'kg_per_nos',       NULL,         NULL,          NULL,          125,          'per_kg',        5,          ''),
      ('epdm-strip-3',          'EPDM Isolation Strip 3 × 50 mm',   'insulation',          '3 × 50 mm strip',       3,            'EPDM 60 Shore A',          'm',         0.18,           'kg_per_m',         NULL,         NULL,          NULL,          45,           'per_m',         5,          ''),
      ('sealant-silicone',      'Neutral-cure Silicone Sealant',    'finishing',           '6 × 6 mm bead',         NULL,         'ASTM C920',                'm',         0.04,           'kg_per_m',         NULL,         NULL,          NULL,          38,           'per_m',         8,          '')
    ) as v(key, name, category, section_size, thickness_mm, grade, uom, unit_weight, weight_basis,
           stock_length_m, sheet_length_m, sheet_width_m, purchase_rate, rate_unit, wastage_percent, supplier)
    where not exists (select 1 from public.material_master m where m.key = v.key);
  end if;
end $$;

notify pgrst, 'reload schema';
