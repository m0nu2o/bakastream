'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  Zap,
  Minimize,
  RotateCcw,
  Smartphone,
} from 'lucide-react';
import VideoPlayer from '@/components/player/VideoPlayer';
import LuminaServerDeck, { type AudioLanguageOption } from '@/components/player/LuminaServerDeck';
import StateView from '@/components/StateView';
import { resolveStream } from '@/lib/tmdb/client';
import {
  extractDirectStreams,
  type DirectLanguageOption,
  type DirectStreamOption,
} from '@/lib/player/directExtractor';
import { normalizeLanguage } from '@/lib/languages';
import {
  getLuminaServers,
  getNextFallbackServer,
  ProviderTelemetry,
  type LuminaServerConfig,
} from '@/lib/providers/lumina';
import type { PlaybackInfo, SubtitleTrack } from '@/lib/providers/types';
import type { MediaSummary } from '@/types';
import './watch.css';

interface Props {
  content: MediaSummary;
  season?: number;
  episode?: number;
  prevEpisodeHref?: string | null;
  nextEpisodeHref?: string | null;
}

const DIRECT_PLAYER_SERVERS = new Set(['nova', 'nova-anime', 'vidrock', 'vidrock-anime']);

interface DirectDiscoveryState {
  streams: DirectStreamOption[];
  availableLanguages: DirectLanguageOption[];
  subtitles: SubtitleTrack[];
  done: boolean;
}

