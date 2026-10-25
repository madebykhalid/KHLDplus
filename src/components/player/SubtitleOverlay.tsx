import React from 'react';
import { usePrefs } from '../../store/usePrefs';
import type { CueToken, SubtitleCue, SubtitleEdgeStyle, SubtitleFontSize } from '../../types';

interface SubtitleOverlayProps {
  cues: readonly SubtitleCue[];
}

const FONT_SIZE_CLASS: Record<SubtitleFontSize, string> = {
  sm: 'text-sm sm:text-base',
  md: 'text-base sm:text-lg md:text-xl',
  lg: 'text-lg sm:text-xl md:text-2xl',
  xl: 'text-xl sm:text-2xl md:text-3xl',
};

function getEdgeTextShadow(edge: SubtitleEdgeStyle): string | undefined {
  switch (edge) {
    case 'drop-shadow':
      return '0 2px 4px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 0, 0, 0.75)';
    case 'outline':
      return '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
    case 'raised':
      return '0 -1px 0 rgba(255,255,255,0.25), 0 2px 3px rgba(0,0,0,0.95)';
    case 'none':
    default:
      return undefined;
  }
}

/**
 * Recursively renders safe CueToken AST nodes into React elements.
 * Strictly supports text, <i>, and <b> without ever using innerHTML or dangerouslySetInnerHTML.
 */
function renderSafeTokens(tokens: readonly CueToken[], keyPrefix: string): React.ReactNode {
  return tokens.map((token, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (token.type === 'text') {
      // Preserve explicit line breaks inside a cue using <br /> elements
      const lines = token.text.split('\n');
      if (lines.length === 1) {
        return <React.Fragment key={key}>{token.text}</React.Fragment>;
      }
      return (
        <React.Fragment key={key}>
          {lines.map((line, lineIdx) => (
            <React.Fragment key={`${key}-ln-${lineIdx}`}>
              {lineIdx > 0 && <br />}
              {line}
            </React.Fragment>
          ))}
        </React.Fragment>
      );
    }
    if (token.type === 'i') {
      return <i key={key}>{renderSafeTokens(token.children, key)}</i>;
    }
    if (token.type === 'b') {
      return <b key={key}>{renderSafeTokens(token.children, key)}</b>;
    }
    return null;
  });
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = React.memo(({ cues }) => {
  const subtitleLang = usePrefs((s) => s.subtitleLang);
  const subtitleStyle = usePrefs((s) => s.subtitleStyle);

  if (subtitleLang === 'off' || cues.length === 0) {
    return null;
  }

  const bgClass =
    subtitleStyle.background === 'solid'
      ? 'bg-black px-3 py-1 rounded'
      : subtitleStyle.background === 'semi'
        ? 'bg-black/70 px-3 py-1 rounded'
        : 'px-2 py-0.5';

  const textShadow = getEdgeTextShadow(subtitleStyle.edge);

  return (
    <div
      aria-live="off"
      data-testid="subtitle-overlay"
      className="absolute inset-x-4 bottom-24 sm:bottom-28 z-20 flex flex-col items-center justify-end pointer-events-none select-none text-center gap-1.5"
    >
      {cues.map((cue) => (
        <div
          key={cue.id}
          className={`max-w-xl font-medium leading-snug ${FONT_SIZE_CLASS[subtitleStyle.fontSize]} ${bgClass}`}
          style={{
            color: subtitleStyle.color,
            textShadow,
          }}
        >
          {renderSafeTokens(cue.tokens, cue.id)}
        </div>
      ))}
    </div>
  );
});

SubtitleOverlay.displayName = 'SubtitleOverlay';
