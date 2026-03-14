import { useState, useCallback, useRef, useEffect, useMemo, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import FallbackAvatar from '@/components/FallbackAvatar';
import PremiumBadge from '@/components/ui/premium/PremiumBadge';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  getProfileConfidencePresentation,
  getVerifiedImageUrl,
  getVerifiedProfileForIdentity,
} from '@/data/verifiedProfiles';
import { getRikishiDirectory } from '@/pages/rikishi/api';
import { searchSortedRikishiDirectory, sortRikishiDirectory } from '@/utils/rikishiDiscovery';
import { trackSearchUsage } from '@/utils/analytics';
import type { RikishiDirectoryEntry } from '../../../shared/api/v1';

const MAX_RESULTS = 12;

export default function RikishiSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: directory = [], isLoading } = useQuery({
    queryKey: ['rikishi-directory'],
    queryFn: getRikishiDirectory,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });

  const sortedDirectory = useMemo(() => sortRikishiDirectory(directory), [directory]);
  const filtered = useMemo(
    () => searchSortedRikishiDirectory(sortedDirectory, deferredSearch, MAX_RESULTS),
    [deferredSearch, sortedDirectory],
  );

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
        className="rounded-2xl border border-white/[0.08] bg-white/[0.04]"
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
          className="min-h-12 text-zinc-100 placeholder-zinc-500"
        />

        {open && search.trim().length > 0 && (
          <CommandList className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(60vh,24rem)] rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-2xl">
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
                  <CompactResultItem key={entry.rikishiId} entry={entry} onSelect={handleSelect} />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        )}
      </Command>
    </div>
  );
}

function CompactResultItem({
  entry,
  onSelect,
}: {
  entry: RikishiDirectoryEntry;
  onSelect: (rikishiId: string) => void;
}) {
  const profile = useMemo(
    () => getVerifiedProfileForIdentity(entry.rikishiId, entry.shikona),
    [entry.rikishiId, entry.shikona],
  );
  const imageUrl = useMemo(() => getVerifiedImageUrl(profile), [profile]);
  const trustMeta = profile
    ? getProfileConfidencePresentation(profile.profileConfidence)
    : { label: 'Trust metadata unavailable', detail: '', variant: 'zinc' as const };
  const divisionLabel = profile?.division ?? 'Division unpublished';
  const stableLabel = profile?.heya ?? entry.heya ?? 'Heya unpublished';

  return (
    <CommandItem
      value={`${entry.shikona} ${entry.rikishiId} ${entry.heya || ''}`}
      onSelect={() => onSelect(entry.rikishiId)}
      className="flex cursor-pointer items-start gap-3 px-3 py-3 text-zinc-200 hover:bg-white/[0.06] data-[selected=true]:bg-white/[0.06] sm:items-center sm:py-2.5"
    >
      <FallbackAvatar
        photoUrl={imageUrl}
        shikona={entry.shikona}
        rid={entry.rikishiId}
        stable={stableLabel}
        size="sm"
        showRankMarker={false}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="font-medium text-white">{entry.shikona}</span>
          <PremiumBadge variant="zinc">{divisionLabel}</PremiumBadge>
          <PremiumBadge variant={trustMeta.variant} className="hidden sm:inline-flex">{trustMeta.label}</PremiumBadge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
          <span>{stableLabel}</span>
          <span className="font-mono text-zinc-600">{entry.rikishiId}</span>
        </div>
        <div className="mt-1 text-[11px] text-zinc-500 sm:hidden">{trustMeta.label}</div>
      </div>
    </CommandItem>
  );
}
