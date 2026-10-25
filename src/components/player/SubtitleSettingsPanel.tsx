import React, { useRef, useState } from 'react';
import { Check, Minus, Plus, Upload, X } from 'lucide-react';
import { usePrefs } from '../../store/usePrefs';
import type {
  SubtitleBgOpacity,
  SubtitleColor,
  SubtitleEdgeStyle,
  SubtitleFontSize,
  SubtitleTrack,
} from '../../types';
import { parseSubtitles } from '../../utils/subtitles';

interface SubtitleSettingsPanelProps {
  tracks: readonly SubtitleTrack[];
  onUploadCustomTrack: (track: SubtitleTrack) => void;
  onClose: () => void;
}

const FONT_SIZES: Array<{ value: SubtitleFontSize; shortLabel: string; ariaLabel: string }> = [
  { value: 'sm', shortLabel: 'S', ariaLabel: 'Small font size' },
  { value: 'md', shortLabel: 'M', ariaLabel: 'Medium font size' },
  { value: 'lg', shortLabel: 'L', ariaLabel: 'Large font size' },
  { value: 'xl', shortLabel: 'XL', ariaLabel: 'Extra large font size' },
];

const COLORS: Array<{ value: SubtitleColor; label: string }> = [
  { value: '#ffffff', label: 'White' },
  { value: '#facc15', label: 'Yellow' },
  { value: '#38bdf8', label: 'Cyan' },
  { value: '#4ade80', label: 'Green' },
];

const BACKGROUNDS: Array<{ value: SubtitleBgOpacity; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'semi', label: 'Semi-Transparent' },
  { value: 'solid', label: 'Solid Black' },
];

const EDGES: Array<{ value: SubtitleEdgeStyle; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'drop-shadow', label: 'Drop Shadow' },
  { value: 'outline', label: 'Uniform Outline' },
  { value: 'raised', label: 'Raised Edge' },
];

