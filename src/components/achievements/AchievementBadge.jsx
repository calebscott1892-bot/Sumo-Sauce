import React from 'react';
import { 
  Award, MessageSquare, ThumbsUp, TrendingUp, Users, Heart, 
  Star, Eye, Target, Crown, Sparkles 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const iconMap = {
  MessageSquare,
  ThumbsUp,
  TrendingUp,
  Award,
  Users,
  Heart,
  Star,
  Eye,
  Target,
  Crown,
  Sparkles
};

const rarityConfig = {
  common: {
    bg: 'from-zinc-700 to-zinc-800',
    border: 'border-zinc-600',
    glow: 'shadow-zinc-600/20',
    text: 'text-zinc-300'
  },
  rare: {
    bg: 'from-blue-700 to-blue-800',
    border: 'border-blue-500',
    glow: 'shadow-blue-500/30',
    text: 'text-blue-300'
  },
  epic: {
    bg: 'from-purple-700 to-purple-800',
    border: 'border-purple-500',
    glow: 'shadow-purple-500/40',
    text: 'text-purple-300'
  },
  legendary: {
    bg: 'from-amber-600 to-amber-700',
    border: 'border-amber-400',
    glow: 'shadow-amber-400/50',
    text: 'text-amber-200'
  }
};

export default function AchievementBadge({ achievement, size = 'md', showDetails = true }) {
  const Icon = iconMap[achievement.icon] || Award;
  const config = rarityConfig[achievement.rarity] || rarityConfig.common;
  
  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        "flex flex-col items-center gap-2 group cursor-pointer",
        showDetails && "max-w-xs"
      )}
    >
      <div className={cn(
        sizes[size],
        "relative rounded-full border-2 flex items-center justify-center bg-gradient-to-br shadow-lg transition-all",
        config.bg,
        config.border,
        config.glow
      )}>
        <Icon className={cn(iconSizes[size], config.text)} />
        {achievement.rarity === 'legendary' && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-amber-400/30"
          />
        )}
      </div>
      
      {showDetails && (
        <div className="text-center">
          <div className={cn("text-sm font-bold", config.text)}>
            {achievement.achievement_name}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {achievement.achievement_description}
          </div>
          <div className={cn("text-xs uppercase font-bold mt-1", config.text)}>
            {achievement.rarity}
          </div>
        </div>
      )}
    </motion.div>
  );
}