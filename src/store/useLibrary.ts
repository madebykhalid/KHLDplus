import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CONFIG } from '../config';
import type { LibraryState, WatchProgressEntry } from '../types';
import { safeStorage } from '../utils/storage';

const INITIAL_SEEDED_PROGRESS: Record<string, WatchProgressEntry> = {
  sintel: {
    titleId: 'sintel',
    position: 342, // 5m 42s into 14m 48s
    duration: 888,
    updatedAt: Date.now() - 1000 * 60 * 18,
  },
  'tears-of-steel': {
    titleId: 'tears-of-steel',
    position: 465, // 7m 45s into 12m 14s
    duration: 734,
    updatedAt: Date.now() - 1000 * 60 * 95,
  },
  'big-buck-bunny': {
    titleId: 'big-buck-bunny',
    position: 184, // 3m 04s into 9m 56s
    duration: 596,
    updatedAt: Date.now() - 1000 * 60 * 240,
  },
};

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      myList: [],
      progress: INITIAL_SEEDED_PROGRESS,

      toggleMyList: (titleId: string) =>
        set((state) => {
          const exists = state.myList.includes(titleId);
          return {
            myList: exists
              ? state.myList.filter((id) => id !== titleId)
              : [titleId, ...state.myList],
          };
        }),

      addToMyList: (titleId: string) =>
        set((state) => {
          if (state.myList.includes(titleId)) return state;
          return { myList: [titleId, ...state.myList] };
        }),

      removeFromMyList: (titleId: string) =>
        set((state) => ({
          myList: state.myList.filter((id) => id !== titleId),
        })),

      isInMyList: (titleId: string) => get().myList.includes(titleId),

      updateProgress: (titleId: string, position: number, duration: number) =>
        set((state) => {
          if (!titleId || !Number.isFinite(position) || position < 0) {
            return state;
          }
          const safeDuration =
            Number.isFinite(duration) && duration > 0 ? duration : 600;

          // If the user finished >= 96% of the video, remove from Continue Watching
          if (position / safeDuration >= 0.96) {
            const nextProgress = { ...state.progress };
            delete nextProgress[titleId];
            return { progress: nextProgress };
          }

          const clampedPos = Math.max(1, Math.min(Math.floor(safeDuration - 1), Math.floor(position)));
          const entry: WatchProgressEntry = {
            titleId,
            position: clampedPos,
            duration: Math.floor(safeDuration),
            updatedAt: Date.now(),
          };
          return {
            progress: {
              ...state.progress,
              [titleId]: entry,
            },
          };
        }),

      removeProgress: (titleId: string) =>
        set((state) => {
          const next = { ...state.progress };
          delete next[titleId];
          return { progress: next };
        }),

      clearAllProgress: () => set({ progress: {} }),
    }),
    {
      name: CONFIG.storageKeys.library,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
