export type MediaType = 'movie' | 'episode';
export type VideoQuality = '1080p' | '720p' | '480p';
export type StreamSourceType = 'mp4' | 'hls';

export interface VideoSource {
  quality: VideoQuality;
  type: StreamSourceType;
  url: string;
}

export interface SubtitleTrack {
  lang: string;
  label: string;
  url: string;
  isCustom?: boolean;
  rawContent?: string;
}

export interface SkipIntroSegment {
  start: number;
  end: number;
}

export interface SeriesMetadata {
  seriesId: string;
  season: number;
  episode: number;
}

export interface LibraryTitle {
  id: string;
  type: MediaType;
  title: string;
  year: number;
  overview: string;
  poster: string;
  backdrop: string;
  duration: number; // in seconds
  maturity: string;
  genres: string[];
  cast: string[];
  license: string;
  credit: string;
  sources: VideoSource[];
  subtitles: SubtitleTrack[];
  skipIntro: SkipIntroSegment | null;
  nextEpisodeId: string | null;
  seriesMetadata?: SeriesMetadata;
  /** Optional YouTube nocookie embed URL if provided */
  trailerUrl?: string;
  /** True when item comes from external TMDB discovery without direct local video stream */
  tmdbOnly?: boolean;
  tmdbId?: number;
  tmdbMediaType?: 'movie' | 'tv';
  voteAverage?: number;
  voteCount?: number;
  seasonsCount?: number;
  tagline?: string;
}

export interface TmdbCatalogFeed {
  source: 'tmdb-live' | 'local-fallback';
  trendingNow: LibraryTitle[];
  topRatedMovies: LibraryTitle[];
  actionMovies: LibraryTitle[];
  popularTvShows: LibraryTitle[];
  infiniteRows: Array<{
    id: string;
    title: string;
    items: LibraryTitle[];
  }>;
}

export type SubtitleFontSize = 'sm' | 'md' | 'lg' | 'xl';
export type SubtitleColor = '#ffffff' | '#facc15' | '#38bdf8' | '#4ade80';
export type SubtitleBgOpacity = 'none' | 'semi' | 'solid';
export type SubtitleEdgeStyle = 'none' | 'drop-shadow' | 'outline' | 'raised';

export interface SubtitleStylePrefs {
  fontSize: SubtitleFontSize;
  color: SubtitleColor;
  background: SubtitleBgOpacity;
  edge: SubtitleEdgeStyle;
}

export interface PrefsState {
  volume: number;
  muted: boolean;
  speed: number;
  subtitleStyle: SubtitleStylePrefs;
  subtitleLang: string; // 'off' or lang code like 'en'
  subtitleOffset: number; // in seconds, steps of 0.25
  pauseOnTabHidden: boolean;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setSpeed: (speed: number) => void;
  setSubtitleStyle: (partial: Partial<SubtitleStylePrefs>) => void;
  setSubtitleLang: (lang: string) => void;
  setSubtitleOffset: (offset: number) => void;
  adjustSubtitleOffset: (delta: number) => void;
  setPauseOnTabHidden: (enabled: boolean) => void;
  resetDefaults: () => void;
}

export interface WatchProgressEntry {
  titleId: string;
  position: number; // seconds
  duration: number; // seconds
  updatedAt: number; // epoch ms
}

export interface LibraryState {
  myList: string[];
  progress: Record<string, WatchProgressEntry>;
  toggleMyList: (titleId: string) => void;
  addToMyList: (titleId: string) => void;
  removeFromMyList: (titleId: string) => void;
  isInMyList: (titleId: string) => boolean;
  updateProgress: (titleId: string, position: number, duration: number) => void;
  removeProgress: (titleId: string) => void;
  clearAllProgress: () => void;
}

export type CueToken =
  | { type: 'text'; text: string }
  | { type: 'i'; children: CueToken[] }
  | { type: 'b'; children: CueToken[] };

export interface SubtitleCue {
  id: string;
  start: number; // seconds
  end: number; // seconds
  rawText: string;
  tokens: CueToken[];
}
