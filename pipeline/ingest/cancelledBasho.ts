/**
 * Known cancelled / void basho that have no bout or rikishi data.
 * These are skipped during ingestion rather than treated as failures.
 *
 * 201103 — Haru (March) 2011: cancelled due to the match-fixing scandal.
 *   The SumoDB banzuke page exists but contains zero Rikishi.aspx?r= links.
 *
 * 202005 — Natsu (May) 2020: cancelled due to COVID-19 pandemic.
 *   The SumoDB banzuke page exists but contains zero Rikishi.aspx?r= links.
 */
export const CANCELLED_BASHO = new Set<string>([
  '201103',
  '202005',
]);

export function isCancelledBasho(bashoId: string): boolean {
  return CANCELLED_BASHO.has(String(bashoId).trim());
}
