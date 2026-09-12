import { calculateOrderTotals, calculatePosTotals, DEFAULT_STORE_SETTINGS } from './order-totals.util';

describe('calculateOrderTotals', () => {
  it('total con IGV incluido en precios + envío', () => {
    const result = calculateOrderTotals(100, DEFAULT_STORE_SETTINGS);
    expect(result.tax).toBe(15.25);
    expect(result.shipping_cost).toBe(15);
    expect(result.total).toBe(115);
  });

  it('aplica envío gratis sobre umbral', () => {
    const result = calculateOrderTotals(250, DEFAULT_STORE_SETTINGS);
    expect(result.shipping_cost).toBe(0);
    expect(result.total).toBe(250);
  });

  it('omite envío en retiro en tienda', () => {
    const result = calculateOrderTotals(100, DEFAULT_STORE_SETTINGS, 0, true);
    expect(result.shipping_cost).toBe(0);
    expect(result.total).toBe(100);
  });
});
  it('desglosa IGV sin sumarlo al total de mostrador', () => {
    const result = calculatePosTotals(118, 18);
    expect(result.tax).toBe(18);
    expect(result.total).toBe(118);
  });

  it('aplica descuento antes de extraer IGV', () => {
    const result = calculatePosTotals(118, 18, 18);
    expect(result.discount).toBe(18);
    expect(result.total).toBe(100);
    expect(result.tax).toBe(15.25);
  });
});

describe('calculateOrderTotals', () => {
  it('total con IGV incluido en precios + envío', () => {
    const result = calculateOrderTotals(100, DEFAULT_STORE_SETTINGS);
    expect(result.tax).toBe(15.25);
    expect(result.shipping_cost).toBe(15);
    expect(result.total).toBe(115);
  });

  it('aplica envío gratis sobre umbral', () => {
    const result = calculateOrderTotals(250, DEFAULT_STORE_SETTINGS);
    expect(result.shipping_cost).toBe(0);
    expect(result.total).toBe(250);
  });
});
