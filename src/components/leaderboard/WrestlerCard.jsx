import React, { useState } from 'react';
import { X, Trophy, Award, MapPin, Home, Ruler, Weight, TrendingUp, Star, ShieldCheck, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PremiumBadge } from '@/components/ui/premium';
import FallbackAvatar from '@/components/FallbackAvatar';
import StatsBar from './StatsBar';
import CareerHistory from '../history/CareerHistory';
import WrestlerRatingCard from '../ratings/WrestlerRatingCard';
import PerformanceTrends from '../history/PerformanceTrends';
import WrestlerRivalries from '../history/WrestlerRivalries';
import MatchHistory from '../history/MatchHistory';
import {
  formatVerifiedBasho,
  getImageConfidencePresentation,
  getProfileConfidencePresentation,
  getProvenanceStatusPresentation,
  getVerifiedImageUrl,
  getVerifiedProfileForIdentity,
} from '@/data/verifiedProfiles';

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

  const profile = getVerifiedProfileForIdentity(wrestler.rid || wrestler.rikishiId, wrestler.shikona);
  const verifiedPhoto = getVerifiedImageUrl(profile);
  const trustTone = profile
    ? {
      ...getProfileConfidencePresentation(profile.profileConfidence),
      icon: profile.profileConfidence === 'verified' ? ShieldCheck : ShieldAlert,
    }
    : { label: 'Trust metadata unavailable', detail: '', variant: 'zinc', icon: ShieldAlert };
  const imageTone = profile
    ? getImageConfidencePresentation(profile.imageConfidence)
    : { label: 'No verified image', detail: '', variant: 'zinc' };
  const TrustIcon = trustTone.icon;
  const provenanceTone = profile?.provenanceStatus
    ? getProvenanceStatusPresentation(profile.provenanceStatus)
    : null;
  
  const winRate = wrestler.career_wins && wrestler.career_losses 
    ? ((wrestler.career_wins / (wrestler.career_wins + wrestler.career_losses)) * 100).toFixed(1)
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden border border-white/[0.06] bg-[#0a0a0a] p-0 text-zinc-100 shadow-2xl sm:rounded-2xl">
        {/* Header with rank gradient */}
        <div className={`relative border-b border-white/[0.06] bg-gradient-to-r ${rankColors[wrestler.rank] || 'from-slate-600 to-slate-400'} p-6`}>
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(10,10,10,0.18),rgba(10,10,10,0.72))]" />
          <div className="absolute top-4 right-4 flex gap-2">
            {onToggleFollow && (
              <button 
                onClick={onToggleFollow}
                className="rounded-full bg-white/12 p-1.5 transition-colors hover:bg-white/20"
              >
                <Star className={`w-5 h-5 ${isFollowing ? 'fill-amber-400 text-amber-400' : 'text-white'}`} />
              </button>
            )}
            <button 
              onClick={() => onClose(false)}
              className="rounded-full bg-white/12 p-1.5 transition-colors hover:bg-white/20"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div className="relative flex items-center gap-4">
            <FallbackAvatar
              size="md"
              photoUrl={verifiedPhoto}
              shikona={wrestler.shikona}
              rid={wrestler.rid || wrestler.rikishiId}
              stable={wrestler.stable}
              rank={wrestler.rank}
              className="rounded-2xl ring-white/20"
            />
            <div>
              <h2 className="text-2xl font-bold text-white">{wrestler.shikona}</h2>
              {wrestler.real_name && (
                <p className="text-sm text-white/70">{wrestler.real_name}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full bg-white/18 px-3 py-1 text-sm font-medium text-white backdrop-blur">
                  {wrestler.rank} {wrestler.rank_number ? `#${wrestler.rank_number}` : ''}
                </span>
                {wrestler.side && (
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/80">
                    {wrestler.side}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <PremiumBadge variant={trustTone.variant}>
                  <TrustIcon className="h-3.5 w-3.5" />
                  {trustTone.label}
                </PremiumBadge>
                <PremiumBadge variant={imageTone.variant}>
                  <ImageIcon className="h-3.5 w-3.5" />
                  {imageTone.label}
                </PremiumBadge>
                {provenanceTone ? (
                  <PremiumBadge variant={provenanceTone.variant}>
                    {provenanceTone.label}
                  </PremiumBadge>
                ) : null}
                {profile?.lastVerifiedBasho ? (
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80">
                    Verified through {formatVerifiedBasho(profile.lastVerifiedBasho)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 overflow-x-auto rounded-none border-b border-white/[0.06] bg-white/[0.03] p-1">
            <TabsTrigger value="current" className="text-xs text-zinc-400 data-[state=active]:bg-red-600 data-[state=active]:text-white">
              Stats
            </TabsTrigger>
            <TabsTrigger value="matches" className="text-xs text-zinc-400 data-[state=active]:bg-red-600 data-[state=active]:text-white">
              Matches
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-xs text-zinc-400 data-[state=active]:bg-red-600 data-[state=active]:text-white">
              Trends
            </TabsTrigger>
            <TabsTrigger value="rivalries" className="text-xs text-zinc-400 data-[state=active]:bg-red-600 data-[state=active]:text-white">
              Rivalries
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs text-zinc-400 data-[state=active]:bg-red-600 data-[state=active]:text-white">
              History
            </TabsTrigger>
            <TabsTrigger value="ratings" className="text-xs text-zinc-400 data-[state=active]:bg-red-600 data-[state=active]:text-white">
              Ratings
            </TabsTrigger>
          </TabsList>

          {/* Current Stats Tab */}
          <TabsContent value="current" className="mt-0 max-h-[60vh] space-y-6 overflow-y-auto p-6">
          {/* Current Tournament */}
          {(wrestler.wins !== undefined || wrestler.losses !== undefined) && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <TrendingUp className="w-4 h-4" />
                Current Tournament
              </h3>
              <StatsBar wins={wrestler.wins || 0} losses={wrestler.losses || 0} />
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {wrestler.stable && (
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <Home className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-xs text-zinc-500">Stable</p>
                  <p className="font-medium text-zinc-100">{wrestler.stable}</p>
                </div>
              </div>
            )}
            {wrestler.birthplace && (
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <MapPin className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-xs text-zinc-500">From</p>
                  <p className="font-medium text-zinc-100">{wrestler.birthplace}</p>
                </div>
              </div>
            )}
            {wrestler.height_cm && (
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <Ruler className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-xs text-zinc-500">Height</p>
                  <p className="font-medium text-zinc-100">{wrestler.height_cm} cm</p>
                </div>
              </div>
            )}
            {wrestler.weight_kg && (
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                <Weight className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-xs text-zinc-500">Weight</p>
                  <p className="font-medium text-zinc-100">{wrestler.weight_kg} kg</p>
                </div>
              </div>
            )}
          </div>

          {/* Career Stats */}
          {(wrestler.tournament_titles > 0 || wrestler.special_prizes > 0 || winRate) && (
            <div className="border-t border-white/[0.06] pt-4">
              <h3 className="mb-3 text-sm font-semibold text-zinc-300">Career Achievements</h3>
              <div className="flex flex-wrap gap-3">
                {wrestler.tournament_titles > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-700/30 bg-amber-950/20 px-4 py-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-amber-300">{wrestler.tournament_titles}</span>
                    <span className="text-sm text-amber-200/80">Titles</span>
                  </div>
                )}
                {wrestler.special_prizes > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-blue-700/30 bg-blue-950/20 px-4 py-2">
                    <Award className="w-5 h-5 text-blue-400" />
                    <span className="font-bold text-blue-300">{wrestler.special_prizes}</span>
                    <span className="text-sm text-blue-200/80">Prizes</span>
                  </div>
                )}
                {winRate && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-700/30 bg-emerald-950/20 px-4 py-2">
                    <span className="font-bold text-emerald-300">{winRate}%</span>
                    <span className="text-sm text-emerald-200/80">Win Rate</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Career Record */}
          {wrestler.career_wins !== undefined && wrestler.career_losses !== undefined && (
            <div className="border-t border-white/[0.06] pt-4">
              <h3 className="mb-3 text-sm font-semibold text-zinc-300">Career Record</h3>
              <StatsBar wins={wrestler.career_wins} losses={wrestler.career_losses} />
              <p className="mt-2 text-center text-sm text-zinc-500">
                {wrestler.career_wins} - {wrestler.career_losses}
              </p>
            </div>
          )}
          </TabsContent>

          {/* Match History Tab */}
          <TabsContent value="matches" className="mt-0 max-h-[60vh] overflow-y-auto p-6">
            <MatchHistory wrestler={wrestler} />
          </TabsContent>

          {/* Performance Trends Tab */}
          <TabsContent value="trends" className="mt-0 max-h-[60vh] overflow-y-auto p-6">
            <PerformanceTrends wrestler={wrestler} />
          </TabsContent>

          {/* Rivalries Tab */}
          <TabsContent value="rivalries" className="mt-0 max-h-[60vh] overflow-y-auto p-6">
            <WrestlerRivalries wrestler={wrestler} />
          </TabsContent>

          {/* Career History Tab */}
          <TabsContent value="history" className="mt-0 max-h-[60vh] overflow-y-auto p-6">
            <CareerHistory wrestler={wrestler} />
          </TabsContent>

          {/* Ratings Tab */}
          <TabsContent value="ratings" className="mt-0 max-h-[60vh] overflow-y-auto">
            <WrestlerRatingCard wrestler={wrestler} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
