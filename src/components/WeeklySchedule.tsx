'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  Star,
  Film,
  Sparkles,
  Tv,
  Clapperboard,
} from 'lucide-react';
import ShelfSelector from '@/components/ShelfSelector';
import type { CalendarEntry } from '@/app/api/calendar/route';
import type { MediaSummary } from '@/types';
import './WeeklySchedule.css';

type ScheduleCategory = 'all' | 'anime' | 'kdrama' | 'tv' | 'movie';

interface DayTab {
  key: string; // YYYY-MM-DD or 'all'
  label: string;
  dateStr: string;
  isToday?: boolean;
}

interface Props {
  /** If true, renders as the embedded homepage section. If false, full page view */
  isEmbedded?: boolean;
}

export default function WeeklySchedule({ isEmbedded = true }: Props) {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ScheduleCategory>('all');
  const [activeDay, setActiveDay] = useState<string>('today');
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Generate 7-day strip
  const dayTabs = useMemo<DayTab[]>(() => {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const tabs: DayTab[] = [
      { key: 'all', label: 'All Week', dateStr: '7 Days' },
      { key: 'today', label: 'Today', dateStr: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isToday: true },
    ];

    for (let i = 1; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const weekday = i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      tabs.push({ key: iso, label: weekday, dateStr });
    }

    return tabs;
  }, []);

  // Fetch calendar entries
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/calendar?category=${category}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.success && Array.isArray(data.entries)) {
          setEntries(data.entries);
        }
      })
      .catch(err => {
        console.error('Failed to load schedule:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filter entries
  const displayItems = useMemo(() => {
    return entries.filter(item => {
      // Category filter
      if (category !== 'all' && item.category !== category) return false;

      // Day filter
      if (activeDay === 'all') return true;
      if (activeDay === 'today') return item.airDate === todayIso;
      return item.airDate === activeDay;
    });
  }, [entries, category, activeDay, todayIso]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollerRef.current) return;
    const amount = scrollerRef.current.clientWidth * 0.75;
    scrollerRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  const formatCountdown = (timestamp: number, airTime?: string) => {
    const diffMs = timestamp - Date.now();
    if (diffMs <= 0) return airTime ? `Aired at ${airTime}` : 'Aired Today';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `In ${days}d`;
    }
    if (hours > 0) return `In ${hours}h ${mins}m`;
    return `In ${mins}m`;
  };

  const getMediaSummaryForEntry = (entry: CalendarEntry): MediaSummary => ({
    id: entry.tmdbId || Math.abs(hashCode(entry.id)),
    type: entry.category === 'movie' ? 'movie' : 'tv',
    title: entry.title,
    posterPath: entry.posterUrl,
    backdropPath: entry.backdropUrl || null,
    overview: entry.overview || '',
    releaseDate: entry.airDate,
    rating: entry.rating || null,
    genreIds: [],
  });

  const categoryPills: Array<{ id: ScheduleCategory; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'anime', label: 'Anime' },
    { id: 'kdrama', label: 'K-Drama' },
    { id: 'tv', label: 'TV Series' },
    { id: 'movie', label: 'Movies' },
  ];

  return (
    <section className="weekly-schedule" aria-label="Release Schedule">
      <div className="weekly-schedule__inner">
        {/* Header Bar — completely aligned with CatalogSection design rhythm */}
        <div className="weekly-schedule__header">
          <div className="weekly-schedule__title-group">
            <span className="weekly-schedule__icon" aria-hidden="true">
              <CalendarIcon size={22} />
            </span>
            <div className="weekly-schedule__title-wrap">
              <div className="weekly-schedule__heading-row">
                <h2 className="weekly-schedule__title">Release Schedule</h2>
                <span className="weekly-schedule__badge">
                  {displayItems.length} Airing
                </span>
              </div>
              <span className="weekly-schedule__underline" />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="weekly-schedule__controls">
            <div className="weekly-schedule__pills">
              {categoryPills.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`weekly-schedule__pill ${category === p.id ? 'weekly-schedule__pill--active' : ''}`}
                  onClick={() => setCategory(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {isEmbedded && (
              <Link href="/calendar" className="weekly-schedule__see-all" aria-label="View full schedule calendar">
                <span>Full Calendar</span>
                <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* ── 7-Day Navigation Strip ── */}
        <div className="weekly-schedule__days-bar">
          <div className="weekly-schedule__days-scroll">
            {dayTabs.map(day => {
              const isSelected = activeDay === day.key;
              return (
                <button
                  key={day.key}
                  type="button"
                  className={`weekly-schedule__day-tab ${isSelected ? 'weekly-schedule__day-tab--active' : ''}`}
                  onClick={() => setActiveDay(day.key)}
                >
                  <div className="weekly-schedule__day-name-row">
                    <span className="weekly-schedule__day-name">{day.label}</span>
                    {day.isToday && <span className="weekly-schedule__live-dot" />}
                  </div>
                  <span className="weekly-schedule__day-date">{day.dateStr}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Carousel Scroller Area ── */}
        <div className="weekly-schedule__carousel-wrap">
          <button
            className="weekly-schedule__edge-btn weekly-schedule__edge-btn--left"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            type="button"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="weekly-schedule__carousel" ref={scrollerRef}>
            {loading ? (
              <div className="weekly-schedule__loading">
                <span className="weekly-schedule__spinner" />
                <span>Loading air schedule…</span>
              </div>
            ) : displayItems.length === 0 ? (
              <div className="weekly-schedule__empty">
                <Clock size={32} className="weekly-schedule__empty-icon" />
                <p className="weekly-schedule__empty-text">No episodes scheduled for this filter.</p>
                <button
                  type="button"
                  className="weekly-schedule__empty-btn"
                  onClick={() => setActiveDay('all')}
                >
                  View All Week
                </button>
              </div>
            ) : (
              displayItems.map((item, idx) => {
                const mediaSummary = getMediaSummaryForEntry(item);
                const countdown = formatCountdown(item.airTimestamp, item.airTime);
                const href = item.tmdbId
                  ? item.category === 'movie'
                    ? `/movie/${item.tmdbId}`
                    : `/tv/${item.tmdbId}`
                  : `/search?q=${encodeURIComponent(item.title)}`;

                return (
                  <article key={`${item.id}-${idx}`} className="schedule-card">
                    <div className="schedule-card__poster-box">
                      <Link href={href} className="schedule-card__poster-link" aria-label={item.title}>
                        {item.posterUrl ? (
                          <Image
                            src={item.posterUrl}
                            alt={`${item.title} poster`}
                            fill
                            sizes="(max-width: 640px) 135px, (max-width: 1024px) 170px, 200px"
                            className="schedule-card__img"
                            loading="lazy"
                            unoptimized
                          />
                        ) : (
                          <div className="schedule-card__placeholder">
                            <Film size={28} />
                          </div>
                        )}

                        {/* Smooth vignette overlay */}
                        <div className="schedule-card__overlay" aria-hidden="true" />
                      </Link>

                      {/* Top-Left: Category Tag */}
                      <span className="schedule-card__category-tag">
                        {item.category === 'kdrama' ? 'K-DRAMA' : item.category.toUpperCase()}
                      </span>

                      {/* Top-Right: Shelf Status Action (Zero overlap!) */}
                      <ShelfSelector content={mediaSummary} variant="card-badge" />

                      {/* Bottom of poster: Countdown Pill */}
                      <div className="schedule-card__countdown-pill">
                        <Clock size={11} className="schedule-card__clock-icon" />
                        <span>{countdown}</span>
                      </div>

                      {/* Center Play Button on hover */}
                      <div className="schedule-card__play-overlay">
                        <Link href={href} className="schedule-card__play-btn" aria-label={`View ${item.title}`}>
                          <Play size={18} fill="currentColor" />
                        </Link>
                      </div>
                    </div>

                    {/* Bottom Info Block */}
                    <div className="schedule-card__info">
                      <div className="schedule-card__ep-row">
                        {item.episodeNumber ? (
                          <span className="schedule-card__ep-badge">
                            Ep {item.episodeNumber}
                          </span>
                        ) : (
                          <span className="schedule-card__ep-badge">Premiere</span>
                        )}
                        {item.airTime && (
                          <span className="schedule-card__air-time">
                            {item.airTime}
                          </span>
                        )}
                      </div>

                      <Link href={href} className="schedule-card__title" title={item.title}>
                        {item.title}
                      </Link>

                      <div className="schedule-card__meta">
                        <span className="schedule-card__genre">
                          {item.genres[0] || (item.category === 'anime' ? 'Anime' : 'Drama')}
                        </span>
                        {item.rating ? (
                          <span className="schedule-card__rating">
                            <Star size={11} fill="#ffb800" stroke="#ffb800" />
                            <span>{item.rating.toFixed(1)}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <button
            className="weekly-schedule__edge-btn weekly-schedule__edge-btn--right"
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

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}
