-- Añadir columna tax a pedidos
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tax DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Bucket de imágenes de productos (idempotente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  NULL,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = NULL,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de storage
DROP POLICY IF EXISTS product_images_public_read ON storage.objects;
CREATE POLICY product_images_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS product_images_staff_insert ON storage.objects;
CREATE POLICY product_images_staff_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND public.is_staff());

DROP POLICY IF EXISTS product_images_staff_update ON storage.objects;
CREATE POLICY product_images_staff_update ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND public.is_staff());

DROP POLICY IF EXISTS product_images_staff_delete ON storage.objects;
CREATE POLICY product_images_staff_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND public.is_staff());

-- Actualizar settings de tienda con envío
UPDATE public.app_settings
SET value = value || '{"shipping_flat": 15, "free_shipping_min": 200}'::jsonb
WHERE key = 'store'
  AND NOT (value ? 'shipping_flat');
