import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, User, Loader2 } from 'lucide-react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { getRikishiDirectory } from '@/pages/rikishi/api';
import { trackSearchUsage } from '@/utils/analytics';
import type { RikishiDirectoryEntry } from '../../../shared/api/v1';

const MAX_RESULTS = 12;

export default function RikishiSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: directory = [], isLoading } = useQuery({
    queryKey: ['rikishi-directory'],
    queryFn: getRikishiDirectory,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const results: RikishiDirectoryEntry[] = [];
    for (const entry of directory) {
      if (results.length >= MAX_RESULTS) break;
      const shikonaLower = entry.shikona.toLowerCase();
      const heyaLower = (entry.heya ?? '').toLowerCase();
      if (shikonaLower.includes(q) || heyaLower.includes(q) || entry.rikishiId.toLowerCase().includes(q)) {
        results.push(entry);
      }
    }
    return results;
  }, [directory, search]);

  const handleSelect = useCallback(
    (rikishiId: string) => {
      trackSearchUsage(search, filtered.length);
      setOpen(false);
      setSearch('');
      navigate(`/rikishi/${encodeURIComponent(rikishiId)}`);
    },
    [navigate, search, filtered.length],
  );

  // Close dropdown on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('pointerdown', onPointerDown);
      return () => document.removeEventListener('pointerdown', onPointerDown);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    if (open) {
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }
  }, [open]);

  // Global "/" shortcut to focus search
  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      // Don't trigger if user is in an input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onGlobalKeyDown);
    return () => document.removeEventListener('keydown', onGlobalKeyDown);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <Command
        className="rounded-xl border border-white/[0.08] bg-white/[0.04]"
        shouldFilter={false}
      >
        <CommandInput
          ref={inputRef}
          placeholder={isLoading ? 'Loading rikishi…' : 'Search rikishi by name… (press /)'}
          value={search}
          onValueChange={(v: string) => {
            setSearch(v);
            setOpen(true);
          }}
          onFocus={() => { if (search.trim()) setOpen(true); }}
          className="text-zinc-100 placeholder-zinc-500"
        />

        {open && search.trim().length > 0 && (
          <CommandList className="absolute top-full left-0 right-0 z-50 mt-1 max-h-72 rounded-xl border border-white/[0.08] bg-white/[0.03] shadow-2xl">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : filtered.length === 0 ? (
              <CommandEmpty className="py-6 text-center text-sm text-zinc-500">
                No rikishi found.
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.map((entry) => (
                  <CommandItem
                    key={entry.rikishiId}
                    value={entry.rikishiId}
                    onSelect={handleSelect}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-zinc-200 hover:bg-white/[0.06] data-[selected=true]:bg-white/[0.06]"
                  >
                    <User className="h-4 w-4 shrink-0 text-red-500" />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-white">{entry.shikona}</span>
                      {entry.heya && (
                        <span className="ml-2 text-xs text-zinc-500">{entry.heya}</span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-mono text-zinc-600">{entry.rikishiId}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        )}
      </Command>
    </div>
  );
}
