import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useMediaSession } from '../../hooks/useMediaSession';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useLibrary } from '../../store/useLibrary';
import { usePrefs } from '../../store/usePrefs';
import type {
  LibraryTitle,
  SubtitleCue,
  SubtitleTrack,
  VideoQuality,
} from '../../types';
import { formatTimecode, isPlaceholderUrl } from '../../utils/env';
import {
  findActiveCues,
  getActiveCueSignature,
  parseSubtitles,
} from '../../utils/subtitles';
import { createSyntheticMediaBlobUrl } from '../../utils/syntheticStream';
import { PosterArtwork } from '../ui/PosterArtwork';
import { ActionToasts } from './ActionToasts';
import { ActivePlayerPanel, ControlsOverlay } from './ControlsOverlay';
import { EpisodesDrawer } from './EpisodesDrawer';
import { SubtitleOverlay } from './SubtitleOverlay';
import { SubtitleSettingsPanel } from './SubtitleSettingsPanel';

interface VideoPlayerProps {
  title: LibraryTitle;
}

interface WebkitHTMLVideoElement extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
}

interface StreamExtractorStatusResponse {
  ok?: boolean;
  mode?: 'upstream-live' | 'local-fallback';
  tmdbId?: string;
  proxiedManifestUrl?: string;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const QUALITY_ORDER: VideoQuality[] = ['1080p', '720p', '480p'];

export const VideoPlayer: React.FC<VideoPlayerProps> = React.memo(({ title }) => {
  const navigate = useNavigate();

  // Refs for DOM elements & non-state 60fps metrics (NEVER store currentTime in React useState)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const bufferedFillRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const currentTimeLabelRef = useRef<HTMLSpanElement | null>(null);
  const durationLabelRef = useRef<HTMLSpanElement | null>(null);
  const syntheticTimecodeRef = useRef<HTMLSpanElement | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const lastProgressSavedAtRef = useRef<number>(0);
  const activeCueSignatureRef = useRef<string>('');
  const parsedCuesRef = useRef<SubtitleCue[]>([]);
  const controlsHideTimerRef = useRef<number | null>(null);
  const stallTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const tapTimerRef = useRef<number | null>(null);
  const rippleTimerRef = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  const resumeAppliedRef = useRef<boolean>(false);

  // Zustand persisted preferences & library progress
  const volume = usePrefs((s) => s.volume);
  const isMuted = usePrefs((s) => s.muted);
  const speed = usePrefs((s) => s.speed);
  const subtitleLang = usePrefs((s) => s.subtitleLang);
  const subtitleOffset = usePrefs((s) => s.subtitleOffset);
  const pauseOnTabHidden = usePrefs((s) => s.pauseOnTabHidden);
  const setVolume = usePrefs((s) => s.setVolume);
  const setMuted = usePrefs((s) => s.setMuted);
  const setSpeed = usePrefs((s) => s.setSpeed);
  const setSubtitleLang = usePrefs((s) => s.setSubtitleLang);

  const savedProgress = useLibrary((s) => s.progress[title.id]);
  const updateProgress = useLibrary((s) => s.updateProgress);

  // Coarse React state ONLY (never 60fps currentTime)
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePlayerPanel>('none');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [activeCues, setActiveCues] = useState<SubtitleCue[]>([]);
  const [customTracks, setCustomTracks] = useState<SubtitleTrack[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality>(
    () => title.sources[0]?.quality ?? '1080p'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [rippleSide, setRippleSide] = useState<'left' | 'right' | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);
  const [extractedProxyHlsUrl, setExtractedProxyHlsUrl] = useState<string | null>(null);

  // Smart Resume Prompt state on mount when timestamp exists between 30s and the end of the video
  const [resumePromptSeconds, setResumePromptSeconds] = useState<number | null>(() => {
    if (
      savedProgress &&
      savedProgress.position >= 30 &&
      savedProgress.position < (savedProgress.duration || title.duration) - 5
    ) {
      return Math.floor(savedProgress.position);
    }
    return null;
  });

  const allSubtitleTracks = useMemo(
    () => [...title.subtitles, ...customTracks],
    [title.subtitles, customTracks]
  );

  // Query backend CORS-bypass stream proxy (`/api/stream?tmdbId=...&format=json`)
  useEffect(() => {
    setExtractedProxyHlsUrl(null);
    const controller = new AbortController();
    const tmdbParam = encodeURIComponent(String(title.tmdbId ?? title.id));

    fetch(`/api/stream?tmdbId=${tmdbParam}&format=json`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? (res.json() as Promise<StreamExtractorStatusResponse>) : null))
      .then((data) => {
        if (controller.signal.aborted || !data) return;
        if (data.mode === 'upstream-live' && data.proxiedManifestUrl) {
          setExtractedProxyHlsUrl(data.proxiedManifestUrl);
        }
      })
      .catch(() => {
        // Ignore network/abort errors; fall back to local source
      });

    return () => {
      controller.abort();
    };
  }, [title.id, title.tmdbId, retryCounter]);

  const activeSource = useMemo(() => {
    if (extractedProxyHlsUrl) {
      return {
        quality: selectedQuality,
        type: 'hls' as const,
        url: extractedProxyHlsUrl,
      };
    }
    return (
      title.sources.find((s) => s.quality === selectedQuality) ??
      title.sources[0] ?? {
        quality: '1080p' as VideoQuality,
        type: 'mp4' as const,
        url: 'MUST_FILL_URL_FALLBACK',
      }
    );
  }, [extractedProxyHlsUrl, title.sources, selectedQuality]);

  const isPlaceholderSource = isPlaceholderUrl(activeSource.url);

  // Show brief aria-live="polite" toast for keyboard/touch actions
  const triggerToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 1400);
  }, []);

  // Reset controls auto-hide timer (3000 ms of inactivity; always show when paused)
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsHideTimerRef.current !== null) {
      window.clearTimeout(controlsHideTimerRef.current);
    }
    controlsHideTimerRef.current = window.setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused && activePanel === 'none') {
        setControlsVisible(false);
      }
    }, 3000);
  }, [activePanel]);

  // Persist current playback position to localStorage every 5 seconds via Zustand store
  const persistCurrentPosition = useCallback(
    (force = false) => {
      const video = videoRef.current;
      if (!video) return;
      const now = Date.now();
      if (!force && now - lastProgressSavedAtRef.current < 5000) {
        return;
      }
      const pos = video.currentTime;
      const dur =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : title.duration;
      if (Number.isFinite(pos) && pos > 1) {
        lastProgressSavedAtRef.current = now;
        updateProgress(title.id, pos, dur);
      }
    },
    [title.id, title.duration, updateProgress]
  );

  // Sync DOM timeline nodes & subtitle cue lookup strictly through direct DOM refs + requestAnimationFrame
  const syncDomTimeline = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const current = video.currentTime || 0;
    const duration =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : title.duration || 600;
    const ratio = Math.max(0, Math.min(1, duration > 0 ? current / duration : 0));

    if (progressFillRef.current) {
      progressFillRef.current.style.transform = `scaleX(${ratio})`;
    }
    if (thumbRef.current) {
      thumbRef.current.style.left = `${ratio * 100}%`;
    }
    if (currentTimeLabelRef.current) {
      currentTimeLabelRef.current.textContent = formatTimecode(current);
    }
    if (durationLabelRef.current) {
      durationLabelRef.current.textContent = formatTimecode(duration);
    }
    if (syntheticTimecodeRef.current) {
      syntheticTimecodeRef.current.textContent = `${formatTimecode(current)} / ${formatTimecode(duration)}`;
    }

    // Buffered range bar
    if (bufferedFillRef.current) {
      let bufferedEnd = 0;
      const buf = video.buffered;
      if (buf && buf.length > 0) {
        for (let i = 0; i < buf.length; i++) {
          if (buf.start(i) <= current && buf.end(i) >= current) {
            bufferedEnd = buf.end(i);
            break;
          }
        }
        if (bufferedEnd === 0) {
          bufferedEnd = buf.end(buf.length - 1);
        }
      }
      const bufRatio = Math.max(0, Math.min(1, duration > 0 ? bufferedEnd / duration : 0));
      bufferedFillRef.current.style.transform = `scaleX(${bufRatio})`;
    }

    // Check Skip Intro window (coarse boolean state only toggles when crossing boundary)
    if (title.skipIntro) {
      const inSkipWindow =
        current >= title.skipIntro.start && current < title.skipIntro.end;
      setShowSkipIntro((prev) => (prev !== inSkipWindow ? inSkipWindow : prev));
    } else {
      setShowSkipIntro((prev) => (prev ? false : prev));
    }

    // Binary-search active subtitle cues driven by requestAnimationFrame (never timeupdate)
    if (subtitleLang !== 'off' && parsedCuesRef.current.length > 0) {
      const effectiveTime = current - subtitleOffset;
      const matched = findActiveCues(parsedCuesRef.current, effectiveTime);
      const sig = getActiveCueSignature(matched);
      if (sig !== activeCueSignatureRef.current) {
        activeCueSignatureRef.current = sig;
        setActiveCues(matched);
      }
    } else if (activeCueSignatureRef.current !== '') {
      activeCueSignatureRef.current = '';
      setActiveCues([]);
    }

    // Throttled 5s Smart Resume save
    persistCurrentPosition(false);
  }, [title.duration, title.skipIntro, subtitleLang, subtitleOffset, persistCurrentPosition]);

  // requestAnimationFrame loop active only while playing
  useEffect(() => {
    if (!isPlaying) {
      syncDomTimeline();
      return;
    }

    let running = true;
    const tick = () => {
      if (!running) return;
      syncDomTimeline();
      rafIdRef.current = window.requestAnimationFrame(tick);
    };

    rafIdRef.current = window.requestAnimationFrame(tick);

    return () => {
      running = false;
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isPlaying, syncDomTimeline]);

  // Load and parse selected subtitle track (bundled same-origin .vtt or custom uploaded .vtt/.srt)
  useEffect(() => {
    if (subtitleLang === 'off') {
      parsedCuesRef.current = [];
      activeCueSignatureRef.current = '';
      setActiveCues([]);
      return;
    }

    const track = allSubtitleTracks.find((t) => t.lang === subtitleLang);
    if (!track) {
      parsedCuesRef.current = [];
      activeCueSignatureRef.current = '';
      setActiveCues([]);
      return;
    }

    if (track.isCustom && track.rawContent) {
      parsedCuesRef.current = parseSubtitles(track.rawContent);
      activeCueSignatureRef.current = '';
      syncDomTimeline();
      return;
    }

    if (isPlaceholderUrl(track.url)) {
      parsedCuesRef.current = [];
      activeCueSignatureRef.current = '';
      setActiveCues([]);
      return;
    }

    const controller = new AbortController();
    fetch(track.url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        parsedCuesRef.current = parseSubtitles(text);
        activeCueSignatureRef.current = '';
        syncDomTimeline();
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        parsedCuesRef.current = [];
        activeCueSignatureRef.current = '';
        setActiveCues([]);
      });

    return () => {
      controller.abort();
    };
  }, [subtitleLang, allSubtitleTracks, syncDomTimeline]);

  // Attach media source (native MP4, conditional code-split hls.js, or synthetic timeline for MUST_FILL_URL)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setErrorMessage(null);
    setIsBuffering(false);

    let syntheticObjectUrl: string | null = null;
    let hlsInstance: { destroy: () => void } | null = null;
    let isCancelled = false;

    const currentPosBeforeSwitch = resumeAppliedRef.current ? video.currentTime : 0;

    const applyInitialOrSwitchPosition = () => {
      if (!video) return;
      if (!resumeAppliedRef.current) {
        resumeAppliedRef.current = true;
        if (savedProgress && savedProgress.position > 2) {
          video.currentTime = Math.min(
            savedProgress.position,
            (video.duration || title.duration) - 2
          );
        }
      } else if (currentPosBeforeSwitch > 0) {
        video.currentTime = currentPosBeforeSwitch;
      }
      syncDomTimeline();
    };

    const isHlsSource =
      activeSource.type === 'hls' ||
      activeSource.url.endsWith('.m3u8') ||
      activeSource.url.startsWith('/api/stream');

    if (isPlaceholderSource) {
      syntheticObjectUrl = createSyntheticMediaBlobUrl(title.duration);
      video.src = syntheticObjectUrl;
      video.load();
      applyInitialOrSwitchPosition();
    } else if (isHlsSource) {
      // Conditionally check native HLS support first; only load hls.js if native support is absent
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = activeSource.url;
        video.load();
        applyInitialOrSwitchPosition();
      } else {
        void import('hls.js')
          .then(({ default: Hls }) => {
            if (isCancelled || !videoRef.current) return;
            if (Hls.isSupported()) {
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: false,
              });
              hlsInstance = hls;
              hls.loadSource(activeSource.url);
              hls.attachMedia(video);
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (!isCancelled) {
                  applyInitialOrSwitchPosition();
                }
              });
              hls.on(Hls.Events.ERROR, (_event, data) => {
                if (data.fatal && !isCancelled) {
                  errorCountRef.current += 1;
                  const currentQIdx = QUALITY_ORDER.indexOf(selectedQuality);
                  if (currentQIdx >= 0 && currentQIdx < QUALITY_ORDER.length - 1) {
                    const nextQ = QUALITY_ORDER[currentQIdx + 1];
                    const hasFallback = title.sources.some((s) => s.quality === nextQ);
                    if (hasFallback) {
                      triggerToast(`Stream stall — downgrading to ${nextQ}`);
                      setSelectedQuality(nextQ);
                      return;
                    }
                  }
                  setErrorMessage('Fatal HLS stream error. Please retry or switch quality.');
                }
              });
            } else {
              setErrorMessage('HLS playback is not supported in this browser.');
            }
          })
          .catch(() => {
            if (!isCancelled) {
              setErrorMessage('Failed to load HLS playback module.');
            }
          });
      }
    } else {
      video.src = activeSource.url;
      video.load();
      applyInitialOrSwitchPosition();
    }

    return () => {
      isCancelled = true;
      if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
      }
      if (syntheticObjectUrl) {
        URL.revokeObjectURL(syntheticObjectUrl);
        syntheticObjectUrl = null;
      }
    };
  }, [
    activeSource,
    isPlaceholderSource,
    retryCounter,
    selectedQuality,
    title.duration,
    title.sources,
    savedProgress,
    syncDomTimeline,
    triggerToast,
  ]);

  // Sync persisted volume, mute, and playbackRate to the <video> element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
  }, [speed]);

  // Reset resume flag & check Smart Resume prompt when title changes
  useEffect(() => {
    resumeAppliedRef.current = false;
    errorCountRef.current = 0;
    setSelectedQuality(title.sources[0]?.quality ?? '1080p');
    const entry = useLibrary.getState().progress[title.id];
    if (
      entry &&
      entry.position >= 30 &&
      entry.position < (entry.duration || title.duration) - 5
    ) {
      setResumePromptSeconds(Math.floor(entry.position));
    } else {
      setResumePromptSeconds(null);
    }
  }, [title.id, title.duration, title.sources]);

  // Save position on pagehide / visibilitychange and optionally pause on hidden tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistCurrentPosition(true);
        if (pauseOnTabHidden && videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      }
    };

    const handlePageHide = () => {
      persistCurrentPosition(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [pauseOnTabHidden, persistCurrentPosition]);

  // Track Fullscreen changes cleanly
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  // Cleanup all component timers on unmount
  useEffect(() => {
    return () => {
      if (controlsHideTimerRef.current !== null) window.clearTimeout(controlsHideTimerRef.current);
      if (stallTimerRef.current !== null) window.clearTimeout(stallTimerRef.current);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      if (tapTimerRef.current !== null) window.clearTimeout(tapTimerRef.current);
      if (rippleTimerRef.current !== null) window.clearTimeout(rippleTimerRef.current);
    };
  }, []);

  // Player actions
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setResumePromptSeconds(null);
    revealControls();
    if (video.paused) {
      void video.play().catch(() => {
        setErrorMessage('Playback could not be started automatically. Click Retry to play.');
      });
      triggerToast('Play');
    } else {
      video.pause();
      persistCurrentPosition(true);
      triggerToast('Paused');
    }
  }, [revealControls, triggerToast, persistCurrentPosition]);

  const seekTo = useCallback(
    (targetSeconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      const dur =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : title.duration || 600;
      const clamped = Math.max(0, Math.min(dur, targetSeconds));
      video.currentTime = clamped;
      syncDomTimeline();
      revealControls();
    },
    [title.duration, syncDomTimeline, revealControls]
  );

  const seekRelative = useCallback(
    (deltaSeconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      setResumePromptSeconds(null);
      seekTo((video.currentTime || 0) + deltaSeconds);
      triggerToast(deltaSeconds > 0 ? `+${deltaSeconds}s` : `${deltaSeconds}s`);
    },
    [seekTo, triggerToast]
  );

  const handleResumeFromSaved = useCallback(() => {
    if (resumePromptSeconds !== null) {
      seekTo(resumePromptSeconds);
    }
    setResumePromptSeconds(null);
    const video = videoRef.current;
    if (video && video.paused) {
      void video.play().catch(() => {});
    }
    triggerToast(`Resumed at ${formatTimecode(resumePromptSeconds ?? 0)}`);
  }, [resumePromptSeconds, seekTo, triggerToast]);

  const handleStartOver = useCallback(() => {
    setResumePromptSeconds(null);
    seekTo(0);
    updateProgress(title.id, 1, title.duration);
    const video = videoRef.current;
    if (video && video.paused) {
      void video.play().catch(() => {});
    }
    triggerToast('Started Over');
  }, [seekTo, title.duration, title.id, triggerToast, updateProgress]);

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setMuted(nextMuted);
    triggerToast(nextMuted ? 'Muted' : `Volume ${Math.round(volume * 100)}%`);
  }, [isMuted, setMuted, triggerToast, volume]);

  const changeVolumeBy = useCallback(
    (delta: number) => {
      const next = Math.max(0, Math.min(1, Math.round((volume + delta) * 100) / 100));
      setVolume(next);
      triggerToast(`Volume ${Math.round(next * 100)}%`);
    },
    [volume, setVolume, triggerToast]
  );

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current as WebkitHTMLVideoElement | null;
    if (!container) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
      triggerToast('Exit Fullscreen');
    } else if (typeof container.requestFullscreen === 'function') {
      void container.requestFullscreen().catch(() => {
        video?.webkitEnterFullscreen?.();
      });
      triggerToast('Fullscreen');
    } else {
      video?.webkitEnterFullscreen?.();
      triggerToast('Fullscreen');
    }
  }, [triggerToast]);

  const togglePiP = useCallback(() => {
    const video = videoRef.current;
    if (!video || typeof document === 'undefined') return;
    if (document.pictureInPictureElement) {
      void document.exitPictureInPicture().catch(() => {});
      triggerToast('Exit Picture-in-Picture');
    } else if ('pictureInPictureEnabled' in document && document.pictureInPictureEnabled) {
      void video.requestPictureInPicture().catch(() => {
        triggerToast('PiP unavailable');
      });
      triggerToast('Picture-in-Picture');
    } else {
      triggerToast('PiP unsupported');
    }
  }, [triggerToast]);

  const toggleCaptionsQuick = useCallback(() => {
    if (subtitleLang === 'off') {
      const fallbackLang = allSubtitleTracks[0]?.lang ?? 'en';
      setSubtitleLang(fallbackLang);
      triggerToast('Subtitles On');
    } else {
      setSubtitleLang('off');
      triggerToast('Subtitles Off');
    }
  }, [subtitleLang, allSubtitleTracks, setSubtitleLang, triggerToast]);

  const goToNextEpisode = useCallback(() => {
    if (!title.nextEpisodeId) return;
    persistCurrentPosition(true);
    triggerToast('Next Episode');
    navigate(`/watch/${title.nextEpisodeId}`);
  }, [title.nextEpisodeId, persistCurrentPosition, triggerToast, navigate]);

  const handleTogglePanel = useCallback(
    (panel: Exclude<ActivePlayerPanel, 'none'>) => {
      setActivePanel((prev) => (prev === panel ? 'none' : panel));
      revealControls();
    },
    [revealControls]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      switch (key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'j':
        case 'arrowleft':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'l':
        case 'arrowright':
          e.preventDefault();
          seekRelative(10);
          break;
        case 'arrowup':
          e.preventDefault();
          changeVolumeBy(0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          changeVolumeBy(-0.1);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'c':
          e.preventDefault();
          toggleCaptionsQuick();
          break;
        case 'p':
          e.preventDefault();
          togglePiP();
          break;
        case 'n':
          if (title.nextEpisodeId) {
            e.preventDefault();
            goToNextEpisode();
          }
          break;
        case 'escape':
          if (activePanel !== 'none') {
            e.preventDefault();
            setActivePanel('none');
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    togglePlayPause,
    seekRelative,
    changeVolumeBy,
    toggleMute,
    toggleFullscreen,
    toggleCaptionsQuick,
    togglePiP,
    goToNextEpisode,
    title.nextEpisodeId,
    activePanel,
  ]);

  // OS-level Media Session & Screen Wake Lock integrations
  useMediaSession({
    title,
    isPlaying,
    onPlay: togglePlayPause,
    onPause: togglePlayPause,
    onSeekBackward: () => seekRelative(-10),
    onSeekForward: () => seekRelative(10),
    onNextTrack: title.nextEpisodeId ? goToNextEpisode : undefined,
  });

  useWakeLock(isPlaying);

  // Touch & click surface handler:
  // Single tap toggles controls (or plays/pauses on desktop mouse click);
  // Double-tap on left or right third of screen seeks -10s/+10s with visual ripple effect
  const handleSurfacePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePanel !== 'none') {
      setActivePanel('none');
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const relX = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0.5;
    const zone: 'left' | 'center' | 'right' =
      relX < 0.333 ? 'left' : relX > 0.667 ? 'right' : 'center';

    const now = Date.now();
    const delta = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;

    if (delta < 280 && (zone === 'left' || zone === 'right')) {
      if (tapTimerRef.current !== null) {
        window.clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      const seekAmt = zone === 'left' ? -10 : 10;
      seekRelative(seekAmt);
      setRippleSide(zone);
      if (rippleTimerRef.current !== null) {
        window.clearTimeout(rippleTimerRef.current);
      }
      rippleTimerRef.current = window.setTimeout(() => {
        setRippleSide(null);
      }, 500);
      return;
    }

    if (e.pointerType === 'mouse') {
      togglePlayPause();
      return;
    }

    // Touch single tap toggles controls
    if (tapTimerRef.current !== null) {
      window.clearTimeout(tapTimerRef.current);
    }
    tapTimerRef.current = window.setTimeout(() => {
      setControlsVisible((prev) => !prev);
      tapTimerRef.current = null;
    }, 250);
  };

  // Hide mouse cursor when controls auto-hide during playback
  const hideCursor = !controlsVisible && isPlaying && !isPaused;

  return (
    <div
      ref={containerRef}
      onMouseMove={revealControls}
      data-testid="player-container"
      className={`relative w-full h-[100dvh] bg-black overflow-hidden select-none flex items-center justify-center ${
        hideCursor ? 'cursor-none' : 'cursor-default'
      }`}
    >
      {/* Underlying HTML5 Video Element (native controls strictly disabled) */}
      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        controls={false}
        onLoadedMetadata={syncDomTimeline}
        onPlay={() => {
          setIsPlaying(true);
          setIsPaused(false);
          if (stallTimerRef.current !== null) {
            window.clearTimeout(stallTimerRef.current);
            stallTimerRef.current = null;
          }
          setIsBuffering(false);
          revealControls();
        }}
        onPause={() => {
          setIsPlaying(false);
          setIsPaused(true);
          persistCurrentPosition(true);
          setControlsVisible(true);
        }}
        onWaiting={() => {
          // Show buffering spinner only after a 400ms stall
          if (stallTimerRef.current !== null) {
            window.clearTimeout(stallTimerRef.current);
          }
          stallTimerRef.current = window.setTimeout(() => {
            setIsBuffering(true);
          }, 400);
        }}
        onCanPlay={() => {
          if (stallTimerRef.current !== null) {
            window.clearTimeout(stallTimerRef.current);
            stallTimerRef.current = null;
          }
          setIsBuffering(false);
        }}
        onPlaying={() => {
          if (stallTimerRef.current !== null) {
            window.clearTimeout(stallTimerRef.current);
            stallTimerRef.current = null;
          }
          setIsBuffering(false);
        }}
        onError={() => {
          errorCountRef.current += 1;
          const currentQIdx = QUALITY_ORDER.indexOf(selectedQuality);
          if (
            !isPlaceholderSource &&
            errorCountRef.current <= 2 &&
            currentQIdx >= 0 &&
            currentQIdx < QUALITY_ORDER.length - 1
          ) {
            const nextQuality = QUALITY_ORDER[currentQIdx + 1];
            if (title.sources.some((s) => s.quality === nextQuality)) {
              triggerToast(`Source error — downgrading to ${nextQuality}`);
              setSelectedQuality(nextQuality);
              return;
            }
          }
          setErrorMessage(
            `Playback failed for ${title.title} (${selectedQuality}). Verify stream source or retry.`
          );
        }}
        className="w-full h-full object-contain pointer-events-none"
      />

      {/* Monochromatic Cinema Stage when playing local synthesized timeline */}
      {isPlaceholderSource && !errorMessage && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
          <PosterArtwork
            title={title}
            variant="backdrop"
            showLabels={false}
            className="w-full h-full opacity-65"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-t from-black/80 via-black/30 to-black/60">
            <div className="max-w-lg px-6 py-4 rounded-lg bg-black/65 border border-white/15 backdrop-blur-sm space-y-1.5">
              <p className="text-[11px] font-bold tracking-widest text-white/70">
                KHLD+ CINEMA STREAM · {selectedQuality} · {speed}x
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {title.title} ({title.year})
              </h2>
              <p className="text-xs font-mono text-white/75 tabular-nums pt-0.5">
                <span ref={syntheticTimecodeRef}>
                  0:00 / {formatTimecode(title.duration)}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Pointer Surface for Single/Double Tap and Click */}
      <div
        onPointerUp={handleSurfacePointerUp}
        aria-label="Video playback surface"
        className={`absolute inset-0 z-10 ${hideCursor ? 'cursor-none' : 'cursor-pointer'}`}
      />

      {/* Action Toasts & Touch Double-Tap Ripples */}
      <ActionToasts toastMessage={toastMessage} rippleSide={rippleSide} />

      {/* Buffering Spinner (only after 400ms stall) */}
      {isBuffering && !errorMessage && (
        <div
          role="status"
          aria-label="Buffering video"
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        >
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {/* Smart Resume Prompt (shown on mount when saved progress is between 30s and end of video) */}
      {resumePromptSeconds !== null && !errorMessage && (
        <div
          role="dialog"
          aria-label="Smart resume playback prompt"
          data-testid="smart-resume-prompt"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-24 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md rounded-lg bg-[#141414]/95 border border-white/25 p-4 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <div className="text-center sm:text-left">
            <p className="text-xs font-bold tracking-wider text-[#b3b3b3] uppercase">
              Continue Watching
            </p>
            <p className="text-sm font-semibold text-white mt-0.5">
              Saved progress at{' '}
              <span className="font-mono font-bold">
                {formatTimecode(resumePromptSeconds)}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResumeFromSaved}
              className="min-h-[40px] px-3.5 py-2 rounded bg-white text-black text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>Resume from {formatTimecode(resumePromptSeconds)}</span>
            </button>
            <button
              type="button"
              onClick={handleStartOver}
              className="min-h-[40px] px-3 py-2 rounded bg-white/10 border border-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-white/20 transition-opacity cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Start Over</span>
            </button>
          </div>
        </div>
      )}

      {/* Custom Safe Subtitle Overlay */}
      <SubtitleOverlay cues={activeCues} />

      {/* Skip Intro Button */}
      {showSkipIntro && title.skipIntro && !errorMessage && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            seekTo(title.skipIntro!.end);
            triggerToast('Skipped Intro');
          }}
          className="absolute bottom-28 right-6 sm:right-10 z-30 min-h-[44px] px-5 py-2.5 rounded bg-white text-black font-bold text-xs sm:text-sm border border-white hover:opacity-90 transition-opacity shadow-lg cursor-pointer"
        >
          Skip Intro
        </button>
      )}

      {/* Clean Error Overlay with Retry */}
      {errorMessage && (
        <div
          role="alert"
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center p-6 text-center"
        >
          <div className="max-w-md w-full p-6 rounded-lg bg-[#181818] border border-white/15 space-y-4">
            <AlertTriangle className="w-10 h-10 text-white mx-auto" aria-hidden="true" />
            <h2 className="text-lg font-bold text-white">Playback Interrupted</h2>
            <p className="text-xs sm:text-sm text-[#b3b3b3]">{errorMessage}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setRetryCounter((c) => c + 1);
                }}
                className="min-h-[44px] px-5 py-2 rounded bg-white text-black text-xs sm:text-sm font-bold inline-flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>Retry Stream</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="min-h-[44px] px-5 py-2 rounded bg-white/10 text-white text-xs sm:text-sm font-semibold hover:bg-white/20 transition-opacity cursor-pointer"
              >
                Back to Browse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Popover Panels */}
      {activePanel === 'subtitles' && (
        <SubtitleSettingsPanel
          tracks={allSubtitleTracks}
          onUploadCustomTrack={(track) =>
            setCustomTracks((prev) => [...prev, track])
          }
          onClose={() => setActivePanel('none')}
        />
      )}

      {activePanel === 'episodes' && (
        <EpisodesDrawer
          currentTitle={title}
          onSelectEpisode={(epId) => {
            persistCurrentPosition(true);
            navigate(`/watch/${epId}`);
          }}
          onClose={() => setActivePanel('none')}
        />
      )}

      {activePanel === 'speed' && (
        <div
          role="dialog"
          aria-label="Playback speed"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-20 right-16 sm:right-24 z-40 w-44 rounded-lg bg-[#181818]/95 backdrop-blur-md border border-white/20 p-2 text-white shadow-2xl"
        >
          <p className="text-xs font-bold text-[#b3b3b3] px-2 py-1.5">Playback Speed</p>
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                setSpeed(opt);
                setActivePanel('none');
                triggerToast(`Speed ${opt}x`);
              }}
              className={`w-full min-h-[38px] px-3 py-1.5 rounded text-left text-xs font-semibold flex items-center justify-between cursor-pointer ${
                speed === opt
                  ? 'bg-white text-black'
                  : 'text-[#b3b3b3] hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{opt === 1 ? '1x (Normal)' : `${opt}x`}</span>
              {speed === opt && <span>✓</span>}
            </button>
          ))}
        </div>
      )}

      {activePanel === 'quality' && (
        <div
          role="dialog"
          aria-label="Video quality"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-20 right-8 sm:right-14 z-40 w-48 rounded-lg bg-[#181818]/95 backdrop-blur-md border border-white/20 p-2 text-white shadow-2xl"
        >
          <p className="text-xs font-bold text-[#b3b3b3] px-2 py-1.5">Stream Quality</p>
          {title.sources.map((src) => (
            <button
              key={src.quality}
              type="button"
              onClick={() => {
                setSelectedQuality(src.quality);
                setActivePanel('none');
                triggerToast(`Quality ${src.quality}`);
              }}
              className={`w-full min-h-[38px] px-3 py-1.5 rounded text-left text-xs font-semibold flex items-center justify-between cursor-pointer ${
                selectedQuality === src.quality
                  ? 'bg-white text-black'
                  : 'text-[#b3b3b3] hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>
                {src.quality} ({src.type.toUpperCase()})
              </span>
              {selectedQuality === src.quality && <span>✓</span>}
            </button>
          ))}
        </div>
      )}

      {/* Isolated Top & Bottom Control Bars */}
      <ControlsOverlay
        title={title}
        controlsVisible={controlsVisible}
        isPlaying={isPlaying}
        isPaused={isPaused}
        isMuted={isMuted}
        volume={volume}
        speed={speed}
        selectedQuality={selectedQuality}
        subtitleLang={subtitleLang}
        isFullscreen={isFullscreen}
        activePanel={activePanel}
        progressFillRef={progressFillRef}
        bufferedFillRef={bufferedFillRef}
        thumbRef={thumbRef}
        currentTimeLabelRef={currentTimeLabelRef}
        durationLabelRef={durationLabelRef}
        onBack={() => {
          persistCurrentPosition(true);
          navigate('/');
        }}
        onTogglePlayPause={togglePlayPause}
        onSeekTo={(sec) => {
          setResumePromptSeconds(null);
          seekTo(sec);
        }}
        onSeekRelative={seekRelative}
        onToggleMute={toggleMute}
        onVolumeChange={(val) => setVolume(val)}
        onTogglePanel={handleTogglePanel}
        onTogglePiP={togglePiP}
        onToggleFullscreen={toggleFullscreen}
        onNextEpisode={goToNextEpisode}
      />
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
