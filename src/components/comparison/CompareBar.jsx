import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CompareBar({ selectedWrestlers, onRemove, onCompare, onCancel }) {
  if (selectedWrestlers.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-red-900 via-red-700 to-red-900 
                   border-t-4 border-red-500 shadow-2xl z-50"
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Swords className="w-6 h-6 text-white" />
              <span className="text-white font-black text-sm uppercase tracking-wider">
                Compare Mode: {selectedWrestlers.length} Selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedWrestlers.map((w) => (
                <div key={w.id} className="flex items-center gap-2 bg-black/30 px-3 py-2 border border-white/20">
                  <span className="text-white font-bold text-sm">{w.shikona}</span>
                  <button
                    onClick={() => onRemove(w.id)}
                    className="hover:bg-white/20 p-0.5 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={onCancel}
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10 font-black text-xs uppercase"
              >
                Cancel
              </Button>
              <Button
                onClick={onCompare}
                disabled={selectedWrestlers.length < 2}
                size="sm"
                className="bg-white text-red-900 hover:bg-gray-100 font-black text-xs uppercase"
              >
                <Swords className="w-4 h-4 mr-2" />
                Compare ({selectedWrestlers.length})
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}