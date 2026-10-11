/**
 * Generic read-only TMDB proxy.
 *
 * The browser never talks to TMDB directly — it calls this route, which
 * applies the server-held credentials. Only the read endpoints the UI needs
 * are allow-listed, so the route cannot be used as an open relay.
 */

import { NextRequest, NextResponse } from 'next/server';
import { tmdbFetch, TMDBError } from '@/lib/tmdb/server';

interface AllowEntry {
  pattern: RegExp;
  revalidate: number;
}

// path here is `/movie/123`, `/tv/456/season/1`, `/search/multi`, …
const ALLOWED: AllowEntry[] = [
  { pattern: /^\/movie\/\d+$/, revalidate: 3600 },
  { pattern: /^\/tv\/\d+$/, revalidate: 3600 },
  { pattern: /^\/tv\/\d+\/season\/\d+$/, revalidate: 1800 },
  {
    pattern: /^\/(movie|tv)\/\d+\/(credits|videos|similar|recommendations|external_ids)$/,
    revalidate: 3600,
  },
  { pattern: /^\/search\/(multi|movie|tv)$/, revalidate: 300 },
  { pattern: /^\/genre\/(movie|tv)\/list$/, revalidate: 86400 },
  { pattern: /^\/trending\/(all|movie|tv)\/(day|week)$/, revalidate: 1800 },
  {
    pattern: /^\/(movie|tv)\/(popular|top_rated|now_playing|upcoming|on_the_air|airing_today)$/,
    revalidate: 1800,
  },
  { pattern: /^\/discover\/(movie|tv)$/, revalidate: 1800 },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const tmdbPath = `/${path.join('/')}`;
  const entry = ALLOWED.find(a => a.pattern.test(tmdbPath));

  if (!entry) {
    return NextResponse.json({ error: 'Endpoint not allowed' }, { status: 403 });
  }

  const search = request.nextUrl.searchParams;
  const query: Record<string, string> = {};
  for (const [k, v] of search.entries()) {
    if (k !== 'api_key' && k !== 'access_token') query[k] = v;
  }

  try {
    const data = await tmdbFetch(tmdbPath, {
      params: query,
      revalidate: entry.revalidate,
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof TMDBError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'TMDB request failed' }, { status: 502 });
  }
}
