/**
 * Server-only TMDB service layer.
 *
 * Every TMDB request in the app flows through here: route handlers and server
 * components call these functions; browser code never sees an API key. Auth
 * prefers the v4 access token (Authorization header) and falls back to a v3
 * key (api_key query parameter).
 */

import type {
  CastMember,
  EpisodeInfo,
  Genre,
  MediaDetails,
  MediaSummary,
  MediaType,
  SeasonDetailInfo,
  SeasonInfo,
  WatchProviderInfo,
} from '@/types';

const BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY || '';
const ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN || '';

export class TMDBError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'TMDBError';
    this.status = status;
  }
}

interface TMDBRequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  /** Next.js cache revalidate window in seconds. */
  revalidate?: number;
}

export async function tmdbFetch<T = unknown>(
  path: string,
  { params = {}, revalidate = 3600 }: TMDBRequestOptions = {}
): Promise<T> {
  if (!isTMDBConfigured()) {
    throw new TMDBError(
      'TMDB credentials are not configured. Set TMDB_API_KEY or TMDB_ACCESS_TOKEN in .env.local',
      401
    );
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }

  let url = `${BASE_URL}${path}`;
  if (ACCESS_TOKEN) {
    const qs = search.toString();
    if (qs) url += `?${qs}`;
  } else {
    search.set('api_key', API_KEY);
    url += `?${search.toString()}`;
  }

  const headers: Record<string, string> = { accept: 'application/json' };
  if (ACCESS_TOKEN) headers.Authorization = `Bearer ${ACCESS_TOKEN}`;

  const res = await fetch(url, {
    headers,
    next: { revalidate },
  });

  if (!res.ok) {
    throw new TMDBError(`TMDB request failed: ${path} (${res.status})`, res.status);
  }

  return (await res.json()) as T;
}

