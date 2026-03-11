import { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import Layout from './Layout.jsx';
import Leaderboard from './Leaderboard.jsx';
import NotFoundPage from './NotFoundPage';
import AdminImport from './AdminImport.jsx';
import BashoQuickNav from '@/components/navigation/BashoQuickNav';
import RikishiSearch from '@/components/navigation/RikishiSearch';
import DatasetInfoPanel from '@/components/system/DatasetInfoPanel';
import DiscoveryCard from '@/components/system/DiscoveryCard';
import { isValidBashoId } from '@/utils/security';
import { getFavoriteRikishi, getFavoriteBasho } from '@/utils/favorites';
import { getAllRecent } from '@/utils/recentlyViewed';
import { bashoDisplayName } from '@/utils/basho';
import RikishiProfileSkeleton from '@/components/ui/skeletons/RikishiProfileSkeleton';
import CompareSkeleton from '@/components/ui/skeletons/CompareSkeleton';
import BashoStandingsSkeleton from '@/components/ui/skeletons/BashoStandingsSkeleton';
import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate, useParams, Link } from 'react-router-dom';
import { Calendar, Users, Swords, BarChart3, Trophy, Clock, Search, TrendingUp } from 'lucide-react';

const RikishiPage = lazy(() => import('./RikishiPage'));
const ComparePage = lazy(() => import('./ComparePage'));
const BashoDivisionPage = lazy(() => import('./BashoDivisionPage'));
const BashoOverviewPage = lazy(() => import('./BashoOverviewPage'));
const GlobalStatsPage = lazy(() => import('./GlobalStatsPage'));
const KimariteAnalyticsPage = lazy(() => import('./KimariteAnalyticsPage'));
const BashoBrowserPage = lazy(() => import('./BashoBrowserPage'));
const RikishiDirectoryPage = lazy(() => import('./RikishiDirectoryPage'));
const BashoComparePage = lazy(() => import('./BashoComparePage'));
const RivalryExplorerPage = lazy(() => import('./RivalryExplorerPage'));
const EraAnalyticsPage = lazy(() => import('./EraAnalyticsPage'));
const BashoTimelinePage = lazy(() => import('./BashoTimelinePage'));
const SearchPage = lazy(() => import('./SearchPage'));
const BashoDayResultsPage = lazy(() => import('./BashoDayResultsPage'));

const DIVISIONS = ['makuuchi', 'juryo', 'makushita', 'sandanme', 'jonidan', 'jonokuchi'];
const BASHO_RE = /^\d{6}$/;

function FavoritesPanel() {
  const [favRikishi, setFavRikishi] = useState(() => getFavoriteRikishi());
  const [favBasho, setFavBasho] = useState(() => getFavoriteBasho());

  useEffect(() => {
    const handler = () => {
      setFavRikishi(getFavoriteRikishi());
      setFavBasho(getFavoriteBasho());
    };
    window.addEventListener('sumowatch:favorites-changed', handler);
    return () => window.removeEventListener('sumowatch:favorites-changed', handler);
  }, []);

  if (!favRikishi.length && !favBasho.length) return null;

  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5" aria-label="Favorites">
      <h2 className="font-display text-lg font-semibold text-white">⭐ Favorites</h2>
      <p className="mt-1 text-xs text-zinc-500">Your saved rikishi and basho.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {favRikishi.map((id) => (
          <Link
            key={id}
            to={`/rikishi/${encodeURIComponent(id)}`}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-200 transition-all hover:border-red-600/40 hover:text-white"
          >
            {id}
          </Link>
        ))}
        {favBasho.map((id) => (
          <Link
            key={id}
            to={`/basho/${encodeURIComponent(id)}`}
            className="rounded-lg border border-blue-800/30 bg-blue-950/20 px-3 py-1.5 text-sm text-zinc-200 transition-all hover:border-blue-500/40 hover:text-white"
          >
            {bashoDisplayName(id)}
          </Link>
        ))}
      </div>
    </section>
  );
}

