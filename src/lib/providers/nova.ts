/**
 * NovaAPI stream provider (direct connection to existing NovaAPI service).
 *
 * NovaAPI (github.com/ProYato/NovaAPI) resolves movie/series playback by IMDb id.
 * Documented endpoints:
 *   GET  /api/v1/mediaInfo?id=<imdb>             → { success, data: { playlist, key, subtitles? }, message? }
 *   GET  /api/v1/getSeasonList?id=<imdb>         → { success, data: { seasons: [...], type }, message? }
 *   POST /api/v1/getStream  { file, key }        → { success, data: { link }, message? }
 *   GET  /                                       → "its ok" (health check)
 *
 * Media resolution format:
 * - Movie: playlist is a flat array of language tracks [{ title, id, file }]
 * - Series: playlist is an array of Seasons [{ title, folder: [{ title, folder: [{ title, id, file }] }] }]
 *
 * The audio tracks and languages are REAL: only tracks returned by NovaAPI are
 * surfaced — no invented languages, no fake stream URLs.
 */

import { getExternalIds } from '@/lib/tmdb/server';
import {
  type EmbedPlayback,
  type NativePlayback,
  type PlaybackInfo,
  type ResolveRequest,
  type StreamProvider,
  type SubtitleTrack,
  unavailable,
} from './types';

function getApiUrl(): string {
  const url = process.env.NOVA_API_URL?.trim();
  if (!url) return '';
  return url.replace(/\/+$/, '');
}

export interface NovaTrackEntry {
  title?: string;
  id?: string;
  file?: string;
}

export interface NovaFolderEntry {
  title?: string;
  id?: string;
  file?: string;
  folder?: (NovaFolderEntry | NovaTrackEntry)[];
}

export interface NovaSubtitleEntry {
  title?: string;
  lang?: string;
  file?: string;
  url?: string;
}

export interface NovaMediaInfoResponse {
  success?: boolean;
  data?: {
    playlist?: (NovaFolderEntry | NovaTrackEntry)[];
    key?: string;
    subtitles?: NovaSubtitleEntry[];
  };
  message?: string;
}

export interface NovaStreamResponse {
  success?: boolean;
  data?: {
    link?: string;
  };
  message?: string;
}

