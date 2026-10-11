'use client';

import { useSyncExternalStore } from 'react';
import {
  subscribe,
  getWatchlist,
  getHistory,
  isInWatchlist,
  EMPTY_WATCHLIST,
  EMPTY_HISTORY,
} from '@/lib/storage';
import type { MediaType } from '@/types';

/** Reactive watchlist — updates everywhere when any card toggles it. */
export function useWatchlist() {
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
