import { test, expect, type Page } from '@playwright/test';
import { loginAsAdminWithCookies } from '../helpers/auth';

test.describe('Admin — acceso a productos', () => {
  test.beforeEach(async ({ page, request }) => {
    await loginAsAdminWithCookies(page, request);
  });

  test('página de productos carga con sesión staff', async ({ page }) => {
    await page.goto('/productos');
    await expect(page.getByRole('heading', { name: 'Productos', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /nuevo producto/i })).toBeVisible();
    await expect(page.getByText(/sin productos registrados|productos registrados/i)).toBeVisible({
      timeout: 30_000,
    });
  });
});
