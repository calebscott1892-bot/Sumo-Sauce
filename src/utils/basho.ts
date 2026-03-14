/**
 * Pure, deterministic basho-id helpers.
 * No backend calls — all logic is derived from the 6-digit YYYYMM format
 * and the fixed bimonthly schedule (Jan, Mar, May, Jul, Sep, Nov).
 */

const VALID_MONTHS = [1, 3, 5, 7, 9, 11] as const;
const BASHO_RE = /^\d{6}$/;

/** Month index in the 6-basho-per-year cycle (0-based). */
function monthIndex(month: number): number {
  return VALID_MONTHS.indexOf(month as (typeof VALID_MONTHS)[number]);
}

/** Parse a bashoId into year + month.  Returns null for invalid ids. */
export function parseBashoId(id: string): { year: number; month: number } | null {
  if (!BASHO_RE.test(id)) return null;
  const year = Number(id.slice(0, 4));
  const month = Number(id.slice(4, 6));
  if (monthIndex(month) === -1) return null;
  if (year < 1958 || year > 2100) return null;
  return { year, month };
}

/** Format year+month back to a 6-digit bashoId. */
export function formatBashoId(year: number, month: number): string {
  return `${String(year).padStart(4, '0')}${String(month).padStart(2, '0')}`;
}

/** Return the bashoId immediately before the given one, or null at the lower bound (195801). */
export function prevBashoId(id: string): string | null {
  const parsed = parseBashoId(id);
  if (!parsed) return null;
  const idx = monthIndex(parsed.month);
  if (idx > 0) {
    return formatBashoId(parsed.year, VALID_MONTHS[idx - 1]);
  }
  // wrap to previous year November
  if (parsed.year <= 1958) return null;
  return formatBashoId(parsed.year - 1, 11);
}

/** Return the bashoId immediately after the given one, or null at the upper bound. */
export function nextBashoId(id: string): string | null {
  const parsed = parseBashoId(id);
  if (!parsed) return null;
  const idx = monthIndex(parsed.month);
  if (idx < VALID_MONTHS.length - 1) {
    return formatBashoId(parsed.year, VALID_MONTHS[idx + 1]);
  }
  // wrap to next year January
  return formatBashoId(parsed.year + 1, 1);
}

/** Human-readable label: "January 2024", "March 2024", etc. */
export function bashoLabel(id: string): string {
  const parsed = parseBashoId(id);
  if (!parsed) return id;
  const monthNames: Record<number, string> = {
    1: 'January',
    3: 'March',
    5: 'May',
    7: 'July',
    9: 'September',
    11: 'November',
  };
  return `${monthNames[parsed.month] ?? parsed.month} ${parsed.year}`;
}

/** Traditional tournament name for the month. */
export function bashoTournamentName(id: string): string {
  const parsed = parseBashoId(id);
  if (!parsed) return '';
  const names: Record<number, string> = {
    1: 'Hatsu',
    3: 'Haru',
    5: 'Natsu',
    7: 'Nagoya',
    9: 'Aki',
    11: 'Kyushu',
  };
  return names[parsed.month] ?? '';
}

/** Full display: "Hatsu 2024 (January)" */
export function bashoDisplayName(id: string): string {
  const tournament = bashoTournamentName(id);
  const label = bashoLabel(id);
  if (!tournament) return label;
  const parsed = parseBashoId(id);
  if (!parsed) return label;
  const monthNames: Record<number, string> = {
    1: 'January', 3: 'March', 5: 'May', 7: 'July', 9: 'September', 11: 'November',
  };
  return `${tournament} ${parsed.year} (${monthNames[parsed.month]})`;
}

/** Capitalise a division name for display: "makuuchi" → "Makuuchi". */
export function divisionLabel(d: string): string {
  if (!d) return d;
  return d.charAt(0).toUpperCase() + d.slice(1);
}

/** Generate a list of recent basho IDs (descending) relative to a given date. */
export function recentBashoIds(count: number, before?: Date): string[] {
  const now = before ?? new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1-based

  // find the most recent valid basho month <= current month
  const validMonthsDesc = [...VALID_MONTHS].reverse();
  let startMonth = validMonthsDesc.find((m) => m <= month);
  if (!startMonth) {
    // current month is before January basho — go to prior year November
    year -= 1;
    startMonth = 11;
  }

  const out: string[] = [];
  let y = year;
  let idx = monthIndex(startMonth);

  while (out.length < count) {
    out.push(formatBashoId(y, VALID_MONTHS[idx]));
    idx -= 1;
    if (idx < 0) {
      idx = VALID_MONTHS.length - 1;
      y -= 1;
    }
    if (y < 1958) break;
  }

  return out;
}

/** Return the latest scheduled basho id relative to the current date. */
export function latestBashoId(before?: Date): string | null {
  return recentBashoIds(1, before)[0] ?? null;
}
