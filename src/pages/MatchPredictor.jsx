import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Swords, TrendingUp, History, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import WrestlerComparisonCard from '../components/predictor/WrestlerComparisonCard';
import PredictionFactors from '../components/predictor/PredictionFactors';
import { calculateMatchProbability, fetchMatchOdds } from '@/api/functions/matchPrediction';

export default function MatchPredictor() {
  const [wrestler1Id, setWrestler1Id] = useState('');
  const [wrestler2Id, setWrestler2Id] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [userPick, setUserPick] = useState(null);
  const [odds, setOdds] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => api.auth.me(),
  });

  const rankOrder = {
    'Yokozuna': 1,
    'Ozeki': 2,
    'Sekiwake': 3,
    'Komusubi': 4,
    'Maegashira': 5,
    'Juryo': 6,
    'Makushita': 7,
    'Sandanme': 8,
    'Jonidan': 9,
    'Jonokuchi': 10,
  };

  const { data: wrestlers = [] } = useQuery({
    queryKey: ['wrestlers'],
    queryFn: async () => {
      const allWrestlers = await api.entities.Wrestler.list('-created_date', 1000);
      return allWrestlers
        .filter(w => w.status_is_active === true)
        .sort((a, b) => {
          const rankA = rankOrder[a.current_rank] || 99;
          const rankB = rankOrder[b.current_rank] || 99;
          if (rankA !== rankB) return rankA - rankB;
          return (a.current_rank_number || 999) - (b.current_rank_number || 999);
        });
    },
  });

  const { data: bashoRecords = [] } = useQuery({
    queryKey: ['basho-records'],
    queryFn: () => api.entities.BashoRecord.list('-basho', 5000),
  });

  const { data: dataStatus } = useQuery({
    queryKey: ['data-status'],
    queryFn: async () => {
      const allWrestlers = await api.entities.Wrestler.list('-created_date', 1000);
      const allRecords = await api.entities.BashoRecord.list('-basho', 5000);
      
      const wrestlerRids = new Set(allWrestlers.map(w => w.rid));
      const recordRids = new Set(allRecords.map(r => r.rid));
      const missingRecords = Array.from(wrestlerRids).filter(rid => !recordRids.has(rid)).length;
      
      const bashos = allRecords.map(r => r.basho).filter(Boolean).sort();
      const lastBasho = bashos.length > 0 ? bashos[bashos.length - 1] : 'N/A';
      
      return {
        totalWrestlers: allWrestlers.length,
        totalRecords: allRecords.length,
        lastBasho,
        missingRecords
      };
    },
  });

  const { data: userStats } = useQuery({
    queryKey: ['user-prediction-stats', user?.email],
    queryFn: async () => {
      const allPredictions = await api.entities.MatchPrediction.list('-created_date', 500);
      const userPreds = allPredictions.filter(p => p.created_by === user.email);
      const resolved = userPreds.filter(p => p.is_resolved);
      const correct = resolved.filter(p => p.is_correct).length;
      const pending = userPreds.filter(p => !p.is_resolved).length;

      return {
        total: userPreds.length,
        correct,
        pending,
        accuracy: resolved.length > 0 ? (correct / resolved.length) * 100 : 0
      };
    },
    enabled: !!user?.email,
  });

  const { data: userPredictions = [], refetch: refetchPredictions } = useQuery({
    queryKey: ['user-predictions', user?.email],
    queryFn: async () => {
      const allPredictions = await api.entities.MatchPrediction.list('-created_date', 50);
      return allPredictions.filter(p => p.created_by === user.email).slice(0, 20);
    },
    enabled: !!user?.email,
  });

  const savePredictionMutation = useMutation({
    mutationFn: (data) => {
      console.log('🔍 SAVE PREDICTION PAYLOAD:', JSON.stringify(data, null, 2));
      console.log('🔍 USER STATE:', user);
      return api.entities.MatchPrediction.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-predictions'] });
      queryClient.invalidateQueries({ queryKey: ['user-prediction-stats'] });
      toast.success('Prediction saved!');
    },
    onError: (error) => {
      console.error('🔴 API ERROR:', error);
      console.error('🔴 ERROR DETAILS:', JSON.stringify(error, null, 2));
      toast.error(`Save failed: ${error.message || 'Unknown error'}`);
    }
  });

  const wrestler1 = wrestlers.find(w => w.id === wrestler1Id);
  const wrestler2 = wrestlers.find(w => w.id === wrestler2Id);

  // Get most recent BashoRecord for each wrestler
  const getLatestBashoRecord = (wrestlerRid) => {
    const records = bashoRecords.filter(r => r.rid === wrestlerRid);
    if (records.length === 0) return null;

    const sorted = records.sort((a, b) => (b.basho || '').localeCompare(a.basho || ''));
    return sorted[0];
  };

  const wrestler1Record = wrestler1 ? getLatestBashoRecord(wrestler1.rid) : null;
  const wrestler2Record = wrestler2 ? getLatestBashoRecord(wrestler2.rid) : null;

  const handlePredict = async () => {
    if (!wrestler1 || !wrestler2) {
      toast.error('Please select both wrestlers');
      return;
    }

    if (wrestler1.id === wrestler2.id) {
      toast.error('Please select different wrestlers');
      return;
    }

    // Wrapped in try-catch to prevent silent failures
    try {
      // Validate prediction functions exist
      if (typeof calculateMatchProbability !== 'function') {
        throw new Error('Prediction system unavailable');
      }

      const result = calculateMatchProbability(
        { ...wrestler1, currentForm: wrestler1Record },
        { ...wrestler2, currentForm: wrestler2Record }
      );
      
      // Validate result structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid prediction result');
      }

      if (typeof result.wrestler1Probability !== 'number' || 
          typeof result.wrestler2Probability !== 'number' ||
          !result.predictedWinner) {
        throw new Error('Prediction result is incomplete');
      }

      setPrediction(result);
      setUserPick(null);

      // Fetch odds (simulated for now)
      const matchOdds = await fetchMatchOdds({ wrestlerA: { ...wrestler1, currentForm: wrestler1Record }, wrestlerB: { ...wrestler2, currentForm: wrestler2Record } });
      setOdds(matchOdds);
    } catch (error) {
      console.error('Prediction failed:', error);
      toast.error('Failed to calculate prediction. Please try again.');
      setPrediction(null);
      setUserPick(null);
      setOdds(null);
    }
  };

  const handleSavePrediction = () => {
    // 🧪 TEMPORARY: Test with minimal payload (uncomment to test)
    // savePredictionMutation.mutate({
    //   wrestler1_id: "test-1",
    //   wrestler1_name: "Test Wrestler 1",
    //   wrestler2_id: "test-2",
    //   wrestler2_name: "Test Wrestler 2",
    //   user_prediction: "test-1"
    // });
    // return;

    // Defensive guards - validate state before saving
    if (!userPick) {
      toast.error('Please make your prediction first');
      return;
    }

    if (!prediction) {
      toast.error('Prediction data is missing. Please predict the match first.');
      return;
    }

    if (!wrestler1 || !wrestler2) {
      toast.error('Wrestler data is missing');
      return;
    }

    // Validate required fields
    if (!wrestler1.id || !wrestler1.shikona || !wrestler2.id || !wrestler2.shikona) {
      toast.error('Invalid wrestler data');
      return;
    }

    // Calculate ai_probability safely
    const aiProbability = userPick === wrestler1.id 
      ? prediction.wrestler1Probability 
      : prediction.wrestler2Probability;

    // Validate ai_probability is a valid number
    if (typeof aiProbability !== 'number' || isNaN(aiProbability)) {
      toast.error('Invalid prediction probability');
      return;
    }

    // Validate ai_prediction exists
    if (!prediction.predictedWinner) {
      toast.error('Invalid AI prediction');
      return;
    }

    // Construct validated payload
    const payload = {
      wrestler1_id: String(wrestler1.id),
      wrestler1_name: String(wrestler1.shikona),
      wrestler2_id: String(wrestler2.id),
      wrestler2_name: String(wrestler2.shikona),
      user_prediction: String(userPick),
      ai_prediction: String(prediction.predictedWinner),
      ai_probability: Number(aiProbability),
      match_date: new Date().toISOString().split('T')[0],
      is_resolved: false
    };

    // Final validation - ensure no undefined/null values in required fields
    const requiredFields = ['wrestler1_id', 'wrestler1_name', 'wrestler2_id', 'wrestler2_name', 'user_prediction'];
    for (const field of requiredFields) {
      if (!payload[field]) {
        toast.error(`Missing required field: ${field}`);
        return;
      }
    }

    console.log('🔍 VALIDATION PASSED - Sending payload');
    savePredictionMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-black to-blue-950/20 pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        <Link to="/Leaderboard">
          <Button variant="ghost" size="sm" className="mb-6 text-zinc-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Button>
        </Link>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-700 to-blue-900 border-2 border-blue-600 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-blue-300 text-sm font-black tracking-[0.2em] uppercase mb-1">
                AI POWERED
              </div>
              <h1 className="text-5xl font-black text-white tracking-tight leading-none mb-2">
                MATCH PREDICTOR
              </h1>
              <p className="text-blue-200">Predict match outcomes using AI and historical data</p>
            </div>
            <Swords className="w-20 h-20 text-blue-300 opacity-50" />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Predictor */}
          <div className="lg:col-span-2 space-y-8">
            {/* Wrestler Selection */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-white">Select Wrestlers</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Wrestler 1</label>
                  <Select value={wrestler1Id} onValueChange={setWrestler1Id}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select rikishi" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {wrestlers.map(w => (
                        <SelectItem key={w.id} value={w.id} className="text-white hover:bg-zinc-700 focus:bg-zinc-700">
                          {w.shikona} ({w.current_rank})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Wrestler 2</label>
                  <Select value={wrestler2Id} onValueChange={setWrestler2Id}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="Select rikishi" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {wrestlers.filter(w => w.id !== wrestler1Id).map(w => (
                        <SelectItem key={w.id} value={w.id} className="text-white hover:bg-zinc-700 focus:bg-zinc-700">
                          {w.shikona} ({w.current_rank})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handlePredict}
                disabled={!wrestler1Id || !wrestler2Id}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 h-12 text-lg font-black"
              >
                <Swords className="w-5 h-5 mr-2" />
                PREDICT MATCH
              </Button>
            </div>

            {/* Prediction Result */}
            <AnimatePresence>
              {prediction && wrestler1 && wrestler2 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Comparison */}
                  <div className="flex gap-4">
                    <WrestlerComparisonCard
                      wrestler={wrestler1}
                      side="left"
                      isWinner={prediction.predictedWinner === wrestler1.id}
                      probability={prediction.wrestler1Probability}
                      bashoRecord={wrestler1Record}
                    />
                    <div className="flex items-center justify-center px-4">
                      <div className="text-4xl font-black text-zinc-700">VS</div>
                    </div>
                    <WrestlerComparisonCard
                      wrestler={wrestler2}
                      side="right"
                      isWinner={prediction.predictedWinner === wrestler2.id}
                      probability={prediction.wrestler2Probability}
                      bashoRecord={wrestler2Record}
                    />
                  </div>

                  {/* Data Provenance Panel */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <h3 className="text-lg font-black text-white mb-4">Data Provenance</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Wrestler 1 */}
                      <div className="bg-zinc-800/50 rounded-lg p-4">
                        <div className="text-sm font-bold text-white mb-3">{wrestler1.shikona}</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {wrestler1.official_image_url ? (
                              <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded border border-green-700">
                                ✓ Official JSA Image
                              </span>
                            ) : wrestler1.image_url ? (
                              <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 rounded border border-blue-700">
                                Wikipedia Image
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 bg-zinc-700 text-zinc-400 rounded border border-zinc-600">
                                Missing Image
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {wrestler1Record ? (
                              <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded border border-green-700">
                                ✓ Basho Data
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 bg-red-900/50 text-red-400 rounded border border-red-700">
                                No Record
                              </span>
                            )}
                          </div>
                          {wrestler1Record && (
                            <div className="text-xs text-zinc-500 mt-2 font-mono">
                              ID: {wrestler1Record.record_id}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Wrestler 2 */}
                      <div className="bg-zinc-800/50 rounded-lg p-4">
                        <div className="text-sm font-bold text-white mb-3">{wrestler2.shikona}</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {wrestler2.official_image_url ? (
                              <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded border border-green-700">
                                ✓ Official JSA Image
                              </span>
                            ) : wrestler2.image_url ? (
                              <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 rounded border border-blue-700">
                                Wikipedia Image
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 bg-zinc-700 text-zinc-400 rounded border border-zinc-600">
                                Missing Image
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {wrestler2Record ? (
                              <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded border border-green-700">
                                ✓ Basho Data
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 bg-red-900/50 text-red-400 rounded border border-red-700">
                                No Record
                              </span>
                            )}
                          </div>
                          {wrestler2Record && (
                            <div className="text-xs text-zinc-500 mt-2 font-mono">
                              ID: {wrestler2Record.record_id}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Factors */}
                  <PredictionFactors
                    prediction={prediction}
                    wrestler1={wrestler1}
                    wrestler2={wrestler2}
                  />

                  {/* Odds (if available) */}
                  {odds && odds.available && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                      <h3 className="text-xl font-black text-white mb-4">Betting Odds</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-800/50 rounded p-4 text-center">
                          <div className="text-zinc-400 text-sm mb-1">{wrestler1.shikona}</div>
                          <div className="text-3xl font-black text-green-400">{odds.wrestler1Odds}</div>
                        </div>
                        <div className="bg-zinc-800/50 rounded p-4 text-center">
                          <div className="text-zinc-400 text-sm mb-1">{wrestler2.shikona}</div>
                          <div className="text-3xl font-black text-green-400">{odds.wrestler2Odds}</div>
                        </div>
                      </div>
                      <div className="text-xs text-zinc-600 text-center mt-3">
                        Source: {odds.bookmaker} • Updated: {format(new Date(odds.lastUpdate), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  )}

                  {/* User Prediction */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <h3 className="text-xl font-black text-white mb-4">Your Prediction</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <Button
                        onClick={() => setUserPick(wrestler1.id)}
                        className={userPick === wrestler1.id
                          ? 'bg-green-600 hover:bg-green-700 h-16'
                          : 'bg-zinc-800 hover:bg-zinc-700 h-16'
                        }
                      >
                        <span className="text-lg font-black">{wrestler1.shikona}</span>
                      </Button>
                      <Button
                        onClick={() => setUserPick(wrestler2.id)}
                        className={userPick === wrestler2.id
                          ? 'bg-green-600 hover:bg-green-700 h-16'
                          : 'bg-zinc-800 hover:bg-zinc-700 h-16'
                        }
                      >
                        <span className="text-lg font-black">{wrestler2.shikona}</span>
                      </Button>
                    </div>
                    <Button
                      onClick={handleSavePrediction}
                      disabled={!userPick}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      Save My Prediction
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Data Status */}
            {dataStatus && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Data Status
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">Total Wrestlers</span>
                    <span className="text-xl font-black text-white">{dataStatus.totalWrestlers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">Basho Records</span>
                    <span className="text-xl font-black text-white">{dataStatus.totalRecords}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">Last Basho</span>
                    <span className="text-sm font-bold text-blue-400">{dataStatus.lastBasho}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">Missing Records</span>
                    <span className={`text-xl font-black ${dataStatus.missingRecords > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {dataStatus.missingRecords}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* User Stats */}
            {userStats && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Your Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">Accuracy</span>
                    <span className="text-2xl font-black text-green-400">
                      {userStats.accuracy.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">Correct</span>
                    <span className="text-xl font-bold text-white">{userStats.correct}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">Total Predictions</span>
                    <span className="text-xl font-bold text-white">{userStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">Pending</span>
                    <span className="text-xl font-bold text-yellow-400">{userStats.pending}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Predictions */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                Recent Predictions
              </h3>
              <div className="space-y-2">
                {userPredictions.slice(0, 10).map(pred => (
                  <div key={pred.id} className="bg-zinc-800/50 rounded p-3">
                    <div className="text-sm text-white font-bold mb-1">
                      {pred.wrestler1_name} vs {pred.wrestler2_name}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">
                        {format(new Date(pred.created_date), 'MMM d')}
                      </span>
                      {pred.is_resolved ? (
                        pred.is_correct ? (
                          <span className="text-green-400 font-bold">✓ Correct</span>
                        ) : (
                          <span className="text-red-400 font-bold">✗ Wrong</span>
                        )
                      ) : (
                        <span className="text-yellow-400 font-bold">Pending</span>
                      )}
                    </div>
                  </div>
                ))}
                {userPredictions.length === 0 && (
                  <p className="text-zinc-600 text-sm text-center py-4">
                    No predictions yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}