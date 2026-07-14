-- ─────────────────────────────────────────────────────────────────────────────────────────────
--  MATERIAL MASTER + BOQ TEMPLATES
--
--  The Material BOQ calculator (cabin + labour colony) must NEVER hard-code a weight or a rate.
--  Every kg/m, every kg/m², every ₹ and every wastage % is read from `material_master` at
--  calculation time. A material with a NULL unit_weight or NULL purchase_rate does not silently
--  fall back to a guess — the engine raises a validation ERROR and prices the line at zero, so a
--  half-configured master can never quietly produce a wrong quotation.
--
--  RATE HISTORY, not rate mutation: a rate change is a NEW ROW with a later `effective_date`, and
--  the engine picks the latest row per `key` whose effective_date <= today. That keeps old
--  quotations reproducible. The unique index is therefore on (key, effective_date), not on key.
--
--  Fully idempotent — safe to re-run. (This project has a history of migrations being committed
--  but never applied; apply this in the Supabase SQL editor or via `supabase db push`.)
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.material_master (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stable business key referenced by every take-off item, e.g. "rhs-100x50x3".
  key            text NOT NULL,
  name           text NOT NULL,
  category       text NOT NULL DEFAULT 'misc',

  -- Section / profile
  section_size   text NOT NULL DEFAULT '',
  thickness_mm   numeric,
  grade          text NOT NULL DEFAULT '',

  -- Unit of measurement shown on the BOQ line
  uom            text NOT NULL DEFAULT 'nos',

  -- Unit weight. NULL is legal at entry time but raises a validation error when USED.
  unit_weight    numeric,
  weight_basis   text NOT NULL DEFAULT 'none',   -- kg_per_m | kg_per_sqm | kg_per_nos | none

  -- Purchasing standards
  stock_length_m numeric,       -- steel bars
  sheet_length_m numeric,       -- sheets / panels
  sheet_width_m  numeric,

  -- Money
  purchase_rate  numeric,
  rate_unit      text NOT NULL DEFAULT 'per_nos',
  wastage_percent numeric NOT NULL DEFAULT 5,

  supplier       text NOT NULL DEFAULT '',
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active      boolean NOT NULL DEFAULT true,
  notes          text NOT NULL DEFAULT '',

  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Reconcile columns when an older/partial version of the table already exists.
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS key             text;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS name            text;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS category        text;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS section_size    text;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS thickness_mm    numeric;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS grade           text;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS uom             text;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS unit_weight     numeric;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS weight_basis    text;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS stock_length_m  numeric;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS sheet_length_m  numeric;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS sheet_width_m   numeric;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS purchase_rate   numeric;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS rate_unit       text;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS wastage_percent numeric;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS supplier        text;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS effective_date  date;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS is_active       boolean;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS notes           text;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS created_by      uuid;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS created_at      timestamptz;
ALTER TABLE public.material_master ADD COLUMN IF NOT EXISTS updated_at      timestamptz;

-- One row per (key, effective_date): a rate revision is a new row, so history is preserved and
-- an old quotation can always be re-priced at the rate that was live on its own date.
CREATE UNIQUE INDEX IF NOT EXISTS material_master_key_effective_uidx
  ON public.material_master (key, effective_date);
CREATE INDEX IF NOT EXISTS material_master_category_idx ON public.material_master (category);
CREATE INDEX IF NOT EXISTS material_master_active_idx   ON public.material_master (is_active);

ALTER TABLE public.material_master ENABLE ROW LEVEL SECURITY;

-- Purchase rates and supplier names are commercially sensitive: admin-only, read AND write.
-- There is deliberately no anon/public SELECT policy (unlike the legacy `cabin_material_rates`).
DROP POLICY IF EXISTS "Admins manage material master" ON public.material_master;
CREATE POLICY "Admins manage material master" ON public.material_master
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_master TO authenticated;

DROP TRIGGER IF EXISTS update_material_master_updated_at ON public.material_master;
CREATE TRIGGER update_material_master_updated_at BEFORE UPDATE ON public.material_master
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─────────────────────────────────────────────────────────────────────────────────────────────
--  BOQ TEMPLATES — saved material/norm/charge sets per product family. (spec §8)
--  `data` holds the whole BoqSettings object (norms, materialMap, charges, gst, disabledSections),
--  so adding a settings field never needs a migration.
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.boq_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  kind        text NOT NULL DEFAULT 'ms_cabin',   -- ms_cabin | puf_cabin | container | labour_colony
  description text NOT NULL DEFAULT '',
  is_default  boolean NOT NULL DEFAULT false,
  data        jsonb NOT NULL DEFAULT '{}'::jsonb, -- BoqSettings
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boq_templates ADD COLUMN IF NOT EXISTS name        text;
ALTER TABLE public.boq_templates ADD COLUMN IF NOT EXISTS kind        text;
ALTER TABLE public.boq_templates ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.boq_templates ADD COLUMN IF NOT EXISTS is_default  boolean;
ALTER TABLE public.boq_templates ADD COLUMN IF NOT EXISTS data        jsonb;
ALTER TABLE public.boq_templates ADD COLUMN IF NOT EXISTS created_by  uuid;
ALTER TABLE public.boq_templates ADD COLUMN IF NOT EXISTS created_at  timestamptz;
ALTER TABLE public.boq_templates ADD COLUMN IF NOT EXISTS updated_at  timestamptz;

CREATE INDEX IF NOT EXISTS boq_templates_kind_idx ON public.boq_templates (kind);
-- At most one default per kind.
CREATE UNIQUE INDEX IF NOT EXISTS boq_templates_default_uidx
  ON public.boq_templates (kind) WHERE is_default;

ALTER TABLE public.boq_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage boq templates" ON public.boq_templates;
CREATE POLICY "Admins manage boq templates" ON public.boq_templates
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boq_templates TO authenticated;

DROP TRIGGER IF EXISTS update_boq_templates_updated_at ON public.boq_templates;
CREATE TRIGGER update_boq_templates_updated_at BEFORE UPDATE ON public.boq_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─────────────────────────────────────────────────────────────────────────────────────────────
--  SEED — the example materials from the spec. Idempotent on (key, effective_date).
--  These are STARTING values for the admin to edit in the Material Master screen, not constants
--  in code. Unit weights are the standard tabulated values for the section
--  (hollow section: kg/m = (2t(a+b) - 4t²) × 0.00785 ; sheet: kg/m² = t_mm × 7.85).
-- ─────────────────────────────────────────────────────────────────────────────────────────────

INSERT INTO public.material_master
  (key, name, category, section_size, thickness_mm, grade, uom, unit_weight, weight_basis,
   stock_length_m, sheet_length_m, sheet_width_m, purchase_rate, rate_unit, wastage_percent, supplier)
VALUES
  -- ---- steel sections (kg/m) ----
  ('rhs-100x50x3',  'MS Rectangular Tube 100 × 50 × 3 mm', 'steel_section', '100 × 50 mm RHS', 3,   'IS 4923 YSt 210', 'm', 6.71, 'kg_per_m', 6.0, NULL, NULL, 68,  'per_kg', 3, ''),
  ('shs-50x50x2',   'MS Square Tube 50 × 50 × 2 mm',        'steel_section', '50 × 50 mm SHS',  2,   'IS 4923 YSt 210', 'm', 2.95, 'kg_per_m', 6.0, NULL, NULL, 68,  'per_kg', 3, ''),
  ('shs-50x50x3',   'MS Square Tube 50 × 50 × 3 mm',        'steel_section', '50 × 50 mm SHS',  3,   'IS 4923 YSt 210', 'm', 4.29, 'kg_per_m', 6.0, NULL, NULL, 68,  'per_kg', 3, ''),
  ('shs-40x40x2',   'MS Square Tube 40 × 40 × 2 mm',        'steel_section', '40 × 40 mm SHS',  2,   'IS 4923 YSt 210', 'm', 2.32, 'kg_per_m', 6.0, NULL, NULL, 68,  'per_kg', 3, ''),
  ('ismc-100x50',   'MS C-Channel ISMC 100 × 50',           'steel_section', 'ISMC 100 × 50',   6,   'IS 2062 E250',    'm', 9.56, 'kg_per_m', 6.0, NULL, NULL, 65,  'per_kg', 3, ''),
  ('c-purlin-75x40','C-Purlin 75 × 40 × 2 mm',              'steel_section', 'C 75 × 40 mm',    2,   'IS 811',          'm', 2.90, 'kg_per_m', 6.0, NULL, NULL, 70,  'per_kg', 3, ''),
  ('angle-50x50x5', 'MS Angle 50 × 50 × 5 mm',              'steel_section', 'MS Angle 50 × 50 mm', 5, 'IS 2062 E250',  'm', 3.80, 'kg_per_m', 6.0, NULL, NULL, 65,  'per_kg', 3, ''),
  ('angle-40x40x5', 'MS Angle 40 × 40 × 5 mm',              'steel_section', 'MS Angle 40 × 40 mm', 5, 'IS 2062 E250',  'm', 2.90, 'kg_per_m', 6.0, NULL, NULL, 65,  'per_kg', 3, ''),
  ('pipe-od48x2',   'MS Pipe OD 48 × 2 mm (handrail)',      'steel_section', 'Pipe OD 48 mm',   2,   'IS 1239',         'm', 2.27, 'kg_per_m', 6.0, NULL, NULL, 72,  'per_kg', 5, ''),

  -- ---- sheets / panels (kg/m²) ----
  ('sheet-ext-gi-0.8',  'External GI Sheet 0.8 mm',      'sheet',      'GI profiled sheet',   0.8, 'GI 120 GSM',  'sqm', 6.28,  'kg_per_sqm', NULL, 3.0, 1.0, 92,   'per_sqm', 6, ''),
  ('sheet-int-ppgi-0.5','Internal PPGI Wall Sheet 0.5 mm','sheet',     'PPGI plain sheet',    0.5, 'PPGI RAL9002','sqm', 3.93,  'kg_per_sqm', NULL, 3.0, 1.0, 78,   'per_sqm', 6, ''),
  ('sheet-roof-0.5',    'Roofing Sheet 0.5 mm (trapezoidal)','sheet',  'Trapezoidal profile', 0.5, 'PPGL AZ150',  'sqm', 4.30,  'kg_per_sqm', NULL, 3.0, 1.05, 88,  'per_sqm', 8, ''),
  ('sheet-ceiling-0.5', 'Ceiling Sheet 0.5 mm',           'sheet',     'PPGI plain sheet',    0.5, 'PPGI RAL9010','sqm', 3.93,  'kg_per_sqm', NULL, 3.0, 1.0, 76,   'per_sqm', 6, ''),
  ('chequered-plate-4', 'MS Chequered Plate 4 mm',        'sheet',     'Chequered plate',     4,   'IS 3502',     'sqm', 33.40, 'kg_per_sqm', NULL, 2.5, 1.25, 78,  'per_kg', 5, ''),
  ('puf-panel-50',      'PUF Sandwich Panel 50 mm',       'panel',     '50 mm PUF panel',     50,  'PUF 40 kg/m³','sqm', 9.85,  'kg_per_sqm', NULL, 3.0, 1.15, 1150,'per_sqm', 5, ''),

  -- ---- insulation / boards / finishes ----
  ('glasswool-50',   'Glass Wool Insulation 50 mm',   'insulation',   '50 mm blanket',   50, '24 kg/m³',   'sqm', 1.20,  'kg_per_sqm', NULL, 15.0, 1.2, 95,  'per_sqm', 8, ''),
  ('cementboard-18', 'Cement / Bison Board 18 mm',    'board',        '18 mm board',     18, 'IS 14276',   'sqm', 23.40, 'kg_per_sqm', NULL, 2.44, 1.22, 320, 'per_sqm', 8, ''),
  ('ply-board-18',   'Flooring Board — Marine Ply 18 mm','board',     '18 mm ply',       18, 'BWP IS 710', 'sqm', 11.50, 'kg_per_sqm', NULL, 2.44, 1.22, 285, 'per_sqm', 8, ''),
  ('vinyl-2mm',      'Vinyl Flooring 2 mm',           'floor_finish', '2 mm vinyl roll',  2, 'IS 3462',    'sqm', 1.80,  'kg_per_sqm', NULL, 20.0, 2.0, 155, 'per_sqm', 6, ''),

  -- ---- openings ----
  ('door-ms-flush',   'MS Flush Door 900 × 2100 mm', 'door',   '0.9 × 2.1 m',  NULL, 'MS 18G skin', 'nos', 28,  'kg_per_nos', NULL, NULL, NULL, 7500,  'per_nos', 0, ''),
  ('door-frame-40x40','Door Frame — 40 × 40 SHS',    'steel_section','40 × 40 mm SHS', 2, 'IS 4923', 'm',   2.32,'kg_per_m',   6.0,  NULL, NULL, 68,    'per_kg', 5, ''),
  ('window-slider',   'Aluminium Sliding Window',    'window', '1.2 × 1.2 m',  NULL, '2-track',     'nos', 18,  'kg_per_nos', NULL, NULL, NULL, 3500,  'per_nos', 0, ''),
  ('window-frame-40x40','Window Frame — 40 × 40 SHS','steel_section','40 × 40 mm SHS', 2, 'IS 4923', 'm',   2.32,'kg_per_m',   6.0,  NULL, NULL, 68,    'per_kg', 5, ''),
  ('window-grill',    'MS Window Grill 12 mm sq bar','hardware','12 mm square bar',12, 'IS 2062',    'sqm', 11.30,'kg_per_sqm',NULL, NULL, NULL, 78,    'per_kg', 5, ''),

  -- ---- hardware / fixings ----
  ('bolt-m12',   'Nut Bolt M12 assembly',       'hardware', 'M12 × 50 mm', NULL, '8.8 grade',  'nos', 0.09, 'kg_per_nos', NULL, NULL, NULL, 22,  'per_nos', 2, ''),
  ('selfdrill-screw','Self-drilling Screw w/ washer','hardware','12 × 50 mm', NULL, 'Zn plated','nos', 0.01, 'kg_per_nos', NULL, NULL, NULL, 3.5, 'per_nos', 5, ''),

  -- ---- electrical ----
  ('elec-led-panel',  'LED Panel Light 18 W',     'electrical', '18 W', NULL, 'BIS', 'nos', 0.6, 'kg_per_nos', NULL, NULL, NULL, 800,  'per_nos', 0, ''),
  ('elec-fan',        'Ceiling Fan 1200 mm',      'electrical', '1200 mm sweep', NULL, 'BIS','nos', 4.5, 'kg_per_nos', NULL, NULL, NULL, 2500, 'per_nos', 0, ''),
  ('elec-socket',     'Socket / Plug Point 6A',   'electrical', '6A modular', NULL, 'BIS', 'nos', 0.2, 'kg_per_nos', NULL, NULL, NULL, 450,  'per_nos', 0, ''),
  ('elec-switch',     'Switch Board (modular)',   'electrical', '4-module', NULL, 'BIS',   'nos', 0.3, 'kg_per_nos', NULL, NULL, NULL, 650,  'per_nos', 0, ''),
  ('elec-wire-1.5',   'Copper Wire 1.5 sq mm',    'electrical', '1.5 sq mm FR', NULL, 'IS 694','m', 0.02,'kg_per_m',  NULL, NULL, NULL, 18,   'per_m',   5, ''),
  ('elec-db',         'Distribution Board 8-way', 'electrical', '8-way DB', NULL, 'IS 8623','nos', 3.2, 'kg_per_nos', NULL, NULL, NULL, 4200, 'per_nos', 0, ''),

  -- ---- plumbing ----
  ('plumb-wc',        'EWC / Indian WC pan',     'plumbing', 'Ceramic', NULL, 'IS 2556', 'nos', 18,  'kg_per_nos', NULL, NULL, NULL, 3800, 'per_nos', 0, ''),
  ('plumb-washbasin', 'Wash Basin',              'plumbing', 'Ceramic', NULL, 'IS 2556', 'nos', 12,  'kg_per_nos', NULL, NULL, NULL, 2200, 'per_nos', 0, ''),
  ('plumb-cpvc-25',   'CPVC Pipe 25 mm',         'plumbing', '25 mm',   NULL, 'IS 15778','m',   0.35,'kg_per_m',   3.0,  NULL, NULL, 145,  'per_m',   8, ''),
  ('plumb-pvc-110',   'PVC Soil Pipe 110 mm',    'plumbing', '110 mm',  NULL, 'IS 13592','m',   1.60,'kg_per_m',   3.0,  NULL, NULL, 320,  'per_m',   8, ''),

  -- ---- finishing ----
  ('primer-red-oxide','Red Oxide Primer',        'finishing', '1 coat', NULL, 'IS 2074', 'ltr', 1.0, 'none', NULL, NULL, NULL, 240, 'per_ltr', 5, ''),
  ('enamel-paint',    'Synthetic Enamel Paint',  'finishing', '2 coats', NULL, 'IS 2932','ltr', 1.0, 'none', NULL, NULL, NULL, 380, 'per_ltr', 5, '')
ON CONFLICT (key, effective_date) DO NOTHING;

-- Refresh PostgREST schema cache so the REST API sees the new tables immediately.
NOTIFY pgrst, 'reload schema';
