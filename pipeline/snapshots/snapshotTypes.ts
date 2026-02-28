import { z } from 'zod';

export const SourceSchema = z.enum(['jsa', 'sumodb', 'wikipedia', 'wikimedia']);

const IsoTimestampSchema = z.string().datetime({ offset: true });

export const StoredSnapshotMetaSchema = z
  .object({
    source: SourceSchema,
    contentSha256: z.string().regex(/^[a-f0-9]{64}$/),
    bytes: z.number().int().nonnegative(),
    contentType: z.string().min(1),
    httpStatus: z.number().int(),
  })
  .strict();

export const CaptureSnapshotMetaSchema = StoredSnapshotMetaSchema.extend({
  url: z.string().min(1),
  fetchedAt: IsoTimestampSchema.optional(),
  etag: z.string().min(1).optional(),
  lastModified: z.string().min(1).optional(),
}).strict();

// Backward-compatible alias for capture/provenance metadata.
export const SnapshotMetaSchema = CaptureSnapshotMetaSchema;

export const SourceRefSchema = z
  .object({
    source: SourceSchema,
    snapshotSha256: z.string().regex(/^[a-f0-9]{64}$/),
    url: z.string().min(1),
    refType: z.enum(['profile', 'banzuke', 'match', 'image']).optional(),
    note: z.string().trim().min(1).optional(),
  })
  .strict();

export type Source = z.infer<typeof SourceSchema>;
export type StoredSnapshotMeta = z.infer<typeof StoredSnapshotMetaSchema>;
export type CaptureSnapshotMeta = z.infer<typeof CaptureSnapshotMetaSchema>;
export type SnapshotMeta = CaptureSnapshotMeta;
export type SourceRef = z.infer<typeof SourceRefSchema>;
