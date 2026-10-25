import React from 'react';

export const HeroSkeleton: React.FC = () => (
  <div
    aria-hidden="true"
    className="relative w-full h-[65dvh] min-h-[420px] max-h-[760px] bg-[#1a1a1a] overflow-hidden flex items-end pb-16 px-4 sm:px-8 lg:px-14"
  >
    <div className="max-w-xl w-full space-y-4 animate-pulse">
      <div className="h-4 w-32 bg-white/10 rounded" />
      <div className="h-12 w-3/4 bg-white/10 rounded" />
      <div className="h-4 w-full bg-white/10 rounded" />
      <div className="h-4 w-5/6 bg-white/10 rounded" />
      <div className="flex gap-3 pt-2">
        <div className="h-11 w-32 bg-white/15 rounded" />
        <div className="h-11 w-36 bg-white/10 rounded" />
      </div>
    </div>
  </div>
);

export const RowSkeleton: React.FC<{ titleWidth?: string }> = ({ titleWidth = 'w-48' }) => (
  <div aria-hidden="true" className="py-4 px-4 sm:px-8 lg:px-14 space-y-3 animate-pulse">
    <div className={`h-6 ${titleWidth} bg-white/10 rounded`} />
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="aspect-video w-full rounded bg-[#1f1f1f]" />
      ))}
    </div>
  </div>
);

export const GridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div
    aria-hidden="true"
    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse"
  >
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className="aspect-[2/3] w-full rounded bg-[#1f1f1f]" />
    ))}
  </div>
);
