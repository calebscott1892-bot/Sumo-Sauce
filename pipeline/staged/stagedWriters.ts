import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { sha256Hex, stableStringify } from '../hash.ts';
import { type OutputFile } from '../manifest.ts';
import {
  type StagedImageWikimedia,
  type StagedRikishiJSA,
  type StagedRikishiSumoDB,
  type StagedRikishiWikipedia,
} from './stagedTypes.ts';

export type StagedOutputs = {
  sumodbRikishi: StagedRikishiSumoDB[];
  jsaRikishi: StagedRikishiJSA[];
  wikipediaRikishi: StagedRikishiWikipedia[];
  wikimediaImages: StagedImageWikimedia[];
};

function asKey(v: unknown): string {
  return String(v ?? '').trim().toLowerCase();
}

function writeAtomic(filePath: string, bytes: Buffer): Promise<void> {
  return mkdir(path.dirname(filePath), { recursive: true }).then(async () => {
    const tempPath = `${filePath}.tmp-${process.pid}`;
    await writeFile(tempPath, bytes);
    await rename(tempPath, filePath);
  });
}

async function writeJsonlRows(filePath: string, rows: Array<Record<string, unknown>>, outPath: string): Promise<OutputFile> {
  const text = rows.map((r) => `${stableStringify(r)}\n`).join('');
  const bytes = Buffer.from(text, 'utf8');
  await writeAtomic(filePath, bytes);

  return {
    path: outPath,
    sha256: sha256Hex(bytes),
    bytes: bytes.byteLength,
    rows: rows.length,
  };
}

export async function writeStagedOutputs(
  buildDir: string,
  outputs: StagedOutputs
): Promise<{ files: OutputFile[]; outputPaths: string[] }> {
  const stagedDir = path.join(buildDir, 'staged');
  await mkdir(stagedDir, { recursive: true });

  const sumodb = [...outputs.sumodbRikishi].sort(
    (a, b) => asKey(a.rikishiId).localeCompare(asKey(b.rikishiId)) || asKey(a.shikona).localeCompare(asKey(b.shikona))
  );
  const jsa = [...outputs.jsaRikishi].sort(
    (a, b) =>
      asKey(a.rikishiId).localeCompare(asKey(b.rikishiId))
      || asKey(a.shikona).localeCompare(asKey(b.shikona))
      || asKey(a.bashoId).localeCompare(asKey(b.bashoId))
      || Number(a.rankValue ?? Number.MAX_SAFE_INTEGER) - Number(b.rankValue ?? Number.MAX_SAFE_INTEGER)
  );
  const wiki = [...outputs.wikipediaRikishi].sort(
    (a, b) => asKey(a.rikishiId).localeCompare(asKey(b.rikishiId)) || asKey(a.wikipediaTitle).localeCompare(asKey(b.wikipediaTitle))
  );
  const media = [...outputs.wikimediaImages].sort(
    (a, b) => asKey(a.wikimediaFile).localeCompare(asKey(b.wikimediaFile)) || asKey(a.imageUrl).localeCompare(asKey(b.imageUrl))
  );

  const files = [
    await writeJsonlRows(
      path.join(stagedDir, 'sumodb_rikishi.jsonl'),
      sumodb as unknown as Array<Record<string, unknown>>,
      'staged/sumodb_rikishi.jsonl'
    ),
    await writeJsonlRows(
      path.join(stagedDir, 'jsa_rikishi.jsonl'),
      jsa as unknown as Array<Record<string, unknown>>,
      'staged/jsa_rikishi.jsonl'
    ),
    await writeJsonlRows(
      path.join(stagedDir, 'wikipedia_rikishi.jsonl'),
      wiki as unknown as Array<Record<string, unknown>>,
      'staged/wikipedia_rikishi.jsonl'
    ),
    await writeJsonlRows(
      path.join(stagedDir, 'wikimedia_images.jsonl'),
      media as unknown as Array<Record<string, unknown>>,
      'staged/wikimedia_images.jsonl'
    ),
  ].sort((a, b) => a.path.localeCompare(b.path));

  return {
    files,
    outputPaths: files.map((f) => path.join(buildDir, f.path)),
  };
}
