import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function DailyResultsBreakdown({ rankChanges, onWrestlerClick }) {
  if (!rankChanges || rankChanges.length === 0) return null;

  // Take top 5 wrestlers for clarity
  const topWrestlers = rankChanges.slice(0, 5);
  
  // Prepare daily data
  const dailyData = [];
  for (let day = 1; day <= 15; day++) {
    const dayData = { day: `Day ${day}` };
    topWrestlers.forEach(wrestler => {
      const record = wrestler.daily_records?.find(r => r.day === day);
      if (record) {
        dayData[wrestler.wrestler_name] = record.wins;
      }
    });
    dailyData.push(dayData);
  }

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6">
      <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        Daily Results - Top Wrestlers
      </h3>
      <div className="mb-4 flex flex-wrap gap-2">
        {topWrestlers.map((wrestler, idx) => (
          <button
            key={wrestler.wrestler_id}
            onClick={() => onWrestlerClick?.(wrestler.wrestler_name)}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-sm text-white transition-colors"
            style={{ borderLeftColor: colors[idx], borderLeftWidth: '3px' }}
          >
            {wrestler.wrestler_name}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={dailyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
          <XAxis dataKey="day" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
          <YAxis stroke="#9CA3AF" label={{ value: 'Wins', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46' }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend />
          {topWrestlers.map((wrestler, idx) => (
            <Bar
              key={wrestler.wrestler_id}
              dataKey={wrestler.wrestler_name}
              fill={colors[idx]}
              onClick={() => onWrestlerClick?.(wrestler.wrestler_name)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}