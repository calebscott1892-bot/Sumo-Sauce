import { logFn } from './_log';
import { nowIso, stableId } from './_ids';

function svgDataUri(label) {
  const safe = String(label || '').replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 24);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">\n  <rect width="100%" height="100%" fill="#2a2a2a"/>\n  <text x="50%" y="52%" font-family="sans-serif" font-size="14" fill="#e5e5e5" text-anchor="middle">${safe || 'Wrestler'}</text>\n</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default async function fetchWrestlerPhotos(input = {}) {
  logFn('fetchWrestlerPhotos', 'default', [input]);

  const ids = Array.isArray(input)
    ? input
    : Array.isArray(input.ids)
      ? input.ids
      : Array.isArray(input.wrestlerIds)
        ? input.wrestlerIds
        : [];

  const photosById = {};
  ids.forEach((id) => {
    const key = String(id || '').trim();
    if (!key) return;
    // Deterministic placeholder image.
    photosById[key] = svgDataUri(stableId('photo', key));
  });

  return {
    photosById,
    meta: {
      source: 'stub',
      generatedAt: nowIso(),
      note: 'replace with real backend later',
    },
  };
}
