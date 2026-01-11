import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Trophy, Users, Target, Crown, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import CreateLeagueDialog from '../components/predictions/CreateLeagueDialog';
import JoinLeagueDialog from '../components/predictions/JoinLeagueDialog';
import MakePredictionDialog from '../components/predictions/MakePredictionDialog';

export default function PredictionGame() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [predictionDialog, setPredictionDialog] = useState({ open: false, tournament: null, league: null });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => api.auth.me(),
  });

  const { data: memberships = [], refetch: refetchMemberships } = useQuery({
    queryKey: ['my-memberships', user?.email],
    queryFn: async () => {
      try {
        const allMemberships = await api.entities.LeagueMembership.list('-created_date', 500);
        return allMemberships.filter(m => m.user_email === user.email);
      } catch (error) {
        console.error('Failed to fetch memberships:', error);
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const { data: allLeagues = [] } = useQuery({
    queryKey: ['all-leagues'],
    queryFn: () => api.entities.PredictionLeague.list('-created_date', 200),
  });

  const myLeagues = allLeagues.filter(league => 
    memberships.some(m => m.league_id === league.id)
  );

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => api.entities.Tournament.list('-start_date', 100),
  });

  const upcomingTournaments = tournaments.filter(t => t.status === 'upcoming');

  const { data: myPredictions = [] } = useQuery({
    queryKey: ['my-predictions', user?.email],
    queryFn: async () => {
      try {
        const allPredictions = await api.entities.TournamentPrediction.list('-created_date', 500);
        return allPredictions.filter(p => p.user_email === user.email);
      } catch (error) {
        console.error('Failed to fetch predictions:', error);
        return [];
      }
    },
    enabled: !!user?.email,
  });

  // Get predictions grouped by tournament and league
  const getPredictionForTournament = (tournamentId, leagueId) => {
    return myPredictions.find(p => 
      p.tournament_id === tournamentId && p.league_id === leagueId
    );
  };

  const globalRankings = memberships
    .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-black to-purple-950/20 pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        <Link to="/Leaderboard">
          <Button variant="ghost" size="sm" className="mb-6 text-zinc-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Button>
        </Link>

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-purple-700 to-purple-900 border-2 border-purple-600 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-purple-300 text-sm font-black tracking-[0.2em] uppercase mb-1">
                FANTASY SUMO
              </div>
              <h1 className="text-5xl font-black text-white tracking-tight leading-none mb-2">
                FANTASY DOJO
              </h1>
              <p className="text-purple-200">Compete with friends and predict tournament outcomes</p>
            </div>
            <Target className="w-20 h-20 text-purple-300 opacity-50" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-red-600 hover:bg-red-700 h-16 text-lg font-black"
          >
            <Plus className="w-5 h-5 mr-2" />
            CREATE LEAGUE
          </Button>
          <Button
            onClick={() => setJoinDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 h-16 text-lg font-black"
          >
            <Users className="w-5 h-5 mr-2" />
            JOIN LEAGUE
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* My Leagues */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6">
              <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" />
                My Leagues
              </h2>

              {myLeagues.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500 mb-4">You're not in any leagues yet</p>
                  <Button onClick={() => setCreateDialogOpen(true)} className="bg-red-600 hover:bg-red-700">
                    Create Your First League
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {myLeagues.map(league => {
                    const membership = memberships.find(m => m.league_id === league.id);
                    return (
                      <Link key={league.id} to={`/PredictionLeague?id=${league.id}`}>
                        <motion.div
                          whileHover={{ x: 4 }}
                          className="bg-zinc-800/50 border border-zinc-700 p-5 hover:bg-zinc-800 transition-all cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-xl font-bold text-white mb-1">{league.name}</h3>
                              {league.description && (
                                <p className="text-sm text-zinc-400">{league.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-black text-amber-400">{membership?.total_points || 0}</div>
                              <div className="text-xs text-zinc-500 uppercase">Points</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-zinc-500">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {league.member_count || 1} members
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              {membership?.correct_predictions || 0} correct
                            </div>
                            <div className="px-2 py-1 bg-zinc-700 rounded text-xs font-mono">
                              {league.join_code}
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming Tournaments */}
            <div className="bg-zinc-900 border border-zinc-800 p-6">
              <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-green-400" />
                Make Predictions
              </h2>

              {upcomingTournaments.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  No upcoming tournaments
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingTournaments.map(tournament => (
                    <div key={tournament.id} className="bg-zinc-800/50 border border-zinc-700 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-white font-bold">{tournament.name}</h3>
                          <p className="text-xs text-zinc-500">
                            {format(new Date(tournament.start_date), 'MMMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      {myLeagues.length > 0 ? (
                        <div className="space-y-2">
                          {myLeagues.map(league => {
                            const prediction = getPredictionForTournament(tournament.id, league.id);
                            return (
                              <div key={league.id} className="flex items-center justify-between">
                                <span className="text-sm text-zinc-400">{league.name}</span>
                                <Button
                                  size="sm"
                                  onClick={() => setPredictionDialog({ open: true, tournament, league })}
                                  disabled={!!prediction}
                                  className={prediction ? 'bg-zinc-700' : 'bg-green-600 hover:bg-green-700'}
                                >
                                  {prediction ? '✓ Predicted' : 'Predict'}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-600">Join a league to make predictions</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* My Stats */}
            <div className="bg-zinc-900 border border-zinc-800 p-6">
              <h3 className="text-lg font-black text-white mb-4">My Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Total Points</span>
                  <span className="text-2xl font-black text-amber-400">
                    {memberships.reduce((sum, m) => sum + (m.total_points || 0), 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Correct Predictions</span>
                  <span className="text-xl font-bold text-green-400">
                    {memberships.reduce((sum, m) => sum + (m.correct_predictions || 0), 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Leagues Joined</span>
                  <span className="text-xl font-bold text-blue-400">{myLeagues.length}</span>
                </div>
              </div>
            </div>

            {/* Public Leagues */}
            <div className="bg-zinc-900 border border-zinc-800 p-6">
              <h3 className="text-lg font-black text-white mb-4">Public Leagues</h3>
              <div className="space-y-2">
                {allLeagues.filter(l => l.is_public && !myLeagues.find(ml => ml.id === l.id)).slice(0, 5).map(league => (
                  <div key={league.id} className="bg-zinc-800/50 p-3 rounded">
                    <div className="text-white text-sm font-bold mb-1">{league.name}</div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{league.member_count || 1} members</span>
                      <span className="font-mono">{league.join_code}</span>
                    </div>
                  </div>
                ))}
                {allLeagues.filter(l => l.is_public).length === 0 && (
                  <p className="text-zinc-600 text-sm">No public leagues available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateLeagueDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        user={user}
        onSuccess={refetchMemberships}
      />

      <JoinLeagueDialog
        open={joinDialogOpen}
        onClose={() => setJoinDialogOpen(false)}
        user={user}
        onSuccess={refetchMemberships}
      />

      <MakePredictionDialog
        open={predictionDialog.open}
        onClose={() => setPredictionDialog({ open: false, tournament: null, league: null })}
        tournament={predictionDialog.tournament}
        league={predictionDialog.league}
        user={user}
        onSuccess={refetchMemberships}
      />
    </div>
  );
}