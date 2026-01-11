import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notifyPredictionClosing } from '@/api/functions/notificationSystem';
import { Target } from 'lucide-react';

export default function MakePredictionDialog({ open, onClose, tournament, league, user, onSuccess }) {
  const [winner, setWinner] = useState('');
  const [runnerUp, setRunnerUp] = useState('');
  const [outstanding, setOutstanding] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: wrestlers = [] } = useQuery({
    queryKey: ['wrestlers'],
    queryFn: () => api.entities.Wrestler.list('-rank', 500),
  });

  const activeWrestlers = wrestlers.filter(w => w.is_active !== false);

  const handleSubmit = async () => {
    if (!winner) {
      toast.error('Please select a predicted winner');
      return;
    }

    if (!league) {
      toast.error('Please select a league first');
      return;
    }

    if (winner === runnerUp) {
      toast.error('Winner and runner-up must be different wrestlers');
      return;
    }

    setSubmitting(true);
    try {
      // Check if user already has a prediction for this tournament in this league
      const allPredictions = await api.entities.TournamentPrediction.list('-created_date', 500);
      const existing = allPredictions.filter(p =>
        p.tournament_id === tournament.id &&
        p.league_id === league.id &&
        p.user_email === user.email
      );

      if (existing.length > 0) {
        toast.error('You already made a prediction for this tournament in this league');
        setSubmitting(false);
        return;
      }

      await api.entities.TournamentPrediction.create({
        tournament_id: tournament.id,
        league_id: league.id,
        user_email: user.email,
        predicted_winner: winner,
        predicted_runner_up: runnerUp || null,
        predicted_outstanding_performance: outstanding || null
      });

      toast.success('Prediction submitted!');
      onSuccess();
      onClose();
      setWinner('');
      setRunnerUp('');
      setOutstanding('');
    } catch (error) {
      toast.error('Failed to submit prediction');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            Make Your Prediction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-zinc-800 p-3 rounded">
            <div className="text-xs text-zinc-500 uppercase">Tournament</div>
            <div className="text-white font-bold">{tournament?.name}</div>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              Predicted Winner <span className="text-red-400">*</span>
            </label>
            <Select value={winner} onValueChange={setWinner}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select wrestler" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {activeWrestlers.map(w => (
                  <SelectItem key={w.id} value={w.shikona} className="text-white hover:bg-zinc-700 focus:bg-zinc-700">
                    {w.shikona} ({w.rank})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Predicted Runner-Up</label>
            <Select value={runnerUp} onValueChange={setRunnerUp}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select wrestler (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {activeWrestlers.filter(w => w.shikona !== winner).map(w => (
                  <SelectItem key={w.id} value={w.shikona} className="text-white hover:bg-zinc-700 focus:bg-zinc-700">
                    {w.shikona} ({w.rank})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Outstanding Performance Prize</label>
            <Select value={outstanding} onValueChange={setOutstanding}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Select wrestler (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {activeWrestlers.map(w => (
                  <SelectItem key={w.id} value={w.shikona} className="text-white hover:bg-zinc-700 focus:bg-zinc-700">
                    {w.shikona} ({w.rank})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="border-zinc-700">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? 'Submitting...' : 'Submit Prediction'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}