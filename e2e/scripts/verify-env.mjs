/**
 * Verifica servicios, auth y bucket de imágenes para desarrollo/E2E.
 * Uso: node e2e/scripts/verify-env.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(resolve(root, 'backend/.env'));
loadEnv(resolve(root, 'admin/.env.local'));

const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(
  /\/$/,
  '',
);
const anonKey =
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@lamerced.com';
const password = process.env.E2E_ADMIN_PASSWORD ?? 'Admin123!';

const checks = [];

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (err) {
    checks.push({ name, ok: false, error: err.message ?? String(err) });
    console.log(`✗ ${name}: ${err.message ?? err}`);
  }
}

await check('Backend /health', async () => {
  const res = await fetch('http://localhost:4000/api/v1/health');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
});

await check('Admin /login', async () => {
  const res = await fetch('http://localhost:3001/login');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
});

await check('Variables Supabase configuradas', async () => {
  if (!supabaseUrl || supabaseUrl.includes('your-project')) {
    throw new Error('SUPABASE_URL no configurada en backend/.env');
  }
  if (!anonKey || anonKey.includes('your-')) {
    throw new Error('Clave anon/publishable no configurada');
  }
});

await check('Login admin de prueba (seed:admin)', async () => {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status} — ejecuta npm run seed:admin. ${t.slice(0, 120)}`);
  }
});

await check('Bucket product-images (público)', async () => {
  if (!serviceKey) {
    throw new Error('Falta SUPABASE_SECRET_KEY para verificar storage — omite o configura backend/.env');
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.storage.getBucket('product-images');
  if (error) {
    throw new Error(
      `${error.message} — ejecuta npm run db:apply para crear el bucket y políticas`,
    );
  }
  if (!data?.public) {
    throw new Error('El bucket existe pero no es público');
  }
});

await check('API suggest-sku autenticada', async () => {
  const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) throw new Error('Sin token');
  const { access_token: token } = await loginRes.json();

  const catRes = await fetch('http://localhost:4000/api/v1/categories');
  const brandsRes = await fetch('http://localhost:4000/api/v1/brands');
  const categories = await catRes.json();
  const brands = await brandsRes.json();
  const categoryId = categories?.[0]?.id;
  const brandId = brands?.[0]?.id;
  if (!categoryId || !brandId) {
    throw new Error('No hay categorías o marcas en la BD — crea datos de catálogo');
  }

  const skuRes = await fetch(
    `http://localhost:4000/api/v1/products/suggest-sku?categoryId=${categoryId}&brandId=${brandId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!skuRes.ok) {
    throw new Error(`HTTP ${skuRes.status}: ${(await skuRes.text()).slice(0, 120)}`);
  }
  const body = await skuRes.json();
  if (!/^[A-Z0-9]{2,6}-\d{4}-[A-Z0-9]{2,6}$/.test(body.sku)) {
    throw new Error(`SKU inesperado: ${body.sku}`);
  }
});

// Generar fixture PNG 1x1 si no existe
const fixturesDir = resolve(__dirname, '../fixtures');
const samplePng = resolve(fixturesDir, 'sample.png');
if (!existsSync(samplePng)) {
  mkdirSync(fixturesDir, { recursive: true });
  writeFileSync(
    samplePng,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  );
  console.log('✓ Fixture e2e/fixtures/sample.png generado');
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} verificaciones OK`);
if (failed.length) {
  console.log('\nAcciones sugeridas:');
  if (failed.some((f) => f.name.includes('seed'))) console.log('  npm run seed:admin');
  if (failed.some((f) => f.name.includes('Bucket'))) console.log('  npm run storage:ensure');
  if (failed.some((f) => f.name.includes('Backend'))) console.log('  npm run dev (raíz) o npm run dev:backend');
  process.exit(1);
}
