import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Trophy, MessageSquare, ThumbsUp, Star, User, Edit2, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import AchievementBadge from '../components/achievements/AchievementBadge';
import { getUserDisplayName } from '@/api/functions/getUserDisplayName';

export default function Profile() {
  const urlParams = new URLSearchParams(window.location.search);
  const userEmail = urlParams.get('email');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => api.auth.me(),
  });

  const { data: profileUser } = useQuery({
    queryKey: ['profile-user', userEmail],
    queryFn: async () => {
      if (!userEmail) return user;
      try {
        const users = await api.entities.User.list('-created_date', 500);
        return users.find(u => u.email === userEmail) || user;
      } catch (error) {
        console.error('Failed to fetch profile user:', error);
        return user;
      }
    },
    enabled: !!user,
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements', profileUser?.email],
    queryFn: async () => {
      try {
        const allAchievements = await api.entities.Achievement.list('-created_date', 200);
        return allAchievements.filter(a => a.user_email === profileUser.email);
      } catch (error) {
        console.error('Failed to fetch achievements:', error);
        return [];
      }
    },
    enabled: !!profileUser?.email,
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['user-topics', profileUser?.email],
    queryFn: async () => {
      try {
        const allTopics = await api.entities.ForumTopic.list('-created_date', 100);
        return allTopics.filter(t => t.created_by === profileUser.email);
      } catch (error) {
        console.error('Failed to fetch topics:', error);
        return [];
      }
    },
    enabled: !!profileUser?.email,
  });

  const { data: replies = [] } = useQuery({
    queryKey: ['user-replies', profileUser?.email],
    queryFn: async () => {
      try {
        const allReplies = await api.entities.ForumReply.list('-created_date', 200);
        return allReplies.filter(r => r.created_by === profileUser.email);
      } catch (error) {
        console.error('Failed to fetch replies:', error);
        return [];
      }
    },
    enabled: !!profileUser?.email,
  });

  const totalLikes = replies.reduce((sum, reply) => sum + (reply.likes || 0), 0);
  const isOwnProfile = user?.email === profileUser?.email;

  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['current-user']);
      queryClient.invalidateQueries(['profile-user']);
      setEditMode(false);
      toast.success('Profile updated successfully!');
    },
  });

  const handleStartEdit = () => {
    setEditData({
      username: profileUser?.username || '',
      bio: profileUser?.bio || '',
      privacy_settings: profileUser?.privacy_settings || { show_email: false, show_profile: true }
    });
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    updateProfileMutation.mutate(editData);
  };

  const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
  const sortedAchievements = [...achievements].sort((a, b) => 
    rarityOrder[a.rarity] - rarityOrder[b.rarity]
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-black to-red-950/20 pointer-events-none" />
      
      <div className="relative max-w-6xl mx-auto px-4 py-8">
        <Link to="/Leaderboard">
          <Button variant="ghost" size="sm" className="mb-6 text-zinc-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leaderboard
          </Button>
        </Link>

        {/* Profile Header */}
        <div className="bg-gradient-to-r from-red-900 via-red-700 to-red-900 border-2 border-red-600 p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center border-4 border-white/20">
              {profileUser?.username || profileUser?.full_name ? (
                <span className="text-4xl font-black text-white">
                  {(profileUser.username || profileUser.full_name).charAt(0).toUpperCase()}
                </span>
              ) : (
                <User className="w-12 h-12 text-zinc-500" />
              )}
            </div>
            <div className="flex-1">
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-red-200 text-sm font-bold mb-2 block">Username</label>
                    <Input
                      value={editData.username}
                      onChange={(e) => setEditData({...editData, username: e.target.value})}
                      placeholder="Choose a username"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-red-200 text-sm font-bold mb-2 block">Bio</label>
                    <Textarea
                      value={editData.bio}
                      onChange={(e) => setEditData({...editData, bio: e.target.value})}
                      placeholder="Tell us about yourself"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={editData.privacy_settings?.show_email}
                      onCheckedChange={(checked) => setEditData({
                        ...editData,
                        privacy_settings: { ...editData.privacy_settings, show_email: checked }
                      })}
                    />
                    <label className="text-red-200 text-sm">Show email publicly</label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={() => setEditMode(false)} variant="outline" className="border-white/20 text-white">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-black text-white">
                      {getUserDisplayName(profileUser)}
                    </h1>
                    {isOwnProfile && (
                      <Button
                        size="sm"
                        onClick={handleStartEdit}
                        variant="ghost"
                        className="text-white/60 hover:text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {(profileUser?.privacy_settings?.show_email || isOwnProfile) && (
                    <p className="text-red-200 text-sm mb-2">{profileUser?.email}</p>
                  )}
                  {profileUser?.bio && (
                    <p className="text-red-200 mb-4">{profileUser.bio}</p>
                  )}
                  {profileUser?.role === 'admin' && (
                    <div className="inline-block px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded">
                      ADMINISTRATOR
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 p-6 text-center">
            <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <div className="text-3xl font-black text-white">{achievements.length}</div>
            <div className="text-xs text-zinc-500 uppercase font-bold">Achievements</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 text-center">
            <MessageSquare className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-3xl font-black text-white">{topics.length}</div>
            <div className="text-xs text-zinc-500 uppercase font-bold">Topics Created</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 text-center">
            <Star className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <div className="text-3xl font-black text-white">{replies.length}</div>
            <div className="text-xs text-zinc-500 uppercase font-bold">Replies Posted</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 text-center">
            <ThumbsUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-3xl font-black text-white">{totalLikes}</div>
            <div className="text-xs text-zinc-500 uppercase font-bold">Total Likes</div>
          </div>
        </div>

        {/* Achievements Section */}
        <div className="bg-zinc-900 border border-zinc-800 p-8">
          <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            Achievements & Badges
          </h2>

          {achievements.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 text-lg">
                {isOwnProfile ? 'No achievements yet. Keep participating to unlock badges!' : 'This user hasn\'t unlocked any achievements yet.'}
              </p>
            </div>
          ) : (
            <>
              {/* Rarity Breakdown */}
              <div className="flex gap-4 mb-8 flex-wrap">
                {['legendary', 'epic', 'rare', 'common'].map(rarity => {
                  const count = achievements.filter(a => a.rarity === rarity).length;
                  if (count === 0) return null;
                  return (
                    <div key={rarity} className="px-4 py-2 bg-zinc-800 rounded border border-zinc-700">
                      <span className={`text-sm font-bold uppercase ${
                        rarity === 'legendary' ? 'text-amber-400' :
                        rarity === 'epic' ? 'text-purple-400' :
                        rarity === 'rare' ? 'text-blue-400' :
                        'text-zinc-400'
                      }`}>
                        {rarity}
                      </span>
                      <span className="text-white font-black ml-2">{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Achievement Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {sortedAchievements.map((achievement, idx) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <AchievementBadge achievement={achievement} size="md" showDetails={true} />
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}