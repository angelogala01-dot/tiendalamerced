export type ChatIntent =
  | 'greeting'
  | 'thanks'
  | 'hours'
  | 'payment'
  | 'products'
  | 'order'
  | 'invoice'
  | 'contact'
  | 'shipping'
  | 'returns'
  | 'promotions'
  | 'help'
  | 'howto'
  | 'staff'
  | 'unknown';

export const ORDER_NUMBER_RE = /\bp-\d{8}-\d+\b/i;

export function normalizeChatText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractOrderNumber(text: string) {
  const match = text.match(ORDER_NUMBER_RE);
  return match ? match[0].toUpperCase() : null;
}

export function extractOrderNumberFromHistory(
  history: Array<{ role: string; content: string }>,
) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const row = history[i];
    if (row?.role !== 'user') continue;
    const found = extractOrderNumber(row.content ?? '');
    if (found) return found;
  }
  return null;
}

export function shouldLookupOrder(intent: ChatIntent, message: string) {
  return Boolean(extractOrderNumber(message)) || intent === 'order';
}

const GREETING_ONLY =
  /^(hola+|holi|buenas?|buenos dias|buen dia|buenas tardes|buenas noches|hey+|hi+|hello|que tal|que hubo|saludos)(\s+\w{1,12})?$/;

function includesAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

export function detectIntent(message: string): ChatIntent {
  const text = normalizeChatText(message);
  if (!text) return 'unknown';

  if (extractOrderNumber(text) || includesAny(text, ['seguir mi pedido', 'estado de mi pedido', 'donde esta mi pedido'])) {
    return 'order';
  }
  if (includesAny(text, ['horario', 'horarios', 'abren', 'cierran', 'atencion', 'abierto', 'cerrado'])) {
    return 'hours';
  }
  if (includesAny(text, ['yape', 'plin', 'pago', 'pagos', 'tarjeta', 'efectivo', 'transferencia', 'transferencias'])) {
    return 'payment';
  }
  if (includesAny(text, ['boleta', 'factura', 'comprobante', 'nubefact', 'sunat'])) {
    return 'invoice';
  }
  if (includesAny(text, [
    'devolucion',
    'devoluciones',
    'devolver',
    'cambio de talla',
    'cambiar de talla',
    'cambiar talla',
    'cambios',
    'garantia',
  ])) {
    return 'returns';
  }
  if (includesAny(text, ['promocion', 'promociones', 'descuento', 'descuentos', 'oferta', 'ofertas', 'bienvenida', 'cupon'])) {
    return 'promotions';
  }
  if (
    includesAny(text, [
      'delivery',
      'envio a domicilio',
      'envios',
      'envio',
      'domicilio',
      'costo de envio',
      'gasto de envio',
      'demora el envio',
      'tiempo de entrega',
      'gratis el envio',
    ]) &&
    !includesAny(text, ['pedido', 'pedidos', 'orden', 'seguimiento', 'rastrear'])
  ) {
    return 'shipping';
  }
  if (
    includesAny(text, [
      'pedido',
      'pedidos',
      'orden',
      'seguimiento',
      'rastrear',
      'mi compra',
      'mis compras',
      'cuando llega mi',
      'ya salio',
      'ya llego',
      'ese pedido',
      'en que estado',
    ])
  ) {
    return 'order';
  }
  if (includesAny(text, ['que puedes', 'como me ayudas', 'en que ayudas', 'que haces', 'ayuda por favor'])) {
    return 'help';
  }
  if (
    includesAny(text, [
      'como compro',
      'como comprar',
      'como pago',
      'carrito',
      'checkout',
      'favoritos',
      'crear cuenta',
      'registrarme',
      'iniciar sesion',
    ])
  ) {
    return 'howto';
  }
  if (
    includesAny(text, [
      'inventario',
      'panel admin',
      'punto de venta',
      'ventas pos',
      'proveedores',
      'dashboard',
      'stock bajo',
      'cargar producto',
      'registrar producto',
    ])
  ) {
    return 'staff';
  }
  if (includesAny(text, ['direccion', 'telefono', 'correo', 'email', 'ubicacion', 'donde quedan', 'contacto'])) {
    return 'contact';
  }
  if (
    includesAny(text, [
      'producto',
      'productos',
      'catalogo',
      'precio',
      'precios',
      'stock',
      'talla',
      'tallas',
      'zapato',
      'zapatos',
      'zapatilla',
      'calzado',
      'ropa',
      'polo',
      'jean',
      'pantalon',
      'accesorio',
      'marca',
      'nike',
      'adidas',
      'disponible',
      'tienen',
      'busco',
      'quiero comprar',
      'medias',
      'media',
      'venden',
      'surten',
    ])
  ) {
    return 'products';
  }
  if (text === 'ayuda' || text === 'ayudame' || includesAny(text, ['que puedes hacer'])) {
    return 'help';
  }
  if (includesAny(text, ['gracias', 'muchas gracias', 'te agradezco'])) {
    return 'thanks';
  }
  if (GREETING_ONLY.test(text)) {
    return 'greeting';
  }
  return 'unknown';
}

