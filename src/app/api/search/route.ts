/**
 * Search + browse API for the browser: proxy to the server-side search layer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { search } from '@/lib/tmdb/server';
import type { MediaType } from '@/types';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const query = sp.get('query') || sp.get('q') || '';
  const typeRaw = sp.get('type');
  const type = typeRaw === 'movie' || typeRaw === 'tv' ? (typeRaw as MediaType) : 'all';
  const genre = sp.get('genre') ? Number(sp.get('genre')) : undefined;
  const year = sp.get('year') ? Number(sp.get('year')) : undefined;
  const page = Math.max(1, Number(sp.get('page')) || 1);

  try {
    const data = await search({ query, type, genre, year, page });
    return NextResponse.json(data, {
      headers: { 'cache-control': 'public, s-maxage=120, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 502 });
  }
}
