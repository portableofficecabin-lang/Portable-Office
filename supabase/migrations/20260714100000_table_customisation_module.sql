-- ─────────────────────────────────────────────────────────────────────────────────────────────
--  TABLE CUSTOMISATION MODULE  (Cabin Design Calculator → Furniture → Tables)
--
--  Three things live here:
--
--   1. `cabin_table_types`     — the admin-editable CATALOGUE of table types. Spec §24 requires the
--                                admin to be able to add a NEW TABLE TYPE WITHOUT CHANGING CODE, so
--                                the catalogue cannot live only in TypeScript. The app ships a
--                                built-in catalogue (tableTypes.ts) as the offline fallback and the
--                                seed for this table — exactly the pattern material_master already
--                                uses with SEED_MATERIALS.
--
--   2. `cabin_table_clearances`— the admin-editable minimum clearance rules (spec §15).
--                                A single-row settings table, keyed by `scope` so a future per-branch
--                                or per-product ruleset needs no schema change.
--
--   3. Furniture rows INSERTed into the existing `material_master` — boards, laminates, edge bands,
--      steel profiles, partition screens, hardware, accessories, chairs, table electricals and
--      furniture labour. Spec §23: "Do not hardcode rates inside the calculator." Every ₹ and every
--      kg the table BOQ uses is read from here.
--
--  Fully idempotent — safe to re-run.
--
--  ⚠ APPLY IT. This project has a history of migrations being committed but never applied (which
--  surfaces as PGRST204 / "schema cache" errors at runtime). Apply via the Supabase SQL editor or
--  `supabase db push`. The application degrades gracefully if you do NOT: every read falls back to
--  the built-in catalogue and the seed rates, so the calculator keeps working — it just ignores any
--  admin catalogue edits until the table exists.
-- ─────────────────────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────────────────────
--  1. TABLE TYPE CATALOGUE  (spec §24)
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cabin_table_types (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stable business key referenced by CabinTable.tableTypeId, e.g. "executive".
  key                 text NOT NULL,
  label               text NOT NULL,
  short_label         text NOT NULL DEFAULT '',
  grp                 text NOT NULL DEFAULT 'Desks',   -- Desks | Meeting | Workstations | Reception & Pantry | Special

  -- Allowed shapes (jsonb array of TableShape ids) + the default one.
  shapes              jsonb NOT NULL DEFAULT '["rectangle"]'::jsonb,
  default_shape       text NOT NULL DEFAULT 'rectangle',

  -- Standard size presets (spec §5): [{ id, label, lengthMm, depthMm, heightMm, diameterMm?, seats? }]
  presets             jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Defaults applied when the customer adds one of these.
  default_support_id  text NOT NULL DEFAULT 'ms-legs-4',
  default_material_key text NOT NULL DEFAULT 'board-prelam-18',
  default_accessories jsonb NOT NULL DEFAULT '[]'::jsonb,

  seating_model       text NOT NULL DEFAULT 'single',  -- single | perimeter | workstation | counter | none
  -- Which type-specific editor blocks to reveal: ["workstation"|"conference"|"reception"|"wallMount"]
  panels              jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Drawing symbol hint (spec §24: "Default drawing symbol").
  symbol              text NOT NULL DEFAULT 'desk',

  -- Commercials the admin can tune per type. NULL ⇒ fall back to the Material Master / global.
  margin_percent      numeric,
  gst_percent         numeric,
  wastage_percent     numeric,

  sort_order          integer NOT NULL DEFAULT 100,
  is_active           boolean NOT NULL DEFAULT true,
  notes               text NOT NULL DEFAULT '',

  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Reconcile columns when an older/partial version already exists.
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS key                  text;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS label                text;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS short_label          text;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS grp                  text;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS shapes               jsonb;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS default_shape        text;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS presets              jsonb;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS default_support_id   text;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS default_material_key text;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS default_accessories  jsonb;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS seating_model        text;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS panels               jsonb;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS symbol               text;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS margin_percent       numeric;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS gst_percent          numeric;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS wastage_percent      numeric;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS sort_order           integer;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS is_active            boolean;
ALTER TABLE public.cabin_table_types ADD COLUMN IF NOT EXISTS notes                text;

CREATE UNIQUE INDEX IF NOT EXISTS cabin_table_types_key_idx ON public.cabin_table_types (key);
CREATE INDEX IF NOT EXISTS cabin_table_types_active_idx ON public.cabin_table_types (is_active, sort_order);

ALTER TABLE public.cabin_table_types ENABLE ROW LEVEL SECURITY;

-- Admins manage the catalogue. Unlike material_master (which holds PURCHASE RATES and is therefore
-- admin-only), the catalogue itself carries no commercially sensitive figure — it is the list of
-- products on offer — so it is readable by anyone. The public calculator needs it to render the
-- "Add Table" menu, and it is served to an anonymous homepage visitor.
DROP POLICY IF EXISTS "Admins manage cabin table types" ON public.cabin_table_types;
CREATE POLICY "Admins manage cabin table types" ON public.cabin_table_types
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Anyone can read active cabin table types" ON public.cabin_table_types;
CREATE POLICY "Anyone can read active cabin table types" ON public.cabin_table_types
  FOR SELECT USING (is_active = true);

GRANT SELECT ON public.cabin_table_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cabin_table_types TO authenticated;

DROP TRIGGER IF EXISTS update_cabin_table_types_updated_at ON public.cabin_table_types;
CREATE TRIGGER update_cabin_table_types_updated_at BEFORE UPDATE ON public.cabin_table_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ─────────────────────────────────────────────────────────────────────────────────────────────
--  2. CLEARANCE RULES  (spec §15 — "Allow the admin to edit the default clearance rules")
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cabin_table_clearances (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope                     text NOT NULL DEFAULT 'default',

  chair_movement_mm         integer NOT NULL DEFAULT 900,
  walking_passage_mm        integer NOT NULL DEFAULT 750,
  main_passage_mm           integer NOT NULL DEFAULT 1000,
  table_from_wall_mm        integer NOT NULL DEFAULT 50,
  seated_table_from_wall_mm integer NOT NULL DEFAULT 900,
  drawer_opening_mm         integer NOT NULL DEFAULT 600,
  door_swing_margin_mm      integer NOT NULL DEFAULT 100,
  workstation_aisle_mm      integer NOT NULL DEFAULT 900,

  updated_by                uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cabin_table_clearances_scope_idx ON public.cabin_table_clearances (scope);

ALTER TABLE public.cabin_table_clearances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage table clearances" ON public.cabin_table_clearances;
CREATE POLICY "Admins manage table clearances" ON public.cabin_table_clearances
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- The customer's own collision warnings are computed against these, so the public calculator reads them.
DROP POLICY IF EXISTS "Anyone can read table clearances" ON public.cabin_table_clearances;
CREATE POLICY "Anyone can read table clearances" ON public.cabin_table_clearances
  FOR SELECT USING (true);

GRANT SELECT ON public.cabin_table_clearances TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cabin_table_clearances TO authenticated;

DROP TRIGGER IF EXISTS update_cabin_table_clearances_updated_at ON public.cabin_table_clearances;
CREATE TRIGGER update_cabin_table_clearances_updated_at BEFORE UPDATE ON public.cabin_table_clearances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.cabin_table_clearances (scope) VALUES ('default')
ON CONFLICT (scope) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────────────────────
--  3. FURNITURE MATERIALS → material_master
--
--  IDENTICAL keys/values to src/lib/boq/furnitureMaterials.ts (FURNITURE_MATERIALS). The two lists
--  are the same data in two places on purpose: the TS one is the offline fallback that lets the
--  BOQ price a table with no DB at all, this one is what the admin actually edits. Keep them in sync.
--
--  Idempotent on (key, effective_date) — the same conflict target material_master already uses, so
--  a rate revision is a NEW effective-dated row and old quotations stay reproducible.
--
--  Engine contract (see src/lib/boq/engine.ts + validate.ts):
--    a LINEAR take-off line (legs, rails, edge band, cable tray, conduit)  ⇒ weight_basis kg_per_m
--    an AREA line   (tops, laminate, partition screens, powder coating)    ⇒ weight_basis kg_per_sqm
--    a COUNT line   (hardware, accessories, chairs, labour man-hours)      ⇒ kg_per_nos, or none for
--                                                                            category 'misc' labour
-- ─────────────────────────────────────────────────────────────────────────────────────────────

INSERT INTO public.material_master
  (key, name, category, section_size, thickness_mm, grade, uom, unit_weight, weight_basis,
   stock_length_m, sheet_length_m, sheet_width_m, purchase_rate, rate_unit, wastage_percent,
   supplier, effective_date)
VALUES
  -- tabletop boards (AREA ⇒ kg_per_sqm)
  ('board-prelam-18',    'Prelaminated Particle Board 18 mm', 'board', '18 mm prelam PB',   18,  'IS 3087',      'sqm', 11.70, 'kg_per_sqm', NULL, 2.44, 1.22, 1850, 'per_sheet', 8,  '', '2026-07-13'),
  ('board-prelam-25',    'Prelaminated Particle Board 25 mm', 'board', '25 mm prelam PB',   25,  'IS 3087',      'sqm', 16.25, 'kg_per_sqm', NULL, 2.44, 1.22, 2450, 'per_sheet', 8,  '', '2026-07-13'),
  ('board-mdf-18',       'MDF Board 18 mm',                   'board', '18 mm MDF',         18,  'IS 14587',     'sqm', 13.50, 'kg_per_sqm', NULL, 2.44, 1.22, 1650, 'per_sheet', 8,  '', '2026-07-13'),
  ('board-hdhmr-18',     'HDHMR Board 18 mm',                 'board', '18 mm HDHMR',       18,  'IS 3087 HD',   'sqm', 14.40, 'kg_per_sqm', NULL, 2.44, 1.22, 2900, 'per_sheet', 8,  '', '2026-07-13'),
  ('board-ply-18',       'Commercial Plywood 18 mm',          'board', '18 mm ply',         18,  'MR IS 303',    'sqm', 10.80, 'kg_per_sqm', NULL, 2.44, 1.22, 2400, 'per_sheet', 8,  '', '2026-07-13'),
  ('board-marineply-18', 'Marine Plywood 18 mm',              'board', '18 mm marine ply',  18,  'BWP IS 710',   'sqm', 11.70, 'kg_per_sqm', NULL, 2.44, 1.22, 3200, 'per_sheet', 8,  '', '2026-07-13'),
  ('board-wpc-18',       'WPC Board 18 mm',                   'board', '18 mm WPC',         18,  'IS 17425',     'sqm', 12.60, 'kg_per_sqm', NULL, 2.44, 1.22, 2800, 'per_sheet', 6,  '', '2026-07-13'),
  ('board-pvc-18',       'PVC Board 18 mm',                   'board', '18 mm PVC foam',    18,  'IS 17425',     'sqm',  9.90, 'kg_per_sqm', NULL, 2.44, 1.22, 2600, 'per_sheet', 6,  '', '2026-07-13'),
  ('board-solidwood-25', 'Solid Wood Top 25 mm',              'board', '25 mm hardwood',    25,  'Seasoned',     'sqm', 17.50, 'kg_per_sqm', NULL, NULL, NULL, 2200, 'per_sqm',   12, '', '2026-07-13'),

  -- non-board tops (AREA)
  ('top-ss304-1.2',   'Stainless Steel Top 1.2 mm (SS 304)', 'sheet', '1.2 mm SS 304',   1.2, 'SS 304',     'sqm',  9.52, 'kg_per_sqm', NULL, 2.44, 1.22, 1450, 'per_sqm', 6,  '', '2026-07-13'),
  ('top-ms-2',        'Mild Steel Top 2 mm',                 'sheet', '2 mm MS plate',   2,   'IS 2062',    'sqm', 15.70, 'kg_per_sqm', NULL, 2.44, 1.22,  850, 'per_sqm', 6,  '', '2026-07-13'),
  ('top-granite-18',  'Granite Top 18 mm',                   'board', '18 mm granite',   18,  'Polished',   'sqm', 48.60, 'kg_per_sqm', NULL, NULL, NULL, 1800, 'per_sqm', 12, '', '2026-07-13'),
  ('top-quartz-20',   'Engineered Quartz Top 20 mm',         'board', '20 mm quartz',    20,  'Engineered', 'sqm', 48.00, 'kg_per_sqm', NULL, NULL, NULL, 3500, 'per_sqm', 12, '', '2026-07-13'),
  ('top-glass-12',    'Toughened Glass Top 12 mm',           'board', '12 mm toughened', 12,  'IS 2553',    'sqm', 30.00, 'kg_per_sqm', NULL, NULL, NULL, 2400, 'per_sqm', 10, '', '2026-07-13'),

  -- surface finish (AREA)
  ('laminate-1mm',     'Decorative Laminate 1 mm', 'finishing', '1 mm laminate', 1,    'IS 2046',  'sqm', 1.40, 'kg_per_sqm', NULL, 2.44, 1.22, 1250, 'per_sheet', 8, '', '2026-07-13'),
  ('powdercoat-60mic', 'Powder Coating 60 micron', 'finishing', '60 micron',     NULL, 'IS 13871', 'sqm', 0.12, 'kg_per_sqm', NULL, NULL, NULL,  180, 'per_sqm',   5, '', '2026-07-13'),

  -- edge band (LINEAR ⇒ kg_per_m) + adhesive
  ('edgeband-pvc-2',   'PVC Edge Band 2 mm',       'hardware',  '2 mm x 22 mm',   2,   'PVC',    'm',   0.020, 'kg_per_m', NULL, NULL, NULL,  12, 'per_m',   5, '', '2026-07-13'),
  ('edgeband-pvc-0.8', 'PVC Edge Band 0.8 mm',     'hardware',  '0.8 mm x 22 mm', 0.8, 'PVC',    'm',   0.010, 'kg_per_m', NULL, NULL, NULL,   6, 'per_m',   5, '', '2026-07-13'),
  ('adhesive-sr',      'Synthetic Resin Adhesive', 'finishing', 'SR adhesive',    NULL, 'IS 848', 'ltr', 1.0,   'none',     NULL, NULL, NULL, 280, 'per_ltr', 5, '', '2026-07-13'),

  -- table frame profiles (LINEAR)
  ('shs-25x25x2',    'MS Square Tube 25 x 25 x 2 mm',      'steel_section', '25 x 25 mm SHS',    2,   'IS 4923 YSt 210', 'm', 1.44, 'kg_per_m', 6.0, NULL, NULL,  68, 'per_kg', 3, '', '2026-07-13'),
  ('rhs-60x40x2',    'MS Rectangular Tube 60 x 40 x 2 mm', 'steel_section', '60 x 40 mm RHS',    2,   'IS 4923 YSt 210', 'm', 3.01, 'kg_per_m', 6.0, NULL, NULL,  68, 'per_kg', 3, '', '2026-07-13'),
  ('ms-flat-50x6',   'MS Flat 50 x 6 mm',                  'steel_section', '50 x 6 mm flat',    6,   'IS 2062 E250',    'm', 2.36, 'kg_per_m', 6.0, NULL, NULL,  65, 'per_kg', 3, '', '2026-07-13'),
  ('ss-pipe-50x25',  'SS Rectangular Pipe 50 x 25 x 1.2',  'steel_section', '50 x 25 mm SS',     1.2, 'SS 304',          'm', 1.35, 'kg_per_m', 6.0, NULL, NULL, 320, 'per_kg', 4, '', '2026-07-13'),
  ('alu-profile-40', 'Aluminium Profile 40 x 40 mm',       'steel_section', '40 x 40 mm alu',    2,   'AL 6063',         'm', 0.86, 'kg_per_m', 6.0, NULL, NULL, 290, 'per_kg', 4, '', '2026-07-13'),
  ('cable-tray-100', 'Cable Tray 100 mm (under-desk)',     'steel_section', '100 mm CRCA tray',  1.2, 'CRCA powder ctd', 'm', 1.20, 'kg_per_m', 3.0, NULL, NULL, 280, 'per_m',  5, '', '2026-07-13'),

  -- workstation partition screens (AREA)
  ('partition-fabric-40', 'Fabric Partition Screen 40 mm', 'panel', '40 mm fabric panel', 40, 'Fabric + PB',  'sqm',  6.50, 'kg_per_sqm', NULL, NULL, NULL, 1450, 'per_sqm', 6, '', '2026-07-13'),
  ('partition-glass-8',   'Glass Partition Screen 8 mm',   'panel', '8 mm toughened',     8,  'IS 2553',      'sqm', 20.00, 'kg_per_sqm', NULL, NULL, NULL, 1900, 'per_sqm', 8, '', '2026-07-13'),
  ('partition-acrylic-5', 'Acrylic Partition Screen 5 mm', 'panel', '5 mm acrylic',       5,  'Cast acrylic', 'sqm',  5.95, 'kg_per_sqm', NULL, NULL, NULL, 1600, 'per_sqm', 8, '', '2026-07-13'),

  -- hardware (COUNT)
  ('hw-drawer-channel',  'Drawer Channel (telescopic, pair)', 'hardware', '450 mm pair', NULL, 'Zn plated',  'nos', 0.90, 'kg_per_nos', NULL, NULL, NULL, 380, 'per_nos', 2, '', '2026-07-13'),
  ('hw-hinge-softclose', 'Soft-close Hinge',                  'hardware', '35 mm cup',   NULL, 'Nickel',     'nos', 0.12, 'kg_per_nos', NULL, NULL, NULL, 120, 'per_nos', 2, '', '2026-07-13'),
  ('hw-lock-cam',        'Cam Lock',                          'hardware', '20 mm cam',   NULL, 'Zn alloy',   'nos', 0.08, 'kg_per_nos', NULL, NULL, NULL, 180, 'per_nos', 2, '', '2026-07-13'),
  ('hw-handle-ss',       'SS Cabinet Handle 128 mm',          'hardware', '128 mm CC',   NULL, 'SS 304',     'nos', 0.10, 'kg_per_nos', NULL, NULL, NULL, 150, 'per_nos', 2, '', '2026-07-13'),
  ('hw-leveller',        'Adjustable Leveller',               'hardware', 'M8 x 30 mm',  NULL, 'Nylon + MS', 'nos', 0.04, 'kg_per_nos', NULL, NULL, NULL,  35, 'per_nos', 2, '', '2026-07-13'),
  ('hw-castor-50',       'Castor Wheel 50 mm',                'hardware', '50 mm twin',  NULL, 'Nylon',      'nos', 0.09, 'kg_per_nos', NULL, NULL, NULL,  65, 'per_nos', 2, '', '2026-07-13'),
  ('hw-grommet',         'Cable Grommet 60 mm',               'hardware', '60 mm dia',   NULL, 'ABS',        'nos', 0.05, 'kg_per_nos', NULL, NULL, NULL,  90, 'per_nos', 2, '', '2026-07-13'),
  ('hw-connector',       'Knock-down Connector (minifix)',    'hardware', '15 mm',       NULL, 'Zn alloy',   'nos', 0.02, 'kg_per_nos', NULL, NULL, NULL,   8, 'per_nos', 5, '', '2026-07-13'),
  ('hw-bracket-wall',    'Wall-mount Bracket (heavy duty)',   'hardware', '300 mm arm',  NULL, 'MS powder',  'nos', 1.20, 'kg_per_nos', NULL, NULL, NULL, 450, 'per_nos', 2, '', '2026-07-13'),
  ('hw-bracket-fold',    'Folding Bracket (lock-type)',       'hardware', '300 mm fold', NULL, 'MS powder',  'nos', 1.45, 'kg_per_nos', NULL, NULL, NULL, 650, 'per_nos', 2, '', '2026-07-13'),
  ('hw-nameplate',       'Acrylic Name Plate',                'hardware', '200 x 50 mm', NULL, 'Acrylic',    'nos', 0.15, 'kg_per_nos', NULL, NULL, NULL, 450, 'per_nos', 0, '', '2026-07-13'),

  -- accessories (COUNT)
  ('acc-pedestal-3d',    'Mobile Pedestal - 3 drawer',       'hardware',   '400x450x600',  NULL, 'Prelam PB', 'nos', 22.0, 'kg_per_nos', NULL, NULL, NULL, 6500, 'per_nos', 3, '', '2026-07-13'),
  ('acc-pedestal-4d',    'Mobile Pedestal - 4 drawer',       'hardware',   '400x450x700',  NULL, 'Prelam PB', 'nos', 26.0, 'kg_per_nos', NULL, NULL, NULL, 7800, 'per_nos', 3, '', '2026-07-13'),
  ('acc-pedestal-fixed', 'Fixed Pedestal - 3 drawer',        'hardware',   '400x450x650',  NULL, 'Prelam PB', 'nos', 24.0, 'kg_per_nos', NULL, NULL, NULL, 6200, 'per_nos', 3, '', '2026-07-13'),
  ('acc-keyboard-tray',  'Keyboard Tray (sliding)',          'hardware',   '600 x 300 mm', NULL, 'MS + PB',   'nos',  3.2, 'kg_per_nos', NULL, NULL, NULL,  850, 'per_nos', 2, '', '2026-07-13'),
  ('acc-cpu-holder',     'CPU Holder (adjustable)',          'hardware',   'Adjustable',   NULL, 'MS powder', 'nos',  2.8, 'kg_per_nos', NULL, NULL, NULL, 1200, 'per_nos', 2, '', '2026-07-13'),
  ('acc-footrest',       'Footrest (adjustable)',            'hardware',   '450 x 350 mm', NULL, 'MS + ABS',  'nos',  2.4, 'kg_per_nos', NULL, NULL, NULL,  700, 'per_nos', 2, '', '2026-07-13'),
  ('acc-power-manager',  'Power Manager (4 socket + 2 USB)', 'electrical', '4S + 2USB',    NULL, 'BIS',       'nos',  1.1, 'kg_per_nos', NULL, NULL, NULL, 2400, 'per_nos', 0, '', '2026-07-13'),
  ('acc-popup-box',      'Pop-up Power Box (6 module)',      'electrical', '6 module',     NULL, 'BIS',       'nos',  1.8, 'kg_per_nos', NULL, NULL, NULL, 3200, 'per_nos', 0, '', '2026-07-13'),
  ('acc-floor-box',      'Floor Box (4 module)',             'electrical', '4 module',     NULL, 'BIS',       'nos',  2.2, 'kg_per_nos', NULL, NULL, NULL, 2800, 'per_nos', 0, '', '2026-07-13'),

  -- chairs (COUNT)
  ('chair-task',       'Task Chair (mesh, revolving)',   'hardware', 'Mesh back',   NULL, 'BIFMA', 'nos', 11.0, 'kg_per_nos', NULL, NULL, NULL, 4500, 'per_nos', 0, '', '2026-07-13'),
  ('chair-visitor',    'Visitor Chair (fixed)',          'hardware', 'Fixed frame', NULL, 'BIFMA', 'nos',  7.5, 'kg_per_nos', NULL, NULL, NULL, 2200, 'per_nos', 0, '', '2026-07-13'),
  ('chair-executive',  'Executive Chair (high back)',    'hardware', 'High back',   NULL, 'BIFMA', 'nos', 16.0, 'kg_per_nos', NULL, NULL, NULL, 8500, 'per_nos', 0, '', '2026-07-13'),
  ('chair-conference', 'Conference Chair (medium back)', 'hardware', 'Medium back', NULL, 'BIFMA', 'nos', 12.0, 'kg_per_nos', NULL, NULL, NULL, 5500, 'per_nos', 0, '', '2026-07-13'),

  -- table electricals
  ('elec-socket-5a',  'Socket 5A (modular)',    'electrical', '5A modular',     NULL, 'BIS',     'nos', 0.15, 'kg_per_nos', NULL, NULL, NULL, 380, 'per_nos', 0, '', '2026-07-13'),
  ('elec-socket-16a', 'Socket 16A (modular)',   'electrical', '16A modular',    NULL, 'BIS',     'nos', 0.22, 'kg_per_nos', NULL, NULL, NULL, 520, 'per_nos', 0, '', '2026-07-13'),
  ('elec-usb-point',  'USB Charging Point',     'electrical', '2-port USB',     NULL, 'BIS',     'nos', 0.12, 'kg_per_nos', NULL, NULL, NULL, 650, 'per_nos', 0, '', '2026-07-13'),
  ('elec-data-point', 'Data Point (RJ11)',      'electrical', 'RJ11',           NULL, 'BIS',     'nos', 0.10, 'kg_per_nos', NULL, NULL, NULL, 450, 'per_nos', 0, '', '2026-07-13'),
  ('elec-lan-point',  'LAN Point (RJ45 Cat 6)', 'electrical', 'RJ45 Cat 6',     NULL, 'BIS',     'nos', 0.10, 'kg_per_nos', NULL, NULL, NULL, 480, 'per_nos', 0, '', '2026-07-13'),
  ('elec-hdmi-point', 'HDMI Point',             'electrical', 'HDMI faceplate', NULL, 'BIS',     'nos', 0.14, 'kg_per_nos', NULL, NULL, NULL, 900, 'per_nos', 0, '', '2026-07-13'),
  ('elec-conduit-25', 'PVC Conduit 25 mm',      'electrical', '25 mm',          NULL, 'IS 9537', 'm',   0.18, 'kg_per_m',   3.0,  NULL, NULL,  45, 'per_m',   6, '', '2026-07-13'),

  -- furniture labour (COUNT; qty = MAN-HOURS, rate = ₹/hour; category 'misc' ⇒ no unit weight required)
  ('lab-board-cutting', 'Labour - board cutting & sizing',  'misc', 'man-hour', NULL, 'Skilled',      'nos', NULL, 'none', NULL, NULL, NULL, 320, 'per_nos', 0, '', '2026-07-13'),
  ('lab-edge-banding',  'Labour - edge banding',            'misc', 'man-hour', NULL, 'Skilled',      'nos', NULL, 'none', NULL, NULL, NULL, 300, 'per_nos', 0, '', '2026-07-13'),
  ('lab-carpentry',     'Labour - carpentry & assembly',    'misc', 'man-hour', NULL, 'Carpenter',    'nos', NULL, 'none', NULL, NULL, NULL, 450, 'per_nos', 0, '', '2026-07-13'),
  ('lab-welding',       'Labour - welding',                 'misc', 'man-hour', NULL, 'Welder',       'nos', NULL, 'none', NULL, NULL, NULL, 480, 'per_nos', 0, '', '2026-07-13'),
  ('lab-grinding',      'Labour - grinding & finishing',    'misc', 'man-hour', NULL, 'Semi-skilled', 'nos', NULL, 'none', NULL, NULL, NULL, 320, 'per_nos', 0, '', '2026-07-13'),
  ('lab-electrical',    'Labour - electrical installation', 'misc', 'man-hour', NULL, 'Electrician',  'nos', NULL, 'none', NULL, NULL, NULL, 400, 'per_nos', 0, '', '2026-07-13'),
  ('lab-site-install',  'Labour - site installation',       'misc', 'man-hour', NULL, 'Skilled',      'nos', NULL, 'none', NULL, NULL, NULL, 350, 'per_nos', 0, '', '2026-07-13')
ON CONFLICT (key, effective_date) DO NOTHING;
