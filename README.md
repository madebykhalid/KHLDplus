# KHLD+ — Monochromatic Cinema & High-Performance Streaming

**KHLD+** is a production-grade, monochromatic (`#141414` / `#ffffff`) streaming web application featuring a zero-lag 60fps DOM video player, a pure WebVTT/SRT subtitle engine, TMDB catalog discovery with infinite-scroll rows, Netflix-style Continue Watching persistence, and a Node.js / Vercel Serverless CORS-bypass `.m3u8` + `.ts` chunk proxy.

---

## Architecture Highlights

1. **Zero-Lag Player Core (`src/pages/Player.tsx`, `src/components/player/*`)**:
   - **Strict Zero-Lag Rule**: `currentTime` is never stored in React `useState`. Seek bar progress fill (`progressFillRef`), buffered range (`bufferedFillRef`), draggable thumb (`thumbRef`), hover timecode tooltip (`hoverTooltipRef`), and elapsed/duration timecode labels (`currentTimeLabelRef`, `durationLabelRef`) are mutated directly via `useRef` inside a `requestAnimationFrame` loop.
   - **Coarse State Only**: React state is reserved strictly for coarse playback states (`isPlaying`, `isPaused`, `isBuffering`, `isMuted`, `controlsVisible`).
   - **Smart Resume & Continue Watching**: Saves playback progress to `localStorage` every 5 seconds via Zustand (`streamly:v1:library`). On mount, if a saved timestamp exists between `30s` and the end of the video, prompts **"Resume from MM:SS"** or **"Start Over"**.
2. **Safe Subtitle Engine (`src/utils/subtitles.ts`, `src/components/player/SubtitleOverlay.tsx`)**:
   - Pure parser for both **WebVTT (`.vtt`)** and **SubRip (`.srt`)** formats (strips UTF-8 BOM, normalizes `CRLF`/`CR`, parses timestamps, and converts `<i>` and `<b>` tags into a structured `CueToken` AST).
   - Binary-search cue lookup (`findActiveCues`) driven by `requestAnimationFrame` while playing; re-renders `SubtitleOverlay` only when the active cue signature changes.
   - Zero `innerHTML` or `dangerouslySetInnerHTML` usage anywhere in the codebase.
   - Live player settings for font size (`S` / `M` / `L` / `XL`), color, background opacity, character edge style, `+/- 0.25s` sync offset, and client-side **"Add subtitles from device"** file upload.
3. **Conditional HLS, Media APIs & CORS-Bypass Proxy (`api/stream.ts`, `api/stream-extractor.ts`)**:
   - Dynamically imports `hls.js` only when the stream is `.m3u8` and the browser lacks native HLS support (`!video.canPlayType('application/vnd.apple.mpegurl')`), destroying the HLS instance and revoking object URLs on unmount.
   - Integrates the **Screen Wake Lock API** (with `visibilitychange` re-acquisition) and the **W3C Media Session API**.
   - `/api/stream` (and `/api/stream-extractor`) accepts `tmdbId`, extracts the raw `.m3u8` manifest, strips `<iframe ...>` ads and `#EXT-X-CUE-OUT` / `#EXT-X-SCTE35` ad segments, rewrites internal `.ts` chunk URLs to route through `/api/stream?proxyUrl=...`, and pipes binary `.ts` chunks back to the frontend with `Range` and CORS headers.

---

## Environment Variables (`.env.example`)

All environment variables are **completely optional**. When omitted or set to placeholder values, KHLD+ automatically falls back to the bundled legal open-movie catalog (`src/data/library.json`) with zero runtime or build errors.

```bash
# Optional TMDB v3 API key for live catalog discovery
VITE_TMDB_KEY=""

# Optional upstream HLS extractor template (e.g., https://provider.example/hls/{tmdbId}.m3u8)
STREAM_EXTRACTOR_URL=""
```

---

## Local Development & Testing

```bash
# Install dependencies
npm install

# Run unit tests (Subtitle parser, binary search, storage, and M3U8 proxy rewriting)
npx tsx --test src/utils/subtitles.test.ts src/utils/storage.test.ts

# Type-check & build production bundle
npm run lint
npm run build

# Start full-stack dev server on http://localhost:3000
npm run dev
```

---

## Deploying to Vercel

1. Push the repository to GitHub / GitLab / Bitbucket and import the project into **Vercel**.
2. Vercel automatically detects the Vite build settings and `vercel.json` routing:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Serverless Functions**: `api/stream.ts` and `api/stream-extractor.ts` are automatically deployed as `/api/stream` and `/api/stream-extractor`.
3. *(Optional)* Add `VITE_TMDB_KEY` and `STREAM_EXTRACTOR_URL` in **Vercel Project Settings → Environment Variables**.
4. Click **Deploy**.

---

## Manual Verification Checklist

- [x] **Home Catalog & TMDB Discovery**: Verify the Hero Banner and horizontal scroll-snap rows (*Continue Watching*, *Trending Now*, *Top Rated Movies*, *Action Movies*, *Popular TV Shows*) render cleanly and expand on hover.
- [x] **Continue Watching Row**: Click a card in *Continue Watching* to jump directly to `/watch/:id`, or use the hover controls to restart from the beginning or remove the item from the row.
- [x] **Smart Resume Prompt**: Open `/watch/sintel` and confirm the **"Resume from 5:42"** / **"Start Over"** dialog appears on mount.
- [x] **Zero-Lag SeekBar & Controls**: Scrub the seek bar thumb and verify smooth `scaleX` progress updates, timecode tooltip updates, and auto-hiding controls + cursor after `3000ms` of playback inactivity.
- [x] **Keyboard & Touch Shortcuts**: Press `Space` (play/pause), `ArrowLeft` / `ArrowRight` (`-10s` / `+10s`), `ArrowUp` / `ArrowDown` (volume), `M` (mute), and `F` (fullscreen) and confirm the on-screen action toast appears.
- [x] **Subtitle Engine & Custom Upload**: Open the **Subtitles & Captions** menu in the player, test `S` / `M` / `L` / `XL` font sizes, colors, background opacity, edge styles, `+/- 0.25s` sync offset, and upload a local `.vtt` or `.srt` file via **"Add subtitles from device"**.
- [x] **CORS-Bypass Stream Proxy**: Request `/api/stream?tmdbId=10378` and confirm `200 OK` with `Content-Type: application/vnd.apple.mpegurl`, `Access-Control-Allow-Origin: *`, and proxied `.ts` segment URLs.
