import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { X, Settings, Eye, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardSettings({ open, onClose, preferences = {}, onToggleWidget, onUpdateNotifications }) {
  const safePreferences = {
    widgets: preferences?.widgets || {},
    notifications: preferences?.notifications || {}
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-2 border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-amber-500" />
            <h2 className="text-2xl font-black text-white uppercase">
              Dashboard Settings
            </h2>
          </div>
          <button onClick={() => onClose(false)} className="hover:bg-zinc-800 p-2 rounded">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Widget Visibility */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-black text-zinc-300 uppercase tracking-wider">
              Visible Widgets
            </h3>
          </div>

          <div className="space-y-3 bg-zinc-800 border border-zinc-700 p-4">
            <SettingRow
              label="Live Tournament Feed"
              description="Shows ongoing matches and today's results"
              checked={safePreferences.widgets?.liveFeed || false}
              onChange={() => onToggleWidget('liveFeed')}
            />
            <SettingRow
              label="Tournament Standings"
              description="Current basho rankings and records"
              checked={safePreferences.widgets?.standings || false}
              onChange={() => onToggleWidget('standings')}
            />
            <SettingRow
              label="Today's Results"
              description="Complete list of today's match outcomes"
              checked={safePreferences.widgets?.todaysResults || false}
              onChange={() => onToggleWidget('todaysResults')}
            />
            <SettingRow
              label="Upcoming Matches"
              description="Next scheduled bouts"
              checked={safePreferences.widgets?.upcomingMatches || false}
              onChange={() => onToggleWidget('upcomingMatches')}
            />
            <SettingRow
              label="Favorites Only Mode"
              description="Show only followed wrestlers in leaderboard"
              checked={safePreferences.widgets?.favoritesOnly || false}
              onChange={() => onToggleWidget('favoritesOnly')}
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-black text-zinc-300 uppercase tracking-wider">
              Notifications
            </h3>
          </div>

          <div className="space-y-3 bg-zinc-800 border border-zinc-700 p-4">
            <SettingRow
              label="Live Match Alerts"
              description="Notify when favorites enter the ring"
              checked={safePreferences.notifications?.liveMatches || false}
              onChange={() => onUpdateNotifications({ liveMatches: !safePreferences.notifications?.liveMatches })}
            />
            <SettingRow
              label="Milestone Achievements"
              description="Notify for tournament wins and special prizes"
              checked={safePreferences.notifications?.milestones || false}
              onChange={() => onUpdateNotifications({ milestones: !safePreferences.notifications?.milestones })}
            />
            <SettingRow
              label="Daily Updates"
              description="End-of-day summary for favorites"
              checked={safePreferences.notifications?.dailyUpdates || false}
              onChange={() => onUpdateNotifications({ dailyUpdates: !safePreferences.notifications?.dailyUpdates })}
            />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800">
          <Button
            onClick={() => onClose(false)}
            className="w-full bg-red-600 hover:bg-red-700 font-black uppercase"
          >
            Save & Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-700 last:border-0">
      <div className="flex-1">
        <div className="text-white font-bold text-sm">{label}</div>
        <div className="text-zinc-500 text-xs mt-0.5">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}