import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next');
const port = process.env.PORT || '3001';

console.log(`[admin] next start 0.0.0.0:${port}`);

const child = spawn(process.execPath, [nextBin, 'start', '-H', '0.0.0.0', '-p', String(port)], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
