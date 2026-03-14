const PREFIX = '[fn]';

function truncate(str, max = 120) {
  if (typeof str !== 'string') return str;
  if (str.length <= max) return str;
  return `${str.slice(0, max)}…`;
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '"[unserializable]"';
  }
}

function summarize(value) {
  if (value == null) return String(value);
  if (typeof value === 'string') return truncate(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    const preview = value.slice(0, 5).map(summarize);
    const suffix = value.length > 5 ? `, …(+${value.length - 5})` : '';
    return `[${preview.join(', ')}${suffix}]`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value).slice(0, 6);
    const entries = keys.map((k) => `${k}:${summarize(value[k])}`);
    const suffix = Object.keys(value).length > 6 ? ', …' : '';
    return `{${entries.join(', ')}${suffix}}`;
  }

  return truncate(safeJson(value));
}

export function logFn(moduleName, exportName, args = []) {
  const parts = Array.isArray(args) ? args : [args];
  const argSummary = parts.map(summarize).join(', ');
  // Single concise log line, deterministic formatting.
  // eslint-disable-next-line no-console
  console.log(`${PREFIX} ${moduleName}.${exportName}(${argSummary})`);
}
