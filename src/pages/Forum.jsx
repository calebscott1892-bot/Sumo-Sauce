import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plus, Pin, Lock, Eye, ArrowLeft, Filter, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import CreateTopicDialog from '../components/forum/CreateTopicDialog';
import ModerationPanel from '../components/forum/ModerationPanel';
import { format } from 'date-fns';
import { getUserDisplayName } from '@/api/functions/getUserDisplayName';

export default function Forum() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: topics = [], isLoading, refetch } = useQuery({
    queryKey: ['forum-topics'],
    queryFn: () => api.entities.ForumTopic.list('-created_date', 50),
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => api.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      try {
        return await api.entities.User.list('-created_date', 500);
      } catch (error) {
        return [];
      }
    },
  });

  const categories = ['all', 'Match Discussion', 'Wrestler Discussion', 'History & Tradition', 'Tournament Talk', 'General'];

  const filteredTopics = selectedCategory === 'all' 
    ? topics 
    : topics.filter(t => t.category === selectedCategory);

  const sortedTopics = [...filteredTopics].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return 0;
  });

  const handleTopicCreated = () => {
    refetch();
    setShowCreateDialog(false);
    toast.success('Topic created successfully!');
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-black to-red-950/20 pointer-events-none" />
      
      <div className="relative max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-black via-red-950 to-black border-b-4 border-red-600 py-8 px-6 -mx-4 mb-8">
          <Link to="/Leaderboard">
            <Button variant="ghost" size="sm" className="mb-4 text-zinc-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leaderboard
            </Button>
          </Link>
          
          <div className="flex justify-between items-end">
            <div>
              <div className="text-red-500 text-sm font-black tracking-[0.2em] uppercase mb-1">
                COMMUNITY
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-none">
                FORUM
              </h1>
              <p className="text-zinc-400 text-sm mt-2 font-medium">
                Discuss matches, wrestlers, and sumo tradition
              </p>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-red-600 hover:bg-red-700 font-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              NEW TOPIC
            </Button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(cat => (
            <Button
              key={cat}
              size="sm"
              variant={selectedCategory === cat ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat 
                ? 'bg-red-600 hover:bg-red-700 font-bold' 
                : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-400 font-bold'
              }
            >
              {cat === 'all' ? 'ALL' : cat.toUpperCase()}
            </Button>
          ))}
        </div>

        {/* Moderation Panel (Admin Only) */}
        {user?.role === 'admin' && (
          <div className="mb-8">
            <ModerationPanel user={user} />
          </div>
        )}

        {/* Topics List */}
        {isLoading ? (
          <div className="text-center py-20 text-zinc-500">Loading topics...</div>
        ) : sortedTopics.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 p-12 text-center">
            <MessageSquare className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-400 mb-2">No topics yet</h3>
            <p className="text-zinc-600 mb-4">Be the first to start a discussion!</p>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-red-600 hover:bg-red-700">
              Create First Topic
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTopics.map(topic => (
              <Link key={topic.id} to={`/ForumTopic?id=${topic.id}`}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-900/80 p-5 cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {topic.is_pinned && (
                          <Pin className="w-4 h-4 text-amber-500 fill-amber-500" />
                        )}
                        {topic.is_locked && (
                          <Lock className="w-4 h-4 text-zinc-600" />
                        )}
                        <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
                          {topic.category}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                        {topic.title}
                      </h3>
                      
                      <p className="text-sm text-zinc-500 line-clamp-2 mb-2">
                        {topic.content}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-zinc-600">
                        <span className="font-medium">by {allUsers.find(u => u.email === topic.created_by)?.username || allUsers.find(u => u.email === topic.created_by)?.full_name || topic.created_by}</span>
                        <span>•</span>
                        <span>{format(new Date(topic.created_date), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 text-zinc-500">
                      <div className="flex items-center gap-1 text-sm">
                        <MessageSquare className="w-4 h-4" />
                        <span className="font-bold">{topic.reply_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Eye className="w-3 h-3" />
                        <span>{topic.view_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateTopicDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleTopicCreated}
        user={user}
      />
    </div>
  );
}