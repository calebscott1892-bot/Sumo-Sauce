import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search shikona or rikishi id',
  helperText = '',
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.015] p-4 sm:p-5">
      <label htmlFor="leaderboard-search" className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Search
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
        <Input
          id="leaderboard-search"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 rounded-xl border-white/[0.08] bg-white/[0.03] pl-12 pr-12 text-sm text-white placeholder:text-zinc-600 focus-visible:border-red-600/50 focus-visible:ring-1 focus-visible:ring-red-600/30"
        />
        <AnimatePresence>
          {value && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => onChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
              aria-label="Clear leaderboard search"
            >
              <X className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      {helperText ? (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500">{helperText}</p>
      ) : null}
    </div>
  );
}
