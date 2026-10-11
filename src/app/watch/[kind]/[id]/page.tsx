import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, List, Info } from 'lucide-react';
import WatchClient from './WatchClient';
import { getMovieDetails, getTVDetails, isTMDBConfigured } from '@/lib/tmdb/server';
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

  const backHref =
    type === 'movie' ? movieUrl(details.id, details.title) : tvUrl(details.id, details.title);
  const poster = posterUrl(details.posterPath, 'w185');

  const summary: MediaSummary = {
    id: details.id,
    type: details.type,
    title: details.title,
    posterPath: details.posterPath,
    backdropPath: details.backdropPath,
    overview: details.overview,
    releaseDate: details.releaseDate,
    rating: details.rating,
    genreIds: details.genreIds,
    originalLanguage: details.originalLanguage,
    spokenLanguages: details.spokenLanguages,
    imdbId: details.imdbId,
  };

  return (
    <main className="watch">
      <WatchClient content={summary} />

      <div className="watch__sidebar">
        <div className="watch__card">
          {poster && <img src={poster} alt="" className="watch__poster" />}
          <h1 className="watch__title">{details.title}</h1>
          {details.releaseDate && (
            <p className="watch__meta">
              {details.releaseDate.slice(0, 4)} · {type === 'movie' ? 'Movie' : 'TV Series'}
            </p>
          )}
          <Link href={backHref} className="btn btn--ghost watch__back">
            <ArrowLeft size={16} /> Back to details
          </Link>
          <p className="watch__disclaimer">
            <Info size={13} />
            Playback is provided by third-party services. BakaStream hosts no media, and a provider
            returning a URL is not a claim that the content is licensed.
          </p>
        </div>

        {type === 'tv' && details.seasons.length > 0 && (
          <div className="watch__card">
            <h2 className="watch__card-title">
              <List size={16} /> Episodes
            </h2>
            <EpisodeList tvId={details.id} seasons={details.seasons} />
          </div>
        )}
      </div>
    </main>
  );
}

function EpisodeList({
  tvId,
  seasons,
}: {
  tvId: number;
  seasons: Array<{ seasonNumber: number; name: string; episodeCount: number }>;
}) {
  return (
    <div className="watch__episodes">
      {seasons.map(s => (
        <Link
          key={s.seasonNumber}
          href={`/watch/tv/${tvId}/${s.seasonNumber}/1`}
          className="watch__episode-link"
        >
          {s.name} <span className="watch__episode-count">{s.episodeCount} episodes</span>
        </Link>
      ))}
    </div>
  );
}
