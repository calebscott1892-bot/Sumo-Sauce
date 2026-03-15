import { useMemo } from 'react';
import { Database, Calendar, Users, Image as ImageIcon } from 'lucide-react';
import { getVerifiedDatasetMetrics } from '@/data/verifiedProfiles';

/**
 * Shows dataset coverage information on the homepage.
 * Purely derived from the repo-local verified profile dataset.
 */
export default function DatasetInfoPanel() {
  const metrics = useMemo(() => getVerifiedDatasetMetrics(), []);

  const divisionCount = metrics.divisionsCovered.filter((division) => division !== 'Historical').length;
  const latestBashoText = metrics.latestVerifiedBashoLabel
    ? `Latest verified basho currently reaches ${metrics.latestVerifiedBashoLabel}.`
    : 'Latest verified basho is shown where available instead of being faked sitewide.';

  const items = [
    { icon: Users, label: 'Profiles', value: metrics.totalProfiles.toLocaleString(), sub: 'in the current verified layer' },
    { icon: Database, label: 'Source-linked', value: metrics.profilesWithSourceRefsCount.toLocaleString(), sub: 'publish at least one source ref' },
    { icon: Calendar, label: 'Confirmed provenance', value: metrics.confirmedProvenanceCount.toLocaleString(), sub: 'division context confirmed' },
    { icon: ImageIcon, label: 'Official images', value: metrics.verifiedImageCount.toLocaleString(), sub: 'shown only when verified' },
  ];

  return (
    <section data-testid="dataset-info-panel" className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.035] to-white/[0.015] p-5 sm:p-6">
      <div className="mb-5 max-w-3xl">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
          VERIFIED PROFILE COVERAGE
        </div>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">
          What the published profile layer can show clearly
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          These figures come from the current verified profile dataset. They describe published coverage, not a promise that every surface has identical depth.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <item.icon className="h-3.5 w-3.5" />
              <span className="text-xs">{item.label}</span>
            </div>
            <div className="mt-1 font-semibold text-zinc-100">{item.value}</div>
            <div className="text-xs text-zinc-500">{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 border-t border-white/[0.06] pt-5 text-sm text-zinc-400 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Coverage shape</div>
          <div className="mt-1 text-zinc-200">{divisionCount} active divisions plus historical records are represented in the published profile layer.</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Freshness model</div>
          <div className="mt-1 text-zinc-200">{latestBashoText}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Source model</div>
          <div className="mt-1 text-zinc-200">JSA profiles, SumoDB, and corroborating references may all contribute to a published trust cue.</div>
        </div>
      </div>
    </section>
  );
}
