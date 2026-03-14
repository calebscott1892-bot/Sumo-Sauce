import { z } from 'zod';

import { BashoIdSchema, DivisionSchema, SideSchema } from '../types.ts';

const NonEmpty = z.string().trim().min(1);

export const StagedRikishiSumoDBSchema = z
  .object({
    rikishiId: NonEmpty,
    shikona: NonEmpty,
    heya: NonEmpty.optional(),
    heightCm: z.number().positive().optional(),
    weightKg: z.number().positive().optional(),
    nationality: NonEmpty.optional(),
    snapshotSha256: z.string().regex(/^[a-f0-9]{64}$/),
    snapshotUrl: NonEmpty,
  })
  .strict();

export const StagedRikishiJSASchema = z
  .object({
    rikishiId: NonEmpty.optional(),
    shikona: NonEmpty,
    heya: NonEmpty.optional(),
    bashoId: BashoIdSchema.optional(),
    division: DivisionSchema.optional(),
    rankValue: z.number().int().positive().optional(),
    side: SideSchema.optional(),
    officialImageUrl: z.string().url().optional(),
    snapshotSha256: z.string().regex(/^[a-f0-9]{64}$/),
    snapshotUrl: NonEmpty,
  })
  .strict();

export const StagedRikishiWikipediaSchema = z
  .object({
    rikishiId: NonEmpty.optional(),
    shikona: NonEmpty.optional(),
    wikipediaTitle: NonEmpty,
    wikimediaFile: NonEmpty.optional(),
    snapshotSha256: z.string().regex(/^[a-f0-9]{64}$/),
    snapshotUrl: NonEmpty,
  })
  .strict();

export const StagedImageWikimediaSchema = z
  .object({
    wikimediaFile: NonEmpty,
    imageUrl: z.string().url(),
    snapshotSha256: z.string().regex(/^[a-f0-9]{64}$/),
    snapshotUrl: NonEmpty,
  })
  .strict();

export type StagedRikishiSumoDB = z.infer<typeof StagedRikishiSumoDBSchema>;
export type StagedRikishiJSA = z.infer<typeof StagedRikishiJSASchema>;
export type StagedRikishiWikipedia = z.infer<typeof StagedRikishiWikipediaSchema>;
export type StagedImageWikimedia = z.infer<typeof StagedImageWikimediaSchema>;
