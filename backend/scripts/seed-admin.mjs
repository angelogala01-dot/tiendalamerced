/**
 * Crea usuario administrador de prueba en Supabase.
 * Uso: npm run seed:admin (desde la raíz) o npm run seed:admin (desde backend)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

const DEV_ADMIN = {
  email: 'admin@lamerced.com',
  password: 'Admin123!',
  full_name: 'Administrador Prueba',
  role: 'super_admin',
};

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('No se encontró backend/.env — configura Supabase primero.');
    process.exit(1);
  }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
  // Alias claves nuevas de Supabase
  if (!process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_PUBLISHABLE_KEY) {
    process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SECRET_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY;
  }
}

loadEnv();

const url = process.env.SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!url || url.includes('your-project')) {
  console.error('Configura SUPABASE_URL en backend/.env');
  process.exit(1);
}

if (!serviceKey?.trim()) {
  console.error(`
❌ Falta SUPABASE_SECRET_KEY en backend/.env

El script seed:admin necesita la SECRET KEY (no la publishable).

1. Abre https://supabase.com/dashboard → proyecto idbzttrtzmhrlwsomphz
2. Settings → API → copia "secret key" (sb_secret_...)
3. Pégala en backend/.env:

   SUPABASE_SECRET_KEY=sb_secret_...
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

4. Vuelve a ejecutar: npm run seed:admin
`);
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('Creando usuario admin de prueba...\n');

  const { data: listData } = await supabase.auth.admin.listUsers();
  const found = listData?.users?.find((u) => u.email === DEV_ADMIN.email);

  let userId;

  if (found) {
    userId = found.id;
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: DEV_ADMIN.password,
      email_confirm: true,
      app_metadata: { role: DEV_ADMIN.role },
    });
    if (error) throw error;
    console.log('Usuario ya existía — contraseña y rol actualizados.');
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: DEV_ADMIN.email,
      password: DEV_ADMIN.password,
      email_confirm: true,
      user_metadata: { full_name: DEV_ADMIN.full_name },
      app_metadata: { role: DEV_ADMIN.role },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log('Usuario creado en Supabase Auth.');
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: DEV_ADMIN.full_name,
      role: DEV_ADMIN.role,
      is_active: true,
    })
    .eq('id', userId);

  if (profileError) {
    console.warn('Aviso al actualizar perfil:', profileError.message);
  }

  console.log('\n✓ Credenciales de prueba (solo desarrollo):\n');
  console.log('  Panel admin:  http://localhost:3001/login');
  console.log(`  Email:        ${DEV_ADMIN.email}`);
  console.log(`  Contraseña:   ${DEV_ADMIN.password}`);
  console.log(`  Rol:          ${DEV_ADMIN.role}\n`);
}

main().catch((err) => {
  console.error('Error:', err.message ?? err);
  process.exit(1);
});
