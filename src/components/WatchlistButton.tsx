'use client';

import ShelfSelector from '@/components/ShelfSelector';
import type { MediaSummary } from '@/types';

export default function WatchlistButton({ content }: { content: MediaSummary }) {
  return <ShelfSelector content={content} variant="button" />;
}
