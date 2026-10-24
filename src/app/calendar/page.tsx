'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar as CalendarIcon,
  Clock,
  Star,
  Search,
  Film,
  Sparkles,
  Tv,
  Clapperboard,
  Layers,
  LayoutGrid,
  List,
  Play,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import ShelfSelector from '@/components/ShelfSelector';
import StateView from '@/components/StateView';
import type { CalendarEntry } from '@/app/api/calendar/route';
import type { MediaSummary } from '@/types';
import './calendar.css';

type CategoryFilter = 'all' | 'anime' | 'kdrama' | 'tv' | 'movie';
type ViewMode = 'grid' | 'timeline';

interface DayOption {
  key: string; // ISO date YYYY-MM-DD or 'all'
  label: string;
  subLabel: string;
  isToday?: boolean;
}

export default function CalendarPage() {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [selectedDayKey, setSelectedDayKey] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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
        console.error('Failed to load release calendar:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  // Generate 7-day pill strip relative to today
  const dayOptions = useMemo<DayOption[]>(() => {
    const days: DayOption[] = [{ key: 'all', label: 'All Week', subLabel: '7 Days' }];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const weekday = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      days.push({
        key: iso,
        label: weekday,
        subLabel: monthDay,
        isToday: i === 0,
      });
    }

    return days;
  }, []);

  // Calculate release counts per day
  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const item of entries) {
      if (category !== 'all' && item.category !== category) continue;
      counts.all = (counts.all || 0) + 1;
      counts[item.airDate] = (counts[item.airDate] || 0) + 1;
    }
    return counts;
  }, [entries, category]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      if (category !== 'all' && item.category !== category) return false;
      if (selectedDayKey !== 'all' && item.airDate !== selectedDayKey) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesRomaji = item.romajiTitle?.toLowerCase().includes(q) ?? false;
        const matchesGenre = item.genres.some(g => g.toLowerCase().includes(q));
        if (!matchesTitle && !matchesRomaji && !matchesGenre) return false;
      }

      return true;
    });
  }, [entries, category, selectedDayKey, searchQuery]);

  // Group filtered entries by date and sort items inside by airTimestamp / airTime
  const groupedByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const item of filteredEntries) {
      const group = map.get(item.airDate) || [];
      group.push(item);
      map.set(item.airDate, group);
    }

    // Sort each group by air timestamp so it's chronologically ordered
    const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [, items] of sorted) {
      items.sort((x, y) => x.airTimestamp - y.airTimestamp);
    }
    return sorted;
  }, [filteredEntries]);

  const categoryTabs: Array<{
    id: CategoryFilter;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }> = [
    { id: 'all', label: 'All Releases', icon: Layers },
    { id: 'anime', label: 'Anime Simulcasts', icon: Sparkles },
    { id: 'kdrama', label: 'K-Drama', icon: Tv },
    { id: 'tv', label: 'TV Series', icon: Clapperboard },
    { id: 'movie', label: 'Movies', icon: Film },
  ];

  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());

  // Update countdown timestamp on interval
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (timestamp: number, now: number, airTime?: string) => {
    const diffMs = timestamp - now;
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

  const getAirStatus = (timestamp: number, now: number) => {
    const diffMs = timestamp - now;
    if (diffMs < 0) return { label: 'Aired', code: 'aired' as const };
    if (diffMs < 2 * 60 * 60 * 1000) return { label: 'Airing Soon', code: 'soon' as const };
    return { label: 'Upcoming', code: 'upcoming' as const };
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

  return (
    <main className="calendar-page page-transition">
      {/* ── HEADER BANNER ── */}
      <header className="calendar-header">
        <div className="calendar-header__content">
          <div className="calendar-header__badge">
            <Radio size={13} className="calendar-header__badge-icon pulse" />
            <span>Simulcast Air Schedule</span>
          </div>
          <h1 className="calendar-header__title">Broadcast Schedule</h1>
          <p className="calendar-header__subtitle">
            Track weekly anime simulcasts, Korean dramas, and television premieres with real-time broadcast countdowns.
          </p>
        </div>

        {/* Search & View Switcher Bar */}
        <div className="calendar-header__actions">
          <div className="calendar-search-wrap">
            <Search size={14} className="calendar-search-icon" />
            <input
              type="text"
              placeholder="Search title, Japanese romaji, or genre…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="calendar-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="calendar-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
              >
                ×
              </button>
            )}
          </div>

          <div className="calendar-view-toggle" role="group" aria-label="Layout view mode">
            <button
              type="button"
              className={`calendar-view-btn ${viewMode === 'grid' ? 'calendar-view-btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid card view"
              title="Compact Grid view"
            >
              <LayoutGrid size={15} />
              <span className="calendar-view-btn__text">Grid</span>
            </button>
            <button
              type="button"
              className={`calendar-view-btn ${viewMode === 'timeline' ? 'calendar-view-btn--active' : ''}`}
              onClick={() => setViewMode('timeline')}
              aria-label="Timeline list view"
              title="Chronological Timeline view"
            >
              <List size={15} />
              <span className="calendar-view-btn__text">Timeline</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── CATEGORY PILL NAVIGATION ── */}
      <nav className="calendar-category-nav" aria-label="Media category filter">
        <div className="calendar-category-scroll">
          {categoryTabs.map(tab => {
            const isActive = category === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={`calendar-category-pill ${isActive ? 'calendar-category-pill--active' : ''}`}
                onClick={() => setCategory(tab.id)}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── STICKY DAY SELECTOR STRIP ── */}
      <div className="calendar-days-container">
        <div className="calendar-days-scroll">
          {dayOptions.map(day => {
            const isSelected = selectedDayKey === day.key;
            const count = dayCounts[day.key] ?? 0;
            return (
              <button
                key={day.key}
                type="button"
                className={`calendar-day-btn ${isSelected ? 'calendar-day-btn--active' : ''} ${day.isToday ? 'calendar-day-btn--today' : ''}`}
                onClick={() => setSelectedDayKey(day.key)}
              >
                <div className="calendar-day-btn__label-row">
                  <span className="calendar-day-btn__label">{day.label}</span>
                  {day.isToday && <span className="calendar-day-btn__dot" />}
                </div>
                <div className="calendar-day-btn__meta-row">
                  <span className="calendar-day-btn__sub">{day.subLabel}</span>
                  {count > 0 && <span className="calendar-day-btn__count">{count}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── EPISODES SCHEDULE CONTENT ── */}
      {loading ? (
        <div className="calendar-loading">
          <span className="calendar-spinner" />
          <p>Fetching broadcast schedule…</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <StateView
          kind="empty"
          title="No releases scheduled"
          message="No broadcasts match your active filter. Try selecting 'All Week' or clearing the search query."
          actionLabel="Reset Filters"
          actionHref="/calendar"
        />
      ) : (
        <div className="calendar-schedule-flow">
          {groupedByDate.map(([date, dateEntries]) => {
            const dateObj = new Date(date + 'T00:00:00');
            const dayLabel = dateObj.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            });
            const isToday = new Date().toISOString().slice(0, 10) === date;

            return (
              <section key={date} className="calendar-day-section">
                <div className="calendar-day-section__header">
                  <div className="calendar-day-section__title-wrap">
                    <h2 className="calendar-day-section__title">
                      {isToday ? `Today · ${dayLabel}` : dayLabel}
                    </h2>
                    {isToday && <span className="calendar-badge calendar-badge--live">Broadcasting Today</span>}
                  </div>
                  <span className="calendar-day-section__count">
                    {dateEntries.length} {dateEntries.length === 1 ? 'Show Airing' : 'Shows Airing'}
                  </span>
                </div>

                {/* ── VIEW MODE 1: COMPACT PROPORTIONATE GRID ── */}
                {viewMode === 'grid' ? (
                  <div className="calendar-grid">
                    {dateEntries.map(item => {
                      const mediaSummary = getMediaSummaryForEntry(item);
                      const countdown = formatCountdown(item.airTimestamp, currentTime, item.airTime);
                      const href = item.tmdbId
                        ? item.category === 'movie'
                          ? `/movie/${item.tmdbId}`
                          : `/tv/${item.tmdbId}`
                        : `/search?q=${encodeURIComponent(item.title)}`;

                      return (
                        <article key={item.id} className="calendar-card">
                          <div className="calendar-card__poster-box">
                            <Link href={href} className="calendar-card__poster-link" aria-label={item.title}>
                              {item.posterUrl ? (
                                <Image
                                  src={item.posterUrl}
                                  alt={item.title}
                                  fill
                                  sizes="(max-width: 640px) 150px, (max-width: 1024px) 180px, 200px"
                                  className="calendar-card__img"
                                  loading="lazy"
                                  unoptimized
                                />
                              ) : (
                                <div className="calendar-card__placeholder">
                                  <Film size={24} />
                                </div>
                              )}

                              <div className="calendar-card__overlay" aria-hidden="true" />
                            </Link>

                            {/* Category Tag (Top-Left) */}
                            <span className="calendar-card__category-badge">
                              {item.category === 'kdrama' ? 'K-DRAMA' : item.category.toUpperCase()}
                            </span>

                            {/* Shelf Quick Action (Top-Right) */}
                            <ShelfSelector content={mediaSummary} variant="card-badge" />

                            {/* Countdown / Air Time Pill */}
                            <div className="calendar-card__countdown-pill">
                              <Clock size={10} className="calendar-card__clock-icon" />
                              <span>{countdown}</span>
                            </div>

                            {/* Center Hover Play button */}
                            <div className="calendar-card__play-overlay">
                              <Link href={href} className="calendar-card__play-btn" aria-label={`View ${item.title}`}>
                                <Play size={16} fill="currentColor" />
                              </Link>
                            </div>
                          </div>

                          {/* Content Body */}
                          <div className="calendar-card__body">
                            <div className="calendar-card__ep-row">
                              {item.episodeNumber ? (
                                <span className="calendar-card__ep-badge">
                                  Ep {item.episodeNumber}
                                </span>
                              ) : (
                                <span className="calendar-card__ep-badge">Premiere</span>
                              )}
                              {item.airTime && (
                                <span className="calendar-card__air-time">
                                  {item.airTime}
                                </span>
                              )}
                            </div>

                            <Link href={href} className="calendar-card__title" title={item.title}>
                              {item.title}
                            </Link>

                            {item.romajiTitle && item.romajiTitle !== item.title && (
                              <p className="calendar-card__romaji" title={item.romajiTitle}>
                                {item.romajiTitle}
                              </p>
                            )}

                            <div className="calendar-card__footer">
                              <span className="calendar-card__genre-tag">
                                {item.genres[0] || (item.category === 'anime' ? 'Anime' : 'Drama')}
                              </span>

                              {item.rating ? (
                                <span className="calendar-card__rating">
                                  <Star size={11} fill="#ffb800" stroke="#ffb800" />
                                  <span>{item.rating.toFixed(1)}</span>
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  /* ── VIEW MODE 2: CHRONOLOGICAL TIMELINE / LIST VIEW ── */
                  <div className="calendar-timeline">
                    {dateEntries.map(item => {
                      const mediaSummary = getMediaSummaryForEntry(item);
                      const countdown = formatCountdown(item.airTimestamp, currentTime, item.airTime);
                      const airStatus = getAirStatus(item.airTimestamp, currentTime);
                      const href = item.tmdbId
                        ? item.category === 'movie'
                          ? `/movie/${item.tmdbId}`
                          : `/tv/${item.tmdbId}`
                        : `/search?q=${encodeURIComponent(item.title)}`;

                      return (
                        <article key={item.id} className="calendar-timeline-row">
                          {/* Time & Airing Status Column */}
                          <div className="calendar-timeline__time-col">
                            <div className="calendar-timeline__time">
                              <Clock size={13} className="calendar-timeline__clock-icon" />
                              <span>{item.airTime || 'TBA'}</span>
                            </div>
                            <span className={`calendar-timeline__status-badge calendar-timeline__status-badge--${airStatus.code}`}>
                              {countdown}
                            </span>
                          </div>

                          {/* Thumbnail Poster */}
                          <div className="calendar-timeline__thumb-box">
                            <Link href={href} className="calendar-timeline__thumb-link" aria-label={item.title}>
                              {item.posterUrl ? (
                                <Image
                                  src={item.posterUrl}
                                  alt={item.title}
                                  fill
                                  sizes="70px"
                                  className="calendar-timeline__thumb-img"
                                  loading="lazy"
                                  unoptimized
                                />
                              ) : (
                                <div className="calendar-timeline__thumb-placeholder">
                                  <Film size={20} />
                                </div>
                              )}
                            </Link>
                          </div>

                          {/* Episode & Meta Info */}
                          <div className="calendar-timeline__info-col">
                            <div className="calendar-timeline__badges-row">
                              <span className="calendar-timeline__category-tag">
                                {item.category === 'kdrama' ? 'K-DRAMA' : item.category.toUpperCase()}
                              </span>
                              {item.episodeNumber ? (
                                <span className="calendar-timeline__ep-badge">
                                  Episode {item.episodeNumber}
                                </span>
                              ) : (
                                <span className="calendar-timeline__ep-badge">Premiere</span>
                              )}
                              {item.rating ? (
                                <span className="calendar-timeline__rating">
                                  <Star size={11} fill="#ffb800" stroke="#ffb800" />
                                  <span>{item.rating.toFixed(1)}</span>
                                </span>
                              ) : null}
                            </div>

                            <Link href={href} className="calendar-timeline__title" title={item.title}>
                              {item.title}
                            </Link>

                            {item.romajiTitle && item.romajiTitle !== item.title && (
                              <p className="calendar-timeline__romaji" title={item.romajiTitle}>
                                {item.romajiTitle}
                              </p>
                            )}

                            {item.overview && (
                              <p className="calendar-timeline__overview">
                                {item.overview}
                              </p>
                            )}

                            <div className="calendar-timeline__genres">
                              {item.genres.slice(0, 3).map((g, gi) => (
                                <span key={gi} className="calendar-timeline__genre-pill">
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="calendar-timeline__action-col">
                            <ShelfSelector content={mediaSummary} variant="card-badge" />
                            <Link href={href} className="calendar-timeline__watch-link" aria-label={`Watch ${item.title}`}>
                              <Play size={13} fill="currentColor" />
                              <span>View</span>
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
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
