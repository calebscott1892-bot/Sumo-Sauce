import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Database,
  RefreshCcw,
  ShieldCheck,
  Image as ImageIcon,
  Layers3,
} from 'lucide-react';
import { trackLeaderboardView } from '@/utils/analytics';
import { resolveApiUrl } from '@/utils/apiBase';
import PageMeta from '@/components/ui/PageMeta';
import EmptyState from '@/components/ui/EmptyState';
import { PremiumBadge, PremiumPageHeader, PremiumSectionShell } from '@/components/ui/premium';
import SearchBar from '@/components/leaderboard/SearchBar';
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable';

const WRESTLER_LIMIT = 2000;
const BASHO_RECORD_LIMIT = 5000;
const WRESTLERS_URL = resolveApiUrl(`/entities/Wrestler?limit=${WRESTLER_LIMIT}`);
const BASHO_RECORDS_URL = resolveApiUrl(`/entities/BashoRecord?limit=${BASHO_RECORD_LIMIT}`);

const TIER_ORDER = {
  Yokozuna: 1,
  Ozeki: 2,
  Sekiwake: 3,
  Komusubi: 4,
  Maegashira: 5,
  Juryo: 6,
  Makushita: 7,
  Sandanme: 8,
  Jonidan: 9,
  Jonokuchi: 10,
};

const DIVISION_CODE_MAP = {
  1: 'Makuuchi',
  2: 'Juryo',
  3: 'Makushita',
  4: 'Sandanme',
  5: 'Jonidan',
  6: 'Jonokuchi',
};

const DIVISION_OPTIONS = ['Makuuchi', 'Juryo', 'Makushita', 'Sandanme', 'Jonidan', 'Jonokuchi'];
const BASHO_MONTHS = {
  hatsu: '01',
  haru: '03',
  natsu: '05',
  nagoya: '07',
  aki: '09',
  kyushu: '11',
};

