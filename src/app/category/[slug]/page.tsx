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
    <main className="page-transition listing-head" style={{ paddingTop: 'calc(68px + 1.25rem)' }}>
      <div
        className="category-hero-header"
        style={{
          marginBottom: '2rem',
          textAlign: 'center',
          padding: '2.5rem 1.5rem 2rem',
          position: 'relative',
          borderRadius: '20px',
          background: 'linear-gradient(180deg, rgba(244, 59, 76, 0.08) 0%, rgba(16, 16, 26, 0.4) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
          maxWidth: '1200px',
          margin: '0 auto 2rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'rgba(244, 59, 76, 0.15)',
            border: '1px solid rgba(244, 59, 76, 0.35)',
            boxShadow: '0 0 24px rgba(244, 59, 76, 0.35)',
            fontSize: '32px',
            marginBottom: '1rem',
          }}
        >
          {category.icon}
        </div>

        <h1
          style={{
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            fontWeight: '900',
            letterSpacing: '-0.02em',
            marginBottom: '0.65rem',
            color: 'var(--text-primary, #ffffff)',
          }}
        >
          {category.name}
        </h1>

        <p
          style={{
            color: 'var(--text-secondary, #94a3b8)',
            maxWidth: '620px',
            margin: '0 auto 1.25rem',
            fontSize: '0.95rem',
            lineHeight: '1.6',
          }}
        >
          {category.description}
        </p>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.74rem',
              fontWeight: '700',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-secondary, #cbd5e1)',
            }}
          >
            ⚡ Fast CDN
          </span>
          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.74rem',
              fontWeight: '700',
              background: 'rgba(244, 59, 76, 0.15)',
              border: '1px solid rgba(244, 59, 76, 0.3)',
              color: 'var(--accent, #f43b4c)',
            }}
          >
            🛡️ Ad Shield Protected
          </span>
          <span
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.74rem',
              fontWeight: '700',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-secondary, #cbd5e1)',
            }}
          >
            🎬 1080p Ultra HD
          </span>
        </div>
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
