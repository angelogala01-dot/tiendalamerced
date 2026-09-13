import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next');
const port = String(process.env.PORT || '3001');
const host = '0.0.0.0';
const buildId = join(process.cwd(), '.next', 'BUILD_ID');

if (!existsSync(buildId)) {
  console.error('[admin] Falta .next/BUILD_ID. El build de Next no se generó correctamente.');
  process.exit(1);
}

console.log(`[admin] next start ${host}:${port}`);

const child = spawn(process.execPath, [nextBin, 'start', '-H', host, '-p', port], {
  stdio: 'inherit',
  env: { ...process.env, PORT: port, HOSTNAME: host },
});

child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
