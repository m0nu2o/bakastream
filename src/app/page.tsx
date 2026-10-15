import type { Metadata } from 'next';
import Link from 'next/link';
import './home.css';
import Hero from '@/components/Hero';
import TrendingShowcase from '@/components/TrendingShowcase';
import WatchingBanner from '@/components/WatchingBanner';
import CatalogSection from '@/components/CatalogSection';
import MediaRow from '@/components/MediaRow';
import GenreSpotlight from '@/components/GenreSpotlight';
import StateView from '@/components/StateView';
import { getHomeData } from '@/lib/tmdb/server';
import type { Genre } from '@/types';

export const metadata: Metadata = {
  title: 'BakaStream | Watch Movies & TV Shows Online',
  description:
    'Browse trending, popular and top-rated movies and TV shows on BakaStream. Build a watchlist, resume watching and discover something great tonight.',
  alternates: { canonical: '/' },
};

export const revalidate = 900; // refresh homepage data every 15 min

const GENRE_SPOTLIGHT = [28, 35, 27, 16, 10749, 53]; // Action, Comedy, Horror, Animation, Romance, Thriller

async function HomeContent() {
  let data: Awaited<ReturnType<typeof getHomeData>> | null = null;

  try {
    data = await getHomeData();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="home__body">
        <StateView
          kind="network"
          title="Couldn't load the catalog"
          message="TMDB did not respond. If you are running locally, make sure TMDB_API_KEY or TMDB_ACCESS_TOKEN is set in .env.local, then retry."
          actionLabel="Retry"
          actionHref="/"
        />
      </div>
    );
  }

  const genreName = (id: number): string =>
    data?.genres.find((g: Genre) => g.id === id)?.name ?? 'Browse';

  // Dynamic watching item from real trending titles
  const watchingItem = data.trending.length > 0 ? data.trending[0] : null;

  return (
    <div className="home__body">
      {/* ── 1. DYNAMIC DATA-DRIVEN HERO SHOWCASE ── */}
      {data.featured.length > 0 ? (
        <Hero items={data.featured} genres={data.genres} />
      ) : (
        <div style={{ height: '68px' }} />
      )}

      {/* ── 2. TRENDING SHOWCASE & INTERACTIVE GENRE CHIPS ── */}
      <TrendingShowcase
        trendingItems={data.trending}
        popularItems={data.popularMovies}
        recentItems={data.recentlyAdded}
        genres={data.genres}
      />

      {/* ── 3. DYNAMIC "WATCHING" SPOTLIGHT BANNER ── */}
      {watchingItem && <WatchingBanner item={watchingItem} />}

      {/* ── 4. MOVIES CATALOG (Interactive Sort: Latest, A-Z, Year, Rate) ── */}
      <CatalogSection
        title="Movies"
        type="movie"
        items={data.popularMovies}
        viewAllHref="/movies"
      />

      {/* ── 5. SERIES CATALOG (Interactive Sort: Latest, A-Z, Year, Rate) ── */}
      <CatalogSection
        title="Series"
        type="tv"
        items={data.popularTV}
        viewAllHref="/tv"
      />

      {/* ── 6. CENTRAL DISCOVERY "+" EXPLORE BUTTON ── */}
      <div className="home-explore-more">
        <Link
          href="/search"
          className="home-explore-more__btn"
          aria-label="Explore more titles"
          title="Explore more"
        >
          <span>+</span>
        </Link>
      </div>

      {/* ── 7. PRESERVED RICH MULTILINGUAL & SPECIALIZED CATEGORIES ── */}
      <MediaRow
        title="Bollywood & Hindi Movies"
        items={data.hindiMovies}
        seeAllHref={{ href: '/category/bollywood' }}
      />
      <MediaRow
        title="Popular Hindi Web Series"
        items={data.hindiTV}
        seeAllHref={{ href: '/category/hindi-web-series' }}
      />
      <MediaRow
        title="Hindi Serials & Indian TV"
        items={data.hindiSerials}
        seeAllHref={{ href: '/category/hindi-serials' }}
      />
      <MediaRow
        title="Trending K-Dramas"
        items={data.kdrama}
        seeAllHref={{ href: '/category/kdrama' }}
      />
      <MediaRow
        title="Anime"
        items={data.anime}
        seeAllHref={{ href: '/category/anime' }}
      />
      <MediaRow
        title="Top rated movies"
        items={data.topRatedMovies}
        seeAllHref={{ href: '/movies?sort=vote' }}
      />
      <MediaRow
        title="Top rated series"
        items={data.topRatedTV}
        seeAllHref={{ href: '/tv?sort=vote' }}
      />

      {GENRE_SPOTLIGHT.map((id) => (
        <GenreSpotlight key={id} genreId={id} name={genreName(id)} />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="page-transition">
      <HomeContent />
    </main>
  );
}
