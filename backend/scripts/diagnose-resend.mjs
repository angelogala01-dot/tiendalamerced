/**
 * Diagnóstico rápido de Resend (no imprime la API key).
 * Uso: node scripts/diagnose-resend.mjs [correo-destino]
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('No se encontró backend/.env');
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
}

loadEnv();

const apiKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.RESEND_FROM?.trim();
const to = (process.argv[2] || process.env.RESEND_TEST_TO || 'delivered@resend.dev').trim();

console.log('from:', from);
console.log('to:', to);
console.log('apiKey:', apiKey ? `re_…${apiKey.slice(-6)}` : '(vacía)');
console.log('sandbox onboarding@resend.dev:', /onboarding@resend\.dev/i.test(from || ''));

if (!apiKey || !from) {
  console.error('Faltan RESEND_API_KEY o RESEND_FROM');
  process.exit(1);
}

const resend = new Resend(apiKey);
const { data, error } = await resend.emails.send(
  {
    from,
    to: [to],
    subject: 'Diagnóstico Resend — La Merced',
    html: '<p>Prueba de envío desde La Merced.</p>',
    text: 'Prueba de envío desde La Merced.',
  },
  { idempotencyKey: `resend-diag/${Date.now()}` },
);

if (error) {
  console.error('ERROR Resend:', error.message);
  console.error('detalle:', JSON.stringify(error, null, 2));
  process.exit(1);
}

console.log('OK id:', data?.id);
