export type ChatProduct = {
  name: string;
  sku: string;
  slug?: string | null;
  sale_price: number;
  stock_quantity: number;
  brand?: { name?: string } | { name?: string }[] | null;
  category?: { name?: string } | { name?: string }[] | null;
};

export type ChatOrderItem = {
  quantity?: number;
  product?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
};

export type ChatOrder = {
  order_number: string;
  status: string;
  total?: number;
  shipping_city?: string | null;
  created_at?: string;
  items?: ChatOrderItem[] | null;
};

export type ChatPromotion = {
  name: string;
  description?: string | null;
  discount_type: string;
  discount_value: number;
  min_purchase?: number | null;
  end_date?: string | null;
};

function relationName(value: unknown) {
  const row = Array.isArray(value) ? value[0] : value;
  if (row && typeof row === 'object' && 'name' in row && typeof row.name === 'string') {
    return row.name;
  }
  return '';
}

export function formatPen(value: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(value) || 0);
}

export function describeOrderStatus(status: string) {
  switch (status) {
    case 'pending':
      return {
        label: 'recibido',
        next: 'Lo estamos confirmando. Te avisamos cuando salga a entrega.',
      };
    case 'confirmed':
      return {
        label: 'confirmado',
        next: 'Ya lo estamos armando para el envío.',
      };
    case 'processing':
      return {
        label: 'en preparación',
        next: 'Estamos empacando tu pedido.',
      };
    case 'shipped':
      return {
        label: 'en camino',
        next: 'Salió a entrega. Si se retrasa, escríbenos a info@lamerced.com con el número de pedido.',
      };
    case 'delivered':
      return {
        label: 'entregado',
        next: 'Si algo no coincide, avísanos con el número de pedido.',
      };
    case 'cancelled':
      return {
        label: 'cancelado',
        next: 'Si no esperabas esta cancelación, escríbenos a info@lamerced.com.',
      };
    default:
      return { label: status, next: 'Puedes ver el detalle en /pedidos/seguimiento.' };
  }
}

