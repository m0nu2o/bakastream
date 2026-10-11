import type { Metadata } from 'next';
import Link from 'next/link';
import { Film, MonitorPlay, Bookmark, ShieldCheck, Server } from 'lucide-react';
import './about.css';

export const metadata: Metadata = {
  title: 'About & Legal',
  description:
    'What BakaStream is, where its data comes from, and how streaming providers are handled.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <main className="about page-transition">
      <h1>About BakaStream</h1>

      <p>
        BakaStream is a modern interface for discovering movies, TV shows and anime. It is a
        <strong> website only</strong> — there is no companion app — and it is designed so the
        metadata layer and the playback layer are fully separated.
      </p>

      <div className="about__grid">
        <section className="about__card">
          <h2>
            <Server size={18} /> Architecture
          </h2>
          <pre className="about__diagram">
            {`Browser
   ↓
Next.js (server)
   ↓
Internal API/service layer
   ├── TMDB  → metadata (server-held keys)
   └── /api/stream/resolve
         └── Stream providers → playback info
               ↓
          Video player`}
          </pre>
          <p>
            The browser never talks to TMDB directly and never sees an API key. Playback is resolved
            server-side through a provider registry, so swapping providers never touches UI code.
          </p>
        </section>

        <section className="about__card">
          <h2>
            <ShieldCheck size={18} /> Legal &amp; content policy
          </h2>
          <ul>
            <li>
              BakaStream hosts, stores and distributes <strong>no media</strong>.
            </li>
            <li>
              No DRM is bypassed and no paywall, authentication or technical protection measure is
              circumvented.
            </li>
            <li>
              The built-in player plays a <strong>clearly-labeled public sample stream</strong>{' '}
              until a real provider is configured.
            </li>
            <li>
              The optional Nova provider (off by default, enabled via <code>NOVA_API_URL</code>) is
              an <strong>unverified third party</strong>. A URL returned by any API is{' '}
              <strong>not</strong> proof that the content is licensed — point it only at streams you
              are authorized to use.
            </li>
            <li>
              The provider abstraction exists so legitimate, licensed services can be plugged in
              without touching the player UI.
            </li>
          </ul>
        </section>

        <section className="about__card">
          <h2>
            <Film size={18} /> Metadata
          </h2>
          <p>
            All titles, posters, backdrops, cast, seasons and episodes come from{' '}
            <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
              TMDB
            </a>
            . This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </section>

        <section className="about__card">
          <h2>
            <MonitorPlay size={18} /> Player
          </h2>
          <p>
            When a provider returns a native HLS/MP4 stream, BakaStream plays it in a custom HTML5
            player (hls.js) with quality selection, playback speed, picture-in-picture, keyboard
            shortcuts, progress saving and resume. Audio-language and subtitle options appear{' '}
            <strong>only</strong> when the provider actually returns them.
          </p>
        </section>

        <section className="about__card">
          <h2>
            <Bookmark size={18} /> Your data
          </h2>
          <p>
            Watchlist, continue-watching and playback progress are stored locally in your browser
            (localStorage). There is no account, no database and no tracking of what you watch.
          </p>
        </section>
      </div>

      <p className="about__back">
        <Link href="/" className="btn btn--primary">
          Start browsing
        </Link>
      </p>
    </main>
  );
}
