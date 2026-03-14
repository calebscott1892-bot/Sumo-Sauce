import { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import Layout from './Layout.jsx';
import BashoQuickNav from '@/components/navigation/BashoQuickNav';
import RikishiSearch from '@/components/navigation/RikishiSearch';
import DatasetInfoPanel from '@/components/system/DatasetInfoPanel';
import DiscoveryCard from '@/components/system/DiscoveryCard';
import { getVerifiedDatasetMetrics } from '@/data/verifiedProfiles';
import { getFavoriteRikishi, getFavoriteBasho } from '@/utils/favorites';
import { getAllRecent } from '@/utils/recentlyViewed';
import { bashoDisplayName, latestBashoId } from '@/utils/basho';
import RikishiProfileSkeleton from '@/components/ui/skeletons/RikishiProfileSkeleton';
import CompareSkeleton from '@/components/ui/skeletons/CompareSkeleton';
import BashoStandingsSkeleton from '@/components/ui/skeletons/BashoStandingsSkeleton';
import { BrowserRouter as Router, Navigate, Route, Routes, useParams, Link } from 'react-router-dom';
import { Calendar, Swords, Trophy, Search, ShieldCheck, Image as ImageIcon, Database, Layers3, ArrowRight } from 'lucide-react';

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
const Leaderboard = lazy(() => import('./Leaderboard.jsx'));
const NotFoundPage = lazy(() => import('./NotFoundPage'));
const AdminImport = lazy(() => import('./AdminImport.jsx'));

function FavoritesPanel() {
  const [favRikishi, setFavRikishi] = useState(() => getFavoriteRikishi());
  const [favBasho, setFavBasho] = useState(() => getFavoriteBasho());

  useEffect(() => {
    const handler = () => {
      setFavRikishi(getFavoriteRikishi());
      setFavBasho(getFavoriteBasho());
    };
    window.addEventListener('sumosauce:favorites-changed', handler);
    return () => window.removeEventListener('sumosauce:favorites-changed', handler);
  }, []);

  if (!favRikishi.length && !favBasho.length) return null;

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5" aria-label="Favorites">
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
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5" aria-label="Continue Exploring">
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

function HomeSectionIntro({ eyebrow, title, description }) {
  return (
    <div className="mb-4 max-w-3xl">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-400">{eyebrow}</div>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{description}</p>
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
        <h2 className="font-display text-lg font-bold tracking-tight text-white">How to read the trust layer</h2>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
        Trust is shown profile by profile, not assumed sitewide. When SumoWatch has structured verification context, it publishes the cue directly on the rikishi page instead of hiding the uncertainty.
      </p>

      <div className="mt-4 grid gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <ShieldCheck className="h-4 w-4 text-red-400" />
            Per-profile trust cues
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Verified rikishi pages surface profile confidence, image policy, provenance status, latest verified basho context, and source references when they are available.
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <Database className="h-4 w-4 text-red-400" />
            Source model
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            JSA profiles, SumoDB, and other corroborating references may all contribute to a profile&apos;s published trust metadata.
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <ImageIcon className="h-4 w-4 text-red-400" />
            Freshness and image policy
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            There is no fake sitewide freshness badge here. Latest verified basho is shown where published, currently reaching {latestVerified}, and official images only appear after image verification is complete.
          </p>
        </div>
      </div>
    </section>
  );
}

function HomePage() {
  const metrics = useMemo(() => getVerifiedDatasetMetrics(), []);
  const latestTournamentId = latestBashoId();
  const latestTournamentPath = latestTournamentId ? `/basho/${encodeURIComponent(latestTournamentId)}` : '/basho';
  const latestTournamentLabel = latestTournamentId ? bashoDisplayName(latestTournamentId) : 'Latest basho';
  const heroStats = [
    { value: metrics.totalProfiles.toLocaleString(), label: 'Profiles', sub: 'in the current trust layer' },
    { value: metrics.profilesWithSourceRefsCount.toLocaleString(), label: 'Source-linked', sub: 'publish at least one source ref' },
    { value: metrics.verifiedImageCount.toLocaleString(), label: 'Official Images', sub: 'shown only when verified' },
    {
      value: metrics.latestVerifiedBashoLabel ?? 'Varies',
      label: 'Verified Context',
      sub: 'latest basho shown where available',
    },
  ];
  const startHereCards = [
    {
      icon: Search,
      title: 'Search a wrestler',
      description: 'Best first step if you already know a shikona, rikishi id, or stable and want the fastest route into a result page or profile.',
      to: '/search',
      cta: 'Search rikishi',
      tone: 'red',
    },
    {
      icon: Calendar,
      title: `Open ${latestTournamentLabel}`,
      description: 'Best first step if you want current standings, leaders, and tournament context without learning the route structure first.',
      to: latestTournamentPath,
      cta: 'Latest basho',
      tone: 'blue',
    },
    {
      icon: Layers3,
      title: 'Browse divisions',
      description: 'Move between Makuuchi, Juryo, Makushita, Sandanme, Jonidan, and Jonokuchi from the tournament browsing system.',
      to: '/basho',
      cta: 'Division hub',
      tone: 'zinc',
    },
    {
      icon: Trophy,
      title: 'Check the rankings',
      description: 'Use the leaderboard when you want a standings-led view across divisions, with trust-aware wrestler context layered on top.',
      to: '/leaderboard',
      cta: 'Leaderboard',
      tone: 'emerald',
    },
    {
      icon: Swords,
      title: 'Explore rivalries',
      description: 'Jump into head-to-head views when the question is not “who is this wrestler?” but “who does he match up against?”',
      to: '/rivalries',
      cta: 'Head-to-head',
      tone: 'zinc',
    },
    {
      icon: ShieldCheck,
      title: 'Browse verified profiles',
      description: 'Use the rikishi directory when you want trust-aware profiles with published source refs, image policy, and provenance cues.',
      to: '/rikishi',
      cta: 'Verified profiles',
      tone: 'zinc',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/10 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
              <img
                src="/logo.png"
                alt="SumoWatch logo"
                className="h-20 w-20 shrink-0 drop-shadow-2xl sm:h-32 sm:w-32 lg:h-36 lg:w-36"
              />
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-500 sm:text-xs sm:tracking-[0.25em]">
                  Trust-aware Sumo Database
                </span>
                <div className="mt-2 font-display text-4xl font-bold uppercase tracking-tight text-white sm:text-6xl lg:text-7xl">
                  SumoWatch
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 max-w-4xl">
            <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find the rikishi, basho, or division you care about faster.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-300">
              SumoWatch is a public-facing sumo database and analytics product. Use it to search wrestler profiles, open the latest tournament, browse divisions, compare rivalries, and inspect trust metadata where it is published.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">
              New here? Start with a wrestler search if you know a shikona. Otherwise open the latest basho for current context, then move into divisions, rankings, or rivalries from there.
            </p>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="max-w-xl">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Start with a wrestler search
              </div>
              <RikishiSearch />
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Search by shikona, rikishi id, or stable. If you want a broader first look, open the latest basho instead.
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
                to="/rivalries"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-red-600/40 hover:bg-white/[0.06] hover:text-white"
              >
                <Swords className="h-4 w-4" />
                Rivalries
              </Link>
            </div>
          </div>

          <p className="mt-8 max-w-3xl text-xs leading-relaxed text-zinc-500 sm:text-sm">
            Homepage trust cues below are derived from the current verified profile dataset. Verification depth varies by profile, latest verified basho is shown where available, and official imagery is only displayed after image verification.
          </p>

          {/* Stats bar */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {heroStats.map(({ value, label, sub }) => (
              <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-left sm:px-4 sm:text-center">
                <div className="font-display text-xl font-bold text-white sm:text-2xl">{value}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{label}</div>
                <div className="mt-1 text-[10px] leading-relaxed text-zinc-600">{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600" />
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <section aria-label="First-run guidance">
          <HomeSectionIntro
            eyebrow="START HERE"
            title="Choose the path that matches your first question"
            description="Most first-time visitors want one of six things: a wrestler search, the latest basho, a division browse flow, rankings, rivalries, or trust-aware profiles. Start with the one that matches your intent."
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
            title="Open the latest basho without learning the route structure first"
            description="If you want immediate current context, the latest basho is the fastest entry point. Start with the overview, then jump directly into any division."
          />
          <BashoQuickNav />
        </section>

        <section id="trust" className="mt-10" aria-label="Trust and coverage">
          <HomeSectionIntro
            eyebrow="TRUST & COVERAGE"
            title="Understand what is verified, what is published, and what is still variable"
            description="These homepage trust panels describe the structured verified profile layer inside SumoWatch. They do not pretend the entire product has uniform coverage or a single freshness timestamp."
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <DatasetInfoPanel />
            <TrustMethodologyCard />
          </div>
        </section>

        <section className="mt-10" aria-label="Continue or discover">
          <HomeSectionIntro
            eyebrow="KEEP GOING"
            title="Pick up where you left off or discover something unexpected"
            description="Returning visitors can jump back into recent pages and saved favourites. New visitors can use random discovery once they understand the main entry points above."
          />
          <section className="space-y-4">
            <ContinueExploringRow />
            <FavoritesPanel />
          </section>

          <section className="mt-4">
            <DiscoveryCard />
          </section>
        </section>

        <section className="mt-10">
          <HomeSectionIntro
            eyebrow="HOME VALUE"
            title="Why people keep using SumoWatch"
            description="It combines quick wrestler discovery, tournament browsing, rivalry context, rankings, and honest trust metadata in one public-facing sumo product."
          />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="text-sm font-semibold text-white">Search first, browse deeper</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Start from a rikishi or the latest basho, then move naturally into rankings, rivalries, and division context without changing mental models.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="text-sm font-semibold text-white">Trust cues stay visible</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Verified profile coverage, image policy, provenance status, and source references are presented as part of the product, not buried in internal notes.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="text-sm font-semibold text-white">No fake completeness claims</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Coverage and freshness are described honestly. The product tells you what the current verified layer covers instead of pretending every page is equally final.
              </p>
            </div>
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
          <Route path="/compare/basho/:a/:b" element={<Suspense fallback={<BashoStandingsSkeleton />}><BashoComparePage /></Suspense>} />
          <Route path="/analytics" element={<Suspense fallback={<BashoStandingsSkeleton />}><GlobalStatsPage /></Suspense>} />
          <Route path="/analytics/kimarite" element={<Suspense fallback={<BashoStandingsSkeleton />}><KimariteAnalyticsPage /></Suspense>} />
          <Route path="/analytics/eras" element={<Suspense fallback={<BashoStandingsSkeleton />}><EraAnalyticsPage /></Suspense>} />
          <Route path="/rivalries" element={<Suspense fallback={<BashoStandingsSkeleton />}><RivalryExplorerPage /></Suspense>} />
          <Route path="/search" element={<Suspense fallback={<BashoStandingsSkeleton />}><SearchPage /></Suspense>} />
          <Route path="/timeline" element={<Suspense fallback={<BashoStandingsSkeleton />}><BashoTimelinePage /></Suspense>} />
          <Route path="/wrestler/:rid" element={<WrestlerRedirect />} />
          <Route path="/admin/import" element={<Suspense fallback={<BashoStandingsSkeleton />}><AdminImport /></Suspense>} />
          <Route path="*" element={<Suspense fallback={<BashoStandingsSkeleton />}><NotFoundPage /></Suspense>} />
        </Routes>
      </Layout>
    </Router>
  );
}
