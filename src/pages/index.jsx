import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ArrowRight, Calendar, ChevronDown, Database, Layers3, Search, ShieldCheck, Swords, Trophy } from 'lucide-react';
import Layout from './Layout.jsx';
import BashoQuickNav from '@/components/navigation/BashoQuickNav';
import RikishiSearch from '@/components/navigation/RikishiSearch';
import FeaturedEditorialRail from '@/components/home/FeaturedEditorialRail';
import DatasetInfoPanel from '@/components/system/DatasetInfoPanel';
import DiscoveryCard from '@/components/system/DiscoveryCard';
import PageMeta from '@/components/ui/PageMeta';
import { getVerifiedDatasetMetrics } from '@/data/verifiedProfiles';
import { getWatchlistEntries } from '@/utils/favorites';
import { getAllRecent } from '@/utils/recentlyViewed';
import { getPublishedProfileEntries } from '@/utils/publishedProfileBrowsing';
import RikishiProfileSkeleton from '@/components/ui/skeletons/RikishiProfileSkeleton';
import CompareSkeleton from '@/components/ui/skeletons/CompareSkeleton';
import BashoStandingsSkeleton from '@/components/ui/skeletons/BashoStandingsSkeleton';

const RikishiPage = lazy(() => import('./RikishiPage'));
const ComparePage = lazy(() => import('./ComparePage'));
const BashoDivisionPage = lazy(() => import('./BashoDivisionPage'));
const BashoOverviewPage = lazy(() => import('./BashoOverviewPage'));
const GlobalStatsPage = lazy(() => import('./GlobalStatsPage'));
const KimariteAnalyticsPage = lazy(() => import('./KimariteAnalyticsPage'));
const BashoBrowserPage = lazy(() => import('./BashoBrowserPage'));
const RikishiDirectoryPage = lazy(() => import('./RikishiDirectoryPage'));
const StablesPage = lazy(() => import('./StablesPage'));
const StablePage = lazy(() => import('./StablePage'));
const BashoComparePage = lazy(() => import('./BashoComparePage'));
const RivalryExplorerPage = lazy(() => import('./RivalryExplorerPage'));
const EraAnalyticsPage = lazy(() => import('./EraAnalyticsPage'));
const BashoTimelinePage = lazy(() => import('./BashoTimelinePage'));
const SearchPage = lazy(() => import('./SearchPage'));
const BashoDayResultsPage = lazy(() => import('./BashoDayResultsPage'));
const Leaderboard = lazy(() => import('./Leaderboard.jsx'));
const NotFoundPage = lazy(() => import('./NotFoundPage'));
/** Redirect legacy /wrestler/:rid URLs to the canonical /rikishi/:rid path. */
function LegacyWrestlerRedirect() {
  const { rid } = useParams();
  return <Navigate to={`/rikishi/${rid || ''}`} replace />;
}
const AdminImport = lazy(() => import('./AdminImport.jsx'));
const AdminDataConfidencePage = lazy(() => import('./AdminDataConfidencePage'));
const WatchlistPage = lazy(() => import('./WatchlistPage'));

function HomeHeroStaticTitle() {
  return (
    <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
      The Grand Sumo Reference
    </h1>
  );
}

function HomeHeroGuidanceRail() {
  return (
    <aside className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4 shadow-[0_20px_44px_rgba(0,0,0,0.28)]">
      <div className="relative">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Quick start
        </div>
        <div className="mt-2 min-h-[1.7rem] text-sm font-medium text-zinc-200">
          Search a rikishi, open basho standings, or compare wrestlers head-to-head.
        </div>
      </div>
    </aside>
  );
}

