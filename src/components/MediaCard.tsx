'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Play, Star, Bookmark, BookmarkCheck, Info } from 'lucide-react';
import type { MediaSummary } from '@/types';
import { posterUrl } from '@/lib/tmdb/image';
import { mediaUrl } from '@/utils/slug';
import { toggleWatchlist } from '@/lib/storage';
import { useIsInWatchlist } from '@/hooks/useStoredCollection';
import './MediaCard.css';

interface Props {
  content: MediaSummary;
  /** When provided, the play button opens the in-page player overlay. */
  onPlay?: (content: MediaSummary) => void;
}

export default function MediaCard({ content, onPlay }: Props) {
  const poster = posterUrl(content.posterPath, 'w500');
  const year = content.releaseDate ? content.releaseDate.slice(0, 4) : null;
  const rating = content.rating && content.rating > 0 ? content.rating.toFixed(1) : null;
  const saved = useIsInWatchlist(content.type, content.id);

  const href = mediaUrl(content);

  return (
    <article className="media-card">
      <div className="media-card__frame">
        <Link href={href} aria-label={content.title} className="media-card__poster-link">
          {poster ? (
            <Image
              src={poster}
              alt={`${content.title} poster`}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 200px"
              className="media-card__img"
              loading="lazy"
            />
          ) : (
            <span className="media-card__placeholder" aria-hidden="true">
              <Info size={30} />
            </span>
          )}
        </Link>

        <div className="media-card__hover">
          {onPlay ? (
            <button
              className="media-card__play"
              aria-label={`Play ${content.title}`}
              onClick={() => onPlay(content)}
            >
              <Play size={18} fill="currentColor" />
            </button>
          ) : (
            <Link href={href} className="media-card__play" aria-label={`Open ${content.title}`}>
              <Play size={18} fill="currentColor" />
            </Link>
          )}
        </div>

        {rating && (
          <span className="media-card__rating">
            <Star size={11} /> {rating}
          </span>
        )}

        <button
          className={`media-card__save ${saved ? 'media-card__save--on' : ''}`}
          aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'}
          title={saved ? 'In watchlist' : 'Add to watchlist'}
          onClick={() => toggleWatchlist(content)}
        >
          {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </button>
      </div>

      <Link href={href} className="media-card__body" draggable={false}>
        <h3 className="media-card__title" title={content.title}>
          {content.title}
        </h3>
        <p className="media-card__meta">
          {year && <span>{year}</span>}
          <span className="media-card__type">
            {content.type === 'movie' ? 'Movie' : 'TV Series'}
          </span>
        </p>
      </Link>
    </article>
  );
}
