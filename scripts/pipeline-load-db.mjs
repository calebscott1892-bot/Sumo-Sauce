#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
  if (result.status !== 0) {
    const out = result.stdout || '';
    const err = result.stderr || '';
    throw new Error(`${command} ${args.join(' ')} failed\n${out}\n${err}`);
  }
  return result.stdout.trim();
}

function parseLastJsonLine(text) {
  const lines = String(text || '').split('\n').map((x) => x.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(lines[i]);
    } catch {
      continue;
    }
  }
  throw new Error(`No JSON line found in output:\n${text}`);
}

function main() {
  const buildRaw = run('node', ['--experimental-strip-types', 'pipeline/build.ts']);
  const buildJson = parseLastJsonLine(buildRaw);
  const buildId = String(buildJson.buildId || '').trim();
  if (!buildId) throw new Error('pipeline/build.ts did not return buildId');

  run('npm', ['--prefix', 'server', 'run', 'db:push']);

  const diffRaw = run('node', ['--experimental-strip-types', 'pipeline/db/diff.ts', '--build-id', buildId]);
  const diffJson = parseLastJsonLine(diffRaw);

  const loadArgs = ['--experimental-strip-types', 'pipeline/db/load.ts', '--build-id', buildId];
  if (diffJson.previousBuildId) {
    loadArgs.push('--previous-build-id', String(diffJson.previousBuildId));
  }
  const loadRaw = run('node', loadArgs);
  const loadJson = parseLastJsonLine(loadRaw);

  const summary = {
    buildId,
    previousBuildId: diffJson.previousBuildId || null,
    diff: diffJson.counts,
    load: {
      noop: Boolean(loadJson.noop),
      counts: loadJson.counts,
    },
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
