import React, { useState } from 'react';
import { Film, Star } from 'lucide-react';
import type { LibraryTitle } from '../../types';
import { isPlaceholderUrl } from '../../utils/env';

interface PosterArtworkProps {
  title: LibraryTitle;
  variant: 'backdrop' | 'poster';
  className?: string;
  priority?: boolean;
  showLabels?: boolean;
}

const PALETTE_BY_ID: Record<
  string,
  { bg: string; accent: string; secondary: string; motif: string }
> = {
  'tears-of-steel': {
    bg: 'from-[#0d1926] via-[#15293d] to-[#141414]',
    accent: '#ffffff',
    secondary: '#38bdf8',
    motif: 'KHLD+ ORIGINAL · SCI-FI FEATURE',
  },
  sintel: {
    bg: 'from-[#24130f] via-[#361c15] to-[#141414]',
    accent: '#ffffff',
    secondary: '#f97316',
    motif: 'KHLD+ PREMIERE · FANTASY EPIC',
  },
  'big-buck-bunny': {
    bg: 'from-[#112217] via-[#193322] to-[#141414]',
    accent: '#ffffff',
    secondary: '#4ade80',
    motif: 'KHLD+ STUDIO · ANIMATION',
  },
  'elephants-dream': {
    bg: 'from-[#1e152a] via-[#2c1f3d] to-[#141414]',
    accent: '#ffffff',
    secondary: '#c084fc',
    motif: 'KHLD+ SELECT · SURREAL SCI-FI',
  },
  'night-of-the-living-dead': {
    bg: 'from-[#18181b] via-[#27272a] to-[#141414]',
    accent: '#ffffff',
    secondary: '#a1a1aa',
    motif: 'KHLD+ CLASSICS · 35MM RESTORATION',
  },
  'his-girl-friday': {
    bg: 'from-[#221c15] via-[#332a1f] to-[#141414]',
    accent: '#ffffff',
    secondary: '#fcd34d',
    motif: 'KHLD+ CLASSICS · HAWKS EDITION',
  },
  'cosmos-laundromat': {
    bg: 'from-[#0f2429] via-[#183840] to-[#141414]',
    accent: '#ffffff',
    secondary: '#2dd4bf',
    motif: 'KHLD+ SERIES · MULTIVERSE DRAMA',
  },
  'agent-327-barbershop': {
    bg: 'from-[#291216] via-[#3f1b22] to-[#141414]',
    accent: '#ffffff',
    secondary: '#fb7185',
    motif: 'KHLD+ ACTION · ESPIONAGE',
  },
  'charge-open-movie': {
    bg: 'from-[#111827] via-[#1e293b] to-[#141414]',
    accent: '#ffffff',
    secondary: '#60a5fa',
    motif: 'KHLD+ ACTION · CYBERPUNK',
  },
  'spring-open-movie': {
    bg: 'from-[#14261c] via-[#1e3a2b] to-[#141414]',
    accent: '#ffffff',
    secondary: '#86efac',
    motif: 'KHLD+ FEATURE · MYTHIC FANTASY',
  },
  'charade-1963': {
    bg: 'from-[#23191e] via-[#36262e] to-[#141414]',
    accent: '#ffffff',
    secondary: '#f472b6',
    motif: 'KHLD+ THRILLER · PARIS 1963',
  },
  'detour-1945': {
    bg: 'from-[#18181c] via-[#26262c] to-[#141414]',
    accent: '#ffffff',
    secondary: '#94a3b8',
    motif: 'KHLD+ NOIR · NATIONAL REGISTRY',
  },
  'caminandes-anthology-tv': {
    bg: 'from-[#1f1c14] via-[#332e20] to-[#141414]',
    accent: '#ffffff',
    secondary: '#facc15',
    motif: 'KHLD+ SERIES · 3 SEASONS',
  },
  'coffee-run-series': {
    bg: 'from-[#221622] via-[#362236] to-[#141414]',
    accent: '#ffffff',
    secondary: '#e879f9',
    motif: 'KHLD+ ANTHOLOGY · LIMITED SERIES',
  },
};

export const PosterArtwork: React.FC<PosterArtworkProps> = React.memo(
  ({ title, variant, className = '', priority = false, showLabels = true }) => {
    const rawUrl = variant === 'backdrop' ? title.backdrop : title.poster;
    const isPlaceholder = isPlaceholderUrl(rawUrl);
    const [imgError, setImgError] = useState(false);

    const palette = PALETTE_BY_ID[title.id] ?? {
      bg: 'from-[#1c1c22] via-[#272730] to-[#141414]',
      accent: '#ffffff',
      secondary: '#a1a1aa',
      motif: 'KHLD+ CINEMA CATALOG',
    };

    if (!isPlaceholder && !imgError) {
      return (
        <img
          src={rawUrl}
          alt={title.title}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover ${className}`}
        />
      );
    }

    return (
      <div
        className={`relative w-full h-full overflow-hidden bg-gradient-to-br ${palette.bg} select-none flex flex-col justify-between p-4 md:p-5 ${className}`}
        aria-label={`${title.title} (${title.year}) artwork`}
      >
        {/* Monochromatic & atmospheric cinema key-art SVG */}
        <svg
          className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
          viewBox="0 0 400 225"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id={`glow-${title.id}-${variant}`} cx="78%" cy="22%" r="68%">
              <stop offset="0%" stopColor={palette.secondary} stopOpacity="0.48" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#141414" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="225" fill={`url(#glow-${title.id}-${variant})`} />
          <circle
            cx="315"
            cy="62"
            r="76"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeOpacity="0.22"
          />
          <circle
            cx="315"
            cy="62"
            r="46"
            fill="none"
            stroke={palette.secondary}
            strokeWidth="1"
            strokeOpacity="0.32"
          />
          <path
            d="M 0 188 Q 170 132 400 172"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.8"
            strokeOpacity="0.18"
          />
        </svg>

        {showLabels && (
          <>
            <div className="relative z-10 flex items-center justify-between gap-2 text-[10px] tracking-wider text-white/75 font-semibold">
              <span className="truncate">{palette.motif}</span>
              <span className="shrink-0 text-white/60 tabular-nums">{title.year}</span>
            </div>

            <div className="relative z-10 my-auto py-1">
              <div className="flex items-center gap-1.5 text-white/70 text-[11px] mb-1">
                <Film className="w-3.5 h-3.5 shrink-0 text-white/90" />
                <span className="truncate">{title.genres.slice(0, 2).join(' · ')}</span>
              </div>
              <p
                className={`font-extrabold tracking-tight text-white leading-tight line-clamp-2 ${
                  variant === 'poster' ? 'text-base md:text-lg' : 'text-sm md:text-base'
                }`}
              >
                {title.title}
              </p>
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] text-[#b3b3b3] tabular-nums">
              <span>{title.maturity}</span>
              <span className="inline-flex items-center gap-1 text-white/90 font-semibold">
                <Star className="w-3 h-3 fill-current text-white" aria-hidden="true" />
                <span>{(title.voteAverage ?? 8.6).toFixed(1)}</span>
              </span>
            </div>
          </>
        )}
      </div>
    );
  }
);

PosterArtwork.displayName = 'PosterArtwork';
