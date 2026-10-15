'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Flame, Clock, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import type { MediaSummary, Genre, MediaType } from '@/types';
import { posterUrl } from '@/lib/tmdb/image';
import { mediaUrl } from '@/utils/slug';
import './TrendingShowcase.css';

interface Props {
  trendingItems: MediaSummary[];
  popularItems: MediaSummary[];
  recentItems: MediaSummary[];
  genres?: Genre[];
  onPlay?: (content: MediaSummary) => void;
}

const GENRE_CHIPS = [
  { id: 0, label: 'All' },
  { id: 28, label: 'Action' },
  { id: 12, label: 'Adventure' },
  { id: 16, label: 'Animation' },
  { id: 35, label: 'Comedy' },
  { id: 80, label: 'Crime' },
  { id: 99, label: 'Documentary' },
  { id: 18, label: 'Drama' },
  { id: 10749, label: 'Romance' },
  { id: 878, label: 'Sci-Fi' },
  { id: 53, label: 'Thriller' },
];

export default function TrendingShowcase({
  trendingItems,
  popularItems,
  recentItems,
  onPlay,
}: Props) {
  const [activeTab, setActiveTab] = useState<'trends' | 'popular' | 'recent'>('trends');
  const [selectedGenre, setSelectedGenre] = useState<number>(0);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [genreData, setGenreData] = useState<Record<number, MediaSummary[]>>({});
  const [loadingGenre, setLoadingGenre] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);

  // Active base dataset according to tab
  const baseList = useMemo(() => {
    switch (activeTab) {
      case 'popular':
        return popularItems;
      case 'recent':
        return recentItems;
      case 'trends':
      default:
        return trendingItems;
    }
  }, [activeTab, popularItems, recentItems, trendingItems]);

  // Dynamic on-demand genre discovery (returns full 20 titles for any selected genre)
  useEffect(() => {
    if (selectedGenre === 0) return;
    if (genreData[selectedGenre]) return; // already cached

    let cancelled = false;
    setLoadingGenre(true);

    fetch(`/api/tmdb/discover/movie?with_genres=${selectedGenre}&sort_by=popularity.desc`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.results)) {
          interface RawItem {
            id: number;
            title?: string;
            name?: string;
            poster_path?: string | null;
            backdrop_path?: string | null;
            overview?: string;
            release_date?: string;
            first_air_date?: string;
            vote_average?: number;
            genre_ids?: number[];
            media_type?: string;
            popularity?: number;
          }
          const mapped: MediaSummary[] = data.results.map((r: RawItem) => ({
            id: r.id,
            type: (r.media_type as MediaType) || (r.title ? 'movie' : 'tv'),
            title: r.title || r.name || 'Untitled',
            posterPath: r.poster_path ?? null,
            backdropPath: r.backdrop_path ?? null,
            overview: r.overview ?? '',
            releaseDate: r.release_date || r.first_air_date || null,
            rating: r.vote_average ?? null,
            genreIds: r.genre_ids ?? [],
            popularity: r.popularity,
          }));
          setGenreData((prev) => ({ ...prev, [selectedGenre]: mapped }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingGenre(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGenre, genreData]);

  // Filtered dataset: full genre list when selected, otherwise base tab items
  const displayList = useMemo(() => {
    if (selectedGenre === 0) return baseList;
    if (genreData[selectedGenre] && genreData[selectedGenre].length > 0) {
      return genreData[selectedGenre];
    }
    // Fallback to local filter while remote genre results arrive
    const localFiltered = baseList.filter((item) => item.genreIds?.includes(selectedGenre));
    return localFiltered.length > 0 ? localFiltered : baseList;
  }, [baseList, selectedGenre, genreData]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollerRef.current) return;
    const scrollAmount = scrollerRef.current.clientWidth * 0.75;
    scrollerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="trending-showcase" aria-label="Trending Showcase and Genre Discovery">
      {/* ── 1. TRENDING NAVIGATION TABS (Pill Container) ── */}
      <div className="trending-showcase__nav-wrapper">
        <div className="trending-showcase__nav" role="tablist" aria-label="Catalog filters">
          <button
            className={`trending-showcase__tab ${activeTab === 'trends' ? 'trending-showcase__tab--active' : ''}`}
            onClick={() => {
              setActiveTab('trends');
              setSelectedGenre(0);
            }}
            role="tab"
            aria-selected={activeTab === 'trends'}
          >
            <Star size={14} className="trending-showcase__tab-icon" fill={activeTab === 'trends' ? 'currentColor' : 'none'} />
            <span>Trends Now</span>
          </button>
          <button
            className={`trending-showcase__tab ${activeTab === 'popular' ? 'trending-showcase__tab--active' : ''}`}
            onClick={() => {
              setActiveTab('popular');
              setSelectedGenre(0);
            }}
            role="tab"
            aria-selected={activeTab === 'popular'}
          >
            <Flame size={14} className="trending-showcase__tab-icon" />
            <span>Popular</span>
          </button>
          <button
            className={`trending-showcase__tab ${activeTab === 'recent' ? 'trending-showcase__tab--active' : ''}`}
            onClick={() => {
              setActiveTab('recent');
              setSelectedGenre(0);
            }}
            role="tab"
            aria-selected={activeTab === 'recent'}
          >
            <Clock size={14} className="trending-showcase__tab-icon" />
            <span>Recently Added</span>
          </button>
        </div>
      </div>

      {/* ── 2. SCROLLABLE GENRE FILTER PILLS ── */}
      <div className="trending-showcase__genres-container">
        <div className="trending-showcase__genres-scroll">
          {GENRE_CHIPS.map((genre) => (
            <button
              key={genre.id}
              className={`trending-showcase__genre-chip ${selectedGenre === genre.id ? 'trending-showcase__genre-chip--active' : ''}`}
              onClick={() => setSelectedGenre(genre.id)}
              type="button"
            >
              {genre.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3. POSTER CAROUSEL WITH SLEEK GLASS CONTROLS ── */}
      <div className="trending-showcase__carousel-wrap">
        <button
          className="trending-showcase__edge-btn trending-showcase__edge-btn--left"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          type="button"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="trending-showcase__scroller" ref={scrollerRef}>
          {displayList.map((item) => {
            const isSelected = item.id === selectedCardId;
            const poster = posterUrl(item.posterPath, 'w500');
            const year = item.releaseDate ? item.releaseDate.slice(0, 4) : null;
            const rating = item.rating && item.rating > 0 ? item.rating.toFixed(1) : null;
            const href = mediaUrl(item);

            return (
              <div
                key={`${item.type}-${item.id}`}
                className={`trending-showcase__card ${isSelected ? 'trending-showcase__card--selected' : ''}`}
                onClick={() => setSelectedCardId(item.id)}
              >
                <div className="trending-showcase__poster-box">
                  <Link href={href} className="trending-showcase__poster-link" aria-label={item.title}>
                    {poster ? (
                      <Image
                        src={poster}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 150px, (max-width: 1024px) 180px, 220px"
                        className="trending-showcase__poster-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="trending-showcase__placeholder" />
                    )}
                  </Link>

                  <div className="trending-showcase__play-overlay">
                    {onPlay ? (
                      <button
                        className="trending-showcase__play-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlay(item);
                        }}
                        aria-label={`Play ${item.title}`}
                        type="button"
                      >
                        <Play size={16} fill="currentColor" />
                      </button>
                    ) : (
                      <Link
                        href={href}
                        className="trending-showcase__play-btn"
                        aria-label={`Open ${item.title}`}
                      >
                        <Play size={16} fill="currentColor" />
                      </Link>
                    )}
                  </div>
                </div>

                <div className="trending-showcase__info-block">
                  <Link href={href} className="trending-showcase__title" title={item.title}>
                    {item.title}
                  </Link>
                  <div className="trending-showcase__meta">
                    {year && <span className="trending-showcase__year">{year}</span>}
                    {rating && (
                      <span className="trending-showcase__rating">
                        <Star size={11} fill="#ffb800" stroke="#ffb800" /> {rating}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="trending-showcase__edge-btn trending-showcase__edge-btn--right"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          type="button"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}
