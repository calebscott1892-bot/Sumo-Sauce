import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MessageSquare, ThumbsUp, Send, Flag, Trash2, Pin, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReportDialog from '../components/forum/ReportDialog';
import BanUserDialog from '../components/forum/BanUserDialog';
import AchievementNotification from '../components/achievements/AchievementNotification';
import { updateForumStats } from '@/api/functions/achievementSystem';
import { notifyForumReply } from '@/api/functions/notificationSystem';
// Display name helper function
const getDisplayName = (email, users) => {
  const user = users.find(u => u.email === email);
  return user?.username || user?.full_name || email;
};

export default function ForumTopic() {
  const urlParams = new URLSearchParams(window.location.search);
  const topicId = urlParams.get('id');
  const [replyContent, setReplyContent] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [userToBan, setUserToBan] = useState(null);
  const [newAchievement, setNewAchievement] = useState(null);
  const queryClient = useQueryClient();

  const { data: topic } = useQuery({
    queryKey: ['forum-topic', topicId],
    queryFn: async () => {
      try {
        const topics = await api.entities.ForumTopic.list('-created_date', 100);
        return topics.find(t => t.id === topicId);
      } catch (error) {
        console.error('Failed to fetch topic:', error);
        return null;
      }
    },
    enabled: !!topicId,
  });

  const { data: replies = [] } = useQuery({
    queryKey: ['forum-replies', topicId],
    queryFn: async () => {
      try {
        const allReplies = await api.entities.ForumReply.list('-created_date', 200);
        return allReplies.filter(r => r.topic_id === topicId);
      } catch (error) {
        console.error('Failed to fetch replies:', error);
        return [];
      }
    },
    enabled: !!topicId,
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

  // Increment view count on mount
  useEffect(() => {
    if (topic) {
      api.entities.ForumTopic.update(topic.id, {
        view_count: (topic.view_count || 0) + 1
      });
    }
  }, [topic?.id]);

  const createReplyMutation = useMutation({
    mutationFn: (data) => api.entities.ForumReply.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['forum-replies', topicId]);
      await api.entities.ForumTopic.update(topicId, {
        reply_count: (topic?.reply_count || 0) + 1
      });
      await queryClient.invalidateQueries(['forum-topic', topicId]);
      setReplyContent('');
      toast.success('Reply posted!');
      
      // Check for new achievements
      if (user?.email) {
        const achievements = await updateForumStats(user.email);
        if (achievements.length > 0) {
          setNewAchievement(achievements[0]);
        }
      }

      // Notify topic creator about reply
      if (topic?.created_by && topic.created_by !== user?.email) {
        await notifyForumReply(topicId, topic.title, topic.created_by, user.email);
      }
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (reply) => {
      const likedBy = reply.liked_by || [];
      const hasLiked = likedBy.includes(user.email);
      
      return api.entities.ForumReply.update(reply.id, {
        likes: hasLiked ? reply.likes - 1 : reply.likes + 1,
        liked_by: hasLiked 
          ? likedBy.filter(e => e !== user.email)
          : [...likedBy, user.email]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-replies', topicId]);
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: () => api.entities.ForumTopic.delete(topicId),
    onSuccess: () => {
      toast.success('Topic deleted');
      window.location.href = '/Forum';
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (replyId) => api.entities.ForumReply.delete(replyId),
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-replies', topicId]);
      toast.success('Reply deleted');
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: () => api.entities.ForumTopic.update(topicId, {
      is_pinned: !topic.is_pinned
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-topic', topicId]);
      toast.success(topic.is_pinned ? 'Topic unpinned' : 'Topic pinned');
    },
  });

  const toggleLockMutation = useMutation({
    mutationFn: () => api.entities.ForumTopic.update(topicId, {
      is_locked: !topic.is_locked
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-topic', topicId]);
      toast.success(topic.is_locked ? 'Topic unlocked' : 'Topic locked');
    },
  });

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    if (topic?.is_locked) {
      toast.error('This topic is locked');
      return;
    }

    createReplyMutation.mutate({
      topic_id: topicId,
      content: replyContent,
    });
  };

  if (!topic) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-black to-red-950/20 pointer-events-none" />
      
      <div className="relative max-w-4xl mx-auto px-4 py-8">
        <Link to="/Forum">
          <Button variant="ghost" size="sm" className="mb-6 text-zinc-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Forum
          </Button>
        </Link>

        {/* Topic */}
        <div className="bg-zinc-900 border-2 border-zinc-800 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
              {topic.category}
            </span>
            <div className="flex gap-2">
              {user?.role === 'admin' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePinMutation.mutate()}
                    className="border-zinc-700"
                  >
                    <Pin className="w-4 h-4 mr-1" />
                    {topic.is_pinned ? 'Unpin' : 'Pin'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleLockMutation.mutate()}
                    className="border-zinc-700"
                  >
                    <Lock className="w-4 h-4 mr-1" />
                    {topic.is_locked ? 'Unlock' : 'Lock'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setUserToBan(topic.created_by);
                      setBanDialogOpen(true);
                    }}
                    className="border-zinc-700"
                  >
                    Ban Author
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => deleteTopicMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReportTarget({ type: 'topic', id: topicId });
                  setReportDialogOpen(true);
                }}
                className="border-zinc-700"
              >
                <Flag className="w-4 h-4 mr-1" />
                Report
              </Button>
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-white mb-4">{topic.title}</h1>
          
          <div className="text-zinc-300 whitespace-pre-wrap mb-4">{topic.content}</div>
          
          <div className="flex items-center gap-4 text-sm text-zinc-500 border-t border-zinc-800 pt-4">
            <span className="font-bold text-zinc-400">{getDisplayName(topic.created_by, allUsers)}</span>
            <span>•</span>
            <span>{format(new Date(topic.created_date), 'MMM d, yyyy h:mm a')}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>{topic.reply_count || 0} replies</span>
            </div>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4 mb-6">
          {replies.map((reply, idx) => (
            <motion.div
              key={reply.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-zinc-900/50 border border-zinc-800 p-5"
            >
              <div className="flex items-start gap-4">
                <Link to={`/Profile?email=${reply.created_by}`}>
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center hover:ring-2 hover:ring-red-500 transition-all cursor-pointer">
                    <span className="text-zinc-400 font-bold">
                      {getDisplayName(reply.created_by, allUsers).charAt(0).toUpperCase()}
                    </span>
                  </div>
                </Link>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link to={`/Profile?email=${reply.created_by}`}>
                      <span className="font-bold text-zinc-300 hover:text-red-400 cursor-pointer transition-colors">
                        {getDisplayName(reply.created_by, allUsers)}
                      </span>
                    </Link>
                    <span className="text-xs text-zinc-600">
                      {format(new Date(reply.created_date), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  
                  <p className="text-zinc-400 whitespace-pre-wrap">{reply.content}</p>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => likeMutation.mutate(reply)}
                      className={`${
                        reply.liked_by?.includes(user?.email)
                          ? 'text-red-500'
                          : 'text-zinc-500 hover:text-red-500'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      {reply.likes || 0}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReportTarget({ type: 'reply', id: reply.id });
                        setReportDialogOpen(true);
                      }}
                      className="text-zinc-500 hover:text-red-500"
                    >
                      <Flag className="w-4 h-4 mr-1" />
                      Report
                    </Button>
                    {user?.role === 'admin' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteReplyMutation.mutate(reply.id)}
                        className="text-zinc-500 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Reply Form */}
        {!topic.is_locked ? (
          <div className="bg-zinc-900 border border-zinc-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Post a Reply</h3>
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Share your thoughts..."
              className="mb-4 bg-zinc-800 border-zinc-700 text-white min-h-32"
            />
            <Button
              onClick={handleSubmitReply}
              disabled={!replyContent.trim() || createReplyMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {createReplyMutation.isPending ? 'Posting...' : 'Post Reply'}
            </Button>
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 text-center text-zinc-500">
            This topic is locked and cannot receive new replies.
          </div>
        )}
      </div>

      <ReportDialog
        open={reportDialogOpen}
        onClose={() => {
          setReportDialogOpen(false);
          setReportTarget(null);
        }}
        contentType={reportTarget?.type}
        contentId={reportTarget?.id}
      />

      <BanUserDialog
        open={banDialogOpen}
        onClose={() => {
          setBanDialogOpen(false);
          setUserToBan(null);
        }}
        userEmail={userToBan}
        adminEmail={user?.email}
      />

      <AchievementNotification
        achievement={newAchievement}
        onClose={() => setNewAchievement(null)}
      />
    </div>
  );
}