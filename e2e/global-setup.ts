import { E2E_CONFIG } from './helpers/load-env';

async function assertReachable(url: string, label: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new Error(`${label} no responde (${res.status}). ¿Está corriendo npm run dev?`);
  }
}

export default async function globalSetup() {
  await assertReachable(`${E2E_CONFIG.apiBase.replace(/\/api\/v1$/, '')}/api/v1/health`, 'Backend');
  await assertReachable(`${E2E_CONFIG.adminBase}/login`, 'Admin');
}
