import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { trackLeaderboardView } from '@/utils/analytics';
import { ChevronRight, Crown, Star, Search } from 'lucide-react';
import FallbackAvatar from '@/components/FallbackAvatar';
import { resolvePhotoUrl } from '@/utils/photo';

const WRESTLERS_URL = '/api/entities/Wrestler?limit=2000';
const BASHO_RECORDS_URL = '/api/entities/BashoRecord?limit=5000';

const TIER_ORDER = {
  Yokozuna: 1,
  Ozeki: 2,
  Sekiwake: 3,
  Komusubi: 4,
  Maegashira: 5,
};

const MAKUUCHI_RANKS = new Set(['Yokozuna', 'Ozeki', 'Sekiwake', 'Komusubi', 'Maegashira']);

const DIVISION_CODE_MAP = {
  1: 'Makuuchi',
  2: 'Juryo',
  3: 'Makushita',
  4: 'Sandanme',
  5: 'Jonidan',
  6: 'Jonokuchi',
};

const RANK_KANJI_MAP = {
  Yokozuna: '横綱',
  Ozeki: '大関',
  Sekiwake: '関脇',
  Komusubi: '小結',
  Maegashira: '前頭',
  Juryo: '十両',
  Makushita: '幕下',
  Sandanme: '三段目',
  Jonidan: '序二段',
  Jonokuchi: '序ノ口',
};

function normalizeSide(side) {
  const s = String(side || '').trim().toLowerCase();
  if (s === 'e' || s === 'east') return 'East';
  if (s === 'w' || s === 'west') return 'West';
  return '';
}

function sideOrder(side) {
  return normalizeSide(side) === 'East' ? 0 : 1;
}

function toSafeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getWins(record) {
  return toSafeNumber(record?.wins, 0);
}

function getLosses(record) {
  return toSafeNumber(record?.losses, 0);
}

function getWinPct(record) {
  const raw = Number(record?.win_pct);
  if (Number.isFinite(raw)) return raw;
  const wins = getWins(record);
  const losses = getLosses(record);
  const total = wins + losses;
  return total > 0 ? wins / total : 0;
}

function computeOverallRating({ careerWinPct, yusho, specialPrizes, rankTier }) {
  let score = 60;
  if (Number.isFinite(careerWinPct)) score += Math.round(careerWinPct * 30);
  if (Number.isFinite(yusho)) score += yusho * 2;
  if (Number.isFinite(specialPrizes)) score += specialPrizes * 0.5;

  const tier = String(rankTier || '').trim();
  if (tier === 'Yokozuna') score += 10;
  else if (tier === 'Ozeki') score += 7;
  else if (tier === 'Sekiwake') score += 5;
  else if (tier === 'Komusubi') score += 3;
  else if (tier === 'Maegashira') score += 1;

  return Math.min(Math.max(Math.round(score), 50), 99);
}

