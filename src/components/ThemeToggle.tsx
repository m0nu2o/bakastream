'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme, THEME_OPTIONS, type ThemeId } from '../hooks/useTheme';
import { Palette, Check, Sun, Moon } from 'lucide-react';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, setTheme, toggle, mounted, isDark } = useTheme();
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
        title={`Theme: ${activeThemeObj.name}`}
      >
        <span
          className="theme-toggle__dot"
          style={{ backgroundColor: activeThemeObj.accent }}
        />
        <Palette size={17} className="theme-toggle__icon" />
      </button>

      {open && (
        <div className="theme-popover" role="dialog" aria-label="Theme selector">
          <div className="theme-popover__header">
            <div className="theme-popover__title-wrap">
              <span className="theme-popover__title">Appearance</span>
              <span className="theme-popover__sub">8 curated palettes</span>
            </div>
            <button
              type="button"
              className="theme-popover__quick-toggle"
              onClick={toggle}
              title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
              aria-label="Quick toggle light and dark"
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
              <span>{isDark ? 'Light' : 'Dark'}</span>
            </button>
          </div>

          <div className="theme-popover__list">
            {THEME_OPTIONS.map(opt => {
              const isSelected = mounted && theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-theme-id={opt.id}
                  className={`theme-popover__item ${isSelected ? 'theme-popover__item--active' : ''}`}
                  onClick={() => {
                    setTheme(opt.id);
                    setOpen(false);
                  }}
                  aria-pressed={isSelected}
                >
                  <div
                    className="theme-popover__swatch"
                    style={{
                      background: opt.bg,
                      borderColor: opt.accent,
                    }}
                  >
                    <span
                      className="theme-popover__swatch-core"
                      style={{ background: opt.accent }}
                    />
                  </div>

                  <div className="theme-popover__details">
                    <div className="theme-popover__name-row">
                      <span className="theme-popover__name">{opt.name}</span>
                      <span className={`theme-popover__badge theme-popover__badge--${opt.category}`}>
                        {opt.id === 'midnight' ? 'OLED' : opt.category}
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
