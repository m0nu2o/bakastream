'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';
import type { MediaSummary } from '@/types';
import { toggleWatchlist } from '@/lib/storage';
import { useIsInWatchlist } from '@/hooks/useStoredCollection';

export default function WatchlistButton({ content }: { content: MediaSummary }) {
  const saved = useIsInWatchlist(content.type, content.id);

  return (
    <button
      className={`btn btn--ghost watchlist-btn ${saved ? 'watchlist-btn--on' : ''}`}
      onClick={() => toggleWatchlist(content)}
      aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
      {saved ? 'In watchlist' : 'Watchlist'}
    </button>
  );
}
