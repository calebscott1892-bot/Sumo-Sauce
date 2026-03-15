import { useState, useCallback, useRef, useEffect, useMemo, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import FallbackAvatar from '@/components/FallbackAvatar';
import PremiumBadge from '@/components/ui/premium/PremiumBadge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { getProfileConfidencePresentation, getVerifiedImageUrl } from '@/data/verifiedProfiles';
import { searchPublishedProfileEntries, getPublishedProfileEntries, type PublishedProfileEntry } from '@/utils/publishedProfileBrowsing';
import { trackSearchUsage } from '@/utils/analytics';

const MAX_RESULTS = 12;

export default function RikishiSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const directory = useMemo(() => getPublishedProfileEntries(), []);
  const filtered = useMemo(
    () => searchPublishedProfileEntries(directory, deferredSearch, MAX_RESULTS),
    [deferredSearch, directory],
  );

  const handleSelect = useCallback(
    (entry: PublishedProfileEntry) => {
      trackSearchUsage(search, filtered.length, { surface: 'home_search', tab: 'rikishi' });
      setOpen(false);
      setSearch('');

      if (entry.routeable && entry.rikishiId) {
        navigate(`/rikishi/${encodeURIComponent(entry.rikishiId)}`);
        return;
      }

      navigate(`/rikishi?q=${encodeURIComponent(entry.shikona)}`);
    },
    [navigate, search, filtered.length],
  );

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

  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
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
      <Command className="rounded-2xl border border-white/[0.08] bg-white/[0.04]" shouldFilter={false}>
        <CommandInput
          ref={inputRef}
          placeholder="Search published rikishi profiles... (press /)"
          value={search}
          onValueChange={(value: string) => {
            setSearch(value);
            setOpen(true);
          }}
          onFocus={() => {
            if (search.trim()) setOpen(true);
          }}
          className="min-h-12 text-zinc-100 placeholder-zinc-500"
        />

        {open && search.trim().length > 0 && (
          <CommandList className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(60vh,24rem)] rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-2xl">
            {filtered.length === 0 ? (
              <CommandEmpty className="py-6 text-center text-sm text-zinc-500">
                No published profiles found.
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.map((entry) => (
                  <CompactResultItem key={entry.key} entry={entry} onSelect={handleSelect} />
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
  entry: PublishedProfileEntry;
  onSelect: (entry: PublishedProfileEntry) => void;
}) {
  const imageUrl = useMemo(() => getVerifiedImageUrl(entry.profile), [entry.profile]);
  const trustMeta = getProfileConfidencePresentation(entry.profile.profileConfidence);
  const divisionLabel = entry.division ?? 'Division unpublished';
  const stableLabel = entry.heya ?? 'Heya unpublished';

  return (
    <CommandItem
      value={`${entry.shikona} ${entry.rikishiId ?? ''} ${entry.heya || ''}`}
      onSelect={() => onSelect(entry)}
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
          <PremiumBadge variant={trustMeta.variant} className="hidden sm:inline-flex">
            {trustMeta.label}
          </PremiumBadge>
          {!entry.routeable ? (
            <PremiumBadge variant="amber" className="hidden sm:inline-flex">
              Profile only
            </PremiumBadge>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
          <span>{stableLabel}</span>
          {entry.rikishiId ? <span className="font-mono text-zinc-600">{entry.rikishiId}</span> : <span>Directory-only entry</span>}
        </div>
        <div className="mt-1 text-[11px] text-zinc-500 sm:hidden">
          {entry.routeable ? trustMeta.label : `${trustMeta.label} - opens in the profile directory`}
        </div>
      </div>
    </CommandItem>
  );
}
