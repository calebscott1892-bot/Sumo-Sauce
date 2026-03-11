import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, TrendingDown, Zap, BookOpen } from 'lucide-react';
import type { DivisionStandingRow } from '../../../shared/api/v1';

type Props = {
  rows: DivisionStandingRow[];
  bashoId: string;
};

function rankToOrder(rank: string): number {
  const r = rank.toLowerCase();
  if (r.includes('yokozuna')) return 1;
  if (r.includes('ozeki')) return 5;
  if (r.includes('sekiwake')) return 10;
  if (r.includes('komusubi')) return 14;
  const mMatch = r.match(/maegashira\s*(\d+)/);
  if (mMatch) return 18 + parseInt(mMatch[1], 10) * 2 + (r.includes('west') ? 0.5 : 0);
  return 100;
}

type Storyline = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  linkTo?: string;
  linkLabel?: string;
  color: string;
};

export default function BashoStorylines({ rows, bashoId }: Props) {
  const storylines = useMemo(() => {
    if (rows.length < 3) return [];

    const sorted = [...rows].sort((a, b) => b.wins - a.wins || a.losses - b.losses);
    const byRank = [...rows].sort((a, b) => rankToOrder(a.rank) - rankToOrder(b.rank));
    const results: Storyline[] = [];

    // 1. Strongest performer (champion)
    const champion = sorted[0];
    if (champion) {
      results.push({
        icon: Trophy,
        title: 'Strongest Performer',
        description: `${champion.shikona} dominated with a ${champion.wins}-${champion.losses} record from the ${champion.rank} position.`,
        linkTo: `/rikishi/${encodeURIComponent(champion.rikishiId)}`,
        linkLabel: `View ${champion.shikona}`,
        color: 'text-amber-400',
      });
    }

    // 2. Biggest upset — lowest ranked wrestler with best record
    const rankedWithOrder = rows.map((r) => ({ ...r, order: rankToOrder(r.rank) }));
    rankedWithOrder.sort((a, b) => {
      const performanceGap = (b.wins - b.order / 10) - (a.wins - a.order / 10);
      return performanceGap;
    });
    const upsetCandidate = rankedWithOrder.find(
      (r) => r.order >= 20 && r.wins >= 8 && r.rikishiId !== champion?.rikishiId,
    );
    if (upsetCandidate) {
      results.push({
        icon: Zap,
        title: 'Biggest Upset',
        description: `${upsetCandidate.shikona} (${upsetCandidate.rank}) overperformed with ${upsetCandidate.wins}-${upsetCandidate.losses}.`,
        linkTo: `/rikishi/${encodeURIComponent(upsetCandidate.rikishiId)}`,
        linkLabel: `View ${upsetCandidate.shikona}`,
        color: 'text-orange-400',
      });
    }

    // 3. Most promotion-worthy
    const promotionCandidates = rows
      .filter((r) => r.wins >= 10)
      .sort((a, b) => b.wins - a.wins);
    const topPromo = promotionCandidates[0];
    if (topPromo && topPromo.rikishiId !== champion?.rikishiId) {
      results.push({
        icon: TrendingUp,
        title: 'Promotion Candidate',
        description: `${topPromo.shikona} posted an outstanding ${topPromo.wins}-${topPromo.losses} from ${topPromo.rank}.`,
        linkTo: `/rikishi/${encodeURIComponent(topPromo.rikishiId)}`,
        linkLabel: `View ${topPromo.shikona}`,
        color: 'text-emerald-400',
      });
    }

    // 4. Demotion risk
    const demotionRisks = byRank
      .filter((r) => rankToOrder(r.rank) <= 14 && r.losses > r.wins && r.wins + r.losses >= 10)
      .sort((a, b) => a.wins - b.wins);
    const topDemotion = demotionRisks[0];
    if (topDemotion) {
      results.push({
        icon: TrendingDown,
        title: 'Demotion Risk',
        description: `${topDemotion.shikona} struggled at ${topDemotion.rank} with just ${topDemotion.wins}-${topDemotion.losses}.`,
        linkTo: `/rikishi/${encodeURIComponent(topDemotion.rikishiId)}`,
        linkLabel: `View ${topDemotion.shikona}`,
        color: 'text-red-400',
      });
    }

    // 5. Most active kimarite
    const kimariteCounts = new Map<string, number>();
    for (const row of rows) {
      for (const kb of row.kimariteBreakdown) {
        kimariteCounts.set(kb.kimariteId, (kimariteCounts.get(kb.kimariteId) || 0) + kb.count);
      }
    }
    const topKimarite = Array.from(kimariteCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)[0];
    if (topKimarite) {
      results.push({
        icon: BookOpen,
        title: 'Signature Technique',
        description: `${topKimarite[0]} was the most used winning technique with ${topKimarite[1]} occurrences.`,
        linkTo: '/analytics/kimarite',
        linkLabel: 'Kimarite analytics',
        color: 'text-purple-400',
      });
    }

    return results;
  }, [rows, bashoId]);

  if (!storylines.length) return null;

  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5" aria-label="Basho storylines">
      <h2 className="font-display text-xl font-bold tracking-tight text-white">📰 Storylines</h2>
      <p className="mt-0.5 text-xs text-zinc-500">Key narratives from this tournament.</p>

      <div className="mt-4 space-y-3">
        {storylines.map((story) => (
          <div
            key={story.title}
            className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-colors duration-150 hover:border-white/[0.12]"
          >
            <div className="flex items-start gap-3">
              <story.icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${story.color}`} />
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-semibold ${story.color}`}>{story.title}</div>
                <div className="mt-0.5 text-sm text-zinc-300">{story.description}</div>
                {story.linkTo && (
                  <Link
                    to={story.linkTo}
                    className="mt-1.5 inline-block text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    {story.linkLabel} →
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
