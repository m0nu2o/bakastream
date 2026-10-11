/**
 * TMDB image URL helpers. Safe to use on the server and in the browser —
 * image URLs contain no credentials.
 */

const IMAGE_BASE = process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';

export type PosterSize = 'w185' | 'w342' | 'w500' | 'original';
export type BackdropSize = 'w780' | 'w1280' | 'original';
export type ProfileSize = 'w185';
export type StillSize = 'w300' | 'w500';

export function tmdbImage(path: string | null | undefined, size: string): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export function posterUrl(
  path: string | null | undefined,
  size: PosterSize = 'w500'
): string | null {
  return tmdbImage(path, size);
}

export function backdropUrl(
  path: string | null | undefined,
  size: BackdropSize = 'w1280'
): string | null {
  return tmdbImage(path, size);
}

export function profileUrl(path: string | null | undefined): string | null {
  return tmdbImage(path, 'w185');
}

export function stillUrl(path: string | null | undefined, size: StillSize = 'w300'): string | null {
  return tmdbImage(path, size);
}
