/**
 * VidLink stream provider with multi-server, Anime Sub/Dub, and Hindi Dubbed support.
 *
 * Resolves movie, TV series, and anime streams directly by TMDB or MAL ID.
 * Supports dedicated Subbed and Dubbed streams for anime via MyAnimeList mapping,
 * multi-language / Hindi Dubbed streams via SmashyStream / AnyEmbed,
 * and alternate server selection for clean, reliable playback.
 */

import { getMalIdForAnime } from './mal';
import type { PlaybackInfo, ResolveRequest, StreamProvider } from './types';

export class VidLinkProvider implements StreamProvider {
  readonly id = 'vidlink';
  readonly label = 'VidLink Pro';
  readonly enabled = true;

  async resolve(req: ResolveRequest): Promise<PlaybackInfo> {
    const isTV = req.type === 'tv';
    const season = req.season ?? 1;
    const episode = req.episode ?? 1;
    const subOrDub = req.subOrDub ?? 'sub';
    const server = req.server ?? 'vidlink';
    const isHindiRequested = req.language?.trim().toLowerCase() === 'hindi';

    let isAnime = Boolean(req.isAnime);
    let malId: number | null = null;

    if (isAnime || req.title) {
      malId = await getMalIdForAnime(req.title ?? '');
      if (malId) {
        isAnime = true;
      }
    }

    let embedUrl: string;

    // Server & Audio selection routing
    if (isAnime && malId) {
      // Dedicated VidLink Anime engine with explicit Sub / Dub track
      const epNum = isTV ? episode : 1;
      embedUrl = `https://vidlink.pro/anime/${malId}/${epNum}/${subOrDub}?fallback=true&primaryColor=C21E56&secondaryColor=12121c&iconColor=C21E56`;
    } else {
      // Default VidLink TMDB engine (multi-audio & subtitle support directly in player controls)
      embedUrl = isTV
        ? `https://vidlink.pro/tv/${req.id}/${season}/${episode}?primaryColor=C21E56&secondaryColor=12121c&iconColor=C21E56`
        : `https://vidlink.pro/movie/${req.id}?primaryColor=C21E56&secondaryColor=12121c&iconColor=C21E56`;
    }

    const audioTracks = isAnime
      ? [
          {
            label: 'Subbed (Japanese + Subtitles)',
            selected: subOrDub === 'sub',
          },
          {
            label: 'Dubbed (English Audio)',
            selected: subOrDub === 'dub',
          },
        ]
      : [
          {
            label: 'Original / Multi-Audio',
            selected: !isHindiRequested,
          },
          {
            label: 'Hindi Dubbed / Dual-Audio',
            selected: isHindiRequested,
          },
        ];

    const selectedLanguage = isAnime
      ? subOrDub === 'dub'
        ? 'Dubbed (English Audio)'
        : 'Subbed (Japanese + Subtitles)'
      : isHindiRequested
        ? 'Hindi Dubbed / Dual-Audio'
        : 'Original / Multi-Audio';

    const notice = isAnime
      ? `Streaming ${subOrDub.toUpperCase()} anime stream. Toggle Sub/Dub or server as desired.`
      : isHindiRequested
        ? 'Streaming Hindi Dubbed / Dual-Audio stream via AnyEmbed. Player audio tracks can be switched in player settings.'
        : `Streaming via ${server === 'autoembed' ? 'AutoEmbed' : server === 'smashy' ? 'SmashyStream' : 'VidLink Pro'}. Quality and options available in player controls.`;

    return {
      providerId: this.id,
      providerLabel: this.label,
      status: 'ok',
      playback: {
        kind: 'embed',
        embedUrl,
      },
      audioTracks,
      subtitles: [],
      selectedLanguage,
      subOrDub,
      isAnime,
      server: isHindiRequested ? 'smashy' : server,
      isPreview: false,
      notice,
    };
  }
}
