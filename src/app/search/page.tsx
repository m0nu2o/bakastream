/**
 * Search + browse route. Reads filters from the URL and renders the results
 * grid server-side — fast, cacheable, shareable.
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import BrowseClient from './BrowseClient';
import { search, getGenres } from '@/lib/tmdb/server';
import type { MediaSummary, Genre } from '@/types';
import MediaCardSkeleton from '@/components/MediaCardSkeleton';
import styles from './search.module.css';

export const metadata: Metadata = {
  title: 'Search Movies & TV Shows | BakaStream',
  description:
    'Search thousands of movies and TV shows on BakaStream. Filter by genre, year and media type, then start watching instantly.',
  alternates: { canonical: '/search' },
};

interface SearchProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    genre?: string;
    year?: string;
    page?: string;
    sort?: string;
  }>;
}

const GRID_SKELETONS = Array.from({ length: 12 });

async function Results({ searchParams }: SearchProps) {
  const sp = await searchParams;
  const query = sp.q?.trim() || '';
  const type = (sp.type === 'movie' || sp.type === 'tv' ? sp.type : 'all') as
    'all' | 'movie' | 'tv';
  const genre = sp.genre ? Number(sp.genre) : undefined;
  const year = sp.year ? Number(sp.year) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = sp.sort || undefined;

  let results: MediaSummary[] = [];
  let totalResults = 0;
  let error = false;

  try {
    const data = await search({ query, type, genre, year, page, sort });
    results = data.results;
    totalResults = data.totalResults;
  } catch {
    error = true;
  }

  if (error) {
    return (
      <div className="error-state">
        <p className="error-state__icon">⚠️</p>
        <h3>Couldn&apos;t load results</h3>
        <p>TMDB didn&apos;t respond. Check the configuration or try again in a moment.</p>
      </div>
    );
  }

  let genres: Genre[] = [];
  try {
    if (type === 'tv') {
      genres = await getGenres('tv');
    } else if (type === 'movie') {
      genres = await getGenres('movie');
    } else {
      const [movieGenres, tvGenres] = await Promise.all([
        getGenres('movie').catch(() => []),
        getGenres('tv').catch(() => []),
      ]);
      const map = new Map<number, Genre>();
      [...movieGenres, ...tvGenres].forEach(g => {
        if (!map.has(g.id)) map.set(g.id, g);
      });
      genres = Array.from(map.values());
    }
  } catch {
    genres = [];
  }

  const totalPages = Math.min(Math.ceil(totalResults / 20) || 1, 500);

  return <BrowseClient results={results} genres={genres} page={page} totalPages={totalPages} />;
}

export default async function SearchPage({ searchParams }: SearchProps) {
  const sp = await searchParams;
  void sp; // filters are read inside <Results> via Suspense

  return (
    <main className={`page-transition ${styles.page}`}>
      <h1 className="visually-hidden">Search movies and TV shows</h1>
      <Suspense
        fallback={
          <div className={styles.grid}>
            {GRID_SKELETONS.map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
