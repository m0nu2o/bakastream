'use client';

import Link from 'next/link';
import { SkipBack, SkipForward } from 'lucide-react';
import type { SeasonInfo } from '@/types';

/** Prev/next episode controls under the player on TV watch pages with cross-season transition. */
export default function EpisodeNav({
  tvId,
  season,
  episode,
  episodeCount,
  allSeasons = [],
}: {
  tvId: number;
  season: number;
  episode: number;
  episodeCount: number;
  allSeasons?: SeasonInfo[];
}) {
  if (episodeCount === 0 && allSeasons.length === 0) return null;

  // Previous episode calculation
  let prevTarget: { season: number; episode: number; label: string } | null = null;
  if (episode > 1) {
    prevTarget = { season, episode: episode - 1, label: `E${episode - 1}` };
  } else if (season > 1) {
    const prevSeasonObj = allSeasons.find(s => s.seasonNumber === season - 1);
    if (prevSeasonObj && prevSeasonObj.episodeCount > 0) {
      prevTarget = {
        season: season - 1,
        episode: prevSeasonObj.episodeCount,
        label: `S${season - 1} E${prevSeasonObj.episodeCount}`,
      };
    }
  }

  // Next episode calculation
  let nextTarget: { season: number; episode: number; label: string } | null = null;
  if (episode < episodeCount) {
    nextTarget = { season, episode: episode + 1, label: `E${episode + 1}` };
  } else {
    const nextSeasonObj = allSeasons.find(s => s.seasonNumber === season + 1);
    if (nextSeasonObj && nextSeasonObj.episodeCount > 0) {
      nextTarget = {
        season: season + 1,
        episode: 1,
        label: `S${season + 1} E1`,
      };
    }
  }

  return (
    <div className="watch__epnav">
      {prevTarget ? (
        <Link
          href={`/watch/tv/${tvId}/${prevTarget.season}/${prevTarget.episode}`}
          className="btn btn--ghost"
          title={`Go to Season ${prevTarget.season} Episode ${prevTarget.episode}`}
        >
          <SkipBack size={15} /> {prevTarget.label}
        </Link>
      ) : (
        <span />
      )}
      {nextTarget ? (
        <Link
          href={`/watch/tv/${tvId}/${nextTarget.season}/${nextTarget.episode}`}
          className="btn btn--ghost"
          title={`Go to Season ${nextTarget.season} Episode ${nextTarget.episode}`}
        >
          {nextTarget.label} <SkipForward size={15} />
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
