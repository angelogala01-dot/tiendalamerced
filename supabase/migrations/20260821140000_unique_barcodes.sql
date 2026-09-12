-- Códigos de barras únicos para el escáner de Caja.
-- Vacío se guarda como NULL; duplicados existentes se limpian (queda el más antiguo).

UPDATE public.products
SET barcode = NULLIF(BTRIM(barcode), '')
WHERE barcode IS NOT NULL;

UPDATE public.product_variants
SET barcode = NULLIF(BTRIM(barcode), '')
WHERE barcode IS NOT NULL;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY barcode ORDER BY created_at, id) AS rn
  FROM public.products
  WHERE barcode IS NOT NULL
)
UPDATE public.products p
SET barcode = NULL
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY barcode ORDER BY created_at, id) AS rn
  FROM public.product_variants
  WHERE barcode IS NOT NULL
)
UPDATE public.product_variants v
SET barcode = NULL
FROM ranked r
WHERE v.id = r.id AND r.rn > 1;

-- Cruce producto ↔ variante: si choca, gana el producto y se limpia la variante.
UPDATE public.product_variants v
SET barcode = NULL
FROM public.products p
WHERE v.barcode IS NOT NULL
  AND p.barcode IS NOT NULL
  AND v.barcode = p.barcode;

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_barcode
  ON public.products (barcode)
  WHERE barcode IS NOT NULL;

DROP INDEX IF EXISTS idx_product_variants_barcode;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_barcode
  ON public.product_variants (barcode)
  WHERE barcode IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_and_guard_barcode()
RETURNS TRIGGER AS $$
DECLARE
  code TEXT;
BEGIN
  code := NULLIF(BTRIM(COALESCE(NEW.barcode, '')), '');
  NEW.barcode := code;
  IF code IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'products' THEN
    IF EXISTS (SELECT 1 FROM public.product_variants WHERE barcode = code) THEN
      RAISE EXCEPTION 'El código de barras % ya está usado en una talla/color', code
        USING ERRCODE = '23505';
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.products WHERE barcode = code) THEN
      RAISE EXCEPTION 'El código de barras % ya está usado en un producto', code
        USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_products_barcode ON public.products;
CREATE TRIGGER trg_products_barcode
  BEFORE INSERT OR UPDATE OF barcode ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.normalize_and_guard_barcode();

DROP TRIGGER IF EXISTS trg_product_variants_barcode ON public.product_variants;
CREATE TRIGGER trg_product_variants_barcode
  BEFORE INSERT OR UPDATE OF barcode ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.normalize_and_guard_barcode();
