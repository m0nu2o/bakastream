'use client';

import { useTheme } from '../hooks/useTheme';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggle, mounted } = useTheme();

  const isLight = mounted && theme === 'light';

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      title={isLight ? 'Dark mode' : 'Light mode'}
    >
      {isLight ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
