import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContentRow } from '../components/ui/ContentRow';
import { HeroBanner } from '../components/ui/HeroBanner';
import { TitleCard } from '../components/ui/TitleCard';
import { CONFIG } from '../config';
import { useDebounce } from '../hooks/useDebounce';
import { useLibrary } from '../store/useLibrary';
import type { LibraryTitle, TmdbCatalogFeed } from '../types';
import {
  getAllRegisteredTitles,
  registerCatalogTitles,
} from '../utils/libraryData';
import {
  ALL_DISCOVERY_FALLBACK_TITLES,
  buildFallbackCatalogFeed,
  fetchTmdbCatalogFeed,
} from '../utils/tmdb';

interface HomePageProps {
  searchQuery: string;
  onSelectDetails: (title: LibraryTitle) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ searchQuery, onSelectDetails }) => {
  const debouncedQuery = useDebounce(searchQuery, 350);
  const myListIds = useLibrary((s) => s.myList);
  const progressMap = useLibrary((s) => s.progress);
  const removeProgress = useLibrary((s) => s.removeProgress);

  const [catalog, setCatalog] = useState<TmdbCatalogFeed>(() => {
    const initial = buildFallbackCatalogFeed();
    registerCatalogTitles(ALL_DISCOVERY_FALLBACK_TITLES);
    return initial;
  });

  const [visibleInfiniteCount, setVisibleInfiniteCount] = useState<number>(2);
  const infiniteSentinelRef = useRef<HTMLDivElement | null>(null);

  // Initialize TMDB Discovery Layer (gracefully falls back to local library if key is absent/dummy)
  useEffect(() => {
    const controller = new AbortController();

    void fetchTmdbCatalogFeed(controller.signal).then((feed) => {
      if (controller.signal.aborted) return;
      registerCatalogTitles([
        ...feed.trendingNow,
        ...feed.topRatedMovies,
        ...feed.actionMovies,
        ...feed.popularTvShows,
        ...feed.infiniteRows.flatMap((r) => r.items),
      ]);
      setCatalog(feed);
    });

    return () => {
      controller.abort();
    };
  }, []);

  // Infinite-scroll row expansion via IntersectionObserver
  useEffect(() => {
    const sentinel = infiniteSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') {
      setVisibleInfiniteCount(catalog.infiniteRows.length);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisibleInfiniteCount((prev) =>
              Math.min(catalog.infiniteRows.length, prev + 2)
            );
          }
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [catalog.infiniteRows.length]);

  const heroTitle = useMemo(() => {
    return catalog.trendingNow[0] ?? ALL_DISCOVERY_FALLBACK_TITLES[0];
  }, [catalog.trendingNow]);

  const allPool = useMemo(() => {
    const map = new Map<string, LibraryTitle>();
    for (const item of getAllRegisteredTitles()) {
      map.set(item.id, item);
    }
    for (const item of ALL_DISCOVERY_FALLBACK_TITLES) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
    for (const item of [
      ...catalog.trendingNow,
      ...catalog.topRatedMovies,
      ...catalog.actionMovies,
      ...catalog.popularTvShows,
    ]) {
      map.set(item.id, item);
    }
    return Array.from(map.values());
  }, [catalog]);

  const continueWatchingItems = useMemo(() => {
    const entries = Object.values(progressMap).sort((a, b) => b.updatedAt - a.updatedAt);
    return entries
      .map((entry) => allPool.find((t) => t.id === entry.titleId))
      .filter((t): t is LibraryTitle => Boolean(t));
  }, [progressMap, allPool]);

  const myListItems = useMemo(() => {
    return myListIds
      .map((id) => allPool.find((t) => t.id === id))
      .filter((t): t is LibraryTitle => Boolean(t));
  }, [myListIds, allPool]);

  const searchResults = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return [];
    return allPool.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.overview.toLowerCase().includes(q) ||
        item.genres.some((g) => g.toLowerCase().includes(q)) ||
        item.cast.some((c) => c.toLowerCase().includes(q))
    );
  }, [debouncedQuery, allPool]);

  if (debouncedQuery.trim().length > 0) {
    return (
      <main className="min-h-[85dvh] pt-24 pb-24 px-4 sm:px-8 lg:px-14 max-w-[1920px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Search Results for &ldquo;{debouncedQuery.trim()}&rdquo;
          </h1>
          <p className="text-xs sm:text-sm text-[#b3b3b3] mt-1 tabular-nums">
            Found {searchResults.length} matching {searchResults.length === 1 ? 'title' : 'titles'}
          </p>
        </div>

        {searchResults.length === 0 ? (
          <div className="p-12 rounded-lg bg-[#1f1f1f] border border-white/10 text-center max-w-lg mx-auto my-12">
            <h2 className="text-lg font-bold text-white mb-2">No matches found</h2>
            <p className="text-sm text-[#b3b3b3]">
              Try searching for &ldquo;Tears of Steel&rdquo;, &ldquo;Sintel&rdquo;,
              &ldquo;Action&rdquo;, &ldquo;Sci-Fi&rdquo;, or &ldquo;Charade&rdquo;.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {searchResults.map((item) => (
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
  }

  return (
    <main className="min-h-screen pb-24">
      {heroTitle && <HeroBanner title={heroTitle} onMoreInfo={onSelectDetails} />}

      <div className="max-w-[1920px] mx-auto -mt-10 sm:-mt-16 relative z-20 space-y-2">
        {continueWatchingItems.length > 0 && (
          <ContentRow
            title="Continue Watching"
            items={continueWatchingItems}
            onSelectDetails={onSelectDetails}
            progressMap={progressMap}
            onRemoveContinueWatching={removeProgress}
            eager={true}
          />
        )}

        {myListItems.length > 0 && (
          <ContentRow
            title="My List"
            items={myListItems}
            onSelectDetails={onSelectDetails}
            progressMap={progressMap}
            eager={true}
          />
        )}

        <ContentRow
          title="Trending Now"
          items={catalog.trendingNow}
          onSelectDetails={onSelectDetails}
          progressMap={progressMap}
          eager={true}
        />

        <ContentRow
          title="Top Rated Movies"
          items={catalog.topRatedMovies}
          onSelectDetails={onSelectDetails}
          progressMap={progressMap}
          eager={true}
        />

        <ContentRow
          title="Action Movies"
          items={catalog.actionMovies}
          onSelectDetails={onSelectDetails}
          progressMap={progressMap}
        />

        <ContentRow
          title="Popular TV Shows"
          items={catalog.popularTvShows}
          onSelectDetails={onSelectDetails}
          progressMap={progressMap}
        />

        {catalog.infiniteRows.slice(0, visibleInfiniteCount).map((row) => (
          <ContentRow
            key={row.id}
            title={row.title}
            items={row.items}
            onSelectDetails={onSelectDetails}
            progressMap={progressMap}
          />
        ))}

        {/* Sentinel for infinite-scroll row reveal */}
        <div ref={infiniteSentinelRef} className="h-4 w-full" aria-hidden="true" />
      </div>

      {/* Quiet Monochromatic Footer */}
      <footer className="max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-14 pt-16 pb-8 border-t border-white/10 mt-12 text-xs text-[#b3b3b3] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-black text-white tracking-tight text-base">{CONFIG.brandName}</p>
          <p className="mt-1">{CONFIG.tagline}</p>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Link to="/credits" className="hover:text-white underline underline-offset-4">
            Credits &amp; Legal Licenses
          </Link>
          <Link to="/my-list" className="hover:text-white underline underline-offset-4">
            My List
          </Link>
          <Link to="/search" className="hover:text-white underline underline-offset-4">
            Browse Catalog
          </Link>
        </div>
      </footer>
    </main>
  );
};

export default HomePage;
