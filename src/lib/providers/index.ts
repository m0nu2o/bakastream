/**
 * Stream provider registry.
 *
 * Integrates all verified Watch-Lumina streaming servers with high-uptime fallbacks,
 * multi-audio switching, dedicated Anime Sub/Dub engines, and Indian regional content.
 */

import type { PlaybackInfo, ResolveRequest, StreamProvider } from './types';
import { NovaProvider } from './nova';
import { VidLinkProvider } from './vidlink';
import { TwoEmbedProvider } from './2embed';
import { DemoPreviewProvider } from './demo';
import {
  LUMINA_SERVERS,
  getCanonicalServerId,
  ProviderTelemetry,
  type LuminaServerConfig,
} from './lumina';
import { getMalIdForAnime } from './mal';

const legacyProviders: StreamProvider[] = [
  new NovaProvider(),
  new VidLinkProvider(),
  new TwoEmbedProvider(),
  new DemoPreviewProvider(),
];

export function listProviders(): StreamProvider[] {
  return legacyProviders;
}

export function getConfiguredProviders(): StreamProvider[] {
  return legacyProviders.filter(p => p.enabled);
}

/**
 * Resolve playback for a request using the full suite of Watch-Lumina servers.
 */
export async function resolveStream(req: ResolveRequest): Promise<PlaybackInfo> {
  const isAnime = Boolean(req.isAnime);
  const isTV = req.type === 'tv';
  const season = req.season ?? 1;
  const episode = req.episode ?? 1;
  const isHindi = req.language?.trim().toLowerCase() === 'hindi';
  const isDub = req.subOrDub === 'dub';

  // Determine canonical requested server (or intelligent default)
  let requestedServerId = req.server ? getCanonicalServerId(req.server) : null;

  if (!requestedServerId) {
    if (isAnime) {
      requestedServerId = 'nextgen-anime';
    } else {
      requestedServerId = 'vidlink';
    }
  }

  // 1. If Nova is explicitly requested, attempt NovaAPI direct resolution first
  if (requestedServerId === 'nova' || requestedServerId === 'nova-anime') {
    const nova = legacyProviders.find(p => p.id === 'nova');
    if (nova) {
      try {
        const info = await nova.resolve(req);
        if (info.status === 'ok') {
          ProviderTelemetry.recordSuccess('nova');
          return {
            ...info,
            server: requestedServerId,
          };
        }
      } catch {
        ProviderTelemetry.recordFailure('nova');
      }
    }
  }

  // 2. Resolve via Lumina Server Suite
  const luminaServer = LUMINA_SERVERS.find(s => s.id === requestedServerId);
  if (luminaServer) {
    let malId: number | null = null;
    if (isAnime || req.title) {
      try {
        malId = await getMalIdForAnime(req.title ?? '');
      } catch {
        malId = null;
      }
    }

    const embedUrl = luminaServer.getPlaybackUrl({
      type: req.type,
      id: req.id,
      imdbId: req.imdbId,
      season: isTV ? season : undefined,
      episode: isTV ? episode : undefined,
      isDub,
      language: req.language,
      malId,
    });

    const audioTracks = isAnime
      ? [
          { label: 'Subbed (Japanese + Subtitles)', selected: !isDub },
          { label: 'Dubbed (English Audio)', selected: isDub },
        ]
      : [
          { label: 'Original / Multi-Audio', selected: !isHindi },
          { label: 'Hindi Dubbed / Dual-Audio', selected: isHindi },
        ];

    const selectedLanguage = isAnime
      ? isDub
        ? 'Dubbed (English Audio)'
        : 'Subbed (Japanese + Subtitles)'
      : isHindi
        ? 'Hindi Dubbed / Dual-Audio'
        : 'Original / Multi-Audio';

    ProviderTelemetry.recordSuccess(luminaServer.id);

    return {
      providerId: luminaServer.id,
      providerLabel: luminaServer.name,
      status: 'ok',
      playback: {
        kind: 'embed',
        embedUrl,
      },
      audioTracks,
      subtitles: [],
      selectedLanguage,
      subOrDub: req.subOrDub,
      isAnime,
      server: luminaServer.id,
      notice: `Streaming via ${luminaServer.name} (${luminaServer.quality}). Select tracks and settings in player controls.`,
      isPreview: false,
    };
  }

  // 3. Fallback: try configured legacy providers
  const configured = getConfiguredProviders();
  for (const provider of configured) {
    try {
      const info = await provider.resolve(req);
      if (info.status === 'ok') {
        return info;
      }
    } catch {
      // try next
    }
  }

  return {
    providerId: 'none',
    providerLabel: 'None',
    status: 'unavailable',
    playback: null,
    audioTracks: [],
    subtitles: [],
    message:
      'Every configured streaming server failed to resolve this title. Please try another server.',
    notice: '',
  };
}

export {
  LUMINA_SERVERS,
  AUTO_SWITCH_CHAIN,
  getCanonicalServerId,
  getLuminaServers,
  getNextFallbackServer,
  ProviderTelemetry,
  type LuminaServerConfig,
  type ServerCategory,
  type ServerCategoryMeta,
  SERVER_CATEGORIES,
} from './lumina';

export type { PlaybackInfo, ResolveRequest, StreamProvider } from './types';
