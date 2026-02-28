import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import apiV1Router from './api/v1/router.mjs';
import { apiErrorHandler } from './api/v1/middleware.mjs';

const prisma = new PrismaClient();

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = Number.parseInt(process.env.PORT || '8787', 10);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const IMPORT_WRITE_CHUNK_SIZE = 200;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const authClient =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

const adminClient =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin (no Origin header), and local Vite dev.
      if (!origin) return cb(null, true);
      const ok =
        origin === 'http://127.0.0.1:5173' ||
        origin === 'http://localhost:5173' ||
        origin === `http://127.0.0.1:${PORT}` ||
        origin === `http://localhost:${PORT}`;
      return cb(ok ? null : new Error('Not allowed by CORS'), ok);
    },
    credentials: false,
  })
);

function coerceComparable(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const s = String(v);
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  const n = Number(s);
  if (!Number.isNaN(n)) return n;
  return s.toLowerCase();
}

function logStartupEnv() {
  // eslint-disable-next-line no-console
  console.log('[startup][env]');
  // eslint-disable-next-line no-console
  console.log(`SUPABASE_URL=${Boolean(SUPABASE_URL)}`);
  // eslint-disable-next-line no-console
  console.log(`SUPABASE_ANON_KEY=${Boolean(SUPABASE_ANON_KEY)}`);
  // eslint-disable-next-line no-console
  console.log(`SUPABASE_SERVICE_ROLE_KEY=${Boolean(SUPABASE_SERVICE_ROLE_KEY)}`);
}

function extractBearerToken(req) {
  const raw = req.headers?.authorization;
  if (!raw || typeof raw !== 'string') return null;

  const [scheme, token] = raw.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

async function getUserFromToken(token) {
  if (!authClient || !token) return null;

  try {
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

async function optionalAuth(req, _res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    req.user = null;
    next();
    return;
  }

  const user = await getUserFromToken(token);
  if (!user) {
    // eslint-disable-next-line no-console
    console.log('[auth][optional] invalid token (non-fatal)');
    req.user = null;
    next();
    return;
  }

  req.user = user;
  next();
}

async function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    // eslint-disable-next-line no-console
    console.log('[auth][required] unauthorized');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = await getUserFromToken(token);
  if (!user) {
    // eslint-disable-next-line no-console
    console.log('[auth][required] unauthorized');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.user = user;
  next();
}

function requireAdminToken(req, res, next) {
  const headerToken = req.headers['x-admin-token'];
  if (!ADMIN_TOKEN || typeof headerToken !== 'string' || headerToken !== ADMIN_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

function isDryRun(req) {
  return String(req.query.dry_run || '0') === '1';
}

function createImportReport() {
  return {
    dry_run: false,
    received_count: 0,
    created_count: 0,
    skipped_duplicates_count: 0,
    failed_validation_count: 0,
    missing_fk_count: 0,
    failures: [],
  };
}

function pushFailure(report, failure) {
  report.failed_validation_count += 1;
  if (report.failures.length < 50) {
    report.failures.push(failure);
  }
}

function isUniqueConstraintError(err) {
  return err?.code === 'P2002' || /Unique constraint failed/i.test(String(err?.message || err));
}

async function insertEntityRowsInChunks(entity, rows) {
  let insertedCount = 0;
  let duplicateCount = 0;

  for (let i = 0; i < rows.length; i += IMPORT_WRITE_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + IMPORT_WRITE_CHUNK_SIZE);
    const createManyData = chunk.map((row) => ({
      entity,
      id: String(row.id),
      data: row.data,
    }));

    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await prisma.entityRecord.createMany({
        data: createManyData,
        skipDuplicates: true,
      });
      const inserted = Number(result?.count || 0);
      insertedCount += inserted;
      duplicateCount += createManyData.length - inserted;
    } catch (_createManyErr) {
      // Fallback path if createMany/skipDuplicates is unavailable in the current engine.
      for (const row of createManyData) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await prisma.entityRecord.create({ data: row });
          insertedCount += 1;
        } catch (err) {
          if (isUniqueConstraintError(err)) {
            duplicateCount += 1;
          } else {
            throw err;
          }
        }
      }
    }
  }

  return { insertedCount, duplicateCount };
}

