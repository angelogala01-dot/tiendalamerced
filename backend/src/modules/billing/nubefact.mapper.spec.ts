import { buildNubefactItems, igvFromGross, resolveCustomerForVoucher } from './nubefact.mapper';

describe('nubefact.mapper', () => {
  it('desglosa IGV de un precio con impuesto incluido', () => {
    const result = igvFromGross(118);
    expect(result.taxable).toBe(100);
    expect(result.igv).toBe(18);
    expect(result.total).toBe(118);
  });

  it('arma ítems gravados con totales consistentes', () => {
    const { items, total, totalIgv, totalTaxable } = buildNubefactItems([
      { sku: 'CAL-001', description: 'Zapatilla', quantity: 2, unitPriceWithIgv: 118 },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].precio_unitario).toBe(118);
    expect(items[0].cantidad).toBe(2);
    expect(total).toBe(236);
    expect(totalTaxable + totalIgv).toBe(total);
  });

  it('exige RUC de 11 dígitos para factura', () => {
    expect(() =>
      resolveCustomerForVoucher('factura', {
        name: 'Empresa SAC',
        documentNumber: '123',
      }),
    ).toThrow(/RUC/);
  });

  it('emite boleta a consumidor final si no hay DNI', () => {
    const cliente = resolveCustomerForVoucher('boleta', { name: 'Ana' });
    expect(cliente.tipo).toBe('-');
    expect(cliente.numero).toBe('00000000');
  });
});
