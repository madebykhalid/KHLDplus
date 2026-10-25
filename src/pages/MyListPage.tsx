import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Trash2 } from 'lucide-react';
import { TitleCard } from '../components/ui/TitleCard';
import { useLibrary } from '../store/useLibrary';
import type { LibraryTitle } from '../types';
import { getAllRegisteredTitles, registerCatalogTitles } from '../utils/libraryData';
import { ALL_DISCOVERY_FALLBACK_TITLES } from '../utils/tmdb';

interface MyListPageProps {
  onSelectDetails: (title: LibraryTitle) => void;
}

export const MyListPage: React.FC<MyListPageProps> = ({ onSelectDetails }) => {
  const myListIds = useLibrary((s) => s.myList);
  const progressMap = useLibrary((s) => s.progress);
  const removeFromMyList = useLibrary((s) => s.removeFromMyList);

  const savedTitles = useMemo(() => {
    registerCatalogTitles(ALL_DISCOVERY_FALLBACK_TITLES);
    const pool = getAllRegisteredTitles();
    return myListIds
      .map((id) => pool.find((t) => t.id === id))
      .filter((t): t is LibraryTitle => Boolean(t));
  }, [myListIds]);

  return (
    <main className="min-h-screen pt-24 pb-24 px-4 sm:px-8 lg:px-14 max-w-[1920px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            My List
          </h1>
          <p className="text-xs sm:text-sm text-[#b3b3b3] mt-1 tabular-nums">
            {savedTitles.length} saved {savedTitles.length === 1 ? 'title' : 'titles'} persisted locally
          </p>
        </div>
      </div>

      {savedTitles.length === 0 ? (
        <div className="p-12 rounded-lg bg-[#1f1f1f] border border-white/10 text-center max-w-lg mx-auto my-12 space-y-4">
          <Bookmark className="w-10 h-10 text-[#b3b3b3] mx-auto" aria-hidden="true" />
          <h2 className="text-lg font-bold text-white">Your watchlist is empty</h2>
          <p className="text-sm text-[#b3b3b3]">
            Add films and series from the Home or Browse pages using the + button to keep them handy across sessions.
          </p>
          <Link
            to="/"
            className="min-h-[44px] inline-flex items-center justify-center px-6 py-2.5 rounded bg-white text-black text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Explore KHLD+ Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {savedTitles.map((item) => (
            <div key={item.id} className="space-y-2">
              <TitleCard
                title={item}
                layout="grid"
                onSelectDetails={onSelectDetails}
                progressEntry={progressMap[item.id]}
              />
              <button
                type="button"
                onClick={() => removeFromMyList(item.id)}
                className="w-full min-h-[38px] px-3 py-1.5 rounded bg-[#1f1f1f] hover:bg-white/15 border border-white/10 text-xs font-semibold text-[#b3b3b3] hover:text-white inline-flex items-center justify-center gap-1.5 transition-opacity cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Remove</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export default MyListPage;
