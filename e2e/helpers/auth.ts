import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { E2E_CONFIG } from './load-env';

const MAX_COOKIE_CHUNK = 3180;

type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: Record<string, unknown>;
};

function storageKey(supabaseUrl: string) {
  const ref = new URL(supabaseUrl).hostname.split('.')[0];
  return `sb-${ref}-auth-token`;
}

function encodeSessionValue(sessionJson: string) {
  return `base64-${Buffer.from(sessionJson, 'utf8').toString('base64url')}`;
}

function chunkCookie(key: string, encoded: string) {
  if (encoded.length <= MAX_COOKIE_CHUNK) {
    return [{ name: key, value: encoded }];
  }
  const chunks: Array<{ name: string; value: string }> = [];
  for (let i = 0, index = 0; i < encoded.length; i += MAX_COOKIE_CHUNK, index += 1) {
    chunks.push({ name: `${key}.${index}`, value: encoded.slice(i, i + MAX_COOKIE_CHUNK) });
  }
  return chunks;
}

export async function getStaffSession(request: APIRequestContext): Promise<SupabaseSession> {
  const { supabaseUrl, supabaseAnonKey, adminEmail, adminPassword } = E2E_CONFIG;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan SUPABASE_URL y clave anon en backend/.env o admin/.env.local para tests E2E autenticados.',
    );
  }

  const res = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    data: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(
      `Login Supabase falló (${res.status()}). Ejecuta npm run seed:admin. Detalle: ${body.slice(0, 200)}`,
    );
  }

  const json = (await res.json()) as SupabaseSession;
  if (!json.access_token) {
    throw new Error('Supabase no devolvió access_token');
  }

  return json;
}

export async function getStaffAccessToken(request: APIRequestContext): Promise<string> {
  const session = await getStaffSession(request);
  return session.access_token;
}

async function setSupabaseAuthCookies(page: Page, session: SupabaseSession) {
  const key = storageKey(E2E_CONFIG.supabaseUrl);
  const encoded = encodeSessionValue(JSON.stringify(session));
  const entries = chunkCookie(key, encoded);

  await page.context().addCookies(
    entries.map(({ name, value }) => ({
      name,
      value,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    })),
  );
}

/** Login por UI tras hidratar React (sesión válida en el cliente Supabase). */
export async function loginAsAdmin(page: Page, _request?: APIRequestContext) {
  await page.goto('/login');
  await expect(page.getByLabel('Correo electrónico')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /acceder al panel/i })).toBeEnabled();

  await page.getByLabel('Correo electrónico').fill(E2E_CONFIG.adminEmail);
  await page.getByLabel('Contraseña').fill(E2E_CONFIG.adminPassword);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 25_000 }),
    page.getByRole('button', { name: /acceder al panel/i }).click(),
  ]);

  await expect(page).not.toHaveURL(/\/login\?/);
}

/** Login solo con cookies (útil para API); opcional para UI. */
export async function loginAsAdminWithCookies(page: Page, request: APIRequestContext) {
  const session = await getStaffSession(request);
  await setSupabaseAuthCookies(page, session);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

export function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
