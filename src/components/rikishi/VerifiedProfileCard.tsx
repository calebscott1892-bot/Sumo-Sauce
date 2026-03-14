import { useMemo } from 'react';
import FallbackAvatar from '@/components/FallbackAvatar';
import VerifiedProvenanceBlock from '@/components/rikishi/VerifiedProvenanceBlock';
import { PremiumBadge } from '@/components/ui/premium';
import { getVerifiedProfile, getVerifiedProfileByJsaId, getVerifiedImageUrl } from '@/data/verifiedProfiles';
import type { VerifiedProfile } from '@/data/verifiedProfiles';

type Props = {
  /** JSA rikishiId if available; preferred for deterministic lookup */
  rikishiId?: string | null;
  /** Short or full shikona used to look up the verified profile */
  shikona: string;
  /** Heya from the API (used as fallback if verified profile doesn't exist) */
  heya?: string | null;
  /** Current highest rank for the badge */
  rank?: string;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium leading-relaxed text-zinc-200 sm:text-right">{value}</span>
    </div>
  );
}

function formatHeight(cm: number): string {
  const feet = Math.floor(cm / 30.48);
  const inches = Math.round((cm / 2.54) % 12);
  return `${cm} cm (${feet}′${inches}″)`;
}

function formatWeight(kg: number): string {
  const lbs = Math.round(kg * 2.205);
  return `${kg} kg (${lbs} lbs)`;
}

function formatBirthDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

function computeAge(iso: string): number | null {
  try {
    const birth = new Date(iso + 'T00:00:00');
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}

export default function VerifiedProfileCard({ rikishiId, shikona, heya, rank }: Props) {
  const profile: VerifiedProfile | null = useMemo(
    () => {
      if (rikishiId) {
        const byId = getVerifiedProfileByJsaId(rikishiId);
        if (byId) return byId;
      }
      return getVerifiedProfile(shikona);
    },
    [rikishiId, shikona]
  );

  const imageUrl = useMemo(
    () => getVerifiedImageUrl(profile),
    [profile]
  );

  const stableName = profile?.heya ?? heya ?? null;

  if (!profile) {
    return (
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="shrink-0">
            <FallbackAvatar
              photoUrl=""
              shikona={shikona}
              stable={stableName ?? undefined}
              rank={rank}
              size="md"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight text-white">
                  {shikona}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {stableName ? `${stableName} stable` : 'Stable unknown'}
                </p>
              </div>
              <PremiumBadge variant="zinc">Trust profile not published</PremiumBadge>
            </div>

            <div className="mt-4 rounded-lg border border-white/[0.06] bg-black/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Trust & Sources</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                A structured verified profile is not published for this rikishi yet. Match, career, and basho data on this
                page still come from the main SumoWatch dataset, but source-linked profile confidence and official-image
                publishing only appear once a canonical trust profile is matched safely.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <PremiumBadge variant="amber">Source-linked trust cues pending</PremiumBadge>
                <PremiumBadge variant="zinc">Official image withheld until verified</PremiumBadge>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const age = profile.birthDate ? computeAge(profile.birthDate) : null;

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        {/* Profile image / avatar */}
        <div className="shrink-0">
          <FallbackAvatar
            photoUrl={imageUrl}
            shikona={shikona}
            stable={stableName ?? undefined}
            rank={rank}
            size="md"
          />
        </div>

        {/* Bio data */}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold tracking-tight text-white">
            {profile.shikona}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {stableName ? `${stableName} stable` : 'Stable unknown'}
            {profile.status === 'active' && (
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                Active
              </span>
            )}
          </p>

          <div className="mt-3 divide-y divide-white/[0.04]">
            {profile.birthDate && (
              <InfoRow
                label="Born"
                value={`${formatBirthDate(profile.birthDate)}${age !== null ? ` (age ${age})` : ''}`}
              />
            )}
            {profile.nationality && (
              <InfoRow label="Nationality" value={profile.nationality} />
            )}
            {profile.heightCm != null && profile.heightCm > 0 && (
              <InfoRow label="Height" value={formatHeight(profile.heightCm)} />
            )}
            {profile.weightKg != null && profile.weightKg > 0 && (
              <InfoRow label="Weight" value={formatWeight(profile.weightKg)} />
            )}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <VerifiedProvenanceBlock profile={profile} />
      </div>
    </section>
  );
}
