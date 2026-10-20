import { NextRequest, NextResponse } from 'next/server';
import { getTVList, getMovieList, tmdbFetch } from '@/lib/tmdb/server';
import type { MediaSummary } from '@/types';

export const revalidate = 1800; // Cache for 30 minutes

export interface CalendarEntry {
  id: string;
  tmdbId?: number;
  category: 'anime' | 'kdrama' | 'tv' | 'movie';
  title: string;
  romajiTitle?: string;
  episodeNumber?: number | null;
  airDate: string; // YYYY-MM-DD
  airTime?: string; // HH:mm format
  airTimestamp: number; // Unix epoch ms
  posterUrl: string | null;
  backdropUrl?: string | null;
  genres: string[];
  rating?: number | null;
  overview?: string;
  status?: string;
}

interface AniListAiringItem {
  id: number;
  airingAt: number;
  episode: number;
  media: {
    id: number;
    idMal?: number;
    title: {
      english?: string;
      romaji?: string;
      native?: string;
    };
    coverImage?: {
      large?: string;
      extraLarge?: string;
    };
    bannerImage?: string;
    genres?: string[];
    averageScore?: number;
    description?: string;
    status?: string;
  };
}

async function fetchAniListSchedule(startSec: number, endSec: number): Promise<CalendarEntry[]> {
  const query = `
    query ($start: Int, $end: Int) {
      Page(page: 1, perPage: 50) {
        airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
          id
          airingAt
          episode
          media {
            id
            idMal
            title {
              english
              romaji
              native
            }
            coverImage {
              large
              extraLarge
            }
            bannerImage
            genres
            averageScore
            description
            status
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { start: startSec, end: endSec },
      }),
      next: { revalidate: 1800 },
    });

    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { Page?: { airingSchedules?: AniListAiringItem[] } };
    };
    const schedules = json.data?.Page?.airingSchedules ?? [];

    return schedules.map(item => {
      const airDateObj = new Date(item.airingAt * 1000);
      const airDate = airDateObj.toISOString().slice(0, 10);
      const airTime = airDateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const title =
        item.media.title.english || item.media.title.romaji || item.media.title.native || 'Unknown Anime';

      return {
        id: `anime-${item.id}`,
        category: 'anime',
        title,
        romajiTitle: item.media.title.romaji,
        episodeNumber: item.episode,
        airDate,
        airTime,
        airTimestamp: item.airingAt * 1000,
        posterUrl: item.media.coverImage?.extraLarge || item.media.coverImage?.large || null,
        backdropUrl: item.media.bannerImage || null,
        genres: item.media.genres || ['Anime'],
        rating: item.media.averageScore ? (item.media.averageScore / 10) : null,
        overview: item.media.description?.replace(/<[^>]*>/g, '') || '',
        status: item.media.status,
      };
    });
  } catch (e) {
    console.error('[Calendar API] AniList fetch failed:', e);
    return [];
  }
}

interface RawTMDBItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string;
  release_date?: string;
  vote_average?: number;
  overview?: string;
  genre_ids?: number[];
  origin_country?: string[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categoryFilter = searchParams.get('category') || 'all';

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const endOfRange = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);

  const startSec = Math.floor(startOfDay.getTime() / 1000);
  const endSec = Math.floor(endOfRange.getTime() / 1000);

  const results: CalendarEntry[] = [];

  try {
    const promises: Promise<void>[] = [];

    // 1. ANIME SCHEDULE
    if (categoryFilter === 'all' || categoryFilter === 'anime') {
      promises.push(
        fetchAniListSchedule(startSec, endSec)
          .then(animeEntries => {
            results.push(...animeEntries);
          })
          .catch(() => {})
      );
    }

    // 2. K-DRAMA RELEASES (TMDB discover Korean shows)
    if (categoryFilter === 'all' || categoryFilter === 'kdrama') {
      promises.push(
        tmdbFetch<{ results: RawTMDBItem[] }>('/discover/tv', {
          params: {
            with_original_language: 'ko',
            sort_by: 'popularity.desc',
            page: 1,
          },
          revalidate: 1800,
        })
          .then(data => {
            const items = data.results || [];
            items.slice(0, 15).forEach((item, index) => {
              // Synthetic episode distribution over current week
              const targetDay = new Date(now.getTime() + (index % 7) * 86400000);
              const airDate = targetDay.toISOString().slice(0, 10);
              results.push({
                id: `kdrama-${item.id}`,
                tmdbId: item.id,
                category: 'kdrama',
                title: item.name || 'Untitled K-Drama',
                episodeNumber: (index % 16) + 1,
                airDate,
                airTime: '21:30',
                airTimestamp: targetDay.getTime(),
                posterUrl: item.poster_path
                  ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                  : null,
                backdropUrl: item.backdrop_path
                  ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
                  : null,
                genres: ['K-Drama', 'Drama'],
                rating: item.vote_average ?? null,
                overview: item.overview ?? '',
              });
            });
          })
          .catch(e => {
            console.error('[Calendar API] KDrama fetch error:', e);
          })
      );
    }

    // 3. GLOBAL TV SERIES (TMDB On The Air)
    if (categoryFilter === 'all' || categoryFilter === 'tv') {
      promises.push(
        getTVList('on_the_air', 1)
          .then(tvItems => {
            tvItems.slice(0, 15).forEach((item, index) => {
              const targetDay = new Date(now.getTime() + (index % 7) * 86400000);
              const airDate = targetDay.toISOString().slice(0, 10);
              results.push({
                id: `tv-${item.id}`,
                tmdbId: item.id,
                category: 'tv',
                title: item.title,
                episodeNumber: (index % 10) + 1,
                airDate,
                airTime: '20:00',
                airTimestamp: targetDay.getTime(),
                posterUrl: item.posterPath
                  ? `https://image.tmdb.org/t/p/w500${item.posterPath}`
                  : null,
                backdropUrl: item.backdropPath
                  ? `https://image.tmdb.org/t/p/w1280${item.backdropPath}`
                  : null,
                genres: ['TV Series'],
                rating: item.rating ?? null,
                overview: item.overview ?? '',
              });
            });
          })
          .catch(e => {
            console.error('[Calendar API] TV fetch error:', e);
          })
      );
    }

    // 4. UPCOMING MOVIES
    if (categoryFilter === 'all' || categoryFilter === 'movie' || categoryFilter === 'movies') {
      promises.push(
        getMovieList('upcoming', 1)
          .then(movies => {
            movies.slice(0, 12).forEach(item => {
              const airDate = item.releaseDate || new Date().toISOString().slice(0, 10);
              const airTimestamp = new Date(airDate).getTime();
              results.push({
                id: `movie-${item.id}`,
                tmdbId: item.id,
                category: 'movie',
                title: item.title,
                episodeNumber: null,
                airDate,
                airTime: 'Cinema Premiere',
                airTimestamp: isNaN(airTimestamp) ? Date.now() : airTimestamp,
                posterUrl: item.posterPath
                  ? `https://image.tmdb.org/t/p/w500${item.posterPath}`
                  : null,
                backdropUrl: item.backdropPath
                  ? `https://image.tmdb.org/t/p/w1280${item.backdropPath}`
                  : null,
                genres: ['Upcoming Movie'],
                rating: item.rating ?? null,
                overview: item.overview ?? '',
              });
            });
          })
          .catch(e => {
            console.error('[Calendar API] Movie fetch error:', e);
          })
      );
    }

    await Promise.all(promises);

    // Sort by airTimestamp asc
    results.sort((a, b) => a.airTimestamp - b.airTimestamp);

    return NextResponse.json({
      success: true,
      count: results.length,
      entries: results,
    });
  } catch (error) {
    console.error('[Calendar API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch release calendar' },
      { status: 500 }
    );
  }
}
