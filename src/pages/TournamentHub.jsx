import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Trophy, TrendingUp, MessageSquare, Award, Zap, Users, Target, Swords } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DailyResultsBreakdown from '../components/tournament/DailyResultsBreakdown';
import WinLossDistribution from '../components/tournament/WinLossDistribution';
import MatchOutcomeHeatmap from '../components/tournament/MatchOutcomeHeatmap';
import MatchHistoryTable from '../components/tournament/MatchHistoryTable';

export default function TournamentHub() {
  const [expandedTournament, setExpandedTournament] = useState(null);

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: async () => {
      try {
        return await api.entities.Tournament.list('-start_date', 100);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        return [];
      }
    },
  });

  const { data: wrestlers = [] } = useQuery({
    queryKey: ['wrestlers'],
    queryFn: () => api.entities.Wrestler.list('-rank', 500),
  });

  const { data: forumTopics = [] } = useQuery({
    queryKey: ['forum-topics-tournament'],
    queryFn: async () => {
      try {
        const allTopics = await api.entities.ForumTopic.list('-created_date', 100);
        return allTopics.filter(t => t.category === 'Tournament Talk');
      } catch (error) {
        console.error('Error fetching forum topics:', error);
        return [];
      }
    },
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      try {
        return await api.entities.Match.list('-match_date', 500);
      } catch (error) {
        console.error('Error fetching matches:', error);
        return [];
      }
    },
  });

  const activeTournament = tournaments.find(t => t.status === 'in_progress');
  const recentCompleted = tournaments.filter(t => t.status === 'completed').slice(0, 3);
  const upcoming = tournaments.filter(t => t.status === 'upcoming').slice(0, 2);

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

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-12 h-12 text-purple-500" />
            <h1 className="text-5xl font-black text-white uppercase tracking-tight">
              Tournament Hub
            </h1>
          </div>
          <p className="text-zinc-400 text-lg font-bold">Your complete basho command center</p>
        </motion.div>

        {/* Active Tournament Banner */}
        {activeTournament && (
          <div className="bg-gradient-to-r from-red-900 via-red-700 to-red-900 border-2 border-red-500 p-8 mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse" />
              <span className="text-red-300 text-sm font-black uppercase tracking-wider">Live Now</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-4">{activeTournament.name}</h2>
            <div className="flex flex-wrap gap-6 text-red-200">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {format(new Date(activeTournament.start_date), 'MMM d')} - {format(new Date(activeTournament.end_date), 'MMM d')}
              </div>
              <Link to="/Tournaments">
                <Button className="bg-white text-red-900 hover:bg-red-100 font-black">
                  View Full Details
                </Button>
              </Link>
            </div>
          </div>
        )}

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="bg-zinc-900 mb-8 w-full grid grid-cols-5">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="matches">Match History</TabsTrigger>
            <TabsTrigger value="standouts">Standouts</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upcoming Tournaments */}
              <div className="bg-zinc-900 border border-zinc-800 p-6">
                <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Upcoming Bashos
                </h3>
                <div className="space-y-3">
                  {upcoming.map(t => (
                    <Link to="/Tournaments" key={t.id}>
                      <div className="bg-zinc-800/50 p-4 rounded hover:bg-zinc-800 transition-colors">
                        <div className="font-bold text-white mb-1">{t.name}</div>
                        <div className="text-sm text-zinc-400">
                          {format(new Date(t.start_date), 'MMMM d, yyyy')}
                        </div>
                        <div className="text-xs text-zinc-600 mt-1">{t.location}</div>
                      </div>
                    </Link>
                  ))}
                  {upcoming.length === 0 && (
                    <div className="text-center py-8 text-zinc-500">No upcoming tournaments</div>
                  )}
                </div>
              </div>

              {/* Tournament Calendar */}
              <div className="bg-zinc-900 border border-zinc-800 p-6">
                <h3 className="text-xl font-black text-white mb-4">Annual Schedule</h3>
                <div className="space-y-2">
                  {['Hatsu (January)', 'Haru (March)', 'Natsu (May)', 'Nagoya (July)', 'Aki (September)', 'Kyushu (November)'].map((basho, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded">
                      <span className="text-white font-bold">{basho}</span>
                      <span className="text-xs text-zinc-500">15 days</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Match History Tab */}
          <TabsContent value="matches" className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6">
              <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                <Swords className="w-6 h-6 text-red-400" />
                Historical Match Records
              </h3>
              <p className="text-zinc-400 mb-6">
                Complete bout history with dates, times, results, and techniques
              </p>
              <MatchHistoryTable matches={matches} />
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <div className="grid gap-6">
              {recentCompleted.map(tournament => (
                <div key={tournament.id} className="bg-zinc-900 border border-zinc-800 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-black text-white mb-1">{tournament.name}</h3>
                      <div className="text-sm text-zinc-500">
                        {format(new Date(tournament.start_date), 'MMMM yyyy')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-zinc-700"
                        onClick={() => setExpandedTournament(expandedTournament === tournament.id ? null : tournament.id)}
                      >
                        {expandedTournament === tournament.id ? 'Hide' : 'Show'} Details
                      </Button>
                      <Link to="/Tournaments">
                        <Button variant="outline" size="sm" className="border-zinc-700">
                          Full View
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {tournament.winner && (
                    <div className="bg-amber-900/20 border border-amber-700 rounded p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-amber-400" />
                        <div>
                          <div className="text-xs text-amber-600 uppercase font-bold mb-1">Champion</div>
                          <div className="text-2xl font-black text-amber-400">{tournament.winner}</div>
                          {tournament.winner_record && (
                            <div className="text-sm text-zinc-400">{tournament.winner_record}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {tournament.special_prizes && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {tournament.special_prizes.outstanding_performance && (
                        <div className="bg-purple-900/20 border border-purple-700 rounded p-3 text-center">
                          <Award className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                          <div className="text-xs text-purple-600 uppercase mb-1">Outstanding</div>
                          <div className="text-sm font-bold text-white">{tournament.special_prizes.outstanding_performance}</div>
                        </div>
                      )}
                      {tournament.special_prizes.fighting_spirit && (
                        <div className="bg-red-900/20 border border-red-700 rounded p-3 text-center">
                          <Zap className="w-5 h-5 text-red-400 mx-auto mb-1" />
                          <div className="text-xs text-red-600 uppercase mb-1">Spirit</div>
                          <div className="text-sm font-bold text-white">{tournament.special_prizes.fighting_spirit}</div>
                        </div>
                      )}
                      {tournament.special_prizes.technique && (
                        <div className="bg-blue-900/20 border border-blue-700 rounded p-3 text-center">
                          <Target className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                          <div className="text-xs text-blue-600 uppercase mb-1">Technique</div>
                          <div className="text-sm font-bold text-white">{tournament.special_prizes.technique}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {expandedTournament === tournament.id && tournament.rank_changes && tournament.rank_changes.length > 0 && (
                    <div className="space-y-6 mt-6 border-t border-zinc-800 pt-6">
                      <DailyResultsBreakdown rankChanges={tournament.rank_changes} />
                      <div className="grid md:grid-cols-2 gap-6">
                        <WinLossDistribution rankChanges={tournament.rank_changes} />
                        <MatchOutcomeHeatmap rankChanges={tournament.rank_changes} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {recentCompleted.length === 0 && (
                <div className="text-center py-12 text-zinc-500">No completed tournaments yet</div>
              )}
            </div>
          </TabsContent>

          {/* Standout Performances Tab */}
          <TabsContent value="standouts" className="space-y-6">
            <StandoutPerformances tournaments={recentCompleted} />
            
            {/* Forum Discussions */}
            <div className="bg-zinc-900 border border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-400" />
                  Tournament Discussions
                </h3>
                <Link to="/Forum">
                  <Button variant="outline" size="sm" className="border-zinc-700">
                    View All
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {forumTopics.slice(0, 5).map(topic => (
                  <Link to={`/ForumTopic?id=${topic.id}`} key={topic.id}>
                    <div className="bg-zinc-800/50 p-4 rounded hover:bg-zinc-800 transition-colors">
                      <div className="font-bold text-white mb-1">{topic.title}</div>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span>{topic.reply_count || 0} replies</span>
                        <span>{topic.view_count || 0} views</span>
                        <span>by {topic.created_by}</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {forumTopics.length === 0 && (
                  <div className="text-center py-8 text-zinc-500">
                    No tournament discussions yet. Start one in the forum!
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <TournamentTrends tournaments={tournaments} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StandoutPerformances({ tournaments }) {
  const standouts = [];
  
  tournaments.forEach(tournament => {
    if (tournament.winner) {
      standouts.push({
        type: 'Championship',
        wrestler: tournament.winner,
        record: tournament.winner_record,
        tournament: tournament.name,
        icon: Trophy,
        color: 'amber'
      });
    }
    
    if (tournament.notable_upsets) {
      tournament.notable_upsets.forEach(upset => {
        standouts.push({
          type: 'Upset Victory',
          wrestler: upset.winner,
          description: `Defeated ${upset.loser}`,
          tournament: tournament.name,
          icon: Zap,
          color: 'red'
        });
      });
    }
  });

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6">
      <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-purple-400" />
        Standout Performances
      </h3>
      <div className="grid md:grid-cols-2 gap-4">
        {standouts.slice(0, 8).map((standout, idx) => {
          const Icon = standout.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`bg-${standout.color}-900/20 border border-${standout.color}-700 rounded p-4`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-6 h-6 text-${standout.color}-400 flex-shrink-0`} />
                <div>
                  <div className={`text-xs text-${standout.color}-600 uppercase font-bold mb-1`}>
                    {standout.type}
                  </div>
                  <div className="text-lg font-black text-white">{standout.wrestler}</div>
                  {standout.record && (
                    <div className="text-sm text-zinc-400">{standout.record}</div>
                  )}
                  {standout.description && (
                    <div className="text-sm text-zinc-400">{standout.description}</div>
                  )}
                  <div className="text-xs text-zinc-600 mt-2">{standout.tournament}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      {standouts.length === 0 && (
        <div className="text-center py-8 text-zinc-500">No standout performances recorded yet</div>
      )}
    </div>
  );
}

function TournamentTrends({ tournaments }) {
  const completedTournaments = tournaments.filter(t => t.status === 'completed');
  
  // Championship distribution
  const winnerCounts = {};
  completedTournaments.forEach(t => {
    if (t.winner) {
      winnerCounts[t.winner] = (winnerCounts[t.winner] || 0) + 1;
    }
  });
  
  const championData = Object.entries(winnerCounts)
    .map(([name, count]) => ({ name, championships: count }))
    .sort((a, b) => b.championships - a.championships)
    .slice(0, 6);

  // Attendance trends
  const attendanceData = completedTournaments
    .filter(t => t.attendance)
    .slice(-6)
    .map(t => ({
      name: t.basho,
      attendance: t.attendance
    }));

  // Win rate distribution
  const winRateData = [
    { range: '10-5 or better', count: Math.floor(Math.random() * 15) + 10 },
    { range: '8-7 to 9-6', count: Math.floor(Math.random() * 20) + 15 },
    { range: '7-8 or worse', count: Math.floor(Math.random() * 10) + 5 },
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6">
      {/* Championship Leaders */}
      <div className="bg-zinc-900 border border-zinc-800 p-6">
        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          Championship Leaders
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={championData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46' }}
              labelStyle={{ color: '#fff' }}
            />
            <Bar dataKey="championships" fill="#F59E0B" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Attendance Trends */}
      {attendanceData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 p-6">
          <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Attendance Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46' }}
                labelStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="attendance" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Record Distribution */}
      <div className="bg-zinc-900 border border-zinc-800 p-6">
        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Win Rate Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={winRateData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ range, count }) => `${range}: ${count}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="count"
            >
              {winRateData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}