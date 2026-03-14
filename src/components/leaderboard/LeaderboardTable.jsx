import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ShieldCheck, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import { PremiumBadge } from '@/components/ui/premium';
import EmptyState from '@/components/ui/EmptyState';
import FallbackAvatar from '@/components/FallbackAvatar';
import {
  formatVerifiedBasho,
  getProfileConfidencePresentation,
  getProvenanceStatusPresentation,
  getVerifiedImageUrl,
  getVerifiedProfileForIdentity,
} from '@/data/verifiedProfiles';

const DIVISION_BADGE_VARIANTS = {
  Makuuchi: 'red',
  Juryo: 'blue',
  Makushita: 'amber',
  Sandanme: 'zinc',
  Jonidan: 'zinc',
  Jonokuchi: 'zinc',
};

const SCORE_TONES = {
  elite: 'border-emerald-600/40 bg-emerald-950/25 text-emerald-300',
  high: 'border-blue-600/40 bg-blue-950/20 text-blue-300',
  mid: 'border-amber-600/40 bg-amber-950/20 text-amber-300',
  low: 'border-white/[0.08] bg-white/[0.03] text-zinc-300',
};

function getScoreTone(score) {
  if (score >= 90) return SCORE_TONES.elite;
  if (score >= 80) return SCORE_TONES.high;
  if (score >= 70) return SCORE_TONES.mid;
  return SCORE_TONES.low;
}

function getTrustMeta(profile) {
  if (!profile) {
    return {
      label: 'Trust metadata unavailable',
      variant: 'zinc',
      icon: ShieldAlert,
    };
  }

  const presentation = getProfileConfidencePresentation(profile.profileConfidence);
  return {
    label: presentation.label,
    variant: presentation.variant,
    icon: profile.profileConfidence === 'verified' ? ShieldCheck : ShieldAlert,
  };
}

function getProvenanceMeta(profile) {
  if (!profile?.provenanceStatus) return null;
  const presentation = getProvenanceStatusPresentation(profile.provenanceStatus);
  return { label: presentation.label, variant: presentation.variant };
}

function getDivisionVariant(division) {
  return DIVISION_BADGE_VARIANTS[division] || 'zinc';
}

export default function LeaderboardTable({ wrestlers, onSelect }) {
  if (!wrestlers?.length) {
    return (
      <EmptyState
        message="No wrestlers match the current leaderboard filters"
        description="Adjust the search, division, source, or stub filters to widen the result set."
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-2"
    >
      {wrestlers.map((item, index) => {
        const wrestler = item.wrestler || {};
        const record = item.record || {};
        const rid = String(item.rid || wrestler?.rid || record?.rid || '').trim();
        const shikona = String(wrestler?.shikona || record?.shikona || rid || 'Unknown').trim();
        const stableName = String(wrestler?.stable || wrestler?.heya?.name || '').trim();
        const division = String(item.division || wrestler?.current_division || record?.division || '').trim() || 'Division unknown';
        const rankLabel = String(item.rankLabel || '').trim();
        const wins = Number(item.wins ?? 0);
        const losses = Number(item.losses ?? 0);
        const winPct = Number.isFinite(item.winPct) ? item.winPct : 0;
        const overallRating = Number(item.overallRating ?? 0);
        const topDivisionYusho = Number(record?.yusho_top_div);
        const specialPrizes = Number(record?.special_prizes);

        const profile = getVerifiedProfileForIdentity(rid, shikona);
        const trustMeta = getTrustMeta(profile);
        const provenanceMeta = getProvenanceMeta(profile);
        const verifiedImageUrl = getVerifiedImageUrl(profile);
        const lastVerifiedLabel = profile?.lastVerifiedBasho ? formatVerifiedBasho(profile.lastVerifiedBasho) : '';
        const TrustIcon = trustMeta.icon;

        return (
          <motion.button
            key={rid || `${record?.record_id || 'leaderboard'}-${index}`}
            type="button"
            onClick={() => onSelect(item)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.995 }}
            className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-4 text-left transition-all hover:border-red-600/35 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-red-950/10 sm:px-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex items-start gap-3 sm:flex-1 sm:gap-4">
                <div className="w-7 shrink-0 pt-0.5 text-right font-display text-lg font-bold text-zinc-500 sm:w-10 sm:text-2xl">
                  {index + 1}
                </div>

                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-black sm:h-10 sm:w-10 sm:text-xs ${getScoreTone(overallRating)}`}>
                  {overallRating}
                </div>

                <FallbackAvatar
                  size="sm"
                  photoUrl={verifiedImageUrl}
                  shikona={shikona}
                  rid={rid}
                  stable={stableName}
                  rank={item.tier}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <h3 className="truncate font-display text-base font-bold tracking-tight text-white sm:text-xl">
                      {shikona}
                    </h3>
                    <PremiumBadge variant={getDivisionVariant(division)}>{division}</PremiumBadge>
                    {verifiedImageUrl ? (
                      <PremiumBadge variant="blue" className="hidden sm:inline-flex">
                        <ImageIcon className="h-3.5 w-3.5" />
                        Verified image
                      </PremiumBadge>
                    ) : null}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                    <span className="font-medium text-zinc-200">{rankLabel || item.tier || 'Rank unavailable'}</span>
                    {stableName ? <span>{stableName}</span> : null}
                    {rid ? <span className="font-mono text-xs text-zinc-500">ID {rid}</span> : null}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <PremiumBadge variant={trustMeta.variant}>
                      <TrustIcon className="h-3.5 w-3.5" />
                      {trustMeta.label}
                    </PremiumBadge>
                    {Number.isFinite(topDivisionYusho) && topDivisionYusho > 0 ? (
                      <PremiumBadge variant="amber">
                        {topDivisionYusho} top-division yusho
                      </PremiumBadge>
                    ) : null}
                    {Number.isFinite(specialPrizes) && specialPrizes > 0 ? (
                      <PremiumBadge variant="blue">
                        {specialPrizes} special prizes
                      </PremiumBadge>
                    ) : null}
                    {provenanceMeta ? (
                      <PremiumBadge variant={provenanceMeta.variant}>{provenanceMeta.label}</PremiumBadge>
                    ) : null}
                    {verifiedImageUrl ? (
                      <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-zinc-400 sm:hidden">
                        Verified image
                      </span>
                    ) : null}
                    {lastVerifiedLabel ? (
                      <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-zinc-400">
                        Verified through {lastVerifiedLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 sm:min-w-[6.25rem] sm:block sm:border-t-0 sm:pt-0 sm:text-right">
                <div>
                  <div className="font-display text-lg font-bold tracking-tight sm:text-xl">
                    <span className="text-white">{wins}</span>
                    <span className="text-zinc-600">-</span>
                    <span className="text-zinc-400">{losses}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                    {(winPct * 100).toFixed(0)}% win
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-red-300 sm:mt-3 sm:justify-end">
                  View
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
