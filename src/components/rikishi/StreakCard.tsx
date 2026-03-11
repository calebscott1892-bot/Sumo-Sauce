import { memo, useMemo } from 'react';
import { Flame, TrendingDown, Activity } from 'lucide-react';
import { bashoLabel } from '@/utils/basho';
import type { RankProgressionItem } from '@/pages/rikishi/types';

type Props = {
  rankProgression: RankProgressionItem[];
};

type Streak = {
  type: 'win' | 'loss';
  length: number;
  startBasho: string;
  endBasho: string;
};

function computeStreaks(progression: RankProgressionItem[]) {
  if (!progression.length) {
    return { longestWin: null, longestLoss: null, current: null };
  }

  const sorted = [...progression].sort((a, b) => a.bashoId.localeCompare(b.bashoId));

  let longestWin: Streak | null = null;
  let longestLoss: Streak | null = null;
  let currentStreak: Streak | null = null;

  let activeType: 'win' | 'loss' | null = null;
  let activeStart = '';
  let activeLength = 0;

  for (const entry of sorted) {
    const isWin = entry.kachiKoshi;
    const type: 'win' | 'loss' = isWin ? 'win' : 'loss';

    if (type === activeType) {
      activeLength++;
    } else {
      // Close previous streak
      if (activeType && activeLength > 0) {
        const streak: Streak = {
          type: activeType,
          length: activeLength,
          startBasho: activeStart,
          endBasho: sorted[sorted.indexOf(entry) - 1]?.bashoId ?? activeStart,
        };
        if (activeType === 'win' && (!longestWin || streak.length > longestWin.length)) {
          longestWin = streak;
        }
        if (activeType === 'loss' && (!longestLoss || streak.length > longestLoss.length)) {
          longestLoss = streak;
        }
      }
      activeType = type;
      activeStart = entry.bashoId;
      activeLength = 1;
    }
  }

  // Close final streak
  if (activeType && activeLength > 0) {
    const streak: Streak = {
      type: activeType,
      length: activeLength,
      startBasho: activeStart,
      endBasho: sorted[sorted.length - 1].bashoId,
    };
    if (activeType === 'win' && (!longestWin || streak.length > longestWin.length)) {
      longestWin = streak;
    }
    if (activeType === 'loss' && (!longestLoss || streak.length > longestLoss.length)) {
      longestLoss = streak;
    }
    currentStreak = streak;
  }

  return { longestWin, longestLoss, current: currentStreak };
}

function StreakBadge({ streak, label, icon: Icon, color }: {
  streak: Streak | null;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  if (!streak) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <div className="mt-1 text-sm text-zinc-600">—</div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 transition-colors duration-200 hover:border-white/[0.15] ${color}`}>
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-lg font-bold text-white">{streak.length} basho</div>
      <div className="mt-0.5 text-xs text-zinc-500">
        {bashoLabel(streak.startBasho)} → {bashoLabel(streak.endBasho)}
      </div>
    </div>
  );
}

function StreakCard({ rankProgression }: Props) {
  const streaks = useMemo(() => computeStreaks(rankProgression), [rankProgression]);

  if (!rankProgression.length) return null;

  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5" aria-label="Streak analysis">
      <h2 className="font-display text-xl font-bold tracking-tight text-white">Streak Analysis</h2>
      <p className="mt-0.5 text-xs text-zinc-500">Consecutive kachi-koshi and make-koshi basho streaks.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StreakBadge
          streak={streaks.longestWin}
          label="Longest Winning Streak"
          icon={Flame}
          color="border-emerald-800 bg-emerald-950/20"
        />
        <StreakBadge
          streak={streaks.longestLoss}
          label="Longest Losing Streak"
          icon={TrendingDown}
          color="border-red-800 bg-red-950/20"
        />
        <StreakBadge
          streak={streaks.current}
          label={`Current Streak (${streaks.current?.type === 'win' ? 'Winning' : 'Losing'})`}
          icon={Activity}
          color={streaks.current?.type === 'win' ? 'border-emerald-800 bg-emerald-950/20' : 'border-amber-800 bg-amber-950/20'}
        />
      </div>
    </section>
  );
}

export default memo(StreakCard);
