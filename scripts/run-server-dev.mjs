import { spawn } from 'node:child_process';

const port = process.argv[2] || '8790';
const env = {
  ...process.env,
  PORT: process.env.PORT || port,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'dev-token',
};

const child = process.platform === 'win32'
  ? spawn('cmd.exe', ['/d', '/s', '/c', 'npm --prefix server run dev'], {
      stdio: 'inherit',
      env,
      windowsHide: false,
    })
  : spawn('npm', ['--prefix', 'server', 'run', 'dev'], {
      stdio: 'inherit',
      env,
    });

function forwardSignal(signal) {
  if (!child.killed) {
    child.kill(signal);
  }
}

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
