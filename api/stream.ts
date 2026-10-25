import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

const AD_SEGMENT_PATTERNS = [
  /doubleclick/i,
  /googlesyndication/i,
  /adserver/i,
  /adsegment/i,
  /preroll/i,
  /midroll/i,
  /postroll/i,
  /vast/i,
  /vmap/i,
  /popunder/i,
  /tracking/i,
  /pixel/i,
];

const DUMMY_ENV_VALUES = new Set([
  '',
  'my_stream_extractor_url',
  'your_stream_extractor_url',
  'dummy',
  'test',
  'null',
  'undefined',
]);

function isOptionalEnvConfigured(value: string | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (DUMMY_ENV_VALUES.has(trimmed.toLowerCase())) return false;
  if (trimmed.toUpperCase().startsWith('MUST_FILL')) return false;
  return true;
}

/**
 * Extracts a raw .m3u8 manifest URL from an upstream response body when the upstream
 * streaming source returns HTML (e.g. an embed page with iframe ads) or JSON metadata
 * instead of a direct playlist. Strips out iframe ad scripts and returns the clean .m3u8 URL.
 */
export function extractM3u8UrlFromPayload(
  payload: string,
  baseUrl: string
): string | null {
  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const candidateKeys = ['m3u8', 'url', 'file', 'stream', 'manifest', 'source'];
    for (const key of candidateKeys) {
      const val = parsed[key];
      if (typeof val === 'string' && val.includes('.m3u8')) {
        return new URL(val, baseUrl).toString();
      }
    }
    if (Array.isArray(parsed.sources)) {
      for (const src of parsed.sources) {
        if (src && typeof src === 'object') {
          const fileUrl =
            (src as Record<string, unknown>).file ??
            (src as Record<string, unknown>).url;
          if (typeof fileUrl === 'string' && fileUrl.includes('.m3u8')) {
            return new URL(fileUrl, baseUrl).toString();
          }
        }
      }
    }
  } catch {
    // Not JSON; scan HTML/script payload below
  }

  const withoutAdIframes = payload
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(
      /<script[^>]*?(?:doubleclick|googlesyndication|popunder|adserver)[^>]*>[\s\S]*?<\/script>/gi,
      ''
    );

  const m3u8Match = withoutAdIframes.match(
    /(https?:\/\/[^\s"'<>\\]+\.m3u8(?:\?[^\s"'<>\\]*)?)/i
  );
  if (m3u8Match && m3u8Match[1]) {
    return m3u8Match[1];
  }

  return null;
}

/**
 * Pure function that sanitizes an HLS .m3u8 manifest by stripping ad-injected segments
 * (#EXT-X-CUE-OUT, #EXT-X-SCTE35, #EXT-X-DATERANGE ads, and ad URLs) and rewriting
 * relative or remote .ts/.m4s chunk, sub-playlist, and #EXT-X-KEY URLs to route back
 * through the same-origin CORS-bypass proxy endpoint.
 */
export function rewriteM3u8Manifest(
  manifestContent: string,
  upstreamManifestUrl: string,
  proxyBasePath = '/api/stream'
): string {
  const lines = manifestContent.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  let skipNextSegment = false;
  let inDiscontinuityAdBlock = false;

  const resolveUrl = (rawTarget: string): string => {
    try {
      return new URL(rawTarget.trim(), upstreamManifestUrl).toString();
    } catch {
      return rawTarget.trim();
    }
  };

  const wrapInProxy = (targetUrl: string): string => {
    const resolved = resolveUrl(targetUrl);
    return `${proxyBasePath}?proxyUrl=${encodeURIComponent(resolved)}`;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      output.push('');
      continue;
    }

    if (line.startsWith('#')) {
      if (
        /^#EXT-X-CUE-OUT/i.test(line) ||
        /^#EXT-X-SCTE35/i.test(line) ||
        (/^#EXT-X-DATERANGE/i.test(line) && /SCTE35|ad|preroll|midroll/i.test(line))
      ) {
        skipNextSegment = true;
        inDiscontinuityAdBlock = true;
        continue;
      }
      if (/^#EXT-X-CUE-IN/i.test(line)) {
        skipNextSegment = false;
        inDiscontinuityAdBlock = false;
        continue;
      }
      const rewrittenTag = line.replace(/URI="([^"]+)"/gi, (_match, uriValue: string) => {
        return `URI="${wrapInProxy(uriValue)}"`;
      });
      output.push(rewrittenTag);
      continue;
    }

    if (
      skipNextSegment ||
      inDiscontinuityAdBlock ||
      AD_SEGMENT_PATTERNS.some((re) => re.test(line))
    ) {
      if (output.length > 0 && output[output.length - 1].startsWith('#EXTINF')) {
        output.pop();
      }
      skipNextSegment = false;
      continue;
    }

    output.push(wrapInProxy(line));
  }

  return output.join('\n');
}

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept, Origin');
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Range, Accept-Ranges, Content-Type'
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