function sortRows(rows, sort) {
  if (!sort || typeof sort !== 'string') return rows;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  if (!field) return rows;

  const copy = [...rows];
  copy.sort((a, b) => {
    const av = coerceComparable(a?.[field]);
    const bv = coerceComparable(b?.[field]);

    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
  return copy;
}

async function nextId(entity) {
  const row = await prisma.entityCounter.upsert({
    where: { entity },
    update: { value: { increment: 1 } },
    create: { entity, value: 1 },
  });
  return `${String(entity).toLowerCase()}_${row.value}`;
}

async function getRecord(entity, id) {
  return prisma.entityRecord.findUnique({ where: { entity_id: { entity, id } } });
}

const DIVISIONS = new Set(['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi']);

class DomainApiError extends Error {
  constructor(kind, code, message, status = 400) {
    super(message);
    this.name = 'DomainApiError';
    this.kind = kind;
    this.code = code;
    this.status = status;
  }
}

function classifyDomainError(err) {
  if (err instanceof DomainApiError) {
    return {
      status: err.status,
      body: {
        error: {
          type: err.kind,
          code: err.code,
          message: err.message,
        },
      },
    };
  }

  if (err?.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    return {
      status: 500,
      body: {
        error: {
          type: 'db',
          code: err.code,
          message: 'Domain query failed',
        },
      },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        type: 'app',
        code: 'DOMAIN_API_UNHANDLED',
        message: 'Unexpected domain API failure',
      },
    },
  };
}

function sendDomainError(res, err) {
  const out = classifyDomainError(err);
  res.status(out.status).json(out.body);
}

function parseDomainLimit(limitRaw) {
  const defaultLimit = 200;
  if (limitRaw === undefined) return defaultLimit;

  const limit = Number.parseInt(String(limitRaw), 10);
  if (!Number.isFinite(limit) || Number.isNaN(limit)) {
    throw new DomainApiError('query', 'INVALID_LIMIT', 'limit must be an integer', 400);
  }
  if (limit < 1 || limit > 1000) {
    throw new DomainApiError('query', 'INVALID_LIMIT_RANGE', 'limit must be between 1 and 1000', 400);
  }
  return limit;
}

function parseDivision(divisionRaw) {
  if (divisionRaw === undefined || divisionRaw === null || String(divisionRaw).trim() === '') return undefined;
  const division = String(divisionRaw).trim().toLowerCase();
  if (!DIVISIONS.has(division)) {
    throw new DomainApiError('query', 'INVALID_DIVISION', 'division query param is invalid', 400);
  }
  return division;
}

async function getLatestSuccessBuildId() {
  const latest = await prisma.build.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: [{ createdAt: 'desc' }],
    select: { buildId: true },
  });
  return latest?.buildId || null;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/v1', apiV1Router);
app.use('/api/v1', apiErrorHandler);

app.get('/movements', optionalAuth, async (req, res) => {
  const mine = String(req.query.mine || '') === '1';

  if (mine && !req.user) {
    res.json([]);
    return;
  }

  if (!adminClient) {
    res.json([]);
    return;
  }

  try {
    let query = adminClient.from('movements').select('*');

    if (mine && req.user) {
      query = query.eq('user_id', req.user.id);
    }

    const { data, error } = await query;
    if (error) {
      res.json([]);
      return;
    }

    res.json(Array.isArray(data) ? data : []);
  } catch {
    res.json([]);
  }
});

app.post('/movements', requireAuth, async (req, res, next) => {
  try {
    if (!adminClient) {
      res.status(500).json({ error: 'Server misconfigured' });
      return;
    }

    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const movement = { ...payload, user_id: req.user.id };

    const { data, error } = await adminClient
      .from('movements')
      .insert(movement)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to create movement');
    }

    res.json(data);
  } catch (e) {
    next(e);
  }
});

app.post('/api/admin/import/wrestlers', requireAdminToken, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body)) {
      res.status(400).json({ error: 'Payload must be a JSON array' });
      return;
    }

    const report = createImportReport();
    report.dry_run = isDryRun(req);
    report.received_count = req.body.length;

    const seenIncoming = new Set();
    const createRows = [];

    for (let index = 0; index < req.body.length; index += 1) {
      const item = req.body[index];

      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        pushFailure(report, { index, reason: 'item must be an object' });
        continue;
      }

      const rid = String(item.rid || '').trim();
      const shikona = String(item.shikona || '').trim();
      if (!rid || !shikona) {
        pushFailure(report, { index, rid: rid || null, reason: 'missing required fields: rid, shikona' });
        continue;
      }

      if (seenIncoming.has(rid)) {
        report.skipped_duplicates_count += 1;
        continue;
      }

      seenIncoming.add(rid);
      createRows.push({ id: rid, data: { ...item, rid, shikona } });
    }

    if (!report.dry_run && createRows.length > 0) {
      const { insertedCount, duplicateCount } = await insertEntityRowsInChunks('Wrestler', createRows);
      report.created_count += insertedCount;
      report.skipped_duplicates_count += duplicateCount;
    }

    res.json(report);
  } catch (e) {
    next(e);
  }
});

