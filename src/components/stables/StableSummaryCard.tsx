import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Users } from 'lucide-react';
import { formatVerifiedBasho } from '@/data/verifiedProfiles';
import PremiumBadge from '@/components/ui/premium/PremiumBadge';

type StableSummaryCardData = {
  name: string;
  slug: string;
  activeCount: number;
  totalTrackedCount: number;
  sekitoriCount: number;
  divisions: string[];
  divisionCounts: Record<string, number>;
  latestVerifiedBasho: string | null;
  verifiedCount: number;
};

type Props = {
  stable: StableSummaryCardData;
  compact?: boolean;
};

export default function StableSummaryCard({ stable, compact = false }: Props) {
  return (
    <Link
      to={`/stables/${encodeURIComponent(stable.slug)}`}
      className={`group rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-all hover:border-red-600/40 hover:bg-white/[0.04] ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <PremiumBadge variant="red">Stable</PremiumBadge>
            {stable.sekitoriCount > 0 ? (
              <PremiumBadge variant="amber">{stable.sekitoriCount} sekitori</PremiumBadge>
            ) : null}
          </div>
          <h3 className={`mt-3 font-display font-bold tracking-tight text-white transition-colors group-hover:text-red-300 ${compact ? 'text-lg' : 'text-2xl'}`}>
            {stable.name}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500">
            {stable.activeCount > 0
              ? `${stable.activeCount} active rikishi across ${Math.max(stable.divisions.length, 1)} roster layer${stable.divisions.length === 1 ? '' : 's'}.`
              : `${stable.totalTrackedCount} tracked rikishi in the current directory.`}
          </p>
        </div>

        <div className="text-right text-xs text-zinc-500">
          <div className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {stable.totalTrackedCount} tracked
          </div>
          {stable.latestVerifiedBasho ? (
            <div className="mt-1">Verified through {formatVerifiedBasho(stable.latestVerifiedBasho)}</div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {stable.divisions.length > 0 ? (
          stable.divisions.map((division) => (
            <PremiumBadge key={division} variant={division === 'Makuuchi' ? 'red' : division === 'Juryo' ? 'blue' : division === 'Makushita' ? 'amber' : 'zinc'}>
              {division} {stable.divisionCounts[division] ?? 0}
            </PremiumBadge>
          ))
        ) : (
          <PremiumBadge variant="zinc">Roster divisions unpublished</PremiumBadge>
        )}
        {stable.verifiedCount > 0 ? (
          <PremiumBadge variant="green">
            <ShieldCheck className="h-3 w-3" />
            {stable.verifiedCount} verified profiles
          </PremiumBadge>
        ) : null}
      </div>

      <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-red-300 transition-colors group-hover:text-red-200">
        Open stable
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}
