'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme, THEME_OPTIONS, type ThemeId, type ThemeMode } from '../hooks/useTheme';
import { Palette, Check, Sun, Moon } from 'lucide-react';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, mode, setTheme, setMode, toggle, mounted, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const activeThemeObj = THEME_OPTIONS.find(t => t.id === theme) ?? THEME_OPTIONS[0];

  return (
    <div className="theme-picker-container" ref={containerRef}>
      <button
        type="button"
        className={`theme-toggle ${open ? 'theme-toggle--open' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-label="Select theme and appearance"
        aria-expanded={open}
        aria-haspopup="dialog"
        title={`Theme: ${activeThemeObj.name} (${mode === 'dark' ? 'Dark' : 'Light'})`}
      >
        <Palette size={18} className="theme-toggle__icon" />
      </button>

      {open && (
        <div className="theme-popover" role="dialog" aria-label="Theme selector">
          {/* Header */}
          <div className="theme-popover__header">
            <div className="theme-popover__title-wrap">
              <span className="theme-popover__title">Appearance</span>
              <span className="theme-popover__sub">
                {activeThemeObj.name} · {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </div>
            <button
              type="button"
              className="theme-popover__quick-toggle"
              onClick={toggle}
              title={isDark ? 'Convert current theme to Light mode' : 'Convert current theme to Dark mode'}
              aria-label="Quick toggle light and dark"
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
              <span>{isDark ? 'Light' : 'Dark'}</span>
            </button>
          </div>

          {/* Mode Switcher Segmented Control: Dark vs Light for every theme */}
          <div className="theme-popover__mode-strip" role="group" aria-label="Appearance Mode">
            <button
              type="button"
              className={`theme-popover__mode-btn ${isDark ? 'theme-popover__mode-btn--active' : ''}`}
              onClick={() => setMode('dark')}
              aria-pressed={isDark}
            >
              <Moon size={13} />
              <span>Dark Mode</span>
            </button>
            <button
              type="button"
              className={`theme-popover__mode-btn ${!isDark ? 'theme-popover__mode-btn--active' : ''}`}
              onClick={() => setMode('light')}
              aria-pressed={!isDark}
            >
              <Sun size={13} />
              <span>Light Mode</span>
            </button>
          </div>

          {/* Theme Palettes List */}
          <div className="theme-popover__list">
            {THEME_OPTIONS.map(opt => {
              const isSelected = mounted && theme === opt.id;
              const previewBg = isDark ? opt.bgDark : opt.bgLight;
              const previewAccent = isDark ? opt.accent : opt.accentLight;

              return (
                <button
                  key={opt.id}
                  type="button"
                  data-theme-id={opt.id}
                  className={`theme-popover__item ${isSelected ? 'theme-popover__item--active' : ''}`}
                  onClick={() => {
                    setTheme(opt.id);
                  }}
                  aria-pressed={isSelected}
                >
                  <div
                    className="theme-popover__preview-pill"
                    style={{
                      background: previewBg,
                      borderColor: isSelected ? previewAccent : 'var(--border-color)',
                    }}
                  >
                    <span
                      className="theme-popover__preview-accent"
                      style={{ background: previewAccent }}
                    />
                  </div>

                  <div className="theme-popover__details">
                    <div className="theme-popover__name-row">
                      <span className="theme-popover__name">{opt.name}</span>
                      <span className={`theme-popover__badge theme-popover__badge--${opt.id}`}>
                        {opt.badge}
                      </span>
                    </div>
                    <span className="theme-popover__desc">{opt.description}</span>
                  </div>

                  {isSelected && (
                    <div className="theme-popover__check">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
