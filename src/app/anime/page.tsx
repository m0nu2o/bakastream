import type { Metadata } from 'next';
import { Suspense } from 'react';
import MediaCardSkeleton from '@/components/MediaCardSkeleton';
import BrowseClient from '@/app/search/BrowseClient';
import StateView from '@/components/StateView';
import { getAnime, getGenres } from '@/lib/tmdb/server';
import type { Genre, MediaSummary } from '@/types';
import '../listing.css';

export const metadata: Metadata = {
  title: 'Browse Anime',
  description: 'Browse popular anime series, from ongoing seasonals to all-time classics.',
  alternates: { canonical: '/anime' },
};

export const revalidate = 900;

const SKELETONS = Array.from({ length: 18 });

interface Props {
  searchParams: Promise<{ page?: string; type?: string; genre?: string; year?: string }>;
}

async function AnimeListing({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const type = (sp.type === 'movie' || sp.type === 'tv' ? sp.type : 'all') as 'all' | 'movie' | 'tv';
  const genre = sp.genre ? Number(sp.genre) : undefined;
  const year = sp.year ? Number(sp.year) : undefined;

  let items: MediaSummary[] = [];
  let failed = false;
  try {
    items = await getAnime(page, type, genre, year);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <StateView
        kind="network"
        title="Couldn't load anime"
        message="TMDB did not respond. If you are running locally, make sure TMDB_API_KEY or TMDB_ACCESS_TOKEN is set in .env.local, then retry."
        actionLabel="Retry"
        actionHref="/anime"
      />
    );
  }

  let genres: Genre[] = [];
  try {
    const [tvGenres, movieGenres] = await Promise.all([
      getGenres('tv').catch(() => []),
      getGenres('movie').catch(() => []),
    ]);
    const map = new Map<number, Genre>();
    [...tvGenres, ...movieGenres].forEach(g => {
      if (g.id !== 16 && !map.has(g.id)) map.set(g.id, g);
    });
    genres = Array.from(map.values());
  } catch {
    genres = [];
  }
  return <BrowseClient results={items} genres={genres} page={page} />;
}

export default function AnimePage({ searchParams }: Props) {
  return (
    <main className="page-transition listing-head" style={{ paddingTop: 'calc(68px + 1.5rem)' }}>
      <h1 className="visually-hidden">Browse anime</h1>
      <Suspense
        fallback={
          <div className="search-grid-fallback">
            {SKELETONS.map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <AnimeListing searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
