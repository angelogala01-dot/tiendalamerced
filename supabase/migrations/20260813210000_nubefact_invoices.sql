-- Comprobantes electrónicos emitidos vía Nubefact (boletas y facturas)

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_kind TEXT NOT NULL CHECK (document_kind IN ('boleta', 'factura')),
  serie TEXT,
  number INT,
  unique_code TEXT UNIQUE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  client_document_type TEXT,
  client_document_number TEXT,
  client_name TEXT,
  client_email TEXT,
  client_address TEXT,
  total_taxable DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_igv DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  sunat_accepted BOOLEAN,
  sunat_description TEXT,
  pdf_url TEXT,
  xml_url TEXT,
  cdr_url TEXT,
  qr TEXT,
  hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'issued', 'rejected', 'error')),
  error_message TEXT,
  request_payload JSONB,
  response_payload JSONB,
  issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sale ON public.invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON public.invoices(created_at DESC);

DROP TRIGGER IF EXISTS tr_invoices_updated ON public.invoices;
CREATE TRIGGER tr_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoices_staff ON public.invoices;
CREATE POLICY invoices_staff ON public.invoices FOR ALL USING (public.is_staff());

DROP POLICY IF EXISTS invoices_customer_read ON public.invoices;
CREATE POLICY invoices_customer_read ON public.invoices FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers WHERE user_id = auth.uid()
    )
    OR order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.customers c ON c.id = o.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

INSERT INTO public.permissions (code, name, module)
VALUES ('invoices.read', 'Ver comprobantes', 'invoices'),
       ('invoices.write', 'Emitir comprobantes', 'invoices')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'super_admin', id FROM public.permissions WHERE code LIKE 'invoices.%'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions WHERE code LIKE 'invoices.%'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'seller', id FROM public.permissions WHERE code LIKE 'invoices.%'
ON CONFLICT (role, permission_id) DO NOTHING;
