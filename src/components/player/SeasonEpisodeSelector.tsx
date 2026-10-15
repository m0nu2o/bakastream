'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  List,
  Grid,
  Search,
  Play,
  Film,
  Sparkles,
  Layers,
  ChevronRight,
  Clock,
  Calendar,
  Loader2,
  Tv,
} from 'lucide-react';
import type { EpisodeInfo, SeasonInfo, MediaSummary } from '@/types';
import { posterUrl, stillUrl } from '@/lib/tmdb/image';
import './SeasonEpisodeSelector.css';

export interface SeasonEpisodeSelectorProps {
  mediaType: 'movie' | 'tv';
  mediaId: number;
  mediaTitle: string;
  currentSeason?: number;
  currentEpisode?: number;
  seasons?: SeasonInfo[];
  initialEpisodes?: EpisodeInfo[];
  relatedMovies?: MediaSummary[];
}

export default function SeasonEpisodeSelector({
  mediaType,
  mediaId,
  mediaTitle,
  currentSeason = 1,
  currentEpisode = 1,
  seasons = [],
  initialEpisodes = [],
  relatedMovies = [],
}: SeasonEpisodeSelectorProps) {
  // Filter out empty seasons (e.g. season 0 with 0 episodes)
  const validSeasons = useMemo(() => {
    return seasons.filter(s => s.episodeCount > 0);
  }, [seasons]);

  const [activeSeasonNum, setActiveSeasonNum] = useState<number>(currentSeason);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>(initialEpisodes);
  const [loadingSeason, setLoadingSeason] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Cache seasons fetched on client to prevent refetching
  const seasonCache = useRef<Record<number, EpisodeInfo[]>>({});

  // Populate cache with initialEpisodes
  useEffect(() => {
    if (initialEpisodes.length > 0 && currentSeason === activeSeasonNum) {
      seasonCache.current[currentSeason] = initialEpisodes;
      setEpisodes(initialEpisodes);
    }
  }, [initialEpisodes, currentSeason, activeSeasonNum]);

  // Fetch season episodes when activeSeasonNum changes
  const handleSelectSeason = async (seasonNum: number) => {
    setActiveSeasonNum(seasonNum);
    setSearchQuery('');

    if (seasonCache.current[seasonNum]) {
      setEpisodes(seasonCache.current[seasonNum]);
      return;
    }

    setLoadingSeason(true);
    try {
      const res = await fetch(`/api/tmdb/tv/${mediaId}/season/${seasonNum}`);
      if (res.ok) {
        const data = await res.json();
        const eps: EpisodeInfo[] = (data.episodes ?? []).map(
          (e: {
            id: number;
            episode_number: number;
            name: string;
            overview: string;
            still_path: string | null;
            air_date: string | null;
            runtime: number | null;
          }) => ({
            id: e.id,
            seasonNumber: seasonNum,
            episodeNumber: e.episode_number,
            name: e.name,
            overview: e.overview,
            stillPath: e.still_path ?? null,
            airDate: e.air_date ?? null,
            runtime: e.runtime ?? null,
          })
        );
        seasonCache.current[seasonNum] = eps;
        setEpisodes(eps);
      }
    } catch (err) {
      console.error('Failed to load season episodes:', err);
    } finally {
      setLoadingSeason(false);
    }
  };

  // Compute episode chunk ranges (e.g. 1-100, 101-200, 201-300) for large seasons
  const CHUNK_SIZE = 100;
  const chunkRanges = useMemo(() => {
    if (episodes.length <= 50) return [];
    const ranges: Array<{ start: number; end: number; label: string }> = [];
    const total = episodes.length;
    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const start = i + 1;
      const end = Math.min(i + CHUNK_SIZE, total);
      ranges.push({ start, end, label: `${start} - ${end}` });
    }
    return ranges;
  }, [episodes.length]);

  // Determine initial active chunk range based on currentEpisode
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(0);

  useEffect(() => {
    if (chunkRanges.length > 0) {
      const idx = chunkRanges.findIndex(r => currentEpisode >= r.start && currentEpisode <= r.end);
      setActiveChunkIndex(idx >= 0 ? idx : 0);
    } else {
      setActiveChunkIndex(0);
    }
  }, [chunkRanges, currentEpisode, activeSeasonNum]);

  // Filter episodes by search query or chunk range
  const displayedEpisodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      // Search matches episode number or title
      return episodes.filter(
        ep => String(ep.episodeNumber).includes(q) || ep.name.toLowerCase().includes(q)
      );
    }

    if (chunkRanges.length > 0 && chunkRanges[activeChunkIndex]) {
      const { start, end } = chunkRanges[activeChunkIndex];
      return episodes.slice(start - 1, end);
    }

    return episodes;
  }, [episodes, searchQuery, chunkRanges, activeChunkIndex]);

  // ─────────────────────────────────────────────────────────────
  // RENDER: MOVIE FRANCHISE & SEQUELS
  // ─────────────────────────────────────────────────────────────
  if (mediaType === 'movie') {
    if (relatedMovies.length === 0) return null;

    return (
      <section className="season-selector" aria-label="Related Movies and Sequels">
        <div className="season-selector__header">
          <div className="season-selector__title-group">
            <div className="season-selector__icon-badge">
              <Film size={15} />
            </div>
            <div>
              <h2 className="season-selector__title">Franchise & Related Films</h2>
              <p className="season-selector__subtitle">
                Sequels, prequels, and related releases for {mediaTitle}
              </p>
            </div>
          </div>
          <span className="season-selector__count-badge">{relatedMovies.length} Titles</span>
        </div>

        <div className="season-selector__movie-grid">
          {relatedMovies.slice(0, 14).map(movie => {
            const poster = posterUrl(movie.posterPath, 'w342');
            const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : '';

            return (
              <Link
                key={movie.id}
                href={`/watch/movie/${movie.id}`}
                className="season-movie-card"
                title={`${movie.title} ${year ? `(${year})` : ''}`}
              >
                <div className="season-movie-card__poster-box">
                  {poster ? (
                    <img
                      src={poster}
                      alt={movie.title}
                      className="season-movie-card__img"
                      loading="lazy"
                    />
                  ) : (
                    <div className="season-movie-card__fallback">
                      <Film size={28} />
                      <span className="season-movie-card__fallback-text">{movie.title}</span>
                    </div>
                  )}
                  {movie.rating ? (
                    <span className="season-movie-card__rating">★ {movie.rating.toFixed(1)}</span>
                  ) : null}
                  <div className="season-movie-card__play-overlay">
                    <div className="season-movie-card__play-btn">
                      <Play size={14} fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="season-movie-card__info">
                  <h3 className="season-movie-card__title" title={movie.title}>
                    {movie.title}
                  </h3>
                  <div className="season-movie-card__meta">
                    {year && <span className="season-movie-card__year">{year}</span>}
                    <span className="season-movie-card__type">Movie</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: TV & ANIME SERIES SEASONS & EPISODES
  // ─────────────────────────────────────────────────────────────
  const totalSeriesEpisodes = validSeasons.reduce((acc, s) => acc + s.episodeCount, 0);

  return (
    <section className="season-selector" aria-label="Seasons and Episodes">
      {/* ── Top Bar: Title & Total Count ── */}
      <div className="season-selector__header">
        <div className="season-selector__title-group">
          <div className="season-selector__icon-badge">
            <Tv size={15} />
          </div>
          <div>
            <h2 className="season-selector__title">Seasons & Episodes</h2>
            <p className="season-selector__subtitle">
              {validSeasons.length > 1
                ? `${validSeasons.length} Seasons · ${totalSeriesEpisodes.toLocaleString()} Total Episodes`
                : `${episodes.length} Episodes Available`}
            </p>
          </div>
        </div>

        {/* View Mode & Search Controls */}
        <div className="season-selector__controls">
          <div className="season-selector__search-box">
            <Search size={13} className="season-selector__search-icon" />
            <input
              type="text"
              placeholder="Search or jump to Ep #…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="season-selector__search-input"
              aria-label="Search or jump to episode number"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="season-selector__clear-btn"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="season-selector__view-toggle" role="group" aria-label="View Mode">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`season-selector__view-btn ${viewMode === 'grid' ? 'season-selector__view-btn--active' : ''}`}
              title="Grid Mode: Compact episode numbers"
              aria-pressed={viewMode === 'grid'}
            >
              <Grid size={13} /> Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`season-selector__view-btn ${viewMode === 'list' ? 'season-selector__view-btn--active' : ''}`}
              title="List Mode: Detailed cards with title and runtime"
              aria-pressed={viewMode === 'list'}
            >
              <List size={13} /> List
            </button>
          </div>
        </div>
      </div>

      {/* ── Season Tabs (If multiple seasons exist) ── */}
      {validSeasons.length > 1 && (
        <div className="season-selector__seasons-bar" role="tablist" aria-label="Select Season">
          {validSeasons.map(s => {
            const isSelected = s.seasonNumber === activeSeasonNum;
            const isPlayingThisSeason = s.seasonNumber === currentSeason;

            return (
              <button
                key={s.seasonNumber}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleSelectSeason(s.seasonNumber)}
                className={`season-selector__season-tab ${isSelected ? 'season-selector__season-tab--active' : ''}`}
              >
                <span className="season-selector__season-name">{s.name}</span>
                <span className="season-selector__season-eps">{s.episodeCount} Eps</span>
                {isPlayingThisSeason && (
                  <span className="season-selector__playing-dot" title="Currently playing season" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Episode Chunk Range Tabs (For seasons with 100+ episodes like One Piece, Naruto) ── */}
      {chunkRanges.length > 0 && !searchQuery && (
        <div
          className="season-selector__ranges-bar"
          role="tablist"
          aria-label="Episode Range Chunks"
        >
          <span className="season-selector__ranges-label">
            <Layers size={11} /> Episode Range:
          </span>
          <div className="season-selector__ranges-list">
            {chunkRanges.map((range, idx) => {
              const isSelected = idx === activeChunkIndex;
              const hasCurrentEp =
                currentEpisode >= range.start &&
                currentEpisode <= range.end &&
                currentSeason === activeSeasonNum;

              return (
                <button
                  key={range.label}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveChunkIndex(idx)}
                  className={`season-selector__range-tab ${isSelected ? 'season-selector__range-tab--active' : ''}`}
                >
                  <span>{range.label}</span>
                  {hasCurrentEp && <span className="season-selector__range-current-dot" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Loading Spinner for Season Switch ── */}
      {loadingSeason ? (
        <div className="season-selector__loading">
          <Loader2 size={24} className="season-selector__spinner" />
          <span>Loading Season {activeSeasonNum} episodes…</span>
        </div>
      ) : displayedEpisodes.length === 0 ? (
        <div className="season-selector__empty">
          <p>No episodes found matching &ldquo;{searchQuery}&rdquo;</p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="season-selector__reset-btn"
          >
            Show All Episodes
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Compact Number Grid Mode ── */
        <div className="season-selector__grid" role="list" aria-label="Episodes Grid">
          {displayedEpisodes.map(ep => {
            const isCurrent =
              activeSeasonNum === currentSeason && ep.episodeNumber === currentEpisode;

            return (
              <Link
                key={ep.id}
                href={`/watch/tv/${mediaId}/${activeSeasonNum}/${ep.episodeNumber}`}
                className={`season-ep-box ${isCurrent ? 'season-ep-box--current' : ''}`}
                title={`Episode ${ep.episodeNumber}: ${ep.name}${ep.runtime ? ` (${ep.runtime}m)` : ''}`}
              >
                <div className="season-ep-box__inner">
                  <span className="season-ep-box__num">{ep.episodeNumber}</span>
                  {isCurrent ? (
                    <span className="season-ep-box__active-badge">PLAYING</span>
                  ) : (
                    <Play size={8} className="season-ep-box__play-icon" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* ── Detailed List / Card Mode ── */
        <div className="season-selector__list" role="list" aria-label="Episodes List">
          {displayedEpisodes.map(ep => {
            const isCurrent =
              activeSeasonNum === currentSeason && ep.episodeNumber === currentEpisode;
            const still = stillUrl(ep.stillPath, 'w300');

            return (
              <Link
                key={ep.id}
                href={`/watch/tv/${mediaId}/${activeSeasonNum}/${ep.episodeNumber}`}
                className={`season-ep-card ${isCurrent ? 'season-ep-card--current' : ''}`}
              >
                <div className="season-ep-card__thumb-box">
                  {still ? (
                    <img src={still} alt="" className="season-ep-card__thumb" loading="lazy" />
                  ) : (
                    <div className="season-ep-card__thumb-fallback">
                      <Tv size={20} />
                      <span>EP {ep.episodeNumber}</span>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="season-ep-card__current-overlay">
                      <span className="season-ep-card__current-pill">NOW PLAYING</span>
                    </div>
                  )}
                  <div className="season-ep-card__play-overlay">
                    <Play size={16} fill="currentColor" />
                  </div>
                </div>

                <div className="season-ep-card__content">
                  <div className="season-ep-card__title-row">
                    <span className="season-ep-card__ep-badge">EP {ep.episodeNumber}</span>
                    <h3 className="season-ep-card__name">{ep.name}</h3>
                  </div>

                  <div className="season-ep-card__meta-row">
                    {ep.runtime ? (
                      <span className="season-ep-card__meta-item">
                        <Clock size={11} /> {ep.runtime} min
                      </span>
                    ) : null}
                    {ep.airDate ? (
                      <span className="season-ep-card__meta-item">
                        <Calendar size={11} /> {ep.airDate}
                      </span>
                    ) : null}
                  </div>

                  {ep.overview ? <p className="season-ep-card__overview">{ep.overview}</p> : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
