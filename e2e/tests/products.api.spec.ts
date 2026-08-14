import { test, expect } from '@playwright/test';
import { authHeaders, getStaffAccessToken } from '../helpers/auth';

test.describe('API productos (autenticado)', () => {
  let token: string;
  let categoryId: string;
  let brandId: string;

  test.beforeAll(async ({ request }) => {
    token = await getStaffAccessToken(request);

    const [categories, brands] = await Promise.all([
      request.get('http://localhost:4000/api/v1/categories'),
      request.get('http://localhost:4000/api/v1/brands'),
    ]);

    expect(categories.ok()).toBeTruthy();
    expect(brands.ok()).toBeTruthy();

    const catList = (await categories.json()) as Array<{ id: string }>;
    const brandList = (await brands.json()) as Array<{ id: string }>;
    categoryId = catList[0]?.id ?? '';
    brandId = brandList[0]?.id ?? '';

    expect(categoryId, 'Se requiere al menos una categoría en la BD').toBeTruthy();
    expect(brandId, 'Se requiere al menos una marca en la BD').toBeTruthy();
  });

  test('GET /products/check-sku rechaza formato inválido', async ({ request }) => {
    const res = await request.get(
      'http://localhost:4000/api/v1/products/check-sku?sku=invalido',
      { headers: authHeaders(token) },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.reason).toMatch(/formato/i);
  });

  test('GET /products/suggest-sku genera formato CAT-0001-MARC', async ({ request }) => {
    const res = await request.get(
      `http://localhost:4000/api/v1/products/suggest-sku?categoryId=${categoryId}&brandId=${brandId}`,
      { headers: authHeaders(token) },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.sku).toMatch(/^[A-Z0-9]{2,6}-\d{4}-[A-Z0-9]{2,6}$/);
  });

  test('GET /products devuelve marcas e imágenes normalizadas', async ({ request }) => {
    const res = await request.get('http://localhost:4000/api/v1/products?limit=5', {
      headers: authHeaders(token),
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      data: Array<{
        brand?: { name?: string } | null;
        images?: Array<{ url?: string; storage_path?: string }>;
      }>;
    };

    for (const product of body.data ?? []) {
      if (product.brand) {
        expect(Array.isArray(product.brand)).toBe(false);
        if (product.brand.name) {
          expect(product.brand.name).not.toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          );
        }
      }
      for (const img of product.images ?? []) {
        if (img.storage_path) {
          expect(img.url).toContain('/storage/v1/object/public/product-images/');
        }
      }
    }
  });

  test('POST /products sin token retorna 401', async ({ request }) => {
    const res = await request.post('http://localhost:4000/api/v1/products', {
      data: { sku: 'E2E-0001-TEST', name: 'Test', cost_price: 1, sale_price: 2 },
    });
    expect(res.status()).toBe(401);
  });
});
