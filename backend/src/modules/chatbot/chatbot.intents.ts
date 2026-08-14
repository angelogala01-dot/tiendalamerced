export type ChatIntent =
  | 'greeting'
  | 'thanks'
  | 'hours'
  | 'payment'
  | 'products'
  | 'order'
  | 'invoice'
  | 'contact'
  | 'unknown';

export function normalizeChatText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const GREETING_ONLY =
  /^(hola+|holi|buenas?|buenos dias|buen dia|buenas tardes|buenas noches|hey+|hi+|hello|que tal|que hubo|saludos)(\s+\w{1,12})?$/;

function includesAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

export function detectIntent(message: string): ChatIntent {
  const text = normalizeChatText(message);
  if (!text) return 'unknown';

  if (includesAny(text, ['horario', 'horarios', 'abren', 'cierran', 'atencion', 'abierto', 'cerrado'])) {
    return 'hours';
  }
  if (includesAny(text, ['yape', 'plin', 'pago', 'pagos', 'tarjeta', 'efectivo', 'transferencia', 'transferencias'])) {
    return 'payment';
  }
  if (/\bp-\d{8}-\d+\b/.test(text) || includesAny(text, ['pedido', 'pedidos', 'orden', 'seguimiento', 'rastrear', 'delivery', 'envio', 'envios'])) {
    return 'order';
  }
  if (includesAny(text, ['boleta', 'factura', 'comprobante', 'nubefact'])) {
    return 'invoice';
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
      'zapato',
      'zapatos',
      'zapatilla',
      'calzado',
      'ropa',
      'polo',
      'jean',
      'accesorio',
    ])
  ) {
    return 'products';
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
