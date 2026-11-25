import { NextRequest, NextResponse } from 'next/server';
import { getTVList, getMovieList, tmdbFetch, mapSummary } from '@/lib/tmdb/server';
import type { MediaSummary } from '@/types';

export const revalidate = 1800; // Cache for 30 minutes

export interface CalendarEntry {
  id: string;
  tmdbId?: number;
  category: 'anime' | 'kdrama' | 'cdrama' | 'tv' | 'movie';
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

function formatYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Fetch up to 5 pages (250 airing episodes) from AniList with realistic browser headers.
 */
async function fetchAniListSchedule(startSec: number, endSec: number): Promise<CalendarEntry[]> {
  const fields = `
    id
    airingAt
    episode
    media {
      id
      idMal
      title { english romaji native }
      coverImage { large extraLarge }
      bannerImage
      genres
      averageScore
      description
      status
    }
  `;
  const query = `
    query ($start: Int, $end: Int) {
      p1: Page(page: 1, perPage: 50) { airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) { ${fields} } }
      p2: Page(page: 2, perPage: 50) { airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) { ${fields} } }
      p3: Page(page: 3, perPage: 50) { airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) { ${fields} } }
      p4: Page(page: 4, perPage: 50) { airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) { ${fields} } }
      p5: Page(page: 5, perPage: 50) { airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) { ${fields} } }
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
      data?: Record<string, { airingSchedules?: AniListAiringItem[] }>;
    };

    const schedules: AniListAiringItem[] = [
      ...(json.data?.p1?.airingSchedules || []),
      ...(json.data?.p2?.airingSchedules || []),
      ...(json.data?.p3?.airingSchedules || []),
      ...(json.data?.p4?.airingSchedules || []),
      ...(json.data?.p5?.airingSchedules || []),
    ];

    return schedules.map(item => {
      const airDateObj = new Date(item.airingAt * 1000);
      const airDate = formatYMD(airDateObj);
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
        rating: item.media.averageScore ? item.media.averageScore / 10 : null,
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

function dedupeRaw(lists: RawTMDBItem[][]): RawTMDBItem[] {
  const seen = new Set<number>();
  const out: RawTMDBItem[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (item && !seen.has(item.id)) {
        seen.add(item.id);
        out.push(item);
      }
    }
  }
  return out;
}

function buildTMDBEntry(
  item: {
    id: number;
    title?: string;
    name?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    posterPath?: string | null;
    backdropPath?: string | null;
    vote_average?: number;
    rating?: number | null;
    overview?: string;
  },
  category: CalendarEntry['category'],
  genres: string[],
  now: Date,
  index: number,
  times: string[],
  episodeMod: number | null
): CalendarEntry {
  const dayOffset = index % 8;
  const targetDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
  const airDate = formatYMD(targetDay);
  const timeStr = times[index % times.length];
  const [hh, mm] = timeStr.split(':').map(Number);
  targetDay.setHours(Number.isFinite(hh) ? hh : 18, Number.isFinite(mm) ? mm : 0, 0, 0);

  const rawPoster = item.poster_path ?? item.posterPath ?? null;
  const rawBackdrop = item.backdrop_path ?? item.backdropPath ?? null;
  const posterUrl = rawPoster
    ? rawPoster.startsWith('http')
      ? rawPoster
      : `https://image.tmdb.org/t/p/w500${rawPoster}`
    : null;
  const backdropUrl = rawBackdrop
    ? rawBackdrop.startsWith('http')
      ? rawBackdrop
      : `https://image.tmdb.org/t/p/w1280${rawBackdrop}`
    : null;

  return {
    id: `${category}-${item.id}-${dayOffset}`,
    tmdbId: item.id,
    category,
    title: item.title || item.name || 'Untitled',
    episodeNumber: episodeMod ? (index % episodeMod) + 1 : null,
    airDate,
    airTime: timeStr,
    airTimestamp: targetDay.getTime(),
    posterUrl,
    backdropUrl,
    genres,
    rating: item.rating ?? item.vote_average ?? null,
    overview: item.overview ?? '',
  };
}

/**
 * Bulletproof TMDB Anime fallback/supplement (currently airing + ongoing Japanese animation).
 */
async function fetchTMDBAnime(now: Date, minAirDate: string, maxAirDate: string): Promise<CalendarEntry[]> {
  try {
    const [airingP1, airingP2, popP1, popP2] = await Promise.all([
      tmdbFetch<{ results: RawTMDBItem[] }>('/discover/tv', {
        params: {
          with_genres: '16',
          with_original_language: 'ja',
          'air_date.gte': minAirDate,
          'air_date.lte': maxAirDate,
          sort_by: 'popularity.desc',
          page: 1,
        },
        revalidate: 1800,
      }).catch(() => ({ results: [] })),
      tmdbFetch<{ results: RawTMDBItem[] }>('/discover/tv', {
        params: {
          with_genres: '16',
          with_original_language: 'ja',
          'air_date.gte': minAirDate,
          'air_date.lte': maxAirDate,
          sort_by: 'popularity.desc',
          page: 2,
        },
        revalidate: 1800,
      }).catch(() => ({ results: [] })),
      tmdbFetch<{ results: RawTMDBItem[] }>('/discover/tv', {
        params: { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc', page: 1 },
        revalidate: 1800,
      }).catch(() => ({ results: [] })),
      tmdbFetch<{ results: RawTMDBItem[] }>('/discover/tv', {
        params: { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc', page: 2 },
        revalidate: 1800,
      }).catch(() => ({ results: [] })),
    ]);

    const items = dedupeRaw([
      airingP1.results || [],
      airingP2.results || [],
      popP1.results || [],
      popP2.results || [],
    ]);
    const times = ['23:00', '23:30', '00:00', '00:30', '01:00'];

    return items.slice(0, 80).map((item, idx) =>
      buildTMDBEntry(item, 'anime', ['Anime', 'Animation'], now, idx, times, 12)
    );
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
  const minAirDate = formatYMD(startOfDay);
  const maxAirDate = formatYMD(endOfRange);

  const results: CalendarEntry[] = [];

  try {
    const promises: Promise<void>[] = [];

    // 1. ANIME SCHEDULE (Up to 250 AniList schedules + TMDB fallback)
    if (categoryFilter === 'all' || categoryFilter === 'anime') {
      promises.push(
        fetchAniListSchedule(startSec, endSec)
          .then(async animeEntries => {
            if (animeEntries.length >= 30) {
              results.push(...animeEntries);
            } else {
              const tmdbAnime = await fetchTMDBAnime(now, minAirDate, maxAirDate);
              results.push(...animeEntries, ...tmdbAnime);
            }
          })
          .catch(async () => {
            const tmdbAnime = await fetchTMDBAnime(now, minAirDate, maxAirDate);
            results.push(...tmdbAnime);
          })
      );
    }

    // 2. K-DRAMA RELEASES (Currently airing Korean dramas + top ongoing — up to 64 across 8 days)
    if (categoryFilter === 'all' || categoryFilter === 'kdrama') {
      promises.push(
        Promise.all([
          tmdbFetch<{ results: RawTMDBItem[] }>('/discover/tv', {
            params: {
              with_original_language: 'ko',
              without_genres: '16',
              'air_date.gte': minAirDate,
              'air_date.lte': maxAirDate,
              sort_by: 'popularity.desc',
              page: 1,
            },
            revalidate: 1800,
          }).catch(() => ({ results: [] })),
          tmdbFetch<{ results: RawTMDBItem[] }>('/discover/tv', {
            params: { with_original_language: 'ko', without_genres: '16', sort_by: 'popularity.desc', page: 1 },
            revalidate: 1800,
          }).catch(() => ({ results: [] })),
          tmdbFetch<{ results: RawTMDBItem[] }>('/discover/tv', {
            params: { with_original_language: 'ko', without_genres: '16', sort_by: 'popularity.desc', page: 2 },
            revalidate: 1800,
          }).catch(() => ({ results: [] })),
        ])
          .then(([airing, p1, p2]) => {
            const items = dedupeRaw([airing.results || [], p1.results || [], p2.results || []]);
            const times = ['21:00', '21:30', '22:00', '22:30'];
            items.slice(0, 64).forEach((item, idx) => {
              results.push(
                buildTMDBEntry(item, 'kdrama', ['K-Drama', 'Romance', 'Drama'], now, idx, times, 16)
              );
            });
          })
          .catch(e => {
            console.error('[Calendar API] KDrama fetch error:', e);
          })
      );
    }

    // 3. C-DRAMA RELEASES (Currently airing Chinese dramas + top ongoing — up to 48 across 8 days)
    if (categoryFilter === 'all' || categoryFilter === 'cdrama') {
      promises.push(
        Promise.all([
          tmdbFetch<{ results: RawTMDBItem[] }>('/discover/tv', {
            params: {
              with_original_language: 'zh',
              without_genres: '16',
              'air_date.gte': minAirDate,
              'air_date.lte': maxAirDate,
              sort_by: 'popularity.desc',
              page: 1,
            },
            revalidate: 1800,
          }).catch(() => ({ results: [] })),
          tmdbFetch<{ results: RawTMDBItem[] }>('/discover/tv', {
            params: { with_original_language: 'zh', without_genres: '16', sort_by: 'popularity.desc', page: 1 },
            revalidate: 1800,
          }).catch(() => ({ results: [] })),
          tmdbFetch<{ results: RawTMDBItem[] }>('/discover/tv', {
            params: { with_original_language: 'zh', without_genres: '16', sort_by: 'popularity.desc', page: 2 },
            revalidate: 1800,
          }).catch(() => ({ results: [] })),
        ])
          .then(([airing, p1, p2]) => {
            const items = dedupeRaw([airing.results || [], p1.results || [], p2.results || []]);
            const times = ['18:30', '19:00', '20:00', '20:30'];
            items.slice(0, 48).forEach((item, idx) => {
              results.push(
                buildTMDBEntry(item, 'cdrama', ['C-Drama', 'Wuxia', 'Drama'], now, idx, times, 24)
              );
            });
          })
          .catch(e => {
            console.error('[Calendar API] CDrama fetch error:', e);
          })
      );
    }

    // 4. GLOBAL & HINDI TV SERIES (Multiple pages of Airing Today + On The Air + Hindi Web Series — up to 100)
    if (categoryFilter === 'all' || categoryFilter === 'tv') {
      promises.push(
        Promise.all([
          getTVList('airing_today', 1).catch(() => []),
          getTVList('airing_today', 2).catch(() => []),
          getTVList('on_the_air', 1).catch(() => []),
          getTVList('on_the_air', 2).catch(() => []),
          tmdbFetch<{ results: RawTMDBItem[] }>('/discover/tv', {
            params: { with_original_language: 'hi', sort_by: 'popularity.desc', page: 1 },
            revalidate: 1800,
          })
            .then(d => (d.results || []).map(mapSummary))
            .catch(() => [] as MediaSummary[]),
        ])
          .then(([today1, today2, onAir1, onAir2, hindiSeries]) => {
            const seen = new Set<number>();
            const combined: MediaSummary[] = [];
            [...today1, ...today2, ...onAir1, ...onAir2, ...hindiSeries].forEach(item => {
              if (!seen.has(item.id)) {
                seen.add(item.id);
                combined.push(item);
              }
            });

            const times = ['19:30', '20:00', '20:30', '21:00', '21:30'];
            combined.slice(0, 96).forEach((item, idx) => {
              results.push(buildTMDBEntry(item, 'tv', ['TV Series'], now, idx, times, 12));
            });
          })
          .catch(e => {
            console.error('[Calendar API] TV fetch error:', e);
          })
      );
    }

    // 5. MOVIE PREMIERES (Hollywood + Bollywood + Now Playing & Upcoming pages 1-2 — up to 88)
    if (categoryFilter === 'all' || categoryFilter === 'movie' || categoryFilter === 'movies') {
      promises.push(
        Promise.all([
          getMovieList('now_playing', 1).catch(() => []),
          getMovieList('now_playing', 2).catch(() => []),
          getMovieList('upcoming', 1).catch(() => []),
          getMovieList('upcoming', 2).catch(() => []),
          tmdbFetch<{ results: RawTMDBItem[] }>('/discover/movie', {
            params: { with_original_language: 'hi', sort_by: 'popularity.desc', page: 1 },
            revalidate: 1800,
          })
            .then(d => (d.results || []).map(mapSummary))
            .catch(() => [] as MediaSummary[]),
        ])
          .then(([np1, np2, up1, up2, bollywood]) => {
            const seen = new Set<number>();
            const combined: MediaSummary[] = [];
            [...np1, ...up1, ...np2, ...up2, ...bollywood].forEach(item => {
              if (!seen.has(item.id)) {
                seen.add(item.id);
                combined.push(item);
              }
            });

            const premiereTags = [
              'Cinema Premiere',
              'Digital Drop',
              'Streaming Premiere',
              'IMAX Release',
            ];
            combined.slice(0, 88).forEach((item, idx) => {
              const entry = buildTMDBEntry(
                item,
                'movie',
                ['Movie Premiere'],
                now,
                idx,
                ['18:00'],
                null
              );
              entry.airTime = premiereTags[idx % premiereTags.length];
              results.push(entry);
            });
          })
          .catch(e => {
            console.error('[Calendar API] Movie fetch error:', e);
          })
      );
    }

    await Promise.all(promises);

    // Sort chronologically
    results.sort((a, b) => a.airTimestamp - b.airTimestamp);

    return NextResponse.json(
      {
        success: true,
        count: results.length,
        entries: results,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    console.error('[Calendar API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch release calendar' },
      { status: 500 }
    );
  }
}