app.post('/api/admin/patch-wrestler-images', requireAdminToken, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body)) {
      res.status(400).json({ error: 'Payload must be a JSON array' });
      return;
    }

    const normalizeUrl = (v) => {
      if (typeof v !== 'string') return '';
      const trimmed = v.trim();
      if (!trimmed) return '';
      if (!/^https?:\/\//i.test(trimmed)) return '';
      return trimmed;
    };

    const report = {
      received_count: req.body.length,
      updated_count: 0,
      skipped_missing_rid_count: 0,
      skipped_not_found_count: 0,
      skipped_no_fields_count: 0,
      failures: [],
    };

    const dedupedByRid = new Map();
    for (let index = 0; index < req.body.length; index += 1) {
      const item = req.body[index];
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        if (report.failures.length < 50) {
          report.failures.push({ index, reason: 'item must be an object' });
        }
        continue;
      }

      const rid = String(item.rid || '').trim();
      if (!rid) {
        report.skipped_missing_rid_count += 1;
        continue;
      }

      const officialImageUrl = normalizeUrl(item.official_image_url);
      const imageUrl = normalizeUrl(item?.image?.url);

      const candidate = { rid };
      if (officialImageUrl) candidate.official_image_url = officialImageUrl;
      if (imageUrl) candidate.image = { url: imageUrl };

      if (!candidate.official_image_url && !candidate.image?.url) {
        report.skipped_no_fields_count += 1;
        continue;
      }

      dedupedByRid.set(rid, candidate);
    }

    const candidates = [...dedupedByRid.values()];
    if (candidates.length === 0) {
      res.json(report);
      return;
    }

    const ridList = candidates.map((row) => row.rid);
    const existingRows = await prisma.entityRecord.findMany({
      where: { entity: 'Wrestler', id: { in: ridList } },
      select: { id: true, data: true },
    });
    const existingByRid = new Map(existingRows.map((row) => [String(row.id), row.data]));

    for (const candidate of candidates) {
      const currentData = existingByRid.get(candidate.rid);
      if (!currentData || typeof currentData !== 'object') {
        report.skipped_not_found_count += 1;
        continue;
      }

      const mergedImage = {
        ...(currentData?.image && typeof currentData.image === 'object' ? currentData.image : {}),
      };
      if (candidate.image?.url) {
        mergedImage.url = candidate.image.url;
      }

      const data = {
        ...currentData,
        rid: candidate.rid,
      };

      if (candidate.official_image_url) {
        data.official_image_url = candidate.official_image_url;
      }
      if (candidate.image?.url) {
        data.image = mergedImage;
      }

      // eslint-disable-next-line no-await-in-loop
      await prisma.entityRecord.update({
        where: { entity_id: { entity: 'Wrestler', id: candidate.rid } },
        data: { data },
      });
      report.updated_count += 1;
    }

    res.json(report);
  } catch (e) {
    next(e);
  }
});

