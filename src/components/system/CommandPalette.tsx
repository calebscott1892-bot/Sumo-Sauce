import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar, Users, User, BarChart3, Dice5, Shuffle, Swords, Clock } from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { getRikishiDirectory } from '@/pages/rikishi/api';
import { recentBashoIds } from '@/utils/basho';

const MAX_RESULTS = 20;

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
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

  const visibleDirectory = useMemo(() => directory.slice(0, MAX_RESULTS), [directory]);

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
      callback();
    },
    [],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search rikishi… (⌘K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
            <Search className="mr-2 h-4 w-4" />
            Go to home
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/search'))}>
            <Search className="mr-2 h-4 w-4" />
            Full search page
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/rikishi'))}>
            <Users className="mr-2 h-4 w-4" />
            Browse rikishi directory
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/basho'))}>
            <Calendar className="mr-2 h-4 w-4" />
            Browse basho history
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/analytics'))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Open analytics
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/analytics/kimarite'))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Open kimarite analytics
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/rivalries'))}>
            <Swords className="mr-2 h-4 w-4" />
            Explore rivalries
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/analytics/eras'))}>
            <Clock className="mr-2 h-4 w-4" />
            Era analytics
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/timeline'))}>
            <Calendar className="mr-2 h-4 w-4" />
            Basho timeline
          </CommandItem>
          <CommandItem onSelect={() => runCommand(randomRikishi)}>
            <Shuffle className="mr-2 h-4 w-4" />
            Random rikishi
          </CommandItem>
          <CommandItem onSelect={() => runCommand(randomBasho)}>
            <Dice5 className="mr-2 h-4 w-4" />
            Random basho
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Rikishi">
          {visibleDirectory.map((entry) => (
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
      </CommandList>
    </CommandDialog>
  );
}
