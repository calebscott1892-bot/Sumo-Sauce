import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import FallbackAvatar from '@/components/FallbackAvatar';
import { resolvePhotoUrl } from '@/utils/photo';

const WRESTLERS_URL = '/api/entities/Wrestler?limit=2000';
const BASHO_RECORDS_URL = '/api/entities/BashoRecord?limit=5000';

function normalizeSide(side) {
  const s = String(side || '').trim().toLowerCase();
  if (s === 'e' || s === 'east') return 'East';
  if (s === 'w' || s === 'west') return 'West';
  return '';
}

function toSafeNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

function rankLabelFrom(wrestler, record) {
  const rank = String(
    wrestler?.current_rank ||
      record?.rank ||
      wrestler?.rank ||
      ''
  ).trim();
  const rankNumber =
    toSafeNumber(wrestler?.current_rank_number, null) ??
    toSafeNumber(record?.rank_number, null) ??
    toSafeNumber(wrestler?.rank_number, null);
  const side = normalizeSide(
    wrestler?.current_side ||
      record?.side ||
      wrestler?.side ||
      ''
  );

  const parts = [rank || 'Unknown'];
  if (rankNumber !== null) parts.push(String(rankNumber));
  if (side) parts.push(side);
  return parts.join(' ').trim();
}

function getStableName(wrestler) {
  return String(
    wrestler?.stable ||
      wrestler?.heya?.name ||
      ''
  ).trim();
}

function getNationality(wrestler) {
  return String(
    wrestler?.nationality ||
      wrestler?.identity?.nationality ||
      ''
  ).trim();
}

function getImageSourceBadge(wrestler) {
  const official = String(wrestler?.official_image_url || '').trim().toLowerCase();
  const wiki = String(wrestler?.image?.url || '').trim();
  if (official.includes('sumo.or.jp')) return 'JSA image';
  if (wiki) return 'Wiki image';
  return 'No image';
}

function getRecordSourceBadge(record) {
  const recordId = String(record?.record_id || '').trim();
  const sourceTier = String(record?.source_tier || '').trim().toLowerCase();
  if (recordId.startsWith(':') || sourceTier.includes('official')) return 'official+stats';
  if (sourceTier) return 'mixed';
  return 'unknown';
}

function getWinPct(record) {
  const raw = Number(record?.win_pct);
  if (Number.isFinite(raw)) return raw;
  const wins = Number(record?.wins || 0);
  const losses = Number(record?.losses || 0);
  const total = wins + losses;
  return total > 0 ? wins / total : null;
}

function formatWinPct(record) {
  const pct = getWinPct(record);
  if (pct === null || !Number.isFinite(pct)) return '—';
  return `${(pct * 100).toFixed(1)}%`;
}

function getRecordChronoKey(record) {
  const snapshot = String(record?.snapshot_date || '').trim();
  if (snapshot) return snapshot;

  const basho = normalizeBashoText(record?.basho);
  const bashoDateMatch = basho.match(/(20\d{2})[-/](\d{2})/);
  if (bashoDateMatch) return `${bashoDateMatch[1]}-${bashoDateMatch[2]}`;

  const recordIdMatch = String(record?.record_id || '').match(/(20\d{2})[-/](\d{2})/);
  if (recordIdMatch) return `${recordIdMatch[1]}-${recordIdMatch[2]}`;

  const inferredYear = inferBashoFromRecordId(record?.record_id).match(/(20\d{2})/);
  if (inferredYear) return `${inferredYear[1]}-00`;

  const groupYear = getRecordGroup(record).label.match(/(20\d{2})/);
  if (groupYear) return `${groupYear[1]}-00`;

  return '';
}

function displayValue(value) {
  if (value === null || value === undefined) return '—';
  const text = String(value).trim();
  return text ? text : '—';
}

function toTrimmedString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = toTrimmedString(value);
    if (text) return text;
  }
  return '';
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const pct = n <= 1 ? n * 100 : n;
  return `${pct.toFixed(1)}%`;
}

function getStableValue(wrestler, fallbackRecord) {
  return firstNonEmpty(wrestler?.stable, wrestler?.heya?.name, fallbackRecord?.stable, fallbackRecord?.heya?.name);
}

function getNationalityValue(wrestler, fallbackRecord) {
  return firstNonEmpty(wrestler?.nationality, wrestler?.identity?.nationality, fallbackRecord?.nationality, fallbackRecord?.identity?.nationality);
}

