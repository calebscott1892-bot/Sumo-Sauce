export type ApiBaseSource = 'explicit' | 'local-proxy' | 'missing';

export type ApiBaseConfig = {
  baseUrl: string | null;
  source: ApiBaseSource;
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

function normalizeBaseUrl(value: string | undefined): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
}

function canUseLocalProxy(): boolean {
  if (typeof window === 'undefined') {
    return Boolean(import.meta.env?.DEV);
  }

  const host = String(window.location.hostname || '').trim().toLowerCase();
  return Boolean(import.meta.env?.DEV) || LOCAL_HOSTS.has(host);
}

function normalizeApiPath(path: string): string {
  const raw = String(path || '').trim();
  if (!raw) return '';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function getApiBaseConfig(): ApiBaseConfig {
  const explicitBase = normalizeBaseUrl(import.meta.env?.VITE_API_BASE_URL);
  if (explicitBase) {
    return { baseUrl: explicitBase, source: 'explicit' };
  }

  if (canUseLocalProxy()) {
    return { baseUrl: '/api', source: 'local-proxy' };
  }

  return { baseUrl: null, source: 'missing' };
}

export function getApiBaseUrl(): string | null {
  return getApiBaseConfig().baseUrl;
}

export function resolveApiUrl(path = ''): string | null {
  const base = getApiBaseUrl();
  if (!base) return null;
  const suffix = normalizeApiPath(path);
  return `${base}${suffix}`;
}

export function isApiConfigured(): boolean {
  return Boolean(getApiBaseUrl());
}

export function getApiUnavailableMessage(): string {
  const config = getApiBaseConfig();
  if (config.source === 'missing') {
    return 'Live data services are not configured for this deployment yet.';
  }
  return 'Live data services are temporarily unavailable.';
}
