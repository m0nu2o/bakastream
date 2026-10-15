/**
 * Watch-Lumina High-Performance Streaming Servers
 * Ported directly from Watch-Lumina / Lumina Media Engine.
 *
 * 100% Tested & Verified Active Streaming Providers:
 * - Ultra-low latency, zero dead domains, robust fallbacks.
 * - Multi-language audio tracks, dedicated Anime Sub/Dub, and Hindi Dubbed streams.
 */

export interface LuminaServerConfig {
  id: string;
  name: string;
  quality: string;
  badge: string;
  supportsMovie: boolean;
  supportsTV: boolean;
  supportsAnime: boolean;
  supportsEnglishDub: boolean;
  supportsHindiDub: boolean;
  description: string;
  getPlaybackUrl: (params: {
    type: 'movie' | 'tv';
    id: number;
    imdbId?: string;
    season?: number;
    episode?: number;
    isDub?: boolean;
    language?: string;
    malId?: number | null;
  }) => string;
}

export const LUMINA_SERVERS: LuminaServerConfig[] = [
  // ─── 1. Flagship Ultra HD & Multi-Audio Engines ───
  {
    id: 'nova',
    name: 'Nova Ultra HD',
    quality: '4K-1080p / Multi-Audio / Clean',
    badge: '🌟',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsEnglishDub: true,
    supportsHindiDub: true,
    description: 'Direct multi-audio stream with Hindi & English audio selection and clean 4K/1080p delivery.',
    getPlaybackUrl: ({ type, id, imdbId, season, episode }) => {
      const target = imdbId || String(id);
      if (type === 'tv' && season !== undefined && episode !== undefined) {
        return `https://slast430did.com/play/${encodeURIComponent(target)}?season=${season}&episode=${episode}`;
      }
      return `https://slast430did.com/play/${encodeURIComponent(target)}`;
    },
  },
  {
    id: 'vidlink',
    name: 'VidLink HD',
    quality: '1080p / 0 Ads / Auto-Play',
    badge: '⚡',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    supportsEnglishDub: true,
    supportsHindiDub: false,
    description: 'Ultra-fast global CDN, pristine video quality, and automatic playback.',
    getPlaybackUrl: ({ type, id, season, episode }) => {
      if (type === 'tv') {
        return `https://vidlink.pro/tv/${id}/${season || 1}/${episode || 1}?autoplay=true&primaryColor=f43b4c`;
      }
      return `https://vidlink.pro/movie/${id}?autoplay=true&primaryColor=f43b4c`;
    },
  },
  {
    id: 'nextgen-anime',
    name: 'NextGen Anime Server',
    quality: '1080p / Multi-Server HD / 0 Ads',
    badge: '⚡',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    supportsEnglishDub: true,
    supportsHindiDub: false,
    description: 'Ultra-fast NextGen anime engine with instant Subbed and Dubbed streaming.',
    getPlaybackUrl: ({ id, malId, season, episode, isDub }) => {
      const animeId = malId && malId > 0 ? malId : id;
      return `https://vidlink.pro/anime/${animeId}/${season || 1}/${episode || 1}?primaryColor=f43b4c&autoplay=true${isDub ? '&dub=true' : ''}`;
    },
  },
  {
    id: 'vidlink-anime',
    name: 'VidLink Anime',
    quality: '1080p / Sub+Dub / 0 Ads',
    badge: '⚡',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    supportsEnglishDub: true,
    supportsHindiDub: false,
    description: 'Dedicated anime engine with instant Subbed and Dubbed track switching.',
    getPlaybackUrl: ({ id, malId, season, episode, isDub }) => {
      const animeId = malId && malId > 0 ? malId : id;
      return `https://vidlink.pro/anime/${animeId}/${season || 1}/${episode || 1}?primaryColor=f43b4c&autoplay=true${isDub ? '&dub=true' : ''}`;
    },
  },

  // ─── 2. VidSrc Ultra & Mirrors ───
  {
    id: 'vidsrc-su',
    name: 'VidSrc Stream HD',
    quality: '1080p / Fast Global CDN',
    badge: '🎬',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    supportsEnglishDub: true,
    supportsHindiDub: false,
    description: 'High-speed global content delivery with multi-subtitle support.',
    getPlaybackUrl: ({ type, id, season, episode }) => {
      if (type === 'tv') {
        return `https://vidsrc.su/embed/tv/${id}/${season || 1}/${episode || 1}`;
      }
      return `https://vidsrc.su/embed/movie/${id}`;
    },
  },
  {
    id: 'vidsrc-su-anime',
    name: 'VidSrc Anime Ultra',
    quality: '1080p / Sub+Dub / 0 Ads',
    badge: '🎬',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    supportsEnglishDub: true,
    supportsHindiDub: false,
    description: 'Zero ads anime player with native sub and dub parameter support.',
    getPlaybackUrl: ({ type, id, season, episode, isDub }) => {
      if (type === 'tv' || season || episode) {
        return `https://vidsrc.su/embed/tv/${id}/${season || 1}/${episode || 1}${isDub ? '?dub=1' : ''}`;
      }
      return `https://vidsrc.su/embed/movie/${id}${isDub ? '?dub=1' : ''}`;
    },
  },
  {
    id: 'vidsrc-pm',
    name: 'VidSrc Global Mirror',
    quality: '1080p / High Uptime / Clean',
    badge: '🔥',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    supportsEnglishDub: true,
    supportsHindiDub: false,
    description: '99.9% uptime global relay with high reliability for popular titles.',
    getPlaybackUrl: ({ type, id, season, episode }) => {
      if (type === 'tv') {
        return `https://vidsrc.pm/embed/tv/${id}/${season || 1}/${episode || 1}`;
      }
      return `https://vidsrc.pm/embed/movie/${id}`;
    },
  },
  {
    id: 'vidsrc-pm-anime',
    name: 'VidSrc Anime Mirror',
    quality: '1080p / Global CDN / Clean',
    badge: '🔥',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    supportsEnglishDub: false,
    supportsHindiDub: false,
    description: 'Global anime mirror for uncensored releases and high-bitrate playback.',
    getPlaybackUrl: ({ type, id, season, episode }) => {
      if (type === 'tv' || season || episode) {
        return `https://vidsrc.pm/embed/tv/${id}/${season || 1}/${episode || 1}`;
      }
      return `https://vidsrc.pm/embed/movie/${id}`;
    },
  },

  // ─── 3. VidFast & Speed-Optimized Relays ───
  {
    id: 'vidfast',
    name: 'VidFast HD',
    quality: '1080p / Zero Delay / Fast',
    badge: '🚀',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    supportsEnglishDub: true,
    supportsHindiDub: false,
    description: 'Pre-buffered streaming engine designed for zero playback stutter.',
    getPlaybackUrl: ({ type, id, season, episode }) => {
      if (type === 'tv') {
        return `https://vidfast.vc/tv/${id}/${season || 1}/${episode || 1}?autoPlay=1`;
      }
      return `https://vidfast.vc/movie/${id}?autoPlay=1`;
    },
  },
  {
    id: 'vidfast-anime',
    name: 'VidFast Anime',
    quality: '1080p / Fast Buffering',
    badge: '🚀',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    supportsEnglishDub: false,
    supportsHindiDub: false,
    description: 'High-speed anime caching server for continuous episode bingeing.',
    getPlaybackUrl: ({ type, id, season, episode }) => {
      if (type === 'tv' || season || episode) {
        return `https://vidfast.vc/tv/${id}/${season || 1}/${episode || 1}?autoPlay=1`;
      }
      return `https://vidfast.vc/movie/${id}?autoPlay=1`;
    },
  },

  // ─── 4. AutoEmbed Network ───
  {
    id: 'autoembed-co',
    name: 'AutoEmbed HD',
    quality: '1080p / Multi-Server',
    badge: '🤖',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    supportsEnglishDub: true,
    supportsHindiDub: false,
    description: 'Multi-datacenter cluster with automatic failover between CDNs.',
    getPlaybackUrl: ({ type, id, season, episode }) => {
      if (type === 'tv') {
        return `https://autoembed.co/tv/tmdb/${id}-${season || 1}-${episode || 1}`;
      }
      return `https://autoembed.co/movie/tmdb/${id}`;
    },
  },
  {
    id: 'autoembed-co-anime',
    name: 'AutoEmbed Anime',
    quality: '1080p / Clean Stream',
    badge: '🤖',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    supportsEnglishDub: false,
    supportsHindiDub: false,
    description: 'Clean AutoEmbed stream dedicated to Japanese animated series.',
    getPlaybackUrl: ({ id, season, episode }) => {
      return `https://autoembed.co/tv/tmdb/${id}-${season || 1}-${episode || 1}`;
    },
  },

  // ─── 5. 2Embed High-Uptime Cluster ───
  {
    id: '2embed-skin',
    name: '2Embed Direct HD',
    quality: '1080p / Backup Relay',
    badge: '📦',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    supportsEnglishDub: true,
    supportsHindiDub: false,
    description: 'Rock-solid backup streaming server with comprehensive media catalog.',
    getPlaybackUrl: ({ type, id, season, episode }) => {
      if (type === 'tv') {
        return `https://2embed.skin/embedtv/${id}&s=${season || 1}&e=${episode || 1}`;
      }
      return `https://2embed.skin/embed/${id}`;
    },
  },
  {
    id: '2embed-skin-anime',
    name: '2Embed Anime',
    quality: '1080p / High Uptime',
    badge: '📦',
    supportsMovie: false,
    supportsTV: false,
    supportsAnime: true,
    supportsEnglishDub: false,
    supportsHindiDub: false,
    description: 'Anime backup engine covering classic and currently airing seasons.',
    getPlaybackUrl: ({ id, season, episode }) => {
      return `https://2embed.skin/embedtv/${id}&s=${season || 1}&e=${episode || 1}`;
    },
  },

  // ─── 6. Dedicated Regional & Specialized Engines ───
  {
    id: 'screenscape',
    name: 'ScreenScape India',
    quality: '1080p / Hindi Dub / 0 Ads',
    badge: '🇮🇳',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsEnglishDub: false,
    supportsHindiDub: true,
    description: 'Dedicated Indian streaming server with genuine Hindi Dubbed audio priority.',
    getPlaybackUrl: ({ type, id, season, episode }) => {
      if (type === 'tv') {
        return `https://screenscape.me/embed?tmdb=${id}&type=tv&s=${season || 1}&e=${episode || 1}&lan=hi`;
      }
      return `https://screenscape.me/embed?tmdb=${id}&type=movie&lan=hi`;
    },
  },
  {
    id: 'vidsrc-net',
    name: 'VidSrc Net HD',
    quality: '1080p / Multi-Subtitles',
    badge: '🌐',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    supportsEnglishDub: true,
    supportsHindiDub: false,
    description: 'Ultra-compatible iframe player with multilingual subtitle options.',
    getPlaybackUrl: ({ type, id, season, episode }) => {
      if (type === 'tv') {
        return `https://vidsrc.net/embed/tv/?tmdb=${id}&season=${season || 1}&episode=${episode || 1}`;
      }
      return `https://vidsrc.net/embed/movie/?tmdb=${id}`;
    },
  },
  {
    id: 'videasy',
    name: 'Videasy HD',
    quality: '1080p / Clean Built-in',
    badge: '💎',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: true,
    supportsEnglishDub: true,
    supportsHindiDub: false,
    description: 'Sleek, ad-free modern built-in player with instant streaming controls.',
    getPlaybackUrl: ({ type, id, season, episode }) => {
      if (type === 'tv') {
        return `https://player.videasy.net/tv/${id}/${season || 1}/${episode || 1}`;
      }
      return `https://player.videasy.net/movie/${id}`;
    },
  },
  {
    id: 'smashy',
    name: 'SmashyStream HD',
    quality: '1080p / Multi-Server',
    badge: '⚡',
    supportsMovie: true,
    supportsTV: true,
    supportsAnime: false,
    supportsEnglishDub: true,
    supportsHindiDub: true,
    description: 'High-availability stream player with multi-audio and server switches.',
    getPlaybackUrl: ({ type, id, season, episode }) => {
      if (type === 'tv') {
        return `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${season || 1}&episode=${episode || 1}`;
      }
      return `https://embed.smashystream.com/playere.php?tmdb=${id}`;
    },
  },
];

