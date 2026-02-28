const WINDOW_MS = 60_000;
const MAX_REQ_PER_WINDOW = 100;

const rateByIp = new Map();

function nowMs() {
  return Date.now();
}

function asLocalIp(ip) {
  const text = String(ip || '').trim();
  return text === '127.0.0.1' || text === '::1' || text === '::ffff:127.0.0.1';
}

function rateLimitKey(req) {
  const ip = String(req.ip || req.socket?.remoteAddress || 'unknown');
  const localKey = String(req.headers?.['x-rate-limit-key'] || '').trim();
  if (localKey && asLocalIp(ip)) return `${ip}|${localKey}`;
  return ip;
}

function cleanWindow(ip, now) {
  const rec = rateByIp.get(ip);
  if (!rec) return null;
  if (now - rec.windowStart >= WINDOW_MS) {
    const next = { windowStart: now, count: 0 };
    rateByIp.set(ip, next);
    return next;
  }
  return rec;
}

export function requestLogger(req, res, next) {
  const started = nowMs();
  res.on('finish', () => {
    const durationMs = nowMs() - started;
    // eslint-disable-next-line no-console
    console.log(`[api] ${req.method} ${req.path} ${durationMs}ms`);
  });
  next();
}

export class ApiHttpError extends Error {
  constructor(input) {
    super(input.message);
    this.name = 'ApiHttpError';
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
    this.retryAfterSeconds = input.retryAfterSeconds;
  }
}

export function createApiError(input) {
  return new ApiHttpError(input);
}

function notFoundPayloadFromMessage(message) {
  const msg = String(message || '').toLowerCase();
  if (msg.includes('rikishi not found') || msg.includes('no banzuke entries')) {
    return { code: 'RIKISHI_NOT_FOUND', message: 'Rikishi not found' };
  }
  if (msg.includes('basho not found')) {
    return { code: 'BASHO_NOT_FOUND', message: 'Basho not found' };
  }
  return { code: 'NOT_FOUND', message: 'Not found' };
}

export function isNotFoundError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('not found') || msg.includes('no banzuke entries');
}

export function rateLimiter(req, res, next) {
  const now = nowMs();
  const key = rateLimitKey(req);
  const rec = cleanWindow(key, now) || { windowStart: now, count: 0 };
  rec.count += 1;
  rateByIp.set(key, rec);

  if (rec.count > MAX_REQ_PER_WINDOW) {
    const elapsedMs = now - rec.windowStart;
    const retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - elapsedMs) / 1000));
    next(
      createApiError({
        status: 429,
        code: 'RATE_LIMITED',
        message: 'Rate limit exceeded',
        retryAfterSeconds,
      })
    );
    return;
  }

  next();
}

export function sendInvalidParameter(details, message = 'Invalid parameter') {
  return createApiError({
    status: 400,
    code: 'INVALID_PARAMETER',
    message,
    details,
  });
}

export function apiErrorHandler(err, _req, res, _next) {
  if (res.headersSent) return;

  if (err instanceof ApiHttpError) {
    const payload = {
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.details !== undefined) payload.error.details = err.details;
    if (err.retryAfterSeconds !== undefined) payload.retryAfterSeconds = err.retryAfterSeconds;
    res.status(err.status).json(payload);
    return;
  }

  if (isNotFoundError(err)) {
    res.status(404).json({ error: notFoundPayloadFromMessage(err?.message) });
    return;
  }

  // eslint-disable-next-line no-console
  console.error('[api][error]', String(err?.message || err));
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
}
