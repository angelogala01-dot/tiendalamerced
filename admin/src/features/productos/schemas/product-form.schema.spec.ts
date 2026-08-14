import { productFormSchema, validateImageFile } from '@/features/productos/schemas/product-form.schema';

describe('productFormSchema', () => {
  const valid = {
    sku: 'ALIM-0001-LACO',
    name: 'Aceite 1L',
    category_id: '550e8400-e29b-41d4-a716-446655440000',
    brand_id: '550e8400-e29b-41d4-a716-446655440001',
    cost_price: 10,
    sale_price: 15,
    stock_quantity: 5,
    min_stock: 2,
  };

  it('acepta datos válidos', () => {
    const result = productFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rechaza SKU con formato inválido', () => {
    const result = productFormSchema.safeParse({ ...valid, sku: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rechaza campos obligatorios vacíos', () => {
    const result = productFormSchema.safeParse({
      ...valid,
      name: '',
      category_id: '',
      brand_id: '',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza precio de venta menor al costo', () => {
    const result = productFormSchema.safeParse({ ...valid, cost_price: 20, sale_price: 10 });
    expect(result.success).toBe(false);
  });

  it('rechaza stock negativo', () => {
    const result = productFormSchema.safeParse({ ...valid, stock_quantity: -1 });
    expect(result.success).toBe(false);
  });
});

describe('validateImageFile', () => {
  it('acepta JPEG válido', () => {
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });
    expect(validateImageFile(file)).toBeNull();
  });

  it('rechaza PDF', () => {
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    expect(validateImageFile(file)).toMatch(/Formato no permitido/);
  });

  it('acepta archivos grandes', () => {
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 });
    expect(validateImageFile(file)).toBeNull();
  });
});