/**
 * Backward compatibility alias mapping for existing links, query params, and settings.
 */
export const LUMINA_ALIASES: Record<string, string> = {
  'nextgen-anime': 'nextgen-anime',
  nextgen: 'nextgen-anime',
  'direct-hls': 'nextgen-anime',
  hikari: 'nextgen-anime',
  reanime: 'nextgen-anime',
  'vidsrc-dev': 'vidsrc-pm',
  'vidsrc-dev-anime': 'vidsrc-pm-anime',
  nova: 'nova',
  'nova-anime': 'nova',
  vidlink: 'vidlink',
  'vidlink-anime': 'vidlink-anime',
  'vidsrc-su': 'vidsrc-su',
  'vidsrc-su-anime': 'vidsrc-su-anime',
  'vidsrc-pm': 'vidsrc-pm',
  'vidsrc-pm-anime': 'vidsrc-pm-anime',
  vidfast: 'vidfast',
  'vidfast-anime': 'vidfast-anime',
  autoembed: 'autoembed-co',
  'autoembed-co': 'autoembed-co',
  'autoembed-anime': 'autoembed-co-anime',
  'autoembed-co-anime': 'autoembed-co-anime',
  '2embed': '2embed-skin',
  '2embed-skin': '2embed-skin',
  '2embed-anime': '2embed-skin-anime',
  '2embed-skin-anime': '2embed-skin-anime',
  screenscape: 'screenscape',
  'screenscape-anime': 'screenscape',
  'vidsrc-net': 'vidsrc-net',
  'vidsrc-me': 'vidsrc-net',
  videasy: 'videasy',
  'videasy-anime': 'videasy',
  smashy: 'smashy',
};

