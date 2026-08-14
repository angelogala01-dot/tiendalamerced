import { test, expect } from '@playwright/test';

test.describe('Panel admin', () => {
  test('login page carga', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /iniciar sesión|acceso/i })).toBeVisible();
  });

  test('dashboard protegido redirige a login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });
});