export function isCannedIntent(intent: ChatIntent) {
  return intent === 'greeting' || intent === 'thanks';
}

export const SEARCH_STOPWORDS = new Set([
  'para', 'una', 'unos', 'unas', 'este', 'esta', 'esto', 'como', 'cual', 'cuales',
  'cuanto', 'cuanta', 'tienen', 'tiene', 'quiero', 'busco', 'hay', 'del', 'los',
  'las', 'con', 'por', 'que', 'hola', 'buenas', 'buen', 'dia', 'dias',
  'producto', 'productos', 'tienda', 'ayuda', 'favor', 'puedo', 'puede',
  'algo', 'algun', 'alguno', 'alguna', 'algunos', 'me', 'mi', 'mis', 'tu', 'su', 'mas',
  'catalogo', 'disponible', 'disponibles', 'ver', 'mira', 'mostrar', 'mostrar',
  'ahora', 'actualmente', 'todas', 'todos', 'sobre', 'merced', 'lamerced',
  'pagina', 'web', 'online', 'virtual', 'asistente', 'el', 'la', 'un',
]);

export const SEARCH_SYNONYMS: Record<string, string[]> = {
  zapatilla: ['zapato', 'calzado'],
  zapatillas: ['zapatilla', 'zapato', 'calzado'],
  zapato: ['zapatilla', 'calzado'],
  zapatos: ['zapato', 'zapatilla', 'calzado'],
  polo: ['camiseta', 'ropa'],
  polos: ['polo', 'camiseta', 'ropa'],
  jean: ['pantalon', 'ropa'],
  jeans: ['jean', 'pantalon', 'ropa'],
  pantalon: ['jean', 'ropa'],
  casaca: ['chaqueta', 'abrigo'],
  casacas: ['casaca', 'chaqueta', 'abrigo'],
  media: ['medias'],
  medias: ['media'],
};

export function stemToken(token: string) {
  if (token.endsWith('ciones') && token.length > 8) return `${token.slice(0, -5)}cion`;
  if (token.endsWith('es') && token.length > 5 && !token.endsWith('ies')) return token.slice(0, -2);
  if (token.endsWith('s') && token.length > 4) return token.slice(0, -1);
  return token;
}

export function extractSearchTokens(message: string) {
  const raw = normalizeChatText(message)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !SEARCH_STOPWORDS.has(token));

  const variants = new Set<string>();
  for (const token of raw.slice(0, 4)) {
    variants.add(token);
    variants.add(stemToken(token));
    for (const syn of SEARCH_SYNONYMS[token] ?? []) variants.add(syn);
    for (const syn of SEARCH_SYNONYMS[stemToken(token)] ?? []) variants.add(syn);
  }

  return [...variants].filter((token) => token.length >= 3 && !SEARCH_STOPWORDS.has(token));
}

export function isCatalogBrowse(message: string) {
  const text = normalizeChatText(message);
  if (/\b(el )?catalogo\b/.test(text) && extractSearchTokens(message).length === 0) {
    return true;
  }
  return (
    extractSearchTokens(message).length === 0 &&
    (detectIntent(message) === 'products' ||
      includesAny(text, ['que tienen', 'que venden', 'ver productos', 'mostrar productos']))
  );
}
