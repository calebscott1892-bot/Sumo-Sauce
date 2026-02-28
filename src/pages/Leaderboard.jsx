import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Crown, Star } from 'lucide-react';
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
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Sumo Leaderboard</h1>
            <p className="text-zinc-400">DB-backed leaderboard (local dev)</p>
          </div>
          {showBackendStatus && (
            <span
              className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                loadError
                  ? 'border-red-700 bg-red-900/30 text-red-200'
                  : 'border-emerald-700 bg-emerald-900/30 text-emerald-200'
              }`}
            >
              {loadError ? `Backend: error (${loadError})` : 'Backend: connected'}
            </span>
          )}
        </div>

        {loading && (
          <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-6 text-zinc-300">
            Loading leaderboard data…
          </div>
        )}

        {!loading && loadError && (
          <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 px-4 py-4 text-red-100">
            <div className="font-semibold">Failed to load leaderboard data from API.</div>
            <div className="mt-1 font-mono text-xs text-red-200">{loadError}</div>
          </div>
        )}

        {!loading && !loadError && !latestBasho && (
          <div className="mb-4 rounded-lg border border-yellow-700 bg-yellow-900/30 px-4 py-3 text-yellow-100">
            No basho records loaded.
          </div>
        )}

        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search shikona or rid..."
              className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 md:max-w-xs"
            />

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedBasho}
                onChange={(event) => setSelectedBasho(event.target.value)}
                className="rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm"
              >
                {filteredGroupOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={includeSnapshots}
                  onChange={(event) => setIncludeSnapshots(event.target.checked)}
                />
                Include snapshots
              </label>

              <select
                value={selectedDivision}
                onChange={(event) => setSelectedDivision(event.target.value)}
                className="rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm"
              >
                <option value="all">All divisions</option>
                <option value="Makuuchi">Makuuchi</option>
                <option value="Juryo">Juryo</option>
                <option value="Makushita">Makushita</option>
                <option value="Sandanme">Sandanme</option>
                <option value="Jonidan">Jonidan</option>
                <option value="Jonokuchi">Jonokuchi</option>
              </select>

              <label className="flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={hideStubs}
                  onChange={(event) => setHideStubs(event.target.checked)}
                />
                Hide stubs
              </label>

              <div className="inline-flex rounded-md border border-zinc-700 p-1">
                <button
                  type="button"
                  onClick={() => setSortMode('banzuke')}
                  className={`rounded px-3 py-1 text-xs font-bold ${
                    sortMode === 'banzuke' ? 'bg-red-600 text-white' : 'text-zinc-300'
                  }`}
                >
                  Banzuke (Official)
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode('standings')}
                  className={`rounded px-3 py-1 text-xs font-bold ${
                    sortMode === 'standings' ? 'bg-red-600 text-white' : 'text-zinc-300'
                  }`}
                >
                  Standings (Selected Basho)
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode('ovr')}
                  className={`rounded px-3 py-1 text-xs font-bold ${
                    sortMode === 'ovr' ? 'bg-red-600 text-white' : 'text-zinc-300'
                  }`}
                >
                  OVR
                </button>
              </div>
            </div>
          </div>

          <p className="mt-2 text-xs text-zinc-400">
            Active mode:{' '}
            <span className="font-bold text-zinc-200">
              {sortMode === 'banzuke'
                ? 'Banzuke (Official)'
                : sortMode === 'standings'
                  ? 'Standings (Selected Basho)'
                  : 'OVR'}
            </span>
          </p>
        </div>

        {!loading && !loadError && (
          <div className="space-y-2">
            {rows.map((item, index) => {
              const wrestler = item.wrestler || {};
              const record = item.record || {};
              const rankKanji = getRankKanji(item.tier);

              const rid = String(item.rid || wrestler?.rid || record?.rid || '').trim();
              const shikona = String(wrestler?.shikona || record?.shikona || rid || 'Unknown').trim();

              const photoUrl = resolvePhotoUrl(wrestler);
              const stableName = String(wrestler?.stable || wrestler?.heya?.name || '').trim();
              const ovrTone = item.overallRating >= 90
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                : item.overallRating >= 80
                  ? 'border-zinc-300 bg-zinc-300/15 text-zinc-100'
                  : item.overallRating >= 70
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                    : 'border-zinc-600 bg-zinc-800 text-zinc-200';

              return (
                <Link
                  key={rid || `${record?.record_id || 'row'}-${index}`}
                  to={`/rikishi/${encodeURIComponent(rid)}`}
                  className="block rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-red-600"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 text-right text-2xl font-black">{index + 1}</div>

                    <div className={`mr-2 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-black ${ovrTone}`}>
                      {item.overallRating}
                    </div>

                    <FallbackAvatar
                      size="sm"
                      photoUrl={photoUrl}
                      shikona={shikona}
                      rid={rid}
                      stable={stableName}
                      rank={item.tier}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xl font-black">{shikona}</div>
                      <div className="flex items-center gap-1.5 text-sm text-zinc-300">
                        <RankSignal tier={item.tier} />
                        <span className="font-semibold">{item.tier}</span>
                        {rankKanji && <span className="text-zinc-400">{rankKanji}</span>}
                        <span className="text-zinc-500">·</span>
                        <span className="text-zinc-400">{getRankLabel(record, wrestler)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black">
                        {item.wins}-{item.losses}
                      </div>

                      <div className="mt-1 flex flex-wrap justify-end gap-1 text-[10px]">
                        {!photoUrl && (
                          <span className="rounded border border-amber-700 bg-amber-900/30 px-2 py-0.5 text-amber-200">
                            Photo missing
                          </span>
                        )}
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">{getImageBadge(wrestler)}</span>
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">{getRecordBadge(record)}</span>
                        {record?.source_tier && (
                          <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-400">
                            {String(record.source_tier)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {!rows.length && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-4 text-sm text-zinc-400">
                No rows match the current filters.
              </div>
            )}
          </div>
        )}

        <details className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900">
          <summary className="cursor-pointer px-4 py-3 font-bold text-zinc-300">Debug</summary>
          <div className="space-y-2 border-t border-zinc-800 px-4 py-3 text-sm">
            <div>
              Selected group label: <span className="font-mono">{selectedGroupLabel}</span>
            </div>
            <div>
              Selected group key: <span className="font-mono">{selectedBasho || '-'}</span>
            </div>
            <div>
              Include snapshots: <span className="font-mono">{includeSnapshots ? 'true' : 'false'}</span>
            </div>
            <div>
              Option list size: <span className="font-mono">{filteredGroupOptions.length}</span>
            </div>
            <div>
              Total wrestlers fetched: <span className="font-mono">{wrestlersData.length}</span>
            </div>
            <div>
              Basho records fetched: <span className="font-mono">{bashoRecordsData.length}</span>
            </div>
            <div>
              Missing basho count: <span className="font-mono">{missingBashoCount}</span>
            </div>
            <div>
              Records used after filtering: <span className="font-mono">{recordsUsedCount}</span>
            </div>
            <div>
              Rows displayed after filters: <span className="font-mono">{rows.length}</span>
            </div>
            <div className="pt-1 font-bold">First 5 computed sort keys</div>
            <ul className="space-y-1 font-mono text-xs text-zinc-300">
              {debugRows.map((row, idx) => (
                <li key={`${row.rid}-${idx}`}>
                  {row.rid},{row.tier},{row.rankNumber},{row.side},{row.wl}
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
}