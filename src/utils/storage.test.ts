import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractM3u8UrlFromPayload,
  rewriteM3u8Manifest,
} from '../../api/stream-extractor.ts';
import { ACCENT_COLOR, BRAND_NAME } from '../config.ts';
import libraryDataRaw from '../data/library.json' with { type: 'json' };
import { formatRuntime, formatTimecode, isPlaceholderUrl } from './env.ts';
import { readSafeJson, safeStorage, writeSafeJson } from './storage.ts';
import {
  ALL_DISCOVERY_FALLBACK_TITLES,
  buildFallbackCatalogFeed,
  isTmdbConfigured,
} from './tmdb.ts';

test('config exports BRAND_NAME = KHLD+ and ACCENT_COLOR = #ffffff', () => {
  assert.equal(BRAND_NAME, 'KHLD+');
  assert.equal(ACCENT_COLOR, '#ffffff');
});

test('safeStorage reads and writes JSON with in-memory fallback', () => {
  writeSafeJson('streamly:v1:test-key', { volume: 0.75, muted: false });
  const result = readSafeJson('streamly:v1:test-key', {
    volume: 1,
    muted: true,
  });
  assert.deepEqual(result, { volume: 0.75, muted: false });
  safeStorage.removeItem('streamly:v1:test-key');
});

test('env helpers format timecodes and detect MUST_FILL_URL placeholders', () => {
  assert.equal(formatTimecode(0), '0:00');
  assert.equal(formatTimecode(65), '1:05');
  assert.equal(formatTimecode(3661), '1:01:01');
  assert.equal(formatRuntime(888), '14m 48s');
  assert.equal(formatRuntime(5760), '1h 36m');
  assert.equal(isPlaceholderUrl('MUST_FILL_URL_SINTEL_1080P_MP4'), true);
  assert.equal(isPlaceholderUrl('/subs/sintel-en.vtt'), false);
});

test('library.json contains 6 legal titles with explicit CC BY vs Public Domain licenses', () => {
  assert.equal(libraryDataRaw.length, 6);
  const sintel = libraryDataRaw.find((item) => item.id === 'sintel');
  assert.ok(sintel);
  assert.match(sintel.license, /Creative Commons Attribution/i);

  const notld = libraryDataRaw.find((item) => item.id === 'night-of-the-living-dead');
  assert.ok(notld);
  assert.match(notld.license, /Public Domain/i);
});

test('TMDB discovery layer gracefully falls back to rich local catalog when VITE_TMDB_KEY is absent', () => {
  assert.equal(isTmdbConfigured(), false);
  const feed = buildFallbackCatalogFeed();
  assert.equal(feed.source, 'local-fallback');
  assert.ok(feed.trendingNow.length >= 6);
  assert.ok(feed.topRatedMovies.length >= 6);
  assert.ok(feed.actionMovies.length >= 6);
  assert.ok(feed.popularTvShows.length >= 6);
  assert.ok(ALL_DISCOVERY_FALLBACK_TITLES.length >= 12);
});

test('rewriteM3u8Manifest strips ad segments and rewrites chunk URLs through proxy', () => {
  const sampleManifest = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXTINF:10.0,',
    'segment-001.ts',
    '#EXT-X-CUE-OUT:30.0',
    '#EXTINF:15.0,',
    'https://ads.doubleclick.net/preroll-ad.ts',
    '#EXT-X-CUE-IN',
    '#EXTINF:10.0,',
    'segment-002.ts',
    '#EXT-X-ENDLIST',
  ].join('\n');

  const rewritten = rewriteM3u8Manifest(
    sampleManifest,
    'https://cdn.example.org/streams/master.m3u8'
  );

  assert.ok(!rewritten.includes('doubleclick'));
  assert.ok(
    rewritten.includes(
      '/api/stream-extractor?proxyUrl=https%3A%2F%2Fcdn.example.org%2Fstreams%2Fsegment-001.ts'
    )
  );
  assert.ok(
    rewritten.includes(
      '/api/stream-extractor?proxyUrl=https%3A%2F%2Fcdn.example.org%2Fstreams%2Fsegment-002.ts'
    )
  );
});

test('extractM3u8UrlFromPayload strips iframe ads and extracts raw .m3u8 URL from HTML or JSON', () => {
  const htmlWithAdIframe = `
    <html>
      <body>
        <iframe src="https://ads.doubleclick.net/ad.m3u8"></iframe>
        <script>const stream = "https://cdn.cinema.org/hls/10378/master.m3u8?token=abc";</script>
      </body>
    </html>
  `;
  const extractedFromHtml = extractM3u8UrlFromPayload(
    htmlWithAdIframe,
    'https://embed.cinema.org/watch/10378'
  );
  assert.equal(
    extractedFromHtml,
    'https://cdn.cinema.org/hls/10378/master.m3u8?token=abc'
  );

  const jsonPayload = JSON.stringify({
    sources: [{ file: '/streams/774/index.m3u8', type: 'hls' }],
  });
  const extractedFromJson = extractM3u8UrlFromPayload(
    jsonPayload,
    'https://cdn.cinema.org/api/v1/source'
  );
  assert.equal(extractedFromJson, 'https://cdn.cinema.org/streams/774/index.m3u8');
});
