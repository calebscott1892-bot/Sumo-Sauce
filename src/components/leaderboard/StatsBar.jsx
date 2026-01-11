import React from 'react';
import { motion } from 'framer-motion';

export default function StatsBar({ wins, losses, showNumbers = true }) {
  const total = wins + losses;
  const winPercentage = total > 0 ? (wins / total) * 100 : 50;
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1.5">
        {showNumbers && (
          <>
            <span className="text-emerald-600 font-semibold">{wins}W</span>
            <span className="text-rose-500 font-semibold">{losses}L</span>
          </>
        )}
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
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