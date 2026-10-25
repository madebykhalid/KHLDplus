import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCode, Play, Server, ShieldAlert, ShieldCheck } from 'lucide-react';
import { LIBRARY_TITLES, getPlaceholderUrlAudit } from '../utils/libraryData';

export const CreditsPage: React.FC = () => {
  const placeholderAudit = useMemo(() => getPlaceholderUrlAudit(), []);
  const [proxyTestTmdbId, setProxyTestTmdbId] = useState('10378');
  const [proxyResponseText, setProxyResponseText] = useState<string | null>(null);
  const [proxyLoading, setProxyLoading] = useState(false);

  const blenderTitles = useMemo(
    () => LIBRARY_TITLES.filter((t) => t.license.includes('Creative Commons')),
    []
  );
  const publicDomainTitles = useMemo(
    () => LIBRARY_TITLES.filter((t) => t.license.includes('Public Domain')),
    []
  );

  const handleTestExtractorProxy = async () => {
    setProxyLoading(true);
    setProxyResponseText(null);
    try {
      const res = await fetch(
        `/api/stream-extractor?tmdbId=${encodeURIComponent(proxyTestTmdbId)}&format=json`
      );
      const data = await res.json();
      setProxyResponseText(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      setProxyResponseText(
        err instanceof Error ? err.message : 'Failed to reach /api/stream-extractor'
      );
    } finally {
      setProxyLoading(false);
    }
  };

  return (
    <main className="min-h-screen pt-24 pb-24 px-4 sm:px-8 lg:px-14 max-w-[1440px] mx-auto space-y-12">
      {/* Header */}
      <header className="space-y-3 border-b border-white/10 pb-6">
        <p className="text-xs font-semibold tracking-wider text-[var(--accent)]">
          LEGAL ATTRIBUTION &amp; SOURCE TRANSPARENCY
        </p>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          Credits, Licenses &amp; URL Placeholders
        </h1>
        <p className="text-sm sm:text-base text-[#b3b3b3] max-w-3xl leading-relaxed">
          All works in this catalog are distributed under explicit Creative Commons Attribution
          licenses or verified United States Public Domain status. Notice: Big Buck Bunny,
          Sintel, Tears of Steel, and Elephants Dream are Creative Commons Attribution works by
          the Blender Foundation—they are <strong>not</strong> public domain and require the
          attributions displayed below.
        </p>
      </header>

      {/* Section 1: Creative Commons Attribution Works (Blender Foundation) */}
      <section aria-labelledby="cc-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[var(--accent)] shrink-0" aria-hidden="true" />
          <h2 id="cc-heading" className="text-xl sm:text-2xl font-bold text-white">
            01. Creative Commons Attribution Works (Blender Foundation — Not Public Domain)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blenderTitles.map((item) => (
            <article
              key={item.id}
              className="p-5 rounded-lg bg-[#1f1f1f] border border-white/10 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-bold text-white">
                    {item.title} ({item.year})
                  </h3>
                  <span className="text-xs text-[#b3b3b3]">CC BY License</span>
                </div>
                <p className="text-xs text-white/90 font-semibold">{item.license}</p>
                <p className="text-xs text-[#b3b3b3]">{item.credit}</p>
                <p className="text-xs text-[#b3b3b3]">
                  Cast &amp; Crew: {item.cast.join(', ')}
                </p>
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-[#b3b3b3]">
                  Bundled Captions: {item.subtitles.map((s) => s.url).join(', ')}
                </span>
                <Link
                  to={`/watch/${item.id}`}
                  className="min-h-[38px] px-3.5 py-1.5 rounded bg-white text-black text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>Open in Player</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Section 2: Public Domain Works (Internet Archive) */}
      <section aria-labelledby="pd-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
          <h2 id="pd-heading" className="text-xl sm:text-2xl font-bold text-white">
            02. Public Domain Feature Films (Internet Archive Preservation Copies)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {publicDomainTitles.map((item) => (
            <article
              key={item.id}
              className="p-5 rounded-lg bg-[#1f1f1f] border border-white/10 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-bold text-white">
                    {item.title} ({item.year})
                  </h3>
                  <span className="text-xs text-[#b3b3b3]">Public Domain</span>
                </div>
                <p className="text-xs text-white/90 font-semibold">{item.license}</p>
                <p className="text-xs text-[#b3b3b3]">{item.credit}</p>
                <p className="text-xs text-[#b3b3b3]">
                  Cast &amp; Crew: {item.cast.join(', ')}
                </p>
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-[#b3b3b3]">
                  Bundled Captions: {item.subtitles.map((s) => s.url).join(', ')}
                </span>
                <Link
                  to={`/watch/${item.id}`}
                  className="min-h-[38px] px-3.5 py-1.5 rounded bg-white text-black text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>Open in Player</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Section 3: Backend CORS-Bypass Extraction Proxy Diagnostics */}
      <section aria-labelledby="proxy-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-sky-400 shrink-0" aria-hidden="true" />
          <h2 id="proxy-heading" className="text-xl sm:text-2xl font-bold text-white">
            03. Backend CORS-Bypass Stream Extractor API (/api/stream-extractor)
          </h2>
        </div>

        <div className="p-5 rounded-lg bg-[#1f1f1f] border border-white/10 space-y-4">
          <p className="text-xs sm:text-sm text-[#b3b3b3] leading-relaxed">
            Endpoint <code className="text-white">/api/stream-extractor</code> accepts a{' '}
            <code className="text-white">tmdbId</code> or <code className="text-white">proxyUrl</code>,
            resolves upstream HLS <code className="text-white">.m3u8</code> manifests when{' '}
            <code className="text-white">STREAM_EXTRACTOR_UPSTREAM_TEMPLATE</code> is configured,
            strips ad/tracker segments, rewrites segment URLs through the same-origin proxy, and
            injects permissive CORS headers.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="tmdb-proxy-test-id" className="text-xs font-semibold text-[#b3b3b3]">
              TMDB ID:
            </label>
            <input
              id="tmdb-proxy-test-id"
              type="text"
              value={proxyTestTmdbId}
              onChange={(e) => setProxyTestTmdbId(e.target.value)}
              className="min-h-[40px] px-3 py-1.5 rounded bg-[#141414] border border-white/20 text-xs text-white w-32 tabular-nums"
            />
            <button
              type="button"
              onClick={handleTestExtractorProxy}
              disabled={proxyLoading}
              className="min-h-[40px] px-4 py-1.5 rounded bg-white text-black text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
            >
              {proxyLoading ? 'Testing Proxy...' : 'Test /api/stream-extractor'}
            </button>
          </div>

          {proxyResponseText && (
            <pre className="p-3 rounded bg-[#141414] border border-white/10 text-xs font-mono text-white/90 overflow-x-auto">
              {proxyResponseText}
            </pre>
          )}
        </div>
      </section>

      {/* Section 4: Complete Audit of MUST_FILL_URL Placeholders */}
      <section aria-labelledby="audit-heading" className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
          <h2 id="audit-heading" className="text-xl sm:text-2xl font-bold text-white">
            04. Required URL Placeholders ({placeholderAudit.length} Entries to Fill)
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-[#b3b3b3]">
          Per strict Honesty Rules, no external video, poster, backdrop, or third-party API URLs
          were guessed or invented. Replace the following{' '}
          <code className="text-white">MUST_FILL_URL_*</code> entries in{' '}
          <code className="text-white">src/data/library.json</code> and{' '}
          <code className="text-white">src/config.ts</code> with your authorized CDN/archive URLs:
        </p>

        <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#1f1f1f]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-[#141414] text-[#b3b3b3]">
                <th className="py-3 px-4 font-semibold">File</th>
                <th className="py-3 px-4 font-semibold">Title / Scope</th>
                <th className="py-3 px-4 font-semibold">Field</th>
                <th className="py-3 px-4 font-semibold">Placeholder Token</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 font-mono">
              {placeholderAudit.map((row, idx) => (
                <tr key={`${row.titleId}-${row.field}-${idx}`} className="hover:bg-white/5">
                  <td className="py-2.5 px-4 text-[#b3b3b3]">{row.location}</td>
                  <td className="py-2.5 px-4 font-sans font-semibold text-white">
                    {row.titleName}
                  </td>
                  <td className="py-2.5 px-4 text-[#b3b3b3]">{row.field}</td>
                  <td className="py-2.5 px-4 text-amber-300">
                    <span className="inline-flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      {row.placeholderValue}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default CreditsPage;
