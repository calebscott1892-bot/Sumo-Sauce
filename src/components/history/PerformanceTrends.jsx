import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Trophy, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PerformanceTrends({ wrestler }) {
  const [activeChart, setActiveChart] = useState('winrate');

  // Generate sample performance data across bashos
  const generatePerformanceData = () => {
    if (!wrestler.career_timeline || wrestler.career_timeline.length === 0) {
      // Generate sample data if no real data exists
      const currentYear = new Date().getFullYear();
      const bashos = ['Hatsu', 'Haru', 'Natsu', 'Nagoya', 'Aki', 'Kyushu'];
      const data = [];
      
      for (let year = Math.max(currentYear - 2, wrestler.debut_year || currentYear - 2); year <= currentYear; year++) {
        bashos.forEach((basho, idx) => {
          const totalMatches = 15;
          const wins = Math.floor(Math.random() * 7) + 7; // 7-14 wins
          const losses = totalMatches - wins;
          
          data.push({
            basho: `${basho} ${year}`,
            wins,
            losses,
            winRate: ((wins / totalMatches) * 100).toFixed(1),
            rank: wrestler.rank,
          });
        });
      }
      
      return data.slice(-12); // Last 12 bashos (2 years)
    }
    
    return wrestler.career_timeline.slice(-12).map(entry => {
      const [wins, losses] = entry.record?.split('-').map(Number) || [8, 7];
      return {
        basho: entry.date,
        wins,
        losses,
        winRate: ((wins / (wins + losses)) * 100).toFixed(1),
        rank: entry.rank,
      };
    });
  };

  const performanceData = generatePerformanceData();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 p-3 rounded shadow-lg">
          <p className="text-white font-bold text-sm mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.name.includes('Rate') ? '%' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-bold text-white">Performance Trends</h3>
      </div>

      <Tabs value={activeChart} onValueChange={setActiveChart}>
        <TabsList className="bg-zinc-800 w-full">
          <TabsTrigger value="winrate" className="flex-1">Win Rate</TabsTrigger>
          <TabsTrigger value="record" className="flex-1">W/L Record</TabsTrigger>
        </TabsList>

        <TabsContent value="winrate" className="mt-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="basho" 
                stroke="#9CA3AF"
                style={{ fontSize: '10px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="winRate" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', r: 4 }}
                name="Win Rate"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-center text-xs text-zinc-500 mt-2">
            Last 12 tournaments
          </div>
        </TabsContent>

        <TabsContent value="record" className="mt-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="basho" 
                stroke="#9CA3AF"
                style={{ fontSize: '10px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="wins" fill="#10B981" name="Wins" />
              <Bar dataKey="losses" fill="#EF4444" name="Losses" />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-center text-xs text-zinc-500 mt-2">
            Last 12 tournaments
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-zinc-800/50 p-3 rounded text-center">
          <div className="text-2xl font-black text-blue-400">
            {(performanceData.reduce((sum, d) => sum + parseFloat(d.winRate), 0) / performanceData.length).toFixed(1)}%
          </div>
          <div className="text-xs text-zinc-500">Avg Win Rate</div>
        </div>
        <div className="bg-zinc-800/50 p-3 rounded text-center">
          <div className="text-2xl font-black text-green-400">
            {performanceData.reduce((sum, d) => sum + d.wins, 0)}
          </div>
          <div className="text-xs text-zinc-500">Total Wins</div>
        </div>
        <div className="bg-zinc-800/50 p-3 rounded text-center">
          <div className="text-2xl font-black text-red-400">
            {performanceData.reduce((sum, d) => sum + d.losses, 0)}
          </div>
          <div className="text-xs text-zinc-500">Total Losses</div>
        </div>
      </div>
    </div>
  );
}