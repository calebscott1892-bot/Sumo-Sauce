import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Filter, X, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AdvancedFilters({ filters, onFiltersChange, onClear }) {
  const [expanded, setExpanded] = React.useState(false);

  const handleChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== 'all' && v !== '').length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-bold text-white">Advanced Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <Filter className={cn(
          "w-4 h-4 text-zinc-400 transition-transform",
          expanded && "rotate-180"
        )} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-zinc-800"
          >
            <div className="p-4 space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                {/* Rank Search */}
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase mb-2 block">
                    Rank
                  </label>
                  <Select value={filters.rank || 'all'} onValueChange={(v) => handleChange('rank', v)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="All Ranks" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all" className="text-white hover:bg-zinc-700 focus:bg-zinc-700">All Ranks</SelectItem>
                      <SelectItem value="Yokozuna" className="text-white hover:bg-zinc-700 focus:bg-zinc-700">Yokozuna</SelectItem>
                      <SelectItem value="Ozeki" className="text-white hover:bg-zinc-700 focus:bg-zinc-700">Ozeki</SelectItem>
                      <SelectItem value="Sekiwake" className="text-white hover:bg-zinc-700 focus:bg-zinc-700">Sekiwake</SelectItem>
                      <SelectItem value="Komusubi" className="text-white hover:bg-zinc-700 focus:bg-zinc-700">Komusubi</SelectItem>
                      <SelectItem value="Maegashira" className="text-white hover:bg-zinc-700 focus:bg-zinc-700">Maegashira</SelectItem>
                      <SelectItem value="Juryo" className="text-white hover:bg-zinc-700 focus:bg-zinc-700">Juryo</SelectItem>
                      <SelectItem value="Makushita" className="text-white hover:bg-zinc-700 focus:bg-zinc-700">Makushita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Active Status */}
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase mb-2 block">
                    Status
                  </label>
                  <Select value={filters.activeStatus || 'all'} onValueChange={(v) => handleChange('activeStatus', v)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="All Wrestlers" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all" className="text-white hover:bg-zinc-700 focus:bg-zinc-700">All Wrestlers</SelectItem>
                      <SelectItem value="active" className="text-white hover:bg-zinc-700 focus:bg-zinc-700">Active Only</SelectItem>
                      <SelectItem value="inactive" className="text-white hover:bg-zinc-700 focus:bg-zinc-700">Retired Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Country Filter */}
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase mb-2 block">
                    Country
                  </label>
                  <Input
                    placeholder="e.g., Japan, Mongolia"
                    value={filters.country || ''}
                    onChange={(e) => handleChange('country', e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Min Win Rate */}
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase mb-2 block">
                    Min Win Rate %
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g., 50"
                    value={filters.minWinRate || ''}
                    onChange={(e) => handleChange('minWinRate', e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>

                {/* Tournament Performance */}
                <div>
                  <label className="text-xs text-zinc-500 font-bold uppercase mb-2 block">
                    Current Tournament
                  </label>
                  <Select value={filters.tournamentPerformance || 'all'} onValueChange={(v) => handleChange('tournamentPerformance', v)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all" className="text-white hover:bg-zinc-700 focus:bg-zinc-700">All</SelectItem>
                      <SelectItem value="winning" className="text-white hover:bg-zinc-700 focus:bg-zinc-700">Winning Record</SelectItem>
                      <SelectItem value="losing" className="text-white hover:bg-zinc-700 focus:bg-zinc-700">Losing Record</SelectItem>
                      <SelectItem value="even" className="text-white hover:bg-zinc-700 focus:bg-zinc-700">Even Record</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClear}
                  className="border-zinc-700 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}