export default function WatchClient({
  content,
  season,
  episode,
  prevEpisodeHref,
  nextEpisodeHref,
}: Props) {
  const isAnimeGenre = Boolean(content.genreIds?.includes(16));
  const initialLang = content.originalLanguage === 'hi' ? 'hindi' : 'english';

  const [info, setInfo] = useState<PlaybackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subOrDub, setSubOrDub] = useState<'sub' | 'dub'>('sub');
  const [server, setServer] = useState<string>(isAnimeGenre ? 'nova-anime' : 'nova');
  const [language, setLanguage] = useState<string>(initialLang);
  const [autoSwitch, setAutoSwitch] = useState<boolean>(true);
  const [switchBanner, setSwitchBanner] = useState<string | null>(null);

  const [directDiscovery, setDirectDiscovery] = useState<DirectDiscoveryState>({
    streams: [],
    availableLanguages: [],
    subtitles: [],
    done: false,
  });
  const [activeDirectStream, setActiveDirectStream] = useState<DirectStreamOption | null>(null);

  const requestedLang = useRef<string | undefined>(undefined);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnime = Boolean(isAnimeGenre || info?.isAnime);
  const mediaCategory = isAnime ? 'anime' : (content.type as 'movie' | 'tv');
  const isHindiOriginal = content.originalLanguage === 'hi';

  const compatibleServers = useMemo(() => {
    return getLuminaServers(mediaCategory, isHindiOriginal);
  }, [mediaCategory, isHindiOriginal]);

  const showSmartBanner = useCallback((msg: string) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setSwitchBanner(msg);
    bannerTimerRef.current = setTimeout(() => {
      setSwitchBanner(null);
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

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

  const findBestDirectStream = useCallback(
    (streams: DirectStreamOption[], langKey?: string, mode?: 'sub' | 'dub') => {
      if (streams.length === 0) return null;
      const needle = langKey?.trim().toLowerCase();
      if (needle) {
        const directMatch = streams.find(
          s => s.langKey === needle || s.language.toLowerCase().includes(needle)
        );
        if (directMatch) return directMatch;
      }
      if (mode === 'dub') {
        const dubMatch = streams.find(s => s.langKey === 'english');
        if (dubMatch) return dubMatch;
      }
      if (mode === 'sub') {
        const subMatch = streams.find(s => s.langKey === 'japanese');
        if (subMatch) return subMatch;
      }
      return streams[0];
    },
    []
  );

  const load = useCallback(
    async (options?: {
      language?: string;
      subOrDub?: 'sub' | 'dub';
      server?: string;
      skipDirectCheck?: boolean;
      reuseDiscovery?: DirectDiscoveryState;
    }) => {
      const nextLang =
        options?.language ??
        requestedLang.current ??
        (content.originalLanguage === 'hi' ? 'hindi' : undefined);
      const nextSubOrDub = options?.subOrDub ?? subOrDub;
      let nextServer = options?.server ?? server;
      const runDirectDiscovery = !options?.skipDirectCheck && !options?.reuseDiscovery?.done;

      setLoading(true);
      setError(null);
      try {
        const [initialInfo, discovered] = await Promise.all([
          resolveStream({
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
          }),
          runDirectDiscovery
            ? extractDirectStreams({
                type: content.type,
                id: content.id,
                season,
                episode,
                preferredLanguage: nextLang,
                subOrDub: nextSubOrDub,
              })
                .then(res => ({ ...res, done: true }))
                .catch(() => ({
                  streams: [],
                  availableLanguages: [],
                  subtitles: [],
                  done: true,
                }))
            : Promise.resolve(options?.reuseDiscovery ?? directDiscovery),
        ]);

        if (runDirectDiscovery) {
          setDirectDiscovery(discovered);
        }

        let finalInfo = initialInfo;
        const hasDirect = discovered.streams.length > 0;
        const isDirectSelected = DIRECT_PLAYER_SERVERS.has(nextServer);

        if (hasDirect && !options?.skipDirectCheck) {
          const picked = findBestDirectStream(discovered.streams, nextLang, nextSubOrDub);
          if (picked) {
            setActiveDirectStream(picked);
            setLanguage(picked.langKey);
            if (!isDirectSelected && autoSwitch && nextLang && picked.langKey === nextLang.toLowerCase()) {
              const targetDirectId = isAnimeGenre ? 'nova-anime' : 'nova';
              const targetName =
                compatibleServers.find(s => s.id === targetDirectId)?.name ?? 'NovaAPI Pro';
              nextServer = targetDirectId;
              showSmartBanner(`⚡ Switched to ${targetName} — ${picked.language} audio verified`);
            }
          } else {
            setActiveDirectStream(null);
          }
        } else if (!hasDirect && isDirectSelected && finalInfo?.playback?.kind !== 'native') {
          setActiveDirectStream(null);
          // Intelligent auto-switch: if direct server has zero playable streams for this title,
          // advance cleanly to the first working backup server instead of mislabeling the deck.
          if (autoSwitch && finalInfo) {
            const fallbackServerId = isAnimeGenre ? 'vidlink-anime' : 'vidsrc-pm';
            const fallbackObj = compatibleServers.find(s => s.id === fallbackServerId);
            const fallbackInfo = await resolveStream({
              type: content.type,
              id: content.id,
              imdbId: content.imdbId ?? undefined,
              season,
              episode,
              title: content.title,
              isAnime: content.genreIds?.includes(16),
              subOrDub: nextSubOrDub,
              server: fallbackServerId,
              language: nextLang,
            }).catch(() => null);

            if (fallbackInfo && fallbackInfo.status === 'ok') {
              finalInfo = fallbackInfo;
              nextServer = fallbackServerId;
              const prevName =
                compatibleServers.find(s => s.id === (options?.server ?? server))?.name ?? 'Direct';
              showSmartBanner(
                `⚡ ${prevName} unavailable for this title — switched to ${fallbackObj?.name ?? fallbackServerId}`
              );
            }
          }
        } else if (!isDirectSelected) {
          setActiveDirectStream(null);
        }

        setInfo(finalInfo);
        setServer(finalInfo?.server || nextServer);
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
      directDiscovery,
      findBestDirectStream,
      autoSwitch,
      isAnimeGenre,
      compatibleServers,
      showSmartBanner,
    ]
  );

  useEffect(() => {
    setDirectDiscovery({ streams: [], availableLanguages: [], subtitles: [], done: false });
    setActiveDirectStream(null);
    load({
      reuseDiscovery: undefined,
      skipDirectCheck: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolve once per title/episode
  }, [content.id, content.type, season, episode]);

  // Build ONLY verified playable audio options from live stream discovery & supported engines
  const audioOptions: AudioLanguageOption[] = useMemo(() => {
    const directServerId = DIRECT_PLAYER_SERVERS.has(server)
      ? server
      : isAnime
        ? 'nova-anime'
        : 'nova';

    const opts: AudioLanguageOption[] = directDiscovery.availableLanguages.map(lang => ({
      key: lang.key,
      label: lang.label,
      nativeLabel: lang.nativeLabel,
      flag: lang.flag,
      sourceNote: `${lang.mirrorCount} HD ${lang.mirrorCount === 1 ? 'mirror' : 'mirrors'}`,
      targetServerId: directServerId,
      isDirectVerified: true,
    }));

    const hasKey = (k: string) => opts.some(o => o.key === k);

    if (isAnime) {
      if (!hasKey('japanese')) {
        opts.push({
          key: 'sub',
          label: 'Japanese (SUB)',
          nativeLabel: '日本語',
          flag: '🇯🇵',
          sourceNote: 'VidLink Anime',
          targetServerId: 'vidlink-anime',
        });
      }
      if (!hasKey('english')) {
        opts.push({
          key: 'dub',
          label: 'English (DUB)',
          nativeLabel: 'English',
          flag: '🇺🇸',
          sourceNote: 'VidLink Anime',
          targetServerId: 'vidlink-anime',
        });
      }
      return opts;
    }

    // If backend NovaAPI returned real audio tracks (when no direct VidRock stream existed)
    if (opts.length === 0 && info?.providerId === 'nova' && info.audioTracks.length > 0) {
      for (const track of info.audioTracks) {
        const norm = normalizeLanguage(track.label);
        const key = (norm?.label || track.label).toLowerCase();
        if (!hasKey(key)) {
          opts.push({
            key,
            label: norm?.label || track.label,
            nativeLabel: norm?.nativeLabel,
            flag: norm?.flag === '🌐' && norm.code === 'en' ? '🇺🇸' : (norm?.flag ?? '🌐'),
            sourceNote: 'NovaAPI Track',
            targetServerId: server,
          });
        }
      }
    }

    // Honest single fallback: TMDB original language via embed player only when no direct stream verified it
    if (opts.length === 0) {
      const orig = normalizeLanguage(content.originalLanguage);
      const fallbackFlag = orig?.flag === '🌐' && orig.code === 'en' ? '🇺🇸' : (orig?.flag ?? '🌐');
      const activeName = compatibleServers.find(s => s.id === server)?.name ?? 'Embed Player';
      opts.push({
        key: 'original',
        label: orig ? `${orig.label} (Original)` : 'Original / Multi-Audio',
        nativeLabel: orig?.nativeLabel,
        flag: fallbackFlag,
        sourceNote: activeName,
        targetServerId: server,
      });
    }

    return opts;
  }, [
    directDiscovery.availableLanguages,
    server,
    isAnime,
    info,
    content.originalLanguage,
    compatibleServers,
  ]);

  const effectiveSelectedAudioKey = useMemo(() => {
    if (activeDirectStream) return activeDirectStream.langKey;
    if (isAnime && subOrDub === 'dub' && audioOptions.some(o => o.key === 'dub')) return 'dub';
    if (isAnime && subOrDub === 'sub' && audioOptions.some(o => o.key === 'sub')) return 'sub';
    if (audioOptions.some(o => o.key === language)) return language;
    return audioOptions[0]?.key ?? 'original';
  }, [activeDirectStream, isAnime, subOrDub, audioOptions, language]);

  const handleServerChange = useCallback(
    (newServer: string) => {
      setSwitchBanner(null);
      setServer(newServer);

      if (DIRECT_PLAYER_SERVERS.has(newServer) && directDiscovery.streams.length > 0) {
        const matched = findBestDirectStream(directDiscovery.streams, language, subOrDub);
        if (matched) {
          setActiveDirectStream(matched);
          setLanguage(matched.langKey);
          return;
        }
      }

      load({
        server: newServer,
        skipDirectCheck: !DIRECT_PLAYER_SERVERS.has(newServer),
        reuseDiscovery: directDiscovery.done ? directDiscovery : undefined,
      });
    },
    [directDiscovery, findBestDirectStream, language, load, subOrDub]
  );

  const handleSelectAudioOption = useCallback(
    (option: AudioLanguageOption) => {
      setLanguage(option.key);
      requestedLang.current = option.key;

      // 1. Verified direct stream available for this language -> play in fast cinema player,
      // auto-switching server if currently on an embed-only server!
      if (option.isDirectVerified && directDiscovery.streams.length > 0) {
        const matched = findBestDirectStream(directDiscovery.streams, option.key, subOrDub);
        if (matched) {
          if (!DIRECT_PLAYER_SERVERS.has(server)) {
            const targetId = option.targetServerId ?? (isAnime ? 'nova-anime' : 'nova');
            const targetName = compatibleServers.find(s => s.id === targetId)?.name ?? 'NovaAPI Pro';
            setServer(targetId);
            showSmartBanner(`⚡ Switched to ${targetName} — ${option.label} audio verified`);
          }
          setActiveDirectStream(matched);
          return;
        }
      }

      // 2. Otherwise switch cleanly to the server capable of playing this track
      const nextMode: 'sub' | 'dub' = option.key === 'dub' ? 'dub' : 'sub';
      if (option.key === 'sub' || option.key === 'dub') {
        setSubOrDub(nextMode);
      }
      setActiveDirectStream(null);

      const targetServer =
        option.targetServerId && option.targetServerId !== server
          ? option.targetServerId
          : DIRECT_PLAYER_SERVERS.has(server)
            ? isAnime
              ? 'vidlink-anime'
              : 'vidsrc-pm'
            : server;

      if (targetServer !== server) {
        const targetName = compatibleServers.find(s => s.id === targetServer)?.name ?? targetServer;
        showSmartBanner(`⚡ Switched to ${targetName} for ${option.label}`);
      }

      setServer(targetServer);
      load({
        server: targetServer,
        subOrDub: option.key === 'sub' || option.key === 'dub' ? nextMode : subOrDub,
        language: option.key,
        skipDirectCheck: true,
        reuseDiscovery: directDiscovery,
      });
    },
    [
      compatibleServers,
      directDiscovery,
      findBestDirectStream,
      isAnime,
      load,
      server,
      showSmartBanner,
      subOrDub,
    ]
  );

  const handleFallbackFromDirectPlayer = useCallback(() => {
    setActiveDirectStream(null);
    const nextFallback = getNextFallbackServer(
      server,
      ['nova', 'nova-anime', 'vidrock', 'vidrock-anime'],
      mediaCategory
    );
    const target = nextFallback ?? (isAnime ? 'vidlink-anime' : 'vidsrc-pm');
    const targetName = compatibleServers.find(s => s.id === target)?.name ?? target;
    setServer(target);
    showSmartBanner(`⚡ Direct stream interrupted — switched to ${targetName}`);
    load({
      server: target,
      skipDirectCheck: true,
      reuseDiscovery: directDiscovery,
    });
  }, [compatibleServers, directDiscovery, isAnime, load, mediaCategory, server, showSmartBanner]);

  if (loading) {
    return (
      <div className="watch__stage watch__stage--loading">
        <Loader2 size={40} className="watch__spinner" />
        <p>Finding verified streams…</p>
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

  if (activeDirectStream) {
    const nativePlayback: PlaybackInfo = {
      ...(info ?? {
        providerId: server,
        providerLabel: compatibleServers.find(s => s.id === server)?.name ?? 'Direct Stream',
        status: 'ok' as const,
        audioTracks: [{ label: activeDirectStream.language, selected: true }],
        subtitles: [],
        notice: 'Instant Direct Stream (0 Ads)',
      }),
      status: 'ok',
      playback: {
        kind: 'native',
        streamType: activeDirectStream.streamType,
        url: activeDirectStream.url,
      },
      subtitles:
        directDiscovery.subtitles.length > 0 ? directDiscovery.subtitles : (info?.subtitles ?? []),
    };
    return (
      <div className="watch__stage">
        <VideoPlayer
          key={`direct-${content.id}-${season ?? 0}-${episode ?? 0}`}
          playback={nativePlayback}
          content={content}
          season={season}
          episode={episode}
          mirrors={directDiscovery.streams}
          onSelectMirror={s => {
            setActiveDirectStream(s);
            setLanguage(s.langKey);
          }}
          audioOptions={audioOptions}
          selectedAudioKey={effectiveSelectedAudioKey}
          onSelectAudioOption={handleSelectAudioOption}
          prevEpisodeHref={prevEpisodeHref}
          nextEpisodeHref={nextEpisodeHref}
          onFallbackToEmbed={handleFallbackFromDirectPlayer}
        />
        <LuminaServerDeck
          servers={compatibleServers}
          activeServerId={server}
          onSelectServer={handleServerChange}
          audioOptions={audioOptions}
          selectedAudioKey={effectiveSelectedAudioKey}
          onSelectAudioOption={handleSelectAudioOption}
          discoveringAudio={!directDiscovery.done}
          autoSwitch={autoSwitch}
          onToggleAutoSwitch={() => setAutoSwitch(prev => !prev)}
          switchBanner={switchBanner}
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
          onRetry={() => handleServerChange(isAnime ? 'vidlink-anime' : 'vidsrc-pm')}
        />
        <LuminaServerDeck
          servers={compatibleServers}
          activeServerId={server}
          onSelectServer={handleServerChange}
          audioOptions={audioOptions}
          selectedAudioKey={effectiveSelectedAudioKey}
          onSelectAudioOption={handleSelectAudioOption}
          discoveringAudio={!directDiscovery.done}
          autoSwitch={autoSwitch}
          onToggleAutoSwitch={() => setAutoSwitch(prev => !prev)}
          switchBanner={switchBanner}
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
        isAnime={isAnime}
        isHindiOriginal={content.originalLanguage === 'hi'}
        activeServer={server}
        compatibleServers={compatibleServers}
        mediaCategory={mediaCategory}
        autoSwitch={autoSwitch}
        onToggleAutoSwitch={() => setAutoSwitch(prev => !prev)}
        onServerChange={handleServerChange}
        audioOptions={audioOptions}
        selectedAudioKey={effectiveSelectedAudioKey}
        onSelectAudioOption={handleSelectAudioOption}
        discoveringAudio={!directDiscovery.done}
        switchBanner={switchBanner}
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
        audioOptions={audioOptions}
        selectedAudioKey={effectiveSelectedAudioKey}
        onSelectAudioOption={handleSelectAudioOption}
        prevEpisodeHref={prevEpisodeHref}
        nextEpisodeHref={nextEpisodeHref}
      />
      <LuminaServerDeck
        servers={compatibleServers}
        activeServerId={server}
        onSelectServer={handleServerChange}
        audioOptions={audioOptions}
        selectedAudioKey={effectiveSelectedAudioKey}
        onSelectAudioOption={handleSelectAudioOption}
        discoveringAudio={!directDiscovery.done}
        autoSwitch={autoSwitch}
        onToggleAutoSwitch={() => setAutoSwitch(prev => !prev)}
        switchBanner={switchBanner}
      />
    </div>
  );
}

/**
 * Embed-stage with strict popup-blocking sandbox protection & intelligent server failover.
 */
function EmbedStage({
  embedUrl,
  isPreview,
  notice,
  isAnime,
  isHindiOriginal,
  activeServer,
  compatibleServers,
  mediaCategory,
  autoSwitch,
  onToggleAutoSwitch,
  onServerChange,
  audioOptions,
  selectedAudioKey,
  onSelectAudioOption,
  discoveringAudio,
  switchBanner,
}: {
  embedUrl: string;
  isPreview: boolean;
  notice: string;
  isAnime: boolean;
  isHindiOriginal?: boolean;
  activeServer: string;
  compatibleServers: LuminaServerConfig[];
  mediaCategory: 'movie' | 'tv' | 'anime';
  autoSwitch: boolean;
  onToggleAutoSwitch: () => void;
  onServerChange: (server: string) => void;
  audioOptions: AudioLanguageOption[];
  selectedAudioKey: string;
  onSelectAudioOption: (option: AudioLanguageOption) => void;
  discoveringAudio: boolean;
  switchBanner: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const [autoSwitching, setAutoSwitching] = useState(false);
  const [switchMessage, setSwitchMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoLandscape, setIsPseudoLandscape] = useState(false);
  const triedServersRef = useRef<string[]>([activeServer]);
  const activeServerObj = compatibleServers.find(s => s.id === activeServer);
  const applySandbox = activeServerObj?.supportsSandbox ?? true;

  const stageRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hud, setHud] = useState<{ text: string; holding?: boolean } | null>(null);
  const hudTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoldingRef = useRef<boolean>(false);
  const holdKeyRef = useRef<string | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHud = useCallback((text: string, duration = 1200, holding = false) => {
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    setHud({ text, holding });
    if (!holding) {
      hudTimeoutRef.current = setTimeout(() => {
        setHud(null);
      }, duration);
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      const fs = Boolean(
        document.fullscreenElement ||
          (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
      );
      setIsFullscreen(fs);
      if (!fs && !isPseudoLandscape) {
        document.body.classList.remove('bakastream-lock-scroll');
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.body.classList.remove('bakastream-lock-scroll');
    };
  }, [isPseudoLandscape]);

  const toggleLandscapeFullscreen = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;

    const currentlyActive = isFullscreen || isPseudoLandscape;

    if (currentlyActive) {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      } else if (
        (document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen
      ) {
        await (document as unknown as { webkitExitFullscreen: () => Promise<void> })
          .webkitExitFullscreen()
          .catch(() => {});
      }
      try {
        if (screen.orientation && 'unlock' in screen.orientation) {
          screen.orientation.unlock();
        }
      } catch {
        // safe ignore
      }
      setIsPseudoLandscape(false);
      setIsFullscreen(false);
      document.body.classList.remove('bakastream-lock-scroll');
      showHud('Exit Fullscreen');
    } else {
      let fsSuccess = false;
      try {
        if (stage.requestFullscreen) {
          await stage.requestFullscreen();
          fsSuccess = true;
        } else if (
          (stage as unknown as { webkitRequestFullscreen?: () => Promise<void> })
            .webkitRequestFullscreen
        ) {
          await (
            stage as unknown as { webkitRequestFullscreen: () => Promise<void> }
          ).webkitRequestFullscreen();
          fsSuccess = true;
        }
      } catch (err) {
        console.warn('Native fullscreen request rejected:', err);
      }

      try {
        const orientation = screen.orientation as unknown as {
          lock?: (o: string) => Promise<void>;
        };
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('landscape').catch(() => {});
        }
      } catch {
        // safe ignore
      }

      const isMobilePortrait =
        typeof window !== 'undefined' &&
        window.innerWidth < window.innerHeight &&
        window.innerWidth <= 768;

      if (!fsSuccess || isMobilePortrait) {
        setIsPseudoLandscape(true);
        document.body.classList.add('bakastream-lock-scroll');
        showHud('Landscape Viewing Mode');
      } else {
        showHud('Landscape Fullscreen');
      }
    }
  }, [isFullscreen, isPseudoLandscape, showHud]);

  const broadcastToIframe = useCallback((command: string, value?: unknown) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;

    const messages = [
      { type: command, value },
      { event: command, value },
      { action: command, value },
      { method: command, arg: value },
      JSON.stringify({ method: command, value }),
      JSON.stringify({ event: command, data: value }),
    ];

    messages.forEach(msg => {
      try {
        iframe.contentWindow?.postMessage(msg, '*');
      } catch {
        // Cross-origin safe
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|SELECT/)) return;
      const key = e.key.toLowerCase();

      if (isHoldingRef.current && holdKeyRef.current === key) {
        if (key === ' ' || key === 'arrowright') {
          e.preventDefault();
        }
        return;
      }

      if (key === ' ' || key === 'k') {
        e.preventDefault();
        holdKeyRef.current = key;

        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
          isHoldingRef.current = true;
          broadcastToIframe('setSpeed', 2);
          broadcastToIframe('speed', 2);
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
          broadcastToIframe('setSpeed', 2);
          broadcastToIframe('speed', 2);
          showHud('▶▶ 2X Speed (Holding)', 0, true);
        }, 220);
        return;
      }

      if (key === 'arrowleft' || key === 'j') {
        e.preventDefault();
        broadcastToIframe('seek', -10);
        broadcastToIframe('seekTo', -10);
        broadcastToIframe('backward', 10);
        showHud('◀◀ -10s Skip');
        return;
      }

      if (key === 'arrowup') {
        e.preventDefault();
        broadcastToIframe('volume', 0.1);
        showHud('🔊 Volume Up');
        return;
      }

      if (key === 'arrowdown') {
        e.preventDefault();
        broadcastToIframe('volume', -0.1);
        showHud('🔉 Volume Down');
        return;
      }

      if (key === 'm') {
        e.preventDefault();
        broadcastToIframe('mute');
        broadcastToIframe('toggleMute');
        showHud('🔇 Mute / Unmute');
        return;
      }

      if (key === 'f') {
        e.preventDefault();
        toggleLandscapeFullscreen();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|SELECT/)) return;
      const key = e.key.toLowerCase();

      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }

      if (holdKeyRef.current === key) {
        if (isHoldingRef.current) {
          isHoldingRef.current = false;
          broadcastToIframe('setSpeed', 1);
          broadcastToIframe('speed', 1);
          showHud('1X Speed', 800, false);
        } else {
          if (key === ' ' || key === 'k') {
            broadcastToIframe('toggle');
            broadcastToIframe('play');
            showHud('⏯ Play / Pause');
          } else if (key === 'arrowright' || key === 'l') {
            broadcastToIframe('seek', 10);
            broadcastToIframe('seekTo', 10);
            broadcastToIframe('forward', 10);
            showHud('▶▶ +10s Skip');
          }
        }
        holdKeyRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    };
  }, [broadcastToIframe, showHud, toggleLandscapeFullscreen]);

  useEffect(() => {
    triedServersRef.current = [activeServer];
    setFailed(false);
    setAutoSwitching(false);
    setSwitchMessage(null);
  }, [embedUrl, activeServer]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalOpen = window.open;
    window.open = function (...args) {
      console.info('[BakaStream AdShield] Blocked popup:', args[0]);
      return null;
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (document.activeElement instanceof HTMLIFrameElement) {
        e.preventDefault();
        return (e.returnValue = '');
      }
    };

    const handleBlur = () => {
      if (document.activeElement instanceof HTMLIFrameElement) {
        setTimeout(() => {
          window.focus();
        }, 100);
      }
    };

    const handleKeyBlock = (e: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLIFrameElement) {
        if (e.key === 'F11') e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyBlock);

    return () => {
      window.open = originalOpen;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyBlock);
    };
  }, []);

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
            onServerChange(isAnime ? 'vidlink-anime' : 'vidsrc-pm');
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
          audioOptions={audioOptions}
          selectedAudioKey={selectedAudioKey}
          onSelectAudioOption={onSelectAudioOption}
          discoveringAudio={discoveringAudio}
          autoSwitch={autoSwitch}
          onToggleAutoSwitch={onToggleAutoSwitch}
          switchBanner={switchBanner}
        />
      </div>
    );
  }

  return (
    <div
      className={`watch__stage ${isFullscreen ? 'watch__stage--fullscreen' : ''} ${isPseudoLandscape ? 'watch__stage--pseudo-landscape' : ''}`}
      ref={stageRef}
    >
      {(isFullscreen || isPseudoLandscape) && (
        <button
          type="button"
          onClick={toggleLandscapeFullscreen}
          className="watch__exit-landscape-btn"
          aria-label="Exit Landscape Mode"
          title="Exit Landscape Mode"
        >
          <RotateCcw size={15} />
          <span>Exit Landscape</span>
        </button>
      )}

      {isPreview && <div className="watch__preview-banner">{notice}</div>}

      {hud && (
        <div className={`player-hud-toast ${hud.holding ? 'player-hud-toast--holding' : ''}`}>
          <span>{hud.text}</span>
        </div>
      )}

      {(autoSwitching || switchMessage) && (
        <div className="watch__autoswitch-banner">
          <Zap size={14} className="watch__autoswitch-icon" />
          <span>{switchMessage ?? 'Auto-switching server…'}</span>
        </div>
      )}

      <div className="watch__toolbar">
        <div className="watch__active-server-pill">
          <span className="watch__server-dot" />
          <span>
            Streaming on: <strong>{activeServerObj?.name ?? activeServer}</strong>
          </span>
        </div>

        {isHindiOriginal && (
          <div className="watch__shield-badge" title="Original Hindi language content">
            🇮🇳 Hindi Original
          </div>
        )}

        <button
          type="button"
          onClick={toggleLandscapeFullscreen}
          className="watch__landscape-btn"
          title="Toggle Landscape & Fullscreen mode"
          aria-label="Toggle Landscape & Fullscreen mode"
        >
          {isFullscreen || isPseudoLandscape ? (
            <>
              <Minimize size={14} className="watch__landscape-icon" />
              <span>Exit Landscape</span>
            </>
          ) : (
            <>
              <Smartphone size={14} className="watch__landscape-icon" />
              <span>Landscape / Fullscreen</span>
            </>
          )}
        </button>
      </div>

      <iframe
        ref={iframeRef}
        key={`${embedUrl}-${applySandbox ? 'sb' : 'nosb'}`}
        src={embedUrl}
        title="Stream player"
        className="watch__iframe"
        sandbox={
          applySandbox
            ? 'allow-scripts allow-same-origin allow-forms allow-presentation allow-downloads'
            : undefined
        }
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="origin"
        onError={handleIframeError}
      />

      <LuminaServerDeck
        servers={compatibleServers}
        activeServerId={activeServer}
        onSelectServer={s => {
          triedServersRef.current = [s];
          setFailed(false);
          onServerChange(s);
        }}
        audioOptions={audioOptions}
        selectedAudioKey={selectedAudioKey}
        onSelectAudioOption={onSelectAudioOption}
        discoveringAudio={discoveringAudio}
        autoSwitch={autoSwitch}
        onToggleAutoSwitch={onToggleAutoSwitch}
        switchBanner={switchBanner}
      />
    </div>
  );
}
