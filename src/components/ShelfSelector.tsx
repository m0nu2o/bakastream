'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  PlayCircle,
  Clock,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import type { MediaSummary, WatchlistStatus } from '@/types';
import { setMediaStatus, getMediaStatus } from '@/lib/storage';
import { useMediaStatus } from '@/hooks/useStoredCollection';
import './ShelfSelector.css';

export interface ShelfOption {
  id: WatchlistStatus;
  label: string;
  shortLabel: string;
  color: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
}

export const SHELF_OPTIONS: ShelfOption[] = [
  {
    id: 'watching',
    label: 'Currently Watching',
    shortLabel: 'Watching',
    color: '#10B981',
    icon: PlayCircle,
  },
  {
    id: 'plan_to_watch',
    label: 'Plan to Watch',
    shortLabel: 'Plan to Watch',
    color: 'var(--accent, #F70063)',
    icon: Clock,
  },
  {
    id: 'completed',
    label: 'Completed',
    shortLabel: 'Completed',
    color: '#3B82F6',
    icon: CheckCircle2,
  },
  {
    id: 'on_hold',
    label: 'On Hold',
    shortLabel: 'On Hold',
    color: '#F59E0B',
    icon: PauseCircle,
  },
  {
    id: 'dropped',
    label: 'Dropped',
    shortLabel: 'Dropped',
    color: '#EF4444',
    icon: XCircle,
  },
];

interface Props {
  content: MediaSummary;
  variant?: 'card-badge' | 'button' | 'dropdown';
  className?: string;
  onStatusChange?: (status: WatchlistStatus | null) => void;
}

export default function ShelfSelector({
  content,
  variant = 'card-badge',
  className = '',
  onStatusChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentStatus = useMediaStatus(content.type, content.id);

  // Close when clicked outside or on Escape
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSelect = (status: WatchlistStatus | null, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMediaStatus(content, status);
    if (onStatusChange) onStatusChange(status);
    setOpen(false);
  };

  const handleQuickToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentStatus) {
      // Toggle menu instead of instant delete to avoid accidental deletion
      setOpen(prev => !prev);
    } else {
      // Default to "Plan to Watch"
      setMediaStatus(content, 'plan_to_watch');
      if (onStatusChange) onStatusChange('plan_to_watch');
    }
  };

  const activeOption = SHELF_OPTIONS.find(opt => opt.id === currentStatus);

  // 1. DETAIL PAGE BUTTON VARIANT
  if (variant === 'button') {
    return (
      <div className={`shelf-selector-btn-wrap ${className}`} ref={containerRef}>
        <div className="shelf-selector-btn-group">
          <button
            type="button"
            className={`btn ${currentStatus ? 'btn--secondary shelf-selector-btn--active' : 'btn--ghost'}`}
            onClick={handleQuickToggle}
            aria-label={currentStatus ? `In shelf: ${activeOption?.label}` : 'Add to watchlist'}
          >
            {activeOption ? (
              <>
                <activeOption.icon size={18} style={{ color: activeOption.color }} />
                <span>{activeOption.shortLabel}</span>
              </>
            ) : (
              <>
                <Bookmark size={18} />
                <span>Add to Shelf</span>
              </>
            )}
          </button>
          <button
            type="button"
            className={`btn ${currentStatus ? 'btn--secondary' : 'btn--ghost'} shelf-selector-chevron-btn`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(prev => !prev);
            }}
            aria-expanded={open}
            aria-label="Select shelf status"
          >
            <ChevronDown size={15} />
          </button>
        </div>

        {open && (
          <div className="shelf-popover shelf-popover--button" role="menu">
            <div className="shelf-popover__header">Move to Shelf</div>
            <div className="shelf-popover__list">
              {SHELF_OPTIONS.map(opt => {
                const isSelected = currentStatus === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`shelf-popover__item ${isSelected ? 'shelf-popover__item--active' : ''}`}
                    onClick={(e) => handleSelect(opt.id, e)}
                  >
                    <Icon size={16} style={{ color: opt.color }} />
                    <span className="shelf-popover__item-label">{opt.label}</span>
                    {isSelected && <span className="shelf-popover__dot" style={{ background: opt.color }} />}
                  </button>
                );
              })}
              {currentStatus && (
                <button
                  type="button"
                  className="shelf-popover__item shelf-popover__item--remove"
                  onClick={(e) => handleSelect(null, e)}
                >
                  <Trash2 size={16} />
                  <span>Remove from Shelf</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. INLINE DROPDOWN VARIANT (used in Watchlist shelf manager)
  if (variant === 'dropdown') {
    return (
      <div className={`shelf-dropdown-wrap ${className}`} ref={containerRef}>
        <button
          type="button"
          className="shelf-dropdown-trigger"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(prev => !prev);
          }}
          aria-expanded={open}
        >
          {activeOption ? (
            <>
              <span className="shelf-dropdown-dot" style={{ background: activeOption.color }} />
              <span>{activeOption.shortLabel}</span>
            </>
          ) : (
            <>
              <Bookmark size={13} />
              <span>Move to Shelf</span>
            </>
          )}
          <ChevronDown size={13} className="shelf-dropdown-chevron" />
        </button>

        {open && (
          <div className="shelf-popover shelf-popover--dropdown" role="menu">
            <div className="shelf-popover__list">
              {SHELF_OPTIONS.map(opt => {
                const isSelected = currentStatus === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`shelf-popover__item ${isSelected ? 'shelf-popover__item--active' : ''}`}
                    onClick={(e) => handleSelect(opt.id, e)}
                  >
                    <Icon size={15} style={{ color: opt.color }} />
                    <span className="shelf-popover__item-label">{opt.label}</span>
                    {isSelected && <span className="shelf-popover__dot" style={{ background: opt.color }} />}
                  </button>
                );
              })}
              {currentStatus && (
                <button
                  type="button"
                  className="shelf-popover__item shelf-popover__item--remove"
                  onClick={(e) => handleSelect(null, e)}
                >
                  <Trash2 size={15} />
                  <span>Remove from List</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. CARD BADGE VARIANT (top-right of MediaCard)
  return (
    <div className={`shelf-card-badge-container ${className}`} ref={containerRef}>
      <button
        type="button"
        className={`shelf-card-btn ${currentStatus ? 'shelf-card-btn--active' : ''}`}
        aria-label={currentStatus ? `In shelf: ${activeOption?.label}. Click to change` : 'Add to shelf'}
        title={currentStatus ? `Shelf: ${activeOption?.label} (Click to change)` : 'Add to Watchlist'}
        onClick={handleQuickToggle}
      >
        {activeOption ? (
          <activeOption.icon size={15} style={{ color: activeOption.color }} />
        ) : (
          <Bookmark size={14} />
        )}
      </button>

      {open && (
        <div className="shelf-popover shelf-popover--card" role="menu">
          <div className="shelf-popover__header">Select Shelf</div>
          <div className="shelf-popover__list">
            {SHELF_OPTIONS.map(opt => {
              const isSelected = currentStatus === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`shelf-popover__item ${isSelected ? 'shelf-popover__item--active' : ''}`}
                  onClick={(e) => handleSelect(opt.id, e)}
                >
                  <Icon size={14} style={{ color: opt.color }} />
                  <span className="shelf-popover__item-label">{opt.label}</span>
                  {isSelected && <span className="shelf-popover__dot" style={{ background: opt.color }} />}
                </button>
              );
            })}
            {currentStatus && (
              <button
                type="button"
                className="shelf-popover__item shelf-popover__item--remove"
                onClick={(e) => handleSelect(null, e)}
              >
                <Trash2 size={14} />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