function normalizeBashoText(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function inferBashoFromRecordId(recordId) {
  const id = String(recordId || '');
  const match = id.match(/([A-Za-z]+)\s+(20\d{2})/);
  if (!match) return '';
  return `${match[1]} ${match[2]}`;
}

function getRecordGroup(record) {
  const basho = normalizeBashoText(record?.basho);
  if (basho) {
    return { key: basho, label: basho, type: 'basho' };
  }

  const inferred = normalizeBashoText(inferBashoFromRecordId(record?.record_id));
  if (inferred) {
    return {
      key: inferred,
      label: `${inferred} (inferred)`,
      type: 'basho_inferred',
    };
  }

  const snapshotDate = String(record?.snapshot_date || '').trim();
  if (snapshotDate) {
    return {
      key: `snapshot:${snapshotDate}`,
      label: `Snapshot ${snapshotDate}`,
      type: 'snapshot',
    };
  }

  return { key: 'unknown', label: 'Unknown', type: 'unknown' };
}

function isMakuuchiRecord(record) {
  if (String(record?.division || '').trim() === 'Makuuchi') return true;
  if (toSafeNumber(record?.division_code, -1) === 1) return true;
  const rank = String(record?.rank || '').trim();
  return MAKUUCHI_RANKS.has(rank);
}

function isStubWrestler(wrestler) {
  const rid = String(wrestler?.rid || '');
  const shikona = String(wrestler?.shikona || '');
  const currentRank = String(wrestler?.current_rank || '').trim();
  const currentDivision = String(wrestler?.current_division || '').trim();
  const officialImage = String(wrestler?.official_image_url || '').trim();

  if (!currentRank || !currentDivision) return true;
  if (rid.includes('????')) return true;
  if (shikona.includes('...')) return true;
  if (wrestler?.status_is_active === true && !officialImage && !currentRank) return true;

  return false;
}

function getImageBadge(wrestler) {
  const official = String(wrestler?.official_image_url || '').trim();
  const wiki = String(wrestler?.image?.url || '').trim();
  if (official.toLowerCase().includes('sumo.or.jp')) return 'JSA image';
  if (wiki) return 'Wiki image';
  return 'No image';
}

function getRecordBadge(record) {
  return record?.is_stub === true ? 'Stub record' : 'Real record';
}

function getTier(record, wrestler) {
  const tier = String(record?.rank || wrestler?.current_rank || '').trim();
  return tier || 'Maegashira';
}

function getRankNumber(record, wrestler) {
  return toSafeNumber(record?.rank_number ?? wrestler?.current_rank_number, 999);
}

function getRankLabel(record, wrestler) {
  const tier = getTier(record, wrestler);
  const rankNumber = getRankNumber(record, wrestler);
  const side = normalizeSide(record?.side || wrestler?.current_side || '');
  return `${tier} ${rankNumber} ${side}`.trim();
}

function getRankKanji(tier) {
  return RANK_KANJI_MAP[String(tier || '').trim()] || '';
}

function getDivision(record, wrestler) {
  const division = String(record?.division || wrestler?.current_division || '').trim();
  if (division) return division;

  const code = Number(record?.division_code);
  if (Number.isFinite(code) && DIVISION_CODE_MAP[code]) {
    return DIVISION_CODE_MAP[code];
  }

  return '';
}

function RankSignal({ tier }) {
  if (tier === 'Yokozuna') {
    return <Crown className="h-3.5 w-3.5 text-yellow-400" aria-hidden="true" />;
  }
  if (tier === 'Ozeki') {
    return <Star className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />;
  }
  if (tier === 'Sekiwake' || tier === 'Komusubi') {
    return <ChevronRight className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />;
  }
  return null;
}

function banzukeCompare(a, b) {
  const tierDelta = (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99);
  if (tierDelta !== 0) return tierDelta;

  const rankDelta = a.rankNumber - b.rankNumber;
  if (rankDelta !== 0) return rankDelta;

  return sideOrder(a.side) - sideOrder(b.side);
}

export default function Leaderboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [sortMode, setSortMode] = useState('banzuke');
  const [hideStubs, setHideStubs] = useState(true);
  const [selectedBasho, setSelectedBasho] = useState('');
  const [includeSnapshots, setIncludeSnapshots] = useState(false);

  const [wrestlersData, setWrestlersData] = useState([]);
  const [bashoRecordsData, setBashoRecordsData] = useState([]);

  useEffect(() => { trackLeaderboardView(); }, []);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      setLoadError('');

      try {
        const [wrestlersRes, recordsRes] = await Promise.all([
          fetch(WRESTLERS_URL),
          fetch(BASHO_RECORDS_URL),
        ]);

        if (!wrestlersRes.ok || !recordsRes.ok) {
          throw new Error(`API request failed (${wrestlersRes.status}/${recordsRes.status})`);
        }

        const [wrestlersJson, recordsJson] = await Promise.all([
          wrestlersRes.json(),
          recordsRes.json(),
        ]);

        if (!Array.isArray(wrestlersJson) || !Array.isArray(recordsJson)) {
          throw new Error('Backend returned non-array payload(s)');
        }

        if (!isMounted) return;

        setWrestlersData(wrestlersJson);
        setBashoRecordsData(recordsJson);
        setLoadError('');
      } catch (error) {
        if (!isMounted) return;
        setWrestlersData([]);
        setBashoRecordsData([]);
        setLoadError(String(error?.message || error || 'Unknown API error'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const groupOptions = useMemo(() => {
    const grouped = new Map();

    bashoRecordsData.forEach((record) => {
      const group = getRecordGroup(record);
      const existing = grouped.get(group.key);

      if (existing) {
        existing.count += 1;
      } else {
        grouped.set(group.key, { ...group, count: 1 });
      }
    });

    const TYPE_ORDER = {
      basho: 0,
      basho_inferred: 1,
      snapshot: 2,
      unknown: 3,
    };

    return [...grouped.values()].sort((a, b) => {
      const typeDelta = (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
      if (typeDelta !== 0) return typeDelta;
      return b.label.localeCompare(a.label);
    });
  }, [bashoRecordsData]);

  const filteredGroupOptions = useMemo(() => {
    let options = groupOptions.filter((option) => includeSnapshots || option.type !== 'snapshot');
    const nonUnknown = options.filter((option) => option.type !== 'unknown');

    if (nonUnknown.length > 0) {
      options = nonUnknown;
    } else if (options.length === 0) {
      const unknownOnly = groupOptions.filter((option) => option.type === 'unknown');
      options = unknownOnly.length > 0 ? unknownOnly : [];
    }

    return options;
  }, [groupOptions, includeSnapshots]);

  const selectedGroup = useMemo(() => {
    return filteredGroupOptions.find((option) => option.key === selectedBasho) || null;
  }, [filteredGroupOptions, selectedBasho]);

  const selectedGroupLabel = selectedGroup?.label || '-';

  const missingBashoCount = useMemo(() => {
    return bashoRecordsData.filter((record) => !normalizeBashoText(record?.basho)).length;
  }, [bashoRecordsData]);

  useEffect(() => {
    if (filteredGroupOptions.length === 0) {
      if (selectedBasho) setSelectedBasho('');
      return;
    }

    const exists = filteredGroupOptions.some((option) => option.key === selectedBasho);
    if (!selectedBasho || !exists) {
      setSelectedBasho(filteredGroupOptions[0].key);
    }
  }, [selectedBasho, filteredGroupOptions]);

  const { rows, debugRows, recordsUsedCount } = useMemo(() => {
    const wrestlerByRid = new Map();

    wrestlersData.forEach((wrestler) => {
      const ridKey = String(wrestler?.rid || '').trim().toLowerCase();
      if (ridKey) wrestlerByRid.set(ridKey, wrestler);
    });

    const selectedRecords = bashoRecordsData
      .filter((record) => getRecordGroup(record).key === String(selectedBasho || '').trim())
      .filter((record) => isMakuuchiRecord(record));

    const computedRows = selectedRecords
      .map((record) => {
        const recordRid = String(record?.rid || '').trim();
        const ridKey = recordRid.toLowerCase();

        const wrestler = wrestlerByRid.get(ridKey) || {
          rid: recordRid,
          shikona: String(record?.shikona || '').trim(),
          current_rank: String(record?.rank || '').trim(),
          current_division: String(record?.division || '').trim(),
          current_side: String(record?.side || '').trim(),
          current_rank_number: record?.rank_number,
          official_image_url: '',
        };

        const tier = getTier(record, wrestler);
        const rankNumber = getRankNumber(record, wrestler);
        const side = normalizeSide(record?.side || wrestler?.current_side || '') || 'West';

        return {
          wrestler,
          record,
          rid: String(wrestler?.rid || recordRid || '').trim(),
          tier,
          division: getDivision(record, wrestler),
          rankNumber,
          side,
          wins: getWins(record),
          losses: getLosses(record),
          winPct: getWinPct(record),
          overallRating: computeOverallRating({
            careerWinPct: getWinPct(record),
            yusho: Number(record?.yusho_top_div),
            specialPrizes: Number(record?.special_prizes),
            rankTier: tier,
          }),
        };
      })
      .filter((item) => selectedDivision === 'all' || item.division === selectedDivision)
      .filter((item) => !hideStubs || !isStubWrestler(item.wrestler));

    const q = searchQuery.trim().toLowerCase();
    const filteredRows = computedRows.filter((item) => {
      if (!q) return true;

      const shikona = String(item?.wrestler?.shikona || item?.record?.shikona || '').toLowerCase();
      const rid = String(item?.rid || '').toLowerCase();
      return shikona.includes(q) || rid.includes(q);
    });

    filteredRows.sort((a, b) => {
      if (sortMode === 'ovr') {
        const ratingDelta = (b.overallRating ?? 0) - (a.overallRating ?? 0);
        if (ratingDelta !== 0) return ratingDelta;

        const pctDelta = b.winPct - a.winPct;
        if (pctDelta !== 0) return pctDelta;
      }

      if (sortMode === 'standings') {
        const winsDelta = b.wins - a.wins;
        if (winsDelta !== 0) return winsDelta;

        const pctDelta = b.winPct - a.winPct;
        if (pctDelta !== 0) return pctDelta;

        const lossesDelta = a.losses - b.losses;
        if (lossesDelta !== 0) return lossesDelta;
      }

      return banzukeCompare(a, b);
    });

    const firstFiveSortKeys = filteredRows.slice(0, 5).map((item) => ({
      rid: item.rid || '-',
      tier: item.tier || '-',
      rankNumber: item.rankNumber,
      side: item.side || '-',
      wl: `${item.wins}-${item.losses}`,
    }));

    return {
      rows: filteredRows,
      debugRows: firstFiveSortKeys,
      recordsUsedCount: selectedRecords.length,
    };
  }, [bashoRecordsData, hideStubs, searchQuery, selectedBasho, selectedDivision, sortMode, wrestlersData]);

  const latestBasho = filteredGroupOptions[0]?.label || '';
  const showBackendStatus = Boolean(loadError) || !loading;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        {/* ── Premium Header ── */}
        <header className="mb-2">
          <div className="flex items-center gap-4">
            <img src="/logo-64.png" alt="Sumo Sauce" className="h-14 w-14 drop-shadow-lg sm:h-16 sm:w-16" />
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-red-500">
                Live Rankings
              </span>
              <h1 className="mt-1 font-display text-5xl font-bold uppercase tracking-tight text-white sm:text-6xl lg:text-7xl">
                Banzuke
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                相撲番付 • Japan Sumo Association
              </p>
            </div>
          </div>
        </header>

        {/* Tournament badge + wrestler count */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-1 rounded-full bg-red-600" />
            <div>
              <span className="font-display text-3xl font-bold text-white">{rows.length}</span>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Wrestlers</p>
            </div>
          </div>
          <div className="ml-2">
            <p className="text-sm font-bold text-white">Grand Sumo Tournament</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Tournament</p>
          </div>
          {showBackendStatus && (
            <span
              className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
                loadError
                  ? 'bg-red-950/60 text-red-300 ring-1 ring-red-800/50'
                  : 'bg-emerald-950/60 text-emerald-300 ring-1 ring-emerald-800/50'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${loadError ? 'bg-red-400' : 'bg-emerald-400'}`} />
              {loadError ? 'Offline' : 'Live'}
            </span>
          )}
        </div>

        {/* Red accent bar */}
        <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-700"
            style={{ width: loading ? '40%' : '100%' }}
          />
        </div>

        {/* ── Loading / Error States ── */}
        {loading && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-5 py-6 text-zinc-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-red-500" />
            Loading banzuke data…
          </div>
        )}

        {!loading && loadError && (
          <div className="mt-6 rounded-xl border border-red-800/40 bg-red-950/30 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-red-600/20 ring-2 ring-red-600/40" />
              <div>
                <p className="font-semibold text-red-200">Connection Error</p>
                <p className="mt-1 text-sm text-red-300/70">{loadError}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Search ── */}
        <div className="mt-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search wrestlers..."
              className="w-full rounded-xl border border-zinc-800/60 bg-zinc-900/50 py-3.5 pl-12 pr-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-red-600/50 focus:ring-1 focus:ring-red-600/30"
            />
          </div>
        </div>

        {/* ── Advanced Filters ── */}
        <details className="group mt-4">
          <summary className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/50 px-5 py-3.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700">
            <div className="flex items-center gap-2.5">
              <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>
              Advanced Filters
            </div>
            <svg className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </summary>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4">
            <select
              value={selectedBasho}
              onChange={(event) => setSelectedBasho(event.target.value)}
              className="rounded-lg border border-zinc-700/50 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
            >
              {filteredGroupOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>

            <select
              value={selectedDivision}
              onChange={(event) => setSelectedDivision(event.target.value)}
              className="rounded-lg border border-zinc-700/50 bg-zinc-800/80 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
            >
              <option value="all">All Divisions</option>
              <option value="Makuuchi">Makuuchi</option>
              <option value="Juryo">Juryo</option>
              <option value="Makushita">Makushita</option>
              <option value="Sandanme">Sandanme</option>
              <option value="Jonidan">Jonidan</option>
              <option value="Jonokuchi">Jonokuchi</option>
            </select>

            <label className="flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-800/80 px-3 py-2 text-xs font-medium text-zinc-300">
              <input
                type="checkbox"
                checked={includeSnapshots}
                onChange={(event) => setIncludeSnapshots(event.target.checked)}
                className="rounded border-zinc-600 accent-red-500"
              />
              Snapshots
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-800/80 px-3 py-2 text-xs font-medium text-zinc-300">
              <input
                type="checkbox"
                checked={hideStubs}
                onChange={(event) => setHideStubs(event.target.checked)}
                className="rounded border-zinc-600 accent-red-500"
              />
              Hide Stubs
            </label>
          </div>
        </details>

        {/* ── Understanding the Rankings — info card ── */}
        <div className="mt-5 rounded-xl border border-blue-800/40 bg-blue-950/20 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-blue-500/20 ring-2 ring-blue-500/40" />
            <div>
              <p className="text-sm font-semibold text-blue-300">Understanding the Rankings</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                <span className="font-semibold text-zinc-300">Official Banzuke Rank</span> shows traditional ranking position (Yokozuna, Ozeki, etc.) based on historical performance.
                <span className="font-semibold text-zinc-300"> Tournament Standings</span> shows current basho performance (wins-losses).
              </p>
            </div>
          </div>
        </div>

        {/* ── Rank Filter Tabs ── */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedDivision('all')}
            className={`tab-btn shrink-0 ${selectedDivision === 'all' ? 'tab-btn-active' : 'tab-btn-inactive'}`}
          >
            <span className="text-base">全</span>
            <span className="text-[11px] uppercase tracking-wider">All Ranks</span>
          </button>
          {Object.entries(RANK_KANJI_MAP)
            .filter(([key]) => MAKUUCHI_RANKS.has(key))
            .map(([rank, kanji]) => (
              <button
                key={rank}
                type="button"
                onClick={() => setSelectedDivision(rank === selectedDivision ? 'all' : 'Makuuchi')}
                className={`tab-btn shrink-0 ${selectedDivision === rank ? 'tab-btn-active' : 'tab-btn-inactive'}`}
              >
                <span className="text-base">{kanji}</span>
                <span className="text-[11px] uppercase tracking-wider">{rank}</span>
              </button>
            ))}
        </div>

        {/* ── Sort Mode ── */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-4.5L16.5 16.5m0 0L12 12m4.5 4.5V3" /></svg>
          </div>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
            className="rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-red-600/50"
          >
            <option value="banzuke">Official Banzuke Rank</option>
            <option value="standings">Tournament Standings</option>
            <option value="ovr">Overall Rating</option>
          </select>
        </div>

        {/* ── Wrestler List ── */}
        {!loading && !loadError && (
          <div className="mt-6 space-y-2">
            {rows.map((item, index) => {
              const wrestler = item.wrestler || {};
              const record = item.record || {};
              const rankKanji = getRankKanji(item.tier);

              const rid = String(item.rid || wrestler?.rid || record?.rid || '').trim();
              const shikona = String(wrestler?.shikona || record?.shikona || rid || 'Unknown').trim();

              const photoUrl = resolvePhotoUrl(wrestler);
              const stableName = String(wrestler?.stable || wrestler?.heya?.name || '').trim();

              const ovrTone = item.overallRating >= 90
                ? 'score-elite'
                : item.overallRating >= 80
                  ? 'score-high'
                  : item.overallRating >= 70
                    ? 'score-mid'
                    : 'score-low';

              return (
                <Link
                  key={rid || `${record?.record_id || 'row'}-${index}`}
                  to={`/rikishi/${encodeURIComponent(rid)}`}
                  className="group block rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-all duration-200 hover:border-red-600/40 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-red-950/10 sm:px-5"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Rank number */}
                    <div className="w-8 text-right font-display text-xl font-bold text-zinc-500 sm:w-10 sm:text-2xl">
                      {index + 1}
                    </div>

                    {/* OVR badge */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-black ${ovrTone}`}>
                      {item.overallRating}
                    </div>

                    {/* Avatar */}
                    <FallbackAvatar
                      size="sm"
                      photoUrl={photoUrl}
                      shikona={shikona}
                      rid={rid}
                      stable={stableName}
                      rank={item.tier}
                    />

                    {/* Name & rank */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-lg font-bold tracking-tight text-white group-hover:text-red-400 sm:text-xl">
                        {shikona}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 sm:text-sm">
                        <RankSignal tier={item.tier} />
                        <span className="font-semibold text-zinc-300">{item.tier}</span>
                        {rankKanji && <span className="text-zinc-500">{rankKanji}</span>}
                        <span className="text-zinc-700">·</span>
                        <span className="hidden text-zinc-500 sm:inline">{getRankLabel(record, wrestler)}</span>
                      </div>
                    </div>

                    {/* Win-Loss */}
                    <div className="text-right">
                      <div className="font-display text-lg font-bold tracking-tight sm:text-xl">
                        <span className="text-white">{item.wins}</span>
                        <span className="text-zinc-600">-</span>
                        <span className="text-zinc-400">{item.losses}</span>
                      </div>
                      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                        {(item.winPct * 100).toFixed(0)}% Win
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {!rows.length && (
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 px-5 py-8 text-center text-sm text-zinc-500">
                No wrestlers match the current filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}