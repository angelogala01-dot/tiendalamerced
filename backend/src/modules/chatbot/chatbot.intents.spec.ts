import { detectIntent, isCannedIntent } from './chatbot.intents';

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
});
