'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Play, Star, Bookmark, BookmarkCheck, Film } from 'lucide-react';
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
      <div className="media-card__poster-box">
        <Link href={href} aria-label={content.title} className="media-card__poster-link">
          {poster ? (
            <Image
              src={poster}
              alt={`${content.title} poster`}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 220px"
              className="media-card__img"
              loading="lazy"
            />
          ) : (
            <div className="media-card__placeholder">
              <Film size={28} />
            </div>
          )}
        </Link>

        {/* Center Hover Play Button */}
        <div className="media-card__play-overlay">
          {onPlay ? (
            <button
              type="button"
              className="media-card__play-btn"
              aria-label={`Play ${content.title}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPlay(content);
              }}
            >
              <Play size={18} fill="currentColor" />
            </button>
          ) : (
            <Link href={href} className="media-card__play-btn" aria-label={`Open ${content.title}`}>
              <Play size={18} fill="currentColor" />
            </Link>
          )}
        </div>

        {/* Save to Watchlist Button */}
        <button
          type="button"
          className={`media-card__save ${saved ? 'media-card__save--on' : ''}`}
          aria-label={saved ? 'Remove from watchlist' : 'Save to watchlist'}
          title={saved ? 'In Watchlist (Click to remove)' : 'Save to Watchlist'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWatchlist(content);
          }}
        >
          {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
        </button>
      </div>

      {/* Info Block (Inset container exactly like the reference design) */}
      <div className="media-card__info">
        <Link href={href} className="media-card__title" title={content.title}>
          {content.title}
        </Link>
        <div className="media-card__meta">
          <span className="media-card__year">
            {year || (content.type === 'movie' ? 'Movie' : 'TV')}
          </span>
          {rating ? (
            <span className="media-card__rating">
              <Star size={11} className="media-card__star" fill="#ffb800" stroke="#ffb800" />
              <span>{rating}</span>
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
