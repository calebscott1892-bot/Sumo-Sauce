import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

const serverRoot = process.cwd();
const schemaDir = resolve(serverRoot, 'prisma');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();

function resolveSqlitePath(url) {
  if (!url.startsWith('file:')) return null;

  const rawPath = url.slice('file:'.length).split('?')[0].split('#')[0];
  if (!rawPath) return null;

  if (/^\/[A-Za-z]:[\\/]/.test(rawPath)) {
    return rawPath.slice(1);
  }

  if (isAbsolute(rawPath) || /^[A-Za-z]:[\\/]/.test(rawPath)) {
    return rawPath;
  }

  return resolve(schemaDir, rawPath);
}

function ensureSqliteFile(url) {
  const dbPath = resolveSqlitePath(url);
  if (!dbPath) return;

  mkdirSync(dirname(dbPath), { recursive: true });
  if (!existsSync(dbPath)) {
    closeSync(openSync(dbPath, 'a'));
  }
}

function spawnNpmScript(scriptName) {
  return process.platform === 'win32'
    ? spawn('cmd.exe', ['/d', '/s', '/c', `npm run ${scriptName}`], {
        cwd: serverRoot,
        env: process.env,
        stdio: 'inherit',
        windowsHide: false,
      })
    : spawn('npm', ['run', scriptName], {
        cwd: serverRoot,
        env: process.env,
        stdio: 'inherit',
      });
}

function runScript(scriptName) {
  return new Promise((resolvePromise, reject) => {
    const child = spawnNpmScript(scriptName);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${scriptName} exited via ${signal}`));
        return;
      }
      if ((code ?? 1) !== 0) {
        reject(new Error(`${scriptName} failed with exit code ${String(code)}`));
        return;
      }
      resolvePromise();
    });
    child.on('error', reject);
  });
}

async function main() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required before starting the hosted backend');
  }

  ensureSqliteFile(databaseUrl);
  await runScript('db:deploy');
  await runScript('start');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(`[start:hosted] ${String(error?.message || error)}`);
  process.exit(1);
});