function getBirthplaceValue(wrestler, fallbackRecord) {
  return firstNonEmpty(wrestler?.birthplace, wrestler?.identity?.birthplace, fallbackRecord?.birthplace, fallbackRecord?.identity?.birthplace);
}

function getBirthDateValue(wrestler, fallbackRecord) {
  return firstNonEmpty(wrestler?.dob, wrestler?.identity?.birth_date, fallbackRecord?.dob, fallbackRecord?.identity?.birth_date);
}

function getHeightWeightValue(wrestler, fallbackRecord) {
  const height = firstFiniteNumber(
    wrestler?.height_cm,
    wrestler?.physical?.height_cm,
    fallbackRecord?.height_cm,
    fallbackRecord?.physical?.height_cm
  );
  const weight = firstFiniteNumber(
    wrestler?.weight_kg,
    wrestler?.physical?.weight_kg,
    fallbackRecord?.weight_kg,
    fallbackRecord?.physical?.weight_kg
  );

  const h = height === null ? '—' : `${height} cm`;
  const w = weight === null ? '—' : `${weight} kg`;
  return `${h} / ${w}`;
}

function getDebutValue(wrestler, fallbackRecord) {
  return firstNonEmpty(wrestler?.debut, wrestler?.career?.debut_year, fallbackRecord?.debut, fallbackRecord?.career?.debut_year);
}

function getCareerTotals(wrestler, fallbackRecord) {
  const wins = firstFiniteNumber(fallbackRecord?.career_wins, wrestler?.records?.career_total?.wins);
  const losses = firstFiniteNumber(fallbackRecord?.career_losses, wrestler?.records?.career_total?.losses);
  const pct = firstFiniteNumber(fallbackRecord?.career_win_pct, wrestler?.records?.career_total?.win_percentage);
  return { wins, losses, pct };
}

function getYushoValue(wrestler, fallbackRecord) {
  const value = firstFiniteNumber(fallbackRecord?.yusho_top_div, wrestler?.titles?.yusho?.makuuchi);
  return value === null ? '—' : String(value);
}

function getSpecialPrizesValue(wrestler, fallbackRecord) {
  const value = firstFiniteNumber(fallbackRecord?.special_prizes, wrestler?.titles?.special_prizes?.total);
  return value === null ? '—' : String(value);
}

function getStylePair(wrestler, fallbackRecord) {
  const primary = firstNonEmpty(fallbackRecord?.style_primary, wrestler?.style_primary);
  const secondary = firstNonEmpty(fallbackRecord?.style_secondary, wrestler?.style_secondary);
  return {
    primary: primary || '—',
    secondary: secondary || '—',
  };
}

function getKimariteLine(fallbackRecord, index) {
  const name = toTrimmedString(fallbackRecord?.[`kimarite_${index}`]);
  const pctRaw = fallbackRecord?.[`kimarite_${index}_pct`];
  const pctText = formatPercent(pctRaw);

  if (!name) return '—';
  if (pctText === '—') return name;
  return `${name} (${pctText})`;
}

function computeOverallRating({ careerWinPct, yusho, specialPrizes, rankTier }) {
  let rating = 60;

  if (Number.isFinite(careerWinPct)) {
    rating += careerWinPct * 30;
  }

  if (Number.isFinite(yusho)) {
    rating += yusho * 2;
  }

  if (Number.isFinite(specialPrizes)) {
    rating += specialPrizes * 0.5;
  }

  const tier = String(rankTier || '').toLowerCase();
  if (tier.includes('yokozuna')) rating += 10;
  else if (tier.includes('ozeki')) rating += 7;
  else if (tier.includes('sekiwake')) rating += 5;
  else if (tier.includes('komusubi')) rating += 3;
  else if (tier.includes('maegashira')) rating += 1;

  const clamped = Math.min(99, Math.max(50, rating));
  return Math.round(clamped);
}

