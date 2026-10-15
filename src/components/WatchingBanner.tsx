'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Heart, Eye, Star, Clapperboard } from 'lucide-react';
import type { MediaSummary } from '@/types';
import { backdropUrl } from '@/lib/tmdb/image';
import './WatchingBanner.css';

interface Props {
  item: MediaSummary;
  onPlay?: (item: MediaSummary) => void;
}

export default function WatchingBanner({ item, onPlay }: Props) {
  const title = item.title || 'Featured Title';
  const mediaType = item.type || 'movie';
  const watchHref = `/watch/${mediaType}/${item.id}`;
  const backdrop = backdropUrl(item.backdropPath, 'original') || backdropUrl(item.posterPath, 'w780');
  const year = item.releaseDate ? item.releaseDate.slice(0, 4) : '2024';
  const rating = item.rating && item.rating > 0 ? item.rating.toFixed(1) : '7.5';

  // Dynamic hashtags generated from real metadata
  const hashtagTitle = '#' + title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15);
  const hashtagType = mediaType === 'movie' ? '#Movie' : '#Series';
  const hashtagYear = `#${year}`;

  return (
    <section className="watching-section" aria-label="Featured Watching Showcase">
      <div className="watching-section__inner">
        {/* Section Header with Icon and Dynamic Tags */}
        <div className="watching-section__header">
          <div className="watching-section__title-group">
            <span className="watching-section__title-icon">
              <Clapperboard size={20} className="text-red-500" />
            </span>
            <h2 className="watching-section__title">Watching</h2>
          </div>

          {/* Dynamic Hashtags */}
          <div className="watching-section__tags" aria-hidden="true">
            <span className="watching-section__tag">{hashtagTitle}</span>
            <span className="watching-section__tag">{hashtagType}</span>
            <span className="watching-section__tag">{hashtagYear}</span>
            <span className="watching-section__tag">#HD</span>
          </div>
        </div>

        {/* Big Landscape Video Banner */}
        <div className="watching-banner">
          <Link
            href={watchHref}
            className="watching-banner__link"
            aria-label={`Watch ${title}`}
            onClick={(e) => {
              if (onPlay) {
                e.preventDefault();
                onPlay(item);
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
                </div>
                {item.overview && (
                  <p className="watching-banner__overview">{item.overview}</p>
                )}
              </div>

              <div className="watching-banner__meta-right">
                <div className="watching-banner__stat" title="Trending metric">
                  <Heart size={16} className="watching-banner__stat-icon text-red-500" fill="currentColor" />
                  <span>Popular</span>
                </div>
                <div className="watching-banner__stat" title="Streaming availability">
                  <Eye size={16} className="watching-banner__stat-icon text-blue-400" />
                  <span>HD Stream</span>
                </div>
                <div className="watching-banner__stat" title="TMDB Rating">
                  <Star size={16} className="watching-banner__stat-icon text-amber-400" fill="#ffb800" />
                  <span>{rating}</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
