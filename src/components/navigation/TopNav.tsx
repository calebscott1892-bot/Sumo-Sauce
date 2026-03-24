import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  Calendar,
  Search,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';

const NAV_LINKS = [
  { to: '/basho', label: 'Basho', icon: Calendar },
  { to: '/rikishi', label: 'Rikishi', icon: Users },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/rivalries', label: 'Rivalries', icon: Swords },
  { to: '/stables', label: 'Stables', icon: Building2 },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
] as const;

export default function TopNav() {
  const { pathname } = useLocation();

  function isActive(to: string) {
    if (to === '/') return pathname === '/';
    return pathname === to || pathname.startsWith(`${to}/`);
  }

  function triggerCommandPalette() {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        code: 'KeyK',
        metaKey: true,
        bubbles: true,
      }),
    );
  }

  return (
    <header className="sticky top-0 z-50 hidden border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-md md:block">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2 sm:px-6">
        {/* Brand */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <img
            src="/logo-64.png"
            alt="Sumo Sauce"
            className="h-7 w-7 rounded-md object-contain ring-1 ring-white/[0.1] drop-shadow-[0_0_6px_rgba(255,255,255,0.15)]"
          />
          <span className="font-display text-base font-bold tracking-tight text-white">
            Sumo<span className="text-red-500">Sauce</span>
          </span>
        </Link>

        {/* Primary nav links */}
        <nav className="flex items-center gap-0.5" aria-label="Primary navigation">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white/[0.08] text-white'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search trigger */}
        <button
          type="button"
          onClick={triggerCommandPalette}
          className="flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-white/[0.14] hover:text-zinc-300"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search</span>
          <kbd className="ml-1 rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
}
