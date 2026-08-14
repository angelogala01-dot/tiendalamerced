/**
 * Aplica el esquema SQL completo vía conexión directa PostgreSQL.
 * Requiere DATABASE_URL en backend/.env (Supabase → Settings → Database)
 *
 * Uso: npm run db:apply
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

if (!databaseUrl) {
  console.error(`
❌ Falta DATABASE_URL en backend/.env

Obtén la cadena en Supabase → Settings → Database → Connection string (URI)
Ejemplo:
DATABASE_URL=postgresql://postgres.idbzttrtzmhrlwsomphz:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

Alternativa: pega el SQL manualmente en el SQL Editor de Supabase.
Archivo: supabase/migrations/20250622120000_la_merced_complete_schema.sql
`);
  process.exit(1);
}

const sql = readFileSync(sqlPath, 'utf8');
const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log('Conectado a PostgreSQL. Aplicando esquema...\n');
  await client.query(sql);
  console.log('✓ Esquema aplicado correctamente.\n');
  console.log('Siguiente paso: npm run seed:admin');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
