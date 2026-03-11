import { useMemo } from 'react';
import FallbackAvatar from '@/components/FallbackAvatar';
import { getVerifiedProfile, getVerifiedImageUrl } from '@/data/verifiedProfiles';
import type { VerifiedProfile } from '@/data/verifiedProfiles';

type Props = {
  /** Short or full shikona used to look up the verified profile */
  shikona: string;
  /** Heya from the API (used as fallback if verified profile doesn't exist) */
  heya?: string | null;
  /** Current highest rank for the badge */
  rank?: string;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-200">{value}</span>
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

export default function VerifiedProfileCard({ shikona, heya, rank }: Props) {
  const profile: VerifiedProfile | null = useMemo(
    () => getVerifiedProfile(shikona),
    [shikona]
  );

  const imageUrl = useMemo(
    () => getVerifiedImageUrl(profile),
    [profile]
  );

  // If no verified data exists, render nothing — the rest of the page
  // already handles the unverified case gracefully.
  if (!profile) return null;

  const age = computeAge(profile.birthDate);

  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        {/* Profile image / avatar */}
        <div className="shrink-0">
          <FallbackAvatar
            photoUrl={imageUrl}
            shikona={shikona}
            stable={profile.heya}
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
            {profile.heya} stable
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
              <InfoRow label="From" value={profile.nationality} />
            )}
            {profile.heightCm > 0 && (
              <InfoRow label="Height" value={formatHeight(profile.heightCm)} />
            )}
            {profile.weightKg > 0 && (
              <InfoRow label="Weight" value={formatWeight(profile.weightKg)} />
            )}
          </div>

          {/* Confidence indicator */}
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-600">
            {profile.profileConfidence === 'verified' && (
              <>
                <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-emerald-950/40 text-emerald-500">✔</span>
                <span>JSA verified profile</span>
              </>
            )}
            {profile.imageConfidence !== 'verified' && imageUrl === '' && (
              <span className="ml-2 text-amber-600">Image pending verification</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
