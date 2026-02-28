import React, { useMemo, useState } from 'react';
import { ChevronRight, Crown, Star } from 'lucide-react';
import { isUsableHttpUrl } from '@/utils/photo';

const SIZE_MAP = {
  sm: {
    outer: 'h-12 w-12',
    initials: 'text-lg',
    marker: 'h-4 w-4',
    markerIcon: 'h-2.5 w-2.5',
  },
  md: {
    outer: 'h-20 w-20',
    initials: 'text-2xl',
    marker: 'h-5 w-5',
    markerIcon: 'h-3 w-3',
  },
};

const RING_COLORS = [
  'ring-red-500/70',
  'ring-orange-500/70',
  'ring-amber-500/70',
  'ring-lime-500/70',
  'ring-emerald-500/70',
  'ring-cyan-500/70',
  'ring-sky-500/70',
  'ring-indigo-500/70',
  'ring-violet-500/70',
  'ring-fuchsia-500/70',
];

function toInitial(value) {
  const safe = String(value || '').trim();
  return safe ? safe[0].toUpperCase() : '';
}

function getAvatarInitial(shikona, rid) {
  return toInitial(shikona) || toInitial(rid) || '?';
}

function hashString(input) {
  const text = String(input || 'sumo');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function rankTier(rank) {
  const tier = String(rank || '').trim();
  if (!tier) return 'Maegashira';
  return tier;
}

function RankMarker({ tier, iconClass }) {
  if (tier === 'Yokozuna') return <Crown className={`${iconClass} text-yellow-300`} aria-hidden="true" />;
  if (tier === 'Ozeki') return <Star className={`${iconClass} text-amber-300`} aria-hidden="true" />;
  if (tier === 'Sekiwake' || tier === 'Komusubi') {
    return <ChevronRight className={`${iconClass} text-zinc-300`} aria-hidden="true" />;
  }
  return <span className="text-[9px] font-black leading-none text-zinc-200">M</span>;
}

export default function FallbackAvatar({
  photoUrl,
  shikona,
  rid,
  stable,
  rank,
  size = 'sm',
  className = '',
  onImageError,
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const sizing = SIZE_MAP[size] || SIZE_MAP.sm;
  const usablePhoto = isUsableHttpUrl(photoUrl) ? String(photoUrl).trim() : '';
  const showPhoto = Boolean(usablePhoto) && !imgFailed;

  const initial = useMemo(() => getAvatarInitial(shikona, rid), [shikona, rid]);
  const ringColor = useMemo(() => {
    const key = String(stable || rid || shikona || 'sumo').trim().toLowerCase();
    return RING_COLORS[hashString(key) % RING_COLORS.length];
  }, [stable, rid, shikona]);

  const tier = rankTier(rank);
  const label = String(shikona || rid || 'Wrestler').trim();

  return (
    <div
      className={`relative ${sizing.outer} shrink-0 overflow-hidden rounded-full ring-2 ${ringColor} ${className}`}
      aria-label={`${label} avatar`}
    >
      {showPhoto ? (
        <img
          src={usablePhoto}
          alt={label}
          className="h-full w-full object-cover"
          onError={() => {
            setImgFailed(true);
            if (typeof onImageError === 'function') {
              onImageError();
            }
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-700 text-zinc-100">
          <span className={`${sizing.initials} font-black tracking-tight`}>{initial}</span>
        </div>
      )}

      <span
        className={`absolute -bottom-0.5 -right-0.5 flex ${sizing.marker} items-center justify-center rounded-full border border-zinc-700 bg-zinc-900`}
        title={tier}
      >
        <RankMarker tier={tier} iconClass={sizing.markerIcon} />
      </span>
    </div>
  );
}
