import rawLibrary from '../data/library.json';
import { CONFIG } from '../config';
import type { LibraryTitle } from '../types';
import { isPlaceholderUrl } from './env';

export const LIBRARY_TITLES: readonly LibraryTitle[] = rawLibrary as LibraryTitle[];

// Runtime registry so live TMDB items opened or played are always resolvable by ID
const runtimeCatalogMap = new Map<string, LibraryTitle>();
for (const item of LIBRARY_TITLES) {
  runtimeCatalogMap.set(item.id, item);
}

export function registerCatalogTitles(titles: readonly LibraryTitle[]): void {
  for (const item of titles) {
    runtimeCatalogMap.set(item.id, item);
  }
}

export function getAllRegisteredTitles(): LibraryTitle[] {
  return Array.from(runtimeCatalogMap.values());
}

export function getTitleById(id: string | undefined | null): LibraryTitle | undefined {
  if (!id) return undefined;
  return runtimeCatalogMap.get(id) ?? LIBRARY_TITLES.find((t) => t.id === id);
}

export function getEpisodesForSeries(seriesId: string | undefined): LibraryTitle[] {
  if (!seriesId) return [];
  return getAllRegisteredTitles()
    .filter((t) => t.seriesMetadata?.seriesId === seriesId)
    .sort((a, b) => (a.seriesMetadata?.episode ?? 0) - (b.seriesMetadata?.episode ?? 0));
}

export function getRelatedTitles(target: LibraryTitle, limit = 4): LibraryTitle[] {
  const targetGenres = new Set(target.genres);
  const pool = getAllRegisteredTitles();
  return pool
    .filter((item) => item.id !== target.id)
    .map((item) => {
      const shared = item.genres.filter((g) => targetGenres.has(g)).length;
      return { item, shared };
    })
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map((entry) => entry.item);
}

export interface PlaceholderAuditEntry {
  location: string;
  titleId: string;
  titleName: string;
  field: string;
  placeholderValue: string;
}

export function getPlaceholderUrlAudit(): PlaceholderAuditEntry[] {
  const entries: PlaceholderAuditEntry[] = [];

  if (isPlaceholderUrl(CONFIG.tmdbApiBaseUrl)) {
    entries.push({
      location: 'src/config.ts',
      titleId: 'config',
      titleName: 'TMDB API Base URL',
      field: 'tmdbApiBaseUrl',
      placeholderValue: CONFIG.tmdbApiBaseUrl,
    });
  }

  for (const title of LIBRARY_TITLES) {
    if (isPlaceholderUrl(title.poster)) {
      entries.push({
        location: 'src/data/library.json',
        titleId: title.id,
        titleName: title.title,
        field: 'poster',
        placeholderValue: title.poster,
      });
    }
    if (isPlaceholderUrl(title.backdrop)) {
      entries.push({
        location: 'src/data/library.json',
        titleId: title.id,
        titleName: title.title,
        field: 'backdrop',
        placeholderValue: title.backdrop,
      });
    }
    title.sources.forEach((src, idx) => {
      if (isPlaceholderUrl(src.url)) {
        entries.push({
          location: 'src/data/library.json',
          titleId: title.id,
          titleName: title.title,
          field: `sources[${idx}] (${src.quality} ${src.type.toUpperCase()})`,
          placeholderValue: src.url,
        });
      }
    });
  }

  return entries;
}
