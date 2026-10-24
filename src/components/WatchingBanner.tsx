'use client';

import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Heart, Eye, Star, Clapperboard } from 'lucide-react';
import type { MediaSummary } from '@/types';
import { backdropUrl } from '@/lib/tmdb/image';
import { subscribe, getHistory, EMPTY_HISTORY } from '@/lib/storage';
import './WatchingBanner.css';

interface Props {
  item: MediaSummary;
  onPlay?: (item: MediaSummary) => void;
}

export default function WatchingBanner({ item, onPlay }: Props) {
  const history = useSyncExternalStore(subscribe, getHistory, () => EMPTY_HISTORY);
  const isHistory = history.length > 0;
  const historyItem = isHistory ? history[0] : null;
  const displayItem: MediaSummary = historyItem || item;

  if (!displayItem) return null;

  const title = displayItem.title || 'Featured Title';
  const mediaType = displayItem.type || 'movie';
  const watchHref =
    historyItem && historyItem.type === 'tv' && historyItem.season
      ? `/watch/tv/${historyItem.id}?season=${historyItem.season}&episode=${historyItem.episode || 1}`
      : `/watch/${mediaType}/${displayItem.id}`;

  const backdrop =
    backdropUrl(displayItem.backdropPath, 'original') ||
    backdropUrl(displayItem.posterPath, 'w780');
  const year = displayItem.releaseDate ? displayItem.releaseDate.slice(0, 4) : null;
  const rating =
    displayItem.rating != null && displayItem.rating > 0 ? displayItem.rating.toFixed(1) : null;

  return (
    <section
      className="watching-section"
      aria-label={isHistory ? 'Continue Watching' : 'Featured Spotlight'}
    >
      <div className="watching-section__inner">
        {/* Section Header with Honest Label */}
        <div className="watching-section__header">
          <div className="watching-section__title-group">
            <span className="watching-section__title-icon">
              <Clapperboard size={20} className="text-red-500" />
            </span>
            <h2 className="watching-section__title">
              {isHistory ? 'Continue Watching' : 'Featured Spotlight'}
            </h2>
          </div>
        </div>

        {/* Big Landscape Video Banner */}
        <div className="watching-banner">
          <Link
            href={watchHref}
            className="watching-banner__link"
            aria-label={`Watch ${title}`}
            onClick={e => {
              if (onPlay) {
                e.preventDefault();
                onPlay(displayItem);
              }
            }}
          >
            {/* Real TMDB Backdrop */}
            <div className="watching-banner__bg-wrap">
              {backdrop ? (
                <Image
                  src={backdrop}
                  alt={title}
                  fill
                  sizes="(max-width: 1440px) 100vw, 1440px"
                  className="watching-banner__img"
                />
              ) : (
                <div className="watching-banner__fallback-bg" />
              )}
              <div className="watching-banner__overlay-grad" />
            </div>

            {/* Central Frosted Glowing Play Button */}
            <div className="watching-banner__center-play" aria-hidden="true">
              <div className="watching-banner__play-circle">
                <Play size={28} fill="currentColor" className="watching-banner__play-icon" />
              </div>
            </div>

            {/* Bottom Frosted Glass Overlay Bar */}
            <div className="watching-banner__bottom-bar">
              <div className="watching-banner__meta-left">
                <h3 className="watching-banner__title">{title}</h3>
                <div className="watching-banner__badges">
                  <span className="watching-banner__badge">
                    {mediaType === 'movie' ? 'Movie' : 'TV Series'}
                  </span>
                  <span className="watching-banner__badge watching-banner__badge--hd">HD</span>
                  {year && <span className="watching-banner__badge">{year}</span>}
                  {historyItem && historyItem.season && (
                    <span className="watching-banner__badge watching-banner__badge--ep">
                      S{historyItem.season} E{historyItem.episode || 1}
                    </span>
                  )}
                </div>
                {displayItem.overview && (
                  <p className="watching-banner__overview">{displayItem.overview}</p>
                )}
              </div>

              <div className="watching-banner__meta-right">
                <div
                  className="watching-banner__stat"
                  title={isHistory ? 'Resume playback' : 'Trending'}
                >
                  <Heart
                    size={16}
                    className="watching-banner__stat-icon text-red-500"
                    fill="currentColor"
                  />
                  <span>{isHistory ? 'Resume' : 'Popular'}</span>
                </div>
                <div className="watching-banner__stat" title="Streaming availability">
                  <Eye size={16} className="watching-banner__stat-icon text-blue-400" />
                  <span>HD Stream</span>
                </div>
                {rating && (
                  <div className="watching-banner__stat" title="TMDB Rating">
                    <Star
                      size={16}
                      className="watching-banner__stat-icon text-amber-400"
                      fill="#ffb800"
                    />
                    <span>{rating}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
