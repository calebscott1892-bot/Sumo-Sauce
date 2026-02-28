import { sortBouts } from '../order.ts';
import { BoutSchema, type Bout, type FixtureBout } from '../types.ts';
import { hashJson } from '../hash.ts';

function computeBoutId(bout: FixtureBout): string {
  return hashJson({
    bashoId: bout.bashoId,
    day: bout.day,
    division: bout.division,
    boutNo: bout.boutNo,
    eastRikishiId: bout.eastRikishiId,
    westRikishiId: bout.westRikishiId,
  });
}

export function canonicalizeBouts(input?: { fixtureBouts?: FixtureBout[] }): Bout[] {
  if (!input?.fixtureBouts?.length) return [];

  const rows = input.fixtureBouts.map((row) =>
    BoutSchema.parse({
      ...row,
      boutId: computeBoutId(row),
    })
  );

  return sortBouts(rows);
}
