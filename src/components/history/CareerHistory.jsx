import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Award, Trophy, Target, Zap, Shield } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';

const KIMARITE_COLORS = [
  '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#10b981',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

export default function CareerHistory({ wrestler }) {
  if (!wrestler) return null;

  // Career stats
  const totalMatches = (wrestler.career_wins || 0) + (wrestler.career_losses || 0);
  const winRate = totalMatches > 0 ? ((wrestler.career_wins || 0) / totalMatches * 100).toFixed(1) : 0;
  const yearsActive = wrestler.debut_year ? new Date().getFullYear() - wrestler.debut_year : 0;

  // Kimarite (winning techniques) data
  const kimariteData = wrestler.kimarite_stats 
    ? Object.entries(wrestler.kimarite_stats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }))
    : [];

  // Timeline data (simplified for visualization)
  const timelineData = wrestler.career_timeline?.slice(-12) || [];

  // Championship data
  const yushoCount = wrestler.yusho_wins?.length || 0;

  return (
    <div className="space-y-6">
      {/* Career Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Trophy}
          label="Yusho Titles"
          value={yushoCount}
          sublabel="Championships"
          color="text-amber-400"
          bg="bg-amber-900/20"
        />
        <StatCard
          icon={Target}
          label="Win Rate"
          value={`${winRate}%`}
          sublabel={`${wrestler.career_wins || 0}-${wrestler.career_losses || 0}`}
          color="text-green-400"
          bg="bg-green-900/20"
        />
        <StatCard
          icon={Zap}
          label="Kinboshi"
          value={wrestler.kinboshi || 0}
          sublabel="Gold Stars"
          color="text-yellow-400"
          bg="bg-yellow-900/20"
        />
        <StatCard
          icon={Award}
          label="Special Prizes"
          value={wrestler.special_prizes || 0}
          sublabel="Sansho Awards"
          color="text-purple-400"
          bg="bg-purple-900/20"
        />
      </div>

      {/* Career Info */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 space-y-2">
        <InfoRow label="Professional Debut" value={wrestler.debut_year || 'Unknown'} />
        <InfoRow label="Years Active" value={yearsActive > 0 ? `${yearsActive} years` : 'N/A'} />
        <InfoRow label="Highest Rank" value={wrestler.highest_rank || wrestler.rank} />
        {wrestler.highest_rank_date && (
          <InfoRow label="Peak Achievement" value={wrestler.highest_rank_date} />
        )}
        <InfoRow label="Fighting Style" value={wrestler.fighting_style || 'Not specified'} />
      </div>

      {/* Tournament Victories */}
      {wrestler.yusho_wins && wrestler.yusho_wins.length > 0 && (
        <div className="bg-zinc-900 border border-amber-600 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-amber-400 font-black uppercase text-sm tracking-wider">
              Championship Victories
            </h3>
          </div>
          <div className="space-y-2">
            {wrestler.yusho_wins.map((win, idx) => (
              <div key={idx} className="flex justify-between items-center border-l-2 border-amber-600 pl-3 py-1">
                <span className="text-white font-bold text-sm">{win.basho} {win.year}</span>
                <span className="text-zinc-400 text-sm">{win.record}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kimarite Distribution */}
      {kimariteData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-blue-500" />
            <h3 className="text-blue-400 font-black uppercase text-sm tracking-wider">
              Winning Techniques (Kimarite)
            </h3>
          </div>
          
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={kimariteData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#18181b', 
                  border: '1px solid #3f3f46',
                  borderRadius: '4px'
                }}
                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
              />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 text-xs text-zinc-500 leading-relaxed">
            <strong className="text-zinc-400">Common Kimarite:</strong> Yorikiri (force out), 
            Oshidashi (push out), Hatakikomi (slap down), Tsukiotoshi (thrust down), 
            Uwatenage (overarm throw)
          </div>
        </div>
      )}

      {/* Rank Timeline */}
      {timelineData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="text-green-400 font-black uppercase text-sm tracking-wider">
              Recent Performance Timeline
            </h3>
          </div>
          
          <div className="space-y-2">
            {timelineData.map((entry, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-zinc-800 last:border-0">
                <span className="text-zinc-400">{entry.date}</span>
                <span className="text-white font-bold">{entry.rank}</span>
                <span className="text-zinc-500">{entry.record}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notable Achievements */}
      {wrestler.notable_achievements && wrestler.notable_achievements.length > 0 && (
        <div className="bg-zinc-900 border border-purple-600 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-purple-500" />
            <h3 className="text-purple-400 font-black uppercase text-sm tracking-wider">
              Notable Achievements
            </h3>
          </div>
          <ul className="space-y-2">
            {wrestler.notable_achievements.map((achievement, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-purple-400 mt-1">•</span>
                <span className="text-zinc-300">{achievement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Educational Context */}
      <div className="bg-amber-900/10 border border-amber-600/30 p-4">
        <p className="text-amber-300 text-xs leading-relaxed">
          <strong>About Rankings:</strong> A wrestler's journey typically starts in Jonokuchi (序ノ口) 
          and progresses through Jonidan, Sandanme, Makushita, Juryo, and finally Makuuchi—the top division. 
          Only the strongest reach the san'yaku ranks: Komusubi, Sekiwake, Ozeki, and the legendary Yokozuna. 
          Promotion requires consistent winning records (kachi-koshi), while losing records (make-koshi) 
          result in demotion. The journey from debut to Makuuchi typically takes 3-5 years for talented wrestlers.
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sublabel, color, bg }) {
  return (
    <div className={cn("p-4 border border-zinc-800", bg)}>
      <Icon className={cn("w-5 h-5 mb-2", color)} />
      <div className={cn("text-2xl font-black mb-1", color)}>{value}</div>
      <div className="text-xs text-zinc-500 font-bold uppercase">{label}</div>
      {sublabel && <div className="text-xs text-zinc-600 mt-1">{sublabel}</div>}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center text-sm border-b border-zinc-800 pb-2 last:border-0 last:pb-0">
      <span className="text-zinc-500 font-medium">{label}</span>
      <span className="text-white font-bold">{value}</span>
    </div>
  );
}