import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Info, Star, Calendar } from 'lucide-react';
import WatchClient from './WatchClient';
import SeasonEpisodeSelector from '@/components/player/SeasonEpisodeSelector';
import {
  getMovieDetails,
  getTVDetails,
  getSeasonDetails,
  isTMDBConfigured,
} from '@/lib/tmdb/server';
import { posterUrl } from '@/lib/tmdb/image';
import { movieUrl, tvUrl } from '@/utils/slug';
import type { MediaSummary } from '@/types';

interface PageProps {
  params: Promise<{ kind: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kind, id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return { title: 'Watch', robots: 'noindex' };

  const details =
    kind === 'movie' ? await getMovieDetails(numericId) : await getTVDetails(numericId);
  if (!details) return { title: 'Watch', robots: 'noindex' };

  return {
    title: `Watch ${details.title}`,
    description: details.overview.slice(0, 155),
    robots: { index: false, follow: true },
  };
}

export default async function WatchPage({ params }: PageProps) {
  const { kind, id } = await params;
  const numericId = Number(id);
  const type = kind === 'movie' ? 'movie' : 'tv';

  if (!Number.isInteger(numericId) || !isTMDBConfigured()) notFound();

  const details =
    type === 'movie' ? await getMovieDetails(numericId) : await getTVDetails(numericId);
  if (!details) notFound();

  // For TV shows, pre-fetch Season 1 episodes for instant zero-lag rendering
  const initialSeasonNumber =
    type === 'tv' ? (details.seasons.find(s => s.seasonNumber > 0)?.seasonNumber ?? 1) : 1;

  const seasonData = type === 'tv' ? await getSeasonDetails(numericId, initialSeasonNumber) : null;

  const backHref =
    type === 'movie' ? movieUrl(details.id, details.title) : tvUrl(details.id, details.title);
  const poster = posterUrl(details.posterPath, 'w342');

  const summary: MediaSummary = {
    id: details.id,
    type: details.type,
    title: details.title,
    posterPath: details.posterPath,
    backdropPath: details.backdropPath,
    overview: details.overview,
    releaseDate: details.releaseDate,
    rating: details.rating,
    genreIds: details.genres ? details.genres.map(g => g.id) : [],
    originalLanguage: details.originalLanguage,
    spokenLanguages: details.spokenLanguages,
    imdbId: details.imdbId,
  };

  return (
    <main className="watch">
      <div className="watch__main-col">
        {/* Primary Video Player Stage & Server Deck */}
        <WatchClient content={summary} />

        {/* Cinematic Seasons, 2000+ Episodes & Movie Franchise Browser */}
        <SeasonEpisodeSelector
          mediaType={type}
          mediaId={details.id}
          mediaTitle={details.title}
          currentSeason={initialSeasonNumber}
          currentEpisode={1}
          seasons={type === 'tv' ? details.seasons : []}
          initialEpisodes={seasonData?.episodes ?? []}
          relatedMovies={details.similar ?? []}
        />
      </div>

      <div className="watch__sidebar">
        <div className="watch__card">
          {poster && <img src={poster} alt={details.title} className="watch__poster" />}
          <h1 className="watch__title">{details.title}</h1>
          <div className="watch__meta-chips">
            {details.releaseDate && (
              <span className="watch__chip">
                <Calendar size={11} /> {details.releaseDate.slice(0, 4)}
              </span>
            )}
            {details.rating ? (
              <span className="watch__chip watch__chip--rating">
                <Star size={11} fill="currentColor" /> {details.rating.toFixed(1)}
              </span>
            ) : null}
            <span className="watch__chip">{type === 'movie' ? 'Movie' : 'TV Series'}</span>
          </div>

          {details.overview && <p className="watch__overview-snippet">{details.overview}</p>}

          <Link href={backHref} className="btn btn--ghost watch__back">
            <ArrowLeft size={16} /> Back to details
          </Link>

          <p className="watch__disclaimer">
            <Info size={13} />
            Playback is provided by verified third-party streaming engines. BakaStream hosts no
            files on its servers.
          </p>
        </div>
      </div>
    </main>
  );
}
