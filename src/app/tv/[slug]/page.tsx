import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Play, Star, Calendar, ExternalLink, Volume2 } from 'lucide-react';
import StateView from '@/components/StateView';
import MediaRow from '@/components/MediaRow';
import WatchlistButton from '@/components/WatchlistButton';
import { getTVDetails, isTMDBConfigured } from '@/lib/tmdb/server';
import { posterUrl, backdropUrl, profileUrl } from '@/lib/tmdb/image';
import { watchTVUrl, parseIdFromSlug } from '@/utils/slug';
import { discoverLanguages } from '@/lib/languages';
import EpisodeBrowser from './EpisodeBrowserClient';
import './detail.css';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const id = parseIdFromSlug(slug);
  if (!id) return { title: 'Show Not Found', robots: 'noindex' };

  const show = await getTVDetails(id);
  if (!show) return { title: 'Show Not Found', robots: 'noindex' };

  const title = `Watch ${show.title}${show.releaseDate ? ` (${show.releaseDate.slice(0, 4)})` : ''}`;
  const description =
    show.overview.slice(0, 155) || `Stream ${show.title} and browse every season and episode.`;
  const image = posterUrl(show.posterPath, 'w500') ?? undefined;

  return {
    title,
    description,
    alternates: { canonical: `/tv/${slug}` },
    openGraph: { title, description, type: 'video.tv_show', images: image ? [image] : [] },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
  };
}

export const revalidate = 3600;

export default async function TVPage({ params }: PageProps) {
  const { slug } = await params;
  const id = parseIdFromSlug(slug);
  if (!id) notFound();

  if (!isTMDBConfigured()) {
    return (
      <main className="detail-page">
        <StateView
          kind="network"
          title="Metadata service not configured"
          message="The server has no TMDB credentials. Set TMDB_API_KEY (or TMDB_ACCESS_TOKEN) in .env.local and restart — see .env.example."
          actionLabel="Go home"
        />
      </main>
    );
  }

  const show = await getTVDetails(id);
  if (!show) notFound();

  const year = show.releaseDate?.slice(0, 4);
  const backdrop = backdropUrl(show.backdropPath, 'original');
  const poster = posterUrl(show.posterPath, 'w500');

  const languages = discoverLanguages({
    originalLanguage: show.originalLanguage,
    spokenLanguages: show.spokenLanguages,
    isAnime: show.genreIds.includes(16),
  });

  return (
    <main className="detail-page page-transition">
      <section className="detail-hero">
        {backdrop && (
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="detail-hero__backdrop"
          />
        )}
        <div className="detail-hero__shade" aria-hidden="true" />

        <div className="detail-hero__content">
          <div className="detail-hero__poster">
            {poster ? (
              <Image
                src={poster}
                alt={`${show.title} poster`}
                width={280}
                height={420}
                className="detail-hero__poster-img"
              />
            ) : (
              <div
                className="detail-hero__poster-img detail-hero__poster-img--empty"
                aria-hidden="true"
              />
            )}
          </div>

          <div className="detail-hero__info">
            {show.tagline && <p className="detail-hero__tagline">{show.tagline}</p>}
            <h1 className="detail-hero__title">{show.title}</h1>

            <div className="detail-hero__meta">
              {year && (
                <span className="detail-hero__meta-item">
                  <Calendar size={14} /> {year}
                </span>
              )}
              {show.numberOfSeasons != null && (
                <span className="detail-hero__meta-item">
                  {show.numberOfSeasons} season{show.numberOfSeasons === 1 ? '' : 's'}
                  {show.numberOfEpisodes != null ? ` · ${show.numberOfEpisodes} episodes` : ''}
                </span>
              )}
              {show.rating != null && show.rating > 0 && (
                <span className="detail-hero__meta-item detail-hero__meta-item--rating">
                  <Star size={14} /> {show.rating.toFixed(1)}
                  <span className="detail-hero__rating-denom">/10</span>
                </span>
              )}
              {show.status && <span className="badge badge--muted">{show.status}</span>}
            </div>

            {show.genres.length > 0 && (
              <div className="detail-hero__genres">
                {show.genres.map(g => (
                  <Link key={g.id} href={`/tv?genre=${g.id}`} className="badge badge--accent">
                    {g.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Available Languages Section */}
            <div className="detail-hero__languages" aria-label="Available audio languages">
              <span className="detail-hero__languages-title">
                <Volume2 size={13} /> Available Languages:
              </span>
              <div className="detail-hero__languages-list">
                {languages.hasHindiAudio && (
                  <span className={`badge ${languages.originalLanguage?.code === 'hi' ? 'badge--accent' : 'badge--hindi'}`}>
                    🇮🇳 Hindi {languages.originalLanguage?.code === 'hi' ? '(Original)' : '(Dubbed)'}
                  </span>
                )}
                {languages.audioLanguages
                  .filter(l => l.code !== 'hi')
                  .map(lang => (
                    <span key={lang.code} className="badge badge--muted">
                      {lang.flag} {lang.label} {lang.kind === 'original' ? '(Original)' : ''}
                    </span>
                  ))}
              </div>
            </div>

            {show.overview && <p className="detail-hero__overview">{show.overview}</p>}

            <div className="detail-hero__actions">
              <Link
                href={watchTVUrl(show.id, show.seasons[0]?.seasonNumber ?? 1, 1)}
                className="btn btn--primary"
              >
                <Play size={18} fill="currentColor" /> Watch S1 E1
              </Link>
              {show.trailerKey && (
                <a
                  href={`https://www.youtube.com/watch?v=${show.trailerKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--secondary"
                >
                  Trailer <ExternalLink size={14} />
                </a>
              )}
              <WatchlistButton content={{ ...show }} />
            </div>

            {show.watchProviders &&
              show.watchProviders.subscription.length + show.watchProviders.rent.length > 0 && (
                <div className="detail-hero__providers">
                  <span className="detail-hero__providers-label">Also on</span>
                  {show.watchProviders.subscription.slice(0, 5).map(p => (
                    <span key={p.id} className="badge badge--muted">
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
          </div>
        </div>
      </section>

      <EpisodeBrowser tvId={show.id} seasons={show.seasons} />

      {show.cast.length > 0 && (
        <section className="detail-section">
          <h2 className="detail-section__title">Top cast</h2>
          <div className="cast-rail">
            {show.cast.slice(0, 12).map(person => {
              const img = profileUrl(person.profilePath);
              return (
                <div key={person.id} className="cast-card">
                  {img ? (
                    <Image
                      src={img}
                      alt={person.name}
                      width={92}
                      height={92}
                      className="cast-card__img"
                    />
                  ) : (
                    <div className="cast-card__img cast-card__img--empty" aria-hidden="true">
                      {person.name.charAt(0)}
                    </div>
                  )}
                  <p className="cast-card__name">{person.name}</p>
                  {person.character && <p className="cast-card__role">{person.character}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {show.similar.length > 0 && <MediaRow title="More like this" items={show.similar} />}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'TVSeries',
            name: show.title,
            description: show.overview,
            image: poster,
            numberOfSeasons: show.numberOfSeasons ?? undefined,
            genre: show.genres.map(g => g.name),
          }),
        }}
      />
    </main>
  );
}