export default function WrestlerProfile() {
  const { rid } = useParams();
  const [wrestlersData, setWrestlersData] = useState([]);
  const [bashoRecordsData, setBashoRecordsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const [wrestlersRes, recordsRes] = await Promise.all([
          fetch(WRESTLERS_URL),
          fetch(BASHO_RECORDS_URL),
        ]);

        if (!wrestlersRes.ok || !recordsRes.ok) {
          throw new Error(`API error (wrestlers:${wrestlersRes.status}, records:${recordsRes.status})`);
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

  const ridKey = String(rid || '').trim().toLowerCase();

  const wrestler = useMemo(
    () => wrestlersData.find((w) => String(w?.rid || '').trim().toLowerCase() === ridKey) || null,
    [ridKey, wrestlersData]
  );

  const records = useMemo(() => {
    return bashoRecordsData
      .filter((r) => String(r?.rid || '').trim().toLowerCase() === ridKey)
      .sort((a, b) => {
        const groupA = getRecordGroup(a);
        const groupB = getRecordGroup(b);

        const typeOrder = {
          basho: 0,
          basho_inferred: 1,
          snapshot: 2,
          unknown: 3,
        };

        const typeDelta = (typeOrder[groupA.type] ?? 99) - (typeOrder[groupB.type] ?? 99);
        if (typeDelta !== 0) return typeDelta;

        const chronoDelta = getRecordChronoKey(b).localeCompare(getRecordChronoKey(a));
        if (chronoDelta !== 0) return chronoDelta;

        return groupB.label.localeCompare(groupA.label);
      });
  }, [bashoRecordsData, ridKey]);

  const groupedRecords = useMemo(() => {
    const groups = [];
    const byKey = new Map();

    records.forEach((record) => {
      const group = getRecordGroup(record);
      if (!byKey.has(group.key)) {
        const entry = {
          key: group.key,
          label: group.label,
          type: group.type,
          records: [],
          sortKey: getRecordChronoKey(record),
        };
        byKey.set(group.key, entry);
        groups.push(entry);
      }

      const entry = byKey.get(group.key);
      entry.records.push(record);
      const recordSortKey = getRecordChronoKey(record);
      if (recordSortKey.localeCompare(entry.sortKey) > 0) {
        entry.sortKey = recordSortKey;
      }
    });

    groups.forEach((group) => {
      group.records.sort((a, b) => getRecordChronoKey(b).localeCompare(getRecordChronoKey(a)));
    });

    return groups.sort((a, b) => {
      const typeOrder = {
        basho: 0,
        basho_inferred: 1,
        snapshot: 2,
        unknown: 3,
      };

      const typeDelta = (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
      if (typeDelta !== 0) return typeDelta;

      const sortDelta = b.sortKey.localeCompare(a.sortKey);
      if (sortDelta !== 0) return sortDelta;

      return b.label.localeCompare(a.label);
    });
  }, [records]);

  const fallbackRecord = records[0] || null;
  const profileName = String(wrestler?.shikona || fallbackRecord?.shikona || rid || 'Unknown').trim();
  const photoUrl = resolvePhotoUrl(wrestler);
  const division = String(
    wrestler?.current_division ||
      fallbackRecord?.division ||
      wrestler?.division ||
      '-'
  ).trim();
  const stable = getStableName(wrestler);
  const nationality = getNationality(wrestler);
  const latestGroup = fallbackRecord ? getRecordGroup(fallbackRecord) : null;
  const latestRankLabel = rankLabelFrom(wrestler, fallbackRecord);
  const latestRecordSourceBadge = getRecordSourceBadge(fallbackRecord);
  const statsSource = fallbackRecord || wrestler || {};
  const showBackendStatus = Boolean(loadError) || !loading;
  const stableColorKey = String(wrestler?.stable || wrestler?.heya?.name || '').trim();
  const profileRankTier = String(wrestler?.current_rank || fallbackRecord?.rank || wrestler?.rank || '').trim();

  const overviewStable = getStableValue(wrestler, fallbackRecord);
  const overviewNationality = getNationalityValue(wrestler, fallbackRecord);
  const overviewBirthplace = getBirthplaceValue(wrestler, fallbackRecord);
  const overviewBirthDate = getBirthDateValue(wrestler, fallbackRecord);
  const overviewHeightWeight = getHeightWeightValue(wrestler, fallbackRecord);
  const overviewDebut = getDebutValue(wrestler, fallbackRecord);

  const careerTotals = getCareerTotals(wrestler, fallbackRecord);
  const careerRecordText =
    careerTotals.wins === null && careerTotals.losses === null
      ? '—'
      : `${careerTotals.wins === null ? '—' : careerTotals.wins}-${careerTotals.losses === null ? '—' : careerTotals.losses}`;
  const careerWinPctText = formatPercent(careerTotals.pct);
  const yushoTopDivText = getYushoValue(wrestler, fallbackRecord);
  const specialPrizesText = getSpecialPrizesValue(wrestler, fallbackRecord);
  const overallRating = computeOverallRating({
    careerWinPct: careerTotals.pct,
    yusho: Number(yushoTopDivText),
    specialPrizes: Number(specialPrizesText),
    rankTier: profileRankTier,
  });
  const overallRatingTone = overallRating >= 90
    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
    : overallRating >= 80
      ? 'bg-sky-500/20 border-sky-500 text-sky-300'
      : overallRating >= 70
        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
        : 'bg-zinc-700 border-zinc-600 text-zinc-200';

  const stylePair = getStylePair(wrestler, fallbackRecord);
  const kimarite1 = getKimariteLine(fallbackRecord || {}, 1);
  const kimarite2 = getKimariteLine(fallbackRecord || {}, 2);
  const kimarite3 = getKimariteLine(fallbackRecord || {}, 3);

  useEffect(() => {
    setImageFailed(false);
  }, [ridKey, photoUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-6 text-zinc-300">
            Loading wrestler profile…
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-4 text-red-100">
            <div className="font-semibold">Failed to load wrestler profile data from API.</div>
            <div className="mt-1 font-mono text-xs text-red-200">{loadError}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-start justify-between gap-3">
          <Link to="/leaderboard" className="text-sm text-zinc-300 hover:text-white">
            ← Back to Leaderboard
          </Link>
          {showBackendStatus && (
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                loadError
                  ? 'border-red-700 bg-red-900/30 text-red-200'
                  : 'border-emerald-700 bg-emerald-900/30 text-emerald-200'
              }`}
            >
              {loadError ? `Backend: error (${loadError})` : 'Backend: connected'}
            </span>
          )}
        </div>

        {!wrestler && (
          <div className="mt-4 rounded-lg border border-yellow-700 bg-yellow-900/30 px-4 py-3 text-sm text-yellow-100">
            Wrestler details not found for rid: <span className="font-mono">{String(rid || '').trim() || '-'}</span>. Showing available records if any.
          </div>
        )}

        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
            <FallbackAvatar
              size="md"
              photoUrl={imageFailed ? '' : photoUrl}
              shikona={profileName}
              rid={String(rid || '').trim()}
              stable={stableColorKey}
              rank={profileRankTier}
              onImageError={() => setImageFailed(true)}
            />
            <div>
              <h1 className="text-3xl font-black">{profileName}</h1>
              <p className="text-zinc-300">{rankLabelFrom(wrestler, fallbackRecord)}</p>
              <p className="text-zinc-400 text-sm">Division: {division || '-'}</p>
              {stable && <p className="text-zinc-400 text-sm">Stable: {stable}</p>}
              {nationality && <p className="text-zinc-400 text-sm">Nationality: {nationality}</p>}
            </div>
            <div className={`h-16 w-16 rounded-full border ${overallRatingTone} flex flex-col items-center justify-center font-black`}>
              <span className="text-2xl leading-none">{overallRating}</span>
              <span className="text-[10px] leading-none tracking-widest">OVR</span>
            </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {(!photoUrl || imageFailed) && (
                <span className="rounded border border-amber-700 bg-amber-900/30 px-2 py-1 text-amber-200">Photo missing</span>
              )}
              <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">{getImageSourceBadge(wrestler || {})}</span>
              <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">{latestRecordSourceBadge}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-4 inline-flex rounded-md border border-zinc-700 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`rounded px-3 py-1 text-xs font-bold ${
                activeTab === 'overview' ? 'bg-red-600 text-white' : 'text-zinc-300'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('records')}
              className={`rounded px-3 py-1 text-xs font-bold ${
                activeTab === 'records' ? 'bg-red-600 text-white' : 'text-zinc-300'
              }`}
            >
              Records
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stats')}
              className={`rounded px-3 py-1 text-xs font-bold ${
                activeTab === 'stats' ? 'bg-red-600 text-white' : 'text-zinc-300'
              }`}
            >
              Stats
            </button>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-zinc-800 px-3 py-2">
                <div className="text-zinc-400">Latest basho group</div>
                <div className="font-bold text-zinc-100">{latestGroup?.label || '—'}</div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 backdrop-blur p-4">
                  <div className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-zinc-500">Identity</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Stable</span><span className="text-right font-semibold text-zinc-100">{displayValue(overviewStable)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Nationality</span><span className="text-right font-semibold text-zinc-100">{displayValue(overviewNationality)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Birthplace</span><span className="text-right font-semibold text-zinc-100">{displayValue(overviewBirthplace)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Birth date</span><span className="text-right font-semibold text-zinc-100">{displayValue(overviewBirthDate)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Height / Weight</span><span className="text-right font-semibold text-zinc-100">{displayValue(overviewHeightWeight)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Debut</span><span className="text-right font-semibold text-zinc-100">{displayValue(overviewDebut)}</span></div>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 backdrop-blur p-4">
                  <div className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-zinc-500">Career</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Career record</span><span className="text-right text-lg font-black text-zinc-100">{displayValue(careerRecordText)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Career win %</span><span className="text-right text-base font-bold text-emerald-300">{careerWinPctText}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Yusho (top division)</span><span className="text-right font-semibold text-zinc-100">{displayValue(yushoTopDivText)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Special prizes</span><span className="text-right font-semibold text-zinc-100">{displayValue(specialPrizesText)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Latest rank</span><span className="text-right font-semibold text-zinc-100">{displayValue(latestRankLabel)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Latest win %</span><span className="text-right font-semibold text-zinc-100">{formatWinPct(fallbackRecord)}</span></div>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 backdrop-blur p-4">
                  <div className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-zinc-500">Style</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Primary / Secondary</span><span className="text-right font-semibold text-zinc-100">{displayValue(stylePair.primary)} / {displayValue(stylePair.secondary)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Kimarite #1</span><span className="text-right font-semibold text-zinc-100">{displayValue(kimarite1)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Kimarite #2</span><span className="text-right font-semibold text-zinc-100">{displayValue(kimarite2)}</span></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Kimarite #3</span><span className="text-right font-semibold text-zinc-100">{displayValue(kimarite3)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            groupedRecords.length === 0 ? (
              <p className="text-zinc-400">No basho records found.</p>
            ) : (
              <div className="space-y-3">
                {groupedRecords.map((group) => (
                  <div key={group.key} className="rounded-lg border border-zinc-800">
                    <div className="border-b border-zinc-800 px-3 py-2 text-sm font-bold text-zinc-200">
                      {group.label}
                    </div>
                    <div className="space-y-1 p-2">
                      {group.records.map((record, index) => (
                        <div
                          key={String(record?.record_id || `${group.key}-${index}`)}
                          className="flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2"
                        >
                          <div>
                            <div className="text-xs text-zinc-400">{rankLabelFrom(null, record)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-zinc-100">
                              {Number.isFinite(Number(record?.wins)) ? Number(record?.wins) : 0}-
                              {Number.isFinite(Number(record?.losses)) ? Number(record?.losses) : 0}
                            </div>
                            <div className="text-xs text-zinc-400">{formatWinPct(record)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'stats' && (
            <div className="grid gap-2 md:grid-cols-2 text-sm">
              <div className="rounded-lg border border-zinc-800 px-3 py-2">
                <div className="text-zinc-400">career_wins</div>
                <div className="font-bold text-zinc-100">{displayValue(statsSource?.career_wins)}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 px-3 py-2">
                <div className="text-zinc-400">career_losses</div>
                <div className="font-bold text-zinc-100">{displayValue(statsSource?.career_losses)}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 px-3 py-2">
                <div className="text-zinc-400">career_win_pct</div>
                <div className="font-bold text-zinc-100">{displayValue(statsSource?.career_win_pct)}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 px-3 py-2">
                <div className="text-zinc-400">yusho_top_div</div>
                <div className="font-bold text-zinc-100">{displayValue(statsSource?.yusho_top_div)}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 px-3 py-2">
                <div className="text-zinc-400">special_prizes</div>
                <div className="font-bold text-zinc-100">{displayValue(statsSource?.special_prizes)}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 px-3 py-2">
                <div className="text-zinc-400">style_primary / style_secondary</div>
                <div className="font-bold text-zinc-100">
                  {displayValue(statsSource?.style_primary)} / {displayValue(statsSource?.style_secondary)}
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 px-3 py-2 md:col-span-2">
                <div className="text-zinc-400">Kimarite top 3</div>
                <div className="font-bold text-zinc-100">
                  {displayValue(statsSource?.kimarite_1)} ({displayValue(statsSource?.kimarite_1_pct)}) ·{' '}
                  {displayValue(statsSource?.kimarite_2)} ({displayValue(statsSource?.kimarite_2_pct)}) ·{' '}
                  {displayValue(statsSource?.kimarite_3)} ({displayValue(statsSource?.kimarite_3_pct)})
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
