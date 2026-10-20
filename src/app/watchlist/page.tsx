'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  History,
  PlayCircle,
  Clock,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Trash2,
  Play,
  Search,
  Filter,
  Layers,
} from 'lucide-react';
import MediaCard from '@/components/MediaCard';
import ShelfSelector from '@/components/ShelfSelector';
import StateView from '@/components/StateView';
import {
  useWatchlist,
  useHistory,
  useWatchlistCounts,
} from '@/hooks/useStoredCollection';
import { removeFromHistory, type HistoryEntry } from '@/lib/storage';
import type { WatchlistStatus, WatchlistItem } from '@/types';
import './watchlist.css';

type ShelfTab = 'all' | 'watching' | 'plan_to_watch' | 'continue' | 'completed' | 'on_hold' | 'dropped';

export default function WatchlistPage() {
  const [tab, setTab] = useState<ShelfTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'az'>('recent');

  const watchlistItems = useWatchlist();
  const historyItems = useHistory();
  const counts = useWatchlistCounts();

  // Filtered & sorted watchlist items
  const filteredList = useMemo(() => {
    let result = [...watchlistItems];

    // Status filter
    if (tab !== 'all' && tab !== 'continue') {
      result = result.filter(item => (item.status || 'plan_to_watch') === tab);
    }

    // Media type filter
    if (mediaTypeFilter !== 'all') {
      result = result.filter(item => item.type === mediaTypeFilter);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => item.title.toLowerCase().includes(q));
    }

    // Sorting
    switch (sortBy) {
      case 'rating':
        return result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'az':
        return result.sort((a, b) => a.title.localeCompare(b.title));
      case 'recent':
      default:
        return result.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    }
  }, [watchlistItems, tab, mediaTypeFilter, searchQuery, sortBy]);

  // Filtered continue watching history
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return historyItems;
    const q = searchQuery.toLowerCase().trim();
    return historyItems.filter(item => item.title.toLowerCase().includes(q));
  }, [historyItems, searchQuery]);

  const tabsConfig: Array<{
    id: ShelfTab;
    label: string;
    count: number;
    icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
    color?: string;
  }> = [
    { id: 'all', label: 'All Saved', count: counts.all, icon: Layers },
    { id: 'watching', label: 'Watching', count: counts.watching, icon: PlayCircle, color: '#10B981' },
    { id: 'plan_to_watch', label: 'Plan to Watch', count: counts.plan_to_watch, icon: Clock, color: 'var(--accent, #F70063)' },
    { id: 'continue', label: 'Continue Watching', count: historyItems.length, icon: History },
    { id: 'completed', label: 'Completed', count: counts.completed, icon: CheckCircle2, color: '#3B82F6' },
    { id: 'on_hold', label: 'On Hold', count: counts.on_hold, icon: PauseCircle, color: '#F59E0B' },
    { id: 'dropped', label: 'Dropped', count: counts.dropped, icon: XCircle, color: '#EF4444' },
  ];

  return (
    <main className="watchlist-page page-transition">
      <header className="watchlist-head">
        <div className="watchlist-head__title-group">
          <h1 className="watchlist-head__title">My Library</h1>
          <p className="watchlist-head__sub">
            Organize and manage your watching progress, shelves, and saved titles.
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="watchlist-controls">
          <div className="watchlist-search">
            <Search size={15} className="watchlist-search__icon" />
            <input
              type="text"
              placeholder="Search in library…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="watchlist-search__input"
            />
            {searchQuery && (
              <button
                type="button"
                className="watchlist-search__clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {tab !== 'continue' && (
            <div className="watchlist-filters">
              <select
                value={mediaTypeFilter}
                onChange={(e) => setMediaTypeFilter(e.target.value as 'all' | 'movie' | 'tv')}
                className="watchlist-select"
                aria-label="Filter by type"
              >
                <option value="all">All Formats</option>
                <option value="movie">Movies</option>
                <option value="tv">Series & Anime</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'rating' | 'az')}
                className="watchlist-select"
                aria-label="Sort by"
              >
                <option value="recent">Recently Added</option>
                <option value="rating">Highest Rated</option>
                <option value="az">A–Z Alphabetical</option>
              </select>
            </div>
          )}
        </div>
      </header>

      {/* ── SHELF TABS NAVIGATION ── */}
      <nav className="watchlist-tabs-nav" aria-label="Library shelves">
        <div className="watchlist-tabs-scroll" role="tablist">
          {tabsConfig.map(t => {
            const isActive = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                className={`watchlist-tab ${isActive ? 'watchlist-tab--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                <Icon size={15} style={t.color && !isActive ? { color: t.color } : undefined} />
                <span>{t.label}</span>
                <span className="watchlist-tab__count">{t.count}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── CONTENT AREA: SHELVES (WATCHLIST) ── */}
      {tab !== 'continue' && (
        <>
          {filteredList.length === 0 ? (
            <StateView
              kind="empty"
              title={
                searchQuery
                  ? 'No matching titles found'
                  : tab === 'all'
                  ? 'Your library is empty'
                  : `No titles in ${tabsConfig.find(t => t.id === tab)?.label}`
              }
              message={
                searchQuery
                  ? 'Try searching with different keywords.'
                  : 'Add series or movies to this shelf using the bookmark or shelf button on any poster.'
              }
              actionLabel="Browse Popular Titles"
              actionHref="/movies"
            />
          ) : (
            <div className="watchlist-grid">
              {filteredList.map(item => (
                <div key={`${item.type}-${item.id}`} className="watchlist-card-container">
                  <MediaCard content={item} />
                  <div className="watchlist-card__shelf-bar">
                    <ShelfSelector content={item} variant="dropdown" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── CONTENT AREA: CONTINUE WATCHING (HISTORY) ── */}
      {tab === 'continue' && (
        <>
          {filteredHistory.length === 0 ? (
            <StateView
              kind="empty"
              title={searchQuery ? 'No watch history matches' : 'Nothing watched yet'}
              message="Titles you start watching will automatically appear here with your playback progress."
              actionLabel="Explore Trending Content"
              actionHref="/"
            />
          ) : (
            <div className="history-list">
              {filteredHistory.map(h => {
                const pct = h.durationSeconds
                  ? Math.min(100, (h.progressSeconds / h.durationSeconds) * 100)
                  : 0;
                const resumeHref =
                  h.type === 'tv' && h.season && h.episode
                    ? `/watch/tv/${h.id}/${h.season}/${h.episode}`
                    : `/watch/${h.type}/${h.id}`;
                const detailHref = h.type === 'movie' ? `/movie/${h.id}` : `/tv/${h.id}`;

                return (
                  <div key={`${h.type}-${h.id}`} className="history-item">
                    <Link
                      href={resumeHref}
                      className="history-item__play"
                      aria-label={`Resume ${h.title}`}
                    >
                      <Play size={18} fill="currentColor" />
                    </Link>
                    <Link href={detailHref} className="history-item__body">
                      <p className="history-item__title">{h.title}</p>
                      <p className="history-item__meta">
                        {h.type === 'tv' && h.season ? `S${h.season}·E${h.episode} · ` : ''}
                        {h.progressSeconds > 0
                          ? `${Math.round(h.progressSeconds / 60)} min in${pct ? ` · ${Math.round(pct)}%` : ''}`
                          : 'Not started'}
                      </p>
                      {pct > 0 && (
                        <div className="history-item__bar">
                          <div
                            className="history-item__bar-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </Link>
                    <div className="history-item__actions">
                      <ShelfSelector content={h} variant="dropdown" />
                      <button
                        className="history-item__remove"
                        aria-label={`Remove ${h.title} from history`}
                        title="Remove from history"
                        onClick={() => removeFromHistory(h.type, h.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}
