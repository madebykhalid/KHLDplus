import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { DetailsModal } from './components/ui/DetailsModal';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Navbar } from './components/ui/Navbar';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { GridSkeleton, HeroSkeleton, RowSkeleton } from './components/ui/Skeleton';
import { CONFIG } from './config';
import type { LibraryTitle } from './types';

// Lazy-loaded route chunks: Player, hls.js, and subtitle parser stay out of the initial bundle
const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const MyListPage = lazy(() => import('./pages/MyListPage'));
const CreditsPage = lazy(() => import('./pages/CreditsPage'));
const WatchPage = lazy(() => import('./pages/Player'));

const ShellLayout: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTitle, setSelectedTitle] = useState<LibraryTitle | null>(null);
  const location = useLocation();

  const isPlayerRoute = location.pathname.startsWith('/watch/');

  // Sync CSS variable --accent from src/config.ts
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', CONFIG.accentColor);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#141414] text-white">
      <OfflineBanner />
      {!isPlayerRoute && (
        <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      )}

      <Routes>
        <Route
          path="/"
          element={
            <ErrorBoundary fallbackTitle="Failed to load Home catalog">
              <Suspense
                fallback={
                  <div>
                    <HeroSkeleton />
                    <RowSkeleton />
                    <RowSkeleton />
                  </div>
                }
              >
                <HomePage
                  searchQuery={searchQuery}
                  onSelectDetails={setSelectedTitle}
                />
              </Suspense>
            </ErrorBoundary>
          }
        />

        <Route
          path="/search"
          element={
            <ErrorBoundary fallbackTitle="Failed to load Search view">
              <Suspense
                fallback={
                  <div className="pt-24 px-4 sm:px-8 lg:px-14">
                    <GridSkeleton count={6} />
                  </div>
                }
              >
                <SearchPage
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSelectDetails={setSelectedTitle}
                />
              </Suspense>
            </ErrorBoundary>
          }
        />

        <Route
          path="/my-list"
          element={
            <ErrorBoundary fallbackTitle="Failed to load My List">
              <Suspense
                fallback={
                  <div className="pt-24 px-4 sm:px-8 lg:px-14">
                    <GridSkeleton count={6} />
                  </div>
                }
              >
                <MyListPage onSelectDetails={setSelectedTitle} />
              </Suspense>
            </ErrorBoundary>
          }
        />

        <Route
          path="/credits"
          element={
            <ErrorBoundary fallbackTitle="Failed to load Credits & Licenses">
              <Suspense
                fallback={
                  <div className="pt-24 px-4 sm:px-8 lg:px-14">
                    <GridSkeleton count={4} />
                  </div>
                }
              >
                <CreditsPage />
              </Suspense>
            </ErrorBoundary>
          }
        />

        <Route
          path="/watch/:id"
          element={
            <ErrorBoundary fallbackTitle="Video Player encountered an error">
              <Suspense
                fallback={
                  <div className="w-full h-[100dvh] bg-black flex items-center justify-center text-sm text-[#b3b3b3]">
                    Loading player...
                  </div>
                }
              >
                <WatchPage />
              </Suspense>
            </ErrorBoundary>
          }
        />

        <Route
          path="*"
          element={
            <ErrorBoundary>
              <Suspense fallback={<HeroSkeleton />}>
                <HomePage
                  searchQuery={searchQuery}
                  onSelectDetails={setSelectedTitle}
                />
              </Suspense>
            </ErrorBoundary>
          }
        />
      </Routes>

      <DetailsModal
        title={selectedTitle}
        onClose={() => setSelectedTitle(null)}
        onSelectTitle={(next) => setSelectedTitle(next)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Application Error">
      <BrowserRouter>
        <ShellLayout />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
