import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

import LeaderboardHeader from '../components/leaderboard/LeaderboardHeader';
import SearchBar from '../components/leaderboard/SearchBar';
import DivisionFilter from '../components/leaderboard/DivisionFilter';
import LeaderboardTable from '../components/leaderboard/LeaderboardTable';
import AdvancedFilters from '../components/leaderboard/AdvancedFilters';
import SortControls from '../components/leaderboard/SortControls';
import WrestlerCard from '../components/leaderboard/WrestlerCard';
import SyncStatus from '../components/sync/SyncStatus';
import CompareBar from '../components/comparison/CompareBar';
import ComparisonView from '../components/comparison/ComparisonView';
import LiveTournamentFeed from '../components/live/LiveTournamentFeed';
import FavoritesFeed from '../components/personalized/FavoritesFeed';
import DashboardSettings from '../components/personalized/DashboardSettings';
import syncLiveData from '@/api/functions/syncLiveData';
import { getUserPreferences, saveUserPreferences, toggleFollowWrestler, toggleWidget, updateNotificationSettings } from '@/api/functions/userPreferences';

const rankOrder = {
  'Yokozuna': 1,
  'Ozeki': 2,
  'Sekiwake': 3,
  'Komusubi': 4,
  'Maegashira': 5,
  'Juryo': 6,
  'Makushita': 7,
};

