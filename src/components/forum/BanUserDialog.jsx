import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { Ban } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function BanUserDialog({ open, onClose, userEmail, adminEmail }) {
  const [reason, setReason] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [banUntil, setBanUntil] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please provide a reason');
      return;
    }

    if (!isPermanent && !banUntil) {
      toast.error('Please set a ban duration or make it permanent');
      return;
    }

    setSubmitting(true);
    try {
      await api.entities.BannedUser.create({
        user_email: userEmail,
        banned_by: adminEmail,
        reason,
        is_permanent: isPermanent,
        ban_until: isPermanent ? null : banUntil
      });
      
      queryClient.invalidateQueries({ queryKey: ['banned-users'] });
      toast.success(`User ${userEmail} has been banned`);
      onClose();
      setReason('');
      setIsPermanent(false);
      setBanUntil('');
    } catch (error) {
      toast.error('Failed to ban user');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-400" />
            Ban User
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-zinc-800 rounded p-3">
            <div className="text-sm text-zinc-400">User to ban:</div>
            <div className="text-white font-bold">{userEmail}</div>
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Reason</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this user is being banned..."
              className="bg-zinc-800 border-zinc-700 text-white"
              rows={3}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
              <input
                type="checkbox"
                checked={isPermanent}
                onChange={(e) => setIsPermanent(e.target.checked)}
                className="rounded"
              />
              Permanent Ban
            </label>
          </div>

          {!isPermanent && (
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Ban Until</label>
              <Input
                type="date"
                value={banUntil}
                onChange={(e) => setBanUntil(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="border-zinc-700">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Banning...' : 'Ban User'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}