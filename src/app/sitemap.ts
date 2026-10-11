import type { MetadataRoute } from 'next';
import { getMovieList, getTVList, getAnime, getTrending } from '@/lib/tmdb/server';
import { movieUrl, tvUrl } from '@/utils/slug';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bakastream.vercel.app';

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/movies',
    '/tv',
    '/anime',
    '/search',
    '/watchlist',
    '/about',
  ].map(path => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: path === '' ? 1 : 0.7,
  }));

  try {
    const [movies, tv, anime, trending] = await Promise.allSettled([
      getMovieList('popular'),
      getTVList('popular'),
      getAnime(),
      getTrending('all'),
    ]);

    const ok = (r: PromiseSettledResult<Awaited<ReturnType<typeof getMovieList>>>) =>
      r.status === 'fulfilled' ? r.value : [];

    const urls = new Set<string>();
    for (const item of [...ok(movies), ...ok(tv), ...ok(anime), ...ok(trending)]) {
      urls.add(item.type === 'movie' ? movieUrl(item.id, item.title) : tvUrl(item.id, item.title));
    }

    return [
      ...staticRoutes,
      ...Array.from(urls).map(path => ({
        url: `${SITE_URL}${path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
