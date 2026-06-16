
-- Drop the foreign key and change product_id to text to support local product IDs
ALTER TABLE public.cart_items DROP CONSTRAINT cart_items_product_id_fkey;
ALTER TABLE public.cart_items ALTER COLUMN product_id TYPE text USING product_id::text;

-- Also fix order_items product_id to text
ALTER TABLE public.order_items ALTER COLUMN product_id TYPE text USING product_id::text;
