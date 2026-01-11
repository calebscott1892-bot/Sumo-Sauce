import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const divisions = [
  { id: 'all', label: 'ALL RANKS', kanji: '全' },
  { id: 'Yokozuna', label: 'YOKOZUNA', kanji: '横綱' },
  { id: 'Ozeki', label: 'OZEKI', kanji: '大関' },
  { id: 'Sekiwake', label: 'SEKIWAKE', kanji: '関脇' },
  { id: 'Komusubi', label: 'KOMUSUBI', kanji: '小結' },
  { id: 'Maegashira', label: 'MAEGASHIRA', kanji: '前頭' },
  { id: 'Juryo', label: 'JURYO', kanji: '十両' },
];

export default function DivisionFilter({ selected, onSelect }) {
  return (
    <div className="bg-zinc-900 border-y border-zinc-800 py-4 -mx-4 px-4">
      <div className="max-w-4xl mx-auto overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {divisions.map((div) => (
            <motion.button
              key={div.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(div.id)}
              className={cn(
                "relative px-6 py-3 font-black text-xs tracking-wider transition-all",
                "flex items-center gap-2 whitespace-nowrap",
                selected === div.id
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              )}
            >
              <span className="text-base">{div.kanji}</span>
              <span>{div.label}</span>
              {selected === div.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400"
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}