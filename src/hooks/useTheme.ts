'use client';

import { useState, useEffect, useCallback } from 'react';

const THEME_STORAGE_KEY = 'bakastream-theme-v10';
const LEGACY_STORAGE_KEY_V9 = 'bakastream-theme-v9';
const LEGACY_STORAGE_KEY_V8 = 'bakastream-theme-v8';
const LEGACY_STORAGE_KEY_V7 = 'bakastream-theme-v7';
const LEGACY_STORAGE_KEY_V6 = 'bakastream-theme-v6';
const OLD_STORAGE_KEY = 'bakastream-theme';

export type ThemeId =
  | 'dark'
  | 'cyberpunk'
  | 'solo'
  | 'emerald'
  | 'solar'
  | 'midnight'
  | 'light';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  badge: string;
  category: 'dark' | 'light';
  accent: string;
  secondaryAccent?: string;
  bg: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Sakura Crimson',
    badge: 'CINEMA',
    category: 'dark',
    accent: '#F70063',
    secondaryAccent: '#FF85B3',
    bg: '#0B0C10',
    description: 'Deep obsidian cinema with signature hot rose crimson',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    badge: 'NEO-TOKYO',
    category: 'dark',
    accent: '#A855F7',
    secondaryAccent: '#06B6D4',
    bg: '#090814',
    description: 'Electric violet purple & neon cyan with deep indigo styling',
  },
  {
    id: 'solo',
    name: 'Solo Monarch',
    badge: 'SHADOW',
    category: 'dark',
    accent: '#00D2FF',
    secondaryAccent: '#38BDF8',
    bg: '#050811',
    description: 'Dark mana abyssal navy with piercing electric cyan glow',
  },
  {
    id: 'emerald',
    name: 'Emerald Shinobi',
    badge: 'SHONEN',
    category: 'dark',
    accent: '#10B981',
    secondaryAccent: '#00F5A0',
    bg: '#050D0A',
    description: 'Vivid jade emerald & ninja mint with dark forest tones',
  },
  {
    id: 'solar',
    name: 'Flame Hashira',
    badge: 'SOLAR',
    category: 'dark',
    accent: '#F59E0B',
    secondaryAccent: '#FF6B00',
    bg: '#0D0A07',
    description: 'Demon slayer solar flame with blazing amber gold warmth',
  },
  {
    id: 'midnight',
    name: 'Midnight OLED',
    badge: 'OLED',
    category: 'dark',
    accent: '#E11D48',
    secondaryAccent: '#FB7185',
    bg: '#000000',
    description: 'True pitch black contrast engineered for OLED screens',
  },
  {
    id: 'light',
    name: 'Studio Minimal',
    badge: 'STUDIO',
    category: 'light',
    accent: '#F70063',
    secondaryAccent: '#FF85B3',
    bg: '#F8F9FA',
    description: 'Apple-grade crisp light studio surface with refined contrast',
  },
];

const VALID_THEMES = new Set<ThemeId>([
  'dark',
  'cyberpunk',
  'solo',
  'emerald',
  'solar',
  'midnight',
  'light',
]);

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = (
        window.localStorage.getItem(THEME_STORAGE_KEY) ||
        window.localStorage.getItem(LEGACY_STORAGE_KEY_V9) ||
        window.localStorage.getItem(LEGACY_STORAGE_KEY_V8) ||
        window.localStorage.getItem(LEGACY_STORAGE_KEY_V7) ||
        window.localStorage.getItem(LEGACY_STORAGE_KEY_V6) ||
        window.localStorage.getItem(OLD_STORAGE_KEY)
      ) as ThemeId | null;

      if (stored && VALID_THEMES.has(stored)) {
        setThemeState(stored);
        document.documentElement.setAttribute('data-theme', stored);
      } else {
        setThemeState('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch {
      setThemeState('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const setTheme = useCallback((nextTheme: ThemeId) => {
    if (!VALID_THEMES.has(nextTheme)) return;
    setThemeState(nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    } catch {
      // Ignore localStorage errors in private mode
    }
  }, []);

  const toggle = useCallback(() => {
    setThemeState(prev => {
      const next: ThemeId = prev === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
        document.documentElement.setAttribute('data-theme', next);
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  return {
    theme,
    setTheme,
    toggle,
    mounted,
    themes: THEME_OPTIONS,
    isDark: theme !== 'light',
  };
}
