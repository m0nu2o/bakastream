/**
 * Search suggestions for the navbar's live dropdown. Returns a handful of
 * mapped summaries — enough for name/poster/year/rating rows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { search } from '@/lib/tmdb/server';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const { results } = await search({ query: q, type: 'all' });
    return NextResponse.json(
      { results: results.slice(0, 6) },
      { headers: { 'cache-control': 'public, s-maxage=120, stale-while-revalidate=600' } }
    );
  } catch {
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}
