'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import type { PlaybackInfo } from '@/lib/providers/types';
import { saveProgress, getProgress, clearProgress, recordWatch } from '@/lib/storage';
import type { MediaSummary } from '@/types';
import './VideoPlayer.css';

interface Props {
  playback: PlaybackInfo;
  content: MediaSummary;
  season?: number | null;
  episode?: number | null;
  /** Called when the user picks another audio language. */
  onLanguageChange?: (label: string) => void;
}

interface EmbeddedTrack {
  id: number;
  name: string;
  lang?: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const RESUME_SKIP_SECONDS = 30;

export default function VideoPlayer({
  playback,
  content,
  season,
  episode,
  onLanguageChange,
}: Props) {
  const native = playback.playback?.kind === 'native' ? playback.playback : null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveRef = useRef(0);

  const [buffering, setBuffering] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keyboard navigation & Hold 2X Fast-Forward state
  const [hud, setHud] = useState<{ text: string; holding?: boolean } | null>(null);
  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef(false);
  const holdKeyRef = useRef<string | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHud = useCallback((text: string, duration = 1200, holding = false) => {
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    setHud({ text, holding });
    if (!holding) {
      hudTimerRef.current = setTimeout(() => {
        setHud(null);
      }, duration);
    }
  }, []);

  // Quality levels
  const [levels, setLevels] = useState<Array<{ height: number; index: number }>>([]);
  const [activeLevel, setActiveLevel] = useState(-1);

  // Embedded HLS audio tracks
  const [embeddedAudio, setEmbeddedAudio] = useState<EmbeddedTrack[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState(-1);

  // Embedded HLS subtitle tracks
  const [embeddedSubtitles, setEmbeddedSubtitles] = useState<EmbeddedTrack[]>([]);
  const [activeHlsSubtitle, setActiveHlsSubtitle] = useState(-1);

  // Sidecar WebVTT subtitles from provider
  const sidecarSubtitles = playback.subtitles || [];
  const [activeSidecarSubtitle, setActiveSidecarSubtitle] = useState(-1);

  const hasSubtitles = embeddedSubtitles.length > 0 || sidecarSubtitles.length > 0;
  const isSubtitleActive = activeHlsSubtitle !== -1 || activeSidecarSubtitle !== -1;

  /* ── Source setup ──────────────────────────────────────────────────── */

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !native) return;

    setBuffering(true);
    setError(null);
    setLevels([]);
    setEmbeddedAudio([]);
    setEmbeddedSubtitles([]);
    setActiveLevel(-1);
    setActiveAudioTrack(-1);
    setActiveHlsSubtitle(-1);
    setActiveSidecarSubtitle(-1);

    if (native.streamType === 'mp4') {
      video.src = native.url;
      return;
    }

    // HLS — native support (Safari/iOS) first, hls.js everywhere else.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = native.url;
      return;
    }

    let destroyed = false;
    (async () => {
      try {
        const mod = await import('hls.js');
        const HlsCtor = mod.default;
        if (destroyed) return;
        if (!HlsCtor.isSupported()) {
          setError('HLS playback is not supported in this browser.');
          setBuffering(false);
          return;
        }

        const hls = new HlsCtor({ maxBufferLength: 30 });
        hlsRef.current = hls;
        hls.loadSource(native.url);
        hls.attachMedia(video);

        hls.on(HlsCtor.Events.MANIFEST_PARSED, () => {
          if (destroyed) return;
          // Quality levels
          setLevels(
            hls.levels
              .map((l, index) => ({ height: l.height || 0, index }))
              .filter(l => l.height > 0)
              .sort((a, b) => b.height - a.height)
          );

          // Embedded audio tracks
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

          // Embedded subtitle tracks
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
          if (destroyed) return;
          if (data.fatal) {
            setError(
              data.type === 'networkError'
                ? 'The stream could not be loaded (network error). It may be offline or blocked.'
                : 'The stream could not be played. The media may be corrupted or unsupported.'
            );
            setBuffering(false);
          }
        });
      } catch {
        if (!destroyed) {
          setError('Could not initialize the video engine.');
          setBuffering(false);
        }
      }
    })();

