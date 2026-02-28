import express from 'express';
import { z } from 'zod';
import {
  getRikishiById,
  getCareerTimeline,
  getRankProgression,
  getKimariteStats,
  getBashoById,
  getDivisionStandings,
  getBoutsByBashoAndDivision,
  getHeadToHead,
} from '../../../pipeline/read/index.mjs';
import { createApiError, requestLogger, rateLimiter, sendInvalidParameter } from './middleware.mjs';

const router = express.Router();

const DIVISION_VALUES = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'];
const DIVISIONS = new Set(DIVISION_VALUES);

const DivisionSchema = z.enum(DIVISION_VALUES);
const RankRecordSchema = z.object({
  totalWins: z.number(),
  totalLosses: z.number(),
  totalAbsences: z.number(),
});
const CareerSummarySchema = z.object({
  rikishiId: z.string(),
  shikona: z.string(),
  heya: z.string().nullable(),
  debutBasho: z.string(),
  retirementBasho: z.string().nullable(),
  careerRecord: RankRecordSchema,
  highestRank: z.object({
    division: DivisionSchema,
    rank: z.string(),
    bashoId: z.string(),
  }),
});
const TimelineItemSchema = z.object({
  bashoId: z.string(),
  division: DivisionSchema,
  rank: z.string(),
  wins: z.number(),
  losses: z.number(),
});
const RankProgressionItemSchema = TimelineItemSchema.extend({
  kachiKoshi: z.boolean(),
  makeKoshi: z.boolean(),
  yusho: z.boolean(),
});
const KimariteBreakdownSchema = z.object({
  kimariteId: z.string(),
  count: z.number(),
  percentage: z.number(),
});
const KimariteStatsSchema = z.object({
  rikishiId: z.string(),
  totalWins: z.number(),
  totalLosses: z.number(),
  winKimarite: z.array(KimariteBreakdownSchema),
  lossKimarite: z.array(KimariteBreakdownSchema),
  mostUsedKimarite: z.string().nullable(),
});
const BashoSummarySchema = z.object({
  bashoId: z.string(),
  divisions: z.object({
    makuuchi: z.object({ bouts: z.number() }),
    juryo: z.object({ bouts: z.number() }),
    makushita: z.object({ bouts: z.number() }),
    sandanme: z.object({ bouts: z.number() }),
    jonidan: z.object({ bouts: z.number() }),
    jonokuchi: z.object({ bouts: z.number() }),
  }),
});
const BoutSchema = z.object({
  boutId: z.string(),
  bashoId: z.string(),
  division: DivisionSchema,
  day: z.number(),
  boutNo: z.number(),
  eastRikishiId: z.string(),
  westRikishiId: z.string(),
  winnerRikishiId: z.string().nullable(),
  kimariteId: z.string().nullable(),
});
const HeadToHeadSchema = z.object({
  rikishiA: z.string(),
  rikishiB: z.string(),
  totalMatches: z.number(),
  rikishiAWins: z.number(),
  rikishiBWins: z.number(),
  lastMatch: z
    .object({
      bashoId: z.string(),
      division: DivisionSchema,
      day: z.number(),
      winnerRikishiId: z.string().nullable(),
    })
    .nullable(),
});
const DivisionStandingRowSchema = z.object({
  rikishiId: z.string(),
  shikona: z.string(),
  rank: z.string(),
  wins: z.number(),
  losses: z.number(),
  winPercentage: z.number(),
  kimariteBreakdown: z.array(
    z.object({
      kimariteId: z.string(),
      count: z.number(),
    })
  ),
});

function asNonEmpty(value) {
  const v = String(value || '').trim();
  return v;
}

function validateRikishiId(value) {
  const v = asNonEmpty(value);
  return v ? v : null;
}

function validateBashoId(value) {
  const v = asNonEmpty(value);
  return /^\d{6}$/.test(v) ? v : null;
}

function validateDivision(value) {
  const v = asNonEmpty(value).toLowerCase();
  return DIVISIONS.has(v) ? v : null;
}

function normalizeForJson(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(normalizeForJson);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = normalizeForJson(v);
    }
    return out;
  }
  return value;
}

function sendJson(res, payload) {
  res.json(normalizeForJson(payload));
}

