/**
 * Inicia frontend, admin y backend en paralelo.
 * Uso: npm run dev
 */
const { spawn } = require('child_process');
const path = require('path');

const root = __dirname;

const services = [
  { name: 'backend', cwd: path.join(root, 'backend'), cmd: 'npm', args: ['run', 'start:dev'] },
  { name: 'frontend', cwd: path.join(root, 'frontend'), cmd: 'npm', args: ['run', 'dev'] },
  { name: 'admin', cwd: path.join(root, 'admin'), cmd: 'npm', args: ['run', 'dev'] },
];

console.log('Iniciando La Merced PyK...\n');
console.log('  Portal:   http://localhost:3000');
console.log('  Admin:    http://localhost:3001');
console.log('  API:      http://localhost:4000/api/v1');
console.log('  Swagger:  http://localhost:4000/api/docs\n');

for (const svc of services) {
  const child = spawn(svc.cmd, svc.args, {
    cwd: svc.cwd,
    shell: true,
    stdio: 'inherit',
  });

  child.on('error', (err) => {
    console.error(`[${svc.name}] Error:`, err.message);
  });
}

process.on('SIGINT', () => process.exit(0));
