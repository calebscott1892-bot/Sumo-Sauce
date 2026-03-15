import { getApiBaseUrl } from '@/utils/apiBase';

const API_BASE = getApiBaseUrl();

const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

// --- In-memory response cache (TTL = 60 s) ---
const CACHE_TTL_MS = 60_000;
const _cache = new Map();

function _cacheKey(method, path) {
	return `${method}:${path}`;
}

function _getCached(key) {
	const entry = _cache.get(key);
	if (!entry) return undefined;
	if (Date.now() - entry.ts > CACHE_TTL_MS) {
		_cache.delete(key);
		return undefined;
	}
	return entry.data;
}

function _setCache(key, data) {
	_cache.set(key, { data, ts: Date.now() });
}

function makeStructuredError(message, status) {
	return { error: true, message, status: status || 0 };
}

function isRetryable(status) {
	return status === 0 || status === 502 || status === 503 || status === 504 || status >= 520;
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(path, { method = 'GET', body } = {}) {
	// Check cache for GET requests
	const cacheKey = method === 'GET' && body == null ? _cacheKey(method, path) : null;
	if (cacheKey) {
		const cached = _getCached(cacheKey);
		if (cached !== undefined) return cached;
	}

	let lastError = null;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		if (attempt > 0) {
			await sleep(RETRY_DELAY_MS * attempt);
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

		try {
			const res = await fetch(`${API_BASE}${path}`, {
				method,
				headers: body == null ? undefined : { 'Content-Type': 'application/json' },
				body: body == null ? undefined : JSON.stringify(body),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (res.status === 404) {
				throw Object.assign(
					new Error(`Not found: ${path}`),
					{ structured: makeStructuredError('The requested resource was not found.', 404) }
				);
			}

			if (res.status >= 500) {
				lastError = Object.assign(
					new Error(`Server error ${res.status}`),
					{ structured: makeStructuredError('The server encountered an error. Please try again later.', res.status) }
				);
				if (isRetryable(res.status) && attempt < MAX_RETRIES) continue;
				throw lastError;
			}

			if (!res.ok) {
				const text = await res.text().catch(() => '');
				throw Object.assign(
					new Error(`API ${method} ${path} failed: ${res.status} ${text || res.statusText}`),
					{ structured: makeStructuredError(`Request failed (${res.status}).`, res.status) }
				);
			}

			// Some endpoints may intentionally return empty.
			const raw = await res.text();
			const result = raw ? JSON.parse(raw) : null;
			if (cacheKey) _setCache(cacheKey, result);
			return result;
		} catch (err) {
			clearTimeout(timeoutId);

			if (err?.structured) {
				// non-retryable structured errors (like 404) throw immediately
				if (!isRetryable(err.structured.status)) throw err;
				lastError = err;
				if (attempt < MAX_RETRIES) continue;
				throw lastError;
			}

			if (err.name === 'AbortError') {
				lastError = Object.assign(
					new Error(`Request timed out: ${path}`),
					{ structured: makeStructuredError('Request timed out. Please check your connection.', 0) }
				);
				if (attempt < MAX_RETRIES) continue;
				throw lastError;
			}

			// Network error
			lastError = Object.assign(
				err,
				{ structured: makeStructuredError('API unavailable. Please check your connection.', 0) }
			);
			if (attempt < MAX_RETRIES) continue;
			throw lastError;
		}
	}

	throw lastError || new Error('Request failed');
}

const BULK_ENABLED = new Set(['BashoRecord', 'Match', 'Wrestler']);

function makeEntityApi(entity) {
	return {
		async list(sort, limit) {
			const qs = new URLSearchParams();
			if (sort) qs.set('sort', String(sort));
			if (typeof limit === 'number' && Number.isFinite(limit)) qs.set('limit', String(limit));
			const suffix = qs.toString() ? `?${qs.toString()}` : '';
			return requestJson(`/entities/${encodeURIComponent(entity)}${suffix}`);
		},

		async create(payload) {
			return requestJson(`/entities/${encodeURIComponent(entity)}`, {
				method: 'POST',
				body: payload,
			});
		},

		async update(id, patch) {
			return requestJson(`/entities/${encodeURIComponent(entity)}/${encodeURIComponent(String(id))}`, {
				method: 'PATCH',
				body: patch,
			});
		},

		async delete(id) {
			return requestJson(`/entities/${encodeURIComponent(entity)}/${encodeURIComponent(String(id))}`, {
				method: 'DELETE',
			});
		},

		async bulkCreate(items) {
			if (!BULK_ENABLED.has(entity)) {
				return Object.assign([], { created: 0 });
			}

			const out = await requestJson(`/entities/${encodeURIComponent(entity)}/bulk`, {
				method: 'POST',
				body: Array.isArray(items) ? items : [],
			});

			const arr = Array.isArray(out?.items) ? out.items : [];
			const created = typeof out?.created === 'number' ? out.created : arr.length;
			return Object.assign(arr, { created });
		},
	};
}

const entities = new Proxy(
	{},
	{
		get(_target, prop) {
			if (typeof prop !== 'string') return undefined;
			return makeEntityApi(prop);
		},
	}
);

export const api = {
	entities,
	auth: {
		async me() {
			return requestJson('/auth/me');
		},
		async updateMe(data) {
			return requestJson('/auth/me', { method: 'PATCH', body: data });
		},
	},

	// Present for API compatibility.
	integrations: { Core: {} },
};