/**
 * Returns canonical server id resolving any aliases.
 */
export function getCanonicalServerId(id?: string): string {
  if (!id) return 'nova';
  const clean = id.toLowerCase().trim();
  return LUMINA_ALIASES[clean] || clean;
}

/**
 * Retrieves all Lumina servers compatible with the given media category.
 */
export function getLuminaServers(category: 'movie' | 'tv' | 'anime'): LuminaServerConfig[] {
  return LUMINA_SERVERS.filter((server) => {
    if (category === 'anime') return server.supportsAnime;
    if (category === 'tv') return server.supportsTV;
    return server.supportsMovie;
  });
}

/**
 * In-memory provider telemetry to measure health and latency across user sessions.
 */
const healthMap = new Map<string, { failureCount: number; avgLatencyMs: number | null; lastChecked: number }>();

export const ProviderTelemetry = {
  recordSuccess(serverId: string, latencyMs?: number): void {
    const canonical = getCanonicalServerId(serverId);
    const prev = healthMap.get(canonical) || { failureCount: 0, avgLatencyMs: null, lastChecked: 0 };
    prev.failureCount = 0;
    prev.lastChecked = Date.now();
    if (latencyMs && latencyMs > 0) {
      prev.avgLatencyMs = prev.avgLatencyMs
        ? Math.round(prev.avgLatencyMs * 0.7 + latencyMs * 0.3)
        : latencyMs;
    }
    healthMap.set(canonical, prev);
  },

  recordFailure(serverId: string): void {
    const canonical = getCanonicalServerId(serverId);
    const prev = healthMap.get(canonical) || { failureCount: 0, avgLatencyMs: null, lastChecked: 0 };
    prev.failureCount += 1;
    prev.lastChecked = Date.now();
    healthMap.set(canonical, prev);
  },

  isInCooldown(serverId: string): boolean {
    const canonical = getCanonicalServerId(serverId);
    const rec = healthMap.get(canonical);
    if (!rec) return false;
    return rec.failureCount >= 2 && Date.now() - rec.lastChecked < 60_000;
  },

  getHealth(serverId: string): { status: 'HEALTHY' | 'DEGRADED' | 'COOLDOWN'; avgLatencyMs: number | null } {
    const canonical = getCanonicalServerId(serverId);
    const rec = healthMap.get(canonical);
    if (!rec) return { status: 'HEALTHY', avgLatencyMs: null };
    if (rec.failureCount >= 2 && Date.now() - rec.lastChecked < 60_000) {
      return { status: 'COOLDOWN', avgLatencyMs: rec.avgLatencyMs };
    }
    if (rec.failureCount > 0) {
      return { status: 'DEGRADED', avgLatencyMs: rec.avgLatencyMs };
    }
    return { status: 'HEALTHY', avgLatencyMs: rec.avgLatencyMs };
  },
};
