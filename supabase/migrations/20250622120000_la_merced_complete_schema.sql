-- =============================================================================
-- La Merced PyK — Esquema completo (ejecutar en Supabase SQL Editor si DB vacía)
-- Proyecto: idbzttrtzmhrlwsomphz
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM (
  'super_admin', 'admin', 'manager', 'seller', 'warehouse', 'customer'
);

CREATE TYPE order_status AS ENUM (
  'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
);

CREATE TYPE sale_status AS ENUM ('completed', 'cancelled', 'refunded');

CREATE TYPE payment_method AS ENUM (
  'cash', 'card', 'transfer', 'yape', 'plin', 'other'
);

CREATE TYPE inventory_movement_type AS ENUM (
  'entry', 'exit', 'adjustment', 'sale', 'return'
);

CREATE TYPE notification_type AS ENUM (
  'order', 'stock', 'promotion', 'system'
);

-- -----------------------------------------------------------------------------
-- Funciones auxiliares
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.slugify(text TEXT)
RETURNS TEXT AS $$
  SELECT lower(regexp_replace(regexp_replace(trim($1), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'));
$$ LANGUAGE sql IMMUTABLE;

-- -----------------------------------------------------------------------------
-- Perfiles (extiende auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- -----------------------------------------------------------------------------
-- RBAC
-- -----------------------------------------------------------------------------
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.role_permissions (
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

-- -----------------------------------------------------------------------------
-- Catálogo
-- -----------------------------------------------------------------------------
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  sale_price DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  min_stock INT NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  unit TEXT NOT NULL DEFAULT 'und',
  barcode TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_brand ON public.products(brand_id);
CREATE INDEX idx_products_active ON public.products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);

CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_images_product ON public.product_images(product_id);

-- -----------------------------------------------------------------------------
-- Clientes
-- -----------------------------------------------------------------------------
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document_type TEXT DEFAULT 'DNI',
  document_number TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  loyalty_points INT NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_user ON public.customers(user_id);
CREATE INDEX idx_customers_document ON public.customers(document_number);
CREATE INDEX idx_customers_email ON public.customers(email);

-- -----------------------------------------------------------------------------
-- Portal cliente: carrito y favoritos
-- -----------------------------------------------------------------------------
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cart_owner CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE UNIQUE INDEX uq_cart_user_product ON public.cart_items(user_id, product_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX uq_cart_session_product ON public.cart_items(session_id, product_id) WHERE session_id IS NOT NULL;

CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- -----------------------------------------------------------------------------
-- Inventario
-- -----------------------------------------------------------------------------
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  movement_type inventory_movement_type NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  stock_before INT NOT NULL,
  stock_after INT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_product ON public.inventory_movements(product_id);
CREATE INDEX idx_inventory_created ON public.inventory_movements(created_at DESC);

-- -----------------------------------------------------------------------------
-- Ventas POS
-- -----------------------------------------------------------------------------
CREATE SEQUENCE sale_number_seq START 1;
CREATE SEQUENCE order_number_seq START 1;

CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  status sale_status NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_created ON public.sales(created_at DESC);

CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL,
  discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Pedidos e-commerce
-- -----------------------------------------------------------------------------
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  status order_status NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_method payment_method,
  shipping_address TEXT,
  shipping_city TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Promociones, chat, notificaciones, configuración
-- -----------------------------------------------------------------------------
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(12, 2) NOT NULL CHECK (discount_value >= 0),
  min_purchase DECIMAL(12, 2) DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);

CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL DEFAULT 'web',
  is_active BOOLEAN NOT NULL DEFAULT true,
  escalated BOOLEAN NOT NULL DEFAULT false,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.faq_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  keywords TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
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

CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Triggers updated_at
-- -----------------------------------------------------------------------------
CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_categories_updated BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_brands_updated BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_suppliers_updated BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_cart_updated BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_sales_updated BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_promotions_updated BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_chat_conv_updated BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_faq_updated BEFORE UPDATE ON public.faq_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Perfil automático al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role user_role;
BEGIN
  assigned_role := COALESCE(
    NULLIF(NEW.raw_app_meta_data->>'role', '')::user_role,
    'customer'
  );
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    assigned_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Números de venta y pedido
CREATE OR REPLACE FUNCTION public.generate_sale_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sale_number IS NULL OR NEW.sale_number = '' THEN
    NEW.sale_number := 'V-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(nextval('sale_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sale_number BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.generate_sale_number();

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'P-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(nextval('order_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- Stock al vender
CREATE OR REPLACE FUNCTION public.update_stock_on_sale_item()
RETURNS TRIGGER AS $$
DECLARE
  current_stock INT;
BEGIN
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

CREATE TRIGGER on_sale_item_insert
  AFTER INSERT ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_on_sale_item();

-- Historial de pedidos al cambiar estado
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (order_id, status, notes)
    VALUES (NEW.id, NEW.status, 'Cambio automático de estado');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- -----------------------------------------------------------------------------
-- RLS helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

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
    SELECT 1 FROM public.profiles p
    JOIN public.role_permissions rp ON rp.role = p.role
    JOIN public.permissions perm ON perm.id = rp.permission_id
    WHERE p.id = auth.uid() AND perm.code = perm_code
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_staff());
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE
  USING (id = auth.uid());
CREATE POLICY profiles_staff_all ON public.profiles FOR ALL
  USING (public.get_user_role() IN ('super_admin', 'admin'));

-- Catálogo público (lectura) + staff (escritura)
CREATE POLICY categories_public_read ON public.categories FOR SELECT
  USING (is_active = true OR public.is_staff());
CREATE POLICY categories_staff_write ON public.categories FOR ALL
  USING (public.is_staff());

CREATE POLICY brands_public_read ON public.brands FOR SELECT
  USING (is_active = true OR public.is_staff());
CREATE POLICY brands_staff_write ON public.brands FOR ALL
  USING (public.is_staff());

CREATE POLICY suppliers_staff ON public.suppliers FOR ALL
  USING (public.is_staff());

CREATE POLICY products_public_read ON public.products FOR SELECT
  USING (is_active = true OR public.is_staff());
CREATE POLICY products_staff_write ON public.products FOR ALL
  USING (public.is_staff());

CREATE POLICY product_images_public_read ON public.product_images FOR SELECT USING (true);
CREATE POLICY product_images_staff ON public.product_images FOR ALL USING (public.is_staff());

-- Clientes
CREATE POLICY customers_staff ON public.customers FOR ALL USING (public.is_staff());
CREATE POLICY customers_self ON public.customers FOR SELECT USING (user_id = auth.uid());

-- Carrito y favoritos
CREATE POLICY cart_own ON public.cart_items FOR ALL USING (user_id = auth.uid());
CREATE POLICY favorites_own ON public.favorites FOR ALL USING (user_id = auth.uid());

-- Operaciones internas
CREATE POLICY inventory_staff ON public.inventory_movements FOR ALL USING (public.is_staff());
CREATE POLICY sales_staff ON public.sales FOR ALL USING (public.is_staff());
CREATE POLICY sale_items_staff ON public.sale_items FOR ALL USING (public.is_staff());
CREATE POLICY orders_staff ON public.orders FOR ALL USING (public.is_staff());
CREATE POLICY orders_customer_read ON public.orders FOR SELECT
  USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));
CREATE POLICY order_items_staff ON public.order_items FOR ALL USING (public.is_staff());
CREATE POLICY order_items_customer ON public.order_items FOR SELECT
  USING (order_id IN (
    SELECT o.id FROM public.orders o
    JOIN public.customers c ON c.id = o.customer_id WHERE c.user_id = auth.uid()
  ));
CREATE POLICY order_history_staff ON public.order_status_history FOR ALL USING (public.is_staff());

CREATE POLICY promotions_public ON public.promotions FOR SELECT
  USING (is_active = true AND now() BETWEEN start_date AND end_date);
CREATE POLICY promotions_staff ON public.promotions FOR ALL USING (public.is_staff());

CREATE POLICY chat_staff ON public.chat_conversations FOR ALL USING (public.is_staff());
CREATE POLICY chat_messages_staff ON public.chat_messages FOR ALL USING (public.is_staff());
CREATE POLICY faq_public ON public.faq_entries FOR SELECT USING (is_active = true);
CREATE POLICY faq_staff ON public.faq_entries FOR ALL USING (public.is_staff());
CREATE POLICY notifications_own ON public.notifications FOR ALL USING (user_id = auth.uid());
CREATE POLICY permissions_staff ON public.permissions FOR SELECT USING (public.is_staff());
CREATE POLICY role_permissions_staff ON public.role_permissions FOR SELECT USING (public.is_staff());
CREATE POLICY audit_admin ON public.audit_logs FOR SELECT
  USING (public.get_user_role() IN ('super_admin', 'admin'));
CREATE POLICY audit_insert ON public.audit_logs FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY settings_read ON public.app_settings FOR SELECT USING (public.is_staff());
CREATE POLICY settings_write ON public.app_settings FOR ALL
  USING (public.get_user_role() = 'super_admin');

-- -----------------------------------------------------------------------------
-- Datos semilla
-- -----------------------------------------------------------------------------
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
  ('chatbot.manage', 'Gestionar chatbot', 'chatbot');

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'super_admin', id FROM public.permissions;
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions WHERE code NOT IN ('users.write', 'settings.write');
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'manager', id FROM public.permissions WHERE code NOT IN ('users.write', 'settings.write');
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'seller', id FROM public.permissions
WHERE code IN ('products.read','categories.read','sales.read','sales.write','customers.read','customers.write','orders.read');
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'warehouse', id FROM public.permissions
WHERE code IN ('products.read','inventory.read','inventory.write','orders.read');

INSERT INTO public.app_settings (key, value, description) VALUES
  ('company', '{"name":"Multiservicios La Merced PyK S.A.C.","phone":"","email":"","address":""}', 'Empresa'),
  ('store', '{"currency":"PEN","tax_rate":18}', 'Tienda');

INSERT INTO public.categories (name, slug, description, sort_order) VALUES
  ('Calzado', 'calzado', 'Zapatos, zapatillas y sandalias', 1),
  ('Ropa', 'ropa', 'Prendas de vestir para toda la familia', 2),
  ('Accesorios', 'accesorios', 'Complementos y accesorios', 3);

INSERT INTO public.brands (name, slug) VALUES
  ('Genérico', 'generico'),
  ('Nike', 'nike'),
  ('Adidas', 'adidas'),
  ('Puma', 'puma');

INSERT INTO public.faq_entries (question, answer, category, keywords, sort_order) VALUES
  ('¿Cuáles son los horarios?', 'Lunes a sábado de 9:00 a.m. a 8:00 p.m.', 'general', ARRAY['horario'], 1),
  ('¿Hacen delivery?', 'Sí, entregas en la ciudad. Rastrea tu pedido con el número de orden.', 'pedidos', ARRAY['delivery','envío'], 2),
  ('¿Métodos de pago?', 'Efectivo, tarjetas, Yape, Plin y transferencias.', 'pagos', ARRAY['pago','yape','plin'], 3);

INSERT INTO public.promotions (name, description, discount_type, discount_value, min_purchase, start_date, end_date) VALUES
  ('Bienvenida 10%', '10% de descuento en tu primera compra', 'percentage', 10, 50,
   now(), now() + interval '90 days');

-- Productos de ejemplo
INSERT INTO public.products (sku, slug, name, description, category_id, brand_id, cost_price, sale_price, stock_quantity, min_stock)
SELECT
  v.sku, v.slug, v.name, v.description,
  c.id, b.id, v.cost, v.price, v.stock, v.min_stock
FROM (VALUES
  ('CAL-001', 'zapatilla-urbana-negra', 'Zapatilla urbana negra', 'Zapatilla cómoda uso diario', 'calzado', 'generico', 45.00, 89.90, 25, 5),
  ('CAL-002', 'zapatilla-deportiva-blanca', 'Zapatilla deportiva blanca', 'Ideal para caminar y gym', 'calzado', 'nike', 80.00, 159.90, 15, 5),
  ('ROP-001', 'polo-algodon-azul', 'Polo algodón azul', 'Polo 100% algodón talla M-L', 'ropa', 'generico', 22.00, 45.00, 40, 10),
  ('ROP-002', 'jeans-slim-fit', 'Jeans slim fit', 'Jeans azul oscuro', 'ropa', 'adidas', 55.00, 99.90, 20, 5),
  ('ACC-001', 'cinturon-cuero', 'Cinturón cuero sintético', 'Cinturón clásico unisex', 'accesorios', 'generico', 12.00, 29.90, 30, 5)
) AS v(sku, slug, name, description, cat_slug, brand_slug, cost, price, stock, min_stock)
JOIN public.categories c ON c.slug = v.cat_slug
JOIN public.brands b ON b.slug = v.brand_slug;
