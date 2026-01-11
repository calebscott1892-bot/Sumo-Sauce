const API_BASE = import.meta.env?.VITE_API_BASE_URL || '/api';

async function requestJson(path, { method = 'GET', body } = {}) {
	const res = await fetch(`${API_BASE}${path}`, {
		method,
		headers: body == null ? undefined : { 'Content-Type': 'application/json' },
		body: body == null ? undefined : JSON.stringify(body),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`API ${method} ${path} failed: ${res.status} ${text || res.statusText}`);
	}

	// Some endpoints may intentionally return empty.
	const raw = await res.text();
	return raw ? JSON.parse(raw) : null;
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
