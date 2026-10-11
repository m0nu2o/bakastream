'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Menu,
  X,
  Home,
  Film,
  MonitorPlay,
  Clapperboard,
  Bookmark,
  ChevronDown,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { getGenres } from '@/lib/tmdb/client';
import { listCategories } from '@/lib/categories';
import type { Genre } from '@/types';
import './Navbar.css';

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/movies', label: 'Movies', icon: Film },
  { href: '/tv', label: 'TV Shows', icon: MonitorPlay },
  { href: '/anime', label: 'Anime', icon: Clapperboard },
  { href: '/watchlist', label: 'Watchlist', icon: Bookmark },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [genresOpen, setGenresOpen] = useState(false);
  const [mobileGenresOpen, setMobileGenresOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const categories = listCategories();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setGenresOpen(false);
    setCategoriesOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const loadGenres = useCallback(() => {
    if (genres.length > 0) return;
    getGenres('movie')
      .then(setGenres)
      .catch(() => setGenres([]));
  }, [genres.length]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const genreHref = (g: Genre) => `/movies?genre=${g.id}`;

  return (
    <>
      <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <div className="navbar__inner">
          <Link href="/" className="navbar__logo" aria-label="BakaStream home">
            <img src="/favicon.png" alt="BakaStream" width={28} height={28} className="navbar__logo-img" />
            <span><span className="navbar__logo-accent">Baka</span>Stream</span>
          </Link>

          <nav className="navbar__links" aria-label="Primary">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`navbar__link ${isActive(link.href) ? 'navbar__link--active' : ''}`}
              >
                {link.label}
              </Link>
            ))}

            {/* Categories Dropdown */}
            <div className={`navbar__dropdown ${categoriesOpen ? 'navbar__dropdown--open' : ''}`}>
              <button
                className={`navbar__link navbar__dropdown-toggle ${pathname.startsWith('/category') ? 'navbar__link--active' : ''}`}
                onClick={() => {
                  setCategoriesOpen(o => !o);
                  setGenresOpen(false);
                }}
                aria-expanded={categoriesOpen}
                aria-haspopup="true"
              >
                Categories <ChevronDown size={14} />
              </button>
              {categoriesOpen && (
                <div className="navbar__dropdown-menu" onMouseLeave={() => setCategoriesOpen(false)}>
                  {categories.map(c => (
                    <Link
                      key={c.id}
                      href={`/category/${c.id}`}
                      className="navbar__dropdown-item"
                      onClick={() => setCategoriesOpen(false)}
                    >
                      {c.icon} {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Genres Dropdown */}
            <div
              className={`navbar__dropdown ${genresOpen ? 'navbar__dropdown--open' : ''}`}
              onMouseEnter={loadGenres}
            >
              <button
                className={`navbar__link navbar__dropdown-toggle ${pathname.startsWith('/genre') ? 'navbar__link--active' : ''}`}
                onClick={() => {
                  setGenresOpen(o => !o);
                  setCategoriesOpen(false);
                }}
                aria-expanded={genresOpen}
                aria-haspopup="true"
              >
                Genres <ChevronDown size={14} />
              </button>
              {genresOpen && (
                <div className="navbar__dropdown-menu" onMouseLeave={() => setGenresOpen(false)}>
                  {genres.length === 0 && <span className="navbar__dropdown-empty">Loading…</span>}
                  {genres.map(g => (
                    <Link
                      key={g.id}
                      href={genreHref(g)}
                      className="navbar__dropdown-item"
                      onClick={() => setGenresOpen(false)}
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="navbar__actions">
            <Link href="/search" className="navbar__search-btn" aria-label="Search">
              <Search size={20} />
              <span className="navbar__search-label">Search</span>
            </Link>
            <ThemeToggle />
            <button
              className="navbar__burger"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(o => !o)}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer — redesigned, not a shrunken navbar */}
      {mobileOpen && (
        <div className="mobile-nav" role="dialog" aria-label="Navigation menu">
          <nav className="mobile-nav__links">
            {NAV_LINKS.map(link => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`mobile-nav__link ${isActive(link.href) ? 'mobile-nav__link--active' : ''}`}
                >
                  <Icon size={22} />
                  {link.label}
                </Link>
              );
            })}
            <button
              className={`mobile-nav__link mobile-nav__link--toggle ${pathname.startsWith('/category') ? 'mobile-nav__link--active' : ''}`}
              onClick={() => setMobileCategoriesOpen(o => !o)}
              aria-expanded={mobileCategoriesOpen}
            >
              <Film size={22} />
              Categories
              <ChevronDown
                size={18}
                className={`mobile-nav__chevron ${mobileCategoriesOpen ? 'mobile-nav__chevron--open' : ''}`}
              />
            </button>
            {mobileCategoriesOpen && (
              <div className="mobile-nav__genres">
                {categories.map(c => (
                  <Link key={c.id} href={`/category/${c.id}`} className="mobile-nav__genre">
                    {c.icon} {c.name}
                  </Link>
                ))}
              </div>
            )}
            <button
              className={`mobile-nav__link mobile-nav__link--toggle ${pathname.startsWith('/genre') ? 'mobile-nav__link--active' : ''}`}
              onClick={() => setMobileGenresOpen(o => !o)}
              aria-expanded={mobileGenresOpen}
            >
              <Clapperboard size={22} />
              Genres
              <ChevronDown
                size={18}
                className={`mobile-nav__chevron ${mobileGenresOpen ? 'mobile-nav__chevron--open' : ''}`}
              />
            </button>
            {mobileGenresOpen && (
              <div className="mobile-nav__genres">
                {genres.length === 0 && <span className="mobile-nav__genre-empty">Loading…</span>}
                {genres.map(g => (
                  <Link key={g.id} href={genreHref(g)} className="mobile-nav__genre">
                    {g.name}
                  </Link>
                ))}
              </div>
            )}
          </nav>
          <p className="mobile-nav__footnote">Movies &amp; series. Metadata by TMDB.</p>
        </div>
      )}
    </>
  );
}
