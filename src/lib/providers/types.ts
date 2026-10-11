/**
 * Stream provider abstraction.
 *
 * A StreamProvider turns a "what to play" request into playback information.
 * The UI never hard-codes provider URLs — it asks the registry to resolve and
 * renders whatever the provider reports (embed iframe, native HLS/MP4 source,
 * real audio-track list, real subtitle list). Providers report only what they
 * actually return; nothing is invented.
 */

import type { MediaType } from '@/types';

export interface ResolveRequest {
  type: MediaType;
  /** TMDB id. */
  id: number;
  /** Direct IMDb id when known or provided by caller. */
  imdbId?: string;
  season?: number;
  episode?: number;
  /** Title for mapping / anime resolution. */
  title?: string;
  /** Whether the media is classified as anime. */
  isAnime?: boolean;
  /** Subtitle vs Dubbed audio preference for anime. */
  subOrDub?: 'sub' | 'dub';
  /** Alternative embed server ID (e.g. vidlink, autoembed, smashy). */
  server?: string;
  /** Preferred audio language (provider-defined label, e.g. "Hindi"). */
  language?: string;
  /** Seconds to resume from, when the provider supports it. */
  resumeAt?: number;
}

export interface AudioTrack {
  /** Provider label, e.g. "Hindi", "English". */
  label: string;
  selected?: boolean;
}

export interface SubtitleTrack {
  label: string;
  /** ISO language code when the provider reports one. */
  lang?: string;
  /** URL of a WebVTT/sidecar subtitle file, when provided. */
  url?: string;
}

export interface QualityOption {
  label: string;
  /** Native level index for HLS players. */
  levelIndex?: number;
}

export interface EmbedPlayback {
  kind: 'embed';
  embedUrl: string;
}

export interface NativePlayback {
  kind: 'native';
  url: string;
  streamType: 'hls' | 'mp4';
  qualities?: QualityOption[];
}

export interface PlaybackInfo {
  providerId: string;
  providerLabel: string;
  /** How the playback is delivered. */
  playback: EmbedPlayback | NativePlayback | null;
  status: 'ok' | 'unavailable';
  /** Human-readable explanation when status is 'unavailable'. */
  message?: string;
  /** Only the audio tracks the provider actually returned. */
  audioTracks: AudioTrack[];
  /** Only the subtitles the provider actually returned. */
  subtitles: SubtitleTrack[];
  /** Selected audio track label, when applicable. */
  selectedLanguage?: string;
  /** Active sub or dub audio mode for anime. */
  subOrDub?: 'sub' | 'dub';
  /** Whether the media resolved as anime. */
  isAnime?: boolean;
  /** Active embed server identifier. */
  server?: string;
  /**
   * Honest provenance note shown in the player UI. A URL coming from a
   * third-party API is NOT proof of licensing — providers must say what
   * they are.
   */
  notice: string;
  /** True when playback is a preview (trailer/demo) rather than the full title. */
  isPreview?: boolean;
}

export interface StreamProvider {
  readonly id: string;
  readonly label: string;
  /** Whether this provider is enabled in the current environment. */
  readonly enabled: boolean;
  resolve(req: ResolveRequest): Promise<PlaybackInfo>;
}

export function unavailable(
  providerId: string,
  providerLabel: string,
  message: string
): PlaybackInfo {
  return {
    providerId,
    providerLabel,
    status: 'unavailable',
    playback: null,
    audioTracks: [],
    subtitles: [],
    message,
    notice: '',
  };
}
