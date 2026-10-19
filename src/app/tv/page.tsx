import type { Metadata } from 'next';
import { Suspense } from 'react';
import MediaCardSkeleton from '@/components/MediaCardSkeleton';
import BrowseClient from '@/app/search/BrowseClient';
import StateView from '@/components/StateView';
import { discover, getGenres } from '@/lib/tmdb/server';
import type { Genre, MediaSummary } from '@/types';
import '../listing.css';

export const metadata: Metadata = {
  title: 'Browse TV Shows & Web Series',
  description:
    'Browse popular and top-rated TV shows and web series by genre and year. Pick a season and episode and start watching.',
  alternates: { canonical: '/tv' },
};

export const revalidate = 900;

const SKELETONS = Array.from({ length: 18 });

interface Props {
  searchParams: Promise<{ genre?: string; year?: string; sort?: string; page?: string }>;
}

async function TVListing({ searchParams }: Props) {
  const sp = await searchParams;
  const genre = sp.genre ? Number(sp.genre) : undefined;
  const year = sp.year ? Number(sp.year) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const sortBy =
    sp.sort === 'vote'
      ? 'vote_average.desc&vote_count.gte=300'
      : sp.sort === 'recent'
        ? 'first_air_date.desc'
        : 'popularity.desc';

  let items: MediaSummary[] = [];
  let failed = false;
  try {
    items = await discover({ type: 'tv', genre, year, sortBy, page });
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <StateView
        kind="network"
        title="Couldn't load TV shows"
        message="TMDB did not respond. If you are running locally, make sure TMDB_API_KEY or TMDB_ACCESS_TOKEN is set in .env.local, then retry."
        actionLabel="Retry"
        actionHref="/tv"
      />
    );
  }

  let genres: Genre[] = [];
  try {
    genres = await getGenres('tv');
  } catch {
    genres = [];
  }
  return <BrowseClient results={items} genres={genres} page={page} />;
}

export default function TVPage({ searchParams }: Props) {
  return (
    <main className="page-transition listing-head" style={{ paddingTop: 'calc(68px + 1.5rem)' }}>
      <h1 className="visually-hidden">Browse TV shows and web series</h1>
      <Suspense
        fallback={
          <div className="search-grid-fallback">
            {SKELETONS.map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <TVListing searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
