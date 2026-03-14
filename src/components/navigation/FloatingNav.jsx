import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, Home, Trophy, BarChart3, Calendar, Users,
  Swords, Clock, Search, TrendingUp, Compass
} from 'lucide-react';

const navItems = [
  { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  { name: 'Search', path: '/search', icon: Search },
  { name: 'Tournament Hub', path: '/basho', icon: Calendar },
  { name: 'Rikishi Directory', path: '/rikishi', icon: Users },
  { name: 'Rivalries', path: '/rivalries', icon: Swords },
  { name: 'Timeline', path: '/timeline', icon: Clock },
  { name: 'Global Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Kimarite Analytics', path: '/analytics/kimarite', icon: TrendingUp },
  { name: 'Era Analytics', path: '/analytics/eras', icon: Compass },
];

export default function FloatingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const location = useLocation();

  // Close on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Floating controls — top right */}
      <div className="fixed right-4 top-4 z-50 flex items-center gap-2 sm:right-6 sm:top-6">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/90 text-zinc-300 shadow-lg shadow-black/40 ring-1 ring-white/10 backdrop-blur-sm transition-all hover:bg-white/[0.06] hover:text-white hover:ring-white/20"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Link
          to="/search"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/90 text-zinc-300 shadow-lg shadow-black/40 ring-1 ring-white/10 backdrop-blur-sm transition-all hover:bg-white/[0.06] hover:text-white hover:ring-white/20"
          aria-label="Open search"
        >
          <Search className="h-5 w-5" />
        </Link>
      </div>

      {/* Overlay + Side Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Side panel */}
            <motion.nav
              ref={panelRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-[70] flex h-full w-72 flex-col border-l border-white/[0.06] bg-black shadow-2xl shadow-black/50 sm:w-80"
              aria-label="Navigation menu"
            >
              {/* Red header bar */}
              <div className="flex items-center justify-between border-b border-red-700/50 bg-gradient-to-r from-red-700 to-red-600 px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <img src="/logo-64.png" alt="SumoWatch" className="h-8 w-8 drop-shadow-lg" />
                  <span className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white">
                    Navigation
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Nav links */}
              <div className="flex-1 overflow-y-auto py-2">
                {/* Home link */}
                <Link
                  to="/"
                  onClick={() => setIsOpen(false)}
                  className={`mx-2 mb-1 flex items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                    location.pathname === '/'
                      ? 'bg-red-600/15 text-red-400'
                      : 'text-zinc-300 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <Home className="h-[18px] w-[18px] shrink-0 opacity-70" />
                  Home
                </Link>

                <div className="mx-4 my-2 h-px bg-white/[0.06]" />

                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`mx-2 mb-0.5 flex items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                      isActive(item.path)
                        ? 'bg-red-600/15 text-red-400'
                        : 'text-zinc-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0 opacity-70" />
                    {item.name}
                  </Link>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-white/[0.06] px-5 py-4">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Press <kbd className="ml-1 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">⌘K</kbd></span>
                  <div className="flex items-center gap-1.5">
                    <img src="/logo-64.png" alt="" className="h-4 w-4" />
                    <span className="font-display text-[10px] uppercase tracking-wider text-zinc-600">SumoWatch</span>
                  </div>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
