import { ExternalLink, ShieldCheck, ShieldAlert, Image as ImageIcon, Database } from 'lucide-react';
import PremiumBadge from '@/components/ui/premium/PremiumBadge';
import {
  formatVerifiedBasho,
  getImageConfidencePresentation,
  getProfileConfidencePresentation,
  getProvenanceStatusPresentation,
} from '@/data/verifiedProfiles';
import type { VerifiedProfile } from '@/data/verifiedProfiles';

type BadgeVariant = 'red' | 'gold' | 'green' | 'blue' | 'zinc' | 'amber';

function buildSummary(profile: VerifiedProfile): string {
  const profileCopy = getProfileConfidencePresentation(profile.profileConfidence);
  const imageCopy = getImageConfidencePresentation(profile.imageConfidence);
  const provenanceCopy = getProvenanceStatusPresentation(profile.provenanceStatus);
  const freshness = profile.lastVerifiedBasho
    ? `Last verified context: ${formatVerifiedBasho(profile.lastVerifiedBasho)}.`
    : 'Last verified basho is not published for this profile yet.';

  return `${profileCopy.detail} ${provenanceCopy.detail} ${imageCopy.detail} ${freshness}`;
}

function TrustDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-sm leading-relaxed text-zinc-200">{value}</div>
    </div>
  );
}

type Props = {
  profile: VerifiedProfile;
  className?: string;
};

export default function VerifiedProvenanceBlock({ profile, className = '' }: Props) {
  const profileCopy = getProfileConfidencePresentation(profile.profileConfidence);
  const imageCopy = getImageConfidencePresentation(profile.imageConfidence);
  const provenanceCopy = getProvenanceStatusPresentation(profile.provenanceStatus);
  const summary = buildSummary(profile);

  return (
    <div className={`rounded-lg border border-white/[0.06] bg-black/20 p-4 ${className}`.trim()}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Trust & Sources</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{summary}</p>
        </div>
        <PremiumBadge variant="zinc">
          {profile.lastVerifiedBasho ? `Verified ${formatVerifiedBasho(profile.lastVerifiedBasho)}` : 'Verification date not published'}
        </PremiumBadge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PremiumBadge variant={profileCopy.variant}>{profileCopy.label}</PremiumBadge>
        <PremiumBadge variant={imageCopy.variant}>{imageCopy.label}</PremiumBadge>
        <PremiumBadge variant={provenanceCopy.variant}>{provenanceCopy.label}</PremiumBadge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <TrustDetail icon={ShieldCheck} label="Profile confidence" value={profileCopy.detail} />
        <TrustDetail icon={ImageIcon} label="Image policy" value={imageCopy.detail} />
        <TrustDetail icon={ShieldAlert} label="Provenance status" value={provenanceCopy.detail} />
        <TrustDetail
          icon={Database}
          label="Source coverage"
          value={
            profile.sourceRefs.length > 0
              ? `${profile.sourceRefs.length} source reference${profile.sourceRefs.length === 1 ? '' : 's'} published for this profile.`
              : 'No source links are published for this profile yet.'
          }
        />
      </div>

      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Published sources</div>
        {profile.sourceRefs.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.sourceRefs.map((ref) => (
              <a
                key={`${ref.label}-${ref.url}`}
                href={ref.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:border-red-600 hover:text-white"
              >
                <span>{ref.label}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-zinc-500">Source links are not published for this profile yet.</p>
        )}
      </div>
    </div>
  );
}
