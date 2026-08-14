import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'path';
import { loginAsAdminWithCookies } from '../helpers/auth';

const sampleImage = resolve(__dirname, '../fixtures/sample.png');

async function waitForProductsPage(page: Page) {
  await expect(page.getByRole('heading', { name: 'Productos', level: 1 })).toBeVisible();
  await expect(page.getByText(/sin productos registrados|productos registrados/i)).toBeVisible({
    timeout: 30_000,
  });
}

async function openNewProductDialog(page: Page) {
  const btn = page.getByRole('main').getByRole('button', { name: /nuevo producto/i });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();

  const dialogTitle = page.locator('[data-slot="dialog-title"]');
  if (await dialogTitle.isVisible().catch(() => false)) return;

  await page.evaluate(() => {
    const target = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.toLowerCase().includes('nuevo producto'),
    );
    target?.click();
  });

  await expect(dialogTitle).toContainText(/nuevo producto/i, { timeout: 15_000 });
}

async function selectEntity(page: Page, triggerIndex: number, excludePattern: RegExp) {
  await page.locator('[data-slot="select-trigger"]').nth(triggerIndex).click();
  await page
    .locator('[data-slot="select-item"]')
    .filter({ hasNotText: excludePattern })
    .first()
    .click();
}

test.describe('Admin — formulario de productos', () => {
  test.beforeEach(async ({ page, request }, testInfo) => {
    test.skip(
      !process.env.E2E_UI_FULL,
      'Define E2E_UI_FULL=1 y arranca admin con "npm run build && npm run start" (no next dev)',
    );
    await loginAsAdminWithCookies(page, request);
    await page.goto('/productos');
    await waitForProductsPage(page);
  });

  test('muestra validaciones al enviar formulario vacío', async ({ page }) => {
    await openNewProductDialog(page);
    await page.getByRole('button', { name: /crear producto/i }).click();

    await expect(page.getByText(/nombre debe tener/i)).toBeVisible();
    await expect(page.getByText(/sku es obligatorio|formato inválido/i).first()).toBeVisible();
    await expect(page.getByText(/seleccione una categoría/i)).toBeVisible();
    await expect(page.getByText(/seleccione una marca/i)).toBeVisible();
  });

  test('genera SKU al seleccionar categoría y marca', async ({ page }) => {
    await openNewProductDialog(page);
    await selectEntity(page, 0, /sin categoría/i);
    await selectEntity(page, 1, /sin marca/i);

    await expect(page.locator('#product-sku')).toHaveValue(
      /^[A-Z0-9]{2,6}-\d{4}-[A-Z0-9]{2,6}$/,
      { timeout: 10_000 },
    );
  });

  test('rechaza imagen con formato no permitido', async ({ page }) => {
    const txtPath = resolve(__dirname, '../fixtures/invalid.txt');
    const { writeFileSync, mkdirSync, existsSync } = await import('fs');
    const fixturesDir = resolve(__dirname, '../fixtures');
    if (!existsSync(fixturesDir)) mkdirSync(fixturesDir, { recursive: true });
    writeFileSync(txtPath, 'not an image');

    await openNewProductDialog(page);
    await page.locator('[data-slot="dialog-content"] input[type="file"]').setInputFiles(txtPath);
    await expect(page.getByText(/formato no permitido/i)).toBeVisible({ timeout: 8_000 });
  });

  test('acepta imagen PNG válida en modo creación', async ({ page }) => {
    const { writeFileSync, mkdirSync, existsSync } = await import('fs');
    const fixturesDir = resolve(__dirname, '../fixtures');
    if (!existsSync(fixturesDir)) mkdirSync(fixturesDir, { recursive: true });
    if (!existsSync(sampleImage)) {
      writeFileSync(
        sampleImage,
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64',
        ),
      );
    }

    await openNewProductDialog(page);
    await page.locator('[data-slot="dialog-content"] input[type="file"]').setInputFiles(sampleImage);

    await expect(
      page.getByText(/imagen lista para guardar|imagen agregada/i),
    ).toBeVisible({ timeout: 25_000 });
  });

  test('listado muestra nombres de marca, no UUIDs', async ({ page }) => {
    const brandCells = page.locator('table tbody tr td:nth-child(4)');
    const count = await brandCells.count();
    test.skip(count === 0, 'No hay productos en el listado');

    for (let i = 0; i < Math.min(count, 5); i++) {
      const text = (await brandCells.nth(i).textContent())?.trim() ?? '';
      if (!text || text === '—') continue;
      expect(text).not.toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    }
  });
});
