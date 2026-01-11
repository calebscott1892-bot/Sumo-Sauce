import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function WinLossDistribution({ rankChanges }) {
  if (!rankChanges || rankChanges.length === 0) return null;

  // Calculate final records for all wrestlers
  const recordDistribution = {
    '12+ wins': 0,
    '10-11 wins': 0,
    '8-9 wins': 0,
    '6-7 wins': 0,
    '5 or fewer': 0
  };

  rankChanges.forEach(wrestler => {
    const lastDay = wrestler.daily_records?.[wrestler.daily_records.length - 1];
    const wins = lastDay?.wins || 0;
    
    if (wins >= 12) recordDistribution['12+ wins']++;
    else if (wins >= 10) recordDistribution['10-11 wins']++;
    else if (wins >= 8) recordDistribution['8-9 wins']++;
    else if (wins >= 6) recordDistribution['6-7 wins']++;
    else recordDistribution['5 or fewer']++;
  });

  const data = Object.entries(recordDistribution)
    .filter(([_, count]) => count > 0)
    .map(([range, count]) => ({ name: range, value: count }));

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#6B7280'];

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6">
      <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-green-400" />
        Final Record Distribution
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}