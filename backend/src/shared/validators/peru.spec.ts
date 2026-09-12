import { isPeruDni, isPeruPhone, isPeruRuc, isPeruTaxId } from './peru';

describe('validadores Perú', () => {
  it('acepta celular de 9 dígitos que empieza en 9', () => {
    expect(isPeruPhone('987654321')).toBe(true);
    expect(isPeruPhone('987 654 321')).toBe(true);
  });

  it('rechaza celular que no empieza en 9 o no tiene 9 dígitos', () => {
    expect(isPeruPhone('187654321')).toBe(false);
    expect(isPeruPhone('98765432')).toBe(false);
    expect(isPeruPhone('9876543210')).toBe(false);
  });

  it('acepta DNI de 8 dígitos', () => {
    expect(isPeruDni('12345678')).toBe(true);
    expect(isPeruDni('12.345.678')).toBe(true);
  });

  it('rechaza DNI con otra longitud', () => {
    expect(isPeruDni('1234567')).toBe(false);
    expect(isPeruDni('123456789')).toBe(false);
  });

  it('acepta RUC de 11 dígitos', () => {
    expect(isPeruRuc('20123456789')).toBe(true);
    expect(isPeruTaxId('20123456789')).toBe(true);
    expect(isPeruTaxId('12345678')).toBe(true);
  });
});
