const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';

const services = [
  { name: 'EXPRESS-BACKEND', color: '\x1b[36m', command: 'node', args: ['backend/server.js'] },
  { name: 'FLASK-API',       color: '\x1b[33m', command: 'python', args: ['backend/api.py'] },
  { name: 'ML-SERVICE',      color: '\x1b[35m', command: 'python', args: ['ml-service/app.py'] },
  { name: 'FRONTEND',        color: '\x1b[32m', command: isWin ? 'cmd.exe' : 'npm', args: isWin ? ['/c', 'npm', '--prefix', 'frontend', 'run', 'dev'] : ['--prefix', 'frontend', 'run', 'dev'] }
];

const children = [];

function log(service, data) {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      console.log(`${service.color}[${service.name}]\x1b[0m ${line}`);
    }
  });
}

console.log('\x1b[1m\x1b[34m====================================================\x1b[0m');
console.log('\x1b[1m\x1b[34m🚀 STARTING ALL SYSTEM SERVICES (BACKENDS & FRONTEND)\x1b[0m');
console.log('\x1b[1m\x1b[34m====================================================\x1b[0m\n');

let isShuttingDown = false;

function startService(service) {
  if (isShuttingDown) return;
  const child = spawn(service.command, service.args, {
    cwd: __dirname,
    shell: service.shell || false,
    env: { ...process.env, FORCE_COLOR: 'true' }
  });

  child.stdout.on('data', data => log(service, data));
  child.stderr.on('data', data => log(service, data));

  child.on('close', code => {
    console.log(`${service.color}[${service.name}]\x1b[0m Process exited with code ${code}`);
    if (!isShuttingDown && (service.name === 'EXPRESS-BACKEND' || service.name === 'FLASK-API') && code !== 0) {
      console.log(`${service.color}[${service.name}]\x1b[0m 🔄 Unexpected exit detected. Auto-restarting in 2s...`);
      setTimeout(() => startService(service), 2000);
    }
  });

  children.push(child);
  return child;
}

services.forEach(service => startService(service));

function cleanup() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n\x1b[31m🛑 Shutting down all services...\x1b[0m');
  children.forEach(child => {
    if (child && !child.killed) {
      try { child.kill(); } catch (_) {}
    }
  });
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
