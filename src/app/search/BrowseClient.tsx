'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search as SearchIcon, SlidersHorizontal, Sparkles } from 'lucide-react';
import StreamingResultCard from '@/components/MediaCard';
import type { Genre, MediaSummary } from '@/types';
import styles from './BrowseFilters.module.css';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
];

const CATEGORY_ITEMS = [
  { href: '/category/bollywood', label: 'Bollywood', icon: '🍿' },
  { href: '/category/hindi-serials', label: 'Hindi Serials', icon: '📺' },
  { href: '/category/hindi-web-series', label: 'Web Series', icon: '🇮🇳' },
  { href: '/category/kdrama', label: 'K-Dramas', icon: '🇰🇷' },
  { href: '/category/anime', label: 'Anime', icon: '⚔️' },
  { href: '/category/hollywood', label: 'Hollywood', icon: '🎬' },
  { href: '/category/cdrama', label: 'C-Dramas', icon: '🇨🇳' },
  { href: '/category/cartoons', label: 'Cartoons', icon: '🎨' },
];

interface Props {
  results: MediaSummary[];
  genres: Genre[];
  page: number;
}

export default function BrowseClient({ results, genres, page }: Props) {
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
    startTransition(() => router.push(`/search?${next.toString()}`, { scroll: false }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', query.trim() || null);
  };

  const activeType = params.get('type') || 'all';
  const activeGenre = params.get('genre') || '';
  const activeYear = params.get('year') || '';
  const years = Array.from({ length: 36 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <form onSubmit={onSubmit} className={styles.searchForm}>
          <SearchIcon size={18} className={styles.searchIcon} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search movies, TV shows, anime…"
            className={styles.searchInput}
            aria-label="Search query"
          />
        </form>
        <button
          className={styles.filterToggle}
          onClick={() => setShowFilters(s => !s)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      {(showFilters || activeType !== 'all' || activeGenre || activeYear) && (
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
                {genres.slice(0, 10).map(g => (
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

          <div className={styles.selectGroup}>
            <select
              className={styles.select}
              value={activeGenre}
              onChange={e => updateParam('genre', e.target.value || null)}
              aria-label="All Genres Select"
            >
              <option value="">More Genres…</option>
              {genres.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <select
              className={styles.select}
              value={activeYear}
              onChange={e => updateParam('year', e.target.value || null)}
              aria-label="Year"
            >
              <option value="">Any Year</option>
              {years.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className={`${styles.grid} ${pending ? styles.gridPending : ''}`} aria-busy={pending}>
        {results.map(item => (
          <StreamingResultCard key={`${item.type}-${item.id}`} content={item} />
        ))}
      </div>

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
          <span className={styles.pageLabel}>Page {page}</span>
          <button className="btn btn--ghost" onClick={() => updateParam('page', String(page + 1))}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
