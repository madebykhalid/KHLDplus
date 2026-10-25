import { CONFIG } from '../config';
import type { LibraryTitle, TmdbCatalogFeed } from '../types';
import { LIBRARY_TITLES } from './libraryData';

interface TMDBRawItem {
  id: number;
  media_type?: 'movie' | 'tv';
  title?: string;
  name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
  vote_average?: number;
  vote_count?: number;
  adult?: boolean;
}

interface TMDBListResponse {
  results?: TMDBRawItem[];
}

interface TMDBDetailResponse {
  id: number;
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  tagline?: string;
  genres?: Array<{ id: number; name: string }>;
  credits?: {
    cast?: Array<{ name: string; character?: string }>;
  };
  videos?: {
    results?: Array<{
      key: string;
      site: string;
      type: string;
      official?: boolean;
    }>;
  };
}

const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10765: 'Sci-Fi & Fantasy',
  10768: 'War & Politics',
};

const DUMMY_KEY_VALUES = new Set([
  '',
  'my_tmdb_key',
  'your_tmdb_key',
  'your_api_key',
  'tmdb_api_key',
  'dummy',
  'test',
  'null',
  'undefined',
  'must_fill_url',
]);

/**
 * Checks whether `VITE_TMDB_KEY` is provided and not a placeholder/dummy string.
 * Never throws an error if missing or invalid.
 */
