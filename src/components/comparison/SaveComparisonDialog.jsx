import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { Share2, Copy } from 'lucide-react';

export default function SaveComparisonDialog({ open, onClose, wrestlers }) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [savedReportId, setSavedReportId] = useState(null);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => api.entities.ComparisonReport.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries(['comparison-reports']);
      setSavedReportId(result.id);
      toast.success('Comparison saved successfully!');
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    saveMutation.mutate({
      title,
      wrestler_ids: wrestlers.map(w => w.id),
      notes: notes.trim() || undefined,
      is_public: isPublic,
      views: 0,
      likes: 0,
    });
  };

  const shareUrl = savedReportId 
    ? `${window.location.origin}/SharedComparison?id=${savedReportId}`
    : null;

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            <Share2 className="w-6 h-6" />
            Save & Share Comparison
          </DialogTitle>
        </DialogHeader>

        {!savedReportId ? (
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-bold text-zinc-400 mb-2 block">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Yokozuna Power Comparison"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-zinc-400 mb-2 block">
                Comparing: {wrestlers.map(w => w.shikona).join(', ')}
              </label>
            </div>

            <div>
              <label className="text-sm font-bold text-zinc-400 mb-2 block">Notes (Optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your analysis or observations..."
                className="bg-zinc-800 border-zinc-700 text-white min-h-24"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
              <div>
                <div className="font-bold text-white">Make Public</div>
                <div className="text-xs text-zinc-500">Allow others to view this comparison</div>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onClose} className="border-zinc-700">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !title.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Comparison'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="bg-green-900/20 border border-green-700 p-4 rounded-lg">
              <div className="text-green-400 font-bold mb-2">✓ Comparison Saved!</div>
              {isPublic && (
                <div className="text-sm text-zinc-400">
                  Your comparison is now public and can be shared with others.
                </div>
              )}
            </div>

            {isPublic && (
              <div>
                <label className="text-sm font-bold text-zinc-400 mb-2 block">Share Link</label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="bg-zinc-800 border-zinc-700 text-white flex-1"
                  />
                  <Button
                    onClick={copyShareLink}
                    className="bg-zinc-700 hover:bg-zinc-600"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <Button
              onClick={onClose}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}