export default function Leaderboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [advancedFilters, setAdvancedFilters] = useState({
    rank: 'all',
    activeStatus: 'all',
    country: '',
    minWinRate: '',
    tournamentPerformance: 'all'
  });
  const [sortBy, setSortBy] = useState('rank');
  const [selectedWrestler, setSelectedWrestler] = useState(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(
    localStorage.getItem('auto_sync_enabled') === 'true'
  );
  const [compareMode, setCompareMode] = useState(false);
  const [compareWrestlers, setCompareWrestlers] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [userPreferences, setUserPreferences] = useState(getUserPreferences());
  const [showSettings, setShowSettings] = useState(false);
  const [lastNotifiedMatches, setLastNotifiedMatches] = useState(new Set());
  const [skipStubs, setSkipStubs] = useState(() => {
    const saved = localStorage.getItem('skip_stubs_leaderboard');
    return saved !== null ? saved === 'true' : false; // Default OFF
  });

  // Real-time live updates with auto-refresh
  const [liveTournament, setLiveTournament] = useState(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const refreshLive = async () => {
    setLoadingLive(true);
    try {
      const result = await syncLiveData({ forceRefresh: true });
      if (result?.success && result?.data) {
        setLiveTournament(result.data);
        setLastUpdate(new Date());
      } else {
        setLiveTournament(null);
      }
    } catch (error) {
      console.error('Failed to refresh live data:', error);
      setLiveTournament(null);
    } finally {
      setLoadingLive(false);
    }
  };

  const { data: rawWrestlers = [], isLoading: loadingWrestlers, refetch, isFetching, error } = useQuery({
    queryKey: ['wrestlers'],
    queryFn: () => api.entities.Wrestler.list('-rank', 500),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allBashoRecords = [], isLoading: loadingRecords, error: recordsError } = useQuery({
    queryKey: ['basho-records-all'],
    queryFn: async () => {
      try {
        return await api.entities.BashoRecord.list('-created_date', 5000);
      } catch (err) {
        console.warn('Failed to load BashoRecords:', err);
        return [];
      }
    },
    retry: 0,
    staleTime: 5 * 60 * 1000,
    onError: (err) => {
      console.error('BashoRecord query error:', err);
    }
  });

  // Parse rank string into components for sorting
  const parseRank = (rankString, rankNum, sideStr) => {
    if (!rankString) return { tier: 'Unknown', tierOrder: 999, number: 999, side: 'East', sideOrder: 0 };
    
    const tierOrder = {
      'Yokozuna': 1,
      'Ozeki': 2,
      'Sekiwake': 3,
      'Komusubi': 4,
      'Maegashira': 5,
      'Juryo': 6,
      'Makushita': 7
    };
    
    // Try to parse "Maegashira 3 East" or "Ozeki East" or "Yokozuna"
    const match = rankString.match(/^(\w+)\s*(\d+)?\s*(East|West)?/i);
    if (!match) return { tier: 'Unknown', tierOrder: 999, number: 999, side: 'East', sideOrder: 0 };
    
    const tier = match[1];
    const number = rankNum || (match[2] ? parseInt(match[2]) : 1);
    const side = sideStr || match[3] || 'East';
    
    return {
      tier,
      tierOrder: tierOrder[tier] || 999,
      number,
      side,
      sideOrder: side === 'East' ? 0 : 1
    };
  };

  // Check if rank is Makuuchi (top division)
  const isMakuuchi = (rankString) => {
    if (!rankString) return false;
    const makuuchiRanks = ['Yokozuna', 'Ozeki', 'Sekiwake', 'Komusubi', 'Maegashira'];
    return makuuchiRanks.some(r => rankString.includes(r));
  };

  // Check if wrestler is a stub/placeholder
  const isStubWrestler = (wrestler) => {
    if (!wrestler) return true;
    
    // Check for missing critical fields
    const rank = wrestler.current_rank || wrestler.rank || '';
    const division = wrestler.current_division || wrestler.division || '';
    const shikona = wrestler.shikona || '';
    const rid = wrestler.rid || '';
    
    // Stub indicators
    if (!rank || rank === 'Unknown') return true;
    if (!division || division === 'Unknown') return true;
    if (shikona.includes('????')) return true;
    if (rid.includes('_????')) return true;
    
    return false;
  };

  const toggleSkipStubs = () => {
    const newValue = !skipStubs;
    setSkipStubs(newValue);
    localStorage.setItem('skip_stubs_leaderboard', newValue.toString());
    toast.success(newValue ? 'Stubs hidden' : 'Stubs visible');
  };

  // Compute latest basho and aggregate records
  const { wrestlers, latestBasho, debugInfo } = React.useMemo(() => {
    try {
      if (!rawWrestlers?.length || !allBashoRecords?.length) {
        return { wrestlers: [], latestBasho: null, debugInfo: null };
      }

      // Find latest basho
      const bashos = [...new Set(allBashoRecords.map(r => r.basho).filter(Boolean))].sort();
      const latest = bashos[bashos.length - 1];
      if (!latest) return { wrestlers: [], latestBasho: null, debugInfo: null };

      // Filter to latest basho records ONLY
      const latestRecords = allBashoRecords.filter(r => r.basho === latest);

      // Filter to Makuuchi division only
      const makuuchiRecords = latestRecords.filter(r => {
        const rankStr = r.rank || r.current_rank || '';
        const divStr = r.division || r.current_division || '';
        return divStr === 'Makuuchi' || isMakuuchi(rankStr);
      });

      // Build wrestler roster from basho records only
      const recordsByRid = {};
      makuuchiRecords.forEach(record => {
        if (!record?.rid) return;
        if (!recordsByRid[record.rid]) {
          recordsByRid[record.rid] = { 
            wins: 0, 
            losses: 0, 
            absences: 0, 
            rankInfo: null,
            rankNumber: null,
            side: null,
            shikona: record.shikona || 'Unknown'
          };
        }
        // Aggregate wins/losses from basho records
        recordsByRid[record.rid].wins += (record.wins || 0);
        recordsByRid[record.rid].losses += (record.losses || 0);
        recordsByRid[record.rid].absences += (record.absences || 0);
        
        // Store rank info from basho record (only update if not already set)
        if (!recordsByRid[record.rid].rankInfo && (record.rank || record.current_rank)) {
          recordsByRid[record.rid].rankInfo = record.rank || record.current_rank;
        }
        if (!recordsByRid[record.rid].rankNumber && (record.rank_number || record.current_rank_number)) {
          recordsByRid[record.rid].rankNumber = record.rank_number || record.current_rank_number;
        }
        if (!recordsByRid[record.rid].side && (record.side || record.current_side)) {
          recordsByRid[record.rid].side = record.side || record.current_side;
        }
      });

      // Build final roster from wrestlers with basho records
      let enriched = Object.keys(recordsByRid).map(rid => {
        const bashoData = recordsByRid[rid];
        const wrestler = rawWrestlers.find(w => w.rid === rid) || {};
        
        // Use NEW schema fields with fallbacks
        const rankStr = wrestler.current_rank || bashoData.rankInfo || wrestler.rank || 'Maegashira';
        const rankNum = wrestler.current_rank_number || bashoData.rankNumber || wrestler.rank_number;
        const side = wrestler.current_side || bashoData.side || wrestler.side;
        const division = wrestler.current_division || wrestler.division || 'Makuuchi';
        const photoUrl = wrestler.official_image_url || wrestler.image?.url || wrestler.image_url || null;
        
        // Determine if active (use NEW fields)
        const isActive = wrestler.status_is_active === true || 
                        (wrestler.status_is_retired !== true && rankStr);
        
        const parsed = parseRank(rankStr, rankNum, side);
        
        return {
          ...wrestler,
          rid,
          shikona: wrestler.shikona || bashoData.shikona || 'Unknown',
          current_rank: rankStr,
          current_division: division,
          official_image_url: photoUrl,
          status_is_active: isActive,
          latestBashoWins: bashoData.wins,
          latestBashoLosses: bashoData.losses,
          latestBashoAbsences: bashoData.absences,
          bashoRank: rankStr,
          bashoRankNumber: rankNum,
          bashoSide: side,
          parsedRank: parsed
        };
      });

      // Filter out stubs if enabled
      const beforeStubFilter = enriched.length;
      if (skipStubs) {
        enriched = enriched.filter(w => !isStubWrestler(w));
      }
      const afterStubFilter = enriched.length;

      // Debug info
      const debug = {
        latestBasho: latest,
        totalWrestlers: enriched.length,
        totalBashoRecords: makuuchiRecords.length,
        makuuchiOnly: true,
        stubsExcluded: skipStubs ? beforeStubFilter - afterStubFilter : 0,
        skipStubsEnabled: skipStubs,
        sampleRankings: enriched.slice(0, 5).map(w => ({
          rid: w.rid,
          shikona: w.shikona,
          rank: w.bashoRank,
          parsed: w.parsedRank,
          record: `${w.latestBashoWins}-${w.latestBashoLosses}`
        }))
      };

      return { wrestlers: enriched, latestBasho: latest, debugInfo: debug };
    } catch (error) {
      console.error('Error processing basho data:', error);
      return { wrestlers: [], latestBasho: null, debugInfo: null };
    }
  }, [rawWrestlers, allBashoRecords, skipStubs]);

  const isLoading = loadingWrestlers || loadingRecords;

  // Show error if API fails
  React.useEffect(() => {
    if (error) {
      console.error('Failed to load wrestlers:', error);
      toast.error('Failed to load wrestlers. Please refresh the page.');
    }
    if (recordsError) {
      console.error('Failed to load basho records:', recordsError);
      toast.error('Failed to load tournament records. Please refresh the page.');
    }
  }, [error, recordsError]);

  // Return early if there's a critical error
  if (error || recordsError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-lg mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠</div>
          <h2 className="text-white text-2xl font-bold mb-2">Connection Issue</h2>
          <p className="text-zinc-400 mb-2">Unable to load wrestler data in preview mode.</p>
          <p className="text-zinc-500 text-sm mb-6">
            Known preview/network limitation — some requests may fail in local/preview environments.
          </p>
          <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Initial load of live data (disabled to prevent errors)
  // useEffect(() => {
  //   refreshLive();
  // }, []);

  // Check for notifications when live data updates
  const checkForNotifications = (tournamentData) => {
    if (!tournamentData?.is_active || !userPreferences?.notifications?.liveMatches || !wrestlers?.length) return;

    try {
      const followedWrestlers = wrestlers.filter(w => 
        w?.id && Array.isArray(userPreferences?.followedWrestlers) && 
        userPreferences.followedWrestlers.includes(w.id)
      );
      
      // Check current bout
      if (tournamentData.live_status?.current_bout) {
        const bout = tournamentData.live_status.current_bout;
        const favoriteInMatch = followedWrestlers.find(w => 
          w?.shikona && (w.shikona === bout.wrestler1 || w.shikona === bout.wrestler2)
        );
        
        const matchKey = `${bout.wrestler1}-${bout.wrestler2}`;
        if (favoriteInMatch && !lastNotifiedMatches.has(matchKey)) {
          toast.success(`🔴 ${favoriteInMatch.shikona} is in the ring now!`, {
            description: `vs ${favoriteInMatch.shikona === bout.wrestler1 ? bout.wrestler2 : bout.wrestler1}`,
            duration: 5000
          });
          setLastNotifiedMatches(prev => new Set([...prev, matchKey]));
        }
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  // Auto-sync on mount if enabled
  useEffect(() => {
    if (autoSyncEnabled) {
      handleSync(false);
    }
  }, []);

  // Auto-sync every hour if enabled
  useEffect(() => {
    if (!autoSyncEnabled) return;

    const interval = setInterval(() => {
      handleSync(false);
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, [autoSyncEnabled]);

  const handleSync = async (forceRefresh = false) => {
    setSyncing(true);
    
    try {
      const result = await syncLiveData({ forceRefresh });
      
      if (result?.success) {
        if (result.cached) {
          toast.info(result.message);
        } else {
          toast.success(result.message, {
            description: result.metadata?.basho ? `Basho: ${result.metadata.basho}` : undefined
          });
          await refetch();
        }
      } else {
        toast.error(result?.message || 'Sync failed');
      }
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Failed to sync data - please try again');
    } finally {
      setSyncing(false);
    }
  };

  const toggleAutoSync = () => {
    const newValue = !autoSyncEnabled;
    setAutoSyncEnabled(newValue);
    localStorage.setItem('auto_sync_enabled', newValue.toString());
    
    if (newValue) {
      toast.success('Auto-sync enabled', {
        description: 'Data will refresh automatically every hour'
      });
      handleSync(false);
    } else {
      toast.info('Auto-sync disabled');
    }
  };

  // Normalize wrestler data to handle both formats
  const normalizeWrestler = (w) => {
    // Use NEW schema fields with fallbacks
    const displayRank = w.current_rank || w.bashoRank || w.rank || 'Maegashira';
    const displayDivision = w.current_division || 'Makuuchi';
    
    // Photo - prioritize official_image_url (NEW field)
    const photoUrl = w.official_image_url || w.image?.url || w.imageUrl || null;
    
    // Wins/losses - from basho records only
    const wins = w.latestBashoWins ?? 0;
    const losses = w.latestBashoLosses ?? 0;
    
    return {
      ...w,
      isActive: w.status_is_active === true || (w.status_is_retired !== true && displayRank),
      displayRank,
      displayDivision,
      photoUrl,
      displayWins: wins,
      displayLosses: losses,
      displayWinRate: wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0
    };
  };

  // Calculate win rate helper
  const getWinRate = (wrestler) => {
    if (!wrestler.career_wins || !wrestler.career_losses) return 0;
    return (wrestler.career_wins / (wrestler.career_wins + wrestler.career_losses)) * 100;
  };

  // Sort and filter wrestlers
  const filteredWrestlers = useMemo(() => {
    let result = wrestlers.map(normalizeWrestler);
    
    // Filter by active status first
    result = result.filter(w => w.isActive);
    
    // Filter by favorites only mode
    if (userPreferences?.widgets?.favoritesOnly && Array.isArray(userPreferences?.followedWrestlers) && userPreferences.followedWrestlers.length > 0) {
      result = result.filter(w => userPreferences.followedWrestlers.includes(w.id));
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(w => 
        w.shikona?.toLowerCase().includes(query) ||
        w.real_name?.toLowerCase().includes(query) ||
        w.stable?.toLowerCase().includes(query)
      );
    }
    
    // Filter by division
    if (selectedDivision !== 'all') {
      result = result.filter(w => w.rank === selectedDivision);
    }

    // Advanced filters
    if (advancedFilters.rank !== 'all') {
      result = result.filter(w => w.rank === advancedFilters.rank);
    }

    if (advancedFilters.activeStatus !== 'all') {
      const isActive = advancedFilters.activeStatus === 'active';
      result = result.filter(w => (w.is_active ?? true) === isActive);
    }

    if (advancedFilters.country) {
      const country = advancedFilters.country.toLowerCase();
      result = result.filter(w => w.birthplace?.toLowerCase().includes(country));
    }

    if (advancedFilters.minWinRate) {
      const minRate = parseFloat(advancedFilters.minWinRate);
      result = result.filter(w => getWinRate(w) >= minRate);
    }

    if (advancedFilters.tournamentPerformance !== 'all') {
      result = result.filter(w => {
        const wins = w.wins || 0;
        const losses = w.losses || 0;
        const total = wins + losses;
        if (total === 0) return false;

        if (advancedFilters.tournamentPerformance === 'winning') {
          return wins > losses;
        } else if (advancedFilters.tournamentPerformance === 'losing') {
          return wins < losses;
        } else if (advancedFilters.tournamentPerformance === 'even') {
          return wins === losses;
        }
        return true;
      });
    }
    
    // Division priority
    const divisionOrder = {
      'Makuuchi': 1, 'Juryo': 2, 'Makushita': 3, 
      'Sandanme': 4, 'Jonidan': 5, 'Jonokuchi': 6
    };
    
    // Rank priority
    const rankPriority = {
      'Yokozuna': 1, 'Ozeki': 2, 'Sekiwake': 3, 
      'Komusubi': 4, 'Maegashira': 5
    };
    
    // Sorting - ALWAYS by banzuke rank order for default
    result.sort((a, b) => {
      if (sortBy === 'rank' || !sortBy) {
        // Sort by parsed rank (tier, number, side)
        const aRank = a.parsedRank || parseRank(a.displayRank);
        const bRank = b.parsedRank || parseRank(b.displayRank);
        
        // First by tier order
        if (aRank.tierOrder !== bRank.tierOrder) {
          return aRank.tierOrder - bRank.tierOrder;
        }
        
        // Then by number
        if (aRank.number !== bRank.number) {
          return aRank.number - bRank.number;
        }
        
        // Then by side (East before West)
        if (aRank.sideOrder !== bRank.sideOrder) {
          return aRank.sideOrder - bRank.sideOrder;
        }
        
        return 0;
      }
      
      // Other sort modes
      switch (sortBy) {
        case 'name':
          return (a.shikona || '').localeCompare(b.shikona || '');
        case 'wins_desc':
          return b.displayWins - a.displayWins || (a.displayLosses - b.displayLosses);
        case 'wins_asc':
          return a.displayWins - b.displayWins;
        case 'winrate_desc':
          return b.displayWinRate - a.displayWinRate;
        case 'winrate_asc':
          return a.displayWinRate - b.displayWinRate;
        default:
          return 0;
      }
    });
    
    return result;
    }, [wrestlers, searchQuery, selectedDivision, userPreferences, advancedFilters, sortBy]);

  const handleSelectWrestler = (wrestler) => {
    if (compareMode) {
      // Toggle selection in compare mode
      if (compareWrestlers.find(w => w.id === wrestler.id)) {
        setCompareWrestlers(compareWrestlers.filter(w => w.id !== wrestler.id));
      } else if (compareWrestlers.length < 3) {
        setCompareWrestlers([...compareWrestlers, wrestler]);
      } else {
        toast.error('Maximum 3 wrestlers for comparison');
      }
    } else {
      setSelectedWrestler(wrestler);
      setCardOpen(true);
    }
  };

  const handleCompare = () => {
    if (compareWrestlers.length >= 2) {
      setShowComparison(true);
    }
  };

  const handleCancelCompare = () => {
    setCompareMode(false);
    setCompareWrestlers([]);
  };

  const handleRemoveFromCompare = (id) => {
    setCompareWrestlers(compareWrestlers.filter(w => w.id !== id));
  };

  const handleToggleWidget = (widgetKey) => {
    const newValue = toggleWidget(widgetKey);
    setUserPreferences(getUserPreferences());
    toast.success(`${widgetKey} ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleUpdateNotifications = (settings) => {
    updateNotificationSettings(settings);
    setUserPreferences(getUserPreferences());
    toast.success('Notification settings updated');
  };

  const favoriteWrestlers = (wrestlers || []).filter(w => 
    w?.id && Array.isArray(userPreferences?.followedWrestlers) && 
    userPreferences.followedWrestlers.includes(w.id)
  );

  return (
    <div className="min-h-screen bg-black">
      {/* ESPN-style background */}
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-black to-red-950/20 pointer-events-none" />
      <div className="fixed inset-0 opacity-5 pointer-events-none"
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 38h40v2H0v-2zM0 18h40v2H0v-2z'/%3E%3C/g%3E%3C/svg%3E")`,
           }}
      />

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        <LeaderboardHeader 
          totalWrestlers={wrestlers.length}
          activeTournament={
            <span>
              Grand <Link to="/SumoGame" className="cursor-pointer hover:opacity-70">Sumo</Link> Tournament
            </span>
          }
        />

        {/* Favorites Feed */}
        {favoriteWrestlers.length > 0 && (
          <FavoritesFeed 
            wrestlers={favoriteWrestlers}
            tournamentData={liveTournament}
            onSelectWrestler={handleSelectWrestler}
          />
        )}

        {/* Live Tournament Feed */}
        {userPreferences?.widgets?.liveFeed && (
          <LiveTournamentFeed 
            tournamentData={liveTournament} 
            loading={loadingLive}
            onRefresh={refreshLive}
          />
        )}
        
        {lastUpdate && (
          <div className="text-xs text-zinc-600 text-center mb-4">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}

        {/* Sync Status */}
        <div className="mb-6">
          <SyncStatus />
        </div>

        {/* Search */}
        <div className="mb-6">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Advanced Filters */}
        <div className="mb-6">
          <AdvancedFilters
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
            onClear={() => setAdvancedFilters({
              rank: 'all',
              activeStatus: 'all',
              country: '',
              minWinRate: '',
              tournamentPerformance: 'all'
            })}
          />
        </div>

        {/* Sort Controls */}
        <div className="mb-6">
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="text-blue-400 text-xl">●</div>
              <div>
                <div className="text-blue-300 font-bold text-sm mb-1">Understanding the Rankings</div>
                <div className="text-blue-200 text-xs leading-relaxed">
                  <strong>Official Banzuke Rank</strong> shows traditional ranking position (Yokozuna, Ozeki, etc.) based on historical performance. 
                  <strong>Tournament Standings</strong> shows current basho performance (wins-losses).
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <DivisionFilter selected={selectedDivision} onSelect={setSelectedDivision} />
            <SortControls sortBy={sortBy} onSortChange={setSortBy} />
          </div>
        </div>

        {/* Sync Controls */}
        <div className="flex justify-between items-center gap-2 my-6">
          <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => setCompareMode(!compareMode)}
                className={cn(
                  "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 font-black text-xs tracking-wider uppercase",
                  compareMode && "border-red-600 bg-red-900/30 text-red-400"
                )}
              >
                {compareMode ? '✕ EXIT COMPARE' : '⚔️ COMPARE WRESTLERS'}
              </Button>
              <Button
                size="sm"
                onClick={toggleSkipStubs}
                className={cn(
                  "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 font-black text-xs tracking-wider uppercase",
                  skipStubs && "border-green-600 bg-green-900/30 text-green-400"
                )}
              >
                {skipStubs ? '✓ STUBS HIDDEN' : 'SHOW STUBS'}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowSettings(true)}
                className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 font-black text-xs tracking-wider uppercase"
              >
                ⚙️ CUSTOMIZE
              </Button>
              </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={toggleAutoSync}
              className={cn(
                "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 font-black text-xs tracking-wider uppercase",
                autoSyncEnabled && "border-green-600 text-green-400"
              )}
            >
              <Zap className="w-4 h-4 mr-2" />
              {autoSyncEnabled ? 'AUTO-SYNC ON' : 'AUTO-SYNC OFF'}
            </Button>
            <Button
              size="sm"
              onClick={() => handleSync(true)}
              disabled={syncing || isFetching}
              className="bg-red-600 hover:bg-red-700 font-black text-xs tracking-wider uppercase"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${(syncing || isFetching) ? 'animate-spin' : ''}`} />
              {syncing ? 'SYNCING...' : 'SYNC NOW'}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/50 border border-zinc-800">
            <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
            <p className="text-zinc-400 font-bold uppercase text-sm tracking-wider">Loading rankings...</p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-zinc-900/50 border-l-4 border-red-600 px-4 py-2 mb-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-zinc-400 font-black uppercase tracking-wider">
                  Active wrestlers: {filteredWrestlers.length}
                </span>
                {latestBasho && (
                  <span className="text-xs text-blue-400 font-bold">
                    Basho: {latestBasho}
                  </span>
                )}
                {debugInfo?.stubsExcluded > 0 && (
                  <span className="text-xs text-yellow-400 font-bold">
                    {debugInfo.stubsExcluded} stubs excluded
                  </span>
                )}
              </div>
            </motion.div>

            {/* Leaderboard */}
            <LeaderboardTable 
              wrestlers={filteredWrestlers} 
              onSelect={handleSelectWrestler}
              compareMode={compareMode}
              selectedForCompare={compareWrestlers.map(w => w.id)}
              followedWrestlers={userPreferences?.followedWrestlers || []}
            />
          </>
        )}

        {/* Wrestler Detail Modal */}
        <WrestlerCard 
          wrestler={selectedWrestler}
          open={cardOpen}
          onClose={setCardOpen}
          isFollowing={selectedWrestler ? (userPreferences?.followedWrestlers || []).includes(selectedWrestler.id) : false}
          onToggleFollow={() => {
            if (selectedWrestler) {
              toggleFollowWrestler(selectedWrestler.id);
              setUserPreferences(getUserPreferences());
              const isNowFollowing = (getUserPreferences()?.followedWrestlers || []).includes(selectedWrestler.id);
              toast.success(isNowFollowing ? `Following ${selectedWrestler.shikona}` : `Unfollowed ${selectedWrestler.shikona}`);
            }
          }}
        />

        {/* Compare Bar */}
        <CompareBar
          selectedWrestlers={compareWrestlers}
          onRemove={handleRemoveFromCompare}
          onCompare={handleCompare}
          onCancel={handleCancelCompare}
        />

        {/* Comparison View */}
        <ComparisonView
          wrestlers={compareWrestlers}
          open={showComparison}
          onClose={() => setShowComparison(false)}
        />

        {/* Dashboard Settings */}
        <DashboardSettings
          open={showSettings}
          onClose={() => setShowSettings(false)}
          preferences={userPreferences}
          onToggleWidget={handleToggleWidget}
          onUpdateNotifications={handleUpdateNotifications}
        />
      </div>

      {/* Debug Section */}
      {debugInfo && (
        <details className="relative mb-8 bg-zinc-900 border border-zinc-800 rounded-lg">
          <summary className="cursor-pointer p-4 text-sm font-bold text-zinc-400 hover:text-white">
            🔍 Data Debug Info
          </summary>
          <div className="p-4 border-t border-zinc-800 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-zinc-500 font-bold">Latest Basho</div>
                <div className="text-white font-mono">{debugInfo.latestBasho}</div>
              </div>
              <div>
                <div className="text-zinc-500 font-bold">Wrestlers Displayed</div>
                <div className="text-white font-mono">{debugInfo.totalWrestlers}</div>
              </div>
              <div>
                <div className="text-zinc-500 font-bold">Basho Records Used</div>
                <div className="text-white font-mono">{debugInfo.totalBashoRecords}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-zinc-500 font-bold">Makuuchi Only</div>
                <div className="text-white font-mono">{debugInfo.makuuchiOnly ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <div className="text-zinc-500 font-bold">Stubs Excluded</div>
                <div className="text-white font-mono">{debugInfo.stubsExcluded}</div>
              </div>
            </div>
            <div>
              <div className="text-zinc-500 font-bold mb-2">Sample Rankings (First 5)</div>
              <div className="bg-black/50 p-2 rounded font-mono space-y-1">
                {debugInfo.sampleRankings.map((s, i) => (
                  <div key={i} className="text-zinc-300">
                    {i+1}. {s.shikona} | {s.rank} | {s.record} | Tier:{s.parsed.tier} #{s.parsed.number} {s.parsed.side}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>
      )}

      {/* Footer */}
      <footer className="relative text-center py-8 border-t border-zinc-900">
        <p className="text-xs text-zinc-600 font-bold uppercase tracking-wider">
          日本相撲協会 • JAPAN SUMO ASSOCIATION
        </p>
        {latestBasho && (
          <p className="text-xs text-zinc-700 mt-2">
            Records from {latestBasho} Basho
          </p>
        )}
      </footer>
    </div>
  );
}