export function formatOrderReply(order: ChatOrder, trackUrl: string) {
  const status = describeOrderStatus(order.status);
  const items = (order.items ?? [])
    .map((item) => {
      const product = Array.isArray(item.product) ? item.product[0] : item.product;
      const name = product?.name || 'Producto';
      return `• ${item.quantity ?? 1} × ${name}`;
    })
    .slice(0, 8);

  const when = order.created_at
    ? new Date(order.created_at).toLocaleDateString('es-PE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return [
    `Tu pedido ${order.order_number} está ${status.label}.`,
    when ? `Se registró el ${when}.` : null,
    order.shipping_city ? `Entrega en ${order.shipping_city}.` : null,
    items.length ? `Incluye:\n${items.join('\n')}` : null,
    typeof order.total === 'number' ? `Total: ${formatPen(Number(order.total))}.` : null,
    status.next,
    `Más detalle: ${trackUrl}?numero=${encodeURIComponent(order.order_number)}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function formatOrdersListReply(orders: ChatOrder[], trackUrl: string) {
  if (!orders.length) {
    return 'No encuentro pedidos en tu cuenta. Si compraste como invitado, pégame el número (ejemplo: P-20260820-00001). También llega en el correo de confirmación.';
  }

  const lines = orders.map((order) => {
    const status = describeOrderStatus(order.status);
    return `• ${order.order_number} — ${status.label}${typeof order.total === 'number' ? ` — ${formatPen(Number(order.total))}` : ''}`;
  });

  return [
    'Estos son tus pedidos más recientes:',
    lines.join('\n'),
    `Para el detalle de uno, dime el número o entra a ${trackUrl}.`,
  ].join('\n\n');
}

export function formatProductsReply(products: ChatProduct[], term?: string | null) {
  if (!products.length) {
    return term
      ? `No encontré "${term}" en este momento. Mira todo el surtido en /catalogo o dime otra marca o modelo.`
      : 'Ahora mismo no hay productos activos. Entra a /catalogo o escribe a info@lamerced.com.';
  }

  const lines = products.map((product) => {
    const brand = relationName(product.brand);
    const stock = Number(product.stock_quantity) > 0 ? 'disponible' : 'sin stock';
    const link = product.slug ? `/producto/${product.slug}` : '/catalogo';
    return `• ${product.name}${brand ? ` (${brand})` : ''} — ${formatPen(Number(product.sale_price))} — ${stock}\n  ${link}`;
  });

  const intro = term
    ? `Esto encontré para "${term}":`
    : 'Estos productos están disponibles ahora:';

  return `${intro}\n${lines.join('\n')}\n\nPara comprar: agrégalos al carrito y sigue a /checkout. Catálogo completo: /catalogo.`;
}

export function formatCatalogOverview(
  categories: Array<{ name: string }>,
  products: ChatProduct[],
) {
  const cats = categories.map((row) => row.name).filter(Boolean).slice(0, 8);
  const catLine = cats.length ? `Categorías: ${cats.join(', ')}.` : '';
  const samples = formatProductsReply(products);
  return [
    'Este es el catálogo de La Merced PyK: calzado, ropa y accesorios.',
    catLine,
    samples,
    'También puedes filtrar en /categorias o ver ofertas en /promociones.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function howToShopReply() {
  return [
    'Para comprar: 1) entra a /catalogo, 2) abre el producto, 3) agrégalo al carrito (/carrito), 4) paga en /checkout.',
    'Puedes pagar con Yape, Plin, tarjeta, efectivo o transferencia. Elige boleta (DNI) o factura (RUC).',
    'Si ya tienes cuenta, tus pedidos quedan en /pedidos. El número (P-…) también llega al correo.',
  ].join(' ');
}

export function helpReply(isStaff = false) {
  const base = [
    'Puedo ayudarte con esto:',
    '• Buscar productos (precio y stock): dime “zapatillas”, una marca o un modelo',
    '• Seguir un pedido: pega el número P-AAAAMMDD-00001',
    '• Envíos, pagos, horarios, boleta/factura, cambios y promociones',
    '• Cómo comprar: catálogo → carrito → checkout',
  ];
  if (isStaff) {
    base.push(
      '• Panel interno: productos, inventario, ventas POS, pedidos, comprobantes, clientes y reportes',
    );
  }
  return base.join('\n');
}

export function staffHelpReply(adminUrl: string) {
  return [
    `En el panel (${adminUrl}) puedes:`,
    '• Productos e inventario: alta de SKU, fotos, stock y ajustes de almacén',
    '• Pedidos web: confirmar, marcar en camino y entregar',
    '• Ventas POS: cobro en tienda',
    '• Comprobantes: boleta/factura con Nubefact',
    '• Clientes, proveedores, marcas, categorías, promociones, reportes y configuración',
    'Si me dices qué quieres hacer (por ejemplo “cómo subo un producto”), te guío el paso.',
  ].join('\n');
}

export function formatPromotionsReply(promos: ChatPromotion[]) {
  if (!promos.length) {
    return 'Ahora no hay promociones vigentes. El envío es gratis según el monto mínimo de compra y a veces hay descuento de bienvenida en la primera compra. Revisa /promociones.';
  }

  const lines = promos.map((promo) => {
    const value =
      promo.discount_type === 'percentage'
        ? `${promo.discount_value}%`
        : formatPen(Number(promo.discount_value));
    const min = Number(promo.min_purchase) > 0 ? ` (desde ${formatPen(Number(promo.min_purchase))})` : '';
    const until = promo.end_date
      ? ` hasta el ${new Date(promo.end_date).toLocaleDateString('es-PE')}`
      : '';
    return `• ${promo.name}: ${value} de descuento${min}${until}${promo.description ? `. ${promo.description}` : ''}`;
  });

  return `Promociones vigentes:\n${lines.join('\n')}\n\nSe aplican en el checkout si cumples el monto mínimo.`;
}

export function shippingReply(settings: { shipping_flat: number; free_shipping_min: number }) {
  const flat = formatPen(settings.shipping_flat);
  const freeFrom = formatPen(settings.free_shipping_min);
  return [
    `Hacemos delivery en la ciudad. El envío cuesta ${flat} y es gratis desde ${freeFrom}.`,
    'El plazo habitual es de 24 a 72 horas hábiles, según la zona y el stock.',
    'Para ver un pedido concreto, pégame el número (P-AAAAMMDD-00001) o entra a /pedidos/seguimiento.',
  ].join(' ');
}

export function returnsReply() {
  return [
    'Cambios: hasta 7 días después de la entrega, con comprobante y la prenda sin uso, con etiquetas.',
    'Si hay falla de fábrica, lo revisamos y te damos cambio o solución.',
    'Para iniciar un cambio, escríbenos a info@lamerced.com con el número de pedido y fotos si aplica.',
  ].join(' ');
}
