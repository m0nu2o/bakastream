'use client';

import { useState, useEffect, useCallback } from 'react';

const THEME_STORAGE_KEY = 'bakastream-theme-v8';
const LEGACY_STORAGE_KEY_V7 = 'bakastream-theme-v7';
const LEGACY_STORAGE_KEY_V6 = 'bakastream-theme-v6';
const OLD_STORAGE_KEY = 'bakastream-theme';

export type ThemeId =
  | 'dark'
  | 'midnight'
  | 'cyberpunk'
  | 'emerald'
  | 'sakura'
  | 'oceanic'
  | 'light';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  badge: string;
  category: 'dark' | 'light';
  accent: string;
  bg: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Cinematic Obsidian',
    badge: 'DEFAULT',
    category: 'dark',
    accent: '#F70063',
    bg: '#0B0C10',
    description: 'Deep obsidian cinema with signature hot rose crimson',
  },
  {
    id: 'midnight',
    name: 'OLED Pure Black',
    badge: 'OLED',
    category: 'dark',
    accent: '#F70063',
    bg: '#000000',
    description: 'True pitch black with high-contrast crimson highlights',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    badge: 'NEON',
    category: 'dark',
    accent: '#B026FF',
    bg: '#0B0816',
    description: 'Deep synthwave violet with electric purple glow',
  },
  {
    id: 'emerald',
    name: 'Tokyo Emerald',
    badge: 'TOKYO',
    category: 'dark',
    accent: '#00F59B',
    bg: '#08100C',
    description: 'Dark carbon matrix with luminous cyber emerald',
  },
  {
    id: 'sakura',
    name: 'Sakura Twilight',
    badge: 'SAKURA',
    category: 'dark',
    accent: '#FF5376',
    bg: '#120B14',
    description: 'Deep plum twilight with gentle cherry blossom pink',
  },
  {
    id: 'oceanic',
    name: 'Oceanic Abyss',
    badge: 'ABYSS',
    category: 'dark',
    accent: '#00D2FF',
    bg: '#080E18',
    description: 'Deep abyssal navy with vibrant electric cyan glow',
  },
  {
    id: 'light',
    name: 'Clean Studio Light',
    badge: 'STUDIO',
    category: 'light',
    accent: '#F70063',
    bg: '#F8F9FA',
    description: 'Crisp Apple-grade off-white studio surface',
  },
];

const VALID_THEMES = new Set<ThemeId>([
  'dark',
  'midnight',
  'cyberpunk',
  'emerald',
  'sakura',
  'oceanic',
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
