import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertTriangle, Ban, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import BanUserDialog from './BanUserDialog';

export default function ModerationPanel({ user }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [userToBan, setUserToBan] = useState(null);
  const queryClient = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.entities.Report.list('-created_date', 200),
    enabled: user?.role === 'admin'
  });

  const { data: bannedUsers = [] } = useQuery({
    queryKey: ['banned-users'],
    queryFn: () => api.entities.BannedUser.list('-created_date', 100),
    enabled: user?.role === 'admin'
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['forum-topics'],
    queryFn: () => api.entities.ForumTopic.list('-created_date', 100),
    enabled: user?.role === 'admin'
  });

  const updateReportMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Report.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report updated');
    }
  });

  const deleteContentMutation = useMutation({
    mutationFn: async ({ type, id }) => {
      if (type === 'topic') {
        await api.entities.ForumTopic.delete(id);
      } else {
        await api.entities.ForumReply.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-topics'] });
      queryClient.invalidateQueries({ queryKey: ['forum-replies'] });
      toast.success('Content deleted');
    }
  });

  const unbanUserMutation = useMutation({
    mutationFn: (id) => api.entities.BannedUser.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banned-users'] });
      toast.success('User unbanned');
    }
  });

  const handleResolveReport = async (report, action) => {
    if (action === 'delete') {
      await deleteContentMutation.mutateAsync({
        type: report.content_type,
        id: report.content_id
      });
    }

    await updateReportMutation.mutateAsync({
      id: report.id,
      data: {
        status: action === 'delete' ? 'resolved' : 'dismissed',
        reviewed_by: user.email,
        resolution_notes: action === 'delete' ? 'Content deleted' : 'No action taken'
      }
    });
  };

  const pendingReports = reports.filter(r => r.status === 'pending');

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-red-400" />
        <h2 className="text-2xl font-black text-white">Moderation Panel</h2>
      </div>

      <Tabs defaultValue="reports">
        <TabsList className="bg-zinc-800">
          <TabsTrigger value="reports">
            Reports {pendingReports.length > 0 && (
              <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingReports.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="banned">Banned Users</TabsTrigger>
          <TabsTrigger value="topics">All Topics</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4 mt-4">
          {reports.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">No reports</div>
          ) : (
            reports.map(report => (
              <div key={report.id} className={`bg-zinc-800/50 rounded p-4 border-l-4 ${
                report.status === 'pending' ? 'border-red-600' : 'border-zinc-700'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-white font-bold capitalize">{report.reason}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        report.status === 'pending' ? 'bg-red-900 text-red-300' :
                        report.status === 'resolved' ? 'bg-green-900 text-green-300' :
                        'bg-zinc-700 text-zinc-400'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500">
                      Reported by {report.created_by} • {format(new Date(report.created_date), 'MMM d, yyyy')}
                    </div>
                    {report.details && (
                      <div className="text-sm text-zinc-400 mt-2">{report.details}</div>
                    )}
                  </div>
                  {report.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveReport(report, 'dismiss')}
                        className="border-zinc-700"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleResolveReport(report, 'delete')}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Delete Content
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="banned" className="space-y-4 mt-4">
          {bannedUsers.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">No banned users</div>
          ) : (
            bannedUsers.map(ban => (
              <div key={ban.id} className="bg-zinc-800/50 rounded p-4 flex items-center justify-between">
                <div>
                  <div className="text-white font-bold">{ban.user_email}</div>
                  <div className="text-sm text-zinc-400">{ban.reason}</div>
                  <div className="text-xs text-zinc-600 mt-1">
                    Banned by {ban.banned_by} • {ban.is_permanent ? 'Permanent' : `Until ${format(new Date(ban.ban_until), 'MMM d, yyyy')}`}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => unbanUserMutation.mutate(ban.id)}
                  className="border-zinc-700"
                >
                  Unban
                </Button>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="topics" className="space-y-4 mt-4">
          {topics.map(topic => (
            <div key={topic.id} className="bg-zinc-800/50 rounded p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="text-white font-bold">{topic.title}</div>
                <div className="text-xs text-zinc-500">
                  by {topic.created_by} • {topic.reply_count || 0} replies
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUserToBan(topic.created_by);
                    setBanDialogOpen(true);
                  }}
                  className="border-zinc-700"
                >
                  <Ban className="w-4 h-4 mr-1" />
                  Ban Author
                </Button>
                <Button
                  size="sm"
                  onClick={() => deleteContentMutation.mutate({ type: 'topic', id: topic.id })}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <BanUserDialog
        open={banDialogOpen}
        onClose={() => {
          setBanDialogOpen(false);
          setUserToBan(null);
        }}
        userEmail={userToBan}
        adminEmail={user?.email}
      />
    </div>
  );
}