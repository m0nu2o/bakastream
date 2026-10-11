/**
 * URL slug helpers — the canonical, typed versions of the legacy urlRouting
 * utilities. Used by every card, hero and detail page.
 */

import type { MediaSummary, MediaType } from '@/types';

export function sanitizeForUrl(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** /movie/{title-slug}-{tmdbId} */
export function movieUrl(id: number, title: string): string {
  return `/movie/${sanitizeForUrl(title) || 'movie'}-${id}`;
}

/** /tv/{title-slug}-{tmdbId} */
export function tvUrl(id: number, title: string): string {
  return `/tv/${sanitizeForUrl(title) || 'series'}-${id}`;
}

/** /watch/movie/{id} · /watch/tv/{id}/{season}/{episode} */
export function watchMovieUrl(id: number): string {
  return `/watch/movie/${id}`;
}

export function watchTVUrl(id: number, season: number, episode: number): string {
  return `/watch/tv/${id}/${season}/${episode}`;
}

/** Detail page URL for any summary item. */
export function mediaUrl(item: Pick<MediaSummary, 'id' | 'type' | 'title'>): string {
  return item.type === 'movie' ? movieUrl(item.id, item.title) : tvUrl(item.id, item.title);
}

/** Player URL for any summary item (defaults to S1E1 for TV). */
export function watchUrl(
  item: Pick<MediaSummary, 'id' | 'type' | 'title'>,
  season = 1,
  episode = 1
): string {
  return item.type === 'movie' ? watchMovieUrl(item.id) : watchTVUrl(item.id, season, episode);
}

/** Browse listing URL, optionally filtered by genre id. */
export function listUrl(type: MediaType, genreId?: number): string {
  const base = type === 'movie' ? '/movies' : '/tv';
  return genreId ? `${base}?genre=${genreId}` : base;
}

export function seeAllUrl(type: 'movie' | 'tv'): string {
  return type === 'movie' ? '/movies' : '/tv';
}

/** Extract the TMDB id from `title-slug-12345` or plain numeric `12345`. */
export function parseIdFromSlug(slug: string): number | null {
  if (!slug) return null;
  if (/^\d+$/.test(slug)) return Number(slug);
  const m = slug.match(/-(\d+)$/);
  return m ? Number(m[1]) : null;
}
