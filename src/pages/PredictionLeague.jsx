import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Crown, Medal, Award, Copy, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import AdminScoreButton from '../components/predictions/AdminScoreButton';
import { getDisplayNameFromEmail } from '@/api/functions/getUserDisplayName';

export default function PredictionLeague() {
  const urlParams = new URLSearchParams(window.location.search);
  const leagueId = urlParams.get('id');

  const { data: league } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: async () => {
      try {
        const leagues = await api.entities.PredictionLeague.list('-created_date', 200);
        return leagues.find(l => l.id === leagueId);
      } catch (error) {
        console.error('Failed to fetch league:', error);
        return null;
      }
    },
    enabled: !!leagueId,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['league-members', leagueId],
    queryFn: async () => {
      try {
        const allMemberships = await api.entities.LeagueMembership.list('-total_points', 500);
        return allMemberships.filter(m => m.league_id === leagueId);
      } catch (error) {
        console.error('Failed to fetch memberships:', error);
        return [];
      }
    },
    enabled: !!leagueId,
  });

  const { data: predictions = [] } = useQuery({
    queryKey: ['league-predictions', leagueId],
    queryFn: async () => {
      try {
        const allPredictions = await api.entities.TournamentPrediction.list('-created_date', 500);
        return allPredictions.filter(p => p.league_id === leagueId);
      } catch (error) {
        console.error('Failed to fetch predictions:', error);
        return [];
      }
    },
    enabled: !!leagueId,
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => api.auth.me(),
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => api.entities.Tournament.list('-start_date', 100),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      try {
        return await api.entities.User.list('-created_date', 500);
      } catch (error) {
        return [];
      }
    },
  });

  const copyJoinCode = () => {
    navigator.clipboard.writeText(league.join_code);
    toast.success('Join code copied to clipboard!');
  };

  const getRankIcon = (index) => {
    if (index === 0) return <Crown className="w-5 h-5 text-amber-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-zinc-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-700" />;
    return null;
  };

  if (!league) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-black to-purple-950/20 pointer-events-none" />
      
      <div className="relative max-w-5xl mx-auto px-4 py-8">
        <Link to="/PredictionGame">
          <Button variant="ghost" size="sm" className="mb-6 text-zinc-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Predictions
          </Button>
        </Link>

        {/* League Header */}
        <div className="bg-gradient-to-r from-purple-900 via-purple-700 to-purple-900 border-2 border-purple-600 p-8 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">{league.name}</h1>
              {league.description && (
                <p className="text-purple-200 mb-3">{league.description}</p>
              )}
              <div className="flex items-center gap-3">
                <div className="bg-white/10 px-3 py-1 rounded">
                  <span className="text-purple-200 text-sm">{league.member_count || 1} Members</span>
                </div>
                <button
                  onClick={copyJoinCode}
                  className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded flex items-center gap-2 transition-colors"
                >
                  <span className="text-white font-mono font-bold">{league.join_code}</span>
                  <Copy className="w-4 h-4 text-purple-300" />
                </button>
              </div>
            </div>
            <Trophy className="w-16 h-16 text-amber-400" />
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-zinc-900 border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              Leaderboard
            </h2>
            {tournaments.filter(t => t.status === 'completed').length > 0 && (
              <div className="flex gap-2">
                {tournaments.filter(t => t.status === 'completed').slice(0, 3).map(tournament => (
                  <AdminScoreButton key={tournament.id} tournament={tournament} user={user} />
                ))}
              </div>
            )}
          </div>

          {memberships.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">No members yet</div>
          ) : (
            <div className="space-y-2">
              {memberships.map((member, idx) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex items-center gap-4 p-4 rounded ${
                    idx === 0 ? 'bg-gradient-to-r from-amber-900/30 to-amber-800/30 border-2 border-amber-600' :
                    idx === 1 ? 'bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 border border-zinc-600' :
                    idx === 2 ? 'bg-gradient-to-r from-amber-900/20 to-amber-800/20 border border-amber-700' :
                    'bg-zinc-800/30 border border-zinc-700'
                  }`}
                >
                  <div className="w-12 text-center">
                    {getRankIcon(idx) || (
                      <span className="text-2xl font-black text-zinc-600">#{idx + 1}</span>
                    )}
                  </div>

                  <Link to={`/Profile?email=${member.user_email}`} className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                        <span className="text-white font-bold">
                          {getDisplayNameFromEmail(member.user_email, allUsers).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-bold hover:text-purple-400 transition-colors">
                          {getDisplayNameFromEmail(member.user_email, allUsers)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {member.correct_predictions || 0} correct predictions
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="text-right">
                    <div className="text-3xl font-black text-amber-400">
                      {member.total_points || 0}
                    </div>
                    <div className="text-xs text-zinc-500 uppercase">Points</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Predictions Activity */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 mt-8">
          <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-400" />
            Recent Predictions
          </h2>
          {predictions.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">No predictions yet</div>
          ) : (
            <div className="space-y-3">
              {predictions.slice(0, 10).map(pred => {
                const tournament = tournaments.find(t => t.id === pred.tournament_id);
                return (
                  <div key={pred.id} className="bg-zinc-800/50 rounded p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-white font-bold mb-1">{tournament?.name || 'Tournament'}</div>
                        <div className="text-sm text-zinc-400">
                          Predicted winner: <span className="text-white">{pred.predicted_winner}</span>
                        </div>
                      </div>
                      {pred.is_scored && (
                        <div className="text-right">
                          <div className="text-2xl font-black text-amber-400">+{pred.points_earned}</div>
                          <div className="text-xs text-zinc-500">points</div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-zinc-600">
                      by {getDisplayNameFromEmail(pred.user_email, allUsers)} • {pred.is_scored ? 'Scored' : 'Pending'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}