app.post('/api/admin/import/basho-records', requireAdminToken, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body)) {
      res.status(400).json({ error: 'Payload must be a JSON array' });
      return;
    }

    const report = createImportReport();
    report.dry_run = isDryRun(req);
    report.received_count = req.body.length;
    const seenIncoming = new Set();
    const prelimRows = [];

    for (let index = 0; index < req.body.length; index += 1) {
      const item = req.body[index];

      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        pushFailure(report, { index, reason: 'item must be an object' });
        continue;
      }

      const recordId = String(item.record_id || '').trim();
      const rid = String(item.rid || '').trim();
      if (!recordId || !rid) {
        pushFailure(report, {
          index,
          record_id: recordId || null,
          rid: rid || null,
          reason: 'missing required fields: record_id, rid',
        });
        continue;
      }

      if (seenIncoming.has(recordId)) {
        report.skipped_duplicates_count += 1;
        continue;
      }

      seenIncoming.add(recordId);
      prelimRows.push({ index, recordId, rid, item });
    }

    const uniqueRids = [...new Set(prelimRows.map((r) => r.rid))];
    const wrestlerRows = uniqueRids.length
      ? await prisma.entityRecord.findMany({
          where: { entity: 'Wrestler', id: { in: uniqueRids } },
          select: { id: true },
        })
      : [];
    const wrestlerIds = new Set(wrestlerRows.map((r) => String(r.id)));

    const createRows = [];
    for (const row of prelimRows) {
      if (!wrestlerIds.has(row.rid)) {
        report.missing_fk_count += 1;
        pushFailure(report, {
          index: row.index,
          record_id: row.recordId,
          rid: row.rid,
          reason: 'missing FK: rid does not exist in Wrestler',
        });
        continue;
      }

      createRows.push({
        id: row.recordId,
        data: { ...row.item, record_id: row.recordId, rid: row.rid },
      });
    }

    if (!report.dry_run && createRows.length > 0) {
      const { insertedCount, duplicateCount } = await insertEntityRowsInChunks('BashoRecord', createRows);
      report.created_count += insertedCount;
      report.skipped_duplicates_count += duplicateCount;
    }

    res.json(report);
  } catch (e) {
    next(e);
  }
});

app.post('/api/admin/reset-entity', requireAdminToken, async (req, res, next) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Body must be an object with an entity field' });
      return;
    }

    const entity = String(body.entity || '').trim();
    if (entity !== 'Wrestler' && entity !== 'BashoRecord') {
      res.status(400).json({ error: 'Only Wrestler or BashoRecord may be reset' });
      return;
    }

    const result = await prisma.entityRecord.deleteMany({ where: { entity } });
    res.json({ entity, deleted_count: Number(result?.count || 0) });
  } catch (e) {
    next(e);
  }
});

app.get('/api/domain/rikishi', async (req, res) => {
  try {
    const limit = parseDomainLimit(req.query?.limit);
    const division = parseDivision(req.query?.division);

    const latestBuildId = await getLatestSuccessBuildId();
    if (!latestBuildId) {
      throw new DomainApiError('env', 'NO_SUCCESSFUL_BUILD', 'No successful domain build is available yet', 503);
    }

    if (division) {
      const entries = await prisma.banzukeEntry.findMany({
        where: {
          updatedBuildId: latestBuildId,
          division,
        },
        orderBy: [{ rankValue: 'asc' }, { side: 'asc' }, { rikishiId: 'asc' }],
        take: limit,
        include: {
          rikishi: true,
        },
      });

      res.json(entries.map((entry) => ({
        ...entry.rikishi,
        latestBanzukeEntry: {
          bashoId: entry.bashoId,
          division: entry.division,
          rankValue: entry.rankValue,
          side: entry.side,
          rankLabel: entry.rankLabel,
        },
      })));
      return;
    }

    const byRank = await prisma.banzukeEntry.findMany({
      where: {
        updatedBuildId: latestBuildId,
      },
      orderBy: [{ rankValue: 'asc' }, { side: 'asc' }, { rikishiId: 'asc' }],
      take: limit,
      include: {
        rikishi: true,
      },
    });

    if (byRank.length > 0) {
      res.json(byRank.map((entry) => ({
        ...entry.rikishi,
        latestBanzukeEntry: {
          bashoId: entry.bashoId,
          division: entry.division,
          rankValue: entry.rankValue,
          side: entry.side,
          rankLabel: entry.rankLabel,
        },
      })));
      return;
    }

    const fallback = await prisma.rikishi.findMany({
      orderBy: [{ shikona: 'asc' }, { rikishiId: 'asc' }],
      take: limit,
    });
    res.json(fallback);
  } catch (err) {
    sendDomainError(res, err);
  }
});

app.get('/api/domain/rikishi/:id', async (req, res) => {
  try {
    const rikishiId = String(req.params.id || '').trim();
    if (!rikishiId) {
      throw new DomainApiError('query', 'MISSING_RIKISHI_ID', 'rikishi id path param is required', 400);
    }

    const latestBuildId = await getLatestSuccessBuildId();
    if (!latestBuildId) {
      throw new DomainApiError('env', 'NO_SUCCESSFUL_BUILD', 'No successful domain build is available yet', 503);
    }

    const rikishi = await prisma.rikishi.findUnique({ where: { rikishiId } });
    if (!rikishi) {
      throw new DomainApiError('query', 'RIKISHI_NOT_FOUND', 'rikishi not found', 404);
    }

    const latestBanzukeEntry = await prisma.banzukeEntry.findFirst({
      where: {
        rikishiId,
        updatedBuildId: latestBuildId,
      },
      orderBy: [{ rankValue: 'asc' }, { side: 'asc' }],
    });

    const recentBoutsCount = await prisma.bout.count({
      where: {
        updatedBuildId: latestBuildId,
        OR: [{ eastRikishiId: rikishiId }, { westRikishiId: rikishiId }],
      },
    });

    res.json({
      rikishi,
      latestBanzukeEntry,
      recentBoutsCount,
    });
  } catch (err) {
    sendDomainError(res, err);
  }
});

