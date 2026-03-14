import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ShieldCheck, ShieldAlert } from 'lucide-react';
import FallbackAvatar from '@/components/FallbackAvatar';
import PremiumBadge from '@/components/ui/premium/PremiumBadge';
import {
  formatVerifiedBasho,
  getProfileConfidencePresentation,
  getVerifiedImageUrl,
  getVerifiedProfileForIdentity,
} from '@/data/verifiedProfiles';
import type { RikishiDirectoryEntry } from '../../../shared/api/v1';

type Props = {
  entry: RikishiDirectoryEntry;
  compact?: boolean;
  className?: string;
};

function RikishiDiscoveryRow({ entry, compact = false, className = '' }: Props) {
  const profile = useMemo(
    () => getVerifiedProfileForIdentity(entry.rikishiId, entry.shikona),
    [entry.rikishiId, entry.shikona],
  );

  const imageUrl = useMemo(() => getVerifiedImageUrl(profile), [profile]);
  const trustMeta = useMemo(
    () =>
      profile
        ? getProfileConfidencePresentation(profile.profileConfidence)
        : { label: 'Trust metadata unavailable', detail: '', variant: 'zinc' as const },
    [profile],
  );
  const divisionLabel = profile?.division ?? 'Division unpublished';
  const stableLabel = profile?.heya ?? entry.heya ?? 'Heya unpublished';
  const latestVerified = profile?.lastVerifiedBasho ? formatVerifiedBasho(profile.lastVerifiedBasho) : null;

  return (
    <Link
      to={`/rikishi/${encodeURIComponent(entry.rikishiId)}`}
      className={`group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 transition-all hover:border-red-600/50 hover:bg-white/[0.04] sm:items-center sm:px-4 ${className}`.trim()}
    >
      <FallbackAvatar
        photoUrl={imageUrl}
        shikona={entry.shikona}
        rid={entry.rikishiId}
        stable={stableLabel}
        size={compact ? 'sm' : 'md'}
        showRankMarker={false}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className={`truncate font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}>
            {entry.shikona}
          </span>
          <PremiumBadge variant="zinc" className="shrink-0">
            {divisionLabel}
          </PremiumBadge>
          {!compact && (
            <PremiumBadge variant={trustMeta.variant} className="hidden shrink-0 sm:inline-flex">
              {trustMeta.label}
            </PremiumBadge>
          )}
          {imageUrl && (
            <PremiumBadge variant="blue" className="hidden shrink-0 sm:inline-flex">
              <Camera className="h-3 w-3" />
              Official photo
            </PremiumBadge>
          )}
        </div>

        <div className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-500 ${compact ? 'text-[11px]' : 'text-xs'}`}>
          <span className="font-mono text-zinc-400">{entry.rikishiId}</span>
          <span>{stableLabel}</span>
          {latestVerified && !compact && <span>Verified {latestVerified}</span>}
        </div>

        {compact && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1">
              {profile?.profileConfidence === 'verified' ? (
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
              ) : (
                <ShieldAlert className={`h-3 w-3 ${profile ? 'text-amber-400' : 'text-zinc-500'}`} />
              )}
              {trustMeta.label}
            </span>
            {latestVerified && <span>· {latestVerified}</span>}
          </div>
        )}

        {!compact && (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 sm:hidden">
            <span className="inline-flex items-center gap-1">
              {profile?.profileConfidence === 'verified' ? (
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
              ) : (
                <ShieldAlert className={`h-3 w-3 ${profile ? 'text-amber-400' : 'text-zinc-500'}`} />
              )}
              {trustMeta.label}
            </span>
            {imageUrl && <span>Official photo</span>}
          </div>
        )}
      </div>

      <span className="hidden shrink-0 text-xs text-zinc-600 transition-colors group-hover:text-red-300 sm:block">→</span>
    </Link>
  );
}

export default memo(RikishiDiscoveryRow);
