export const BRAND_NAME = 'KHLD+';
export const ACCENT_COLOR = '#ffffff';
export const TAGLINE = 'Cinematic Streaming & Curated Global Archives.';

export interface BrandConfig {
  readonly brandName: string;
  readonly accentColor: string;
  readonly tagline: string;
  readonly storagePrefix: string;
  readonly storageVersion: string;
  readonly storageKeys: {
    readonly prefs: string;
    readonly library: string;
  };
  readonly tmdbApiBaseUrl: string;
  readonly tmdbImageBaseUrl: string;
  readonly streamExtractorUrl: string;
}

/**
 * Central brand and runtime configuration for KHLD+.
 * VITE_TMDB_KEY and STREAM_EXTRACTOR_URL are completely optional; when absent or set to
 * a dummy value, the app gracefully falls back to local library.json data.
 */
export const CONFIG: BrandConfig = {
  brandName: BRAND_NAME,
  accentColor: ACCENT_COLOR,
  tagline: TAGLINE,
  storagePrefix: 'streamly',
  storageVersion: 'v1',
  storageKeys: {
    prefs: 'streamly:v1:prefs',
    library: 'streamly:v1:library',
  },
  tmdbApiBaseUrl: 'https://api.themoviedb.org/3',
  tmdbImageBaseUrl: 'https://image.tmdb.org/t/p',
  streamExtractorUrl: '/api/stream-extractor',
};