function validateResponse(schema, payload) {
  const normalized = normalizeForJson(payload);
  const parsed = schema.safeParse(normalized);
  if (!parsed.success) {
    throw new Error('API response shape validation failed');
  }
  return parsed.data;
}

function sendValidatedJson(res, schema, payload) {
  try {
    const validated = validateResponse(schema, payload);
    sendJson(res, validated);
  } catch {
    throw createApiError({
      status: 500,
      code: 'INTERNAL',
      message: 'Internal server error',
    });
  }
}

function withApiErrorHandling(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

router.use(requestLogger);
router.use(rateLimiter);

router.get('/rikishi/:id', withApiErrorHandling(async (req, res, next) => {
  const id = validateRikishiId(req.params.id);
  if (!id) return next(sendInvalidParameter({ id: 'rikishiId must be non-empty' }));

  const out = await getRikishiById(id);
  return sendValidatedJson(res, CareerSummarySchema, out);
}));

router.get('/rikishi/:id/timeline', withApiErrorHandling(async (req, res, next) => {
  const id = validateRikishiId(req.params.id);
  if (!id) return next(sendInvalidParameter({ id: 'rikishiId must be non-empty' }));

  const out = await getCareerTimeline(id);
  return sendValidatedJson(res, z.array(TimelineItemSchema), out);
}));

router.get('/rikishi/:id/rank-progression', withApiErrorHandling(async (req, res, next) => {
  const id = validateRikishiId(req.params.id);
  if (!id) return next(sendInvalidParameter({ id: 'rikishiId must be non-empty' }));

  const out = await getRankProgression(id);
  return sendValidatedJson(res, z.array(RankProgressionItemSchema), out);
}));

router.get('/rikishi/:id/kimarite', withApiErrorHandling(async (req, res, next) => {
  const id = validateRikishiId(req.params.id);
  if (!id) return next(sendInvalidParameter({ id: 'rikishiId must be non-empty' }));

  const out = await getKimariteStats(id);
  return sendValidatedJson(res, KimariteStatsSchema, out);
}));

router.get('/basho/:id', withApiErrorHandling(async (req, res, next) => {
  const bashoId = validateBashoId(req.params.id);
  if (!bashoId) return next(sendInvalidParameter({ id: 'bashoId must match /^\\d{6}$/' }));

  const out = await getBashoById(bashoId);
  return sendValidatedJson(res, BashoSummarySchema, out);
}));

router.get('/basho/:id/:division', withApiErrorHandling(async (req, res, next) => {
  const bashoId = validateBashoId(req.params.id);
  if (!bashoId) return next(sendInvalidParameter({ id: 'bashoId must match /^\\d{6}$/' }));

  const division = validateDivision(req.params.division);
  if (!division) {
    return next(sendInvalidParameter({ division: `division must be one of: ${[...DIVISIONS].join(', ')}` }, 'Invalid division'));
  }

  await getBashoById(bashoId);
  const out = await getDivisionStandings(bashoId, division);
  return sendValidatedJson(res, z.array(DivisionStandingRowSchema), out);
}));

router.get('/bouts/:bashoId/:division', withApiErrorHandling(async (req, res, next) => {
  const bashoId = validateBashoId(req.params.bashoId);
  if (!bashoId) return next(sendInvalidParameter({ bashoId: 'bashoId must match /^\\d{6}$/' }));

  const division = validateDivision(req.params.division);
  if (!division) {
    return next(sendInvalidParameter({ division: `division must be one of: ${[...DIVISIONS].join(', ')}` }, 'Invalid division'));
  }

  await getBashoById(bashoId);
  const out = await getBoutsByBashoAndDivision(bashoId, division);
  return sendValidatedJson(res, z.array(BoutSchema), out);
}));

router.get('/head-to-head/:a/:b', withApiErrorHandling(async (req, res, next) => {
  const a = validateRikishiId(req.params.a);
  const b = validateRikishiId(req.params.b);
  if (!a || !b) {
    return next(sendInvalidParameter({ a: 'rikishiId must be non-empty', b: 'rikishiId must be non-empty' }));
  }

  const out = await getHeadToHead(a, b);
  return sendValidatedJson(res, HeadToHeadSchema, out);
}));

export default router;
