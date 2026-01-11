import React from 'react';
import { Swords, Trophy, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WrestlerRivalries({ wrestler }) {
  // Sample rivalries data - in a real app this would come from a database
  const generateRivalries = () => {
    const commonRivals = [
      { name: 'Terunofuji', record: '12-8', lastMeet: '2024-11', memorable: 'Aki Basho 2024 Championship decider' },
      { name: 'Hoshoryu', record: '15-10', lastMeet: '2024-09', memorable: 'Natsu Basho 2024 playoff match' },
      { name: 'Kirishima', record: '9-11', lastMeet: '2024-07', memorable: 'Haru Basho 2024 Day 13' },
      { name: 'Takakeisho', record: '7-13', lastMeet: '2024-05', memorable: 'Hatsu Basho 2024 final day' },
    ];

    // Return a subset based on wrestler rank
    if (wrestler.rank === 'Yokozuna' || wrestler.rank === 'Ozeki') {
      return commonRivals;
    } else if (wrestler.rank === 'Sekiwake' || wrestler.rank === 'Komusubi') {
      return commonRivals.slice(0, 3);
    } else {
      return commonRivals.slice(0, 2);
    }
  };

  const rivalries = generateRivalries();

  if (rivalries.length === 0) {
    return (
      <div className="text-center py-8 bg-zinc-800/30 rounded">
        <Swords className="w-12 h-12 text-zinc-600 mx-auto mb-2" />
        <p className="text-zinc-500 text-sm">No rivalries data available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Swords className="w-5 h-5 text-red-400" />
        <h3 className="text-lg font-bold text-white">Notable Rivalries</h3>
      </div>

      <div className="space-y-3">
        {rivalries.map((rival, idx) => {
          const [wins, losses] = rival.record.split('-').map(Number);
          const totalMatches = wins + losses;
          const winRate = ((wins / totalMatches) * 100).toFixed(0);
          const isWinning = wins > losses;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-white font-bold text-lg">{rival.name}</h4>
                    {isWinning && <Trophy className="w-4 h-4 text-amber-400" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                    <Calendar className="w-3 h-3" />
                    Last met: {rival.lastMeet}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-2xl font-black ${isWinning ? 'text-green-400' : 'text-red-400'}`}>
                    {rival.record}
                  </div>
                  <div className="text-xs text-zinc-500">W-L</div>
                </div>
              </div>

              {/* Win Rate Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>{wrestler.shikona}</span>
                  <span>{rival.name}</span>
                </div>
                <div className="h-2 bg-zinc-900 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-green-500"
                    style={{ width: `${winRate}%` }}
                  />
                  <div 
                    className="bg-red-500"
                    style={{ width: `${100 - winRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-600 mt-1">
                  <span>{winRate}%</span>
                  <span>{100 - winRate}%</span>
                </div>
              </div>

              {/* Memorable Match */}
              <div className="bg-zinc-900/50 rounded p-2 border-l-2 border-amber-500">
                <div className="text-xs text-zinc-500 mb-1">Memorable Bout</div>
                <div className="text-xs text-zinc-300">{rival.memorable}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="text-center text-xs text-zinc-500 mt-4">
        Total matches: {rivalries.reduce((sum, r) => {
          const [w, l] = r.record.split('-').map(Number);
          return sum + w + l;
        }, 0)}
      </div>
    </div>
  );
}