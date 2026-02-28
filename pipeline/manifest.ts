import { z } from 'zod';
import { SourceSchema } from './snapshots/snapshotTypes.ts';

export const FixtureInputSchema = z.object({
  path: z.string(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sizeBytes: z.number().int().nonnegative(),
  records: z.number().int().nonnegative(),
});

export const SnapshotInputSchema = z.object({
  source: SourceSchema,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  url: z.string().min(1),
  bytes: z.number().int().nonnegative(),
});

export const OutputFileSchema = z.object({
  path: z.string(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: z.number().int().nonnegative(),
  rows: z.number().int().nonnegative(),
});

export const BuildManifestSchema = z.object({
  buildId: z.string().regex(/^[a-f0-9]{64}$/),
  pipelineVersion: z.string(),
  schemaVersion: z.string(),
  inputs: z.object({
    fixtures: z.array(FixtureInputSchema).min(1),
    snapshots: z.array(SnapshotInputSchema),
  }),
  outputs: z.object({
    staged: z.array(OutputFileSchema),
    canonical: z.array(OutputFileSchema).min(1),
  }),
});

export type BuildManifest = z.infer<typeof BuildManifestSchema>;
export type OutputFile = z.infer<typeof OutputFileSchema>;
export type SnapshotInput = z.infer<typeof SnapshotInputSchema>;
