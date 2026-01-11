import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
import AchievementBadge from './AchievementBadge';

export default function AchievementNotification({ achievement, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          className="fixed top-4 right-4 z-50 bg-zinc-900 border-2 border-amber-500 rounded-lg p-4 shadow-2xl max-w-sm"
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-4">
            <Trophy className="w-8 h-8 text-amber-400" />
            <div className="flex-1">
              <div className="text-amber-400 text-xs font-black uppercase tracking-wider mb-1">
                Achievement Unlocked!
              </div>
              <div className="text-white font-bold text-lg">
                {achievement.achievement_name}
              </div>
              <div className="text-zinc-400 text-sm mt-1">
                {achievement.achievement_description}
              </div>
            </div>
          </div>
          
          <div className="mt-3 flex justify-center">
            <AchievementBadge achievement={achievement} size="sm" showDetails={false} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}