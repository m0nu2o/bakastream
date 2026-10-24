'use client';

import { useState, useEffect, useCallback } from 'react';

const THEME_STORAGE_KEY = 'bakastream-theme-v11';
const MODE_STORAGE_KEY = 'bakastream-mode-v11';
const LEGACY_STORAGE_KEY_V10 = 'bakastream-theme-v10';
const LEGACY_STORAGE_KEY_V9 = 'bakastream-theme-v9';
const LEGACY_STORAGE_KEY_V8 = 'bakastream-theme-v8';

export type ThemeId =
  | 'dark'
  | 'cyberpunk'
  | 'solo'
  | 'emerald'
  | 'solar'
  | 'midnight';

export type ThemeMode = 'dark' | 'light';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  badge: string;
  accent: string;
  accentLight: string;
  secondaryAccent?: string;
  bgDark: string;
  bgLight: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Cinema Red',
    badge: 'DEFAULT',
    accent: '#E11D48',
    accentLight: '#BE123C',
    secondaryAccent: '#FB7185',
    bgDark: '#0B0C10',
    bgLight: '#F8F9FA',
    description: 'Cinematic dark canvas with rich signature crimson accents',
  },
  {
    id: 'midnight',
    name: 'Midnight OLED',
    badge: 'OLED',
    accent: '#E11D48',
    accentLight: '#BE123C',
    secondaryAccent: '#FB7185',
    bgDark: '#000000',
    bgLight: '#F8F9FA',
    description: 'True pitch black #000000 contrast for deep OLED displays',
  },
  {
    id: 'solo',
    name: 'Deep Sapphire',
    badge: 'SAPPHIRE',
    accent: '#0284C7',
    accentLight: '#0369A1',
    secondaryAccent: '#38BDF8',
    bgDark: '#050811',
    bgLight: '#F8F9FA',
    description: 'Abyssal night navy with refined ocean sapphire accents',
  },
  {
    id: 'emerald',
    name: 'Nordic Spruce',
    badge: 'EMERALD',
    accent: '#10B981',
    accentLight: '#059669',
    secondaryAccent: '#34D399',
    bgDark: '#050D0A',
    bgLight: '#F8F9FA',
    description: 'Deep spruce canvas with sophisticated emerald highlights',
  },
  {
    id: 'solar',
    name: 'Warm Amber',
    badge: 'AMBER',
    accent: '#F59E0B',
    accentLight: '#D97706',
    secondaryAccent: '#FBBF24',
    bgDark: '#0D0A07',
    bgLight: '#F8F9FA',
    description: 'Charcoal carbon surface with warm golden amber tones',
  },
  {
    id: 'cyberpunk',
    name: 'Amethyst Violet',
    badge: 'VIOLET',
    accent: '#9333EA',
    accentLight: '#7E22CE',
    secondaryAccent: '#A855F7',
    bgDark: '#0A0815',
    bgLight: '#F8F9FA',
    description: 'Subtle midnight violet with sleek amethyst accents',
  },
];

const VALID_THEMES = new Set<ThemeId>([
  'dark',
  'cyberpunk',
  'solo',
  'emerald',
  'solar',
  'midnight',
]);

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>('dark');
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const storedTheme = (
        window.localStorage.getItem(THEME_STORAGE_KEY) ||
        window.localStorage.getItem(LEGACY_STORAGE_KEY_V10) ||
        window.localStorage.getItem(LEGACY_STORAGE_KEY_V9) ||
        window.localStorage.getItem(LEGACY_STORAGE_KEY_V8)
      ) as string | null;

      const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY) as ThemeMode | null;

      let initialTheme: ThemeId = 'dark';
      let initialMode: ThemeMode = storedMode === 'light' ? 'light' : 'dark';

      if (storedTheme === 'light') {
        initialTheme = 'dark';
        initialMode = 'light';
      } else if (storedTheme && VALID_THEMES.has(storedTheme as ThemeId)) {
        initialTheme = storedTheme as ThemeId;
      }

      setThemeState(initialTheme);
      setModeState(initialMode);
      document.documentElement.setAttribute('data-theme', initialTheme);
      document.documentElement.setAttribute('data-mode', initialMode);
    } catch {
      setThemeState('dark');
      setModeState('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.setAttribute('data-mode', 'dark');
    }
  }, []);

  const setTheme = useCallback((nextTheme: ThemeId) => {
    if (!VALID_THEMES.has(nextTheme)) return;
    setThemeState(nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, nextMode);
      document.documentElement.setAttribute('data-mode', nextMode);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggle = useCallback(() => {
    setModeState(prev => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem(MODE_STORAGE_KEY, next);
        document.documentElement.setAttribute('data-mode', next);
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  return {
    theme,
    mode,
    setTheme,
    setMode,
    toggle,
    mounted,
    themes: THEME_OPTIONS,
    isDark: mode === 'dark',
  };
}
