import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Award, MapPin, Home, Ruler, Weight, Calendar, TrendingUp, Star, History, BookOpen, Users } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatsBar from './StatsBar';
import CareerHistory from '../history/CareerHistory';
import WrestlerRatingCard from '../ratings/WrestlerRatingCard';
import PerformanceTrends from '../history/PerformanceTrends';
import WrestlerRivalries from '../history/WrestlerRivalries';
import MatchHistory from '../history/MatchHistory';

const rankColors = {
  Yokozuna: 'from-amber-500 to-yellow-400',
  Ozeki: 'from-purple-600 to-purple-400',
  Sekiwake: 'from-blue-600 to-blue-400',
  Komusubi: 'from-cyan-600 to-cyan-400',
  Maegashira: 'from-slate-600 to-slate-400',
  Juryo: 'from-emerald-600 to-emerald-400',
  Makushita: 'from-orange-600 to-orange-400',
};

export default function WrestlerCard({ wrestler, open, onClose, isFollowing = false, onToggleFollow }) {
  const [activeTab, setActiveTab] = useState('current');
  
  if (!wrestler) return null;
  
  const winRate = wrestler.career_wins && wrestler.career_losses 
    ? ((wrestler.career_wins / (wrestler.career_wins + wrestler.career_losses)) * 100).toFixed(1)
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-gradient-to-b from-slate-50 to-white border-0 rounded-2xl">
        {/* Header with rank gradient */}
        <div className={`bg-gradient-to-r ${rankColors[wrestler.rank] || 'from-slate-600 to-slate-400'} p-6 relative`}>
          <div className="absolute top-4 right-4 flex gap-2">
            {onToggleFollow && (
              <button 
                onClick={onToggleFollow}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <Star className={`w-5 h-5 ${isFollowing ? 'fill-amber-400 text-amber-400' : 'text-white'}`} />
              </button>
            )}
            <button 
              onClick={() => onClose(false)}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden border-2 border-white/30">
              {wrestler.image_url ? (
                <img src={wrestler.image_url} alt={wrestler.shikona} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-serif text-white">{wrestler.shikona?.charAt(0)}</span>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{wrestler.shikona}</h2>
              {wrestler.real_name && (
                <p className="text-white/70 text-sm">{wrestler.real_name}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-white text-sm font-medium">
                  {wrestler.rank} {wrestler.rank_number ? `#${wrestler.rank_number}` : ''}
                </span>
                {wrestler.side && (
                  <span className="px-2 py-1 bg-white/10 rounded-full text-white/80 text-xs">
                    {wrestler.side}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-zinc-900 border-b border-zinc-800 rounded-none grid grid-cols-6 overflow-x-auto">
            <TabsTrigger value="current" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-xs">
              Stats
            </TabsTrigger>
            <TabsTrigger value="matches" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-xs">
              Matches
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-xs">
              Trends
            </TabsTrigger>
            <TabsTrigger value="rivalries" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-xs">
              Rivalries
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-xs">
              History
            </TabsTrigger>
            <TabsTrigger value="ratings" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-xs">
              Ratings
            </TabsTrigger>
          </TabsList>

          {/* Current Stats Tab */}
          <TabsContent value="current" className="p-6 space-y-6 max-h-[60vh] overflow-y-auto mt-0">
          {/* Current Tournament */}
          {(wrestler.wins !== undefined || wrestler.losses !== undefined) && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Current Tournament
              </h3>
              <StatsBar wins={wrestler.wins || 0} losses={wrestler.losses || 0} />
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {wrestler.stable && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <Home className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className="text-xs text-slate-500">Stable</p>
                  <p className="font-medium text-slate-800">{wrestler.stable}</p>
                </div>
              </div>
            )}
            {wrestler.birthplace && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <MapPin className="w-5 h-5 text-rose-500" />
                <div>
                  <p className="text-xs text-slate-500">From</p>
                  <p className="font-medium text-slate-800">{wrestler.birthplace}</p>
                </div>
              </div>
            )}
            {wrestler.height_cm && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <Ruler className="w-5 h-5 text-cyan-500" />
                <div>
                  <p className="text-xs text-slate-500">Height</p>
                  <p className="font-medium text-slate-800">{wrestler.height_cm} cm</p>
                </div>
              </div>
            )}
            {wrestler.weight_kg && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <Weight className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-xs text-slate-500">Weight</p>
                  <p className="font-medium text-slate-800">{wrestler.weight_kg} kg</p>
                </div>
              </div>
            )}
          </div>

          {/* Career Stats */}
          {(wrestler.tournament_titles > 0 || wrestler.special_prizes > 0 || winRate) && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-slate-500 mb-3">Career Achievements</h3>
              <div className="flex flex-wrap gap-3">
                {wrestler.tournament_titles > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <span className="font-bold text-amber-700">{wrestler.tournament_titles}</span>
                    <span className="text-amber-600 text-sm">Titles</span>
                  </div>
                )}
                {wrestler.special_prizes > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl border border-purple-200">
                    <Award className="w-5 h-5 text-purple-500" />
                    <span className="font-bold text-purple-700">{wrestler.special_prizes}</span>
                    <span className="text-purple-600 text-sm">Prizes</span>
                  </div>
                )}
                {winRate && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="font-bold text-emerald-700">{winRate}%</span>
                    <span className="text-emerald-600 text-sm">Win Rate</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Career Record */}
          {wrestler.career_wins !== undefined && wrestler.career_losses !== undefined && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-slate-500 mb-3">Career Record</h3>
              <StatsBar wins={wrestler.career_wins} losses={wrestler.career_losses} />
              <p className="text-center text-sm text-slate-500 mt-2">
                {wrestler.career_wins} - {wrestler.career_losses}
              </p>
            </div>
          )}
          </TabsContent>

          {/* Match History Tab */}
          <TabsContent value="matches" className="p-6 max-h-[60vh] overflow-y-auto mt-0">
            <MatchHistory wrestler={wrestler} />
          </TabsContent>

          {/* Performance Trends Tab */}
          <TabsContent value="trends" className="p-6 max-h-[60vh] overflow-y-auto mt-0">
            <PerformanceTrends wrestler={wrestler} />
          </TabsContent>

          {/* Rivalries Tab */}
          <TabsContent value="rivalries" className="p-6 max-h-[60vh] overflow-y-auto mt-0">
            <WrestlerRivalries wrestler={wrestler} />
          </TabsContent>

          {/* Career History Tab */}
          <TabsContent value="history" className="p-6 max-h-[60vh] overflow-y-auto mt-0">
            <CareerHistory wrestler={wrestler} />
          </TabsContent>

          {/* Ratings Tab */}
          <TabsContent value="ratings" className="max-h-[60vh] overflow-y-auto mt-0">
            <WrestlerRatingCard wrestler={wrestler} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}