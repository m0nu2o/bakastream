'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Star, Film } from 'lucide-react';
import type { MediaSummary } from '@/types';
import { posterUrl } from '@/lib/tmdb/image';
import { mediaUrl } from '@/utils/slug';
import ShelfSelector from '@/components/ShelfSelector';
import './MediaCard.css';

interface Props {
  content: MediaSummary;
  /** When provided, the play button opens the in-page player overlay. */
  onPlay?: (content: MediaSummary) => void;
  /** Optional custom badge (e.g. for release calendar) */
  customBadge?: string;
}

export default function MediaCard({ content, onPlay, customBadge }: Props) {
  const poster = posterUrl(content.posterPath, 'w500');
  const year = content.releaseDate ? content.releaseDate.slice(0, 4) : null;
  const rating = content.rating && content.rating > 0 ? content.rating.toFixed(1) : null;
  const href = mediaUrl(content);

  return (
    <article className="media-card">
      <div className="media-card__poster-box">
        <Link
          href={href}
          prefetch={true}
          aria-label={content.title}
          className="media-card__poster-link"
        >
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

          {/* Smooth Dark Cinematic Vignette Overlay on Hover */}
          <div className="media-card__overlay" aria-hidden="true" />
        </Link>

        {/* Quality Indicator Pill (Top-Left) */}
        <div className="media-card__badge-pill">
          {customBadge || (content.type === 'tv' ? 'TV' : 'HD')}
        </div>

        {/* Shelf & Watchlist Status Action (Top-Right - Completely separated from HD badge) */}
        <ShelfSelector content={content} variant="card-badge" />

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
              <Play size={20} fill="currentColor" />
            </button>
          ) : (
            <Link
              href={href}
              className="media-card__play-btn"
              aria-label={`Play ${content.title}`}
            >
              <Play size={20} fill="currentColor" />
            </Link>
          )}
        </div>
      </div>

      {/* Info Block (Inset container with clean typography and metadata) */}
      <div className="media-card__info">
        <Link href={href} prefetch={true} className="media-card__title" title={content.title}>
          {content.title}
        </Link>
        <div className="media-card__meta">
          <span className="media-card__year">
            {year || (content.type === 'movie' ? 'Movie' : 'TV')}
          </span>
          {rating ? (
            <span className="media-card__rating">
              <Star size={11.5} className="media-card__star" fill="#ffb800" stroke="#ffb800" />
              <span>{rating}</span>
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
