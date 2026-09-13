import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const port = String(process.env.PORT || '3000');
const host = '0.0.0.0';
const root = process.cwd();
const standaloneDir = join(root, '.next', 'standalone');
const serverJs = join(standaloneDir, 'server.js');

if (!existsSync(serverJs)) {
  console.error(
    '[frontend] Falta .next/standalone/server.js. El build debe usar output: "standalone".',
  );
  process.exit(1);
}

const staticSrc = join(root, '.next', 'static');
const staticDest = join(standaloneDir, '.next', 'static');
const publicSrc = join(root, 'public');
const publicDest = join(standaloneDir, 'public');

if (existsSync(staticSrc)) {
  mkdirSync(join(standaloneDir, '.next'), { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
}

if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
}

console.log(`[frontend] standalone listen ${host}:${port}`);

const child = spawn(process.execPath, ['server.js'], {
  cwd: standaloneDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: host,
  },
});

child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
