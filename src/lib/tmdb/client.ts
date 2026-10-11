/**
 * Browser-side TMDB access — exclusively via internal API routes.
 * No API key ever reaches the browser.
 */

import type { Genre, MediaSummary, SeasonDetailInfo } from '@/types';

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${url} (${res.status})`);
  return (await res.json()) as T;
}

export async function searchTMDB(params: {
  query?: string;
  type?: 'all' | 'movie' | 'tv';
  genre?: number;
  year?: number;
  page?: number;
}) {
  const search = new URLSearchParams();
  if (params.query) search.set('query', params.query);
  if (params.type) search.set('type', params.type);
  if (params.genre) search.set('genre', String(params.genre));
  if (params.year) search.set('year', String(params.year));
  if (params.page) search.set('page', String(params.page));
  return getJSON<{ results: MediaSummary[]; page: number; totalResults: number }>(
    `/api/search?${search.toString()}`
  );
}

export async function suggest(query: string): Promise<MediaSummary[]> {
  try {
    const data = await getJSON<{ results: MediaSummary[] }>(
      `/api/search/suggest?q=${encodeURIComponent(query)}`
    );
    return data.results;
  } catch {
    return [];
  }
}

export async function getGenres(type: 'movie' | 'tv'): Promise<Genre[]> {
  try {
    const data = await getJSON<{ genres: Genre[] }>(`/api/tmdb/genre/${type}/list`);
    return data.genres;
  } catch {
    return [];
  }
}

export async function getSeason(tvId: number, season: number): Promise<SeasonDetailInfo | null> {
  try {
    return await getJSON<SeasonDetailInfo>(`/api/tmdb/tv/${tvId}/season/${season}`);
  } catch {
    return null;
  }
}

export async function resolveStream(body: {
  type: string;
  id: number;
  imdbId?: string;
  season?: number;
  episode?: number;
  title?: string;
  isAnime?: boolean;
  subOrDub?: 'sub' | 'dub';
  server?: string;
  language?: string;
  resumeAt?: number;
}) {
  const res = await fetch('/api/stream/resolve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return {
      providerId: 'error',
      providerLabel: 'Error',
      status: 'unavailable' as const,
      playback: null,
      audioTracks: [],
      subtitles: [],
      message: 'The stream service returned an error. Please try again.',
      notice: '',
    };
  }
  return res.json();
}
