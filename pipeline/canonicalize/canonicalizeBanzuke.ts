import { sortBanzukeEntries } from '../order.ts';
import { BanzukeEntrySchema, type BanzukeEntry, type SourceRef } from '../types.ts';
import { type StagedRikishiJSA } from '../staged/stagedTypes.ts';

function asKey(v: unknown): string {
  return String(v ?? '').trim().toLowerCase();
}

function toRef(row: StagedRikishiJSA): SourceRef {
  return {
    source: 'jsa',
    snapshotSha256: row.snapshotSha256,
    url: row.snapshotUrl,
    refType: 'banzuke',
  };
}

export function canonicalizeBanzuke(input: {
  jsa: StagedRikishiJSA[];
  rikishiIdByShikona: Map<string, string>;
}): BanzukeEntry[] {
  const out: BanzukeEntry[] = [];

  for (const row of input.jsa) {
    if (!row.bashoId || !row.division || row.rankValue === undefined || !row.side) continue;

    const rikishiId = row.rikishiId ?? input.rikishiIdByShikona.get(asKey(row.shikona));
    if (!rikishiId) continue;

    out.push(
      BanzukeEntrySchema.parse({
        bashoId: row.bashoId,
        division: row.division,
        rankValue: row.rankValue,
        side: row.side,
        rikishiId,
        sourceRefs: [toRef(row)],
      })
    );
  }

  return sortBanzukeEntries(out);
}
