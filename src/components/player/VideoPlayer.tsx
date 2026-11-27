'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Settings,
  Loader2,
  AlertTriangle,
  RotateCcw,
  SkipBack,
  SkipForward,
  Captions,
  ChevronRight,
  ChevronLeft,
  Zap,
} from 'lucide-react';
import type { PlaybackInfo } from '@/lib/providers/types';
import type { DirectStreamOption } from '@/lib/player/directExtractor';
import type { AudioLanguageOption } from '@/components/player/LuminaServerDeck';
import { saveProgress, getProgress, clearProgress, recordWatch } from '@/lib/storage';
import type { MediaSummary } from '@/types';
import './VideoPlayer.css';

interface Props {
  playback: PlaybackInfo;
  content: MediaSummary;
  season?: number | null;
  episode?: number | null;
  mirrors?: DirectStreamOption[];
  onSelectMirror?: (stream: DirectStreamOption) => void;
  audioOptions?: AudioLanguageOption[];
  selectedAudioKey?: string;
  onSelectAudioOption?: (opt: AudioLanguageOption) => void;
  prevEpisodeHref?: string | null;
  nextEpisodeHref?: string | null;
  onFallbackToEmbed?: () => void;
  /** Called when the user picks another audio language. */
  onLanguageChange?: (label: string) => void;
}

interface EmbeddedTrack {
  id: number;
  name: string;
  lang?: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayer({
  playback,
  content,
  season,
  episode,
  mirrors = [],
  onSelectMirror,
  audioOptions = [],
  selectedAudioKey,
  onSelectAudioOption,
  prevEpisodeHref,
  nextEpisodeHref,
  onFallbackToEmbed,
}: Props) {
  const router = useRouter();
  const native = playback.playback?.kind === 'native' ? playback.playback : null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveRef = useRef(0);
  const triedMirrorUrlsRef = useRef<Set<string>>(new Set());
  const currentTimeRef = useRef(0);
  const mediaKeyRef = useRef(`${content.type}-${content.id}-${season ?? 0}-${episode ?? 0}`);
  const pendingSeekRef = useRef<number | null>(null);

  const [buffering, setBuffering] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [settingsTab, setSettingsTab] = useState<'main' | 'quality' | 'audio' | 'subs' | 'speed'>('main');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverTime, setHoverTime] = useState<{ pct: number; time: number } | null>(null);
  const [dismissUpNext, setDismissUpNext] = useState(false);

