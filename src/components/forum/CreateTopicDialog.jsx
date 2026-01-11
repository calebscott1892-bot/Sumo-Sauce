import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/api/client';
import { toast } from 'sonner';

export default function CreateTopicDialog({ open, onClose, onSuccess, user }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setCreating(true);
    try {
      await api.entities.ForumTopic.create({
        title,
        content,
        category,
        view_count: 0,
        reply_count: 0,
      });
      
      setTitle('');
      setContent('');
      setCategory('General');
      onSuccess();
    } catch (err) {
      toast.error('Failed to create topic');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Create New Topic</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-bold text-zinc-400 mb-2 block">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's on your mind?"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-zinc-400 mb-2 block">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Match Discussion">Match Discussion</SelectItem>
                <SelectItem value="Wrestler Discussion">Wrestler Discussion</SelectItem>
                <SelectItem value="History & Tradition">History & Tradition</SelectItem>
                <SelectItem value="Tournament Talk">Tournament Talk</SelectItem>
                <SelectItem value="General">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-bold text-zinc-400 mb-2 block">Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts in detail..."
              className="bg-zinc-800 border-zinc-700 text-white min-h-48"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="border-zinc-700">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !title.trim() || !content.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {creating ? 'Creating...' : 'Create Topic'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}