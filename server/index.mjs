import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = Number.parseInt(process.env.PORT || '8787', 10);

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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
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
  const message = String(err?.message || err);
  res.status(500).json({ error: message });
});

app.listen(PORT, async () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://127.0.0.1:${PORT}`);

  // Ensure schema exists (no migrations required for dev).
  // eslint-disable-next-line no-console
  console.log('[server] tip: run `npm --prefix server run db:push` and optionally `npm --prefix server run bootstrap` to initialize local data');
});