function WatchlistPanel() {
  const [watchlist, setWatchlist] = useState(() => getWatchlistEntries());

  useEffect(() => {
    const handler = () => setWatchlist(getWatchlistEntries());
    window.addEventListener('sumosauce:favorites-changed', handler);
    return () => window.removeEventListener('sumosauce:favorites-changed', handler);
  }, []);

  if (!watchlist.length) return null;

  const preview = watchlist.slice(0, 4);
  const counts = watchlist.reduce((acc, entry) => {
    acc[entry.type] = (acc[entry.type] || 0) + 1;
    return acc;
  }, {});

  const typeMeta = {
    rikishi: {
      label: 'Rikishi',
      tone: 'border-red-800/30 bg-red-950/12 hover:border-red-600/40',
      detail: 'Profile and records context.',
    },
    basho: {
      label: 'Basho',
      tone: 'border-blue-800/30 bg-blue-950/12 hover:border-blue-500/40',
      detail: 'Overview and division paths.',
    },
    rivalry: {
      label: 'Rivalry',
      tone: 'border-emerald-800/30 bg-emerald-950/12 hover:border-emerald-500/40',
      detail: 'Pair-level compare context.',
    },
    stable: {
      label: 'Stable',
      tone: 'border-amber-800/30 bg-amber-950/12 hover:border-amber-500/40',
      detail: 'Heya and roster depth.',
    },
  };

  return (
    <section className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.14)] sm:p-5" aria-label="Saved watchlist">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Saved watchlist</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">Local saves for the pages you want back fast.</p>
        </div>
        <Link
          to="/watchlist"
          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-red-600/40 hover:text-white"
        >
          Open full watchlist
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300">
          {watchlist.length} saved items
        </span>
        {Object.entries(typeMeta).map(([type, meta]) => (
          counts[type] ? (
            <span key={type} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">
              {counts[type]} {meta.label.toLowerCase()}{counts[type] === 1 ? '' : 's'}
            </span>
          ) : null
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {preview.map((entry) => {
          const meta = typeMeta[entry.type];
          return (
            <Link
              key={`${entry.type}-${entry.id}`}
              to={entry.path}
              className={`rounded-xl border p-4 transition-all hover:text-white ${meta.tone}`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{meta.label}</div>
              <div className="mt-2 font-display text-lg font-bold tracking-tight text-white">{entry.label}</div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">{meta.detail}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ContinueExploringRow() {
  const [recent, setRecent] = useState(() => getAllRecent(6));

  useEffect(() => {
    const handler = () => setRecent(getAllRecent(6));
    window.addEventListener('sumosauce:recently-viewed', handler);
    return () => window.removeEventListener('sumosauce:recently-viewed', handler);
  }, []);

  if (!recent.length) return null;

  const typeColors = {
    rikishi: 'border-red-800/30 bg-red-950/15 hover:border-red-600/40',
    basho: 'border-blue-800/30 bg-blue-950/15 hover:border-blue-500/40',
    rivalry: 'border-purple-800/30 bg-purple-950/15 hover:border-purple-500/40',
  };

  const typeLabels = {
    rikishi: 'Rikishi',
    basho: 'Basho',
    rivalry: 'Rivalry',
  };

  const typePaths = {
    rikishi: (id) => `/rikishi/${encodeURIComponent(id)}`,
    basho: (id) => `/basho/${encodeURIComponent(id)}`,
    rivalry: (id) => `/compare/${id}`,
  };

  return (
    <section className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.14)] sm:p-5" aria-label="Continue exploring">
      <h2 className="font-display text-lg font-semibold text-white">Continue exploring</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {recent.map((item) => (
          <Link
            key={`${item.type}-${item.id}`}
            to={typePaths[item.type](item.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm text-zinc-200 transition-all hover:text-white ${typeColors[item.type]}`}
          >
            <span className="mr-1.5 text-[10px] uppercase text-zinc-500">{typeLabels[item.type]}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function HomeSectionIntro({ eyebrow, title, description }) {
  return (
    <div className="mb-4 max-w-3xl sm:mb-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400">{eyebrow}</div>
      <h2 className="mt-2 font-display text-[1.65rem] font-bold tracking-tight text-white sm:text-[1.85rem]">{title}</h2>
      {description ? <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-500">{description}</p> : null}
    </div>
  );
}

function HomePathCard({ icon: Icon, title, description, to, cta, tone = 'zinc' }) {
  const toneStyles = {
    red: 'hover:border-red-600/40 hover:bg-red-950/12',
    blue: 'hover:border-blue-500/35 hover:bg-blue-950/12',
    emerald: 'hover:border-emerald-500/35 hover:bg-emerald-950/12',
    zinc: 'hover:border-white/[0.12] hover:bg-white/[0.04]',
  };

  return (
    <Link
      to={to}
      className={`group rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.14)] transition-all sm:p-6 ${toneStyles[tone] ?? toneStyles.zinc}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
          <Icon className="h-5 w-5 text-zinc-300 transition-colors group-hover:text-white" />
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors group-hover:text-zinc-300">
          {cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>

      <h3 className="mt-5 font-display text-[1.25rem] font-bold tracking-tight text-white sm:text-[1.35rem]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">{description}</p>
    </Link>
  );
}

function TrustMethodologyCard() {
  const metrics = useMemo(() => getVerifiedDatasetMetrics(), []);
  const latestVerified = metrics.latestVerifiedBashoLabel ?? 'where that context is published';

  return (
    <section className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.14)]" aria-label="Verification methodology">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-red-400" />
        <h2 className="font-display text-lg font-bold tracking-tight text-white">Trust notes</h2>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">Trust cues appear only where they are actually published.</p>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <ShieldCheck className="h-4 w-4 text-red-400" />
            Profile cues
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">Confidence, provenance, image policy, and source refs stay attached to each published profile.</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Database className="h-4 w-4 text-red-400" />
            Published sources
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">Published trust cues only use sources already named in the product.</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <ShieldCheck className="h-4 w-4 text-red-400" />
            Images and freshness
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">Latest verified basho reaches {latestVerified}, and official images only appear after verification.</p>
        </div>
      </div>
    </section>
  );
}

function HomePage() {
  const metrics = useMemo(() => getVerifiedDatasetMetrics(), []);
  const publishedProfiles = useMemo(() => getPublishedProfileEntries(), []);
  const latestTournamentPath = '/basho';
  const latestTournamentLabel = 'Basho browser';
  const routeableProfileCount = useMemo(
    () => publishedProfiles.filter((entry) => entry.routeable).length,
    [publishedProfiles],
  );

  const heroStats = [
    { value: metrics.totalProfiles.toLocaleString(), label: 'Published', sub: 'profiles' },
    { value: routeableProfileCount.toLocaleString(), label: 'Full pages', sub: 'wrestler detail' },
    {
      value: metrics.latestVerifiedBashoLabel ?? 'Varies',
      label: 'Latest verified',
      sub: 'when published',
    },
  ];

  const startHereCards = [
    {
      icon: Search,
      title: 'Search a wrestler',
      description: 'Find a rikishi by shikona, id, heya, or division.',
      to: '/search',
      cta: 'Search rikishi',
      tone: 'red',
    },
    {
      icon: Calendar,
      title: `Open ${latestTournamentLabel}`,
      description: 'Open tournament coverage that is currently published in this deployment.',
      to: latestTournamentPath,
      cta: 'Browse basho',
      tone: 'blue',
    },
    {
      icon: ShieldCheck,
      title: 'Browse profile coverage',
      description: 'See published profiles, including profile-only entries.',
      to: '/rikishi',
      cta: 'Profile directory',
      tone: 'emerald',
    },
    {
      icon: Trophy,
      title: 'Check the rankings',
      description: 'Open division-led standings and slices.',
      to: '/leaderboard',
      cta: 'Leaderboard',
      tone: 'zinc',
    },
  ];

  const curatedBrowseCards = [
    {
      icon: Trophy,
      title: 'Records and milestones',
      description: 'Move from titles into wrestler record pages fast.',
      to: '/analytics#championship-trail',
      cta: 'Championship trail',
      tone: 'emerald',
    },
    {
      icon: Swords,
      title: 'Rivalries with context',
      description: 'Open head-to-head context when one profile is not enough.',
      to: '/rivalries',
      cta: 'Rivalry explorer',
      tone: 'blue',
    },
    {
      icon: Layers3,
      title: 'Stable rooms and heya depth',
      description: 'Add heya and roster context around any rikishi.',
      to: '/stables',
      cta: 'Browse stables',
      tone: 'zinc',
    },
    {
      icon: Database,
      title: 'Analytics with a starting point',
      description: 'Use analytics when you want the broader picture quickly.',
      to: '/analytics#sample-overview',
      cta: 'Analytics overview',
      tone: 'red',
    },
  ];

  const handleSeeSelectedWork = () => {
    const target = document.getElementById('selected-work');
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <PageMeta
        title="Sumo Sauce"
        description="Search published rikishi profiles, open the latest basho, and move quickly into rankings, records, rivalries, and analytics."
      />

      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/10 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pb-14 sm:pt-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:items-end lg:gap-10">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-500 sm:text-xs">
                <span>Sumo Sauce</span>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-zinc-400">Profiles, basho, rivalries</span>
              </div>

              <div className="mt-4">
                <img
                  src="/logo.png"
                  alt="Sumo Sauce mark"
                  className="h-auto w-[min(21rem,82vw)] max-w-full object-contain object-left drop-shadow-[0_0_20px_rgba(255,255,255,0.08)] sm:w-[23rem] lg:w-[26rem]"
                />
              </div>

              <HomeHeroStaticTitle />
              <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-300">
                Search profiles, open published basho coverage, or follow records and rivalries.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-zinc-300">
                  {metrics.totalProfiles.toLocaleString()} published profiles
                </span>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">
                  {routeableProfileCount.toLocaleString()} full wrestler pages
                </span>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">
                  Trust cues only where published
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-black/10 bg-white/70 p-4 shadow-[0_22px_60px_rgba(20,20,20,0.18)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-black/20 dark:shadow-[0_22px_60px_rgba(0,0,0,0.22)] sm:p-5">
              <HomeHeroGuidanceRail />
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Search published profiles</div>
              <div className="mt-3">
                <RikishiSearch />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to={latestTournamentPath}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
                >
                  <Calendar className="h-4 w-4" />
                  Open {latestTournamentLabel}
                </Link>
                <Link
                  to="/rikishi"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-red-600/40 hover:bg-white/[0.06] hover:text-white"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Profiles
                </Link>
                <Link
                  to="/leaderboard"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-red-600/40 hover:bg-white/[0.06] hover:text-white"
                >
                  <Trophy className="h-4 w-4" />
                  Rankings
                </Link>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {heroStats.map(({ value, label, sub }) => (
                  <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3 text-left">
                    <div className="font-display text-lg font-bold text-white sm:text-xl">{value}</div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</div>
                    <div className="mt-1 text-[10px] leading-relaxed text-zinc-600">{sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
          <button
            type="button"
            onClick={handleSeeSelectedWork}
            className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.06] px-4 py-2 text-sm font-medium text-zinc-200 shadow-[0_10px_28px_rgba(0,0,0,0.24)] backdrop-blur-md transition-all hover:border-red-500/40 hover:text-white"
          >
            <span>Explore the dohyō</span>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.16] bg-white/[0.03]">
              <ChevronDown className="hero-next-cue-arrow h-3.5 w-3.5 text-zinc-300" />
            </span>
          </button>
        </div>

        <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600" />
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-6 sm:space-y-12 sm:px-6 sm:py-8">
        <section id="selected-work" aria-label="First-run guidance">
          <HomeSectionIntro
            eyebrow="START HERE"
            title="Start in one click"
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {startHereCards.map((card) => (
              <HomePathCard
                key={card.title}
                icon={card.icon}
                title={card.title}
                description={card.description}
                to={card.to}
                cta={card.cta}
                tone={card.tone}
              />
            ))}
          </div>
        </section>

        <section aria-label="Featured editorial entry points">
          <FeaturedEditorialRail />
        </section>

        <section aria-label="Latest basho guidance">
          <HomeSectionIntro
            eyebrow="CURRENT TOURNAMENT"
            title="Latest basho"
          />
          <BashoQuickNav />
        </section>

        <section aria-label="Curated browse paths">
          <HomeSectionIntro
            eyebrow="CURATED PATHS"
            title="Browse with intent"
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {curatedBrowseCards.map((card) => (
              <HomePathCard
                key={card.title}
                icon={card.icon}
                title={card.title}
                description={card.description}
                to={card.to}
                cta={card.cta}
                tone={card.tone}
              />
            ))}
          </div>
        </section>

        <section aria-label="Continue or discover">
          <HomeSectionIntro
            eyebrow="KEEP GOING"
            title="Resume or wander"
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="space-y-4">
              <ContinueExploringRow />
              <WatchlistPanel />
            </div>
            <DiscoveryCard />
          </div>
        </section>

        <section id="trust" aria-label="Trust and coverage">
          <HomeSectionIntro
            eyebrow="TRUST & COVERAGE"
            title="Trust notes"
            description="Short, honest context for coverage and verification."
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <DatasetInfoPanel />
            <TrustMethodologyCard />
          </div>
        </section>

      </div>
    </div>
  );
}

export default function Pages() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/leaderboard" element={<Suspense fallback={<BashoStandingsSkeleton />}><Leaderboard /></Suspense>} />
          <Route path="/rikishi/:id" element={<Suspense fallback={<RikishiProfileSkeleton />}><RikishiPage /></Suspense>} />
          <Route path="/compare/:a/:b" element={<Suspense fallback={<CompareSkeleton />}><ComparePage /></Suspense>} />
          <Route path="/basho/:bashoId/:division" element={<Suspense fallback={<BashoStandingsSkeleton />}><BashoDivisionPage /></Suspense>} />
          <Route path="/basho/:bashoId/:division/day/:day" element={<Suspense fallback={<BashoStandingsSkeleton />}><BashoDayResultsPage /></Suspense>} />
          <Route path="/basho/:bashoId" element={<Suspense fallback={<BashoStandingsSkeleton />}><BashoOverviewPage /></Suspense>} />
          <Route path="/basho" element={<Suspense fallback={<BashoStandingsSkeleton />}><BashoBrowserPage /></Suspense>} />
          <Route path="/rikishi" element={<Suspense fallback={<BashoStandingsSkeleton />}><RikishiDirectoryPage /></Suspense>} />
          <Route path="/stables" element={<Suspense fallback={<BashoStandingsSkeleton />}><StablesPage /></Suspense>} />
          <Route path="/stables/:slug" element={<Suspense fallback={<BashoStandingsSkeleton />}><StablePage /></Suspense>} />
          <Route path="/compare/basho/:a/:b" element={<Suspense fallback={<BashoStandingsSkeleton />}><BashoComparePage /></Suspense>} />
          <Route path="/analytics" element={<Suspense fallback={<BashoStandingsSkeleton />}><GlobalStatsPage /></Suspense>} />
          <Route path="/analytics/kimarite" element={<Suspense fallback={<BashoStandingsSkeleton />}><KimariteAnalyticsPage /></Suspense>} />
          <Route path="/analytics/eras" element={<Suspense fallback={<BashoStandingsSkeleton />}><EraAnalyticsPage /></Suspense>} />
          <Route path="/rivalries" element={<Suspense fallback={<BashoStandingsSkeleton />}><RivalryExplorerPage /></Suspense>} />
          <Route path="/search" element={<Suspense fallback={<BashoStandingsSkeleton />}><SearchPage /></Suspense>} />
          <Route path="/timeline" element={<Suspense fallback={<BashoStandingsSkeleton />}><BashoTimelinePage /></Suspense>} />
          <Route path="/watchlist" element={<Suspense fallback={<BashoStandingsSkeleton />}><WatchlistPage /></Suspense>} />
          <Route path="/wrestler/:rid" element={<LegacyWrestlerRedirect />} />
          <Route path="/admin/import" element={<Suspense fallback={<BashoStandingsSkeleton />}><AdminImport /></Suspense>} />
          <Route path="/admin/data-confidence" element={<Suspense fallback={<BashoStandingsSkeleton />}><AdminDataConfidencePage /></Suspense>} />
          <Route path="*" element={<Suspense fallback={<BashoStandingsSkeleton />}><NotFoundPage /></Suspense>} />
        </Routes>
      </Layout>
    </Router>
  );
}
