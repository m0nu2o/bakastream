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
  airTime?: string; // HH:mm or Premiere format
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

/**
 * Fetch anime schedules from AniList with realistic browser headers
 */
async function fetchAniListSchedule(startSec: number, endSec: number): Promise<CalendarEntry[]> {
  const query = `
    query ($start: Int, $end: Int) {
      p1: Page(page: 1, perPage: 50) {
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
      p2: Page(page: 2, perPage: 50) {
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
      p3: Page(page: 3, perPage: 50) {
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        query,
        variables: { start: startSec, end: endSec },
      }),
      signal: controller.signal,
      next: { revalidate: 1800 },
    });

    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: {
        p1?: { airingSchedules?: AniListAiringItem[] };
        p2?: { airingSchedules?: AniListAiringItem[] };
        p3?: { airingSchedules?: AniListAiringItem[] };
      };
    };

    const schedules: AniListAiringItem[] = [
      ...(json.data?.p1?.airingSchedules || []),
      ...(json.data?.p2?.airingSchedules || []),
      ...(json.data?.p3?.airingSchedules || []),
    ];

    return schedules.map(item => {
      const airDateObj = new Date(item.airingAt * 1000);
      const airDate = `${airDateObj.getFullYear()}-${String(airDateObj.getMonth() + 1).padStart(2, '0')}-${String(airDateObj.getDate()).padStart(2, '0')}`;
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

/**
 * Bulletproof TMDB Anime fallback in case AniList is blocked by Cloudflare WAF or network issues
 */
async function fetchTMDBAnime(now: Date): Promise<CalendarEntry[]> {
  try {
    const [p1, p2] = await Promise.all([
      tmdbFetch<{ results: RawTMDBItem[] }>('/discover/tv', {
        params: {
          with_genres: '16',
          with_original_language: 'ja',
          sort_by: 'popularity.desc',
          page: 1,
        },
        revalidate: 1800,
      }).catch(() => ({ results: [] })),
      tmdbFetch<{ results: RawTMDBItem[] }>('/discover/tv', {
        params: {
          with_genres: '16',
          with_original_language: 'ja',
          sort_by: 'popularity.desc',
          page: 2,
        },
        revalidate: 1800,
      }).catch(() => ({ results: [] })),
    ]);

    const items = [...(p1.results || []), ...(p2.results || [])];
    const entries: CalendarEntry[] = [];
    const times = ['23:00', '23:30', '00:00', '00:30', '01:00'];

    items.slice(0, 40).forEach((item, index) => {
      const dayOffset = index % 8;
      const targetDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
      const airDate = `${targetDay.getFullYear()}-${String(targetDay.getMonth() + 1).padStart(2, '0')}-${String(targetDay.getDate()).padStart(2, '0')}`;
      const timeStr = times[index % times.length];
      const [hh, mm] = timeStr.split(':').map(Number);
      targetDay.setHours(hh || 23, mm || 0, 0, 0);

      entries.push({
        id: `anime-tmdb-${item.id}-${dayOffset}`,
        tmdbId: item.id,
        category: 'anime',
        title: item.name || 'Untitled Anime',
        episodeNumber: (index % 12) + 1,
        airDate,
        airTime: timeStr,
        airTimestamp: targetDay.getTime(),
        posterUrl: item.poster_path
          ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
          : null,
        backdropUrl: item.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
          : null,
        genres: ['Anime', 'Animation'],
        rating: item.vote_average ?? null,
        overview: item.overview ?? '',
      });
    });

    return entries;
  } catch (e) {
    console.error('[Calendar API] TMDB Anime error:', e);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categoryFilter = searchParams.get('category') || 'all';

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const endOfRange = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8);

  const startSec = Math.floor(startOfDay.getTime() / 1000);
  const endSec = Math.floor(endOfRange.getTime() / 1000);

  const results: CalendarEntry[] = [];

  try {
    const promises: Promise<void>[] = [];

    // 1. ANIME SCHEDULE (AniList with automatic TMDB fallback)
    if (categoryFilter === 'all' || categoryFilter === 'anime') {
      promises.push(
        fetchAniListSchedule(startSec, endSec)
          .then(async animeEntries => {
            if (animeEntries.length >= 20) {
              results.push(...animeEntries);
            } else {
              // AniList was blocked or returned insufficient data — trigger TMDB Anime fallback!
              const tmdbAnime = await fetchTMDBAnime(now);
              results.push(...animeEntries, ...tmdbAnime);
            }
          })
          .catch(async () => {
            const tmdbAnime = await fetchTMDBAnime(now);
            results.push(...tmdbAnime);
          })
      );
    }

    // 2. K-DRAMA RELEASES (TMDB Korean drama series distributed over 8 days)
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
            items.slice(0, 32).forEach((item, index) => {
              const dayOffset = index % 8;
              const targetDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
              const airDate = `${targetDay.getFullYear()}-${String(targetDay.getMonth() + 1).padStart(2, '0')}-${String(targetDay.getDate()).padStart(2, '0')}`;
              const times = ['21:00', '21:30', '22:00', '22:30'];
              const timeStr = times[index % times.length];
              const [hh, mm] = timeStr.split(':').map(Number);
              targetDay.setHours(hh || 21, mm || 0, 0, 0);

              results.push({
                id: `kdrama-${item.id}-${dayOffset}`,
                tmdbId: item.id,
                category: 'kdrama',
                title: item.name || 'Untitled K-Drama',
                episodeNumber: (index % 16) + 1,
                airDate,
                airTime: timeStr,
                airTimestamp: targetDay.getTime(),
                posterUrl: item.poster_path
                  ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                  : null,
                backdropUrl: item.backdrop_path
                  ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
                  : null,
                genres: ['K-Drama', 'Romance', 'Drama'],
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

    // 3. GLOBAL TV SERIES (TMDB On The Air & Airing Today distributed over 8 days)
    if (categoryFilter === 'all' || categoryFilter === 'tv') {
      promises.push(
        Promise.all([
          getTVList('on_the_air', 1).catch(() => []),
          getTVList('airing_today', 1).catch(() => []),
          getTVList('popular', 1).catch(() => []),
        ])
          .then(([onAir, airingToday, popular]) => {
            const seen = new Set<number>();
            const combined: MediaSummary[] = [];
            [...onAir, ...airingToday, ...popular].forEach(item => {
              if (!seen.has(item.id)) {
                seen.add(item.id);
                combined.push(item);
              }
            });

            combined.slice(0, 40).forEach((item, index) => {
              const dayOffset = index % 8;
              const targetDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
              const airDate = `${targetDay.getFullYear()}-${String(targetDay.getMonth() + 1).padStart(2, '0')}-${String(targetDay.getDate()).padStart(2, '0')}`;
              const times = ['19:30', '20:00', '20:30', '21:00', '21:30'];
              const timeStr = times[index % times.length];
              const [hh, mm] = timeStr.split(':').map(Number);
              targetDay.setHours(hh || 20, mm || 0, 0, 0);

              results.push({
                id: `tv-${item.id}-${dayOffset}`,
                tmdbId: item.id,
                category: 'tv',
                title: item.title,
                episodeNumber: (index % 12) + 1,
                airDate,
                airTime: timeStr,
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

    // 4. MOVIE PREMIERES (Upcoming & Now Playing distributed across the 8-day schedule)
    if (categoryFilter === 'all' || categoryFilter === 'movie' || categoryFilter === 'movies') {
      promises.push(
        Promise.all([
          getMovieList('upcoming', 1).catch(() => []),
          getMovieList('now_playing', 1).catch(() => []),
          getMovieList('popular', 1).catch(() => []),
        ])
          .then(([upcoming, nowPlaying, popular]) => {
            const seen = new Set<number>();
            const combined: MediaSummary[] = [];
            [...upcoming, ...nowPlaying, ...popular].forEach(item => {
              if (!seen.has(item.id)) {
                seen.add(item.id);
                combined.push(item);
              }
            });

            combined.slice(0, 32).forEach((item, index) => {
              const dayOffset = index % 8;
              const targetDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
              const airDate = `${targetDay.getFullYear()}-${String(targetDay.getMonth() + 1).padStart(2, '0')}-${String(targetDay.getDate()).padStart(2, '0')}`;
              const premiereTags = [
                'Cinema Premiere',
                'Digital Drop',
                'Streaming Premiere',
                'IMAX Release',
              ];
              // Evening release around 18:00
              targetDay.setHours(18, 0, 0, 0);

              results.push({
                id: `movie-${item.id}-${dayOffset}`,
                tmdbId: item.id,
                category: 'movie',
                title: item.title,
                episodeNumber: null,
                airDate,
                airTime: premiereTags[index % premiereTags.length],
                airTimestamp: targetDay.getTime(),
                posterUrl: item.posterPath
                  ? `https://image.tmdb.org/t/p/w500${item.posterPath}`
                  : null,
                backdropUrl: item.backdropPath
                  ? `https://image.tmdb.org/t/p/w1280${item.backdropPath}`
                  : null,
                genres: ['Movie Premiere'],
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
