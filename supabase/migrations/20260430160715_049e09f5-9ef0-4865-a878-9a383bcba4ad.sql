
-- Create a sequence starting after the current max
DO $$
DECLARE max_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'ORD-(\d+)') AS integer)), 10000)
  INTO max_num FROM public.orders;
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH %s', max_num + 1);
END $$;

-- Replace the trigger function to use the sequence
CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.order_number := 'ORD-' || nextval('public.order_number_seq');
  RETURN NEW;
END;
$function$;