  // Keyboard navigation & Hold 2X Fast-Forward / double-tap state
  const [hud, setHud] = useState<{ text: string; holding?: boolean } | null>(null);
  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);
  const holdKeyRef = useRef<string | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' } | null>(null);

  const showHud = useCallback((text: string, durationMs = 1100, holding = false) => {
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    setHud({ text, holding });
    if (!holding) {
      hudTimerRef.current = setTimeout(() => {
        setHud(null);
      }, durationMs);
    }
  }, []);

  // Quality levels
  const [levels, setLevels] = useState<Array<{ height: number; index: number }>>([]);
  const [activeLevel, setActiveLevel] = useState(-1);

  // Embedded HLS audio & subtitle tracks
  const [embeddedAudio, setEmbeddedAudio] = useState<EmbeddedTrack[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState(-1);
  const [embeddedSubtitles, setEmbeddedSubtitles] = useState<EmbeddedTrack[]>([]);
  const [activeHlsSubtitle, setActiveHlsSubtitle] = useState(-1);

  // Sidecar WebVTT subtitles from provider
  const sidecarSubtitles = useMemo(() => playback.subtitles || [], [playback.subtitles]);
  const [activeSidecarSubtitle, setActiveSidecarSubtitle] = useState(-1);

  const hasSubtitles = embeddedSubtitles.length > 0 || sidecarSubtitles.length > 0;
  const isSubtitleActive = activeHlsSubtitle !== -1 || activeSidecarSubtitle !== -1;

  const tryFailoverOrError = useCallback(
    (msg: string) => {
      if (native?.url) {
        triedMirrorUrlsRef.current.add(native.url);
      }
      const sameLangMirror = mirrors.find(
        m => !triedMirrorUrlsRef.current.has(m.url) && (!selectedAudioKey || m.langKey === selectedAudioKey)
      );
      const nextMirror = sameLangMirror ?? mirrors.find(m => !triedMirrorUrlsRef.current.has(m.url));
      if (nextMirror && onSelectMirror) {
        showHud(`⚡ Switching to ${nextMirror.label}…`, 1400);
        onSelectMirror(nextMirror);
        return true;
      }
      if (onFallbackToEmbed) {
        onFallbackToEmbed();
        return true;
      }
      setError(msg);
      setBuffering(false);
      return false;
    },
    [mirrors, native, onFallbackToEmbed, onSelectMirror, selectedAudioKey, showHud]
  );

  /* ── Source setup ──────────────────────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !native) return;

    const currentMediaKey = `${content.type}-${content.id}-${season ?? 0}-${episode ?? 0}`;
    if (mediaKeyRef.current === currentMediaKey && currentTimeRef.current > 2) {
      pendingSeekRef.current = currentTimeRef.current;
    } else if (mediaKeyRef.current !== currentMediaKey) {
      mediaKeyRef.current = currentMediaKey;
      currentTimeRef.current = 0;
      pendingSeekRef.current = null;
      triedMirrorUrlsRef.current.clear();
    }

    setBuffering(true);
    setError(null);
    setDismissUpNext(false);
    setLevels([]);
    setEmbeddedAudio([]);
    setEmbeddedSubtitles([]);
    setActiveLevel(-1);
    setActiveAudioTrack(-1);
    setActiveHlsSubtitle(-1);
    setActiveSidecarSubtitle(-1);

    if (native.streamType === 'mp4') {
      video.src = native.url;
      video.play().catch(() => {});
      return;
    }

    // Native Apple HLS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = native.url;
      video.play().catch(() => {});
      return;
    }

    let destroyed = false;
    (async () => {
      try {
        const mod = await import('hls.js');
        const HlsCtor = mod.default;
        if (destroyed) return;
        if (!HlsCtor.isSupported()) {
          tryFailoverOrError('HLS playback is not supported in this browser.');
          return;
        }

        const hls = new HlsCtor({
          maxBufferLength: 24,
          maxMaxBufferLength: 48,
          startFragPrefetch: true,
          enableWorker: true,
        });
        hlsRef.current = hls;
        hls.loadSource(native.url);
        hls.attachMedia(video);

        hls.on(HlsCtor.Events.MANIFEST_PARSED, () => {
          if (destroyed) return;
          setLevels(
            hls.levels
              .map((l, index) => ({ height: l.height || 0, index }))
              .filter(l => l.height > 0)
              .sort((a, b) => b.height - a.height)
          );

          if (hls.audioTracks && hls.audioTracks.length > 0) {
            setEmbeddedAudio(
              hls.audioTracks.map((t, idx) => ({
                id: idx,
                name: t.name || t.lang || `Audio ${idx + 1}`,
                lang: t.lang,
              }))
            );
            setActiveAudioTrack(hls.audioTrack);
          }

          if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
            setEmbeddedSubtitles(
              hls.subtitleTracks.map((t, idx) => ({
                id: idx,
                name: t.name || t.lang || `Subtitle ${idx + 1}`,
                lang: t.lang,
              }))
            );
            setActiveHlsSubtitle(hls.subtitleTrack);
          }

          setBuffering(false);
          video.play().catch(() => {});
        });

        hls.on(HlsCtor.Events.AUDIO_TRACKS_UPDATED, () => {
          if (destroyed || !hls.audioTracks) return;
          setEmbeddedAudio(
            hls.audioTracks.map((t, idx) => ({
              id: idx,
              name: t.name || t.lang || `Audio ${idx + 1}`,
              lang: t.lang,
            }))
          );
          setActiveAudioTrack(hls.audioTrack);
        });

        hls.on(HlsCtor.Events.SUBTITLE_TRACKS_UPDATED, () => {
          if (destroyed || !hls.subtitleTracks) return;
          setEmbeddedSubtitles(
            hls.subtitleTracks.map((t, idx) => ({
              id: idx,
              name: t.name || t.lang || `Subtitle ${idx + 1}`,
              lang: t.lang,
            }))
          );
          setActiveHlsSubtitle(hls.subtitleTrack);
        });

        hls.on(HlsCtor.Events.ERROR, (_evt, data) => {
          if (destroyed || !data.fatal) return;
          tryFailoverOrError(
            data.type === 'networkError'
              ? 'Stream could not be loaded (network error).'
              : 'Stream format could not be played.'
          );
        });
      } catch {
        if (!destroyed) {
          tryFailoverOrError('Could not initialize the video engine.');
        }
      }
    })();

    return () => {
      destroyed = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [native, tryFailoverOrError]);

  /* ── History (recently watched) ────────────────────────────────────── */
  useEffect(() => {
    recordWatch({
      ...content,
      watchedAt: Date.now(),
      progressSeconds: 0,
      durationSeconds: null,
      season: season ?? null,
      episode: episode ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- record once per title open
  }, [content.id, content.type, season, episode]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
    const pending = pendingSeekRef.current;
    pendingSeekRef.current = null;
    if (pending && video.duration && pending > 1 && pending < video.duration - 2) {
      video.currentTime = pending;
    } else {
      const saved = getProgress(content.type, content.id, season, episode);
      if (saved && video.duration && saved.seconds > 15 && saved.seconds < video.duration - 30) {
        video.currentTime = saved.seconds;
      }
    }
    setBuffering(false);
  }, [content.type, content.id, season, episode]);

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    currentTimeRef.current = video.currentTime;
    setCurrent(video.currentTime);
    if (video.buffered.length > 0) {
      setBufferedEnd(video.buffered.end(video.buffered.length - 1));
    }
    const now = Date.now();
    if (now - lastSaveRef.current > 5000 && video.duration) {
      lastSaveRef.current = now;
      saveProgress(content.type, content.id, video.currentTime, video.duration, season, episode);
    }
  }, [content.type, content.id, season, episode]);

  const onEnded = useCallback(() => {
    setPlaying(false);
    clearProgress(content.type, content.id, season, episode);
    if (nextEpisodeHref) {
      router.push(nextEpisodeHref);
    }
  }, [content.type, content.id, season, episode, nextEpisodeHref, router]);

  /* ── Controls ──────────────────────────────────────────────────────── */
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    video.currentTime = Math.min(video.duration - 0.5, Math.max(0, video.currentTime + delta));
  }, []);

  const seekTo = useCallback((fraction: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    video.currentTime = fraction * video.duration;
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const changeVolume = useCallback((v: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(1, v));
    video.volume = clamped;
    setVolume(clamped);
    setMuted(clamped === 0);
  }, []);

  const changeSpeed = useCallback((s: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = s;
    setSpeed(s);
  }, []);

  const changeQuality = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = index;
    setActiveLevel(index);
  }, []);

  const changeEmbeddedAudio = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.audioTrack = index;
    setActiveAudioTrack(index);
  }, []);

  const disableAllSubtitles = useCallback(() => {
    if (hlsRef.current) hlsRef.current.subtitleTrack = -1;
    setActiveHlsSubtitle(-1);
    const video = videoRef.current;
    if (video?.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'disabled';
      }
    }
    setActiveSidecarSubtitle(-1);
  }, []);

  const selectHlsSubtitle = useCallback((index: number) => {
    const video = videoRef.current;
    if (video?.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'disabled';
      }
    }
    setActiveSidecarSubtitle(-1);
    if (hlsRef.current) hlsRef.current.subtitleTrack = index;
    setActiveHlsSubtitle(index);
  }, []);

  const selectSidecarSubtitle = useCallback((index: number) => {
    if (hlsRef.current) hlsRef.current.subtitleTrack = -1;
    setActiveHlsSubtitle(-1);
    const video = videoRef.current;
    if (video?.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = i === index ? 'showing' : 'disabled';
      }
    }
    setActiveSidecarSubtitle(index);
  }, []);

  const toggleSubtitlesQuick = useCallback(() => {
    if (!hasSubtitles) return;
    if (isSubtitleActive) {
      disableAllSubtitles();
      showHud('Subtitles Off');
    } else if (embeddedSubtitles.length > 0) {
      selectHlsSubtitle(0);
      showHud(`Subtitles: ${embeddedSubtitles[0].name}`);
    } else if (sidecarSubtitles.length > 0) {
      selectSidecarSubtitle(0);
      showHud(`Subtitles: ${sidecarSubtitles[0].label}`);
    }
  }, [
    hasSubtitles,
    isSubtitleActive,
    disableAllSubtitles,
    embeddedSubtitles,
    sidecarSubtitles,
    selectHlsSubtitle,
    selectSidecarSubtitle,
    showHud,
  ]);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      try {
        if (screen.orientation && 'unlock' in screen.orientation) screen.orientation.unlock();
      } catch {
        // ignore
      }
    } else {
      try {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if ((el as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (el as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        }
        const orientation = screen.orientation as unknown as { lock?: (o: string) => Promise<void> };
        if (orientation?.lock) await orientation.lock('landscape').catch(() => {});
      } catch {
        // ignore
      }
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      // ignore
    }
  }, []);

  const retry = useCallback(() => {
    const video = videoRef.current;
    if (!video || !native) return;
    setError(null);
    setBuffering(true);
    if (native.streamType === 'mp4' || video.canPlayType('application/vnd.apple.mpegurl')) {
      video.load();
    } else {
      hlsRef.current?.startLoad();
    }
  }, [native]);

  /* keyboard shortcuts & hold to 2X fast forward */
  useEffect(() => {
    const video = videoRef.current;

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|SELECT/)) return;
      const key = e.key.toLowerCase();

      if (isHoldingRef.current && holdKeyRef.current === key) {
        if (key === ' ' || key === 'arrowright') e.preventDefault();
        return;
      }

      if (key === ' ' || key === 'k' || key === 'arrowright' || key === 'l') {
        e.preventDefault();
        holdKeyRef.current = key;
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
          isHoldingRef.current = true;
          if (video) video.playbackRate = 2;
          showHud('▶▶ 2X Speed (Holding)', 0, true);
        }, 220);
        return;
      }

      if (key === 'arrowleft' || key === 'j') {
        e.preventDefault();
        seekBy(-10);
        showHud('◀◀ -10s');
      } else if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (key === 'm') {
        e.preventDefault();
        toggleMute();
        showHud(muted ? '🔊 Unmuted' : '🔇 Muted');
      } else if (key === 'p') {
        togglePiP();
      } else if (key === 'c') {
        toggleSubtitlesQuick();
      } else if (key === '<' || key === ',') {
        const curIdx = SPEEDS.indexOf(speed);
        if (curIdx > 0) {
          changeSpeed(SPEEDS[curIdx - 1]);
          showHud(`${SPEEDS[curIdx - 1]}× Speed`);
        }
      } else if (key === '>' || key === '.') {
        const curIdx = SPEEDS.indexOf(speed);
        if (curIdx < SPEEDS.length - 1) {
          changeSpeed(SPEEDS[curIdx + 1]);
          showHud(`${SPEEDS[curIdx + 1]}× Speed`);
        }
      } else if (key === 'arrowup') {
        e.preventDefault();
        const nextVol = Math.min(1, volume + 0.1);
        changeVolume(nextVol);
        showHud(`🔊 ${Math.round(nextVol * 100)}%`);
      } else if (key === 'arrowdown') {
        e.preventDefault();
        const nextVol = Math.max(0, volume - 0.1);
        changeVolume(nextVol);
        showHud(`🔉 ${Math.round(nextVol * 100)}%`);
      } else if (/^[0-9]$/.test(e.key)) {
        seekTo(Number(e.key) / 10);
        showHud(`${Number(e.key) * 10}%`);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|SELECT/)) return;
      const key = e.key.toLowerCase();
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (holdKeyRef.current === key) {
        if (isHoldingRef.current) {
          isHoldingRef.current = false;
          if (video) video.playbackRate = speed;
          showHud(`${speed}× Speed`, 800, false);
        } else if (key === ' ' || key === 'k') {
          togglePlay();
          showHud(playing ? '⏸ Paused' : '▶ Playing');
        } else if (key === 'arrowright' || key === 'l') {
          seekBy(10);
          showHud('▶▶ +10s');
        }
        holdKeyRef.current = null;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    };
  }, [
    togglePlay,
    seekBy,
    seekTo,
    toggleMute,
    togglePiP,
    changeVolume,
    volume,
    toggleFullscreen,
    toggleSubtitlesQuick,
    speed,
    changeSpeed,
    showHud,
    muted,
    playing,
  ]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const wakeControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing && !settingsOpen) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3200);
    }
  }, [playing, settingsOpen]);

  useEffect(() => {
    if (!playing) {
      setShowControls(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    } else {
      wakeControls();
    }
  }, [playing, wakeControls]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!native) {
    return (
      <div className="videoplayer videoplayer--blocked">
        <AlertTriangle size={36} />
        <p>This playback cannot be rendered by the built-in player.</p>
      </div>
    );
  }

  const fmt = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return '0:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  };

  const progressPct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;
  const showUpNextCard =
    Boolean(nextEpisodeHref) &&
    !dismissUpNext &&
    duration > 90 &&
    duration - current <= 25 &&
    duration - current > 0;

  return (
    <div
      ref={containerRef}
      className={`videoplayer ${showControls || !playing || settingsOpen ? 'videoplayer--controls' : 'videoplayer--hidden'} ${playing ? 'videoplayer--playing' : 'videoplayer--paused'}`}
      onMouseMove={wakeControls}
      onMouseEnter={wakeControls}
      onTouchStart={e => {
        wakeControls();
        if ((e.target as HTMLElement).tagName !== 'VIDEO') return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.touches[0].clientX - rect.left;
        const side = x < rect.width * 0.45 ? 'left' : x > rect.width * 0.55 ? 'right' : null;
        if (!side) return;
        const now = Date.now();
        if (lastTapRef.current && now - lastTapRef.current.time < 300 && lastTapRef.current.side === side) {
          seekBy(side === 'left' ? -10 : 10);
          showHud(side === 'left' ? '◀◀ -10s' : '▶▶ +10s');
          lastTapRef.current = null;
        } else {
          lastTapRef.current = { time: now, side };
        }
      }}
      onDoubleClick={e => {
        if ((e.target as HTMLElement).tagName === 'VIDEO') toggleFullscreen();
      }}
      onClick={e => {
        if ((e.target as HTMLElement).tagName === 'VIDEO') togglePlay();
        if (settingsOpen && !(e.target as HTMLElement).closest('.videoplayer__settings')) {
          setSettingsOpen(false);
        }
      }}
    >
      <video
        ref={videoRef}
        playsInline
        autoPlay
        preload="auto"
        crossOrigin="anonymous"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onError={() => tryFailoverOrError('Video stream could not be loaded.')}
        onVolumeChange={() => {
          const v = videoRef.current;
          if (v) {
            setVolume(v.volume);
            setMuted(v.muted);
          }
        }}
      >
        {sidecarSubtitles.map((sub, idx) => (
          <track
            key={`${sub.label}-${idx}`}
            kind="subtitles"
            label={sub.label}
            srcLang={sub.lang || 'en'}
            src={sub.url}
          />
        ))}
      </video>

      {/* Top Cinema Header */}
      <div className="videoplayer__top">
        <div className="videoplayer__title-wrap">
          <span className="videoplayer__live-pill">
            <Zap size={11} /> Instant HD
          </span>
          <h2 className="videoplayer__title">
            {content.title}
            {season !== undefined && season !== null && episode !== undefined && episode !== null
              ? ` · S${season} E${episode}`
              : ''}
          </h2>
        </div>
      </div>

      {/* Player HUD Toast */}
      {hud && (
        <div className={`player-hud-toast ${hud.holding ? 'player-hud-toast--holding' : ''}`}>
          <span>{hud.text}</span>
        </div>
      )}

      {/* Up Next Prompt */}
      {showUpNextCard && nextEpisodeHref && (
        <div className="videoplayer__upnext">
          <button
            type="button"
            className="videoplayer__upnext-btn"
            onClick={() => router.push(nextEpisodeHref)}
          >
            <span>Next Episode</span>
            <ChevronRight size={15} />
          </button>
          <button
            type="button"
            className="videoplayer__upnext-close"
            onClick={() => setDismissUpNext(true)}
            aria-label="Dismiss next episode"
          >
            ×
          </button>
        </div>
      )}

      {buffering && !error && (
        <div className="videoplayer__overlay">
          <Loader2 size={42} className="videoplayer__spinner" />
        </div>
      )}

      {error && (
        <div className="videoplayer__overlay videoplayer__overlay--error">
          <AlertTriangle size={34} />
          <p>{error}</p>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="btn btn--primary" onClick={retry}>
              <RotateCcw size={15} /> Retry
            </button>
            {onFallbackToEmbed && (
              <button type="button" className="btn btn--ghost" onClick={onFallbackToEmbed}>
                Switch Engine
              </button>
            )}
          </div>
        </div>
      )}

      {!playing && !buffering && !error && (
        <button type="button" className="videoplayer__bigplay" onClick={togglePlay} aria-label="Play">
          <Play size={28} fill="currentColor" />
        </button>
      )}

      {/* Glass Controls Bar */}
      <div className="videoplayer__controls">
        <div
          className="videoplayer__seek-wrap"
          onMouseMove={e => {
            if (!duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setHoverTime({ pct: pct * 100, time: pct * duration });
          }}
          onMouseLeave={() => setHoverTime(null)}
        >
          {hoverTime && (
            <span className="videoplayer__seek-tooltip" style={{ left: `${hoverTime.pct}%` }}>
              {fmt(hoverTime.time)}
            </span>
          )}
          <div className="videoplayer__seek-track">
            <div className="videoplayer__seek-buf" style={{ width: `${bufferedPct}%` }} />
            <div className="videoplayer__seek-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <input
            type="range"
            className="videoplayer__seek"
            min={0}
            max={1000}
            value={duration ? Math.round((current / duration) * 1000) : 0}
            onChange={e => seekTo(Number(e.target.value) / 1000)}
            aria-label="Seek"
          />
        </div>

        <div className="videoplayer__row">
          {prevEpisodeHref && (
            <button
              type="button"
              onClick={() => router.push(prevEpisodeHref)}
              aria-label="Previous episode"
              title="Previous episode"
              className="videoplayer__btn videoplayer__btn--slim"
            >
              <ChevronLeft size={19} />
            </button>
          )}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            className="videoplayer__btn"
          >
            {playing ? <Pause size={21} /> : <Play size={21} fill="currentColor" />}
          </button>
          <button
            type="button"
            onClick={() => {
              seekBy(-10);
              showHud('◀◀ -10s');
            }}
            aria-label="Back 10 seconds"
            className="videoplayer__btn videoplayer__btn--slim"
          >
            <SkipBack size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              seekBy(10);
              showHud('▶▶ +10s');
            }}
            aria-label="Forward 10 seconds"
            className="videoplayer__btn videoplayer__btn--slim"
          >
            <SkipForward size={18} />
          </button>
          {nextEpisodeHref && (
            <button
              type="button"
              onClick={() => router.push(nextEpisodeHref)}
              aria-label="Next episode"
              title="Next episode"
              className="videoplayer__btn videoplayer__btn--slim"
            >
              <ChevronRight size={19} />
            </button>
          )}

          <div className="videoplayer__volume">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="videoplayer__btn"
            >
              {muted || volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : Math.round(volume * 100)}
              onChange={e => changeVolume(Number(e.target.value) / 100)}
              aria-label="Volume"
              className="videoplayer__vol-range"
            />
          </div>

          <span className="videoplayer__time">
            {fmt(current)} <span className="videoplayer__time-sep">/</span> {fmt(duration)}
          </span>

          <span className="videoplayer__spacer" />

          {hasSubtitles && (
            <button
              type="button"
              onClick={toggleSubtitlesQuick}
              aria-label="Subtitles"
              className={`videoplayer__btn videoplayer__btn--slim ${isSubtitleActive ? 'videoplayer__btn--active' : ''}`}
              title={isSubtitleActive ? 'Subtitles: On' : 'Subtitles: Off'}
            >
              <Captions size={18} />
            </button>
          )}

          <div className="videoplayer__settings">
            <button
              type="button"
              className="videoplayer__btn"
              onClick={() => {
                setSettingsTab('main');
                setSettingsOpen(o => !o);
              }}
              aria-label="Playback settings"
              aria-expanded={settingsOpen}
            >
              <Settings size={19} />
            </button>
            {settingsOpen && (
              <div className="videoplayer__menu">
                {settingsTab === 'main' ? (
                  <>
                    <button
                      type="button"
                      className="videoplayer__menu-item videoplayer__menu-row"
                      onClick={() => setSettingsTab('speed')}
                    >
                      <span>Speed</span>
                      <span className="videoplayer__menu-val">{speed}×</span>
                    </button>
                    {levels.length > 1 && (
                      <button
                        type="button"
                        className="videoplayer__menu-item videoplayer__menu-row"
                        onClick={() => setSettingsTab('quality')}
                      >
                        <span>Quality</span>
                        <span className="videoplayer__menu-val">
                          {activeLevel === -1
                            ? 'Auto'
                            : `${levels.find(l => l.index === activeLevel)?.height ?? ''}p`}
                        </span>
                      </button>
                    )}
                    {(audioOptions.length > 1 || embeddedAudio.length > 1) && (
                      <button
                        type="button"
                        className="videoplayer__menu-item videoplayer__menu-row"
                        onClick={() => setSettingsTab('audio')}
                      >
                        <span>Audio</span>
                        <span className="videoplayer__menu-val">
                          {audioOptions.length > 1
                            ? audioOptions.find(o => o.key === selectedAudioKey)?.label ??
                              audioOptions[0].label
                            : embeddedAudio.find(a => a.id === activeAudioTrack)?.name ?? 'Auto'}
                        </span>
                      </button>
                    )}
                    {hasSubtitles && (
                      <button
                        type="button"
                        className="videoplayer__menu-item videoplayer__menu-row"
                        onClick={() => setSettingsTab('subs')}
                      >
                        <span>Subtitles</span>
                        <span className="videoplayer__menu-val">
                          {activeSidecarSubtitle >= 0
                            ? sidecarSubtitles[activeSidecarSubtitle]?.label
                            : activeHlsSubtitle >= 0
                              ? embeddedSubtitles[activeHlsSubtitle]?.name
                              : 'Off'}
                        </span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="videoplayer__menu-item videoplayer__menu-back"
                      onClick={() => setSettingsTab('main')}
                    >
                      ← Back
                    </button>
                    {settingsTab === 'speed' &&
                      SPEEDS.map(s => (
                        <button
                          type="button"
                          key={s}
                          className={`videoplayer__menu-item ${speed === s ? 'is-active' : ''}`}
                          onClick={() => {
                            changeSpeed(s);
                            setSettingsOpen(false);
                          }}
                        >
                          {s}×
                        </button>
                      ))}
                    {settingsTab === 'quality' && (
                      <>
                        <button
                          type="button"
                          className={`videoplayer__menu-item ${activeLevel === -1 ? 'is-active' : ''}`}
                          onClick={() => {
                            changeQuality(-1);
                            setSettingsOpen(false);
                          }}
                        >
                          Auto
                        </button>
                        {levels.map(l => (
                          <button
                            type="button"
                            key={l.index}
                            className={`videoplayer__menu-item ${activeLevel === l.index ? 'is-active' : ''}`}
                            onClick={() => {
                              changeQuality(l.index);
                              setSettingsOpen(false);
                            }}
                          >
                            {l.height}p
                          </button>
                        ))}
                      </>
                    )}
                    {settingsTab === 'audio' && (
                      <>
                        {audioOptions.map(opt => (
                          <button
                            type="button"
                            key={opt.key}
                            className={`videoplayer__menu-item ${selectedAudioKey === opt.key ? 'is-active' : ''}`}
                            onClick={() => {
                              onSelectAudioOption?.(opt);
                              showHud(`${opt.flag} ${opt.label}`);
                              setSettingsOpen(false);
                            }}
                          >
                            {opt.flag} {opt.label}
                          </button>
                        ))}
                        {embeddedAudio.map(t => (
                          <button
                            type="button"
                            key={t.id}
                            className={`videoplayer__menu-item ${activeAudioTrack === t.id ? 'is-active' : ''}`}
                            onClick={() => {
                              changeEmbeddedAudio(t.id);
                              setSettingsOpen(false);
                            }}
                          >
                            {t.name}
                          </button>
                        ))}
                      </>
                    )}
                    {settingsTab === 'subs' && (
                      <>
                        <button
                          type="button"
                          className={`videoplayer__menu-item ${!isSubtitleActive ? 'is-active' : ''}`}
                          onClick={() => {
                            disableAllSubtitles();
                            setSettingsOpen(false);
                          }}
                        >
                          Off
                        </button>
                        {embeddedSubtitles.map(s => (
                          <button
                            type="button"
                            key={`hls-${s.id}`}
                            className={`videoplayer__menu-item ${activeHlsSubtitle === s.id ? 'is-active' : ''}`}
                            onClick={() => {
                              selectHlsSubtitle(s.id);
                              setSettingsOpen(false);
                            }}
                          >
                            {s.name}
                          </button>
                        ))}
                        {sidecarSubtitles.map((s, idx) => (
                          <button
                            type="button"
                            key={`vtt-${idx}`}
                            className={`videoplayer__menu-item ${activeSidecarSubtitle === idx ? 'is-active' : ''}`}
                            onClick={() => {
                              selectSidecarSubtitle(idx);
                              setSettingsOpen(false);
                            }}
                          >
                            {s.label}
                          </button>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={togglePiP}
            aria-label="Picture in picture"
            className="videoplayer__btn videoplayer__btn--slim"
          >
            <PictureInPicture2 size={18} />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Fullscreen"
            className="videoplayer__btn"
          >
            {fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
          </button>
        </div>
      </div>
    </div>
  );
}
