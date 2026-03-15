import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Database,
  ImageOff,
  Link2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { PremiumBadge } from '@/components/ui/premium';
import {
  getImageConfidencePresentation,
  getProfileConfidencePresentation,
  getProvenanceStatusPresentation,
} from '@/data/verifiedProfiles';
import { getProfileConfidenceReview, type ReviewQueue, type ReviewSeverity } from '@/utils/profileConfidenceReview';

function severityVariant(severity: ReviewSeverity): 'red' | 'amber' | 'green' {
  if (severity === 'high') return 'red';
  if (severity === 'medium') return 'amber';
  return 'green';
}

function StatCard({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: typeof ShieldCheck;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
        <Icon className="h-4 w-4 text-red-400" />
        {title}
      </div>
      <div className="mt-3 font-display text-3xl font-bold text-white">{value}</div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{detail}</p>
    </div>
  );
}

function QueueCard({
  queue,
  selected,
  onSelect,
}: {
  queue: ReviewQueue;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        selected
          ? 'border-red-600/45 bg-red-950/16'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PremiumBadge variant={severityVariant(queue.severity)}>{queue.actionLabel}</PremiumBadge>
        <div className="font-display text-2xl font-bold text-white">{queue.count}</div>
      </div>
      <h3 className="mt-3 text-base font-semibold text-white">{queue.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{queue.description}</p>
    </button>
  );
}

export default function AdminDataConfidencePage() {
  const report = useMemo(() => getProfileConfidenceReview(), []);
  const [selectedQueueKey, setSelectedQueueKey] = useState(report.queues[0]?.key ?? '');
  const [search, setSearch] = useState('');

  const selectedQueue = report.queues.find((queue) => queue.key === selectedQueueKey) ?? report.queues[0];
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!selectedQueue) return [];
    if (!query) return selectedQueue.items;

    return selectedQueue.items.filter((item) => {
      const haystack = [
        item.shikona,
        item.rikishiId,
        item.heya,
        item.division,
        item.batchRef,
        item.reason,
        item.nextStep,
        item.missingFields.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [search, selectedQueue]);

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <PremiumBadge variant="red">Internal review</PremiumBadge>
            <PremiumBadge variant="zinc">Read-only surface</PremiumBadge>
            <PremiumBadge variant="blue">Canonical data untouched</PremiumBadge>
          </div>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Data confidence review
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                This internal surface turns the verified profile dataset into maintenance queues: trust state, provenance gaps,
                missing image coverage, thin source refs, and metadata hotspots that future expansion work should inspect first.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/admin/import"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-red-600/40 hover:text-white"
              >
                <Wrench className="h-4 w-4" />
                Admin import
              </Link>
              <Link
                to="/leaderboard"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-red-600/40 hover:text-white"
              >
                <ArrowRight className="h-4 w-4" />
                Back to app
              </Link>
            </div>
          </div>
        </div>

        <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={ShieldCheck}
            title="Trust state"
            value={`${report.totals.verifiedProfiles} verified / ${report.totals.unverifiedProfiles} unverified`}
            detail={`${report.totals.likelyProfiles} more sit in the partial-verification middle.`}
          />
          <StatCard
            icon={AlertTriangle}
            title="Provenance gaps"
            value={`${report.totals.batchRefGaps} batch gaps`}
            detail={`${report.totals.inferredProvenance} inferred profiles and ${report.totals.lastVerifiedGaps} profiles without lastVerifiedBasho.`}
          />
          <StatCard
            icon={ImageOff}
            title="Image coverage"
            value={`${report.totals.verifiedImages} verified`}
            detail={`${report.totals.missingImages} missing and ${report.totals.withheldImages} still withheld for safety.`}
          />
          <StatCard
            icon={Link2}
            title="Source coverage"
            value={`${report.totals.thinSourceRefs} thin refs`}
            detail={`${report.totals.emptySourceRefs} profiles publish zero source refs today.`}
          />
          <StatCard
            icon={Database}
            title="Metadata hotspots"
            value={`${report.totals.metadataHotspots}`}
            detail="Profiles missing three or more core metadata fields at once."
          />
          <StatCard
            icon={ShieldAlert}
            title="Scope"
            value={report.totals.totalProfiles.toLocaleString()}
            detail="Canonical profiles inspected from the repo-local verified dataset."
          />
        </section>

        <section className="mt-8">
          <div className="mb-4 max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-400">Priority hotspots</div>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">What to clean up next</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              These are the broadest maintenance queues surfaced from the current dataset. They are intended to help future research
              and backfill work pick a starting point fast.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {report.spotlight.map((spotlight) => (
              <div key={spotlight.key} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <PremiumBadge variant={severityVariant(spotlight.severity)}>{spotlight.title}</PremiumBadge>
                  <div className="font-display text-2xl font-bold text-white">{spotlight.count}</div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{spotlight.detail}</p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">{spotlight.nextStep}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div>
            <div className="mb-4 max-w-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-400">Review queues</div>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Pick a maintenance slice</h2>
            </div>
            <div className="space-y-3">
              {report.queues.map((queue) => (
                <QueueCard
                  key={queue.key}
                  queue={queue}
                  selected={selectedQueue?.key === queue.key}
                  onSelect={() => setSelectedQueueKey(queue.key)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
            {selectedQueue ? (
              <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <PremiumBadge variant={severityVariant(selectedQueue.severity)}>{selectedQueue.actionLabel}</PremiumBadge>
                      <PremiumBadge variant="zinc">{selectedQueue.count} profiles</PremiumBadge>
                    </div>
                    <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-white">{selectedQueue.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">{selectedQueue.description}</p>
                  </div>

                  <label className="block w-full max-w-sm">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Search this queue</div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search shikona, heya, batchRef, or missing field"
                        className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-black/30 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-red-600/45"
                      />
                    </div>
                  </label>
                </div>

                <div className="mt-5 space-y-3">
                  {filteredItems.length ? (
                    filteredItems.map((item) => {
                      const profileTone = getProfileConfidencePresentation(item.profileConfidence);
                      const imageTone = getImageConfidencePresentation(item.imageConfidence);
                      const provenanceTone = getProvenanceStatusPresentation(item.provenanceStatus);

                      return (
                        <article key={`${selectedQueue.key}-${item.index}`} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-display text-xl font-bold text-white">{item.shikona}</div>
                                {item.rikishiId ? <PremiumBadge variant="zinc">RID {item.rikishiId}</PremiumBadge> : null}
                                {item.division ? <PremiumBadge variant="zinc">{item.division}</PremiumBadge> : null}
                                {item.heya ? <PremiumBadge variant="zinc">{item.heya}</PremiumBadge> : null}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <PremiumBadge variant={profileTone.variant}>{profileTone.label}</PremiumBadge>
                                <PremiumBadge variant={imageTone.variant}>{imageTone.label}</PremiumBadge>
                                <PremiumBadge variant={provenanceTone.variant}>{provenanceTone.label}</PremiumBadge>
                              </div>

                              <p className="mt-3 text-sm leading-relaxed text-zinc-300">{item.reason}</p>
                              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.nextStep}</p>

                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                                <span>Source refs: {item.sourceRefCount}</span>
                                <span>Last verified: {item.lastVerifiedBashoLabel}</span>
                                <span>Batch ref: {item.batchRef || 'missing'}</span>
                                <span>Missing fields: {item.missingFields.length ? item.missingFields.join(', ') : 'none'}</span>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              {item.profilePath ? (
                                <Link
                                  to={item.profilePath}
                                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-zinc-300 transition-all hover:border-red-600/40 hover:text-white"
                                >
                                  Open profile
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                              ) : (
                                <div className="inline-flex min-h-10 items-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-zinc-500">
                                  No profile route
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/[0.12] bg-black/20 p-6 text-sm text-zinc-400">
                      No profiles match this queue filter.
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
