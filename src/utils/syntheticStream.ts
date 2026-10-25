/**
 * Generates an in-memory, standards-compliant 8-bit mono PCM WAV Blob URL for a given duration
 * when a title's video URL in library.json is still set to a MUST_FILL_URL placeholder.
 * This allows the HTML5 <video> element to run a genuine native timeline (play, pause, seek,
 * playbackRate, volume, buffered ranges, and 60fps requestAnimationFrame cue sync) without
 * firing any failed network requests or guessing external video URLs.
 */
export function createSyntheticMediaBlobUrl(durationSeconds: number): string {
  // Cap synthetic buffer duration to a practical 120s-600s window at 3000 Hz 8-bit mono
  const clampedDuration = Math.max(30, Math.min(900, Math.floor(durationSeconds || 300)));
  const sampleRate = 3000;
  const numSamples = clampedDuration * sampleRate;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + numSamples);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeAscii(0, 'RIFF');
  // File length minus 8 bytes
  view.setUint32(4, 36 + numSamples, true);
  // WAVE identifier
  writeAscii(8, 'WAVE');
  // fmt chunk
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, 1, true); // NumChannels = 1 (Mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate, true); // ByteRate (SampleRate * 1 * 1)
  view.setUint16(32, 1, true); // BlockAlign
  view.setUint16(34, 8, true); // BitsPerSample = 8
  // data chunk
  writeAscii(36, 'data');
  view.setUint32(40, numSamples, true);

  // Fill with 8-bit unsigned silence (0x80 = 128)
  const samples = new Uint8Array(buffer, headerSize, numSamples);
  samples.fill(128);

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}
