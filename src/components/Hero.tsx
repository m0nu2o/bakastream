'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Info, Star, Calendar, ChevronLeft, ChevronRight, Clapperboard } from 'lucide-react';
import type { MediaSummary } from '@/types';
import { backdropUrl } from '@/lib/tmdb/image';
import { mediaUrl } from '@/utils/slug';
import './Hero.css';

const AUTOPLAY_MS = 8000;

export default function Hero({ items }: { items: MediaSummary[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    timer.current = setInterval(() => setIndex(i => (i + 1) % items.length), AUTOPLAY_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [items.length, paused]);

  const go = useCallback(
    (dir: 1 | -1) => setIndex(i => (i + dir + items.length) % items.length),
    [items.length]
  );

  if (!items.length) return null;
  const item = items[Math.min(index, items.length - 1)];
  const backdrop =
    backdropUrl(item.backdropPath, 'original') ?? backdropUrl(item.posterPath, 'w780');
  const year = item.releaseDate ? item.releaseDate.slice(0, 4) : null;

  return (
    <section
      className="hero"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {backdrop && (
        <Image
          key={`hero-bg-${item.type}-${item.id}`}
          src={backdrop}
          alt=""
          fill
          priority={index === 0}
          sizes="100vw"
          className="hero__backdrop"
        />
      )}
      <div className="hero__shade" aria-hidden="true" />

      <div className="hero__content" key={`hero-content-${item.type}-${item.id}`}>
        <span className="hero__kicker">
          <Clapperboard size={14} /> Featured {item.type === 'movie' ? 'Movie' : 'Series'}
        </span>
        <h1 className="hero__title">{item.title}</h1>
        <div className="hero__meta">
          {year && (
            <span className="hero__meta-item">
              <Calendar size={14} /> {year}
            </span>
          )}
          {item.rating != null && item.rating > 0 && (
            <span className="hero__meta-item hero__meta-item--rating">
              <Star size={14} /> {item.rating.toFixed(1)}
              <span className="hero__rating-denom">/10</span>
            </span>
          )}
          <span className="hero__badge">{item.type === 'movie' ? 'Movie' : 'TV Series'}</span>
        </div>
        {item.overview && <p className="hero__overview">{item.overview}</p>}
        <div className="hero__actions">
          <Link href={mediaUrl(item)} className="btn btn--primary">
            <Play size={18} fill="currentColor" /> Watch now
          </Link>
          <Link href={mediaUrl(item)} className="btn btn--secondary">
            <Info size={18} /> More info
          </Link>
        </div>
      </div>

      {items.length > 1 && (
        <>
          <button
            className="hero__arrow hero__arrow--left"
            onClick={() => go(-1)}
            aria-label="Previous slide"
          >
            <ChevronLeft size={30} />
          </button>
          <button
            className="hero__arrow hero__arrow--right"
            onClick={() => go(1)}
            aria-label="Next slide"
          >
            <ChevronRight size={30} />
          </button>
          <div className="hero__indicators">
            {items.map((_, i) => (
              <button
                key={i}
                className={`hero__dot ${i === index ? 'hero__dot--active' : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
