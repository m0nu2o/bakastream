/**
 * Browser-side TMDB access — exclusively via internal API routes.
 * No API key ever reaches the browser.
 * Includes in-memory client-side LRU/TTL caching for lightning-fast tab & page navigation.
 */

import type { Genre, MediaSummary, SeasonDetailInfo } from '@/types';
import type { PlaybackInfo } from '@/lib/providers/types';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

function getFromCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setInCache<T>(key: string, data: T, ttlMs: number): void {
  // Prevent unbound memory growth
  if (memoryCache.size > 250) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

async function getJSON<T>(url: string, ttlMs = 120_000): Promise<T> {
  const cached = getFromCache<T>(url);
  if (cached !== null) {
    return cached;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${url} (${res.status})`);
  const data = (await res.json()) as T;
  setInCache(url, data, ttlMs);
  return data;
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
    `/api/search?${search.toString()}`,
    60_000 // 1 min cache for search
  );
}

export async function suggest(query: string): Promise<MediaSummary[]> {
  try {
    const data = await getJSON<{ results: MediaSummary[] }>(
      `/api/search/suggest?q=${encodeURIComponent(query)}`,
      180_000 // 3 min cache
    );
    return data.results;
  } catch {
    return [];
  }
}

export async function getGenres(type: 'movie' | 'tv'): Promise<Genre[]> {
  try {
    const data = await getJSON<{ genres: Genre[] }>(
      `/api/tmdb/genre/${type}/list`,
      1_800_000 // 30 min cache
    );
    return data.genres;
  } catch {
    return [];
  }
}

export async function getSeason(tvId: number, season: number): Promise<SeasonDetailInfo | null> {
  try {
    return await getJSON<SeasonDetailInfo>(
      `/api/tmdb/tv/${tvId}/season/${season}`,
      900_000 // 15 min cache for episode lists
    );
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
  const cacheKey = `stream:${body.type}:${body.id}:${body.season ?? 0}:${body.episode ?? 0}:${body.server ?? 'auto'}:${body.language ?? ''}:${body.subOrDub ?? ''}`;
  const cached = getFromCache<PlaybackInfo>(cacheKey);
  if (cached !== null) {
    return cached;
  }

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

  const data = await res.json();
  if (data && data.status === 'ok') {
    setInCache(cacheKey, data, 300_000); // 5 min cache for verified working streams
  }
  return data;
}
