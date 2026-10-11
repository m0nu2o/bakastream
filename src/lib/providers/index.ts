/**
 * Stream provider registry.
 *
 * The UI asks the registry to resolve playback; it never imports a concrete
 * provider. Priority: explicitly-configured providers first (Nova when
 * NOVA_API_URL is set), legal preview fallback last.
 */

import type { PlaybackInfo, ResolveRequest, StreamProvider } from './types';
import { NovaProvider } from './nova';
import { VidLinkProvider } from './vidlink';
import { TwoEmbedProvider } from './2embed';
import { DemoPreviewProvider } from './demo';

const providers: StreamProvider[] = [
  new NovaProvider(),
  new VidLinkProvider(),
  new TwoEmbedProvider(),
  new DemoPreviewProvider(),
];

export function listProviders(): StreamProvider[] {
  return providers;
}

export function getConfiguredProviders(): StreamProvider[] {
  return providers.filter(p => p.enabled);
}

/**
 * Resolve playback for a request. The first configured provider wins; if none
 * are configured, or every one fails, the response carries status
 * 'unavailable' with a human-readable reason — the UI renders that, it never
 * fabricates a stream.
 */
export async function resolveStream(req: ResolveRequest): Promise<PlaybackInfo> {
  const configured = getConfiguredProviders();

  if (configured.length === 0) {
    return {
      providerId: 'none',
      providerLabel: 'None',
      status: 'unavailable',
      playback: null,
      audioTracks: [],
      subtitles: [],
      message:
        'No stream provider is configured. Set NOVA_API_URL to enable the Nova provider, or plug a licensed provider into src/lib/providers.',
      notice: '',
    };
  }

  // 1. Explicit server routing for 2Embed
  if (req.server === '2embed') {
    const twoEmbed = configured.find(p => p.id === '2embed');
    if (twoEmbed) {
      return await twoEmbed.resolve(req);
    }
  }

  // 2. Explicit server routing for VidLink / AutoEmbed / SmashyStream
  if (req.server === 'vidlink' || req.server === 'autoembed' || req.server === 'smashy') {
    const vidlink = configured.find(p => p.id === 'vidlink');
    if (vidlink) {
      return await vidlink.resolve(req);
    }
  }

  // 2. Explicit server routing for Nova
  if (req.server === 'nova') {
    const nova = configured.find(p => p.id === 'nova');
    if (nova) {
      const info = await nova.resolve(req);
      if (info.status === 'ok') {
        return info;
      }
      // If Nova returned unavailable, attempt backup provider so user is not stuck
      const backup = configured.find(p => p.id !== 'nova');
      if (backup) {
        try {
          const backupInfo = await backup.resolve({ ...req, server: 'vidlink' });
          if (backupInfo.status === 'ok') {
            return {
              ...backupInfo,
              notice: `NovaAPI stream was unavailable (${info.message || 'Media not found'}). Playing from alternate server.`,
            };
          }
        } catch {
          // ignore backup error, return nova's status
        }
      }
      return info;
    }
  }

  // 3. Default priority order (Nova first, then VidLink, then preview fallback)
  let last: PlaybackInfo | null = null;
  for (const provider of configured) {
    try {
      const info = await provider.resolve(req);
      if (info.status === 'ok') {
        if (provider.id === 'demo-preview' && last?.providerId === 'nova') {
          return {
            ...info,
            notice: `Nova provider could not resolve this stream (${last.message || 'unavailable'}). Showing sample preview player.`,
          };
        }
        return info;
      }
      last = info;
    } catch {
      // try the next provider
    }
  }
  return (
    last ?? {
      providerId: 'none',
      providerLabel: 'None',
      status: 'unavailable',
      playback: null,
      audioTracks: [],
      subtitles: [],
      message: 'Every configured provider failed to resolve this title.',
      notice: '',
    }
  );
}

export type { PlaybackInfo, ResolveRequest, StreamProvider } from './types';
