/**
 * Client-side persistence for watchlist, continue-watching and watch history.
 * localStorage-backed (no auth/database required); every helper degrades
 * gracefully when storage is unavailable (private mode, quota).
 *
 * Exposed as a tiny external store so React components can read it with
 * useSyncExternalStore — no setState-in-effect, and every consumer updates
 * together when the list changes.
 */

import type { MediaSummary, MediaType } from '@/types';

const WATCHLIST_KEY = 'bakastream:watchlist';
const HISTORY_KEY = 'bakastream:history';
const PROGRESS_KEY_PREFIX = 'bakastream:progress';

/* ── External store plumbing ───────────────────────────────────────────── */

type Listener = () => void;
const listeners = new Set<Listener>();

const notify = () => listeners.forEach(l => l());

if (typeof window !== 'undefined') {
  window.addEventListener('storage', notify);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Cached parse so getSnapshot returns stable references between mutations. */
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>();

function readSnapshot<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
    if (!raw && key.startsWith('bakastream:')) {
      const legacyKey = key.replace('bakastream:', 'skystream:');
      const legacyRaw = window.localStorage.getItem(legacyKey);
      if (legacyRaw) {
        raw = legacyRaw;
        window.localStorage.setItem(key, legacyRaw);
      }
    }
  } catch {
    return fallback;
  }
  const cached = snapshotCache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;
  let value: T;
  try {
    value = raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    value = fallback;
  }
  snapshotCache.set(key, { raw, value });
  return value;
}

/** Stable empty references for useSyncExternalStore server snapshots. */
export const EMPTY_WATCHLIST: MediaSummary[] = [];
export const EMPTY_HISTORY: HistoryEntry[] = [];

/* ── Watchlist ─────────────────────────────────────────────────────────── */

export function getWatchlist(): MediaSummary[] {
  return readSnapshot<MediaSummary[]>(WATCHLIST_KEY, EMPTY_WATCHLIST);
}

export function isInWatchlist(type: MediaType, id: number): boolean {
  return getWatchlist().some(item => item.type === type && item.id === id);
}

/** Adds/removes the title; returns true when it is now in the watchlist. */
export function toggleWatchlist(item: MediaSummary): boolean {
  const list = getWatchlist();
  const exists = list.findIndex(i => i.type === item.type && i.id === item.id);
  let added: boolean;
  if (exists >= 0) {
    list.splice(exists, 1);
    added = false;
  } else {
    list.unshift(item);
    added = true;
  }
  writeRaw(WATCHLIST_KEY, list.slice(0, 200));
  return added;
}

/* ── Continue watching / history ───────────────────────────────────────── */

export interface HistoryEntry extends MediaSummary {
  /** Last time this title was opened (epoch ms). */
  watchedAt: number;
  /** Seconds into the current playthrough. */
  progressSeconds: number;
  durationSeconds: number | null;
  season: number | null;
  episode: number | null;
}

export function getHistory(): HistoryEntry[] {
  return readSnapshot<HistoryEntry[]>(HISTORY_KEY, EMPTY_HISTORY);
}

export function recordWatch(entry: HistoryEntry): void {
  const list = getHistory().filter(h => !(h.type === entry.type && h.id === entry.id));
  writeRaw(HISTORY_KEY, [entry, ...list].slice(0, 100));
}

export function removeFromHistory(type: MediaType, id: number): void {
  writeRaw(
    HISTORY_KEY,
    getHistory().filter(h => !(h.type === type && h.id === id))
  );
}

/* ── Playback progress ─────────────────────────────────────────────────── */

export interface ProgressRecord {
  seconds: number;
  duration: number | null;
  updatedAt: number;
}

export function progressKey(
  type: MediaType,
  id: number,
  season?: number | null,
  episode?: number | null
): string {
  return type === 'tv' && season && episode
    ? `${PROGRESS_KEY_PREFIX}:tv:${id}:${season}:${episode}`
    : `${PROGRESS_KEY_PREFIX}:movie:${id}`;
}

export function getProgress(
  type: MediaType,
  id: number,
  season?: number | null,
  episode?: number | null
): ProgressRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = progressKey(type, id, season, episode);
    let raw = window.localStorage.getItem(key);
    if (!raw) {
      const legacyKey = key.replace('bakastream:', 'skystream:');
      raw = window.localStorage.getItem(legacyKey);
    }
    return raw ? (JSON.parse(raw) as ProgressRecord) : null;
  } catch {
    return null;
  }
}

export function saveProgress(
  type: MediaType,
  id: number,
  seconds: number,
  duration: number | null,
  season?: number | null,
  episode?: number | null
): void {
  writeRaw(progressKey(type, id, season, episode), {
    seconds: Math.floor(seconds),
    duration: duration ? Math.floor(duration) : null,
    updatedAt: Date.now(),
  } satisfies ProgressRecord);
}

export function clearProgress(
  type: MediaType,
  id: number,
  season?: number | null,
  episode?: number | null
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(progressKey(type, id, season, episode));
    notify();
  } catch {
    // non-fatal
  }
}

/* ── Raw writers (mutation + notify) ───────────────────────────────────── */

function writeRaw(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    notify();
  } catch {
    // storage unavailable — non-fatal
  }
}
