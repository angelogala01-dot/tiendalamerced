import { formatSku, isValidSkuFormat, toEntityCode } from './sku.util';

describe('sku.util', () => {
  it('genera códigos de entidad desde slug', () => {
    expect(toEntityCode('alimentos')).toBe('ALIM');
    expect(toEntityCode('la-costena')).toBe('LACO');
  });

  it('formatea SKU con categoría, secuencia y marca', () => {
    expect(formatSku('alimentos', 'la-costena', 1)).toBe('ALIM-0001-LACO');
    expect(formatSku('bebidas', 'coca-cola', 42)).toBe('BEBI-0042-COCA');
  });

  it('valida formato de SKU', () => {
    expect(isValidSkuFormat('ALIM-0001-LACO')).toBe(true);
    expect(isValidSkuFormat('invalid')).toBe(false);
  });
});
