'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play } from 'lucide-react';
import type { SeasonDetailInfo, SeasonInfo } from '@/types';
import { getSeason } from '@/lib/tmdb/client';
import { stillUrl } from '@/lib/tmdb/image';
import { watchTVUrl } from '@/utils/slug';
import './episodes.css';

interface Props {
  tvId: number;
  seasons: SeasonInfo[];
}

/**
 * Season tabs + scrollable episode cards. Season 1 renders with the server
 * (prefetched prop `initialSeason` is optional); other seasons are fetched
 * on demand from the internal TMDB proxy.
 */
export default function EpisodeBrowser({ tvId, seasons }: Props) {
  const [active, setActive] = useState(seasons[0]?.seasonNumber ?? 1);
  const [season, setSeason] = useState<SeasonDetailInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSeason(tvId, active)
      .then(data => {
        if (!cancelled) setSeason(data);
      })
      .catch(() => {
        if (!cancelled) setSeason(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tvId, active]);

  if (seasons.length === 0) return null;

  return (
    <section className="episodes">
      <div className="episodes__header">
        <h2 className="detail-section__title">Episodes</h2>
        {seasons.length > 1 && (
          <div className="episodes__tabs" role="tablist" aria-label="Seasons">
            {seasons.map(s => (
              <button
                key={s.seasonNumber}
                role="tab"
                aria-selected={s.seasonNumber === active}
                className={`episodes__tab ${s.seasonNumber === active ? 'episodes__tab--active' : ''}`}
                onClick={() => setActive(s.seasonNumber)}
              >
                {`S${s.seasonNumber}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="episodes__grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '160px', borderRadius: '12px' }} />
          ))}
        </div>
      )}

      {!loading && (!season || season.episodes.length === 0) && (
        <p className="episodes__empty">No episode information available for this season.</p>
      )}

      {!loading && season && season.episodes.length > 0 && (
        <div className="episodes__grid">
          {season.episodes.map(ep => {
            const img = stillUrl(ep.stillPath, 'w300');
            return (
              <Link
                key={ep.id}
                href={watchTVUrl(tvId, ep.seasonNumber, ep.episodeNumber)}
                className={`ep-card ${ep.episodeNumber % 2 === 0 ? 'ep-card--alt' : ''}`}
              >
                <div className="ep-card__thumb">
                  {img ? (
                    <Image
                      src={img}
                      alt={ep.name}
                      fill
                      sizes="220px"
                      className="ep-card__img"
                      loading="lazy"
                    />
                  ) : (
                    <span className="ep-card__noimg" aria-hidden="true" />
                  )}
                  <span className="ep-card__play" aria-hidden="true">
                    <Play size={20} fill="currentColor" />
                  </span>
                  <span className="ep-card__num">E{ep.episodeNumber}</span>
                </div>
                <div className="ep-card__body">
                  <h3 className="ep-card__title">{ep.name}</h3>
                  {ep.airDate && <p className="ep-card__date">{ep.airDate.slice(0, 4)}</p>}
                  {ep.overview && (
                    <p className="ep-card__overview" title={ep.overview}>
                      {ep.overview}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
