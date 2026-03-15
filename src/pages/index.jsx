import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ArrowRight, Calendar, Database, Layers3, Search, ShieldCheck, Swords, Trophy } from 'lucide-react';
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
import { bashoDisplayName, latestBashoId } from '@/utils/basho';
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
const AdminImport = lazy(() => import('./AdminImport.jsx'));
const AdminDataConfidencePage = lazy(() => import('./AdminDataConfidencePage'));
const WatchlistPage = lazy(() => import('./WatchlistPage'));

function WatchlistPanel() {
  const [watchlist, setWatchlist] = useState(() => getWatchlistEntries());

  useEffect(() => {
    const handler = () => setWatchlist(getWatchlistEntries());
    window.addEventListener('sumosauce:favorites-changed', handler);
    return () => window.removeEventListener('sumosauce:favorites-changed', handler);
  }, []);

  if (!watchlist.length) return null;

  const preview = watchlist.slice(0, 6);
  const counts = watchlist.reduce((acc, entry) => {
    acc[entry.type] = (acc[entry.type] || 0) + 1;
    return acc;
  }, {});

  const typeMeta = {
    rikishi: {
      label: 'Rikishi',
      tone: 'border-red-800/30 bg-red-950/12 hover:border-red-600/40',
      detail: 'Profile, records, and matchup context.',
    },
    basho: {
      label: 'Basho',
      tone: 'border-blue-800/30 bg-blue-950/12 hover:border-blue-500/40',
      detail: 'Tournament overview and division paths.',
    },
    rivalry: {
      label: 'Rivalry',
      tone: 'border-emerald-800/30 bg-emerald-950/12 hover:border-emerald-500/40',
      detail: 'Pair-level compare pages worth revisiting.',
    },
    stable: {
      label: 'Stable',
      tone: 'border-amber-800/30 bg-amber-950/12 hover:border-amber-500/40',
      detail: 'Heya depth and roster context.',
    },
  };

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5" aria-label="Saved watchlist">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Saved watchlist</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">Local-first saves for pages you want to reopen quickly on this device.</p>
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
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{meta.detail}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ContinueExploringRow() {
  const [recent, setRecent] = useState(() => getAllRecent(8));

  useEffect(() => {
    const handler = () => setRecent(getAllRecent(8));
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
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5" aria-label="Continue exploring">
      <h2 className="font-display text-lg font-semibold text-white">Continue exploring</h2>
      <p className="mt-1 text-xs text-zinc-500">Recent rikishi, basho, and rivalry pages.</p>
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
    <div className="mb-4 max-w-3xl">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400">{eyebrow}</div>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">{title}</h2>
      {description ? <p className="mt-1 text-sm leading-relaxed text-zinc-500">{description}</p> : null}
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
      className={`group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all ${toneStyles[tone] ?? toneStyles.zinc}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
          <Icon className="h-5 w-5 text-zinc-300 transition-colors group-hover:text-white" />
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors group-hover:text-zinc-300">
          {cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>

      <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{description}</p>
    </Link>
  );
}

function TrustMethodologyCard() {
  const metrics = useMemo(() => getVerifiedDatasetMetrics(), []);
  const latestVerified = metrics.latestVerifiedBashoLabel ?? 'where that context is published';

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5" aria-label="Verification methodology">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-red-400" />
        <h2 className="font-display text-lg font-bold tracking-tight text-white">How the profile layer works</h2>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">Sumo Sauce publishes trust cues profile by profile, not as a fake sitewide badge.</p>

      <div className="mt-4 grid gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <ShieldCheck className="h-4 w-4 text-red-400" />
            Profile-by-profile
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">Confidence, provenance, image policy, and source refs appear only where they are actually published.</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Database className="h-4 w-4 text-red-400" />
            Source model
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">JSA profiles, SumoDB, and corroborating references may all contribute to a published trust cue.</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <ShieldCheck className="h-4 w-4 text-red-400" />
            Freshness and images
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">Latest verified basho currently reaches {latestVerified}, and official images only appear after image verification.</p>
        </div>
      </div>
    </section>
  );
}

function HomePage() {
  const metrics = useMemo(() => getVerifiedDatasetMetrics(), []);
  const publishedProfiles = useMemo(() => getPublishedProfileEntries(), []);
  const latestTournamentId = latestBashoId();
  const latestTournamentPath = latestTournamentId ? `/basho/${encodeURIComponent(latestTournamentId)}` : '/basho';
  const latestTournamentLabel = latestTournamentId ? bashoDisplayName(latestTournamentId) : 'Latest basho';
  const routeableProfileCount = useMemo(
    () => publishedProfiles.filter((entry) => entry.routeable).length,
    [publishedProfiles],
  );

  const heroStats = [
    { value: metrics.totalProfiles.toLocaleString(), label: 'Published profiles', sub: 'visible in the profile layer' },
    { value: routeableProfileCount.toLocaleString(), label: 'Routeable pages', sub: 'open full wrestler pages' },
    { value: metrics.profilesWithSourceRefsCount.toLocaleString(), label: 'Source-linked', sub: 'publish at least one source ref' },
    {
      value: metrics.latestVerifiedBashoLabel ?? 'Varies',
      label: 'Latest verified basho',
      sub: 'shown where published',
    },
  ];

  const startHereCards = [
    {
      icon: Search,
      title: 'Search a wrestler',
      description: 'Search the published profile layer by shikona, id, heya, or division.',
      to: '/search',
      cta: 'Search rikishi',
      tone: 'red',
    },
    {
      icon: Calendar,
      title: `Open ${latestTournamentLabel}`,
      description: 'See the latest tournament first, then move into any division from there.',
      to: latestTournamentPath,
      cta: 'Latest basho',
      tone: 'blue',
    },
    {
      icon: ShieldCheck,
      title: 'Browse profile coverage',
      description: 'Open the full published profile directory, including profile-only entries without a routeable career page yet.',
      to: '/rikishi',
      cta: 'Profile directory',
      tone: 'emerald',
    },
    {
      icon: Trophy,
      title: 'Check the rankings',
      description: 'Use the leaderboard when you want a standings-led view across divisions.',
      to: '/leaderboard',
      cta: 'Leaderboard',
      tone: 'zinc',
    },
  ];

  const curatedBrowseCards = [
    {
      icon: Trophy,
      title: 'Records and milestones',
      description: 'Open championship trails and records-linked wrestler pages without digging through metadata first.',
      to: '/analytics#championship-trail',
      cta: 'Championship trail',
      tone: 'emerald',
    },
    {
      icon: Swords,
      title: 'Rivalries with context',
      description: 'Use the rivalry explorer when one wrestler page is not enough.',
      to: '/rivalries',
      cta: 'Rivalry explorer',
      tone: 'blue',
    },
    {
      icon: Layers3,
      title: 'Stable rooms and heya depth',
      description: 'Browse stables when you want roster context around the rikishi you are tracking.',
      to: '/stables',
      cta: 'Browse stables',
      tone: 'zinc',
    },
    {
      icon: Database,
      title: 'Analytics with a starting point',
      description: 'Open the analytics front door for sample context, standout rikishi, and broader patterns.',
      to: '/analytics#sample-overview',
      cta: 'Analytics overview',
      tone: 'red',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <PageMeta
        title="Sumo Sauce"
        description="Search published rikishi profiles, open the latest basho, and move quickly into rankings, records, rivalries, and analytics."
      />

      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/10 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-500 sm:text-xs">
              <span>Sumo Sauce</span>
              <span className="text-zinc-600">Published profile layer + basho browsing</span>
            </div>

            <div className="mt-4">
              <img
                src="/logo.png"
                alt="Sumo Sauce mark"
                className="h-auto w-[min(18rem,72vw)] max-w-full object-contain object-left drop-shadow-2xl sm:w-[20rem] lg:w-[22rem]"
              />
            </div>

            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find wrestlers, tournaments, and records fast.
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-300">
              Search the published profile directory, open the latest basho, or jump straight into rankings, rivalries, and milestone context.
            </p>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="max-w-xl">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Search published profiles</div>
              <RikishiSearch />
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                {metrics.totalProfiles.toLocaleString()} published profiles are searchable here. {routeableProfileCount.toLocaleString()} currently open full wrestler pages.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Link
                to={latestTournamentPath}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
              >
                <Calendar className="h-4 w-4" />
                Open {latestTournamentLabel}
              </Link>
              <Link
                to="/leaderboard"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-red-600/40 hover:bg-white/[0.06] hover:text-white"
              >
                <Trophy className="h-4 w-4" />
                Rankings
              </Link>
              <Link
                to="/rikishi"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-red-600/40 hover:bg-white/[0.06] hover:text-white"
              >
                <ShieldCheck className="h-4 w-4" />
                Profiles
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {heroStats.map(({ value, label, sub }) => (
              <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-left sm:px-4 sm:text-center">
                <div className="font-display text-xl font-bold text-white sm:text-2xl">{value}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</div>
                <div className="mt-1 text-[10px] leading-relaxed text-zinc-600">{sub}</div>
              </div>
            ))}
          </div>

          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-zinc-500 sm:text-sm">
            Homepage counts come from the same published profile dataset the search and directory surfaces now render directly.
          </p>
        </div>

        <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600" />
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <section aria-label="Featured editorial entry points">
          <FeaturedEditorialRail />
        </section>

        <section aria-label="First-run guidance">
          <HomeSectionIntro
            eyebrow="START HERE"
            title="Choose the fastest first click"
            description="The quickest routes into search, the latest basho, the profile directory, and the rankings."
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

        <section className="mt-10" aria-label="Latest basho guidance">
          <HomeSectionIntro
            eyebrow="CURRENT TOURNAMENT"
            title="Open the latest basho first"
            description="Start with the overview, then drop into any division."
          />
          <BashoQuickNav />
        </section>

        <section id="trust" className="mt-10" aria-label="Trust and coverage">
          <HomeSectionIntro
            eyebrow="TRUST & COVERAGE"
            title="Understand what is published"
            description="Short, honest context for the profile layer and its coverage."
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <DatasetInfoPanel />
            <TrustMethodologyCard />
          </div>
        </section>

        <section className="mt-10" aria-label="Continue or discover">
          <HomeSectionIntro
            eyebrow="KEEP GOING"
            title="Resume or discover"
            description="Recent pages, saved items, and one wildcard entry point."
          />
          <section className="space-y-4">
            <ContinueExploringRow />
            <WatchlistPanel />
          </section>

          <section className="mt-4">
            <DiscoveryCard />
          </section>
        </section>

        <section className="mt-10">
          <HomeSectionIntro
            eyebrow="CURATED PATHS"
            title="Browse the product with a point of view"
            description="Records, analytics, rivalries, and stable context."
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
      </div>
    </div>
  );
}

function WrestlerRedirect() {
  const { rid } = useParams();
  const target = `/rikishi/${encodeURIComponent(String(rid || '').trim())}`;
  return <Navigate to={target} replace />;
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
          <Route path="/wrestler/:rid" element={<WrestlerRedirect />} />
          <Route path="/admin/import" element={<Suspense fallback={<BashoStandingsSkeleton />}><AdminImport /></Suspense>} />
          <Route path="/admin/data-confidence" element={<Suspense fallback={<BashoStandingsSkeleton />}><AdminDataConfidencePage /></Suspense>} />
          <Route path="*" element={<Suspense fallback={<BashoStandingsSkeleton />}><NotFoundPage /></Suspense>} />
        </Routes>
      </Layout>
    </Router>
  );
}