    return () => {
      destroyed = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [native]);

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

  /* ── Metadata + resume ─────────────────────────────────────────────── */

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);

    const saved = getProgress(content.type, content.id, season, episode);
    if (saved && video.duration && saved.seconds > 15 && saved.seconds < video.duration - 30) {
      video.currentTime = saved.seconds;
    }
    setBuffering(false);
  }, [content.type, content.id, season, episode]);

  /* ── Playback sync + progress persistence ──────────────────────────── */

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrent(video.currentTime);
    const now = Date.now();
    if (now - lastSaveRef.current > 5000 && video.duration) {
      lastSaveRef.current = now;
      saveProgress(content.type, content.id, video.currentTime, video.duration, season, episode);
    }
  }, [content.type, content.id, season, episode]);

  const onEnded = useCallback(() => {
    setPlaying(false);
    clearProgress(content.type, content.id, season, episode);
  }, [content.type, content.id, season, episode]);

  /* ── Controls ──────────────────────────────────────────────────────── */

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(err => {
        console.warn('Playback play request was prevented by browser policy:', err);
      });
    } else {
      video.pause();
    }
  }, []);

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    video.currentTime = Math.min(video.duration - 1, Math.max(0, video.currentTime + delta));
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
    hls.currentLevel = index; // -1 = auto
    setActiveLevel(index);
  }, []);

  const changeEmbeddedAudio = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.audioTrack = index;
    setActiveAudioTrack(index);
  }, []);

  const disableAllSubtitles = useCallback(() => {
    const hls = hlsRef.current;
    if (hls) {
      hls.subtitleTrack = -1;
    }
    setActiveHlsSubtitle(-1);

    const video = videoRef.current;
    if (video && video.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'disabled';
      }
    }
    setActiveSidecarSubtitle(-1);
  }, []);

  const selectHlsSubtitle = useCallback((index: number) => {
    const video = videoRef.current;
    if (video && video.textTracks) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'disabled';
      }
    }
    setActiveSidecarSubtitle(-1);

    const hls = hlsRef.current;
    if (hls) {
      hls.subtitleTrack = index;
    }
    setActiveHlsSubtitle(index);
  }, []);

  const selectSidecarSubtitle = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (hls) {
      hls.subtitleTrack = -1;
    }
    setActiveHlsSubtitle(-1);

    const video = videoRef.current;
    if (video && video.textTracks) {
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
    } else {
      // Turn on first available subtitle track
      if (embeddedSubtitles.length > 0) {
        selectHlsSubtitle(0);
      } else if (sidecarSubtitles.length > 0) {
        selectSidecarSubtitle(0);
      }
    }
  }, [
    hasSubtitles,
    isSubtitleActive,
    disableAllSubtitles,
    embeddedSubtitles.length,
    sidecarSubtitles.length,
    selectHlsSubtitle,
    selectSidecarSubtitle,
  ]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen().catch(() => {});
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      /* PiP unsupported / denied — ignore */
    }
  }, []);

  const retry = useCallback(() => {
    const video = videoRef.current;
    if (!video || !native) return;
    setError(null);
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

      // If already holding this key, prevent duplicate timers & repeated actions
      if (isHoldingRef.current && holdKeyRef.current === key) {
        if (key === ' ' || key === 'arrowright') e.preventDefault();
        return;
      }

      if (key === ' ' || key === 'k') {
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

      if (key === 'arrowright' || key === 'l') {
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
        showHud('◀◀ -10s Skip');
        return;
      }

      if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
        showHud(fullscreen ? 'Exit Fullscreen' : 'Fullscreen');
        return;
      }

      if (key === 'm') {
        e.preventDefault();
        toggleMute();
        showHud(muted ? '🔊 Unmuted' : '🔇 Muted');
        return;
      }

      if (key === 'p') {
        togglePiP();
        return;
      }

      if (key === 'c') {
        toggleSubtitlesQuick();
        return;
      }

      if (key === '<' || key === ',') {
        const curIdx = SPEEDS.indexOf(speed);
        if (curIdx > 0) {
          changeSpeed(SPEEDS[curIdx - 1]);
          showHud(`${SPEEDS[curIdx - 1]}X Speed`);
        }
        return;
      }

      if (key === '>' || key === '.') {
        const curIdx = SPEEDS.indexOf(speed);
        if (curIdx < SPEEDS.length - 1) {
          changeSpeed(SPEEDS[curIdx + 1]);
          showHud(`${SPEEDS[curIdx + 1]}X Speed`);
        }
        return;
      }

      if (key === 'arrowup') {
        e.preventDefault();
        const nextVol = Math.min(1, volume + 0.1);
        changeVolume(nextVol);
        showHud(`🔊 Volume ${Math.round(nextVol * 100)}%`);
        return;
      }

      if (key === 'arrowdown') {
        e.preventDefault();
        const nextVol = Math.max(0, volume - 0.1);
        changeVolume(nextVol);
        showHud(`🔉 Volume ${Math.round(nextVol * 100)}%`);
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        seekTo(Number(e.key) / 10);
        showHud(`Seek to ${Number(e.key) * 10}%`);
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
          showHud(`${speed}X Speed`, 800, false);
        } else {
          if (key === ' ' || key === 'k') {
            togglePlay();
            showHud(playing ? '⏸ Paused' : '▶ Playing');
          } else if (key === 'arrowright' || key === 'l') {
            seekBy(10);
            showHud('▶▶ +10s Skip');
          }
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
    fullscreen,
    muted,
    playing,
  ]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  /* auto-hide controls */
  const wakeControls = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!settingsOpen) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2600);
    }
  }, [settingsOpen]);

  useEffect(() => {
    wakeControls();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [wakeControls]);

  if (!native) {
    return (
      <div className="videoplayer videoplayer--blocked">
        <AlertTriangle size={36} />
        <p>This playback cannot be rendered by the built-in player.</p>
      </div>
    );
  }

  const fmt = (s: number) => {
    if (!Number.isFinite(s)) return '0:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={`videoplayer ${showControls || settingsOpen ? 'videoplayer--controls' : 'videoplayer--hidden'}`}
      onMouseMove={wakeControls}
      onTouchStart={wakeControls}
      onClick={e => {
        if ((e.target as HTMLElement).tagName === 'VIDEO') togglePlay();
      }}
    >
      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
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
            key={idx}
            kind="subtitles"
            label={sub.label}
            srcLang={sub.lang || 'en'}
            src={sub.url}
          />
        ))}
      </video>

      {/* ── Apple-Grade Player HUD Toast ── */}
      {hud && (
        <div className={`player-hud-toast ${hud.holding ? 'player-hud-toast--holding' : ''}`}>
          <span>{hud.text}</span>
        </div>
      )}

      {/* Loading / error overlays */}
      {buffering && !error && (
        <div className="videoplayer__overlay">
          <Loader2 size={44} className="videoplayer__spinner" />
        </div>
      )}
      {error && (
        <div className="videoplayer__overlay videoplayer__overlay--error">
          <AlertTriangle size={36} />
          <p>{error}</p>
          <button className="btn btn--primary" onClick={retry}>
            <RotateCcw size={16} /> Retry
          </button>
        </div>
      )}

      {/* Center play button when paused */}
      {!playing && !buffering && !error && (
        <button className="videoplayer__bigplay" onClick={togglePlay} aria-label="Play">
          <Play size={30} fill="currentColor" />
        </button>
      )}

      {/* Controls bar */}
      <div className="videoplayer__controls">
        <input
          type="range"
          className="videoplayer__seek"
          min={0}
          max={1000}
          value={duration ? Math.round((current / duration) * 1000) : 0}
          onChange={e => seekTo(Number(e.target.value) / 1000)}
          aria-label="Seek"
          style={{
            background: `linear-gradient(90deg, var(--accent) ${duration ? (current / duration) * 100 : 0}%, rgba(255,255,255,0.25) ${duration ? (current / duration) * 100 : 0}%)`,
          }}
        />

        <div className="videoplayer__row">
          <button
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            className="videoplayer__btn"
          >
            {playing ? <Pause size={22} /> : <Play size={22} fill="currentColor" />}
          </button>
          <button
            onClick={() => seekBy(-10)}
            aria-label="Back 10 seconds"
            className="videoplayer__btn videoplayer__btn--slim"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={() => seekBy(10)}
            aria-label="Forward 10 seconds"
            className="videoplayer__btn videoplayer__btn--slim"
          >
            <SkipForward size={18} />
          </button>

          <div className="videoplayer__volume">
            <button
              onClick={toggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="videoplayer__btn"
            >
              {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
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

          {/* Provider stream audio selector (only when multiple real streams exist) */}
          {playback.audioTracks.length > 1 && onLanguageChange && (
            <select
              className="videoplayer__select"
              defaultValue={playback.selectedLanguage}
              onChange={e => onLanguageChange(e.target.value)}
              aria-label="Audio language"
            >
              {playback.audioTracks.map(t => (
                <option key={t.label} value={t.label}>
                  {t.label}
                </option>
              ))}
            </select>
          )}

          {/* Subtitles quick toggle (only shown when subtitles exist) */}
          {hasSubtitles && (
            <button
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
              className="videoplayer__btn"
              onClick={() => setSettingsOpen(o => !o)}
              aria-label="Playback settings"
              aria-expanded={settingsOpen}
            >
              <Settings size={20} />
            </button>
            {settingsOpen && (
              <div className="videoplayer__menu">
                {/* Quality options (only when multiple real choices exist) */}
                {levels.length > 1 && (
                  <>
                    <p className="videoplayer__menu-label">Quality</p>
                    <button
                      className={`videoplayer__menu-item ${activeLevel === -1 ? 'is-active' : ''}`}
                      onClick={() => changeQuality(-1)}
                    >
                      Auto
                    </button>
                    {levels.map(l => (
                      <button
                        key={l.index}
                        className={`videoplayer__menu-item ${activeLevel === l.index ? 'is-active' : ''}`}
                        onClick={() => changeQuality(l.index)}
                      >
                        {l.height}p
                      </button>
                    ))}
                  </>
                )}

                {/* Embedded audio track options (only when multiple tracks exist) */}
                {embeddedAudio.length > 1 && (
                  <>
                    <p className="videoplayer__menu-label">Audio Track</p>
                    {embeddedAudio.map(t => (
                      <button
                        key={t.id}
                        className={`videoplayer__menu-item ${activeAudioTrack === t.id ? 'is-active' : ''}`}
                        onClick={() => changeEmbeddedAudio(t.id)}
                      >
                        {t.name}
                      </button>
                    ))}
                  </>
                )}

                {/* Subtitle selection (only when real subtitles exist) */}
                {hasSubtitles && (
                  <>
                    <p className="videoplayer__menu-label">Subtitles</p>
                    <button
                      className={`videoplayer__menu-item ${!isSubtitleActive ? 'is-active' : ''}`}
                      onClick={disableAllSubtitles}
                    >
                      Off
                    </button>
                    {embeddedSubtitles.map(s => (
                      <button
                        key={`hls-${s.id}`}
                        className={`videoplayer__menu-item ${activeHlsSubtitle === s.id ? 'is-active' : ''}`}
                        onClick={() => selectHlsSubtitle(s.id)}
                      >
                        {s.name}
                      </button>
                    ))}
                    {sidecarSubtitles.map((s, idx) => (
                      <button
                        key={`vtt-${idx}`}
                        className={`videoplayer__menu-item ${activeSidecarSubtitle === idx ? 'is-active' : ''}`}
                        onClick={() => selectSidecarSubtitle(idx)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </>
                )}

                {/* Playback speed options */}
                <p className="videoplayer__menu-label">Speed</p>
                {SPEEDS.map(s => (
                  <button
                    key={s}
                    className={`videoplayer__menu-item ${speed === s ? 'is-active' : ''}`}
                    onClick={() => changeSpeed(s)}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={togglePiP}
            aria-label="Picture in picture"
            className="videoplayer__btn videoplayer__btn--slim"
          >
            <PictureInPicture2 size={18} />
          </button>
          <button onClick={toggleFullscreen} aria-label="Fullscreen" className="videoplayer__btn">
            {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
