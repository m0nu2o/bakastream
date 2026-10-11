/**
 * Demo/preview provider — the DEFAULT legal fallback.
 *
 * Serves public, freely-distributed sample HLS streams (Mux's open test
 * assets) so the custom player architecture is fully exercisable without any
 * third-party content. It plays a clearly-labeled PREVIEW, never the requested
 * title, and it reports exactly one track: what it can actually play.
 */

import { type PlaybackInfo, type ResolveRequest, type StreamProvider, unavailable } from './types';

export class DemoPreviewProvider implements StreamProvider {
  readonly id = 'demo-preview';
  readonly label = 'Preview Player';
  readonly enabled = true;

  async resolve(req: ResolveRequest): Promise<PlaybackInfo> {
    if (req.language && req.language.trim().toLowerCase() !== 'english') {
      return unavailable(
        this.id,
        this.label,
        `The requested audio language ("${req.language}") is not available for this preview stream.`
      );
    }

    return {
      providerId: this.id,
      providerLabel: this.label,
      status: 'ok',
      playback: {
        kind: 'native',
        streamType: 'hls',
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        qualities: [],
      },
      audioTracks: [{ label: 'English', selected: true }],
      subtitles: [],
      selectedLanguage: 'English',
      isPreview: true,
      notice:
        'Legal preview stream (public sample media) — full playback requires a licensed provider. Configure NOVA_API_URL or plug your own provider in src/lib/providers.',
    };
  }
}
