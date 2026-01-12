import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
      <Input
        type="text"
        placeholder="SEARCH RIKISHI..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-12 pr-10 py-4 bg-zinc-900 border-2 border-zinc-800
                   focus:border-red-600 focus:ring-0 transition-all
                   text-white placeholder:text-zinc-600 font-bold text-sm tracking-wide uppercase"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => onChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1
                       hover:bg-zinc-800 transition-colors rounded"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}