function ContinueExploringRow() {
  const [recent, setRecent] = useState(() => getAllRecent(8));

  useEffect(() => {
    const handler = () => setRecent(getAllRecent(8));
    window.addEventListener('sumowatch:recently-viewed', handler);
    return () => window.removeEventListener('sumowatch:recently-viewed', handler);
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
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5" aria-label="Continue Exploring">
      <h2 className="font-display text-lg font-semibold text-white">🕒 Continue Exploring</h2>
      <p className="mt-1 text-xs text-zinc-500">Recently viewed rikishi, basho, and rivalries.</p>
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

const FEATURE_CARDS = [
  { title: 'Browse Basho', description: 'Explore tournaments, standings, and results across all divisions.', icon: Calendar, path: '/basho', accent: 'from-blue-600 to-blue-400', ring: 'hover:ring-blue-500/30' },
  { title: 'Search Rikishi', description: 'Find any wrestler — view profiles, rank charts, and career analytics.', icon: Users, path: '/rikishi', accent: 'from-red-600 to-red-400', ring: 'hover:ring-red-500/30' },
  { title: 'Explore Rivalries', description: 'Head-to-head matchups, rivalry history, and kimarite breakdowns.', icon: Swords, path: '/rivalries', accent: 'from-purple-600 to-purple-400', ring: 'hover:ring-purple-500/30' },
  { title: 'Analytics', description: 'Global stats, kimarite distribution, era trends, and division strength.', icon: TrendingUp, path: '/analytics', accent: 'from-amber-600 to-amber-400', ring: 'hover:ring-amber-500/30' },
  { title: 'Leaderboard', description: 'Live banzuke rankings, win rates, and overall performance ratings.', icon: Trophy, path: '/leaderboard', accent: 'from-emerald-600 to-emerald-400', ring: 'hover:ring-emerald-500/30' },
  { title: 'Timeline', description: 'Visual timeline of basho history across all eras of sumo.', icon: Clock, path: '/timeline', accent: 'from-cyan-600 to-cyan-400', ring: 'hover:ring-cyan-500/30' },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/10 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-5">
              <img
                src="/logo.png"
                alt="Sumo Sauce logo"
                className="h-24 w-24 shrink-0 drop-shadow-2xl sm:h-32 sm:w-32 lg:h-36 lg:w-36"
              />
              <div>
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-red-500">
                Premium Analytics Platform
              </span>
              <h1 className="mt-2 font-display text-5xl font-bold uppercase tracking-tight text-white sm:text-6xl lg:text-7xl">
                Sumo Sauce
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400 sm:text-base">
                The definitive analytics platform for professional sumo — 2,800+ rikishi, 145 basho, 97,000+ banzuke entries, and 18,000+ bouts at your fingertips.
              </p>
              </div>
            </div>
            <Link
              to="/search"
              className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm text-zinc-300 transition-all hover:border-red-600/40 hover:bg-white/[0.06] hover:text-white sm:flex"
            >
              <Search className="h-4 w-4" />
              Search
              <kbd className="ml-2 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">⌘K</kbd>
            </Link>
          </div>

          {/* Search bar */}
          <div className="mt-6 max-w-lg">
            <RikishiSearch />
          </div>

          {/* Quick links */}
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { label: 'Rivalries', path: '/rivalries' },
              { label: 'Timeline', path: '/timeline' },
              { label: 'Era Analytics', path: '/analytics/eras' },
              { label: 'Kimarite', path: '/analytics/kimarite' },
              { label: 'Banzuke', path: '/leaderboard' },
            ].map(({ label, path }) => (
              <Link
                key={path}
                to={path}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:border-red-600/40 hover:text-zinc-200"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Stats bar */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: '2,800+', label: 'Rikishi' },
              { value: '145', label: 'Basho' },
              { value: '97K+', label: 'Banzuke Entries' },
              { value: '18K+', label: 'Bout Records' },
            ].map(({ value, label }) => (
              <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center">
                <div className="font-display text-2xl font-bold text-white">{value}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600" />
      </section>

      {/* Feature cards */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Explore sections">
          {FEATURE_CARDS.map((card) => (
            <Link
              key={card.path}
              to={card.path}
              className={`group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-xl hover:shadow-black/20 ${card.ring}`}
            >
              {/* Gradient accent line at top */}
              <div className={`absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r ${card.accent} opacity-0 transition-opacity group-hover:opacity-100`} />

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.04]">
                  <card.icon className="h-5 w-5 text-zinc-400 transition-colors group-hover:text-white" />
                </div>
                <h2 className="font-display text-lg font-semibold text-white">{card.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500 group-hover:text-zinc-400">{card.description}</p>
            </Link>
          ))}
        </section>

        {/* Continue Exploring (recently viewed) */}
        <section className="mt-6">
          <ContinueExploringRow />
        </section>

        {/* Favorites */}
        <section className="mt-4">
          <FavoritesPanel />
        </section>

        {/* Discovery */}
        <section className="mt-4">
          <DiscoveryCard />
        </section>

        {/* Quick basho nav */}
        <section className="mt-4">
          <BashoQuickNav />
        </section>

        {/* Dataset info */}
        <section className="mt-4">
          <DatasetInfoPanel />
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
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/rikishi/:id" element={<Suspense fallback={<RikishiProfileSkeleton />}><RikishiPage /></Suspense>} />
          <Route path="/compare/:a/:b" element={<Suspense fallback={<CompareSkeleton />}><ComparePage /></Suspense>} />
          <Route path="/basho/:bashoId/:division" element={<Suspense fallback={<BashoStandingsSkeleton />}><BashoDivisionPage /></Suspense>} />
          <Route path="/basho/:bashoId/:division/day/:day" element={<Suspense fallback={<BashoStandingsSkeleton />}><BashoDayResultsPage /></Suspense>} />
          <Route path="/basho/:bashoId" element={<Suspense fallback={<BashoStandingsSkeleton />}><BashoOverviewPage /></Suspense>} />
          <Route path="/basho" element={<Suspense fallback={<BashoStandingsSkeleton />}><BashoBrowserPage /></Suspense>} />
          <Route path="/rikishi" element={<Suspense fallback={<BashoStandingsSkeleton />}><RikishiDirectoryPage /></Suspense>} />
          <Route path="/compare/basho/:a/:b" element={<Suspense fallback={<BashoStandingsSkeleton />}><BashoComparePage /></Suspense>} />
          <Route path="/analytics" element={<Suspense fallback={<BashoStandingsSkeleton />}><GlobalStatsPage /></Suspense>} />
          <Route path="/analytics/kimarite" element={<Suspense fallback={<BashoStandingsSkeleton />}><KimariteAnalyticsPage /></Suspense>} />
          <Route path="/analytics/eras" element={<Suspense fallback={<BashoStandingsSkeleton />}><EraAnalyticsPage /></Suspense>} />
          <Route path="/rivalries" element={<Suspense fallback={<BashoStandingsSkeleton />}><RivalryExplorerPage /></Suspense>} />
          <Route path="/search" element={<Suspense fallback={<BashoStandingsSkeleton />}><SearchPage /></Suspense>} />
          <Route path="/timeline" element={<Suspense fallback={<BashoStandingsSkeleton />}><BashoTimelinePage /></Suspense>} />
          <Route path="/wrestler/:rid" element={<WrestlerRedirect />} />
          <Route path="/admin/import" element={<AdminImport />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}