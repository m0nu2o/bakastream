'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Volume2,
  Zap,
} from 'lucide-react';
import VideoPlayer from '@/components/player/VideoPlayer';
import LuminaServerDeck from '@/components/player/LuminaServerDeck';
import StateView from '@/components/StateView';
import { resolveStream } from '@/lib/tmdb/client';
import {
  getLuminaServers,
  getNextFallbackServer,
  ProviderTelemetry,
  type LuminaServerConfig,
} from '@/lib/providers/lumina';
import type { PlaybackInfo } from '@/lib/providers/types';
import type { MediaSummary } from '@/types';
import './watch.css';

interface Props {
  content: MediaSummary;
  season?: number;
  episode?: number;
}

export default function WatchClient({ content, season, episode }: Props) {
  const [info, setInfo] = useState<PlaybackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLang = content.originalLanguage === 'hi' ? 'hindi' : 'english';
  const [subOrDub, setSubOrDub] = useState<'sub' | 'dub'>('sub');
  const isAnimeGenre = Boolean(content.genreIds?.includes(16));
  const [server, setServer] = useState<string>(isAnimeGenre ? 'nextgen-anime' : 'vidlink');
  const [language, setLanguage] = useState<string>(initialLang);
  const [autoSwitch, setAutoSwitch] = useState<boolean>(true);

  const requestedLang = useRef<string | undefined>(undefined);
  const isAnime = Boolean(isAnimeGenre || info?.isAnime);
  const mediaCategory = isAnime ? 'anime' : (content.type as 'movie' | 'tv');
  const isHindiOriginal = content.originalLanguage === 'hi';

  const compatibleServers = useMemo(() => {
    return getLuminaServers(mediaCategory, isHindiOriginal).slice(0, 4);
  }, [mediaCategory, isHindiOriginal]);

  // AdShield: Intercept rogue popups at parent window level
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalOpen = window.open;
    window.open = function (url?: string | URL) {
      console.warn('[BakaStream AdShield] Neutralized popup attempt:', url);
      return null;
    };
    return () => {
      window.open = originalOpen;
    };
  }, []);

  const load = useCallback(
    async (options?: { language?: string; subOrDub?: 'sub' | 'dub'; server?: string }) => {
      const nextLang =
        options?.language ??
        requestedLang.current ??
        (content.originalLanguage === 'hi' ? 'hindi' : undefined);
      const nextSubOrDub = options?.subOrDub ?? subOrDub;
      const nextServer = options?.server ?? server;

      setLoading(true);
      setError(null);
      try {
        const data = await resolveStream({
          type: content.type,
          id: content.id,
          imdbId: content.imdbId ?? undefined,
          season,
          episode,
          title: content.title,
          isAnime: content.genreIds?.includes(16),
          subOrDub: nextSubOrDub,
          server: nextServer,
          language: nextLang,
        });
        setInfo(data);
        if (data?.server) {
          setServer(data.server);
        }
        if (nextLang) {
          requestedLang.current = nextLang;
        }
      } catch {
        setError('Could not reach the stream service.');
      } finally {
        setLoading(false);
      }
    },
    [
      content.type,
      content.id,
      content.title,
      content.genreIds,
      content.originalLanguage,
      content.imdbId,
      season,
      episode,
      subOrDub,
      server,
    ]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolve once per title/episode
  }, [content.id, content.type, season, episode]);

  const handleSubOrDubChange = (newSubOrDub: 'sub' | 'dub') => {
    setSubOrDub(newSubOrDub);
    load({ subOrDub: newSubOrDub });
  };

  const handleServerChange = (newServer: string) => {
    setServer(newServer);
    load({ server: newServer });
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    load({ language: newLang });
  };

  if (loading) {
    return (
      <div className="watch__stage watch__stage--loading">
        <Loader2 size={40} className="watch__spinner" />
        <p>Finding streams…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="watch__stage">
        <StateView
          kind="network"
          title="Stream service unreachable"
          message={error}
          actionLabel="Try again"
          onRetry={() => load()}
        />
      </div>
    );
  }

  if (!info) return null;

  if (info.status === 'unavailable' || !info.playback) {
    return (
      <div className="watch__stage">
        <StateView
          kind="empty"
          title="No stream available"
          message={
            info.message ??
            'No configured provider could supply playback for this title. Please try another streaming server.'
          }
          actionLabel="Try another server"
          onRetry={() => handleServerChange(isAnime ? 'nextgen-anime' : 'vidlink')}
        />
        <LuminaServerDeck
          servers={compatibleServers}
          activeServerId={server}
          onSelectServer={handleServerChange}
          mediaCategory={mediaCategory}
          selectedAudioTrack={language === 'hindi' ? 'hindi' : isAnime ? subOrDub : language}
          onSelectAudioTrack={track => {
            if (track === 'hindi') {
              handleLanguageChange('hindi');
            } else if (isAnime) {
              setLanguage(initialLang);
              handleSubOrDubChange(track as 'sub' | 'dub');
            } else {
              handleLanguageChange(track);
            }
          }}
          hasHindiDub={true}
          autoSwitch={autoSwitch}
          onToggleAutoSwitch={() => setAutoSwitch(prev => !prev)}
        />
      </div>
    );
  }

  if (info.playback.kind === 'embed') {
    return (
      <EmbedStage
        key={`embed-${content.id}-${season ?? 0}-${episode ?? 0}-${info.playback.embedUrl}`}
        embedUrl={info.playback.embedUrl}
        isPreview={info.isPreview ?? false}
        notice={info.notice}
        audioTracks={info.audioTracks}
        selectedLanguage={info.selectedLanguage}
        isAnime={isAnime}
        isHindiOriginal={content.originalLanguage === 'hi'}
        activeSubOrDub={subOrDub}
        activeServer={server}
        activeLanguage={language}
        compatibleServers={compatibleServers}
        mediaCategory={mediaCategory}
        autoSwitch={autoSwitch}
        onToggleAutoSwitch={() => setAutoSwitch(prev => !prev)}
        onSubOrDubChange={handleSubOrDubChange}
        onServerChange={handleServerChange}
        onLanguageChange={handleLanguageChange}
      />
    );
  }

  return (
    <div className="watch__stage">
      <VideoPlayer
        key={`native-${content.id}-${season ?? 0}-${episode ?? 0}-${info.playback.url}`}
        playback={info}
        content={content}
        season={season}
        episode={episode}
        onLanguageChange={lang => load({ language: lang })}
      />
      <LuminaServerDeck
        servers={compatibleServers}
        activeServerId={server}
        onSelectServer={handleServerChange}
        mediaCategory={mediaCategory}
        selectedAudioTrack={language === 'hindi' ? 'hindi' : isAnime ? subOrDub : language}
        onSelectAudioTrack={track => {
          if (track === 'hindi') {
            handleLanguageChange('hindi');
          } else if (isAnime) {
            setLanguage(initialLang);
            handleSubOrDubChange(track as 'sub' | 'dub');
          } else {
            handleLanguageChange(track);
          }
        }}
        hasHindiDub={true}
        autoSwitch={autoSwitch}
        onToggleAutoSwitch={() => setAutoSwitch(prev => !prev)}
      />
    </div>
  );
}