export const SubtitleSettingsPanel: React.FC<SubtitleSettingsPanelProps> = ({
  tracks,
  onUploadCustomTrack,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const subtitleLang = usePrefs((s) => s.subtitleLang);
  const subtitleOffset = usePrefs((s) => s.subtitleOffset);
  const subtitleStyle = usePrefs((s) => s.subtitleStyle);
  const setSubtitleLang = usePrefs((s) => s.setSubtitleLang);
  const adjustSubtitleOffset = usePrefs((s) => s.adjustSubtitleOffset);
  const setSubtitleOffset = usePrefs((s) => s.setSubtitleOffset);
  const setSubtitleStyle = usePrefs((s) => s.setSubtitleStyle);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      if (!content.trim()) return;
      const parsedCues = parseSubtitles(content);
      const customLang = `custom-${Date.now()}`;
      const newTrack: SubtitleTrack = {
        lang: customLang,
        label: `Device: ${file.name}`,
        url: '',
        isCustom: true,
        rawContent: content,
      };
      onUploadCustomTrack(newTrack);
      setSubtitleLang(customLang);
      setUploadStatus(`Loaded ${file.name} (${parsedCues.length} cues)`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      role="dialog"
      aria-label="Subtitles and caption styling settings"
      data-testid="subtitle-settings-panel"
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-20 right-4 sm:right-8 z-40 w-[320px] sm:w-[390px] max-h-[75dvh] overflow-y-auto rounded-lg bg-[#181818]/95 backdrop-blur-md border border-white/20 p-4 text-white shadow-2xl space-y-4"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <h3 className="text-sm font-bold tracking-tight">Subtitles &amp; Captions</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close subtitles panel"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Track Selection */}
      <div>
        <p className="text-xs font-semibold text-[#b3b3b3] mb-2">Language Track</p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setSubtitleLang('off')}
            className={`min-h-[40px] px-3 py-1.5 rounded text-xs font-semibold text-left transition-opacity cursor-pointer ${
              subtitleLang === 'off'
                ? 'bg-white text-black'
                : 'bg-white/10 text-[#b3b3b3] hover:text-white'
            }`}
          >
            Off
          </button>
          {tracks.map((track) => (
            <button
              key={track.lang}
              type="button"
              onClick={() => setSubtitleLang(track.lang)}
              className={`min-h-[40px] px-3 py-1.5 rounded text-xs font-semibold text-left truncate transition-opacity cursor-pointer ${
                subtitleLang === track.lang
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-[#b3b3b3] hover:text-white'
              }`}
            >
              {track.label}
            </button>
          ))}
        </div>

        {/* Client-Side File Upload ("Add subtitles from device") */}
        <div className="mt-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".vtt,.srt,text/vtt,application/x-subrip"
            onChange={handleFileChange}
            className="hidden"
            id="custom-subtitle-file-input"
            data-testid="custom-subtitle-file-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[40px] px-3 py-2 rounded bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-opacity cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add subtitles from device (.vtt / .srt)</span>
          </button>
          {uploadStatus && (
            <p className="mt-1.5 text-[11px] text-white/80 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-white shrink-0" aria-hidden="true" />
              <span className="truncate">{uploadStatus}</span>
            </p>
          )}
        </div>
      </div>

      {/* Sync Offset Control (+/- 0.25s increments) */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-[#b3b3b3]">Sync Offset (+/- 0.25s)</span>
          <span
            data-testid="subtitle-offset-value"
            className="font-bold text-white tabular-nums"
          >
            {subtitleOffset > 0 ? `+${subtitleOffset.toFixed(2)}s` : `${subtitleOffset.toFixed(2)}s`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => adjustSubtitleOffset(-0.25)}
            aria-label="Decrease subtitle offset by 0.25 seconds"
            className="min-h-[40px] flex-1 rounded bg-white/10 hover:bg-white/20 text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>0.25s</span>
          </button>
          <button
            type="button"
            onClick={() => setSubtitleOffset(0)}
            className="min-h-[40px] px-3 rounded bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => adjustSubtitleOffset(0.25)}
            aria-label="Increase subtitle offset by 0.25 seconds"
            className="min-h-[40px] flex-1 rounded bg-white/10 hover:bg-white/20 text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>0.25s</span>
          </button>
        </div>
      </div>

      {/* Font Size (S / M / L / XL) */}
      <div>
        <p className="text-xs font-semibold text-[#b3b3b3] mb-1.5">Font Size (S / M / L / XL)</p>
        <div className="grid grid-cols-4 gap-1.5">
          {FONT_SIZES.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-label={item.ariaLabel}
              onClick={() => setSubtitleStyle({ fontSize: item.value })}
              className={`min-h-[38px] px-2 py-1 rounded text-xs font-bold cursor-pointer ${
                subtitleStyle.fontSize === item.value
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-[#b3b3b3] hover:text-white'
              }`}
            >
              {item.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Text Color */}
      <div>
        <p className="text-xs font-semibold text-[#b3b3b3] mb-1.5">Text Color</p>
        <div className="grid grid-cols-4 gap-1.5">
          {COLORS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSubtitleStyle({ color: item.value })}
              className={`min-h-[38px] px-2 py-1 rounded text-xs font-semibold border cursor-pointer ${
                subtitleStyle.color === item.value
                  ? 'border-white bg-white/20 text-white'
                  : 'border-transparent bg-white/10 text-[#b3b3b3]'
              }`}
            >
              <span style={{ color: item.value }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Background Opacity */}
      <div>
        <p className="text-xs font-semibold text-[#b3b3b3] mb-1.5">Background Opacity</p>
        <div className="grid grid-cols-3 gap-1.5">
          {BACKGROUNDS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSubtitleStyle({ background: item.value })}
              className={`min-h-[38px] px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                subtitleStyle.background === item.value
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-[#b3b3b3] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Edge Style */}
      <div>
        <p className="text-xs font-semibold text-[#b3b3b3] mb-1.5">Edge Style</p>
        <div className="grid grid-cols-2 gap-1.5">
          {EDGES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSubtitleStyle({ edge: item.value })}
              className={`min-h-[38px] px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                subtitleStyle.edge === item.value
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-[#b3b3b3] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
