import { test, expect } from '@playwright/test';

test.describe('Tienda pública', () => {
  test('catálogo carga', async ({ page }) => {
    await page.goto('/catalogo');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('checkout redirige a login sin sesión', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/login/);
  });

  test('carrito muestra mensaje vacío', async ({ page }) => {
    await page.goto('/carrito');
    await expect(page.getByText(/carrito está vacío/i)).toBeVisible();
  });
});
