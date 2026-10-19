'use client';

import { useState, useEffect, useCallback } from 'react';

const THEME_STORAGE_KEY = 'bakastream-theme-v6';
const LEGACY_STORAGE_KEY = 'bakastream-theme-v5';
const OLD_STORAGE_KEY = 'bakastream-theme';

export type ThemeId =
  | 'light'
  | 'dark'
  | 'midnight'
  | 'cyberpunk'
  | 'emerald'
  | 'ocean'
  | 'amber'
  | 'sakura';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  category: 'light' | 'dark';
  accent: string;
  bg: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    name: 'Rose Minimal (Light)',
    category: 'light',
    accent: '#C21E56',
    bg: '#FFFDFD',
    description: 'Clean soft white canvas with signature Rose Red',
  },
  {
    id: 'dark',
    name: 'Rose Cinematic (Dark)',
    category: 'dark',
    accent: '#C21E56',
    bg: '#121318',
    description: 'Dark charcoal cinema with Rose Red accents',
  },
  {
    id: 'midnight',
    name: 'OLED Midnight',
    category: 'dark',
    accent: '#E50914',
    bg: '#050507',
    description: 'Pure black OLED with Netflix Crimson red',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    category: 'dark',
    accent: '#A855F7',
    bg: '#090A14',
    description: 'Electric violet with neon magenta glow',
  },
  {
    id: 'emerald',
    name: 'Emerald Matrix',
    category: 'dark',
    accent: '#10B981',
    bg: '#05110E',
    description: 'Deep forest night with jade green accents',
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    category: 'dark',
    accent: '#0EA5E9',
    bg: '#070E1A',
    description: 'Midnight navy with vivid sky blue accents',
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    category: 'dark',
    accent: '#F59E0B',
    bg: '#110D0B',
    description: 'Warm obsidian with glowing sunset gold',
  },
  {
    id: 'sakura',
    name: 'Sakura Blossom',
    category: 'light',
    accent: '#EC4899',
    bg: '#FFF8FA',
    description: 'Soft floral blossom with vibrant cherry pink',
  },
];

const VALID_THEMES = new Set<ThemeId>([
  'light',
  'dark',
  'midnight',
  'cyberpunk',
  'emerald',
  'ocean',
  'amber',
  'sakura',
]);

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = (
        window.localStorage.getItem(THEME_STORAGE_KEY) ||
        window.localStorage.getItem(LEGACY_STORAGE_KEY) ||
        window.localStorage.getItem(OLD_STORAGE_KEY)
      ) as ThemeId | null;

      if (stored && VALID_THEMES.has(stored)) {
        setThemeState(stored);
        document.documentElement.setAttribute('data-theme', stored);
      } else {
        setThemeState('light');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch {
      setThemeState('light');
      document.documentElement.setAttribute('data-theme', 'light');
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
    isDark: theme !== 'light' && theme !== 'sakura',
  };
}