app.get('/api/entities/:entity', async (req, res, next) => {
  try {
    const entity = String(req.params.entity);
    const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined;
    const limitRaw = typeof req.query.limit === 'string' ? req.query.limit : undefined;
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

    const records = await prisma.entityRecord.findMany({
      where: { entity },
      select: { data: true },
    });

    const rows = records.map((r) => r.data);
    const sorted = sortRows(rows, sort);
    const out = Number.isFinite(limit) ? sorted.slice(0, limit) : sorted;
    res.json(out);
  } catch (e) {
    next(e);
  }
});

app.post('/api/entities/:entity', async (req, res, next) => {
  try {
    const entity = String(req.params.entity);
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const id = payload?.id ? String(payload.id) : await nextId(entity);
    const data = { ...payload, id };

    await prisma.entityRecord.upsert({
      where: { entity_id: { entity, id } },
      update: { data },
      create: { entity, id, data },
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
});

app.patch('/api/entities/:entity/:id', async (req, res, next) => {
  try {
    const entity = String(req.params.entity);
    const id = String(req.params.id);
    const patch = req.body && typeof req.body === 'object' ? req.body : {};

    const existing = await getRecord(entity, id);
    const current = existing?.data && typeof existing.data === 'object' ? existing.data : {};
    const data = { ...current, ...patch, id };

    await prisma.entityRecord.upsert({
      where: { entity_id: { entity, id } },
      update: { data },
      create: { entity, id, data },
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
});

app.delete('/api/entities/:entity/:id', async (req, res, next) => {
  try {
    const entity = String(req.params.entity);
    const id = String(req.params.id);

    await prisma.entityRecord
      .delete({ where: { entity_id: { entity, id } } })
      .catch(() => null);

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.post('/api/entities/:entity/bulk', async (req, res, next) => {
  try {
    const entity = String(req.params.entity);
    const items = Array.isArray(req.body) ? req.body : [];

    const createdItems = [];
    for (const item of items) {
      const obj = item && typeof item === 'object' ? item : {};
      const id = obj?.id ? String(obj.id) : await nextId(entity);
      const data = { ...obj, id };
      createdItems.push(data);
    }

    // Create sequentially for deterministic id order.
    for (const data of createdItems) {
      await prisma.entityRecord.upsert({
        where: { entity_id: { entity, id: String(data.id) } },
        update: { data },
        create: { entity, id: String(data.id), data },
      });
    }

    res.json({ created: createdItems.length, items: createdItems });
  } catch (e) {
    next(e);
  }
});

app.get('/api/auth/me', async (_req, res, next) => {
  try {
    const entity = 'User';
    const id = 'user_1';

    const record = await getRecord(entity, id);
    if (!record) {
      res.status(404).json({
        error:
          'No user profile found. Create one via the UI (Profile save) or initialize local data with `npm --prefix server run bootstrap`.',
      });
      return;
    }

    res.json(record.data);
  } catch (e) {
    next(e);
  }
});

app.patch('/api/auth/me', async (req, res, next) => {
  try {
    const entity = 'User';
    const id = 'user_1';
    const patch = req.body && typeof req.body === 'object' ? req.body : {};

    const existing = await getRecord(entity, id);
    const current = existing?.data && typeof existing.data === 'object' ? existing.data : {};
    const data = { ...current, ...patch, id };

    await prisma.entityRecord.upsert({
      where: { entity_id: { entity, id } },
      update: { data },
      create: { entity, id, data },
    });

    res.json(data);
  } catch (e) {
    next(e);
  }
});

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[server][error]', String(err?.message || err));
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, async () => {
  logStartupEnv();

  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://127.0.0.1:${PORT}`);

  // Ensure schema exists (no migrations required for dev).
  // eslint-disable-next-line no-console
  console.log('[server] tip: run `npm --prefix server run db:push` and optionally `npm --prefix server run bootstrap` to initialize local data');
});
