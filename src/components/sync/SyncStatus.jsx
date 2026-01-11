import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function SyncStatus() {
  const [lastSync, setLastSync] = useState(null);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    const updateStatus = () => {
      const lastSyncTime = localStorage.getItem('sumo_last_sync');
      const result = localStorage.getItem('sumo_last_sync_result');
      
      if (lastSyncTime) {
        setLastSync(new Date(lastSyncTime));
      }
      
      if (result) {
        try {
          setSyncResult(JSON.parse(result));
        } catch (e) {
          console.error('Failed to parse sync result', e);
        }
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, []);

  if (!lastSync) return null;

  return (
    <Card className="p-4 bg-slate-50 border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Database className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Last Synced</span>
              <CheckCircle2 className="w-3 h-3 text-green-600" />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(lastSync, { addSuffix: true })}
            </div>
          </div>
        </div>

        {syncResult && (
          <div className="flex gap-2">
            {syncResult.created > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                +{syncResult.created} new
              </Badge>
            )}
            {syncResult.updated > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {syncResult.updated} updated
              </Badge>
            )}
            <Badge variant="outline" className="bg-slate-100 text-slate-700">
              {syncResult.total} total
            </Badge>
          </div>
        )}
      </div>

      {syncResult?.metadata?.basho && (
        <div className="mt-2 pt-2 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            Tournament: <span className="font-medium text-slate-700">{syncResult.metadata.basho}</span>
          </span>
        </div>
      )}
    </Card>
  );
}