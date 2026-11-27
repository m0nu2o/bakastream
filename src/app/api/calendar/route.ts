import { NextRequest, NextResponse } from 'next/server';
import { tmdbFetch } from '@/lib/tmdb/server';

export const revalidate = 1800; // Cache for 30 minutes

export interface CalendarEntry {
  id: string;
  tmdbId?: number;
  category: 'anime' | 'kdrama' | 'cdrama' | 'tv' | 'movie';
  title: string;
  romajiTitle?: string;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  airDate: string; // YYYY-MM-DD
  airTime?: string;
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

interface RawTMDBListItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  overview?: string;
  genre_ids?: number[];
  original_language?: string;
}

interface RawTMDBTVDetail {
  id: number;
  name?: string;
  original_language?: string;
  status?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  overview?: string;
  genres?: Array<{ id: number; name: string }>;
  next_episode_to_air?: {
    id: number;
    name?: string;
    air_date?: string | null;
    episode_number?: number;
    season_number?: number;
  } | null;
  last_episode_to_air?: {
    id: number;
    name?: string;
    air_date?: string | null;
    episode_number?: number;
    season_number?: number;
  } | null;
}

function formatYMD(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function isWithinDateRange(dateStr: string | null | undefined, minDate: string, maxDate: string): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  return dateStr >= minDate && dateStr <= maxDate;
}

function dateStrToTimestamp(dateStr: string, defaultHourUtc = 14): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1, defaultHourUtc, 0, 0, 0);
}

/**
 * Fetch up to 5 pages (250 real airing episodes) from AniList.
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
    const timeoutId = setTimeout(() => controller.abort(), 4500);

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

    const seen = new Set<string>();
    const out: CalendarEntry[] = [];

    for (const item of schedules) {
      if (item.media.status && item.media.status !== 'RELEASING' && item.media.status !== 'NOT_YET_RELEASED') {
        continue;
      }
      const dedupeKey = `${item.media.id}-${item.episode}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const airDateObj = new Date(item.airingAt * 1000);
      const airDate = formatYMD(airDateObj);
      const airTime = airDateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      });
      const title =
        item.media.title.english || item.media.title.romaji || item.media.title.native || 'Unknown Anime';

      out.push({
        id: `anime-${item.id}`,
        category: 'anime',
        title,
        romajiTitle: item.media.title.romaji,
        episodeNumber: item.episode,
        airDate,
        airTime: `${airTime} UTC`,
        airTimestamp: item.airingAt * 1000,
        posterUrl: item.media.coverImage?.extraLarge || item.media.coverImage?.large || null,
        backdropUrl: item.media.bannerImage || null,
        genres: item.media.genres || ['Anime'],
        rating: item.media.averageScore ? item.media.averageScore / 10 : null,
        overview: item.media.description?.replace(/<[^>]*>/g, '') || '',
        status: item.media.status,
      });
    }

    return out;
  } catch (e) {
    console.error('[Calendar API] AniList fetch failed:', e);
    return [];
  }
}

/**
 * Resolve REAL episode airing dates and numbers via TMDB /tv/{id} details.
 * Never fabricates episode numbers or dates; drops ended/canceled or non-airing shows.
 */
