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

  let results: MediaSummary[] = [];
  let error = false;

  try {
    const data = await search({ query, type, genre, year, page });
    results = data.results;
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

  if (results.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state__icon">🎬</p>
        <h3>No results found</h3>
        <p>
          {query
            ? `Nothing matched “${query}”. Try a different spelling or fewer filters.`
            : 'No titles matched these filters. Try widening your search.'}
        </p>
      </div>
    );
  }

  const genres: Genre[] = await getGenres('movie').catch(() => []);

  return <BrowseClient results={results} genres={genres} page={page} />;
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
