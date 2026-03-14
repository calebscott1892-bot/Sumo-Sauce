import { createHash } from 'node:crypto';

export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

// Stable serializer: deterministic key order for all plain objects.
export function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = stableValue(obj[key]);
    }
    return out;
  }
  return value;
}

export function hashJson(value: unknown): string {
  return sha256Hex(stableStringify(value));
}

export function hashStableJson(value: unknown): string {
  return hashJson(value);
}
