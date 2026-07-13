-- ─────────────────────────────────────────────────────────────────────────────────────────────
--  DRAWING SIGN-OFF — the names printed onto the labour-colony drawing sheet's sign-off strip.
--
--  Company-wide, not per-user: everyone authorised prints the same "Designed by / Checked by /
--  Structural Engineer / Licence" block, so it is stored ONCE and shared across every admin login
--  and every device. The browser keeps a localStorage copy only as an offline fallback/cache.
--
--  There is deliberately NO signature and NO stamp column, and there must never be one. The
--  "Signature & stamp" box on the sheet stays empty for a real engineer to sign and stamp. Storing
--  a generated signature would fabricate a professional sign-off on a drawing whose sizes come from
--  an ASSUMED bearing capacity — exactly what the NOT-FOR-CONSTRUCTION banner exists to prevent.
--
--  The issue DATE is intentionally not stored either: it defaults to today for each drawing. A
--  shared, remembered date would silently print a stale date on tomorrow's sheet.
--
--  Fully idempotent — safe to re-run. (This project has a history of migrations being committed but
--  never applied; see the manual checklist. Apply this in the Supabase SQL editor.)
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.drawing_sign_off (
  -- Singleton: exactly one row can ever exist, so there is one shared set of names.
  id               integer PRIMARY KEY DEFAULT 1,
  designed_by      text NOT NULL DEFAULT '',
  checked_by       text NOT NULL DEFAULT '',
  engineer_name    text NOT NULL DEFAULT '',
  engineer_licence text NOT NULL DEFAULT '',
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT drawing_sign_off_singleton CHECK (id = 1)
);

-- Seed the single row so the app can always UPDATE rather than branch on insert-vs-update.
INSERT INTO public.drawing_sign_off (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.drawing_sign_off ENABLE ROW LEVEL SECURITY;

-- Admin-only, read AND write. These names go onto a structural drawing; nobody unauthenticated or
-- non-admin has any business reading or changing them. No anon policy exists, so anon gets nothing.
DROP POLICY IF EXISTS "Admins can view drawing sign-off" ON public.drawing_sign_off;
CREATE POLICY "Admins can view drawing sign-off"
ON public.drawing_sign_off
FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update drawing sign-off" ON public.drawing_sign_off;
CREATE POLICY "Admins can update drawing sign-off"
ON public.drawing_sign_off
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- INSERT is allowed for admins purely so a fresh/restored database can self-heal the seed row.
DROP POLICY IF EXISTS "Admins can insert drawing sign-off" ON public.drawing_sign_off;
CREATE POLICY "Admins can insert drawing sign-off"
ON public.drawing_sign_off
FOR INSERT
WITH CHECK (public.is_admin());

-- Keep updated_at honest using the same trigger function the rest of the schema uses.
DROP TRIGGER IF EXISTS update_drawing_sign_off_updated_at ON public.drawing_sign_off;
CREATE TRIGGER update_drawing_sign_off_updated_at
BEFORE UPDATE ON public.drawing_sign_off
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
