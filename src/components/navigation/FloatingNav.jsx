import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, Trophy, BarChart3, Calendar, Users, ChevronDown, Swords, Clock, Search } from 'lucide-react';

const navItems = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Basho', path: '/basho', icon: Calendar },
  { name: 'Rikishi', path: '/rikishi', icon: Users },
  { name: 'Rivalries', path: '/rivalries', icon: Swords },
  { name: 'Timeline', path: '/timeline', icon: Clock },
  { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
  { name: 'Search', path: '/search', icon: Search },
];

const analyticsItems = [
  { name: 'Global Analytics', path: '/analytics' },
  { name: 'Kimarite Analytics', path: '/analytics/kimarite' },
  { name: 'Era Analytics', path: '/analytics/eras' },
];

export default function FloatingNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const analyticsRef = useRef(null);
  const location = useLocation();

  // Close analytics dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (analyticsRef.current && !analyticsRef.current.contains(e.target)) {
        setAnalyticsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsOpen(false);
    setAnalyticsOpen(false);
  }, [location.pathname]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <Link to="/" className="text-lg font-bold text-white hover:text-red-400 transition-colors">
          SumoWatch
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-5 md:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                isActive(item.path)
                  ? 'text-red-400 font-medium'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}

          {/* Analytics dropdown */}
          <div className="relative" ref={analyticsRef}>
            <button
              type="button"
              onClick={() => setAnalyticsOpen(!analyticsOpen)}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                isActive('/analytics')
                  ? 'text-red-400 font-medium'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
              <ChevronDown className={`h-3 w-3 transition-transform ${analyticsOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {analyticsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
                >
                  {analyticsItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setAnalyticsOpen(false)}
                      className={`block px-3 py-2 text-sm transition-colors ${
                        location.pathname === item.path
                          ? 'bg-zinc-800 text-red-400'
                          : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
            ⌘K
          </kbd>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-md p-2 text-zinc-400 hover:text-white transition-colors md:hidden"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-zinc-800 bg-zinc-950 md:hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive(item.path)
                      ? 'bg-zinc-800 text-red-400'
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <item.icon className="h-4 w-4 text-zinc-500" />
                  {item.name}
                </Link>
              ))}
              {/* Analytics sub-items */}
              <div className="pl-2 border-l border-zinc-800 ml-3 space-y-1">
                {analyticsItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      location.pathname === item.path
                        ? 'text-red-400'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <BarChart3 className="h-3.5 w-3.5 text-zinc-600" />
                    {item.name}
                  </Link>
                ))}
              </div>
              <div className="px-3 pt-2 text-[10px] text-zinc-600">
                Press <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5">⌘K</kbd> for command palette
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}