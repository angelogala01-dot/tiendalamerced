import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function parseEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const root = resolve(__dirname, '../..');

parseEnvFile(resolve(root, 'backend/.env'));
parseEnvFile(resolve(root, 'admin/.env.local'));
parseEnvFile(resolve(root, 'e2e/.env'));

export const E2E_CONFIG = {
  adminEmail: process.env.E2E_ADMIN_EMAIL ?? 'admin@lamerced.com',
  adminPassword: process.env.E2E_ADMIN_PASSWORD ?? 'Admin123!',
  supabaseUrl: (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(
    /\/$/,
    '',
  ),
  supabaseAnonKey:
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    '',
  apiBase: process.env.E2E_API_URL ?? 'http://localhost:4000/api/v1',
  adminBase: process.env.E2E_ADMIN_URL ?? 'http://localhost:3001',
  storeBase: process.env.E2E_STORE_URL ?? 'http://localhost:3000',
};
