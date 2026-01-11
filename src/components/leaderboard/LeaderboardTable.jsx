import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Star as StarIcon, Flame, TrendingUp } from 'lucide-react';
import StatsBar from './StatsBar';
import { cn } from '@/lib/utils';

const rankConfig = {
  Yokozuna: { 
    color: 'text-amber-400', 
    bg: 'bg-gradient-to-r from-amber-900/20 to-yellow-900/20',
    border: 'border-l-amber-500',
    icon: Crown,
    accent: 'bg-amber-500'
  },
  Ozeki: { 
    color: 'text-purple-400', 
    bg: 'bg-gradient-to-r from-purple-900/20 to-fuchsia-900/20',
    border: 'border-l-purple-500',
    icon: StarIcon,
    accent: 'bg-purple-500'
  },
  Sekiwake: { 
    color: 'text-blue-400', 
    bg: 'bg-gradient-to-r from-blue-900/20 to-indigo-900/20',
    border: 'border-l-blue-500',
    icon: Flame,
    accent: 'bg-blue-500'
  },
  Komusubi: { 
    color: 'text-cyan-400', 
    bg: 'bg-cyan-900/10',
    border: 'border-l-cyan-600',
    icon: null,
    accent: 'bg-cyan-600'
  },
  Maegashira: { 
    color: 'text-zinc-400', 
    bg: 'bg-zinc-900/30',
    border: 'border-l-zinc-700',
    icon: null,
    accent: 'bg-zinc-700'
  },
  Juryo: { 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-900/10',
    border: 'border-l-emerald-600',
    icon: null,
    accent: 'bg-emerald-600'
  },
  Makushita: { 
    color: 'text-orange-400', 
    bg: 'bg-orange-900/10',
    border: 'border-l-orange-600',
    icon: null,
    accent: 'bg-orange-600'
  },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function LeaderboardTable({ wrestlers, onSelect, compareMode = false, selectedForCompare = [], followedWrestlers = [] }) {
  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  if (!wrestlers?.length) {
    return (
      <div className="text-center py-20 bg-zinc-900/50 border border-zinc-800">
        <div className="w-20 h-20 mx-auto mb-4 bg-zinc-800 flex items-center justify-center">
          <Trophy className="w-10 h-10 text-zinc-600" />
        </div>
        <h3 className="text-xl font-black text-zinc-400 uppercase tracking-wide">No wrestlers found</h3>
        <p className="text-zinc-500 mt-2 text-sm">Import data to see the leaderboard</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-1"
    >
      {wrestlers.map((wrestler, index) => {
        const displayRank = wrestler.displayRank || wrestler.current_rank || wrestler.rank || 'Maegashira';
        const config = rankConfig[displayRank] || rankConfig.Maegashira;
        const Icon = config.icon;
        const photoUrl = wrestler.photoUrl || wrestler.official_image_url || wrestler.image?.url || wrestler.imageUrl || wrestler.image_url;
        const wins = wrestler.displayWins ?? wrestler.wins ?? 0;
        const losses = wrestler.displayLosses ?? wrestler.losses ?? 0;
        
        return (
          <motion.div
            key={wrestler.id}
            variants={item}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onSelect(wrestler)}
            className={cn(
              "relative border-l-4 bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 cursor-pointer transition-all",
              config.border,
              compareMode && Array.isArray(selectedForCompare) && selectedForCompare.includes(wrestler.id) && "ring-2 ring-red-500 bg-red-900/20"
            )}
          >
            <div className="flex items-center gap-4 p-4">
              {/* Rank Badge - ESPN style */}
              <div className="flex items-center gap-3">
                <div className="w-14 text-right">
                  <div className="text-3xl font-black text-white leading-none">
                    {index + 1}
                  </div>
                </div>
                <div className={cn("w-1 h-12", config.accent)} />
              </div>

              {/* Avatar */}
              <div className="w-16 h-16 overflow-hidden bg-zinc-800 flex items-center justify-center relative ring-2 ring-zinc-700">
                {photoUrl ? (
                  <img 
                    src={photoUrl} 
                    alt={wrestler.shikona || 'Wrestler'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className={cn(
                    "w-full h-full flex items-center justify-center",
                    photoUrl ? "hidden" : "flex",
                    "bg-gradient-to-br from-zinc-700 to-zinc-800"
                  )}
                  style={{ display: photoUrl ? 'none' : 'flex' }}
                >
                  <span className="text-2xl font-black text-white">
                    {getInitials(wrestler.shikona)}
                  </span>
                </div>
                {Array.isArray(followedWrestlers) && followedWrestlers.includes(wrestler.id) && (
                  <div className="absolute top-0 left-0 bg-amber-500 p-1">
                    <StarIcon className="w-3 h-3 text-black fill-black" />
                  </div>
                )}
                {Icon && (
                  <div className="absolute top-0 right-0 bg-black/80 p-1">
                    <Icon className={cn("w-3 h-3", config.color)} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-xl text-white truncate tracking-tight">
                  {wrestler.shikona || 'Unknown'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-xs font-black uppercase tracking-wider",
                    config.color
                  )}>
                    {displayRank}
                  </span>
                  {(wrestler.displayDivision || wrestler.current_division || wrestler.division) && (
                    <span className="text-xs text-zinc-500 font-bold">
                      {wrestler.displayDivision || wrestler.current_division || wrestler.division}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats - ESPN score style */}
              <div className="hidden md:flex items-center gap-4">
                {(wins > 0 || losses > 0) ? (
                  <div className="flex items-center gap-2 bg-black/50 px-4 py-2">
                    <div className="text-center">
                      <div className="text-2xl font-black text-green-400 leading-none">{wins}</div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase">W</div>
                    </div>
                    <div className="text-zinc-700 font-black">-</div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-red-400 leading-none">{losses}</div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase">L</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-zinc-600 text-xl font-black px-4">–</div>
                )}

                {(wrestler.tournament_titles || 0) > 0 && (
                  <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-2 border border-amber-500/30">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="font-black text-amber-400 text-lg">{wrestler.tournament_titles}</span>
                  </div>
                )}
              </div>

              {/* Mobile Record */}
              <div className="md:hidden">
                {(wins > 0 || losses > 0) ? (
                  <div className="text-right">
                    <div className="text-sm font-black text-white">
                      {wins}-{losses}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase font-bold">W-L</div>
                  </div>
                ) : (
                  <div className="text-zinc-600 text-xl font-black">–</div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}