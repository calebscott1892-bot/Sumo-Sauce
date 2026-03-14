export class SnapshotStoreError extends Error {
  code: string;

  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'SnapshotStoreError';
    this.code = code;
    this.details = details;
  }
}

export function snapshotStoreError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): SnapshotStoreError {
  return new SnapshotStoreError(code, message, details);
}
