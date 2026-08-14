-- RBAC, Portal Cliente (carrito/favoritos), Auditoría y SEO

-- Nuevo rol super_admin
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';

-- Slug SEO para productos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug) WHERE slug IS NOT NULL;

-- Permisos RBAC
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

-- Carrito (clientes autenticados o sesión anónima)
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cart_owner CHECK (user_id IS NOT NULL OR session_id IS NOT NULL),
  UNIQUE (user_id, product_id),
  UNIQUE (session_id, product_id)
);

-- Favoritos
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- Auditoría administrativa
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Configuración general
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Escalación chatbot → atención humana
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS escalated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Permisos semilla
INSERT INTO public.permissions (code, name, module) VALUES
  ('products.read', 'Ver productos', 'products'),
  ('products.write', 'Gestionar productos', 'products'),
  ('categories.read', 'Ver categorías', 'categories'),
  ('categories.write', 'Gestionar categorías', 'categories'),
  ('inventory.read', 'Ver inventario', 'inventory'),
  ('inventory.write', 'Gestionar inventario', 'inventory'),
  ('sales.read', 'Ver ventas', 'sales'),
  ('sales.write', 'Registrar ventas', 'sales'),
  ('orders.read', 'Ver pedidos', 'orders'),
  ('orders.write', 'Gestionar pedidos', 'orders'),
  ('customers.read', 'Ver clientes', 'customers'),
  ('customers.write', 'Gestionar clientes', 'customers'),
  ('users.read', 'Ver usuarios', 'users'),
  ('users.write', 'Gestionar usuarios', 'users'),
  ('reports.read', 'Ver reportes', 'reports'),
  ('promotions.write', 'Gestionar promociones', 'promotions'),
  ('settings.write', 'Configuración general', 'settings'),
  ('chatbot.manage', 'Gestionar chatbot', 'chatbot')
ON CONFLICT (code) DO NOTHING;

-- Asignación de permisos por rol
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'super_admin', id FROM public.permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions
WHERE code NOT IN ('users.write', 'settings.write')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'seller', id FROM public.permissions
WHERE code IN ('products.read', 'categories.read', 'sales.read', 'sales.write', 'customers.read', 'customers.write', 'orders.read')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'warehouse', id FROM public.permissions
WHERE code IN ('products.read', 'inventory.read', 'inventory.write', 'orders.read')
ON CONFLICT DO NOTHING;

-- RLS nuevas tablas
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permisos lectura staff" ON public.permissions FOR SELECT USING (public.is_staff());
CREATE POLICY "Role permissions staff" ON public.role_permissions FOR SELECT USING (public.is_staff());

CREATE POLICY "Carrito propio usuario" ON public.cart_items FOR ALL
  USING (user_id = auth.uid());
CREATE POLICY "Carrito sesión anónima lectura" ON public.cart_items FOR SELECT
  USING (session_id IS NOT NULL);

CREATE POLICY "Favoritos propios" ON public.favorites FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Auditoría solo admin" ON public.audit_logs FOR SELECT
  USING (public.get_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "Staff inserta auditoría" ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_staff());

CREATE POLICY "Settings lectura staff" ON public.app_settings FOR SELECT USING (public.is_staff());
CREATE POLICY "Settings escritura super admin" ON public.app_settings FOR ALL
  USING (public.get_user_role() = 'super_admin');

-- Actualizar is_staff para super_admin
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager', 'seller', 'warehouse')
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_permission(perm_code TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.role_permissions rp ON rp.role = p.role
    JOIN public.permissions perm ON perm.id = rp.permission_id
    WHERE p.id = auth.uid() AND perm.code = perm_code
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Configuración inicial
INSERT INTO public.app_settings (key, value, description) VALUES
  ('company', '{"name":"Multiservicios La Merced PyK S.A.C.","phone":"","email":"","address":""}', 'Datos de la empresa'),
  ('store', '{"currency":"PEN","tax_rate":18}', 'Configuración de tienda')
ON CONFLICT (key) DO NOTHING;
