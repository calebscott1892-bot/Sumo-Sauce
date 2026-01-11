import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const StarRating = ({ value, onChange, readonly = false }) => {
  const [hover, setHover] = useState(0);
  
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          disabled={readonly}
          className={`transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <Star
            className={`w-6 h-6 ${
              star <= (hover || value)
                ? 'fill-amber-400 text-amber-400'
                : 'text-zinc-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default function WrestlerRatingCard({ wrestler }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [categories, setCategories] = useState({
    technique: 0,
    power: 0,
    speed: 0,
    entertainment: 0,
  });
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => api.auth.me(),
  });

  const { data: allRatings = [] } = useQuery({
    queryKey: ['wrestler-ratings', wrestler.id],
    queryFn: async () => {
      const all = await api.entities.WrestlerRating.list('-created_date', 500);
      return all.filter(r => r.wrestler_id === wrestler.id);
    },
  });

  const { data: userRating } = useQuery({
    queryKey: ['user-rating', wrestler.id, user?.email],
    queryFn: async () => {
      const all = await api.entities.WrestlerRating.list('-created_date', 500);
      return all.find(r => r.wrestler_id === wrestler.id && r.created_by === user.email);
    },
    enabled: !!user,
  });

  const createRatingMutation = useMutation({
    mutationFn: (data) => api.entities.WrestlerRating.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['wrestler-ratings', wrestler.id]);
      queryClient.invalidateQueries(['user-rating', wrestler.id, user?.email]);
      toast.success('Rating submitted!');
      setRating(0);
      setComment('');
      setCategories({ technique: 0, power: 0, speed: 0, entertainment: 0 });
    },
  });

  const updateRatingMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.WrestlerRating.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['wrestler-ratings', wrestler.id]);
      queryClient.invalidateQueries(['user-rating', wrestler.id, user?.email]);
      toast.success('Rating updated!');
    },
  });

  const avgRating = allRatings.length > 0
    ? (allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length).toFixed(1)
    : 'N/A';

  const avgCategories = allRatings.length > 0 ? {
    technique: (allRatings.reduce((sum, r) => sum + (r.categories?.technique || 0), 0) / allRatings.length).toFixed(1),
    power: (allRatings.reduce((sum, r) => sum + (r.categories?.power || 0), 0) / allRatings.length).toFixed(1),
    speed: (allRatings.reduce((sum, r) => sum + (r.categories?.speed || 0), 0) / allRatings.length).toFixed(1),
    entertainment: (allRatings.reduce((sum, r) => sum + (r.categories?.entertainment || 0), 0) / allRatings.length).toFixed(1),
  } : null;

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    const data = {
      wrestler_id: wrestler.id,
      rating,
      comment: comment.trim() || undefined,
      categories: Object.values(categories).some(v => v > 0) ? categories : undefined,
    };

    if (userRating) {
      updateRatingMutation.mutate({ id: userRating.id, data });
    } else {
      createRatingMutation.mutate(data);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-6">
      {/* Average Rating */}
      <div className="text-center border-b border-zinc-800 pb-6">
        <div className="text-5xl font-black text-white mb-2">{avgRating}</div>
        <StarRating value={parseFloat(avgRating)} readonly />
        <div className="text-sm text-zinc-500 mt-2">
          Based on {allRatings.length} {allRatings.length === 1 ? 'rating' : 'ratings'}
        </div>
      </div>

      {/* Category Averages */}
      {avgCategories && (
        <div className="grid grid-cols-2 gap-4 border-b border-zinc-800 pb-6">
          {Object.entries(avgCategories).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="text-xs text-zinc-500 uppercase mb-1 font-bold">{key}</div>
              <div className="text-2xl font-black text-amber-400">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* User Rating Form */}
      <div>
        <h3 className="text-lg font-black text-white mb-4">
          {userRating ? 'Update Your Rating' : 'Rate This Wrestler'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Overall Rating</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block uppercase">Technique</label>
              <StarRating
                value={categories.technique}
                onChange={(v) => setCategories({ ...categories, technique: v })}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block uppercase">Power</label>
              <StarRating
                value={categories.power}
                onChange={(v) => setCategories({ ...categories, power: v })}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block uppercase">Speed</label>
              <StarRating
                value={categories.speed}
                onChange={(v) => setCategories({ ...categories, speed: v })}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block uppercase">Entertainment</label>
              <StarRating
                value={categories.entertainment}
                onChange={(v) => setCategories({ ...categories, entertainment: v })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Comment (Optional)</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts..."
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || createRatingMutation.isPending || updateRatingMutation.isPending}
            className="w-full bg-red-600 hover:bg-red-700 font-bold"
          >
            {userRating ? 'Update Rating' : 'Submit Rating'}
          </Button>
        </div>
      </div>

      {/* Recent Ratings */}
      {allRatings.length > 0 && (
        <div className="border-t border-zinc-800 pt-6">
          <h3 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Recent Ratings</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {allRatings.slice(0, 10).map((r, idx) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-zinc-800/50 p-3 border-l-2 border-amber-500"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">{r.created_by}</span>
                  <StarRating value={r.rating} readonly />
                </div>
                {r.comment && (
                  <p className="text-sm text-zinc-400">{r.comment}</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}