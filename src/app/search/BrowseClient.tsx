'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Search as SearchIcon,
  SlidersHorizontal,
  Sparkles,
  X,
  Tag,
  Calendar,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import StreamingResultCard from '@/components/MediaCard';
import FilterDropdown from '@/components/FilterDropdown';
import type { Genre, MediaSummary } from '@/types';
import styles from './BrowseFilters.module.css';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
];

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote', label: 'Top Rated' },
  { value: 'recent', label: 'Recently Released' },
];

const CATEGORY_ITEMS = [
  { href: '/category/bollywood', label: 'Bollywood', icon: '🍿' },
  { href: '/category/hindi-serials', label: 'Hindi Serials', icon: '📻' },
  { href: '/category/hindi-web-series', label: 'Web Series', icon: '🇮🇳' },
  { href: '/category/kdrama', label: 'K-Dramas', icon: '🇰🇷' },
  { href: '/category/anime', label: 'Anime', icon: '⚔️' },
  { href: '/category/donghua', label: 'Donghua', icon: '🐉' },
  { href: '/category/hollywood', label: 'Hollywood', icon: '🎬' },
  { href: '/category/cdrama', label: 'C-Dramas', icon: '🇨🇳' },
  { href: '/category/western-tv', label: 'Western TV', icon: '📺' },
  { href: '/category/international', label: 'International', icon: '🌍' },
  { href: '/category/cartoons', label: 'Cartoons', icon: '🎨' },
];

interface Props {
  results: MediaSummary[];
  genres: Genre[];
  page: number;
  totalPages?: number;
}

