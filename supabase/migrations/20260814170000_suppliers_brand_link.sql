-- Marcas asociadas al proveedor que las envía, e índice en productos.
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_brands_supplier_id ON public.brands(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON public.products(supplier_id);
