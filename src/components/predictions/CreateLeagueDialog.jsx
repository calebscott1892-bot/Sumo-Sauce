import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { Trophy } from 'lucide-react';
import { generateLeagueCode } from '@/api/functions/predictionScoring';

export default function CreateLeagueDialog({ open, onClose, user, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a league name');
      return;
    }

    setCreating(true);
    try {
      const joinCode = generateLeagueCode();
      
      const league = await api.entities.PredictionLeague.create({
        name,
        description,
        join_code: joinCode,
        is_public: isPublic,
        admin_email: user.email,
        member_count: 1
      });

      await api.entities.LeagueMembership.create({
        league_id: league.id,
        user_email: user.email
      });

      toast.success('League created!');
      onSuccess();
      onClose();
      setName('');
      setDescription('');
    } catch (error) {
      toast.error('Failed to create league');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Create Prediction League
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">League Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Friends League, Office Pool"
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Description (Optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your league..."
              className="bg-zinc-800 border-zinc-700 text-white"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded"
            />
            <label className="text-sm text-zinc-400">
              Make this league publicly visible
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="border-zinc-700">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-red-600 hover:bg-red-700"
            >
              {creating ? 'Creating...' : 'Create League'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}