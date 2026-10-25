import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { TitleCard } from '../components/ui/TitleCard';
import { useDebounce } from '../hooks/useDebounce';
import { useLibrary } from '../store/useLibrary';
import type { LibraryTitle } from '../types';
import { getAllRegisteredTitles, registerCatalogTitles } from '../utils/libraryData';
import { ALL_DISCOVERY_FALLBACK_TITLES } from '../utils/tmdb';

interface SearchPageProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectDetails: (title: LibraryTitle) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  searchQuery,
  onSearchChange,
  onSelectDetails,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const debouncedQuery = useDebounce(searchQuery, 350);
  const progressMap = useLibrary((s) => s.progress);

  const catalogPool = useMemo(() => {
    registerCatalogTitles(ALL_DISCOVERY_FALLBACK_TITLES);
    return getAllRegisteredTitles();
  }, []);

  const genres = useMemo(() => {
    const set = new Set<string>(['All']);
    for (const item of catalogPool) {
      for (const g of item.genres) {
        set.add(g);
      }
    }
    return Array.from(set);
  }, [catalogPool]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return catalogPool.filter((item) => {
      const matchesGenre =
        selectedGenre === 'All' || item.genres.includes(selectedGenre);
      if (!matchesGenre) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.overview.toLowerCase().includes(q) ||
        item.genres.some((g) => g.toLowerCase().includes(q)) ||
        item.cast.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [debouncedQuery, selectedGenre, catalogPool]);

  return (
    <main className="min-h-screen pt-24 pb-24 px-4 sm:px-8 lg:px-14 max-w-[1920px] mx-auto space-y-8">
      <div className="max-w-2xl space-y-3">
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
          Browse &amp; Search Catalog
        </h1>
        <p className="text-sm text-[#b3b3b3]">
          Filter by genre or search across movies, series, directors, cast, and synopses.
        </p>

        <div className="relative flex items-center">
          <Search
            className="w-5 h-5 text-[#b3b3b3] absolute left-3.5 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="page-search-input" className="sr-only">
            Search catalog
          </label>
          <input
            id="page-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Tears of Steel, Sintel, Charade, Action, Sci-Fi..."
            className="w-full min-h-[48px] pl-11 pr-11 py-2.5 rounded bg-[#1f1f1f] border border-white/20 text-white placeholder-[#b3b3b3] text-sm sm:text-base focus:outline-2 focus:outline-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search input"
              className="absolute right-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#b3b3b3] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Genre Filter Controls */}
      <div
        role="group"
        aria-label="Filter by genre"
        className="flex flex-wrap items-center gap-2"
      >
        {genres.map((genre) => {
          const active = selectedGenre === genre;
          return (
            <button
              key={genre}
              type="button"
              onClick={() => setSelectedGenre(genre)}
              className={`min-h-[40px] px-4 py-1.5 rounded text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-opacity cursor-pointer ${
                active
                  ? 'bg-white text-black'
                  : 'bg-[#1f1f1f] text-[#b3b3b3] hover:text-white border border-white/10'
              }`}
            >
              {genre}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 rounded-lg bg-[#1f1f1f] border border-white/10 text-center max-w-md mx-auto">
          <p className="text-base font-bold text-white mb-1">No matching titles</p>
          <p className="text-xs sm:text-sm text-[#b3b3b3] mb-4">
            No films matched &ldquo;{debouncedQuery}&rdquo; in {selectedGenre}.
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              setSelectedGenre('All');
            }}
            className="min-h-[44px] px-5 py-2 rounded bg-white text-black text-xs font-bold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map((item) => (
            <TitleCard
              key={item.id}
              title={item}
              layout="grid"
              onSelectDetails={onSelectDetails}
              progressEntry={progressMap[item.id]}
            />
          ))}
        </div>
      )}
    </main>
  );
};

export default SearchPage;
