export type IngestErrorCode =
  | 'OFFLINE_FIXTURE_MISSING'
  | 'FETCH_FAILED'
  | 'PARSE_FAILED'
  | 'SOURCE_BLOCKED'
  | 'SOURCE_CHANGED'
  | 'VALIDATION_FAILED'
  | 'SHIKONA_MAP_MISS'
  | 'SHIKONA_MAP_AMBIGUOUS'
  | 'SUMODB_ID_MAP_MISS';

export class IngestError extends Error {
  code: IngestErrorCode;

  source?: string;

  url?: string;

  bashoId?: string;

  details?: string;

  constructor(input: {
    code: IngestErrorCode;
    message: string;
    source?: string;
    url?: string;
    bashoId?: string;
    details?: string;
  }) {
    super(input.message);
    this.name = 'IngestError';
    this.code = input.code;
    this.source = input.source;
    this.url = input.url;
    this.bashoId = input.bashoId;
    this.details = input.details;
  }
}

export function toCompactIngestError(err: unknown): string {
  const e: any = err;
  if (e?.name === 'IngestError') {
    const parts = [
      `code=${String(e.code || 'UNKNOWN')}`,
      e.bashoId ? `bashoId=${String(e.bashoId)}` : '',
      e.source ? `source=${String(e.source)}` : '',
      e.url ? `url=${String(e.url)}` : '',
      e.message ? `message=${String(e.message).replace(/\s+/g, ' ').trim()}` : '',
    ].filter(Boolean);
    const text = parts.join(' ');
    return text.length > 2000 ? `${text.slice(0, 1997)}...` : text;
  }

  const raw = String(e?.stack || e || 'Unknown error').replace(/\s+/g, ' ').trim();
  return raw.length > 2000 ? `${raw.slice(0, 1997)}...` : raw;
}