async function enrichRealTVSchedules(
  candidateIds: number[],
  category: CalendarEntry['category'],
  fallbackGenres: string[],
  minAirDate: string,
  maxAirDate: string,
  defaultHourUtc: number,
  airLabel: string,
  maxLookup = 10
): Promise<CalendarEntry[]> {
  const uniqueIds = Array.from(new Set(candidateIds)).slice(0, maxLookup);
  if (uniqueIds.length === 0) return [];

  const detailsList = await Promise.allSettled(
    uniqueIds.map(id =>
      tmdbFetch<RawTMDBTVDetail>(`/tv/${id}`, {
        revalidate: 1800,
      })
    )
  );

  const entries: CalendarEntry[] = [];
  for (const res of detailsList) {
    if (res.status !== 'fulfilled' || !res.value) continue;
    const d = res.value;

    // Exclude ended or canceled shows
    const st = (d.status || '').toLowerCase();
    if (st === 'ended' || st === 'canceled' || st === 'cancelled') continue;

    // Pick actual episode airing within this week's window
    const nextEp = d.next_episode_to_air;
    const lastEp = d.last_episode_to_air;
    const ep =
      nextEp && isWithinDateRange(nextEp.air_date, minAirDate, maxAirDate)
        ? nextEp
        : lastEp && isWithinDateRange(lastEp.air_date, minAirDate, maxAirDate)
          ? lastEp
          : null;

    if (!ep?.air_date) continue;

    entries.push({
      id: `${category}-${d.id}-${ep.season_number ?? 1}-${ep.episode_number ?? 1}`,
      tmdbId: d.id,
      category,
      title: d.name || 'Untitled',
      seasonNumber: ep.season_number ?? null,
      episodeNumber: ep.episode_number ?? null,
      airDate: ep.air_date,
      airTime: airLabel,
      airTimestamp: dateStrToTimestamp(ep.air_date, defaultHourUtc),
      posterUrl: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null,
      backdropUrl: d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : null,
      genres: d.genres && d.genres.length > 0 ? d.genres.map(g => g.name) : fallbackGenres,
      rating: d.vote_average ?? null,
      overview: d.overview ?? '',
      status: d.status,
    });
  }

  return entries;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categoryFilter = searchParams.get('category') || 'all';

  const now = new Date();
  const startOfWindow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfWindow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 6, 23, 59, 59));

  const startSec = Math.floor(startOfWindow.getTime() / 1000) - 43200; // 12h grace for local timezone Today
  const endSec = Math.floor(endOfWindow.getTime() / 1000) + 43200;
  const minAirDate = formatYMD(new Date(startOfWindow.getTime() - 86400_000));
  const maxAirDate = formatYMD(endOfWindow);

  const results: CalendarEntry[] = [];

  try {
    const promises: Promise<void>[] = [];

    // 1. ANIME SCHEDULE (Real AniList airing schedules; TMDB active airing fallback only if empty)
    if (categoryFilter === 'all' || categoryFilter === 'anime') {
      promises.push(
        fetchAniListSchedule(startSec, endSec).then(async animeEntries => {
          if (animeEntries.length > 0) {
            results.push(...animeEntries);
          } else {
            const disc = await tmdbFetch<{ results: RawTMDBListItem[] }>('/discover/tv', {
              params: {
                with_genres: '16',
                with_original_language: 'ja',
                'air_date.gte': minAirDate,
                'air_date.lte': maxAirDate,
                with_status: '0',
                sort_by: 'popularity.desc',
                page: 1,
              },
              revalidate: 1800,
            }).catch(() => ({ results: [] }));
            const verified = await enrichRealTVSchedules(
              (disc.results || []).map(r => r.id),
              'anime',
              ['Anime'],
              minAirDate,
              maxAirDate,
              14,
              'Weekly Airing',
              8
            );
            results.push(...verified);
          }
        })
      );
    }

    // 2. K-DRAMA RELEASES (Only returning scripted Korean dramas actually airing this week)
    if (categoryFilter === 'all' || categoryFilter === 'kdrama') {
      promises.push(
        tmdbFetch<{ results: RawTMDBListItem[] }>('/discover/tv', {
          params: {
            with_original_language: 'ko',
            without_genres: '16,10764,10767,10763',
            'air_date.gte': minAirDate,
            'air_date.lte': maxAirDate,
            with_status: '0',
            sort_by: 'popularity.desc',
            page: 1,
          },
          revalidate: 1800,
        })
          .then(async p1 => {
            const ids = (p1.results || []).map(r => r.id);
            const verified = await enrichRealTVSchedules(
              ids,
              'kdrama',
              ['K-Drama', 'Drama'],
              minAirDate,
              maxAirDate,
              13,
              'KST Airing',
              8
            );
            results.push(...verified);
          })
          .catch(e => {
            console.error('[Calendar API] KDrama fetch error:', e);
          })
      );
    }

    // 3. C-DRAMA RELEASES (Only returning scripted Chinese dramas actually airing this week)
    if (categoryFilter === 'all' || categoryFilter === 'cdrama') {
      promises.push(
        tmdbFetch<{ results: RawTMDBListItem[] }>('/discover/tv', {
          params: {
            with_original_language: 'zh',
            without_genres: '16,10764,10767,10763',
            'air_date.gte': minAirDate,
            'air_date.lte': maxAirDate,
            with_status: '0',
            sort_by: 'popularity.desc',
            page: 1,
          },
          revalidate: 1800,
        })
          .then(async p1 => {
            const ids = (p1.results || []).map(r => r.id);
            const verified = await enrichRealTVSchedules(
              ids,
              'cdrama',
              ['C-Drama', 'Drama'],
              minAirDate,
              maxAirDate,
              12,
              'CST Airing',
              8
            );
            results.push(...verified);
          })
          .catch(e => {
            console.error('[Calendar API] CDrama fetch error:', e);
          })
      );
    }

    // 4. GLOBAL & HINDI TV SERIES (Scripted returning shows airing this week, verified via /tv/{id})
    if (categoryFilter === 'all' || categoryFilter === 'tv') {
      promises.push(
        Promise.all([
          tmdbFetch<{ results: RawTMDBListItem[] }>('/discover/tv', {
            params: {
              without_genres: '16,10764,10767,10763',
              'air_date.gte': minAirDate,
              'air_date.lte': maxAirDate,
              with_status: '0',
              sort_by: 'popularity.desc',
              page: 1,
            },
            revalidate: 1800,
          }).catch(() => ({ results: [] })),
          tmdbFetch<{ results: RawTMDBListItem[] }>('/discover/tv', {
            params: {
              with_original_language: 'hi',
              without_genres: '16,10764,10767,10763',
              'air_date.gte': minAirDate,
              'air_date.lte': maxAirDate,
              with_status: '0',
              sort_by: 'popularity.desc',
              page: 1,
            },
            revalidate: 1800,
          }).catch(() => ({ results: [] })),
        ])
          .then(async ([globalDisc, hindiDisc]) => {
            const candidateIds = [
              ...(globalDisc.results || [])
                .filter(r => r.original_language !== 'ko' && r.original_language !== 'zh')
                .map(r => r.id),
              ...(hindiDisc.results || []).map(r => r.id),
            ];
            const verified = await enrichRealTVSchedules(
              candidateIds,
              'tv',
              ['TV Series'],
              minAirDate,
              maxAirDate,
              19,
              'New Episode',
              12
            );
            results.push(...verified);
          })
          .catch(e => {
            console.error('[Calendar API] TV fetch error:', e);
          })
      );
    }

    // 5. MOVIE PREMIERES (Strictly movies releasing within this exact 7-day window)
    if (categoryFilter === 'all' || categoryFilter === 'movie' || categoryFilter === 'movies') {
      promises.push(
        Promise.all([
          tmdbFetch<{ results: RawTMDBListItem[] }>('/discover/movie', {
            params: {
              'primary_release_date.gte': minAirDate,
              'primary_release_date.lte': maxAirDate,
              sort_by: 'popularity.desc',
              page: 1,
            },
            revalidate: 1800,
          }).catch(() => ({ results: [] })),
          tmdbFetch<{ results: RawTMDBListItem[] }>('/discover/movie', {
            params: {
              with_original_language: 'hi',
              'primary_release_date.gte': minAirDate,
              'primary_release_date.lte': maxAirDate,
              sort_by: 'popularity.desc',
              page: 1,
            },
            revalidate: 1800,
          }).catch(() => ({ results: [] })),
        ])
          .then(([disc1, discHi]) => {
            const seen = new Set<number>();
            [...(disc1.results || []), ...(discHi.results || [])].forEach(m => {
              if (seen.has(m.id) || !isWithinDateRange(m.release_date, minAirDate, maxAirDate)) return;
              seen.add(m.id);
              const dateStr = m.release_date as string;
              results.push({
                id: `movie-${m.id}`,
                tmdbId: m.id,
                category: 'movie',
                title: m.title || m.name || 'Untitled',
                episodeNumber: null,
                airDate: dateStr,
                airTime: 'Premiere',
                airTimestamp: dateStrToTimestamp(dateStr, 18),
                posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
                backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
                genres: ['Movie Premiere'],
                rating: m.vote_average ?? null,
                overview: m.overview ?? '',
              });
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