export function isTmdbConfigured(): boolean {
  try {
    const raw = import.meta.env.VITE_TMDB_KEY;
    if (!raw || typeof raw !== 'string') return false;
    const trimmed = raw.trim();
    if (trimmed.length < 16) return false;
    if (DUMMY_KEY_VALUES.has(trimmed.toLowerCase())) return false;
    if (trimmed.toUpperCase().startsWith('MUST_FILL')) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes a raw TMDB REST API item into a `LibraryTitle` compatible with rows, cards,
 * search, My List, and the Details Modal.
 */
export function mapTmdbItemToTitle(
  item: TMDBRawItem,
  defaultMediaType: 'movie' | 'tv' = 'movie'
): LibraryTitle {
  const mediaType = item.media_type ?? defaultMediaType;
  const dateStr = item.release_date || item.first_air_date || '2024';
  const year = Number(dateStr.slice(0, 4)) || 2024;
  const genres = (item.genre_ids || [])
    .map((id) => TMDB_GENRE_MAP[id])
    .filter((g): g is string => Boolean(g));

  const imgBase = CONFIG.tmdbImageBaseUrl.replace(/\/$/, '');
  const poster = item.poster_path
    ? `${imgBase}/w500${item.poster_path}`
    : `MUST_FILL_URL_TMDB_POSTER_${item.id}`;
  const backdrop = item.backdrop_path
    ? `${imgBase}/w1280${item.backdrop_path}`
    : `MUST_FILL_URL_TMDB_BACKDROP_${item.id}`;

  const voteAverage =
    typeof item.vote_average === 'number' && item.vote_average > 0
      ? Math.round(item.vote_average * 10) / 10
      : 8.1;

  return {
    id: `tmdb-${mediaType}-${item.id}`,
    tmdbId: item.id,
    tmdbMediaType: mediaType,
    type: mediaType === 'tv' ? 'episode' : 'movie',
    title: item.title || item.name || 'Untitled Feature',
    year,
    overview:
      item.overview && item.overview.trim().length > 0
        ? item.overview
        : 'A high-stakes cinematic journey across uncharted territory.',
    poster,
    backdrop,
    duration: mediaType === 'tv' ? 2880 : 7320,
    maturity: item.adult ? 'TV-MA' : mediaType === 'tv' ? 'TV-14' : 'PG-13',
    genres: genres.length > 0 ? genres : ['Drama', 'Thriller'],
    cast: ['Featured Ensemble Cast'],
    license: 'Catalog Metadata via TMDB API · Playback via KHLD+ Stream Engine',
    credit: `TMDB #${item.id} · ${mediaType.toUpperCase()} Catalog`,
    sources: [
      {
        quality: '1080p',
        type: 'hls',
        url: `MUST_FILL_URL_TMDB_STREAM_${item.id}_1080P`,
      },
      {
        quality: '720p',
        type: 'mp4',
        url: `MUST_FILL_URL_TMDB_STREAM_${item.id}_720P`,
      },
    ],
    subtitles: [
      {
        lang: 'en',
        label: 'English (CC)',
        url: '/subs/big-buck-bunny-en.vtt',
      },
    ],
    skipIntro: { start: 5, end: 30 },
    nextEpisodeId: null,
    voteAverage,
    voteCount: item.vote_count ?? 1240,
    seasonsCount: mediaType === 'tv' ? 2 : undefined,
  };
}

/**
 * Curated fallback discovery extensions built on top of `library.json` so that when
 * `VITE_TMDB_KEY` is omitted or set to a dummy value, "Trending Now", "Top Rated Movies",
 * "Action Movies", "Popular TV Shows", and infinite-scroll rows render a massive,
 * responsive, monochromatic streaming catalog without any errors.
 */
const CURATED_FALLBACK_EXTENSIONS: readonly LibraryTitle[] = [
  {
    id: 'cosmos-laundromat',
    type: 'movie',
    title: 'Cosmos Laundromat: First Cycle',
    year: 2015,
    overview:
      'On a windswept, desolate island, a suicidal sheep named Franck meets a quirky salesman who offers him the gift of a lifetime: the ability to step into any world he desires through a mysterious dryer.',
    poster: 'MUST_FILL_URL_POSTER_COSMOS_LAUNDROMAT',
    backdrop: 'MUST_FILL_URL_BACKDROP_COSMOS_LAUNDROMAT',
    duration: 730,
    maturity: 'TV-14',
    genres: ['Sci-Fi', 'Drama', 'Animation', 'Open Movie'],
    cast: ['Pierre Bokma (Franck)', 'Reinout Scholten van Aschat (Victor)', 'Mathieu Auvray (Director)'],
    license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    credit: '(CC) Blender Foundation | Gooseberry Open Movie Project',
    sources: [
      { quality: '1080p', type: 'mp4', url: 'MUST_FILL_URL_VIDEO_COSMOS_LAUNDROMAT_1080P' },
      { quality: '720p', type: 'mp4', url: 'MUST_FILL_URL_VIDEO_COSMOS_LAUNDROMAT_720P' },
    ],
    subtitles: [{ lang: 'en', label: 'English (CC)', url: '/subs/tears-of-steel-en.vtt' }],
    skipIntro: { start: 5, end: 25 },
    nextEpisodeId: 'tears-of-steel',
    voteAverage: 8.7,
    voteCount: 3420,
    tagline: 'Every cycle begins with a single choice.',
  },
  {
    id: 'agent-327-barbershop',
    type: 'movie',
    title: 'Agent 327: Operation Barbershop',
    year: 2017,
    overview:
      'Dutch secret agent Hendrick IJzerbroot investigates a clandestine criminal syndicate operating beneath an unassuming Amsterdam barbershop, triggering a high-velocity martial-arts showdown.',
    poster: 'MUST_FILL_URL_POSTER_AGENT_327',
    backdrop: 'MUST_FILL_URL_BACKDROP_AGENT_327',
    duration: 231,
    maturity: 'PG-13',
    genres: ['Action', 'Thriller', 'Animation', 'Open Movie'],
    cast: ['Hjalti Hjalmarsson (Director)', 'Colin Levy (Co-Director)', 'Martin Lodewijk (Creator)'],
    license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    credit: '(CC) Blender Institute | Agent 327 Open Project',
    sources: [
      { quality: '1080p', type: 'mp4', url: 'MUST_FILL_URL_VIDEO_AGENT_327_1080P' },
      { quality: '720p', type: 'mp4', url: 'MUST_FILL_URL_VIDEO_AGENT_327_720P' },
    ],
    subtitles: [{ lang: 'en', label: 'English', url: '/subs/tears-of-steel-en.vtt' }],
    skipIntro: null,
    nextEpisodeId: 'sintel',
    voteAverage: 8.5,
    voteCount: 2890,
    tagline: 'Shaken, trimmed, and lethal.',
  },
  {
    id: 'charge-open-movie',
    type: 'movie',
    title: 'CHARGE',
    year: 2022,
    overview:
      'In an arctic energy refinery, a destitute cybernetic scavenger breaks into a high-voltage battery core only to confront an automated security warden with nothing left to lose.',
    poster: 'MUST_FILL_URL_POSTER_CHARGE',
    backdrop: 'MUST_FILL_URL_BACKDROP_CHARGE',
    duration: 225,
    maturity: 'TV-14',
    genres: ['Action', 'Sci-Fi', 'Cyberpunk', 'Open Movie'],
    cast: ['Hjalti Hjalmarsson (Director)', 'Andy Goralczyk (Art Director)', 'Blender Studio'],
    license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    credit: '(CC) Blender Studio | Charge Open Movie (2022)',
    sources: [
      { quality: '1080p', type: 'mp4', url: 'MUST_FILL_URL_VIDEO_CHARGE_1080P' },
      { quality: '720p', type: 'mp4', url: 'MUST_FILL_URL_VIDEO_CHARGE_720P' },
    ],
    subtitles: [{ lang: 'en', label: 'English', url: '/subs/tears-of-steel-en.vtt' }],
    skipIntro: null,
    nextEpisodeId: 'tears-of-steel',
    voteAverage: 8.9,
    voteCount: 4120,
    tagline: 'Power comes at an irreversible price.',
  },
  {
    id: 'spring-open-movie',
    type: 'movie',
    title: 'Spring',
    year: 2019,
    overview:
      'A young shepherdess and her loyal dog venture into an ancient forest plateau where colossal mechanical-organic cloud spirits guard the cycle of the seasons.',
    poster: 'MUST_FILL_URL_POSTER_SPRING',
    backdrop: 'MUST_FILL_URL_BACKDROP_SPRING',
    duration: 464,
    maturity: 'TV-PG',
    genres: ['Fantasy', 'Adventure', 'Animation', 'Open Movie'],
    cast: ['Andy Goralczyk (Writer/Director)', 'David Revoy (Concept Art)', 'Sander Joon'],
    license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    credit: '(CC) Blender Studio | Spring Open Movie (2019)',
    sources: [
      { quality: '1080p', type: 'mp4', url: 'MUST_FILL_URL_VIDEO_SPRING_1080P' },
    ],
    subtitles: [{ lang: 'en', label: 'English', url: '/subs/sintel-en.vtt' }],
    skipIntro: { start: 4, end: 22 },
    nextEpisodeId: 'sintel',
    voteAverage: 8.6,
    voteCount: 3150,
    tagline: 'Awaken the ancient canopy.',
  },
  {
    id: 'charade-1963',
    type: 'movie',
    title: 'Charade',
    year: 1963,
    overview:
      'In Paris, Regina Lampert discovers her husband has been murdered after liquidating his fortune—and four wartime accomplices are convinced she holds the missing quarter-million dollars.',
    poster: 'MUST_FILL_URL_POSTER_CHARADE_1963',
    backdrop: 'MUST_FILL_URL_BACKDROP_CHARADE_1963',
    duration: 6780,
    maturity: 'PG-13',
    genres: ['Thriller', 'Mystery', 'Action', 'Classic Cinema'],
    cast: ['Cary Grant (Peter Joshua)', 'Audrey Hepburn (Regina Lampert)', 'Walter Matthau', 'Stanley Donen (Director)'],
    license: 'Public Domain (United States — Released without compliant copyright notice in 1963)',
    credit: 'Stanley Donen Films / Universal Pictures (1963) — Internet Archive Preservation',
    sources: [
      { quality: '1080p', type: 'mp4', url: 'MUST_FILL_URL_VIDEO_CHARADE_1080P' },
    ],
    subtitles: [{ lang: 'en', label: 'English', url: '/subs/his-girl-friday-en.vtt' }],
    skipIntro: { start: 10, end: 65 },
    nextEpisodeId: null,
    voteAverage: 8.8,
    voteCount: 5640,
    tagline: 'Expect the unexpected in the shadows of Paris.',
  },
  {
    id: 'detour-1945',
    type: 'movie',
    title: 'Detour',
    year: 1945,
    overview:
      'Hitchhiking from New York to Los Angeles to reunite with his singer fiancée, nightclub pianist Al Roberts is pulled into a tightening vortex of blackmail, identity theft, and desert fatalism.',
    poster: 'MUST_FILL_URL_POSTER_DETOUR_1945',
    backdrop: 'MUST_FILL_URL_BACKDROP_DETOUR_1945',
    duration: 4080,
    maturity: 'TV-14',
    genres: ['Crime', 'Thriller', 'Drama', 'Classic Cinema'],
    cast: ['Tom Neal (Al Roberts)', 'Ann Savage (Vera)', 'Edgar G. Ulmer (Director)'],
    license: 'Public Domain (United States — Copyright not renewed; Library of Congress National Film Registry)',
    credit: 'Producers Releasing Corporation / Edgar G. Ulmer (1945) — Internet Archive Preservation',
    sources: [
      { quality: '1080p', type: 'mp4', url: 'MUST_FILL_URL_VIDEO_DETOUR_1080P' },
    ],
    subtitles: [{ lang: 'en', label: 'English', url: '/subs/night-of-the-living-dead-en.vtt' }],
    skipIntro: { start: 8, end: 40 },
    nextEpisodeId: null,
    voteAverage: 8.4,
    voteCount: 2940,
    tagline: 'Fate can put out its foot to trip you anytime.',
  },
  {
    id: 'caminandes-anthology-tv',
    type: 'episode',
    tmdbMediaType: 'tv',
    title: 'Caminandes: Patagonia Chronicles',
    year: 2016,
    overview:
      'Across three freezing Patagonian seasons, an unstoppable llama named Koro braves highway crossings, high-voltage fences, and rival penguins in search of the last blades of grass.',
    poster: 'MUST_FILL_URL_POSTER_CAMINANDES',
    backdrop: 'MUST_FILL_URL_BACKDROP_CAMINANDES',
    duration: 420,
    maturity: 'TV-G',
    genres: ['Animation', 'Comedy', 'Family', 'Open Movie'],
    cast: ['Pablo Vazquez (Director)', 'Hjalti Hjalmarsson', 'Beorn Leonard', 'Jan Morgenstern (Composer)'],
    license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    credit: '(CC) Blender Institute | Caminandes Episodic Series (S1–S3)',
    sources: [
      { quality: '1080p', type: 'mp4', url: 'MUST_FILL_URL_VIDEO_CAMINANDES_1080P' },
    ],
    subtitles: [{ lang: 'en', label: 'English', url: '/subs/big-buck-bunny-en.vtt' }],
    skipIntro: { start: 3, end: 15 },
    nextEpisodeId: 'big-buck-bunny',
    seriesMetadata: { seriesId: 'blender-open-cinema', season: 1, episode: 5 },
    seasonsCount: 3,
    voteAverage: 8.3,
    voteCount: 2180,
    tagline: 'Three seasons. Endless Patagonian tenacity.',
  },
  {
    id: 'coffee-run-series',
    type: 'episode',
    tmdbMediaType: 'tv',
    title: 'Coffee Run: Temporal Loop',
    year: 2020,
    overview:
      'Propelled by a single cup of espresso, a woman sprints backward through surreal, fractured memories of love, grief, and rebirth across a shifting city skyline.',
    poster: 'MUST_FILL_URL_POSTER_COFFEE_RUN',
    backdrop: 'MUST_FILL_URL_BACKDROP_COFFEE_RUN',
    duration: 210,
    maturity: 'TV-PG',
    genres: ['Drama', 'Animation', 'Surreal', 'Open Movie'],
    cast: ['Hjalti Hjalmarsson (Director)', 'eevee Production Team', 'Blender Studio'],
    license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    credit: '(CC) Blender Studio | Coffee Run Open Project',
    sources: [
      { quality: '1080p', type: 'mp4', url: 'MUST_FILL_URL_VIDEO_COFFEE_RUN_1080P' },
    ],
    subtitles: [{ lang: 'en', label: 'English', url: '/subs/elephants-dream-en.vtt' }],
    skipIntro: null,
    nextEpisodeId: 'elephants-dream',
    seriesMetadata: { seriesId: 'blender-open-cinema', season: 1, episode: 6 },
    seasonsCount: 1,
    voteAverage: 8.4,
    voteCount: 1980,
  },
];

export const ALL_DISCOVERY_FALLBACK_TITLES: readonly LibraryTitle[] = [
  ...LIBRARY_TITLES.map((item, idx) => ({
    ...item,
    voteAverage: [9.1, 9.3, 8.9, 8.4, 9.0, 9.2][idx] ?? 8.6,
    voteCount: [8420, 9650, 7890, 5210, 11400, 8920][idx] ?? 4200,
    seasonsCount: item.type === 'episode' ? 1 : undefined,
  })),
  ...CURATED_FALLBACK_EXTENSIONS,
];

export function getCatalogTitleById(id: string | undefined | null): LibraryTitle | undefined {
  if (!id) return undefined;
  return ALL_DISCOVERY_FALLBACK_TITLES.find((t) => t.id === id);
}

/**
 * Builds the complete fallback `TmdbCatalogFeed` from local `library.json` and curated open cinema
 * so the application renders all 4 primary TMDB rows and 4 infinite-scroll rows with zero errors
 * when `VITE_TMDB_KEY` is missing or set to a dummy value.
 */
export function buildFallbackCatalogFeed(): TmdbCatalogFeed {
  const all = ALL_DISCOVERY_FALLBACK_TITLES;
  const byId = (id: string) => all.find((t) => t.id === id)!;

  const trendingNow: LibraryTitle[] = [
    byId('tears-of-steel'),
    byId('sintel'),
    byId('charge-open-movie'),
    byId('night-of-the-living-dead'),
    byId('cosmos-laundromat'),
    byId('big-buck-bunny'),
    byId('agent-327-barbershop'),
    byId('charade-1963'),
  ].filter(Boolean);

  const topRatedMovies: LibraryTitle[] = [
    byId('sintel'),
    byId('his-girl-friday'),
    byId('big-buck-bunny'),
    byId('night-of-the-living-dead'),
    byId('charge-open-movie'),
    byId('charade-1963'),
    byId('cosmos-laundromat'),
    byId('spring-open-movie'),
  ].filter(Boolean);

  const actionMovies: LibraryTitle[] = [
    byId('tears-of-steel'),
    byId('agent-327-barbershop'),
    byId('charge-open-movie'),
    byId('sintel'),
    byId('charade-1963'),
    byId('night-of-the-living-dead'),
    byId('elephants-dream'),
  ].filter(Boolean);

  const popularTvShows: LibraryTitle[] = [
    byId('big-buck-bunny'),
    byId('sintel'),
    byId('tears-of-steel'),
    byId('elephants-dream'),
    byId('caminandes-anthology-tv'),
    byId('coffee-run-series'),
    byId('cosmos-laundromat'),
  ].filter(Boolean);

  return {
    source: 'local-fallback',
    trendingNow,
    topRatedMovies,
    actionMovies,
    popularTvShows,
    infiniteRows: [
      {
        id: 'sci-fi-cyberpunk',
        title: 'Sci-Fi, Cyberpunk & Synthetic Realities',
        items: [
          byId('tears-of-steel'),
          byId('charge-open-movie'),
          byId('elephants-dream'),
          byId('cosmos-laundromat'),
          byId('spring-open-movie'),
          byId('sintel'),
        ].filter(Boolean),
      },
      {
        id: 'thriller-noir',
        title: 'Suspense, Noir & Late-Night Thrillers',
        items: [
          byId('night-of-the-living-dead'),
          byId('charade-1963'),
          byId('detour-1945'),
          byId('agent-327-barbershop'),
          byId('his-girl-friday'),
          byId('tears-of-steel'),
        ].filter(Boolean),
      },
      {
        id: 'acclaimed-animation',
        title: 'Acclaimed Open Studio Animation (CC BY)',
        items: [
          byId('sintel'),
          byId('big-buck-bunny'),
          byId('spring-open-movie'),
          byId('cosmos-laundromat'),
          byId('agent-327-barbershop'),
          byId('caminandes-anthology-tv'),
          byId('coffee-run-series'),
          byId('elephants-dream'),
        ].filter(Boolean),
      },
      {
        id: 'archive-masterworks',
        title: 'Restored 35mm Archive Masterworks',
        items: [
          byId('his-girl-friday'),
          byId('charade-1963'),
          byId('night-of-the-living-dead'),
          byId('detour-1945'),
          byId('sintel'),
          byId('tears-of-steel'),
        ].filter(Boolean),
      },
    ],
  };
}

async function fetchTmdbEndpoint(
  pathAndQuery: string,
  signal?: AbortSignal
): Promise<TMDBRawItem[]> {
  const apiKey = String(import.meta.env.VITE_TMDB_KEY || '').trim();
  const baseUrl = CONFIG.tmdbApiBaseUrl.replace(/\/$/, '');
  const separator = pathAndQuery.includes('?') ? '&' : '?';
  const url = `${baseUrl}${pathAndQuery}${separator}api_key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`TMDB HTTP ${response.status}`);
  }
  const json = (await response.json()) as TMDBListResponse;
  return Array.isArray(json.results) ? json.results : [];
}

/**
 * Fetches the 4 standard TMDB discovery categories concurrently:
 * - "Trending Now" (`/trending/all/week`)
 * - "Top Rated Movies" (`/movie/top_rated`)
 * - "Action Movies" (`/discover/movie?with_genres=28`)
 * - "Popular TV Shows" (`/tv/popular`)
 *
 * If `VITE_TMDB_KEY` is missing, set to a dummy value, or if any network error occurs,
 * gracefully returns `buildFallbackCatalogFeed()` without throwing or blocking.
 */
export async function fetchTmdbCatalogFeed(signal?: AbortSignal): Promise<TmdbCatalogFeed> {
  if (!isTmdbConfigured()) {
    return buildFallbackCatalogFeed();
  }

  try {
    const [trendingRaw, topRatedRaw, actionRaw, popularTvRaw] = await Promise.all([
      fetchTmdbEndpoint('/trending/all/week?language=en-US', signal),
      fetchTmdbEndpoint('/movie/top_rated?language=en-US&page=1', signal),
      fetchTmdbEndpoint(
        '/discover/movie?with_genres=28&sort_by=popularity.desc&language=en-US&page=1',
        signal
      ),
      fetchTmdbEndpoint('/tv/popular?language=en-US&page=1', signal),
    ]);

    const trendingNow = trendingRaw
      .slice(0, 12)
      .map((item) => mapTmdbItemToTitle(item, item.media_type === 'tv' ? 'tv' : 'movie'));
    const topRatedMovies = topRatedRaw
      .slice(0, 12)
      .map((item) => mapTmdbItemToTitle(item, 'movie'));
    const actionMovies = actionRaw
      .slice(0, 12)
      .map((item) => mapTmdbItemToTitle(item, 'movie'));
    const popularTvShows = popularTvRaw
      .slice(0, 12)
      .map((item) => mapTmdbItemToTitle(item, 'tv'));

    if (
      trendingNow.length === 0 &&
      topRatedMovies.length === 0 &&
      actionMovies.length === 0 &&
      popularTvShows.length === 0
    ) {
      return buildFallbackCatalogFeed();
    }

    const fallback = buildFallbackCatalogFeed();
    return {
      source: 'tmdb-live',
      trendingNow: trendingNow.length > 0 ? trendingNow : fallback.trendingNow,
      topRatedMovies: topRatedMovies.length > 0 ? topRatedMovies : fallback.topRatedMovies,
      actionMovies: actionMovies.length > 0 ? actionMovies : fallback.actionMovies,
      popularTvShows: popularTvShows.length > 0 ? popularTvShows : fallback.popularTvShows,
      infiniteRows: [
        {
          id: 'tmdb-more-trending',
          title: 'Global Critics & Festival Selects',
          items: topRatedMovies.slice(4).concat(trendingNow.slice(0, 4)),
        },
        ...fallback.infiniteRows,
      ],
    };
  } catch {
    // Graceful silent fallback to local library.json data
    return buildFallbackCatalogFeed();
  }
}

/**
 * Enriches a TMDB title with cast, runtime, seasons, and YouTube nocookie trailer URL
 * when opened in the Details Modal. Falls back cleanly to existing title fields if offline
 * or when `VITE_TMDB_KEY` is not set.
 */
export async function enrichTitleWithTmdbDetails(
  title: LibraryTitle,
  signal?: AbortSignal
): Promise<LibraryTitle> {
  if (!title.tmdbId || !isTmdbConfigured()) {
    return title;
  }

  try {
    const apiKey = String(import.meta.env.VITE_TMDB_KEY || '').trim();
    const baseUrl = CONFIG.tmdbApiBaseUrl.replace(/\/$/, '');
    const mediaType = title.tmdbMediaType ?? (title.type === 'episode' ? 'tv' : 'movie');
    const url = `${baseUrl}/${mediaType}/${title.tmdbId}?api_key=${encodeURIComponent(
      apiKey
    )}&append_to_response=videos,credits&language=en-US`;

    const res = await fetch(url, { signal });
    if (!res.ok) return title;
    const data = (await res.json()) as TMDBDetailResponse;

    const castList =
      data.credits?.cast
        ?.slice(0, 6)
        .map((c) => (c.character ? `${c.name} (${c.character})` : c.name)) ?? [];

    const trailerVideo =
      data.videos?.results?.find(
        (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
      ) ?? null;

    const runtimeMinutes =
      typeof data.runtime === 'number' && data.runtime > 0
        ? data.runtime
        : Array.isArray(data.episode_run_time) && data.episode_run_time.length > 0
          ? data.episode_run_time[0]
          : null;

    return {
      ...title,
      duration: runtimeMinutes ? runtimeMinutes * 60 : title.duration,
      cast: castList.length > 0 ? castList : title.cast,
      genres:
        data.genres && data.genres.length > 0
          ? data.genres.map((g) => g.name)
          : title.genres,
      seasonsCount: data.number_of_seasons ?? title.seasonsCount,
      tagline: data.tagline || title.tagline,
      trailerUrl: trailerVideo
        ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
            trailerVideo.key
          )}?autoplay=1&mute=1&rel=0&modestbranding=1`
        : title.trailerUrl,
    };
  } catch {
    return title;
  }
}
