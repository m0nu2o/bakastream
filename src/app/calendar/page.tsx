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
} from 'lucide-react';
import ShelfSelector from '@/components/ShelfSelector';
import StateView from '@/components/StateView';
import type { CalendarEntry } from '@/app/api/calendar/route';
import type { MediaSummary } from '@/types';
import './calendar.css';

type CategoryFilter = 'all' | 'anime' | 'kdrama' | 'tv' | 'movie';

interface DayOption {
  key: string;
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
      const iso = d.toISOString().slice(0, 10);
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

  // Group filtered entries by date
  const groupedByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const item of filteredEntries) {
      const group = map.get(item.airDate) || [];
      group.push(item);
      map.set(item.airDate, group);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredEntries]);

  const categoryTabs: Array<{ id: CategoryFilter; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { id: 'all', label: 'All', icon: Layers },
    { id: 'anime', label: 'Anime', icon: Sparkles },
    { id: 'kdrama', label: 'K-Drama', icon: Tv },
    { id: 'tv', label: 'TV Series', icon: Clapperboard },
    { id: 'movie', label: 'Movies', icon: Film },
  ];

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

  return (
    <main className="calendar-page page-transition">
      {/* ── HEADER BANNER ── */}
      <header className="calendar-header">
        <div className="calendar-header__content">
          <div className="calendar-header__badge">
            <CalendarIcon size={14} className="calendar-header__badge-icon" />
            <span>Weekly Air Schedule</span>
          </div>
          <h1 className="calendar-header__title">Release Schedule</h1>
          <p className="calendar-header__subtitle">
            Upcoming episodes for Anime simulcasts, K-Dramas, and weekly series airing this week.
          </p>
        </div>

        {/* Search within schedule */}
        <div className="calendar-search-wrap">
          <Search size={15} className="calendar-search-icon" />
          <input
            type="text"
            placeholder="Search titles or genres…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="calendar-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="calendar-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
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
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── DAY SELECTOR STRIP ── */}
      <div className="calendar-days-container">
        <div className="calendar-days-scroll">
          {dayOptions.map(day => {
            const isSelected = selectedDayKey === day.key;
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
                <span className="calendar-day-btn__sub">{day.subLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── EPISODES SCHEDULE CONTENT ── */}
      {loading ? (
        <div className="calendar-loading">
          <span className="calendar-spinner" />
          <p>Loading air schedule…</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <StateView
          kind="empty"
          title="No episodes scheduled"
          message="No broadcasts scheduled for the selected filter. Try selecting 'All Week' or a different category."
          actionLabel="View All Releases"
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
                    {isToday && <span className="calendar-badge calendar-badge--live">Airing Today</span>}
                  </div>
                  <span className="calendar-day-section__count">
                    {dateEntries.length} {dateEntries.length === 1 ? 'Release' : 'Releases'}
                  </span>
                </div>

                <div className="calendar-grid">
                  {dateEntries.map(item => {
                    const mediaSummary = getMediaSummaryForEntry(item);
                    const countdown = formatCountdown(item.airTimestamp, item.airTime);
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
                                sizes="(max-width: 640px) 130px, 160px"
                                className="calendar-card__img"
                                loading="lazy"
                                unoptimized
                              />
                            ) : (
                              <div className="calendar-card__placeholder">
                                <Film size={28} />
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

                          {/* Air Time / Countdown Pill */}
                          <div className="calendar-card__countdown-pill">
                            <Clock size={11} className="calendar-card__clock-icon" />
                            <span>{countdown}</span>
                          </div>
                        </div>

                        {/* Content Body */}
                        <div className="calendar-card__body">
                          {/* Episode Pill */}
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
