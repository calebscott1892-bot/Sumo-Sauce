import {
  makeEntityApi,
  ensureSeed,
  loadAuthUser,
  saveAuthUser,
  stubLog,
} from './stubDb.js';

const { log } = stubLog();

function nowIso() {
  return new Date().toISOString();
}

function seedOnce() {
  // Minimal deterministic seeds, only to prevent first-load crashes.
  // Seed once per table (only if empty).
  ensureSeed('Wrestler', [
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

  // Leaderboard uses the latest basho from records; seed a minimal basho set.
  ensureSeed('BashoRecord', [
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

  ensureSeed('Tournament', [
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

  ensureSeed('ForumTopic', [
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

  ensureSeed('ForumReply', [
    {
      id: 'forumreply_1',
      topic_id: 'forumtopic_1',
      author_email: 'demo@sumowatch.local',
      content: 'First reply on the stubbed forum topic.',
      created_date: nowIso(),
      likes: 0,
    },
  ]);
}

seedOnce();

function meUser() {
  const existing = loadAuthUser();
  if (existing && typeof existing === 'object') return existing;
  const user = {
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
  };
  saveAuthUser(user);
  return user;
}

export const base44 = {
  entities: {
    Achievement: makeEntityApi('Achievement'),
    BannedUser: makeEntityApi('BannedUser'),
    BashoRecord: makeEntityApi('BashoRecord', { allowBulkCreate: true }),
    ComparisonReport: makeEntityApi('ComparisonReport'),
    DataCorrectionRequest: makeEntityApi('DataCorrectionRequest'),
    ForumReply: makeEntityApi('ForumReply'),
    ForumTopic: makeEntityApi('ForumTopic'),
    LeagueMembership: makeEntityApi('LeagueMembership'),
    Match: makeEntityApi('Match', { allowBulkCreate: true }),
    MatchPrediction: makeEntityApi('MatchPrediction'),
    Notification: makeEntityApi('Notification'),
    PredictionLeague: makeEntityApi('PredictionLeague'),
    Report: makeEntityApi('Report'),
    Tournament: makeEntityApi('Tournament'),
    TournamentPrediction: makeEntityApi('TournamentPrediction'),
    User: makeEntityApi('User'),
    Wrestler: makeEntityApi('Wrestler', { allowBulkCreate: true }),
    WrestlerRating: makeEntityApi('WrestlerRating'),
  },

  auth: {
    async me() {
      log('auth.me()');
      const user = meUser();
      // Ensure User table contains the current user for UI list calls.
      ensureSeed('User', [user]);
      return user;
    },
    async updateMe(data) {
      log('auth.updateMe(data)');
      const current = meUser();
      const next = { ...current, ...(data && typeof data === 'object' ? data : {}) };
      saveAuthUser(next);
      // Keep User table in sync.
      const api = makeEntityApi('User');
      await api.update(next.id, next);
      return next;
    },
  },

  // Not used by runtime UI today; keep present for API compatibility.
  integrations: { Core: {} },
};
