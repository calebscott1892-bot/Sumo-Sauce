import { useMemo } from 'react';
import { Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import FallbackAvatar from '@/components/FallbackAvatar';
import PremiumBadge from '@/components/ui/premium/PremiumBadge';
import {
  formatVerifiedBasho,
  getProfileConfidencePresentation,
  getProvenanceStatusPresentation,
  getVerifiedImageUrl,
  getVerifiedProfileForIdentity,
} from '@/data/verifiedProfiles';

type Props = {
  rikishiId: string;
  shikona: string;
  heya?: string | null;
  accent?: 'red' | 'blue';
};

const ACCENT_STYLES: Record<NonNullable<Props['accent']>, string> = {
  red: 'border-red-700/25 bg-red-950/10',
  blue: 'border-blue-700/25 bg-blue-950/10',
};

export default function ComparisonIdentityCard({
  rikishiId,
  shikona,
  heya,
  accent = 'red',
}: Props) {
  const profile = useMemo(
    () => getVerifiedProfileForIdentity(rikishiId, shikona),
    [rikishiId, shikona],
  );
  const imageUrl = useMemo(() => getVerifiedImageUrl(profile), [profile]);
  const profileTone = profile ? getProfileConfidencePresentation(profile.profileConfidence) : null;
  const provenanceTone = profile?.provenanceStatus
    ? getProvenanceStatusPresentation(profile.provenanceStatus)
    : null;
  const stableLabel = profile?.heya ?? heya ?? 'Heya unpublished';

  return (
    <div className={`rounded-2xl border p-4 ${ACCENT_STYLES[accent]}`.trim()}>
      <div className="flex items-start gap-4">
        <FallbackAvatar
          photoUrl={imageUrl}
          shikona={shikona}
          rid={rikishiId}
          stable={stableLabel}
          size="md"
          showRankMarker={false}
        />

        <div className="min-w-0 flex-1">
          <Link
            to={`/rikishi/${encodeURIComponent(rikishiId)}`}
            className={`font-display text-2xl font-bold tracking-tight text-white transition-colors ${
              accent === 'red' ? 'hover:text-red-300' : 'hover:text-blue-300'
            }`}
          >
            {shikona}
          </Link>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span className="font-mono text-zinc-400">{rikishiId}</span>
            <span>{stableLabel}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <PremiumBadge variant={profileTone?.variant ?? 'zinc'}>
              {profileTone?.label ?? 'Trust metadata unavailable'}
            </PremiumBadge>
            {provenanceTone && (
              <PremiumBadge variant={provenanceTone.variant}>{provenanceTone.label}</PremiumBadge>
            )}
            {imageUrl ? (
              <PremiumBadge variant="blue">
                <Camera className="h-3 w-3" />
                Official photo
              </PremiumBadge>
            ) : (
              <PremiumBadge variant="zinc">No verified image</PremiumBadge>
            )}
          </div>

          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {profileTone?.detail ?? 'This comparison does not have a matched structured trust profile yet.'}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {profile?.lastVerifiedBasho
              ? `Latest verified context: ${formatVerifiedBasho(profile.lastVerifiedBasho)}`
              : 'Latest verified basho is not published for this profile yet.'}
          </p>
        </div>
      </div>
    </div>
  );
}
