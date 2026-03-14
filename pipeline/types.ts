import { z } from 'zod';
import { SourceRefSchema } from './snapshots/snapshotTypes.ts';

const NonEmpty = z.string().trim().min(1);
const NonEmptyNoPlaceholder = NonEmpty.refine(
  (v) => !['n/a', 'na', 'null', 'undefined'].includes(v.toLowerCase()),
  'placeholder string is not allowed'
);

export const BashoIdSchema = z.string().regex(/^(19|20)\d{2}(0[1-9]|1[0-2])$/);
export const DivisionSchema = z.enum(['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi']);
export const SideSchema = z.enum(['east', 'west']);
export const BoutIdSchema = z.string().regex(/^[a-f0-9]{64}$/);

export type Division = z.infer<typeof DivisionSchema>;

// Invariant: omit missing keys, never serialize null/placeholder strings.
// Rikishi ID is internal and stable; do not derive from display-name.
export const RikishiSchema = z
  .object({
    rikishiId: NonEmptyNoPlaceholder,
    shikona: NonEmptyNoPlaceholder,
    heya: NonEmptyNoPlaceholder.optional(),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    heightCm: z.number().positive().optional(),
    weightKg: z.number().positive().optional(),
    nationality: NonEmptyNoPlaceholder.optional(),
    officialImageUrl: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    sourceRefs: z.array(SourceRefSchema).min(1).optional(),
  })
  .strict();

export const RikishiAliasSchema = z
  .object({
    rikishiId: NonEmptyNoPlaceholder,
    alias: NonEmptyNoPlaceholder,
    fromBashoId: BashoIdSchema.optional(),
    toBashoId: BashoIdSchema.optional(),
  })
  .strict();

export const BashoSchema = z
  .object({
    bashoId: BashoIdSchema,
    label: NonEmptyNoPlaceholder.optional(),
    sourceRefs: z.array(SourceRefSchema).min(1).optional(),
  })
  .strict();

export const BanzukeEntrySchema = z
  .object({
    bashoId: BashoIdSchema,
    division: DivisionSchema,
    rankValue: z.number().int().positive(),
    side: SideSchema,
    rikishiId: NonEmptyNoPlaceholder,
    rankLabel: NonEmptyNoPlaceholder.optional(),
    sourceRefs: z.array(SourceRefSchema).min(1).optional(),
  })
  .strict();

export const BoutSchema = z
  .object({
    boutId: BoutIdSchema,
    bashoId: BashoIdSchema,
    day: z.number().int().min(1).max(15),
    division: DivisionSchema,
    boutNo: z.number().int().min(1).max(200),
    eastRikishiId: NonEmptyNoPlaceholder,
    westRikishiId: NonEmptyNoPlaceholder,
    winnerRikishiId: NonEmptyNoPlaceholder.optional(),
    kimariteId: NonEmptyNoPlaceholder.optional(),
    sourceRefs: z.array(SourceRefSchema).min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.winnerRikishiId !== undefined
      && value.winnerRikishiId !== value.eastRikishiId
      && value.winnerRikishiId !== value.westRikishiId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'winnerRikishiId must match eastRikishiId or westRikishiId',
        path: ['winnerRikishiId'],
      });
    }
  });

export const KimariteSchema = z
  .object({
    kimariteId: NonEmptyNoPlaceholder,
    label: NonEmptyNoPlaceholder.optional(),
    sourceRefs: z.array(SourceRefSchema).min(1).optional(),
  })
  .strict();

export const FixtureRikishiSchema = RikishiSchema;
export const FixtureBashoSchema = BashoSchema;
export const FixtureBanzukeEntrySchema = BanzukeEntrySchema;

// Fixtures omit `boutId`; build computes canonical deterministic boutId.
export const FixtureBoutSchema = z
  .object({
    bashoId: BashoIdSchema,
    day: z.number().int().min(1).max(15),
    division: DivisionSchema,
    boutNo: z.number().int().min(1).max(200),
    eastRikishiId: NonEmptyNoPlaceholder,
    westRikishiId: NonEmptyNoPlaceholder,
    winnerRikishiId: NonEmptyNoPlaceholder.optional(),
    kimariteId: NonEmptyNoPlaceholder.optional(),
    sourceRefs: z.array(SourceRefSchema).min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.winnerRikishiId !== undefined
      && value.winnerRikishiId !== value.eastRikishiId
      && value.winnerRikishiId !== value.westRikishiId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'winnerRikishiId must match eastRikishiId or westRikishiId',
        path: ['winnerRikishiId'],
      });
    }
  });

export const FixtureKimariteSchema = KimariteSchema;
export const FixtureRikishiAliasSchema = RikishiAliasSchema;

export type Rikishi = z.infer<typeof RikishiSchema>;
export type RikishiAlias = z.infer<typeof RikishiAliasSchema>;
export type Basho = z.infer<typeof BashoSchema>;
export type BanzukeEntry = z.infer<typeof BanzukeEntrySchema>;
export type Bout = z.infer<typeof BoutSchema>;
export type Kimarite = z.infer<typeof KimariteSchema>;
export type SourceRef = z.infer<typeof SourceRefSchema>;

export type FixtureRikishi = z.infer<typeof FixtureRikishiSchema>;
export type FixtureRikishiAlias = z.infer<typeof FixtureRikishiAliasSchema>;
export type FixtureBasho = z.infer<typeof FixtureBashoSchema>;
export type FixtureBanzukeEntry = z.infer<typeof FixtureBanzukeEntrySchema>;
export type FixtureBout = z.infer<typeof FixtureBoutSchema>;
export type FixtureKimarite = z.infer<typeof FixtureKimariteSchema>;
