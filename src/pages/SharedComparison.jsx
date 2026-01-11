import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ThumbsUp, Eye, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SharedComparison() {
  const urlParams = new URLSearchParams(window.location.search);
  const reportId = urlParams.get('id');
  const queryClient = useQueryClient();

  const { data: report, isLoading } = useQuery({
    queryKey: ['comparison-report', reportId],
    queryFn: async () => {
      const allReports = await api.entities.ComparisonReport.list('-created_date', 200);
      return allReports.find(r => r.id === reportId);
    },
    enabled: !!reportId,
  });

  const { data: wrestlers = [] } = useQuery({
    queryKey: ['wrestlers-for-comparison', report?.wrestler_ids],
    queryFn: async () => {
      const all = await api.entities.Wrestler.list('-rank', 500);
      return all.filter(w => report.wrestler_ids.includes(w.id));
    },
    enabled: !!report?.wrestler_ids,
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => api.auth.me(),
  });

  // Increment view count
  useEffect(() => {
    if (report && reportId) {
      api.entities.ComparisonReport.update(reportId, {
        views: (report.views || 0) + 1
      });
    }
  }, [report?.id]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const likedBy = report.liked_by || [];
      const hasLiked = likedBy.includes(user.email);
      
      return api.entities.ComparisonReport.update(reportId, {
        likes: hasLiked ? report.likes - 1 : report.likes + 1,
        liked_by: hasLiked 
          ? likedBy.filter(e => e !== user.email)
          : [...likedBy, user.email]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['comparison-report', reportId]);
      toast.success('Thanks for your feedback!');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-500">Loading comparison...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-500 mb-4">Comparison not found</div>
          <Link to="/Leaderboard">
            <Button className="bg-red-600 hover:bg-red-700">Back to Leaderboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!report.is_public) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-500 mb-4">This comparison is private</div>
          <Link to="/Leaderboard">
            <Button className="bg-red-600 hover:bg-red-700">Back to Leaderboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const StatRow = ({ label, values, icon: Icon }) => {
    const max = Math.max(...values.filter(v => v !== undefined && v !== null));
    
    return (
      <div className="py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          {Icon && <Icon className="w-4 h-4 text-zinc-500" />}
          <span className="text-sm text-zinc-400 font-bold">{label}</span>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${wrestlers.length}, 1fr)` }}>
          {values.map((value, idx) => (
            <div
              key={idx}
              className={`text-center p-2 rounded ${
                value === max && max > 0 ? 'bg-amber-900/30 border border-amber-700' : 'bg-zinc-800/50'
              }`}
            >
              <span className={`font-black ${value === max && max > 0 ? 'text-amber-400' : 'text-white'}`}>
                {value ?? 'N/A'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-black to-red-950/20 pointer-events-none" />
      
      <div className="relative max-w-5xl mx-auto px-4 py-8">
        <Link to="/Leaderboard">
          <Button variant="ghost" size="sm" className="mb-6 text-zinc-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Button>
        </Link>

        <div className="bg-zinc-900 border-2 border-zinc-800 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-black text-white mb-2">{report.title}</h1>
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <span>by {report.created_by}</span>
                <span>•</span>
                <span>{format(new Date(report.created_date), 'MMM d, yyyy')}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {report.views || 0}
                </div>
              </div>
            </div>
            
            <Button
              onClick={() => likeMutation.mutate()}
              variant="outline"
              className={`border-zinc-700 ${
                report.liked_by?.includes(user?.email)
                  ? 'text-red-500 border-red-700'
                  : 'text-zinc-400'
              }`}
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              {report.likes || 0}
            </Button>
          </div>

          {report.notes && (
            <div className="bg-zinc-800/50 p-4 rounded border-l-4 border-red-600">
              <div className="text-sm text-zinc-400 whitespace-pre-wrap">{report.notes}</div>
            </div>
          )}
        </div>

        {/* Wrestlers */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `repeat(${wrestlers.length}, 1fr)` }}>
          {wrestlers.map((wrestler) => (
            <div key={wrestler.id} className="bg-zinc-900 border border-zinc-800 p-4 text-center">
              {wrestler.image_url && (
                <img
                  src={wrestler.image_url}
                  alt={wrestler.shikona}
                  className="w-24 h-24 mx-auto mb-3 object-cover"
                />
              )}
              <h3 className="text-xl font-black text-white mb-1">{wrestler.shikona}</h3>
              <div className="text-sm text-zinc-500">{wrestler.rank}</div>
            </div>
          ))}
        </div>

        {/* Stats Comparison */}
        <div className="bg-zinc-900 border border-zinc-800 p-6">
          <h2 className="text-2xl font-black text-white mb-6">Statistics</h2>
          
          <StatRow
            label="Current Tournament Wins"
            values={wrestlers.map(w => w.wins)}
          />
          <StatRow
            label="Current Tournament Losses"
            values={wrestlers.map(w => w.losses)}
          />
          <StatRow
            label="Career Wins"
            values={wrestlers.map(w => w.career_wins)}
          />
          <StatRow
            label="Career Losses"
            values={wrestlers.map(w => w.career_losses)}
          />
          <StatRow
            label="Tournament Titles"
            values={wrestlers.map(w => w.tournament_titles)}
          />
          <StatRow
            label="Special Prizes"
            values={wrestlers.map(w => w.special_prizes)}
          />
        </div>
      </div>
    </div>
  );
}