import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';

export default function SortControls({ sortBy, onSortChange }) {
  const sortOptions = [
    { value: 'wins_desc', label: '🏆 Tournament Standings (W-L)', icon: '📊' },
    { value: 'rank', label: 'Official Banzuke Rank', icon: '📋' },
    { value: 'name', label: 'Name (A-Z)', icon: '🔤' },
    { value: 'winrate_desc', label: 'Best Career Win Rate', icon: '📈' },
    { value: 'career_wins', label: 'Most Career Wins', icon: '🎯' },
    { value: 'titles', label: 'Most Championships', icon: '👑' }
  ];

  const currentOption = sortOptions.find(opt => opt.value === sortBy);

  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="w-4 h-4 text-zinc-500" />
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white font-bold w-[260px]">
          <SelectValue>
            <span className="flex items-center gap-2">
              <span>{currentOption?.icon}</span>
              <span className="text-sm">{currentOption?.label || 'Sort by...'}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-zinc-800 border-zinc-700">
          {sortOptions.map(option => (
            <SelectItem 
              key={option.value} 
              value={option.value} 
              className="text-white hover:bg-zinc-700 focus:bg-zinc-700 font-medium"
            >
              <span className="flex items-center gap-2">
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}