/**
 * Aplica esquema vía API de Supabase Management (requiere service role).
 * Fallback: conexión directa si DATABASE_URL está definida.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');
const envPath = resolve(__dirname, '..', '.env');
const sqlPath = resolve(root, 'supabase', 'migrations', '20250622120000_la_merced_complete_schema.sql');

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

const databaseUrl = process.env.DATABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const projectRef = 'idbzttrtzmhrlwsomphz';
const sql = readFileSync(sqlPath, 'utf8');

async function viaPg() {
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
}

async function viaSupabasePooler() {
  // Intenta pooler con contraseña = service role (no siempre funciona)
  const hosts = [
    `postgresql://postgres.${projectRef}:${encodeURIComponent(serviceKey)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${encodeURIComponent(serviceKey)}@db.${projectRef}.supabase.co:5432/postgres`,
  ];
  for (const url of hosts) {
    const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.query(sql);
      await client.end();
      return true;
    } catch {
      try { await client.end(); } catch { /* ignore */ }
    }
  }
  return false;
}

async function viaManagementApi() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Management API ${res.status}: ${text.slice(0, 200)}`);
  }
}

async function main() {
  console.log('Aplicando esquema La Merced...\n');

  if (databaseUrl) {
    console.log('→ Conexión directa (DATABASE_URL)');
    await viaPg();
    console.log('✓ Esquema aplicado.\n');
    return;
  }

  console.log('→ Intentando pooler Supabase...');
  if (await viaSupabasePooler()) {
    console.log('✓ Esquema aplicado.\n');
    return;
  }

  console.log('→ Intentando Management API...');
  try {
    await viaManagementApi();
    console.log('✓ Esquema aplicado.\n');
    return;
  } catch (e) {
    console.warn('Management API:', e.message);
  }

  console.error(`
No se pudo aplicar el esquema automáticamente.

Añade DATABASE_URL en backend/.env (Supabase → Settings → Database → Connection string)
o ejecuta el SQL manualmente en el SQL Editor.
`);
  process.exit(1);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
