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
import MediaCard from '@/components/MediaCard';
import { stillUrl } from '@/lib/tmdb/image';
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
  // Separate regular seasons (1, 2, 3...) from Specials (Season 0).
  // Regular seasons are sorted ascending and always presented first.
  // Season 0 (Specials / OVAs) is placed at the end so it never overrides Season 1.
  const { orderedSeasons, regularCount } = useMemo(() => {
    const regular = seasons
      .filter(s => s.seasonNumber > 0 && s.episodeCount > 0)
      .sort((a, b) => a.seasonNumber - b.seasonNumber);
    const specials = seasons.filter(s => s.seasonNumber === 0 && s.episodeCount > 0);
    return {
      orderedSeasons: [...regular, ...specials],
      regularCount: regular.length,
    };
  }, [seasons]);

  // Compute clean display info for a season tab with arc / part detection
  const getSeasonDisplayInfo = (s: SeasonInfo) => {
    if (s.seasonNumber === 0) {
      return {
        badge: 'OVA',
        name: 'Specials & OVAs',
        isSpecial: true,
      };
    }
    const cleanName = s.name?.trim() ?? '';
    const hasArcName = cleanName && !/^season\s+\d+$/i.test(cleanName);
    return {
      badge: `S${s.seasonNumber}`,
      name: hasArcName ? `S${s.seasonNumber} · ${cleanName}` : `Season ${s.seasonNumber}`,
      isSpecial: false,
    };
  };

  // Default to currentSeason if valid, or the first regular season (Season 1)
  const defaultSeason = useMemo(() => {
    if (currentSeason !== undefined && currentSeason > 0) return currentSeason;
    const firstRegular = orderedSeasons.find(s => s.seasonNumber > 0);
    return firstRegular ? firstRegular.seasonNumber : (orderedSeasons[0]?.seasonNumber ?? 1);
  }, [currentSeason, orderedSeasons]);

  const [activeSeasonNum, setActiveSeasonNum] = useState<number>(defaultSeason);
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>(initialEpisodes);
  const [loadingSeason, setLoadingSeason] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentTimestamp] = useState<number>(() => Date.now());

  const releasedEpisodeCount = useMemo(() => {
    return episodes.filter(e => !e.airDate || new Date(e.airDate).getTime() <= currentTimestamp).length;
  }, [episodes, currentTimestamp]);

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
          {relatedMovies.map(movie => (
            <MediaCard
              key={movie.id}
              content={{ ...movie, type: movie.type || 'movie' }}
            />
          ))}
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: TV & ANIME SERIES SEASONS & EPISODES
  // ─────────────────────────────────────────────────────────────
  const currentActiveSeasonObj = orderedSeasons.find(s => s.seasonNumber === activeSeasonNum);
  const activeSeasonInfo = currentActiveSeasonObj ? getSeasonDisplayInfo(currentActiveSeasonObj) : null;
  const totalSeriesEpisodes = orderedSeasons.reduce((acc, s) => acc + s.episodeCount, 0);
  const upcomingEpisodeCount = episodes.length - releasedEpisodeCount;

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
              {activeSeasonInfo
                ? `${activeSeasonInfo.name} · ${episodes.length} Episodes (${releasedEpisodeCount} Released${upcomingEpisodeCount > 0 ? `, ${upcomingEpisodeCount} Upcoming` : ''})`
                : orderedSeasons.length > 1
                  ? `${regularCount} Seasons · ${totalSeriesEpisodes.toLocaleString()} Total Episodes`
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

      {/* ── Season Tabs (With Arc / Part Names & Specials at End) ── */}
      {orderedSeasons.length > 1 && (
        <div className="season-selector__seasons-bar" role="tablist" aria-label="Select Season">
          {orderedSeasons.map(s => {
            const isSelected = s.seasonNumber === activeSeasonNum;
            const isPlayingThisSeason = s.seasonNumber === currentSeason;
            const info = getSeasonDisplayInfo(s);

            return (
              <button
                key={s.seasonNumber}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleSelectSeason(s.seasonNumber)}
                className={`season-selector__season-tab ${isSelected ? 'season-selector__season-tab--active' : ''} ${info.isSpecial ? 'season-selector__season-tab--special' : ''}`}
              >
                {info.isSpecial ? (
                  <Sparkles size={11} className="season-selector__special-icon" />
                ) : (
                  <span className="season-selector__season-badge-pill">{info.badge}</span>
                )}
                <span className="season-selector__season-name">{info.name}</span>
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
          <span>Loading {activeSeasonInfo?.name ?? `Season ${activeSeasonNum}`} episodes…</span>
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
            const isUpcoming = ep.airDate ? new Date(ep.airDate).getTime() > currentTimestamp : false;
            const epNumFormatted =
              ep.episodeNumber > 0 && ep.episodeNumber < 10
                ? `0${ep.episodeNumber}`
                : String(ep.episodeNumber);

            return (
              <Link
                key={ep.id}
                href={`/watch/tv/${mediaId}/${activeSeasonNum}/${ep.episodeNumber}`}
                className={`season-ep-box ${isCurrent ? 'season-ep-box--current' : ''} ${isUpcoming ? 'season-ep-box--upcoming' : ''}`}
                title={`Episode ${ep.episodeNumber}: ${ep.name}${isUpcoming ? ` (Upcoming · Airs ${ep.airDate})` : ep.runtime ? ` (${ep.runtime}m)` : ''}`}
              >
                <div className="season-ep-box__inner">
                  <span className="season-ep-box__num">{epNumFormatted}</span>
                  {isCurrent ? (
                    <span className="season-ep-box__active-badge">PLAYING</span>
                  ) : isUpcoming ? (
                    <span className="season-ep-box__upcoming-badge">SOON</span>
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
            const isUpcoming = ep.airDate ? new Date(ep.airDate).getTime() > currentTimestamp : false;
            const still = stillUrl(ep.stillPath, 'w300');

            return (
              <Link
                key={ep.id}
                href={`/watch/tv/${mediaId}/${activeSeasonNum}/${ep.episodeNumber}`}
                className={`season-ep-card ${isCurrent ? 'season-ep-card--current' : ''} ${isUpcoming ? 'season-ep-card--upcoming' : ''}`}
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
                  {ep.runtime ? (
                    <span className="season-ep-card__duration-pill">{ep.runtime}m</span>
                  ) : null}
                  {isCurrent && (
                    <div className="season-ep-card__current-overlay">
                      <span className="season-ep-card__current-pill">NOW PLAYING</span>
                    </div>
                  )}
                  {isUpcoming && !isCurrent && (
                    <div className="season-ep-card__upcoming-overlay">
                      <span className="season-ep-card__upcoming-pill">UPCOMING</span>
                    </div>
                  )}
                  {!isUpcoming && (
                    <div className="season-ep-card__play-overlay">
                      <Play size={16} fill="currentColor" />
                    </div>
                  )}
                </div>

                <div className="season-ep-card__content">
                  <div className="season-ep-card__title-row">
                    <span className={`season-ep-card__ep-badge ${isUpcoming ? 'season-ep-card__ep-badge--upcoming' : ''}`}>
                      EP {ep.episodeNumber}
                    </span>
                    <h3 className="season-ep-card__name">{ep.name}</h3>
                    {isUpcoming && (
                      <span className="season-ep-card__upcoming-tag">
                        Upcoming (Airs {ep.airDate})
                      </span>
                    )}
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

      {/* Franchise & Related TV Series / Spinoffs */}
      {relatedMovies.length > 0 && (
        <div className="season-selector__related-wrap" style={{ marginTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.75rem' }}>
          <div className="season-selector__header">
            <div className="season-selector__title-group">
              <div className="season-selector__icon-badge">
                <Tv size={15} />
              </div>
              <div>
                <h2 className="season-selector__title">Franchise & Related Series</h2>
                <p className="season-selector__subtitle">
                  Spinoffs, prequels, and recommended shows for {mediaTitle}
                </p>
              </div>
            </div>
            <span className="season-selector__count-badge">{relatedMovies.length} Titles</span>
          </div>

          <div className="season-selector__movie-grid">
            {relatedMovies.map(show => (
              <MediaCard
                key={show.id}
                content={{ ...show, type: show.type || 'tv' }}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
