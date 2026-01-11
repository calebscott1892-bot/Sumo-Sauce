import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Trophy, TrendingUp, Calendar, Award, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import SaveComparisonDialog from './SaveComparisonDialog';

const StatRow = ({ label, values, icon: Icon }) => {
  // Find the best value(s)
  const numericValues = values.map(v => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const num = parseFloat(v);
      return isNaN(num) ? -Infinity : num;
    }
    return -Infinity;
  });
  
  const maxValue = Math.max(...numericValues);
  const bestIndices = numericValues.map((v, i) => v === maxValue && v !== -Infinity ? i : -1).filter(i => i !== -1);

  return (
    <div className="grid grid-cols-[200px_1fr] gap-4 border-b border-zinc-800 py-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-zinc-500" />}
        <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn(
        "grid gap-4",
        values.length === 2 ? "grid-cols-2" : "grid-cols-3"
      )}>
        {values.map((value, idx) => (
          <div key={idx} className={cn(
            "text-center py-2 transition-all",
            bestIndices.includes(idx) 
              ? "text-white font-black text-2xl" 
              : "text-zinc-600 text-lg"
          )}>
            {value ?? '—'}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ComparisonView({ wrestlers, open, onClose }) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  if (!wrestlers || wrestlers.length === 0) return null;

  const stats = [
    {
      label: 'Current Rank',
      values: wrestlers.map(w => w.rank),
      icon: Trophy
    },
    {
      label: 'Rank Position',
      values: wrestlers.map(w => w.rank_number || '—'),
      icon: null
    },
    {
      label: 'Side',
      values: wrestlers.map(w => w.side || '—'),
      icon: null
    },
    {
      label: 'Current Wins',
      values: wrestlers.map(w => w.wins),
      icon: TrendingUp
    },
    {
      label: 'Current Losses',
      values: wrestlers.map(w => w.losses),
      icon: null,
      reverse: true // Lower is better
    },
    {
      label: 'Career Wins',
      values: wrestlers.map(w => w.career_wins),
      icon: null
    },
    {
      label: 'Career Losses',
      values: wrestlers.map(w => w.career_losses),
      icon: null,
      reverse: true
    },
    {
      label: 'Tournament Titles',
      values: wrestlers.map(w => w.tournament_titles || 0),
      icon: Trophy
    },
    {
      label: 'Special Prizes',
      values: wrestlers.map(w => w.special_prizes || 0),
      icon: Award
    },
    {
      label: 'Height (cm)',
      values: wrestlers.map(w => w.height_cm),
      icon: null
    },
    {
      label: 'Weight (kg)',
      values: wrestlers.map(w => w.weight_kg),
      icon: null
    },
    {
      label: 'Debut Year',
      values: wrestlers.map(w => w.debut_year),
      icon: Calendar
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-black border-2 border-red-600 p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 via-red-700 to-red-900 border-b-4 border-red-500 p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-red-300 text-xs font-black tracking-[0.2em] uppercase mb-1">
                HEAD-TO-HEAD
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">
                Wrestler Comparison
              </h2>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowSaveDialog(true)}
                className="bg-white/10 hover:bg-white/20 text-white border-0"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Save & Share
              </Button>
              <button
                onClick={() => onClose(false)}
                className="p-2 hover:bg-white/10 transition-colors rounded"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Wrestler Cards */}
        <div className={cn(
          "grid gap-4 p-6 border-b border-zinc-800",
          wrestlers.length === 2 ? "grid-cols-2" : "grid-cols-3"
        )}>
          {wrestlers.map((wrestler) => (
            <motion.div
              key={wrestler.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 p-4"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 bg-zinc-800 overflow-hidden">
                  {wrestler.image_url ? (
                    <img src={wrestler.image_url} alt={wrestler.shikona} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-black text-zinc-600">
                      {wrestler.shikona?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black text-white">{wrestler.shikona}</h3>
                  {wrestler.real_name && (
                    <p className="text-xs text-zinc-500 mt-1">{wrestler.real_name}</p>
                  )}
                  {wrestler.stable && (
                    <p className="text-xs text-zinc-600 mt-1 uppercase font-bold">{wrestler.stable}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Comparison */}
        <div className="p-6">
          <h3 className="text-sm font-black text-zinc-400 uppercase tracking-wider mb-4">
            Statistics Comparison
          </h3>
          {stats.map((stat, idx) => (
            <StatRow key={idx} {...stat} />
          ))}
        </div>

        {/* Legend */}
        <div className="bg-zinc-900 border-t border-zinc-800 p-4 text-center">
          <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">
            <span className="text-white">★</span> White Text = Best Stat
          </p>
        </div>
      </DialogContent>

      <SaveComparisonDialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        wrestlers={wrestlers}
      />
    </Dialog>
  );
}