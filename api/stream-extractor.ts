import streamHandler, {
  extractM3u8UrlFromPayload,
  rewriteM3u8Manifest as baseRewriteM3u8Manifest,
} from './stream.ts';

export { extractM3u8UrlFromPayload };

export function rewriteM3u8Manifest(
  manifestContent: string,
  upstreamManifestUrl: string,
  proxyBasePath = '/api/stream-extractor'
): string {
  return baseRewriteM3u8Manifest(manifestContent, upstreamManifestUrl, proxyBasePath);
}

export default streamHandler;
