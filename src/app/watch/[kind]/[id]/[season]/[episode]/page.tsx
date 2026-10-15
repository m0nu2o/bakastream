import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import WatchClient from '../../WatchClient';
import { getTVDetails, getSeasonDetails, isTMDBConfigured } from '@/lib/tmdb/server';
import { posterUrl } from '@/lib/tmdb/image';
import { tvUrl } from '@/utils/slug';
import type { MediaSummary } from '@/types';
import EpisodeNav from '../../EpisodeNav';
import '../../watch.css';

interface PageProps {
  params: Promise<{ id: string; season: string; episode: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) return { title: 'Watch', robots: 'noindex' };
  const show = await getTVDetails(numericId);
  if (!show) return { title: 'Watch', robots: 'noindex' };
  return {
    title: `Watch ${show.title}`,
    description: show.overview.slice(0, 155),
    robots: { index: false, follow: true },
  };
}

export default async function WatchEpisodePage({ params }: PageProps) {
  const { id, season, episode } = await params;
  const tvId = Number(id);
  const seasonNum = Number(season);
  const episodeNum = Number(episode);

  if (
    !Number.isInteger(tvId) ||
    !Number.isInteger(seasonNum) ||
    !Number.isInteger(episodeNum) ||
    !isTMDBConfigured()
  ) {
    notFound();
  }

  const show = await getTVDetails(tvId);
  if (!show) notFound();

  const seasonData = await getSeasonDetails(tvId, seasonNum);
  const current = seasonData?.episodes.find(e => e.episodeNumber === episodeNum) ?? null;
  const poster = posterUrl(show.posterPath, 'w185');

  const summary: MediaSummary = {
    id: show.id,
    type: 'tv',
    title: show.title,
    posterPath: show.posterPath,
    backdropPath: show.backdropPath,
    overview: current ? `${current.name} — ${show.overview}` : show.overview,
    releaseDate: show.releaseDate,
    rating: show.rating,
    genreIds: show.genres ? show.genres.map(g => g.id) : [],
    originalLanguage: show.originalLanguage,
    spokenLanguages: show.spokenLanguages,
    imdbId: show.imdbId,
  };

  return (
    <main className="watch">
      <WatchClient content={summary} season={seasonNum} episode={episodeNum} />

      <div className="watch__sidebar">
        <div className="watch__card">
          {poster && <img src={poster} alt="" className="watch__poster" />}
          <h1 className="watch__title">{show.title}</h1>
          <p className="watch__meta">
            S{seasonNum} · E{episodeNum}
            {current ? ` — ${current.name}` : ''}
          </p>
          <EpisodeNav
            tvId={tvId}
            season={seasonNum}
            episode={episodeNum}
            episodeCount={seasonData?.episodeCount ?? 0}
          />
          <Link href={tvUrl(show.id, show.title)} className="btn btn--ghost watch__back">
            ← Back to details
          </Link>
          <p className="watch__disclaimer">
            Playback is provided by third-party services. BakaStream hosts no media, and a provider
            returning a URL is not a claim that the content is licensed.
          </p>
        </div>

        {seasonData && seasonData.episodes.length > 0 && (
          <div className="watch__card">
            <h2 className="watch__card-title">Season {seasonNum} episodes</h2>
            <div className="watch__episodes">
              {seasonData.episodes.map(ep => (
                <Link
                  key={ep.id}
                  href={`/watch/tv/${tvId}/${seasonNum}/${ep.episodeNumber}`}
                  className={`watch__episode-link ${ep.episodeNumber === episodeNum ? 'watch__episode-link--current' : ''}`}
                >
                  E{ep.episodeNumber} — {ep.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
