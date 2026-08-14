/**
 * Crea el bucket product-images en Supabase Storage si no existe.
 * Uso: npm run storage:ensure (desde backend o raíz)
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

const BUCKET_OPTS = {
  public: true,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
};

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('No se encontró backend/.env');
    process.exit(1);
  }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SECRET_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY;
  }
}

loadEnv();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Configura SUPABASE_URL y SUPABASE_SECRET_KEY en backend/.env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'product-images';

const { data: existing, error: getError } = await supabase.storage.getBucket(BUCKET);

if (existing && !getError) {
  const { error } = await supabase.storage.updateBucket(BUCKET, BUCKET_OPTS);
  if (error) {
    console.error('No se pudo actualizar el bucket:', error.message);
    process.exit(1);
  }
  console.log('✓ Bucket product-images actualizado (público, sin límite de tamaño, JPG/PNG/WEBP)');
  process.exit(0);
}

const { error: createError } = await supabase.storage.createBucket(BUCKET, BUCKET_OPTS);

if (createError) {
  console.error('Error al crear bucket:', createError.message);
  console.log('\nSi falla por políticas RLS, ejecuta el SQL de:');
  console.log('  supabase/migrations/20250624120000_orders_tax_and_storage.sql');
  process.exit(1);
}

console.log('✓ Bucket product-images creado (público, sin límite de tamaño, JPG/PNG/WEBP)');
