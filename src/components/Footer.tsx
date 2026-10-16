import Link from 'next/link';
import { Film, MonitorPlay, Sparkles, Bookmark, Info, Mail } from 'lucide-react';
import BakaLogo from '@/components/BakaLogo';
import './Footer.css';

function InstagramIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
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
    <footer className="footer-container" aria-label="BakaStream footer">
      {/* ── TOP NAV BAR (PRESERVING ALL ORIGINAL ELEMENTS) ── */}
      <div className="footer-top">
        <div className="footer-top__inner">
          <div className="footer-top__brand">
            <Link href="/" className="footer-top__logo" aria-label="BakaStream home">
              <BakaLogo size={28} />
              <span className="footer-top__logo-text">
                <span className="footer-top__logo-accent">BAKA</span>STREAM
              </span>
            </Link>
            <p className="footer-top__tagline">
              Modern cinema discovery for movies, series &amp; anime.
            </p>
          </div>

          <nav className="footer-top__nav" aria-label="Footer Navigation">
            <Link href="/" className="footer-top__link">
              <Film size={13} /> Home
            </Link>
            <Link href="/movies" className="footer-top__link">
              Movies
            </Link>
            <Link href="/tv" className="footer-top__link">
              <MonitorPlay size={13} /> TV Series
            </Link>
            <Link href="/anime" className="footer-top__link">
              <Sparkles size={13} /> Anime
            </Link>
            <Link href="/watchlist" className="footer-top__link">
              <Bookmark size={13} /> Watchlist
            </Link>
            <Link href="/about" className="footer-top__link">
              <Info size={13} /> Legal
            </Link>
          </nav>
        </div>
      </div>

      {/* ── BOTTOM SIGNATURE STRIP BAR (EXACT REFERENCE SCREENSHOT STYLE) ── */}
      <div className="footer-strip">
        <div className="footer-strip__inner">
          {/* Left: Contact Email & TMDB Legal Notice */}
          <div className="footer-strip__left">
            <div className="footer-strip__contact">
              <span className="footer-strip__label">Email:</span>
              <a href="mailto:percyywii@gmail.com" className="footer-strip__link">
                percyywii@gmail.com
              </a>
            </div>
            <p className="footer-strip__legal">
              Powered by TMDB API. BakaStream hosts no copyrighted media files.
            </p>
          </div>

          {/* Center: Signature Round Social Buttons */}
          <div className="footer-strip__center">
            <a
              href="https://www.instagram.com/itxz_baka/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-strip__circle-btn"
              title="Instagram @itxz_baka"
              aria-label="Instagram profile @itxz_baka"
            >
              <InstagramIcon size={18} />
            </a>
            <a
              href="mailto:percyywii@gmail.com"
              className="footer-strip__circle-btn"
              title="Email: percyywii@gmail.com"
              aria-label="Email Support"
            >
              <Mail size={17} />
            </a>
          </div>

          {/* Right: Copyright */}
          <div className="footer-strip__right">
            <div className="footer-strip__copy">
              © {new Date().getFullYear()} BakaStream. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
