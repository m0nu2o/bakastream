/**
 * 2Embed stream provider.
 *
 * High-reliability fallback embed provider supporting movies and TV series via TMDB ID.
 * Features multi-language audio tracks and built-in subtitle selection directly in player controls.
 */

import type { PlaybackInfo, ResolveRequest, StreamProvider } from './types';

export class TwoEmbedProvider implements StreamProvider {
  readonly id = '2embed';
  readonly label = '2Embed HD';
  readonly enabled = true;

  async resolve(req: ResolveRequest): Promise<PlaybackInfo> {
    const isTV = req.type === 'tv';
    const season = req.season ?? 1;
    const episode = req.episode ?? 1;

    const embedUrl = isTV
      ? `https://www.2embed.cc/embedtv/${req.id}&s=${season}&e=${episode}`
      : `https://www.2embed.cc/embed/${req.id}`;

    return {
      providerId: this.id,
      providerLabel: this.label,
      status: 'ok',
      playback: {
        kind: 'embed',
        embedUrl,
      },
      audioTracks: [
        {
          label: 'Multi-Audio (Hindi / English)',
          selected: true,
        },
      ],
      subtitles: [],
      server: '2embed',
      isPreview: false,
      notice: 'Streaming via 2Embed HD backup server. Audio tracks and subtitles available in player controls.',
    };
  }
}
