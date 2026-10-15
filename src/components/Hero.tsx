'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Info, Star, Calendar, ChevronLeft, ChevronRight, Clapperboard, ChevronDown, ChevronUp } from 'lucide-react';
import type { MediaSummary, Genre } from '@/types';
import { backdropUrl } from '@/lib/tmdb/image';
import { mediaUrl } from '@/utils/slug';
import './Hero.css';

const AUTOPLAY_MS = 8000;

interface Props {
  items: MediaSummary[];
  genres?: Genre[];
}

export default function Hero({ items, genres = [] }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % items.length), AUTOPLAY_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [items.length, paused]);

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + items.length) % items.length),
    [items.length]
  );

  if (!items.length) return null;
  const item = items[Math.min(index, items.length - 1)];
  const backdrop =
    backdropUrl(item.backdropPath, 'original') ?? backdropUrl(item.posterPath, 'w780');
  const year = item.releaseDate ? item.releaseDate.slice(0, 4) : null;
  const rating = item.rating != null && item.rating > 0 ? item.rating.toFixed(1) : null;
  const watchHref = `/watch/${item.type}/${item.id}`;

  const genreList = item.genreIds
    ?.map((id) => genres.find((g) => g.id === id)?.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(' • ') || (item.type === 'movie' ? 'Feature Film' : 'TV Series');

  return (
    <section
      className="hero"
      aria-label="Featured Showcase"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Dynamic High-Res Backdrop Image ── */}
      {backdrop && (
        <Image
          key={`hero-bg-${item.type}-${item.id}`}
          src={backdrop}
          alt={item.title}
          fill
          priority={index === 0}
          sizes="100vw"
          className="hero__backdrop"
        />
      )}

      {/* ── Cinematic Shadow / Vignette Gradient ── */}
      <div className="hero__shade" aria-hidden="true" />

      {/* ── Main Hero Stage Content ── */}
      <div className="hero__content" key={`hero-content-${item.type}-${item.id}`}>
        <span className="hero__kicker">
          <Clapperboard size={14} /> Featured {item.type === 'movie' ? 'Movie' : 'Series'}
        </span>

        <h1 className="hero__title">{item.title}</h1>

        <div className="hero__meta">
          {rating && (
            <span className="hero__meta-item hero__meta-item--rating">
              <Star size={14} fill="#ffb800" stroke="#ffb800" /> {rating}
              <span className="hero__rating-denom">/10</span>
            </span>
          )}
          {year && (
            <span className="hero__meta-item">
              <Calendar size={13} /> {year}
            </span>
          )}
          <span className="hero__badge hero__badge--type">
            {item.type === 'movie' ? 'Movie' : 'TV Series'}
          </span>
          <span className="hero__badge hero__badge--hd">HD</span>
          <span className="hero__genre-tag">{genreList}</span>
        </div>

        {item.overview && <p className="hero__overview">{item.overview}</p>}

        <div className="hero__actions">
          <Link href={watchHref} className="hero__watch-btn" aria-label={`Watch ${item.title}`}>
            <span className="hero__watch-icon">▶</span>
            <span>Watch now</span>
          </Link>
          <Link href={mediaUrl(item)} className="hero__info-btn" aria-label={`Details for ${item.title}`}>
            <Info size={16} />
            <span>More info</span>
          </Link>
        </div>
      </div>

      {/* ── Vertical Slide Indicators (Right Edge) ── */}
      {items.length > 1 && (
        <div className="hero__vertical-dots" aria-label="Slide indicators">
          {items.slice(0, 5).map((slideItem, i) => (
            <button
              key={slideItem.id || i}
              className={`hero__vdot ${i === index ? 'hero__vdot--active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Switch to slide ${i + 1}: ${slideItem.title}`}
              title={slideItem.title}
              type="button"
            />
          ))}
        </div>
      )}
    </section>
  );
}
