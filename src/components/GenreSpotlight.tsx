import CatalogSection from '@/components/CatalogSection';
import { discover } from '@/lib/tmdb/server';
import type { MediaSummary } from '@/types';

/**
 * Lazily streamed genre rail — the homepage shell responds immediately and
 * each genre section streams in as its TMDB query resolves.
 */
export default async function GenreSpotlight({ genreId, name }: { genreId: number; name: string }) {
  let items: MediaSummary[] = [];
  try {
    items = await discover({ type: 'movie', genre: genreId });
  } catch {
    return null;
  }

  if (!items.length) return null;

  return (
    <CatalogSection
      title={`${name} movies`}
      type="movie"
      items={items}
      viewAllHref={`/movies?genre=${genreId}`}
    />
  );
}
