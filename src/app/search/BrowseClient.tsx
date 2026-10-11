'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import StreamingResultCard from '@/components/MediaCard';
import type { Genre, MediaSummary } from '@/types';
import styles from './BrowseFilters.module.css';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
];

interface Props {
  results: MediaSummary[];
  genres: Genre[];
  page: number;
}

export default function BrowseClient({ results, genres, page }: Props) {
  const router = useRouter();
  const params = useSearchParams();
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
            placeholder="Search movies and TV shows…"
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
          <div className={styles.filterGroup} style={{ flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
            <a href="/category/bollywood" className={styles.chip}>🍿 Bollywood</a>
            <a href="/category/hindi-serials" className={styles.chip}>📺 Hindi Serials</a>
            <a href="/category/hindi-web-series" className={styles.chip}>🇮🇳 Web Series</a>
            <a href="/category/kdrama" className={styles.chip}>🇰🇷 K-Dramas</a>
            <a href="/category/cdrama" className={styles.chip}>🇨🇳 C-Dramas</a>
            <a href="/category/anime" className={styles.chip}>⚔️ Anime</a>
            <a href="/category/cartoons" className={styles.chip}>🎨 Cartoons</a>
            <a href="/category/hollywood" className={styles.chip}>🎬 Hollywood</a>
          </div>
          <select
            className={styles.select}
            value={activeGenre}
            onChange={e => updateParam('genre', e.target.value || null)}
            aria-label="Genre"
          >
            <option value="">All genres</option>
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
            <option value="">Any year</option>
            {years.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
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
