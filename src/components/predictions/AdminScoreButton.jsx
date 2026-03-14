import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { notifyMatchResult } from '@/api/functions/notificationSystem';
import { api } from '@/api/client';
import { scoreAllPredictionsForTournament } from '@/api/functions/predictionScoring';

export default function AdminScoreButton({ tournament, user }) {
  const [scoring, setScoring] = useState(false);
  const queryClient = useQueryClient();

  const handleScore = async () => {
    if (tournament.status !== 'completed') {
      toast.error('Tournament must be completed to score predictions');
      return;
    }

    setScoring(true);
    try {
      const result = await scoreAllPredictionsForTournament(tournament.id);
      
      if (result.errors) {
        toast.warning(`Scored ${result.scored}/${result.total} predictions. ${result.errors.length} errors.`);
      } else {
        toast.success(`Successfully scored ${result.scored} predictions!`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      queryClient.invalidateQueries({ queryKey: ['league-members'] });

      // Notify affected users
      try {
        const predictions = await api.entities.TournamentPrediction.list('-created_date', 500);
        const tournamentPredictions = predictions.filter(p => p.tournament_id === tournament.id && p.is_scored);
        const uniqueUsers = [...new Set(tournamentPredictions.map(p => p.user_email))];
        
        if (uniqueUsers.length > 0) {
          await notifyMatchResult(
            {
              message: `${tournament.name} results are in! Check your predictions.`,
              link: '/PredictionGame',
              metadata: { tournament_id: tournament.id }
            },
            uniqueUsers.map(email => ({ email }))
          );
        }
      } catch (notifyError) {
        console.error('Failed to send notifications:', notifyError);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to score predictions');
    } finally {
      setScoring(false);
    }
  };

  if (user?.role !== 'admin') return null;

  return (
    <Button
      onClick={handleScore}
      disabled={scoring || tournament.status !== 'completed'}
      className="bg-green-600 hover:bg-green-700"
      size="sm"
    >
      {scoring ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Scoring...
        </>
      ) : (
        <>
          <CheckCircle className="w-4 h-4 mr-2" />
          Score Predictions
        </>
      )}
    </Button>
  );
}