'use client';

import { useSyncExternalStore } from 'react';
import {
  subscribe,
  getWatchlist,
  getHistory,
  isInWatchlist,
  getMediaStatus,
  getWatchlistCounts,
  EMPTY_WATCHLIST,
  EMPTY_HISTORY,
} from '@/lib/storage';
import type { MediaType, WatchlistStatus, WatchlistItem } from '@/types';

const EMPTY_COUNTS: Record<WatchlistStatus | 'all', number> = {
  all: 0,
  watching: 0,
  plan_to_watch: 0,
  completed: 0,
  on_hold: 0,
  dropped: 0,
};

/** Reactive watchlist — updates everywhere when any card toggles or updates it. */
export function useWatchlist(): WatchlistItem[] {
  return useSyncExternalStore(subscribe, getWatchlist, () => EMPTY_WATCHLIST);
}

/** Reactive watch history (continue watching / recently watched). */
export function useHistory() {
  return useSyncExternalStore(subscribe, getHistory, () => EMPTY_HISTORY);
}

/** Reactive single-title watchlist membership. */
export function useIsInWatchlist(type: MediaType, id: number): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isInWatchlist(type, id),
    () => false
  );
}

/** Reactive single-title status ('watching', 'plan_to_watch', 'completed', 'on_hold', 'dropped' | null). */
export function useMediaStatus(type: MediaType, id: number): WatchlistStatus | null {
  return useSyncExternalStore(
    subscribe,
    () => getMediaStatus(type, id),
    () => null
  );
}

/** Reactive category breakdown counts. */
export function useWatchlistCounts(): Record<WatchlistStatus | 'all', number> {
  return useSyncExternalStore(
    subscribe,
    getWatchlistCounts,
    () => EMPTY_COUNTS
  );
}
