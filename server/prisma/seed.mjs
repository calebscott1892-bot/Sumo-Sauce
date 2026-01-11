import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function nowIso() {
  return new Date().toISOString();
}

async function ensureSeed(entity, seedRows = []) {
  const existing = await prisma.entityRecord.findFirst({ where: { entity } });
  if (existing) return;
  if (!seedRows?.length) return;

  await prisma.entityRecord.createMany({
    data: seedRows.map((row) => ({
      entity,
      id: String(row.id),
      data: { ...row, id: String(row.id) },
    })),
  });
}

async function ensureCounterFromExisting(entity) {
  const rows = await prisma.entityRecord.findMany({
    where: { entity },
    select: { id: true },
  });

  let max = 0;
  for (const r of rows) {
    const m = String(r.id).match(/_(\d+)$/);
    if (!m) continue;
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }

  if (max <= 0) return;

  const existing = await prisma.entityCounter.findUnique({ where: { entity } });
  if (!existing) {
    await prisma.entityCounter.create({ data: { entity, value: max } });
    return;
  }
  if (existing.value < max) {
    await prisma.entityCounter.update({ where: { entity }, data: { value: max } });
  }
}

async function main() {
  await ensureSeed('Wrestler', [
    {
      id: 'wrestler_1',
      rid: 'R001',
      shikona: 'Hakuho',
      current_rank: 'Yokozuna 1 East',
      current_rank_number: 1,
      current_division: 'Makuuchi',
      rank: 1,
      is_active: true,
      country: 'Japan',
    },
    {
      id: 'wrestler_2',
      rid: 'R002',
      shikona: 'Terunofuji',
      current_rank: 'Ozeki 1 West',
      current_rank_number: 1,
      current_division: 'Makuuchi',
      rank: 2,
      is_active: true,
      country: 'Mongolia',
    },
    {
      id: 'wrestler_3',
      rid: 'R003',
      shikona: 'Kirishima',
      current_rank: 'Sekiwake 1 East',
      current_rank_number: 1,
      current_division: 'Makuuchi',
      rank: 3,
      is_active: true,
      country: 'Japan',
    },
    {
      id: 'wrestler_4',
      rid: 'R004',
      shikona: 'Kotonowaka',
      current_rank: 'Komusubi 1 West',
      current_rank_number: 1,
      current_division: 'Makuuchi',
      rank: 4,
      is_active: true,
      country: 'Japan',
    },
    {
      id: 'wrestler_5',
      rid: 'R005',
      shikona: 'Abi',
      current_rank: 'Maegashira 1 East',
      current_rank_number: 1,
      current_division: 'Makuuchi',
      rank: 5,
      is_active: true,
      country: 'Japan',
    },
  ]);

  await ensureSeed('BashoRecord', [
    {
      id: 'bashorecord_1',
      basho: '2025-11',
      rid: 'R001',
      shikona: 'Hakuho',
      division: 'Makuuchi',
      rank: 'Yokozuna 1 East',
      wins: 13,
      losses: 2,
      absences: 0,
      created_date: nowIso(),
    },
    {
      id: 'bashorecord_2',
      basho: '2025-11',
      rid: 'R002',
      shikona: 'Terunofuji',
      division: 'Makuuchi',
      rank: 'Ozeki 1 West',
      wins: 11,
      losses: 4,
      absences: 0,
      created_date: nowIso(),
    },
    {
      id: 'bashorecord_3',
      basho: '2025-11',
      rid: 'R003',
      shikona: 'Kirishima',
      division: 'Makuuchi',
      rank: 'Sekiwake 1 East',
      wins: 9,
      losses: 6,
      absences: 0,
      created_date: nowIso(),
    },
    {
      id: 'bashorecord_4',
      basho: '2025-11',
      rid: 'R004',
      shikona: 'Kotonowaka',
      division: 'Makuuchi',
      rank: 'Komusubi 1 West',
      wins: 8,
      losses: 7,
      absences: 0,
      created_date: nowIso(),
    },
    {
      id: 'bashorecord_5',
      basho: '2025-11',
      rid: 'R005',
      shikona: 'Abi',
      division: 'Makuuchi',
      rank: 'Maegashira 1 East',
      wins: 7,
      losses: 8,
      absences: 0,
      created_date: nowIso(),
    },
  ]);

  await ensureSeed('Tournament', [
    {
      id: 'tournament_1',
      name: 'Stub Basho 2025-11',
      start_date: '2025-11-10',
      end_date: '2025-11-24',
      status: 'completed',
      created_date: nowIso(),
    },
    {
      id: 'tournament_2',
      name: 'Stub Basho 2026-01',
      start_date: '2026-01-10',
      end_date: '2026-01-24',
      status: 'in_progress',
      created_date: nowIso(),
    },
  ]);

  await ensureSeed('ForumTopic', [
    {
      id: 'forumtopic_1',
      title: 'Welcome to SumoWatch (Stub)',
      content: 'This is stubbed local data. Replace with real backend later.',
      category: 'General',
      author_email: 'demo@sumowatch.local',
      created_date: nowIso(),
      is_pinned: true,
      is_locked: false,
      views: 0,
      replies_count: 1,
    },
  ]);

  await ensureSeed('ForumReply', [
    {
      id: 'forumreply_1',
      topic_id: 'forumtopic_1',
      author_email: 'demo@sumowatch.local',
      content: 'First reply on the stubbed forum topic.',
      created_date: nowIso(),
      likes: 0,
    },
  ]);

  // Auth/demo user seed (also ensures UI list calls won't crash)
  await ensureSeed('User', [
    {
      id: 'user_1',
      email: 'demo@sumowatch.local',
      username: 'demo',
      full_name: 'Demo User',
      role: 'user',
      created_date: nowIso(),
      privacy_settings: {
        show_email: false,
        show_predictions: true,
        show_ratings: true,
      },
    },
  ]);

  // Initialize counters so auto-generated ids don't collide with seeds.
  for (const entity of ['Wrestler', 'BashoRecord', 'Tournament', 'ForumTopic', 'ForumReply', 'User']) {
    // eslint-disable-next-line no-await-in-loop
    await ensureCounterFromExisting(entity);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
