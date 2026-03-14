/**
 * Security and validation utilities.
 * Enforces strict input constraints on user-facing route parameters
 * to prevent navigation to invalid or malicious URLs.
 */

/** Months when honbasho tournaments are held (bimonthly, odd months). */
const VALID_BASHO_MONTHS = new Set([1, 3, 5, 7, 9, 11]);

/** Strict 6-digit bashoId format: YYYYMM */
const BASHO_STRICT_RE = /^\d{6}$/;

/** Allowlist for API path segments — only alphanumeric, hyphens, underscores, dots. */
const SAFE_PATH_SEGMENT_RE = /^[a-zA-Z0-9._-]+$/;

/**
 * Validate a bashoId strictly.
 * Must be 6 digits, year ≥ 1958 and ≤ 2100, month ∈ {01,03,05,07,09,11}.
 */
export function isValidBashoId(id: string): boolean {
  if (!BASHO_STRICT_RE.test(id)) return false;
  const year = Number(id.slice(0, 4));
  const month = Number(id.slice(4, 6));
  if (year < 1958 || year > 2100) return false;
  return VALID_BASHO_MONTHS.has(month);
}

/**
 * Sanitise a string for safe use as a URL path segment.
 * Strips any characters that are not alphanumeric, hyphens, underscores, or dots.
 * Returns the sanitised string or null if the result is empty.
 */
export function sanitizePathSegment(value: string): string | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  // Remove anything that isn't safe
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, '');
  return safe || null;
}

/**
 * Validate an API URL to ensure it only targets the expected origin.
 * Returns true only if the URL is a relative path starting with /api/.
 */
export function isValidApiUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  // Must be a relative path starting with /api/
  if (url.startsWith('/api/')) return true;
  // Reject any absolute URL or protocol-relative URL
  if (url.includes('://') || url.startsWith('//')) return false;
  return false;
}

/**
 * Validate a rikishi ID for safe use in routes.
 * Allows alphanumeric characters, underscores, and hyphens.
 */
export function isValidRikishiId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const trimmed = id.trim();
  if (!trimmed || trimmed.length > 128) return false;
  return SAFE_PATH_SEGMENT_RE.test(trimmed);
}

/** Valid division values */
const VALID_DIVISIONS = new Set([
  'makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi',
]);

/**
 * Validate a division string.
 */
export function isValidDivision(value: string): boolean {
  return VALID_DIVISIONS.has(String(value || '').trim().toLowerCase());
}