export function isTMDBConfigured(): boolean {
  return Boolean(API_KEY || ACCESS_TOKEN);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Raw TMDB shapes (only the fields we consume)
 * ────────────────────────────────────────────────────────────────────────── */

interface RawMedia {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
  media_type?: string;
  origin_country?: string[];
  original_language?: string;
}

interface RawVideo {
  key: string;
  site: string;
  type: string;
  official?: boolean;
}

interface RawCredits {
  cast?: Array<{ id: number; name: string; character?: string; profile_path?: string | null }>;
}

interface RawDetails extends RawMedia {
  tagline?: string;
  runtime?: number | null;
  status?: string;
  genres?: Genre[];
  homepage?: string | null;
  number_of_seasons?: number;
  number_of_episodes?: number;
  spoken_languages?: Array<{ iso_639_1: string; name: string; english_name: string }>;
  seasons?: Array<{
    season_number: number;
    name: string;
    episode_count: number;
    air_date: string | null;
    poster_path: string | null;
    overview: string;
  }>;
  videos?: { results?: RawVideo[] };
  credits?: RawCredits;
  similar?: { results?: RawMedia[] };
  recommendations?: { results?: RawMedia[] };
  external_ids?: { imdb_id?: string | null };
  'watch/providers'?: {
    results?: Record<
      string,
      {
        link?: string;
        flatrate?: Array<{ provider_id: number; provider_name: string; logo_path: string | null }>;
        rent?: Array<{ provider_id: number; provider_name: string; logo_path: string | null }>;
        buy?: Array<{ provider_id: number; provider_name: string; logo_path: string | null }>;
      }
    >;
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Mappers
 * ────────────────────────────────────────────────────────────────────────── */

function detectType(item: RawMedia): MediaType {
  if (item.media_type === 'movie' || item.media_type === 'tv') return item.media_type;
  return item.title ? 'movie' : 'tv';
}

export function mapSummary(item: RawMedia): MediaSummary {
  return {
    id: item.id,
    type: detectType(item),
    title: item.title || item.name || 'Untitled',
    posterPath: item.poster_path ?? null,
    backdropPath: item.backdrop_path ?? null,
    overview: item.overview ?? '',
    releaseDate: item.release_date || item.first_air_date || null,
    rating: item.vote_average ?? null,
    genreIds: item.genre_ids ?? [],
    popularity: item.popularity,
    originalLanguage: item.original_language ?? null,
  };
}

export function mapTrailerKey(data: RawDetails): string | null {
  const videos = data.videos?.results ?? [];
  const pick = (type: string) =>
    videos.find(v => v.site === 'YouTube' && v.type === type && v.official) ||
    videos.find(v => v.site === 'YouTube' && v.type === type);
  return (pick('Trailer') || pick('Teaser') || videos.find(v => v.site === 'YouTube'))?.key ?? null;
}

function mapWatchProviders(data: RawDetails): WatchProviderInfo | null {
  const results = data['watch/providers']?.results;
  if (!results) return null;
  const region = results.US || results.GB || results.IN || Object.values(results)[0];
  if (!region) return null;
  const mapList = (
    list: Array<{ provider_id: number; provider_name: string; logo_path: string | null }>
  ) => list.map(p => ({ id: p.provider_id, name: p.provider_name, logoPath: p.logo_path }));
  return {
    link: region.link ?? null,
    subscription: mapList(region.flatrate ?? []),
    rent: mapList(region.rent ?? []),
    buy: mapList(region.buy ?? []),
  };
}

function mapDetails(data: RawDetails, type: MediaType): MediaDetails {
  const similarRaw = data.similar?.results ?? data.recommendations?.results ?? [];
  return {
    ...mapSummary(data),
    type,
    tagline: data.tagline ?? '',
    runtime: data.runtime ?? null,
    status: data.status ?? '',
    genres: data.genres ?? [],
    cast: (data.credits?.cast ?? []).slice(0, 18).map(c => ({
      id: c.id,
      name: c.name,
      character: c.character ?? '',
      profilePath: c.profile_path ?? null,
    })),
    similar: similarRaw
      .filter(s => s.media_type !== 'person')
      .slice(0, 20)
      .map(mapSummary),
    trailerKey: mapTrailerKey(data),
    imdbId: data.external_ids?.imdb_id ?? null,
    watchProviders: mapWatchProviders(data),
    numberOfSeasons: data.number_of_seasons ?? null,
    numberOfEpisodes: data.number_of_episodes ?? null,
    seasons: (data.seasons ?? [])
      .filter(s => !(s.season_number === 0 && s.episode_count === 0))
      .map(s => ({
        seasonNumber: s.season_number,
        name: s.name,
        episodeCount: s.episode_count,
        airDate: s.air_date,
        posterPath: s.poster_path,
        overview: s.overview,
      })),
    homepage: data.homepage ?? null,
    originalLanguage: data.original_language ?? null,
    spokenLanguages: (data.spoken_languages ?? []).map(sl => ({
      iso639_1: sl.iso_639_1,
      name: sl.name,
      englishName: sl.english_name,
    })),
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Public queries
 * ────────────────────────────────────────────────────────────────────────── */

export async function getTrending(mediaType: 'all' | 'movie' | 'tv' = 'all', page = 1) {
  const data = await tmdbFetch<{ results: RawMedia[] }>(`/trending/${mediaType}/week`, {
    params: { page },
  });
  return data.results.map(mapSummary);
}

export async function getMovieList(
  list: 'popular' | 'top_rated' | 'now_playing' | 'upcoming',
  page = 1
) {
  const data = await tmdbFetch<{ results: RawMedia[] }>(`/movie/${list}`, { params: { page } });
  return data.results.map(mapSummary);
}

export async function getTVList(
  list: 'popular' | 'top_rated' | 'on_the_air' | 'airing_today',
  page = 1
) {
  const data = await tmdbFetch<{ results: RawMedia[] }>(`/tv/${list}`, { params: { page } });
  return data.results.map(mapSummary);
}

export async function getMovieDetails(id: number): Promise<MediaDetails | null> {
  try {
    const data = await tmdbFetch<RawDetails & { external_ids?: { imdb_id?: string | null } }>(
      `/movie/${id}`,
      { params: { append_to_response: 'videos,credits,similar,watch/providers,external_ids' } }
    );
    return mapDetails(data, 'movie');
  } catch {
    return null;
  }
}

export async function getTVDetails(id: number): Promise<MediaDetails | null> {
  try {
    const data = await tmdbFetch<RawDetails & { external_ids?: { imdb_id?: string | null } }>(
      `/tv/${id}`,
      { params: { append_to_response: 'videos,credits,similar,watch/providers,external_ids' } }
    );
    return mapDetails(data, 'tv');
  } catch {
    return null;
  }
}

export async function getSeasonDetails(
  tvId: number,
  season: number
): Promise<SeasonDetailInfo | null> {
  try {
    const data = await tmdbFetch<{
      season_number: number;
      name: string;
      episodes: Array<{
        id: number;
        episode_number: number;
        name: string;
        overview: string;
        still_path: string | null;
        air_date: string | null;
        runtime: number | null;
      }>;
    }>(`/tv/${tvId}/season/${season}`);
    const episodes: EpisodeInfo[] = (data.episodes ?? []).map(e => ({
      id: e.id,
      seasonNumber: data.season_number,
      episodeNumber: e.episode_number,
      name: e.name,
      overview: e.overview,
      stillPath: e.still_path ?? null,
      airDate: e.air_date ?? null,
      runtime: e.runtime ?? null,
    }));
    return {
      seasonNumber: data.season_number,
      name: data.name,
      episodeCount: episodes.length,
      episodes,
    };
  } catch {
    return null;
  }
}

export async function getGenres(type: MediaType): Promise<Genre[]> {
  const data = await tmdbFetch<{ genres: Genre[] }>(`/genre/${type}/list`, { revalidate: 86400 });
  return data.genres;
}

export async function getExternalIds(type: MediaType, id: number): Promise<string | null> {
  try {
    const data = await tmdbFetch<{ imdb_id?: string | null }>(`/${type}/${id}/external_ids`, {
      revalidate: 86400,
    });
    return data.imdb_id ?? null;
  } catch {
    return null;
  }
}

export interface DiscoverParams {
  type?: MediaType;
  genre?: number;
  year?: number;
  sortBy?: string;
  page?: number;
  excludeZeroRatings?: boolean;
}

export async function discover({ type = 'movie', genre, year, sortBy, page = 1 }: DiscoverParams) {
  const params: Record<string, string | number> = {
    page,
    sort_by: sortBy || 'popularity.desc',
    include_adult: 'false',
  };
  if (genre) params.with_genres = genre;
  if (year) {
    if (type === 'movie') {
      params.primary_release_date_year = year;
    } else {
      params.first_air_date_year = year;
    }
  }
  const data = await tmdbFetch<{ results: RawMedia[] }>(`/discover/${type}`, { params });
  return data.results.map(mapSummary);
}

export async function getRecentlyAdded(page = 1) {
  // Titles with a recent release/air date that audiences are actually watching —
  // plain date sorting surfaces unreleased placeholder entries.
  const [recentMovies, recentTV] = await Promise.allSettled([
    tmdbFetch<{ results: RawMedia[] }>('/discover/movie', {
      params: {
        page,
        sort_by: 'popularity.desc',
        primary_release_date_gte: new Date(Date.now() - 120 * 86400 * 1000)
          .toISOString()
          .slice(0, 10),
      },
    }),
    tmdbFetch<{ results: RawMedia[] }>('/discover/tv', {
      params: {
        page,
        sort_by: 'popularity.desc',
        first_air_date_gte: new Date(Date.now() - 120 * 86400 * 1000).toISOString().slice(0, 10),
      },
    }),
  ]);
  const collect = (r: PromiseSettledResult<{ results: RawMedia[] }>) =>
    r.status === 'fulfilled' ? r.value.results : [];
  const seen = new Set<number>();
  return [...collect(recentMovies), ...collect(recentTV)]
    .filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .map(mapSummary);
}

export async function getAnime(
  page = 1,
  type: 'all' | 'movie' | 'tv' = 'all',
  genre?: number,
  year?: number
) {
  const baseGenres = genre ? `16,${genre}` : 16;
  if (type === 'movie') {
    const params: Record<string, string | number> = {
      page,
      with_genres: baseGenres,
      sort_by: 'popularity.desc',
      'vote_count.gte': 50,
    };
    if (year) params.primary_release_year = year;
    const data = await tmdbFetch<{ results: RawMedia[] }>('/discover/movie', { params });
    return data.results.map(mapSummary);
  }

  if (type === 'tv') {
    const params: Record<string, string | number> = {
      page,
      with_genres: baseGenres,
      sort_by: 'popularity.desc',
      'vote_count.gte': 50,
    };
    if (year) params.first_air_date_year = year;
    const data = await tmdbFetch<{ results: RawMedia[] }>('/discover/tv', { params });
    return data.results.map(mapSummary);
  }

  // All: query both anime TV and anime movies (Animation genre, popular globally)
  const [tvData, movieData] = await Promise.allSettled([
    tmdbFetch<{ results: RawMedia[] }>('/discover/tv', {
      params: {
        page,
        with_genres: baseGenres,
        sort_by: 'popularity.desc',
        'vote_count.gte': 30,
        ...(year ? { first_air_date_year: year } : {}),
      },
    }),
    tmdbFetch<{ results: RawMedia[] }>('/discover/movie', {
      params: {
        page,
        with_genres: baseGenres,
        sort_by: 'popularity.desc',
        'vote_count.gte': 30,
        ...(year ? { primary_release_year: year } : {}),
      },
    }),
  ]);

  const tvItems = tvData.status === 'fulfilled' ? tvData.value.results.map(mapSummary) : [];
  const movieItems = movieData.status === 'fulfilled' ? movieData.value.results.map(mapSummary) : [];

  const combined = [...tvItems, ...movieItems].sort(
    (a, b) => (b.popularity || 0) - (a.popularity || 0)
  );
  return combined.slice(0, 24);
}

export async function getHindiMovies(page = 1) {
  const data = await tmdbFetch<{ results: RawMedia[] }>('/discover/movie', {
    params: {
      page,
      with_original_language: 'hi',
      sort_by: 'popularity.desc',
    },
  });
  return data.results.map(mapSummary);
}

export async function getHindiTV(page = 1) {
  const data = await tmdbFetch<{ results: RawMedia[] }>('/discover/tv', {
    params: {
      page,
      with_original_language: 'hi',
      without_genres: 10766,
      'vote_count.gte': 10,
      sort_by: 'popularity.desc',
    },
  });
  return data.results.map(mapSummary);
}

export async function getHindiSerials(page = 1) {
  const data = await tmdbFetch<{ results: RawMedia[] }>('/discover/tv', {
    params: {
      page,
      with_original_language: 'hi',
      with_genres: 10766,
      sort_by: 'popularity.desc',
    },
  });
  return data.results.map(mapSummary);
}

export async function getKDrama(page = 1) {
  const data = await tmdbFetch<{ results: RawMedia[] }>('/discover/tv', {
    params: {
      page,
      with_original_language: 'ko',
      without_genres: 16,
      sort_by: 'popularity.desc',
    },
  });
  return data.results.map(mapSummary);
}

export interface SearchFilters {
  query?: string;
  type?: 'all' | MediaType;
  genre?: number;
  year?: number;
  page?: number;
}

export async function search({ query, type = 'all', genre, year, page = 1 }: SearchFilters) {
  const page_ = page > 500 ? 500 : page;

  // Browse mode: no query — discover endpoint handles filters natively.
  if (!query || !query.trim()) {
    const mediaType: MediaType = type === 'tv' ? 'tv' : 'movie';
    const items = await discover({ type: mediaType, genre, year, page: page_ });
    return { results: items, page: page_, totalResults: items.length ? 10000 : 0 };
  }

  if (type === 'movie' || type === 'tv') {
    const searchParams: Record<string, string | number> = { query, page: page_ };
    if (year) {
      if (type === 'movie') searchParams.primary_release_year = year;
      else searchParams.first_air_date_year = year;
    }
    const data = await tmdbFetch<{ results: RawMedia[]; total_results: number; page: number }>(
      `/search/${type}`,
      { params: searchParams, revalidate: 300 }
    );
    let results = data.results.map(mapSummary);
    if (genre) results = results.filter(r => r.genreIds.includes(genre));
    return { results, page: data.page, totalResults: data.total_results };
  }

  const data = await tmdbFetch<{ results: RawMedia[]; total_results: number; page: number }>(
    '/search/multi',
    { params: { query, page: page_ }, revalidate: 300 }
  );
  let results = data.results.filter(r => r.media_type !== 'person').map(mapSummary);
  if (genre) results = results.filter(r => r.genreIds.includes(genre));
  if (year) results = results.filter(r => r.releaseDate?.startsWith(String(year)));
  return { results, page: data.page, totalResults: data.total_results };
}

/** Compact rows for the home page; each section degrades independently. */
export interface HomeData {
  featured: MediaSummary[];
  trending: MediaSummary[];
  hindiMovies: MediaSummary[];
  hindiTV: MediaSummary[];
  hindiSerials: MediaSummary[];
  kdrama: MediaSummary[];
  popularMovies: MediaSummary[];
  popularTV: MediaSummary[];
  topRatedMovies: MediaSummary[];
  topRatedTV: MediaSummary[];
  recentlyAdded: MediaSummary[];
  anime: MediaSummary[];
  genres: Genre[];
}

export async function getHomeData(): Promise<HomeData> {
  const [
    trending,
    hindiMovies,
    hindiTV,
    hindiSerials,
    kdrama,
    popularMovies,
    popularTV,
    topRatedMovies,
    topRatedTV,
    recentlyAdded,
    anime,
    movieGenres,
  ] = await Promise.allSettled([
    getTrending('all'),
    getHindiMovies(),
    getHindiTV(),
    getHindiSerials(),
    getKDrama(),
    getMovieList('popular'),
    getTVList('popular'),
    getMovieList('top_rated'),
    getTVList('top_rated'),
    getRecentlyAdded(),
    getAnime(),
    getGenres('movie'),
  ]);

  const ok = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === 'fulfilled' ? r.value : fallback;

  return {
    featured: ok(trending, [] as MediaSummary[]).slice(0, 6),
    trending: ok(trending, [] as MediaSummary[]).slice(0, 20),
    hindiMovies: ok(hindiMovies, [] as MediaSummary[]).slice(0, 20),
    hindiTV: ok(hindiTV, [] as MediaSummary[]).slice(0, 20),
    hindiSerials: ok(hindiSerials, [] as MediaSummary[]).slice(0, 20),
    kdrama: ok(kdrama, [] as MediaSummary[]).slice(0, 20),
    popularMovies: ok(popularMovies, [] as MediaSummary[]).slice(0, 20),
    popularTV: ok(popularTV, [] as MediaSummary[]).slice(0, 20),
    topRatedMovies: ok(topRatedMovies, [] as MediaSummary[]).slice(0, 20),
    topRatedTV: ok(topRatedTV, [] as MediaSummary[]).slice(0, 20),
    recentlyAdded: ok(recentlyAdded, [] as MediaSummary[]).slice(0, 20),
    anime: ok(anime, [] as MediaSummary[]).slice(0, 20),
    genres: ok(movieGenres, [] as Genre[]),
  };
}
