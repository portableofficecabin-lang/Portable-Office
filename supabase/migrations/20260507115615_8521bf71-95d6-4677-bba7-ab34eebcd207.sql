
-- Function to seed material_stock from opening_stock
CREATE OR REPLACE FUNCTION public.seed_material_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_factory uuid;
BEGIN
  IF NEW.opening_stock IS NULL OR NEW.opening_stock = 0 THEN
    RETURN NEW;
  END IF;
  SELECT id INTO default_factory FROM public.factories WHERE is_active = true ORDER BY code LIMIT 1;
  IF default_factory IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.material_stock (material_id, factory_id, current_stock)
  VALUES (NEW.id, default_factory, NEW.opening_stock)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_material_stock ON public.materials;
CREATE TRIGGER trg_seed_material_stock
AFTER INSERT ON public.materials
FOR EACH ROW
EXECUTE FUNCTION public.seed_material_stock();

-- Backfill existing materials with no stock entry
INSERT INTO public.material_stock (material_id, factory_id, current_stock)
SELECT m.id,
       (SELECT id FROM public.factories WHERE is_active=true ORDER BY code LIMIT 1),
       m.opening_stock
FROM public.materials m
WHERE m.opening_stock > 0
  AND NOT EXISTS (SELECT 1 FROM public.material_stock ms WHERE ms.material_id = m.id)
  AND EXISTS (SELECT 1 FROM public.factories WHERE is_active=true);
