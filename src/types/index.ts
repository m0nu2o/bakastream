/**
 * Shared domain types used across the app.
 *
 * These describe the app's own view of media metadata (sourced from TMDB) and
 * playback information (sourced from the stream provider layer). They are
 * intentionally independent of any single upstream API shape.
 */

export type MediaType = 'movie' | 'tv';

export interface Genre {
  id: number;
  name: string;
}

/** Lightweight card/list item. */
export interface MediaSummary {
  id: number;
  type: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
  /** Movie release date or series first-air date (ISO). */
  releaseDate: string | null;
  /** TMDB vote average, 0–10. */
  rating: number | null;
  genreIds: number[];
  popularity?: number;
  originalLanguage?: string | null;
  spokenLanguages?: Array<{ iso639_1: string; name: string; englishName: string }>;
  imdbId?: string | null;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface WatchProviderEntry {
  id: number;
  name: string;
  logoPath: string | null;
}

export interface WatchProviderInfo {
  link: string | null;
  /** Providers offering the title via subscription flat-rate. */
  subscription: WatchProviderEntry[];
  /** Providers offering rent/buy. */
  rent: WatchProviderEntry[];
  buy: WatchProviderEntry[];
}

export interface SeasonInfo {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
  posterPath: string | null;
  overview: string;
}

export interface MediaDetails extends MediaSummary {
  tagline: string;
  /** Movie runtime in minutes. */
  runtime: number | null;
  status: string;
  genres: Genre[];
  cast: CastMember[];
  similar: MediaSummary[];
  /** YouTube key of the official trailer, when one exists. */
  trailerKey: string | null;
  imdbId: string | null;
  watchProviders: WatchProviderInfo | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  seasons: SeasonInfo[];
  homepage: string | null;
  originalLanguage: string | null;
  spokenLanguages: Array<{ iso639_1: string; name: string; englishName: string }>;
}

export interface EpisodeInfo {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview: string;
  stillPath: string | null;
  airDate: string | null;
  runtime: number | null;
}

export interface SeasonDetailInfo {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  episodes: EpisodeInfo[];
}

/** A genre rail on the home page. */
export interface GenreRail {
  genre: Genre;
  items: MediaSummary[];
}
