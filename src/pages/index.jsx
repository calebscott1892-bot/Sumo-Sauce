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
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5" aria-label="Favorites">
      <h2 className="text-lg font-semibold text-white">⭐ Favorites</h2>
      <p className="mt-1 text-xs text-zinc-500">Your saved rikishi and basho.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {favRikishi.map((id) => (
          <Link
            key={id}
            to={`/rikishi/${encodeURIComponent(id)}`}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:border-red-600 hover:text-white"
          >
            {id}
          </Link>
        ))}
        {favBasho.map((id) => (
          <Link
            key={id}
            to={`/basho/${encodeURIComponent(id)}`}
            className="rounded-lg border border-blue-800 bg-blue-950/30 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:border-blue-500 hover:text-white"
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
    rikishi: 'border-red-800 bg-red-950/20 hover:border-red-600',
    basho: 'border-blue-800 bg-blue-950/20 hover:border-blue-500',
    rivalry: 'border-purple-800 bg-purple-950/20 hover:border-purple-500',
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
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5" aria-label="Continue Exploring">
      <h2 className="text-lg font-semibold text-white">🕒 Continue Exploring</h2>
      <p className="mt-1 text-xs text-zinc-500">Recently viewed rikishi, basho, and rivalries.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {recent.map((item) => (
          <Link
            key={`${item.type}-${item.id}`}
            to={typePaths[item.type](item.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:text-white ${typeColors[item.type]}`}
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
  { title: 'Browse Basho', description: 'Explore tournaments, standings, and results across all divisions.', icon: Calendar, path: '/basho', color: 'border-blue-700 hover:border-blue-500' },
  { title: 'Search Rikishi', description: 'Find any wrestler — view profiles, rank charts, and career analytics.', icon: Users, path: '/rikishi', color: 'border-red-700 hover:border-red-500' },
  { title: 'Explore Rivalries', description: 'Head-to-head matchups, rivalry history, and kimarite breakdowns.', icon: Swords, path: '/rivalries', color: 'border-purple-700 hover:border-purple-500' },
  { title: 'Analytics', description: 'Global stats, kimarite distribution, era trends, and division strength.', icon: BarChart3, path: '/analytics', color: 'border-amber-700 hover:border-amber-500' },
  { title: 'Leaderboard', description: 'Top rikishi by win rate, career records, and recent performance.', icon: Trophy, path: '/leaderboard', color: 'border-emerald-700 hover:border-emerald-500' },
  { title: 'Timeline', description: 'Visual timeline of basho history across all eras of sumo.', icon: Clock, path: '/timeline', color: 'border-cyan-700 hover:border-cyan-500' },
];

function HomePage() {
  return (
    <div className="mx-auto max-w-6xl p-4 text-zinc-200 sm:p-6">
      {/* Premium hero */}
      <section className="mb-6 rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-6 sm:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">SumoWatch</h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400 sm:text-base">
              The premium analytics platform for professional sumo — 2,800+ rikishi, 145 basho, 97,000+ banzuke entries, and 18,000+ bouts at your fingertips.
            </p>
          </div>
          <Link
            to="/search"
            className="hidden items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-red-600 hover:text-white sm:flex"
          >
            <Search className="h-4 w-4" />
            Search
            <kbd className="ml-1 rounded border border-zinc-600 bg-zinc-700 px-1 py-0.5 text-[10px] text-zinc-400">⌘K</kbd>
          </Link>
        </div>
        <div className="mt-6 max-w-md">
          <RikishiSearch />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link to="/search" className="rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1 text-zinc-400 transition-colors hover:border-red-600 hover:text-zinc-200 sm:hidden">
            <Search className="mr-1 inline h-3 w-3" />
            Full Search
          </Link>
          <Link to="/rivalries" className="rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1 text-zinc-400 transition-colors hover:border-red-600 hover:text-zinc-200">
            Rivalries
          </Link>
          <Link to="/timeline" className="rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1 text-zinc-400 transition-colors hover:border-red-600 hover:text-zinc-200">
            Timeline
          </Link>
          <Link to="/analytics/eras" className="rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1 text-zinc-400 transition-colors hover:border-red-600 hover:text-zinc-200">
            Era Analytics
          </Link>
          <Link to="/analytics/kimarite" className="rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1 text-zinc-400 transition-colors hover:border-red-600 hover:text-zinc-200">
            Kimarite
          </Link>
        </div>
      </section>

      {/* Featured sections grid */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Explore sections">
        {FEATURE_CARDS.map((card) => (
          <Link
            key={card.path}
            to={card.path}
            className={`group rounded-xl border bg-zinc-900 p-5 transition-all duration-200 hover:bg-zinc-800/80 ${card.color}`}
          >
            <div className="flex items-center gap-3">
              <card.icon className="h-5 w-5 text-zinc-400 transition-colors group-hover:text-white" />
              <h2 className="text-lg font-semibold text-white">{card.title}</h2>
            </div>
            <p className="mt-2 text-sm text-zinc-400">{card.description}</p>
          </Link>
        ))}
      </section>

      {/* Continue Exploring (recently viewed) */}
      <section className="mt-4">
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