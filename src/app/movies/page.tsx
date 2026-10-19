import type { Metadata } from 'next';
import { Suspense } from 'react';
import MediaCardSkeleton from '@/components/MediaCardSkeleton';
import BrowseClient from '@/app/search/BrowseClient';
import StateView from '@/components/StateView';
import { discover, getGenres } from '@/lib/tmdb/server';
import type { Genre, MediaSummary } from '@/types';
import '../listing.css';

export const metadata: Metadata = {
  title: 'Browse Movies',
  description:
    'Browse thousands of movies by genre and year. Trending, top-rated and newly released films, updated continuously.',
  alternates: { canonical: '/movies' },
};

export const revalidate = 900;

const SKELETONS = Array.from({ length: 18 });

interface Props {
  searchParams: Promise<{ genre?: string; year?: string; sort?: string; page?: string }>;
}

async function MovieListing({ searchParams }: Props) {
  const sp = await searchParams;
  const genre = sp.genre ? Number(sp.genre) : undefined;
  const year = sp.year ? Number(sp.year) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const sortBy =
    sp.sort === 'vote'
      ? 'vote_average.desc&vote_count.gte=300'
      : sp.sort === 'recent'
        ? 'primary_release_date.desc'
        : 'popularity.desc';

  let items: MediaSummary[] = [];
  let failed = false;
  try {
    items = await discover({ type: 'movie', genre, year, sortBy, page });
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <StateView
        kind="network"
        title="Couldn't load movies"
        message="TMDB did not respond. If you are running locally, make sure TMDB_API_KEY or TMDB_ACCESS_TOKEN is set in .env.local, then retry."
        actionLabel="Retry"
        actionHref="/movies"
      />
    );
  }

  let genres: Genre[] = [];
  try {
    genres = await getGenres('movie');
  } catch {
    genres = [];
  }
  return <BrowseClient results={items} genres={genres} page={page} />;
}

export default function MoviesPage({ searchParams }: Props) {
  return (
    <main className="page-transition listing-head" style={{ paddingTop: 'calc(68px + 1.5rem)' }}>
      <h1 className="visually-hidden">Browse movies</h1>
      <Suspense
        fallback={
          <div className="search-grid-fallback">
            {SKELETONS.map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <MovieListing searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
