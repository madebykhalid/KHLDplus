import type { CueToken, SubtitleCue } from '../types';

/**
 * Parses a WebVTT or SRT timestamp string (e.g., "00:01:23.450", "01:23,450", or "01:23.450")
 * into seconds as a floating-point number. Returns NaN if invalid.
 */
export function parseTimestamp(raw: string): number {
  const cleaned = raw.trim().replace(',', '.');
  const parts = cleaned.split(':');
  if (parts.length < 2 || parts.length > 3) {
    return Number.NaN;
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = Number(parts[0]);
    minutes = Number(parts[1]);
    seconds = Number(parts[2]);
  } else {
    minutes = Number(parts[0]);
    seconds = Number(parts[1]);
  }

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    hours < 0 ||
    minutes < 0 ||
    minutes >= 60 ||
    seconds < 0 ||
    seconds >= 60
  ) {
    return Number.NaN;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

/**
 * Pure, safe tokenizer that converts a subtitle string into a tree of CueToken nodes.
 * Only <i> and <b> tags are preserved as structured tokens; all other HTML/VTT tags
 * (such as <script>, <c.color>, <v Speaker>, or inline timestamps <00:01.000>) are
 * stripped to their safe text content.
 * Never touches DOM innerHTML or dangerouslySetInnerHTML.
 */
export function parseCueTokens(rawText: string): CueToken[] {
  const root: CueToken[] = [];
  const stack: { tag: 'i' | 'b'; children: CueToken[] }[] = [];

  const currentList = (): CueToken[] =>
    stack.length > 0 ? stack[stack.length - 1].children : root;

  const pushText = (str: string) => {
    if (!str) return;
    const decoded = decodeEntities(str);
    if (!decoded) return;
    const target = currentList();
    const prev = target[target.length - 1];
    if (prev && prev.type === 'text') {
      prev.text += decoded;
    } else {
      target.push({ type: 'text', text: decoded });
    }
  };

  // Matches HTML/VTT tags as well as inline WebVTT timestamp tags like <00:01:02.500>
  const tagRegex = /<\/?([a-zA-Z0-9:._-]+)(?:\s[^>]*)?>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = tagRegex.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      pushText(rawText.slice(lastIndex, match.index));
    }

    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const isClosing = fullTag.startsWith('</');

    if (tagName === 'i' || tagName === 'b') {
      if (!isClosing) {
        const node: Extract<CueToken, { type: 'i' | 'b' }> = {
          type: tagName,
          children: [],
        };
        currentList().push(node);
        stack.push({ tag: tagName, children: node.children });
      } else {
        // Pop matching tag if on stack
        for (let idx = stack.length - 1; idx >= 0; idx--) {
          if (stack[idx].tag === tagName) {
            stack.splice(idx);
            break;
          }
        }
      }
    }

    lastIndex = tagRegex.lastIndex;
  }

  if (lastIndex < rawText.length) {
    pushText(rawText.slice(lastIndex));
  }

  return root;
}

/**
 * Pure parser for both WebVTT (.vtt) and SubRip (.srt) subtitle formats.
 * Strips UTF-8 BOM, normalizes CRLF/CR line endings, and parses cue blocks into sorted SubtitleCue items.
 */
export function parseSubtitles(content: string): SubtitleCue[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  // Strip UTF-8 BOM and normalize CRLF / CR line endings
  const normalized = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const blocks = normalized.split(/\n{2,}/);
  const cues: SubtitleCue[] = [];

  for (let bIndex = 0; bIndex < blocks.length; bIndex++) {
    const rawBlock = blocks[bIndex].trim();
    if (!rawBlock) continue;

    // Skip WEBVTT header, NOTE, STYLE, or REGION metadata blocks
    if (
      rawBlock.startsWith('WEBVTT') ||
      rawBlock.startsWith('NOTE') ||
      rawBlock.startsWith('STYLE') ||
      rawBlock.startsWith('REGION')
    ) {
      continue;
    }

    const lines = rawBlock.split('\n');
    let timingLineIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timingLineIdx = i;
        break;
      }
    }

    if (timingLineIdx === -1) continue;

    const cueId =
      timingLineIdx > 0 ? lines[timingLineIdx - 1].trim() : `cue-${bIndex + 1}`;
    const timingLine = lines[timingLineIdx];
    const arrowParts = timingLine.split('-->');
    if (arrowParts.length < 2) continue;

    const startRaw = arrowParts[0].trim();
    // Strip optional VTT cue settings after the end timestamp (e.g. "00:05.000 line:90% align:center")
    const endRaw = arrowParts[1].trim().split(/\s+/)[0];

    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw);

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      continue;
    }

    const textLines = lines.slice(timingLineIdx + 1).join('\n').trim();
    if (!textLines) continue;

    cues.push({
      id: cueId || `cue-${cues.length + 1}`,
      start,
      end,
      rawText: textLines,
      tokens: parseCueTokens(textLines),
    });
  }

  cues.sort((a, b) => (a.start !== b.start ? a.start - b.start : a.end - b.end));
  return cues;
}

/**
 * Binary-searches a sorted SubtitleCue array for cues active at `timeSeconds`.
 * Driven by `requestAnimationFrame` while playing (never `timeupdate`) to prevent lag.
 */
export function findActiveCues(cues: readonly SubtitleCue[], timeSeconds: number): SubtitleCue[] {
  if (cues.length === 0 || !Number.isFinite(timeSeconds) || timeSeconds < 0) {
    return [];
  }

  let low = 0;
  let high = cues.length - 1;
  let rightmostCandidate = -1;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (cues[mid].start <= timeSeconds) {
      rightmostCandidate = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (rightmostCandidate === -1) {
    return [];
  }

  const active: SubtitleCue[] = [];
  // Scan backward up to 15 cues to capture any concurrent overlapping dialogue cues
  const minScanIndex = Math.max(0, rightmostCandidate - 15);
  for (let i = minScanIndex; i <= rightmostCandidate; i++) {
    const cue = cues[i];
    if (timeSeconds >= cue.start && timeSeconds <= cue.end) {
      active.push(cue);
    }
  }

  return active;
}

/**
 * Generates a compact signature string for an array of active cues so the
 * requestAnimationFrame loop only triggers a React state update when the active cue set changes.
 */
export function getActiveCueSignature(cues: readonly SubtitleCue[]): string {
  if (cues.length === 0) return '';
  if (cues.length === 1) return `${cues[0].id}:${cues[0].start}-${cues[0].end}`;
  return cues.map((c) => `${c.id}:${c.start}-${c.end}`).join('|');
}
