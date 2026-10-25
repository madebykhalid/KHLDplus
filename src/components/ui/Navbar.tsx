import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bookmark, Film, Home, Info, Search, X } from 'lucide-react';
import { useLibrary } from '../../store/useLibrary';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ searchQuery, onSearchChange }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const myListCount = useLibrary((s) => s.myList.length);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY > 10;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 0 && !searchOpen) {
      setSearchOpen(true);
    }
  }, [searchQuery, searchOpen]);

  const handleToggleSearch = () => {
    if (searchOpen) {
      onSearchChange('');
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 20);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onSearchChange(val);
    if (location.pathname !== '/' && location.pathname !== '/search' && val.trim().length > 0) {
      navigate('/');
    }
  };

  const isActivePath = (path: string) => location.pathname === path;

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-colors duration-200 pt-safe ${
          isScrolled
            ? 'bg-[#141414]/95 backdrop-blur-md border-b border-white/10'
            : 'bg-gradient-to-b from-black/85 via-black/40 to-transparent'
        }`}
      >
        <div className="max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-14 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Exact Premium KHLD+ Brand Wordmark */}
          <Link to="/" className="flex items-center no-underline select-none">
            <span
              className="text-white font-black text-3xl tracking-tighter"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              KHLD
            </span>
            <span className="text-white font-light text-3xl relative -top-1 ml-[1px]">+</span>
          </Link>

          {/* Zone 2: Primary Single-Line Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            <Link
              to="/"
              onClick={() => onSearchChange('')}
              className={`whitespace-nowrap shrink-0 py-2 transition-opacity ${
                isActivePath('/') && !searchQuery
                  ? 'text-white font-semibold underline underline-offset-8 decoration-white decoration-2'
                  : 'text-[#b3b3b3] hover:text-white'
              }`}
            >
              Home
            </Link>
            <Link
              to="/search"
              className={`whitespace-nowrap shrink-0 py-2 transition-opacity ${
                isActivePath('/search')
                  ? 'text-white font-semibold underline underline-offset-8 decoration-white decoration-2'
                  : 'text-[#b3b3b3] hover:text-white'
              }`}
            >
              Browse &amp; Search
            </Link>
            <Link
              to="/my-list"
              onClick={() => onSearchChange('')}
              className={`whitespace-nowrap shrink-0 py-2 transition-opacity ${
                isActivePath('/my-list')
                  ? 'text-white font-semibold underline underline-offset-8 decoration-white decoration-2'
                  : 'text-[#b3b3b3] hover:text-white'
              }`}
            >
              My List{myListCount > 0 ? ` (${myListCount})` : ''}
            </Link>
            <Link
              to="/credits"
              onClick={() => onSearchChange('')}
              className={`whitespace-nowrap shrink-0 py-2 transition-opacity ${
                isActivePath('/credits')
                  ? 'text-white font-semibold underline underline-offset-8 decoration-white decoration-2'
                  : 'text-[#b3b3b3] hover:text-white'
              }`}
            >
              Credits &amp; Licenses
            </Link>
          </nav>

          {/* Zone 3: Expandable Search Action */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`flex items-center rounded transition-colors ${
                searchOpen
                  ? 'bg-black/90 border border-white/40 px-2.5 py-1'
                  : 'bg-transparent border border-transparent'
              }`}
            >
              <button
                type="button"
                onClick={handleToggleSearch}
                aria-label={searchOpen ? 'Close search' : 'Open search'}
                aria-expanded={searchOpen}
                className="min-w-[44px] min-h-[44px] -m-1 flex items-center justify-center text-white hover:text-[#b3b3b3] transition-opacity focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
              >
                <Search className="w-5 h-5" aria-hidden="true" />
              </button>

              {searchOpen && (
                <div className="flex items-center">
                  <label htmlFor="navbar-search-input" className="sr-only">
                    Search titles, genres, or cast
                  </label>
                  <input
                    ref={searchInputRef}
                    id="navbar-search-input"
                    type="search"
                    value={searchQuery}
                    onChange={handleInputChange}
                    placeholder="Titles, genres, cast..."
                    className="w-40 sm:w-60 bg-transparent text-sm text-white placeholder-[#b3b3b3] focus:outline-none px-2 py-1"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => onSearchChange('')}
                      aria-label="Clear search query"
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#b3b3b3] hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#141414]/95 backdrop-blur-md border-t border-white/10 pb-safe"
      >
        <div className="grid grid-cols-4 h-14">
          <Link
            to="/"
            onClick={() => onSearchChange('')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium min-h-[44px] ${
              isActivePath('/') && !searchQuery ? 'text-white' : 'text-[#b3b3b3]'
            }`}
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Home</span>
          </Link>
          <Link
            to="/search"
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium min-h-[44px] ${
              isActivePath('/search') ? 'text-white' : 'text-[#b3b3b3]'
            }`}
          >
            <Film className="w-4 h-4" aria-hidden="true" />
            <span>Search</span>
          </Link>
          <Link
            to="/my-list"
            onClick={() => onSearchChange('')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium min-h-[44px] ${
              isActivePath('/my-list') ? 'text-white' : 'text-[#b3b3b3]'
            }`}
          >
            <Bookmark className="w-4 h-4" aria-hidden="true" />
            <span>My List</span>
          </Link>
          <Link
            to="/credits"
            onClick={() => onSearchChange('')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium min-h-[44px] ${
              isActivePath('/credits') ? 'text-white' : 'text-[#b3b3b3]'
            }`}
          >
            <Info className="w-4 h-4" aria-hidden="true" />
            <span>Credits</span>
          </Link>
        </div>
      </nav>
    </>
  );
};