function normalizeSide(side) {
  const value = String(side || '').trim().toLowerCase();
  if (value === 'e' || value === 'east') return 'East';
  if (value === 'w' || value === 'west') return 'West';
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

function normalizeBashoText(value) {
  return typeof value === 'string' ? value.trim() : '';
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

function getTier(record, wrestler) {
  const tier = String(record?.rank || wrestler?.current_rank || '').trim();
  return tier || 'Maegashira';
}

function getRankNumber(record, wrestler) {
  return toSafeNumber(record?.rank_number ?? wrestler?.current_rank_number, 999);
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

function getRankLabel(record, wrestler) {
  const tier = getTier(record, wrestler);
  const rankNumber = getRankNumber(record, wrestler);
  const side = normalizeSide(record?.side || wrestler?.current_side || '');

  if (rankNumber === 999 && !side) return tier;
  return `${tier} ${rankNumber !== 999 ? rankNumber : ''} ${side}`.trim();
}

function banzukeCompare(a, b) {
  const tierDelta = (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99);
  if (tierDelta !== 0) return tierDelta;

  const divisionDelta = DIVISION_OPTIONS.indexOf(a.division) - DIVISION_OPTIONS.indexOf(b.division);
  if (divisionDelta !== 0 && a.division && b.division) return divisionDelta;

  const rankDelta = a.rankNumber - b.rankNumber;
  if (rankDelta !== 0) return rankDelta;

  return sideOrder(a.side) - sideOrder(b.side);
}

function getSourceMeta(group) {
  if (!group) {
    return {
      label: 'No source selected',
      variant: 'zinc',
      description: 'Choose a standings source to inspect the leaderboard.',
    };
  }

  if (group.type === 'basho') {
    return {
      label: 'Imported basho record set',
      variant: 'green',
      description: 'Standings rows come from imported entity data with an explicit basho label. This page does not imply live tournament freshness.',
    };
  }

  if (group.type === 'basho_inferred') {
    return {
      label: 'Inferred basho label',
      variant: 'amber',
      description: 'The tournament label was inferred from record naming because the row lacks an explicit basho field.',
    };
  }

  if (group.type === 'snapshot') {
    return {
      label: 'Snapshot source',
      variant: 'blue',
      description: 'This view is based on dated snapshot rows rather than an explicit tournament label or guaranteed current standings feed.',
    };
  }

  return {
    label: 'Unknown source label',
    variant: 'zinc',
    description: 'Some rows do not carry a clear tournament label in the entity layer.',
  };
}

function inferGroupRecency(group) {
  const key = String(group?.key || '').trim();
  if (/^\d{6}$/.test(key)) {
    return Number(key);
  }

  if (key.startsWith('snapshot:')) {
    const parsed = Date.parse(key.slice('snapshot:'.length));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const label = String(group?.label || '').trim();
  const named = label.match(/\b(Hatsu|Haru|Natsu|Nagoya|Aki|Kyushu)\s+(20\d{2})\b/i);
  if (named) {
    const month = BASHO_MONTHS[named[1].toLowerCase()] || '00';
    return Number(`${named[2]}${month}`);
  }

  const compact = label.match(/\b(20\d{2})(0[1-9]|1[0-2])\b/);
  if (compact) {
    return Number(`${compact[1]}${compact[2]}`);
  }

  return 0;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [sortMode, setSortMode] = useState('banzuke');
  const [hideStubs, setHideStubs] = useState(true);
  const [selectedBasho, setSelectedBasho] = useState('');
  const [includeSnapshots, setIncludeSnapshots] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [wrestlersData, setWrestlersData] = useState([]);
  const [bashoRecordsData, setBashoRecordsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedDeferredQuery = deferredSearchQuery.trim().toLowerCase();
  const isRefiningSearch = searchQuery.trim() !== deferredSearchQuery.trim();

  useEffect(() => {
    trackLeaderboardView();
  }, []);

  useEffect(() => {
    const queryFromUrl = searchParams.get('q') ?? '';
    if (queryFromUrl !== searchQuery) {
      setSearchQuery(queryFromUrl);
    }
  }, [searchParams, searchQuery]);

  useEffect(() => {
    const queryFromUrl = searchParams.get('q') ?? '';
    if (queryFromUrl === searchQuery) return;

    const next = new URLSearchParams(searchParams);
    if (searchQuery) next.set('q', searchQuery);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  }, [searchParams, searchQuery, setSearchParams]);

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
  }, [reloadKey]);

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

    const typeOrder = {
      basho: 0,
      basho_inferred: 1,
      snapshot: 2,
      unknown: 3,
    };

    return [...grouped.values()].sort((a, b) => {
      const typeDelta = (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
      if (typeDelta !== 0) return typeDelta;
      const recencyDelta = inferGroupRecency(b) - inferGroupRecency(a);
      if (recencyDelta !== 0) return recencyDelta;
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

  useEffect(() => {
    if (filteredGroupOptions.length === 0) {
      if (selectedBasho) setSelectedBasho('');
      return;
    }

    const exists = filteredGroupOptions.some((option) => option.key === selectedBasho);
    if (!selectedBasho || !exists) {
      setSelectedBasho(filteredGroupOptions[0].key);
    }
  }, [filteredGroupOptions, selectedBasho]);

  const missingBashoCount = useMemo(() => {
    return bashoRecordsData.filter((record) => !normalizeBashoText(record?.basho)).length;
  }, [bashoRecordsData]);

  const { rows, recordsUsedCount, divisionCounts, baseRowCount } = useMemo(() => {
    const wrestlerByRid = new Map();

    wrestlersData.forEach((wrestler) => {
      const ridKey = String(wrestler?.rid || '').trim().toLowerCase();
      if (ridKey) wrestlerByRid.set(ridKey, wrestler);
    });

    const selectedRecords = bashoRecordsData.filter(
      (record) => getRecordGroup(record).key === String(selectedBasho || '').trim(),
    );

    const baseRows = selectedRecords
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
        const division = getDivision(record, wrestler);
        const rankNumber = getRankNumber(record, wrestler);
        const side = normalizeSide(record?.side || wrestler?.current_side || '') || 'West';
        const rid = String(wrestler?.rid || recordRid || '').trim();
        const rankLabel = getRankLabel(record, wrestler);

        return {
          wrestler,
          record,
          rid,
          tier,
          division,
          rankLabel,
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
      .filter((item) => item.division)
      .filter((item) => !hideStubs || !isStubWrestler(item.wrestler));

    const nextDivisionCounts = baseRows.reduce((acc, item) => {
      acc[item.division] = (acc[item.division] || 0) + 1;
      return acc;
    }, {});

    const searchedRows = baseRows.filter((item) => {
      if (!normalizedDeferredQuery) return true;

      const shikona = String(item?.wrestler?.shikona || item?.record?.shikona || '').toLowerCase();
      const rid = String(item?.rid || '').toLowerCase();
      const stable = String(item?.wrestler?.stable || '').toLowerCase();
      return shikona.includes(normalizedDeferredQuery) || rid.includes(normalizedDeferredQuery) || stable.includes(normalizedDeferredQuery);
    });

    const filteredRows = searchedRows.filter((item) => {
      return selectedDivision === 'all' || item.division === selectedDivision;
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

    return {
      rows: filteredRows,
      recordsUsedCount: selectedRecords.length,
      divisionCounts: nextDivisionCounts,
      baseRowCount: baseRows.length,
    };
  }, [
    bashoRecordsData,
    hideStubs,
    normalizedDeferredQuery,
    selectedBasho,
    selectedDivision,
    sortMode,
    wrestlersData,
  ]);

  const selectedGroupLabel = selectedGroup?.label || 'No source selected';
  const sourceMeta = getSourceMeta(selectedGroup);
  const hasWrestlerCap = wrestlersData.length >= WRESTLER_LIMIT;
  const hasRecordCap = bashoRecordsData.length >= BASHO_RECORD_LIMIT;
  const hasEntityCap = hasWrestlerCap || hasRecordCap;
  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    selectedDivision !== 'all' ||
    sortMode !== 'banzuke' ||
    !hideStubs ||
    includeSnapshots,
  );

  const handleSelect = (item) => {
    const rid = String(item?.rid || '').trim();
    if (!rid) return;
    navigate(`/rikishi/${encodeURIComponent(rid)}`);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDivision('all');
    setSortMode('banzuke');
    setHideStubs(true);
    setIncludeSnapshots(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 text-zinc-200 sm:space-y-6 sm:p-6">
      <PageMeta
        title="SumoWatch — Leaderboard"
        description="Cross-division leaderboard standings with trust-aware wrestler context, safe image handling, and browsable tournament sources."
      />

      <PremiumPageHeader
        accentLabel="LEADERBOARD"
        title="Banzuke Leaderboard"
        subtitle="Cross-division standings from imported entity rows, with verified profile context surfaced only when the trust layer can match it safely."
        badge={selectedGroup ? selectedGroup.label : 'Standings'}
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Leaderboard' },
        ]}
        actions={(
          <>
            <Link
              to="/search"
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
            >
              Search
            </Link>
            <Link
              to="/basho"
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
            >
              Browse Basho
            </Link>
          </>
        )}
      >
        <div className="flex flex-col gap-2 text-sm text-zinc-400 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <PremiumBadge variant={sourceMeta.variant}>{sourceMeta.label}</PremiumBadge>
          <span><span className="font-semibold text-white">{rows.length}</span> visible wrestlers</span>
          <span><span className="font-semibold text-white">{recordsUsedCount}</span> source rows</span>
          {hideStubs ? <span>Stub rows hidden</span> : <span>Stub rows visible</span>}
          {isRefiningSearch ? <span>Refining search…</span> : null}
        </div>
      </PremiumPageHeader>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <PremiumSectionShell
          title="Search and Filters"
          subtitle="Search by shikona, rikishi id, or stable, then refine by division, source, and sort mode."
        >
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            helperText={`Browsing ${baseRowCount} non-stub rows from ${selectedGroupLabel}.`}
          />

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Standings source</span>
              <select
                value={selectedBasho}
                onChange={(event) => setSelectedBasho(event.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
              >
                {filteredGroupOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </label>

            <label className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Sort mode</span>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
              >
                <option value="banzuke">Official Banzuke Order</option>
                <option value="standings">Tournament Standings</option>
                <option value="ovr">Overall Rating</option>
              </select>
            </label>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-sm">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Visibility</span>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-zinc-300">
                  <input
                    type="checkbox"
                    checked={hideStubs}
                    onChange={(event) => setHideStubs(event.target.checked)}
                    className="rounded border-white/[0.08] accent-red-500"
                  />
                  Hide stub wrestlers
                </label>
                <label className="flex items-center gap-2 text-zinc-300">
                  <input
                    type="checkbox"
                    checked={includeSnapshots}
                    onChange={(event) => setIncludeSnapshots(event.target.checked)}
                    className="rounded border-white/[0.08] accent-red-500"
                  />
                  Include snapshot sources
                </label>
              </div>
            </div>
          </div>

          <div className="-mx-1 mt-4 overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2 px-1">
            <button
              type="button"
              onClick={() => setSelectedDivision('all')}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedDivision === 'all'
                  ? 'border-red-600/45 bg-red-950/18 text-red-100'
                  : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:border-red-600/35 hover:text-white'
              }`}
            >
              All divisions ({baseRowCount})
            </button>
            {DIVISION_OPTIONS.map((division) => (
              <button
                key={division}
                type="button"
                onClick={() => setSelectedDivision(division)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedDivision === division
                    ? 'border-red-600/45 bg-red-950/18 text-red-100'
                    : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:border-red-600/35 hover:text-white'
                }`}
              >
                {division} ({divisionCounts[division] || 0})
              </button>
            ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-sm text-zinc-500 sm:flex-row sm:flex-wrap sm:items-center">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-zinc-300 transition-colors hover:border-red-600/40 hover:text-white"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset filters
              </button>
            ) : (
              <span>Default leaderboard filters active.</span>
            )}
          </div>
        </PremiumSectionShell>

        <PremiumSectionShell
          title="Trust and Source Context"
          subtitle="Legacy standings rows are shown with verified profile context only when the trust layer can match them safely."
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-red-400" />
                <span className="text-sm font-semibold text-white">{selectedGroupLabel}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{sourceMeta.description}</p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ShieldCheck className="h-4 w-4 text-red-400" />
                  Verified context when available
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Leaderboard rows now surface verified profile and provenance cues when a canonical rikishi profile can be matched by id or shikona.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ImageIcon className="h-4 w-4 text-red-400" />
                  Verified image rule preserved
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Official photos only render when the verified profile layer confirms them. Otherwise the leaderboard falls back to neutral avatars.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Layers3 className="h-4 w-4 text-red-400" />
                  Legacy dataset caveat
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {missingBashoCount > 0
                    ? `${missingBashoCount} standings rows currently lack an explicit basho label in the entity layer, so some source labels are inferred or snapshot-based.`
                    : 'Current imported rows all carry explicit basho labels.'}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Database className="h-4 w-4 text-red-400" />
                  Entity response scope
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {hasEntityCap
                    ? `The current entity responses may have reached at least one API cap (${wrestlersData.length}/${WRESTLER_LIMIT} wrestler rows, ${bashoRecordsData.length}/${BASHO_RECORD_LIMIT} basho rows loaded). Treat this leaderboard as a browsable imported slice, not a guaranteed exhaustive live board.`
                    : `Current entity responses stayed below the API caps (${wrestlersData.length}/${WRESTLER_LIMIT} wrestler rows, ${bashoRecordsData.length}/${BASHO_RECORD_LIMIT} basho rows loaded).`}
                </p>
              </div>
            </div>
          </div>
        </PremiumSectionShell>
      </div>

      <PremiumSectionShell
        title="Leaderboard Standings"
        subtitle="This surface now shares the same search, trust, and navigation vocabulary as the newer product pages."
        trailing={
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            {loading ? <span>Loading…</span> : <span>{rows.length} results</span>}
            {loadError ? (
              <PremiumBadge variant="amber">Unavailable</PremiumBadge>
            ) : hasEntityCap ? (
              <PremiumBadge variant="amber">Loaded slice</PremiumBadge>
            ) : (
              <PremiumBadge variant="green">Loaded</PremiumBadge>
            )}
          </div>
        }
      >
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]"
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-800/40 bg-red-950/25 p-5">
            <p className="font-semibold text-red-200">Connection error</p>
            <p className="mt-1 text-sm text-red-300/75">{loadError}</p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="rounded-lg border border-red-700/40 bg-red-950/20 px-4 py-2 text-sm font-medium text-red-100 transition-colors hover:border-red-600/50"
              >
                Retry
              </button>
            </div>
          </div>
        ) : filteredGroupOptions.length === 0 ? (
          <EmptyState
            message="No standings sources are available"
            description="Import wrestler and basho record entities to populate this leaderboard."
            suggestions={[['Browse basho', '/basho']]}
          />
        ) : (
          <LeaderboardTable wrestlers={rows} onSelect={handleSelect} />
        )}
      </PremiumSectionShell>
    </div>
  );
}
