import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Trophy, Crown, Star, Flame, TrendingUp, Medal } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

const ALLOW_EXTERNAL_IMAGES = import.meta.env.VITE_ENABLE_EXTERNAL_IMAGES === 'true';

const legends = [
  {
    id: 1,
    name: 'Hakuho Sho',
    rank: 'Yokozuna',
    era: '2001-2021',
    titles: 45,
    wins: 1187,
    losses: 247,
    winRate: 82.8,
    specialPrizes: 0,
    kinboshi: 0,
    peakDominance: 95,
    longevity: 98,
    technique: 88,
    impact: 100,
    image: 'https://images.unsplash.com/photo-1555817129-e96b5d2c9cda?w=400&h=400&fit=crop',
    bio: 'Widely considered the greatest sumo wrestler of all time, holding the all-time record for tournament championships.',
  },
  {
    id: 2,
    name: 'Taiho Koki',
    rank: 'Yokozuna',
    era: '1956-1971',
    titles: 32,
    wins: 872,
    losses: 182,
    winRate: 82.7,
    specialPrizes: 0,
    kinboshi: 0,
    peakDominance: 90,
    longevity: 92,
    technique: 92,
    impact: 98,
    image: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=400&h=400&fit=crop',
    bio: 'Dominated the 1960s and held the championship record for decades until surpassed by Hakuho.',
  },
  {
    id: 3,
    name: 'Chiyonofuji',
    rank: 'Yokozuna',
    era: '1970-1991',
    titles: 31,
    wins: 1045,
    losses: 234,
    winRate: 81.7,
    specialPrizes: 0,
    kinboshi: 0,
    peakDominance: 88,
    longevity: 95,
    technique: 90,
    impact: 94,
    image: 'https://images.unsplash.com/photo-1583468323330-9032ad490fed?w=400&h=400&fit=crop',
    bio: 'Known as "The Wolf" for his fierce technique and longevity at the highest level.',
  },
  {
    id: 4,
    name: 'Asashoryu',
    rank: 'Yokozuna',
    era: '1999-2010',
    titles: 25,
    wins: 744,
    losses: 144,
    winRate: 83.8,
    specialPrizes: 5,
    kinboshi: 0,
    peakDominance: 92,
    longevity: 75,
    technique: 86,
    impact: 88,
    image: 'https://images.unsplash.com/photo-1566140967404-b8b3932483f5?w=400&h=400&fit=crop',
    bio: 'The first Mongolian yokozuna who dominated the early 2000s with aggressive style.',
  },
  {
    id: 5,
    name: 'Kitanoumi',
    rank: 'Yokozuna',
    era: '1967-1985',
    titles: 24,
    wins: 804,
    losses: 247,
    winRate: 76.5,
    specialPrizes: 0,
    kinboshi: 0,
    peakDominance: 85,
    longevity: 88,
    technique: 84,
    impact: 86,
    image: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400&h=400&fit=crop',
    bio: 'Youngest yokozuna at the time of promotion, dominated the late 1970s.',
  },
  {
    id: 6,
    name: 'Takanohana',
    rank: 'Yokozuna',
    era: '1988-2003',
    titles: 22,
    wins: 794,
    losses: 262,
    winRate: 75.2,
    specialPrizes: 0,
    kinboshi: 0,
    peakDominance: 86,
    longevity: 90,
    technique: 88,
    impact: 92,
    image: 'https://images.unsplash.com/photo-1551522435-a13afa10f103?w=400&h=400&fit=crop',
    bio: 'Popular yokozuna of the 1990s, known for technical excellence and fierce rivalries.',
  },
];

