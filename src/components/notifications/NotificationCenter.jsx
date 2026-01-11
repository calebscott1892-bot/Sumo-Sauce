import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Bell, X, Check, Trophy, Users, Target, MessageSquare, Award, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { markNotificationAsRead, markAllAsRead } from '@/api/functions/notificationSystem';

const notificationIcons = {
  tournament_update: Trophy,
  league_invitation: Users,
  prediction_closing: Target,
  match_result: Trophy,
  forum_reply: MessageSquare,
  achievement_unlocked: Award
};

const notificationColors = {
  tournament_update: 'text-purple-500 bg-purple-100',
  league_invitation: 'text-blue-500 bg-blue-100',
  prediction_closing: 'text-amber-500 bg-amber-100',
  match_result: 'text-green-500 bg-green-100',
  forum_reply: 'text-red-500 bg-red-100',
  achievement_unlocked: 'text-yellow-500 bg-yellow-100'
};

export default function NotificationCenter({ user }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      const all = await api.entities.Notification.list('-created_date', 50);
      return all.filter(n => n.recipient_email === user.email);
    },
    enabled: !!user?.email,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications', user?.email]);
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllAsRead(user.email),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications', user?.email]);
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-zinc-800 transition-colors">
          <Bell className="w-5 h-5 text-zinc-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 bg-zinc-900 border-zinc-800" align="end">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-lg font-black text-white">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => markAllReadMutation.mutate()}
              className="text-xs text-zinc-400 hover:text-white"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <Bell className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              <AnimatePresence>
                {notifications.map((notification, idx) => {
                  const Icon = notificationIcons[notification.type] || Bell;
                  const colorClasses = notificationColors[notification.type] || 'text-zinc-500 bg-zinc-800';
                  
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link
                        to={notification.link || '/Leaderboard'}
                        onClick={() => handleNotificationClick(notification)}
                        className={`block p-4 hover:bg-zinc-800/50 transition-colors ${
                          !notification.is_read ? 'bg-zinc-800/30' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-10 h-10 rounded-full ${colorClasses} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-bold text-white">{notification.title}</h4>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-zinc-600 mt-2">
                              {format(new Date(notification.created_date), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}