import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import MediaCardSkeleton from '@/components/MediaCardSkeleton';
import BrowseClient from '@/app/search/BrowseClient';
import StateView from '@/components/StateView';
import { getCategory, fetchCategoryItems } from '@/lib/categories';
import { getGenres } from '@/lib/tmdb/server';
import type { Genre } from '@/types';
import '@/app/listing.css';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) {
    return { title: 'Category Not Found', robots: 'noindex' };
  }

  return {
    title: `Browse ${category.name} | BakaStream`,
    description: category.description,
    alternates: { canonical: `/category/${category.id}` },
  };
}

export const revalidate = 900;

const SKELETONS = Array.from({ length: 18 });

async function CategoryListing({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const result = await fetchCategoryItems(slug, page);
  if (!result || !result.category) {
    notFound();
  }

  const { category, items } = result;

  if (items.length === 0) {
    return (
      <StateView
        kind="empty"
        title={`No titles found in ${category.name}`}
        message="Please check back soon for newly added titles."
        actionLabel="Explore All Titles"
        actionHref="/search"
      />
    );
  }

  let genres: Genre[] = [];
  try {
    genres = await getGenres(category.type);
  } catch {
    genres = [];
  }

  return <BrowseClient results={items} genres={genres} page={page} />;
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  return (
    <main className="page-transition listing-head" style={{ paddingTop: 'calc(68px + 1.5rem)' }}>
      <div className="listing-header" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          {category.icon} {category.name}
        </h1>
        <p style={{ color: 'var(--text-secondary, #94a3b8)', maxWidth: '600px', margin: '0 auto' }}>
          {category.description}
        </p>
      </div>

      <Suspense
        fallback={
          <div className="search-grid-fallback">
            {SKELETONS.map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <CategoryListing params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
