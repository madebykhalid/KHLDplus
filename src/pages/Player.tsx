import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { getTitleById, registerCatalogTitles } from '../utils/libraryData';
import { ALL_DISCOVERY_FALLBACK_TITLES } from '../utils/tmdb';

export const Player: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  registerCatalogTitles(ALL_DISCOVERY_FALLBACK_TITLES);
  const title = getTitleById(id);

  if (!title) {
    return (
      <main className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md p-8 rounded-lg bg-[#181818] border border-white/15 space-y-4">
          <h1 className="text-xl font-bold">Title Unavailable for Playback</h1>
          <p className="text-sm text-[#b3b3b3]">
            No library entry matches ID &ldquo;{id ?? ''}&rdquo;.
          </p>
          <Link
            to="/"
            className="min-h-[44px] inline-flex items-center justify-center px-6 py-2.5 rounded bg-white text-black text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return <VideoPlayer title={title} />;
};

export default Player;