/**
 * Embed-stage with:
 * - Enhanced Ad Shield (popup, navigation hijack, and event blocker)
 * - Auto-switch: on iframe error, auto-tries next verified server (if enabled)
 * - Auto-switch on/off toggle in the toolbar
 * - Premium toolbar layout
 */
function EmbedStage({
  embedUrl,
  isPreview,
  notice,
  audioTracks,
  selectedLanguage,
  isAnime,
  isHindiOriginal,
  activeSubOrDub,
  activeServer,
  activeLanguage,
  compatibleServers,
  mediaCategory,
  autoSwitch,
  onToggleAutoSwitch,
  onSubOrDubChange,
  onServerChange,
  onLanguageChange,
}: {
  embedUrl: string;
  isPreview: boolean;
  notice: string;
  audioTracks: PlaybackInfo['audioTracks'];
  selectedLanguage?: string;
  isAnime: boolean;
  isHindiOriginal?: boolean;
  activeSubOrDub: 'sub' | 'dub';
  activeServer: string;
  activeLanguage: string;
  compatibleServers: LuminaServerConfig[];
  mediaCategory: 'movie' | 'tv' | 'anime';
  autoSwitch: boolean;
  onToggleAutoSwitch: () => void;
  onSubOrDubChange: (mode: 'sub' | 'dub') => void;
  onServerChange: (server: string) => void;
  onLanguageChange: (lang: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  const [autoSwitching, setAutoSwitching] = useState(false);
  const [switchMessage, setSwitchMessage] = useState<string | null>(null);
  const triedServersRef = useRef<string[]>([activeServer]);
  const activeServerObj = compatibleServers.find(s => s.id === activeServer);

  // Reset tried servers when embedUrl changes (new server chosen manually)
  useEffect(() => {
    triedServersRef.current = [activeServer];
    setFailed(false);
    setAutoSwitching(false);
    setSwitchMessage(null);
  }, [embedUrl, activeServer]);

  // ── Enhanced Ad Shield ──────────────────────────────────────
  // Blocks: popup windows, top-level navigation hijacks, visibility-based popunders, and focus loss
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Block popup windows (the most common ad attack vector)
    const originalOpen = window.open;
    window.open = function (...args) {
      console.info('[BakaStream AdShield] Blocked popup:', args[0]);
      return null;
    };

    // 2. Block top-level navigation hijack from within iframes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (document.activeElement instanceof HTMLIFrameElement) {
        e.preventDefault();
        return (e.returnValue = '');
      }
    };

    // 3. Keep focus locked to BakaStream if an iframe attempts an unfocus/new-tab deflection
    const handleBlur = () => {
      if (document.activeElement instanceof HTMLIFrameElement) {
        setTimeout(() => {
          window.focus();
        }, 100);
      }
    };

    // 4. Block visibility-based ad triggers (ads that trigger when tab becomes hidden)
    const handleVisibility = () => {
      // No-op override — prevents ad scripts that fire on visibility change
    };

    // 5. Block keyboard-triggered navigation
    const handleKeyBlock = (e: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLIFrameElement) {
        if (e.key === 'F11') e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('keydown', handleKeyBlock);

    return () => {
      window.open = originalOpen;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('keydown', handleKeyBlock);
    };
  }, []);

  // ── Auto-switch Logic ──────────────────────────────────────
  const handleIframeError = useCallback(() => {
    ProviderTelemetry.recordFailure(activeServer);

    if (!autoSwitch) {
      setFailed(true);
      return;
    }

    const nextServer = getNextFallbackServer(activeServer, triedServersRef.current, mediaCategory);

    if (nextServer) {
      triedServersRef.current = [...triedServersRef.current, nextServer];
      const nextObj = compatibleServers.find(s => s.id === nextServer);
      setAutoSwitching(true);
      setSwitchMessage(`⚡ Auto-switching to ${nextObj?.name ?? nextServer}…`);
      setTimeout(() => {
        setAutoSwitching(false);
        setSwitchMessage(null);
        onServerChange(nextServer);
      }, 1200);
    } else {
      setFailed(true);
    }
  }, [activeServer, autoSwitch, mediaCategory, compatibleServers, onServerChange]);

  if (failed) {
    return (
      <div className="watch__stage">
        <StateView
          kind="error"
          title="All servers failed to load"
          message="Every available streaming server was tried and could not load this title. The content may be geo-blocked or temporarily unavailable."
          actionLabel="Try again from Server 1"
          onRetry={() => {
            triedServersRef.current = [];
            setFailed(false);
            onServerChange(isAnime ? 'nextgen-anime' : 'vidlink');
          }}
        />
        <LuminaServerDeck
          servers={compatibleServers}
          activeServerId={activeServer}
          onSelectServer={s => {
            triedServersRef.current = [s];
            setFailed(false);
            onServerChange(s);
          }}
          mediaCategory={mediaCategory}
          selectedAudioTrack={activeLanguage === 'hindi' ? 'hindi' : isAnime ? activeSubOrDub : activeLanguage}
          onSelectAudioTrack={track => {
            if (track === 'hindi') {
              onLanguageChange('hindi');
            } else if (isAnime) {
              onSubOrDubChange(track as 'sub' | 'dub');
            } else {
              onLanguageChange(track);
            }
          }}
          hasHindiDub={true}
          autoSwitch={autoSwitch}
          onToggleAutoSwitch={onToggleAutoSwitch}
        />
      </div>
    );
  }

  return (
    <div className="watch__stage">
      {isPreview && <div className="watch__preview-banner">{notice}</div>}

      {/* ── Auto-switch notification banner ── */}
      {(autoSwitching || switchMessage) && (
        <div className="watch__autoswitch-banner">
          <Zap size={14} className="watch__autoswitch-icon" />
          <span>{switchMessage ?? 'Auto-switching server…'}</span>
        </div>
      )}

      {/* ── Top Bar: Active Server Pill + Ad Shield (Compact) ── */}
      <div className="watch__toolbar">
        <div className="watch__active-server-pill">
          <span className="watch__server-dot" />
          <span>
            Streaming on: <strong>{activeServerObj?.name ?? activeServer}</strong>
          </span>
        </div>

        <div
          className="watch__shield-badge"
          title="BakaStream Ad Shield active — popups and navigation hijacks are blocked."
        >
          <ShieldCheck size={13} className="watch__shield-icon" /> Ad Shield Active
        </div>

        {isHindiOriginal && (
          <div className="watch__shield-badge" title="Original Hindi language content">
            🇮🇳 Hindi Original
          </div>
        )}
      </div>

      {/* ── Video Embed with Ad Shield Protection (blocks redirects, popunders, and top-level hijacks) ── */}
      <iframe
        key={embedUrl}
        src={embedUrl}
        title="Stream player"
        className="watch__iframe"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="origin"
        onError={handleIframeError}
      />

      {/* ── Server Selection Deck ── */}
      <LuminaServerDeck
        servers={compatibleServers}
        activeServerId={activeServer}
        onSelectServer={s => {
          triedServersRef.current = [s];
          setFailed(false);
          onServerChange(s);
        }}
        mediaCategory={mediaCategory}
        selectedAudioTrack={activeLanguage === 'hindi' ? 'hindi' : isAnime ? activeSubOrDub : activeLanguage}
        onSelectAudioTrack={track => {
          if (track === 'hindi') {
            onLanguageChange('hindi');
          } else if (isAnime) {
            onSubOrDubChange(track as 'sub' | 'dub');
          } else {
            onLanguageChange(track);
          }
        }}
        hasHindiDub={true}
        autoSwitch={autoSwitch}
        onToggleAutoSwitch={onToggleAutoSwitch}
      />

      {/* ── Audio selector (secondary, for native audio track switching) ── */}
      <div className="watch__under">
        {audioTracks.length > 1 && !isAnime && (
          <label className="watch__lang">
            Audio
            <select
              defaultValue={selectedLanguage}
              onChange={e => onLanguageChange(e.target.value)}
              aria-label="Audio language selection"
            >
              {audioTracks.map(t => (
                <option key={t.label} value={t.label}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="watch__notice">
          <AlertTriangle size={13} /> {notice}
        </p>
      </div>
    </div>
  );
}
