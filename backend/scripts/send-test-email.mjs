/**
 * Envía un correo de prueba con Resend.
 * Uso: node scripts/send-test-email.mjs
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
const to = process.env.RESEND_TEST_TO?.trim() || 'delivered@resend.dev';

if (!apiKey || !from) {
  console.error('Faltan RESEND_API_KEY o RESEND_FROM en backend/.env');
  process.exit(1);
}

const resend = new Resend(apiKey);

const { data, error } = await resend.emails.send(
  {
    from,
    to: [to],
    subject: 'Prueba Resend — La Merced',
    html: '<p>Resend está configurado en La Merced.</p>',
    text: 'Resend está configurado en La Merced.',
    tags: [{ name: 'category', value: 'resend-test' }],
  },
  { idempotencyKey: `resend-test/${Date.now()}` },
);

if (error) {
  console.error('Resend error:', error.message);
  process.exit(1);
}

console.log('Correo de prueba enviado:', data?.id);
