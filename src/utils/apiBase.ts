function normalizeBaseUrl(value: string | undefined): string {
  const raw = String(value || '').trim();
  if (!raw) return '/api';
  return raw.replace(/\/+$/, '');
}

function normalizeApiPath(path: string): string {
  const raw = String(path || '').trim();
  if (!raw) return '';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function getApiBaseUrl(): string {
  return normalizeBaseUrl(import.meta.env?.VITE_API_BASE_URL);
}

export function resolveApiUrl(path = ''): string {
  const base = getApiBaseUrl();
  const suffix = normalizeApiPath(path);
  return `${base}${suffix}`;
}
