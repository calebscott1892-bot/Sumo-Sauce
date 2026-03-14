import React from 'react';
import { motion } from 'framer-motion';

export default function StatsBar({ wins, losses, showNumbers = true }) {
  const total = wins + losses;
  const winPercentage = total > 0 ? (wins / total) * 100 : 50;
  
  return (
    <div className="w-full">
      <div className="mb-1.5 flex justify-between text-xs">
        {showNumbers && (
          <>
            <span className="font-semibold text-emerald-400">{wins}W</span>
            <span className="font-semibold text-rose-400">{losses}L</span>
          </>
        )}
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${winPercentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-l-full"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${100 - winPercentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          className="bg-gradient-to-r from-rose-400 to-rose-500 rounded-r-full"
        />
      </div>
    </div>
  );
}
