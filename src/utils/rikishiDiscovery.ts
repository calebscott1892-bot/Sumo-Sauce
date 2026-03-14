import type { RikishiDirectoryEntry } from '../../shared/api/v1';

function normalize(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function scoreField(value: string, query: string, exact: number, prefix: number, partial: number): number {
  if (!value) return Number.POSITIVE_INFINITY;
  if (value === query) return exact;
  if (value.startsWith(query)) return prefix;
  if (value.includes(query)) return partial;
  return Number.POSITIVE_INFINITY;
}

export function sortRikishiDirectory(entries: readonly RikishiDirectoryEntry[]): RikishiDirectoryEntry[] {
  return [...entries].sort(
    (a, b) =>
      a.shikona.localeCompare(b.shikona) ||
      (a.heya || '').localeCompare(b.heya || '') ||
      a.rikishiId.localeCompare(b.rikishiId),
  );
}

export function searchSortedRikishiDirectory(
  entries: readonly RikishiDirectoryEntry[],
  rawQuery: string,
  limit: number,
): RikishiDirectoryEntry[] {
  const query = normalize(rawQuery);
  if (!query) return entries.slice(0, limit);

  return entries
    .map((entry) => {
      const shikona = normalize(entry.shikona);
      const heya = normalize(entry.heya);
      const rikishiId = normalize(entry.rikishiId);
      const score = Math.min(
        scoreField(shikona, query, 0, 1, 3),
        scoreField(rikishiId, query, 0, 1, 2),
        scoreField(heya, query, 2, 4, 5),
      );

      return { entry, score };
    })
    .filter((item) => Number.isFinite(item.score))
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.entry.shikona.localeCompare(b.entry.shikona) ||
        a.entry.rikishiId.localeCompare(b.entry.rikishiId),
    )
    .slice(0, limit)
    .map((item) => item.entry);
}
