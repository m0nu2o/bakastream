import Link from 'next/link';
import { Film } from 'lucide-react';
import './not-found.css';

export default function NotFound() {
  return (
    <main className="notfound">
      <span className="notfound__icon">
        <Film size={44} strokeWidth={1.5} />
      </span>
      <h1 className="notfound__code">404</h1>
      <h2 className="notfound__title">Page not found</h2>
      <p className="notfound__text">
        The page you are looking for doesn&apos;t exist, or the title is no longer available.
      </p>
      <div className="notfound__actions">
        <Link href="/" className="btn btn--primary">
          Go home
        </Link>
        <Link href="/search" className="btn btn--ghost">
          Search titles
        </Link>
      </div>
    </main>
  );
}
