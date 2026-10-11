'use client';

import Link from 'next/link';
import { SkipBack, SkipForward } from 'lucide-react';

/** Prev/next episode controls under the player on TV watch pages. */
export default function EpisodeNav({
  tvId,
  season,
  episode,
  episodeCount,
}: {
  tvId: number;
  season: number;
  episode: number;
  episodeCount: number;
}) {
  if (episodeCount === 0) return null;

  const prev = episode > 1 ? episode - 1 : null;
  const next = episode < episodeCount ? episode + 1 : null;

  return (
    <div className="watch__epnav">
      {prev ? (
        <Link href={`/watch/tv/${tvId}/${season}/${prev}`} className="btn btn--ghost">
          <SkipBack size={15} /> E{prev}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/watch/tv/${tvId}/${season}/${next}`} className="btn btn--ghost">
          E{next} <SkipForward size={15} />
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
