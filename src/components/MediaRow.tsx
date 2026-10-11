'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MediaCard from './MediaCard';
import MediaCardSkeleton from './MediaCardSkeleton';
import type { MediaSummary } from '@/types';
import './MediaRow.css';

interface Props {
  title: string;
  items: MediaSummary[];
  seeAllHref?: { href: string; label?: string };
  onPlay?: (content: MediaSummary) => void;
  loading?: boolean;
}

export default function MediaRow({ title, items, seeAllHref, onPlay, loading }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 8);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [updateArrows, items.length]);

  const scroll = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  if (!loading && items.length === 0) return null;

  return (
    <section className="media-row">
      <div className="media-row__header">
        <h2 className="media-row__title">{title}</h2>
        {seeAllHref && !loading && (
          <Link href={seeAllHref.href} className="section__link">
            {seeAllHref.label ?? 'See all'} <ChevronRight size={14} />
          </Link>
        )}
      </div>

      <div className="media-row__wrap">
        {!atStart && (
          <button
            className="media-row__arrow media-row__arrow--left"
            onClick={() => scroll(-1)}
            aria-label="Scroll left"
          >
            <ChevronLeft size={26} />
          </button>
        )}
        <div className="media-row__scroller" ref={scroller} onScroll={updateArrows}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div className="media-row__item" key={i}>
                  <MediaCardSkeleton />
                </div>
              ))
            : items.map((item, i) => (
                <div className="media-row__item" key={`${item.type}-${item.id}-${i}`}>
                  <MediaCard content={item} onPlay={onPlay} />
                </div>
              ))}
        </div>
        {!atEnd && !loading && (
          <button
            className="media-row__arrow media-row__arrow--right"
            onClick={() => scroll(1)}
            aria-label="Scroll right"
          >
            <ChevronRight size={26} />
          </button>
        )}
      </div>
    </section>
  );
}
