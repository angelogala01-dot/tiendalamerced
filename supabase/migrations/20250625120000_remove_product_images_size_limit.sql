-- Quitar límite de tamaño en bucket de imágenes de productos
UPDATE storage.buckets
SET file_size_limit = NULL
WHERE id = 'product-images';
