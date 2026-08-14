import { slugify, sanitizeSearchTerm } from './string.util';

describe('string.util', () => {
  it('slugify normaliza texto', () => {
    expect(slugify('Aceite Oliva Extra')).toBe('aceite-oliva-extra');
    expect(slugify('Café & Té')).toBe('cafe-te');
  });

  it('sanitizeSearchTerm escapa caracteres especiales', () => {
    expect(sanitizeSearchTerm('100%')).toBe('100\\%');
    expect(sanitizeSearchTerm('a_b')).toBe('a\\_b');
  });

  it('sanitizeSearchTerm limita longitud', () => {
    expect(sanitizeSearchTerm('a'.repeat(200), 50).length).toBe(50);
  });
});
