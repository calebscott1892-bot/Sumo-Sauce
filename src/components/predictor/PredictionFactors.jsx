import React from 'react';
import { CheckCircle, TrendingUp, Trophy, Zap, Weight } from 'lucide-react';

export default function PredictionFactors({ prediction, wrestler1, wrestler2 }) {
  if (!prediction || !wrestler1 || !wrestler2 || !prediction.factors) return null;

  const factors = [
    {
      label: 'Rank Advantage',
      winner: prediction.factors.rankAdvantage,
      icon: Trophy
    },
    {
      label: 'Better Win Rate',
      winner: prediction.factors.betterWinRate,
      icon: TrendingUp
    },
    {
      label: 'Current Form',
      winner: prediction.factors.betterForm,
      icon: Zap
    },
    {
      label: 'Experience',
      winner: prediction.factors.moreExperience,
      icon: CheckCircle
    }
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h3 className="text-xl font-black text-white mb-4">Key Factors</h3>
      <div className="grid grid-cols-2 gap-4">
        {factors.map((factor, idx) => {
          const Icon = factor.icon;
          const wrestler = factor.winner === wrestler1.id ? wrestler1 : wrestler2;
          return (
            <div key={idx} className="bg-zinc-800/50 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-zinc-400">{factor.label}</span>
              </div>
              <div className="text-white font-bold">{wrestler.shikona}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded">
        <div className="text-sm text-blue-400 mb-1">AI Confidence</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-zinc-800 rounded-full h-2">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all"
              style={{ width: `${prediction.confidence}%` }}
            />
          </div>
          <span className="text-blue-400 font-bold text-sm">{prediction.confidence.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}