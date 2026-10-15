'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Play, Star, Film, Tv, ChevronDown } from 'lucide-react';
import type { MediaSummary } from '@/types';
import { posterUrl } from '@/lib/tmdb/image';
import { mediaUrl } from '@/utils/slug';
import './CatalogSection.css';

type SortOption = 'latest' | 'az' | 'year' | 'rate';

interface Props {
  title: string;
  type: 'movie' | 'tv';
  items: MediaSummary[];
  viewAllHref?: string;
  onPlay?: (item: MediaSummary) => void;
}

export default function CatalogSection({ title, type, items, viewAllHref, onPlay }: Props) {
  const [activeSort, setActiveSort] = useState<SortOption>('latest');
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Dynamic sorting based on selected criteria
  const sortedItems = useMemo(() => {
    const list = [...items];
    switch (activeSort) {
      case 'az':
        return list.sort((a, b) => {
          const titleA = a.title || '';
          const titleB = b.title || '';
          return titleA.localeCompare(titleB);
        });
      case 'year':
        return list.sort((a, b) => {
          const dateA = a.releaseDate || '0';
          const dateB = b.releaseDate || '0';
          return dateB.localeCompare(dateA);
        });
      case 'rate':
        return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'latest':
      default:
        return list;
    }
  }, [items, activeSort]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollerRef.current) return;
    const scrollAmount = scrollerRef.current.clientWidth * 0.75;
    scrollerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="catalog-section" aria-label={title}>
      <div className="catalog-section__inner">
        {/* Header Bar with Title, Red Underline and Sort Controls */}
        <div className="catalog-section__header">
          <div className="catalog-section__title-wrap">
            <span className="catalog-section__icon">
              {type === 'movie' ? (
                <Film size={22} className="text-red-500" />
              ) : (
                <Tv size={22} className="text-red-500" />
              )}
            </span>
            <div className="catalog-section__title-underline-wrap">
              {viewAllHref ? (
                <Link href={viewAllHref} className="catalog-section__title-link">
                  <h2 className="catalog-section__title">{title}</h2>
                </Link>
              ) : (
                <h2 className="catalog-section__title">{title}</h2>
              )}
              <span className="catalog-section__underline" />
            </div>
          </div>

          {/* Sort By controls: Sort By: Latest ▾, A-Z ▾, Year ▾, Rate ▾ */}
          <div className="catalog-section__controls">
            <span className="catalog-section__sort-label">Sort By:</span>
            <div className="catalog-section__sort-buttons">
              <button
                className={`catalog-section__sort-btn ${
                  activeSort === 'latest' ? 'catalog-section__sort-btn--active' : ''
                }`}
                onClick={() => setActiveSort('latest')}
                type="button"
              >
                <span>Latest</span>
                <ChevronDown size={13} />
              </button>
              <button
                className={`catalog-section__sort-btn ${
                  activeSort === 'az' ? 'catalog-section__sort-btn--active' : ''
                }`}
                onClick={() => setActiveSort('az')}
                type="button"
              >
                <span>A-Z</span>
                <ChevronDown size={13} />
              </button>
              <button
                className={`catalog-section__sort-btn ${
                  activeSort === 'year' ? 'catalog-section__sort-btn--active' : ''
                }`}
                onClick={() => setActiveSort('year')}
                type="button"
              >
                <span>Year</span>
                <ChevronDown size={13} />
              </button>
              <button
                className={`catalog-section__sort-btn ${
                  activeSort === 'rate' ? 'catalog-section__sort-btn--active' : ''
                }`}
                onClick={() => setActiveSort('rate')}
                type="button"
              >
                <span>Rate</span>
                <ChevronDown size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Area */}
        <div className="catalog-section__carousel-wrapper">
          <button
            className="catalog-section__edge-btn catalog-section__edge-btn--left"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            type="button"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="catalog-section__carousel" ref={scrollerRef}>
            {sortedItems.map(item => {
              const itemTitle = item.title || 'Untitled';
              const releaseYear = (item.releaseDate || '').substring(0, 4);
              const rating = item.rating ? item.rating.toFixed(1) : null;
              const href = mediaUrl({ id: item.id, type: item.type || type, title: itemTitle });
              const poster = posterUrl(item.posterPath, 'w342');

              return (
                <Link
                  key={`${item.type || type}-${item.id}`}
                  href={href}
                  className="catalog-card"
                  onClick={e => {
                    if (onPlay) {
                      e.preventDefault();
                      onPlay(item);
                    }
                  }}
                >
                  <div className="catalog-card__poster-wrap">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={itemTitle}
                        fill
                        sizes="(max-width: 768px) 140px, (max-width: 1200px) 180px, 220px"
                        className="catalog-card__img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="catalog-card__placeholder" />
                    )}
                    <div className="catalog-card__play-badge">
                      <Play size={18} fill="currentColor" />
                    </div>
                  </div>

                  <div className="catalog-card__info">
                    <h3 className="catalog-card__title" title={itemTitle}>
                      {itemTitle}
                    </h3>
                    <div className="catalog-card__meta">
                      {releaseYear && <span className="catalog-card__year">{releaseYear}</span>}
                      {rating && (
                        <span className="catalog-card__rating">
                          <Star
                            size={12}
                            className="catalog-card__star"
                            fill="#eab308"
                            stroke="#eab308"
                          />
                          {rating}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <button
            className="catalog-section__edge-btn catalog-section__edge-btn--right"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            type="button"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}
