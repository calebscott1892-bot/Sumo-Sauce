import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { Users } from 'lucide-react';

export default function JoinLeagueDialog({ open, onClose, user, onSuccess }) {
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      toast.error('Please enter a join code');
      return;
    }

    setJoining(true);
    try {
      const allLeagues = await api.entities.PredictionLeague.list('-created_date', 200);
      const leagues = allLeagues.filter(l => l.join_code === joinCode.toUpperCase());

      if (leagues.length === 0) {
        toast.error('Invalid join code');
        return;
      }

      const league = leagues[0];

      // Check if already a member
      const allMemberships = await api.entities.LeagueMembership.list('-created_date', 500);
      const existing = allMemberships.filter(m => 
        m.league_id === league.id && m.user_email === user.email
      );

      if (existing.length > 0) {
        toast.error('You are already a member of this league');
        return;
      }

      await api.entities.LeagueMembership.create({
        league_id: league.id,
        user_email: user.email
      });

      await api.entities.PredictionLeague.update(league.id, {
        member_count: (league.member_count || 1) + 1
      });

      toast.success(`Joined ${league.name}!`);
      onSuccess();
      onClose();
      setJoinCode('');
    } catch (error) {
      toast.error('Failed to join league');
      console.error(error);
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Join Prediction League
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">League Join Code</label>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code"
              className="bg-zinc-800 border-zinc-700 text-white uppercase"
              maxLength={6}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="border-zinc-700">
              Cancel
            </Button>
            <Button
              onClick={handleJoin}
              disabled={joining}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {joining ? 'Joining...' : 'Join League'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}