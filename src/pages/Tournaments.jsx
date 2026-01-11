import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Trophy, MapPin, Users, TrendingUp, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DailyResultsBreakdown from '../components/tournament/DailyResultsBreakdown';
import WinLossDistribution from '../components/tournament/WinLossDistribution';
import MatchOutcomeHeatmap from '../components/tournament/MatchOutcomeHeatmap';

export default function Tournaments() {
  const [selectedTournament, setSelectedTournament] = useState(null);

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => api.entities.Tournament.list('-start_date', 100),
  });

  const upcomingTournaments = tournaments.filter(t => t.status === 'upcoming');
  const inProgressTournaments = tournaments.filter(t => t.status === 'in_progress');
  const completedTournaments = tournaments.filter(t => t.status === 'completed');

  const bashoLocations = {
    'Hatsu': 'Tokyo (Ryogoku Kokugikan)',
    'Haru': 'Osaka (Edion Arena)',
    'Natsu': 'Tokyo (Ryogoku Kokugikan)',
    'Nagoya': 'Nagoya (Dolphins Arena)',
    'Aki': 'Tokyo (Ryogoku Kokugikan)',
    'Kyushu': 'Fukuoka (Fukuoka Kokusai Center)'
  };

  const TournamentCard = ({ tournament, status }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={() => setSelectedTournament(tournament)}
      className="bg-zinc-900 border border-zinc-800 p-6 cursor-pointer hover:border-red-600 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-black text-white mb-1">{tournament.name}</h3>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <MapPin className="w-4 h-4" />
            {tournament.location || bashoLocations[tournament.basho]}
          </div>
        </div>
        <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${
          status === 'upcoming' ? 'bg-blue-900/30 text-blue-400 border border-blue-700' :
          status === 'in_progress' ? 'bg-red-900/30 text-red-400 border border-red-700' :
          'bg-zinc-800 text-zinc-400 border border-zinc-700'
        }`}>
          {status.replace('_', ' ')}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm mb-4">
        <div className="flex items-center gap-1 text-zinc-400">
          <Calendar className="w-4 h-4" />
          {format(new Date(tournament.start_date), 'MMM d')} - {format(new Date(tournament.end_date), 'MMM d, yyyy')}
        </div>
      </div>

      {tournament.winner && (
        <div className="bg-amber-900/20 border border-amber-700 rounded p-3 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-xs text-amber-600 uppercase font-bold">Champion</div>
            <div className="text-white font-black">{tournament.winner}</div>
            {tournament.winner_record && (
              <div className="text-xs text-zinc-500">{tournament.winner_record}</div>
            )}
          </div>
        </div>
      )}

      {tournament.notable_upsets && tournament.notable_upsets.length > 0 && (
        <div className="mt-3 text-xs text-zinc-500">
          {tournament.notable_upsets.length} notable upset{tournament.notable_upsets.length > 1 ? 's' : ''}
        </div>
      )}
    </motion.div>
  );

  if (selectedTournament) {
    return (
      <TournamentDetail 
        tournament={selectedTournament} 
        onBack={() => setSelectedTournament(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-black to-red-950/20 pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        <Link to="/Leaderboard">
          <Button variant="ghost" size="sm" className="mb-6 text-zinc-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-12 h-12 text-red-500" />
            <h1 className="text-5xl font-black text-white uppercase tracking-tight">
              本場所
            </h1>
            <Trophy className="w-12 h-12 text-red-500" />
          </div>
          <p className="text-zinc-400 text-lg font-bold uppercase tracking-wider">Grand Tournaments</p>
          <p className="text-zinc-600 mt-2">Six annual tournaments determining sumo supremacy</p>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-20 text-zinc-500">Loading tournaments...</div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-zinc-900 mb-8 w-full md:w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({upcomingTournaments.length})</TabsTrigger>
              <TabsTrigger value="in_progress">Live ({inProgressTournaments.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedTournaments.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {tournaments.map(tournament => (
                <TournamentCard key={tournament.id} tournament={tournament} status={tournament.status} />
              ))}
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingTournaments.map(tournament => (
                <TournamentCard key={tournament.id} tournament={tournament} status="upcoming" />
              ))}
              {upcomingTournaments.length === 0 && (
                <div className="text-center py-12 text-zinc-500">No upcoming tournaments</div>
              )}
            </TabsContent>

            <TabsContent value="in_progress" className="space-y-4">
              {inProgressTournaments.map(tournament => (
                <TournamentCard key={tournament.id} tournament={tournament} status="in_progress" />
              ))}
              {inProgressTournaments.length === 0 && (
                <div className="text-center py-12 text-zinc-500">No tournaments in progress</div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedTournaments.map(tournament => (
                <TournamentCard key={tournament.id} tournament={tournament} status="completed" />
              ))}
              {completedTournaments.length === 0 && (
                <div className="text-center py-12 text-zinc-500">No completed tournaments</div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function TournamentDetail({ tournament, onBack }) {
  const [selectedWrestler, setSelectedWrestler] = useState(null);
  const { data: wrestlers = [] } = useQuery({
    queryKey: ['wrestlers'],
    queryFn: () => api.entities.Wrestler.list('-rank', 500),
  });

  const handleWrestlerClick = (wrestlerName) => {
    const wrestler = wrestlers.find(w => w.shikona === wrestlerName);
    if (wrestler) {
      setSelectedWrestler(wrestler);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-black to-red-950/20 pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-6 text-zinc-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tournaments
        </Button>

        <div className="bg-gradient-to-r from-red-900 via-red-700 to-red-900 border-2 border-red-600 p-8 mb-8">
          <h1 className="text-4xl font-black text-white mb-2">{tournament.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-red-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {format(new Date(tournament.start_date), 'MMMM d')} - {format(new Date(tournament.end_date), 'MMMM d, yyyy')}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {tournament.location || 'Tokyo'}
            </div>
            {tournament.attendance && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {tournament.attendance.toLocaleString()} attendees
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Winner */}
          {tournament.winner && (
            <div className="bg-zinc-900 border-2 border-amber-600 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-6 h-6 text-amber-400" />
                <h2 className="text-xl font-black text-white">Champion</h2>
              </div>
              <div className="text-3xl font-black text-amber-400 mb-2">{tournament.winner}</div>
              {tournament.winner_record && (
                <div className="text-zinc-400">Final Record: {tournament.winner_record}</div>
              )}
              {tournament.runner_up && (
                <div className="text-sm text-zinc-500 mt-3">
                  Runner-up: {tournament.runner_up}
                </div>
              )}
            </div>
          )}

          {/* Special Prizes */}
          {tournament.special_prizes && (
            <div className="bg-zinc-900 border border-zinc-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-black text-white">Special Prizes</h2>
              </div>
              <div className="space-y-3">
                {tournament.special_prizes.outstanding_performance && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase">Outstanding Performance</div>
                    <div className="text-white font-bold">{tournament.special_prizes.outstanding_performance}</div>
                  </div>
                )}
                {tournament.special_prizes.fighting_spirit && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase">Fighting Spirit</div>
                    <div className="text-white font-bold">{tournament.special_prizes.fighting_spirit}</div>
                  </div>
                )}
                {tournament.special_prizes.technique && (
                  <div>
                    <div className="text-xs text-zinc-500 uppercase">Technique Prize</div>
                    <div className="text-white font-bold">{tournament.special_prizes.technique}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notable Upsets */}
        {tournament.notable_upsets && tournament.notable_upsets.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 p-6 mb-8">
            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-400" />
              Notable Upsets
            </h2>
            <div className="space-y-3">
              {tournament.notable_upsets.map((upset, idx) => (
                <div key={idx} className="bg-zinc-800/50 rounded p-4 border-l-4 border-red-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-zinc-500">Day {upset.day}</div>
                  </div>
                  <div className="flex items-center gap-2 text-white mb-2">
                    <button 
                      onClick={() => handleWrestlerClick(upset.winner)}
                      className="font-bold text-green-400 hover:underline cursor-pointer"
                    >
                      {upset.winner}
                    </button>
                    <span className="text-zinc-600">defeated</span>
                    <button 
                      onClick={() => handleWrestlerClick(upset.loser)}
                      className="font-bold text-red-400 hover:underline cursor-pointer"
                    >
                      {upset.loser}
                    </button>
                  </div>
                  <div className="text-sm text-zinc-400">{upset.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Visualizations */}
        {tournament.rank_changes && tournament.rank_changes.length > 0 && (
          <div className="space-y-8">
            <DailyResultsBreakdown 
              rankChanges={tournament.rank_changes} 
              onWrestlerClick={handleWrestlerClick}
            />
            
            <div className="grid md:grid-cols-2 gap-8">
              <WinLossDistribution rankChanges={tournament.rank_changes} />
              <TournamentRankChart rankChanges={tournament.rank_changes} />
            </div>

            <MatchOutcomeHeatmap rankChanges={tournament.rank_changes} />
          </div>
        )}
      </div>

      {/* Wrestler Detail Modal */}
      {selectedWrestler && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedWrestler(null)}>
          <div className="bg-zinc-900 border-2 border-red-600 rounded-lg p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-white mb-2">{selectedWrestler.shikona}</h3>
            <p className="text-zinc-400 mb-4">{selectedWrestler.rank}</p>
            <Link to="/Leaderboard">
              <Button className="w-full bg-red-600 hover:bg-red-700">
                View Full Profile
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function TournamentRankChart({ rankChanges }) {
  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } = require('recharts');
  
  // Take top 5 for readability
  const topFive = rankChanges.slice(0, 5);
  
  // Transform data for the chart
  const chartData = [];
  for (let day = 1; day <= 15; day++) {
    const dayData = { day };
    topFive.forEach(wrestler => {
      const record = wrestler.daily_records?.find(r => r.day === day);
      if (record) {
        dayData[wrestler.wrestler_name] = record.wins;
      }
    });
    chartData.push(dayData);
  }

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6">
      <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        Win Progression
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
          <XAxis 
            dataKey="day" 
            stroke="#9CA3AF"
            label={{ value: 'Day', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
          />
          <YAxis 
            stroke="#9CA3AF"
            label={{ value: 'Wins', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend />
          {topFive.map((wrestler, idx) => (
            <Line
              key={wrestler.wrestler_id}
              type="monotone"
              dataKey={wrestler.wrestler_name}
              stroke={colors[idx % colors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}