import { test, expect } from '@playwright/test';

test.describe('API seguridad', () => {
  test('POST /products sin token retorna 401', async ({ request }) => {
    const res = await request.post('http://localhost:4000/api/v1/products', {
      data: { sku: 'E2E', name: 'Test', cost_price: 1, sale_price: 2 },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /settings/store es público', async ({ request }) => {
    const res = await request.get('http://localhost:4000/api/v1/settings/store');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.tax_rate).toBeDefined();
  });
});
