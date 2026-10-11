'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, History, Trash2, Play } from 'lucide-react';
import MediaCard from '@/components/MediaCard';
import MediaCardSkeleton from '@/components/MediaCardSkeleton';
import StateView from '@/components/StateView';
import { getWatchlist, getHistory, removeFromHistory, type HistoryEntry } from '@/lib/storage';
import type { MediaSummary } from '@/types';
import './watchlist.css';

type Tab = 'watchlist' | 'continue';

export default function WatchlistPage() {
  const [tab, setTab] = useState<Tab>('watchlist');
  const [list, setList] = useState<MediaSummary[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setList(getWatchlist());
    setHistory(getHistory());
    setReady(true);
  }, []);

  const refresh = () => {
    setList(getWatchlist());
    setHistory(getHistory());
  };

  if (!ready) {
    return (
      <main className="watchlist-page">
        <div className="watchlist-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      </main>
    );
  }

  const showWatchlist = tab === 'watchlist';

  return (
    <main className="watchlist-page page-transition">
      <header className="watchlist-head">
        <h1 className="watchlist-head__title">My List</h1>
        <div className="watchlist-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={showWatchlist}
            className={`watchlist-tab ${showWatchlist ? 'watchlist-tab--active' : ''}`}
            onClick={() => setTab('watchlist')}
          >
            <Bookmark size={16} /> Watchlist ({list.length})
          </button>
          <button
            role="tab"
            aria-selected={!showWatchlist}
            className={`watchlist-tab ${!showWatchlist ? 'watchlist-tab--active' : ''}`}
            onClick={() => setTab('continue')}
          >
            <History size={16} /> Continue watching ({history.length})
          </button>
        </div>
      </header>

      {showWatchlist && list.length === 0 && (
        <StateView
          kind="empty"
          title="Your watchlist is empty"
          message="Tap the bookmark icon on any poster to save it here. Your list is stored on this device."
          actionLabel="Browse movies"
          actionHref="/movies"
        />
      )}

      {showWatchlist && list.length > 0 && (
        <div className="watchlist-grid" onAuxClick={refresh} onClick={refresh}>
          {list.map(item => (
            <MediaCard key={`${item.type}-${item.id}`} content={item} />
          ))}
        </div>
      )}

      {!showWatchlist && history.length === 0 && (
        <StateView
          kind="empty"
          title="Nothing watched yet"
          message="Titles you open will appear here so you can pick up where you left off."
          actionLabel="Find something to watch"
          actionHref="/search"
        />
      )}

      {!showWatchlist && history.length > 0 && (
        <div className="history-list">
          {history.map(h => {
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
                      <div className="history-item__bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </Link>
                <button
                  className="history-item__remove"
                  aria-label={`Remove ${h.title} from history`}
                  onClick={() => {
                    removeFromHistory(h.type, h.id);
                    refresh();
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
