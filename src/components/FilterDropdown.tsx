'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, X, Search, type LucideIcon } from 'lucide-react';
import styles from './FilterDropdown.module.css';

export interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface FilterDropdownProps {
  label: string;
  value: string;
  defaultValue?: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  icon?: LucideIcon;
  placeholder?: string;
  hasSearch?: boolean;
  ariaLabel?: string;
  align?: 'left' | 'right';
}

export default function FilterDropdown({
  label,
  value,
  defaultValue = '',
  options,
  onChange,
  icon: Icon,
  placeholder,
  hasSearch = false,
  ariaLabel,
  align = 'left',
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const isFiltered = value !== defaultValue && Boolean(value);
  const activeOption = options.find(o => o.value === value);
  const displayLabel = activeOption?.label || placeholder || label;

  // Close on click outside or escape key
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Focus search input when popover opens
  useEffect(() => {
    if (open && hasSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!open) {
      setSearch('');
    }
  }, [open, hasSearch]);

  const filteredOptions = hasSearch && search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = (nextVal: string) => {
    onChange(nextVal);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(defaultValue);
    setOpen(false);
  };

  return (
    <div className={styles.wrap} ref={containerRef}>
      <button
        type="button"
        id={`filter-${id}`}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''} ${
          isFiltered ? styles.triggerActive : ''
        }`}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel || `${label} filter selector`}
      >
        {Icon && <Icon size={14} className={styles.icon} />}
        <span className={styles.labelPrefix}>{label}:</span>
        <span className={styles.valueText}>{displayLabel}</span>

        {isFiltered ? (
          <span
            role="button"
            className={styles.clearBtn}
            onClick={handleClear}
            title={`Clear ${label} filter`}
            aria-label={`Clear ${label} filter`}
          >
            <X size={11} strokeWidth={2.5} />
          </span>
        ) : (
          <ChevronDown
            size={13}
            className={`${styles.chevron} ${open ? styles.chevronRotated : ''}`}
          />
        )}
      </button>

      {open && (
        <div
          className={`${styles.menu} ${align === 'right' ? styles.menuRight : ''}`}
          role="listbox"
          aria-labelledby={`filter-${id}`}
        >
          {hasSearch && (
            <div className={styles.searchWrap}>
              <Search size={13} className={styles.searchIcon} />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className={styles.searchInput}
                aria-label={`Search ${label.toLowerCase()}`}
              />
              {search && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          )}

          <div className={styles.optionsList}>
            {filteredOptions.length === 0 ? (
              <div className={styles.emptyResults}>No {label.toLowerCase()} found</div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`${styles.option} ${
                      isSelected ? styles.optionSelected : ''
                    }`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <span className={styles.optionLabel}>
                      {opt.icon}
                      <span>{opt.label}</span>
                    </span>
                    {isSelected && (
                      <Check size={13} strokeWidth={2.5} className={styles.checkIcon} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
