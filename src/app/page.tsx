import type { Metadata } from 'next';
import Link from 'next/link';
import './home.css';
import Hero from '@/components/Hero';
import TrendingShowcase from '@/components/TrendingShowcase';
import WatchingBanner from '@/components/WatchingBanner';
import CatalogSection from '@/components/CatalogSection';
import GenreSpotlight from '@/components/GenreSpotlight';
import WeeklySchedule from '@/components/WeeklySchedule';
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

  // Dynamic spotlight title from trending catalog
  const spotlightItem = data.trending.length > 0 ? data.trending[0] : null;

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

      {/* ── 3. DYNAMIC CONTINUE WATCHING / SPOTLIGHT BANNER ── */}
      {spotlightItem && <WatchingBanner item={spotlightItem} />}

      {/* ── 4. MOVIES CATALOG (Interactive Sort: Latest, A-Z, Year, Rate) ── */}
      <CatalogSection
        title="Movies"
        type="movie"
        items={data.popularMovies}
        viewAllHref="/movies"
      />

      {/* ── 5. SERIES CATALOG (Interactive Sort: Latest, A-Z, Year, Rate) ── */}
      <CatalogSection title="Series" type="tv" items={data.popularTV} viewAllHref="/tv" />

      {/* ── 6. ALL SPECIALIZED & MULTILINGUAL CATEGORIES (UNIFIED CATALOG DESIGN) ── */}
      <CatalogSection
        title="Bollywood & Hindi Movies"
        type="movie"
        items={data.hindiMovies}
        viewAllHref="/category/bollywood"
      />
      <CatalogSection
        title="Popular Hindi Web Series"
        type="tv"
        items={data.hindiTV}
        viewAllHref="/category/hindi-web-series"
      />
      <CatalogSection
        title="Hindi Serials & Indian TV"
        type="tv"
        items={data.hindiSerials}
        viewAllHref="/category/hindi-serials"
      />
      <CatalogSection
        title="Trending K-Dramas"
        type="tv"
        items={data.kdrama}
        viewAllHref="/category/kdrama"
      />
      <CatalogSection
        title="Anime"
        type="tv"
        items={data.anime}
        viewAllHref="/category/anime"
      />
      <CatalogSection
        title="Top rated movies"
        type="movie"
        items={data.topRatedMovies}
        viewAllHref="/movies?sort=vote"
      />
      <CatalogSection
        title="Top rated series"
        type="tv"
        items={data.topRatedTV}
        viewAllHref="/tv?sort=vote"
      />

      {/* ── 7. GENRE SPOTLIGHTS (ACTION, COMEDY, HORROR, ANIMATION, ROMANCE, THRILLER) ── */}
      {GENRE_SPOTLIGHT.map(id => (
        <GenreSpotlight key={id} genreId={id} name={genreName(id)} />
      ))}

      {/* ── 8. WEEKLY RELEASE SCHEDULE (CALENDAR AT END OF HOME PAGE) ── */}
      <WeeklySchedule isEmbedded={true} />
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