export default function BrowseClient({ results, genres, page, totalPages = 500 }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get('q') || '');
  const [showFilters, setShowFilters] = useState(false);

  const updateParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');

    // If searching with a new query, route to /search
    if (key === 'q' && value) {
      startTransition(() => router.push(`/search?${next.toString()}`, { scroll: false }));
      return;
    }

    // Preserve current route (whether /category/..., /movies, /tv, /anime, or /search)
    const targetPath =
      pathname.startsWith('/category/') ||
      pathname === '/movies' ||
      pathname === '/tv' ||
      pathname === '/anime'
        ? pathname
        : '/search';

    startTransition(() => router.push(`${targetPath}?${next.toString()}`, { scroll: false }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', query.trim() || null);
  };

  const activeType = params.get('type') || 'all';
  const activeGenre = params.get('genre') || '';
  const activeYear = params.get('year') || '';
  const activeSort = params.get('sort') || 'popularity.desc';
  const years = Array.from({ length: 36 }, (_, i) => String(new Date().getFullYear() - i));

  const activeFilterCount =
    (activeType !== 'all' ? 1 : 0) +
    (Boolean(activeGenre) ? 1 : 0) +
    (Boolean(activeYear) ? 1 : 0) +
    (activeSort !== 'popularity.desc' ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const clearAllFilters = () => {
    const next = new URLSearchParams(params.toString());
    next.delete('type');
    next.delete('genre');
    next.delete('year');
    next.delete('sort');
    next.delete('page');

    const targetPath =
      pathname.startsWith('/category/') ||
      pathname === '/movies' ||
      pathname === '/tv' ||
      pathname === '/anime'
        ? pathname
        : '/search';

    startTransition(() => router.push(targetPath + (next.toString() ? `?${next.toString()}` : ''), { scroll: false }));
  };

  const genreOptions = [
    { value: '', label: 'All Genres' },
    ...genres.map(g => ({ value: String(g.id), label: g.name })),
  ];

  const yearOptions = [
    { value: '', label: 'Any Year' },
    ...years.map(y => ({ value: y, label: y })),
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <form onSubmit={onSubmit} className={styles.searchForm}>
          <SearchIcon size={18} className={styles.searchIcon} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search movies, TV shows, anime, drama…"
            className={styles.searchInput}
            aria-label="Search query"
          />
          {query && (
            <button
              type="button"
              className={styles.searchClearBtn}
              onClick={() => {
                setQuery('');
                updateParam('q', null);
              }}
              title="Clear search query"
              aria-label="Clear search query"
            >
              <X size={15} />
            </button>
          )}
        </form>
        <button
          className={`${styles.filterToggle} ${
            showFilters || hasActiveFilters ? styles.filterToggleActive : ''
          }`}
          onClick={() => setShowFilters(s => !s)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal size={15} />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className={styles.filterBadge}>{activeFilterCount}</span>
          )}
        </button>
      </div>

      {(showFilters || hasActiveFilters) && (
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            {TYPE_OPTIONS.map(o => (
              <button
                key={o.value}
                className={`${styles.chip} ${activeType === o.value ? styles.chipActive : ''}`}
                onClick={() => updateParam('type', o.value === 'all' ? null : o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className={styles.categoryGroup} role="group" aria-label="Quick Category Discovery">
            {CATEGORY_ITEMS.map(cat => {
              const isActive = pathname === cat.href;
              return (
                <Link
                  key={cat.href}
                  href={cat.href}
                  className={`${styles.categoryChip} ${isActive ? styles.categoryChipActive : ''}`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </Link>
              );
            })}
          </div>

          {genres.length > 0 && (
            <>
              <span className={styles.sectionLabel}>Genres</span>
              <div className={styles.genreStrip} role="group" aria-label="Genre Filter Pills">
                <button
                  type="button"
                  className={`${styles.genrePill} ${!activeGenre ? styles.genrePillActive : ''}`}
                  onClick={() => updateParam('genre', null)}
                >
                  All Genres
                </button>
                {genres.slice(0, 12).map(g => (
                  <button
                    key={g.id}
                    type="button"
                    className={`${styles.genrePill} ${activeGenre === String(g.id) ? styles.genrePillActive : ''}`}
                    onClick={() => updateParam('genre', activeGenre === String(g.id) ? null : String(g.id))}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Custom Animated Picklists (FilterDropdown) ── */}
          <div className={styles.selectGroup}>
            <FilterDropdown
              label="Genre"
              value={activeGenre}
              options={genreOptions}
              onChange={val => updateParam('genre', val || null)}
              icon={Tag}
              placeholder="All Genres"
              hasSearch={genres.length > 8}
            />

            <FilterDropdown
              label="Year"
              value={activeYear}
              options={yearOptions}
              onChange={val => updateParam('year', val || null)}
              icon={Calendar}
              placeholder="Any Year"
              hasSearch={true}
            />

            <FilterDropdown
              label="Sort"
              value={activeSort}
              defaultValue="popularity.desc"
              options={SORT_OPTIONS}
              onChange={val => updateParam('sort', val === 'popularity.desc' ? null : val)}
              icon={ArrowUpDown}
              placeholder="Most Popular"
            />

            {hasActiveFilters && (
              <button
                type="button"
                className={styles.resetFiltersBtn}
                onClick={clearAllFilters}
                title="Reset all filters"
                aria-label="Reset all filters"
              >
                <RotateCcw size={12} className={styles.resetIcon} />
                <span>Reset All</span>
              </button>
            )}
          </div>
        </div>
      )}

      {results.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyIcon}>🎬</p>
          <h3 className={styles.emptyTitle}>No matching titles found</h3>
          <p className={styles.emptyText}>
            Try clearing filters or choosing another category or year.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn--primary"
              style={{ marginTop: '1.25rem' }}
              onClick={() => {
                const targetPath =
                  pathname.startsWith('/category/') ||
                  pathname === '/movies' ||
                  pathname === '/tv' ||
                  pathname === '/anime'
                    ? pathname
                    : '/search';
                startTransition(() => router.push(targetPath, { scroll: false }));
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className={`${styles.grid} ${pending ? styles.gridPending : ''}`} aria-busy={pending}>
          {results.map(item => (
            <StreamingResultCard key={`${item.type}-${item.id}`} content={item} />
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className={styles.pagination}>
          {page > 1 && (
            <button
              className="btn btn--ghost"
              onClick={() => updateParam('page', String(page - 1))}
            >
              ← Previous
            </button>
          )}
          <span className={styles.pageLabel}>
            Page {page} {totalPages > 1 ? `of ${totalPages}` : ''}
          </span>
          {page < totalPages && (
            <button className="btn btn--ghost" onClick={() => updateParam('page', String(page + 1))}>
              Next →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