export default function SumoLegends() {
  const [selectedLegends, setSelectedLegends] = useState([legends[0].id, legends[1].id]);
  const [imageErrorById, setImageErrorById] = useState({});

  const toggleLegend = (id) => {
    if (selectedLegends.includes(id)) {
      if (selectedLegends.length > 1) {
        setSelectedLegends(selectedLegends.filter(l => l !== id));
      }
    } else if (selectedLegends.length < 3) {
      setSelectedLegends([...selectedLegends, id]);
    }
  };

  const selectedLegendsData = legends.filter(l => selectedLegends.includes(l.id));

  const radarData = [
    { stat: 'Peak Dominance', ...selectedLegendsData.reduce((acc, l) => ({ ...acc, [l.name]: l.peakDominance }), {}) },
    { stat: 'Longevity', ...selectedLegendsData.reduce((acc, l) => ({ ...acc, [l.name]: l.longevity }), {}) },
    { stat: 'Technique', ...selectedLegendsData.reduce((acc, l) => ({ ...acc, [l.name]: l.technique }), {}) },
    { stat: 'Impact', ...selectedLegendsData.reduce((acc, l) => ({ ...acc, [l.name]: l.impact }), {}) },
  ];

  const titlesData = selectedLegendsData.map(l => ({
    name: l.name.split(' ')[0],
    titles: l.titles,
    wins: Math.floor(l.wins / 10),
  }));

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-black to-amber-950/20 pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        <Link to="/Leaderboard">
          <Button variant="ghost" size="sm" className="mb-6 text-zinc-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Button>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="w-12 h-12 text-amber-400" />
            <h1 className="text-5xl font-black text-white uppercase tracking-tight">
              相撲伝説
            </h1>
            <Crown className="w-12 h-12 text-amber-400" />
          </div>
          <p className="text-zinc-400 text-lg font-bold uppercase tracking-wider">
            <Link to="/SumoGame" className="cursor-pointer hover:opacity-70">Sumo</Link> Legends
          </p>
          <p className="text-zinc-600 mt-2">
            Compare the greatest yokozuna in <Link to={createPageUrl('SumoGame')} className="cursor-pointer hover:opacity-70">sumo</Link> history
          </p>
        </motion.div>

        {/* Legend Selection */}
        <div className="mb-12">
          <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            SELECT LEGENDS TO COMPARE (max 3)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {legends.map((legend, idx) => (
              <motion.button
                key={legend.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => toggleLegend(legend.id)}
                className={`relative bg-zinc-900 border-2 p-4 text-left transition-all ${
                  selectedLegends.includes(legend.id)
                    ? 'border-amber-500 bg-amber-900/20'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {selectedLegends.includes(legend.id) && (
                  <div className="absolute top-2 right-2 bg-amber-500 rounded-full p-1">
                    <Star className="w-4 h-4 text-black fill-black" />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  {ALLOW_EXTERNAL_IMAGES && !imageErrorById[legend.id] ? (
                    <img
                      src={legend.image}
                      alt={legend.name}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setImageErrorById((prev) => ({
                          ...prev,
                          [legend.id]: true,
                        }))
                      }
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-zinc-800 rounded flex items-center justify-center text-zinc-500 font-black">
                      {legend.name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((s) => s[0])
                        .join('')}
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-black">{legend.name}</h3>
                    <div className="text-xs text-zinc-500">{legend.era}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 font-black">{legend.titles}</span>
                  <span className="text-zinc-600 text-xs">Championships</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Comparison Charts */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Radar Chart */}
          <div className="bg-zinc-900 border border-zinc-800 p-6">
            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-400" />
              OVERALL DOMINANCE
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#3F3F46" />
                <PolarAngleAxis dataKey="stat" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#9CA3AF' }} />
                {selectedLegendsData.map((legend, idx) => (
                  <Radar
                    key={legend.id}
                    name={legend.name}
                    dataKey={legend.name}
                    stroke={colors[idx]}
                    fill={colors[idx]}
                    fillOpacity={0.3}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="bg-zinc-900 border border-zinc-800 p-6">
            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              CHAMPIONSHIPS & WINS
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={titlesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="titles" fill="#F59E0B" name="Championships" />
                <Bar dataKey="wins" fill="#3B82F6" name="Wins (÷10)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Comparison Table */}
        <div className="bg-zinc-900 border border-zinc-800 p-6">
          <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
            <Medal className="w-5 h-5 text-purple-400" />
            CAREER STATISTICS
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-500 font-black uppercase text-xs p-3">Legend</th>
                  <th className="text-center text-zinc-500 font-black uppercase text-xs p-3">Era</th>
                  <th className="text-center text-zinc-500 font-black uppercase text-xs p-3">Titles</th>
                  <th className="text-center text-zinc-500 font-black uppercase text-xs p-3">Career W-L</th>
                  <th className="text-center text-zinc-500 font-black uppercase text-xs p-3">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {selectedLegendsData.map((legend) => (
                  <tr key={legend.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={legend.image} alt={legend.name} className="w-10 h-10 object-cover rounded" />
                        <div>
                          <div className="text-white font-bold">{legend.name}</div>
                          <div className="text-xs text-zinc-600">{legend.rank}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center text-zinc-400 p-3">{legend.era}</td>
                    <td className="text-center p-3">
                      <span className="text-amber-400 font-black text-lg">{legend.titles}</span>
                    </td>
                    <td className="text-center text-zinc-300 p-3">{legend.wins}-{legend.losses}</td>
                    <td className="text-center p-3">
                      <span className="text-green-400 font-bold">{legend.winRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Biographies */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {selectedLegendsData.map((legend, idx) => (
            <motion.div
              key={legend.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-zinc-900 border border-zinc-800 p-6"
            >
              <div className="flex items-start gap-4 mb-4">
                <img src={legend.image} alt={legend.name} className="w-20 h-20 object-cover rounded" />
                <div className="flex-1">
                  <h4 className="text-xl font-black text-white mb-1">{legend.name}</h4>
                  <div className="text-sm text-zinc-500">{legend.era}</div>
                </div>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">{legend.bio}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}