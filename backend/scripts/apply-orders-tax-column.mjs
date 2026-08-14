/**
 * Añade columna tax a orders si falta (migración 20250624120000).
 * Uso: node scripts/apply-orders-tax-column.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

function loadEnv() {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const sql = `
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tax DECIMAL(12, 2) NOT NULL DEFAULT 0;
`;

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.log('DATABASE_URL no configurada — el backend ya no requiere tax para crear pedidos.');
    process.exit(0);
  }

  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log('Columna tax añadida (o ya existía).');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
