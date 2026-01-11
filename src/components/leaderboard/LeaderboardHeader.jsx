import React from 'react';
import { motion } from 'framer-motion';

export default function LeaderboardHeader({ totalWrestlers, activeTournament }) {
  return (
    <div className="relative mb-8">
      {/* ESPN-style bold header */}
      <div className="bg-gradient-to-r from-black via-red-950 to-black border-b-4 border-red-600 py-8 px-6 -mx-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-end gap-4"
          >
            <div>
              <div className="text-red-500 text-sm font-black tracking-[0.2em] uppercase mb-1">
                LIVE RANKINGS
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-none">
                BANZUKE
              </h1>
              <div className="text-gray-400 text-sm mt-2 font-medium uppercase tracking-wide">
                相撲番付 • JAPAN SUMO ASSOCIATION
              </div>
            </div>
          </motion.div>
          
          {/* Stats bar */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-6 mt-6 text-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-8 bg-red-600"></div>
              <div>
                <div className="text-4xl font-black text-white leading-none">{totalWrestlers}</div>
                <div className="text-gray-400 text-xs uppercase font-bold tracking-wide">Wrestlers</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-8 bg-amber-500"></div>
              <div>
                <div className="text-lg font-black text-white leading-tight">{activeTournament}</div>
                <div className="text-gray-400 text-xs uppercase font-bold tracking-wide">Tournament</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}