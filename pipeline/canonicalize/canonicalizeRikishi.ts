import { sortRikishi } from '../order.ts';
import {
  RikishiSchema,
  type Rikishi,
  type SourceRef,
} from '../types.ts';
import {
  type StagedImageWikimedia,
  type StagedRikishiJSA,
  type StagedRikishiSumoDB,
  type StagedRikishiWikipedia,
} from '../staged/stagedTypes.ts';

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function asKey(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function dedupeSourceRefs(items: SourceRef[]): SourceRef[] {
  const seen = new Set<string>();
  const out: SourceRef[] = [];
  for (const item of items) {
    const key = `${item.source}:${item.snapshotSha256}:${item.url}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out.sort(
    (a, b) =>
      a.source.localeCompare(b.source)
      || a.snapshotSha256.localeCompare(b.snapshotSha256)
      || a.url.localeCompare(b.url)
  );
}

function toRef(source: 'sumodb' | 'jsa' | 'wikipedia' | 'wikimedia', snapshotSha256: string, url: string, refType: 'profile' | 'image'): SourceRef {
  return {
    source,
    snapshotSha256,
    url,
    refType,
  };
}

export function canonicalizeRikishi(input: {
  sumodb: StagedRikishiSumoDB[];
  jsa: StagedRikishiJSA[];
  wikipedia: StagedRikishiWikipedia[];
  wikimedia: StagedImageWikimedia[];
}): Rikishi[] {
  const wikimediaByFile = new Map<string, StagedImageWikimedia>();
  for (const row of input.wikimedia) {
    wikimediaByFile.set(asKey(row.wikimediaFile), row);
  }

  const wikiByIdOrName = new Map<string, StagedRikishiWikipedia>();
  for (const row of input.wikipedia) {
    if (row.rikishiId) wikiByIdOrName.set(asKey(row.rikishiId), row);
    if (row.shikona) wikiByIdOrName.set(asKey(row.shikona), row);
    wikiByIdOrName.set(asKey(row.wikipediaTitle), row);
  }

  const jsaByIdOrName = new Map<string, StagedRikishiJSA>();
  for (const row of input.jsa) {
    if (row.rikishiId) jsaByIdOrName.set(asKey(row.rikishiId), row);
    jsaByIdOrName.set(asKey(row.shikona), row);
  }

  const keys = new Set<string>();
  for (const row of input.sumodb) keys.add(asKey(row.rikishiId));
  for (const row of input.jsa) {
    if (row.rikishiId) keys.add(asKey(row.rikishiId));
    else keys.add(`name:${asKey(row.shikona)}`);
  }
  for (const row of input.wikipedia) {
    if (row.rikishiId) keys.add(asKey(row.rikishiId));
    else if (row.shikona) keys.add(`name:${asKey(row.shikona)}`);
    else keys.add(`title:${asKey(row.wikipediaTitle)}`);
  }

  const sumodbByKey = new Map<string, StagedRikishiSumoDB>();
  for (const row of input.sumodb) sumodbByKey.set(asKey(row.rikishiId), row);

  const rows: Rikishi[] = [];
  for (const key of [...keys].sort()) {
    const sumo = sumodbByKey.get(key);
    const jsa = jsaByIdOrName.get(key) ?? (sumo ? jsaByIdOrName.get(asKey(sumo.shikona)) : undefined);
    const wiki = wikiByIdOrName.get(key)
      ?? (sumo ? wikiByIdOrName.get(asKey(sumo.shikona)) : undefined)
      ?? (jsa ? wikiByIdOrName.get(asKey(jsa.shikona)) : undefined);

    // Deterministic precedence rules:
    // 1) Identity prefers SumoDB rikishiId when present.
    // 2) Text/stable/physical fields prefer SumoDB, then JSA, then Wikipedia fallback.
    // 3) Image prefers official JSA URL, else Wikimedia stable URL resolved from Wikipedia file mapping.
    const rikishiId = sumo?.rikishiId
      ?? jsa?.rikishiId
      ?? wiki?.rikishiId
      ?? slug(sumo?.shikona ?? jsa?.shikona ?? wiki?.shikona ?? wiki?.wikipediaTitle ?? key);

    const shikona = sumo?.shikona ?? jsa?.shikona ?? wiki?.shikona ?? wiki?.wikipediaTitle;
    if (!shikona) continue;

    const wikiImageFile = wiki?.wikimediaFile ? wikimediaByFile.get(asKey(wiki.wikimediaFile)) : undefined;

    const refs: SourceRef[] = [];
    if (sumo) refs.push(toRef('sumodb', sumo.snapshotSha256, sumo.snapshotUrl, 'profile'));
    if (jsa) refs.push(toRef('jsa', jsa.snapshotSha256, jsa.snapshotUrl, 'profile'));
    if (wiki) refs.push(toRef('wikipedia', wiki.snapshotSha256, wiki.snapshotUrl, 'profile'));
    if (wikiImageFile) refs.push(toRef('wikimedia', wikiImageFile.snapshotSha256, wikiImageFile.snapshotUrl, 'image'));

    rows.push(
      RikishiSchema.parse({
        rikishiId,
        shikona,
        heya: sumo?.heya ?? jsa?.heya,
        heightCm: sumo?.heightCm,
        weightKg: sumo?.weightKg,
        nationality: sumo?.nationality,
        officialImageUrl: jsa?.officialImageUrl,
        imageUrl: jsa?.officialImageUrl ? undefined : wikiImageFile?.imageUrl,
        sourceRefs: dedupeSourceRefs(refs),
      })
    );
  }

  return sortRikishi(rows);
}
