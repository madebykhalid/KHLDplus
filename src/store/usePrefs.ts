import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CONFIG } from '../config';
import type { PrefsState, SubtitleStylePrefs } from '../types';
import { safeStorage } from '../utils/storage';

const DEFAULT_SUBTITLE_STYLE: SubtitleStylePrefs = {
  fontSize: 'md',
  color: '#ffffff',
  background: 'semi',
  edge: 'drop-shadow',
};

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      volume: 0.85,
      muted: false,
      speed: 1,
      subtitleStyle: { ...DEFAULT_SUBTITLE_STYLE },
      subtitleLang: 'en',
      subtitleOffset: 0,
      pauseOnTabHidden: true,

      setVolume: (volume: number) =>
        set({
          volume: Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 1)),
          muted: volume <= 0 ? true : false,
        }),

      setMuted: (muted: boolean) => set({ muted: Boolean(muted) }),

      setSpeed: (speed: number) =>
        set({
          speed: Math.max(0.25, Math.min(2, Number.isFinite(speed) ? speed : 1)),
        }),

      setSubtitleStyle: (partial: Partial<SubtitleStylePrefs>) =>
        set((state) => ({
          subtitleStyle: { ...state.subtitleStyle, ...partial },
        })),

      setSubtitleLang: (subtitleLang: string) => set({ subtitleLang }),

      setSubtitleOffset: (subtitleOffset: number) =>
        set({
          subtitleOffset: Math.round(subtitleOffset * 4) / 4,
        }),

      adjustSubtitleOffset: (delta: number) =>
        set((state) => ({
          subtitleOffset: Math.max(-30, Math.min(30, Math.round((state.subtitleOffset + delta) * 4) / 4)),
        })),

      setPauseOnTabHidden: (pauseOnTabHidden: boolean) =>
        set({ pauseOnTabHidden: Boolean(pauseOnTabHidden) }),

      resetDefaults: () =>
        set({
          volume: 0.85,
          muted: false,
          speed: 1,
          subtitleStyle: { ...DEFAULT_SUBTITLE_STYLE },
          subtitleLang: 'en',
          subtitleOffset: 0,
          pauseOnTabHidden: true,
        }),
    }),
    {
      name: CONFIG.storageKeys.prefs,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
