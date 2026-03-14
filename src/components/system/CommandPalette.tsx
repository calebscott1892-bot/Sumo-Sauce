import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar, Users, User, BarChart3, Dice5, Shuffle, Swords, Clock } from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { getRikishiDirectory } from '@/pages/rikishi/api';
import type { RikishiDirectoryEntry } from '../../../shared/api/v1';
import { recentBashoIds } from '@/utils/basho';

const MAX_SUGGESTED_RESULTS = 12;
const MAX_SEARCH_RESULTS = 60;

function scoreEntry(entry: RikishiDirectoryEntry, query: string): number {
  const shikona = entry.shikona.toLowerCase();
  const rikishiId = entry.rikishiId.toLowerCase();
  const heya = (entry.heya ?? '').toLowerCase();

  if (rikishiId === query) return 500;
  if (shikona === query) return 450;
  if (shikona.startsWith(query)) return 350;
  if (rikishiId.startsWith(query)) return 320;
  if (shikona.includes(query)) return 250;
  if (heya.startsWith(query)) return 180;
  if (heya.includes(query)) return 120;
  if (rikishiId.includes(query)) return 100;
  return -1;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // Ctrl/Cmd+K to open
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const { data: directory = [] } = useQuery({
    queryKey: ['rikishi-directory'],
    queryFn: getRikishiDirectory,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const recentIds = useMemo(() => recentBashoIds(20), []);

  const randomRikishi = useCallback(() => {
    if (!directory.length) return;
    const entry = directory[Math.floor(Math.random() * directory.length)];
    navigate(`/rikishi/${encodeURIComponent(entry.rikishiId)}`);
  }, [directory, navigate]);

  const randomBasho = useCallback(() => {
    if (!recentIds.length) return;
    const id = recentIds[Math.floor(Math.random() * recentIds.length)];
    navigate(`/basho/${encodeURIComponent(id)}`);
  }, [recentIds, navigate]);

  const runCommand = useCallback(
    (callback: () => void) => {
      setOpen(false);
      setQuery('');
      callback();
    },
    [],
  );

  const normalizedQuery = query.trim().toLowerCase();

  const actionItems = useMemo(() => ([
    { key: 'home', label: 'Go to home', keywords: 'home start', icon: Search, run: () => navigate('/') },
    { key: 'search', label: 'Full search page', keywords: 'search find discover', icon: Search, run: () => navigate('/search') },
    { key: 'rikishi', label: 'Browse rikishi directory', keywords: 'rikishi wrestlers directory', icon: Users, run: () => navigate('/rikishi') },
    { key: 'basho', label: 'Browse basho history', keywords: 'basho tournament history', icon: Calendar, run: () => navigate('/basho') },
    { key: 'analytics', label: 'Open analytics', keywords: 'analytics stats dashboard', icon: BarChart3, run: () => navigate('/analytics') },
    { key: 'kimarite', label: 'Open kimarite analytics', keywords: 'kimarite analytics techniques', icon: BarChart3, run: () => navigate('/analytics/kimarite') },
    { key: 'rivalries', label: 'Explore rivalries', keywords: 'rivalries compare head to head', icon: Swords, run: () => navigate('/rivalries') },
    { key: 'eras', label: 'Era analytics', keywords: 'eras history analytics timeline', icon: Clock, run: () => navigate('/analytics/eras') },
    { key: 'timeline', label: 'Basho timeline', keywords: 'timeline basho calendar history', icon: Calendar, run: () => navigate('/timeline') },
    { key: 'random-rikishi', label: 'Random rikishi', keywords: 'random rikishi wrestler surprise', icon: Shuffle, run: randomRikishi },
    { key: 'random-basho', label: 'Random basho', keywords: 'random basho tournament surprise', icon: Dice5, run: randomBasho },
  ]), [navigate, randomBasho, randomRikishi]);

  const filteredActions = useMemo(() => {
    if (!normalizedQuery) return actionItems;
    return actionItems.filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(normalizedQuery));
  }, [actionItems, normalizedQuery]);

  const filteredDirectory = useMemo(() => {
    if (!normalizedQuery) {
      return directory.slice(0, MAX_SUGGESTED_RESULTS);
    }

    return directory
      .map((entry) => ({ entry, score: scoreEntry(entry, normalizedQuery) }))
      .filter((result) => result.score >= 0)
      .sort((a, b) => b.score - a.score || a.entry.shikona.localeCompare(b.entry.shikona))
      .slice(0, MAX_SEARCH_RESULTS)
      .map((result) => result.entry);
  }, [directory, normalizedQuery]);

  const showEmptyState = filteredActions.length === 0 && filteredDirectory.length === 0;
  const rikishiHeading = normalizedQuery ? `Rikishi (${filteredDirectory.length})` : 'Suggested rikishi';

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery('');
    }
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange} commandProps={{ shouldFilter: false }}>
      <CommandInput
        placeholder="Type a command or search rikishi… (⌘K)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {filteredActions.length > 0 && (
          <CommandGroup heading="Actions">
            {filteredActions.map((item) => (
              <CommandItem key={item.key} value={`${item.label} ${item.keywords}`} onSelect={() => runCommand(item.run)}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filteredActions.length > 0 && filteredDirectory.length > 0 && <CommandSeparator />}

        {filteredDirectory.length > 0 && (
          <CommandGroup heading={rikishiHeading}>
            {filteredDirectory.map((entry) => (
              <CommandItem
                key={entry.rikishiId}
                value={`${entry.shikona} ${entry.rikishiId} ${entry.heya || ''}`}
                onSelect={() =>
                  runCommand(() =>
                    navigate(`/rikishi/${encodeURIComponent(entry.rikishiId)}`),
                  )
                }
              >
                <User className="mr-2 h-4 w-4" />
                <span>{entry.shikona}</span>
                {entry.heya && (
                  <span className="ml-2 text-xs text-zinc-500">{entry.heya}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showEmptyState && (
          <div className="px-4 py-6 text-center text-sm text-zinc-500">
            No results found.
          </div>
        )}
        {!normalizedQuery && filteredDirectory.length > 0 && (
          <>
            <CommandSeparator />
            <div className="px-4 py-3 text-xs text-zinc-500">
              Start typing to search the full rikishi directory.
            </div>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
