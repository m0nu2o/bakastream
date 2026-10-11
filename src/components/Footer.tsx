import Link from 'next/link';
import { Film, MonitorPlay, Bookmark, Info, ExternalLink } from 'lucide-react';
import './Footer.css';

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bakastream.vercel.app';

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
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Link href="/" className="footer__logo" aria-label="BakaStream home">
            <img src="/favicon.png" alt="BakaStream" width={24} height={24} className="footer__logo-img" />
            <span><span className="footer__logo-accent">Baka</span>Stream</span>
          </Link>
          <p className="footer__tagline">
            A modern interface for discovering movies and TV shows. BakaStream does not host, store,
            or distribute any media — playback is provided by third-party services, and a returned
            stream URL is not a claim of licensing.
          </p>
        </div>

        <nav className="footer__cols" aria-label="Footer">
          <div className="footer__col">
            <h4 className="footer__heading">Browse</h4>
            <Link href="/" className="footer__link">
              <Film size={14} /> Home
            </Link>
            <Link href="/movies" className="footer__link">
              <Film size={14} /> Movies
            </Link>
            <Link href="/tv" className="footer__link">
              <MonitorPlay size={14} /> TV Shows
            </Link>
            <Link href="/watchlist" className="footer__link">
              <Bookmark size={14} /> Watchlist
            </Link>
          </div>

          <div className="footer__col">
            <h4 className="footer__heading">Categories</h4>
            <Link href="/category/bollywood" className="footer__link">
              🍿 Bollywood
            </Link>
            <Link href="/category/hindi-serials" className="footer__link">
              📺 Hindi Serials
            </Link>
            <Link href="/category/hindi-web-series" className="footer__link">
              🇮🇳 Web Series
            </Link>
            <Link href="/category/kdrama" className="footer__link">
              🇰🇷 K-Dramas
            </Link>
            <Link href="/category/anime" className="footer__link">
              ⚔️ Anime
            </Link>
          </div>

          <div className="footer__col">
            <h4 className="footer__heading">About</h4>
            <Link href="/about" className="footer__link">
              <Info size={14} /> About &amp; legal
            </Link>
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer__link"
            >
              <ExternalLink size={14} /> TMDB
            </a>
            <a
              href="https://github.com/ProYato/NovaAPI"
              target="_blank"
              rel="noopener noreferrer"
              className="footer__link"
            >
              <ExternalLink size={14} /> NovaAPI
            </a>
          </div>

          <div className="footer__col">
            <h4 className="footer__heading">Instagram</h4>
            <a
              href="https://www.instagram.com/itxz_baka/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer__link footer__link--social"
              aria-label="Follow @itxz_baka on Instagram"
            >
              <InstagramIcon size={14} /> @itxz_baka
            </a>
          </div>
        </nav>
      </div>

      <div className="footer__base">
        <p>
          This product uses the TMDB API but is not endorsed or certified by{' '}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer__base-link"
          >
            TMDB
          </a>
          .
        </p>
        <p>
          © {new Date().getFullYear()} BakaStream · {APP_URL.replace(/^https?:\/\//, '')}
        </p>
      </div>
    </footer>
  );
}