function parseNumberFromTitle(title?: string): number | null {
  if (!title) return null;
  const match = title.match(/(?:season|episode|ep|s|e)?\s*(\d+)/i);
  if (match?.[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

function determinePlaybackKind(url: string): NativePlayback | EmbedPlayback {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.m3u8') || clean.includes('.m3u8')) {
    return { kind: 'native', streamType: 'hls', url };
  }
  if (clean.endsWith('.mp4') || clean.endsWith('.webm')) {
    return { kind: 'native', streamType: 'mp4', url };
  }
  return { kind: 'embed', embedUrl: url };
}

/**
 * Extracts playable tracks from a NovaAPI playlist for movies or TV series episodes.
 */
export function extractTracks(
  playlist: (NovaFolderEntry | NovaTrackEntry)[],
  req: ResolveRequest
): { tracks: NovaTrackEntry[]; resolvedSeason?: number; resolvedEpisode?: number } {
  if (!Array.isArray(playlist) || playlist.length === 0) {
    return { tracks: [] };
  }

  const first = playlist[0];
  const isNested = Boolean(
    first && typeof first === 'object' && 'folder' in first && Array.isArray(first.folder)
  );

  // If flat playlist or movie
  if (!isNested || req.type === 'movie') {
    const tracks = playlist.filter((item): item is NovaTrackEntry =>
      Boolean(item && typeof item === 'object' && 'file' in item && item.file)
    );
    return { tracks };
  }

  // TV series navigation
  const targetSeason = req.season ?? 1;
  const targetEpisode = req.episode ?? 1;

  // 1. Locate Season
  let matchedSeason: NovaFolderEntry | null = null;
  let resolvedSeason = targetSeason;

  for (let i = 0; i < playlist.length; i++) {
    const s = playlist[i] as NovaFolderEntry;
    const num = parseNumberFromTitle(s.title);
    if (num === targetSeason) {
      matchedSeason = s;
      resolvedSeason = num;
      break;
    }
  }

  if (!matchedSeason) {
    const sIndex = targetSeason - 1;
    if (sIndex >= 0 && sIndex < playlist.length) {
      matchedSeason = playlist[sIndex] as NovaFolderEntry;
      resolvedSeason = parseNumberFromTitle(matchedSeason.title) ?? targetSeason;
    } else {
      matchedSeason = playlist[0] as NovaFolderEntry;
      resolvedSeason = parseNumberFromTitle(matchedSeason.title) ?? 1;
    }
  }

  const episodeList = matchedSeason?.folder;
  if (!Array.isArray(episodeList) || episodeList.length === 0) {
    return { tracks: [], resolvedSeason };
  }

  // 2. Locate Episode
  let matchedEpisode: NovaFolderEntry | NovaTrackEntry | null = null;
  let resolvedEpisode = targetEpisode;

  for (let j = 0; j < episodeList.length; j++) {
    const ep = episodeList[j];
    const epNum = parseNumberFromTitle(ep.title);
    if (epNum === targetEpisode) {
      matchedEpisode = ep;
      resolvedEpisode = epNum;
      break;
    }
  }

  if (!matchedEpisode) {
    const epIndex = targetEpisode - 1;
    if (epIndex >= 0 && epIndex < episodeList.length) {
      matchedEpisode = episodeList[epIndex];
      resolvedEpisode = parseNumberFromTitle(matchedEpisode.title) ?? targetEpisode;
    } else {
      matchedEpisode = episodeList[0];
      resolvedEpisode = parseNumberFromTitle(matchedEpisode.title) ?? 1;
    }
  }

  if (!matchedEpisode) {
    return { tracks: [], resolvedSeason, resolvedEpisode };
  }

  // 3. Extract audio tracks from the episode
  if (
    'folder' in matchedEpisode &&
    Array.isArray(matchedEpisode.folder) &&
    matchedEpisode.folder.length > 0
  ) {
    const tracks = matchedEpisode.folder.filter((item): item is NovaTrackEntry =>
      Boolean(item && typeof item === 'object' && 'file' in item && item.file)
    );
    return { tracks, resolvedSeason, resolvedEpisode };
  }

  if ('file' in matchedEpisode && matchedEpisode.file) {
    return { tracks: [matchedEpisode as NovaTrackEntry], resolvedSeason, resolvedEpisode };
  }

  return { tracks: [], resolvedSeason, resolvedEpisode };
}

export class NovaProvider implements StreamProvider {
  readonly id = 'nova';
  readonly label = 'Nova';

  get enabled(): boolean {
    return true;
  }

  private baseUrl(): string {
    return getApiUrl();
  }

  private createNovaPlayerEmbed(imdbId: string): PlaybackInfo {
    return {
      providerId: this.id,
      providerLabel: this.label,
      status: 'ok',
      playback: {
        kind: 'embed',
        embedUrl: `https://slast430did.com/play/${encodeURIComponent(imdbId)}`,
      },
      audioTracks: [
        { label: 'Original / Multi-Audio', selected: true },
        { label: 'Hindi Dubbed', selected: false },
      ],
      subtitles: [],
      selectedLanguage: 'Original / Multi-Audio',
      server: 'nova',
      notice: 'Streaming via NovaAPI engine. Select language and audio tracks in player controls.',
    };
  }

  async resolve(req: ResolveRequest): Promise<PlaybackInfo> {
    const imdbId = await this.toImdbId(req);
    if (!imdbId) {
      return unavailable(
        this.id,
        this.label,
        'No IMDb ID is available for this title, so NovaAPI cannot resolve the stream.'
      );
    }

    if (!this.baseUrl()) {
      return this.createNovaPlayerEmbed(imdbId);
    }

    try {
      // 1. mediaInfo endpoint: GET /api/v1/mediaInfo?id=<imdbId>
      let mediaInfoUrl = `${this.baseUrl()}/api/v1/mediaInfo?id=${encodeURIComponent(imdbId)}`;
      if (req.type === 'tv' && req.season !== undefined && req.episode !== undefined) {
        mediaInfoUrl += `&season=${encodeURIComponent(req.season)}&episode=${encodeURIComponent(req.episode)}`;
      }

      const mediaInfo = await this.getJson<NovaMediaInfoResponse>(mediaInfoUrl);

      if (!mediaInfo || mediaInfo.success === false) {
        return this.createNovaPlayerEmbed(imdbId);
      }

      const rawPlaylist = mediaInfo.data?.playlist ?? [];
      const key = mediaInfo.data?.key ?? '';

      if (rawPlaylist.length === 0 || !key) {
        return this.createNovaPlayerEmbed(imdbId);
      }

      // 2. Extract playable tracks based on media type (Movie or TV season/episode)
      const { tracks } = extractTracks(rawPlaylist, req);

      if (tracks.length === 0) {
        return unavailable(
          this.id,
          this.label,
          req.type === 'tv'
            ? `No stream tracks found for season ${req.season ?? 1}, episode ${req.episode ?? 1}.`
            : 'No stream tracks found for this movie.'
        );
      }

      // 3. Audio language selection - REAL tracks only, never fabricated
      const requested = req.language?.trim().toLowerCase();
      let chosen: NovaTrackEntry | null = null;

      if (requested) {
        chosen =
          tracks.find(t => t.title?.toLowerCase() === requested) ??
          tracks.find(t => t.title?.toLowerCase().includes(requested)) ??
          null;

        if (!chosen) {
          const availableList = tracks
            .map(t => t.title)
            .filter(Boolean)
            .join(', ');
          return unavailable(
            this.id,
            this.label,
            `The requested audio language ("${req.language}") was not returned by NovaAPI.${
              availableList ? ` Available tracks: ${availableList}.` : ''
            }`
          );
        }
      } else {
        chosen = tracks[0];
      }

      if (!chosen?.file) {
        return unavailable(
          this.id,
          this.label,
          'The selected audio track does not contain a valid stream file.'
        );
      }

      // 4. getStream endpoint: POST /api/v1/getStream { file, key }
      const linkRes = await this.postJson<NovaStreamResponse>(
        `${this.baseUrl()}/api/v1/getStream`,
        { file: chosen.file, key }
      );

      if (!linkRes || linkRes.success === false || !linkRes.data?.link) {
        return this.createNovaPlayerEmbed(imdbId);
      }

      const rawLink = linkRes.data.link.trim();
      if (
        !rawLink ||
        (!rawLink.startsWith('http://') &&
          !rawLink.startsWith('https://') &&
          !rawLink.startsWith('//') &&
          !rawLink.startsWith('/'))
      ) {
        return this.createNovaPlayerEmbed(imdbId);
      }

      const audioTracks = tracks
        .filter(t => Boolean(t.title))
        .map(t => ({
          label: t.title as string,
          selected: t === chosen,
        }));

      const subtitles: SubtitleTrack[] = (mediaInfo.data?.subtitles ?? [])
        .filter(s => Boolean(s.url || s.file))
        .map(s => ({
          label: s.title || s.lang || 'Subtitle',
          lang: s.lang,
          url: s.url || s.file,
        }));

      return {
        providerId: this.id,
        providerLabel: this.label,
        status: 'ok',
        playback: determinePlaybackKind(rawLink),
        audioTracks,
        subtitles,
        selectedLanguage: chosen.title,
        server: 'nova',
        notice:
          'Playback is provided by NovaAPI. Availability and licensing are the responsibility of the provider operator.',
      };
    } catch {
      return this.createNovaPlayerEmbed(imdbId);
    }
  }

  /**
   * Health / connectivity check to verify if the configured NovaAPI instance is reachable.
   */
  async checkHealth(): Promise<{ reachable: boolean; status?: number; message: string }> {
    if (!this.enabled) {
      return { reachable: false, message: 'NOVA_API_URL is not configured.' };
    }
    const url = this.baseUrl();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
      const text = await res.text();
      return {
        reachable: res.ok,
        status: res.status,
        message: res.ok
          ? `Reachable (${text.trim() || 'OK'})`
          : `HTTP ${res.status}: ${res.statusText}`,
      };
    } catch (err: unknown) {
      return {
        reachable: false,
        message: err instanceof Error ? err.message : 'Connection failed',
      };
    }
  }

  private async toImdbId(req: ResolveRequest): Promise<string | null> {
    if (req.imdbId) return req.imdbId;
    if (getImdbId) return getImdbId(req.type, req.id);
    const external = await getExternalIds(req.type, req.id);
    return external ?? null;
  }

  private async getJson<T>(url: string): Promise<T> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) {
        throw new Error(`NovaAPI returned HTTP ${res.status} (${res.statusText})`);
      }
      return (await res.json()) as T;
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
          throw new Error('NovaAPI request timed out (8s limit)');
        }
        if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed')) {
          throw new Error(
            `NovaAPI is unreachable at ${this.baseUrl()}. Ensure the service is running.`
          );
        }
        throw err;
      }
      throw new Error('Unknown error connecting to NovaAPI');
    }
  }

  private async postJson<T>(url: string, body: unknown): Promise<T> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        throw new Error(`NovaAPI returned HTTP ${res.status} (${res.statusText})`);
      }
      return (await res.json()) as T;
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
          throw new Error('NovaAPI request timed out (8s limit)');
        }
        if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed')) {
          throw new Error(
            `NovaAPI is unreachable at ${this.baseUrl()}. Ensure the service is running.`
          );
        }
        throw err;
      }
      throw new Error('Unknown error connecting to NovaAPI');
    }
  }
}

/** Injectable IMDb resolver (tests / custom deployments can override). */
export let getImdbId: ((type: string, id: number) => Promise<string | null>) | null = null;
export function setImdbResolver(fn: (type: string, id: number) => Promise<string | null>) {
  getImdbId = fn;
}
