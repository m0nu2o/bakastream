'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Server, ShieldCheck, Volume2 } from 'lucide-react';
import VideoPlayer from '@/components/player/VideoPlayer';
import StateView from '@/components/StateView';
import { resolveStream } from '@/lib/tmdb/client';
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
  const [server, setServer] = useState<string>('nova');
  const [language, setLanguage] = useState<string>(initialLang);

  const requestedLang = useRef<string | undefined>(undefined);
  const isAnime = Boolean(content.genreIds?.includes(16) || info?.isAnime);

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
    [content.type, content.id, content.title, content.genreIds, content.originalLanguage, content.imdbId, season, episode, subOrDub, server]
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
            'No configured provider could supply playback for this title. This is expected until a stream provider is configured — see the README.'
          }
          actionLabel="Back to home"
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
        onSubOrDubChange={handleSubOrDubChange}
        onServerChange={handleServerChange}
        onLanguageChange={handleLanguageChange}
      />
    );
  }

  return (
    <VideoPlayer
      key={`native-${content.id}-${season ?? 0}-${episode ?? 0}-${info.playback.url}`}
      playback={info}
      content={content}
      season={season}
      episode={episode}
      onLanguageChange={lang => load({ language: lang })}
    />
  );
}

/**
 * Provider-iframe playback with Sub/Dub controls, alternate server selection,
 * and parent-level Ad Shield protection (without using iframe sandbox).
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
  onSubOrDubChange: (mode: 'sub' | 'dub') => void;
  onServerChange: (server: string) => void;
  onLanguageChange: (lang: string) => void;
}) {
  const [failed, setFailed] = useState(false);

  // Parent-level Ad Shield: Blocks frame-busting, top window hijack, and popups WITHOUT sandbox attribute
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Intercept popup attempts on the parent window
    const originalOpen = window.open;
    window.open = function (...args) {
      console.info('[BakaStream Ad Shield] Intercepted popup window:', args[0]);
      return null;
    };

    // 2. Prevent top-level window navigation hijack (frame-busting)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (document.activeElement instanceof HTMLIFrameElement) {
        e.preventDefault();
        return (e.returnValue = '');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.open = originalOpen;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  if (failed) {
    return (
      <div className="watch__stage">
        <StateView
          kind="error"
          title="The provider player did not load"
          message="The third-party player could not be displayed — it may be offline, blocked, or refusing to be embedded."
          actionLabel="Try again"
          onRetry={() => setFailed(false)}
        />
      </div>
    );
  }

  return (
    <div className="watch__stage">
      {isPreview && <div className="watch__preview-banner">{notice}</div>}

      {/* Top Controls Bar: Sub/Dub or Hindi Dubbed & Server Selection */}
      <div className="watch__toolbar">
        {isAnime ? (
          <div className="watch__audio-toggle" role="group" aria-label="Anime Audio Selection">
            <span className="watch__toggle-label">
              <Volume2 size={15} /> Audio:
            </span>
            <button
              type="button"
              className={`watch__toggle-btn ${activeSubOrDub === 'sub' ? 'watch__toggle-btn--active' : ''}`}
              onClick={() => onSubOrDubChange('sub')}
              aria-pressed={activeSubOrDub === 'sub'}
            >
              🇯🇵 SUB
            </button>
            <button
              type="button"
              className={`watch__toggle-btn ${activeSubOrDub === 'dub' ? 'watch__toggle-btn--active' : ''}`}
              onClick={() => onSubOrDubChange('dub')}
              aria-pressed={activeSubOrDub === 'dub'}
            >
              🎙️ DUB
            </button>
          </div>
        ) : (
          <div className="watch__audio-toggle" role="group" aria-label="Audio Language Selection">
            <span className="watch__toggle-label">
              <Volume2 size={15} /> Audio:
            </span>
            {isHindiOriginal ? (
              <>
                <button
                  type="button"
                  className={`watch__toggle-btn ${activeLanguage === 'hindi' ? 'watch__toggle-btn--active' : ''}`}
                  onClick={() => onLanguageChange('hindi')}
                  aria-pressed={activeLanguage === 'hindi'}
                >
                  🇮🇳 Hindi (Original)
                </button>
                <button
                  type="button"
                  className={`watch__toggle-btn ${activeLanguage !== 'hindi' ? 'watch__toggle-btn--active' : ''}`}
                  onClick={() => onLanguageChange('english')}
                  aria-pressed={activeLanguage !== 'hindi'}
                >
                  🌐 English / Multi-Audio
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`watch__toggle-btn ${activeLanguage !== 'hindi' ? 'watch__toggle-btn--active' : ''}`}
                  onClick={() => onLanguageChange('english')}
                  aria-pressed={activeLanguage !== 'hindi'}
                >
                  🌐 Original / Multi-Audio
                </button>
                <button
                  type="button"
                  className={`watch__toggle-btn ${activeLanguage === 'hindi' ? 'watch__toggle-btn--active' : ''}`}
                  onClick={() => onLanguageChange('hindi')}
                  aria-pressed={activeLanguage === 'hindi'}
                >
                  🇮🇳 Hindi Dubbed
                </button>
              </>
            )}
          </div>
        )}

        <div className="watch__toolbar-right">
          <label className="watch__server-select">
            <Server size={14} /> Server:
            <select
              value={activeServer}
              onChange={e => onServerChange(e.target.value)}
              aria-label="Streaming Server"
            >
              <option value="nova">NovaAPI (Direct Multi-Audio)</option>
              <option value="vidlink">VidLink Pro (Default HD)</option>
              <option value="2embed">2Embed HD (Backup Server)</option>
              <option value="autoembed">AutoEmbed (Alt Server 1)</option>
              <option value="smashy">SmashyStream (Alt Server 2)</option>
            </select>
          </label>

          <div
            className="watch__shield-badge"
            title="BakaStream Ad Shield active: redirects and parent popups are blocked without breaking video decoders."
          >
            <ShieldCheck size={14} className="watch__shield-icon" /> Ad Shield Active
          </div>
        </div>
      </div>

      {/* Responsive Video Embed (NO sandbox used, preserving 100% video playback compatibility) */}
      <iframe
        key={embedUrl}
        src={embedUrl}
        title="Stream player"
        className="watch__iframe"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="origin"
        onError={() => setFailed(true)}
      />

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
