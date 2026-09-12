-- Variantes de talla/color por producto. El stock del producto se sincroniza
-- con la suma de variantes activas cuando existen filas en product_variants.

CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE,
  size TEXT,
  color TEXT,
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  barcode TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_variant_has_option CHECK (
    NULLIF(BTRIM(COALESCE(size, '')), '') IS NOT NULL
    OR NULLIF(BTRIM(COALESCE(color, '')), '') IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variant_combo
  ON public.product_variants (product_id, COALESCE(size, ''), COALESCE(color, ''));

CREATE INDEX IF NOT EXISTS idx_product_variants_product
  ON public.product_variants(product_id);

CREATE INDEX IF NOT EXISTS idx_product_variants_barcode
  ON public.product_variants(barcode)
  WHERE barcode IS NOT NULL;

DROP TRIGGER IF EXISTS set_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER set_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.sync_product_stock_from_variants()
RETURNS TRIGGER AS $$
DECLARE
  pid UUID;
  total INT;
  has_any BOOLEAN;
BEGIN
  pid := COALESCE(NEW.product_id, OLD.product_id);
  SELECT EXISTS(SELECT 1 FROM public.product_variants WHERE product_id = pid) INTO has_any;
  IF NOT has_any THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(stock_quantity), 0) INTO total
  FROM public.product_variants
  WHERE product_id = pid AND is_active = true;

  UPDATE public.products SET stock_quantity = total WHERE id = pid;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_product_variant_stock ON public.product_variants;
CREATE TRIGGER on_product_variant_stock
  AFTER INSERT OR UPDATE OF stock_quantity, is_active, product_id OR DELETE
  ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock_from_variants();

CREATE OR REPLACE FUNCTION public.update_stock_on_sale_item()
RETURNS TRIGGER AS $$
DECLARE
  current_stock INT;
BEGIN
  IF NEW.variant_id IS NOT NULL THEN
    SELECT stock_quantity INTO current_stock
    FROM public.product_variants
    WHERE id = NEW.variant_id
    FOR UPDATE;

    IF current_stock IS NULL THEN
      RAISE EXCEPTION 'Variante no encontrada';
    END IF;
    IF current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para la talla/color seleccionada';
    END IF;

    UPDATE public.product_variants
    SET stock_quantity = current_stock - NEW.quantity
    WHERE id = NEW.variant_id;

    INSERT INTO public.inventory_movements (
      product_id, variant_id, movement_type, quantity, stock_before, stock_after, reference_type, reference_id
    )
    VALUES (
      NEW.product_id, NEW.variant_id, 'sale', NEW.quantity, current_stock, current_stock - NEW.quantity, 'sale', NEW.sale_id
    );
    RETURN NEW;
  END IF;

  SELECT stock_quantity INTO current_stock FROM public.products WHERE id = NEW.product_id FOR UPDATE;
  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Stock insuficiente para el producto %', NEW.product_id;
  END IF;
  UPDATE public.products SET stock_quantity = current_stock - NEW.quantity WHERE id = NEW.product_id;
  INSERT INTO public.inventory_movements (product_id, movement_type, quantity, stock_before, stock_after, reference_type, reference_id)
  VALUES (NEW.product_id, 'sale', NEW.quantity, current_stock, current_stock - NEW.quantity, 'sale', NEW.sale_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_variants_public_read ON public.product_variants;
CREATE POLICY product_variants_public_read ON public.product_variants FOR SELECT
  USING (
    is_active = true
    OR public.is_staff()
  );

DROP POLICY IF EXISTS product_variants_staff_write ON public.product_variants;
CREATE POLICY product_variants_staff_write ON public.product_variants FOR ALL
  USING (public.is_staff());
