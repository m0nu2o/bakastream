import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Play, Star, Calendar, Clock, ExternalLink, Volume2 } from 'lucide-react';
import StateView from '@/components/StateView';
import MediaRow from '@/components/MediaRow';
import WatchlistButton from '@/components/WatchlistButton';
import { getMovieDetails, isTMDBConfigured } from '@/lib/tmdb/server';
import { posterUrl, backdropUrl, profileUrl } from '@/lib/tmdb/image';
import { watchMovieUrl, parseIdFromSlug } from '@/utils/slug';
import { discoverLanguages } from '@/lib/languages';
import './detail.css';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const id = parseIdFromSlug(slug);
  if (!id) return { title: 'Movie Not Found', robots: 'noindex' };

  const movie = await getMovieDetails(id);
  if (!movie) return { title: 'Movie Not Found', robots: 'noindex' };

  const title = `Watch ${movie.title} (${movie.releaseDate?.slice(0, 4) ?? ''})`;
  const description =
    movie.overview.slice(0, 155) ||
    `Stream ${movie.title} and explore cast, ratings and similar movies.`;
  const image = posterUrl(movie.posterPath, 'w500') ?? undefined;

  return {
    title,
    description,
    alternates: { canonical: `/movie/${slug}` },
    openGraph: { title, description, type: 'video.movie', images: image ? [image] : [] },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : [] },
  };
}

export const revalidate = 3600;

export default async function MoviePage({ params }: PageProps) {
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

  const movie = await getMovieDetails(id);
  if (!movie) notFound();

  const year = movie.releaseDate?.slice(0, 4);
  const backdrop = backdropUrl(movie.backdropPath, 'original');
  const poster = posterUrl(movie.posterPath, 'w500');
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;

  const languages = discoverLanguages({
    originalLanguage: movie.originalLanguage,
    spokenLanguages: movie.spokenLanguages,
    isAnime: movie.genreIds.includes(16),
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
                alt={`${movie.title} poster`}
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
            {movie.tagline && <p className="detail-hero__tagline">{movie.tagline}</p>}
            <h1 className="detail-hero__title">{movie.title}</h1>

            <div className="detail-hero__meta">
              {year && (
                <span className="detail-hero__meta-item">
                  <Calendar size={14} /> {year}
                </span>
              )}
              {runtime && (
                <span className="detail-hero__meta-item">
                  <Clock size={14} /> {runtime}
                </span>
              )}
              {movie.rating != null && movie.rating > 0 && (
                <span className="detail-hero__meta-item detail-hero__meta-item--rating">
                  <Star size={14} /> {movie.rating.toFixed(1)}
                  <span className="detail-hero__rating-denom">/10</span>
                </span>
              )}
              {movie.status && <span className="badge badge--muted">{movie.status}</span>}
            </div>

            {movie.genres.length > 0 && (
              <div className="detail-hero__genres">
                {movie.genres.map(g => (
                  <Link key={g.id} href={`/movies?genre=${g.id}`} className="badge badge--accent">
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
                  <span
                    className={`badge ${languages.originalLanguage?.code === 'hi' ? 'badge--accent' : 'badge--hindi'}`}
                  >
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

            {movie.overview && <p className="detail-hero__overview">{movie.overview}</p>}

            <div className="detail-hero__actions">
              <Link href={watchMovieUrl(movie.id)} className="btn btn--primary">
                <Play size={18} fill="currentColor" /> Watch now
              </Link>
              {movie.trailerKey && (
                <a
                  href={`https://www.youtube.com/watch?v=${movie.trailerKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--secondary"
                >
                  Trailer <ExternalLink size={14} />
                </a>
              )}
              <WatchlistButton content={{ ...movie }} />
            </div>

            {movie.watchProviders &&
              (movie.watchProviders.subscription.length > 0 ||
                movie.watchProviders.rent.length > 0) && (
                <div className="detail-hero__providers">
                  <span className="detail-hero__providers-label">Also on</span>
                  {movie.watchProviders.subscription.slice(0, 5).map(p => (
                    <span key={p.id} className="badge badge--muted">
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
          </div>
        </div>
      </section>

      {movie.cast.length > 0 && (
        <section className="detail-section">
          <h2 className="detail-section__title">Top cast</h2>
          <div className="cast-rail">
            {movie.cast.slice(0, 12).map(person => (
              <div key={person.id} className="cast-card">
                {profileUrl(person.profilePath) ? (
                  <Image
                    src={profileUrl(person.profilePath) as string}
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
            ))}
          </div>
        </section>
      )}

      {movie.similar.length > 0 && <MediaRow title="More like this" items={movie.similar} />}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Movie',
            name: movie.title,
            description: movie.overview,
            image: poster,
            datePublished: movie.releaseDate,
            genre: movie.genres.map(g => g.name),
            aggregateRating: movie.rating
              ? {
                  '@type': 'AggregateRating',
                  ratingValue: movie.rating.toFixed(1),
                  bestRating: '10',
                  ratingCount: 1,
                }
              : undefined,
          }),
        }}
      />
    </main>
  );
}
