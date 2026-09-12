import {
  detectIntent,
  extractOrderNumber,
  extractOrderNumberFromHistory,
  extractSearchTokens,
  isCannedIntent,
  isCatalogBrowse,
  shouldLookupOrder,
  stemToken,
} from './chatbot.intents';
import { describeOrderStatus, formatOrderReply, formatPen } from './chatbot.replies';

describe('detectIntent', () => {
  it('saluda sin confundir con el horario', () => {
    expect(detectIntent('hola')).toBe('greeting');
    expect(detectIntent('Hola!')).toBe('greeting');
    expect(detectIntent('buenas tardes')).toBe('greeting');
    expect(isCannedIntent('greeting')).toBe(true);
  });

  it('detecta horario solo si lo piden', () => {
    expect(detectIntent('hola, cuál es el horario?')).toBe('hours');
    expect(detectIntent('a qué hora abren')).toBe('hours');
  });

  it('detecta pagos, pedidos y productos', () => {
    expect(detectIntent('aceptan yape?')).toBe('payment');
    expect(detectIntent('quiero seguir mi pedido')).toBe('order');
    expect(detectIntent('tienen zapatillas?')).toBe('products');
  });

  it('no confunde delivery genérico con seguimiento de pedido', () => {
    expect(detectIntent('hacen delivery?')).toBe('shipping');
    expect(detectIntent('cuánto cuesta el envío')).toBe('shipping');
    expect(detectIntent('cuánto tarda mi pedido')).toBe('order');
  });

  it('detecta promociones y cambios', () => {
    expect(detectIntent('hay descuentos de bienvenida?')).toBe('promotions');
    expect(detectIntent('puedo cambiar de talla?')).toBe('returns');
  });
});

describe('extractOrderNumber', () => {
  it('saca el número P-AAAAMMDD-NNNNN aunque venga en una frase', () => {
    expect(extractOrderNumber('mi pedido es P-20260820-00014 por favor')).toBe('P-20260820-00014');
    expect(extractOrderNumber('no tengo el código')).toBeNull();
  });

  it('recuerda el número solo en mensajes del cliente, no en la respuesta del bot', () => {
    expect(
      extractOrderNumberFromHistory([
        { role: 'user', content: 'hola' },
        { role: 'user', content: 'es el P-20260820-00014' },
        { role: 'assistant', content: 'ok numero=P-20260820-00014' },
        { role: 'user', content: 'y ese ya salió?' },
      ]),
    ).toBe('P-20260820-00014');
  });

  it('no trata horario u otras dudas como seguimiento aunque haya un pedido antes', () => {
    expect(detectIntent('los horarios de atencion')).toBe('hours');
    expect(shouldLookupOrder('hours', 'los horarios de atencion')).toBe(false);
    expect(shouldLookupOrder('order', 'y ese pedido ya salió?')).toBe(true);
    expect(shouldLookupOrder('unknown', 'P-20260815-00014')).toBe(true);
  });

  it('trata el catálogo como vitrina, no como nombre de producto', () => {
    expect(detectIntent('el catalogo')).toBe('products');
    expect(isCatalogBrowse('el catalogo')).toBe(true);
    expect(isCatalogBrowse('¿Tienen zapatillas disponibles?')).toBe(false);
  });
});

describe('búsqueda de catálogo', () => {
  it('reduce zapatillas a zapatilla y no busca la palabra disponibles', () => {
    expect(stemToken('zapatillas')).toBe('zapatilla');
    const tokens = extractSearchTokens('¿Tienen zapatillas disponibles?');
    expect(tokens).toContain('zapatilla');
    expect(tokens).not.toContain('disponibles');
    expect(tokens).not.toContain('tienen');
  });
});

describe('order replies', () => {
  it('describe estados reales sin inventar', () => {
    expect(describeOrderStatus('shipped').label).toBe('en camino');
    expect(formatPen(15)).toMatch(/15/);
    const text = formatOrderReply(
      {
        order_number: 'P-20260820-00014',
        status: 'processing',
        total: 129,
        shipping_city: 'Lima',
        items: [{ quantity: 1, product: { name: 'Zapatilla Runner' } }],
      },
      'http://localhost:3000/pedidos/seguimiento',
    );
    expect(text).toContain('P-20260820-00014');
    expect(text).toContain('en preparación');
    expect(text).toContain('Zapatilla Runner');
    expect(text).not.toContain('undefined');
  });
});
