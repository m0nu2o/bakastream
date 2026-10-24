'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Star,
  Film,
  Tv,
  ChevronDown,
  Sparkles,
  Flame,
  Smile,
  Ghost,
  Heart,
} from 'lucide-react';
import type { MediaSummary } from '@/types';
import MediaCard from '@/components/MediaCard';
import './CatalogSection.css';

type SortOption = 'latest' | 'az' | 'year' | 'rate';

interface Props {
  title: string;
  type: 'movie' | 'tv';
  items: MediaSummary[];
  viewAllHref?: string;
  onPlay?: (item: MediaSummary) => void;
  icon?: React.ReactNode;
}

export default function CatalogSection({ title, type, items, viewAllHref, onPlay, icon }: Props) {
  const [activeSort, setActiveSort] = useState<SortOption>('latest');
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Dynamic sorting based on selected criteria
  const sortedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
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

  if (!items || items.length === 0) return null;

  const renderIcon = () => {
    if (icon) return icon;
    const lower = title.toLowerCase();
    if (lower.includes('anime')) {
      return <Sparkles size={22} className="text-red-500" />;
    }
    if (lower.includes('top rated')) {
      return <Star size={22} className="text-red-500" />;
    }
    if (lower.includes('action') || lower.includes('thriller')) {
      return <Flame size={22} className="text-red-500" />;
    }
    if (lower.includes('comedy')) {
      return <Smile size={22} className="text-red-500" />;
    }
    if (lower.includes('horror')) {
      return <Ghost size={22} className="text-red-500" />;
    }
    if (lower.includes('romance')) {
      return <Heart size={22} className="text-red-500" />;
    }
    return type === 'movie' ? (
      <Film size={22} className="text-red-500" />
    ) : (
      <Tv size={22} className="text-red-500" />
    );
  };

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
        {/* Header Bar with Title and Actions */}
        <div className="catalog-section__header">
          <div className="catalog-section__title-wrap">
            <span className="catalog-section__icon" aria-hidden="true">
              {renderIcon()}
            </span>
            {viewAllHref ? (
              <Link href={viewAllHref} className="catalog-section__title-link">
                <h2 className="catalog-section__title">{title}</h2>
              </Link>
            ) : (
              <h2 className="catalog-section__title">{title}</h2>
            )}
          </div>

          <div className="catalog-section__header-actions">
            {/* Desktop sort tabs */}
            <div className="catalog-section__sort-buttons catalog-section__sort-buttons--desktop" role="group" aria-label="Sort options">
              <button
                className={`catalog-section__sort-btn ${
                  activeSort === 'latest' ? 'catalog-section__sort-btn--active' : ''
                }`}
                onClick={() => setActiveSort('latest')}
                type="button"
              >
                <span>Latest</span>
              </button>
              <button
                className={`catalog-section__sort-btn ${
                  activeSort === 'rate' ? 'catalog-section__sort-btn--active' : ''
                }`}
                onClick={() => setActiveSort('rate')}
                type="button"
              >
                <span>Top Rated</span>
              </button>
              <button
                className={`catalog-section__sort-btn ${
                  activeSort === 'year' ? 'catalog-section__sort-btn--active' : ''
                }`}
                onClick={() => setActiveSort('year')}
                type="button"
              >
                <span>Year</span>
              </button>
              <button
                className={`catalog-section__sort-btn ${
                  activeSort === 'az' ? 'catalog-section__sort-btn--active' : ''
                }`}
                onClick={() => setActiveSort('az')}
                type="button"
              >
                <span>A–Z</span>
              </button>
            </div>

            {viewAllHref && (
              <Link href={viewAllHref} className="catalog-section__see-all" aria-label={`View all ${title}`}>
                <span>See all</span>
                <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Segmented Sort Strip */}
        <div className="catalog-section__mobile-sort" role="group" aria-label="Sort options">
          <button
            className={`catalog-section__sort-btn ${
              activeSort === 'latest' ? 'catalog-section__sort-btn--active' : ''
            }`}
            onClick={() => setActiveSort('latest')}
            type="button"
          >
            <span>Latest</span>
          </button>
          <button
            className={`catalog-section__sort-btn ${
              activeSort === 'rate' ? 'catalog-section__sort-btn--active' : ''
            }`}
            onClick={() => setActiveSort('rate')}
            type="button"
          >
            <span>Top Rated</span>
          </button>
          <button
            className={`catalog-section__sort-btn ${
              activeSort === 'year' ? 'catalog-section__sort-btn--active' : ''
            }`}
            onClick={() => setActiveSort('year')}
            type="button"
          >
            <span>Year</span>
          </button>
          <button
            className={`catalog-section__sort-btn ${
              activeSort === 'az' ? 'catalog-section__sort-btn--active' : ''
            }`}
            onClick={() => setActiveSort('az')}
            type="button"
          >
            <span>A–Z</span>
          </button>
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
            {sortedItems.map((item, idx) => (
              <div
                key={`${item.type || type}-${item.id}-${idx}`}
                className="catalog-section__card-wrap"
              >
                <MediaCard
                  content={{ ...item, type: item.type || type }}
                  onPlay={onPlay}
                />
              </div>
            ))}
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