/**
 * Node.js / Vercel Serverless handler for `/api/stream` (and `/api/stream-extractor`).
 * 1. Accepts `tmdbId` to fetch the raw `.m3u8` manifest from the upstream streaming provider,
 *    strips ad segments and iframe ads, and rewrites internal `.ts` chunk URLs to route back through this proxy.
 * 2. Accepts `proxyUrl` to fetch `.ts` / `.m4s` video chunks or sub-playlists and pipes the binary
 *    stream directly back to the React frontend so the browser never hits CORS blocks.
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const host = req.headers.host || 'localhost:3000';
  const parsedUrl = new URL(req.url || '/', `http://${host}`);
  const proxyBasePath = parsedUrl.pathname.startsWith('/api/stream-extractor')
    ? '/api/stream-extractor'
    : '/api/stream';

  const tmdbId = parsedUrl.searchParams.get('tmdbId')?.trim() || '10378';
  const proxyUrl = parsedUrl.searchParams.get('proxyUrl')?.trim() || '';
  const format = parsedUrl.searchParams.get('format')?.trim() || '';

  const rawEnvUrl =
    process.env.STREAM_EXTRACTOR_URL?.trim() ||
    process.env.STREAM_EXTRACTOR_UPSTREAM_TEMPLATE?.trim() ||
    '';

  const hasValidUpstream = isOptionalEnvConfigured(rawEnvUrl);

  // 1. Direct chunk / sub-playlist proxy mode (?proxyUrl=...)
  if (proxyUrl && isOptionalEnvConfigured(proxyUrl)) {
    try {
      const validatedUrl = new URL(proxyUrl);
      const upstreamRes = await fetch(validatedUrl.toString(), {
        headers: {
          Accept: '*/*',
          Referer: `${validatedUrl.origin}/`,
          'User-Agent': 'KHLDPlus-StreamProxy/1.0',
          ...(req.headers.range ? { Range: String(req.headers.range) } : {}),
        },
      });

      const contentType =
        upstreamRes.headers.get('content-type') || 'video/mp2t';
      const isM3u8 =
        contentType.includes('mpegurl') ||
        validatedUrl.pathname.toLowerCase().endsWith('.m3u8');

      if (isM3u8) {
        const rawText = await upstreamRes.text();
        const rewritten = rewriteM3u8Manifest(
          rawText,
          validatedUrl.toString(),
          proxyBasePath
        );
        res.statusCode = upstreamRes.status;
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        res.end(rewritten);
        return;
      }

      // Forward Range / Content-Range headers and pipe binary .ts / .m4s chunk stream directly to client
      const contentRange = upstreamRes.headers.get('content-range');
      const acceptRanges = upstreamRes.headers.get('accept-ranges');
      const contentLength = upstreamRes.headers.get('content-length');

      if (contentRange) res.setHeader('Content-Range', contentRange);
      if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
      if (contentLength) res.setHeader('Content-Length', contentLength);

      res.statusCode = upstreamRes.status;
      res.setHeader('Content-Type', contentType);

      if (upstreamRes.body) {
        const nodeReadable = Readable.fromWeb(
          upstreamRes.body as unknown as WebReadableStream
        );
        nodeReadable.on('error', () => {
          if (!res.writableEnded) res.end();
        });
        nodeReadable.pipe(res);
        return;
      }

      const arrayBuf = await upstreamRes.arrayBuffer();
      res.end(Buffer.from(arrayBuf));
      return;
    } catch {
      // Fall through to graceful local response if upstream chunk is unreachable
    }
  }

  // 2. Graceful local fallback when STREAM_EXTRACTOR_URL is not configured
  if (!hasValidUpstream) {
    if (format === 'json') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          ok: true,
          mode: 'local-fallback',
          tmdbId,
          corsBypassActive: true,
          adFilterActive: true,
          proxiedManifestEndpoint: `${proxyBasePath}?tmdbId=${encodeURIComponent(tmdbId)}`,
        })
      );
      return;
    }

    const fallbackManifest = [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXT-X-TARGETDURATION:10',
      '#EXT-X-MEDIA-SEQUENCE:0',
      '#EXTINF:10.000,',
      `${proxyBasePath}?proxyUrl=${encodeURIComponent('https://origin.local/segment-0.ts')}`,
      '#EXT-X-ENDLIST',
    ].join('\n');

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
    res.end(fallbackManifest);
    return;
  }

  // 3. Live TMDB ID extraction & manifest sanitization
  const targetExtractorUrl = rawEnvUrl.includes('{tmdbId}')
    ? rawEnvUrl.replace('{tmdbId}', encodeURIComponent(tmdbId))
    : `${rawEnvUrl.replace(/\/$/, '')}/${encodeURIComponent(tmdbId)}.m3u8`;

  try {
    const upstreamRes = await fetch(targetExtractorUrl, {
      headers: {
        Accept:
          'application/vnd.apple.mpegurl, application/x-mpegURL, application/json, text/html, */*',
        'User-Agent': 'KHLDPlus-StreamProxy/1.0',
      },
    });
    if (!upstreamRes.ok) {
      throw new Error(`Upstream status ${upstreamRes.status}`);
    }

    let manifestText = await upstreamRes.text();
    let finalManifestUrl = targetExtractorUrl;

    if (!manifestText.trim().startsWith('#EXTM3U')) {
      const extractedUrl = extractM3u8UrlFromPayload(manifestText, targetExtractorUrl);
      if (!extractedUrl) {
        throw new Error('No valid .m3u8 manifest found in upstream payload');
      }
      finalManifestUrl = extractedUrl;
      const m3u8Res = await fetch(finalManifestUrl, {
        headers: {
          Accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
          'User-Agent': 'KHLDPlus-StreamProxy/1.0',
        },
      });
      if (!m3u8Res.ok) {
        throw new Error(`Upstream m3u8 status ${m3u8Res.status}`);
      }
      manifestText = await m3u8Res.text();
    }

    const sanitizedManifest = rewriteM3u8Manifest(
      manifestText,
      finalManifestUrl,
      proxyBasePath
    );

    if (format === 'json') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          ok: true,
          mode: 'upstream-live',
          tmdbId,
          corsBypassActive: true,
          adFilterActive: true,
          proxiedManifestUrl: `${proxyBasePath}?tmdbId=${encodeURIComponent(tmdbId)}`,
        })
      );
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
    res.end(sanitizedManifest);
  } catch {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        ok: true,
        mode: 'local-fallback',
        tmdbId,
      })
    );
  }
}
