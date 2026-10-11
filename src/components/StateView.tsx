import Link from 'next/link';
import { AlertTriangle, SearchX, WifiOff, Film } from 'lucide-react';
import './StateView.css';

interface Props {
  kind?: 'error' | 'empty' | 'network' | 'missing';
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  onRetry?: () => void;
}

const ICONS = {
  error: AlertTriangle,
  empty: SearchX,
  network: WifiOff,
  missing: Film,
};

const DEFAULTS = {
  error: {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
  },
  empty: {
    title: 'Nothing here yet',
    message: 'There is nothing to show for this view right now.',
  },
  network: {
    title: 'Connection problem',
    message: 'We could not reach the service. Check your connection and try again.',
  },
  missing: { title: 'Not found', message: 'This title does not exist or is no longer available.' },
};

export default function StateView({
  kind = 'error',
  title,
  message,
  actionLabel = 'Go home',
  actionHref = '/',
  onRetry,
}: Props) {
  const Icon = ICONS[kind];
  const d = DEFAULTS[kind];

  return (
    <div className={`state-view state-view--${kind}`} role="alert">
      <span className="state-view__icon">
        <Icon size={40} strokeWidth={1.6} />
      </span>
      <h3 className="state-view__title">{title ?? d.title}</h3>
      <p className="state-view__message">{message ?? d.message}</p>
      <div className="state-view__actions">
        {onRetry && (
          <button className="btn btn--primary" onClick={onRetry}>
            Try again
          </button>
        )}
        <Link href={actionHref} className={onRetry ? 'btn btn--ghost' : 'btn btn--primary'}>
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
