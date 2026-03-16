import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRikishiDirectory } from '@/pages/rikishi/api';
import { recentBashoIds } from '@/utils/basho';
import { Shuffle, User, Calendar, Swords } from 'lucide-react';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function DiscoveryCard() {
  const navigate = useNavigate();
  const [spinning, setSpinning] = useState<string | null>(null);

  const directoryQuery = useQuery({
    queryKey: ['rikishi-directory'],
    queryFn: getRikishiDirectory,
    staleTime: 10 * 60 * 1000,
  });

  const allBasho = recentBashoIds(120); // last ~20 years

  const goRandomRikishi = useCallback(() => {
    const list = directoryQuery.data;
    if (!list?.length) return;
    setSpinning('rikishi');
    setTimeout(() => {
      const pick = pickRandom(list);
      setSpinning(null);
      navigate(`/rikishi/${encodeURIComponent(pick.rikishiId)}`);
    }, 400);
  }, [directoryQuery.data, navigate]);

  const goRandomBasho = useCallback(() => {
    if (!allBasho.length) return;
    setSpinning('basho');
    setTimeout(() => {
      const pick = pickRandom(allBasho);
      setSpinning(null);
      navigate(`/basho/${encodeURIComponent(pick)}`);
    }, 400);
  }, [allBasho, navigate]);

  const goRandomRivalry = useCallback(() => {
    const list = directoryQuery.data;
    if (!list || list.length < 2) return;
    setSpinning('rivalry');
    setTimeout(() => {
      const a = pickRandom(list);
      let b = pickRandom(list);
      let attempts = 0;
      while (b.rikishiId === a.rikishiId && attempts < 20) {
        b = pickRandom(list);
        attempts++;
      }
      setSpinning(null);
      navigate(`/compare/${encodeURIComponent(a.rikishiId)}/${encodeURIComponent(b.rikishiId)}`);
    }, 400);
  }, [directoryQuery.data, navigate]);

  const buttons = [
    {
      key: 'rikishi',
      label: 'Random Rikishi',
      icon: User,
      action: goRandomRikishi,
      disabled: !directoryQuery.data?.length,
    },
    {
      key: 'basho',
      label: 'Random Basho',
      icon: Calendar,
      action: goRandomBasho,
      disabled: !allBasho.length,
    },
    {
      key: 'rivalry',
      label: 'Random Rivalry',
      icon: Swords,
      action: goRandomRivalry,
      disabled: !directoryQuery.data || directoryQuery.data.length < 2,
    },
  ];

  return (
    <section className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.14)] sm:p-5">
      <div className="flex items-center gap-2">
        <Shuffle className="h-5 w-5 text-red-400" />
        <h2 className="font-display text-lg font-bold tracking-tight text-white">Wildcard discovery</h2>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">One fast detour after the curated routes.</p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {buttons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            onClick={btn.action}
            disabled={btn.disabled}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all
              ${spinning === btn.key
                ? 'animate-pulse border-red-600 bg-red-950/30 text-red-300'
                : 'border-white/[0.08] bg-white/[0.04] text-zinc-200 hover:border-red-600/45 hover:bg-white/[0.06] hover:text-white'}
              disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <btn.icon className={`h-4 w-4 ${spinning === btn.key ? 'animate-spin' : ''}`} />
            {spinning === btn.key ? 'Finding...' : btn.label}
          </button>
        ))}
      </div>
    </section>
  );
}
