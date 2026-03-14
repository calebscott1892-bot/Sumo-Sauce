import { Link } from 'react-router-dom';
import { BarChart3, CalendarRange, Clock3, TrendingUp } from 'lucide-react';

type NavKey = 'global' | 'kimarite' | 'eras' | 'timeline';

type Props = {
  current: NavKey;
};

const ITEMS: Array<{
  key: NavKey;
  label: string;
  to: string;
  icon: typeof BarChart3;
}> = [
  { key: 'global', label: 'Global analytics', to: '/analytics', icon: BarChart3 },
  { key: 'kimarite', label: 'Kimarite', to: '/analytics/kimarite', icon: TrendingUp },
  { key: 'eras', label: 'Eras', to: '/analytics/eras', icon: Clock3 },
  { key: 'timeline', label: 'Basho timeline', to: '/timeline', icon: CalendarRange },
];

export default function AnalyticsNav({ current }: Props) {
  return (
    <nav
      aria-label="Analytics navigation"
      className="flex flex-wrap gap-2"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.key === current;

        return (
          <Link
            key={item.key}
            to={item.to}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? 'border-red-600/50 bg-red-950/20 text-white'
                : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:border-red-600/35 hover:text-white'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
