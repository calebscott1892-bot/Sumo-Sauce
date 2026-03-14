const BASHO_ID_RE = /^(19|20)\d{2}(0[1-9]|1[0-2])$/;
const VALID_MONTHS = new Set([1, 3, 5, 7, 9, 11]);

function parseBashoId(bashoId: string): { year: number; month: number } {
  const id = String(bashoId || '').trim();
  if (!BASHO_ID_RE.test(id)) {
    throw new Error(`Invalid bashoId format: ${bashoId}`);
  }

  const year = Number(id.slice(0, 4));
  const month = Number(id.slice(4, 6));

  if (!VALID_MONTHS.has(month)) {
    throw new Error(`Invalid basho month (must be one of 01,03,05,07,09,11): ${bashoId}`);
  }

  return { year, month };
}

function formatBashoId(year: number, month: number): string {
  return `${String(year).padStart(4, '0')}${String(month).padStart(2, '0')}`;
}

function compareBashoId(a: string, b: string): number {
  return a.localeCompare(b);
}

export function validateBashoId(bashoId: string): string {
  const { year, month } = parseBashoId(bashoId);
  return formatBashoId(year, month);
}

export function generateBashoRange(from: string, to: string): string[] {
  const fromId = validateBashoId(from);
  const toId = validateBashoId(to);

  if (compareBashoId(fromId, toId) > 0) {
    throw new Error(`Invalid range: from (${fromId}) must be <= to (${toId})`);
  }

  const out: string[] = [];
  let { year, month } = parseBashoId(fromId);

  while (true) {
    const curr = formatBashoId(year, month);
    out.push(curr);
    if (curr === toId) break;

    if (month === 11) {
      year += 1;
      month = 1;
    } else {
      month += 2;
    }
  }

  return out;
}
