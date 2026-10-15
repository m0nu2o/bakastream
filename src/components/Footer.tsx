import Link from 'next/link';
import { Film, MonitorPlay, Sparkles, Bookmark, Info } from 'lucide-react';
import './Footer.css';

function InstagramIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="footer-minimal" aria-label="BakaStream footer">
      <div className="footer-minimal__inner">
        {/* Top: Brand & Quick Navigation */}
        <div className="footer-minimal__top">
          <div className="footer-minimal__brand">
            <Link href="/" className="footer-minimal__logo" aria-label="BakaStream home">
              <img
                src="/favicon.png"
                alt="BakaStream"
                width={22}
                height={22}
                className="footer-minimal__logo-img"
              />
              <span className="footer-minimal__logo-text">
                <span className="footer-minimal__logo-accent">Baka</span>Stream
              </span>
            </Link>
            <p className="footer-minimal__tagline">
              Modern cinema discovery for movies, series &amp; anime.
            </p>
          </div>

          <nav className="footer-minimal__nav" aria-label="Footer Navigation">
            <Link href="/" className="footer-minimal__link">
              <Film size={13} /> Home
            </Link>
            <Link href="/movies" className="footer-minimal__link">
              Movies
            </Link>
            <Link href="/tv" className="footer-minimal__link">
              <MonitorPlay size={13} /> TV Series
            </Link>
            <Link href="/anime" className="footer-minimal__link">
              <Sparkles size={13} /> Anime
            </Link>
            <Link href="/watchlist" className="footer-minimal__link">
              <Bookmark size={13} /> Watchlist
            </Link>
            <Link href="/about" className="footer-minimal__link">
              <Info size={13} /> Legal
            </Link>
            <a
              href="https://www.instagram.com/itxz_baka/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-minimal__social-pill"
              aria-label="Instagram profile @itxz_baka"
            >
              <InstagramIcon size={13} />
              <span>@itxz_baka</span>
            </a>
          </nav>
        </div>

        {/* Bottom: Legal, Attribution & Live Status */}
        <div className="footer-minimal__bottom">
          <div className="footer-minimal__legal">
            <span>Powered by TMDB API. BakaStream hosts no copyrighted media files.</span>
          </div>

          <div className="footer-minimal__meta">
            <span className="footer-minimal__status">
              <span className="footer-minimal__status-dot" />
              All Systems Operational
            </span>
            <span className="footer-minimal__copy">
              © {new Date().getFullYear()} BakaStream. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
