import React, { useState } from 'react';
import { Calendar, Trophy, Award, Zap, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MatchHistory({ wrestler }) {
  const [filterBasho, setFilterBasho] = useState('all');
  const [filterOutcome, setFilterOutcome] = useState('all');

  // Generate match history data
  const generateMatchHistory = () => {
    const currentYear = new Date().getFullYear();
    const bashos = ['Hatsu', 'Haru', 'Natsu', 'Nagoya', 'Aki', 'Kyushu'];
    const kimarite = ['Yorikiri', 'Oshidashi', 'Hatakikomi', 'Tsukiotoshi', 'Uwatenage', 'Kotenage', 'Shitatenage'];
    const opponents = ['Terunofuji', 'Hoshoryu', 'Kirishima', 'Takakeisho', 'Daieisho', 'Wakamotoharu', 'Abi', 'Mitakeumi', 'Shodai', 'Tobizaru'];
    
    const matches = [];
    
    // Generate last 30 matches across recent bashos
    for (let i = 0; i < 30; i++) {
      const bashoIdx = Math.floor(i / 15);
      const year = currentYear - Math.floor(bashoIdx / 6);
      const bashoName = bashos[(6 - (bashoIdx % 6)) % 6];
      const day = 15 - (i % 15);
      
      const outcome = Math.random() > 0.45 ? 'win' : 'loss';
      const opponent = opponents[Math.floor(Math.random() * opponents.length)];
      const technique = outcome === 'win' ? kimarite[Math.floor(Math.random() * kimarite.length)] : null;
      
      matches.push({
        id: i,
        basho: `${bashoName} ${year}`,
        day: `Day ${day}`,
        date: `${year}-${(6 - (bashoIdx % 6) + 1) * 2 - 1}-${day}`,
        opponent,
        outcome,
        technique,
        isPlayoff: day === 15 && Math.random() > 0.9,
        isTitleDecider: day === 15 && Math.random() > 0.85,
      });
    }
    
    return matches;
  };

  const allMatches = generateMatchHistory();
  
  const filteredMatches = allMatches.filter(match => {
    const bashoMatch = filterBasho === 'all' || match.basho.includes(filterBasho);
    const outcomeMatch = filterOutcome === 'all' || match.outcome === filterOutcome;
    return bashoMatch && outcomeMatch;
  });

  const stats = {
    total: filteredMatches.length,
    wins: filteredMatches.filter(m => m.outcome === 'win').length,
    losses: filteredMatches.filter(m => m.outcome === 'loss').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-white">Match History</h3>
        </div>
        <div className="text-sm text-zinc-500">
          {stats.wins}W - {stats.losses}L ({((stats.wins / stats.total) * 100).toFixed(0)}%)
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterBasho} onValueChange={setFilterBasho}>
          <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="All Tournaments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tournaments</SelectItem>
            <SelectItem value="Hatsu">Hatsu</SelectItem>
            <SelectItem value="Haru">Haru</SelectItem>
            <SelectItem value="Natsu">Natsu</SelectItem>
            <SelectItem value="Nagoya">Nagoya</SelectItem>
            <SelectItem value="Aki">Aki</SelectItem>
            <SelectItem value="Kyushu">Kyushu</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterOutcome} onValueChange={setFilterOutcome}>
          <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
            <SelectValue placeholder="All Results" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="win">Wins</SelectItem>
            <SelectItem value="loss">Losses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Match List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredMatches.map((match, idx) => (
          <motion.div
            key={match.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={`border rounded-lg p-3 ${
              match.outcome === 'win'
                ? 'bg-green-900/20 border-green-700/50'
                : 'bg-red-900/20 border-red-700/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-zinc-500 font-bold">{match.basho}</span>
                  <span className="text-xs text-zinc-600">•</span>
                  <span className="text-xs text-zinc-500">{match.day}</span>
                  {match.isPlayoff && (
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                      PLAYOFF
                    </span>
                  )}
                  {match.isTitleDecider && (
                    <Trophy className="w-3 h-3 text-amber-400" />
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{wrestler.shikona}</span>
                  <span className="text-zinc-600">vs</span>
                  <span className="text-white font-bold">{match.opponent}</span>
                </div>

                {match.technique && (
                  <div className="flex items-center gap-1 mt-2">
                    <Zap className="w-3 h-3 text-blue-400" />
                    <span className="text-xs text-blue-400">{match.technique}</span>
                  </div>
                )}
              </div>

              <div className={`text-right ${
                match.outcome === 'win' ? 'text-green-400' : 'text-red-400'
              }`}>
                <div className="text-2xl font-black uppercase">
                  {match.outcome === 'win' ? 'W' : 'L'}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredMatches.length === 0 && (
        <div className="text-center py-8 text-zinc-500">
          No matches found with current filters
        </div>
      )}

      <div className="text-center text-xs text-zinc-600 mt-4 pt-4 border-t border-zinc-800">
        Showing {filteredMatches.length} of {allMatches.length} matches
      </div>
    </div>
  );
}